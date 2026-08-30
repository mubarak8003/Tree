import React, { useState } from "react";
import { TradePool, POPULAR_TRADING_PAIRS, RiskLevel, TradeType, TradeStatus } from "../../../types";
import { 
  Activity, PlusCircle, Check, Ban, DollarSign, TrendingUp, Edit3, Trash2
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
  const [selectedPairObj, setSelectedPairObj] = useState(POPULAR_TRADING_PAIRS[0]);
  const [customPair, setCustomPair] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [targetAmount, setTargetAmount] = useState(5000);
  const [minContribution, setMinContribution] = useState(50);
  const [maxParticipants, setMaxParticipants] = useState(50);
  const [expectedReturn, setExpectedReturn] = useState(15);
  const [durationSeconds, setDurationSeconds] = useState(86400); // 24 hours
  const [tradeType, setTradeType] = useState<TradeType>("CALL");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("MEDIUM");
  const [isCreatingPool, setIsCreatingPool] = useState(false);

  // Edit pool state
  const [editingPoolId, setEditingPoolId] = useState<string | null>(null);
  const [editReturnVal, setEditReturnVal] = useState<number>(0);

  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalPair = isCustom ? customPair.trim().toUpperCase() : selectedPairObj.pair;
    const finalSymbol = isCustom ? customPair.trim().toUpperCase() : selectedPairObj.symbol;
    if (!finalPair) {
      onTriggerNotification?.("Please specify a valid trading pair", "error");
      return;
    }
    try {
      setIsCreatingPool(true);
      await createNewTradePool(
        Number(targetAmount),
        Number(minContribution),
        Number(maxParticipants),
        Number(durationSeconds),
        tradeType,
        Number(expectedReturn),
        false,
        0,
        finalPair,
        finalSymbol,
        undefined,
        undefined,
        riskLevel
      );
      onTriggerNotification?.(`Trade Pool for ${finalPair} created successfully!`, "success");
      setCustomPair("");
      setIsCustom(false);
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to create trade pool", "error");
    } finally {
      setIsCreatingPool(false);
    }
  };

  const handleCompleteTrade = async (poolId: string, outcome: "win" | "loss") => {
    try {
      const returnPct = outcome === "win" ? (currentPool?.expectedReturn || 15) : -(currentPool?.expectedReturn || 100);
      await completeActiveTrade(poolId, returnPct);
      onTriggerNotification?.(`Trade completed with outcome: ${outcome.toUpperCase()}`, "success");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to complete trade", "error");
    }
  };

  const handleRefund = async (poolId: string) => {
    if (!window.confirm("Are you sure you want to refund this pool?")) return;
    try {
      await refundTradePool(poolId, true);
      onTriggerNotification?.("Pool refunded to participants", "info");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to refund pool", "error");
    }
  };

  const handleDeletePool = async (poolId: string) => {
    if (!window.confirm("Permanently delete this trade pool?")) return;
    try {
      await deleteTradePoolPermanently(poolId);
      onTriggerNotification?.("Pool deleted permanently", "info");
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

  return (
    <div className="space-y-6">
      {/* Create Trade Pool */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <PlusCircle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Create New Trade Pool</h3>
            <p className="text-xs text-slate-500">Launch a new group investment pool for users</p>
          </div>
        </div>

        <form onSubmit={handleCreatePool} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Trading Pair</label>
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

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Trade Direction</label>
            <select
              value={tradeType}
              onChange={(e) => setTradeType(e.target.value as TradeType)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
            >
              <option value="CALL">CALL (Bullish)</option>
              <option value="PUT">PUT (Bearish)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Target Amount ($)</label>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(Number(e.target.value))}
              min="100"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Min Contribution ($)</label>
            <input
              type="number"
              value={minContribution}
              onChange={(e) => setMinContribution(Number(e.target.value))}
              min="1"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Expected Return (%)</label>
            <input
              type="number"
              value={expectedReturn}
              onChange={(e) => setExpectedReturn(Number(e.target.value))}
              min="1"
              max="500"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Duration (Seconds)</label>
            <input
              type="number"
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(Number(e.target.value))}
              min="60"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Risk Level</label>
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
            >
              <option value="NO_RISK">No Risk</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-3 flex justify-end mt-2">
            <button
              type="submit"
              disabled={isCreatingPool}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <PlusCircle className="h-4 w-4" />
              {isCreatingPool ? "Creating Pool..." : "Launch Trade Pool"}
            </button>
          </div>
        </form>
      </div>

      {/* Active Pool Settlement */}
      {currentPool && (
        <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Active Trade Pool: {currentPool.assetPair || currentPool.tradingSymbol || currentPool.id}
                </h3>
                <p className="text-xs text-slate-500">
                  Status: <span className="font-semibold uppercase text-amber-600 dark:text-amber-400">{currentPool.status}</span> | Raised: ${currentPool.totalCollected} / ${currentPool.targetAmount}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleCompleteTrade(currentPool.id, "win")}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Check className="h-4 w-4" /> Settle as WIN (+{currentPool.expectedReturn || 15}%)
              </button>
              <button
                type="button"
                onClick={() => handleCompleteTrade(currentPool.id, "loss")}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Ban className="h-4 w-4" /> Settle as LOSS
              </button>
              <button
                type="button"
                onClick={() => handleRefund(currentPool.id)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <DollarSign className="h-4 w-4" /> Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All Pools List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">All Trade Pools ({allPools.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Pair / Symbol</th>
                <th className="p-3">Status</th>
                <th className="p-3">Raised / Target</th>
                <th className="p-3">Expected Return</th>
                <th className="p-3">Participants</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {allPools.map((p) => {
                const isEditing = editingPoolId === p.id;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                      {p.assetPair || p.tradingSymbol || p.id}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full font-semibold uppercase text-[10px] ${
                        p.status === "WAITING" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" :
                        p.status === "ACTIVE" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" :
                        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3">${p.totalCollected} / ${p.targetAmount}</td>
                    <td className="p-3">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editReturnVal}
                          onChange={(e) => setEditReturnVal(Number(e.target.value))}
                          className="w-16 bg-slate-100 dark:bg-slate-800 border rounded-lg px-2 py-1 text-xs"
                        />
                      ) : (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">+{p.expectedReturn || 0}%</span>
                      )}
                    </td>
                    <td className="p-3">{p.participantsCount || Object.keys(p.participants || {}).length}</td>
                    <td className="p-3 text-right space-x-2">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(p.id)}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPoolId(null)}
                            className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] cursor-pointer"
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
                            title="Edit"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePool(p.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
