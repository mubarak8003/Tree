import React, { useState } from "react";
import { WalletTransaction } from "../../../types";
import { 
  ClipboardList, Check, X, Search, ArrowUpRight, ArrowDownLeft, ImageIcon
} from "lucide-react";
import { approveWalletRequest, rejectWalletRequest } from "../../../firebaseService";

interface ApprovalsTabProps {
  walletTransactions: WalletTransaction[];
  onTriggerNotification?: (message: string, type: "success" | "info" | "error") => void;
  adminEmail: string;
}

export const ApprovalsTab: React.FC<ApprovalsTabProps> = ({
  walletTransactions,
  onTriggerNotification,
  adminEmail
}) => {
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProof, setSelectedProof] = useState<string | null>(null);

  const filteredTransactions = walletTransactions.filter((tx) => {
    if (filterType !== "all" && tx.type !== filterType) return false;
    if (filterStatus !== "all" && tx.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = tx.id.toLowerCase().includes(q);
      const matchUser = (tx.userName || "").toLowerCase().includes(q) || (tx.userEmail || "").toLowerCase().includes(q);
      const matchMethod = ((tx as any).paymentMethod || "").toLowerCase().includes(q);
      if (!matchId && !matchUser && !matchMethod) return false;
    }
    return true;
  });

  const handleApprove = async (tx: WalletTransaction) => {
    try {
      await approveWalletRequest(tx.id);
      onTriggerNotification?.(`Approved ${tx.type} of $${tx.amount} for ${tx.userName || tx.userId}`, "success");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to approve transaction", "error");
    }
  };

  const handleReject = async (tx: WalletTransaction) => {
    try {
      await rejectWalletRequest(tx.id);
      onTriggerNotification?.(`Rejected ${tx.type} of $${tx.amount}`, "info");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to reject transaction", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls / Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Wallet Approvals</h3>
              <p className="text-xs text-slate-500">Review and authorize deposits & withdrawals</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search user, ID, method..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Types</option>
              <option value="DEPOSIT">Deposits</option>
              <option value="WITHDRAWAL">Withdrawals</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">
          Requests ({filteredTransactions.length})
        </h4>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-500">
            No transactions found matching your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Type</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Details</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Proof</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransactions.map((tx) => {
                  const proof = (tx as any).proofImage || (tx as any).proofUrl;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 font-bold uppercase text-[11px]">
                          {tx.type === "DEPOSIT" ? (
                            <span className="text-emerald-600 flex items-center gap-1">
                              <ArrowDownLeft className="h-3.5 w-3.5" /> Deposit
                            </span>
                          ) : tx.type === "WITHDRAWAL" ? (
                            <span className="text-rose-600 flex items-center gap-1">
                              <ArrowUpRight className="h-3.5 w-3.5" /> Withdrawal
                            </span>
                          ) : (
                            <span className="text-slate-600">{tx.type}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{tx.userName || "User"}</div>
                        <div className="text-[10px] text-slate-500">{tx.userEmail || tx.userId}</div>
                      </td>
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                        ${tx.amount.toLocaleString()}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{(tx as any).paymentMethod || (tx as any).description || "Standard"}</div>
                        {(tx as any).accountNumber && <div className="text-[10px] text-slate-500">Acc: {(tx as any).accountNumber}</div>}
                      </td>
                      <td className="p-3 text-[11px] text-slate-500">
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "-"}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full font-semibold uppercase text-[10px] ${
                          tx.status === "APPROVED" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" :
                          tx.status === "REJECTED" ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400" :
                          "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="p-3">
                        {proof ? (
                          <button
                            type="button"
                            onClick={() => setSelectedProof(proof)}
                            className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                          >
                            <ImageIcon className="h-3.5 w-3.5" /> View
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[10px]">None</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {tx.status === "PENDING" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleApprove(tx)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="h-3.5 w-3.5" /> Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(tx)}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Processed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Proof Modal */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-4 shadow-2xl relative">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Payment Proof Attachment</h4>
              <button
                type="button"
                onClick={() => setSelectedProof(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center max-h-[70vh]">
              <img src={selectedProof} alt="Proof" className="object-contain max-h-full max-w-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
