import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Lock, Mail, Loader2, TrendingUp, Cpu, Activity, ArrowRight, ShieldCheck } from "lucide-react";

const LoginPage = () => {
  const { login, register, error, setError, forgotPassword, loginWithGoogle, verifyOtp, resetPassword } = useAuth();
  const [authMode, setAuthMode] = useState("login"); // "login" | "register" | "forgot"
  const [forgotStage, setForgotStage] = useState("request"); // "request" | "verify" | "reset"
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleModeChange = (mode) => {
    setAuthMode(mode);
    setForgotStage("request");
    setError(null);
    setSuccessMessage("");
    setEmail("");
    setPassword("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage("");
    
    let success = false;
    if (authMode === "register") {
      success = await register(email, password);
    } else if (authMode === "login") {
      success = await login(email, password);
    } else if (authMode === "forgot") {
      if (forgotStage === "request") {
        const detail = await forgotPassword(email);
        if (detail) {
          setSuccessMessage(detail);
          setForgotStage("verify");
          success = true;
        }
      } else if (forgotStage === "verify") {
        const detail = await verifyOtp(email, otp);
        if (detail) {
          setSuccessMessage(detail);
          setForgotStage("reset");
          success = true;
        }
      } else if (forgotStage === "reset") {
        if (newPassword !== confirmPassword) {
          setError("Passwords do not match.");
          setLoading(false);
          return;
        }
        const detail = await resetPassword(email, otp, newPassword);
        if (detail) {
          setSuccessMessage("Password reset successfully. Please sign in.");
          setAuthMode("login");
          setForgotStage("request");
          setEmail("");
          setPassword("");
          setOtp("");
          setNewPassword("");
          setConfirmPassword("");
          success = true;
        }
      }
    }
    
    setLoading(false);
  };

  useEffect(() => {
    /* global google */
    if (window.google && (authMode === "login" || authMode === "register")) {
      try {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
          callback: async (response) => {
            setLoading(true);
            setError(null);
            setSuccessMessage("");
            const success = await loginWithGoogle(response.credential);
            setLoading(false);
            if (!success) {
              // Error will be displayed via state in AuthContext
            }
          },
        });
        
        window.google.accounts.id.renderButton(
          document.getElementById("google-signin-btn"),
          { 
            theme: "filled_blue", 
            size: "large", 
            width: "320", 
            text: "signin_with",
            shape: "pill" 
          }
        );
      } catch (err) {
        console.error("Failed to initialize Google Sign-In:", err);
      }
    }
  }, [authMode, loginWithGoogle]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0F19] overflow-hidden">
      {/* ── Background Glow Orbs ──────────────────────────── */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      
      {/* ── Tech Grid Overlay ────────────────────────────── */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)] pointer-events-none" />

      <div className="relative w-full max-w-5xl flex flex-col md:flex-row items-stretch justify-center p-4 gap-6 md:gap-0">
        
        {/* Left Side: Brand Visual Panel (Hidden on small screens) */}
        <div className="hidden md:flex flex-col justify-between w-[45%] bg-gray-950/40 border border-r-0 border-gray-800/80 rounded-l-3xl p-10 glass-panel relative overflow-hidden">
          {/* Animated decorative lines */}
          <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none" />
          
          <div className="space-y-6 z-10">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-650 flex items-center justify-center glow-indigo">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white font-outfit tracking-wide leading-none">Antigravity</h1>
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Market IQ Platform</span>
              </div>
            </div>

            <div className="space-y-4 pt-12">
              <h2 className="text-3xl font-extrabold text-white font-outfit leading-tight">
                Unlock Real-time Quantitative Analytics
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                Experience high-performance stock charts, custom criteria filters, dynamic alerts, and mathematical pattern scanning. Driven by local machine learning predictors.
              </p>
            </div>
          </div>

          {/* Micro stats dashboard cards */}
          <div className="space-y-3 z-10 pt-8">
            <div className="bg-gray-900/30 border border-gray-850 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">Tick Engine</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold font-mono">124 ms latency</span>
            </div>

            <div className="bg-gray-900/30 border border-gray-850 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">AI Signal Stream</span>
              </div>
              <span className="text-[10px] text-indigo-400 font-bold font-mono">Active</span>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-[10px] text-gray-500 font-medium z-10">
            © 2026 Antigravity. Secure cryptographic session authorization enabled.
          </div>
        </div>

        {/* Right Side: Authentication Form Card */}
        <div className="w-full md:w-[55%] bg-darkCard/75 border border-gray-800 rounded-2xl md:rounded-l-none md:rounded-r-3xl p-8 md:p-12 shadow-2xl glass-panel flex flex-col justify-center animate-in fade-in slide-in-from-right-4 duration-300">
          
          <div className="mb-8">
            {/* Mobile Logo */}
            <div className="flex md:hidden items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-indigo-650 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-white font-outfit uppercase tracking-wider">Antigravity</span>
            </div>

            <h2 className="text-2xl font-bold font-outfit text-white">
              {authMode === "register" ? "Get Started" : authMode === "forgot" ? (forgotStage === "verify" ? "Verify Code" : forgotStage === "reset" ? "Reset Password" : "Password Recovery") : "Welcome Back"}
            </h2>
            <p className="text-xs text-gray-400 mt-1.5 font-normal leading-relaxed">
              {authMode === "register" 
                ? "Register a new profile to access active analytical components." 
                : authMode === "forgot"
                ? (forgotStage === "verify" 
                    ? "Check your backend console for the 6-digit OTP code and enter it below." 
                    : forgotStage === "reset" 
                    ? "Input your new secure password credentials." 
                    : "Enter your registered email address to request a verification OTP code.")
                : "Authorize your session credentials to access the quantitative dashboards."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-xs bg-rose-950/40 border border-rose-500/20 text-rose-400 rounded-xl animate-in fade-in duration-200">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="p-3 text-xs bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 rounded-xl animate-in fade-in duration-200">
                {successMessage}
              </div>
            )}

            {/* Email Field - Shown in login, register, and request/verify forgot stages */}
            {forgotStage !== "reset" && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    required
                    readOnly={authMode === "forgot" && forgotStage === "verify"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={`w-full bg-gray-950/60 border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors ${authMode === "forgot" && forgotStage === "verify" ? "opacity-60 cursor-not-allowed" : ""}`}
                  />
                </div>
              </div>
            )}

            {/* OTP Field - Shown only during recovery verify stage */}
            {authMode === "forgot" && forgotStage === "verify" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Verification Code (OTP)</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 6-digit OTP"
                    className="w-full bg-gray-950/60 border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors font-bold font-mono tracking-widest"
                  />
                </div>
              </div>
            )}

            {/* Password Field - Shown in login and register modes */}
            {authMode !== "forgot" && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Password</label>
                  {authMode === "login" && (
                    <button
                      type="button"
                      onClick={() => handleModeChange("forgot")}
                      className="text-[10.5px] text-indigo-450 hover:text-indigo-400 font-bold transition-colors cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-950/60 border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* New Password & Confirm New Password Fields - Shown in recovery reset stage */}
            {authMode === "forgot" && forgotStage === "reset" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-gray-950/60 border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-gray-950/60 border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-650 hover:bg-indigo-550 disabled:bg-indigo-800 text-white text-xs font-bold py-3.5 rounded-xl transition-all duration-200 glow-indigo mt-6 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <span>
                    {authMode === "register" 
                      ? "Create Account" 
                      : authMode === "forgot" 
                      ? (forgotStage === "verify" ? "Verify Code" : forgotStage === "reset" ? "Reset Password" : "Send OTP Code") 
                      : "Sign In to Platform"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {authMode !== "forgot" && (
              <>
                <div className="flex items-center gap-3 my-4">
                  <div className="h-[1px] bg-gray-850 flex-1" />
                  <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Or</span>
                  <div className="h-[1px] bg-gray-850 flex-1" />
                </div>

                <div className="flex justify-center w-full">
                  <div 
                    id="google-signin-btn" 
                    className="w-full max-w-[320px]"
                  />
                </div>
              </>
            )}

            <div className="text-center pt-4 border-t border-gray-850 mt-6">
              <button
                type="button"
                onClick={() => handleModeChange(authMode === "register" ? "login" : "register")}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors cursor-pointer"
              >
                {authMode === "forgot" ? "Back to Sign In" : (authMode === "register" ? "Already have an account? Sign In" : "Don't have an account? Register Here")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
