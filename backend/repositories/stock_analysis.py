from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from models.stock_analysis import StockAnalysis
from repositories.base import BaseRepository


class StockAnalysisRepository(BaseRepository[StockAnalysis]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(StockAnalysis, db)

    async def get_latest_by_symbol(self, symbol: str) -> Optional[StockAnalysis]:
        """Fetches the latest AI analysis record saved for the given symbol."""
        symbol = symbol.strip().upper()
        query = await self.db.execute(
            select(self.model)
            .where(self.model.symbol == symbol)
            .order_by(self.model.analysis_generated_at.desc())
            .limit(1)
        )
        return query.scalars().first()
