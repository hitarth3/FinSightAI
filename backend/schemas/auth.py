import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    monthly_income: float = Field(default=0.0)
    risk_profile: str = Field(default="Moderate")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    device_name: str = Field(default="web-browser")


class OtpVerifyRequest(BaseModel):
    user_id: uuid.UUID
    otp_code: str = Field(..., min_length=6, max_length=6)
    device_name: str = Field(default="web-browser")


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: uuid.UUID
    full_name: str
    email: EmailStr
    monthly_income: float
    risk_profile: str
    is_active: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    requires_mfa: bool
    user_id: Optional[uuid.UUID] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    expires_in: Optional[int] = None


class GoogleLoginRequest(BaseModel):
    token: Optional[str] = None
    email: Optional[str] = None
    device_name: str = Field(default="google-oauth")
