import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class StockAnalysisCreate(BaseModel):
    symbol: str = Field(..., max_length=20)
    strength_score: int = Field(..., ge=0, le=100)
    recommendation: str = Field(..., max_length=50)
    trend: str = Field(..., max_length=50)
    confidence: int = Field(..., ge=0, le=100)
    risk_level: str = Field(..., max_length=50)
    sentiment: str = Field(..., max_length=50)
    support_levels: List[float]
    resistance_levels: List[float]
    summary: str
    analysis_generated_at: datetime


class StockAnalysisResponse(BaseModel):
    id: uuid.UUID
    symbol: str
    strength_score: int
    recommendation: str
    trend: str
    confidence: int
    risk_level: str
    sentiment: str
    support_levels: List[float]
    resistance_levels: List[float]
    summary: str
    analysis_generated_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True
