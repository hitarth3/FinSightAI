import uuid
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from database.session import get_db
from schemas.base import StandardResponse
from schemas.card import (
    UserCreditCardCreate,
    UserCreditCardUpdate,
    UserCreditCardResponse,
    CreditCardCatalogResponse,
    CreditCardSummaryResponse,
    CreditCardInsight
)
from services.card import CardService
from core.dependencies import get_current_user
from models.user import User

router = APIRouter(tags=["Credit Cards"])


@router.get("/credit-cards", response_model=StandardResponse[List[UserCreditCardResponse]])
async def get_cards(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Retrieves all credit cards belonging to the authenticated user."""
    service = CardService(db)
    cards = await service.get_user_cards(current_user.id)
    return StandardResponse(
        success=True,
        message="Credit cards retrieved successfully.",
        data=[UserCreditCardResponse.model_validate(c) for c in cards]
    )


@router.post("/credit-cards", response_model=StandardResponse[UserCreditCardResponse], status_code=status.HTTP_201_CREATED)
async def create_card(
    payload: UserCreditCardCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Creates a new credit card record linked to catalog."""
    service = CardService(db)
    card = await service.create_card(current_user.id, payload.model_dump())
    return StandardResponse(
        success=True,
        message="Credit card record created successfully.",
        data=UserCreditCardResponse.model_validate(card)
    )


@router.put("/credit-cards/{id}", response_model=StandardResponse[UserCreditCardResponse])
async def update_card(
    id: uuid.UUID,
    payload: UserCreditCardUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Modifies an existing credit card record by ID."""
    service = CardService(db)
    card = await service.update_card(id, current_user.id, payload.model_dump(exclude_unset=True))
    if not card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credit card record not found.")
    return StandardResponse(
        success=True,
        message="Credit card record updated successfully.",
        data=UserCreditCardResponse.model_validate(card)
    )


@router.delete("/credit-cards/{id}", response_model=StandardResponse[None])
async def delete_card(
    id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Deletes a credit card record by ID."""
    service = CardService(db)
    deleted = await service.delete_card(id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credit card record not found.")
    return StandardResponse(
        success=True,
        message="Credit card record deleted successfully."
    )


@router.get("/credit-card-catalog", response_model=StandardResponse[List[CreditCardCatalogResponse]])
async def get_catalog(
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Retrieves the global credit card catalog profiles."""
    service = CardService(db)
    catalog = await service.get_catalog()
    return StandardResponse(
        success=True,
        message="Credit card catalog retrieved successfully.",
        data=[CreditCardCatalogResponse.model_validate(c) for c in catalog]
    )


@router.get("/credit-card-summary", response_model=StandardResponse[CreditCardSummaryResponse])
async def get_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Retrieves aggregate metrics including limits, utilization, and cashback."""
    service = CardService(db)
    summary = await service.get_card_summary(current_user.id)
    return StandardResponse(
        success=True,
        message="Credit card summary compiled successfully.",
        data=CreditCardSummaryResponse.model_validate(summary)
    )


@router.get("/credit-card-insights", response_model=StandardResponse[List[CreditCardInsight]])
async def get_insights(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Generates rule-based credit safety and optimization insights."""
    service = CardService(db)
    insights = await service.get_card_insights(current_user.id)
    return StandardResponse(
        success=True,
        message="Credit card insights generated successfully.",
        data=[CreditCardInsight.model_validate(ins) for ins in insights]
    )


@router.post("/credit-card-catalog/reseed", response_model=StandardResponse[dict])
async def force_reseed_catalog(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Admin: Clears and reseeds the card catalog with the latest 100+ card profiles."""
    if not current_user.email.endswith("@finsight.ai") and not current_user.email.startswith("admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrator accounts are authorized to reseed the catalog."
        )
    service = CardService(db)
    count = await service.force_reseed()
    return StandardResponse(
        success=True,
        message=f"Card catalog reseeded with {count} cards successfully.",
        data={"cards_seeded": count}
    )
