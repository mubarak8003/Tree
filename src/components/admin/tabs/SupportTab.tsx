import React, { useState } from "react";
import { SupportMessage } from "../../../types";
import { MessageSquare, Send, Trash2, User } from "lucide-react";
import { replyToSupportMessage, sendAdminDirectMessage, deleteSupportMessage } from "../../../firebaseService";

interface SupportTabProps {
  supportMessages: SupportMessage[];
  onTriggerNotification?: (message: string, type: "success" | "info" | "error") => void;
  adminEmail: string;
}

export const SupportTab: React.FC<SupportTabProps> = ({
  supportMessages,
  onTriggerNotification,
  adminEmail
}) => {
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [isSending, setIsSending] = useState(false);

  // Direct message state
  const [targetUserId, setTargetUserId] = useState("");
  const [targetUserEmail, setTargetUserEmail] = useState("");
  const [targetUserName, setTargetUserName] = useState("");
  const [directSubject, setDirectSubject] = useState("");
  const [directMsgText, setDirectMsgText] = useState("");
  const [isDirectSending, setIsDirectSending] = useState(false);

  const handleReply = async (msgId: string) => {
    const text = (replyTextMap[msgId] || "").trim();
    if (!text) return;
    try {
      setIsSending(true);
      await replyToSupportMessage(msgId, text, true);
      onTriggerNotification?.("Reply sent to user!", "success");
      setReplyTextMap((prev) => ({ ...prev, [msgId]: "" }));
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to send reply", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMsg = async (msgId: string) => {
    if (!window.confirm("Delete this support thread?")) return;
    try {
      await deleteSupportMessage(msgId);
      onTriggerNotification?.("Support ticket deleted", "info");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to delete ticket", "error");
    }
  };

  const handleSendDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId || !directMsgText.trim()) return;
    try {
      setIsDirectSending(true);
      await sendAdminDirectMessage(
        targetUserId,
        targetUserEmail || targetUserId,
        targetUserName || "Trader",
        directSubject || "Important Account Notice",
        directMsgText.trim()
      );
      onTriggerNotification?.("Direct message sent to user!", "success");
      setTargetUserId("");
      setTargetUserEmail("");
      setTargetUserName("");
      setDirectSubject("");
      setDirectMsgText("");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to send direct message", "error");
    } finally {
      setIsDirectSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Send Direct Admin Message */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-2xl">
            <Send className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Send Direct Notification / Message</h3>
            <p className="text-xs text-slate-500">Transmit an official admin message to a specific user</p>
          </div>
        </div>

        <form onSubmit={handleSendDirect} className="space-y-3 max-w-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Target User ID</label>
              <input
                type="text"
                placeholder="e.g. user_123"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Target User Email</label>
              <input
                type="email"
                placeholder="user@example.com"
                value={targetUserEmail}
                onChange={(e) => setTargetUserEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Subject</label>
            <input
              type="text"
              placeholder="e.g. Important Account Verification Notice"
              value={directSubject}
              onChange={(e) => setDirectSubject(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Message Content</label>
            <textarea
              rows={3}
              placeholder="Type your message..."
              value={directMsgText}
              onChange={(e) => setDirectMsgText(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isDirectSending}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {isDirectSending ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>

      {/* Support Messages List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
          Support Inbox ({supportMessages.length})
        </h3>

        {supportMessages.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-500">
            No support messages currently.
          </div>
        ) : (
          <div className="space-y-4">
            {supportMessages.map((msg) => (
              <div
                key={msg.id}
                className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {msg.userName || "User"}
                      </span>
                      <span className="text-[10px] text-slate-500 ml-2">
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : "-"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteMsg(msg.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                    title="Delete Ticket"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Subject: {msg.subject}
                </div>

                <div className="text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  {msg.message}
                </div>

                {msg.adminReply && (
                  <div className="pl-4 border-l-2 border-indigo-500 text-xs text-slate-600 dark:text-slate-400">
                    <div className="font-semibold text-indigo-600 dark:text-indigo-400 text-[11px] mb-0.5">
                      Admin Reply ({msg.repliedAt ? new Date(msg.repliedAt).toLocaleString() : ""}):
                    </div>
                    <div>{msg.adminReply}</div>
                  </div>
                )}

                {/* Reply Input */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Type reply to user..."
                    value={replyTextMap[msg.id] || ""}
                    onChange={(e) => setReplyTextMap({ ...replyTextMap, [msg.id]: e.target.value })}
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => handleReply(msg.id)}
                    disabled={isSending || !replyTextMap[msg.id]?.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" /> Reply
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
