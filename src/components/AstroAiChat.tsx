import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  X, 
  Send, 
  Compass, 
  LineChart, 
  Coins, 
  Moon, 
  RefreshCw,
  Search,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: { uri: string; title: string }[];
  isFallback?: boolean;
  note?: string;
}

export default function AstroAiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Greetings, Trader. I am **Astro AI**, your Financial Astrology & Gann Cycle navigator. Ask me anything about planetary ingresses, retrogrades, moon cycles, or real-time and historical market price targets. I can fetch live prices via Google Search grounding! 🌌📈"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text) return;

    if (!textToSend) setInput("");
    
    const userMessage: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/astro-ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      if (!response.ok) {
        throw new Error("Failed to receive transmission from celestial network.");
      }

      const data = await response.json();
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.reply,
        citations: data.citations,
        isFallback: data.isFallback,
        note: data.note
      }]);
    } catch (error: any) {
      console.warn("[Astro AI Proxy Failed]:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `### 🌌 Connection Failed

Astro AI could not communicate with the backend. This usually occurs if:

1. **The Gemini API Key is missing** on your host (e.g., Vercel). Please ensure that \`GEMINI_API_KEY\` is configured in your Vercel Project Settings > Environment Variables.
2. **Serverless route is offline or cold-starting**. Please try sending the message again in a few moments.
3. **The domain is unauthorized** or CORS limits are active.

*Please verify your Vercel deployment logs and environment setup.*`,
        isFallback: false,
        note: "Astro AI transmission failed. Check API key configuration."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    { label: "🌕 Moon Impact Today", text: "What is today's moon cycle / lunar alignment and how does it affect market sentiment and trading?" },
    { label: "📉 Nifty 50 Pivot Cycles", text: "Are there any critical planetary ingress or cycle pivot dates coming up for Nifty 50 and Bank Nifty?" },
    { label: "💰 Gold 2026 Gann Trend", text: "Can you analyze the Gann cycle dates and planetary aspects affecting Gold price trends in 2026?" },
    { label: "🪙 Fetch Live Bitcoin Price", text: "Fetch the current real-time price of Bitcoin and outline its immediate historical cycle trend." }
  ];

  // Helper to format text with bold and newlines elegantly
  const formatMessageText = (text: string) => {
    // Escape HTML tags to prevent XSS
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Code blocks format
    const withCodeBlocks = escaped.split("```");
    return withCodeBlocks.map((chunk, idx) => {
      // Odd indices are inside code blocks
      if (idx % 2 === 1) {
        return (
          <pre key={idx} className="bg-black/40 border border-white/5 p-3 rounded-md font-mono text-[10px] text-teal-300 overflow-x-auto my-2 whitespace-pre-wrap break-words">
            {chunk.replace(/^\w+\n/, "")} {/* remove language prefix if any */}
          </pre>
        );
      }

      // Inline formatting (bold, lists)
      const lines = chunk.split("\n");
      return (
        <div key={idx} className="space-y-1.5">
          {lines.map((line, lineIdx) => {
            // Unordered list
            if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
              const content = line.trim().substring(2);
              return (
                <ul key={lineIdx} className="list-disc pl-4 text-xs text-gray-300 leading-relaxed my-0.5">
                  <li>{renderInlineBold(content)}</li>
                </ul>
              );
            }
            // Numbered list
            const numMatch = line.trim().match(/^(\d+)\.\s(.*)/);
            if (numMatch) {
              return (
                <ol key={lineIdx} className="list-decimal pl-4 text-xs text-gray-300 leading-relaxed my-0.5">
                  <li value={parseInt(numMatch[1])}>{renderInlineBold(numMatch[2])}</li>
                </ol>
              );
            }
            // Normal paragraph
            return line.trim() ? (
              <p key={lineIdx} className="text-xs text-gray-300 leading-relaxed">
                {renderInlineBold(line)}
              </p>
            ) : (
              <div key={lineIdx} className="h-1.5" />
            );
          })}
        </div>
      );
    });
  };

  const renderInlineBold = (line: string) => {
    // Process markdown double asterisks **bold**
    const parts = line.split("**");
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="text-white font-black underline decoration-indigo-500/40">{part}</strong>;
      }
      // Handle inline code format `code`
      const subParts = part.split("`");
      return subParts.map((subPart, si) => {
        if (si % 2 === 1) {
          return <code key={si} className="bg-white/10 px-1 py-0.5 rounded text-[11px] font-mono text-purple-300">{subPart}</code>;
        }
        return subPart;
      });
    });
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative group flex items-center justify-center p-4 rounded-full border shadow-2xl transition-all duration-300 focus:outline-none cursor-pointer ${
            isOpen
              ? "bg-red-500 hover:bg-red-600 border-red-400 text-white rotate-90"
              : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border-indigo-400 text-white shadow-indigo-500/20"
          }`}
          title="Talk to Astro AI"
          id="astro-ai-launcher"
        >
          {/* Pulsating outer orbit ring */}
          {!isOpen && (
            <span className="absolute -inset-1.5 rounded-full border border-indigo-500/30 animate-ping opacity-60" />
          )}
          
          {isOpen ? (
            <X className="w-6 h-6 transition-transform" />
          ) : (
            <div className="flex items-center space-x-1.5">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
              <span className="text-xs font-mono font-black uppercase tracking-wider hidden md:inline-block">Astro AI</span>
            </div>
          )}
        </button>
      </div>

      {/* Floating Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-24 right-4 left-4 sm:left-auto sm:right-6 w-auto sm:w-[350px] h-[460px] max-h-[70vh] bg-slate-950/95 border border-indigo-500/30 rounded-2xl shadow-2xl shadow-black/80 flex flex-col z-50 overflow-hidden backdrop-blur-md"
            id="astro-ai-panel"
          >
            {/* Celestial background graphic overlay inside panel */}
            <div className="absolute inset-0 pointer-events-none opacity-5 z-0 overflow-hidden">
              <svg viewBox="0 0 200 200" className="w-full h-full text-indigo-400">
                <circle cx="100" cy="100" r="70" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4,4" />
                <circle cx="100" cy="100" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" />
                <line x1="100" y1="10" x2="100" y2="190" stroke="currentColor" strokeWidth="0.25" />
                <line x1="10" y1="100" x2="190" y2="100" stroke="currentColor" strokeWidth="0.25" />
              </svg>
            </div>

            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900/90 to-purple-950/80 p-4 border-b border-indigo-500/20 flex items-center justify-between relative z-10">
              <div className="flex items-center space-x-3">
                <div className="bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight text-white flex items-center">
                    ASTRO AI <span className="ml-1.5 inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  </h3>
                  <p className="text-[10px] text-gray-400 font-mono">Astrological & Market Cycle Copilot</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white hover:bg-white/5 p-1.5 rounded transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs shadow-xl ${
                      m.role === "user"
                        ? "bg-indigo-600/90 border border-indigo-400/20 text-white rounded-br-none"
                        : "bg-slate-900/90 border border-white/5 text-gray-300 rounded-bl-none"
                    }`}
                  >
                    <div className="space-y-1">
                      {formatMessageText(m.content)}
                    </div>

                    {/* Citations / Grounding sources */}
                    {m.citations && m.citations.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-white/5 space-y-1">
                        <div className="text-[9px] font-mono text-gray-500 uppercase font-bold tracking-wider flex items-center">
                          <Search className="w-2.5 h-2.5 mr-1" /> Web Search Sources:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {m.citations.map((cite, cIdx) => (
                            <a
                              key={cIdx}
                              href={cite.uri}
                              target="_blank"
                              referrerPolicy="no-referrer"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-[9px] font-mono text-indigo-400 bg-indigo-950/40 hover:bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-500/20 max-w-[150px] truncate transition-colors"
                              title={cite.title}
                            >
                              <ExternalLink className="w-2 h-2 mr-1" />
                              {cite.title || "Source"}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fallback warning notice */}
                    {m.isFallback && (
                      <div className="mt-2 text-[9px] font-mono text-amber-400 bg-amber-950/30 px-2.5 py-1.5 rounded-lg border border-amber-500/20 flex items-start space-x-1.5 leading-relaxed">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1 shrink-0 animate-pulse" />
                        <span>{m.note || "Astro AI core network is currently rate-limited. Serving local astro telemetry."}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-900/90 border border-white/5 rounded-2xl p-3.5 text-xs text-gray-400 rounded-bl-none shadow-xl flex items-center space-x-2.5">
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                    <span className="font-mono text-[10px] text-gray-400">Consulting cosmic charts & search grounding...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts Chips */}
            {messages.length === 1 && !isLoading && (
              <div className="p-3 pt-0 border-t border-white/5 bg-slate-900/10 relative z-10">
                <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1.5 mt-2.5 font-bold">Suggested Galactic Inquiries:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {quickPrompts.map((qp, qidx) => (
                    <button
                      key={qidx}
                      onClick={() => handleSend(qp.text)}
                      className="text-left text-[9.5px] text-indigo-300 hover:text-white bg-indigo-950/20 hover:bg-indigo-950/50 p-1.5 rounded-lg border border-indigo-500/10 hover:border-indigo-500/30 transition-all cursor-pointer truncate"
                      title={qp.text}
                    >
                      {qp.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Footer */}
            <div className="p-3 bg-slate-900/80 border-t border-indigo-500/20 flex items-center space-x-2 relative z-10">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask anything about astro dates & market impacts..."
                className="flex-1 bg-black/40 border border-white/10 hover:border-white/20 focus:border-indigo-500 focus:outline-none p-2.5 rounded-xl text-xs text-white placeholder-gray-500 resize-none h-10 font-sans"
              />
              <button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                className={`p-2.5 rounded-xl text-white transition-all cursor-pointer ${
                  isLoading || !input.trim()
                    ? "bg-white/5 text-gray-500 border border-white/5 cursor-not-allowed"
                    : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border border-indigo-400"
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
