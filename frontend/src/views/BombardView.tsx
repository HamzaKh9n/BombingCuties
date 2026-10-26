import React, { useState, useEffect } from 'react';
import {
  Flame,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  X,
  Crosshair,
  ArrowRight,
  ShieldAlert,
  Info
} from 'lucide-react';
import { MapData, IncidentPreview, Incident } from '../types';
import { api } from '../api/client';
import { Destination } from '../components/Sidebar';

interface BombardViewProps {
  mapData: MapData | null;
  onNavigate: (dest: Destination, params?: any) => void;
  onSimulationCommitted?: () => void;
}

export const BombardView: React.FC<BombardViewProps> = ({ mapData, onNavigate, onSimulationCommitted }) => {
  // Targeting coordinates (default center of Old Town Quarter)
  const [targetPos, setTargetPos] = useState<{ x: number; y: number }>({ x: 580.0, y: 420.0 });
  const [scenarioPreset, setScenarioPreset] = useState<'LOCALIZED' | 'MODERATE' | 'MAJOR'>('MODERATE');

  // Preview state
  const [preview, setPreview] = useState<IncidentPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Confirmation & Animation state
  const [isCommitting, setIsCommitting] = useState(false);
  const [animatingImpact, setAnimatingImpact] = useState(false);
  const [committedIncident, setCommittedIncident] = useState<Incident | null>(null);

  // Fetch preview whenever targetPos or scenarioPreset changes
  useEffect(() => {
    let isCancelled = false;

    const fetchPreview = async () => {
      setLoadingPreview(true);
      try {
        const res = await api.previewIncident(targetPos.x, targetPos.y, scenarioPreset);
        if (!isCancelled) {
          setPreview(res);
        }
      } catch (err) {
        console.error('Failed to preview incident:', err);
      } finally {
        if (!isCancelled) setLoadingPreview(false);
      }
    };

    fetchPreview();

    return () => {
      isCancelled = true;
    };
  }, [targetPos, scenarioPreset]);

  // Handle Map Click to Reposition Epicenter
  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    setTargetPos({ x: Math.round(svgP.x), y: Math.round(svgP.y) });
  };

  // Commit Simulated Disaster Event
  const handleConfirmIncident = async () => {
    setIsCommitting(true);
    setAnimatingImpact(true);

    try {
      // 1. Trigger visual impact animation on map
      setTimeout(async () => {
        try {
          const res = await api.confirmIncident(
            targetPos.x,
            targetPos.y,
            scenarioPreset,
            'Field Response Coordinator'
          );
          setCommittedIncident(res.incident);
          if (onSimulationCommitted) {
            onSimulationCommitted();
          }
        } finally {
          setIsCommitting(false);
          setAnimatingImpact(false);
        }
      }, 700);
    } catch (err) {
      console.error('Failed to commit incident:', err);
      setIsCommitting(false);
      setAnimatingImpact(false);
    }
  };

  const presetRadius = scenarioPreset === 'LOCALIZED' ? 90 : (scenarioPreset === 'MODERATE' ? 150 : 240);

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#F6F3EC' }}>
      {/* Left Control Panel: Presets, Coordinates, Impact Preview & Confirmation */}
      <div
        style={{
          width: 420,
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #D8D0C0',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10,
          boxShadow: '2px 0 10px rgba(0,0,0,0.04)',
          overflowY: 'auto',
        }}
      >
        {/* Simulation Mode Banner */}
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: '#FDF3E9',
            borderBottom: '1px solid #EAC8A9',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Flame size={20} color="#BD4E13" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#913807', letterSpacing: '0.04em' }}>
              SIMULATION MODE • BOMBARD
            </div>
            <div style={{ fontSize: 11, color: '#7E431E' }}>
              Fictional disaster stress test for emergency triage & logistics.
            </div>
          </div>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Fictional Disclaimer Notice */}
          <div
            style={{
              padding: 10,
              backgroundColor: '#FAF7F0',
              border: '1px solid #DFD6C5',
              borderRadius: 4,
              fontSize: 11,
              color: '#55615A',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              lineHeight: 1.4,
            }}
          >
            <Info size={15} color="#77847E" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              All events, locations, vitals, and casualties are <strong>entirely fictional</strong>. This module tests autonomous triage prioritization and detour routing algorithms under sudden facility surges.
            </span>
          </div>

          {/* Scenario Preset Selector */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#59655F', marginBottom: 8, display: 'block' }}>
              Select Scenario Preset
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {(['LOCALIZED', 'MODERATE', 'MAJOR'] as const).map((preset) => (
                <button
                  key={preset}
                  className={`btn btn-sm ${scenarioPreset === preset ? 'btn-warning' : ''}`}
                  onClick={() => setScenarioPreset(preset)}
                  style={{
                    padding: '8px 6px',
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: 'capitalize',
                  }}
                >
                  {preset.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Target Epicenter Selector Info */}
          <div style={{ padding: 12, backgroundColor: '#FAF8F3', border: '1px solid #DFD7C7', borderRadius: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#68746E' }}>
                Simulated Epicenter
              </span>
              <span className="mono" style={{ fontSize: 11, color: '#333' }}>
                X: {targetPos.x.toFixed(0)}, Y: {targetPos.y.toFixed(0)}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#53605A' }}>
              Click anywhere on the map to reposition the hypothetical blast coordinate.
            </div>
          </div>

          {/* Impact Preview Metrics Card */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#59655F' }}>
                Hypothetical Impact Preview
              </label>
              {loadingPreview && (
                <span style={{ fontSize: 11, color: '#C7781C' }}>Calculating model...</span>
              )}
            </div>

            {preview && (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D6CEBE',
                  borderRadius: 4,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, fontSize: 12 }}>
                  <div style={{ padding: 8, backgroundColor: '#FDF5E8', borderRadius: 3, border: '1px solid #F0CD9E' }}>
                    <span style={{ color: '#8F5413', fontSize: 11 }}>Residents Affected:</span>
                    <div className="num" style={{ fontSize: 18, fontWeight: 700, color: '#9E4E10', marginTop: 2 }}>
                      {preview.summary.total_residents_in_zone}
                    </div>
                  </div>

                  <div style={{ padding: 8, backgroundColor: '#FCECE9', borderRadius: 3, border: '1px solid #F2AEA3' }}>
                    <span style={{ color: '#9E2D1E', fontSize: 11 }}>Projected Critical / P1:</span>
                    <div className="num" style={{ fontSize: 18, fontWeight: 700, color: '#BD3423', marginTop: 2 }}>
                      {preview.summary.estimated_critical_immediate}
                    </div>
                  </div>

                  <div style={{ padding: 8, backgroundColor: '#FAF8F3', borderRadius: 3, border: '1px solid #DFD7C7' }}>
                    <span style={{ color: '#5F6C66', fontSize: 11 }}>Damaged Structures:</span>
                    <div className="num" style={{ fontSize: 16, fontWeight: 700, color: '#1A211E', marginTop: 2 }}>
                      {preview.summary.damaged_buildings_count} buildings
                    </div>
                  </div>

                  <div style={{ padding: 8, backgroundColor: '#FAF8F3', borderRadius: 3, border: '1px solid #DFD7C7' }}>
                    <span style={{ color: '#5F6C66', fontSize: 11 }}>Roads Compromised:</span>
                    <div className="num" style={{ fontSize: 16, fontWeight: 700, color: '#BD3423', marginTop: 2 }}>
                      {preview.summary.roads_blocked_count} blocked
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: '#7E8B85', lineHeight: 1.4, marginTop: 4 }}>
                  Estimated triage split: {preview.summary.estimated_critical_immediate} Immediate, {preview.summary.estimated_delayed_urgent} Delayed, {preview.summary.estimated_minimal} Minimal, {preview.summary.estimated_fatalities} Fatalities.
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons: Confirm & Cancel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            <button
              className="btn btn-warning"
              onClick={handleConfirmIncident}
              disabled={isCommitting}
              style={{ padding: '12px 18px', fontSize: 14, fontWeight: 700, letterSpacing: '0.02em', gap: 8 }}
            >
              <Flame size={17} />
              <span>{isCommitting ? 'Executing Simulation Transaction...' : 'Confirm Simulated Incident'}</span>
            </button>

            <button
              className="btn"
              onClick={() => onNavigate('overview')}
              disabled={isCommitting}
              style={{ fontSize: 12 }}
            >
              Cancel & Return to Overview
            </button>
          </div>
        </div>
      </div>

      {/* Right Map Canvas: Interactive Target Visualizer */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <svg
          viewBox="0 0 1200 800"
          onClick={handleMapClick}
          style={{ width: '100%', height: '100%', cursor: 'crosshair', display: 'block' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Base Map Terrain */}
          <rect width="1200" height="800" fill="#F8F6F1" />

          {/* Aster River */}
          <path
            d="M 0,268 C 220,288 340,346 500,326 C 660,306 780,366 920,406 C 1040,436 1120,416 1200,426
               L 1200,462 C 1120,452 1040,472 910,442 C 770,402 650,342 490,362 C 330,382 210,322 0,302 Z"
            fill="#7CA3B4"
          />

          {/* Road Network */}
          {mapData?.road_edges.map((edge) => {
            const coords = edge.coordinates;
            const pathD = coords && coords.length >= 2
              ? `M ${coords[0][0]},${coords[0][1]} L ${coords.slice(1).map((p) => `${p[0]},${p[1]}`).join(' ')}`
              : '';
            return (
              <path
                key={edge.id}
                d={pathD}
                stroke={edge.is_blocked ? '#BD3423' : '#D4CCBD'}
                strokeWidth={edge.road_type === 'PRIMARY' ? 6 : 4}
                strokeLinecap="round"
                fill="none"
              />
            );
          })}

          {/* Buildings */}
          {mapData?.buildings.map((bld) => (
            <rect
              key={bld.id}
              x={bld.x - bld.width / 2}
              y={bld.y - bld.height / 2}
              width={bld.width}
              height={bld.height}
              fill="#EFE7D8"
              stroke="#C4B9A4"
              strokeWidth="1"
              rx="2"
            />
          ))}

          {/* Facilities */}
          {mapData?.facilities.map((fac) => (
            <g key={fac.id}>
              <rect
                x={fac.x - 12}
                y={fac.y - 12}
                width="24"
                height="24"
                fill="#FFFFFF"
                stroke="#2A6642"
                strokeWidth="1.5"
                rx="3"
              />
              <rect x={fac.x - 2} y={fac.y - 7} width="4" height="14" fill="#2A6642" />
              <rect x={fac.x - 7} y={fac.y - 2} width="14" height="4" fill="#2A6642" />
            </g>
          ))}

          {/* Residents */}
          {mapData?.residents.map((res) => (
            <circle
              key={res.id}
              cx={res.x}
              cy={res.y}
              r="3.5"
              fill={res.is_fatality ? '#252A28' : (res.active_triage === 'STABLE' ? '#2A6642' : '#C7781C')}
              stroke="#FFFFFF"
              strokeWidth="1"
            />
          ))}

          {/* Targeting Crosshair and Impact Rings */}
          <g>
            {/* Outer Blast Radius */}
            <circle
              cx={targetPos.x}
              cy={targetPos.y}
              r={presetRadius}
              fill="rgba(199, 120, 28, 0.12)"
              stroke="#C7781C"
              strokeWidth="1.5"
              strokeDasharray="6,4"
            />

            {/* Core Crater Radius */}
            <circle
              cx={targetPos.x}
              cy={targetPos.y}
              r={presetRadius * 0.35}
              fill="rgba(189, 52, 35, 0.22)"
              stroke="#BD3423"
              strokeWidth="2"
            />

            {/* Animated Shockwave Pulse (when committing) */}
            {animatingImpact && (
              <circle
                cx={targetPos.x}
                cy={targetPos.y}
                r={presetRadius * 1.25}
                fill="none"
                stroke="#BD3423"
                strokeWidth="4"
                opacity="0.8"
              >
                <animate attributeName="r" from={presetRadius * 0.2} to={presetRadius * 1.4} dur="0.7s" repeatCount="1" />
                <animate attributeName="opacity" from="1" to="0" dur="0.7s" repeatCount="1" />
              </circle>
            )}

            {/* Targeting Reticle Lines */}
            <line
              x1={targetPos.x - 20}
              y1={targetPos.y}
              x2={targetPos.x + 20}
              y2={targetPos.y}
              stroke="#BD3423"
              strokeWidth="2"
            />
            <line
              x1={targetPos.x}
              y1={targetPos.y - 20}
              x2={targetPos.x}
              y2={targetPos.y + 20}
              stroke="#BD3423"
              strokeWidth="2"
            />
            <circle
              cx={targetPos.x}
              cy={targetPos.y}
              r="6"
              fill="none"
              stroke="#BD3423"
              strokeWidth="2"
            />
          </g>
        </svg>

        {/* Floating Instruction Pill */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(28, 33, 31, 0.85)',
            color: '#FFFFFF',
            padding: '8px 16px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          <Crosshair size={15} />
          <span>Click anywhere on the map to set the hypothetical epicenter</span>
        </div>
      </div>

      {/* Post-Incident Committed Summary Modal */}
      {committedIncident && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#BD3423', fontWeight: 700 }}>
                <ShieldAlert size={20} />
                <span>Simulated Incident Committed: {committedIncident.code}</span>
              </div>
              <button
                onClick={() => setCommittedIncident(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 13, color: '#333', lineHeight: 1.5 }}>
                The simulated event has propagated across all Aster Vale systems. Residents within the blast perimeter have suffered injuries, building structural damage states have updated, and road closures have been applied.
              </p>

              {/* Tally Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                <div style={{ padding: 10, backgroundColor: '#FAF8F3', border: '1px solid #DFD7C7', borderRadius: 4 }}>
                  <div style={{ fontSize: 11, color: '#666' }}>Casualties</div>
                  <div className="num" style={{ fontSize: 20, fontWeight: 700, color: '#BD3423', marginTop: 2 }}>
                    {committedIncident.casualties_count}
                  </div>
                </div>

                <div style={{ padding: 10, backgroundColor: '#FAF8F3', border: '1px solid #DFD7C7', borderRadius: 4 }}>
                  <div style={{ fontSize: 11, color: '#666' }}>Fatalities</div>
                  <div className="num" style={{ fontSize: 20, fontWeight: 700, color: '#111', marginTop: 2 }}>
                    {committedIncident.fatalities_count}
                  </div>
                </div>

                <div style={{ padding: 10, backgroundColor: '#FAF8F3', border: '1px solid #DFD7C7', borderRadius: 4 }}>
                  <div style={{ fontSize: 11, color: '#666' }}>Damaged Bldgs</div>
                  <div className="num" style={{ fontSize: 20, fontWeight: 700, color: '#333', marginTop: 2 }}>
                    {committedIncident.damaged_buildings_count}
                  </div>
                </div>

                <div style={{ padding: 10, backgroundColor: '#FAF8F3', border: '1px solid #DFD7C7', borderRadius: 4 }}>
                  <div style={{ fontSize: 11, color: '#666' }}>Blocked Roads</div>
                  <div className="num" style={{ fontSize: 20, fontWeight: 700, color: '#BD3423', marginTop: 2 }}>
                    {committedIncident.blocked_roads_count}
                  </div>
                </div>
              </div>

              <div style={{ padding: 10, backgroundColor: '#FAF8F3', border: '1px solid #E2DBD0', borderRadius: 4, fontSize: 12, color: '#4D5852' }}>
                Autonomous routing has generated prioritized evacuation recommendations for immediate and delayed casualties, accounting for newly blocked road segments.
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-sm"
                onClick={() => {
                  setCommittedIncident(null);
                  onNavigate('overview');
                }}
              >
                <span>Return to Overview</span>
              </button>
              <button
                className="btn btn-sm"
                onClick={() => {
                  setCommittedIncident(null);
                  onNavigate('patients');
                }}
              >
                <span>Inspect Casualties</span>
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => {
                  setCommittedIncident(null);
                  onNavigate('evacuation');
                }}
              >
                <span>Review Evacuation Routes</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
