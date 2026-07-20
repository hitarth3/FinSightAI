from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
import uuid

from models.card import UserCreditCard, CreditCardCatalog
from repositories.base import BaseRepository


class CardRepository(BaseRepository[UserCreditCard]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(UserCreditCard, db)

    async def get_user_cards(self, user_id: uuid.UUID) -> List[UserCreditCard]:
        query = await self.db.execute(
            select(UserCreditCard)
            .options(selectinload(UserCreditCard.catalog))
            .where(UserCreditCard.user_id == user_id)
        )
        return list(query.scalars().all())

    async def get_card_with_catalog(self, id: uuid.UUID, user_id: uuid.UUID) -> Optional[UserCreditCard]:
        query = await self.db.execute(
            select(UserCreditCard)
            .options(selectinload(UserCreditCard.catalog))
            .where(UserCreditCard.id == id, UserCreditCard.user_id == user_id)
        )
        return query.scalars().first()


class CardCatalogRepository(BaseRepository[CreditCardCatalog]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(CreditCardCatalog, db)

    async def get_by_bank_and_name(self, bank_name: str, card_name: str) -> Optional[CreditCardCatalog]:
        query = await self.db.execute(
            select(CreditCardCatalog)
            .where(
                CreditCardCatalog.bank_name.ilike(bank_name.strip()),
                CreditCardCatalog.card_name.ilike(card_name.strip())
            )
        )
        return query.scalars().first()
