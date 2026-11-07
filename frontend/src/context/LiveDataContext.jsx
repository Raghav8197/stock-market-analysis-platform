import React, { createContext, useState, useEffect, useContext, useRef } from "react";
import api from "../services/api";

const LiveDataContext = createContext(null);

export const LiveDataProvider = ({ children }) => {
  const [prices, setPrices] = useState({});
  const [connected, setConnected] = useState(false);
  const ws = useRef(null);
  const subscriptions = useRef(new Set([
    "NIFTY", "BANKNIFTY", "GIFTNIFTY", "SENSEX", "NASDAQ", "SP500", "BTC", "ETH", "RELIANCE", "USDINR", "EURUSD"
  ]));
  const reconnectTimeout = useRef(null);
  const reconnectAttempts = useRef(0);

  const connect = () => {
    if (ws.current) {
      // Nullify handlers of the old socket so closing it doesn't trigger reconnection loops
      ws.current.onopen = null;
      ws.current.onmessage = null;
      ws.current.onclose = null;
      ws.current.onerror = null;
      ws.current.close();
    }

    // Determine the websocket URL dynamically
    const getSocketUrl = () => {
      if (import.meta.env.VITE_WS_URL) {
        return import.meta.env.VITE_WS_URL;
      }
      const apiUrl = import.meta.env.VITE_API_URL;
      if (apiUrl) {
        try {
          const url = new URL(apiUrl);
          const protocol = url.protocol === "https:" ? "wss:" : "ws:";
          return `${protocol}//${url.host}/ws/live`;
        } catch (e) {
          console.error("Invalid VITE_API_URL for WebSocket construction:", e);
        }
      }
      const hostname = window.location.hostname;
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${wsProtocol}//${hostname}:8000/ws/live`;
    };

    const socketUrl = getSocketUrl();
    console.log("Connecting to WebSocket:", socketUrl);
    const socket = new WebSocket(socketUrl);
    ws.current = socket;

    socket.onopen = () => {
      if (ws.current !== socket) return; // Only handle events from the active socket
      console.log("WebSocket connected.");
      setConnected(true);
      reconnectAttempts.current = 0;
      
      // Resend current subscription scope on connection open
      if (subscriptions.current.size > 0) {
        socket.send(JSON.stringify({
          action: "set",
          symbols: Array.from(subscriptions.current)
        }));
      }
    };

    socket.onmessage = (event) => {
      if (ws.current !== socket) return; // Only handle events from the active socket
      try {
        const message = JSON.parse(event.data);
        if (message.type === "prices") {
          setPrices((prevPrices) => ({
            ...prevPrices,
            ...message.data
          }));
        }
      } catch (err) {
        console.error("Failed to parse websocket message:", err);
      }
    };

    socket.onclose = () => {
      if (ws.current !== socket) return; // Only handle events from the active socket
      console.log("WebSocket disconnected.");
      setConnected(false);
      
      // Automatic backoff reconnection loop
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 15000);
      console.log(`Attempting reconnection in ${delay}ms...`);
      reconnectTimeout.current = setTimeout(() => {
        reconnectAttempts.current += 1;
        connect();
      }, delay);
    };

    socket.onerror = (error) => {
      if (ws.current !== socket) return; // Only handle events from the active socket
      console.error("WebSocket error:", error);
      socket.close();
    };
  };

  useEffect(() => {
    connect();
    return () => {
      if (ws.current) {
        ws.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, []);

  // Polling fallback when WebSocket is offline or on serverless hosting (Vercel)
  useEffect(() => {
    if (connected) return;

    const pollFallback = async () => {
      if (subscriptions.current.size === 0) return;
      const symbolsToPoll = Array.from(subscriptions.current).slice(0, 15);
      
      try {
        const results = await Promise.allSettled(
          symbolsToPoll.map(sym => api.get(`/api/stocks/${encodeURIComponent(sym)}/quote`))
        );
        const newPrices = {};
        results.forEach(res => {
          if (res.status === "fulfilled" && res.value?.data) {
            const d = res.value.data;
            newPrices[d.symbol] = {
              price: d.price,
              timestamp: new Date().toLocaleTimeString(),
              status: d.status
            };
            if (d.resolved_ticker && d.resolved_ticker !== d.symbol) {
              newPrices[d.resolved_ticker] = newPrices[d.symbol];
            }
          }
        });
        if (Object.keys(newPrices).length > 0) {
          setPrices(prev => ({ ...prev, ...newPrices }));
        }
      } catch (err) {
        // silent fallback
      }
    };

    pollFallback();
    const interval = setInterval(pollFallback, 2500);
    return () => clearInterval(interval);
  }, [connected]);

  const subscribeSymbols = (symbols) => {
    const list = Array.isArray(symbols) ? symbols : [symbols];
    const upperList = list.map(s => s.toUpperCase());
    
    upperList.forEach(s => subscriptions.current.add(s));
    
    if (connected && ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        action: "subscribe",
        symbols: upperList
      }));
    } else {
      // Immediate one-off quote fetch for fast response
      upperList.forEach(async (sym) => {
        try {
          const res = await api.get(`/api/stocks/${encodeURIComponent(sym)}/quote`);
          if (res.data) {
            setPrices(prev => ({
              ...prev,
              [res.data.symbol]: {
                price: res.data.price,
                timestamp: new Date().toLocaleTimeString(),
                status: res.data.status
              }
            }));
          }
        } catch (e) {}
      });
    }
  };

  const unsubscribeSymbols = (symbols) => {
    const list = Array.isArray(symbols) ? symbols : [symbols];
    const upperList = list.map(s => s.toUpperCase());
    
    upperList.forEach(s => subscriptions.current.delete(s));
    
    if (connected && ws.current) {
      ws.current.send(JSON.stringify({
        action: "unsubscribe",
        symbols: upperList
      }));
    }
  };

  return (
    <LiveDataContext.Provider value={{ prices, connected, subscribeSymbols, unsubscribeSymbols }}>
      {children}
    </LiveDataContext.Provider>
  );
};

export const useLiveData = () => useContext(LiveDataContext);
