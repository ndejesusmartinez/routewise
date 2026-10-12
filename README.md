# RouteWise

**Intelligent Delivery Route Optimization API**

RouteWise is a backend application for delivery planning, vehicle capacity management, route optimization, and operational tracking.

Built with Python and FastAPI, the project combines optimization algorithms, road-routing data, and PostgreSQL persistence to help organize delivery operations.

> **Project status:** Active development. This project is designed to demonstrate backend engineering, API design, database modeling, optimization, and automated testing.

## Features

- **Route optimization:** Calculate optimized routes using Google OR-Tools.
- **Capacity-aware planning:** Consider vehicle capacity when assigning delivery orders.
- **Delivery planning:** Generate and persist delivery plans.
- **Order management:** Register orders and retrieve their current status.
- **Vehicle management:** Register vehicles and their delivery capacities.
- **Delivery lifecycle:** Track orders through `PENDING`, `ASSIGNED`, `IN_TRANSIT`, `DELIVERED`, and `CANCELLED` states.
- **Vehicle route tracking:** Retrieve saved routes and ordered delivery stops for a vehicle.
- **Order history:** Review delivery plans associated with an order.
- **Operational dashboard:** Retrieve order counts by status, registered vehicles, and saved delivery plans.
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
                 API Clients
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

The road-routing integration supplies distance or duration information when required by the relevant planning workflow. OR-Tools uses the optimization inputs to calculate delivery routes.

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

### 6. Run the API

```powershell
python -m uvicorn app.main:app --reload
```

The API will be available at:

- **API base URL:** `http://127.0.0.1:8000`
- **Swagger documentation:** `http://127.0.0.1:8000/docs`
- **Health check:** `http://127.0.0.1:8000/health`

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
- [ ] Build a web dashboard for delivery operations.
- [ ] Evaluate cost-effective deployment options.
- [ ] Document API examples and architecture decisions.

## License

No license has been specified yet. All rights are reserved by default until a license is added to the repository.

## Author

Developed as a backend engineering portfolio project focused on Python, API architecture, route optimization, PostgreSQL, and automated testing.
