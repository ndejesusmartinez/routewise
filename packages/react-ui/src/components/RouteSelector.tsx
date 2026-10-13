import type { RouteData } from '../types';

interface RouteSelectorProps {
  routes: RouteData[];
  selectedRouteId: string | null;
  onRouteSelect: (route: RouteData | null) => void;
}

export function RouteSelector({ routes, selectedRouteId, onRouteSelect }: RouteSelectorProps) {
  if (routes.length === 0) {
    return <div className="route-selector empty">No hay rutas disponibles.</div>;
  }

  const options = routes.map((route) => ({
    value: route.route_id ?? route.vehicle_id,
    label: route.route_id ? `${route.route_id} · ${route.vehicle_id}` : route.vehicle_id
  }));

  if (routes.length === 1) {
    return (
      <div className="route-selector single">
        <span className="route-selector-label">Ruta seleccionada</span>
        <strong>{options[0].label}</strong>
      </div>
    );
  }

  return (
    <label className="route-selector">
      <span className="route-selector-label">Selecciona una ruta</span>
      <select
        value={selectedRouteId ?? options[0].value}
        onChange={(event) => {
          const selected = routes.find(
            (route) => (route.route_id ?? route.vehicle_id) === event.target.value
          );
          onRouteSelect(selected ?? null);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
