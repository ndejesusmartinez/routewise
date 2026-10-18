import type { OrderStatus } from './types';

export const statusLabels: Record<OrderStatus, string> = {
  PENDING: 'Pendiente',
  ASSIGNED: 'Asignado',
  IN_TRANSIT: 'En tránsito',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado'
};

export function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  return `${Math.round(seconds / 60)} min`;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}
