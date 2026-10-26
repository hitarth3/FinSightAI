import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class LoanCreate(BaseModel):
    lender: str = Field(..., max_length=100)
    principal: float = Field(..., gt=0)
    interest_rate: float = Field(..., gt=0)
    emi: float = Field(..., gt=0)
    remaining_balance: float = Field(..., ge=0)


class LoanUpdate(BaseModel):
    lender: Optional[str] = Field(None, max_length=100)
    principal: Optional[float] = Field(None, gt=0)
    interest_rate: Optional[float] = Field(None, gt=0)
    emi: Optional[float] = Field(None, gt=0)
    remaining_balance: Optional[float] = Field(None, ge=0)


class LoanResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    lender: str
    principal: float
    interest_rate: float
    emi: float
    remaining_balance: float
    created_at: datetime

    class Config:
        from_attributes = True
