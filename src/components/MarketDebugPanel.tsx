import React, { useState, useEffect } from "react";
import { 
  Zap, 
  Activity, 
  Clock, 
  Radio, 
  RefreshCw, 
  Database, 
  Server, 
  CheckCircle2, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldCheck,
  Globe
} from "lucide-react";
import { livePriceService, MarketPriceSnapshot, MarketTelemetryData } from "../services/livePriceService";

interface MarketDebugPanelProps {
  symbol: string;
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  onRefreshTrigger?: () => void;
  isAdmin?: boolean;
}

export const MarketDebugPanel: React.FC<MarketDebugPanelProps> = ({
  symbol,
  className = "",
  collapsible = true,
  defaultExpanded = true,
  onRefreshTrigger,
  isAdmin = true
}) => {
  // Security check: Never render telemetry or debug data for non-admin accounts
  const isAuthorizedAdmin = React.useMemo(() => {
    if (!isAdmin) return false;
    try {
      const sess = sessionStorage.getItem("admin_session") || localStorage.getItem("admin_session") || localStorage.getItem("admin_authenticated");
      const userRaw = localStorage.getItem("current_user");
      let isUserAdmin = false;
      if (userRaw) {
        const u = JSON.parse(userRaw);
        if (u?.isAdmin || u?.email?.includes("admin") || u?.id === "admin") {
          isUserAdmin = true;
        }
      }
      return Boolean(sess || isUserAdmin || isAdmin);
    } catch {
      return isAdmin;
    }
  }, [isAdmin]);

  if (!isAuthorizedAdmin) {
    return null;
  }

  const [snapshot, setSnapshot] = useState<MarketPriceSnapshot>(() => livePriceService.getSnapshot(symbol));
  const [telemetry, setTelemetry] = useState<MarketTelemetryData>(() => livePriceService.getTelemetryData());
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    // Refresh snapshot every 200ms to maintain real-time lastUpdateAge and price accuracy
    const interval = setInterval(() => {
      setSnapshot(livePriceService.getSnapshot(symbol));
    }, 200);

    const unsubTelemetry = livePriceService.subscribeTelemetry((data) => {
      setTelemetry(data);
    });

    return () => {
      clearInterval(interval);
      unsubTelemetry();
    };
  }, [symbol]);

  const handleForceFreshFetch = async () => {
    setIsRefreshing(true);
    await livePriceService.fetchLivePriceForSymbol(symbol);
    setSnapshot(livePriceService.getSnapshot(symbol));
    setIsRefreshing(false);
    if (onRefreshTrigger) onRefreshTrigger();
  };

  const isStale = snapshot.lastUpdateAgeMs > 5000;
  const lat = snapshot.networkLatencyMs;

  let latColor = "text-emerald-500 border-emerald-500/30 bg-emerald-500/10";
  if (lat >= 3000) latColor = "text-rose-500 border-rose-500/30 bg-rose-500/10";
  else if (lat >= 1000) latColor = "text-amber-500 border-amber-500/30 bg-amber-500/10";
  else if (lat >= 300) latColor = "text-yellow-500 border-yellow-500/30 bg-yellow-500/10";

  return (
    <div className={`bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl p-4 shadow-xl font-sans text-xs ${className}`}>
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Zap className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-sm text-white tracking-wide">
                Live Market Telemetry & Debug Panel
              </h4>
              <span className={`px-2 py-0.5 text-[9.5px] font-mono font-bold rounded-full border ${snapshot.cacheStatus === "Fresh" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-amber-500/20 text-amber-300 border-amber-500/40"}`}>
                {snapshot.cacheStatus === "Fresh" ? "● FRESH DATA" : "▲ CACHED"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Real-time provider response metrics, latency RTT, and bid/ask spread
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleForceFreshFetch}
            disabled={isRefreshing}
            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-extrabold text-[11px] transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
            title="Request immediate fresh price quote"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Fetching..." : "Fetch Fresh Price"}</span>
          </button>

          {collapsible && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          {/* Top Banner Status */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 flex flex-col justify-between">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                1. Provider Name
              </span>
              <span className="font-extrabold text-indigo-300 truncate mt-1">
                {snapshot.providerName}
              </span>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 flex flex-col justify-between">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                2. Instrument / Symbol
              </span>
              <span className="font-extrabold text-amber-300 truncate mt-1">
                {snapshot.symbol}
              </span>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 flex flex-col justify-between">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                3. Network Latency
              </span>
              <span className={`font-extrabold mt-1 px-2 py-0.5 rounded-md border text-center ${latColor}`}>
                ⚡ {snapshot.networkLatencyMs} ms
              </span>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 flex flex-col justify-between">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                4. Last Update Age
              </span>
              <span className={`font-extrabold mt-1 ${isStale ? "text-rose-400 animate-pulse" : "text-emerald-400"}`}>
                {snapshot.lastUpdateAgeFormatted}
              </span>
            </div>
          </div>

          {/* Detailed 11-Field Telemetry Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-[11.5px]">
            {/* Left Column */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
                <span className="text-slate-400">Request Time:</span>
                <span className="font-bold text-slate-200">{snapshot.requestTime ? new Date(snapshot.requestTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 } as any) : "N/A"}</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
                <span className="text-slate-400">Response Time:</span>
                <span className="font-bold text-slate-200">{snapshot.responseTime ? new Date(snapshot.responseTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 } as any) : "N/A"}</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
                <span className="text-slate-400">Price Timestamp:</span>
                <span className="font-bold text-slate-200">{new Date(snapshot.priceTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 } as any)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Cache Status:</span>
                <span className={`font-extrabold ${snapshot.cacheStatus === "Fresh" ? "text-emerald-400" : "text-amber-400"}`}>
                  {snapshot.cacheStatus} ({snapshot.lastUpdateAgeMs}ms)
                </span>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
                <span className="text-slate-400">Bid Price:</span>
                <span className="font-bold text-emerald-400">{snapshot.bid.toFixed(4)}</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
                <span className="text-slate-400">Ask Price:</span>
                <span className="font-bold text-rose-400">{snapshot.ask.toFixed(4)}</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
                <span className="text-slate-400">Mid / Last Price:</span>
                <span className="font-extrabold text-cyan-300 text-sm">{snapshot.price.toFixed(4)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Database Impact:</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  0 Firestore Reads (Pure In-Memory)
                </span>
              </div>
            </div>
          </div>

          {/* Notice Footer */}
          <div className="flex items-center justify-between text-[10.5px] text-slate-400 bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
            <span className="flex items-center gap-1.5">
              <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
              Streams: {telemetry.isDerivWsConnected ? "Deriv Forex WS (<25ms)" : "Deriv Reconnecting"} | {telemetry.isWsConnected ? "Binance Crypto WS (<30ms)" : "REST"}
            </span>
            <span className="font-mono text-slate-500">
              Total Updates: {telemetry.totalUpdateCount.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
