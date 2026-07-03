import asyncio
import time
import aiohttp
import yfinance as yf

# Pluggable broker / exchange data access layer

async def fetch_ohlcv_yfinance(symbol: str, interval: str, limit: int = 200) -> list[dict]:
    """
    Fetch historical candles from Yahoo Finance natively.
    """
    # Map timeframe intervals to yfinance formats
    yf_interval_map = {
        "1m": "1m",
        "5m": "5m",
        "15m": "15m",
        "1h": "1h",
        "4h": "1h", # Fallback as yfinance doesn't natively support 4h
        "1d": "1d"
    }
    
    yf_interval = yf_interval_map.get(interval, "15m")
    
    # Select appropriate period based on interval
    if yf_interval == "1m":
        period = "5d"
    elif yf_interval in ["5m", "15m"]:
        period = "1mo"
    elif yf_interval == "1h":
        period = "3mo"
    else:
        period = "1y"

    try:
        # Fetch synchronously in a separate thread pool to prevent blocking the async loop
        loop = asyncio.get_event_loop()
        ticker = yf.Ticker(symbol)
        df = await loop.run_in_executor(
            None, 
            lambda: ticker.history(period=period, interval=yf_interval)
        )
        
        if df.empty:
            return []
            
        # Select latest entries up to limit
        df = df.tail(limit)
        
        candles = []
        for timestamp, row in df.iterrows():
            candles.append({
                "time": int(timestamp.timestamp()),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": float(row["Volume"])
            })
        return candles
    except Exception as e:
        print(f"Error fetching from yfinance ({symbol}): {e}")
        return []

async def fetch_ohlcv_hyperliquid(symbol: str, interval: str, limit: int = 200) -> list[dict]:
    """
    Fetch historical candles from Hyperliquid REST API.
    """
    # Map timeframe intervals
    interval_map = {
        "1m": "1m",
        "5m": "5m",
        "15m": "15m",
        "1h": "1h",
        "4h": "4h",
        "1d": "1d"
    }
    
    hl_interval = interval_map.get(interval, "15m")
    interval_secs = { "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400, "1d": 86400 }.get(interval, 900)
    
    end_ms = int(time.time() * 1000)
    start_ms = end_ms - (limit * interval_secs * 1000)

    url = "https://api.hyperliquid.xyz/info"
    payload = {
        "type": "candleSnapshot",
        "req": {
            "coin": symbol,
            "interval": hl_interval,
            "startTime": start_ms,
            "endTime": end_ms
        }
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload) as response:
                if response.status != 200:
                    return []
                data = await response.json()
                
                # Format: [{"t": ms, "o": str, "h": str, "l": str, "c": str, "v": str}]
                candles = []
                for c in data:
                    candles.append({
                        "time": int(c["t"] / 1000),
                        "open": float(c["o"]),
                        "high": float(c["h"]),
                        "low": float(c["l"]),
                        "close": float(c["c"]),
                        "volume": float(c["v"])
                    })
                # Sort chronologically
                candles.sort(key=lambda x: x["time"])
                return candles
    except Exception as e:
        print(f"Error fetching from Hyperliquid ({symbol}): {e}")
        return []

async def fetch_ohlcv_binance(symbol: str, interval: str, limit: int = 200) -> list[dict]:
    """
    Fetch historical candles from Binance Public Spot API.
    """
    bin_interval = interval
    url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval={bin_interval}&limit={limit}"

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status != 200:
                    return []
                data = await response.json()
                
                candles = []
                for k in data:
                    candles.append({
                        "time": int(k[0] / 1000),
                        "open": float(k[1]),
                        "high": float(k[2]),
                        "low": float(k[3]),
                        "close": float(k[4]),
                        "volume": float(k[5])
                    })
                return candles
    except Exception as e:
        print(f"Error fetching from Binance ({symbol}): {e}")
        return []

async def fetch_ohlcv_alpaca(symbol: str, interval: str, limit: int = 200) -> list[dict]:
    """
    Alpaca Markets stub.
    Requires: ALPACA_API_KEY and ALPACA_SECRET_KEY environment variables.
    To connect to real Alpaca feed:
    1. Sign up on alpaca.markets and generate credentials.
    2. Set them in your environment / settings panel.
    3. Install: pip install alpaca-py
    """
    print(f"[ALPACA STUB] Mock fetching {symbol} - credentials required for live queries.")
    # Return placeholder / empty list
    return []

async def fetch_ohlcv_polygon(symbol: str, interval: str, limit: int = 200) -> list[dict]:
    """
    Polygon.io stub.
    Requires: POLYGON_API_KEY environment variable.
    To connect to real Polygon feed:
    1. Sign up on polygon.io and obtain an API key.
    2. Run: pip install polygon-api-client
    """
    print(f"[POLYGON STUB] Mock fetching {symbol} - API key required.")
    return []


# Unified routing table for multiple data source handlers
DATA_SOURCES = {
    "yfinance": fetch_ohlcv_yfinance,
    "hyperliquid": fetch_ohlcv_hyperliquid,
    "binance": fetch_ohlcv_binance,
    "alpaca": fetch_ohlcv_alpaca,
    "polygon": fetch_ohlcv_polygon
}

async def fetch_ohlcv(source: str, symbol: str, interval: str, limit: int = 200) -> list[dict]:
    """
    Unified entrypoint to fetch OHLCV from any supported broker.
    """
    handler = DATA_SOURCES.get(source)
    if not handler:
        raise ValueError(f"Unsupported data source provider: {source}")
    return await handler(symbol, interval, limit)
