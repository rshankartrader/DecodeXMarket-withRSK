import React from 'react';
import { Trade } from './types';
import { 
  BarChart, 
  Smile, 
  AlertOctagon, 
  CalendarDays, 
  ArrowUpRight, 
  ArrowDownRight,
  Gauge
} from 'lucide-react';

interface AnalyticsProps {
  trades: Trade[];
}

export const Analytics: React.FC<AnalyticsProps> = ({ trades }) => {
  // Sort trades chronologically
  const closedTrades = trades.filter(t => t.status === 'CLOSED');

  // Day of week analysis
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayStats: { [key: number]: { pnl: number, tradesCount: number } } = {
    1: { pnl: 0, tradesCount: 0 }, // Monday
    2: { pnl: 0, tradesCount: 0 }, // Tuesday
    3: { pnl: 0, tradesCount: 0 }, // Wednesday
    4: { pnl: 0, tradesCount: 0 }, // Thursday
    5: { pnl: 0, tradesCount: 0 }, // Friday
    6: { pnl: 0, tradesCount: 0 }, // Saturday
    0: { pnl: 0, tradesCount: 0 }, // Sunday
  };

  closedTrades.forEach(t => {
    const day = new Date(t.tradeDate).getDay();
    if (dayStats[day] !== undefined) {
      dayStats[day].pnl += t.pnl;
      dayStats[day].tradesCount++;
    }
  });

  const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Monday to Sunday order
  const dayAnalysis = dayOrder.map(dayNum => ({
    name: daysOfWeek[dayNum],
    ...dayStats[dayNum]
  }));

  // Setup breakdown
  const setupStats: { [key: string]: { trades: number, wins: number, pnl: number, avgPnl: number } } = {};
  closedTrades.forEach(t => {
    const setup = t.setup || 'No Setup';
    if (!setupStats[setup]) {
      setupStats[setup] = { trades: 0, wins: 0, pnl: 0, avgPnl: 0 };
    }
    setupStats[setup].trades++;
    setupStats[setup].pnl += t.pnl;
    if (t.pnl > 0) {
      setupStats[setup].wins++;
    }
  });

  Object.keys(setupStats).forEach(setup => {
    const s = setupStats[setup];
    s.avgPnl = s.trades > 0 ? s.pnl / s.trades : 0;
  });

  const setupAnalysis = Object.entries(setupStats).map(([name, stats]) => ({
    name,
    ...stats,
    winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0
  })).sort((a, b) => b.pnl - a.pnl);

  // Emotional impact breakdown
  const emotionStats: { [key: string]: { trades: number, wins: number, pnl: number } } = {};
  closedTrades.forEach(t => {
    const emotions = t.emotions || [];
    emotions.forEach(emotion => {
      if (!emotionStats[emotion]) {
        emotionStats[emotion] = { trades: 0, wins: 0, pnl: 0 };
      }
      emotionStats[emotion].trades++;
      emotionStats[emotion].pnl += t.pnl;
      if (t.pnl > 0) {
        emotionStats[emotion].wins++;
      }
    });
  });

  const emotionAnalysis = Object.entries(emotionStats).map(([name, stats]) => ({
    name,
    ...stats,
    winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0
  })).sort((a, b) => b.pnl - a.pnl);

  // Mistakes analysis
  const mistakeStats: { [key: string]: { count: number, totalLoss: number } } = {};
  closedTrades.forEach(t => {
    const mistakes = t.mistakes || [];
    mistakes.forEach(mistake => {
      if (!mistakeStats[mistake]) {
        mistakeStats[mistake] = { count: 0, totalLoss: 0 };
      }
      mistakeStats[mistake].count++;
      if (t.pnl < 0) {
        mistakeStats[mistake].totalLoss += Math.abs(t.pnl);
      }
    });
  });

  const mistakeAnalysis = Object.entries(mistakeStats).map(([name, stats]) => ({
    name,
    ...stats
  })).sort((a, b) => b.totalLoss - a.totalLoss);

  // Math helper for rendering nice normalized bars
  const getMaxVal = (arr: number[]) => {
    const max = Math.max(...arr, 1);
    return max;
  };

  const getAbsMaxVal = (arr: number[]) => {
    const absVals = arr.map(v => Math.abs(v));
    return Math.max(...absVals, 1);
  };

  const formatCurrency = (val: number) => {
    const sign = val < 0 ? '-' : val > 0 ? '+' : '';
    return `${sign}₹${Math.abs(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  return (
    <div id="journal-analytics" className="p-4 md:p-6 max-w-7xl mx-auto w-full space-y-8">
      {/* Overview Info Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-terminal-border/30 pb-4">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center">
            <BarChart className="w-5 h-5 text-terminal-accent mr-2" />
            Trading Intelligence Diagnostics
          </h2>
          <p className="text-[10px] font-mono text-gray-500 uppercase mt-0.5">Correlation mapping between strategy, emotions, mistakes, and P&L</p>
        </div>
      </div>

      {closedTrades.length === 0 ? (
        <div className="terminal-card border border-terminal-border p-12 text-center bg-black/15">
          <span className="text-xs font-mono text-gray-500 uppercase tracking-widest block">
            Close and log trades to generate deep statistical diagnostics.
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Day of Week Performance */}
          <div className="terminal-card border border-terminal-border p-6 bg-black/10 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center border-b border-terminal-border pb-3 mb-5">
                <CalendarDays className="w-4 h-4 text-terminal-accent mr-2" />
                Profitability by Day of Week
              </h3>
              <div className="space-y-4">
                {dayAnalysis.map((day) => {
                  const maxAbs = getAbsMaxVal(dayAnalysis.map(d => d.pnl));
                  const percent = maxAbs > 0 ? (Math.abs(day.pnl) / maxAbs) * 50 : 0; // max width is 50% from center
                  const isPositive = day.pnl >= 0;
                  
                  return (
                    <div key={day.name} className="flex items-center text-xs font-mono">
                      <div className="w-20 text-gray-400 font-bold uppercase text-[10px]">{day.name}</div>
                      
                      {/* Zero Centered progress bar */}
                      <div className="flex-1 h-6 bg-white/[0.02] border border-white/5 rounded relative flex items-center overflow-hidden">
                        {/* Center marker line */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/20 z-10" />

                        {isPositive ? (
                          <div 
                            className="absolute bg-terminal-green/25 border-l border-terminal-green h-full left-1/2"
                            style={{ width: `${percent}%` }}
                          />
                        ) : (
                          <div 
                            className="absolute bg-terminal-red/25 border-r border-terminal-red h-full right-1/2"
                            style={{ width: `${percent}%` }}
                          />
                        )}

                        <span className={`absolute left-4 text-[9px] font-bold uppercase z-20 ${day.tradesCount === 0 ? 'text-gray-600' : 'text-gray-300'}`}>
                          {day.tradesCount} Trades
                        </span>
                      </div>

                      <div className={`w-24 text-right font-black pl-3 ${isPositive ? 'text-terminal-green' : 'text-terminal-red'}`}>
                        {formatCurrency(day.pnl)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="text-[9px] font-mono text-gray-500 uppercase mt-4">
              * Centered bars represent relative profit (right) or relative loss (left).
            </p>
          </div>

          {/* Setup performance */}
          <div className="terminal-card border border-terminal-border p-6 bg-black/10">
            <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center border-b border-terminal-border pb-3 mb-5">
              <Gauge className="w-4 h-4 text-terminal-accent mr-2" />
              Technical Setup Efficiency
            </h3>
            <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
              {setupAnalysis.map((setup) => (
                <div key={setup.name} className="space-y-1 bg-black/20 p-3 rounded border border-white/5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-white font-bold uppercase tracking-wider">{setup.name}</span>
                    <span className={setup.pnl >= 0 ? 'text-terminal-green font-bold' : 'text-terminal-red font-bold'}>
                      {setup.pnl >= 0 ? '+' : ''}₹{setup.pnl.toFixed(0)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1 text-[9px] font-mono text-gray-500 uppercase">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Win Rate</span>
                        <span className="text-white font-bold">{setup.winRate.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-white/5 h-1.5 rounded overflow-hidden">
                        <div className="bg-terminal-green h-full" style={{ width: `${setup.winRate}%` }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Avg Return</span>
                        <span className={`font-bold ${setup.avgPnl >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                          ₹{setup.avgPnl.toFixed(0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-end">
                        <span className="text-gray-500 text-[8px]">{setup.trades} Executed Trades</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Emotional Correlation */}
          <div className="terminal-card border border-terminal-border p-6 bg-black/10">
            <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center border-b border-terminal-border pb-3 mb-5">
              <Smile className="w-4 h-4 text-terminal-accent mr-2" />
              Mental State & Emotion Impact
            </h3>
            {emotionAnalysis.length === 0 ? (
              <div className="text-center p-8 text-[10px] font-mono text-gray-500 uppercase">
                No emotional stats recorded yet.
              </div>
            ) : (
              <div className="space-y-4">
                {emotionAnalysis.map((emotion) => {
                  const maxAbs = getAbsMaxVal(emotionAnalysis.map(e => e.pnl));
                  const percent = maxAbs > 0 ? (Math.abs(emotion.pnl) / maxAbs) * 100 : 0;
                  const isPositive = emotion.pnl >= 0;

                  return (
                    <div key={emotion.name} className="space-y-1 font-mono text-xs">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-white font-bold uppercase">{emotion.name}</span>
                        <span className={isPositive ? 'text-terminal-green font-black' : 'text-terminal-red font-black'}>
                          {formatCurrency(emotion.pnl)}
                        </span>
                      </div>
                      <div className="w-full bg-white/5 h-2 rounded overflow-hidden relative">
                        <div 
                          className={`h-full ${isPositive ? 'bg-terminal-green' : 'bg-terminal-red'}`} 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[8px] text-gray-500 uppercase">
                        <span>Applied in {emotion.trades} trades</span>
                        <span>Win Rate: {emotion.winRate.toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Capital Leakage analysis */}
          <div className="terminal-card border border-terminal-border p-6 bg-black/10">
            <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center border-b border-terminal-border pb-3 mb-5">
              <AlertOctagon className="w-4 h-4 text-terminal-red mr-2" />
              Capital Leakage Breakdown (Mistakes)
            </h3>
            {mistakeAnalysis.length === 0 ? (
              <div className="text-center p-8 text-[10px] font-mono text-terminal-green uppercase">
                Zero Mistakes Registered! Perfect execution discipline.
              </div>
            ) : (
              <div className="space-y-4">
                {mistakeAnalysis.map((mistake) => {
                  const maxLoss = getMaxVal(mistakeAnalysis.map(m => m.totalLoss));
                  const percent = maxLoss > 0 ? (mistake.totalLoss / maxLoss) * 100 : 0;

                  return (
                    <div key={mistake.name} className="space-y-1 font-mono text-xs">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-gray-300 font-bold uppercase">{mistake.name}</span>
                        <span className="text-terminal-red font-black">
                          -₹{mistake.totalLoss.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="w-full bg-white/5 h-2 rounded overflow-hidden">
                        <div 
                          className="h-full bg-terminal-red" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[8px] text-gray-500 uppercase">
                        <span>Occurred {mistake.count} times in trades</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
