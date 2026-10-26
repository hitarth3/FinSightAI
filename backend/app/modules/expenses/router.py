import os
import logging
import uuid
from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, delete

from database.session import get_db
from schemas.base import StandardResponse
from core.dependencies import get_current_user
from models.user import User

from app.modules.expenses.models import (
    StatementImport,
    StatementTransaction,
    MerchantCategoryMapping,
    Expense,
    ExpenseCategory,
    ExpenseUpload
)
from app.modules.expenses.schemas import (
    ExpenseManualCreate,
    ExpenseUploadConfirm,
    ExpenseUpdate,
    ExpenseResponse,
    UploadResponse,
    InsightResponse,
    TopMerchantResponse,
    AnalyticsSummaryResponse,
    StatementImportResponse,
    StatementTransactionResponse,
    StatementTransactionUpdate,
    StatementConfirmPayload,
    BulkReclassifyPayload,
    BulkSelectPayload
)
from app.modules.expenses.service import ExpenseService
from app.modules.expenses.analytics import ExpenseAnalyticsService
from app.modules.expenses.repository import ExpenseRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/expenses", tags=["Expenses"])


@router.get("", response_model=StandardResponse[List[ExpenseResponse]])
async def get_expenses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Retrieves all expenses belonging to the authenticated user."""
    service = ExpenseService(db)
    expenses = await service.get_user_expenses(current_user.id)
    return StandardResponse(
        success=True,
        message="Expenses retrieved successfully.",
        data=[ExpenseResponse.model_validate(exp) for exp in expenses]
    )


@router.post("/manual", response_model=StandardResponse[ExpenseResponse], status_code=status.HTTP_201_CREATED)
async def create_manual_expense(
    payload: ExpenseManualCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Creates a new expense manually."""
    service = ExpenseService(db)
    expense = await service.create_manual_expense(current_user.id, payload.model_dump())
    return StandardResponse(
        success=True,
        message="Manual expense created successfully.",
        data=ExpenseResponse.model_validate(expense)
    )


@router.post("/upload", response_model=StandardResponse[UploadResponse])
async def upload_receipt(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Uploads a receipt PDF/image, runs OCR & Grok AI, and returns the parsed result.
    
    Does NOT save the expense record yet.
    """
    service = ExpenseService(db)
    result = await service.process_receipt_upload(current_user.id, file)
    return StandardResponse(
        success=True,
        message="Receipt scanned and parsed successfully.",
        data=UploadResponse.model_validate(result)
    )


@router.post("/confirm", response_model=StandardResponse[ExpenseResponse], status_code=status.HTTP_201_CREATED)
async def confirm_expense(
    payload: ExpenseUploadConfirm,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Confirms the receipt details and saves the expense to the database."""
    service = ExpenseService(db)
    expense = await service.confirm_receipt_upload(current_user.id, payload.model_dump())
    return StandardResponse(
        success=True,
        message="Receipt expense confirmed and saved.",
        data=ExpenseResponse.model_validate(expense)
    )


@router.put("/{id}", response_model=StandardResponse[ExpenseResponse])
async def update_expense(
    id: uuid.UUID,
    payload: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Modifies an existing expense record."""
    service = ExpenseService(db)
    expense = await service.update_expense(id, current_user.id, payload.model_dump(exclude_unset=True))
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense record not found.")
    return StandardResponse(
        success=True,
        message="Expense record updated successfully.",
        data=ExpenseResponse.model_validate(expense)
    )


@router.delete("/{id}", response_model=StandardResponse[None])
async def delete_expense(
    id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Deletes an expense record."""
    service = ExpenseService(db)
    deleted = await service.delete_expense(id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense record not found.")
    return StandardResponse(
        success=True,
        message="Expense record deleted successfully."
    )


# --- Analytics Routing ---

@router.get("/analytics/summary", response_model=StandardResponse[AnalyticsSummaryResponse])
async def get_analytics_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Retrieves current month, previous month, and yearly summaries."""
    service = ExpenseAnalyticsService(db)
    summary = await service.get_summary(current_user.id)
    return StandardResponse(
        success=True,
        message="Analytics summary retrieved successfully.",
        data=AnalyticsSummaryResponse.model_validate(summary)
    )


@router.get("/analytics/category-breakdown", response_model=StandardResponse[dict])
async def get_category_breakdown(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Gets total spending per expense category."""
    service = ExpenseAnalyticsService(db)
    breakdown = await service.get_category_breakdown(current_user.id)
    return StandardResponse(
        success=True,
        message="Category breakdown retrieved successfully.",
        data=breakdown
    )


@router.get("/analytics/monthly-trend", response_model=StandardResponse[List[dict]])
async def get_monthly_trend(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Gets a rolling 12-month expense trend."""
    service = ExpenseAnalyticsService(db)
    trend = await service.get_monthly_trend(current_user.id)
    return StandardResponse(
        success=True,
        message="Monthly trend retrieved successfully.",
        data=trend
    )


@router.get("/analytics/top-merchants", response_model=StandardResponse[List[TopMerchantResponse]])
async def get_top_merchants(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Gets a list of top merchants based on spending."""
    repo = ExpenseRepository(db)
    top = await repo.get_top_merchants(current_user.id)
    return StandardResponse(
        success=True,
        message="Top merchants retrieved successfully.",
        data=[TopMerchantResponse.model_validate(item) for item in top]
    )


@router.get("/analytics/insights", response_model=StandardResponse[List[InsightResponse]])
async def get_insights(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Gets expense alerts and trend observations."""
    service = ExpenseAnalyticsService(db)
    insights = await service.get_insights(current_user.id)
    return StandardResponse(
        success=True,
        message="Insights retrieved successfully.",
        data=[InsightResponse.model_validate(item) for item in insights]
    )


@router.post("/statement/upload", response_model=StandardResponse[StatementImportResponse])
async def upload_statement(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    from app.modules.expenses.uploads import read_validated_upload
    content, file_ext = await read_validated_upload(file)

    unique_id = uuid.uuid4()
    unique_filename = f"statement_{unique_id}{file_ext}"
    
    from app.modules.expenses.service import UPLOAD_DIR
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    import anyio
    async with await anyio.open_file(file_path, "wb") as f:
        await f.write(content)
    
    file_url = f"/api/expenses/uploads/{unique_filename}"

    # Extract text to detect bank synchronously in worker thread
    from app.modules.expenses.statement_service import StatementService
    from app.modules.expenses.bank_parser import BankDetector
    
    text = ""
    try:
        text = await anyio.to_thread.run_sync(StatementService.extract_text_from_file, file_path, file.content_type)
    except Exception as e:
        logger.error(f"Error extracting text during statement upload: {e}")
        
    bank_name, detection_confidence = BankDetector.detect_bank_with_confidence(text)

    # Create StatementImport record
    stmt_import = StatementImport(
        id=unique_id,
        user_id=current_user.id,
        file_name=file.filename,
        file_url=file_url,
        bank_name=bank_name,
        detected_bank_confidence=detection_confidence,
        status="UPLOADED",
        investment_transactions=0,
        transfer_transactions=0,
        total_investments=0.0
    )
    db.add(stmt_import)
    await db.commit()

    return StandardResponse(
        success=True,
        message="Statement uploaded and bank detected. Please confirm the bank to start processing.",
        data=StatementImportResponse.model_validate(stmt_import)
    )


@router.get("/statement/{import_id}/status", response_model=StandardResponse[dict])
async def get_statement_status(
    import_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    res = await db.execute(select(StatementImport).where(
        and_(StatementImport.id == import_id, StatementImport.user_id == current_user.id)
    ))
    stmt_import = res.scalars().first()
    if not stmt_import:
        raise HTTPException(status_code=404, detail="Statement import not found.")
    
    return StandardResponse(
        success=True,
        message="Status retrieved successfully.",
        data={"status": stmt_import.status}
    )


@router.get("/statement/{import_id}/summary", response_model=StandardResponse[StatementImportResponse])
async def get_statement_summary(
    import_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    res = await db.execute(select(StatementImport).where(
        and_(StatementImport.id == import_id, StatementImport.user_id == current_user.id)
    ))
    stmt_import = res.scalars().first()
    if not stmt_import:
        raise HTTPException(status_code=404, detail="Statement import not found.")
    
    return StandardResponse(
        success=True,
        message="Statement summary retrieved successfully.",
        data=StatementImportResponse.model_validate(stmt_import)
    )


@router.get("/statement/{import_id}/transactions", response_model=StandardResponse[List[StatementTransactionResponse]])
async def get_statement_transactions(
    import_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    # First verify the statement import belongs to the user
    res_import = await db.execute(select(StatementImport).where(
        and_(StatementImport.id == import_id, StatementImport.user_id == current_user.id)
    ))
    stmt_import = res_import.scalars().first()
    if not stmt_import:
        raise HTTPException(status_code=404, detail="Statement import not found.")
    
    # Fetch transactions
    res_txs = await db.execute(
        select(StatementTransaction)
        .where(StatementTransaction.import_id == import_id)
        .order_by(StatementTransaction.date.desc())
    )
    txs = res_txs.scalars().all()
    
    return StandardResponse(
        success=True,
        message="Transactions retrieved successfully.",
        data=[StatementTransactionResponse.model_validate(tx) for tx in txs]
    )


@router.put("/statement/{import_id}/transactions/{tx_id}", response_model=StandardResponse[StatementTransactionResponse])
async def update_statement_transaction(
    import_id: uuid.UUID,
    tx_id: uuid.UUID,
    payload: StatementTransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    # Verify ownership
    res_import = await db.execute(select(StatementImport).where(
        and_(StatementImport.id == import_id, StatementImport.user_id == current_user.id)
    ))
    stmt_import = res_import.scalars().first()
    if not stmt_import:
        raise HTTPException(status_code=404, detail="Statement import not found.")
    
    res_tx = await db.execute(select(StatementTransaction).where(
        and_(StatementTransaction.id == tx_id, StatementTransaction.import_id == import_id)
    ))
    tx = res_tx.scalars().first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    
    # Update fields
    update_data = payload.model_dump(exclude_unset=True)
    if "nature" in update_data:
        tx.nature_source = "MANUAL"
    if "category" in update_data:
        tx.category_source = "MANUAL"
        
    for key, val in update_data.items():
        setattr(tx, key, val)
        
    await db.flush()
    await db.commit()
    return StandardResponse(
        success=True,
        message="Transaction updated successfully.",
        data=StatementTransactionResponse.model_validate(tx)
    )


@router.delete("/statement/{import_id}/transactions/{tx_id}", response_model=StandardResponse[None])
async def delete_statement_transaction(
    import_id: uuid.UUID,
    tx_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    # Verify ownership
    res_import = await db.execute(select(StatementImport).where(
        and_(StatementImport.id == import_id, StatementImport.user_id == current_user.id)
    ))
    if not res_import.scalars().first():
        raise HTTPException(status_code=404, detail="Statement import not found.")
    
    res_tx = await db.execute(select(StatementTransaction).where(
        and_(StatementTransaction.id == tx_id, StatementTransaction.import_id == import_id)
    ))
    tx = res_tx.scalars().first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    
    await db.delete(tx)
    await db.flush()
    return StandardResponse(
        success=True,
        message="Transaction deleted from import review."
    )


@router.post("/statement/{import_id}/transactions/bulk-select", response_model=StandardResponse[None])
async def bulk_select_transactions(
    import_id: uuid.UUID,
    payload: BulkSelectPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    # Verify ownership
    res_import = await db.execute(select(StatementImport).where(
        and_(StatementImport.id == import_id, StatementImport.user_id == current_user.id)
    ))
    stmt_import = res_import.scalars().first()
    if not stmt_import:
        raise HTTPException(status_code=404, detail="Statement import not found.")
    
    if payload.transaction_ids:
        from sqlalchemy import update
        await db.execute(
            update(StatementTransaction)
            .where(
                and_(
                    StatementTransaction.import_id == import_id,
                    StatementTransaction.id.in_(payload.transaction_ids)
                )
            )
            .values(is_selected=payload.is_selected)
        )
        await db.commit()
        
    return StandardResponse(
        success=True,
        message=f"Successfully updated selection for {len(payload.transaction_ids)} transactions."
    )


from pydantic import BaseModel

class OverrideBankPayload(BaseModel):
    bank_name: str


@router.post("/statement/{import_id}/override-bank", response_model=StandardResponse[dict])
async def override_bank(
    import_id: uuid.UUID,
    payload: OverrideBankPayload,
    background_tasks: BackgroundTasks,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    # Verify ownership
    res_import = await db.execute(select(StatementImport).where(
        and_(StatementImport.id == import_id, StatementImport.user_id == current_user.id)
    ))
    stmt_import = res_import.scalars().first()
    if not stmt_import:
        raise HTTPException(status_code=404, detail="Statement import not found.")

    # 1. Update status & bank fields
    stmt_import.bank_name = payload.bank_name
    stmt_import.detected_bank_confidence = 100.0  # Confirmed/overridden
    stmt_import.status = "PROCESSING"
    
    # 2. Delete existing transactions for this import in case this is a re-run
    await db.execute(delete(StatementTransaction).where(StatementTransaction.import_id == import_id))
    await db.commit()

    # 3. Find file path
    from app.modules.expenses.service import UPLOAD_DIR
    file_ext = os.path.splitext(stmt_import.file_name)[1]
    unique_filename = f"statement_{import_id}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    content_type = "application/pdf" if file_ext.lower() == ".pdf" else "image/jpeg"

    # 4. Trigger background parsing
    from app.modules.expenses.statement_service import StatementService
    background_tasks.add_task(
        StatementService.process_statement_background,
        request.app.state.db_session_factory,
        import_id,
        file_path,
        content_type,
        current_user.id,
        payload.bank_name
    )

    return StandardResponse(
        success=True,
        message=f"Processing started with bank {payload.bank_name}.",
        data={"import_id": import_id, "bank_name": payload.bank_name, "status": "PROCESSING"}
    )


@router.post("/statement/{import_id}/confirm", response_model=StandardResponse[dict])
async def confirm_statement_import(
    import_id: uuid.UUID,
    payload: StatementConfirmPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    # Verify ownership
    res_import = await db.execute(select(StatementImport).where(
        and_(StatementImport.id == import_id, StatementImport.user_id == current_user.id)
    ))
    stmt_import = res_import.scalars().first()
    if not stmt_import:
        raise HTTPException(status_code=404, detail="Statement import not found.")
    
    if stmt_import.status == "IMPORTED":
        raise HTTPException(status_code=400, detail="This statement has already been imported.")

    # Fetch selected transactions (all natures)
    res_txs = await db.execute(select(StatementTransaction).where(
        and_(
            StatementTransaction.import_id == import_id,
            StatementTransaction.is_selected == True
        )
    ))
    txs = res_txs.scalars().all()
    
    session_mappings = {}
    imported_count = 0
    for tx in txs:
        # Save to expenses table
        expense = Expense(
            user_id=current_user.id,
            amount=tx.amount,
            merchant=tx.merchant[:100],
            category=tx.category,
            payment_method=payload.payment_method,
            expense_date=tx.date,
            source_type="PDF_UPLOAD" if stmt_import.file_name.lower().endswith(".pdf") else "IMAGE_UPLOAD",
            receipt_url=stmt_import.file_url,
            notes=f"Imported from {stmt_import.file_name} [Batch ID: {stmt_import.id}]: {tx.raw_description}"[:500],
            ai_confidence=tx.confidence_score / 100.0,
            nature=tx.nature
        )
        db.add(expense)
        
        # If category was updated by AI or manually, add or update the pattern mapping
        if tx.category_source in ["AI_CLASSIFICATION", "MANUAL"]:
            pattern = tx.merchant.lower()
            if pattern in session_mappings:
                mapping = session_mappings[pattern]
                mapping.category = tx.category
                mapping.nature = tx.nature
                mapping.confidence = 100.0
            else:
                res_mapping = await db.execute(select(MerchantCategoryMapping).where(
                    MerchantCategoryMapping.merchant_pattern == pattern
                ))
                mapping = res_mapping.scalars().first()
                if mapping:
                    mapping.category = tx.category
                    mapping.nature = tx.nature
                    mapping.confidence = 100.0
                else:
                    mapping = MerchantCategoryMapping(
                        merchant_pattern=pattern,
                        category=tx.category,
                        nature=tx.nature,
                        confidence=100.0
                    )
                    db.add(mapping)
                session_mappings[pattern] = mapping
                
        imported_count += 1

    # Update import status
    stmt_import.status = "IMPORTED"
    await db.commit()

    return StandardResponse(
        success=True,
        message=f"Successfully imported {imported_count} transactions.",
        data={"imported_count": imported_count}
    )


@router.post("/reclassify", response_model=StandardResponse[dict])
async def bulk_reclassify(
    payload: BulkReclassifyPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    res_txs = await db.execute(
        select(StatementTransaction)
        .join(StatementImport)
        .where(
            and_(
                StatementTransaction.id.in_(payload.transaction_ids),
                StatementImport.user_id == current_user.id
            )
        )
    )
    txs = res_txs.scalars().all()
    
    updated_count = 0
    for tx in txs:
        if payload.category is not None:
            tx.category = payload.category
            tx.category_source = "MANUAL"
        if payload.nature is not None:
            tx.nature = payload.nature
            tx.nature_source = "MANUAL"
        updated_count += 1
        
    await db.flush()
    await db.commit()
    return StandardResponse(
        success=True,
        message=f"Successfully reclassified {updated_count} transactions.",
        data={"updated_count": updated_count}
    )


@router.get("/uploads/{file_path:path}")
async def get_uploaded_file(
    file_path: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.modules.expenses.service import UPLOAD_DIR
    from fastapi.responses import FileResponse

    if ".." in file_path or file_path.startswith("/") or file_path.startswith("\\"):
        raise HTTPException(status_code=400, detail="Invalid file path.")

    # Ownership check: the file must be referenced by a record belonging to the
    # requesting user (Expense receipt/thumbnail, ExpenseUpload, or StatementImport).
    # Without this, any authenticated user could read any other user's financial
    # documents by guessing/enumerating the UUID-based filename.
    expected_url = f"/api/expenses/uploads/{file_path}"
    owns_file = await db.execute(
        select(Expense.id).where(
            and_(
                Expense.user_id == current_user.id,
                (Expense.receipt_url == expected_url) | (Expense.thumbnail_url == expected_url)
            )
        )
    )
    if not owns_file.scalars().first():
        owns_file = await db.execute(
            select(ExpenseUpload.id).where(
                and_(ExpenseUpload.user_id == current_user.id, ExpenseUpload.file_url == expected_url)
            )
        )
    if not owns_file.scalars().first():
        owns_file = await db.execute(
            select(StatementImport.id).where(
                and_(StatementImport.user_id == current_user.id, StatementImport.file_url == expected_url)
            )
        )
    if not owns_file.scalars().first():
        raise HTTPException(status_code=404, detail="File not found.")

    full_path = os.path.join(UPLOAD_DIR, file_path)
    if not os.path.exists(full_path) or not os.path.isfile(full_path):
        raise HTTPException(status_code=404, detail="File not found.")

    return FileResponse(full_path)
