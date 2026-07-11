import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  AlertTriangle, 
  ShieldCheck, 
  Shield, 
  Calculator, 
  Coins, 
  Info,
  Settings,
  TrendingUp,
  Percent,
  TrendingDown,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface RiskManagementProps {
  initialCapital?: number;
  onCapitalChange?: (capital: number) => void;
}

export const RiskManagement: React.FC<RiskManagementProps> = ({ 
  initialCapital = 500000,
  onCapitalChange
}) => {
  // Tabs: 'position_size' or 'pip_calculator'
  const [activeTab, setActiveTab] = useState<'position_size' | 'pip_calculator'>('position_size');

  // USD to INR Live Exchange Rate
  const [usdToInr, setUsdToInr] = useState(83.45);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Fetch live exchange rate
  const fetchRates = async () => {
    setIsLoadingRates(true);
    try {
      const erResponse = await fetch('https://open.er-api.com/v6/latest/USD');
      if (erResponse.ok) {
        const erData = await erResponse.json();
        if (erData?.rates?.INR) {
          const rate = Number(erData.rates.INR.toFixed(2));
          setUsdToInr(rate);
          setLastUpdated(new Date().toLocaleTimeString());
        }
      }
    } catch (e) {
      console.error("Failed to fetch exchange rate:", e);
    } finally {
      setIsLoadingRates(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  // ==========================================
  // STATE & LOGIC FOR POSITION SIZE CALCULATOR
  // ==========================================
  const [selectedAsset, setSelectedAsset] = useState<'nifty' | 'banknifty' | 'sensex' | 'custom'>('nifty');
  const [fundsAvailable, setFundsAvailable] = useState(initialCapital);
  const [riskPercent, setRiskPercent] = useState(1);
  const [entryPrice, setEntryPrice] = useState(24300);
  const [stoploss, setStoploss] = useState(24200);
  const [lotSize, setLotSize] = useState(75);

  // Sync with prop capital
  useEffect(() => {
    setFundsAvailable(initialCapital);
  }, [initialCapital]);

  // Handle capital slider or input change
  const handleFundsChange = (val: number) => {
    setFundsAvailable(val);
    if (onCapitalChange) {
      onCapitalChange(val);
    }
  };

  // Adjust defaults when selected asset changes
  useEffect(() => {
    if (selectedAsset === 'nifty') {
      setEntryPrice(24300);
      setStoploss(24220);
      setLotSize(75);
    } else if (selectedAsset === 'banknifty') {
      setEntryPrice(52500);
      setStoploss(52350);
      setLotSize(15);
    } else if (selectedAsset === 'sensex') {
      setEntryPrice(79500);
      setStoploss(79250);
      setLotSize(10);
    } else if (selectedAsset === 'custom') {
      setEntryPrice(100);
      setStoploss(95);
      setLotSize(1);
    }
  }, [selectedAsset]);

  // Position Size Math
  const stopLossPoints = Math.max(0, entryPrice - stoploss);
  const maxRiskAmount = fundsAvailable * (riskPercent / 100);
  
  // Units to trade: Risk capital divided by risk per unit
  const sharesToBuy = stopLossPoints > 0 ? Math.floor(maxRiskAmount / stopLossPoints) : 0;
  
  // Round down to closest complete lot size
  const lotSizeSafe = lotSize > 0 ? lotSize : 1;
  const lotsToBuy = Math.floor(sharesToBuy / lotSizeSafe);
  const sharesToBuyRounded = lotsToBuy * lotSizeSafe;
  
  // Total investment margin required
  const totalInvestmentAmount = sharesToBuyRounded * entryPrice;
  const actualRiskAmount = sharesToBuyRounded * stopLossPoints;

  // ==========================================
  // STATE & LOGIC FOR GOLD PIP CALCULATOR (XAU/USD)
  // ==========================================
  const [goldPips, setGoldPips] = useState(100);
  const [goldContractSize, setGoldContractSize] = useState<number>(100); // 1 Standard Lot = 100 Ounces
  const [goldVolume, setGoldVolume] = useState<number>(1); // e.g. 1.00 lot
  const [depositCurrency, setDepositCurrency] = useState<'USD' | 'INR'>('INR');
  const [calculatedPipValue, setCalculatedPipValue] = useState<number | null>(0);

  const calculateGoldPip = () => {
    // Gold Pip Value Formula:
    // Volume (Lots) * Contract Size (100) * Pip Size (0.01 for XAU/USD) * Pips
    // Usually, 1 pip in Gold = $0.01 price move, so 100 pips = $1.00 move
    // Hence, Pip value = Volume * Contract Size * Pip Size (0.01) * Pips
    const pipSize = 0.01;
    const valueInUSD = goldVolume * goldContractSize * pipSize * goldPips;
    
    if (depositCurrency === 'INR') {
      setCalculatedPipValue(valueInUSD * usdToInr);
    } else {
      setCalculatedPipValue(valueInUSD);
    }
  };

  // Auto calculate when inputs change
  useEffect(() => {
    calculateGoldPip();
  }, [goldPips, goldContractSize, goldVolume, depositCurrency, usdToInr]);

  // Formatting Helpers
  const formatIndianNumber = (num: number) => {
    const x = Math.round(num).toString();
    let lastThree = x.substring(x.length - 3);
    const otherSymbols = x.substring(0, x.length - 3);
    if (otherSymbols !== '') {
      lastThree = ',' + lastThree;
    }
    const res = otherSymbols.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
    return res;
  };

  const formatCurrency = (val: number, currency: 'INR' | 'USD') => {
    if (currency === 'INR') {
      return `₹${formatIndianNumber(val)}`;
    }
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-terminal-border/20 pb-4">
        <div className="flex flex-col space-y-1">
          <h2 className="text-xl font-black tracking-wider text-white uppercase flex items-center">
            <Shield className="w-5 h-5 mr-2 text-terminal-accent animate-pulse" />
            Risk Management Engine
          </h2>
          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
            Index Position Sizing & Commodity Pip Value intelligence
          </p>
        </div>
        
        <button 
          onClick={fetchRates} 
          disabled={isLoadingRates}
          className="flex items-center space-x-2 bg-black/40 hover:bg-black/60 border border-terminal-border hover:border-terminal-accent/30 text-gray-400 hover:text-white px-3 py-1.5 rounded text-[10px] font-mono transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRates ? 'animate-spin' : ''}`} />
          <span>{isLoadingRates ? 'SYNCING...' : `1 USD = ₹${usdToInr} (LIVE)`}</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-2 gap-2 max-w-md">
        <button
          onClick={() => setActiveTab('position_size')}
          className={`flex items-center justify-center space-x-2 py-3 px-4 text-xs font-bold font-mono tracking-wider transition-all border uppercase rounded ${
            activeTab === 'position_size'
              ? 'bg-terminal-accent/10 border-terminal-accent text-white'
              : 'bg-black/20 border-terminal-border/50 text-gray-500 hover:text-gray-300 hover:border-gray-700'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Nifty / BankNifty Size</span>
        </button>
        <button
          onClick={() => setActiveTab('pip_calculator')}
          className={`flex items-center justify-center space-x-2 py-3 px-4 text-xs font-bold font-mono tracking-wider transition-all border uppercase rounded ${
            activeTab === 'pip_calculator'
              ? 'bg-terminal-accent/10 border-terminal-accent text-white'
              : 'bg-black/20 border-terminal-border/50 text-gray-500 hover:text-gray-300 hover:border-gray-700'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Gold Pip Calculator</span>
        </button>
      </div>

      {/* ==========================================
          TAB 1: POSITION SIZE CALCULATOR (INDICES)
          ========================================== */}
      {activeTab === 'position_size' && (
        <div className="space-y-6">
          {/* Asset Selectors */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black/30 border border-terminal-border/40 p-4 rounded">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Index Segment:</span>
              <div className="flex flex-wrap gap-1.5">
                {(['nifty', 'banknifty', 'sensex', 'custom'] as const).map((asset) => (
                  <button
                    key={asset}
                    onClick={() => setSelectedAsset(asset)}
                    className={`px-3 py-1 rounded text-[10px] font-bold font-mono uppercase transition-all border cursor-pointer ${
                      selectedAsset === asset
                        ? 'bg-terminal-accent text-white border-terminal-accent'
                        : 'bg-black/40 text-gray-400 border-terminal-border hover:border-gray-500 hover:text-white'
                    }`}
                  >
                    {asset === 'nifty' && 'Nifty 50'}
                    {asset === 'banknifty' && 'Bank Nifty'}
                    {asset === 'sensex' && 'Sensex'}
                    {asset === 'custom' && 'Custom Seg.'}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-[10px] font-mono text-terminal-accent">
              CURRENT LOT SIZE: <strong className="text-white">{lotSize} Qty</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Inputs Panel */}
            <div className="lg:col-span-7 space-y-6 bg-black/15 border border-terminal-border p-6 rounded">
              <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-terminal-border/20 pb-3 flex items-center">
                <Settings className="w-4 h-4 text-terminal-accent mr-2" />
                Calculator Inputs
              </h3>

              {/* 1. Account Capital */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-mono font-bold text-gray-300 uppercase">Available Capital</label>
                  <div className="flex items-center space-x-1 bg-black/40 border border-terminal-border rounded px-2">
                    <span className="text-xs font-mono text-gray-500">₹</span>
                    <input
                      type="number"
                      value={fundsAvailable}
                      onChange={(e) => handleFundsChange(Math.max(0, Number(e.target.value)))}
                      className="bg-transparent py-1 font-mono text-white text-right focus:outline-none w-32 font-bold text-xs"
                    />
                  </div>
                </div>
                <input
                  type="range"
                  min="10000"
                  max="5000000"
                  step="10000"
                  value={fundsAvailable}
                  onChange={(e) => handleFundsChange(Number(e.target.value))}
                  className="w-full accent-terminal-accent cursor-pointer h-1.5 rounded-full"
                />
                <div className="flex justify-between text-[8px] text-gray-500 font-mono">
                  <span>₹10,000</span>
                  <span>₹50,00,000</span>
                </div>
              </div>

              {/* 2. Risk Percentage */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-mono font-bold text-gray-300 uppercase">Risk Per Trade (%)</label>
                  <div className="flex items-center space-x-1 bg-black/40 border border-terminal-border rounded px-2">
                    <input
                      type="number"
                      min="0.1"
                      max="10"
                      step="0.1"
                      value={riskPercent}
                      onChange={(e) => setRiskPercent(Math.max(0.1, Math.min(10, Number(e.target.value))))}
                      className="bg-transparent py-1 font-mono text-white text-right focus:outline-none w-16 font-bold text-xs"
                    />
                    <span className="text-xs font-mono text-gray-500">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="5"
                  step="0.1"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(Number(e.target.value))}
                  className="w-full accent-terminal-accent cursor-pointer h-1.5 rounded-full"
                />
                <div className="flex justify-between text-[8px] text-gray-500 font-mono">
                  <span>0.2%</span>
                  <span>5.0%</span>
                </div>
              </div>

              {/* 3. Entry Price & Stop Loss */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider block">Entry Price (₹)</label>
                  <input
                    type="number"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(Math.max(0.1, Number(e.target.value)))}
                    className="w-full bg-black/40 border border-terminal-border rounded px-3 py-2 font-mono text-white text-left focus:border-terminal-accent focus:outline-none font-bold text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider block">Stop Loss Price (₹)</label>
                  <input
                    type="number"
                    value={stoploss}
                    onChange={(e) => setStoploss(Math.max(0.1, Number(e.target.value)))}
                    className="w-full bg-black/40 border border-terminal-border rounded px-3 py-2 font-mono text-white text-left focus:border-terminal-accent focus:outline-none font-bold text-xs"
                  />
                </div>
              </div>

              {/* 4. Lot Size Configuration (Custom Asset Only) */}
              {selectedAsset === 'custom' && (
                <div className="space-y-2 pt-2">
                  <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider block">Lot Size multiplier</label>
                  <input
                    type="number"
                    min="1"
                    value={lotSize}
                    onChange={(e) => setLotSize(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-black/40 border border-terminal-border rounded px-3 py-2 font-mono text-white text-left focus:border-terminal-accent focus:outline-none font-bold text-xs"
                  />
                </div>
              )}
            </div>

            {/* Right Output Dashboard */}
            <div className="lg:col-span-5 bg-black/20 border border-terminal-border p-6 rounded flex flex-col justify-between h-full space-y-6">
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-terminal-border/20 pb-3 flex items-center">
                  <Sparkles className="w-4 h-4 text-terminal-accent mr-2 animate-bounce" />
                  Sizing Diagnostics
                </h3>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-2 gap-4 my-6">
                  <div className="bg-black/30 border border-terminal-border/40 p-3 rounded">
                    <span className="text-[8px] font-mono text-gray-500 uppercase block tracking-wider">MAX RISK CAP</span>
                    <span className="text-sm font-black text-terminal-red font-mono block mt-1">
                      {formatCurrency(maxRiskAmount, 'INR')}
                    </span>
                  </div>
                  <div className="bg-black/30 border border-terminal-border/40 p-3 rounded">
                    <span className="text-[8px] font-mono text-gray-500 uppercase block tracking-wider">SL POINT SPAN</span>
                    <span className="text-sm font-black text-white font-mono block mt-1">
                      {stopLossPoints.toFixed(2)} pts
                    </span>
                  </div>
                  <div className="bg-black/30 border border-terminal-border/40 p-3 rounded">
                    <span className="text-[8px] font-mono text-gray-500 uppercase block tracking-wider">RECOMMENDED LOTS</span>
                    <span className="text-sm font-black text-terminal-accent font-mono block mt-1">
                      {lotsToBuy} Lots <span className="text-[9px] text-gray-400">({sharesToBuyRounded} qty)</span>
                    </span>
                  </div>
                  <div className="bg-black/30 border border-terminal-border/40 p-3 rounded">
                    <span className="text-[8px] font-mono text-gray-500 uppercase block tracking-wider">EST. MARGIN VALUE</span>
                    <span className="text-sm font-black text-blue-400 font-mono block mt-1">
                      {formatCurrency(totalInvestmentAmount, 'INR')}
                    </span>
                  </div>
                </div>

                {/* Visual Risk vs Margin Progress Bar */}
                <div className="space-y-1.5 bg-black/30 border border-terminal-border/30 p-4 rounded font-mono text-[9px] text-gray-400 uppercase">
                  <div className="flex justify-between">
                    <span>Capital Utilized</span>
                    <span className="text-white font-bold">{((totalInvestmentAmount / fundsAvailable) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (totalInvestmentAmount / fundsAvailable) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Position Guidance Banner */}
              {lotsToBuy === 0 ? (
                <div className="p-3 bg-terminal-red/10 border border-terminal-red/30 rounded text-[9px] font-mono text-terminal-red leading-relaxed uppercase">
                  Warning: Risk parameter is too tight or capital is too small to afford even a single lot ({lotSize} units) given the stop loss points spacing. Loosen SL or increase risk %!
                </div>
              ) : (
                <div className="p-3 bg-terminal-green/10 border border-terminal-green/30 rounded text-[9px] font-mono text-terminal-green leading-relaxed uppercase">
                  Edge Recommendation: Execute exactly <strong className="text-white">{lotsToBuy} Lots</strong> of {selectedAsset.toUpperCase()}. This satisfies your strict {riskPercent}% capital protective boundary. Actual trade risk is limited to <strong className="text-white">₹{formatIndianNumber(actualRiskAmount)}</strong>.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 2: GOLD PIP CALCULATOR (XAU/USD)
          ========================================== */}
      {activeTab === 'pip_calculator' && (
        <div className="max-w-xl mx-auto space-y-6">
          
          {/* Main Card replicating image styling with extreme precision */}
          <div className="border border-terminal-border rounded overflow-hidden shadow-2xl bg-black/20">
            {/* Beautiful Emerald Gradient Top Panel */}
            <div className="bg-gradient-to-br from-[#0c5c4e] via-[#09473d] to-[#041a16] p-6 md:p-8 text-white space-y-6 border-b border-terminal-border/20">
              <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                  <span className="text-xs font-mono font-bold tracking-widest text-terminal-accent uppercase">commodity matrix</span>
                  <h3 className="text-base font-black tracking-wider uppercase text-white font-sans">Gold Valuation Module</h3>
                </div>
                <ExternalLink className="w-4 h-4 text-terminal-accent opacity-75" />
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-4 font-mono">
                {/* 1. Pips Input */}
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[9px] font-bold tracking-widest uppercase text-gray-400">Pips Value Move</label>
                  <input
                    type="number"
                    value={goldPips}
                    onChange={(e) => setGoldPips(Math.max(0, Number(e.target.value)))}
                    className="bg-black/60 border border-terminal-border rounded px-3 py-2 font-bold text-white focus:border-terminal-accent outline-none w-full text-xs"
                    placeholder="100"
                  />
                </div>

                {/* 2. Instrument Dropdown (Locked to XAU/USD) */}
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[9px] font-bold tracking-widest uppercase text-gray-400">Instrument pair</label>
                  <select
                    disabled
                    className="bg-black/30 border border-terminal-border/50 rounded px-3 py-2 font-bold text-gray-500 cursor-not-allowed w-full text-xs"
                  >
                    <option value="XAU/USD">XAU/USD (Gold)</option>
                  </select>
                </div>

                {/* 3. Trade Lots (Volume) */}
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[9px] font-bold tracking-widest uppercase text-gray-400">Lots (Volume size)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={goldVolume}
                    onChange={(e) => setGoldVolume(Math.max(0.01, Number(e.target.value)))}
                    className="bg-black/60 border border-terminal-border rounded px-3 py-2 font-bold text-white focus:border-terminal-accent outline-none w-full text-xs"
                    placeholder="1.0"
                  />
                </div>

                {/* 4. Deposit Currency */}
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[9px] font-bold tracking-widest uppercase text-gray-400">Deposit Currency</label>
                  <select
                    value={depositCurrency}
                    onChange={(e) => setDepositCurrency(e.target.value as 'USD' | 'INR')}
                    className="bg-black/60 border border-terminal-border rounded px-3 py-2 font-bold text-white focus:border-terminal-accent outline-none w-full cursor-pointer text-xs"
                  >
                    <option value="INR">Indian Rupee (INR)</option>
                    <option value="USD">US Dollar (USD)</option>
                  </select>
                </div>

                {/* 5. Contract Multiplier (Ounces per standard lot) */}
                <div className="flex flex-col space-y-1.5 col-span-2">
                  <label className="text-[9px] font-bold tracking-widest uppercase text-gray-400">XAU/USD ounces per lot</label>
                  <select
                    value={goldContractSize}
                    onChange={(e) => setGoldContractSize(Number(e.target.value))}
                    className="bg-black/60 border border-terminal-border rounded px-3 py-2 font-bold text-white focus:border-terminal-accent outline-none w-full cursor-pointer text-xs"
                  >
                    <option value={100}>1 Standard Lot (100 Ounces)</option>
                    <option value={10}>1 Mini Lot (10 Ounces)</option>
                    <option value={1}>1 Micro Lot (1 Ounce)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Glowing Results Panel */}
            <div className="bg-black/50 p-6 md:p-8 flex flex-col items-center justify-center space-y-5">
              <div className="text-center space-y-1 font-mono">
                <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest block">Calculated Valuation Outcome</span>
                <span className="text-3xl font-black text-terminal-accent tracking-tight block">
                  {calculatedPipValue !== null ? (
                    depositCurrency === 'USD' ? `$${calculatedPipValue.toFixed(2)}` : `₹${calculatedPipValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                  ) : '--'}
                </span>
                {depositCurrency === 'INR' && (
                  <span className="text-[8px] text-gray-600 uppercase block">
                    Synced with real-time exchange rate: 1 USD = ₹{usdToInr}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Commodity Legend context */}
          <div className="bg-black/15 border border-terminal-border rounded p-4 font-mono text-[9px] text-gray-500 leading-relaxed uppercase">
            Formula Matrix: Lot Size Volume ({goldVolume}) × Contract Ounces ({goldContractSize}) × Pip Interval (0.01) × Pips Move ({goldPips}) = ${goldVolume * goldContractSize * 0.01 * goldPips} USD.
            <br />
            This estimates exact contract margin value. Bitcoin and Ethereum variables have been retired to focus solely on high-fidelity Gold commodity calculations.
          </div>
        </div>
      )}
    </div>
  );
};
