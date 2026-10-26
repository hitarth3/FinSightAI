import uuid
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from database.session import get_db
from schemas.base import StandardResponse
from schemas.investment import InvestmentCreate, InvestmentUpdate, InvestmentResponse
from services.investment import InvestmentService
from core.dependencies import get_current_user
from models.user import User

router = APIRouter(prefix="/investments", tags=["Investments"])


@router.get("", response_model=StandardResponse[List[InvestmentResponse]])
async def get_investments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Retrieves all investments belonging to the authenticated user."""
    service = InvestmentService(db)
    investments = await service.get_user_investments(current_user.id)
    return StandardResponse(
        success=True,
        message="Investments retrieved successfully.",
        data=[InvestmentResponse.model_validate(inv) for inv in investments]
    )


@router.post("", response_model=StandardResponse[InvestmentResponse], status_code=status.HTTP_201_CREATED)
async def create_investment(
    payload: InvestmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Creates a new investment tracker record."""
    service = InvestmentService(db)
    investment = await service.create_investment(current_user.id, payload.model_dump())
    return StandardResponse(
        success=True,
        message="Investment record created successfully.",
        data=InvestmentResponse.model_validate(investment)
    )


@router.put("/{id}", response_model=StandardResponse[InvestmentResponse])
async def update_investment(
    id: uuid.UUID,
    payload: InvestmentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Modifies an existing investment tracker record by ID."""
    service = InvestmentService(db)
    investment = await service.update_investment(id, current_user.id, payload.model_dump(exclude_unset=True))
    if not investment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investment record not found.")
    return StandardResponse(
        success=True,
        message="Investment record updated successfully.",
        data=InvestmentResponse.model_validate(investment)
    )


@router.delete("/{id}", response_model=StandardResponse[None])
async def delete_investment(
    id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Deletes an investment tracker record by ID."""
    service = InvestmentService(db)
    deleted = await service.delete_investment(id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investment record not found.")
    return StandardResponse(
        success=True,
        message="Investment record deleted successfully."
    )
