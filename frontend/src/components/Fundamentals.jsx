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
  Building2, 
  DollarSign, 
  TrendingUp, 
  FileSpreadsheet, 
  Compass,
  AlertCircle,
  Loader2 
} from "lucide-react";

const Fundamentals = ({ symbol }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("balance"); // balance, cashflow, historical

  const fetchFundamentals = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/stocks/${symbol}/summary`);
      setData(response.data);
    } catch (err) {
      console.error("Failed to load company summary:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFundamentals();
  }, [symbol]);

  const formatNumber = (num) => {
    if (num === null || num === undefined) return "--";
    const curr = isIndianSymbol(symbol) ? "₹" : "$";
    if (Math.abs(num) >= 1e12) return `${curr}${(num / 1e12).toFixed(2)}T`;
    if (Math.abs(num) >= 1e9) return `${curr}${(num / 1e9).toFixed(2)}B`;
    if (Math.abs(num) >= 1e6) return `${curr}${(num / 1e6).toFixed(2)}M`;
    return `${curr}${num.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="glass-panel p-10 rounded-2xl flex flex-col items-center justify-center min-h-[250px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm text-gray-400 mt-3 font-medium">Fetching company financials and statement grids...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="glass-panel p-8 text-center text-gray-500 rounded-2xl">
        No fundamental profile data available for ticker {symbol}.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Financial Info Banner */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-650/20 p-3.5 border border-indigo-500/10 rounded-2xl text-indigo-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-white font-outfit">{data.name}</h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-900 border border-gray-800 text-gray-400 font-semibold tracking-wider uppercase">
                {data.sector}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Ticker Universe: <span className="text-indigo-400 font-bold">{symbol}</span> • Sector-specific standard reports</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
          <div className="text-gray-500">Market Capitalization:</div>
          <div className="text-white font-semibold text-right">{formatNumber(data.market_cap)}</div>
          <div className="text-gray-500">52-Week Range:</div>
          <div className="text-gray-300 font-medium text-right">
            {isIndianSymbol(symbol) ? "₹" : "$"}{data.fifty_two_week_low?.toFixed(2)} - {isIndianSymbol(symbol) ? "₹" : "$"}{data.fifty_two_week_high?.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Ratios Grid Layout */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        {/* P/E Ratio */}
        <div className="bg-darkCard p-4 border border-gray-850 rounded-2xl text-center">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">P/E Ratio</span>
          <span className="text-lg font-bold font-outfit text-indigo-400 block mt-1">
            {data.pe_ratio ? `${data.pe_ratio.toFixed(2)}x` : "N/A"}
          </span>
        </div>

        {/* EPS */}
        <div className="bg-darkCard p-4 border border-gray-850 rounded-2xl text-center">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">EPS (Trailing)</span>
          <span className="text-lg font-bold font-outfit text-white block mt-1">
            {data.eps ? `${isIndianSymbol(symbol) ? "₹" : "$"}${data.eps.toFixed(2)}` : "--"}
          </span>
        </div>

        {/* ROE */}
        <div className="bg-darkCard p-4 border border-gray-850 rounded-2xl text-center">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Return on Equity</span>
          <span className="text-lg font-bold font-outfit text-emerald-400 block mt-1">
            {data.roe ? `${data.roe.toFixed(1)}%` : "--"}
          </span>
        </div>

        {/* Debt to Equity */}
        <div className="bg-darkCard p-4 border border-gray-850 rounded-2xl text-center">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Debt to Equity</span>
          <span className="text-lg font-bold font-outfit text-amber-400 block mt-1">
            {data.debt_equity ? data.debt_equity.toFixed(2) : "0.00"}
          </span>
        </div>

        {/* Current Ratio */}
        <div className="bg-darkCard p-4 border border-gray-850 rounded-2xl text-center">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Current Ratio</span>
          <span className="text-lg font-bold font-outfit text-blue-400 block mt-1">
            {data.current_ratio ? data.current_ratio.toFixed(2) : "1.50"}
          </span>
        </div>

        {/* Dividend Yield */}
        <div className="bg-darkCard p-4 border border-gray-850 rounded-2xl text-center">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Div Yield</span>
          <span className="text-lg font-bold font-outfit text-purple-400 block mt-1">
            {data.dividend_yield ? `${data.dividend_yield.toFixed(2)}%` : "0.00%"}
          </span>
        </div>

      </div>

      {/* Main Analysis content tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Financial Statements Grid */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-850 pb-3">
            <h4 className="font-bold text-white font-outfit flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
              <span>Financial Statements</span>
            </h4>
            
            {/* Statements Tab Switcher */}
            <div className="bg-gray-950/80 p-0.5 rounded-lg border border-gray-850 flex text-[10px] font-bold uppercase tracking-widest">
              <button 
                onClick={() => setActiveTab("balance")}
                className={`px-3 py-1 rounded-md transition-all ${activeTab === "balance" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"}`}
              >
                Balance Sheet
              </button>
              <button 
                onClick={() => setActiveTab("cashflow")}
                className={`px-3 py-1 rounded-md transition-all ${activeTab === "cashflow" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"}`}
              >
                Cash Flow
              </button>
              <button 
                onClick={() => setActiveTab("historical")}
                className={`px-3 py-1 rounded-md transition-all ${activeTab === "historical" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"}`}
              >
                Yearly Growth
              </button>
            </div>
          </div>

          {/* Balance Sheet Table */}
          {activeTab === "balance" && (
            <div className="space-y-4">
              <table className="w-full text-left text-xs border-collapse">
                <tbody>
                  <tr className="border-b border-gray-850">
                    <td className="py-3 text-gray-400 font-medium">Total Enterprise Assets</td>
                    <td className="py-3 text-right text-white font-semibold font-mono">{formatNumber(data.total_assets)}</td>
                  </tr>
                  <tr className="border-b border-gray-850">
                    <td className="py-3 text-gray-400 font-medium">Total Enterprise Liabilities</td>
                    <td className="py-3 text-right text-white font-semibold font-mono">{formatNumber(data.total_liabilities)}</td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="py-3 text-gray-400 font-semibold">Shareholders Equity Net Worth</td>
                    <td className="py-3 text-right text-indigo-400 font-bold font-mono">{formatNumber(data.equity)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-gray-400 font-medium">Working Capital Current Ratio</td>
                    <td className="py-3 text-right text-white font-semibold font-mono">{data.current_ratio ? data.current_ratio.toFixed(2) : "1.80"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Cash Flow Table */}
          {activeTab === "cashflow" && (
            <div className="space-y-4">
              <table className="w-full text-left text-xs border-collapse">
                <tbody>
                  <tr className="border-b border-gray-850">
                    <td className="py-3 text-gray-400 font-medium">Cash flow from Operating Activities</td>
                    <td className="py-3 text-right text-white font-semibold font-mono">{formatNumber(data.operating_cash_flow)}</td>
                  </tr>
                  <tr className="border-b border-gray-850">
                    <td className="py-3 text-gray-400 font-medium">Capital Expenditure (CapEx)</td>
                    <td className="py-3 text-right text-white font-semibold font-mono">{formatNumber(data.capital_expenditures)}</td>
                  </tr>
                  <tr className="border-b border-gray-850">
                    <td className="py-3 text-gray-400 font-semibold">Free Cash Flow (FCF)</td>
                    <td className="py-3 text-right text-emerald-400 font-bold font-mono">{formatNumber(data.free_cash_flow)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Historical Trends Bars Layout */}
          {activeTab === "historical" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {data.financials_history?.map((h) => (
                  <div key={h.year} className="bg-gray-950/40 p-4 rounded-xl border border-gray-900 flex flex-col justify-between min-h-[120px]">
                    <div className="text-xs font-bold text-gray-500">{h.year} Fiscal Year</div>
                    <div className="space-y-2 mt-2">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-400">Revenue:</span>
                        <span className="text-white font-semibold">{formatNumber(h.revenue)}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-400">Net Profit:</span>
                        <span className="text-indigo-400 font-semibold">{formatNumber(h.net_profit)}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-400">EPS:</span>
                        <span className="text-emerald-400 font-semibold">{isIndianSymbol(symbol) ? "₹" : "$"}{h.eps.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Growth Insights */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-1 space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-white font-outfit pb-3 border-b border-gray-850 flex items-center gap-2">
              <Compass className="w-5 h-5 text-indigo-400" />
              <span>Financial Health Insights</span>
            </h4>
            
            <ul className="space-y-3 mt-4">
              {data.insights?.map((insight, i) => (
                <li key={i} className="flex gap-2 text-xs text-gray-300 items-start">
                  <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <span>{insight}</span>
                </li>
              ))}
              {(!data.insights || data.insights.length === 0) && (
                <li className="flex gap-2 text-xs text-gray-500 items-start italic">
                  No automated insights compiled for this ticker.
                </li>
              )}
            </ul>
          </div>

          <div className="bg-indigo-650/5 border border-indigo-500/10 p-3.5 rounded-xl flex items-start gap-2.5 text-[10px] text-indigo-400 mt-6">
            <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
            <span>Advisory: Fundamentals represent trailing indicators. Cross-reference indicators against charts for signal confirmation.</span>
          </div>
        </div>

      </div>

    </div>
  );
};

// Fallback Icon mapping helper (since AlertTriangle wasn't imported initially)
const AlertTriangle = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
);

export default Fundamentals;
