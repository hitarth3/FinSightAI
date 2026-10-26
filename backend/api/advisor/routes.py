from typing import List, Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from database.session import get_db
from schemas.base import StandardResponse
from schemas.advisor import (
    BestCardRequest,
    BestCardResponse,
    RewardAnalyticsResponse,
    RewardSummaryResponse,
    CardRecommendationResponse,
    AdvisorChatRequest,
    AdvisorChatResponse,
    MerchantLookupRequest,
    MerchantLookupResponse,
    FinanceChatRequest,
)
from services.advisor import AdvisorService
from core.dependencies import get_current_user
from models.user import User

router = APIRouter(tags=["Smart Card Advisor"])


@router.post("/advisor/best-card", response_model=StandardResponse[BestCardResponse])
async def get_best_card(
    payload: BestCardRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Simulates rewards for a purchase and identifies the best card to use."""
    service = AdvisorService(db)
    result = await service.get_best_card(
        current_user.id, payload.merchant, payload.category, payload.amount
    )
    return StandardResponse(
        success=True,
        message="Optimal credit card identified successfully.",
        data=result
    )


@router.get("/advisor/reward-analytics", response_model=StandardResponse[RewardAnalyticsResponse])
async def get_reward_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Compiles reward aggregates (cashbacks, missed savings, best cards)."""
    service = AdvisorService(db)
    result = await service.get_reward_analytics(current_user.id)
    return StandardResponse(
        success=True,
        message="Credit card reward analytics compiled successfully.",
        data=result
    )


@router.get("/advisor/reward-summary", response_model=StandardResponse[List[RewardSummaryResponse]])
async def get_reward_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Compiles monthly RAG documents and registers summaries in vector index."""
    service = AdvisorService(db)
    result = await service.get_reward_summary(current_user.id)
    return StandardResponse(
        success=True,
        message="Monthly reward summaries retrieved and indexed successfully.",
        data=result
    )


@router.post("/advisor/recommend-card", response_model=StandardResponse[CardRecommendationResponse])
async def get_card_recommendation(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Analyzes expenses to recommend new high-yield credit cards to apply for."""
    service = AdvisorService(db)
    result = await service.get_card_recommendation(current_user.id)
    return StandardResponse(
        success=True,
        message="High-yield credit card recommendations compiled successfully.",
        data=result
    )


@router.post("/advisor/chat", response_model=StandardResponse[AdvisorChatResponse])
async def chat_advisor(
    payload: AdvisorChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Interactive RAG chat session with the AI Smart Card Advisor."""
    service = AdvisorService(db)
    history_list = [{"role": h.role, "content": h.content} for h in payload.history]
    reply = await service.chat_advisor(current_user.id, payload.message, history_list)
    return StandardResponse(
        success=True,
        message="Assistant query processed successfully.",
        data={"reply": reply}
    )


@router.post("/advisor/finance-chat", response_model=StandardResponse[AdvisorChatResponse])
async def finance_chat(
    payload: FinanceChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Centralized financial intelligence chat & analysis engine."""
    service = AdvisorService(db)
    history_list = [{"role": h.role, "content": h.content} for h in payload.history]
    reply = await service.finance_chat(
        user_id=current_user.id,
        message=payload.message,
        history=history_list,
        is_analyze=payload.is_analyze
    )
    return StandardResponse(
        success=True,
        message="Financial analysis processed successfully.",
        data={"reply": reply}
    )


@router.post("/advisor/merchant-lookup", response_model=StandardResponse[MerchantLookupResponse])
async def merchant_lookup(
    payload: MerchantLookupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Resolve a merchant name to its spending category using DB + AI classification."""
    from models.merchant_category import MerchantCategory
    from sqlalchemy import select as sa_select

    service = AdvisorService(db)
    await service.seed_merchants()

    # Check DB first
    q = await db.execute(sa_select(MerchantCategory).where(MerchantCategory.merchant_name.ilike(f"%{payload.merchant}%")))
    mapping = q.scalars().first()
    found_in_db = mapping is not None
    ai_classified = False

    if found_in_db:
        category, channel = mapping.category, (mapping.channel_type or "both")
    else:
        category, channel = await service.resolve_category(payload.merchant, None)
        ai_classified = True

    return StandardResponse(
        success=True,
        message="Merchant category resolved.",
        data=MerchantLookupResponse(
            merchant=payload.merchant,
            category=category,
            channel_type=channel,
            found_in_db=found_in_db,
            ai_classified=ai_classified,
        )
    )
