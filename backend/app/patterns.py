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
    
    return df
