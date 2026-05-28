import React, { createContext, useState, useEffect, useContext, useRef } from "react";

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
      ws.current.close();
    }

    const socketUrl = "ws://127.0.0.1:8000/ws/live";
    console.log("Connecting to WebSocket:", socketUrl);
    ws.current = new WebSocket(socketUrl);

    ws.current.onopen = () => {
      console.log("WebSocket connected.");
      setConnected(true);
      reconnectAttempts.current = 0;
      
      // Resend current subscription scope on connection open
      if (subscriptions.current.size > 0) {
        ws.current.send(JSON.stringify({
          action: "set",
          symbols: Array.from(subscriptions.current)
        }));
      }
    };

    ws.current.onmessage = (event) => {
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

    ws.current.onclose = () => {
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

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      ws.current.close();
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

  const subscribeSymbols = (symbols) => {
    const list = Array.isArray(symbols) ? symbols : [symbols];
    const upperList = list.map(s => s.toUpperCase());
    
    upperList.forEach(s => subscriptions.current.add(s));
    
    if (connected && ws.current) {
      ws.current.send(JSON.stringify({
        action: "subscribe",
        symbols: upperList
      }));
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
