from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.config import settings
from middleware.exceptions import register_exception_handlers

# Import Routers
from api.auth.routes import router as auth_router
from app.modules.expenses.router import router as expenses_router
from api.investments.routes import router as investments_router
from api.stocks.routes import router as stocks_router
from api.credit_cards.routes import router as cards_router
from api.advisor.routes import router as advisor_router
from api.loans.routes import router as loans_router
from api.dashboard.routes import router as dashboard_router
from api.health.routes import router as health_router

# Setup Logging - Updated config
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Register all models for SQLAlchemy metadata
import database.base


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown hooks."""
    logger.info(f"Starting {settings.APP_NAME}...")

    # Ensure upload directories exist
    import os
    os.makedirs("uploads", exist_ok=True)
    os.makedirs(os.path.join("uploads", "thumbnails"), exist_ok=True)

    # Seed initial catalog and merchant mappings if database is fresh.
    # Schema management is Alembic's job alone (see entrypoint.sh / run.sh,
    # which both run `alembic upgrade head` before the app starts) — running
    # Base.metadata.create_all() here too would let a model change without a
    # matching migration silently "work" on fresh DBs while never being
    # applied to existing ones.
    try:
        from database.session import SessionLocal
        async with SessionLocal() as session:
            from services.card import CardService
            from services.advisor import AdvisorService
            card_svc = CardService(session)
            await card_svc.seed_catalog()
            adv_svc = AdvisorService(session)
            await adv_svc.seed_merchants()
            await session.commit()
        logger.info("Card catalog and merchant data initialized.")
    except Exception as e:
        logger.warning(f"Auto-seed during startup note: {e}")

    yield
    logger.info(f"Shutting down {settings.APP_NAME}...")


from database.session import SessionLocal

app = FastAPI(
    title=settings.APP_NAME,
    description="Enterprise-Grade Backend Monolith for FinSightAI",
    version="1.0.0",
    lifespan=lifespan
)
app.state.db_session_factory = SessionLocal

# CORS configurations: supports explicit origins + dynamic localhost/Vercel regex
allowed_origins = [origin.strip() for origin in settings.CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$|^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register standardized error responders
register_exception_handlers(app)



# Consolidate API routing under /api prefix
api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(expenses_router)
api_router.include_router(investments_router)
api_router.include_router(stocks_router)
api_router.include_router(cards_router)
api_router.include_router(advisor_router)
api_router.include_router(loans_router)
api_router.include_router(dashboard_router)
api_router.include_router(health_router)

# Mount consolidating router
app.include_router(api_router)


from fastapi.responses import RedirectResponse

@app.get("/", include_in_schema=False)
async def root_redirect():
    """Redirects root path queries to the interactive API documentation."""
    return RedirectResponse(url="/docs")
