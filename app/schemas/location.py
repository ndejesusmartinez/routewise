from pydantic import BaseModel, Field


class LocationInput(BaseModel):
    location_id: str = Field(min_length=1, max_length=50)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class DistanceMatrixRequest(BaseModel):
    locations: list[LocationInput] = Field(min_length=2, max_length=50)


class DistanceMatrixResponse(BaseModel):
    locations: list[LocationInput]
    distance_matrix: list[list[int]]
    duration_matrix: list[list[int]]
    distance_unit: str = "meters"
    duration_unit: str = "seconds"
    provider: str = "OSRM"
