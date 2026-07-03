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
  Info
} from "lucide-react";

export default function GannConceptsSection() {
  const [price, setPrice] = useState<string>("23500");
  const [results, setResults] = useState<{
    buy: { sl: string; entry: string; targets: string[] };
    sell: { sl: string; entry: string; targets: string[] };
  } | null>({
    buy: { sl: "23431.10", entry: "23525.60", targets: ["23548.10", "23572.30", "23610.50", "23652.80", "23696.10"] },
    sell: { sl: "23525.60", entry: "23431.10", targets: ["23407.90", "23383.50", "23348.10", "23304.50", "23261.20"] }
  });

  const [activeSubTab, setActiveSubTab] = useState<"scalping" | "square9" | "angles">("scalping");

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

  // Generate a mock 5x5 Square of 9 layout based on user price
  const generateSquareOf9 = () => {
    const basePrice = parseFloat(price) || 23500;
    const sq = Math.sqrt(basePrice);
    
    // A standard 5x5 matrix spiral structure index
    // Spiral pattern from center (idx 13 in 0-indexed flat list of 25)
    // 21 22 23 24 25
    // 20  7  8  9 10
    // 19  6  1  2 11
    // 18  5  4  3 12
    // 17 16 15 14 13
    
    const spiralIndices = [
      21, 22, 23, 24, 25,
      20,  7,  8,  9, 10,
      19,  6,  1,  2, 11,
      18,  5,  4,  3, 12,
      17, 16, 15, 14, 13
    ];

    return spiralIndices.map((spiralNum) => {
      // Base degree step is 45 degrees per step in the spiral
      const deg = (spiralNum - 1) * 45;
      const calculatedVal = Math.pow(sq + (deg / 360), 2);
      
      // Determine if cardinal (0, 90, 180, 270) or ordinal (45, 135, 225, 315) relative to cycles
      const isCenter = spiralNum === 1;
      const isCardinal = [3, 5, 7, 9, 15, 17, 19, 21, 23, 25].includes(spiralNum);
      const isOrdinal = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24].includes(spiralNum);

      return {
        num: spiralNum,
        val: calculatedVal.toFixed(1),
        deg: deg % 360,
        isCenter,
        isCardinal,
        isOrdinal
      };
    });
  };

  const square9Grid = generateSquareOf9();

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
              {/* Left Side: Square of 9 Spiral Grid */}
              <div className="lg:col-span-8 terminal-card p-6 flex flex-col items-center justify-center">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em] mb-4">GANN SQUARE OF NINE MATRIX SPIRAL</span>
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

                    return (
                      <div 
                        key={idx} 
                        className={`border rounded p-1.5 flex flex-col justify-between transition-all duration-200 cursor-default group relative ${cellBg}`}
                      >
                        <span className="text-[8px] font-mono text-gray-500 tracking-tighter absolute top-1 left-1">
                          #{cell.num}
                        </span>
                        <span className="text-[8px] font-mono text-gray-500 tracking-tighter absolute top-1 right-1">
                          {cell.deg}°
                        </span>
                        <div className={`text-center font-mono font-black text-xs mt-3.5 tracking-tight ${textClass}`}>
                          {cell.val}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap gap-4 items-center justify-center text-[10px] font-mono">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-terminal-accent/25 border border-terminal-accent/40 rounded" />
                    <span className="text-gray-400">CENTER (LTP)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-terminal-green/15 border border-terminal-green/30 rounded" />
                    <span className="text-gray-400">CARDINAL LEVELS (90° MULTIPLES)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-yellow-400/5 border border-yellow-400/10 rounded" />
                    <span className="text-gray-400">ORDINAL LEVELS (45° TRANSITS)</span>
                  </div>
                </div>
              </div>

              {/* Right Side: Legend & How to Use */}
              <div className="lg:col-span-4 space-y-4">
                <div className="terminal-card p-4 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">How to read Square of 9</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    W.D. Gann's Square of Nine is a mathematical tool that relates prices to geometric degrees. 
                  </p>
                  <ul className="space-y-2 text-[11px] font-mono text-gray-400">
                    <li className="flex items-start">
                      <ArrowRight className="w-3.5 h-3.5 text-terminal-accent mr-1.5 flex-shrink-0 mt-0.5" />
                      <span><strong>Cardinal Cross (Green):</strong> Reversal targets at 90°, 180°, 270°, and 360° represent major trend resistance and support ceilings.</span>
                    </li>
                    <li className="flex items-start">
                      <ArrowRight className="w-3.5 h-3.5 text-yellow-500 mr-1.5 flex-shrink-0 mt-0.5" />
                      <span><strong>Ordinal Cross (Yellow):</strong> Harmonic angles at 45°, 135°, 225°, and 315° represent sub-trends or acceleration points.</span>
                    </li>
                    <li className="flex items-start">
                      <ArrowRight className="w-3.5 h-3.5 text-terminal-accent mr-1.5 flex-shrink-0 mt-0.5" />
                      <span>If price crosses a level with high momentum, it quickly moves to the next spiral level.</span>
                    </li>
                  </ul>
                </div>

                <div className="terminal-card p-4 bg-terminal-accent/5 border-terminal-accent/20">
                  <div className="flex items-start space-x-3">
                    <Info className="w-4 h-4 text-terminal-accent flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-mono text-white uppercase tracking-wider font-bold">Trading Application</h4>
                      <p className="text-[11px] text-gray-400 leading-normal">
                        Look for price consolidation exactly near the cardinal levels. If a candlestick closes above a cardinal level, enter a long trade towards the next level.
                      </p>
                    </div>
                  </div>
                </div>
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
        </AnimatePresence>
      </div>
    </div>
  );
}
