import { useState, useEffect } from "react";
import { Stock, PortfolioItem, ApiLogEntry, PriceAlert, TradeRecord } from "./types";
import { INITIAL_STOCKS, INITIAL_NEWS, generateHistory } from "./initialData";
import StockList from "./components/StockList";
import StockChart from "./components/StockChart";
import Portfolio from "./components/Portfolio";
import AIAnalyst from "./components/AIAnalyst";
import ApiConsole from "./components/ApiConsole";
import PriceAlerts from "./components/PriceAlerts";
import PortfolioPerformance from "./components/PortfolioPerformance";
import MarketNews from "./components/MarketNews";
import MoneyWallet from "./components/MoneyWallet";
import SupportCenter from "./components/SupportCenter";
import MyAccount from "./components/MyAccount";
import HomeDashboard from "./components/HomeDashboard";
import TradeHistoryView from "./components/TradeHistoryView";
import AdminPanel from "./components/AdminPanel";
import { motion, AnimatePresence } from "motion/react";
import { Activity, Cpu, Sparkles, Wallet, Terminal, RefreshCw, Layers, Bell, X, BarChart3, Landmark, LogIn, LogOut, User as UserIcon, LifeBuoy, Home, History, Wrench } from "lucide-react";
import { auth, db } from "./lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc, deleteDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import AuthModal from "./components/AuthModal";

interface ToastNotification {
  id: string;
  symbol: string;
  message: string;
  threshold: number;
  type: 'above' | 'below';
  createdAt: string;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [stocks, setStocks] = useState<Stock[]>(INITIAL_STOCKS);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("NVDA");
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(() => {
    try {
      const saved = localStorage.getItem("portfolio_holdings");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { symbol: "AAPL", shares: 15, avgBuyPrice: 180.20 },
      { symbol: "NVDA", shares: 8, avgBuyPrice: 850.00 }
    ];
  });
  const [cash, setCash] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("portfolio_cash");
      if (saved) return parseFloat(saved);
    } catch {}
    return 92450.00; // 100K initial minus buy costs
  });
  const [tradeHistory, setTradeHistory] = useState<TradeRecord[]>(() => {
    try {
      const saved = localStorage.getItem("trade_history");
      if (saved) return JSON.parse(saved);
    } catch {}
    // Seed initial records that correspond to the starting portfolio holdings
    return [
      {
        id: "trade-init-1",
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(), // 24 hours ago
        symbol: "AAPL",
        type: "BUY",
        shares: 15,
        price: 180.20,
        total: 2703.00
      },
      {
        id: "trade-init-2",
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), // 4 hours ago
        symbol: "NVDA",
        type: "BUY",
        shares: 8,
        price: 850.00,
        total: 6800.00
      }
    ];
  });
  const [logs, setLogs] = useState<ApiLogEntry[]>([]);
  const [tickerUpdates, setTickerUpdates] = useState<Record<string, 'up' | 'down' | null>>({});
  const [currentTime, setCurrentTime] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'home' | 'trade' | 'history' | 'wallet' | 'alerts' | 'performance' | 'ai' | 'console' | 'support' | 'account' | 'admin'>('home');
  
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    try {
      const saved = localStorage.getItem("price_alerts");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [toasts, setToasts] = useState<ToastNotification[]>([]);


  // Selected Stock Helper
  const selectedStock = stocks.find((s) => s.symbol === selectedSymbol) || stocks[0];

  // Set real-time clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const clockInterval = setInterval(updateClock, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Handle Stripe callback URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeStatus = params.get("stripe_status");
    const amountStr = params.get("amount");

    if (stripeStatus === "success" && amountStr) {
      const depositAmount = parseFloat(amountStr);
      if (!isNaN(depositAmount) && depositAmount > 0) {
        // Prevent double crediting by recording the transaction
        const sessionId = params.get("session_id") || "any";
        const processedTxKey = `stripe_processed_${depositAmount}_${sessionId}`;
        
        if (!localStorage.getItem(processedTxKey)) {
          localStorage.setItem(processedTxKey, "true");
          setCash((prev) => {
            const newCash = prev + depositAmount;
            logApiEvent(
              'POST',
              '/api/wallet/stripe-callback',
              200,
              `Stripe Credit Complete: +$${depositAmount}`,
              { amount: depositAmount, newBalance: newCash, session_id: sessionId },
              `Stripe secure callback verified. Successfully credited $${depositAmount.toLocaleString()} to active trading liquidity.`
            );
            return parseFloat(newCash.toFixed(2));
          });

          // Insert into local wallet history so the money ledger page is synced
          try {
            const savedHistoryStr = localStorage.getItem("wallet_history");
            const history = savedHistoryStr ? JSON.parse(savedHistoryStr) : [];
            const isSandbox = sessionId.startsWith("sandbox_");
            const newTx = {
              id: `tx-stripe-${Date.now()}`,
              timestamp: new Date().toISOString(),
              type: 'DEPOSIT',
              amount: depositAmount,
              method: isSandbox ? "Stripe Sandbox Card Checkout" : "Stripe Secured Card Checkout",
              status: 'COMPLETED',
              reference: isSandbox ? `ST-SND-${Math.floor(10000 + Math.random() * 90000)}` : `ST-STR-${Math.floor(10000 + Math.random() * 90000)}`
            };
            localStorage.setItem("wallet_history", JSON.stringify([newTx, ...history]));
          } catch (e) {
            console.error("Error writing wallet history:", e);
          }
        }
      }
      
      // Clean up URL parameters to keep it pristine and prevent replay
      const url = new URL(window.location.href);
      url.searchParams.delete("stripe_status");
      url.searchParams.delete("amount");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, document.title, url.toString());
      
      // Pivot to wallet tab to show the update
      setActiveTab('wallet');
    }
  }, []);

  // Clear log history
  const clearLogs = () => setLogs([]);

  // Log API Event Helper
  const logApiEvent = (
    method: 'GET' | 'POST' | 'WS_TICK',
    urlOrTopic: string,
    status: number | 'LIVE',
    action: string,
    payloadObj: any,
    explanation: string
  ) => {
    const newEntry: ApiLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      method,
      urlOrTopic,
      status,
      action,
      payload: JSON.stringify(payloadObj, null, 2),
      explanation
    };
    setLogs((prev) => [...prev.slice(-49), newEntry]); // keep last 50 logs max
  };

  // Persist alerts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("price_alerts", JSON.stringify(alerts));
    } catch (e) {
      // ignore
    }
  }, [alerts]);

  // Persist trade history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("trade_history", JSON.stringify(tradeHistory));
    } catch (e) {
      // ignore
    }
  }, [tradeHistory]);

  // Persist portfolio holdings to localStorage and cloud
  useEffect(() => {
    try {
      localStorage.setItem("portfolio_holdings", JSON.stringify(portfolio));
    } catch (e) {}

    if (currentUser && !authLoading) {
      const savePortfolioToCloud = async () => {
        try {
          const portfolioRef = doc(db, "users", currentUser.uid, "portfolio", "main");
          await setDoc(portfolioRef, {
            holdings: portfolio,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (err) {
          console.error("Error saving portfolio:", err);
        }
      };
      savePortfolioToCloud();
    }
  }, [portfolio, currentUser, authLoading]);

  // Persist portfolio cash balance to localStorage and cloud
  useEffect(() => {
    try {
      localStorage.setItem("portfolio_cash", cash.toString());
    } catch (e) {}

    if (currentUser && !authLoading) {
      const saveCashToCloud = async () => {
        try {
          const portfolioRef = doc(db, "users", currentUser.uid, "portfolio", "main");
          await setDoc(portfolioRef, {
            cash,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (err) {
          console.error("Error saving cash:", err);
        }
      };
      saveCashToCloud();
    }
  }, [cash, currentUser, authLoading]);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    // Check if there is a local mock user saved
    const savedLocalUser = localStorage.getItem("local_mock_user");
    if (savedLocalUser) {
      try {
        const parsed = JSON.parse(savedLocalUser);
        setCurrentUser(parsed);
        setAuthLoading(false);
        logApiEvent(
          'GET',
          '/api/auth/session',
          200,
          `Sync Local Sandbox Session: ${parsed.email}`,
          { uid: parsed.uid, email: parsed.email },
          `Successfully recovered local high-fidelity sandbox session from browser cache.`
        );

        // Load local portfolio & cash
        const savedHoldings = localStorage.getItem("portfolio_holdings");
        if (savedHoldings) setPortfolio(JSON.parse(savedHoldings));
        const savedCash = localStorage.getItem("portfolio_cash");
        if (savedCash) setCash(parseFloat(savedCash));
        const savedHistory = localStorage.getItem("trade_history");
        if (savedHistory) setTradeHistory(JSON.parse(savedHistory));
        const savedAlerts = localStorage.getItem("price_alerts");
        if (savedAlerts) setAlerts(JSON.parse(savedAlerts));
        return; // Bypasses onAuthStateChanged
      } catch (e) {
        localStorage.removeItem("local_mock_user");
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);

      if (user) {
        logApiEvent(
          'GET',
          '/api/auth/session',
          200,
          `Sync Session for user: ${user.email}`,
          { uid: user.uid, email: user.email },
          `Successfully recovered secure session from active token. Initiating Firestore synchronization.`
        );

        // Fetch User's Portfolio from Firestore
        try {
          const portfolioRef = doc(db, "users", user.uid, "portfolio", "main");
          const portfolioSnap = await getDoc(portfolioRef);

          if (portfolioSnap.exists()) {
            const data = portfolioSnap.data();
            if (data.cash !== undefined) setCash(data.cash);
            if (data.holdings !== undefined) setPortfolio(data.holdings);
          } else {
            // New user, seed their database document
            const defaultHoldings = [
              { symbol: "AAPL", shares: 15, avgBuyPrice: 180.20 },
              { symbol: "NVDA", shares: 8, avgBuyPrice: 850.00 }
            ];
            const defaultCash = 92450.00;
            await setDoc(portfolioRef, {
              cash: defaultCash,
              holdings: defaultHoldings,
              updatedAt: new Date().toISOString()
            });
            setCash(defaultCash);
            setPortfolio(defaultHoldings);
          }

          // Fetch User's Trades
          const tradesSnap = await getDocs(collection(db, "users", user.uid, "trades"));
          const tradesList: TradeRecord[] = [];
          tradesSnap.forEach((doc) => {
            tradesList.push(doc.data() as TradeRecord);
          });
          tradesList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setTradeHistory(tradesList);

          // Fetch User's Alerts
          const alertsSnap = await getDocs(collection(db, "users", user.uid, "alerts"));
          const alertsList: PriceAlert[] = [];
          alertsSnap.forEach((doc) => {
            alertsList.push(doc.data() as PriceAlert);
          });
          setAlerts(alertsList);
        } catch (err) {
          console.error("Error syncing with Firestore:", err);
        }
      } else {
        // Logged out / Guest Mode: Load from localStorage
        try {
          const savedHoldings = localStorage.getItem("portfolio_holdings");
          if (savedHoldings) setPortfolio(JSON.parse(savedHoldings));
          else setPortfolio([
            { symbol: "AAPL", shares: 15, avgBuyPrice: 180.20 },
            { symbol: "NVDA", shares: 8, avgBuyPrice: 850.00 }
          ]);

          const savedCash = localStorage.getItem("portfolio_cash");
          if (savedCash) setCash(parseFloat(savedCash));
          else setCash(92450.00);

          const savedHistory = localStorage.getItem("trade_history");
          if (savedHistory) setTradeHistory(JSON.parse(savedHistory));
          else setTradeHistory([
            {
              id: "trade-init-1",
              timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
              symbol: "AAPL",
              type: "BUY",
              shares: 15,
              price: 180.20,
              total: 2703.00
            },
            {
              id: "trade-init-2",
              timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
              symbol: "NVDA",
              type: "BUY",
              shares: 8,
              price: 850.00,
              total: 6800.00
            }
          ]);

          const savedAlerts = localStorage.getItem("price_alerts");
          setAlerts(savedAlerts ? JSON.parse(savedAlerts) : []);
        } catch (e) {}
      }
    });

    return () => unsubscribe();
  }, []);

  // Toast trigger helper
  const addToast = (symbol: string, message: string, threshold: number, type: 'above' | 'below') => {
    const newToast: ToastNotification = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      symbol,
      message,
      threshold,
      type,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    setToasts((prev) => [...prev, newToast]);
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 5000);
  };

  // Monitor stock prices for crossed thresholds
  useEffect(() => {
    alerts.forEach((alert) => {
      if (alert.isTriggered) return;

      const stock = stocks.find((s) => s.symbol === alert.symbol);
      if (!stock) return;

      let isCrossed = false;
      if (alert.type === "above" && stock.price >= alert.priceThreshold) {
        isCrossed = true;
      } else if (alert.type === "below" && stock.price <= alert.priceThreshold) {
        isCrossed = true;
      }

      if (isCrossed) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        // Mark as triggered
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === alert.id
              ? {
                  ...a,
                  isTriggered: true,
                  triggeredAt: timeStr
                }
              : a
          )
        );

        if (currentUser) {
          updateDoc(doc(db, "users", currentUser.uid, "alerts", alert.id), {
            isTriggered: true,
            triggeredAt: timeStr
          }).catch(err => console.error("Error triggering alert in Cloud:", err));
        }

        // Display toast notification
        const conditionStr = alert.type === "above" ? "above" : "below";
        const message = `${alert.symbol} price has crossed ${conditionStr} threshold of $${alert.priceThreshold.toFixed(2)} (Current: $${stock.price.toFixed(2)})`;
        addToast(alert.symbol, message, alert.priceThreshold, alert.type);

        // Log to API Console
        logApiEvent(
          'WS_TICK',
          'ws://api.example.com/alerts-trigger',
          'LIVE',
          `🚨 Price Alert Triggered for ${alert.symbol}`,
          {
            alertId: alert.id,
            symbol: alert.symbol,
            type: alert.type,
            threshold: alert.priceThreshold,
            triggeredPrice: stock.price,
            timestamp: new Date().toISOString()
          },
          `Live market telemetry detected that ${alert.symbol} met the configured ${alert.type} threshold of $${alert.priceThreshold.toFixed(2)} with live price of $${stock.price.toFixed(2)}.`
        );
      }
    });
  }, [stocks, alerts]);

  // Alert Handler Callbacks
  const handleAddAlert = (symbol: string, priceThreshold: number, type: 'above' | 'below') => {
    const newAlert: PriceAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      symbol,
      priceThreshold,
      type,
      isTriggered: false,
      createdAt: new Date().toISOString()
    };
    setAlerts((prev) => [...prev, newAlert]);

    if (currentUser) {
      setDoc(doc(db, "users", currentUser.uid, "alerts", newAlert.id), newAlert)
        .catch(err => console.error("Error saving alert to Firestore:", err));
    }

    logApiEvent(
      'POST',
      '/api/alerts/create',
      200,
      `Activate price alert for ${symbol}`,
      newAlert,
      `Configures a live telemetry trigger. The client registers the condition and watches incoming WebSocket price ticks for matching thresholds.`
    );
  };

  const handleRemoveAlert = (id: string) => {
    const alertToRemove = alerts.find(a => a.id === id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));

    if (currentUser) {
      deleteDoc(doc(db, "users", currentUser.uid, "alerts", id))
        .catch(err => console.error("Error removing alert from Firestore:", err));
    }

    if (alertToRemove) {
      logApiEvent(
        'POST',
        '/api/alerts/delete',
        200,
        `Remove price alert for ${alertToRemove.symbol}`,
        { alertId: id, symbol: alertToRemove.symbol },
        `Deconfigures the specified threshold trigger and deletes it from active scanning queue.`
      );
    }
  };

  const handleClearTriggered = () => {
    const triggered = alerts.filter((a) => a.isTriggered);
    setAlerts((prev) => prev.filter((a) => !a.isTriggered));

    if (currentUser) {
      triggered.forEach((alert) => {
        deleteDoc(doc(db, "users", currentUser.uid, "alerts", alert.id))
          .catch(err => console.error("Error clearing triggered alert in cloud:", err));
      });
    }
  };


  // Seed Initial Logs
  useEffect(() => {
    logApiEvent(
      'GET',
      '/api/stocks',
      200,
      'Initialize stock market records',
      INITIAL_STOCKS.map(({ symbol, name, price }) => ({ symbol, name, price })),
      'The client app performs a REST GET request to populate initial stock listings, loading standard pricing parameters, ticker names, and base valuations into the local state.'
    );
    logApiEvent(
      'GET',
      '/api/portfolio',
      200,
      'Fetch trade ledger',
      [
        { symbol: "AAPL", shares: 15, avgBuyPrice: 180.20 },
        { symbol: "NVDA", shares: 8, avgBuyPrice: 850.00 }
      ],
      'Retrieves the current paper trading position. Average purchase costs and held share counts are verified against server-side transaction ledgers.'
    );
  }, []);

  // Live price tick simulations (Ticking every 4 seconds)
  useEffect(() => {
    const tickInterval = setInterval(() => {
      // Pick a random stock to update
      const randomIndex = Math.floor(Math.random() * stocks.length);
      const stockToUpdate = stocks[randomIndex];

      // Calculate subtle wiggle percentage (-1.5% to +1.8%)
      const wigglePercent = (Math.random() * 3.3 - 1.5) / 100;
      const priceDelta = stockToUpdate.price * wigglePercent;
      const rawNewPrice = stockToUpdate.price + priceDelta;
      const newPrice = parseFloat(Math.max(1.0, rawNewPrice).toFixed(stockToUpdate.symbol.includes("BTC") ? 0 : 2));

      const updatedChange = parseFloat((newPrice - stockToUpdate.open).toFixed(2));
      const updatedChangePercent = parseFloat(((updatedChange / stockToUpdate.open) * 100).toFixed(2));

      // Calculate high/low extremes
      const newHigh = parseFloat(Math.max(stockToUpdate.high, newPrice).toFixed(2));
      const newLow = parseFloat(Math.min(stockToUpdate.low, newPrice).toFixed(2));

      // Append price point to history log
      const now = new Date();
      const updatedHistory = [
        ...stockToUpdate.history.slice(1),
        {
          timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          price: newPrice
        }
      ];

      // Update States
      setStocks((prevStocks) =>
        prevStocks.map((s) =>
          s.symbol === stockToUpdate.symbol
            ? {
                ...s,
                price: newPrice,
                change: updatedChange,
                changePercent: updatedChangePercent,
                high: newHigh,
                low: newLow,
                history: updatedHistory
              }
            : s
        )
      );

      // Trigger temporary wiggling flash highlights
      const direction = wigglePercent >= 0 ? 'up' : 'down';
      setTickerUpdates((prev) => ({ ...prev, [stockToUpdate.symbol]: direction }));
      setTimeout(() => {
        setTickerUpdates((prev) => ({ ...prev, [stockToUpdate.symbol]: null }));
      }, 800);

      // Emit educational JSON Tick
      logApiEvent(
        'WS_TICK',
        'ws://api.example.com/live-market-feeds',
        'LIVE',
        `Simulated price tick for ${stockToUpdate.symbol}`,
        {
          event: "stock_tick",
          symbol: stockToUpdate.symbol,
          price: newPrice,
          change: updatedChange,
          changePercent: updatedChangePercent,
          high: newHigh,
          low: newLow,
          timestamp: now.toISOString()
        },
        `Real-time WebSocket event received. In standard Dart (Flutter) or TypeScript, a StreamController or web socket stream listens to this channel, parses the JSON string, and triggers a state notifier rebuild.`
      );
    }, 4000);

    return () => clearInterval(tickInterval);
  }, [stocks]);

  // Handle Buy Orders
  const handleBuy = (symbol: string, shares: number, price: number) => {
    const totalCost = shares * price;
    setCash((prevCash) => parseFloat((prevCash - totalCost).toFixed(2)));

    setPortfolio((prevPortfolio) => {
      const existingIdx = prevPortfolio.findIndex((item) => item.symbol === symbol);
      if (existingIdx >= 0) {
        const existing = prevPortfolio[existingIdx];
        const newShares = existing.shares + shares;
        // Weighted average cost basis
        const newAvgBuyPrice = parseFloat(((existing.avgBuyPrice * existing.shares + price * shares) / newShares).toFixed(2));
        const updated = [...prevPortfolio];
        updated[existingIdx] = { symbol, shares: newShares, avgBuyPrice: newAvgBuyPrice };
        return updated;
      } else {
        return [...prevPortfolio, { symbol, shares, avgBuyPrice: price }];
      }
    });

    const newTrade: TradeRecord = {
      id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      symbol,
      type: 'BUY',
      shares,
      price,
      total: parseFloat(totalCost.toFixed(2))
    };
    setTradeHistory((prev) => [newTrade, ...prev]);

    if (currentUser) {
      setDoc(doc(db, "users", currentUser.uid, "trades", newTrade.id), newTrade)
        .catch(err => console.error("Error saving trade to Firestore:", err));
    }

    logApiEvent(
      'POST',
      '/api/portfolio/buy',
      200,
      `Execute Buy Order for ${symbol}`,
      { symbol, shares, price, totalCost, timestamp: new Date().toISOString() },
      `Dispatches order transaction. The server processes payment ledger deduction, registers the asset positions, and responds with Status 200.`
    );
  };

  // Handle Sell Orders
  const handleSell = (symbol: string, shares: number, price: number) => {
    const revenue = shares * price;
    setCash((prevCash) => parseFloat((prevCash + revenue).toFixed(2)));

    setPortfolio((prevPortfolio) => {
      const existingIdx = prevPortfolio.findIndex((item) => item.symbol === symbol);
      if (existingIdx >= 0) {
        const existing = prevPortfolio[existingIdx];
        const remainingShares = existing.shares - shares;
        if (remainingShares <= 0) {
          return prevPortfolio.filter((item) => item.symbol !== symbol);
        } else {
          const updated = [...prevPortfolio];
          updated[existingIdx] = { ...existing, shares: remainingShares };
          return updated;
        }
      }
      return prevPortfolio;
    });

    const newTrade: TradeRecord = {
      id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      symbol,
      type: 'SELL',
      shares,
      price,
      total: parseFloat(revenue.toFixed(2))
    };
    setTradeHistory((prev) => [newTrade, ...prev]);

    if (currentUser) {
      setDoc(doc(db, "users", currentUser.uid, "trades", newTrade.id), newTrade)
        .catch(err => console.error("Error saving trade to Firestore:", err));
    }

    logApiEvent(
      'POST',
      '/api/portfolio/sell',
      200,
      `Execute Sell Order for ${symbol}`,
      { symbol, shares, price, revenue, timestamp: new Date().toISOString() },
      `Dispatches asset liquidation order. The transaction ledger processes standard security sales, credits cash reserves, and returns status 200.`
    );
  };

  // Handle Execute Rebalance Trades
  const handleExecuteRebalance = (trades: { symbol: string, type: 'BUY' | 'SELL', shares: number, price: number }[]) => {
    if (trades.length === 0) return;

    let netCashChange = 0;
    const newTrades: TradeRecord[] = [];
    
    // Copy states to compute updates safely
    let tempCash = cash;
    let tempPortfolio = [...portfolio];

    trades.forEach((trade) => {
      const tradeValue = trade.shares * trade.price;
      if (trade.type === 'BUY') {
        tempCash -= tradeValue;
        const existingIdx = tempPortfolio.findIndex((item) => item.symbol === trade.symbol);
        if (existingIdx >= 0) {
          const existing = tempPortfolio[existingIdx];
          const newShares = existing.shares + trade.shares;
          const newAvgBuyPrice = parseFloat(((existing.avgBuyPrice * existing.shares + trade.price * trade.shares) / newShares).toFixed(2));
          tempPortfolio[existingIdx] = { symbol: trade.symbol, shares: newShares, avgBuyPrice: newAvgBuyPrice };
        } else {
          tempPortfolio.push({ symbol: trade.symbol, shares: trade.shares, avgBuyPrice: trade.price });
        }
        netCashChange -= tradeValue;
      } else {
        tempCash += tradeValue;
        const existingIdx = tempPortfolio.findIndex((item) => item.symbol === trade.symbol);
        if (existingIdx >= 0) {
          const existing = tempPortfolio[existingIdx];
          const remainingShares = existing.shares - trade.shares;
          if (remainingShares <= 0) {
            tempPortfolio = tempPortfolio.filter((item) => item.symbol !== trade.symbol);
          } else {
            tempPortfolio[existingIdx] = { ...existing, shares: remainingShares };
          }
        }
        netCashChange += tradeValue;
      }

      const rebalanceTrade: TradeRecord = {
        id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: new Date().toISOString(),
        symbol: trade.symbol,
        type: trade.type,
        shares: trade.shares,
        price: trade.price,
        total: parseFloat(tradeValue.toFixed(2))
      };
      newTrades.push(rebalanceTrade);

      if (currentUser) {
        setDoc(doc(db, "users", currentUser.uid, "trades", rebalanceTrade.id), rebalanceTrade)
          .catch(err => console.error("Error saving rebalance trade to Firestore:", err));
      }
    });

    setCash(parseFloat(tempCash.toFixed(2)));
    setPortfolio(tempPortfolio);
    setTradeHistory((prev) => [...newTrades, ...prev]);

    logApiEvent(
      'POST',
      '/api/portfolio/rebalance',
      200,
      `Execute Portfolio Rebalance`,
      { trades: trades.map(t => ({ symbol: t.symbol, type: t.type, shares: t.shares, price: t.price })), netCashChange: parseFloat(netCashChange.toFixed(2)) },
      `Atomic rebalancing engine compiled a transaction plan of ${trades.length} trades to match targets. Processed cash and asset balances simultaneously to preserve transaction integrity.`
    );
  };

  // Handle Adding Custom Mock Stocks
  const handleAddStock = (symbol: string, name: string, price: number) => {
    const newStock: Stock = {
      symbol,
      name,
      price,
      change: 0.00,
      changePercent: 0.00,
      high: price,
      low: price,
      open: price,
      volume: "1.2M",
      marketCap: "500M",
      peRatio: "22.5",
      history: generateHistory(price),
      sector: "Custom Sector"
    };

    setStocks((prev) => [...prev, newStock]);
    setSelectedSymbol(symbol);

    logApiEvent(
      'POST',
      '/api/stocks/add',
      201,
      `Register Custom Ticker: ${symbol}`,
      newStock,
      `Client requests registration of a custom corporate asset. The workspace initializes standard telemetry loops, wiggles, and starts pricing ticks.`
    );
  };

  return (
    <div id="app-root" className="min-h-screen w-full bg-[#09090b] text-[#fafafa] p-4 sm:p-6 font-sans relative overflow-x-hidden antialiased selection:bg-emerald-500/30 selection:text-white">
      
      {/* Decorative top grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.05] pointer-events-none" />

      {/* Decorative background visual lights */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-zinc-800/10 rounded-full filter blur-[100px] pointer-events-none" />

      {/* Main Terminal Frame */}
      <div className="max-w-7xl mx-auto flex flex-col gap-5 z-10 relative">
        
        {/* Header Block */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-zinc-900/40 rounded-3xl border border-zinc-800/80 p-5 backdrop-blur-md gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Activity className="w-5.5 h-5.5 text-zinc-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-display font-bold uppercase tracking-tight text-white">QuantLive Tracker</h1>
                <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-semibold rounded-full uppercase tracking-wider animate-pulse">
                  Market Open
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 font-sans">Bento Grid Live Price Terminal & State Sandbox</p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 font-mono text-xs w-full sm:w-auto justify-between sm:justify-end">
            {/* System Specs */}
            <div className="hidden md:flex items-center gap-4 border-r border-zinc-800/80 pr-4">
              <div>
                <span className="block text-[9px] uppercase text-zinc-500 tracking-wider">Feed Protocol</span>
                <span className="text-zinc-300 text-[11px] mt-0.5 block">240 Ticks/min</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase text-zinc-500 tracking-wider">Analysis Core</span>
                <span className="text-emerald-400 text-[11px] font-semibold mt-0.5 block">Gemini 3.5 Flash</span>
              </div>
            </div>

            {/* Time Metrics */}
            <div className="text-right pr-1">
              <span className="block text-[9px] uppercase text-zinc-500 tracking-wider">Terminal Time (EST)</span>
              <span className="text-zinc-200 font-bold block mt-0.5">{currentTime || "10:16:00 AM"}</span>
            </div>

            {/* Secure Identity Core */}
            <div className="flex items-center gap-3 border-l border-zinc-800/80 pl-3">
              {currentUser ? (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="block text-[9px] uppercase text-zinc-500 tracking-wider">Identity Secure</span>
                    <span className="text-emerald-400 font-bold block mt-0.5 text-[11px] max-w-[120px] truncate" title={currentUser.displayName || currentUser.email || ""}>
                      {currentUser.displayName || currentUser.email?.split("@")[0] || "User"}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (localStorage.getItem("local_mock_user")) {
                        localStorage.removeItem("local_mock_user");
                      }
                      signOut(auth).catch(() => {});
                      setCurrentUser(null);
                      logApiEvent(
                        'POST',
                        '/api/auth/logout',
                        200,
                        `Close Secure Session`,
                        { email: currentUser.email },
                        `User logged out. Revoking authorization credentials and returning sandbox environment to local fallback.`
                      );
                    }}
                    className="p-2 bg-zinc-800 hover:bg-red-500/10 hover:text-red-400 text-zinc-400 rounded-xl transition border border-zinc-700/50 hover:border-red-500/20 cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="text-right hidden xs:block">
                    <span className="block text-[9px] uppercase text-zinc-500 tracking-wider">Cloud Storage</span>
                    <span className="text-amber-500/80 font-bold block mt-0.5 text-[11px]">Guest Session</span>
                  </div>
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer text-[11px] sm:text-xs"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Secure Sign In</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Core Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Sidebar Left: Stock list */}
          <section className="lg:col-span-4 xl:col-span-3.5 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1 mb-1 px-1">
                <span className="text-[10px] uppercase font-mono font-bold text-zinc-500 tracking-widest">Market Listings</span>
                <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">Select an asset to view prices & trigger reports.</p>
              </div>
              <StockList
                stocks={stocks}
                selectedSymbol={selectedSymbol}
                onSelectStock={(s) => setSelectedSymbol(s.symbol)}
                onAddStock={handleAddStock}
                tickerUpdates={tickerUpdates}
              />
            </div>
            
            {/* Real-time Ticker News */}
            <MarketNews stock={selectedStock} onLogApiEvent={logApiEvent} />
          </section>

          {/* Main Content Area Right */}
          <main className="lg:col-span-8 xl:col-span-8.5 flex flex-col gap-5">
            
            {/* Stock Price Chart */}
            <StockChart stock={selectedStock} />

            {/* Sub Content Tabs Deck */}
            <div className="flex flex-col gap-4">
              
              {/* Tabs Navigation */}
              <div className="flex bg-zinc-950/80 p-1.5 rounded-2xl border border-zinc-800/80 text-xs font-mono w-full overflow-x-auto scrollbar-none z-10 self-start gap-1 whitespace-nowrap">
                <button
                  onClick={() => setActiveTab('home')}
                  className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                    activeTab === 'home' ? "bg-zinc-800 text-white shadow-md border border-zinc-700/50" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Home className="w-4 h-4 text-emerald-400" />
                  Home Overview
                </button>
                <button
                  onClick={() => setActiveTab('trade')}
                  className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                    activeTab === 'trade' ? "bg-zinc-800 text-white shadow-md border border-zinc-700/50" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  Trade Deck
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                    activeTab === 'history' ? "bg-zinc-800 text-white shadow-md border border-zinc-700/50" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <History className="w-4 h-4 text-emerald-400" />
                  Ledger History
                </button>
                <button
                  onClick={() => setActiveTab('wallet')}
                  className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                    activeTab === 'wallet' ? "bg-zinc-800 text-white shadow-md border border-zinc-700/50" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Landmark className="w-4 h-4 text-emerald-400" />
                  Money Wallet
                </button>
                <button
                  onClick={() => setActiveTab('alerts')}
                  className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                    activeTab === 'alerts' ? "bg-zinc-800 text-white shadow-md border border-zinc-700/50" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Bell className="w-4 h-4 text-emerald-400" />
                  Price Alerts
                  {alerts.filter(a => !a.isTriggered).length > 0 && (
                    <span className="px-1.5 py-0.5 text-[9px] bg-amber-500 text-zinc-950 rounded-full font-bold">
                      {alerts.filter(a => !a.isTriggered).length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('performance')}
                  className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                    activeTab === 'performance' ? "bg-zinc-800 text-white shadow-md border border-zinc-700/50" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  Portfolio Performance
                </button>
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                    activeTab === 'ai' ? "bg-zinc-800 text-white shadow-md border border-zinc-700/50" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Gemini Analyst
                </button>
                <button
                  onClick={() => setActiveTab('console')}
                  className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                    activeTab === 'console' ? "bg-zinc-800 text-white shadow-md border border-zinc-700/50" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  API & JSON Logs
                </button>
                <button
                  onClick={() => setActiveTab('support')}
                  className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                    activeTab === 'support' ? "bg-zinc-800 text-white shadow-md border border-zinc-700/50" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <LifeBuoy className="w-4 h-4 text-emerald-400" />
                  Support Desk
                </button>
                <button
                  onClick={() => setActiveTab('account')}
                  className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                    activeTab === 'account' ? "bg-zinc-800 text-white shadow-md border border-zinc-700/50" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <UserIcon className="w-4 h-4 text-emerald-400" />
                  My Account
                </button>
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                    activeTab === 'admin' ? "bg-zinc-800 text-white shadow-md border border-zinc-700/50" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Wrench className="w-4 h-4 text-emerald-400" />
                  Admin Console
                </button>
              </div>

              {/* Active Tab Panel with motion layout animations */}
              <div className="min-h-[460px]">
                <AnimatePresence mode="wait">
                  {activeTab === 'home' && (
                    <motion.div
                      key="home-panel"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <HomeDashboard
                        currentUser={currentUser}
                        portfolio={portfolio}
                        cash={cash}
                        stocks={stocks}
                        alerts={alerts}
                        logs={logs}
                        tradeHistory={tradeHistory}
                        onSelectStock={(stock) => setSelectedSymbol(stock.symbol)}
                        setActiveTab={setActiveTab}
                        openAuthModal={() => setIsAuthModalOpen(true)}
                      />
                    </motion.div>
                  )}

                  {activeTab === 'trade' && (
                    <motion.div
                      key="trade-panel"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Portfolio
                        portfolio={portfolio}
                        cash={cash}
                        selectedStock={selectedStock}
                        stocks={stocks}
                        onBuy={handleBuy}
                        onSell={handleSell}
                        onExecuteRebalance={handleExecuteRebalance}
                        tradeHistory={tradeHistory}
                      />
                    </motion.div>
                  )}

                  {activeTab === 'history' && (
                    <motion.div
                      key="history-panel"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <TradeHistoryView
                        tradeHistory={tradeHistory}
                        stocks={stocks}
                      />
                    </motion.div>
                  )}

                  {activeTab === 'wallet' && (
                    <motion.div
                      key="wallet-panel"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <MoneyWallet
                        cash={cash}
                        portfolio={portfolio}
                        stocks={stocks}
                        onUpdateCash={(newCash) => setCash(parseFloat(newCash.toFixed(2)))}
                        onLogApiEvent={logApiEvent}
                      />
                    </motion.div>
                  )}

                  {activeTab === 'alerts' && (
                    <motion.div
                      key="alerts-panel"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <PriceAlerts
                        stocks={stocks}
                        selectedStock={selectedStock}
                        alerts={alerts}
                        onAddAlert={handleAddAlert}
                        onRemoveAlert={handleRemoveAlert}
                        onClearTriggered={handleClearTriggered}
                      />
                    </motion.div>
                  )}

                  {activeTab === 'performance' && (
                    <motion.div
                      key="performance-panel"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <PortfolioPerformance
                        portfolio={portfolio}
                        cash={cash}
                        stocks={stocks}
                      />
                    </motion.div>
                  )}

                  {activeTab === 'ai' && (
                    <motion.div
                      key="ai-panel"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <AIAnalyst stock={selectedStock} />
                    </motion.div>
                  )}

                  {activeTab === 'console' && (
                    <motion.div
                      key="console-panel"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ApiConsole 
                        logs={logs} 
                        clearLogs={clearLogs} 
                        stocks={stocks} 
                        portfolio={portfolio} 
                        cash={cash} 
                        tradeHistory={tradeHistory}
                      />
                    </motion.div>
                  )}

                  {activeTab === 'support' && (
                    <motion.div
                      key="support-panel"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <SupportCenter
                        currentUser={currentUser}
                        cash={cash}
                        totalTrades={tradeHistory.length}
                        portfolioItemsCount={portfolio.length}
                        activeTabName={activeTab}
                        onLogApiEvent={logApiEvent}
                      />
                    </motion.div>
                  )}

                  {activeTab === 'account' && (
                    <motion.div
                      key="account-panel"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <MyAccount
                        currentUser={currentUser}
                        cash={cash}
                        portfolio={portfolio}
                        tradeHistory={tradeHistory}
                        onLogApiEvent={logApiEvent}
                        openAuthModal={() => setIsAuthModalOpen(true)}
                      />
                    </motion.div>
                  )}

                  {activeTab === 'admin' && (
                    <motion.div
                      key="admin-panel"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <AdminPanel
                        stocks={stocks}
                        setStocks={setStocks}
                        cash={cash}
                        setCash={setCash}
                        portfolio={portfolio}
                        setPortfolio={setPortfolio}
                        alerts={alerts}
                        setAlerts={setAlerts}
                        tradeHistory={tradeHistory}
                        setTradeHistory={setTradeHistory}
                        logApiEvent={logApiEvent}
                        onSelectStock={(stock) => setSelectedSymbol(stock.symbol)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </main>

        </div>
        
        {/* Full-screen Educational Footer */}
        <footer className="mt-8 pt-6 border-t border-zinc-800/80 pb-12 flex flex-col md:flex-row justify-between items-center text-xs text-zinc-500 gap-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-500" />
            <p className="font-sans leading-relaxed text-center md:text-left">
              QuantLive is an interactive Bento Grid sandbox highlighting live-data & state management concepts.
            </p>
          </div>
          <p className="font-mono text-[10px] text-zinc-600">
            Engine: React 19 • Express Node Server • Tailwind CSS v4 • Gemini Pro
          </p>
        </footer>

      </div>

      {/* Toast Notifications */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-zinc-950/95 border border-amber-500/30 text-white rounded-2xl p-4 shadow-2xl flex items-start gap-3 backdrop-blur-md pointer-events-auto w-80 relative overflow-hidden"
            >
              {/* Alert gradient side-border */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
              <Bell className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="font-sans font-bold text-xs text-white">Alert Triggered ({toast.symbol})</h4>
                  <button
                    onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                    className="text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-zinc-300 font-sans mt-1 leading-relaxed">
                  {toast.message}
                </p>
                <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-zinc-800/60 text-[9px] font-mono text-zinc-500">
                  <span>Incident Logged</span>
                  <span>{toast.createdAt}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Auth Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onLogApiEvent={logApiEvent}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
