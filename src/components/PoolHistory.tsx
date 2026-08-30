import React, { useState } from "react";
import { TradePool, Participant, UserProfile, maskEmail, getParticipantDisplayName } from "../types";
import { 
  History, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  XCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Users,
  Ban,
  Clock,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Coins
} from "lucide-react";

interface PoolHistoryProps {
  pools: TradePool[];
  currentUser?: UserProfile | null;
  allUsers?: UserProfile[];
}

export const PoolHistory: React.FC<PoolHistoryProps> = ({ pools, currentUser, allUsers }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ALL" | "WINS" | "REFUNDS">("ALL");

  // Filter out active or waiting pools
  const historicalPools = pools.filter(
    (p) => p.status === "COMPLETED" || p.status === "REFUNDED"
  );

  // Apply tab filter
  const filteredPools = historicalPools.filter((pool) => {
    if (activeTab === "WINS") {
      return pool.status === "COMPLETED" && pool.outcome?.isProfit;
    }
    if (activeTab === "REFUNDS") {
      return pool.status === "REFUNDED" || pool.canceledByAdmin;
    }
    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div id="pool-history" className="bg-white dark:bg-slate-900 rounded-none border-0 border-b border-slate-200/80 dark:border-slate-800 py-4 px-3.5 sm:px-4 shadow-none flex flex-col gap-4 w-full">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <History className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 font-display">
                  Trade Settlement History
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                  {historicalPools.length} Settled
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Complete ledger of resolved trade pools, outcomes, and payout distributions.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Filter Tabs */}
        {historicalPools.length > 0 && (
          <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl text-[11px] font-medium self-start sm:self-auto">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeTab === "ALL"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              All ({historicalPools.length})
            </button>
            <button
              onClick={() => setActiveTab("WINS")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeTab === "WINS"
                  ? "bg-emerald-500 text-white shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              Wins
            </button>
            <button
              onClick={() => setActiveTab("REFUNDS")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeTab === "REFUNDS"
                  ? "bg-amber-500 text-white shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              Refunds
            </button>
          </div>
        )}
      </div>

      {/* Main List Area */}
      {historicalPools.length === 0 ? (
        <div className="text-center py-10 px-4 bg-slate-50/50 dark:bg-slate-950/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 dark:text-indigo-400 rounded-2xl">
            <Coins className="h-6 w-6" />
          </div>
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">No Settled Trade Pools Yet</h3>
          <p className="text-[11px] text-slate-400 max-w-xs">
            Participate in active trade pools above or simulate market settlement to generate ledger history.
          </p>
        </div>
      ) : filteredPools.length === 0 ? (
        <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs italic">
          No pools match the "{activeTab.toLowerCase()}" filter.
        </div>
      ) : (
        /* Exactly ~4 items visible at once (~330px height) with custom scrollbar */
        <div className="flex flex-col gap-3 max-h-[340px] overflow-y-auto pr-1">
          {filteredPools.map((pool) => {
            const isExpanded = expandedId === pool.id;
            const isCompleted = pool.status === "COMPLETED";
            const isCanceled = pool.canceledByAdmin;
            const outcome = pool.outcome;
            const isFree = pool.isFreePool;
            const isWin = isCompleted && outcome?.isProfit;

            return (
              <div
                key={pool.id}
                id={`history-item-${pool.id}`}
                className={`border rounded-xl transition-all duration-200 ${
                  isExpanded
                    ? "border-indigo-300 dark:border-indigo-700/80 bg-indigo-50/20 dark:bg-indigo-950/10 shadow-xs"
                    : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/80"
                }`}
              >
                {/* Summary Row */}
                <div
                  onClick={() => toggleExpand(pool.id)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors gap-3"
                >
                  {/* Left Column: Icon & Name */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Status Badge Icon */}
                    <div className={`p-2 rounded-xl shrink-0 ${
                      isWin
                        ? "bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400"
                        : isCompleted
                        ? "bg-rose-100/80 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400"
                        : isCanceled
                        ? "bg-rose-100/50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"
                        : "bg-amber-100/80 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400"
                    }`}>
                      {isWin ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : isCompleted ? (
                        <XCircle className="h-4 w-4" />
                      ) : isCanceled ? (
                        <Ban className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 font-display whitespace-nowrap">
                          {isFree ? `FREE Pool (₹${pool.freeRewardAmount || 10})` : `₹${pool.targetAmount} Pool`}
                        </span>

                        {/* Trade Direction Pill */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold whitespace-nowrap ${
                          pool.tradeType === "CALL"
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60"
                            : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60"
                        }`}>
                          {pool.tradeType === "CALL" ? (
                            <ArrowUpRight className="h-3 w-3 stroke-[2.5]" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3 stroke-[2.5]" />
                          )}
                          {pool.tradeType}
                        </span>

                        {isFree && (
                          <span className="inline-flex items-center gap-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider shadow-2xs">
                            <Sparkles className="h-2.5 w-2.5" /> FREE
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono flex-wrap">
                        <span className="truncate max-w-[120px]" title={pool.id}>
                          #{pool.id.replace("pool_", "")}
                        </span>
                        <span>•</span>
                        <span className="whitespace-nowrap">
                          {new Date(pool.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })} at {new Date(pool.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Profit / Result & Toggle Chevron */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/60">
                    <div className="text-left sm:text-right">
                      {isCompleted && outcome ? (
                        <div>
                          <span className={`text-xs font-extrabold font-mono flex items-center gap-0.5 sm:justify-end whitespace-nowrap ${
                            outcome.isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                          }`}>
                            {isFree 
                              ? (outcome.isProfit ? `+₹${pool.freeRewardAmount || 10}` : "₹0 Win")
                              : `${outcome.isProfit ? "+" : "-"}₹${Math.abs(outcome.profitOrLoss).toFixed(0)}`}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block whitespace-nowrap mt-0.5">
                            {isFree ? (outcome.isProfit ? "Bonus Paid" : "No Bonus") : "Payout Distributed"}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block whitespace-nowrap">
                            {isCanceled ? "Canceled" : "Refunded"}
                          </span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 block font-medium uppercase tracking-wider whitespace-nowrap mt-0.5">
                            {isCanceled ? "Admin Override" : "Timer Expired"}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                      <span className="hidden sm:inline">{isExpanded ? "Hide" : "Details"}</span>
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Panel */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 rounded-b-xl flex flex-col gap-3">
                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 text-xs shadow-2xs">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 block">
                          {isFree ? "Free Reward / User" : "Total Pool Volume"}
                        </span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-100 font-mono mt-0.5 block">
                          {isFree ? `₹${pool.freeRewardAmount || 10}` : `₹${pool.totalCollected}`}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 block">
                          Total Contributors
                        </span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-100 font-mono flex items-center gap-1 mt-0.5">
                          <Users className="h-3 w-3 text-indigo-500" />
                          {pool.participantsCount} User{pool.participantsCount !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {isCompleted && outcome && (
                        <>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 block">
                              Market Outcome
                            </span>
                            <span className={`font-extrabold font-mono flex items-center gap-1 mt-0.5 ${
                              outcome.isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                            }`}>
                              {outcome.isProfit ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {outcome.isProfit ? "WIN" : "LOSS"} {isFree ? "" : `(${outcome.percentageChange.toFixed(1)}%)`}
                            </span>
                          </div>

                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 block">
                              Settled Timestamp
                            </span>
                            <span className="font-medium text-slate-600 dark:text-slate-300 text-[11px] font-mono mt-0.5 block">
                              {new Date(outcome.completedAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit"
                              })}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Proportional Share Breakdown Table */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5 px-0.5">
                        <h4 className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3 text-indigo-500" />
                          Proportional Payout Breakdown
                        </h4>
                        <span className="text-[9.5px] text-slate-400 font-mono">
                          {Object.keys(pool.participants).length} Members
                        </span>
                      </div>

                      <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-[11px] font-mono min-w-[340px]">
                            <thead className="bg-slate-100/70 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold text-[9.5px] uppercase border-b border-slate-200/80 dark:border-slate-800">
                              <tr className="whitespace-nowrap">
                                <th className="px-3 py-2">User Email</th>
                                <th className="px-3 py-2 text-right">Stake</th>
                                <th className="px-3 py-2 text-right">Pool Share</th>
                                {isCompleted && outcome && (
                                  <th className="px-3 py-2 text-right text-indigo-600 dark:text-indigo-400">
                                    Payout Recd.
                                  </th>
                                )}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                              {Object.values(pool.participants).map((p: Participant, idx: number) => {
                                const sharePct = isFree 
                                  ? (100 / Math.max(1, pool.participantsCount)) 
                                  : p.sharePercentage;
                                const payoutShare = isFree 
                                  ? (outcome?.isProfit ? (pool.freeRewardAmount || 10) : 0)
                                  : (outcome ? (outcome.payouts[p.userId] || 0) : 0);

                                return (
                                  <tr 
                                    key={p.userId || idx} 
                                    className="whitespace-nowrap hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                                  >
                                    <td className="px-3 py-2 font-sans font-medium text-slate-800 dark:text-slate-200 truncate max-w-[130px]" title={getParticipantDisplayName(p, currentUser, allUsers)}>
                                      {getParticipantDisplayName(p, currentUser, allUsers)}
                                    </td>
                                    <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">
                                      {isFree ? "Free (₹0)" : `₹${p.amount}`}
                                    </td>
                                    <td className="px-3 py-2 text-right text-slate-500">
                                      {sharePct.toFixed(1)}%
                                    </td>
                                    {isCompleted && outcome && (
                                      <td className={`px-3 py-2 text-right font-extrabold ${
                                        payoutShare > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                                      }`}>
                                        ₹{payoutShare.toFixed(2)}
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
