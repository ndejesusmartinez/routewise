import { useEffect, useMemo, useState } from 'react';
import {
  RouteDetails,
  RouteMap,
  RouteSelector,
  RouteSummary,
  type RouteData
} from '@routewise/react-ui';
import { fetchRoutePlan } from './client';

function App() {
  const [planId, setPlanId] = useState<number | null>(null);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetchRoutePlan(7)
      .then((plan) => {
        if (!isMounted) {
          return;
        }

        setPlanId(plan.plan_id);
        setRoutes(plan.routes);
        setSelectedRouteId(
          plan.routes[0]?.route_id ?? plan.routes[0]?.vehicle_id ?? null
        );
        setStatus('success');
        setErrorMessage(null);
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setRoutes([]);
        setPlanId(7);
        setSelectedRouteId(null);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'No se pudo cargar el plan solicitado.');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedRoute = useMemo(() => {
    if (!routes.length) {
      return null;
    }

    return (
      routes.find(
        (route) => (route.route_id ?? route.vehicle_id) === selectedRouteId
      ) ?? routes[0]
    );
  }, [routes, selectedRouteId]);

  useEffect(() => {
    if (routes.length > 0 && !selectedRoute) {
      setSelectedRouteId(routes[0]?.route_id ?? routes[0]?.vehicle_id ?? null);
    }
  }, [routes, selectedRoute]);

  const handleRouteSelect = (route: RouteData | null) => {
    setSelectedRouteId(route ? (route.route_id ?? route.vehicle_id) : null);
  };

  return (
    <div className="demo-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Route optimization</p>
          <h1>RouteWise</h1>
        </div>
        <div className="plan-badge">
          {planId !== null ? `Plan cargado: ${planId}` : 'Plan: 7'}
        </div>
      </header>

      {status === 'loading' ? (
        <section className="state-panel">
          <div className="spinner" aria-label="Loading" />
          <p>Cargando plan de entrega 7…</p>
        </section>
      ) : null}

      {status === 'error' ? (
        <section className="state-panel error-panel">
          <h2>Error al cargar el plan</h2>
          <p>{errorMessage}</p>
        </section>
      ) : null}

      {status === 'success' ? (
        <>
          <section className="summary-grid">
            <div className="summary-card">
              <span className="label">Distancia total</span>
              <strong>{(routes.reduce((sum, route) => sum + route.distance_meters, 0) / 1000).toFixed(1)} km</strong>
            </div>
            <div className="summary-card">
              <span className="label">Duración estimada</span>
              <strong>{(routes.reduce((sum, route) => sum + route.duration_seconds, 0) / 60).toFixed(1)} min</strong>
            </div>
            <div className="summary-card">
              <span className="label">Vehículos</span>
              <strong>{routes.length}</strong>
            </div>
          </section>

          <section className="selector-panel">
            <div className="panel-header">
              <h2>Rutas del plan</h2>
            </div>
            <RouteSelector
              routes={routes}
              selectedRouteId={selectedRouteId}
              onRouteSelect={handleRouteSelect}
            />
          </section>

          <section className="dashboard-grid">
            <div className="map-panel">
              <div className="panel-header">
                <h2>Mapa del recorrido</h2>
              </div>
              <RouteMap
                routes={routes}
                selectedRouteId={selectedRouteId}
                onRouteSelect={handleRouteSelect}
                height={480}
                emptyMessage="No hay rutas disponibles para este plan."
              />
            </div>

            <aside className="detail-panel">
              <div className="panel-header">
                <h2>Información del vehículo</h2>
              </div>
              <RouteSummary route={selectedRoute} />
              <div style={{ height: '1rem' }} />
              <RouteDetails route={selectedRoute} />
            </aside>
          </section>

          <section className="orders-panel">
            <div className="panel-header">
              <h2>Pedidos en orden de visita</h2>
            </div>

            {selectedRoute && selectedRoute.order_ids.length > 0 ? (
              <ol className="orders-list">
                {selectedRoute.order_ids.map((orderId, index) => (
                  <li key={`${orderId}-${index}`}>
                    <span className="order-index">{index + 1}</span>
                    <span>{orderId}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="empty-inline">No hay pedidos asociados a la ruta seleccionada.</div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

export default App;
