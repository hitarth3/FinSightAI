import uuid
from datetime import date as date_type
from datetime import datetime
from typing import Optional
from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from database.session import Base


class Investment(Base):
    __tablename__ = "investments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    investment_type: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    asset_name: Mapped[str] = mapped_column(String(100), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    current_value: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    purchase_date: Mapped[date_type] = mapped_column(Date, nullable=False)
    maturity_date: Mapped[Optional[date_type]] = mapped_column(Date, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
