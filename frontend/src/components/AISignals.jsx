import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { 
  Cpu, 
  TrendingUp, 
  TrendingDown, 
  HelpCircle, 
  Calendar,
  AlertTriangle,
  Loader2
} from "lucide-react";

const AISignals = ({ symbol }) => {
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

  // Hyperparameters State
  const [estimators, setEstimators] = useState(50);
  const [maxDepth, setMaxDepth] = useState(5);
  const [horizon, setHorizon] = useState(3);

  const fetchAnalysis = async (customParams = {}) => {
    setLoading(true);
    try {
      const p = {
        n_estimators: customParams.estimators ?? estimators,
        max_depth: customParams.maxDepth ?? maxDepth,
        horizon: customParams.horizon ?? horizon
      };
      const response = await api.get(`/api/stocks/${symbol}/analysis`, { params: p });
      setAnalysis(response.data);
      // If user logged in, reload logs history
      if (user) {
        fetchLogs();
      }
    } catch (error) {
      console.error("AI Analysis failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const response = await api.get("/api/stocks/history/logs?limit=8");
      setLogs(response.data);
    } catch (error) {
       console.error("Failed to load logs:", error);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    // Reset to defaults and trigger default fetch on symbol/user change
    fetchAnalysis({ estimators: 50, maxDepth: 5, horizon: 3 });
    setEstimators(50);
    setMaxDepth(5);
    setHorizon(3);
  }, [symbol, user]);

  const getSignalColor = (sig) => {
    if (sig === "BUY") return "text-emerald-400 border-emerald-500/20 bg-emerald-950/20";
    if (sig === "SELL") return "text-rose-400 border-rose-500/20 bg-rose-950/20";
    return "text-amber-400 border-amber-500/20 bg-amber-950/20";
  };

  const getSignalGlow = (sig) => {
    if (sig === "BUY") return "shadow-emerald-500/10 border-emerald-500/20";
    if (sig === "SELL") return "shadow-rose-500/10 border-rose-500/20";
    return "shadow-amber-500/10 border-amber-500/20";
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-4">
        <div>
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-outfit">AI Advisory System</span>
          <h2 className="text-2xl font-bold text-white font-outfit mt-0.5">AI Insights: {symbol}</h2>
        </div>
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-850 px-3 py-1.5 rounded-xl text-xs text-gray-400">
          <Cpu className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span>Dynamic RF Regressor Model</span>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel p-16 rounded-2xl flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          <p className="text-sm text-gray-400 mt-4 font-semibold">Fitting Decision Trees & evaluating indicators...</p>
        </div>
      ) : analysis ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recommendation summary card */}
          <div className={`glass-panel p-6 rounded-2xl border flex flex-col justify-between shadow-lg ${getSignalGlow(analysis.signal)} lg:col-span-1`}>
            <div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Model Recommendation</span>
              
              {/* Signal Badge */}
              <div className={`mt-4 py-4 rounded-xl border text-center font-bold text-3xl font-outfit tracking-wider ${getSignalColor(analysis.signal)}`}>
                {analysis.signal}
              </div>

              {/* Confidence Gauge */}
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-400">
                  <span>Model Confidence</span>
                  <span>{analysis.confidence}%</span>
                </div>
                <div className="w-full bg-gray-900 h-2.5 rounded-full overflow-hidden border border-gray-850">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      analysis.signal === "BUY" ? "bg-emerald-500" : analysis.signal === "SELL" ? "bg-rose-500" : "bg-amber-500"
                    }`}
                    style={{ width: `${analysis.confidence}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Model runtime stats */}
            <div className="mt-8 pt-4 border-t border-gray-850 flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" />
                ML Fit status
              </span>
              <span className={`font-semibold ${analysis.ml_model_active ? "text-emerald-400" : "text-amber-500"}`}>
                {analysis.ml_model_active ? "RF Fitting Active" : "Technical Rule Fallback"}
              </span>
            </div>
          </div>

          {/* Hyperparameter Tuning Card */}
          <div className="glass-panel p-6 rounded-2xl border border-gray-900/50 flex flex-col justify-between lg:col-span-1">
            <div>
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block">Hyperparameter Tuning</span>
              <h3 className="text-base font-bold text-white font-outfit mt-1 pb-3 border-b border-gray-850">Configure RF Classifier</h3>
              
              <div className="mt-4 space-y-4">
                {/* Estimators slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400 font-semibold">Estimators (Trees):</span>
                    <span className="text-indigo-400 font-bold font-mono">{estimators}</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="150"
                    step="10"
                    value={estimators}
                    onChange={(e) => setEstimators(parseInt(e.target.value))}
                    className="w-full accent-indigo-500 bg-gray-900 rounded-lg cursor-pointer h-1.5"
                  />
                </div>

                {/* Max Depth slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400 font-semibold">Max Tree Depth:</span>
                    <span className="text-indigo-400 font-bold font-mono">{maxDepth}</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="12"
                    step="1"
                    value={maxDepth}
                    onChange={(e) => setMaxDepth(parseInt(e.target.value))}
                    className="w-full accent-indigo-500 bg-gray-900 rounded-lg cursor-pointer h-1.5"
                  />
                </div>

                {/* Horizon dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-semibold block">Lookahead Horizon:</label>
                  <select
                    value={horizon}
                    onChange={(e) => setHorizon(parseInt(e.target.value))}
                    className="w-full bg-gray-950/60 border border-gray-850 text-xs text-white rounded-xl py-2 px-3 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="1">1 Trading Day</option>
                    <option value="3">3 Trading Days</option>
                    <option value="5">5 Trading Days</option>
                    <option value="10">10 Trading Days</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={() => fetchAnalysis()}
              disabled={loading}
              className="mt-6 w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-xs font-bold uppercase tracking-wider py-3 rounded-xl transition-all cursor-pointer glow-indigo flex items-center justify-center gap-2"
            >
              <Cpu className="w-4 h-4 animate-pulse" />
              <span>Train & Predict</span>
            </button>
          </div>

          {/* Explanation factors card */}
          <div className="glass-panel p-6 rounded-2xl lg:col-span-1 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white font-outfit border-b border-gray-800 pb-3 mb-4">Signal Rationale</h3>
              <ul className="space-y-3">
                {analysis.reasons.map((reason, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                    <span className="mt-1.5 w-1.5 h-1.5 shrink-0 rounded-full bg-indigo-500" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Micro Indicator Dash */}
            <div className="grid grid-cols-3 gap-3 border-t border-gray-850 pt-4 mt-6">
              <div className="bg-gray-950/40 p-3 rounded-xl border border-gray-900/60 text-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">RSI Value</span>
                <span className="text-sm font-bold font-outfit text-white mt-1 block">{analysis.indicators.rsi.toFixed(1)}</span>
              </div>
              <div className="bg-gray-950/40 p-3 rounded-xl border border-gray-900/60 text-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">MACD Hist</span>
                <span className="text-sm font-bold font-outfit text-white mt-1 block">{analysis.indicators.macd_hist.toFixed(3)}</span>
              </div>
              <div className="bg-gray-950/40 p-3 rounded-xl border border-gray-900/60 text-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Last Price</span>
                <span className="text-sm font-bold font-outfit text-white mt-1 block">${analysis.indicators.close.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-12 text-center text-gray-500">Failed to render AI analysis.</div>
      )}

      {/* Dynamic Database History log tracker */}
      <div className="glass-panel p-6 rounded-2xl">
        <h3 className="text-lg font-bold text-white font-outfit border-b border-gray-800 pb-3 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-400" />
          <span>My AI Analysis Audit Log</span>
        </h3>

        {!user ? (
          <div className="text-center py-8 text-xs text-gray-600 bg-gray-950/20 border border-dashed border-gray-850 rounded-xl">
            Register or Sign In to record your dynamic AI transaction scans and build your trading model logs history.
          </div>
        ) : logsLoading ? (
          <div className="text-center py-8 text-sm text-gray-550">Querying transaction log...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-550">
            No audits recorded yet. Run scan analyses on watchlists to populate log transactions.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-800 uppercase tracking-widest text-gray-500 font-bold pb-2">
                  <th className="pb-2">Date / Time</th>
                  <th className="pb-2">Ticker</th>
                  <th className="pb-2">Trigger Signal</th>
                  <th className="pb-2 text-right">Confidence</th>
                  <th className="pb-2">Scan Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-800/5 transition-colors">
                    <td className="py-3 text-gray-400 font-mono">
                      {new Date(log.analysis_date).toLocaleString()}
                    </td>
                    <td className="py-3 font-bold text-white font-outfit">{log.symbol}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        log.signal === "BUY" ? "bg-emerald-950/20 text-emerald-400 border-emerald-500/10" :
                        log.signal === "SELL" ? "bg-rose-950/20 text-rose-400 border-rose-500/10" :
                        "bg-amber-950/20 text-amber-400 border-amber-500/10"
                      }`}>
                        {log.signal}
                      </span>
                    </td>
                    <td className="py-3 text-right font-bold text-gray-300 font-mono">{log.confidence}%</td>
                    <td className="py-3 text-gray-500 truncate max-w-xs" title={log.details?.reasons?.join(", ")}>
                      {log.details?.reasons?.join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AISignals;
