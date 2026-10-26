import math
import random
from typing import Dict, Any, List, Tuple
from django.db import transaction
from django.utils import timezone
from ..models import (
    Village, Neighborhood, Building, MedicalFacility, Resident,
    VitalObservation, RoadNode, RoadEdge, Hazard, Incident,
    IncidentResidentOutcome, EvacuationAssignment, AuditEvent
)
from .routing import GraphRouter, find_nearest_node, euclidean_distance


PRESET_CONFIG = {
    "LOCALIZED": {
        "title": "Localized Detonation (Small Perimeter)",
        "radius": 90.0,
        "blast_core_ratio": 0.20,
        "heavy_damage_ratio": 0.45,
        "description": "Fictional localized munition impact or transformer explosion. Impact concentrated within a single block.",
    },
    "MODERATE": {
        "title": "Moderate Munition Impact (Medium Radius)",
        "radius": 150.0,
        "blast_core_ratio": 0.20,
        "heavy_damage_ratio": 0.50,
        "description": "Fictional moderate secondary blast. Significant structural damage and multiple residential cluster casualties.",
    },
    "MAJOR": {
        "title": "Major Structural Blast (High Yield)",
        "radius": 240.0,
        "blast_core_ratio": 0.20,
        "heavy_damage_ratio": 0.55,
        "description": "Fictional catastrophic multi-structure disaster. Extensive building collapse, major arterial blockages, and critical casualties.",
    },
}


def get_preset_details(preset_name: str) -> Dict[str, Any]:
    return PRESET_CONFIG.get(preset_name.upper(), PRESET_CONFIG["MODERATE"])


def evaluate_resident_outcome(
    res: Resident,
    dist: float,
    radius: float,
    epicenter_x: float,
    epicenter_y: float
) -> Dict[str, Any]:
    """
    Deterministic distance-based outcome calculation for a resident in Aster Vale.
    Rules:
      - Innermost severity zone (dist <= radius * 0.20 or dist <= 22m): FATAL outcome (EXPECTANT).
      - Surrounding zone (0.20 < norm_dist <= 0.45): CRITICAL (IMMEDIATE / Red).
      - Intermediate zone (0.45 < norm_dist <= 0.75): SERIOUS (DELAYED / Yellow).
      - Outer perimeter (0.75 < norm_dist <= 1.0): MINOR (MINIMAL / Green).
      - Beyond perimeter: UNAFFECTED.
      - Previously deceased residents are never recounted as new fatalities.
      - Pre-existing compromised conditions (e.g. Clara's asthma) are not downgraded.
    """
    # 1. Check if already deceased from a previous incident
    if res.is_fatality or res.active_triage == "EXPECTANT":
        return {
            "category": "PREVIOUSLY_DECEASED",
            "is_new_fatality": False,
            "is_new_casualty": False,
            "resulting_triage": "EXPECTANT",
            "is_fatality": True,
            "condition_desc": res.medical_condition,
            "injury_mech": "Previously sustained non-survivable blast trauma in prior incident",
            "triage_reason": "Expectant (Black): Deceased in prior incident; confirmed pulseless.",
            "vitals": {"hr": 0, "spo2": 0, "bp": "0/0", "sys": 0, "dia": 0, "rr": 0, "consciousness": "UNRESPONSIVE"},
        }

    norm_dist = dist / radius

    # 2. Innermost Core: Fatal outcome
    if norm_dist <= 0.20 or dist <= 22.0:
        return {
            "category": "EXPECTANT",
            "is_new_fatality": True,
            "is_new_casualty": False,
            "resulting_triage": "EXPECTANT",
            "is_fatality": True,
            "condition_desc": "Fatal blast overpressure trauma; non-survivable direct exposure",
            "injury_mech": "Direct primary blast overpressure shockwave and masonry crushing",
            "triage_reason": "Expectant (Black): Catastrophic direct impact trauma; absence of vital signs.",
            "vitals": {"hr": 0, "spo2": 0, "bp": "0/0", "sys": 0, "dia": 0, "rr": 0, "consciousness": "UNRESPONSIVE"},
        }

    # 3. Inner Ring: Critical Immediate injuries
    elif norm_dist <= 0.45:
        # Critical (Immediate / Red)
        hr = 132 + (res.id % 12)
        spo2 = 74 + (res.id % 8)
        sys = 70 + (res.id % 12)
        dia = 40 + (res.id % 10)
        rr = 34 + (res.id % 6)
        consciousness = "UNRESPONSIVE" if (res.id % 2 == 0) else "PAIN_RESPONSIVE"

        return {
            "category": "IMMEDIATE",
            "is_new_fatality": False,
            "is_new_casualty": True,
            "resulting_triage": "IMMEDIATE",
            "is_fatality": False,
            "condition_desc": "Blast lung injury, arterial hemorrhage, severe thoracic and abdominal trauma",
            "injury_mech": "Primary blast wave displacement & high-velocity fragmentation",
            "triage_reason": f"Immediate (Red): Severe respiratory depression (SpO2 {spo2}%), profound shock (BP {sys}/{dia}), critical priority.",
            "vitals": {"hr": hr, "spo2": spo2, "bp": f"{sys}/{dia}", "sys": sys, "dia": dia, "rr": rr, "consciousness": consciousness},
        }

    # 4. Intermediate Ring: Serious Delayed injuries
    elif norm_dist <= 0.75:
        # If resident was already IMMEDIATE before, maintain IMMEDIATE
        resulting = "IMMEDIATE" if res.active_triage == "IMMEDIATE" else "DELAYED"
        hr = 104 + (res.id % 10)
        spo2 = 90 + (res.id % 4)
        sys = 110 + (res.id % 12)
        dia = 70 + (res.id % 8)
        rr = 22 + (res.id % 4)
        consciousness = "VOICE_RESPONSIVE" if (res.id % 3 == 0) else "ALERT"

        return {
            "category": "DELAYED",
            "is_new_fatality": False,
            "is_new_casualty": True if res.active_triage == "STABLE" else False,
            "resulting_triage": resulting,
            "is_fatality": False,
            "condition_desc": "Open compound limb fracture, deep penetrating shrapnel lacerations, blunt contusions",
            "injury_mech": "Secondary projectile impacts and falling architectural debris",
            "triage_reason": "Delayed (Yellow): Serious extremity & skeletal trauma; airway patent and vitals stabilized.",
            "vitals": {"hr": hr, "spo2": spo2, "bp": f"{sys}/{dia}", "sys": sys, "dia": dia, "rr": rr, "consciousness": consciousness},
        }

    # 5. Outer Ring: Minor Minimal injuries
    elif norm_dist <= 1.0:
        # Pre-existing compromised conditions (e.g. Clara's asthma or Thomas's fracture) are not downgraded
        if res.active_triage in ["IMMEDIATE", "DELAYED"]:
            resulting = res.active_triage
            cat = res.active_triage
            cond = res.medical_condition + "; minor superficial abrasions"
            reason = res.simulated_priority_reason
        else:
            resulting = "MINIMAL"
            cat = "MINIMAL"
            cond = "Superficial glass lacerations to extremities, mild corneal particulate irritation"
            reason = "Minimal (Green): Walking wounded; self-ambulatory with normal hemodynamic parameters."

        hr = 84 + (res.id % 8)
        spo2 = 97 + (res.id % 2)
        sys = 124 + (res.id % 8)
        dia = 80 + (res.id % 4)
        rr = 16 + (res.id % 4)

        return {
            "category": cat,
            "is_new_fatality": False,
            "is_new_casualty": True if res.active_triage == "STABLE" else False,
            "resulting_triage": resulting,
            "is_fatality": False,
            "condition_desc": cond,
            "injury_mech": "Tertiary concussive reverberation & flying glass fragmentation",
            "triage_reason": reason,
            "vitals": {"hr": hr, "spo2": spo2, "bp": f"{sys}/{dia}", "sys": sys, "dia": dia, "rr": rr, "consciousness": "ALERT"},
        }

    # 6. Outside Radius: Unaffected
    else:
        return {
            "category": "UNAFFECTED",
            "is_new_fatality": False,
            "is_new_casualty": False,
            "resulting_triage": res.active_triage,
            "is_fatality": res.is_fatality,
            "condition_desc": res.medical_condition,
            "injury_mech": "Outside active blast perimeter; unaffected",
            "triage_reason": res.simulated_priority_reason,
            "vitals": None,
        }


def preview_simulated_incident(
    village_id: int,
    epicenter_x: float,
    epicenter_y: float,
    scenario_preset: str
) -> Dict[str, Any]:
    preset = get_preset_details(scenario_preset)
    radius = preset["radius"]

    residents = Resident.objects.filter(village_id=village_id)
    buildings = Building.objects.filter(village_id=village_id)
    roads = RoadEdge.objects.filter(village_id=village_id)
    facilities = MedicalFacility.objects.filter(village_id=village_id)

    affected_residents = []
    category_counts = {
        "UNAFFECTED": 0,
        "MINIMAL": 0,
        "DELAYED": 0,
        "IMMEDIATE": 0,
        "EXPECTANT": 0,
    }

    new_fatalities = 0
    new_casualties = 0

    for res in residents:
        dist = euclidean_distance((res.x, res.y), (epicenter_x, epicenter_y))
        outcome = evaluate_resident_outcome(res, dist, radius, epicenter_x, epicenter_y)

        cat = outcome["category"]
        if cat in category_counts:
            category_counts[cat] += 1

        if outcome["is_new_fatality"]:
            new_fatalities += 1
        elif outcome["is_new_casualty"]:
            new_casualties += 1

        if dist <= radius and cat != "UNAFFECTED":
            affected_residents.append({
                "id": res.id,
                "name": res.full_name,
                "code": res.code,
                "distance": round(dist, 1),
                "estimated_triage": outcome["resulting_triage"],
                "current_triage": res.active_triage,
            })

    # Buildings affected
    damaged_buildings = []
    for bld in buildings:
        dist = euclidean_distance((bld.x, bld.y), (epicenter_x, epicenter_y))
        if dist <= radius:
            norm_dist = dist / radius
            severity = "COLLAPSED" if norm_dist <= 0.30 else ("HEAVY" if norm_dist <= 0.60 else "MODERATE")
            damaged_buildings.append({
                "id": bld.id,
                "name": bld.name,
                "code": bld.code,
                "distance": round(dist, 1),
                "projected_damage": severity,
            })

    # Road edges affected
    blocked_roads = []
    restricted_roads = []
    for road in roads:
        u = road.from_node
        v = road.to_node
        mid_x = (u.x + v.x) / 2
        mid_y = (u.y + v.y) / 2
        min_dist = min(
            euclidean_distance((u.x, u.y), (epicenter_x, epicenter_y)),
            euclidean_distance((v.x, v.y), (epicenter_x, epicenter_y)),
            euclidean_distance((mid_x, mid_y), (epicenter_x, epicenter_y)),
        )

        if min_dist <= (radius * 0.40):
            blocked_roads.append({
                "id": road.id,
                "name": road.name,
                "code": road.code,
                "projected_state": "BLOCKED",
                "reason": "Direct blast impact & structural masonry debris",
            })
        elif min_dist <= radius:
            restricted_roads.append({
                "id": road.id,
                "name": road.name,
                "code": road.code,
                "projected_state": "RESTRICTED",
                "reason": "Shrapnel scatter & emergency corridor cordon",
            })

    # Facility impact projection
    facility_demands = []
    for fac in facilities:
        dist = euclidean_distance((fac.x, fac.y), (epicenter_x, epicenter_y))
        surge_estimated = 0
        if fac.facility_type in ["TRAUMA_CENTER", "COMMUNITY_HOSPITAL"]:
            surge_estimated = min(fac.available_capacity, category_counts["IMMEDIATE"] + category_counts["DELAYED"])
        else:
            surge_estimated = min(fac.available_capacity, category_counts["MINIMAL"])

        facility_demands.append({
            "id": fac.id,
            "name": fac.name,
            "code": fac.code,
            "distance": round(dist, 1),
            "available_capacity": fac.available_capacity,
            "projected_incoming_surge": surge_estimated,
        })

    return {
        "status": "preview",
        "scenario_preset": scenario_preset,
        "preset_title": preset["title"],
        "epicenter": {"x": epicenter_x, "y": epicenter_y},
        "radius": radius,
        "summary": {
            "total_residents_in_zone": len(affected_residents),
            "estimated_fatalities": new_fatalities,
            "estimated_critical_immediate": category_counts["IMMEDIATE"],
            "estimated_delayed_urgent": category_counts["DELAYED"],
            "estimated_minimal": category_counts["MINIMAL"],
            "estimated_unaffected": category_counts["UNAFFECTED"],
            "damaged_buildings_count": len(damaged_buildings),
            "roads_blocked_count": len(blocked_roads),
            "roads_restricted_count": len(restricted_roads),
        },
        "affected_residents": affected_residents[:15],
        "damaged_buildings": damaged_buildings,
        "blocked_roads": blocked_roads,
        "restricted_roads": restricted_roads,
        "facility_demands": facility_demands,
        "disclaimer": "Simulated estimates calculated for training & decision support. Does not represent actual weapon physics or real clinical prognosis.",
    }


def apply_simulated_incident(
    village_id: int,
    epicenter_x: float,
    epicenter_y: float,
    scenario_preset: str,
    actor_name: str = "Emergency Ops Controller"
) -> Dict[str, Any]:
    preset = get_preset_details(scenario_preset)
    radius = preset["radius"]

    with transaction.atomic():
        village = Village.objects.select_for_update().get(id=village_id)
        village.status = "DISASTER_RESPONSE"
        village.save()

        # Generate incident code
        existing_incidents_count = Incident.objects.filter(village_id=village_id).count()
        inc_code = f"INC-SIM-{(existing_incidents_count + 1):03d}"

        incident = Incident.objects.create(
            village=village,
            code=inc_code,
            scenario_preset=scenario_preset,
            preset_title=preset["title"],
            epicenter_x=epicenter_x,
            epicenter_y=epicenter_y,
            radius=radius,
            simulation_model_version="AFTERLIGHT-DET-v1.2",
            notes=f"Simulated {preset['title']} detonated at cartographic coordinate ({epicenter_x:.1f}, {epicenter_y:.1f}) with active radius {radius:.1f}m.",
            confirmed_at=timezone.now(),
        )

        # Create physical hazard zone on map
        Hazard.objects.create(
            village=village,
            code=f"HAZ-{incident.code}",
            hazard_type="BLAST_CRATER",
            epicenter_x=epicenter_x,
            epicenter_y=epicenter_y,
            radius=radius,
            severity="CRITICAL" if scenario_preset == "MAJOR" else ("HIGH" if scenario_preset == "MODERATE" else "MEDIUM"),
            description=f"Active impact zone from {preset['title']}. Airway particulate hazards and masonry collapse risks.",
            is_active=True,
        )

        # 1. Update buildings
        buildings = Building.objects.filter(village_id=village_id)
        damaged_buildings_count = 0
        for bld in buildings:
            dist = euclidean_distance((bld.x, bld.y), (epicenter_x, epicenter_y))
            if dist <= radius:
                norm_dist = dist / radius
                if norm_dist <= 0.30:
                    bld.is_damaged = True
                    bld.damage_severity = "COLLAPSED"
                    bld.structural_integrity = max(0.05, round(0.1 + (norm_dist * 0.2), 2))
                    bld.damage_notes = "Primary blast impact core. Roof collapsed, structural load failure."
                elif norm_dist <= 0.60:
                    bld.is_damaged = True
                    bld.damage_severity = "HEAVY"
                    bld.structural_integrity = round(0.35 + (norm_dist * 0.2), 2)
                    bld.damage_notes = "Major wall shearing, window blowout, fire risk."
                else:
                    bld.is_damaged = True
                    bld.damage_severity = "MODERATE"
                    bld.structural_integrity = round(0.65 + (norm_dist * 0.2), 2)
                    bld.damage_notes = "Superficial exterior cracks, facade fragmentation."
                bld.save()
                damaged_buildings_count += 1

        # 2. Update roads & blockages
        roads = RoadEdge.objects.filter(village_id=village_id)
        blocked_count = 0
        for road in roads:
            u = road.from_node
            v = road.to_node
            mid_x = (u.x + v.x) / 2
            mid_y = (u.y + v.y) / 2
            min_dist = min(
                euclidean_distance((u.x, u.y), (epicenter_x, epicenter_y)),
                euclidean_distance((v.x, v.y), (epicenter_x, epicenter_y)),
                euclidean_distance((mid_x, mid_y), (epicenter_x, epicenter_y)),
            )

            if min_dist <= (radius * 0.40):
                road.is_blocked = True
                road.hazard_level = 3
                road.closure_reason = f"Impassable: Crater & structural debris from {incident.code}"
                road.save()
                blocked_count += 1
            elif min_dist <= radius:
                road.is_restricted = True
                road.hazard_level = 2
                road.closure_reason = "Restricted: Debris scatter & emergency operations corridor"
                road.save()

        # 3. Update residents deterministically using evaluate_resident_outcome
        residents = Resident.objects.filter(village_id=village_id)
        new_fatalities_count = 0
        new_casualties_count = 0
        affected_count = 0

        # Detailed breakdown of resulting statuses for incident summary
        residents_unaffected_count = 0
        minor_injuries_count = 0
        serious_injuries_count = 0
        critical_injuries_count = 0

        router = GraphRouter(village_id=village_id)

        for res in residents:
            dist = euclidean_distance((res.x, res.y), (epicenter_x, epicenter_y))
            outcome = evaluate_resident_outcome(res, dist, radius, epicenter_x, epicenter_y)

            if dist > radius:
                residents_unaffected_count += 1
                continue

            affected_count += 1
            initial_triage = res.active_triage

            if outcome["is_new_fatality"]:
                new_fatalities_count += 1
            elif outcome["is_new_casualty"]:
                new_casualties_count += 1

            resulting_triage = outcome["resulting_triage"]
            if resulting_triage == "IMMEDIATE":
                critical_injuries_count += 1
            elif resulting_triage == "DELAYED":
                serious_injuries_count += 1
            elif resulting_triage == "MINIMAL":
                minor_injuries_count += 1

            is_fatality = outcome["is_fatality"]

            # Apply resident update
            res.triage_category = resulting_triage
            res.is_fatality = is_fatality
            res.medical_condition = outcome["condition_desc"]
            res.simulated_priority_reason = outcome["triage_reason"]
            res.manual_priority_override = None  # reset any previous manual override

            if is_fatality:
                res.evacuation_status = "CANCELLED"
            else:
                if resulting_triage in ["IMMEDIATE", "DELAYED"]:
                    res.evacuation_status = "RECOMMENDED"

            res.save()

            # Record outcome record (each resident counted exactly once per incident)
            vital_dict = outcome["vitals"] or {}
            vital_str = f"HR {vital_dict.get('hr', 0)}, SpO2 {vital_dict.get('spo2', 0)}%, BP {vital_dict.get('bp', '0/0')}, RR {vital_dict.get('rr', 0)}, {vital_dict.get('consciousness', 'UNRESPONSIVE')}"

            IncidentResidentOutcome.objects.create(
                incident=incident,
                resident=res,
                initial_triage=initial_triage,
                resulting_triage=resulting_triage,
                distance_from_epicenter=round(dist, 1),
                injury_mechanism=outcome["injury_mech"],
                vital_summary=vital_str,
            )

            # Record vital telemetry observation if vitals changed
            if outcome["vitals"]:
                v = outcome["vitals"]
                VitalObservation.objects.create(
                    resident=res,
                    heart_rate=v["hr"],
                    spo2=v["spo2"],
                    blood_pressure=v["bp"],
                    systolic=v["sys"],
                    diastolic=v["dia"],
                    respiratory_rate=v["rr"],
                    consciousness=v["consciousness"],
                    source_label="Post-Incident Sensor & Responder Telemetry",
                    notes=f"Recorded directly after {incident.code} detonation.",
                    recorded_at=timezone.now(),
                )

            # Generate evacuation routing recommendation for non-fatalities needing care
            if not is_fatality and resulting_triage in ["IMMEDIATE", "DELAYED"]:
                plan = router.plan_evacuation(res)
                best_fac = plan.get("recommended_destination")
                if best_fac and best_fac.get("is_reachable"):
                    fac_obj = MedicalFacility.objects.filter(id=best_fac["facility"]["id"]).first()
                    if fac_obj:
                        res.assigned_facility = fac_obj
                        res.save()

                        # Create EvacuationAssignment record
                        EvacuationAssignment.objects.create(
                            village=village,
                            resident=res,
                            facility=fac_obj,
                            status="RECOMMENDED",
                            priority_tier=resulting_triage,
                            route_snapshot=best_fac["safest_route"],
                            estimated_distance=best_fac["safest_route"]["distance"],
                            estimated_travel_time=best_fac["safest_route"]["travel_time"],
                            is_safest_route=True,
                            hazard_avoidance_notes="Autonomous routing dynamically bypassed blocked roads and blast crater.",
                        )

        # 4. Update facility current occupancy based on assignments
        for fac in MedicalFacility.objects.filter(village_id=village_id):
            assigned_count = Resident.objects.filter(assigned_facility=fac, is_fatality=False).count()
            fac.current_occupancy = min(fac.total_capacity, assigned_count)
            if fac.current_occupancy >= fac.total_capacity:
                fac.operational_status = "SURGE"
            fac.save()

        # 5. Update incident final totals
        incident.affected_residents_count = affected_count
        incident.casualties_count = new_casualties_count
        incident.fatalities_count = new_fatalities_count
        incident.damaged_buildings_count = damaged_buildings_count
        incident.blocked_roads_count = blocked_count
        incident.save()

        # 6. Audit Event
        AuditEvent.objects.create(
            village=village,
            event_type="INCIDENT_COMMITTED",
            actor=actor_name,
            summary=f"Confirmed simulated {preset['title']}. Resulted in {new_casualties_count} casualties, {new_fatalities_count} fatalities, {damaged_buildings_count} damaged buildings, and {blocked_count} blocked roads.",
            payload={
                "incident_code": incident.code,
                "preset": scenario_preset,
                "epicenter": [epicenter_x, epicenter_y],
                "radius": radius,
                "casualties": new_casualties_count,
                "fatalities": new_fatalities_count,
                "critical": critical_injuries_count,
                "serious": serious_injuries_count,
                "minor": minor_injuries_count,
            },
        )

    return {
        "status": "success",
        "incident": {
            "id": incident.id,
            "code": incident.code,
            "preset_title": incident.preset_title,
            "scenario_preset": incident.scenario_preset,
            "epicenter": {"x": incident.epicenter_x, "y": incident.epicenter_y},
            "radius": incident.radius,
            "affected_residents_count": incident.affected_residents_count,
            "casualties_count": incident.casualties_count,
            "fatalities_count": incident.fatalities_count,
            "damaged_buildings_count": incident.damaged_buildings_count,
            "blocked_roads_count": incident.blocked_roads_count,
            "critical_injuries_count": critical_injuries_count,
            "serious_injuries_count": serious_injuries_count,
            "minor_injuries_count": minor_injuries_count,
            "residents_unaffected_count": residents_unaffected_count,
            "confirmed_at": incident.confirmed_at.isoformat(),
        }
    }
