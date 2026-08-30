import React, { useState, useRef, useEffect } from "react";
import { UserProfile, SupportMessage, SupportThreadMessage } from "../types";
import { 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  HelpCircle, 
  ShieldCheck, 
  Sparkles,
  RefreshCw,
  CreditCard,
  ArrowUpRight,
  Shield,
  Layers,
  ArrowLeft,
  Headphones,
  CheckCheck,
  Search,
  MessageSquarePlus,
  ChevronRight,
  Flame,
  Check,
  Paperclip
} from "lucide-react";
import { createSupportMessage, sendUserSupportReply } from "../firebaseService";

interface UserSupportPageProps {
  currentUser: UserProfile | null;
  supportMessages: SupportMessage[];
  onTriggerNotification?: (message: string, type: "success" | "error" | "info") => void;
  onBackToDashboard?: () => void;
}

const COMMON_TOPICS = [
  { id: "deposit", label: "Deposit Issue", icon: CreditCard, prompt: "Hi Admin, I have completed a deposit transfer. Please verify and credit to my wallet." },
  { id: "withdrawal", label: "Withdrawal Delay", icon: ArrowUpRight, prompt: "Hi Admin, I have requested a withdrawal. Could you please check the payout status?" },
  { id: "pool", label: "Pool Trade Query", icon: Layers, prompt: "Hi Admin, I have a question regarding trade pool settlement and profit returns." },
  { id: "security", label: "Security & PIN", icon: Shield, prompt: "Hi Admin, I need help updating my account credentials or PIN." },
  { id: "other", label: "General Support", icon: HelpCircle, prompt: "Hi Admin, I need assistance with my account." }
];

export const UserSupportPage: React.FC<UserSupportPageProps> = ({
  currentUser,
  supportMessages,
  onTriggerNotification,
  onBackToDashboard
}) => {
  const [selectedTopic, setSelectedTopic] = useState<string>(COMMON_TOPICS[0].label);
  const [messageText, setMessageText] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "RESOLVED">("ALL");

  // Inline Reply state per ticket: { [ticketId]: replyText }
  const [replyInputs, setReplyInputs] = useState<{ [ticketId: string]: string }>({});
  const [activeReplyTicketId, setActiveReplyTicketId] = useState<string | null>(null);
  const [isSendingReply, setIsSendingReply] = useState<{ [ticketId: string]: boolean }>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter messages for current user
  const userMessages = (currentUser ? supportMessages.filter((m) => m.userId === currentUser.id) : [])
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const filteredMessages = userMessages.filter((m) => {
    if (statusFilter === "OPEN" && m.status !== "OPEN") return false;
    if (statusFilter === "RESOLVED" && m.status !== "RESOLVED") return false;
    return true;
  });

  const openCount = userMessages.filter((m) => m.status === "OPEN").length;
  const resolvedCount = userMessages.filter((m) => m.status === "RESOLVED").length;

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatScrollContainerRef.current) {
        chatScrollContainerRef.current.scrollTo({
          top: chatScrollContainerRef.current.scrollHeight,
          behavior: "smooth"
        });
      }
    }, 120);
  };

  useEffect(() => {
    scrollToBottom();
  }, [userMessages.length]);

  // Handle creating a new message / ticket
  const handleSendNewMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanMsg = messageText.trim();
    if (!cleanMsg) {
      setErrorMsg("Please enter your message before sending.");
      return;
    }

    setIsSending(true);
    try {
      await createSupportMessage(
        currentUser.id,
        currentUser.email,
        currentUser.name,
        selectedTopic,
        cleanMsg
      );

      setMessageText("");
      setSuccessMsg("Sent! Admin has been notified.");
      if (onTriggerNotification) {
        onTriggerNotification("Message sent to Admin successfully!", "success");
      }
      scrollToBottom();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  // Handle sending inline follow-up reply to an existing ticket
  const handleSendInlineReply = async (ticketId: string) => {
    if (!currentUser) return;
    const replyText = (replyInputs[ticketId] || "").trim();
    if (!replyText) return;

    setIsSendingReply((prev) => ({ ...prev, [ticketId]: true }));
    try {
      await sendUserSupportReply(ticketId, replyText, currentUser.name);
      setReplyInputs((prev) => ({ ...prev, [ticketId]: "" }));
      setActiveReplyTicketId(null);
      if (onTriggerNotification) {
        onTriggerNotification("Reply sent to Admin!", "success");
      }
      scrollToBottom();
    } catch (err: any) {
      if (onTriggerNotification) {
        onTriggerNotification(err?.message || "Failed to send reply.", "error");
      }
    } finally {
      setIsSendingReply((prev) => ({ ...prev, [ticketId]: false }));
    }
  };

  const handleQuickTopicClick = (topicLabel: string, defaultPrompt?: string) => {
    setSelectedTopic(topicLabel);
    if (defaultPrompt && !messageText) {
      setMessageText(defaultPrompt);
    }
    inputRef.current?.focus();
  };

  if (!currentUser) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-md mx-auto my-12">
        <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Please Sign In</h2>
        <p className="text-xs text-slate-500 mt-1">You must be logged in to chat with support desk.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col h-[calc(100vh-7.5rem)] min-h-[560px] max-h-[850px] bg-slate-100/70 dark:bg-slate-950/80 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden animate-fade-in backdrop-blur-md">
      
      {/* 1. Header Bar */}
      <header className="px-3.5 py-3 sm:px-5 sm:py-3.5 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200/80 dark:border-slate-800/90 flex items-center justify-between gap-2.5 shrink-0 z-10 backdrop-blur-md">
        
        {/* Left: Avatar & Agent Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="p-1.5 -ml-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer shrink-0"
              title="Return to Pool Trading Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          <div className="relative shrink-0">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Headphones className="h-5 w-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center" title="Support Online">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping"></span>
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 truncate tracking-tight">
                Live Support Desk
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                Online
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Admin & Financial Operations • Avg. reply: ~5m
            </p>
          </div>
        </div>

        {/* Right: Quick Filter Toggle Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shrink-0">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
              statusFilter === "ALL"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            All <span className="opacity-70 font-normal">({userMessages.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("OPEN")}
            className={`px-2 py-1 text-[11px] font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
              statusFilter === "OPEN"
                ? "bg-amber-500 text-white shadow-sm"
                : "text-amber-600 dark:text-amber-400 hover:text-amber-700"
            }`}
          >
            <Clock className="h-3 w-3" />
            <span className="hidden xs:inline">Open</span> ({openCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("RESOLVED")}
            className={`px-2 py-1 text-[11px] font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
              statusFilter === "RESOLVED"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
            }`}
          >
            <CheckCircle2 className="h-3 w-3" />
            <span className="hidden xs:inline">Done</span> ({resolvedCount})
          </button>
        </div>
      </header>

      {/* 2. Messages Stream / Canvas */}
      <div 
        ref={chatScrollContainerRef}
        className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-5 space-y-5 bg-gradient-to-b from-slate-100/50 to-slate-200/30 dark:from-slate-950/40 dark:to-slate-900/30"
      >
        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-center gap-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Empty State */}
        {userMessages.length === 0 ? (
          <div className="py-8 sm:py-14 flex flex-col items-center justify-center text-center px-4 max-w-lg mx-auto">
            <div className="h-16 w-16 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400 rounded-3xl flex items-center justify-center mb-3.5 border border-indigo-200/50 dark:border-indigo-800/40 shadow-inner">
              <Sparkles className="h-8 w-8" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
              How can Admin help you today?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5 max-w-sm">
              Send questions regarding QR deposits, withdrawal transfers, trading pools, or account settings.
            </p>

            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              {COMMON_TOPICS.map((topic) => {
                const Icon = topic.icon;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => handleQuickTopicClick(topic.label, topic.prompt)}
                    className="p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/40 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/30 rounded-2xl transition-all cursor-pointer flex items-center gap-2.5 group shadow-xs"
                  >
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{topic.label}</span>
                      <span className="text-[10px] text-slate-400 truncate">Tap to prepare message</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500 bg-white/60 dark:bg-slate-900/60 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            No tickets found matching "{statusFilter}".
          </div>
        ) : (
          <div className="space-y-6">
            {filteredMessages.map((msg) => {
              const isReplyingThis = activeReplyTicketId === msg.id;
              const hasThread = msg.thread && msg.thread.length > 0;
              const isResolved = msg.status === "RESOLVED";

              return (
                <div key={msg.id} className="space-y-2.5">
                  
                  {/* Clean Ticket Date & Topic Divider */}
                  <div className="flex items-center justify-center my-3">
                    <div className="flex items-center gap-2 px-3.5 py-1 bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-full shadow-2xs backdrop-blur-sm text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">#{msg.id.slice(-6)}</span>
                      <span>•</span>
                      <span className="truncate max-w-[130px] sm:max-w-[200px] text-slate-700 dark:text-slate-300 font-bold">{msg.subject}</span>
                      <span>•</span>
                      {isResolved ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Solved
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                          <Clock className="h-3 w-3" /> In Review
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Multi-turn Chat Thread / Messages */}
                  {hasThread ? (
                    <div className="space-y-3">
                      {msg.thread!.map((item: SupportThreadMessage) => {
                        const isUser = item.sender === "USER";
                        return (
                          <div
                            key={item.id}
                            className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                          >
                            <div className={`max-w-[88%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                              isUser 
                                ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-xs"
                                : "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-xs"
                            }`}>
                              {!isUser && (
                                <div className="flex items-center gap-1 text-[10px] font-black text-indigo-600 dark:text-indigo-400 mb-1">
                                  <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                                  <span>Support Admin</span>
                                </div>
                              )}
                              <p className="whitespace-pre-wrap leading-relaxed font-medium">{item.text}</p>
                              
                              <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                                isUser ? "text-indigo-200" : "text-slate-400"
                              }`}>
                                <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                {isUser && <CheckCheck className="h-3 w-3 text-indigo-200" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Fallback Single Q&A Format */
                    <div className="space-y-3">
                      {/* User Bubble */}
                      <div className="flex flex-col items-end">
                        <div className="max-w-[88%] sm:max-w-[75%] rounded-2xl rounded-br-xs px-4 py-2.5 text-xs shadow-sm bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
                          <p className="whitespace-pre-wrap leading-relaxed font-medium">{msg.message}</p>
                          <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-indigo-200">
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            <CheckCheck className="h-3 w-3 text-indigo-200" />
                          </div>
                        </div>
                      </div>

                      {/* Admin Solution Bubble */}
                      {msg.adminReply ? (
                        <div className="flex flex-col items-start">
                          <div className="max-w-[88%] sm:max-w-[75%] rounded-2xl rounded-bl-xs px-4 py-3 text-xs shadow-sm bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 dark:text-indigo-400 mb-1.5">
                              <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                              <span>Admin Reply</span>
                              <span className="ml-auto text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                <Check className="h-3 w-3" /> Official Solution
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap leading-relaxed font-medium text-slate-800 dark:text-slate-200">
                              {msg.adminReply}
                            </p>
                            <div className="flex items-center justify-end mt-1 text-[9px] text-slate-400">
                              <span>{msg.repliedAt ? new Date(msg.repliedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 pl-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                          <Clock className="h-3.5 w-3.5 animate-spin" />
                          <span>Admin has received this query and is reviewing it...</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Inline Follow-up Reply Trigger */}
                  <div className="flex justify-end pt-1">
                    {!isReplyingThis ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveReplyTicketId(msg.id);
                          setReplyInputs((prev) => ({ ...prev, [msg.id]: prev[msg.id] || "" }));
                        }}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1 bg-white/70 dark:bg-slate-900/70 px-3 py-1 rounded-xl border border-slate-200/50 dark:border-slate-800 shadow-2xs"
                      >
                        <span>Follow-up reply</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    ) : (
                      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/70 p-2.5 rounded-2xl shadow-md space-y-2 animate-fadeIn">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          <span>Replying to #{msg.id.slice(-6)}</span>
                          <button
                            type="button"
                            onClick={() => setActiveReplyTicketId(null)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={replyInputs[msg.id] || ""}
                            onChange={(e) => setReplyInputs({ ...replyInputs, [msg.id]: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSendInlineReply(msg.id);
                              }
                            }}
                            placeholder="Type follow-up response..."
                            className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                          />
                          <button
                            type="button"
                            disabled={isSendingReply[msg.id] || !(replyInputs[msg.id] || "").trim()}
                            onClick={() => handleSendInlineReply(msg.id)}
                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
                          >
                            {isSendingReply[msg.id] ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 3. Bottom Modern Floating Messenger Composer */}
      <footer className="p-3 sm:p-4 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200/80 dark:border-slate-800/90 shrink-0 space-y-2 shadow-2xl backdrop-blur-md">
        
        {/* Category Pills Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <span className="text-[10px] font-black uppercase text-slate-400 shrink-0 mr-1 flex items-center gap-1">
            <Flame className="h-3 w-3 text-amber-500" />
            Topic:
          </span>
          {COMMON_TOPICS.map((t) => {
            const isSelected = selectedTopic === t.label;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTopic(t.label)}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Input Bar Form */}
        <form onSubmit={handleSendNewMessage} className="flex items-center gap-2">
          <div className="relative flex-1 flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={`Write message to Admin regarding ${selectedTopic}...`}
              className="w-full pl-4 pr-10 py-3 bg-slate-100/90 dark:bg-slate-950/90 border border-slate-200/90 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={isSending || !messageText.trim()}
            className="h-11 w-11 sm:w-auto sm:px-5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-95 disabled:opacity-40 text-white text-xs font-black rounded-2xl shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            title="Send Message"
          >
            {isSending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </button>
        </form>

      </footer>

    </div>
  );
};
