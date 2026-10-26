#!/usr/bin/env bash
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

if [ ! -f backend/.env ]; then
    echo "Create backend/.env from backend/.env.example and configure PostgreSQL first. See README.md."
    exit 1
fi
for port in 8000 5173; do
    if command -v lsof >/dev/null && lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
        echo "Port $port is in use. Stop its server or choose different ports; no processes were killed."
        exit 1
    fi
done
if [ ! -x backend/.venv/bin/python ]; then
    "${PYTHON_BIN:-python3}" -m venv backend/.venv
fi
VENV_PYTHON="$ROOT_DIR/backend/.venv/bin/python"
"$VENV_PYTHON" -c 'import sys; assert sys.version_info >= (3, 11), "Python 3.11+ is required. Recreate backend/.venv with Python 3.11+."'
"$VENV_PYTHON" -m ensurepip --upgrade >/dev/null
"$VENV_PYTHON" -m pip install -r backend/requirements.txt
npm --prefix frontend ci
(
    cd backend
    PYTHONPATH=. "$VENV_PYTHON" -m alembic upgrade head
    exec "$VENV_PYTHON" -m uvicorn main:app --host 127.0.0.1 --port 8000
) &
BACKEND_PID=$!
for attempt in {1..30}; do
    if curl --fail --silent http://127.0.0.1:8000/api/health/ready >/dev/null; then break; fi
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then echo "Backend startup failed."; exit 1; fi
    if [ "$attempt" -eq 30 ]; then echo "Backend did not become ready within 30 seconds."; exit 1; fi
    sleep 1
done
npm --prefix frontend run dev -- --host 127.0.0.1 --port 5173 --strictPort &
FRONTEND_PID=$!
echo "API ready at http://127.0.0.1:8000. Frontend starting at http://127.0.0.1:5173."
while kill -0 "$BACKEND_PID" 2>/dev/null && kill -0 "$FRONTEND_PID" 2>/dev/null; do sleep 1; done
echo "A server stopped. Shutting down the remaining server."
exit 1
