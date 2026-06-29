export interface StockHistoryItem {
  timestamp: string;
  price: number;
}

export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  volume: string;
  marketCap: string;
  peRatio: string;
  history: StockHistoryItem[];
  sector: string;
}

export interface PortfolioItem {
  symbol: string;
  shares: number;
  avgBuyPrice: number;
}

export interface MarketNews {
  id: string;
  title: string;
  source: string;
  time: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  summary: string;
}

export interface AIAnalysis {
  symbol: string;
  rating: 'Buy' | 'Hold' | 'Sell';
  sentimentScore: number; // 0 to 100
  summary: string;
  pros: string[];
  cons: string[];
  growthDrivers: string[];
  technicalOutlook: string;
}

export interface ApiLogEntry {
  id: string;
  timestamp: string;
  action: string;
  method: 'GET' | 'POST' | 'WS_TICK';
  urlOrTopic: string;
  status: number | 'LIVE';
  payload: string; // JSON string
  explanation: string;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  priceThreshold: number;
  type: 'above' | 'below';
  isTriggered: boolean;
  triggeredAt?: string;
  createdAt: string;
}

export interface TradeRecord {
  id: string;
  timestamp: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  shares: number;
  price: number;
  total: number;
}

export interface SupportTicket {
  id: string;
  title: string;
  description: string;
  category: 'Technical' | 'Account' | 'Billing' | 'Feedback';
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'In Progress' | 'Resolved';
  createdAt: string;
  terminalStatus: {
    connectionState: 'CONNECTED' | 'DISCONNECTED';
    activeTab: string;
    totalTrades: number;
    cash: number;
    portfolioItems: number;
  };
}



