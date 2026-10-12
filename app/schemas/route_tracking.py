
from datetime import datetime

from pydantic import BaseModel


class RouteStopResponse(BaseModel):
    order_id: str
    stop_sequence: int
    status: str | None = None
    demand: int | None = None
    latitude: float | None = None
    longitude: float | None = None


class VehicleRouteResponse(BaseModel):
    plan_id: int
    plan_created_at: datetime
    vehicle_id: str
    distance_meters: int
    duration_seconds: int
    load: int
    capacity: int
    stops: list[RouteStopResponse]


class VehicleRoutesResponse(BaseModel):
    vehicle_id: str
    routes: list[VehicleRouteResponse]
