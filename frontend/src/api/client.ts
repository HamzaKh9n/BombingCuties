import {
  VillageSummary, MapData, Resident, MedicalFacility, RoadEdge,
  Incident, IncidentPreview, EvacuationAssignment, EvacuationPlan,
  Vehicle, Responder, AuditEvent, TriageCategory
} from '../types';

const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/+$/, '')}/api`;
  }
  if (import.meta.env.DEV) {
    return '/api';
  }
  return 'https://bombingcuties.onrender.com/api';
};

const BASE_URL = getBaseUrl();

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errMsg = `Request failed: ${res.status} ${res.statusText}`;
    try {
      const errObj = await res.json();
      if (errObj.error) errMsg = errObj.error;
      else if (errObj.message) errMsg = errObj.message;
    } catch {
      // fallback
    }
    throw new Error(errMsg);
  }

  return res.json();
}

export const api = {
  getVillageSummary: () => fetchJson<VillageSummary>('/village/summary/'),
  getMapData: () => fetchJson<MapData>('/village/map-data/'),
  resetDemo: (actor: string = 'Demo Controller') =>
    fetchJson<{ status: string; message: string }>('/village/reset/', {
      method: 'POST',
      body: JSON.stringify({ actor }),
    }),

  getResidents: (params?: { triage?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.triage) query.set('triage', params.triage);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return fetchJson<Resident[]>(`/residents/${qs ? `?${qs}` : ''}`);
  },

  getResidentDetail: (id: number) => fetchJson<Resident>(`/residents/${id}/`),

  overrideTriage: (id: number, triage_category: TriageCategory, reason: string, actor: string = 'Field Triage Officer') =>
    fetchJson<Resident>(`/residents/${id}/override-triage/`, {
      method: 'POST',
      body: JSON.stringify({ triage_category, reason, actor }),
    }),

  getFacilities: () => fetchJson<MedicalFacility[]>('/facilities/'),
  getFacilityDetail: (id: number) => fetchJson<MedicalFacility>(`/facilities/${id}/`),

  getRoads: () => fetchJson<RoadEdge[]>('/roads/'),
  toggleRoadBlockage: (id: number, is_blocked?: boolean, reason: string = 'Manual status change', actor: string = 'Logistics Coordinator') =>
    fetchJson<RoadEdge>(`/roads/${id}/toggle-blockage/`, {
      method: 'POST',
      body: JSON.stringify({ is_blocked, reason, actor }),
    }),

  previewIncident: (x: number, y: number, preset: string) =>
    fetchJson<IncidentPreview>('/incident/preview/', {
      method: 'POST',
      body: JSON.stringify({ x, y, preset }),
    }),

  confirmIncident: (x: number, y: number, preset: string, actor: string = 'Emergency Ops Controller') =>
    fetchJson<{
      status: string;
      incident: Incident;
      affected_residents_count?: number;
      resident_outcomes?: Array<{ resident_id: number; name: string; triage_category: string; is_fatality: boolean }>;
    }>('/incident/confirm/', {
      method: 'POST',
      body: JSON.stringify({ x, y, preset, actor }),
    }),

  getIncidents: () => fetchJson<Incident[]>('/incidents/'),
  getIncidentDetail: (id: number) => fetchJson<Incident>(`/incidents/${id}/`),

  getEvacuations: () => fetchJson<EvacuationAssignment[]>('/evacuations/'),
  planEvacuation: (resident_id: number, facility_id?: number) =>
    fetchJson<EvacuationPlan>('/evacuations/plan/', {
      method: 'POST',
      body: JSON.stringify({ resident_id, facility_id }),
    }),

  assignEvacuation: (payload: {
    assignment_id?: number;
    resident_id?: number;
    facility_id?: number;
    vehicle_id?: number;
    responder_id?: number;
    status: string;
    actor?: string;
  }) =>
    fetchJson<EvacuationAssignment>('/evacuations/assign/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getRespondersVehicles: () =>
    fetchJson<{ responders: Responder[]; vehicles: Vehicle[] }>('/responders-vehicles/'),

  getAuditEvents: () => fetchJson<AuditEvent[]>('/audit-events/'),
};
