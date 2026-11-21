import React, { useEffect, useRef, memo } from "react";

// Maps platform symbol to TradingView official continuous and exchange tickers
export const getTradingViewSymbol = (symbol) => {
  if (!symbol) return "MCX:GOLD1!";
  const s = symbol.toUpperCase().replace("MCX:", "").replace(".MCX", "").replace("MCX_", "").trim();
  
  const map = {
    "GOLD": "MCX:GOLD1!",
    "GOLDM": "MCX:GOLDM1!",
    "GOLDMINI": "MCX:GOLDM1!",
    "SILVER": "MCX:SILVER1!",
    "SILVERM": "MCX:SILVERM1!",
    "SILVERMINI": "MCX:SILVERM1!",
    "SILVERMIC": "MCX:SILVERMIC1!",
    "SILVERMICRO": "MCX:SILVERMIC1!",
    "CRUDEOIL": "MCX:CRUDEOIL1!",
    "CRUDEOILM": "MCX:CRUDEOILM1!",
    "CRUDEOILMINI": "MCX:CRUDEOILM1!",
    "NATURALGAS": "MCX:NATURALGAS1!",
    "NATGASMINI": "MCX:NATGASMINI1!",
    "NATURALGASMINI": "MCX:NATGASMINI1!",
    "COPPER": "MCX:COPPER1!",
    "NIFTY": "NSE:NIFTY",
    "BANKNIFTY": "NSE:BANKNIFTY",
    "GIFTNIFTY": "NSE:NIFTY",
    "SENSEX": "BSE:SENSEX",
    "RELIANCE": "NSE:RELIANCE",
    "TCS": "NSE:TCS",
    "INFY": "NSE:INFY",
    "HDFCBANK": "NSE:HDFCBANK",
    "AAPL": "NASDAQ:AAPL",
    "MSFT": "NASDAQ:MSFT",
    "TSLA": "NASDAQ:TSLA",
    "AMZN": "NASDAQ:AMZN",
    "NVDA": "NASDAQ:NVDA",
    "BTC": "BINANCE:BTCUSDT",
    "ETH": "BINANCE:ETHUSDT",
    "USDINR": "FX_IDC:USDINR",
    "EURUSD": "FX:EURUSD"
  };

  if (map[s]) return map[s];
  if (s.endsWith(".NS")) return `NSE:${s.replace(".NS", "")}`;
  if (s.endsWith(".BO")) return `BSE:${s.replace(".BO", "")}`;
  return s;
};

const TradingViewWidget = ({ 
  symbol = "GOLD", 
  timeframe = "D", 
  height = 500,
  theme = "dark" 
}) => {
  const containerRef = useRef(null);
  const tvSymbol = getTradingViewSymbol(symbol);

  // Map platform timeframes to TradingView intervals
  const tvInterval = 
    timeframe === "1m" ? "1" :
    timeframe === "2m" ? "2" :
    timeframe === "3m" ? "3" :
    timeframe === "5m" ? "5" :
    timeframe === "15m" ? "15" :
    timeframe === "30m" ? "30" :
    (timeframe === "60m" || timeframe === "1h") ? "60" :
    timeframe === "1W" ? "W" : "D";

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "100%";
    widgetDiv.style.width = "100%";
    container.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: tvInterval,
      timezone: "Asia/Kolkata",
      theme: theme,
      style: "1",
      locale: "in",
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: true,
      withdateranges: true,
      details: true,
      hotlist: true,
      calendar: false,
      studies: [
        "STD;SMA",
        "STD;EMA",
        "STD;RSI"
      ]
    });
    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [tvSymbol, tvInterval, theme]);

  return (
    <div 
      className="tradingview-widget-container w-full rounded-xl overflow-hidden border border-gray-850 shadow-2xl bg-gray-950"
      ref={containerRef}
      style={{ height: `${height}px`, minHeight: `${height}px` }}
    />
  );
};

export default memo(TradingViewWidget);
