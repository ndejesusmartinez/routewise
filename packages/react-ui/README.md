# @routewise/react-ui

Reusable React UI components for RouteWise route visualization.

## Features

- GeoJSON LineString route rendering with Leaflet
- Multi-route selection and route highlighting
- Vehicle route summary cards
- Detailed route information panel
- Empty, loading and invalid geometry-safe states

## Installation

```bash
npm install @routewise/react-ui leaflet react react-dom react-leaflet
```

## Peer dependencies

This package declares the following peer dependencies so the consuming app controls a single React version:

- react
- react-dom
- react-leaflet
- leaflet

## Basic usage

```tsx
import { RouteMap, RouteSummary, RouteDetails } from '@routewise/react-ui';
import type { RouteData } from '@routewise/react-ui';

const routes: RouteData[] = [
  {
    vehicle_id: 'VEH-001',
    order_ids: ['PED-001', 'PED-002'],
    distance_meters: 9800,
    duration_seconds: 1350,
    load: 6,
    capacity: 10,
    geometry: {
      type: 'LineString',
      coordinates: [
        [-75.5, 10.4],
        [-75.48, 10.41]
      ]
    }
  }
];

export function Example() {
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <RouteMap routes={routes} selectedRouteId="VEH-001" height={420} />
      <RouteSummary route={routes[0]} />
      <RouteDetails route={routes[0]} />
    </div>
  );
}
```

## Publishing to npm

```bash
npm login
npm publish --access public
```

Before publishing, confirm the package metadata in `package.json` is correct and the bundle compiles successfully:

```bash
npm run build
```

## Notes

- The package is intentionally decoupled from the demo app.
- The demo app can provide its own API base URL via `VITE_ROUTEWISE_API_URL`.
- Route geometry is expected in GeoJSON `LineString` format with `[longitude, latitude]` coordinates.
