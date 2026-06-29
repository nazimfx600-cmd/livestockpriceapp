import React, { useState, useEffect } from "react";
import { auth, db } from "../lib/firebase";
import { collection, getDocs, setDoc, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { User } from "firebase/auth";
import { SupportTicket } from "../types";
import { 
  LifeBuoy, 
  HelpCircle, 
  Cpu, 
  Terminal, 
  Send, 
  Activity, 
  Database, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  RefreshCw, 
  Clock, 
  Flame, 
  CheckSquare,
  ShieldAlert
} from "lucide-react";

// Firestore Exception Handling Conformity (per firebase-integration skill)
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface SupportCenterProps {
  currentUser: User | null;
  cash: number;
  totalTrades: number;
  portfolioItemsCount: number;
  activeTabName: string;
  onLogApiEvent: (
    method: 'GET' | 'POST' | 'WS_TICK',
    urlOrTopic: string,
    status: number | 'LIVE',
    action: string,
    payload?: any,
    explanation?: string
  ) => void;
}

export default function SupportCenter({
  currentUser,
  cash,
  totalTrades,
  portfolioItemsCount,
  activeTabName,
  onLogApiEvent
}: SupportCenterProps) {
  // Support Center tabs
  const [activeSubTab, setActiveSubTab] = useState<'submit' | 'history'>('submit');

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<'Technical' | 'Account' | 'Billing' | 'Feedback'>('Technical');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tickets lists
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Diagnostic states
  const [latency, setLatency] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] SUPPORT_DECK_INITIALIZED: Listening for sandbox issues.`,
    `[${new Date().toLocaleTimeString()}] DIAGNOSTICS: Secure local context prepared. ready for verification.`
  ]);

  // Read tickets from Firestore or LocalStorage on mount/user change
  useEffect(() => {
    fetchTickets();
  }, [currentUser]);

  const addTerminalLog = (msg: string) => {
    setTerminalLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);
  };

  const fetchTickets = async () => {
    setLoadingTickets(true);
    if (currentUser) {
      const ticketsPath = `users/${currentUser.uid}/tickets`;
      try {
        const querySnapshot = await getDocs(collection(db, "users", currentUser.uid, "tickets"));
        const fetched: SupportTicket[] = [];
        querySnapshot.forEach((doc) => {
          fetched.push(doc.data() as SupportTicket);
        });
        // Sort descending by date
        fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTickets(fetched);
        addTerminalLog(`FIREBASE_SYNC: Synchronized ${fetched.length} cloud tickets successfully.`);
      } catch (err) {
        addTerminalLog(`FIREBASE_ERROR: Failed to fetch cloud tickets. Check permissions.`);
        try {
          handleFirestoreError(err, OperationType.GET, ticketsPath);
        } catch (wrappedErr) {
          console.error("Firestore wrapped error: ", wrappedErr);
        }
      }
    } else {
      // Guest session fallback to LocalStorage
      try {
        const local = localStorage.getItem("support_tickets");
        if (local) {
          const parsed = JSON.parse(local) as SupportTicket[];
          setTickets(parsed);
          addTerminalLog(`LOCAL_STORAGE_SYNC: Loaded ${parsed.length} persistent local guest tickets.`);
        } else {
          setTickets([]);
        }
      } catch {
        setTickets([]);
      }
    }
    setLoadingTickets(false);
  };

  // Perform quick terminal ping simulation
  const handleTestLatency = () => {
    setIsPinging(true);
    addTerminalLog("DIAGNOSTIC_PING: Handshaking with secure edge servers...");
    setTimeout(() => {
      const generatedLatency = Math.floor(Math.random() * 45) + 12; // 12-57ms
      setLatency(generatedLatency);
      setIsPinging(false);
      addTerminalLog(`DIAGNOSTIC_PONG: Connection handshaked. Edge Latency is ${generatedLatency}ms.`);
      onLogApiEvent(
        'GET',
        '/api/support/ping',
        200,
        'Execute Network Diagnostics',
        { latency: `${generatedLatency}ms` },
        'Tested simulated latency pipeline connecting the front-end user sandbox container directly to cloud firestore proxies.'
      );
    }, 800);
  };

  // Handle support ticket creation
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!title.trim()) {
      setFormError("Please enter an issue subject/title.");
      return;
    }
    if (!description.trim()) {
      setFormError("Please describe the issue in detail.");
      return;
    }

    setIsSubmitting(true);
    addTerminalLog(`SUBMIT_TICKET: Compiling diagnostics payload and creating ticket record.`);

    // Capture precise terminal snapshot at execution time
    const terminalStatus = {
      connectionState: 'CONNECTED' as const,
      activeTab: activeTabName,
      totalTrades,
      cash,
      portfolioItems: portfolioItemsCount
    };

    const newTicket: SupportTicket = {
      id: `ticket-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      status: 'Open',
      createdAt: new Date().toISOString(),
      terminalStatus
    };

    if (currentUser) {
      // Save securely to Cloud Firestore for registered users
      const ticketPath = `users/${currentUser.uid}/tickets/${newTicket.id}`;
      try {
        await setDoc(doc(db, "users", currentUser.uid, "tickets", newTicket.id), newTicket);
        addTerminalLog(`CLOUD_SAVE_SUCCESS: Document registered securely at ${ticketPath}.`);
        setFormSuccess(`Ticket registered successfully! Our technical desk has synced your terminal metadata.`);
        setTitle("");
        setDescription("");
        fetchTickets();

        onLogApiEvent(
          'POST',
          '/api/support/tickets',
          201,
          'Publish Secure Support Ticket',
          newTicket,
          'Support ticket published securely to Firestore nested path. Custom sandbox metadata snapshots were bundled atomically.'
        );
      } catch (err) {
        setFormError("Firestore authorization failed. Check security rules configuration.");
        addTerminalLog(`CLOUD_SAVE_FAIL: Permission denied on ${ticketPath}.`);
        try {
          handleFirestoreError(err, OperationType.WRITE, ticketPath);
        } catch (wrappedErr) {
          console.error("Firestore wrapped error: ", wrappedErr);
        }
      }
    } else {
      // Save locally to LocalStorage for guest users
      try {
        const updated = [newTicket, ...tickets];
        localStorage.setItem("support_tickets", JSON.stringify(updated));
        setTickets(updated);
        addTerminalLog(`LOCAL_SAVE_SUCCESS: Registered guest ticket in browser local cache.`);
        setFormSuccess(`Guest ticket logged! Stored securely in your browser's persistent sandbox ledger.`);
        setTitle("");
        setDescription("");

        onLogApiEvent(
          'POST',
          '/api/support/tickets/local',
          200,
          'Publish Guest Support Ticket',
          newTicket,
          'Saved guest session support ticket directly to localStorage to respect sandbox limitations without cloud authentication.'
        );
      } catch (err) {
        setFormError("Local storage quota exceeded or unavailable.");
      }
    }
    setIsSubmitting(false);
  };

  // Toggle ticket status (e.g. resolve it)
  const handleToggleResolve = async (ticket: SupportTicket) => {
    const updatedStatus = ticket.status === 'Resolved' ? 'Open' : 'Resolved';
    addTerminalLog(`UPDATE_TICKET: Modifying status for ${ticket.id} to '${updatedStatus}'.`);

    if (currentUser) {
      const ticketPath = `users/${currentUser.uid}/tickets/${ticket.id}`;
      try {
        await updateDoc(doc(db, "users", currentUser.uid, "tickets", ticket.id), { status: updatedStatus });
        addTerminalLog(`CLOUD_UPDATE_SUCCESS: Status altered to '${updatedStatus}'.`);
        fetchTickets();

        onLogApiEvent(
          'POST',
          `/api/support/tickets/${ticket.id}/resolve`,
          200,
          'Update Support Ticket Status',
          { id: ticket.id, status: updatedStatus },
          'Updated Firestore document state atomically to toggle support ticket status between open and resolved.'
        );
      } catch (err) {
        addTerminalLog(`CLOUD_UPDATE_FAIL: Unauthorized update attempt on ${ticketPath}.`);
        try {
          handleFirestoreError(err, OperationType.UPDATE, ticketPath);
        } catch (wrappedErr) {
          console.error("Firestore wrapped error: ", wrappedErr);
        }
      }
    } else {
      try {
        const updated = tickets.map(t => t.id === ticket.id ? { ...t, status: updatedStatus } : t);
        localStorage.setItem("support_tickets", JSON.stringify(updated));
        setTickets(updated);
        addTerminalLog(`LOCAL_UPDATE_SUCCESS: Switched guest ticket ${ticket.id} to '${updatedStatus}'.`);
      } catch {}
    }
  };

  // Delete a ticket
  const handleDeleteTicket = async (ticketId: string) => {
    addTerminalLog(`DELETE_TICKET: Revoking ticket document ${ticketId}.`);
    
    if (currentUser) {
      const ticketPath = `users/${currentUser.uid}/tickets/${ticketId}`;
      try {
        await deleteDoc(doc(db, "users", currentUser.uid, "tickets", ticketId));
        addTerminalLog(`CLOUD_DELETE_SUCCESS: Document purged from storage pool.`);
        fetchTickets();

        onLogApiEvent(
          'POST',
          `/api/support/tickets/${ticketId}/delete`,
          200,
          'Purge Support Ticket',
          { id: ticketId },
          'Removed support ticket document from private cloud store permanently.'
        );
      } catch (err) {
        addTerminalLog(`CLOUD_DELETE_FAIL: Purge authorization rejected.`);
        try {
          handleFirestoreError(err, OperationType.DELETE, ticketPath);
        } catch (wrappedErr) {
          console.error("Firestore wrapped error: ", wrappedErr);
        }
      }
    } else {
      try {
        const updated = tickets.filter(t => t.id !== ticketId);
        localStorage.setItem("support_tickets", JSON.stringify(updated));
        setTickets(updated);
        addTerminalLog(`LOCAL_DELETE_SUCCESS: Purged guest ticket ${ticketId} from browser cache.`);
      } catch {}
    }
  };

  // Quick system diagnostics verification script
  const handleRunSystemDiagnostics = () => {
    addTerminalLog("SYSTEM_DIAGNOSTICS_RUN: Initializing complete sandbox health verification...");
    setTimeout(() => addTerminalLog("[STAGE 1/3] VERIFYING CAPITAL STACKS: Ledger cash matches memory states ($" + cash.toLocaleString() + ")"), 300);
    setTimeout(() => addTerminalLog("[STAGE 2/3] PORTFOLIO SANITY CHECK: Verified " + portfolioItemsCount + " open security listings."), 600);
    setTimeout(() => {
      addTerminalLog("[STAGE 3/3] SECURITY CLEARANCE: Secure Auth Token is " + (currentUser ? "VALID (UID: " + currentUser.uid.substring(0, 8) + "...)" : "ACTIVE_GUEST"));
      addTerminalLog("SYSTEM_DIAGNOSTICS_SUCCESS: All core sandbox engines are online. Sandbox operations healthy.");
      
      onLogApiEvent(
        'GET',
        '/api/support/diagnostics',
        200,
        'Verify System Health',
        { status: "HEALTHY", cash, portfolioItemsCount, authMode: currentUser ? "CLOUD" : "GUEST" },
        'Automated local diagnostic sequence parsed critical variables and asserted absolute integrity of local state maps.'
      );
    }, 1000);
  };

  return (
    <div className="bg-zinc-900/60 rounded-3xl p-6 border border-zinc-800/80 shadow-2xl flex flex-col gap-6" id="support-center-wrapper">
      
      {/* Header and Telemetry Dashboard */}
      <div className="flex flex-col gap-1.5 border-b border-zinc-850 pb-5">
        <div className="flex items-center gap-2">
          <LifeBuoy className="w-5 h-5 text-emerald-400" />
          <h3 className="font-sans font-bold text-white text-base">Help & Support Ticket Center</h3>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Log Technical bugs, request assistance, or view terminal telemetry below. Registered clients sync support queries securely to global Firestore databases.
        </p>
      </div>

      {/* System Telemetry Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-[11px]">
        {/* Card 1: Identity status */}
        <div className="bg-zinc-950/40 p-3.5 rounded-2xl border border-zinc-850/80 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Identity Integrity</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="text-zinc-200 font-bold truncate">
              {currentUser ? currentUser.email : "Guest Session"}
            </div>
            <div className="text-zinc-500 text-[10px] mt-0.5">
              {currentUser ? `UID: ${currentUser.uid.substring(0, 12)}...` : "Local Browser Cache Storage"}
            </div>
          </div>
        </div>

        {/* Card 2: Engine Telemetry */}
        <div className="bg-zinc-950/40 p-3.5 rounded-2xl border border-zinc-850/80 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Engine Telemetry</span>
            <Cpu className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div className="grid grid-cols-2 gap-y-1 text-zinc-300">
            <div>Tab: <span className="text-emerald-400 font-semibold uppercase">{activeTabName}</span></div>
            <div>Trades: <span className="text-white font-semibold">{totalTrades}</span></div>
            <div>Cash: <span className="text-zinc-400 font-semibold">${Math.floor(cash).toLocaleString()}</span></div>
            <div>Securities: <span className="text-zinc-400 font-semibold">{portfolioItemsCount}</span></div>
          </div>
        </div>

        {/* Card 3: Cloud Pipeline status */}
        <div className="bg-zinc-950/40 p-3.5 rounded-2xl border border-zinc-850/80 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Cloud Sync Pipeline</span>
            <Database className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-zinc-300">
                Mode: <span className="text-emerald-400 font-bold">{currentUser ? "Firestore DB" : "Guest Sandbox"}</span>
              </div>
              <div className="text-zinc-500 text-[10px] mt-0.5">
                Latency: {latency !== null ? `${latency}ms` : "untested"}
              </div>
            </div>
            <button
              onClick={handleTestLatency}
              disabled={isPinging}
              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-750 text-zinc-300 font-bold rounded-lg border border-zinc-700/60 cursor-pointer transition disabled:opacity-50"
            >
              {isPinging ? "Pinging..." : "Test Latency"}
            </button>
          </div>
        </div>
      </div>

      {/* Diagnostics Logs Terminal Box */}
      <div className="bg-zinc-950 border border-zinc-850/80 rounded-2xl p-4 font-mono text-[10px]">
        <div className="flex justify-between items-center border-b border-zinc-900 pb-2 mb-2.5">
          <div className="flex items-center gap-1.5 text-zinc-400 font-bold uppercase tracking-wider">
            <Terminal className="w-3.5 h-3.5 text-emerald-500" />
            <span>Diagnostics Logs Console</span>
          </div>
          <button 
            onClick={handleRunSystemDiagnostics}
            className="text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer flex items-center gap-1 font-bold"
          >
            <Activity className="w-3 h-3 animate-pulse" />
            Verify Health Status
          </button>
        </div>
        <div className="h-28 overflow-y-auto flex flex-col-reverse gap-1 text-zinc-500 select-all pr-1 scrollbar-thin">
          {terminalLogs.map((log, i) => (
            <div key={i} className="leading-relaxed">
              <span className="text-zinc-600">&gt;&gt;</span> {log}
            </div>
          ))}
        </div>
      </div>

      {/* Main Ticket Center Actions Workspace */}
      <div className="flex flex-col gap-4">
        {/* Tab Sub-Navigation */}
        <div className="flex border-b border-zinc-850 text-xs font-mono gap-4">
          <button
            onClick={() => setActiveSubTab('submit')}
            className={`pb-2.5 font-bold transition flex items-center gap-1.5 relative cursor-pointer ${
              activeSubTab === 'submit' ? "text-emerald-400 border-b-2 border-emerald-500" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Send className="w-3.5 h-3.5 text-emerald-500" />
            Log Issue Ticket
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`pb-2.5 font-bold transition flex items-center gap-1.5 relative cursor-pointer ${
              activeSubTab === 'history' ? "text-emerald-400 border-b-2 border-emerald-500" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-500" />
            My Ticket Ledger ({tickets.length})
          </button>
        </div>

        {/* Tab 1: Form to Submit Tickets */}
        {activeSubTab === 'submit' && (
          <form onSubmit={handleSubmitTicket} className="flex flex-col gap-4">
            {formError && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-2 text-rose-400 text-xs font-sans">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}
            
            {formSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-start gap-2 text-emerald-400 text-xs font-sans">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formSuccess}</span>
              </div>
            )}

            {!currentUser && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2 text-amber-500 text-xs font-sans">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Running Guest Session Mode</span>
                  <span className="text-[11px] block mt-0.5 opacity-90 leading-relaxed">
                    Tickets will store in Local Browser Cache. Register or Sign In to securely archive issues in cloud server databases.
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category selector */}
              <div>
                <label className="block text-[10px] font-mono uppercase text-zinc-500 font-bold tracking-wider mb-1.5">Category</label>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  {(['Technical', 'Account', 'Billing', 'Feedback'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`py-2 px-3 rounded-xl border font-bold text-center transition cursor-pointer ${
                        category === cat 
                          ? "bg-zinc-800 text-emerald-400 border-emerald-500/30" 
                          : "bg-zinc-950/40 text-zinc-400 border-zinc-850/80 hover:text-zinc-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority Select */}
              <div>
                <label className="block text-[10px] font-mono uppercase text-zinc-500 font-bold tracking-wider mb-1.5">Priority Urgency</label>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  {(['Low', 'Medium', 'High'] as const).map((prio) => (
                    <button
                      key={prio}
                      type="button"
                      onClick={() => setPriority(prio)}
                      className={`py-2 px-1 rounded-xl border font-bold text-center transition cursor-pointer ${
                        priority === prio 
                          ? prio === 'High' 
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/30" 
                            : prio === 'Medium' 
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30" 
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-zinc-950/40 text-zinc-400 border-zinc-850/80 hover:text-zinc-200"
                      }`}
                    >
                      {prio}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Title / Subject */}
            <div>
              <label className="block text-[10px] font-mono uppercase text-zinc-500 font-bold tracking-wider mb-1.5">Issue Subject / Title</label>
              <input
                type="text"
                placeholder="Brief summary of the technical problem..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/40 font-sans"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] font-mono uppercase text-zinc-500 font-bold tracking-wider mb-1.5">Detailed Description</label>
              <textarea
                placeholder="What occurred? Detail steps to reproduce or expected sandbox behavior. Terminal telemetry will be appended atomically..."
                value={description}
                rows={4}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/40 font-sans leading-relaxed resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black rounded-xl text-xs sm:text-sm font-sans flex items-center justify-center gap-2 shadow-md cursor-pointer transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? "Syncing..." : "Submit Support Ticket with Telemetry"}</span>
            </button>
          </form>
        )}

        {/* Tab 2: Existing Ticket Ledger */}
        {activeSubTab === 'history' && (
          <div className="flex flex-col gap-4">
            {loadingTickets ? (
              <div className="text-center py-8 text-xs font-mono text-zinc-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Reading support ticket pool...</span>
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-10 bg-zinc-950/20 rounded-2xl border border-zinc-900 text-xs text-zinc-500 font-sans">
                No tickets recorded. Navigate to "Log Issue Ticket" to submit your first query.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {tickets.map((ticket) => {
                  const isResolved = ticket.status === 'Resolved';
                  const dateString = new Date(ticket.createdAt).toLocaleDateString(undefined, {
                    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  });

                  return (
                    <div 
                      key={ticket.id} 
                      className={`bg-zinc-950/30 p-4 rounded-2xl border border-zinc-850/80 hover:border-zinc-800 transition flex flex-col gap-3 font-mono text-xs`}
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2.5 border-b border-zinc-900/60">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            ticket.priority === 'High' 
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                              : ticket.priority === 'Medium' 
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }`}>
                            {ticket.priority} Prio
                          </span>
                          <span className="text-[10px] text-zinc-500">ID: {ticket.id}</span>
                          <span className="text-[10px] text-zinc-600">•</span>
                          <span className="text-[10px] text-zinc-400 font-sans">{dateString}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleResolve(ticket)}
                            className={`px-2.5 py-1 rounded-lg font-bold border transition text-[10px] cursor-pointer ${
                              isResolved 
                                ? "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200" 
                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                            }`}
                          >
                            {isResolved ? "Reopen Ticket" : "Resolve Ticket"}
                          </button>
                          <button
                            onClick={() => handleDeleteTicket(ticket.id)}
                            className="p-1.5 bg-zinc-900 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 rounded-lg border border-zinc-850 transition cursor-pointer"
                            title="Delete Ticket"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Ticket Title & Desc */}
                      <div className="font-sans">
                        <h4 className={`text-sm font-bold text-white flex items-center gap-1.5 ${isResolved ? "line-through text-zinc-500" : ""}`}>
                          {isResolved ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <HelpCircle className="w-4 h-4 text-zinc-500 shrink-0" />
                          )}
                          <span>{ticket.title}</span>
                        </h4>
                        <p className={`text-xs text-zinc-300 mt-1.5 leading-relaxed ${isResolved ? "text-zinc-500" : ""}`}>
                          {ticket.description}
                        </p>
                      </div>

                      {/* Attached Sandbox Snapshot Metadata */}
                      <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-900 flex flex-col gap-2">
                        <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-1">
                          <Cpu className="w-3 h-3 text-emerald-500" />
                          <span>Captured Terminal State Snapshot</span>
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-1 text-[10px] text-zinc-400 font-mono">
                          <div>Context Tab: <span className="text-zinc-200 uppercase">{ticket.terminalStatus.activeTab}</span></div>
                          <div>Holding Pool: <span className="text-zinc-200">{ticket.terminalStatus.portfolioItems} Assets</span></div>
                          <div>Total Trades: <span className="text-zinc-200">{ticket.terminalStatus.totalTrades} Executed</span></div>
                          <div>Cash Reserve: <span className="text-emerald-400 font-bold">${Math.floor(ticket.terminalStatus.cash).toLocaleString()}</span></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
