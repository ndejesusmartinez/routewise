# RouteWise

**Delivery planning and route optimization MVP**

RouteWise is a full-stack MVP for delivery operations. It combines a FastAPI backend with a React web dashboard and an Expo React Native app that share the same API.

The project supports order and vehicle management, capacity-aware delivery planning, route visualization, and delivery status tracking. Route plans are generated with Google OR-Tools and road-network data from OSRM, then persisted in PostgreSQL.

> **Project status:** MVP for local testing and product validation. It is not yet configured as a production-ready service.

## Features

- **Route optimization:** Calculate optimized routes using Google OR-Tools.
- **Capacity-aware planning:** Consider vehicle capacity when assigning delivery orders.
- **Delivery planning:** Generate and persist delivery plans.
- **Order management:** Register orders and retrieve their current status.
- **Vehicle management:** Register vehicles and their delivery capacities.
- **Delivery lifecycle:** Track orders through `PENDING`, `ASSIGNED`, `IN_TRANSIT`, `DELIVERED`, and `CANCELLED` states.
- **Vehicle route tracking:** Retrieve saved routes and ordered delivery stops for a vehicle.
- **Road-route geometry:** Return each optimized route's saved road geometry as a GeoJSON `LineString`.
- **Order history:** Review delivery plans associated with an order.
- **Operational dashboard:** Retrieve order counts by status, registered vehicles, and saved delivery plans.
- **Web dashboard:** Manage orders and vehicles, update delivery status, create plans, and inspect routes.
- **Mobile app:** Use the same operational flows from Expo Go on Android and iOS.
- **Location selection:** Search addresses, select points on an interactive map, or request device location.
- **Interactive API documentation:** Explore endpoints using Swagger UI.
- **Automated tests:** Validate API behavior and core planning workflows with Pytest.

## Technology Stack

| Technology | Purpose |
|---|---|
| Python | Backend development |
| FastAPI | REST API framework |
| Pydantic | Request and response validation |
| SQLAlchemy | ORM and database access |
| PostgreSQL | Relational data persistence |
| Psycopg | PostgreSQL driver |
| Google OR-Tools | Route and capacity optimization |
| OSRM / OpenStreetMap | Road-routing and distance information |
| Uvicorn | ASGI application server |
| Pytest | Automated testing |
| HTTPX | API test client |

## Architecture

RouteWise separates API handling, request validation, business logic, optimization, and database persistence.

```text
              Web / Mobile Clients
                      |
                      v
                FastAPI API
                      |
          +-----------+-----------+
          |                       |
          v                       v
    API Endpoints           Pydantic Schemas
          |
          v
    Planning Services
          |
     +----+----------------+
     |                     |
     v                     v
 Google OR-Tools       OSRM Routing
     |                     |
     +----------+----------+
                |
                v
          SQLAlchemy ORM
                |
                v
            PostgreSQL
```

The road-routing integration uses the OSRM Table API for distance and duration matrices. After optimization, the OSRM Route API retrieves the road geometry for each non-empty route, including its existing depot start and return. Geometry is saved with the delivery plan to avoid repeated routing requests and to preserve the planned historical route. If OSRM returns no usable geometry, the API returns `null` rather than drawing an estimated straight-line path.

## Project Structure

```text
routewise/
├── app/
│   ├── api/
│   │   ├── routes.py
│   │   └── resources.py
│   ├── db/
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── init_db.py
│   │   └── migrations/
│   ├── schemas/
│   │   ├── geometry.py
│   │   ├── dashboard.py
│   │   ├── history.py
│   │   ├── location.py
│   │   ├── persistence.py
│   │   ├── planning.py
│   │   ├── route.py
│   │   └── route_tracking.py
│   ├── services/
│   │   ├── capacity_optimizer.py
│   │   ├── delivery_planner.py
│   │   ├── named_route_optimizer.py
│   │   ├── osrm_client.py
│   │   ├── plan_persistence.py
│   │   └── route_optimizer.py
│   └── main.py
├── frontend/
│   ├── demo/                 # React web dashboard
│   └── mobile/               # Expo React Native app (SDK 57)
├── packages/
│   └── react-ui/             # Shared web UI package
├── tests/
├── .env.example
├── .gitignore
├── requirements.txt
└── README.md
```

## Prerequisites

- Python 3.14, matching the current development environment.
- PostgreSQL.
- Git.
- Node.js and npm for the React frontend.
- An OSRM-compatible routing service for workflows that require road-network distances or durations.

Use a Python version and package combination validated against `requirements.txt`.

## Installation

### 1. Clone the repository

Replace the placeholder with the actual repository URL after publishing the project.

```bash
git clone <YOUR_REPOSITORY_URL>
cd routewise
```

### 2. Create a virtual environment

On Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 3. Install dependencies

```powershell
python -m pip install -r requirements.txt
```

### 4. Configure environment variables

Create a local `.env` file using `.env.example` as a reference.

Configure the PostgreSQL connection:

```dotenv
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@localhost:5432/routewise
```

Replace `USER` and `PASSWORD` with your local PostgreSQL credentials.

**Never commit the real `.env` file or expose credentials in source code or documentation.**

### 5. Create the database

Ensure PostgreSQL is running and create a database named `routewise`, or update the connection string to match your database.

Initialize the application tables:

```powershell
python -m app.db.init_db
```

Apply any additional migrations required by the current application schema, following the scripts in `app/db/migrations/`.

For an existing database, apply the nullable route geometry column migration once:

```powershell
python -m app.db.migrations.add_route_geometry
```

### 6. Run the API

```powershell
python -m uvicorn app.main:app --reload
```

The API will be available at:

- **API base URL:** `http://127.0.0.1:8000`
- **Swagger documentation:** `http://127.0.0.1:8000/docs`
- **Health check:** `http://127.0.0.1:8000/health`

### 7. Run the frontend

In a second PowerShell terminal, from the repository root:

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`. The frontend connects to `http://127.0.0.1:8000` by default; override it by setting `VITE_ROUTEWISE_API_URL` in `frontend/demo/.env.local`.

The web dashboard can register and list orders and vehicles, update an order's delivery status, create a route plan from pending registered orders and selected vehicles, and browse saved plans on the map. The plan workflow needs a working OSRM service and a PostgreSQL database initialized as described above. Interactive API docs are available at `http://127.0.0.1:8000/docs`.

When registering an order, the frontend lets the user search for an address using OpenStreetMap Nominatim, select a point on the map, or explicitly request a fresh, high-accuracy device location. Browser geolocation requires the user's permission and a secure context (HTTPS, or localhost during development). The browser and operating system choose available location sensors; the web API cannot require GPS-only positioning. The interface displays the reported accuracy radius and warns when it is greater than 100 meters, while allowing the user to adjust the pin. Address search requires internet access. The demo spaces Nominatim searches by at least one second and requests results only after the user submits a search; for production or high traffic, use a hosted geocoding provider or operate your own service in accordance with the provider's usage policy. The backend currently persists the selected coordinates, not the display name returned by address search.

### 8. Run the React Native app

The Expo app lives in `frontend/mobile`, targets Expo SDK 57, and uses the same API as the web demo. Install the workspace dependencies from the repository root, then start Expo Go explicitly:

```powershell
npm install
npm run mobile -- --lan
```

Open the project with Expo Go 57 on a phone or an Android emulator and scan the QR code. The root `mobile` command passes `--go`, so Expo Go remains the launch target. The Android emulator API URL defaults to `http://10.0.2.2:8000`; the iOS simulator uses `http://127.0.0.1:8000`.

For a physical phone, `127.0.0.1` refers to the phone itself, not the development PC:

1. Connect the phone and PC to the same Wi-Fi network.
2. Start the API so it accepts connections from the local network:

   ```powershell
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

3. Find the PC's Wi-Fi IPv4 address with `ipconfig`, then set the app's **API** URL to `http://<PC-IP>:8000`, for example `http://192.168.1.20:8000`.
4. If the phone cannot open `http://<PC-IP>:8000/health`, allow port `8000` through Windows Firewall and verify both devices are on the same network.

Location search and maps require internet access. The mobile app renders interactive maps in a WebView using Leaflet and Esri World Street Map tiles; map attribution is shown in the app, and no Google Maps API key is needed for Expo Go or APK builds. Address search uses OpenStreetMap Nominatim. The phone requests foreground location permission when **Usar GPS** is tapped and shows the device-reported accuracy estimate. Android/iOS choose available sensors; the app cannot demand GPS-only positioning. The backend stores the selected coordinates, not the human-readable address.

Local HTTP is enabled for development and preview builds. The production profile disables cleartext traffic, so use HTTPS for a deployed backend.

To build an optional Android development APK instead of using Expo Go, log in to EAS and run:

```powershell
Set-Location frontend\mobile
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile development
```

After installing the development APK from the EAS build link, start Metro from the repository root with `npm run mobile:dev -- --lan`. Build a new development APK after changing native dependencies or app configuration; JavaScript-only changes can use Fast Refresh.

The `preview` profile in `frontend/mobile/eas.json` produces an internal-distribution APK. The `production` profile produces an Android App Bundle for Play Store distribution. EAS cloud builds need an Expo account and will prompt you to create or select Android signing credentials; local Android builds additionally need Android Studio and the Android SDK.

## API Capabilities

The API provides operations for:

| Area | Capabilities |
|---|---|
| Health | Verify API availability |
| Route optimization | Optimize routes and work with distance matrices |
| Delivery planning | Generate and save delivery plans |
| Orders | Create, list, and update delivery orders |
| Vehicles | Register and list vehicles |
| Route tracking | Retrieve vehicle routes and ordered stops |
| Order history | Retrieve plans associated with an order |
| Dashboard | Summarize order statuses, vehicles, and plans |

For exact paths, parameters, and request/response schemas, start the API and inspect `/docs`.

The following endpoints include route geometry:

- `POST /api/v1/routes/plan-deliveries` and `POST /api/v1/routes/plan-registered` return each route's geometry in the newly created plan.
- `GET /api/v1/routes/plans/{plan_id}` returns the geometry saved with the plan.
- `GET /api/v1/vehicles/{vehicle_id}/routes` returns saved geometry alongside vehicle route tracking information.

Geometry uses GeoJSON `LineString` coordinates in `[longitude, latitude]` order. The geometry is nullable for legacy plans and for routes where OSRM does not provide usable geometry; the API never fabricates geometry from stop markers.

## Order Lifecycle

The order lifecycle uses the following statuses:

```text
PENDING
   |
   v
ASSIGNED
   |
   v
IN_TRANSIT
   |
   v
DELIVERED
```

Orders can also be cancelled while they are still `PENDING`. Invalid status transitions are rejected by the API.

## Testing

Run the automated test suite:

```powershell
python -m pytest -v
```

Compile application and test modules:

```powershell
python -m compileall app tests
```

The tests cover API behavior, order lifecycle rules, planning workflows, and relevant failure scenarios.

Validate the frontend workspaces from the repository root:

```powershell
npm run build
Set-Location frontend\mobile
npm run typecheck
npm run lint
npx expo-doctor
```

## Configuration and Security

- Database connection details are provided through environment variables.
- `.env` contains local secrets and must remain untracked by Git.
- `.env.example` documents the required configuration using placeholders.
- Database operations use SQLAlchemy.
- API request and response data are validated using Pydantic.

Before public production deployment, additional measures such as authentication, authorization, rate limiting, production logging, and managed secret storage should be evaluated and implemented as appropriate.

## Roadmap

- [ ] Add authentication and role-based authorization.
- [ ] Add CI automation for tests and code quality checks.
- [ ] Improve structured logging and observability.
- [ ] Add API performance and concurrency testing.
- [x] Build an initial web dashboard for delivery operations.
- [x] Build an initial Expo mobile app for delivery operations.
- [ ] Add frontend component and interaction tests.
- [ ] Evaluate cost-effective deployment options.
- [ ] Document API examples and architecture decisions.

## License

No license has been specified yet. All rights are reserved by default until a license is added to the repository.

## Author

Developed as a backend engineering portfolio project focused on Python, API architecture, route optimization, PostgreSQL, and automated testing.
