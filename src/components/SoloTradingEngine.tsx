import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Zap, 
  Lock, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  RotateCcw,
  BarChart2,
  ShieldCheck,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Info,
  Check,
  ChevronRight,
  ChevronLeft,
  Sliders,
  Search,
  RefreshCw,
  Maximize2,
  Minimize2,
  Wrench,
  Edit3,
  X
} from "lucide-react";
import { UserProfile, SoloTrade, SoloTradingConfig, getActiveDurationsForPairAndMode } from "../types";
import { 
  SUPPORTED_SOLO_ASSETS, 
  livePriceService, 
  MarketAsset, 
  MarketPriceSnapshot, 
  formatAssetPrice,
  getAssetMarketStatus,
  isAssetMarketOpen,
  MarketScheduleStatus
} from "../services/livePriceService";
import { placeSoloTrade, settleSoloTrade, saveLockedExitPrice, subscribeUserSoloTrades, saveSoloTradingConfig, sanitizeErrorMessage } from "../firebaseService";
import { QuotexProChart } from "./QuotexProChart";
import { LiveCandlePatternController } from "./LiveCandlePatternController";

interface SoloTradingEngineProps {
  currentUser: UserProfile | null;
  soloConfig: SoloTradingConfig;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  onTriggerNotification?: (msg: string, type: "success" | "info" | "error") => void;
  onUpdateProfile?: (updatedUser: UserProfile) => void;
}

export const SoloTradingEngine: React.FC<SoloTradingEngineProps> = ({
  currentUser,
  soloConfig,
  isDarkMode,
  onToggleTheme,
  onTriggerNotification,
  onUpdateProfile
}) => {
  // Single Unified Balance from currentUser (Firestore single source of truth)
  const availableBalance = currentUser ? (currentUser.availableBalance ?? currentUser.balance ?? 0) : 0;

  // Track internet connectivity status
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (onTriggerNotification) {
        onTriggerNotification("🟢 Internet Reconnected: Live price feed and balance synced.", "success");
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      if (onTriggerNotification) {
        onTriggerNotification("⚠️ Internet Disconnected: Trading disabled until internet connection is restored.", "error");
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [onTriggerNotification]);
  // Active Assets List (Admin Configured or Default)
  const activeAssets = (soloConfig.customAssets && soloConfig.customAssets.length > 0)
    ? soloConfig.customAssets
    : SUPPORTED_SOLO_ASSETS;

  // Selected Trading Asset
  const [selectedAsset, setSelectedAsset] = useState<MarketAsset>(activeAssets[0] || SUPPORTED_SOLO_ASSETS[0]);

  // Derived current asset from activeAssets list to ensure live sync with Admin updates
  const currentAsset = activeAssets.find(a => a.symbol === selectedAsset.symbol || a.pair === selectedAsset.pair) || activeAssets[0] || selectedAsset;

  // Market Schedule Status for Currently Selected Asset (Forex/Metals weekend close vs Crypto 24/7)
  const currentMarketStatus = useMemo(() => {
    return getAssetMarketStatus(currentAsset.symbol, currentAsset.category);
  }, [currentAsset.symbol, currentAsset.category]);
  const isCurrentMarketOpen = currentMarketStatus.isOpen;

  // Asset Search & Category Filter States
  const [assetSearchQuery, setAssetSearchQuery] = useState<string>("");
  const [selectedAssetCategory, setSelectedAssetCategory] = useState<string>("ALL");

  const filteredAssets = activeAssets.filter((asset) => {
    const q = assetSearchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      asset.pair.toLowerCase().includes(q) ||
      asset.symbol.toLowerCase().includes(q) ||
      asset.category.toLowerCase().includes(q);
    const matchesCat =
      selectedAssetCategory === "ALL" || asset.category === selectedAssetCategory;
    return matchesQuery && matchesCat;
  });

  // Sync assets with livePriceService and update selected asset when config updates
  useEffect(() => {
    livePriceService.setAssets(activeAssets);
    const matched = activeAssets.find(a => a.symbol === selectedAsset.symbol || a.pair === selectedAsset.pair);
    if (matched) {
      setSelectedAsset(matched);
    } else if (activeAssets.length > 0) {
      setSelectedAsset(activeAssets[0]);
    }
  }, [soloConfig.customAssets, soloConfig.defaultPayoutPercentage]);

  // Remembered Expiry Duration (persisted in localStorage)
  const [durationSeconds, setDurationSecondsState] = useState<number>(() => {
    const saved = localStorage.getItem("solo_last_duration");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return 30;
  });

  const setDurationSeconds = (dur: number) => {
    setDurationSecondsState(dur);
    try {
      localStorage.setItem("solo_last_duration", dur.toString());
    } catch (e) {
      console.error("Failed to save duration to localStorage:", e);
    }
  };
  const [isPatternControllerOpen, setIsPatternControllerOpen] = useState<boolean>(false);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [priceDirection, setPriceDirection] = useState<"up" | "down" | "neutral">("neutral");
  const prevPriceRef = useRef<number | null>(null);

  // Remembered Stake Amount (persisted in localStorage)
  const [stakeAmount, setStakeAmount] = useState<string>(() => {
    const saved = localStorage.getItem("solo_last_stake");
    if (saved && !isNaN(parseFloat(saved))) {
      return saved;
    }
    return soloConfig.minStake ? soloConfig.minStake.toString() : "100";
  });

  // Order Placement Form State
  const [tradeType, setTradeType] = useState<"CALL" | "PUT">("CALL");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [fastSubmittingType, setFastSubmittingType] = useState<"CALL" | "PUT" | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  // TradingView Chart Configuration States
  const [selectedInterval, setSelectedInterval] = useState<string>("1");
  const [isExpandedChart, setIsExpandedChart] = useState<boolean>(true);
  const [chartRefreshKey, setChartRefreshKey] = useState<number>(0);

  // Quick Admin Price Fix Modal States
  const isAdmin = currentUser?.role === "admin";
  const [isQuickFixModalOpen, setIsQuickFixModalOpen] = useState<boolean>(false);
  const [quickFixPriceInput, setQuickFixPriceInput] = useState<string>("");
  const [quickFixProtectedPayoutInput, setQuickFixProtectedPayoutInput] = useState<string>("");
  const [quickFixStandardPayoutInput, setQuickFixStandardPayoutInput] = useState<string>("");
  const [isSavingPriceFix, setIsSavingPriceFix] = useState<boolean>(false);

  const handleOpenQuickFixModal = () => {
    const curP = livePriceService.getPrice(currentAsset.symbol) || livePrices[currentAsset.symbol] || currentAsset.basePrice;
    setQuickFixPriceInput(curP.toString());
    const protP = currentAsset.protectedPayoutPercentage ?? soloConfig.protectedPayoutPercentage ?? 80;
    const stdP = currentAsset.standardPayoutPercentage ?? currentAsset.payoutPercentage ?? soloConfig.standardPayoutPercentage ?? soloConfig.defaultPayoutPercentage ?? 85;
    setQuickFixProtectedPayoutInput(protP.toString());
    setQuickFixStandardPayoutInput(stdP.toString());
    setIsQuickFixModalOpen(true);
  };

  const handleSaveQuickFixPrice = async (lockOverride: boolean = true) => {
    const newPriceVal = parseFloat(quickFixPriceInput);
    const newProtVal = parseInt(quickFixProtectedPayoutInput, 10);
    const newStdVal = parseInt(quickFixStandardPayoutInput, 10);

    if (isNaN(newPriceVal) || newPriceVal <= 0) {
      if (onTriggerNotification) onTriggerNotification("Please enter a valid price.", "error");
      return;
    }

    try {
      setIsSavingPriceFix(true);
      livePriceService.setPrice(currentAsset.symbol, newPriceVal, true);
      if (lockOverride) {
        livePriceService.setManualPriceOverride(currentAsset.symbol, newPriceVal);
      } else {
        livePriceService.setManualPriceOverride(currentAsset.symbol, null);
      }

      const updatedAssets = activeAssets.map((a) => {
        if (a.symbol === currentAsset.symbol) {
          return {
            ...a,
            basePrice: newPriceVal,
            protectedPayoutPercentage: !isNaN(newProtVal) && newProtVal > 0 ? newProtVal : a.protectedPayoutPercentage,
            standardPayoutPercentage: !isNaN(newStdVal) && newStdVal > 0 ? newStdVal : a.standardPayoutPercentage,
            payoutPercentage: !isNaN(newStdVal) && newStdVal > 0 ? newStdVal : a.payoutPercentage
          };
        }
        return a;
      });

      livePriceService.setAssets(updatedAssets);
      await saveSoloTradingConfig({ customAssets: updatedAssets });
      setIsQuickFixModalOpen(false);

      if (onTriggerNotification) {
        onTriggerNotification(`✅ Aligned pair ${currentAsset.pair} (Protected: ${newProtVal}%, Standard: ${newStdVal}%) @ ₹${newPriceVal}`, "success");
      }
    } catch (err: any) {
      if (onTriggerNotification) onTriggerNotification(`Failed to save price: ${err?.message}`, "error");
    } finally {
      setIsSavingPriceFix(false);
    }
  };

  // User Solo Trades
  const [userTrades, setUserTrades] = useState<SoloTrade[]>([]);
  const [historyFilter, setHistoryFilter] = useState<"ALL" | "WON" | "LOST" | "DRAW">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Pagination for Solo Trade History
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 8;

  // Track active countdown timers
  const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now());
  const settlingTradeIds = useRef<Set<string>>(new Set());

  // Save stake amount to localStorage
  const handleUpdateStake = (val: string) => {
    setStakeAmount(val);
    if (val && !isNaN(parseFloat(val))) {
      localStorage.setItem("solo_last_stake", val);
    }
  };

  // Subscribe to live price ticks
  useEffect(() => {
    const unsubscribe = livePriceService.subscribe((prices) => {
      setLivePrices(prices);
      const current = prices[selectedAsset.symbol];
      if (current && prevPriceRef.current !== null) {
        if (current > prevPriceRef.current) {
          setPriceDirection("up");
        } else if (current < prevPriceRef.current) {
          setPriceDirection("down");
        }
      }
      if (current) {
        prevPriceRef.current = current;
      }
    });
    return () => unsubscribe();
  }, [selectedAsset]);

  // Subscribe to user's solo trades with smart optimistic merging
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeUserSoloTrades(currentUser.id, (firestoreTrades) => {
      setUserTrades((prev) => {
        const tempRunning = prev.filter(
          t => t.id.startsWith("temp_") && t.status === "RUNNING" && new Date(t.endTime).getTime() > Date.now()
        );
        const merged = firestoreTrades.map((ft) => {
          // If trade was already settled locally (status !== "RUNNING"), keep local settled state if Firestore snapshot still says "RUNNING"
          // OR if Firestore fallback-settled it as DRAW with exit === entry, while local trade was genuinely WON or LOST with a real market exit tick
          const localMatch = prev.find((p) => p.id === ft.id);
          if (localMatch && localMatch.status !== "RUNNING") {
            if (ft.status === "RUNNING") {
              return localMatch;
            }
            if (
              ft.status === "DRAW" &&
              (localMatch.status === "WON" || localMatch.status === "LOST") &&
              typeof localMatch.exitPrice === "number" &&
              localMatch.exitPrice !== localMatch.entryPrice
            ) {
              return localMatch;
            }
          }

          const tempMatch = tempRunning.find(
            temp => temp.tradingSymbol === ft.tradingSymbol &&
                    temp.tradeType === ft.tradeType &&
                    temp.stake === ft.stake &&
                    Math.abs(new Date(ft.startTime).getTime() - new Date(temp.startTime).getTime()) < 5000
          );
          if (tempMatch && ft.status === "RUNNING") {
            return {
              ...ft,
              startTime: tempMatch.startTime,
              endTime: tempMatch.endTime
            };
          }
          return ft;
        });

        tempRunning.forEach((temp) => {
          const matched = firestoreTrades.some(
            ft => ft.tradingSymbol === temp.tradingSymbol &&
                  ft.tradeType === temp.tradeType &&
                  ft.stake === temp.stake &&
                  Math.abs(new Date(ft.startTime).getTime() - new Date(temp.startTime).getTime()) < 5000
          );
          if (!matched) {
            merged.unshift(temp);
          }
        });
        return merged.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      });
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Real-time interval for timer countdowns (100ms tick for ultra-smooth 60fps progress bar & seconds rendering)
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Auto-settle running trades INSTANTLY when countdown reaches 0s (0ms UI latency for live online feeds; waits for server authoritative settler if offline)
  useEffect(() => {
    userTrades.forEach((trade) => {
      if (trade.status === "RUNNING") {
        const endTime = new Date(trade.endTime).getTime();
        if (nowTimestamp >= endTime && !settlingTradeIds.current.has(trade.id)) {
          const isOnline = typeof navigator === "undefined" || navigator.onLine;
          const isFresh = livePriceService.isPriceFresh(trade.tradingSymbol);

          // Anti-Cheat / Anti-Offline Exploit:
          // If device is offline or price feed is frozen/stale, DO NOT lock in a stale local winning price.
          // The 24/7 Server-side settler (server.ts) will settle the trade directly with real interbank market rates.
          if (!isOnline || !isFresh) {
            console.log(`[Offline / Stale Guard] Trade ${trade.id} reached expiry but device is offline or price is stale. Deferring to 24/7 Authoritative Server Settler...`);
            return;
          }

          settlingTradeIds.current.add(trade.id);

          const currentExitPrice = trade.exitPrice || livePriceService.getPrice(trade.tradingSymbol) || livePrices[trade.tradingSymbol] || trade.entryPrice;
          
          // Lock exact exit price in persistent storage immediately at expiry moment
          saveLockedExitPrice(trade.id, currentExitPrice);
          
          // Determine outcome immediately
          const entry = trade.entryPrice;
          const exit = currentExitPrice;
          let outcome: "WON" | "LOST" | "DRAW" = "LOST";
          let profitOrLoss = -trade.stake;
          let payout = 0;
          let isWin = false;
          let isDraw = false;

          if (trade.tradeType === "CALL") {
            if (exit > entry) isWin = true;
            else if (exit === entry) isDraw = true;
          } else {
            // PUT
            if (exit < entry) isWin = true;
            else if (exit === entry) isDraw = true;
          }

          if (isWin) {
            outcome = "WON";
            const profit = (trade.stake * trade.payoutPercentage) / 100;
            payout = trade.stake + profit;
            profitOrLoss = profit;
          } else if (isDraw && trade.drawRule === "REFUND") {
            outcome = "DRAW";
            payout = trade.stake;
            profitOrLoss = 0;
          } else {
            outcome = "LOST";
            payout = 0;
            profitOrLoss = -trade.stake;
          }

          const settledIso = new Date().toISOString();

          // 1. INSTANTLY update state in 0ms (trade immediately disappears from active trades to history)
          setUserTrades((prev) => {
            const updated = prev.map((t) =>
              t.id === trade.id
                ? {
                    ...t,
                    status: outcome,
                    exitPrice: currentExitPrice,
                    profitOrLoss,
                    settledAt: settledIso,
                  }
                : t
            );
            if (currentUser?.id) {
              try {
                localStorage.setItem(`solo_trades_${currentUser.id}`, JSON.stringify(updated));
              } catch {}
            }
            return updated;
          });

          // 2. Settlement payout is handled atomically by Firestore transaction in settleSoloTrade(),
          // which triggers the real-time onSnapshot listener in App.tsx to update currentUser.
          // Trigger outcome notification:

          if (onTriggerNotification) {
            if (outcome === "WON") {
              onTriggerNotification(
                `🎉 SOLO TRADE WON! (+₹${profitOrLoss.toFixed(2)} Profit Credited)`,
                "success"
              );
            } else if (outcome === "DRAW") {
              onTriggerNotification(`🤝 Solo Trade Draw. Stake ₹${trade.stake} Refunded.`, "info");
            } else if (outcome === "LOST") {
              onTriggerNotification(`🔴 Solo Trade Lost (-₹${trade.stake}).`, "error");
            }
          }

          console.log(`[Instant Trade Auto-Settled] ID=${trade.id} outcome=${outcome} exitPrice=${currentExitPrice}`);

          // 3. Sync to Firestore in background asynchronously
          if (!trade.id.startsWith("temp_")) {
            settleSoloTrade(trade.id, currentExitPrice)
              .catch((err) => {
                console.error(`[Background Firestore Settle Error] Trade ${trade.id}:`, err);
              })
              .finally(() => {
                settlingTradeIds.current.delete(trade.id);
              });
          }
        }
      }
    });
  }, [userTrades, nowTimestamp, onTriggerNotification, livePrices, currentUser, onUpdateProfile]);

  const currentPrice = livePriceService.getPrice(currentAsset.symbol) || livePrices[currentAsset.symbol] || currentAsset.basePrice;

  // Selected Trading Mode State ("PROTECTED" or "STANDARD")
  const [selectedMode, setSelectedMode] = useState<"PROTECTED" | "STANDARD">(() => {
    const saved = localStorage.getItem("solo_last_mode");
    if (saved === "PROTECTED" || saved === "STANDARD") {
      return saved;
    }
    return soloConfig.drawRule === "LOSS" ? "STANDARD" : "PROTECTED";
  });

  const handleSelectMode = (mode: "PROTECTED" | "STANDARD") => {
    setSelectedMode(mode);
    try {
      localStorage.setItem("solo_last_mode", mode);
    } catch (e) {
      console.error("Failed to save mode to localStorage:", e);
    }
  };

  const protectedPayoutPct = currentAsset.protectedPayoutPercentage ?? soloConfig.protectedPayoutPercentage ?? currentAsset.payoutPercentage ?? 80;
  const standardPayoutPct = currentAsset.standardPayoutPercentage ?? currentAsset.payoutPercentage ?? soloConfig.standardPayoutPercentage ?? soloConfig.defaultPayoutPercentage ?? 85;

  const payoutPct = selectedMode === "PROTECTED" ? protectedPayoutPct : standardPayoutPct;
  const selectedDrawRule: "REFUND" | "LOSS" = selectedMode === "PROTECTED" ? "REFUND" : "LOSS";

  // Available Expiry Durations for Current Pair & Mode
  const availableDurations = useMemo(() => {
    return getActiveDurationsForPairAndMode(currentAsset, selectedMode, soloConfig);
  }, [currentAsset, selectedMode, soloConfig]);

  // Sync durationSeconds with availableDurations whenever pair, mode, or config changes
  useEffect(() => {
    if (!availableDurations || availableDurations.length === 0) return;
    if (!availableDurations.includes(durationSeconds)) {
      const saved = localStorage.getItem("solo_last_duration");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && availableDurations.includes(parsed)) {
          setDurationSecondsState(parsed);
          return;
        }
      }
      setDurationSecondsState(availableDurations[0]);
    }
  }, [availableDurations, durationSeconds]);

  const parsedStake = parseFloat(stakeAmount) || 0;
  const potentialProfit = (parsedStake * payoutPct) / 100;
  const potentialTotalReturn = parsedStake + potentialProfit;

  // Audio synthesizer feedback for ultra-fast trade feel
  const playTradeExecutionSound = (type: "CALL" | "PUT") => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const startFreq = type === "CALL" ? 650 : 450;
      const endFreq = type === "CALL" ? 950 : 250;
      osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {
      // Ignore audio errors
    }
  };

  // Execute trade helper (Ultra-Fast Instant Mode)
  const executeTradeAction = async (targetType: "CALL" | "PUT", isFastMode: boolean = false) => {
    setOrderError(null);

    if (typeof navigator !== "undefined" && (!navigator.onLine || !isOnline)) {
      setOrderError("⚠️ Internet Disconnected! Please check your network connection to place trades and update balance.");
      if (onTriggerNotification) {
        onTriggerNotification("⚠️ Cannot place trade while offline. Please reconnect to internet.", "error");
      }
      return;
    }

    if (!currentUser) {
      setOrderError("Please select or log in to a user account.");
      return;
    }

    if (!soloConfig.isEnabled) {
      setOrderError("Solo Trading Engine is currently disabled by Admin.");
      return;
    }

    if (currentAsset.disabled) {
      setOrderError(`Trading on ${currentAsset.pair} is currently disabled by Admin.`);
      return;
    }

    // Check if the real-world market for this asset is open (Forex/Metals close on weekends)
    if (!isCurrentMarketOpen) {
      const closeMsg = `🔒 Market is CLOSED for ${currentAsset.pair} (${currentMarketStatus.reason || "Weekend Market Close"}). ${currentMarketStatus.nextOpenTime || "Opens Sunday 21:00 UTC / Monday"}. Real interbank Forex & Deriv WebSocket feeds are inactive on weekends. Please switch to 24/7 Crypto pairs (BTC, ETH, SOL) to trade.`;
      setOrderError(closeMsg);
      if (onTriggerNotification) {
        onTriggerNotification(closeMsg, "error");
      }
      return;
    }

    if (isNaN(parsedStake) || parsedStake < soloConfig.minStake) {
      setOrderError(`Minimum trade stake is ₹${soloConfig.minStake}.`);
      return;
    }

    if (parsedStake > soloConfig.maxStake) {
      setOrderError(`Maximum trade stake is ₹${soloConfig.maxStake}.`);
      return;
    }

    if (parsedStake > availableBalance) {
      setOrderError(`Insufficient Available Balance (₹${availableBalance.toFixed(2)}).`);
      return;
    }

    // Play instant sound feedback
    playTradeExecutionSound(targetType);

    // Use atomic price snapshot to guarantee execution price matches displayed price and provider feed 100%
    const priceSnap = livePriceService.getSnapshot(currentAsset.symbol);
    const freshPrice = priceSnap.price > 0 ? priceSnap.price : currentPrice;
    localStorage.setItem("solo_last_stake", stakeAmount);

    // Create instant optimistic trade object for 0ms UI feedback in Active Running Trades card
    const now = new Date();
    const startTimeISO = now.toISOString();
    const endTimeISO = new Date(now.getTime() + durationSeconds * 1000).toISOString();
    const expectedPayout = parsedStake + (parsedStake * payoutPct) / 100;
    const tempId = "temp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

    const optimisticTrade: SoloTrade = {
      id: tempId,
      userId: currentUser.id,
      userEmail: currentUser.email || "",
      userName: currentUser.name || "Trader",
      tradeType: targetType,
      stake: parsedStake,
      entryPrice: freshPrice,
      exitPrice: null,
      payoutPercentage: payoutPct,
      expectedPayout,
      profitOrLoss: null,
      startTime: startTimeISO,
      endTime: endTimeISO,
      durationSeconds,
      status: "RUNNING",
      assetPair: currentAsset.pair,
      tradingSymbol: currentAsset.symbol,
      drawRule: selectedDrawRule,
      txId: "tx_" + tempId
    };

    setUserTrades(prev => [optimisticTrade, ...prev]);

    if (onTriggerNotification) {
      onTriggerNotification(
        `⚡ ${targetType} Trade (${selectedMode === "PROTECTED" ? "Protected Mode" : "Standard Mode"}) Executed on ${currentAsset.pair} @ ${formatAssetPrice(freshPrice, currentAsset.pair, currentAsset.decimals)} (${durationSeconds}s)`,
        "success"
      );
    }

    // Fire trade placement asynchronously to ensure zero UI delay (balance is atomically updated by Firestore)
    placeSoloTrade(
      currentUser.id,
      targetType,
      parsedStake,
      freshPrice,
      durationSeconds,
      currentAsset.pair,
      currentAsset.symbol,
      payoutPct,
      startTimeISO,
      endTimeISO,
      selectedDrawRule
    ).then((realTradeId) => {
      if (realTradeId) {
        setUserTrades(prev => prev.map(t => t.id === tempId ? { ...t, id: realTradeId, txId: "tx_" + realTradeId } : t));
      }
    }).catch((err: any) => {
      console.error("[Instant Trade Execution Error]:", err);
      setOrderError(sanitizeErrorMessage(err, "Failed to execute solo trade."));
      setUserTrades(prev => prev.filter(t => t.id !== tempId));
    });
  };

  const handleExecuteTrade = (e: React.FormEvent) => {
    e.preventDefault();
    executeTradeAction(tradeType, false);
  };

  const activeTradesContainerRef = useRef<HTMLDivElement>(null);

  const runningTrades = userTrades
    .filter((t) => t.status === "RUNNING")
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  const completedTrades = userTrades.filter((t) => t.status !== "RUNNING");

  useEffect(() => {
    if (activeTradesContainerRef.current) {
      activeTradesContainerRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  }, [runningTrades.length]);

  const filteredHistory = completedTrades.filter((t) => {
    if (historyFilter === "WON" && t.status !== "WON") return false;
    if (historyFilter === "LOST" && t.status !== "LOST") return false;
    if (historyFilter === "DRAW" && t.status !== "DRAW") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = t.id.toLowerCase().includes(q);
      const matchPair = t.assetPair.toLowerCase().includes(q);
      const matchSymbol = t.tradingSymbol.toLowerCase().includes(q);
      return matchId || matchPair || matchSymbol;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE) || 1;
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Calculate Solo Trading Stats
  const totalTradesCount = completedTrades.length;
  const wonCount = completedTrades.filter((t) => t.status === "WON").length;
  const winRate = totalTradesCount > 0 ? ((wonCount / totalTradesCount) * 100).toFixed(1) : "0.0";
  const netProfitLoss = completedTrades.reduce((sum, t) => sum + (t.profitOrLoss || 0), 0);

  // TradingView Symbol encode & Dynamic Iframe Configuration
  const cleanSymbol = encodeURIComponent(currentAsset.symbol);
  const iframeUrl = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_solo&symbol=${cleanSymbol}&interval=${selectedInterval}&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=${isDarkMode ? "1e222d" : "ffffff"}&studies=[]&theme=${isDarkMode ? "dark" : "light"}&style=1&timezone=Etc%2FUTC&locale=en&v=${chartRefreshKey}`;

  return (
    <div className="space-y-2">
      
      {/* Network Offline Alert Banner */}
      {!isOnline && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/90 border-2 border-rose-300 dark:border-rose-600/80 rounded-2xl flex items-center justify-between gap-3 text-rose-800 dark:text-rose-200 shadow-xl animate-pulse">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-500/10 dark:bg-rose-500/20 rounded-xl border border-rose-500/30 text-rose-600 dark:text-rose-400 shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                ⚠️ Internet Connection Disconnected
              </h3>
              <p className="text-[11px] text-rose-700 dark:text-rose-300/90 mt-0.5">
                Trading, live market price feeds, and balance updates are paused while offline. Reconnect to internet to place trades and sync balance.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-rose-100 dark:bg-rose-900/80 border border-rose-300 dark:border-rose-700/80 text-rose-800 dark:text-rose-200 text-[10px] font-mono font-extrabold uppercase rounded-lg shrink-0">
            OFFLINE
          </span>
        </div>
      )}

      {/* Admin Activation Status Header */}
      {!soloConfig.isEnabled && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/80 border-2 border-amber-300 dark:border-amber-600/60 rounded-2xl flex items-center justify-between gap-3 text-amber-800 dark:text-amber-200 shadow-xl animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 dark:bg-amber-500/20 rounded-xl border border-amber-500/30 text-amber-600 dark:text-amber-400">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                Solo Trading Engine Currently Inactive
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300/90 mt-0.5">
                The Admin has deactivated the Solo Trading Engine. User trading will unlock automatically as soon as Admin activates it in the Admin Panel.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 dark:border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-mono font-bold rounded-lg shrink-0">
            ADMIN INACTIVE
          </span>
        </div>
      )}

      {/* Main Solo Trading Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
        
        {/* Left Column: Asset Ticker + Chart + Active Running Trades (8 cols) */}
        <div className="lg:col-span-8 space-y-2">
          
          {/* Asset Ticker Bar */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 dark:border-indigo-500/30 rounded-xl">
                  <Zap className="h-4 w-4 animate-pulse text-amber-500 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Select Trading Asset</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Live Synchronized Market Ticker & Binary Options</p>
                </div>
              </div>

              {/* Mode Selection Dropdown (Above Search Pair) */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedMode}
                  onChange={(e) => handleSelectMode(e.target.value as "PROTECTED" | "STANDARD")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-extrabold border outline-none cursor-pointer transition-all shadow-xs ${
                    selectedMode === "PROTECTED"
                      ? "bg-emerald-50 dark:bg-emerald-950/90 border-emerald-500/50 dark:border-emerald-500/80 text-emerald-700 dark:text-emerald-300 focus:border-emerald-500"
                      : "bg-indigo-50 dark:bg-indigo-950/90 border-indigo-500/50 dark:border-indigo-500/80 text-indigo-700 dark:text-indigo-300 focus:border-indigo-500"
                  }`}
                >
                  <option value="PROTECTED" className="bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-bold">
                    🛡️ Protected Mode (+{protectedPayoutPct}% Return)
                  </option>
                  <option value="STANDARD" className="bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold">
                    ⚡ Standard Mode (+{standardPayoutPct}% Return)
                  </option>
                </select>

                {/* Live Real-Time Candlestick Pattern Radar Drawer Trigger (Admin Configurable) */}
                {soloConfig.showPatternRadar !== false && (
                  <button
                    type="button"
                    onClick={() => setIsPatternControllerOpen(!isPatternControllerOpen)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer shadow-xs ${
                      isPatternControllerOpen
                        ? "bg-indigo-600 border-indigo-400 text-white shadow-indigo-600/30"
                        : "bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
                    }`}
                    title="Live Real Market Pattern Radar (Hammers, Dojis, Marubozu on Binance/Deriv Feeds)"
                  >
                    <Sparkles className={`h-3.5 w-3.5 ${isPatternControllerOpen ? "text-amber-300 animate-spin" : "text-amber-500 animate-pulse"}`} />
                    <span>{isPatternControllerOpen ? "Close Pattern Radar" : "⚡ Pattern Radar"}</span>
                  </button>
                )}

                {/* Live Ticker Pulse Sync Indicator */}
                <div className="hidden sm:flex items-center gap-2 bg-slate-100 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-mono font-extrabold text-emerald-600 dark:text-emerald-400">LIVE PRICE SYNCED</span>
                </div>
              </div>
            </div>

            {/* Search Input & Category Filter Bar */}
            <div className="flex flex-wrap items-center gap-2.5 mb-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  value={assetSearchQuery}
                  onChange={(e) => setAssetSearchQuery(e.target.value)}
                  placeholder="Search pair (e.g. BTC, EUR, Gold, DOGE)..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 text-xs text-slate-900 dark:text-white rounded-xl pl-9 pr-8 py-2 font-mono outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                {assetSearchQuery && (
                  <button
                    onClick={() => setAssetSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-bold overflow-x-auto max-w-full no-scrollbar">
                {Array.from(
                  new Set([
                    "ALL",
                    ...(soloConfig.categories && soloConfig.categories.length > 0
                      ? soloConfig.categories
                      : ["Crypto", "Forex", "Commodities", "Metals", "Indices"])
                  ])
                ).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedAssetCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      selectedAssetCategory === cat
                        ? "bg-indigo-600 text-white font-extrabold shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-900"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Supported Assets Horizontal Selector */}
            {filteredAssets.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800/60 font-mono">
                No trading pairs found matching "{assetSearchQuery}".{" "}
                <button
                  onClick={() => {
                    setAssetSearchQuery("");
                    setSelectedAssetCategory("ALL");
                  }}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {filteredAssets.map((asset) => {
                  const price = livePriceService.getPrice(asset.symbol) || livePrices[asset.symbol] || asset.basePrice;
                  const isSelected = currentAsset.symbol === asset.symbol;
                  const assetPayout = selectedMode === "PROTECTED"
                    ? (asset.protectedPayoutPercentage ?? soloConfig.protectedPayoutPercentage ?? asset.payoutPercentage ?? 80)
                    : (asset.standardPayoutPercentage ?? asset.payoutPercentage ?? soloConfig.standardPayoutPercentage ?? soloConfig.defaultPayoutPercentage ?? 85);
                  const marketStatus = getAssetMarketStatus(asset.symbol, asset.category);

                  return (
                    <button
                      key={asset.symbol}
                      onClick={() => setSelectedAsset(asset)}
                      className={`px-3 py-2.5 rounded-xl border transition-all text-left min-w-[145px] shrink-0 cursor-pointer ${
                        asset.disabled
                          ? "bg-slate-100 dark:bg-slate-950/40 border-rose-200 dark:border-rose-900/50 text-slate-400 dark:text-slate-500 opacity-75"
                          : !marketStatus.isOpen
                          ? isSelected
                            ? "bg-amber-500/10 dark:bg-amber-950/40 border-amber-500 text-slate-900 dark:text-white"
                            : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-amber-400"
                          : isSelected
                          ? "bg-indigo-50 dark:bg-indigo-600/20 border-indigo-500 shadow-md text-slate-900 dark:text-white"
                          : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold font-mono truncate">{asset.pair.replace(/\s*\([^)]*\)/, "").trim()}</span>
                        {asset.disabled ? (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded">
                            Disabled
                          </span>
                        ) : !marketStatus.isOpen ? (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded flex items-center gap-0.5">
                            <Lock className="h-2.5 w-2.5" />
                            <span>Closed</span>
                          </span>
                        ) : (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded">
                            {assetPayout}% {asset.category === "Crypto" ? "24/7" : "Live"}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-extrabold font-mono text-slate-900 dark:text-white">
                        {formatAssetPrice(price, asset.pair, asset.decimals)}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Real-world Market Closed Banner for Forex & Metals during weekends */}
          {!isCurrentMarketOpen && (
            <div className="p-4 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/25 dark:border-amber-500/20 rounded-2xl text-slate-800 dark:text-slate-200 shadow-xs space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                  <Lock className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm text-amber-950 dark:text-amber-200">
                      {currentAsset.pair} is Currently Closed
                    </h3>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-amber-500/20 text-amber-800 dark:text-amber-300 rounded-full border border-amber-500/30 font-mono">
                      Weekend Closed
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    The market is closed for the weekend. Trading will automatically resume when the market reopens.
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-900 dark:text-amber-300 bg-amber-500/15 dark:bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 w-fit font-mono font-medium">
                    <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Next Opening: <strong className="font-bold text-amber-950 dark:text-amber-100">{currentMarketStatus.nextOpenTime || "Sunday 21:00 UTC"}</strong></span>
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-amber-500/20 dark:border-amber-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="text-amber-500 text-sm">⚡</span>
                  <span>Trade Crypto 24/7</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const btc = activeAssets.find(a => a.symbol.includes("BTC")) || SUPPORTED_SOLO_ASSETS[0];
                    if (btc) setSelectedAsset(btc);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 dark:bg-amber-400 dark:hover:bg-amber-300 font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 w-full sm:w-auto"
                >
                  <span>Switch to BTC/USDT</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Live Candlestick Pattern Engine Drawer (When Toggled & Enabled by Admin) */}
          {soloConfig.showPatternRadar !== false && isPatternControllerOpen && (
            <div className="animate-fadeIn">
              <LiveCandlePatternController
                currentSymbol={currentAsset.symbol}
                onSelectAsset={(sym) => {
                  const target = activeAssets.find((a) => a.symbol === sym || a.pair === sym);
                  if (target) {
                    setSelectedAsset(target);
                  }
                }}
              />
            </div>
          )}

          {/* Chart Display Container */}
          {/* Quotex Pro Realtime Chart Engine */}
          <QuotexProChart
            currentSymbol={currentAsset.symbol}
            currentPairName={currentAsset.pair}
            decimals={currentAsset.decimals}
            payoutPercentage={payoutPct}
            activeTrades={runningTrades.filter((t) => {
              const cleanCur = currentAsset.symbol.toUpperCase().replace(/^(BINANCE:|OANDA:|FX:|TVC:|CAPITALCOM:|CURRENCYCOM:|GLOBALPRIME:|FX_IDC:|FOREXCOM:|NSE:|DERIV:)/, "").replace(/[^A-Z0-9]/g, "");
              const cleanTradeSym = (t.tradingSymbol || "").toUpperCase().replace(/^(BINANCE:|OANDA:|FX:|TVC:|CAPITALCOM:|CURRENCYCOM:|GLOBALPRIME:|FX_IDC:|FOREXCOM:|NSE:|DERIV:)/, "").replace(/[^A-Z0-9]/g, "");
              const cleanTradePair = (t.assetPair || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
              return (
                cleanTradeSym === cleanCur ||
                cleanTradePair.includes(cleanCur) ||
                cleanCur.includes(cleanTradeSym) ||
                t.tradingSymbol === currentAsset.symbol ||
                t.assetPair === currentAsset.pair
              );
            })}
            onSelectAsset={(symbol) => {
              const found = activeAssets.find((a) => a.symbol === symbol) || SUPPORTED_SOLO_ASSETS.find((a) => a.symbol === symbol);
              if (found) setSelectedAsset(found);
            }}
            onPlaceQuickTrade={(type) => executeTradeAction(type)}
            isDarkMode={isDarkMode}
            className="mb-0"
          />

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            {/* Active Trade "In Short" Position Strip (Positioned between TradingView Chart & Quick Trade) */}
            {runningTrades.length > 0 && (
              <div 
                ref={activeTradesContainerRef}
                className="px-3 py-2.5 bg-slate-50 dark:bg-slate-950/95 border-t border-slate-200 dark:border-slate-800/80 flex items-center gap-2.5 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory"
              >
                {runningTrades.map((trade) => {
                  const endTimeMs = new Date(trade.endTime).getTime();
                  const remainingMs = Math.max(0, endTimeMs - nowTimestamp);
                  const remainingSec = Math.ceil(remainingMs / 1000);
                  const mins = Math.floor(remainingSec / 60).toString().padStart(2, "0");
                  const secs = (remainingSec % 60).toString().padStart(2, "0");
                  
                  const curLivePrice = livePriceService.getPrice(trade.tradingSymbol) || livePrices[trade.tradingSymbol] || trade.entryPrice;
                  let isWinning = false;
                  if (trade.tradeType === "CALL" && curLivePrice > trade.entryPrice) isWinning = true;
                  if (trade.tradeType === "PUT" && curLivePrice < trade.entryPrice) isWinning = true;

                  const stakeVal = typeof trade.stake === "number" ? trade.stake : (parseFloat((trade as any).stakeAmount) || 0);
                  const payoutVal = typeof trade.expectedPayout === "number" ? trade.expectedPayout : (stakeVal * (1 + (trade.payoutPercentage || payoutPct) / 100));
                  const netProfit = payoutVal - stakeVal;

                  return (
                    <div 
                      key={trade.id} 
                      className={`snap-start shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-2xl border backdrop-blur-xl shadow-lg transition-all ${
                        isWinning 
                          ? "bg-white/95 dark:bg-slate-900/95 border-emerald-500/80 shadow-emerald-500/10" 
                          : "bg-white/95 dark:bg-slate-900/95 border-rose-500/80 shadow-rose-500/10"
                      }`}
                    >
                      {/* Direction Badge */}
                      <div className={`p-1.5 rounded-xl text-white font-extrabold flex items-center justify-center shrink-0 ${
                        trade.tradeType === "CALL" ? "bg-emerald-500 shadow-xs shadow-emerald-500/40" : "bg-rose-500 shadow-xs shadow-rose-500/40"
                      }`}>
                        {trade.tradeType === "CALL" ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                      </div>

                      {/* Stake, Entry Price & Live Dynamic Return Status */}
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 font-mono font-black text-xs text-slate-900 dark:text-white whitespace-nowrap">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Stake:</span>
                          <span>₹{stakeVal.toFixed(2)}</span>
                          <span className="text-slate-300 dark:text-slate-600 font-normal">|</span>
                          <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Entry:</span>
                          <span className="text-amber-600 dark:text-amber-300/90 font-bold text-[11px]">
                            {formatAssetPrice(trade.entryPrice, trade.assetPair || trade.tradingSymbol)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold whitespace-nowrap">
                          <span className="text-slate-500 dark:text-slate-400 font-normal">Return:</span>
                          <span className={isWinning ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "text-rose-600 dark:text-rose-400 font-extrabold"}>
                            ₹{isWinning ? payoutVal.toFixed(2) : "0.00"}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${
                            isWinning 
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30" 
                              : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                          }`}>
                            {isWinning ? `+₹${netProfit.toFixed(0)}` : `-₹${stakeVal.toFixed(0)}`}
                          </span>
                        </div>
                      </div>

                      {/* Live Countdown Timer */}
                      <div className="px-2.5 py-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-black text-xs text-indigo-600 dark:text-indigo-300 flex items-center gap-1.5 shrink-0 ml-1">
                        <Clock className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 animate-pulse" />
                        <span>{remainingSec === 0 ? "Syncing..." : `${mins}:${secs}`}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Chart Trade Action Bar (Right Under TradingView Chart) */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 space-y-3">
              {/* Header row: Quick Trade Label + In Short Tag + User Available Balance + Expiry Duration */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 dark:text-white font-mono flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                    Quick Trade
                  </span>

                  {/* Live Wallet Balance Display */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 font-mono font-black text-xs shadow-xs">
                    <Coins className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                    <span>Bal: ₹{(currentUser ? availableBalance : 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Quick Expiry Duration selector */}
                <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-800 max-w-full overflow-x-auto scrollbar-none">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono px-1 font-bold shrink-0">Expiry:</span>
                  <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                    {availableDurations.map((dur) => {
                      const label = dur >= 3600 ? `${dur / 3600}h` : dur >= 60 ? `${dur / 60}m` : `${dur}s`;
                      const isSelected = durationSeconds === dur;
                      return (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => setDurationSeconds(dur)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-extrabold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                            isSelected
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white/70 dark:bg-slate-950/60"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Stake input & CALL / PUT Buttons (STRICTLY IN 1 HORIZONTAL LINE) */}
              <div className="space-y-2">
                {/* Stake input & quick presets */}
                <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 min-w-[130px]">
                    <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 font-mono pl-1">Stake ₹</span>
                    <input
                      type="number"
                      min={soloConfig.minStake}
                      max={soloConfig.maxStake}
                      value={stakeAmount}
                      onChange={(e) => handleUpdateStake(e.target.value)}
                      placeholder="Stake"
                      className="w-24 bg-transparent text-xs font-mono font-black text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                    {[100, 500, 1000, 5000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleUpdateStake(amt.toString())}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                          parsedStake === amt
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                        }`}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* CALL & PUT Buttons strictly in 1 single horizontal row on ALL screens */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting || fastSubmittingType !== null || !soloConfig.isEnabled || !isOnline || !isCurrentMarketOpen}
                    onClick={() => executeTradeAction("CALL", true)}
                    className="w-full py-3 px-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black rounded-xl shadow-lg shadow-emerald-600/30 dark:shadow-emerald-950/50 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 text-xs sm:text-sm font-mono uppercase active:scale-98"
                  >
                    {fastSubmittingType === "CALL" ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : !isCurrentMarketOpen ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <TrendingUp className="h-4 w-4 stroke-[3]" />
                    )}
                    <span>{!isCurrentMarketOpen ? "CALL (CLOSED)" : `CALL ▲ (+${payoutPct}%)`}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting || fastSubmittingType !== null || !soloConfig.isEnabled || !isOnline || !isCurrentMarketOpen}
                    onClick={() => executeTradeAction("PUT", true)}
                    className="w-full py-3 px-3 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-black rounded-xl shadow-lg shadow-rose-600/30 dark:shadow-rose-950/50 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 text-xs sm:text-sm font-mono uppercase active:scale-98"
                  >
                    {fastSubmittingType === "PUT" ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : !isCurrentMarketOpen ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4 stroke-[3]" />
                    )}
                    <span>{!isCurrentMarketOpen ? "PUT (CLOSED)" : `PUT ▼ (+${payoutPct}%)`}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Active Running Solo Trades Scrollable Panel */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500 dark:text-amber-400 animate-pulse" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Active Running Trades ({runningTrades.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                Real-Time Live Settlement
              </span>
            </div>

            {runningTrades.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-xl text-slate-500 text-xs">
                No active solo trades running right now. Use <strong>FAST CALL</strong> or <strong>FAST PUT</strong> below to enter a position instantly!
              </div>
            ) : (
              <div className="max-h-[380px] overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                {runningTrades.map((trade) => {
                  const endTimeMs = new Date(trade.endTime).getTime();
                  const remainingMs = Math.max(0, endTimeMs - nowTimestamp);
                  const remainingSec = Math.ceil(remainingMs / 1000);
                  const progressPct = Math.min(
                    100,
                    Math.max(0, ((trade.durationSeconds * 1000 - remainingMs) / (trade.durationSeconds * 1000)) * 100)
                  );

                  const curLivePrice = livePriceService.getPrice(trade.tradingSymbol) || livePrices[trade.tradingSymbol] || trade.entryPrice;
                  let isWinning = false;
                  if (trade.tradeType === "CALL" && curLivePrice > trade.entryPrice) isWinning = true;
                  if (trade.tradeType === "PUT" && curLivePrice < trade.entryPrice) isWinning = true;

                  const shortId = trade.id.slice(-6).toUpperCase();

                  return (
                    <div
                      key={trade.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isWinning
                          ? "bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-500/50 shadow-md shadow-emerald-500/10"
                          : "bg-rose-50/50 dark:bg-rose-950/30 border-rose-500/50 shadow-md shadow-rose-500/10"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                            #{shortId}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded uppercase font-mono ${
                            trade.tradeType === "CALL"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40"
                              : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/40"
                          }`}>
                            {trade.tradeType}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">{trade.assetPair}</span>
                          <span className={`px-2 py-0.5 text-[10px] font-mono font-extrabold rounded border ${
                            trade.drawRule === "REFUND"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                              : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30"
                          }`}>
                            {trade.drawRule === "REFUND" ? "Protected Mode" : "Standard Mode"}
                          </span>
                          <span className="text-[10px] text-slate-600 dark:text-slate-300 font-mono font-bold bg-white dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                            Stake: ₹{trade.stake} ({trade.payoutPercentage}% Return)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded uppercase font-mono ${
                            isWinning ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-rose-500/20 text-rose-700 dark:text-rose-400"
                          }`}>
                            {isWinning ? "▲ IN THE MONEY" : "▼ OUT OF MONEY"}
                          </span>
                          <div className="flex items-center gap-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-lg text-amber-600 dark:text-amber-400 font-mono text-xs font-extrabold">
                            <Clock className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 animate-spin" />
                            <span>{remainingSec}s</span>
                          </div>
                        </div>
                      </div>

                      {/* Entry Price vs Live Price comparison with timestamps */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono p-2.5 bg-white dark:bg-slate-950/90 rounded-lg border border-slate-200 dark:border-slate-800/80 mb-2">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Entry Price</span>
                          <span className="font-extrabold text-slate-900 dark:text-white">{formatAssetPrice(trade.entryPrice, trade.assetPair || trade.tradingSymbol)}</span>
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400/90 block font-normal mt-0.5">
                            ⏱ In: {new Date(trade.startTime).toLocaleTimeString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Live Price</span>
                          <span className={`font-extrabold ${isWinning ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                            {formatAssetPrice(curLivePrice, trade.assetPair || trade.tradingSymbol)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Duration / Exit</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{trade.durationSeconds}s</span>
                          <span className="text-[9px] text-amber-600 dark:text-amber-400/90 block font-normal mt-0.5">
                            🏁 Out: {new Date(trade.endTime).toLocaleTimeString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Status / Return</span>
                          <span className={`font-extrabold ${isWinning ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                            {isWinning ? `+₹${trade.expectedPayout.toFixed(2)}` : `-₹${trade.stake.toFixed(2)}`}
                          </span>
                        </div>
                      </div>

                      {/* Animated Smooth Progress Bar */}
                      <div className="w-full bg-slate-200 dark:bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-300 dark:border-slate-800">
                        <div
                          className={`h-full transition-[width] duration-100 ease-linear ${isWinning ? "bg-emerald-500" : "bg-rose-500"}`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Streamlined Order Placement Panel (4 cols) */}
        <div className="lg:col-span-4 space-y-2">
          
          {/* Unified Binary Option Order Card */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl space-y-5 relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3 gap-2">
              <div className="flex items-center gap-2">
                <div className={`p-2 border rounded-xl ${
                  selectedMode === "PROTECTED"
                    ? "bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : "bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
                }`}>
                  {selectedMode === "PROTECTED" ? <ShieldCheck className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Solo Option Trade</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Mode: <strong className={selectedMode === "PROTECTED" ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-indigo-600 dark:text-indigo-400 font-bold"}>
                      {selectedMode === "PROTECTED" ? "Protected Mode" : "Standard Mode"}
                    </strong>
                  </p>
                </div>
              </div>

              {/* Mode Dropdown in Top Card Header */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedMode}
                  onChange={(e) => handleSelectMode(e.target.value as "PROTECTED" | "STANDARD")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-extrabold border outline-none cursor-pointer transition-all ${
                    selectedMode === "PROTECTED"
                      ? "bg-emerald-50 dark:bg-emerald-950/90 border-emerald-500/60 dark:border-emerald-500/80 text-emerald-700 dark:text-emerald-300 focus:border-emerald-500 shadow-xs"
                      : "bg-indigo-50 dark:bg-indigo-950/90 border-indigo-500/60 dark:border-indigo-500/80 text-indigo-700 dark:text-indigo-300 focus:border-indigo-500 shadow-xs"
                  }`}
                >
                  <option value="PROTECTED" className="bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-bold">
                    🛡️ Protected Mode (+{protectedPayoutPct}% Return)
                  </option>
                  <option value="STANDARD" className="bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold">
                    ⚡ Standard Mode (+{standardPayoutPct}% Return)
                  </option>
                </select>
              </div>
            </div>

            {orderError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>{sanitizeErrorMessage(orderError)}</span>
              </div>
            )}

            <div className="space-y-4">

              {/* Trade Stake Amount (Remembered) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Stake Amount (₹)
                    </label>
                    <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold">
                      SAVED
                    </span>
                  </div>

                  {currentUser && (
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      Bal: <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">₹{availableBalance.toFixed(2)}</strong>
                    </span>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 dark:text-slate-500 font-mono text-sm font-bold">₹</span>
                  <input
                    type="number"
                    min={soloConfig.minStake}
                    max={soloConfig.maxStake}
                    value={stakeAmount}
                    onChange={(e) => handleUpdateStake(e.target.value)}
                    placeholder={`Min ₹${soloConfig.minStake}`}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Quick Stake Preset Buttons */}
                <div className="grid grid-cols-4 gap-1.5 mt-2">
                  {[100, 500, 1000, 5000].map((quickAmt) => (
                    <button
                      key={quickAmt}
                      type="button"
                      onClick={() => handleUpdateStake(quickAmt.toString())}
                      className={`py-1.5 border rounded-lg text-[11px] font-bold font-mono transition-colors cursor-pointer text-center ${
                        parsedStake === quickAmt
                          ? "bg-indigo-600 border-indigo-400 text-white"
                          : "bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      ₹{quickAmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Timer Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Expiry Duration
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
                  {availableDurations.map((dur) => {
                    const label = dur >= 3600 ? `${dur / 3600}h` : dur >= 60 ? `${dur / 60}m` : `${dur}s`;
                    const isSelected = durationSeconds === dur;

                    return (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setDurationSeconds(dur)}
                        className={`px-3 py-2 rounded-xl text-xs font-mono font-extrabold border transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-400 shadow-md"
                            : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Locked Entry Price & Potential Payout Summary Card */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/90 rounded-xl space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>Selected Mode:</span>
                  <strong className={`font-extrabold ${selectedMode === "PROTECTED" ? "text-emerald-600 dark:text-emerald-400" : "text-indigo-600 dark:text-indigo-400"}`}>
                    {selectedMode === "PROTECTED" ? "Protected Mode" : "Standard Mode"}
                  </strong>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>Current Entry Price:</span>
                  <strong className="text-slate-900 dark:text-white font-extrabold">{formatAssetPrice(currentPrice, currentAsset.pair, currentAsset.decimals)}</strong>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>Payout Profit Rate:</span>
                  <strong className="text-indigo-600 dark:text-indigo-400 font-extrabold">+{payoutPct}% Profit</strong>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>Draw Trade Rule:</span>
                  <strong className={selectedMode === "PROTECTED" ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-rose-600 dark:text-rose-400 font-bold"}>
                    {selectedMode === "PROTECTED" ? "Refund 100% Stake" : "Treat as Loss (Stake Forfeited)"}
                  </strong>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>Profit on Win:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">+₹{potentialProfit.toFixed(2)}</strong>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Total Return:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold text-base">₹{potentialTotalReturn.toFixed(2)}</strong>
                </div>
              </div>

              {/* EXACTLY TWO DIRECT ACTION BUTTONS: CALL & PUT */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  disabled={isSubmitting || fastSubmittingType !== null || !soloConfig.isEnabled || !isOnline || !isCurrentMarketOpen}
                  onClick={() => executeTradeAction("CALL", true)}
                  className="py-4 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/30 dark:shadow-emerald-950/60 border border-emerald-400 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {fastSubmittingType === "CALL" ? (
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  ) : !isCurrentMarketOpen ? (
                    <>
                      <div className="flex items-center gap-1.5 text-base">
                        <Lock className="h-5 w-5" />
                        <span>MARKET CLOSED</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-200">
                        {currentMarketStatus.reason || "Weekend Close"}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 text-base">
                        <ArrowUpRight className="h-5 w-5 stroke-[3]" />
                        <span>CALL</span>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-100 font-extrabold">
                        HIGHER ⬆
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isSubmitting || fastSubmittingType !== null || !soloConfig.isEnabled || !isOnline || !isCurrentMarketOpen}
                  onClick={() => executeTradeAction("PUT", true)}
                  className="py-4 px-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-sm rounded-xl shadow-lg shadow-rose-600/30 dark:shadow-rose-950/60 border border-rose-400 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {fastSubmittingType === "PUT" ? (
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  ) : !isCurrentMarketOpen ? (
                    <>
                      <div className="flex items-center gap-1.5 text-base">
                        <Lock className="h-5 w-5" />
                        <span>MARKET CLOSED</span>
                      </div>
                      <span className="text-[10px] font-mono text-rose-200">
                        {currentMarketStatus.reason || "Weekend Close"}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 text-base">
                        <ArrowDownRight className="h-5 w-5 stroke-[3]" />
                        <span>PUT</span>
                      </div>
                      <span className="text-[11px] font-mono text-rose-100 font-extrabold">
                        LOWER ⬇
                      </span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-slate-500 text-center font-mono">
                Direct instant execution for ₹{parsedStake} @ {durationSeconds}s
              </p>

            </div>
          </div>

          {/* User Solo Trading Summary Card */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              Solo Trading Engine Performance
            </h4>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-500 block">Total Settled</span>
                <span className="font-extrabold text-slate-900 dark:text-white text-sm">{totalTradesCount}</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-500 block">Win Rate %</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">{winRate}%</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-500 block">Won Trades</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">{wonCount}</span>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-500 block">Net Profit / Loss</span>
                <span className={`font-extrabold text-sm ${netProfitLoss >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {netProfitLoss >= 0 ? "+" : ""}₹{netProfitLoss.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Completed Solo Trade History Section */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span>Solo Trade History Logs ({filteredHistory.length})</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Complete audit log of all completed and settled binary option trades</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search Trade ID, Asset..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 w-44 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            {/* History Filters */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800 rounded-xl shrink-0">
              {(["ALL", "WON", "LOST", "DRAW"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setHistoryFilter(f);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    historyFilter === f
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-slate-500 text-xs">
            No completed solo trade logs found for selected filter.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Scrollable Cards Grid */}
            <div className="max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {paginatedHistory.map((trade) => {
                  const isWon = trade.status === "WON";
                  const isDraw = trade.status === "DRAW";
                  const shortId = trade.id.slice(-6).toUpperCase();
                  const startDate = new Date(trade.startTime);
                  const endDate = new Date(trade.endTime || trade.settledAt);

                  return (
                    <div
                      key={trade.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isWon
                          ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/40 shadow-xs"
                          : isDraw
                          ? "bg-slate-100/60 dark:bg-slate-950/80 border-slate-300 dark:border-slate-700/60 shadow-xs"
                          : "bg-rose-50/60 dark:bg-rose-950/20 border-rose-300 dark:border-rose-500/40 shadow-xs"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                            #{shortId}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded uppercase font-mono ${
                            trade.tradeType === "CALL"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40"
                              : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/40"
                          }`}>
                            {trade.tradeType}
                          </span>
                        </div>

                        <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full uppercase font-mono ${
                          isWon
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40"
                            : isDraw
                            ? "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                            : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/40"
                        }`}>
                          {trade.status}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-slate-900 dark:text-white font-mono mb-2 flex items-center justify-between">
                        <span>{trade.assetPair}</span>
                        <div className="flex items-center gap-1">
                          <span className={`text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded border ${
                            trade.drawRule === "REFUND"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                              : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30"
                          }`}>
                            {trade.drawRule === "REFUND" ? "Protected Mode" : "Standard Mode"}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                            {trade.payoutPercentage}% Payout
                          </span>
                        </div>
                      </div>

                      {/* Trade Details Grid with Entry & Exit Price & Times */}
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono p-2.5 bg-white dark:bg-slate-950/90 rounded-xl border border-slate-200 dark:border-slate-800/80 mb-2">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Stake</span>
                          <span className="font-bold text-slate-900 dark:text-white">₹{trade.stake}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Duration</span>
                          <span className="font-bold text-slate-900 dark:text-white">{trade.durationSeconds}s</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Entry Price</span>
                          <span className="font-bold text-slate-900 dark:text-white">{formatAssetPrice(trade.entryPrice, trade.assetPair || trade.tradingSymbol)}</span>
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400/90 block font-normal mt-0.5">
                            ⏱ In: {startDate.toLocaleTimeString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Exit Price</span>
                          <span className={`font-bold ${isWon ? "text-emerald-600 dark:text-emerald-400" : isDraw ? "text-slate-600 dark:text-slate-300" : "text-rose-600 dark:text-rose-400"}`}>
                            {trade.exitPrice !== null && trade.exitPrice !== undefined ? formatAssetPrice(trade.exitPrice, trade.assetPair || trade.tradingSymbol) : "N/A"}
                          </span>
                          <span className="text-[9px] text-amber-600 dark:text-amber-400/90 block font-normal mt-0.5">
                            🏁 Out: {endDate.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono pt-1">
                        <span className="text-slate-500 dark:text-slate-400">Profit / Loss:</span>
                        <strong className={`font-extrabold ${
                          (trade.profitOrLoss || 0) > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : (trade.profitOrLoss || 0) < 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-slate-600 dark:text-slate-300"
                        }`}>
                          {(trade.profitOrLoss || 0) >= 0 ? "+" : ""}₹{(trade.profitOrLoss || 0).toFixed(2)}
                        </strong>
                      </div>

                      {/* Entry Time & Exit Time Footer */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-900/80">
                        <span className="text-slate-400 dark:text-slate-500">{startDate.toLocaleDateString()}</span>
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                          <span>In: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{startDate.toLocaleTimeString()}</strong></span>
                          <span className="text-slate-400 dark:text-slate-600">|</span>
                          <span>Out: <strong className="text-amber-600 dark:text-amber-400 font-semibold">{endDate.toLocaleTimeString()}</strong></span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800/80 text-xs font-mono">
                <span className="text-slate-500 dark:text-slate-400">
                  Page <strong className="text-slate-900 dark:text-white">{currentPage}</strong> of <strong className="text-slate-900 dark:text-white">{totalPages}</strong> ({filteredHistory.length} Total Logs)
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Admin Price Fix Modal */}
      {isQuickFixModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-500/30 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20 dark:border-indigo-500/30">
                  <Wrench className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white font-mono">
                    Fix Pair Price: {currentAsset.pair}
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Align platform price with live TradingView chart
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickFixModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase font-mono mb-1">
                  Target Price (₹ / USD)
                </label>
                <input
                  type="number"
                  step="any"
                  value={quickFixPriceInput}
                  onChange={(e) => setQuickFixPriceInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. 4075.53"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase font-mono mb-1">
                    Protected Payout (%)
                  </label>
                  <input
                    type="number"
                    value={quickFixProtectedPayoutInput}
                    onChange={(e) => setQuickFixProtectedPayoutInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-indigo-500"
                    placeholder="80"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase font-mono mb-1">
                    Standard Payout (%)
                  </label>
                  <input
                    type="number"
                    value={quickFixStandardPayoutInput}
                    onChange={(e) => setQuickFixStandardPayoutInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none focus:border-indigo-500"
                    placeholder="85"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/20 rounded-xl text-[11px] text-indigo-700 dark:text-indigo-300 font-mono">
                💡 Locking the price ensures background feeds won't overwrite it. You can unlock or change it anytime in Admin Panel or here.
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleSaveQuickFixPrice(false)}
                disabled={isSavingPriceFix}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer"
              >
                Update Price
              </button>
              <button
                type="button"
                onClick={() => handleSaveQuickFixPrice(true)}
                disabled={isSavingPriceFix}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1 shadow-lg"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Lock & Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
