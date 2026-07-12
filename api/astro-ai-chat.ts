import { GoogleGenAI } from "@google/genai";

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
    const setupInstructions = `### 🌌 Astro AI: GEMINI_API_KEY is Missing

To enable Astro AI to perform real-time financial astrology predictions, Gann cycle analysis, and Google Search price grounding, you need to configure your **Gemini API Key** in Vercel:

1. **Obtain a Gemini API Key**: If you do not have one, get it from [Google AI Studio](https://aistudio.google.com/).
2. **Open Vercel Dashboard**: Navigate to your project on Vercel (**decodexmarketwithrsk**).
3. **Go to Settings**: Under the **Settings** tab, select **Environment Variables** in the left sidebar.
4. **Add the Key**:
   - **Key**: \`GEMINI_API_KEY\`
   - **Value**: *[Your Gemini API Key]*
5. **Redeploy your Project**: Go to the **Deployments** tab on Vercel, click the three dots on your latest deployment, and select **Redeploy** to apply the new secret.

*Astro AI will be fully functional once this key is supplied!*`;

    return res.status(200).json({ 
      reply: setupInstructions, 
      citations: [],
      isFallback: false,
      isConfigError: true
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
    console.warn("[Astro AI Chat Serverless] Request failed. Error:", error.message);
    return res.status(200).json({ 
      reply: `### 🌌 Celestial Network Overloaded\n\nAstro AI is currently experiencing heavy volume or rate limiting. Error details: \`${error.message}\`. Please check your Gemini API key limits or try again in a few moments.`, 
      citations: [],
      isFallback: false,
      isServerError: true
    });
  }
}
