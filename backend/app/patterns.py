import pandas as pd
import numpy as np
from typing import List, Dict, Any

def detect_doji(df: pd.DataFrame, threshold: float = 0.1) -> pd.Series:
    """
    Detect Doji patterns.
    Body size is less than threshold * candle range.
    """
    body = (df["Close"] - df["Open"]).abs()
    candle_range = df["High"] - df["Low"]
    # Handle zero range to avoid division by zero
    is_doji = (body <= threshold * candle_range) & (candle_range > 0)
    return is_doji

def detect_hammer(df: pd.DataFrame) -> pd.Series:
    """
    Detect Hammer patterns.
    - Small body at upper end.
    - Lower shadow is at least 2x the body.
    - Upper shadow is very small.
    """
    body = (df["Close"] - df["Open"]).abs()
    candle_range = df["High"] - df["Low"]
    lower_shadow = df[["Open", "Close"]].min(axis=1) - df["Low"]
    upper_shadow = df["High"] - df[["Open", "Close"]].max(axis=1)
    
    is_hammer = (
        (body > 0) & 
        (lower_shadow >= 2 * body) & 
        (upper_shadow <= candle_range * 0.15) &
        (candle_range > 0)
    )
    return is_hammer

def detect_engulfing(df: pd.DataFrame) -> Dict[str, pd.Series]:
    """
    Detect Bullish and Bearish Engulfing patterns.
    """
    bullish = pd.Series(False, index=df.index)
    bearish = pd.Series(False, index=df.index)
    
    for i in range(1, len(df)):
        open_prev, close_prev = df["Open"].iloc[i-1], df["Close"].iloc[i-1]
        open_curr, close_curr = df["Open"].iloc[i], df["Close"].iloc[i]
        
        # Bullish Engulfing
        if (close_prev < open_prev) and (close_curr > open_curr):
            if (open_curr <= close_prev) and (close_curr >= open_prev) and ((open_curr < close_prev) or (close_curr > open_prev)):
                bullish.iloc[i] = True
                
        # Bearish Engulfing
        if (close_prev > open_prev) and (close_curr < open_curr):
            if (open_curr >= close_prev) and (close_curr <= open_prev) and ((open_curr > close_prev) or (close_curr < open_prev)):
                bearish.iloc[i] = True
                
    return {"bullish_engulfing": bullish, "bearish_engulfing": bearish}

def find_local_extrema(series: pd.Series, window: int = 5) -> tuple:
    """Find local peaks and troughs in a series."""
    peaks = []
    troughs = []
    
    n = len(series)
    for i in range(window, n - window):
        chunk = series.iloc[i - window : i + window + 1]
        val = series.iloc[i]
        if val == chunk.max():
            peaks.append((i, series.index[i], val))
        if val == chunk.min():
            troughs.append((i, series.index[i], val))
            
    return peaks, troughs

def detect_double_patterns(df: pd.DataFrame, tolerance: float = 0.02) -> Dict[str, pd.Series]:
    """
    Detect Double Top and Double Bottom (W Pattern) patterns.
    - Double Top: Two peaks at similar levels, separated by a valley.
    - Double Bottom: Two troughs at similar levels, separated by a peak.
    """
    double_tops = pd.Series(False, index=df.index)
    double_bottoms = pd.Series(False, index=df.index)
    
    close = df["Close"]
    peaks, troughs = find_local_extrema(close, window=5)
    
    # Double Top Detection
    for idx_p1 in range(len(peaks) - 1):
        i1, date1, val1 = peaks[idx_p1]
        i2, date2, val2 = peaks[idx_p1 + 1]
        
        # Check distance between peaks (between 10 and 60 bars)
        if 10 <= (i2 - i1) <= 60:
            # Check if peaks are of similar height
            if abs(val1 - val2) / val1 <= tolerance:
                # Find the minimum valley between them
                valley_val = close.iloc[i1:i2].min()
                valley_idx = close.iloc[i1:i2].idxmin()
                
                # Verify it is indeed a valley
                if valley_val < min(val1, val2) * 0.96:
                    # Double Top confirmed when current price closes below the valley level (neckline)
                    # We flag it on the index of confirmation or the second peak. Let's flag on the second peak
                    double_tops.iloc[i2] = True
                    
    # Double Bottom / W Pattern Detection
    for idx_t1 in range(len(troughs) - 1):
        i1, date1, val1 = troughs[idx_t1]
        i2, date2, val2 = troughs[idx_t1 + 1]
        
        if 10 <= (i2 - i1) <= 60:
            if abs(val1 - val2) / val1 <= tolerance:
                # Find peak between them
                peak_val = close.iloc[i1:i2].max()
                
                if peak_val > max(val1, val2) * 1.04:
                    double_bottoms.iloc[i2] = True
                    
    return {"double_top": double_tops, "double_bottom": double_bottoms}

def detect_head_and_shoulders(df: pd.DataFrame, tolerance: float = 0.03) -> pd.Series:
    """
    Detect Head and Shoulders patterns.
    Three peaks: Left Shoulder, Head, Right Shoulder.
    - Head > Left Shoulder and Head > Right Shoulder
    - Left and Right Shoulders are roughly equal (within tolerance)
    """
    has_pattern = pd.Series(False, index=df.index)
    close = df["Close"]
    peaks, _ = find_local_extrema(close, window=5)
    
    for i in range(len(peaks) - 2):
        i1, d1, val_ls = peaks[i]      # Left Shoulder
        i2, d2, val_hd = peaks[i+1]    # Head
        i3, d3, val_rs = peaks[i+2]    # Right Shoulder
        
        # Distance checks (e.g. shoulders should not be too far apart)
        if 8 <= (i2 - i1) <= 40 and 8 <= (i3 - i2) <= 40:
            # Head is higher than both shoulders
            if val_hd > val_ls and val_hd > val_rs:
                # Shoulders are of similar height
                if abs(val_ls - val_rs) / val_ls <= tolerance:
                    # Troughs (neckline) check
                    trough1 = close.iloc[i1:i2].min()
                    trough2 = close.iloc[i2:i3].min()
                    
                    if trough1 < min(val_ls, val_hd) and trough2 < min(val_rs, val_hd):
                        # Flag on the Right Shoulder peak index
                        has_pattern.iloc[i3] = True
                        
    return has_pattern

def detect_shooting_star(df: pd.DataFrame) -> pd.Series:
    """
    Detect Shooting Star pattern.
    - Small body at lower end.
    - Upper shadow is at least 2x the body.
    - Lower shadow is very small.
    """
    body = (df["Close"] - df["Open"]).abs()
    candle_range = df["High"] - df["Low"]
    upper_shadow = df["High"] - df[["Open", "Close"]].max(axis=1)
    lower_shadow = df[["Open", "Close"]].min(axis=1) - df["Low"]
    
    is_shooting_star = (
        (body > 0) &
        (upper_shadow >= 2 * body) &
        (lower_shadow <= candle_range * 0.15) &
        (candle_range > 0)
    )
    return is_shooting_star

def detect_morning_star(df: pd.DataFrame) -> pd.Series:
    """
    Detect Morning Star pattern.
    Three-candle pattern:
    - Candle 1: Bearish (Close < Open)
    - Candle 2: Small body (Doji or Spinning Top) closing below midpoint of Candle 1
    - Candle 3: Bullish (Close > Open) closing above midpoint of Candle 1
    """
    is_star = pd.Series(False, index=df.index)
    for i in range(2, len(df)):
        o1, c1 = df["Open"].iloc[i-2], df["Close"].iloc[i-2]
        o2, c2 = df["Open"].iloc[i-1], df["Close"].iloc[i-1]
        o3, c3 = df["Open"].iloc[i], df["Close"].iloc[i]
        
        body1 = abs(c1 - o1)
        body2 = abs(c2 - o2)
        body3 = abs(c3 - o3)
        
        if (c1 < o1) and (c3 > o3):
            if body2 < body1 * 0.4 and body2 < body3 * 0.4:
                midpoint1 = (o1 + c1) / 2
                if max(o2, c2) < midpoint1:
                    if c3 > midpoint1:
                        is_star.iloc[i] = True
    return is_star

def detect_evening_star(df: pd.DataFrame) -> pd.Series:
    """
    Detect Evening Star pattern.
    Three-candle pattern:
    - Candle 1: Bullish (Close > Open)
    - Candle 2: Small body (Doji or Spinning Top) closing above midpoint of Candle 1
    - Candle 3: Bearish (Close < Open) closing below midpoint of Candle 1
    """
    is_star = pd.Series(False, index=df.index)
    for i in range(2, len(df)):
        o1, c1 = df["Open"].iloc[i-2], df["Close"].iloc[i-2]
        o2, c2 = df["Open"].iloc[i-1], df["Close"].iloc[i-1]
        o3, c3 = df["Open"].iloc[i], df["Close"].iloc[i]
        
        body1 = abs(c1 - o1)
        body2 = abs(c2 - o2)
        body3 = abs(c3 - o3)
        
        if (c1 > o1) and (c3 < o3):
            if body2 < body1 * 0.4 and body2 < body3 * 0.4:
                midpoint1 = (o1 + c1) / 2
                if min(o2, c2) > midpoint1:
                    if c3 < midpoint1:
                        is_star.iloc[i] = True
    return is_star

def scan_patterns(df: pd.DataFrame) -> pd.DataFrame:
    """Scan and append all patterns as boolean columns in the dataframe."""
    df = df.copy()
    
    df["Pattern_Doji"] = detect_doji(df)
    df["Pattern_Hammer"] = detect_hammer(df)
    
    eng = detect_engulfing(df)
    df["Pattern_Bullish_Engulfing"] = eng["bullish_engulfing"]
    df["Pattern_Bearish_Engulfing"] = eng["bearish_engulfing"]
    
    doubles = detect_double_patterns(df)
    df["Pattern_Double_Top"] = doubles["double_top"]
    df["Pattern_Double_Bottom"] = doubles["double_bottom"]
    
    df["Pattern_Head_Shoulders"] = detect_head_and_shoulders(df)
    df["Pattern_Shooting_Star"] = detect_shooting_star(df)
    df["Pattern_Morning_Star"] = detect_morning_star(df)
    df["Pattern_Evening_Star"] = detect_evening_star(df)
    
    return df


TIMEFRAME_TARGET_HORIZONS = {
    "1m": "15-Min Scalp (F&O)",
    "5m": "30-Min Momentum (F&O)",
    "15m": "1-Hour Session (F&O)",
    "60m": "Intraday F&O Target",
    "1h": "Intraday F&O Target",
    "1D": "1–3 Days F&O Target",
    "1W": "Weekly Expiry Target",
}

MAX_HOLDING_BARS_MAP = {
    "1m": 15,       # 15 mins scalp
    "5m": 12,       # 60 mins scalp
    "15m": 10,      # 2.5 hours session
    "60m": 6,       # 1 day session
    "1h": 6,        # 1 day session
    "1D": 3,        # 1 to 3 days (Weekly/Monthly F&O contract)
    "1W": 2,        # 2 weeks positional
}

def calculate_fno_strike(price: float) -> float:
    """Calculate standard ATM strike price based on asset price magnitude."""
    if price >= 20000:
        step = 100
    elif price >= 10000:
        step = 50
    elif price >= 2000:
        step = 20
    elif price >= 500:
        step = 10
    elif price >= 100:
        step = 5
    elif price >= 20:
        step = 1
    else:
        step = 0.5
    return round(round(price / step) * step, 2)

def calculate_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """Calculate Average True Range with robust fallbacks."""
    high_low = df["High"] - df["Low"]
    high_close = (df["High"] - df["Close"].shift()).abs()
    low_close = (df["Low"] - df["Close"].shift()).abs()
    tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    atr = tr.rolling(period).mean()
    fallback = (df["High"] - df["Low"]).expanding().mean()
    return atr.fillna(fallback).bfill()

def calculate_rsi(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """Calculate Relative Strength Index."""
    delta = df["Close"].diff()
    gain = (delta.where(delta > 0, 0)).rolling(period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(period).mean()
    rs = gain / (loss.replace(0, 1e-9))
    rsi = 100 - (100 / (1 + rs))
    return rsi.fillna(50.0).bfill()

def detect_patterns_with_levels(df: pd.DataFrame, timeframe: str = "1D") -> List[Dict[str, Any]]:
    """
    Detect confirmed high-probability F&O patterns with 1-3 day holding horizons,
    option strike recommendations (CE/PE), and volatility-buffered targets.
    """
    results: List[Dict[str, Any]] = []
    close = df["Close"]
    n = len(df)
    horizon = TIMEFRAME_TARGET_HORIZONS.get(timeframe, "Target")
    max_bars = MAX_HOLDING_BARS_MAP.get(timeframe, 3)

    is_intraday = timeframe in ["1m", "5m", "15m", "60m", "1h"]
    target_mult = 0.65 if is_intraday else 0.75
    sl_mult = 2.2 if is_intraday else 2.0

    atr = calculate_atr(df)
    rsi = calculate_rsi(df)
    ema20 = close.ewm(span=20).mean()
    ema50 = close.ewm(span=50).mean()

    # ── 1. Double Bottom (W-Pattern) ───────────────────────────────────────
    peaks, troughs = find_local_extrema(close, window=4)
    tolerance = 0.03

    for idx_t1 in range(len(troughs) - 1):
        i1, date1, val1 = troughs[idx_t1]
        i2, date2, val2 = troughs[idx_t1 + 1]

        if 8 <= (i2 - i1) <= 50:
            if abs(val1 - val2) / val1 <= tolerance:
                neckline_val = float(close.iloc[i1:i2].max())
                neckline_pos = int(close.iloc[i1:i2].values.argmax()) + i1

                if neckline_val > max(val1, val2) * 1.02:
                    cur_atr = float(atr.iloc[i2])
                    c2 = float(close.iloc[i2])
                    target = round(c2 + 0.8 * cur_atr, 2)
                    sl = round(min(val1, val2) - 0.75 * cur_atr, 2)
                    results.append({
                        "bar_index": i2,
                        "pattern": "Double Bottom (W-Pattern)",
                        "is_bullish": True,
                        "entry": round(c2, 2),
                        "target": target,
                        "stop_loss": sl,
                        "confidence": "HIGH",
                        "pattern_points": [
                            {"bar_index": i1, "price": round(val1, 2), "label": "Trough 1"},
                            {"bar_index": neckline_pos, "price": round(neckline_val, 2), "label": "Neckline"},
                            {"bar_index": i2, "price": round(val2, 2), "label": "Trough 2"},
                        ],
                    })

    # ── 2. Double Top (M-Pattern) ──────────────────────────────────────────
    for idx_p1 in range(len(peaks) - 1):
        i1, date1, val1 = peaks[idx_p1]
        i2, date2, val2 = peaks[idx_p1 + 1]

        if 8 <= (i2 - i1) <= 50:
            if abs(val1 - val2) / val1 <= tolerance:
                neckline_val = float(close.iloc[i1:i2].min())
                neckline_pos = int(close.iloc[i1:i2].values.argmin()) + i1

                if neckline_val < min(val1, val2) * 0.98:
                    cur_atr = float(atr.iloc[i2])
                    c2 = float(close.iloc[i2])
                    target = round(c2 - 0.8 * cur_atr, 2)
                    sl = round(max(val1, val2) + 0.75 * cur_atr, 2)
                    results.append({
                        "bar_index": i2,
                        "pattern": "Double Top (M-Pattern)",
                        "is_bullish": False,
                        "entry": round(c2, 2),
                        "target": target,
                        "stop_loss": sl,
                        "confidence": "HIGH",
                        "pattern_points": [
                            {"bar_index": i1, "price": round(val1, 2), "label": "Peak 1"},
                            {"bar_index": neckline_pos, "price": round(neckline_val, 2), "label": "Neckline"},
                            {"bar_index": i2, "price": round(val2, 2), "label": "Peak 2"},
                        ],
                    })

    # ── 3. Head & Shoulders ────────────────────────────────────────────────
    hs_tolerance = 0.035
    for i in range(len(peaks) - 2):
        i1, d1, val_ls = peaks[i]
        i2, d2, val_hd = peaks[i + 1]
        i3, d3, val_rs = peaks[i + 2]

        if 6 <= (i2 - i1) <= 40 and 6 <= (i3 - i2) <= 40:
            if val_hd > val_ls and val_hd > val_rs:
                if abs(val_ls - val_rs) / val_ls <= hs_tolerance:
                    trough1_val = float(close.iloc[i1:i2].min())
                    trough1_pos = int(close.iloc[i1:i2].values.argmin()) + i1
                    trough2_val = float(close.iloc[i2:i3].min())
                    trough2_pos = int(close.iloc[i2:i3].values.argmin()) + i2

                    if trough1_val < min(val_ls, val_hd) and trough2_val < min(val_rs, val_hd):
                        cur_atr = float(atr.iloc[i3])
                        c3 = float(close.iloc[i3])
                        results.append({
                            "bar_index": i3,
                            "pattern": "Head & Shoulders",
                            "is_bullish": False,
                            "entry": round(c3, 2),
                            "target": round(c3 - 0.8 * cur_atr, 2),
                            "stop_loss": round(val_rs + 0.75 * cur_atr, 2),
                            "confidence": "HIGH",
                            "pattern_points": [
                                {"bar_index": i1, "price": round(val_ls, 2), "label": "Left Shoulder"},
                                {"bar_index": trough1_pos, "price": round(trough1_val, 2), "label": "Neckline L"},
                                {"bar_index": i2, "price": round(val_hd, 2), "label": "Head"},
                                {"bar_index": trough2_pos, "price": round(trough2_val, 2), "label": "Neckline R"},
                                {"bar_index": i3, "price": round(val_rs, 2), "label": "Right Shoulder"},
                            ],
                        })

    # ── 4. Confirmed High-Probability Candlesticks ─────────────────────────
    last_bull_idx, last_bear_idx = -10, -10
    start_idx = min(20, n // 4) if n > 10 else 2

    for i in range(start_idx, n - 1):
        c = float(close.iloc[i])
        o = float(df["Open"].iloc[i])
        h = float(df["High"].iloc[i])
        l = float(df["Low"].iloc[i])
        c_prev = float(close.iloc[i - 1])
        o_prev = float(df["Open"].iloc[i - 1])
        cur_atr = float(atr.iloc[i])
        cur_rsi = float(rsi.iloc[i])
        cur_ema20 = float(ema20.iloc[i])
        cur_ema50 = float(ema50.iloc[i])

        body = abs(c - o)
        cr = h - l
        lower_shadow = min(o, c) - l
        upper_shadow = h - max(o, c)

        bull_structure = (cur_ema20 >= cur_ema50 * 0.99 or c >= cur_ema20)
        bull_engulf = (
            c_prev < o_prev and c > o and o <= c_prev and c >= o_prev and
            (32 <= cur_rsi <= 68) and bull_structure
        )
        bull_hammer = (
            body > 0 and lower_shadow >= 1.7 * body and upper_shadow <= cr * 0.22 and
            (28 <= cur_rsi <= 62) and bull_structure
        )
        m_star = False
        if i >= 2:
            o1, c1 = float(df["Open"].iloc[i - 2]), float(close.iloc[i - 2])
            o2, c2 = float(df["Open"].iloc[i - 1]), float(close.iloc[i - 1])
            m_star = (
                c1 < o1 and c > o and abs(c2 - o2) < abs(c1 - o1) * 0.4 and
                c > (o1 + c1) / 2 and (30 <= cur_rsi <= 65) and (c >= cur_ema50 * 0.95)
            )

        if (bull_engulf or bull_hammer or m_star) and (i - last_bull_idx >= 3):
            last_bull_idx = i
            pname = "Morning Star" if m_star else ("Bullish Engulfing" if bull_engulf else "Hammer")
            results.append({
                "bar_index": i,
                "pattern": pname,
                "is_bullish": True,
                "entry": round(c, 2),
                "target": round(c + target_mult * cur_atr, 2),
                "stop_loss": round(l - sl_mult * cur_atr, 2),
                "confidence": "HIGH" if m_star or bull_engulf else "MEDIUM",
                "pattern_points": [
                    {"bar_index": i, "price": round(l, 2), "label": "Swing Low"},
                    {"bar_index": i, "price": round(c, 2), "label": "Entry Trigger"},
                ],
            })

        bear_structure = (cur_ema20 <= cur_ema50 * 1.01 and c <= cur_ema20)
        bear_engulf = (
            c_prev > o_prev and c < o and o >= c_prev and c <= o_prev and
            (40 <= cur_rsi <= 68) and bear_structure
        )
        bear_star = (
            body > 0 and upper_shadow >= 1.7 * body and lower_shadow <= cr * 0.22 and
            (40 <= cur_rsi <= 68) and bear_structure
        )
        e_star = False
        if i >= 2:
            o1, c1 = float(df["Open"].iloc[i - 2]), float(close.iloc[i - 2])
            o2, c2 = float(df["Open"].iloc[i - 1]), float(close.iloc[i - 1])
            e_star = (
                c1 > o1 and c < o and abs(c2 - o2) < abs(c1 - o1) * 0.4 and
                c < (o1 + c1) / 2 and (40 <= cur_rsi <= 70) and (c <= cur_ema50 * 1.05)
            )

        if (bear_engulf or bear_star or e_star) and (i - last_bear_idx >= 3):
            last_bear_idx = i
            pname = "Evening Star" if e_star else ("Bearish Engulfing" if bear_engulf else "Shooting Star")
            results.append({
                "bar_index": i,
                "pattern": pname,
                "is_bullish": False,
                "entry": round(c, 2),
                "target": round(c - target_mult * cur_atr, 2),
                "stop_loss": round(h + sl_mult * cur_atr, 2),
                "confidence": "HIGH" if e_star or bear_engulf else "MEDIUM",
                "pattern_points": [
                    {"bar_index": i, "price": round(h, 2), "label": "Swing High"},
                    {"bar_index": i, "price": round(c, 2), "label": "Entry Trigger"},
                ],
            })

    # Evaluate strictly within the F&O 1-3 DAYS / intraday expiry window
    for r in results:
        r["target_horizon"] = horizon
        bi = r["bar_index"]
        entry = float(r["entry"])
        target = float(r["target"])
        sl = float(r["stop_loss"])
        is_bullish = r["is_bullish"]

        # Calculate F&O Option Contract & Strike (CE / PE)
        atm_strike = calculate_fno_strike(entry)
        opt_type = "CE" if is_bullish else "PE"
        strike_fmt = int(atm_strike) if atm_strike.is_integer() else atm_strike
        fno_strike_str = f"{strike_fmt} {opt_type}"
        fno_instrument = f"BUY {fno_strike_str} / {'BUY' if is_bullish else 'SHORT'} FUTURE"
        holding_label = "1–3 Days" if timeframe in ["1D", "1W"] else ("15–30 Mins" if timeframe in ["1m", "5m"] else "1–2 Hours")

        r["option_type"] = opt_type
        r["fno_strike"] = fno_strike_str
        r["fno_instrument"] = fno_instrument
        r["max_holding_days"] = holding_label

        outcome = "ACTIVE"
        bars_to_outcome = 0
        pnl_points = 0.0
        end_bar = min(bi + 1 + max_bars, n)

        hit_target = False
        hit_sl = False

        if is_bullish is True:
            for j in range(bi + 1, end_bar):
                hi = float(df["High"].iloc[j])
                lo = float(df["Low"].iloc[j])

                if hi >= target and lo <= sl:
                    if float(df["Open"].iloc[j]) >= entry:
                        hit_target = True
                        bars_to_outcome = j - bi
                        break
                    else:
                        hit_sl = True
                        bars_to_outcome = j - bi
                        break
                elif hi >= target:
                    hit_target = True
                    bars_to_outcome = j - bi
                    break
                elif lo <= sl:
                    hit_sl = True
                    bars_to_outcome = j - bi
                    break

            if hit_target:
                outcome = "TARGET_HIT"
                pnl_points = round(target - entry, 2)
            elif hit_sl:
                outcome = "SL_HIT"
                pnl_points = -round(entry - sl, 2)
            elif end_bar < n:
                # Reached Max F&O Holding Period (Day 3) -> Closed on time to prevent Theta decay
                outcome = "TIME_EXPIRED"
                bars_to_outcome = max_bars
                exit_price = float(df["Close"].iloc[end_bar - 1])
                pnl_points = round(exit_price - entry, 2)
            else:
                outcome = "ACTIVE"
                bars_to_outcome = n - 1 - bi
                curr_c = float(df["Close"].iloc[-1])
                pnl_points = round(curr_c - entry, 2)

        elif is_bullish is False:
            for j in range(bi + 1, end_bar):
                hi = float(df["High"].iloc[j])
                lo = float(df["Low"].iloc[j])

                if lo <= target and hi >= sl:
                    if float(df["Open"].iloc[j]) <= entry:
                        hit_target = True
                        bars_to_outcome = j - bi
                        break
                    else:
                        hit_sl = True
                        bars_to_outcome = j - bi
                        break
                elif lo <= target:
                    hit_target = True
                    bars_to_outcome = j - bi
                    break
                elif hi >= sl:
                    hit_sl = True
                    bars_to_outcome = j - bi
                    break

            if hit_target:
                outcome = "TARGET_HIT"
                pnl_points = round(entry - target, 2)
            elif hit_sl:
                outcome = "SL_HIT"
                pnl_points = -round(sl - entry, 2)
            elif end_bar < n:
                outcome = "TIME_EXPIRED"
                bars_to_outcome = max_bars
                exit_price = float(df["Close"].iloc[end_bar - 1])
                pnl_points = round(entry - exit_price, 2)
            else:
                outcome = "ACTIVE"
                bars_to_outcome = n - 1 - bi
                curr_c = float(df["Close"].iloc[-1])
                pnl_points = round(entry - curr_c, 2)
        else:
            outcome = "WATCH"
            pnl_points = 0.0

        r["outcome"] = outcome
        r["bars_to_outcome"] = bars_to_outcome
        r["pnl_points"] = pnl_points

    results.sort(key=lambda r: r["bar_index"])
    return results
