import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";
import admin from "firebase-admin";

// Initialize Firebase Admin
try {
  const projectId = "gen-lang-client-0237713481";
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: projectId,
  });
  console.log(`[Firebase Admin] Initialized successfully for project: ${projectId}`);
} catch (error) {
  console.warn("[Firebase Admin] Initialization failed. Admin features like password reset via OTP may not work without a service account.", error);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON bodies
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Admin Notification Route
  app.post("/api/admin/notify-registration", async (req, res) => {
    const { userEmail, userName, userUid, accessCode } = req.body;
    const adminEmail = "rshankartrader@gmail.com";

    console.log(`[Notification] New user registration: ${userEmail}`);

    // Check if SMTP credentials are provided
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      console.warn("[Notification] SMTP credentials missing. Skipping email notification.");
      return res.status(200).json({ status: "skipped", message: "SMTP credentials not configured" });
    }

    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const mailOptions = {
        from: `"DecodeXMarket System" <${smtpUser}>`,
        to: adminEmail,
        subject: "🚨 New User Registered - DecodeXMarket",
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px;">
            <h2 style="color: #F27D26; border-bottom: 2px solid #F27D26; padding-bottom: 10px;">New Registration Alert</h2>
            <p>A new user has just registered on the platform.</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Name:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${userName || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${userEmail}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">UID:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-family: monospace; font-size: 12px;">${userUid}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Access Code:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-family: monospace; font-weight: bold; color: #F27D26;">${accessCode || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Time:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
            <p style="margin-top: 30px; font-size: 12px; color: #777;">
              This is an automated notification from your DecodeXMarket terminal.
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`[Notification] Email sent to ${adminEmail}`);
      res.json({ status: "success" });
    } catch (error) {
      console.error("[Notification] Error sending email:", error);
      res.status(500).json({ error: "Failed to send email notification" });
    }
  });

  // OTP Storage (In-memory for simplicity)
  const otpStore = new Map<string, { otp: string; expires: number }>();
  const resetTokenStore = new Map<string, { token: string; expires: number }>();

  // API Proxy for Google Apps Script to bypass CORS
  app.get("/api/backtest/current", async (req, res) => {
    const webAppUrl = "https://script.google.com/macros/s/AKfycbzRd-z3NoEA0BCqhvhJZf3m1TaLA0BjcrfqnRhI1m0ANrQRZndkvAU_MZEk4OMeob3P/exec";
    
    try {
      const response = await axios.get(webAppUrl, {
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
      });
      
      if (response.status >= 400) {
        return res.status(response.status).json({ error: `GAS Error: ${response.statusText}` });
      }
      
      res.json(response.data);
    } catch (error) {
      console.error("[Proxy] Current Data Error:", error);
      res.status(500).json({ error: "Failed to fetch current sheet data" });
    }
  });

  // API Proxy for Google Apps Script to bypass CORS
  app.get("/api/backtest", async (req, res) => {
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

      console.log(`[Proxy] Data received successfully:`, JSON.stringify(response.data));
      res.json(response.data);
    } catch (error) {
      console.error("[Proxy] Critical Error:", error);
      res.status(500).json({ error: `Internal Server Error during proxy: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });

  // Proxy for planetary ingress sheet data
  app.get("/api/planetary-ingress", async (req, res) => {
    const userWebScriptUrl = "https://script.google.com/macros/s/AKfycbxvfJv35_2d9TPoUoA5XvaYwI5zMpG6H5lpi0Vd-QorhvwcPCu6OzeUw0hhS4cgeJ7Tfg/exec";
    const defaultWebSheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSWqA53wQqhu2nNXSDcxeoA7gErbS0gTpPC1UjLr0ZRbIoPXmnAETdMgiPmGYuTLbmioMnxQVr6WEab/pub?gid=1478838111&single=true&output=csv";
    const customUrl = (req.query.url as string) || process.env.PLANETARY_INGRESS_WEB_APP_URL || "";
    const targetUrl = customUrl.trim() || userWebScriptUrl || defaultWebSheetUrl;

    const fetchEvents = async (url: string): Promise<any[]> => {
      console.log(`[Proxy] Fetching planetary ingress from: ${url}`);
      const response = await axios.get(url, { timeout: 15000 });
      const responseData = response.data;
      const events: any[] = [];

      // Astrological sign & planet symbol mappings
      const planetSymbols: Record<string, string> = {
        "sun": "☉", "moon": "☽", "mercury": "☿", "venus": "♀", "mars": "♂",
        "jupiter": "♃", "saturn": "♄", "uranus": "♅", "neptune": "♆", "pluto": "♇",
        "north node": "☊", "south node": "☋", "chiron": "⚷", "rahu": "☊", "ketu": "☋"
      };

      const signSymbols: Record<string, string> = {
        "aries": "♈", "taurus": "♉", "gemini": "♊", "cancer": "♋", "leo": "♌", "virgo": "♍",
        "libra": "♎", "scorpio": "♏", "sagittarius": "♐", "capricorn": "♑", "aquarius": "♒", "pisces": "♓"
      };

      // Default market impacts for combinations
      const getMarketImpact = (planet: string, sign: string, customImpact?: string): string => {
        if (customImpact && customImpact.trim().length > 3) {
          return customImpact.trim();
        }

        const p = planet.toLowerCase();
        const s = sign.toLowerCase();

        const impacts: Record<string, string> = {
          "neptune_aries": "Historical 14-year shift: Neptune enters Aries. Triggers long-term cycles in synthetic biology, pharma, marine logistics, and green fuels.",
          "saturn_aries": "Critical 29-year cycle transition: Saturn enters Aries. Tightens global credit channels and triggers industrial restructuring.",
          "sun_aries": "Spring Equinox: Solar ingress into Aries. High-probability global market trend pivot and gold sector volume surge.",
          "uranus_gemini": "Major 7-year transit: Uranus enters Gemini. Revamps telecom, 5G/6G grids, internet routing, and quantum computing.",
          "sun_cancer": "Summer Solstice: Solar ingress into Cancer. Seasonal turnaround in sovereign debt yields and housing finance channels.",
          "jupiter_leo": "Major cyclical shift: Jupiter enters Leo. Supports speculative stock market booms, high-end retail, and precious metals.",
          "sun_libra": "Autumn Equinox: Solar ingress into Libra. Historical trigger for forex updates and global trade balance realignments.",
          "sun_capricorn": "Winter Solstice: Solar ingress into Capricorn. Marks institutional asset reallocations for the upcoming fiscal year.",
          "chiron_taurus": "Long-term healing transit: Chiron in Taurus shifts focus to agricultural restoration, land value appraisals, and food tech.",
          "jupiter_virgo": "Major cyclical shift: Jupiter enters Virgo. Boosts precision health tech, manufacturing optimization, and clinical trial budgets.",
          "mars_scorpio": "Aggressive actions in oil drilling, defense-tech investments, and cyber security protocols.",
          "saturn_taurus": "Major 2.5-year cycle: Saturn enters Taurus. Restricts traditional banking liquidity, land development, and real estate credit.",
          "jupiter_libra": "Major cyclical shift: Jupiter enters Libra. Fosters international commercial alliances, legal system updates, and major mergers.",
          "jupiter_scorpio": "Major cyclical shift: Jupiter enters Scorpio. Liquidates high-risk assets, fuels massive private equity and debt workouts.",
          "mars_aries": "Aggressive breakouts in industrial machinery, steel fabrication, and defense tech.",
          "saturn_gemini": "Major 2.5-year cycle: Saturn enters Gemini. Introduces strict regulatory frameworks on shipping, aviation, and transport logistics.",
          "jupiter_sagittarius": "Major cyclical shift: Jupiter enters Sagittarius. Broad-spectrum bullish optimism in global shipping, trade, and aviation.",
          "jupiter_capricorn": "Major cyclical shift: Jupiter enters Capricorn. Stabilizes institutional finance and corporate value models.",
          "jupiter_aquarius": "Major cyclical shift: Jupiter enters Aquarius. Prompts record funding into quantum systems, clean-tech grids, and decentralized networks.",
          "saturn_cancer": "Major 2.5-year cycle: Saturn enters Cancer. Strict regulatory audits affect home lending and land development assets.",
          "jupiter_pisces": "Major cyclical shift: Jupiter enters Pisces. Boosts global water resources, marine shipping, and pharmaceutical pipelines.",
          "uranus_cancer": "Major 7-year transit: Uranus enters Cancer. Disrupts home mortgage tech, advances virtual building networks.",
          "saturn_leo": "Major 2.5-year cycle: Saturn enters Leo. Restricts recreational, leisure, and entertainment sector credit.",
          "jupiter_aries": "Major cyclical shift: Jupiter enters Aries. Triggers a massive wave of entrepreneurial capital and high defense spending.",
          "jupiter_taurus": "Major cyclical shift: Jupiter enters Taurus. Strong support for real estate markets and commercial banks.",
          "jupiter_gemini": "Major cyclical shift: Jupiter enters Gemini. Accelerates advancements in digital networks, communications, and transport logistics.",
          "saturn_virgo": "Major 2.5-year cycle: Saturn enters Virgo. Strict auditing across clinical sectors, supply chain guidelines, and automation audits."
        };

        const key = `${p}_${s}`;
        if (impacts[key]) return impacts[key];

        // Generic descriptions based on planet and sign meanings
        const planetMeanings: Record<string, string> = {
          "sun": "Solar focus increases volume and volatility in index options. Marks seasonal liquidity shifts.",
          "moon": "Lunar transition triggers short-term emotional sentiment changes and intraday trading swings.",
          "mercury": "Mercury transit shifts short-term trading volumes, tech stock reactions, and high-frequency algorithms.",
          "venus": "Venus transit impacts consumer discretionary indices, retail volume, currency exchange rates, and luxury assets.",
          "mars": "Mars transit triggers intense trading surges, crude oil breakouts, defense stock interest, and high-risk commodity movements.",
          "jupiter": "Jupiter expansion supports massive bull momentum, capital deployments, and overall market optimistic runs.",
          "saturn": "Saturn restrictions trigger regulatory audits, debt structuring, real estate caution, and credit contraction.",
          "uranus": "Uranus disruptions trigger rapid changes in technology stocks, AI funding cycles, power grids, and tech breakouts.",
          "neptune": "Neptune transits influence oil & gas pipelines, water assets, medical sectors, and speculative asset bubbles.",
          "pluto": "Pluto transformation sparks systemic structural reform in institutional banking, tax regulations, and macro cycles.",
          "north node": "Rahu/North Node shifts focus to future tech, internet infrastructure, and decentralized finance trends.",
          "south node": "Ketu/South Node transition signals consolidation in traditional markets and debt liquidations.",
          "chiron": "Chiron transit focuses focus on healthcare innovations, agricultural restoration, and wellness budgets."
        };

        const signMeanings: Record<string, string> = {
          "aries": "Stimulates aggressive capital speculation and defense sectors.",
          "taurus": "Focuses on banking reserves, agricultural land, and real estate credit lines.",
          "gemini": "Amplifies communications, logistics, computing power, and information routing.",
          "cancer": "Drives housing finance, mortgage-backed assets, and home developer sectors.",
          "leo": "Boosts high-end consumer luxury, speculative options, and precious metal values.",
          "virgo": "Focuses on supply chain controls, precision manufacturing, and healthcare metrics.",
          "libra": "Highlights corporate mergers, joint ventures, and international trading agreements.",
          "scorpio": "Triggers private equity workouts, corporate liquidations, and energy resources.",
          "sagittarius": "Fosters shipping indices, cross-border commerce, and transport volume expansion.",
          "capricorn": "Strengthens institutional regulations, sovereign debts, and blue-chip valuations.",
          "aquarius": "Encourages clean energy, power grids, and decentralized technology systems.",
          "pisces": "Influences liquid assets, pharmaceutical research, and ocean logistics."
        };

        const pDesc = planetMeanings[p] || `${planet.toUpperCase()} transit marks pivotal astrological cycle transition.`;
        const sDesc = signMeanings[s] || `Focuses market trends onto ${sign} related assets.`;
        return `${pDesc} ${sDesc}`;
      };

      const normalizeDate = (rawDate: string, year?: string): string => {
        let normalizedDate = rawDate.trim();
        
        // Handle YYYY-MM-DD or DD/MM/YYYY
        if (normalizedDate.includes("-") || normalizedDate.includes("/")) {
          const separator = normalizedDate.includes("-") ? "-" : "/";
          const parts = normalizedDate.split(separator);
          if (parts.length === 3) {
            if (parts[2].length === 4 || parts[2].length === 2) {
              const d = parts[0].padStart(2, "0");
              const m = parts[1].padStart(2, "0");
              let y = parts[2];
              if (y.length === 2) y = "20" + y; // Assume 20xx
              normalizedDate = `${y}-${m}-${d}`;
            } else if (parts[0].length === 4) {
              const y = parts[0];
              const m = parts[1].padStart(2, "0");
              const d = parts[2].padStart(2, "0");
              normalizedDate = `${y}-${m}-${d}`;
            }
          }
          return normalizedDate;
        }

        // Handle word-based dates like "Jan 1" or "January 17"
        const months: Record<string, string> = {
          "jan": "01", "january": "01",
          "feb": "02", "february": "02",
          "mar": "03", "march": "03",
          "apr": "04", "april": "04",
          "may": "05",
          "jun": "06", "june": "06",
          "jul": "07", "july": "07",
          "aug": "08", "august": "08",
          "sep": "09", "september": "09",
          "oct": "10", "october": "10",
          "nov": "11", "november": "11",
          "dec": "12", "december": "12"
        };

        const monthMatch = normalizedDate.match(/([a-zA-Z]+)/);
        const dayMatch = normalizedDate.match(/(\d+)/);

        if (monthMatch && dayMatch) {
          const mName = monthMatch[1].toLowerCase();
          const mNum = months[mName];
          const dNum = dayMatch[1].padStart(2, "0");
          if (mNum && dNum) {
            const finalYear = (year || "2026").toString().trim();
            return `${finalYear}-${mNum}-${dNum}`;
          }
        }

        return normalizedDate;
      };

      // Check if response data is an object (JSON)
      let parsedJson: any = null;
      if (typeof responseData === "object" && responseData !== null) {
        parsedJson = responseData;
      } else if (typeof responseData === "string" && (responseData.trim().startsWith("{") || responseData.trim().startsWith("["))) {
        try {
          parsedJson = JSON.parse(responseData);
        } catch (e) {
          // Fall back to CSV parsing
        }
      }

      if (parsedJson) {
        // We received JSON from Google Apps Script Web App
        console.log("[Proxy] Processing JSON response from Apps Script / API");
        const rawEvents = Array.isArray(parsedJson) ? parsedJson : (Array.isArray(parsedJson.events) ? parsedJson.events : []);
        
        for (const item of rawEvents) {
          const planet = (item.planet || item.Planet || "").trim();
          const sign = (item.sign || item.Sign || item.ingress || item.Ingress || "").trim();
          const rawDate = (item.date || item.Date || "").trim();
          const time = (item.time || item.Time || "").trim();
          const customImpact = (item.marketImpact || item.impact || item.Impact || "").trim();
          const itemYear = (item.year || item.Year || "").toString().trim();

          if (!planet || !sign || !rawDate) continue;

          const pKey = planet.toLowerCase();
          const sKey = sign.toLowerCase();
          const pSymbol = planetSymbols[pKey] || "☿";
          const sSymbol = signSymbols[sKey] || "♈";
          const normalizedDate = normalizeDate(rawDate, itemYear);

          events.push({
            planet,
            symbol: pSymbol,
            sign,
            signSymbol: sSymbol,
            date: normalizedDate,
            time,
            marketImpact: getMarketImpact(planet, sign, customImpact)
          });
        }
      } else {
        // Process as CSV string
        console.log("[Proxy] Processing CSV plain-text response");
        const csvText = responseData;
        if (!csvText || typeof csvText !== "string") {
          throw new Error("Invalid CSV data format received");
        }

        const lines = csvText.split(/\r?\n/);

        // Helper to parse CSV line
        const parseCSVLine = (line: string) => {
          const result: string[] = [];
          let current = "";
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        let yearIdx = 0;
        let dateIdx = 1;
        let timeIdx = 2;
        let planetIdx = 3;
        let signIdx = 4;
        let impactIdx = -1;

        // Skip header row if it contains headers
        let startIndex = 0;
        if (lines.length > 0) {
          const firstLineCols = parseCSVLine(lines[0]);
          const isHeader = firstLineCols.some(col => 
            col.toLowerCase().includes("year") || 
            col.toLowerCase().includes("date") || 
            col.toLowerCase().includes("planet") ||
            col.toLowerCase().includes("sign")
          );
          if (isHeader) {
            startIndex = 1;
            firstLineCols.forEach((col, idx) => {
              const lower = col.toLowerCase();
              if (lower.includes("year")) {
                yearIdx = idx;
              } else if (lower.includes("date")) {
                dateIdx = idx;
              } else if (lower.includes("time")) {
                timeIdx = idx;
              } else if (lower.includes("planet")) {
                planetIdx = idx;
              } else if (lower.includes("sign")) {
                signIdx = idx;
              } else if (lower.includes("impact") || lower.includes("market") || lower.includes("description") || lower.includes("gann")) {
                impactIdx = idx;
              }
            });
          }
        }

        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;

          const cols = parseCSVLine(line);
          if (cols.length < 4) continue;

          let rawYear = cols[yearIdx] ? cols[yearIdx].trim() : "";
          let rawDate = cols[dateIdx] ? cols[dateIdx].trim() : "";
          let time = cols[timeIdx] ? cols[timeIdx].trim() : "";
          let planet = cols[planetIdx] ? cols[planetIdx].trim() : "";
          let sign = cols[signIdx] ? cols[signIdx].trim() : "";
          let customImpact = impactIdx !== -1 && cols[impactIdx] ? cols[impactIdx].trim() : undefined;

          // Shift if sign column is "enters" (e.g. Action column is present)
          if (sign.toLowerCase() === "enters" && cols.length > 5) {
            sign = cols[5].trim();
            customImpact = cols.length >= 7 ? cols[6].trim() : undefined;
          }

          const cleanPlanet = planet.replace(/[\"']/g, "").trim();
          const cleanSign = sign.replace(/[\"']/g, "").trim();
          
          if (!cleanPlanet || !cleanSign) continue;

          const pKey = cleanPlanet.toLowerCase();
          const sKey = cleanSign.toLowerCase();

          const pSymbol = planetSymbols[pKey] || "☿";
          const sSymbol = signSymbols[sKey] || "♈";
          const normalizedDate = normalizeDate(rawDate, rawYear);

          events.push({
            planet: cleanPlanet,
            symbol: pSymbol,
            sign: cleanSign,
            signSymbol: sSymbol,
            date: normalizedDate,
            time: time,
            marketImpact: getMarketImpact(cleanPlanet, cleanSign, customImpact)
          });
        }
      }

      // Sort by date ascending
      events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return events;
    };

    try {
      let events = await fetchEvents(targetUrl);
      
      // If no events found and we tried a custom/script URL, auto-fall back to default CSV!
      if (events.length === 0 && targetUrl !== defaultWebSheetUrl) {
        console.warn(`[Proxy] Target URL ${targetUrl} returned 0 events. Falling back to default CSV...`);
        events = await fetchEvents(defaultWebSheetUrl);
      }

      console.log(`[Proxy] Loaded ${events.length} planetary ingress events successfully.`);
      res.json({ events });
    } catch (error) {
      console.error("[Proxy] Error loading planetary ingress spreadsheet data, trying default CSV fallback...", error);
      try {
        const events = await fetchEvents(defaultWebSheetUrl);
        res.json({ events });
      } catch (fallbackError) {
        console.error("[Proxy] Even fallback failed:", fallbackError);
        res.status(500).json({ error: "Failed to fetch or parse planetary ingress spreadsheet data" });
      }
    }
  });

  // Proxy for planetary transits and aspects sheet data
  app.get("/api/planetary-transits", async (req, res) => {
    const DEFAULT_TRANSITS = [
      {
        id: "1",
        year: 2026,
        date: "2026-02-19",
        time: "15:52 UTC",
        planet1: "Sun",
        planet1Symbol: "☉",
        planet1Sign: "Pisces",
        planet2: "Mars",
        planet2Symbol: "♂",
        planet2Sign: "Virgo",
        aspectType: "Opposition",
        aspectSymbol: "☍",
        degree: "1° 12'",
        marketImpact: "High-volatility trend reversal. Mars oppositions represent intense energy release. Historically correlates with sharp corrections in Equities, major swings in Gold, and high volume in Crude Oil.",
        strength: "HIGH",
        sectors: ["Gold", "Crude Oil", "Nifty Index", "SPY"]
      },
      {
        id: "2",
        year: 2026,
        date: "2026-07-27",
        time: "18:30 UTC",
        planet1: "Sun",
        planet1Symbol: "☉",
        planet1Sign: "Leo",
        planet2: "Pluto",
        planet2Symbol: "♇",
        planet2Sign: "Aquarius",
        aspectType: "Opposition",
        aspectSymbol: "☍",
        degree: "4° 05'",
        marketImpact: "Structural changes and power struggles. Pluto oppositions influence banking systems, government regulations, and institutional flows. Watch for sudden tech-sector shifts and crypto fluctuations.",
        strength: "MEDIUM",
        sectors: ["Crypto", "Tech Stocks", "Bank Nifty", "US Dollar"]
      },
      {
        id: "3",
        year: 2026,
        date: "2026-09-16",
        time: "03:45 UTC",
        planet1: "Sun",
        planet1Symbol: "☉",
        planet1Sign: "Virgo",
        planet2: "Neptune",
        planet2Symbol: "♆",
        planet2Sign: "Pisces",
        aspectType: "Opposition",
        aspectSymbol: "☍",
        degree: "23° 18'",
        marketImpact: "Illusion and false breakouts. Neptune's 180° aspect often induces fog and cloudiness in trend analysis. Expect erratic movements in oil, pharmaceuticals, and chemicals. Retransmission of news is common.",
        strength: "MEDIUM",
        sectors: ["Crude Oil", "Pharma", "Commodities"]
      },
      {
        id: "4",
        year: 2026,
        date: "2026-10-04",
        time: "22:15 UTC",
        planet1: "Sun",
        planet1Symbol: "☉",
        planet1Sign: "Libra",
        planet2: "Saturn",
        planet2Symbol: "♄",
        planet2Sign: "Aries",
        aspectType: "Opposition",
        aspectSymbol: "☍",
        degree: "11° 34'",
        marketImpact: "Peak resistance and structural bounds. Saturn is the planet of limitation and structure. Represents strict boundaries where bulls find exhaustion. Correlates with key cycle lows or long-term consolidation starts.",
        strength: "HIGH",
        sectors: ["Bonds", "Real Estate", "Banking", "Global Indices"]
      },
      {
        id: "5",
        year: 2026,
        date: "2026-11-21",
        time: "11:30 UTC",
        planet1: "Sun",
        planet1Symbol: "☉",
        planet1Sign: "Scorpio",
        planet2: "Uranus",
        planet2Symbol: "♅",
        planet2Sign: "Taurus",
        aspectType: "Opposition",
        aspectSymbol: "☍",
        degree: "29° 44'",
        marketImpact: "Unexpected shocks or Black Swan flash crashes. Uranus governs abrupt events, technical disruptions, and sudden awakenings. Major impact on high-growth technology sectors and currency indices.",
        strength: "HIGH",
        sectors: ["NASDAQ", "Tech Stocks", "Forex", "Semiconductors"]
      }
    ];

    const userWebScriptUrl = "https://script.google.com/macros/s/AKfycbxEcG9hykxB_N3aSi1Q8Qlipn3XtuTcNoCs62_RM9cIsIU357K9TygKIW3hkQKmNkmTVA/exec";
    let customUrl = (req.query.url as string) || process.env.PLANETARY_TRANSITS_WEB_APP_URL || "";
    if (!customUrl.trim()) {
      try {
        const docSnap = await admin.firestore().collection("settings").doc("planetary_transits").get();
        if (docSnap.exists) {
          customUrl = docSnap.data()?.url || "";
        }
      } catch (err) {
        console.warn("[Proxy] Error getting custom transits URL from Firestore:", err);
      }
    }
    if (!customUrl.trim()) {
      customUrl = userWebScriptUrl;
    }

    if (!customUrl.trim()) {
      return res.json({ transits: [] });
    }

    // Server-side validation of the URL format
    const isValidPattern = /^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec\/?(\?.*)?$/.test(customUrl.trim());
    if (!isValidPattern) {
      return res.status(400).json({ error: "Invalid URL. Data source URL must be a valid Google Apps Script Web App link in the format: https://script.google.com/macros/s/.../exec" });
    }

    const fetchTransits = async (url: string): Promise<any[]> => {
      console.log(`[Proxy] Fetching planetary transits from: ${url}`);
      const response = await axios.get(url, { timeout: 30000 });
      const responseData = response.data;
      const transitsList: any[] = [];

      const planetSymbols: Record<string, string> = {
        "sun": "☉", "moon": "☽", "mercury": "☿", "venus": "♀", "mars": "♂",
        "jupiter": "♃", "saturn": "♄", "uranus": "♅", "neptune": "♆", "pluto": "♇",
        "north node": "☊", "south node": "☋", "chiron": "⚷"
      };

      const aspectSymbols: Record<string, string> = {
        "opposition": "☍", "conjunction": "☌", "sextile": "⚹", "square": "□", "trine": "△"
      };

      const normalizeDate = (rawDate: string, year?: string): string => {
        let normalizedDate = rawDate.trim();
        
        // Extract 4-digit year from date if present
        let finalYearStr = year || "";
        const yearMatch = normalizedDate.match(/\b(20\d{2})\b/);
        if (yearMatch) {
          finalYearStr = yearMatch[1];
        }
        
        let finalYearParsed = parseInt(finalYearStr);
        if (isNaN(finalYearParsed) || finalYearParsed < 1900 || finalYearParsed > 2100) {
          finalYearParsed = 2026;
        }

        if (normalizedDate.includes("-") || normalizedDate.includes("/")) {
          const separator = normalizedDate.includes("-") ? "-" : "/";
          const parts = normalizedDate.split(separator);
          if (parts.length === 3) {
            if (parts[2].length === 4 || parts[2].length === 2) {
              const d = parts[0].padStart(2, "0");
              const m = parts[1].padStart(2, "0");
              let y = parts[2];
              if (y.length === 2) y = "20" + y;
              normalizedDate = `${y}-${m}-${d}`;
            } else if (parts[0].length === 4) {
              const y = parts[0];
              const m = parts[1].padStart(2, "0");
              const d = parts[2].padStart(2, "0");
              normalizedDate = `${y}-${m}-${d}`;
            }
          }
          return normalizedDate;
        }

        const months: Record<string, string> = {
          "jan": "01", "january": "01", "feb": "02", "february": "02",
          "mar": "03", "march": "03", "apr": "04", "april": "04", "may": "05",
          "jun": "06", "june": "06", "jul": "07", "july": "07", "aug": "08", "august": "08",
          "sep": "09", "september": "09", "oct": "10", "october": "10", "nov": "11", "november": "11",
          "dec": "12", "december": "12"
        };

        const monthMatch = normalizedDate.match(/([a-zA-Z]+)/);
        const dayMatch = normalizedDate.match(/(\d+)/);

        if (monthMatch && dayMatch) {
          const mName = monthMatch[1].toLowerCase();
          const mNum = months[mName];
          const dNum = dayMatch[1].padStart(2, "0");
          if (mNum && dNum) {
            return `${finalYearParsed}-${mNum}-${dNum}`;
          }
        }
        return normalizedDate;
      };

      let parsedJson: any = null;
      if (typeof responseData === "object" && responseData !== null) {
        parsedJson = responseData;
      } else if (typeof responseData === "string" && (responseData.trim().startsWith("{") || responseData.trim().startsWith("["))) {
        try {
          parsedJson = JSON.parse(responseData);
        } catch (e) {
          // ignore
        }
      }

      if (parsedJson) {
        console.log("[Proxy] Processing JSON transit response from Apps Script / API");
        const rawTransits = Array.isArray(parsedJson) ? parsedJson : (Array.isArray(parsedJson.transits) ? parsedJson.transits : []);
        
        rawTransits.forEach((item: any, idx: number) => {
          const planet1 = (item.planet1 || item.Planet1 || item.p1 || item.P1 || "").trim();
          const planet2 = (item.planet2 || item.Planet2 || item.p2 || item.P2 || "").trim();
          const rawDate = (item.date || item.Date || "").trim();
          const time = (item.time || item.Time || "").trim();
          const p1Sign = (item.planet1Sign || item.planet1_sign || item.p1Sign || item.p1_sign || "").trim();
          const p2Sign = (item.planet2Sign || item.planet2_sign || item.p2Sign || item.p2_sign || "").trim();
          const aspectType = (item.aspectType || item.aspect_type || item.aspect || "").trim() || "Opposition";
          const degree = (item.degree || item.Degree || "").trim() || "0° 00'";
          const marketImpact = (item.marketImpact || item.impact || item.Impact || item.interpretation || "").trim();
          const strength = (item.strength || item.Strength || "HIGH").trim().toUpperCase();
          const sectors = Array.isArray(item.sectors) ? item.sectors : (item.sectors ? item.sectors.toString().split(",").map((s: string) => s.trim()) : ["Global Markets"]);
          const itemYear = (item.year || item.Year || "").toString().trim();

          if (!planet1 || !planet2 || !rawDate) return;

          const p1Key = planet1.toLowerCase();
          const p2Key = planet2.toLowerCase();
          const aspectKey = aspectType.toLowerCase();

          const p1Symbol = planetSymbols[p1Key] || "☉";
          const p2Symbol = planetSymbols[p2Key] || "♂";
          const aspectSymbol = aspectSymbols[aspectKey] || "☍";
          const normalizedDate = normalizeDate(rawDate, itemYear);

          let parsedYear = parseInt(itemYear);
          // Detect 4 digit year from normalized date or itemYear
          const dateYearMatch = normalizedDate.match(/\b(20\d{2})\b/);
          if (dateYearMatch) {
            parsedYear = parseInt(dateYearMatch[1]);
          } else if (isNaN(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
            parsedYear = new Date(normalizedDate).getUTCFullYear() || 2026;
          }

          transitsList.push({
            id: item.id || `transit-${idx}-${Date.now()}`,
            year: parsedYear,
            date: normalizedDate,
            time: time || "12:00 UTC",
            planet1,
            planet1Symbol: p1Symbol,
            planet1Sign: p1Sign || "Aries",
            planet2,
            planet2Symbol: p2Symbol,
            planet2Sign: p2Sign || "Libra",
            aspectType,
            aspectSymbol: aspectSymbol,
            degree,
            marketImpact: marketImpact || `${planet1} in aspect to ${planet2} representing cycles convergence.`,
            strength: (strength === "HIGH" || strength === "MEDIUM" || strength === "LOW") ? strength : "HIGH",
            sectors: sectors.length > 0 ? sectors : ["Global Markets"]
          });
        });
      } else {
        // Fallback or CSV parsing if user publishes spreadsheet as CSV directly
        console.log("[Proxy] Processing CSV plain-text transit response");
        const csvText = responseData;
        if (csvText && typeof csvText === "string") {
          const lines = csvText.split(/\r?\n/);
          
          const parseCSVLine = (text: string): string[] => {
            const result: string[] = [];
            let current = "";
            let inQuotes = false;
            for (let i = 0; i < text.length; i++) {
              const char = text[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = "";
              } else {
                current += char;
              }
            }
            result.push(current);
            return result;
          };

          let yearIdx = 0;
          let dateIdx = 1;
          let timeIdx = 2;
          let p1Idx = 3;
          let p1SignIdx = 4;
          let p2Idx = 5;
          let p2SignIdx = 6;
          let aspectIdx = 7;
          let degreeIdx = 8;
          let impactIdx = 9;
          let strengthIdx = 10;
          let sectorsIdx = 11;

          let startIndex = 0;
          if (lines.length > 0) {
            const firstLineCols = parseCSVLine(lines[0]);
            const isHeader = firstLineCols.some(col => 
              col.toLowerCase().includes("planet") || 
              col.toLowerCase().includes("date") || 
              col.toLowerCase().includes("year") ||
              col.toLowerCase().includes("aspect")
            );
            if (isHeader) {
              startIndex = 1;
              firstLineCols.forEach((col, idx) => {
                const lower = col.toLowerCase();
                if (lower.includes("year")) yearIdx = idx;
                else if (lower.includes("date")) dateIdx = idx;
                else if (lower.includes("time")) timeIdx = idx;
                else if (lower.includes("planet 1") || lower.includes("planet1") || lower.includes("p1") && !lower.includes("sign")) p1Idx = idx;
                else if (lower.includes("p1 sign") || lower.includes("planet1 sign") || lower.includes("p1sign")) p1SignIdx = idx;
                else if (lower.includes("planet 2") || lower.includes("planet2") || lower.includes("p2") && !lower.includes("sign")) p2Idx = idx;
                else if (lower.includes("p2 sign") || lower.includes("planet2 sign") || lower.includes("p2sign")) p2SignIdx = idx;
                else if (lower.includes("aspect") || lower.includes("type")) aspectIdx = idx;
                else if (lower.includes("degree") || lower.includes("axis")) degreeIdx = idx;
                else if (lower.includes("impact") || lower.includes("interpretation") || lower.includes("gann")) impactIdx = idx;
                else if (lower.includes("strength") || lower.includes("priority")) strengthIdx = idx;
                else if (lower.includes("sectors") || lower.includes("markets")) sectorsIdx = idx;
              });
            }
          }

          for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            const cols = parseCSVLine(line);
            if (cols.length < 4) continue;

            const rawYear = cols[yearIdx] ? cols[yearIdx].trim() : "";
            const rawDate = cols[dateIdx] ? cols[dateIdx].trim() : "";
            const time = cols[timeIdx] ? cols[timeIdx].trim() : "";
            const planet1 = cols[p1Idx] ? cols[p1Idx].trim() : "";
            const planet1Sign = cols[p1SignIdx] ? cols[p1SignIdx].trim() : "";
            const planet2 = cols[p2Idx] ? cols[p2Idx].trim() : "";
            const planet2Sign = cols[p2SignIdx] ? cols[p2SignIdx].trim() : "";
            const aspectType = cols[aspectIdx] ? cols[aspectIdx].trim() : "Opposition";
            const degree = cols[degreeIdx] ? cols[degreeIdx].trim() : "0° 00'";
            const marketImpact = cols[impactIdx] ? cols[impactIdx].trim() : "";
            const strengthStr = cols[strengthIdx] ? cols[strengthIdx].trim().toUpperCase() : "HIGH";
            const sectorsRaw = cols[sectorsIdx] ? cols[sectorsIdx].trim() : "Global Markets";

            if (!planet1 || !planet2 || !rawDate) continue;

            const p1Key = planet1.toLowerCase();
            const p2Key = planet2.toLowerCase();
            const aspectKey = aspectType.toLowerCase();

            const p1Symbol = planetSymbols[p1Key] || "☉";
            const p2Symbol = planetSymbols[p2Key] || "♂";
            const aspectSymbol = aspectSymbols[aspectKey] || "☍";
            const normalizedDate = normalizeDate(rawDate, rawYear);

            const sectorsList = sectorsRaw.split(",").map(s => s.trim()).filter(Boolean);

            transitsList.push({
              id: `transit-csv-${i}-${Date.now()}`,
              year: parseInt(rawYear) || new Date(normalizedDate).getUTCFullYear() || 2026,
              date: normalizedDate,
              time: time || "12:00 UTC",
              planet1,
              planet1Symbol: p1Symbol,
              planet1Sign: planet1Sign || "Aries",
              planet2,
              planet2Symbol: p2Symbol,
              planet2Sign: planet2Sign || "Libra",
              aspectType,
              aspectSymbol,
              degree,
              marketImpact: marketImpact || `${planet1} Opposition ${planet2} cycle alignment.`,
              strength: (strengthStr === "HIGH" || strengthStr === "MEDIUM" || strengthStr === "LOW") ? strengthStr : "HIGH",
              sectors: sectorsList.length > 0 ? sectorsList : ["Global Markets"]
            });
          }
        }
      }

      transitsList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return transitsList;
    };

    try {
      const transits = await fetchTransits(customUrl);
      if (transits && transits.length > 0) {
        console.log(`[Proxy] Loaded ${transits.length} planetary transits successfully.`);
        res.json({ transits });
      } else {
        throw new Error("The spreadsheet did not return any transit aspect data. Ensure your sheet has columns named Year, Date, Time, Planet 1, Planet 2, Aspect Type, etc. and that they have valid values.");
      }
    } catch (error: any) {
      console.warn("[Proxy] Error loading planetary transits spreadsheet data:", error.message || error);
      let errorMessage = "Failed to load spreadsheet planetary transits.";
      if (error.code === "ECONNABORTED" || (error.message && error.message.includes("timeout"))) {
        errorMessage = "Connection timed out (exceeded 30 seconds). The Google Apps Script is taking too long to respond. Please verify your script deployment settings and ensure it executes as 'Me' and is accessible by 'Anyone'.";
      } else if (error.response) {
        errorMessage = `Spreadsheet URL returned error: ${error.response.status} ${error.response.statusText}`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return res.status(500).json({
        error: errorMessage,
        transits: []
      });
    }
  });

  // Programmatic fallback generator for financial astrology to prevent 503/overload crashes
  const getFallbackAnalysis = (planet1: string, planet2: string, aspectType: string) => {
    const p1 = planet1.trim();
    const p2 = planet2.trim();
    const asp = aspectType.trim();

    const sectorsSet = new Set<string>();
    const addSectors = (planet: string) => {
      const pl = planet.toLowerCase();
      if (pl.includes("sun")) { sectorsSet.add("Gold"); sectorsSet.add("Nifty50"); }
      else if (pl.includes("moon")) { sectorsSet.add("Silver"); sectorsSet.add("Intraday Options"); }
      else if (pl.includes("mercury")) { sectorsSet.add("Tech Sector"); sectorsSet.add("Forex Pairs"); sectorsSet.add("Communications"); }
      else if (pl.includes("venus")) { sectorsSet.add("Banking Index"); sectorsSet.add("Luxury Goods"); sectorsSet.add("Soft Commodities"); }
      else if (pl.includes("mars")) { sectorsSet.add("Crude Oil"); sectorsSet.add("Defense Stocks"); sectorsSet.add("Industrial Metals"); }
      else if (pl.includes("jupiter")) { sectorsSet.add("Financials"); sectorsSet.add("Large Caps"); sectorsSet.add("Agricultural Assets"); }
      else if (pl.includes("saturn")) { sectorsSet.add("Real Estate"); sectorsSet.add("Heavy Industry"); sectorsSet.add("Value Equities"); }
      else if (pl.includes("uranus")) { sectorsSet.add("Cryptocurrencies"); sectorsSet.add("Tech Growth"); sectorsSet.add("NASDAQ"); }
      else if (pl.includes("neptune")) { sectorsSet.add("Oil & Gas"); sectorsSet.add("Pharmaceuticals"); sectorsSet.add("Speculative Assets"); }
      else if (pl.includes("pluto")) { sectorsSet.add("Treasuries"); sectorsSet.add("Mining Sector"); sectorsSet.add("Macro Indexes"); }
      else { sectorsSet.add("S&P 500"); sectorsSet.add("Commodities"); }
    };
    addSectors(p1);
    addSectors(p2);
    const sectors = Array.from(sectorsSet).slice(0, 3);

    const getPlanetDesc = (planet: string): string => {
      const pl = planet.toLowerCase();
      if (pl.includes("sun")) return "the solar core of global sentiment and sovereign confidence";
      if (pl.includes("moon")) return "the lunar driver of high-frequency market emotions and short-term volatility";
      if (pl.includes("mercury")) return "the mercurial ruler of communication networks, algorithms, and trade flow speed";
      if (pl.includes("venus")) return "the venusian governor of monetary valuations, currency rates, and soft assets";
      if (pl.includes("mars")) return "the martial catalyst of rapid breakout trends and commodity price impulses";
      if (pl.includes("jupiter")) return "the jovian expander of capital expansion, speculative optimism, and macro trends";
      if (pl.includes("saturn")) return "the saturnian anchor of long-term cycles, heavy infrastructure, and system-wide resistance";
      if (pl.includes("uranus")) return "the uranian spark of high-velocity tech disruption and unexpected options gap-openings";
      if (pl.includes("neptune")) return "the neptunian flow of oil-liquidity, speculative credit bubbles, and sentiment shifts";
      if (pl.includes("pluto")) return "the plutonian force governing structural macro-policy changes and consolidation cycles";
      return "the primary celestial indicator";
    };

    let aspectDesc = "";
    let toneDesc = "";
    const aspL = asp.toLowerCase();
    if (aspL.includes("conjunction")) {
      aspectDesc = "instigates a potent fusion of planetary energy, initiating a fresh long-term cycle pivot and deep-pocket capital accumulation.";
      toneDesc = "Observe key support/resistance boundaries for a dramatic volume-backed breakout.";
    } else if (aspL.includes("opposition")) {
      aspectDesc = "establishes maximum astronomical tension along the zodiacal plane, signaling critical momentum exhaustion and near-term trend correction.";
      toneDesc = "A major trend reversal or cycle pivot is highly probable as buyers and sellers collide.";
    } else if (aspL.includes("square")) {
      aspectDesc = "creates a high-friction geometric angle that triggers abrupt price-action anomalies and immediate option volatility expansion.";
      toneDesc = "Traders are advised to deploy hedging strategies as intraday volatility limits are tested.";
    } else if (aspL.includes("trine")) {
      aspectDesc = "builds a harmonious cosmic relationship, indicating extremely clean bullish trend continuation and robust institutional accumulation.";
      toneDesc = "Expect highly persistent price waves with comfortable defensive action on pullbacks.";
    } else {
      aspectDesc = "forges a supportive minor transit alignment, facilitating steady liquidity dispersion and smooth low-vix option decay.";
      toneDesc = "Prompts a constructive backdrop for gradual sector-rotation and range accumulation.";
    }

    const p1Desc = getPlanetDesc(p1);
    const p2Desc = getPlanetDesc(p2);

    const marketImpact = `The celestial ${asp} between ${p1} (${p1Desc}) and ${p2} (${p2Desc}) ${aspectDesc} This alignment heavily targets institutional flows. ${toneDesc}`;

    let strength = "MEDIUM";
    if (aspL.includes("conjunction") || aspL.includes("opposition") || aspL.includes("square")) {
      strength = "HIGH";
    } else if (aspL.includes("sextile")) {
      strength = "LOW";
    }

    return { marketImpact, sectors, strength };
  };

  // Gemini AI Analysis for planetary transits and aspect cycles
  app.post("/api/planetary-transits/analyze", async (req, res) => {
    const { transits } = req.body;
    if (!transits || !Array.isArray(transits) || transits.length === 0) {
      return res.json({ analysis: "No transits provided for analysis." });
    }

    const buildLocalReport = () => {
      const transitsSlice = transits.slice(0, 5);
      const listItems = transitsSlice.map((t: any, idx: number) => {
        const fallbackInfo = getFallbackAnalysis(t.planet1 || "", t.planet2 || "", t.aspectType || "");
        return `${idx + 1}. **${t.planet1} (${t.planet1Symbol || ''}) ${t.aspectType} (${t.aspectSymbol || ''}) ${t.planet2} (${t.planet2Symbol || ''})** - ${fallbackInfo.marketImpact}`;
      }).join("\n");

      return `### Astrological Aspects & Cycle Triggers

The current celestial geometry is characterized by several high-significance alignments that mark key cycle turn windows. According to W.D. Gann's theory of price-time squaring, these geometric angles create potent polarities in market energy:

${listItems || "No active transits are selected for mathematical cycle triggers."}

### Sectoral Impacts

The active planetary transits trigger specific sectoral rotations and volatility spikes across global capital markets:

*   **Technology & Cryptocurrencies (NASDAQ / BTC):** Heavily influenced by the active transits involving Uranus or Mercury. Expect rapid, momentum-driven breakouts as high-friction geometric angles trigger short-term option volatility.
*   **Energy & Industrial Commodities (Crude Oil / Metals):** Impacted by Mars and Saturn alignments. These transits indicate tight supply-side resistance and sudden impulse moves during active conjunctions.
*   **Banking & Large-Cap Equities:** Influenced by Venus and Jupiter aspects. Harmonious alignments facilitate smooth capital accumulation, whereas squares or oppositions warrant conservative hedging policies.

### Gold Market Overview

Gold thrives on sovereign alignments and solar harmonics. Under the current planetary alignments:

1.  **Gann Solstice Pivots:** Solar-Venus alignments point to critical price-time intersections. These coordinates represent traditional exhaustion zones and trend pivots for Gold prices.
2.  **Safe-Haven Inflows:** Conflicting aspects in the outer solar system may introduce sudden spikes in speculative inflation or monetary caution, reinforcing Gold's role as an unbacked store of value.
3.  **Price-Time Invalidation:** Should gold prices breach the immediate Gann 180-degree mathematical angle, expect a swift continuation toward the next harmonic target level. Use disciplined risk parameters.`;
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[Proxy] GEMINI_API_KEY missing. Seamlessly falling back to local programmatic analyst.");
      return res.json({ analysis: buildLocalReport(), isFallback: true });
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

      // Construct a concise summary of the transits
      const transitSummaries = transits.slice(0, 10).map((t, idx) => {
        return `${idx + 1}. Date: ${t.date} ${t.time} - ${t.planet1} (${t.planet1Symbol || ''}) in ${t.aspectType} (${t.aspectSymbol || ''}) to ${t.planet2} (${t.planet2Symbol || ''}) at ${t.degree || 'exact degree'}. Sensitivity: ${t.strength || 'HIGH'} impact. Sectors: ${Array.isArray(t.sectors) ? t.sectors.join(', ') : t.sectors}`;
      }).join("\n");

      const prompt = `You are an expert financial astrologer and quantitative analyst specializing in W.D. Gann's cycle theories and celestial geometry.
Analyze the following active planetary transits and aspects for their astrological significance, sectoral market impacts, and specific overview for the Gold market:

${transitSummaries}

Please write a highly polished, professional, and clear market insight report. Ensure the structure is pristine, clean, and has absolutely no unnecessary introductory filler or system conversational meta-comments.

Provide exactly three clear markdown sections:
1. ### Astrological Aspects & Cycle Triggers
   (Provide a high-quality synthesis of these active celestial geometries. How do these oppositions/conjunctions/squares/sextiles/trines create polarities or cycle turn windows according to Gann theory?)
2. ### Sectoral Impacts
   (Explain the specific expected impacts and volatility windows for Equities, Forex, Crude Oil, or other sensitive sectors mentioned in the transits.)
3. ### Gold Market Overview
   (Provide a specific Gann-style astrological correlation and overview for Gold prices during these transits. Will these alignments trigger gold price pivots, momentum exhaustions, or safe-haven shifts?)

Format strictly using clean markdown headers, bullets, and bold text. Keep it focused, objective, and deeply insight-rich.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      const analysisText = response.text || "Failed to generate market analysis. Please try again.";
      res.json({ analysis: analysisText });

    } catch (err: any) {
      console.error("[Gemini Analysis Error]:", err);
      res.json({ analysis: buildLocalReport(), isFallback: true });
    }
  });

  // Gemini AI Analysis for Today's Cosmic Windows
  app.post("/api/cosmic-windows/analyze", async (req, res) => {
    const { cosmicWindows } = req.body;
    if (!cosmicWindows) {
      return res.status(400).json({ error: "No cosmic windows data provided." });
    }

    const buildLocalReport = () => {
      const activeWindowsCount = 
        (cosmicWindows.activeMoonAlignment ? 1 : 0) +
        (cosmicWindows.activeMercAlignment ? 1 : 0) +
        (cosmicWindows.activePanchak ? 1 : 0) +
        (cosmicWindows.activeAmavasya ? 1 : 0) +
        (cosmicWindows.activeRetrogrades?.length || 0) +
        (cosmicWindows.activeIngress ? 1 : 0) +
        (cosmicWindows.activeAspect ? 1 : 0);

      let niftyScore = 0; // positive = bullish, negative = bearish
      let goldScore = 0;
      let summaryParts = [];

      if (cosmicWindows.activeMoonAlignment) {
        summaryParts.push(`Lunar alignment active: Moon Cycle aspect is at ${cosmicWindows.activeMoonAlignment.degree}.`);
        niftyScore += 1;
        goldScore += 1;
      }
      if (cosmicWindows.activeMercAlignment) {
        summaryParts.push(`Mercury cycle active: alignment at ${cosmicWindows.activeMercAlignment.degree}. This is a key technical turn window.`);
        niftyScore -= 1;
      }
      if (cosmicWindows.activePanchak) {
        summaryParts.push(`Panchak Zone is active (${cosmicWindows.activePanchak.name}), signaling heightened trend-exhaustion and reversal risk.`);
        niftyScore -= 2;
        goldScore += 1;
      }
      if (cosmicWindows.activeAmavasya) {
        summaryParts.push("Amavasya (New Moon) Reversal Window is active today, injecting cyclical volatility and short-term capital resets.");
        niftyScore -= 1;
        goldScore += 2;
      }
      if (cosmicWindows.activeRetrogrades && cosmicWindows.activeRetrogrades.length > 0) {
        const names = cosmicWindows.activeRetrogrades.map((r: any) => r.planet).join(", ");
        summaryParts.push(`Planetary retrogrades active: ${names}. This slows down direct economic momentum and creates market noise.`);
        niftyScore -= 1;
        goldScore += 1;
      }
      if (cosmicWindows.activeIngress) {
        summaryParts.push(`Planetary Ingress active: ${cosmicWindows.activeIngress.planet} enters ${cosmicWindows.activeIngress.sign}, influencing major sectoral capital flows.`);
        niftyScore += 1;
      }
      if (cosmicWindows.activeAspect) {
        summaryParts.push(`A dynamic aspect is active: ${cosmicWindows.activeAspect.planet1} ${cosmicWindows.activeAspect.aspectType} ${cosmicWindows.activeAspect.planet2}.`);
        goldScore += 1;
      }

      if (summaryParts.length === 0) {
        summaryParts.push("No major celestial triggers are active today. The cosmic grid is in a neutral state, supporting steady consolidation.");
      }

      // Derive final biases based on scores
      const niftyBias = niftyScore > 0 ? "BULLISH" : niftyScore < -1 ? "BEARISH" : niftyScore === 0 ? "NEUTRAL" : "VOLATILE";
      const goldBias = goldScore > 1 ? "BULLISH" : goldScore < 0 ? "BEARISH" : goldScore === 0 ? "NEUTRAL" : "VOLATILE";

      const reply = `### 🌌 Cosmic Alignment & Market Analysis

${summaryParts.map(p => `• ${p}`).join("\n")}

---

### 📊 Astro-Financial Market Bias

#### 🇮🇳 Nifty 50: **${niftyBias}**
The astrological indicators suggest a **${niftyBias.toLowerCase()}** outlook for Nifty 50. ${
        niftyBias === "BULLISH" ? "Positive planetary ingress dates and supportive moon cycle coordinates favor short-term upward continuation." :
        niftyBias === "BEARISH" ? "Active Panchak/Amavasya structures suggest extreme trend-exhaustion. Keep tight stop-losses on long positions as reversal risks are highly elevated." :
        niftyBias === "VOLATILE" ? "The convergence of competing lunar and retrograde forces suggests dynamic, two-sided intraday volatility." :
        "Quiet solar alignments suggest quiet consolidation and standard range-bound action."
      }

#### 🟡 Gold (XAU/USD): **${goldBias}**
Our orbital vectors show a **${goldBias.toLowerCase()}** alignment for the yellow metal. ${
        goldBias === "BULLISH" ? "As the metal of the Sun, Gold is highly favored today. Increased safe-haven seeking during volatile retrogrades/Panchak cycles supports steady accumulation." :
        goldBias === "BEARISH" ? "Lack of positive solar-venus aspects could lead to short-term profit-taking and technical consolidations." :
        "Gold prices are expected to remain tightly bound within existing geometric support levels, waiting for the next solar cycle ingress."
      }

*Disclaimer: Astro-analytical forecasts are for educational cycle tracking purposes. Always cross-verify celestial projections with local volume profile and order block indicators.*`;

      return {
        reply,
        niftyBias,
        goldBias,
        isFallback: true
      };
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[Cosmic Windows Proxy] GEMINI_API_KEY missing. Seamlessly falling back to local cosmic analysis.");
      return res.json(buildLocalReport());
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

      const prompt = `You are "Astro AI", an elite-level Financial Astrologer, Gann cycle expert, and Technical Market Analyst.
Your role is to analyze today's active cosmic windows and provide a professional-grade financial astrology market outlook.
Determine and output the market bias (BULLISH, BEARISH, VOLATILE, or NEUTRAL) and structured technical commentary for both **Nifty 50 (Indian Equities)** and **Gold (XAU/USD)**.

Here is today's active cosmic windows dataset:
${JSON.stringify(cosmicWindows, null, 2)}

You MUST:
1. Provide a professional, elegant markdown response inside the "reply" key analyzing the cumulative celestial influence of the active cosmic windows today.
2. Formulate highly specific astronomical justifications (referencing the active retrogrades, Panchak, active lunar cycle aspects, or active ingress signs) for Nifty 50 and Gold biases.
3. Determine a specific bias for both instruments.
4. Output your analysis in a valid JSON structure with exactly these keys:
   - "reply": (string, highly detailed and beautifully structured markdown containing headers, list items, and clear bias rationale)
   - "niftyBias": "BULLISH" | "BEARISH" | "NEUTRAL" | "VOLATILE"
   - "goldBias": "BULLISH" | "BEARISH" | "NEUTRAL" | "VOLATILE"

Make sure your output is valid JSON and only returns JSON. Do not include introductory text outside the JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const resultText = response.text || "{}";
      let parsed = { reply: "", niftyBias: "NEUTRAL", goldBias: "NEUTRAL" };
      try {
        parsed = JSON.parse(resultText);
      } catch (parseErr) {
        console.warn("[Cosmic Windows] Failed to parse JSON directly, extracting code block...", parseErr);
        const match = resultText.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          throw new Error("Unable to parse JSON from Gemini response.");
        }
      }

      res.json({
        reply: parsed.reply || buildLocalReport().reply,
        niftyBias: parsed.niftyBias || "NEUTRAL",
        goldBias: parsed.goldBias || "NEUTRAL",
        isFallback: false
      });

    } catch (err: any) {
      console.error("[Cosmic Windows Gemini Error]:", err);
      res.json(buildLocalReport());
    }
  });

  // Gemini AI Alignment Enrichment for planetary transits
  app.post("/api/planetary-transits/enrich", async (req, res) => {
    const { transits } = req.body;
    if (!transits || !Array.isArray(transits) || transits.length === 0) {
      return res.json({ transits: [] });
    }

    const runFallbackEnrichment = () => {
      console.log("[Proxy] Running local financial astrology fallback engine for transits.");
      return transits.map((original) => {
        const fallback = getFallbackAnalysis(original.planet1, original.planet2, original.aspectType);
        return {
          ...original,
          marketImpact: fallback.marketImpact,
          sectors: fallback.sectors,
          strength: fallback.strength,
        };
      });
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[Proxy] GEMINI_API_KEY not found. Seamlessly falling back to programmatic astro analyzer.");
      return res.json({ transits: runFallbackEnrichment(), isFallback: true });
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

      // We enrich a batch of transits to keep it fast and responsive
      const batchToEnrich = transits.slice(0, 20);

      const transitSummaries = batchToEnrich.map((t) => {
        return {
          id: t.id,
          date: t.date,
          time: t.time,
          planet1: t.planet1,
          planet2: t.planet2,
          aspectType: t.aspectType,
          degree: t.degree || "0"
        };
      });

      const prompt = `You are a professional financial astrologer, astronomer, and market cycle analyst.
For each of the planetary aspects in the following JSON list, generate a specific, highly accurate-sounding, and deeply insightful financial market/sector interpretation (how the combination of these two planets and the aspect type/degree creates price trends, cycle pivots, volatility spikes, or momentum exhaustion, with references to specific historical Gann asset patterns like Gold, S&P 500, Commodities, Forex, etc.). 

Return a JSON array of objects, where each object has:
- "id": (must match the input transit "id" exactly)
- "marketImpact": (a high-quality, professional, 2-3 sentence market alignment analysis. Avoid generic placeholder phrases like "cycles convergence" or "planetary alignment" - write a highly specific, deep, and convincing professional market impact analysis)
- "sectors": (an array of 2-4 sensitive sectors/assets, e.g. ["Gold", "NASDAQ", "USD Forex", "Crude Oil", "Treasuries"])
- "strength": (either "HIGH", "MEDIUM", or "LOW" based on the celestial significance of this aspect)

Input list to enrich:
${JSON.stringify(transitSummaries, null, 2)}

Return ONLY a valid JSON array matching the structure described. Do not wrap in markdown or include any introductory text.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const resultText = response.text || "[]";
      let enrichedData = [];
      try {
        enrichedData = JSON.parse(resultText);
      } catch (parseErr) {
        console.warn("[Enrich] Failed to parse Gemini JSON output directly. Attempting to extract clean JSON block...", parseErr);
        const match = resultText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (match) {
          enrichedData = JSON.parse(match[0]);
        } else {
          throw new Error("Unable to extract clean JSON array from Gemini response.");
        }
      }

      const enrichedMap = new Map(enrichedData.map((e: any) => [e.id, e]));
      
      const mergedTransits = transits.map((original) => {
        const enriched = enrichedMap.get(original.id);
        if (enriched) {
          return {
            ...original,
            marketImpact: enriched.marketImpact || original.marketImpact,
            sectors: Array.isArray(enriched.sectors) ? enriched.sectors : original.sectors,
            strength: (enriched.strength === "HIGH" || enriched.strength === "MEDIUM" || enriched.strength === "LOW") ? enriched.strength : original.strength,
          };
        } else {
          // Fallback if not in the batch or empty response
          const fallback = getFallbackAnalysis(original.planet1, original.planet2, original.aspectType);
          return {
            ...original,
            marketImpact: fallback.marketImpact,
            sectors: fallback.sectors,
            strength: fallback.strength,
          };
        }
      });

      res.json({ transits: mergedTransits });

    } catch (err: any) {
      console.warn("[Gemini Transit Enrichment Error - Overload/503/Timeout/Key]:", err);
      console.log("[Proxy] Seamlessly falling back to programmatic astro analyzer to ensure zero service disruption.");
      try {
        res.json({ transits: runFallbackEnrichment(), isFallback: true });
      } catch (fallbackErr) {
        res.status(500).json({ error: "Failed to generate fallback astrological insights." });
      }
    }
  });

  // Yahoo Finance (yfinance) and global candle proxy
  app.get("/api/ohlcv", async (req, res) => {
    const source = req.query.source as string || "yfinance";
    const symbol = req.query.symbol as string || "RELIANCE.NS";
    const interval = req.query.interval as string || "5m";
    const limit = parseInt(req.query.limit as string) || 200;

    console.log(`[Proxy OHLCV] Source: ${source}, Symbol: ${symbol}, Interval: ${interval}, Limit: ${limit}`);

    if (source === "yfinance") {
      let range = "1mo";
      let yfInterval = interval;

      if (interval === "1m") {
        range = "1d";
      } else if (interval === "5m" || interval === "15m") {
        range = "5d";
      } else if (interval === "1h") {
        range = "1mo";
      } else if (interval === "4h") {
        range = "1mo";
        yfInterval = "1h"; // Yahoo doesn't support 4h directly
      } else if (interval === "1d") {
        range = "1y";
      }

      const encodedSymbol = encodeURIComponent(symbol);
      const url1 = `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?interval=${yfInterval}&range=${range}`;
      const url2 = `https://query2.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?interval=${yfInterval}&range=${range}`;

      let response;
      try {
        response = await axios.get(url1, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });
      } catch (err1: any) {
        console.warn(`[Proxy OHLCV] query1 failed: ${err1.message}. Trying query2...`);
        try {
          response = await axios.get(url2, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
          });
        } catch (err2: any) {
          console.error("[Proxy OHLCV] Both query1 and query2 failed:", err2.message);
          return res.json({ candles: [], error: `Failed to fetch from Yahoo Finance: ${err2.message}` });
        }
      }

      try {
        if (!response || !response.data || !response.data.chart || !response.data.chart.result || response.data.chart.result.length === 0) {
          return res.json({ candles: [], error: "No chart data returned from Yahoo Finance" });
        }

        const result = response.data.chart.result[0];
        const timestamps = result.timestamp || [];
        const quote = result.indicators?.quote?.[0] || {};
        const opens = quote.open || [];
        const highs = quote.high || [];
        const lows = quote.low || [];
        const closes = quote.close || [];
        const volumes = quote.volume || [];

        const candles = [];
        for (let i = 0; i < timestamps.length; i++) {
          if (opens[i] == null || highs[i] == null || lows[i] == null || closes[i] == null) {
            continue;
          }
          candles.push({
            time: timestamps[i],
            open: parseFloat(opens[i].toFixed(2)),
            high: parseFloat(highs[i].toFixed(2)),
            low: parseFloat(lows[i].toFixed(2)),
            close: parseFloat(closes[i].toFixed(2)),
            volume: volumes[i] ? parseFloat(volumes[i].toFixed(2)) : 0
          });
        }

        const sliced = candles.slice(-limit);
        res.json({ candles: sliced });
      } catch (err: any) {
        console.error("[Proxy OHLCV] Error parsing Yahoo response:", err.message);
        res.json({ candles: [], error: `Failed to parse Yahoo response: ${err.message}` });
      }
    } else if (source === "binance") {
      // Fetch from Binance public api
      let binInterval = interval;
      if (interval === "4h") binInterval = "4h";
      const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${binInterval}&limit=${limit}`;
      try {
        const response = await axios.get(url);
        const candles = response.data.map((k: any) => ({
          time: Math.floor(k[0] / 1000),
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5])
        }));
        res.json({ candles });
      } catch (err: any) {
        res.status(500).json({ error: `Failed to fetch from Binance: ${err.message}` });
      }
    } else {
      res.status(400).json({ error: "Unsupported source on the proxy" });
    }
  });

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

  // Astro AI Chat Endpoint
  app.post("/api/astro-ai/chat", async (req, res) => {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages array in request body." });
    }
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[Astro AI] GEMINI_API_KEY missing. Cannot proceed with Gemini query.");
      const lastMsg = messages[messages.length - 1]?.content || "";
      return res.json({ 
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
        return res.json({ reply: "Greetings, Trader. How can I assist you with market cycles or celestial paths today?" });
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

      res.json({ reply, citations });

    } catch (error: any) {
      console.error("[Astro AI Chat Error]:", error);
      const lastMsg = messages[messages.length - 1]?.content || "";
      res.json({ 
        reply: getLocalAstroFallback(lastMsg), 
        citations: [],
        isFallback: true,
        note: "Astro AI core network is highly active or rate-limited. Falling back to local celestial telemetry."
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
