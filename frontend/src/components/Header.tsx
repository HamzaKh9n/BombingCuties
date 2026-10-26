import React, { useState, useEffect } from 'react';
import { RotateCcw, Activity, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { VillageSummary, Resident } from '../types';
import { CitizenSwitcher } from './CitizenSwitcher';

interface HeaderProps {
  summary: VillageSummary | null;
  activeCitizen: Resident | null;
  allResidents: Resident[];
  onSelectCitizen: (residentId: number) => void;
  onResetClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  summary,
  activeCitizen,
  allResidents,
  onSelectCitizen,
  onResetClick,
}) => {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(
        d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isDisaster = summary?.village?.status === 'DISASTER_RESPONSE';
  const careCount = summary?.metrics?.residents_requiring_care || 0;
  const criticalCount = summary?.metrics?.critical_residents || 0;

  return (
    <header className="app-topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: '#1A201E',
            }}
          >
            BOMBING CUTIES
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 600,
              color: '#7E8A84',
              letterSpacing: '0.02em',
            }}
          >
            V1.4
          </span>
        </div>

        <div style={{ height: 18, width: 1, backgroundColor: '#DDD6C9' }} />

        {/* Village Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#3A4440', letterSpacing: '0.03em' }}>
            ASTER VALE
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 7px',
              borderRadius: 3,
              backgroundColor: isDisaster ? '#FCECE9' : '#E7F2EB',
              color: isDisaster ? '#BD3423' : '#2A6642',
              border: `1px solid ${isDisaster ? '#F3B4AA' : '#B8DCBF'}`,
            }}
          >
            {isDisaster ? <ShieldAlert size={12} /> : <CheckCircle2 size={12} />}
            {isDisaster ? 'DISASTER ACTIVE' : 'STABLE BASELINE'}
          </span>
        </div>
      </div>

      {/* Right controls: Citizen switcher + Quick Stats + Reset Demo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Persistent Citizen Identity Switcher */}
        <CitizenSwitcher
          activeCitizen={activeCitizen}
          allResidents={allResidents}
          onSelectCitizen={onSelectCitizen}
        />

        <div style={{ height: 16, width: 1, backgroundColor: '#DDD6C9' }} />

        {/* Live Simulation Clock */}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#6A7771' }}>
          <span className="num">{timeStr || '12:00:00'}</span>
        </div>

        {/* Reset Demo button */}
        <button
          className="btn btn-sm"
          onClick={onResetClick}
          title="Restore baseline village state (100 residents, 98 safe, 2 care, 0 blockages)"
          style={{ borderColor: '#D3C9B8' }}
        >
          <RotateCcw size={13} />
          <span>Reset Demo</span>
        </button>
      </div>
    </header>
  );
};
