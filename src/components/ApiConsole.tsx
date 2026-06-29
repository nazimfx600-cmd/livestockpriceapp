import { useState } from "react";
import { ApiLogEntry, Stock, PortfolioItem, TradeRecord } from "../types";
import { 
  Terminal, 
  Copy, 
  Check, 
  Code, 
  Play, 
  Cpu, 
  RefreshCw,
  Download,
  FileSpreadsheet,
  FileDown,
  Database,
  Info,
  TrendingUp,
  Sparkles,
  FileJson
} from "lucide-react";

interface ApiConsoleProps {
  logs: ApiLogEntry[];
  clearLogs: () => void;
  stocks: Stock[];
  portfolio: PortfolioItem[];
  cash: number;
  tradeHistory?: TradeRecord[];
}

export default function ApiConsole({ logs, clearLogs, stocks, portfolio, cash, tradeHistory = [] }: ApiConsoleProps) {
  const [activeTab, setActiveTab] = useState<'logs' | 'data-export' | 'flutter-guide' | 'json-schema'>('logs');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const downloadPriceHistoryCSV = () => {
    const headers = ["Symbol", "Company Name", "Sector", "Timestamp", "Price"];
    const rows: any[][] = [];
    stocks.forEach((stock) => {
      if (stock.history && stock.history.length > 0) {
        stock.history.forEach((h) => {
          rows.push([
            stock.symbol,
            stock.name,
            stock.sector,
            h.timestamp,
            h.price.toFixed(stock.symbol.includes("BTC") ? 0 : 2)
          ]);
        });
      } else {
        rows.push([
          stock.symbol,
          stock.name,
          stock.sector,
          new Date().toISOString(),
          stock.price.toFixed(stock.symbol.includes("BTC") ? 0 : 2)
        ]);
      }
    });

    handleDownloadCSV(headers, rows, `stock_price_history_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const downloadPortfolioCSV = () => {
    const headers = [
      "Symbol", 
      "Shares Owned", 
      "Avg Buy Price ($)", 
      "Current Price ($)", 
      "Market Value ($)", 
      "Total Cost ($)", 
      "Net Profit/Loss ($)", 
      "Return (%)"
    ];
    
    const rows: any[][] = portfolio.map((item) => {
      const stock = stocks.find((s) => s.symbol === item.symbol);
      const currentPrice = stock ? stock.price : item.avgBuyPrice;
      const marketValue = item.shares * currentPrice;
      const totalCost = item.shares * item.avgBuyPrice;
      const netProfit = marketValue - totalCost;
      const returnPercent = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

      return [
        item.symbol,
        item.shares,
        item.avgBuyPrice.toFixed(2),
        currentPrice.toFixed(2),
        marketValue.toFixed(2),
        totalCost.toFixed(2),
        netProfit.toFixed(2),
        returnPercent.toFixed(2)
      ];
    });

    // Append cash
    rows.push([
      "CASH_LIQUIDITY",
      "1",
      cash.toFixed(2),
      cash.toFixed(2),
      cash.toFixed(2),
      cash.toFixed(2),
      "0.00",
      "0.00"
    ]);

    handleDownloadCSV(headers, rows, `user_portfolio_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const downloadTradeHistoryJSON = () => {
    const report = {
      exportedAt: new Date().toISOString(),
      accountSummary: {
        totalCashBalance: cash,
        totalHoldingsCount: portfolio.length,
        startingCapital: 100000.00
      },
      trades: tradeHistory
    };

    const jsonString = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `trade_history_backup_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadSessionLogsJSON = () => {
    const report = {
      exportedAt: new Date().toISOString(),
      logsCount: logs.length,
      logs: logs
    };

    const jsonString = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `api_session_logs_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = (headers: string[], rows: any[][], filename: string) => {
    const csvContent = [
      headers.join(","),
      ...rows.map(row => 
        row.map(val => {
          if (val === undefined || val === null) return "";
          const str = String(val);
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const flutterModelCode = `// 1. Stock Model & JSON Parsing
class Stock {
  final String symbol;
  final String name;
  final double price;
  final double change;
  final double changePercent;
  final String volume;
  final String marketCap;
  final String sector;

  Stock({
    required this.symbol,
    required this.name,
    required this.price,
    required this.change,
    required this.changePercent,
    required this.volume,
    required this.marketCap,
    required this.sector,
  });

  // Safe JSON Parsing / Deserialization
  factory Stock.fromJson(Map<String, dynamic> json) {
    return Stock(
      symbol: json['symbol'] ?? '',
      name: json['name'] ?? '',
      // Safe casting in case of integers vs doubles
      price: (json['price'] as num).toDouble(),
      change: (json['change'] as num).toDouble(),
      changePercent: (json['changePercent'] as num).toDouble(),
      volume: json['volume'] ?? '0',
      marketCap: json['marketCap'] ?? '0',
      sector: json['sector'] ?? 'General',
    );
  }

  Map<String, dynamic> toJson() => {
    'symbol': symbol,
    'name': name,
    'price': price,
    'change': change,
    'changePercent': changePercent,
    'volume': volume,
    'marketCap': marketCap,
    'sector': sector,
  };
}`;

  const flutterServiceCode = `// 2. Flutter Service Integration
import 'dart:convert';
import 'http/http.dart' as http;

class StockService {
  static const String baseUrl = 'https://api.example.com/api';

  // Fetch stocks asynchronously
  Future<List<Stock>> fetchStocks() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/stocks'));
      
      if (response.statusCode == 200) {
        // Decode raw JSON string to generic List
        final List<dynamic> decodedJson = json.decode(response.body);
        return decodedJson.map((item) => Stock.fromJson(item)).toList();
      } else {
        throw Exception('Server error: \${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to load stocks: $e');
    }
  }

  // Poll server for live ticks using Dart Streams
  Stream<List<Stock>> streamLiveTicks(Duration interval) async* {
    while (true) {
      await Future.delayed(interval);
      try {
        final stocks = await fetchStocks();
        yield stocks;
      } catch (e) {
        print('Polling error: $e');
      }
    }
  }
}`;

  const flutterStateCode = `// 3. State Management with ChangeNotifier
import 'package:flutter/material.dart';

class StockProvider extends ChangeNotifier {
  final StockService _service = StockService();
  List<Stock> _stocks = [];
  bool _isLoading = false;
  String? _error;

  List<Stock> get stocks => _stocks;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Initialize and load
  Future<void> loadStocks() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _stocks = await _service.fetchStocks();
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Real-time update binding
  void bindRealtimeTicks() {
    _service.streamLiveTicks(Duration(seconds: 4)).listen((updatedStocks) {
      _stocks = updatedStocks;
      notifyListeners(); // Auto-rebuilds Flutter Widgets!
    });
  }
}`;

  const jsonSchemaCode = `{
  "event": "stock_tick",
  "symbol": "NVDA",
  "name": "NVIDIA Corporation",
  "price": 875.12,
  "change": 36.54,
  "changePercent": 4.35,
  "volume": "42.1M",
  "marketCap": "2.19T",
  "peRatio": "74.2",
  "timestamp": "2026-06-28T17:18:02.450Z",
  "sector": "Technology"
}`;

  return (
    <div id="api-console-root" className="bg-zinc-950 rounded-3xl border border-zinc-800/80 p-5 flex flex-col h-[520px] shadow-2xl relative overflow-hidden animate-fade-in">
      {/* Background radial accent */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/3 rounded-full filter blur-[60px] pointer-events-none" />

      {/* Header Tabs */}
      <div className="flex flex-wrap justify-between items-center pb-4 border-b border-zinc-800 gap-3 z-10">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <h3 className="font-sans font-bold text-white text-base">API Console & JSON Parser</h3>
        </div>

        <div className="flex bg-zinc-900 border border-zinc-800/80 p-1 rounded-xl text-xs font-mono">
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              activeTab === 'logs' ? "bg-emerald-500 text-zinc-950 font-bold" : "text-zinc-400 hover:text-white"
            }`}
          >
            Live Logs ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab('data-export')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1 cursor-pointer ${
              activeTab === 'data-export' ? "bg-emerald-500 text-zinc-950 font-bold" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Database className="w-3.5 h-3.5" /> Data & Backups
          </button>
          <button
            onClick={() => setActiveTab('flutter-guide')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1 cursor-pointer ${
              activeTab === 'flutter-guide' ? "bg-emerald-500 text-zinc-950 font-bold" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Code className="w-3.5 h-3.5" /> Flutter Guide
          </button>
          <button
            onClick={() => setActiveTab('json-schema')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              activeTab === 'json-schema' ? "bg-emerald-500 text-zinc-950 font-bold" : "text-zinc-400 hover:text-white"
            }`}
          >
            Schema Template
          </button>
        </div>
      </div>

      {/* Content panes */}
      <div className="flex-1 overflow-y-auto mt-4 font-mono text-xs scrollbar-thin scrollbar-thumb-zinc-800">
        {activeTab === 'logs' && (
          <div className="flex flex-col gap-3 min-h-full">
            {logs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 py-12 gap-2">
                <RefreshCw className="w-8 h-8 text-zinc-650 animate-spin" />
                <p>Awaiting live market events and ticker ticks...</p>
                <p className="text-[10px] text-zinc-650">(Prices update automatically every 4s)</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-[10px] text-zinc-500 pb-1 border-b border-zinc-900 mb-2 uppercase tracking-widest">
                  <span>Stream Terminal Timeline</span>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={downloadSessionLogsJSON} 
                      className="hover:text-emerald-400 transition cursor-pointer flex items-center gap-1.5 uppercase font-mono tracking-widest"
                      title="Export current session API logs as JSON"
                    >
                      <Download className="w-3.5 h-3.5 stroke-[2.5]" /> Export Logs JSON
                    </button>
                    <span className="text-zinc-800">|</span>
                    <button onClick={clearLogs} className="hover:text-rose-400 transition cursor-pointer">Clear Console</button>
                  </div>
                </div>
                {logs.slice().reverse().map((log) => {
                  const isSuccess = log.status === 200 || log.status === 'LIVE';
                  return (
                    <div key={log.id} className="bg-zinc-900/50 hover:bg-zinc-900/80 p-3 rounded-xl border border-zinc-900/80 transition flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${isSuccess ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                          <span className="font-bold text-emerald-400">{log.method}</span>
                          <span className="text-zinc-400 truncate max-w-[150px]">{log.urlOrTopic}</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500">
                          <span>{log.timestamp}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            isSuccess ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {log.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-[11px] text-zinc-300 font-sans border-l-2 border-zinc-700 pl-2">
                        {log.explanation}
                      </div>

                      <div className="relative mt-1">
                        <pre className="bg-zinc-950 p-2 rounded-lg border border-zinc-900 overflow-x-auto text-[10px] text-zinc-400 select-all leading-tight scrollbar-none">
                          {log.payload}
                        </pre>
                        <button
                          onClick={() => handleCopy(log.payload, log.id)}
                          className="absolute right-1.5 top-1.5 p-1 bg-zinc-900 rounded border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                          title="Copy payload JSON"
                        >
                          {copiedSection === log.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'data-export' && (
          <div className="space-y-5 animate-fade-in text-zinc-300">
            {/* Elegant Banner */}
            <div className="bg-emerald-950/10 rounded-2xl p-4 border border-emerald-900/20 text-xs text-zinc-300 leading-relaxed font-sans flex items-start gap-3">
              <Database className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-emerald-300 block mb-0.5">Structured CSV File Compiler</strong>
                Compile local market state and transaction ledgers down to comma-separated values (CSV) format. These exports are compatible with standard database seed scripts, analytical tools (like Excel, Python Pandas), or personal accounting notebooks.
              </div>
            </div>

            {/* Grid Container */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Card 1: Stock Price History */}
              <div className="bg-zinc-900/35 border border-zinc-850 rounded-2xl p-4 flex flex-col justify-between h-56 hover:border-zinc-800 transition">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                      <TrendingUp className="w-4 h-4" />
                    </span>
                    <span className="text-[9px] font-mono font-bold bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full uppercase">
                      Market Data
                    </span>
                  </div>
                  <h4 className="text-xs font-bold font-sans text-white">Historical Stock Prices</h4>
                  <p className="text-[11px] text-zinc-400 font-sans mt-1 leading-relaxed">
                    Downloads the historical valuation logs for all {stocks.length} tracked assets (including Bitcoin). Consolidates all 5-minute ticks compiled in the active session.
                  </p>
                </div>
                
                <div className="pt-3 border-t border-zinc-900 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Fields: Sym, Name, Sector, Time, Price
                  </span>
                  <button
                    onClick={downloadPriceHistoryCSV}
                    className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-450 text-zinc-950 rounded-xl font-bold font-sans text-[11px] transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/5 active:scale-95 animate-pulse"
                  >
                    <Download className="w-3.5 h-3.5 stroke-[2.5]" /> Download CSV
                  </button>
                </div>
              </div>

              {/* Card 2: User Portfolio Ledger */}
              <div className="bg-zinc-900/35 border border-zinc-850 rounded-2xl p-4 flex flex-col justify-between h-56 hover:border-zinc-800 transition">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                      <FileSpreadsheet className="w-4 h-4" />
                    </span>
                    <span className="text-[9px] font-mono font-bold bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full uppercase">
                      Account Ledger
                    </span>
                  </div>
                  <h4 className="text-xs font-bold font-sans text-white">Account Position Ledger</h4>
                  <p className="text-[11px] text-zinc-400 font-sans mt-1 leading-relaxed">
                    Generates a report of active holdings, shares owned, baseline cost-basis (Avg Buy Price), current live valuations, cash reserves, and session profit/loss metrics.
                  </p>
                </div>

                <div className="pt-3 border-t border-zinc-900 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {portfolio.length + 1} Records compiled
                  </span>
                  <button
                    onClick={downloadPortfolioCSV}
                    className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-450 text-zinc-950 rounded-xl font-bold font-sans text-[11px] transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/5 active:scale-95 animate-pulse"
                  >
                    <Download className="w-3.5 h-3.5 stroke-[2.5]" /> Download CSV
                  </button>
                </div>
              </div>

              {/* Card 3: User Trade History Backup */}
              <div className="bg-zinc-900/35 border border-zinc-850 rounded-2xl p-4 flex flex-col justify-between h-56 hover:border-zinc-800 transition">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                      <FileJson className="w-4 h-4" />
                    </span>
                    <span className="text-[9px] font-mono font-bold bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full uppercase">
                      External Backup
                    </span>
                  </div>
                  <h4 className="text-xs font-bold font-sans text-white">Trade History Backup (JSON)</h4>
                  <p className="text-[11px] text-zinc-400 font-sans mt-1 leading-relaxed">
                    Generates and downloads a complete, structured JSON report of all trade executions. Suitable for external backup, accounting logs, or importing into external wallets.
                  </p>
                </div>

                <div className="pt-3 border-t border-zinc-900 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {tradeHistory.length} Trades recorded
                  </span>
                  <button
                    onClick={downloadTradeHistoryJSON}
                    className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-450 text-zinc-950 rounded-xl font-bold font-sans text-[11px] transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/5 active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5 stroke-[2.5]" /> Backup JSON
                  </button>
                </div>
              </div>

              {/* Card 4: Session API Logs Backup */}
              <div className="bg-zinc-900/35 border border-zinc-850 rounded-2xl p-4 flex flex-col justify-between h-56 hover:border-zinc-800 transition">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                      <Terminal className="w-4 h-4" />
                    </span>
                    <span className="text-[9px] font-mono font-bold bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full uppercase">
                      API Backup
                    </span>
                  </div>
                  <h4 className="text-xs font-bold font-sans text-white">Live API Logs Backup (JSON)</h4>
                  <p className="text-[11px] text-zinc-400 font-sans mt-1 leading-relaxed">
                    Downloads all API and event streams logged in the active session. This structured JSON ledger includes method, path, response codes, payloads, and timestamps.
                  </p>
                </div>

                <div className="pt-3 border-t border-zinc-900 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {logs.length} Log entries recorded
                  </span>
                  <button
                    onClick={downloadSessionLogsJSON}
                    className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-450 text-zinc-950 rounded-xl font-bold font-sans text-[11px] transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/5 active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5 stroke-[2.5]" /> Export Logs JSON
                  </button>
                </div>
              </div>

            </div>

            {/* Technical specification details */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 text-[11px] font-sans text-zinc-400 leading-relaxed flex items-start gap-2.5">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-zinc-300 font-sans">Serialization Engine:</strong>
                <p className="mt-1 text-zinc-450">
                  Data rows are parsed on-the-fly inside the client container. Strings containing special characters, double quotes, or commas are automatically wrapped in double-quote characters with nested quotes escaped according to standard RFC 4180 rules. Files are generated as memory-efficient Blobs to avoid URI length constraints and ensure seamless downloads.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'flutter-guide' && (
          <div className="space-y-6 text-zinc-300">
            <div className="bg-emerald-950/10 rounded-xl p-3 border border-emerald-900/20 text-xs text-emerald-200 leading-relaxed font-sans flex items-start gap-2">
              <Cpu className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Flutter Practice Guide:</strong> Below are production-ready code blocks illustrating how standard Flutter apps map JSON payloads, execute network integrations, and manage real-time UI state.
              </div>
            </div>

            {/* Model Section */}
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-zinc-900 px-3 py-2 rounded-lg">
                <span className="text-xs font-semibold text-emerald-400 font-sans">1. Stock Model & Deserializer</span>
                <button
                  onClick={() => handleCopy(flutterModelCode, 'model')}
                  className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white transition cursor-pointer"
                >
                  {copiedSection === 'model' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedSection === 'model' ? "Copied" : "Copy Code"}
                </button>
              </div>
              <pre className="bg-zinc-950 p-3 rounded-xl border border-zinc-900 overflow-x-auto text-[11px] text-zinc-400 leading-relaxed max-h-[220px]">
                {flutterModelCode}
              </pre>
            </div>

            {/* Service Section */}
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-zinc-900 px-3 py-2 rounded-lg">
                <span className="text-xs font-semibold text-emerald-400 font-sans">2. HTTP Requests & Live Streams</span>
                <button
                  onClick={() => handleCopy(flutterServiceCode, 'service')}
                  className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white transition cursor-pointer"
                >
                  {copiedSection === 'service' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedSection === 'service' ? "Copied" : "Copy Code"}
                </button>
              </div>
              <pre className="bg-zinc-950 p-3 rounded-xl border border-zinc-900 overflow-x-auto text-[11px] text-zinc-400 leading-relaxed max-h-[220px]">
                {flutterServiceCode}
              </pre>
            </div>

            {/* Provider Section */}
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-zinc-900 px-3 py-2 rounded-lg">
                <span className="text-xs font-semibold text-emerald-400 font-sans">3. State Management (Provider)</span>
                <button
                  onClick={() => handleCopy(flutterStateCode, 'provider')}
                  className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white transition cursor-pointer"
                >
                  {copiedSection === 'provider' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedSection === 'provider' ? "Copied" : "Copy Code"}
                </button>
              </div>
              <pre className="bg-zinc-950 p-3 rounded-xl border border-zinc-900 overflow-x-auto text-[11px] text-zinc-400 leading-relaxed max-h-[220px]">
                {flutterStateCode}
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'json-schema' && (
          <div className="space-y-4 text-zinc-300 font-sans">
            <p className="text-xs text-zinc-400">
              The live stock ticker feeds raw telemetry ticks down to the client. This is the exact schema structure emitted during live updates, ready to copy and feed into tools like QuickType to auto-generate Dart or TS classes:
            </p>

            <div className="relative">
              <pre className="bg-zinc-950 p-3 rounded-xl border border-zinc-900 text-zinc-400 text-xs font-mono leading-relaxed overflow-x-auto">
                {jsonSchemaCode}
              </pre>
              <button
                onClick={() => handleCopy(jsonSchemaCode, 'schema')}
                className="absolute right-3 top-3 p-1 bg-zinc-900 rounded border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
              >
                {copiedSection === 'schema' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px] bg-zinc-900/30 p-3 rounded-xl border border-zinc-800/50">
              <div>
                <h4 className="font-semibold text-zinc-300 font-sans">Tick Parsing Mechanics</h4>
                <ul className="list-disc pl-4 mt-1.5 space-y-1 text-zinc-450">
                  <li><strong>volume</strong> & <strong>marketCap</strong> represent scale.</li>
                  <li><strong>peRatio</strong> measures price-to-earnings ratios.</li>
                  <li><strong>changePercent</strong> drives green/red UI coloring.</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-zinc-300 font-sans">API Protocol Binding</h4>
                <p className="text-zinc-400 mt-1.5 leading-relaxed">
                  WebSockets are typically preferred for true sub-second financial feeds, while standard REST pollers represent a simpler and highly predictable initial learning step.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
