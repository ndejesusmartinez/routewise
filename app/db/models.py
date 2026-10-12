from datetime import datetime

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[str] = mapped_column(
        String(50), unique=True, index=True
    )
    demand: Mapped[int] = mapped_column(Integer)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="PENDING",
        server_default="PENDING",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(primary_key=True)
    vehicle_id: Mapped[str] = mapped_column(
        String(50), unique=True, index=True
    )
    capacity: Mapped[int] = mapped_column(Integer)


class DeliveryPlan(Base):
    __tablename__ = "delivery_plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    total_distance_meters: Mapped[int] = mapped_column(Integer)
    total_duration_seconds: Mapped[int] = mapped_column(Integer)
    provider: Mapped[str] = mapped_column(String(30))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )


class DeliveryPlanRoute(Base):
    __tablename__ = "delivery_plan_routes"

    id: Mapped[int] = mapped_column(primary_key=True)
    plan_id: Mapped[int] = mapped_column(
        ForeignKey("delivery_plans.id", ondelete="CASCADE"),
        index=True,
    )
    vehicle_id: Mapped[str] = mapped_column(String(50))
    distance_meters: Mapped[int] = mapped_column(Integer)
    duration_seconds: Mapped[int] = mapped_column(Integer)
    load: Mapped[int] = mapped_column(Integer)
    capacity: Mapped[int] = mapped_column(Integer)


class DeliveryPlanRouteOrder(Base):
    __tablename__ = "delivery_plan_route_orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    route_id: Mapped[int] = mapped_column(
        ForeignKey("delivery_plan_routes.id", ondelete="CASCADE"),
        index=True,
    )
    order_id: Mapped[str] = mapped_column(String(50))
    stop_sequence: Mapped[int] = mapped_column(Integer)
