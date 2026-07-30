# FinSightAI - Production Deployment & Local Execution Guide

FinSightAI is an enterprise-grade AI financial intelligence platform.
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + TanStack Query
- **Backend**: FastAPI + SQLAlchemy Async + Docker + PostgreSQL / Supabase / SQLite

---

## 💻 1. Long-Term Localhost Execution

FinSightAI includes a single-command automated bootloader that handles dependency checks, port clearing, migrations, schema creation, data seeding, and concurrent execution of both backend and frontend servers.

### One-Command Boot
From the project root directory, run:
```bash
./run.sh
```

### What `./run.sh` Does Automatically:
1. **Port Cleaning:** Frees ports `8000` (FastAPI) and `5173` (Vite) if they are currently occupied by stale processes.
2. **Virtual Environment Verification:** Checks for `backend/venv` or `.venv`. If none exists, it creates one and installs `backend/requirements.txt`.
3. **Frontend Package Verification:** Checks for `frontend/node_modules`. If absent, it runs `npm install` automatically.
4. **Auto-Database & Seeding:** On startup, FastAPI initializes all missing schemas and seeds 100+ credit card catalog entries and merchant lookup categories.
5. **Concurrent Execution & Graceful Cleanup:** Boots both servers with live reload. Pressing `Ctrl+C` cleanly terminates all processes.

### Local Endpoints:
- **Frontend Web App**: [http://localhost:5173](http://localhost:5173)
- **Backend Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Backend Health Check**: [http://localhost:8000/api/health/ready](http://localhost:8000/api/health/ready)

---

## ☁️ 2. Production Deployment: Backend on Render

The backend is packaged with **Docker**, guaranteeing all system libraries (Tesseract OCR, PyMuPDF, OpenCV, C-extensions) are installed identically in production.

### Step 1: Deploy Web Service via Render Blueprint
1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** -> **Blueprint**.
3. Select your `FinSightAI` repository.
4. Render will detect `render.yaml` automatically.

### Step 2: Configure Render Environment Variables
Under the service settings or Blueprint prompt, set the following environment variables:

| Variable | Example / Description |
| :--- | :--- |
| `DATABASE_URL` | `postgresql+asyncpg://postgres:pass@aws-1-...supabase.com:6543/postgres` |
| `SECRET_KEY` | *(A strong random 32+ character string)* |
| `APP_NAME` | `FinSightAI` |
| `DEBUG` | `False` |
| `ENABLE_MFA` | `False` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` |
| `CORS_ALLOWED_ORIGINS` | `https://fin-sight-ai-ote3.vercel.app,http://localhost:5173` |
| `GOOGLE_API_KEY` | *(Your Google AI Studio API Key)* |
| `GROQ_API_KEY` | *(Your Groq API Key)* |
| `YAHOO_FINANCE_API_KEY` | *(Your Yahoo Finance API Key)* |
| `N8N_ANALYTIC_WEBHOOK_URL` | `https://.../webhook/...` |
| `SUPABASE_URL` | `https://rtbvpjtogvvitputqkqh.supabase.co` |
| `SUPABASE_ANON_KEY` | *(Your Supabase Anon Key)* |
| `SUPABASE_SERVICE_ROLE_KEY` | *(Your Supabase Service Role Key)* |
| `SUPABASE_JWT_SECRET` | *(Your Supabase JWT Secret)* |

> [!TIP]
> The backend automatically converts standard `postgres://` or `postgresql://` URIs to `postgresql+asyncpg://` and disables prepared statement caching for seamless compatibility with Supabase's transaction pooler (port 6543).

---

## ⚡ 3. Production Deployment: Frontend on Vercel

Vercel provides edge CDN delivery and global SSL for the React Vite frontend.

### Step 1: Import Project into Vercel
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** -> **Project**.
3. Select your `FinSightAI` repository.

### Step 2: Configure Project Settings
- **Root Directory**: Click *Edit* and select **`frontend`** (essential for monorepos).
- **Framework Preset**: `Vite` (Auto-detected).
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### Step 3: Add Vercel Environment Variables
Add the following variables in the Vercel Project Settings:

| Variable | Description / Value |
| :--- | :--- |
| `VITE_API_URL` | Your Render Backend URL, e.g. `https://finsight-backend.onrender.com` *(no trailing slash)* |
| `VITE_APP_NAME` | `FinSightAI` |
| `VITE_ENABLE_MFA` | `false` |
| `VITE_ENABLE_ANALYTICS` | `true` |
| `VITE_ENABLE_THEME_SWITCH` | `true` |
| `VITE_SESSION_TIMEOUT` | `300` |
| `VITE_RATE_LIMIT_ATTEMPTS` | `5` |
| `VITE_RATE_LIMIT_DURATION` | `30` |
| `VITE_SUPABASE_URL` | `https://rtbvpjtogvvitputqkqh.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | *(Your Supabase Anon Key)* |

### Step 4: Link Frontend & Backend CORS
1. After Vercel completes the deployment, copy your production domain (e.g. `https://fin-sight-ai-ote3.vercel.app`).
2. Verify that `CORS_ALLOWED_ORIGINS` in your Render backend contains this domain.
3. The backend also includes a wildcard regex matching `https://.*\.vercel\.app` so all preview deployment links work out-of-the-box!
