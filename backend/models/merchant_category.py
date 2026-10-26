import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column
from database.session import Base


class MerchantCategory(Base):
    """Maps merchant names to spend categories for automatic classification."""
    __tablename__ = "merchant_category"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    merchant_name: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    normalized_name: Mapped[str] = mapped_column(String(150), nullable=True, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    subcategory: Mapped[str] = mapped_column(String(50), nullable=True)
    reward_eligible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    channel_type: Mapped[str] = mapped_column(String(20), nullable=True, default="both")  # online/offline/both
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
