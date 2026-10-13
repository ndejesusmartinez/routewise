import type { RouteData } from '../types';
import { metersToKilometers, secondsToMinutes } from '../utils/units';

interface RouteDetailsProps {
  route: RouteData | null | undefined;
}

export function RouteDetails({ route }: RouteDetailsProps) {
  if (!route) {
    return (
      <div
        style={{
          padding: '1rem',
          border: '1px solid #dfe7ef',
          borderRadius: '0.75rem',
          background: '#f8fafc',
          color: '#475569',
          minHeight: '180px',
          display: 'grid',
          placeItems: 'center'
        }}
      >
        Selecciona una ruta para ver el detalle.
      </div>
    );
  }

  return (
    <div
      style={{
        border: '1px solid #dfe7ef',
        borderRadius: '0.75rem',
        background: '#fff',
        padding: '1rem'
      }}
    >
      <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.875rem' }}>Detalle de ruta</div>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        <div><strong>Vehículo:</strong> {route.vehicle_id}</div>
        <div><strong>Secuencia de pedidos:</strong></div>
        {route.order_ids.length > 0 ? (
          <ol style={{ margin: '0.25rem 0 0 1.2rem', padding: 0, display: 'grid', gap: '0.35rem' }}>
            {route.order_ids.map((orderId) => (
              <li key={orderId}>{orderId}</li>
            ))}
          </ol>
        ) : (
          <div style={{ color: '#64748b' }}>No hay pedidos asociados.</div>
        )}
        <div><strong>Distancia:</strong> {metersToKilometers(route.distance_meters)} km</div>
        <div><strong>Duración:</strong> {secondsToMinutes(route.duration_seconds)} min</div>
        <div><strong>Carga:</strong> {route.load}</div>
        <div><strong>Capacidad:</strong> {route.capacity}</div>
      </div>
    </div>
  );
}
