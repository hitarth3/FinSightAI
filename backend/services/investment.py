import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from models.investment import Investment
from repositories.investment import InvestmentRepository


class InvestmentService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = InvestmentRepository(db)

    async def get_investment(self, id: uuid.UUID, user_id: uuid.UUID) -> Optional[Investment]:
        investment = await self.repo.get(id)
        if investment and investment.user_id == user_id:
            return investment
        return None

    async def get_user_investments(self, user_id: uuid.UUID) -> List[Investment]:
        return await self.repo.get_by_user(user_id)

    async def create_investment(self, user_id: uuid.UUID, obj_in: Dict[str, Any]) -> Investment:
        obj_in["user_id"] = user_id
        return await self.repo.create(obj_in)

    async def update_investment(self, id: uuid.UUID, user_id: uuid.UUID, obj_in: Dict[str, Any]) -> Optional[Investment]:
        investment = await self.get_investment(id, user_id)
        if not investment:
            return None
        return await self.repo.update(investment, obj_in)

    async def delete_investment(self, id: uuid.UUID, user_id: uuid.UUID) -> bool:
        investment = await self.get_investment(id, user_id)
        if not investment:
            return False
        return await self.repo.delete(id)
