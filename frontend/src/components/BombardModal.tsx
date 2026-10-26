import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  X,
  Crosshair,
  AlertTriangle,
  Info,
  ShieldAlert,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { MapData, IncidentPreview, Incident } from '../types';
import { api } from '../api/client';

interface BombardModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapData: MapData | null;
  onIncidentCommitted: (affectedIds?: number[]) => void;
  onImpactStateChange?: (isImpacting: boolean) => void;
}

type SimulationState = 'selecting' | 'previewing' | 'confirming' | 'impacting' | 'revealing' | 'error';

export const BombardModal: React.FC<BombardModalProps> = ({
  isOpen,
  onClose,
  mapData,
  onIncidentCommitted,
  onImpactStateChange,
}) => {
  // Targeting coordinates
  const [targetPos, setTargetPos] = useState<{ x: number; y: number }>({ x: 580, y: 420 });
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [scenarioPreset, setScenarioPreset] = useState<'LOCALIZED' | 'MODERATE' | 'MAJOR'>('MODERATE');

  // Preview & Simulation State Machine
  const [simState, setSimState] = useState<SimulationState>('selecting');
  const [preview, setPreview] = useState<IncidentPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [committedIncident, setCommittedIncident] = useState<Incident | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const isRequestInFlight = useRef(false);

  // Keyboard Escape support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (simState === 'selecting' || simState === 'previewing') {
          onClose();
        }
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, simState, onClose]);

  // Recalculate preview when targetPos or scenarioPreset changes
  useEffect(() => {
    if (!isOpen || simState === 'impacting' || simState === 'revealing') return;

    let isCancelled = false;
    const fetchPreview = async () => {
      setLoadingPreview(true);
      try {
        const res = await api.previewIncident(targetPos.x, targetPos.y, scenarioPreset);
        if (!isCancelled) {
          setPreview(res);
          setSimState('previewing');
        }
      } catch (err: any) {
        console.error('Failed to preview incident:', err);
      } finally {
        if (!isCancelled) setLoadingPreview(false);
      }
    };

    fetchPreview();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, targetPos, scenarioPreset]);

  // Translate pointer client coordinates to exact SVG map coordinates
  const getMapCoordinates = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return { x: 580, y: 420 };
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return {
      x: Math.max(20, Math.min(1180, Math.round(svgP.x))),
      y: Math.max(20, Math.min(780, Math.round(svgP.y))),
    };
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (simState === 'impacting' || simState === 'revealing') return;
    const coords = getMapCoordinates(e);
    setCursorPos(coords);
  };

  const handleSvgMouseLeave = () => {
    setCursorPos(null);
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (simState === 'impacting' || simState === 'revealing' || isRequestInFlight.current) return;
    const coords = getMapCoordinates(e);
    setTargetPos(coords);
  };

  // Phase B & C & D: Cinematic Impact Sequence
  const handleConfirmIncident = async () => {
    if (isRequestInFlight.current) return;
    isRequestInFlight.current = true;

    setSimState('impacting');
    if (onImpactStateChange) onImpactStateChange(true);
    setErrorMessage(null);

    try {
      // Execute the backend transactional simulation
      const resultPromise = api.confirmIncident(
        targetPos.x,
        targetPos.y,
        scenarioPreset,
        'Simulation Controller'
      );

      // Allow 800ms for cinematic impact trajectory & pulse animation to play
      const [incidentRes] = await Promise.all([
        resultPromise,
        new Promise((resolve) => setTimeout(resolve, 850)),
      ]);

      setCommittedIncident(incidentRes.incident);
      setSimState('revealing');
      const affected = incidentRes.resident_outcomes?.map((r: any) => r.resident_id) || [];
      onIncidentCommitted(affected);
    } catch (err: any) {
      console.error('Simulation execution failed:', err);
      setErrorMessage(err.message || 'Failed to commit simulated incident.');
      setSimState('error');
    } finally {
      isRequestInFlight.current = false;
      if (onImpactStateChange) onImpactStateChange(false);
    }
  };

  if (!isOpen || !mapData) return null;

  const presetRadius = scenarioPreset === 'LOCALIZED' ? 90 : (scenarioPreset === 'MODERATE' ? 150 : 240);
  const isCinematicLocked = simState === 'impacting';

  return (
    <div
      className={`modal-backdrop ${isCinematicLocked ? 'animate-screen-shake' : ''}`}
      onClick={() => {
        if (simState !== 'impacting' && simState !== 'revealing') {
          onClose();
        }
      }}
      style={{
        backgroundColor: isCinematicLocked ? 'rgba(15, 18, 16, 0.78)' : 'rgba(28, 33, 31, 0.55)',
        backdropFilter: 'blur(5px)',
        zIndex: 200,
        padding: 16,
        transition: 'background-color 0.4s ease',
      }}
    >
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '94vw',
          maxWidth: 1280,
          height: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#F8F6F1',
          border: '1.5px solid #C4BAA6',
          borderRadius: 8,
          boxShadow: '0 16px 48px rgba(0,0,0,0.22)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Modal Top Header */}
        <div
          style={{
            padding: '10px 18px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #D8D0C0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                backgroundColor: '#FDF3E9',
                border: '1px solid #EAC8A9',
                color: '#BD4E13',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 3,
                letterSpacing: '0.04em',
              }}
            >
              <Flame size={13} />
              SIMULATION MODE
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1C211F' }}>
              Aster Vale Fictional Disaster & Consequence Test
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, color: '#77847E' }}>
              All events & casualties are fictional
            </span>
            {simState !== 'impacting' && simState !== 'revealing' && (
              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Modal Workspace Split: Map on Left/Center, Controls & Preview on Right */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
          {/* Main Interactive Map Viewport */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#FAF8F3' }}>
            <svg
              ref={svgRef}
              viewBox="0 0 1200 800"
              onClick={handleSvgClick}
              onMouseMove={handleSvgMouseMove}
              onMouseLeave={handleSvgMouseLeave}
              style={{
                width: '100%',
                height: '100%',
                cursor: simState === 'impacting' ? 'not-allowed' : 'crosshair',
                display: 'block',
              }}
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Base Map Canvas */}
              <rect width="1200" height="800" fill="#F8F6F1" />

              {/* Aster River */}
              <path
                d="M 0,268 C 220,288 340,346 500,326 C 660,306 780,366 920,406 C 1040,436 1120,416 1200,426
                   L 1200,462 C 1120,452 1040,472 910,442 C 770,402 650,342 490,362 C 330,382 210,322 0,302 Z"
                fill="#7CA3B4"
              />

              {/* Road Network */}
              {mapData.road_edges.map((edge) => {
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
              {mapData.buildings.map((bld) => (
                <rect
                  key={bld.id}
                  x={bld.x - bld.width / 2}
                  y={bld.y - bld.height / 2}
                  width={bld.width}
                  height={bld.height}
                  fill={bld.is_damaged ? '#E2CCC4' : '#EFE7D8'}
                  stroke={bld.is_damaged ? '#B26E60' : '#C4B9A4'}
                  strokeWidth="1"
                  rx="2"
                />
              ))}

              {/* Facilities */}
              {mapData.facilities.map((fac) => (
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
              {mapData.residents.map((res) => (
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

              {/* Target Location Marker & Concentric Blast Perimeter */}
              <g id="bombard-targeting">
                {/* Outer Perimeter (Secondary Hazard Zone) */}
                <circle
                  cx={targetPos.x}
                  cy={targetPos.y}
                  r={presetRadius}
                  fill="rgba(199, 120, 28, 0.12)"
                  stroke="#C7781C"
                  strokeWidth="1.5"
                  strokeDasharray="6,4"
                />

                {/* Innermost Fatal Direct-Impact Core */}
                <circle
                  cx={targetPos.x}
                  cy={targetPos.y}
                  r={presetRadius * 0.20}
                  fill="rgba(189, 52, 35, 0.28)"
                  stroke="#BD3423"
                  strokeWidth="2"
                />

                {/* Reticle Lines */}
                <line x1={targetPos.x - 18} y1={targetPos.y} x2={targetPos.x + 18} y2={targetPos.y} stroke="#BD3423" strokeWidth="2" />
                <line x1={targetPos.x} y1={targetPos.y - 18} x2={targetPos.x} y2={targetPos.y + 18} stroke="#BD3423" strokeWidth="2" />
                <circle cx={targetPos.x} cy={targetPos.y} r="6" fill="none" stroke="#BD3423" strokeWidth="2" />
              </g>

              {/* Cursor-Following Crosshair (while mouse moves over map) */}
              {cursorPos && (cursorPos.x !== targetPos.x || cursorPos.y !== targetPos.y) && simState !== 'impacting' && (
                <g opacity="0.6" style={{ pointerEvents: 'none' }}>
                  <circle cx={cursorPos.x} cy={cursorPos.y} r="12" fill="none" stroke="#77847E" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1={cursorPos.x - 16} y1={cursorPos.y} x2={cursorPos.x + 16} y2={cursorPos.y} stroke="#77847E" strokeWidth="1" />
                  <line x1={cursorPos.x} y1={cursorPos.y - 16} x2={cursorPos.x} y2={cursorPos.y + 16} stroke="#77847E" strokeWidth="1" />
                </g>
              )}

              {/* Cinematic Impact Trajectory & Flash (Phase B) */}
              {isCinematicLocked && (
                <g id="cinematic-impact-animation" style={{ pointerEvents: 'none' }}>
                  {/* Descending Munition Trajectory Streak */}
                  <line
                    x1={targetPos.x - 50}
                    y1={targetPos.y - 160}
                    x2={targetPos.x}
                    y2={targetPos.y}
                    stroke="#FFDE8A"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    opacity="0.9"
                  >
                    <animate attributeName="opacity" values="0;1;0" dur="0.45s" repeatCount="1" />
                  </line>

                  {/* Expanding Impact Shockwave Ring */}
                  <circle
                    cx={targetPos.x}
                    cy={targetPos.y}
                    r={presetRadius * 1.3}
                    fill="none"
                    stroke="#BD3423"
                    strokeWidth="4"
                    opacity="0.8"
                  >
                    <animate attributeName="r" from="10" to={String(presetRadius * 1.3)} dur="0.6s" repeatCount="1" />
                    <animate attributeName="opacity" from="1" to="0" dur="0.6s" repeatCount="1" />
                  </circle>

                  {/* Core Dust / Flash Pulse */}
                  <circle
                    cx={targetPos.x}
                    cy={targetPos.y}
                    r={presetRadius * 0.45}
                    fill="rgba(255, 235, 170, 0.7)"
                  >
                    <animate attributeName="r" from="5" to={String(presetRadius * 0.5)} dur="0.35s" repeatCount="1" />
                    <animate attributeName="opacity" from="0.9" to="0" dur="0.4s" repeatCount="1" />
                  </circle>
                </g>
              )}
            </svg>

            {/* Floating Instructional Pill */}
            <div
              style={{
                position: 'absolute',
                top: 14,
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(28, 33, 31, 0.88)',
                color: '#FFFFFF',
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                pointerEvents: 'none',
              }}
            >
              <Crosshair size={14} />
              <span>Click anywhere on the map to set simulated impact location</span>
            </div>
          </div>

          {/* Right Control & Preview Panel */}
          <div
            style={{
              width: 360,
              backgroundColor: '#FFFFFF',
              borderLeft: '1px solid #D8D0C0',
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              overflowY: 'auto',
            }}
          >
            {/* Scenario Preset Selector */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6A7670', marginBottom: 6, display: 'block' }}>
                Scenario Preset
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {(['LOCALIZED', 'MODERATE', 'MAJOR'] as const).map((preset) => (
                  <button
                    key={preset}
                    className={`btn btn-sm ${scenarioPreset === preset ? 'btn-warning' : ''}`}
                    onClick={() => setScenarioPreset(preset)}
                    disabled={isCinematicLocked}
                    style={{ fontSize: 11, padding: '6px 4px', textTransform: 'capitalize' }}
                  >
                    {preset.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Coordinates Box */}
            <div style={{ padding: '8px 12px', backgroundColor: '#FAF8F3', border: '1px solid #E2DBD0', borderRadius: 4, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: '#77847E' }}>Simulated Epicenter:</span>
              <strong className="mono" style={{ color: '#1C211F' }}>
                X: {targetPos.x}, Y: {targetPos.y}
              </strong>
            </div>

            {/* Compact Impact Preview */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#6A7670', letterSpacing: '0.04em' }}>
                  Impact Preview
                </span>
                {loadingPreview && <span style={{ fontSize: 10, color: '#C7781C' }}>Calculating...</span>}
              </div>

              {preview && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, backgroundColor: '#FAF8F3', border: '1px solid #DFD7C7', borderRadius: 4, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#55615B' }}>Residents in Zone:</span>
                    <strong className="num">{preview.summary.total_residents_in_zone}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#BD3423' }}>Core Fatalities:</span>
                    <strong className="num" style={{ color: '#BD3423' }}>{preview.summary.estimated_fatalities}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#BD3423' }}>Critical Injuries:</span>
                    <strong className="num" style={{ color: '#BD3423' }}>{preview.summary.estimated_critical_immediate}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#C7781C' }}>Serious Injuries:</span>
                    <strong className="num" style={{ color: '#C7781C' }}>{preview.summary.estimated_delayed_urgent}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#55615B' }}>Damaged Buildings:</span>
                    <strong className="num">{preview.summary.damaged_buildings_count}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#BD3423' }}>Roadways Blocked:</span>
                    <strong className="num" style={{ color: '#BD3423' }}>{preview.summary.roads_blocked_count}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message if any */}
            {errorMessage && (
              <div style={{ padding: 10, backgroundColor: '#FCECE9', color: '#BD3423', border: '1px solid #F3B4AA', borderRadius: 4, fontSize: 11 }}>
                {errorMessage}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
              <button
                className="btn btn-warning"
                onClick={handleConfirmIncident}
                disabled={isCinematicLocked}
                style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, gap: 8 }}
              >
                <Flame size={16} />
                <span>{isCinematicLocked ? 'Executing Impact...' : 'Confirm Simulated Bombardment'}</span>
              </button>

              <button
                className="btn"
                onClick={onClose}
                disabled={isCinematicLocked}
                style={{ fontSize: 12 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Phase D — Post-Impact Incident Summary Overlay (Reveals ONLY after impact finishes) */}
        {simState === 'revealing' && committedIncident && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(28, 33, 31, 0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 300,
              padding: 20,
              backdropFilter: 'blur(4px)',
            }}
          >
            <div
              className="modal-box"
              style={{
                maxWidth: 540,
                backgroundColor: '#FFFFFF',
                borderRadius: 6,
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              }}
            >
              <div className="modal-header" style={{ backgroundColor: '#FDF6EE', borderBottom: '1px solid #EAC8A9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#913807', fontWeight: 700 }}>
                  <ShieldAlert size={20} color="#BD3423" />
                  <span>Simulated Incident Committed: {committedIncident.code}</span>
                </div>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 13, color: '#2B332F', lineHeight: 1.5, margin: 0 }}>
                  The simulated munition impact has detonated at sector ({targetPos.x}, {targetPos.y}). The disaster consequences have been committed to the persistent database and propagated across Aster Vale:
                </p>

                {/* Outcome Tally Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  <div style={{ padding: 10, backgroundColor: '#FAF8F3', border: '1px solid #DFD7C7', borderRadius: 4 }}>
                    <div style={{ fontSize: 11, color: '#77847E' }}>Fatalities (Core)</div>
                    <div className="num" style={{ fontSize: 20, fontWeight: 700, color: '#111', marginTop: 2 }}>
                      {committedIncident.fatalities_count}
                    </div>
                  </div>

                  <div style={{ padding: 10, backgroundColor: '#FCECE9', border: '1px solid #F3B4AA', borderRadius: 4 }}>
                    <div style={{ fontSize: 11, color: '#9E2D1E' }}>Critical (P1)</div>
                    <div className="num" style={{ fontSize: 20, fontWeight: 700, color: '#BD3423', marginTop: 2 }}>
                      {committedIncident.critical_injuries_count || committedIncident.casualties_count}
                    </div>
                  </div>

                  <div style={{ padding: 10, backgroundColor: '#FDF5E8', border: '1px solid #F0CD9E', borderRadius: 4 }}>
                    <div style={{ fontSize: 11, color: '#8F5413' }}>Serious (P2)</div>
                    <div className="num" style={{ fontSize: 20, fontWeight: 700, color: '#C7781C', marginTop: 2 }}>
                      {committedIncident.serious_injuries_count || 0}
                    </div>
                  </div>

                  <div style={{ padding: 10, backgroundColor: '#FAF8F3', border: '1px solid #DFD7C7', borderRadius: 4 }}>
                    <div style={{ fontSize: 11, color: '#77847E' }}>Minor (P3)</div>
                    <div className="num" style={{ fontSize: 18, fontWeight: 700, color: '#447754', marginTop: 2 }}>
                      {committedIncident.minor_injuries_count || 0}
                    </div>
                  </div>

                  <div style={{ padding: 10, backgroundColor: '#FAF8F3', border: '1px solid #DFD7C7', borderRadius: 4 }}>
                    <div style={{ fontSize: 11, color: '#77847E' }}>Damaged Bldgs</div>
                    <div className="num" style={{ fontSize: 18, fontWeight: 700, color: '#1C211F', marginTop: 2 }}>
                      {committedIncident.damaged_buildings_count}
                    </div>
                  </div>

                  <div style={{ padding: 10, backgroundColor: '#FAF8F3', border: '1px solid #DFD7C7', borderRadius: 4 }}>
                    <div style={{ fontSize: 11, color: '#BD3423' }}>Blocked Roads</div>
                    <div className="num" style={{ fontSize: 18, fontWeight: 700, color: '#BD3423', marginTop: 2 }}>
                      {committedIncident.blocked_roads_count}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: '#55615B', padding: 8, backgroundColor: '#FAF8F3', borderRadius: 3, border: '1px solid #E2DBD0' }}>
                  Road blockages have closed transit segments. Autonomous evacuation routes have recalculated bypass detours.
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setSimState('selecting');
                    onClose();
                  }}
                  style={{ gap: 6 }}
                >
                  <span>Return to Village Map</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
