import React, { useState } from 'react';
import { Trade } from './types';
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  XCircle, 
  ChevronDown, 
  Calendar, 
  Clock, 
  BookOpen, 
  ArrowUpRight, 
  ArrowDownRight,
  Calculator
} from 'lucide-react';

interface TradeLogProps {
  trades: Trade[];
  onAddTrade: (trade: Omit<Trade, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateTrade: (id: string, trade: Partial<Trade>) => Promise<void>;
  onDeleteTrade: (id: string) => Promise<void>;
}

export const TradeLog: React.FC<TradeLogProps> = ({
  trades,
  onAddTrade,
  onUpdateTrade,
  onDeleteTrade
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  
  // Search and Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [instrumentFilter, setInstrumentFilter] = useState('All');
  const [directionFilter, setDirectionFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Form State
  const [instrument, setInstrument] = useState('Nifty');
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [pnl, setPnl] = useState('');
  const [status, setStatus] = useState<'OPEN' | 'CLOSED'>('CLOSED');
  const [setup, setSetup] = useState('');
  const [notes, setNotes] = useState('');
  const [rrr, setRrr] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [tradeDate, setTradeDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [tradeTime, setTradeTime] = useState(() => {
    const d = new Date();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${hours}:${minutes} ${ampm}`;
  });

  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [selectedMistakes, setSelectedMistakes] = useState<string[]>([]);

  const emotionOptions = ['Greedy', 'Fearful', 'Disciplined', 'Anxious', 'Impatient', 'Patient', 'FOMO', 'Confident'];
  const mistakeOptions = ['FOMO Entry', 'Chasing Price', 'Early Exit', 'No Stop Loss', 'Overleveraged', 'Held Too Long', 'Averaging Losers', 'None'];

  // Handle instrument change and pre-populate multipliers if desired
  const handleInstrumentChange = (inst: string) => {
    setInstrument(inst);
  };

  const getInstrumentMultiplier = (inst: string) => {
    switch (inst) {
      case 'Nifty': return 65;
      case 'BankNifty': return 30;
      case 'Sensex': return 20;
      default: return 1;
    }
  };

  // Helper to auto-calculate P&L
  const autoCalculatePnl = () => {
    const entry = parseFloat(entryPrice);
    const exit = parseFloat(exitPrice || '0');
    const qty = parseFloat(quantity);
    if (!isNaN(entry) && !isNaN(qty)) {
      const mult = getInstrumentMultiplier(instrument);
      let calculatedPnl = 0;
      if (status === 'CLOSED') {
        const diff = direction === 'LONG' ? (exit - entry) : (entry - exit);
        calculatedPnl = diff * qty * mult;
      } else {
        calculatedPnl = 0; // Open trade doesn't have realized P&L
      }
      setPnl(calculatedPnl.toFixed(2));
    }
  };

  const handleOpenAddModal = () => {
    setEditingTrade(null);
    setInstrument('Nifty');
    setDirection('LONG');
    setEntryPrice('');
    setExitPrice('');
    setQuantity('');
    setPnl('');
    setRrr('');
    setStatus('CLOSED');
    setSetup('');
    setNotes('');
    setTradeDate(new Date().toISOString().split('T')[0]);
    setSelectedEmotions([]);
    setSelectedMistakes([]);
    setRating(0);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (trade: Trade) => {
    setEditingTrade(trade);
    setInstrument(trade.instrument);
    setDirection(trade.direction);
    setEntryPrice(trade.entryPrice !== undefined ? trade.entryPrice.toString() : '');
    setExitPrice(trade.exitPrice !== undefined ? trade.exitPrice.toString() : '');
    setQuantity(trade.quantity !== undefined ? trade.quantity.toString() : '');
    setPnl(trade.pnl !== undefined ? trade.pnl.toString() : '');
    setRrr(trade.rrr !== undefined ? trade.rrr.toString() : '');
    setStatus(trade.status);
    setSetup(trade.setup || '');
    setNotes(trade.notes || '');
    setTradeDate(trade.tradeDate);
    setTradeTime(trade.tradeTime || '');
    setSelectedEmotions(trade.emotions || []);
    setSelectedMistakes(trade.mistakes || []);
    setRating(trade.rating || 0);
    setIsModalOpen(true);
  };

  const toggleEmotion = (emotion: string) => {
    if (selectedEmotions.includes(emotion)) {
      setSelectedEmotions(selectedEmotions.filter(e => e !== emotion));
    } else {
      setSelectedEmotions([...selectedEmotions, emotion]);
    }
  };

  const toggleMistake = (mistake: string) => {
    if (selectedMistakes.includes(mistake)) {
      setSelectedMistakes(selectedMistakes.filter(m => m !== mistake));
    } else {
      setSelectedMistakes([...selectedMistakes, mistake]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalPnl = parseFloat(pnl) || 0;
    const rrrVal = parseFloat(rrr);
    
    const tradePayload: any = {
      instrument,
      direction,
      pnl: status === 'OPEN' ? 0 : finalPnl,
      status,
      setup: setup || 'No Setup',
      emotions: selectedEmotions,
      mistakes: selectedMistakes,
      notes,
      tradeDate,
      tradeTime,
    };

    if (entryPrice !== '') {
      const parsedEntry = parseFloat(entryPrice);
      if (!isNaN(parsedEntry)) {
        tradePayload.entryPrice = parsedEntry;
      }
    }
    if (exitPrice !== '' && status !== 'OPEN') {
      const parsedExit = parseFloat(exitPrice);
      if (!isNaN(parsedExit)) {
        tradePayload.exitPrice = parsedExit;
      }
    }
    if (quantity !== '') {
      const parsedQty = parseFloat(quantity);
      if (!isNaN(parsedQty)) {
        tradePayload.quantity = parsedQty;
      }
    }
    if (!isNaN(rrrVal)) {
      tradePayload.rrr = rrrVal;
    }
    if (rating) {
      tradePayload.rating = rating;
    }

    try {
      if (editingTrade) {
        await onUpdateTrade(editingTrade.id, tradePayload);
      } else {
        await onAddTrade(tradePayload);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Filter & Search Logic
  const filteredTrades = trades.filter(t => {
    const matchesSearch = 
      t.instrument.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.setup?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesInstrument = instrumentFilter === 'All' || t.instrument === instrumentFilter;
    const matchesDirection = directionFilter === 'All' || t.direction === directionFilter;
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;

    return matchesSearch && matchesInstrument && matchesDirection && matchesStatus;
  });

  // Unique instruments in user's trades for filter dropdown
  const uniqueInstruments = Array.from(new Set(trades.map(t => t.instrument))) as string[];

  const formatCurrency = (val: number) => {
    const sign = val < 0 ? '-' : val > 0 ? '+' : '';
    return `${sign}₹${Math.abs(val).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const closedTrades = trades.filter(t => t.status === 'CLOSED');
  const winTrades = closedTrades.filter(t => t.pnl > 0);
  const totalClosedPnl = closedTrades.reduce((sum, t) => sum + t.pnl, 0);
  const winRate = closedTrades.length > 0 ? (winTrades.length / closedTrades.length) * 100 : 0;
  const rrrTrades = trades.filter(t => t.rrr !== undefined);
  const avgRrr = rrrTrades.length > 0 ? (rrrTrades.reduce((sum, t) => sum + (t.rrr || 0), 0) / rrrTrades.length).toFixed(1) : '0.0';

  return (
    <div id="trade-log" className="p-4 md:p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Dynamic Diagnostic Graphics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Executed Logs */}
        <div className="terminal-card border border-terminal-border/40 p-4 bg-black/20 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Total Logs</span>
            <BookOpen className="w-4 h-4 text-terminal-accent opacity-60" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white font-mono">{trades.length}</span>
            <span className="text-[9px] font-mono text-gray-500 uppercase">{trades.filter(t => t.status === 'OPEN').length} OPEN TRADES</span>
          </div>
        </div>

        {/* Card 2: Win Rate Graphic */}
        <div className="terminal-card border border-terminal-border/40 p-4 bg-black/20 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Win Rate</span>
            <span className={`text-[10px] font-mono font-bold ${winRate >= 50 ? 'text-terminal-green' : 'text-terminal-red'}`}>{winRate.toFixed(1)}%</span>
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-terminal-green transition-all" 
                style={{ width: `${winRate}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[8px] font-mono text-gray-500 uppercase">
              <span>{winTrades.length} WINS</span>
              <span>{closedTrades.length - winTrades.length} LOSSES</span>
            </div>
          </div>
        </div>

        {/* Card 3: Net Realized Outcome */}
        <div className="terminal-card border border-terminal-border/40 p-4 bg-black/20 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Net Outcome</span>
            {totalClosedPnl >= 0 ? (
              <ArrowUpRight className="w-4 h-4 text-terminal-green" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-terminal-red" />
            )}
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-xl font-black font-mono ${totalClosedPnl >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
              {formatCurrency(totalClosedPnl)}
            </span>
            <span className="text-[8px] font-mono text-gray-500 uppercase">REALIZED P&L</span>
          </div>
        </div>

        {/* Card 4: Average Risk-Reward Ratio */}
        <div className="terminal-card border border-terminal-border/40 p-4 bg-black/20 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Average RRR</span>
            <span className="text-[10px] font-mono text-terminal-accent font-bold">★ TARGET</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white font-mono">{avgRrr} : 1</span>
            <span className="text-[8px] font-mono text-gray-500 uppercase">RISK EXPOSURE</span>
          </div>
        </div>
      </div>

      {/* Search and filter controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black/25 border border-terminal-border/40 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 flex-1">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search trades, setups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-terminal-bg border border-terminal-border rounded pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-gray-600 focus:border-terminal-accent outline-none"
            />
          </div>

          {/* Instrument Filter */}
          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={instrumentFilter}
              onChange={(e) => setInstrumentFilter(e.target.value)}
              className="w-full bg-terminal-bg border border-terminal-border rounded pl-9 pr-3 py-2 text-xs font-mono text-white focus:border-terminal-accent outline-none appearance-none cursor-pointer"
            >
              <option value="All">All Instruments</option>
              <option value="Nifty">Nifty</option>
              <option value="BankNifty">BankNifty</option>
              <option value="Sensex">Sensex</option>
              <option value="Bitcoin">Bitcoin</option>
              <option value="Ethereum">Ethereum</option>
              <option value="Gold">Gold</option>
              {uniqueInstruments.filter(inst => !['Nifty', 'BankNifty', 'Sensex', 'Bitcoin', 'Ethereum', 'Gold'].includes(inst)).map(inst => (
                <option key={inst} value={inst}>{inst}</option>
              ))}
            </select>
          </div>

          {/* Direction Filter */}
          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value)}
            className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-xs font-mono text-white focus:border-terminal-accent outline-none cursor-pointer"
          >
            <option value="All">All Directions</option>
            <option value="LONG">LONG</option>
            <option value="SHORT">SHORT</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-xs font-mono text-white focus:border-terminal-accent outline-none cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="CLOSED">CLOSED</option>
            <option value="OPEN">OPEN</option>
          </select>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="bg-terminal-accent text-black font-black uppercase tracking-widest text-[10px] px-5 py-2.5 rounded hover:bg-terminal-accent/90 transition-all flex items-center shrink-0 shadow-[0_0_15px_rgba(242,125,38,0.25)]"
        >
          <Plus className="w-4 h-4 mr-1.5 stroke-[3]" />
          Log Trade
        </button>
      </div>

      {/* Trades Table */}
      <div className="terminal-card border border-terminal-border bg-black/15 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="bg-white/5 border-b border-terminal-border text-gray-500 uppercase font-black text-[9px] tracking-widest">
                <th className="p-4">Date/Time</th>
                <th className="p-4">Asset</th>
                <th className="p-4">Type</th>
                <th className="p-4">Entry / Exit</th>
                <th className="p-4">Qty</th>
                <th className="p-4">RRR</th>
                <th className="p-4">Setup</th>
                <th className="p-4">Net P&L</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terminal-border/40">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-gray-500 uppercase tracking-wider">
                    No matching trade records found.
                  </td>
                </tr>
              ) : (
                [...filteredTrades].sort((a,b) => new Date(b.tradeDate).getTime() - new Date(a.tradeDate).getTime()).map((trade) => (
                  <tr key={trade.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-white font-bold">{trade.tradeDate}</span>
                        <span className="text-[10px] text-gray-500">{trade.tradeTime || '09:15 AM'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-white font-bold uppercase">{trade.instrument}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${
                        trade.direction === 'LONG' 
                          ? 'bg-terminal-green/10 text-terminal-green border border-terminal-green/20' 
                          : 'bg-terminal-red/10 text-terminal-red border border-terminal-red/20'
                      }`}>
                        {trade.direction}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-gray-300">Entry: {trade.entryPrice !== undefined ? trade.entryPrice.toFixed(2) : '--'}</span>
                        <span className="text-gray-500">
                          Exit: {trade.status === 'CLOSED' && trade.exitPrice !== undefined ? trade.exitPrice.toFixed(2) : '--'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-400">
                      {trade.quantity !== undefined ? trade.quantity : '--'}
                      {trade.quantity !== undefined && (
                        <span className="text-[10px] text-gray-600 ml-1">
                          ({getInstrumentMultiplier(trade.instrument) > 1 ? 'Lots' : 'Units'})
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-gray-300 font-bold">
                      {trade.rrr !== undefined ? `${trade.rrr}:1` : '--'}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col space-y-1">
                        <span className="text-terminal-accent bg-terminal-accent/5 px-2 py-0.5 rounded border border-terminal-accent/10 w-fit text-[10px]">
                          {trade.setup || 'No Setup'}
                        </span>
                        {trade.rating ? (
                          <span className="text-[9px] text-terminal-accent font-mono tracking-wider">
                            {'★'.repeat(trade.rating)}{'☆'.repeat(5 - trade.rating)}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className={`p-4 font-black ${
                      trade.status === 'OPEN' ? 'text-gray-500' : trade.pnl > 0 ? 'text-terminal-green' : trade.pnl < 0 ? 'text-terminal-red' : 'text-white'
                    }`}>
                      {trade.status === 'OPEN' ? 'OPEN' : formatCurrency(trade.pnl)}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                        trade.status === 'CLOSED' 
                          ? 'bg-white/5 text-gray-400 border border-white/10' 
                          : 'bg-terminal-accent/10 text-terminal-accent border border-terminal-accent/20 animate-pulse'
                      }`}>
                        {trade.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(trade)}
                          className="p-1.5 bg-white/5 hover:bg-terminal-accent/10 hover:text-terminal-accent rounded text-gray-400 transition-colors"
                          title="Edit Trade"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this trade log?')) {
                              onDeleteTrade(trade.id);
                            }
                          }}
                          className="p-1.5 bg-white/5 hover:bg-terminal-red/10 hover:text-terminal-red rounded text-gray-400 transition-colors"
                          title="Delete Trade"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trade Log Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            onClick={() => setIsModalOpen(false)} 
            className="absolute inset-0 bg-black/80 backdrop-blur-md" 
          />
          <div className="relative w-full max-w-2xl bg-terminal-card border border-terminal-border rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-terminal-border bg-white/5 flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center">
                <BookOpen className="w-4 h-4 text-terminal-accent mr-2" />
                {editingTrade ? 'Edit Trade Log' : 'Log New Executed Trade'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-gray-500 hover:text-white transition-colors uppercase font-mono text-[10px]"
              >
                Close [X]
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Instrument */}
                <div className="flex flex-col space-y-1.5">
                  <label className="font-mono text-gray-500 uppercase text-[10px] tracking-wider">Instrument</label>
                  <select
                    value={instrument}
                    onChange={(e) => handleInstrumentChange(e.target.value)}
                    className="bg-terminal-bg border border-terminal-border rounded px-3 py-2.5 font-mono text-white focus:border-terminal-accent outline-none cursor-pointer"
                  >
                    <option value="Nifty">Nifty (1 Lot = 65 units)</option>
                    <option value="BankNifty">BankNifty (1 Lot = 30 units)</option>
                    <option value="Sensex">Sensex (1 Lot = 20 units)</option>
                    <option value="Bitcoin">Bitcoin</option>
                    <option value="Ethereum">Ethereum</option>
                    <option value="Gold">Gold</option>
                    <option value="Custom">Custom Asset</option>
                  </select>
                </div>

                {/* If Custom selected */}
                {instrument === 'Custom' && (
                  <div className="flex flex-col space-y-1.5">
                    <label className="font-mono text-gray-500 uppercase text-[10px] tracking-wider">Asset Name</label>
                    <input
                      type="text"
                      placeholder="e.g. CRUDEOIL, RELIANCE"
                      onChange={(e) => setInstrument(e.target.value)}
                      className="bg-terminal-bg border border-terminal-border rounded px-3 py-2.5 font-mono text-white focus:border-terminal-accent outline-none"
                      required
                    />
                  </div>
                )}

                {/* Direction */}
                <div className="flex flex-col space-y-1.5">
                  <label className="font-mono text-gray-500 uppercase text-[10px] tracking-wider">Direction</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDirection('LONG')}
                      className={`py-2 px-3 rounded font-bold uppercase tracking-wider text-center border font-mono transition-all ${
                        direction === 'LONG'
                          ? 'bg-terminal-green/10 border-terminal-green text-terminal-green'
                          : 'bg-terminal-bg border-terminal-border text-gray-400'
                      }`}
                    >
                      LONG [BUY]
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection('SHORT')}
                      className={`py-2 px-3 rounded font-bold uppercase tracking-wider text-center border font-mono transition-all ${
                        direction === 'SHORT'
                          ? 'bg-terminal-red/10 border-terminal-red text-terminal-red'
                          : 'bg-terminal-bg border-terminal-border text-gray-400'
                      }`}
                    >
                      SHORT [SELL]
                    </button>
                  </div>
                </div>

                {/* Entry Price */}
                <div className="flex flex-col space-y-1.5">
                  <label className="font-mono text-gray-500 uppercase text-[10px] tracking-wider">Entry Price (Optional)</label>
                  <input
                    type="number"
                    step="any"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    className="bg-terminal-bg border border-terminal-border rounded px-3 py-2.5 font-mono text-white focus:border-terminal-accent outline-none"
                    placeholder="Execution entry price"
                  />
                </div>

                {/* Exit Price */}
                <div className="flex flex-col space-y-1.5">
                  <label className="font-mono text-gray-500 uppercase text-[10px] tracking-wider">Exit Price (Optional)</label>
                  <input
                    type="number"
                    step="any"
                    value={exitPrice}
                    onChange={(e) => setExitPrice(e.target.value)}
                    className="bg-terminal-bg border border-terminal-border rounded px-3 py-2.5 font-mono text-white focus:border-terminal-accent outline-none"
                    placeholder={status === 'OPEN' ? 'Leave empty for open trades' : 'Execution exit price'}
                    disabled={status === 'OPEN'}
                  />
                </div>

                {/* Quantity */}
                <div className="flex flex-col space-y-1.5">
                  <label className="font-mono text-gray-500 uppercase text-[10px] tracking-wider">
                    Quantity {getInstrumentMultiplier(instrument) > 1 ? '(in Lots)' : '(in Units)'} (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="bg-terminal-bg border border-terminal-border rounded px-3 py-2.5 font-mono text-white focus:border-terminal-accent outline-none"
                    placeholder="Lots or Units count"
                  />
                </div>

                {/* Status */}
                <div className="flex flex-col space-y-1.5">
                  <label className="font-mono text-gray-500 uppercase text-[10px] tracking-wider">Trade Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="bg-terminal-bg border border-terminal-border rounded px-3 py-2.5 font-mono text-white focus:border-terminal-accent outline-none cursor-pointer"
                  >
                    <option value="CLOSED">CLOSED (Realized)</option>
                    <option value="OPEN">OPEN (Running/Active)</option>
                  </select>
                </div>

                {/* Risk Reward Ratio (RRR) */}
                <div className="flex flex-col space-y-1.5">
                  <label className="font-mono text-gray-500 uppercase text-[10px] tracking-wider">Risk Reward (RRR)</label>
                  <input
                    type="number"
                    step="any"
                    value={rrr}
                    onChange={(e) => setRrr(e.target.value)}
                    className="bg-terminal-bg border border-terminal-border rounded px-3 py-2.5 font-mono text-white focus:border-terminal-accent outline-none"
                    placeholder="e.g. 1.5, 2.0 (Target vs Risk)"
                  />
                </div>

                {/* Rate your trade */}
                <div className="flex flex-col space-y-1.5">
                  <label className="font-mono text-gray-500 uppercase text-[10px] tracking-wider">Rate Trade (Optional)</label>
                  <div className="flex items-center h-full space-x-1.5 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(rating === star ? 0 : star)}
                        className={`text-base px-1.5 py-1 rounded border border-terminal-border/40 transition-all ${
                          star <= rating 
                            ? 'text-terminal-accent bg-terminal-accent/10 border-terminal-accent/50' 
                            : 'text-gray-600 bg-terminal-bg/30 hover:text-terminal-accent/60'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Net P&L */}
                {status === 'CLOSED' && (
                  <div className="flex flex-col space-y-1.5 md:col-span-2">
                    <label className="font-mono text-gray-500 uppercase text-[10px] tracking-wider flex items-center justify-between">
                      <span>Net Profit/Loss (₹)</span>
                      <button
                        type="button"
                        onClick={autoCalculatePnl}
                        className="text-[9px] font-mono text-terminal-accent hover:underline flex items-center uppercase"
                      >
                        <Calculator className="w-3 h-3 mr-1" />
                        Auto-Calculate P&L
                      </button>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={pnl}
                      onChange={(e) => setPnl(e.target.value)}
                      className="bg-terminal-bg border border-terminal-border rounded px-3 py-2.5 font-mono text-white focus:border-terminal-accent outline-none"
                      placeholder="Profit/Loss in Rupees"
                      required
                    />
                  </div>
                )}

                {/* Setup */}
                <div className="flex flex-col space-y-1.5">
                  <label className="font-mono text-gray-500 uppercase text-[10px] tracking-wider">Setup / Strategy</label>
                  <input
                    type="text"
                    value={setup}
                    onChange={(e) => setSetup(e.target.value)}
                    className="bg-terminal-bg border border-terminal-border rounded px-3 py-2.5 font-mono text-white focus:border-terminal-accent outline-none"
                    placeholder="e.g. Astro Timing, S&R Bounce"
                  />
                </div>

                {/* Date */}
                <div className="flex flex-col space-y-1.5">
                  <label className="font-mono text-gray-500 uppercase text-[10px] tracking-wider">Execution Date</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      value={tradeDate}
                      onChange={(e) => setTradeDate(e.target.value)}
                      onClick={(e) => { try { (e.currentTarget as HTMLInputElement).showPicker(); } catch (_) {} }}
                      style={{ colorScheme: 'dark' }}
                      className="w-full bg-terminal-bg border border-terminal-border rounded pl-9 pr-3 py-2.5 font-mono text-white focus:border-terminal-accent outline-none cursor-pointer"
                      required
                    />
                  </div>
                </div>

                {/* Time */}
                <div className="flex flex-col space-y-1.5">
                  <label className="font-mono text-gray-500 uppercase text-[10px] tracking-wider">Execution Time</label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={tradeTime}
                      onChange={(e) => setTradeTime(e.target.value)}
                      placeholder="e.g. 10:45 AM, 14:30"
                      className="w-full bg-terminal-bg border border-terminal-border rounded pl-9 pr-3 py-2.5 font-mono text-white focus:border-terminal-accent outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Emotions Checkboxes */}
              <div className="space-y-2">
                <span className="font-mono text-gray-500 uppercase text-[10px] tracking-wider">Emotions during Trade</span>
                <div className="flex flex-wrap gap-2">
                  {emotionOptions.map(emotion => {
                    const isSelected = selectedEmotions.includes(emotion);
                    return (
                      <button
                        key={emotion}
                        type="button"
                        onClick={() => toggleEmotion(emotion)}
                        className={`px-3 py-1.5 rounded font-mono text-[10px] border transition-all ${
                          isSelected
                            ? 'bg-terminal-accent/10 border-terminal-accent text-terminal-accent font-bold'
                            : 'bg-terminal-bg border-terminal-border text-gray-400 hover:border-white/20'
                        }`}
                      >
                        {emotion}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mistakes Checkboxes */}
              <div className="space-y-2">
                <span className="font-mono text-gray-500 uppercase text-[10px] tracking-wider text-terminal-red">Mistakes made (Loss Analysis)</span>
                <div className="flex flex-wrap gap-2">
                  {mistakeOptions.map(mistake => {
                    const isSelected = selectedMistakes.includes(mistake);
                    return (
                      <button
                        key={mistake}
                        type="button"
                        onClick={() => toggleMistake(mistake)}
                        className={`px-3 py-1.5 rounded font-mono text-[10px] border transition-all ${
                          isSelected
                            ? 'bg-terminal-red/15 border-terminal-red text-terminal-red font-bold'
                            : 'bg-terminal-bg border-terminal-border text-gray-400 hover:border-white/20'
                        }`}
                      >
                        {mistake}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col space-y-1.5">
                <label className="font-mono text-gray-500 uppercase text-[10px] tracking-wider">Trade Journal Notes / Reflections</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-terminal-bg border border-terminal-border rounded px-3 py-2.5 font-mono text-white focus:border-terminal-accent outline-none h-24 resize-none"
                  placeholder="Analyze why you took this trade, your mental state, observations of market context, what went well, and what went wrong..."
                />
              </div>

              {/* Save Button */}
              <button
                type="submit"
                className="w-full py-4 rounded bg-terminal-accent hover:bg-terminal-accent/90 text-black font-black uppercase tracking-widest transition-all text-xs"
              >
                {editingTrade ? 'Update Trade Log' : 'Save Executed Trade'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
