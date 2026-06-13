import axios from "axios";

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  const { start, end } = req.query;
  const webAppUrl = "https://script.google.com/macros/s/AKfycbzRd-z3NoEA0BCqhvhJZf3m1TaLA0BjcrfqnRhI1m0ANrQRZndkvAU_MZEk4OMeob3P/exec";
  const queryUrl = `${webAppUrl}?start=${start}&end=${end}`;

  console.log(`[Proxy] Fetching backtest data: ${queryUrl}`);

  try {
    const response = await axios.get(queryUrl, {
      maxRedirects: 5,
      timeout: 600000, // 10 minutes timeout for long backtests
      validateStatus: (status) => status < 500, // Handle 302, 404, etc.
    });
    
    console.log(`[Proxy] GAS Response Status: ${response.status}`);
    
    if (response.status >= 400) {
      console.error(`[Proxy] GAS Error Body:`, response.data);
      return res.status(response.status).json({ error: `Google Apps Script Error: ${response.statusText}` });
    }
    
    // If GAS returns HTML instead of JSON (happens if not deployed as web app correctly)
    if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
      console.error(`[Proxy] Received HTML instead of JSON. Check GAS deployment.`);
      return res.status(500).json({ error: "Received HTML from Google Script. Ensure it's deployed as a Web App with 'Anyone' access and returns JSON." });
    }

    console.log(`[Proxy] Data received successfully`);
    res.status(200).json(response.data);
  } catch (error) {
    console.error("[Proxy] Critical Error:", error);
    res.status(500).json({ error: `Internal Server Error during proxy: ${error instanceof Error ? error.message : 'Unknown error'}` });
  }
}
