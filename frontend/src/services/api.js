import axios from "axios";

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // Local development loopback
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `http://${hostname}:8000`;
    }
    // Local LAN testing (e.g. 192.168.x.x, 10.x.x.x)
    if (hostname.startsWith("192.168.") || hostname.startsWith("10.") || hostname.startsWith("172.")) {
      return `http://${hostname}:8000`;
    }
  }
  // Production fallback (e.g. Vercel deployment)
  return "https://stock-market-analysis-platform.onrender.com";
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor to add access token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
