import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.security import hash_password, verify_password, create_access_token, generate_refresh_token
from models.user import User
from models.session import Session
from models.otp import OTPVerification
from models.audit import AuditLog
from repositories.user import UserRepository
from repositories.session import SessionRepository
from repositories.otp import OTPRepository
from repositories.audit import AuditRepository


def ensure_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.user_repo = UserRepository(db)
        self.session_repo = SessionRepository(db)
        self.otp_repo = OTPRepository(db)
        self.audit_repo = AuditRepository(db)

    async def register(self, obj_in: Dict[str, Any]) -> User:
        """Registers a new User and hashes their credentials password."""
        existing_user = await self.user_repo.get_by_email(obj_in["email"])
        if existing_user:
            raise ValueError("Email address already registered.")

        # Hash credentials password
        plain_password = obj_in.pop("password")
        obj_in["password_hash"] = hash_password(plain_password)
        obj_in["is_active"] = True
        obj_in["is_verified"] = False

        user = await self.user_repo.create(obj_in)
        
        # Log Audit Trail
        await self.audit_repo.create({
            "user_id": user.id,
            "event_type": "USER_REGISTERED",
            "event_description": f"User account created for {user.email}",
            "ip_address": "localhost"
        })
        return user

    async def login(self, email: str, password: str, device_name: str, ip_address: str) -> Dict[str, Any]:
        """Validates credentials and returns a direct token set or an MFA challenge."""
        user = await self.user_repo.get_by_email(email, for_update=True)

        # Lockout check — applies even before password verification so a locked
        # account can't be used to keep guessing passwords.
        if user and user.locked_until and ensure_utc(user.locked_until) > datetime.now(timezone.utc):
            remaining = int((ensure_utc(user.locked_until) - datetime.now(timezone.utc)).total_seconds() // 60) + 1
            raise ValueError(f"Account temporarily locked due to repeated failed attempts. Try again in {remaining} minute(s).")

        if not user or not verify_password(password, user.password_hash):
            if user:
                user.failed_login_attempts += 1
                if user.failed_login_attempts >= settings.RATE_LIMIT_ATTEMPTS:
                    user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=settings.RATE_LIMIT_DURATION)
                    await self.audit_repo.create({
                        "user_id": user.id,
                        "event_type": "ACCOUNT_LOCKED",
                        "event_description": f"Account locked for {settings.RATE_LIMIT_DURATION} minutes after {user.failed_login_attempts} failed login attempts.",
                        "ip_address": ip_address
                    })
                self.db.add(user)
                await self.db.flush()
            raise ValueError("Incorrect email or password.")

        if not user.is_active:
            raise ValueError("User account is inactive.")

        # Reset lockout counters on a successful credential check
        if user.failed_login_attempts or user.locked_until:
            user.failed_login_attempts = 0
            user.locked_until = None
            self.db.add(user)
            await self.db.flush()

        # Trigger Multi-Factor Authentication OTP Verification
        if settings.ENABLE_MFA:
            # MFA remains optional until a code-delivery adapter is deployed.
            import secrets
            otp_code = f"{secrets.randbelow(900000) + 100000}"

            # Save OTP record
            expiry = datetime.now(timezone.utc) + timedelta(minutes=5)
            await self.otp_repo.create({
                "user_id": user.id,
                "otp_code": otp_code,
                "is_used": False,
                "attempts": 0,
                "expires_at": expiry
            })

            # Log dispatch audit — the actual OTP code is intentionally excluded;
            # logging it would let anyone with audit-log read access bypass MFA.
            await self.audit_repo.create({
                "user_id": user.id,
                "event_type": "MFA_OTP_DISPATCHED",
                "event_description": "MFA code generated; delivery provider is not configured.",
                "ip_address": ip_address
            })

            return {
                "requires_mfa": True,
                "user_id": user.id
            }

        # Non-MFA direct session login setup
        session_data = await self._create_user_session(user, device_name, ip_address)
        return {
            "requires_mfa": False,
            "user_id": user.id,
            "access_token": session_data["access_token"],
            "refresh_token": session_data["refresh_token"],
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }

    async def verify_otp(self, user_id: uuid.UUID, code: str, device_name: str, ip_address: str) -> Dict[str, Any]:
        """Validates OTP verification codes and yields short-lived JWT access tokens."""
        user = await self.user_repo.get(user_id)
        if not user:
            raise ValueError("User account could not be found.")

        if not user.is_active:
            raise ValueError("User account is inactive.")

        # Fetch latest OTP verification record
        latest_otp = await self.otp_repo.get_latest_otp(user.id)
        if not latest_otp:
            raise ValueError("No active OTP requests found for this user.")

        # Validate expirations safely across Postgres and SQLite
        now = datetime.now(timezone.utc)
        if ensure_utc(latest_otp.expires_at) < now:
            raise ValueError("Verification code has expired.")

        if latest_otp.attempts >= settings.RATE_LIMIT_ATTEMPTS:
            latest_otp.is_used = True
            self.db.add(latest_otp)
            await self.db.flush()
            raise ValueError("Too many incorrect attempts. Please request a new verification code.")

        if latest_otp.otp_code != code:
            latest_otp.attempts += 1
            error = "Incorrect verification code."
            if latest_otp.attempts >= settings.RATE_LIMIT_ATTEMPTS:
                latest_otp.is_used = True
                error = "Too many incorrect attempts. Please request a new verification code."
            self.db.add(latest_otp)
            await self.db.flush()
            raise ValueError(error)

        # Mark OTP as used
        latest_otp.is_used = True
        self.db.add(latest_otp)
        await self.db.flush()

        # Initialize full user login session
        session_data = await self._create_user_session(user, device_name, ip_address)
        
        # Log successful audit
        await self.audit_repo.create({
            "user_id": user.id,
            "event_type": "MFA_SUCCESS",
            "event_description": "MFA verification successfully passed.",
            "ip_address": ip_address
        })

        return {
            "access_token": session_data["access_token"],
            "refresh_token": session_data["refresh_token"],
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }

    async def refresh(self, refresh_token: str) -> Dict[str, Any]:
        """Performs JWT rotation: invalidates current token and yields a fresh pair."""
        session = await self.session_repo.get_by_refresh_token(refresh_token)
        if not session:
            raise ValueError("Invalid refresh token.")

        now = datetime.now(timezone.utc)
        if ensure_utc(session.expires_at) < now:
            await self.session_repo.delete(session.id)
            raise ValueError("Refresh token expired. Please login again.")

        user = await self.user_repo.get(session.user_id)
        if not user or not user.is_active:
            raise ValueError("User profile is inactive or deleted.")

        # Rotate tokens: generate new refresh
        new_refresh = generate_refresh_token()
        session.refresh_token = new_refresh
        session.created_at = datetime.now(timezone.utc)
        session.expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        self.db.add(session)
        await self.db.flush()

        # Generate fresh Access JWT
        access_token = create_access_token(user.id, session_id=session.id)

        return {
            "access_token": access_token,
            "refresh_token": new_refresh,
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }

    async def logout(self, refresh_token: str) -> None:
        """Revokes specific user session and deletes the refresh token relationship."""
        session = await self.session_repo.get_by_refresh_token(refresh_token)
        if session:
            # Delete active session record
            await self.session_repo.delete(session.id)
            
            # Log audit
            await self.audit_repo.create({
                "user_id": session.user_id,
                "event_type": "USER_LOGGED_OUT",
                "event_description": "Active session terminated by client.",
                "ip_address": "localhost"
            })

    async def _create_user_session(self, user: User, device_name: str, ip_address: str) -> Dict[str, Any]:
        """Creates session record and returns JWT access/refresh token sets."""
        refresh_token = generate_refresh_token()
        expiry = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        session = await self.session_repo.create({
            "user_id": user.id,
            "refresh_token": refresh_token,
            "device_name": device_name,
            "ip_address": ip_address,
            "expires_at": expiry
        })

        access_token = create_access_token(user.id, session_id=session.id)

        # Log session audit
        await self.audit_repo.create({
            "user_id": user.id,
            "event_type": "LOGIN_SUCCESS",
            "event_description": f"Login successful using device: {device_name}",
            "ip_address": ip_address
        })

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "session_id": session.id
        }

    async def google_auth(self, token: Optional[str], email: Optional[str], device_name: str, ip_address: str) -> Dict[str, Any]:
        """Authenticates user with Google, registering them dynamically if they do not exist yet."""
        if not token:
            raise ValueError("Google ID token is required for authentication.")

        if not settings.GOOGLE_CLIENT_ID:
            raise ValueError("Google Sign-In is not configured on this server.")

        user_email = None
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={token}")
                if response.status_code != 200:
                    raise ValueError("Google token verification failed.")
                payload = response.json()
        except Exception as e:
            if isinstance(e, ValueError):
                raise
            raise ValueError(f"Google verification network error: {str(e)}")

        # Verify the token was actually issued for THIS application. Without this
        # check, a Google ID token minted for any other app can be replayed here
        # to log in as that email's user.
        if payload.get("aud") != settings.GOOGLE_CLIENT_ID:
            raise ValueError("Google token was not issued for this application.")

        if str(payload.get("email_verified")).lower() != "true":
            raise ValueError("Google account email is not verified.")

        user_email = payload.get("email")
        if not user_email:
            raise ValueError("Invalid Google authentication credentials.")

        user = await self.user_repo.get_by_email(user_email)
        if not user:
            # Register user dynamically
            user = await self.user_repo.create({
                "full_name": user_email.split("@")[0].title().replace(".", " "),
                "email": user_email,
                "password_hash": hash_password(generate_refresh_token()),
                "monthly_income": 0.0,
                "risk_profile": "Moderate",
                "is_active": True,
                "is_verified": True
            })
            await self.audit_repo.create({
                "user_id": user.id,
                "event_type": "USER_REGISTERED_OAUTH",
                "event_description": f"User account created via Google OAuth for {user.email}",
                "ip_address": ip_address
            })
        
        if not user.is_active:
            raise ValueError("User account is inactive.")

        # Bypass MFA for social logins (pre-authenticated by provider)
        session_data = await self._create_user_session(user, device_name, ip_address)
        return {
            "requires_mfa": False,
            "user_id": user.id,
            "access_token": session_data["access_token"],
            "refresh_token": session_data["refresh_token"],
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }

