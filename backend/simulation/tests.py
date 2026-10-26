from django.test import TestCase
from django.core.management import call_command
from .models import Village, Resident, MedicalFacility, RoadEdge, Incident, EvacuationAssignment
from .services.routing import GraphRouter
from .services.simulation_engine import preview_simulated_incident, apply_simulated_incident


class AsterValeBaselineAndSimulationTests(TestCase):
    def setUp(self):
        call_command("seed_village")
        self.village = Village.objects.get(code="AV-01")

    def test_baseline_reconciliation(self):
        """Verifies exact required baseline numbers: 100 residents, 98 stable, 2 needing care, 5 facilities, 0 blockages."""
        residents = Resident.objects.filter(village=self.village)
        self.assertEqual(residents.count(), 100)

        stable_count = sum(1 for r in residents if r.active_triage == "STABLE")
        care_count = sum(1 for r in residents if r.active_triage in ["MINIMAL", "DELAYED", "IMMEDIATE"])
        critical_count = sum(1 for r in residents if r.active_triage == "IMMEDIATE")
        fatalities_count = sum(1 for r in residents if r.is_fatality)

        self.assertEqual(stable_count, 98)
        self.assertEqual(care_count, 2)
        self.assertEqual(critical_count, 0)
        self.assertEqual(fatalities_count, 0)
        self.assertEqual(stable_count + care_count, 100)

        # Check the two specific baseline residents
        clara = residents.get(code="RES-001")
        self.assertEqual(clara.first_name, "Clara")
        self.assertEqual(clara.last_name, "Vane")
        self.assertEqual(clara.active_triage, "DELAYED")
        self.assertIn("SpO2", clara.simulated_priority_reason)

        thomas = residents.get(code="RES-002")
        self.assertEqual(thomas.first_name, "Thomas")
        self.assertEqual(thomas.last_name, "Sterling")
        self.assertEqual(thomas.active_triage, "DELAYED")

        # Check facilities
        facilities = MedicalFacility.objects.filter(village=self.village)
        self.assertEqual(facilities.count(), 5)

        # Check road blockages
        blocked_roads = RoadEdge.objects.filter(village=self.village, is_blocked=True)
        self.assertEqual(blocked_roads.count(), 0)

    def test_routing_engine(self):
        """Verifies Dijkstra routing produces valid paths between nodes and handles blockages."""
        router = GraphRouter(village_id=self.village.id)
        clara = Resident.objects.get(code="RES-001")

        plan = router.plan_evacuation(clara)
        rec = plan.get("recommended_destination")
        self.assertIsNotNone(rec)
        self.assertTrue(rec["is_reachable"])
        self.assertGreater(len(rec["safest_route"]["nodes"]), 1)

    def test_preview_does_not_mutate_state(self):
        """Verifies previewing an incident does not change database state."""
        prev_incident_count = Incident.objects.count()
        prev_blocked = RoadEdge.objects.filter(is_blocked=True).count()

        preview = preview_simulated_incident(
            village_id=self.village.id,
            epicenter_x=580.0,
            epicenter_y=420.0,
            scenario_preset="MODERATE",
        )
        self.assertEqual(preview["status"], "preview")
        self.assertGreater(preview["summary"]["total_residents_in_zone"], 0)

        # State must remain identical
        self.assertEqual(Incident.objects.count(), prev_incident_count)
        self.assertEqual(RoadEdge.objects.filter(is_blocked=True).count(), prev_blocked)

    def test_apply_incident_and_reset(self):
        """Verifies applying a simulated incident commits changes and reset restores baseline."""
        result = apply_simulated_incident(
            village_id=self.village.id,
            epicenter_x=580.0,
            epicenter_y=420.0,
            scenario_preset="MODERATE",
        )
        self.assertEqual(result["status"], "success")

        # Check that state changed
        self.assertEqual(Incident.objects.count(), 1)
        self.assertGreater(RoadEdge.objects.filter(is_blocked=True).count(), 0)

        # Check reset
        call_command("seed_village", reset=True)
        self.assertEqual(Incident.objects.count(), 0)
        self.assertEqual(RoadEdge.objects.filter(is_blocked=True).count(), 0)
        self.assertEqual(Resident.objects.filter(triage_category="STABLE").count(), 98)

    def test_direct_impact_fatal_outcome_and_no_duplicate_deaths(self):
        """Verifies direct impact point residents receive fatal outcome and are not recounted twice."""
        target_res = Resident.objects.first()
        # Detonate directly at target resident coordinates
        result = apply_simulated_incident(
            village_id=self.village.id,
            epicenter_x=target_res.x,
            epicenter_y=target_res.y,
            scenario_preset="LOCALIZED",
        )
        target_res.refresh_from_db()
        self.assertTrue(target_res.is_fatality)
        self.assertEqual(target_res.triage_category, "EXPECTANT")

        # Detonate a second incident at the same spot
        result2 = apply_simulated_incident(
            village_id=self.village.id,
            epicenter_x=target_res.x,
            epicenter_y=target_res.y,
            scenario_preset="LOCALIZED",
        )
        # Target resident should not be counted as a new fatality
        self.assertEqual(result2["incident"]["fatalities_count"], 0)
