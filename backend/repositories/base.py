import uuid
from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from database.session import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType], db: AsyncSession) -> None:
        self.model = model
        self.db = db

    async def get(self, id: uuid.UUID) -> Optional[ModelType]:
        """Fetch model by unique UUID."""
        query = await self.db.execute(select(self.model).where(self.model.id == id))
        return query.scalars().first()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        """Fetch multiple models using pagination offsets."""
        query = await self.db.execute(select(self.model).offset(skip).limit(limit))
        return list(query.scalars().all())

    async def get_by_user(self, user_id: uuid.UUID, skip: int = 0, limit: Optional[int] = 100) -> List[ModelType]:
        """Fetch models belonging to a specific user with safe query limits."""
        if hasattr(self.model, "user_id"):
            stmt = select(self.model).where(self.model.user_id == user_id).offset(skip)
            if limit is not None:
                stmt = stmt.limit(limit)
            query = await self.db.execute(stmt)
            return list(query.scalars().all())
        return []

    async def create(self, obj_in: Dict[str, Any]) -> ModelType:
        """Saves a new model instance inside active session transactions."""
        db_obj = self.model(**obj_in)
        self.db.add(db_obj)
        await self.db.flush()
        return db_obj

    async def update(self, db_obj: ModelType, obj_in: Dict[str, Any]) -> ModelType:
        """Modifies and commits changes to a database object."""
        for field, value in obj_in.items():
            if hasattr(db_obj, field) and value is not None:
                setattr(db_obj, field, value)
        self.db.add(db_obj)
        await self.db.flush()
        return db_obj

    async def delete(self, id: uuid.UUID) -> bool:
        """Deletes a database record by id."""
        db_obj = await self.get(id)
        if db_obj:
            await self.db.delete(db_obj)
            await self.db.flush()
            return True
        return False
