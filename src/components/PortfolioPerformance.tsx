import React from "react";
import { Stock, PortfolioItem } from "../types";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  DollarSign, 
  PieChart as PieIcon, 
  Layers, 
  Calendar,
  Sparkles
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid
} from "recharts";

interface PortfolioPerformanceProps {
  portfolio: PortfolioItem[];
  cash: number;
  stocks: Stock[];
}

export default function PortfolioPerformance({
  portfolio,
  cash,
  stocks
}: PortfolioPerformanceProps) {
  // Use the master stocks history list to build timestamps (relying on NVDA or first stock)
  const baseStock = stocks[0];
  const masterHistory = baseStock?.history || [];

  if (masterHistory.length === 0) {
    return (
      <div className="bg-zinc-900/40 rounded-3xl border border-zinc-800 p-8 text-center text-zinc-500 font-mono text-xs">
        No stock history available to generate portfolio performance.
      </div>
    );
  }

  // Calculate historical portfolio valuation for each timestamp tick
  const chartData = masterHistory.map((point, index) => {
    let stockValue = 0;
    
    portfolio.forEach((item) => {
      const stock = stocks.find((s) => s.symbol === item.symbol);
      if (stock && stock.history && stock.history.length > 0) {
        // Find historical price at the same relative index
        const histItem = stock.history[index] || stock.history[stock.history.length - 1];
        if (histItem) {
          stockValue += item.shares * histItem.price;
        }
      }
    });

    const totalValue = cash + stockValue;
    return {
      timestamp: point.timestamp,
      StockAssets: parseFloat(stockValue.toFixed(2)),
      Cash: parseFloat(cash.toFixed(2)),
      PortfolioValue: parseFloat(totalValue.toFixed(2))
    };
  });

  // Calculate high-level stats
  const currentValue = chartData[chartData.length - 1]?.PortfolioValue || cash;
  const initialValue = chartData[0]?.PortfolioValue || cash;
  const netReturn = currentValue - initialValue;
  const returnPercent = initialValue > 0 ? (netReturn / initialValue) * 100 : 0;
  
  const valuesArray = chartData.map(d => d.PortfolioValue);
  const highestValue = Math.max(...valuesArray, cash);
  const lowestValue = Math.min(...valuesArray, cash);

  // Asset allocation data
  const currentStockValue = portfolio.reduce((sum, item) => {
    const stock = stocks.find((s) => s.symbol === item.symbol);
    return sum + item.shares * (stock?.price || 0);
  }, 0);
  const totalAssets = cash + currentStockValue;

  const allocationData = [
    { name: "Cash Liquidity", value: cash, color: "#10b981" }, // Emerald Green
    ...portfolio.map((item, index) => {
      const stock = stocks.find((s) => s.symbol === item.symbol);
      const val = item.shares * (stock?.price || 0);
      const colors = ["#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#ef4444", "#a855f7"];
      return {
        name: `${item.symbol} Position`,
        value: parseFloat(val.toFixed(2)),
        color: colors[index % colors.length]
      };
    })
  ].filter(item => item.value > 0);

  const isProfitable = netReturn >= 0;

  // Custom Tooltip for Portfolio Area Chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-zinc-950/95 border border-zinc-800 p-3 rounded-xl shadow-2xl font-mono text-xs">
          <p className="text-zinc-500 mb-1.5 font-sans font-semibold flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> {label}
          </p>
          <div className="space-y-1">
            <div className="flex justify-between gap-8">
              <span className="text-zinc-400">Total Portfolio:</span>
              <span className="font-bold text-white">${data.PortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-zinc-500">Stock Assets:</span>
              <span className="text-zinc-300">${data.StockAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-zinc-500">Cash Reserves:</span>
              <span className="text-zinc-300">${data.Cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="portfolio-performance-root" className="bg-zinc-900/40 rounded-3xl border border-zinc-800 p-6 backdrop-blur-md flex flex-col gap-6 relative overflow-hidden animate-fade-in">
      {/* Background radial accent */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-emerald-500/3 rounded-full filter blur-[60px] pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center pb-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <h3 className="font-sans font-bold text-white text-base">Portfolio Performance Analytics</h3>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400 uppercase tracking-wider bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800/80">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>Calculated Real-Time</span>
        </div>
      </div>

      {/* Stats Summary Rows */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assets */}
        <div className="bg-zinc-950/40 border border-zinc-850/60 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono font-semibold text-zinc-500 tracking-wider">Net Asset Value (NAV)</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-white">${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <p className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1 font-mono">
            <Wallet className="w-3 h-3 text-zinc-500" /> Cash + Holdings valuation
          </p>
        </div>

        {/* Total Return */}
        <div className="bg-zinc-950/40 border border-zinc-850/60 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono font-semibold text-zinc-500 tracking-wider">Total Session Return</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className={`text-xl font-bold ${isProfitable ? "text-emerald-400" : "text-rose-400"}`}>
              {isProfitable ? "+" : ""}${netReturn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`text-xs font-semibold font-mono ${isProfitable ? "text-emerald-500/80" : "text-rose-500/80"}`}>
              ({isProfitable ? "+" : ""}{returnPercent.toFixed(2)}%)
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1 font-sans">
            {isProfitable ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> : <TrendingDown className="w-3.5 h-3.5 text-rose-500" />}
            Performance since load
          </p>
        </div>

        {/* High Point */}
        <div className="bg-zinc-950/40 border border-zinc-850/60 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono font-semibold text-zinc-500 tracking-wider">All-Time Peak</span>
          <div className="mt-2">
            <span className="text-base font-bold text-zinc-200">${highestValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1 font-mono">Max value during session</p>
        </div>

        {/* Low Point */}
        <div className="bg-zinc-950/40 border border-zinc-850/60 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono font-semibold text-zinc-500 tracking-wider">All-Time Trough</span>
          <div className="mt-2">
            <span className="text-base font-bold text-zinc-200">${lowestValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1 font-mono">Min value during session</p>
        </div>
      </div>

      {/* Main Charts Block */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Valuation over Time Area Chart */}
        <div className="lg:col-span-8 bg-zinc-950/40 border border-zinc-800/60 rounded-3xl p-5 flex flex-col h-[340px]">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xs uppercase font-mono font-bold text-zinc-400 tracking-wider">Historical Net Asset Trend</h4>
            <span className="text-[10px] font-mono text-zinc-500">Timeline Ticks (5m Intervals)</span>
          </div>

          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} />
                <XAxis 
                  dataKey="timestamp" 
                  tick={{ fill: '#71717a', fontSize: 9, fontFamily: 'monospace' }}
                  tickLine={{ stroke: '#27272a' }}
                  axisLine={{ stroke: '#27272a' }}
                />
                <YAxis 
                  domain={['auto', 'auto']}
                  tick={{ fill: '#71717a', fontSize: 9, fontFamily: 'monospace' }}
                  tickLine={{ stroke: '#27272a' }}
                  axisLine={{ stroke: '#27272a' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="PortfolioValue" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Allocation Breakdown Pie Chart */}
        <div className="lg:col-span-4 bg-zinc-950/40 border border-zinc-800/60 rounded-3xl p-5 flex flex-col h-[340px]">
          <div className="flex items-center gap-1.5 mb-3">
            <PieIcon className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs uppercase font-mono font-bold text-zinc-400 tracking-wider">Asset Distribution</h4>
          </div>

          {allocationData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center p-4">
              <span className="text-xs text-zinc-500 font-sans">No portfolio assets found.</span>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between min-h-0">
              <div className="h-[140px] flex justify-center items-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={60}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [`$${parseFloat(value).toLocaleString()}`, "Valuation"]}
                      contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "12px", fontFamily: "monospace", fontSize: "11px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                  <span className="text-[9px] uppercase font-mono text-zinc-500 tracking-wider font-bold">Total NAV</span>
                  <span className="text-xs font-bold text-white">${totalAssets.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              </div>

              {/* Allocation list details */}
              <div className="flex-1 overflow-y-auto max-h-[130px] pr-1.5 space-y-1.5 mt-2 scrollbar-thin scrollbar-thumb-zinc-850">
                {allocationData.map((item, index) => {
                  const percentage = (item.value / totalAssets) * 100;
                  return (
                    <div key={index} className="flex items-center justify-between text-[11px] font-mono p-1 rounded-lg hover:bg-zinc-900/40 transition">
                      <div className="flex items-center gap-1.5 min-w-[60%]">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-zinc-300 truncate">{item.name}</span>
                      </div>
                      <div className="text-right text-zinc-400">
                        <span className="font-bold text-zinc-200">${item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        <span className="text-[10px] text-zinc-500 ml-1.5">({percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Guide Footer details */}
      <div className="bg-zinc-950/60 rounded-2xl border border-zinc-850 p-4 font-sans text-xs text-zinc-400 leading-relaxed flex items-start gap-2.5">
        <Layers className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold text-zinc-300">How Portfolio Performance Metrics Map to Production Systems:</strong>
          <p className="mt-1 text-zinc-400">
            This graph performs a coordinate-aligned matrix join on the price histories of your held securities at each 5-minute telemetry interval, summing their values and adding liquid cash balances. In production, this data is computed on-the-fly inside database pipelines (such as a time-series DB or Firestore query) and cached via standard state-management providers to yield immediate visual feedback when price streams fluctuate.
          </p>
        </div>
      </div>
    </div>
  );
}
