import uuid
from datetime import date as date_type
from datetime import datetime
from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, JSON, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.session import Base


class CreditCardCatalog(Base):
    __tablename__ = "credit_card_catalog"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    bank_name: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    card_name: Mapped[str] = mapped_column(String(100), nullable=False)
    card_type: Mapped[str] = mapped_column(String(50), nullable=True)
    joining_fee: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=True)
    annual_fee: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=True)
    reward_type: Mapped[str] = mapped_column(String(50), nullable=True)
    reward_rules_json: Mapped[dict] = mapped_column(JSON, nullable=True)
    lounge_access: Mapped[str] = mapped_column(String(255), nullable=True)
    fuel_benefits: Mapped[str] = mapped_column(String(255), nullable=True)
    reward_conversion: Mapped[str] = mapped_column(String(255), nullable=True)
    official_url: Mapped[str] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationship back to user cards
    user_cards = relationship("UserCreditCard", back_populates="catalog", cascade="all, delete-orphan")


class UserCreditCard(Base):
    __tablename__ = "user_credit_cards"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    catalog_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("credit_card_catalog.id", ondelete="CASCADE"), nullable=False)
    credit_limit: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    outstanding: Mapped[float] = mapped_column(Numeric(15, 2), default=0.00, nullable=False)
    billing_date: Mapped[int] = mapped_column(Integer, nullable=False)
    due_date: Mapped[date_type] = mapped_column(Date, nullable=False)
    nickname: Mapped[str] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    catalog = relationship("CreditCardCatalog", back_populates="user_cards")
