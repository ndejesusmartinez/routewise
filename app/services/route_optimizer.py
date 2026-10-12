from ortools.constraint_solver import pywrapcp, routing_enums_pb2


def optimize_route(
    distance_matrix: list[list[int]],
    vehicle_count: int = 1,
    depot: int = 0,
) -> dict:
    """Find efficient routes using a distance matrix."""

    if not distance_matrix:
        raise ValueError("The distance matrix cannot be empty.")

    size = len(distance_matrix)

    if any(len(row) != size for row in distance_matrix):
        raise ValueError("The distance matrix must be square.")

    if any(distance < 0 for row in distance_matrix for distance in row):
        raise ValueError("Distances cannot be negative.")

    if not 1 <= vehicle_count <= size:
        raise ValueError("Invalid vehicle count.")

    if not 0 <= depot < size:
        raise ValueError("Invalid depot index.")

    manager = pywrapcp.RoutingIndexManager(
        size,
        vehicle_count,
        depot,
    )

    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index: int, to_index: int) -> int:
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)

        return distance_matrix[from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(
        distance_callback
    )

    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )

    solution = routing.SolveWithParameters(search_parameters)

    if solution is None:
        raise RuntimeError("No feasible route was found.")

    routes = []
    total_distance = 0

    for vehicle_id in range(vehicle_count):
        index = routing.Start(vehicle_id)
        route = []
        route_distance = 0

        while not routing.IsEnd(index):
            route.append(manager.IndexToNode(index))
            previous_index = index
            index = solution.Value(routing.NextVar(index))

            route_distance += routing.GetArcCostForVehicle(
                previous_index,
                index,
                vehicle_id,
            )

        route.append(manager.IndexToNode(index))
        total_distance += route_distance

        routes.append({
            "vehicle_id": vehicle_id,
            "stops": route,
            "distance": route_distance,
        })

    return {
        "routes": routes,
        "total_distance": total_distance,
    }
