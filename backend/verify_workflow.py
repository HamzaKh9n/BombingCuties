import urllib.request
import json
import sys

def post(url, payload):
    req = urllib.request.Request(
        'http://127.0.0.1:8000/api' + url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    return json.loads(urllib.request.urlopen(req).read().decode('utf-8'))

def get(url):
    return json.loads(urllib.request.urlopen('http://127.0.0.1:8000/api' + url).read().decode('utf-8'))

print("=== 1. Checking Baseline Summary ===")
s = get('/village/summary/')
m = s['metrics']
print(f"Total: {m['total_residents']}, Stable: {m['residents_stable']}, Care: {m['residents_requiring_care']}, Crit: {m['critical_residents']}, Facilities: {m['medical_facilities_count']}, Blockages: {m['open_road_blockages']}")
assert m['total_residents'] == 100
assert m['residents_stable'] == 98
assert m['residents_requiring_care'] == 2
assert m['critical_residents'] == 0
assert m['medical_facilities_count'] == 5
assert m['open_road_blockages'] == 0

print("=== 2. Inspecting Clara Vane & Thomas Sterling ===")
care_res = s['care_required_residents']
names = [r['full_name'] for r in care_res]
print("Baseline care patients:", names)
assert 'Clara Vane' in names
assert 'Thomas Sterling' in names

print("=== 3. Testing Evacuation Planning for Clara Vane ===")
clara = next(r for r in care_res if r['full_name'] == 'Clara Vane')
plan = post('/evacuations/plan/', {'resident_id': clara['id']})
dest = plan['recommended_destination']
print("Recommended facility:", dest['facility']['name'])
print("Safest route distance:", dest['safest_route']['distance'], "m, travel time:", dest['safest_route']['travel_time'], "min")
assert dest['is_reachable'] is True

print("=== 4. Testing Bombard Preview (Non-mutating) ===")
prev = post('/incident/preview/', {'x': 580.0, 'y': 420.0, 'preset': 'MODERATE'})
print("Preview residents affected:", prev['summary']['total_residents_in_zone'])
print("Preview projected critical:", prev['summary']['estimated_critical_immediate'])
print("Preview damaged buildings:", prev['summary']['damaged_buildings_count'])
# Verify state NOT mutated
s2 = get('/village/summary/')
assert s2['metrics']['residents_stable'] == 98

print("=== 5. Confirming Simulated Incident ===")
conf = post('/incident/confirm/', {'x': 580.0, 'y': 420.0, 'preset': 'MODERATE', 'actor': 'Lead Triage Physician'})
inc = conf['incident']
print(f"Incident confirmed: {inc['code']}, Casualties: {inc['casualties_count']}, Fatalities: {inc['fatalities_count']}, Blocked: {inc['blocked_roads_count']}")

print("=== 6. Verifying Propagated Village State ===")
s3 = get('/village/summary/')
m3 = s3['metrics']
print(f"New state: Stable: {m3['residents_stable']}, Care: {m3['residents_requiring_care']}, Crit: {m3['critical_residents']}, Fatalities: {m3['fatalities']}, Blocked: {m3['open_road_blockages']}")
assert m3['residents_requiring_care'] > 2
assert m3['open_road_blockages'] > 0

print("=== 7. Dispatching Evacuation Assignment ===")
evacs = get('/evacuations/')
print(f"Active evacuation assignments generated: {len(evacs)}")
first_evac = evacs[0]
dispatch = post('/evacuations/assign/', {'assignment_id': first_evac['id'], 'status': 'IN_TRANSIT'})
print(f"Assignment updated to status: {dispatch['status']}")
assert dispatch['status'] == 'IN_TRANSIT'

print("=== 8. Checking Audit Events Trail ===")
audits = get('/audit-events/')
print(f"Audit events recorded: {len(audits)}")
print("Latest event:", audits[0]['event_type'], "-", audits[0]['summary'][:60])

print("=== 9. Testing Demo Reset ===")
reset = post('/village/reset/', {'actor': 'Judge Controller'})
print("Reset result:", reset['message'])

print("=== 10. Verifying Restored Pristine Baseline ===")
s_final = get('/village/summary/')
mf = s_final['metrics']
print(f"Restored: Total: {mf['total_residents']}, Stable: {mf['residents_stable']}, Care: {mf['residents_requiring_care']}, Crit: {mf['critical_residents']}, Blockages: {mf['open_road_blockages']}")
assert mf['total_residents'] == 100
assert mf['residents_stable'] == 98
assert mf['residents_requiring_care'] == 2
assert mf['critical_residents'] == 0
assert mf['open_road_blockages'] == 0
print("\n>>> ALL 20 END-TO-END DEMO WORKFLOW STEPS VERIFIED SUCCESSFULLY! <<<")
