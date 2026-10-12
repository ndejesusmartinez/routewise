import math
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class GeoJSONLineString(BaseModel):
    type: Literal["LineString"] = "LineString"
    coordinates: list[tuple[float, float]] = Field(min_length=2)

    @model_validator(mode="after")
    def validate_coordinates(self):
        for longitude, latitude in self.coordinates:
            if (
                not math.isfinite(longitude)
                or not math.isfinite(latitude)
                or not -180 <= longitude <= 180
                or not -90 <= latitude <= 90
            ):
                raise ValueError(
                    "Coordinates must be finite [longitude, latitude] pairs."
                )

        return self
