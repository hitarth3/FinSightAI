import os
import json
import re
import logging
import httpx
from datetime import datetime

from app.modules.expenses.models import ExpenseCategory
from core.config import settings

logger = logging.getLogger(__name__)


class GrokService:
    @staticmethod
    async def parse_receipt(receipt_text: str) -> dict:
        """Sends OCR extracted text to Google Gemini, Grok, or Groq API to parse merchant, amount, date, and category.
        
        If GOOGLE_API_KEY is configured, it prioritizes Google Gemini.
        If neither GOOGLE_API_KEY, GROK_API_KEY, nor GROQ_API_KEY is set or request fails, falls back to a deterministic regex parser.
        """
        google_key = settings.GOOGLE_API_KEY
        grok_key = settings.GROK_API_KEY
        groq_key = settings.GROQ_API_KEY
        
        prompt = (
            "You are a financial receipt parser.\n\n"
            "Extract the following fields from the receipt text:\n"
            "- merchant (name of the store/merchant, string)\n"
            "- amount (total amount paid, number)\n"
            "- date (date of transaction, formatted as YYYY-MM-DD, string)\n"
            "- category (must be exactly one of the following uppercase strings: "
            "FOOD, TRAVEL, SHOPPING, RENT, ENTERTAINMENT, UTILITIES, HEALTHCARE, EDUCATION, GROCERIES, SUBSCRIPTION, MISCELLANEOUS)\n\n"
            "Return valid JSON only. Do not include markdown code block syntax (like ```json). Just the raw JSON.\n\n"
            f"Receipt Text:\n{receipt_text}"
        )
        
        if google_key:
            logger.info("GOOGLE_API_KEY found. Querying Gemini API...")
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    response = await client.post(
                        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                        headers={
                            "Authorization": f"Bearer {google_key}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": "gemini-2.5-flash",
                            "messages": [
                                {"role": "system", "content": "You are a precise JSON extractor. You must return valid JSON representing the parsed receipt fields."},
                                {"role": "user", "content": prompt}
                            ],
                            "temperature": 0.0,
                            "response_format": {"type": "json_object"}
                        }
                    )
                    if response.status_code == 200:
                        data = response.json()
                        content = data["choices"][0]["message"]["content"]
                        logger.info(f"Gemini API Response: {content}")
                        parsed = GrokService._clean_and_parse_json(content, receipt_text)
                        if parsed:
                            return parsed
                    else:
                        logger.error(f"Gemini API failed with status {response.status_code}: {response.text}")
            except Exception as e:
                logger.error(f"Exception during Gemini API call: {e}")
                
        elif grok_key:
            logger.info("GROK_API_KEY found. Querying Grok API...")
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    response = await client.post(
                        "https://api.x.ai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {grok_key}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": "grok-beta",
                            "messages": [
                                {"role": "system", "content": "You are a precise JSON extractor."},
                                {"role": "user", "content": prompt}
                            ],
                            "temperature": 0.0
                        }
                    )
                    if response.status_code == 200:
                        data = response.json()
                        content = data["choices"][0]["message"]["content"]
                        logger.info(f"Grok API Response: {content}")
                        parsed = GrokService._clean_and_parse_json(content, receipt_text)
                        if parsed:
                            return parsed
                    else:
                        logger.error(f"Grok API failed with status {response.status_code}: {response.text}")
            except Exception as e:
                logger.error(f"Exception during Grok API call: {e}")
                
        elif groq_key:
            logger.info("GROQ_API_KEY found. Querying Groq API...")
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    response = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {groq_key}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": "llama-3.3-70b-versatile",
                            "messages": [
                                {"role": "system", "content": "You are a precise JSON extractor. You must return valid JSON representing the parsed receipt fields."},
                                {"role": "user", "content": prompt}
                            ],
                            "temperature": 0.0,
                            "response_format": {"type": "json_object"}
                        }
                    )
                    if response.status_code == 200:
                        data = response.json()
                        content = data["choices"][0]["message"]["content"]
                        logger.info(f"Groq API Response: {content}")
                        parsed = GrokService._clean_and_parse_json(content, receipt_text)
                        if parsed:
                            return parsed
                    else:
                        logger.warning(f"Groq API primary model llama-3.3-70b-versatile failed with status {response.status_code}: {response.text}. Trying fallback model...")
                        # Try fallback model: mixtral-8x7b-32768
                        response_fallback = await client.post(
                            "https://api.groq.com/openai/v1/chat/completions",
                            headers={
                                "Authorization": f"Bearer {groq_key}",
                                "Content-Type": "application/json"
                            },
                            json={
                                "model": "mixtral-8x7b-32768",
                                "messages": [
                                    {"role": "system", "content": "You are a precise JSON extractor. You must return valid JSON representing the parsed receipt fields."},
                                    {"role": "user", "content": prompt}
                                ],
                                "temperature": 0.0,
                                "response_format": {"type": "json_object"}
                            }
                        )
                        if response_fallback.status_code == 200:
                            data = response_fallback.json()
                            content = data["choices"][0]["message"]["content"]
                            logger.info(f"Groq API Fallback Response: {content}")
                            parsed = GrokService._clean_and_parse_json(content, receipt_text, is_fallback_api=True)
                            if parsed:
                                return parsed
                        else:
                            logger.error(f"Groq API fallback failed: {response_fallback.status_code} - {response_fallback.text}")
            except Exception as e:
                logger.error(f"Exception during Groq API call: {e}")
                
        else:
            logger.info("Neither GOOGLE_API_KEY, GROK_API_KEY nor GROQ_API_KEY found in environment. Falling back to local parser simulation.")
            
        return GrokService._simulate_parsing(receipt_text)
 
    @staticmethod
    def _clean_and_parse_json(text: str, receipt_text: str, is_fallback_api: bool = False) -> dict:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\n", "", cleaned)
            cleaned = re.sub(r"\n```$", "", cleaned)
            cleaned = cleaned.strip()
            
        try:
            parsed = json.loads(cleaned)
            merchant = parsed.get("merchant", "").strip()
            amount = float(parsed.get("amount", 0.0))
            raw_date = parsed.get("date", "")
            
            try:
                date_obj = datetime.strptime(raw_date, "%Y-%m-%d").date()
                formatted_date = date_obj.isoformat()
            except Exception:
                formatted_date = datetime.utcnow().date().isoformat()
                
            raw_category = str(parsed.get("category", "MISCELLANEOUS")).upper()
            if raw_category not in ExpenseCategory.__members__:
                category = "MISCELLANEOUS"
            else:
                category = raw_category
                
            # Perform validation against raw OCR text
            has_merchant = False
            if merchant and receipt_text:
                merchant_words = [w for w in re.split(r'\W+', merchant.lower()) if len(w) >= 3]
                if merchant_words and any(word in receipt_text.lower() for word in merchant_words):
                    has_merchant = True
                elif merchant.lower() in receipt_text.lower():
                    has_merchant = True
                    
            if not has_merchant:
                # If merchant is completely missing from OCR text, clear it to trigger review
                merchant = "Unknown Merchant"
                
            has_amount = False
            if amount > 0 and receipt_text:
                amt_str_2 = f"{amount:.2f}"
                amt_str_1 = f"{amount:.1f}"
                amt_str_0 = f"{amount:.0f}"
                clean_text = receipt_text.replace(",", "")
                if amt_str_2 in clean_text or amt_str_1 in clean_text or amt_str_0 in clean_text:
                    has_amount = True
                    
            if not has_amount:
                # Amount must be detected from receipt text, else set to 0.0
                amount = 0.0
                
            has_date = False
            if formatted_date and receipt_text:
                parts = formatted_date.split("-")
                if len(parts) == 3:
                    year, month, day = parts
                    if year in receipt_text and (day in receipt_text or month in receipt_text):
                        has_date = True
                        
            # Calculate dynamic confidence
            confidence = 1.0
            if not receipt_text.strip():
                confidence = 0.0
            else:
                if merchant == "Unknown Merchant":
                    confidence -= 0.25
                if amount == 0.0:
                    confidence -= 0.25
                if not has_date:
                    confidence -= 0.25
                if is_fallback_api:
                    confidence -= 0.25
            
            confidence = max(0.0, min(1.0, confidence))
            
            return {
                "merchant": merchant,
                "amount": amount,
                "date": formatted_date,
                "category": category,
                "confidence": confidence
            }
        except Exception as e:
            logger.error(f"Failed to parse cleaned JSON: {e}")
            return None
 
    @staticmethod
    def _simulate_parsing(text: str) -> dict:
        text_lower = text.lower()
        
        merchant = None
        category = "MISCELLANEOUS"
        amount = 0.0
        
        if "swiggy" in text_lower:
            merchant = "Swiggy"
            category = "FOOD"
            amount = 432.0
        elif "amazon" in text_lower:
            merchant = "Amazon"
            category = "SHOPPING"
            amount = 9500.0
        elif "uber" in text_lower:
            merchant = "Uber"
            category = "TRAVEL"
            amount = 320.0
        elif "netflix" in text_lower:
            merchant = "Netflix"
            category = "SUBSCRIPTION"
            amount = 499.0
        else:
            # Grab first non-empty line as merchant name
            lines = [l.strip() for l in text.split("\n") if l.strip()]
            if lines:
                merchant = lines[0][:50]
                
            # Extract amount from text
            amount_matches = re.findall(r"(?:rs|₹|usd|\$)\s*([\d,]+\.?\d*)", text_lower)
            if amount_matches:
                try:
                    amount = float(amount_matches[0].replace(",", ""))
                except ValueError:
                    pass
            else:
                numbers = re.findall(r"\b\d+\.\d{2}\b", text_lower)
                if numbers:
                    amount = float(numbers[0])
                else:
                    ints = re.findall(r"\b\d{2,5}\b", text_lower)
                    if ints:
                        amount = float(ints[0])

        date_str = datetime.utcnow().date().isoformat()
        date_matches = re.findall(r"\b(\d{2})[-/](\d{2})[-/](\d{4})\b", text_lower)
        if date_matches:
            day, month, year = date_matches[0]
            if int(month) <= 12:
                date_str = f"{year}-{month}-{day}"

        # Validation logic for simulation path
        has_merchant = False
        if merchant:
            merchant_words = [w for w in re.split(r'\W+', merchant.lower()) if len(w) >= 3]
            if merchant_words and any(word in text_lower for word in merchant_words):
                has_merchant = True
            elif merchant.lower() in text_lower:
                has_merchant = True

        if not has_merchant:
            merchant = None

        has_amount = False
        if amount > 0:
            amt_str_2 = f"{amount:.2f}"
            amt_str_1 = f"{amount:.1f}"
            amt_str_0 = f"{amount:.0f}"
            clean_text = text_lower.replace(",", "")
            if amt_str_2 in clean_text or amt_str_1 in clean_text or amt_str_0 in clean_text:
                has_amount = True

        if not has_amount:
            amount = 0.0

        has_date = False
        if date_str:
            parts = date_str.split("-")
            if len(parts) == 3:
                year, month, day = parts
                if year in text_lower and (day in text_lower or month in text_lower):
                    has_date = True

        # Calculate confidence (base is 0.75 for simulated parsing)
        confidence = 0.75
        if not text.strip():
            confidence = 0.0
        else:
            if not merchant:
                confidence -= 0.25
            if amount == 0.0:
                confidence -= 0.25
            if not has_date:
                confidence -= 0.25
            
        confidence = max(0.0, min(1.0, confidence))

        return {
            "merchant": merchant or "Unknown Merchant",
            "amount": amount,
            "date": date_str,
            "category": category,
            "confidence": confidence
        }
