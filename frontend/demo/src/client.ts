import type { RouteData } from '@routewise/react-ui';

export interface RoutePlanResponse {
  plan_id: number;
  created_at: string;
  routes: RouteData[];
  total_distance_meters: number;
  total_duration_seconds: number;
  provider: string;
}

export interface PlanSummary {
  plan_id: number;
  created_at: string;
  total_distance_meters: number;
  total_duration_seconds: number;
  provider: string;
}

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

export interface DashboardSummary {
  total_orders: number;
  orders_by_status: Record<string, number>;
  total_vehicles: number;
  total_plans: number;
}

export interface CreateOrderInput {
  order_id: string;
  demand: number;
  latitude: number;
  longitude: number;
}

export interface CreateVehicleInput {
  vehicle_id: string;
  capacity: number;
}

export interface CreateRegisteredPlanInput {
  depot: {
    location_id: string;
    latitude: number;
    longitude: number;
  };
  order_ids: string[];
  vehicle_ids: string[];
}

const defaultApiBaseUrl = 'http://127.0.0.1:8000';
const apiBaseUrl = (import.meta.env.VITE_ROUTEWISE_API_URL ?? defaultApiBaseUrl).replace(/\/$/, '');

function getErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === 'object' && payload !== null && 'detail' in payload) {
    const detail = payload.detail;

    if (typeof detail === 'string') {
      return detail;
    }

    if (detail !== undefined) {
      return JSON.stringify(detail);
    }
  }

  return `La solicitud falló (HTTP ${status}).`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers
      }
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`No se pudo conectar con la API en ${apiBaseUrl}. Verifica que el backend esté ejecutándose.`);
    }

    throw error;
  }

  if (!response.ok) {
    let payload: unknown = null;

    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    throw new Error(getErrorMessage(payload, response.status));
  }

  try {
    return await response.json() as T;
  } catch {
    throw new Error('La API devolvió una respuesta JSON inválida.');
  }
}

export function fetchDashboardSummary(): Promise<DashboardSummary> {
  return request('/api/v1/dashboard/summary');
}

export function fetchOrders(): Promise<Order[]> {
  return request('/api/v1/orders');
}

export function fetchVehicles(): Promise<Vehicle[]> {
  return request('/api/v1/vehicles');
}

export function fetchPlans(): Promise<PlanSummary[]> {
  return request('/api/v1/routes/plans?limit=50');
}

export function fetchRoutePlan(planId: number): Promise<RoutePlanResponse> {
  return request(`/api/v1/routes/plans/${planId}`);
}

export function createOrder(order: CreateOrderInput): Promise<Order> {
  return request('/api/v1/orders', {
    method: 'POST',
    body: JSON.stringify(order)
  });
}

export function createVehicle(vehicle: CreateVehicleInput): Promise<Vehicle> {
  return request('/api/v1/vehicles', {
    method: 'POST',
    body: JSON.stringify(vehicle)
  });
}

export function updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
  return request(`/api/v1/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

export function createRegisteredPlan(plan: CreateRegisteredPlanInput): Promise<RoutePlanResponse> {
  return request('/api/v1/routes/plan-registered', {
    method: 'POST',
    body: JSON.stringify(plan)
  });
}
