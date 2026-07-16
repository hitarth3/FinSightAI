import uuid
from datetime import date as date_type
from datetime import datetime, timedelta
from calendar import monthrange
from sqlalchemy import select, func, extract, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.expenses.models import Expense, ExpenseInsight


class ExpenseAnalyticsService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_summary(self, user_id: uuid.UUID) -> dict:
        today = date_type.today()
        first_day_this_month = date_type(today.year, today.month, 1)
        
        # Previous month range
        if today.month == 1:
            first_day_prev_month = date_type(today.year - 1, 12, 1)
            last_day_prev_month = date_type(today.year - 1, 12, 31)
        else:
            first_day_prev_month = date_type(today.year, today.month - 1, 1)
            _, last_day = monthrange(today.year, today.month - 1)
            last_day_prev_month = date_type(today.year, today.month - 1, last_day)

        first_day_this_year = date_type(today.year, 1, 1)

        # 1. This Month
        stmt_this_month = select(
            Expense.nature,
            func.coalesce(func.sum(Expense.amount), 0.0),
            func.count(Expense.id)
        ).where(
            Expense.user_id == user_id,
            Expense.expense_date >= first_day_this_month,
            Expense.expense_date <= today
        ).group_by(Expense.nature)
        
        res_this_month = await self.db.execute(stmt_this_month)
        this_month_data = {row[0]: (float(row[1]), int(row[2])) for row in res_this_month.all()}
        
        this_month_expenses, this_month_count = this_month_data.get("EXPENSE", (0.0, 0))
        this_month_income, _ = this_month_data.get("INCOME", (0.0, 0))
        this_month_investments, _ = this_month_data.get("INVESTMENT", (0.0, 0))
        
        this_month_net_cashflow = this_month_income - this_month_expenses
        this_month_savings_rate = (this_month_net_cashflow / this_month_income * 100.0) if this_month_income > 0.0 else 0.0

        # 2. Previous Month
        stmt_prev_month = select(
            Expense.nature,
            func.coalesce(func.sum(Expense.amount), 0.0),
            func.count(Expense.id)
        ).where(
            Expense.user_id == user_id,
            Expense.expense_date >= first_day_prev_month,
            Expense.expense_date <= last_day_prev_month
        ).group_by(Expense.nature)
        
        res_prev_month = await self.db.execute(stmt_prev_month)
        prev_month_data = {row[0]: (float(row[1]), int(row[2])) for row in res_prev_month.all()}
        
        prev_month_expenses, prev_month_count = prev_month_data.get("EXPENSE", (0.0, 0))

        # 3. This Year
        stmt_this_year = select(
            Expense.nature,
            func.coalesce(func.sum(Expense.amount), 0.0),
            func.count(Expense.id)
        ).where(
            Expense.user_id == user_id,
            Expense.expense_date >= first_day_this_year,
            Expense.expense_date <= today
        ).group_by(Expense.nature)
        
        res_this_year = await self.db.execute(stmt_this_year)
        this_year_data = {row[0]: (float(row[1]), int(row[2])) for row in res_this_year.all()}
        
        this_year_expenses, this_year_count = this_year_data.get("EXPENSE", (0.0, 0))
        this_year_income, _ = this_year_data.get("INCOME", (0.0, 0))
        this_year_net_cashflow = this_year_income - this_year_expenses

        # Change Percentage (based on expenses)
        if prev_month_expenses > 0:
            change_percentage = round(((this_month_expenses - prev_month_expenses) / prev_month_expenses) * 100, 2)
        else:
            change_percentage = 0.0

        return {
            "this_month": {
                "total_amount": this_month_expenses,
                "expense_count": this_month_count,
                "change_percentage": change_percentage,
                "total_income": this_month_income,
                "net_cashflow": this_month_net_cashflow,
                "savings_rate": round(this_month_savings_rate, 2),
                "total_investments": this_month_investments
            },
            "prev_month": {
                "total_amount": prev_month_expenses,
                "expense_count": prev_month_count
            },
            "this_year": {
                "total_amount": this_year_expenses,
                "expense_count": this_year_count,
                "total_income": this_year_income,
                "net_cashflow": this_year_net_cashflow
            }
        }

    async def get_category_breakdown(self, user_id: uuid.UUID) -> dict:
        stmt = select(
            Expense.category,
            func.coalesce(func.sum(Expense.amount), 0.0)
        ).where(
            Expense.user_id == user_id,
            Expense.nature == "EXPENSE"
        ).group_by(Expense.category)
        
        res = await self.db.execute(stmt)
        breakdown = {}
        for row in res.all():
            cat = row[0]
            cat_name = cat.value if hasattr(cat, "value") else str(cat)
            breakdown[cat_name] = float(row[1])
        return breakdown

    async def get_monthly_trend(self, user_id: uuid.UUID) -> list:
        today = date_type.today()
        # Start exactly 11 months ago to include the current month in the 12-month window
        year = today.year
        month = today.month - 11
        while month <= 0:
            month += 12
            year -= 1
        start_date = date_type(year, month, 1)

        stmt = select(
            extract('year', Expense.expense_date).label('year'),
            extract('month', Expense.expense_date).label('month'),
            Expense.nature,
            func.coalesce(func.sum(Expense.amount), 0.0)
        ).where(
            Expense.user_id == user_id,
            Expense.expense_date >= start_date
        ).group_by(
            extract('year', Expense.expense_date),
            extract('month', Expense.expense_date),
            Expense.nature
        ).order_by(
            extract('year', Expense.expense_date),
            extract('month', Expense.expense_date)
        )

        res = await self.db.execute(stmt)
        # Store results as {(year, month, nature): amount}
        results = {}
        for r in res.all():
            if r[0] is not None and r[1] is not None and r[2] is not None:
                results[(int(r[0]), int(r[1]), r[2])] = float(r[3])

        months_short = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        trend = []
        
        current_date = start_date
        for _ in range(12):
            key_expenses = (current_date.year, current_date.month, "EXPENSE")
            key_income = (current_date.year, current_date.month, "INCOME")
            key_investments = (current_date.year, current_date.month, "INVESTMENT")
            
            exp_amt = results.get(key_expenses, 0.0)
            inc_amt = results.get(key_income, 0.0)
            inv_amt = results.get(key_investments, 0.0)
            
            trend.append({
                "month": f"{months_short[current_date.month - 1]} {str(current_date.year)[2:]}",
                "expenses": exp_amt,
                "income": inc_amt,
                "investments": inv_amt,
                "amount": exp_amt
            })
            
            if current_date.month == 12:
                current_date = date_type(current_date.year + 1, 1, 1)
            else:
                current_date = date_type(current_date.year, current_date.month + 1, 1)
                
        return trend

    async def get_insights(self, user_id: uuid.UUID) -> list:
        # Check if there are user insights explicitly saved in the DB first
        stmt = select(ExpenseInsight).where(ExpenseInsight.user_id == user_id).order_by(ExpenseInsight.created_at.desc())
        res = await self.db.execute(stmt)
        saved_insights = list(res.scalars().all())
        
        # If there are explicit insights in the database, return them
        if saved_insights:
            return [{"type": ins.insight_type, "message": ins.message} for ins in saved_insights]
            
        # Otherwise, calculate dynamic insights on the fly
        today = date_type.today()
        first_day_this_month = date_type(today.year, today.month, 1)
        
        if today.month == 1:
            first_day_prev_month = date_type(today.year - 1, 12, 1)
            last_day_prev_month = date_type(today.year - 1, 12, 31)
        else:
            first_day_prev_month = date_type(today.year, today.month - 1, 1)
            _, last_day = monthrange(today.year, today.month - 1)
            last_day_prev_month = date_type(today.year, today.month - 1, last_day)

        # 1. Fetch this month's spending by category
        stmt_this = select(
            Expense.category,
            func.coalesce(func.sum(Expense.amount), 0.0)
        ).where(
            Expense.user_id == user_id,
            Expense.nature == "EXPENSE",
            Expense.expense_date >= first_day_this_month,
            Expense.expense_date <= today
        ).group_by(Expense.category)
        res_this = await self.db.execute(stmt_this)
        this_month_cats = {row[0].value if hasattr(row[0], "value") else str(row[0]): float(row[1]) for row in res_this.all()}
        this_month_total = sum(this_month_cats.values())

        # 2. Fetch last month's spending by category
        stmt_prev = select(
            Expense.category,
            func.coalesce(func.sum(Expense.amount), 0.0)
        ).where(
            Expense.user_id == user_id,
            Expense.nature == "EXPENSE",
            Expense.expense_date >= first_day_prev_month,
            Expense.expense_date <= last_day_prev_month
        ).group_by(Expense.category)
        res_prev = await self.db.execute(stmt_prev)
        prev_month_cats = {row[0].value if hasattr(row[0], "value") else str(row[0]): float(row[1]) for row in res_prev.all()}
        prev_month_total = sum(prev_month_cats.values())

        dynamic_insights = []

        # Insight A: Category specific changes MoM
        for cat, this_amt in this_month_cats.items():
            prev_amt = prev_month_cats.get(cat, 0.0)
            if prev_amt > 0:
                change = ((this_amt - prev_amt) / prev_amt) * 100
                if change >= 10.0:
                    dynamic_insights.append({
                        "type": "SPENDING_INCREASE",
                        "message": f"Dining/Spending on {cat} increased by {int(change)}% compared to last month."
                    })
                elif change <= -10.0:
                    dynamic_insights.append({
                        "type": "SPENDING_DECREASE",
                        "message": f"Great job! Your spending on {cat} decreased by {int(abs(change))}% compared to last month."
                    })

        # Insight B: Dominant Category Alert
        if this_month_total > 0:
            dominant_cat = max(this_month_cats, key=this_month_cats.get)
            dom_amt = this_month_cats[dominant_cat]
            pct = (dom_amt / this_month_total) * 100
            if pct >= 30.0:
                dynamic_insights.append({
                    "type": "CATEGORY_ALERT",
                    "message": f"Spending on {dominant_cat} represents {int(pct)}% of your total budget this month."
                })

        # Insight C: Overall spending MoM trend
        if prev_month_total > 0 and this_month_total > 0:
            overall_change = ((this_month_total - prev_month_total) / prev_month_total) * 100
            if overall_change >= 15.0:
                dynamic_insights.append({
                    "type": "SPENDING_INCREASE",
                    "message": f"Your overall spending is up {int(overall_change)}% compared to last month. Consider review."
                })
            elif overall_change <= -15.0:
                dynamic_insights.append({
                    "type": "SPENDING_DECREASE",
                    "message": f"Excellent budget control! Overall expenses dropped by {int(abs(overall_change))}% this month."
                })

        # Intelligent empty state fallback
        if not dynamic_insights:
            dynamic_insights.append({
                "type": "CATEGORY_ALERT",
                "message": "No unusual spending patterns or significant category shifts detected yet."
            })

        return dynamic_insights
