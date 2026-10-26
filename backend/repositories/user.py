from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User
from repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(User, db)

    async def get_by_email(self, email: str, for_update: bool = False) -> Optional[User]:
        """Queries database User table specifically on credentials email string."""
        statement = select(User).where(User.email == email)
        if for_update:
            statement = statement.with_for_update()
        query = await self.db.execute(statement)
        return query.scalars().first()
