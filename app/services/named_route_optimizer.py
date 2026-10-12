from app.services.capacity_optimizer import optimize_capacity_routes


def optimize_named_routes(
    distance_matrix: list[list[int]],
    orders: list[dict],
    vehicles: list[dict],
    depot: int = 0,
) -> dict:
    result = optimize_capacity_routes(
        distance_matrix=distance_matrix,
        demands=[0] + [order["demand"] for order in orders],
        vehicle_capacities=[vehicle["capacity"] for vehicle in vehicles],
        depot=depot,
    )

    routes = []

    for route in result["routes"]:
        order_ids = [
            orders[node - 1]["order_id"]
            for node in route["stops"]
            if node != depot
        ]

        routes.append({
            "vehicle_id": vehicles[route["vehicle_id"]]["vehicle_id"],
            "order_ids": order_ids,
            "distance": route["distance"],
            "load": route["load"],
            "capacity": route["capacity"],
        })

    return {
        "routes": routes,
        "total_distance": result["total_distance"],
    }
