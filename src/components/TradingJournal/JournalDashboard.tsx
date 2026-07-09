import React, { useState } from 'react';
import { Trade } from './types';
import { 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  Activity, 
  ShieldAlert, 
  DollarSign, 
  Zap, 
  AlertTriangle,
  Award,
  Flame,
  Calendar,
  Layers,
  Edit2,
  RotateCcw,
  Check,
  X,
  User,
  Coins
} from 'lucide-react';

interface JournalDashboardProps {
  trades: Trade[];
  accountBalance: number;
  initialBalance: number;
  onUpdateBalance: (balance: number) => Promise<void>;
  onResetJournal: (startingBalance: number) => Promise<void>;
}

export const JournalDashboard: React.FC<JournalDashboardProps> = ({ 
  trades,
  accountBalance,
  initialBalance,
  onUpdateBalance,
  onResetJournal
}) => {
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [tempBalance, setTempBalance] = useState('');
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [resetBalanceInput, setResetBalanceInput] = useState('500000');
  const [savingBalance, setSavingBalance] = useState(false);
  const [resettingJournal, setResettingJournal] = useState(false);

  // Sort trades chronologically for calculations and charts
  const sortedTrades = [...trades].sort((a, b) => {
    return new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime();
  });

  // Calculate Metrics
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl < 0);
  const breakevenTrades = trades.filter(t => t.pnl === 0);

  const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;

  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);

  const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;

  const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;
  const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : 0;

  // Calculate Current Streak
  let currentStreak = 0;
  let streakType: 'win' | 'loss' | 'none' = 'none';

  if (sortedTrades.length > 0) {
    const lastTrade = sortedTrades[sortedTrades.length - 1];
    streakType = lastTrade.pnl > 0 ? 'win' : lastTrade.pnl < 0 ? 'loss' : 'none';
    
    if (streakType !== 'none') {
      for (let i = sortedTrades.length - 1; i >= 0; i--) {
        const t = sortedTrades[i];
        if (streakType === 'win' && t.pnl > 0) {
          currentStreak++;
        } else if (streakType === 'loss' && t.pnl < 0) {
          currentStreak++;
        } else if (t.pnl !== 0) {
          break;
        }
      }
    }
  }

  // Calculate setup performance
  const setupPerformance: { [key: string]: { trades: number, pnl: number, wins: number } } = {};
  trades.forEach(t => {
    const setup = t.setup || 'Unknown';
    if (!setupPerformance[setup]) {
      setupPerformance[setup] = { trades: 0, pnl: 0, wins: 0 };
    }
    setupPerformance[setup].trades++;
    setupPerformance[setup].pnl += t.pnl;
    if (t.pnl > 0) setupPerformance[setup].wins++;
  });

  const sortedSetups = Object.entries(setupPerformance)
    .map(([name, stats]) => ({
      name,
      ...stats,
      winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0
    }))
    .sort((a, b) => b.pnl - a.pnl);

  // Calculate mistake impact
  const mistakeImpact: { [key: string]: { count: number, totalLoss: number } } = {};
  trades.forEach(t => {
    if (t.mistakes && Array.isArray(t.mistakes)) {
      t.mistakes.forEach(mistake => {
        if (!mistakeImpact[mistake]) {
          mistakeImpact[mistake] = { count: 0, totalLoss: 0 };
        }
        mistakeImpact[mistake].count++;
        if (t.pnl < 0) {
          mistakeImpact[mistake].totalLoss += Math.abs(t.pnl);
        }
      });
    }
  });

  const sortedMistakes = Object.entries(mistakeImpact)
    .map(([name, stats]) => ({
      name,
      ...stats
    }))
    .sort((a, b) => b.totalLoss - a.totalLoss);

  // Calculate Instrument Performance
  const instrumentPerformance: { [key: string]: { trades: number, pnl: number, wins: number } } = {};
  trades.forEach(t => {
    const inst = t.instrument || 'Unknown';
    if (!instrumentPerformance[inst]) {
      instrumentPerformance[inst] = { trades: 0, pnl: 0, wins: 0 };
    }
    instrumentPerformance[inst].trades++;
    instrumentPerformance[inst].pnl += t.pnl;
    if (t.pnl > 0) instrumentPerformance[inst].wins++;
  });

  const sortedInstruments = Object.entries(instrumentPerformance)
    .map(([name, stats]) => ({
      name,
      ...stats,
      winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0
    }))
    .sort((a, b) => b.pnl - a.pnl);

  // Build Cumulative P&L Curve points for custom SVG line chart
  let cumulativePnl = 0;
  const pnlCurvePoints = sortedTrades.map((t, idx) => {
    cumulativePnl += t.pnl;
    return {
      index: idx,
      date: t.tradeDate,
      pnl: t.pnl,
      cumulative: cumulativePnl
    };
  });

  // SVG Chart Dimensions & Calculations
  const chartWidth = 800;
  const chartHeight = 250;
  const paddingX = 40;
  const paddingY = 25;

  let svgPath = '';
  let svgAreaPath = '';
  let gridLines: number[] = [];

  if (pnlCurvePoints.length > 1) {
    const cumulatives = pnlCurvePoints.map(p => p.cumulative);
    const minP = Math.min(0, ...cumulatives);
    const maxP = Math.max(0, ...cumulatives);
    const range = maxP - minP || 100;

    const getX = (idx: number) => {
      return paddingX + (idx / (pnlCurvePoints.length - 1)) * (chartWidth - 2 * paddingX);
    };

    const getY = (val: number) => {
      // Scale properly inside container
      const ratio = (val - minP) / range;
      return chartHeight - paddingY - ratio * (chartHeight - 2 * paddingY);
    };

    // Construct path
    svgPath = `M ${getX(0)} ${getY(pnlCurvePoints[0].cumulative)}`;
    for (let i = 1; i < pnlCurvePoints.length; i++) {
      svgPath += ` L ${getX(i)} ${getY(pnlCurvePoints[i].cumulative)}`;
    }

    // Area path
    const zeroY = getY(0);
    svgAreaPath = `${svgPath} L ${getX(pnlCurvePoints.length - 1)} ${zeroY} L ${getX(0)} ${zeroY} Z`;

    // Grid lines for reference
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      gridLines.push(minP + (i / steps) * range);
    }
  }

  const formatCurrency = (val: number) => {
    const sign = val < 0 ? '-' : '+';
    return `${sign}₹${Math.abs(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const formatChartDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIdx = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        if (monthIdx >= 0 && monthIdx < 12) {
          return `${day} ${months[monthIdx]}`;
        }
      }
    } catch (e) {}
    return dateStr;
  };

  return (
    <div id="journal-dashboard" className="space-y-8 p-4 md:p-6 max-w-7xl mx-auto w-full">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Net P&L */}
        <div className="terminal-card p-4 flex flex-col justify-between border border-terminal-border relative overflow-hidden bg-black/20">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest">NET PROFIT/LOSS</span>
            <DollarSign className="w-4 h-4 text-terminal-accent" />
          </div>
          <div>
            <div className={`text-2xl font-black ${totalPnl >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
              {formatCurrency(totalPnl)}
            </div>
            <div className="text-[9px] font-mono text-gray-400 mt-1 uppercase">
              Cumulative returns of {totalTrades} trades
            </div>
          </div>
        </div>

        {/* Win Rate */}
        <div className="terminal-card p-4 flex flex-col justify-between border border-terminal-border relative overflow-hidden bg-black/20">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest">WIN RATE</span>
            <Percent className="w-4 h-4 text-terminal-accent" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {winRate.toFixed(1)}%
            </div>
            <div className="flex items-center gap-2 text-[9px] font-mono text-gray-400 mt-1 uppercase">
              <span className="text-terminal-green">{winningTrades.length} W</span>
              <span>•</span>
              <span className="text-terminal-red">{losingTrades.length} L</span>
              {breakevenTrades.length > 0 && (
                <>
                  <span>•</span>
                  <span>{breakevenTrades.length} BE</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Profit Factor */}
        <div className="terminal-card p-4 flex flex-col justify-between border border-terminal-border relative overflow-hidden bg-black/20">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest">PROFIT FACTOR</span>
            <Award className="w-4 h-4 text-terminal-accent" />
          </div>
          <div>
            <div className={`text-2xl font-black ${profitFactor >= 1.5 ? 'text-terminal-green' : profitFactor >= 1.0 ? 'text-white' : 'text-terminal-red'}`}>
              {profitFactor.toFixed(2)}
            </div>
            <div className="text-[9px] font-mono text-gray-400 mt-1 uppercase">
              Ratio of Gross Win/Loss
            </div>
          </div>
        </div>

        {/* Current Streak */}
        <div className="terminal-card p-4 flex flex-col justify-between border border-terminal-border relative overflow-hidden bg-black/20">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest">ACTIVE STREAK</span>
            <Flame className="w-4 h-4 text-terminal-accent" />
          </div>
          <div>
            <div className="text-2xl font-black text-white flex items-center gap-2">
              {currentStreak} Trades
              {streakType === 'win' && <span className="text-xs text-terminal-green uppercase font-mono tracking-wider">(Winning)</span>}
              {streakType === 'loss' && <span className="text-xs text-terminal-red uppercase font-mono tracking-wider">(Losing)</span>}
            </div>
            <div className="text-[9px] font-mono text-gray-400 mt-1 uppercase">
              Consecutive trades streak
            </div>
          </div>
        </div>
      </div>

      {/* Account Control Center */}
      <div className="terminal-card p-6 border border-terminal-border bg-terminal-accent/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center">
              <Coins className="w-4 h-4 text-terminal-accent mr-2" />
              Journal Account Control Center
            </h3>
            <p className="text-[10px] font-mono text-gray-400 uppercase">
              Configure starting capital, view dynamic live balance, or reset journal database to restart fresh.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Live Balance Card */}
            <div className="bg-black/40 border border-terminal-border/60 rounded px-4 py-2.5 min-w-[200px] flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[8px] font-mono text-gray-500 uppercase block tracking-wider">Account Balance</span>
                {isEditingBalance ? (
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs font-mono text-gray-400">₹</span>
                    <input
                      type="number"
                      value={tempBalance}
                      onChange={(e) => setTempBalance(e.target.value)}
                      className="bg-black/80 border border-terminal-accent/60 rounded px-1.5 py-0.5 text-xs font-mono text-white focus:outline-none w-28"
                      placeholder={accountBalance.toString()}
                      autoFocus
                    />
                    <button
                      onClick={async () => {
                        const val = parseFloat(tempBalance);
                        if (!isNaN(val) && val >= 0) {
                          setSavingBalance(true);
                          await onUpdateBalance(val);
                          setSavingBalance(false);
                          setIsEditingBalance(false);
                        }
                      }}
                      disabled={savingBalance}
                      className="p-1 bg-terminal-green/20 text-terminal-green rounded hover:bg-terminal-green/30 transition-colors"
                      title="Save"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIsEditingBalance(false)}
                      className="p-1 bg-white/5 text-gray-400 rounded hover:bg-white/10 transition-colors"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-black text-white font-mono">
                      ₹{accountBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                    <button
                      onClick={() => {
                        setTempBalance(accountBalance.toString());
                        setIsEditingBalance(true);
                      }}
                      className="p-1 hover:bg-white/5 rounded text-gray-500 hover:text-terminal-accent transition-colors"
                      title="Edit Account Balance"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Initial Balance */}
            <div className="bg-black/20 border border-terminal-border/30 rounded px-4 py-2.5 min-w-[150px]">
              <span className="text-[8px] font-mono text-gray-500 uppercase block tracking-wider">Starting Capital</span>
              <span className="text-sm font-bold text-gray-300 font-mono block mt-1">
                ₹{initialBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Reset Journal Action */}
            <div className="relative">
              {isConfirmingReset ? (
                <div className="flex flex-col sm:flex-row items-center gap-2 bg-black/80 border border-terminal-red/50 rounded p-3 absolute right-0 bottom-full mb-2 z-50 min-w-[280px] shadow-2xl">
                  <div className="space-y-1 text-left w-full sm:w-auto">
                    <span className="text-[9px] font-mono font-bold text-terminal-red uppercase block">Confirm Complete Reset?</span>
                    <p className="text-[8px] font-mono text-gray-400 leading-tight uppercase">
                      This will delete ALL journal trades and rules.
                    </p>
                    <div className="flex items-center space-x-2 mt-1.5">
                      <span className="text-[9px] font-mono text-gray-500 uppercase">Starting ₹</span>
                      <input
                        type="number"
                        value={resetBalanceInput}
                        onChange={(e) => setResetBalanceInput(e.target.value)}
                        className="bg-black/90 border border-terminal-border rounded px-1.5 py-0.5 text-[10px] font-mono text-white focus:border-terminal-accent outline-none w-20"
                      />
                    </div>
                  </div>
                  <div className="flex gap-1.5 mt-2 sm:mt-0 w-full sm:w-auto justify-end">
                    <button
                      onClick={async () => {
                        const val = parseFloat(resetBalanceInput);
                        if (!isNaN(val) && val >= 0) {
                          setResettingJournal(true);
                          await onResetJournal(val);
                          setResettingJournal(false);
                          setIsConfirmingReset(false);
                        }
                      }}
                      disabled={resettingJournal}
                      className="px-2 py-1 bg-terminal-red text-white text-[9px] font-mono font-bold rounded uppercase hover:bg-terminal-red/80 transition-colors disabled:opacity-50"
                    >
                      {resettingJournal ? 'RESETTING...' : 'YES, RESET'}
                    </button>
                    <button
                      onClick={() => setIsConfirmingReset(false)}
                      className="px-2 py-1 bg-white/5 text-gray-400 text-[9px] font-mono rounded uppercase hover:bg-white/10 transition-colors"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              ) : null}

              <button
                onClick={() => {
                  setResetBalanceInput(accountBalance.toString());
                  setIsConfirmingReset(true);
                }}
                className="flex items-center space-x-1.5 bg-terminal-red/10 hover:bg-terminal-red/20 border border-terminal-red/30 text-terminal-red px-3 py-2 rounded text-[10px] font-mono font-bold transition-all uppercase"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Trading Journal</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cumulative P&L Curve SVG Chart */}
      <div className="terminal-card p-6 border border-terminal-border bg-black/15">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center">
              <Activity className="w-4 h-4 text-terminal-accent mr-2" />
              Cumulative Performance Curve
            </h3>
            <p className="text-[10px] font-mono text-gray-500 uppercase mt-0.5">Equity growth tracking over historical trades</p>
          </div>
          {totalTrades > 0 && (
            <div className="flex gap-4 text-xs font-mono">
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-500">AVG WIN</span>
                <span className="text-terminal-green font-bold">₹{avgWin.toFixed(0)}</span>
              </div>
              <div className="flex flex-col border-l border-white/10 pl-4">
                <span className="text-[9px] text-gray-500">AVG LOSS</span>
                <span className="text-terminal-red font-bold">₹{avgLoss.toFixed(0)}</span>
              </div>
              <div className="flex flex-col border-l border-white/10 pl-4">
                <span className="text-[9px] text-gray-500">EST. R:R</span>
                <span className="text-terminal-accent font-bold">1:{riskRewardRatio.toFixed(1)}</span>
              </div>
            </div>
          )}
        </div>

        {totalTrades < 2 ? (
          <div className="h-[250px] flex flex-col items-center justify-center border border-dashed border-terminal-border bg-black/40 rounded p-6">
            <span className="text-[11px] font-mono text-gray-500 uppercase tracking-widest text-center">
              Log at least 2 trades to display cumulative performance curves.
            </span>
          </div>
        ) : (
          <div className="w-full overflow-x-auto scrollbar-none">
            <div className="min-w-[800px] h-[250px] relative">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f27d26" stopOpacity="0.2"/>
                    <stop offset="100%" stopColor="#f27d26" stopOpacity="0"/>
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines and markers */}
                {gridLines.map((gl, i) => {
                  const minP = Math.min(0, ...pnlCurvePoints.map(p => p.cumulative));
                  const maxP = Math.max(0, ...pnlCurvePoints.map(p => p.cumulative));
                  const range = maxP - minP || 100;
                  const ratio = (gl - minP) / range;
                  const y = chartHeight - paddingY - ratio * (chartHeight - 2 * paddingY);

                  return (
                    <g key={i}>
                      <line 
                        x1={paddingX} 
                        y1={y} 
                        x2={chartWidth - paddingX} 
                        y2={y} 
                        stroke={gl === 0 ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.05)"} 
                        strokeDasharray={gl === 0 ? "0" : "4 4"}
                      />
                      <text 
                        x={paddingX - 8} 
                        y={y + 3} 
                        fill="#6b7280" 
                        fontSize="9" 
                        fontFamily="monospace" 
                        textAnchor="end"
                      >
                        {gl >= 0 ? '+' : ''}{gl.toFixed(0)}
                      </text>
                    </g>
                  );
                })}

                {/* Vertical trade indices */}
                {pnlCurvePoints.map((pt, i) => {
                  if (i === 0 || i === pnlCurvePoints.length - 1 || (pnlCurvePoints.length > 5 && i % Math.floor(pnlCurvePoints.length / 5) === 0)) {
                    const x = paddingX + (i / (pnlCurvePoints.length - 1)) * (chartWidth - 2 * paddingX);
                    return (
                      <g key={i}>
                        <text 
                          x={x} 
                          y={chartHeight - 5} 
                          fill="#6b7280" 
                          fontSize="9" 
                          fontFamily="monospace" 
                          textAnchor="middle"
                        >
                          {formatChartDate(pt.date)}
                        </text>
                        <line 
                          x1={x} 
                          y1={chartHeight - paddingY} 
                          x2={x} 
                          y2={chartHeight - paddingY - 4} 
                          stroke="rgba(255, 255, 255, 0.15)"
                        />
                      </g>
                    );
                  }
                  return null;
                })}

                {/* Filled Area below curve */}
                <path d={svgAreaPath} fill="url(#pnlGrad)" />

                {/* The main curve line */}
                <path 
                  d={svgPath} 
                  fill="none" 
                  stroke="#f27d26" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />

                {/* Data Points on hover effect */}
                {pnlCurvePoints.map((pt, i) => {
                  const minP = Math.min(0, ...pnlCurvePoints.map(p => p.cumulative));
                  const maxP = Math.max(0, ...pnlCurvePoints.map(p => p.cumulative));
                  const range = maxP - minP || 100;
                  const ratio = (pt.cumulative - minP) / range;
                  const x = paddingX + (i / (pnlCurvePoints.length - 1)) * (chartWidth - 2 * paddingX);
                  const y = chartHeight - paddingY - ratio * (chartHeight - 2 * paddingY);

                  return (
                    <circle 
                      key={i}
                      cx={x} 
                      cy={y} 
                      r="3.5" 
                      className="fill-terminal-bg stroke-terminal-accent stroke-2 hover:r-5 hover:stroke-white transition-all cursor-pointer"
                    />
                  );
                })}
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Grid of breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Setups performance */}
        <div className="terminal-card border border-terminal-border p-5 bg-black/10 flex flex-col">
          <h4 className="text-xs font-black uppercase tracking-widest text-white mb-4 flex items-center border-b border-terminal-border pb-2">
            <Zap className="w-4 h-4 text-terminal-accent mr-2" />
            Top Setups performance
          </h4>
          {sortedSetups.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6 text-[10px] font-mono text-gray-500 uppercase">
              No setup data recorded.
            </div>
          ) : (
            <div className="space-y-4 flex-1 overflow-y-auto">
              {sortedSetups.slice(0, 5).map((setup, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-white font-bold uppercase truncate max-w-[150px]">{setup.name}</span>
                    <span className={setup.pnl >= 0 ? 'text-terminal-green font-bold' : 'text-terminal-red font-bold'}>
                      {setup.pnl >= 0 ? '+' : ''}₹{setup.pnl.toFixed(0)}
                    </span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden flex">
                    <div 
                      className="bg-terminal-green h-full"
                      style={{ width: `${setup.winRate}%` }}
                    />
                    <div 
                      className="bg-terminal-red/40 h-full"
                      style={{ width: `${100 - setup.winRate}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[8px] font-mono text-gray-500 uppercase">
                    <span>{setup.trades} Trades</span>
                    <span>Win Rate: {setup.winRate.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Leakage Detector: Biggest Mistakes */}
        <div className="terminal-card border border-terminal-border p-5 bg-black/10 flex flex-col">
          <h4 className="text-xs font-black uppercase tracking-widest text-white mb-4 flex items-center border-b border-terminal-border pb-2">
            <AlertTriangle className="w-4 h-4 text-terminal-red mr-2" />
            Profit Leakage Detector
          </h4>
          {sortedMistakes.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6 text-[10px] font-mono text-terminal-green uppercase">
              Excellent! No mistakes registered yet.
            </div>
          ) : (
            <div className="space-y-4 flex-1 overflow-y-auto">
              {sortedMistakes.slice(0, 5).map((mistake, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-gray-200 font-bold uppercase truncate max-w-[150px]">{mistake.name}</span>
                    <span className="text-terminal-red font-bold">
                      -₹{mistake.totalLoss.toFixed(0)}
                    </span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    {/* Normalized bar based on highest loss */}
                    <div 
                      className="bg-terminal-red h-full"
                      style={{ 
                        width: `${(mistake.totalLoss / (sortedMistakes[0]?.totalLoss || 1)) * 100}%` 
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[8px] font-mono text-gray-500 uppercase">
                    <span>Affecting {mistake.count} trades</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instrument Breakdown */}
        <div className="terminal-card border border-terminal-border p-5 bg-black/10 flex flex-col">
          <h4 className="text-xs font-black uppercase tracking-widest text-white mb-4 flex items-center border-b border-terminal-border pb-2">
            <Layers className="w-4 h-4 text-terminal-accent mr-2" />
            Performance by Asset
          </h4>
          {sortedInstruments.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6 text-[10px] font-mono text-gray-500 uppercase">
              No instrument stats yet.
            </div>
          ) : (
            <div className="space-y-4 flex-1 overflow-y-auto">
              {sortedInstruments.slice(0, 5).map((inst, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-white font-bold uppercase truncate max-w-[150px]">{inst.name}</span>
                    <span className={inst.pnl >= 0 ? 'text-terminal-green font-bold' : 'text-terminal-red font-bold'}>
                      {inst.pnl >= 0 ? '+' : ''}₹{inst.pnl.toFixed(0)}
                    </span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden flex">
                    <div 
                      className="bg-terminal-accent h-full"
                      style={{ width: `${inst.winRate}%` }}
                    />
                    <div 
                      className="bg-white/5 h-full"
                      style={{ width: `${100 - inst.winRate}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[8px] font-mono text-gray-500 uppercase">
                    <span>{inst.trades} Trades</span>
                    <span>Win Rate: {inst.winRate.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
