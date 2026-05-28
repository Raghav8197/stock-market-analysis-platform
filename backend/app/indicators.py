import pandas as pd
import numpy as np

def calculate_sma(series: pd.Series, period: int = 20) -> pd.Series:
    """Calculate Simple Moving Average."""
    return series.rolling(window=period).mean()

def calculate_ema(series: pd.Series, period: int = 20) -> pd.Series:
    """Calculate Exponential Moving Average."""
    return series.ewm(span=period, adjust=False).mean()

def calculate_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """Calculate Relative Strength Index."""
    delta = series.diff()
    
    # Separate positive and negative price moves
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    
    # Calculate Wilder's EMA for gains and losses
    # Wilder's smoothing is equivalent to an EMA with com = period - 1
    avg_gain = gain.ewm(com=period - 1, adjust=False).mean()
    avg_loss = loss.ewm(com=period - 1, adjust=False).mean()
    
    # Avoid division by zero
    rs = avg_gain / np.where(avg_loss == 0, 0.00001, avg_loss)
    rsi = 100 - (100 / (1 + rs))
    
    # Return NaN for the first `period` elements
    rsi.iloc[:period] = np.nan
    return rsi

def calculate_macd(series: pd.Series, fast_period: int = 12, slow_period: int = 26, signal_period: int = 9) -> dict:
    """Calculate MACD Line, Signal Line, and Histogram."""
    fast_ema = calculate_ema(series, fast_period)
    slow_ema = calculate_ema(series, slow_period)
    
    macd_line = fast_ema - slow_ema
    signal_line = calculate_ema(macd_line, signal_period)
    macd_hist = macd_line - signal_line
    
    return {
        "macd": macd_line,
        "signal": signal_line,
        "hist": macd_hist
    }

def calculate_bollinger_bands(series: pd.Series, period: int = 20, num_std: float = 2.0) -> dict:
    """Calculate Bollinger Bands (Middle, Upper, and Lower)."""
    middle_band = calculate_sma(series, period)
    std_dev = series.rolling(window=period).std()
    
    upper_band = middle_band + (std_dev * num_std)
    lower_band = middle_band - (std_dev * num_std)
    
    return {
        "middle": middle_band,
        "upper": upper_band,
        "lower": lower_band
    }

def add_all_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """Add all required indicators to a historical dataframe."""
    df = df.copy()
    close_series = df["Close"]
    
    df["SMA_20"] = calculate_sma(close_series, 20)
    df["EMA_50"] = calculate_ema(close_series, 50)
    df["EMA_200"] = calculate_ema(close_series, 200)
    df["RSI"] = calculate_rsi(close_series, 14)
    
    macd_data = calculate_macd(close_series)
    df["MACD"] = macd_data["macd"]
    df["MACD_Signal"] = macd_data["signal"]
    df["MACD_Hist"] = macd_data["hist"]
    
    bb_data = calculate_bollinger_bands(close_series)
    df["BB_Middle"] = bb_data["middle"]
    df["BB_Upper"] = bb_data["upper"]
    df["BB_Lower"] = bb_data["lower"]
    
    return df
