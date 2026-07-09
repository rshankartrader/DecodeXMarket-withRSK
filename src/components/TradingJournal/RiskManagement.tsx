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
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink
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
  const [riskPercent, setRiskPercent] = useState(2);
  const [buyPrice, setBuyPrice] = useState(24300);
  const [stoploss, setStoploss] = useState(24200);
  const [customLotSize, setCustomLotSize] = useState(65);

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
      setBuyPrice(24300);
      setStoploss(24200);
      setCustomLotSize(65);
    } else if (selectedAsset === 'banknifty') {
      setBuyPrice(52500);
      setStoploss(52300);
      setCustomLotSize(30);
    } else if (selectedAsset === 'sensex') {
      setBuyPrice(79500);
      setStoploss(79200);
      setCustomLotSize(20);
    } else if (selectedAsset === 'custom') {
      setBuyPrice(100);
      setStoploss(90);
      setCustomLotSize(1);
    }
  }, [selectedAsset]);

  // Position Size Math
  const riskAmount = fundsAvailable * (riskPercent / 100);
  const riskPerUnit = Math.max(0, buyPrice - stoploss);
  const sharesToBuy = riskPerUnit > 0 ? Math.floor(riskAmount / riskPerUnit) : 0;
  const totalInvestmentAmount = sharesToBuy * buyPrice;
  const lotsToBuy = customLotSize > 0 ? Number((sharesToBuy / customLotSize).toFixed(1)) : 0;

  // Donut Chart Calculations (relative to total funds)
  const donutRadius = 45;
  const donutCircumference = 2 * Math.PI * donutRadius; // ~282.74
  
  // Total of the visual segments is based on fundsAvailable (or total investment if leveraged)
  const visualTotal = Math.max(fundsAvailable, totalInvestmentAmount);
  
  const riskPercentOfTotal = visualTotal > 0 ? (riskAmount / visualTotal) : 0;
  // Investment segment excluding the risk segment to prevent double overlapping visual weight
  const investPercentOfTotal = visualTotal > 0 ? (Math.max(0, totalInvestmentAmount - riskAmount) / visualTotal) : 0;
  
  const strokeRisk = riskPercentOfTotal * donutCircumference;
  const strokeInvest = investPercentOfTotal * donutCircumference;

  // ==========================================
  // STATE & LOGIC FOR GOLD PIP CALCULATOR
  // ==========================================
  const [goldPips, setGoldPips] = useState(700);
  const [goldUnits, setGoldUnits] = useState(1);
  const [goldPipSize, setGoldPipSize] = useState(0.001);
  const [depositCurrency, setDepositCurrency] = useState<'USD' | 'INR'>('USD');
  const [calculatedPipValue, setCalculatedPipValue] = useState<number | null>(0.70);

  const calculateGoldPip = () => {
    const valueInUSD = goldPips * goldUnits * goldPipSize;
    if (depositCurrency === 'INR') {
      setCalculatedPipValue(valueInUSD * usdToInr);
    } else {
      setCalculatedPipValue(valueInUSD);
    }
  };

  // Auto calculate when inputs or currency change
  useEffect(() => {
    calculateGoldPip();
  }, [goldPips, goldUnits, goldPipSize, depositCurrency, usdToInr]);

  // Format Helpers
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
      return `₹ ${formatIndianNumber(val)}`;
    }
    return `$ ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col space-y-2">
          <h2 className="text-2xl font-black tracking-tighter text-white uppercase flex items-center">
            <Shield className="w-6 h-6 mr-2 text-terminal-accent" />
            Risk Management Lab
          </h2>
          <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">
            Optimal Position Sizing & Gold Pip Value Intelligence
          </p>
        </div>
        
        <button 
          onClick={fetchRates} 
          disabled={isLoadingRates}
          className="flex items-center space-x-2 bg-terminal-accent/10 hover:bg-terminal-accent/20 border border-terminal-accent/30 text-terminal-accent px-3 py-1.5 rounded text-xs font-mono transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRates ? 'animate-spin' : ''}`} />
          <span>{isLoadingRates ? 'SYNCING...' : `1 USD = ₹${usdToInr} (SYNCED)`}</span>
        </button>
      </div>

      {/* Calculator Navigation Tabs */}
      <div className="flex space-x-2 border-b border-terminal-border/40 pb-px">
        <button
          onClick={() => setActiveTab('position_size')}
          className={`flex items-center space-x-2 px-5 py-3 text-xs font-bold font-mono tracking-wider transition-all border-b-2 uppercase ${
            activeTab === 'position_size'
              ? 'border-terminal-accent text-white bg-terminal-accent/5'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Position Size Calculator</span>
        </button>
        <button
          onClick={() => setActiveTab('pip_calculator')}
          className={`flex items-center space-x-2 px-5 py-3 text-xs font-bold font-mono tracking-wider transition-all border-b-2 uppercase ${
            activeTab === 'pip_calculator'
              ? 'border-terminal-accent text-white bg-terminal-accent/5'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Gold Pip Calculator</span>
        </button>
      </div>

      {/* ==========================================
          TAB 1: POSITION SIZE CALCULATOR
          ========================================== */}
      {activeTab === 'position_size' && (
        <div className="space-y-6">
          {/* Header row with asset selectors */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-terminal-card/25 border border-terminal-border/30 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Select Instrument:</span>
              <div className="flex flex-wrap gap-1.5">
                {(['nifty', 'banknifty', 'sensex', 'custom'] as const).map((asset) => (
                  <button
                    key={asset}
                    onClick={() => setSelectedAsset(asset)}
                    className={`px-3 py-1 rounded text-xs font-bold font-mono uppercase transition-all border ${
                      selectedAsset === asset
                        ? 'bg-terminal-accent text-black border-terminal-accent'
                        : 'bg-black/30 text-gray-400 border-terminal-border hover:border-gray-500 hover:text-white'
                    }`}
                  >
                    {asset === 'nifty' && '🇮🇳 Nifty 50'}
                    {asset === 'banknifty' && '🇮🇳 Bank Nifty'}
                    {asset === 'sensex' && '🇮🇳 Sensex'}
                    {asset === 'custom' && '⚙️ Custom Stock'}
                  </button>
                ))}
              </div>
            </div>
            {selectedAsset !== 'custom' && (
              <div className="text-[10px] font-mono text-terminal-accent">
                LOT SIZE: <strong className="text-white">{customLotSize} Units</strong>
              </div>
            )}
          </div>

          <div className="bg-terminal-card/10 border border-terminal-border/40 rounded-xl p-6 md:p-8 space-y-6">
            <h3 className="text-lg font-black text-white font-sans tracking-tight border-b border-terminal-border/20 pb-3 flex items-center">
              <Calculator className="w-5 h-5 text-terminal-accent mr-2" />
              Calculate your Investment Amount:
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Sliders & Form */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* 1. Funds Available */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-gray-300">Funds Available (₹)</label>
                    <input
                      type="number"
                      value={fundsAvailable}
                      onChange={(e) => handleFundsChange(Math.max(0, Number(e.target.value)))}
                      className="bg-terminal-bg border border-terminal-border rounded px-3 py-1.5 font-mono text-white text-right focus:border-terminal-accent outline-none w-44 font-bold"
                    />
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="10000000"
                    step="500"
                    value={fundsAvailable}
                    onChange={(e) => handleFundsChange(Number(e.target.value))}
                    className="w-full accent-terminal-accent cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                    <span>₹ 500</span>
                    <span>₹ 1,00,00,000</span>
                  </div>
                </div>

                {/* 2. Risk Boundary (%) */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-gray-300">Risk Boundary (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      step="0.1"
                      value={riskPercent}
                      onChange={(e) => setRiskPercent(Math.max(0.1, Math.min(100, Number(e.target.value))))}
                      className="bg-terminal-bg border border-terminal-border rounded px-3 py-1.5 font-mono text-white text-right focus:border-terminal-accent outline-none w-24 font-bold"
                    />
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="0.5"
                    value={riskPercent}
                    onChange={(e) => setRiskPercent(Number(e.target.value))}
                    className="w-full accent-terminal-accent cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                    <span>1%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* 3. Buy Price */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-gray-300">Buy Price (₹)</label>
                    <input
                      type="number"
                      value={buyPrice}
                      onChange={(e) => setBuyPrice(Math.max(0.1, Number(e.target.value)))}
                      className="bg-terminal-bg border border-terminal-border rounded px-3 py-1.5 font-mono text-white text-right focus:border-terminal-accent outline-none w-36 font-bold"
                    />
                  </div>
                  <input
                    type="range"
                    min="10"
                    max={selectedAsset === 'custom' ? "10000" : "150000"}
                    step="5"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(Number(e.target.value))}
                    className="w-full accent-terminal-accent cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                    <span>₹ 10</span>
                    <span>₹ {selectedAsset === 'custom' ? "10,000" : "1,50,000"}</span>
                  </div>
                </div>

                {/* 4. Stoploss */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-gray-300">Stoploss Price (₹)</label>
                    <input
                      type="number"
                      value={stoploss}
                      onChange={(e) => setStoploss(Math.max(0.1, Number(e.target.value)))}
                      className="bg-terminal-bg border border-terminal-border rounded px-3 py-1.5 font-mono text-white text-right focus:border-terminal-accent outline-none w-36 font-bold"
                    />
                  </div>
                  <input
                    type="range"
                    min="10"
                    max={buyPrice}
                    step="5"
                    value={stoploss}
                    onChange={(e) => setStoploss(Number(e.target.value))}
                    className="w-full accent-terminal-accent cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                    <span>₹ 10</span>
                    <span>₹ {buyPrice.toLocaleString()}</span>
                  </div>
                </div>

              </div>

              {/* Right Column: Calculations & Donut Chart Visualizer */}
              <div className="lg:col-span-5 bg-black/30 border border-terminal-border/30 rounded-xl p-5 space-y-6 flex flex-col justify-between h-full">
                
                {/* Key Output Metrics */}
                <div className="grid grid-cols-3 gap-3 text-center border-b border-terminal-border/20 pb-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-gray-500 uppercase block tracking-wider">Investment</span>
                    <span className="text-sm md:text-base font-black text-blue-400 font-mono">
                      {formatCurrency(totalInvestmentAmount, 'INR')}
                    </span>
                  </div>
                  <div className="space-y-1 border-x border-terminal-border/20 px-2">
                    <span className="text-[10px] font-mono text-gray-500 uppercase block tracking-wider">Potential Risk</span>
                    <span className="text-sm md:text-base font-black text-orange-400 font-mono">
                      {formatCurrency(riskAmount, 'INR')}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-gray-500 uppercase block tracking-wider">
                      {selectedAsset === 'custom' ? 'Shares to Buy' : 'Units (Lots)'}
                    </span>
                    <span className="text-sm md:text-base font-black text-white font-mono">
                      {selectedAsset === 'custom' ? (
                        sharesToBuy
                      ) : (
                        <span>
                          {sharesToBuy} <span className="text-[10px] text-gray-400">({lotsToBuy} L)</span>
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Donut Chart Visual */}
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <svg width="100%" height="100%" viewBox="0 0 120 120" className="transform -rotate-90">
                      {/* Background circle of uninvested capital */}
                      <circle 
                        cx="60" 
                        cy="60" 
                        r={donutRadius} 
                        fill="transparent" 
                        stroke="#1e293b" 
                        strokeWidth="10" 
                      />
                      
                      {/* Segment 2: Invested capital (Blue) */}
                      {strokeInvest > 0 && (
                        <circle
                          cx="60"
                          cy="60"
                          r={donutRadius}
                          fill="transparent"
                          stroke="#3b82f6"
                          strokeWidth="10"
                          strokeDasharray={`${strokeInvest} ${donutCircumference}`}
                          strokeDashoffset={-strokeRisk}
                          className="transition-all duration-300"
                        />
                      )}

                      {/* Segment 1: Potential Risk (Orange) */}
                      {strokeRisk > 0 && (
                        <circle
                          cx="60"
                          cy="60"
                          r={donutRadius}
                          fill="transparent"
                          stroke="#f97316"
                          strokeWidth="10"
                          strokeDasharray={`${strokeRisk} ${donutCircumference}`}
                          strokeDashoffset={0}
                          className="transition-all duration-300"
                        />
                      )}
                    </svg>

                    {/* Content inside the donut */}
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-[8px] font-mono text-gray-500 uppercase">RISK</span>
                      <span className="text-xs font-black text-orange-400 font-mono">{riskPercent}%</span>
                    </div>
                  </div>

                  {/* Chart Legends */}
                  <div className="flex space-x-6 text-[10px] font-mono">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-orange-500 block" />
                      <span className="text-gray-400">Potential Risk</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 block" />
                      <span className="text-gray-400">Investment Amount</span>
                    </div>
                  </div>
                </div>

                {/* Narrative Summary Text */}
                <div className="bg-black/40 border border-terminal-border/20 rounded p-4 text-xs font-mono text-gray-400 leading-relaxed text-center">
                  With <strong className="text-white">₹ {formatIndianNumber(fundsAvailable)}</strong> capital at <strong className="text-orange-400">{riskPercent}%</strong> risk, you can invest <strong className="text-blue-400">₹ {formatIndianNumber(totalInvestmentAmount)}</strong> buy-exposure (buying <strong className="text-white">{sharesToBuy} units</strong>{selectedAsset !== 'custom' && ` or approx ${lotsToBuy} lots`}) given your risk boundary and stoploss at <strong className="text-terminal-red">₹ {formatIndianNumber(stoploss)}</strong>.
                </div>

                {/* Leverage warning if total investment exceeds capital */}
                {totalInvestmentAmount > fundsAvailable && (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 flex items-start space-x-2.5">
                    <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 text-left">
                      <div className="text-[10px] font-mono font-bold text-orange-500 uppercase">Leveraged Position Warning</div>
                      <p className="text-[9px] font-mono text-gray-400 leading-normal uppercase">
                        This trade size exceeds available capital. It requires <strong className="text-white">{(totalInvestmentAmount / fundsAvailable).toFixed(1)}x</strong> leverage/margin to execute. Check index option margins.
                      </p>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 2: GOLD PIP CALCULATOR (XAU/USD)
          ========================================== */}
      {activeTab === 'pip_calculator' && (
        <div className="max-w-xl mx-auto space-y-6">
          
          {/* Main Card replicating Image 1 styling with extreme precision */}
          <div className="border border-terminal-border/30 rounded-xl overflow-hidden shadow-2xl">
            {/* Beautiful Teal-Emerald Gradient Top Panel */}
            <div className="bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-400 p-6 md:p-8 text-white space-y-6 relative">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold tracking-wider uppercase opacity-90">Gold Valuation Matrix</span>
                <ExternalLink className="w-4 h-4 opacity-75 cursor-pointer hover:opacity-100" />
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                {/* 1. Pips Input */}
                <div className="flex flex-col space-y-2">
                  <label className="text-xs font-bold tracking-wide uppercase opacity-90">Pips</label>
                  <input
                    type="number"
                    value={goldPips}
                    onChange={(e) => setGoldPips(Math.max(0, Number(e.target.value)))}
                    className="bg-white border-0 rounded px-4 py-2.5 font-bold font-mono text-gray-900 focus:ring-2 focus:ring-teal-300 outline-none w-full"
                    placeholder="700"
                  />
                </div>

                {/* 2. Instrument Dropdown (Disabled/Locked to XAU/USD as per requested scope) */}
                <div className="flex flex-col space-y-2">
                  <label className="text-xs font-bold tracking-wide uppercase opacity-90">Instrument</label>
                  <select
                    disabled
                    className="bg-white border-0 rounded px-4 py-2.5 font-bold font-mono text-gray-900 focus:ring-2 focus:ring-teal-300 outline-none w-full cursor-not-allowed opacity-95"
                  >
                    <option value="XAU/USD">XAU/USD</option>
                  </select>
                </div>

                {/* 3. Units Trade Size */}
                <div className="flex flex-col space-y-2">
                  <label className="text-xs font-bold tracking-wide uppercase opacity-90 flex items-center">
                    <Settings className="w-3.5 h-3.5 mr-1 animate-pulse" />
                    Units (trade size)
                  </label>
                  <input
                    type="number"
                    value={goldUnits}
                    onChange={(e) => setGoldUnits(Math.max(0.001, Number(e.target.value)))}
                    className="bg-white border-0 rounded px-4 py-2.5 font-bold font-mono text-gray-900 focus:ring-2 focus:ring-teal-300 outline-none w-full"
                    placeholder="1"
                  />
                </div>

                {/* 4. Deposit Currency */}
                <div className="flex flex-col space-y-2">
                  <label className="text-xs font-bold tracking-wide uppercase opacity-90">Deposit currency</label>
                  <select
                    value={depositCurrency}
                    onChange={(e) => setDepositCurrency(e.target.value as 'USD' | 'INR')}
                    className="bg-white border-0 rounded px-4 py-2.5 font-bold font-mono text-gray-900 focus:ring-2 focus:ring-teal-300 outline-none w-full cursor-pointer"
                  >
                    <option value="USD">US Dollar</option>
                    <option value="INR">Indian Rupee (INR)</option>
                  </select>
                </div>

                {/* 5. Pip Size */}
                <div className="flex flex-col space-y-2 col-span-2">
                  <label className="text-xs font-bold tracking-wide uppercase opacity-90">XAU/USD 1 Pip Size</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={goldPipSize}
                    onChange={(e) => setGoldPipSize(Math.max(0.00001, Number(e.target.value)))}
                    className="bg-white border-0 rounded px-4 py-2.5 font-bold font-mono text-gray-900 focus:ring-2 focus:ring-teal-300 outline-none w-full"
                    placeholder="0.001"
                  />
                </div>
              </div>
            </div>

            {/* Bottom White Panel */}
            <div className="bg-white p-6 md:p-8 flex flex-col items-center justify-center space-y-6 text-gray-900">
              <button
                onClick={calculateGoldPip}
                className="bg-[#1a8db2] hover:bg-[#14708e] text-white font-bold font-sans px-10 py-3 rounded-full text-base transition-all shadow-md active:scale-95"
              >
                Calculate
              </button>

              <div className="text-center space-y-1">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold block">Calculated Pip Value</span>
                <span className="text-3xl md:text-4xl font-black text-[#12314e] font-sans tracking-tight">
                  {calculatedPipValue !== null ? (
                    depositCurrency === 'USD' ? `US$${calculatedPipValue.toFixed(2)}` : `₹${calculatedPipValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                  ) : '--'}
                </span>
                {depositCurrency === 'INR' && (
                  <span className="text-[9px] font-mono text-gray-500 block">
                    Converted using live rate: 1 USD = ₹{usdToInr}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Gold specs card */}
          <div className="bg-terminal-card/15 border border-terminal-border/40 rounded-xl p-4 space-y-2.5">
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">Gold Trading Formula Context</span>
            <p className="text-[10px] font-mono text-gray-500 leading-normal uppercase">
              Pip Value = Pips ({goldPips}) × Units ({goldUnits}) × Pip Size ({goldPipSize}) = {goldPips * goldUnits * goldPipSize} USD.
              <br />
              This calculator estimates exact commoditized gold contract valuation under margin terms. Adjust units or pip size freely for micro, mini or standard lot specs.
            </p>
          </div>

        </div>
      )}
    </div>
  );
};
