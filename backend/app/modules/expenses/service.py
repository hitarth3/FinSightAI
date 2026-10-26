import os
import uuid
import logging
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime

from app.modules.expenses.models import Expense, ExpenseUpload, ExpenseCategory, PaymentMethod
from app.modules.expenses.repository import ExpenseRepository, ExpenseUploadRepository
from app.modules.expenses.ocr_service import OCRService
from app.modules.expenses.grok_service import GrokService

logger = logging.getLogger(__name__)

# Make sure local uploads directories are created
UPLOAD_DIR = "uploads"
THUMBNAIL_DIR = os.path.join(UPLOAD_DIR, "thumbnails")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(THUMBNAIL_DIR, exist_ok=True)


class ExpenseService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.expense_repo = ExpenseRepository(db)
        self.upload_repo = ExpenseUploadRepository(db)

    async def get_user_expenses(self, user_id: uuid.UUID) -> list:
        return await self.expense_repo.get_by_user(user_id)

    async def create_manual_expense(self, user_id: uuid.UUID, data: dict) -> Expense:
        data["user_id"] = user_id
        data["source_type"] = "MANUAL"
        data["ai_confidence"] = 1.0
        return await self.expense_repo.create(data)

    async def process_receipt_upload(self, user_id: uuid.UUID, file: UploadFile) -> dict:
        from app.modules.expenses.uploads import read_validated_upload
        content, file_ext = await read_validated_upload(file)

        unique_id = uuid.uuid4()
        unique_filename = f"{unique_id}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        import anyio
        async with await anyio.open_file(file_path, "wb") as f:
            await f.write(content)
            
        file_url = f"/api/expenses/uploads/{unique_filename}"
        
        # Generate Thumbnail
        thumbnail_filename = f"{unique_id}_thumb.png"
        thumbnail_path = os.path.join(THUMBNAIL_DIR, thumbnail_filename)
        await OCRService.generate_thumbnail(file_path, thumbnail_path)
        thumbnail_url = f"/api/expenses/uploads/thumbnails/{thumbnail_filename}"
        
        # OCR Text Extraction
        ocr_text = ""
        parse_status = "COMPLETED"
        try:
            ocr_text = await OCRService.extract_text(file_path, file.content_type, original_filename=file.filename)
        except Exception as e:
            logger.error(f"OCR extraction failed: {e}")
            parse_status = "FAILED"
            
        sanitized_ocr = ocr_text.strip()[:20000]
        
        # Grok AI receipt parsing
        ai_response = {}
        if parse_status == "COMPLETED":
            try:
                ai_response = await GrokService.parse_receipt(sanitized_ocr)
            except Exception as e:
                logger.error(f"Grok parsing failed: {e}")
                parse_status = "FAILED"
                
        # Save Upload Record
        upload_data = {
            "id": unique_id,
            "user_id": user_id,
            "file_name": file.filename,
            "file_url": file_url,
            "ocr_text": sanitized_ocr,
            "ai_response": ai_response,
            "status": parse_status
        }
        await self.upload_repo.create(upload_data)
        
        if parse_status == "FAILED":
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Receipt text extraction or Grok AI parsing failed."
            )
            
        confidence = ai_response.get("confidence", 1.0)
        return {
            "upload_id": unique_id,
            "merchant": ai_response.get("merchant", "Unknown Merchant"),
            "amount": ai_response.get("amount", 0.0),
            "date": ai_response.get("date", datetime.utcnow().date().isoformat()),
            "category": ai_response.get("category", "MISCELLANEOUS"),
            "confidence": confidence,
            "receipt_url": file_url,
            "thumbnail_url": thumbnail_url,
            "needs_confirmation": True,
            "needs_manual_review": confidence < 0.75
        }

    async def confirm_receipt_upload(self, user_id: uuid.UUID, confirm_data: dict) -> Expense:
        upload_id = confirm_data["upload_id"]
        upload = await self.upload_repo.get(upload_id)
        
        if not upload or upload.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Receipt upload record not found."
            )
            
        file_ext = os.path.splitext(upload.file_name)[1].lower()
        source_type = "PDF_UPLOAD" if file_ext == ".pdf" else "IMAGE_UPLOAD"
        
        thumbnail_filename = f"{upload.id}_thumb.png"
        thumbnail_url = f"/api/expenses/uploads/thumbnails/{thumbnail_filename}"
        
        expense_data = {
            "user_id": user_id,
            "amount": confirm_data["amount"],
            "merchant": confirm_data["merchant"],
            "category": confirm_data["category"],
            "payment_method": confirm_data["payment_method"],
            "expense_date": confirm_data["expense_date"],
            "source_type": source_type,
            "receipt_url": upload.file_url,
            "thumbnail_url": thumbnail_url,
            "notes": confirm_data.get("notes"),
            "ai_confidence": upload.ai_response.get("confidence", 0.94) if upload.ai_response else 0.94
        }
        
        return await self.expense_repo.create(expense_data)

    async def update_expense(self, id: uuid.UUID, user_id: uuid.UUID, data: dict) -> Optional[Expense]:
        expense = await self.expense_repo.get(id)
        if not expense or expense.user_id != user_id:
            return None
        return await self.expense_repo.update(expense, data)

    async def delete_expense(self, id: uuid.UUID, user_id: uuid.UUID) -> bool:
        expense = await self.expense_repo.get(id)
        if not expense or expense.user_id != user_id:
            return False
        return await self.expense_repo.delete(id)
