export type GeoJSONCoordinate = [number, number];

export interface RouteGeometry {
  type: 'LineString';
  coordinates: GeoJSONCoordinate[];
}

export interface RouteStop {
  latitude: number;
  longitude: number;
  label?: string;
}

export interface RouteData {
  vehicle_id: string;
  order_ids: string[];
  distance_meters: number;
  duration_seconds: number;
  load: number;
  capacity: number;
  geometry: RouteGeometry | null;
  route_id?: string;
  origin?: RouteStop | null;
  stops?: RouteStop[];
  [key: string]: unknown;
}

export interface RouteMapProps {
  routes: RouteData[];
  selectedRouteId?: string | null;
  onRouteSelect?: (route: RouteData | null) => void;
  height?: number | string;
  fitBounds?: boolean;
  showStops?: boolean;
  showOrigin?: boolean;
  emptyMessage?: string;
}
