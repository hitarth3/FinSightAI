import uuid
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from database.session import get_db
from schemas.base import StandardResponse
from schemas.loan import LoanCreate, LoanUpdate, LoanResponse
from services.loan import LoanService
from core.dependencies import get_current_user
from models.user import User

router = APIRouter(prefix="/loans", tags=["Loans"])


@router.get("", response_model=StandardResponse[List[LoanResponse]])
async def get_loans(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Retrieves all loans belonging to the authenticated user."""
    service = LoanService(db)
    loans = await service.get_user_loans(current_user.id)
    return StandardResponse(
        success=True,
        message="Loans retrieved successfully.",
        data=[LoanResponse.model_validate(l) for l in loans]
    )


@router.post("", response_model=StandardResponse[LoanResponse], status_code=status.HTTP_201_CREATED)
async def create_loan(
    payload: LoanCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Creates a new loan record."""
    service = LoanService(db)
    loan = await service.create_loan(current_user.id, payload.model_dump())
    return StandardResponse(
        success=True,
        message="Loan record created successfully.",
        data=LoanResponse.model_validate(loan)
    )


@router.put("/{id}", response_model=StandardResponse[LoanResponse])
async def update_loan(
    id: uuid.UUID,
    payload: LoanUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Modifies an existing loan record by ID."""
    service = LoanService(db)
    loan = await service.update_loan(id, current_user.id, payload.model_dump(exclude_unset=True))
    if not loan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Loan record not found.")
    return StandardResponse(
        success=True,
        message="Loan record updated successfully.",
        data=LoanResponse.model_validate(loan)
    )


@router.delete("/{id}", response_model=StandardResponse[None])
async def delete_loan(
    id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Deletes a loan record by ID."""
    service = LoanService(db)
    deleted = await service.delete_loan(id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Loan record not found.")
    return StandardResponse(
        success=True,
        message="Loan record deleted successfully."
    )
