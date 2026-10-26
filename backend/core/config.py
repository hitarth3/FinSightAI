import os
from typing import Optional
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

# Load .env variables into environment
load_dotenv()


INSECURE_DEFAULT_SECRET_KEY = "change_this_in_production_9a3c8e96bf328905b79d20c572ab67cf"


class Settings(BaseSettings):
    APP_NAME: str = "FinSightAI"
    DEBUG: bool = False
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/finsight"
    SECRET_KEY: str = INSECURE_DEFAULT_SECRET_KEY
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    ENABLE_MFA: bool = False
    RATE_LIMIT_ATTEMPTS: int = 5
    RATE_LIMIT_DURATION: int = 30

    GROQ_API_KEY: Optional[str] = None
    GROK_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None
    GOOGLE_CLIENT_ID: Optional[str] = None
    AI_PROVIDER: str = "groq"
    YAHOO_FINANCE_API_KEY: Optional[str] = None
    N8N_ANALYTIC_WEBHOOK_URL: Optional[str] = None
    CORS_ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    SUPABASE_JWT_SECRET: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    @model_validator(mode="after")
    def validate_production(self):
        if not self.DEBUG:
            if self.SECRET_KEY == INSECURE_DEFAULT_SECRET_KEY or len(self.SECRET_KEY) < 32 or self.SECRET_KEY.startswith("your_"):
                raise ValueError("Production requires a unique SECRET_KEY of at least 32 characters.")
            if self.ENABLE_MFA:
                raise ValueError("MFA delivery is not implemented. Keep ENABLE_MFA=False until a delivery provider is integrated.")
            origins = [origin.strip() for origin in self.CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]
            if not origins or "*" in origins:
                raise ValueError("Production requires explicit CORS_ALLOWED_ORIGINS; wildcards are not allowed.")
        return self

    def get_normalized_database_url(self) -> str:
        url = self.DATABASE_URL.strip()
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url


settings = Settings()
# Ensure normalized DATABASE_URL in settings
settings.DATABASE_URL = settings.get_normalized_database_url()

