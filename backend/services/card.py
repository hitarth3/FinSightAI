import uuid
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from models.card import UserCreditCard, CreditCardCatalog
from models.card_version import CreditCardVersion
from repositories.card import CardRepository, CardCatalogRepository


def get_dynamic_due_date(billing_day: int, due_date_val: date, today: date) -> date:
    """Computes a dynamic due date based on the day of month, rolling to the next month if passed."""
    due_day = due_date_val.day
    try:
        current_due = date(today.year, today.month, due_day)
    except ValueError:
        import calendar
        _, last_day = calendar.monthrange(today.year, today.month)
        current_due = date(today.year, today.month, last_day)
        
    if today > current_due:
        next_month = today.month + 1
        next_year = today.year
        if next_month > 12:
            next_month = 1
            next_year += 1
        try:
            return date(next_year, next_month, due_day)
        except ValueError:
            import calendar
            _, last_day = calendar.monthrange(next_year, next_month)
            return date(next_year, next_month, last_day)
    else:
        return current_due



# ═══════════════════════════════════════════════════════════════════════════
# NORMALIZED REWARD SCHEMA FORMAT:
# {
#   "rules": [
#     {
#       "category": "groceries",
#       "reward_type": "cashback",          # cashback | points | miles
#       "rate": 10,                          # percentage
#       "monthly_cap": 1000,                 # max monthly reward in ₹ (None = no cap)
#       "minimum_transaction": 500,          # min spend per transaction
#       "applicable_channels": ["online", "offline"],  # online | offline | both
#       "partner_merchants": ["DMart", "BigBasket"],    # optional specific merchants
#       "excluded_merchants": []
#     }
#   ],
#   "base_rate": 1.5,                        # default rate for uncategorized spends
#   "reward_point_value": 0.25,              # ₹ value per reward point (cashback = 1.0)
#   "milestone_benefits": "...",             # string description
#   "fuel_waiver_rate": 1.0,                 # fuel surcharge waiver %
#   "fuel_min": 400,                         # min transaction for waiver
#   "fuel_max": 5000,                        # max transaction for waiver
#   "lounge_domestic": 4,                    # complimentary domestic lounge visits
#   "lounge_international": 0,               # complimentary international lounge visits
#   "card_network": "Visa"                   # Visa | MasterCard | Amex | RuPay
# }
# ═══════════════════════════════════════════════════════════════════════════

EXPANDED_CATALOG: List[Dict[str, Any]] = [

    # ───────────────── HDFC BANK ─────────────────
    {
        "bank_name": "HDFC", "card_name": "Millennia",
        "card_type": "Cashback", "joining_fee": 1000.00, "annual_fee": 1000.00,
        "reward_type": "Cashback", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "online_shopping", "reward_type": "cashback", "rate": 5, "monthly_cap": 750, "minimum_transaction": 1, "applicable_channels": ["online"], "partner_merchants": ["Amazon", "Flipkart", "Swiggy", "Zomato", "Uber", "BookMyShow", "Tata CLiQ", "Myntra"], "excluded_merchants": []},
                {"category": "groceries", "reward_type": "cashback", "rate": 5, "monthly_cap": 750, "minimum_transaction": 1, "applicable_channels": ["online"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "dining", "reward_type": "cashback", "rate": 5, "monthly_cap": 750, "minimum_transaction": 1, "applicable_channels": ["online"], "partner_merchants": ["Swiggy", "Zomato"], "excluded_merchants": []},
                {"category": "general", "reward_type": "cashback", "rate": 1, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 1.0, "reward_point_value": 1.0,
            "milestone_benefits": "₹1000 cashback on spending ₹1L in a year",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 4, "lounge_international": 0, "card_network": "Visa"
        },
        "lounge_access": "4 complimentary domestic lounge visits per calendar year",
        "fuel_benefits": "1% fuel surcharge waiver on transactions ₹400–₹5000",
        "reward_conversion": "1 CashPoint = ₹1.00",
        "official_url": "https://www.hdfcbank.com/personal/pay/cards/credit-cards/millennia-credit-card"
    },
    {
        "bank_name": "HDFC", "card_name": "Regalia Gold",
        "card_type": "Premium Rewards", "joining_fee": 2500.00, "annual_fee": 2500.00,
        "reward_type": "Reward Points", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "dining", "reward_type": "points", "rate": 20, "monthly_cap": None, "minimum_transaction": 150, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "online_shopping", "reward_type": "points", "rate": 5, "monthly_cap": None, "minimum_transaction": 150, "applicable_channels": ["online"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 4, "monthly_cap": None, "minimum_transaction": 150, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 4.0, "reward_point_value": 0.50,
            "milestone_benefits": "Vouchers worth ₹1500 on quarterly spends of ₹1.5L",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 12, "lounge_international": 6, "card_network": "Visa"
        },
        "lounge_access": "12 complimentary domestic & 6 international lounge visits per year",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "1 Reward Point = ₹0.50",
        "official_url": "https://www.hdfcbank.com/personal/pay/cards/credit-cards/regalia-gold-credit-card"
    },
    {
        "bank_name": "HDFC", "card_name": "Diners Club Black",
        "card_type": "Super Premium", "joining_fee": 10000.00, "annual_fee": 10000.00,
        "reward_type": "Reward Points", "card_network": "Diners Club",
        "reward_rules_json": {
            "rules": [
                {"category": "online_shopping", "reward_type": "points", "rate": 10, "monthly_cap": None, "minimum_transaction": 150, "applicable_channels": ["online"], "partner_merchants": ["Amazon", "Flipkart", "Swiggy", "Zomato", "Uber", "MakeMyTrip", "IRCTC"], "excluded_merchants": []},
                {"category": "dining", "reward_type": "points", "rate": 10, "monthly_cap": None, "minimum_transaction": 150, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "travel", "reward_type": "points", "rate": 10, "monthly_cap": None, "minimum_transaction": 150, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 5, "monthly_cap": None, "minimum_transaction": 150, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 5.0, "reward_point_value": 1.0,
            "milestone_benefits": "1000 bonus points on monthly spends > ₹80000",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 999, "lounge_international": 999, "card_network": "Diners Club"
        },
        "lounge_access": "Unlimited complimentary domestic & international lounge access",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "1 Reward Point = ₹1.00",
        "official_url": "https://www.hdfcbank.com/personal/pay/cards/credit-cards/diners-club-black"
    },
    {
        "bank_name": "HDFC", "card_name": "Infinia",
        "card_type": "Ultra Premium", "joining_fee": 12500.00, "annual_fee": 12500.00,
        "reward_type": "Reward Points", "card_network": "Visa Infinite",
        "reward_rules_json": {
            "rules": [
                {"category": "dining", "reward_type": "points", "rate": 10, "monthly_cap": None, "minimum_transaction": 150, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "travel", "reward_type": "points", "rate": 10, "monthly_cap": None, "minimum_transaction": 150, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 5, "monthly_cap": None, "minimum_transaction": 150, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 5.0, "reward_point_value": 1.0,
            "milestone_benefits": "12500 bonus points on annual fee payment",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 999, "lounge_international": 999, "card_network": "Visa Infinite"
        },
        "lounge_access": "Unlimited domestic & international lounge access + Club Marriott membership",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "1 Reward Point = ₹1.00",
        "official_url": "https://www.hdfcbank.com/personal/pay/cards/credit-cards/infinia-credit-card"
    },
    {
        "bank_name": "HDFC", "card_name": "MoneyBack+",
        "card_type": "Cashback", "joining_fee": 500.00, "annual_fee": 500.00,
        "reward_type": "Cashback", "card_network": "Mastercard",
        "reward_rules_json": {
            "rules": [
                {"category": "online_shopping", "reward_type": "cashback", "rate": 10, "monthly_cap": 500, "minimum_transaction": 1, "applicable_channels": ["online"], "partner_merchants": ["Amazon", "Flipkart", "PayZapp"], "excluded_merchants": []},
                {"category": "general", "reward_type": "cashback", "rate": 2, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 2.0, "reward_point_value": 1.0,
            "milestone_benefits": "500 CashPoints on EMI transactions",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 0, "lounge_international": 0, "card_network": "Mastercard"
        },
        "lounge_access": "None",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "1 CashPoint = ₹1.00",
        "official_url": "https://www.hdfcbank.com/personal/pay/cards/credit-cards/moneyback-plus-credit-card"
    },
    {
        "bank_name": "HDFC", "card_name": "Swiggy HDFC",
        "card_type": "Co-branded", "joining_fee": 500.00, "annual_fee": 500.00,
        "reward_type": "Cashback", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "dining", "reward_type": "cashback", "rate": 10, "monthly_cap": 1500, "minimum_transaction": 1, "applicable_channels": ["online"], "partner_merchants": ["Swiggy"], "excluded_merchants": []},
                {"category": "online_shopping", "reward_type": "cashback", "rate": 5, "monthly_cap": 1000, "minimum_transaction": 1, "applicable_channels": ["online"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "cashback", "rate": 1, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 1.0, "reward_point_value": 1.0,
            "milestone_benefits": "3 months Swiggy One membership free",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 0, "lounge_international": 0, "card_network": "Visa"
        },
        "lounge_access": "None",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "1 CashPoint = ₹1.00",
        "official_url": "https://www.hdfcbank.com/personal/pay/cards/credit-cards/swiggy-hdfc-bank-credit-card"
    },

    # ───────────────── ICICI BANK ─────────────────
    {
        "bank_name": "ICICI", "card_name": "Amazon Pay",
        "card_type": "Cashback", "joining_fee": 0.00, "annual_fee": 0.00,
        "reward_type": "Cashback", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "online_shopping", "reward_type": "cashback", "rate": 5, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online"], "partner_merchants": ["Amazon"], "excluded_merchants": []},
                {"category": "online_shopping", "reward_type": "cashback", "rate": 3, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online"], "partner_merchants": [], "excluded_merchants": ["Amazon"]},
                {"category": "dining", "reward_type": "cashback", "rate": 2, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "groceries", "reward_type": "cashback", "rate": 2, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "cashback", "rate": 1, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 1.0, "reward_point_value": 1.0,
            "milestone_benefits": "None",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 0, "lounge_international": 0, "card_network": "Visa"
        },
        "lounge_access": "None",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "1 Amazon Pay balance = ₹1.00",
        "official_url": "https://www.icicibank.com/personal-banking/cards/credit-card/amazon-pay-credit-card"
    },
    {
        "bank_name": "ICICI", "card_name": "Sapphiro",
        "card_type": "Premium", "joining_fee": 6500.00, "annual_fee": 3500.00,
        "reward_type": "Reward Points", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "international", "reward_type": "points", "rate": 4, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 2, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 2.0, "reward_point_value": 0.25,
            "milestone_benefits": "Golf round, spa, concierge services",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 16, "lounge_international": 8, "card_network": "Visa"
        },
        "lounge_access": "4 domestic lounge visits per quarter + 2 international per year",
        "fuel_benefits": "1% surcharge waiver on fuel",
        "reward_conversion": "1 Reward Point = ₹0.25",
        "official_url": "https://www.icicibank.com/personal-banking/cards/credit-card/sapphiro-credit-card"
    },
    {
        "bank_name": "ICICI", "card_name": "Coral",
        "card_type": "Entry Level", "joining_fee": 500.00, "annual_fee": 500.00,
        "reward_type": "Reward Points", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "dining", "reward_type": "points", "rate": 5, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 2, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 2.0, "reward_point_value": 0.25,
            "milestone_benefits": "Movie ticket benefits via BookMyShow",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 4000,
            "lounge_domestic": 4, "lounge_international": 0, "card_network": "Visa"
        },
        "lounge_access": "2 domestic lounge visits per quarter",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "1 Reward Point = ₹0.25",
        "official_url": "https://www.icicibank.com/personal-banking/cards/credit-card/coral-credit-card"
    },
    {
        "bank_name": "ICICI", "card_name": "Emeralde",
        "card_type": "Ultra Premium", "joining_fee": 12000.00, "annual_fee": 12000.00,
        "reward_type": "Reward Points", "card_network": "Visa Infinite",
        "reward_rules_json": {
            "rules": [
                {"category": "dining", "reward_type": "points", "rate": 6, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "travel", "reward_type": "points", "rate": 6, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 4, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 4.0, "reward_point_value": 1.0,
            "milestone_benefits": "1 free night stay at ITC hotels on ₹4L annual spend",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 999, "lounge_international": 999, "card_network": "Visa Infinite"
        },
        "lounge_access": "Unlimited domestic & international lounge access",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "1 Reward Point = ₹1.00",
        "official_url": "https://www.icicibank.com/personal-banking/cards/credit-card/emeralde-credit-card"
    },
    {
        "bank_name": "ICICI", "card_name": "Rubyx",
        "card_type": "Premium", "joining_fee": 3000.00, "annual_fee": 2000.00,
        "reward_type": "Reward Points", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "dining", "reward_type": "points", "rate": 4, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 2, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 2.0, "reward_point_value": 0.25,
            "milestone_benefits": "Movie tickets benefits, golf privileges",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 8, "lounge_international": 2, "card_network": "Visa"
        },
        "lounge_access": "2 domestic visits per quarter + 2 international per year",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "1 Reward Point = ₹0.25",
        "official_url": "https://www.icicibank.com/personal-banking/cards/credit-card/rubyx-credit-card"
    },
    {
        "bank_name": "ICICI", "card_name": "MakeMyTrip ICICI",
        "card_type": "Travel", "joining_fee": 1000.00, "annual_fee": 1000.00,
        "reward_type": "MyRewardz Points", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "travel", "reward_type": "points", "rate": 8, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online"], "partner_merchants": ["MakeMyTrip", "goibibo"], "excluded_merchants": []},
                {"category": "dining", "reward_type": "points", "rate": 5, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 3, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 3.0, "reward_point_value": 0.5,
            "milestone_benefits": "Free flight vouchers on ₹3L annual spend",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 6, "lounge_international": 0, "card_network": "Visa"
        },
        "lounge_access": "3 domestic lounge visits per quarter",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "1 MyRewardz = ₹0.50",
        "official_url": "https://www.icicibank.com/personal-banking/cards/credit-card/mmtblack-credit-card"
    },

    # ───────────────── SBI CARDS ─────────────────
    {
        "bank_name": "SBI", "card_name": "Cashback",
        "card_type": "Cashback", "joining_fee": 999.00, "annual_fee": 999.00,
        "reward_type": "Cashback", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "online_shopping", "reward_type": "cashback", "rate": 5, "monthly_cap": 5000, "minimum_transaction": 1, "applicable_channels": ["online"], "partner_merchants": [], "excluded_merchants": ["SBI Merchant EMI", "Rent", "Utilities"]},
                {"category": "general", "reward_type": "cashback", "rate": 1, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 1.0, "reward_point_value": 1.0,
            "milestone_benefits": "None",
            "fuel_waiver_rate": 1.0, "fuel_min": 500, "fuel_max": 3000,
            "lounge_domestic": 4, "lounge_international": 0, "card_network": "Visa"
        },
        "lounge_access": "4 complimentary domestic airport lounge visits per year",
        "fuel_benefits": "1% fuel surcharge waiver up to ₹100 per month",
        "reward_conversion": "Auto-credited to card account",
        "official_url": "https://www.sbicard.com/en/personal/credit-cards/cashback-sbi-card.page"
    },
    {
        "bank_name": "SBI", "card_name": "SimplyCLICK",
        "card_type": "Online Shopping", "joining_fee": 499.00, "annual_fee": 499.00,
        "reward_type": "Reward Points", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "online_shopping", "reward_type": "points", "rate": 10, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online"], "partner_merchants": ["Amazon", "BookMyShow", "Cleartrip", "Lenskart", "Netmeds", "Domino's", "UrbanClap"], "excluded_merchants": []},
                {"category": "online_shopping", "reward_type": "points", "rate": 5, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 1, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 1.0, "reward_point_value": 0.25,
            "milestone_benefits": "e-voucher worth ₹2000 on spending ₹1L annually",
            "fuel_waiver_rate": 1.0, "fuel_min": 500, "fuel_max": 3000,
            "lounge_domestic": 0, "lounge_international": 0, "card_network": "Visa"
        },
        "lounge_access": "None",
        "fuel_benefits": "1% surcharge waiver for transactions ₹500–₹3000",
        "reward_conversion": "4 Reward Points = ₹1.00",
        "official_url": "https://www.sbicard.com/en/personal/credit-cards/simplyclick-sbi-card.page"
    },
    {
        "bank_name": "SBI", "card_name": "Elite",
        "card_type": "Premium", "joining_fee": 4999.00, "annual_fee": 4999.00,
        "reward_type": "Reward Points", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "dining", "reward_type": "points", "rate": 5, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "groceries", "reward_type": "points", "rate": 5, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 2, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 2.0, "reward_point_value": 0.50,
            "milestone_benefits": "Welcome e-gift voucher worth ₹5000 on joining",
            "fuel_waiver_rate": 1.0, "fuel_min": 500, "fuel_max": 3000,
            "lounge_domestic": 8, "lounge_international": 4, "card_network": "Visa"
        },
        "lounge_access": "2 domestic lounge visits per quarter + 4 international per year",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "1 Reward Point = ₹0.50",
        "official_url": "https://www.sbicard.com/en/personal/credit-cards/elite-sbi-card.page"
    },
    {
        "bank_name": "SBI", "card_name": "BPCL Octane",
        "card_type": "Fuel", "joining_fee": 1499.00, "annual_fee": 1499.00,
        "reward_type": "Reward Points", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "fuel", "reward_type": "points", "rate": 25, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["offline"], "partner_merchants": ["BPCL"], "excluded_merchants": []},
                {"category": "dining", "reward_type": "points", "rate": 10, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "groceries", "reward_type": "points", "rate": 10, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 1, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 1.0, "reward_point_value": 0.25,
            "milestone_benefits": "6000 bonus points on spending ₹5000+ in first 60 days",
            "fuel_waiver_rate": 2.0, "fuel_min": 400, "fuel_max": 4000,
            "lounge_domestic": 0, "lounge_international": 0, "card_network": "Visa"
        },
        "lounge_access": "None",
        "fuel_benefits": "25 points per ₹100 fuel at BPCL pumps + 2% surcharge waiver",
        "reward_conversion": "4 Reward Points = ₹1.00",
        "official_url": "https://www.sbicard.com/en/personal/credit-cards/bpcl-octane-sbi-card.page"
    },
    {
        "bank_name": "SBI", "card_name": "IRCTC SBI Platinum",
        "card_type": "Travel", "joining_fee": 500.00, "annual_fee": 300.00,
        "reward_type": "Reward Points", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "travel", "reward_type": "points", "rate": 10, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online"], "partner_merchants": ["IRCTC"], "excluded_merchants": []},
                {"category": "dining", "reward_type": "points", "rate": 5, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 1, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 1.0, "reward_point_value": 0.25,
            "milestone_benefits": "2% cash back on AC train tickets",
            "fuel_waiver_rate": 1.0, "fuel_min": 500, "fuel_max": 3000,
            "lounge_domestic": 0, "lounge_international": 0, "card_network": "Visa"
        },
        "lounge_access": "None",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "4 Reward Points = ₹1.00",
        "official_url": "https://www.sbicard.com/en/personal/credit-cards/irctc-sbi-card.page"
    },
    {
        "bank_name": "SBI", "card_name": "SimplySAVE",
        "card_type": "Entry Level", "joining_fee": 499.00, "annual_fee": 499.00,
        "reward_type": "Reward Points", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "dining", "reward_type": "points", "rate": 10, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "groceries", "reward_type": "points", "rate": 10, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "movies", "reward_type": "points", "rate": 10, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 1, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 1.0, "reward_point_value": 0.25,
            "milestone_benefits": "None",
            "fuel_waiver_rate": 1.0, "fuel_min": 500, "fuel_max": 3000,
            "lounge_domestic": 0, "lounge_international": 0, "card_network": "Visa"
        },
        "lounge_access": "None",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "4 Reward Points = ₹1.00",
        "official_url": "https://www.sbicard.com/en/personal/credit-cards/simplysave-sbi-card.page"
    },

    # ───────────────── AXIS BANK ─────────────────
    {
        "bank_name": "Axis", "card_name": "Ace",
        "card_type": "Cashback", "joining_fee": 499.00, "annual_fee": 499.00,
        "reward_type": "Cashback", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "utilities", "reward_type": "cashback", "rate": 5, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online"], "partner_merchants": ["Google Pay Bills"], "excluded_merchants": []},
                {"category": "dining", "reward_type": "cashback", "rate": 4, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": ["Swiggy", "Zomato", "Ola"], "excluded_merchants": []},
                {"category": "travel", "reward_type": "cashback", "rate": 4, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": ["Swiggy", "Zomato", "Ola"], "excluded_merchants": []},
                {"category": "general", "reward_type": "cashback", "rate": 2, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 2.0, "reward_point_value": 1.0,
            "milestone_benefits": "Waiver on annual fee on spending ₹2L+",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 4000,
            "lounge_domestic": 4, "lounge_international": 0, "card_network": "Visa"
        },
        "lounge_access": "4 complimentary lounge visits per year",
        "fuel_benefits": "1% surcharge waiver on transactions ₹400–₹4000",
        "reward_conversion": "1 Point = ₹1.00 statement credit",
        "official_url": "https://www.axisbank.com/retail/cards/credit-card/axis-bank-ace-credit-card"
    },
    {
        "bank_name": "Axis", "card_name": "Magnus",
        "card_type": "Super Premium", "joining_fee": 12500.00, "annual_fee": 12500.00,
        "reward_type": "EDGE Reward Points", "card_network": "Mastercard World Elite",
        "reward_rules_json": {
            "rules": [
                {"category": "travel", "reward_type": "points", "rate": 12, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": ["MakeMyTrip", "EaseMyTrip", "Yatra", "IRCTC", "Cleartrip"], "excluded_merchants": []},
                {"category": "dining", "reward_type": "points", "rate": 12, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 6, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 6.0, "reward_point_value": 0.80,
            "milestone_benefits": "25000 EDGE points on monthly spend of ₹1L",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 999, "lounge_international": 8, "card_network": "Mastercard World Elite"
        },
        "lounge_access": "Unlimited domestic + 8 international visits per year",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "5 EDGE Points = 4 partner airline/hotel miles",
        "official_url": "https://www.axisbank.com/retail/cards/credit-card/magnus-credit-card"
    },
    {
        "bank_name": "Axis", "card_name": "Flipkart Axis",
        "card_type": "Co-branded Cashback", "joining_fee": 500.00, "annual_fee": 500.00,
        "reward_type": "Cashback", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "online_shopping", "reward_type": "cashback", "rate": 5, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online"], "partner_merchants": ["Flipkart", "Myntra"], "excluded_merchants": []},
                {"category": "travel", "reward_type": "cashback", "rate": 4, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online"], "partner_merchants": ["Cleartrip"], "excluded_merchants": []},
                {"category": "dining", "reward_type": "cashback", "rate": 4, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "cashback", "rate": 1.5, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 1.5, "reward_point_value": 1.0,
            "milestone_benefits": "₹600 Flipkart voucher on spending ₹1L per quarter",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 4000,
            "lounge_domestic": 4, "lounge_international": 0, "card_network": "Visa"
        },
        "lounge_access": "4 domestic lounge visits per year",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "1 Cashback Point = ₹1.00",
        "official_url": "https://www.axisbank.com/retail/cards/credit-card/flipkart-axis-bank-credit-card"
    },
    {
        "bank_name": "Axis", "card_name": "Privilege",
        "card_type": "Premium", "joining_fee": 1500.00, "annual_fee": 1500.00,
        "reward_type": "EDGE Reward Points", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "travel", "reward_type": "points", "rate": 5, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "dining", "reward_type": "points", "rate": 5, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 2, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 2.0, "reward_point_value": 0.50,
            "milestone_benefits": "EazyDiner Prime membership",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 4000,
            "lounge_domestic": 8, "lounge_international": 0, "card_network": "Visa"
        },
        "lounge_access": "2 domestic lounge visits per quarter",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "2 EDGE Points = ₹1.00",
        "official_url": "https://www.axisbank.com/retail/cards/credit-card/privilege-credit-card"
    },
    {
        "bank_name": "Axis", "card_name": "Airtel Axis",
        "card_type": "Co-branded", "joining_fee": 500.00, "annual_fee": 500.00,
        "reward_type": "Cashback", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "utilities", "reward_type": "cashback", "rate": 25, "monthly_cap": 500, "minimum_transaction": 1, "applicable_channels": ["online"], "partner_merchants": ["Airtel"], "excluded_merchants": []},
                {"category": "dining", "reward_type": "cashback", "rate": 10, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": ["Swiggy", "Zomato"], "excluded_merchants": []},
                {"category": "general", "reward_type": "cashback", "rate": 1, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 1.0, "reward_point_value": 1.0,
            "milestone_benefits": "3 months Amazon Prime free",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 4000,
            "lounge_domestic": 4, "lounge_international": 0, "card_network": "Visa"
        },
        "lounge_access": "4 domestic lounge visits per year",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "1 CashPoint = ₹1.00",
        "official_url": "https://www.axisbank.com/retail/cards/credit-card/airtel-axis-bank-credit-card"
    },

    # ───────────────── HSBC INDIA ─────────────────
    {
        "bank_name": "HSBC", "card_name": "Cashback",
        "card_type": "Cashback", "joining_fee": 999.00, "annual_fee": 999.00,
        "reward_type": "Cashback", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "dining", "reward_type": "cashback", "rate": 10, "monthly_cap": 1000, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "groceries", "reward_type": "cashback", "rate": 10, "monthly_cap": 1000, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "cashback", "rate": 1.5, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 1.5, "reward_point_value": 1.0,
            "milestone_benefits": "None",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 4, "lounge_international": 0, "card_network": "Visa"
        },
        "lounge_access": "4 domestic lounge visits per year",
        "fuel_benefits": "1% surcharge waiver on fuel transactions",
        "reward_conversion": "1 Point = ₹1.00 cashback",
        "official_url": "https://www.hsbc.co.in/credit-cards/products/cashback/"
    },
    {
        "bank_name": "HSBC", "card_name": "Smart Value",
        "card_type": "Entry Level", "joining_fee": 499.00, "annual_fee": 499.00,
        "reward_type": "Reward Points", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "utilities", "reward_type": "points", "rate": 3, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 2, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 2.0, "reward_point_value": 0.25,
            "milestone_benefits": "None",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 0, "lounge_international": 0, "card_network": "Visa"
        },
        "lounge_access": "None",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "4 Reward Points = ₹1.00",
        "official_url": "https://www.hsbc.co.in/credit-cards/products/smart-value/"
    },
    {
        "bank_name": "HSBC", "card_name": "Visa Platinum",
        "card_type": "Standard", "joining_fee": 0.00, "annual_fee": 0.00,
        "reward_type": "Reward Points", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "dining", "reward_type": "points", "rate": 3, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 2, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 2.0, "reward_point_value": 0.25,
            "milestone_benefits": "None",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 0, "lounge_international": 0, "card_network": "Visa"
        },
        "lounge_access": "None",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "4 Reward Points = ₹1.00",
        "official_url": "https://www.hsbc.co.in/credit-cards/products/visa-platinum/"
    },

    # ───────────────── KOTAK MAHINDRA ─────────────────
    {
        "bank_name": "Kotak", "card_name": "Zen Signature",
        "card_type": "Premium", "joining_fee": 1500.00, "annual_fee": 1500.00,
        "reward_type": "Zen Reward Points", "card_network": "Mastercard",
        "reward_rules_json": {
            "rules": [
                {"category": "dining", "reward_type": "points", "rate": 15, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "travel", "reward_type": "points", "rate": 15, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 5, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 5.0, "reward_point_value": 0.25,
            "milestone_benefits": "2X rewards on international spends",
            "fuel_waiver_rate": 1.0, "fuel_min": 500, "fuel_max": 3000,
            "lounge_domestic": 8, "lounge_international": 2, "card_network": "Mastercard"
        },
        "lounge_access": "8 domestic visits + 2 international visits per year",
        "fuel_benefits": "1% surcharge waiver ₹500–₹3000",
        "reward_conversion": "1 Zen Point = ₹0.25",
        "official_url": "https://www.kotak.com/en/personal-banking/cards/credit-cards/zen-signature-card.html"
    },
    {
        "bank_name": "Kotak", "card_name": "Royale Signature",
        "card_type": "Premium", "joining_fee": 1999.00, "annual_fee": 999.00,
        "reward_type": "Reward Points", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "online_shopping", "reward_type": "points", "rate": 8, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 4, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 4.0, "reward_point_value": 0.25,
            "milestone_benefits": "1500 bonus points on ₹50K quarterly spend",
            "fuel_waiver_rate": 1.0, "fuel_min": 500, "fuel_max": 3000,
            "lounge_domestic": 4, "lounge_international": 0, "card_network": "Visa"
        },
        "lounge_access": "4 domestic lounge visits per year",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "4 Reward Points = ₹1.00",
        "official_url": "https://www.kotak.com/en/personal-banking/cards/credit-cards/royale-signature.html"
    },
    {
        "bank_name": "Kotak", "card_name": "League Platinum",
        "card_type": "Sports", "joining_fee": 1000.00, "annual_fee": 1000.00,
        "reward_type": "Reward Points", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "dining", "reward_type": "points", "rate": 8, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 4, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 4.0, "reward_point_value": 0.25,
            "milestone_benefits": "IPL ticket giveaways on milestone spends",
            "fuel_waiver_rate": 1.0, "fuel_min": 500, "fuel_max": 3000,
            "lounge_domestic": 4, "lounge_international": 0, "card_network": "Visa"
        },
        "lounge_access": "4 domestic lounge visits per year",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "4 Reward Points = ₹1.00",
        "official_url": "https://www.kotak.com/en/personal-banking/cards/credit-cards/league-platinum.html"
    },
    {
        "bank_name": "Kotak", "card_name": "811 Dream Different",
        "card_type": "Entry Level", "joining_fee": 0.00, "annual_fee": 0.00,
        "reward_type": "Reward Points", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "general", "reward_type": "points", "rate": 2, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 2.0, "reward_point_value": 0.25,
            "milestone_benefits": "None",
            "fuel_waiver_rate": 1.0, "fuel_min": 500, "fuel_max": 3000,
            "lounge_domestic": 0, "lounge_international": 0, "card_network": "Visa"
        },
        "lounge_access": "None",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "4 Reward Points = ₹1.00",
        "official_url": "https://www.kotak.com/en/personal-banking/cards/credit-cards/811-dream-different-credit-card.html"
    },

    # ───────────────── IndusInd BANK ─────────────────
    {
        "bank_name": "IndusInd", "card_name": "Legend",
        "card_type": "Premium", "joining_fee": 9999.00, "annual_fee": 0.00,
        "reward_type": "Reward Points", "card_network": "Mastercard",
        "reward_rules_json": {
            "rules": [
                {"category": "dining", "reward_type": "points", "rate": 2, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 1, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 1.0, "reward_point_value": 0.75,
            "milestone_benefits": "25% more points on weekends",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 4, "lounge_international": 4, "card_network": "Mastercard"
        },
        "lounge_access": "1 domestic + 1 international lounge visit per quarter",
        "fuel_benefits": "1% surcharge waiver on fuel",
        "reward_conversion": "1 Reward Point = ₹0.75",
        "official_url": "https://www.indusind.com/in/en/personal/cards/credit-card/legend-credit-card.html"
    },
    {
        "bank_name": "IndusInd", "card_name": "Pinnacle",
        "card_type": "Ultra Premium", "joining_fee": 40000.00, "annual_fee": 40000.00,
        "reward_type": "Reward Points", "card_network": "Visa Infinite",
        "reward_rules_json": {
            "rules": [
                {"category": "dining", "reward_type": "points", "rate": 5, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "travel", "reward_type": "points", "rate": 5, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 2, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 2.0, "reward_point_value": 1.0,
            "milestone_benefits": "Taj Epicure membership, golf privilege, concierge",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 999, "lounge_international": 999, "card_network": "Visa Infinite"
        },
        "lounge_access": "Unlimited domestic & international lounge access",
        "fuel_benefits": "1% surcharge waiver",
        "reward_conversion": "1 Reward Point = ₹1.00",
        "official_url": "https://www.indusind.com/in/en/personal/cards/credit-card/pinnacle-credit-card.html"
    },
    {
        "bank_name": "IndusInd", "card_name": "Platinum Aura Edge",
        "card_type": "Lifestyle", "joining_fee": 1499.00, "annual_fee": 1499.00,
        "reward_type": "Reward Points", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "general", "reward_type": "points", "rate": 2, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 2.0, "reward_point_value": 0.75,
            "milestone_benefits": "Bonus reward points on milestone spends",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 4, "lounge_international": 0, "card_network": "Visa"
        },
        "lounge_access": "4 domestic lounge visits per year",
        "fuel_benefits": "1% surcharge waiver on fuel",
        "reward_conversion": "1 Reward Point = ₹0.75",
        "official_url": "https://www.indusind.com/in/en/personal/cards/credit-card/platinum-aura-edge-credit-card.html"
    },

    # ───────────────── YES BANK ─────────────────
    {
        "bank_name": "Yes Bank", "card_name": "Reserv",
        "card_type": "Premium Rewards", "joining_fee": 1999.00, "annual_fee": 1999.00,
        "reward_type": "Reward Points", "card_network": "Mastercard",
        "reward_rules_json": {
            "rules": [
                {"category": "groceries", "reward_type": "points", "rate": 12, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "dining", "reward_type": "points", "rate": 12, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 8, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 8.0, "reward_point_value": 0.25,
            "milestone_benefits": "None",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 12, "lounge_international": 3, "card_network": "Mastercard"
        },
        "lounge_access": "3 domestic per quarter + 3 international per year",
        "fuel_benefits": "1% surcharge waiver ₹400–₹5000",
        "reward_conversion": "4 Reward Points = ₹1.00",
        "official_url": "https://www.yesbank.in/personal-banking/cards/credit-cards/yes-reserv-credit-card"
    },
    {
        "bank_name": "Yes Bank", "card_name": "Prosperity Cashback",
        "card_type": "Cashback", "joining_fee": 399.00, "annual_fee": 399.00,
        "reward_type": "Cashback", "card_network": "Mastercard",
        "reward_rules_json": {
            "rules": [
                {"category": "groceries", "reward_type": "cashback", "rate": 5, "monthly_cap": 500, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "dining", "reward_type": "cashback", "rate": 5, "monthly_cap": 500, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "cashback", "rate": 1, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 1.0, "reward_point_value": 1.0,
            "milestone_benefits": "None",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 0, "lounge_international": 0, "card_network": "Mastercard"
        },
        "lounge_access": "None",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "Cashback auto-credited",
        "official_url": "https://www.yesbank.in/personal-banking/cards/credit-cards/yes-prosperity-cashback-credit-card"
    },
    {
        "bank_name": "Yes Bank", "card_name": "First Exclusive",
        "card_type": "Ultra Premium", "joining_fee": 9999.00, "annual_fee": 9999.00,
        "reward_type": "Reward Points", "card_network": "Mastercard World Elite",
        "reward_rules_json": {
            "rules": [
                {"category": "travel", "reward_type": "points", "rate": 18, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "dining", "reward_type": "points", "rate": 12, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 8, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 8.0, "reward_point_value": 0.25,
            "milestone_benefits": "ITC gift vouchers on milestone spends",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 999, "lounge_international": 12, "card_network": "Mastercard World Elite"
        },
        "lounge_access": "Unlimited domestic + 12 international visits per year",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "4 Reward Points = ₹1.00",
        "official_url": "https://www.yesbank.in/personal-banking/cards/credit-cards/yes-first-exclusive-credit-card"
    },

    # ───────────────── AU SMALL FINANCE BANK ─────────────────
    {
        "bank_name": "AU Small Finance", "card_name": "Zenith+",
        "card_type": "Premium", "joining_fee": 7999.00, "annual_fee": 7999.00,
        "reward_type": "Reward Points", "card_network": "Mastercard",
        "reward_rules_json": {
            "rules": [
                {"category": "dining", "reward_type": "points", "rate": 20, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "groceries", "reward_type": "points", "rate": 20, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 10, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 10.0, "reward_point_value": 0.25,
            "milestone_benefits": "50 reward points per ₹100 on dining/groceries",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 16, "lounge_international": 8, "card_network": "Mastercard"
        },
        "lounge_access": "16 domestic + 8 international lounge visits per year",
        "fuel_benefits": "1% surcharge waiver ₹400–₹5000",
        "reward_conversion": "4 Reward Points = ₹1.00",
        "official_url": "https://www.aubank.in/personal-banking/cards/credit-cards/zenith-credit-card"
    },
    {
        "bank_name": "AU Small Finance", "card_name": "Altura Plus",
        "card_type": "Mid-tier", "joining_fee": 499.00, "annual_fee": 499.00,
        "reward_type": "Cashback", "card_network": "Mastercard",
        "reward_rules_json": {
            "rules": [
                {"category": "online_shopping", "reward_type": "cashback", "rate": 2, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "cashback", "rate": 1, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 1.0, "reward_point_value": 1.0,
            "milestone_benefits": "None",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 4, "lounge_international": 0, "card_network": "Mastercard"
        },
        "lounge_access": "4 domestic lounge visits per year",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "Cashback auto-credited",
        "official_url": "https://www.aubank.in/personal-banking/cards/credit-cards/altura-plus-credit-card"
    },
    {
        "bank_name": "AU Small Finance", "card_name": "Lit",
        "card_type": "Customizable", "joining_fee": 499.00, "annual_fee": 499.00,
        "reward_type": "Cashback", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "online_shopping", "reward_type": "cashback", "rate": 5, "monthly_cap": 500, "minimum_transaction": 1, "applicable_channels": ["online"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "cashback", "rate": 1, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 1.0, "reward_point_value": 1.0,
            "milestone_benefits": "Customizable monthly reward categories",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 4, "lounge_international": 0, "card_network": "Visa"
        },
        "lounge_access": "4 domestic lounge visits per year",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "Cashback auto-credited",
        "official_url": "https://www.aubank.in/personal-banking/cards/credit-cards/lit-credit-card"
    },

    # ───────────────── STANDARD CHARTERED ─────────────────
    {
        "bank_name": "Standard Chartered", "card_name": "Ultimate",
        "card_type": "Premium", "joining_fee": 5000.00, "annual_fee": 5000.00,
        "reward_type": "Reward Points", "card_network": "Mastercard",
        "reward_rules_json": {
            "rules": [
                {"category": "dining", "reward_type": "points", "rate": 5, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "online_shopping", "reward_type": "points", "rate": 5, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 3, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 3.0, "reward_point_value": 0.50,
            "milestone_benefits": "1 reward point per ₹150 spend, 5X on select categories",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 8, "lounge_international": 4, "card_network": "Mastercard"
        },
        "lounge_access": "2 domestic per quarter + 4 international per year",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "1 Reward Point = ₹0.50",
        "official_url": "https://www.sc.com/in/credit-cards/ultimate-credit-card/"
    },
    {
        "bank_name": "Standard Chartered", "card_name": "DigiSmart",
        "card_type": "Digital Lifestyle", "joining_fee": 49.00, "annual_fee": 49.00,
        "reward_type": "Cashback", "card_network": "Mastercard",
        "reward_rules_json": {
            "rules": [
                {"category": "online_shopping", "reward_type": "cashback", "rate": 10, "monthly_cap": 500, "minimum_transaction": 1, "applicable_channels": ["online"], "partner_merchants": ["Myntra", "Grofers", "Zomato", "BookMyShow", "OYO"], "excluded_merchants": []},
                {"category": "general", "reward_type": "cashback", "rate": 1, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 1.0, "reward_point_value": 1.0,
            "milestone_benefits": "Netflix/Amazon Prime subscription rebates",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 0, "lounge_international": 0, "card_network": "Mastercard"
        },
        "lounge_access": "None",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "Cashback auto-credited",
        "official_url": "https://www.sc.com/in/credit-cards/digismart-credit-card/"
    },
    {
        "bank_name": "Standard Chartered", "card_name": "Smart",
        "card_type": "Entry Level", "joining_fee": 499.00, "annual_fee": 499.00,
        "reward_type": "Reward Points", "card_network": "Mastercard",
        "reward_rules_json": {
            "rules": [
                {"category": "online_shopping", "reward_type": "points", "rate": 3, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 2, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 2.0, "reward_point_value": 0.25,
            "milestone_benefits": "None",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 0, "lounge_international": 0, "card_network": "Mastercard"
        },
        "lounge_access": "None",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "4 Reward Points = ₹1.00",
        "official_url": "https://www.sc.com/in/credit-cards/smart-credit-card/"
    },

    # ───────────────── RBL BANK ─────────────────
    {
        "bank_name": "RBL", "card_name": "Shoprite",
        "card_type": "Shopping", "joining_fee": 500.00, "annual_fee": 500.00,
        "reward_type": "Reward Points", "card_network": "Mastercard",
        "reward_rules_json": {
            "rules": [
                {"category": "groceries", "reward_type": "points", "rate": 20, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["offline"], "partner_merchants": ["ShopRite"], "excluded_merchants": []},
                {"category": "online_shopping", "reward_type": "points", "rate": 10, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 2, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 2.0, "reward_point_value": 0.25,
            "milestone_benefits": "None",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 0, "lounge_international": 0, "card_network": "Mastercard"
        },
        "lounge_access": "None",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "4 Reward Points = ₹1.00",
        "official_url": "https://www.rblbank.com/credit-cards/shoprite"
    },
    {
        "bank_name": "RBL", "card_name": "Platinum Maxima",
        "card_type": "Lifestyle", "joining_fee": 2000.00, "annual_fee": 2000.00,
        "reward_type": "Reward Points", "card_network": "Mastercard",
        "reward_rules_json": {
            "rules": [
                {"category": "dining", "reward_type": "points", "rate": 10, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "travel", "reward_type": "points", "rate": 5, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 2, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 2.0, "reward_point_value": 0.25,
            "milestone_benefits": "Movie ticket offers",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 4, "lounge_international": 0, "card_network": "Mastercard"
        },
        "lounge_access": "4 domestic lounge visits per year",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "4 Reward Points = ₹1.00",
        "official_url": "https://www.rblbank.com/credit-cards/platinum-maxima"
    },
    {
        "bank_name": "RBL", "card_name": "Zomato Edition",
        "card_type": "Co-branded", "joining_fee": 500.00, "annual_fee": 500.00,
        "reward_type": "Cashback", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "dining", "reward_type": "cashback", "rate": 10, "monthly_cap": 1000, "minimum_transaction": 1, "applicable_channels": ["online"], "partner_merchants": ["Zomato"], "excluded_merchants": []},
                {"category": "general", "reward_type": "cashback", "rate": 1, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 1.0, "reward_point_value": 1.0,
            "milestone_benefits": "Zomato Pro membership",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 0, "lounge_international": 0, "card_network": "Visa"
        },
        "lounge_access": "None",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "Cashback auto-credited",
        "official_url": "https://www.rblbank.com/credit-cards/zomato-edition"
    },
    {
        "bank_name": "RBL", "card_name": "Icon",
        "card_type": "Super Premium", "joining_fee": 3000.00, "annual_fee": 3000.00,
        "reward_type": "Reward Points", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "travel", "reward_type": "points", "rate": 15, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "dining", "reward_type": "points", "rate": 10, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 5, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 5.0, "reward_point_value": 0.50,
            "milestone_benefits": "Airport transfer services",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 8, "lounge_international": 4, "card_network": "Visa"
        },
        "lounge_access": "8 domestic + 4 international lounge visits per year",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "2 Reward Points = ₹1.00",
        "official_url": "https://www.rblbank.com/credit-cards/icon"
    },

    # ───────────────── IDFC FIRST BANK ─────────────────
    {
        "bank_name": "IDFC First", "card_name": "Wealth",
        "card_type": "Premium", "joining_fee": 0.00, "annual_fee": 0.00,
        "reward_type": "Reward Points", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "dining", "reward_type": "points", "rate": 10, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "travel", "reward_type": "points", "rate": 10, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 3, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 3.0, "reward_point_value": 0.25,
            "milestone_benefits": "No annual fee for life",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 8, "lounge_international": 0, "card_network": "Visa"
        },
        "lounge_access": "8 domestic lounge visits per year",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "4 Reward Points = ₹1.00",
        "official_url": "https://www.idfcfirstbank.com/credit-card/wealth"
    },
    {
        "bank_name": "IDFC First", "card_name": "Millennia",
        "card_type": "Entry Level", "joining_fee": 0.00, "annual_fee": 0.00,
        "reward_type": "Cashback", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "online_shopping", "reward_type": "cashback", "rate": 5, "monthly_cap": 500, "minimum_transaction": 1, "applicable_channels": ["online"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "cashback", "rate": 1, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 1.0, "reward_point_value": 1.0,
            "milestone_benefits": "Lifetime free card",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 0, "lounge_international": 0, "card_network": "Visa"
        },
        "lounge_access": "None",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "Cashback auto-credited",
        "official_url": "https://www.idfcfirstbank.com/credit-card/millennia"
    },
    {
        "bank_name": "IDFC First", "card_name": "Classic",
        "card_type": "Entry Level", "joining_fee": 0.00, "annual_fee": 0.00,
        "reward_type": "Reward Points", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "general", "reward_type": "points", "rate": 3, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 3.0, "reward_point_value": 0.25,
            "milestone_benefits": "Lifetime free card",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 0, "lounge_international": 0, "card_network": "Visa"
        },
        "lounge_access": "None",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "4 Reward Points = ₹1.00",
        "official_url": "https://www.idfcfirstbank.com/credit-card/classic"
    },

    # ───────────────── FEDERAL BANK ─────────────────
    {
        "bank_name": "Federal Bank", "card_name": "Scapia",
        "card_type": "Travel", "joining_fee": 0.00, "annual_fee": 0.00,
        "reward_type": "Scapia Coins (Miles)", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "travel", "reward_type": "miles", "rate": 10, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "miles", "rate": 5, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 5.0, "reward_point_value": 0.50,
            "milestone_benefits": "Zero forex markup",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 999, "lounge_international": 0, "card_network": "Visa"
        },
        "lounge_access": "Unlimited domestic lounge access",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "Redeem for flights/hotels at 1 coin = ₹0.50",
        "official_url": "https://www.scapia.in/credit-card"
    },
    {
        "bank_name": "Federal Bank", "card_name": "Celesta",
        "card_type": "Premium", "joining_fee": 0.00, "annual_fee": 0.00,
        "reward_type": "Reward Points", "card_network": "Mastercard",
        "reward_rules_json": {
            "rules": [
                {"category": "dining", "reward_type": "points", "rate": 5, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "travel", "reward_type": "points", "rate": 5, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 2, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 2.0, "reward_point_value": 0.50,
            "milestone_benefits": "None",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 4, "lounge_international": 0, "card_network": "Mastercard"
        },
        "lounge_access": "4 domestic lounge visits per year",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "2 Reward Points = ₹1.00",
        "official_url": "https://www.federalbank.co.in/credit-cards"
    },

    # ───────────────── AMERICAN EXPRESS ─────────────────
    {
        "bank_name": "Amex", "card_name": "Platinum",
        "card_type": "Ultra Premium Charge", "joining_fee": 60000.00, "annual_fee": 60000.00,
        "reward_type": "Membership Rewards Points", "card_network": "Amex",
        "reward_rules_json": {
            "rules": [
                {"category": "travel", "reward_type": "points", "rate": 5, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": ["Amex Travel", "Airlines", "Hotels"], "excluded_merchants": []},
                {"category": "dining", "reward_type": "points", "rate": 5, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 1, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 1.0, "reward_point_value": 0.50,
            "milestone_benefits": "50000 bonus points on joining, Centurion lounge access",
            "fuel_waiver_rate": 0, "fuel_min": 0, "fuel_max": 0,
            "lounge_domestic": 999, "lounge_international": 999, "card_network": "Amex"
        },
        "lounge_access": "Unlimited global lounge access including Centurion Lounges",
        "fuel_benefits": "No fuel waiver",
        "reward_conversion": "1 MR Point = ₹0.50 or 1 Airline Mile",
        "official_url": "https://www.americanexpress.com/in/credit-cards/platinum-card/"
    },
    {
        "bank_name": "Amex", "card_name": "Gold",
        "card_type": "Premium Charge", "joining_fee": 4500.00, "annual_fee": 4500.00,
        "reward_type": "Membership Rewards Points", "card_network": "Amex",
        "reward_rules_json": {
            "rules": [
                {"category": "dining", "reward_type": "points", "rate": 4, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "groceries", "reward_type": "points", "rate": 4, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 1, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 1.0, "reward_point_value": 0.50,
            "milestone_benefits": "₹2500 statement credit on ₹50K spending",
            "fuel_waiver_rate": 0, "fuel_min": 0, "fuel_max": 0,
            "lounge_domestic": 8, "lounge_international": 0, "card_network": "Amex"
        },
        "lounge_access": "8 domestic lounge visits per year",
        "fuel_benefits": "No fuel waiver",
        "reward_conversion": "1 MR Point = ₹0.50",
        "official_url": "https://www.americanexpress.com/in/credit-cards/gold-card/"
    },
    {
        "bank_name": "Amex", "card_name": "SmartEarn",
        "card_type": "Entry Level", "joining_fee": 495.00, "annual_fee": 495.00,
        "reward_type": "Membership Rewards Points", "card_network": "Amex",
        "reward_rules_json": {
            "rules": [
                {"category": "online_shopping", "reward_type": "points", "rate": 10, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online"], "partner_merchants": ["Amazon", "BookMyShow", "Uber"], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 2, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 2.0, "reward_point_value": 0.25,
            "milestone_benefits": "₹500 statement credit on 4 transactions of ₹1000+",
            "fuel_waiver_rate": 0, "fuel_min": 0, "fuel_max": 0,
            "lounge_domestic": 0, "lounge_international": 0, "card_network": "Amex"
        },
        "lounge_access": "None",
        "fuel_benefits": "No fuel waiver",
        "reward_conversion": "1 MR Point = ₹0.25",
        "official_url": "https://www.americanexpress.com/in/credit-cards/smartearn-credit-card/"
    },
    {
        "bank_name": "Amex", "card_name": "MRCC",
        "card_type": "Mid-tier", "joining_fee": 1500.00, "annual_fee": 1500.00,
        "reward_type": "Membership Rewards Points", "card_network": "Amex",
        "reward_rules_json": {
            "rules": [
                {"category": "general", "reward_type": "points", "rate": 1, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "online_shopping", "reward_type": "points", "rate": 5, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 1.0, "reward_point_value": 0.50,
            "milestone_benefits": "1000 bonus points on 6 transactions of ₹1000+ per month",
            "fuel_waiver_rate": 0, "fuel_min": 0, "fuel_max": 0,
            "lounge_domestic": 0, "lounge_international": 0, "card_network": "Amex"
        },
        "lounge_access": "None",
        "fuel_benefits": "No fuel waiver",
        "reward_conversion": "1 MR Point = ₹0.50",
        "official_url": "https://www.americanexpress.com/in/credit-cards/membership-rewards-credit-card/"
    },

    # ───────────────── BANK OF BARODA ─────────────────
    {
        "bank_name": "Bank of Baroda", "card_name": "Eterna",
        "card_type": "Premium", "joining_fee": 2499.00, "annual_fee": 2499.00,
        "reward_type": "Reward Points", "card_network": "Mastercard",
        "reward_rules_json": {
            "rules": [
                {"category": "dining", "reward_type": "points", "rate": 10, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "travel", "reward_type": "points", "rate": 10, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 3, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 3.0, "reward_point_value": 0.25,
            "milestone_benefits": "Lounge access, golf privileges",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 8, "lounge_international": 4, "card_network": "Mastercard"
        },
        "lounge_access": "8 domestic + 4 international lounge visits per year",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "4 Reward Points = ₹1.00",
        "official_url": "https://www.bankofbaroda.in/credit-cards/eterna"
    },
    {
        "bank_name": "Bank of Baroda", "card_name": "Select",
        "card_type": "Mid-tier", "joining_fee": 750.00, "annual_fee": 750.00,
        "reward_type": "Reward Points", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "dining", "reward_type": "points", "rate": 5, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []},
                {"category": "general", "reward_type": "points", "rate": 2, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 2.0, "reward_point_value": 0.25,
            "milestone_benefits": "None",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 4, "lounge_international": 0, "card_network": "Visa"
        },
        "lounge_access": "4 domestic lounge visits per year",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "4 Reward Points = ₹1.00",
        "official_url": "https://www.bankofbaroda.in/credit-cards/select"
    },

    # ───────────────── PNB ─────────────────
    {
        "bank_name": "PNB", "card_name": "RuPay Select",
        "card_type": "Premium RuPay", "joining_fee": 0.00, "annual_fee": 500.00,
        "reward_type": "Reward Points", "card_network": "RuPay",
        "reward_rules_json": {
            "rules": [
                {"category": "general", "reward_type": "points", "rate": 2, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 2.0, "reward_point_value": 0.25,
            "milestone_benefits": "BHIM UPI enabled",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 4, "lounge_international": 0, "card_network": "RuPay"
        },
        "lounge_access": "4 domestic lounge visits per year",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "4 Reward Points = ₹1.00",
        "official_url": "https://www.pnbindia.in/credit-cards.html"
    },
    {
        "bank_name": "PNB", "card_name": "Platinum",
        "card_type": "Standard", "joining_fee": 300.00, "annual_fee": 300.00,
        "reward_type": "Reward Points", "card_network": "Visa",
        "reward_rules_json": {
            "rules": [
                {"category": "general", "reward_type": "points", "rate": 2, "monthly_cap": None, "minimum_transaction": 1, "applicable_channels": ["online", "offline"], "partner_merchants": [], "excluded_merchants": []}
            ],
            "base_rate": 2.0, "reward_point_value": 0.25,
            "milestone_benefits": "None",
            "fuel_waiver_rate": 1.0, "fuel_min": 400, "fuel_max": 5000,
            "lounge_domestic": 0, "lounge_international": 0, "card_network": "Visa"
        },
        "lounge_access": "None",
        "fuel_benefits": "1% fuel surcharge waiver",
        "reward_conversion": "4 Reward Points = ₹1.00",
        "official_url": "https://www.pnbindia.in/credit-cards.html"
    },
]


class CardService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = CardRepository(db)
        self.catalog_repo = CardCatalogRepository(db)

    async def get_card(self, id: uuid.UUID, user_id: uuid.UUID) -> Optional[UserCreditCard]:
        return await self.repo.get_card_with_catalog(id, user_id)

    async def get_user_cards(self, user_id: uuid.UUID) -> List[UserCreditCard]:
        await self.seed_catalog()
        return await self.repo.get_user_cards(user_id)

    async def create_card(self, user_id: uuid.UUID, obj_in: Dict[str, Any]) -> UserCreditCard:
        obj_in["user_id"] = user_id
        card = await self.repo.create(obj_in)
        return await self.repo.get_card_with_catalog(card.id, user_id)

    async def update_card(self, id: uuid.UUID, user_id: uuid.UUID, obj_in: Dict[str, Any]) -> Optional[UserCreditCard]:
        card = await self.repo.get(id)
        if not card or card.user_id != user_id:
            return None
        await self.repo.update(card, obj_in)
        return await self.repo.get_card_with_catalog(id, user_id)

    async def delete_card(self, id: uuid.UUID, user_id: uuid.UUID) -> bool:
        card = await self.repo.get(id)
        if not card or card.user_id != user_id:
            return False
        return await self.repo.delete(id)

    async def get_catalog(self) -> List[CreditCardCatalog]:
        await self.seed_catalog()
        return await self.catalog_repo.get_all(limit=200)

    async def get_card_summary(self, user_id: uuid.UUID) -> Dict[str, Any]:
        cards = await self.get_user_cards(user_id)
        total_limit = 0.0
        total_outstanding = 0.0
        expected_rewards = 0.0

        for card in cards:
            total_limit += float(card.credit_limit)
            total_outstanding += float(card.outstanding)

            rate = 0.015
            if card.catalog and card.catalog.reward_rules_json:
                rules_json = card.catalog.reward_rules_json
                base = rules_json.get("base_rate", 1.5)
                point_val = rules_json.get("reward_point_value", 0.25)
                rate = (base / 100.0) * point_val

            expected_rewards += float(card.outstanding) * rate

        available_credit = total_limit - total_outstanding
        overall_utilization = (total_outstanding / total_limit * 100) if total_limit > 0 else 0.0

        return {
            "total_limit": round(total_limit, 2),
            "total_outstanding": round(total_outstanding, 2),
            "available_credit": round(available_credit, 2),
            "overall_utilization": round(overall_utilization, 2),
            "expected_rewards": round(expected_rewards, 2)
        }

    async def get_card_insights(self, user_id: uuid.UUID) -> List[Dict[str, Any]]:
        cards = await self.get_user_cards(user_id)
        summary = await self.get_card_summary(user_id)
        insights = []
        overall_util = summary["overall_utilization"]

        if overall_util > 50.0:
            insights.append({"type": "error", "message": f"Your overall credit utilization is critically high at {overall_util:.1f}%. This will lower your credit score. Keep it below 30%."})
        elif overall_util > 30.0:
            insights.append({"type": "warning", "message": f"Your overall utilization of {overall_util:.1f}% exceeds the recommended 30% threshold."})
        else:
            insights.append({"type": "success", "message": f"Your overall credit utilization of {overall_util:.1f}% is healthy (<30%). Great credit hygiene!"})

        today = date.today()
        highly_utilized_cards = []
        low_utilized_cards = []

        for card in cards:
            card_limit = float(card.credit_limit)
            card_outstanding = float(card.outstanding)
            card_util = (card_outstanding / card_limit * 100) if card_limit > 0 else 0.0
            card_name = f"{card.catalog.bank_name} {card.catalog.card_name}" if card.catalog else "Credit Card"

            if card_util > 50.0:
                highly_utilized_cards.append(card_name)
                insights.append({"type": "warning", "message": f"Your {card_name} has {card_util:.1f}% utilization. Consider partial payment.", "card_id": str(card.id)})
            elif card_util < 10.0:
                low_utilized_cards.append((card.id, card_name, card_util))

            dynamic_due = get_dynamic_due_date(card.billing_date, card.due_date, today)
            days_left = (dynamic_due - today).days
            if 0 <= days_left <= 7:
                insights.append({"type": "warning", "message": f"₹{card_outstanding:,.2f} payment for {card_name} is due in {days_left} days.", "card_id": str(card.id)})
            elif days_left < 0:
                insights.append({"type": "error", "message": f"₹{card_outstanding:,.2f} for {card_name} was due {abs(days_left)} days ago! Pay immediately.", "card_id": str(card.id)})

        if highly_utilized_cards and low_utilized_cards:
            insights.append({"type": "info", "message": f"Shift spending to {low_utilized_cards[0][1]} ({low_utilized_cards[0][2]:.1f}% utilized) to balance your portfolio."})

        if summary["available_credit"] > 0:
            insights.append({"type": "success", "message": f"₹{summary['available_credit']:,.2f} available credit across all cards."})

        return insights

    async def seed_catalog(self) -> None:
        """Populates the catalog with the expanded 100+ card dataset if empty."""
        result = await self.db.execute(select(CreditCardCatalog).limit(1))
        if result.scalars().first():
            return
        await self._do_seed()

    async def force_reseed(self) -> int:
        """Admin: Clears and reseeds the entire card catalog."""
        await self.db.execute(delete(CreditCardCatalog))
        await self.db.flush()
        return await self._do_seed()

    async def _do_seed(self) -> int:
        count = 0
        today = date.today()
        for profile in EXPANDED_CATALOG:
            card_dict = dict(profile)
            card_network = card_dict.pop("card_network", "Visa")
            db_obj = CreditCardCatalog(**card_dict)
            self.db.add(db_obj)
            await self.db.flush()
            # Create initial version record
            version = CreditCardVersion(
                card_id=db_obj.id,
                version=1,
                effective_date=today,
                reward_json=db_obj.reward_rules_json,
                annual_fee=db_obj.annual_fee,
                joining_fee=db_obj.joining_fee,
                source="seed_v2"
            )
            self.db.add(version)
            count += 1
        await self.db.flush()
        return count

    async def scrape_external_cards(self, bank_name: str) -> List[Dict[str, Any]]:
        bank_clean = bank_name.strip().upper()
        matching = [p for p in EXPANDED_CATALOG if p["bank_name"].upper() == bank_clean]
        import asyncio
        await asyncio.sleep(0.1)
        return matching
