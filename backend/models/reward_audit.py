import uuid
from datetime import date, datetime
from sqlalchemy import Date, DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from database.session import Base


class RewardRuleAudit(Base):
    """Audit trail for reward rule, fee, and benefit changes across card catalog versions."""
    __tablename__ = "reward_rule_audit"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    card_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("credit_card_catalog.id", ondelete="CASCADE"), nullable=False, index=True)
    old_reward_structure: Mapped[dict] = mapped_column(JSON, nullable=True)
    new_reward_structure: Mapped[dict] = mapped_column(JSON, nullable=True)
    change_summary: Mapped[str] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(100), nullable=True, default="admin")
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
