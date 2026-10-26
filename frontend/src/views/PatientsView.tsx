import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Stethoscope,
  Activity,
  AlertCircle,
  X,
  Navigation,
  Shield,
  Clock,
  UserCheck,
  ShieldAlert
} from 'lucide-react';
import { Resident, TriageCategory, VitalObservation } from '../types';
import { TriageBadge } from '../components/TriageBadge';
import { VitalMonitor } from '../components/VitalMonitor';
import { api } from '../api/client';
import { Destination } from '../components/Sidebar';

interface PatientsViewProps {
  initialFilter?: string;
  selectedResidentId?: number | null;
  onNavigate: (dest: Destination, params?: any) => void;
  onRefreshSummary?: () => void;
}

export const PatientsView: React.FC<PatientsViewProps> = ({
  initialFilter,
  selectedResidentId: initialSelectedId,
  onNavigate,
  onRefreshSummary,
}) => {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'DECEASED'>(
    initialFilter === 'EXPECTANT' ? 'DECEASED' : 'ACTIVE'
  );
  const [triageFilter, setTriageFilter] = useState<string>(initialFilter || 'ALL');

  // Selected Resident Detail
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Manual Triage Override Modal State
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideTriage, setOverrideTriage] = useState<TriageCategory>('IMMEDIATE');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideActor, setOverrideActor] = useState('Dr. Elena Rostova');
  const [savingOverride, setSavingOverride] = useState(false);

  // Load residents list
  const loadResidents = async () => {
    setLoading(true);
    try {
      const data = await api.getResidents();
      setResidents(data);

      if (initialSelectedId) {
        loadResidentDetail(initialSelectedId);
      }
    } catch (err) {
      console.error('Failed to load residents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResidents();
  }, []);

  const loadResidentDetail = async (id: number) => {
    setLoadingDetail(true);
    try {
      const detail = await api.getResidentDetail(id);
      setSelectedResident(detail);
      setOverrideTriage(detail.active_triage);
    } catch (err) {
      console.error('Failed to load resident detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Living vs Deceased partitions
  const livingResidents = useMemo(() => residents.filter((r) => !r.is_fatality && r.active_triage !== 'EXPECTANT'), [residents]);
  const deceasedResidents = useMemo(() => residents.filter((r) => r.is_fatality || r.active_triage === 'EXPECTANT'), [residents]);

  // Strict sorting priority for Active / Living population:
  // 1. Critical (Immediate / P1)
  // 2. Serious (Delayed / P2)
  // 3. Minor (Minimal / P3)
  // 4. Stable (Safe)
  const priorityWeight: Record<TriageCategory, number> = {
    IMMEDIATE: 1,
    DELAYED: 2,
    MINIMAL: 3,
    STABLE: 4,
    EXPECTANT: 5,
  };

  const displayedResidents = useMemo(() => {
    const sourceList = activeTab === 'DECEASED' ? deceasedResidents : livingResidents;

    let list = sourceList.filter((r) => {
      if (activeTab === 'ACTIVE') {
        if (triageFilter === 'CARE_REQUIRED') {
          if (r.active_triage === 'STABLE') return false;
        } else if (triageFilter !== 'ALL') {
          if (r.active_triage !== triageFilter) return false;
        }
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          r.full_name.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          r.medical_condition.toLowerCase().includes(q) ||
          r.neighborhood_name.toLowerCase().includes(q)
        );
      }
      return true;
    });

    list.sort((a, b) => {
      const pA = priorityWeight[a.active_triage] || 99;
      const pB = priorityWeight[b.active_triage] || 99;
      if (pA !== pB) return pA - pB;
      return a.id - b.id;
    });

    return list;
  }, [activeTab, livingResidents, deceasedResidents, triageFilter, search]);

  // Submit Manual Triage Override
  const handleSaveOverride = async () => {
    if (!selectedResident) return;
    setSavingOverride(true);
    try {
      const updated = await api.overrideTriage(
        selectedResident.id,
        overrideTriage,
        overrideReason || 'Field clinical assessment override',
        overrideActor
      );
      setSelectedResident(updated);
      setShowOverrideModal(false);
      loadResidents();
      if (onRefreshSummary) onRefreshSummary();
    } catch (err) {
      console.error('Failed to override triage:', err);
    } finally {
      setSavingOverride(false);
    }
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#F8F6F1' }}>
      {/* Main Registry Table Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 24 }}>
        {/* Top Header & Search/Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1B221E', margin: 0 }}>
              Village Resident Registry & Clinical Triage
            </h2>
            <div style={{ fontSize: 12, color: '#68746E', marginTop: 2 }}>
              100 Total Registered Population • {livingResidents.length} Living Residents • {deceasedResidents.length} Deceased
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Search Box */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#FFFFFF',
                border: '1px solid #D6CEBE',
                borderRadius: 4,
                padding: '6px 10px',
              }}
            >
              <Search size={14} color="#77847E" />
              <input
                type="text"
                placeholder="Search name, code, condition..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: 12,
                  color: '#1A211E',
                  width: 200,
                  backgroundColor: 'transparent',
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Triage Filter Selector (for active tab) */}
            {activeTab === 'ACTIVE' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D6CEBE',
                  borderRadius: 4,
                  padding: '6px 10px',
                }}
              >
                <Filter size={13} color="#77847E" />
                <select
                  value={triageFilter}
                  onChange={(e) => setTriageFilter(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    fontSize: 12,
                    color: '#1A211E',
                    fontWeight: 600,
                    backgroundColor: 'transparent',
                  }}
                >
                  <option value="ALL">All Active ({livingResidents.length})</option>
                  <option value="CARE_REQUIRED">Care Required (P1-P3)</option>
                  <option value="IMMEDIATE">Critical / P1 (Red)</option>
                  <option value="DELAYED">Delayed / P2 (Yellow)</option>
                  <option value="MINIMAL">Minimal / P3 (Green)</option>
                  <option value="STABLE">Stable / Baseline Safe</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation: Explicit Separation of Active Population vs Deceased */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            className={`btn btn-sm ${activeTab === 'ACTIVE' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('ACTIVE')}
            style={{ padding: '6px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span>Active Living Population</span>
            <span
              style={{
                fontSize: 11,
                padding: '1px 6px',
                borderRadius: 10,
                backgroundColor: activeTab === 'ACTIVE' ? 'rgba(255,255,255,0.25)' : '#E2DBD0',
                color: activeTab === 'ACTIVE' ? '#FFFFFF' : '#444',
                fontWeight: 700,
              }}
            >
              {livingResidents.length}
            </span>
          </button>

          <button
            className={`btn btn-sm ${activeTab === 'DECEASED' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('DECEASED')}
            style={{
              padding: '6px 14px',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: activeTab === 'DECEASED' ? '#252A28' : '#FAF8F3',
              color: activeTab === 'DECEASED' ? '#FFFFFF' : '#444',
              borderColor: '#B8B09F',
            }}
          >
            <ShieldAlert size={13} color={activeTab === 'DECEASED' ? '#E85D4A' : '#77847E'} />
            <span>Deceased / Expectant Registry</span>
            <span
              style={{
                fontSize: 11,
                padding: '1px 6px',
                borderRadius: 10,
                backgroundColor: activeTab === 'DECEASED' ? '#3E4643' : '#E2DBD0',
                color: activeTab === 'DECEASED' ? '#FFFFFF' : '#444',
                fontWeight: 700,
              }}
            >
              {deceasedResidents.length}
            </span>
          </button>
        </div>

        {/* Resident Registry Table */}
        <div
          style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            border: '1px solid #D8D0C0',
            borderRadius: 4,
            overflowY: 'auto',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: '#FAF8F3', borderBottom: '1px solid #DFD7C7', color: '#68746E', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '10px 14px', width: 90 }}>Code</th>
                <th style={{ padding: '10px 14px' }}>Resident Name</th>
                <th style={{ padding: '10px 14px', width: 80 }}>Age/Sex</th>
                <th style={{ padding: '10px 14px' }}>Neighborhood</th>
                <th style={{ padding: '10px 14px', width: 130 }}>Triage Status</th>
                <th style={{ padding: '10px 14px' }}>Medical Condition</th>
                <th style={{ padding: '10px 14px' }}>Telemetry Vitals</th>
                <th style={{ padding: '10px 14px', width: 120 }}>Evacuation</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 30, textAlign: 'center', color: '#77847E' }}>
                    Loading patient database...
                  </td>
                </tr>
              ) : displayedResidents.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 30, textAlign: 'center', color: '#77847E' }}>
                    {activeTab === 'DECEASED' ? 'No deceased residents recorded. Village is at zero fatalities.' : 'No residents matching current filters.'}
                  </td>
                </tr>
              ) : (
                displayedResidents.map((res) => {
                  const isSelected = selectedResident?.id === res.id;
                  const vitals = res.latest_vitals;
                  const isDead = res.is_fatality || res.active_triage === 'EXPECTANT';

                  return (
                    <tr
                      key={res.id}
                      onClick={() => loadResidentDetail(res.id)}
                      style={{
                        borderBottom: '1px solid #F0ECE4',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? '#FAF5EB' : (isDead ? '#FBF9F9' : 'transparent'),
                        transition: 'background-color 0.1s ease',
                      }}
                    >
                      <td style={{ padding: '10px 14px' }}>
                        <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: '#6E7A74' }}>
                          {res.code}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: isDead ? '#444' : '#1A211E' }}>
                        {res.full_name} {isDead && <span style={{ fontSize: 10, color: '#BD3423', fontWeight: 700 }}>(DECEASED)</span>}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#57635D' }}>
                        {res.age}y / {res.gender[0]}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#57635D' }}>
                        {res.neighborhood_name}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <TriageBadge triage={res.active_triage} />
                      </td>
                      <td style={{ padding: '10px 14px', color: '#3A443F', maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {res.medical_condition}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12 }}>
                        {isDead ? (
                          <span className="mono" style={{ color: '#68746E', fontSize: 11, fontWeight: 600 }}>
                            ASYSTOLE (0 BPM)
                          </span>
                        ) : vitals ? (
                          <span className="mono" style={{ color: vitals.spo2 < 90 ? '#BD3423' : '#47534D' }}>
                            HR:{vitals.heart_rate} SpO2:{vitals.spo2}% BP:{vitals.blood_pressure}
                          </span>
                        ) : (
                          <span style={{ color: '#999' }}>None</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 11 }}>
                        {isDead ? (
                          <span style={{ fontWeight: 600, color: '#888' }}>
                            NON-EVACUABLE
                          </span>
                        ) : (
                          <span
                            style={{
                              fontWeight: 600,
                              color: res.evacuation_status === 'ARRIVED' ? '#2A6642' : (res.evacuation_status === 'IN_TRANSIT' ? '#C7781C' : '#5E6B65'),
                            }}
                          >
                            {res.evacuation_status}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-out Deep Clinical Record Inspector Panel */}
      {selectedResident && (
        <div
          style={{
            width: 440,
            backgroundColor: '#FFFFFF',
            borderLeft: '1px solid #D8D0C0',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: 20,
            gap: 16,
            boxShadow: '-2px 0 10px rgba(0,0,0,0.04)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: '#77847E' }}>
                  [{selectedResident.code}]
                </span>
                <TriageBadge triage={selectedResident.active_triage} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1A211E', marginTop: 4, margin: 0 }}>
                {selectedResident.full_name}
              </h3>
              <div style={{ fontSize: 12, color: '#68746E', marginTop: 2 }}>
                Age {selectedResident.age} • {selectedResident.gender} • {selectedResident.neighborhood_name}
              </div>
            </div>

            <button
              onClick={() => setSelectedResident(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Condition Details */}
          <div style={{ padding: 12, backgroundColor: '#FAF8F3', border: '1px solid #DFD7C7', borderRadius: 4, fontSize: 12 }}>
            <div style={{ fontWeight: 700, color: '#1A211E', marginBottom: 2 }}>Medical Presentation:</div>
            <div style={{ color: '#3A443F' }}>{selectedResident.medical_condition}</div>
            {selectedResident.medical_history && (
              <div style={{ marginTop: 6, color: '#63706A' }}>
                <strong>Medical History:</strong> {selectedResident.medical_history}
              </div>
            )}
          </div>

          {/* Real-time Dynamic Telemetry & ECG Waveform Monitor */}
          <VitalMonitor resident={selectedResident} vitals={selectedResident.latest_vitals} />

          {/* Triage Reasoning & Override Button */}
          <div style={{ padding: 12, backgroundColor: '#FAF8F3', border: '1px solid #DFD7C7', borderRadius: 4, fontSize: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontWeight: 700, color: '#1A211E' }}>Triage Reasoning:</span>
              {!selectedResident.is_fatality && selectedResident.active_triage !== 'EXPECTANT' && (
                <button
                  className="btn btn-sm"
                  onClick={() => setShowOverrideModal(true)}
                  style={{ fontSize: 11 }}
                >
                  <UserCheck size={12} />
                  <span>Manual Override</span>
                </button>
              )}
            </div>
            <div style={{ color: '#444', lineHeight: 1.4 }}>
              {selectedResident.simulated_priority_reason}
            </div>
            {selectedResident.manual_priority_override && (
              <div style={{ marginTop: 6, padding: '4px 8px', backgroundColor: '#FDF5E8', border: '1px solid #F0CD9E', borderRadius: 3, fontSize: 11, color: '#8F5413' }}>
                <strong>Manual Override Active:</strong> Changed by {selectedResident.manual_override_reason}
              </div>
            )}
          </div>

          {/* Destination & Evac Planning Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto', paddingTop: 10, borderTop: '1px solid #DFD7C7' }}>
            {!selectedResident.is_fatality && selectedResident.active_triage !== 'EXPECTANT' ? (
              <button
                className="btn btn-primary"
                onClick={() => onNavigate('evacuation', { residentId: selectedResident.id })}
                style={{ width: '100%', fontSize: 13, gap: 8 }}
              >
                <Navigation size={14} />
                <span>Calculate Evacuation Route</span>
              </button>
            ) : (
              <div style={{ padding: 10, backgroundColor: '#EAECEB', border: '1px solid #C4C9C6', borderRadius: 4, fontSize: 12, color: '#444', textAlign: 'center', fontWeight: 600 }}>
                Evacuation Transport Ineligible (Confirmed Deceased)
              </div>
            )}
            <button
              className="btn"
              onClick={() => onNavigate('map', { residentId: selectedResident.id })}
              style={{ width: '100%', fontSize: 12 }}
            >
              <span>Locate on Village Map</span>
            </button>
          </div>
        </div>
      )}

      {/* Manual Triage Override Modal */}
      {showOverrideModal && selectedResident && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div className="modal-header">
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                Manual Triage Override: {selectedResident.full_name}
              </div>
              <button
                onClick={() => setShowOverrideModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#444', display: 'block', marginBottom: 4 }}>
                  Assigned Triage Category:
                </label>
                <select
                  value={overrideTriage}
                  onChange={(e) => setOverrideTriage(e.target.value as TriageCategory)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 4,
                    border: '1px solid #D6CEBE',
                    fontSize: 13,
                  }}
                >
                  <option value="IMMEDIATE">Immediate (Red - Critical / Resuscitation)</option>
                  <option value="DELAYED">Delayed (Yellow - Serious / Hospitalization)</option>
                  <option value="MINIMAL">Minimal (Green - Walking Wounded)</option>
                  <option value="STABLE">Stable (Verified Safe In Place)</option>
                  <option value="EXPECTANT">Expectant (Non-survivable)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#444', display: 'block', marginBottom: 4 }}>
                  Clinical Justification / Reason:
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Clinical rationale for reassignment..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 4,
                    border: '1px solid #D6CEBE',
                    fontSize: 12,
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#444', display: 'block', marginBottom: 4 }}>
                  Clinician / Officer In Charge:
                </label>
                <input
                  type="text"
                  value={overrideActor}
                  onChange={(e) => setOverrideActor(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 4,
                    border: '1px solid #D6CEBE',
                    fontSize: 12,
                  }}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn" onClick={() => setShowOverrideModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveOverride}
                disabled={savingOverride}
              >
                {savingOverride ? 'Recording...' : 'Commit Triage Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
