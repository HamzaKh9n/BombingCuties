import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { Sidebar, Destination } from './components/Sidebar';
import { BottomActionBar } from './components/BottomActionBar';
import { ResetModal } from './components/ResetModal';
import { MyRouteModal } from './components/MyRouteModal';
import { CheckVitalsModal } from './components/CheckVitalsModal';
import { AllVillagersModal } from './components/AllVillagersModal';
import { BombardModal } from './components/BombardModal';

import { OverviewView } from './views/OverviewView';
import { VillageMapView } from './views/VillageMapView';
import { PatientsView } from './views/PatientsView';
import { FacilitiesView } from './views/FacilitiesView';
import { EvacuationView } from './views/EvacuationView';
import { IncidentHistoryView } from './views/IncidentHistoryView';

import { VillageSummary, MapData, Resident } from './types';
import { api } from './api/client';

const CITIZEN_STORAGE_KEY = 'afterlight_active_citizen_id';

export const App: React.FC = () => {
  const [destination, setDestination] = useState<Destination>('map');
  const [summary, setSummary] = useState<VillageSummary | null>(null);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newlyAffectedIds, setNewlyAffectedIds] = useState<number[]>([]);

  // Persistent Citizen Perspective Identity (stored in localStorage)
  const [activeCitizenId, setActiveCitizenId] = useState<number>(() => {
    const saved = localStorage.getItem(CITIZEN_STORAGE_KEY);
    return saved ? Number(saved) : 7; // Default to Rowan Mercer (RES-007)
  });

  // Cross-screen contextual parameters
  const [selectedResidentId, setSelectedResidentId] = useState<number | null>(null);
  const [routeForResidentId, setRouteForResidentId] = useState<number | null>(null);
  const [extraParams, setExtraParams] = useState<any>(null);

  // Modal States
  const [showResetModal, setShowResetModal] = useState(false);
  const [showMyRouteModal, setShowMyRouteModal] = useState(false);
  const [showCheckVitalsModal, setShowCheckVitalsModal] = useState(false);
  const [showAllVillagersModal, setShowAllVillagersModal] = useState(false);
  const [showBombardModal, setShowBombardModal] = useState(false);
  const [isBombardmentActive, setIsBombardmentActive] = useState(false);

  // Single Source of Truth Fetcher
  const refreshAllState = useCallback(async () => {
    try {
      const [sumRes, mapRes] = await Promise.all([
        api.getVillageSummary(),
        api.getMapData(),
      ]);
      setSummary(sumRes);
      setMapData(mapRes);
      setError(null);
    } catch (err: any) {
      console.error('Failed to sync simulation state:', err);
      setError(err.message || 'Error connecting to simulation engine.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAllState();
  }, [refreshAllState]);

  // Save selected citizen to localStorage
  const handleSelectCitizen = (id: number) => {
    setActiveCitizenId(id);
    localStorage.setItem(CITIZEN_STORAGE_KEY, String(id));
  };

  // Find active citizen object from mapData residents
  const activeCitizen = useMemo<Resident | null>(() => {
    if (!mapData || !mapData.residents.length) return null;
    const found = mapData.residents.find((r) => r.id === activeCitizenId);
    return found || mapData.residents[0];
  }, [mapData, activeCitizenId]);

  // Handle Navigation with contextual params
  const handleNavigate = (dest: Destination, params?: any) => {
    setDestination(dest);
    setExtraParams(params || null);
    if (params?.residentId) {
      setSelectedResidentId(params.residentId);
    }
    if (params?.routeForResidentId) {
      setRouteForResidentId(params.routeForResidentId);
    } else if (dest !== 'map') {
      setRouteForResidentId(null);
    }
  };

  const handleOpenMyRouteOnMap = (resId: number) => {
    setRouteForResidentId(resId);
    setSelectedResidentId(resId);
    setDestination('map');
  };

  // Handle Baseline Demo Reset
  const handleConfirmReset = async () => {
    await api.resetDemo('Operations Controller');
    setSelectedResidentId(null);
    setExtraParams(null);
    setNewlyAffectedIds([]);
    await refreshAllState();
    setDestination('map');
  };

  return (
    <div className="app-container">
      {/* Top Header Bar */}
      <Header
        summary={summary}
        activeCitizen={activeCitizen}
        allResidents={mapData?.residents || []}
        onSelectCitizen={handleSelectCitizen}
        onResetClick={() => setShowResetModal(true)}
      />

      <div className="app-body">
        {/* Operational Sidebar */}
        <Sidebar
          currentDestination={destination}
          onNavigate={(dest) => handleNavigate(dest)}
          onOpenBombard={() => setShowBombardModal(true)}
          summary={summary}
        />

        {/* Main Operational Workspace */}
        <main className="app-workspace">
          {error && (
            <div style={{ padding: '12px 20px', backgroundColor: '#FCECE9', color: '#BD3423', borderBottom: '1px solid #F3B4AA', fontSize: 13 }}>
              <strong>Communication Error:</strong> {error}
            </div>
          )}

          {destination === 'overview' && (
            <OverviewView
              summary={summary}
              activeCitizen={activeCitizen}
              onNavigate={handleNavigate}
              onOpenMyRoute={() => handleOpenMyRouteOnMap(activeCitizenId)}
              onOpenCheckVitals={() => setShowCheckVitalsModal(true)}
              onOpenBombard={() => setShowBombardModal(true)}
            />
          )}

          {destination === 'map' && (
            <VillageMapView
              mapData={mapData}
              selectedResidentId={selectedResidentId}
              activeCitizenId={activeCitizenId}
              routeForResidentId={routeForResidentId}
              newlyAffectedIds={newlyAffectedIds}
              onSelectResident={(id) => setSelectedResidentId(id)}
              onNavigateToEvac={(resId) => handleNavigate('evacuation', { residentId: resId })}
              onNavigateToPatient={(resId) => handleNavigate('patients', { residentId: resId })}
              onRefreshData={refreshAllState}
            />
          )}

          {destination === 'patients' && (
            <PatientsView
              initialFilter={extraParams?.triage}
              selectedResidentId={selectedResidentId}
              onNavigate={handleNavigate}
              onRefreshSummary={refreshAllState}
            />
          )}

          {destination === 'facilities' && (
            <FacilitiesView
              onNavigate={handleNavigate}
              onSelectResident={(id) => setSelectedResidentId(id)}
            />
          )}

          {destination === 'evacuation' && (
            <EvacuationView
              initialResidentId={selectedResidentId || activeCitizenId}
              onNavigate={handleNavigate}
              onSelectResident={(id) => setSelectedResidentId(id)}
              onRefreshSummary={refreshAllState}
            />
          )}

          {destination === 'history' && (
            <IncidentHistoryView />
          )}
        </main>
      </div>

      {/* Persistent Fixed Bottom Action Bar */}
      <BottomActionBar
        activeCitizen={activeCitizen}
        summary={summary}
        onOpenMyRoute={() => handleOpenMyRouteOnMap(activeCitizenId)}
        onOpenCheckVitals={() => setShowCheckVitalsModal(true)}
        onOpenAllVillagers={() => setShowAllVillagersModal(true)}
        onOpenBombard={() => setShowBombardModal(true)}
        isBombardmentActive={isBombardmentActive}
      />

      {/* 1. My Route Modal */}
      <MyRouteModal
        isOpen={showMyRouteModal}
        onClose={() => setShowMyRouteModal(false)}
        activeCitizen={activeCitizen}
        onViewOnMap={(resId) => {
          handleOpenMyRouteOnMap(resId);
        }}
      />

      {/* 2. Check Vitals Modal */}
      <CheckVitalsModal
        isOpen={showCheckVitalsModal}
        onClose={() => setShowCheckVitalsModal(false)}
        activeCitizen={activeCitizen}
      />

      {/* 3. All Villagers Population Modal (Prioritizing critical/serious cases) */}
      <AllVillagersModal
        isOpen={showAllVillagersModal}
        onClose={() => setShowAllVillagersModal(false)}
        allResidents={mapData?.residents || []}
        activeCitizenId={activeCitizenId}
        onSelectResidentToInspect={(id) => setSelectedResidentId(id)}
        onViewOnMap={(id) => {
          setSelectedResidentId(id);
          setDestination('map');
        }}
      />

      {/* 4. Immersive Bombardment Map Modal (Replacing separate page) */}
      <BombardModal
        isOpen={showBombardModal}
        onClose={() => setShowBombardModal(false)}
        mapData={mapData}
        onIncidentCommitted={(affectedIds?: number[]) => {
          if (affectedIds && affectedIds.length > 0) {
            setNewlyAffectedIds(affectedIds);
            setTimeout(() => setNewlyAffectedIds([]), 8000);
          }
          refreshAllState();
        }}
        onImpactStateChange={(isImpacting) => setIsBombardmentActive(isImpacting)}
      />

      {/* 5. Reset Baseline Confirmation Modal */}
      <ResetModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleConfirmReset}
      />
    </div>
  );
};

export default App;
