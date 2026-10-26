from django.db import models
from django.utils import timezone


class Village(models.Model):
    name = models.CharField(max_length=100, default="Aster Vale")
    code = models.CharField(max_length=20, default="AV-01", unique=True)
    status = models.CharField(max_length=50, default="STABLE")
    description = models.TextField(blank=True, default="A resilient riverside settlement situated along the Aster River.")
    baseline_population = models.IntegerField(default=100)
    bounds_width = models.FloatField(default=1200.0)
    bounds_height = models.FloatField(default=800.0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.code})"


class Neighborhood(models.Model):
    village = models.ForeignKey(Village, on_delete=models.CASCADE, related_name="neighborhoods")
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100)
    center_x = models.FloatField()
    center_y = models.FloatField()
    description = models.TextField(blank=True)
    baseline_population = models.IntegerField(default=20)

    def __str__(self):
        return f"{self.name} [{self.code}]"


class Building(models.Model):
    BUILDING_TYPES = [
        ("RESIDENTIAL", "Residential"),
        ("COMMERCIAL", "Commercial / Market"),
        ("CIVIC", "Civic / Community"),
        ("FARM", "Agricultural / Farm"),
    ]
    DAMAGE_SEVERITIES = [
        ("NONE", "No Damage"),
        ("LIGHT", "Light Surface Debris"),
        ("MODERATE", "Moderate Structural Damage"),
        ("HEAVY", "Heavy Structural Compromise"),
        ("COLLAPSED", "Fully Collapsed"),
    ]

    village = models.ForeignKey(Village, on_delete=models.CASCADE, related_name="buildings")
    neighborhood = models.ForeignKey(Neighborhood, on_delete=models.CASCADE, related_name="buildings")
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=100)
    building_type = models.CharField(max_length=30, choices=BUILDING_TYPES, default="RESIDENTIAL")
    x = models.FloatField()
    y = models.FloatField()
    width = models.FloatField(default=40.0)
    height = models.FloatField(default=30.0)
    capacity = models.IntegerField(default=6)
    structural_integrity = models.FloatField(default=1.0)  # 0.0 to 1.0
    is_damaged = models.BooleanField(default=False)
    damage_severity = models.CharField(max_length=20, choices=DAMAGE_SEVERITIES, default="NONE")
    damage_notes = models.TextField(blank=True, default="")

    def __str__(self):
        return f"{self.name} ({self.code})"


class MedicalFacility(models.Model):
    FACILITY_TYPES = [
        ("TRAUMA_CENTER", "Emergency Field Trauma Center"),
        ("COMMUNITY_HOSPITAL", "Community Hospital"),
        ("URGENT_CARE", "Urgent Care & Triage Post"),
        ("FIRST_AID", "Convalescent & First Aid Station"),
        ("DISPENSARY", "Transit Relief Dispensary"),
    ]
    STATUS_CHOICES = [
        ("OPERATIONAL", "Fully Operational"),
        ("SURGE", "Surge Capacity Active"),
        ("COMPROMISED", "Compromised Access / Resources"),
        ("OFFLINE", "Offline / Evacuated"),
    ]
    ACCESS_CHOICES = [
        ("OPEN", "Unobstructed Access"),
        ("RESTRICTED", "Restricted / Detour Recommended"),
        ("BLOCKED", "Inaccessible"),
    ]

    village = models.ForeignKey(Village, on_delete=models.CASCADE, related_name="facilities")
    neighborhood = models.ForeignKey(Neighborhood, on_delete=models.CASCADE, related_name="facilities")
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=120)
    facility_type = models.CharField(max_length=30, choices=FACILITY_TYPES)
    x = models.FloatField()
    y = models.FloatField()
    total_capacity = models.IntegerField(default=10)
    current_occupancy = models.IntegerField(default=0)
    capabilities = models.JSONField(default=list)
    operational_status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="OPERATIONAL")
    access_road_status = models.CharField(max_length=30, choices=ACCESS_CHOICES, default="OPEN")
    contact_channel = models.CharField(max_length=50, default="VHF Ch-01")

    @property
    def available_capacity(self):
        return max(0, self.total_capacity - self.current_occupancy)

    def __str__(self):
        return f"{self.name} ({self.available_capacity}/{self.total_capacity} beds free)"


class Resident(models.Model):
    TRIAGE_CATEGORIES = [
        ("STABLE", "Stable / Verified Safe"),
        ("MINIMAL", "Minimal / Green"),
        ("DELAYED", "Delayed / Yellow"),
        ("IMMEDIATE", "Immediate / Red"),
        ("EXPECTANT", "Expectant / Deceased"),
    ]
    EVACUATION_STATUSES = [
        ("SHELTERED", "Sheltered / Safe In Place"),
        ("RECOMMENDED", "Evacuation Recommended"),
        ("ASSIGNED", "Assigned To Evacuation Unit"),
        ("IN_TRANSIT", "In Transit To Facility"),
        ("ARRIVED", "Arrived At Medical Facility"),
        ("CANCELLED", "Evacuation Cancelled"),
    ]

    village = models.ForeignKey(Village, on_delete=models.CASCADE, related_name="residents")
    neighborhood = models.ForeignKey(Neighborhood, on_delete=models.CASCADE, related_name="residents")
    building = models.ForeignKey(Building, on_delete=models.SET_NULL, null=True, blank=True, related_name="residents")
    code = models.CharField(max_length=30, unique=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    age = models.IntegerField()
    gender = models.CharField(max_length=20, default="Unspecified")
    medical_condition = models.CharField(max_length=150, default="Healthy / None reported")
    baseline_condition = models.CharField(max_length=150, default="Healthy")
    medical_history = models.TextField(blank=True, default="No significant chronic conditions.")
    triage_category = models.CharField(max_length=20, choices=TRIAGE_CATEGORIES, default="STABLE")
    simulated_priority_reason = models.TextField(blank=True, default="Vitals within normal physiological limits.")
    manual_priority_override = models.CharField(max_length=20, blank=True, null=True)
    manual_override_reason = models.TextField(blank=True, default="")
    manual_override_by = models.CharField(max_length=100, blank=True, default="")
    assigned_facility = models.ForeignKey(MedicalFacility, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_patients")
    evacuation_status = models.CharField(max_length=30, choices=EVACUATION_STATUSES, default="SHELTERED")
    is_fatality = models.BooleanField(default=False)
    x = models.FloatField()
    y = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def active_triage(self):
        return self.manual_priority_override or self.triage_category

    def __str__(self):
        return f"{self.full_name} [{self.code}] - {self.active_triage}"


class VitalObservation(models.Model):
    CONSCIOUSNESS_LEVELS = [
        ("ALERT", "Alert & Oriented"),
        ("VOICE_RESPONSIVE", "Responds to Voice"),
        ("PAIN_RESPONSIVE", "Responds only to Pain"),
        ("UNRESPONSIVE", "Unresponsive"),
    ]

    resident = models.ForeignKey(Resident, on_delete=models.CASCADE, related_name="vital_observations")
    heart_rate = models.IntegerField()  # bpm
    spo2 = models.IntegerField()  # %
    blood_pressure = models.CharField(max_length=20, default="120/80")
    systolic = models.IntegerField(default=120)
    diastolic = models.IntegerField(default=80)
    respiratory_rate = models.IntegerField(default=16)
    consciousness = models.CharField(max_length=30, choices=CONSCIOUSNESS_LEVELS, default="ALERT")
    source_label = models.CharField(max_length=60, default="Simulated Baseline Telemetry")
    is_stale = models.BooleanField(default=False)
    notes = models.TextField(blank=True, default="")
    recorded_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-recorded_at"]

    def __str__(self):
        return f"{self.resident.full_name}: HR {self.heart_rate}, SpO2 {self.spo2}%, BP {self.blood_pressure}"


class RoadNode(models.Model):
    NODE_TYPES = [
        ("INTERSECTION", "Road Intersection"),
        ("JUNCTION", "Transit Junction"),
        ("BRIDGE_ACCESS", "Bridge Crossing"),
        ("FACILITY_ACCESS", "Medical Facility Spur"),
        ("RESIDENTIAL_ACCESS", "Residential Cluster Spur"),
    ]

    village = models.ForeignKey(Village, on_delete=models.CASCADE, related_name="road_nodes")
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=100)
    x = models.FloatField()
    y = models.FloatField()
    node_type = models.CharField(max_length=30, choices=NODE_TYPES, default="INTERSECTION")

    def __str__(self):
        return f"{self.name} ({self.code})"


class RoadEdge(models.Model):
    ROAD_TYPES = [
        ("PRIMARY", "Primary Thoroughfare"),
        ("SECONDARY", "Secondary Way"),
        ("LANE", "Residential Lane"),
        ("BRIDGE", "River Bridge Crossing"),
    ]

    village = models.ForeignKey(Village, on_delete=models.CASCADE, related_name="road_edges")
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=100)
    from_node = models.ForeignKey(RoadNode, on_delete=models.CASCADE, related_name="outgoing_edges")
    to_node = models.ForeignKey(RoadNode, on_delete=models.CASCADE, related_name="incoming_edges")
    distance = models.FloatField()
    base_travel_time = models.FloatField(default=1.0)  # in minutes
    road_type = models.CharField(max_length=20, choices=ROAD_TYPES, default="SECONDARY")
    is_blocked = models.BooleanField(default=False)
    is_restricted = models.BooleanField(default=False)
    hazard_level = models.IntegerField(default=0)  # 0: safe, 1: low hazard, 2: medium hazard, 3: severe hazard
    closure_reason = models.TextField(blank=True, default="")
    coordinates = models.JSONField(default=list)  # list of [x, y] coordinates for SVG rendering

    def __str__(self):
        status = "BLOCKED" if self.is_blocked else ("RESTRICTED" if self.is_restricted else "OPEN")
        return f"{self.name} ({self.code}): {status}"


class Hazard(models.Model):
    HAZARD_TYPES = [
        ("BLAST_CRATER", "Blast Impact Crater"),
        ("DEBRIS_FALL", "Masonry & Structural Debris"),
        ("FIRE_HAZARD", "Active Structure Fire"),
        ("STRUCTURAL_COLLAPSE", "Unstable Façade Collapse"),
        ("FLOOD_SURGE", "Water Main Break"),
    ]
    SEVERITY_LEVELS = [
        ("LOW", "Low Risk"),
        ("MEDIUM", "Medium Hazard"),
        ("HIGH", "High Hazard"),
        ("CRITICAL", "Critical / Lethal Area"),
    ]

    village = models.ForeignKey(Village, on_delete=models.CASCADE, related_name="hazards")
    code = models.CharField(max_length=30, unique=True)
    hazard_type = models.CharField(max_length=30, choices=HAZARD_TYPES)
    epicenter_x = models.FloatField()
    epicenter_y = models.FloatField()
    radius = models.FloatField(default=60.0)
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS, default="HIGH")
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.hazard_type} at ({self.epicenter_x:.0f}, {self.epicenter_y:.0f}) - {self.severity}"


class Vehicle(models.Model):
    VEHICLE_TYPES = [
        ("AMBULANCE", "Rapid Response Ambulance"),
        ("EVAC_VAN", "Multi-Patient Field Evac Van"),
        ("RAPID_ROVER", "All-Terrain Emergency Rover"),
        ("UTILITY", "Utility Logistics Transporter"),
    ]

    village = models.ForeignKey(Village, on_delete=models.CASCADE, related_name="vehicles")
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=80)
    vehicle_type = models.CharField(max_length=30, choices=VEHICLE_TYPES, default="AMBULANCE")
    capacity = models.IntegerField(default=2)
    is_available = models.BooleanField(default=True)
    callsign = models.CharField(max_length=40, default="MED-01")
    current_location_x = models.FloatField(default=600.0)
    current_location_y = models.FloatField(default=400.0)

    def __str__(self):
        return f"{self.name} [{self.callsign}] ({'Available' if self.is_available else 'Dispatched'})"


class Responder(models.Model):
    ROLES = [
        ("LEAD_TRIAGE", "Lead Triage Physician"),
        ("PARAMEDIC", "Critical Care Paramedic"),
        ("MEDIC", "Field Response Medic"),
        ("EMT", "Emergency Medical Technician"),
        ("LOGISTICS", "Logistics & Route Coordinator"),
    ]

    village = models.ForeignKey(Village, on_delete=models.CASCADE, related_name="responders")
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=80)
    role = models.CharField(max_length=30, choices=ROLES, default="MEDIC")
    is_available = models.BooleanField(default=True)
    contact_callsign = models.CharField(max_length=40, default="DELTA-1")

    def __str__(self):
        return f"{self.name} ({self.get_role_display()})"


class Incident(models.Model):
    SCENARIO_PRESETS = [
        ("LOCALIZED", "Localized Detonation (Small Perimeter)"),
        ("MODERATE", "Moderate Munition Impact (Medium Radius)"),
        ("MAJOR", "Major Structural Blast (High Yield)"),
    ]

    village = models.ForeignKey(Village, on_delete=models.CASCADE, related_name="incidents")
    code = models.CharField(max_length=40, unique=True)
    scenario_preset = models.CharField(max_length=30, choices=SCENARIO_PRESETS)
    preset_title = models.CharField(max_length=120)
    epicenter_x = models.FloatField()
    epicenter_y = models.FloatField()
    radius = models.FloatField()
    affected_residents_count = models.IntegerField(default=0)
    casualties_count = models.IntegerField(default=0)
    fatalities_count = models.IntegerField(default=0)
    damaged_buildings_count = models.IntegerField(default=0)
    blocked_roads_count = models.IntegerField(default=0)
    simulation_model_version = models.CharField(max_length=30, default="AFTERLIGHT-DET-v1.1")
    notes = models.TextField(blank=True)
    confirmed_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Incident {self.code} [{self.scenario_preset}] at ({self.epicenter_x:.0f}, {self.epicenter_y:.0f})"


class IncidentResidentOutcome(models.Model):
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name="resident_outcomes")
    resident = models.ForeignKey(Resident, on_delete=models.CASCADE, related_name="incident_outcomes")
    initial_triage = models.CharField(max_length=20)
    resulting_triage = models.CharField(max_length=20)
    distance_from_epicenter = models.FloatField()
    injury_mechanism = models.CharField(max_length=150)
    vital_summary = models.CharField(max_length=200)

    def __str__(self):
        return f"{self.resident.full_name}: {self.initial_triage} -> {self.resulting_triage}"


class EvacuationAssignment(models.Model):
    ASSIGNMENT_STATUSES = [
        ("RECOMMENDED", "Recommended By Algorithm"),
        ("ASSIGNED", "Unit Assigned"),
        ("IN_TRANSIT", "In Transit"),
        ("ARRIVED", "Arrived At Medical Facility"),
        ("CANCELLED", "Cancelled"),
    ]

    village = models.ForeignKey(Village, on_delete=models.CASCADE, related_name="evacuation_assignments")
    resident = models.ForeignKey(Resident, on_delete=models.CASCADE, related_name="evacuation_assignments")
    facility = models.ForeignKey(MedicalFacility, on_delete=models.CASCADE, related_name="evacuation_assignments")
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True)
    responder = models.ForeignKey(Responder, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=30, choices=ASSIGNMENT_STATUSES, default="RECOMMENDED")
    priority_tier = models.CharField(max_length=20, default="DELAYED")
    route_snapshot = models.JSONField(default=dict)
    estimated_distance = models.FloatField(default=0.0)
    estimated_travel_time = models.FloatField(default=0.0)  # minutes
    is_safest_route = models.BooleanField(default=True)
    hazard_avoidance_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Evac {self.resident.full_name} -> {self.facility.name} [{self.status}]"


class AuditEvent(models.Model):
    EVENT_TYPES = [
        ("INCIDENT_COMMITTED", "Simulated Incident Committed"),
        ("TRIAGE_OVERRIDE", "Manual Triage Override"),
        ("ROAD_BLOCKAGE_REPORTED", "Road Blockage Reported"),
        ("ROAD_BLOCKAGE_CLEARED", "Road Blockage Cleared"),
        ("EVACUATION_STATUS_CHANGED", "Evacuation Assignment Updated"),
        ("DEMO_RESET", "Village Baseline Reset"),
        ("FACILITY_STATUS_UPDATED", "Facility Status Updated"),
    ]

    village = models.ForeignKey(Village, on_delete=models.CASCADE, related_name="audit_events")
    event_type = models.CharField(max_length=40, choices=EVENT_TYPES)
    summary = models.TextField()
    actor = models.CharField(max_length=80, default="Emergency Ops Controller")
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.created_at.strftime('%H:%M:%S')}] {self.event_type}: {self.summary[:50]}"
