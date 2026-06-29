import { useState, useEffect } from "react";
import { Stock } from "../types";
import { 
  Newspaper, 
  RefreshCw, 
  ExternalLink, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Sparkles,
  Info,
  Globe
} from "lucide-react";
import { motion } from "motion/react";

interface NewsItem {
  title: string;
  source: string;
  time: string;
  summary: string;
  url: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

interface MarketNewsProps {
  stock: Stock;
  onLogApiEvent?: (
    method: 'GET' | 'POST' | 'WS_TICK',
    urlOrTopic: string,
    status: number | 'LIVE',
    action: string,
    payloadObj: any,
    explanation: string
  ) => void;
}

export default function MarketNews({ stock, onLogApiEvent }: MarketNewsProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchSource, setFetchSource] = useState<string>("local");

  const fetchNews = async (forceLog = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const startTime = Date.now();
      const response = await fetch(`/api/news?symbol=${stock.symbol}&name=${encodeURIComponent(stock.name)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load news. Status: ${response.status}`);
      }

      const data = await response.json();
      setNews(data.news || []);
      setFetchSource(data.source || "unknown");

      // Log the API console event
      if (onLogApiEvent) {
        const duration = Date.now() - startTime;
        onLogApiEvent(
          'GET',
          `/api/news?symbol=${stock.symbol}`,
          response.status,
          `Fetch relevant news for ${stock.symbol}`,
          { 
            symbol: stock.symbol, 
            companyName: stock.name,
            durationMs: duration,
            source: data.source,
            itemsCount: data.news?.length || 0
          },
          data.source === "gemini-search-grounding"
            ? `Live real-time financial news compilation powered by Gemini Search Grounding. The model dynamically queried Google Search for news about ${stock.name} from the past 7 days, structured the raw search index down into standard JSON, and provided active attribution citations.`
            : `Fell back to standard financial syndication feed for quote ticker ${stock.symbol}. The server compiled the raw XML stream on-the-fly and parsed the relevant headers, descriptions, and publish timestamps using lightweight expression mapping.`
        );
      }
    } catch (err: any) {
      console.error("Error loading news:", err);
      setError(err.message || "An unexpected error occurred while compiling news feed.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [stock.symbol]);

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case "bullish":
        return (
          <span className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            <TrendingUp className="w-2.5 h-2.5" /> Bullish
          </span>
        );
      case "bearish":
        return (
          <span className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full">
            <TrendingDown className="w-2.5 h-2.5" /> Bearish
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase bg-zinc-800 text-zinc-400 border border-zinc-700/50 px-2 py-0.5 rounded-full">
            <Minus className="w-2.5 h-2.5" /> Neutral
          </span>
        );
    }
  };

  const getSourceBadge = () => {
    switch (fetchSource) {
      case "gemini-search-grounding":
        return (
          <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-2 py-0.5 rounded-full">
            <Sparkles className="w-2.5 h-2.5 text-emerald-400" /> Grounded AI Feed
          </span>
        );
      case "yahoo-rss":
        return (
          <span className="flex items-center gap-1 text-[9px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded-full">
            <Globe className="w-2.5 h-2.5" /> Live Yahoo RSS
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[9px] font-mono text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded-full">
            <Info className="w-2.5 h-2.5" /> Sandbox Simulation
          </span>
        );
    }
  };

  return (
    <div id="market-news-panel" className="w-full flex flex-col bg-zinc-900/40 rounded-3xl border border-zinc-800/80 p-5 backdrop-blur-md relative overflow-hidden h-full">
      {/* Radiant Glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/3 rounded-full filter blur-[50px] pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center pb-3 border-b border-zinc-800/60 mb-4 gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Newspaper className="w-4 h-4" />
          </span>
          <div>
            <h3 className="font-sans font-bold text-white text-sm">Real-time Ticker News</h3>
            <p className="text-[10px] text-zinc-400 font-sans mt-0.5">Live press flow for {stock.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {getSourceBadge()}
          <button
            onClick={() => fetchNews(true)}
            disabled={isLoading}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition disabled:opacity-50 cursor-pointer border border-zinc-800/50 hover:border-zinc-700/50"
            title="Refresh News Feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="p-3 bg-zinc-900/20 border border-zinc-850/40 rounded-2xl animate-pulse flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <div className="h-3 w-20 bg-zinc-800 rounded-md" />
                <div className="h-3 w-12 bg-zinc-800 rounded-md" />
              </div>
              <div className="h-4 w-4/5 bg-zinc-800 rounded-md" />
              <div className="h-3 w-full bg-zinc-800 rounded-md" />
            </div>
          ))}
        </div>
      )}

      {/* Error View */}
      {error && !isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center px-4">
          <Info className="w-8 h-8 text-rose-400/80 mb-2" />
          <h4 className="text-zinc-200 text-xs font-bold font-sans">Failed to Fetch Live News</h4>
          <p className="text-zinc-400 text-[11px] font-sans mt-1 max-w-xs">{error}</p>
          <button
            onClick={() => fetchNews(true)}
            className="mt-3 px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 rounded-xl text-xs font-sans text-zinc-300 transition"
          >
            Retry Fetch
          </button>
        </div>
      )}

      {/* News Content */}
      {!isLoading && !error && (
        <div className="flex-1 flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
          {news.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-zinc-500 font-sans">
              <Newspaper className="w-8 h-8 opacity-20 mb-2" />
              <p className="text-xs">No active headlines on corporate wire</p>
              <p className="text-[10px] mt-0.5 text-zinc-600">Please check back during next trading interval</p>
            </div>
          ) : (
            news.map((item, index) => (
              <motion.a
                key={`news-item-${index}`}
                href={item.url}
                target="_blank"
                referrerPolicy="no-referrer"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: index * 0.04 }}
                className="group p-3 bg-zinc-900/20 hover:bg-zinc-850/30 border border-zinc-850/45 hover:border-zinc-800 rounded-2xl transition duration-150 flex flex-col justify-between"
              >
                <div>
                  {/* Article Source, Time & Sentiment */}
                  <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
                      <span className="font-bold text-zinc-400 group-hover:text-emerald-400 transition">
                        {item.source}
                      </span>
                      <span>•</span>
                      <span>{item.time}</span>
                    </div>
                    {getSentimentBadge(item.sentiment)}
                  </div>

                  {/* Title */}
                  <h4 className="text-xs font-bold text-zinc-200 group-hover:text-white leading-snug font-sans group-hover:underline underline-offset-2 transition-all line-clamp-2">
                    {item.title}
                  </h4>

                  {/* Summary Description */}
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed font-sans line-clamp-2">
                    {item.summary}
                  </p>
                </div>

                <div className="flex justify-end items-center mt-2 pt-2 border-t border-zinc-900/50 opacity-0 group-hover:opacity-100 transition duration-150 text-[10px] font-mono text-emerald-400 gap-1">
                  <span>View Article</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
              </motion.a>
            ))
          )}
        </div>
      )}
    </div>
  );
}
