import os
from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "StockMarketAnalyzer"
    DEBUG: bool = False
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = "0.0.0.0"
    
    # Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super-secret-key-for-stock-analysis-app-2026")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    
    # Database
    # Use SQLite locally by default, allowing PostgreSQL via environment variable
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./stocks.db")
    
    # CORS – allow localhost for dev + any deployed Vercel/custom frontend URL
    @property
    def CORS_ORIGINS(self) -> List[str]:
        origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
        ]
        # Allow the production frontend URL (set in Render env vars)
        frontend_url = os.getenv("FRONTEND_URL", "")
        if frontend_url:
            origins.append(frontend_url.rstrip("/"))
        # Also allow all vercel.app subdomains via a wildcard-safe list entry
        extra = os.getenv("CORS_ORIGINS", "")
        if extra:
            origins.extend([u.strip() for u in extra.split(",") if u.strip()])
        return origins

    # SMTP Email Settings
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: Optional[str] = None
    SMTP_TLS: bool = True
    GOOGLE_CLIENT_ID: Optional[str] = None

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
