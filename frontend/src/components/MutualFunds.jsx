import React, { useState, useEffect } from "react";
import api from "../services/api";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Cpu, 
  PieChart, 
  Briefcase, 
  Percent, 
  Coins, 
  Star,
  Loader2,
  AlertTriangle,
  Search
} from "lucide-react";

const MutualFunds = () => {
  const [fundsList, setFundsList] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState("PPFAS"); // Default to Parag Parikh Flexi Cap
  const [fundData, setFundData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [activeMarketFilter, setActiveMarketFilter] = useState("ALL"); // ALL, IN, US

  const [searchInput, setSearchInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const searchContainerRef = React.useRef(null);

  useEffect(() => {
    if (!searchInput) {
      setSuggestions([]);
      return;
    }
    const query = searchInput.trim().toUpperCase();
    if (query.length === 0) {
      setSuggestions([]);
      return;
    }
    const filtered = fundsList.filter(
      item => item.symbol.toUpperCase().includes(query) || item.name.toUpperCase().includes(query)
    );
    setSuggestions(filtered);
  }, [searchInput, fundsList]);

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

  // Fetch list of mutual funds
  const fetchFundsList = async () => {
    setListLoading(true);
    try {
      const res = await api.get("/api/funds/list");
      setFundsList(res.data);
    } catch (err) {
      console.error("Error fetching mutual funds list:", err);
    } finally {
      setListLoading(false);
    }
  };

  // Fetch specific mutual fund analysis
  const fetchFundAnalysis = async (symbol) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/funds/${symbol}/analysis`);
      setFundData(res.data);
    } catch (err) {
      console.error(`Error fetching analysis for fund ${symbol}:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFundsList();
  }, []);

  useEffect(() => {
    if (selectedSymbol) {
      fetchFundAnalysis(selectedSymbol);
    }
  }, [selectedSymbol]);

  // Helpers for currency and AUM scaling
  const formatNAV = (nav, market) => {
    if (nav === undefined || nav === null) return "--";
    const currency = market === "IN" ? "₹" : "$";
    return `${currency}${nav.toFixed(2)}`;
  };

  const formatAUM = (aum, market) => {
    if (!aum) return "--";
    if (market === "IN") {
      // 1 Crore = 10,000,000
      return `₹${(aum / 1e7).toLocaleString(undefined, { maximumFractionDigits: 0 })} Cr`;
    } else {
      // Billions
      return `$${(aum / 1e9).toLocaleString(undefined, { maximumFractionDigits: 1 })} B`;
    }
  };

  const getRecommendationBadgeClass = (rec) => {
    switch (rec) {
      case "Strong Buy":
        return "text-emerald-400 border-emerald-500/25 bg-emerald-950/25";
      case "Buy":
        return "text-teal-400 border-teal-500/25 bg-teal-950/25";
      case "Hold":
        return "text-amber-400 border-amber-500/25 bg-amber-950/25";
      default:
        return "text-rose-400 border-rose-500/25 bg-rose-950/25";
    }
  };

  const filteredFunds = fundsList.filter(f => {
    const matchesMarket = activeMarketFilter === "ALL" || f.market === activeMarketFilter;
    const matchesSearch = !searchInput || 
      f.symbol.toUpperCase().includes(searchInput.toUpperCase()) || 
      f.name.toUpperCase().includes(searchInput.toUpperCase());
    return matchesMarket && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-4 shrink-0">
        <div>
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-outfit">Asset Management</span>
          <h2 className="text-2xl font-bold text-white font-outfit mt-0.5">Mutual Funds Analytics</h2>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-900 border border-gray-800 text-[10px] text-gray-400 font-semibold tracking-wider uppercase">
          <Cpu className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span>Active Recommendations Engaged</span>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        
        {/* Left Fund Selector Sidebar */}
        <div className="w-72 bg-darkCard/55 border border-gray-850 rounded-2xl flex flex-col overflow-hidden shrink-0">
          {/* Search Box */}
          <div ref={searchContainerRef} className="p-4 border-b border-gray-850 relative z-30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search fund or symbol..."
                value={searchInput}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setShowSuggestions(true);
                }}
                className="w-full bg-gray-950/80 border border-gray-800 text-xs text-white rounded-xl py-2 pl-9 pr-4 focus:outline-none focus:border-indigo-600 transition-colors uppercase"
              />
              
              {/* Autocomplete Suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 bg-gray-950 border border-gray-850 rounded-xl overflow-hidden shadow-2xl max-h-60 overflow-y-auto z-50">
                  {suggestions.map((item) => (
                    <button
                      key={item.symbol}
                      type="button"
                      onClick={() => {
                        setSearchInput(item.symbol);
                        setSelectedSymbol(item.symbol);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-indigo-600/25 flex justify-between items-center transition-colors border-b border-gray-900/50 last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-white text-[10px] block">{item.symbol}</span>
                        <span className="text-[9px] text-gray-400 block truncate">{item.name}</span>
                      </div>
                      <span className="text-[7px] px-1.5 py-0.5 rounded bg-gray-900 border border-gray-850 text-indigo-400 font-bold uppercase ml-2 shrink-0">
                        {item.market}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tab Filter */}
          <div className="p-4 border-b border-gray-850 flex gap-1 bg-gray-950/25">
            {["ALL", "IN", "US"].map(m => (
              <button
                key={m}
                onClick={() => setActiveMarketFilter(m)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-colors ${
                  activeMarketFilter === m 
                    ? "bg-indigo-650 text-white" 
                    : "bg-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                {m === "ALL" ? "All" : m === "IN" ? "India" : "US"}
              </button>
            ))}
          </div>

          {/* List scroll container */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {listLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                <p className="text-[10px] text-gray-500 mt-2">Loading funds universe...</p>
              </div>
            ) : filteredFunds.length === 0 ? (
              <div className="text-center py-10 text-xs text-gray-600">No mutual funds matching search filter.</div>
            ) : (
              filteredFunds.map((fund) => {
                const isSelected = selectedSymbol === fund.symbol;
                const dailyChange = fund.change_pct;
                const isPositive = dailyChange >= 0;
                
                return (
                  <button
                    key={fund.symbol}
                    onClick={() => setSelectedSymbol(fund.symbol)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? "bg-indigo-650/15 border-indigo-500/20 text-white glow-indigo-sm"
                        : "bg-gray-900/40 border-transparent hover:bg-gray-800/20 hover:border-gray-850 text-gray-300"
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="font-bold text-xs tracking-wider uppercase font-outfit">{fund.symbol}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-gray-950/80 border border-gray-800 text-indigo-400 font-bold uppercase shrink-0">
                        {fund.market}
                      </span>
                    </div>
                    
                    <span className="text-[10px] text-gray-400 font-medium truncate block w-full">{fund.name}</span>
                    
                    <div className="flex justify-between items-baseline w-full pt-1.5 border-t border-gray-850/50 mt-1">
                      <span className="font-bold font-mono text-[11px]">{formatNAV(fund.nav, fund.market)}</span>
                      <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                        {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        {isPositive ? "+" : ""}{dailyChange.toFixed(2)}%
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail Analyzer Panel */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1 min-w-0">
          {loading || !fundData ? (
            <div className="glass-panel h-full flex flex-col items-center justify-center py-24 rounded-2xl">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
              <p className="text-sm text-gray-400 mt-4 font-semibold">Running quantitative returns model & scanning portfolios...</p>
            </div>
          ) : (
            <>
              {/* Top Banner and Quick Cards */}
              <div className="glass-panel p-6 rounded-2xl space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-850 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-white font-outfit">{fundData.name}</h3>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-gray-900 border border-gray-800 text-indigo-400 font-bold uppercase shrink-0">
                        {fundData.category}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Fund Universe: <span className="text-indigo-400 font-bold">{fundData.symbol}</span> • 2026 Fiscal Analysis Report</p>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-xs text-gray-500">Current NAV:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-2xl font-bold font-outfit text-white">{formatNAV(fundData.nav, fundData.market)}</span>
                      <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-lg ${
                        fundData.change_pct >= 0 ? "bg-emerald-950/20 text-emerald-400 border border-emerald-500/10" : "bg-rose-950/20 text-rose-400 border border-rose-500/10"
                      }`}>
                        {fundData.change_pct >= 0 ? "+" : ""}{fundData.change_pct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-darkCard p-4 border border-gray-850 rounded-xl text-center">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Expense Ratio</span>
                    <span className="text-lg font-bold font-outfit text-indigo-400 block mt-1">
                      {fundData.expense_ratio.toFixed(2)}%
                    </span>
                  </div>
                  <div className="bg-darkCard p-4 border border-gray-850 rounded-xl text-center">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Assets Under Management</span>
                    <span className="text-lg font-bold font-outfit text-white block mt-1">
                      {formatAUM(fundData.aum, fundData.market)}
                    </span>
                  </div>
                  <div className="bg-darkCard p-4 border border-gray-850 rounded-xl text-center">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Sharpe Ratio</span>
                    <span className="text-lg font-bold font-outfit text-emerald-400 block mt-1">
                      {fundData.sharpe_ratio.toFixed(2)}x
                    </span>
                  </div>
                  <div className="bg-darkCard p-4 border border-gray-850 rounded-xl text-center">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Risk Profile</span>
                    <span className={`text-lg font-bold font-outfit block mt-1 ${
                      fundData.risk_profile.toLowerCase() === "low" ? "text-emerald-400" :
                      fundData.risk_profile.toLowerCase().includes("moderate") ? "text-amber-400" :
                      "text-rose-400"
                    }`}>
                      {fundData.risk_profile}
                    </span>
                  </div>
                </div>
              </div>

              {/* Returns Chart & AI Recommendation Side-by-Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* AI Recommendation Card */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-full bg-indigo-950/5 border-indigo-500/10">
                  <div>
                    <div className="flex justify-between items-center border-b border-gray-850 pb-3 mb-4">
                      <h4 className="font-bold text-white font-outfit flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-indigo-400" />
                        <span>AI Analyst Assessment</span>
                      </h4>
                      <div className={`px-3 py-1 border rounded-lg text-xs font-bold uppercase tracking-wider ${getRecommendationBadgeClass(fundData.ai_recommendation.recommendation)}`}>
                        {fundData.ai_recommendation.recommendation}
                      </div>
                    </div>

                    {/* Star Rating Display */}
                    <div className="flex gap-1.5 mb-4">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const filled = i < fundData.ai_recommendation.stars;
                        return (
                          <Star 
                            key={i} 
                            className={`w-5 h-5 ${filled ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,0.25)]" : "text-gray-700"}`} 
                          />
                        );
                      })}
                      <span className="text-xs text-gray-400 font-bold ml-2">({fundData.ai_recommendation.stars} / 5 Rating)</span>
                    </div>

                    {/* Detailed Rationale Bullet Points */}
                    <ul className="space-y-3 mt-4">
                      {fundData.ai_recommendation.reasons.map((reason, i) => (
                        <li key={i} className="flex gap-2 text-xs text-gray-300 items-start">
                          <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-indigo-650/5 border border-indigo-500/10 p-3.5 rounded-xl flex items-start gap-2.5 text-[9px] text-indigo-400 mt-6 shrink-0">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Advisory: Mutual funds hold market risk. Compare past Sharpe ratio volatility limits against active investment objectives.</span>
                  </div>
                </div>

                {/* Annualized Compound Returns Chart (Clean Tailwind Graphic) */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
                  <div className="border-b border-gray-850 pb-3 mb-4">
                    <h4 className="font-bold text-white font-outfit flex items-center gap-2">
                      <Activity className="w-5 h-5 text-indigo-400" />
                      <span>Annualized Compound Returns (%)</span>
                    </h4>
                  </div>

                  <div className="space-y-5 py-2">
                    {[
                      { period: "1-Year Return", value: fundData.returns_1y, color: "bg-indigo-600 text-indigo-400" },
                      { period: "3-Year Avg Return", value: fundData.returns_3y, color: "bg-emerald-600 text-emerald-400" },
                      { period: "5-Year Avg Return", value: fundData.returns_5y, color: "bg-teal-650 text-teal-400" }
                    ].map((ret, i) => {
                      const isNeg = ret.value < 0;
                      // Clamp to [0, 100] for bar width; scale by 40% max
                      const widthPercent = isNeg ? 0 : Math.min(100, (ret.value / 40) * 100);
                      const barClass = isNeg ? "bg-rose-600" : ret.color.split(" ")[0];
                      const textClass = isNeg ? "text-rose-400" : ret.color.split(" ")[1];
                      
                      return (
                        <div key={i} className="space-y-2">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-gray-400">{ret.period}</span>
                            <span className={textClass}>{ret.value >= 0 ? "+" : ""}{ret.value.toFixed(2)}%</span>
                          </div>
                          <div className="w-full bg-gray-950 h-3 rounded-full overflow-hidden border border-gray-900">
                            {isNeg ? (
                              <div className="h-full flex items-center px-2">
                                <span className="text-[8px] text-rose-400 font-bold">Negative</span>
                              </div>
                            ) : (
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${barClass} glow-indigo-sm`}
                                style={{ width: `${widthPercent}%` }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[10px] text-gray-500 italic mt-4 text-center">
                    Annualized performance assumes dividend reinvestment metrics.
                  </p>
                </div>

              </div>

              {/* Asset Allocation & Top Holdings Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Asset Allocation Progress Bars */}
                <div className="glass-panel p-6 rounded-2xl lg:col-span-1 space-y-4">
                  <div className="border-b border-gray-850 pb-3 mb-2 flex items-center gap-2">
                    <PieChart className="w-4.5 h-4.5 text-indigo-400" />
                    <h4 className="font-bold text-white text-sm">Portfolio Allocation Mix</h4>
                  </div>

                  <div className="space-y-3.5 pt-2">
                    {Object.entries(fundData.allocation).map(([asset, weight]) => {
                      return (
                        <div key={asset} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-gray-400">{asset}</span>
                            <span className="text-white font-bold">{weight.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-950 h-2 rounded-full overflow-hidden border border-gray-900">
                            <div 
                              className={`h-full rounded-full ${
                                asset === "Equity" ? "bg-indigo-600" :
                                asset === "Debt" ? "bg-amber-600" :
                                "bg-emerald-600"
                              }`}
                              style={{ width: `${weight}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top Sector Holdings */}
                <div className="glass-panel p-6 rounded-2xl lg:col-span-1 space-y-4">
                  <div className="border-b border-gray-850 pb-3 mb-2 flex items-center gap-2">
                    <Briefcase className="w-4.5 h-4.5 text-indigo-400" />
                    <h4 className="font-bold text-white text-sm">Top Industry Sectors</h4>
                  </div>

                  <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                    {fundData.top_sectors.map((sec, i) => {
                      return (
                        <div key={i} className="flex justify-between items-center text-xs">
                          <span className="text-gray-400 font-medium">{sec.sector}</span>
                          <span className="text-white font-semibold font-mono bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">
                            {sec.weight}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top Stock Holdings list */}
                <div className="glass-panel p-6 rounded-2xl lg:col-span-1 space-y-4">
                  <div className="border-b border-gray-850 pb-3 mb-2 flex items-center gap-2">
                    <Coins className="w-4.5 h-4.5 text-indigo-400" />
                    <h4 className="font-bold text-white text-sm">Top Asset Holdings</h4>
                  </div>

                  <div className="divide-y divide-gray-850 max-h-[160px] overflow-y-auto pr-1">
                    {fundData.top_holdings.map((hold, i) => {
                      return (
                        <div key={i} className="py-2 flex items-center gap-2 text-xs text-gray-300 font-medium">
                          <span className="text-gray-500 font-semibold">{i + 1}.</span>
                          <span className="truncate">{hold}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default MutualFunds;
