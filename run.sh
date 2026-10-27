#!/usr/bin/env bash
# Also accept `sh run.sh` by handing control to Bash before Bash-only syntax.
if [ -z "${BASH_VERSION:-}" ]; then
    exec bash "$0" "$@"
fi
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"
BACKEND_PID=""
FRONTEND_PID=""
cleanup() {
    local result=$?
    trap - EXIT INT TERM
    [ -z "$BACKEND_PID" ] || kill "$BACKEND_PID" 2>/dev/null || true
    [ -z "$FRONTEND_PID" ] || kill "$FRONTEND_PID" 2>/dev/null || true
    wait 2>/dev/null || true
    exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

CHECK_ONLY=false
case "${1:-}" in
    --check) CHECK_ONLY=true ;;
    "") ;;
    *) echo "Usage: bash run.sh [--check]"; exit 1 ;;
esac

for command in node npm curl; do
    if ! command -v "$command" >/dev/null 2>&1; then
        echo "Missing $command. Install the local prerequisites in README.md."
        exit 1
    fi
done
if ! node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major > 22 || (major === 22 && minor >= 13) ? 0 : 1)'; then
    echo "Node.js 22.13 or newer is required. Current version: $(node --version)"
    exit 1
fi
if [ ! -f backend/.env ]; then
    echo "Missing backend/.env. Copy backend/.env.example, then set DATABASE_URL and SECRET_KEY."
    echo "PostgreSQL can run locally; Docker is optional. See README.md."
    exit 1
fi

VENV_PYTHON="$ROOT_DIR/backend/.venv/bin/python"
if [ -x "$VENV_PYTHON" ]; then
    if ! "$VENV_PYTHON" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)'; then
        echo "backend/.venv uses Python older than 3.11. Preserve it, then recreate it:"
        echo '  mv backend/.venv "backend/.venv.backup-$(date +%s)"'
        echo '  python3.11 -m venv backend/.venv'
        exit 1
    fi
else
    SELECTED_PYTHON=""
    for candidate in "${PYTHON_BIN:-}" python3.13 python3.12 python3.11 python3; do
        [ -n "$candidate" ] || continue
        if command -v "$candidate" >/dev/null 2>&1 && "$candidate" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)' 2>/dev/null; then
            SELECTED_PYTHON="$candidate"
            break
        fi
        if [ -n "${PYTHON_BIN:-}" ]; then
            echo "PYTHON_BIN must point to an installed Python 3.11 or newer."
            exit 1
        fi
    done
    if [ -z "$SELECTED_PYTHON" ]; then
        echo "Python 3.11 or newer is required. Install it, then run this script again."
        exit 1
    fi
fi

for port in 8000 5173; do
    if command -v lsof >/dev/null && lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
        echo "Port $port is in use. Stop its server before retrying; no processes were killed."
        exit 1
    fi
done
if [ "$CHECK_ONLY" = true ]; then
    echo "Local prerequisites passed. Database connectivity is checked during startup."
    exit 0
fi
if [ ! -x "$VENV_PYTHON" ]; then
    "$SELECTED_PYTHON" -m venv backend/.venv
fi
"$VENV_PYTHON" -m ensurepip --upgrade >/dev/null
"$VENV_PYTHON" -m pip install -r backend/requirements.txt
npm --prefix frontend ci
echo "Applying migrations to the database configured in backend/.env."
if ! (cd backend && PYTHONPATH=. "$VENV_PYTHON" -m alembic upgrade head); then
    echo "Database setup failed. Check DATABASE_URL in backend/.env and database availability."
    exit 1
fi
(
    cd backend
    exec "$VENV_PYTHON" -m uvicorn main:app --host 127.0.0.1 --port 8000
) &
BACKEND_PID=$!
for attempt in {1..30}; do
    if curl --connect-timeout 1 --max-time 2 --fail --silent http://127.0.0.1:8000/api/health/ready >/dev/null; then break; fi
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then echo "Backend startup failed."; exit 1; fi
    if [ "$attempt" -eq 30 ]; then echo "Backend did not become ready after 30 checks."; exit 1; fi
    sleep 1
done
(
    cd frontend
    exec node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort
) &
FRONTEND_PID=$!
echo "API ready at http://127.0.0.1:8000. Frontend starting at http://127.0.0.1:5173."
while kill -0 "$BACKEND_PID" 2>/dev/null && kill -0 "$FRONTEND_PID" 2>/dev/null; do sleep 1; done
echo "A server stopped. Shutting down the remaining server."
exit 1
