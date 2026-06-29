import { useState } from "react";
import { Stock, AIAnalysis } from "../types";
import { Sparkles, Brain, AlertCircle, CheckCircle2, TrendingUp, Compass, HelpCircle } from "lucide-react";

interface AIAnalystProps {
  stock: Stock;
}

export default function AIAnalyst({ stock }: AIAnalystProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadingSteps = [
    "Spinning up Wall Street quantitative models...",
    "Crawling recent corporate filings and earning reports...",
    "Scanning global news flow & social sentiment feeds...",
    "Synthesizing technical breakout moving averages...",
    "Assembling structural recommendation matrix..."
  ];

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    setLoadingStep(0);

    // Dynamic loading text wiggles
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
    }, 1500);

    try {
      const response = await fetch("/api/stocks/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: stock.symbol,
          name: stock.name,
          price: stock.price,
          changePercent: stock.changePercent
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch report from server. Status: ${response.status}`);
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected communication error occurred.");
    } finally {
      clearInterval(interval);
      setIsLoading(false);
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating?.toUpperCase()) {
      case "BUY":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "SELL":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      default:
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    }
  };

  return (
    <div id="ai-analyst-root" className="bg-zinc-900/40 rounded-3xl border border-zinc-800 p-6 backdrop-blur-md flex flex-col min-h-[460px] relative overflow-hidden animate-fade-in">
      {/* Radiant Glow */}
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-emerald-500/3 rounded-full filter blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <h3 className="font-sans font-bold text-white text-base">Gemini AI Stock Analyst</h3>
        </div>
        <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-700/50">
          Powered by Gemini 3.5
        </span>
      </div>

      {/* Empty State */}
      {!isLoading && !analysis && !error && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 mb-4 animate-pulse">
            <Brain className="w-7 h-7 text-emerald-400" />
          </div>
          <h4 className="text-white font-semibold text-sm mb-1.5 font-display">Awaiting Financial Analysis</h4>
          <p className="text-zinc-400 text-xs max-w-sm leading-relaxed mb-6">
            Leverage advanced generative AI to analyze {stock.name}'s performance indicators, technical structure, macro sentiment, and growth drivers.
          </p>
          <button
            onClick={handleAnalyze}
            className="w-full max-w-xs py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs font-sans rounded-xl shadow-lg shadow-emerald-500/10 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-zinc-950" />
            Analyze {stock.symbol} Performance
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 my-auto">
          <div className="relative w-16 h-16 mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/10 border-t-emerald-400 animate-spin" />
            <div className="absolute inset-2 rounded-full border-4 border-zinc-500/5 border-b-zinc-400 animate-spin-reverse" />
          </div>
          <p className="text-white font-medium text-xs font-mono text-center">
            {loadingSteps[loadingStep]}
          </p>
          <p className="text-zinc-500 text-[10px] font-mono mt-2 animate-pulse">
            Analyst Engine processing (takes 3-5s)
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto">
          <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center border border-rose-500/20 mb-4">
            <AlertCircle className="w-6 h-6 text-rose-400" />
          </div>
          <h4 className="text-white font-semibold text-sm mb-1">Analysis Failed</h4>
          <p className="text-rose-400/80 text-xs max-w-xs mb-6">{error}</p>
          <button
            onClick={handleAnalyze}
            className="py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs rounded-xl border border-zinc-700 transition"
          >
            Retry Analysis
          </button>
        </div>
      )}

      {/* Report Dashboard */}
      {analysis && !isLoading && (
        <div className="flex-1 flex flex-col mt-4 gap-4 animate-fade-in">
          {/* Recommendation summary card */}
          <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold font-mono border px-3 py-1.5 rounded-lg tracking-wider ${getRatingColor(analysis.rating)}`}>
                {analysis.rating?.toUpperCase()}
              </span>
              <div>
                <h4 className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Wall Street Verdict</h4>
                <p className="text-zinc-200 text-xs font-sans mt-0.5 font-semibold">Consensus Recommendation</p>
              </div>
            </div>

            {/* Sentiment Score Needle Bar */}
            <div className="w-full sm:w-48">
              <div className="flex justify-between text-[9px] font-mono text-zinc-500 mb-1 uppercase tracking-wider">
                <span>Bearish</span>
                <span className="text-emerald-400 font-bold">{analysis.sentimentScore}/100</span>
                <span>Bullish</span>
              </div>
              <div className="h-2 w-full bg-zinc-855 rounded-full relative overflow-hidden border border-zinc-800">
                {/* Score Fill bar */}
                <div
                  className="h-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 rounded-full transition-all duration-1000"
                  style={{ width: `${analysis.sentimentScore}%` }}
                />
                {/* Pointer Indicator */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-md transform -translate-x-1/2 transition-all duration-1000"
                  style={{ left: `${analysis.sentimentScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div>
            <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5">Executive Thesis</h4>
            <p className="text-zinc-300 text-xs font-sans leading-relaxed bg-zinc-950/20 p-3 rounded-xl border border-zinc-800/40 italic">
              "{analysis.summary}"
            </p>
          </div>

          {/* Side by Side Pros & Cons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pros */}
            <div className="bg-emerald-950/10 p-3.5 rounded-2xl border border-emerald-950/30">
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">Bull catalysts (Pros)</span>
              </div>
              <ul className="space-y-2">
                {analysis.pros?.map((pro, index) => (
                  <li key={`pro-${index}`} className="text-zinc-300 text-xs font-sans leading-normal flex items-start gap-1.5">
                    <span className="text-emerald-400 font-mono mt-0.5">•</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cons */}
            <div className="bg-rose-955/10 p-3.5 rounded-2xl border border-rose-955/20">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-wider">Bear risks (Cons)</span>
              </div>
              <ul className="space-y-2">
                {analysis.cons?.map((con, index) => (
                  <li key={`con-${index}`} className="text-zinc-300 text-xs font-sans leading-normal flex items-start gap-1.5">
                    <span className="text-rose-400 font-mono mt-0.5">•</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Medium-term Drivers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Growth Vectors</h4>
              </div>
              <ul className="space-y-2">
                {analysis.growthDrivers?.map((driver, idx) => (
                  <li key={`driver-${idx}`} className="text-zinc-300 text-xs font-sans leading-relaxed flex items-start gap-1.5">
                    <span className="text-emerald-400 font-mono font-bold text-[10px] bg-emerald-500/10 px-1 rounded mt-0.5">{idx + 1}</span>
                    <span>{driver}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Technical analysis summary */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Compass className="w-3.5 h-3.5 text-emerald-450" />
                <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Technical Outlook</h4>
              </div>
              <p className="text-zinc-300 text-xs font-mono bg-zinc-950/30 p-3 rounded-xl border border-zinc-800/60 leading-relaxed">
                {analysis.technicalOutlook}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-2 border-t border-zinc-800/60">
            <button
              onClick={handleAnalyze}
              className="text-[10px] font-mono font-semibold text-zinc-500 hover:text-white flex items-center gap-1 transition cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-emerald-400" /> Re-Analyze Active Tickers
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
