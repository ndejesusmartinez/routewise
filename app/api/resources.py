from collections.abc import Generator

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
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
    except Exception:
        db.rollback()
        raise

    return order