import { Stock, MarketNews } from "./types";

// Generates a mock historical price array
export function generateHistory(basePrice: number, points: number = 30): { timestamp: string; price: number }[] {
  const history: { timestamp: string; price: number }[] = [];
  const now = new Date();
  
  for (let i = points; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 5 * 60 * 1000); // 5 minutes intervals
    // Random walk with positive drift
    const change = (Math.random() - 0.48) * (basePrice * 0.015);
    const price = Math.max(1.0, basePrice + change);
    history.push({
      timestamp: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: parseFloat(price.toFixed(2))
    });
  }
  return history;
}

export const INITIAL_STOCKS: Stock[] = [
  {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    price: 875.12,
    change: 36.54,
    changePercent: 4.35,
    high: 885.00,
    low: 840.12,
    open: 842.00,
    volume: "42.1M",
    marketCap: "2.19T",
    peRatio: "74.2",
    history: generateHistory(875.12),
    sector: "Technology"
  },
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 182.45,
    change: 2.23,
    changePercent: 1.24,
    high: 183.92,
    low: 180.88,
    open: 181.10,
    volume: "51.4M",
    marketCap: "2.82T",
    peRatio: "26.8",
    history: generateHistory(182.45),
    sector: "Technology"
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    price: 415.80,
    change: 3.22,
    changePercent: 0.78,
    high: 418.50,
    low: 412.30,
    open: 413.40,
    volume: "22.8M",
    marketCap: "3.09T",
    peRatio: "35.1",
    history: generateHistory(415.80),
    sector: "Technology"
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    price: 175.50,
    change: -0.74,
    changePercent: -0.42,
    high: 177.80,
    low: 174.12,
    open: 177.00,
    volume: "28.5M",
    marketCap: "2.18T",
    peRatio: "24.5",
    history: generateHistory(175.50),
    sector: "Technology"
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    price: 177.20,
    change: -3.89,
    changePercent: -2.15,
    high: 182.10,
    low: 175.50,
    open: 181.50,
    volume: "86.1M",
    marketCap: "564B",
    peRatio: "41.6",
    history: generateHistory(177.20),
    sector: "Automotive"
  },
  {
    symbol: "AMZN",
    name: "Amazon.com, Inc.",
    price: 180.10,
    change: 0.22,
    changePercent: 0.12,
    high: 181.50,
    low: 178.60,
    open: 179.90,
    volume: "33.7M",
    marketCap: "1.87T",
    peRatio: "62.4",
    history: generateHistory(180.10),
    sector: "Consumer Discretionary"
  },
  {
    symbol: "COIN",
    name: "Coinbase Global, Inc.",
    price: 225.50,
    change: -8.90,
    changePercent: -3.80,
    high: 236.40,
    low: 221.20,
    open: 234.80,
    volume: "9.2M",
    marketCap: "54.2B",
    peRatio: "32.8",
    history: generateHistory(225.50),
    sector: "Financial Services"
  },
  {
    symbol: "BTC-USD",
    name: "Bitcoin / USD",
    price: 64250.00,
    change: 918.50,
    changePercent: 1.45,
    high: 64800.00,
    low: 63100.00,
    open: 63331.50,
    volume: "31.2B",
    marketCap: "1.26T",
    peRatio: "N/A",
    history: generateHistory(64250.00),
    sector: "Cryptocurrency"
  }
];

export const INITIAL_NEWS: MarketNews[] = [
  {
    id: "news-1",
    title: "NVIDIA Unveils Next-Gen AI Microchips with 10x Performance Gains",
    source: "Bloomberg Financial",
    time: "10 mins ago",
    sentiment: "bullish",
    summary: "NVIDIA announced its newest architecture designed specifically for large language models, triggering strong demand sentiment across institutional buyers."
  },
  {
    id: "news-2",
    title: "Federal Reserve Signals Interest Rates to Remain Steady This Quarter",
    source: "Wall Street Post",
    time: "45 mins ago",
    sentiment: "neutral",
    summary: "The Fed Chairman indicated inflation remains sticky, prompting analysts to defer rate-cut forecasts to late Q3."
  },
  {
    id: "news-3",
    title: "Tech Sector Faces Margin Pressures as Cloud Costs Rise",
    source: "Market Watch",
    time: "2 hours ago",
    sentiment: "bearish",
    summary: "Increased infrastructure spending and hyper-scale server buildouts are squeezing near-term profit margins for second-tier enterprise providers."
  },
  {
    id: "news-4",
    title: "Retail Trading Inflows Hit Highest Levels Since 2021",
    source: "Financial Times",
    time: "3 hours ago",
    sentiment: "bullish",
    summary: "Brokerage reports indicate high volumes of retail trading capital flowing back into crypto-adjacent and high-beta tech equities."
  }
];
