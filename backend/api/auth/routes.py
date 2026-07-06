from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from database.session import get_db
from schemas.base import StandardResponse
from schemas.auth import RegisterRequest, LoginRequest, OtpVerifyRequest, RefreshRequest, LoginResponse, UserResponse, GoogleLoginRequest
from services.auth import AuthService
from core.dependencies import get_current_user
from models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=StandardResponse[UserResponse], status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)) -> Any:
    """Registers user credentials, hashes passwords, and initializes audit records."""
    auth_service = AuthService(db)
    try:
        user = await auth_service.register(payload.model_dump())
        return StandardResponse(
            success=True,
            message="User registration completed successfully.",
            data=UserResponse.model_validate(user)
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=StandardResponse[LoginResponse])
async def login(payload: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)) -> Any:
    """Authenticates credentials, incrementing locking metrics or prompting OTP verification."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    auth_service = AuthService(db)
    try:
        result = await auth_service.login(
            email=payload.email,
            password=payload.password,
            device_name=payload.device_name,
            ip_address=client_ip
        )
        message = "OTP verification code dispatched." if result["requires_mfa"] else "Login successful."
        return StandardResponse(
            success=True,
            message=message,
            data=LoginResponse(**result)
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/verify-otp", response_model=StandardResponse[LoginResponse])
async def verify_otp(payload: OtpVerifyRequest, request: Request, db: AsyncSession = Depends(get_db)) -> Any:
    """Validates temporary verification codes, initiating active login sessions."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    auth_service = AuthService(db)
    try:
        result = await auth_service.verify_otp(
            user_id=payload.user_id,
            code=payload.otp_code,
            device_name=payload.device_name,
            ip_address=client_ip
        )
        return StandardResponse(
            success=True,
            message="MFA verification successful. Session initialized.",
            data=LoginResponse(requires_mfa=False, **result)
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/refresh", response_model=StandardResponse[LoginResponse])
async def refresh_session(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> Any:
    """Rotates refresh tokens, providing fresh short-lived access elements."""
    auth_service = AuthService(db)
    try:
        result = await auth_service.refresh(payload.refresh_token)
        return StandardResponse(
            success=True,
            message="Token rotation successful.",
            data=LoginResponse(requires_mfa=False, **result)
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/google", response_model=StandardResponse[LoginResponse])
async def google_login(payload: GoogleLoginRequest, request: Request, db: AsyncSession = Depends(get_db)) -> Any:
    """Authenticates credentials dynamically via Google Sign-In and initializes session."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    auth_service = AuthService(db)
    try:
        result = await auth_service.google_auth(
            token=payload.token,
            email=payload.email,
            device_name=payload.device_name,
            ip_address=client_ip
        )
        return StandardResponse(
            success=True,
            message="Google authentication successful.",
            data=LoginResponse(**result)
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/logout", response_model=StandardResponse[None])
async def logout(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> Any:
    """Revokes specific credentials session, invalidating the refresh token."""
    auth_service = AuthService(db)
    await auth_service.logout(payload.refresh_token)
    return StandardResponse(
        success=True,
        message="Logout completed. Session revoked."
    )


@router.get("/me", response_model=StandardResponse[UserResponse])
async def get_me(current_user: User = Depends(get_current_user)) -> Any:
    """Retrieves active profile metadata belonging to the validated caller."""
    return StandardResponse(
        success=True,
        message="Active profile fetched.",
        data=UserResponse.model_validate(current_user)
    )
