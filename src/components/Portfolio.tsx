import { useState, useEffect } from "react";
import { Stock, PortfolioItem, TradeRecord } from "../types";
import Sparkline from "./Sparkline";
import { 
  Wallet, 
  Landmark, 
  TrendingUp, 
  DollarSign, 
  Plus, 
  Minus, 
  ArrowUpRight, 
  ArrowDownRight,
  Scale,
  Sliders,
  Percent,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Info,
  Calendar,
  Activity,
  ArrowUpDown,
  Download
} from "lucide-react";

interface PortfolioProps {
  portfolio: PortfolioItem[];
  cash: number;
  selectedStock: Stock;
  stocks: Stock[];
  onBuy: (symbol: string, shares: number, price: number) => void;
  onSell: (symbol: string, shares: number, price: number) => void;
  onExecuteRebalance?: (trades: { symbol: string, type: 'BUY' | 'SELL', shares: number, price: number }[]) => void;
  tradeHistory?: TradeRecord[];
}

export default function Portfolio({
  portfolio,
  cash,
  selectedStock,
  stocks,
  onBuy,
  onSell,
  onExecuteRebalance,
  tradeHistory = []
}: PortfolioProps) {
  const [tradeShares, setTradeShares] = useState<number>(10);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'positions' | 'rebalance' | 'history'>('positions');
  const [historyFilter, setHistoryFilter] = useState<'selected' | 'all'>('selected');

  // Trade History metrics calculations for selectedStock
  const stockTrades = tradeHistory.filter((t) => t.symbol === selectedStock.symbol);
  
  // Realized gains FIFO/avg-cost logic
  const getHistoryMetrics = (trades: TradeRecord[], symbol: string) => {
    const sortedTrades = [...trades]
      .filter((t) => t.symbol === symbol)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let shares = 0;
    let avgBuyPrice = 0;
    let realizedGains = 0;
    let totalInvested = 0;
    let buyCount = 0;
    let sellCount = 0;

    sortedTrades.forEach((trade) => {
      if (trade.type === 'BUY') {
        buyCount++;
        totalInvested += trade.total;
        const newShares = shares + trade.shares;
        if (newShares > 0) {
          avgBuyPrice = ((avgBuyPrice * shares) + (trade.price * trade.shares)) / newShares;
        }
        shares = newShares;
      } else if (trade.type === 'SELL') {
        sellCount++;
        const gain = trade.shares * (trade.price - avgBuyPrice);
        realizedGains += gain;
        shares = Math.max(0, shares - trade.shares);
        if (shares === 0) {
          avgBuyPrice = 0;
        }
      }
    });

    return {
      totalInvested,
      realizedGains,
      tradeCount: sortedTrades.length,
      buyCount,
      sellCount
    };
  };

  const metrics = getHistoryMetrics(tradeHistory, selectedStock.symbol);
  const displayedTrades = historyFilter === 'selected' ? stockTrades : tradeHistory;

  const downloadHoldingsCSV = () => {
    const headers = ["Symbol", "Shares Owned", "Average Buy Price ($)", "Current Price ($)", "Market Value ($)", "Profit/Loss ($)", "Profit/Loss (%)"];
    const rows = portfolio.map((item) => {
      const stock = stocks.find((s) => s.symbol === item.symbol);
      const currentPrice = stock ? stock.price : item.avgBuyPrice;
      const totalValue = item.shares * currentPrice;
      const costBasis = item.shares * item.avgBuyPrice;
      const pnl = totalValue - costBasis;
      const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
      return [
        item.symbol,
        item.shares,
        item.avgBuyPrice.toFixed(2),
        currentPrice.toFixed(2),
        totalValue.toFixed(2),
        pnl.toFixed(2),
        pnlPercent.toFixed(2)
      ];
    });

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `portfolio_holdings_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadTradeHistoryCSV = () => {
    const headers = ["Date & Time", "Symbol", "Type", "Shares", "Execution Price ($)", "Total Amount ($)"];
    const rows = tradeHistory.map((trade) => {
      const date = new Date(trade.timestamp);
      const formattedDate = date.toISOString().replace('T', ' ').substring(0, 19);
      return [
        `"${formattedDate}"`,
        trade.symbol,
        trade.type,
        trade.shares,
        trade.price.toFixed(2),
        trade.total.toFixed(2)
      ];
    });

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `trade_history_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Rebalance targets
  const [targetAllocations, setTargetAllocations] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem("portfolio_targets");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  // Sync held symbols with targets
  useEffect(() => {
    const updatedTargets = { ...targetAllocations };
    let hasChanges = false;

    portfolio.forEach((item) => {
      if (updatedTargets[item.symbol] === undefined) {
        updatedTargets[item.symbol] = 0;
        hasChanges = true;
      }
    });

    // Remove old held symbols no longer in portfolio
    Object.keys(updatedTargets).forEach((symbol) => {
      if (!portfolio.some(item => item.symbol === symbol)) {
        delete updatedTargets[symbol];
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setTargetAllocations(updatedTargets);
    }
  }, [portfolio]);

  const handleSaveTargets = (newTargets: Record<string, number>) => {
    setTargetAllocations(newTargets);
    try {
      localStorage.setItem("portfolio_targets", JSON.stringify(newTargets));
    } catch {}
  };

  const handleDistributeEqually = () => {
    if (portfolio.length === 0) return;
    const equalShare = parseFloat((100 / portfolio.length).toFixed(1));
    const newTargets: Record<string, number> = {};
    portfolio.forEach((item) => {
      newTargets[item.symbol] = equalShare;
    });
    handleSaveTargets(newTargets);
  };

  // Calculate current value of all holdings
  const holdingsValue = portfolio.reduce((total, item) => {
    const stock = stocks.find((s) => s.symbol === item.symbol);
    const currentPrice = stock ? stock.price : item.avgBuyPrice;
    return total + currentPrice * item.shares;
  }, 0);

  const totalPortfolioValue = cash + holdingsValue;

  // Rebalance calculations
  const totalTargetAllocated = (Object.values(targetAllocations) as number[]).reduce((sum, val) => sum + val, 0);
  const remainingCashTarget = Math.max(0, 100 - totalTargetAllocated);

  const rebalanceTrades = portfolio.map((item) => {
    const stock = stocks.find((s) => s.symbol === item.symbol);
    const currentPrice = stock ? stock.price : item.avgBuyPrice;
    const currentValue = currentPrice * item.shares;
    
    const targetWeight = targetAllocations[item.symbol] ?? 0;
    const targetValue = totalPortfolioValue * (targetWeight / 100);
    const diffValue = targetValue - currentValue;

    let type: 'BUY' | 'SELL' | 'NONE' = 'NONE';
    let sharesToTrade = 0;
    let costOrRevenue = 0;

    if (diffValue > 0) {
      sharesToTrade = Math.floor(diffValue / currentPrice);
      if (sharesToTrade > 0) {
        type = 'BUY';
        costOrRevenue = sharesToTrade * currentPrice;
      }
    } else if (diffValue < 0) {
      sharesToTrade = Math.floor(Math.abs(diffValue) / currentPrice);
      if (sharesToTrade > 0) {
        type = 'SELL';
        costOrRevenue = sharesToTrade * currentPrice;
      }
    }

    return {
      symbol: item.symbol,
      companyName: stock?.name || "Held Security",
      currentPrice,
      currentValue,
      currentWeight: totalPortfolioValue > 0 ? (currentValue / totalPortfolioValue) * 100 : 0,
      targetWeight,
      targetValue,
      diffValue,
      sharesToTrade,
      type,
      costOrRevenue
    };
  });

  const totalSellsRevenue = rebalanceTrades.filter(t => t.type === 'SELL').reduce((sum, t) => sum + t.costOrRevenue, 0);
  const totalBuysCost = rebalanceTrades.filter(t => t.type === 'BUY').reduce((sum, t) => sum + t.costOrRevenue, 0);
  const projectedCash = cash + totalSellsRevenue - totalBuysCost;
  const isRebalanceExecutable = projectedCash >= 0 && rebalanceTrades.some(t => t.type !== 'NONE') && totalTargetAllocated <= 100;

  const handleExecuteRebalancePlan = () => {
    if (!onExecuteRebalance) return;
    const trades = rebalanceTrades
      .filter(t => t.type !== 'NONE')
      .map(t => ({
        symbol: t.symbol,
        type: t.type as 'BUY' | 'SELL',
        shares: t.sharesToTrade,
        price: t.currentPrice
      }));

    if (trades.length === 0) return;
    onExecuteRebalance(trades);
    setTradeSuccess(`Executed rebalancing plan: ${trades.length} trades processed successfully.`);
    setTimeout(() => setTradeSuccess(null), 4000);
  };

  const activePosition = portfolio.find((item) => item.symbol === selectedStock.symbol);
  const sharesHeld = activePosition ? activePosition.shares : 0;

  const startingCapital = 100000; // $100,000 starting cash
  const allTimeProfit = totalPortfolioValue - startingCapital;
  const allTimeProfitPercent = (allTimeProfit / startingCapital) * 100;

  // Order Calculations
  const totalCost = tradeShares * selectedStock.price;

  const handleBuyOrder = () => {
    setTradeError(null);
    setTradeSuccess(null);

    if (tradeShares <= 0 || isNaN(tradeShares)) {
      setTradeError("Please specify a valid quantity of shares.");
      return;
    }

    if (totalCost > cash) {
      setTradeError(`Insufficient cash. Buying ${tradeShares} shares costs $${totalCost.toFixed(2)} but you only have $${cash.toFixed(2)}.`);
      return;
    }

    onBuy(selectedStock.symbol, tradeShares, selectedStock.price);
    setTradeSuccess(`Executed BUY order: ${tradeShares} shares of ${selectedStock.symbol} at $${selectedStock.price.toFixed(2)}.`);
    setTimeout(() => setTradeSuccess(null), 3000);
  };

  const handleSellOrder = () => {
    setTradeError(null);
    setTradeSuccess(null);

    if (tradeShares <= 0 || isNaN(tradeShares)) {
      setTradeError("Please specify a valid quantity of shares.");
      return;
    }

    if (tradeShares > sharesHeld) {
      setTradeError(`Insufficient holdings. You own ${sharesHeld} shares of ${selectedStock.symbol} but requested to sell ${tradeShares}.`);
      return;
    }

    onSell(selectedStock.symbol, tradeShares, selectedStock.price);
    setTradeSuccess(`Executed SELL order: ${tradeShares} shares of ${selectedStock.symbol} at $${selectedStock.price.toFixed(2)}.`);
    setTimeout(() => setTradeSuccess(null), 3000);
  };

  return (
    <div id="portfolio-root" className="bg-zinc-900/40 rounded-3xl border border-zinc-800 p-6 backdrop-blur-md flex flex-col gap-5 relative overflow-hidden">
      {/* Background visual */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full filter blur-[50px] pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center pb-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-emerald-400" />
          <h3 className="font-sans font-bold text-white text-base">Local Trade Deck</h3>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
          <Landmark className="w-3.5 h-3.5 text-zinc-500" />
          <span>Starting: $100K</span>
        </div>
      </div>

      {/* Ledger Values Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
        {/* Net Asset Value */}
        <div className="bg-emerald-500 text-emerald-950 border border-emerald-400 rounded-2xl p-4 flex flex-col justify-between shadow-lg shadow-emerald-500/10">
          <span className="block text-[10px] uppercase font-extrabold tracking-wider opacity-80">My Portfolio (NAV)</span>
          <span className="text-2xl font-display font-black tracking-tight mt-2 block">${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="text-[10px] font-bold opacity-85 mt-2 flex items-center gap-0.5">
            {allTimeProfit >= 0 ? "▲" : "▼"} {allTimeProfitPercent.toFixed(2)}% total gain
          </span>
        </div>

        {/* Free Cash Balance */}
        <div className="bg-zinc-950/40 p-4 rounded-2xl border border-zinc-800/60 flex flex-col justify-between">
          <span className="block text-[9px] uppercase text-zinc-500 tracking-wider">Available Cash</span>
          <span className="text-xl font-bold text-zinc-200 mt-2 block">${cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="text-[10px] text-zinc-500 mt-2 block">Paper Trading Assets</span>
        </div>

        {/* Portfolio Value */}
        <div className="bg-zinc-950/40 p-4 rounded-2xl border border-zinc-800/60 flex flex-col justify-between">
          <span className="block text-[9px] uppercase text-zinc-500 tracking-wider">Securities Value</span>
          <span className="text-xl font-bold text-zinc-200 mt-2 block">${holdingsValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="text-[10px] text-zinc-500 mt-2 block">{portfolio.length} Invested Tickers</span>
        </div>
      </div>

      {/* Placing Orders section */}
      <div className="bg-zinc-900/60 rounded-2xl p-4 border border-zinc-800/60 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Order specs */}
        <div className="w-full md:w-auto">
          <div className="flex items-center gap-1 mb-1.5">
            <span className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider">Order Target:</span>
            <span className="text-xs font-bold text-white font-mono px-1.5 py-0.5 bg-zinc-800 rounded">{selectedStock.symbol}</span>
            <span className="text-xs text-zinc-400 truncate max-w-[150px]">(${selectedStock.price.toFixed(2)})</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-zinc-950 rounded-xl border border-zinc-800 p-0.5">
              <button
                onClick={() => setTradeShares((prev) => Math.max(1, prev - 5))}
                className="p-1.5 hover:text-white text-zinc-500 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <input
                type="number"
                value={tradeShares}
                onChange={(e) => setTradeShares(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-14 bg-transparent border-none text-center font-mono text-xs text-white focus:outline-none"
              />
              <button
                onClick={() => setTradeShares((prev) => prev + 5)}
                className="p-1.5 hover:text-white text-zinc-500 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="font-mono text-xs">
              <span className="text-zinc-500 text-[10px] block uppercase tracking-wider">Estimated Total</span>
              <span className="text-sm font-bold text-white mt-0.5 block">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Trade Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleBuyOrder}
            className="flex-1 md:flex-none py-2.5 px-6 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold rounded-xl font-sans transition cursor-pointer active:scale-[0.98]"
          >
            Place BUY Order
          </button>
          <button
            onClick={handleSellOrder}
            className="flex-1 md:flex-none py-2.5 px-6 bg-zinc-800 hover:bg-zinc-700 text-rose-400 hover:text-rose-300 border border-zinc-700 rounded-xl text-xs font-bold font-sans transition cursor-pointer active:scale-[0.98]"
          >
            Place SELL Order
          </button>
        </div>
      </div>

      {/* Messaging feeds */}
      {tradeError && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3.5 text-xs text-rose-400 font-sans flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
          <span>{tradeError}</span>
        </div>
      )}
      {tradeSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3.5 text-xs text-emerald-400 font-sans flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>{tradeSuccess}</span>
        </div>
      )}

      {/* Tabbed Section: Positions Ledger & Rebalancer Engine */}
      <div className="flex-1 mt-4">
        {/* Sub-tabs Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 gap-3 text-xs font-mono mb-4 pb-1 sm:pb-0">
          <div className="flex gap-5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveSubTab('positions')}
              className={`pb-2.5 font-bold transition flex items-center gap-1.5 relative cursor-pointer whitespace-nowrap ${
                activeSubTab === 'positions' ? "text-emerald-400 border-b-2 border-emerald-500" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Active Positions
            </button>
            <button
              onClick={() => setActiveSubTab('rebalance')}
              className={`pb-2.5 font-bold transition flex items-center gap-1.5 relative cursor-pointer whitespace-nowrap ${
                activeSubTab === 'rebalance' ? "text-emerald-400 border-b-2 border-emerald-500" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Scale className="w-3.5 h-3.5 text-emerald-500" />
              Rebalance Engine
              <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                Suggested
              </span>
            </button>
            <button
              onClick={() => setActiveSubTab('history')}
              className={`pb-2.5 font-bold transition flex items-center gap-1.5 relative cursor-pointer whitespace-nowrap ${
                activeSubTab === 'history' ? "text-emerald-400 border-b-2 border-emerald-500" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
              Trade History
            </button>
          </div>

          {activeSubTab !== 'rebalance' && (
            <button
              onClick={activeSubTab === 'positions' ? downloadHoldingsCSV : downloadTradeHistoryCSV}
              className="sm:mb-2 text-[10px] self-start sm:self-center font-bold px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-750 text-zinc-300 hover:text-white rounded-lg border border-zinc-700/60 transition cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3 h-3 text-emerald-400" />
              <span>Export {activeSubTab === 'positions' ? 'Holdings' : 'History'} CSV</span>
            </button>
          )}
        </div>

        {activeSubTab === 'positions' && (
          <div className="flex-1">
            {portfolio.length === 0 ? (
              <div className="text-center py-8 bg-zinc-950/20 rounded-2xl border border-zinc-900 text-xs text-zinc-500 font-sans">
                You do not own any securities. Use the Trade Deck above to purchase shares.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800/80 text-[10px] text-zinc-500 uppercase tracking-wider">
                      <th className="pb-2.5">Security</th>
                      <th className="pb-2.5 text-right">Shares Owned</th>
                      <th className="pb-2.5 text-right">Average Price</th>
                      <th className="pb-2.5 text-right">Current Price</th>
                      <th className="pb-2.5 text-center">24h Trend</th>
                      <th className="pb-2.5 text-right">Market Value</th>
                      <th className="pb-2.5 text-right">Profit / Loss</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                    {portfolio.map((item) => {
                      const stock = stocks.find((s) => s.symbol === item.symbol);
                      const currentPrice = stock ? stock.price : item.avgBuyPrice;
                      const totalValue = currentPrice * item.shares;
                      const costBasis = item.avgBuyPrice * item.shares;
                      const pnl = totalValue - costBasis;
                      const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
                      const isGain = pnl >= 0;

                      return (
                        <tr key={item.symbol} className="hover:bg-zinc-900/30 transition">
                          <td className="py-3 font-bold text-white">{item.symbol}</td>
                          <td className="py-3 text-right text-zinc-300">{item.shares}</td>
                          <td className="py-3 text-right text-zinc-400">${item.avgBuyPrice.toFixed(2)}</td>
                          <td className="py-3 text-right text-zinc-300">${currentPrice.toFixed(2)}</td>
                          <td className="py-3 text-center">
                            {stock ? (
                              <Sparkline 
                                history={stock.history} 
                                changePercent={stock.changePercent} 
                                symbol={stock.symbol} 
                              />
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>
                          <td className="py-3 text-right text-zinc-200 font-semibold">${totalValue.toFixed(2)}</td>
                          <td className={`py-3 text-right font-semibold ${isGain ? "text-emerald-400" : "text-rose-400"}`}>
                            {isGain ? "+" : ""}${pnl.toFixed(2)} ({pnlPercent.toFixed(2)}%)
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'rebalance' && (
          /* Rebalance Engine View */
          <div className="flex flex-col gap-5">
            {portfolio.length === 0 ? (
              <div className="text-center py-10 bg-zinc-950/20 rounded-2xl border border-zinc-900/50 text-xs text-zinc-500 font-sans flex flex-col items-center justify-center gap-2">
                <Scale className="w-8 h-8 opacity-25 text-zinc-500" />
                <span>Rebalancing is only active when holding multiple assets.</span>
                <p className="text-[10px] text-zinc-600">Please execute buy orders in the Trade Deck first to establish initial holdings.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                
                {/* Left Side: Target Weights configurator */}
                <div className="xl:col-span-7 flex flex-col gap-4">
                  <div className="flex justify-between items-center bg-zinc-950/30 p-3 rounded-2xl border border-zinc-850">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wide">Target Weightings Mapping</span>
                      <p className="text-[11px] text-zinc-400 font-sans mt-0.5">Assign target percentages to rebalance against total NAV.</p>
                    </div>
                    <button
                      onClick={handleDistributeEqually}
                      className="px-2.5 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-[10px] font-mono font-bold transition border border-zinc-750/50 cursor-pointer active:scale-95"
                    >
                      Equal Weights ({(100 / portfolio.length).toFixed(1)}%)
                    </button>
                  </div>

                  {/* List of Held Symbols with target config */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {rebalanceTrades.map((item) => (
                      <div key={item.symbol} className="bg-zinc-950/20 hover:bg-zinc-950/30 p-3.5 rounded-2xl border border-zinc-850/60 transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-zinc-900 rounded-xl border border-zinc-800 text-white font-mono font-bold text-xs">
                            {item.symbol}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-zinc-200 block">{item.companyName}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              Holdings: {item.currentWeight.toFixed(1)}% ({item.sharesToTrade === 0 ? "Balanced" : `$${item.currentValue.toFixed(2)}`})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 justify-between sm:justify-end">
                          <div className="text-right hidden sm:block font-mono">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Current Price</span>
                            <span className="text-xs text-zinc-300 font-bold">${item.currentPrice.toFixed(2)}</span>
                          </div>
                          
                          {/* Slider / Numeric Input config */}
                          <div className="flex items-center bg-zinc-950 rounded-xl border border-zinc-800 px-3 py-1.5 w-28 hover:border-zinc-700 transition">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={targetAllocations[item.symbol] ?? 0}
                              onChange={(e) => {
                                const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                                const updated = { ...targetAllocations, [item.symbol]: val };
                                handleSaveTargets(updated);
                              }}
                              className="w-full bg-transparent border-none text-right font-mono text-xs text-white focus:outline-none pr-1.5"
                            />
                            <span className="text-zinc-500 font-mono text-xs select-none">%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Weight Allocation Progress Ledger */}
                  <div className="bg-zinc-950/40 p-4 rounded-2xl border border-zinc-850 flex flex-col gap-3 font-mono text-[11px]">
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Total Assigned Target Weight:</span>
                      <span className={`font-bold ${totalTargetAllocated > 100 ? "text-rose-400" : "text-emerald-400"}`}>
                        {totalTargetAllocated.toFixed(1)}% / 100.0%
                      </span>
                    </div>

                    <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden flex">
                      <div 
                        className={`h-full transition-all duration-300 ${totalTargetAllocated > 100 ? "bg-rose-500" : "bg-emerald-500"}`}
                        style={{ width: `${Math.min(100, totalTargetAllocated)}%` }}
                      />
                      <div 
                        className="h-full bg-zinc-800 transition-all duration-300"
                        style={{ width: `${Math.max(0, 100 - totalTargetAllocated)}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-zinc-500 text-[10px]">
                      <span>Remaining Cash Weight Buffer:</span>
                      <span>{remainingCashTarget.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Generated Trades & Execute Action */}
                <div className="xl:col-span-5 bg-zinc-950/40 border border-zinc-850 rounded-2xl p-4 flex flex-col gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/2 rounded-full filter blur-[30px] pointer-events-none" />
                  
                  <div>
                    <h5 className="text-[10px] uppercase font-mono font-bold text-zinc-500 tracking-wider">Rebalance Trades Blueprint</h5>
                    <p className="text-[11px] text-zinc-400 font-sans mt-0.5">Automated buy/sell instructions to re-align portfolio weights.</p>
                  </div>

                  {/* Trades instruction flows */}
                  <div className="flex-1 flex flex-col gap-2.5 min-h-[160px] max-h-[220px] overflow-y-auto pr-1">
                    {rebalanceTrades.filter(t => t.type !== 'NONE').length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center py-6 text-zinc-500 gap-1.5 font-sans">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400/80" />
                        <span className="text-xs text-zinc-300 font-bold">Portfolio is fully balanced</span>
                        <p className="text-[10px] text-zinc-500">Current holdings match target allocations.</p>
                      </div>
                    ) : (
                      rebalanceTrades.filter(t => t.type !== 'NONE').map((trade) => (
                        <div key={`rebal-trade-${trade.symbol}`} className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-850 flex items-center justify-between font-mono text-xs">
                          <div className="flex items-center gap-2">
                            {trade.type === 'BUY' ? (
                              <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase">
                                Buy
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded uppercase">
                                Sell
                              </span>
                            )}
                            <div>
                              <span className="font-bold text-white">{trade.symbol}</span>
                              <span className="text-zinc-500 text-[10px] block">
                                {trade.sharesToTrade} Shares @ ${trade.currentPrice.toFixed(2)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`font-bold block ${trade.type === 'BUY' ? "text-emerald-400" : "text-rose-400"}`}>
                              {trade.type === 'BUY' ? '-' : '+'}${trade.costOrRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              {trade.currentWeight.toFixed(1)}% → {trade.targetWeight.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Summary math and execution command */}
                  <div className="pt-3.5 border-t border-zinc-850/80 space-y-3 font-mono text-xs">
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Total Sells Revenue:</span>
                      <span className="text-emerald-400 font-semibold">+${totalSellsRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Total Buys Cost:</span>
                      <span className="text-rose-400 font-semibold">-${totalBuysCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-zinc-900 text-zinc-300">
                      <span>Projected Cash Balance:</span>
                      <span className={`font-bold ${projectedCash < 0 ? "text-rose-400" : "text-white"}`}>
                        ${projectedCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Execution Warnings */}
                    {totalTargetAllocated > 100 && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] font-sans text-rose-400 flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>The total assigned target allocations ({totalTargetAllocated.toFixed(1)}%) exceed 100% of portfolio. Please reduce the weight parameters.</span>
                      </div>
                    )}

                    {projectedCash < 0 && totalTargetAllocated <= 100 && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] font-sans text-rose-400 flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>Rebalancing fails cash solvency check. Plan requires ${Math.abs(projectedCash).toLocaleString(undefined, { maximumFractionDigits: 2 })} more than liquidation proceeds. Adjust target weights to keep more cash.</span>
                      </div>
                    )}

                    {/* Execute action button */}
                    <button
                      onClick={handleExecuteRebalancePlan}
                      disabled={!isRebalanceExecutable}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold font-sans transition flex items-center justify-center gap-1.5 shadow-md ${
                        isRebalanceExecutable
                          ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 cursor-pointer active:scale-98 shadow-emerald-500/5"
                          : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      }`}
                    >
                      <Scale className="w-4 h-4" />
                      Execute Rebalance Plan
                    </button>
                  </div>

                </div>

              </div>
            )}
          </div>
        )}

        {activeSubTab === 'history' && (
          <div className="flex flex-col gap-5">
            {/* Summary Metrics Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
              {/* Total Investment Card */}
              <div className="bg-zinc-950/40 p-4 rounded-2xl border border-zinc-800/60 flex flex-col justify-between">
                <div>
                  <span className="block text-[9px] uppercase text-zinc-500 tracking-wider">Total Deployed Capital ({selectedStock.symbol})</span>
                  <span className="text-xl font-bold text-white mt-1.5 block">
                    ${metrics.totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 mt-2 block">Cumulative buy orders total</span>
              </div>

              {/* Realized Gains Card */}
              <div className="bg-zinc-950/40 p-4 rounded-2xl border border-zinc-800/60 flex flex-col justify-between">
                <div>
                  <span className="block text-[9px] uppercase text-zinc-500 tracking-wider">Realized Net Gains ({selectedStock.symbol})</span>
                  <span className={`text-xl font-bold mt-1.5 block ${metrics.realizedGains >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {metrics.realizedGains >= 0 ? "+" : ""}${metrics.realizedGains.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 mt-2 block">FIFO closed profit/loss</span>
              </div>

              {/* Net Trade Frequency Card */}
              <div className="bg-zinc-950/40 p-4 rounded-2xl border border-zinc-800/60 flex flex-col justify-between">
                <div>
                  <span className="block text-[9px] uppercase text-zinc-500 tracking-wider">Order Frequency ({selectedStock.symbol})</span>
                  <span className="text-xl font-bold text-zinc-200 mt-1.5 block">
                    {metrics.tradeCount} {metrics.tradeCount === 1 ? "Order" : "Orders"}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 mt-2 block">
                  {metrics.buyCount} BUYs • {metrics.sellCount} SELLs
                </span>
              </div>
            </div>

            {/* Filter Toggle and Table Header */}
            <div className="flex justify-between items-center bg-zinc-950/20 p-3 rounded-2xl border border-zinc-850">
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wide">Historical Transaction Ledger</span>
                <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                  {historyFilter === 'selected' ? `Showing executed trades for ${selectedStock.symbol}` : "Showing all executed trades"}
                </p>
              </div>
              <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-850/80 font-mono text-[10px] gap-1">
                <button
                  onClick={() => setHistoryFilter('selected')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    historyFilter === 'selected' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {selectedStock.symbol} Only
                </button>
                <button
                  onClick={() => setHistoryFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    historyFilter === 'all' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  All Securities
                </button>
              </div>
            </div>

            {/* List Table */}
            <div className="flex-1">
              {displayedTrades.length === 0 ? (
                <div className="text-center py-10 bg-zinc-950/20 rounded-2xl border border-zinc-900 text-xs text-zinc-500 font-sans">
                  No trades recorded for {historyFilter === 'selected' ? selectedStock.symbol : "any security"}. Execute an order above to begin tracking history.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800/80 text-[10px] text-zinc-500 uppercase tracking-wider">
                        <th className="pb-2.5">Date & Time</th>
                        <th className="pb-2.5">Security</th>
                        <th className="pb-2.5 text-center">Type</th>
                        <th className="pb-2.5 text-right">Shares</th>
                        <th className="pb-2.5 text-right">Execution Price</th>
                        <th className="pb-2.5 text-right">Proceeds / Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {displayedTrades.map((trade) => {
                        const isBuy = trade.type === 'BUY';
                        const date = new Date(trade.timestamp);
                        const formattedDate = date.toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        }) + ' ' + date.toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        });

                        return (
                          <tr key={trade.id} className="hover:bg-zinc-900/30 transition">
                            <td className="py-3 text-zinc-400 text-[11px]">{formattedDate}</td>
                            <td className="py-3 font-bold text-white">{trade.symbol}</td>
                            <td className="py-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                                isBuy 
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              }`}>
                                {trade.type}
                              </span>
                            </td>
                            <td className="py-3 text-right text-zinc-300">{trade.shares}</td>
                            <td className="py-3 text-right text-zinc-400">${trade.price.toFixed(2)}</td>
                            <td className={`py-3 text-right font-semibold ${isBuy ? "text-rose-400" : "text-emerald-400"}`}>
                              {isBuy ? "-" : "+"}${trade.total.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
