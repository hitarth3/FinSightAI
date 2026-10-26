import uuid
from datetime import date as date_type
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

from app.modules.expenses.models import ExpenseCategory, PaymentMethod


class ExpenseManualCreate(BaseModel):
    amount: float = Field(..., gt=0, allow_inf_nan=False)
    merchant: str = Field(..., min_length=1, max_length=100)
    category: ExpenseCategory
    payment_method: PaymentMethod
    expense_date: date_type
    notes: Optional[str] = Field(None, max_length=500)


class ExpenseUploadConfirm(BaseModel):
    upload_id: uuid.UUID
    amount: float = Field(..., gt=0, allow_inf_nan=False)
    merchant: str = Field(..., min_length=1, max_length=100)
    category: ExpenseCategory
    payment_method: PaymentMethod
    expense_date: date_type
    notes: Optional[str] = Field(None, max_length=500)


class ExpenseUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0, allow_inf_nan=False)
    merchant: Optional[str] = Field(None, max_length=100)
    category: Optional[ExpenseCategory] = None
    payment_method: Optional[PaymentMethod] = None
    expense_date: Optional[date_type] = None
    notes: Optional[str] = Field(None, max_length=500)


class ExpenseResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    amount: float
    merchant: str
    category: ExpenseCategory
    payment_method: PaymentMethod
    expense_date: date_type
    source_type: str
    receipt_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    notes: Optional[str] = None
    ai_confidence: float
    nature: str = "EXPENSE"
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            date_type: lambda d: d.isoformat()
        }


class UploadResponse(BaseModel):
    upload_id: uuid.UUID
    merchant: str
    amount: float
    date: date_type
    category: ExpenseCategory
    confidence: float
    receipt_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    needs_confirmation: bool = True
    needs_manual_review: bool = False

    class Config:
        from_attributes = True


class InsightResponse(BaseModel):
    type: str
    message: str

    class Config:
        from_attributes = True


class TopMerchantResponse(BaseModel):
    merchant: str
    amount: float
    count: int

    class Config:
        from_attributes = True


class MonthSummary(BaseModel):
    total_amount: float
    expense_count: int
    change_percentage: Optional[float] = None
    total_income: float = 0.0
    net_cashflow: float = 0.0
    savings_rate: float = 0.0
    total_investments: float = 0.0


class YearSummary(BaseModel):
    total_amount: float
    expense_count: int
    total_income: float = 0.0
    net_cashflow: float = 0.0


class AnalyticsSummaryResponse(BaseModel):
    this_month: MonthSummary
    prev_month: YearSummary
    this_year: YearSummary


class StatementImportResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    file_name: str
    file_url: str
    bank_name: str
    detected_bank_confidence: Optional[float] = None
    status: str
    total_transactions: int
    expense_transactions: int
    income_transactions: int
    investment_transactions: int = 0
    transfer_transactions: int = 0
    total_expenses: float
    total_income: float
    total_investments: float = 0.0
    processing_time: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StatementTransactionResponse(BaseModel):
    id: uuid.UUID
    import_id: uuid.UUID
    raw_description: str
    transaction_type: str
    merchant: str
    amount: float
    date: date_type
    category: ExpenseCategory
    nature: str
    nature_source: str
    category_source: str
    confidence_score: float
    is_duplicate: bool
    is_selected: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            date_type: lambda d: d.isoformat()
        }


class StatementTransactionUpdate(BaseModel):
    merchant: Optional[str] = None
    amount: Optional[float] = Field(None, gt=0, allow_inf_nan=False)
    date: Optional[date_type] = None
    category: Optional[ExpenseCategory] = None
    nature: Optional[str] = None
    is_selected: Optional[bool] = None


class StatementConfirmPayload(BaseModel):
    payment_method: PaymentMethod


class BulkReclassifyPayload(BaseModel):
    transaction_ids: List[uuid.UUID]
    category: Optional[ExpenseCategory] = None
    nature: Optional[str] = None


class BulkSelectPayload(BaseModel):
    transaction_ids: List[uuid.UUID]
    is_selected: bool
