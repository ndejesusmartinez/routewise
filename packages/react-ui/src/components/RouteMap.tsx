import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import type { RouteData, RouteMapProps } from '../types';

const routePalette = ['#2563eb', '#059669', '#f59e0b', '#ef4444', '#7c3aed', '#0ea5e9'];

function isValidGeometryRoute(route: RouteData): boolean {
  const { geometry } = route;

  if (!geometry || geometry.type !== 'LineString') {
    return false;
  }

  return Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 2;
}

function toLatLngList(route: RouteData): [number, number][] {
  return (route.geometry?.coordinates ?? []).map(([longitude, latitude]) => [latitude, longitude] as [number, number]);
}

function createStopIcon(color: string) {
  return L.divIcon({
    className: 'routewise-stop-icon',
    html: `<span style="display:block;width:12px;height:12px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 0 0 2px rgba(15,23,42,0.1)"></span>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });
}

function RouteBoundsController({ routes }: { routes: RouteData[] }) {
  const map = useMap();

  useEffect(() => {
    if (!routes.length) {
      return;
    }

    const bounds = L.latLngBounds([]);

    routes.forEach((route) => {
      const positions = toLatLngList(route);
      positions.forEach((point) => bounds.extend(point));
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.2), { animate: true });
    }
  }, [map, routes]);

  return null;
}

export function RouteMap({
  routes,
  selectedRouteId,
  onRouteSelect,
  height = 400,
  fitBounds = true,
  showStops = true,
  showOrigin = true,
  emptyMessage = 'No existen rutas para mostrar.'
}: RouteMapProps) {
  const validRoutes = useMemo(
    () => routes.filter((route) => isValidGeometryRoute(route)),
    [routes]
  );

  const style = {
    width: '100%',
    height: typeof height === 'number' ? `${height}px` : height,
    minHeight: '220px',
    borderRadius: '0.75rem',
    overflow: 'hidden',
    border: '1px solid #dfe7ef'
  };

  if (!validRoutes.length) {
    return (
      <div style={style}>
        <div
          style={{
            height: '100%',
            display: 'grid',
            placeItems: 'center',
            background: '#f8fafc',
            color: '#475569',
            fontWeight: 500
          }}
        >
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div style={style}>
      <MapContainer
        center={[10.39, -75.48]}
        zoom={12}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {fitBounds ? <RouteBoundsController routes={validRoutes} /> : null}

        {validRoutes.map((route, index) => {
          const isSelected = selectedRouteId ? selectedRouteId === route.route_id || selectedRouteId === route.vehicle_id : false;
          const positionList = toLatLngList(route);
          const routeColor = routePalette[index % routePalette.length];

          return (
            <div key={`${route.vehicle_id}-${index}`}>
              <Polyline
                positions={positionList}
                pathOptions={{
                  color: isSelected ? '#0f172a' : routeColor,
                  weight: isSelected ? 5 : 4,
                  opacity: isSelected ? 0.95 : 0.8
                }}
                eventHandlers={{
                  click: () => {
                    onRouteSelect?.(route);
                  }
                }}
              />

              {showOrigin && route.origin ? (
                <Marker
                  position={[route.origin.latitude, route.origin.longitude]}
                  icon={createStopIcon('#0f172a')}
                  eventHandlers={{
                    click: () => {
                      onRouteSelect?.(route);
                    }
                  }}
                >
                  <Popup>Origen · {route.origin.label ?? route.vehicle_id}</Popup>
                </Marker>
              ) : null}

              {showStops && Array.isArray(route.stops)
                ? route.stops.map((stop, stopIndex) => (
                    <Marker
                      key={`${route.vehicle_id}-stop-${stopIndex}`}
                      position={[stop.latitude, stop.longitude]}
                      icon={createStopIcon(routeColor)}
                      eventHandlers={{
                        click: () => {
                          onRouteSelect?.(route);
                        }
                      }}
                    >
                      <Popup>{stop.label ?? `Parada ${stopIndex + 1}`}</Popup>
                    </Marker>
                  ))
                : null}
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}
