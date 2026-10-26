import math
import random
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from simulation.models import (
    Village, Neighborhood, Building, MedicalFacility, Resident,
    VitalObservation, RoadNode, RoadEdge, Hazard, Vehicle, Responder,
    Incident, IncidentResidentOutcome, EvacuationAssignment, AuditEvent
)
from simulation.services.routing import GraphRouter


class Command(BaseCommand):
    help = "Seed Aster Vale village with deterministic baseline data (100 residents, 5 facilities, road graph)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Wipe existing village data and re-initialize pristine baseline",
        )

    def handle(self, *args, **options):
        self.stdout.write("Initializing Aster Vale simulation state...")

        with transaction.atomic():
            # Delete existing if reset requested or village exists
            Village.objects.filter(code="AV-01").delete()

            # 1. Village
            village = Village.objects.create(
                name="Aster Vale",
                code="AV-01",
                status="STABLE",
                description="A resilient fictional riverside settlement situated along the Aster River valley.",
                baseline_population=100,
                bounds_width=1200.0,
                bounds_height=800.0,
            )

            # 2. Five Neighborhoods
            neighborhoods_data = [
                {
                    "code": "NH-OT",
                    "name": "Old Town Quarter",
                    "center_x": 580.0,
                    "center_y": 420.0,
                    "description": "Dense central hub with village square, civic hall, and older stone structures.",
                    "baseline_population": 24,
                },
                {
                    "code": "NH-NT",
                    "name": "Northridge Terraces",
                    "center_x": 560.0,
                    "center_y": 170.0,
                    "description": "Elevated residential ridge north of the central river, offering terrace housing.",
                    "baseline_population": 22,
                },
                {
                    "code": "NH-MG",
                    "name": "Millbrook Glen",
                    "center_x": 230.0,
                    "center_y": 470.0,
                    "description": "Riverside hamlet with water mill, workshops, and cozy stone cottages.",
                    "baseline_population": 20,
                },
                {
                    "code": "NH-HM",
                    "name": "High Meadow",
                    "center_x": 930.0,
                    "center_y": 300.0,
                    "description": "Spacious eastern farmland and orchards with dispersed farmhouse homesteads.",
                    "baseline_population": 18,
                },
                {
                    "code": "NH-SR",
                    "name": "Southgate Reach",
                    "center_x": 750.0,
                    "center_y": 640.0,
                    "description": "Southern residential development and transit crossroads leading to outer access routes.",
                    "baseline_population": 16,
                },
            ]

            neighborhood_map = {}
            for nh_dict in neighborhoods_data:
                nh = Neighborhood.objects.create(village=village, **nh_dict)
                neighborhood_map[nh.code] = nh

            # 3. Medical Facilities (5 facilities distributed geographically)
            facilities_data = [
                {
                    "code": "FAC-01",
                    "name": "St. Jude Emergency Field Clinic",
                    "neighborhood": neighborhood_map["NH-OT"],
                    "facility_type": "TRAUMA_CENTER",
                    "x": 620.0,
                    "y": 380.0,
                    "total_capacity": 8,
                    "current_occupancy": 1,  # Housing Thomas Sterling's referral
                    "capabilities": [
                        "ADVANCED_TRAUMA",
                        "SURGICAL_REDUCTION",
                        "VENTILATION",
                        "BLOOD_TRANSFUSION",
                        "BURN_CARE"
                    ],
                    "operational_status": "OPERATIONAL",
                    "access_road_status": "OPEN",
                    "contact_channel": "VHF Ch-01",
                },
                {
                    "code": "FAC-02",
                    "name": "Aster Vale Community Hospital",
                    "neighborhood": neighborhood_map["NH-NT"],
                    "facility_type": "COMMUNITY_HOSPITAL",
                    "x": 590.0,
                    "y": 140.0,
                    "total_capacity": 12,
                    "current_occupancy": 1,  # Housing Clara Vane's care
                    "capabilities": [
                        "GENERAL_MEDICINE",
                        "OXYGEN_THERAPY",
                        "WOUND_STABILIZATION",
                        "PEDIATRIC_CARE",
                        "OBSERVATION_WARD"
                    ],
                    "operational_status": "OPERATIONAL",
                    "access_road_status": "OPEN",
                    "contact_channel": "VHF Ch-02",
                },
                {
                    "code": "FAC-03",
                    "name": "Millbrook Urgent Care & Triage Post",
                    "neighborhood": neighborhood_map["NH-MG"],
                    "facility_type": "URGENT_CARE",
                    "x": 210.0,
                    "y": 440.0,
                    "total_capacity": 6,
                    "current_occupancy": 0,
                    "capabilities": [
                        "WOUND_STABILIZATION",
                        "TRIAGE_TRANSFER",
                        "MINOR_SURGERY",
                        "FRACTURE_SPLINTING"
                    ],
                    "operational_status": "OPERATIONAL",
                    "access_road_status": "OPEN",
                    "contact_channel": "VHF Ch-03",
                },
                {
                    "code": "FAC-04",
                    "name": "High Meadow Convalescent & First Aid Station",
                    "neighborhood": neighborhood_map["NH-HM"],
                    "facility_type": "FIRST_AID",
                    "x": 960.0,
                    "y": 270.0,
                    "total_capacity": 5,
                    "current_occupancy": 0,
                    "capabilities": [
                        "BASIC_STABILIZATION",
                        "TRIAGE_TRANSFER",
                        "AMBULATORY_CARE",
                        "FIRST_AID"
                    ],
                    "operational_status": "OPERATIONAL",
                    "access_road_status": "OPEN",
                    "contact_channel": "VHF Ch-04",
                },
                {
                    "code": "FAC-05",
                    "name": "Southgate Transit Relief Dispensary",
                    "neighborhood": neighborhood_map["NH-SR"],
                    "facility_type": "DISPENSARY",
                    "x": 780.0,
                    "y": 660.0,
                    "total_capacity": 6,
                    "current_occupancy": 0,
                    "capabilities": [
                        "TRIAGE_TRANSFER",
                        "MEDICATION_DISPENSING",
                        "BASIC_STABILIZATION",
                        "HEAT_EXHAUSTION_CARE"
                    ],
                    "operational_status": "OPERATIONAL",
                    "access_road_status": "OPEN",
                    "contact_channel": "VHF Ch-05",
                },
            ]

            facility_map = {}
            for fac_dict in facilities_data:
                fac = MedicalFacility.objects.create(village=village, **fac_dict)
                facility_map[fac.code] = fac

            # 4. Buildings (40 distinct structures across neighborhoods)
            buildings_specs = [
                # Old Town (10 buildings)
                ("BLD-OT-01", "Town Hall & Bell Tower", "CIVIC", "NH-OT", 550.0, 390.0, 50.0, 40.0, 8),
                ("BLD-OT-02", "Market Colonnade", "COMMERCIAL", "NH-OT", 530.0, 450.0, 45.0, 35.0, 6),
                ("BLD-OT-03", "Cobblestone Row A", "RESIDENTIAL", "NH-OT", 620.0, 440.0, 40.0, 30.0, 6),
                ("BLD-OT-04", "Cobblestone Row B", "RESIDENTIAL", "NH-OT", 670.0, 430.0, 40.0, 30.0, 6),
                ("BLD-OT-05", "Old Quarter Lofts", "RESIDENTIAL", "NH-OT", 580.0, 480.0, 45.0, 32.0, 6),
                ("BLD-OT-06", "St. Jude Clinic Pavilion", "CIVIC", "NH-OT", 620.0, 380.0, 50.0, 40.0, 10),
                ("BLD-OT-07", "Guild Merchant House", "COMMERCIAL", "NH-OT", 500.0, 420.0, 38.0, 30.0, 4),
                ("BLD-OT-08", "Old Town Bakehouse", "COMMERCIAL", "NH-OT", 515.0, 465.0, 36.0, 28.0, 4),
                ("BLD-OT-09", "Weaver's Guild Hall", "COMMERCIAL", "NH-OT", 645.0, 470.0, 42.0, 30.0, 5),
                ("BLD-OT-10", "Central Apothecary", "COMMERCIAL", "NH-OT", 590.0, 355.0, 36.0, 28.0, 4),

                # Northridge (8 buildings)
                ("BLD-NT-01", "Northridge Terrace House 1", "RESIDENTIAL", "NH-NT", 510.0, 190.0, 42.0, 30.0, 6),
                ("BLD-NT-02", "Northridge Terrace House 2", "RESIDENTIAL", "NH-NT", 570.0, 195.0, 42.0, 30.0, 6),
                ("BLD-NT-03", "Pine Crest Manor", "RESIDENTIAL", "NH-NT", 640.0, 180.0, 46.0, 32.0, 6),
                ("BLD-NT-04", "Northridge Viewpoint Villa", "RESIDENTIAL", "NH-NT", 460.0, 160.0, 40.0, 28.0, 5),
                ("BLD-NT-05", "Aster Vale Hospital Wing", "CIVIC", "NH-NT", 590.0, 140.0, 55.0, 45.0, 15),
                ("BLD-NT-06", "High Terrace Villa", "RESIDENTIAL", "NH-NT", 525.0, 135.0, 38.0, 28.0, 4),
                ("BLD-NT-07", "Orchard View Cottage", "RESIDENTIAL", "NH-NT", 680.0, 155.0, 36.0, 26.0, 4),
                ("BLD-NT-08", "Pine Hill Lodge", "RESIDENTIAL", "NH-NT", 480.0, 215.0, 40.0, 30.0, 5),

                # Millbrook Glen (8 buildings)
                ("BLD-MG-01", "The Old Flour Mill", "COMMERCIAL", "NH-MG", 270.0, 440.0, 45.0, 35.0, 5),
                ("BLD-MG-02", "Millbrook Riverside Cottage", "RESIDENTIAL", "NH-MG", 220.0, 500.0, 38.0, 28.0, 5),
                ("BLD-MG-03", "Weaver's Row House", "RESIDENTIAL", "NH-MG", 170.0, 470.0, 38.0, 28.0, 5),
                ("BLD-MG-04", "Sterling Mill Farmstead", "FARM", "NH-MG", 160.0, 520.0, 44.0, 34.0, 6),
                ("BLD-MG-05", "Millbrook Urgent Care Annex", "CIVIC", "NH-MG", 210.0, 440.0, 42.0, 30.0, 8),
                ("BLD-MG-06", "The Miller's Residence", "RESIDENTIAL", "NH-MG", 305.0, 475.0, 38.0, 28.0, 4),
                ("BLD-MG-07", "Willow Creek Cottage", "RESIDENTIAL", "NH-MG", 250.0, 540.0, 36.0, 26.0, 4),
                ("BLD-MG-08", "West Bridge Fishery", "COMMERCIAL", "NH-MG", 320.0, 395.0, 40.0, 28.0, 4),

                # High Meadow (7 buildings)
                ("BLD-HM-01", "High Meadow Apple Barn", "FARM", "NH-HM", 910.0, 240.0, 50.0, 35.0, 6),
                ("BLD-HM-02", "Sunny Slope Farmhouse", "RESIDENTIAL", "NH-HM", 970.0, 320.0, 42.0, 30.0, 6),
                ("BLD-HM-03", "Pasture Green Homestead", "RESIDENTIAL", "NH-HM", 880.0, 340.0, 40.0, 30.0, 6),
                ("BLD-HM-04", "Convalescent Station House", "CIVIC", "NH-HM", 960.0, 270.0, 45.0, 32.0, 8),
                ("BLD-HM-05", "Cider Press House", "FARM", "NH-HM", 990.0, 215.0, 40.0, 30.0, 5),
                ("BLD-HM-06", "Meadow View Homestead", "RESIDENTIAL", "NH-HM", 930.0, 385.0, 38.0, 28.0, 4),
                ("BLD-HM-07", "Eastern Ridge Byre", "FARM", "NH-HM", 840.0, 380.0, 42.0, 32.0, 5),

                # Southgate Reach (7 buildings)
                ("BLD-SR-01", "Southgate Tollhouse & Depot", "COMMERCIAL", "NH-SR", 720.0, 610.0, 40.0, 30.0, 5),
                ("BLD-SR-02", "South Avenue Residences A", "RESIDENTIAL", "NH-SR", 780.0, 600.0, 42.0, 30.0, 6),
                ("BLD-SR-03", "South Avenue Residences B", "RESIDENTIAL", "NH-SR", 810.0, 660.0, 42.0, 30.0, 6),
                ("BLD-SR-04", "Transit Dispensary Post", "CIVIC", "NH-SR", 780.0, 660.0, 42.0, 32.0, 8),
                ("BLD-SR-05", "Wagoner's Rest Inn", "COMMERCIAL", "NH-SR", 685.0, 640.0, 42.0, 30.0, 5),
                ("BLD-SR-06", "Southgate Coach House", "COMMERCIAL", "NH-SR", 745.0, 680.0, 40.0, 28.0, 4),
                ("BLD-SR-07", "Perimeter Way Cottages", "RESIDENTIAL", "NH-SR", 830.0, 590.0, 38.0, 28.0, 4),
            ]

            building_map = {}
            for code, name, btype, nh_code, bx, by, bw, bh, cap in buildings_specs:
                bld = Building.objects.create(
                    village=village,
                    neighborhood=neighborhood_map[nh_code],
                    code=code,
                    name=name,
                    building_type=btype,
                    x=bx,
                    y=by,
                    width=bw,
                    height=bh,
                    capacity=cap,
                    structural_integrity=1.0,
                    is_damaged=False,
                    damage_severity="NONE",
                )
                building_map[code] = bld

            # 5. Road Graph (Nodes and Edges)
            nodes_specs = [
                # Central and Bridges
                ("N-CENTRAL-SQ", "Old Town Central Square", 560.0, 420.0, "INTERSECTION"),
                ("N-OLDTOWN-E", "Old Town East Junction", 660.0, 420.0, "INTERSECTION"),
                ("N-OLDTOWN-W", "Old Town West Junction", 480.0, 420.0, "INTERSECTION"),
                ("N-OLDTOWN-S", "Old Town South Gate Spur", 560.0, 520.0, "JUNCTION"),
                ("N-BRIDGE-NORTH", "Aster River North Bridgehead", 560.0, 270.0, "BRIDGE_ACCESS"),
                ("N-BRIDGE-SOUTH", "Aster River South Bridgehead", 560.0, 340.0, "BRIDGE_ACCESS"),
                ("N-WEST-BRIDGE-N", "Millbrook West Bridge North", 350.0, 310.0, "BRIDGE_ACCESS"),
                ("N-WEST-BRIDGE-S", "Millbrook West Bridge South", 350.0, 380.0, "BRIDGE_ACCESS"),

                # Old Town Inner Side Streets
                ("N-OT-GUILD", "Guild Square Lane", 510.0, 470.0, "RESIDENTIAL_ACCESS"),
                ("N-OT-CLINIC-REAR", "St. Jude Emergency Bay", 640.0, 360.0, "FACILITY_ACCESS"),
                ("N-OT-NORTH-ALLEY", "North Bell Lane", 550.0, 360.0, "JUNCTION"),

                # Northridge Nodes
                ("N-NORTH-RIDGE", "Northridge Ridge Junction", 560.0, 200.0, "INTERSECTION"),
                ("N-NORTH-HOSP", "Community Hospital Approach", 590.0, 160.0, "FACILITY_ACCESS"),
                ("N-NORTH-WEST", "Northridge West Villas", 480.0, 180.0, "RESIDENTIAL_ACCESS"),
                ("N-NORTH-EAST", "Northridge Pine Crest", 650.0, 190.0, "RESIDENTIAL_ACCESS"),
                ("N-NT-UPPER-TERRACE", "Northridge Upper Promenade", 520.0, 140.0, "RESIDENTIAL_ACCESS"),
                ("N-NT-CREST-EAST", "Pine Crest Lookout", 670.0, 150.0, "JUNCTION"),

                # Millbrook Nodes
                ("N-MILL-MAIN", "Millbrook Village Crossing", 240.0, 450.0, "INTERSECTION"),
                ("N-MILL-CLINIC", "Millbrook Urgent Care Spur", 210.0, 430.0, "FACILITY_ACCESS"),
                ("N-MILL-FARM", "Sterling Farmstead Road", 180.0, 510.0, "RESIDENTIAL_ACCESS"),
                ("N-MILL-EAST", "Millbrook East Way", 360.0, 450.0, "JUNCTION"),
                ("N-MILL-WEIR", "Millbrook Weir Crossing", 300.0, 480.0, "JUNCTION"),
                ("N-MILL-WEST-RIVER", "Riverside Meadow Reach", 160.0, 420.0, "RESIDENTIAL_ACCESS"),

                # High Meadow Nodes
                ("N-MEADOW-CROSS", "High Meadow Crossroads", 880.0, 320.0, "INTERSECTION"),
                ("N-MEADOW-STN", "First Aid Station Approach", 960.0, 290.0, "FACILITY_ACCESS"),
                ("N-MEADOW-NORTH", "Apple Orchard Lane", 910.0, 230.0, "RESIDENTIAL_ACCESS"),
                ("N-MEADOW-SOUTH", "Pasture South Junction", 870.0, 440.0, "JUNCTION"),
                ("N-HM-UPPER-ORCHARD", "Upper Apple Ridge", 980.0, 200.0, "RESIDENTIAL_ACCESS"),
                ("N-HM-LOWER-PASTURE", "South Meadow Byre", 940.0, 400.0, "JUNCTION"),

                # Southgate Nodes
                ("N-SOUTH-CROSS", "Southgate Avenue Crossing", 740.0, 610.0, "INTERSECTION"),
                ("N-SOUTH-DISP", "Southgate Dispensary Approach", 780.0, 640.0, "FACILITY_ACCESS"),
                ("N-SOUTH-WEST", "Southgate West Link", 630.0, 610.0, "JUNCTION"),
                ("N-SOUTH-EAST", "Southgate Peripheral Way", 830.0, 650.0, "RESIDENTIAL_ACCESS"),
                ("N-SR-DEPOT-WEST", "Transit Freight Yard", 670.0, 670.0, "JUNCTION"),
                ("N-SR-EAST-AVENUE", "Southgate Common Way", 800.0, 570.0, "JUNCTION"),

                # Arterial Connectors
                ("N-CONNECTOR-MW", "Mid-West River Lane", 420.0, 420.0, "JUNCTION"),
                ("N-CONNECTOR-ME", "Mid-East Meadow Lane", 770.0, 370.0, "JUNCTION"),
            ]

            node_map = {}
            for code, name, nx, ny, ntype in nodes_specs:
                node = RoadNode.objects.create(
                    village=village,
                    code=code,
                    name=name,
                    x=nx,
                    y=ny,
                    node_type=ntype,
                )
                node_map[code] = node

            # Helper for edge generation
            edges_specs = [
                # Bridge crossings
                ("E-BRIDGE-MAIN", "Great Aster Stone Bridge", "N-BRIDGE-SOUTH", "N-BRIDGE-NORTH", "BRIDGE", 1.2),
                ("E-BRIDGE-WEST", "Millbrook Timber Bridge", "N-WEST-BRIDGE-S", "N-WEST-BRIDGE-N", "BRIDGE", 1.0),

                # Old Town Core & Alleys
                ("E-OT-SQ-E", "High Street East", "N-CENTRAL-SQ", "N-OLDTOWN-E", "PRIMARY", 1.0),
                ("E-OT-SQ-W", "High Street West", "N-CENTRAL-SQ", "N-OLDTOWN-W", "PRIMARY", 1.0),
                ("E-OT-SQ-BR", "Market Bridge Approach", "N-CENTRAL-SQ", "N-BRIDGE-SOUTH", "PRIMARY", 0.8),
                ("E-OT-SQ-S", "South Abbey Lane", "N-CENTRAL-SQ", "N-OLDTOWN-S", "SECONDARY", 1.1),
                ("E-OT-E-FAC", "St. Jude Clinic Spur", "N-OLDTOWN-E", "N-CONNECTOR-ME", "SECONDARY", 1.2),
                ("E-OT-GUILD-W", "Guild Court Lane", "N-OLDTOWN-W", "N-OT-GUILD", "LANE", 0.6),
                ("E-OT-GUILD-S", "Cobblestone Mews", "N-OT-GUILD", "N-OLDTOWN-S", "LANE", 0.7),
                ("E-OT-BELL-SQ", "Bell Tower Alley", "N-CENTRAL-SQ", "N-OT-NORTH-ALLEY", "LANE", 0.5),
                ("E-OT-BELL-BR", "Abbey River Walk", "N-OT-NORTH-ALLEY", "N-BRIDGE-SOUTH", "LANE", 0.6),
                ("E-OT-CLINIC-BAY", "Clinic Ambulance Spur", "N-OLDTOWN-E", "N-OT-CLINIC-REAR", "LANE", 0.5),

                # Northridge Network & Terraces
                ("E-NT-BR-RIDGE", "North Ridge Ascent", "N-BRIDGE-NORTH", "N-NORTH-RIDGE", "PRIMARY", 0.9),
                ("E-NT-RIDGE-HOSP", "Hospital Avenue", "N-NORTH-RIDGE", "N-NORTH-HOSP", "PRIMARY", 0.6),
                ("E-NT-RIDGE-W", "West Terrace Walk", "N-NORTH-RIDGE", "N-NORTH-WEST", "LANE", 0.9),
                ("E-NT-RIDGE-E", "Pine Crest Way", "N-NORTH-RIDGE", "N-NORTH-EAST", "LANE", 1.0),
                ("E-NT-W-WBRIDGE", "Terrace River Descent", "N-NORTH-WEST", "N-WEST-BRIDGE-N", "SECONDARY", 1.4),
                ("E-NT-W-UPPER", "Upper Terrace Ascent", "N-NORTH-WEST", "N-NT-UPPER-TERRACE", "LANE", 0.7),
                ("E-NT-UPPER-HOSP", "Hospital Terrace Access", "N-NT-UPPER-TERRACE", "N-NORTH-HOSP", "LANE", 0.6),
                ("E-NT-HOSP-CREST", "Pine Crest Ridge Line", "N-NORTH-HOSP", "N-NT-CREST-EAST", "LANE", 0.7),
                ("E-NT-CREST-E", "Pine Crest Loop", "N-NT-CREST-EAST", "N-NORTH-EAST", "LANE", 0.6),

                # Millbrook Network & Waterways
                ("E-MG-WBR-S", "Millbrook Approach Way", "N-WEST-BRIDGE-S", "N-MILL-EAST", "SECONDARY", 0.8),
                ("E-MG-EAST-MAIN", "Mill Road", "N-MILL-EAST", "N-MILL-MAIN", "PRIMARY", 1.2),
                ("E-MG-MAIN-CLINIC", "Urgent Care Spur", "N-MILL-MAIN", "N-MILL-CLINIC", "SECONDARY", 0.4),
                ("E-MG-MAIN-FARM", "Farmstead Lane", "N-MILL-MAIN", "N-MILL-FARM", "LANE", 0.8),
                ("E-MG-EAST-OTW", "West Valley Way", "N-MILL-EAST", "N-CONNECTOR-MW", "PRIMARY", 1.0),
                ("E-OT-W-CONN", "Old Town West Connection", "N-CONNECTOR-MW", "N-OLDTOWN-W", "PRIMARY", 0.8),
                ("E-MG-MAIN-WEIR", "Weir Lane", "N-MILL-MAIN", "N-MILL-WEIR", "LANE", 0.6),
                ("E-MG-WEIR-FARM", "Farmstead Reach", "N-MILL-WEIR", "N-MILL-FARM", "LANE", 0.8),
                ("E-MG-CLINIC-RIVER", "Urgent Care River Walk", "N-MILL-CLINIC", "N-MILL-WEST-RIVER", "LANE", 0.5),
                ("E-MG-RIVER-WBR", "West Bank Footway", "N-MILL-WEST-RIVER", "N-WEST-BRIDGE-S", "LANE", 1.0),

                # High Meadow Network & Orchards
                ("E-HM-CONN-MEAD", "Meadow Highway", "N-CONNECTOR-ME", "N-MEADOW-CROSS", "PRIMARY", 1.3),
                ("E-HM-CROSS-STN", "Convalescent Spur", "N-MEADOW-CROSS", "N-MEADOW-STN", "SECONDARY", 0.7),
                ("E-HM-CROSS-N", "Orchard Lane", "N-MEADOW-CROSS", "N-MEADOW-NORTH", "LANE", 0.9),
                ("E-HM-CROSS-S", "Pasture Byway", "N-MEADOW-CROSS", "N-MEADOW-SOUTH", "SECONDARY", 1.2),
                ("E-HM-ORCH-UPPER", "Cider Press Way", "N-MEADOW-NORTH", "N-HM-UPPER-ORCHARD", "LANE", 0.8),
                ("E-HM-UPPER-STN", "First Aid Upper Link", "N-HM-UPPER-ORCHARD", "N-MEADOW-STN", "LANE", 0.7),
                ("E-HM-STN-PASTURE", "Pasture Cut-through", "N-MEADOW-STN", "N-HM-LOWER-PASTURE", "LANE", 0.8),
                ("E-HM-PASTURE-S", "Low Meadow Run", "N-HM-LOWER-PASTURE", "N-MEADOW-SOUTH", "LANE", 0.7),

                # Southgate Network & Crossings
                ("E-SR-OT-SOUTH", "Old Town South Way", "N-OLDTOWN-S", "N-SOUTH-WEST", "PRIMARY", 1.2),
                ("E-SR-WEST-CROSS", "Southgate Grand Avenue", "N-SOUTH-WEST", "N-SOUTH-CROSS", "PRIMARY", 1.1),
                ("E-SR-CROSS-DISP", "Dispensary Access Lane", "N-SOUTH-CROSS", "N-SOUTH-DISP", "SECONDARY", 0.5),
                ("E-SR-CROSS-EAST", "South Gate Perimeter", "N-SOUTH-CROSS", "N-SOUTH-EAST", "SECONDARY", 0.9),
                ("E-SR-SW-DEPOT", "Depot Access Lane", "N-SOUTH-WEST", "N-SR-DEPOT-WEST", "LANE", 0.6),
                ("E-SR-DEPOT-CROSS", "Yard Connector", "N-SR-DEPOT-WEST", "N-SOUTH-CROSS", "LANE", 0.7),
                ("E-SR-CROSS-EAVE", "East Common Lane", "N-SOUTH-CROSS", "N-SR-EAST-AVENUE", "LANE", 0.6),
                ("E-SR-EAVE-MEAD", "South Ridge Connector", "N-SR-EAST-AVENUE", "N-CONNECTOR-ME", "SECONDARY", 1.4),

                # Outer Circumferential Connectors
                ("E-CIRC-SE-HM", "East Valley Artery", "N-MEADOW-SOUTH", "N-SOUTH-EAST", "SECONDARY", 1.8),
                ("E-CIRC-SW-MILL", "South Mill Connector", "N-MILL-FARM", "N-SOUTH-WEST", "SECONDARY", 2.2),
            ]

            for code, name, u_code, v_code, rtype, ttime in edges_specs:
                u_node = node_map[u_code]
                v_node = node_map[v_code]
                dist = math.sqrt((u_node.x - v_node.x) ** 2 + (u_node.y - v_node.y) ** 2)

                # Road path coordinates
                coords = [[u_node.x, u_node.y], [v_node.x, v_node.y]]

                RoadEdge.objects.create(
                    village=village,
                    code=code,
                    name=name,
                    from_node=u_node,
                    to_node=v_node,
                    distance=round(dist, 1),
                    base_travel_time=ttime,
                    road_type=rtype,
                    is_blocked=False,
                    is_restricted=False,
                    hazard_level=0,
                    closure_reason="",
                    coordinates=coords,
                )

            # 6. Vehicles (4 emergency response units)
            vehicles_specs = [
                ("VEH-01", "Ambulance Unit Alpha", "AMBULANCE", 2, "MED-ALPHA", 610.0, 390.0),
                ("VEH-02", "Field Evac Van Beta", "EVAC_VAN", 4, "EVAC-BETA", 580.0, 150.0),
                ("VEH-03", "All-Terrain Rover Gamma", "RAPID_ROVER", 2, "ROVER-GAMMA", 220.0, 450.0),
                ("VEH-04", "Utility Transport Delta", "UTILITY", 3, "LOG-DELTA", 770.0, 650.0),
            ]
            vehicle_objs = {}
            for vcode, vname, vtype, cap, csign, vx, vy in vehicles_specs:
                veh = Vehicle.objects.create(
                    village=village,
                    code=vcode,
                    name=vname,
                    vehicle_type=vtype,
                    capacity=cap,
                    callsign=csign,
                    is_available=True,
                    current_location_x=vx,
                    current_location_y=vy,
                )
                vehicle_objs[vcode] = veh

            # 7. Responders (5 emergency medical personnel)
            responders_specs = [
                ("RESP-01", "Dr. Elena Rostova", "LEAD_TRIAGE", "CHIEF-01"),
                ("RESP-02", "Officer Sean Byrne", "LOGISTICS", "LOG-01"),
                ("RESP-03", "Paramedic Maya Lin", "PARAMEDIC", "MEDIC-01"),
                ("RESP-04", "Medic Tariq Vance", "MEDIC", "MEDIC-02"),
                ("RESP-05", "EMT Jordan Ross", "EMT", "EMT-01"),
            ]
            responder_objs = {}
            for rcode, rname, role, csign in responders_specs:
                resp = Responder.objects.create(
                    village=village,
                    code=rcode,
                    name=rname,
                    role=role,
                    contact_callsign=csign,
                    is_available=True,
                )
                responder_objs[rcode] = resp

            # 8. Exactly 100 Fictional Residents
            # Distribution:
            # - 98 Stable / Safe
            # - 2 Requiring Medical Attention (Clara Vane, Thomas Sterling)
            # - 0 Critical
            first_names = [
                "Clara", "Thomas", "Arthur", "Eleanor", "Marcus", "Julian", "Rowan", "Beatrice",
                "Silas", "Lydia", "Felix", "Gwendolyn", "Hugo", "Isla", "Tobias", "Matilda",
                "Sebastian", "Maeve", "Jasper", "Penelope", "Gideon", "Cecilia", "Rupert", "Florence",
                "Tristan", "Vera", "Cyrus", "Adelaide", "Ezra", "Rosalind", "Dorian", "Violet",
                "Lucian", "Greta", "Milo", "Ophelia", "Orson", "Evelyn", "Cassian", "Genevieve",
                "Julian", "Iris", "Cedric", "Daphne", "Bennett", "Sylvia", "Ambrose", "Phoebe",
                "Leander", "Coralie", "Victor", "Helena", "Colin", "Miriam", "Alden", "Elspeth",
                "Edmund", "Constance", "Walter", "Priscilla", "Jonas", "Margot", "Emmett", "Lillian",
                "Quentin", "Agnes", "Byron", "Edith", "Desmond", "Winifred", "Malcolm", "Stella",
                "Barnaby", "Camilla", "Simon", "Rose", "Lionel", "Annette", "Philip", "Sibyl",
                "Adrian", "Astrid", "Harvey", "Cordelia", "Benedict", "Lavinia", "Clement", "Elise",
                "Dominic", "Talia", "Samson", "Faye", "Leon", "Nora", "Oscar", "Sybilla",
                "Warren", "Etta", "Alasdair", "Wren"
            ]
            last_names = [
                "Vane", "Sterling", "Holloway", "Fairchild", "Blackwood", "Mercer", "Ashford", "Dunmore",
                "Thorne", "Penrose", "Sinclair", "Lockwood", "Ellington", "Wainwright", "Hawthorne", "Crestwood",
                "Bramwell", "Whitmore", "Radcliffe", "Alderidge", "Foxglove", "Kershaw", "Stanhope", "Barrow",
                "Caldwell", "Langley", "Pemberton", "Finch", "Winterbourne", "Greaves", "Morland", "Tavener",
                "Davenport", "Holt", "Ramsay", "Vandermeer", "Chaucer", "Redgrave", "Harrow", "Vanguard",
                "Kingsley", "Wrentham", "Barrington", "Chamberlain", "Hensley", "Fletcher", "Coburn", "Godfrey",
                "Gresham", "Haldane", "Kennett", "Lowell", "Montague", "Newcomb", "Oakhaven", "Parrish",
                "Rookwood", "Seagrave", "Talbot", "Underwood", "Vickery", "Wakefield", "Yarborough", "Bradford",
                "Clayton", "Danforth", "Eastwood", "Falkirk", "Garland", "Harrington", "Ingram", "Jessup",
                "Kincaid", "Lansdowne", "Milford", "Norcross", "Oakley", "Prescott", "Quigley", "Rutherford",
                "Stirling", "Telford", "Upchurch", "Villiers", "Wentworth", "Yardley", "Beckett", "Carmichael",
                "Delacroix", "Ellerby", "Fitzroy", "Grafton", "Hardy", "Ives", "Jarvis", "Keats",
                "Llewellyn", "Marlowe", "Northwood", "Overton"
            ]

            # Assign residents to neighborhoods and buildings
            nh_keys = ["NH-OT", "NH-NT", "NH-MG", "NH-HM", "NH-SR"]
            residents_per_nh = {
                "NH-OT": 24,
                "NH-NT": 22,
                "NH-MG": 20,
                "NH-HM": 18,
                "NH-SR": 16,
            }

            # Map buildings to neighborhoods
            nh_buildings = {k: [] for k in nh_keys}
            for b in Building.objects.filter(village=village):
                nh_buildings[b.neighborhood.code].append(b)

            resident_index = 0
            created_residents = []

            for nh_code, count in residents_per_nh.items():
                nh_obj = neighborhood_map[nh_code]
                blds = nh_buildings[nh_code]

                for i in range(count):
                    resident_index += 1
                    code = f"RES-{resident_index:03d}"
                    fn = first_names[resident_index - 1]
                    ln = last_names[resident_index - 1]

                    bld = blds[i % len(blds)]
                    # Distribute coordinates slightly within building surroundings
                    jitter_x = ((i * 7) % 25) - 12
                    jitter_y = ((i * 11) % 25) - 12
                    rx = bld.x + jitter_x
                    ry = bld.y + jitter_y

                    # Baseline medical parameters
                    age = 18 + ((resident_index * 13) % 65)
                    gender = "Female" if (resident_index % 2 == 0) else "Male"

                    # Default: Stable resident
                    med_condition = "Healthy / None reported"
                    base_condition = "Healthy"
                    med_history = "No chronic medical conditions."
                    triage = "STABLE"
                    triage_reason = "Vitals within normal physiological baseline; verified safe."
                    evac_status = "SHELTERED"
                    assigned_fac = None

                    # Check for the TWO benchmark residents requiring medical care at baseline:
                    # 1. Clara Vane (RES-001) in Northridge Terraces
                    # 2. Thomas Sterling (RES-002) in Millbrook Glen
                    if resident_index == 1:
                        fn = "Clara"
                        ln = "Vane"
                        age = 68
                        gender = "Female"
                        bld = building_map["BLD-NT-02"]
                        rx = bld.x + 5
                        ry = bld.y - 4
                        med_condition = "Acute Respiratory Distress / Severe Asthma Exacerbation"
                        base_condition = "Chronic Asthma / Bronchitis"
                        med_history = "Documented history of brittle asthma and mild hypertension. Prescribed albuterol inhaler."
                        triage = "DELAYED"
                        triage_reason = "Priority Care (Yellow): Hypoxemic respiratory compromise with SpO2 88% and tachypnea. Requires immediate oxygen therapy and bronchodilator nebulization."
                        evac_status = "RECOMMENDED"
                        assigned_fac = facility_map["FAC-02"]  # Aster Vale Community Hospital (Oxygen & General Med)

                    elif resident_index == 2:
                        fn = "Thomas"
                        ln = "Sterling"
                        age = 42
                        gender = "Male"
                        bld = building_map["BLD-MG-04"]
                        rx = bld.x - 8
                        ry = bld.y + 6
                        med_condition = "Compound Tibial Fracture from Structural Farm Mishap"
                        base_condition = "Good Physical Baseline"
                        med_history = "Traumatic farm equipment structural displacement. No prior surgical complications."
                        triage = "DELAYED"
                        triage_reason = "Priority Care (Yellow): Severe open lower-extremity orthopedic trauma with controlled bleeding. Requires surgical reduction, wound irrigation, and intravenous analgesia."
                        evac_status = "RECOMMENDED"
                        assigned_fac = facility_map["FAC-01"]  # St. Jude Field Clinic (Trauma & Surgical Reduction)

                    res_obj = Resident.objects.create(
                        village=village,
                        neighborhood=nh_obj,
                        building=bld,
                        code=code,
                        first_name=fn,
                        last_name=ln,
                        age=age,
                        gender=gender,
                        medical_condition=med_condition,
                        baseline_condition=base_condition,
                        medical_history=med_history,
                        triage_category=triage,
                        simulated_priority_reason=triage_reason,
                        assigned_facility=assigned_fac,
                        evacuation_status=evac_status,
                        is_fatality=False,
                        x=rx,
                        y=ry,
                    )
                    created_residents.append(res_obj)

                    # Initial Vital Observation
                    if resident_index == 1:
                        # Clara Vane vitals: compromised respiration
                        VitalObservation.objects.create(
                            resident=res_obj,
                            heart_rate=108,
                            spo2=88,
                            blood_pressure="142/90",
                            systolic=142,
                            diastolic=90,
                            respiratory_rate=28,
                            consciousness="ALERT",
                            source_label="Field Health Worker Assessment",
                            notes="Wheezing bilaterally; accessory muscle use observed.",
                            recorded_at=timezone.now(),
                        )
                    elif resident_index == 2:
                        # Thomas Sterling vitals: pain tachycardia
                        VitalObservation.objects.create(
                            resident=res_obj,
                            heart_rate=94,
                            spo2=97,
                            blood_pressure="132/84",
                            systolic=132,
                            diastolic=84,
                            respiratory_rate=18,
                            consciousness="ALERT",
                            source_label="Field First Responder Triage",
                            notes="Compound fracture splinted and dressed. Neurovascular bundle intact distally.",
                            recorded_at=timezone.now(),
                        )
                    else:
                        # Standard stable baseline vitals
                        hr = 68 + ((resident_index * 7) % 12)
                        spo2 = 98 + (resident_index % 2)
                        sys = 116 + ((resident_index * 5) % 10)
                        dia = 74 + ((resident_index * 3) % 8)
                        rr = 14 + (resident_index % 3)

                        VitalObservation.objects.create(
                            resident=res_obj,
                            heart_rate=hr,
                            spo2=spo2,
                            blood_pressure=f"{sys}/{dia}",
                            systolic=sys,
                            diastolic=dia,
                            respiratory_rate=rr,
                            consciousness="ALERT",
                            source_label="Baseline Community Health Survey",
                            notes="Normal physiological parameters; no acute intervention indicated.",
                            recorded_at=timezone.now(),
                        )

            # 9. Create Baseline Evacuation Assignments for Clara and Thomas
            router = GraphRouter(village_id=village.id)

            # Clara Vane evacuation recommendation
            clara = created_residents[0]
            clara_eval = router.plan_evacuation(clara, facility_id=facility_map["FAC-02"].id)
            if clara_eval.get("recommended_destination"):
                safest_rt = clara_eval["recommended_destination"]["safest_route"]
                EvacuationAssignment.objects.create(
                    village=village,
                    resident=clara,
                    facility=facility_map["FAC-02"],
                    vehicle=vehicle_objs["VEH-02"],
                    responder=responder_objs["RESP-03"],
                    status="ASSIGNED",
                    priority_tier="DELAYED",
                    route_snapshot=safest_rt,
                    estimated_distance=safest_rt.get("distance", 120.0),
                    estimated_travel_time=safest_rt.get("travel_time", 2.2),
                    is_safest_route=True,
                    hazard_avoidance_notes="Direct clear passage along Hospital Avenue to Aster Vale Community Hospital.",
                )

            # Thomas Sterling evacuation recommendation
            thomas = created_residents[1]
            thomas_eval = router.plan_evacuation(thomas, facility_id=facility_map["FAC-01"].id)
            if thomas_eval.get("recommended_destination"):
                safest_rt = thomas_eval["recommended_destination"]["safest_route"]
                EvacuationAssignment.objects.create(
                    village=village,
                    resident=thomas,
                    facility=facility_map["FAC-01"],
                    vehicle=vehicle_objs["VEH-03"],
                    responder=responder_objs["RESP-04"],
                    status="ASSIGNED",
                    priority_tier="DELAYED",
                    route_snapshot=safest_rt,
                    estimated_distance=safest_rt.get("distance", 420.0),
                    estimated_travel_time=safest_rt.get("travel_time", 4.8),
                    is_safest_route=True,
                    hazard_avoidance_notes="Transit across Millbrook Timber Bridge and High Street to St. Jude Trauma Clinic.",
                )

            # 10. Audit Event: Baseline Initialized
            AuditEvent.objects.create(
                village=village,
                event_type="DEMO_RESET",
                actor="System Administrator",
                summary="Village baseline initialized: 100 residents (98 stable, 2 requiring medical attention), 5 facilities, 40 buildings, and 46 road segments.",
                payload={
                    "total_residents": 100,
                    "stable_count": 98,
                    "care_required_count": 2,
                    "facilities_count": 5,
                    "road_blockages": 0,
                },
            )

        self.stdout.write(self.style.SUCCESS(
            "Successfully seeded Aster Vale! 100 residents (98 stable, 2 requiring care), 5 facilities, 0 road blockages."
        ))
