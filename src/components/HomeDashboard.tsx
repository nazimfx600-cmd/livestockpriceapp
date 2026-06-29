import { useState, useEffect } from "react";
import { Stock, PortfolioItem, PriceAlert, ApiLogEntry, TradeRecord } from "../types";
import Sparkline from "./Sparkline";
import { motion } from "motion/react";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Bell, 
  Sparkles, 
  Terminal, 
  LifeBuoy, 
  ArrowRight, 
  Activity, 
  Layers, 
  Landmark, 
  LogIn, 
  User, 
  Calendar,
  DollarSign,
  TrendingUp as ProfitIcon
} from "lucide-react";
import { User as AuthUser } from "firebase/auth";

interface HomeDashboardProps {
  currentUser: AuthUser | null;
  portfolio: PortfolioItem[];
  cash: number;
  stocks: Stock[];
  alerts: PriceAlert[];
  logs: ApiLogEntry[];
  tradeHistory: TradeRecord[];
  onSelectStock: (stock: Stock) => void;
  setActiveTab: (tab: 'home' | 'trade' | 'wallet' | 'alerts' | 'performance' | 'ai' | 'console' | 'support' | 'account') => void;
  openAuthModal: () => void;
}

export default function HomeDashboard({
  currentUser,
  portfolio,
  cash,
  stocks,
  alerts,
  logs,
  tradeHistory,
  onSelectStock,
  setActiveTab,
  openAuthModal
}: HomeDashboardProps) {
  const [greeting, setGreeting] = useState<string>("Welcome back");

  useEffect(() => {
    const hours = new Date().getHours();
    if (hours < 12) setGreeting("Good morning");
    else if (hours < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  // Calculate high fidelity portfolio metrics
  const stocksValue = portfolio.reduce((sum, item) => {
    const stock = stocks.find((s) => s.symbol === item.symbol);
    return sum + (stock ? stock.price * item.shares : 0);
  }, 0);

  const totalValue = cash + stocksValue;
  const originalCost = portfolio.reduce((sum, item) => sum + (item.avgBuyPrice * item.shares), 0);
  const totalGainLoss = stocksValue - originalCost;
  const gainLossPercent = originalCost > 0 ? (totalGainLoss / originalCost) * 100 : 0;
  const isGain = totalGainLoss >= 0;

  // Grab active (untriggered) alerts
  const pendingAlerts = alerts.filter((a) => !a.isTriggered);

  // Grab the 3 most active stocks by price change percent
  const topMovers = [...stocks]
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 4);

  // Grab latest 3 logs for the real-time API logs flow
  const recentLogs = logs.slice(0, 3);

  return (
    <div id="home-dashboard-container" className="grid grid-cols-1 md:grid-cols-12 gap-5 w-full">
      
      {/* 1. WELCOME BANNER & STATS DECK */}
      <div id="home-welcome-card" className="col-span-12 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-emerald-950/20 border border-zinc-800/80 rounded-3xl p-6 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute inset-y-0 right-0 w-96 bg-[radial-gradient(circle_at_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono">
            <Calendar className="w-3.5 h-3.5" />
            <span>{new Date().toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-display">
            {greeting}, {currentUser ? (currentUser.displayName || currentUser.email?.split("@")[0] || "Trader") : "Guest Trader"}!
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl">
            Monitor real-time pricing ticks, run sandbox simulated trades, configure custom target alert triggers, or ask Gemini AI for strategic sentiment breakdowns.
          </p>
          
          {!currentUser && (
            <div className="pt-2 flex items-center gap-3">
              <span className="text-[11px] text-amber-400/90 font-mono bg-amber-500/5 border border-amber-500/10 px-2.5 py-1 rounded-lg">
                Guest Mode: Data clears with browser cache
              </span>
              <button
                onClick={openAuthModal}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition cursor-pointer"
              >
                Sync with Cloud Account <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-6 md:gap-8 z-10 border-t md:border-t-0 md:border-l border-zinc-800/80 pt-4 md:pt-0 md:pl-8 w-full md:w-auto">
          <div>
            <span className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider block">Portfolio Net Worth</span>
            <span className="text-2xl font-bold text-white tracking-tight mt-0.5 block">
              ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <div className={`flex items-center gap-1 mt-1 text-xs font-mono ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isGain ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>
                {isGain ? '+' : ''}${totalGainLoss.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({gainLossPercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. THREE-PANEL CORE OVERVIEW (Cash, Stocks, Performance) */}
      <div id="home-portfolio-summary-deck" className="col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Cash Balance Box */}
        <div id="home-cash-card" className="bg-zinc-950/50 hover:bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 transition flex flex-col justify-between group">
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/15">
              <Landmark className="w-4.5 h-4.5" />
            </div>
            <button
              onClick={() => setActiveTab('wallet')}
              className="text-[11px] font-mono text-zinc-500 hover:text-emerald-400 transition cursor-pointer flex items-center gap-0.5"
            >
              Add Cash <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
            </button>
          </div>
          <div className="mt-4">
            <span className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider block">Wallet Balance</span>
            <span className="text-xl font-bold text-white tracking-tight mt-0.5 block">
              ${cash.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-zinc-400 mt-1 block">
              Unallocated liquidity ready for orders
            </span>
          </div>
        </div>

        {/* Stock Valuation Box */}
        <div id="home-stocks-valuation-card" className="bg-zinc-950/50 hover:bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 transition flex flex-col justify-between group">
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/15">
              <Layers className="w-4.5 h-4.5" />
            </div>
            <button
              onClick={() => setActiveTab('trade')}
              className="text-[11px] font-mono text-zinc-500 hover:text-emerald-400 transition cursor-pointer flex items-center gap-0.5"
            >
              Trade Deck <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
            </button>
          </div>
          <div className="mt-4">
            <span className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider block">Asset Valuation</span>
            <span className="text-xl font-bold text-white tracking-tight mt-0.5 block">
              ${stocksValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-zinc-400 mt-1 block">
              Holding {portfolio.filter(p => p.shares > 0).length} unique corporate equities
            </span>
          </div>
        </div>

        {/* Activity & Health Box */}
        <div id="home-trades-metrics-card" className="bg-zinc-950/50 hover:bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 transition flex flex-col justify-between group">
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/15">
              <Activity className="w-4.5 h-4.5" />
            </div>
            <button
              onClick={() => setActiveTab('performance')}
              className="text-[11px] font-mono text-zinc-500 hover:text-emerald-400 transition cursor-pointer flex items-center gap-0.5"
            >
              Performance <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
            </button>
          </div>
          <div className="mt-4">
            <span className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider block">Simulated Trades</span>
            <span className="text-xl font-bold text-white tracking-tight mt-0.5 block">
              {tradeHistory.length} Orders Filled
            </span>
            <span className="text-[10px] text-zinc-400 mt-1 block">
              Active ledger trackable in the browser cache
            </span>
          </div>
        </div>
      </div>

      {/* 3. LIVE MARKET MOVERS (LEFT COLUMN - 7 COLS) */}
      <div id="home-market-movers-col" className="col-span-12 md:col-span-7 bg-zinc-950/30 border border-zinc-800/80 rounded-3xl p-5 space-y-4">
        <div className="flex justify-between items-center px-1">
          <div>
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">Top Ticker Movers</h3>
            <p className="text-[11px] text-zinc-500 font-sans mt-0.5">High volatility market listings based on latest ticker shifts.</p>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/5 rounded-full border border-emerald-500/10">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Live Feed
          </span>
        </div>

        <div className="space-y-3">
          {topMovers.map((stock) => {
            const up = stock.changePercent >= 0;
            return (
              <div 
                key={stock.symbol}
                id={`home-mover-${stock.symbol}`}
                onClick={() => onSelectStock(stock)}
                className="flex items-center justify-between p-3.5 bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/50 rounded-xl transition cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-zinc-950 rounded-lg flex items-center justify-center font-bold font-mono text-xs border border-zinc-850 text-white">
                    {stock.symbol}
                  </div>
                  <div>
                    <span className="block font-medium text-xs text-white leading-tight">{stock.name}</span>
                    <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">{stock.sector}</span>
                  </div>
                </div>

                {/* Trend sparkline */}
                <div className="hidden sm:block">
                  <Sparkline history={stock.history} changePercent={stock.changePercent} symbol={stock.symbol} />
                </div>

                <div className="text-right">
                  <span className="block font-bold text-xs text-white font-mono">${stock.price.toFixed(2)}</span>
                  <span className={`inline-flex items-center gap-0.5 text-[11px] font-mono font-bold mt-0.5 ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {up ? '+' : ''}{stock.changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 text-center">
          <button
            onClick={() => setActiveTab('trade')}
            className="text-[11px] font-mono text-zinc-400 hover:text-emerald-400 transition cursor-pointer inline-flex items-center gap-1.5"
          >
            Open Interactive Trade Deck to inspect all listings <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. ALERTS, AI & LIVE API LOGS DECK (RIGHT COLUMN - 5 COLS) */}
      <div id="home-side-analytics-col" className="col-span-12 md:col-span-5 space-y-4">
        
        {/* Gemini AI Snapshot Panel */}
        <div id="home-gemini-ai-card" className="bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900/50 border border-zinc-800/80 rounded-3xl p-5 space-y-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full filter blur-xl pointer-events-none" />
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/15">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Gemini Stock Intelligence</h3>
            </div>
            <button
              onClick={() => setActiveTab('ai')}
              className="text-[11px] font-mono text-zinc-500 hover:text-emerald-400 cursor-pointer"
            >
              Analyze <ArrowRight className="w-3 h-3 inline ml-0.5" />
            </button>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Generate state-of-the-art AI-driven sentiment analysis on core assets. Understand key bullish growth drivers, downside concerns, and tech outlooks based on real-time tickers.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono">
            <button 
              onClick={() => {
                const stockObj = stocks.find(s => s.symbol === 'NVDA');
                if (stockObj) onSelectStock(stockObj);
                setActiveTab('ai');
              }}
              className="py-2 px-3 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 rounded-xl border border-zinc-800/80 transition cursor-pointer text-left"
            >
              <span className="block text-emerald-400 font-bold">NVDA Report</span>
              <span className="text-[9px] text-zinc-500 block mt-0.5">Semiconductor leader</span>
            </button>
            <button 
              onClick={() => {
                const stockObj = stocks.find(s => s.symbol === 'AAPL');
                if (stockObj) onSelectStock(stockObj);
                setActiveTab('ai');
              }}
              className="py-2 px-3 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 rounded-xl border border-zinc-800/80 transition cursor-pointer text-left"
            >
              <span className="block text-emerald-400 font-bold">AAPL Report</span>
              <span className="text-[9px] text-zinc-500 block mt-0.5">Consumer tech metrics</span>
            </button>
          </div>
        </div>

        {/* Price Alerts Preview Panel */}
        <div id="home-alerts-status-card" className="bg-zinc-950/30 border border-zinc-800/80 rounded-3xl p-5 space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/15">
                <Bell className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Active Target Alerts</h3>
            </div>
            <button
              onClick={() => setActiveTab('alerts')}
              className="text-[11px] font-mono text-zinc-500 hover:text-emerald-400 cursor-pointer flex items-center gap-0.5"
            >
              Setup <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {pendingAlerts.length === 0 ? (
            <div className="p-4 bg-zinc-900/20 border border-zinc-900/40 rounded-xl text-center">
              <p className="text-xs text-zinc-500">No active alerts set up.</p>
              <button
                onClick={() => setActiveTab('alerts')}
                className="text-[10px] text-emerald-400/90 font-mono font-bold mt-1 hover:underline cursor-pointer"
              >
                + Define alert threshold
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingAlerts.slice(0, 3).map((alert) => {
                const stock = stocks.find(s => s.symbol === alert.symbol);
                const currentPrice = stock ? stock.price : 0;
                return (
                  <div key={alert.id} className="flex items-center justify-between p-2.5 bg-zinc-900/30 border border-zinc-850 rounded-xl text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-zinc-900 text-white font-bold rounded text-[10px]">
                        {alert.symbol}
                      </span>
                      <span className="text-zinc-400">
                        {alert.type === 'above' ? '≥' : '≤'} ${alert.priceThreshold.toFixed(2)}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500">
                      Now: ${currentPrice.toFixed(2)}
                    </span>
                  </div>
                );
              })}
              {pendingAlerts.length > 3 && (
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 font-mono">
                    + {pendingAlerts.length - 3} more pending alerts
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* API Live Log Traffic Panel */}
        <div id="home-api-ticker-card" className="bg-zinc-950/30 border border-zinc-800/80 rounded-3xl p-5 space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/15">
                <Terminal className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Live API Traffic Stream</h3>
            </div>
            <button
              onClick={() => setActiveTab('console')}
              className="text-[11px] font-mono text-zinc-500 hover:text-emerald-400 cursor-pointer"
            >
              Console <ArrowRight className="w-3 h-3 inline" />
            </button>
          </div>

          {recentLogs.length === 0 ? (
            <div className="p-4 bg-zinc-900/20 border border-zinc-900/40 rounded-xl text-center">
              <p className="text-[10px] text-zinc-500 font-mono">Stream idle. Pricing updates write log events dynamically.</p>
            </div>
          ) : (
            <div className="space-y-2 font-mono text-[10px]">
              {recentLogs.map((log) => {
                const isGet = log.method === 'GET';
                const isPost = log.method === 'POST';
                const isWs = log.method === 'WS_TICK';
                
                let methodColor = 'text-sky-400';
                if (isPost) methodColor = 'text-emerald-400';
                if (isWs) methodColor = 'text-purple-400 animate-pulse';

                return (
                  <div key={log.id} className="p-2 bg-zinc-900/50 border border-zinc-850 rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`font-bold ${methodColor}`}>{log.method}</span>
                      <span className="text-zinc-600">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-zinc-300 truncate font-sans text-[11px]">{log.explanation}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* 5. DYNAMIC SHORTCUT ACTIONS RAIL */}
      <div id="home-shortcuts-rail" className="col-span-12 border-t border-zinc-800/80 pt-5 mt-1 flex flex-wrap gap-3 items-center justify-between">
        <span className="text-xs font-mono text-zinc-500">Quick Portal Routing Shortcuts:</span>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setActiveTab('support')}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 hover:text-emerald-400 text-zinc-400 rounded-xl border border-zinc-800/80 text-xs font-mono transition cursor-pointer flex items-center gap-1.5"
          >
            <LifeBuoy className="w-3.5 h-3.5" /> Contact Support Center
          </button>
          <button 
            onClick={() => setActiveTab('wallet')}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 hover:text-emerald-400 text-zinc-400 rounded-xl border border-zinc-800/80 text-xs font-mono transition cursor-pointer flex items-center gap-1.5"
          >
            <Wallet className="w-3.5 h-3.5" /> Money Wallet Drawer
          </button>
          <button 
            onClick={() => setActiveTab('alerts')}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 hover:text-emerald-400 text-zinc-400 rounded-xl border border-zinc-800/80 text-xs font-mono transition cursor-pointer flex items-center gap-1.5"
          >
            <Bell className="w-3.5 h-3.5" /> Price Alert Triggers
          </button>
        </div>
      </div>

    </div>
  );
}
