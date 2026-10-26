from sqlalchemy.ext.asyncio import AsyncSession

from models.investment import Investment
from repositories.base import BaseRepository


class InvestmentRepository(BaseRepository[Investment]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(Investment, db)
