import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Compass, 
  Calendar, 
  Clock, 
  Zap, 
  Search,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Link,
  Database,
  Copy,
  Check,
  Sparkles,
  ChevronRight
} from "lucide-react";

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export interface IngressEvent {
  planet: string;
  symbol: string;
  sign: string;
  signSymbol: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM UTC
  marketImpact: string;
}

// Complete static fallback dataset (fully matching what was originally in the app)
export const STATIC_INGRESS_DATA: IngressEvent[] = [
  // --- 2026 ---
  { planet: "Neptune", symbol: "♆", sign: "Aries", signSymbol: "♈", date: "2026-01-26", time: "17:38 UTC", marketImpact: "Historical 14-year shift: Neptune enters Aries. Triggers long-term cycles in synthetic biology, pharma, marine logistics, and green fuels." },
  { planet: "Saturn", symbol: "♄", sign: "Aries", signSymbol: "♈", date: "2026-02-14", time: "00:12 UTC", marketImpact: "Critical 29-year cycle transition: Saturn enters Aries. Tightens global credit channels and triggers industrial restructuring." },
  { planet: "Sun", symbol: "☉", sign: "Aries", signSymbol: "♈", date: "2026-03-20", time: "14:46 UTC", marketImpact: "Spring Equinox: Solar ingress into Aries. High-probability global market trend pivot and gold sector volume surge." },
  { planet: "Uranus", symbol: "♅", sign: "Gemini", signSymbol: "♊", date: "2026-04-26", time: "00:52 UTC", marketImpact: "Major 7-year transit: Uranus enters Gemini. Revamps telecom, 5G/6G grids, internet routing, and quantum computing." },
  { planet: "Sun", symbol: "☉", sign: "Cancer", signSymbol: "♋", date: "2026-06-21", time: "08:25 UTC", marketImpact: "Summer Solstice: Solar ingress into Cancer. Seasonal turnaround in sovereign debt yields and housing finance channels." },
  { planet: "Jupiter", symbol: "♃", sign: "Leo", signSymbol: "♌", date: "2026-06-30", time: "05:52 UTC", marketImpact: "Major cyclical shift: Jupiter enters Leo. Supports speculative stock market booms, high-end retail, and precious metals." },
  { planet: "North Node", symbol: "☊", sign: "Aquarius", signSymbol: "♒", date: "2026-08-18", time: "20:35 UTC", marketImpact: "Nodal shift to Aquarius: Sparks long-term decentralized network expansion and web infrastructure updates." },
  { planet: "Sun", symbol: "☉", sign: "Libra", signSymbol: "♎", date: "2026-09-23", time: "00:05 UTC", marketImpact: "Autumn Equinox: Solar ingress into Libra. Historical trigger for forex updates and global trade balance realignments." },
  { planet: "Sun", symbol: "☉", sign: "Capricorn", signSymbol: "♑", date: "2026-12-21", time: "20:50 UTC", marketImpact: "Winter Solstice: Solar ingress into Capricorn. Marks institutional asset reallocations for the upcoming fiscal year." },

  // --- 2027 ---
  { planet: "Sun", symbol: "☉", sign: "Aries", signSymbol: "♈", date: "2027-03-20", time: "20:25 UTC", marketImpact: "Spring Equinox 2027: Broad index volumes spike as speculative interest renews." },
  { planet: "Chiron", symbol: "⚷", sign: "Taurus", signSymbol: "♉", date: "2027-04-14", time: "14:57 UTC", marketImpact: "Long-term healing transit: Chiron in Taurus shifts focus to agricultural restoration, land value appraisals, and food tech." },
  { planet: "Sun", symbol: "☉", sign: "Cancer", signSymbol: "♋", date: "2027-06-21", time: "14:11 UTC", marketImpact: "Summer Solstice 2027: Seasonal shifts in capital flows, home lending, and global agricultural futures." },
  { planet: "Jupiter", symbol: "♃", sign: "Virgo", signSymbol: "♍", date: "2027-07-26", time: "04:49 UTC", marketImpact: "Major cyclical shift: Jupiter enters Virgo. Boosts precision health tech, manufacturing optimization, and clinical trial budgets." },
  { planet: "Mars", symbol: "♂", sign: "Scorpio", signSymbol: "♏", date: "2027-09-02", time: "01:52 UTC", marketImpact: "Aggressive actions in oil drilling, defense-tech investments, and cyber security protocols." },
  { planet: "Sun", symbol: "☉", sign: "Libra", signSymbol: "♎", date: "2027-09-23", time: "06:02 UTC", marketImpact: "Autumn Equinox 2027: High probability currency rate adjustments and international trade alignments." },
  { planet: "Sun", symbol: "☉", sign: "Capricorn", signSymbol: "♑", date: "2027-12-22", time: "02:42 UTC", marketImpact: "Winter Solstice 2027: Sovereign asset restructuring and portfolio rebalancing." },

  // --- 2028 ---
  { planet: "Sun", symbol: "☉", sign: "Aries", signSymbol: "♈", date: "2028-03-20", time: "02:17 UTC", marketImpact: "Spring Equinox 2028: Accelerates trading in gold and metal commodity contracts." },
  { planet: "Saturn", symbol: "♄", sign: "Taurus", signSymbol: "♉", date: "2028-04-13", time: "03:40 UTC", marketImpact: "Major 2.5-year cycle: Saturn enters Taurus. Restricts traditional banking liquidity, land development, and real estate credit." },
  { planet: "Sun", symbol: "☉", sign: "Cancer", signSymbol: "♋", date: "2028-06-20", time: "20:02 UTC", marketImpact: "Summer Solstice 2028: Pivotal turn in capital bond yields and national mortgage products." },
  { planet: "Jupiter", symbol: "♃", sign: "Libra", signSymbol: "♎", date: "2028-08-24", time: "05:09 UTC", marketImpact: "Major cyclical shift: Jupiter enters Libra. Fosters international commercial alliances, legal system updates, and major mergers." },
  { planet: "Sun", symbol: "☉", sign: "Libra", signSymbol: "♎", date: "2028-09-22", time: "11:45 UTC", marketImpact: "Autumn Equinox 2028: Currency trade-agreement resets and international shipping route reassessment." },
  { planet: "Sun", symbol: "☉", sign: "Capricorn", signSymbol: "♑", date: "2028-12-21", time: "08:20 UTC", marketImpact: "Winter Solstice 2028: Institutional asset allocation sweeps and sovereign bond revisions." },

  // --- 2029 ---
  { planet: "Sun", symbol: "☉", sign: "Aries", signSymbol: "♈", date: "2029-03-20", time: "08:02 UTC", marketImpact: "Spring Equinox 2029: High probability of broad index trend reversals and energy sector volume surges." },
  { planet: "Sun", symbol: "☉", sign: "Cancer", signSymbol: "♋", date: "2029-06-21", time: "01:48 UTC", marketImpact: "Summer Solstice 2029: Seasonal realignments in money-market funds and agricultural indices." },
  { planet: "Jupiter", symbol: "♃", sign: "Scorpio", signSymbol: "♏", date: "2029-09-24", time: "06:24 UTC", marketImpact: "Major cyclical shift: Jupiter enters Scorpio. Liquidates high-risk assets, fuels massive private equity and debt workouts." },
  { planet: "Sun", symbol: "☉", sign: "Libra", signSymbol: "♎", date: "2029-09-22", time: "17:39 UTC", marketImpact: "Autumn Equinox 2029: Trade tariff audits, global balance of payment reconciliations." },
  { planet: "Sun", symbol: "☉", sign: "Capricorn", signSymbol: "♑", date: "2029-12-21", time: "14:14 UTC", marketImpact: "Winter Solstice 2029: Closing ledger allocations, governmental infrastructure plan updates." },

  // --- 2030 ---
  { planet: "Mars", symbol: "♂", sign: "Aries", signSymbol: "♈", date: "2030-02-27", time: "19:07 UTC", marketImpact: "Aggressive breakouts in industrial machinery, steel fabrication, and defense tech." },
  { planet: "Sun", symbol: "☉", sign: "Aries", signSymbol: "♈", date: "2030-03-20", time: "13:52 UTC", marketImpact: "Spring Equinox 2030: Seasonal turn. Spikes resource indices, mining activities, and gold options." },
  { planet: "Saturn", symbol: "♄", sign: "Gemini", signSymbol: "♊", date: "2030-06-01", time: "02:34 UTC", marketImpact: "Major 2.5-year cycle: Saturn enters Gemini. Introduces strict regulatory frameworks on shipping, aviation, and transport logistics." },
  { planet: "Sun", symbol: "☉", sign: "Cancer", signSymbol: "♋", date: "2030-06-21", time: "07:31 UTC", marketImpact: "Summer Solstice 2030: Interest rate adjustments and housing sector volume sweeps." },
  { planet: "Jupiter", symbol: "♃", sign: "Sagittarius", signSymbol: "♐", date: "2030-10-22", time: "23:14 UTC", marketImpact: "Major cyclical shift: Jupiter enters Sagittarius. Broad-spectrum bullish optimism in global shipping, trade, and aviation." },
  { planet: "Sun", symbol: "☉", sign: "Libra", signSymbol: "♎", date: "2030-09-22", time: "23:27 UTC", marketImpact: "Autumn Equinox 2030: Focus on international currency trade bands and FX stability ratios." },
  { planet: "Sun", symbol: "☉", sign: "Capricorn", signSymbol: "♑", date: "2030-12-21", time: "20:10 UTC", marketImpact: "Winter Solstice 2030: Sovereign debt realignments and year-end bookkeeping." }
];

// Robust Client-side CSV Parser for Planetary Ingress spreadsheet
export const parseCSVTextIngress = (csvText: string): IngressEvent[] => {
  const events: IngressEvent[] = [];
  if (!csvText || typeof csvText !== "string") return events;

  const lines = csvText.split(/\r?\n/);
  
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
        if (lower.includes("year")) yearIdx = idx;
        else if (lower.includes("date")) dateIdx = idx;
        else if (lower.includes("time")) timeIdx = idx;
        else if (lower.includes("planet")) planetIdx = idx;
        else if (lower.includes("sign")) signIdx = idx;
        else if (lower.includes("impact") || lower.includes("market") || lower.includes("description") || lower.includes("gann")) impactIdx = idx;
      });
    }
  }

  const normalizeDate = (rawDate: string, year?: string): string => {
    let normalizedDate = rawDate.trim();
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
      "jan": "01", "january": "01", "feb": "02", "february": "02", "mar": "03", "march": "03",
      "apr": "04", "april": "04", "may": "05", "jun": "06", "june": "06", "jul": "07", "july": "07",
      "aug": "08", "august": "08", "sep": "09", "september": "09", "oct": "10", "october": "10",
      "nov": "11", "november": "11", "dec": "12", "december": "12"
    };
    const monthMatch = normalizedDate.match(/([a-zA-Z]+)/);
    const dayMatch = normalizedDate.match(/(\d+)/);
    if (monthMatch && dayMatch) {
      const mName = monthMatch[1].toLowerCase();
      const mNum = months[mName];
      const dNum = dayMatch[1].padStart(2, "0");
      if (mNum && dNum) {
        return `${year || "2026"}-${mNum}-${dNum}`;
      }
    }
    return normalizedDate;
  };

  const PLANET_SYMBOLS: Record<string, string> = {
    "sun": "☉", "moon": "☽", "mercury": "☿", "venus": "♀", "mars": "♂",
    "jupiter": "♃", "saturn": "♄", "uranus": "♅", "neptune": "♆", "pluto": "♇",
    "north node": "☊", "south node": "☋", "chiron": "⚷", "rahu": "☊", "ketu": "☋"
  };

  const SIGN_SYMBOLS: Record<string, string> = {
    "aries": "♈", "taurus": "♉", "gemini": "♊", "cancer": "♋", "leo": "♌", "virgo": "♍",
    "libra": "♎", "scorpio": "♏", "sagittarius": "♐", "capricorn": "♑", "aquarius": "♒", "pisces": "♓"
  };

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
    let customImpact = impactIdx !== -1 && cols[impactIdx] ? cols[impactIdx].trim() : "";

    if (sign.toLowerCase() === "enters" && cols.length > 5) {
      sign = cols[5].trim();
      customImpact = cols.length >= 7 ? cols[6].trim() : "";
    }

    const cleanPlanet = planet.replace(/[\"']/g, "").trim();
    const cleanSign = sign.replace(/[\"']/g, "").trim();
    if (!cleanPlanet || !cleanSign) continue;

    const pSymbol = PLANET_SYMBOLS[cleanPlanet.toLowerCase()] || "☿";
    const sSymbol = SIGN_SYMBOLS[cleanSign.toLowerCase()] || "♈";
    const normalizedDate = normalizeDate(rawDate, rawYear);

    events.push({
      planet: cleanPlanet,
      symbol: pSymbol,
      sign: cleanSign,
      signSymbol: sSymbol,
      date: normalizedDate,
      time,
      marketImpact: customImpact || `${cleanPlanet} entering ${cleanSign} zodiac transit.`
    });
  }

  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return events;
};

export default function PlanetaryIngressDates({ isAdmin = false }: { isAdmin?: boolean } = {}) {
  const [isExplorerOpen, setIsExplorerOpen] = useState<boolean>(false);
  const [ingressData, setIngressData] = useState<IngressEvent[]>(() => {
    const saved = localStorage.getItem("planetary_ingress_custom_data");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return STATIC_INGRESS_DATA;
      }
    }
    return STATIC_INGRESS_DATA;
  });
  const [selectedPlanet, setSelectedPlanet] = useState<string>("ALL");
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [rawSearchText, setRawSearchText] = useState<string>("");
  const [timeFilter, setTimeFilter] = useState<"ALL" | "UPCOMING" | "PAST">("UPCOMING");
  const [upcomingPlanet, setUpcomingPlanet] = useState<string>("ALL");

  // Astro AI States
  const [isAstroAiLoading, setIsAstroAiLoading] = useState<boolean>(false);
  const [astroAiRun, setAstroAiRun] = useState<boolean>(() => {
    return localStorage.getItem("planetary_ingress_astro_ai_run") === "true";
  });
  const [isAstroAiFallback, setIsAstroAiFallback] = useState<boolean>(() => {
    return localStorage.getItem("planetary_ingress_astro_ai_fallback") === "true";
  });
  
  // Custom Google Sheets or Apps Script Web App source
  const [customSourceUrl, setCustomSourceUrl] = useState<string>(() => localStorage.getItem("planetary_ingress_custom_url") || "https://script.google.com/macros/s/AKfycbxvfJv35_2d9TPoUoA5XvaYwI5zMpG6H5lpi0Vd-QorhvwcPCu6OzeUw0hhS4cgeJ7Tfg/exec");
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [inputUrl, setInputUrl] = useState<string>(() => localStorage.getItem("planetary_ingress_custom_url") || "https://script.google.com/macros/s/AKfycbxvfJv35_2d9TPoUoA5XvaYwI5zMpG6H5lpi0Vd-QorhvwcPCu6OzeUw0hhS4cgeJ7Tfg/exec");

  // Loading & sync state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<"loading" | "synced" | "error" | "offline">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFactoryDefault, setIsFactoryDefault] = useState<boolean>(true);

  // System Date
  const today = useMemo(() => {
    const realDate = new Date();
    const realYear = realDate.getFullYear();
    if (realYear >= 2026 && realYear <= 2036) {
      return new Date(Date.UTC(realDate.getUTCFullYear(), realDate.getUTCMonth(), realDate.getUTCDate()));
    } else {
      return new Date(Date.UTC(2026, 5, 28)); // Fallback: 2026-06-28
    }
  }, []);

  const todayStr = useMemo(() => {
    return today.toISOString().split("T")[0];
  }, [today]);

  // Fetch ingress data from server proxy with multiple client-side fallbacks
  const loadIngressData = async (targetUrl?: string) => {
    try {
      setIsLoading(true);
      setSyncStatus("loading");
      setErrorMsg(null);

      const urlToUse = targetUrl !== undefined ? targetUrl : customSourceUrl;
      const apiEndpoint = urlToUse.trim() 
        ? `/api/planetary-ingress?url=${encodeURIComponent(urlToUse.trim())}` 
        : "/api/planetary-ingress";

      console.log(`[Ingress UI] Loading data from endpoint: ${apiEndpoint}`);
      let response;
      let json: any = null;

      // 1. Try server-side API proxy first
      try {
        response = await fetch(apiEndpoint);
        if (response.ok) {
          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            json = await response.json();
            console.log("[Ingress UI] Loaded from API proxy:", json);
          } else {
            console.warn("[Ingress UI] API proxy returned non-JSON response. Probably static hosting SPA redirect. Trying direct fallbacks...");
          }
        } else {
          console.warn(`[Ingress UI] API proxy returned status ${response.status}. Trying direct fallbacks...`);
        }
      } catch (err) {
        console.warn("[Ingress UI] API proxy fetch failed. Trying direct fallbacks...", err);
      }

      // 2. Fallback: Try direct client-side fetch from Google Apps Script Web App
      if (!json || !Array.isArray(json.events) || json.events.length === 0) {
        const gasUrl = urlToUse.trim() || "https://script.google.com/macros/s/AKfycbxvfJv35_2d9TPoUoA5XvaYwI5zMpG6H5lpi0Vd-QorhvwcPCu6OzeUw0hhS4cgeJ7Tfg/exec";
        try {
          console.log(`[Ingress UI] Direct fetch to GAS: ${gasUrl}`);
          response = await fetch(gasUrl);
          if (response.ok) {
            const rawData = await response.json();
            if (rawData) {
              const events = Array.isArray(rawData) ? rawData : (Array.isArray(rawData.events) ? rawData.events : []);
              if (events.length > 0) {
                json = { events };
                console.log("[Ingress UI] Direct GAS fetch succeeded. Events count:", events.length);
              }
            }
          } else {
            console.warn(`[Ingress UI] Direct GAS returned status ${response.status}. Trying CSV direct fetch...`);
          }
        } catch (directErr) {
          console.warn("[Ingress UI] Direct GAS fetch failed (likely CORS or un-published script). Trying CSV direct fetch...", directErr);
        }
      }

      // 3. Fallback: Try direct client-side fetch from the Google Sheets published CSV URL
      if (!json || !Array.isArray(json.events) || json.events.length === 0) {
        const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSWqA53wQqhu2nNXSDcxeoA7gErbS0gTpPC1UjLr0ZRbIoPXmnAETdMgiPmGYuTLbmioMnxQVr6WEab/pub?gid=1478838111&single=true&output=csv";
        try {
          console.log(`[Ingress UI] Direct fetch to Google Sheet CSV: ${csvUrl}`);
          response = await fetch(csvUrl);
          if (response.ok) {
            const csvText = await response.text();
            const events = parseCSVTextIngress(csvText);
            if (events.length > 0) {
              json = { events };
              console.log("[Ingress UI] Direct Google Sheet CSV fetch & parse succeeded. Events count:", events.length);
            }
          } else {
            console.warn(`[Ingress UI] Direct Google Sheet CSV fetch returned status ${response.status}`);
          }
        } catch (csvErr: any) {
          console.error("[Ingress UI] Direct Google Sheet CSV fetch failed:", csvErr);
        }
      }

      if (json && Array.isArray(json.events) && json.events.length > 0) {
        setIngressData(json.events);
        localStorage.setItem("planetary_ingress_custom_data", JSON.stringify(json.events));
        setSyncStatus("synced");
        setIsFactoryDefault(false);
        setAstroAiRun(false);
        localStorage.removeItem("planetary_ingress_astro_ai_run");
        localStorage.removeItem("planetary_ingress_astro_ai_fallback");
      } else {
        throw new Error("Could not retrieve live planetary ingress dates from any Google Sheets downlink. Confirm Google Apps Script deployment is correct or sheet publication is active.");
      }
    } catch (error: any) {
      console.error("[Ingress UI] Error loading ingress data:", error);
      setErrorMsg(error.message || "Failed to load spreadsheet ingress transits.");
      setSyncStatus("error");
      
      // Fallback to static data on error so UI is never empty
      setIngressData(STATIC_INGRESS_DATA);
      setIsFactoryDefault(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Save / update custom data source URL
  const handleSaveUrl = async (url: string) => {
    const cleanUrl = url.trim();
    setCustomSourceUrl(cleanUrl);
    setInputUrl(cleanUrl);
    if (cleanUrl) {
      localStorage.setItem("planetary_ingress_custom_url", cleanUrl);
    } else {
      localStorage.removeItem("planetary_ingress_custom_url");
    }

    try {
      const docRef = doc(db, "settings", "planetary_ingress");
      await setDoc(docRef, { url: cleanUrl, updatedAt: new Date().toISOString() }, { merge: true });
      console.log("Successfully saved ingress URL to Firestore.");
    } catch (err) {
      console.error("Failed to save ingress URL to Firestore:", err);
    }

    loadIngressData(cleanUrl);
  };

  // Reset to default source URL
  const handleResetUrl = async () => {
    setCustomSourceUrl("");
    setInputUrl("");
    localStorage.removeItem("planetary_ingress_custom_url");

    try {
      const docRef = doc(db, "settings", "planetary_ingress");
      await setDoc(docRef, { url: "", updatedAt: new Date().toISOString() }, { merge: true });
      console.log("Successfully reset ingress URL in Firestore.");
    } catch (err) {
      console.error("Failed to reset ingress URL in Firestore:", err);
    }

    loadIngressData("");
  };

  // Run Astro AI Ingress Enrichment
  const handleRunAstroAi = async () => {
    if (ingressData.length === 0) return;
    try {
      setIsAstroAiLoading(true);
      setErrorMsg(null);
      
      const response = await fetch("/api/planetary-ingress/enrich", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ingressEvents: ingressData })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Astro AI ingress enrichment failed.");
      }

      const data = await response.json();
      if (data.ingressEvents && Array.isArray(data.ingressEvents)) {
        setIngressData(data.ingressEvents);
        localStorage.setItem("planetary_ingress_custom_data", JSON.stringify(data.ingressEvents));
        localStorage.setItem("planetary_ingress_astro_ai_run", "true");
        setAstroAiRun(true);
        
        if (data.isFallback) {
          setIsAstroAiFallback(true);
          localStorage.setItem("planetary_ingress_astro_ai_fallback", "true");
        } else {
          setIsAstroAiFallback(false);
          localStorage.removeItem("planetary_ingress_astro_ai_fallback");
        }
      }
    } catch (err: any) {
      console.error("[Astro AI Ingress] Error enriching ingress:", err);
      setErrorMsg(err.message || "Astro AI is temporarily offline. Please ensure your GEMINI_API_KEY is configured.");
    } finally {
      setIsAstroAiLoading(false);
    }
  };

  // Run dynamic fetch on mount with Firestore check
  useEffect(() => {
    const initUrlAndFetch = async () => {
      let activeUrl = customSourceUrl;
      try {
        const docRef = doc(db, "settings", "planetary_ingress");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.url !== undefined) {
            activeUrl = data.url;
            setCustomSourceUrl(data.url);
            setInputUrl(data.url);
            if (data.url) {
              localStorage.setItem("planetary_ingress_custom_url", data.url);
            } else {
              localStorage.removeItem("planetary_ingress_custom_url");
            }
          }
        }
      } catch (err) {
        console.error("Error reading saved ingress URL from Firestore on mount:", err);
      }
      loadIngressData(activeUrl);
    };
    initUrlAndFetch();
  }, []);

  // Unique list of planets for filtering (derived dynamically from actual data!)
  const planetsList = useMemo(() => {
    const set = new Set(ingressData.map((item) => item.planet));
    return Array.from(set).sort();
  }, [ingressData]);

  // Filtered ingress list
  const filteredIngress = useMemo(() => {
    return ingressData.filter((item) => {
      const itemYear = new Date(item.date).getUTCFullYear();
      const yearMatches = isNaN(itemYear) || itemYear === selectedYear;
      const planetMatches = selectedPlanet === "ALL" || item.planet.toUpperCase() === selectedPlanet.toUpperCase();
      
      const query = rawSearchText.toLowerCase().trim();
      const queryMatches = query === "" || 
        item.planet.toLowerCase().includes(query) ||
        item.sign.toLowerCase().includes(query) ||
        item.marketImpact.toLowerCase().includes(query);
      
      let timeMatches = true;
      if (timeFilter === "UPCOMING") {
        timeMatches = new Date(item.date) >= today || item.date === todayStr;
      } else if (timeFilter === "PAST") {
        timeMatches = new Date(item.date) < today && item.date !== todayStr;
      }
      
      return yearMatches && planetMatches && queryMatches && timeMatches;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [ingressData, selectedPlanet, selectedYear, rawSearchText, timeFilter, today, todayStr]);

  // Find nearest single upcoming ingress date
  const upcomingIngress = useMemo(() => {
    return ingressData.filter((item) => {
      const itemDate = new Date(item.date);
      return itemDate >= today;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  }, [ingressData, today]);

  // Calculate the next two upcoming dates based on selection
  const nextTwoUpcoming = useMemo(() => {
    return ingressData.filter((item) => {
      const itemDate = new Date(item.date);
      const isUpcoming = itemDate >= today || item.date === todayStr;
      const planetMatches = upcomingPlanet === "ALL" || item.planet.toUpperCase() === upcomingPlanet.toUpperCase();
      return isUpcoming && planetMatches;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 2);
  }, [ingressData, today, todayStr, upcomingPlanet]);

  const yearsList = useMemo(() => {
    const years = ingressData.map(item => new Date(item.date).getUTCFullYear());
    const uniqueYears = Array.from(new Set(years)).filter((y): y is number => typeof y === "number" && !isNaN(y));
    const list = uniqueYears.sort((a, b) => a - b);
    if (list.length === 0) {
      return [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036];
    }
    return list;
  }, [ingressData]);

  // Ensure selected year is in years list or select the first available
  useEffect(() => {
    if (yearsList.length > 0 && !yearsList.includes(selectedYear)) {
      setSelectedYear(yearsList[0]);
    }
  }, [yearsList, selectedYear]);

  const formatDisplayDate = (dateStr: string) => {
    const parts = dateStr.split("-");
    if (parts.length < 3) return dateStr;
    const year = parts[0];
    const monthIdx = parseInt(parts[1]) - 1;
    const day = parts[2];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (monthIdx < 0 || monthIdx >= 12) return dateStr;
    return `${day}-${months[monthIdx]}-${year}`;
  };

  return (
    <div id="planetary-ingress-section" className="space-y-6">
      {/* SECTION HEADER */}
      <div className="border-t border-terminal-border pt-6 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-md font-bold text-white uppercase tracking-widest flex items-center">
            <Compass className="w-5 h-5 text-terminal-accent mr-2 animate-pulse" />
            PLANETARY INGRESS DATES
          </h3>

          <div className="flex flex-wrap items-center gap-3 self-start sm:self-center font-mono">
            {syncStatus === "synced" && (
              <div className="flex items-center space-x-1.5 text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>DYNAMIC GOOGLE SHEETS ACTIVE</span>
              </div>
            )}
            {(syncStatus === "error" || isFactoryDefault) && (
              <div className="flex items-center space-x-1.5 text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full" title={errorMsg || "Fallback data active"}>
                <AlertTriangle className="w-3 h-3 text-amber-400 animate-bounce" />
                <span>STATIC FALLBACK ACTIVE</span>
              </div>
            )}
            {syncStatus === "loading" && (
              <div className="flex items-center space-x-1.5 text-[9px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full">
                <Loader2 className="w-3 h-3 text-sky-400 animate-spin" />
                <span>FETCHING LATEST SHEETS...</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              title="Configure Custom Google Sheet / Apps Script"
              className={`flex items-center space-x-1.5 border px-3 py-1.5 rounded transition-all cursor-pointer text-xs font-mono font-bold ${showSettings ? "bg-terminal-accent/15 border-terminal-accent text-terminal-accent" : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-terminal-accent"}`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>SETTINGS</span>
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 font-mono mt-2">
          Monitor exactly when planets change zodiac signs (Ingress) in real-time. Connected to {isAdmin ? "user-defined" : "verified"} spreadsheet for complete, uncompromised astronomical tracking.
        </p>
      </div>

      {/* CONNECTION SETTINGS PANEL */}
      {showSettings && (
        <div className="bg-black/40 border border-terminal-border rounded-lg p-5 font-mono space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h4 className="text-sm font-bold text-terminal-accent uppercase flex items-center">
              <Database className="w-4 h-4 mr-2" />
              SPREADSHEET CONNECTION MANAGER
            </h4>
            <button 
              onClick={() => setShowSettings(false)}
              className="text-xs text-gray-500 hover:text-white"
            >
              [CLOSE]
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-400 block">
              DATA SOURCE URL (PUBLISHED CSV OR GOOGLE APPS SCRIPT WEB APP URL):
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec OR https://docs.google.com/spreadsheets/d/e/.../pubhtml..."
                className="flex-1 bg-black/60 border border-white/10 rounded px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-terminal-accent font-mono"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveUrl(inputUrl)}
                  className="bg-terminal-accent/25 hover:bg-terminal-accent/40 text-terminal-accent border border-terminal-accent/45 px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                >
                  SAVE & LINK
                </button>
                {customSourceUrl && (
                  <button
                    onClick={handleResetUrl}
                    className="bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 px-3 py-1.5 rounded text-xs transition-all cursor-pointer whitespace-nowrap"
                  >
                    RESET DEFAULT
                  </button>
                )}
              </div>
            </div>
            {customSourceUrl ? (
              <p className="text-[10px] text-emerald-400 flex items-center">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Linked to custom source. Loaded data will use this endpoint.
              </p>
            ) : (
              <p className="text-[10px] text-gray-500">
                Currently using system default public spreadsheet link.
              </p>
            )}
          </div>

          <div className="border-t border-white/5 pt-4 space-y-3">
            <h5 className="text-xs font-bold text-white uppercase flex items-center">
              <Link className="w-3.5 h-3.5 text-terminal-accent mr-1.5" />
              HOW TO CONNECT YOUR OWN GOOGLE SHEET TAB
            </h5>
            
            <div className="text-[11px] text-gray-400 space-y-2 leading-relaxed">
              <p>
                If Google Sheet publishing changes or you want a robust live sync, deploy a simple <strong className="text-white">Google Apps Script Web App</strong>:
              </p>
              <ol className="list-decimal pl-4 space-y-1.5 text-gray-500">
                <li>Open your Google Sheet with the planetary ingress columns.</li>
                <li>Go to <strong className="text-gray-300">Extensions &gt; Apps Script</strong>.</li>
                <li>Click the <strong className="text-gray-300">Copy Script Code</strong> button below and replace any existing code inside the editor.</li>
                <li>Click the <strong className="text-gray-300">Save</strong> (disk) icon in Apps Script.</li>
                <li>Click <strong className="text-gray-300">Deploy &gt; New deployment</strong>.</li>
                <li>Click the gear icon next to "Select type", and choose <strong className="text-gray-300">Web app</strong>.</li>
                <li>Set Execute as: <strong className="text-gray-300">"Me" (your email)</strong>.</li>
                <li>Set Who has access: <strong className="text-gray-300">"Anyone"</strong>.</li>
                <li>Click <strong className="text-gray-300">Deploy</strong> (authorize Google permissions if prompted).</li>
                <li>Copy the <strong className="text-white">Web App URL</strong> (ends in <code className="text-terminal-accent">/exec</code>) and paste it into the input field above!</li>
              </ol>
            </div>

            {/* COPY SCRIPT CODE BUTTON & TEXT */}
            <div className="bg-black/80 border border-white/5 rounded p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500 uppercase font-bold">Google Apps Script Template Code (Code.gs)</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`/**
 * Google Apps Script Web App
 * Serves Planetary Ingress data as JSON to your Web App
 * 
 * Instructions:
 * 1. Open your Google Sheet with the Ingress Dates.
 * 2. Go to Extensions > Apps Script.
 * 3. Delete any code and paste this script.
 * 4. Click the 'Save' icon.
 * 5. Click 'Deploy' > 'New deployment'.
 * 6. Select 'Web app' (click the gear icon next to "Select type" if not visible).
 * 7. Set 'Execute as' to "Me" (your email).
 * 8. Set 'Who has access' to "Anyone".
 * 9. Click 'Deploy'. Allow permissions if prompted.
 * 10. Copy the "Web app URL" and paste it into the Web App settings panel.
 */

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.getActive();
    if (!ss) {
      return createJsonResponse({ error: "No active spreadsheet found. Make sure this script is bound to your Google Sheet." });
    }
    
    // Find the sheet. First try to find by common names, then fall back to the first active tab.
    let sheet = ss.getSheetByName('Planetary_Ingresses_2026_2036 2') || 
                ss.getSheetByName('Sheet1') || 
                ss.getSheets()[0];
                
    if (!sheet) {
      return createJsonResponse({ error: "Could not find any sheet tab in your spreadsheet." });
    }
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return createJsonResponse({ 
        message: "Sheet is empty or only contains headers.",
        events: [] 
      });
    }
    
    // Get headers to detect column layout
    const headers = sheet.getRange(1, 1, 1, Math.min(10, sheet.getLastColumn())).getValues()[0];
    
    // Default column mappings (1-indexed index mapping)
    let colYear = 1;   // Col A
    let colDate = 2;   // Col B
    let colTime = 3;   // Col C
    let colPlanet = 4; // Col D
    let colSign = 5;   // Col E
    let colImpact = 6; // Col F (optional)
    
    // Dynamically match columns based on header names if they exist
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i].toString().toLowerCase().trim();
      if (h.includes("year")) colYear = i + 1;
      else if (h.includes("date")) colDate = i + 1;
      else if (h.includes("time")) colTime = i + 1;
      else if (h.includes("planet")) colPlanet = i + 1;
      else if (h.includes("sign") || h.includes("ingress")) colSign = i + 1;
      else if (h.includes("impact") || h.includes("implication") || h.includes("description")) colImpact = i + 1;
    }
    
    const maxCols = Math.max(colYear, colDate, colTime, colPlanet, colSign, colImpact);
    const range = sheet.getRange(2, 1, lastRow - 1, maxCols);
    const values = range.getDisplayValues();
    
    const events = [];
    
    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      
      const year = row[colYear - 1] ? row[colYear - 1].trim() : "";
      const rawDate = row[colDate - 1] ? row[colDate - 1].trim() : "";
      const time = row[colTime - 1] ? row[colTime - 1].trim() : "";
      const planet = row[colPlanet - 1] ? row[colPlanet - 1].trim() : "";
      const sign = row[colSign - 1] ? row[colSign - 1].trim() : "";
      const customImpact = colImpact <= row.length && row[colImpact - 1] ? row[colImpact - 1].trim() : "";
      
      if (!rawDate || !planet || !sign) continue;
      
      events.push({
        year: year,
        date: rawDate,
        time: time,
        planet: planet,
        sign: sign,
        marketImpact: customImpact
      });
    }
    
    return createJsonResponse({
      success: true,
      count: events.length,
      events: events
    });
    
  } catch (err) {
    return createJsonResponse({ 
      success: false, 
      error: err.toString(),
      stack: err.stack 
    });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}`);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 px-2 py-0.5 rounded text-[10px] flex items-center space-x-1 cursor-pointer transition-all hover:text-terminal-accent hover:border-terminal-accent"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">COPIED!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>COPY SCRIPT CODE</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="text-[9px] text-gray-500 overflow-x-auto max-h-[120px] p-2 bg-black/40 rounded font-mono select-all">
{`function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.getActive();
  const sheet = ss.getSheets()[0]; // fetches first sheet tab
  // ... reads year, date, time, planet, sign ...
  return ContentService.createTextOutput(JSON.stringify({ success: true, events: events }))
    .setMimeType(ContentService.MimeType.JSON);
}`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Static Fallback Warning Banner */}
      {(syncStatus === "error" || isFactoryDefault) && (
        <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-4.5 font-mono text-xs text-gray-300 space-y-2.5 animate-fadeIn">
          <div className="flex items-center space-x-2 text-amber-400 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
            <span className="uppercase tracking-wider">Spreadsheet Sync Alert: Static Fallback Mode Engaged</span>
          </div>
          <p className="leading-relaxed">
            Live Google Sheets synchronization downlink is currently offline or unreachable. This often occurs on static servers (like GitHub/ingress proxies) due to CORS policies or network routing constraints.
            To keep your trading analytics fully operational, the system has automatically engaged <strong className="text-white">High-Fidelity Static Fallback Mode</strong>. High-probability 2026 ingress dates, planetary changes, and zodiac transition milestones have been loaded from pre-computed local telemetry.
          </p>
          {errorMsg && (
            <div className="text-[10px] bg-black/40 border border-white/5 rounded px-2.5 py-1.5 text-gray-400 font-mono select-all overflow-x-auto whitespace-pre-wrap max-h-24">
              Downlink Diagnostics: {errorMsg}
            </div>
          )}
          <div className="flex items-center space-x-3 pt-1">
            <button
              type="button"
              onClick={() => loadIngressData(customSourceUrl)}
              disabled={isLoading}
              className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 text-amber-400 px-3 py-1 rounded text-[10px] uppercase font-bold tracking-wider cursor-pointer transition-all disabled:opacity-50"
            >
              {isLoading ? "RETRYING DOWNLINK..." : "RETRY SYNC"}
            </button>
            <span className="text-[10px] text-gray-500">
              Downlink Status: <strong className="uppercase text-amber-500">{syncStatus}</strong>
            </span>
          </div>
        </div>
      )}

      {/* TIMELINE OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* NEAREST UPCOMING TRANSIT TRANSITION */}
        <div className="lg:col-span-6 bg-white/[0.02] border border-white/5 rounded-lg p-4 font-mono space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-xs font-bold text-white uppercase flex items-center">
              <Zap className="w-3.5 h-3.5 text-terminal-accent mr-1.5 animate-pulse" />
              NEAREST TRANSIT INGRESS TRANSITION
            </span>
            <span className="text-[9px] text-gray-500 font-bold">
              SYS DATE: {formatDisplayDate(todayStr)}
            </span>
          </div>

          {upcomingIngress ? (
            <div className="p-3 bg-terminal-accent/5 border border-terminal-accent/20 rounded-lg space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-black text-white uppercase tracking-wider flex items-center">
                    <span className="text-terminal-accent text-sm mr-1.5">{upcomingIngress.symbol}</span>
                    {upcomingIngress.planet.toUpperCase()} ENTERING {upcomingIngress.sign.toUpperCase()} {upcomingIngress.signSymbol}
                  </span>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Transition occurs on <strong className="text-white">{formatDisplayDate(upcomingIngress.date)}</strong> at <strong className="text-white">{upcomingIngress.time}</strong>
                  </p>
                </div>
                <div className="bg-terminal-accent/10 border border-terminal-accent/30 text-[9px] text-terminal-accent px-2 py-1 rounded font-black uppercase shrink-0">
                  In {Math.max(0, Math.round((new Date(upcomingIngress.date).getTime() - today.getTime()) / 86400000))} Days
                </div>
              </div>
              <p className="text-[10px] text-gray-300 pt-2 border-t border-white/5 italic leading-relaxed">
                <strong className="text-terminal-accent not-italic font-bold uppercase">Expected Impact: </strong>
                {upcomingIngress.marketImpact}
              </p>
            </div>
          ) : (
            <div className="p-6 bg-white/5 rounded text-center text-xs text-gray-500">
              No further ingress transits tracked in current system dataset.
            </div>
          )}
        </div>

        {/* NEXT TWO UPCOMING DATES - PLANET FILTRATION */}
        <div className="lg:col-span-6 bg-white/[0.02] border border-white/5 rounded-lg p-4 font-mono space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-xs font-bold text-white uppercase flex items-center">
              <Calendar className="w-3.5 h-3.5 text-terminal-accent mr-1.5" />
              NEXT TWO UPCOMING DATES
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-[9px] text-gray-500 uppercase font-bold">PLANET:</span>
              <select
                value={upcomingPlanet}
                onChange={(e) => setUpcomingPlanet(e.target.value)}
                className="bg-terminal-bg border border-terminal-border rounded px-2 py-0.5 text-[9px] text-white focus:border-terminal-accent outline-none font-mono cursor-pointer uppercase font-bold"
              >
                <option value="ALL">ALL</option>
                {planetsList.map((p) => (
                  <option key={p} value={p}>{p.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {nextTwoUpcoming.map((event, idx) => {
              const daysDiff = Math.round((new Date(event.date).getTime() - today.getTime()) / 86400000);
              const isToday = event.date === todayStr;

              return (
                <div key={idx} className="p-3 bg-terminal-accent/[0.03] border border-white/5 rounded-lg flex flex-col justify-between space-y-2 hover:border-terminal-accent/30 transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-white uppercase tracking-wider flex items-center">
                        <span className="text-terminal-accent text-xs mr-1">{event.symbol}</span>
                        {event.planet}
                      </span>
                      <span className="text-[9px] font-bold text-terminal-accent bg-terminal-accent/10 px-1.5 py-0.5 rounded uppercase">
                        {isToday ? "TODAY" : daysDiff === 0 ? "TODAY" : daysDiff < 0 ? "PAST" : `In ${daysDiff}d`}
                      </span>
                    </div>
                    <div className="text-[9px] text-gray-300 font-bold flex items-center space-x-1">
                      <span>ENTERING</span>
                      <span className="text-white bg-white/5 px-1 rounded flex items-center">
                        <span className="text-terminal-accent mr-1 text-[10px]">{event.signSymbol}</span>
                        {event.sign.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[9px] text-gray-400 mt-1 flex items-center">
                      <Clock className="w-2.5 h-2.5 mr-1 text-gray-500" />
                      {formatDisplayDate(event.date)}
                    </div>
                  </div>
                  <p className="text-[8.5px] text-gray-400 pt-1.5 border-t border-white/[0.03] italic leading-snug">
                    {event.marketImpact}
                  </p>
                </div>
              );
            })}

            {nextTwoUpcoming.length === 0 && (
              <div className="col-span-2 py-8 text-center text-xs text-gray-500 italic">
                No upcoming ingress transits found for {upcomingPlanet}.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* FILTER & EXPLORER PANEL PREVIEW */}
      <div className="bg-gradient-to-b from-white/[0.01] to-transparent border border-white/5 rounded-xl p-6 font-mono text-center space-y-4">
        <div className="flex flex-col items-center space-y-2 max-w-lg mx-auto">
          <div className="bg-terminal-accent/10 border border-terminal-accent/20 p-3 rounded-full">
            <Calendar className="w-6 h-6 text-terminal-accent animate-pulse" />
          </div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            INGRESS TRANSIT CALENDAR & LOGS
          </h4>
          <p className="text-[10px] text-gray-500 leading-relaxed">
            Track precise transition dates, times, and zodiac signs along with direct market cycle implications. Integrate with Google Sheets real-time synchronization pipelines.
          </p>
        </div>
        
        <button
          onClick={() => setIsExplorerOpen(true)}
          className="mx-auto bg-terminal-accent/15 hover:bg-terminal-accent/30 border border-terminal-accent/30 hover:border-terminal-accent/50 text-terminal-accent text-[11px] font-black uppercase px-6 py-2.5 rounded transition-all tracking-wider flex items-center space-x-2 cursor-pointer shadow-lg hover:shadow-terminal-accent/5"
        >
          <span>VIEW ALL INGRESS LOGS</span>
          <ChevronRight className="w-3.5 h-3.5 text-terminal-accent" />
        </button>
      </div>

      <AnimatePresence>
        {isExplorerOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/98 backdrop-blur-xl p-6 md:p-10 font-mono flex flex-col space-y-6"
          >
            {/* Header / Nav bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div className="space-y-1">
                <button
                  onClick={() => setIsExplorerOpen(false)}
                  className="flex items-center text-[10px] font-bold text-gray-400 hover:text-terminal-accent uppercase tracking-wider mb-2 transition-colors cursor-pointer group"
                >
                  <span className="mr-1 group-hover:-translate-x-0.5 transition-transform">←</span> BACK TO MAIN DASHBOARD
                </button>
                <h2 className="text-sm font-black text-white uppercase flex items-center tracking-widest">
                  <Calendar className="w-5 h-5 text-terminal-accent mr-2 animate-pulse" />
                  INGRESS TRANSIT CALENDAR & LOGS
                </h2>
                <p className="text-[10px] text-gray-500 font-mono">
                  Track planetary transitions into different zodiac signs paired with direct market implications.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Run Astro AI button */}
                {ingressData.length > 0 && (
                  <button
                    type="button"
                    disabled={isAstroAiLoading}
                    onClick={handleRunAstroAi}
                    className="bg-terminal-accent/15 hover:bg-terminal-accent/30 border border-terminal-accent/30 text-terminal-accent px-3 py-2 rounded text-[10px] flex items-center space-x-1.5 cursor-pointer transition-all uppercase font-bold disabled:opacity-50"
                  >
                    {isAstroAiLoading ? (
                      <span className="w-3.5 h-3.5 border-2 border-terminal-accent border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-terminal-accent" />
                    )}
                    <span>{astroAiRun ? "ASTRO AI ACTIVE" : "RUN ASTRO AI ENRICHMENT"}</span>
                  </button>
                )}

                {/* Search */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2.5">
                    <Search className="w-3.5 h-3.5 text-gray-500" />
                  </span>
                  <input
                    type="text"
                    value={rawSearchText}
                    onChange={(e) => setRawSearchText(e.target.value)}
                    placeholder="Search transit..."
                    className="bg-neutral-900 border border-white/10 rounded pl-8 pr-3 py-2 text-[10px] text-white focus:border-terminal-accent outline-none font-mono placeholder-gray-600 w-44"
                  />
                </div>

                {/* Planet Filter */}
                <select
                  value={selectedPlanet}
                  onChange={(e) => setSelectedPlanet(e.target.value)}
                  className="bg-neutral-900 border border-white/10 rounded p-2 text-[10px] text-white focus:border-terminal-accent outline-none font-mono cursor-pointer"
                >
                  <option value="ALL">ALL PLANETS</option>
                  {planetsList.map((p) => (
                    <option key={p} value={p}>{p.toUpperCase()}</option>
                  ))}
                </select>

                {/* Past/Upcoming Time Filter */}
                <div className="flex bg-neutral-900 border border-white/10 rounded p-0.5">
                  {(["ALL", "UPCOMING", "PAST"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setTimeFilter(mode)}
                      className={`px-2.5 py-1.5 rounded text-[9px] font-black transition-all ${
                        timeFilter === mode 
                          ? "bg-terminal-accent text-white" 
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                {/* Year Selector */}
                <div className="flex bg-neutral-900 border border-white/10 rounded p-0.5 flex-wrap max-h-16 overflow-y-auto">
                  {yearsList.map((y) => (
                    <button
                      key={y}
                      onClick={() => setSelectedYear(y)}
                      className={`px-2 py-1 rounded text-[9px] font-black transition-all ${
                        selectedYear === y 
                          ? "bg-terminal-accent text-white" 
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Full Page Content */}
            <div className="flex-1 space-y-6">
              {filteredIngress.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-white/10 bg-black/40">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-white/5 text-gray-400 border-b border-white/10">
                        <th className="p-3.5 font-bold uppercase">Planet</th>
                        <th className="p-3.5 font-bold uppercase">Sign (Ingress)</th>
                        <th className="p-3.5 font-bold uppercase">Transit Date</th>
                        <th className="p-3.5 font-bold uppercase">Transition Time</th>
                        <th className="p-3.5 font-bold uppercase">Systemic & Market Cycle Implications</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredIngress.map((item, idx) => {
                        const itemD = new Date(item.date);
                        const isPast = itemD < today;
                        const isCurrent = item.date === todayStr;

                        return (
                          <tr 
                            key={idx} 
                            className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${
                              isCurrent 
                                 ? "bg-terminal-accent/[0.04] border-l-2 border-l-terminal-accent" 
                                : isPast 
                                  ? "opacity-60" 
                                  : "bg-white/[0.01]"
                            }`}
                          >
                            <td className="p-3.5 font-black text-white flex items-center space-x-1.5">
                              <span className="text-terminal-accent text-xs">{item.symbol}</span>
                              <span>{item.planet}</span>
                              {isCurrent && (
                                <span className="text-[7px] font-black bg-terminal-accent/20 text-terminal-accent px-1 rounded animate-pulse">TODAY</span>
                              )}
                            </td>
                            <td className="p-3.5 font-bold text-gray-300">
                              <span className="text-terminal-accent mr-1 font-mono">{item.signSymbol}</span>
                              {item.sign}
                            </td>
                            <td className="p-3.5 font-bold text-gray-300">{formatDisplayDate(item.date)}</td>
                            <td className="p-3.5 font-mono text-gray-400">{item.time}</td>
                            <td className="p-3.5 text-gray-400 text-[10px] italic leading-relaxed">
                              {astroAiRun && (
                                <span className="inline-flex items-center space-x-1 text-[7.5px] bg-purple-950/40 text-purple-400 border border-purple-500/20 px-1 py-0.5 rounded font-bold uppercase tracking-tight mr-1.5 not-italic select-none">
                                  <Sparkles className="w-2 h-2 text-purple-400 shrink-0" />
                                  <span>Astro AI</span>
                                </span>
                              )}
                              {item.marketImpact}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center bg-white/[0.01] border border-white/5 rounded-lg text-xs text-gray-500 leading-relaxed font-mono">
                  No ingress transits matching the selected filters found in {selectedYear}. Direct transit orbits dominate this cycle.
                </div>
              )}
            </div>

            {/* Footer with a quick back action */}
            <div className="border-t border-white/10 pt-4 flex justify-between items-center text-[9px] text-gray-500">
              <span>INGRESS TRANSIT MATRIX • SYNCHRONIZED LAYER</span>
              <button
                onClick={() => setIsExplorerOpen(false)}
                className="bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 px-3 py-1 rounded cursor-pointer transition-all"
              >
                CLOSE EXPLORER
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
