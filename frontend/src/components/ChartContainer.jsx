import React, { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries, LineSeries, HistogramSeries, createSeriesMarkers } from "lightweight-charts";
import api from "../services/api";

const isIndianSymbol = (symbol) => {
  if (!symbol) return false;
  const s = symbol.toUpperCase();
  return (
    ["NIFTY", "BANKNIFTY", "GIFTNIFTY", "SENSEX", "^NSEI", "^NSEBANK", "GIFTY=F", "^BSESN"].includes(s) ||
    s.endsWith(".NS") ||
    s.endsWith(".BO") ||
    ["RELIANCE", "TCS", "INFY", "HDFCBANK"].includes(s)
  );
};

const SEARCH_DATABASE = [
  { symbol: "AAPL", name: "Apple Inc.", market: "US" },
  { symbol: "MSFT", name: "Microsoft Corp.", market: "US" },
  { symbol: "TSLA", name: "Tesla Inc.", market: "US" },
  { symbol: "AMZN", name: "Amazon.com Inc.", market: "US" },
  { symbol: "NVDA", name: "NVIDIA Corporation", market: "US" },
  { symbol: "RELIANCE", name: "Reliance Industries Ltd.", market: "IN" },
  { symbol: "TCS", name: "Tata Consultancy Services Ltd.", market: "IN" },
  { symbol: "INFY", name: "Infosys Limited", market: "IN" },
  { symbol: "HDFCBANK", name: "HDFC Bank Limited", market: "IN" },
  { symbol: "NIFTY", name: "Nifty 50 Index", market: "IN" },
  { symbol: "BANKNIFTY", name: "Bank Nifty Index", market: "IN" },
  { symbol: "GIFTNIFTY", name: "GIFT Nifty Index", market: "IN" },
  { symbol: "SENSEX", name: "SENSEX Index", market: "IN" },
  { symbol: "NASDAQ", name: "NASDAQ 100 Index", market: "US" },
  { symbol: "SP500", name: "S&P 500 Index", market: "US" },
  { symbol: "BTC", name: "Bitcoin / USD", market: "Crypto" },
  { symbol: "ETH", name: "Ethereum / USD", market: "Crypto" },
  { symbol: "USDINR", name: "USD / INR Exchange Rate", market: "Forex" },
  { symbol: "EURUSD", name: "EUR / USD Exchange Rate", market: "Forex" }
];

import Fundamentals from "./Fundamentals";
import { 
  Eye, 
  EyeOff, 
  Settings, 
  Search, 
  Activity,
  Loader2,
  CheckCircle2,
  AlertOctagon,
  Trophy
} from "lucide-react";

const TIMEFRAME_TARGET_HORIZONS = {
  "1m": {
    horizon: "5-Min Scalp Target",
    shortName: "5-Min Target",
    minPct: 0.0030,
    maxPct: 0.0070,
    mult: 1.2,
    slMult: 0.75,
    minSlPct: 0.0020,
  },
  "5m": {
    horizon: "15-Min Momentum Target",
    shortName: "15-Min Target",
    minPct: 0.0070,
    maxPct: 0.0150,
    mult: 1.6,
    slMult: 0.85,
    minSlPct: 0.0040,
  },
  "15m": {
    horizon: "30-Min Session Target",
    shortName: "30-Min Target",
    minPct: 0.0120,
    maxPct: 0.0260,
    mult: 1.9,
    slMult: 0.95,
    minSlPct: 0.0070,
  },
  "60m": {
    horizon: "1-Hour Horizon Target",
    shortName: "1-Hour Target",
    minPct: 0.0180,
    maxPct: 0.0380,
    mult: 2.2,
    slMult: 1.10,
    minSlPct: 0.0110,
  },
  "1h": {
    horizon: "1-Hour Horizon Target",
    shortName: "1-Hour Target",
    minPct: 0.0180,
    maxPct: 0.0380,
    mult: 2.2,
    slMult: 1.10,
    minSlPct: 0.0110,
  },
  "1D": {
    horizon: "Swing Target (1-3 Days)",
    shortName: "1-3D Swing",
    minPct: 0.0350,
    maxPct: 0.0650,
    mult: 2.5,
    slMult: 1.25,
    minSlPct: 0.0180,
  },
  "1W": {
    horizon: "Positional Target (1-2 Weeks)",
    shortName: "1-2W Positional",
    minPct: 0.0650,
    maxPct: 0.1200,
    mult: 3.0,
    slMult: 1.50,
    minSlPct: 0.0350,
  }
};

const enrichPatternWithLevels = (p, candles, timeframe = "1D") => {
  const tfConfig = TIMEFRAME_TARGET_HORIZONS[timeframe] || TIMEFRAME_TARGET_HORIZONS["1D"];
  const name = p.pattern || "Pattern";
  const isBullish = 
    p.recommendation === "BUY" || 
    p.position === "belowBar" || 
    name.toLowerCase().includes("bottom") || 
    name.toLowerCase().includes("hammer") || 
    name.toLowerCase().includes("morning") || 
    name.toLowerCase().includes("bullish");
  
  const isBearish = 
    p.recommendation === "SELL" || 
    p.position === "aboveBar" || 
    name.toLowerCase().includes("top") || 
    name.toLowerCase().includes("shooting") || 
    name.toLowerCase().includes("evening") || 
    name.toLowerCase().includes("bearish") || 
    name.toLowerCase().includes("head");

  const lastCandle = candles && candles.length > 0 ? candles[candles.length - 1] : null;
  const price = Number(p.price) || (lastCandle ? Number(lastCandle.close) : 100);
  
  const matchedCandle = candles?.find(c => c.time === p.time) || lastCandle;
  const candleRange = matchedCandle && matchedCandle.high > matchedCandle.low 
    ? (matchedCandle.high - matchedCandle.low) 
    : price * tfConfig.minPct;

  let entry = p.entry ? Number(p.entry) : price;
  
  // Calculate dynamic timeframe-calibrated target and stop loss move
  const targetMove = Math.min(
    Math.max(candleRange * tfConfig.mult, entry * tfConfig.minPct),
    entry * tfConfig.maxPct
  );
  const slMove = Math.max(candleRange * tfConfig.slMult, entry * tfConfig.minSlPct);

  let target = 0;
  let stopLoss = 0;

  if (isBullish) {
    target = entry + targetMove;
    stopLoss = entry - slMove;
  } else if (isBearish) {
    target = entry - targetMove;
    stopLoss = entry + slMove;
  } else {
    target = entry + targetMove * 0.7;
    stopLoss = entry - slMove * 0.7;
  }

  const targetPoints = Math.abs(target - entry);
  const targetPct = entry > 0 ? ((targetPoints / entry) * 100).toFixed(2) : "0.00";
  const slPoints = Math.abs(entry - stopLoss);
  const slPct = entry > 0 ? ((slPoints / entry) * 100).toFixed(2) : "0.00";
  const rr = slPoints > 0 ? (targetPoints / slPoints).toFixed(1) : "2.0";

  // Evaluate whether subsequent price bars hit target or stop loss
  let outcome = p.outcome || "ACTIVE";
  let pnlPoints = p.pnl_points !== undefined ? Number(p.pnl_points) : 0;
  
  if ((!p.outcome || p.outcome === "ACTIVE") && candles && candles.length > 0) {
    const patternIdx = candles.findIndex(c => String(c.time) === String(p.time));
    if (patternIdx !== -1 && patternIdx < candles.length - 1) {
      if (isBullish) {
        for (let j = patternIdx + 1; j < candles.length; j++) {
          const hi = Number(candles[j].high);
          const lo = Number(candles[j].low);
          if (hi >= target) {
            outcome = "TARGET_HIT";
            pnlPoints = Number((target - entry).toFixed(2));
            break;
          } else if (lo <= stopLoss) {
            outcome = "SL_HIT";
            pnlPoints = -Number((entry - stopLoss).toFixed(2));
            break;
          }
        }
      } else if (isBearish) {
        for (let j = patternIdx + 1; j < candles.length; j++) {
          const hi = Number(candles[j].high);
          const lo = Number(candles[j].low);
          if (lo <= target) {
            outcome = "TARGET_HIT";
            pnlPoints = Number((entry - target).toFixed(2));
            break;
          } else if (hi >= stopLoss) {
            outcome = "SL_HIT";
            pnlPoints = -Number((stopLoss - entry).toFixed(2));
            break;
          }
        }
      }
    }
  }

  return {
    ...p,
    recommendation: isBullish ? "BUY" : isBearish ? "SELL" : (p.recommendation || "WATCH"),
    target_horizon: tfConfig.horizon,
    horizon_short: tfConfig.shortName,
    timeframe: timeframe,
    entry: Number(entry.toFixed(2)),
    target: Number(target.toFixed(2)),
    stop_loss: Number(stopLoss.toFixed(2)),
    target_points: Number(targetPoints.toFixed(2)),
    target_pct: targetPct,
    sl_points: Number(slPoints.toFixed(2)),
    sl_pct: slPct,
    risk_reward: rr,
    confidence: p.confidence || (name.includes("Bottom") || name.includes("Top") || name.includes("Head") ? "HIGH" : "MEDIUM"),
    outcome: outcome,
    pnl_points: pnlPoints
  };
};

const ChartContainer = ({ symbol, setSymbol }) => {
  const chartContainerRef = useRef(null);
  const rsiContainerRef = useRef(null);
  const macdContainerRef = useRef(null);
  const chartRef = useRef(null);
  const rsiChartRef = useRef(null);
  const macdChartRef = useRef(null);
  
  // Chart Series References
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const sma20SeriesRef = useRef(null);
  const ema50SeriesRef = useRef(null);
  const ema200SeriesRef = useRef(null);
  const bbUpperSeriesRef = useRef(null);
  const bbMiddleSeriesRef = useRef(null);
  const bbLowerSeriesRef = useRef(null);
  const rsiSeriesRef = useRef(null);
  const macdLineSeriesRef = useRef(null);
  const macdSignalSeriesRef = useRef(null);
  const macdHistSeriesRef = useRef(null);

  // States
  const [timeframe, setTimeframe] = useState("1D");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [searchInput, setSearchInput] = useState(symbol);
  const [activeChartTab, setActiveChartTab] = useState("technical"); // technical, fundamental

  // Suggestions states
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    if (!searchInput || searchInput.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    
    const delayDebounce = setTimeout(async () => {
      try {
        const response = await api.get(`/api/stocks/search?q=${searchInput.trim()}`);
        const mapped = response.data.map(item => ({
          symbol: item.symbol,
          name: item.name,
          market: item.exchange
        }));
        setSuggestions(mapped);
      } catch (err) {
        console.error("Failed to fetch chart suggestions:", err);
      }
    }, 300);
    
    return () => clearTimeout(delayDebounce);
  }, [searchInput]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  // Indicator Toggles
  const [showSMA20, setShowSMA20] = useState(true);
  const [showEMA50, setShowEMA50] = useState(false);
  const [showEMA200, setShowEMA200] = useState(false);
  const [showBB, setShowBB] = useState(false);
  const [showRSI, setShowRSI] = useState(true);
  const [showMACD, setShowMACD] = useState(true);

  // Fetch Chart Data
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [selectedPatternIndex, setSelectedPatternIndex] = useState(null);

  const fetchChartData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/stocks/${symbol}/history?timeframe=${timeframe}`);
      const rawData = response.data;
      if (rawData && rawData.candles) {
        const enrichedPatterns = (rawData.detected_patterns || []).map(p => enrichPatternWithLevels(p, rawData.candles, timeframe));
        setData({
          ...rawData,
          detected_patterns: enrichedPatterns
        });
      } else {
        setData(rawData);
      }
      setSelectedPatternIndex(null);
    } catch (error) {
      console.error("Failed to load historical data:", error);
      alert("Symbol not found or data retrieval failed.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalysisData = async () => {
    setAnalysisLoading(true);
    try {
      const response = await api.get(`/api/stocks/${symbol}/analysis`);
      setAnalysis(response.data);
    } catch (error) {
      console.error("Failed to load analysis data:", error);
    } finally {
      setAnalysisLoading(false);
    }
  };

  useEffect(() => {
    fetchChartData();
    fetchAnalysisData();
  }, [symbol, timeframe]);

  // Sync Search Input to external symbol changes
  useEffect(() => {
    setSearchInput(symbol);
  }, [symbol]);

  // Initialize and Render Charts
  useEffect(() => {
    if (!data || !chartContainerRef.current) return;

    // 1. Setup Price & Indicator Chart
    const priceChartWidth = chartContainerRef.current.clientWidth;
    const priceChartHeight = 400;

    const chart = createChart(chartContainerRef.current, {
      width: priceChartWidth,
      height: priceChartHeight,
      layout: {
        background: { color: "#151B2E" },
        textColor: "#9CA3AF",
      },
      grid: {
        vertLines: { color: "rgba(31, 41, 55, 0.5)" },
        horzLines: { color: "rgba(31, 41, 55, 0.5)" },
      },
      crosshair: {
        mode: 0, // Normal crosshair
        vertLine: { color: "#6366F1", width: 1, style: 3 },
        horzLine: { color: "#6366F1", width: 1, style: 3 },
      },
      timeScale: {
        borderColor: "#1F2937",
        timeVisible: ["1m", "5m", "15m", "60m", "1h"].includes(timeframe),
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "#1F2937",
      }
    });

    chartRef.current = chart;

    // Add Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10B981",
      downColor: "#EF4444",
      borderUpColor: "#10B981",
      borderDownColor: "#EF4444",
      wickUpColor: "#10B981",
      wickDownColor: "#EF4444",
    });
    candleSeriesRef.current = candleSeries;

    // Add Volume Series (renders overlayed at bottom)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#26a69a",
      priceFormat: { type: "volume" },
      priceScaleId: "", // Overlay on the main chart
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8, // volume takes bottom 20%
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    // Map candle data
    const candleData = data.candles.map(c => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    }));
    candleSeries.setData(candleData);

    const volumeData = data.candles.map(c => ({
      time: c.time,
      value: c.volume,
      color: c.close >= c.open ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"
    }));
    volumeSeries.setData(volumeData);

    // Render Indicators
    if (showSMA20) {
      const smaData = data.candles
        .filter(c => c.sma_20 !== null)
        .map(c => ({ time: c.time, value: c.sma_20 }));
      sma20SeriesRef.current = chart.addSeries(LineSeries, { color: "#F59E0B", lineWidth: 1.5, title: "SMA 20" });
      sma20SeriesRef.current.setData(smaData);
    }

    if (showEMA50) {
      const emaData = data.candles
        .filter(c => c.ema_50 !== null)
        .map(c => ({ time: c.time, value: c.ema_50 }));
      ema50SeriesRef.current = chart.addSeries(LineSeries, { color: "#3B82F6", lineWidth: 1.5, title: "EMA 50" });
      ema50SeriesRef.current.setData(emaData);
    }

    if (showEMA200) {
      const emaData = data.candles
        .filter(c => c.ema_200 !== null)
        .map(c => ({ time: c.time, value: c.ema_200 }));
      ema200SeriesRef.current = chart.addSeries(LineSeries, { color: "#A855F7", lineWidth: 2, title: "EMA 200" });
      ema200SeriesRef.current.setData(emaData);
    }

    if (showBB) {
      const bbUpper = data.candles.filter(c => c.bb_upper !== null).map(c => ({ time: c.time, value: c.bb_upper }));
      const bbMiddle = data.candles.filter(c => c.bb_middle !== null).map(c => ({ time: c.time, value: c.bb_middle }));
      const bbLower = data.candles.filter(c => c.bb_lower !== null).map(c => ({ time: c.time, value: c.bb_lower }));
      
      bbUpperSeriesRef.current = chart.addSeries(LineSeries, { color: "rgba(239, 68, 68, 0.5)", lineWidth: 1, lineStyle: 2, title: "BB Upper" });
      bbMiddleSeriesRef.current = chart.addSeries(LineSeries, { color: "rgba(245, 158, 11, 0.4)", lineWidth: 1, title: "BB Middle" });
      bbLowerSeriesRef.current = chart.addSeries(LineSeries, { color: "rgba(16, 185, 129, 0.5)", lineWidth: 1, lineStyle: 2, title: "BB Lower" });
      
      bbUpperSeriesRef.current.setData(bbUpper);
      bbMiddleSeriesRef.current.setData(bbMiddle);
      bbLowerSeriesRef.current.setData(bbLower);
    }

    // Render Pattern Markers
    if (data.detected_patterns && data.detected_patterns.length > 0) {
      const markers = data.detected_patterns.map(p => ({
        time: p.time,
        position: p.position, // aboveBar or belowBar
        color: p.color,
        shape: p.position === "belowBar" ? "arrowUp" : "arrowDown",
        text: p.pattern.replace("_", " ").toUpperCase(),
        size: 1.5
      }));
      createSeriesMarkers(candleSeries, markers);

      // Draw Entry / Target / Stop Loss price lines for selected or latest pattern
      const currencySym = isIndianSymbol(symbol) ? "₹" : "$";
      const activeP = (selectedPatternIndex !== null && data.detected_patterns[selectedPatternIndex])
        ? data.detected_patterns[selectedPatternIndex]
        : data.detected_patterns[data.detected_patterns.length - 1];

      if (activeP && activeP.entry && activeP.target && activeP.stop_loss) {
        const isBuy = activeP.recommendation === 'BUY';

        // Entry line (yellow/gold dashed)
        candleSeries.createPriceLine({
          price: activeP.entry,
          color: '#FBBF24',
          lineWidth: 2,
          lineStyle: 2, // Dashed
          axisLabelVisible: true,
          title: `▶ ${isBuy ? 'BUY HERE' : 'SELL HERE'} (${timeframe}): ${currencySym}${activeP.entry}`,
        });

        // Target line (green for BUY, red for SELL)
        candleSeries.createPriceLine({
          price: activeP.target,
          color: isBuy ? '#10B981' : '#EF4444',
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `🎯 ${activeP.target_horizon || 'EXIT TARGET'}: ${currencySym}${activeP.target} (${isBuy ? '+' : '-'}${activeP.target_points} pts)`,
        });

        // Stop Loss line (red for BUY, green for SELL)
        candleSeries.createPriceLine({
          price: activeP.stop_loss,
          color: isBuy ? '#EF4444' : '#10B981',
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `⛔ STOP LOSS: ${currencySym}${activeP.stop_loss} (${isBuy ? '-' : '+'}${activeP.sl_points} pts)`,
        });
      }
    }

    // 2. Setup Secondary RSI Chart (if active)
    let rsiChart;
    if (showRSI && rsiContainerRef.current) {
      rsiChart = createChart(rsiContainerRef.current, {
        width: priceChartWidth,
        height: 120,
        layout: {
          background: { color: "#151B2E" },
          textColor: "#9CA3AF",
        },
        grid: {
          vertLines: { color: "rgba(31, 41, 55, 0.3)" },
          horzLines: { color: "rgba(31, 41, 55, 0.3)" },
        },
        timeScale: {
          visible: false, // hide time scale, synchronize it with main chart
        },
        rightPriceScale: {
          borderColor: "#1F2937",
        }
      });
      rsiChartRef.current = rsiChart;

      // Add RSI line
      const rsiSeries = rsiChart.addSeries(LineSeries, {
        color: "#818CF8",
        lineWidth: 1.5,
        title: "RSI (14)"
      });
      rsiSeriesRef.current = rsiSeries;

      const rsiData = data.candles
        .filter(c => c.rsi !== null)
        .map(c => ({ time: c.time, value: c.rsi }));
      rsiSeries.setData(rsiData);
    }

    // 3. Setup Secondary MACD Chart (if active)
    let macdChart;
    if (showMACD && macdContainerRef.current) {
      macdChart = createChart(macdContainerRef.current, {
        width: priceChartWidth,
        height: 120,
        layout: {
          background: { color: "#151B2E" },
          textColor: "#9CA3AF",
        },
        grid: {
          vertLines: { color: "rgba(31, 41, 55, 0.3)" },
          horzLines: { color: "rgba(31, 41, 55, 0.3)" },
        },
        timeScale: {
          visible: false, // hide time scale, synchronize it with main chart
        },
        rightPriceScale: {
          borderColor: "#1F2937",
        }
      });
      macdChartRef.current = macdChart;

      // Add MACD line
      const macdLineSeries = macdChart.addSeries(LineSeries, {
        color: "#2962FF",
        lineWidth: 1.5,
        title: "MACD"
      });
      macdLineSeriesRef.current = macdLineSeries;
      const macdLineData = data.candles
        .filter(c => c.macd !== null)
        .map(c => ({ time: c.time, value: c.macd }));
      macdLineSeries.setData(macdLineData);

      // Add Signal line
      const macdSignalSeries = macdChart.addSeries(LineSeries, {
        color: "#FF6D00",
        lineWidth: 1.5,
        title: "Signal"
      });
      macdSignalSeriesRef.current = macdSignalSeries;
      const macdSignalData = data.candles
        .filter(c => c.macd_signal !== null)
        .map(c => ({ time: c.time, value: c.macd_signal }));
      macdSignalSeries.setData(macdSignalData);

      // Add Histogram
      const macdHistSeries = macdChart.addSeries(HistogramSeries, {
        priceFormat: { type: "price" },
      });
      macdHistSeriesRef.current = macdHistSeries;
      const macdHistData = data.candles
        .filter(c => c.macd_hist !== null)
        .map(c => ({
          time: c.time,
          value: c.macd_hist,
          color: c.macd_hist >= 0 ? "rgba(16, 185, 129, 0.5)" : "rgba(239, 68, 68, 0.5)"
        }));
      macdHistSeries.setData(macdHistData);
    }

    // Synchronize visible scales between active charts
    const activeTimeScales = [];
    if (chart) activeTimeScales.push(chart.timeScale());
    if (showRSI && rsiChart) activeTimeScales.push(rsiChart.timeScale());
    if (showMACD && macdChart) activeTimeScales.push(macdChart.timeScale());

    let isSyncing = false;
    activeTimeScales.forEach((ts, idx) => {
      ts.subscribeVisibleTimeRangeChange(() => {
        if (isSyncing) return;
        isSyncing = true;
        const range = ts.getVisibleRange();
        if (range) {
          activeTimeScales.forEach((otherTs, otherIdx) => {
            if (idx !== otherIdx) {
              otherTs.setVisibleRange(range);
            }
          });
        }
        isSyncing = false;
      });
    });

    // Handles resizing
    const handleResize = () => {
      if (chartContainerRef.current) {
        const w = chartContainerRef.current.clientWidth;
        chart.resize(w, priceChartHeight);
        if (rsiChart) {
          rsiChart.resize(w, 120);
        }
        if (macdChart) {
          macdChart.resize(w, 120);
        }
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      if (rsiChart) {
        rsiChart.remove();
      }
      if (macdChart) {
        macdChart.remove();
      }
      chartRef.current = null;
      rsiChartRef.current = null;
      macdChartRef.current = null;
    };
  }, [data, showSMA20, showEMA50, showEMA200, showBB, showRSI, showMACD, selectedPatternIndex]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput) {
      setSymbol(searchInput.trim().toUpperCase());
    }
  };

  const currencySymbol = isIndianSymbol(symbol) ? "₹" : "$";
  const latestPrice = data?.candles?.[data.candles.length - 1]?.close || 100;
  const tfConfig = TIMEFRAME_TARGET_HORIZONS[timeframe] || TIMEFRAME_TARGET_HORIZONS["1D"];
  const isAiBuy = analysis?.signal === "BUY";
  const isAiSell = analysis?.signal === "SELL";
  const aiMovePct = isAiBuy ? tfConfig.minPct * 1.5 : isAiSell ? -tfConfig.minPct * 1.5 : tfConfig.minPct * 0.8;
  const aiTarget = Number((latestPrice * (1 + aiMovePct)).toFixed(2));
  const aiStopLoss = Number((latestPrice * (1 + (isAiBuy ? -tfConfig.minSlPct * 1.2 : isAiSell ? tfConfig.minSlPct * 1.2 : -tfConfig.minSlPct))).toFixed(2));
  const aiTargetPoints = Number(Math.abs(aiTarget - latestPrice).toFixed(2));

  // Current active pattern
  const activePattern = (selectedPatternIndex !== null && data?.detected_patterns?.[selectedPatternIndex])
    ? data.detected_patterns[selectedPatternIndex]
    : data?.detected_patterns?.[data.detected_patterns.length - 1];

  // Accuracy & Win-Rate Statistics
  const patternsList = data?.detected_patterns || [];
  const targetsHitCount = data?.accuracy_stats?.targets_hit !== undefined
    ? data.accuracy_stats.targets_hit
    : patternsList.filter(p => p.outcome === "TARGET_HIT").length;
  const slHitCount = data?.accuracy_stats?.sl_hit !== undefined
    ? data.accuracy_stats.sl_hit
    : patternsList.filter(p => p.outcome === "SL_HIT").length;
  const activeCount = data?.accuracy_stats?.active_trades !== undefined
    ? data.accuracy_stats.active_trades
    : patternsList.filter(p => p.outcome === "ACTIVE" && (p.recommendation === "BUY" || p.recommendation === "SELL")).length;
  const totalDecided = targetsHitCount + slHitCount;
  const winRate = data?.accuracy_stats?.win_rate !== undefined
    ? Number(data.accuracy_stats.win_rate).toFixed(1)
    : (totalDecided > 0 ? ((targetsHitCount / totalDecided) * 100).toFixed(1) : "0.0");
  const netPnlPoints = data?.accuracy_stats?.net_pnl_points !== undefined
    ? Number(data.accuracy_stats.net_pnl_points).toFixed(2)
    : patternsList.reduce((acc, p) => acc + (p.pnl_points || 0), 0).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Chart Toolbar Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-outfit">Trading View Engine</span>
          <h2 className="text-2xl font-bold text-white font-outfit mt-0.5">Interactive Analytics</h2>
        </div>

        {/* Search & Timeframes bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Symbol Search */}
          <div ref={searchContainerRef} className="relative z-50">
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search symbol..."
                  value={searchInput}
                  onFocus={() => setShowSuggestions(true)}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setShowSuggestions(true);
                  }}
                  className="bg-darkCard border border-gray-850 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-600 transition-colors uppercase w-36 md:w-44"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute left-0 mt-2 bg-gray-950 border border-gray-800 rounded-xl overflow-hidden shadow-2xl max-h-60 overflow-y-auto w-64 md:w-72 z-50">
                    {suggestions.map((item) => (
                      <button
                        key={item.symbol}
                        type="button"
                        onClick={() => {
                          setSearchInput(item.symbol);
                          setSymbol(item.symbol);
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-indigo-600/25 flex justify-between items-center transition-colors border-b border-gray-900/50 last:border-0"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-white text-xs block">{item.symbol}</span>
                          <span className="text-[10px] text-gray-400 block truncate">{item.name}</span>
                        </div>
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-gray-900 border border-gray-850 text-indigo-400 font-bold uppercase ml-2 shrink-0">
                          {item.market}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button 
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-white font-semibold rounded-xl text-sm transition-colors glow-indigo"
              >
                Scan
              </button>
            </form>
          </div>

          {/* Timeframes Selector with Scalp/Intraday/Swing Target Hints */}
          <div className="bg-darkCard p-1 rounded-xl border border-gray-850 flex">
            {[
              { id: "1m", label: "1m", sub: "5m tgt" },
              { id: "5m", label: "5m", sub: "15m tgt" },
              { id: "15m", label: "15m", sub: "30m tgt" },
              { id: "60m", label: "60m", sub: "1h tgt" },
              { id: "1D", label: "1D", sub: "Swing" },
              { id: "1W", label: "1W", sub: "Pos." }
            ].map(({ id, label, sub }) => (
              <button
                key={id}
                onClick={() => setTimeframe(id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center ${
                  timeframe === id 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                }`}
                title={`${label} Candle → ${sub}`}
              >
                <span>{label}</span>
                <span className={`text-[8px] font-normal leading-none mt-0.5 ${timeframe === id ? "text-indigo-200" : "text-gray-500"}`}>{sub}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sub-tab selection: Technical vs Fundamental */}
      <div className="flex gap-2 border-b border-gray-900 pb-2">
        <button
          onClick={() => setActiveChartTab("technical")}
          className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-colors ${
            activeChartTab === "technical" 
              ? "bg-indigo-650/20 text-indigo-400 border border-indigo-500/20" 
              : "bg-darkCard hover:bg-gray-800 text-gray-400"
          }`}
        >
          Technical Analysis
        </button>
        <button
          onClick={() => setActiveChartTab("fundamental")}
          className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-colors ${
            activeChartTab === "fundamental" 
              ? "bg-indigo-650/20 text-indigo-400 border border-indigo-500/20" 
              : "bg-darkCard hover:bg-gray-800 text-gray-400"
          }`}
        >
          Company Fundamentals
        </button>
      </div>

      {activeChartTab === "technical" ? (
        /* Main Chart Card */
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          {/* Toggle Overlays row */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-950/40 p-3 rounded-xl border border-gray-900/50">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowSMA20(!showSMA20)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  showSMA20 ? "bg-amber-600/10 text-amber-400 border-amber-500/20" : "bg-darkBg text-gray-500 border-gray-850 hover:text-gray-400"
                }`}
              >
                {showSMA20 ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>SMA 20</span>
              </button>
              <button
                onClick={() => setShowEMA50(!showEMA50)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  showEMA50 ? "bg-blue-600/10 text-blue-400 border-blue-500/20" : "bg-darkBg text-gray-500 border-gray-850 hover:text-gray-400"
                }`}
              >
                {showEMA50 ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>EMA 50</span>
              </button>
              <button
                onClick={() => setShowEMA200(!showEMA200)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  showEMA200 ? "bg-purple-600/10 text-purple-400 border-purple-500/20" : "bg-darkBg text-gray-500 border-gray-850 hover:text-gray-400"
                }`}
              >
                {showEMA200 ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>EMA 200</span>
              </button>
              <button
                onClick={() => setShowBB(!showBB)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  showBB ? "bg-emerald-600/10 text-emerald-400 border-emerald-500/20" : "bg-darkBg text-gray-500 border-gray-850 hover:text-gray-400"
                }`}
              >
                {showBB ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>Bollinger Bands</span>
              </button>
              <button
                onClick={() => setShowRSI(!showRSI)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  showRSI ? "bg-indigo-600/10 text-indigo-400 border-indigo-500/20" : "bg-darkBg text-gray-500 border-gray-850 hover:text-gray-400"
                }`}
              >
                {showRSI ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>RSI (14)</span>
              </button>
              <button
                onClick={() => setShowMACD(!showMACD)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  showMACD ? "bg-indigo-600/10 text-indigo-400 border-indigo-500/20" : "bg-darkBg text-gray-500 border-gray-850 hover:text-gray-400"
                }`}
              >
                {showMACD ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>MACD</span>
              </button>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
              <Settings className="w-3.5 h-3.5" />
              <span>Active Ticker: {symbol}</span>
            </div>
          </div>

          {/* Active Pattern Setups Banner */}
          {data?.detected_patterns && data.detected_patterns.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-950/40 via-darkCard to-indigo-950/40 border border-indigo-500/20 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Active Pattern Signals on Chart</span>
                </div>
                <span className="text-[9px] text-gray-400">Click any pattern to focus its price lines</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.detected_patterns.slice(-5).map((p, idx) => {
                  const globalIdx = data.detected_patterns.length - 5 + idx;
                  const isSelected = selectedPatternIndex === globalIdx || (selectedPatternIndex === null && idx === Math.min(4, data.detected_patterns.length - 1));
                  const isBuy = p.recommendation === 'BUY';
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedPatternIndex(globalIdx >= 0 ? globalIdx : idx)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        isSelected ? "ring-2 ring-indigo-500 shadow-lg scale-105 " : ""
                      }${
                        isBuy 
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20' 
                          : p.recommendation === 'SELL'
                          ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${
                        isBuy ? 'bg-emerald-400' : p.recommendation === 'SELL' ? 'bg-rose-400' : 'bg-amber-400'
                      }`}></span>
                      <span>{p.pattern}</span>
                      <span className="text-gray-500 font-normal">|</span>
                      <span className="uppercase">{p.recommendation}</span>
                      <span className="text-gray-500 font-normal">→</span>
                      <span className="font-mono">🎯 {currencySymbol}{p.target?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({isBuy ? '+' : '-'}{p.target_points} pts)</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Loading Spinner */}
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[520px] bg-darkCard/50 border border-gray-850 rounded-xl">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
              <p className="text-sm text-gray-400 mt-4 font-semibold">Running pattern scans & parsing indicators...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Column: Charts */}
            <div className="lg:col-span-3 space-y-4">
              {/* Main Price & Indicators Canvas with Live Pattern Callout HUD */}
              <div className="relative w-full overflow-hidden rounded-xl border border-gray-850/50">
                <div 
                  ref={chartContainerRef} 
                  className="w-full" 
                  style={{ height: "400px" }}
                />

                {/* Floating Live Pattern HUD Overlay on the chart canvas */}
                {activePattern && (
                  <div className="absolute top-3 left-3 z-10 bg-gray-950/90 backdrop-blur-md border border-indigo-500/30 rounded-xl p-3 shadow-2xl max-w-sm pointer-events-auto transition-all">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-sm" style={{
                        color: activePattern.color || (activePattern.recommendation === "BUY" ? "#10B981" : "#EF4444"),
                        backgroundColor: `${activePattern.color || (activePattern.recommendation === "BUY" ? "#10B981" : "#EF4444")}15`,
                        borderColor: `${activePattern.color || (activePattern.recommendation === "BUY" ? "#10B981" : "#EF4444")}35`
                      }}>
                        ⚡ {activePattern.pattern} ({activePattern.recommendation})
                      </span>
                      <span className="text-[9px] font-mono text-gray-400">{activePattern.time}</span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 text-[9px] text-gray-400 font-medium">
                      <span className="px-1.5 py-0.5 rounded bg-gray-900 border border-gray-800 text-indigo-300 font-bold uppercase">
                        {timeframe} Candle
                      </span>
                      <span>➔</span>
                      <span className="text-amber-400 font-bold">
                        {activePattern.target_horizon}
                      </span>
                    </div>

                    <div className="mt-2 text-xs font-bold text-white flex items-center justify-between">
                      <span>
                        {activePattern.recommendation === "BUY" ? (
                          <span className="text-emerald-400 font-extrabold">▶ BUY HERE:</span>
                        ) : activePattern.recommendation === "SELL" ? (
                          <span className="text-rose-400 font-extrabold">▶ SELL HERE:</span>
                        ) : (
                          <span className="text-amber-400 font-extrabold">▶ WATCH / ENTRY:</span>
                        )}
                        {" "}{currencySymbol}{activePattern.entry?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-gray-800 text-[10px]">
                      <div>
                        <span className="text-gray-400 text-[9px] font-bold uppercase block">
                          EXIT TARGET ({activePattern.horizon_short || 'Target'})
                        </span>
                        <span className={`font-mono font-bold block ${activePattern.recommendation === 'BUY' ? 'text-emerald-400' : activePattern.recommendation === 'SELL' ? 'text-rose-400' : 'text-amber-400'}`}>
                          {currencySymbol}{activePattern.target?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[9px] font-mono text-gray-500 block">
                          {activePattern.recommendation === 'BUY' ? `+${activePattern.target_points} pts (+${activePattern.target_pct}%)` : activePattern.recommendation === 'SELL' ? `-${activePattern.target_points} pts (-${activePattern.target_pct}%)` : `±${activePattern.target_points} pts`}
                        </span>
                      </div>
                      <div className="border-l border-gray-850 pl-2">
                        <span className="text-gray-400 text-[9px] font-bold uppercase block">STOP LOSS</span>
                        <span className="font-mono font-bold text-rose-400 block">
                          {currencySymbol}{activePattern.stop_loss?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[9px] font-mono text-gray-500 block">
                          {activePattern.recommendation === 'BUY' ? `-${activePattern.sl_points} pts` : `+${activePattern.sl_points} pts`}
                        </span>
                      </div>
                      <div className="border-l border-gray-850 pl-2">
                        <span className="text-gray-400 text-[9px] font-bold uppercase block">RISK:REWARD</span>
                        <span className="font-mono font-bold text-indigo-400 text-xs block">
                          1:{activePattern.risk_reward}
                        </span>
                        <span className="text-[8px] font-bold text-gray-500 uppercase block">
                          {activePattern.confidence}
                        </span>
                      </div>
                    </div>

                    {/* Outcome Status Badge */}
                    <div className="mt-2 pt-2 border-t border-gray-850 flex items-center justify-between">
                      <span className="text-[9px] text-gray-500 font-bold uppercase">Prediction Status:</span>
                      {activePattern.outcome === "TARGET_HIT" ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold flex items-center gap-1 shadow-sm">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          TARGET HIT (+{Math.abs(activePattern.pnl_points || activePattern.target_points)} pts)
                        </span>
                      ) : activePattern.outcome === "SL_HIT" ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-extrabold flex items-center gap-1 shadow-sm">
                          <AlertOctagon className="w-3 h-3 text-rose-400" />
                          STOP LOSS HIT (-{Math.abs(activePattern.pnl_points || activePattern.sl_points)} pts)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-[10px] font-extrabold flex items-center gap-1 shadow-sm">
                          <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
                          IN PROGRESS (ACTIVE)
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Synchronized RSI Panel */}
              {showRSI && (
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold ml-1">Relative Strength Index (RSI)</span>
                  <div 
                    ref={rsiContainerRef} 
                    className="w-full relative overflow-hidden rounded-xl border border-gray-850/50" 
                    style={{ height: "120px" }}
                  />
                </div>
              )}
              {/* Synchronized MACD Panel */}
              {showMACD && (
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold ml-1">MACD (12, 26, 9)</span>
                  <div 
                    ref={macdContainerRef} 
                    className="w-full relative overflow-hidden rounded-xl border border-gray-850/50" 
                    style={{ height: "120px" }}
                  />
                </div>
              )}
            </div>

            {/* Right Column: AI Signal & Pattern Detection Feed */}
            <div className="lg:col-span-1 bg-gray-950/40 p-4 border border-gray-900 rounded-2xl flex flex-col h-full max-h-[580px] overflow-hidden">
              {/* AI Recommendation Summary */}
              {analysisLoading ? (
                <div className="flex flex-col items-center justify-center py-6 border-b border-gray-850 mb-3 shrink-0">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                  <p className="text-[10px] text-gray-500 mt-2">Computing AI signals...</p>
                </div>
              ) : analysis ? (
                <div className="bg-darkCard/50 border border-gray-850 p-4 rounded-xl space-y-3 mb-4 shrink-0">
                  <div>
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">AI Rating Signal</span>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-lg font-extrabold tracking-wide uppercase px-3 py-0.5 rounded-lg border shadow-sm ${
                        analysis.signal === "BUY" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                        analysis.signal === "SELL" ? "bg-rose-500/10 text-rose-400 border-rose-500/30" :
                        "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      }`}>
                        {analysis.signal}
                      </span>
                      <div>
                        <span className="text-white font-bold font-mono text-xs block">{analysis.confidence}%</span>
                        <span className="text-[9px] text-gray-400 uppercase tracking-wider block">Model Confidence</span>
                      </div>
                    </div>
                  </div>

                  {/* Confidence Bar */}
                  <div className="w-full bg-gray-900 rounded-full h-1 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        analysis.signal === "BUY" ? "bg-emerald-500" :
                        analysis.signal === "SELL" ? "bg-rose-500" :
                        "bg-amber-500"
                      }`}
                      style={{ width: `${analysis.confidence}%` }}
                    />
                  </div>

                  {/* Projected AI Targets & Risk Level */}
                  <div className="pt-2 border-t border-gray-900/60 grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-gray-900/60 p-2 rounded-lg border border-gray-850">
                      <span className="text-gray-400 block text-[9px] font-bold uppercase">Expected Target</span>
                      <span className={`font-mono font-bold text-xs ${isAiBuy ? 'text-emerald-400' : isAiSell ? 'text-rose-400' : 'text-amber-400'}`}>
                        {currencySymbol}{aiTarget?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-gray-500 block">
                        {isAiBuy ? `+${aiTargetPoints} pts (+${(Math.abs(aiMovePct) * 100).toFixed(1)}%)` : isAiSell ? `-${aiTargetPoints} pts (-${(Math.abs(aiMovePct) * 100).toFixed(1)}%)` : 'Consolidation Target'}
                      </span>
                    </div>
                    <div className="bg-gray-900/60 p-2 rounded-lg border border-gray-850">
                      <span className="text-gray-400 block text-[9px] font-bold uppercase">Stop Loss</span>
                      <span className="font-mono font-bold text-xs text-rose-400">
                        {currencySymbol}{aiStopLoss?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-gray-500 block">
                        Risk Invalidation
                      </span>
                    </div>
                  </div>

                  {/* Reasons list (scrollable if too long) */}
                  <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Key Analysis Insights</span>
                    {analysis.reasons?.map((reason, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-[9px] text-gray-300 leading-tight">
                        <span className="text-indigo-400">•</span>
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>

                  {/* ML engine badge */}
                  <div className="flex items-center justify-between border-t border-gray-900/60 pt-2 mt-1.5 text-[9px]">
                    <span className="text-gray-500 uppercase font-bold tracking-wider">Predictive Mode</span>
                    <span className={`px-2 py-0.5 rounded-full border ${
                      analysis.ml_model_active ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/25" : "bg-gray-800 text-gray-400 border-gray-800"
                    }`}>
                      {analysis.ml_model_active ? "Machine Learning Active" : "Heuristic Rules"}
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Prediction Accuracy & Historical Scorecard */}
              <div className="bg-gradient-to-br from-gray-900/90 to-darkCard border border-indigo-500/30 rounded-xl p-3 shadow-lg shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-outfit">
                      Prediction Accuracy
                    </span>
                  </div>
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${
                    parseFloat(winRate) >= 50
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  }`}>
                    {winRate}% Win Rate
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-gray-800/80">
                  <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-lg p-1.5">
                    <div className="flex items-center justify-center gap-1 text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      <span className="font-extrabold text-sm font-mono">{targetsHitCount}</span>
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter block mt-0.5">
                      Target Hit
                    </span>
                  </div>

                  <div className="bg-rose-950/20 border border-rose-800/30 rounded-lg p-1.5">
                    <div className="flex items-center justify-center gap-1 text-rose-400">
                      <AlertOctagon className="w-3 h-3" />
                      <span className="font-extrabold text-sm font-mono">{slHitCount}</span>
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter block mt-0.5">
                      SL Hit
                    </span>
                  </div>

                  <div className="bg-cyan-950/20 border border-cyan-800/30 rounded-lg p-1.5">
                    <div className="flex items-center justify-center gap-1 text-cyan-400">
                      <Activity className="w-3 h-3" />
                      <span className="font-extrabold text-sm font-mono">{activeCount}</span>
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter block mt-0.5">
                      Active
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-gray-400 pt-2 mt-2 border-t border-gray-850/60 font-mono">
                  <span>Resolved: <strong className="text-white">{totalDecided}</strong></span>
                  <span>Net P&L: <strong className={parseFloat(netPnlPoints) >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    {parseFloat(netPnlPoints) >= 0 ? `+${netPnlPoints}` : netPnlPoints} pts
                  </strong></span>
                </div>
              </div>

              <h4 className="font-bold text-white text-sm border-b border-gray-850 pb-2 mb-3 shrink-0">
                Detected Patterns ({data?.detected_patterns?.length || 0})
              </h4>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
                {data?.detected_patterns && data.detected_patterns.length > 0 ? (
                  [...data.detected_patterns].reverse().map((p, idx) => {
                    const originalIdx = data.detected_patterns.length - 1 - idx;
                    const isSelected = selectedPatternIndex === originalIdx || (selectedPatternIndex === null && idx === 0);
                    const isBuy = p.recommendation === "BUY";
                    const isSell = p.recommendation === "SELL";

                    return (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedPatternIndex(originalIdx)}
                        className={`bg-darkCard p-3 border rounded-xl space-y-1 transition-all cursor-pointer ${
                          isSelected 
                            ? "border-indigo-500 ring-1 ring-indigo-500/50 shadow-lg bg-indigo-950/20" 
                            : "border-gray-850 hover:border-gray-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border" style={{
                            color: p.color || (isBuy ? "#10B981" : "#EF4444"),
                            backgroundColor: `${p.color || (isBuy ? "#10B981" : "#EF4444")}15`,
                            borderColor: `${p.color || (isBuy ? "#10B981" : "#EF4444")}25`
                          }}>
                            {p.pattern?.replace("_", " ")}
                          </span>
                          <span className="text-gray-500 font-mono text-[9px]">{p.time}</span>
                        </div>

                        {/* Outcome Badge */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[9px] text-gray-400 font-medium">Outcome:</span>
                          {p.outcome === "TARGET_HIT" ? (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Target Hit (+{Math.abs(p.pnl_points || p.target_points)} pts)
                            </span>
                          ) : p.outcome === "SL_HIT" ? (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                              <AlertOctagon className="w-2.5 h-2.5" />
                              SL Hit (-{Math.abs(p.pnl_points || p.sl_points)} pts)
                            </span>
                          ) : (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                              <Activity className="w-2.5 h-2.5" />
                              Active (In Progress)
                            </span>
                          )}
                        </div>

                        <div className="flex justify-between items-baseline pt-1">
                          <span className="text-gray-400">Trigger Price:</span>
                          <span className="text-white font-bold font-mono">{currencySymbol}{p.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>

                        {/* Action Signal */}
                        {p.recommendation && (
                          <div className="flex justify-between items-center pt-1.5 border-t border-gray-900/50 mt-1.5">
                            <span className="text-[10px] text-gray-500 font-medium">Action Signal:</span>
                            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                              isBuy ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                              isSell ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                              "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}>
                              {p.recommendation}
                            </span>
                          </div>
                        )}

                        {/* Entry / Target / Stop Loss Trading Levels */}
                        {p.entry && (
                          <div className="mt-2 space-y-1.5 pt-2 border-t border-gray-900/50">
                            {/* Entry */}
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-amber-400 font-bold uppercase flex items-center gap-1">
                                <span className="w-2 h-0.5 bg-amber-400 inline-block rounded"></span>
                                {isBuy ? "Buy Here (Entry)" : isSell ? "Sell Here (Entry)" : "Entry"}
                              </span>
                              <span className="text-white font-bold font-mono text-[11px]">
                                {currencySymbol}{p.entry?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>

                            {/* Target with Timeframe-Calibrated Horizon */}
                            <div className="flex justify-between items-start">
                              <div>
                                <span className={`text-[10px] font-bold uppercase flex items-center gap-1 ${
                                  isBuy ? 'text-emerald-400' : 'text-rose-400'
                                }`}>
                                  <span className={`w-2 h-0.5 inline-block rounded ${
                                    isBuy ? 'bg-emerald-400' : 'bg-rose-400'
                                  }`}></span>
                                  Exit Target
                                </span>
                                <span className="text-[8px] text-amber-400/90 font-medium block ml-3">
                                  {p.target_horizon || 'Target'}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-white font-bold font-mono text-[11px] block">
                                  {currencySymbol}{p.target?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className={`text-[9px] font-mono font-bold ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {isBuy ? `+${p.target_points} pts` : `-${p.target_points} pts`} ({isBuy ? `+${p.target_pct}%` : `-${p.target_pct}%`})
                                </span>
                              </div>
                            </div>

                            {/* Stop Loss */}
                            <div className="flex justify-between items-center">
                              <span className={`text-[10px] font-bold uppercase flex items-center gap-1 ${
                                isBuy ? 'text-rose-400' : 'text-emerald-400'
                              }`}>
                                <span className={`w-2 h-0.5 inline-block rounded ${
                                  isBuy ? 'bg-rose-400' : 'bg-emerald-400'
                                }`}></span>
                                Stop Loss
                              </span>
                              <div className="text-right">
                                <span className="text-white font-bold font-mono text-[11px] block">
                                  {currencySymbol}{p.stop_loss?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-[9px] font-mono text-gray-500">
                                  {isBuy ? `-${p.sl_points} pts` : `+${p.sl_points} pts`}
                                </span>
                              </div>
                            </div>

                            {/* Risk:Reward Ratio */}
                            <div className="flex justify-between items-center pt-1.5 border-t border-gray-900/30">
                              <span className="text-[9px] text-gray-500 font-bold uppercase">Risk:Reward</span>
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                                parseFloat(p.risk_reward) >= 2 ? 'bg-emerald-500/10 text-emerald-400' :
                                parseFloat(p.risk_reward) >= 1 ? 'bg-amber-500/10 text-amber-400' :
                                'bg-rose-500/10 text-rose-400'
                              }`}>
                                1:{p.risk_reward}
                              </span>
                            </div>

                            {/* Confidence Badge */}
                            {p.confidence && (
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] text-gray-500 font-bold uppercase">Confidence</span>
                                <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                                  p.confidence === 'HIGH' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  p.confidence === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                  'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                                }`}>
                                  {p.confidence}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10 text-gray-500 italic">
                    No patterns detected in the historical timeframe.
                  </div>
                )}
              </div>
            </div>
          </div>
          )}
        </div>
      ) : (
        <Fundamentals symbol={symbol} />
      )}
    </div>
  );
};

export default ChartContainer;
