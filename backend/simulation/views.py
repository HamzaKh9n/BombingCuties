from django.core.management import call_command
from django.db.models import Q, Count
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import (
    Village, Neighborhood, Building, MedicalFacility, Resident,
    VitalObservation, RoadNode, RoadEdge, Hazard, Vehicle, Responder,
    Incident, IncidentResidentOutcome, EvacuationAssignment, AuditEvent
)
from .serializers import (
    NeighborhoodSerializer, BuildingSerializer, MedicalFacilitySerializer,
    ResidentListSerializer, ResidentDetailSerializer, VitalObservationSerializer,
    RoadNodeSerializer, RoadEdgeSerializer, HazardSerializer,
    VehicleSerializer, ResponderSerializer, IncidentSerializer,
    EvacuationAssignmentSerializer, AuditEventSerializer
)
from .services.routing import GraphRouter
from .services.simulation_engine import preview_simulated_incident, apply_simulated_incident


def get_default_village():
    village = Village.objects.first()
    if not village:
        call_command("seed_village")
        village = Village.objects.first()
    return village


@api_view(["GET"])
def village_summary(request):
    village = get_default_village()

    total_residents = Resident.objects.filter(village=village).count()

    # Reconciled counts based on active triage and fatality
    residents = Resident.objects.filter(village=village)
    stable_count = 0
    requiring_care_count = 0
    critical_count = 0
    fatalities_count = 0

    for r in residents:
        if r.is_fatality or r.active_triage == "EXPECTANT":
            fatalities_count += 1
        elif r.active_triage == "STABLE":
            stable_count += 1
        else:
            requiring_care_count += 1
            if r.active_triage == "IMMEDIATE":
                critical_count += 1

    facilities = MedicalFacility.objects.filter(village=village)
    total_beds = sum(f.total_capacity for f in facilities)
    occupied_beds = sum(f.current_occupancy for f in facilities)
    available_beds = sum(f.available_capacity for f in facilities)

    open_blockages = RoadEdge.objects.filter(village=village, is_blocked=True).count()
    restricted_roads = RoadEdge.objects.filter(village=village, is_restricted=True).count()
    active_evacuations = EvacuationAssignment.objects.filter(
        village=village, status__in=["RECOMMENDED", "ASSIGNED", "IN_TRANSIT"]
    ).count()

    recent_incidents = Incident.objects.filter(village=village).order_by("-confirmed_at")[:5]

    # Quick list of residents requiring medical attention (for Overview section)
    requiring_care_residents = Resident.objects.filter(
        village=village, is_fatality=False
    ).exclude(triage_category="STABLE").order_by("id")[:10]

    return Response({
        "village": {
            "id": village.id,
            "name": village.name,
            "code": village.code,
            "status": village.status,
            "description": village.description,
            "baseline_population": village.baseline_population,
        },
        "metrics": {
            "total_residents": total_residents,
            "residents_stable": stable_count,
            "residents_requiring_care": requiring_care_count,
            "critical_residents": critical_count,
            "fatalities": fatalities_count,
            "medical_facilities_count": facilities.count(),
            "total_beds": total_beds,
            "occupied_beds": occupied_beds,
            "available_beds": available_beds,
            "open_road_blockages": open_blockages,
            "restricted_roads": restricted_roads,
            "active_evacuation_assignments": active_evacuations,
            "total_incidents": Incident.objects.filter(village=village).count(),
        },
        "care_required_residents": ResidentListSerializer(requiring_care_residents, many=True).data,
        "facilities": MedicalFacilitySerializer(facilities, many=True).data,
        "recent_incidents": IncidentSerializer(recent_incidents, many=True).data,
    })


@api_view(["GET"])
def village_map_data(request):
    village = get_default_village()

    neighborhoods = Neighborhood.objects.filter(village=village)
    buildings = Building.objects.filter(village=village)
    facilities = MedicalFacility.objects.filter(village=village)
    residents = Resident.objects.filter(village=village)
    road_nodes = RoadNode.objects.filter(village=village)
    road_edges = RoadEdge.objects.filter(village=village)
    hazards = Hazard.objects.filter(village=village, is_active=True)

    # Active evacuation assignment routes for visual overlay
    active_assignments = EvacuationAssignment.objects.filter(
        village=village, status__in=["RECOMMENDED", "ASSIGNED", "IN_TRANSIT"]
    ).select_related("resident", "facility")

    active_routes = []
    for assign in active_assignments:
        coords = assign.route_snapshot.get("coordinates", [])
        if coords:
            active_routes.append({
                "assignment_id": assign.id,
                "resident_id": assign.resident_id,
                "resident_name": assign.resident.full_name,
                "facility_id": assign.facility_id,
                "facility_name": assign.facility.name,
                "status": assign.status,
                "priority_tier": assign.priority_tier,
                "coordinates": coords,
            })

    return Response({
        "village": {
            "id": village.id,
            "name": village.name,
            "bounds": {"width": village.bounds_width, "height": village.bounds_height},
            "status": village.status,
        },
        "neighborhoods": NeighborhoodSerializer(neighborhoods, many=True).data,
        "buildings": BuildingSerializer(buildings, many=True).data,
        "facilities": MedicalFacilitySerializer(facilities, many=True).data,
        "residents": ResidentListSerializer(residents, many=True).data,
        "road_nodes": RoadNodeSerializer(road_nodes, many=True).data,
        "road_edges": RoadEdgeSerializer(road_edges, many=True).data,
        "hazards": HazardSerializer(hazards, many=True).data,
        "active_routes": active_routes,
    })


@api_view(["GET"])
def resident_list(request):
    village = get_default_village()
    qs = Resident.objects.filter(village=village)

    triage_filter = request.GET.get("triage")
    if triage_filter:
        if triage_filter == "CARE_REQUIRED":
            qs = qs.exclude(triage_category="STABLE").filter(is_fatality=False)
        else:
            qs = qs.filter(Q(triage_category=triage_filter) | Q(manual_priority_override=triage_filter))

    search = request.GET.get("search")
    if search:
        qs = qs.filter(
            Q(first_name__icontains=search) |
            Q(last_name__icontains=search) |
            Q(code__icontains=search) |
            Q(medical_condition__icontains=search)
        )

    sort = request.GET.get("sort", "id")
    qs = qs.order_by(sort)

    return Response(ResidentListSerializer(qs, many=True).data)


@api_view(["GET"])
def resident_detail(request, pk):
    village = get_default_village()
    try:
        resident = Resident.objects.get(village=village, id=pk)
    except Resident.DoesNotExist:
        return Response({"error": "Resident not found"}, status=status.HTTP_404_NOT_FOUND)

    data = ResidentDetailSerializer(resident).data

    # Add routing recommendation
    router = GraphRouter(village_id=village.id)
    plan = router.plan_evacuation(resident)
    data["evacuation_plan"] = plan

    # Add active evacuation assignment if any
    active_assignment = EvacuationAssignment.objects.filter(
        village=village, resident=resident
    ).order_by("-created_at").first()
    if active_assignment:
        data["active_assignment"] = EvacuationAssignmentSerializer(active_assignment).data
    else:
        data["active_assignment"] = None

    return Response(data)


@api_view(["POST"])
def resident_override_triage(request, pk):
    village = get_default_village()
    try:
        resident = Resident.objects.get(village=village, id=pk)
    except Resident.DoesNotExist:
        return Response({"error": "Resident not found"}, status=status.HTTP_404_NOT_FOUND)

    new_triage = request.data.get("triage_category")
    reason = request.data.get("reason", "Field clinical assessment override")
    actor = request.data.get("actor", "Field Triage Officer")

    valid_triages = ["STABLE", "MINIMAL", "DELAYED", "IMMEDIATE", "EXPECTANT"]
    if new_triage not in valid_triages:
        return Response(
            {"error": f"Invalid triage category. Must be one of {valid_triages}"},
            status=status.HTTP_400_BAD_REQUEST
        )

    old_triage = resident.active_triage
    resident.manual_priority_override = new_triage
    resident.manual_override_reason = reason
    resident.manual_override_by = actor

    if new_triage == "EXPECTANT":
        resident.is_fatality = True
        resident.evacuation_status = "CANCELLED"
    elif new_triage == "STABLE":
        resident.is_fatality = False
        resident.evacuation_status = "SHELTERED"
    else:
        resident.is_fatality = False
        if resident.evacuation_status in ["SHELTERED", "CANCELLED"]:
            resident.evacuation_status = "RECOMMENDED"

    resident.save()

    # Record vital telemetry note
    latest_vital = resident.vital_observations.first()
    if latest_vital:
        VitalObservation.objects.create(
            resident=resident,
            heart_rate=latest_vital.heart_rate,
            spo2=latest_vital.spo2,
            blood_pressure=latest_vital.blood_pressure,
            systolic=latest_vital.systolic,
            diastolic=latest_vital.diastolic,
            respiratory_rate=latest_vital.respiratory_rate,
            consciousness=latest_vital.consciousness,
            source_label="Manual Triage Override by Responder",
            notes=f"Overridden from {old_triage} to {new_triage}. Reason: {reason}",
            recorded_at=timezone.now(),
        )

    AuditEvent.objects.create(
        village=village,
        event_type="TRIAGE_OVERRIDE",
        actor=actor,
        summary=f"Triage priority for {resident.full_name} ({resident.code}) overridden from {old_triage} to {new_triage}.",
        payload={
            "resident_id": resident.id,
            "resident_code": resident.code,
            "old_triage": old_triage,
            "new_triage": new_triage,
            "reason": reason,
        },
    )

    return Response(ResidentDetailSerializer(resident).data)


@api_view(["GET"])
def facility_list(request):
    village = get_default_village()
    facilities = MedicalFacility.objects.filter(village=village)
    return Response(MedicalFacilitySerializer(facilities, many=True).data)


@api_view(["GET"])
def facility_detail(request, pk):
    village = get_default_village()
    try:
        facility = MedicalFacility.objects.get(village=village, id=pk)
    except MedicalFacility.DoesNotExist:
        return Response({"error": "Facility not found"}, status=status.HTTP_404_NOT_FOUND)

    assigned_residents = Resident.objects.filter(assigned_facility=facility, is_fatality=False)
    data = MedicalFacilitySerializer(facility).data
    data["assigned_patients"] = ResidentListSerializer(assigned_residents, many=True).data
    return Response(data)


@api_view(["GET"])
def road_list(request):
    village = get_default_village()
    roads = RoadEdge.objects.filter(village=village)
    return Response(RoadEdgeSerializer(roads, many=True).data)


@api_view(["POST"])
def toggle_road_blockage(request, pk):
    village = get_default_village()
    try:
        road = RoadEdge.objects.get(village=village, id=pk)
    except RoadEdge.DoesNotExist:
        return Response({"error": "Road segment not found"}, status=status.HTTP_404_NOT_FOUND)

    reason = request.data.get("reason", "Manual road condition report")
    actor = request.data.get("actor", "Logistics Coordinator")
    force_blocked = request.data.get("is_blocked")

    if force_blocked is not None:
        road.is_blocked = bool(force_blocked)
    else:
        road.is_blocked = not road.is_blocked

    if road.is_blocked:
        road.closure_reason = reason
        event_type = "ROAD_BLOCKAGE_REPORTED"
        summary = f"Road segment {road.name} ({road.code}) reported blocked: {reason}"
    else:
        road.closure_reason = ""
        road.hazard_level = 0
        road.is_restricted = False
        event_type = "ROAD_BLOCKAGE_CLEARED"
        summary = f"Road segment {road.name} ({road.code}) cleared for emergency transit: {reason}"

    road.save()

    AuditEvent.objects.create(
        village=village,
        event_type=event_type,
        actor=actor,
        summary=summary,
        payload={"road_id": road.id, "road_code": road.code, "is_blocked": road.is_blocked, "reason": reason},
    )

    return Response(RoadEdgeSerializer(road).data)


@api_view(["GET", "POST"])
def incident_preview(request):
    village = get_default_village()
    data = request.data if request.method == "POST" else request.query_params
    try:
        epicenter_x = float(data.get("x", 580.0))
        epicenter_y = float(data.get("y", 420.0))
    except (ValueError, TypeError):
        return Response({"error": "Invalid x, y coordinates"}, status=status.HTTP_400_BAD_REQUEST)

    preset = data.get("preset") or data.get("scenario") or "MODERATE"
    preview_data = preview_simulated_incident(
        village_id=village.id,
        epicenter_x=epicenter_x,
        epicenter_y=epicenter_y,
        scenario_preset=preset,
    )
    return Response(preview_data)


@api_view(["POST"])
def incident_confirm(request):
    village = get_default_village()
    try:
        epicenter_x = float(request.data.get("x", 580.0))
        epicenter_y = float(request.data.get("y", 420.0))
    except (ValueError, TypeError):
        return Response({"error": "Invalid x, y coordinates"}, status=status.HTTP_400_BAD_REQUEST)

    preset = request.data.get("preset") or request.data.get("scenario") or "MODERATE"
    actor = request.data.get("actor", "Emergency Ops Controller")

    result = apply_simulated_incident(
        village_id=village.id,
        epicenter_x=epicenter_x,
        epicenter_y=epicenter_y,
        scenario_preset=preset,
        actor_name=actor,
    )
    return Response(result, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def incident_list(request):
    village = get_default_village()
    incidents = Incident.objects.filter(village=village).order_by("-confirmed_at")
    return Response(IncidentSerializer(incidents, many=True).data)


@api_view(["GET"])
def incident_detail(request, pk):
    village = get_default_village()
    try:
        incident = Incident.objects.get(village=village, id=pk)
    except Incident.DoesNotExist:
        return Response({"error": "Incident not found"}, status=status.HTTP_404_NOT_FOUND)

    return Response(IncidentSerializer(incident).data)


@api_view(["GET"])
def evacuation_list(request):
    village = get_default_village()
    assignments = EvacuationAssignment.objects.filter(village=village).order_by("-created_at")
    return Response(EvacuationAssignmentSerializer(assignments, many=True).data)


@api_view(["GET", "POST"])
def evacuation_plan(request):
    village = get_default_village()
    if request.method == "POST":
        resident_id = request.data.get("resident_id")
        facility_id = request.data.get("facility_id")
    else:
        resident_id = request.query_params.get("resident_id")
        facility_id = request.query_params.get("facility_id")

    if not resident_id:
        return Response({"error": "resident_id is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        resident = Resident.objects.get(village=village, id=resident_id)
    except Resident.DoesNotExist:
        return Response({"error": "Resident not found"}, status=status.HTTP_404_NOT_FOUND)

    router = GraphRouter(village_id=village.id)
    plan = router.plan_evacuation(resident, facility_id=facility_id)
    return Response(plan)


@api_view(["POST"])
def evacuation_assign(request):
    village = get_default_village()
    assignment_id = request.data.get("assignment_id")
    resident_id = request.data.get("resident_id")
    facility_id = request.data.get("facility_id")
    vehicle_id = request.data.get("vehicle_id")
    responder_id = request.data.get("responder_id")
    new_status = request.data.get("status", "ASSIGNED")
    actor = request.data.get("actor", "Evac Dispatch Coordinator")

    if assignment_id:
        try:
            assignment = EvacuationAssignment.objects.get(village=village, id=assignment_id)
        except EvacuationAssignment.DoesNotExist:
            return Response({"error": "Assignment not found"}, status=status.HTTP_404_NOT_FOUND)
    elif resident_id and facility_id:
        resident = Resident.objects.get(village=village, id=resident_id)
        facility = MedicalFacility.objects.get(village=village, id=facility_id)
        router = GraphRouter(village_id=village.id)
        plan = router.plan_evacuation(resident, facility_id=facility.id)
        dest = plan.get("recommended_destination", {})
        safest_rt = dest.get("safest_route", {})

        assignment = EvacuationAssignment.objects.create(
            village=village,
            resident=resident,
            facility=facility,
            priority_tier=resident.active_triage,
            route_snapshot=safest_rt,
            estimated_distance=safest_rt.get("distance", 0.0),
            estimated_travel_time=safest_rt.get("travel_time", 0.0),
            is_safest_route=True,
        )
    else:
        return Response({"error": "Either assignment_id or resident_id & facility_id required"}, status=status.HTTP_400_BAD_REQUEST)

    if vehicle_id:
        vehicle = Vehicle.objects.filter(village=village, id=vehicle_id).first()
        if vehicle:
            assignment.vehicle = vehicle
            if new_status in ["ASSIGNED", "IN_TRANSIT"]:
                vehicle.is_available = False
                vehicle.save()

    if responder_id:
        responder = Responder.objects.filter(village=village, id=responder_id).first()
        if responder:
            assignment.responder = responder
            if new_status in ["ASSIGNED", "IN_TRANSIT"]:
                responder.is_available = False
                responder.save()

    old_status = assignment.status
    assignment.status = new_status
    assignment.save()

    # Update resident evacuation status
    resident = assignment.resident
    resident.evacuation_status = new_status
    if new_status == "ARRIVED":
        resident.assigned_facility = assignment.facility
        # Free up vehicle and responder
        if assignment.vehicle:
            assignment.vehicle.is_available = True
            assignment.vehicle.save()
        if assignment.responder:
            assignment.responder.is_available = True
            assignment.responder.save()
    resident.save()

    AuditEvent.objects.create(
        village=village,
        event_type="EVACUATION_STATUS_CHANGED",
        actor=actor,
        summary=f"Evacuation for {resident.full_name} to {assignment.facility.name} updated: {old_status} -> {new_status}.",
        payload={
            "assignment_id": assignment.id,
            "resident_id": resident.id,
            "facility_id": assignment.facility_id,
            "new_status": new_status,
        },
    )

    return Response(EvacuationAssignmentSerializer(assignment).data)


@api_view(["GET"])
def responders_vehicles(request):
    village = get_default_village()
    responders = Responder.objects.filter(village=village)
    vehicles = Vehicle.objects.filter(village=village)
    return Response({
        "responders": ResponderSerializer(responders, many=True).data,
        "vehicles": VehicleSerializer(vehicles, many=True).data,
    })


@api_view(["GET"])
def audit_events_list(request):
    village = get_default_village()
    events = AuditEvent.objects.filter(village=village).order_by("-created_at")[:50]
    return Response(AuditEventSerializer(events, many=True).data)


@api_view(["POST"])
def reset_demo(request):
    actor = request.data.get("actor", "Demo Controller")
    try:
        call_command("seed_village", reset=True)
        return Response({
            "status": "success",
            "message": "Aster Vale simulation state successfully reset to deterministic baseline.",
            "actor": actor,
        })
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
