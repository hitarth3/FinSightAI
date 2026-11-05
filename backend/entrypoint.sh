#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e

# Use this backend's configuration regardless of the caller's working directory.
BACKEND_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$BACKEND_DIR"

echo "Applying database migrations..."
python -m alembic -c "$BACKEND_DIR/alembic.ini" upgrade head

echo "Starting FastAPI server..."
# Render defines $PORT at runtime, so we bind to that, falling back to 8000 if not set.
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
