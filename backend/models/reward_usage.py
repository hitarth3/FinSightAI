import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from database.session import Base


class UserRewardUsage(Base):
    """Tracks per-card, per-month reward cap usage for each user."""
    __tablename__ = "user_reward_usage"
    __table_args__ = (
        UniqueConstraint("user_id", "card_id", "month", name="uq_reward_usage_user_card_month"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    card_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user_credit_cards.id", ondelete="CASCADE"), nullable=False, index=True)
    month: Mapped[str] = mapped_column(String(7), nullable=False)  # Format: YYYY-MM
    reward_earned: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    reward_cap_used: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
