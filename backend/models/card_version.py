import uuid
from datetime import date, datetime
from sqlalchemy import Date, DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from database.session import Base


class CreditCardVersion(Base):
    """Tracks historical reward structure and fee changes for credit cards."""
    __tablename__ = "credit_card_versions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    card_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("credit_card_catalog.id", ondelete="CASCADE"), nullable=False, index=True)
    version: Mapped[int] = mapped_column(nullable=False, default=1)
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    reward_json: Mapped[dict] = mapped_column(JSON, nullable=True)
    annual_fee: Mapped[float] = mapped_column(nullable=True)
    joining_fee: Mapped[float] = mapped_column(nullable=True)
    source: Mapped[str] = mapped_column(String(100), nullable=True, default="seed")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
