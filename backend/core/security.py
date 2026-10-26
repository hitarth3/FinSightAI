import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Union
from jose import JWTError, jwt
import hashlib
import secrets

from core.config import settings


def hash_password(password: str) -> str:
    """Hashes a plain text password using PBKDF2 SHA-256."""
    iterations = 100000
    salt = secrets.token_hex(16)
    hash_bytes = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations
    )
    return f"pbkdf2_sha256${iterations}${salt}${hash_bytes.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain text password against a hashed value."""
    try:
        if not hashed_password.startswith("pbkdf2_sha256$"):
            return False
        parts = hashed_password.split("$")
        if len(parts) != 4:
            return False
        _, iterations_str, salt, hash_hex = parts
        iterations = int(iterations_str)
        hash_bytes = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt.encode("utf-8"),
            iterations
        )
        return secrets.compare_digest(hash_bytes.hex(), hash_hex)
    except Exception:
        return False


def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None, session_id: Optional[Union[str, Any]] = None) -> str:
    """Generates a secure JSON Web Token (JWT) Access Token."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": "access"
    }
    if session_id:
        to_encode["sid"] = str(session_id)
    
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def generate_refresh_token() -> str:
    """Generates a highly secure cryptographically random token string."""
    return secrets.token_hex(32)
