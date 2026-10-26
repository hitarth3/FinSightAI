from sqlalchemy.ext.asyncio import AsyncSession

from models.stock import Stock
from repositories.base import BaseRepository


class StockRepository(BaseRepository[Stock]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(Stock, db)
