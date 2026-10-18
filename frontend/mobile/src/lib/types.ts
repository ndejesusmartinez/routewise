export type OrderStatus = 'PENDING' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';

export interface Order {
  id: number;
  order_id: string;
  demand: number;
  latitude: number;
  longitude: number;
  created_at: string;
  status: OrderStatus;
}

export interface Vehicle {
  id: number;
  vehicle_id: string;
  capacity: number;
}

export interface PlanSummary {
  plan_id: number;
  created_at: string;
  total_distance_meters: number;
  total_duration_seconds: number;
  provider: string;
}

export interface RouteGeometry {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface PlannedRoute {
  vehicle_id: string;
  order_ids: string[];
  distance_meters: number;
  duration_seconds: number;
  load: number;
  capacity: number;
  geometry: RouteGeometry | null;
}

export interface RoutePlan {
  plan_id: number;
  created_at: string;
  routes: PlannedRoute[];
  total_distance_meters: number;
  total_duration_seconds: number;
  provider: string;
}

export interface DashboardSummary {
  total_orders: number;
  orders_by_status: Record<string, number>;
  total_vehicles: number;
  total_plans: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}
