import { useState, useMemo } from "react";
import { TradeRecord, Stock } from "../types";
import { 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Download, 
  Filter, 
  SlidersHorizontal,
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  Layers,
  Inbox
} from "lucide-react";

interface TradeHistoryViewProps {
  tradeHistory: TradeRecord[];
  stocks: Stock[];
}

export default function TradeHistoryView({ tradeHistory = [], stocks }: TradeHistoryViewProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'total-desc' | 'total-asc'>('date-desc');
  const [minAmount, setMinAmount] = useState<string>("");

  // Key performance calculations
  const stats = useMemo(() => {
    const totalVolume = tradeHistory.reduce((sum, t) => sum + t.total, 0);
    const buyCount = tradeHistory.filter(t => t.type === 'BUY').length;
    const sellCount = tradeHistory.filter(t => t.type === 'SELL').length;
    const avgTradeSize = tradeHistory.length > 0 ? totalVolume / tradeHistory.length : 0;
    
    // Find most traded security
    const symbolCounts: Record<string, number> = {};
    tradeHistory.forEach(t => {
      symbolCounts[t.symbol] = (symbolCounts[t.symbol] || 0) + 1;
    });
    let mostTraded = "-";
    let highestCount = 0;
    Object.entries(symbolCounts).forEach(([sym, count]) => {
      if (count > highestCount) {
        highestCount = count;
        mostTraded = sym;
      }
    });

    return {
      totalVolume,
      buyCount,
      sellCount,
      avgTradeSize,
      mostTraded: mostTraded !== "-" ? `${mostTraded} (${highestCount}x)` : "-"
    };
  }, [tradeHistory]);

  // Filter & sort logic
  const filteredTrades = useMemo(() => {
    let result = [...tradeHistory];

    // Filter by symbol/search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(t => 
        t.symbol.toLowerCase().includes(term)
      );
    }

    // Filter by type
    if (typeFilter !== 'ALL') {
      result = result.filter(t => t.type === typeFilter);
    }

    // Filter by min amount
    if (minAmount) {
      const parsedMin = parseFloat(minAmount);
      if (!isNaN(parsedMin)) {
        result = result.filter(t => t.total >= parsedMin);
      }
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
      if (sortBy === 'date-asc') {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }
      if (sortBy === 'total-desc') {
        return b.total - a.total;
      }
      if (sortBy === 'total-asc') {
        return a.total - b.total;
      }
      return 0;
    });

    return result;
  }, [tradeHistory, searchTerm, typeFilter, sortBy, minAmount]);

  const downloadCSV = () => {
    if (filteredTrades.length === 0) return;
    
    const headers = ["ID", "Timestamp", "Security Ticker", "Transaction Type", "Shares Ordered", "Execution Price ($)", "Total Volume ($)"];
    const rows = filteredTrades.map((t) => {
      const date = new Date(t.timestamp);
      const formattedDate = date.toISOString().replace('T', ' ').substring(0, 19);
      return [
        t.id,
        `"${formattedDate}"`,
        t.symbol,
        t.type,
        t.shares,
        t.price.toFixed(2),
        t.total.toFixed(2)
      ];
    });

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `nasdaq_sandbox_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="trade-history-view-panel" className="space-y-6">
      
      {/* 1. TOP STATS OVERVIEW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-zinc-950/40 border border-zinc-850 rounded-xl p-4">
          <div className="flex items-center gap-2 text-[10px] uppercase font-mono text-zinc-500 tracking-wider">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cumulative Volume</span>
          </div>
          <p className="text-lg font-bold text-white font-mono mt-1.5">
            ${stats.totalVolume.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-zinc-500 mt-1 block font-sans">Sum of all buy & sell activity</span>
        </div>

        <div className="bg-zinc-950/40 border border-zinc-850 rounded-xl p-4">
          <div className="flex items-center gap-2 text-[10px] uppercase font-mono text-zinc-500 tracking-wider">
            <Layers className="w-3.5 h-3.5 text-zinc-400" />
            <span>Transaction Count</span>
          </div>
          <p className="text-lg font-bold text-white font-mono mt-1.5">
            {tradeHistory.length} <span className="text-xs text-zinc-400 font-normal">Orders</span>
          </p>
          <span className="text-[10px] text-zinc-500 mt-1 block font-sans">
            {stats.buyCount} Buy / {stats.sellCount} Sell ratio
          </span>
        </div>

        <div className="bg-zinc-950/40 border border-zinc-850 rounded-xl p-4">
          <div className="flex items-center gap-2 text-[10px] uppercase font-mono text-zinc-500 tracking-wider">
            <DollarSign className="w-3.5 h-3.5 text-zinc-400" />
            <span>Average Order Size</span>
          </div>
          <p className="text-lg font-bold text-white font-mono mt-1.5">
            ${stats.avgTradeSize.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-zinc-500 mt-1 block font-sans">Mean capital allocation per trade</span>
        </div>

        <div className="bg-zinc-950/40 border border-zinc-850 rounded-xl p-4">
          <div className="flex items-center gap-2 text-[10px] uppercase font-mono text-zinc-500 tracking-wider">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <span>Most Active Asset</span>
          </div>
          <p className="text-lg font-bold text-emerald-400 font-mono mt-1.5">
            {stats.mostTraded}
          </p>
          <span className="text-[10px] text-zinc-500 mt-1 block font-sans">Security with the highest fill frequency</span>
        </div>

      </div>

      {/* 2. LEDGER ACTIONS & FILTERS HEADER */}
      <div className="bg-zinc-950/30 border border-zinc-850 rounded-2xl p-4 space-y-4">
        
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Audit Trail & Trading Ledger</h3>
            <p className="text-[11px] text-zinc-500 font-sans mt-0.5">Filter, search, or audit the complete list of corporate equity transactions.</p>
          </div>

          <button
            onClick={downloadCSV}
            disabled={filteredTrades.length === 0}
            className="w-full sm:w-auto px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-mono font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" /> Export CSV Ledger
          </button>
        </div>

        {/* Dynamic Filters Deck */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-zinc-900">
          
          {/* Ticker Search Box */}
          <div className="sm:col-span-4 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search ticker symbol (e.g. NVDA)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-zinc-700 focus:bg-zinc-900 transition"
            />
          </div>

          {/* Type Filter Tabs */}
          <div className="sm:col-span-3 flex bg-zinc-900/40 p-1 rounded-xl border border-zinc-800/60 text-[11px] font-mono">
            {(['ALL', 'BUY', 'SELL'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`flex-1 py-1 rounded-lg text-center font-bold transition cursor-pointer ${
                  typeFilter === type 
                    ? "bg-zinc-800 text-white shadow" 
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Sort Menu Select */}
          <div className="sm:col-span-3 relative flex items-center bg-zinc-900/60 border border-zinc-800 rounded-xl px-3.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500 mr-2 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-transparent text-xs text-zinc-300 font-mono focus:outline-none py-2 cursor-pointer"
            >
              <option value="date-desc" className="bg-zinc-950">Newest First</option>
              <option value="date-asc" className="bg-zinc-950">Oldest First</option>
              <option value="total-desc" className="bg-zinc-950">Value: High to Low</option>
              <option value="total-asc" className="bg-zinc-950">Value: Low to High</option>
            </select>
          </div>

          {/* Min Amount filter */}
          <div className="sm:col-span-2 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono">$ Min</span>
            <input
              type="number"
              placeholder="0.00"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl pl-12 pr-3 py-2 text-xs text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-zinc-700 transition"
            />
          </div>

        </div>

      </div>

      {/* 3. TRANSATION TRAIL LIST */}
      <div className="bg-zinc-950/30 border border-zinc-850 rounded-2xl p-5">
        {filteredTrades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <div className="p-4 bg-zinc-900/40 rounded-full text-zinc-600 border border-zinc-850">
              <Inbox className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-mono font-bold uppercase tracking-wider">No Transaction Records Found</p>
              <p className="text-[11px] text-zinc-500 max-w-sm mt-1">
                No ledger logs match your current query. Try adjusting your search term, clearing minimum price filters, or execute a new trade.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/80 text-[10px] text-zinc-500 uppercase tracking-wider">
                  <th className="pb-3 pl-2">Audit Timestamp</th>
                  <th className="pb-3">Security</th>
                  <th className="pb-3 text-center">Type</th>
                  <th className="pb-3 text-right">Shares</th>
                  <th className="pb-3 text-right">Execution Price</th>
                  <th className="pb-3 text-right pr-2">Total Proceeds / Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {filteredTrades.map((trade) => {
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
                    <tr key={trade.id} className="hover:bg-zinc-900/30 transition group">
                      <td className="py-3.5 pl-2 text-zinc-400 text-[11px]">
                        {formattedDate}
                      </td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white group-hover:text-emerald-400 transition">
                            {trade.symbol}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase border ${
                          isBuy 
                            ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/15" 
                            : "bg-rose-500/5 text-rose-400 border-rose-500/15"
                        }`}>
                          {isBuy ? <ArrowDownLeft className="w-2.5 h-2.5 text-emerald-400" /> : <ArrowUpRight className="w-2.5 h-2.5 text-rose-400" />}
                          {trade.type}
                        </span>
                      </td>
                      <td className="py-3.5 text-right font-bold text-zinc-300">
                        {trade.shares}
                      </td>
                      <td className="py-3.5 text-right text-zinc-400">
                        ${trade.price.toFixed(2)}
                      </td>
                      <td className={`py-3.5 text-right pr-2 font-bold ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isBuy ? '-' : '+'}${trade.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
  );
}
