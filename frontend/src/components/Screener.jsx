import React, { useState, useEffect } from "react";
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
import { 
  Filter, 
  RefreshCw, 
  ArrowUpRight, 
  TrendingUp, 
  TrendingDown, 
  Eye,
  Loader2,
  Activity
} from "lucide-react";

const Screener = ({ onSelectStock }) => {
  const [market, setMarket] = useState("ALL");
  const [rsiFilter, setRsiFilter] = useState("");
  const [patternFilter, setPatternFilter] = useState("");
  const [volumeBreakout, setVolumeBreakout] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Custom Search & Analyze States
  const [searchSymbol, setSearchSymbol] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchAnalysis, setSearchAnalysis] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const runScreener = async () => {
    setLoading(true);
    try {
      let url = `/api/stocks/screener/scan?market=${market}&volume_breakout=${volumeBreakout}`;
      if (rsiFilter) url += `&rsi_filter=${rsiFilter}`;
      if (patternFilter) url += `&pattern_filter=${patternFilter}`;
      
      const response = await api.get(url);
      setResults(response.data);
    } catch (error) {
      console.error("Screener failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const triggerAnalysis = async (symbolToAnalyze) => {
    setSearchLoading(true);
    setSearchAnalysis(null);
    try {
      const response = await api.get(`/api/stocks/${symbolToAnalyze}/analysis`);
      setSearchAnalysis(response.data);
    } catch (error) {
      console.error("Custom analysis failed:", error);
      alert("Failed to analyze stock. Symbol may not exist or yfinance is rate-limited.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAnalyzeSearch = (e) => {
    e.preventDefault();
    if (!searchSymbol) return;
    triggerAnalysis(searchSymbol.trim().toUpperCase());
  };

  // Fetch search suggestions as the user types
  useEffect(() => {
    if (!searchSymbol || searchSymbol.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    
    const delayDebounce = setTimeout(async () => {
      try {
        const response = await api.get(`/api/stocks/search?q=${searchSymbol.trim()}`);
        setSuggestions(response.data);
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
      }
    }, 300);
    
    return () => clearTimeout(delayDebounce);
  }, [searchSymbol]);

  // Run screen on mount
  useEffect(() => {
    runScreener();
  }, []);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-4">
        <div>
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-outfit">Screener Engine</span>
          <h2 className="text-xl md:text-2xl font-bold text-white font-outfit mt-0.5">Stock Screener</h2>
        </div>
        <button
          onClick={runScreener}
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 px-4 py-2.5 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 glow-indigo w-full sm:w-auto justify-center"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span>Scan Universe</span>
        </button>
      </div>

      {/* Instant Custom Stock Analysis Card */}
      <div className="glass-panel p-6 rounded-2xl">
        <h3 className="text-lg font-bold text-white font-outfit mb-2 flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-400" />
          <span>Analyze Custom Stock Ticker</span>
        </h3>
        <p className="text-xs text-gray-400 mb-4">Enter any symbol (e.g. RELIANCE, TCS, AAPL, TSLA, MSFT) to run technical indicators and fit the machine learning Random Forest classifier instantly.</p>
        
        <form onSubmit={handleAnalyzeSearch} className="flex flex-col sm:flex-row gap-3 relative">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Enter symbol or company name (e.g. adani power, ola, reliance)..."
              value={searchSymbol}
              onChange={(e) => {
                setSearchSymbol(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              className="w-full bg-gray-950/80 border border-gray-800 text-sm text-white rounded-xl py-3 px-4 focus:outline-none focus:border-indigo-500 transition-colors uppercase"
            />
            
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-gray-950 border border-gray-800 rounded-xl max-h-60 overflow-y-auto z-50 shadow-2xl divide-y divide-gray-900">
                {suggestions.map((s) => (
                  <div
                    key={s.symbol}
                    onClick={() => {
                      setSearchSymbol(s.symbol);
                      setShowSuggestions(false);
                      triggerAnalysis(s.symbol);
                    }}
                    className="p-3 hover:bg-indigo-600/25 cursor-pointer flex justify-between items-center transition-colors text-left"
                  >
                    <div>
                      <span className="font-bold text-white text-xs block">{s.name}</span>
                      <span className="text-[10px] text-gray-550">{s.symbol}</span>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-gray-900 border border-gray-800 font-bold uppercase text-gray-400">
                      {s.exchange}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button 
            type="submit"
            disabled={searchLoading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-xl transition-colors shrink-0 flex items-center justify-center gap-2 cursor-pointer"
          >
            {searchLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Analyze</span>
          </button>
        </form>

        {/* Display Search Recommendation Results */}
        {searchLoading && (
          <div className="mt-6 flex flex-col items-center justify-center p-8 border border-dashed border-gray-800 rounded-xl bg-gray-950/20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs text-gray-400 mt-3 font-semibold">Running patterns, scanning indicators, and generating model fits...</p>
          </div>
        )}

        {!searchLoading && searchAnalysis && (
          <div className="mt-6 p-5 bg-gray-950/40 border border-gray-905 rounded-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-850 pb-4">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">AI RECOMMENDATION REPORT</span>
                <h4 className="text-xl font-bold text-white font-outfit mt-0.5">{searchAnalysis.symbol}</h4>
              </div>
              <div className="flex items-center gap-3">
                <div className={`px-4 py-2 rounded-xl text-center font-bold text-lg font-outfit border ${
                  searchAnalysis.signal === "BUY" ? "text-emerald-400 border-emerald-500/20 bg-emerald-950/25" :
                  searchAnalysis.signal === "SELL" ? "text-rose-400 border-rose-500/20 bg-rose-950/25" :
                  "text-amber-400 border-amber-500/20 bg-amber-950/25"
                }`}>
                  {searchAnalysis.signal}
                </div>
                <button
                  onClick={() => onSelectStock(searchAnalysis.symbol)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer glow-indigo"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Chart</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Confidence Rating */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">AI Model Confidence</span>
                <div className="bg-darkCard p-4 border border-gray-850 rounded-xl space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-bold font-outfit text-white">{searchAnalysis.confidence}%</span>
                    <span className="text-[9px] text-gray-550 uppercase tracking-wider">Estimated fit</span>
                  </div>
                  <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden border border-gray-850">
                    <div 
                      className={`h-full rounded-full ${
                        searchAnalysis.signal === "BUY" ? "bg-emerald-500" : searchAnalysis.signal === "SELL" ? "bg-rose-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${searchAnalysis.confidence}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Rationale list */}
              <div className="md:col-span-2 space-y-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Signal Factors</span>
                <div className="bg-darkCard p-4 border border-gray-850 rounded-xl">
                  <ul className="space-y-2 text-xs text-gray-300">
                    {searchAnalysis.reasons.map((reason, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>


      {/* Filter Options Bar */}
      <div className="glass-panel p-4 md:p-6 rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Market Category */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Market</label>
          <select
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            className="w-full bg-gray-950/60 border border-gray-800 text-xs text-white rounded-xl py-3 px-4 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="ALL">All Markets (US + India)</option>
            <option value="US">US Markets (NYSE/NASDAQ)</option>
            <option value="IN">Indian Markets (NSE/BSE)</option>
          </select>
        </div>

        {/* RSI Filter */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">RSI (14) State</label>
          <select
            value={rsiFilter}
            onChange={(e) => setRsiFilter(e.target.value)}
            className="w-full bg-gray-950/60 border border-gray-800 text-xs text-white rounded-xl py-3 px-4 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="">Any RSI Level</option>
            <option value="oversold">Oversold (RSI &lt; 35)</option>
            <option value="overbought">Overbought (RSI &gt; 65)</option>
          </select>
        </div>

        {/* Pattern Filter */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Chart / Candle Pattern</label>
          <select
            value={patternFilter}
            onChange={(e) => setPatternFilter(e.target.value)}
            className="w-full bg-gray-950/60 border border-gray-800 text-xs text-white rounded-xl py-3 px-4 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="">Any Candlestick Pattern</option>
            <option value="doji">Doji</option>
            <option value="hammer">Hammer</option>
            <option value="bullish_engulfing">Bullish Engulfing</option>
            <option value="bearish_engulfing">Bearish Engulfing</option>
            <option value="double_bottom">Double Bottom (W-Pattern)</option>
            <option value="double_top">Double Top</option>
            <option value="head_shoulders">Head and Shoulders</option>
          </select>
        </div>

        {/* Volume Breakout Filter */}
        <div className="flex items-center gap-3 pt-6 select-none">
          <input
            id="volumeCheck"
            type="checkbox"
            checked={volumeBreakout}
            onChange={(e) => setVolumeBreakout(e.target.checked)}
            className="w-4 h-4 accent-indigo-600 rounded border-gray-800 focus:ring-0 focus:ring-offset-0 bg-gray-900 cursor-pointer"
          />
          <label htmlFor="volumeCheck" className="text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-gray-300">
            2x Volume Breakout
          </label>
        </div>
      </div>

      {/* Screen Results */}
      <div className="glass-panel p-4 md:p-6 rounded-2xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm text-gray-400 mt-4 font-semibold text-center">Scanning stock metrics &amp; checking active candles...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-500">
            No matching symbols found. Try relaxing the filter parameters.
          </div>
        ) : (
          <>
            {/* Mobile card layout */}
            <div className="flex flex-col gap-3 md:hidden">
              {results.map((stock) => (
                <div key={stock.symbol} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-white tracking-wider font-outfit">{stock.symbol}</span>
                      <span className="text-[10px] text-gray-500 block mt-0.5">{stock.name}</span>
                    </div>
                    <button
                      onClick={() => onSelectStock(stock.symbol)}
                      className="bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white p-2 border border-indigo-500/20 rounded-xl transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold font-outfit text-white">
                      {isIndianSymbol(stock.symbol) ? "₹" : "$"}{stock.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-sm font-bold ${stock.change_pct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {stock.change_pct >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {stock.change_pct >= 0 ? "+" : ""}{stock.change_pct.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      stock.rsi < 30 ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/10" :
                      stock.rsi > 70 ? "bg-rose-950/40 text-rose-400 border border-rose-500/10" :
                      "bg-gray-900 text-gray-400 border border-gray-800"
                    }`}>RSI {stock.rsi}</span>
                    {stock.patterns_detected.map(pat => (
                      <span key={pat} className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        ["Hammer","Bullish_Engulfing","Double_Bottom"].includes(pat)
                          ? "bg-emerald-950/30 text-emerald-400 border-emerald-500/10"
                          : ["Doji"].includes(pat)
                          ? "bg-amber-950/30 text-amber-400 border-amber-500/10"
                          : "bg-rose-950/30 text-rose-400 border-rose-500/10"
                      }`}>{pat.replace("_"," ")}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table layout */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
                    <th className="pb-3">Ticker</th>
                    <th className="pb-3 text-right">Price</th>
                    <th className="pb-3 text-right">24h Change</th>
                    <th className="pb-3 text-right">RSI (14)</th>
                    <th className="pb-3">Patterns Detected</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40">
                  {results.map((stock) => (
                    <tr key={stock.symbol} className="hover:bg-gray-800/10 transition-colors group">
                      <td className="py-4 font-bold text-white tracking-wider font-outfit">
                        {stock.symbol}
                        <span className="text-[10px] text-gray-500 font-medium block mt-0.5">{stock.name}</span>
                      </td>
                      <td className="py-4 text-right font-semibold font-outfit text-white">
                        {isIndianSymbol(stock.symbol) ? "₹" : "$"}{stock.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 text-right font-semibold font-outfit">
                        <span className={`inline-flex items-center gap-1 ${stock.change_pct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {stock.change_pct >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          {stock.change_pct >= 0 ? "+" : ""}{stock.change_pct.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-4 text-right font-medium text-gray-300 font-outfit">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          stock.rsi < 30 ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/10" :
                          stock.rsi > 70 ? "bg-rose-950/40 text-rose-400 border border-rose-500/10" :
                          "text-gray-400"
                        }`}>{stock.rsi}</span>
                      </td>
                      <td className="py-4">
                        {stock.patterns_detected.length === 0 ? (
                          <span className="text-gray-600 text-xs">-</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {stock.patterns_detected.map(pat => (
                              <span key={pat} className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                ["Hammer","Bullish_Engulfing","Double_Bottom"].includes(pat)
                                  ? "bg-emerald-950/30 text-emerald-400 border-emerald-500/10"
                                  : ["Doji"].includes(pat)
                                  ? "bg-amber-950/30 text-amber-400 border-amber-500/10"
                                  : "bg-rose-950/30 text-rose-400 border-rose-500/10"
                              }`}>{pat.replace("_"," ")}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() => onSelectStock(stock.symbol)}
                          className="bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white p-2 border border-indigo-500/20 rounded-xl transition-all group-hover:scale-105"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Screener;
;
