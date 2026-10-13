import type { RouteData } from '../types';
import { metersToKilometers, secondsToMinutes } from '../utils/units';

interface RouteSummaryProps {
  route: RouteData | null | undefined;
}

export function RouteSummary({ route }: RouteSummaryProps) {
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
        No hay una ruta seleccionada.
      </div>
    );
  }

  const items = [
    { label: 'Vehículo', value: route.vehicle_id },
    { label: 'Pedidos', value: `${route.order_ids.length}` },
    { label: 'Distancia', value: `${metersToKilometers(route.distance_meters)} km` },
    { label: 'Duración', value: `${secondsToMinutes(route.duration_seconds)} min` },
    { label: 'Carga', value: `${route.load}` },
    { label: 'Capacidad', value: `${route.capacity}` }
  ];

  return (
    <div
      style={{
        border: '1px solid #dfe7ef',
        borderRadius: '0.75rem',
        background: '#fff',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          padding: '0.875rem 1rem',
          borderBottom: '1px solid #edf2f7',
          background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)',
          color: '#fff',
          fontWeight: 600
        }}
      >
        Resumen de ruta
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem', padding: '1rem' }}>
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              border: '1px solid #edf2f7',
              borderRadius: '0.625rem',
              background: '#f8fafc',
              padding: '0.75rem'
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {item.label}
            </div>
            <div style={{ marginTop: '0.35rem', fontSize: '1.05rem', fontWeight: 600, color: '#0f172a' }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
