from pydantic import BaseModel, Field, model_validator
from datetime import datetime   

from app.schemas.geometry import GeoJSONLineString

class PlanningDepot(BaseModel):
    location_id: str = Field(default="DEPOT-001", min_length=1, max_length=50)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class PlanningOrder(BaseModel):
    order_id: str = Field(min_length=1, max_length=50)
    demand: int = Field(gt=0)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class PlanningVehicle(BaseModel):
    vehicle_id: str = Field(min_length=1, max_length=50)
    capacity: int = Field(gt=0)


class DeliveryPlanRequest(BaseModel):
    depot: PlanningDepot
    orders: list[PlanningOrder] = Field(min_length=1, max_length=49)
    vehicles: list[PlanningVehicle] = Field(min_length=1, max_length=50)

    @model_validator(mode="after")
    def validate_ids_and_capacity(self):
        order_ids = [order.order_id for order in self.orders]
        vehicle_ids = [vehicle.vehicle_id for vehicle in self.vehicles]

        if len(order_ids) != len(set(order_ids)):
            raise ValueError("Order IDs must be unique.")

        if len(vehicle_ids) != len(set(vehicle_ids)):
            raise ValueError("Vehicle IDs must be unique.")

        if sum(order.demand for order in self.orders) > sum(
            vehicle.capacity for vehicle in self.vehicles
        ):
            raise ValueError("Total demand exceeds total vehicle capacity.")

        if max(order.demand for order in self.orders) > max(
            vehicle.capacity for vehicle in self.vehicles
        ):
            raise ValueError("An order exceeds the capacity of every vehicle.")

        return self


class PlannedRoute(BaseModel):
    vehicle_id: str
    order_ids: list[str]
    distance_meters: int
    duration_seconds: int
    load: int
    capacity: int
    geometry: GeoJSONLineString | None = Field(
        default=None,
        description=(
            "GeoJSON LineString road geometry; null when unavailable "
            "or for legacy routes."
        ),
    )


class DeliveryPlanResponse(BaseModel):
    plan_id: int
    created_at: datetime
    routes: list[PlannedRoute]
    total_distance_meters: int
    total_duration_seconds: int
    provider: str = "OSRM"


class DeliveryPlanSummary(BaseModel):
    plan_id: int
    created_at: datetime
    total_distance_meters: int
    total_duration_seconds: int
    provider: str

class RegisteredDeliveryPlanRequest(BaseModel):
    depot: PlanningDepot
    order_ids: list[str] = Field(min_length=1, max_length=49)
    vehicle_ids: list[str] = Field(min_length=1, max_length=50)

    @model_validator(mode="after")
    def validate_unique_ids(self):
        if len(self.order_ids) != len(set(self.order_ids)):
            raise ValueError("Order IDs must be unique.")

        if len(self.vehicle_ids) != len(set(self.vehicle_ids)):
            raise ValueError("Vehicle IDs must be unique.")

        return self