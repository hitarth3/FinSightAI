import uuid
from datetime import datetime
from sqlalchemy import DateTime, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from database.session import Base


class StockAnalysis(Base):
    __tablename__ = "stock_analysis"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    symbol: Mapped[str] = mapped_column(String(20), nullable=False)
    strength_score: Mapped[int] = mapped_column(Integer, nullable=False)
    recommendation: Mapped[str] = mapped_column(String(50), nullable=False)
    trend: Mapped[str] = mapped_column(String(50), nullable=False)
    confidence: Mapped[int] = mapped_column(Integer, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(50), nullable=False)
    sentiment: Mapped[str] = mapped_column(String(50), nullable=False)
    support_levels: Mapped[list] = mapped_column(JSON, nullable=False)
    resistance_levels: Mapped[list] = mapped_column(JSON, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    analysis_generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
