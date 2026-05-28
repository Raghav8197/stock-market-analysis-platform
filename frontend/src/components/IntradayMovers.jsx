import React, { useState, useEffect } from "react";
import api from "../services/api";
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Flame, 
  Loader2, 
  Eye, 
  Zap, 
  Activity, 
  ArrowUpRight 
} from "lucide-react";

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

const IntradayMovers = ({ onSelectStock }) => {
  const [market, setMarket] = useState("ALL");
  const [topGainers, setTopGainers] = useState([]);
  const [volumeBreakouts, setVolumeBreakouts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchMovers = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/stocks/screener/top-intraday?market=${market}`);
      setTopGainers(response.data.top_gainers || []);
      setVolumeBreakouts(response.data.volume_breakouts || []);
    } catch (error) {
      console.error("Failed to fetch intraday movers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovers();
  }, [market]);

  const renderStockCard = (stock, type) => {
    const isIndian = isIndianSymbol(stock.symbol);
    const currency = isIndian ? "₹" : "$";
    const formattedPrice = stock.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    return (
      <div 
        key={stock.symbol}
        onClick={() => onSelectStock(stock.symbol)}
        className="glass-panel glass-panel-hover p-5 rounded-2xl flex flex-col justify-between cursor-pointer border border-gray-800/60 hover:border-indigo-500/40 transition-all duration-200"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-gray-550 uppercase tracking-widest">
                {isIndian ? "NSE India" : "US Market"}
              </span>
              {stock.patterns_detected.slice(0, 1).map(pat => (
                <span key={pat} className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-indigo-950/40 text-indigo-400 border border-indigo-500/10 tracking-wider">
                  {pat.replace("_", " ")}
                </span>
              ))}
            </div>
            <h4 className="font-bold text-white text-base font-outfit mt-1 tracking-wide truncate max-w-[160px] md:max-w-[200px]" title={stock.name}>
              {stock.name}
            </h4>
            <span className="text-xs text-gray-500 font-semibold tracking-wider">{stock.symbol}</span>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {type === "gainers" ? (
              <span className={`inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-1 rounded-xl font-outfit ${
                stock.change_pct >= 0 
                  ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/25" 
                  : "bg-rose-950/40 text-rose-400 border border-rose-500/25"
              }`}>
                {stock.change_pct >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {stock.change_pct >= 0 ? "+" : ""}{stock.change_pct.toFixed(2)}%
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-1 rounded-xl font-outfit bg-indigo-950/40 text-indigo-400 border border-indigo-500/25">
                <Zap className="w-3.5 h-3.5 animate-pulse" />
                {stock.volume_surge.toFixed(1)}x Vol
              </span>
            )}
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-gray-900/60 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-medium">Last 15m Price</span>
            <p className="text-lg font-bold text-white font-outfit tracking-tight leading-none mt-0.5">
              {currency}{formattedPrice}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
              stock.rsi < 35 ? "bg-emerald-950/30 text-emerald-400 border-emerald-500/10" :
              stock.rsi > 65 ? "bg-rose-950/30 text-rose-400 border-rose-500/10" :
              "bg-gray-900 text-gray-400 border-gray-800"
            }`}>
              RSI {stock.rsi.toFixed(0)}
            </span>
            <button className="p-2 bg-gray-950/80 hover:bg-indigo-600 hover:text-white rounded-xl text-gray-400 border border-gray-850 hover:border-indigo-500 transition-all shrink-0">
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-4">
        <div>
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-outfit">Real-Time Movers</span>
          <h2 className="text-xl md:text-2xl font-bold text-white font-outfit mt-0.5 flex items-center gap-2">
            <Flame className="w-6 h-6 text-rose-500 fill-rose-500/10 animate-bounce" />
            <span>Intraday Movers (15-Min Heat)</span>
          </h2>
        </div>
        <button
          onClick={fetchMovers}
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 px-4 py-2.5 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 glow-indigo w-full sm:w-auto justify-center"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span>Refresh Scan</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-900 pb-2 overflow-x-auto">
        {["ALL", "IN", "US"].map((m) => (
          <button
            key={m}
            onClick={() => setMarket(m)}
            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-colors whitespace-nowrap cursor-pointer ${
              market === m 
                ? "bg-indigo-600 text-white glow-indigo" 
                : "bg-darkCard hover:bg-gray-800 text-gray-400"
            }`}
          >
            {m === "IN" ? "India Markets" : m === "US" ? "US Markets" : "All Markets"}
          </button>
        ))}
      </div>

      {/* Scanned Lists Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 glass-panel rounded-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm text-gray-400 mt-4 font-semibold text-center">Scanning 15-minute price &amp; volume velocities...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Gainers Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-gray-800/80">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-white font-outfit">Top Gainers (Last 15m)</h3>
            </div>
            {topGainers.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-500 glass-panel rounded-xl">
                No intraday gainers found in this category.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {topGainers.map((stock) => renderStockCard(stock, "gainers"))}
              </div>
            )}
          </div>

          {/* Volume Breakouts Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-gray-800/80">
              <Activity className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-bold text-white font-outfit">Volume Breakouts (Last 15m)</h3>
            </div>
            {volumeBreakouts.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-500 glass-panel rounded-xl">
                No volume breakouts detected in this category.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {volumeBreakouts.map((stock) => renderStockCard(stock, "volume"))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IntradayMovers;
