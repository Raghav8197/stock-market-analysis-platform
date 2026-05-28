from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# Auth Schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None

# Watchlist Schemas
class WatchlistCreate(BaseModel):
    symbol: str

class WatchlistResponse(BaseModel):
    id: int
    user_id: int
    symbol: str
    created_at: datetime

    class Config:
        from_attributes = True

# Alert Schemas
class AlertCreate(BaseModel):
    symbol: str
    alert_type: str  # 'PRICE_ABOVE', 'PRICE_BELOW', 'PATTERN_DETECTED'
    target_value: Optional[float] = None
    target_pattern: Optional[str] = None

class AlertResponse(BaseModel):
    id: int
    user_id: int
    symbol: str
    alert_type: str
    target_value: Optional[float]
    target_pattern: Optional[str]
    is_triggered: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Analysis History Schemas
class AnalysisHistoryCreate(BaseModel):
    symbol: str
    signal: str
    confidence: float
    details: Optional[Dict[str, Any]] = None

class AnalysisHistoryResponse(BaseModel):
    id: int
    user_id: int
    symbol: str
    signal: str
    confidence: float
    details: Optional[Dict[str, Any]]
    analysis_date: datetime

    class Config:
        from_attributes = True

# Stock Screener Options
class ScreenerFilter(BaseModel):
    market: str = "US"  # "US" or "IN"
    rsi_filter: Optional[str] = None  # "oversold", "overbought"
    pattern_filter: Optional[str] = None  # "doji", "hammer", "engulfing", etc.
    volume_breakout: Optional[bool] = False
