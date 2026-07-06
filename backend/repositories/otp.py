from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.otp import OTPVerification
from repositories.base import BaseRepository


class OTPRepository(BaseRepository[OTPVerification]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(OTPVerification, db)

    async def get_latest_otp(self, user_id: str) -> Optional[OTPVerification]:
        """Queries for the latest generated OTP code corresponding to user_id."""
        query = await self.db.execute(
            select(OTPVerification)
            .where(OTPVerification.user_id == user_id, OTPVerification.is_used == False)
            .order_by(OTPVerification.created_at.desc())
        )
        return query.scalars().first()
