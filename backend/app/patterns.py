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


def detect_patterns_with_levels(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Detect all patterns and compute actionable trading levels (entry, target, stop_loss).
    Returns a list of dicts with pattern details and key chart points.
    The dataframe must already have OHLCV columns.
    """
    results: List[Dict[str, Any]] = []
    close = df["Close"]

    # ── 1. Double Bottom (W-Pattern) ───────────────────────────────────────
    peaks, troughs = find_local_extrema(close, window=5)
    tolerance = 0.02

    for idx_t1 in range(len(troughs) - 1):
        i1, date1, val1 = troughs[idx_t1]
        i2, date2, val2 = troughs[idx_t1 + 1]

        if 10 <= (i2 - i1) <= 60:
            if abs(val1 - val2) / val1 <= tolerance:
                neckline_val = close.iloc[i1:i2].max()
                neckline_pos = int(close.iloc[i1:i2].values.argmax()) + i1

                if neckline_val > max(val1, val2) * 1.04:
                    pattern_height = neckline_val - min(val1, val2)
                    results.append({
                        "bar_index": i2,
                        "pattern": "Double Bottom (W-Pattern)",
                        "is_bullish": True,
                        "entry": round(neckline_val, 2),
                        "target": round(neckline_val + pattern_height, 2),
                        "stop_loss": round(min(val1, val2) * 0.99, 2),
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

        if 10 <= (i2 - i1) <= 60:
            if abs(val1 - val2) / val1 <= tolerance:
                neckline_val = close.iloc[i1:i2].min()
                neckline_pos = int(close.iloc[i1:i2].values.argmin()) + i1

                if neckline_val < min(val1, val2) * 0.96:
                    peak_level = max(val1, val2)
                    pattern_height = peak_level - neckline_val
                    results.append({
                        "bar_index": i2,
                        "pattern": "Double Top (M-Pattern)",
                        "is_bullish": False,
                        "entry": round(neckline_val, 2),
                        "target": round(neckline_val - pattern_height, 2),
                        "stop_loss": round(max(val1, val2) * 1.01, 2),
                        "confidence": "HIGH",
                        "pattern_points": [
                            {"bar_index": i1, "price": round(val1, 2), "label": "Peak 1"},
                            {"bar_index": neckline_pos, "price": round(neckline_val, 2), "label": "Neckline"},
                            {"bar_index": i2, "price": round(val2, 2), "label": "Peak 2"},
                        ],
                    })

    # ── 3. Head & Shoulders ────────────────────────────────────────────────
    hs_tolerance = 0.03
    for i in range(len(peaks) - 2):
        i1, d1, val_ls = peaks[i]
        i2, d2, val_hd = peaks[i + 1]
        i3, d3, val_rs = peaks[i + 2]

        if 8 <= (i2 - i1) <= 40 and 8 <= (i3 - i2) <= 40:
            if val_hd > val_ls and val_hd > val_rs:
                if abs(val_ls - val_rs) / val_ls <= hs_tolerance:
                    trough1_val = close.iloc[i1:i2].min()
                    trough1_pos = int(close.iloc[i1:i2].values.argmin()) + i1
                    trough2_val = close.iloc[i2:i3].min()
                    trough2_pos = int(close.iloc[i2:i3].values.argmin()) + i2

                    if trough1_val < min(val_ls, val_hd) and trough2_val < min(val_rs, val_hd):
                        neckline = (trough1_val + trough2_val) / 2
                        pattern_height = val_hd - neckline
                        results.append({
                            "bar_index": i3,
                            "pattern": "Head & Shoulders",
                            "is_bullish": False,
                            "entry": round(neckline, 2),
                            "target": round(neckline - pattern_height, 2),
                            "stop_loss": round(val_rs * 1.01, 2),
                            "confidence": "HIGH",
                            "pattern_points": [
                                {"bar_index": i1, "price": round(val_ls, 2), "label": "Left Shoulder"},
                                {"bar_index": trough1_pos, "price": round(trough1_val, 2), "label": "Neckline L"},
                                {"bar_index": i2, "price": round(val_hd, 2), "label": "Head"},
                                {"bar_index": trough2_pos, "price": round(trough2_val, 2), "label": "Neckline R"},
                                {"bar_index": i3, "price": round(val_rs, 2), "label": "Right Shoulder"},
                            ],
                        })

    # ── 4 & 5. Engulfing Patterns ──────────────────────────────────────────
    for i in range(1, len(df)):
        open_prev = df["Open"].iloc[i - 1]
        close_prev = df["Close"].iloc[i - 1]
        open_curr = df["Open"].iloc[i]
        close_curr = df["Close"].iloc[i]
        high_curr = df["High"].iloc[i]
        low_curr = df["Low"].iloc[i]
        candle_range = high_curr - low_curr

        # Bullish Engulfing
        if (close_prev < open_prev) and (close_curr > open_curr):
            if (open_curr <= close_prev) and (close_curr >= open_prev) and (
                (open_curr < close_prev) or (close_curr > open_prev)
            ):
                results.append({
                    "bar_index": i,
                    "pattern": "Bullish Engulfing",
                    "is_bullish": True,
                    "entry": round(close_curr, 2),
                    "target": round(close_curr + 2 * candle_range, 2),
                    "stop_loss": round(low_curr * 0.995, 2),
                    "confidence": "MEDIUM",
                    "pattern_points": [
                        {"bar_index": i - 1, "price": round(close_prev, 2), "label": "Prior Close"},
                        {"bar_index": i, "price": round(close_curr, 2), "label": "Engulfing Close"},
                    ],
                })

        # Bearish Engulfing
        if (close_prev > open_prev) and (close_curr < open_curr):
            if (open_curr >= close_prev) and (close_curr <= open_prev) and (
                (open_curr > close_prev) or (close_curr < open_prev)
            ):
                results.append({
                    "bar_index": i,
                    "pattern": "Bearish Engulfing",
                    "is_bullish": False,
                    "entry": round(close_curr, 2),
                    "target": round(close_curr - 2 * candle_range, 2),
                    "stop_loss": round(high_curr * 1.005, 2),
                    "confidence": "MEDIUM",
                    "pattern_points": [
                        {"bar_index": i - 1, "price": round(close_prev, 2), "label": "Prior Close"},
                        {"bar_index": i, "price": round(close_curr, 2), "label": "Engulfing Close"},
                    ],
                })

    # ── 6. Hammer ──────────────────────────────────────────────────────────
    body = (df["Close"] - df["Open"]).abs()
    candle_range_s = df["High"] - df["Low"]
    lower_shadow = df[["Open", "Close"]].min(axis=1) - df["Low"]
    upper_shadow = df["High"] - df[["Open", "Close"]].max(axis=1)

    for i in range(len(df)):
        if (
            body.iloc[i] > 0
            and lower_shadow.iloc[i] >= 2 * body.iloc[i]
            and upper_shadow.iloc[i] <= candle_range_s.iloc[i] * 0.15
            and candle_range_s.iloc[i] > 0
        ):
            c = df["Close"].iloc[i]
            h = df["High"].iloc[i]
            lo = df["Low"].iloc[i]
            results.append({
                "bar_index": i,
                "pattern": "Hammer",
                "is_bullish": True,
                "entry": round(c, 2),
                "target": round(c + (h - lo), 2),
                "stop_loss": round(lo * 0.995, 2),
                "confidence": "LOW",
                "pattern_points": [
                    {"bar_index": i, "price": round(lo, 2), "label": "Hammer Low"},
                    {"bar_index": i, "price": round(c, 2), "label": "Hammer Close"},
                ],
            })

    # ── 7. Shooting Star ──────────────────────────────────────────────────
    for i in range(len(df)):
        if (
            body.iloc[i] > 0
            and upper_shadow.iloc[i] >= 2 * body.iloc[i]
            and lower_shadow.iloc[i] <= candle_range_s.iloc[i] * 0.15
            and candle_range_s.iloc[i] > 0
        ):
            c = df["Close"].iloc[i]
            h = df["High"].iloc[i]
            lo = df["Low"].iloc[i]
            results.append({
                "bar_index": i,
                "pattern": "Shooting Star",
                "is_bullish": False,
                "entry": round(c, 2),
                "target": round(c - (h - lo), 2),
                "stop_loss": round(h * 1.005, 2),
                "confidence": "LOW",
                "pattern_points": [
                    {"bar_index": i, "price": round(h, 2), "label": "Star High"},
                    {"bar_index": i, "price": round(c, 2), "label": "Star Close"},
                ],
            })

    # ── 8. Morning Star ───────────────────────────────────────────────────
    for i in range(2, len(df)):
        o1, c1 = df["Open"].iloc[i - 2], df["Close"].iloc[i - 2]
        o2, c2 = df["Open"].iloc[i - 1], df["Close"].iloc[i - 1]
        o3, c3 = df["Open"].iloc[i], df["Close"].iloc[i]

        body1 = abs(c1 - o1)
        body2 = abs(c2 - o2)
        body3 = abs(c3 - o3)

        if (c1 < o1) and (c3 > o3):
            if body2 < body1 * 0.4 and body2 < body3 * 0.4:
                midpoint1 = (o1 + c1) / 2
                if max(o2, c2) < midpoint1:
                    if c3 > midpoint1:
                        lo_all = min(df["Low"].iloc[i - 2], df["Low"].iloc[i - 1], df["Low"].iloc[i])
                        results.append({
                            "bar_index": i,
                            "pattern": "Morning Star",
                            "is_bullish": True,
                            "entry": round(c3, 2),
                            "target": round(c3 + body1, 2),
                            "stop_loss": round(lo_all * 0.995, 2),
                            "confidence": "MEDIUM",
                            "pattern_points": [
                                {"bar_index": i - 2, "price": round(o1, 2), "label": "Candle 1 Open"},
                                {"bar_index": i - 1, "price": round(c2, 2), "label": "Star"},
                                {"bar_index": i, "price": round(c3, 2), "label": "Confirmation Close"},
                            ],
                        })

    # ── 9. Evening Star ───────────────────────────────────────────────────
    for i in range(2, len(df)):
        o1, c1 = df["Open"].iloc[i - 2], df["Close"].iloc[i - 2]
        o2, c2 = df["Open"].iloc[i - 1], df["Close"].iloc[i - 1]
        o3, c3 = df["Open"].iloc[i], df["Close"].iloc[i]

        body1 = abs(c1 - o1)
        body2 = abs(c2 - o2)
        body3 = abs(c3 - o3)

        if (c1 > o1) and (c3 < o3):
            if body2 < body1 * 0.4 and body2 < body3 * 0.4:
                midpoint1 = (o1 + c1) / 2
                if min(o2, c2) > midpoint1:
                    if c3 < midpoint1:
                        hi_all = max(df["High"].iloc[i - 2], df["High"].iloc[i - 1], df["High"].iloc[i])
                        results.append({
                            "bar_index": i,
                            "pattern": "Evening Star",
                            "is_bullish": False,
                            "entry": round(c3, 2),
                            "target": round(c3 - body1, 2),
                            "stop_loss": round(hi_all * 1.005, 2),
                            "confidence": "MEDIUM",
                            "pattern_points": [
                                {"bar_index": i - 2, "price": round(o1, 2), "label": "Candle 1 Open"},
                                {"bar_index": i - 1, "price": round(c2, 2), "label": "Star"},
                                {"bar_index": i, "price": round(c3, 2), "label": "Confirmation Close"},
                            ],
                        })

    # ── 10. Doji (neutral – WATCH) ────────────────────────────────────────
    doji_threshold = 0.1
    for i in range(len(df)):
        b = abs(df["Close"].iloc[i] - df["Open"].iloc[i])
        cr = df["High"].iloc[i] - df["Low"].iloc[i]
        if cr > 0 and b <= doji_threshold * cr:
            c = df["Close"].iloc[i]
            h = df["High"].iloc[i]
            lo = df["Low"].iloc[i]
            results.append({
                "bar_index": i,
                "pattern": "Doji",
                "is_bullish": None,  # neutral
                "entry": round(c, 2),
                "target": round(c + (h - lo), 2),
                "stop_loss": round(lo * 0.995, 2),
                "confidence": "LOW",
                "pattern_points": [
                    {"bar_index": i, "price": round(c, 2), "label": "Doji"},
                ],
            })

    # Sort results by bar_index for chronological ordering
    results.sort(key=lambda r: r["bar_index"])
    return results
