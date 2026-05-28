import React, { useState, useEffect } from "react";
import { useLiveData } from "../context/LiveDataContext";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { SkeletonBlock } from "./Skeleton";

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
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  Activity, 
  Lock, 
  Search,
  Eye
} from "lucide-react";

const Dashboard = ({ onSelectStock, onOpenAuth }) => {
  const { prices, connected, subscribeSymbols, unsubscribeSymbols } = useLiveData();
  const { user } = useAuth();
  
  const [activeMarket, setActiveMarket] = useState("ALL"); // ALL, IN, US, CRYPTO
  const [watchlist, setWatchlist] = useState([]);
  const [newSymbol, setNewSymbol] = useState("");
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [priceHistory, setPriceHistory] = useState({}); // Tracking old prices to flash color
  const [watchlistSuggestions, setWatchlistSuggestions] = useState([]);
  const [showWatchlistSuggestions, setShowWatchlistSuggestions] = useState(false);

  // Predefined Index Tick list configuration
  const indices = [
    { id: "NIFTY", name: "Nifty 50", market: "IN", yf: "^NSEI" },
    { id: "BANKNIFTY", name: "Bank Nifty", market: "IN", yf: "^NSEBANK" },
    { id: "GIFTNIFTY", name: "GIFT Nifty", market: "IN", yf: "GIFTY=F" },
    { id: "SENSEX", name: "SENSEX", market: "IN", yf: "^BSESN" },
    { id: "NASDAQ", name: "NASDAQ 100", market: "US", yf: "^IXIC" },
    { id: "SP500", name: "S&P 500", market: "US", yf: "^GSPC" },
    { id: "BTC", name: "Bitcoin / USD", market: "CRYPTO", yf: "BTC-USD" },
    { id: "ETH", name: "Ethereum / USD", market: "CRYPTO", yf: "ETH-USD" },
    { id: "USDINR", name: "USD / INR", market: "FOREX", yf: "USDINR=X" },
    { id: "EURUSD", name: "EUR / USD", market: "FOREX", yf: "EURUSD=X" }
  ];

  // Fetch watchlist when logged in
  const fetchWatchlist = async () => {
    if (!user) return;
    setWatchlistLoading(true);
    try {
      const res = await api.get("/api/stocks/watchlist/list");
      setWatchlist(res.data);
      // Subscribe to all watchlist symbols
      const symbols = res.data.map(item => item.symbol);
      subscribeSymbols(symbols);
    } catch (err) {
      console.error("Error fetching watchlist:", err);
    } finally {
      setWatchlistLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
    return () => {
      // Unsubscribe watchlist symbols on teardown
      if (watchlist.length > 0) {
        unsubscribeSymbols(watchlist.map(item => item.symbol));
      }
    };
  }, [user]);

  // Flash color tracker
  useEffect(() => {
    const nextHistory = { ...priceHistory };
    let hasChanges = false;
    
    Object.keys(prices).forEach((symbol) => {
      const current = prices[symbol].price;
      const old = priceHistory[symbol]?.price;
      
      if (old !== undefined && current !== old) {
        nextHistory[symbol] = {
          price: current,
          direction: current > old ? "up" : "down",
          time: Date.now()
        };
        hasChanges = true;
      } else if (old === undefined) {
        nextHistory[symbol] = {
          price: current,
          direction: "flat",
          time: Date.now()
        };
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      setPriceHistory(nextHistory);
    }
  }, [prices]);

  const triggerAddWatchlist = async (symbolToAdd) => {
    try {
      const res = await api.post("/api/stocks/watchlist/add", { symbol: symbolToAdd });
      setWatchlist(prev => {
        if (prev.some(item => item.symbol === res.data.symbol)) return prev;
        return [...prev, res.data];
      });
      subscribeSymbols([symbolToAdd]);
      setNewSymbol("");
    } catch (err) {
      alert("Failed to add symbol.");
    }
  };

  const handleAddWatchlist = async (e) => {
    e.preventDefault();
    if (!newSymbol || !user) return;
    triggerAddWatchlist(newSymbol.trim().toUpperCase());
  };

  // Fetch search suggestions for watchlist addition
  useEffect(() => {
    if (!newSymbol || newSymbol.trim().length < 2) {
      setWatchlistSuggestions([]);
      return;
    }
    
    const delayDebounce = setTimeout(async () => {
      try {
        const response = await api.get(`/api/stocks/search?q=${newSymbol.trim()}`);
        setWatchlistSuggestions(response.data);
      } catch (err) {
        console.error("Failed to fetch watchlist suggestions:", err);
      }
    }, 300);
    
    return () => clearTimeout(delayDebounce);
  }, [newSymbol]);

  const handleRemoveWatchlist = async (sym) => {
    try {
      await api.delete(`/api/stocks/watchlist/remove/${sym}`);
      setWatchlist(prev => prev.filter(item => item.symbol !== sym));
      unsubscribeSymbols([sym]);
    } catch (err) {
       console.error(err);
    }
  };

  const getPriceFlashClass = (symbol) => {
    const record = priceHistory[symbol];
    if (!record || Date.now() - record.time > 1000) return "text-white";
    if (record.direction === "up") return "text-emerald-400 font-bold transition-all animate-pulse";
    if (record.direction === "down") return "text-rose-400 font-bold transition-all animate-pulse";
    return "text-white";
  };

  // Filter indices based on select tab
  const filteredIndices = indices.filter(idx => 
    activeMarket === "ALL" || idx.market === activeMarket
  );

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Upper stats block */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold font-outfit text-white">Live Dashboard</h2>
          <p className="text-sm text-gray-400">Real-time market analytics and tracking status</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-900 border border-gray-800 text-xs">
          <span className={`w-2.5 h-2.5 rounded-full ${connected ? "bg-emerald-500 animate-pulse glow-emerald" : "bg-rose-500"}`}></span>
          <span className="text-gray-300 font-semibold">{connected ? "Socket Streaming Live" : "Streaming Offline"}</span>
        </div>
      </div>

      {/* Market Selector Tab Bar */}
      <div className="flex gap-1.5 md:gap-2 border-b border-gray-900 pb-2 overflow-x-auto">
        {["ALL", "IN", "US", "CRYPTO", "FOREX"].map((m) => (
          <button
            key={m}
            onClick={() => setActiveMarket(m)}
            className={`px-3 md:px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-colors whitespace-nowrap ${
              activeMarket === m 
                ? "bg-indigo-600 text-white glow-indigo" 
                : "bg-darkCard hover:bg-gray-800 text-gray-400"
            }`}
          >
            {m === "IN" ? "India" : m === "US" ? "US" : m === "CRYPTO" ? "Crypto" : m === "FOREX" ? "Forex" : "All"}
          </button>
        ))}
      </div>

      {/* Indices Grid Cards — 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {filteredIndices.map((idx) => {
          const liveData = prices[idx.id] || prices[idx.yf] || prices[idx.id.toUpperCase()] || prices[idx.yf.toUpperCase()];
          const priceVal = liveData?.price;
          const currencySymbol = (idx.market === "IN" || (idx.market === "FOREX" && idx.id === "USDINR")) ? "₹" : "$";
          const priceFormatted = (typeof priceVal === "number" && !isNaN(priceVal)) 
            ? `${currencySymbol}${priceVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
            : "--";
          const time = liveData?.timestamp || "--";
          const status = liveData?.status || "Open";
          const isClosed = status === "Closed" || status === "Holiday";
          const flashClass = getPriceFlashClass(idx.id);

          return (
            <div 
              key={idx.id} 
              onClick={() => onSelectStock(idx.id)}
              className="glass-panel glass-panel-hover p-5 rounded-2xl flex flex-col justify-between min-h-[120px] cursor-pointer hover:border-indigo-500/50 transition-all duration-200"
              title={`View interactive chart for ${idx.name}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{idx.market} Market</span>
                    {isClosed && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                        status === "Holiday" 
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}>
                        {status}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-white text-base mt-0.5">{idx.name}</h3>
                </div>
                <div className="p-2 rounded-lg bg-gray-900 text-indigo-400 border border-gray-800">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className={`text-xl font-bold font-outfit tracking-tight ${flashClass}`}>
                  {priceFormatted}
                </span>
                <span className="text-[10px] text-gray-600 font-medium">
                  {isClosed ? `Status: ${status}` : `Tick: ${time}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Personal Watchlist Component */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-4">
          <div>
            <h3 className="font-bold text-lg text-white font-outfit">My Watchlist</h3>
            <p className="text-xs text-gray-400">Symbols synced to your database user profile</p>
          </div>
          {user && (
            <form onSubmit={handleAddWatchlist} className="flex gap-2 relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Add Symbol (e.g. AAPL, TCS)"
                  value={newSymbol}
                  onChange={(e) => {
                    setNewSymbol(e.target.value);
                    setShowWatchlistSuggestions(true);
                  }}
                  onFocus={() => setShowWatchlistSuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => setShowWatchlistSuggestions(false), 200);
                  }}
                  className="bg-gray-950/80 border border-gray-800 text-xs text-white rounded-xl py-2 pl-9 pr-4 focus:outline-none focus:border-indigo-600 transition-colors uppercase w-48"
                />
                
                {showWatchlistSuggestions && watchlistSuggestions.length > 0 && (
                  <div className="absolute left-0 mt-2 w-64 bg-gray-950 border border-gray-800 rounded-xl max-h-60 overflow-y-auto z-50 shadow-2xl divide-y divide-gray-900">
                    {watchlistSuggestions.map((s) => (
                      <div
                        key={s.symbol}
                        onClick={() => {
                          setNewSymbol(s.symbol);
                          setShowWatchlistSuggestions(false);
                          triggerAddWatchlist(s.symbol);
                        }}
                        className="p-2.5 hover:bg-indigo-600/25 cursor-pointer flex justify-between items-center transition-colors text-left"
                      >
                        <div>
                          <span className="font-bold text-white text-[11px] block truncate max-w-[150px]">{s.name}</span>
                          <span className="text-[9px] text-gray-550">{s.symbol}</span>
                        </div>
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-gray-900 border border-gray-800 font-bold uppercase text-gray-400">
                          {s.exchange}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button 
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-500 p-2 rounded-xl text-white transition-colors cursor-pointer"
                title="Add to Watchlist"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>

        {!user ? (
          <div className="flex flex-col items-center justify-center py-12 border border-dashed border-gray-800 rounded-xl bg-gray-950/20">
            <Lock className="w-8 h-8 text-gray-600 mb-3" />
            <p className="text-sm font-semibold text-gray-400">Save Your Personal Watchlist</p>
            <p className="text-xs text-gray-600 mt-1 max-w-sm text-center">Register or log in to secure your trading dashboard, save symbols, trigger alerts, and record model history.</p>
            <button 
              onClick={onOpenAuth}
              className="mt-4 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 px-4 py-2 border border-indigo-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Sign In Now
            </button>
          </div>
        ) : watchlistLoading ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b border-gray-800/40">
                <SkeletonBlock className="h-4 w-16" />
                <SkeletonBlock className="h-4 flex-1" />
                <SkeletonBlock className="h-4 w-20" />
                <SkeletonBlock className="h-8 w-16 rounded-lg" />
              </div>
            ))}
          </div>
        ) : watchlist.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-500 border border-dashed border-gray-800 rounded-xl">
            Watchlist is empty. Search and add symbols like <span className="text-indigo-400 font-bold">AAPL</span>, <span className="text-indigo-400 font-bold">TCS</span>, or <span className="text-indigo-400 font-bold">TSLA</span> above!
          </div>
        ) : (
          <>
            {/* Mobile card layout */}
            <div className="flex flex-col gap-2 md:hidden">
              {watchlist.map((item) => {
                const live = prices[item.symbol];
                const price = live?.price;
                const flashClass = getPriceFlashClass(item.symbol);
                return (
                  <div key={item.id} className="flex items-center justify-between py-2.5 px-1 border-b border-gray-800/40 last:border-0">
                    <div>
                      <span className="font-bold text-white text-sm tracking-wider font-outfit">{item.symbol}</span>
                      <span className={`text-xs font-semibold block font-outfit mt-0.5 ${flashClass}`}>
                        {typeof price === "number" ? `${isIndianSymbol(item.symbol) ? "₹" : "$"}${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Fetching..."}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => onSelectStock(item.symbol)} className="bg-gray-850 hover:bg-indigo-600/20 text-gray-400 hover:text-indigo-400 p-2 rounded-lg transition-colors border border-gray-800"><Eye className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleRemoveWatchlist(item.symbol)} className="bg-gray-850 hover:bg-rose-950/40 text-gray-500 hover:text-rose-400 p-2 rounded-lg transition-colors border border-gray-800"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Desktop table layout */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
                    <th className="pb-3">Ticker Symbol</th>
                    <th className="pb-3 text-right">Last Price</th>
                    <th className="pb-3 text-right">Tick Update</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {watchlist.map((item) => {
                    const live = prices[item.symbol];
                    const price = live?.price || "Fetching...";
                    const time = live?.timestamp || "--:--:--";
                    const flashClass = getPriceFlashClass(item.symbol);
                    return (
                      <tr key={item.id} className="group hover:bg-gray-800/10 transition-colors">
                        <td className="py-3 font-semibold text-white tracking-wider font-outfit">{item.symbol}</td>
                        <td className={`py-3 text-right font-semibold font-outfit ${flashClass}`}>
                          {typeof price === "number" ? `${isIndianSymbol(item.symbol) ? "₹" : "$"}${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : price}
                        </td>
                        <td className="py-3 text-right text-xs text-gray-500">{time}</td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => onSelectStock(item.symbol)} className="bg-gray-850 hover:bg-indigo-600/20 text-gray-400 hover:text-indigo-400 p-2 rounded-lg transition-colors border border-gray-800" title="Interactive Chart"><Eye className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleRemoveWatchlist(item.symbol)} className="bg-gray-850 hover:bg-rose-950/40 text-gray-500 hover:text-rose-400 p-2 rounded-lg transition-colors border border-gray-800" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
