
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class OrderPlanHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    plan_id: int
    plan_created_at: datetime
    vehicle_id: str
    stop_sequence: int
    distance_meters: int
    duration_seconds: int
    load: int
    capacity: int


class OrderHistoryResponse(BaseModel):
    order_id: str
    status: str
    demand: int
    created_at: datetime
    plans: list[OrderPlanHistoryItem]
