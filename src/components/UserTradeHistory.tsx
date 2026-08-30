import React, { useState } from "react";
import { UserProfile, TradePool } from "../types";
import { 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Percent,
  Compass
} from "lucide-react";

interface UserTradeHistoryProps {
  currentUser: UserProfile | null;
  pools: TradePool[];
}

export const UserTradeHistory: React.FC<UserTradeHistoryProps> = ({
  currentUser,
  pools,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  if (!currentUser) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 text-center text-slate-400 dark:text-slate-500 text-xs italic">
        Please select a simulator profile above to view your personalized trade history logs.
      </div>
    );
  }

  // Filter pools where current user is/was a participant
  const personalPools = pools.filter(pool => !!pool.participants[currentUser.id]);

  // Apply filters
  const filteredPools = filterStatus === "ALL" 
    ? personalPools 
    : personalPools.filter(pool => pool.status === filterStatus);

  return (
    <div id="user-trade-history" className="bg-white dark:bg-slate-900 rounded-none border-0 border-b border-slate-200 dark:border-slate-800 py-5 px-3.5 sm:px-5 shadow-none flex flex-col gap-4 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-150 font-display flex items-center gap-2">
            <Compass className="h-5 w-5 text-indigo-500" />
            My Fractional Trades Portfolio
          </h2>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            Your personal investment stakes, trade directions, and settlement payouts.
          </p>
        </div>

        {/* Status filters */}
        <select
          id="trade-filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="WAITING">Funding Open (Waiting)</option>
          <option value="ACTIVE">In-Flight Trades (Active)</option>
          <option value="COMPLETED">Settled Trades</option>
          <option value="REFUNDED">Refunded Pools</option>
        </select>
      </div>

      {filteredPools.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/10">
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">No personal trades logged under this filter.</p>
          <p className="text-[10px] text-slate-400 mt-1">Join any active or waiting trade pool above to start your ledger track.</p>
        </div>
      ) : (
        <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden overflow-x-auto max-h-[280px] overflow-y-auto scrollbar-thin">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800/80 whitespace-nowrap">
                <th className="px-4 py-3">Pool ID / Date</th>
                <th className="px-4 py-3">Direction</th>
                <th className="px-4 py-3 text-right">My Stake Amount</th>
                <th className="px-4 py-3 text-right">My Pool Share</th>
                <th className="px-4 py-3 text-right">Net Profit / Loss Share</th>
                <th className="px-4 py-3 text-right">Total Payout Received</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
              {filteredPools.map((pool) => {
                const participant = pool.participants[currentUser.id];
                const isCompleted = pool.status === "COMPLETED";
                const isRefunded = pool.status === "REFUNDED";
                const isFree = pool.isFreePool;
                
                // Calculate proportional gain/loss
                let profitLossShare = 0;
                let totalPayout = participant ? participant.amount : 0;

                if (isCompleted && pool.outcome) {
                  if (isFree) {
                    profitLossShare = pool.outcome.isProfit ? (pool.freeRewardAmount || 10) : 0;
                    totalPayout = profitLossShare;
                  } else {
                    const targetAmt = pool.targetAmount || 1;
                    const shareFraction = (participant?.amount || 0) / targetAmt;
                    profitLossShare = shareFraction * pool.outcome.profitOrLoss;
                    totalPayout = (participant?.amount || 0) + profitLossShare;
                  }
                } else if (isRefunded) {
                  profitLossShare = 0;
                  totalPayout = participant?.amount || 0;
                }

                const sharePct = isFree 
                  ? (100 / Math.max(1, pool.participantsCount)) 
                  : (participant?.sharePercentage || 0);

                return (
                  <tr key={pool.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition-colors">
                    <td className="px-4 py-3 font-sans">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate max-w-[120px]">{pool.id}</span>
                        {isFree && (
                          <span className="bg-indigo-500 text-white font-extrabold text-[8px] px-1 py-0.2 rounded uppercase">
                            FREE
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 block font-mono">
                        {new Date(pool.createdAt).toLocaleDateString()} at {new Date(pool.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-sans">
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                        pool.tradeType === "CALL"
                          ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100/30"
                          : "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-100/30"
                      }`}>
                        {pool.tradeType === "CALL" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {pool.tradeType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-slate-300">
                      {isFree ? "Free (₹0)" : `₹${participant?.amount || 0}`}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {sharePct.toFixed(1)}%
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${
                      !isCompleted
                        ? "text-slate-400"
                        : profitLossShare >= 0 
                          ? "text-emerald-600 dark:text-emerald-400" 
                          : "text-rose-600 dark:text-rose-400"
                    }`}>
                      {!isCompleted ? "—" : (profitLossShare >= 0 ? "+" : "-") + "₹" + Math.abs(profitLossShare).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-slate-800 dark:text-slate-200">
                      {isCompleted ? `₹${totalPayout.toFixed(2)}` : isRefunded ? `₹${(participant?.amount || 0).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center font-sans">
                      <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                        pool.status === "WAITING"
                          ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-100/30"
                          : pool.status === "ACTIVE"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100/30"
                          : pool.status === "COMPLETED"
                          ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100/30"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}>
                        {pool.status}
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
