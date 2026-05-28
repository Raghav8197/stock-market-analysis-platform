import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ChartContainer from "./components/ChartContainer";
import Screener from "./components/Screener";
import MutualFunds from "./components/MutualFunds";
import AISignals from "./components/AISignals";
import Alerts from "./components/Alerts";
import AuthModal from "./components/AuthModal";

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [symbol, setSymbol] = useState("AAPL"); // Default symbol
  const [authOpen, setAuthOpen] = useState(false);

  const selectStockAndNavigate = (sym) => {
    setSymbol(sym);
    setActiveTab("charts");
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard 
            onSelectStock={selectStockAndNavigate} 
            onOpenAuth={() => setAuthOpen(true)} 
          />
        );
      case "charts":
        return (
          <ChartContainer 
            symbol={symbol} 
            setSymbol={setSymbol} 
          />
        );
      case "screener":
        return (
          <Screener 
            onSelectStock={selectStockAndNavigate} 
          />
        );
      case "funds":
        return (
          <MutualFunds />
        );
      case "ai":
        return (
          <AISignals 
            symbol={symbol} 
          />
        );
      case "alerts":
        return (
          <Alerts />
        );
      default:
        return (
          <div className="text-center py-10 text-gray-500">View not found.</div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-darkBg text-gray-100 overflow-hidden">
      
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenAuth={() => setAuthOpen(true)} 
      />

      {/* Main Viewport panel */}
      <main className="flex-1 p-6 overflow-hidden flex flex-col">
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
