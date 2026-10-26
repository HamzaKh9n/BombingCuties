import React from 'react';
import { Activity, X, Heart, Wind, Gauge, Eye, Clock, Info } from 'lucide-react';
import { Resident } from '../types';
import { TriageBadge } from './TriageBadge';
import { VitalMonitor } from './VitalMonitor';

interface CheckVitalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCitizen: Resident | null;
}

export const CheckVitalsModal: React.FC<CheckVitalsModalProps> = ({
  isOpen,
  onClose,
  activeCitizen,
}) => {
  if (!isOpen || !activeCitizen) return null;

  const vitals = activeCitizen.latest_vitals;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={18} color="#C7781C" />
            <span style={{ fontWeight: 700, fontSize: 14 }}>
              Simulated Telemetry • {activeCitizen.full_name} ({activeCitizen.code})
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
          {/* Header Strip */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#FAF8F3', border: '1px solid #DFD7C7', borderRadius: 4 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1C211F' }}>
                {activeCitizen.medical_condition}
              </div>
              <div style={{ fontSize: 11, color: '#77847E', marginTop: 1 }}>
                Age {activeCitizen.age} • {activeCitizen.gender} • {activeCitizen.neighborhood_name}
              </div>
            </div>
            <TriageBadge triage={activeCitizen.active_triage} />
          </div>

          {/* Live Waveform & Physiological Monitor */}
          <VitalMonitor resident={activeCitizen} vitals={vitals} />

          {/* Triage Rationale */}
          <div style={{ padding: 10, backgroundColor: '#FAF8F3', border: '1px solid #DFD7C7', borderRadius: 4, fontSize: 12 }}>
            <span style={{ fontWeight: 700, color: '#1C211F' }}>Clinical Triage Reason: </span>
            <span style={{ color: '#4F5B55' }}>{activeCitizen.simulated_priority_reason}</span>
          </div>

          {/* Source & Simulated Disclaimer */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, color: '#77847E', lineHeight: 1.4 }}>
            <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Source: <em>{vitals?.source_label || 'Baseline Health Survey'}</em> • Recorded at {vitals ? new Date(vitals.recorded_at).toLocaleTimeString() : 'Baseline'}.
              <br />
              <strong>Disclaimer:</strong> Fictional telemetry for simulation demonstration. Does not represent actual clinical equipment.
            </span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
