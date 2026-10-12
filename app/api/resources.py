from collections.abc import Generator

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Order, Vehicle
from app.schemas.persistence import (
    OrderCreate,
    OrderResponse,
    OrderStatusUpdate,
    VehicleCreate,
    VehicleResponse,
)

from app.db.models import (
    DeliveryPlan,
    DeliveryPlanRoute,
    DeliveryPlanRouteOrder,
    Order,
    Vehicle,
)

from app.schemas.history import (
    OrderHistoryResponse,
    OrderPlanHistoryItem,
)

from sqlalchemy import select

from app.schemas.route_tracking import (
    RouteStopResponse,
    VehicleRouteResponse,
    VehicleRoutesResponse,
)

from sqlalchemy import func, select

from app.db.models import DeliveryPlan, Order, Vehicle
from app.schemas.dashboard import DashboardSummaryResponse

router = APIRouter(prefix="/api/v1", tags=["Resources"])


@router.post(
    "/orders",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
):
    order = Order(**payload.model_dump())
    db.add(order)

    try:
        db.commit()
        db.refresh(order)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="An order with this ID already exists.",
        ) from exc

    return order


@router.get("/orders", response_model=list[OrderResponse])
def list_orders(db: Session = Depends(get_db)):
    return db.scalars(
        select(Order).order_by(Order.id)
    ).all()


@router.post(
    "/vehicles",
    response_model=VehicleResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_vehicle(
    payload: VehicleCreate,
    db: Session = Depends(get_db),
):
    vehicle = Vehicle(**payload.model_dump())
    db.add(vehicle)

    try:
        db.commit()
        db.refresh(vehicle)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A vehicle with this ID already exists.",
        ) from exc

    return vehicle


@router.get("/vehicles", response_model=list[VehicleResponse])
def list_vehicles(db: Session = Depends(get_db)):
    return db.scalars(
        select(Vehicle).order_by(Vehicle.id)
    ).all()


@router.patch(
    "/orders/{order_id}/status",
    response_model=OrderResponse,
)
def update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    db: Session = Depends(get_db),
):
    order = db.scalar(
        select(Order)
        .where(Order.order_id == order_id)
        .with_for_update()
    )

    if order is None:
        raise HTTPException(
            status_code=404,
            detail="Order not found.",
        )

    allowed_transitions = {
        "PENDING": {"CANCELLED"},
        "ASSIGNED": {"IN_TRANSIT"},
        "IN_TRANSIT": {"DELIVERED"},
        "DELIVERED": set(),
        "CANCELLED": set(),
    }

    if payload.status not in allowed_transitions[order.status]:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Cannot change order status from "
                f"{order.status} to {payload.status}."
            ),
        )

    order.status = payload.status

    try:
        db.commit()
        db.refresh(order)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not update order status.",
        )

    return order



@router.get(
    "/orders/{order_id}/history",
    response_model=OrderHistoryResponse,
)
def get_order_history(
    order_id: str,
    db: Session = Depends(get_db),
) -> OrderHistoryResponse:
    order = db.scalar(
        select(Order).where(Order.order_id == order_id)
    )

    if order is None:
        raise HTTPException(
            status_code=404,
            detail="Order not found.",
        )

    history_rows = db.execute(
        select(
            DeliveryPlan.id,
            DeliveryPlan.created_at,
            DeliveryPlanRoute.vehicle_id,
            DeliveryPlanRouteOrder.stop_sequence,
            DeliveryPlanRoute.distance_meters,
            DeliveryPlanRoute.duration_seconds,
            DeliveryPlanRoute.load,
            DeliveryPlanRoute.capacity,
        )
        .join(
            DeliveryPlanRoute,
            DeliveryPlanRoute.plan_id == DeliveryPlan.id,
        )
        .join(
            DeliveryPlanRouteOrder,
            DeliveryPlanRouteOrder.route_id == DeliveryPlanRoute.id,
        )
        .where(DeliveryPlanRouteOrder.order_id == order_id)
        .order_by(
            DeliveryPlan.created_at.desc(),
            DeliveryPlan.id.desc(),
        )
    ).all()

    plans = [
        OrderPlanHistoryItem(
            plan_id=row[0],
            plan_created_at=row[1],
            vehicle_id=row[2],
            stop_sequence=row[3],
            distance_meters=row[4],
            duration_seconds=row[5],
            load=row[6],
            capacity=row[7],
        )
        for row in history_rows
    ]

    return OrderHistoryResponse(
        order_id=order.order_id,
        status=order.status,
        demand=order.demand,
        created_at=order.created_at,
        plans=plans,
    )


@router.get(
    "/vehicles/{vehicle_id}/routes",
    response_model=VehicleRoutesResponse,
)
def get_vehicle_routes(
    vehicle_id: str,
    db: Session = Depends(get_db),
) -> VehicleRoutesResponse:
    vehicle = db.scalar(
        select(Vehicle).where(Vehicle.vehicle_id == vehicle_id)
    )

    if vehicle is None:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found.",
        )

    route_rows = db.execute(
        select(DeliveryPlanRoute, DeliveryPlan)
        .join(
            DeliveryPlan,
            DeliveryPlan.id == DeliveryPlanRoute.plan_id,
        )
        .where(DeliveryPlanRoute.vehicle_id == vehicle_id)
        .order_by(
            DeliveryPlan.created_at.desc(),
            DeliveryPlan.id.desc(),
            DeliveryPlanRoute.id.desc(),
        )
    ).all()

    routes = []

    for route, plan in route_rows:
        stop_rows = db.execute(
            select(DeliveryPlanRouteOrder, Order)
            .outerjoin(
                Order,
                Order.order_id == DeliveryPlanRouteOrder.order_id,
            )
            .where(DeliveryPlanRouteOrder.route_id == route.id)
            .order_by(DeliveryPlanRouteOrder.stop_sequence)
        ).all()

        stops = [
            RouteStopResponse(
                order_id=route_order.order_id,
                stop_sequence=route_order.stop_sequence,
                status=order.status if order else None,
                demand=order.demand if order else None,
                latitude=order.latitude if order else None,
                longitude=order.longitude if order else None,
            )
            for route_order, order in stop_rows
        ]

        routes.append(
            VehicleRouteResponse(
                plan_id=plan.id,
                plan_created_at=plan.created_at,
                vehicle_id=route.vehicle_id,
                distance_meters=route.distance_meters,
                duration_seconds=route.duration_seconds,
                load=route.load,
                capacity=route.capacity,
                stops=stops,
                geometry=route.route_geometry,
            )
        )

    return VehicleRoutesResponse(
        vehicle_id=vehicle_id,
        routes=routes,
    )



@router.get(
    "/dashboard/summary",
    response_model=DashboardSummaryResponse,
)
def get_dashboard_summary(
    db: Session = Depends(get_db),
) -> DashboardSummaryResponse:
    statuses = [
        "PENDING",
        "ASSIGNED",
        "IN_TRANSIT",
        "DELIVERED",
        "CANCELLED",
    ]

    status_rows = db.execute(
        select(Order.status, func.count(Order.id))
        .group_by(Order.status)
    ).all()

    orders_by_status = {status: 0 for status in statuses}

    for order_status, count in status_rows:
        orders_by_status[order_status] = count

    total_orders = db.scalar(
        select(func.count()).select_from(Order)
    ) or 0

    total_vehicles = db.scalar(
        select(func.count()).select_from(Vehicle)
    ) or 0

    total_plans = db.scalar(
        select(func.count()).select_from(DeliveryPlan)
    ) or 0

    return DashboardSummaryResponse(
        total_orders=total_orders,
        orders_by_status=orders_by_status,
        total_vehicles=total_vehicles,
        total_plans=total_plans,
    )
