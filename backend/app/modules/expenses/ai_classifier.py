import logging
from typing import List, Literal, Optional
from pydantic import BaseModel, Field
from core.config import settings
from app.modules.expenses.models import ExpenseCategory, TransactionNature
import re

logger = logging.getLogger(__name__)

class TransactionClassification(BaseModel):
    raw_description: str = Field(description="The exact raw transaction description provided in input")
    merchant: str = Field(description="Clean merchant name in uppercase (e.g. ZOMATO, NETFLIX, UBER, AMAZON, SALARY, etc.)")
    nature: Literal["EXPENSE", "INCOME", "TRANSFER", "INVESTMENT", "LOAN", "OTHER"] = Field(description="The nature of the transaction")
    category: str = Field(description="Category of the transaction. For EXPENSE, use one of: FOOD, TRAVEL, SHOPPING, RENT, ENTERTAINMENT, UTILITIES, HEALTHCARE, EDUCATION, GROCERIES, SUBSCRIPTION, MISCELLANEOUS. For INCOME, use one of: SALARY, BONUS, INTEREST, FREELANCE, REFUND, BANK_TRANSFER, INVESTMENT_RETURN. For others, default to MISCELLANEOUS or BANK_TRANSFER.")
    confidence: float = Field(description="Confidence score between 0.0 and 100.0")

class TransactionClassificationList(BaseModel):
    classifications: List[TransactionClassification]

class AIClassifier:
    @staticmethod
    def get_llm():
        """Returns the configured LangChain ChatModel based on AI_PROVIDER."""
        # Prioritize google/gemini if GOOGLE_API_KEY is available in env (per user request)
        if settings.GOOGLE_API_KEY:
            provider = "gemini"
        else:
            provider = (settings.AI_PROVIDER or "groq").lower()
        
        # Check API key configuration and fallback if necessary
        if provider == "groq" and not settings.GROQ_API_KEY:
            if settings.GOOGLE_API_KEY:
                provider = "gemini"
            elif settings.OPENAI_API_KEY:
                provider = "openai"
            elif settings.GROK_API_KEY:
                provider = "grok"
        elif provider == "openai" and not settings.OPENAI_API_KEY:
            if settings.GOOGLE_API_KEY:
                provider = "gemini"
            elif settings.GROQ_API_KEY:
                provider = "groq"
            elif settings.GROK_API_KEY:
                provider = "grok"
        elif provider == "grok" and not settings.GROK_API_KEY:
            if settings.GOOGLE_API_KEY:
                provider = "gemini"
            elif settings.GROQ_API_KEY:
                provider = "groq"
            elif settings.OPENAI_API_KEY:
                provider = "openai"
        elif provider in ["google", "gemini"] and not settings.GOOGLE_API_KEY:
            if settings.GROQ_API_KEY:
                provider = "groq"
            elif settings.OPENAI_API_KEY:
                provider = "openai"
            elif settings.GROK_API_KEY:
                provider = "grok"

        try:
            if provider in ["google", "gemini"] and settings.GOOGLE_API_KEY:
                from langchain_openai import ChatOpenAI
                logger.info("Initializing ChatOpenAI for Gemini (gemini-2.5-flash)...")
                return ChatOpenAI(
                    temperature=0.0,
                    api_key=settings.GOOGLE_API_KEY,
                    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                    model_name="gemini-2.5-flash"
                )
            elif provider == "groq" and settings.GROQ_API_KEY:
                from langchain_groq import ChatGroq
                logger.info("Initializing ChatGroq (llama-3.3-70b-versatile)...")
                return ChatGroq(
                    temperature=0.0,
                    groq_api_key=settings.GROQ_API_KEY,
                    model_name="llama-3.3-70b-versatile"
                )
            elif provider == "openai" and settings.OPENAI_API_KEY:
                from langchain_openai import ChatOpenAI
                logger.info("Initializing ChatOpenAI (gpt-4o-mini)...")
                return ChatOpenAI(
                    temperature=0.0,
                    api_key=settings.OPENAI_API_KEY,
                    model_name="gpt-4o-mini"
                )
            elif provider == "grok" and settings.GROK_API_KEY:
                from langchain_openai import ChatOpenAI
                logger.info("Initializing ChatOpenAI for Grok (grok-beta)...")
                return ChatOpenAI(
                    temperature=0.0,
                    api_key=settings.GROK_API_KEY,
                    base_url="https://api.x.ai/v1",
                    model_name="grok-beta"
                )
        except Exception as e:
            logger.error(f"Failed to initialize LLM provider {provider}: {e}")
            
        logger.warning("No LLM API keys found or model initialization failed. Will use rule-based fallback.")
        return None

    @classmethod
    async def classify_batch(cls, descriptions: List[str], transaction_types: List[str] = None) -> List[TransactionClassification]:
        """Classifies a batch of transaction descriptions using LangChain structured output in chunks of 15."""
        if not descriptions:
            return []

        llm = cls.get_llm()
        if not llm:
            logger.info("LLM is not configured or failed to load. Using rule-based classification.")
            types_list = transaction_types or ["DEBIT"] * len(descriptions)
            return [cls.classify_local_fallback(d, t) for d, t in zip(descriptions, types_list)]

        chunk_size = 15
        results = []
        
        for i in range(0, len(descriptions), chunk_size):
            chunk_descs = descriptions[i:i + chunk_size]
            chunk_types = transaction_types[i:i + chunk_size] if transaction_types else None
            
            try:
                structured_llm = llm.with_structured_output(TransactionClassificationList)
                
                # If transaction_types is provided, pair each description with its type for the AI
                if chunk_types:
                    formatted_list = [
                        f"Description: '{desc}' | Type: {tx_type}"
                        for desc, tx_type in zip(chunk_descs, chunk_types)
                    ]
                else:
                    formatted_list = [f"Description: '{desc}'" for desc in chunk_descs]

                prompt = (
                    "You are an expert personal finance transactions categorization assistant.\n"
                    "Your task is to classify the list of raw bank statement transaction descriptions.\n\n"
                    "For each description, determine:\n"
                    "1. Clean merchant name in UPPERCASE (e.g., ZOMATO, NETFLIX, UBER, SBI ATM, HDFC DEPOSIT, salary source, etc.)\n"
                    "2. Nature of the transaction (EXPENSE, INCOME, TRANSFER, INVESTMENT, LOAN, or OTHER):\n"
                    "   - EXPENSE: Regular spending (food, travel, bills, groceries, etc.)\n"
                    "   - INCOME: Inward salary, bonus, interest, refunds, freelance payments\n"
                    "   - TRANSFER: Internal transfers, credit card payment, shifting funds to another account/self-transfer\n"
                    "   - INVESTMENT: Mutual funds, stocks, Zerodha, SIPs, gold buys\n"
                    "   - LOAN: Loan EMI payments, loan disbursements received\n"
                    "   - OTHER: Cash withdrawals, unidentified items\n"
                    "3. Category: \n"
                    "   - If Nature is EXPENSE, pick EXACTLY one of: FOOD, TRAVEL, SHOPPING, RENT, ENTERTAINMENT, UTILITIES, HEALTHCARE, EDUCATION, GROCERIES, SUBSCRIPTION, MISCELLANEOUS\n"
                    "   - If Nature is INCOME, pick EXACTLY one of: SALARY, BONUS, INTEREST, FREELANCE, REFUND, BANK_TRANSFER, INVESTMENT_RETURN\n"
                    "   - For TRANSFER, INVESTMENT, LOAN, OTHER, you can use MISCELLANEOUS or BANK_TRANSFER or any category that makes the most sense.\n"
                    "4. A confidence score from 0.0 to 100.0.\n\n"
                    "IMPORTANT: The 'raw_description' field in the returned JSON object for each classification MUST match the exact original description without the 'Type: ...' info.\n"
                    "Please return classifications for ALL input descriptions in the exact order requested.\n"
                    f"Transactions to classify:\n" + "\n".join(f"{idx+1}. {item}" for idx, item in enumerate(formatted_list))
                )
                
                logger.info(f"Sending chunk of {len(chunk_descs)} transactions (offset {i}) to LangChain structured LLM...")
                chunk_result = await structured_llm.ainvoke(prompt)
                
                # Match results back
                classifications = chunk_result.classifications
                for idx, desc in enumerate(chunk_descs):
                    tx_type = chunk_types[idx] if chunk_types else "DEBIT"
                    if idx < len(classifications):
                        results.append(classifications[idx])
                    else:
                        results.append(cls.classify_local_fallback(desc, tx_type))
                        
            except Exception as e:
                logger.error(f"Error during LangChain batch classification of chunk offset {i}: {e}", exc_info=True)
                types_list = chunk_types or ["DEBIT"] * len(chunk_descs)
                results.extend([cls.classify_local_fallback(d, t) for d, t in zip(chunk_descs, types_list)])
                
        return results

    @classmethod
    def classify_local_fallback(cls, desc: str, tx_type: str = "DEBIT") -> TransactionClassification:
        """Rule-based local classifier fallback for a single transaction description."""
        desc_lower = desc.lower()
        
        # Clean merchant pattern
        clean_merchant = re.sub(r'^(upi|pos|imps|neft|rtgs|ach|eaw)[\-\/]', '', desc_lower).strip()
        parts = [w for w in re.split(r'[^a-zA-Z0-9\s]+', clean_merchant) if w]
        if parts:
            non_numeric = [p for p in parts if not p.isdigit()]
            clean_merchant = non_numeric[0].strip().upper() if non_numeric else parts[0].strip().upper()
        else:
            clean_merchant = "UNKNOWN"

        # Determine nature
        nature = "INCOME" if tx_type == "CREDIT" else "EXPENSE"
        category = "BANK_TRANSFER" if tx_type == "CREDIT" else "MISCELLANEOUS"
        confidence = 50.0

        # High priority Nature detection keywords
        salary_keywords = ["salary", "salary/", "npat", "payroll", "wipro", "tcs", "infosys", "inft/"]
        investment_keywords = [
            "zerodha", "groww", "upstox", "angel one", "kite", "icici direct", 
            "motilal oswal", "sharekhan", "mutual fund", "sip", "securities", 
            "demat", "bse", "nse"
        ]
        transfer_keywords = ["self", "transfer", "cc payment", "credit card", "to a/c", "from a/c", "own account", "paytm wallet"]
        loan_keywords = ["emi", "loan", "lending", "loan account", "finance emi", "bajaj finserv"]
        income_keywords = ["interest", "dividend", "cashback", "refund", "credit", "received from", "inward imps"]

        # Check nature and categories
        if any(kw in desc_lower for kw in salary_keywords):
            nature = "INCOME"
            category = "SALARY"
            confidence = 85.0
        elif "rent received" in desc_lower or "received rent" in desc_lower:
            nature = "INCOME"
            category = "RENT"
            confidence = 85.0
        elif any(kw in desc_lower for kw in investment_keywords):
            nature = "INVESTMENT"
            category = "INVESTMENT_RETURN"
            confidence = 80.0
        elif any(kw in desc_lower for kw in transfer_keywords):
            nature = "TRANSFER"
            category = "BANK_TRANSFER"
            confidence = 80.0
        elif any(kw in desc_lower for kw in loan_keywords):
            nature = "LOAN"
            category = "MISCELLANEOUS"
            confidence = 80.0
        elif any(kw in desc_lower for kw in income_keywords):
            nature = "INCOME"
            category = "INTEREST" if "interest" in desc_lower else "REFUND" if "refund" in desc_lower else "BANK_TRANSFER"
            confidence = 75.0
        else:
            # Regular expense rule matching
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
                    category = cat
                    confidence = 80.0
                    break

        return TransactionClassification(
            raw_description=desc,
            merchant=clean_merchant,
            nature=nature,
            category=category,
            confidence=confidence
        )
