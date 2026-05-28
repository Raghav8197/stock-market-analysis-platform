import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { LiveDataProvider } from "./context/LiveDataContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <LiveDataProvider>
        <App />
      </LiveDataProvider>
    </AuthProvider>
  </React.StrictMode>
);
