import heapq
import math
from typing import Dict, List, Optional, Tuple, Any
from ..models import RoadNode, RoadEdge, MedicalFacility, Resident


def distance_sq(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    return (p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2


def euclidean_distance(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    return math.sqrt(distance_sq(p1, p2))


def find_nearest_node(x: float, y: float, village_id: int) -> Optional[RoadNode]:
    nodes = RoadNode.objects.filter(village_id=village_id)
    if not nodes.exists():
        return None
    return min(nodes, key=lambda n: distance_sq((x, y), (n.x, n.y)))


class GraphRouter:
    def __init__(self, village_id: int):
        self.village_id = village_id
        self.nodes: Dict[int, RoadNode] = {n.id: n for n in RoadNode.objects.filter(village_id=village_id)}
        self.adjacency: Dict[int, List[Dict[str, Any]]] = {n_id: [] for n_id in self.nodes}

        edges = RoadEdge.objects.filter(village_id=village_id)
        for edge in edges:
            u = edge.from_node_id
            v = edge.to_node_id
            if u in self.adjacency and v in self.adjacency:
                # Two-way traversal for village streets
                coords_forward = edge.coordinates if edge.coordinates else [[self.nodes[u].x, self.nodes[u].y], [self.nodes[v].x, self.nodes[v].y]]
                coords_backward = list(reversed(coords_forward))

                self.adjacency[u].append({
                    "neighbor": v,
                    "edge": edge,
                    "distance": edge.distance,
                    "travel_time": edge.base_travel_time,
                    "is_blocked": edge.is_blocked,
                    "is_restricted": edge.is_restricted,
                    "hazard_level": edge.hazard_level,
                    "closure_reason": edge.closure_reason,
                    "coordinates": coords_forward,
                })
                self.adjacency[v].append({
                    "neighbor": u,
                    "edge": edge,
                    "distance": edge.distance,
                    "travel_time": edge.base_travel_time,
                    "is_blocked": edge.is_blocked,
                    "is_restricted": edge.is_restricted,
                    "hazard_level": edge.hazard_level,
                    "closure_reason": edge.closure_reason,
                    "coordinates": coords_backward,
                })

    def run_dijkstra(self, start_id: int, target_id: int, mode: str = "safest") -> Dict[str, Any]:
        """
        Dijkstra shortest / safest path computation.
        mode:
          - 'shortest': minimizes geometric distance. Blocked edges strictly excluded.
          - 'safest': minimizes distance + heavy penalties for road hazards and restrictions. Blocked edges strictly excluded.
        """
        if start_id not in self.nodes or target_id not in self.nodes:
            return {
                "found": False,
                "reason": "Origin or destination node not found in network graph.",
                "distance": 0,
                "travel_time": 0,
                "nodes": [],
                "edges": [],
                "coordinates": [],
            }

        if start_id == target_id:
            start_node = self.nodes[start_id]
            return {
                "found": True,
                "distance": 0.0,
                "travel_time": 0.0,
                "hazard_penalty": 0.0,
                "nodes": [{"id": start_id, "name": start_node.name, "code": start_node.code, "x": start_node.x, "y": start_node.y}],
                "edges": [],
                "coordinates": [[start_node.x, start_node.y]],
                "warnings": [],
                "explanation": "Origin and destination are at the same junction point.",
            }

        distances: Dict[int, float] = {n_id: float("inf") for n_id in self.nodes}
        distances[start_id] = 0.0
        previous: Dict[int, Optional[Tuple[int, Dict[str, Any]]]] = {n_id: None for n_id in self.nodes}

        pq: List[Tuple[float, int]] = [(0.0, start_id)]

        while pq:
            current_dist, current_u = heapq.heappop(pq)

            if current_dist > distances[current_u]:
                continue

            if current_u == target_id:
                break

            for link in self.adjacency.get(current_u, []):
                # Never traverse fully blocked road segments
                if link["is_blocked"]:
                    continue

                base_cost = link["distance"]

                if mode == "safest":
                    # Penalize hazard levels: level 1: +50%, level 2: +150%, level 3: +300%
                    hazard_mult = 1.0 + (link["hazard_level"] * 1.5)
                    restriction_mult = 1.4 if link["is_restricted"] else 1.0
                    effective_cost = base_cost * hazard_mult * restriction_mult
                else:
                    # Shortest path: geometric distance
                    effective_cost = base_cost

                new_dist = current_dist + effective_cost

                if new_dist < distances[link["neighbor"]]:
                    distances[link["neighbor"]] = new_dist
                    previous[link["neighbor"]] = (current_u, link)
                    heapq.heappush(pq, (new_dist, link["neighbor"]))

        if distances[target_id] == float("inf"):
            # Check why path failed
            return {
                "found": False,
                "reason": "No accessible route found. Road segments between origin and destination are obstructed by disaster debris or damage closures.",
                "distance": 0,
                "travel_time": 0,
                "nodes": [],
                "edges": [],
                "coordinates": [],
            }

        # Reconstruct path
        path_nodes: List[Dict[str, Any]] = []
        path_edges: List[Dict[str, Any]] = []
        path_coords: List[List[float]] = []
        warnings: List[str] = []

        curr = target_id
        raw_dist = 0.0
        raw_travel_time = 0.0

        backtrack_edges = []
        backtrack_nodes = [curr]

        while previous[curr] is not None:
            p_node, edge_data = previous[curr]
            backtrack_edges.append(edge_data)
            backtrack_nodes.append(p_node)
            curr = p_node

        backtrack_nodes.reverse()
        backtrack_edges.reverse()

        for n_id in backtrack_nodes:
            node_obj = self.nodes[n_id]
            path_nodes.append({
                "id": node_obj.id,
                "code": node_obj.code,
                "name": node_obj.name,
                "x": node_obj.x,
                "y": node_obj.y,
                "node_type": node_obj.node_type,
            })

        for edge_link in backtrack_edges:
            e = edge_link["edge"]
            raw_dist += edge_link["distance"]
            raw_travel_time += edge_link["travel_time"]

            if edge_link["is_restricted"]:
                warnings.append(f"Caution: Segment {e.name} has restricted status ({edge_link['closure_reason'] or 'Emergency response speed restriction'}).")
            if edge_link["hazard_level"] > 0:
                warnings.append(f"Hazard warning: Segment {e.name} traverses Level {edge_link['hazard_level']} hazard perimeter.")

            path_edges.append({
                "id": e.id,
                "code": e.code,
                "name": e.name,
                "distance": edge_link["distance"],
                "travel_time": edge_link["travel_time"],
                "hazard_level": edge_link["hazard_level"],
                "is_restricted": edge_link["is_restricted"],
                "closure_reason": edge_link["closure_reason"],
            })

            coords = edge_link["coordinates"]
            if not path_coords:
                path_coords.extend(coords)
            else:
                # Avoid duplicate coordinate stitching
                path_coords.extend(coords[1:])

        explanation = (
            f"Calculated {mode} route via {len(path_edges)} road segments covering {raw_dist:.1f} m. "
            f"Estimated transit time: {raw_travel_time:.1f} min."
        )
        if mode == "safest" and warnings:
            explanation += f" Route incorporates hazard-avoidance detours ({len(warnings)} caution advisories)."

        return {
            "found": True,
            "mode": mode,
            "distance": round(raw_dist, 1),
            "travel_time": round(raw_travel_time, 1),
            "hazard_penalty": round(distances[target_id] - raw_dist, 1) if mode == "safest" else 0.0,
            "nodes": path_nodes,
            "edges": path_edges,
            "coordinates": path_coords,
            "warnings": warnings,
            "explanation": explanation,
        }

    def plan_evacuation(self, resident: Resident, facility_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Calculates optimal facility destination and route (with shortest vs safest comparison).
        """
        # Find nearest road node to resident
        resident_node = find_nearest_node(resident.x, resident.y, self.village_id)
        if not resident_node:
            return {"status": "error", "message": "No road node found near resident's coordinates."}

        # Facilities to consider
        facilities = MedicalFacility.objects.filter(village_id=self.village_id)
        if facility_id:
            facilities = facilities.filter(id=facility_id)

        if not facilities.exists():
            return {"status": "error", "message": "No valid medical facilities found in the village."}

        candidate_evaluations: List[Dict[str, Any]] = []

        for fac in facilities:
            fac_node = find_nearest_node(fac.x, fac.y, self.village_id)
            if not fac_node:
                continue

            # Compute safest route
            safest_res = self.run_dijkstra(resident_node.id, fac_node.id, mode="safest")
            # Compute shortest route
            shortest_res = self.run_dijkstra(resident_node.id, fac_node.id, mode="shortest")

            # Check capability match
            triage = resident.active_triage
            capability_score = 100
            reasons = []

            if triage == "IMMEDIATE":
                if "ADVANCED_TRAUMA" in fac.capabilities or "SURGICAL_REDUCTION" in fac.capabilities:
                    capability_score += 50
                    reasons.append("Equipped for critical trauma resuscitation")
                else:
                    capability_score -= 40
                    reasons.append("Lacks advanced trauma resuscitation capability")
            elif triage == "DELAYED":
                if "WOUND_STABILIZATION" in fac.capabilities or "GENERAL_MEDICINE" in fac.capabilities:
                    capability_score += 20
                    reasons.append("Ideal for intermediate stabilization")

            # Check capacity
            avail = fac.available_capacity
            if avail <= 0:
                capability_score -= 1000
                reasons.append("Facility at 100% full capacity (0 beds available)")
            elif avail < 2:
                capability_score -= 20
                reasons.append("Limited remaining capacity")

            is_reachable = safest_res["found"] or shortest_res["found"]
            if not is_reachable:
                reasons.append("Inaccessible due to blocked roadways")

            # Travel distance penalty
            dist = safest_res["distance"] if safest_res["found"] else 99999
            suitability = capability_score - (dist * 0.1)

            candidate_evaluations.append({
                "facility": {
                    "id": fac.id,
                    "code": fac.code,
                    "name": fac.name,
                    "facility_type": fac.facility_type,
                    "total_capacity": fac.total_capacity,
                    "current_occupancy": fac.current_occupancy,
                    "available_capacity": avail,
                    "capabilities": fac.capabilities,
                    "operational_status": fac.operational_status,
                    "access_road_status": fac.access_road_status,
                    "x": fac.x,
                    "y": fac.y,
                },
                "is_reachable": is_reachable,
                "suitability_score": round(suitability, 1),
                "clinical_rationale": "; ".join(reasons) if reasons else "Routine care capability matches patient profile",
                "safest_route": safest_res,
                "shortest_route": shortest_res,
            })

        # Sort candidate facilities by reachable first, then suitability score descending
        candidate_evaluations.sort(key=lambda c: (c["is_reachable"], c["suitability_score"]), reverse=True)

        best_candidate = candidate_evaluations[0] if candidate_evaluations else None

        return {
            "resident": {
                "id": resident.id,
                "code": resident.code,
                "name": resident.full_name,
                "triage_category": resident.active_triage,
                "medical_condition": resident.medical_condition,
                "x": resident.x,
                "y": resident.y,
            },
            "origin_node": {
                "id": resident_node.id,
                "name": resident_node.name,
                "code": resident_node.code,
                "x": resident_node.x,
                "y": resident_node.y,
            },
            "recommended_destination": best_candidate,
            "all_facility_evaluations": candidate_evaluations,
        }
