import React, { useState } from "react";
import { UserProfile, WalletTransaction } from "../types";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  HelpCircle, 
  TrendingUp, 
  TrendingDown,
  Gift,
  Sliders,
  Briefcase,
  Layers,
  Send,
  Download,
  ArrowRightLeft
} from "lucide-react";

interface WalletHistoryProps {
  currentUser: UserProfile | null;
  walletTransactions: WalletTransaction[];
}

export const WalletHistory: React.FC<WalletHistoryProps> = ({
  currentUser,
  walletTransactions,
}) => {
  const [filterType, setFilterType] = useState<string>("ALL");

  if (!currentUser) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 text-center text-slate-400 dark:text-slate-500 text-xs italic">
        Please select a simulator profile to view detailed wallet transaction logs.
      </div>
    );
  }

  // Filter out other users' transactions to secure user view privacy
  const userTx = walletTransactions.filter(tx => tx.userId === currentUser.id);

  // Apply visual category filters
  const filteredTx = filterType === "ALL" 
    ? userTx 
    : filterType === "TRANSFERS"
    ? userTx.filter(tx => tx.type === "TRANSFER_SENT" || tx.type === "TRANSFER_RECEIVED")
    : userTx.filter(tx => tx.type === filterType);

  // Helper to render transaction specific icons
  const getTxIcon = (type: string) => {
    switch(type) {
      case "DEPOSIT":
        return <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-lg"><ArrowUpRight className="h-4 w-4" /></div>;
      case "WITHDRAWAL":
        return <div className="p-1.5 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 rounded-lg"><ArrowDownLeft className="h-4 w-4" /></div>;
      case "TRADE_INVEST":
        return <div className="p-1.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-lg"><Briefcase className="h-4 w-4" /></div>;
      case "TRADE_REFUND":
        return <div className="p-1.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 rounded-lg"><RefreshCw className="h-4 w-4" /></div>;
      case "TRADE_PROFIT":
        return <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-lg"><TrendingUp className="h-4 w-4" /></div>;
      case "TRADE_LOSS":
        return <div className="p-1.5 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 rounded-lg"><TrendingDown className="h-4 w-4" /></div>;
      case "BONUS":
        return <div className="p-1.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 rounded-lg"><Gift className="h-4 w-4" /></div>;
      case "ADJUSTMENT":
        return <div className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg"><Sliders className="h-4 w-4" /></div>;
      case "TRANSFER_SENT":
        return <div className="p-1.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-lg"><Send className="h-4 w-4" /></div>;
      case "TRANSFER_RECEIVED":
        return <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-lg"><Download className="h-4 w-4" /></div>;
      default:
        return <div className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg"><HelpCircle className="h-4 w-4" /></div>;
    }
  };

  const getTxTypeLabel = (type: string) => {
    if (type === "TRANSFER_SENT") return "Transfer Sent (P2P)";
    if (type === "TRANSFER_RECEIVED") return "Transfer Received (P2P)";
    return type.replace("_", " ");
  };

  return (
    <div id="wallet-history" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 py-6 px-1 shadow-xs flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-150 font-display flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-500" />
            Wallet Transaction Audit History
          </h2>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            Full ledger trail for Deposits, Withdrawals, P2P Wallet Transfers, Trade Actions, and Adjustments.
          </p>
        </div>

        {/* Category Filters */}
        <select
          id="tx-filter-select"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="ALL">All Categories</option>
          <option value="TRANSFERS">P2P Wallet Transfers (All)</option>
          <option value="TRANSFER_SENT">Transfers Sent</option>
          <option value="TRANSFER_RECEIVED">Transfers Received</option>
          <option value="DEPOSIT">Deposits</option>
          <option value="WITHDRAWAL">Withdrawals</option>
          <option value="TRADE_INVEST">Trade Investments</option>
          <option value="TRADE_REFUND">Trade Refunds</option>
          <option value="TRADE_PROFIT">Trade Profits</option>
          <option value="TRADE_LOSS">Trade Losses</option>
          <option value="BONUS">Bonus Credits</option>
          <option value="ADJUSTMENT">Adjustments</option>
        </select>
      </div>

      {filteredTx.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/10">
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">No transactions logged under this filter.</p>
        </div>
      ) : (
        <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden max-h-[420px] overflow-y-auto overflow-x-auto shadow-inner">
          <table className="w-full text-left text-xs min-w-[700px] relative">
            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 shadow-xs">
              <tr className="bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                <th className="px-4 py-3">Category / Date</th>
                <th className="px-4 py-3">Transaction ID</th>
                <th className="px-4 py-3">Counterparty / Note</th>
                <th className="px-4 py-3 text-right">Balance Before</th>
                <th className="px-4 py-3 text-right">Delta Amount</th>
                <th className="px-4 py-3 text-right">Balance After</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
              {filteredTx.map((tx) => {
                const isPositive = 
                  tx.type === "DEPOSIT" || 
                  tx.type === "TRADE_REFUND" || 
                  tx.type === "TRADE_PROFIT" || 
                  tx.type === "BONUS" ||
                  tx.type === "TRANSFER_RECEIVED";

                return (
                  <tr key={tx.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition-colors">
                    <td className="px-4 py-3 font-sans">
                      <div className="flex items-center gap-2.5">
                        {getTxIcon(tx.type)}
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 block uppercase text-[10px]">
                            {getTxTypeLabel(tx.type)}
                          </span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500">
                            {new Date(tx.createdAt).toLocaleDateString()} • {new Date(tx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 dark:text-slate-500 max-w-[110px] truncate" title={tx.id}>
                      {tx.id}
                    </td>
                    <td className="px-4 py-3 font-sans max-w-[180px]">
                      {tx.type === "TRANSFER_SENT" ? (
                        <div className="text-[11px]">
                          <span className="text-slate-500 dark:text-slate-400 font-bold block">To: {tx.counterpartyName || tx.counterpartyEmail || tx.counterpartyUserId}</span>
                          {tx.transferNote && <span className="text-[10px] text-slate-400 italic block truncate">"{tx.transferNote}"</span>}
                        </div>
                      ) : tx.type === "TRANSFER_RECEIVED" ? (
                        <div className="text-[11px]">
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold block">From: {tx.counterpartyName || tx.counterpartyEmail || tx.counterpartyUserId}</span>
                          {tx.transferNote && <span className="text-[10px] text-slate-400 italic block truncate">"{tx.transferNote}"</span>}
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 truncate block" title={tx.referenceId || tx.txDetails}>
                          {tx.referenceId || tx.txDetails || "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      ₹{tx.balanceBefore?.toFixed(2) || "0.00"}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold text-[12px] ${
                      isPositive 
                        ? "text-emerald-600 dark:text-emerald-400" 
                        : "text-rose-600 dark:text-rose-400"
                    }`}>
                      {isPositive ? "+" : "-"}₹{tx.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-slate-300">
                      ₹{tx.balanceAfter?.toFixed(2) || "0.00"}
                    </td>
                    <td className="px-4 py-3 text-center font-sans">
                      <span className={`inline-block px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded ${
                        tx.status === "APPROVED"
                          ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60"
                          : tx.status === "REJECTED"
                          ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60"
                          : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/60"
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
