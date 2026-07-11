import uuid
import enum
from datetime import date as date_type
from datetime import datetime
from typing import Optional
from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Float, Enum, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from database.session import Base


class ExpenseCategory(str, enum.Enum):
    # Expense categories
    FOOD = "FOOD"
    TRAVEL = "TRAVEL"
    SHOPPING = "SHOPPING"
    RENT = "RENT"
    ENTERTAINMENT = "ENTERTAINMENT"
    UTILITIES = "UTILITIES"
    HEALTHCARE = "HEALTHCARE"
    EDUCATION = "EDUCATION"
    GROCERIES = "GROCERIES"
    SUBSCRIPTION = "SUBSCRIPTION"
    MISCELLANEOUS = "MISCELLANEOUS"
    # Income categories
    SALARY = "SALARY"
    BONUS = "BONUS"
    INTEREST = "INTEREST"
    FREELANCE = "FREELANCE"
    REFUND = "REFUND"
    BANK_TRANSFER = "BANK_TRANSFER"
    INVESTMENT_RETURN = "INVESTMENT_RETURN"


class PaymentMethod(str, enum.Enum):
    UPI = "UPI"
    CASH = "CASH"
    CREDIT_CARD = "CREDIT_CARD"
    DEBIT_CARD = "DEBIT_CARD"
    NET_BANKING = "NET_BANKING"


class TransactionNature(str, enum.Enum):
    """High-level classification of what a transaction represents."""
    EXPENSE = "EXPENSE"
    INCOME = "INCOME"
    TRANSFER = "TRANSFER"
    INVESTMENT = "INVESTMENT"
    LOAN = "LOAN"
    OTHER = "OTHER"


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    merchant: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    category: Mapped[ExpenseCategory] = mapped_column(Enum(ExpenseCategory, name="expense_category"), index=True, nullable=False)
    payment_method: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod, name="payment_method"), nullable=False)
    expense_date: Mapped[date_type] = mapped_column(Date, index=True, nullable=False)
    source_type: Mapped[str] = mapped_column(String(50), default="MANUAL", nullable=False)  # MANUAL, PDF_UPLOAD, IMAGE_UPLOAD, STATEMENT_IMPORT
    receipt_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    ai_confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    # Nature field — defaults EXPENSE for backward compatibility
    nature: Mapped[str] = mapped_column(String(20), default="EXPENSE", index=True, nullable=False)
    user_credit_card_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("user_credit_cards.id", ondelete="SET NULL"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )


class ExpenseUpload(Base):
    __tablename__ = "expense_uploads"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    ocr_text: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    ai_response: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="PROCESSING", nullable=False)  # PROCESSING, COMPLETED, FAILED
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class ExpenseInsight(Base):
    __tablename__ = "expense_insights"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    expense_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("expenses.id", ondelete="SET NULL"), nullable=True)
    insight_type: Mapped[str] = mapped_column(String(50), nullable=False)
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class StatementImport(Base):
    __tablename__ = "statement_imports"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    bank_name: Mapped[str] = mapped_column(String(100), default="Generic", nullable=False)
    detected_bank_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # 0–100%
    status: Mapped[str] = mapped_column(String(50), default="UPLOADED", nullable=False)
    total_transactions: Mapped[int] = mapped_column(default=0, nullable=False)
    expense_transactions: Mapped[int] = mapped_column(default=0, nullable=False)
    income_transactions: Mapped[int] = mapped_column(default=0, nullable=False)
    investment_transactions: Mapped[int] = mapped_column(default=0, nullable=False)
    transfer_transactions: Mapped[int] = mapped_column(default=0, nullable=False)
    total_expenses: Mapped[float] = mapped_column(Numeric(15, 2), default=0.0, nullable=False)
    total_income: Mapped[float] = mapped_column(Numeric(15, 2), default=0.0, nullable=False)
    total_investments: Mapped[float] = mapped_column(Numeric(15, 2), default=0.0, nullable=False)
    processing_time: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )


class StatementTransaction(Base):
    __tablename__ = "statement_transactions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    import_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("statement_imports.id", ondelete="CASCADE"), index=True, nullable=False)
    raw_description: Mapped[str] = mapped_column(String, nullable=False)
    transaction_type: Mapped[str] = mapped_column(String(10), nullable=False)  # DEBIT, CREDIT
    merchant: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    date: Mapped[date_type] = mapped_column(Date, index=True, nullable=False)
    category: Mapped[ExpenseCategory] = mapped_column(Enum(ExpenseCategory, name="expense_category", create_type=False), nullable=False)
    nature: Mapped[str] = mapped_column(String(20), default="EXPENSE", index=True, nullable=False)  # EXPENSE, INCOME, TRANSFER, INVESTMENT, LOAN, OTHER
    nature_source: Mapped[str] = mapped_column(String(50), default="AI_CLASSIFICATION", nullable=False)  # AI_CLASSIFICATION, MERCHANT_MAPPING, MANUAL
    category_source: Mapped[str] = mapped_column(String(50), default="AI_CLASSIFICATION", nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    is_duplicate: Mapped[bool] = mapped_column(default=False, index=True, nullable=False)
    is_selected: Mapped[bool] = mapped_column(default=True, nullable=False)
    user_credit_card_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("user_credit_cards.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )


class MerchantCategoryMapping(Base):
    __tablename__ = "merchant_category_mappings"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    merchant_pattern: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    category: Mapped[ExpenseCategory] = mapped_column(Enum(ExpenseCategory, name="expense_category", create_type=False), nullable=False)
    nature: Mapped[str] = mapped_column(String(20), default="EXPENSE", nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
