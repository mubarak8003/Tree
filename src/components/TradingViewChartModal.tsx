import React, { useState } from "react";
import { 
  X, 
  ExternalLink, 
  Maximize2, 
  Minimize2, 
  TrendingUp, 
  RefreshCw,
  Clock,
  Sparkles,
  BarChart2,
  CheckCircle2,
  AlertCircle,
  Coins,
  ShieldCheck,
  Zap
} from "lucide-react";
import { TradePool, UserProfile } from "../types";
import { joinTradePool, sanitizeErrorMessage } from "../firebaseService";

interface TradingViewChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetPair?: string;
  tradingSymbol?: string;
  tradeType?: "CALL" | "PUT";
  scheduledExecutionTime?: string;
  timeframe?: string;
  pool?: TradePool;
  currentUser?: UserProfile | null;
  onJoinSuccess?: () => void;
}

export const TradingViewChartModal: React.FC<TradingViewChartModalProps> = ({
  isOpen,
  onClose,
  assetPair = "BTC / USDT (Bitcoin)",
  tradingSymbol = "BINANCE:BTCUSDT",
  tradeType = "CALL",
  scheduledExecutionTime,
  timeframe = "5M",
  pool,
  currentUser,
  onJoinSuccess
}) => {
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Trade placement state inside chart modal
  const minAmt = pool ? pool.minContribution.toString() : "100";
  const [tradeAmount, setTradeAmount] = useState<string>(minAmt);
  const [riskConfirmed, setRiskConfirmed] = useState(false);
  const [isPlacingTrade, setIsPlacingTrade] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  // Format symbol for TradingView iframe embed url
  const cleanSymbol = encodeURIComponent(tradingSymbol);
  const iframeUrl = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=${cleanSymbol}&interval=5&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=1e222d&studies=[]&theme=dark&style=1&timezone=Etc%2FUTC&locale=en`;

  const isUserParticipating = (pool && currentUser) ? !!pool.participants[currentUser.id] : false;
  const isPoolWaiting = pool ? pool.status === "WAITING" : false;

  const handlePlaceTradeFromChart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pool || !currentUser) return;
    setTradeError(null);
    setTradeSuccess(null);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setTradeError("⚠️ Internet Disconnected! Please check your internet connection to place trades.");
      return;
    }

    if (!riskConfirmed) {
      setTradeError("Please tick the risk acknowledgement box before placing trade.");
      return;
    }

    const amt = pool.isFreePool ? 0 : parseInt(tradeAmount);
    if (!pool.isFreePool) {
      if (isNaN(amt) || amt <= 0) {
        setTradeError("Please enter a valid trade amount.");
        return;
      }
      const avail = currentUser.availableBalance ?? currentUser.balance;
      if (amt > avail) {
        setTradeError(`Insufficient Available Balance (₹${avail.toFixed(2)}).`);
        return;
      }
    }

    setIsPlacingTrade(true);
    try {
      await joinTradePool(pool.id, currentUser.id, amt);
      setTradeSuccess(`Trade placed successfully on ${pool.symbol}!`);
      setRiskConfirmed(false);
      if (onJoinSuccess) onJoinSuccess();
    } catch (err: any) {
      setTradeError(sanitizeErrorMessage(err, "Failed to place trade."));
    } finally {
      setIsPlacingTrade(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className={`relative bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 my-auto ${
        isFullWidth ? "w-full h-[98vh]" : "w-full max-w-5xl h-[92vh] sm:h-[88vh]"
      }`}>
        
        {/* Header Bar */}
        <div className="p-3 sm:p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 sm:p-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-xl shrink-0">
              <BarChart2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="text-xs sm:text-base font-bold text-white font-display truncate">
                  Live Chart: <span className="text-indigo-400 font-mono">{assetPair}</span>
                </h3>
                <span className={`px-1.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold rounded uppercase font-mono shrink-0 ${
                  tradeType === "CALL" 
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" 
                    : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                }`}>
                  {tradeType}
                </span>
                <span className="bg-slate-800 text-slate-300 text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-700 shrink-0 hidden sm:inline">
                  {timeframe}
                </span>
              </div>

              {scheduledExecutionTime && (
                <div className="flex items-center gap-1 mt-0.5 text-[10px] sm:text-[11px] text-amber-400 font-medium truncate">
                  <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                  <span className="truncate">Exec: <strong>{scheduledExecutionTime}</strong></span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setRefreshKey(prev => prev + 1)}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              title="Refresh Live Chart"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsFullWidth(!isFullWidth)}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer hidden sm:block"
              title={isFullWidth ? "Standard Size" : "Full Screen"}
            >
              {isFullWidth ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Chart Frame */}
        <div className="flex-1 bg-slate-950 relative overflow-hidden min-h-[280px]">
          <iframe
            key={refreshKey}
            title={`TradingView Live Chart - ${assetPair}`}
            src={iframeUrl}
            className="w-full h-full border-none"
            allowFullScreen
          />
        </div>

        {/* Direct Trade Placement Bar inside Chart Modal */}
        {pool && currentUser && isPoolWaiting && (
          <div className="p-3 bg-slate-950 border-t border-slate-800 shrink-0">
            <form onSubmit={handlePlaceTradeFromChart} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400 animate-pulse shrink-0" />
                  <span className="font-bold text-white text-xs">Place Trade Directly from Live Chart</span>
                  {isUserParticipating && (
                    <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                      ✓ Joined
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  Available Bal: <strong className="text-emerald-400 font-extrabold">₹{(currentUser ? (currentUser.availableBalance ?? currentUser.balance ?? 0) : 0).toFixed(2)}</strong>
                </div>
              </div>

              {tradeError && (
                <div className="p-2 bg-rose-950/60 border border-rose-800 text-rose-300 text-[11px] font-semibold rounded-lg flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                  <span>{tradeError}</span>
                </div>
              )}

              {tradeSuccess && (
                <div className="p-2 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-[11px] font-semibold rounded-lg flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>{tradeSuccess}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {!pool.isFreePool ? (
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-2.5 text-slate-500 font-mono text-xs font-bold">₹</span>
                      <input
                        type="number"
                        min={pool.minContribution}
                        value={tradeAmount}
                        onChange={(e) => setTradeAmount(e.target.value)}
                        placeholder={`Min ₹${pool.minContribution}`}
                        className="w-full pl-7 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {[100, 500, 1000].map((quickAmt) => (
                        <button
                          key={quickAmt}
                          type="button"
                          onClick={() => setTradeAmount(quickAmt.toString())}
                          className="px-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold font-mono transition-colors cursor-pointer"
                        >
                          +₹{quickAmt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800 px-3 py-2 rounded-xl flex-1">
                    Free Entry Trade (₹0 Fee)
                  </div>
                )}

                <label className="flex items-center gap-1.5 text-[10.5px] text-slate-400 cursor-pointer select-none shrink-0 py-1 sm:py-0">
                  <input
                    type="checkbox"
                    checked={riskConfirmed}
                    onChange={(e) => setRiskConfirmed(e.target.checked)}
                    className="accent-indigo-500 h-3.5 w-3.5 rounded cursor-pointer"
                  />
                  <span>Confirm Trade Risk</span>
                </label>

                <button
                  type="submit"
                  disabled={isPlacingTrade}
                  className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-extrabold rounded-xl transition-all shadow-md cursor-pointer shrink-0 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>{isPlacingTrade ? "Executing..." : (isUserParticipating ? "Add More Funds" : "Place Trade Now")}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Footer info bar */}
        <div className="p-2.5 sm:p-3 bg-slate-950/90 border-t border-slate-800 text-[10px] sm:text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="truncate">TradingView Realtime Stream Connected</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-[10px] text-slate-500 hidden sm:inline">
              Symbol: <code className="text-slate-300 font-mono">{tradingSymbol}</code>
            </span>
            <a
              href={`https://www.tradingview.com/symbols/${tradingSymbol.replace(":", "-")}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:underline flex items-center gap-1 font-bold text-[10px] sm:text-[11px]"
            >
              TradingView <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};

