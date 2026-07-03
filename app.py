"""
================================================================================
          TRADEGRID LIVE TRADING CHART BACKEND (FLASK)
================================================================================

Setup and Execution Instructions:
---------------------------------
1. Install Python 3.10+ (if not already installed).
2. Install dependencies via pip:
   $ pip install -r requirements.txt
3. Start the Flask server:
   $ python app.py
4. Open the 'index.html' (or charting_terminal.html) file directly in your 
   browser (double click) or access it through your dev server.

How to add a new Broker/Source in 3 steps:
------------------------------------------
Step 1: Open `data_source.py` and define an asynchronous candle fetcher:
        async def fetch_ohlcv_mybroker(symbol: str, interval: str, limit: int = 200) -> list[dict]:
            # Fetch, parse, and return list in format: 
            # [{"time": unix_seconds, "open": float, "high": float, "low": float, "close": float, "volume": float}]

Step 2: Add it to the routing table mapping inside `data_source.py`:
        DATA_SOURCES = {
            ...
            "mybroker": fetch_ohlcv_mybroker
        }

Step 3: Update `charting_terminal.html` config preset and source dropdown:
        - Add 'mybroker' to CONFIG.presets along with its symbols list.
        - Add a corresponding <option value="mybroker">My Broker</option> 
          inside the "source-select" elements.

================================================================================
"""

import sys
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import asyncio

# Add current workspace path to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from data_source import fetch_ohlcv, CONFIG as DATA_CONFIG

app = Flask(__name__)
# Enable CORS globally across all origins to ensure seamless connections from file://
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Preset listing for NSE Stock Symbols
YFINANCE_PRESETS = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", 
    "BHARTIARTL.NS", "SBIN.NS", "HINDUNILVR.NS", "ITC.NS", "LT.NS", 
    "KOTAKBANK.NS", "AXISBANK.NS", "WIPRO.NS", "MARUTI.NS", "TITAN.NS", 
    "BAJFINANCE.NS", "SUNPHARMA.NS", "^NSEI", "^BSESN", "AAPL", 
    "MSFT", "NVDA", "TSLA"
]

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "TradeGrid Backend", "active_port": 5000})

@app.route("/api/symbols/yfinance", methods=["GET"])
def get_yfinance_symbols():
    """
    Returns the preset symbol listings for Yahoo / NSE.
    """
    return jsonify({"symbols": YFINANCE_PRESETS})

@app.route("/api/ohlcv", methods=["GET"])
def get_ohlcv():
    """
    Endpoint: GET /api/ohlcv?source=yfinance&symbol=RELIANCE.NS&interval=5m&limit=200
    Returns: {"candles": [{"time": unix, "open": f, "high": f, "low": f, "close": f, "volume": f}]}
    """
    source = request.args.get("source", "yfinance")
    symbol = request.args.get("symbol", "RELIANCE.NS")
    interval = request.args.get("interval", "5m")
    limit_str = request.args.get("limit", "200")

    try:
        limit = int(limit_str)
    except ValueError:
        limit = 200

    # Execute async task synchronously for Flask thread
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        candles = loop.run_until_complete(fetch_ohlcv(source, symbol, interval, limit))
        loop.close()
        
        return jsonify({"candles": candles})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Launch on port 5000, enable debug mode
    print("Launching TradeGrid Local Broker Server on http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=True)
