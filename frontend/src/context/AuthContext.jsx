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
    setLoading(true);
    setError(null);
    try {
      const response = await api.post("/api/auth/login", { email, password });
      const { access_token } = response.data;
      localStorage.setItem("token", access_token);
      
      // Fetch user profile
      const userResponse = await api.get("/api/auth/me");
      setUser(userResponse.data);
      setLoading(false);
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to login. Please check credentials.");
      setLoading(false);
      return false;
    }
  };

  const register = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/auth/register", { email, password });
      // Automate login on successful registration
      return await login(email, password);
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed. Try again.");
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, setError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
