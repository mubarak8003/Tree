import React, { useState, useRef, useEffect } from "react";
import { UserProfile, SupportMessage, SupportThreadMessage } from "../types";
import { 
  X, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  HelpCircle, 
  ShieldCheck, 
  CornerDownRight,
  Sparkles,
  RefreshCw,
  User,
  Check,
  ChevronDown,
  MessageCircle,
  PlusCircle,
  CreditCard,
  ArrowUpRight,
  Shield,
  Layers
} from "lucide-react";
import { createSupportMessage, sendUserSupportReply } from "../firebaseService";

interface UserSupportModalProps {
  currentUser: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  supportMessages: SupportMessage[];
  onTriggerNotification?: (message: string, type: "success" | "error" | "info") => void;
}

const COMMON_TOPICS = [
  { id: "deposit", label: "Deposit Issue / QR Payment Help", icon: CreditCard },
  { id: "withdrawal", label: "Withdrawal Delay / Account Query", icon: ArrowUpRight },
  { id: "pool", label: "Trade Pool / Investment Question", icon: Layers },
  { id: "security", label: "Login & Profile Security", icon: Shield },
  { id: "other", label: "Other Assistance Needed", icon: HelpCircle }
];

export const UserSupportModal: React.FC<UserSupportModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  supportMessages,
  onTriggerNotification
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
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      // Auto-scroll to bottom of chat list
      setTimeout(() => {
        if (chatScrollContainerRef.current) {
          chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen || !currentUser) return null;

  // Filter messages for current user
  const userMessages = supportMessages
    .filter((m) => m.userId === currentUser.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); // Chronological for chat flow

  const filteredMessages = userMessages.filter((m) => {
    if (statusFilter === "OPEN") return m.status === "OPEN";
    if (statusFilter === "RESOLVED") return m.status === "RESOLVED";
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
    }, 100);
  };

  // Handle creating a new message / ticket
  const handleSendNewMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanMsg = messageText.trim();
    if (!cleanMsg) {
      setErrorMsg("Please type your question or problem before sending.");
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
      setSuccessMsg("✅ Message sent to Admin! Solution will be posted here.");
      if (onTriggerNotification) {
        onTriggerNotification("Message sent to Admin successfully!", "success");
      }
      scrollToBottom();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  // Handle sending inline follow-up reply to an existing ticket
  const handleSendInlineReply = async (ticketId: string) => {
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

  const handleQuickTopicClick = (topicLabel: string, defaultQuery?: string) => {
    setSelectedTopic(topicLabel);
    if (defaultQuery && !messageText) {
      setMessageText(defaultQuery);
    }
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[92vh] max-h-[850px]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-50/90 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white rounded-2xl shadow-md">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 font-display">
                  Help & Admin Support Desk
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Support
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Send questions & reply to Admin directly from this single window
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              title="Close support desk"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Status / Ticket Filter Header Bar */}
        <div className="px-4 py-2 bg-slate-100/70 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-bold">
            <MessageCircle className="h-3.5 w-3.5 text-indigo-500" />
            <span>Messages & Ticket History</span>
            <span className="text-[11px] font-mono text-slate-400">({userMessages.length})</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === "ALL"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300"
              }`}
            >
              All ({userMessages.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("OPEN")}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === "OPEN"
                  ? "bg-amber-500 text-white shadow-2xs"
                  : "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300"
              }`}
            >
              <Clock className="h-3 w-3" />
              Pending ({openCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("RESOLVED")}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === "RESOLVED"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300"
              }`}
            >
              <CheckCircle2 className="h-3 w-3" />
              Resolved ({resolvedCount})
            </button>
          </div>
        </div>

        {/* Central Chat & Messages Window (Scrollable) */}
        <div 
          ref={chatScrollContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40 dark:bg-slate-950/20"
        >
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-rose-700 dark:text-rose-400 animate-fadeIn">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 animate-fadeIn">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Empty State / Welcome Guide */}
          {userMessages.length === 0 ? (
            <div className="py-6 sm:py-8 flex flex-col items-center justify-center text-center px-4">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-3xl mb-3 shadow-inner">
                <MessageSquare className="h-10 w-10" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                Welcome to Support Desk!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4 leading-relaxed">
                Have any question regarding deposits, withdrawals, trade pools, or account? Type below to chat with Admin directly!
              </p>

              {/* Quick Prompt Cards */}
              <div className="w-full max-w-md grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {COMMON_TOPICS.map((topic) => {
                  const Icon = topic.icon;
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => handleQuickTopicClick(topic.label, `Hi Admin, I need help regarding ${topic.label}.`)}
                      className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 rounded-2xl transition-all cursor-pointer flex items-center gap-2.5 group text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs"
                    >
                      <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="truncate">{topic.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500 italic bg-white dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              No messages found under "{statusFilter}" filter.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMessages.map((msg) => {
                const isReplyingThis = activeReplyTicketId === msg.id;
                const hasThread = msg.thread && msg.thread.length > 0;

                return (
                  <div
                    key={msg.id}
                    className="p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-sm space-y-3 transition-all"
                  >
                    {/* Ticket Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 text-[10px] font-extrabold rounded-lg border border-indigo-200/60 dark:border-indigo-900/50 flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-indigo-500" />
                          {msg.subject}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {msg.status === "RESOLVED" ? (
                          <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold rounded-full flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            Resolved by Admin
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold rounded-full flex items-center gap-1 animate-pulse">
                            <Clock className="h-3 w-3 text-amber-500" />
                            Pending Admin Review
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Conversation Content / Multi-turn Thread */}
                    {hasThread ? (
                      <div className="space-y-2.5 pt-1">
                        {msg.thread!.map((item: SupportThreadMessage) => {
                          const isUser = item.sender === "USER";
                          return (
                            <div
                              key={item.id}
                              className={`flex flex-col ${isUser ? "items-end pl-6" : "items-start pr-6"}`}
                            >
                              <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-slate-400">
                                {isUser ? (
                                  <>
                                    <span>You ({currentUser.name})</span>
                                    <span className="font-mono font-normal">
                                      {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck className="h-3 w-3 text-indigo-500" />
                                    <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">Support Admin</span>
                                    <span className="font-mono font-normal">
                                      {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                  </>
                                )}
                              </div>

                              <div
                                className={`p-3 rounded-2xl text-xs font-medium leading-relaxed max-w-[95%] sm:max-w-[85%] ${
                                  isUser
                                    ? "bg-indigo-600 text-white rounded-tr-xs shadow-xs"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/60 rounded-tl-xs shadow-xs"
                                }`}
                              >
                                {item.text}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Fallback legacy single question + admin reply format */
                      <div className="space-y-2.5">
                        {/* User Question */}
                        <div className="flex flex-col items-end pl-6">
                          <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-slate-400">
                            <span>You ({currentUser.name})</span>
                            <span className="font-mono font-normal">
                              {new Date(msg.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                            </span>
                          </div>
                          <div className="p-3 bg-indigo-600 text-white rounded-2xl rounded-tr-xs text-xs font-medium leading-relaxed max-w-[90%] shadow-xs">
                            {msg.message}
                          </div>
                        </div>

                        {/* Admin Reply if present */}
                        {msg.adminReply ? (
                          <div className="flex flex-col items-start pr-6">
                            <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                              <ShieldCheck className="h-3 w-3 text-indigo-500" />
                              <span className="font-extrabold">Admin Solution / Reply</span>
                              {msg.repliedAt && (
                                <span className="font-mono font-normal text-slate-400 ml-1">
                                  {new Date(msg.repliedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              )}
                            </div>
                            <div className="p-3.5 bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-900/60 text-slate-900 dark:text-slate-100 rounded-2xl rounded-tl-xs text-xs font-medium leading-relaxed max-w-[90%] shadow-xs">
                              {msg.adminReply}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-amber-600 dark:text-amber-400 italic flex items-center gap-1.5 pl-2 pt-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Admin is reviewing your message. Solution will be posted here shortly.</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Inline Reply Action & Box */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-2">
                      {!isReplyingThis ? (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">
                            Ticket #{msg.id.slice(-6)} • {new Date(msg.createdAt).toLocaleDateString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveReplyTicketId(msg.id);
                              setReplyInputs((prev) => ({ ...prev, [msg.id]: prev[msg.id] || "" }));
                            }}
                            className="px-3 py-1 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/60 text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <CornerDownRight className="h-3.5 w-3.5" />
                            <span>Reply to this ticket</span>
                          </button>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-950/70 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl space-y-2 animate-fadeIn">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                            <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                              <CornerDownRight className="h-3.5 w-3.5" />
                              Reply / Follow-up message:
                            </span>
                            <button
                              type="button"
                              onClick={() => setActiveReplyTicketId(null)}
                              className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>

                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={replyInputs[msg.id] || ""}
                              onChange={(e) => setReplyInputs({ ...replyInputs, [msg.id]: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendInlineReply(msg.id);
                                }
                              }}
                              placeholder="Type your reply to Admin here..."
                              className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                            />
                            <button
                              type="button"
                              disabled={isSendingReply[msg.id] || !(replyInputs[msg.id] || "").trim()}
                              onClick={() => handleSendInlineReply(msg.id)}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                              {isSendingReply[msg.id] ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Send className="h-3.5 w-3.5" />
                              )}
                              <span>Send</span>
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

        {/* Bottom Fixed Composer Bar (Single unified window: Send & Reply directly!) */}
        <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200/90 dark:border-slate-800 shrink-0 space-y-2.5 shadow-lg">
          
          {/* Quick Topic Chips bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 shrink-0 mr-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-indigo-500" />
              Topic:
            </span>
            {COMMON_TOPICS.map((t) => {
              const Icon = t.icon;
              const isSelected = selectedTopic === t.label;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTopic(t.label)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  <span>{t.label.split("/")[0].trim()}</span>
                </button>
              );
            })}
          </div>

          {/* Unified Input Box & Send Button */}
          <form onSubmit={handleSendNewMessage} className="flex items-center gap-2">
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                rows={1}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendNewMessage();
                  }
                }}
                placeholder={`Ask Admin regarding ${selectedTopic.split("/")[0].trim()}... (Enter to send)`}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none max-h-24"
              />
            </div>

            <button
              type="submit"
              disabled={isSending || !messageText.trim()}
              className="px-4 sm:px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold rounded-2xl shadow-md hover:shadow-indigo-500/20 transition-all duration-150 flex items-center gap-2 cursor-pointer shrink-0"
            >
              {isSending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Sending...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">Send Message</span>
                </>
              )}
            </button>
          </form>

        </div>

      </div>
    </div>
  );
};
