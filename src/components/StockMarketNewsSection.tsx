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

interface NewsItem {
  id: string;
  title: string;
  source: string;
  time: string;
  category: "INDIAN MARKETS" | "GLOBAL MACROS" | "FII/DII FLOWS" | "CORPORATE";
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  impact: "HIGH" | "MEDIUM" | "LOW";
  summary: string;
}

export default function StockMarketNewsSection() {
  const [filter, setFilter] = useState<"ALL" | "INDIAN MARKETS" | "GLOBAL MACROS" | "FII/DII FLOWS" | "CORPORATE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [news, setNews] = useState<NewsItem[]>([
    {
      id: "news-1",
      title: "US Federal Reserve hints at interest rate cuts in upcoming September meet",
      source: "Reuters",
      time: "10 mins ago",
      category: "GLOBAL MACROS",
      sentiment: "BULLISH",
      impact: "HIGH",
      summary: "Fed Chairman signals cooling labor market and easing inflation may justify cutting target rate by 25 basis points in September, driving a global equity market rally."
    },
    {
      id: "news-2",
      title: "FIIs extend buying streak with net purchases of ₹2,450 Crore in cash segment",
      source: "NSE Circular",
      time: "35 mins ago",
      category: "FII/DII FLOWS",
      sentiment: "BULLISH",
      impact: "HIGH",
      summary: "Foreign Institutional Investors remain strong buyers in the Indian equities segment for the 5th consecutive session. DIIs recorded positive inflow of ₹620 Crore."
    },
    {
      id: "news-3",
      title: "Nifty 50 approaches psychological resistance at 23,650; major calls written",
      source: "Exchange Data",
      time: "1 hour ago",
      category: "INDIAN MARKETS",
      sentiment: "NEUTRAL",
      impact: "MEDIUM",
      summary: "Heavy call writing observed at 23,600 and 23,700 strikes, showing stiff resistance ahead. Support shifting higher to 23,400 with strong put congestion."
    },
    {
      id: "news-4",
      title: "Crude Oil prices plunge to 4-month low amid rising inventory and slowing demand",
      source: "Bloomberg",
      time: "2 hours ago",
      category: "GLOBAL MACROS",
      sentiment: "BULLISH",
      impact: "MEDIUM",
      summary: "Brent crude falls below $78 a barrel. Lower energy costs act as a massive structural tailwind for Indian macros, lowering oil import bills and supporting INR."
    }
  ]);

  const fetchLiveNews = async () => {
    try {
      const response = await fetch("/api/news");
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setNews(data);
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
    await fetchLiveNews();
    setIsRefreshing(false);
  };

  const filteredNews = news.filter((item) => {
    const matchesFilter = filter === "ALL" || item.category === filter;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

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
              <span className="text-sm font-black text-terminal-green font-mono">71% BULLISH</span>
            </div>
            
            {/* Visual Gauge */}
            <div className="h-2.5 bg-terminal-border rounded-full overflow-hidden flex">
              <div className="bg-terminal-green h-full" style={{ width: "71%" }} />
              <div className="bg-gray-600 h-full" style={{ width: "15%" }} />
              <div className="bg-terminal-red h-full" style={{ width: "14%" }} />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
              <div className="bg-white/5 p-2 rounded border border-white/5">
                <span className="text-terminal-green block font-bold">71%</span>
                <span className="text-gray-500">BULLISH</span>
              </div>
              <div className="bg-white/5 p-2 rounded border border-white/5">
                <span className="text-gray-400 block font-bold">15%</span>
                <span className="text-gray-500">NEUTRAL</span>
              </div>
              <div className="bg-white/5 p-2 rounded border border-white/5">
                <span className="text-terminal-red block font-bold">14%</span>
                <span className="text-gray-500">BEARISH</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 leading-normal">
              Today's market flow is supported by strong global liquidity and declining energy costs. Regulatory options proposals remain the only major structural friction point.
            </p>
          </div>
        </div>

        {/* Institutional Flow Monitor */}
        <div id="fii-dii-card" className="terminal-card">
          <div className="terminal-header">
            <div className="flex items-center">
              <Layers className="w-4 h-4 mr-2 text-terminal-accent" />
              INSTITUTIONAL FLOW WATCH (NET CRS)
            </div>
          </div>
          <div className="p-4 space-y-3 font-mono">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/5">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 uppercase">FII CASH SEGMENT</span>
                <span className="text-xs font-bold text-gray-400">Net buyers</span>
              </div>
              <span className="text-sm font-black text-terminal-green">+ ₹2,450 Cr</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/5">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 uppercase">DII CASH SEGMENT</span>
                <span className="text-xs font-bold text-gray-400">Net buyers</span>
              </div>
              <span className="text-sm font-black text-terminal-green">+ ₹620 Cr</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/5">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 uppercase">INDEX FUTURES NET</span>
                <span className="text-xs font-bold text-gray-400">Net buyers</span>
              </div>
              <span className="text-sm font-black text-terminal-green">+ ₹1,120 Cr</span>
            </div>
          </div>
        </div>

        {/* Trade Note Box */}
        <div id="news-note-card" className="terminal-card p-4 border-dashed border-terminal-border bg-terminal-card bg-terminal-accent/5">
          <div className="flex items-start space-x-3">
            <Info className="w-4 h-4 text-terminal-accent flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-[10px] font-mono text-white uppercase tracking-wider font-bold">Macro Correlation Note</h4>
              <p className="text-[11px] text-gray-400 leading-normal">
                Strong FII flows combined with favorable crude levels often trigger multi-day continuations. Watch the 23,650 level closely. Any breakout there will trigger immediate short covering.
              </p>
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
                        href="#"
                        onClick={(e) => e.preventDefault()}
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
