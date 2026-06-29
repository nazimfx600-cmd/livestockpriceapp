import React, { useState, useRef, useEffect } from "react";
import { Stock, StockHistoryItem } from "../types";

interface StockChartProps {
  stock: Stock;
}

export default function StockChart({ stock }: StockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 300 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: Math.max(100, width),
          height: Math.max(150, height || 260)
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const history = stock.history;
  if (!history || history.length === 0) {
    return (
      <div className="h-[260px] flex items-center justify-center text-slate-500 font-mono text-xs">
        No chart history available
      </div>
    );
  }

  // Find price bounds
  const prices = history.map((h) => h.price);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const priceRange = maxPrice - minPrice || 1.0;
  
  // Add 5% padding to top and bottom of chart bounds
  const yPadding = priceRange * 0.05;
  const yMax = maxPrice + yPadding;
  const yMin = Math.max(0, minPrice - yPadding);
  const yRange = yMax - yMin;

  const { width, height } = dimensions;
  const paddingLeft = 10;
  const paddingRight = 10;
  const paddingTop = 20;
  const paddingBottom = 20;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Convert data points to SVG coordinates
  const points = history.map((d, index) => {
    const x = paddingLeft + (index / (history.length - 1)) * chartWidth;
    // Invert Y axis for SVG rendering
    const y = paddingTop + chartHeight - ((d.price - yMin) / yRange) * chartHeight;
    return { x, y, ...d };
  });

  // SVG Line path definition
  let linePath = "";
  let areaPath = "";

  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ");
    
    // Closed path for the filled gradient area
    areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;
  }

  // Handle hover interactions
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const svgRect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - svgRect.left;
    
    // Find closest index
    const relativeX = (mouseX - paddingLeft) / chartWidth;
    const decimalIndex = relativeX * (history.length - 1);
    let index = Math.round(decimalIndex);
    index = Math.max(0, Math.min(history.length - 1, index));

    if (points[index]) {
      setHoverIndex(index);
      setHoverCoords({ x: points[index].x, y: points[index].y });
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setHoverCoords(null);
  };

  const activePoint = hoverIndex !== null ? points[hoverIndex] : points[points.length - 1];
  const isUp = stock.changePercent >= 0;
  const strokeColor = isUp ? "rgb(52, 211, 153)" : "rgb(251, 113, 133)"; // Emerald-400 vs Rose-400
  const fillColor = isUp ? "rgba(16, 185, 129, 0.08)" : "rgba(244, 63, 94, 0.08)";

  // Standard horizontal grid lines
  const gridLevels = [0, 0.5, 1]; // low, mid, high
  const gridYCoords = gridLevels.map((lvl) => paddingTop + chartHeight * lvl);

  return (
    <div id="stock-chart-root" className="w-full flex flex-col bg-zinc-900/40 rounded-3xl border border-zinc-800 p-5 backdrop-blur-md">
      {/* Chart Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded uppercase tracking-wider">
              {stock.symbol}
            </span>
            <span className="text-sm text-zinc-400 truncate max-w-[200px]">{stock.name}</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-display font-bold tracking-tight text-white">
              ${activePoint.price.toFixed(2)}
            </span>
            <span className={`text-sm font-mono font-medium ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
              {isUp ? "▲" : "▼"} {Math.abs(stock.change).toFixed(2)} ({stock.changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        <div className="text-right">
          <p className="font-mono text-[10px] uppercase text-zinc-500 tracking-wider">Active Coordinate</p>
          <p className="text-xs font-mono font-medium text-zinc-300 mt-0.5">
            {hoverIndex !== null ? `Time: ${activePoint.timestamp}` : "Real-time Ticks"}
          </p>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div ref={containerRef} className="relative w-full h-[240px] select-none">
        <svg
          className="w-full h-full cursor-crosshair overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id={`gradient-${stock.symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.16} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0.00} />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {gridYCoords.map((y, i) => {
            const correspondingPrice = yMax - (gridLevels[i] * yRange);
            return (
              <g key={`grid-line-${i}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="rgba(63, 63, 70, 0.3)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={width - paddingRight - 8}
                  y={y - 4}
                  fill="rgba(161, 161, 170, 0.4)"
                  className="font-mono text-[9px] text-right text-anchor-end"
                  textAnchor="end"
                >
                  ${correspondingPrice.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Area under curve */}
          <path d={areaPath} fill={`url(#gradient-${stock.symbol})`} />

          {/* Line Path */}
          <path
            d={linePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover interactive guideline and indicators */}
          {hoverCoords && (
            <g>
              {/* Vertical line tracker */}
              <line
                x1={hoverCoords.x}
                y1={paddingTop}
                x2={hoverCoords.x}
                y2={paddingTop + chartHeight}
                stroke="rgba(161, 161, 170, 0.4)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              {/* Pulsing indicator node */}
              <circle
                cx={hoverCoords.x}
                cy={hoverCoords.y}
                r="6"
                fill={strokeColor}
                stroke="#09090b"
                strokeWidth="2.5"
                className="shadow-lg"
              />
            </g>
          )}

          {/* Static terminal dot when not hovered */}
          {!hoverCoords && points.length > 0 && (
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r="5"
              fill={strokeColor}
              className="animate-pulse"
            />
          )}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoverIndex !== null && hoverCoords && (
          <div
            className="absolute z-10 bg-zinc-950/90 border border-zinc-850 px-2.5 py-1.5 rounded-xl shadow-xl text-xs font-mono backdrop-blur-md pointer-events-none transform -translate-x-1/2 -translate-y-full"
            style={{
              left: `${hoverCoords.x}px`,
              top: `${hoverCoords.y - 12}px`,
            }}
          >
            <div className="text-[10px] text-zinc-500">{activePoint.timestamp}</div>
            <div className="text-white font-bold mt-0.5">${activePoint.price.toFixed(2)}</div>
          </div>
        )}
      </div>

      {/* Chart Footer Metrics Grid */}
      <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-zinc-800/60 text-center font-mono">
        <div>
          <span className="block text-[9px] uppercase text-zinc-500 tracking-wider">Open</span>
          <span className="text-xs font-medium text-zinc-300 mt-0.5">${stock.open.toFixed(2)}</span>
        </div>
        <div>
          <span className="block text-[9px] uppercase text-zinc-500 tracking-wider">High</span>
          <span className="text-xs font-medium text-emerald-400 mt-0.5">${stock.high.toFixed(2)}</span>
        </div>
        <div>
          <span className="block text-[9px] uppercase text-zinc-500 tracking-wider">Low</span>
          <span className="text-xs font-medium text-rose-400 mt-0.5">${stock.low.toFixed(2)}</span>
        </div>
        <div>
          <span className="block text-[9px] uppercase text-zinc-500 tracking-wider">Volume</span>
          <span className="text-xs font-medium text-zinc-300 mt-0.5">{stock.volume}</span>
        </div>
      </div>
    </div>
  );
}
