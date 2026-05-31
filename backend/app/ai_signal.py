import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from typing import Dict, Any

def extract_ml_features(df: pd.DataFrame) -> pd.DataFrame:
    """Extract features for training the machine learning classifier."""
    features = pd.DataFrame(index=df.index)
    
    # 1. Price Returns
    features["Return_1d"] = df["Close"].pct_change(1)
    features["Return_5d"] = df["Close"].pct_change(5)
    
    # 2. Indicators (normalized where possible)
    features["RSI"] = df["RSI"] / 100.0
    
    # MACD normalized by Close
    features["MACD_Ratio"] = df["MACD"] / df["Close"]
    features["MACD_Hist_Ratio"] = df["MACD_Hist"] / df["Close"]
    
    # Price relative to Bollinger Bands
    bb_range = df["BB_Upper"] - df["BB_Lower"]
    # Avoid zero division
    bb_range = np.where(bb_range == 0, 0.0001, bb_range)
    features["BB_Position"] = (df["Close"] - df["BB_Lower"]) / bb_range
    
    # Price relative to EMAs
    features["Price_to_EMA50"] = df["Close"] / df["EMA_50"] - 1.0
    features["Price_to_EMA200"] = df["Close"] / df["EMA_200"] - 1.0
    
    # 3. Volume indicator
    vol_sma = df["Volume"].rolling(20).mean()
    vol_sma = np.where(vol_sma == 0, 1.0, vol_sma)
    features["Volume_Ratio"] = df["Volume"] / vol_sma
    
    # 4. Pattern flags (coerced to floats)
    pattern_cols = [c for c in df.columns if c.startswith("Pattern_")]
    for col in pattern_cols:
        features[col] = df[col].astype(float)
        
    return features

def generate_ai_signal(
    df: pd.DataFrame,
    n_estimators: int = 50,
    max_depth: int = 5,
    horizon: int = 3
) -> Dict[str, Any]:
    """
    Generate dynamic Buy/Sell/Hold signals using standard technical indicators
    and a local RandomForest classifier fitted on historical data.
    """
    # 1. Fallback Rule-Based Signal Generator (used if data is insufficient or ML fails)
    latest = df.iloc[-1]
    prev = df.iloc[-2] if len(df) > 1 else latest
    
    rsi = latest.get("RSI", 50)
    macd_hist = latest.get("MACD_Hist", 0)
    prev_macd_hist = prev.get("MACD_Hist", 0)
    close = latest.get("Close", 0)
    bb_lower = latest.get("BB_Lower", 0)
    bb_upper = latest.get("BB_Upper", 0)
    
    # Compute heuristic technical score
    tech_score = 0.0
    reasons = []
    
    if rsi < 30:
        tech_score += 2.0
        reasons.append(f"RSI is oversold ({rsi:.1f})")
    elif rsi > 70:
        tech_score -= 2.0
        reasons.append(f"RSI is overbought ({rsi:.1f})")
        
    if macd_hist > 0 and prev_macd_hist <= 0:
        tech_score += 1.5
        reasons.append("Bullish MACD crossover")
    elif macd_hist < 0 and prev_macd_hist >= 0:
        tech_score -= 1.5
        reasons.append("Bearish MACD crossover")
        
    if close <= bb_lower and bb_lower > 0:
        tech_score += 1.5
        reasons.append("Price touching lower Bollinger Band")
    elif close >= bb_upper and bb_upper > 0:
        tech_score -= 1.5
        reasons.append("Price touching upper Bollinger Band")
        
    # Pattern contributions
    if latest.get("Pattern_Bullish_Engulfing", False):
        tech_score += 2.0
        reasons.append("Bullish Engulfing pattern detected")
    if latest.get("Pattern_Bearish_Engulfing", False):
        tech_score -= 2.0
        reasons.append("Bearish Engulfing pattern detected")
    if latest.get("Pattern_Hammer", False):
        tech_score += 1.5
        reasons.append("Hammer pattern detected (Potential reversal)")
    if latest.get("Pattern_Double_Bottom", False):
        tech_score += 2.5
        reasons.append("Double Bottom (W-Pattern) formed")
    if latest.get("Pattern_Double_Top", False):
        tech_score -= 2.5
        reasons.append("Double Top pattern formed")
    if latest.get("Pattern_Head_Shoulders", False):
        tech_score -= 3.0
        reasons.append("Head and Shoulders pattern completed")
    if latest.get("Pattern_Shooting_Star", False):
        tech_score -= 1.5
        reasons.append("Shooting Star pattern detected (Potential reversal)")
    if latest.get("Pattern_Morning_Star", False):
        tech_score += 2.0
        reasons.append("Morning Star pattern detected (Bullish reversal)")
    if latest.get("Pattern_Evening_Star", False):
        tech_score -= 2.0
        reasons.append("Evening Star pattern detected (Bearish reversal)")
 
    # Volume filter
    vol_sma = df["Volume"].rolling(20).mean().iloc[-1]
    if vol_sma > 0 and latest["Volume"] > 2.0 * vol_sma:
        if tech_score > 0:
            tech_score += 1.0
            reasons.append("High volume confirmation on bullish indicators")
        elif tech_score < 0:
            tech_score -= 1.0
            reasons.append("High volume confirmation on bearish indicators")
 
    # 2. Try to run Machine Learning model
    ml_success = False
    ml_signal = "HOLD"
    ml_confidence = 50.0
    
    if len(df) >= (60 + horizon):  # Require sufficient bars for model training
        try:
            features = extract_ml_features(df)
            
            # Create target: 1 if close price increases by >= 1% in the next horizon days
            # -1 if it drops by >= 1% in the next horizon days, 0 otherwise
            future_return = df["Close"].shift(-horizon) / df["Close"] - 1.0
            
            target = np.zeros(len(df))
            target[future_return >= 0.01] = 1   # BUY
            target[future_return <= -0.01] = -1  # SELL
            
            # Align features and targets, drop NaNs (exclude last horizon rows since future_return is unknown)
            X = features.iloc[:-horizon].dropna()
            y = target[X.index]
            
            # Ensure we have class representation
            if len(X) > 20 and len(np.unique(y)) > 1:
                clf = RandomForestClassifier(n_estimators=n_estimators, max_depth=max_depth, random_state=42)
                clf.fit(X, y)
                
                # Fetch features of latest row
                latest_features = features.iloc[[-1]].copy()
                # Fill any NaNs in the latest features
                latest_features = latest_features.fillna(0.0)
                
                # Predict
                pred_class = clf.predict(latest_features)[0]
                probs = clf.predict_proba(latest_features)[0]
                
                # Class mapping: [0] = -1 (SELL), [1] = 0 (HOLD), [2] = 1 (BUY) (depending on classes in y)
                classes = clf.classes_
                pred_prob = probs[np.where(classes == pred_class)[0][0]]
                
                ml_confidence = float(pred_prob * 100)
                if pred_class == 1:
                    ml_signal = "BUY"
                elif pred_class == -1:
                    ml_signal = "SELL"
                else:
                    ml_signal = "HOLD"
                    
                ml_success = True
        except Exception as e:
            # If training fails for any reason (e.g. NaN columns, import limits), fallback silently
            pass

    # Consolidated Signal calculation
    # If ML was successful, combine it with technical rules
    if ml_success:
        if ml_signal == "BUY" and tech_score > 0:
            final_signal = "BUY"
            confidence = min(95.0, (ml_confidence + tech_score * 8) / 2 + 30)
        elif ml_signal == "SELL" and tech_score < 0:
            final_signal = "SELL"
            confidence = min(95.0, (ml_confidence + abs(tech_score) * 8) / 2 + 30)
        else:
            # Conflict or HOLD
            final_signal = ml_signal
            confidence = ml_confidence
    else:
        # Heuristic calculation
        if tech_score >= 1.5:
            final_signal = "BUY"
            confidence = min(90.0, 50.0 + tech_score * 12)
        elif tech_score <= -1.5:
            final_signal = "SELL"
            confidence = min(90.0, 50.0 + abs(tech_score) * 12)
        else:
            final_signal = "HOLD"
            confidence = 50.0 + abs(tech_score) * 10

    if not reasons:
        reasons.append("Market is consolidating. No strong technical breakouts or indicators.")
        
    return {
        "symbol": df.attrs.get("symbol", "STOCK"),
        "signal": final_signal,
        "confidence": round(confidence, 1),
        "reasons": reasons,
        "technical_score": tech_score,
        "indicators": {
            "rsi": float(rsi) if not np.isnan(rsi) else 50.0,
            "macd_hist": float(macd_hist) if not np.isnan(macd_hist) else 0.0,
            "close": float(close),
            "bb_lower": float(bb_lower) if not np.isnan(bb_lower) else None,
            "bb_upper": float(bb_upper) if not np.isnan(bb_upper) else None,
        },
        "ml_model_active": ml_success
    }
