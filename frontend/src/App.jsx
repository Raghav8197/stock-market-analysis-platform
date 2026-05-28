import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ChartContainer from "./components/ChartContainer";
import Screener from "./components/Screener";
import MutualFunds from "./components/MutualFunds";
import AISignals from "./components/AISignals";
import Alerts from "./components/Alerts";
import AuthModal from "./components/AuthModal";
import IntradayMovers from "./components/IntradayMovers";
import {
  DashboardSkeleton,
  ScreenerSkeleton,
  AISignalsSkeleton,
} from "./components/Skeleton";
import api from "./services/api";
import { Activity } from "lucide-react";

// ── Backend wake-up splash shown while Render cold-starts ────────────────────
const WakeUpSplash = ({ dots }) => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0F19]">
    {/* Animated logo ring */}
    <div className="relative mb-8">
      <div className="w-20 h-20 rounded-full border-2 border-indigo-500/20 flex items-center justify-center">
        <div className="w-20 h-20 rounded-full border-t-2 border-indigo-500 animate-spin absolute inset-0" />
        <Activity className="w-8 h-8 text-indigo-400" />
      </div>
    </div>

    <h1 className="text-2xl font-bold text-white font-outfit mb-2">
      Stock Market Analytics
    </h1>
    <p className="text-sm text-gray-400 mb-6">Connecting to live data servers{dots}</p>

    {/* Progress bar */}
    <div className="w-64 h-1 bg-gray-800 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 rounded-full"
        style={{ animation: "wake-progress 12s ease-out forwards" }}
      />
    </div>

    <p className="text-[11px] text-gray-600 mt-4">
      Free tier servers wake up in ~15 seconds
    </p>

    <style>{`
      @keyframes wake-progress {
        0%   { width: 0% }
        60%  { width: 75% }
        90%  { width: 92% }
        100% { width: 97% }
      }
    `}</style>
  </div>
);

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [symbol, setSymbol] = useState("AAPL");
  const [authOpen, setAuthOpen] = useState(false);

  // Backend health state
  const [backendReady, setBackendReady] = useState(false);
  const [tabReady, setTabReady] = useState({}); // tracks which tabs have loaded once
  const [dots, setDots] = useState("...");

  // Animated dots for splash screen
  useEffect(() => {
    if (backendReady) return;
    const iv = setInterval(() => {
      setDots(d => d.length >= 3 ? "" : d + ".");
    }, 500);
    return () => clearInterval(iv);
  }, [backendReady]);

  // Ping the backend health endpoint on mount — wakes up Render free tier
  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      try {
        await api.get("/api/health", { timeout: 60000 });
        if (!cancelled) setBackendReady(true);
      } catch {
        // Even on error, show the app (backend may still be starting)
        if (!cancelled) setBackendReady(true);
      }
    };
    ping();
    return () => { cancelled = true; };
  }, []);

  // Mark tab as visited so we don't show skeleton again on re-visit
  useEffect(() => {
    if (backendReady) {
      setTabReady(prev => ({ ...prev, [activeTab]: true }));
    }
  }, [activeTab, backendReady]);

  const selectStockAndNavigate = (sym) => {
    setSymbol(sym);
    setActiveTab("charts");
  };

  const renderTabContent = () => {
    const isFirstLoad = !tabReady[activeTab];

    switch (activeTab) {
      case "dashboard":
        return isFirstLoad
          ? <DashboardSkeleton />
          : <Dashboard onSelectStock={selectStockAndNavigate} onOpenAuth={() => setAuthOpen(true)} />;

      case "charts":
        return (
          <ChartContainer symbol={symbol} setSymbol={setSymbol} />
        );

      case "screener":
        return isFirstLoad
          ? <ScreenerSkeleton />
          : <Screener onSelectStock={selectStockAndNavigate} />;

      case "movers":
        return isFirstLoad
          ? <ScreenerSkeleton />
          : <IntradayMovers onSelectStock={selectStockAndNavigate} />;

      case "funds":
        // MutualFunds has its own internal skeleton, skip outer one
        return <MutualFunds />;

      case "ai":
        return isFirstLoad
          ? <AISignalsSkeleton />
          : <AISignals symbol={symbol} />;

      case "alerts":
        return <Alerts />;

      default:
        return <div className="text-center py-10 text-gray-500">View not found.</div>;
    }
  };

  if (!backendReady) {
    return <WakeUpSplash dots={dots} />;
  }

  return (
    <div className="flex h-screen bg-darkBg text-gray-100 overflow-hidden">

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setAuthOpen(true)}
      />

      {/* Main Viewport panel — pb-20 on mobile leaves room for bottom nav */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto overflow-x-hidden flex flex-col pb-20 md:pb-6">
        {renderTabContent()}
      </main>

      {/* Auth Modal overlay portal */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
      />

    </div>
  );
}

export default App;
