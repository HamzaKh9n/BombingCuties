import React, { useState, useEffect } from 'react';
import { Navigation, X, MapPin, CheckCircle, AlertTriangle, ArrowRight, Clock, Shield } from 'lucide-react';
import { Resident, EvacuationPlan } from '../types';
import { api } from '../api/client';
import { TriageBadge } from './TriageBadge';

interface MyRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCitizen: Resident | null;
  onViewOnMap: (residentId: number) => void;
}

export const MyRouteModal: React.FC<MyRouteModalProps> = ({
  isOpen,
  onClose,
  activeCitizen,
  onViewOnMap,
}) => {
  const [plan, setPlan] = useState<EvacuationPlan | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !activeCitizen) return;

    const fetchRoute = async () => {
      setLoading(true);
      try {
        const res = await api.planEvacuation(activeCitizen.id);
        setPlan(res);
      } catch (err) {
        console.error('Failed to calculate citizen route:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [isOpen, activeCitizen]);

  if (!isOpen || !activeCitizen) return null;

  const isSafe = activeCitizen.active_triage === 'STABLE';
  const isFatal = activeCitizen.is_fatality || activeCitizen.active_triage === 'EXPECTANT';
  const recommendedDest = plan?.recommended_destination;
  const safestRt = recommendedDest?.safest_route;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Navigation size={18} color="#2A6642" />
            <span style={{ fontWeight: 700, fontSize: 14 }}>
              My Evacuation Corridor • {activeCitizen.full_name}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Citizen Status Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#FAF8F3', border: '1px solid #DFD7C7', borderRadius: 4 }}>
            <div>
              <div style={{ fontSize: 11, color: '#6F7B75' }}>
                Citizen <strong>{activeCitizen.code}</strong> • {activeCitizen.neighborhood_name} ({activeCitizen.building_name || 'Sheltered'})
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1C211F', marginTop: 2 }}>
                {activeCitizen.medical_condition}
              </div>
            </div>
            <TriageBadge triage={activeCitizen.active_triage} />
          </div>

          {/* If Citizen is Safe */}
          {isSafe ? (
            <div style={{ padding: 18, textAlign: 'center', backgroundColor: '#E7F2EB', border: '1px solid #B8DCBF', borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={28} color="#2A6642" />
              <div style={{ fontSize: 15, fontWeight: 700, color: '#2A6642' }}>
                You are currently in a Verified Safe State
              </div>
              <p style={{ fontSize: 12, color: '#3B5947', margin: 0, lineHeight: 1.5, maxWidth: 420 }}>
                No emergency medical evacuation is currently recommended. You are sheltered in <strong>{activeCitizen.neighborhood_name}</strong>. If a simulated bombardment or hazard affects your sector, your safest route will automatically compute below.
              </p>
            </div>
          ) : isFatal ? (
            <div style={{ padding: 16, backgroundColor: '#EAECEB', border: '1px solid #C4C9C6', borderRadius: 4, color: '#252A28' }}>
              <strong>Status: Expectant / Deceased</strong>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                This citizen was exposed to non-survivable blast overpressure in the incident core. Evacuation transport is cancelled.
              </div>
            </div>
          ) : (
            /* If Citizen Needs Evacuation */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {loading ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>
                  Evaluating open road network & facility capacities...
                </div>
              ) : recommendedDest && safestRt && safestRt.found ? (
                <>
                  <div style={{ padding: 14, backgroundColor: '#FAF8F3', border: '1.5px solid #2A6642', borderRadius: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#2A6642', textTransform: 'uppercase' }}>
                          Recommended Facility
                        </div>
                        <h4 style={{ fontSize: 16, fontWeight: 700, color: '#1A211E', marginTop: 2 }}>
                          {recommendedDest.facility.name}
                        </h4>
                        <div style={{ fontSize: 11, color: '#6B7771' }}>
                          {recommendedDest.facility.neighborhood_name} • {recommendedDest.facility.available_capacity} beds free
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#1A211E' }} className="num">
                          {safestRt.travel_time} min
                        </div>
                        <div style={{ fontSize: 11, color: '#77847E' }}>{safestRt.distance} meters</div>
                      </div>
                    </div>

                    <div style={{ marginTop: 10, fontSize: 12, color: '#444', lineHeight: 1.4 }}>
                      <strong>Routing Explanation: </strong>
                      {safestRt.explanation}
                    </div>

                    {safestRt.warnings.length > 0 && (
                      <div style={{ marginTop: 8, padding: 8, backgroundColor: '#FDF5E8', border: '1px solid #F0CD9E', borderRadius: 3, fontSize: 11, color: '#8F5413' }}>
                        {safestRt.warnings.map((w, i) => (
                          <div key={i}>⚠️ {w}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Waypoints */}
                  <div style={{ fontSize: 11, color: '#77847E' }}>
                    <strong>Navigation Waypoints: </strong>
                    {safestRt.nodes.map((n) => n.name).join(' → ')}
                  </div>
                </>
              ) : (
                <div style={{ padding: 16, backgroundColor: '#FCECE9', border: '1px solid #F3B4AA', borderRadius: 4, color: '#BD3423' }}>
                  <strong>No Accessible Safe Route Found</strong>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    All roadways between your position in {activeCitizen.neighborhood_name} and village medical clinics are obstructed by structural debris or blast craters. Shelter in place until emergency logistics clears a corridor.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-sm" onClick={onClose}>
            Close
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => {
              onClose();
              onViewOnMap(activeCitizen.id);
            }}
          >
            <MapPin size={13} />
            <span>View on Village Map</span>
          </button>
        </div>
      </div>
    </div>
  );
};
