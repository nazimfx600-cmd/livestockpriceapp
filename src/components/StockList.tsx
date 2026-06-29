import React, { useState, useEffect } from "react";
import { Stock } from "../types";
import { Search, Sparkles, Star, Plus, ShieldAlert, ArrowUpDown } from "lucide-react";

// Helper to convert abbreviated financial strings (like 1.2M, 564B, 2.19T) into numbers for sorting
function parseAbbreviatedNumber(val: string): number {
  if (!val) return 0;
  const cleanVal = val.trim().toUpperCase();
  const numPart = parseFloat(cleanVal.replace(/[^\d.-]/g, ""));
  if (isNaN(numPart)) return 0;

  if (cleanVal.endsWith("T")) {
    return numPart * 1000000000000;
  }
  if (cleanVal.endsWith("B")) {
    return numPart * 1000000000;
  }
  if (cleanVal.endsWith("M")) {
    return numPart * 1000000;
  }
  if (cleanVal.endsWith("K")) {
    return numPart * 1000;
  }
  return numPart;
}

interface StockListProps {
  stocks: Stock[];
  selectedSymbol: string;
  onSelectStock: (stock: Stock) => void;
  onAddStock: (symbol: string, name: string, price: number) => void;
  tickerUpdates: Record<string, 'up' | 'down' | null>;
}

export default function StockList({
  stocks,
  selectedSymbol,
  onSelectStock,
  onAddStock,
  tickerUpdates
}: StockListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'all' | 'watchlist' | 'tech'>('all');
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("watchlist");
      return saved ? JSON.parse(saved) : ["AAPL", "GOOGL", "NVDA", "BTC-USD"];
    } catch {
      return ["AAPL", "GOOGL", "NVDA", "BTC-USD"];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("watchlist", JSON.stringify(watchlist));
    } catch (e) {
      // ignore
    }
  }, [watchlist]);
  const [recentSymbols, setRecentSymbols] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("recentSymbols");
      return saved ? JSON.parse(saved) : ["NVDA"];
    } catch {
      return ["NVDA"];
    }
  });
  const [newSymbol, setNewSymbol] = useState("");

  useEffect(() => {
    if (!selectedSymbol) return;
    setRecentSymbols((prev) => {
      const filtered = prev.filter((sym) => sym !== selectedSymbol);
      const updated = [selectedSymbol, ...filtered].slice(0, 5);
      try {
        localStorage.setItem("recentSymbols", JSON.stringify(updated));
      } catch (e) {
        // ignore storage errors
      }
      return updated;
    });
  }, [selectedSymbol]);

  const validRecentSymbols = recentSymbols.filter(sym => stocks.some(s => s.symbol === sym));
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("100");
  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const toggleWatchlist = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid selecting stock on star click
    if (watchlist.includes(symbol)) {
      setWatchlist(watchlist.filter((s) => s !== symbol));
    } else {
      setWatchlist([...watchlist, symbol]);
    }
  };

  const handleAddStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanSymbol = newSymbol.trim().toUpperCase();
    const cleanName = newName.trim();
    const numPrice = parseFloat(newPrice);

    if (!cleanSymbol || !cleanName) {
      setFormError("Symbol and Name are required.");
      return;
    }

    if (isNaN(numPrice) || numPrice <= 0) {
      setFormError("Please enter a valid positive price.");
      return;
    }

    if (stocks.some((s) => s.symbol === cleanSymbol)) {
      setFormError(`Symbol ${cleanSymbol} is already being tracked.`);
      return;
    }

    onAddStock(cleanSymbol, cleanName, numPrice);
    
    // Add to watchlist automatically
    setWatchlist((prev) => [...prev, cleanSymbol]);

    // Reset Form
    setNewSymbol("");
    setNewName("");
    setNewPrice("100");
    setShowAddForm(false);
  };

  const [sortBy, setSortBy] = useState<string>("default");

  const filteredStocks = stocks.filter((stock) => {
    const matchesSearch =
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.sector.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'watchlist' && watchlist.includes(stock.symbol)) ||
      (activeTab === 'tech' && stock.sector === "Technology");

    return matchesSearch && matchesTab;
  });

  const sortedAndFilteredStocks = [...filteredStocks].sort((a, b) => {
    if (sortBy === "priceChangeDesc") {
      return b.changePercent - a.changePercent;
    }
    if (sortBy === "priceChangeAsc") {
      return a.changePercent - b.changePercent;
    }
    if (sortBy === "volumeDesc") {
      return parseAbbreviatedNumber(b.volume) - parseAbbreviatedNumber(a.volume);
    }
    if (sortBy === "marketCapDesc") {
      return parseAbbreviatedNumber(b.marketCap) - parseAbbreviatedNumber(a.marketCap);
    }
    return 0;
  });

  const starredStocks = sortedAndFilteredStocks.filter((stock) => watchlist.includes(stock.symbol));
  const nonStarredStocks = sortedAndFilteredStocks.filter((stock) => !watchlist.includes(stock.symbol));
  const shouldSplit = activeTab !== 'watchlist' && starredStocks.length > 0;

  const renderStockRow = (stock: Stock) => {
    const isSelected = stock.symbol === selectedSymbol;
    const isUp = stock.changePercent >= 0;
    const inWatchlist = watchlist.includes(stock.symbol);
    
    // Live update flash highlights
    const activeUpdate = tickerUpdates[stock.symbol];
    let updateBg = "transparent";
    if (activeUpdate === 'up') updateBg = "rgba(16, 185, 129, 0.12)";
    if (activeUpdate === 'down') updateBg = "rgba(244, 63, 94, 0.12)";

    return (
      <div
        key={stock.symbol}
        onClick={() => onSelectStock(stock)}
        className={`flex items-center justify-between py-2.5 px-2 rounded-xl transition-all duration-300 cursor-pointer ${
          isSelected ? "bg-zinc-800/60 border border-zinc-700/50" : "hover:bg-zinc-900/40 border border-transparent"
        }`}
        style={{ backgroundColor: updateBg !== "transparent" ? updateBg : undefined }}
      >
        <div className="flex items-center gap-2 max-w-[55%]">
          {/* Star Watchlist */}
          <button
            onClick={(e) => toggleWatchlist(stock.symbol, e)}
            className="p-1 -ml-1 text-zinc-500 hover:text-amber-400 transition cursor-pointer"
            title={inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
          >
            <Star className={`w-3.5 h-3.5 ${inWatchlist ? "fill-amber-400 text-amber-400" : "text-zinc-600"}`} />
          </button>

          <div className="truncate">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-bold text-white tracking-wider">{stock.symbol}</span>
              <span className="text-[9px] px-1 py-0.5 bg-zinc-800 text-zinc-400 rounded uppercase font-mono max-w-[70px] truncate">
                {stock.sector}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 truncate mt-0.5">{stock.name}</p>
          </div>
        </div>

        {/* Price and percent */}
        <div className="text-right font-mono">
          <span className="block text-xs font-bold text-white">${stock.price.toFixed(stock.symbol.includes("BTC") ? 0 : 2)}</span>
          <span className={`text-[10px] font-medium block mt-0.5 ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
            {isUp ? "+" : ""}{stock.changePercent.toFixed(2)}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <div id="stock-list-root" className="bg-zinc-900/40 rounded-3xl border border-zinc-800 p-5 backdrop-blur-md flex flex-col h-[520px] select-none relative animate-fade-in">
      
      {/* Recent Searches */}
      {validRecentSymbols.length > 0 && (
        <div className="mb-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-mono font-bold text-zinc-500 tracking-wider">Recent Searches</span>
            <button 
              onClick={() => {
                setRecentSymbols([]);
                try { localStorage.removeItem("recentSymbols"); } catch (e) {}
              }}
              className="text-[9px] uppercase font-mono text-zinc-600 hover:text-zinc-400 transition cursor-pointer"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {validRecentSymbols.map((sym) => {
              const isSelected = sym === selectedSymbol;
              const stockItem = stocks.find((s) => s.symbol === sym);
              return (
                <button
                  key={sym}
                  onClick={() => stockItem && onSelectStock(stockItem)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold"
                      : "bg-zinc-800/40 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/60"
                  }`}
                >
                  {sym}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search & Sort Input Controls */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3.5">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-zinc-500" />
          </span>
          <input
            type="text"
            placeholder="Search symbols or sectors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950/60 text-zinc-200 placeholder-zinc-500 text-xs rounded-xl pl-9 pr-4 py-2.5 border border-zinc-800 focus:outline-none focus:border-zinc-700 font-sans"
          />
        </div>
        <div className="relative flex items-center bg-zinc-950/60 border border-zinc-800 rounded-xl px-2.5 hover:border-zinc-700 transition">
          <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500 mr-1 shrink-0" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-transparent text-zinc-300 text-xs py-2.5 border-none focus:outline-none font-sans cursor-pointer w-full sm:w-28 text-left"
            title="Sort listings"
          >
            <option value="default" className="bg-zinc-950 text-zinc-300">Default</option>
            <option value="priceChangeDesc" className="bg-zinc-950 text-emerald-400">▲ Change %</option>
            <option value="priceChangeAsc" className="bg-zinc-950 text-rose-400">▼ Change %</option>
            <option value="volumeDesc" className="bg-zinc-950 text-zinc-300">Volume</option>
            <option value="marketCapDesc" className="bg-zinc-950 text-zinc-300">Market Cap</option>
          </select>
        </div>
      </div>

      {/* Watchlist Tabs */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex gap-1 bg-zinc-950/50 p-1 rounded-xl border border-zinc-900/60 font-mono text-[10px]">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${activeTab === 'all' ? "bg-zinc-800 text-white font-bold" : "text-zinc-500 hover:text-white"}`}
          >
            All Markets
          </button>
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer ${activeTab === 'watchlist' ? "bg-zinc-800 text-white font-bold" : "text-zinc-500 hover:text-white"}`}
          >
            <Star className="w-2.5 h-2.5 fill-current" /> Watchlist
          </button>
          <button
            onClick={() => setActiveTab('tech')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${activeTab === 'tech' ? "bg-zinc-800 text-white font-bold" : "text-zinc-500 hover:text-white"}`}
          >
            Tech
          </button>
        </div>

        {/* Add custom ticker button */}
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="p-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 rounded-xl text-zinc-300 hover:text-white transition cursor-pointer"
          title="Add custom stock to simulate"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Add Custom Ticker Form Drawer overlay */}
      {showAddForm && (
        <form onSubmit={handleAddStockSubmit} className="absolute inset-x-4 top-16 bg-zinc-950 border border-zinc-800 p-4 rounded-2xl shadow-2xl z-20 animate-fade-in font-sans space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-white flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Simulate Custom Ticker
            </h4>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setFormError(null); }}
              className="text-zinc-500 hover:text-white text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Symbol</label>
              <input
                type="text"
                placeholder="e.g. INTC"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                maxLength={7}
                className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-white uppercase focus:outline-none focus:border-zinc-700 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Initial Price ($)</label>
              <input
                type="number"
                placeholder="100"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-white focus:outline-none focus:border-zinc-700 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Company Name</label>
            <input
              type="text"
              placeholder="e.g. Intel Corporation"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-white focus:outline-none focus:border-zinc-700 text-xs"
            />
          </div>

          {formError && (
            <div className="bg-rose-500/10 border border-rose-500/20 p-2 rounded text-[11px] text-rose-400 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Add To Live Workspace
          </button>
        </form>
      )}

      {/* Stock Tickers Scroll List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 pr-1 select-none">
        {filteredStocks.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-xs font-sans">
            No matching symbols tracked.
          </div>
        ) : shouldSplit ? (
          <div className="flex flex-col gap-4">
            {starredStocks.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <div className="py-1 px-2.5 text-[9px] uppercase font-mono font-bold text-amber-400 tracking-wider flex items-center gap-1.5 bg-amber-500/5 rounded-lg border border-amber-500/10">
                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> Starred Watchlist ({starredStocks.length})
                </div>
                <div className="divide-y divide-zinc-800/20">
                  {starredStocks.map(renderStockRow)}
                </div>
              </div>
            )}
            
            {nonStarredStocks.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-1">
                <div className="py-1 px-2.5 text-[9px] uppercase font-mono font-bold text-zinc-500 tracking-wider bg-zinc-950/25 rounded-lg border border-zinc-900/40">
                  Other Securities ({nonStarredStocks.length})
                </div>
                <div className="divide-y divide-zinc-800/20">
                  {nonStarredStocks.map(renderStockRow)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/20">
            {sortedAndFilteredStocks.map(renderStockRow)}
          </div>
        )}
      </div>

      <div className="pt-2.5 border-t border-zinc-800/60 flex justify-between items-center text-[9px] font-mono text-zinc-500">
        <span>Tracked: {filteredStocks.length} of {stocks.length}</span>
        <span className="flex items-center gap-1 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> LIVE feeds
        </span>
      </div>
    </div>
  );
}
