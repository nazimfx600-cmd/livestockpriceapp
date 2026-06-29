import React, { useState } from "react";
import { Stock, PriceAlert } from "../types";
import { Bell, Trash2, ArrowUp, ArrowDown, Plus, ShieldAlert, CheckCircle } from "lucide-react";

interface PriceAlertsProps {
  stocks: Stock[];
  selectedStock: Stock;
  alerts: PriceAlert[];
  onAddAlert: (symbol: string, priceThreshold: number, type: "above" | "below") => void;
  onRemoveAlert: (id: string) => void;
  onClearTriggered: () => void;
}

export default function PriceAlerts({
  stocks,
  selectedStock,
  alerts,
  onAddAlert,
  onRemoveAlert,
  onClearTriggered
}: PriceAlertsProps) {
  const [symbol, setSymbol] = useState(selectedStock.symbol);
  const [threshold, setThreshold] = useState<string>(selectedStock.price.toString());
  const [type, setType] = useState<"above" | "below">("above");
  const [error, setError] = useState<string | null>(null);

  // Sync symbol and threshold with selected stock if it changes
  React.useEffect(() => {
    setSymbol(selectedStock.symbol);
    setThreshold(selectedStock.price.toString());
  }, [selectedStock]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const price = parseFloat(threshold);
    if (isNaN(price) || price <= 0) {
      setError("Please enter a valid price threshold greater than 0.");
      return;
    }

    const matchedStock = stocks.find((s) => s.symbol === symbol);
    if (!matchedStock) {
      setError("Selected stock symbol is invalid.");
      return;
    }

    // Optional warning: Alert already triggerable
    if (type === "above" && matchedStock.price >= price) {
      setError(`Current price ($${matchedStock.price}) is already above $${price}.`);
      return;
    }
    if (type === "below" && matchedStock.price <= price) {
      setError(`Current price ($${matchedStock.price}) is already below $${price}.`);
      return;
    }

    onAddAlert(symbol, price, type);
    setError(null);
  };

  const handleQuickPercent = (percent: number) => {
    const currentPrice = stocks.find((s) => s.symbol === symbol)?.price || selectedStock.price;
    const offset = currentPrice * (percent / 100);
    const newTarget = parseFloat((currentPrice + offset).toFixed(2));
    setThreshold(newTarget.toString());
    setType(percent >= 0 ? "above" : "below");
  };

  const activeAlerts = alerts.filter(a => !a.isTriggered);
  const triggeredAlerts = alerts.filter(a => a.isTriggered);

  return (
    <div id="price-alerts-root" className="bg-zinc-900/40 rounded-3xl border border-zinc-800 p-6 backdrop-blur-md flex flex-col gap-6 relative overflow-hidden animate-fade-in">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full filter blur-[50px] pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center pb-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-400" />
          <h3 className="font-sans font-bold text-white text-base">Threshold Price Alerts</h3>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
          <span>Active: {activeAlerts.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Side: Create Alert Form */}
        <div className="md:col-span-5 bg-zinc-950/40 border border-zinc-800/60 rounded-2xl p-4 flex flex-col gap-4">
          <h4 className="text-[10px] uppercase font-mono font-bold text-zinc-500 tracking-wider">Configure New Alert</h4>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {/* Symbol Dropdown */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider">Security</label>
              <select
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value);
                  const s = stocks.find((x) => x.symbol === e.target.value);
                  if (s) setThreshold(s.price.toString());
                }}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500/60 cursor-pointer"
              >
                {stocks.map((s) => (
                  <option key={s.symbol} value={s.symbol}>
                    {s.symbol} - {s.name} (${s.price.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {/* Condition Selection */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider">Condition Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType("above")}
                  className={`py-2 px-3 rounded-xl font-mono text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                    type === "above"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : "bg-zinc-900/60 text-zinc-400 border-zinc-800/80 hover:text-zinc-200"
                  }`}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  Price Goes Above
                </button>
                <button
                  type="button"
                  onClick={() => setType("below")}
                  className={`py-2 px-3 rounded-xl font-mono text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                    type === "below"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : "bg-zinc-900/60 text-zinc-400 border-zinc-800/80 hover:text-zinc-200"
                  }`}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  Price Goes Below
                </button>
              </div>
            </div>

            {/* Price Input */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider">Price Threshold ($)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-zinc-500 text-xs font-mono">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-7 pr-3 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500/60"
                />
              </div>

              {/* Quick offsets */}
              <div className="flex gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => handleQuickPercent(2)}
                  className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-[9px] font-mono text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  +2%
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPercent(5)}
                  className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-[9px] font-mono text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  +5%
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPercent(-2)}
                  className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-[9px] font-mono text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  -2%
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPercent(-5)}
                  className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-[9px] font-mono text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  -5%
                </button>
              </div>
            </div>

            {error && (
              <p className="text-[11px] text-rose-400 font-mono leading-tight">{error}</p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 text-zinc-950" />
              Activate Price Alert
            </button>
          </form>
        </div>

        {/* Right Side: Alert State and Logs */}
        <div className="md:col-span-7 flex flex-col gap-4">
          <div className="flex-1 flex flex-col min-h-[160px]">
            <h4 className="text-[10px] uppercase font-mono font-bold text-zinc-500 tracking-wider mb-2">Active Monitor Pipeline</h4>
            
            {activeAlerts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-6 bg-zinc-950/20 rounded-2xl border border-zinc-900 text-xs text-zinc-500 font-sans px-4">
                <ShieldAlert className="w-6 h-6 text-zinc-700 mb-2" />
                <p className="font-semibold">No active price thresholds</p>
                <p className="text-[10px] text-zinc-600 mt-1">Configure an alert on the left to actively scan live ticking WebSocket streams.</p>
              </div>
            ) : (
              <div className="bg-zinc-950/20 rounded-2xl border border-zinc-900 overflow-hidden flex-1 max-h-[190px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800/80 text-[9px] text-zinc-500 uppercase tracking-wider bg-zinc-900/10">
                      <th className="py-2.5 px-3.5">Asset</th>
                      <th className="py-2.5">Trigger Target</th>
                      <th className="py-2.5 text-right">Current Price</th>
                      <th className="py-2.5 px-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                    {activeAlerts.map((alert) => {
                      const currentPrice = stocks.find((s) => s.symbol === alert.symbol)?.price ?? 0;
                      return (
                        <tr key={alert.id} className="hover:bg-zinc-900/30 transition">
                          <td className="py-2.5 px-3.5 font-bold text-white flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            {alert.symbol}
                          </td>
                          <td className="py-2.5 text-zinc-300">
                            <span className="inline-flex items-center gap-0.5 font-semibold">
                              {alert.type === "above" ? (
                                <ArrowUp className="w-3 h-3 text-emerald-400 inline" />
                              ) : (
                                <ArrowDown className="w-3 h-3 text-rose-400 inline" />
                              )}
                              ${alert.priceThreshold.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-2.5 text-right text-zinc-400">${currentPrice.toFixed(2)}</td>
                          <td className="py-2.5 px-3.5 text-right">
                            <button
                              onClick={() => onRemoveAlert(alert.id)}
                              className="text-zinc-600 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
                              title="Delete Alert"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Triggered History list */}
          <div className="flex-1 flex flex-col min-h-[140px]">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] uppercase font-mono font-bold text-zinc-500 tracking-wider">Triggered Alert Incidents</h4>
              {triggeredAlerts.length > 0 && (
                <button
                  onClick={onClearTriggered}
                  className="text-[9px] uppercase font-mono text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
                >
                  Clear History
                </button>
              )}
            </div>

            {triggeredAlerts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-5 bg-zinc-950/20 rounded-2xl border border-zinc-900 text-xs text-zinc-500 font-sans">
                <p className="text-[10px] text-zinc-600">No alert incidents have been recorded yet.</p>
              </div>
            ) : (
              <div className="bg-zinc-950/20 rounded-2xl border border-zinc-900 overflow-hidden flex-1 max-h-[150px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                <div className="divide-y divide-zinc-800/40 p-2 space-y-1">
                  {triggeredAlerts.slice().reverse().map((alert) => (
                    <div key={alert.id} className="flex justify-between items-center bg-zinc-900/30 p-2 rounded-xl border border-zinc-800/20 text-[11px]">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <span className="font-bold text-white font-mono">{alert.symbol}</span>
                          <span className="text-zinc-400 font-mono ml-1.5">
                            crossed {alert.type === "above" ? "above" : "below"} ${alert.priceThreshold.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[9px] font-mono text-zinc-500 block">{alert.triggeredAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
