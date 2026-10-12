
from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.geometry import GeoJSONLineString


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
    geometry: GeoJSONLineString | None = Field(
        default=None,
        description=(
            "GeoJSON LineString road geometry; null when unavailable "
            "or for legacy routes."
        ),
    )


class VehicleRoutesResponse(BaseModel):
    vehicle_id: str
    routes: list[VehicleRouteResponse]
