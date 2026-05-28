# Professional Stock Market Analysis Platform

A complete, end-to-end real-time stock market analysis application featuring technical indicator overlays, mathematical candlestick/chart pattern scanner calculations, a dynamic local machine learning predictive signal advisor, watchlists, alert crossing notifications, and real-time live price streaming.

---

## 🏗️ Architecture & Features

### 1. Backend Service (FastAPI + SQLite/PostgreSQL)
- **FastAPI Core**: Standard CORS configuration, Pydantic settings parsing, and SQLite/PostgreSQL declarative schemas.
- **WebSocket Price Streaming**: Real-time tick server streaming live data at `/ws/live` with dynamic subscription channels.
- **Pure-Python Analytics**: Vectorized formula implementations for RSI (14), MACD, SMA (20), EMA (50/200), and Bollinger Bands using Pandas/NumPy.
- **Pattern Scanning Engine**: Scans historical series to find Doji, Hammer, Bullish/Bearish Engulfing, Double Tops, Double Bottoms (W-Pattern), and Head & Shoulders formations.
- **Machine Learning Predictor**: Extracts features, labels future returns, fits a local **Random Forest Classifier** dynamically on ticker histories (60+ bars), and yields trading recommendations (BUY/SELL/HOLD) with confidence levels.
- **Alert Daemon**: Checks prices and pattern configurations against current tick statuses and triggers notifications.

### 2. Frontend Client (React + Vite + Tailwind CSS)
- **High-Fidelity Dashboard**: Slick dark-themed interface with blinking index cards showing real-time price updates.
- **Advanced Charts**: Implements TradingView's Lightweight Charts to render custom candles, moving averages, Bollinger Band bands, volumes, and synchronized RSI panes. Sets shapes and flags on candle indices when patterns trigger.
- **Stock Screener**: Scans stock lists against selected RSI, pattern, or volume breakout criteria.
- **AI Insights Panel**: Visualizes predicted direction probabilities and tracks historical triggers.

---

## 🚀 Setup & Execution Guide

### ⚡ Quick Start (Windows)
Double-click the [launch.bat](file:///c:/Users/ragha/OneDrive/Documents/projectantigravity/launch.bat) script in the root directory, or run the PowerShell script:
```powershell
.\launch.ps1
```
This will check for dependencies, open separate terminal windows for the backend and frontend, and run both dev servers.

---

### Prerequisites
- **Python 3.10+** (System verified Python 3.14.4 is installed)
- **Node.js 18+** (System verified Node.js v24.16.0 is installed)
- **Git** (System verified Git version 2.54.0 is installed)

---

### Step 1: Launch Backend Server

1. Open a terminal and navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Activate the virtual environment:
   - On Windows (PowerShell):
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - On Linux/macOS:
     ```bash
     source venv/bin/activate
     ```
3. Run the uvicorn development server:
   ```bash
   python run.py
   ```
4. Confirm server health:
   - API Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
   - Health check: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

---

### Step 2: Start Frontend Application

1. Open another terminal and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Launch the Vite development server (using cmd to bypass PowerShell execution restriction):
   ```bash
   cmd /c npm run dev
   ```
3. Open the browser local client:
   - URL: [http://localhost:5173](http://localhost:5173)

---

## 📡 Database & Cache Customization (.env)

By default, the platform runs with zero-friction fallbacks (local SQLite file `stocks.db` and in-memory caches). To connect to production services, create a `.env` file in the `backend/` folder:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/tradingdb
JWT_SECRET=your-secure-jwt-key
CORS_ORIGINS=http://localhost:5173
```
