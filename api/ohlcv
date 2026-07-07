// api/ohlcv.js
// Vercel Serverless Function
// Fetches real historical OHLCV data from Yahoo Finance's public chart API
// Usage: /api/ohlcv?symbol=^NSEI&interval=1d&limit=365

export default async function handler(req, res) {
  const { symbol, interval = "1d", limit = "365" } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: "Missing required 'symbol' query parameter." });
  }

  try {
    const range = mapLimitToRange(parseInt(limit, 10));
    const yahooInterval = mapInterval(interval);

    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?interval=${yahooInterval}&range=${range}`;

    const yahooRes = await fetch(yahooUrl, {
      headers: {
        // Yahoo blocks requests with no User-Agent
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
    });

    if (!yahooRes.ok) {
      const text = await yahooRes.text().catch(() => "");
      return res.status(yahooRes.status).json({
        error: `Yahoo Finance returned status ${yahooRes.status}`,
        detail: text.slice(0, 300),
      });
    }

    const data = await yahooRes.json();

    const result = data?.chart?.result?.[0];
    if (!result) {
      const yahooError = data?.chart?.error?.description || "No chart data returned.";
      return res.status(404).json({ error: yahooError });
    }

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const { open = [], high = [], low = [], close = [], volume = [] } = quote;

    const candles = timestamps
      .map((time, i) => ({
        time,
        open: open[i],
        high: high[i],
        low: low[i],
        close: close[i],
        volume: volume[i],
      }))
      // Yahoo sometimes includes null rows for non-trading periods; drop them
      .filter(
        (c) =>
          c.open !== null &&
          c.high !== null &&
          c.low !== null &&
          c.close !== null &&
          typeof c.open === "number"
      );

    return res.status(200).json({
      symbol,
      candles,
      source: "yahoo-finance",
      count: candles.length,
    });
  } catch (err) {
    console.error("[api/ohlcv] Error fetching Yahoo Finance data:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch OHLCV data." });
  }
}

function mapInterval(interval) {
  const allowed = ["1m", "5m", "15m", "1h", "1d", "1wk", "1mo"];
  return allowed.includes(interval) ? interval : "1d";
}

function mapLimitToRange(limit) {
  if (!limit || isNaN(limit)) return "1y";
  if (limit <= 30) return "1mo";
  if (limit <= 90) return "3mo";
  if (limit <= 180) return "6mo";
  if (limit <= 365) return "1y";
  if (limit <= 730) return "2y";
  return "5y";
}
