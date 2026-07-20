import uuid
from datetime import date as date_type
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class CreditCardCatalogCreate(BaseModel):
    bank_name: str = Field(..., max_length=100)
    card_name: str = Field(..., max_length=100)
    card_type: Optional[str] = Field(None, max_length=50)
    joining_fee: Optional[float] = Field(0.0, ge=0)
    annual_fee: Optional[float] = Field(0.0, ge=0)
    reward_type: Optional[str] = Field(None, max_length=50)
    reward_rules_json: Optional[Dict[str, Any]] = None
    lounge_access: Optional[str] = Field(None, max_length=255)
    fuel_benefits: Optional[str] = Field(None, max_length=255)
    reward_conversion: Optional[str] = Field(None, max_length=255)
    official_url: Optional[str] = Field(None, max_length=500)


class CreditCardCatalogResponse(BaseModel):
    id: uuid.UUID
    bank_name: str
    card_name: str
    card_type: Optional[str] = None
    joining_fee: Optional[float] = 0.0
    annual_fee: Optional[float] = 0.0
    reward_type: Optional[str] = None
    reward_rules_json: Optional[Dict[str, Any]] = None
    lounge_access: Optional[str] = None
    fuel_benefits: Optional[str] = None
    reward_conversion: Optional[str] = None
    official_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserCreditCardCreate(BaseModel):
    catalog_id: uuid.UUID
    credit_limit: float = Field(..., gt=0)
    outstanding: float = Field(default=0.0, ge=0)
    billing_date: int = Field(..., ge=1, le=31)
    due_date: date_type
    nickname: Optional[str] = Field(None, max_length=100)


class UserCreditCardUpdate(BaseModel):
    credit_limit: Optional[float] = Field(None, gt=0)
    outstanding: Optional[float] = Field(None, ge=0)
    billing_date: Optional[int] = Field(None, ge=1, le=31)
    due_date: Optional[date_type] = None
    nickname: Optional[str] = Field(None, max_length=100)


class UserCreditCardResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    catalog_id: uuid.UUID
    credit_limit: float
    outstanding: float
    billing_date: int
    due_date: date_type
    nickname: Optional[str] = None
    created_at: datetime
    catalog: Optional[CreditCardCatalogResponse] = None

    class Config:
        from_attributes = True
        json_encoders = {
            date_type: lambda d: d.isoformat()
        }


class CreditCardSummaryResponse(BaseModel):
    total_limit: float
    total_outstanding: float
    available_credit: float
    overall_utilization: float
    expected_rewards: float


class CreditCardInsight(BaseModel):
    type: str  # e.g., 'warning', 'info', 'success'
    message: str
    card_id: Optional[uuid.UUID] = None
