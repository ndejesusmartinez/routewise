import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  RouteDetails,
  RouteMap,
  RouteSelector,
  RouteSummary,
  type RouteData
} from '@routewise/react-ui';
import { LocationPicker } from './LocationPicker';
import type { Coordinates } from './LocationPicker';
import {
  createOrder,
  createRegisteredPlan,
  createVehicle,
  fetchDashboardSummary,
  fetchOrders,
  fetchPlans,
  fetchRoutePlan,
  fetchVehicles,
  updateOrderStatus
} from './client';
import type {
  DashboardSummary,
  Order,
  OrderStatus,
  PlanSummary,
  RoutePlanResponse,
  Vehicle
} from './client';

type Section = 'dashboard' | 'orders' | 'vehicles' | 'plans';

const sections: { id: Section; label: string }[] = [
  { id: 'dashboard', label: 'Resumen' },
  { id: 'orders', label: 'Pedidos' },
  { id: 'vehicles', label: 'Vehículos' },
  { id: 'plans', label: 'Planes' }
];

const statusLabels: Record<OrderStatus, string> = {
  PENDING: 'Pendiente',
  ASSIGNED: 'Asignado',
  IN_TRANSIT: 'En tránsito',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado'
};

function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  return `${(seconds / 60).toFixed(0)} min`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{statusLabels[status]}</span>;
}

function App() {
  const [section, setSection] = useState<Section>('dashboard');
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<number | null>(null);
  const [plan, setPlan] = useState<RoutePlanResponse | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [newOrderLocation, setNewOrderLocation] = useState<Coordinates | null>(null);
  const [depotLatitude, setDepotLatitude] = useState('10.391');
  const [depotLongitude, setDepotLongitude] = useState('-75.479');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refreshWorkspace = useCallback(async (preferredPlanId?: number | null) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [nextDashboard, nextOrders, nextVehicles, nextPlans] = await Promise.all([
        fetchDashboardSummary(),
        fetchOrders(),
        fetchVehicles(),
        fetchPlans()
      ]);

      setDashboard(nextDashboard);
      setOrders(nextOrders);
      setVehicles(nextVehicles);
      setPlans(nextPlans);

      const planIds = new Set(nextPlans.map((item) => item.plan_id));
      const nextPlanId =
        preferredPlanId && planIds.has(preferredPlanId)
          ? preferredPlanId
          : nextPlans[0]?.plan_id ?? null;
      setCurrentPlanId(nextPlanId);
      setSelectedOrderIds((selected) =>
        selected.filter((id) => nextOrders.some((order) => order.order_id === id && order.status === 'PENDING'))
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshWorkspace().catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudieron cargar los datos.');
    });
  }, [refreshWorkspace]);

  useEffect(() => {
    if (currentPlanId === null) {
      setPlan(null);
      setSelectedRouteId(null);
      return;
    }

    let isCurrent = true;
    fetchRoutePlan(currentPlanId)
      .then((nextPlan) => {
        if (!isCurrent) {
          return;
        }

        setPlan(nextPlan);
        setSelectedRouteId(nextPlan.routes[0]?.route_id ?? nextPlan.routes[0]?.vehicle_id ?? null);
        setErrorMessage(null);
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setPlan(null);
          setErrorMessage(error instanceof Error ? error.message : 'No se pudo cargar el plan.');
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [currentPlanId]);

  const selectedRoute = useMemo(() => {
    if (!plan?.routes.length) {
      return null;
    }

    return plan.routes.find(
      (route) => (route.route_id ?? route.vehicle_id) === selectedRouteId
    ) ?? plan.routes[0];
  }, [plan, selectedRouteId]);

  const pendingOrders = useMemo(
    () => orders.filter((order) => order.status === 'PENDING'),
    [orders]
  );
  const selectedOrders = pendingOrders.filter((order) => selectedOrderIds.includes(order.order_id));
  const selectedVehicles = vehicles.filter((vehicle) => selectedVehicleIds.includes(vehicle.vehicle_id));
  const selectedDemand = selectedOrders.reduce((total, order) => total + order.demand, 0);
  const selectedCapacity = selectedVehicles.reduce((total, vehicle) => total + vehicle.capacity, 0);
  const highestSelectedDemand = Math.max(0, ...selectedOrders.map((order) => order.demand));
  const capacityIsInsufficient =
    selectedDemand > selectedCapacity ||
    highestSelectedDemand > Math.max(0, ...selectedVehicles.map((vehicle) => vehicle.capacity));

  const reportError = (error: unknown, fallback: string) => {
    setErrorMessage(error instanceof Error ? error.message : fallback);
    setNotice(null);
  };

  const handleCreateOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newOrderLocation) {
      setErrorMessage('Selecciona la ubicación del pedido en el mapa antes de registrarlo.');
      return;
    }

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createOrder({
        order_id: String(form.get('order_id')).trim(),
        demand: Number(form.get('demand')),
        latitude: newOrderLocation.latitude,
        longitude: newOrderLocation.longitude
      });
      formElement.reset();
      setNewOrderLocation(null);
      setNotice('Pedido registrado correctamente.');
      await refreshWorkspace(currentPlanId);
    } catch (error) {
      reportError(error, 'No se pudo registrar el pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateVehicle = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createVehicle({
        vehicle_id: String(form.get('vehicle_id')).trim(),
        capacity: Number(form.get('capacity'))
      });
      formElement.reset();
      setNotice('Vehículo registrado correctamente.');
      await refreshWorkspace(currentPlanId);
    } catch (error) {
      reportError(error, 'No se pudo registrar el vehículo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const createdPlan = await createRegisteredPlan({
        depot: {
          location_id: 'DEPOT-001',
          latitude: Number(depotLatitude),
          longitude: Number(depotLongitude)
        },
        order_ids: selectedOrders.map((order) => order.order_id),
        vehicle_ids: selectedVehicles.map((vehicle) => vehicle.vehicle_id)
      });
      setSelectedOrderIds([]);
      setSelectedVehicleIds([]);
      setCurrentPlanId(createdPlan.plan_id);
      setSection('plans');
      setNotice(`Plan #${createdPlan.plan_id} creado correctamente.`);
      await refreshWorkspace(createdPlan.plan_id);
    } catch (error) {
      reportError(error, 'No se pudo crear el plan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOrderStatus = async (order: Order, nextStatus: OrderStatus) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await updateOrderStatus(order.order_id, nextStatus);
      setNotice(`El pedido ${order.order_id} ahora está ${statusLabels[nextStatus].toLowerCase()}.`);
      await refreshWorkspace(currentPlanId);
    } catch (error) {
      reportError(error, 'No se pudo actualizar el estado del pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const changeSelection = (
    selectedIds: string[],
    setSelectedIds: (ids: string[]) => void,
    id: string
  ) => {
    setSelectedIds(
      selectedIds.includes(id)
        ? selectedIds.filter((selectedId) => selectedId !== id)
        : [...selectedIds, id]
    );
  };

  const renderPlan = () => (
    <>
      {plans.length ? (
        <label className="plan-picker">
          <span>Plan guardado</span>
          <select
            value={currentPlanId ?? ''}
            onChange={(event) => setCurrentPlanId(event.target.value ? Number(event.target.value) : null)}
          >
            {plans.map((item) => (
              <option key={item.plan_id} value={item.plan_id}>
                Plan #{item.plan_id} · {formatDate(item.created_at)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {plan ? (
        <>
          <div className="summary-grid">
            <div className="summary-card">
              <span className="label">Distancia total</span>
              <strong>{formatDistance(plan.total_distance_meters)}</strong>
            </div>
            <div className="summary-card">
              <span className="label">Duración estimada</span>
              <strong>{formatDuration(plan.total_duration_seconds)}</strong>
            </div>
            <div className="summary-card">
              <span className="label">Vehículos en ruta</span>
              <strong>{plan.routes.length}</strong>
            </div>
          </div>

          <section className="selector-panel">
            <div className="panel-header">
              <h2>Rutas del plan #{plan.plan_id}</h2>
              <span className="muted">{plan.provider} · {formatDate(plan.created_at)}</span>
            </div>
            <RouteSelector
              routes={plan.routes}
              selectedRouteId={selectedRouteId}
              onRouteSelect={(route) => setSelectedRouteId(route ? (route.route_id ?? route.vehicle_id) : null)}
            />
          </section>

          <section className="dashboard-grid">
            <div className="map-panel">
              <div className="panel-header"><h2>Mapa de rutas</h2></div>
              <RouteMap
                routes={plan.routes}
                selectedRouteId={selectedRouteId}
                onRouteSelect={(route) => setSelectedRouteId(route ? (route.route_id ?? route.vehicle_id) : null)}
                height={440}
                emptyMessage="Este plan no tiene geometría de ruta disponible."
              />
            </div>
            <aside className="detail-panel">
              <div className="panel-header"><h2>Detalle del recorrido</h2></div>
              <RouteSummary route={selectedRoute} />
              <RouteDetails route={selectedRoute} />
            </aside>
          </section>
        </>
      ) : (
        <div className="empty-state">
          {plans.length ? 'Selecciona un plan para ver sus recorridos.' : 'Todavía no hay planes. Crea el primero seleccionando pedidos y vehículos.'}
        </div>
      )}
    </>
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setSection('dashboard'); }}>
          <span className="brand-mark">R</span>
          <span><strong>RouteWise</strong><small>Panel de operaciones</small></span>
        </a>
        <nav className="side-nav" aria-label="Navegación principal">
          {sections.map((item) => (
            <button
              className={section === item.id ? 'nav-item active' : 'nav-item'}
              key={item.id}
              onClick={() => setSection(item.id)}
              type="button"
            >
              <span className="nav-dot" />
              {item.label}
              {item.id === 'orders' ? <span className="nav-count">{orders.length}</span> : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="connection-indicator" />
          <span>API RouteWise</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div>
            <p className="eyebrow">Gestión de entregas</p>
            <h1>{sections.find((item) => item.id === section)?.label}</h1>
          </div>
          <button
            className="button button-secondary"
            disabled={isLoading || isSubmitting}
            onClick={() => {
              void refreshWorkspace(currentPlanId).catch((error: unknown) => {
                reportError(error, 'No se pudieron actualizar los datos.');
              });
            }}
            type="button"
          >
            {isLoading ? 'Actualizando…' : 'Actualizar datos'}
          </button>
        </header>

        {errorMessage ? (
          <div className="alert alert-error" role="alert">
            <span>{errorMessage}</span>
            <button aria-label="Cerrar mensaje de error" onClick={() => setErrorMessage(null)} type="button">×</button>
          </div>
        ) : null}
        {notice ? (
          <div className="alert alert-success" role="status">
            <span>{notice}</span>
            <button aria-label="Cerrar notificación" onClick={() => setNotice(null)} type="button">×</button>
          </div>
        ) : null}

        {isLoading && !dashboard ? (
          <section className="state-panel"><div className="spinner" /><p>Cargando datos de RouteWise…</p></section>
        ) : null}

        {section === 'dashboard' && dashboard ? (
          <>
            <section className="summary-grid">
              <div className="summary-card"><span className="label">Pedidos</span><strong>{dashboard.total_orders}</strong><small>{dashboard.orders_by_status.PENDING ?? 0} pendientes</small></div>
              <div className="summary-card"><span className="label">Vehículos</span><strong>{dashboard.total_vehicles}</strong><small>Registrados en el sistema</small></div>
              <div className="summary-card"><span className="label">Planes de entrega</span><strong>{dashboard.total_plans}</strong><small>Guardados en la API</small></div>
            </section>

            <section className="content-card">
              <div className="panel-header"><div><p className="eyebrow">Estado de operación</p><h2>Pedidos por estado</h2></div></div>
              <div className="status-overview">
                {Object.entries(statusLabels).map(([status, label]) => (
                  <div className="status-tile" key={status}>
                    <StatusBadge status={status as OrderStatus} />
                    <strong>{dashboard.orders_by_status[status] ?? 0}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="content-card">
              <div className="panel-header">
                <div><p className="eyebrow">Actividad reciente</p><h2>Planes guardados</h2></div>
                <button className="text-button" onClick={() => setSection('plans')} type="button">Ver todos</button>
              </div>
              {plans.length ? (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Plan</th><th>Creado</th><th>Distancia</th><th>Duración</th><th /></tr></thead>
                    <tbody>
                      {plans.slice(0, 5).map((item) => (
                        <tr key={item.plan_id}>
                          <td><strong>#{item.plan_id}</strong></td>
                          <td>{formatDate(item.created_at)}</td>
                          <td>{formatDistance(item.total_distance_meters)}</td>
                          <td>{formatDuration(item.total_duration_seconds)}</td>
                          <td><button className="text-button" onClick={() => { setCurrentPlanId(item.plan_id); setSection('plans'); }} type="button">Abrir</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div className="empty-state">Aún no hay planes guardados.</div>}
            </section>
          </>
        ) : null}

        {section === 'orders' ? (
          <div className="content-layout">
            <section className="content-card form-card">
              <div className="panel-header"><div><p className="eyebrow">Nuevo registro</p><h2>Agregar pedido</h2></div></div>
              <form className="form-grid" onSubmit={handleCreateOrder}>
                <label>ID del pedido<input autoComplete="off" maxLength={50} name="order_id" placeholder="PED-001" required /></label>
                <label>Demanda / carga<input min="1" name="demand" placeholder="5" required type="number" /></label>
                <LocationPicker onChange={setNewOrderLocation} value={newOrderLocation} />
                <button className="button button-primary form-submit" disabled={isSubmitting || !newOrderLocation} type="submit">{isSubmitting ? 'Guardando…' : 'Registrar pedido'}</button>
              </form>
            </section>

            <section className="content-card">
              <div className="panel-header"><div><p className="eyebrow">Operación</p><h2>Pedidos registrados <span className="inline-count">{orders.length}</span></h2></div></div>
              {orders.length ? (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Pedido</th><th>Demanda</th><th>Ubicación</th><th>Estado</th><th>Acción</th></tr></thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.order_id}>
                          <td><strong>{order.order_id}</strong></td>
                          <td>{order.demand}</td>
                          <td>{order.latitude.toFixed(4)}, {order.longitude.toFixed(4)}</td>
                          <td><StatusBadge status={order.status} /></td>
                          <td>
                            {order.status === 'ASSIGNED' ? <button className="text-button" disabled={isSubmitting} onClick={() => void handleOrderStatus(order, 'IN_TRANSIT')} type="button">Iniciar entrega</button> : null}
                            {order.status === 'IN_TRANSIT' ? <button className="text-button" disabled={isSubmitting} onClick={() => void handleOrderStatus(order, 'DELIVERED')} type="button">Marcar entregado</button> : null}
                            {order.status === 'PENDING' ? <button className="text-button text-danger" disabled={isSubmitting} onClick={() => void handleOrderStatus(order, 'CANCELLED')} type="button">Cancelar</button> : null}
                            {order.status === 'DELIVERED' || order.status === 'CANCELLED' ? <span className="muted">—</span> : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div className="empty-state">Todavía no hay pedidos. Registra uno para empezar.</div>}
            </section>
          </div>
        ) : null}

        {section === 'vehicles' ? (
          <div className="content-layout">
            <section className="content-card form-card">
              <div className="panel-header"><div><p className="eyebrow">Nuevo registro</p><h2>Agregar vehículo</h2></div></div>
              <form className="form-grid" onSubmit={handleCreateVehicle}>
                <label>ID del vehículo<input autoComplete="off" maxLength={50} name="vehicle_id" placeholder="VEH-001" required /></label>
                <label>Capacidad<input min="1" name="capacity" placeholder="20" required type="number" /></label>
                <button className="button button-primary form-submit" disabled={isSubmitting} type="submit">{isSubmitting ? 'Guardando…' : 'Registrar vehículo'}</button>
              </form>
            </section>
            <section className="content-card">
              <div className="panel-header"><div><p className="eyebrow">Flota</p><h2>Vehículos registrados <span className="inline-count">{vehicles.length}</span></h2></div></div>
              {vehicles.length ? (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Vehículo</th><th>Capacidad</th><th>Estado</th></tr></thead>
                    <tbody>
                      {vehicles.map((vehicle) => (
                        <tr key={vehicle.vehicle_id}>
                          <td><strong>{vehicle.vehicle_id}</strong></td>
                          <td>{vehicle.capacity}</td>
                          <td><span className="availability"><span /> Registrado</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div className="empty-state">Todavía no hay vehículos. Registra uno para poder planificar rutas.</div>}
            </section>
          </div>
        ) : null}

        {section === 'plans' ? (
          <>
            <section className="content-card plan-form-card">
              <div className="panel-header">
                <div><p className="eyebrow">Optimización</p><h2>Crear un plan de entrega</h2></div>
                <span className="muted">Se usarán pedidos pendientes y vehículos seleccionados</span>
              </div>
              <form onSubmit={handleCreatePlan}>
                <div className="plan-form-grid">
                  <fieldset className="selection-fieldset">
                    <legend>Pedidos pendientes <span className="inline-count">{pendingOrders.length}</span></legend>
                    <div className="selection-list">
                      {pendingOrders.map((order) => (
                        <label className="selection-row" key={order.order_id}>
                          <input
                            checked={selectedOrderIds.includes(order.order_id)}
                            onChange={() => changeSelection(selectedOrderIds, setSelectedOrderIds, order.order_id)}
                            type="checkbox"
                          />
                          <span className="selection-main"><strong>{order.order_id}</strong><small>Carga {order.demand} · {order.latitude.toFixed(3)}, {order.longitude.toFixed(3)}</small></span>
                        </label>
                      ))}
                      {!pendingOrders.length ? <p className="muted selection-empty">No hay pedidos pendientes disponibles.</p> : null}
                    </div>
                  </fieldset>
                  <fieldset className="selection-fieldset">
                    <legend>Vehículos <span className="inline-count">{vehicles.length}</span></legend>
                    <div className="selection-list">
                      {vehicles.map((vehicle) => (
                        <label className="selection-row" key={vehicle.vehicle_id}>
                          <input
                            checked={selectedVehicleIds.includes(vehicle.vehicle_id)}
                            onChange={() => changeSelection(selectedVehicleIds, setSelectedVehicleIds, vehicle.vehicle_id)}
                            type="checkbox"
                          />
                          <span className="selection-main"><strong>{vehicle.vehicle_id}</strong><small>Capacidad {vehicle.capacity}</small></span>
                        </label>
                      ))}
                      {!vehicles.length ? <p className="muted selection-empty">Registra vehículos antes de crear un plan.</p> : null}
                    </div>
                  </fieldset>
                  <fieldset className="selection-fieldset depot-fieldset">
                    <legend>Ubicación del depósito</legend>
                    <div className="form-grid">
                      <label>Latitud<input max="90" min="-90" onChange={(event) => setDepotLatitude(event.target.value)} required step="any" type="number" value={depotLatitude} /></label>
                      <label>Longitud<input max="180" min="-180" onChange={(event) => setDepotLongitude(event.target.value)} required step="any" type="number" value={depotLongitude} /></label>
                    </div>
                  </fieldset>
                </div>
                <div className="plan-submit-row">
                  <div className={capacityIsInsufficient ? 'capacity-note capacity-warning' : 'capacity-note'}>
                    Seleccionado: {selectedOrders.length} pedidos · carga {selectedDemand} / capacidad {selectedCapacity}
                    {capacityIsInsufficient ? ' · Capacidad insuficiente para esta selección' : ''}
                  </div>
                  <button
                    className="button button-primary"
                    disabled={isSubmitting || !selectedOrders.length || !selectedVehicles.length || capacityIsInsufficient}
                    type="submit"
                  >
                    {isSubmitting ? 'Calculando ruta…' : 'Optimizar y crear plan'}
                  </button>
                </div>
              </form>
            </section>
            <section className="content-card">
              <div className="panel-header"><div><p className="eyebrow">Historial</p><h2>Planes guardados</h2></div></div>
              {plans.length ? (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Plan</th><th>Fecha</th><th>Distancia</th><th>Duración</th><th>Motor</th><th /></tr></thead>
                    <tbody>{plans.map((item) => (
                      <tr className={currentPlanId === item.plan_id ? 'selected-row' : ''} key={item.plan_id}>
                        <td><strong>#{item.plan_id}</strong></td><td>{formatDate(item.created_at)}</td><td>{formatDistance(item.total_distance_meters)}</td><td>{formatDuration(item.total_duration_seconds)}</td><td>{item.provider}</td>
                        <td><button className="text-button" onClick={() => setCurrentPlanId(item.plan_id)} type="button">Ver plan</button></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : <div className="empty-state">Los planes que crees aparecerán aquí.</div>}
            </section>
            {renderPlan()}
          </>
        ) : null}
      </main>
    </div>
  );
}

export default App;
