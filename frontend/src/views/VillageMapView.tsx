import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  Search,
  Eye,
  Hospital,
  AlertTriangle,
  X,
  Stethoscope,
  Navigation,
  Shield,
  Layers,
  ArrowRight,
  ShieldAlert,
  Clock,
  Compass,
  CheckCircle2,
  Activity,
  ChevronRight,
  RefreshCw,
  Info
} from 'lucide-react';
import {
  MapData, Resident, MedicalFacility, Building, RoadEdge, Hazard, TriageCategory, EvacuationPlan
} from '../types';
import { TriageBadge } from '../components/TriageBadge';
import { VitalMonitor } from '../components/VitalMonitor';
import { getResidentVisuals, SkullIcon, TRIAGE_VISUALS } from '../utils/triageStyles';
import { api } from '../api/client';

interface VillageMapViewProps {
  mapData: MapData | null;
  selectedResidentId?: number | null;
  activeCitizenId?: number | null;
  routeForResidentId?: number | null;
  newlyAffectedIds?: number[];
  onSelectResident?: (id: number | null) => void;
  onNavigateToEvac?: (residentId: number) => void;
  onNavigateToPatient?: (residentId: number) => void;
  onRefreshData?: () => void;
  onOpenBombard?: () => void;
}

export const VillageMapView: React.FC<VillageMapViewProps> = ({
  mapData,
  selectedResidentId: initialResidentId,
  activeCitizenId,
  routeForResidentId,
  newlyAffectedIds = [],
  onSelectResident,
  onNavigateToEvac,
  onNavigateToPatient,
  onRefreshData,
  onOpenBombard,
}) => {
  // Pan and Zoom transform state
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Inspection Drawer state
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<MedicalFacility | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedRoad, setSelectedRoad] = useState<RoadEdge | null>(null);

  // Live Animated Evacuation Route Focus State
  const [activeRouteResident, setActiveRouteResident] = useState<Resident | null>(null);
  const [activeRoutePlan, setActiveRoutePlan] = useState<EvacuationPlan | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Hover Tooltip State
  const [hoveredResident, setHoveredResident] = useState<{
    resident: Resident;
    clientX: number;
    clientY: number;
  } | null>(null);

  const [hoveredFacility, setHoveredFacility] = useState<{
    facility: MedicalFacility;
    clientX: number;
    clientY: number;
  } | null>(null);

  // Filters & Layer Toggles
  const [triageFilter, setTriageFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [layers, setLayers] = useState({
    residents: true,
    facilities: true,
    roads: true,
    buildings: true,
    hazards: true,
    routes: true,
    neighborhoods: true,
    environment: true,
  });

  const [showLegend, setShowLegend] = useState(true);
  const [togglingRoad, setTogglingRoad] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const initialFitDone = useRef(false);

  // Auto-fit Aster Vale to Viewport
  const fitVillageToViewport = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const vw = rect.width || 1100;
    const vh = rect.height || 750;

    // Available space subtracting top summary bar & margins
    const availW = Math.max(400, vw - 40);
    const availH = Math.max(300, vh - 60);

    const scale = Math.min(availW / 1200, availH / 800);
    const targetZoom = Math.min(1.4, Math.max(0.65, Number(scale.toFixed(3))));
    const panX = Math.round((vw - 1200 * targetZoom) / 2);
    const panY = Math.round((vh - 800 * targetZoom) / 2);

    setZoom(targetZoom);
    setPan({ x: panX, y: panY });
  };

  // On initial mount: fit village map to available viewport
  useEffect(() => {
    if (mapData && !initialFitDone.current) {
      initialFitDone.current = true;
      // Slight delay to ensure DOM dimensions are measured
      setTimeout(() => {
        fitVillageToViewport();
      }, 50);
    }
  }, [mapData]);

  // Auto-frame view helper for bounding boxes (e.g. routes)
  const frameBoundingBox = (points: { x: number; y: number }[], padding = 150) => {
    if (!points.length || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const vw = rect.width || 1000;
    const vh = rect.height || 700;

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const boxW = Math.max(80, maxX - minX);
    const boxH = Math.max(80, maxY - minY);

    const targetZoom = Math.min(2.2, Math.max(0.75, Math.min(vw / (boxW + padding * 2), vh / (boxH + padding * 2))));
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    const targetPanX = (vw / 2) - midX * targetZoom;
    const targetPanY = (vh / 2) - midY * targetZoom;

    setZoom(targetZoom);
    setPan({ x: targetPanX, y: targetPanY });
  };

  // Trigger route focus when routeForResidentId is supplied
  useEffect(() => {
    if (routeForResidentId && mapData) {
      const res = mapData.residents.find((r) => r.id === routeForResidentId);
      if (res) {
        handleSelectResident(res);
      }
    }
  }, [routeForResidentId, mapData]);

  // Select resident if passed via props
  useEffect(() => {
    if (initialResidentId && mapData && !routeForResidentId) {
      const res = mapData.residents.find((r) => r.id === initialResidentId);
      if (res) {
        handleSelectResident(res);
      }
    }
  }, [initialResidentId, mapData, routeForResidentId]);

  // Select a resident: opens panel AND highlights evacuation route if injured
  const handleSelectResident = async (resident: Resident) => {
    setSelectedResident(resident);
    setSelectedFacility(null);
    setSelectedBuilding(null);
    setSelectedRoad(null);
    setHoveredResident(null);

    if (onSelectResident) onSelectResident(resident.id);

    // If resident is injured (IMMEDIATE, DELAYED, MINIMAL), compute & show route directly on the map
    if (!resident.is_fatality && resident.active_triage !== 'STABLE' && resident.active_triage !== 'EXPECTANT') {
      setActiveRouteResident(resident);
      setLoadingRoute(true);
      try {
        const plan = await api.planEvacuation(resident.id);
        setActiveRoutePlan(plan);

        // Frame route bounding box
        const destFac = plan.recommended_destination?.facility;
        const routeCoords = plan.recommended_destination?.safest_route?.coordinates || [];
        const pointsToFrame: { x: number; y: number }[] = [{ x: resident.x, y: resident.y }];

        if (destFac) pointsToFrame.push({ x: destFac.x, y: destFac.y });
        routeCoords.forEach(([rx, ry]) => pointsToFrame.push({ x: rx, y: ry }));

        frameBoundingBox(pointsToFrame, 160);
      } catch (err) {
        console.error('Failed to compute route for selected resident:', err);
      } finally {
        setLoadingRoute(false);
      }
    } else {
      // Clear route for stable or deceased resident
      setActiveRouteResident(null);
      setActiveRoutePlan(null);
    }
  };

  const handleClearRouteFocus = () => {
    setActiveRouteResident(null);
    setActiveRoutePlan(null);
  };

  // Pan & Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom controls
  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(2.5, Math.max(0.6, prev + delta)));
  };

  // Reconciled population metrics computed directly from persistent mapData
  const populationStats = useMemo(() => {
    if (!mapData) {
      return { total: 100, living: 100, care: 0, critical: 0, serious: 0, minor: 0, fatalities: 0, freeBeds: 0, totalBeds: 0, blockedRoads: 0 };
    }

    const residents = mapData.residents;
    let living = 0;
    let care = 0;
    let critical = 0;
    let serious = 0;
    let minor = 0;
    let fatalities = 0;

    for (const r of residents) {
      if (r.is_fatality || r.active_triage === 'EXPECTANT') {
        fatalities++;
      } else {
        living++;
        if (r.active_triage === 'IMMEDIATE') {
          critical++;
          care++;
        } else if (r.active_triage === 'DELAYED') {
          serious++;
          care++;
        } else if (r.active_triage === 'MINIMAL') {
          minor++;
          care++;
        }
      }
    }

    const totalBeds = mapData.facilities.reduce((sum, f) => sum + f.total_capacity, 0);
    const freeBeds = mapData.facilities.reduce((sum, f) => sum + f.available_capacity, 0);
    const blockedRoads = mapData.road_edges.filter((e) => e.is_blocked).length;

    return {
      total: residents.length,
      living,
      care,
      critical,
      serious,
      minor,
      fatalities,
      freeBeds,
      totalBeds,
      blockedRoads,
    };
  }, [mapData]);

  // Filtered residents list matching search & active triage filters
  const filteredResidents = useMemo(() => {
    if (!mapData) return [];
    return mapData.residents.filter((res) => {
      // Triage filter
      if (triageFilter === 'LIVING') {
        if (res.is_fatality || res.active_triage === 'EXPECTANT') return false;
      } else if (triageFilter === 'CARE_REQUIRED') {
        if (res.active_triage === 'STABLE' || res.is_fatality || res.active_triage === 'EXPECTANT') return false;
      } else if (triageFilter !== 'ALL') {
        if (triageFilter === 'EXPECTANT') {
          if (!res.is_fatality && res.active_triage !== 'EXPECTANT') return false;
        } else if (res.active_triage !== triageFilter || res.is_fatality) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          res.full_name.toLowerCase().includes(q) ||
          res.code.toLowerCase().includes(q) ||
          res.medical_condition.toLowerCase().includes(q) ||
          res.neighborhood_name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [mapData, triageFilter, searchQuery]);

  // Toggle road blockage action
  const handleToggleBlockage = async (road: RoadEdge) => {
    setTogglingRoad(true);
    try {
      const updated = await api.toggleRoadBlockage(
        road.id,
        !road.is_blocked,
        road.is_blocked ? 'Debris cleared by emergency engineering team' : 'Emergency cordon blockage'
      );
      setSelectedRoad(updated);
      if (onRefreshData) onRefreshData();

      // If active route exists, re-calculate route to show dynamic detour
      if (activeRouteResident) {
        handleSelectResident(activeRouteResident);
      }
    } finally {
      setTogglingRoad(false);
    }
  };

  if (!mapData) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>
        Loading Aster Vale cartographic simulation data...
      </div>
    );
  }

  const activeSafestRoute = activeRoutePlan?.recommended_destination?.safest_route;
  const activeDestFac = activeRoutePlan?.recommended_destination?.facility;
  const activeRouteCoords = activeSafestRoute?.coordinates || [];

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#F8F6F1' }}
    >
      {/* 1. TOP DOCKED COMPACT INCIDENT & POPULATION SUMMARY STRIP (Clickable KPIs to filter map) */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 14,
          right: 14,
          zIndex: 25,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {/* Left: Settlement Status & Filter Chips */}
        <div className="compact-summary-bar" style={{ pointerEvents: 'auto' }}>
          {/* Aster Vale Settlement Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingRight: 8, borderRight: '1px solid #E2DBD0' }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 13, fontWeight: 700, color: '#1B221E' }}>
              ASTER VALE
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 3,
                backgroundColor: populationStats.fatalities > 0 || populationStats.care > 2 ? '#FCECE9' : '#E7F2EB',
                color: populationStats.fatalities > 0 || populationStats.care > 2 ? '#BD3423' : '#2A6642',
              }}
            >
              {populationStats.fatalities > 0 ? 'CASUALTIES ACTIVE' : (populationStats.care > 2 ? 'TRIAGE ACTIVE' : 'CALM BASELINE')}
            </span>
          </div>

          {/* Clickable KPI Filter Chips */}
          <button
            className={`summary-kpi-chip ${triageFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setTriageFilter('ALL')}
            title="Show all 100 registered villagers"
          >
            <span>All Pop:</span>
            <strong>{populationStats.total}</strong>
          </button>

          <button
            className={`summary-kpi-chip ${triageFilter === 'LIVING' ? 'active' : ''}`}
            onClick={() => setTriageFilter(triageFilter === 'LIVING' ? 'ALL' : 'LIVING')}
            title="Filter to living population"
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#2A6642', display: 'inline-block' }} />
            <span>Living:</span>
            <strong>{populationStats.living}</strong>
          </button>

          <button
            className={`summary-kpi-chip ${triageFilter === 'CARE_REQUIRED' ? 'active' : ''}`}
            onClick={() => setTriageFilter(triageFilter === 'CARE_REQUIRED' ? 'ALL' : 'CARE_REQUIRED')}
            title="Filter to all residents requiring medical evacuation (Critical + Serious + Minor)"
            style={{ color: populationStats.care > 0 ? '#C2410C' : '#555' }}
          >
            <Activity size={12} color="#C2410C" />
            <span>Care Req:</span>
            <strong>{populationStats.care}</strong>
          </button>

          <button
            className={`summary-kpi-chip ${triageFilter === 'IMMEDIATE' ? 'active' : ''}`}
            onClick={() => setTriageFilter(triageFilter === 'IMMEDIATE' ? 'ALL' : 'IMMEDIATE')}
            title="Filter to Critical (Red / P1) residents"
            style={{ color: populationStats.critical > 0 ? '#BD3423' : '#555', backgroundColor: populationStats.critical > 0 && triageFilter !== 'IMMEDIATE' ? '#FCECE9' : undefined }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#BD3423', display: 'inline-block' }} />
            <span>Critical:</span>
            <strong>{populationStats.critical}</strong>
          </button>

          <button
            className={`summary-kpi-chip ${triageFilter === 'DELAYED' ? 'active' : ''}`}
            onClick={() => setTriageFilter(triageFilter === 'DELAYED' ? 'ALL' : 'DELAYED')}
            title="Filter to Serious (Orange / P2) residents"
            style={{ color: populationStats.serious > 0 ? '#EA580C' : '#555' }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#EA580C', display: 'inline-block' }} />
            <span>Serious:</span>
            <strong>{populationStats.serious}</strong>
          </button>

          <button
            className={`summary-kpi-chip ${triageFilter === 'MINIMAL' ? 'active' : ''}`}
            onClick={() => setTriageFilter(triageFilter === 'MINIMAL' ? 'ALL' : 'MINIMAL')}
            title="Filter to Minor (Yellow / P3) residents"
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#CA8A04', display: 'inline-block' }} />
            <span>Minor:</span>
            <strong>{populationStats.minor}</strong>
          </button>

          <button
            className={`summary-kpi-chip ${triageFilter === 'EXPECTANT' ? 'active' : ''}`}
            onClick={() => setTriageFilter(triageFilter === 'EXPECTANT' ? 'ALL' : 'EXPECTANT')}
            title="Filter to Deceased / Expectant casualties"
            style={{
              backgroundColor: populationStats.fatalities > 0 && triageFilter !== 'EXPECTANT' ? '#252A28' : undefined,
              color: populationStats.fatalities > 0 && triageFilter !== 'EXPECTANT' ? '#FFFFFF' : undefined,
            }}
          >
            <SkullIcon size={12} fill={populationStats.fatalities > 0 && triageFilter !== 'EXPECTANT' ? '#FFFFFF' : '#1C211F'} stroke="#FFFFFF" />
            <span>Deceased:</span>
            <strong>{populationStats.fatalities}</strong>
          </button>

          {/* Active Filter Clear Tag */}
          {triageFilter !== 'ALL' && (
            <button
              onClick={() => setTriageFilter('ALL')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 7px',
                borderRadius: 3,
                fontSize: 10.5,
                fontWeight: 700,
                backgroundColor: '#BD3423',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
              }}
              title="Clear active filter"
            >
              <span>Clear Filter</span>
              <X size={11} />
            </button>
          )}

          {/* Quick Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingLeft: 6, borderLeft: '1px solid #E2DBD0' }}>
            <Search size={12} color="#7D8983" />
            <input
              type="text"
              placeholder="Find resident..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: 11,
                color: '#1C211F',
                width: 100,
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Right Controls: Fit Village, Layers, Zoom, and Incident Simulation Button */}
        <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Bombard Incident Launcher Button */}
          {onOpenBombard && (
            <button
              className="btn btn-warning"
              onClick={onOpenBombard}
              style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700 }}
              title="Trigger a controlled fictional disaster incident"
            >
              <AlertTriangle size={14} />
              <span>Simulate Incident</span>
            </button>
          )}

          {/* Fit Village Action */}
          <button
            className="btn btn-sm"
            onClick={fitVillageToViewport}
            style={{ padding: '6px 10px', fontSize: 11, backgroundColor: '#FFFFFF' }}
            title="Fit whole village to screen"
          >
            <Maximize2 size={13} />
            <span>Fit Village</span>
          </button>

          {/* Zoom Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #D6CEBE',
              borderRadius: 4,
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <button
              onClick={() => handleZoom(0.25)}
              title="Zoom In"
              style={{ padding: '6px 8px', background: 'none', border: 'none', cursor: 'pointer', borderRight: '1px solid #E2DBD0' }}
            >
              <ZoomIn size={14} color="#333" />
            </button>
            <button
              onClick={() => handleZoom(-0.25)}
              title="Zoom Out"
              style={{ padding: '6px 8px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <ZoomOut size={14} color="#333" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. DOCKED ACTIVE EVACUATION CORRIDOR FLOATING NAVIGATOR HUD */}
      {activeRouteResident && activeSafestRoute && (
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 35,
            width: '92%',
            maxWidth: 680,
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            border: '1.5px solid #2A6642',
            borderRadius: 6,
            padding: '12px 18px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.14)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: '#E7F2EB',
                  border: '1px solid #B8DCBF',
                  color: '#2A6642',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 3,
                  letterSpacing: '0.04em',
                }}
              >
                <Compass size={13} />
                LIVE EVACUATION CORRIDOR
              </span>
              <strong style={{ fontSize: 13, color: '#1C211F' }}>
                {activeRouteResident.full_name} ({activeRouteResident.code})
              </strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="btn btn-sm"
                onClick={() => {
                  const points = [
                    { x: activeRouteResident.x, y: activeRouteResident.y },
                    ...(activeDestFac ? [{ x: activeDestFac.x, y: activeDestFac.y }] : []),
                    ...activeRouteCoords.map(([rx, ry]) => ({ x: rx, y: ry }))
                  ];
                  frameBoundingBox(points, 160);
                }}
                style={{ padding: '3px 8px', fontSize: 11 }}
              >
                Fit Route
              </button>

              <button
                onClick={handleClearRouteFocus}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#666',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                <span>Clear</span>
                <X size={14} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #E8E2D5', paddingTop: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: '#77847E' }}>DESTINATION MEDICAL FACILITY</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1A211E' }}>
                {activeDestFac?.name}
              </div>
              <div style={{ fontSize: 11, color: '#68746E' }}>
                {activeDestFac?.neighborhood_name} • <strong>{activeDestFac?.available_capacity} free beds</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, textAlign: 'right' }}>
              <div>
                <div style={{ fontSize: 11, color: '#77847E' }}>ESTIMATED TIME</div>
                <div className="num" style={{ fontSize: 20, fontWeight: 700, color: '#2A6642' }}>
                  {activeSafestRoute.travel_time} <span style={{ fontSize: 11, fontWeight: 500 }}>min</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#77847E' }}>TRANSIT DISTANCE</div>
                <div className="num" style={{ fontSize: 20, fontWeight: 700, color: '#1C211F' }}>
                  {activeSafestRoute.distance} <span style={{ fontSize: 11, fontWeight: 500 }}>m</span>
                </div>
              </div>
            </div>
          </div>

          {activeSafestRoute.warnings && activeSafestRoute.warnings.length > 0 && (
            <div style={{ padding: '6px 10px', backgroundColor: '#FDF5E8', border: '1px solid #F0CD9E', borderRadius: 4, fontSize: 11, color: '#8F5413', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={13} style={{ flexShrink: 0 }} />
              <span><strong>Routing Note: </strong>{activeSafestRoute.warnings.join('; ')}</span>
            </div>
          )}
        </div>
      )}

      {/* 3. MAIN SVG INTERACTIVE MAP CANVAS */}
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          width: '100%',
          height: '100%',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
      >
        <svg
          viewBox="0 0 1200 800"
          style={{
            width: '100%',
            height: '100%',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Pattern for Blocked Road Crosshatch */}
            <pattern id="blockedHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#BD3423" strokeWidth="2.5" />
            </pattern>

            {/* Direction Arrow Marker */}
            <marker
              id="routeDirectionArrow"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#2A6642" />
            </marker>

            {/* Urgent Route Arrow Marker */}
            <marker
              id="urgentDirectionArrow"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#BD3423" />
            </marker>
          </defs>

          {/* 1. Base Terrain Canvas */}
          <rect width="1200" height="800" fill="#F8F6F1" />

          {/* 2. Natural Features: Hills, Vegetation Areas & Parks */}
          {/* Northridge Terrain Heights */}
          <path
            d="M 380,50 Q 560,30 800,50 L 780,220 Q 560,250 360,220 Z"
            fill="#EAF1E7"
            stroke="#D6E2D1"
            strokeWidth="1"
          />
          {/* High Meadow Green Pastures */}
          <path
            d="M 800,180 Q 1050,150 1150,220 L 1140,480 Q 950,520 820,440 Z"
            fill="#E7EFE4"
            stroke="#D2DFCE"
            strokeWidth="1"
          />
          {/* Millbrook Riverside Copse */}
          <path
            d="M 80,360 Q 220,330 360,370 L 320,620 Q 180,660 70,580 Z"
            fill="#EDF3EA"
            stroke="#D9E5D4"
            strokeWidth="1"
          />

          {/* Environmental Art Details (Trees, Orchards, Town Square Cobblestones) */}
          {layers.environment && (
            <g id="environmental-art" opacity="0.85">
              {/* Old Town Central Cobblestone Plaza Paving */}
              <polygon
                points="500,380 620,375 640,460 520,470"
                fill="#EDE5D5"
                stroke="#D8CFBE"
                strokeWidth="1"
              />

              {/* High Meadow Orchard Tree Grid */}
              <g id="apple-orchards">
                {[
                  [860, 220], [890, 215], [920, 210], [950, 205],
                  [865, 245], [895, 240], [925, 235], [955, 230],
                  [870, 270], [900, 265], [930, 260],
                  [875, 295], [905, 290]
                ].map(([tx, ty], i) => (
                  <g key={i}>
                    <circle cx={tx + 1.5} cy={ty + 1.5} r="6.5" fill="rgba(0,0,0,0.06)" />
                    <circle cx={tx} cy={ty} r="6" fill="#88A889" stroke="#6F8D70" strokeWidth="0.8" />
                    <circle cx={tx - 1.5} cy={ty - 1.5} r="2.5" fill="#9CB99D" opacity="0.8" />
                  </g>
                ))}
              </g>

              {/* Aster River Willow Trees along Water margin */}
              <g id="river-willows">
                {[
                  [180, 275], [260, 295], [420, 315], [470, 310],
                  [650, 295], [740, 345], [860, 385], [1020, 415],
                  [1100, 405], [300, 355], [370, 395], [680, 375]
                ].map(([wx, wy], i) => (
                  <g key={i}>
                    <circle cx={wx + 1} cy={wy + 1} r="5" fill="rgba(0,0,0,0.07)" />
                    <circle cx={wx} cy={wy} r="4.5" fill="#719482" stroke="#5D7C6D" strokeWidth="0.75" />
                  </g>
                ))}
              </g>

              {/* Pedestrian Footpaths (Exclusively walking connections) */}
              <g id="pedestrian-footpaths">
                <path d="M 280,440 Q 350,420 420,410" stroke="#C8BEAD" strokeWidth="2.2" strokeDasharray="3,3" fill="none" />
                <path d="M 900,240 Q 940,260 970,290" stroke="#C8BEAD" strokeWidth="2.2" strokeDasharray="3,3" fill="none" />
                <path d="M 460,160 Q 480,140 520,135" stroke="#C8BEAD" strokeWidth="2.2" strokeDasharray="3,3" fill="none" />
                <path d="M 760,590 Q 790,570 820,580" stroke="#C8BEAD" strokeWidth="2.2" strokeDasharray="3,3" fill="none" />
              </g>
            </g>
          )}

          {/* 3. Aster River (Winding Water Surface with Banks) */}
          <path
            d="M 0,260 C 220,280 340,340 500,320 C 660,300 780,360 920,400 C 1040,430 1120,410 1200,420
               L 1200,470 C 1120,460 1040,480 910,450 C 770,410 650,350 490,370 C 330,390 210,330 0,310 Z"
            fill="#A3C3CE"
          />
          <path
            d="M 0,268 C 220,288 340,346 500,326 C 660,306 780,366 920,406 C 1040,436 1120,416 1200,426
               L 1200,462 C 1120,452 1040,472 910,442 C 770,402 650,342 490,362 C 330,382 210,322 0,302 Z"
            fill="#7CA3B4"
          />
          <path d="M 120,295 Q 160,298 200,305 M 560,336 Q 600,338 640,344 M 980,425 Q 1020,428 1060,426" stroke="#9AC0CE" strokeWidth="1.5" strokeDasharray="6,4" fill="none" />

          {/* 4. Neighborhood Boundaries & Labels */}
          {layers.neighborhoods && mapData.neighborhoods.map((nh) => (
            <g key={nh.id}>
              <text
                x={nh.center_x}
                y={nh.center_y - 80}
                textAnchor="middle"
                fontFamily="var(--font-serif)"
                fontSize="13"
                fontWeight="700"
                letterSpacing="0.08em"
                fill="#6F7C75"
                opacity="0.8"
                style={{ pointerEvents: 'none' }}
              >
                {nh.name.toUpperCase()}
              </text>
            </g>
          ))}

          {/* 5. Road Network (Graph Edges & Bridges - 100% Matching Backend Graph) */}
          {layers.roads && (
            <g id="road-network">
              {mapData.road_edges.map((edge) => {
                const isSelected = selectedRoad?.id === edge.id;
                const strokeColor = edge.is_blocked
                  ? '#BD3423'
                  : edge.is_restricted
                  ? '#C7781C'
                  : edge.road_type === 'PRIMARY'
                  ? '#C9C0AF'
                  : (edge.road_type === 'BRIDGE' ? '#A89E8C' : '#DDD5C6');
                const strokeWidth = edge.road_type === 'PRIMARY' ? 7.5 : (edge.road_type === 'BRIDGE' ? 8.5 : 5);

                const coords = edge.coordinates;
                const pathD = coords && coords.length >= 2
                  ? `M ${coords[0][0]},${coords[0][1]} L ${coords.slice(1).map((p) => `${p[0]},${p[1]}`).join(' ')}`
                  : '';

                const midX = coords && coords.length >= 2 ? (coords[0][0] + coords[1][0]) / 2 : 0;
                const midY = coords && coords.length >= 2 ? (coords[0][1] + coords[1][1]) / 2 : 0;

                return (
                  <g key={edge.id} onClick={() => { setSelectedRoad(edge); setSelectedResident(null); setSelectedFacility(null); setSelectedBuilding(null); }} style={{ cursor: 'pointer' }}>
                    {/* Road Underlay */}
                    <path
                      d={pathD}
                      stroke={isSelected ? '#1A211E' : '#B8AE9D'}
                      strokeWidth={strokeWidth + 2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                    {/* Main Road Surface */}
                    <path
                      d={pathD}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={edge.is_restricted ? '6,4' : undefined}
                      fill="none"
                    />

                    {/* Blocked Road Warning Pattern if blocked */}
                    {edge.is_blocked && (
                      <path
                        d={pathD}
                        stroke="#BD3423"
                        strokeWidth={strokeWidth + 1}
                        strokeDasharray="4,4"
                        fill="none"
                      />
                    )}

                    {/* Zoom-dependent street name label */}
                    {zoom >= 1.25 && (
                      <text
                        x={midX}
                        y={midY - 4}
                        textAnchor="middle"
                        fontFamily="var(--font-sans)"
                        fontSize="8.5"
                        fontWeight="600"
                        fill="#54615B"
                        stroke="#FFFFFF"
                        strokeWidth="2.5"
                        paintOrder="stroke"
                        style={{ pointerEvents: 'none' }}
                      >
                        {edge.name}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* 6. Active Evacuation Routes Overlay (General + Focused Animated Route) */}
          {layers.routes && (
            <g id="active-evacuation-routes">
              {/* General active routes */}
              {mapData.active_routes.map((rt) => {
                const pathD = rt.coordinates.length >= 2
                  ? `M ${rt.coordinates[0][0]},${rt.coordinates[0][1]} L ${rt.coordinates.slice(1).map((p) => `${p[0]},${p[1]}`).join(' ')}`
                  : '';
                const strokeColor = rt.priority_tier === 'IMMEDIATE' ? '#BD3423' : '#C7781C';

                return (
                  <g key={rt.assignment_id}>
                    <path
                      d={pathD}
                      stroke="#FFFFFF"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      opacity="0.9"
                    />
                    <path
                      d={pathD}
                      stroke={strokeColor}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="8,5"
                      fill="none"
                    />
                  </g>
                );
              })}

              {/* FOCUSED ANIMATED EVACUATION ROUTE (continuous directional flow) */}
              {activeSafestRoute && activeRouteCoords.length >= 2 && (
                <g id="focused-live-route">
                  {/* Broad high-visibility outer glow */}
                  <path
                    d={`M ${activeRouteCoords[0][0]},${activeRouteCoords[0][1]} L ${activeRouteCoords.slice(1).map((p) => `${p[0]},${p[1]}`).join(' ')}`}
                    stroke="#FFFFFF"
                    strokeWidth="11"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    opacity="0.95"
                  />
                  {/* Solid route base */}
                  <path
                    d={`M ${activeRouteCoords[0][0]},${activeRouteCoords[0][1]} L ${activeRouteCoords.slice(1).map((p) => `${p[0]},${p[1]}`).join(' ')}`}
                    stroke={activeRouteResident?.active_triage === 'IMMEDIATE' ? '#BD3423' : '#2A6642'}
                    strokeWidth="6.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  {/* Continuously Animated Moving Direction Indicators / Chevrons */}
                  <path
                    d={`M ${activeRouteCoords[0][0]},${activeRouteCoords[0][1]} L ${activeRouteCoords.slice(1).map((p) => `${p[0]},${p[1]}`).join(' ')}`}
                    stroke="#FFFFFF"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="route-animated-flow"
                    fill="none"
                    markerEnd={`url(#${activeRouteResident?.active_triage === 'IMMEDIATE' ? 'urgentDirectionArrow' : 'routeDirectionArrow'})`}
                  />
                </g>
              )}
            </g>
          )}

          {/* 7. Buildings (40 Architectural Structures) */}
          {layers.buildings && (
            <g id="buildings-layer">
              {mapData.buildings.map((bld) => {
                const isSelected = selectedBuilding?.id === bld.id;
                let fillColor = '#EFE7D8';
                let strokeColor = '#C4B9A4';

                if (bld.building_type === 'CIVIC') {
                  fillColor = '#E6E1D8';
                  strokeColor = '#B2A796';
                } else if (bld.building_type === 'COMMERCIAL') {
                  fillColor = '#ECE5D6';
                  strokeColor = '#B8AB98';
                } else if (bld.building_type === 'FARM') {
                  fillColor = '#E9DFD0';
                  strokeColor = '#B5A592';
                }

                if (bld.is_damaged) {
                  if (bld.damage_severity === 'COLLAPSED') {
                    fillColor = '#D4C0BA';
                    strokeColor = '#A05C50';
                  } else if (bld.damage_severity === 'HEAVY') {
                    fillColor = '#E2CCC4';
                    strokeColor = '#B26E60';
                  } else {
                    fillColor = '#EAE0D0';
                    strokeColor = '#C2987E';
                  }
                }

                return (
                  <g
                    key={bld.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBuilding(bld);
                      setSelectedResident(null);
                      setSelectedFacility(null);
                      setSelectedRoad(null);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Shadow */}
                    <rect
                      x={bld.x - bld.width / 2 + 1.5}
                      y={bld.y - bld.height / 2 + 1.5}
                      width={bld.width}
                      height={bld.height}
                      fill="rgba(0,0,0,0.05)"
                      rx={2}
                    />

                    {/* Main Building Footprint */}
                    <rect
                      x={bld.x - bld.width / 2}
                      y={bld.y - bld.height / 2}
                      width={bld.width}
                      height={bld.height}
                      fill={fillColor}
                      stroke={isSelected ? '#1A211E' : strokeColor}
                      strokeWidth={isSelected ? 2 : 1}
                      rx={2}
                    />

                    {/* Roof Ridge Line */}
                    <line
                      x1={bld.x - bld.width / 2 + 4}
                      y1={bld.y}
                      x2={bld.x + bld.width / 2 - 4}
                      y2={bld.y}
                      stroke={strokeColor}
                      strokeWidth="0.8"
                    />

                    {/* Chimney Accent on residential cottages */}
                    {bld.building_type === 'RESIDENTIAL' && (
                      <circle
                        cx={bld.x - bld.width / 2 + 5}
                        cy={bld.y - bld.height / 2 + 5}
                        r="1.8"
                        fill="#8C8274"
                      />
                    )}

                    {/* Damage indicator icon */}
                    {bld.is_damaged && (
                      <circle
                        cx={bld.x + bld.width / 2 - 4}
                        cy={bld.y - bld.height / 2 + 4}
                        r="3.5"
                        fill="#BD3423"
                      />
                    )}

                    {/* Zoom-dependent Building Label */}
                    {zoom >= 1.3 && (
                      <text
                        x={bld.x}
                        y={bld.y + bld.height / 2 + 10}
                        textAnchor="middle"
                        fontFamily="var(--font-sans)"
                        fontSize="8.5"
                        fontWeight="600"
                        fill="#68756F"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                        paintOrder="stroke"
                        style={{ pointerEvents: 'none' }}
                      >
                        {bld.name}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* 8. Active Disaster Hazards (Blast Craters, Debris) */}
          {layers.hazards && (
            <g id="hazards-layer">
              {mapData.hazards.map((haz) => (
                <g key={haz.id}>
                  <circle
                    cx={haz.epicenter_x}
                    cy={haz.epicenter_y}
                    r={haz.radius}
                    fill="rgba(189, 52, 35, 0.08)"
                    stroke="#BD3423"
                    strokeWidth="1.5"
                    strokeDasharray="6,4"
                  />
                  <circle
                    cx={haz.epicenter_x}
                    cy={haz.epicenter_y}
                    r={haz.radius * 0.35}
                    fill="rgba(189, 52, 35, 0.18)"
                    stroke="#BD3423"
                    strokeWidth="2"
                  />
                  <line
                    x1={haz.epicenter_x - 14}
                    y1={haz.epicenter_y}
                    x2={haz.epicenter_x + 14}
                    y2={haz.epicenter_y}
                    stroke="#BD3423"
                    strokeWidth="2"
                  />
                  <line
                    x1={haz.epicenter_x}
                    y1={haz.epicenter_y - 14}
                    x2={haz.epicenter_x}
                    y2={haz.epicenter_y + 14}
                    stroke="#BD3423"
                    strokeWidth="2"
                  />
                </g>
              ))}
            </g>
          )}

          {/* 9. Medical Facilities (Distinct Hospital Cross Badges & Pulsing Beacon) */}
          {layers.facilities && (
            <g id="facilities-layer">
              {mapData.facilities.map((fac) => {
                const isSelected = selectedFacility?.id === fac.id;
                const isTargetDestination = activeDestFac?.id === fac.id;
                const isFull = fac.available_capacity <= 0;
                const isNearCapacity = fac.available_capacity > 0 && fac.available_capacity <= 2;

                const crossColor = isFull ? '#BD3423' : (isNearCapacity ? '#EA580C' : '#2A6642');

                return (
                  <g
                    key={fac.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFacility(fac);
                      setSelectedResident(null);
                      setSelectedBuilding(null);
                      setSelectedRoad(null);
                    }}
                    onMouseEnter={(e) => setHoveredFacility({ facility: fac, clientX: e.clientX, clientY: e.clientY })}
                    onMouseLeave={() => setHoveredFacility(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Destination Facility Pulsing Beacon */}
                    {isTargetDestination && (
                      <g>
                        <circle
                          cx={fac.x}
                          cy={fac.y}
                          r="28"
                          fill="rgba(42, 102, 66, 0.18)"
                          stroke="#2A6642"
                          className="facility-beacon-pulse"
                        />
                        <circle
                          cx={fac.x}
                          cy={fac.y}
                          r="20"
                          fill="none"
                          stroke="#2A6642"
                          strokeWidth="2"
                          strokeDasharray="4,3"
                        />
                      </g>
                    )}

                    {/* Facility Base Shape */}
                    <rect
                      x={fac.x - 17}
                      y={fac.y - 17}
                      width="34"
                      height="34"
                      fill="#FFFFFF"
                      stroke={isSelected ? '#1A211E' : (isTargetDestination ? '#2A6642' : crossColor)}
                      strokeWidth={isSelected || isTargetDestination ? 3 : 1.8}
                      rx="4"
                      filter="drop-shadow(0 2px 6px rgba(0,0,0,0.15))"
                    />

                    {/* Medical Cross Symbol */}
                    <rect x={fac.x - 3.5} y={fac.y - 10} width="7" height="20" fill={crossColor} rx="1" />
                    <rect x={fac.x - 10} y={fac.y - 3.5} width="20" height="7" fill={crossColor} rx="1" />

                    {/* Facility Label & Free Beds Meter */}
                    <text
                      x={fac.x}
                      y={fac.y + 27}
                      textAnchor="middle"
                      fontFamily="var(--font-sans)"
                      fontSize="10"
                      fontWeight="700"
                      fill="#1C211F"
                      stroke="#FFFFFF"
                      strokeWidth="2.5"
                      paintOrder="stroke"
                    >
                      {fac.name.split(' ')[0]} ({fac.available_capacity} free)
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* 10. Residents (Centralized Consistent Color & Skull Symbol Mapping) */}
          {layers.residents && (
            <g id="residents-layer">
              {filteredResidents.map((res) => {
                const isSelected = selectedResident?.id === res.id;
                const isCitizen = res.id === activeCitizenId;
                const isRouteFocus = res.id === activeRouteResident?.id;
                const isNewlyAffected = newlyAffectedIds.includes(res.id);

                const visuals = getResidentVisuals(res.active_triage, res.is_fatality);

                return (
                  <g
                    key={res.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectResident(res);
                    }}
                    onMouseEnter={(e) => setHoveredResident({ resident: res, clientX: e.clientX, clientY: e.clientY })}
                    onMouseLeave={() => setHoveredResident(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Citizen "YOU ARE HERE" Pulsing Halo Marker */}
                    {isCitizen && (
                      <g>
                        <circle
                          cx={res.x}
                          cy={res.y}
                          r="17"
                          fill="rgba(42, 102, 66, 0.18)"
                          stroke="#2A6642"
                          strokeWidth="1.5"
                          className="citizen-pulse-ring"
                        />
                        <circle
                          cx={res.x}
                          cy={res.y}
                          r="11"
                          fill="none"
                          stroke="#2A6642"
                          strokeWidth="1.8"
                        />
                      </g>
                    )}

                    {/* Critical Pulse Ring for Immediate Cases */}
                    {res.active_triage === 'IMMEDIATE' && !res.is_fatality && (
                      <circle
                        cx={res.x}
                        cy={res.y}
                        r="14"
                        fill="rgba(189, 52, 35, 0.15)"
                        stroke="#BD3423"
                        className="critical-pulse-ring"
                      />
                    )}

                    {/* Newly affected alert pulse */}
                    {isNewlyAffected && (
                      <circle
                        cx={res.x}
                        cy={res.y}
                        r="16"
                        fill="none"
                        stroke="#BD3423"
                        className="new-casualty-pulse"
                      />
                    )}

                    {/* Route focus halo */}
                    {isRouteFocus && !isCitizen && (
                      <circle
                        cx={res.x}
                        cy={res.y}
                        r="14"
                        fill="rgba(42, 102, 66, 0.2)"
                        stroke="#2A6642"
                        strokeWidth="2"
                      />
                    )}

                    {/* Selected halo */}
                    {isSelected && !isCitizen && (
                      <circle
                        cx={res.x}
                        cy={res.y}
                        r={visuals.markerRadius + 5}
                        fill="none"
                        stroke="#1A211E"
                        strokeWidth="1.5"
                        strokeDasharray="3,2"
                      />
                    )}

                    {/* DECEASED RESIDENT: Distinct Respectful Skull Symbol Marker */}
                    {visuals.isDeceased ? (
                      <g>
                        {/* Outer black disc */}
                        <circle
                          cx={res.x}
                          cy={res.y}
                          r="7.5"
                          fill="#1C211F"
                          stroke="#FFFFFF"
                          strokeWidth="1.2"
                        />
                        {/* Embedded White Skull Icon */}
                        <g transform={`translate(${res.x - 4.5}, ${res.y - 4.5}) scale(0.38)`}>
                          <path
                            d="M12 2C6.48 2 2 6.48 2 12C2 15.5 3.8 18.58 6.54 20.35C7 20.65 7.42 20.25 7.42 19.72V18.5C7.42 18.22 7.64 18 7.92 18H8.5V21C8.5 21.55 8.95 22 9.5 22H14.5C15.05 22 15.5 21.55 15.5 21V18H16.08C16.36 18 16.58 18.22 16.58 18.5V19.72C16.58 20.25 17 20.65 17.46 20.35C20.2 18.58 22 15.5 22 12C22 6.48 17.52 2 12 2Z"
                            fill="#FFFFFF"
                          />
                          <ellipse cx="8.5" cy="11.5" rx="2" ry="2.5" fill="#1C211F" />
                          <ellipse cx="15.5" cy="11.5" rx="2" ry="2.5" fill="#1C211F" />
                          <polygon points="12,14.2 11,16.2 13,16.2" fill="#1C211F" />
                        </g>
                      </g>
                    ) : (
                      /* LIVING RESIDENTS: Consistent Severity Sizing & Color */
                      <circle
                        cx={res.x}
                        cy={res.y}
                        r={isCitizen ? Math.max(7.0, visuals.markerRadius) : visuals.markerRadius}
                        fill={visuals.color}
                        stroke="#FFFFFF"
                        strokeWidth={isCitizen ? 2.2 : visuals.strokeWidth}
                      />
                    )}

                    {/* Citizen prominent label */}
                    {isCitizen && (
                      <g>
                        <rect
                          x={res.x - 24}
                          y={res.y - 25}
                          width="48"
                          height="14"
                          fill="#1C211F"
                          rx="3"
                        />
                        <text
                          x={res.x}
                          y={res.y - 15}
                          textAnchor="middle"
                          fontFamily="var(--font-sans)"
                          fontSize="9"
                          fontWeight="700"
                          fill="#FFFFFF"
                        >
                          YOU ({res.code})
                        </text>
                      </g>
                    )}

                    {/* Show label on zoom >= 1.25 or if selected or critical */}
                    {!isCitizen && (zoom >= 1.25 || isSelected || res.active_triage === 'IMMEDIATE' || res.active_triage === 'DELAYED') && (
                      <text
                        x={res.x}
                        y={res.y - (visuals.isDeceased ? 10 : 8)}
                        textAnchor="middle"
                        fontFamily="var(--font-mono)"
                        fontSize="9"
                        fontWeight="600"
                        fill="#1C211F"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                        paintOrder="stroke"
                      >
                        {res.first_name}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          )}
        </svg>
      </div>

      {/* 4. HOVER TOOLTIP FOR RESIDENTS (Desktop hover + mobile tap) */}
      {hoveredResident && (
        <div
          className="map-tooltip"
          style={{
            left: Math.min(window.innerWidth - 300, Math.max(16, hoveredResident.clientX + 14)),
            top: Math.min(window.innerHeight - 180, Math.max(80, hoveredResident.clientY - 20)),
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: '#77847E' }}>
              [{hoveredResident.resident.code}]
            </span>
            <TriageBadge triage={hoveredResident.resident.active_triage} isFatality={hoveredResident.resident.is_fatality} />
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: '#1C211F' }}>
            {hoveredResident.resident.full_name}
          </div>

          <div style={{ fontSize: 11, color: '#68746E', marginTop: 1 }}>
            {hoveredResident.resident.neighborhood_name}
          </div>

          <div style={{ marginTop: 6, fontSize: 11.5, color: '#333F39', lineHeight: 1.3 }}>
            <strong>Condition: </strong>
            {hoveredResident.resident.medical_condition}
          </div>

          {hoveredResident.resident.is_fatality || hoveredResident.resident.active_triage === 'EXPECTANT' ? (
            <div style={{ marginTop: 6, padding: '3px 6px', backgroundColor: '#252A28', color: '#FFFFFF', borderRadius: 3, fontSize: 10.5, fontWeight: 600 }}>
              Fatal trauma. Excluded from active vehicle evacuation.
            </div>
          ) : (
            <div style={{ marginTop: 6, fontSize: 11, color: '#2A6642' }}>
              Status: <strong>{hoveredResident.resident.evacuation_status}</strong>
              {hoveredResident.resident.assigned_facility_name && (
                <span> • Dest: {hoveredResident.resident.assigned_facility_name}</span>
              )}
            </div>
          )}

          <div style={{ marginTop: 6, fontSize: 10, color: '#888', fontStyle: 'italic' }}>
            Click marker to inspect complete record & route
          </div>
        </div>
      )}

      {/* 5. HOVER TOOLTIP FOR MEDICAL FACILITIES */}
      {hoveredFacility && (
        <div
          className="map-tooltip"
          style={{
            left: Math.min(window.innerWidth - 320, Math.max(16, hoveredFacility.clientX + 14)),
            top: Math.min(window.innerHeight - 200, Math.max(80, hoveredFacility.clientY - 20)),
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: '#77847E' }}>
              [{hoveredFacility.facility.code}]
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 3,
                backgroundColor: hoveredFacility.facility.available_capacity > 0 ? '#E7F2EB' : '#FCECE9',
                color: hoveredFacility.facility.available_capacity > 0 ? '#2A6642' : '#BD3423',
              }}
            >
              {hoveredFacility.facility.operational_status}
            </span>
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: '#1C211F' }}>
            {hoveredFacility.facility.name}
          </div>

          <div style={{ fontSize: 11, color: '#68746E', marginTop: 1 }}>
            {hoveredFacility.facility.neighborhood_name} • {hoveredFacility.facility.facility_type.replace('_', ' ')}
          </div>

          <div style={{ marginTop: 6, fontSize: 11.5, color: '#1C211F' }}>
            Available Beds: <strong>{hoveredFacility.facility.available_capacity} free</strong> / {hoveredFacility.facility.total_capacity} total
          </div>

          <div style={{ marginTop: 4, fontSize: 10.5, color: '#66736D' }}>
            Access Roadway: <strong>{hoveredFacility.facility.access_road_status}</strong> • Channel: <strong>{hoveredFacility.facility.contact_channel}</strong>
          </div>

          <div style={{ marginTop: 6, fontSize: 10, color: '#888', fontStyle: 'italic' }}>
            Click facility to open clinical readiness panel
          </div>
        </div>
      )}

      {/* 6. COMPACT MAP LEGEND */}
      <div className="map-legend-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <strong style={{ fontSize: 11, color: '#1C211F', letterSpacing: '0.04em' }}>MAP LEGEND</strong>
          <button
            onClick={() => setShowLegend(!showLegend)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: '#77847E' }}
          >
            {showLegend ? 'Hide' : 'Show'}
          </button>
        </div>

        {showLegend && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#2A6642' }} />
              <span>Stable (Safe)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#CA8A04' }} />
              <span>Minor (P3)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#EA580C' }} />
              <span>Serious (P2)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#BD3423' }} />
              <span>Critical (P1)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <SkullIcon size={12} fill="#1C211F" stroke="#FFFFFF" />
              <span>Deceased</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Hospital size={11} color="#2A6642" />
              <span>Medical Clinic</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 12, height: 3, backgroundColor: '#BD3423', display: 'inline-block' }} />
              <span>Blocked Road</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 12, height: 3, backgroundColor: '#2A6642', display: 'inline-block' }} />
              <span>Evac Route</span>
            </div>
          </div>
        )}
      </div>

      {/* 7. SLIDE-OUT INSPECTOR DRAWER (Resident, Facility, Building, or Road) */}
      {(selectedResident || selectedFacility || selectedBuilding || selectedRoad) && (
        <div
          style={{
            position: 'absolute',
            top: 54,
            right: 14,
            width: 390,
            maxHeight: 'calc(100% - 74px)',
            backgroundColor: '#FFFFFF',
            border: '1px solid #D6CEBE',
            borderRadius: 6,
            boxShadow: '0 4px 24px rgba(0,0,0,0.14)',
            zIndex: 40,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Drawer Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #E5DFD2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#FAF8F3',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#77847E' }}>
              {selectedResident
                ? 'Resident Clinical Profile'
                : selectedFacility
                ? 'Medical Facility Telemetry'
                : selectedBuilding
                ? 'Structure Status'
                : 'Roadway Segment Inspector'}
            </div>
            <button
              onClick={() => {
                setSelectedResident(null);
                setSelectedFacility(null);
                setSelectedBuilding(null);
                setSelectedRoad(null);
                if (onSelectResident) onSelectResident(null);
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Drawer Body: Resident Inspector */}
          {selectedResident && (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: '#6E7A74' }}>
                    [{selectedResident.code}]
                  </span>
                  <TriageBadge triage={selectedResident.active_triage} isFatality={selectedResident.is_fatality} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1A211E', margin: 0 }}>
                  {selectedResident.full_name}
                </h3>
                <div style={{ fontSize: 12, color: '#6A7670', marginTop: 2 }}>
                  Age {selectedResident.age} • {selectedResident.gender} • {selectedResident.neighborhood_name}
                </div>
              </div>

              {/* Condition & Medical Presentation */}
              <div style={{ padding: 10, backgroundColor: '#FAF8F3', border: '1px solid #E2DBD0', borderRadius: 4, fontSize: 12 }}>
                <div style={{ fontWeight: 600, color: '#1C211F', marginBottom: 2 }}>
                  Medical Condition:
                </div>
                <div style={{ color: '#4B5751' }}>
                  {selectedResident.medical_condition}
                </div>
                {selectedResident.medical_history && (
                  <div style={{ marginTop: 6, fontSize: 11, color: '#6F7B75' }}>
                    <strong>History:</strong> {selectedResident.medical_history}
                  </div>
                )}
              </div>

              {/* Live Waveform & Physiological Monitor */}
              <VitalMonitor resident={selectedResident} compact />

              {/* Triage Decision Rationale */}
              <div style={{ fontSize: 12, color: '#4D5852', lineHeight: 1.4 }}>
                <span style={{ fontWeight: 600 }}>Triage Rationale: </span>
                {selectedResident.simulated_priority_reason}
              </div>

              {/* Destination & Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 6, borderTop: '1px solid #E5DFD2' }}>
                <div style={{ fontSize: 12, color: '#68746E' }}>
                  Assigned Facility: <strong>{selectedResident.assigned_facility_name || 'Autonomous determination'}</strong>
                </div>

                {!selectedResident.is_fatality && selectedResident.active_triage !== 'EXPECTANT' ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleSelectResident(selectedResident)}
                    style={{ width: '100%', fontSize: 12 }}
                  >
                    <Navigation size={13} />
                    <span>Highlight Evacuation Corridor on Map</span>
                  </button>
                ) : (
                  <div style={{ padding: 10, backgroundColor: '#EAECEB', border: '1px solid #C4C9C6', borderRadius: 4, fontSize: 12, color: '#444', textAlign: 'center', fontWeight: 600 }}>
                    Evacuation Transport Ineligible (Confirmed Deceased)
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  {onNavigateToEvac && !selectedResident.is_fatality && selectedResident.active_triage !== 'EXPECTANT' && (
                    <button
                      className="btn"
                      onClick={() => onNavigateToEvac(selectedResident.id)}
                      style={{ flex: 1, fontSize: 12 }}
                    >
                      <span>Route Logistics</span>
                    </button>
                  )}
                  {onNavigateToPatient && (
                    <button
                      className="btn"
                      onClick={() => onNavigateToPatient(selectedResident.id)}
                      style={{ flex: 1, fontSize: 12 }}
                    >
                      <Stethoscope size={13} />
                      <span>Full Record</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Drawer Body: Medical Facility Inspector */}
          {selectedFacility && (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <span className="mono" style={{ fontSize: 11, color: '#77847E' }}>[{selectedFacility.code}]</span>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A211E', marginTop: 2 }}>
                  {selectedFacility.name}
                </h3>
                <div style={{ fontSize: 12, color: '#66736D' }}>
                  {selectedFacility.neighborhood_name} • {selectedFacility.facility_type.replace('_', ' ')}
                </div>
              </div>

              {/* Bed Occupancy Meter */}
              <div style={{ padding: 12, backgroundColor: '#FAF8F3', border: '1px solid #DFD7C7', borderRadius: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                  <span>Capacity Status:</span>
                  <strong className="num">{selectedFacility.available_capacity} beds available</strong>
                </div>
                <div style={{ width: '100%', height: 8, backgroundColor: '#E0D8CB', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.round((selectedFacility.current_occupancy / selectedFacility.total_capacity) * 100)}%`,
                      height: '100%',
                      backgroundColor: selectedFacility.available_capacity <= 0 ? '#BD3423' : '#2A6642',
                    }}
                  />
                </div>
                <div style={{ fontSize: 11, color: '#7E8B85', marginTop: 6 }}>
                  Occupancy: {selectedFacility.current_occupancy} / {selectedFacility.total_capacity} total beds
                </div>
              </div>

              {/* Capabilities */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6A7670', marginBottom: 6 }}>
                  Clinical Capabilities
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {selectedFacility.capabilities.map((cap) => (
                    <span
                      key={cap}
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 3,
                        backgroundColor: '#EAE5D9',
                        color: '#444F49',
                      }}
                    >
                      {cap.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: 12, color: '#55615B' }}>
                <div>Operational Status: <strong>{selectedFacility.operational_status}</strong></div>
                <div>Access Roadway: <strong>{selectedFacility.access_road_status}</strong></div>
                <div>Radio Frequency: <strong>{selectedFacility.contact_channel}</strong></div>
              </div>
            </div>
          )}

          {/* Drawer Body: Road Inspector & Manual Blockage Toggle */}
          {selectedRoad && (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <span className="mono" style={{ fontSize: 11, color: '#77847E' }}>[{selectedRoad.code}]</span>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A211E', marginTop: 2 }}>
                  {selectedRoad.name}
                </h3>
                <div style={{ fontSize: 12, color: '#66736D' }}>
                  Type: {selectedRoad.road_type} • Length: {selectedRoad.distance}m
                </div>
              </div>

              <div
                style={{
                  padding: 12,
                  backgroundColor: selectedRoad.is_blocked ? '#FCECE9' : (selectedRoad.is_restricted ? '#FDF5E8' : '#E7F2EB'),
                  border: `1px solid ${selectedRoad.is_blocked ? '#F3B4AA' : (selectedRoad.is_restricted ? '#F0CD9E' : '#B8DCBF')}`,
                  borderRadius: 4,
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 700, color: selectedRoad.is_blocked ? '#BD3423' : (selectedRoad.is_restricted ? '#C7781C' : '#2A6642') }}>
                  Status: {selectedRoad.is_blocked ? 'BLOCKED / IMPASSABLE' : (selectedRoad.is_restricted ? 'RESTRICTED DETOUR' : 'OPEN & CLEAR')}
                </div>
                {selectedRoad.closure_reason && (
                  <div style={{ marginTop: 4, color: '#444' }}>
                    <strong>Reason:</strong> {selectedRoad.closure_reason}
                  </div>
                )}
              </div>

              {/* Manual Road Blockage Toggle Button */}
              <button
                className={`btn ${selectedRoad.is_blocked ? 'btn-primary' : 'btn-danger'}`}
                onClick={() => handleToggleBlockage(selectedRoad)}
                disabled={togglingRoad}
                style={{ width: '100%', fontSize: 12 }}
              >
                <AlertTriangle size={14} />
                <span>
                  {togglingRoad
                    ? 'Updating Roadway...'
                    : selectedRoad.is_blocked
                    ? 'Clear Blockage & Reopen Road'
                    : 'Report Emergency Blockage'}
                </span>
              </button>
            </div>
          )}

          {/* Drawer Body: Building Inspector */}
          {selectedBuilding && (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <span className="mono" style={{ fontSize: 11, color: '#77847E' }}>[{selectedBuilding.code}]</span>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A211E', marginTop: 2 }}>
                  {selectedBuilding.name}
                </h3>
                <div style={{ fontSize: 12, color: '#66736D' }}>
                  {selectedBuilding.neighborhood_name} • {selectedBuilding.building_type}
                </div>
              </div>

              <div style={{ padding: 10, backgroundColor: '#FAF8F3', border: '1px solid #DFD7C7', borderRadius: 4, fontSize: 12 }}>
                <div>Structural Integrity: <strong>{Math.round(selectedBuilding.structural_integrity * 100)}%</strong></div>
                <div>Damage Condition: <strong>{selectedBuilding.damage_severity}</strong></div>
                {selectedBuilding.damage_notes && (
                  <div style={{ marginTop: 4, color: '#6A564A' }}>
                    {selectedBuilding.damage_notes}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
