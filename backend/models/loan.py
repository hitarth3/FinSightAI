import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from database.session import Base


class Loan(Base):
    __tablename__ = "loans"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    lender: Mapped[str] = mapped_column(String(100), nullable=False)
    principal: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    interest_rate: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False) # e.g. 8.25%
    emi: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    remaining_balance: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
