import type {
  DashboardSummary,
  Order,
  OrderStatus,
  PlanSummary,
  RoutePlan,
  Vehicle
} from './types';

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

export interface CreatePlanInput {
  depot: {
    location_id: string;
    latitude: number;
    longitude: number;
  };
  order_ids: string[];
  vehicle_ids: string[];
}

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

async function request<T>(baseUrl: string, path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers
      }
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`No se pudo conectar con ${baseUrl}. Verifica la dirección de la API y que el backend esté activo.`);
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

export function fetchDashboardSummary(baseUrl: string): Promise<DashboardSummary> {
  return request(baseUrl, '/api/v1/dashboard/summary');
}

export function fetchOrders(baseUrl: string): Promise<Order[]> {
  return request(baseUrl, '/api/v1/orders');
}

export function fetchVehicles(baseUrl: string): Promise<Vehicle[]> {
  return request(baseUrl, '/api/v1/vehicles');
}

export function fetchPlans(baseUrl: string): Promise<PlanSummary[]> {
  return request(baseUrl, '/api/v1/routes/plans?limit=50');
}

export function fetchRoutePlan(baseUrl: string, planId: number): Promise<RoutePlan> {
  return request(baseUrl, `/api/v1/routes/plans/${planId}`);
}

export function createOrder(baseUrl: string, order: CreateOrderInput): Promise<Order> {
  return request(baseUrl, '/api/v1/orders', {
    method: 'POST',
    body: JSON.stringify(order)
  });
}

export function createVehicle(baseUrl: string, vehicle: CreateVehicleInput): Promise<Vehicle> {
  return request(baseUrl, '/api/v1/vehicles', {
    method: 'POST',
    body: JSON.stringify(vehicle)
  });
}

export function updateOrderStatus(baseUrl: string, orderId: string, status: OrderStatus): Promise<Order> {
  return request(baseUrl, `/api/v1/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

export function createRegisteredPlan(baseUrl: string, plan: CreatePlanInput): Promise<RoutePlan> {
  return request(baseUrl, '/api/v1/routes/plan-registered', {
    method: 'POST',
    body: JSON.stringify(plan)
  });
}
