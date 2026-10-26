import React, { useState } from 'react';
import { User, ChevronDown, Check, ShieldCheck, AlertCircle } from 'lucide-react';
import { Resident } from '../types';

interface CitizenSwitcherProps {
  activeCitizen: Resident | null;
  allResidents: Resident[];
  onSelectCitizen: (residentId: number) => void;
}

export const CitizenSwitcher: React.FC<CitizenSwitcherProps> = ({
  activeCitizen,
  allResidents,
  onSelectCitizen,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');

  if (!activeCitizen) return null;

  const isSafe = activeCitizen.active_triage === 'STABLE';
  const isFatal = activeCitizen.is_fatality || activeCitizen.active_triage === 'EXPECTANT';

  // Highlight specific quick presets for demonstration testing
  const presetResidents = allResidents.filter((r) =>
    ['RES-007', 'RES-001', 'RES-002'].includes(r.code)
  );

  const filteredResidents = allResidents.filter((r) => {
    if (!filterSearch.trim()) return true;
    const q = filterSearch.toLowerCase();
    return (
      (r.full_name || '').toLowerCase().includes(q) ||
      (r.code || '').toLowerCase().includes(q) ||
      (r.neighborhood_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '4px 9px',
          borderRadius: 4,
          border: '1px solid #D8D0C0',
          backgroundColor: '#FAF8F3',
          cursor: 'pointer',
          color: '#1C211F',
          fontSize: 12,
          fontWeight: 500,
          fontFamily: 'var(--font-sans)',
        }}
        title="Switch persistent citizen perspective"
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: isFatal ? '#252A28' : (isSafe ? '#2A6642' : '#C7781C'),
          }}
        />
        <span style={{ color: '#6A7670', fontSize: 11 }}>I am:</span>
        <strong style={{ fontSize: 12 }}>
          {activeCitizen.full_name} ({activeCitizen.code})
        </strong>
        <ChevronDown size={13} color="#666" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close */}
          <div
            onClick={() => setIsOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 110 }}
          />

          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 5px)',
              right: 0,
              width: 320,
              maxHeight: 400,
              backgroundColor: '#FFFFFF',
              border: '1px solid #D0C7B7',
              borderRadius: 6,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              zIndex: 120,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #E5DFD2', backgroundColor: '#FAF8F3' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#6F7B75', letterSpacing: '0.04em' }}>
                Select Citizen Perspective
              </div>
              <div style={{ fontSize: 11, color: '#88948E', marginTop: 2 }}>
                Explore Aster Vale through the eyes of an individual resident.
              </div>
            </div>

            {/* Quick Test Presets */}
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #EFEAE0', backgroundColor: '#FDFCF9' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#8B9791', textTransform: 'uppercase', marginBottom: 6 }}>
                Demo Personas:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {presetResidents.map((pr) => (
                  <button
                    key={pr.id}
                    onClick={() => {
                      onSelectCitizen(pr.id);
                      setIsOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 8px',
                      borderRadius: 3,
                      border: pr.id === activeCitizen.id ? '1px solid #2A6642' : '1px solid #E5DFD2',
                      backgroundColor: pr.id === activeCitizen.id ? '#E7F2EB' : '#FFFFFF',
                      fontSize: 11,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div>
                      <strong>{pr.full_name}</strong> <span className="mono">({pr.code})</span>
                      <div style={{ fontSize: 10, color: '#666' }}>
                        {pr.code === 'RES-007' ? 'Healthy resident in Old Town' : pr.medical_condition}
                      </div>
                    </div>
                    {pr.id === activeCitizen.id && <Check size={13} color="#2A6642" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input for All 100 Residents */}
            <div style={{ padding: '6px 12px', borderBottom: '1px solid #E5DFD2' }}>
              <input
                type="text"
                placeholder="Search all 100 residents..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '5px 8px',
                  borderRadius: 4,
                  border: '1px solid #D6CEBE',
                  fontSize: 11,
                  outline: 'none',
                }}
              />
            </div>

            {/* Scrollable list */}
            <div style={{ overflowY: 'auto', flex: 1, maxHeight: 220, padding: 4 }}>
              {filteredResidents.map((r) => {
                const isCur = r.id === activeCitizen.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => {
                      onSelectCitizen(r.id);
                      setIsOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      borderRadius: 3,
                      cursor: 'pointer',
                      backgroundColor: isCur ? '#FAF5EB' : 'transparent',
                      fontSize: 11,
                    }}
                  >
                    <div>
                      <strong style={{ color: '#1C211F' }}>{r.full_name}</strong>{' '}
                      <span className="mono" style={{ color: '#77847E', fontSize: 10 }}>[{r.code}]</span>
                      <div style={{ fontSize: 10, color: '#6A7670' }}>
                        {r.neighborhood_name} • {r.active_triage}
                      </div>
                    </div>
                    {isCur && <Check size={13} color="#1C211F" />}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
