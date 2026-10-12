import pytest

from app.services import delivery_planner


def test_plan_deliveries_assigns_orders_and_respects_capacity(monkeypatch):
    def fake_build_distance_matrix(locations):
        assert len(locations) == 3

        return {
            "distance_matrix": [
                [0, 100, 200],
                [100, 0, 150],
                [200, 150, 0],
            ],
            "duration_matrix": [
                [0, 60, 120],
                [60, 0, 90],
                [120, 90, 0],
            ],
        }

    monkeypatch.setattr(
        delivery_planner,
        "build_distance_matrix",
        fake_build_distance_matrix,
    )

    result = delivery_planner.plan_deliveries(
        depot={
            "location_id": "DEPOT-001",
            "latitude": 4.60971,
            "longitude": -74.08175,
        },
        orders=[
            {
                "order_id": "ORD-001",
                "demand": 2,
                "latitude": 4.65333,
                "longitude": -74.08365,
            },
            {
                "order_id": "ORD-002",
                "demand": 2,
                "latitude": 4.6351,
                "longitude": -74.0703,
            },
        ],
        vehicles=[
            {"vehicle_id": "VEH-001", "capacity": 3},
            {"vehicle_id": "VEH-002", "capacity": 2},
        ],
    )

    assigned_orders = [
        order_id
        for route in result["routes"]
        for order_id in route["order_ids"]
    ]

    assert sorted(assigned_orders) == ["ORD-001", "ORD-002"]
    assert len(result["routes"]) == 2
    assert result["total_distance_meters"] == sum(
        route["distance_meters"] for route in result["routes"]
    )
    assert result["total_duration_seconds"] == sum(
        route["duration_seconds"] for route in result["routes"]
    )

    for route in result["routes"]:
        assert route["load"] <= route["capacity"]

    assert result["provider"] == "OSRM"


def test_plan_deliveries_handles_osrm_failure(monkeypatch):
    def fake_build_distance_matrix(locations):
        raise RuntimeError("Could not connect to the OSRM routing service.")

    monkeypatch.setattr(
        delivery_planner,
        "build_distance_matrix",
        fake_build_distance_matrix,
    )

    with pytest.raises(RuntimeError, match="OSRM"):
        delivery_planner.plan_deliveries(
            depot={
                "location_id": "DEPOT-001",
                "latitude": 4.60971,
                "longitude": -74.08175,
            },
            orders=[
                {
                    "order_id": "ORD-001",
                    "demand": 2,
                    "latitude": 4.65333,
                    "longitude": -74.08365,
                },
            ],
            vehicles=[
                {"vehicle_id": "VEH-001", "capacity": 3},
            ],
        )
