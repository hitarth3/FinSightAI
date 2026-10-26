#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e

echo "Applying database migrations..."
PYTHONPATH=. alembic upgrade head

echo "Starting FastAPI server..."
# Render defines $PORT at runtime, so we bind to that, falling back to 8000 if not set.
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
