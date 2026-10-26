from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import uuid


class BestCardRequest(BaseModel):
    merchant: Optional[str] = Field(None, max_length=150)
    category: Optional[str] = Field(None, max_length=50)
    amount: float = Field(..., gt=0)


class CardRankingItem(BaseModel):
    card_id: str
    bank_name: str
    card_name: str
    nickname: Optional[str] = None
    expected_rewards: float
    reward_rate: float
    available_limit: float
    additional_savings: float = 0.0
    confidence_score: float = 0.0
    monthly_cap_remaining: Optional[float] = None
    utilization_pct: float = 0.0
    days_to_due_date: int = 0


class BestCardResponse(BaseModel):
    category: str
    amount: float
    best_card: Optional[CardRankingItem] = None
    alternative_card: Optional[CardRankingItem] = None
    fallback_card: Optional[CardRankingItem] = None
    rankings: List[CardRankingItem] = []
    confidence_score: float = 0.0
    explanation: str


class MerchantLookupRequest(BaseModel):
    merchant: str = Field(..., min_length=1, max_length=150)


class MerchantLookupResponse(BaseModel):
    merchant: str
    category: str
    channel_type: str
    found_in_db: bool
    ai_classified: bool = False


class RewardAnalyticsResponse(BaseModel):
    monthly_cashback: float
    annual_cashback: float
    reward_points_earned: int
    missed_rewards: float
    best_performing_card: str
    worst_performing_card: str
    cap_usage_summary: List[Dict[str, Any]] = []
    annual_forecast: float = 0.0


class RewardSummaryResponse(BaseModel):
    month: str
    cards_used: str
    rewards_earned: float
    rewards_missed: float
    top_categories: str
    top_merchants: str
    annual_forecast: float = 0.0


class RecommendedCardItem(BaseModel):
    catalog_id: str
    bank_name: str
    card_name: str
    annual_fee: float
    estimated_annual_rewards: float
    net_benefit: float
    reward_type: str
    official_url: Optional[str] = None


class CardRecommendationResponse(BaseModel):
    recommended_card: Optional[RecommendedCardItem] = None
    reasoning: str
    all_catalog_options: List[RecommendedCardItem] = []


class ChatHistoryItem(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str


class AdvisorChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    history: List[ChatHistoryItem] = []


class AdvisorChatResponse(BaseModel):
    reply: str


class FinanceChatRequest(BaseModel):
    message: str = Field("", min_length=0)
    history: List[ChatHistoryItem] = []
    is_analyze: bool = False

