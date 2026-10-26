from django.urls import path
from . import views

urlpatterns = [
    # Village summary and map data
    path("village/summary/", views.village_summary, name="village-summary"),
    path("village/map-data/", views.village_map_data, name="village-map-data"),
    path("village/reset/", views.reset_demo, name="reset-demo"),

    # Residents and vitals
    path("residents/", views.resident_list, name="resident-list"),
    path("residents/<int:pk>/", views.resident_detail, name="resident-detail"),
    path("residents/<int:pk>/override-triage/", views.resident_override_triage, name="resident-override-triage"),

    # Facilities
    path("facilities/", views.facility_list, name="facility-list"),
    path("facilities/<int:pk>/", views.facility_detail, name="facility-detail"),

    # Road network and blockages
    path("roads/", views.road_list, name="road-list"),
    path("roads/<int:pk>/toggle-blockage/", views.toggle_road_blockage, name="toggle-road-blockage"),

    # Simulation engine: Bombard
    path("incident/preview/", views.incident_preview, name="incident-preview"),
    path("incident/confirm/", views.incident_confirm, name="incident-confirm"),
    path("incidents/", views.incident_list, name="incident-list"),
    path("incidents/<int:pk>/", views.incident_detail, name="incident-detail"),

    # Evacuation and routing
    path("evacuations/", views.evacuation_list, name="evacuation-list"),
    path("evacuations/plan/", views.evacuation_plan, name="evacuation-plan"),
    path("evacuations/assign/", views.evacuation_assign, name="evacuation-assign"),

    # Responders & Vehicles
    path("responders-vehicles/", views.responders_vehicles, name="responders-vehicles"),

    # Audit log
    path("audit-events/", views.audit_events_list, name="audit-events-list"),
]
