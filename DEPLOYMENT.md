# Deployment and demo guide

## Interview demo

Open the Vercel site and select **Explore the demo** on the login screen. It is the quickest way to show a populated workspace: overview, sample expense search, credit utilization, cash flow, category breakdown, and recent transactions. All demo numbers are fictional and the preview makes no API calls. Exit the sample workspace to return to sign in.

If you use a configured account, test sign-up, sign-in, record creation, uploads, mobile navigation, and sign-out before the interview. Avoid displaying real account information in a shared screen recording.

## Local run

Use Node 22+, Python 3.11+, and Docker Compose. Copy the root `.env.example` to `.env`, enter separate unique 64-character hex values for the PostgreSQL password and signing key. Generate each independently with `python -c "import secrets; print(secrets.token_hex(32))"`, and choose the exact web origins for `CORS_ALLOWED_ORIGINS`. Copy the backend and frontend examples to `backend/.env` and `frontend/.env.local`. For local API documentation, set `DEBUG=True` in `backend/.env`.

Start the database with `docker compose up -d db`, then run `./run.sh`. It starts the API on `127.0.0.1:8000` and Vite on `127.0.0.1:5173`. It refuses occupied ports instead of killing their listeners and shuts both child processes down when stopped. API docs are available at `/docs` only in debug mode.

## Production

The CI workflow builds the frontend, runs frontend tests, validates the production backend dependency set, applies all Alembic migrations against PostgreSQL 16, and runs backend tests. The local Docker image creates an unprivileged user, runs migrations before starting FastAPI, checks database readiness, and persists the database and uploads in separate volumes. The root Compose file is a straightforward single-host deployment starting point; put TLS and a reverse proxy in front of the API before exposing it publicly.

For Render and Vercel, set the backend's `DATABASE_URL`, `SECRET_KEY`, `DEBUG=False`, `ENABLE_MFA=False`, and a comma-separated `CORS_ALLOWED_ORIGINS` containing the exact Vercel hostname. Set Vercel `VITE_API_URL` to the HTTPS API origin, without `/api` or a trailing slash. Rebuild after changing Vite environment variables because they are compiled into frontend assets.

The Render blueprint uses a free service plan, which may sleep and has ephemeral storage. Uploaded receipts on Render therefore need an external object-storage integration before you rely on them in production. Do not configure `*` or a preview wildcard in production CORS. A production PostgreSQL database must be supplied separately. Keep API keys server-side; only the Google web client ID belongs in the frontend.

## Current limits to know

- Password reset is not implemented; the login page has no pretend recovery action.
- An OTP screen remains for accounts where MFA is required, but the repository has no code-delivery provider. Production settings refuse to start if MFA is enabled. Keep it disabled until a real email/SMS delivery flow and integration tests exist.
- Market quotes depend on the configured market provider and may be delayed or unavailable. News is explicitly labeled as sample content; it is not a live market-news service.
- AI advice requires an API key and provider checks. Treat generated output as informational rather than personalized financial advice.
- The account's authenticated screens use browser storage for access and refresh tokens. This is an interview/demo app, not independently audited financial software; complete a security review and an HttpOnly cookie/token-storage migration before handling real customer data.
