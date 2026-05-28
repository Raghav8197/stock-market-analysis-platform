import uvicorn
import os

if __name__ == "__main__":
    print("Starting Stock Market Analysis Backend Server...")
    print("Local URL: http://127.0.0.1:8000")
    print("Swagger Docs: http://127.0.0.1:8000/docs")
    print("Listening on all network interfaces (0.0.0.0) for local network/mobile device testing.")
    
    # Run uvicorn server
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True
    )
