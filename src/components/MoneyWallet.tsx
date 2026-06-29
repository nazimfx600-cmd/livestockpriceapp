import React, { useState, useEffect } from "react";
import { Wallet, ArrowDownLeft, ArrowUpRight, Building2, CreditCard, ShieldCheck, Plus, Trash2, History, AlertCircle, RefreshCw, Landmark, CircleDollarSign } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface WalletTransaction {
  id: string;
  timestamp: string;
  type: 'DEPOSIT' | 'WITHDRAW';
  amount: number;
  method: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  reference: string;
}

export interface LinkedAccount {
  id: string;
  type: 'bank' | 'card';
  institution: string;
  accountNumber: string;
  holderName: string;
  status: 'VERIFIED' | 'PENDING';
}

interface MoneyWalletProps {
  cash: number;
  portfolio: { symbol: string; shares: number; avgBuyPrice: number }[];
  stocks: { symbol: string; price: number }[];
  onUpdateCash: (newCash: number) => void;
  onLogApiEvent: (
    method: 'GET' | 'POST' | 'WS_TICK',
    urlOrTopic: string,
    status: number | 'LIVE',
    action: string,
    payloadObj: any,
    explanation: string
  ) => void;
}

export default function MoneyWallet({ cash, portfolio, stocks, onUpdateCash, onLogApiEvent }: MoneyWalletProps) {
  // Local state for linked payment methods
  const [accounts, setAccounts] = useState<LinkedAccount[]>(() => {
    try {
      const saved = localStorage.getItem("wallet_accounts");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: "acc-1", type: "bank", institution: "Fidelity Chase Premier", accountNumber: "•••• 8921", holderName: "Alex Mercer", status: "VERIFIED" },
      { id: "acc-2", type: "card", institution: "Apex Titanium Card", accountNumber: "•••• 4432", holderName: "Alex Mercer", status: "VERIFIED" }
    ];
  });

  // Local state for wallet logs
  const [walletHistory, setWalletHistory] = useState<WalletTransaction[]>(() => {
    try {
      const saved = localStorage.getItem("wallet_history");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "tx-init-1",
        timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
        type: "DEPOSIT",
        amount: 100000.00,
        method: "Fidelity Chase Premier",
        status: "COMPLETED",
        reference: "FT-Chase-99201"
      }
    ];
  });

  // Persist local state
  useEffect(() => {
    localStorage.setItem("wallet_accounts", JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem("wallet_history", JSON.stringify(walletHistory));
  }, [walletHistory]);

  // UI States
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history' | 'accounts'>('deposit');
  const [depositMode, setDepositMode] = useState<'ach' | 'stripe'>('stripe'); // default to stripe for "Real money add"
  const [transactionAmount, setTransactionAmount] = useState<string>("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || "");
  const [selectedMethodType, setSelectedMethodType] = useState<'bank' | 'card'>('bank');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [stripeConfig, setStripeConfig] = useState<{ hasKey: boolean; publishableKey: string }>({ hasKey: false, publishableKey: "" });

  // Fetch Stripe setup status on mount
  useEffect(() => {
    fetch("/api/wallet/stripe-config")
      .then((res) => res.json())
      .then((data) => setStripeConfig(data))
      .catch((err) => console.error("Error loading stripe config:", err));
  }, []);

  // New Account Modal states
  const [showAddAccount, setShowAddAccount] = useState<boolean>(false);
  const [newInst, setNewInst] = useState<string>("");
  const [newAccNum, setNewAccNum] = useState<string>("");
  const [newHolder, setNewHolder] = useState<string>("Alex Mercer");
  const [newType, setNewType] = useState<'bank' | 'card'>('bank');

  // Calculate Asset Holdings Value
  const holdingsValue = portfolio.reduce((total, item) => {
    const stock = stocks.find((s) => s.symbol === item.symbol);
    const currentPrice = stock ? stock.price : item.avgBuyPrice;
    return total + currentPrice * item.shares;
  }, 0);

  const totalWealth = cash + holdingsValue;
  const liquidityRatio = totalWealth > 0 ? (cash / totalWealth) * 100 : 0;

  // Handle adding custom bank/card
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInst.trim() || !newAccNum.trim()) return;

    try {
      const response = await fetch("/api/wallet/link-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newType,
          institution: newInst.trim(),
          accountNumber: newAccNum.trim(),
          holderName: newHolder,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to link account");
      }

      const result = await response.json();
      const linked = result.account;

      setAccounts((prev) => [...prev, linked]);
      setSelectedAccountId(linked.id);
      
      // Reset inputs
      setNewInst("");
      setNewAccNum("");
      setShowAddAccount(false);

      onLogApiEvent(
        'POST',
        '/api/wallet/link-account',
        201,
        `Link Payment Account: ${linked.institution}`,
        linked,
        `Secured connection verified. A simulated gateway verification hook linked client's financial token ${linked.accountNumber} successfully.`
      );
    } catch (err: any) {
      console.error("Error linking account:", err);
      setErrorMessage(err.message || "Failed to link account via API.");
    }
  };

  // Handle delete linked account
  const handleDeleteAccount = async (id: string) => {
    const accountToDelete = accounts.find(a => a.id === id);
    if (!accountToDelete) return;

    try {
      const response = await fetch("/api/wallet/unlink-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error("Failed to unlink account");
      }

      setAccounts((prev) => prev.filter((a) => a.id !== id));
      if (selectedAccountId === id) {
        const remaining = accounts.filter((a) => a.id !== id);
        setSelectedAccountId(remaining[0]?.id || "");
      }

      onLogApiEvent(
        'POST',
        '/api/wallet/unlink-account',
        200,
        `Unlink Payment Account: ${accountToDelete.institution}`,
        { id },
        `Removed payment token association and revoked authorization scopes for security credential ${accountToDelete.accountNumber}.`
      );
    } catch (err: any) {
      console.error("Error unlinking account:", err);
      setErrorMessage("Failed to unlink account via API.");
    }
  };

  // Process real/sandbox Stripe card checkout
  const handleStripeCheckout = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    const amount = parseFloat(transactionAmount);

    if (isNaN(amount) || amount <= 0) {
      setErrorMessage("Please enter a valid amount greater than $0.");
      return;
    }

    if (amount > 100000) {
      setErrorMessage("Single credit card transactions are limited to $100,000.00 for fraud prevention.");
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch("/api/wallet/stripe-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          appUrl: window.location.origin,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to initiate checkout");
      }

      const result = await response.json();
      
      onLogApiEvent(
        'POST',
        '/api/wallet/stripe-checkout',
        200,
        `Initiate Stripe Checkout: ${result.mode === 'stripe' ? 'Live/Test' : 'Sandbox fallback'}`,
        result,
        `Stripe checkout session initialized. Mode: ${result.mode.toUpperCase()}. Redirecting user to secure payment page.`
      );

      // Redirect user to Stripe secure portal (or sandbox redirect)
      window.location.href = result.url;
    } catch (err: any) {
      console.error("Stripe checkout error:", err);
      setIsProcessing(false);
      setErrorMessage(err.message || "Failed to contact payment gateway.");
    }
  };

  // Process deposit logic
  const handleDeposit = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    const amount = parseFloat(transactionAmount);
    
    if (isNaN(amount) || amount <= 0) {
      setErrorMessage("Please enter a valid deposit amount greater than $0.");
      return;
    }

    if (amount > 1000000) {
      setErrorMessage("Single deposits cannot exceed $1,000,000.00 for regulatory safety.");
      return;
    }

    const selectedAccount = accounts.find(a => a.id === selectedAccountId);
    if (!selectedAccount) {
      setErrorMessage("Please link and select a verified payment source first.");
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          previousBalance: cash,
          source: selectedAccount.institution
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process deposit");
      }

      const result = await response.json();
      const updatedCash = result.currentBalance;
      onUpdateCash(updatedCash);

      const newTx: WalletTransaction = {
        id: `tx-${Date.now()}`,
        timestamp: result.timestamp || new Date().toISOString(),
        type: 'DEPOSIT',
        amount,
        method: `${selectedAccount.institution} (${selectedAccount.accountNumber})`,
        status: 'COMPLETED',
        reference: result.reference
      };

      setWalletHistory((prev) => [newTx, ...prev]);
      setIsProcessing(false);
      setTransactionAmount("");
      setSuccessMessage(`Successfully credited $${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} to your active liquidity pool.`);

      onLogApiEvent(
        'POST',
        '/api/wallet/deposit',
        200,
        `Credit Cash Liquidity Reserves`,
        result,
        `Liquidity credit request cleared. Bank routing instruction triggered an ACH capture, settled ledger balances, and emitted credit status 200.`
      );
    } catch (err: any) {
      console.error("Deposit error:", err);
      setIsProcessing(false);
      setErrorMessage(err.message || "Failed to process deposit via API.");
    }
  };

  // Process withdrawal logic
  const handleWithdrawal = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    const amount = parseFloat(transactionAmount);

    if (isNaN(amount) || amount <= 0) {
      setErrorMessage("Please enter a valid withdrawal amount greater than $0.");
      return;
    }

    if (amount > cash) {
      setErrorMessage(`Insufficient liquidity. You have $${cash.toLocaleString(undefined, { minimumFractionDigits: 2 })} in cash reserves but requested $${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`);
      return;
    }

    const selectedAccount = accounts.find(a => a.id === selectedAccountId);
    if (!selectedAccount) {
      setErrorMessage("Please select a verified bank or card to transfer your funds to.");
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          previousBalance: cash,
          destination: selectedAccount.institution
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process withdrawal");
      }

      const result = await response.json();
      const updatedCash = result.currentBalance;
      onUpdateCash(updatedCash);

      const newTx: WalletTransaction = {
        id: `tx-${Date.now()}`,
        timestamp: result.timestamp || new Date().toISOString(),
        type: 'WITHDRAW',
        amount,
        method: `${selectedAccount.institution} (${selectedAccount.accountNumber})`,
        status: 'COMPLETED',
        reference: result.reference
      };

      setWalletHistory((prev) => [newTx, ...prev]);
      setIsProcessing(false);
      setTransactionAmount("");
      setSuccessMessage(`Successfully dispatched $${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} to your linked account.`);

      onLogApiEvent(
        'POST',
        '/api/wallet/withdraw',
        200,
        `Debit Cash Liquidity Reserves`,
        result,
        `Funds transfer initiated. Dispatched transfer payload to automated clearing house network to debit account and settle balances.`
      );
    } catch (err: any) {
      console.error("Withdrawal error:", err);
      setIsProcessing(false);
      setErrorMessage(err.message || "Failed to process withdrawal via API.");
    }
  };

  return (
    <div className="bg-zinc-900/20 rounded-3xl border border-zinc-800/80 p-5 backdrop-blur-md flex flex-col md:flex-row gap-6">
      
      {/* LEFT: Wallet Metrics & Linked Accounts Overview */}
      <div className="flex-1 flex flex-col gap-5 md:max-w-xs xl:max-w-sm">
        
        {/* Wallet Balance Card */}
        <div className="bg-gradient-to-br from-zinc-900 via-zinc-950 to-emerald-950/20 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full filter blur-xl pointer-events-none" />
          
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider block">Wallet Balance</span>
              <span className="text-2xl font-bold text-white mt-1.5 block">
                ${cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-zinc-850 text-xs">
            <div>
              <span className="text-[9px] text-zinc-500 uppercase font-mono block">Invested Capital</span>
              <span className="font-semibold text-zinc-300 block mt-0.5">${holdingsValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-[9px] text-zinc-500 uppercase font-mono block">Total Net Worth</span>
              <span className="font-semibold text-emerald-400 block mt-0.5">${totalWealth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Liquidity gauge */}
          <div className="mt-4 pt-3 border-t border-zinc-850/50 space-y-1.5 font-mono text-[10px]">
            <div className="flex justify-between text-zinc-500">
              <span>Cash Liquidity Ratio:</span>
              <span className="text-emerald-400 font-bold">{liquidityRatio.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500" 
                style={{ width: `${liquidityRatio}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Selected Linked Payment Method Detail */}
        <div className="bg-zinc-950/40 border border-zinc-850/60 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">Default Transfer Source</span>
            <button 
              onClick={() => setActiveTab('accounts')}
              className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
            >
              Manage
            </button>
          </div>

          {accounts.length === 0 ? (
            <div className="py-4 text-center text-zinc-600 text-xs font-sans">
              No accounts linked. Link a source to enable deposits & withdrawals.
            </div>
          ) : (
            (() => {
              const current = accounts.find(a => a.id === selectedAccountId) || accounts[0];
              if (!current) return null;
              return (
                <div className="flex items-center justify-between p-3 bg-zinc-900/40 rounded-xl border border-zinc-850">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-950 rounded-lg text-zinc-400 border border-zinc-800">
                      {current.type === 'bank' ? <Building2 className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">{current.institution}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">{current.accountNumber} • Verified</span>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Gateway Online" />
                </div>
              );
            })()
          )}
        </div>

        {/* Security Shield Callout */}
        <div className="p-3 bg-zinc-950/20 border border-zinc-850/50 rounded-2xl flex gap-2.5 items-start">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <div className="text-[10px] text-zinc-400 leading-relaxed font-sans">
            <span className="font-bold text-zinc-300 block mb-0.5">Automated Clearing House (ACH) SSL</span>
            Funds are managed inside a secure sandboxed ledger. Multi-party verification checks authorize atomic debits immediately.
          </div>
        </div>

      </div>

      {/* RIGHT: Active Tab Workspace Panel */}
      <div className="flex-1 bg-zinc-950/20 border border-zinc-850 rounded-2xl p-5 flex flex-col gap-4">
        
        {/* Navigation Headers */}
        <div className="flex border-b border-zinc-850 text-xs font-mono pb-2.5 gap-4 overflow-x-auto">
          <button
            onClick={() => { setActiveTab('deposit'); setErrorMessage(""); setSuccessMessage(""); }}
            className={`pb-1.5 font-bold transition flex items-center gap-1.5 relative cursor-pointer ${
              activeTab === 'deposit' ? "text-emerald-400 border-b-2 border-emerald-500" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            Deposit Cash
          </button>
          <button
            onClick={() => { setActiveTab('withdraw'); setErrorMessage(""); setSuccessMessage(""); }}
            className={`pb-1.5 font-bold transition flex items-center gap-1.5 relative cursor-pointer ${
              activeTab === 'withdraw' ? "text-emerald-400 border-b-2 border-emerald-500" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Withdraw Funds
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`pb-1.5 font-bold transition flex items-center gap-1.5 relative cursor-pointer ${
              activeTab === 'accounts' ? "text-emerald-400 border-b-2 border-emerald-500" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            Payment Sources
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-1.5 font-bold transition flex items-center gap-1.5 relative cursor-pointer ${
              activeTab === 'history' ? "text-emerald-400 border-b-2 border-emerald-500" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Wallet Ledger
          </button>
        </div>

        {/* WORKSPACE AREA */}
        <div className="flex-1 flex flex-col">
          
          {/* DEPOSIT WORKSPACE */}
          {activeTab === 'deposit' && (
            <div className="flex flex-col gap-4 flex-1 justify-between">
              <div className="space-y-4">
                {/* Deposit Method Selector Switcher */}
                <div className="flex bg-zinc-950/40 p-1 rounded-xl border border-zinc-850 gap-1 text-[11px] font-mono">
                  <button
                    type="button"
                    onClick={() => { setDepositMode('stripe'); setErrorMessage(""); setSuccessMessage(""); }}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      depositMode === 'stripe' ? "bg-emerald-500 text-zinc-950 shadow-md" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Real Money (Stripe)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDepositMode('ach'); setErrorMessage(""); setSuccessMessage(""); }}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      depositMode === 'ach' ? "bg-emerald-500 text-zinc-950 shadow-md" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    Simulated ACH
                  </button>
                </div>

                {depositMode === 'stripe' ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Stripe Credit Card Portal</h4>
                        <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded font-bold ${
                          stripeConfig.hasKey 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}>
                          {stripeConfig.hasKey ? "LIVE KEY DETECTED" : "SANDBOX PORTAL"}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-sans mt-1">
                        {stripeConfig.hasKey 
                          ? "Enter deposit amount below to complete a secure checkout using your live or test credit card credentials."
                          : "Process credit card deposits instantly. Direct integration using Stripe mock routing adds real balances in real-time."}
                      </p>
                    </div>

                    {/* Amount input */}
                    <div className="space-y-2">
                      <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Deposit Amount (USD)</label>
                      <div className="relative flex items-center bg-zinc-950 rounded-xl border border-zinc-800 px-4 py-3 hover:border-zinc-700 transition">
                        <span className="text-zinc-500 font-bold mr-2 text-sm select-none">$</span>
                        <input
                          type="number"
                          placeholder="Enter amount (e.g., 250)"
                          value={transactionAmount}
                          onChange={(e) => setTransactionAmount(e.target.value)}
                          disabled={isProcessing}
                          className="bg-transparent border-none w-full text-white text-sm focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    {/* Pre-set Quick Add Amount Buttons */}
                    <div className="grid grid-cols-4 gap-2">
                      {[50, 100, 500, 1000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setTransactionAmount(amt.toString())}
                          disabled={isProcessing}
                          className="py-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white rounded-lg border border-zinc-800/80 hover:border-zinc-700 font-mono text-[11px] font-medium transition cursor-pointer select-none"
                        >
                          +${amt}
                        </button>
                      ))}
                    </div>

                    {/* Security Disclaimer */}
                    <div className="text-[9px] text-zinc-500 leading-normal font-mono pt-1">
                      * Securely encrypted via standard TLS protocol. Credit cards are verified using direct Stripe payment processing.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Simulated ACH Bank Transfer</h4>
                      <p className="text-[11px] text-zinc-400 font-sans mt-1">Clear custom sandbox wire transfers without triggering card gateways.</p>
                    </div>

                    {/* Amount input */}
                    <div className="space-y-2">
                      <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Deposit Amount (USD)</label>
                      <div className="relative flex items-center bg-zinc-950 rounded-xl border border-zinc-800 px-4 py-3 hover:border-zinc-700 transition">
                        <span className="text-zinc-500 font-bold mr-2 text-sm select-none">$</span>
                        <input
                          type="number"
                          placeholder="Enter amount (e.g., 5,000)"
                          value={transactionAmount}
                          onChange={(e) => setTransactionAmount(e.target.value)}
                          disabled={isProcessing}
                          className="bg-transparent border-none w-full text-white text-sm focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    {/* Account selector */}
                    <div className="space-y-2">
                      <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Transfer Source Account</label>
                      <div className="relative">
                        <select
                          value={selectedAccountId}
                          onChange={(e) => setSelectedAccountId(e.target.value)}
                          disabled={isProcessing || accounts.length === 0}
                          className="w-full bg-zinc-950 text-zinc-300 text-xs rounded-xl px-3 py-3 border border-zinc-800 focus:outline-none focus:border-zinc-700 font-sans cursor-pointer appearance-none"
                        >
                          {accounts.length === 0 ? (
                            <option value="">No Accounts Linked</option>
                          ) : (
                            accounts.map(acc => (
                              <option key={acc.id} value={acc.id}>
                                {acc.institution} ({acc.accountNumber})
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Info Pills */}
                    <div className="flex items-center gap-3 font-mono text-[9px] text-zinc-500 pt-1">
                      <span className="bg-zinc-900 px-2 py-1 rounded border border-zinc-800/80">Fee: $0.00 (Free)</span>
                      <span className="bg-zinc-900 px-2 py-1 rounded border border-zinc-800/80">Est. Clear: Instant</span>
                      <span className="bg-zinc-900 px-2 py-1 rounded border border-zinc-800/80">Cap: $1M Limit</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Status messages and actions */}
              <div className="space-y-3 pt-4 border-t border-zinc-900 mt-4">
                <AnimatePresence mode="wait">
                  {errorMessage && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[11px] font-sans text-rose-400 flex items-start gap-2"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </motion.div>
                  )}
                  {successMessage && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] font-sans text-emerald-400 flex items-start gap-2"
                    >
                      <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{successMessage}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {depositMode === 'stripe' ? (
                  <button
                    onClick={handleStripeCheckout}
                    disabled={isProcessing || !transactionAmount || parseFloat(transactionAmount) <= 0}
                    className={`w-full py-3 rounded-xl text-xs font-bold font-sans transition flex items-center justify-center gap-2 shadow-lg ${
                      isProcessing
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        : (!transactionAmount || parseFloat(transactionAmount) <= 0)
                          ? "bg-zinc-850 text-zinc-650 cursor-not-allowed"
                          : "bg-emerald-500 hover:bg-emerald-440 text-zinc-950 cursor-pointer active:scale-98 shadow-emerald-500/5 font-semibold"
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Connecting Secure Gateway...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 stroke-[2.5]" />
                        Secure Checkout with Stripe
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleDeposit}
                    disabled={isProcessing || accounts.length === 0}
                    className={`w-full py-3 rounded-xl text-xs font-bold font-sans transition flex items-center justify-center gap-2 shadow-lg ${
                      isProcessing
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        : accounts.length === 0
                          ? "bg-zinc-850 text-zinc-600 cursor-not-allowed"
                          : "bg-emerald-500 hover:bg-emerald-440 text-zinc-950 cursor-pointer active:scale-98 shadow-emerald-500/5 font-semibold"
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Routing Funds Securely...
                      </>
                    ) : (
                      <>
                        <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                        Deposit Liquidity (ACH)
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* WITHDRAW WORKSPACE */}
          {activeTab === 'withdraw' && (
            <div className="flex flex-col gap-4 flex-1 justify-between">
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Disburse Wallet Capital</h4>
                  <p className="text-[11px] text-zinc-400 font-sans mt-1">Withdraw non-allocated cash balances back to your linked personal accounts.</p>
                </div>

                {/* Amount input */}
                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Withdrawal Amount</label>
                  <div className="relative flex items-center bg-zinc-950 rounded-xl border border-zinc-800 px-4 py-3 hover:border-zinc-700 transition">
                    <span className="text-zinc-500 font-bold mr-2 text-sm select-none">$</span>
                    <input
                      type="number"
                      placeholder="Enter amount"
                      value={transactionAmount}
                      onChange={(e) => setTransactionAmount(e.target.value)}
                      disabled={isProcessing}
                      className="bg-transparent border-none w-full text-white text-sm focus:outline-none font-mono"
                    />
                    <button 
                      onClick={() => setTransactionAmount(Math.floor(cash).toString())}
                      disabled={isProcessing}
                      className="text-[9px] font-mono font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded transition select-none cursor-pointer"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {/* Account selector */}
                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Transfer Destination</label>
                  <div className="relative">
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      disabled={isProcessing || accounts.length === 0}
                      className="w-full bg-zinc-950 text-zinc-300 text-xs rounded-xl px-3 py-3 border border-zinc-800 focus:outline-none focus:border-zinc-700 font-sans cursor-pointer appearance-none"
                    >
                      {accounts.length === 0 ? (
                        <option value="">No Accounts Linked</option>
                      ) : (
                        accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.institution} ({acc.accountNumber})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Dynamic limit warning */}
                <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                  <span>Available Liquidity Reserves:</span>
                  <span className="text-zinc-300">${cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Action and status */}
              <div className="space-y-3 pt-4 border-t border-zinc-900 mt-4">
                <AnimatePresence mode="wait">
                  {errorMessage && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[11px] font-sans text-rose-400 flex items-start gap-2"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </motion.div>
                  )}
                  {successMessage && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] font-sans text-emerald-400 flex items-start gap-2"
                    >
                      <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{successMessage}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={handleWithdrawal}
                  disabled={isProcessing || accounts.length === 0}
                  className={`w-full py-3 rounded-xl text-xs font-bold font-sans transition flex items-center justify-center gap-2 shadow-lg ${
                    isProcessing
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      : accounts.length === 0
                        ? "bg-zinc-850 text-zinc-600 cursor-not-allowed"
                        : "bg-emerald-500 hover:bg-emerald-440 text-zinc-950 cursor-pointer active:scale-98 shadow-emerald-500/5"
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Processing Bank Wire...
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                      Withdraw Funds
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ACCOUNTS WORKSPACE */}
          {activeTab === 'accounts' && (
            <div className="flex flex-col gap-4 flex-1 justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Linked Financial Sources</h4>
                    <p className="text-[11px] text-zinc-400 font-sans mt-1">Add or remove banking connections to feed the simulated sandbox ledger.</p>
                  </div>
                  {!showAddAccount && (
                    <button
                      onClick={() => setShowAddAccount(true)}
                      className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-emerald-400 hover:text-emerald-300 font-mono font-bold text-[10px] rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Link Source
                    </button>
                  )}
                </div>

                {/* Add account form inline */}
                {showAddAccount && (
                  <form onSubmit={handleAddAccount} className="bg-zinc-950/50 border border-zinc-850 rounded-xl p-3.5 space-y-3">
                    <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                      <span className="text-[10px] text-zinc-400 font-bold font-mono uppercase">Link Secure Token</span>
                      <button 
                        type="button" 
                        onClick={() => setShowAddAccount(false)}
                        className="text-[10px] text-zinc-500 hover:text-zinc-300 font-mono font-semibold"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 font-mono">TYPE</label>
                        <select 
                          value={newType} 
                          onChange={(e) => setNewType(e.target.value as 'bank' | 'card')}
                          className="w-full bg-zinc-900 text-zinc-300 text-xs px-2.5 py-1.5 rounded border border-zinc-800"
                        >
                          <option value="bank">Bank Account</option>
                          <option value="card">Credit Card</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 font-mono">OWNER</label>
                        <input
                          type="text"
                          value={newHolder}
                          onChange={(e) => setNewHolder(e.target.value)}
                          className="w-full bg-zinc-900 text-zinc-300 text-xs px-2.5 py-1.5 rounded border border-zinc-800 focus:outline-none"
                          placeholder="Holder Name"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 font-mono">INSTITUTION NAME</label>
                        <input
                          type="text"
                          value={newInst}
                          onChange={(e) => setNewInst(e.target.value)}
                          className="w-full bg-zinc-900 text-zinc-300 text-xs px-2.5 py-1.5 rounded border border-zinc-800 focus:outline-none"
                          placeholder="Chase, Visa, etc."
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 font-mono">ACCOUNT / CARD NUM</label>
                        <input
                          type="text"
                          value={newAccNum}
                          onChange={(e) => setNewAccNum(e.target.value)}
                          maxLength={16}
                          className="w-full bg-zinc-900 text-zinc-300 text-xs px-2.5 py-1.5 rounded border border-zinc-800 focus:outline-none"
                          placeholder="e.g. 12345678"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-lg transition"
                    >
                      Verify and Link Account
                    </button>
                  </form>
                )}

                {/* Accounts list */}
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {accounts.map((acc) => (
                    <div 
                      key={acc.id} 
                      className={`p-3 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                        selectedAccountId === acc.id 
                          ? "bg-zinc-900/60 border-zinc-700 hover:border-zinc-650" 
                          : "bg-zinc-950/20 border-zinc-900 hover:bg-zinc-900/30"
                      }`}
                      onClick={() => setSelectedAccountId(acc.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg border ${selectedAccountId === acc.id ? "bg-zinc-950 border-zinc-750 text-emerald-400" : "bg-zinc-900 border-zinc-850 text-zinc-500"}`}>
                          {acc.type === 'bank' ? <Building2 className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white">{acc.institution}</span>
                            <span className="text-[9px] px-1 py-0.2 bg-zinc-800 text-zinc-400 rounded-full font-mono font-bold">
                              {acc.type === 'bank' ? 'ACH' : 'CARD'}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono">{acc.accountNumber} • {acc.holderName}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {accounts.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAccount(acc.id);
                            }}
                            className="p-1.5 bg-zinc-950 hover:bg-rose-950/30 text-zinc-600 hover:text-rose-400 rounded border border-zinc-850 hover:border-rose-900/40 transition cursor-pointer"
                            title="Unlink account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                          ACTIVE
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* HISTORY WORKSPACE */}
          {activeTab === 'history' && (
            <div className="flex flex-col gap-4 flex-1 justify-between">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Secured Transfer Ledger</h4>
                  <button
                    onClick={() => {
                      setWalletHistory([]);
                      localStorage.removeItem("wallet_history");
                    }}
                    className="text-[10px] text-zinc-500 hover:text-rose-400 font-mono cursor-pointer transition"
                  >
                    Clear Ledger
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400 font-sans mt-1">Audit log of wallet settlements, ACH clears, and liquidation records.</p>
              </div>

              {/* Transactions List */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 flex-1">
                {walletHistory.length === 0 ? (
                  <div className="text-center py-10 text-zinc-600 text-xs font-sans">
                    No transactions recorded in this active session.
                  </div>
                ) : (
                  walletHistory.map((tx) => (
                    <div key={tx.id} className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl flex justify-between items-center font-mono text-xs hover:bg-zinc-900/60 transition">
                      <div className="flex items-center gap-2.5">
                        {tx.type === 'DEPOSIT' ? (
                          <span className="p-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded uppercase font-mono text-[9px] font-bold">
                            Credit
                          </span>
                        ) : (
                          <span className="p-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded uppercase font-mono text-[9px] font-bold">
                            Debit
                          </span>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-200">{tx.type === 'DEPOSIT' ? "Wallet Deposit" : "Wallet Disbursement"}</span>
                            <span className="text-[9px] text-zinc-500 font-light font-mono">Ref: {tx.reference}</span>
                          </div>
                          <span className="text-[10px] text-zinc-500 block mt-0.5">{tx.method} • {new Date(tx.timestamp).toLocaleString(undefined, { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true })}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold block text-sm ${tx.type === 'DEPOSIT' ? "text-emerald-400" : "text-rose-400"}`}>
                          {tx.type === 'DEPOSIT' ? '+' : '-'}${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-zinc-500">Settle: Cleared</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
