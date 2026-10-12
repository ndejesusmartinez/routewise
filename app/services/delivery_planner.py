from app.services.capacity_optimizer import optimize_capacity_routes
from app.services.osrm_client import (
    build_distance_matrix,
    build_route_geometry,
)


def plan_deliveries(
    depot: dict,
    orders: list[dict],
    vehicles: list[dict],
) -> dict:
    locations = [
        {
            "location_id": depot["location_id"],
            "latitude": depot["latitude"],
            "longitude": depot["longitude"],
        }
    ]

    locations.extend(
        {
            "location_id": order["order_id"],
            "latitude": order["latitude"],
            "longitude": order["longitude"],
        }
        for order in orders
    )

    matrices = build_distance_matrix(locations)
    distance_matrix = matrices["distance_matrix"]
    duration_matrix = matrices["duration_matrix"]

    optimization = optimize_capacity_routes(
        distance_matrix=distance_matrix,
        demands=[0] + [order["demand"] for order in orders],
        vehicle_capacities=[
            vehicle["capacity"] for vehicle in vehicles
        ],
        depot=0,
    )

    routes = []
    total_duration = 0

    for route in optimization["routes"]:
        stops = route["stops"]

        duration = sum(
            duration_matrix[stops[i]][stops[i + 1]]
            for i in range(len(stops) - 1)
        )

        order_ids = [
            orders[node - 1]["order_id"]
            for node in stops
            if node != 0
        ]

        geometry = None
        if order_ids:
            geometry = build_route_geometry(
                [
                    {
                        "latitude": locations[node]["latitude"],
                        "longitude": locations[node]["longitude"],
                    }
                    for node in stops
                ]
            )

        routes.append({
            "vehicle_id": vehicles[route["vehicle_id"]]["vehicle_id"],
            "order_ids": order_ids,
            "distance_meters": route["distance"],
            "duration_seconds": duration,
            "load": route["load"],
            "capacity": route["capacity"],
            "geometry": (
                geometry.model_dump(mode="json")
                if geometry is not None
                else None
            ),
        })

        total_duration += duration

    return {
        "routes": routes,
        "total_distance_meters": optimization["total_distance"],
        "total_duration_seconds": total_duration,
        "provider": "OSRM",
    }
