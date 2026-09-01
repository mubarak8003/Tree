import React, { useState } from "react";
import { TradePool, POPULAR_TRADING_PAIRS, RiskLevel, TradeType, TradeStatus } from "../../../types";
import { 
  Activity, PlusCircle, Check, Ban, DollarSign, TrendingUp, TrendingDown, 
  Edit3, Trash2, Gift, Sparkles, Clock, Users, Layers, ShieldCheck, 
  AlertCircle, Filter, ArrowUpRight, ArrowDownRight, Search
} from "lucide-react";
import { 
  createNewTradePool, completeActiveTrade, refundTradePool, 
  deleteTradePoolPermanently, updatePoolExpectedReturn, updateTradePoolDetails 
} from "../../../firebaseService";

interface SettlementTabProps {
  currentPool: TradePool | null;
  allPools: TradePool[];
  onTriggerNotification?: (message: string, type: "success" | "info" | "error") => void;
  adminEmail: string;
}

export const SettlementTab: React.FC<SettlementTabProps> = ({
  currentPool,
  allPools,
  onTriggerNotification,
  adminEmail
}) => {
  // Pool Type selection (Standard vs Free Pool)
  const [poolMode, setPoolMode] = useState<"standard" | "free">("standard");

  // Form State
  const [selectedPairObj, setSelectedPairObj] = useState(POPULAR_TRADING_PAIRS[0]);
  const [customPair, setCustomPair] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [targetAmount, setTargetAmount] = useState<number | string>(5000);
  const [minContribution, setMinContribution] = useState<number | string>(50);
  const [maxParticipants, setMaxParticipants] = useState<number | string>(50);
  const [expectedReturn, setExpectedReturn] = useState<number | string>(15);
  const [freeRewardAmount, setFreeRewardAmount] = useState<number | string>(10);
  const [durationSeconds, setDurationSeconds] = useState<number | string>(86400); // 24 hours
  const [tradeType, setTradeType] = useState<TradeType>("CALL");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("MEDIUM");
  const [isCreatingPool, setIsCreatingPool] = useState(false);

  // Pool List Filter and Search
  const [listFilter, setListFilter] = useState<"ALL" | "ACTIVE" | "FREE" | "SETTLED" | "REFUNDED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Edit pool state
  const [editingPoolId, setEditingPoolId] = useState<string | null>(null);
  const [editReturnVal, setEditReturnVal] = useState<number>(0);

  // Settlement loading state per pool
  const [settlingPoolId, setSettlingPoolId] = useState<string | null>(null);

  // Active & Waiting Pools
  const activePools = allPools.filter((p) => p.status === "WAITING" || p.status === "ACTIVE");

  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalPair = isCustom ? customPair.trim().toUpperCase() : selectedPairObj.pair;
    const finalSymbol = isCustom ? customPair.trim().toUpperCase() : selectedPairObj.symbol;
    if (!finalPair) {
      onTriggerNotification?.("Please specify a valid trading pair", "error");
      return;
    }

    const isFree = poolMode === "free";
    const finalTarget = isFree ? 0 : Number(targetAmount);
    const finalMinContrib = isFree ? 0 : Number(minContribution);
    const finalReward = isFree ? Number(freeRewardAmount || 10) : 0;
    const finalRisk = isFree ? "NO_RISK" : riskLevel;

    try {
      setIsCreatingPool(true);
      await createNewTradePool(
        finalTarget,
        finalMinContrib,
        Number(maxParticipants),
        Number(durationSeconds),
        tradeType,
        Number(expectedReturn),
        isFree,
        finalReward,
        finalPair,
        finalSymbol,
        undefined,
        undefined,
        finalRisk
      );
      onTriggerNotification?.(
        isFree 
          ? `🎁 Sponsored Free Pool for ${finalPair} launched successfully!` 
          : `✅ Trade Pool for ${finalPair} created successfully!`, 
        "success"
      );
      setCustomPair("");
      setIsCustom(false);
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to create trade pool", "error");
    } finally {
      setIsCreatingPool(false);
    }
  };

  const handleCompleteTrade = async (poolId: string, outcome: "win" | "loss") => {
    const targetPool = allPools.find((p) => p.id === poolId);
    try {
      setSettlingPoolId(poolId);
      const returnPct = outcome === "win" 
        ? (targetPool?.expectedReturn || 15) 
        : -(targetPool?.expectedReturn || 100);
      await completeActiveTrade(poolId, returnPct);
      onTriggerNotification?.(
        `Pool ${targetPool?.assetPair || poolId} settled as ${outcome.toUpperCase()}!`, 
        "success"
      );
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to complete trade", "error");
    } finally {
      setSettlingPoolId(null);
    }
  };

  const handleRefund = async (poolId: string) => {
    const targetPool = allPools.find((p) => p.id === poolId);
    if (!window.confirm(`Are you sure you want to refund ${targetPool?.assetPair || "this pool"}? All participant stakes will be returned.`)) return;
    try {
      setSettlingPoolId(poolId);
      await refundTradePool(poolId, true);
      onTriggerNotification?.("Pool refunded to all participants successfully", "info");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to refund pool", "error");
    } finally {
      setSettlingPoolId(null);
    }
  };

  const handleDeletePool = async (poolId: string) => {
    const targetPool = allPools.find((p) => p.id === poolId);
    if (!window.confirm(`Permanently delete trade pool ${targetPool?.assetPair || poolId}? This action cannot be undone.`)) return;
    try {
      await deleteTradePoolPermanently(poolId);
      onTriggerNotification?.("Trade pool deleted permanently", "info");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to delete pool", "error");
    }
  };

  const handleSaveEdit = async (poolId: string) => {
    try {
      await updatePoolExpectedReturn(poolId, editReturnVal);
      onTriggerNotification?.("Pool expected return updated successfully", "success");
      setEditingPoolId(null);
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to update pool", "error");
    }
  };

  // Filtered pools for table
  const filteredPoolsList = allPools.filter((p) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPair = (p.assetPair || "").toLowerCase().includes(q);
      const matchSymbol = (p.tradingSymbol || "").toLowerCase().includes(q);
      const matchId = (p.id || "").toLowerCase().includes(q);
      if (!matchPair && !matchSymbol && !matchId) return false;
    }

    // Category filter
    if (listFilter === "ACTIVE") return p.status === "WAITING" || p.status === "ACTIVE";
    if (listFilter === "FREE") return !!p.isFreePool;
    if (listFilter === "SETTLED") return p.status === "COMPLETED";
    if (listFilter === "REFUNDED") return p.status === "REFUNDED";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. ACTIVE & WAITING TRADE POOLS (MULTI-POOL CARDS) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Active & Waiting Trade Pools
                <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 rounded-full text-xs font-black">
                  {activePools.length} Active
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Manage, monitor, and settle all live trade pools individually
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Total Pools: <strong className="text-slate-900 dark:text-slate-100">{allPools.length}</strong></span>
          </div>
        </div>

        {activePools.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activePools.map((pool) => {
              const isFree = !!pool.isFreePool;
              const participantsList = Object.values(pool.participants || {});
              const participantsCount = pool.participantsCount || participantsList.length;
              const progressPct = isFree 
                ? (participantsCount / (pool.maxParticipants || 50)) * 100 
                : Math.min(100, ((pool.totalCollected || 0) / (pool.targetAmount || 1)) * 100);
              const isSettling = settlingPoolId === pool.id;

              return (
                <div 
                  key={pool.id} 
                  className={`border rounded-2xl p-5 transition-all relative overflow-hidden ${
                    isFree 
                      ? "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/10" 
                      : "border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40"
                  }`}
                >
                  {/* Top Row: Pair and Badges */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                          {pool.assetPair || pool.tradingSymbol || pool.id}
                        </span>
                        {isFree ? (
                          <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-full text-[10px] font-black uppercase flex items-center gap-1 shadow-xs">
                            <Gift className="h-3 w-3" /> Free Promo Pool
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-full text-[10px] font-black uppercase">
                            Standard Pool
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          pool.status === "ACTIVE" 
                            ? "bg-amber-500 text-slate-950" 
                            : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        }`}>
                          {pool.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        ID: {pool.id} • {pool.scheduledExecutionTime || "5M Candle"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className={`px-2 py-1 rounded-xl text-xs font-black flex items-center gap-1 ${
                        pool.tradeType === "CALL" 
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" 
                          : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                      }`}>
                        {pool.tradeType === "CALL" ? (
                          <>
                            <ArrowUpRight className="h-3.5 w-3.5" /> CALL ↗
                          </>
                        ) : (
                          <>
                            <ArrowDownRight className="h-3.5 w-3.5" /> PUT ↘
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Pool Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 my-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">
                        {isFree ? "Prize / Winner" : "Raised / Target"}
                      </span>
                      <strong className="text-slate-900 dark:text-slate-100 font-bold">
                        {isFree ? `₹${pool.freeRewardAmount || 10} Cash` : `₹${pool.totalCollected} / ₹${pool.targetAmount}`}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">Expected Return</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {isFree ? `+₹${pool.freeRewardAmount || 10} Bonus` : `+${pool.expectedReturn || 15}%`}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">Participants</span>
                      <strong className="text-slate-900 dark:text-slate-100 font-bold flex items-center gap-1">
                        <Users className="h-3 w-3 text-slate-400" />
                        {participantsCount} / {pool.maxParticipants || 50}
                      </strong>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mb-4">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        isFree ? "bg-emerald-500" : "bg-indigo-600"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, progressPct))}%` }}
                    />
                  </div>

                  {/* Settlement Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      disabled={isSettling}
                      onClick={() => handleCompleteTrade(pool.id, "win")}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Settle as WIN ({isFree ? `+₹${pool.freeRewardAmount || 10}` : `+${pool.expectedReturn || 15}%`})
                    </button>
                    <button
                      type="button"
                      disabled={isSettling}
                      onClick={() => handleCompleteTrade(pool.id, "loss")}
                      className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all disabled:opacity-50"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Settle as LOSS
                    </button>
                    <button
                      type="button"
                      disabled={isSettling}
                      onClick={() => handleRefund(pool.id)}
                      className="py-2 px-3 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 shadow-xs cursor-pointer transition-all disabled:opacity-50"
                      title="Refund participants"
                    >
                      <DollarSign className="h-3.5 w-3.5" />
                      Refund
                    </button>
                    <button
                      type="button"
                      disabled={isSettling}
                      onClick={() => handleDeletePool(pool.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer"
                      title="Delete Pool"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full mb-2">
              <Activity className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Active Trade Pools Running</h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              All pools are settled. Use the form below to launch a new Standard Trade Pool or a Free Entry Promo Pool.
            </p>
          </div>
        )}
      </div>

      {/* 2. CREATE NEW TRADE POOL (STANDARD & FREE POOL TABS) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${
              poolMode === "free" 
                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400" 
                : "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
            }`}>
              {poolMode === "free" ? <Gift className="h-6 w-6" /> : <PlusCircle className="h-6 w-6" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Launch New Trade Pool
                {poolMode === "free" && (
                  <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px] font-black uppercase">
                    🎁 Free Promo Mode
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500">
                {poolMode === "free" 
                  ? "Launch a zero-risk Free Entry pool with sponsor cash reward on Win" 
                  : "Launch a standard group fractional trade pool with target collection and % ROI"}
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setPoolMode("standard")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                poolMode === "standard"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Standard Pool
            </button>
            <button
              type="button"
              onClick={() => setPoolMode("free")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                poolMode === "free"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              }`}
            >
              <Gift className="h-3.5 w-3.5" />
              🎁 Free Entry Pool
            </button>
          </div>
        </div>

        {/* Informational Banner for Free Pool */}
        {poolMode === "free" && (
          <div className="mb-6 p-4 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 dark:text-emerald-200">
              <strong className="block font-bold mb-0.5">Free Entry Promo Pool Activated:</strong>
              Users can join this pool for <strong className="text-emerald-700 dark:text-emerald-300">FREE (₹0 / $0)</strong> without deducting from their wallet. When this trade settles as <strong className="text-emerald-700 dark:text-emerald-300">WIN</strong>, every participant receives the specified Free Cash Reward instantly credited to their real wallet!
            </div>
          </div>
        )}

        <form onSubmit={handleCreatePool} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Trading Pair */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Trading Asset / Pair</label>
            <select
              value={isCustom ? "CUSTOM" : selectedPairObj.pair}
              onChange={(e) => {
                if (e.target.value === "CUSTOM") {
                  setIsCustom(true);
                } else {
                  setIsCustom(false);
                  const found = POPULAR_TRADING_PAIRS.find((p) => p.pair === e.target.value);
                  if (found) setSelectedPairObj(found);
                }
              }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {POPULAR_TRADING_PAIRS.map((p) => (
                <option key={p.pair} value={p.pair}>{p.pair}</option>
              ))}
              <option value="CUSTOM">Custom Pair...</option>
            </select>
          </div>

          {isCustom && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Custom Pair Name</label>
              <input
                type="text"
                value={customPair}
                onChange={(e) => setCustomPair(e.target.value)}
                placeholder="e.g. SOL/USDT"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
                required
              />
            </div>
          )}

          {/* Trade Direction */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Trade Direction</label>
            <select
              value={tradeType}
              onChange={(e) => setTradeType(e.target.value as TradeType)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
            >
              <option value="CALL">CALL (Bullish ↗)</option>
              <option value="PUT">PUT (Bearish ↘)</option>
            </select>
          </div>

          {/* If Free Pool: Free Reward Amount. Else: Target Amount */}
          {poolMode === "free" ? (
            <div>
              <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1">
                <Gift className="h-3.5 w-3.5" />
                Free Win Reward / User (₹ / $) *
              </label>
              <input
                type="number"
                value={freeRewardAmount}
                onChange={(e) => setFreeRewardAmount(e.target.value === "" ? "" : Number(e.target.value))}
                min="1"
                max="10000"
                placeholder="10"
                className="w-full bg-emerald-50/40 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-100"
                required
              />
              <div className="flex items-center gap-1.5 mt-1.5">
                {[10, 25, 50, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setFreeRewardAmount(preset)}
                    className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 text-[10px] font-bold rounded-md text-slate-600 dark:text-slate-400 cursor-pointer"
                  >
                    ₹{preset}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Target Amount ($ / ₹)</label>
              <input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value === "" ? "" : Number(e.target.value))}
                min="50"
                placeholder="5000"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
                required
              />
            </div>
          )}

          {/* If Standard: Min Contribution */}
          {poolMode === "standard" && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Min Contribution ($ / ₹)</label>
              <input
                type="number"
                value={minContribution}
                onChange={(e) => setMinContribution(e.target.value === "" ? "" : Number(e.target.value))}
                min="1"
                placeholder="50"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
                required
              />
            </div>
          )}

          {/* Expected Return */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              {poolMode === "free" ? "Display Win ROI (%)" : "Expected Return (%)"}
            </label>
            <input
              type="number"
              value={expectedReturn}
              onChange={(e) => setExpectedReturn(e.target.value === "" ? "" : Number(e.target.value))}
              min="1"
              max="500"
              placeholder="15"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          {/* Max Participants */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Max Participants</label>
            <input
              type="number"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value === "" ? "" : Number(e.target.value))}
              min="2"
              max="1000"
              placeholder="50"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Duration (Seconds)</label>
            <input
              type="number"
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(e.target.value === "" ? "" : Number(e.target.value))}
              min="60"
              placeholder="86400"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
              required
            />
            <div className="flex items-center gap-1.5 mt-1.5">
              {[
                { label: "5m", sec: 300 },
                { label: "15m", sec: 900 },
                { label: "1h", sec: 3600 },
                { label: "24h", sec: 86400 }
              ].map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setDurationSeconds(t.sec)}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md cursor-pointer ${
                    durationSeconds === t.sec 
                      ? "bg-indigo-600 text-white" 
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Risk Level */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Risk Level</label>
            {poolMode === "free" ? (
              <div className="w-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                NO_RISK (Zero Risk / Free Entry)
              </div>
            ) : (
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="NO_RISK">No Risk (Capital Protected)</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            )}
          </div>

          <div className="sm:col-span-2 lg:col-span-3 flex justify-end mt-2">
            <button
              type="submit"
              disabled={isCreatingPool}
              className={`px-6 py-3 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                poolMode === "free"
                  ? "bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700"
                  : "bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700"
              }`}
            >
              {poolMode === "free" ? <Gift className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
              {isCreatingPool 
                ? "Launching Pool..." 
                : poolMode === "free" 
                ? `Launch 🎁 Free Promo Pool (₹${freeRewardAmount || 10} Win Prize)` 
                : "Launch Standard Trade Pool"}
            </button>
          </div>
        </form>
      </div>

      {/* 3. ALL TRADE POOLS TABLE & FILTERING */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              All Trade Pools History
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs font-bold">
                {allPools.length} Total
              </span>
            </h3>
            <p className="text-xs text-slate-500">Full audit log of active, settled, and refunded trade pools</p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "ALL", label: `All (${allPools.length})` },
              { id: "ACTIVE", label: `Active (${activePools.length})` },
              { id: "FREE", label: `🎁 Free (${allPools.filter(p => p.isFreePool).length})` },
              { id: "SETTLED", label: `Settled (${allPools.filter(p => p.status === "COMPLETED").length})` },
              { id: "REFUNDED", label: `Refunded (${allPools.filter(p => p.status === "REFUNDED").length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setListFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  listFilter === tab.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Pair (e.g. BTC, EUR, Gold) or Pool ID..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Pools Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Pair / Symbol</th>
                <th className="p-3">Type</th>
                <th className="p-3">Status</th>
                <th className="p-3">Raised / Target</th>
                <th className="p-3">Return / Reward</th>
                <th className="p-3">Participants</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPoolsList.length > 0 ? (
                filteredPoolsList.map((p) => {
                  const isEditing = editingPoolId === p.id;
                  const isFree = !!p.isFreePool;
                  const isPoolActive = p.status === "WAITING" || p.status === "ACTIVE";
                  const participantsCount = p.participantsCount || Object.keys(p.participants || {}).length;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {p.assetPair || p.tradingSymbol || p.id}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {p.id} • {p.tradeType || "CALL"}
                        </div>
                      </td>
                      <td className="p-3">
                        {isFree ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-md font-bold text-[10px] flex items-center gap-1 w-fit">
                            <Gift className="h-3 w-3" /> Free Pool
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-md font-semibold text-[10px]">
                            Standard
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full font-semibold uppercase text-[10px] ${
                          p.status === "WAITING" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" :
                          p.status === "ACTIVE" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" :
                          p.status === "COMPLETED" ? (p.outcome?.isProfit ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900" : "bg-rose-100 text-rose-800 dark:bg-rose-900") :
                          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}>
                          {p.status === "COMPLETED" 
                            ? (p.outcome?.isProfit ? "SETTLED (WIN)" : "SETTLED (LOSS)") 
                            : p.status}
                        </span>
                      </td>
                      <td className="p-3">
                        {isFree ? (
                          <span className="text-emerald-600 font-bold">Free Entry</span>
                        ) : (
                          <span>₹{p.totalCollected || 0} / ₹{p.targetAmount}</span>
                        )}
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editReturnVal}
                            onChange={(e) => setEditReturnVal(Number(e.target.value))}
                            className="w-16 bg-slate-100 dark:bg-slate-800 border rounded-lg px-2 py-1 text-xs"
                          />
                        ) : isFree ? (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            +₹{p.freeRewardAmount || 10} Cash
                          </span>
                        ) : (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            +{p.expectedReturn || 0}%
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-semibold">{participantsCount}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* If active, quick settle actions */}
                          {isPoolActive && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleCompleteTrade(p.id, "win")}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px] cursor-pointer"
                                title="Settle as WIN"
                              >
                                WIN
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCompleteTrade(p.id, "loss")}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-[10px] cursor-pointer"
                                title="Settle as LOSS"
                              >
                                LOSS
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRefund(p.id)}
                                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-[10px] cursor-pointer"
                                title="Refund Pool"
                              >
                                Refund
                              </button>
                            </>
                          )}

                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(p.id)}
                                className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[10px] cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPoolId(null)}
                                className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] cursor-pointer"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPoolId(p.id);
                                  setEditReturnVal(p.expectedReturn || 0);
                                }}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg cursor-pointer"
                                title="Edit Expected Return"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePool(p.id)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg cursor-pointer"
                                title="Delete Pool Permanently"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    No trade pools found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

