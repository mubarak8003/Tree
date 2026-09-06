import React, { useState, useMemo, useRef, useEffect } from "react";
import { SupportMessage, SupportThreadMessage, UserProfile } from "../../../types";
import { 
  MessageSquare, 
  Send, 
  Trash2, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Check, 
  Copy, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw, 
  Inbox, 
  CheckCheck, 
  PlusCircle, 
  ArrowLeft,
  Flame,
  Mail,
  Wallet,
  X
} from "lucide-react";
import { 
  replyToSupportMessage, 
  sendAdminDirectMessage, 
  deleteSupportMessage,
  updateSupportTicketStatus,
  markSupportTicketReadByAdmin
} from "../../../firebaseService";

interface SupportTabProps {
  supportMessages: SupportMessage[];
  onTriggerNotification?: (message: string, type: "success" | "info" | "error") => void;
  adminEmail: string;
  allUsers?: UserProfile[];
}

type FilterStatusType = "ALL" | "NEEDS_REPLY" | "OPEN" | "IN_PROGRESS" | "RESOLVED";

const CANNED_RESPONSES = [
  {
    label: "Deposit Verified",
    text: "Your deposit payment has been verified and the full amount has been successfully credited to your wallet balance. Happy trading!"
  },
  {
    label: "Withdrawal Processed",
    text: "Your withdrawal request has been approved and processed. The funds will reflect in your bank account / UPI within 15-30 minutes."
  },
  {
    label: "Need UTR Slip",
    text: "Please provide your 12-digit UPI / IMPS UTR transaction reference number and a clear payment receipt screenshot for verification."
  },
  {
    label: "Account Verified",
    text: "Your account credentials and security details have been verified successfully. You can now execute trades and manage funds smoothly."
  },
  {
    label: "Under Review",
    text: "Our financial operations team is currently looking into this matter. Please allow 10-15 minutes while we resolve it."
  },
  {
    label: "Issue Resolved",
    text: "Your issue has been resolved. Please check your account. Feel free to reply here if you require any further assistance."
  }
];

export const SupportTab: React.FC<SupportTabProps> = ({
  supportMessages = [],
  onTriggerNotification,
  adminEmail,
  allUsers = []
}) => {
  // Active selected ticket for chat workspace
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Mobile View Toggle: "LIST" shows inbox list, "CHAT" shows full chat studio on small screens
  const [mobileViewMode, setMobileViewMode] = useState<"LIST" | "CHAT">("LIST");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatusType>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Reply Composer State
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [resolveOnSend, setResolveOnSend] = useState(true);

  // Direct Message Modal State
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [targetUserEmail, setTargetUserEmail] = useState("");
  const [targetUserName, setTargetUserName] = useState("");
  const [directSubject, setDirectSubject] = useState("");
  const [directMsgText, setDirectMsgText] = useState("");
  const [isDirectSending, setIsDirectSending] = useState(false);
  const [userSearchText, setUserSearchText] = useState("");
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  // Copy feedback
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);

  // Sound feedback for user replies
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // ignore
    }
  };

  // Sort messages: newest activity first (updatedAt or lastReplyAt or createdAt)
  const sortedMessages = useMemo(() => {
    return [...supportMessages].sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.lastReplyAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.lastReplyAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [supportMessages]);

  // Intelligent Multi-Token Search Matcher
  const matchesSearch = (msg: SupportMessage, queryStr: string): boolean => {
    if (!queryStr.trim()) return true;
    const cleanQ = queryStr.toLowerCase().trim();

    // 1. Direct includes match across standard ticket fields
    const directFields = [
      msg.userName,
      msg.userEmail,
      msg.userId,
      msg.id,
      msg.subject,
      msg.message,
      msg.lastReplyText
    ].filter(Boolean).map(s => s!.toLowerCase());

    if (directFields.some(f => f.includes(cleanQ))) return true;

    // 2. Thread messages content check
    if (msg.thread?.some(t => t.text.toLowerCase().includes(cleanQ) || t.senderName.toLowerCase().includes(cleanQ))) {
      return true;
    }

    // 3. User profile matching in registered users (e.g. searching "mubarak8046@gmail.com" when user name="Mubarak" & email="sahana8046@gmail.com")
    const matchedProfile = allUsers.find(u => u.id === msg.userId || u.email === msg.userEmail);
    if (matchedProfile) {
      const profileCombined = `${matchedProfile.name || ""} ${matchedProfile.email || ""} ${matchedProfile.id || ""}`.toLowerCase();
      if (profileCombined.includes(cleanQ)) return true;
    }

    // 4. Tokenized smart match: splits query into words & numbers (excluding generic domain words)
    const rawTokens = cleanQ.match(/[a-z0-9]+/g) || [];
    const significantTokens = rawTokens.filter(t => !["gmail", "com", "yahoo", "hotmail", "org", "net", "mail"].includes(t));
    
    if (significantTokens.length > 0) {
      const combinedTicketText = [
        msg.userName,
        msg.userEmail,
        msg.userId,
        msg.subject,
        msg.message,
        matchedProfile?.name,
        matchedProfile?.email
      ].filter(Boolean).join(" ").toLowerCase();

      // If all significant tokens (e.g. "mubarak" and "8046") exist across the user/ticket profile
      const allTokensMatch = significantTokens.every(t => combinedTicketText.includes(t));
      if (allTokensMatch) return true;
    }

    return false;
  };

  // Count tickets needing action: where lastSender is USER or unreadByAdmin or status is OPEN
  const needsReplyCount = useMemo(() => {
    return supportMessages.filter((m) => {
      if (m.status === "RESOLVED") return false;
      const lastMsgInThread = m.thread && m.thread.length > 0 ? m.thread[m.thread.length - 1] : null;
      const isUserLast = lastMsgInThread ? lastMsgInThread.sender === "USER" : m.lastSender === "USER" || !m.adminReply;
      return isUserLast || m.unreadByAdmin || m.status === "OPEN";
    }).length;
  }, [supportMessages]);

  const openCount = useMemo(() => supportMessages.filter((m) => m.status === "OPEN").length, [supportMessages]);
  const inProgressCount = useMemo(() => supportMessages.filter((m) => m.status === "IN_PROGRESS").length, [supportMessages]);
  const resolvedCount = useMemo(() => supportMessages.filter((m) => m.status === "RESOLVED").length, [supportMessages]);

  // Filtered ticket list
  const filteredMessages = useMemo(() => {
    return sortedMessages.filter((msg) => {
      // 1. Status filter
      if (statusFilter === "NEEDS_REPLY") {
        if (msg.status === "RESOLVED") return false;
        const lastMsg = msg.thread && msg.thread.length > 0 ? msg.thread[msg.thread.length - 1] : null;
        const isUserLast = lastMsg ? lastMsg.sender === "USER" : msg.lastSender === "USER" || !msg.adminReply;
        if (!isUserLast && !msg.unreadByAdmin) return false;
      } else if (statusFilter === "OPEN" && msg.status !== "OPEN") {
        return false;
      } else if (statusFilter === "IN_PROGRESS" && msg.status !== "IN_PROGRESS") {
        return false;
      } else if (statusFilter === "RESOLVED" && msg.status !== "RESOLVED") {
        return false;
      }

      // 2. Category filter
      if (categoryFilter !== "ALL") {
        const sub = (msg.subject || "").toLowerCase();
        if (!sub.includes(categoryFilter.toLowerCase())) return false;
      }

      // 3. Intelligent Search query
      if (searchQuery.trim() && !matchesSearch(msg, searchQuery)) {
        return false;
      }

      return true;
    });
  }, [sortedMessages, statusFilter, categoryFilter, searchQuery, allUsers]);

  // Total matches across all statuses for current search query
  const totalSearchMatchesInAll = useMemo(() => {
    if (!searchQuery.trim()) return sortedMessages.length;
    return sortedMessages.filter(m => matchesSearch(m, searchQuery)).length;
  }, [sortedMessages, searchQuery, allUsers]);

  // Set default active ticket if none selected
  useEffect(() => {
    if (!selectedTicketId && filteredMessages.length > 0) {
      setSelectedTicketId(filteredMessages[0].id);
    } else if (selectedTicketId && !supportMessages.some((m) => m.id === selectedTicketId)) {
      setSelectedTicketId(filteredMessages[0]?.id || null);
    }
  }, [filteredMessages, selectedTicketId, supportMessages]);

  // Active ticket object
  const activeTicket = useMemo(() => {
    return supportMessages.find((m) => m.id === selectedTicketId) || null;
  }, [supportMessages, selectedTicketId]);

  // Lookup target user in `allUsers` to show live account details
  const activeUserProfile = useMemo(() => {
    if (!activeTicket) return null;
    return allUsers.find((u) => u.id === activeTicket.userId || u.email === activeTicket.userEmail) || null;
  }, [activeTicket, allUsers]);

  // Auto-scroll chat to bottom when active ticket or thread changes
  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatScrollContainerRef.current) {
        chatScrollContainerRef.current.scrollTo({
          top: chatScrollContainerRef.current.scrollHeight,
          behavior: "smooth"
        });
      }
    }, 100);
  };

  useEffect(() => {
    if (activeTicket) {
      scrollToBottom();
      // Mark as read by admin if unread
      if (activeTicket.unreadByAdmin) {
        markSupportTicketReadByAdmin(activeTicket.id).catch(() => {});
      }
    }
  }, [activeTicket?.id, activeTicket?.thread?.length]);

  // Copy helper
  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
    onTriggerNotification?.(`Copied ${fieldName} to clipboard!`, "info");
  };

  // Send Reply to User
  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeTicket) return;

    const cleanReply = replyText.trim();
    if (!cleanReply) {
      onTriggerNotification?.("Please type your reply message first.", "error");
      return;
    }

    try {
      setIsSendingReply(true);
      await replyToSupportMessage(activeTicket.id, cleanReply, resolveOnSend, `Support Admin (${adminEmail})`);
      setReplyText("");
      playChime();
      onTriggerNotification?.("Reply sent to user successfully!", "success");
      scrollToBottom();
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to send reply to user.", "error");
    } finally {
      setIsSendingReply(false);
    }
  };

  // Change Ticket Status
  const handleStatusChange = async (newStatus: "OPEN" | "IN_PROGRESS" | "RESOLVED") => {
    if (!activeTicket) return;
    try {
      await updateSupportTicketStatus(activeTicket.id, newStatus);
      onTriggerNotification?.(`Ticket marked as ${newStatus}`, "info");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to update status", "error");
    }
  };

  // Delete Ticket
  const handleDeleteTicket = async (ticketId: string) => {
    if (!window.confirm("Are you sure you want to delete this support thread?")) return;
    try {
      await deleteSupportMessage(ticketId);
      onTriggerNotification?.("Support ticket removed from inbox.", "info");
      if (selectedTicketId === ticketId) {
        setSelectedTicketId(null);
        setMobileViewMode("LIST");
      }
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to delete ticket", "error");
    }
  };

  // Handle Direct Message Submit
  const handleSendDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId.trim() || !directMsgText.trim()) {
      onTriggerNotification?.("Please specify recipient and message body.", "error");
      return;
    }

    try {
      setIsDirectSending(true);
      const newMsgId = await sendAdminDirectMessage(
        targetUserId.trim(),
        targetUserEmail.trim() || targetUserId.trim(),
        targetUserName.trim() || "Trader",
        directSubject.trim() || "Account Announcement",
        directMsgText.trim()
      );

      onTriggerNotification?.("Direct notification sent to user!", "success");
      setIsDirectModalOpen(false);
      setTargetUserId("");
      setTargetUserEmail("");
      setTargetUserName("");
      setDirectSubject("");
      setDirectMsgText("");
      setSelectedTicketId(newMsgId);
      setMobileViewMode("CHAT");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to send direct message", "error");
    } finally {
      setIsDirectSending(false);
    }
  };

  // User search matches for Direct Message modal
  const matchedUsers = useMemo(() => {
    if (!userSearchText.trim()) return allUsers.slice(0, 8);
    const q = userSearchText.toLowerCase();
    return allUsers.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.id?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [allUsers, userSearchText]);

  return (
    <div className="space-y-5 animate-fade-in">
      
      {/* 1. Header KPI & Action Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        
        {/* Needs Reply Card */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("NEEDS_REPLY");
            setMobileViewMode("LIST");
          }}
          className={`p-4 rounded-3xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
            statusFilter === "NEEDS_REPLY"
              ? "bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-400"
              : "bg-white dark:bg-slate-900 border-amber-200/70 dark:border-amber-900/50 hover:border-amber-400 text-slate-800 dark:text-slate-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider opacity-80 flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-amber-500" />
              Needs Action
            </span>
            {needsReplyCount > 0 && (
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black">{needsReplyCount}</span>
            <span className="text-xs opacity-75 font-semibold">replies waiting</span>
          </div>
        </button>

        {/* Open Inquiries Card */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("OPEN");
            setMobileViewMode("LIST");
          }}
          className={`p-4 rounded-3xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            statusFilter === "OPEN"
              ? "bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-400"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400 text-slate-800 dark:text-slate-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider opacity-80 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-indigo-500" />
              Open Tickets
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black">{openCount}</span>
            <span className="text-xs opacity-75 font-semibold">active</span>
          </div>
        </button>

        {/* In Progress Card */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("IN_PROGRESS");
            setMobileViewMode("LIST");
          }}
          className={`p-4 rounded-3xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            statusFilter === "IN_PROGRESS"
              ? "bg-sky-600 text-white border-sky-700 shadow-md ring-2 ring-sky-400"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-sky-400 text-slate-800 dark:text-slate-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider opacity-80 flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5 text-sky-500" />
              In Progress
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black">{inProgressCount}</span>
            <span className="text-xs opacity-75 font-semibold">ongoing</span>
          </div>
        </button>

        {/* Resolved Card */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("RESOLVED");
            setMobileViewMode("LIST");
          }}
          className={`p-4 rounded-3xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            statusFilter === "RESOLVED"
              ? "bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400 text-slate-800 dark:text-slate-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider opacity-80 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Resolved
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black">{resolvedCount}</span>
            <span className="text-xs opacity-75 font-semibold">solved</span>
          </div>
        </button>

        {/* Compose Direct Notice Action Button */}
        <div className="col-span-2 sm:col-span-4 lg:col-span-1 flex">
          <button
            type="button"
            onClick={() => setIsDirectModalOpen(true)}
            className="w-full p-4 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md transition-all flex flex-col justify-between cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5" />
                Direct Notice
              </span>
              <PlusCircle className="h-4 w-4 opacity-80 group-hover:rotate-90 transition-transform" />
            </div>
            <div className="mt-2 text-left">
              <span className="text-xs font-extrabold block">Broadcast / Message</span>
              <span className="text-[10px] text-purple-200">Send directly to trader</span>
            </div>
          </button>
        </div>

      </div>

      {/* 2. Main Helpdesk Workspace (Responsive Split / Full-Screen on Mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[620px] max-h-[920px] h-[calc(100vh-14rem)]">
        
        {/* Left Column: Tickets Master List (Visible when mobileViewMode is LIST, or on desktop lg:flex) */}
        <div className={`lg:col-span-4 flex-col bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden ${
          mobileViewMode === "CHAT" ? "hidden lg:flex" : "flex"
        }`}>
          
          {/* Search & Filter Header */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 space-y-2.5 bg-slate-50/70 dark:bg-slate-950/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Inbox className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Support Inbox
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {searchQuery ? `${filteredMessages.length} of ${sortedMessages.length}` : sortedMessages.length}
                </span>
              </div>

              {(statusFilter !== "ALL" || searchQuery.trim()) && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("ALL");
                    setSearchQuery("");
                    setCategoryFilter("ALL");
                  }}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Live Search Input with Instant Clear (X) Button */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search trader name, email, #ID, message..."
                className="w-full pl-8 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Quick Status Pill Filter */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === "ALL"
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                }`}
              >
                All ({sortedMessages.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("NEEDS_REPLY")}
                className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                  statusFilter === "NEEDS_REPLY"
                    ? "bg-amber-500 text-white shadow-2xs"
                    : "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                }`}
              >
                <Flame className="h-3 w-3" />
                Action ({needsReplyCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("OPEN")}
                className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === "OPEN"
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                }`}
              >
                Open ({openCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("RESOLVED")}
                className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === "RESOLVED"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                }`}
              >
                Done ({resolvedCount})
              </button>
            </div>
          </div>

          {/* Ticket Cards Stream */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            
            {/* If search query has results in other tabs, show switch banner */}
            {searchQuery.trim() && filteredMessages.length === 0 && totalSearchMatchesInAll > 0 && (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-center space-y-1.5">
                <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  Found {totalSearchMatchesInAll} ticket{totalSearchMatchesInAll > 1 ? "s" : ""} matching "{searchQuery}" in other tabs!
                </p>
                <button
                  type="button"
                  onClick={() => setStatusFilter("ALL")}
                  className="px-3 py-1 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 cursor-pointer shadow-2xs"
                >
                  Show All Results ({totalSearchMatchesInAll})
                </button>
              </div>
            )}

            {filteredMessages.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="h-12 w-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-2.5">
                  <Inbox className="h-6 w-6" />
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No support tickets found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {searchQuery ? `No results matching "${searchQuery}" in ${statusFilter} tab.` : "No tickets in this category."}
                </p>
                
                {(searchQuery || statusFilter !== "ALL") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("ALL");
                      setCategoryFilter("ALL");
                    }}
                    className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Clear Search & Show All Tickets</span>
                  </button>
                )}
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isSelected = selectedTicketId === msg.id;
                const threadLen = msg.thread?.length || 0;
                const lastMsgInThread = threadLen > 0 ? msg.thread![threadLen - 1] : null;
                const isLastFromUser = lastMsgInThread ? lastMsgInThread.sender === "USER" : msg.lastSender === "USER" || !msg.adminReply;
                const needsAttention = msg.status !== "RESOLVED" && (isLastFromUser || msg.unreadByAdmin);

                const latestTextSnippet = lastMsgInThread ? lastMsgInThread.text : msg.lastReplyText || msg.message;
                const latestTime = lastMsgInThread ? lastMsgInThread.timestamp : msg.lastReplyAt || msg.updatedAt || msg.createdAt;

                return (
                  <button
                    key={msg.id}
                    type="button"
                    onClick={() => {
                      setSelectedTicketId(msg.id);
                      setMobileViewMode("CHAT");
                    }}
                    className={`w-full text-left p-3 rounded-2xl transition-all border cursor-pointer relative group ${
                      isSelected
                        ? "bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-500 shadow-xs ring-1 ring-indigo-400/40"
                        : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    {/* Top Row: User Avatar, Name, Email, Timestamp */}
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center text-[11px] font-black shrink-0 shadow-2xs">
                          {(msg.userName || "U").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-black text-slate-900 dark:text-slate-100 truncate block">
                            {msg.userName || "Trader"}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate block font-mono">
                            {msg.userEmail}
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap shrink-0">
                        {new Date(latestTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    {/* Subject & ID badge */}
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 truncate max-w-[170px]">
                        {msg.subject || "General Support"}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">
                        #{msg.id.slice(-5)}
                      </span>
                    </div>

                    {/* Latest snippet preview */}
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {isLastFromUser ? (
                        <span className="font-bold text-amber-600 dark:text-amber-400 mr-1">User:</span>
                      ) : (
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-1">Admin:</span>
                      )}
                      {latestTextSnippet}
                    </p>

                    {/* Bottom Status Tags */}
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 text-[10px]">
                      {needsAttention ? (
                        <span className="inline-flex items-center gap-1 font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                          <Flame className="h-3 w-3" />
                          <span>User Replied</span>
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        </span>
                      ) : msg.status === "RESOLVED" ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Resolved</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-slate-500">
                          <Check className="h-3 w-3" />
                          <span>Replied / Awaiting User</span>
                        </span>
                      )}

                      <span className="text-[10px] text-slate-400 font-medium">
                        {threadLen > 0 ? `${threadLen} messages` : "1 query"}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Ticket Conversation Studio (Visible when mobileViewMode is CHAT, or on desktop lg:flex) */}
        <div className={`lg:col-span-8 flex-col bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden ${
          mobileViewMode === "LIST" ? "hidden lg:flex" : "flex"
        }`}>
          
          {activeTicket ? (
            <>
              {/* Studio Header: User Details & Actions */}
              <div className="p-3.5 sm:p-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between gap-2.5 shrink-0 flex-wrap">
                
                {/* Left: Mobile Back Button + User Avatar & Details */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  
                  {/* Mobile Back Button */}
                  <button
                    type="button"
                    onClick={() => setMobileViewMode("LIST")}
                    className="lg:hidden p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl flex items-center gap-1 text-xs font-bold shrink-0 cursor-pointer"
                    title="Back to tickets list"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-[11px]">Inbox</span>
                  </button>

                  <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-sm sm:text-base shadow-md shadow-indigo-500/20 shrink-0">
                    {(activeTicket.userName || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 truncate">
                        {activeTicket.userName || "Trader"}
                      </h2>
                      <button
                        type="button"
                        onClick={() => handleCopy(activeTicket.userId, "User ID")}
                        className="text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                        title="Click to copy User ID"
                      >
                        <span>#{activeTicket.userId.slice(-6)}</span>
                        {copiedField === "User ID" ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1 truncate max-w-[180px] sm:max-w-[260px] font-mono text-[11px]">
                        <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                        {activeTicket.userEmail}
                      </span>
                      {activeUserProfile && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                            <Wallet className="h-3 w-3" />
                            ₹{(activeUserProfile.availableBalance ?? activeUserProfile.balance ?? 0).toFixed(2)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Status Switcher & Delete Action */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
                  
                  {/* Status Toggle Dropdown / Segmented Buttons */}
                  <div className="flex items-center gap-0.5 sm:gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-1 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => handleStatusChange("OPEN")}
                      className={`px-2 sm:px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                        activeTicket.status === "OPEN"
                          ? "bg-indigo-600 text-white shadow-2xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange("IN_PROGRESS")}
                      className={`px-2 sm:px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                        activeTicket.status === "IN_PROGRESS"
                          ? "bg-sky-600 text-white shadow-2xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                    >
                      Working
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange("RESOLVED")}
                      className={`px-2 sm:px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                        activeTicket.status === "RESOLVED"
                          ? "bg-emerald-600 text-white shadow-2xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                    >
                      Resolved
                    </button>
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteTicket(activeTicket.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                    title="Delete this ticket"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Ticket Subject & Meta Ribbon */}
              <div className="px-4 py-2 bg-indigo-50/60 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs shrink-0 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                    Subject: {activeTicket.subject}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  Opened {new Date(activeTicket.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>

              {/* Chat Stream: Multi-turn Conversation Canvas */}
              <div 
                ref={chatScrollContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-100/40 dark:bg-slate-950/20"
              >
                {activeTicket.thread && activeTicket.thread.length > 0 ? (
                  activeTicket.thread.map((item: SupportThreadMessage) => {
                    const isUser = item.sender === "USER";
                    return (
                      <div
                        key={item.id}
                        className={`flex flex-col ${isUser ? "items-start pr-6 sm:pr-16" : "items-end pl-6 sm:pl-16"}`}
                      >
                        {/* Sender Label & Timestamp */}
                        <div className={`flex items-center gap-1.5 mb-1 text-[10px] font-bold ${
                          isUser ? "text-slate-500" : "text-indigo-600 dark:text-indigo-400"
                        }`}>
                          {isUser ? (
                            <>
                              <User className="h-3 w-3 text-slate-400" />
                              <span>{item.senderName || activeTicket.userName || "Trader"}</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                              <span>{item.senderName || "Support Admin"}</span>
                            </>
                          )}
                          <span className="font-mono font-normal text-slate-400 ml-1">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        {/* Message Bubble */}
                        <div
                          className={`p-3.5 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed shadow-xs max-w-full ${
                            isUser
                              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/70 rounded-tl-xs"
                              : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-xs"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{item.text}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  /* Fallback Single Q&A Format */
                  <div className="space-y-4">
                    {/* User Question */}
                    <div className="flex flex-col items-start pr-6 sm:pr-16">
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-slate-500">
                        <User className="h-3 w-3 text-slate-400" />
                        <span>{activeTicket.userName || "Trader"}</span>
                        <span className="font-mono font-normal text-slate-400 ml-1">
                          {new Date(activeTicket.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="p-3.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/70 rounded-2xl rounded-tl-xs text-xs sm:text-sm font-medium leading-relaxed shadow-xs">
                        <p className="whitespace-pre-wrap">{activeTicket.message}</p>
                      </div>
                    </div>

                    {/* Admin Reply */}
                    {activeTicket.adminReply && (
                      <div className="flex flex-col items-end pl-6 sm:pl-16">
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                          <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                          <span>Support Admin</span>
                          {activeTicket.repliedAt && (
                            <span className="font-mono font-normal text-slate-400 ml-1">
                              {new Date(activeTicket.repliedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </div>
                        <div className="p-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl rounded-tr-xs text-xs sm:text-sm font-medium leading-relaxed shadow-xs">
                          <p className="whitespace-pre-wrap">{activeTicket.adminReply}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Canned Responses Quick Bar */}
              <div className="px-4 py-2 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 shrink-0">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                  <span className="text-[10px] font-black uppercase text-slate-400 shrink-0 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-indigo-500" />
                    Quick Insert:
                  </span>
                  {CANNED_RESPONSES.map((cr, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setReplyText(cr.text)}
                      className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer shadow-2xs shrink-0"
                    >
                      {cr.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reply Composer Bar */}
              <form onSubmit={handleSendReply} className="p-3 sm:p-3.5 border-t border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 space-y-2.5">
                <div className="relative flex items-center">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    placeholder={`Reply to ${activeTicket.userName || "Trader"}... (Enter to send, Shift+Enter for newline)`}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={resolveOnSend}
                      onChange={(e) => setResolveOnSend(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                    />
                    <span>Mark as Resolved on reply</span>
                  </label>

                  <div className="flex items-center gap-2 ml-auto">
                    {replyText.trim() && (
                      <button
                        type="button"
                        onClick={() => setReplyText("")}
                        className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                      >
                        Clear
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={isSendingReply || !replyText.trim()}
                      className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-40 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    >
                      {isSendingReply ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span>Send Reply</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </>
          ) : (
            /* Empty State when no ticket is selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/40 dark:bg-slate-950/20">
              <div className="h-16 w-16 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-3xl flex items-center justify-center mb-3 shadow-inner">
                <MessageSquare className="h-8 w-8" />
              </div>
              <h3 className="text-base font-black text-slate-800 dark:text-slate-200">
                Select a Support Ticket
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
                Choose a conversation from the left inbox to view the full dialogue thread and reply directly to the trader.
              </p>
              <button
                type="button"
                onClick={() => setIsDirectModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Transmit Direct Notice</span>
              </button>
            </div>
          )}

        </div>

      </div>

      {/* 3. Direct Message / Broadcast Announcement Modal */}
      {isDirectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-600/10 via-indigo-600/10 to-transparent border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-purple-600 text-white rounded-2xl shadow-md">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                    Transmit Direct Admin Notice
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Send official message to user's inbox with instant delivery
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDirectModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSendDirectSubmit} className="p-4 sm:p-5 space-y-4">
              
              {/* User Selection with Search Autocomplete */}
              <div className="space-y-1 relative">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Target Trader Account <span className="text-rose-500">*</span>
                </label>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search registered user by name, email or ID..."
                    value={userSearchText}
                    onChange={(e) => {
                      setUserSearchText(e.target.value);
                      setIsUserDropdownOpen(true);
                    }}
                    onFocus={() => setIsUserDropdownOpen(true)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                  {userSearchText && (
                    <button
                      type="button"
                      onClick={() => {
                        setUserSearchText("");
                        setTargetUserId("");
                        setTargetUserEmail("");
                        setTargetUserName("");
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {isUserDropdownOpen && matchedUsers.length > 0 && (
                  <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-h-48 overflow-y-auto p-1.5 space-y-1">
                    {matchedUsers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setTargetUserId(u.id);
                          setTargetUserEmail(u.email);
                          setTargetUserName(u.name || u.email.split("@")[0]);
                          setUserSearchText(`${u.name || "User"} (${u.email})`);
                          setIsUserDropdownOpen(false);
                        }}
                        className="w-full text-left p-2 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl transition-all flex items-center justify-between text-xs cursor-pointer"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 dark:text-slate-100 block truncate">
                            {u.name || "User"}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate">
                            {u.email} • #{u.id.slice(-6)}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-600 shrink-0">
                          ₹{(u.availableBalance ?? u.balance ?? 0).toFixed(0)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Target Selected Preview Badge */}
                {targetUserId && (
                  <div className="mt-1 px-3 py-1.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-bold text-purple-700 dark:text-purple-300">
                      Selected: {targetUserName} ({targetUserEmail})
                    </span>
                    <span className="font-mono text-[10px] text-purple-500">ID: #{targetUserId.slice(-6)}</span>
                  </div>
                )}
              </div>

              {/* Subject Presets & Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Subject</label>
                  <div className="flex items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setDirectSubject("Deposit Payment Update")}
                      className="text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      Deposit
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setDirectSubject("Withdrawal Transfer Notice")}
                      className="text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      Withdrawal
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setDirectSubject("Account Security Verification")}
                      className="text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      Security
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="e.g. Important Account Verification Notice"
                  value={directSubject}
                  onChange={(e) => setDirectSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Message Content */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Message Content <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Type official notification message to trader..."
                  value={directMsgText}
                  onChange={(e) => setDirectMsgText(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500 resize-none"
                  required
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDirectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isDirectSending || !targetUserId.trim() || !directMsgText.trim()}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isDirectSending ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Transmit Message</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
