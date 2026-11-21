import React, { useState, useEffect, useRef } from "react";
import { createChart, CandlestickSeries, LineSeries, HistogramSeries } from "lightweight-charts";
import api from "../services/api";
import { useLiveData } from "../context/LiveDataContext";
import { 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Cpu, 
  BarChart2, 
  Clock, 
  ShieldCheck, 
  RefreshCw, 
  Loader2, 
  Eye, 
  Flame, 
  Layers,
  ArrowUpRight
} from "lucide-react";

const COMMODITIES_CONFIG = [
  {
    id: "GOLD",
    name: "Gold",
    fullName: "MCX Gold (10g)",
    unit: "10 Grams",
    category: "Bullion",
    basePrice: 122500.0,
    lotSize: "1 kg (Regular) / 100g (Mini)",
    tickSize: "₹1.00",
    color: "#EAB308",
    description: "Benchmark bullion asset settled in INR based on international LBMA gold rates adjusted for customs duty and USD/INR."
  },
  {
    id: "SILVER",
    name: "Silver",
    fullName: "MCX Silver (1kg)",
    unit: "1 Kilogram",
    category: "Bullion",
    basePrice: 151800.0,
    lotSize: "30 kg (Regular) / 5 kg (Mini)",
    tickSize: "₹1.00",
    color: "#94A3B8",
    description: "Industrial & precious metal contract quoted in ₹/kg with high daily liquidity and intraday volatility."
  },
  {
    id: "CRUDEOIL",
    name: "Crude Oil",
    fullName: "MCX Crude Oil (1 bbl)",
    unit: "1 Barrel (bbl)",
    category: "Energy",
    basePrice: 7720.0,
    lotSize: "100 Barrels (Regular) / 10 Barrels (Mini)",
    tickSize: "₹1.00",
    color: "#F97316",
    description: "WTI Crude Oil futures settled in INR per barrel reflecting global energy benchmarks and refinery demand."
  },
  {
    id: "NATURALGAS",
    name: "Natural Gas",
    fullName: "MCX Natural Gas (mmBtu)",
    unit: "1 mmBtu",
    category: "Energy",
    basePrice: 303.0,
    lotSize: "1250 mmBtu",
    tickSize: "₹0.10",
    color: "#06B6D4",
    description: "Clean energy futures quoted per mmBtu in INR, sensitive to weather forecasts and pipeline inventory data."
  },
  {
    id: "COPPER",
    name: "Copper",
    fullName: "MCX Copper (1kg)",
    unit: "1 Kilogram",
    category: "Base Metals",
    basePrice: 1155.0,
    lotSize: "2500 kg (Regular) / 250 kg (Mini)",
    tickSize: "₹0.05",
    color: "#D97706",
    description: "Premier base metal gauge of global industrial expansion and electrical infrastructure growth."
  }
];

const Commodities = ({ onSelectStock }) => {
  const { prices, connected } = useLiveData();
  const [selectedCommodity, setSelectedCommodity] = useState("GOLD");
  const [timeframe, setTimeframe] = useState("1D");
  const [historyData, setHistoryData] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [screenerData, setScreenerData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [screenerLoading, setScreenerLoading] = useState(false);
  
  const chartContainerRef = useRef(null);
  const chartInstance = useRef(null);
  const seriesRefs = useRef({ candle: null, sma20: null, ema50: null, volume: null });

  const activeConfig = COMMODITIES_CONFIG.find(c => c.id === selectedCommodity) || COMMODITIES_CONFIG[0];

  // Fetch screener data across all commodities
  const fetchScreenerData = async () => {
    setScreenerLoading(true);
    try {
      const res = await api.get("/api/stocks/screener/scan?market=COMMODITY");
      setScreenerData(res.data || []);
    } catch (err) {
      console.error("Failed to fetch commodities screener:", err);
    } finally {
      setScreenerLoading(false);
    }
  };

  // Fetch history for selected commodity
  const fetchCommodityHistory = async () => {
    setChartLoading(true);
    try {
      const res = await api.get(`/api/stocks/${selectedCommodity}/history?timeframe=${timeframe}`);
      setHistoryData(res.data);
    } catch (err) {
      console.error("Failed to load commodity history:", err);
    } finally {
      setChartLoading(false);
    }
  };

  // Fetch AI analysis for selected commodity
  const fetchCommodityAnalysis = async () => {
    try {
      const res = await api.get(`/api/stocks/${selectedCommodity}/analysis?timeframe=${timeframe}`);
      setAnalysisData(res.data);
    } catch (err) {
      console.error("Failed to load commodity AI analysis:", err);
    }
  };

  useEffect(() => {
    fetchScreenerData();
  }, []);

  useEffect(() => {
    fetchCommodityHistory();
    fetchCommodityAnalysis();
  }, [selectedCommodity, timeframe]);

  // Initialize and update Lightweight Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clean up old instance if exists
    if (chartInstance.current) {
      chartInstance.current.remove();
      chartInstance.current = null;
    }

    const container = chartContainerRef.current;
    container.innerHTML = "";

    const chart = createChart(container, {
      width: container.clientWidth || 600,
      height: 420,
      layout: {
        background: { color: "transparent" },
        textColor: "#9CA3AF",
        fontFamily: "'Outfit', 'Inter', sans-serif"
      },
      grid: {
        vertLines: { color: "rgba(31, 41, 55, 0.4)" },
        horzLines: { color: "rgba(31, 41, 55, 0.4)" }
      },
      timeScale: {
        borderColor: "#374151",
        timeVisible: timeframe.includes("m") || timeframe.includes("h"),
        secondsVisible: false
      },
      rightPriceScale: {
        borderColor: "#374151"
      }
    });

    // Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10B981",
      downColor: "#EF4444",
      borderVisible: false,
      wickUpColor: "#10B981",
      wickDownColor: "#EF4444"
    });

    // SMA 20
    const sma20Series = chart.addSeries(LineSeries, {
      color: "#F59E0B",
      lineWidth: 1.5,
      title: "SMA 20"
    });

    // EMA 50
    const ema50Series = chart.addSeries(LineSeries, {
      color: "#8B5CF6",
      lineWidth: 1.5,
      title: "EMA 50"
    });

    // Volume Histogram
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#3B82F6",
      priceFormat: { type: "volume" },
      priceScaleId: "",
      scaleMargins: { top: 0.82, bottom: 0 }
    });

    chartInstance.current = chart;
    seriesRefs.current = { candle: candleSeries, sma20: sma20Series, ema50: ema50Series, volume: volumeSeries };

    // Resize Observer
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && chartInstance.current) {
          chartInstance.current.applyOptions({
            width: entry.contentRect.width,
            height: 420
          });
        }
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      if (chartInstance.current) {
        chartInstance.current.remove();
        chartInstance.current = null;
      }
    };
  }, []);

  // Update chart data
  useEffect(() => {
    if (!historyData?.candles || !seriesRefs.current.candle) return;

    const candles = historyData.candles;
    if (candles.length === 0) return;

    try {
      seriesRefs.current.candle.setData(candles.map(c => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close
      })));

      const smaData = candles
        .filter(c => c.sma_20 !== null && c.sma_20 !== undefined)
        .map(c => ({ time: c.time, value: c.sma_20 }));
      if (smaData.length > 0) seriesRefs.current.sma20.setData(smaData);

      const emaData = candles
        .filter(c => c.ema_50 !== null && c.ema_50 !== undefined)
        .map(c => ({ time: c.time, value: c.ema_50 }));
      if (emaData.length > 0) seriesRefs.current.ema50.setData(emaData);

      const volData = candles.map(c => ({
        time: c.time,
        value: c.volume || 0,
        color: c.close >= c.open ? "rgba(16, 185, 129, 0.35)" : "rgba(239, 68, 68, 0.35)"
      }));
      seriesRefs.current.volume.setData(volData);

      chartInstance.current?.timeScale().fitContent();
    } catch (e) {
      console.warn("Chart data update skipped:", e);
    }
  }, [historyData]);

  // Current selected commodity live price
  const liveQuote = prices[selectedCommodity] || prices[activeConfig.id];
  const livePrice = typeof liveQuote?.price === "number" ? liveQuote.price : activeConfig.basePrice;
  const isMarketOpen = liveQuote?.status === "Open" || liveQuote?.status === "Live";

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest font-outfit">MCX Commodity Exchange</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[10px] font-bold">
              <Coins className="w-3 h-3 text-amber-400" />
              <span>Quoted in ₹ (INR)</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>MCX Session: 09:00 - 23:30 IST</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white font-outfit mt-1">Commodities Hub</h2>
          <p className="text-xs text-gray-400 mt-0.5">Real-time Multi Commodity Exchange rates, bullion, energy, base metals, and technical setups.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchScreenerData();
              fetchCommodityHistory();
              fetchCommodityAnalysis();
            }}
            disabled={chartLoading || screenerLoading}
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 hover:border-gray-700 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            {chartLoading || screenerLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Refresh Rates</span>
          </button>

          <button
            onClick={() => onSelectStock && onSelectStock(selectedCommodity)}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-gray-950 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <BarChart2 className="w-4 h-4 text-gray-950" />
            <span>Open in Pro Studio</span>
          </button>
        </div>
      </div>

      {/* ── Top Live Commodity Cards Bar ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {COMMODITIES_CONFIG.map((item) => {
          const tick = prices[item.id] || prices[item.id.toUpperCase()];
          const price = typeof tick?.price === "number" ? tick.price : item.basePrice;
          const isSelected = selectedCommodity === item.id;

          return (
            <div
              key={item.id}
              onClick={() => setSelectedCommodity(item.id)}
              className={`glass-panel p-4 rounded-2xl cursor-pointer transition-all border ${
                isSelected 
                  ? "border-amber-500/60 bg-amber-500/5 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40" 
                  : "border-gray-850 hover:border-gray-700 bg-darkCard/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.category}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                  isSelected ? "bg-amber-500/20 text-amber-300" : "bg-gray-800 text-gray-400"
                }`}>
                  {item.unit}
                </span>
              </div>

              <div className="mt-2">
                <h4 className="text-sm font-bold text-white font-outfit">{item.name}</h4>
                <p className="text-lg font-black text-white font-mono mt-0.5">
                  ₹{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              <div className="mt-2 pt-2 border-t border-gray-900/60 flex items-center justify-between text-[10px] text-gray-400">
                <span>Lot: {item.lotSize.split("/")[0]}</span>
                <span className="text-amber-400 font-bold">{isSelected ? "Selected" : "Select"}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Main Interactive Section: Chart + AI Targets Sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Chart Container */}
        <div className="glass-panel p-5 rounded-2xl lg:col-span-2 flex flex-col justify-between">
          <div>
            {/* Chart Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-850 pb-3 mb-4">
              <div className="flex items-baseline gap-2">
                <h3 className="text-xl font-black text-white font-outfit">{activeConfig.fullName}</h3>
                <span className="text-xs font-bold text-amber-400 font-mono">
                  ₹{livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / {activeConfig.unit}
                </span>
              </div>

              {/* Timeframe Selector */}
              <div className="bg-darkCard p-1 rounded-xl border border-gray-850 flex gap-0.5">
                {["1m", "5m", "15m", "30m", "1h", "1D", "1W"].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      timeframe === tf 
                        ? "bg-amber-500 text-gray-950 font-black shadow-sm shadow-amber-500/30" 
                        : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* Canvas Mount */}
            <div className="relative min-h-[420px] w-full">
              {chartLoading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-950/60 backdrop-blur-xs rounded-xl">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                    <span className="text-xs text-gray-300 font-medium">Fetching MCX INR Candles...</span>
                  </div>
                </div>
              )}
              <div ref={chartContainerRef} className="w-full h-[420px]" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-850/60 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Up Candle</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Down Candle</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber-500" /> SMA 20</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-purple-500" /> EMA 50</span>
            </div>
            <span>Quoted in Indian Rupees (₹)</span>
          </div>
        </div>

        {/* AI Setup & Contract Sidebar */}
        <div className="space-y-6">
          {/* AI Signal Card */}
          <div className="glass-panel p-5 rounded-2xl border border-gray-850">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest font-outfit">AI Prediction Model</span>
              <div className="flex items-center gap-1 text-[10px] text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded-full border border-indigo-500/20">
                <Cpu className="w-3 h-3" />
                <span>Random Forest</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between bg-darkCard/80 p-4 rounded-xl border border-gray-800">
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Recommended Stance</span>
                <span className={`text-2xl font-black font-outfit ${
                  analysisData?.signal === "BUY" ? "text-emerald-400" : analysisData?.signal === "SELL" ? "text-rose-400" : "text-amber-400"
                }`}>
                  {analysisData?.signal || "CALCULATING"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Model Confidence</span>
                <span className="text-xl font-bold text-white font-outfit">
                  {analysisData?.confidence ? `${analysisData.confidence}%` : "80.0%"}
                </span>
              </div>
            </div>

            {/* Expected Targets in INR */}
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="bg-darkCard p-3 rounded-xl border border-gray-800">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Expected Target</span>
                <span className="text-sm font-black text-emerald-400 font-mono block mt-1">
                  ₹{(livePrice * 1.025).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-emerald-400/80 font-mono">+2.5% (+₹{(livePrice * 0.025).toFixed(2)})</span>
              </div>

              <div className="bg-darkCard p-3 rounded-xl border border-gray-800">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Risk Stop Loss</span>
                <span className="text-sm font-black text-rose-400 font-mono block mt-1">
                  ₹{(livePrice * 0.985).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-rose-400/80 font-mono">-1.5% (-₹{(livePrice * 0.015).toFixed(2)})</span>
              </div>
            </div>

            {/* Key Drivers */}
            <div className="mt-4 pt-3 border-t border-gray-850">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Technical Factors</span>
              <ul className="space-y-1.5 text-xs text-gray-300">
                {analysisData?.reasons?.slice(0, 3).map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-400 text-sm leading-none">•</span>
                    <span>{r}</span>
                  </li>
                )) || (
                  <li className="text-gray-500 italic">Evaluating technical indicator parameters...</li>
                )}
              </ul>
            </div>
          </div>

          {/* Contract Specifications Card */}
          <div className="glass-panel p-5 rounded-2xl border border-gray-850">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-outfit mb-3">
              MCX Contract Specifications
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-850/60">
                <span className="text-gray-400">Contract Unit</span>
                <span className="text-white font-semibold">{activeConfig.unit}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-850/60">
                <span className="text-gray-400">Trading Lot</span>
                <span className="text-white font-semibold">{activeConfig.lotSize}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-850/60">
                <span className="text-gray-400">Tick Size</span>
                <span className="text-white font-semibold">{activeConfig.tickSize}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-850/60">
                <span className="text-gray-400">Settlement Currency</span>
                <span className="text-amber-400 font-bold">Indian Rupee (₹ INR)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Exchange</span>
                <span className="text-white font-semibold">Multi Commodity Exchange (MCX)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Commodity Screener Table ── */}
      <div className="glass-panel p-6 rounded-2xl border border-gray-850">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-lg font-bold text-white font-outfit flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <span>MCX Commodities Screener & Heatmap</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Real-time technical indicator scans, RSI states, and pattern formations across all commodities.</p>
          </div>
          <span className="text-xs text-gray-400 font-medium">5 Active MCX Contracts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Commodity</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Live Price (₹ INR)</th>
                <th className="py-3 px-4">24h Change</th>
                <th className="py-3 px-4">RSI (14)</th>
                <th className="py-3 px-4">Detected Patterns</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-850/60 font-medium">
              {COMMODITIES_CONFIG.map((item) => {
                const tick = prices[item.id];
                const sc = screenerData.find(s => s.symbol === item.id);
                const price = typeof tick?.price === "number" ? tick.price : (sc?.price || item.basePrice);
                const changePct = sc?.change_pct || 0;
                const rsi = sc?.rsi || 50.0;
                const patterns = sc?.patterns_detected || [];

                return (
                  <tr key={item.id} className="hover:bg-gray-850/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <div>
                          <span className="font-bold text-white block">{item.name}</span>
                          <span className="text-[10px] text-gray-400">{item.id} • {item.unit}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-400">{item.category}</td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      ₹{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 font-bold font-mono px-2 py-0.5 rounded ${
                        changePct >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                      }`}>
                        {changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        rsi < 35 ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20" :
                        rsi > 65 ? "bg-rose-950/40 text-rose-400 border border-rose-500/20" :
                        "bg-gray-800 text-gray-300"
                      }`}>
                        RSI {rsi.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {patterns.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {patterns.slice(0, 2).map(p => (
                            <span key={p} className="bg-amber-950/40 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                              {p.replace("_", " ")}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-[10px]">Consolidating</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedCommodity(item.id)}
                          className="px-2.5 py-1 rounded-lg bg-gray-900 hover:bg-gray-800 text-amber-400 text-xs font-bold transition-all border border-gray-800 cursor-pointer"
                        >
                          Quick View
                        </button>
                        <button
                          onClick={() => onSelectStock && onSelectStock(item.id)}
                          className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-gray-950 transition-all cursor-pointer"
                          title="Open in Pro Charts"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Commodities;
