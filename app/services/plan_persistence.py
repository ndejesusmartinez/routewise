from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.models import (
    DeliveryPlan,
    DeliveryPlanRoute,
    DeliveryPlanRouteOrder,
)


def persist_delivery_plan(db: Session, result: dict, commit: bool = True,) -> DeliveryPlan:
    try:
        plan = DeliveryPlan(
            total_distance_meters=result["total_distance_meters"],
            total_duration_seconds=result["total_duration_seconds"],
            provider=result["provider"],
        )
        db.add(plan)
        db.flush()

        for route_data in result["routes"]:
            route = DeliveryPlanRoute(
                plan_id=plan.id,
                vehicle_id=route_data["vehicle_id"],
                distance_meters=route_data["distance_meters"],
                duration_seconds=route_data["duration_seconds"],
                load=route_data["load"],
                capacity=route_data["capacity"],
                route_geometry=route_data.get("geometry"),
            )
            db.add(route)
            db.flush()

            for sequence, order_id in enumerate(
                route_data["order_ids"],
                start=1,
            ):
                db.add(
                    DeliveryPlanRouteOrder(
                        route_id=route.id,
                        order_id=order_id,
                        stop_sequence=sequence,
                    )
                )

        if commit:
            db.commit()
            db.refresh(plan)

        return plan

    except SQLAlchemyError:
        db.rollback()
        raise