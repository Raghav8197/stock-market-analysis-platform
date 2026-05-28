import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from app.config import settings
from app.database import engine, Base
from app.routers import auth, stocks, alerts, funds
from app import data_fetcher

# Create database tables (SQLite fallback setup)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="A complete real-time stock market analysis platform using technical indicators, pattern recognition, and machine learning predictions.",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(stocks.router)
app.include_router(alerts.router)
app.include_router(funds.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "database": settings.DATABASE_URL.split("://")[0]  # returns sqlite or postgresql
    }

# Websocket endpoint for real-time price updates
@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    # Default watch symbol set
    subscribed_symbols = {"NIFTY", "BANKNIFTY", "AAPL", "TSLA", "BTC", "RELIANCE"}
    
    # Task to handle subscription adjustments sent from frontend
    async def listen_for_subscriptions():
        nonlocal subscribed_symbols
        try:
            while True:
                data = await websocket.receive_json()
                msg_type = data.get("action") # 'subscribe', 'unsubscribe', 'set'
                symbols = data.get("symbols", [])
                
                if not symbols:
                    continue
                    
                symbols_upper = [s.upper() for s in symbols]
                if msg_type == "subscribe":
                    subscribed_symbols.update(symbols_upper)
                elif msg_type == "unsubscribe":
                    subscribed_symbols.difference_update(symbols_upper)
                elif msg_type == "set":
                    subscribed_symbols = set(symbols_upper)
        except WebSocketDisconnect:
            pass
        except Exception as e:
            print(f"WS subscription message error: {e}")
            
    # Run reader task in the background
    reader_task = asyncio.create_task(listen_for_subscriptions())
    
    try:
        # Stream prices at 2-second intervals
        while True:
            price_data = {}
            for sym in list(subscribed_symbols):
                is_open, status_msg = data_fetcher.get_market_status(sym)
                price = data_fetcher.get_live_ticker_price(sym)
                price_data[sym] = {
                    "price": price,
                    "timestamp": datetime.now().strftime("%H:%M:%S"),
                    "status": status_msg
                }
                
            await websocket.send_json({
                "type": "prices",
                "data": price_data
            })
            await asyncio.sleep(2.0)
            
    except (WebSocketDisconnect, RuntimeError):
        pass
    except Exception as e:
        print(f"WebSocket streaming error: {e}")
    finally:
        # Ensure subscription task is cleaned up
        reader_task.cancel()
        try:
            await reader_task
        except asyncio.CancelledError:
            pass
