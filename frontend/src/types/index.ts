export type TriageCategory = 'STABLE' | 'MINIMAL' | 'DELAYED' | 'IMMEDIATE' | 'EXPECTANT';
export type EvacuationStatus = 'SHELTERED' | 'RECOMMENDED' | 'ASSIGNED' | 'IN_TRANSIT' | 'ARRIVED' | 'CANCELLED';
export type FacilityType = 'TRAUMA_CENTER' | 'COMMUNITY_HOSPITAL' | 'URGENT_CARE' | 'FIRST_AID' | 'DISPENSARY';
export type FacilityStatus = 'OPERATIONAL' | 'SURGE' | 'COMPROMISED' | 'OFFLINE';
export type RoadType = 'PRIMARY' | 'SECONDARY' | 'LANE' | 'BRIDGE';

export interface VillageSummary {
  village: {
    id: number;
    name: string;
    code: string;
    status: string;
    description: string;
    baseline_population: number;
  };
  metrics: {
    total_residents: number;
    residents_stable: number;
    residents_requiring_care: number;
    critical_residents: number;
    fatalities: number;
    medical_facilities_count: number;
    total_beds: number;
    occupied_beds: number;
    available_beds: number;
    open_road_blockages: number;
    restricted_roads: number;
    active_evacuation_assignments: number;
    total_incidents: number;
  };
  care_required_residents: Resident[];
  facilities: MedicalFacility[];
  recent_incidents: Incident[];
}

export interface VitalObservation {
  id: number;
  heart_rate: number;
  spo2: number;
  blood_pressure: string;
  systolic: number;
  diastolic: number;
  respiratory_rate: number;
  consciousness: 'ALERT' | 'VOICE_RESPONSIVE' | 'PAIN_RESPONSIVE' | 'UNRESPONSIVE';
  source_label: string;
  is_stale: boolean;
  notes: string;
  recorded_at: string;
}

export interface Resident {
  id: number;
  code: string;
  full_name: string;
  first_name: string;
  last_name: string;
  age: number;
  gender: string;
  medical_condition: string;
  baseline_condition: string;
  medical_history?: string;
  triage_category: TriageCategory;
  active_triage: TriageCategory;
  manual_priority_override?: TriageCategory | null;
  manual_override_reason?: string;
  simulated_priority_reason: string;
  evacuation_status: EvacuationStatus;
  is_fatality: boolean;
  x: number;
  y: number;
  neighborhood: number;
  neighborhood_name: string;
  building?: number;
  building_name?: string;
  assigned_facility?: number | null;
  assigned_facility_name?: string | null;
  latest_vitals?: VitalObservation | null;
  vital_observations?: VitalObservation[];
  evacuation_plan?: EvacuationPlan;
  active_assignment?: EvacuationAssignment | null;
  updated_at: string;
}

export interface MedicalFacility {
  id: number;
  code: string;
  name: string;
  facility_type: FacilityType;
  neighborhood_name: string;
  x: number;
  y: number;
  total_capacity: number;
  current_occupancy: number;
  available_capacity: number;
  capabilities: string[];
  operational_status: FacilityStatus;
  access_road_status: 'OPEN' | 'RESTRICTED' | 'BLOCKED';
  contact_channel: string;
  assigned_patients?: Resident[];
}

export interface Neighborhood {
  id: number;
  code: string;
  name: string;
  center_x: number;
  center_y: number;
  description: string;
  baseline_population: number;
}

export interface Building {
  id: number;
  code: string;
  name: string;
  building_type: string;
  neighborhood_name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  structural_integrity: number;
  is_damaged: boolean;
  damage_severity: string;
  damage_notes: string;
}

export interface RoadNode {
  id: number;
  code: string;
  name: string;
  x: number;
  y: number;
  node_type: string;
}

export interface RoadEdge {
  id: number;
  code: string;
  name: string;
  from_node: number;
  to_node: number;
  from_node_code?: string;
  to_node_code?: string;
  distance: number;
  base_travel_time: number;
  road_type: RoadType;
  is_blocked: boolean;
  is_restricted: boolean;
  hazard_level: number;
  closure_reason: string;
  coordinates: [number, number][];
}

export interface Hazard {
  id: number;
  code: string;
  hazard_type: string;
  epicenter_x: number;
  epicenter_y: number;
  radius: number;
  severity: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface RouteData {
  found: boolean;
  mode: 'safest' | 'shortest';
  distance: number;
  travel_time: number;
  hazard_penalty: number;
  nodes: { id: number; code: string; name: string; x: number; y: number }[];
  edges: { id: number; code: string; name: string; distance: number; hazard_level: number; is_restricted: boolean; closure_reason: string }[];
  coordinates: [number, number][];
  warnings: string[];
  explanation: string;
}

export interface FacilityEvaluation {
  facility: MedicalFacility;
  is_reachable: boolean;
  suitability_score: number;
  clinical_rationale: string;
  safest_route: RouteData;
  shortest_route: RouteData;
}

export interface EvacuationPlan {
  resident: {
    id: number;
    code: string;
    name: string;
    triage_category: TriageCategory;
    medical_condition: string;
    x: number;
    y: number;
  };
  origin_node: {
    id: number;
    name: string;
    code: string;
    x: number;
    y: number;
  };
  recommended_destination?: FacilityEvaluation;
  all_facility_evaluations: FacilityEvaluation[];
}

export interface EvacuationAssignment {
  id: number;
  resident: number;
  resident_name: string;
  resident_code: string;
  facility: number;
  facility_name: string;
  facility_code: string;
  vehicle?: number | null;
  vehicle_name?: string | null;
  vehicle_callsign?: string | null;
  responder?: number | null;
  responder_name?: string | null;
  responder_callsign?: string | null;
  status: EvacuationStatus;
  priority_tier: string;
  route_snapshot: RouteData;
  estimated_distance: number;
  estimated_travel_time: number;
  is_safest_route: boolean;
  hazard_avoidance_notes: string;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: number;
  code: string;
  name: string;
  vehicle_type: string;
  capacity: number;
  is_available: boolean;
  callsign: string;
  current_location_x: number;
  current_location_y: number;
}

export interface Responder {
  id: number;
  code: string;
  name: string;
  role: string;
  role_display: string;
  is_available: boolean;
  contact_callsign: string;
}

export interface IncidentPreview {
  status: 'preview';
  scenario_preset: string;
  preset_title: string;
  epicenter: { x: number; y: number };
  radius: number;
  summary: {
    total_residents_in_zone: number;
    estimated_fatalities: number;
    estimated_critical_immediate: number;
    estimated_delayed_urgent: number;
    estimated_minimal: number;
    estimated_unaffected: number;
    damaged_buildings_count: number;
    roads_blocked_count: number;
    roads_restricted_count: number;
  };
  affected_residents: {
    id: number;
    name: string;
    code: string;
    distance: number;
    estimated_triage: TriageCategory;
    current_triage: TriageCategory;
  }[];
  damaged_buildings: {
    id: number;
    name: string;
    code: string;
    distance: number;
    projected_damage: string;
  }[];
  blocked_roads: {
    id: number;
    name: string;
    code: string;
    projected_state: string;
    reason: string;
  }[];
  restricted_roads: {
    id: number;
    name: string;
    code: string;
    projected_state: string;
    reason: string;
  }[];
  facility_demands: {
    id: number;
    name: string;
    code: string;
    distance: number;
    available_capacity: number;
    projected_incoming_surge: number;
  }[];
  disclaimer: string;
}

export interface Incident {
  id: number;
  code: string;
  scenario_preset: string;
  preset_title: string;
  epicenter_x: number;
  epicenter_y: number;
  radius: number;
  affected_residents_count: number;
  casualties_count: number;
  fatalities_count: number;
  damaged_buildings_count: number;
  blocked_roads_count: number;
  critical_injuries_count?: number;
  serious_injuries_count?: number;
  minor_injuries_count?: number;
  residents_unaffected_count?: number;
  simulation_model_version: string;
  notes: string;
  confirmed_at: string;
  resident_outcomes?: {
    id: number;
    resident_name: string;
    resident_code: string;
    initial_triage: string;
    resulting_triage: string;
    distance_from_epicenter: number;
    injury_mechanism: string;
    vital_summary: string;
  }[];
}

export interface AuditEvent {
  id: number;
  event_type: string;
  summary: string;
  actor: string;
  payload: Record<string, any>;
  created_at: string;
}

export interface MapData {
  village: {
    id: number;
    name: string;
    bounds: { width: number; height: number };
    status: string;
  };
  neighborhoods: Neighborhood[];
  buildings: Building[];
  facilities: MedicalFacility[];
  residents: Resident[];
  road_nodes: RoadNode[];
  road_edges: RoadEdge[];
  hazards: Hazard[];
  active_routes: {
    assignment_id: number;
    resident_id: number;
    resident_name: string;
    facility_id: number;
    facility_name: string;
    status: string;
    priority_tier: string;
    coordinates: [number, number][];
  }[];
}
