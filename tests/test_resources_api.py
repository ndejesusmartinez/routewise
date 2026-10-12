
import pytest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base, get_db
from app.db import models
from app.db.models import Order
from app.main import app


@pytest.fixture
def test_db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    TestingSessionLocal = sessionmaker(
        bind=engine,
        autoflush=False,
        expire_on_commit=False,
    )

    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    try:
        yield TestingSessionLocal
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture
def client(test_db):
    with TestClient(app) as test_client:
        yield test_client


def create_order(client, order_id="TEST-001"):
    return client.post(
        "/api/v1/orders",
        json={
            "order_id": order_id,
            "demand": 5,
            "latitude": 10.4631,
            "longitude": -75.5225,
        },
    )


def test_create_order_starts_as_pending(client):
    response = create_order(client)

    assert response.status_code == 201
    assert response.json()["order_id"] == "TEST-001"
    assert response.json()["status"] == "PENDING"


def test_duplicate_order_returns_conflict(client):
    first = create_order(client)
    second = create_order(client)

    assert first.status_code == 201
    assert second.status_code == 409


def test_missing_order_returns_not_found(client):
    response = client.patch(
        "/api/v1/orders/UNKNOWN-001/status",
        json={"status": "IN_TRANSIT"},
    )

    assert response.status_code == 404


def test_pending_order_can_be_cancelled(client):
    create_response = create_order(client)

    response = client.patch(
        f"/api/v1/orders/{create_response.json()['order_id']}/status",
        json={"status": "CANCELLED"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "CANCELLED"


def test_pending_order_cannot_skip_assignment(client):
    create_order(client)

    response = client.patch(
        "/api/v1/orders/TEST-001/status",
        json={"status": "IN_TRANSIT"},
    )

    assert response.status_code == 409

    orders = client.get("/api/v1/orders").json()
    order = next(item for item in orders if item["order_id"] == "TEST-001")

    assert order["status"] == "PENDING"


def test_assigned_order_can_complete_delivery(client, test_db):
    create_order(client)

    # Simular una asignación previa a una ruta.
    with test_db() as db:
        order = db.scalar(
            select(Order).where(Order.order_id == "TEST-001")
        )
        order.status = "ASSIGNED"
        db.commit()

    transit_response = client.patch(
        "/api/v1/orders/TEST-001/status",
        json={"status": "IN_TRANSIT"},
    )

    assert transit_response.status_code == 200
    assert transit_response.json()["status"] == "IN_TRANSIT"

    delivered_response = client.patch(
        "/api/v1/orders/TEST-001/status",
        json={"status": "DELIVERED"},
    )

    assert delivered_response.status_code == 200
    assert delivered_response.json()["status"] == "DELIVERED"


def test_delivered_order_cannot_be_cancelled(client, test_db):
    create_order(client)

    with test_db() as db:
        order = db.scalar(
            select(Order).where(Order.order_id == "TEST-001")
        )
        order.status = "DELIVERED"
        db.commit()

    response = client.patch(
        "/api/v1/orders/TEST-001/status",
        json={"status": "CANCELLED"},
    )

    assert response.status_code == 409

    with test_db() as db:
        order = db.scalar(
            select(Order).where(Order.order_id == "TEST-001")
        )
        assert order.status == "DELIVERED"


def test_dashboard_summary_returns_operational_counts(client):
    # Crear dos pedidos
    for order_id in ["DASH-001", "DASH-002"]:
        response = client.post(
            "/api/v1/orders",
            json={
                "order_id": order_id,
                "demand": 2,
                "latitude": 10.4236,
                "longitude": -75.5253,
            },
        )
        assert response.status_code in (200, 201)

    # Crear un vehículo
    response = client.post(
        "/api/v1/vehicles",
        json={
            "vehicle_id": "VAN-DASH-001",
            "capacity": 10,
        },
    )
    assert response.status_code in (200, 201)

    # Consultar el dashboard
    response = client.get("/api/v1/dashboard/summary")

    assert response.status_code == 200

    data = response.json()

    assert data["total_orders"] == 2
    assert data["orders_by_status"]["PENDING"] == 2
    assert data["orders_by_status"]["ASSIGNED"] == 0
    assert data["orders_by_status"]["IN_TRANSIT"] == 0
    assert data["orders_by_status"]["DELIVERED"] == 0
    assert data["orders_by_status"]["CANCELLED"] == 0
    assert data["total_vehicles"] == 1
    assert data["total_plans"] == 0
