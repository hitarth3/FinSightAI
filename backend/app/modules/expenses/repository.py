import uuid
from typing import List, Optional
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from repositories.base import BaseRepository
from app.modules.expenses.models import Expense, ExpenseUpload, ExpenseInsight


class ExpenseRepository(BaseRepository[Expense]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(Expense, db)

    async def get_by_user(self, user_id: uuid.UUID, limit: Optional[int] = 100, offset: int = 0) -> List[Expense]:
        """Fetch expenses belonging to a specific user with query limits and indexed sorting."""
        stmt = (
            select(Expense)
            .where(
                Expense.user_id == user_id
            )
            .order_by(desc(Expense.expense_date), desc(Expense.created_at))
        )
        if limit is not None:
            stmt = stmt.limit(limit).offset(offset)
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_top_merchants(self, user_id: uuid.UUID, limit: int = 10) -> List[dict]:
        """Fetch top merchants for a user ordered by total spending."""
        stmt = (
            select(
                Expense.merchant,
                func.sum(Expense.amount).label("amount"),
                func.count(Expense.id).label("count")
            )
            .where(
                Expense.user_id == user_id,
                Expense.nature == "EXPENSE"
            )
            .group_by(Expense.merchant)
            .order_by(desc(func.sum(Expense.amount)))
            .limit(limit)
        )
        res = await self.db.execute(stmt)
        return [{"merchant": r[0], "amount": float(r[1]), "count": int(r[2])} for r in res.all()]


class ExpenseUploadRepository(BaseRepository[ExpenseUpload]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(ExpenseUpload, db)


class ExpenseInsightRepository(BaseRepository[ExpenseInsight]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(ExpenseInsight, db)
