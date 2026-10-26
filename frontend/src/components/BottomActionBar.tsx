import React from 'react';
import { Navigation, Activity, Users, Flame } from 'lucide-react';
import { Resident, VillageSummary } from '../types';

interface BottomActionBarProps {
  activeCitizen: Resident | null;
  summary: VillageSummary | null;
  onOpenMyRoute: () => void;
  onOpenCheckVitals: () => void;
  onOpenAllVillagers: () => void;
  onOpenBombard: () => void;
  isBombardmentActive: boolean;
}

export const BottomActionBar: React.FC<BottomActionBarProps> = ({
  activeCitizen,
  summary,
  onOpenMyRoute,
  onOpenCheckVitals,
  onOpenAllVillagers,
  onOpenBombard,
  isBombardmentActive,
}) => {
  const needsEvac = activeCitizen && activeCitizen.active_triage !== 'STABLE' && !activeCitizen.is_fatality;
  const criticalCount = summary?.metrics?.critical_residents || 0;
  const careCount = summary?.metrics?.residents_requiring_care || 0;

  return (
    <nav
      className={`bottom-action-bar ${isBombardmentActive ? 'hidden-during-impact' : ''}`}
      aria-label="Citizen Quick Actions"
    >
      {/* 1. My Route */}
      <button
        className={`bottom-action-btn ${needsEvac ? 'active' : ''}`}
        onClick={onOpenMyRoute}
        title="View your evacuation route & destination facility"
      >
        <Navigation size={15} color={needsEvac ? '#BD3423' : '#47534E'} />
        <span>My Route</span>
        {needsEvac && (
          <span className="bottom-action-badge danger">
            Evacuate
          </span>
        )}
      </button>

      {/* 2. Check Vitals */}
      <button
        className="bottom-action-btn"
        onClick={onOpenCheckVitals}
        title="Check your simulated vital signs and triage category"
      >
        <Activity size={15} color="#47534E" />
        <span>Check Vitals</span>
      </button>

      <div style={{ width: 1, height: 18, backgroundColor: 'var(--border-medium)', margin: '0 2px' }} />

      {/* 3. All Villagers */}
      <button
        className="bottom-action-btn"
        onClick={onOpenAllVillagers}
        title="Browse all villagers prioritized by medical urgency"
      >
        <Users size={15} color="#47534E" />
        <span>All Villagers</span>
        {careCount > 0 && (
          <span className={`bottom-action-badge ${criticalCount > 0 ? 'danger' : 'warning'}`}>
            {careCount}
          </span>
        )}
      </button>

      {/* 4. Bombard (Modal Action) */}
      <button
        className="bottom-action-btn bombard-action"
        onClick={onOpenBombard}
        title="Launch simulated bombardment incident modal"
      >
        <Flame size={15} />
        <span>Bombard</span>
      </button>
    </nav>
  );
};
