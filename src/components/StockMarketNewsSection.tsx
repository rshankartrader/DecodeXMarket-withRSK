import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Newspaper, 
  TrendingUp, 
  TrendingDown, 
  Globe, 
  RefreshCw, 
  Filter, 
  Search, 
  ExternalLink,
  ChevronRight,
  Info,
  Layers,
  Sparkles
} from "lucide-react";
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Bar, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from "recharts";

// Helper to parse FII/DII cash flow string to number
const parseFlowValue = (valStr: string): number => {
  if (!valStr || valStr === "N/A") return 0;
  const cleaned = valStr.replace(/[^\d.-]/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  const isNegative = valStr.includes("-") || valStr.toLowerCase().includes("sell") || valStr.toLowerCase().includes("offload");
  return isNegative ? -Math.abs(num) : Math.abs(num);
};

// Custom Tooltip for the Institutional Flow Watch chart
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const priceData = payload.find((p: any) => p.dataKey === "price");
    const fiiData = payload.find((p: any) => p.dataKey === "fii");
    const diiData = payload.find((p: any) => p.dataKey === "dii");

    return (
      <div className="bg-terminal-bg/95 border border-terminal-border p-3 rounded shadow-lg font-mono text-[10px] space-y-1.5">
        <p className="text-white font-bold border-b border-terminal-border pb-1 mb-1">{label} ({payload[0]?.payload?.date})</p>
        {priceData && (
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">NIFTY PRICE:</span>
            <span className="text-terminal-accent font-bold">₹{priceData.value.toLocaleString("en-IN")}</span>
          </div>
        )}
        {fiiData && (
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">FII Net Cash:</span>
            <span className={`font-bold ${fiiData.value >= 0 ? "text-terminal-green" : "text-terminal-red"}`}>
              {fiiData.value >= 0 ? "+" : ""}₹{fiiData.value.toLocaleString("en-IN")} Cr
            </span>
          </div>
        )}
        {diiData && (
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">DII Net Cash:</span>
            <span className={`font-bold ${diiData.value >= 0 ? "text-terminal-green" : "text-terminal-red"}`}>
              {diiData.value >= 0 ? "+" : ""}₹{diiData.value.toLocaleString("en-IN")} Cr
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

interface NewsItem {
  id: string;
  title: string;
  source: string;
  time: string;
  category: "INDIAN MARKETS" | "GLOBAL MACROS" | "FII/DII FLOWS" | "CORPORATE";
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  impact: "HIGH" | "MEDIUM" | "LOW";
  summary: string;
  url?: string;
}

interface FlowsInfo {
  fiiCash: string;
  fiiCashAction: string;
  diiCash: string;
  diiCashAction: string;
  indexFutures: string;
  indexFuturesAction: string;
  date: string;
}

export default function StockMarketNewsSection() {
  const [filter, setFilter] = useState<"ALL" | "INDIAN MARKETS" | "GLOBAL MACROS" | "FII/DII FLOWS" | "CORPORATE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [flows, setFlows] = useState<FlowsInfo>({
    fiiCash: "+ ₹1,890 Cr",
    fiiCashAction: "BUY",
    diiCash: "+ ₹710 Cr",
    diiCashAction: "BUY",
    indexFutures: "+ ₹1,120 Cr",
    indexFuturesAction: "BUY",
    date: "July 10, 2026"
  });

  const [flowsHistory, setFlowsHistory] = useState<any[]>([]);

  const [news, setNews] = useState<NewsItem[]>([
    {
      id: "news-1",
      title: "Moneycontrol Pro: Market consolidates near all-time highs; Nifty support seen at 23,400",
      source: "Moneycontrol",
      time: "10 mins ago",
      category: "INDIAN MARKETS",
      sentiment: "BULLISH",
      impact: "HIGH",
      summary: "Indian benchmark indices consolidate gains amid selective banking sector demand. Market participants focus on upcoming CPI inflation figures and FII continuation.",
      url: "https://www.moneycontrol.com/news/business/markets/"
    },
    {
      id: "news-2",
      title: "Gold eyes next resistance after consolidating around $2,380; local gold MCX steady",
      source: "Moneycontrol",
      time: "35 mins ago",
      category: "GLOBAL MACROS",
      sentiment: "NEUTRAL",
      impact: "MEDIUM",
      summary: "Spot gold trades tight between $2,365 and $2,390/oz as traders wait for clear signals from the US central bank regarding terminal rate trajectory.",
      url: "https://www.moneycontrol.com/news/tags/gold.html"
    },
    {
      id: "news-3",
      title: "FII net buyers of ₹1,890 Crore while DII cash remains positive in last trading session",
      source: "Moneycontrol",
      time: "1 hour ago",
      category: "FII/DII FLOWS",
      sentiment: "BULLISH",
      impact: "HIGH",
      summary: "Foreign Institutional Investors lead inflows for the third consecutive session. DII flows log net purchase of ₹710 Crore.",
      url: "https://www.moneycontrol.com/news/business/markets/"
    },
    {
      id: "news-4",
      title: "IT stocks regain momentum on reports of rising enterprise software spend",
      source: "Moneycontrol",
      time: "2 hours ago",
      category: "INDIAN MARKETS",
      sentiment: "BULLISH",
      impact: "MEDIUM",
      summary: "Major IT services giants see short-covering ahead of their quarterly prints, supporting Nifty's recovery.",
      url: "https://www.moneycontrol.com/news/business/markets/"
    }
  ]);

  const fetchLiveNews = async (force = false) => {
    try {
      const url = force ? "/api/news?refresh=true" : "/api/news";
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data && typeof data === "object") {
          if (Array.isArray(data.news)) {
            setNews(data.news);
          }
          if (data.flows) {
            setFlows(data.flows);
          }
          if (Array.isArray(data.flowsHistory)) {
            setFlowsHistory(data.flowsHistory);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch live news:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveNews();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLiveNews(true);
    setIsRefreshing(false);
  };

  const getDynamicChartData = () => {
    const targetDays = [
      { day: "Mon", date: "Jul 6", price: 23920, fii: 243, dii: 3791, key: "Jul 6" },
      { day: "Tue", date: "Jul 7", price: 24080, fii: 393, dii: -383, key: "Jul 7" },
      { day: "Wed", date: "Jul 8", price: 24120, fii: 1963, dii: 1240, key: "Jul 8" },
      { day: "Thu", date: "Jul 9", price: 23980, fii: -533, dii: 2058, key: "Jul 9" },
      { day: "Fri", date: "Jul 10", price: 24200, fii: 2604, dii: 2020, key: "Jul 10" }
    ];

    let mappedData = [...targetDays];

    if (flowsHistory && flowsHistory.length > 0) {
      mappedData = targetDays.map((target) => {
        const matched = flowsHistory.find((h) => {
          if (!h.date) return false;
          const normalizedH = h.date.toLowerCase().replace(/,/g, "");
          const normalizedT = target.key.toLowerCase();
          return normalizedH.includes(normalizedT);
        });

        if (matched) {
          const parsedFii = parseFlowValue(matched.fiiCash);
          const parsedDii = parseFlowValue(matched.diiCash);
          return {
            day: target.day,
            date: matched.date.split(",")[0] || target.key,
            price: target.price,
            fii: parsedFii !== 0 ? parsedFii : target.fii,
            dii: parsedDii !== 0 ? parsedDii : target.dii,
            key: target.key
          };
        }
        return target;
      });
    }

    // Also merge the current latest flows if available and has matching date
    if (flows) {
      const fiiVal = parseFlowValue(flows.fiiCash);
      const diiVal = parseFlowValue(flows.diiCash);
      const latestDateStr = (flows.date && flows.date !== "N/A") ? flows.date.split(",")[0] : null;

      if (latestDateStr) {
        const matchedIdx = mappedData.findIndex((target) => {
          return latestDateStr.toLowerCase().includes(target.key.toLowerCase());
        });
        if (matchedIdx !== -1) {
          mappedData[matchedIdx].fii = fiiVal !== 0 ? fiiVal : mappedData[matchedIdx].fii;
          mappedData[matchedIdx].dii = diiVal !== 0 ? diiVal : mappedData[matchedIdx].dii;
          mappedData[matchedIdx].date = latestDateStr;
        } else {
          // Fallback override of Friday (index 4) if it doesn't match any older day
          const lastIdx = mappedData.length - 1;
          mappedData[lastIdx].fii = fiiVal !== 0 ? fiiVal : mappedData[lastIdx].fii;
          mappedData[lastIdx].dii = diiVal !== 0 ? diiVal : mappedData[lastIdx].dii;
          mappedData[lastIdx].date = latestDateStr;
        }
      }
    }

    return mappedData;
  };

  const filteredNews = news.filter((item) => {
    const matchesFilter = filter === "ALL" || item.category === filter;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Calculate dynamic sentiment stats from active news
  const totalNews = news.length;
  const bullishCount = news.filter((item) => item.sentiment === "BULLISH").length;
  const bearishCount = news.filter((item) => item.sentiment === "BEARISH").length;
  const neutralCount = news.filter((item) => item.sentiment === "NEUTRAL").length;

  // Compute percentages
  const bullishPct = totalNews > 0 ? Math.round((bullishCount / totalNews) * 100) : 71;
  const bearishPct = totalNews > 0 ? Math.round((bearishCount / totalNews) * 100) : 14;
  const neutralPct = totalNews > 0 ? (100 - bullishPct - bearishPct) : 15;

  // Determine overall dominant sentiment
  let compositeOutlook = "BULLISH";
  let compositePct = bullishPct;
  if (bearishPct > bullishPct && bearishPct > neutralPct) {
    compositeOutlook = "BEARISH";
    compositePct = bearishPct;
  } else if (neutralPct > bullishPct && neutralPct > bearishPct) {
    compositeOutlook = "NEUTRAL";
    compositePct = neutralPct;
  } else {
    compositeOutlook = "BULLISH";
    compositePct = bullishPct;
  }

  const getDynamicSummary = () => {
    if (totalNews === 0) {
      return "Fetching latest intelligence on Indian Indices and Gold... System analyzing historical trend alignments.";
    }
    const highImpactCount = news.filter(n => n.impact === "HIGH").length;
    const keyTopics = Array.from(new Set(news.map(n => {
      if (n.title.toLowerCase().includes("gold")) return "Gold";
      if (n.title.toLowerCase().includes("nifty") || n.title.toLowerCase().includes("index")) return "Nifty";
      if (n.title.toLowerCase().includes("fii") || n.title.toLowerCase().includes("dii")) return "Institutional Flows";
      if (n.title.toLowerCase().includes("fed") || n.title.toLowerCase().includes("rate")) return "Fed Policy";
      return null;
    }).filter(Boolean))).slice(0, 2);

    const topicString = keyTopics.length > 0 ? `focused on ${keyTopics.join(" and ")}` : "shaping index momentum";

    if (compositeOutlook === "BULLISH") {
      return `Current market feed shows strong positive alignment ${topicString}. With ${bullishPct}% bullish sentiment and ${highImpactCount} high-impact updates, bulls maintain firm control over short-term trends.`;
    } else if (compositeOutlook === "BEARISH") {
      return `Sentiment analysis flags high caution ${topicString}. Rising bearish signals (${bearishPct}%) suggest a potential trend exhaustion or short-term correction risk in major indices.`;
    } else {
      return `The market is trading within tight consolidation ranges ${topicString}. Neutral signals dominate at ${neutralPct}%, indicating an impending breakout window once key levels clear.`;
    }
  };

  return (
    <div id="stock-market-news-container" className="flex-1 p-4 grid grid-cols-12 gap-4 bg-terminal-bg">
      {/* Header and Filter Row */}
      <div id="news-header-panel" className="col-span-12 flex flex-col xl:flex-row xl:items-center xl:justify-between border-b border-terminal-border pb-4 gap-4">
        <div>
          <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center">
            <Newspaper className="w-5 h-5 text-terminal-accent mr-2" />
            LIVE MARKET INTELLIGENCE & SENTIMENT FEED
          </h2>
          <p className="text-xs text-gray-500 font-mono mt-1">
            Real-time breaking corporate news, institutional flows, and global macro triggers.
          </p>
        </div>

        {/* Search & Refresh Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative bg-terminal-card border border-terminal-border rounded-md px-3 py-1.5 flex items-center w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-gray-500 mr-2" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search news..."
              className="bg-transparent border-none text-xs text-white outline-none w-full font-mono placeholder-gray-600"
            />
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center text-xs font-mono text-gray-400 hover:text-white transition-colors border border-terminal-border bg-terminal-card px-3 py-1.5 rounded-md"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isRefreshing ? "animate-spin text-terminal-accent" : ""}`} />
            REFRESH
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      {/* Left Column: Sentiment Dashboard & Institutional Flows */}
      <div id="news-left-column" className="col-span-12 lg:col-span-4 space-y-4">
        {/* Sentiment Meter */}
        <div id="news-sentiment-card" className="terminal-card">
          <div className="terminal-header">
            <div className="flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-terminal-accent" />
              NEWS SENTIMENT ANALYZER
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400 font-mono">COMPOSITE OUTLOOK</span>
              <span className={`text-sm font-black font-mono ${
                compositeOutlook === "BULLISH" ? "text-terminal-green" : 
                compositeOutlook === "BEARISH" ? "text-terminal-red" : 
                "text-gray-400"
              }`}>{compositePct}% {compositeOutlook}</span>
            </div>
            
            {/* Visual Gauge */}
            <div className="h-2.5 bg-terminal-border rounded-full overflow-hidden flex">
              <div className="bg-terminal-green h-full" style={{ width: `${bullishPct}%` }} />
              <div className="bg-gray-600 h-full" style={{ width: `${neutralPct}%` }} />
              <div className="bg-terminal-red h-full" style={{ width: `${bearishPct}%` }} />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
              <div className="bg-white/5 p-2 rounded border border-white/5">
                <span className="text-terminal-green block font-bold">{bullishPct}%</span>
                <span className="text-gray-500">BULLISH</span>
              </div>
              <div className="bg-white/5 p-2 rounded border border-white/5">
                <span className="text-gray-400 block font-bold">{neutralPct}%</span>
                <span className="text-gray-500">NEUTRAL</span>
              </div>
              <div className="bg-white/5 p-2 rounded border border-white/5">
                <span className="text-terminal-red block font-bold">{bearishPct}%</span>
                <span className="text-gray-500">BEARISH</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 leading-normal">
              {getDynamicSummary()}
            </p>
          </div>
        </div>

        {/* Institutional Flow Monitor */}
        <div id="fii-dii-card" className="terminal-card">
          <div className="terminal-header flex justify-between items-center">
            <div className="flex items-center">
              <Layers className="w-4 h-4 mr-2 text-terminal-accent" />
              INSTITUTIONAL FLOW WATCH
            </div>
            <span className="text-[9px] font-mono text-gray-500 uppercase">{flows.date}</span>
          </div>
          <div className="p-4 space-y-3 font-mono">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/5">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 uppercase">FII CASH SEGMENT</span>
                <span className="text-xs font-bold text-gray-400">Net {flows.fiiCashAction === "BUY" ? "buyers" : "sellers"}</span>
              </div>
              <span className={`text-sm font-black ${flows.fiiCashAction === "BUY" ? "text-terminal-green" : "text-terminal-red"}`}>
                {flows.fiiCash}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/5">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 uppercase">DII CASH SEGMENT</span>
                <span className="text-xs font-bold text-gray-400">Net {flows.diiCashAction === "BUY" ? "buyers" : "sellers"}</span>
              </div>
              <span className={`text-sm font-black ${flows.diiCashAction === "BUY" ? "text-terminal-green" : "text-terminal-red"}`}>
                {flows.diiCash}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/5">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 uppercase">INDEX FUTURES NET</span>
                <span className="text-xs font-bold text-gray-400">Net {flows.indexFuturesAction === "BUY" ? "buyers" : "sellers"}</span>
              </div>
              <span className={`text-sm font-black ${flows.indexFuturesAction === "BUY" ? "text-terminal-green" : "text-terminal-red"}`}>
                {flows.indexFutures}
              </span>
            </div>
          </div>
        </div>

        {/* Institutional Flow Watch Chart */}
        <div id="fii-dii-chart-card" className="terminal-card">
          <div className="terminal-header flex justify-between items-center">
            <div className="flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-terminal-accent" />
              INSTITUTIONAL FLOW WATCH (1W)
            </div>
          </div>
          <div className="p-3">
            <div className="h-[210px] w-full mt-1">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={getDynamicChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232326" vertical={false} />
                  <XAxis 
                    dataKey="day" 
                    stroke="#4B5563" 
                    fontSize={9} 
                    fontFamily="JetBrains Mono"
                    tickLine={false}
                  />
                  <YAxis 
                    yAxisId="price"
                    orientation="right"
                    domain={[23800, 24300]}
                    stroke="#3B82F6"
                    fontSize={8}
                    fontFamily="JetBrains Mono"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <YAxis 
                    yAxisId="flow"
                    orientation="left"
                    stroke="#9CA3AF"
                    fontSize={8}
                    fontFamily="JetBrains Mono"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar yAxisId="flow" dataKey="fii" maxBarSize={12} radius={[2, 2, 0, 0]} name="FII Net">
                    {getDynamicChartData().map((entry, index) => (
                      <Cell key={`cell-fii-${index}`} fill={entry.fii >= 0 ? "#10B981" : "#EF4444"} opacity={0.65} />
                    ))}
                  </Bar>
                  <Bar yAxisId="flow" dataKey="dii" maxBarSize={12} radius={[2, 2, 0, 0]} name="DII Net">
                    {getDynamicChartData().map((entry, index) => (
                      <Cell key={`cell-dii-${index}`} fill={entry.dii >= 0 ? "#10B981" : "#EF4444"} opacity={0.65} />
                    ))}
                  </Bar>
                  <Line 
                    yAxisId="price" 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ r: 2, stroke: "#3B82F6", strokeWidth: 1, fill: "#0A0A0B" }}
                    activeDot={{ r: 4 }}
                    name="Nifty Price"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {/* Custom Legend */}
            <div className="flex flex-wrap justify-center items-center gap-4 mt-2 text-[9px] font-mono text-gray-500">
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-1.5 bg-[#3B82F6] rounded-sm" />
                <span>NIFTY PRICE</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-1.5 bg-[#10B981] rounded-sm" />
                <span>NET BUY (INFLOW)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-1.5 bg-[#EF4444] rounded-sm" />
                <span>NET SELL (OUTFLOW)</span>
              </div>
              <div className="text-[8px] text-gray-600 border-l border-terminal-border pl-3">
                [BARS: LEFT = FII, RIGHT = DII]
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Breaking News Feed */}
      <div id="news-right-column" className="col-span-12 lg:col-span-8 space-y-4">
        {/* News Filters */}
        <div id="news-filters-row" className="flex flex-wrap gap-2 border-b border-terminal-border pb-3">
          {(["ALL", "INDIAN MARKETS", "GLOBAL MACROS", "FII/DII FLOWS", "CORPORATE"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded text-[9px] font-mono font-black uppercase tracking-widest transition-all ${
                filter === cat 
                  ? "bg-terminal-accent text-white" 
                  : "bg-terminal-card border border-terminal-border text-gray-500 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* News List */}
        <div id="news-items-list" className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
          <AnimatePresence mode="popLayout">
            {filteredNews.length > 0 ? (
              filteredNews.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="terminal-card bg-terminal-card/40 hover:border-terminal-accent/30 hover:bg-terminal-card transition-all duration-200"
                >
                  <div className="p-4 space-y-3">
                    {/* Tags and Metadata */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-[8px] font-mono font-black tracking-wider bg-terminal-accent/15 border border-terminal-accent/35 px-2 py-0.5 rounded text-terminal-accent">
                          {item.category}
                        </span>
                        <span className={`text-[8px] font-mono font-black tracking-wider px-2 py-0.5 rounded ${
                          item.sentiment === "BULLISH" ? "bg-terminal-green/10 text-terminal-green border border-terminal-green/20" :
                          item.sentiment === "BEARISH" ? "bg-terminal-red/10 text-terminal-red border border-terminal-red/20" :
                          "bg-gray-500/10 text-gray-400 border border-white/5"
                        } border`}>
                          {item.sentiment} SENTIMENT
                        </span>
                        
                        <span className={`text-[8px] font-mono font-black tracking-wider px-2 py-0.5 rounded ${
                          item.impact === "HIGH" ? "bg-terminal-red/10 text-terminal-red animate-pulse" :
                          item.impact === "MEDIUM" ? "text-yellow-500 bg-yellow-400/5" :
                          "text-gray-400 bg-white/5"
                        }`}>
                          {item.impact} IMPACT
                        </span>
                      </div>

                      <span className="text-[10px] font-mono text-gray-500">{item.time}</span>
                    </div>

                    {/* Headline and Description */}
                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-white hover:text-terminal-accent transition-colors flex items-start leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-xs text-gray-400 leading-relaxed font-normal">
                        {item.summary}
                      </p>
                    </div>

                    {/* Source and footer action */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-2.5">
                      <span className="text-[9px] font-mono text-gray-500 uppercase">SOURCE: {item.source}</span>
                      <a 
                        href={item.url || "https://www.moneycontrol.com"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-[9px] font-mono text-terminal-accent hover:underline uppercase"
                      >
                        FULL INTEL
                        <ExternalLink className="w-2.5 h-2.5 ml-1" />
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12 border border-dashed border-terminal-border rounded-lg bg-terminal-card/20">
                <Newspaper className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-xs font-mono text-gray-500">No news alerts match your current search/filter.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
