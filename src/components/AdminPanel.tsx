import React, { useState, useMemo } from "react";
import { Stock, PortfolioItem, PriceAlert, TradeRecord } from "../types";
import { 
  Wrench, 
  DollarSign, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Sparkles, 
  TrendingDown, 
  TrendingUp, 
  Activity, 
  Flame, 
  ShieldAlert, 
  Terminal, 
  Check, 
  FolderMinus, 
  Layers, 
  HelpCircle,
  Zap,
  RotateCcw
} from "lucide-react";
import { INITIAL_STOCKS } from "../initialData";

interface AdminPanelProps {
  stocks: Stock[];
  setStocks: React.Dispatch<React.SetStateAction<Stock[]>>;
  cash: number;
  setCash: React.Dispatch<React.SetStateAction<number>>;
  portfolio: PortfolioItem[];
  setPortfolio: React.Dispatch<React.SetStateAction<PortfolioItem[]>>;
  alerts: PriceAlert[];
  setAlerts: React.Dispatch<React.SetStateAction<PriceAlert[]>>;
  tradeHistory: TradeRecord[];
  setTradeHistory: React.Dispatch<React.SetStateAction<TradeRecord[]>>;
  logApiEvent: (
    method: 'GET' | 'POST' | 'WS_TICK',
    urlOrTopic: string,
    status: number | 'LIVE',
    action: string,
    payloadObj: any,
    explanation: string
  ) => void;
  onSelectStock?: (stock: Stock) => void;
}

export default function AdminPanel({
  stocks,
  setStocks,
  cash,
  setCash,
  portfolio,
  setPortfolio,
  alerts,
  setAlerts,
  tradeHistory,
  setTradeHistory,
  logApiEvent,
  onSelectStock
}: AdminPanelProps) {
  // New Ticker form state
  const [newSymbol, setNewSymbol] = useState<string>("");
  const [newName, setNewName] = useState<string>("");
  const [newPrice, setNewPrice] = useState<string>("");
  const [newSector, setNewSector] = useState<string>("Technology");
  const [newPeRatio, setNewPeRatio] = useState<string>("25.0");
  const [newMarketCap, setNewMarketCap] = useState<string>("100B");
  
  // Direct Cash override state
  const [cashOverride, setCashOverride] = useState<string>("");

  // Target price overrides
  const [priceOverrides, setPriceOverrides] = useState<Record<string, string>>({});

  // Feedback notifications
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const showFeedback = (success: boolean, msg: string) => {
    if (success) {
      setSuccessMsg(msg);
      setErrorMsg("");
      setTimeout(() => setSuccessMsg(""), 4000);
    } else {
      setErrorMsg(msg);
      setSuccessMsg("");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  // Helper to generate a baseline history array for new stocks
  const createHistoryPoints = (basePrice: number) => {
    const history = [];
    const now = new Date();
    for (let i = 30; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 5 * 60 * 1000);
      const wiggle = (Math.random() - 0.5) * (basePrice * 0.015);
      history.push({
        timestamp: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        price: parseFloat(Math.max(1.0, basePrice + wiggle).toFixed(2))
      });
    }
    return history;
  };

  // 1. ADD NEW TICKER
  const handleAddTicker = (e: React.FormEvent) => {
    e.preventDefault();
    const symbol = newSymbol.trim().toUpperCase();
    const name = newName.trim();
    const price = parseFloat(newPrice);

    if (!symbol || !name || isNaN(price) || price <= 0) {
      showFeedback(false, "Invalid Symbol, Name, or Price value. Price must be positive.");
      return;
    }

    if (stocks.some(s => s.symbol === symbol)) {
      showFeedback(false, `Ticker symbol ${symbol} already exists inside the active registry.`);
      return;
    }

    const newStock: Stock = {
      symbol,
      name,
      price,
      change: 0.00,
      changePercent: 0.00,
      high: price,
      low: price,
      open: price,
      volume: "1.2M",
      marketCap: newMarketCap.trim() || "50B",
      peRatio: newPeRatio.trim() || "20.0",
      history: createHistoryPoints(price),
      sector: newSector
    };

    setStocks(prev => [...prev, newStock]);
    
    // Log API Event
    logApiEvent(
      'POST',
      '/api/admin/tickers/register',
      201,
      `Registered Custom Equity Asset: ${symbol}`,
      newStock,
      `Administrator executed corporate registration for ${symbol} (${name}). State engine initialized baseline telemetry history and mounted pricing updates.`
    );

    // Clear form
    setNewSymbol("");
    setNewName("");
    setNewPrice("");
    showFeedback(true, `Successfully registered corporate asset ${symbol}!`);
  };

  // 2. REMOVE TICKER
  const handleRemoveTicker = (symbol: string) => {
    if (symbol === 'NVDA' || symbol === 'AAPL') {
      showFeedback(false, `Standard baseline benchmarks like ${symbol} cannot be excised to maintain core system integrity.`);
      return;
    }

    setStocks(prev => prev.filter(s => s.symbol !== symbol));
    
    logApiEvent(
      'POST',
      '/api/admin/tickers/excise',
      200,
      `Excised Asset Symbol: ${symbol}`,
      { symbol },
      `Administrator wiped stock registry entry for ${symbol}. Portfolio balances referencing this stock will remain locked until re-registered.`
    );

    showFeedback(true, `Excised corporate security ${symbol} from live feeds.`);
  };

  // 3. OVERRIDE TICKER PRICE
  const handlePriceOverride = (symbol: string) => {
    const rawVal = priceOverrides[symbol];
    const targetPrice = parseFloat(rawVal);
    if (isNaN(targetPrice) || targetPrice <= 0) {
      showFeedback(false, "Override price must be a valid positive decimal.");
      return;
    }

    setStocks(prev => prev.map(s => {
      if (s.symbol === symbol) {
        const change = parseFloat((targetPrice - s.open).toFixed(2));
        const changePercent = parseFloat(((change / s.open) * 100).toFixed(2));
        const newHistory = [
          ...s.history.slice(1),
          {
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            price: targetPrice
          }
        ];
        return {
          ...s,
          price: targetPrice,
          change,
          changePercent,
          high: Math.max(s.high, targetPrice),
          low: Math.min(s.low, targetPrice),
          history: newHistory
        };
      }
      return s;
    }));

    logApiEvent(
      'POST',
      `/api/admin/tickers/price-override`,
      200,
      `Admin Price Override: ${symbol} = $${targetPrice}`,
      { symbol, targetPrice },
      `Bypassed mock market liquidity engine to force-write price point of ${symbol} to $${targetPrice}. Dynamic evaluation alerts may trigger.`
    );

    // Clear specific input state
    setPriceOverrides(prev => ({ ...prev, [symbol]: "" }));
    showFeedback(true, `Updated ${symbol} price to $${targetPrice.toFixed(2)}`);
  };

  // 4. CASH MANAGEMENT
  const handleAdjustCash = (amount: number, isSet: boolean = false) => {
    setCash(prev => {
      const nextVal = isSet ? amount : prev + amount;
      const rounded = parseFloat(Math.max(0, nextVal).toFixed(2));

      logApiEvent(
        'POST',
        '/api/admin/liquidity/adjust',
        200,
        isSet ? `Override Cash Balance: $${rounded}` : `Adjusted Cash Liquidity: ${amount >= 0 ? '+' : ''}$${amount}`,
        { prevCash: prev, newCash: rounded, delta: isSet ? null : amount },
        `Liquidity parameters modified by administrator. Synchronized terminal holdings cached in local storage.`
      );

      return rounded;
    });

    showFeedback(true, isSet ? `Overrode cash to $${amount.toLocaleString()}` : `Cash adjusted successfully.`);
  };

  const handleCashOverrideSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(cashOverride);
    if (isNaN(val) || val < 0) {
      showFeedback(false, "Cash override must be a positive number.");
      return;
    }
    handleAdjustCash(val, true);
    setCashOverride("");
  };

  // 5. MACRO SCENARIO SIMULATIONS
  const triggerFlashCrash = () => {
    setStocks(prev => prev.map(s => {
      const dropPct = (Math.random() * 20 + 15) / 100; // 15% to 35% drop
      const newPrice = parseFloat(Math.max(1.0, s.price * (1 - dropPct)).toFixed(s.symbol.includes("BTC") ? 0 : 2));
      const change = parseFloat((newPrice - s.open).toFixed(2));
      const changePercent = parseFloat(((change / s.open) * 100).toFixed(2));
      return {
        ...s,
        price: newPrice,
        change,
        changePercent,
        low: Math.min(s.low, newPrice),
        history: [
          ...s.history.slice(1),
          {
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            price: newPrice
          }
        ]
      };
    }));

    logApiEvent(
      'WS_TICK',
      'ws://api.example.com/macro-shock',
      'LIVE',
      `🚨 MACRO EVENT: Flash Crash Simulated`,
      { event: "flash_crash", timestamp: new Date().toISOString() },
      `Macroeconomic shock wave! Administrator triggered a high-intensity Flash Crash. Simulated high-frequency algorithms cascade sell orders, slicing valuations globally by 15-35%. Target alert flags checked.`
    );

    showFeedback(true, "Macro Flash Crash executed! All stock tickers plunged.");
  };

  const triggerTechBoom = () => {
    setStocks(prev => prev.map(s => {
      if (s.sector !== 'Technology') return s;
      const spikePct = (Math.random() * 25 + 20) / 100; // 20% to 45% spike
      const newPrice = parseFloat((s.price * (1 + spikePct)).toFixed(2));
      const change = parseFloat((newPrice - s.open).toFixed(2));
      const changePercent = parseFloat(((change / s.open) * 100).toFixed(2));
      return {
        ...s,
        price: newPrice,
        change,
        changePercent,
        high: Math.max(s.high, newPrice),
        history: [
          ...s.history.slice(1),
          {
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            price: newPrice
          }
        ]
      };
    }));

    logApiEvent(
      'WS_TICK',
      'ws://api.example.com/macro-shock',
      'LIVE',
      `📈 MACRO EVENT: Hyper-Tech Rally Activated`,
      { event: "tech_boom", targetSector: "Technology", timestamp: new Date().toISOString() },
      `AI-investment sentiment frenzy! Tech listings spike between 20% and 45% under intense retail and institutional FOMO purchase triggers.`
    );

    showFeedback(true, "Macro Tech Boom simulated! High multipliers applied to technology listings.");
  };

  const triggerBlackSwan = () => {
    setStocks(prev => prev.map(s => {
      const isCryptoAdjacent = s.symbol === 'BTC-USD' || s.symbol === 'COIN' || s.sector === 'Cryptocurrency';
      const dropPct = isCryptoAdjacent ? 0.50 : 0.05; // Plunge crypto by 50%, others only 5%
      
      const newPrice = parseFloat(Math.max(1.0, s.price * (1 - dropPct)).toFixed(s.symbol.includes("BTC") ? 0 : 2));
      const change = parseFloat((newPrice - s.open).toFixed(2));
      const changePercent = parseFloat(((change / s.open) * 100).toFixed(2));
      return {
        ...s,
        price: newPrice,
        change,
        changePercent,
        low: Math.min(s.low, newPrice),
        history: [
          ...s.history.slice(1),
          {
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            price: newPrice
          }
        ]
      };
    }));

    logApiEvent(
      'WS_TICK',
      'ws://api.example.com/macro-shock',
      'LIVE',
      `🦅 BLACK SWAN: Sovereign Cryptographic Hack Plunge`,
      { event: "black_swan", scope: "Crypto Plunge", timestamp: new Date().toISOString() },
      `Systemic crisis event! A major cryptographic hack simulation is broadcasted. Sovereign crypto funds experience liquidation, instantly slicing crypto valuations by 50%.`
    );

    showFeedback(true, "Black Swan Event triggered! Cryptocurrencies and adjacent assets cut in half.");
  };

  const triggerCorporateBuyback = () => {
    setStocks(prev => prev.map(s => {
      const boostPct = (Math.random() * 7 + 8) / 100; // 8% to 15% spike
      const newPrice = parseFloat((s.price * (1 + boostPct)).toFixed(s.symbol.includes("BTC") ? 0 : 2));
      const change = parseFloat((newPrice - s.open).toFixed(2));
      const changePercent = parseFloat(((change / s.open) * 100).toFixed(2));
      return {
        ...s,
        price: newPrice,
        change,
        changePercent,
        high: Math.max(s.high, newPrice),
        history: [
          ...s.history.slice(1),
          {
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            price: newPrice
          }
        ]
      };
    }));

    logApiEvent(
      'WS_TICK',
      'ws://api.example.com/macro-shock',
      'LIVE',
      `💼 MACRO EVENT: Federal Capital Buyback Loop`,
      { event: "corporate_buyback", timestamp: new Date().toISOString() },
      `S&P cash reserves deploy. Corporations trigger extensive self-directed treasury buyback programs, raising floor valuations by 8-15% with optimized balance sheet leverage.`
    );

    showFeedback(true, "Simulated Corporate Buybacks! Universal upward pressure of 8-15% applied.");
  };

  // 6. STRESS-TEST TELEMETRY STREAM
  const generateStressTraffic = () => {
    showFeedback(true, "Spawning high-speed simulated API traffic in console logs...");
    
    const endpoints = [
      { method: 'GET' as const, url: '/api/v1/auth/session-token', text: 'Telemetry authentication handshake initialized' },
      { method: 'POST' as const, url: '/api/v1/trade/audit-ledger', text: 'Encrypted JSON transmission to compliance ledger' },
      { method: 'WS_TICK' as const, url: 'ws://stream.nasdaq.com/ticks', text: 'Push ticker frame packet [Size: 1.4KB, latency: 12ms]' },
      { method: 'GET' as const, url: '/api/v1/ai/sentiment/AAPL', text: 'Gemini cognitive transformer scoring pipeline executed' },
      { method: 'POST' as const, url: '/api/v1/portfolio/rebalance', text: 'Margin buffer calculated; auto-balancing ratios OK' },
    ];

    let count = 0;
    const interval = setInterval(() => {
      const actionIdx = count % endpoints.length;
      const actionObj = endpoints[actionIdx];
      
      logApiEvent(
        actionObj.method,
        actionObj.url,
        actionObj.method === 'WS_TICK' ? 'LIVE' : 200,
        `Stress Test packet ${count + 1}`,
        { packet_id: `stress-${count}-${Date.now()}`, buffer_state: "healthy", packet_size_bytes: 2048 },
        `[STRESS TELEMETRY ${count + 1}/10] ${actionObj.text}`
      );

      count++;
      if (count >= 10) {
        clearInterval(interval);
      }
    }, 150);
  };

  // 7. RESTORE STATE & RESET TO DEFAULTS
  const handleWipeAndReset = () => {
    if (!confirm("Are you sure you want to completely wipe all active custom listings, wipe the trade ledger, clear price alerts, and reset cash to $100,000? This cannot be undone.")) {
      return;
    }

    setStocks(INITIAL_STOCKS);
    setCash(100000.00);
    setPortfolio([
      { symbol: "AAPL", shares: 15, avgBuyPrice: 180.20 },
      { symbol: "NVDA", shares: 8, avgBuyPrice: 850.00 }
    ]);
    setAlerts([]);
    setTradeHistory([]);

    localStorage.removeItem("portfolio_holdings");
    localStorage.removeItem("portfolio_cash");
    localStorage.removeItem("price_alerts");
    localStorage.removeItem("trade_history");

    logApiEvent(
      'POST',
      '/api/admin/system/factory-reset',
      200,
      `🚨 SYSTEM RESET: Sandbox Restored to Defaults`,
      { state: "restored_to_defaults" },
      `System audit trail triggered factory reset. All active portfolio positions, alerts, custom tickers, and ledger histories cleared. Default 100K cash and benchmark Apple/NVIDIA positions re-seeded.`
    );

    showFeedback(true, "Terminal reset complete! Re-seeded standard parameters.");
  };

  return (
    <div id="admin-panel-main" className="grid grid-cols-1 md:grid-cols-12 gap-5">
      
      {/* Visual Header */}
      <div className="col-span-12 bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/15">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white uppercase font-mono tracking-wider">Simulated Administration Console</h2>
            <p className="text-xs text-zinc-400 font-sans mt-0.5">Control live asset tickers, override metrics, adjust capital streams, or simulate market shocks.</p>
          </div>
        </div>
        <span className="text-[10px] uppercase font-mono text-emerald-400 px-3 py-1 bg-emerald-500/5 rounded-full border border-emerald-500/10">
          Terminal Owner Privileges
        </span>
      </div>

      {/* Dynamic Feedback alerts */}
      {(successMsg || errorMsg) && (
        <div className="col-span-12">
          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-4 text-xs font-mono flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-4 text-xs font-mono flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      )}

      {/* LEFT COLUMN (7 COLS): Ticker Catalog, Price Overrides, Cash Control */}
      <div className="col-span-12 md:col-span-7 space-y-5">
        
        {/* Cash Liquidity Control Card */}
        <div className="bg-zinc-950/30 border border-zinc-850 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Dynamic Wallet Injector</h3>
          </div>
          <p className="text-xs text-zinc-500 font-sans">
            Adjust the client's current simulated liquid capital. Current wallet reserve: <span className="text-white font-bold font-mono">${cash.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => handleAdjustCash(10000)}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-emerald-400 border border-zinc-800 rounded-lg text-xs font-mono transition cursor-pointer"
            >
              + $10k Cash
            </button>
            <button
              onClick={() => handleAdjustCash(100000)}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-emerald-400 border border-zinc-800 rounded-lg text-xs font-mono transition cursor-pointer"
            >
              + $100k Cash
            </button>
            <button
              onClick={() => handleAdjustCash(-5000)}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-rose-400 border border-zinc-800 rounded-lg text-xs font-mono transition cursor-pointer"
            >
              - $5k Cash
            </button>
            <button
              onClick={() => handleAdjustCash(100000, true)}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 rounded-lg text-xs font-mono transition cursor-pointer"
            >
              Reset to $100k
            </button>
          </div>

          <form onSubmit={handleCashOverrideSubmit} className="flex gap-2 pt-2 border-t border-zinc-900">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-mono">$</span>
              <input
                type="number"
                placeholder="Enter exact override cash balance..."
                value={cashOverride}
                onChange={(e) => setCashOverride(e.target.value)}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl pl-8 pr-4 py-2 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-zinc-700 transition"
              />
            </div>
            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-4 rounded-xl text-xs font-mono transition cursor-pointer shrink-0"
            >
              Set Exact Balance
            </button>
          </form>
        </div>

        {/* Tickers List and Price Overrides */}
        <div className="bg-zinc-950/30 border border-zinc-850 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Active Corporate Registries</h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">{stocks.length} assets listed</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-500 text-[10px] uppercase tracking-wider">
                  <th className="pb-2.5">Security</th>
                  <th className="pb-2.5">Price</th>
                  <th className="pb-2.5">Override Market Value</th>
                  <th className="pb-2.5 text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {stocks.map((stock) => (
                  <tr key={stock.symbol} className="hover:bg-zinc-900/10 group">
                    <td className="py-2.5">
                      <span className="font-bold text-white block">{stock.symbol}</span>
                      <span className="text-[10px] text-zinc-500 block truncate max-w-[120px]">{stock.name}</span>
                    </td>
                    <td className="py-2.5 text-zinc-300">
                      ${stock.price.toFixed(2)}
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="0.00"
                          value={priceOverrides[stock.symbol] || ""}
                          onChange={(e) => setPriceOverrides({ ...priceOverrides, [stock.symbol]: e.target.value })}
                          className="w-20 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 font-mono"
                        />
                        <button
                          onClick={() => handlePriceOverride(stock.symbol)}
                          className="p-1 px-2 bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-zinc-800 rounded-lg text-[10px] font-bold transition cursor-pointer"
                        >
                          Write
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => handleRemoveTicker(stock.symbol)}
                        disabled={stock.symbol === 'AAPL' || stock.symbol === 'NVDA'}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title={stock.symbol === 'AAPL' || stock.symbol === 'NVDA' ? "Standard baseline benchmark" : "Delete security"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN (5 COLS): Add New Ticker form, Macro Event Shocks, factory Reset */}
      <div className="col-span-12 md:col-span-5 space-y-5">
        
        {/* Macro Simulator Panel */}
        <div className="bg-zinc-950/30 border border-zinc-850 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Macro Market Shock Engine</h3>
          </div>
          <p className="text-xs text-zinc-500 leading-normal">
            Inject immediate systemic capital fluctuations across the entire sandbox catalog. This evaluates real-time alert filters and user equity holdings instantly.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={triggerFlashCrash}
              className="p-3 bg-zinc-900 hover:bg-zinc-850 text-left border border-zinc-800 rounded-xl transition cursor-pointer flex flex-col justify-between h-24 relative overflow-hidden group"
            >
              <div className="flex justify-between items-start w-full">
                <span className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/15">
                  <TrendingDown className="w-3.5 h-3.5" />
                </span>
                <span className="text-[9px] font-mono text-zinc-600 group-hover:text-rose-400 transition">SYSTEMIC</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-white">Flash Crash</span>
                <span className="text-[9px] text-zinc-500 block mt-0.5">Plunge tickers 15% - 35%</span>
              </div>
            </button>

            <button
              onClick={triggerTechBoom}
              className="p-3 bg-zinc-900 hover:bg-zinc-850 text-left border border-zinc-800 rounded-xl transition cursor-pointer flex flex-col justify-between h-24 relative overflow-hidden group"
            >
              <div className="flex justify-between items-start w-full">
                <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/15">
                  <TrendingUp className="w-3.5 h-3.5" />
                </span>
                <span className="text-[9px] font-mono text-zinc-600 group-hover:text-emerald-400 transition">BULLISH</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-white">Tech Bubble Rally</span>
                <span className="text-[9px] text-zinc-500 block mt-0.5">Spike tech assets 20% - 45%</span>
              </div>
            </button>

            <button
              onClick={triggerBlackSwan}
              className="p-3 bg-zinc-900 hover:bg-zinc-850 text-left border border-zinc-800 rounded-xl transition cursor-pointer flex flex-col justify-between h-24 relative overflow-hidden group"
            >
              <div className="flex justify-between items-start w-full">
                <span className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/15">
                  <Flame className="w-3.5 h-3.5" />
                </span>
                <span className="text-[9px] font-mono text-zinc-600 group-hover:text-amber-400 transition">CRISIS</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-white">Black Swan Hack</span>
                <span className="text-[9px] text-zinc-500 block mt-0.5">Slice Crypto by 50%</span>
              </div>
            </button>

            <button
              onClick={triggerCorporateBuyback}
              className="p-3 bg-zinc-900 hover:bg-zinc-850 text-left border border-zinc-800 rounded-xl transition cursor-pointer flex flex-col justify-between h-24 relative overflow-hidden group"
            >
              <div className="flex justify-between items-start w-full">
                <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/15">
                  <Zap className="w-3.5 h-3.5" />
                </span>
                <span className="text-[9px] font-mono text-zinc-600 group-hover:text-emerald-400 transition">LEVERAGED</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-white">Share Buybacks</span>
                <span className="text-[9px] text-zinc-500 block mt-0.5">Elevate average floor 8% - 15%</span>
              </div>
            </button>
          </div>
        </div>

        {/* Corporate Asset Registration Form */}
        <div className="bg-zinc-950/30 border border-zinc-850 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Register Corporate Asset</h3>
          </div>

          <form onSubmit={handleAddTicker} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase font-mono">Ticker Symbol</label>
                <input
                  type="text"
                  placeholder="e.g. MSFT"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-zinc-700 transition"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase font-mono">Base Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="250.00"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-zinc-700 transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 uppercase font-mono">Company Name</label>
              <input
                type="text"
                placeholder="e.g. Microsoft Corporation"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase font-mono">Sector</label>
                <select
                  value={newSector}
                  onChange={(e) => setNewSector(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none cursor-pointer"
                >
                  <option value="Technology">Technology</option>
                  <option value="Automotive">Automotive</option>
                  <option value="Consumer Discretionary">Consumer Disc.</option>
                  <option value="Financial Services">Financial Serv.</option>
                  <option value="Cryptocurrency">Cryptocurrency</option>
                  <option value="Energy">Energy</option>
                  <option value="Healthcare">Healthcare</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase font-mono">Market Cap</label>
                <input
                  type="text"
                  placeholder="e.g. 1.25T"
                  value={newMarketCap}
                  onChange={(e) => setNewMarketCap(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-zinc-700 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-zinc-900 hover:bg-zinc-850 text-white font-bold py-2 px-3 rounded-xl text-xs font-mono border border-zinc-800 hover:border-zinc-700 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" /> Mount Corporate Security
            </button>
          </form>
        </div>

        {/* Load stress test logs / telemetry */}
        <div className="bg-zinc-950/30 border border-zinc-850 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Telemetry stress-testing</h3>
          </div>
          <p className="text-xs text-zinc-500 leading-normal">
            Simulate a spike in websocket events and JSON REST requests to stress-test the dynamic Live API traffic console.
          </p>
          <button
            onClick={generateStressTraffic}
            className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 rounded-xl border border-zinc-800 text-xs font-mono font-bold transition cursor-pointer"
          >
            Spike Telemetry Stream (10 Events)
          </button>
        </div>

        {/* Hard factory Reset Box */}
        <div className="bg-rose-950/5 border border-rose-500/10 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-rose-400" />
            <h3 className="text-xs font-bold text-rose-400 uppercase font-mono tracking-wider">Destructive Factory Settings</h3>
          </div>
          <p className="text-xs text-zinc-500 leading-normal">
            Erase all browser cached states (trade history ledger, customized ticker prices, targets, portfolio holdings) and restore the default starting sandbox state.
          </p>
          <button
            onClick={handleWipeAndReset}
            className="w-full py-2 bg-rose-900/10 hover:bg-rose-900/25 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-mono font-bold transition cursor-pointer"
          >
            Wipe Cache & Restore Initial State
          </button>
        </div>

      </div>

    </div>
  );
}
