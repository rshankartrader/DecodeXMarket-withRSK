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

export default function PlanetaryTransitsAspects({ isAdmin = false }: { isAdmin?: boolean }) {
  const [isFactoryDefault, setIsFactoryDefault] = useState<boolean>(false);

  const [transits, setTransits] = useState<TransitAspect[]>(() => {
    const saved = localStorage.getItem("planetary_transits_custom");
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [astroAiRun, setAstroAiRun] = useState<boolean>(() => {
    return localStorage.getItem("planetary_transits_astro_ai_run") === "true";
  });

  const [isAstroAiFallback, setIsAstroAiFallback] = useState<boolean>(() => {
    return localStorage.getItem("planetary_transits_astro_ai_fallback") === "true";
  });

  const [isAstroAiLoading, setIsAstroAiLoading] = useState<boolean>(false);

  const [selectedTransit, setSelectedTransit] = useState<TransitAspect | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | string>(2026);


  // Dynamic aspect filter and search states
  const [selectedAspectType, setSelectedAspectType] = useState<string>("ALL");
  const [selectedPlanet, setSelectedPlanet] = useState<string>("ALL");
  const [timeFilter, setTimeFilter] = useState<"ALL" | "UPCOMING" | "PAST">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Permanently saved Google Sheets Web App URL for Transit Aspects
  const customSourceUrl = "https://script.google.com/macros/s/AKfycbxEcG9hykxB_N3aSi1Q8Qlipn3XtuTcNoCs62_RM9cIsIU357K9TygKIW3hkQKmNkmTVA/exec";
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<"loading" | "synced" | "error" | "idle">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadTransitData = async () => {
    try {
      setIsLoading(true);
      setSyncStatus("loading");
      setErrorMsg(null);

      const apiEndpoint = `/api/planetary-transits?url=${encodeURIComponent(customSourceUrl)}`;
      let response;
      let json;
      try {
        response = await fetch(apiEndpoint);
        if (response.ok) {
          json = await response.json();
        } else {
          console.warn(`[Transits UI] Server-side API returned status ${response.status}. Trying direct fetch fallback...`);
        }
      } catch (err) {
        console.warn("[Transits UI] Server-side API endpoint failed, trying direct fetch to GAS:", err);
      }

      // If server-side API didn't work (e.g. running on a static host like Vercel/GitHub Pages), try direct client-side fetch from Google Apps Script Web App
      if (!json) {
        try {
          console.log(`[Transits UI] Direct fetch to GAS: ${customSourceUrl}`);
          response = await fetch(customSourceUrl);
          if (response.ok) {
            json = await response.json();
          } else {
            throw new Error(`Direct fetch to GAS returned status ${response.status}`);
          }
        } catch (directErr: any) {
          throw new Error(`Celestial downlink offline: Both API Proxy and Direct Google Apps Script fetch failed. Please check the Web App configuration.`);
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
        localStorage.setItem("planetary_transits_custom_url", customSourceUrl);
        localStorage.removeItem("planetary_transits_factory_active");
        setIsFactoryDefault(false);
        setSyncStatus("synced");
      } else {
        throw new Error("No transits or aspect events found in response data");
      }
    } catch (error: any) {
      console.error("[Transits UI] Error loading transits data:", error);
      setErrorMsg(error.message || "Failed to load spreadsheet planetary transits.");
      setSyncStatus("error");
      // CRITICAL: Keep previously cached transits, DO NOT overwrite with default fake data!
    } finally {
      setIsLoading(false);
    }
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

  // Run dynamic fetch on mount
  useEffect(() => {
    loadTransitData();
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

        <div className="flex items-center space-x-3 self-start md:self-center font-mono">
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
      </div>

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
