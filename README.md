# FinSight AI

FinSight AI is a personal finance dashboard built with React, TypeScript, and FastAPI. It brings expense and statement tracking, credit-card summaries, market watchlists, and optional AI assistance into one workspace.

The **Explore the demo** button opens a read-only workspace with clearly labeled fictional data. It needs no account or API keys and never writes sample data to the backend. Sign up or sign in to connect the authenticated dashboard to your backend.

## Run the full app locally

Requirements: Docker with Compose, Node.js 22 or newer, and Python 3.11 or newer.

1. Copy `.env.example` to `.env` and set the PostgreSQL password, a random 64-character hex signing key, and the exact web origins permitted to access the API. Generate a key with `python -c "import secrets; print(secrets.token_hex(32))"`.
2. Copy `frontend/.env.example` to `frontend/.env.local`. Its default API address works with the local setup. Google sign-in is optional.
3. Start PostgreSQL with `docker compose up -d db`.
4. Copy `backend/.env.example` to `backend/.env`. Set the same database password and a fresh signing key. Set `DEBUG=True` for local API docs.
5. Run `./run.sh`. It checks ports before use, installs the locked Python and JavaScript dependencies, applies Alembic migrations, waits for the database health endpoint, and starts the backend and frontend. It never kills other processes.
6. Open <http://localhost:5173>. API readiness is available at <http://localhost:8000/api/health/ready>. Interactive API docs are enabled only while `DEBUG=True`.

`frontend/.env.example` and `backend/.env.example` list optional integrations. The core tracking experience does not require them. Without an API, use the demo button; authenticated data requires PostgreSQL and the backend.

## Checks

```sh
npm --prefix frontend ci
npm --prefix frontend test
npm --prefix frontend run build
PYTHONPATH=backend pytest -q backend/tests
```

CI also installs the constrained backend dependencies, runs `pip check`, applies all migrations to PostgreSQL 16, and runs the tests. Backend dependency versions are constrained in `backend/constraints.txt`; upgrade them deliberately and rerun this set of checks.

## Deploy

The root `compose.yaml` runs PostgreSQL 16 and the FastAPI API. Production startup requires `DEBUG=False`, an original 32-character-or-longer signing key, and an explicit list of CORS origins. The production API omits interactive OpenAPI documentation. The backend image runs as a non-root user and persists uploaded files to a volume. `render.yaml` is an alternative backend blueprint; set database, API integrations, and your exact frontend URL in CORS. Set `VITE_API_URL` to the HTTPS API origin in Vercel.

Read [DEPLOYMENT.md](DEPLOYMENT.md) for launch steps and the current feature limits. This app has not had a production security review.
