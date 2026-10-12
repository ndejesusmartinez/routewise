from json import JSONDecodeError

import httpx
from pydantic import ValidationError

from app.schemas.geometry import GeoJSONLineString

OSRM_TABLE_URL = "https://router.project-osrm.org/table/v1/driving"
OSRM_ROUTE_URL = "https://router.project-osrm.org/route/v1/driving"


def build_distance_matrix(locations: list[dict]) -> dict:
    if len(locations) < 2:
        raise ValueError("At least two locations are required.")

    if len(locations) > 50:
        raise ValueError("A maximum of 50 locations is allowed.")

    coordinates = ";".join(
        f"{location['longitude']},{location['latitude']}"
        for location in locations
    )

    url = f"{OSRM_TABLE_URL}/{coordinates}"

    try:
        response = httpx.get(
            url,
            params={"annotations": "distance,duration"},
            timeout=20.0,
            headers={"User-Agent": "RouteWise/0.1.0"},
        )
        response.raise_for_status()
        data = response.json()

    except httpx.HTTPError as exc:
        raise RuntimeError(
            "Could not connect to the OSRM routing service."
        ) from exc

    if data.get("code") != "Ok":
        raise RuntimeError(
            f"OSRM returned an error: {data.get('code', 'Unknown error')}"
        )

    distances = data.get("distances")
    durations = data.get("durations")

    if distances is None or durations is None:
        raise RuntimeError("OSRM did not return the requested matrices.")

    if any(
        value is None
        for matrix in (distances, durations)
        for row in matrix
        for value in row
    ):
        raise ValueError(
            "No drivable route exists between some locations."
        )

    return {
        "distance_matrix": [
            [round(value) for value in row]
            for row in distances
        ],
        "duration_matrix": [
            [round(value) for value in row]
            for row in durations
        ],
    }


def build_route_geometry(
    locations: list[dict],
) -> GeoJSONLineString | None:
    if len(locations) < 2:
        raise ValueError("At least two locations are required.")

    coordinates = ";".join(
        f"{location['longitude']},{location['latitude']}"
        for location in locations
    )
    url = f"{OSRM_ROUTE_URL}/{coordinates}"

    try:
        response = httpx.get(
            url,
            params={
                "overview": "full",
                "geometries": "geojson",
                "steps": "false",
            },
            timeout=20.0,
            headers={"User-Agent": "RouteWise/0.1.0"},
        )
        response.raise_for_status()
        data = response.json()
    except (httpx.HTTPError, JSONDecodeError) as exc:
        raise RuntimeError(
            "Could not connect to the OSRM routing service."
        ) from exc

    if not isinstance(data, dict):
        return None

    if data.get("code") != "Ok":
        raise RuntimeError(
            f"OSRM returned an error: {data.get('code', 'Unknown error')}"
        )

    routes = data.get("routes")
    if not isinstance(routes, list) or not routes:
        return None

    route = routes[0]
    if not isinstance(route, dict):
        return None

    geometry = route.get("geometry")
    if not isinstance(geometry, dict):
        return None

    try:
        return GeoJSONLineString.model_validate(geometry)
    except ValidationError:
        return None
