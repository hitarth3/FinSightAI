from sqlalchemy.ext.asyncio import AsyncSession

from models.loan import Loan
from repositories.base import BaseRepository


class LoanRepository(BaseRepository[Loan]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(Loan, db)
