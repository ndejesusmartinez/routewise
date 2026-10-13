import type { RouteData } from '@routewise/react-ui';

export interface RoutePlanResponse {
  plan_id: number;
  created_at: string;
  routes: RouteData[];
  total_distance_meters: number;
  total_duration_seconds: number;
  provider: string;
}

const defaultApiBaseUrl = 'http://127.0.0.1:8000';
const resolvedApiBaseUrl = (import.meta.env.VITE_ROUTEWISE_API_URL ?? defaultApiBaseUrl).replace(/\/$/, '');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRouteData(value: unknown): value is RouteData {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.vehicle_id === 'string' &&
    Array.isArray(value.order_ids) &&
    typeof value.distance_meters === 'number' &&
    typeof value.duration_seconds === 'number' &&
    typeof value.load === 'number' &&
    typeof value.capacity === 'number' &&
    (value.geometry === null || (isRecord(value.geometry) && value.geometry.type === 'LineString'))
  );
}

export async function fetchRoutePlan(planId: number): Promise<RoutePlanResponse> {
  const url = new URL(`/api/v1/routes/plans/${planId}`, `${resolvedApiBaseUrl}/`).toString();

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`No se pudo cargar el plan ${planId}. Código HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();

  if (!isRecord(payload)) {
    throw new Error('La respuesta del backend no tiene un formato válido.');
  }

  const routes = Array.isArray(payload.routes) ? payload.routes.filter(isRouteData) : [];

  if (!Array.isArray(payload.routes)) {
    throw new Error('La respuesta del backend no incluye la lista de rutas.');
  }

  return {
    plan_id: typeof payload.plan_id === 'number' ? payload.plan_id : planId,
    created_at: typeof payload.created_at === 'string' ? payload.created_at : new Date().toISOString(),
    routes,
    total_distance_meters: typeof payload.total_distance_meters === 'number' ? payload.total_distance_meters : 0,
    total_duration_seconds: typeof payload.total_duration_seconds === 'number' ? payload.total_duration_seconds : 0,
    provider: typeof payload.provider === 'string' ? payload.provider : 'unknown'
  };
}
