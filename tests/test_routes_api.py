from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_optimize_route_successfully():
    payload = {
        "distance_matrix": [
            [0, 10, 15, 20],
            [10, 0, 35, 25],
            [15, 35, 0, 30],
            [20, 25, 30, 0],
        ],
        "vehicle_count": 1,
        "depot": 0,
    }

    response = client.post("/api/v1/routes/optimize", json=payload)

    assert response.status_code == 200

    data = response.json()

    assert len(data["routes"]) == 1
    assert data["routes"][0]["stops"][0] == 0
    assert data["routes"][0]["stops"][-1] == 0
    assert sorted(data["routes"][0]["stops"][:-1]) == [0, 1, 2, 3]
    assert data["total_distance"] > 0


def test_optimize_rejects_invalid_matrix():
    payload = {
        "distance_matrix": [
            [0, 10],
            [10],
        ],
        "vehicle_count": 1,
        "depot": 0,
    }

    response = client.post("/api/v1/routes/optimize", json=payload)

    assert response.status_code == 422
