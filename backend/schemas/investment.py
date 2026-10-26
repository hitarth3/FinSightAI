import uuid
from datetime import date as date_type
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class InvestmentCreate(BaseModel):
    investment_type: str = Field(..., max_length=50)
    asset_name: str = Field(..., max_length=100)
    amount: float = Field(..., gt=0)
    current_value: float = Field(..., ge=0)
    purchase_date: date_type
    maturity_date: Optional[date_type] = None


class InvestmentUpdate(BaseModel):
    investment_type: Optional[str] = Field(None, max_length=50)
    asset_name: Optional[str] = Field(None, max_length=100)
    amount: Optional[float] = Field(None, gt=0)
    current_value: Optional[float] = Field(None, ge=0)
    purchase_date: Optional[date_type] = None
    maturity_date: Optional[date_type] = None


class InvestmentResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    investment_type: str
    asset_name: str
    amount: float
    current_value: float
    purchase_date: date_type
    maturity_date: Optional[date_type]
    created_at: datetime

    class Config:
        from_attributes = True
