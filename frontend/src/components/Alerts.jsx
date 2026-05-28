import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
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
  Bell, 
  Plus, 
  Trash2, 
  Activity, 
  CheckCircle, 
  Lock, 
  RefreshCw,
  AlertCircle,
  Loader2
} from "lucide-react";

const Alerts = () => {
  const { user } = useAuth();
  
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  
  // Form states
  const [symbol, setSymbol] = useState("");
  const [alertType, setAlertType] = useState("PRICE_ABOVE"); // PRICE_ABOVE, PRICE_BELOW, PATTERN_DETECTED
  const [targetValue, setTargetValue] = useState("");
  const [targetPattern, setTargetPattern] = useState("doji");
  
  // Triggered alert notification state
  const [triggeredAlerts, setTriggeredAlerts] = useState([]);

  const fetchAlerts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.get("/api/alerts/list");
      setAlerts(res.data);
    } catch (err) {
      console.error("Error fetching alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [user]);

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    if (!symbol) return;
    
    const sym = symbol.trim().toUpperCase();
    const payload = {
      symbol: sym,
      alert_type: alertType,
      target_value: alertType !== "PATTERN_DETECTED" ? parseFloat(targetValue) : null,
      target_pattern: alertType === "PATTERN_DETECTED" ? targetPattern : null
    };

    try {
      const res = await api.post("/api/alerts/create", payload);
      setAlerts(prev => [res.data, ...prev]);
      setSymbol("");
      setTargetValue("");
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to create alert.");
    }
  };

  const handleRemoveAlert = async (id) => {
    try {
      await api.delete(`/api/alerts/remove/${id}`);
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckAlerts = async () => {
    if (checking) return;
    setChecking(true);
    try {
      // Hits check endpoint which matches active alert parameters against current live ticker stats
      const res = await api.post("/api/alerts/check");
      if (res.data && res.data.length > 0) {
        setTriggeredAlerts(res.data);
        // Refresh alert list to show triggered status updates
        fetchAlerts();
      } else {
        alert("Alert scans complete. No conditions triggered at this tick.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChecking(false);
    }
  };

  const activeAlerts = alerts.filter(a => !a.is_triggered);
  const triggeredLogs = alerts.filter(a => a.is_triggered);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-4">
        <div>
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-outfit">Notification Hub</span>
          <h2 className="text-2xl font-bold text-white font-outfit mt-0.5">Real-Time Alerts</h2>
        </div>
        {user && (
          <button
            onClick={handleCheckAlerts}
            disabled={checking}
            className="flex items-center gap-2 bg-indigo-650 hover:bg-indigo-650/80 disabled:bg-indigo-900/60 px-4 py-2 border border-indigo-500/20 text-indigo-400 font-bold uppercase tracking-wider text-xs rounded-xl transition-all"
          >
            {checking ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>Scan Alert States</span>
          </button>
        )}
      </div>

      {!user ? (
        <div className="glass-panel p-12 text-center rounded-2xl flex flex-col items-center justify-center">
          <Lock className="w-10 h-10 text-gray-650 mb-3" />
          <h3 className="font-bold text-white text-lg font-outfit">Enable Alerts Monitor</h3>
          <p className="text-xs text-gray-500 max-w-sm mt-1">Authenticate user credentials to set up custom price ceilings, floors, and technical pattern detectors.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Create Alert Form */}
          <div className="glass-panel p-6 rounded-2xl lg:col-span-1 h-fit">
            <h3 className="font-bold text-white text-base border-b border-gray-850 pb-3 mb-4 flex items-center gap-2">
              <Plus className="w-4.5 h-4.5 text-indigo-400" />
              <span>Configure Alert</span>
            </h3>

            <form onSubmit={handleCreateAlert} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Symbol</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AAPL, BTC, NIFTY"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full bg-gray-950/60 border border-gray-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors uppercase"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Trigger Type</label>
                <select
                  value={alertType}
                  onChange={(e) => setAlertType(e.target.value)}
                  className="w-full bg-gray-950/60 border border-gray-800 text-xs text-white rounded-xl py-3 px-4 focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="PRICE_ABOVE">Price Crosses Above</option>
                  <option value="PRICE_BELOW">Price Drops Below</option>
                  <option value="PATTERN_DETECTED">Pattern Formed</option>
                </select>
              </div>

              {alertType !== "PATTERN_DETECTED" ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Target Price Value</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Enter limit price..."
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="w-full bg-gray-950/60 border border-gray-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Trigger Pattern</label>
                  <select
                    value={targetPattern}
                    onChange={(e) => setTargetPattern(e.target.value)}
                    className="w-full bg-gray-950/60 border border-gray-800 text-xs text-white rounded-xl py-3 px-4 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="doji">Doji</option>
                    <option value="hammer">Hammer</option>
                    <option value="bullish_engulfing">Bullish Engulfing</option>
                    <option value="bearish_engulfing">Bearish Engulfing</option>
                    <option value="double_bottom">Double Bottom (W-Pattern)</option>
                    <option value="double_top">Double Top</option>
                    <option value="head_shoulders">Head and Shoulders</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-650 hover:bg-indigo-600 border border-indigo-500/20 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-colors glow-indigo"
              >
                Launch Alert
              </button>
            </form>
          </div>

          {/* Alerts Lists */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Triggered overlay notification banner */}
            {triggeredAlerts.length > 0 && (
              <div className="bg-rose-950/30 border border-rose-500/20 p-4 rounded-2xl flex flex-col gap-2 shadow-lg animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <AlertCircle className="w-5 h-5 text-rose-500" />
                  <span>Conditions Triggered!</span>
                </div>
                <div className="text-xs text-gray-300 space-y-1 mt-1">
                  {triggeredAlerts.map(ta => (
                    <div key={ta.id}>
                      Stock <span className="font-bold text-white">{ta.symbol}</span> satisfied {ta.alert_type.replace("_", " ")}{" "}
                      {ta.target_value ? `${isIndianSymbol(ta.symbol) ? "₹" : "$"}${ta.target_value.toLocaleString()}` : ta.target_pattern.toUpperCase()} limits!
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setTriggeredAlerts([])}
                  className="text-xs bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-bold uppercase tracking-wider py-1.5 px-3 rounded-lg border border-rose-500/15 w-fit mt-2"
                >
                  Clear Notifications
                </button>
              </div>
            )}

            {/* Active (Pending) Alerts */}
            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="font-bold text-white text-base border-b border-gray-850 pb-3 mb-4 flex items-center gap-2">
                <Bell className="w-4.5 h-4.5 text-indigo-400" />
                <span>Active Triggers ({activeAlerts.length})</span>
              </h3>

              {loading ? (
                <div className="text-center py-6 text-sm text-gray-500">Querying active alerts...</div>
              ) : activeAlerts.length === 0 ? (
                <div className="text-center py-10 text-xs text-gray-600">No active alerts configured. Use configuration form on left.</div>
              ) : (
                <div className="divide-y divide-gray-850">
                  {activeAlerts.map(a => (
                    <div key={a.id} className="py-3 flex items-center justify-between group">
                      <div>
                        <span className="font-bold text-white font-outfit text-sm tracking-wider">{a.symbol}</span>
                        <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5">
                          {a.alert_type.replace("_", " ")}: {a.target_value ? `${isIndianSymbol(a.symbol) ? "₹" : "$"}${a.target_value.toLocaleString()}` : a.target_pattern.toUpperCase()}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveAlert(a.id)}
                        className="text-gray-600 hover:text-rose-400 p-2 rounded-lg hover:bg-gray-900 transition-colors border border-transparent hover:border-gray-800"
                        title="Delete Alert"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Triggered Logs */}
            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="font-bold text-white text-base border-b border-gray-850 pb-3 mb-4 flex items-center gap-2">
                <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />
                <span>Triggered Logs ({triggeredLogs.length})</span>
              </h3>

              {triggeredLogs.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-600">No historically triggered alert entries.</div>
              ) : (
                <div className="divide-y divide-gray-850 max-h-[220px] overflow-y-auto pr-2">
                  {triggeredLogs.map(a => (
                    <div key={a.id} className="py-2.5 flex items-center justify-between text-xs text-gray-400">
                      <div>
                        <span className="font-semibold text-gray-200">{a.symbol}</span> - {a.alert_type.replace("_", " ")}: {a.target_value ? `${isIndianSymbol(a.symbol) ? "₹" : "$"}${a.target_value.toLocaleString()}` : a.target_pattern.toUpperCase()}
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-950/20 text-emerald-400 border border-emerald-500/10 px-2 py-0.5 rounded">
                        Satisfied
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Alerts;
