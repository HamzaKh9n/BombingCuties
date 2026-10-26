import React, { useState, useEffect } from 'react';
import {
  Navigation,
  GitBranch,
  ShieldAlert,
  Clock,
  MapPin,
  Truck,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import {
  Resident, MedicalFacility, EvacuationAssignment, EvacuationPlan,
  Vehicle, Responder, RouteData, FacilityEvaluation
} from '../types';
import { api } from '../api/client';
import { Destination } from '../components/Sidebar';

interface EvacuationViewProps {
  initialResidentId?: number | null;
  onNavigate: (dest: Destination, params?: any) => void;
  onSelectResident?: (residentId: number) => void;
  onRefreshSummary?: () => void;
}

export const EvacuationView: React.FC<EvacuationViewProps> = ({
  initialResidentId,
  onNavigate,
  onSelectResident,
  onRefreshSummary,
}) => {
  const [careResidents, setCareResidents] = useState<Resident[]>([]);
  const [selectedResidentId, setSelectedResidentId] = useState<number | null>(initialResidentId || null);
  const [plan, setPlan] = useState<EvacuationPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  // Active assignments list
  const [assignments, setAssignments] = useState<EvacuationAssignment[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Dispatch Assignment Form State
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [selectedResponderId, setSelectedResponderId] = useState<number | null>(null);
  const [dispatchStatus, setDispatchStatus] = useState<string>('ASSIGNED');
  const [committingDispatch, setCommittingDispatch] = useState(false);

  // Load Care Residents, Responders, Vehicles, and Assignments
  useEffect(() => {
    const initData = async () => {
      try {
        const [allRes, evacs, units] = await Promise.all([
          api.getResidents({ triage: 'CARE_REQUIRED' }),
          api.getEvacuations(),
          api.getRespondersVehicles(),
        ]);
        setCareResidents(allRes);
        setAssignments(evacs);
        setResponders(units.responders);
        setVehicles(units.vehicles);

        // Pick first resident if none selected
        if (!selectedResidentId && allRes.length > 0) {
          setSelectedResidentId(allRes[0].id);
        }
      } catch (err) {
        console.error('Failed to load evacuation data:', err);
      }
    };

    initData();
  }, []);

  // Recalculate plan when selectedResidentId or selectedFacilityId changes
  useEffect(() => {
    if (!selectedResidentId) return;

    const computePlan = async () => {
      setLoadingPlan(true);
      try {
        const res = await api.planEvacuation(selectedResidentId, selectedFacilityId || undefined);
        setPlan(res);
        if (res.recommended_destination && !selectedFacilityId) {
          setSelectedFacilityId(res.recommended_destination.facility.id);
        }
      } catch (err) {
        console.error('Failed to plan evacuation:', err);
      } finally {
        setLoadingPlan(false);
      }
    };

    computePlan();
  }, [selectedResidentId, selectedFacilityId]);

  // Handle Commit Dispatch / Status Update
  const handleCommitDispatch = async () => {
    if (!selectedResidentId || !selectedFacilityId) return;
    setCommittingDispatch(true);

    try {
      await api.assignEvacuation({
        resident_id: selectedResidentId,
        facility_id: selectedFacilityId,
        vehicle_id: selectedVehicleId || undefined,
        responder_id: selectedResponderId || undefined,
        status: dispatchStatus,
        actor: 'Emergency Logistics Dispatcher',
      });

      // Refresh assignments
      const updated = await api.getEvacuations();
      setAssignments(updated);
      if (onRefreshSummary) onRefreshSummary();
    } catch (err) {
      console.error('Failed to dispatch evacuation:', err);
    } finally {
      setCommittingDispatch(false);
    }
  };

  const currentResident = careResidents.find((r) => r.id === selectedResidentId);
  const recommendedDest = plan?.recommended_destination;
  const safestRt = recommendedDest?.safest_route;
  const shortestRt = recommendedDest?.shortest_route;

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#F8F6F1' }}>
      {/* Left Column: Patient Selector & Active Evac Assignments Queue */}
      <div
        style={{
          width: 340,
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #D8D0C0',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          padding: 16,
          gap: 16,
        }}
      >
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A211E', margin: 0 }}>
            Evacuation Queue
          </h3>
          <div style={{ fontSize: 11, color: '#77847E', marginTop: 2 }}>
            Residents flagged for medical transport ({careResidents.length})
          </div>
        </div>

        {/* Care Residents List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {careResidents.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: '#7E8B85', backgroundColor: '#FAF8F3', borderRadius: 4, fontSize: 12 }}>
              No residents currently require evacuation transport.
            </div>
          ) : (
            careResidents.map((r) => {
              const isSelected = r.id === selectedResidentId;
              return (
                <div
                  key={r.id}
                  onClick={() => {
                    setSelectedResidentId(r.id);
                    setSelectedFacilityId(null);
                  }}
                  style={{
                    padding: 10,
                    backgroundColor: isSelected ? '#FAF5EB' : '#FAF8F3',
                    border: isSelected ? '1.5px solid #1A211E' : '1px solid #DFD7C7',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 13, color: '#1A211E' }}>{r.full_name}</strong>
                    <span className="mono" style={{ fontSize: 10, color: '#77847E' }}>[{r.code}]</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#596560', marginTop: 3 }}>
                    {r.medical_condition}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11 }}>
                    <span style={{ color: '#888' }}>{r.neighborhood_name}</span>
                    <span style={{ fontWeight: 600, color: r.evacuation_status === 'ARRIVED' ? '#2A6642' : '#C7781C' }}>
                      {r.evacuation_status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Existing Persisted Assignments List */}
        <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #DFD7C7' }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#68746E', marginBottom: 8 }}>
            Active Missions ({assignments.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {assignments.slice(0, 4).map((assign) => (
              <div
                key={assign.id}
                style={{
                  padding: 8,
                  backgroundColor: '#FAF8F3',
                  border: '1px solid #E2DBD0',
                  borderRadius: 3,
                  fontSize: 11,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <span>{assign.resident_name}</span>
                  <span style={{ color: assign.status === 'ARRIVED' ? '#2A6642' : '#C7781C' }}>
                    {assign.status}
                  </span>
                </div>
                <div style={{ color: '#666', marginTop: 2 }}>
                  To: {assign.facility_name} • {assign.estimated_travel_time} min ({assign.estimated_distance}m)
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Center & Right: Routing Intelligence & Dijkstra Safest vs Shortest Route Inspector */}
      <div style={{ flex: 1, padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {currentResident && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: '#77847E' }}>
                [{currentResident.code}]
              </span>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1B221E', margin: 0 }}>
                Autonomous Route Analysis: {currentResident.full_name}
              </h2>
            </div>
            <div style={{ fontSize: 12, color: '#68746E', marginTop: 4 }}>
              Current Triage: <strong>{currentResident.active_triage}</strong> • Condition: <strong>{currentResident.medical_condition}</strong>
            </div>
          </div>
        )}

        {/* Graph Routing Comparison Card */}
        {loadingPlan ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#77847E', backgroundColor: '#FFFFFF', borderRadius: 4 }}>
            Computing Dijkstra graph search & hazard-avoidance heuristics...
          </div>
        ) : recommendedDest ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Clinical & Capacity Evaluation Header */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #D8D0C0',
                borderRadius: 4,
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#2A6642' }}>
                    Recommended Destination Facility
                  </span>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1A211E', marginTop: 2 }}>
                    {recommendedDest.facility.name}
                  </h3>
                  <div style={{ fontSize: 12, color: '#68746E', marginTop: 2 }}>
                    Suitability Score: <strong>{recommendedDest.suitability_score}</strong> • Remaining Beds: <strong>{recommendedDest.facility.available_capacity} free</strong>
                  </div>
                </div>

                {/* Candidate Facility Dropdown Switcher */}
                {plan && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: '#666' }}>Target Facility:</span>
                    <select
                      value={selectedFacilityId || ''}
                      onChange={(e) => setSelectedFacilityId(Number(e.target.value))}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 4,
                        border: '1px solid #D6CEBE',
                        fontSize: 12,
                        backgroundColor: '#FAF8F3',
                      }}
                    >
                      {plan.all_facility_evaluations.map((evalItem) => (
                        <option key={evalItem.facility.id} value={evalItem.facility.id}>
                          {evalItem.facility.name} ({evalItem.facility.available_capacity} beds {evalItem.is_reachable ? '' : '• INACCESSIBLE'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 10, padding: 10, backgroundColor: '#FAF8F3', border: '1px solid #E2DBD0', borderRadius: 3, fontSize: 12, color: '#444' }}>
                <strong>Algorithm Rationale: </strong>
                {recommendedDest.clinical_rationale}
              </div>
            </div>

            {/* Dijkstra Route Comparison: Safest Route vs Shortest Route */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              {/* Safest Route Card */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #2A6642',
                  borderRadius: 4,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#2A6642', fontWeight: 700, fontSize: 13 }}>
                    <CheckCircle size={16} />
                    <span>RECOMMENDED: Safest Route (Hazard-Penalized)</span>
                  </div>
                </div>

                {safestRt && safestRt.found ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: 10, backgroundColor: '#FAF8F3', borderRadius: 3 }}>
                      <div>
                        <span style={{ fontSize: 11, color: '#77847E' }}>Distance:</span>
                        <div className="num" style={{ fontSize: 15, fontWeight: 700 }}>{safestRt.distance} m</div>
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: '#77847E' }}>Transit Time:</span>
                        <div className="num" style={{ fontSize: 15, fontWeight: 700 }}>{safestRt.travel_time} min</div>
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: '#77847E' }}>Junctions:</span>
                        <div className="num" style={{ fontSize: 15, fontWeight: 700 }}>{safestRt.nodes.length} nodes</div>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: '#4F5B55', lineHeight: 1.4 }}>
                      {safestRt.explanation}
                    </div>

                    {safestRt.warnings.length > 0 && (
                      <div style={{ padding: 8, backgroundColor: '#FDF5E8', border: '1px solid #F0CD9E', borderRadius: 3, fontSize: 11, color: '#8F5413' }}>
                        {safestRt.warnings.map((w, idx) => (
                          <div key={idx}>⚠️ {w}</div>
                        ))}
                      </div>
                    )}

                    {/* Nodes traversed */}
                    <div style={{ fontSize: 11, color: '#77847E' }}>
                      <strong>Waypoints:</strong> {safestRt.nodes.map((n) => n.name).join(' → ')}
                    </div>
                  </>
                ) : (
                  <div style={{ color: '#BD3423', fontSize: 12 }}>
                    No accessible safe route found. All connecting paths obstructed by disaster debris.
                  </div>
                )}
              </div>

              {/* Shortest Route Card */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D8D0C0',
                  borderRadius: 4,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#55615B', fontWeight: 700, fontSize: 13 }}>
                  <GitBranch size={16} />
                  <span>Shortest Route (Pure Distance)</span>
                </div>

                {shortestRt && shortestRt.found ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: 10, backgroundColor: '#FAF8F3', borderRadius: 3 }}>
                      <div>
                        <span style={{ fontSize: 11, color: '#77847E' }}>Distance:</span>
                        <div className="num" style={{ fontSize: 15, fontWeight: 700 }}>{shortestRt.distance} m</div>
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: '#77847E' }}>Transit Time:</span>
                        <div className="num" style={{ fontSize: 15, fontWeight: 700 }}>{shortestRt.travel_time} min</div>
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: '#77847E' }}>Junctions:</span>
                        <div className="num" style={{ fontSize: 15, fontWeight: 700 }}>{shortestRt.nodes.length} nodes</div>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: '#4F5B55', lineHeight: 1.4 }}>
                      {shortestRt.explanation}
                    </div>

                    {shortestRt.distance === safestRt?.distance ? (
                      <div style={{ fontSize: 11, color: '#2A6642' }}>
                        ✓ The shortest route is also the safest route (no hazard detours necessary).
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: '#BD3423' }}>
                        ⚠️ Shortest route traverses closer to hazard zones. Safest route adds {Math.round((safestRt?.distance || 0) - shortestRt.distance)}m to ensure patient safety.
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ color: '#BD3423', fontSize: 12 }}>
                    Shortest route blocked by road closures.
                  </div>
                )}
              </div>
            </div>

            {/* Dispatch Unit Assignment Workflow Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #D8D0C0',
                borderRadius: 4,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1A211E', margin: 0 }}>
                Commit Evacuation Assignment & Dispatch Unit
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {/* Vehicle Selector */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>
                    Emergency Vehicle:
                  </label>
                  <select
                    value={selectedVehicleId || ''}
                    onChange={(e) => setSelectedVehicleId(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid #D6CEBE', fontSize: 12 }}
                  >
                    <option value="">Select Available Vehicle</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.callsign})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Responder Selector */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>
                    Assigned Responder:
                  </label>
                  <select
                    value={selectedResponderId || ''}
                    onChange={(e) => setSelectedResponderId(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid #D6CEBE', fontSize: 12 }}
                  >
                    <option value="">Select Lead Responder</option>
                    {responders.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.role_display})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Transition */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>
                    Evacuation Status:
                  </label>
                  <select
                    value={dispatchStatus}
                    onChange={(e) => setDispatchStatus(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid #D6CEBE', fontSize: 12 }}
                  >
                    <option value="ASSIGNED">Assigned (Unit En Route to Patient)</option>
                    <option value="IN_TRANSIT">In Transit (Transporting to Facility)</option>
                    <option value="ARRIVED">Arrived (Admitted to Facility)</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  className="btn btn-primary"
                  onClick={handleCommitDispatch}
                  disabled={committingDispatch}
                  style={{ fontSize: 13 }}
                >
                  <Truck size={14} />
                  <span>{committingDispatch ? 'Saving Assignment...' : 'Save & Dispatch Evacuation Assignment'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: '#7E8B85' }}>
            Select a resident from the queue to calculate routes.
          </div>
        )}
      </div>
    </div>
  );
};
