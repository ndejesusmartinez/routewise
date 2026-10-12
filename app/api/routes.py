from fastapi import APIRouter, HTTPException

from app import db
from app.schemas.route import (
    RouteOptimizationRequest,
    RouteOptimizationResponse,
)
from app.services.route_optimizer import optimize_route

from app.schemas.route import (
    CapacityOptimizationRequest,
    CapacityOptimizationResponse,
)
from app.services.capacity_optimizer import optimize_capacity_routes

from app.schemas.route import (
    NamedCapacityOptimizationRequest,
    NamedCapacityOptimizationResponse,
)
from app.services.named_route_optimizer import optimize_named_routes

from app.schemas.location import (
    DistanceMatrixRequest,
    DistanceMatrixResponse,
)
from app.services.osrm_client import build_distance_matrix

from app.schemas.planning import (
    DeliveryPlanRequest,
    DeliveryPlanResponse,
    DeliveryPlanSummary,
    RegisteredDeliveryPlanRequest,
)
from app.services.delivery_planner import plan_deliveries

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import (
    DeliveryPlan,
    DeliveryPlanRoute,
    DeliveryPlanRouteOrder,
    Order,
    Vehicle,
)
from fastapi import APIRouter, Depends, HTTPException, Query
from app.services.plan_persistence import persist_delivery_plan
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter(prefix="/api/v1/routes", tags=["Routes"])


@router.post(
    "/optimize",
    response_model=RouteOptimizationResponse,
)
def optimize_delivery_routes(
    request: RouteOptimizationRequest,
) -> RouteOptimizationResponse:
    try:
        result = optimize_route(
            distance_matrix=request.distance_matrix,
            vehicle_count=request.vehicle_count,
            depot=request.depot,
        )

        return RouteOptimizationResponse(**result)

    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    except RuntimeError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc



 
@router.post(
    "/optimize-capacity",
    response_model=CapacityOptimizationResponse,
)
def optimize_routes_with_capacity(
    request: CapacityOptimizationRequest,
) -> CapacityOptimizationResponse:
    try:
        result = optimize_capacity_routes(
            distance_matrix=request.distance_matrix,
            demands=request.demands,
            vehicle_capacities=request.vehicle_capacities,
            depot=request.depot,
        )
        return CapacityOptimizationResponse(**result)

    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    except RuntimeError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


 
@router.post(
    "/optimize-orders",
    response_model=NamedCapacityOptimizationResponse,
)
def optimize_named_delivery_routes(
    request: NamedCapacityOptimizationRequest,
) -> NamedCapacityOptimizationResponse:
    try:
        result = optimize_named_routes(
            distance_matrix=request.distance_matrix,
            orders=[
                order.model_dump()
                for order in request.orders
            ],
            vehicles=[
                vehicle.model_dump()
                for vehicle in request.vehicles
            ],
            depot=request.depot,
        )

        return NamedCapacityOptimizationResponse(**result)

    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    except RuntimeError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

 
@router.post(
    "/matrix",
    response_model=DistanceMatrixResponse,
)
def create_distance_matrix(
    request: DistanceMatrixRequest,
) -> DistanceMatrixResponse:
    try:
        result = build_distance_matrix(
            [location.model_dump() for location in request.locations]
        )

        return DistanceMatrixResponse(
            locations=request.locations,
            **result,
        )

    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


 
@router.post(
    "/plan-deliveries",
    response_model=DeliveryPlanResponse,
    status_code=201,
)
def create_delivery_plan(
    request: DeliveryPlanRequest,
    db: Session = Depends(get_db),
) -> DeliveryPlanResponse:
    # 1. Calcular las rutas. Todavía no guardamos nada.
    try:
        result = plan_deliveries(
            depot=request.depot.model_dump(),
            orders=[
                order.model_dump() for order in request.orders
            ],
            vehicles=[
                vehicle.model_dump() for vehicle in request.vehicles
            ],
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc

    # 2. Guardar el plan y sus rutas en una sola transacción.
    try:
        plan = persist_delivery_plan(db, result)
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Could not save the delivery plan.",
        ) from exc

    return DeliveryPlanResponse(
        plan_id=plan.id,
        created_at=plan.created_at,
        **result,
    )


@router.get(
    "/plans/{plan_id}",
    response_model=DeliveryPlanResponse,
)
def get_delivery_plan(
    plan_id: int,
    db: Session = Depends(get_db),
) -> DeliveryPlanResponse:
    plan = db.get(DeliveryPlan, plan_id)

    if plan is None:
        raise HTTPException(
            status_code=404,
            detail="Delivery plan not found.",
        )

    routes = db.scalars(
        select(DeliveryPlanRoute)
        .where(DeliveryPlanRoute.plan_id == plan_id)
        .order_by(DeliveryPlanRoute.id)
    ).all()

    planned_routes = []

    for route in routes:
        order_ids = db.scalars(
            select(DeliveryPlanRouteOrder.order_id)
            .where(DeliveryPlanRouteOrder.route_id == route.id)
            .order_by(DeliveryPlanRouteOrder.stop_sequence)
        ).all()

        planned_routes.append({
            "vehicle_id": route.vehicle_id,
            "order_ids": list(order_ids),
            "distance_meters": route.distance_meters,
            "duration_seconds": route.duration_seconds,
            "load": route.load,
            "capacity": route.capacity,
        })

    return DeliveryPlanResponse(
        plan_id=plan.id,
        created_at=plan.created_at,
        routes=planned_routes,
        total_distance_meters=plan.total_distance_meters,
        total_duration_seconds=plan.total_duration_seconds,
        provider=plan.provider,
    )



@router.get(
    "/plans",
    response_model=list[DeliveryPlanSummary],
)
def list_delivery_plans(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[DeliveryPlanSummary]:
    plans = db.scalars(
        select(DeliveryPlan)
        .order_by(
            DeliveryPlan.created_at.desc(),
            DeliveryPlan.id.desc(),
        )
        .offset(skip)
        .limit(limit)
    ).all()

    return [
        DeliveryPlanSummary(
            plan_id=plan.id,
            created_at=plan.created_at,
            total_distance_meters=plan.total_distance_meters,
            total_duration_seconds=plan.total_duration_seconds,
            provider=plan.provider,
        )
        for plan in plans
    ]


@router.post(
    "/plan-registered",
    response_model=DeliveryPlanResponse,
    status_code=201,
)
def create_registered_delivery_plan(
    request: RegisteredDeliveryPlanRequest,
    db: Session = Depends(get_db),
) -> DeliveryPlanResponse:
    # Consultar pedidos y vehículos registrados.
    orders_by_id = {
        order.order_id: order
        for order in db.scalars(
            select(Order)
            .where(Order.order_id.in_(request.order_ids))
            .with_for_update()
        ).all()
    }

    vehicles_by_id = {
        vehicle.vehicle_id: vehicle
        for vehicle in db.scalars(
            select(Vehicle).where(
                Vehicle.vehicle_id.in_(request.vehicle_ids)
            )
        ).all()
    }

    missing_orders = [
        order_id
        for order_id in request.order_ids
        if order_id not in orders_by_id
    ]
    missing_vehicles = [
        vehicle_id
        for vehicle_id in request.vehicle_ids
        if vehicle_id not in vehicles_by_id
    ]

    if missing_orders or missing_vehicles:
        db.rollback()
        raise HTTPException(
            status_code=404,
            detail={
                "missing_order_ids": missing_orders,
                "missing_vehicle_ids": missing_vehicles,
            },
        )

    # Solo los pedidos pendientes pueden asignarse a un nuevo plan.
    unavailable_orders = [
        order_id
        for order_id in request.order_ids
        if orders_by_id[order_id].status != "PENDING"
    ]

    if unavailable_orders:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Only pending orders can be planned.",
                "order_ids": unavailable_orders,
            },
        )


    # Respetar el orden solicitado por el cliente.
    orders = [
        {
            "order_id": order.order_id,
            "demand": order.demand,
            "latitude": order.latitude,
            "longitude": order.longitude,
        }
        for order in (
            orders_by_id[order_id]
            for order_id in request.order_ids
        )
    ]

    vehicles = [
        {
            "vehicle_id": vehicle.vehicle_id,
            "capacity": vehicle.capacity,
        }
        for vehicle in (
            vehicles_by_id[vehicle_id]
            for vehicle_id in request.vehicle_ids
        )
    ]

    # Validar capacidad antes de llamar a OSRM.
    total_demand = sum(order["demand"] for order in orders)
    total_capacity = sum(vehicle["capacity"] for vehicle in vehicles)
    max_capacity = max(vehicle["capacity"] for vehicle in vehicles)

    if total_demand > total_capacity:
        raise HTTPException(
            status_code=422,
            detail="Total demand exceeds total vehicle capacity.",
        )

    oversized_orders = [
        order["order_id"]
        for order in orders
        if order["demand"] > max_capacity
    ]

    if oversized_orders:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Some orders exceed the capacity of every vehicle.",
                "order_ids": oversized_orders,
            },
        )

    # Calcular las rutas.
    try:
        result = plan_deliveries(
            depot=request.depot.model_dump(),
            orders=orders,
            vehicles=vehicles,
        )
    except ValueError as exc:
        db.rollback()
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc
    except RuntimeError as exc:
        db.rollback()
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc

    # Guardar el plan en PostgreSQL.
    try:
        plan = persist_delivery_plan(db, result, commit=False)

        for order_id in request.order_ids:
            orders_by_id[order_id].status = "ASSIGNED"

        db.commit()
        db.refresh(plan)

    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not save the delivery plan.",
        ) from exc

    return DeliveryPlanResponse(
        plan_id=plan.id,
        created_at=plan.created_at,
        **result,
    )