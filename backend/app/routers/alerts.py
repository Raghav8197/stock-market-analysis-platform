from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas, auth, data_fetcher
from app.patterns import scan_patterns
from app.indicators import add_all_indicators

router = APIRouter(
    prefix="/api/alerts",
    tags=["Alerts"]
)

@router.post("/create", response_model=schemas.AlertResponse, status_code=status.HTTP_201_CREATED)
def create_alert(alert_data: schemas.AlertCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    symbol_upper = alert_data.symbol.upper()
    
    # Validation based on alert type
    if alert_data.alert_type in ["PRICE_ABOVE", "PRICE_BELOW"]:
        if alert_data.target_value is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="target_value is required for price alerts."
            )
    elif alert_data.alert_type == "PATTERN_DETECTED":
        if alert_data.target_pattern is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="target_pattern is required for pattern alerts."
            )
        # Normalize pattern check name
        alert_data.target_pattern = alert_data.target_pattern.lower()
    else:
         raise HTTPException(
             status_code=status.HTTP_400_BAD_REQUEST,
             detail=f"Invalid alert type. Allowed: PRICE_ABOVE, PRICE_BELOW, PATTERN_DETECTED"
         )
         
    new_alert = models.Alert(
        user_id=current_user.id,
        symbol=symbol_upper,
        alert_type=alert_data.alert_type,
        target_value=alert_data.target_value,
        target_pattern=alert_data.target_pattern,
        is_triggered=False
    )
    
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)
    return new_alert

@router.get("/list", response_model=List[schemas.AlertResponse])
def list_alerts(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Alert).filter(
        models.Alert.user_id == current_user.id
    ).order_by(models.Alert.created_at.desc()).all()

@router.delete("/remove/{alert_id}")
def remove_alert(alert_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    alert = db.query(models.Alert).filter(
        models.Alert.id == alert_id,
        models.Alert.user_id == current_user.id
    ).first()
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found or unauthorized access."
        )
        
    db.delete(alert)
    db.commit()
    return {"message": "Alert deleted successfully."}

@router.post("/check", response_model=List[schemas.AlertResponse])
def check_and_trigger_alerts(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """
    Check all active alerts for the current user against live prices and pattern states.
    Triggers them if limits are crossed, and returns list of newly triggered alerts.
    """
    active_alerts = db.query(models.Alert).filter(
        models.Alert.user_id == current_user.id,
        models.Alert.is_triggered == False
    ).all()
    
    triggered_alerts = []
    
    # To optimize, we group alerts by symbol
    alerts_by_symbol = {}
    for alert in active_alerts:
        if alert.symbol not in alerts_by_symbol:
            alerts_by_symbol[alert.symbol] = []
        alerts_by_symbol[alert.symbol].append(alert)
        
    for symbol, alerts in alerts_by_symbol.items():
        try:
            # Get current live price
            live_price = data_fetcher.get_live_ticker_price(symbol)
            
            # Fetch indicators/patterns if we have pattern alerts for this symbol
            has_pattern_alerts = any(a.alert_type == "PATTERN_DETECTED" for a in alerts)
            df_full = None
            if has_pattern_alerts:
                df = data_fetcher.fetch_history(symbol, timeframe="1D", limit=30)
                df_ind = add_all_indicators(df)
                df_full = scan_patterns(df_ind)
                
            for alert in alerts:
                triggered = False
                
                if alert.alert_type == "PRICE_ABOVE":
                    if live_price >= alert.target_value:
                        triggered = True
                elif alert.alert_type == "PRICE_BELOW":
                    if live_price <= alert.target_value:
                        triggered = True
                elif alert.alert_type == "PATTERN_DETECTED" and df_full is not None:
                    # Look at latest bar
                    latest_bar = df_full.iloc[-1]
                    pattern_col = f"Pattern_{alert.target_pattern.title()}"
                    # Normalize common names
                    if "engulfing" in alert.target_pattern:
                        pattern_col = f"Pattern_{alert.target_pattern.replace('_', ' ').title().replace(' ', '_')}"
                    elif "bottom" in alert.target_pattern or "top" in alert.target_pattern:
                        pattern_col = f"Pattern_{alert.target_pattern.replace('_', ' ').title().replace(' ', '_')}"
                    elif "head_shoulders" in alert.target_pattern:
                        pattern_col = "Pattern_Head_Shoulders"
                        
                    if latest_bar.get(pattern_col, False):
                        triggered = True
                        
                if triggered:
                    alert.is_triggered = True
                    db.add(alert)
                    triggered_alerts.append(alert)
        except Exception as e:
            # Log issue and skip this stock for now
            print(f"Error checking alerts for {symbol}: {e}")
            continue
            
    if triggered_alerts:
        db.commit()
        # Refresh objects to return properly
        for alert in triggered_alerts:
            db.refresh(alert)
            
    return triggered_alerts
