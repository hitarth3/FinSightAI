import os
import re
import json
import logging
import time
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
import httpx

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func

from app.modules.expenses.models import (
    StatementImport, 
    StatementTransaction, 
    MerchantCategoryMapping, 
    ExpenseCategory,
    Expense
)
from app.modules.expenses.bank_parser import BankDetector
from app.modules.expenses.ocr_service import OCRService
from app.modules.expenses.ai_classifier import AIClassifier
from core.config import settings

logger = logging.getLogger(__name__)

try:
    import pdfplumber
except ImportError:
    pdfplumber = None

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

try:
    import pytesseract
except ImportError:
    pytesseract = None

DEFAULT_MAPPINGS = [
    ("zomato", "FOOD", 100.0),
    ("swiggy", "FOOD", 100.0),
    ("starbucks", "FOOD", 100.0),
    ("mcdonald", "FOOD", 100.0),
    ("domino", "FOOD", 100.0),
    ("uber", "TRAVEL", 100.0),
    ("ola", "TRAVEL", 100.0),
    ("irctc", "TRAVEL", 100.0),
    ("amazon", "SHOPPING", 100.0),
    ("flipkart", "SHOPPING", 100.0),
    ("myntra", "SHOPPING", 100.0),
    ("netflix", "SUBSCRIPTION", 100.0),
    ("spotify", "SUBSCRIPTION", 100.0),
    ("jio", "UTILITIES", 100.0),
    ("airtel", "UTILITIES", 100.0),
    ("bescom", "UTILITIES", 100.0),
    ("apollo", "HEALTHCARE", 100.0),
    ("pharmeasy", "HEALTHCARE", 100.0),
    ("udemy", "EDUCATION", 100.0),
    ("blinkit", "GROCERIES", 100.0),
    ("zepto", "GROCERIES", 100.0),
    ("bigbasket", "GROCERIES", 100.0),
]

class StatementService:
    @staticmethod
    async def seed_merchant_mappings(db: AsyncSession):
        """Seeds common merchants if table is empty."""
        try:
            res = await db.execute(select(func.count()).select_from(MerchantCategoryMapping))
            count = res.scalar()
            if count == 0:
                logger.info("Seeding default merchant category mappings...")
                for pattern, cat, conf in DEFAULT_MAPPINGS:
                    mapping = MerchantCategoryMapping(
                        merchant_pattern=pattern,
                        category=ExpenseCategory[cat],
                        confidence=conf
                    )
                    db.add(mapping)
                await db.commit()
                logger.info("Merchant mappings seeded successfully.")
        except Exception as e:
            await db.rollback()
            logger.error(f"Error seeding merchant mappings: {e}")

    @staticmethod
    def extract_text_from_file(file_path: str, content_type: str) -> str:
        """Extracts text using pdfplumber -> PyMuPDF -> OCR priority."""
        is_pdf = content_type == "application/pdf" or file_path.lower().endswith(".pdf")
        
        if not is_pdf:
            logger.info("File is image. Extracting text via OCR...")
            return OCRService._extract_text_sync(file_path, content_type)

        text = ""
        
        # Priority 1: pdfplumber
        if pdfplumber:
            try:
                logger.info(f"Attempting extraction with pdfplumber on {file_path}")
                with pdfplumber.open(file_path) as pdf:
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n"
                
                if len(text.strip()) > 10:
                    logger.info("Text successfully extracted using pdfplumber.")
                    return text
            except Exception as e:
                logger.error(f"pdfplumber extraction failed: {e}")

        # Priority 2: PyMuPDF (fitz)
        if fitz:
            try:
                logger.info(f"Attempting extraction with PyMuPDF on {file_path}")
                text = ""
                doc = fitz.open(file_path)
                for page in doc:
                    page_text = page.get_text()
                    if page_text:
                        text += page_text + "\n"
                doc.close()

                if len(text.strip()) > 10:
                    logger.info("Text successfully extracted using PyMuPDF.")
                    return text
            except Exception as e:
                logger.error(f"PyMuPDF extraction failed: {e}")

        # Priority 3: OCR Fallback
        if fitz and pytesseract:
            try:
                logger.info(f"Attempting OCR fallback on PDF pages for {file_path}")
                text = ""
                doc = fitz.open(file_path)
                for i, page in enumerate(doc):
                    pix = page.get_pixmap(dpi=150)
                    img_data = pix.tobytes("png")
                    
                    from io import BytesIO
                    from PIL import Image
                    img = Image.open(BytesIO(img_data))
                    page_text = pytesseract.image_to_string(img)
                    if page_text:
                        text += page_text + "\n"
                doc.close()
                
                if len(text.strip()) > 10:
                    logger.info("Text successfully extracted using OCR fallback on PDF.")
                    return text
            except Exception as e:
                logger.error(f"OCR fallback on PDF failed: {e}")

        # Fallback to original OCRService if all else failed
        logger.info("All custom PDF extractors failed. Trying default OCR service.")
        return OCRService._extract_text_sync(file_path, content_type)

    @staticmethod
    async def classify_transactions_ai(raw_descriptions: List[str]) -> List[Dict[str, Any]]:
        """Classifies a list of raw transaction descriptions in batch using Google Gemini, Grok, or Groq AI."""
        if not raw_descriptions:
            return []

        google_key = settings.GOOGLE_API_KEY
        groq_key = settings.GROQ_API_KEY
        grok_key = settings.GROK_API_KEY
        
        prompt = (
            "You are a transaction categorization assistant.\n\n"
            "For each raw transaction description in the list below, extract the clean merchant name (e.g. 'Zomato', 'Netflix', 'Uber') and classify it into exactly one of these categories: "
            "FOOD, TRAVEL, SHOPPING, RENT, ENTERTAINMENT, UTILITIES, HEALTHCARE, EDUCATION, GROCERIES, SUBSCRIPTION, MISCELLANEOUS.\n\n"
            "Also assign a confidence score from 0.0 to 100.0 (float) for your classification.\n\n"
            "Return a JSON object containing a 'transactions' list, where each item has:\n"
            "- raw_description: (the exact raw description string from input)\n"
            "- merchant: (clean merchant name, string)\n"
            "- category: (uppercase category string)\n"
            "- confidence: (float between 0.0 and 100.0)\n\n"
            "Return valid JSON only. Do not include markdown code blocks. Just the raw JSON.\n\n"
            f"List of raw descriptions:\n{json.dumps(raw_descriptions)}"
        )

        headers = {"Content-Type": "application/json"}
        api_url = ""
        payload = {}

        if google_key:
            api_url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
            headers["Authorization"] = f"Bearer {google_key}"
            payload = {
                "model": "gemini-2.5-flash",
                "messages": [
                    {"role": "system", "content": "You are a precise JSON extractor. You must return valid JSON representing the classifications."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.0,
                "response_format": {"type": "json_object"}
            }
        elif grok_key:
            api_url = "https://api.x.ai/v1/chat/completions"
            headers["Authorization"] = f"Bearer {grok_key}"
            payload = {
                "model": "grok-beta",
                "messages": [
                    {"role": "system", "content": "You are a precise JSON extractor."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.0
            }
        elif groq_key:
            api_url = "https://api.groq.com/openai/v1/chat/completions"
            headers["Authorization"] = f"Bearer {groq_key}"
            payload = {
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": "You are a precise JSON extractor. You must return valid JSON representing the classifications."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.0,
                "response_format": {"type": "json_object"}
            }

        if api_url:
            try:
                logger.info(f"Querying AI classifier for {len(raw_descriptions)} transactions...")
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(api_url, headers=headers, json=payload)
                    if response.status_code == 200:
                        data = response.json()
                        content = data["choices"][0]["message"]["content"].strip()
                        if content.startswith("```"):
                            content = re.sub(r"^```(?:json)?\n", "", content)
                            content = re.sub(r"\n```$", "", content)
                            content = content.strip()
                        
                        parsed = json.loads(content)
                        return parsed.get("transactions", [])
                    else:
                        logger.error(f"AI classification failed with status {response.status_code}: {response.text}")
            except Exception as e:
                logger.error(f"Exception during AI classification: {e}")

        # Fallback to local rule-based classification if AI is not available or failed
        logger.info("Falling back to local rule-based transaction classification.")
        return StatementService.classify_transactions_local(raw_descriptions)

    @staticmethod
    def classify_transaction_rules(description: str, tx_type: str) -> tuple:
        """
        Layer 1 & Layer 2 of layered classification.
        Returns: (merchant_name, category, nature, confidence, source)
        confidence is high (>= 90) if matches rule, else 50.0
        """
        desc_lower = description.lower()
        
        # Clean prefix
        clean_merchant = re.sub(r'^(upi|pos|imps|neft|rtgs|ach|eaw)[\-\/]', '', desc_lower).strip()
        parts = [w for w in re.split(r'[^a-zA-Z0-9\s]+', clean_merchant) if w]
        if parts:
            non_numeric = [p for p in parts if not p.isdigit()]
            if non_numeric:
                clean_merchant = non_numeric[0].strip().upper()
            else:
                clean_merchant = parts[0].strip().upper()
        else:
            clean_merchant = "UNKNOWN"

        # Layer 1: Debit/Credit Detection (initial fallback)
        if tx_type == "CREDIT":
            nature = "INCOME"
            category = "BANK_TRANSFER"
            confidence = 50.0
            source = "DEBIT_CREDIT_DETECTION"
        else:
            nature = "EXPENSE"
            category = "MISCELLANEOUS"
            confidence = 50.0
            source = "DEBIT_CREDIT_DETECTION"

        # Layer 2: Merchant Intelligence (Rule-based classification)
        
        # Salary Rules
        salary_kws = ["salary", "payroll", "company credit", "employee payment", "wipro", "tcs", "infosys"]
        if any(kw in desc_lower for kw in salary_kws):
            return clean_merchant, "SALARY", "INCOME", 95.0, "RULE_ENGINE"

        # Rent Received Rules
        rent_received_kws = ["rent received", "received rent"]
        if any(kw in desc_lower for kw in rent_received_kws) or ("rent" in desc_lower and tx_type == "CREDIT"):
            return clean_merchant, "RENT", "INCOME", 95.0, "RULE_ENGINE"

        # Investment Income Rules
        investment_kws = [
            "zerodha", "upstox", "groww", "angel one", "kite", "icici direct", 
            "motilal oswal", "sharekhan", "mutual fund", "sip", "securities", 
            "dividend", "capital gain", "mutual fund redemption", "demat", "bse", "nse"
        ]
        if any(kw in desc_lower for kw in investment_kws):
            target_nature = "INCOME" if tx_type == "CREDIT" else "INVESTMENT"
            return clean_merchant, "INVESTMENT_RETURN", target_nature, 95.0, "RULE_ENGINE"

        # Interest Income Rules
        interest_kws = ["interest credit", "savings interest", "fd interest"]
        if any(kw in desc_lower for kw in interest_kws):
            return clean_merchant, "INTEREST", "INCOME", 95.0, "RULE_ENGINE"

        # Refund Rules
        refund_kws = ["refund", "reversal", "cashback", "reimbursement"]
        if any(kw in desc_lower for kw in refund_kws):
            return clean_merchant, "REFUND", "INCOME", 95.0, "RULE_ENGINE"

        # Transfers Rules
        transfer_kws = ["self transfer", "account transfer", "fund transfer", "own account", "to a/c", "from a/c"]
        if any(kw in desc_lower for kw in transfer_kws):
            return clean_merchant, "BANK_TRANSFER", "TRANSFER", 95.0, "RULE_ENGINE"

        # Loan Related Rules
        loan_kws = ["emi", "loan payment", "bajaj", "hdfc loan", "home loan", "lending"]
        if any(kw in desc_lower for kw in loan_kws):
            return clean_merchant, "MISCELLANEOUS", "LOAN", 95.0, "RULE_ENGINE"

        # Credit Card Payments Rules
        cc_kws = ["card payment", "credit card bill", "cc payment", "credit card"]
        if any(kw in desc_lower for kw in cc_kws):
            return clean_merchant, "BANK_TRANSFER", "TRANSFER", 95.0, "RULE_ENGINE"

        # Expense category rules matching
        rules = {
            "FOOD": ["zomato", "swiggy", "food", "restaurant", "cafe", "starbucks", "mcdonald", "domino", "pizza", "burger", "eatfit", "bakery"],
            "TRAVEL": ["uber", "ola", "cab", "travel", "irctc", "train", "flight", "indigo", "makemytrip", "auto", "metro", "petrol", "fuel", "shell", "hpcl", "bpcl"],
            "SHOPPING": ["amazon", "flipkart", "shopping", "myntra", "zara", "hm", "retail", "mall", "decathlon", "lifestyle"],
            "RENT": ["rent", "landlord", "housing", "society", "maintenance"],
            "ENTERTAINMENT": ["netflix", "spotify", "prime video", "youtube", "disney", "hotstar", "movie", "cinema", "pvr", "bookmyshow", "gaming", "playstation"],
            "UTILITIES": ["electricity", "water", "gas", "bescom", "power", "recharge", "jio", "airtel", "vi", "telecom", "wifi", "broadband", "bill"],
            "HEALTHCARE": ["hospital", "pharmacy", "medical", "doctor", "health", "apollo", "pharmeasy", "clinic", "dentist", "lab"],
            "EDUCATION": ["school", "college", "university", "course", "udemy", "coursera", "fees", "tuition", "bookstore", "stationery"],
            "GROCERIES": ["groceries", "grocer", "supermarket", "mart", "blinkit", "zepto", "instamart", "bigbasket", "milk", "vegetables"],
            "SUBSCRIPTION": ["adobe", "microsoft", "gsuite", "aws", "github", "canva", "subscription", "cloud"]
        }
        
        for cat, keywords in rules.items():
            if any(kw in desc_lower for kw in keywords):
                return clean_merchant, cat, "EXPENSE", 90.0, "RULE_ENGINE"

        return clean_merchant, category, nature, confidence, source

    @staticmethod
    def classify_transactions_local(raw_descriptions: List[str]) -> List[Dict[str, Any]]:
        results = []
        for desc in raw_descriptions:
            clean_merchant, category, confidence = StatementService.local_classify_single(desc)
            results.append({
                "raw_description": desc,
                "merchant": clean_merchant,
                "category": category,
                "confidence": confidence
            })
        return results

    @staticmethod
    def local_classify_single(desc: str) -> tuple:
        # Default to DEBIT for local fallback desc-only queries
        merchant_name, category, nature, confidence, source = StatementService.classify_transaction_rules(desc, "DEBIT")
        return merchant_name, category, confidence

    @staticmethod
    async def detect_duplicates(db: AsyncSession, user_id: Any, date_val: date, amount: float, merchant: str, tx_type: str) -> bool:
        """Checks if a similar transaction exists in the database to detect potential duplicates."""
        start_date = date_val - timedelta(days=2)
        end_date = date_val + timedelta(days=2)
        
        res = await db.execute(
            select(Expense).where(
                and_(
                    Expense.user_id == user_id,
                    Expense.amount == amount,
                    Expense.expense_date.between(start_date, end_date)
                )
            )
        )
        similar_expenses = res.scalars().all()
        for exp in similar_expenses:
            # Exact duplicate match
            if exp.expense_date == date_val and exp.merchant.lower() == merchant.lower():
                return True
            # Potential duplicate match
            if abs((exp.expense_date - date_val).days) <= 2 and (merchant.lower() in exp.merchant.lower() or exp.merchant.lower() in merchant.lower()):
                return True
        return False

    @staticmethod
    async def process_statement_background(db_session_factory: Any, import_id: Any, file_path: str, content_type: str, user_id: Any, bank_name: Optional[str] = None):
        """Task run in background. Extracts, detects, parses, categorizes, detects duplicates, and compiles metadata."""
        start_time = time.time()
        async with db_session_factory() as db:
            try:
                # 1. Update status to PROCESSING
                res = await db.execute(select(StatementImport).where(StatementImport.id == import_id))
                stmt_import = res.scalars().first()
                if not stmt_import:
                    logger.error(f"Statement import {import_id} not found.")
                    return
                stmt_import.status = "PROCESSING"
                await db.commit()

                # 2. Extract Text
                import anyio
                text = await anyio.to_thread.run_sync(StatementService.extract_text_from_file, file_path, content_type)
                if not text.strip():
                    raise ValueError("No text could be extracted from the statement file.")

                # 3. Detect Bank
                if bank_name is None:
                    detected_bank, detection_confidence = BankDetector.detect_bank_with_confidence(text)
                    stmt_import.bank_name = detected_bank
                    stmt_import.detected_bank_confidence = detection_confidence
                else:
                    stmt_import.bank_name = bank_name
                    stmt_import.detected_bank_confidence = 100.0
                await db.commit()
                
                # Fetch bank name to use
                bank_to_use = stmt_import.bank_name

                # Ensure mappings are seeded
                await StatementService.seed_merchant_mappings(db)

                # 4. Parse transactions using the bank parser
                parser = BankDetector.get_parser(bank_to_use)
                raw_txs = parser.parse(text)

                if not raw_txs:
                    raise ValueError(f"No transactions could be parsed from the statement using the {bank_to_use} parser.")

                # 5. Extract unknown merchant names for batch AI classification
                unknown_txs = []
                mappings_res = await db.execute(select(MerchantCategoryMapping))
                db_mappings = {m.merchant_pattern.lower(): (m.category, m.nature, m.confidence) for m in mappings_res.scalars().all()}

                for tx in raw_txs:
                    desc = tx["raw_description"]
                    found_mapping = False
                    
                    # Check mapping table
                    for pattern, (cat, nature, conf) in db_mappings.items():
                        if pattern in desc.lower():
                            tx["merchant"] = pattern.upper()
                            tx["category"] = cat
                            tx["nature"] = nature
                            tx["nature_source"] = "MERCHANT_MAPPING"
                            tx["confidence_score"] = conf
                            tx["category_source"] = "MERCHANT_MAPPING"
                            found_mapping = True
                            break
                    
                    if not found_mapping:
                        unknown_txs.append(tx)

                # 6. Classify unknown transactions with LangChain AI in batch
                if unknown_txs:
                    raw_descriptions = [tx["raw_description"] for tx in unknown_txs]
                    transaction_types = [tx["transaction_type"] for tx in unknown_txs]
                    ai_classifications = await AIClassifier.classify_batch(raw_descriptions, transaction_types)
                    
                    ai_map = {item.raw_description: item for item in ai_classifications}
                    
                    for tx in unknown_txs:
                        desc = tx["raw_description"]
                        if desc in ai_map:
                            ai_data = ai_map[desc]
                            tx["merchant"] = str(ai_data.merchant).upper()
                            
                            raw_cat = str(ai_data.category).upper()
                            tx["category"] = ExpenseCategory[raw_cat] if raw_cat in ExpenseCategory.__members__ else ExpenseCategory.MISCELLANEOUS
                            
                            tx["nature"] = ai_data.nature
                            tx["nature_source"] = "AI_CLASSIFICATION"
                            tx["confidence_score"] = float(ai_data.confidence)
                            tx["category_source"] = "AI_CLASSIFICATION"
                        else:
                            # Local fallback
                            classification = AIClassifier.classify_local_fallback(desc)
                            tx["merchant"] = classification.merchant
                            tx["category"] = ExpenseCategory[classification.category] if classification.category in ExpenseCategory.__members__ else ExpenseCategory.MISCELLANEOUS
                            tx["nature"] = classification.nature
                            tx["nature_source"] = "AI_CLASSIFICATION"
                            tx["confidence_score"] = classification.confidence
                            tx["category_source"] = "AI_CLASSIFICATION"

                # 7. Check duplicates & Save to DB
                total_txs = len(raw_txs)
                expense_txs = 0
                income_txs = 0
                investment_txs = 0
                transfer_txs = 0
                total_expenses = 0.0
                total_income = 0.0
                total_investments = 0.0

                for tx in raw_txs:
                    tx_nature = tx.get("nature", "EXPENSE")
                    tx_nature_source = tx.get("nature_source", "AI_CLASSIFICATION")
                    
                    # Check for duplicates
                    is_dup = await StatementService.detect_duplicates(
                        db, user_id, tx["date"], tx["amount"], tx["merchant"], tx["transaction_type"]
                    )
                    
                    db_tx = StatementTransaction(
                        import_id=import_id,
                        raw_description=tx["raw_description"],
                        transaction_type=tx["transaction_type"],
                        merchant=tx["merchant"],
                        amount=tx["amount"],
                        date=tx["date"],
                        category=tx["category"],
                        nature=tx_nature,
                        nature_source=tx_nature_source,
                        category_source=tx["category_source"],
                        confidence_score=tx["confidence_score"],
                        is_duplicate=is_dup,
                        is_selected=not is_dup  # Deselect duplicates by default
                    )
                    db.add(db_tx)

                    # Track metrics
                    if tx_nature == "EXPENSE":
                        expense_txs += 1
                        total_expenses += float(tx["amount"])
                    elif tx_nature == "INCOME":
                        income_txs += 1
                        total_income += float(tx["amount"])
                    elif tx_nature == "INVESTMENT":
                        investment_txs += 1
                        total_investments += float(tx["amount"])
                    elif tx_nature == "TRANSFER":
                        transfer_txs += 1

                # 8. Update StatementImport metadata
                res_import = await db.execute(select(StatementImport).where(StatementImport.id == import_id))
                stmt_import = res_import.scalars().first()
                if stmt_import:
                    stmt_import.status = "READY_FOR_REVIEW"
                    stmt_import.total_transactions = total_txs
                    stmt_import.expense_transactions = expense_txs
                    stmt_import.income_transactions = income_txs
                    stmt_import.investment_transactions = investment_txs
                    stmt_import.transfer_transactions = transfer_txs
                    stmt_import.total_expenses = total_expenses
                    stmt_import.total_income = total_income
                    stmt_import.total_investments = total_investments
                    stmt_import.processing_time = float(time.time() - start_time)
                    
                    await db.commit()
                logger.info(f"Finished processing statement import {import_id} in {time.time() - start_time:.2f}s")

            except Exception as e:
                await db.rollback()
                logger.error(f"Error processing bank statement {import_id}: {e}", exc_info=True)
                try:
                    res_import = await db.execute(select(StatementImport).where(StatementImport.id == import_id))
                    stmt_import = res_import.scalars().first()
                    if stmt_import:
                        stmt_import.status = "FAILED"
                        await db.commit()
                except Exception as ex:
                    logger.error(f"Failed to set status to FAILED: {ex}")
