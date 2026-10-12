from app.services.route_optimizer import optimize_route


def test_optimizer_visits_all_locations():
    distance_matrix = [
        [0, 10, 15, 20],
        [10, 0, 35, 25],
        [15, 35, 0, 30],
        [20, 25, 30, 0],
    ]

    result = optimize_route(distance_matrix)

    assert len(result["routes"]) == 1
    assert result["routes"][0]["stops"][0] == 0
    assert result["routes"][0]["stops"][-1] == 0
    assert set(result["routes"][0]["stops"]) == {0, 1, 2, 3}
    assert result["total_distance"] > 0


def test_optimizer_supports_multiple_vehicles():
    distance_matrix = [
        [0, 10, 15, 20],
        [10, 0, 35, 25],
        [15, 35, 0, 30],
        [20, 25, 30, 0],
    ]

    result = optimize_route(distance_matrix, vehicle_count=2)

    assert len(result["routes"]) == 2

    visited_stops = [
        stop
        for route in result["routes"]
        for stop in route["stops"][1:-1]
    ]

    assert sorted(visited_stops) == [1, 2, 3]


def test_optimizer_rejects_non_square_matrix():
    import pytest

    with pytest.raises(ValueError, match="square"):
        optimize_route([[0, 10], [10]])
