import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Grid, 
  Compass, 
  BookOpen, 
  ArrowRight,
  Info,
  Calendar,
  Clock
} from "lucide-react";

const REVERSAL_PRESETS = [
  {
    id: "nifty-low-2026",
    name: "NIFTY 50 Major Low (20 Feb 2026)",
    date: "2026-02-20",
    asset: "Nifty 50",
    description: "Major structural consolidation bottom of 2026"
  },
  {
    id: "nifty-high-2026",
    name: "NIFTY 50 Recent Peak (15 Apr 2026)",
    date: "2026-04-15",
    asset: "Nifty 50",
    description: "Geopolitical breakout high of Q2 2026"
  },
  {
    id: "gold-low-2026",
    name: "GOLD (XAUUSD) Spot Low (12 Jan 2026)",
    date: "2026-01-12",
    asset: "Gold",
    description: "Inflation hedge accumulation pivot of 2026"
  },
  {
    id: "gold-high-2026",
    name: "GOLD (XAUUSD) Record Peak (18 May 2026)",
    date: "2026-05-18",
    asset: "Gold",
    description: "All-Time High momentum peak of 2026"
  },
  {
    id: "custom",
    name: "Custom Base Date",
    date: "2026-07-10",
    asset: "Custom Asset",
    description: "User-defined custom astronomical/price pivot point"
  }
];

export default function GannConceptsSection() {
  const [price, setPrice] = useState<string>("23500");
  const [results, setResults] = useState<{
    buy: { sl: string; entry: string; targets: string[] };
    sell: { sl: string; entry: string; targets: string[] };
  } | null>({
    buy: { sl: "23431.10", entry: "23525.60", targets: ["23548.10", "23572.30", "23610.50", "23652.80", "23696.10"] },
    sell: { sl: "23525.60", entry: "23431.10", targets: ["23407.90", "23383.50", "23348.10", "23304.50", "23261.20"] }
  });

  const [activeSubTab, setActiveSubTab] = useState<"scalping" | "square9" | "angles" | "predict_reversal">("scalping");
  const [gridMode, setGridMode] = useState<"support_resistance" | "reversal">("support_resistance");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("nifty-low-2026");
  const [customDate, setCustomDate] = useState<string>("2026-02-20");
  const [priceStepFactor, setPriceStepFactor] = useState<string>("1.0");
  const [selectedCellNum, setSelectedCellNum] = useState<number | null>(1);

  // Predict Reversal states
  const [timeProjDate1, setTimeProjDate1] = useState<string>("2025-04-07");
  const [timeProjDate2, setTimeProjDate2] = useState<string>("2025-06-30");
  const [emblemDate, setEmblemDate] = useState<string>("2025-04-07");

  // Gann Top/Bottom Squaring Tool states
  const [squaringPrice, setSquaringPrice] = useState<number>(25000);
  const [squaringDate, setSquaringDate] = useState<string>("2024-10-10");

  const targetDegrees = [30, 45, 60, 90, 120, 150, 180, 225, 270, 315, 360];

  const calculateGann = () => {
    const refPrice = parseFloat(price);
    if (isNaN(refPrice) || refPrice <= 0) {
      alert("Please enter a valid positive price.");
      return;
    }

    const sqCal = Math.sqrt(refPrice);

    // Entry at 15 degrees
    const buyEntryVal = Math.pow(sqCal + (15 / 180), 2);
    const sellEntryVal = Math.pow(sqCal - (15 / 180), 2);

    // Buy Levels
    const buyEntry = buyEntryVal.toFixed(2);
    const buySL = sellEntryVal.toFixed(2);
    const buyTargets = targetDegrees.slice(0, 6).map(deg => 
      Math.pow(sqCal + (deg / 180), 2).toFixed(2)
    );

    // Sell Levels
    const sellEntry = sellEntryVal.toFixed(2);
    const sellSL = buyEntryVal.toFixed(2);
    const sellTargets = targetDegrees.slice(0, 6).map(deg => 
      Math.pow(sqCal - (deg / 180), 2).toFixed(2)
    );

    setResults({
      buy: { sl: buySL, entry: buyEntry, targets: buyTargets },
      sell: { sl: sellSL, entry: sellEntry, targets: sellTargets }
    });
  };

  // Generate a detailed 5x5 Square of 9 layout based on user price and mode
  const generateSquareOf9 = () => {
    const basePrice = parseFloat(price) || 23500;
    const sq = Math.sqrt(basePrice);
    const stepFactor = parseFloat(priceStepFactor) || 1.0;
    
    // A standard 5x5 matrix spiral structure index
    const spiralIndices = [
      21, 22, 23, 24, 25,
      20,  7,  8,  9, 10,
      19,  6,  1,  2, 11,
      18,  5,  4,  3, 12,
      17, 16, 15, 14, 13
    ];

    const activeBaseDateStr = selectedPresetId === "custom" 
      ? customDate 
      : (REVERSAL_PRESETS.find(p => p.id === selectedPresetId)?.date || "2026-02-20");

    return spiralIndices.map((spiralNum) => {
      // Base degree step is 45 degrees per step in the spiral
      const deg = (spiralNum - 1) * 45;
      
      // Calculate Price based on square of nine formula
      const calculatedVal = Math.pow(sq + (deg / 360) * stepFactor, 2);
      
      // Calculate Date based on Gann days-of-cycle adding deg days
      const date = new Date(activeBaseDateStr);
      date.setDate(date.getDate() + deg);
      
      const formattedDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      const fullDateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const yearStr = date.getFullYear().toString().slice(-2);

      // Days difference relative to current local time (July 10, 2026)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const diffTime = targetDate.getTime() - today.getTime();
      const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Determine if cardinal (0, 90, 180, 270) or ordinal (45, 135, 225, 315) relative to cycles
      const isCenter = spiralNum === 1;
      const isCardinal = [3, 5, 7, 9, 15, 17, 19, 21, 23, 25].includes(spiralNum);
      const isOrdinal = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24].includes(spiralNum);

      return {
        num: spiralNum,
        val: calculatedVal.toFixed(1),
        deg: deg % 360,
        totalDeg: deg,
        isCenter,
        isCardinal,
        isOrdinal,
        dateStr: `${formattedDate} '${yearStr}`,
        fullDateStr,
        daysDiff
      };
    });
  };

  const square9Grid = generateSquareOf9();
  const activeCell = square9Grid.find(c => c.num === selectedCellNum) || square9Grid[0];

  const showLtpReference = activeSubTab === "scalping" || (activeSubTab === "square9" && gridMode === "support_resistance");

  return (
    <div id="gann-concepts-container" className="flex-1 p-4 flex flex-col bg-terminal-bg">
      {/* Header Panel */}
      <div id="gann-header" className="border-b border-terminal-border pb-4 mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center">
            <Compass className="w-5 h-5 text-terminal-accent mr-2 animate-spin-slow" />
            W.D. GANN MATHEMATICAL TRADING SUITE
          </h2>
          <p className="text-xs text-gray-500 font-mono mt-1">
            Utilizing time-and-price geometric squaring, Square of Nine spiral grids, and mathematical scalping pivots.
          </p>
        </div>

        {/* Input widget */}
        {showLtpReference && (
          <div className="flex items-center space-x-2 bg-terminal-card border border-terminal-border p-1 rounded-md">
            <span className="text-[10px] font-mono text-gray-400 uppercase px-2">LTP REFERENCE:</span>
            <input 
              type="number" 
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="LTP..."
              className="bg-terminal-bg border border-terminal-border rounded px-2.5 py-1 text-xs text-white focus:border-terminal-accent outline-none font-mono w-24"
            />
            <button 
              onClick={calculateGann}
              className="bg-terminal-accent hover:bg-terminal-accent/80 text-white font-mono text-xs px-3 py-1 rounded transition-colors flex items-center"
            >
              <Calculator className="w-3 h-3 mr-1" />
              CALC
            </button>
          </div>
        )}
      </div>

      {/* Internal Tabs */}
      <div id="gann-tabs" className="flex border-b border-terminal-border mb-4 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab("scalping")}
          className={`px-4 py-2 border-b-2 font-mono text-[10px] uppercase tracking-widest font-black transition-all ${
            activeSubTab === "scalping" 
              ? "border-terminal-accent text-white bg-terminal-accent/5" 
              : "border-transparent text-gray-500 hover:text-white"
          }`}
        >
          <div className="flex items-center">
            <TrendingUp className="w-3.5 h-3.5 mr-2 text-terminal-green" />
            GANN INTRADAY SCALPING
          </div>
        </button>
        <button
          onClick={() => setActiveSubTab("square9")}
          className={`px-4 py-2 border-b-2 font-mono text-[10px] uppercase tracking-widest font-black transition-all ${
            activeSubTab === "square9" 
              ? "border-terminal-accent text-white bg-terminal-accent/5" 
              : "border-transparent text-gray-500 hover:text-white"
          }`}
        >
          <div className="flex items-center">
            <Grid className="w-3.5 h-3.5 mr-2 text-terminal-accent" />
            SQUARE OF NINE GRID
          </div>
        </button>
        <button
          onClick={() => setActiveSubTab("angles")}
          className={`px-4 py-2 border-b-2 font-mono text-[10px] uppercase tracking-widest font-black transition-all ${
            activeSubTab === "angles" 
              ? "border-terminal-accent text-white bg-terminal-accent/5" 
              : "border-transparent text-gray-500 hover:text-white"
          }`}
        >
          <div className="flex items-center">
            <BookOpen className="w-3.5 h-3.5 mr-2 text-yellow-500" />
            ANGLE & CYCLE THEORY
          </div>
        </button>
        <button
          onClick={() => setActiveSubTab("predict_reversal")}
          className={`px-4 py-2 border-b-2 font-mono text-[10px] uppercase tracking-widest font-black transition-all ${
            activeSubTab === "predict_reversal" 
              ? "border-terminal-accent text-white bg-terminal-accent/5" 
              : "border-transparent text-gray-500 hover:text-white"
          }`}
        >
          <div className="flex items-center">
            <Calendar className="w-3.5 h-3.5 mr-2 text-terminal-accent animate-pulse" />
            PREDICT REVERSAL
          </div>
        </button>
      </div>

      {/* Subtab Contents */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          {activeSubTab === "scalping" && (
            <motion.div 
              key="scalping"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {results && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Buy Table */}
                  <div className="terminal-card overflow-hidden border-terminal-green/20 bg-terminal-card/30">
                    <div className="terminal-header bg-terminal-green/5 border-terminal-green/25">
                      <div className="flex items-center text-terminal-green font-bold text-xs uppercase">
                        <TrendingUp className="w-3.5 h-3.5 mr-2" />
                        GANN BULLISH PIVOTS (BUYING SIDE)
                      </div>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="flex items-center justify-between bg-terminal-green/10 border border-terminal-green/20 p-3.5 rounded-lg">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">TRIGGER BUY ENTRY</span>
                          <span className="text-xl font-black text-terminal-green tracking-tight font-mono">{results.buy.entry}</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">STOP LOSS (15° REV)</span>
                          <span className="text-sm font-black text-terminal-red font-mono">{results.buy.sl}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider font-bold">GANN ANGLE TARGET PROJECTIONS</span>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {results.buy.targets.map((tgt, idx) => (
                            <div key={idx} className="bg-white/5 border border-white/5 p-2 rounded text-center">
                              <div className="text-[8px] font-mono text-gray-500 uppercase">TGT {idx + 1}</div>
                              <div className="text-xs font-bold text-white font-mono mt-0.5">{tgt}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sell Table */}
                  <div className="terminal-card overflow-hidden border-terminal-red/20 bg-terminal-card/30">
                    <div className="terminal-header bg-terminal-red/5 border-terminal-red/25">
                      <div className="flex items-center text-terminal-red font-bold text-xs uppercase">
                        <TrendingDown className="w-3.5 h-3.5 mr-2" />
                        GANN BEARISH PIVOTS (SELLING SIDE)
                      </div>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="flex items-center justify-between bg-terminal-red/10 border border-terminal-red/20 p-3.5 rounded-lg">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">TRIGGER SELL ENTRY</span>
                          <span className="text-xl font-black text-terminal-red tracking-tight font-mono">{results.sell.entry}</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">STOP LOSS (15° REV)</span>
                          <span className="text-sm font-black text-terminal-green font-mono">{results.sell.sl}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider font-bold">GANN ANGLE TARGET PROJECTIONS</span>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {results.sell.targets.map((tgt, idx) => (
                            <div key={idx} className="bg-white/5 border border-white/5 p-2 rounded text-center">
                              <div className="text-[8px] font-mono text-gray-500 uppercase">TGT {idx + 1}</div>
                              <div className="text-xs font-bold text-white font-mono mt-0.5">{tgt}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeSubTab === "square9" && (
            <motion.div 
              key="square9"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-4"
            >
              {/* Grid Mode Selector Header */}
              <div id="grid-mode-selector-header" className="lg:col-span-12 bg-terminal-card/40 border border-terminal-border rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-terminal-accent uppercase tracking-widest font-bold">GRID DYNAMICS SELECTOR</span>
                  <div className="flex items-center space-x-3">
                    <select
                      value={gridMode}
                      onChange={(e) => setGridMode(e.target.value as "support_resistance" | "reversal")}
                      className="bg-terminal-bg border border-terminal-border rounded px-3 py-1.5 text-xs text-white focus:border-terminal-accent outline-none font-mono font-bold cursor-pointer hover:bg-terminal-card transition-colors"
                    >
                      <option value="support_resistance">SUPPORT & RESISTANCE (PRICE MATRIX)</option>
                      <option value="reversal">TREND REVERSAL (TIME / DATE MATRIX)</option>
                    </select>
                  </div>
                </div>

                {/* Mode Specific Settings */}
                {gridMode === "support_resistance" ? (
                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center space-x-2 bg-terminal-bg border border-terminal-border p-1 rounded w-full md:w-auto justify-between md:justify-start">
                      <span className="text-[9px] font-mono text-gray-400 uppercase px-1.5">PRICE STEP MULTIPLIER:</span>
                      <select
                        value={priceStepFactor}
                        onChange={(e) => setPriceStepFactor(e.target.value)}
                        className="bg-terminal-card border border-terminal-border/60 rounded px-2 py-0.5 text-xs text-white focus:border-terminal-accent outline-none font-mono cursor-pointer"
                      >
                        <option value="0.1">0.1 (Forex/Crypto)</option>
                        <option value="0.5">0.5 (Low Priced Equities)</option>
                        <option value="1.0">1.0 (Standard Indices / Stocks)</option>
                        <option value="2.0">2.0 (High Precision / Commodities)</option>
                        <option value="5.0">5.0 (High Range Indices)</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {/* Preset Selector */}
                    <div className="flex items-center space-x-2 bg-terminal-bg border border-terminal-border p-1 rounded w-full md:w-auto justify-between md:justify-start">
                      <span className="text-[9px] font-mono text-gray-400 uppercase px-1.5">SIGNIFICANT BASE:</span>
                      <select
                        value={selectedPresetId}
                        onChange={(e) => setSelectedPresetId(e.target.value)}
                        className="bg-terminal-card border border-terminal-border/60 rounded px-2 py-0.5 text-xs text-white focus:border-terminal-accent outline-none font-mono cursor-pointer"
                      >
                        {REVERSAL_PRESETS.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Date Picker */}
                    <div className="flex items-center space-x-2 bg-terminal-bg border border-terminal-border p-1 rounded w-full md:w-auto justify-between md:justify-start">
                      <span className="text-[9px] font-mono text-gray-400 uppercase px-1.5">BASE DATE:</span>
                      <input
                        type="date"
                        value={selectedPresetId === "custom" ? customDate : (REVERSAL_PRESETS.find(p => p.id === selectedPresetId)?.date || "2026-02-20")}
                        onChange={(e) => {
                          setCustomDate(e.target.value);
                          setSelectedPresetId("custom");
                        }}
                        className="bg-terminal-card border border-terminal-border/60 rounded px-2 py-0.5 text-xs text-white focus:border-terminal-accent outline-none font-mono w-32 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Left Side: Square of 9 Spiral Grid */}
              <div className="lg:col-span-8 terminal-card p-6 flex flex-col items-center justify-center relative min-h-[460px]">
                <div className="absolute top-4 left-4 flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-terminal-accent animate-pulse" />
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                    {gridMode === "support_resistance" ? "Price Matrix Mode" : "Time Cycle Mode"}
                  </span>
                </div>

                <div className="absolute top-4 right-4 text-[9px] font-mono text-gray-500 uppercase">
                  Click cells for analysis
                </div>

                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em] mb-4 mt-2">GANN SQUARE OF NINE MATRIX SPIRAL</span>
                <div className="grid grid-cols-5 gap-2 max-w-md w-full aspect-square">
                  {square9Grid.map((cell, idx) => {
                    let cellBg = "bg-white/5 border-white/5 hover:bg-white/10";
                    let textClass = "text-white";
                    
                    if (cell.isCenter) {
                      cellBg = "bg-terminal-accent/20 border-terminal-accent/40 hover:bg-terminal-accent/35";
                      textClass = "text-terminal-accent font-black";
                    } else if (cell.isCardinal) {
                      cellBg = "bg-terminal-green/10 border-terminal-green/20 hover:bg-terminal-green/15";
                      textClass = "text-terminal-green font-bold";
                    } else if (cell.isOrdinal) {
                      cellBg = "bg-yellow-400/5 border-yellow-400/10 hover:bg-yellow-400/10";
                      textClass = "text-yellow-500";
                    }

                    // Highlight selected cell
                    const isSelected = selectedCellNum === cell.num;
                    const selectedBorder = isSelected 
                      ? "ring-2 ring-terminal-accent ring-offset-2 ring-offset-black border-transparent scale-[1.02]" 
                      : "";

                    return (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedCellNum(cell.num)}
                        className={`border rounded p-1.5 flex flex-col justify-between transition-all duration-200 cursor-pointer group relative select-none ${cellBg} ${selectedBorder}`}
                      >
                        <span className="text-[8px] font-mono text-gray-500 tracking-tighter absolute top-1 left-1">
                          #{cell.num}
                        </span>
                        <span className="text-[8px] font-mono text-gray-500 tracking-tighter absolute top-1 right-1">
                          {cell.deg}°
                        </span>
                        
                        <div className="text-center font-mono font-black mt-3.5 tracking-tight flex flex-col items-center justify-center h-full">
                          {gridMode === "support_resistance" ? (
                            <span className={`text-xs ${textClass}`}>{cell.val}</span>
                          ) : (
                            <>
                              <span className={`text-[10px] leading-tight ${textClass}`}>{cell.dateStr.split(" ")[0]} {cell.dateStr.split(" ")[1]}</span>
                              <span className="text-[7.5px] font-mono text-gray-500 mt-0.5 leading-none">
                                {cell.daysDiff === 0 ? "Today" : cell.daysDiff > 0 ? `In ${cell.daysDiff}d` : `${Math.abs(cell.daysDiff)}d ago`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-wrap gap-4 items-center justify-center text-[10px] font-mono">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-terminal-accent/25 border border-terminal-accent/40 rounded" />
                    <span className="text-gray-400">CENTER (BASE)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-terminal-green/15 border border-terminal-green/30 rounded" />
                    <span className="text-gray-400">CARDINAL (90° MULTIPLES)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-yellow-400/5 border border-yellow-400/10 rounded" />
                    <span className="text-gray-400">ORDINAL (45° TRANSITS)</span>
                  </div>
                </div>
              </div>

              {/* Right Side: Details / Legend Panel */}
              <div className="lg:col-span-4 space-y-4">
                {gridMode === "support_resistance" ? (
                  <>
                    {/* Active Cell Details (Support & Resistance Breakdown) */}
                    {activeCell && (
                      <div className="terminal-card p-4 space-y-3 border-terminal-accent/20 bg-terminal-accent/5">
                        <div className="flex items-center space-x-2 text-terminal-accent">
                          <Compass className="w-4 h-4 animate-spin-slow" />
                          <h4 className="text-xs font-bold uppercase tracking-wider">LEVEL ANALYSIS: CELL #{activeCell.num}</h4>
                        </div>
                        <div className="p-3 bg-black/40 rounded border border-terminal-border flex justify-between items-center font-mono">
                          <div>
                            <div className="text-[8px] text-gray-500 uppercase">CALCULATED VALUE</div>
                            <div className="text-lg font-black text-white">{activeCell.val}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[8px] text-gray-500 uppercase">WHEEL DEGREE</div>
                            <div className="text-xs font-bold text-terminal-accent">{activeCell.deg}° ({activeCell.totalDeg}° cumulative)</div>
                          </div>
                        </div>

                        <div className="text-xs space-y-2 leading-relaxed">
                          <p className="text-gray-300">
                            This level represents an angle of <strong className="text-terminal-accent">{activeCell.totalDeg}°</strong> from the square root base coordinates. 
                          </p>
                          <div className="text-[11px] font-mono text-gray-400 p-2 bg-black/20 rounded border border-terminal-border/40">
                            {activeCell.isCenter ? (
                              <span className="text-terminal-accent">★ This is the central balance pivot (LTP Reference). It acts as the magnetic base of all geometrical spirals.</span>
                            ) : activeCell.isCardinal ? (
                              <span className="text-terminal-green">▲ <strong>Cardinal Support/Resistance:</strong> Highly critical 90° transit. Expect high volume rejection or aggressive breakout expansion on candle close above/below.</span>
                            ) : activeCell.isOrdinal ? (
                              <span className="text-yellow-500">◆ <strong>Ordinal Support/Resistance:</strong> Medium-impact 45° trend sub-pivot. Acts as local continuation checkpoints.</span>
                            ) : (
                              <span className="text-gray-400">● <strong>Intermediate Node:</strong> Off-axis price coordinates. Focus on cardinal levels for primary execution.</span>
                            )}
                          </div>
                          
                          {/* Next projections */}
                          {!activeCell.isCenter && (
                            <div className="space-y-1 mt-2">
                              <div className="text-[9px] text-gray-500 font-mono uppercase font-bold">Trading Application:</div>
                              <div className="text-[11px] text-gray-400">
                                {parseFloat(activeCell.val) > parseFloat(price) ? (
                                  <span>If price rallies and closes above <strong className="text-white">{activeCell.val}</strong>, it confirms bullish continuation. Next ordinal resistance is situated near high-degree spiral targets.</span>
                                ) : (
                                  <span>If price falls and breaks below <strong className="text-white">{activeCell.val}</strong>, it indicates bearish momentum. Look for major demand at lower cardinal crosses.</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* How to read Square of 9 (Standard Legend) */}
                    <div className="terminal-card p-4 space-y-3">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Gann Square of 9 Rules</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        The Square of Nine maps numerical values into a concentric square spiral. Key ratios are determined by the cardinal and ordinal cross angles:
                      </p>
                      <ul className="space-y-2 text-[11px] font-mono text-gray-400">
                        <li className="flex items-start">
                          <ArrowRight className="w-3.5 h-3.5 text-terminal-accent mr-1.5 flex-shrink-0 mt-0.5" />
                          <span><strong>Cardinal Cross (90° Multiples):</strong> Found on the horizontal & vertical axes. The highest statistical probability of trend terminations.</span>
                        </li>
                        <li className="flex items-start">
                          <ArrowRight className="w-3.5 h-3.5 text-yellow-500 mr-1.5 flex-shrink-0 mt-0.5" />
                          <span><strong>Ordinal Cross (45° Multiples):</strong> Found on the diagonal axes. Represents minor trend accelerations or pullback floors.</span>
                        </li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Active Cell Details (Time Reversal Analysis) */}
                    {activeCell && (
                      <div className="terminal-card p-4 space-y-3 border-terminal-accent/20 bg-terminal-accent/5">
                        <div className="flex items-center space-x-2 text-terminal-accent">
                          <Compass className="w-4 h-4 animate-spin-slow" />
                          <h4 className="text-xs font-bold uppercase tracking-wider">REVERSAL ANALYSIS: CELL #{activeCell.num}</h4>
                        </div>
                        <div className="p-3 bg-black/40 rounded border border-terminal-border flex justify-between items-center font-mono">
                          <div>
                            <div className="text-[8px] text-gray-500 uppercase">CALCULATED TARGET DATE</div>
                            <div className="text-sm font-black text-white">{activeCell.fullDateStr}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[8px] text-gray-500 uppercase">TIME CYCLE</div>
                            <div className="text-[10px] font-bold text-terminal-accent">+{activeCell.totalDeg} Days ({activeCell.deg}°)</div>
                          </div>
                        </div>

                        <div className="text-xs space-y-2 leading-relaxed">
                          <div className="text-[11px] font-mono text-gray-400 p-2 bg-black/20 rounded border border-terminal-border/40">
                            {activeCell.daysDiff === 0 ? (
                              <span className="text-terminal-accent font-bold animate-pulse">★ TODAY is the exact mathematical time-and-price squaring intersection! Extreme volatility and trend termination alert!</span>
                            ) : activeCell.daysDiff > 0 ? (
                              <span>This cycle matures in <strong className="text-terminal-green">{activeCell.daysDiff} days</strong>. Monitor market action around this date closely.</span>
                            ) : (
                              <span>This cycle matured <strong className="text-gray-400">{Math.abs(activeCell.daysDiff)} days ago</strong>. Check historical charts for a high/low pivot matching this window.</span>
                            )}
                          </div>

                          <p className="text-gray-300 text-[11px] leading-relaxed">
                            {activeCell.isCenter ? (
                              <span>This represents the seed coordinate (0° / Base Date). All future astronomical and price-time cycle targets are projected from here.</span>
                            ) : activeCell.isCardinal ? (
                              <span><strong className="text-terminal-green">Cardinal Reversal (High Probability):</strong> Mapped at a high-potency 90° multiple. W.D. Gann's theory states that when price aligns with time at 90°, 180°, 270°, or 360° intervals, a **Major Trend Reversal** is highly probable.</span>
                            ) : activeCell.isOrdinal ? (
                              <span><strong className="text-yellow-500">Ordinal Reversal (Medium Probability):</strong> Mapped at a diagonal 45° transit. These points usually prompt short-term corrections, local consolidations, or rapid acceleration.</span>
                            ) : (
                              <span><strong>Minor Time Node:</strong> Represents intermediate degree intervals. Holds lesser structural weight but can align with smaller intra-week consolidations.</span>
                            )}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Upcoming Reversal Chronology */}
                    <div className="terminal-card p-4 space-y-3 overflow-hidden">
                      <div className="flex items-center justify-between border-b border-terminal-border pb-1.5">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Cycle Reversal Schedule</h4>
                        <span className="text-[8px] font-mono text-gray-500 uppercase">Chronological list</span>
                      </div>
                      
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 font-mono text-[10px]">
                        {square9Grid
                          .filter(cell => !cell.isCenter && cell.daysDiff >= -15) // Keep upcoming and very recent reversals
                          .sort((a, b) => a.daysDiff - b.daysDiff) // Sort chronologically (closest to today first)
                          .map((cell, idx) => {
                            let typeColor = "text-gray-500 border-gray-500/20 bg-gray-500/5";
                            let typeLabel = "MINOR";
                            
                            if (cell.isCardinal) {
                              typeColor = "text-terminal-red border-terminal-red/30 bg-terminal-red/5";
                              typeLabel = "CRITICAL CARDINAL";
                            } else if (cell.isOrdinal) {
                              typeColor = "text-yellow-500 border-yellow-500/30 bg-yellow-500/5";
                              typeLabel = "ORDINAL TIME";
                            }

                            const daysLabel = cell.daysDiff === 0 
                              ? "TODAY" 
                              : cell.daysDiff > 0 
                                ? `In ${cell.daysDiff} days` 
                                : `${Math.abs(cell.daysDiff)} days ago`;

                            return (
                              <div 
                                key={idx} 
                                onClick={() => setSelectedCellNum(cell.num)}
                                className={`p-2 rounded border transition-all cursor-pointer ${
                                  selectedCellNum === cell.num 
                                    ? "border-terminal-accent bg-terminal-accent/10" 
                                    : "border-terminal-border/50 hover:border-terminal-border bg-black/10"
                                }`}
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-bold text-white uppercase">{cell.fullDateStr}</span>
                                  <span className={`text-[8px] px-1.5 py-0.2 rounded border font-mono tracking-tighter ${typeColor}`}>
                                    {typeLabel}
                                  </span>
                                </div>
                                <div className="flex justify-between text-[9px] text-gray-400">
                                  <span>Step #{cell.num} ({cell.deg}°)</span>
                                  <span className={cell.daysDiff >= 0 ? "text-terminal-accent font-bold" : "text-gray-400"}>
                                    {daysLabel}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {activeSubTab === "angles" && (
            <motion.div 
              key="angles"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="terminal-card p-5 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">GANN GEOMETRIC ANGLES (TIME-PRICE RELATION)</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Gann angles are calculated by plotting price increments against time units. The most crucial angle is the 1x1, which represents one unit of price to one unit of time.
                </p>
                <div className="space-y-2 font-mono text-xs text-gray-400">
                  <div className="flex justify-between items-center p-2 bg-white/5 rounded">
                    <span className="font-bold text-white">1x1 Angle (45°)</span>
                    <span className="text-terminal-green">True Equilibrium (Trend Maintained)</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-white/5 rounded">
                    <span className="font-bold text-white">2x1 Angle (26.5°)</span>
                    <span className="text-terminal-accent">Strong Acceleration (Fast Bullish/Bearish)</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-white/5 rounded">
                    <span className="font-bold text-white">4x1 Angle (15°)</span>
                    <span className="text-yellow-500">Parabolic Run (Overextended)</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-white/5 rounded">
                    <span className="font-bold text-white">1x2 Angle (63.5°)</span>
                    <span className="text-terminal-red">Weak Trend (Vulnerable to Fall)</span>
                  </div>
                </div>
              </div>

              <div className="terminal-card p-5 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">RULE OF EMBLEM CYCLES</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Cycles are split by division of a circle (360 degrees). Major trend pivots occur during critical cycle intervals:
                </p>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-gray-400">
                  <div className="p-2.5 bg-white/5 rounded border border-white/5">
                    <div className="font-bold text-white">30 Day Cycle</div>
                    <span className="text-[10px] text-gray-500">Minor consolidation pivot.</span>
                  </div>
                  <div className="p-2.5 bg-white/5 rounded border border-white/5">
                    <div className="font-bold text-white">90 Day Cycle</div>
                    <span className="text-[10px] text-gray-500">Significant trend reversal pivot.</span>
                  </div>
                  <div className="p-2.5 bg-white/5 rounded border border-white/5">
                    <div className="font-bold text-white">180 Day Cycle</div>
                    <span className="text-[10px] text-gray-500">Extremely high impact trend shift.</span>
                  </div>
                  <div className="p-2.5 bg-white/5 rounded border border-white/5">
                    <div className="font-bold text-white">360 Day Cycle</div>
                    <span className="text-[10px] text-gray-500">Major year cycle reset.</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeSubTab === "predict_reversal" && (
            <motion.div 
              key="predict_reversal"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Column 1: Time Projection */}
              <div className="space-y-4">
                <div className="terminal-card p-5 space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-terminal-accent/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex items-center space-x-2 text-terminal-accent">
                    <Calendar className="w-5 h-5 text-terminal-accent" />
                    <h4 className="text-xs font-bold uppercase tracking-wider font-mono">TIME PROJECTION MULTIPLIERS</h4>
                  </div>
                  
                  {/* Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/30 p-3 rounded border border-terminal-border/40 font-mono">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-gray-400 uppercase font-bold">Start Date (Date 1)</label>
                      <input 
                        type="date"
                        value={timeProjDate1}
                        onChange={(e) => setTimeProjDate1(e.target.value)}
                        className="bg-terminal-bg border border-terminal-border/60 rounded px-2.5 py-1.5 text-xs text-white focus:border-terminal-accent outline-none cursor-pointer"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-gray-400 uppercase font-bold">End Date (Date 2)</label>
                      <input 
                        type="date"
                        value={timeProjDate2}
                        onChange={(e) => setTimeProjDate2(e.target.value)}
                        className="bg-terminal-bg border border-terminal-border/60 rounded px-2.5 py-1.5 text-xs text-white focus:border-terminal-accent outline-none cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Calculations Info */}
                  {(() => {
                    const d1 = new Date(timeProjDate1);
                    const d2 = new Date(timeProjDate2);
                    const msPerDay = 86400000;
                    const diffMs = d2.getTime() - d1.getTime();
                    const range_days = isNaN(diffMs) ? 0 : Math.round(diffMs / msPerDay) - 4;
                    const multipliers = [0.25, 0.50, 0.75, 1.00, 1.25, 1.50, 1.75, 2.00];
                    
                    return (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center bg-terminal-accent/5 p-3 rounded border border-terminal-accent/20 font-mono text-xs">
                          <div>
                            <span className="text-[9px] text-gray-500 uppercase">CALCULATED RANGE DAYS (NET - 4 DAYS OFFSET)</span>
                            <div className="text-base font-black text-white">{range_days} Days</div>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-gray-500 uppercase font-bold text-terminal-accent">RAW RANGE</span>
                            <div className="text-xs font-bold text-gray-400">
                              {isNaN(diffMs) ? "0" : Math.round(diffMs / msPerDay)} days
                            </div>
                          </div>
                        </div>

                        {/* Table */}
                        <div className="border border-terminal-border rounded overflow-hidden">
                          <table className="w-full font-mono text-xs text-left">
                            <thead>
                              <tr className="bg-terminal-card border-b border-terminal-border text-gray-400 text-[10px] uppercase">
                                <th className="p-2.5 font-bold">MULTIPLIER</th>
                                <th className="p-2.5 font-bold">FUTURE DAYS</th>
                                <th className="p-2.5 font-bold">PROJECTED REVERSAL DATE</th>
                                <th className="p-2.5 font-bold text-right">STATUS / TIME WINDOW</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-terminal-border/50 bg-black/10 text-[11px]">
                              {multipliers.map((factor, i) => {
                                const future_days = isNaN(range_days) ? 0 : Math.round(range_days * factor);
                                const future_time = d2.getTime() + future_days * msPerDay;
                                const futureDate = new Date(future_time);
                                
                                const formattedDate = isNaN(future_time) ? "N/A" : futureDate.toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric"
                                }).replace(/ /g, "-");

                                const today = new Date();
                                today.setHours(0,0,0,0);
                                const dateToCheck = new Date(futureDate);
                                dateToCheck.setHours(0,0,0,0);
                                const daysDiff = isNaN(future_time) ? 0 : Math.ceil((dateToCheck.getTime() - today.getTime()) / msPerDay);

                                return (
                                  <tr key={i} className="hover:bg-white/5 transition-colors">
                                    <td className="p-2.5 font-bold text-terminal-green">x{factor.toFixed(2)}</td>
                                    <td className="p-2.5 text-gray-400">+{future_days} days</td>
                                    <td className="p-2.5 text-white font-bold">{formattedDate}</td>
                                    <td className="p-2.5 text-right">
                                      {daysDiff === 0 ? (
                                        <span className="text-terminal-accent font-bold animate-pulse">TODAY ★</span>
                                      ) : daysDiff > 0 ? (
                                        <span className="text-terminal-green font-bold">In {daysDiff} days</span>
                                      ) : (
                                        <span className="text-gray-500">{Math.abs(daysDiff)} days ago</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Column 2: Gann Emblems */}
              <div className="space-y-4">
                <div className="terminal-card p-5 space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex items-center space-x-2 text-yellow-500">
                    <Clock className="w-5 h-5 animate-spin-slow text-yellow-500" />
                    <h4 className="text-xs font-bold uppercase tracking-wider font-mono">GANN EMBLEM CYCLES (90° TO 270°)</h4>
                  </div>
                  
                  {/* Input */}
                  <div className="bg-black/30 p-3 rounded border border-terminal-border/40 font-mono flex flex-col gap-1.5">
                    <label className="text-[10px] text-gray-400 uppercase font-bold">Swing Pivot Date</label>
                    <input 
                      type="date"
                      value={emblemDate}
                      onChange={(e) => setEmblemDate(e.target.value)}
                      className="bg-terminal-bg border border-terminal-border/60 rounded px-2.5 py-1.5 text-xs text-white focus:border-terminal-accent outline-none cursor-pointer"
                    />
                  </div>

                  {/* emblemPeriods calculation table */}
                  {(() => {
                    const baseDate = new Date(emblemDate);
                    const msPerDay = 86400000;
                    
                    const emblemPeriods = [
                      { label: "90° Degree", days: 91.24992, color: "text-red-500 bg-red-500/10 border-red-500/20" },
                      { label: "120° Degree", days: 121.66656, color: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
                      { label: "144° Degree", days: 145.999872, color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
                      { label: "180° Degree", days: 182.49984, color: "text-green-500 bg-green-500/10 border-green-500/20" },
                      { label: "216° Degree", days: 218.999808, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
                      { label: "240° Degree", days: 243.33312, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
                      { label: "270° Degree", days: 273.74976, color: "text-fuchsia-500 bg-fuchsia-500/10 border-fuchsia-500/20" }
                    ];

                    return (
                      <div className="space-y-4">
                        <div className="border border-terminal-border rounded overflow-hidden">
                          <table className="w-full font-mono text-xs text-left">
                            <thead>
                              <tr className="bg-terminal-card border-b border-terminal-border text-gray-400 text-[10px] uppercase">
                                <th className="p-2.5 font-bold">DEGREE</th>
                                <th className="p-2.5 font-bold">TARGET DATE</th>
                                <th className="p-2.5 font-bold text-right">DAYS OFFSET</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-terminal-border/50 bg-black/10 text-[11px]">
                              {emblemPeriods.map((period, i) => {
                                const targetTime = baseDate.getTime() + period.days * msPerDay;
                                const targetDate = new Date(targetTime);
                                
                                // format: yyyy-MM-dd
                                const yr = targetDate.getFullYear();
                                const mo = String(targetDate.getMonth() + 1).padStart(2, '0');
                                const dy = String(targetDate.getDate()).padStart(2, '0');
                                const formattedDate = isNaN(targetTime) ? "N/A" : `${yr}-${mo}-${dy}`;

                                const today = new Date();
                                today.setHours(0,0,0,0);
                                const dateToCheck = new Date(targetDate);
                                dateToCheck.setHours(0,0,0,0);
                                const daysDiff = isNaN(targetTime) ? 0 : Math.ceil((dateToCheck.getTime() - today.getTime()) / msPerDay);

                                return (
                                  <tr key={i} className="hover:bg-white/5 transition-colors">
                                    <td className="p-2.5">
                                      <span className={`px-2 py-0.5 rounded border text-[9px] font-mono font-bold ${period.color}`}>
                                        {period.label}
                                      </span>
                                    </td>
                                    <td className="p-2.5 font-bold text-white">{formattedDate}</td>
                                    <td className="p-2.5 text-right font-mono text-[10px]">
                                      {daysDiff === 0 ? (
                                        <span className="text-terminal-accent font-bold animate-pulse">TODAY</span>
                                      ) : daysDiff > 0 ? (
                                        <span className="text-terminal-green">In {daysDiff}d</span>
                                      ) : (
                                        <span className="text-gray-500">{Math.abs(daysDiff)}d ago</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Column 3: Gann Top/Bottom Squaring Tool */}
              <div className="space-y-4">
                <div className="terminal-card p-5 space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-terminal-accent/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex items-center space-x-2 text-terminal-accent">
                    <TrendingUp className="w-5 h-5 text-terminal-accent" />
                    <h4 className="text-xs font-bold uppercase tracking-wider font-mono">GANN TOP/BOTTOM SQUARING</h4>
                  </div>
                  
                  {/* Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/30 p-3 rounded border border-terminal-border/40 font-mono">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-gray-400 uppercase font-bold">Swing Price</label>
                      <input 
                        type="number"
                        value={squaringPrice}
                        onChange={(e) => setSquaringPrice(parseFloat(e.target.value) || 0)}
                        className="bg-terminal-bg border border-terminal-border/60 rounded px-2.5 py-1.5 text-xs text-white focus:border-terminal-accent outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-gray-400 uppercase font-bold">Swing Date</label>
                      <input 
                        type="date"
                        value={squaringDate}
                        onChange={(e) => setSquaringDate(e.target.value)}
                        className="bg-terminal-bg border border-terminal-border/60 rounded px-2.5 py-1.5 text-xs text-white focus:border-terminal-accent outline-none cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Calculations Info */}
                  {(() => {
                    const priceVal = squaringPrice;
                    const divisor = priceVal >= 10000 ? 1000 :
                                    priceVal >= 1000 ? 100 :
                                    priceVal >= 100  ? 10 : 1;
                    const baseValue = priceVal / divisor;
                    const roundedBase = Math.round(baseValue);
                    
                    const baseDate = new Date(squaringDate);
                    const msPerDay = 86400000;
                    
                    const squaringRows = [];
                    for (let i = 1; i <= 9; i++) {
                      const dayCount = roundedBase * i;
                      const futureTime = baseDate.getTime() + dayCount * msPerDay;
                      const futureDate = new Date(futureTime);
                      
                      const yr = futureDate.getFullYear();
                      const mo = String(futureDate.getMonth() + 1).padStart(2, '0');
                      const dy = String(futureDate.getDate()).padStart(2, '0');
                      const formattedDate = isNaN(futureTime) ? "N/A" : `${yr}-${mo}-${dy}`;
                      
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      const dateToCheck = new Date(futureDate);
                      dateToCheck.setHours(0,0,0,0);
                      const daysDiff = isNaN(futureTime) ? 0 : Math.ceil((dateToCheck.getTime() - today.getTime()) / msPerDay);
                      
                      squaringRows.push({
                        factor: i,
                        dayCount,
                        formattedDate,
                        daysDiff
                      });
                    }

                    return (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center bg-terminal-accent/5 p-3 rounded border border-terminal-accent/20 font-mono text-xs">
                          <div>
                            <span className="text-[9px] text-gray-500 uppercase">ROUNDED BASE VALUE</span>
                            <div className="text-base font-black text-white">{roundedBase} Days</div>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-gray-500 uppercase font-bold text-terminal-accent">PRICE DIVISOR</span>
                            <div className="text-xs font-bold text-gray-400">
                              /{divisor} (Base: {baseValue.toFixed(2)})
                            </div>
                          </div>
                        </div>

                        {/* Table */}
                        <div className="border border-terminal-border rounded overflow-hidden">
                          <table className="w-full font-mono text-xs text-left">
                            <thead>
                              <tr className="bg-terminal-card border-b border-terminal-border text-gray-400 text-[10px] uppercase">
                                <th className="p-2.5 font-bold">STEP</th>
                                <th className="p-2.5 font-bold">TRADING DAYS</th>
                                <th className="p-2.5 font-bold">CALENDAR DATE</th>
                                <th className="p-2.5 font-bold text-right">DAYS OFFSET</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-terminal-border/50 bg-black/10 text-[11px]">
                              {squaringRows.map((row) => (
                                <tr key={row.factor} className="hover:bg-white/5 transition-colors">
                                  <td className="p-2.5 font-bold text-terminal-green">Step {row.factor}</td>
                                  <td className="p-2.5 text-gray-400">+{row.dayCount} days</td>
                                  <td className="p-2.5 text-white font-bold">{row.formattedDate}</td>
                                  <td className="p-2.5 text-right font-mono text-[10px]">
                                    {row.daysDiff === 0 ? (
                                      <span className="text-terminal-accent font-bold animate-pulse">TODAY</span>
                                    ) : row.daysDiff > 0 ? (
                                      <span className="text-terminal-green">In {row.daysDiff}d</span>
                                    ) : (
                                      <span className="text-gray-500">{Math.abs(row.daysDiff)}d ago</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
