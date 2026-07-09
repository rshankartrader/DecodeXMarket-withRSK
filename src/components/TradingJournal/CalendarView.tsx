import React, { useState } from 'react';
import { Trade } from './types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface CalendarViewProps {
  trades: Trade[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({ trades }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to get days in month
  const getDaysInMonth = (y: number, m: number) => {
    return new Date(y, m + 1, 0).getDate();
  };

  // Helper to get first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (y: number, m: number) => {
    return new Date(y, m, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Generate calendar days
  const calendarCells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  // Previous month padding cells
  const prevMonthDays = getDaysInMonth(year, month - 1);
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const mStr = (month === 0 ? 12 : month).toString().padStart(2, '0');
    const yStr = (month === 0 ? year - 1 : year).toString();
    calendarCells.push({
      dateStr: `${yStr}-${mStr}-${day.toString().padStart(2, '0')}`,
      dayNum: day,
      isCurrentMonth: false
    });
  }

  // Current month cells
  for (let day = 1; day <= daysInMonth; day++) {
    const mStr = (month + 1).toString().padStart(2, '0');
    calendarCells.push({
      dateStr: `${year}-${mStr}-${day.toString().padStart(2, '0')}`,
      dayNum: day,
      isCurrentMonth: true
    });
  }

  // Next month padding cells to complete a 6-row grid (42 cells)
  const totalCells = 42;
  const nextMonthPadding = totalCells - calendarCells.length;
  for (let day = 1; day <= nextMonthPadding; day++) {
    const mStr = (month === 11 ? 1 : month + 2).toString().padStart(2, '0');
    const yStr = (month === 11 ? year + 1 : year).toString();
    calendarCells.push({
      dateStr: `${yStr}-${mStr}-${day.toString().padStart(2, '0')}`,
      dayNum: day,
      isCurrentMonth: false
    });
  }

  // Map trades for fast lookup on calendar
  // Group trades by date
  const tradesByDate: { [dateStr: string]: { trades: Trade[]; pnl: number } } = {};
  trades.filter(t => t.status === 'CLOSED').forEach(t => {
    // Normalise date string format to YYYY-MM-DD
    const dateStr = t.tradeDate; // Expects 'YYYY-MM-DD'
    if (!tradesByDate[dateStr]) {
      tradesByDate[dateStr] = { trades: [], pnl: 0 };
    }
    tradesByDate[dateStr].trades.push(t);
    tradesByDate[dateStr].pnl += t.pnl;
  });

  // Calculate monthly stats for current view
  let monthlyWinsCount = 0;
  let monthlyLossesCount = 0;
  let monthlyTotalPnl = 0;

  trades.filter(t => t.status === 'CLOSED').forEach(t => {
    const tDate = new Date(t.tradeDate);
    if (tDate.getFullYear() === year && tDate.getMonth() === month) {
      monthlyTotalPnl += t.pnl;
      if (t.pnl > 0) monthlyWinsCount++;
      else if (t.pnl < 0) monthlyLossesCount++;
    }
  });

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const formatCellCurrency = (val: number) => {
    if (val === 0) return '₹0';
    const sign = val < 0 ? '-' : '+';
    return `${sign}₹${Math.abs(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  return (
    <div id="journal-calendar" className="p-4 md:p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Calendar Header with Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-black/25 border border-terminal-border/40 p-5 rounded-lg">
        <div className="flex items-center space-x-4">
          <button 
            onClick={handlePrevMonth}
            className="p-2 border border-terminal-border rounded hover:border-terminal-accent text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center space-x-2.5">
            <Calendar className="w-5 h-5 text-terminal-accent" />
            <h2 className="text-lg font-black text-white uppercase tracking-wider font-mono">
              {monthNames[month]} {year}
            </h2>
          </div>

          <button 
            onClick={handleNextMonth}
            className="p-2 border border-terminal-border rounded hover:border-terminal-accent text-gray-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Monthly Performance Indicators */}
        <div className="flex items-center gap-6 font-mono text-xs">
          <div className="flex flex-col">
            <span className="text-[9px] text-gray-500 uppercase">MONTHLY NET P&L</span>
            <span className={`text-sm font-black ${monthlyTotalPnl >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
              {monthlyTotalPnl >= 0 ? '+' : ''}₹{monthlyTotalPnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="h-8 w-[1px] bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[9px] text-gray-500 uppercase">Consistency</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-terminal-green font-bold">{monthlyWinsCount} W</span>
              <span className="text-gray-600">•</span>
              <span className="text-terminal-red font-bold">{monthlyLossesCount} L</span>
            </div>
          </div>
        </div>
      </div>

      {/* The Grid */}
      <div className="terminal-card border border-terminal-border p-4 md:p-6 bg-black/10">
        {/* Days of Week Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2 text-center text-gray-500 font-mono text-[10px] font-bold uppercase tracking-wider">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Calendar Cells Grid */}
        <div className="grid grid-cols-7 gap-2 md:gap-3">
          {calendarCells.map((cell, idx) => {
            const dateData = tradesByDate[cell.dateStr];
            const hasTrades = dateData && dateData.trades.length > 0;
            const pnl = hasTrades ? dateData.pnl : 0;
            const isPositive = pnl > 0;
            const isNegative = pnl < 0;

            let bgClass = 'bg-black/25 hover:bg-white/[0.02] border-terminal-border/20';
            let textClass = cell.isCurrentMonth ? 'text-white' : 'text-gray-600';
            
            if (cell.isCurrentMonth && hasTrades) {
              if (isPositive) {
                bgClass = 'bg-terminal-green/10 border-terminal-green/50 text-terminal-green hover:bg-terminal-green/15';
              } else if (isNegative) {
                bgClass = 'bg-terminal-red/10 border-terminal-red/50 text-terminal-red hover:bg-terminal-red/15';
              } else {
                bgClass = 'bg-white/5 border-white/20 text-white hover:bg-white/10';
              }
            }

            return (
              <div
                key={idx}
                className={`min-h-[70px] md:min-h-[90px] border p-2 flex flex-col justify-between transition-all rounded duration-200 group relative ${bgClass}`}
              >
                {/* Date indicator */}
                <span className={`text-[10px] font-mono font-bold ${textClass}`}>
                  {cell.dayNum}
                </span>

                {/* Daily P&L and Trade Count details */}
                {cell.isCurrentMonth && hasTrades && (
                  <div className="flex flex-col items-end text-right">
                    <span className={`text-[10px] md:text-xs font-black font-mono tracking-tighter ${
                      isPositive ? 'text-terminal-green' : isNegative ? 'text-terminal-red' : 'text-white'
                    }`}>
                      {formatCellCurrency(pnl)}
                    </span>
                    <span className="text-[8px] font-mono text-gray-500 uppercase tracking-tighter mt-0.5">
                      {dateData.trades.length} {dateData.trades.length === 1 ? 'Trade' : 'Trades'}
                    </span>
                  </div>
                )}

                {/* Popup Tooltip for trade specifics on hover */}
                {cell.isCurrentMonth && hasTrades && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-30 w-48 bg-terminal-card border border-terminal-border p-2.5 rounded shadow-xl text-left pointer-events-none">
                    <span className="text-[9px] font-mono text-gray-500 uppercase block mb-1">Trades on {cell.dateStr}:</span>
                    <div className="space-y-1 text-[10px] font-mono max-h-24 overflow-y-auto">
                      {dateData.trades.map((t, i) => (
                        <div key={i} className="flex justify-between items-center border-b border-white/5 pb-1">
                          <span className="text-white font-bold uppercase truncate max-w-[80px]">{t.instrument}</span>
                          <span className={t.pnl >= 0 ? 'text-terminal-green' : 'text-terminal-red'}>
                            {t.pnl >= 0 ? '+' : ''}₹{t.pnl.toFixed(0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
