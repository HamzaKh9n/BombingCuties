import React, { useState, useMemo } from 'react';
import { Users, X, Search, Filter, MapPin, Stethoscope, ChevronRight, ShieldAlert } from 'lucide-react';
import { Resident, TriageCategory } from '../types';
import { TriageBadge } from './TriageBadge';
import { VitalMonitor } from './VitalMonitor';

interface AllVillagersModalProps {
  isOpen: boolean;
  onClose: () => void;
  allResidents: Resident[];
  activeCitizenId: number;
  onSelectResidentToInspect: (residentId: number) => void;
  onViewOnMap: (residentId: number) => void;
}

export const AllVillagersModal: React.FC<AllVillagersModalProps> = ({
  isOpen,
  onClose,
  allResidents,
  activeCitizenId,
  onSelectResidentToInspect,
  onViewOnMap,
}) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'DECEASED'>('ACTIVE');
  const [filter, setFilter] = useState<string>('ALL');
  const [inspectedResident, setInspectedResident] = useState<Resident | null>(null);

  if (!isOpen) return null;

  // Living vs Deceased partitions
  const livingResidents = useMemo(() => allResidents.filter((r) => !r.is_fatality && r.active_triage !== 'EXPECTANT'), [allResidents]);
  const deceasedResidents = useMemo(() => allResidents.filter((r) => r.is_fatality || r.active_triage === 'EXPECTANT'), [allResidents]);

  // STRICT ORDERING PER SPECIFICATION:
  // 1. Critical (Immediate / P1)
  // 2. Serious injuries (Delayed / P2)
  // 3. Other requiring medical attention (Minimal / P3)
  // 4. Stable residents
  const priorityWeight: Record<TriageCategory, number> = {
    IMMEDIATE: 1,
    DELAYED: 2,
    MINIMAL: 3,
    STABLE: 4,
    EXPECTANT: 5,
  };

  const sortedAndFiltered = useMemo(() => {
    const sourceList = activeTab === 'DECEASED' ? deceasedResidents : livingResidents;
    let list = [...sourceList];

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.full_name.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          r.medical_condition.toLowerCase().includes(q) ||
          r.neighborhood_name.toLowerCase().includes(q)
      );
    }

    // Filter by triage (for active living tab)
    if (activeTab === 'ACTIVE') {
      if (filter === 'CARE_REQUIRED') {
        list = list.filter((r) => r.active_triage !== 'STABLE');
      } else if (filter !== 'ALL') {
        list = list.filter((r) => r.active_triage === filter);
      }
    }

    // Sort strictly: priority weight first, then resident ID
    list.sort((a, b) => {
      const pA = priorityWeight[a.active_triage] || 99;
      const pB = priorityWeight[b.active_triage] || 99;
      if (pA !== pB) return pA - pB;
      return a.id - b.id;
    });

    return list;
  }, [activeTab, livingResidents, deceasedResidents, search, filter]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 880, height: '85vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} color="#1C211F" />
            <span style={{ fontWeight: 700, fontSize: 15 }}>
              Aster Vale Population Registry ({allResidents.length} Registered Villagers)
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Category Tabs: Explicit Separation of Living and Deceased */}
        <div style={{ padding: '8px 16px', backgroundColor: '#FAF8F3', borderBottom: '1px solid #E5DFD2', display: 'flex', gap: 8 }}>
          <button
            className={`btn btn-sm ${activeTab === 'ACTIVE' ? 'btn-primary' : ''}`}
            onClick={() => { setActiveTab('ACTIVE'); setInspectedResident(null); }}
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span>Living Residents</span>
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
            onClick={() => { setActiveTab('DECEASED'); setInspectedResident(null); }}
            style={{
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
            <span>Deceased / Fatalities</span>
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

        {/* Filter & Search Bar */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #E5DFD2', backgroundColor: '#FFFFFF', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#FAF8F3', border: '1px solid #D6CEBE', borderRadius: 4, padding: '4px 10px', flex: 1, minWidth: 200 }}>
            <Search size={14} color="#77847E" />
            <input
              type="text"
              placeholder="Search by name, ID, condition, or neighborhood..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, color: '#1C211F', width: '100%' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
                <X size={12} />
              </button>
            )}
          </div>

          {activeTab === 'ACTIVE' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Filter size={13} color="#77847E" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4, border: '1px solid #D6CEBE', backgroundColor: '#FAF8F3', fontWeight: 600 }}
              >
                <option value="ALL">All Living ({livingResidents.length})</option>
                <option value="CARE_REQUIRED">Care Required (P1-P3)</option>
                <option value="IMMEDIATE">Critical (Immediate / P1)</option>
                <option value="DELAYED">Serious (Delayed / P2)</option>
                <option value="MINIMAL">Minor (Minimal / P3)</option>
                <option value="STABLE">Stable (Verified Safe)</option>
              </select>
            </div>
          )}
        </div>

        {/* Body Split: List on Left, Selected Detail on Right */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* List Area */}
          <div style={{ flex: 1, overflowY: 'auto', borderRight: inspectedResident ? '1px solid #E5DFD2' : 'none' }}>
            <div style={{ padding: '8px 14px', fontSize: 11, color: '#77847E', backgroundColor: '#FDFCF9', borderBottom: '1px solid #EFEAE0' }}>
              {activeTab === 'ACTIVE'
                ? 'Ordered by Priority: Critical (P1) → Serious (P2) → Minor (P3) → Stable.'
                : 'Deceased Registry: Non-survivable blast casualties (Pulseless / Asystole).'}
            </div>

            {sortedAndFiltered.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#77847E', fontSize: 13 }}>
                {activeTab === 'DECEASED' ? 'No deceased villagers recorded. Aster Vale has zero casualties.' : 'No villagers matching filter criteria.'}
              </div>
            ) : (
              sortedAndFiltered.map((res) => {
                const isMe = res.id === activeCitizenId;
                const isSelected = inspectedResident?.id === res.id;
                const isDead = res.is_fatality || res.active_triage === 'EXPECTANT';

                return (
                  <div
                    key={res.id}
                    onClick={() => setInspectedResident(res)}
                    style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid #F0ECE4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#FAF3E7' : (isMe ? '#F3F8F4' : '#FFFFFF'),
                      transition: 'background-color 0.1s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: '#77847E', width: 62 }}>
                        {res.code}
                      </span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <strong style={{ fontSize: 13, color: isDead ? '#444' : '#1A211E' }}>{res.full_name}</strong>
                          {isDead && (
                            <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 5px', borderRadius: 3, backgroundColor: '#252A28', color: '#FFFFFF' }}>
                              DECEASED
                            </span>
                          )}
                          {isMe && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3, backgroundColor: '#E7F2EB', color: '#2A6642', border: '1px solid #B8DCBF' }}>
                              YOU
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: '#5F6B66' }}>
                          {res.neighborhood_name} • {res.medical_condition}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TriageBadge triage={res.active_triage} />
                      <ChevronRight size={14} color="#999" />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Inspected Detail Area (If selected) */}
          {inspectedResident && (
            <div style={{ width: 360, backgroundColor: '#FAF8F3', padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span className="mono" style={{ fontSize: 11, color: '#77847E' }}>[{inspectedResident.code}]</span>
                  <h4 style={{ fontSize: 16, fontWeight: 700, color: '#1A211E', marginTop: 2 }}>
                    {inspectedResident.full_name}
                  </h4>
                  <div style={{ fontSize: 11, color: '#66736D' }}>
                    Age {inspectedResident.age} • {inspectedResident.gender} • {inspectedResident.neighborhood_name}
                  </div>
                </div>
                <TriageBadge triage={inspectedResident.active_triage} />
              </div>

              {/* Dynamic Waveform Telemetry Monitor */}
              <VitalMonitor resident={inspectedResident} compact />

              <div style={{ padding: 10, backgroundColor: '#FFFFFF', border: '1px solid #E2DBD0', borderRadius: 4, fontSize: 12 }}>
                <strong>Condition:</strong>
                <div style={{ color: '#444', marginTop: 2 }}>{inspectedResident.medical_condition}</div>
              </div>

              <div style={{ padding: 10, backgroundColor: '#FFFFFF', border: '1px solid #E2DBD0', borderRadius: 4, fontSize: 12 }}>
                <strong>Triage Rationale:</strong>
                <div style={{ color: '#444', marginTop: 2 }}>{inspectedResident.simulated_priority_reason}</div>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    onClose();
                    onViewOnMap(inspectedResident.id);
                  }}
                  style={{ width: '100%', fontSize: 12 }}
                >
                  <MapPin size={13} />
                  <span>Locate on Village Map</span>
                </button>
              </div>
            </div>
          )}
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
