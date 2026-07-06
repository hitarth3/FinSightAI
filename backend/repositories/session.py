from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.session import Session
from repositories.base import BaseRepository


class SessionRepository(BaseRepository[Session]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(Session, db)

    async def get_by_refresh_token(self, token: str) -> Optional[Session]:
        """Queries active sessions belonging to matching refresh tokens."""
        query = await self.db.execute(select(Session).where(Session.refresh_token == token))
        return query.scalars().first()
