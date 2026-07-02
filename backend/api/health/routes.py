import logging
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from database.session import get_db
from schemas.base import StandardResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["System Monitoring"])


@router.get("/live", response_model=StandardResponse[Dict[str, str]])
def liveness_probe() -> Any:
    """Fast process liveness check."""
    return StandardResponse(
        success=True,
        message="FinSightAI API is live.",
        data={"status": "healthy"}
    )


@router.get("/ready", response_model=StandardResponse[Dict[str, str]])
async def readiness_probe(db: AsyncSession = Depends(get_db)) -> Any:
    """Readiness probe asynchronously validating Postgres database connection."""
    try:
        await db.execute(select(1))
        return StandardResponse(
            success=True,
            message="Database connection active.",
            data={"database": "healthy"}
        )
    except Exception as e:
        logger.error(f"Readiness probe failed: {e}", exc_info=True)
        # This endpoint is unauthenticated — never expose raw DB connection
        # errors (hostnames, credential hints) to an anonymous caller.
        detail = f"Database connection unready: {e}" if settings.DEBUG else "Database connection unready."
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail
        )
