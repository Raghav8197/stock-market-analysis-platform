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
  Loader2
} from "lucide-react";

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
  const fetchChartData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/stocks/${symbol}/history?timeframe=${timeframe}`);
      setData(response.data);
    } catch (error) {
      console.error("Failed to load historical data:", error);
      alert("Symbol not found or data retrieval failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChartData();
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
        timeVisible: timeframe === "1m" || timeframe === "5m",
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
  }, [data, showSMA20, showEMA50, showEMA200, showBB, showRSI, showMACD]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput) {
      setSymbol(searchInput.trim().toUpperCase());
    }
  };

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

          {/* Timeframes Selector */}
          <div className="bg-darkCard p-1 rounded-xl border border-gray-850 flex">
            {["1m", "5m", "1D", "1W"].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  timeframe === tf 
                    ? "bg-indigo-600 text-white" 
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {tf}
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
              {/* Main Price & Indicators Canvas */}
              <div 
                ref={chartContainerRef} 
                className="w-full relative overflow-hidden rounded-xl border border-gray-850/50" 
                style={{ height: "400px" }}
              />
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

            {/* Right Column: Pattern Detection Feed */}
            <div className="lg:col-span-1 bg-gray-950/40 p-4 border border-gray-900 rounded-2xl flex flex-col h-full max-h-[580px] overflow-hidden">
              <h4 className="font-bold text-white text-sm border-b border-gray-850 pb-2 mb-3">
                Detected Patterns ({data?.detected_patterns?.length || 0})
              </h4>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
                {data?.detected_patterns && data.detected_patterns.length > 0 ? (
                  [...data.detected_patterns].reverse().map((p, idx) => (
                    <div key={idx} className="bg-darkCard p-3 border border-gray-850 rounded-xl space-y-1 hover:border-indigo-650 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border" style={{
                          color: p.color,
                          backgroundColor: `${p.color}15`,
                          borderColor: `${p.color}25`
                        }}>
                          {p.pattern.replace("_", " ")}
                        </span>
                        <span className="text-gray-500 font-mono text-[9px]">{p.time}</span>
                      </div>
                      <div className="flex justify-between items-baseline pt-1">
                        <span className="text-gray-400">Trigger Price:</span>
                        <span className="text-white font-bold font-mono">{isIndianSymbol(symbol) ? "₹" : "$"}{p.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      {p.recommendation && (
                        <div className="flex justify-between items-center pt-1.5 border-t border-gray-900/50 mt-1.5">
                          <span className="text-[10px] text-gray-500 font-medium">Action Signal:</span>
                          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                            p.recommendation === "BUY" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                            p.recommendation === "SELL" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                            "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}>
                            {p.recommendation}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
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
