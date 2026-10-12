
import pytest

from fastapi.testclient import TestClient
from sqlalchemy import select, func, create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base, get_db
from app.db import models
from app.db.models import Order, DeliveryPlan
from app.main import app
from app.api import routes as routes_api
from sqlalchemy.exc import SQLAlchemyError


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


@pytest.fixture
def registered_resources(client):
    order_response = client.post(
        "/api/v1/orders",
        json={
            "order_id": "INTEG-ORD-001",
            "demand": 3,
            "latitude": 10.4631,
            "longitude": -75.5225,
        },
    )

    vehicle_response = client.post(
        "/api/v1/vehicles",
        json={
            "vehicle_id": "INTEG-VEH-001",
            "capacity": 10,
        },
    )

    assert order_response.status_code == 201
    assert vehicle_response.status_code == 201

    return {
        "order_id": "INTEG-ORD-001",
        "vehicle_id": "INTEG-VEH-001",
    }


@pytest.fixture
def mock_planner(monkeypatch):
    calls = {"count": 0}

    def fake_plan_deliveries(depot, orders, vehicles):
        calls["count"] += 1

        return {
            "routes": [
                {
                    "vehicle_id": vehicles[0]["vehicle_id"],
                    "order_ids": [
                        order["order_id"] for order in orders
                    ],
                    "distance_meters": 1500,
                    "duration_seconds": 600,
                    "load": sum(order["demand"] for order in orders),
                    "capacity": vehicles[0]["capacity"],
                }
            ],
            "total_distance_meters": 1500,
            "total_duration_seconds": 600,
            "provider": "OSRM",
        }

    monkeypatch.setattr(
        routes_api,
        "plan_deliveries",
        fake_plan_deliveries,
    )

    return calls


def plan_payload(resources):
    return {
        "depot": {
            "location_id": "DEPOT-001",
            "latitude": 10.4,
            "longitude": -75.5,
        },
        "order_ids": [resources["order_id"]],
        "vehicle_ids": [resources["vehicle_id"]],
    }


def test_registered_plan_persists_and_assigns_orders(
    client,
    test_db,
    registered_resources,
    mock_planner,
):
    response = client.post(
        "/api/v1/routes/plan-registered",
        json=plan_payload(registered_resources),
    )

    assert response.status_code == 201
    data = response.json()

    assert data["plan_id"] > 0
    assert data["routes"][0]["order_ids"] == [
        registered_resources["order_id"]
    ]

    with test_db() as db:
        order = db.scalar(
            select(Order).where(
                Order.order_id == registered_resources["order_id"]
            )
        )
        plan_count = db.scalar(
            select(func.count()).select_from(DeliveryPlan)
        )

        assert order.status == "ASSIGNED"
        assert plan_count == 1

    assert mock_planner["count"] == 1


def test_assigned_order_cannot_be_planned_twice(
    client,
    test_db,
    registered_resources,
    mock_planner,
):
    payload = plan_payload(registered_resources)

    first = client.post(
        "/api/v1/routes/plan-registered",
        json=payload,
    )

    assert first.status_code == 201

    second = client.post(
        "/api/v1/routes/plan-registered",
        json=payload,
    )

    assert second.status_code == 409

    with test_db() as db:
        plan_count = db.scalar(
            select(func.count()).select_from(DeliveryPlan)
        )

        assert plan_count == 1

    # El optimizador no debe ejecutarse en el segundo intento.
    assert mock_planner["count"] == 1


def test_registered_plan_rejects_unknown_order(
    client,
    registered_resources,
    mock_planner,
):
    payload = plan_payload(registered_resources)
    payload["order_ids"] = ["DOES-NOT-EXIST"]

    response = client.post(
        "/api/v1/routes/plan-registered",
        json=payload,
    )

    assert response.status_code == 404
    assert mock_planner["count"] == 0



def test_registered_plan_rejects_insufficient_capacity(
    client,
    test_db,
    registered_resources,
    mock_planner,
):
    # El pedido requiere 11 unidades, pero el vehículo solo admite 10.
    with test_db() as db:
        order = db.scalar(
            select(Order).where(
                Order.order_id == registered_resources["order_id"]
            )
        )
        order.demand = 11
        db.commit()

    response = client.post(
        "/api/v1/routes/plan-registered",
        json=plan_payload(registered_resources),
    )

    assert response.status_code == 422
    assert mock_planner["count"] == 0

    with test_db() as db:
        order = db.scalar(
            select(Order).where(
                Order.order_id == registered_resources["order_id"]
            )
        )
        assert order.status == "PENDING"



def test_persistence_failure_rolls_back_entire_plan(
    client,
    test_db,
    registered_resources,
    mock_planner,
    monkeypatch,
):
    original_persist = routes_api.persist_delivery_plan

    def fail_after_persisting_without_commit(db, result, commit=True):
        original_persist(db, result, commit=commit)
        raise SQLAlchemyError("Simulated persistence failure")

    monkeypatch.setattr(
        routes_api,
        "persist_delivery_plan",
        fail_after_persisting_without_commit,
    )

    response = client.post(
        "/api/v1/routes/plan-registered",
        json=plan_payload(registered_resources),
    )

    assert response.status_code == 500

    with test_db() as db:
        order = db.scalar(
            select(Order).where(
                Order.order_id == registered_resources["order_id"]
            )
        )
        plan_count = db.scalar(
            select(func.count()).select_from(DeliveryPlan)
        )

        assert order.status == "PENDING"
        assert plan_count == 0
