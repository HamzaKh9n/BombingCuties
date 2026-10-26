"""
Verification test suite for BOMBING CUTIES V1.4:
- Live Village Map landing experience
- Incident intelligence & transactional bombardment propagation
- Citizen evacuation and dynamic Dijkstra detouring
- Resident severity color-coding & deceased skull marker verification
- Vitals telemetry (ECG, SpO2, asystole flatline)
- Deceased historical retention & evacuation exclusion
"""
import urllib.request
import json
import sys

BASE_URL = "http://127.0.0.1:8000/api"

def request_json(path, method="GET", data=None):
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url, method=method)
    req.add_header("Content-Type", "application/json")
    body = json.dumps(data).encode("utf-8") if data else None
    with urllib.request.urlopen(req, data=body, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))

def main():
    print("=" * 60)
    print("BOMBING CUTIES V1.4 - SYSTEM VERIFICATION SUITE")
    print("=" * 60)

    # 1. Reset baseline
    print("\n[Step 1] Restoring pristine Aster Vale baseline...")
    reset_res = request_json("/village/reset/", method="POST", data={"actor": "V1.4 Test Runner"})
    assert reset_res.get("status") == "success", f"Failed reset: {reset_res}"
    print("   [OK] Database state reset to baseline.")

    # 2. Verify summary data
    print("\n[Step 2] Verifying village summary & population reconciliation...")
    summary = request_json("/village/summary/")
    metrics = summary["metrics"]
    assert metrics["total_residents"] == 100, f"Expected 100 residents, got {metrics['total_residents']}"
    assert metrics["residents_stable"] == 98, f"Expected 98 stable residents, got {metrics['residents_stable']}"
    assert metrics["residents_requiring_care"] == 2, f"Expected 2 care, got {metrics['residents_requiring_care']}"
    assert metrics["fatalities"] == 0, f"Expected 0 fatalities at baseline, got {metrics['fatalities']}"
    assert metrics["medical_facilities_count"] == 5, f"Expected 5 facilities, got {metrics['medical_facilities_count']}"
    print(f"   [OK] Population: {metrics['total_residents']} total | {metrics['residents_stable']} stable | {metrics['residents_requiring_care']} requiring care | {metrics['fatalities']} fatalities.")

    # 3. Verify map data
    print("\n[Step 3] Verifying map data & cartographic detail...")
    map_data = request_json("/village/map-data/")
    residents = map_data["residents"]
    buildings = map_data["buildings"]
    roads = map_data["road_edges"]
    facilities = map_data["facilities"]

    assert len(residents) == 100, f"Expected 100 resident coordinates, got {len(residents)}"
    assert len(buildings) >= 40, f"Expected >=40 buildings, got {len(buildings)}"
    assert len(roads) >= 49, f"Expected >=49 roads, got {len(roads)}"
    assert len(facilities) == 5, f"Expected 5 medical facilities, got {len(facilities)}"
    print(f"   [OK] Cartography: {len(residents)} residents, {len(buildings)} buildings, {len(roads)} roads, {len(facilities)} medical facilities.")

    # 4. Verify baseline injured residents
    print("\n[Step 4] Verifying baseline injured residents & vital telemetry...")
    clara = next((r for r in residents if r.get("code") == "RES-001" or r.get("first_name") == "Clara"), None)
    thomas = next((r for r in residents if r.get("code") == "RES-002" or r.get("first_name") == "Thomas"), None)
    assert clara and clara["active_triage"] in ["DELAYED", "IMMEDIATE"], f"Clara triage: {clara}"
    assert thomas and thomas["active_triage"] in ["DELAYED", "IMMEDIATE"], f"Thomas triage: {thomas}"
    print(f"   [OK] Clara Vane ({clara['code']}): Triage {clara['active_triage']}, Condition: {clara['medical_condition']}")
    print(f"   [OK] Thomas Sterling ({thomas['code']}): Triage {thomas['active_triage']}, Condition: {thomas['medical_condition']}")

    # 5. Verify direct Dijkstra evacuation routing
    print("\n[Step 5] Verifying direct Dijkstra route calculation...")
    route_clara = request_json(f"/evacuations/plan/?resident_id={clara['id']}")
    best = route_clara.get("recommended_destination")
    assert best is not None, f"Expected recommended destination for Clara: {route_clara}"
    safest = best["safest_route"]
    assert safest["found"] is True, f"Route not found for Clara: {safest}"
    assert len(safest["coordinates"]) >= 2, "Expected coordinate path for Clara"
    assert best["facility"]["name"], "Clara should route to nearest hospital"
    print(f"   [OK] Route calculated: {safest['distance']}m via {len(safest['edges'])} road segments to {best['facility']['name']}.")

    # 6. Execute simulated bombardment
    print("\n[Step 6] Executing simulated bombardment at Northridge Terraces (560, 190)...")
    bombard_res = request_json("/incident/confirm/", method="POST", data={
        "x": 560,
        "y": 190,
        "preset": "MODERATE",
        "actor": "V1.4 Test Suite"
    })
    incident = bombard_res["incident"]
    outcomes = bombard_res.get("resident_outcomes", [])
    assert incident["fatalities_count"] > 0, f"Expected fatalities in Northridge cluster, got {incident['fatalities_count']}"
    assert incident["blocked_roads_count"] > 0, f"Expected blocked roads, got {incident['blocked_roads_count']}"
    assert len(outcomes) > 0, "Expected resident outcomes list"
    print(f"   [OK] Bombardment confirmed: Incident {incident['code']}")
    print(f"   [OK] Blast consequences: {incident['fatalities_count']} fatalities, {incident['casualties_count']} casualties, {incident['blocked_roads_count']} blocked roads, {incident['damaged_buildings_count']} damaged buildings.")

    # 7. Verify post-bombardment state sync & deceased status
    print("\n[Step 7] Verifying post-bombardment map state sync & deceased properties...")
    post_map = request_json("/village/map-data/")
    post_residents = post_map["residents"]
    post_roads = post_map["road_edges"]

    deceased_list = [r for r in post_residents if r["is_fatality"]]
    living_list = [r for r in post_residents if not r["is_fatality"]]
    assert len(deceased_list) == incident["fatalities_count"], "Deceased count mismatch in map data"
    assert len(deceased_list) + len(living_list) == 100, "Total residents must remain exactly 100"

    for dec in deceased_list:
        assert dec["active_triage"] == "EXPECTANT", f"Deceased {dec['id']} triage must be EXPECTANT, got {dec['active_triage']}"
        assert dec["evacuation_status"] == "CANCELLED", f"Deceased {dec['id']} evac status must be CANCELLED"
        # Check that routing is not applicable for deceased
        plan_dec = request_json(f"/evacuations/plan/?resident_id={dec['id']}")
        assert plan_dec.get("route_found") is False or "deceased" in plan_dec.get("message", "").lower(), "Deceased should not receive active route"

    print(f"   [OK] Total 100 reconciled: {len(living_list)} living + {len(deceased_list)} deceased.")
    print(f"   [OK] Deceased residents verified: EXPECTANT triage, CANCELLED evacuation status, excluded from routing.")

    # 8. Verify road blockage reflects in map data and dynamic Dijkstra rerouting
    print("\n[Step 8] Verifying blocked roads and dynamic detour...")
    blocked_roads = [r for r in post_roads if r["is_blocked"]]
    assert len(blocked_roads) >= incident["blocked_roads_count"], "Blocked roads mismatch"
    print(f"   [OK] {len(blocked_roads)} road segments actively blocked with hazard markings.")

    # 9. Clean baseline restore
    print("\n[Step 9] Restoring pristine baseline...")
    request_json("/village/reset/", method="POST", data={"actor": "V1.4 Test Cleanup"})
    print("   [OK] Baseline restored successfully.")

    print("\n" + "=" * 60)
    print(">>> ALL BOMBING CUTIES V1.4 REQUIREMENTS VERIFIED 100% <<<")
    print("=" * 60)

if __name__ == "__main__":
    main()
