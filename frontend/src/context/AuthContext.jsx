import React, { createContext, useState, useEffect, useContext } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Validate session on app launch
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      api.get("/api/auth/me")
        .then((response) => {
          setUser(response.data);
        })
        .catch(() => {
          localStorage.removeItem("token");
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await api.post("/api/auth/login", { email, password });
      const { access_token } = response.data;
      localStorage.setItem("token", access_token);
      
      // Fetch user profile
      const userResponse = await api.get("/api/auth/me");
      setUser(userResponse.data);
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to login. Please check credentials.");
      return false;
    }
  };

  const register = async (email, password) => {
    setError(null);
    try {
      await api.post("/api/auth/register", { email, password });
      // Automate login on successful registration
      return await login(email, password);
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed. Try again.");
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const forgotPassword = async (email) => {
    setError(null);
    try {
      const response = await api.post("/api/auth/forgot-password", { email });
      return response.data.detail || "Recovery email simulated successfully.";
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to request recovery. Try again.");
      return null;
    }
  };

  const verifyOtp = async (email, otp) => {
    setError(null);
    try {
      const response = await api.post("/api/auth/verify-otp", { email, otp });
      return response.data.detail || "OTP verified successfully.";
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid or expired OTP code.");
      return null;
    }
  };

  const resetPassword = async (email, otp, newPassword) => {
    setError(null);
    try {
      const response = await api.post("/api/auth/reset-password", { email, otp, new_password: newPassword });
      return response.data.detail || "Password reset completed.";
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to reset password. Try again.");
      return null;
    }
  };

  const loginWithGoogle = async (credentialToken) => {
    setError(null);
    try {
      const response = await api.post("/api/auth/google", { credential_token: credentialToken });
      const { access_token } = response.data;
      localStorage.setItem("token", access_token);
      
      // Fetch user profile
      const userResponse = await api.get("/api/auth/me");
      setUser(userResponse.data);
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || "Google login failed.");
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, setError, forgotPassword, loginWithGoogle, verifyOtp, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
