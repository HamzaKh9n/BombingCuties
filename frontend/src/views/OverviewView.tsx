import React from 'react';
import {
  MapPin,
  Flame,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Navigation,
  Activity,
  User,
  Hospital
} from 'lucide-react';
import { VillageSummary, Resident } from '../types';
import { VillageProfileArt } from '../components/VillageProfileArt';
import { TriageBadge } from '../components/TriageBadge';
import { Destination } from '../components/Sidebar';

interface OverviewViewProps {
  summary: VillageSummary | null;
  activeCitizen: Resident | null;
  onNavigate: (dest: Destination, extraParams?: any) => void;
  onOpenMyRoute: () => void;
  onOpenCheckVitals: () => void;
  onOpenBombard: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  summary,
  activeCitizen,
  onNavigate,
  onOpenMyRoute,
  onOpenCheckVitals,
  onOpenBombard,
}) => {
  if (!summary) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>
        Loading village telemetry...
      </div>
    );
  }

  const { village, metrics, recent_incidents } = summary;
  const isDisaster = village.status === 'DISASTER_RESPONSE';
  const hasActiveIncidents = recent_incidents && recent_incidents.length > 0;

  // Active citizen state
  const isCitizenSafe = activeCitizen ? activeCitizen.active_triage === 'STABLE' : true;
  const isCitizenFatal = activeCitizen ? activeCitizen.is_fatality || activeCitizen.active_triage === 'EXPECTANT' : false;
  const isCitizenInjured = activeCitizen && !isCitizenSafe && !isCitizenFatal;

  return (
    <div className="page-bottom-padding" style={{ padding: '24px 32px', maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* 1. Header: Village Identity & Illustrated Profile Graphic */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#728078' }}>
              Autonomous Settlement
            </div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 700, letterSpacing: '0.02em', color: '#1B221E', margin: 0 }}>
              {village.name.toUpperCase()}
            </h1>
          </div>

          {/* Clean Primary Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-primary"
              onClick={() => onNavigate('map')}
              style={{ padding: '8px 16px', fontSize: 13 }}
            >
              <MapPin size={15} />
              <span>Explore Village Map</span>
            </button>

            <button
              className="btn btn-warning"
              onClick={onOpenBombard}
              style={{ padding: '8px 16px', fontSize: 13 }}
            >
              <Flame size={15} />
              <span>Simulate Incident</span>
            </button>
          </div>
        </div>

        {/* Small Illustrated Village Scene Graphic */}
        <VillageProfileArt />
      </div>

      {/* 2. CITIZEN-FIRST STATUS CARD (Primary Focus) */}
      {activeCitizen && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: isCitizenInjured ? '1.5px solid #C7781C' : (isCitizenFatal ? '1.5px solid #252A28' : '1px solid #D6CEBE'),
            borderRadius: 6,
            padding: 20,
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#6F7B75',
                    letterSpacing: '0.04em',
                  }}
                >
                  <User size={13} color="#2A6642" />
                  Your Citizen Perspective
                </span>
                <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: '#77847E' }}>
                  [{activeCitizen.code}]
                </span>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1A211E', margin: '4px 0 0 0' }}>
                {activeCitizen.full_name}
              </h2>
              <div style={{ fontSize: 12, color: '#68746E', marginTop: 2 }}>
                Sheltered in <strong>{activeCitizen.neighborhood_name}</strong> {activeCitizen.building_name ? `(${activeCitizen.building_name})` : ''} • Age {activeCitizen.age}
              </div>
            </div>

            <TriageBadge triage={activeCitizen.active_triage} />
          </div>

          {/* Citizen Condition & Evacuation Recommendation Banner */}
          {isCitizenSafe ? (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#E7F2EB',
                border: '1px solid #B8DCBF',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle size={20} color="#2A6642" style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ fontSize: 13, color: '#2A6642' }}>You are safe in place.</strong>
                  <div style={{ fontSize: 12, color: '#3E5C4B', marginTop: 1 }}>
                    Normal physiological baseline. No evacuation transport is required for your sector.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-sm"
                  onClick={onOpenCheckVitals}
                  style={{ fontSize: 12 }}
                >
                  <Activity size={13} />
                  <span>Check Vitals</span>
                </button>
              </div>
            </div>
          ) : isCitizenFatal ? (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#EAECEB',
                border: '1px solid #C4C9C6',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <AlertTriangle size={20} color="#252A28" />
              <div>
                <strong style={{ fontSize: 13, color: '#252A28' }}>Deceased from direct blast impact</strong>
                <div style={{ fontSize: 12, color: '#555' }}>
                  Fatal overpressure trauma in the incident core. Evacuation is cancelled.
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#FDF5E8',
                border: '1.5px solid #F0CD9E',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertTriangle size={20} color="#C7781C" style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ fontSize: 13, color: '#9E4E10' }}>
                    Medical Attention Required: {activeCitizen.medical_condition}
                  </strong>
                  <div style={{ fontSize: 12, color: '#734114', marginTop: 1 }}>
                    {activeCitizen.assigned_facility_name
                      ? `Recommended facility: ${activeCitizen.assigned_facility_name}. Safest route is open.`
                      : 'Calculating optimal reachable medical facility...'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={onOpenMyRoute}
                  style={{ fontSize: 12 }}
                >
                  <Navigation size={13} />
                  <span>Open My Evacuation Route</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Village Hazard & Disaster Alert Indicator (if any incident active) */}
      {hasActiveIncidents && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#FDF6EE',
            border: '1px solid #EAC8A9',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldAlert size={18} color="#BD3423" />
            <div>
              <strong style={{ fontSize: 13, color: '#913807' }}>
                Disaster Event Active: {recent_incidents[0].preset_title}
              </strong>
              <div style={{ fontSize: 12, color: '#66442A' }}>
                Impact tally: <strong>{metrics.residents_requiring_care} residents requiring care</strong> ({metrics.critical_residents} critical), <strong>{metrics.open_road_blockages} road blockages</strong>.
              </div>
            </div>
          </div>

          <button
            className="btn btn-sm"
            onClick={() => onNavigate('map', { layer: 'hazards' })}
            style={{ fontSize: 11 }}
          >
            <span>Inspect Hazard Zones</span>
            <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* 4. Secondary Compact Settlement Context Strip (Subtle, non-dominating) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          padding: '14px 16px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #DFD7C7',
          borderRadius: 4,
          fontSize: 12,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: '#77847E', fontSize: 11, fontWeight: 600 }}>Medical Facilities:</span>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1C211F', marginTop: 2 }}>
            5 Facilities ({metrics.available_beds} beds free / {metrics.total_beds})
          </div>
          <span style={{ fontSize: 11, color: '#88948E' }}>St. Jude, Hospital, Urgent Care, Clinic, Dispensary</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: '#77847E', fontSize: 11, fontWeight: 600 }}>Road Network:</span>
          <div style={{ fontSize: 13, fontWeight: 600, color: metrics.open_road_blockages > 0 ? '#BD3423' : '#2A6642', marginTop: 2 }}>
            {metrics.open_road_blockages === 0 ? 'All 46 road segments open & clear' : `${metrics.open_road_blockages} blocked roads (detours active)`}
          </div>
          <span style={{ fontSize: 11, color: '#88948E' }}>2 River Bridges (Great Stone & Timber)</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: '#77847E', fontSize: 11, fontWeight: 600 }}>Village Status:</span>
          <div style={{ fontSize: 13, fontWeight: 600, color: isDisaster ? '#BD3423' : '#2A6642', marginTop: 2 }}>
            {isDisaster ? 'Emergency Response Active' : 'Stable Village Baseline'}
          </div>
          <span style={{ fontSize: 11, color: '#88948E' }}>
            {metrics.total_incidents === 0 ? 'Baseline resting state' : `${metrics.total_incidents} incident(s) recorded`}
          </span>
        </div>
      </div>
    </div>
  );
};
