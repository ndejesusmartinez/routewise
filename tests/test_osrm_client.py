import httpx
import pytest

from app.services import osrm_client


def test_build_route_geometry_requests_and_parses_geojson(monkeypatch):
    request_data = {}
    expected_geometry = {
        "type": "LineString",
        "coordinates": [
            [-75.5253, 10.4236],
            [-75.5300, 10.4200],
            [-75.5400, 10.4100],
        ],
    }

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "code": "Ok",
                "routes": [{"geometry": expected_geometry}],
            }

    def fake_get(url, params, timeout, headers):
        request_data.update(
            url=url,
            params=params,
            timeout=timeout,
            headers=headers,
        )
        return FakeResponse()

    monkeypatch.setattr(osrm_client.httpx, "get", fake_get)

    geometry = osrm_client.build_route_geometry(
        [
            {"latitude": 10.4236, "longitude": -75.5253},
            {"latitude": 10.42, "longitude": -75.53},
            {"latitude": 10.41, "longitude": -75.54},
        ]
    )

    assert geometry is not None
    assert geometry.model_dump(mode="json") == expected_geometry
    assert request_data["url"].endswith(
        "-75.5253,10.4236;-75.53,10.42;-75.54,10.41"
    )
    assert request_data["params"] == {
        "overview": "full",
        "geometries": "geojson",
        "steps": "false",
    }
    assert request_data["timeout"] == 20.0


def test_build_route_geometry_returns_none_for_invalid_or_empty_geometry(
    monkeypatch,
):
    responses = iter(
        [
            {"code": "Ok", "routes": [{"geometry": {}}]},
            {
                "code": "Ok",
                "routes": [
                    {
                        "geometry": {
                            "type": "LineString",
                            "coordinates": [],
                        }
                    }
                ],
            },
            {
                "code": "Ok",
                "routes": [
                    {
                        "geometry": {
                            "type": "LineString",
                            "coordinates": [[-75.5, 10.4]],
                        }
                    }
                ],
            },
        ]
    )

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return next(responses)

    monkeypatch.setattr(
        osrm_client.httpx,
        "get",
        lambda *args, **kwargs: FakeResponse(),
    )
    locations = [
        {"latitude": 10.4, "longitude": -75.5},
        {"latitude": 10.5, "longitude": -75.6},
    ]

    assert osrm_client.build_route_geometry(locations) is None
    assert osrm_client.build_route_geometry(locations) is None
    assert osrm_client.build_route_geometry(locations) is None


def test_build_route_geometry_raises_for_osrm_http_failure(monkeypatch):
    def fake_get(*args, **kwargs):
        request = httpx.Request("GET", "https://osrm.test/route")
        response = httpx.Response(503, request=request)
        raise httpx.HTTPStatusError(
            "OSRM unavailable",
            request=request,
            response=response,
        )

    monkeypatch.setattr(osrm_client.httpx, "get", fake_get)

    with pytest.raises(RuntimeError, match="Could not connect to the OSRM"):
        osrm_client.build_route_geometry(
            [
                {"latitude": 10.4, "longitude": -75.5},
                {"latitude": 10.5, "longitude": -75.6},
            ]
        )


def test_build_route_geometry_raises_for_osrm_error_response(monkeypatch):
    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"code": "NoRoute"}

    monkeypatch.setattr(
        osrm_client.httpx,
        "get",
        lambda *args, **kwargs: FakeResponse(),
    )

    with pytest.raises(RuntimeError, match="OSRM returned an error: NoRoute"):
        osrm_client.build_route_geometry(
            [
                {"latitude": 10.4, "longitude": -75.5},
                {"latitude": 10.5, "longitude": -75.6},
            ]
        )
