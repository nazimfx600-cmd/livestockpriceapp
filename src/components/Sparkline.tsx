import React from "react";
import { StockHistoryItem } from "../types";

interface SparklineProps {
  history: StockHistoryItem[];
  changePercent: number;
  symbol: string;
}

export default function Sparkline({ history, changePercent, symbol }: SparklineProps) {
  if (!history || history.length < 2) {
    return (
      <div className="w-24 h-6 flex items-center justify-center text-[10px] text-zinc-600 font-mono">
        No Trend
      </div>
    );
  }

  // Extract prices to determine min/max bounds
  const prices = history.map((h) => h.price);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const priceRange = maxPrice - minPrice || 0.1;

  // Render dimensions
  const width = 110;
  const height = 30;
  const paddingY = 4;
  const usableHeight = height - paddingY * 2;

  // Transform prices to coordinate points
  const points = history.map((item, index) => {
    const x = (index / (history.length - 1)) * width;
    // Invert Y axis for SVG (0,0 is top-left)
    const y = paddingY + usableHeight - ((item.price - minPrice) / priceRange) * usableHeight;
    return { x, y };
  });

  // Create SVG path string
  const linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ");
  
  // Closed area path for gradient
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  // Color theme based on performance
  const isPositive = changePercent >= 0;
  const strokeColor = isPositive ? "#34d399" : "#f87171"; // emerald-400 : rose-400
  const gradientId = `sparkline-grad-${symbol}-${Math.random().toString(36).substring(2, 6)}`;

  // Last point coordinates for the glowing dot
  const lastPoint = points[points.length - 1];

  return (
    <div className="inline-flex items-center" id={`sparkline-${symbol}`}>
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Shaded Area Underneath */}
        <path
          d={areaPath}
          fill={`url(#${gradientId})`}
          stroke="none"
          pointerEvents="none"
        />

        {/* Sparkline Stroke */}
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="none"
        />

        {/* Glow and Latest Tick Dot */}
        {lastPoint && (
          <>
            {/* Pulsing ring */}
            <circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r="3"
              fill={strokeColor}
              className="animate-pulse"
              opacity="0.4"
            />
            {/* Center dot */}
            <circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r="1.5"
              fill={strokeColor}
            />
          </>
        )}
      </svg>
    </div>
  );
}
