from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database.session import get_db
from schemas.base import StandardResponse
from schemas.dashboard import DashboardOverviewResponse
from services.dashboard import DashboardService
from core.dependencies import get_current_user
from models.user import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard Aggregations"])


@router.get("/overview", response_model=StandardResponse[DashboardOverviewResponse])
async def get_dashboard_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Aggregates assets, savings, debts, utilization, and EMI metrics into a standardized response."""
    service = DashboardService(db)
    overview = await service.get_overview(current_user.id)
    return StandardResponse(
        success=True,
        message="Dashboard overview loaded.",
        data=DashboardOverviewResponse(**overview)
    )
