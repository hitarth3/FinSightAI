# FinSight AI

FinSight AI is a personal finance dashboard built with React, TypeScript, and FastAPI. It brings expense and statement tracking, credit-card summaries, market watchlists, and optional AI assistance into one workspace.

The **Explore the demo** button opens a read-only workspace with clearly labeled fictional data. It needs no account or API keys and never writes sample data to the backend. Sign up or sign in to connect the authenticated dashboard to your backend.

## Run the full app locally

Requirements: Node.js **22.13+**, Python **3.11+**, and PostgreSQL **16**. Docker is optional.

### macOS without Docker

Install and start local prerequisites with Homebrew:

```sh
brew install node@22 python@3.11 postgresql@16
brew services start postgresql@16
export PATH="$(brew --prefix node@22)/bin:$(brew --prefix postgresql@16)/bin:$PATH"
```

For a new database, create a login and database (skip these commands if you already created them):

```sh
createuser --pwprompt finsight
createdb --owner=finsight finsight
```

Choose a database password when prompted. Copy the environment templates only if the destination files do not exist:

```sh
cp -n backend/.env.example backend/.env
cp -n frontend/.env.example frontend/.env.local
openssl rand -hex 32
```

In `backend/.env`, set `SECRET_KEY` to the generated value and update `DATABASE_URL` with the password chosen above:

```dotenv
DATABASE_URL=postgresql+asyncpg://finsight:YOUR_PASSWORD@localhost:5432/finsight
```

URL-encode special characters in the database password when placing it in the URL. Keep `DEBUG=True` for local development and `ENABLE_MFA=False`. Never commit environment files or secrets.

Start the app from the repository root:

```sh
bash run.sh --check
bash run.sh
```

The check validates local tools, Python, configuration-file presence, and occupied ports without installing packages or starting servers. Startup installs dependencies, applies migrations, and launches both servers. If an existing `backend/.venv` uses Python older than 3.11, the script prints commands to preserve and recreate it. You can set `PYTHON_BIN=/path/to/python3.11` when creating a new environment.

Open <http://localhost:5173>. Press **Ctrl+C** to stop both servers. API readiness is at <http://localhost:8000/api/health/ready>; API docs are at <http://localhost:8000/docs> when `DEBUG=True`.

### Optional Docker database

To use Docker for PostgreSQL instead, copy `.env.example` to `.env`, set `POSTGRES_PASSWORD` and `SECRET_KEY`, then run `docker compose up -d db`. Use the same database password in `backend/.env` and start the app with `bash run.sh`. The native PostgreSQL service must be stopped first if it uses port 5432.

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

## Stock reports and MCP

Stock reports now run in FastAPI without n8n. An authenticated
`POST /api/stocks/analysis/trigger/{symbol}` fetches six months of adjusted daily
Yahoo Finance history, computes trend/range metrics, and saves the report in the
existing database transaction. Symbols without a suffix use NSE; `.BO` uses BSE.
At least 50 observations are required. Provider failures return 503; the UI can
show a clearly marked older saved report. No database migration is required.

Set `GROQ_API_KEY` in `backend/.env` to add an AI-written summary. Optionally set
`STOCK_REPORT_MODEL` (default `llama-3.3-70b-versatile`). Without a key, or if Groq
fails, the report contains a labeled rules-based summary of the same metrics.
The score is a trend heuristic; HOLD is a neutral research placeholder, not a
personalized recommendation. Confidence is not estimated. No news or fundamental
analysis is claimed. The report includes its market-data date and source.
Historical range extrema are not forecasts. Old n8n environment variables are no
longer used; remove them from local/deployment configuration when convenient.

MCP is an additional interface for compatible AI clients, not a replacement for
market data or an LLM. Its two tools use the exact same engine as the dashboard:
`get_market_snapshot` and `generate_stock_report`. They expose public market data
only, do not save reports, and cannot access accounts or place trades.

Install and launch the optional local stdio server:

```sh
cd backend
.venv/bin/python -m pip install -r requirements-mcp.txt
.venv/bin/python market_mcp.py
```

The process waits for an MCP client on stdin. Configure your MCP client's server
entry using absolute paths (replace `/absolute/path/FinSightAI-main`):

```json
{
  "mcpServers": {
    "finsight-market": {
      "command": "/absolute/path/FinSightAI-main/backend/.venv/bin/python",
      "args": ["/absolute/path/FinSightAI-main/backend/market_mcp.py"],
      "cwd": "/absolute/path/FinSightAI-main/backend"
    }
  }
}
```

Launch from the backend directory so the existing `.env` is loaded; clients that
do not support `cwd` should supply the backend environment explicitly. Keep keys
out of committed client configuration. This is a local stdio server, not a public
HTTP MCP endpoint. The existing application settings validation still applies.
Implementation references: [official MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)
and [Groq JSON output](https://console.groq.com/docs/structured-outputs).
