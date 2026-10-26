from typing import Any, Generic, List, Optional, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class StandardResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Operation successful"
    data: Optional[T] = None


class StandardErrorResponse(BaseModel):
    success: bool = False
    message: str = "An error occurred"
    errors: List[Any] = []
