import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from models.loan import Loan
from repositories.loan import LoanRepository


class LoanService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = LoanRepository(db)

    async def get_loan(self, id: uuid.UUID, user_id: uuid.UUID) -> Optional[Loan]:
        loan = await self.repo.get(id)
        if loan and loan.user_id == user_id:
            return loan
        return None

    async def get_user_loans(self, user_id: uuid.UUID) -> List[Loan]:
        return await self.repo.get_by_user(user_id)

    async def create_loan(self, user_id: uuid.UUID, obj_in: Dict[str, Any]) -> Loan:
        obj_in["user_id"] = user_id
        return await self.repo.create(obj_in)

    async def update_loan(self, id: uuid.UUID, user_id: uuid.UUID, obj_in: Dict[str, Any]) -> Optional[Loan]:
        loan = await self.get_loan(id, user_id)
        if not loan:
            return None
        return await self.repo.update(loan, obj_in)

    async def delete_loan(self, id: uuid.UUID, user_id: uuid.UUID) -> bool:
        loan = await self.get_loan(id, user_id)
        if not loan:
            return False
        return await self.repo.delete(id)
