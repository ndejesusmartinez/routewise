import pytest

from app.services.capacity_optimizer import optimize_capacity_routes


def test_routes_respect_vehicle_capacities():
    result = optimize_capacity_routes(
        distance_matrix=[
            [0, 10, 15, 20],
            [10, 0, 35, 25],
            [15, 35, 0, 30],
            [20, 25, 30, 0],
        ],
        demands=[0, 2, 2, 3],
        vehicle_capacities=[4, 3],
    )

    assert len(result["routes"]) == 2

    visited_stops = []

    for route in result["routes"]:
        assert route["load"] <= route["capacity"]
        assert route["stops"][0] == 0
        assert route["stops"][-1] == 0
        visited_stops.extend(route["stops"][1:-1])

    assert sorted(visited_stops) == [1, 2, 3]


def test_rejects_insufficient_total_capacity():
    with pytest.raises(ValueError, match="Total demand"):
        optimize_capacity_routes(
            distance_matrix=[
                [0, 10, 15],
                [10, 0, 20],
                [15, 20, 0],
            ],
            demands=[0, 4, 5],
            vehicle_capacities=[4, 4],
        )


def test_rejects_order_larger_than_every_vehicle():
    with pytest.raises(ValueError, match="Total demand"):
        optimize_capacity_routes(
            distance_matrix=[
                [0, 10],
                [10, 0],
            ],
            demands=[0, 5],
            vehicle_capacities=[4],
        )

