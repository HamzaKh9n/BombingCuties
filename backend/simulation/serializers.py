from rest_framework import serializers
from .models import (
    Village, Neighborhood, Building, MedicalFacility, Resident,
    VitalObservation, RoadNode, RoadEdge, Hazard, Vehicle, Responder,
    Incident, IncidentResidentOutcome, EvacuationAssignment, AuditEvent
)


class NeighborhoodSerializer(serializers.ModelSerializer):
    class Meta:
        model = Neighborhood
        fields = "__all__"


class BuildingSerializer(serializers.ModelSerializer):
    neighborhood_name = serializers.CharField(source="neighborhood.name", read_only=True)

    class Meta:
        model = Building
        fields = "__all__"


class MedicalFacilitySerializer(serializers.ModelSerializer):
    neighborhood_name = serializers.CharField(source="neighborhood.name", read_only=True)
    available_capacity = serializers.IntegerField(read_only=True)

    class Meta:
        model = MedicalFacility
        fields = "__all__"


class VitalObservationSerializer(serializers.ModelSerializer):
    class Meta:
        model = VitalObservation
        fields = "__all__"


class ResidentListSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    active_triage = serializers.CharField(read_only=True)
    neighborhood_name = serializers.CharField(source="neighborhood.name", read_only=True)
    building_name = serializers.CharField(source="building.name", read_only=True)
    assigned_facility_name = serializers.CharField(source="assigned_facility.name", read_only=True)
    latest_vitals = serializers.SerializerMethodField()

    class Meta:
        model = Resident
        fields = [
            "id", "code", "full_name", "first_name", "last_name", "age", "gender",
            "medical_condition", "baseline_condition", "triage_category", "active_triage",
            "manual_priority_override", "manual_override_reason", "simulated_priority_reason",
            "evacuation_status", "is_fatality", "x", "y", "neighborhood", "neighborhood_name",
            "building", "building_name", "assigned_facility", "assigned_facility_name",
            "latest_vitals", "updated_at"
        ]

    def get_latest_vitals(self, obj):
        vital = obj.vital_observations.first()
        if vital:
            return VitalObservationSerializer(vital).data
        return None


class ResidentDetailSerializer(ResidentListSerializer):
    vital_observations = VitalObservationSerializer(many=True, read_only=True)

    class Meta(ResidentListSerializer.Meta):
        fields = ResidentListSerializer.Meta.fields + ["medical_history", "vital_observations"]


class RoadNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoadNode
        fields = "__all__"


class RoadEdgeSerializer(serializers.ModelSerializer):
    from_node_code = serializers.CharField(source="from_node.code", read_only=True)
    to_node_code = serializers.CharField(source="to_node.code", read_only=True)

    class Meta:
        model = RoadEdge
        fields = "__all__"


class HazardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hazard
        fields = "__all__"


class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = "__all__"


class ResponderSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = Responder
        fields = "__all__"


class IncidentResidentOutcomeSerializer(serializers.ModelSerializer):
    resident_name = serializers.CharField(source="resident.full_name", read_only=True)
    resident_code = serializers.CharField(source="resident.code", read_only=True)

    class Meta:
        model = IncidentResidentOutcome
        fields = "__all__"


class IncidentSerializer(serializers.ModelSerializer):
    resident_outcomes = IncidentResidentOutcomeSerializer(many=True, read_only=True)

    class Meta:
        model = Incident
        fields = "__all__"


class EvacuationAssignmentSerializer(serializers.ModelSerializer):
    resident_name = serializers.CharField(source="resident.full_name", read_only=True)
    resident_code = serializers.CharField(source="resident.code", read_only=True)
    facility_name = serializers.CharField(source="facility.name", read_only=True)
    facility_code = serializers.CharField(source="facility.code", read_only=True)
    vehicle_name = serializers.CharField(source="vehicle.name", read_only=True)
    vehicle_callsign = serializers.CharField(source="vehicle.callsign", read_only=True)
    responder_name = serializers.CharField(source="responder.name", read_only=True)
    responder_callsign = serializers.CharField(source="responder.contact_callsign", read_only=True)

    class Meta:
        model = EvacuationAssignment
        fields = "__all__"


class AuditEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditEvent
        fields = "__all__"
