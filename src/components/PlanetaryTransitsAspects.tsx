import React, { useState, useEffect, useMemo } from "react";
import { 
  Calendar, 
  Sparkles, 
  Clock, 
  Search, 
  Settings, 
  Database, 
  Link, 
  Check, 
  Copy, 
  ArrowRight, 
  ChevronRight, 
  Info, 
  RotateCcw, 
  AlertTriangle, 
  Globe, 
  CheckCircle,
  HelpCircle
} from "lucide-react";

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export interface TransitAspect {
  id: string;
  year: number;
  date: string;          // e.g. "2026-02-19"
  time: string;          // e.g. "15:52 UTC"
  planet1: string;       // e.g. "Sun"
  planet1Symbol: string;  // "☉"
  planet1Sign: string;   // "Pisces"
  planet2: string;       // e.g. "Mars"
  planet2Symbol: string;  // "♂"
  planet2Sign: string;   // "Virgo"
  aspectType: string;     // "Opposition"
  aspectSymbol: string;    // "☍"
  degree: string;        // e.g. "1° 12'"
  marketImpact: string;   // Gann interpretation
  strength: "HIGH" | "MEDIUM" | "LOW";
  sectors: string[];      // affected market sectors
}

export const DEFAULT_TRANSIT_DATA: TransitAspect[] = [
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

const PLANET_SYMBOLS: Record<string, string> = {
  "Sun": "☉", "Moon": "☽", "Mercury": "☿", "Venus": "♀", "Mars": "♂", 
  "Jupiter": "♃", "Saturn": "♄", "Uranus": "♅", "Neptune": "♆", "Pluto": "♇"
};

const ASPECT_SYMBOLS: Record<string, string> = {
  "Opposition": "☍", "Conjunction": "☌", "Square": "□", "Trine": "△", "Sextile": "✶", "Quincunx": "⚻"
};

// Robust Client-side CSV Parser for Planetary Transits & Aspects spreadsheet
export const parseCSVTextTransits = (csvText: string): TransitAspect[] => {
  const transits: TransitAspect[] = [];
  if (!csvText || typeof csvText !== "string") return transits;

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

  const planetSymbolsLower: Record<string, string> = {
    "sun": "☉", "moon": "☽", "mercury": "☿", "venus": "♀", "mars": "♂",
    "jupiter": "♃", "saturn": "♄", "uranus": "♅", "neptune": "♆", "pluto": "♇",
    "north node": "☊", "south node": "☋", "chiron": "⚷"
  };

  const aspectSymbolsLower: Record<string, string> = {
    "opposition": "☍", "conjunction": "☌", "sextile": "⚹", "square": "□", "trine": "△", "quincunx": "⚻"
  };

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
        else if ((lower.includes("planet 1") || lower.includes("planet1") || lower.includes("p1")) && !lower.includes("sign")) p1Idx = idx;
        else if (lower.includes("p1 sign") || lower.includes("planet1 sign") || lower.includes("p1sign")) p1SignIdx = idx;
        else if ((lower.includes("planet 2") || lower.includes("planet2") || lower.includes("p2")) && !lower.includes("sign")) p2Idx = idx;
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

    const p1Symbol = planetSymbolsLower[p1Key] || "☉";
    const p2Symbol = planetSymbolsLower[p2Key] || "♂";
    const aspectSymbol = aspectSymbolsLower[aspectKey] || "☍";
    const normalizedDate = normalizeDate(rawDate, rawYear);

    const sectorsList = sectorsRaw.split(",").map(s => s.trim()).filter(Boolean);

    transits.push({
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
      marketImpact: marketImpact || `${planet1} ${aspectType} ${planet2} celestial configuration.`,
      strength: (strengthStr === "HIGH" || strengthStr === "MEDIUM" || strengthStr === "LOW") ? (strengthStr as "HIGH" | "MEDIUM" | "LOW") : "HIGH",
      sectors: sectorsList.length > 0 ? sectorsList : ["Global Markets"]
    });
  }

  transits.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return transits;
};

export default function PlanetaryTransitsAspects({ isAdmin = false }: { isAdmin?: boolean }) {
  const [isFactoryDefault, setIsFactoryDefault] = useState<boolean>(() => {
    const saved = localStorage.getItem("planetary_transits_custom");
    return !saved;
  });

  const [transits, setTransits] = useState<TransitAspect[]>(() => {
    const saved = localStorage.getItem("planetary_transits_custom");
    if (saved) return JSON.parse(saved);
    return DEFAULT_TRANSIT_DATA;
  });

  const [astroAiRun, setAstroAiRun] = useState<boolean>(() => {
    return localStorage.getItem("planetary_transits_astro_ai_run") === "true";
  });

  const [isAstroAiFallback, setIsAstroAiFallback] = useState<boolean>(() => {
    return localStorage.getItem("planetary_transits_astro_ai_fallback") === "true";
  });

  const [isAstroAiLoading, setIsAstroAiLoading] = useState<boolean>(false);

  const [selectedTransit, setSelectedTransit] = useState<TransitAspect | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | string>("ALL");


  // Dynamic aspect filter and search states
  const [selectedAspectType, setSelectedAspectType] = useState<string>("ALL");
  const [selectedPlanet, setSelectedPlanet] = useState<string>("ALL");
  const [timeFilter, setTimeFilter] = useState<"ALL" | "UPCOMING" | "PAST">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Stored source URL configuration
  const [customSourceUrl, setCustomSourceUrl] = useState<string>(() => localStorage.getItem("planetary_transits_custom_url") || "");
  const [inputUrl, setInputUrl] = useState<string>(() => localStorage.getItem("planetary_transits_custom_url") || "");
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<"loading" | "synced" | "error" | "idle">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadTransitData = async (targetUrl?: string) => {
    try {
      setIsLoading(true);
      setSyncStatus("loading");
      setErrorMsg(null);

      const urlToUse = targetUrl !== undefined ? targetUrl : customSourceUrl;
      const apiEndpoint = `/api/planetary-transits?url=${encodeURIComponent(urlToUse || "https://script.google.com/macros/s/AKfycbxEcG9hykxB_N3aSi1Q8Qlipn3XtuTcNoCs62_RM9cIsIU357K9TygKIW3hkQKmNkmTVA/exec")}`;
      let response;
      let json: any = null;

      // 1. Try server-side API proxy first
      try {
        response = await fetch(apiEndpoint);
        if (response.ok) {
          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            json = await response.json();
            console.log("[Transits UI] Loaded from API proxy:", json);
          } else {
            console.warn("[Transits UI] Server-side API returned non-JSON. Probably static hosting SPA redirect. Trying direct fallback...");
          }
        } else {
          console.warn(`[Transits UI] Server-side API returned status ${response.status}. Trying direct fetch fallback...`);
        }
      } catch (err) {
        console.warn("[Transits UI] Server-side API endpoint failed, trying direct fetch:", err);
      }

      // 2. Fallback: Try direct client-side fetch from Google Apps Script Web App or raw CSV published Sheets URL
      if (!json || !Array.isArray(json.transits) || json.transits.length === 0) {
        const gasUrl = urlToUse.trim() || "https://script.google.com/macros/s/AKfycbxEcG9hykxB_N3aSi1Q8Qlipn3XtuTcNoCs62_RM9cIsIU357K9TygKIW3hkQKmNkmTVA/exec";
        try {
          console.log(`[Transits UI] Direct fetch to: ${gasUrl}`);
          response = await fetch(gasUrl);
          if (response.ok) {
            const rawText = await response.text();
            // Try parsing as JSON first
            try {
              const rawData = JSON.parse(rawText);
              const transList = Array.isArray(rawData) ? rawData : (Array.isArray(rawData.transits) ? rawData.transits : []);
              if (transList.length > 0) {
                json = { transits: transList };
                console.log("[Transits UI] Direct JSON fetch succeeded. Transits count:", transList.length);
              }
            } catch (jsonErr) {
              // Not JSON, parse as CSV text
              console.log("[Transits UI] Direct fetch is not JSON. Trying to parse as CSV...");
              const parsedCsvTransits = parseCSVTextTransits(rawText);
              if (parsedCsvTransits.length > 0) {
                json = { transits: parsedCsvTransits };
                console.log("[Transits UI] Direct CSV parse succeeded. Transits count:", parsedCsvTransits.length);
              }
            }
          } else {
            console.warn(`[Transits UI] Direct GAS returned status ${response.status}`);
          }
        } catch (directErr: any) {
          console.warn("[Transits UI] Direct Google Apps Script fetch failed (possibly CORS). Trying default fallback sheet as CSV...", directErr);
        }
      }

      // 3. Fallback: Try direct client-side fetch from the default published CSV sheet if nothing loaded yet and no custom url
      if (!json || !Array.isArray(json.transits) || json.transits.length === 0) {
        if (!urlToUse.trim()) {
          const defaultCsvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSWqA53wQqhu2nNXSDcxeoA7gErbS0gTpPC1UjLr0ZRbIoPXmnAETdMgiPmGYuTLbmioMnxQVr6WEab/pub?gid=1478838111&single=true&output=csv";
          try {
            console.log(`[Transits UI] Direct fetch to Google Sheet CSV fallback: ${defaultCsvUrl}`);
            response = await fetch(defaultCsvUrl);
            if (response.ok) {
              const csvText = await response.text();
              const parsedCsvTransits = parseCSVTextTransits(csvText);
              if (parsedCsvTransits.length > 0) {
                json = { transits: parsedCsvTransits };
                console.log("[Transits UI] Default CSV fetch succeeded. Transits count:", parsedCsvTransits.length);
              }
            }
          } catch (csvErr: any) {
            console.warn("[Transits UI] Fallback CSV fetch failed:", csvErr);
          }
        }
      }

      if (json && Array.isArray(json.transits) && json.transits.length > 0) {
        const enrichedTransits = json.transits.map((t: any) => ({
          ...t,
          planet1Symbol: t.planet1Symbol || PLANET_SYMBOLS[t.planet1] || "☉",
          planet2Symbol: t.planet2Symbol || PLANET_SYMBOLS[t.planet2] || "♂",
          aspectSymbol: t.aspectSymbol || ASPECT_SYMBOLS[t.aspectType] || "☍"
        }));
        setTransits(enrichedTransits);
        localStorage.setItem("planetary_transits_custom", JSON.stringify(enrichedTransits));
        if (urlToUse) {
          localStorage.setItem("planetary_transits_custom_url", urlToUse);
        } else {
          localStorage.removeItem("planetary_transits_custom_url");
        }
        localStorage.removeItem("planetary_transits_factory_active");
        setIsFactoryDefault(false);
        setSyncStatus("synced");
      } else {
        throw new Error("Could not retrieve live planetary transit aspects from Google Sheets. Confirm Google Apps Script deployment is correct or sheet publication is active.");
      }
    } catch (error: any) {
      console.warn("[Transits UI] Error loading transits data:", error);
      setErrorMsg(error.message || "Failed to load spreadsheet planetary transits.");
      setSyncStatus("error");
      
      // Fallback to static defaults so the UI is never empty
      const saved = localStorage.getItem("planetary_transits_custom");
      if (!saved || JSON.parse(saved).length === 0) {
        setTransits(DEFAULT_TRANSIT_DATA);
        setIsFactoryDefault(true);
      } else {
        setTransits(JSON.parse(saved));
        setIsFactoryDefault(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Save / update custom transits data source URL
  const handleSaveUrl = async (url: string) => {
    const cleanUrl = url.trim();
    setCustomSourceUrl(cleanUrl);
    setInputUrl(cleanUrl);
    if (cleanUrl) {
      localStorage.setItem("planetary_transits_custom_url", cleanUrl);
    } else {
      localStorage.removeItem("planetary_transits_custom_url");
    }

    try {
      const docRef = doc(db, "settings", "planetary_transits");
      await setDoc(docRef, { url: cleanUrl, updatedAt: new Date().toISOString() }, { merge: true });
      console.log("Successfully saved transits URL to Firestore.");
    } catch (err) {
      console.error("Failed to save transits URL to Firestore:", err);
    }

    loadTransitData(cleanUrl);
  };

  // Reset transits to default source URL
  const handleResetUrl = async () => {
    setCustomSourceUrl("");
    setInputUrl("");
    localStorage.removeItem("planetary_transits_custom_url");

    try {
      const docRef = doc(db, "settings", "planetary_transits");
      await setDoc(docRef, { url: "", updatedAt: new Date().toISOString() }, { merge: true });
      console.log("Successfully reset transits URL in Firestore.");
    } catch (err) {
      console.error("Failed to reset transits URL in Firestore:", err);
    }

    loadTransitData("");
  };

  // Run Astro AI Alignment Analysis
  const handleRunAstroAi = async () => {
    if (transits.length === 0) return;
    try {
      setIsAstroAiLoading(true);
      setErrorMsg(null);
      
      const response = await fetch("/api/planetary-transits/enrich", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transits })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Astro AI enrichment failed.");
      }

      const data = await response.json();
      if (data.transits && Array.isArray(data.transits)) {
        setTransits(data.transits);
        localStorage.setItem("planetary_transits_custom", JSON.stringify(data.transits));
        localStorage.setItem("planetary_transits_astro_ai_run", "true");
        setAstroAiRun(true);
        
        if (data.isFallback) {
          setIsAstroAiFallback(true);
          localStorage.setItem("planetary_transits_astro_ai_fallback", "true");
        } else {
          setIsAstroAiFallback(false);
          localStorage.removeItem("planetary_transits_astro_ai_fallback");
        }
      }
    } catch (err: any) {
      console.error("[Astro AI] Error enriching transits:", err);
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
        const docRef = doc(db, "settings", "planetary_transits");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.url !== undefined) {
            activeUrl = data.url;
            setCustomSourceUrl(data.url);
            setInputUrl(data.url);
            if (data.url) {
              localStorage.setItem("planetary_transits_custom_url", data.url);
            } else {
              localStorage.removeItem("planetary_transits_custom_url");
            }
          }
        }
      } catch (err) {
        console.error("Error reading saved transits URL from Firestore on mount:", err);
      }
      loadTransitData(activeUrl);
    };
    initUrlAndFetch();
  }, []);

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => today.toISOString().split("T")[0], [today]);

  // Dynamically extract past 2 transits (relative to today, closest past first)
  const lastTwoAspects = useMemo(() => {
    const todayTime = new Date(todayStr).getTime();
    return (transits || [])
      .filter(t => t && t.date && new Date(t.date).getTime() < todayTime)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 2);
  }, [transits, todayStr]);

  // Dynamically extract upcoming 3 transits (relative to today, closest future first)
  const upcomingThreeAspects = useMemo(() => {
    const todayTime = new Date(todayStr).getTime();
    return (transits || [])
      .filter(t => t && t.date && new Date(t.date).getTime() >= todayTime)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);
  }, [transits, todayStr]);

  // Unique lists for filtration options
  const uniqueYears = useMemo(() => {
    const years = new Set<number>();
    (transits || []).forEach(t => {
      if (t && t.year) years.add(t.year);
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [transits]);

  const uniqueAspectTypes = useMemo(() => {
    const types = new Set<string>();
    (transits || []).forEach(t => {
      if (t && t.aspectType) types.add(t.aspectType);
    });
    return Array.from(types).sort();
  }, [transits]);

  const uniquePlanets = useMemo(() => {
    const planets = new Set<string>();
    (transits || []).forEach(t => {
      if (t) {
        if (t.planet1) planets.add(t.planet1);
        if (t.planet2) planets.add(t.planet2);
      }
    });
    return Array.from(planets).sort();
  }, [transits]);

  // Filtered log transits
  const filteredLogs = useMemo(() => {
    const todayTime = new Date(todayStr).getTime();
    return (transits || []).filter(t => {
      if (!t) return false;
      const matchesYear = selectedYear === "ALL" || t.year === Number(selectedYear);
      const matchesAspect = selectedAspectType === "ALL" || (t.aspectType || "").toLowerCase() === selectedAspectType.toLowerCase();
      const matchesPlanet = selectedPlanet === "ALL" || 
        (t.planet1 || "").toLowerCase() === selectedPlanet.toLowerCase() || 
        (t.planet2 || "").toLowerCase() === selectedPlanet.toLowerCase();
      
      const aspectTime = new Date(t.date || "").getTime();
      const matchesTime = timeFilter === "ALL" || 
        (timeFilter === "UPCOMING" && aspectTime >= todayTime) || 
        (timeFilter === "PAST" && aspectTime < todayTime);
      
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        (t.planet1 || "").toLowerCase().includes(query) || 
        (t.planet2 || "").toLowerCase().includes(query) || 
        (t.aspectType || "").toLowerCase().includes(query) || 
        (t.marketImpact || "").toLowerCase().includes(query) || 
        (t.sectors || []).some(s => (s || "").toLowerCase().includes(query));

      return matchesYear && matchesAspect && matchesPlanet && matchesTime && matchesSearch;
    }).sort((a, b) => new Date(a.date || "").getTime() - new Date(b.date || "").getTime());
  }, [transits, selectedYear, selectedAspectType, selectedPlanet, timeFilter, searchQuery, todayStr]);

  // Set initial selected transit for side panel
  useEffect(() => {
    if (filteredLogs.length > 0) {
      // Keep selected transit if still in current list, otherwise default to first
      if (!selectedTransit || !filteredLogs.some(t => t.id === selectedTransit.id)) {
        setSelectedTransit(filteredLogs[0]);
      }
    } else {
      setSelectedTransit(null);
    }
  }, [filteredLogs]);

  // Ensure selected year is in unique years list or default to ALL
  useEffect(() => {
    if (selectedYear !== "ALL" && uniqueYears.length > 0 && !uniqueYears.includes(Number(selectedYear))) {
      setSelectedYear("ALL");
    }
  }, [uniqueYears, selectedYear]);

  const formatDisplayDate = (dStr: string) => {
    if (!dStr) return "";
    try {
      const parts = dStr.split("-");
      if (parts.length === 3) {
        const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      }
      return new Date(dStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dStr;
    }
  };



  return (
    <div id="planetary_transits_section" className="bg-terminal-card border border-terminal-border rounded-xl p-6 space-y-6 shadow-2xl relative overflow-hidden text-gray-100">
      {/* Background ambient accents */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-terminal-accent/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
      
      {/* Redesigned Clean Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-white/5 pb-5 space-y-4 md:space-y-0">
        <div>
          <div className="flex items-center space-x-2 text-terminal-accent font-mono text-[10px] tracking-widest uppercase mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Harmonic Geometries & Gann Cycle Pivots</span>
          </div>
          <h3 className="text-xl font-bold text-white uppercase tracking-tight flex items-center space-x-2 font-sans">
            <span>PLANETARY TRANSITS & ASPECTS</span>
          </h3>
          <p className="text-[11px] text-gray-400 font-mono mt-1 max-w-xl">
            Track precise exact celestial alignments and corresponding historical trading effects to pinpoint dynamic price and cycle reversals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start md:self-center font-mono">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400 font-mono">GLOBAL YEAR:</span>
            <select 
              value={selectedYear}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedYear(val === "ALL" ? "ALL" : Number(val));
              }}
              className="bg-black/40 border border-white/10 text-terminal-accent font-mono text-xs rounded px-3 py-1.5 outline-none hover:border-terminal-accent focus:border-terminal-accent transition-all cursor-pointer"
            >
              <option value="ALL" className="bg-neutral-900">ALL YEARS</option>
              {uniqueYears.map(yr => (
                <option key={yr} value={yr} className="bg-neutral-900">{yr}</option>
              ))}
            </select>
          </div>

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

      {/* CONNECTION SETTINGS PANEL */}
      {showSettings && (
        <div className="bg-black/40 border border-terminal-border rounded-lg p-5 font-mono space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h4 className="text-sm font-bold text-terminal-accent uppercase flex items-center">
              <Database className="w-4 h-4 mr-2" />
              PLANETARY TRANSITS CONNECTION MANAGER
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
                <CheckCircle className="w-3 h-3 mr-1" />
                Linked to custom source: {customSourceUrl}
              </p>
            ) : (
              <p className="text-[10px] text-gray-500">
                Using system default Google Apps Script telemetry downlink.
              </p>
            )}
          </div>

          <div className="border-t border-white/5 pt-3 mt-3">
            <p className="text-[10px] text-gray-400 leading-relaxed">
              <strong>Instructions:</strong> To use your own Google Sheets spreadsheet, you can either deploy a Google Apps Script Web App returning JSON (with CORS enabled) OR simply publish your Google Sheets worksheet to the Web as a CSV file (<code className="text-terminal-accent">File &gt; Share &gt; Publish to web &gt; Choose sheet &gt; Output as CSV</code>) and paste the resulting URL here!
            </p>
          </div>
        </div>
      )}

      {/* Static Fallback & Ingress Error Warning Banner */}
      {(syncStatus === "error" || isFactoryDefault) && (
        <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-4.5 font-mono text-xs text-gray-300 space-y-2.5 animate-fadeIn">
          <div className="flex items-center space-x-2 text-amber-400 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
            <span className="uppercase tracking-wider">Spreadsheet Sync Alert: Static Fallback Mode Engaged</span>
          </div>
          <p className="leading-relaxed">
            Live Google Sheets synchronization downlink is currently offline or unreachable. This often occurs on static servers (like GitHub/ingress proxies) due to CORS policies or network routing constraints.
            To keep your trading analytics fully operational, the system has automatically engaged <strong className="text-white">High-Fidelity Static Fallback Mode</strong>. High-probability 2026 transits, exact aspects, and Gann cycles have been loaded from pre-computed local telemetry.
          </p>
          {errorMsg && (
            <div className="text-[10px] bg-black/40 border border-white/5 rounded px-2.5 py-1.5 text-gray-400 font-mono select-all overflow-x-auto whitespace-pre-wrap max-h-24">
              Downlink Diagnostics: {errorMsg}
            </div>
          )}
          <div className="flex items-center space-x-3 pt-1">
            <button
              type="button"
              onClick={loadTransitData}
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

      {/* Redesigned Dynamic Dual Sections: Last 2 Aspects & Upcoming 3 Aspects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono">
        
        {/* PAST ALIGNMENTS: Last 2 Aspects */}
        <div className="bg-gradient-to-b from-white/[0.03] to-transparent border border-white/5 rounded-xl p-4.5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-terminal-accent/40 animate-pulse"></span>
              <span>LAST 2 CELESTIAL ASPECTS (PAST)</span>
            </h4>
            <span className="text-[9px] text-gray-500 uppercase font-black tracking-tight">Relative to Today</span>
          </div>

          <div className="space-y-3">
            {lastTwoAspects.map((aspect) => {
              const daysDiff = Math.round((today.getTime() - new Date(aspect.date).getTime()) / 86400000);
              return (
                <div 
                  key={aspect.id}
                  onClick={() => setSelectedTransit(aspect)}
                  className={`p-3.5 bg-black/40 border rounded-lg transition-all cursor-pointer hover:bg-black/60 flex flex-col justify-between ${
                    selectedTransit?.id === aspect.id ? "border-terminal-accent/50 bg-terminal-accent/[0.02]" : "border-white/5"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm font-serif text-terminal-accent">{aspect.planet1Symbol}</span>
                        <span className="text-xs text-gray-500">{aspect.aspectSymbol}</span>
                        <span className="text-sm font-serif text-terminal-accent">{aspect.planet2Symbol}</span>
                        <span className="text-xs font-bold text-white uppercase ml-1">
                          {aspect.planet1} {aspect.aspectType} {aspect.planet2}
                        </span>
                      </div>
                      <p className="text-[9.5px] text-gray-500 mt-1 flex items-center">
                        <Clock className="w-3 h-3 mr-1 text-gray-600 shrink-0" />
                        <span>{formatDisplayDate(aspect.date)} • {aspect.time}</span>
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-1">
                      <span className="text-[9px] font-black text-gray-400 bg-white/5 px-2 py-0.5 rounded uppercase tracking-tight whitespace-nowrap">
                        {daysDiff === 0 ? "TODAY" : `${daysDiff} Days Ago`}
                      </span>
                      {astroAiRun && (
                        <span className="flex items-center space-x-1 text-[7.5px] bg-purple-950/40 text-purple-400 border border-purple-500/20 px-1 py-0.5 rounded font-bold uppercase font-mono tracking-tight">
                          <Sparkles className="w-2 h-2 text-purple-400 shrink-0" />
                          <span>Astro AI</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-300 mt-2.5 line-clamp-2 italic leading-relaxed border-t border-white/[0.03] pt-2">
                    {aspect.marketImpact}
                  </p>

                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {(aspect.sectors || []).slice(0, 3).map((sec, idx) => (
                      <span key={idx} className="text-[8px] bg-white/5 border border-white/5 text-gray-400 px-1.5 py-0.5 rounded uppercase">
                        {sec}
                      </span>
                    ))}
                    {(aspect.sectors || []).length > 3 && (
                      <span className="text-[8px] text-gray-500 self-center">+{(aspect.sectors || []).length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}

            {lastTwoAspects.length === 0 && (
              <div className="p-6 bg-black/20 border border-white/5 rounded-lg text-center text-xs text-gray-500 italic">
                {customSourceUrl ? "No past alignments found in current dataset." : "Please enter and synchronize your Google Sheets spreadsheet URL above to load real celestial transits."}
              </div>
            )}
          </div>
        </div>

        {/* UPCOMING ALIGNMENTS: Upcoming 3 Aspects */}
        <div className="bg-gradient-to-b from-white/[0.03] to-transparent border border-white/5 rounded-xl p-4.5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-terminal-accent animate-pulse"></span>
              <span>UPCOMING 3 CELESTIAL ASPECTS</span>
            </h4>
            
            {transits.length > 0 && (
              <button
                type="button"
                disabled={isAstroAiLoading}
                onClick={handleRunAstroAi}
                className="bg-terminal-accent/10 hover:bg-terminal-accent/25 border border-terminal-accent/30 text-terminal-accent px-2 py-0.5 rounded text-[9.5px] flex items-center space-x-1 cursor-pointer transition-all uppercase font-bold disabled:opacity-50"
              >
                {isAstroAiLoading ? (
                  <span className="w-3 h-3 border-2 border-terminal-accent border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <Sparkles className="w-3 h-3 text-terminal-accent" />
                )}
                <span>{astroAiRun ? "Run Astro AI" : "Run Astro AI"}</span>
              </button>
            )}
          </div>

          {isAstroAiFallback && (
            <div className="text-[10px] text-amber-400 bg-amber-950/20 border border-amber-500/20 rounded-lg p-2.5 leading-relaxed flex items-start space-x-2 animate-fadeIn">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0 animate-pulse" />
              <span>
                <strong>Astro AI rate-limited:</strong> Geometric alignments have been populated using local astro-analytical calculations.
              </span>
            </div>
          )}

          <div className="space-y-3">
            {upcomingThreeAspects.map((aspect) => {
              const daysDiff = Math.max(0, Math.round((new Date(aspect.date).getTime() - today.getTime()) / 86400000));
              return (
                <div 
                  key={aspect.id}
                  onClick={() => setSelectedTransit(aspect)}
                  className={`p-3.5 bg-black/40 border rounded-lg transition-all cursor-pointer hover:bg-black/60 flex flex-col justify-between ${
                    selectedTransit?.id === aspect.id ? "border-terminal-accent/50 bg-terminal-accent/[0.02]" : "border-white/5"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm font-serif text-terminal-accent">{aspect.planet1Symbol}</span>
                        <span className="text-xs text-gray-500">{aspect.aspectSymbol}</span>
                        <span className="text-sm font-serif text-terminal-accent">{aspect.planet2Symbol}</span>
                        <span className="text-xs font-bold text-white uppercase ml-1">
                          {aspect.planet1} {aspect.aspectType} {aspect.planet2}
                        </span>
                      </div>
                      <p className="text-[9.5px] text-gray-500 mt-1 flex items-center">
                        <Clock className="w-3 h-3 mr-1 text-gray-600 shrink-0" />
                        <span>{formatDisplayDate(aspect.date)} • {aspect.time}</span>
                      </p>
                    </div>

                    <div className="flex flex-col items-end space-y-1">
                      <span className="text-[9px] font-black text-terminal-accent bg-terminal-accent/10 px-2 py-0.5 rounded uppercase tracking-tight whitespace-nowrap">
                        {daysDiff === 0 ? "TODAY" : `In ${daysDiff} Days`}
                      </span>
                      {astroAiRun && (
                        <span className="flex items-center space-x-1 text-[7.5px] bg-purple-950/40 text-purple-400 border border-purple-500/20 px-1 py-0.5 rounded font-bold uppercase font-mono tracking-tight animate-fade-in">
                          <Sparkles className="w-2 h-2 text-purple-400 shrink-0" />
                          <span>Astro AI</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-300 mt-2.5 line-clamp-2 italic leading-relaxed border-t border-white/[0.03] pt-2">
                    {aspect.marketImpact}
                  </p>

                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {(aspect.sectors || []).slice(0, 3).map((sec, idx) => (
                      <span key={idx} className="text-[8px] bg-white/5 border border-white/5 text-gray-400 px-1.5 py-0.5 rounded uppercase">
                        {sec}
                      </span>
                    ))}
                    {(aspect.sectors || []).length > 3 && (
                      <span className="text-[8px] text-gray-500 self-center">+{(aspect.sectors || []).length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}

            {upcomingThreeAspects.length === 0 && (
              <div className="p-6 bg-black/20 border border-white/5 rounded-lg text-center text-xs text-gray-500 italic">
                {customSourceUrl ? "No upcoming alignments tracked in current dataset." : "Please enter and synchronize your Google Sheets spreadsheet URL above to load real celestial transits."}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* DEDICATED SEPARATE BOX: Planetary Aspects & Transits Calendar Logs */}
      <div className="border border-terminal-border bg-black/35 rounded-xl p-5 space-y-5">
        
        {/* Box Header & Interactive Search/Filter Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <h4 className="text-sm font-black text-white uppercase flex items-center space-x-2 font-sans">
              <Calendar className="w-4 h-4 text-terminal-accent" />
              <span>PLANETARY ASPECTS & TRANSITS CALENDAR LOGS</span>
            </h4>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">
              Comprehensive chronological alignment query matrix with planet, aspect type, and custom search filters.
            </p>
          </div>

          <span className="text-[10px] bg-white/5 px-2.5 py-1 rounded text-gray-400 font-mono self-start lg:self-center uppercase">
            Logged Alignments: <strong className="text-white">{filteredLogs.length}</strong> / {transits.length}
          </span>
        </div>

        {/* Highly Interactive Filters Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 font-mono text-[11px]">
          {/* Year wise Filter */}
          <div className="space-y-1">
            <span className="text-[9px] text-gray-500 uppercase font-black block">Year Filter:</span>
            <select
              value={selectedYear}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedYear(val === "ALL" ? "ALL" : Number(val));
              }}
              className="w-full bg-neutral-900 border border-white/10 rounded px-2.5 py-1.5 text-gray-200 focus:border-terminal-accent outline-none cursor-pointer uppercase font-bold"
            >
              <option value="ALL">ALL YEARS</option>
              {uniqueYears.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          {/* Planets Filter */}
          <div className="space-y-1">
            <span className="text-[9px] text-gray-500 uppercase font-black block">Planet Filter:</span>
            <select
              value={selectedPlanet}
              onChange={(e) => setSelectedPlanet(e.target.value)}
              className="w-full bg-neutral-900 border border-white/10 rounded px-2.5 py-1.5 text-gray-200 focus:border-terminal-accent outline-none cursor-pointer uppercase font-bold"
            >
              <option value="ALL">ALL PLANETS</option>
              {uniquePlanets.map(p => (
                <option key={p} value={p}>{p.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Aspect Type Filter */}
          <div className="space-y-1">
            <span className="text-[9px] text-gray-500 uppercase font-black block">Aspect Type:</span>
            <select
              value={selectedAspectType}
              onChange={(e) => setSelectedAspectType(e.target.value)}
              className="w-full bg-neutral-900 border border-white/10 rounded px-2.5 py-1.5 text-gray-200 focus:border-terminal-accent outline-none cursor-pointer uppercase font-bold"
            >
              <option value="ALL">ALL ASPECTS</option>
              {uniqueAspectTypes.map(aspect => (
                <option key={aspect} value={aspect}>{aspect.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Time Frame Filter */}
          <div className="space-y-1">
            <span className="text-[9px] text-gray-500 uppercase font-black block">Time Frame:</span>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
              className="w-full bg-neutral-900 border border-white/10 rounded px-2.5 py-1.5 text-gray-200 focus:border-terminal-accent outline-none cursor-pointer uppercase font-bold"
            >
              <option value="ALL">ALL DATES</option>
              <option value="UPCOMING">UPCOMING DATES</option>
              <option value="PAST">PAST DATES</option>
            </select>
          </div>

          {/* Text Search filter */}
          <div className="space-y-1">
            <span className="text-[9px] text-gray-500 uppercase font-black block">Search Keywords:</span>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search gold, degree, etc..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:border-terminal-accent outline-none"
              />
            </div>
          </div>
        </div>

        {/* Split Logs Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          
          {/* Logs List Panel (7 Columns) */}
          <div className="lg:col-span-7 space-y-3.5">
            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider border-b border-white/5 pb-1">
              CHRONOLOGICAL LOGS MATRIX
            </div>

            {filteredLogs.length === 0 ? (
              <div className="bg-black/40 border border-white/5 rounded-lg p-10 text-center text-xs text-gray-500 font-mono">
                No matching celestial alignments logged. Adjust filters above to expand query scope.
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {filteredLogs.map((aspect) => {
                  const isSelected = selectedTransit?.id === aspect.id;
                  const isUpcoming = new Date(aspect.date).getTime() >= today.getTime();

                  return (
                    <div
                      key={aspect.id}
                      onClick={() => setSelectedTransit(aspect)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected 
                          ? "bg-terminal-accent/10 border-terminal-accent/60 shadow-[0_0_12px_rgba(234,179,8,0.06)]" 
                          : "bg-black/30 border-white/5 hover:border-white/20 hover:bg-black/40"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="bg-white/5 border border-white/5 rounded px-2 py-1 flex items-center space-x-1 shrink-0">
                          <span className="text-sm font-serif text-white">{aspect.planet1Symbol}</span>
                          <span className="text-[10px] text-gray-500">{aspect.aspectSymbol}</span>
                          <span className="text-sm font-serif text-white">{aspect.planet2Symbol}</span>
                        </div>
                        
                        <div>
                          <span className="text-xs font-mono font-bold text-gray-200 uppercase block leading-snug">
                            {aspect.planet1} {aspect.aspectType} {aspect.planet2}
                          </span>
                          <div className="flex items-center space-x-2 text-[10px] text-gray-500 mt-0.5">
                            <span>{formatDisplayDate(aspect.date)}</span>
                            <span>•</span>
                            <span className="text-terminal-accent font-bold">{aspect.degree} Axis</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2.5 self-end sm:self-center">
                        {astroAiRun && (
                          <span className={`text-[8px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${
                            aspect.strength === "HIGH" 
                              ? "bg-terminal-red/10 border-terminal-red/20 text-terminal-red font-bold"
                              : aspect.strength === "MEDIUM"
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                              : "bg-sky-500/10 border-sky-500/20 text-sky-400"
                          }`}>
                            {aspect.strength} IMPACT
                          </span>
                        )}

                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${
                          isSelected ? "text-terminal-accent translate-x-0.5" : "text-gray-600"
                        }`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Log Detail Panel (5 Columns) */}
          <div className="lg:col-span-5 bg-black/40 border border-terminal-border rounded-xl p-4 flex flex-col justify-between min-h-[380px]">
            {selectedTransit ? (
              <div className="space-y-4 animate-fadeIn">
                {/* Header Equation */}
                <div className="border-b border-white/5 pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="bg-terminal-accent/10 border border-terminal-accent/20 rounded-lg p-2 flex items-center space-x-1.5 shrink-0">
                      <span className="text-xl font-serif text-white">{selectedTransit.planet1Symbol}</span>
                      <span className="text-xs text-terminal-accent font-mono">{selectedTransit.aspectSymbol}</span>
                      <span className="text-xl font-serif text-white">{selectedTransit.planet2Symbol}</span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap">
                        <h4 className="font-bold text-white text-sm uppercase">
                          {selectedTransit.planet1} {selectedTransit.aspectType} {selectedTransit.planet2}
                        </h4>
                        {astroAiRun && (
                          <span className={`text-[7.5px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                            selectedTransit.strength === "HIGH" 
                              ? "bg-terminal-red/10 border-terminal-red/20 text-terminal-red font-bold"
                              : selectedTransit.strength === "MEDIUM"
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                              : "bg-sky-500/10 border-sky-500/20 text-sky-400"
                          }`}>
                            {selectedTransit.strength} IMPACT
                          </span>
                        )}
                      </div>
                      <p className="text-[9.5px] font-mono text-gray-500 mt-0.5">
                        Degree Alignment: {selectedTransit.degree} Axis
                      </p>
                    </div>
                  </div>
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-2 gap-2.5 font-mono text-[10px]">
                  <div className="bg-white/5 p-2 rounded border border-white/5">
                    <span className="text-gray-500 block uppercase font-bold text-[8.5px]">Zodiac Longitude</span>
                    <span className="text-terminal-accent font-black block mt-0.5 truncate">
                      {selectedTransit.planet1Sign} ➔ {selectedTransit.planet2Sign}
                    </span>
                  </div>
                  <div className="bg-white/5 p-2 rounded border border-white/5">
                    <span className="text-gray-500 block uppercase font-bold text-[8.5px]">Exact UT Time</span>
                    <span className="text-gray-300 font-bold block mt-0.5">
                      {selectedTransit.time}
                    </span>
                  </div>
                </div>

                {/* Affected market list */}
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-gray-500 uppercase font-black block">Historically Sensitive Markets:</span>
                  <div className="flex flex-wrap gap-1">
                    {(selectedTransit.sectors || []).map((sector, index) => (
                      <span key={index} className="bg-white/5 border border-white/5 text-gray-300 font-mono text-[8.5px] px-2 py-0.5 rounded uppercase">
                        {sector}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Gann interpret block */}
                <div className="bg-terminal-accent/[0.03] border border-terminal-accent/20 rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center space-x-1 text-[9.5px] text-terminal-accent font-bold uppercase">
                    <Sparkles className="w-3.5 h-3.5 text-terminal-accent" />
                    <span>Astro AI - Market View of Aspects</span>
                  </div>
                  <p className="text-[11px] font-mono text-gray-300 leading-relaxed">
                    {selectedTransit.marketImpact}
                  </p>
                </div>

                <div className="text-[9px] text-gray-500 italic leading-snug flex items-start space-x-1 font-mono">
                  <Info className="w-3 h-3 text-gray-600 shrink-0 mt-0.5" />
                  <span>Cycle windows are considered highly active within a 3-day orb window centered on the exact geometry date.</span>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center font-mono p-8 text-gray-500">
                <Calendar className="w-10 h-10 text-white/10 mb-2 animate-pulse" />
                <span className="text-xs">Select an aspect alignment from the left-side calendar logs to load deep astrological trading significance metrics.</span>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
