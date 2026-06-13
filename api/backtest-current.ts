import axios from "axios";

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(455).json({ error: "Method not allowed. Use GET." });
  }

  const webAppUrl = "https://script.google.com/macros/s/AKfycbzRd-z3NoEA0BCqhvhJZf3m1TaLA0BjcrfqnRhI1m0ANrQRZndkvAU_MZEk4OMeob3P/exec";
  
  try {
    const response = await axios.get(webAppUrl, {
      maxRedirects: 5,
      validateStatus: (status) => status < 500,
    });
    
    if (response.status >= 400) {
      return res.status(response.status).json({ error: `GAS Error: ${response.statusText}` });
    }
    
    res.status(200).json(response.data);
  } catch (error) {
    console.error("[Proxy] Current Data Error:", error);
    res.status(500).json({ error: "Failed to fetch current sheet data" });
  }
}
