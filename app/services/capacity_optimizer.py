from ortools.constraint_solver import (
    pywrapcp,
    routing_enums_pb2,
)


def optimize_capacity_routes(
    distance_matrix: list[list[int]],
    demands: list[int],
    vehicle_capacities: list[int],
    depot: int = 0,
) -> dict:
    """Optimize delivery routes while respecting vehicle capacities."""

    size = len(distance_matrix)

    if size == 0:
        raise ValueError("The distance matrix cannot be empty.")

    if any(len(row) != size for row in distance_matrix):
        raise ValueError("The distance matrix must be square.")

    if not 0 <= depot < size:
        raise ValueError("Depot index is outside the matrix.")

    if len(demands) != size:
        raise ValueError("There must be one demand per location.")

    if not vehicle_capacities:
        raise ValueError("At least one vehicle is required.")

    if any(d < 0 for d in demands):
        raise ValueError("Demands cannot be negative.")

    if any(c < 0 for c in vehicle_capacities):
        raise ValueError("Vehicle capacities cannot be negative.")

    if any(d < 0 for row in distance_matrix for d in row):
        raise ValueError("Distances cannot be negative.")

    if demands[depot] != 0:
        raise ValueError("Depot demand must be zero.")

    if sum(demands) > sum(vehicle_capacities):
        raise ValueError("Total demand exceeds total vehicle capacity.")

    manager = pywrapcp.RoutingIndexManager(
        size,
        len(vehicle_capacities),
        depot,
    )
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index: int, to_index: int) -> int:
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return distance_matrix[from_node][to_node]

    distance_callback_index = routing.RegisterTransitCallback(
        distance_callback
    )
    routing.SetArcCostEvaluatorOfAllVehicles(
        distance_callback_index
    )

    def demand_callback(from_index: int) -> int:
        from_node = manager.IndexToNode(from_index)
        return demands[from_node]

    demand_callback_index = routing.RegisterUnaryTransitCallback(
        demand_callback
    )

    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0,
        vehicle_capacities,
        True,
        "Capacity",
    )

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.seconds = 5

    solution = routing.SolveWithParameters(search_parameters)

    if solution is None:
        raise RuntimeError(
            "No feasible solution found for the capacity constraints."
        )

    capacity_dimension = routing.GetDimensionOrDie("Capacity")
    routes = []
    total_distance = 0

    for vehicle_id, vehicle_capacity in enumerate(vehicle_capacities):
        index = routing.Start(vehicle_id)
        stops = []
        route_distance = 0
        route_load = 0

        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            stops.append(node)
            route_load += demands[node]

            previous_index = index
            index = solution.Value(routing.NextVar(index))

            route_distance += routing.GetArcCostForVehicle(
                previous_index,
                index,
                vehicle_id,
            )

        stops.append(manager.IndexToNode(index))
        total_distance += route_distance

        routes.append({
            "vehicle_id": vehicle_id,
            "stops": stops,
            "distance": route_distance,
            "load": route_load,
            "capacity": vehicle_capacity,
        })

    return {
        "routes": routes,
        "total_distance": total_distance,
    }
