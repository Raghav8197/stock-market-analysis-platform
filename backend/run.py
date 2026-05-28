import uvicorn
import os

if __name__ == "__main__":
    print("Starting Stock Market Analysis Backend Server...")
    print("URL: http://127.0.0.1:8000")
    print("Swagger Docs: http://127.0.0.1:8000/docs")
    
    # Run uvicorn server
    uvicorn.run(
        "app.main:app", 
        host="127.0.0.1", 
        port=8000, 
        reload=True
    )
