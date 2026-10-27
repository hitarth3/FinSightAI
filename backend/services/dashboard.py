import uuid
from datetime import date
from typing import Dict, Any
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User
from app.modules.expenses.models import Expense
from models.investment import Investment
from models.stock import Stock
from models.card import UserCreditCard
from models.loan import Loan


class DashboardService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_overview(self, user_id: uuid.UUID) -> Dict[str, Any]:
        """Performs high-speed SQL aggregate queries directly in the database engine."""
        # 1. Fetch user income context
        user_res = await self.db.execute(select(User.monthly_income).where(User.id == user_id))
        income = float(user_res.scalar() or 0.0)

        # 2. Optimized SQL Aggregate: Investments & Stocks (Assets)
        inv_sum_res = await self.db.execute(
            select(func.coalesce(func.sum(Investment.current_value), 0.0)).where(Investment.user_id == user_id)
        )
        investment_value = float(inv_sum_res.scalar() or 0.0)

        stock_sum_res = await self.db.execute(
            select(func.coalesce(func.sum(Stock.quantity * Stock.purchase_price), 0.0)).where(Stock.user_id == user_id)
        )
        stock_value = float(stock_sum_res.scalar() or 0.0)
        total_assets = investment_value + stock_value

        # 3. Optimized SQL Aggregate: Cards & Loans (Liabilities)
        card_res = await self.db.execute(
            select(
                func.coalesce(func.sum(UserCreditCard.outstanding), 0.0),
                func.coalesce(func.sum(UserCreditCard.credit_limit), 0.0)
            ).where(UserCreditCard.user_id == user_id)
        )
        card_debt, total_limit = [float(val or 0.0) for val in card_res.first() or (0.0, 0.0)]

        loan_res = await self.db.execute(
            select(
                func.coalesce(func.sum(Loan.remaining_balance), 0.0),
                func.coalesce(func.sum(Loan.emi), 0.0)
            ).where(Loan.user_id == user_id)
        )
        loan_debt, total_emi = [float(val or 0.0) for val in loan_res.first() or (0.0, 0.0)]
        total_liabilities = card_debt + loan_debt

        # 4. Net worth calculation
        net_worth = total_assets - total_liabilities

        # Month-to-date recorded spending; exclude income, transfers and future entries.
        today = date.today()
        month_start = today.replace(day=1)
        exp_res = await self.db.execute(
            select(func.coalesce(func.sum(Expense.amount), 0.0)).where(
                and_(Expense.user_id == user_id, Expense.nature == "EXPENSE",
                     Expense.expense_date >= month_start, Expense.expense_date <= today)
            )
        )
        monthly_expenses = float(exp_res.scalar() or 0.0)
        monthly_savings = income - monthly_expenses

        # 6. Credit Utilization
        credit_utilization = 0.0
        if total_limit > 0:
            credit_utilization = round((card_debt / total_limit) * 100, 2)

        # 7. EMI Burden
        emi_burden = 0.0
        if income > 0:
            emi_burden = round((total_emi / income) * 100, 2)

        return {
            "total_assets": round(total_assets, 2),
            "total_liabilities": round(total_liabilities, 2),
            "net_worth": round(net_worth, 2),
            "monthly_expenses": round(monthly_expenses, 2),
            "monthly_savings": round(monthly_savings, 2),
            "credit_utilization": float(credit_utilization),
            "emi_burden": float(emi_burden)
        }
