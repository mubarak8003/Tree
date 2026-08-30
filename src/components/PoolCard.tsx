import React, { useState, useEffect } from "react";
import { TradePool, UserProfile, Participant, maskEmail, getParticipantDisplayName } from "../types";
import { 
  Users, 
  Clock, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  CheckCircle2, 
  AlertCircle,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  ShieldCheck,
  Shield,
  Zap,
  AlertTriangle,
  Percent,
  BarChart2,
  ExternalLink,
  Calendar,
  Sparkles,
  Lock
} from "lucide-react";
import { joinTradePool, refundTradePool } from "../firebaseService";
import { TradingViewChartModal } from "./TradingViewChartModal";
import { getAssetMarketStatus } from "../services/livePriceService";

interface PoolCardProps {
  pool: TradePool;
  currentUser: UserProfile | null;
  allUsers?: UserProfile[];
  onJoinSuccess?: () => void;
}

export const PoolCard: React.FC<PoolCardProps> = ({
  pool,
  currentUser,
  allUsers,
  onJoinSuccess,
}) => {
  const [contribution, setContribution] = useState<string>(pool.minContribution.toString());
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpiring, setIsExpiring] = useState(false);
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Synchronize contribution input default if admin config changes min contribution
  useEffect(() => {
    setContribution(pool.minContribution.toString());
    setRiskAcknowledged(false); // Reset on pool changes
  }, [pool.minContribution, pool.id]);

  // Countdown timer logic
  useEffect(() => {
    if (pool.status !== "WAITING") {
      setTimeLeft(0);
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(pool.expiresAt).getTime();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      return diff;
    };

    const initialDiff = calculateTimeLeft();
    setTimeLeft(initialDiff);

    if (initialDiff === 0) {
      if (!isExpiring) {
        setIsExpiring(true);
        handleAutoRefund();
      }
      return;
    }

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(timer);
        if (!isExpiring) {
          setIsExpiring(true);
          handleAutoRefund();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [pool.expiresAt, pool.status, pool.id]);

  const handleAutoRefund = async () => {
    try {
      console.log(`Auto-refunding expired pool: ${pool.id}`);
      await refundTradePool(pool.id);
    } catch (err) {
      console.error("Failed to automatically refund trade pool:", err);
    } finally {
      setIsExpiring(false);
    }
  };

  const poolMarketStatus = getAssetMarketStatus(pool.assetPair);
  const isMarketOpen = poolMarketStatus.isOpen;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsJoining(true);
    setJoinError(null);

    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error("⚠️ Internet Disconnected! Please check your internet connection to join trade pools.");
      }

      if (!isMarketOpen) {
        throw new Error(`🔒 Market is CLOSED for ${pool.assetPair || "this pair"} (${poolMarketStatus.reason || "Weekend Market Close"}). Interbank Forex & Metals markets do not operate on weekends. ${poolMarketStatus.nextOpenTime || "Opens Sunday 21:00 UTC"}.`);
      }

      if (!riskAcknowledged) {
        throw new Error("Please check the warning box to acknowledge the risk of total investment loss.");
      }

      const amountNum = pool.isFreePool ? 0 : parseInt(contribution);
      if (!pool.isFreePool) {
        if (isNaN(amountNum)) {
          throw new Error("Please enter a valid contribution amount.");
        }
        
        const available = currentUser.availableBalance ?? currentUser.balance;
        if (amountNum > available) {
          throw new Error(`Insufficient Available Balance! You have ₹${available.toFixed(2)}, but tried to invest ₹${amountNum}.`);
        }
      }

      await joinTradePool(pool.id, currentUser.id, amountNum);
      setRiskAcknowledged(false); // Reset for next investment
      if (onJoinSuccess) onJoinSuccess();
    } catch (err: any) {
      setJoinError(err.message || "Failed to participate in trade.");
    } finally {
      setIsJoining(false);
    }
  };

  const getStatusBadge = () => {
    switch (pool.status) {
      case "WAITING":
        if (!isMarketOpen) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9.5px] font-extrabold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-mono tracking-wider uppercase whitespace-nowrap shrink-0">
              <Lock className="h-2.5 w-2.5" />
              Market Closed (Wknd)
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9.5px] font-extrabold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono tracking-wider uppercase whitespace-nowrap shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping"></span>
            Funding Open
          </span>
        );
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9.5px] font-extrabold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono tracking-wider uppercase whitespace-nowrap shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Active Trade
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9.5px] font-extrabold rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-mono tracking-wider uppercase whitespace-nowrap shrink-0">
            ✓ Settled
          </span>
        );
      case "REFUNDED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9.5px] font-extrabold rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 font-mono tracking-wider uppercase whitespace-nowrap shrink-0">
            ✕ Refunded
          </span>
        );
      default:
        return null;
    }
  };

  const getRiskBadge = () => {
    const risk = pool.riskLevel || (pool.isFreePool ? "NO_RISK" : "HIGH");
    if (risk === "NO_RISK") {
      return (
        <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 font-black text-[8.5px] px-1.5 py-0.2 rounded uppercase tracking-wider shrink-0 flex items-center gap-0.5">
          <ShieldCheck className="h-2.5 w-2.5" />
          No Risk
        </span>
      );
    }
    if (risk === "LOW") {
      return (
        <span className="bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-700/60 font-black text-[8.5px] px-1.5 py-0.2 rounded uppercase tracking-wider shrink-0 flex items-center gap-0.5">
          <Shield className="h-2.5 w-2.5" />
          Low Risk
        </span>
      );
    }
    if (risk === "MEDIUM") {
      return (
        <span className="bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 font-black text-[8.5px] px-1.5 py-0.2 rounded uppercase tracking-wider shrink-0 flex items-center gap-0.5">
          <AlertTriangle className="h-2.5 w-2.5" />
          Med Risk
        </span>
      );
    }
    return (
      <span className="bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700/60 font-black text-[8.5px] px-1.5 py-0.2 rounded uppercase tracking-wider shrink-0 flex items-center gap-0.5">
        <Zap className="h-2.5 w-2.5" />
        High Risk
      </span>
    );
  };

  const totalCollected = pool.totalCollected;
  const targetAmount = pool.targetAmount;
  const progressPercent = pool.isFreePool 
    ? Math.min(100, (pool.participantsCount / pool.maxParticipants) * 100) 
    : Math.min(100, (totalCollected / (targetAmount || 1)) * 100);
  const remainingAmount = pool.isFreePool ? 0 : Math.max(0, targetAmount - totalCollected);
  const isUserParticipating = currentUser ? !!pool.participants[currentUser.id] : false;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Determine current user's profile info
  const userAvailable = currentUser ? (currentUser.availableBalance ?? currentUser.balance) : 0;

  return (
    <div
      id={`pool-card-${pool.id}`}
      className="bg-white dark:bg-slate-900 rounded-none border-0 border-b border-slate-200 dark:border-slate-800 shadow-none transition-all duration-150 overflow-hidden flex flex-col w-full"
    >
      {/* Dream11-style Full Display Main Card Header */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 sm:p-5 bg-gradient-to-b from-white to-slate-50/60 dark:from-slate-900 dark:to-slate-950/80 cursor-pointer select-none hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors"
      >
        {/* Top bar: Asset Pair, Direction Badge, Pool ID, Status */}
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wide shrink-0">
              #{pool.id}
            </span>
            {pool.isFreePool && (
              <span className="bg-indigo-600 text-white font-black text-[8.5px] px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 shadow-2xs">
                FREE POOL
              </span>
            )}
            <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 font-mono truncate">
              {pool.assetPair || "BTC / USDT"}
            </span>
            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-extrabold ${
              pool.tradeType === "CALL"
                ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60"
                : "bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200/60"
            }`}>
              {pool.tradeType === "CALL" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {pool.tradeType}
            </span>
            {getRiskBadge()}

            {/* BADA PROMINENT ROI BADGE IN TOP BAR */}
            <span className="bg-emerald-500/15 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 font-black text-xs sm:text-sm px-2 py-0.5 rounded-lg shrink-0 flex items-center gap-1 font-mono shadow-2xs">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              {pool.isFreePool ? `₹${pool.freeRewardAmount || 10} PRIZE` : `+${pool.expectedReturn ?? 15}% ROI`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            {getStatusBadge()}
          </div>
        </div>

        {/* Primary Figures Bar: Target Prize / PROMINENT ROI / Entry & Timer */}
        <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-slate-50/90 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl my-2.5">
          {/* Target / Raised */}
          <div className="flex flex-col justify-center px-1">
            <span className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {pool.isFreePool ? "Prize Pool" : "Target Pool"}
            </span>
            <span className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 font-mono leading-tight">
              {pool.isFreePool ? `₹${pool.freeRewardAmount || 10}` : `₹${targetAmount}`}
            </span>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold block font-mono mt-0.5 truncate">
              {pool.isFreePool ? "Sponsored" : `Raised ₹${totalCollected}`}
            </span>
          </div>

          {/* EXPECTED ROI - BADA HIGH VISIBILITY BOX */}
          <div className="bg-emerald-500/10 dark:bg-emerald-950/80 border-2 border-emerald-500/50 dark:border-emerald-500/70 rounded-xl py-1.5 px-2 flex flex-col items-center justify-center text-center shadow-xs">
            <span className="text-[8.5px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3 text-emerald-500 shrink-0" />
              EXPECTED ROI
            </span>
            <span className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono leading-none tracking-tight my-0.5 drop-shadow-2xs">
              {pool.isFreePool ? `₹${pool.freeRewardAmount || 10}` : `+${pool.expectedReturn ?? 15}%`}
            </span>
            <span className="text-[8px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-tight">
              {pool.isFreePool ? "CASH REWARD" : "PROFIT RETURN"}
            </span>
          </div>

          {/* Entry & Timer */}
          <div className="flex flex-col justify-center items-end px-1">
            <span className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {pool.isFreePool ? "Entry Fee" : "Min Entry"}
            </span>
            <span className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 font-mono leading-tight">
              {pool.isFreePool ? "FREE (₹0)" : `₹${pool.minContribution}`}
            </span>
            {pool.status === "WAITING" ? (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold font-mono text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/50 px-1.5 py-0.5 rounded mt-0.5 border border-amber-200/60">
                <Clock className="h-2.5 w-2.5 animate-spin-slow text-amber-600 shrink-0" />
                {timeLeft > 0 ? formatTime(timeLeft) : "Expiring..."}
              </span>
            ) : (
              <span className="text-[9px] font-mono text-slate-400 font-semibold">
                {pool.scheduledExecutionTime || "Scheduled"}
              </span>
            )}
          </div>
        </div>

        {/* Compact Progress Bar */}
        <div className="mt-2.5">
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden relative border border-slate-200/50 dark:border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                pool.status === "ACTIVE"
                  ? "bg-indigo-600 dark:bg-indigo-500"
                  : pool.status === "COMPLETED"
                  ? "bg-emerald-500 dark:bg-emerald-400"
                  : pool.status === "REFUNDED"
                  ? "bg-slate-300 dark:bg-slate-700"
                  : "bg-amber-500 dark:bg-amber-400"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            <span className="flex items-center gap-1 font-mono">
              <Users className="h-3 w-3 text-slate-400 shrink-0" />
              <strong className="text-slate-800 dark:text-slate-200 font-bold">{pool.participantsCount}</strong> / {pool.maxParticipants} slots
            </span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-extrabold">
              {progressPercent.toFixed(0)}% Filled
            </span>
          </div>
        </div>

        {/* Dropdown Action & Chevron Bar */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
            <span>{isExpanded ? "Full Display View (Active)" : "View Trade Details & Join Option"}</span>
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5 animate-bounce" />}
          </div>

          <div className="flex items-center gap-2">
            {isUserParticipating && (
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-extrabold px-2.5 py-0.5 rounded-md flex items-center gap-1 border border-emerald-200/50">
                <CheckCircle2 className="h-3 w-3" /> JOINED
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
            >
              <span>{isUserParticipating ? "Trade Status" : (isExpanded ? "Hide" : "Join Trade")}</span>
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content (Chart, Investment Form, Warnings & Contributors) */}
      {isExpanded && (
        <div className="border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 p-4 sm:p-5 flex flex-col gap-5 animate-fade-in">
          {/* Asset Trading Pair & Schedule Info Section */}
          <div className="bg-indigo-950/10 dark:bg-indigo-950/30 border border-indigo-100/60 dark:border-indigo-900/40 p-3 sm:p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-2xs shrink-0">
                <BarChart2 className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Investment Pair:
                  </span>
                  <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 font-mono">
                    {pool.assetPair || "BTC / USDT (Bitcoin)"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                  <Calendar className="h-3 w-3 text-amber-500 shrink-0" />
                  <span>Schedule: <strong className="text-slate-800 dark:text-slate-100">{pool.scheduledExecutionTime || "Today at 02:30 PM (5-Min Candle)"}</strong></span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsChartModalOpen(true)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <BarChart2 className="h-3.5 w-3.5 text-indigo-200" />
              <span>View Live TradingView Chart</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            </button>
          </div>

          {/* State Conditional Renderings */}
          {pool.status === "WAITING" && (
            <div className="pt-1 flex flex-col gap-4">
              {isUserParticipating && (
                <div id="participating-msg" className="bg-emerald-50/30 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200 rounded-xl py-4 px-3 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      {pool.isFreePool ? "You Joined the Free Pool!" : "Your Investment is Active in Pool!"}
                    </h4>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5 leading-relaxed font-medium">
                      {pool.isFreePool ? (
                        <>You successfully registered for this <strong>FREE trade pool</strong>. No entry fee was deducted. On win, you will receive a cash bonus of <strong className="font-mono text-indigo-600 dark:text-indigo-400">₹{pool.freeRewardAmount || 10}</strong> directly in your wallet.</>
                      ) : (
                        <>You currently have <strong className="font-mono text-emerald-700 dark:text-emerald-300">₹{pool.participants[currentUser?.id || ""].amount}</strong> invested ({(pool.participants[currentUser?.id || ""].sharePercentage).toFixed(1)}% pool share). You can add more funds below to increase your investment share in this pool.</>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {currentUser ? (
                (!isUserParticipating || (!pool.isFreePool && remainingAmount > 0)) && (
                <form onSubmit={handleJoin} className="bg-white dark:bg-slate-900 rounded-xl py-4 px-3 border border-slate-200/80 dark:border-slate-800 flex flex-col gap-3 shadow-2xs">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Coins className="h-3.5 w-3.5 text-indigo-500" />
                      {isUserParticipating ? "Add More Funds / Increase Share" : (pool.isFreePool ? "Join Sponsor Promo Pool" : "Secure Your Fractional Share")}
                    </label>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold font-mono">
                      {pool.isFreePool ? "Entry: Free (₹0)" : `Remaining Target: ₹${remainingAmount}`}
                    </span>
                  </div>

                  {/* DYNAMIC RISK LEVEL ALERT BOX */}
                  {(() => {
                    const rLevel = pool.riskLevel || (pool.isFreePool ? "NO_RISK" : "HIGH");
                    if (rLevel === "NO_RISK") {
                      return (
                        <div className="py-3 px-2 bg-emerald-500/5 dark:bg-emerald-950/30 border-l-4 border-l-emerald-500 border border-emerald-200/80 dark:border-emerald-900/50 rounded-r-xl flex items-start gap-3 shadow-2xs">
                          <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0 mt-0.5">
                            <ShieldCheck className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 font-mono">
                              Zero Risk Pool (0% Capital Loss Risk)
                            </span>
                            <p className="text-[10.5px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                              {pool.isFreePool ? (
                                <>Entry is <strong className="text-emerald-600 font-extrabold">FREE (₹0)</strong>. On win, receive <strong className="font-extrabold font-mono text-indigo-600 dark:text-indigo-400">₹{pool.freeRewardAmount || 10}</strong> reward. Zero financial risk!</>
                              ) : (
                                <>This pool has <strong className="text-emerald-600 font-extrabold">100% Capital Protection / No Risk</strong>. Target return: <strong className="font-extrabold font-mono text-indigo-600 dark:text-indigo-400">+{pool.expectedReturn ?? 15}% ROI</strong>.</>
                              )}
                            </p>
                            <p className="text-[10px] text-emerald-700 dark:text-emerald-400/90 leading-relaxed font-medium border-t border-emerald-200/50 dark:border-emerald-900/40 pt-1 mt-0.5">
                              🛡️ <strong>नो रिस्क चेतावनी:</strong> इस ट्रेड में आपके पैसे डूबने का 0% जोखिम है।
                            </p>
                          </div>
                        </div>
                      );
                    }
                    if (rLevel === "LOW") {
                      return (
                        <div className="py-3 px-2 bg-sky-500/5 dark:bg-sky-950/30 border-l-4 border-l-sky-500 border border-sky-200/80 dark:border-sky-900/50 rounded-r-xl flex items-start gap-3 shadow-2xs">
                          <div className="p-1.5 bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 rounded-lg shrink-0 mt-0.5">
                            <Shield className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-800 dark:text-sky-300 font-mono">
                              Low Risk Strategy Pool
                            </span>
                            <p className="text-[10.5px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                              Conservative volatility strategy with risk mitigation. Expected return: <strong className="font-extrabold font-mono text-indigo-600 dark:text-indigo-400">+{pool.expectedReturn ?? 15}% ROI</strong>.
                            </p>
                            <p className="text-[10px] text-sky-700 dark:text-sky-400/90 leading-relaxed font-medium border-t border-sky-200/50 dark:border-sky-900/40 pt-1 mt-0.5">
                              🟦 <strong>कम जोखिम:</strong> यह पूल संतुलित और कम रिस्क वाली ट्रेडिंग स्ट्रेटेजी पर आधारित है।
                            </p>
                          </div>
                        </div>
                      );
                    }
                    if (rLevel === "MEDIUM") {
                      return (
                        <div className="py-3 px-2 bg-amber-500/5 dark:bg-amber-950/30 border-l-4 border-l-amber-500 border border-amber-200/80 dark:border-amber-900/50 rounded-r-xl flex items-start gap-3 shadow-2xs">
                          <div className="p-1.5 bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 rounded-lg shrink-0 mt-0.5">
                            <AlertTriangle className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300 font-mono">
                              Medium Risk Pool
                            </span>
                            <p className="text-[10.5px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                              Balanced market risk & volatility level. Expected return: <strong className="font-extrabold font-mono text-indigo-600 dark:text-indigo-400">+{pool.expectedReturn ?? 15}% ROI</strong>.
                            </p>
                            <p className="text-[10px] text-amber-700 dark:text-amber-400/90 leading-relaxed font-medium border-t border-amber-200/50 dark:border-amber-900/40 pt-1 mt-0.5">
                              🟨 <strong>मध्यम जोखिम:</strong> इस ट्रेड में मध्यम मार्केट मूवमेंट और संतुलित रिस्क शामिल है।
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="py-3 px-2 bg-rose-500/5 dark:bg-rose-950/30 border-l-4 border-l-rose-500 border border-rose-200/80 dark:border-rose-900/50 rounded-r-xl flex items-start gap-3 shadow-2xs">
                        <div className="p-1.5 bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 rounded-lg shrink-0 mt-0.5">
                          <Zap className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-800 dark:text-rose-300 font-mono">
                            High-Risk Binary Outcome Disclosure
                          </span>
                          <p className="text-[10.5px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                            {pool.isFreePool ? (
                              <>This trade has a binary outcome. If direction succeeds, win <strong className="font-extrabold text-indigo-600 font-mono">₹{pool.freeRewardAmount || 10}</strong>. Sponsored promo — zero financial risk!</>
                            ) : (
                              <>All-or-nothing binary result. On win: <strong className="font-extrabold text-indigo-600 font-mono">+{pool.expectedReturn ?? 15}% ROI</strong>, on loss: <strong className="font-extrabold text-rose-600 uppercase">ZERO (100% loss)</strong>.</>
                            )}
                          </p>
                          <p className="text-[10px] text-rose-700 dark:text-rose-400/90 leading-relaxed font-medium border-t border-rose-200/50 dark:border-rose-900/40 pt-1 mt-0.5">
                            ⚡ <strong>उच्च जोखिम चेतावनी:</strong> आपका निवेश या तो उच्च मुनाफे में बदलेगा या शून्य (100% नुकसान) हो सकता है।
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Live Expected ROI & Profit Calculation Banner */}
                  {!pool.isFreePool && (
                    <div className="bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 dark:border-emerald-500/40 rounded-xl p-3 flex items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-500 text-white rounded-lg shadow-2xs shrink-0">
                          <TrendingUp className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300 tracking-wider block">
                            Expected Profit Return (ROI)
                          </span>
                          <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono leading-none">
                            +{pool.expectedReturn ?? 15}% ROI
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block uppercase">
                          Estimated Profit
                        </span>
                        <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                          +₹{(((parseInt(contribution) || 0) * (pool.expectedReturn ?? 15)) / 100).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Quick Preset Amount Chips for Paid Pools */}
                  {!pool.isFreePool && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Quick:</span>
                      {[
                        { label: `₹${pool.minContribution}`, val: pool.minContribution },
                        { label: "₹25", val: 25 },
                        { label: "₹50", val: 50 },
                        { label: `Max (₹${remainingAmount})`, val: remainingAmount }
                      ]
                        .filter((chip) => chip.val >= 1 && chip.val <= remainingAmount)
                        .map((chip, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setContribution(chip.val.toString())}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all shrink-0 cursor-pointer ${
                              contribution === chip.val.toString()
                                ? "bg-indigo-600 text-white shadow-2xs"
                                : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                            }`}
                          >
                            {chip.label}
                          </button>
                        ))}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    {pool.isFreePool ? (
                      <div className="flex-1 bg-indigo-50/50 dark:bg-indigo-950/20 px-3.5 py-2.5 border border-indigo-200/60 dark:border-indigo-900/40 rounded-xl flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-400">
                        <span>Sponsor Entry Fee:</span>
                        <span className="font-mono font-extrabold text-sm text-indigo-600 dark:text-indigo-400">₹0 (FREE)</span>
                      </div>
                    ) : (
                      <div className="relative flex-1">
                        <span className="absolute left-3.5 top-2.5 text-slate-400 dark:text-slate-500 font-mono text-sm font-bold">₹</span>
                        <input
                          id="contribution-amount-input"
                          type="number"
                          min={1}
                          max={remainingAmount}
                          value={contribution}
                          onChange={(e) => setContribution(e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
                          placeholder={isUserParticipating ? "Add amount e.g. ₹50" : `Min ₹${pool.minContribution}`}
                        />
                      </div>
                    )}
                    <button
                      id="join-trade-btn"
                      type="submit"
                      disabled={isJoining || !riskAcknowledged || !isMarketOpen}
                      className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-indigo-500/20 transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isJoining ? (
                        <span className="flex items-center gap-1.5">
                          <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          {isUserParticipating ? "Adding Funds..." : "Registering..."}
                        </span>
                      ) : !isMarketOpen ? (
                        <span className="flex items-center gap-1">
                          <Lock className="h-3.5 w-3.5" />
                          Market Closed (Wknd)
                        </span>
                      ) : !riskAcknowledged ? (
                        "Acknowledge Risk first"
                      ) : pool.isFreePool ? (
                        "Join FREE Pool"
                      ) : isUserParticipating ? (
                        `Add More Funds (+₹${contribution})`
                      ) : (
                        "Invest in Pool"
                      )}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  {!isMarketOpen && (
                    <div className="mt-1 p-3 rounded-xl bg-amber-500/10 dark:bg-amber-950/30 text-slate-800 dark:text-slate-200 text-xs border border-amber-500/25 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-amber-950 dark:text-amber-200 font-bold">
                        <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>{pool.assetPair} is Currently Closed</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                        The market is closed for the weekend. Trading will automatically resume when the market reopens.
                      </p>
                      <div className="text-[11px] font-mono font-medium text-amber-900 dark:text-amber-300">
                        Next Opening: <strong className="font-bold">{poolMarketStatus.nextOpenTime || "Sunday 21:00 UTC"}</strong>
                      </div>
                    </div>
                  )}

                  {/* Risk Acknowledgment Checkbox */}
                  <div className="flex items-start gap-2 bg-slate-100/50 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-200/40 dark:border-slate-800/40">
                    <input
                      id="risk-acknowledge-checkbox"
                      type="checkbox"
                      checked={riskAcknowledged}
                      onChange={(e) => setRiskAcknowledged(e.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 text-indigo-600 border-slate-300 dark:border-slate-700 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="risk-acknowledge-checkbox" className="text-[10px] text-slate-650 dark:text-slate-350 leading-tight font-bold select-none cursor-pointer">
                      {pool.isFreePool ? (
                        <>I understand that I will win <span className="text-indigo-650 dark:text-indigo-400 font-extrabold">₹{pool.freeRewardAmount || 10}</span> cash if the outlook succeeds, or get <span className="text-red-650 dark:text-red-400 font-extrabold uppercase">ZERO (₹0)</span> reward if it fails.</>
                      ) : (
                        <>I understand that this investment will either win or go to <span className="text-red-650 dark:text-red-400 font-extrabold uppercase">ZERO (100% Loss)</span>. I accept this high risk.</>
                      )}
                      <span className="block text-[9px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                        {pool.isFreePool 
                          ? "(मैं समझता हूँ कि मुनाफे पर मुझे इनाम मिलेगा और घाटे पर ₹0 मिलेगा, मेरा कोई नुकसान नहीं होगा।)"
                          : "(मैं समझता हूँ कि मेरा निवेश या तो जीतेगा या पूरी तरह से शून्य होगा।)"}
                      </span>
                    </label>
                  </div>

                  {!pool.isFreePool && userAvailable < (isUserParticipating ? 1 : pool.minContribution) && (
                    <div className="mt-1 flex items-center gap-1.5 p-2 rounded bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-[10px] leading-snug border border-amber-100/50">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Your available balance (₹{userAvailable.toFixed(2)}) is below the required contribution. Please deposit funds first.</span>
                    </div>
                  )}

                  {joinError && (
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1.5 mt-0.5">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {joinError}
                    </p>
                  )}
                </form>
                )
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic text-center py-2">
                  Please select or log in to a profile to join this pool.
                </p>
              )}
            </div>
          )}          {pool.status === "ACTIVE" && (
            <div className="bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-100/60 dark:border-indigo-900/40 rounded-xl py-5 px-4 flex flex-col gap-3 items-center text-center">
              <div className="p-3 bg-indigo-100/60 dark:bg-indigo-950/60 rounded-full">
                <TrendingUp className="h-6 w-6 text-indigo-600 dark:text-indigo-400 animate-bounce" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-display">
                  Trade Currently Executing In Real Time
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mt-1 leading-relaxed">
                  The full ₹{pool.targetAmount} funding target was collected. The active trade is in progress on the live market. Use the Admin panel below to settle this trade with profit or loss.
                </p>
              </div>
            </div>
          )}

          {pool.status === "COMPLETED" && pool.outcome && (
            <div className={`rounded-xl py-5 px-4 border flex flex-col gap-4 ${
              pool.outcome.isProfit 
                ? "bg-emerald-50/10 dark:bg-emerald-950/10 border-emerald-100/60 dark:border-emerald-900/60" 
                : "bg-rose-50/10 dark:bg-rose-950/10 border-rose-100/60 dark:border-rose-900/60"
            }`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Trade Outcome Result
                </div>
                <span className={`flex items-center gap-1 text-xs font-bold font-mono px-2.5 py-0.5 rounded-full ${
                  pool.outcome.isProfit 
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400" 
                    : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400"
                }`}>
                  {pool.outcome.isProfit ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  {pool.outcome.isProfit ? "+" : ""}{pool.outcome.percentageChange.toFixed(1)}%
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block uppercase">Total Profit/Loss Distributed</span>
                  <span className={`text-2xl font-black font-mono ${
                    pool.outcome.isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}>
                    {pool.outcome.isProfit ? "+₹" : "-₹"}{Math.abs(pool.outcome.profitOrLoss).toFixed(2)}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">SETTLED ON</span>
                  <span className="text-xs font-medium font-mono text-slate-500 dark:text-slate-400">
                    {new Date(pool.outcome.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {pool.status === "REFUNDED" && (
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 rounded-xl py-5 px-4 flex flex-col gap-3 items-center text-center">
              <div className="p-2.5 bg-slate-100 dark:bg-slate-900 rounded-full">
                <AlertCircle className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {pool.canceledByAdmin ? "Trade Canceled by Admin" : "Funding Time Limit Reached"}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mt-0.5 leading-relaxed">
                  {pool.canceledByAdmin 
                    ? "This trade pool was cancelled by an Administrator. All contributions have been fully returned back to user wallets."
                    : "The trade pool did not raise ₹" + pool.targetAmount + " before the countdown timer expired. All contributions have been fully refunded back to user wallets automatically."}
                </p>
              </div>
            </div>
          )}

          {/* Participant List */}
          <div className="border-t border-slate-200/60 dark:border-slate-800 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center justify-between">
              <span>Pool Contributors ({pool.participantsCount})</span>
              <span className="font-mono text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold">
                Minimum Entry: ₹{pool.minContribution}
              </span>
            </h4>

            {pool.participantsCount === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-4 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                No contributions yet. Be the first to secure a share!
              </p>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200/60 dark:border-slate-800">
                      <th className="px-3 py-2.5">Contributor</th>
                      <th className="px-3 py-2.5 text-right">Investment</th>
                      <th className="px-3 py-2.5 text-right">Share (%)</th>
                      {pool.status === "COMPLETED" && (
                        <th className="px-3 py-2.5 text-right text-indigo-600 dark:text-indigo-400 font-bold">Payout</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60 dark:divide-slate-800/40 font-mono text-slate-700 dark:text-slate-300">
                    {Object.values(pool.participants).map((p: Participant) => {
                      const isSelf = currentUser && p.userId === currentUser.id;
                      return (
                        <tr key={p.userId} className={isSelf ? "bg-indigo-50/30 dark:bg-indigo-950/20 font-bold" : ""}>
                          <td className="px-3 py-2.5 text-slate-800 dark:text-slate-200 font-sans flex items-center gap-1.5 truncate">
                            <span className="truncate max-w-[130px] font-semibold text-slate-900 dark:text-slate-100" title={getParticipantDisplayName(p, currentUser, allUsers)}>
                              {getParticipantDisplayName(p, currentUser, allUsers)}
                            </span>
                            {isSelf && <span className="text-[9px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded uppercase font-extrabold">You</span>}
                          </td>
                          <td className="px-3 py-2.5 text-right">₹{p.amount}</td>
                          <td className="px-3 py-2.5 text-right">{p.sharePercentage.toFixed(1)}%</td>
                          {pool.status === "COMPLETED" && pool.outcome && (
                            <td className="px-3 py-2.5 text-right text-slate-900 dark:text-slate-100 font-extrabold">
                              ₹{(pool.outcome.payouts[p.userId] || 0).toFixed(2)}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TradingView Live Chart Modal */}
      <TradingViewChartModal
        isOpen={isChartModalOpen}
        onClose={() => setIsChartModalOpen(false)}
        assetPair={pool.assetPair || "BTC / USDT (Bitcoin)"}
        tradingSymbol={pool.tradingSymbol || "BINANCE:BTCUSDT"}
        tradeType={pool.tradeType}
        scheduledExecutionTime={pool.scheduledExecutionTime}
        timeframe={pool.timeframe || "5M"}
        pool={pool}
        currentUser={currentUser}
        onJoinSuccess={onJoinSuccess}
      />
    </div>
  );
};
