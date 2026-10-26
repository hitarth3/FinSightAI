from sqlalchemy.ext.asyncio import AsyncSession

from models.audit import AuditLog
from repositories.base import BaseRepository


class AuditRepository(BaseRepository[AuditLog]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(AuditLog, db)
