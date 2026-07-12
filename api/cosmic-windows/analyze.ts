import { GoogleGenAI, Type } from "@google/genai";

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

  const { cosmicWindows } = req.body;
  if (!cosmicWindows) {
    return res.status(400).json({ error: "Missing cosmicWindows payload in request body." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[Cosmic Windows] GEMINI_API_KEY missing. Cannot proceed with Gemini query.");
    const setupInstructions = `### 🌌 TODAY'S COSMIC WINDOWS: GEMINI_API_KEY is Missing

To enable Astro AI to analyze today's cosmic windows, transits, retrogrades, and apply live Google Search price grounding, you need to configure your **Gemini API Key** in Vercel:

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
      niftyBias: "NEUTRAL",
      goldBias: "NEUTRAL",
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

    const currentDate = new Date().toDateString();
    
    // Format incoming cosmic windows data cleanly for the LLM prompt
    const activeMoon = cosmicWindows.activeMoonAlignment 
      ? `Active Moon Alignment: degree ${cosmicWindows.activeMoonAlignment.degree}` : "No active moon alignment";
    const activeMerc = cosmicWindows.activeMercAlignment 
      ? `Active Mercury Alignment: degree ${cosmicWindows.activeMercAlignment.degree}` : "No active mercury alignment";
    const activePanchak = cosmicWindows.activePanchak 
      ? `Active Panchak: ${cosmicWindows.activePanchak.name} (Status: ${cosmicWindows.activePanchak.status})` : "No active Panchak";
    const activeAmavasya = cosmicWindows.activeAmavasya 
      ? `Active Amavasya: ${cosmicWindows.activeAmavasya.name}` : "No active Amavasya";
    const retrogrades = cosmicWindows.activeRetrogrades && cosmicWindows.activeRetrogrades.length > 0
      ? `Active Planetary Retrogrades: ${cosmicWindows.activeRetrogrades.map((r: any) => `${r.planet} in ${r.sign}`).join(", ")}` : "No active retrogrades";
    const activeIngress = cosmicWindows.activeIngress 
      ? `Active Planetary Ingress: ${cosmicWindows.activeIngress.planet} in ${cosmicWindows.activeIngress.sign}` : "No active ingress";
    const activeAspect = cosmicWindows.activeAspect 
      ? `Active Aspect: ${cosmicWindows.activeAspect.planet1} ${cosmicWindows.activeAspect.aspectType} ${cosmicWindows.activeAspect.planet2}` : "No active aspects";

    const systemInstruction = `You are "Astro AI Cosmic Analyst", an elite-level Financial Astrologer and Gann Cycle Specialist.
Your task is to analyze the active and upcoming astronomical cycles, transits, ingress dates, and planetary alignments provided by the user, and synthesize them into a highly professional, accurate, and concise daily market bias report.

Mandatory Directives:
1. Google Search tool usage is MANDATORY: You MUST use the integrated Google Search tool to find the actual live, real-time current trading price/level of the Nifty 50 index (NSE: ^NSEI) and Gold (XAU/USD / MCX) for today (${currentDate}). Never make up, simulate, or estimate these prices. If the market is closed, search for the last closing price.
2. Direct and Honest: Explicitly mention the actual real-time price of Nifty 50 and Gold found via Google Search in your response.
3. Astrological Synthesis: Synthesize the current real-time price action with the provided cosmic alignments (Panchak, Amavasya, Retrogrades, Ingresses, Aspect transits) to explain the astrological momentum and price-time cycle targets.
4. Professional & Clean Markdown: Keep your response elegant, structured, and completely free of mock placeholders.
5. Do NOT include any placeholder phrases, hypothetical sentences, or fake data fallback text.`;

    const prompt = `Today's date: ${currentDate}

Active Celestial Alignments:
- ${activeMoon}
- ${activeMerc}
- ${activePanchak}
- ${activeAmavasya}
- ${retrogrades}
- ${activeIngress}
- ${activeAspect}

Please perform a Google Search to get the current live or latest closing price for Nifty 50 and Gold (XAU/USD).
Synthesize this search data with the celestial alignments above, and generate a concise markdown report. Include a section for Nifty 50 and a section for Gold, explaining how today's transits correlate with the live price action.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { 
              type: Type.STRING, 
              description: "Markdown formatted astrological analysis report, structured with headings. Must include today's live Nifty 50 and Gold prices found via Google Search." 
            },
            niftyBias: { 
              type: Type.STRING, 
              description: "Must be exactly 'BULLISH', 'BEARISH', 'NEUTRAL', or 'VOLATILE'" 
            },
            goldBias: { 
              type: Type.STRING, 
              description: "Must be exactly 'BULLISH', 'BEARISH', 'NEUTRAL', or 'VOLATILE'" 
            }
          },
          required: ["reply", "niftyBias", "goldBias"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini API");
    }

    const parsedData = JSON.parse(text.trim());
    return res.status(200).json(parsedData);

  } catch (error: any) {
    console.warn("[Cosmic Windows Analyze Serverless] Request failed. Error:", error.message);
    return res.status(200).json({ 
      reply: `### 🌌 Celestial Network Overloaded\n\nCosmic Windows analysis is currently experiencing heavy volume or rate limiting. Error details: \`${error.message}\`. Please check your Gemini API key limits or try again in a few moments.`, 
      niftyBias: "NEUTRAL",
      goldBias: "NEUTRAL",
      isFallback: false,
      isServerError: true
    });
  }
}
