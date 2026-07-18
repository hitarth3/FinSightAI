import uuid
from datetime import date as date_type
from datetime import datetime
from pydantic import BaseModel, Field


class StockCreate(BaseModel):
    symbol: str = Field(..., max_length=20)
    company_name: str = Field(..., max_length=100)
    quantity: int = Field(..., gt=0)
    purchase_price: float = Field(..., gt=0)
    purchase_date: date_type


class StockResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    symbol: str
    company_name: str
    quantity: int
    purchase_price: float
    purchase_date: date_type
    created_at: datetime

    class Config:
        from_attributes = True
