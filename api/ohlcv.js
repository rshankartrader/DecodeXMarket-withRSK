export default async function handler(req, res) {
  const { source = "yfinance", symbol, interval = "1d", limit = "365" } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: "Missing required 'symbol' parameter" });
  }
  if (source !== "yfinance") {
    return res.status(400).json({ error: `Unsupported source: ${source}` });
  }

  try {
    const days = parseInt(limit, 10) || 365;
    const range = days <= 30 ? "1mo"
      : days <= 90 ? "3mo"
      : days <= 180 ? "6mo"
      : days <= 365 ? "1y"
      : "2y";

    const yfUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;

    const yfRes = await fetch(yfUrl, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    if (!yfRes.ok) {
      return res.status(yfRes.status).json({ error: `Yahoo Finance returned ${yfRes.status}` });
    }

    const yfData = await yfRes.json();
    const result = yfData?.chart?.result?.[0];
    if (!result) {
      return res.status(502).json({ error: "No chart data returned from Yahoo Finance" });
    }

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const { high = [], low = [], close = [], open = [], volume = [] } = quote;

    // Round to 1 decimal place; keep null as null instead of turning it into NaN
    const round1 = (n) => (n == null ? null : Math.round(n * 10) / 10);
    
    const candles = timestamps
      .map((time, i) => ({
        time, // unix seconds — matches `new Date(candle.time * 1000)` in the component
        open: open[i],
        high: high[i],
        low: low[i],
        close: close[i],
        volume: volume[i],
      }))
      .filter(c => c.high != null && c.low != null && c.close != null);

    return res.status(200).json({ symbol, interval, candles });
  } catch (err) {
    console.error("[/api/ohlcv] Error fetching Yahoo Finance data:", err);
    return res.status(500).json({ error: "Failed to fetch OHLCV data" });
  }
}
