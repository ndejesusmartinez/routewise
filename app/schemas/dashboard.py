
from pydantic import BaseModel


class DashboardSummaryResponse(BaseModel):
    total_orders: int
    orders_by_status: dict[str, int]
    total_vehicles: int
    total_plans: int
