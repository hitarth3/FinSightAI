#!/bin/bash
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}===============================================================${NC}"
echo -e "${CYAN}        FinSightAI - Unified Services Bootloader              ${NC}"
echo -e "${CYAN}===============================================================${NC}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

cleanup() {
    echo -e "\n${YELLOW}Shutting down servers cleanly...${NC}"
    if [ -n "$BACKEND_PID" ]; then
        echo -e "${BLUE}Stopping FastAPI Backend (PID $BACKEND_PID)...${NC}"
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        echo -e "${BLUE}Stopping React Frontend (PID $FRONTEND_PID)...${NC}"
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    echo -e "${GREEN}All systems cleanly terminated. Goodbye!${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Port cleanup: Free ports 8000 and 5173 if already occupied
echo -e "${BLUE}[0/4] Checking and clearing port conflicts...${NC}"
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Step 1: Virtual Environment Setup
echo -e "${BLUE}[1/4] Checking Python Virtual Environment...${NC}"
VENV_PATH=""
if [ -d "$ROOT_DIR/backend/venv" ]; then
    VENV_PATH="$ROOT_DIR/backend/venv"
elif [ -d "$ROOT_DIR/.venv" ]; then
    VENV_PATH="$ROOT_DIR/.venv"
else
    echo -e "${YELLOW}Creating Python virtual environment at backend/venv...${NC}"
    python3 -m venv "$ROOT_DIR/backend/venv"
    VENV_PATH="$ROOT_DIR/backend/venv"
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    "$VENV_PATH/bin/pip" install --upgrade pip
    "$VENV_PATH/bin/pip" install -r "$ROOT_DIR/backend/requirements.txt"
fi

PYTHON_BIN="$VENV_PATH/bin/python"

# Step 2: Check Frontend Node Modules
echo -e "${BLUE}[2/4] Checking Frontend dependencies...${NC}"
if [ ! -d "$ROOT_DIR/frontend/node_modules" ]; then
    echo -e "${YELLOW}Installing frontend node packages (npm install)...${NC}"
    npm --prefix "$ROOT_DIR/frontend" install
fi

# Step 3: Start FastAPI Backend Server
echo -e "${BLUE}[3/4] Applying database migrations...${NC}"
cd "$ROOT_DIR/backend"
PYTHONPATH=. "$PYTHON_BIN" -m alembic upgrade head

echo -e "${BLUE}Booting FastAPI Backend on http://localhost:8000...${NC}"
PYTHONPATH=. "$PYTHON_BIN" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd "$ROOT_DIR"

# Wait briefly for backend startup
sleep 2

# Step 4: Start Frontend Vite Dev Server
echo -e "${BLUE}[4/4] Booting React Frontend on http://localhost:5173...${NC}"
npm --prefix "$ROOT_DIR/frontend" run dev &
FRONTEND_PID=$!

echo -e "\n${GREEN}===============================================================${NC}"
echo -e "${GREEN}   FinSightAI is LIVE and fully operational!                  ${NC}"
echo -e "${GREEN}     - Frontend Web App:     http://localhost:5173            ${NC}"
echo -e "${GREEN}     - Backend Swagger Docs: http://localhost:8000/docs       ${NC}"
echo -e "${GREEN}     - Health Check:         http://localhost:8000/api/health/ready ${NC}"
echo -e "${GREEN}===============================================================${NC}"
echo -e "${YELLOW}Press Ctrl+C to terminate both servers.${NC}\n"

wait "$BACKEND_PID" "$FRONTEND_PID"
