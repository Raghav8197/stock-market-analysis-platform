import React from "react";
import { useAuth } from "../context/AuthContext";
import { 
  TrendingUp, 
  BarChart2, 
  Filter, 
  Cpu, 
  Bell, 
  LogOut, 
  LogIn, 
  User,
  PieChart,
  Flame
} from "lucide-react";

const Sidebar = ({ activeTab, setActiveTab, onOpenAuth }) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: TrendingUp },
    { id: "charts",    label: "Charts",    icon: BarChart2 },
    { id: "screener",  label: "Screener",  icon: Filter },
    { id: "movers",    label: "Movers",    icon: Flame },
    { id: "funds",     label: "Funds",     icon: PieChart },
    { id: "ai",        label: "AI",        icon: Cpu },
    { id: "alerts",    label: "Alerts",    icon: Bell },
  ];

  return (
    <>
      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <aside className="hidden md:flex w-64 bg-darkCard border-r border-gray-800 flex-col h-screen select-none shrink-0">
        {/* Brand Logo */}
        <div className="p-6 border-b border-gray-800 flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg glow-indigo">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-lg tracking-wider text-white font-outfit">ANTIGRAVITY</h1>
            <span className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase">PRO TRADER</span>
          </div>
        </div>

        {/* Menu Options */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
                    : "text-gray-400 hover:bg-gray-800/40 hover:text-gray-200"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Auth Footer */}
        <div className="p-4 border-t border-gray-800">
          {user ? (
            <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="bg-indigo-600/20 p-2 rounded-lg">
                  <User className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">User Session</p>
                  <p className="text-xs text-white font-medium truncate" title={user.email}>{user.email}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="text-gray-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl text-sm font-semibold transition-all duration-200 glow-indigo"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </aside>

      {/* ── Mobile bottom navigation bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d1120]/95 backdrop-blur-xl border-t border-gray-800/80 flex items-center justify-around px-1 py-2 safe-area-pb">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-[48px] ${
                isActive
                  ? "text-indigo-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-all ${isActive ? "bg-indigo-600/20" : ""}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-bold tracking-wide uppercase">{item.label}</span>
            </button>
          );
        })}
        {/* Auth icon */}
        {user ? (
          <button
            onClick={logout}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-gray-500 hover:text-rose-400 transition-colors min-w-[48px]"
          >
            <div className="p-1.5 rounded-lg">
              <LogOut className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-bold tracking-wide uppercase">Logout</span>
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-indigo-400 min-w-[48px]"
          >
            <div className="p-1.5 rounded-lg bg-indigo-600/20">
              <LogIn className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-bold tracking-wide uppercase">Sign In</span>
          </button>
        )}
      </nav>
    </>
  );
};

export default Sidebar;
