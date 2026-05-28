import asyncio
import websockets
import json

async def test():
    uri = "ws://127.0.0.1:8000/ws/live"
    async with websockets.connect(uri) as websocket:
        print("Connected to websocket")
        
        # Send a set message for initial subscriptions
        sub_msg = {
            "action": "set",
            "symbols": ["NIFTY", "BANKNIFTY", "GIFTNIFTY", "SENSEX", "NASDAQ", "SP500", "BTC", "ETH", "USDINR", "EURUSD"]
        }
        await websocket.send(json.dumps(sub_msg))
        print("Sent subscription request")
        
        # Receive 2 messages
        for i in range(2):
            response = await websocket.recv()
            print(f"Message {i+1}:")
            print(json.dumps(json.loads(response), indent=2))
            print("-" * 50)

if __name__ == "__main__":
    asyncio.run(test())
