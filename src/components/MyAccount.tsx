import { useState, useEffect, FormEvent } from "react";
import { User as AuthUser } from "firebase/auth";
import { PortfolioItem, TradeRecord } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  User, 
  Shield, 
  Key, 
  Building2, 
  Activity, 
  CreditCard, 
  Lock, 
  Mail, 
  CheckCircle, 
  Clock, 
  Database,
  Sliders,
  DollarSign,
  TrendingUp,
  Award,
  RefreshCw
} from "lucide-react";

interface MyAccountProps {
  currentUser: AuthUser | null;
  cash: number;
  portfolio: PortfolioItem[];
  tradeHistory: TradeRecord[];
  onLogApiEvent: (
    method: 'GET' | 'POST' | 'WS_TICK',
    urlOrTopic: string,
    status: number | 'LIVE',
    action: string,
    payload: any,
    explanation: string
  ) => void;
  openAuthModal: () => void;
}

export default function MyAccount({ 
  currentUser, 
  cash, 
  portfolio, 
  tradeHistory, 
  onLogApiEvent,
  openAuthModal
}: MyAccountProps) {
  // Local profile states
  const [displayName, setDisplayName] = useState<string>(() => {
    return localStorage.getItem("account_display_name") || currentUser?.displayName || "Market Strategist";
  });
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [newNameInput, setNewNameInput] = useState<string>(displayName);
  const [isNameSaving, setIsNameSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Linked accounts placeholder list (aligned with MoneyWallet state)
  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("linked_accounts");
      if (saved) {
        setLinkedAccounts(JSON.parse(saved));
      } else {
        const defaultAccounts = [
          { id: 'acc-1', institution: 'Chase Bank', type: 'bank', accountNumber: '•••• 8912', holderName: 'Nazim Fx' },
          { id: 'acc-2', institution: 'Visa Card', type: 'card', accountNumber: '•••• 4352', holderName: 'Nazim Fx' }
        ];
        setLinkedAccounts(defaultAccounts);
        localStorage.setItem("linked_accounts", JSON.stringify(defaultAccounts));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Update display name logic
  const handleSaveDisplayName = async (e: FormEvent) => {
    e.preventDefault();
    if (!newNameInput.trim()) return;

    setIsNameSaving(true);
    setSuccessMessage("");

    // Simulate database write
    setTimeout(() => {
      setDisplayName(newNameInput);
      localStorage.setItem("account_display_name", newNameInput);
      setIsEditingName(false);
      setIsNameSaving(false);
      setSuccessMessage("Account identity updated successfully.");
      
      onLogApiEvent(
        'POST',
        '/api/account/update-profile',
        200,
        `Update Profile Identity`,
        { displayName: newNameInput },
        `User updated their display name/nickname. State synchronized across local persistence layer.`
      );

      setTimeout(() => setSuccessMessage(""), 4000);
    }, 600);
  };

  // Compute key stats
  const totalTradesCount = tradeHistory.length;
  const portfolioHoldingsValue = portfolio.reduce((sum, item) => sum + (item.shares * item.avgBuyPrice), 0);
  const netAccountValue = cash + portfolioHoldingsValue;
  const buyTrades = tradeHistory.filter(t => t.type === 'BUY');
  const sellTrades = tradeHistory.filter(t => t.type === 'SELL');
  const totalVolumeTraded = tradeHistory.reduce((sum, t) => sum + t.total, 0);

  // Security Credentials Rotate Simulation
  const [apiSecretKey, setApiSecretKey] = useState<string>(() => {
    return "sec_live_alg_" + Array.from({length: 24}, () => Math.random().toString(36)[2]).join("");
  });
  const [isRotating, setIsRotating] = useState<boolean>(false);

  const rotateApiKeys = () => {
    setIsRotating(true);
    setTimeout(() => {
      const newKey = "sec_live_alg_" + Array.from({length: 24}, () => Math.random().toString(36)[2]).join("");
      setApiSecretKey(newKey);
      setIsRotating(false);
      
      onLogApiEvent(
        'POST',
        '/api/account/rotate-keys',
        200,
        `Rotate Private API Credentials`,
        { oldKey: "••••••••", newKey: "••••••••" },
        `Revoked inactive private keys and provisioned fresh cryptographic secrets for automated SDK actions.`
      );

      setSuccessMessage("Secure API credentials rotated successfully.");
      setTimeout(() => setSuccessMessage(""), 4000);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header Overview Card */}
      <div className="bg-zinc-950/40 border border-zinc-850 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 relative shrink-0">
              <User className="w-8 h-8" />
              <div className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 text-zinc-950 rounded-full p-1 border-2 border-zinc-950">
                <CheckCircle className="w-3.5 h-3.5 fill-current" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                {isEditingName ? (
                  <form onSubmit={handleSaveDisplayName} className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={newNameInput}
                      onChange={(e) => setNewNameInput(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-white text-base rounded-xl px-3 py-1 focus:outline-none focus:border-emerald-500 font-sans"
                      maxLength={24}
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={isNameSaving}
                      className="px-3 py-1 bg-emerald-500 text-zinc-950 rounded-lg text-xs font-bold hover:bg-emerald-440 transition disabled:opacity-50 cursor-pointer"
                    >
                      {isNameSaving ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(false)}
                      className="px-3 py-1 bg-zinc-800 text-zinc-400 rounded-lg text-xs hover:text-white transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <h3 className="text-lg font-bold text-zinc-100 font-sans tracking-tight">{displayName}</h3>
                    <button
                      onClick={() => { setNewNameInput(displayName); setIsEditingName(true); }}
                      className="text-[10px] text-zinc-500 hover:text-emerald-400 font-mono transition underline cursor-pointer"
                    >
                      Edit Name
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 mt-2.5 text-xs text-zinc-400 font-mono">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-zinc-600" />
                  {currentUser?.email || "guest-session@nasdaq-sandbox.net"}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                <span className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-emerald-400" />
                  Institutional Pro Tier
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!currentUser ? (
              <button
                onClick={openAuthModal}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-440 text-zinc-950 font-bold font-sans rounded-xl text-xs shadow-lg transition active:scale-98 cursor-pointer flex items-center gap-1.5"
              >
                <Shield className="w-4 h-4 stroke-[2]" />
                Link Google Account
              </button>
            ) : (
              <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5">
                <Database className="w-4 h-4" />
                Cloud Synced Secure
              </div>
            )}
          </div>
        </div>

        {/* Feedback Alert banner */}
        <AnimatePresence>
          {successMessage && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Account Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Left Side: Ledger Performance Metrics */}
        <div className="md:col-span-7 bg-zinc-950/40 border border-zinc-850 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Ledger Performance & Limits</h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-zinc-900/40 border border-zinc-850/60 rounded-xl p-3">
              <span className="block text-[10px] text-zinc-500 font-mono uppercase">Net Liquidity</span>
              <span className="text-zinc-200 text-sm font-bold block mt-1 font-mono">${netAccountValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-zinc-900/40 border border-zinc-850/60 rounded-xl p-3">
              <span className="block text-[10px] text-zinc-500 font-mono uppercase">Settled Cash</span>
              <span className="text-zinc-200 text-sm font-bold block mt-1 font-mono">${cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-zinc-900/40 border border-zinc-850/60 rounded-xl p-3">
              <span className="block text-[10px] text-zinc-500 font-mono uppercase">Held Value</span>
              <span className="text-zinc-200 text-sm font-bold block mt-1 font-mono">${portfolioHoldingsValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-4 space-y-3.5">
            <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Total Trades Executed</span>
              <span className="text-white font-bold">{totalTradesCount} Transactions</span>
            </div>
            <div className="h-[1px] bg-zinc-900" />
            <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-zinc-500" /> Cumulative Trade Volume</span>
              <span className="text-white font-bold">${totalVolumeTraded.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="h-[1px] bg-zinc-900" />
            <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5"><Sliders className="w-3.5 h-3.5 text-zinc-500" /> Trading Ratios (Buy / Sell)</span>
              <span className="text-white font-bold">{buyTrades.length} Buys / {sellTrades.length} Sells</span>
            </div>
          </div>

          <div className="bg-zinc-900/10 border border-zinc-900/60 p-3.5 rounded-xl text-[11px] text-zinc-400 font-sans leading-normal">
            <span className="text-white font-semibold block mb-0.5">Account Solvency Guard:</span>
            Your institutional credentials permit up to $1,000,000.00 daily bank credit deposits. All securities purchased are managed inside highly secure sandboxed clearinghouses in compliance with federal guidelines.
          </div>
        </div>

        {/* Right Side: Security, API & Linked Sources */}
        <div className="md:col-span-5 flex flex-col gap-5">
          {/* Security & Access Panel */}
          <div className="bg-zinc-950/40 border border-zinc-850 rounded-2xl p-5 space-y-4 flex-1">
            <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
              <Lock className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Secured Credentials & Keys</h4>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <span className="text-[10px] text-zinc-500 font-mono uppercase block">Private API Session Key</span>
                <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 hover:border-zinc-700 transition">
                  <Key className="w-4 h-4 text-zinc-600 shrink-0" />
                  <span className="text-zinc-300 font-mono text-[11px] truncate flex-1">{apiSecretKey}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] text-zinc-500 font-mono uppercase block">Last Authorized Login</span>
                <div className="flex items-center gap-2 bg-zinc-900/30 border border-zinc-900 rounded-xl px-3.5 py-2.5">
                  <Clock className="w-4 h-4 text-zinc-600 shrink-0" />
                  <span className="text-zinc-400 font-mono text-[11px]">Today at {new Date().toLocaleTimeString()}</span>
                </div>
              </div>

              <button
                onClick={rotateApiKeys}
                disabled={isRotating}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-mono font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {isRotating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    Generating fresh tokens...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                    Rotate Cryptographic Credentials
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Linked Sources Quick Summary */}
          <div className="bg-zinc-950/40 border border-zinc-850 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Currently Linked Accounts</span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">{linkedAccounts.length} Connected</span>
            </div>

            <div className="space-y-2">
              {linkedAccounts.slice(0, 2).map((acc) => (
                <div key={acc.id} className="p-2.5 bg-zinc-900/30 border border-zinc-900 rounded-xl flex items-center justify-between text-xs font-sans">
                  <div className="flex items-center gap-2.5">
                    <div className="text-zinc-500">
                      {acc.type === 'bank' ? <Building2 className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="font-semibold text-zinc-300 block leading-tight">{acc.institution}</span>
                      <span className="text-[10px] text-zinc-500 font-mono leading-tight">{acc.accountNumber} • {acc.holderName}</span>
                    </div>
                  </div>
                  <span className="text-[9px] bg-zinc-900 text-zinc-400 border border-zinc-800 px-1.5 py-0.2 rounded font-mono font-bold uppercase">
                    {acc.type === 'bank' ? 'ACH' : 'Card'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
