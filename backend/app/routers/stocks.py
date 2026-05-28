from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app.database import get_db
from app import models, schemas, auth, data_fetcher, ai_signal
from app.patterns import scan_patterns
from app.indicators import add_all_indicators

router = APIRouter(
    prefix="/api/stocks",
    tags=["Stocks & Analysis"]
)

# Screener Stock Universe
SCREENER_UNIVERSE = [
    "AAPL", "MSFT", "TSLA", "NVDA", "AMZN", 
    "RELIANCE", "TCS", "INFY", "HDFCBANK", 
    "BTC", "ETH"
]

@router.get("/{symbol}/history")
def get_stock_history(symbol: str, timeframe: str = Query("1D", description="Timeframe: 1m, 5m, 1D, 1W")):
    try:
        data = data_fetcher.analyze_and_package_stock(symbol, timeframe)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch stock history: {str(e)}"
        )

@router.get("/{symbol}/summary")
def get_stock_summary(symbol: str):
    try:
        fundamentals = data_fetcher.fetch_fundamentals(symbol)
        current_price = data_fetcher.get_live_ticker_price(symbol)
        
        # Add current price into summary
        fundamentals["current_price"] = current_price
        return fundamentals
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch stock fundamentals: {str(e)}"
        )

@router.get("/{symbol}/analysis")
def get_stock_analysis(
    symbol: str,
    n_estimators: int = Query(50, ge=5, le=250, description="Number of trees in Random Forest"),
    max_depth: int = Query(5, ge=2, le=20, description="Max depth of Trees"),
    horizon: int = Query(3, ge=1, le=15, description="Lookahead horizon days"),
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user)
):
    try:
        # Fetch historical data
        df = data_fetcher.fetch_history(symbol, timeframe="1D")
        
        # Apply calculations
        df_indicators = add_all_indicators(df)
        df_full = scan_patterns(df_indicators)
        df_full.attrs["symbol"] = symbol.upper()
        
        # Run AI signal generator (which trains RandomForest dynamically)
        analysis_result = ai_signal.generate_ai_signal(
            df_full,
            n_estimators=n_estimators,
            max_depth=max_depth,
            horizon=horizon
        )
        
        # Save to DB if authenticated user is present
        if current_user:
            history_entry = models.AnalysisHistory(
                user_id=current_user.id,
                symbol=symbol.upper(),
                signal=analysis_result["signal"],
                confidence=analysis_result["confidence"],
                details={
                    "reasons": analysis_result["reasons"],
                    "indicators": analysis_result["indicators"],
                    "ml_model_active": analysis_result["ml_model_active"]
                }
            )
            db.add(history_entry)
            db.commit()
            
        return analysis_result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to run AI analysis: {str(e)}"
        )

@router.get("/screener/scan")
def screen_stocks(
    market: str = Query("ALL", description="ALL, US, IN"),
    rsi_filter: Optional[str] = Query(None, description="oversold (RSI < 35), overbought (RSI > 65)"),
    pattern_filter: Optional[str] = Query(None, description="doji, hammer, bullish_engulfing, bearish_engulfing, double_top, double_bottom, head_shoulders"),
    volume_breakout: Optional[bool] = Query(False, description="Volume is 2x greater than its 20-period average"),
):
    results = []
    
    # Filter Universe by market if selected
    # Indian equities have .NS suffix or RELIANCE/TCS/INFY/HDFCBANK
    for symbol in SCREENER_UNIVERSE:
        is_indian = symbol in ["RELIANCE", "TCS", "INFY", "HDFCBANK"]
        if market == "US" and is_indian:
            continue
        if market == "IN" and not is_indian:
            continue
            
        try:
            df = data_fetcher.fetch_history(symbol, timeframe="1D")
            df_ind = add_all_indicators(df)
            df_full = scan_patterns(df_ind)
            
            latest = df_full.iloc[-1]
            prev = df_full.iloc[-2] if len(df_full) > 1 else latest
            
            # Apply Filters
            match = True
            
            # 1. RSI Filter
            rsi_val = latest.get("RSI", 50)
            if rsi_filter == "oversold" and rsi_val >= 35:
                match = False
            elif rsi_filter == "overbought" and rsi_val <= 65:
                match = False
                
            # 2. Pattern Filter
            if pattern_filter:
                pattern_col = f"Pattern_{pattern_filter.title()}"
                # Handle names like Bullish_Engulfing or Head_Shoulders
                if pattern_filter.lower() == "bullish_engulfing":
                    pattern_col = "Pattern_Bullish_Engulfing"
                elif pattern_filter.lower() == "bearish_engulfing":
                    pattern_col = "Pattern_Bearish_Engulfing"
                elif pattern_filter.lower() == "double_top":
                    pattern_col = "Pattern_Double_Top"
                elif pattern_filter.lower() == "double_bottom":
                    pattern_col = "Pattern_Double_Bottom"
                elif pattern_filter.lower() == "head_shoulders":
                    pattern_col = "Pattern_Head_Shoulders"
                    
                if not latest.get(pattern_col, False):
                    match = False
                    
            # 3. Volume Breakout
            vol_sma = df_full["Volume"].rolling(20).mean().iloc[-1]
            if volume_breakout and vol_sma > 0:
                if latest["Volume"] < 2.0 * vol_sma:
                    match = False
                    
            if match:
                # Get current price and change
                close = latest["Close"]
                prev_close = prev["Close"]
                change_pct = ((close - prev_close) / prev_close) * 100
                
                results.append({
                    "symbol": symbol,
                    "name": data_fetcher.resolve_ticker(symbol),
                    "price": round(close, 2),
                    "change_pct": round(change_pct, 2),
                    "volume": int(latest["Volume"]),
                    "rsi": round(rsi_val, 1) if not pd.isna(rsi_val) else 50.0,
                    "patterns_detected": [
                        pat for pat in ["Doji", "Hammer", "Bullish_Engulfing", "Bearish_Engulfing", "Double_Top", "Double_Bottom", "Head_Shoulders"]
                        if latest.get(f"Pattern_{pat}", False)
                    ]
                })
        except Exception:
            continue
            
    return results

# Watchlist endpoints
@router.get("/watchlist/list", response_model=List[schemas.WatchlistResponse])
def get_watchlist(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Watchlist).filter(models.Watchlist.user_id == current_user.id).all()

@router.post("/watchlist/add", response_model=schemas.WatchlistResponse)
def add_to_watchlist(item: schemas.WatchlistCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Check if already added
    symbol_upper = item.symbol.upper()
    existing = db.query(models.Watchlist).filter(
        models.Watchlist.user_id == current_user.id,
        models.Watchlist.symbol == symbol_upper
    ).first()
    
    if existing:
        return existing
        
    watchlist_entry = models.Watchlist(
        user_id=current_user.id,
        symbol=symbol_upper
    )
    db.add(watchlist_entry)
    db.commit()
    db.refresh(watchlist_entry)
    return watchlist_entry

@router.delete("/watchlist/remove/{symbol}")
def remove_from_watchlist(symbol: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    symbol_upper = symbol.upper()
    entry = db.query(models.Watchlist).filter(
        models.Watchlist.user_id == current_user.id,
        models.Watchlist.symbol == symbol_upper
    ).first()
    
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stock not found in watchlist."
        )
        
    db.delete(entry)
    db.commit()
    return {"message": f"Successfully removed {symbol_upper} from watchlist."}

@router.get("/history/logs", response_model=List[schemas.AnalysisHistoryResponse])
def get_analysis_logs(limit: int = Query(20, description="Max logs to return"), db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Fetch user's historical AI analysis trigger logs."""
    return db.query(models.AnalysisHistory).filter(
        models.AnalysisHistory.user_id == current_user.id
    ).order_by(models.AnalysisHistory.analysis_date.desc()).limit(limit).all()
