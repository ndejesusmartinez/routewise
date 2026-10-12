from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from typing import Literal

class OrderCreate(BaseModel):
    order_id: str = Field(min_length=1, max_length=50)
    demand: int = Field(gt=0)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class OrderResponse(OrderCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    status: Literal[
        "PENDING",
        "ASSIGNED",
        "IN_TRANSIT",
        "DELIVERED",
        "CANCELLED",
    ]


class VehicleCreate(BaseModel):
    vehicle_id: str = Field(min_length=1, max_length=50)
    capacity: int = Field(gt=0)


class VehicleResponse(VehicleCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int

class OrderStatusUpdate(BaseModel):
    status: Literal[
        "IN_TRANSIT",
        "DELIVERED",
        "CANCELLED",
    ]