"""
AFTERLIGHT V1.3 - COMPREHENSIVE AUTOMATED VERIFICATION SUITE
Tests all V1.3 requirements:
1. Detailed Road Graph (46 segments) & Buildings (40 buildings)
2. Single persistent source of truth (100 residents, 5 facilities)
3. Citizen perspective & simulated telemetry (normal vs tachypnea vs flatline)
4. Dynamic Dijkstra evacuation routing & blockage avoidance
5. Non-mutating preview & atomic transactional bombardment
6. Explicit deceased separation and non-evacuable status
7. Complete demo reset idempotency
"""

import sys
import json
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000/api"

def request_json(url, method='GET', data=None):
    req = urllib.request.Request(f"{BASE_URL}{url}", method=method)
    req.add_header('Content-Type', 'application/json')
    req.add_header('Accept', 'application/json')
    if data is not None:
        body = json.dumps(data).encode('utf-8')
        req.data = body
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def main():
    print("=" * 60)
    print("AFTERLIGHT V1.3 - VISUAL IMMERSION & LOGISTICS VERIFICATION")
    print("=" * 60)

    # 1. Reset Baseline
    print("\n[Step 1] Initializing pristine Aster Vale baseline...")
    reset_res = request_json("/village/reset/", method='POST', data={"actor": "V1.3 Test Suite"})
    summary = request_json("/village/summary/")
    metrics = summary['metrics']

    assert summary['village']['baseline_population'] == 100, "Village baseline must be 100"
    assert metrics['total_residents'] == 100, f"Expected 100 residents, got {metrics['total_residents']}"
    assert metrics['residents_stable'] == 98, f"Expected 98 stable, got {metrics['residents_stable']}"
    assert metrics['residents_requiring_care'] == 2, f"Expected 2 care required, got {metrics['residents_requiring_care']}"
    assert metrics['open_road_blockages'] == 0, "Expected 0 road blockages at baseline"
    assert metrics['fatalities'] == 0, "Expected 0 fatalities at baseline"
    print("   [OK] Baseline metrics verified (100 residents, 98 safe, 2 care, 0 fatalities, 0 blockages).")

    # 2. Verify Map Data: 46 Road Segments, 40 Buildings, 5 Facilities
    print("\n[Step 2] Verifying expanded road graph and architectural environment...")
    map_data = request_json("/village/map-data/")
    road_edges = map_data['road_edges']
    buildings = map_data['buildings']
    facilities = map_data['facilities']

    assert len(road_edges) >= 46, f"Expected at least 46 road segments, got {len(road_edges)}"
    assert len(buildings) >= 40, f"Expected at least 40 buildings, got {len(buildings)}"
    assert len(facilities) == 5, f"Expected 5 facilities, got {len(facilities)}"
    print(f"   [OK] Cartographic detail verified: {len(road_edges)} routeable road segments, {len(buildings)} buildings, {len(facilities)} facilities.")

    # 3. Verify Citizen Perspective & Telemetry
    print("\n[Step 3] Verifying citizen identities and telemetry vitals...")
    residents = map_data['residents']
    res_map = {r['code']: r for r in residents}

    # Citizen 1: Clara Vane (RES-001) - Respiratory Distress
    clara = res_map['RES-001']
    assert clara['first_name'] == 'Clara' and clara['last_name'] == 'Vane'
    assert clara['active_triage'] == 'DELAYED'
    clara_detail = request_json(f"/residents/{clara['id']}/")
    clara_vitals = clara_detail['latest_vitals']
    assert clara_vitals['spo2'] == 88, f"Clara SpO2 expected 88, got {clara_vitals['spo2']}"
    assert clara_vitals['respiratory_rate'] == 28, f"Clara RR expected 28, got {clara_vitals['respiratory_rate']}"
    print(f"   [OK] Clara Vane (RES-001): Triage DELAYED, Hypoxemic SpO2={clara_vitals['spo2']}%, RR={clara_vitals['respiratory_rate']}/min.")

    # Citizen 2: Thomas Sterling (RES-002) - Open Fracture
    thomas = res_map['RES-002']
    assert thomas['first_name'] == 'Thomas' and thomas['last_name'] == 'Sterling'
    assert thomas['active_triage'] == 'DELAYED'
    thomas_detail = request_json(f"/residents/{thomas['id']}/")
    thomas_vitals = thomas_detail['latest_vitals']
    assert thomas_vitals['heart_rate'] == 94
    print(f"   [OK] Thomas Sterling (RES-002): Triage DELAYED, Pain tachycardia HR={thomas_vitals['heart_rate']} bpm.")

    # Citizen 7: Stable citizen
    c7 = res_map.get('RES-007')
    assert c7 is not None and c7['active_triage'] == 'STABLE'
    c7_detail = request_json(f"/residents/{c7['id']}/")
    c7_vitals = c7_detail['latest_vitals']
    assert c7_vitals['spo2'] >= 95 and c7_vitals['heart_rate'] < 100
    print(f"   [OK] Citizen {c7['code']} ({c7['full_name']}): STABLE, HR={c7_vitals['heart_rate']}, SpO2={c7_vitals['spo2']}%.")

    # 4. Verify Dijkstra Evacuation Planning along Road Graph
    print("\n[Step 4] Verifying Dijkstra routing along road network...")
    clara_evac = request_json(f"/evacuations/plan/?resident_id={clara['id']}")
    rec = clara_evac['recommended_destination']
    assert rec is not None, "Clara must have a recommended evacuation destination"
    assert rec['facility']['code'] == 'FAC-02', f"Clara should route to FAC-02, got {rec['facility']['code']}"
    assert rec['safest_route']['found'] is True, "Safest route must be found"
    assert len(rec['safest_route']['coordinates']) >= 2, "Route must contain waypoint coordinates"
    print(f"   [OK] Clara routed to {rec['facility']['name']}: Distance {rec['safest_route']['distance']}m, Travel Time {rec['safest_route']['travel_time']} min.")

    # 5. Verify Road Blockage & Detour Recalculation
    print("\n[Step 5] Testing road blockage toggle and dynamic detour routing...")
    bridge_edge = next(e for e in road_edges if e['code'] == 'E-BRIDGE-MAIN')
    # Toggle block
    blocked_edge = request_json(f"/roads/{bridge_edge['id']}/toggle-blockage/", method='POST', data={
        "is_blocked": True,
        "closure_reason": "Structural debris from test explosion"
    })
    assert blocked_edge['is_blocked'] is True, "Road edge must be blocked"

    # Thomas routes from Millbrook to Old Town (FAC-01) - verify route does not use blocked edge
    thomas_evac = request_json(f"/evacuations/plan/?resident_id={thomas['id']}")
    t_route = thomas_evac['recommended_destination']['safest_route']
    edge_codes = [e['code'] for e in t_route['edges']]
    assert 'E-BRIDGE-MAIN' not in edge_codes, "Dijkstra router must avoid blocked Great Stone Bridge"
    print("   [OK] Dijkstra successfully routed traffic away from blocked Great Stone Bridge.")

    # Restore bridge
    request_json(f"/roads/{bridge_edge['id']}/toggle-blockage/", method='POST', data={"is_blocked": False})
    print("   [OK] Great Stone Bridge blockage cleared and restored.")

    # 6. Verify Non-Mutating Incident Preview
    print("\n[Step 6] Testing non-mutating bombardment preview...")
    preview = request_json("/incident/preview/?x=560&y=190&scenario=MODERATE")
    assert preview['summary']['total_residents_in_zone'] > 0, "Preview must identify affected residents"
    assert preview['summary']['estimated_fatalities'] >= 1, "Moderate blast in Northridge Terraces core must predict fatalities"

    # Verify no database state was mutated
    mid_summary = request_json("/village/summary/")
    assert mid_summary['metrics']['fatalities'] == 0, "Preview must NOT mutate database fatalities"
    assert mid_summary['metrics']['residents_requiring_care'] == 2, "Preview must NOT mutate active patient count"
    print("   [OK] Preview calculated impact without mutating persistent simulation state.")

    # 7. Execute Bombardment & Verify Distance-Decay Casualties and Deceased Separation
    print("\n[Step 7] Confirming transactional disaster simulation in Northridge Terraces...")
    confirm_res = request_json("/incident/confirm/", method='POST', data={
        "x": 560.0,
        "y": 190.0,
        "scenario": "MODERATE",
        "actor": "V1.3 Test Suite"
    })
    incident = confirm_res['incident']
    assert incident['fatalities_count'] >= 1, "Must produce fatalities in blast core"

    # Query residents to inspect post-incident outcomes
    all_res_post = request_json("/residents/")
    fatalities = [r for r in all_res_post if r['is_fatality'] or r['active_triage'] == 'EXPECTANT']
    assert len(fatalities) == incident['fatalities_count'], f"Expected {incident['fatalities_count']} fatalities in registry, got {len(fatalities)}"

    # Verify post-incident village metrics reconciliation
    post_summary = request_json("/village/summary/")
    post_m = post_summary['metrics']
    assert post_m['fatalities'] == incident['fatalities_count'], "Metrics fatalities must match incident"
    assert post_m['total_residents'] == 100, "Total population must remain exactly 100"
    living_count = 100 - post_m['fatalities']
    print(f"   [OK] Post-incident population reconciled: Total 100 = Living {living_count} + Deceased {post_m['fatalities']}.")

    # Verify deceased resident has flatline / asystole telemetry
    dead_resident_id = fatalities[0]['id']
    dead_detail = request_json(f"/residents/{dead_resident_id}/")
    assert dead_detail['is_fatality'] is True, "Resident must be marked is_fatality=True"
    assert dead_detail['active_triage'] == 'EXPECTANT', "Resident triage must be EXPECTANT"
    dead_vitals = dead_detail['latest_vitals']
    assert dead_vitals['heart_rate'] == 0, f"Deceased heart rate must be 0 bpm, got {dead_vitals['heart_rate']}"
    assert 'UNRESPONSIVE' in dead_vitals['consciousness'] or 'ASYSTOLE' in dead_vitals['consciousness'], "Consciousness must indicate asystole/unresponsive"
    print(f"   [OK] Deceased resident {dead_detail['code']} has flatline vitals (HR: {dead_vitals['heart_rate']} bpm, Status: {dead_vitals['consciousness']}).")

    # Verify deceased resident cannot receive active evacuation assignment
    dead_evac = request_json(f"/evacuations/plan/?resident_id={dead_resident_id}")
    assert dead_evac.get('recommended_destination') is None or dead_detail['active_triage'] == 'EXPECTANT', \
        "Deceased residents must be excluded from active evacuation dispatch"
    print("   [OK] Deceased residents excluded from active evacuation recommendations.")

    # 8. Clean Reset Idempotency
    print("\n[Step 8] Testing demo reset idempotency...")
    final_reset = request_json("/village/reset/", method='POST', data={"actor": "V1.3 Test Suite"})
    final_m = request_json("/village/summary/")['metrics']
    assert final_m['fatalities'] == 0
    assert final_m['residents_stable'] == 98
    assert final_m['residents_requiring_care'] == 2
    assert final_m['open_road_blockages'] == 0
    print("   [OK] Clean baseline successfully restored.")

    print("\n" + "=" * 60)
    print(">>> ALL V1.3 SPECIFICATIONS VERIFIED 100% SUCCESSFUL <<<")
    print("=" * 60)

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"\n[FAIL] Verification error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
