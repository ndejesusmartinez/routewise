from pydantic import BaseModel, Field, model_validator


class RouteOptimizationRequest(BaseModel):
    distance_matrix: list[list[int]] = Field(
        description="Square matrix of distances between locations."
    )
    vehicle_count: int = Field(default=1, ge=1)
    depot: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def validate_problem(self):
        size = len(self.distance_matrix)

        if size == 0:
            raise ValueError("The distance matrix cannot be empty.")

        if any(len(row) != size for row in self.distance_matrix):
            raise ValueError("The distance matrix must be square.")

        if self.vehicle_count > size:
            raise ValueError("Vehicle count cannot exceed matrix size.")

        if self.depot >= size:
            raise ValueError("Depot index is outside the matrix.")

        if any(
            distance < 0
            for row in self.distance_matrix
            for distance in row
        ):
            raise ValueError("Distances cannot be negative.")

        return self


class VehicleRoute(BaseModel):
    vehicle_id: int
    stops: list[int]
    distance: int


class RouteOptimizationResponse(BaseModel):
    routes: list[VehicleRoute]
    total_distance: int

class DeliveryOrder(BaseModel):
    order_id: str = Field(min_length=1, max_length=50)
    demand: int = Field(ge=0, description="Required vehicle capacity units")


class Vehicle(BaseModel):
    vehicle_id: str = Field(min_length=1, max_length=50)
    capacity: int = Field(ge=0, description="Maximum load capacity")


class CapacityOptimizationRequest(BaseModel):
    distance_matrix: list[list[int]]
    demands: list[int]
    vehicle_capacities: list[int]
    depot: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def validate_problem(self):
        size = len(self.distance_matrix)

        if size == 0:
            raise ValueError("The distance matrix cannot be empty.")

        if any(len(row) != size for row in self.distance_matrix):
            raise ValueError("The distance matrix must be square.")

        if len(self.demands) != size:
            raise ValueError("There must be one demand per location.")

        if not self.vehicle_capacities:
            raise ValueError("At least one vehicle is required.")

        if any(d < 0 for d in self.demands):
            raise ValueError("Demands cannot be negative.")

        if any(c < 0 for c in self.vehicle_capacities):
            raise ValueError("Capacities cannot be negative.")

        if any(d < 0 for row in self.distance_matrix for d in row):
            raise ValueError("Distances cannot be negative.")

        if self.depot >= size:
            raise ValueError("Depot index is outside the matrix.")

        if self.demands[self.depot] != 0:
            raise ValueError("Depot demand must be zero.")

        if sum(self.demands) > sum(self.vehicle_capacities):
            raise ValueError("Total demand exceeds total vehicle capacity.")

        return self


class CapacityVehicleRoute(BaseModel):
    vehicle_id: int
    stops: list[int]
    distance: int
    load: int
    capacity: int


class CapacityOptimizationResponse(BaseModel):
    routes: list[CapacityVehicleRoute]
    total_distance: int

class DeliveryOrderInput(BaseModel):
    order_id: str = Field(min_length=1, max_length=50)
    demand: int = Field(gt=0, description="Load required by this order")


class VehicleInput(BaseModel):
    vehicle_id: str = Field(min_length=1, max_length=50)
    capacity: int = Field(gt=0)


class NamedCapacityOptimizationRequest(BaseModel):
    distance_matrix: list[list[int]]
    orders: list[DeliveryOrderInput]
    vehicles: list[VehicleInput]
    depot: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def validate_problem(self):
        size = len(self.distance_matrix)

        if size != len(self.orders) + 1:
            raise ValueError(
                "Matrix size must equal the number of orders plus the depot."
            )

        if size == 0:
            raise ValueError("The distance matrix cannot be empty.")

        if any(len(row) != size for row in self.distance_matrix):
            raise ValueError("The distance matrix must be square.")

        if not self.vehicles:
            raise ValueError("At least one vehicle is required.")

        if self.depot >= size:
            raise ValueError("Depot index is outside the matrix.")

        if any(
            distance < 0
            for row in self.distance_matrix
            for distance in row
        ):
            raise ValueError("Distances cannot be negative.")

        order_ids = [order.order_id for order in self.orders]
        vehicle_ids = [vehicle.vehicle_id for vehicle in self.vehicles]

        if len(order_ids) != len(set(order_ids)):
            raise ValueError("Order IDs must be unique.")

        if len(vehicle_ids) != len(set(vehicle_ids)):
            raise ValueError("Vehicle IDs must be unique.")

        return self


class NamedVehicleRoute(BaseModel):
    vehicle_id: str
    order_ids: list[str]
    distance: int
    load: int
    capacity: int


class NamedCapacityOptimizationResponse(BaseModel):
    routes: list[NamedVehicleRoute]
    total_distance: int
