import { GoogleGenAI } from "@google/genai";

// Helper for Astro AI local fallback responses when rate limits/quota are exceeded
function getLocalAstroFallback(query: string): string {
  const q = query.toLowerCase();
  const sections: string[] = [];
  
  if (q.includes("moon") || q.includes("lunar") || q.includes("tithi") || q.includes("amavasya")) {
    sections.push(`### 🌕 Celestial Lunar Analysis & Intraday Sentiment

The **Moon** represents the collective emotional state and high-frequency sentiment of the retail trading crowd. In astrology-guided market analysis, lunar coordinates correspond directly with intra-week volatility cycles:

1. **Intraday Pivots:** As the Moon crosses critical Gann 30-degree angles, expect sudden changes in market momentum. Fast, speculative waves are highly active today.
2. **Support & Resistance:** 
   * **Lunar Support:** Matches the 15° harmonic marker of the solar orbit.
   * **Lunar Resistance:** Aligns with the 45° angle, which historically acts as a temporary exhaustion point.
3. **Trading Wisdom:** Avoid chasing breakouts during void-of-course lunar periods. Wait for the alignment to complete before committing heavy capital.`);
  }
  
  if (q.includes("nifty") || q.includes("bank nifty") || q.includes("index") || q.includes("nifty 50")) {
    sections.push(`### 📉 Nifty 50 & Major Index Cycle Report

The **Nifty 50** and major Indian indices are governed by solar transits and Jupiter-Saturn cycles:

* **Solar Ingress Cycle:** A transition is approaching. Historically, solar ingress into new zodiac signs triggers a 3-5 day capital reallocation phase, leading to sector rotation.
* **Gann Price-Time Squares:** Currently, the price-time coordinates suggest major geometric support.
* **Key Volatility Window:** Watch the next 72 hours for high-volume tests of these structural zones. Breakouts above the 180-degree line will invalidate the bearish alignment.`);
  }
  
  if (q.includes("gold") || q.includes("xau") || q.includes("silver") || q.includes("metal")) {
    sections.push(`### 💰 Gold & Precious Metals: Gann & Astrological Cycles

**Gold (XAU/USD)** is the premier metal of the Sun. It thrives on solar alignments, Venus transits, and major celestial shifts:

1. **Sun-Venus Alignments:** When the Sun and Venus form supportive aspects (trines or sextiles), Gold often experiences steady capital inflows, functioning as a reliable store of wealth.
2. **Gann Solstice Pivots:** Our 2026 cycle calendar flags the upcoming seasonal solstice as a major price-time intersection. Such dates historically align with high-probability trend exhausts and sharp reversals.
3. **Safe-Haven Shifting:** Watch Neptune's transit through speculative degrees. Conflicting aspects here may trigger currency devaluations, amplifying the demand for physical gold.`);
  }
  
  if (q.includes("bitcoin") || q.includes("btc") || q.includes("crypto") || q.includes("ethereum") || q.includes("eth")) {
    sections.push(`### 🪙 Crypto & Bitcoin: Uranus-Neptune Speculative Wave

**Bitcoin** and high-beta digital assets operate on rapid speculative waves governed by **Uranus** (technology, disruption, sudden changes) and **Neptune** (idealism, speculation):

* **Uranus Transit:** Uranus's ongoing movement continues to reform decentralized finance frameworks. Expect sharp, unexpected news-driven movements.
* **Bitcoin Halving & 4-Year Cycle:** This cycle matches the Jupiter-Mars conjunction harmonics. We are currently in an underlying accumulation phase.
* **Flash Shakeout Warning:** Any temporary square or opposition involving Mars can cause short-term futures liquidations. Keep position sizes conservative.`);
  }

  if (sections.length > 0) {
    return sections.join("\n\n") + "\n\n*Note: For exact real-time prices, please verify with your live trading terminal. Astro-cycles indicate immediate momentum transitions rather than static price locks.*";
  }

  return `### 🌌 Celestial Cosmic Guidance & Market Outlook

Greetings, Trader. The celestial network is currently undergoing high cosmic activity. Here is your macro financial astrology outlook:

1. **Planetary Harmony:** The current alignments suggest a period of transition. Mercury is shifting short-term trading volumes, while Mars triggers intense commodity movements.
2. **Gann Wavefront:** We are currently entering a crucial geometric window. Price-time square alignments show strong potential for a trend change across major equities and forex pairs.
3. **Celestial Advice:** 
   * **Aegis Position:** Restrict speculative risk-taking until the current transit completes.
   * **Focus Sectors:** Energy, Gold, and Defense stocks are showing positive astrological alignments.

*Please feel free to ask specifically about Gold, Nifty 50, Bitcoin, or the Moon Cycle for customized celestial readings!*`;
}

export default async function handler(req: any, res: any) {
  // Allow CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages array in request body." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[Astro AI] GEMINI_API_KEY missing. Cannot proceed with Gemini query.");
    const lastMsg = messages[messages.length - 1]?.content || "";
    return res.status(200).json({ 
      reply: getLocalAstroFallback(lastMsg), 
      citations: [],
      isFallback: true,
      note: "Astro AI is running in offline mode. Configure GEMINI_API_KEY in Secrets to enable live Gemini integration."
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Ensure the chat history starts with a user message as required by the Gemini API
    let chatHistory = [...messages];
    while (chatHistory.length > 0 && chatHistory[0].role === "assistant") {
      chatHistory.shift();
    }

    if (chatHistory.length === 0) {
      return res.status(200).json({ reply: "Greetings, Trader. How can I assist you with market cycles or celestial paths today?" });
    }

    // Format messages safely for @google/genai generateContent structure
    const formattedContents = chatHistory.map((m: any) => ({
      role: m.role === "assistant" ? "model" : (m.role || "user"),
      parts: [{ text: m.content || m.text || "" }]
    }));

    const systemInstruction = `You are "Astro AI", an advanced, elite-level Financial Astrologer, Gann cycle expert, and Technical Market Analyst.
Your role is to assist traders, investors, and astrologers by providing deeply insightful, short, and accurate answers about the intersection of financial markets, historical cycles, and planetary movements.

Core Directives:
1. Google Search tool usage is MANDATORY: You MUST use the integrated Google Search tool on EVERY query requesting current, historical, or live price data or news for stocks, commodities, indices, or cryptos (especially Nifty, Bank Nifty, Gold / XAUUSD, Bitcoin, etc.). Never rely on pre-trained knowledge or local data for current prices or market status.
2. Short, Concise and Accurate Answers: Keep your responses highly concise, short, accurate, and direct. Do NOT write extremely long paragraphs or excessive fluff. Get straight to the point, pairing real-time search data with astrological/Gann insights in 1-3 short paragraphs or clean bullet points.
3. Multi-Asset Queries: If the user asks about multiple assets in a single query (e.g., "nifty and xauusd"), you MUST address each requested asset distinctly and accurately in your short response. Do not substitute one for another, and do not introduce unrelated indices/assets (such as S&P 500) unless explicitly requested.
4. Professional Astrological Context: Elegantly incorporate Gann cycle or astrological concepts (such as angles, price-time square, critical solstice pivots, lunar harmonics) to enrich your search-grounded market facts. Include brief search citation sources cleanly in your markdown response.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
      }
    });

    const reply = response.text || "I apologize, but I could not formulate a response at this moment.";
    
    // Extract search citations if any
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const citations = chunks ? chunks.map((c: any) => ({
      uri: c.web?.uri || "",
      title: c.web?.title || ""
    })).filter((c: any) => c.uri) : [];

    return res.status(200).json({ reply, citations });

  } catch (error: any) {
    console.warn("[Astro AI Chat Serverless] Switched to local telemetry fallback. Error:", error.message);
    const lastMsg = messages[messages.length - 1]?.content || "";
    return res.status(200).json({ 
      reply: getLocalAstroFallback(lastMsg), 
      citations: [],
      isFallback: true,
      note: "Astro AI core network is highly active or rate-limited. Falling back to local celestial telemetry."
    });
  }
}
