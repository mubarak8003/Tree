import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  Maximize2,
  Minimize2,
  RefreshCw,
  Sliders,
  Eye,
  EyeOff,
  Activity,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Play,
  Settings,
  Plus
} from "lucide-react";
import { livePriceService, formatAssetPrice, SUPPORTED_SOLO_ASSETS } from "../services/livePriceService";
import { SoloTrade } from "../types";
import {
  DrawingToolType,
  DrawingObject,
  DrawingPoint,
  DrawingStyle,
  IndicatorConfig,
  IndicatorType
} from "../types/chart";
import { calculateIndicator, DEFAULT_INDICATOR_CONFIGS } from "../chart/indicators/calculator";
import {
  hitTestDrawing,
  renderDrawing,
  snapPointToCandles,
  ChartCoordinateTransform
} from "../chart/drawing/drawingEngine";
import { DrawingToolbar } from "../chart/drawing/DrawingToolbar";
import { DrawingSettingsModal } from "../chart/drawing/DrawingSettingsModal";
import { IndicatorsModal } from "../chart/indicators/IndicatorsModal";
import { IndicatorPanel } from "../chart/indicators/IndicatorPanel";
import {
  loadGlobalIndicators,
  saveGlobalIndicators,
  loadSymbolDrawings,
  saveSymbolDrawings,
  loadChartState,
  saveChartState
} from "../chart/persistence/chartPersistence";

export interface Candle {
  time: number; // timestamp in ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  pattern?: string;
  signal?: "CALL" | "PUT";
}

/**
 * Real-time Candlestick Pattern Detector
 * Computes price action patterns (Hammer, Shooting Star, Doji, Marubozu, Engulfing, etc.)
 * live on tick updates and on completed candle rolls.
 */
export function detectCandlePattern(
  c: Candle,
  prevCandle?: Candle
): { pattern?: string; signal?: "CALL" | "PUT" } {
  if (!c || c.open <= 0 || c.close <= 0 || c.high <= 0 || c.low <= 0) {
    return {};
  }
  const range = c.high - c.low;
  if (range <= 0) return {};

  const body = Math.abs(c.close - c.open);
  const isBullish = c.close >= c.open;
  const upperShadow = c.high - Math.max(c.open, c.close);
  const lowerShadow = Math.min(c.open, c.close) - c.low;
  const bodyRatio = body / range;
  const upperRatio = upperShadow / range;
  const lowerRatio = lowerShadow / range;

  // 1. Hammer (Bullish Reversal: Long lower shadow, small body near top, minimal upper wick)
  if (lowerRatio >= 0.55 && bodyRatio <= 0.35 && upperRatio <= 0.15) {
    return { pattern: "Hammer 🔨", signal: "CALL" };
  }

  // 2. Inverted Hammer / Shooting Star (Long upper shadow, small body near bottom)
  if (upperRatio >= 0.55 && bodyRatio <= 0.35 && lowerRatio <= 0.15) {
    if (isBullish) {
      return { pattern: "Inv Hammer 🔨", signal: "CALL" };
    } else {
      return { pattern: "Shooting Star 🌠", signal: "PUT" };
    }
  }

  // 3. Dragonfly Doji (Open ≈ Close ≈ High, very long lower shadow)
  if (bodyRatio <= 0.08 && lowerRatio >= 0.65 && upperRatio <= 0.10) {
    return { pattern: "Dragonfly 🧗", signal: "CALL" };
  }

  // 4. Gravestone Doji (Open ≈ Close ≈ Low, very long upper shadow)
  if (bodyRatio <= 0.08 && upperRatio >= 0.65 && lowerRatio <= 0.10) {
    return { pattern: "Gravestone 🪦", signal: "PUT" };
  }

  // 5. Classic Doji (Virtually no body, balanced upper & lower shadows)
  if (bodyRatio <= 0.08 && upperRatio >= 0.22 && lowerRatio >= 0.22) {
    return { pattern: "Doji ⚖️" };
  }

  // 6. Bullish Marubozu (Massive solid green body, virtually no wicks)
  if (isBullish && bodyRatio >= 0.82) {
    return { pattern: "Bull Marubozu 🟢", signal: "CALL" };
  }

  // 7. Bearish Marubozu (Massive solid red body, virtually no wicks)
  if (!isBullish && bodyRatio >= 0.82) {
    return { pattern: "Bear Marubozu 🔴", signal: "PUT" };
  }

  // 8. Bullish Engulfing
  if (prevCandle && prevCandle.close < prevCandle.open && isBullish) {
    if (c.open <= prevCandle.close && c.close >= prevCandle.open && body > (prevCandle.open - prevCandle.close)) {
      return { pattern: "Bull Engulfing 🚀", signal: "CALL" };
    }
  }

  // 9. Bearish Engulfing
  if (prevCandle && prevCandle.close > prevCandle.open && !isBullish) {
    if (c.open >= prevCandle.close && c.close <= prevCandle.open && body > (prevCandle.close - prevCandle.open)) {
      return { pattern: "Bear Engulfing 💥", signal: "PUT" };
    }
  }

  // 10. Spinning Top
  if (bodyRatio >= 0.10 && bodyRatio <= 0.35 && upperRatio >= 0.22 && lowerRatio >= 0.22) {
    return { pattern: "Spinning Top 🌪️" };
  }

  return {};
}

interface QuotexProChartProps {
  currentSymbol: string;
  currentPairName: string;
  decimals?: number;
  payoutPercentage?: number;
  activeTrades?: SoloTrade[];
  onSelectAsset?: (symbol: string, pair: string) => void;
  onPlaceQuickTrade?: (type: "CALL" | "PUT") => void;
  className?: string;
  isDarkMode?: boolean;
}

export const QuotexProChart: React.FC<QuotexProChartProps> = ({
  currentSymbol,
  currentPairName,
  decimals = 5,
  payoutPercentage = 85,
  activeTrades = [],
  onSelectAsset,
  onPlaceQuickTrade,
  className = "",
  isDarkMode
}) => {
  // Chart Display Configuration
  const [timeframeSec, setTimeframeSec] = useState<number>(60); // 5, 15, 30, 60, 300, 900
  const [chartType, setChartType] = useState<"candles" | "area">("candles");
  const [showSignals, setShowSignals] = useState<boolean>(true);
  const [showPatternLabels, setShowPatternLabels] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("chart_show_pattern_labels");
      return saved !== null ? saved === "true" : false; // Default OFF as requested by user
    } catch (_) {
      return false;
    }
  });
  const [showActiveTrades, setShowActiveTrades] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"quotex" | "tradingview">("quotex");

  // Technical Indicators State (Applied Globally across all Assets and Timeframes)
  const [indicators, setIndicators] = useState<IndicatorConfig[]>(() => {
    return loadGlobalIndicators();
  });
  const [isIndicatorsModalOpen, setIsIndicatorsModalOpen] = useState<boolean>(false);

  // Drawings State (Persisted per Symbol and Timeframe)
  const [drawings, setDrawings] = useState<DrawingObject[]>(() => {
    return loadSymbolDrawings(currentSymbol, 60);
  });
  const [activeDrawingTool, setActiveDrawingTool] = useState<DrawingToolType>("cursor");
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [isDrawingSettingsOpen, setIsDrawingSettingsOpen] = useState<boolean>(false);

  // Undo / Redo stacks
  const [undoStack, setUndoStack] = useState<DrawingObject[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawingObject[][]>([]);

  // Canvas & Interaction States
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [canvasWidth, setCanvasWidth] = useState<number>(800);
  const candlesRef = useRef<Candle[]>([]);
  const [candlesVersion, setCandlesVersion] = useState<number>(0);
  const hoverDataRef = useRef<{ candle: Candle | null; x: number; y: number; price: number | null } | null>(null);

  // Zoom & Pan offset
  const [visibleCandlesCount, setVisibleCandlesCount] = useState<number>(45);
  const [panOffset, setPanOffset] = useState<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartOffsetRef = useRef<number>(0);

  // Drawing in progress interaction state
  const drawingInProgressRef = useRef<DrawingObject | null>(null);
  const draggingHandleIndexRef = useRef<number | null>(null);
  const isDraggingDrawingBodyRef = useRef<boolean>(false);
  const dragDrawingAnchorRef = useRef<DrawingPoint | null>(null);
  const lastTapTimeRef = useRef<number>(0);

  // Live Price & Tick Tracking
  const [livePrice, setLivePrice] = useState<number>(() => {
    return livePriceService.getPrice(currentSymbol) || 100;
  });
  const [prevPrice, setPrevPrice] = useState<number>(livePrice);
  const [candleSecondsRemaining, setCandleSecondsRemaining] = useState<number>(60);
  const [candleCountdown, setCandleCountdown] = useState<string>("00:00");
  const candleCountdownRef = useRef<string>("00:00");
  const [latencyMs, setLatencyMs] = useState<number>(15);
  const [isLoadingCandles, setIsLoadingCandles] = useState<boolean>(false);

  // Live Candle Countdown Timer & Wall-Clock Heartbeat Synchronizer
  // Lightweight second-by-second React state updater for external consumers
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const nowSec = Math.floor(now / 1000);
      const elapsed = nowSec % timeframeSec;
      const remaining = Math.max(1, timeframeSec - elapsed);
      setCandleSecondsRemaining(remaining);
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      const formatted = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
      setCandleCountdown(formatted);
      candleCountdownRef.current = formatted;
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [timeframeSec]);

  // 60 FPS Smooth Interpolation Refs
  const renderPriceRef = useRef<number>(livePrice);
  const targetPriceRef = useRef<number>(livePrice);

  // Touch & Pointer gesture tracking state
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(45);
  const dragStartYRef = useRef<number>(0);
  const isHorizontalPanRef = useRef<boolean>(false);

  // Active Symbol, Monotonic Request Sequence & Outlier Protection Refs
  const activeSymbolRef = useRef<string>(currentSymbol);
  const switchSeqRef = useRef<number>(0);
  const lastValidPricesBySymbolRef = useRef<Map<string, number>>(new Map());
  const candleHistoryCacheRef = useRef<Map<string, Candle[]>>(new Map());

  // Coordinate transform cached ref for drawing engine
  const transformRef = useRef<ChartCoordinateTransform>({
    timeToX: () => 0,
    xToTime: () => 0,
    priceToY: () => 0,
    yToPrice: () => 0,
    candleWidth: 10,
    width: 800,
    height: 400
  });

  // Track container width for responsive indicator sub-panels
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setCanvasWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Filter active trades strictly for currently viewed asset
  const matchingActiveTrades = useMemo(() => {
    const cleanCur = currentSymbol.toUpperCase().replace(/^(BINANCE:|OANDA:|FX:|TVC:|CAPITALCOM:|CURRENCYCOM:|GLOBALPRIME:|FX_IDC:|FOREXCOM:|NSE:|DERIV:)/, "").replace(/[^A-Z0-9]/g, "");
    return activeTrades.filter((t) => {
      const cleanTradeSym = (t.tradingSymbol || "").toUpperCase().replace(/^(BINANCE:|OANDA:|FX:|TVC:|CAPITALCOM:|CURRENCYCOM:|GLOBALPRIME:|FX_IDC:|FOREXCOM:|NSE:|DERIV:)/, "").replace(/[^A-Z0-9]/g, "");
      const cleanTradePair = (t.assetPair || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      return (
        cleanTradeSym === cleanCur ||
        cleanTradePair.includes(cleanCur) ||
        cleanCur.includes(cleanTradeSym) ||
        t.tradingSymbol === currentSymbol ||
        t.assetPair === currentPairName
      );
    });
  }, [activeTrades, currentSymbol, currentPairName]);

  // Load symbol and timeframe specific drawings on change (active indicators remain intact across all pairs/timeframes)
  useEffect(() => {
    const symDrawings = loadSymbolDrawings(currentSymbol, timeframeSec);
    setDrawings(symDrawings);
    setSelectedDrawingId(null);
    drawingInProgressRef.current = null;
    setUndoStack([]);
    setRedoStack([]);
  }, [currentSymbol, timeframeSec]);

  // Save drawings state for current symbol and timeframe
  const saveDrawingsState = useCallback(
    (newDrawings: DrawingObject[]) => {
      saveSymbolDrawings(currentSymbol, newDrawings, timeframeSec);
    },
    [currentSymbol, timeframeSec]
  );

  // Undo / Redo helpers
  const pushUndoState = useCallback(
    (newDrawings: DrawingObject[]) => {
      setUndoStack((prev) => [...prev.slice(-20), drawings]);
      setRedoStack([]);
      setDrawings(newDrawings);
      saveDrawingsState(newDrawings);
    },
    [drawings, saveDrawingsState]
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, drawings]);
    setDrawings(previous);
    saveDrawingsState(previous);
  }, [undoStack, drawings, saveDrawingsState]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, drawings]);
    setDrawings(next);
    saveDrawingsState(next);
  }, [redoStack, drawings, saveDrawingsState]);

  // Delete selected drawing
  const handleDeleteSelectedDrawing = useCallback(() => {
    if (!selectedDrawingId) return;
    const filtered = drawings.filter((d) => d.id !== selectedDrawingId);
    pushUndoState(filtered);
    setSelectedDrawingId(null);
    setIsDrawingSettingsOpen(false);
  }, [selectedDrawingId, drawings, pushUndoState]);

  // Delete all drawings
  const handleDeleteAllDrawings = useCallback(() => {
    drawingInProgressRef.current = null;
    draggingHandleIndexRef.current = null;
    isDraggingDrawingBodyRef.current = false;
    dragDrawingAnchorRef.current = null;
    setSelectedDrawingId(null);
    setIsDrawingSettingsOpen(false);
    setActiveDrawingTool("cursor");
    pushUndoState([]);
  }, [pushUndoState]);

  // Indicator Handlers (Applied across all assets & timeframes)
  const handleAddIndicator = useCallback(
    (type: IndicatorType, presetParams?: Record<string, any>) => {
      const template = DEFAULT_INDICATOR_CONFIGS[type];
      if (!template) return;
      const newConfig: IndicatorConfig = {
        id: `${type.toLowerCase()}_${Date.now()}`,
        ...template,
        params: { ...template.params, ...(presetParams || {}) }
      };
      setIndicators((prev) => {
        const updated = [...prev, newConfig];
        saveGlobalIndicators(updated);
        return updated;
      });
    },
    []
  );

  const handleUpdateIndicator = useCallback(
    (config: IndicatorConfig) => {
      setIndicators((prev) => {
        const updated = prev.map((ind) => (ind.id === config.id ? config : ind));
        saveGlobalIndicators(updated);
        return updated;
      });
    },
    []
  );

  const handleRemoveIndicator = useCallback(
    (id: string) => {
      setIndicators((prev) => {
        const updated = prev.filter((ind) => ind.id !== id);
        saveGlobalIndicators(updated);
        return updated;
      });
    },
    []
  );

  const handleToggleIndicatorVisibility = useCallback(
    (id: string) => {
      setIndicators((prev) => {
        const updated = prev.map((ind) => (ind.id === id ? { ...ind, visible: !ind.visible } : ind));
        saveGlobalIndicators(updated);
        return updated;
      });
    },
    []
  );

  const handleResetIndicator = useCallback(
    (id: string) => {
      const ind = indicators.find((i) => i.id === id);
      if (!ind) return;
      const template = DEFAULT_INDICATOR_CONFIGS[ind.type];
      if (!template) return;
      const resetConfig: IndicatorConfig = {
        ...ind,
        params: { ...template.params },
        styles: { ...template.styles }
      };
      handleUpdateIndicator(resetConfig);
    },
    [indicators, handleUpdateIndicator]
  );

  const handleResizeIndicatorPanel = useCallback(
    (id: string, height: number) => {
      setIndicators((prev) => {
        const updated = prev.map((ind) => (ind.id === id ? { ...ind, panelHeight: height } : ind));
        saveGlobalIndicators(updated);
        return updated;
      });
    },
    []
  );

  // Overlay Indicators calculation
  const overlayIndicatorsResults = useMemo(() => {
    const activeOverlays = indicators.filter((ind) => ind.visible && ind.isOverlay);
    return activeOverlays.map((ind) => ({
      config: ind,
      result: calculateIndicator(ind, candlesRef.current)
    }));
  }, [indicators, candlesVersion, currentSymbol, timeframeSec, livePrice]);

  // Sub-panel indicators
  const subPanelIndicators = useMemo(() => {
    return indicators.filter((ind) => ind.visible && !ind.isOverlay);
  }, [indicators]);

  // Initialize Real Market Candle History dynamically with smooth loading state on pair change
  useEffect(() => {
    let isCancelled = false;
    const currentSeq = ++switchSeqRef.current;
    activeSymbolRef.current = currentSymbol;
    setPanOffset(0);

    // Guarantee active Deriv WebSocket tick subscription for the selected symbol
    livePriceService.subscribeSymbolToDeriv(currentSymbol);

    const initialPrice = livePriceService.getPrice(currentSymbol) || 0;
    if (initialPrice > 0) {
      lastValidPricesBySymbolRef.current.set(currentSymbol, initialPrice);
      renderPriceRef.current = initialPrice;
      targetPriceRef.current = initialPrice;
      setLivePrice(initialPrice);
    }

    const cacheKey = `${currentSymbol}_${timeframeSec}`;
    const liveServiceCached = livePriceService.getCachedCandles(currentSymbol, timeframeSec);

    let hasImmediateCandles = false;
    if (candleHistoryCacheRef.current.has(cacheKey)) {
      const cached = candleHistoryCacheRef.current.get(cacheKey)!;
      // Ensure cached candles match current symbol's price level to prevent cross-asset corruption
      const firstValidClose = cached.length > 0 ? cached[cached.length - 1].close : 0;
      const isCachePriceValid = initialPrice <= 0 || (firstValidClose > 0 && Math.abs(firstValidClose - initialPrice) / initialPrice < 0.25);

      if (cached.length > 0 && isCachePriceValid) {
        candlesRef.current = [...cached];
        setCandlesVersion((v) => v + 1);
        hasImmediateCandles = true;
        const last = cached[cached.length - 1];
        const activeLive = livePriceService.getPrice(currentSymbol);
        if (activeLive && activeLive > 0) {
          lastValidPricesBySymbolRef.current.set(currentSymbol, activeLive);
          renderPriceRef.current = activeLive;
          targetPriceRef.current = activeLive;
          setLivePrice(activeLive);
        } else if (last && last.close > 0) {
          lastValidPricesBySymbolRef.current.set(currentSymbol, last.close);
          renderPriceRef.current = last.close;
          targetPriceRef.current = last.close;
          setLivePrice(last.close);
        }
      } else {
        candleHistoryCacheRef.current.delete(cacheKey);
      }
    } else if (liveServiceCached && liveServiceCached.length > 0) {
      const formatted = liveServiceCached.map((c: any) => {
        const o = Number(c.open);
        const cl = Number(c.close);
        const h = Math.max(o, cl, Number(c.high) || o);
        const l = Math.min(o, cl, Number(c.low) > 0 ? Number(c.low) : o);
        return {
          time: Number(c.time),
          open: o,
          high: h,
          low: l,
          close: cl,
          volume: Number(c.volume) || 10
        };
      });
      const firstValidClose = formatted.length > 0 ? formatted[formatted.length - 1].close : 0;
      const isCachePriceValid = initialPrice <= 0 || (firstValidClose > 0 && Math.abs(firstValidClose - initialPrice) / initialPrice < 0.25);

      if (formatted.length > 0 && isCachePriceValid) {
        candlesRef.current = formatted;
        candleHistoryCacheRef.current.set(cacheKey, formatted);
        setCandlesVersion((v) => v + 1);
        hasImmediateCandles = true;
        const last = formatted[formatted.length - 1];
        const activeLive = livePriceService.getPrice(currentSymbol);
        if (activeLive && activeLive > 0) {
          lastValidPricesBySymbolRef.current.set(currentSymbol, activeLive);
          renderPriceRef.current = activeLive;
          targetPriceRef.current = activeLive;
          setLivePrice(activeLive);
        } else if (last && last.close > 0) {
          lastValidPricesBySymbolRef.current.set(currentSymbol, last.close);
          renderPriceRef.current = last.close;
          targetPriceRef.current = last.close;
          setLivePrice(last.close);
        }
      }
    } else {
      candlesRef.current = [];
    }

    // Only show loading if we don't have immediate cached candles
    if (!hasImmediateCandles) {
      setIsLoadingCandles(true);
    }

    // Absolute safety timer: Loading overlay NEVER stays longer than 450ms under any network condition
    const safetyTimer = setTimeout(() => {
      if (!isCancelled) {
        setIsLoadingCandles(false);
      }
    }, 450);

    const loadRealKlines = async () => {
      try {
        const rawCandles = await livePriceService.fetchHistoricalKlines(currentSymbol, timeframeSec, 250, true);
        if (
          isCancelled ||
          switchSeqRef.current !== currentSeq ||
          activeSymbolRef.current !== currentSymbol
        ) {
          return;
        }

        if (rawCandles && rawCandles.length > 0) {
          const formatted: Candle[] = [];
          for (let i = 0; i < rawCandles.length; i++) {
            const c = rawCandles[i];
            if (!c || isNaN(c.open) || isNaN(c.close) || c.open <= 0 || c.close <= 0) continue;

            const open = Number(c.open);
            const close = Number(c.close);
            const rawHigh = Number(c.high);
            const rawLow = Number(c.low);

            let high = Math.max(open, close, isFinite(rawHigh) ? rawHigh : open);
            let low = Math.min(open, close, isFinite(rawLow) && rawLow > 0 ? rawLow : open);

            if (high <= low || Math.abs(high - low) < 0.000001) {
              const isJpy = currentSymbol.includes("JPY");
              const pip = isJpy ? 0.005 : Math.max(0.00002, close * 0.000015);
              high = Math.max(open, close) + pip;
              low = Math.min(open, close) - pip;
            }

            const candleObj: Candle = {
              time: Number(c.time),
              open,
              high,
              low,
              close,
              volume: Number(c.volume) || 10
            };
            const prev = formatted.length > 0 ? formatted[formatted.length - 1] : undefined;
            const pat = detectCandlePattern(candleObj, prev);
            candleObj.pattern = pat.pattern;
            candleObj.signal = pat.signal;
            formatted.push(candleObj);
          }

          if (formatted.length > 0) {
            const activeLive = livePriceService.getPrice(currentSymbol);
            const now = Date.now();
            const intervalMs = timeframeSec * 1000;
            const currentCandlePeriod = Math.floor(now / intervalMs) * intervalMs;

            const lastCandle = formatted[formatted.length - 1];
            if (lastCandle) {
              if (lastCandle.time >= currentCandlePeriod) {
                // The last candle is already the active forming candle directly from exchange
                if (activeLive && activeLive > 0) {
                  lastCandle.close = activeLive;
                  lastCandle.high = Math.max(lastCandle.high, activeLive);
                  if (lastCandle.low <= 0 || isNaN(lastCandle.low) || (lastCandle.open > 0 && lastCandle.low < lastCandle.open * 0.80)) {
                    lastCandle.low = Math.min(lastCandle.open, activeLive);
                  } else {
                    lastCandle.low = Math.min(lastCandle.low, activeLive);
                  }
                }
              } else {
                // Historical data ended on previous closed period; append new active candle
                const curP = (activeLive && activeLive > 0) ? activeLive : lastCandle.close;
                const openP = lastCandle.close > 0 ? lastCandle.close : curP;
                const newCandle: Candle = {
                  time: currentCandlePeriod,
                  open: openP,
                  high: Math.max(openP, curP),
                  low: Math.min(openP, curP),
                  close: curP,
                  volume: 1
                };
                formatted.push(newCandle);
              }
            }

            const currentActiveCandle = formatted[formatted.length - 1];
            const finalPrice = currentActiveCandle ? currentActiveCandle.close : (activeLive || 100.0);

            lastValidPricesBySymbolRef.current.set(currentSymbol, finalPrice);
            renderPriceRef.current = finalPrice;
            targetPriceRef.current = finalPrice;
            setLivePrice(finalPrice);

            candlesRef.current = formatted;
            candleHistoryCacheRef.current.set(cacheKey, formatted);
            setCandlesVersion((v) => v + 1);
          }
        }
      } catch (err) {
        console.warn("Failed to load historical klines:", err);
      } finally {
        if (!isCancelled) {
          setIsLoadingCandles(false);
        }
      }
    };

    loadRealKlines();
    return () => {
      isCancelled = true;
      clearTimeout(safetyTimer);
      setIsLoadingCandles(false);
    };
  }, [currentSymbol, timeframeSec]);

    // App / Tab Resume Synchronizer (Visibility & Focus)
  // When user returns from another app/tab:
  // Silently ensure WebSocket connections are alive without wiping or replacing canvas candles
  useEffect(() => {
    const handleResume = () => {
      if (document.visibilityState === "visible") {
        livePriceService.reconnectAndRefresh();
      }
    };

    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        livePriceService.reconnectAndRefresh();
      }
    };

    document.addEventListener("visibilitychange", handleResume);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleResume);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // Subscribe to live price stream
  useEffect(() => {
    let lastUiUpdate = 0;
    const unsub = livePriceService.subscribe((prices) => {
      const newPrice = prices[currentSymbol] ?? livePriceService.getPrice(currentSymbol);
      if (typeof newPrice === "number" && !isNaN(newPrice) && isFinite(newPrice) && newPrice > 0) {
        targetPriceRef.current = newPrice;
        lastValidPricesBySymbolRef.current.set(currentSymbol, newPrice);

        const now = Date.now();
        if (now - lastUiUpdate > 80) {
          lastUiUpdate = now;
          setLivePrice(newPrice);
          setPrevPrice((old) => (old !== newPrice ? old : newPrice));
        }

        const all = candlesRef.current;
        if (all.length > 0) {
          const last = all[all.length - 1];
          // Guard: If the candle in memory belongs to a different asset from previous symbol before re-fetch completed
          if (last && last.close > 0 && Math.abs(newPrice - last.close) / last.close > 0.25) {
            return;
          }

          const intervalMs = timeframeSec * 1000;
          const currentCandlePeriod = Math.floor(now / intervalMs) * intervalMs;

          if (last.time < currentCandlePeriod) {
            // Finalize completed candle
            last.high = Math.max(last.open, last.high, last.close);
            last.low = Math.min(last.open, last.low, last.close);
            const prev = all.length >= 2 ? all[all.length - 2] : undefined;
            const pat = detectCandlePattern(last, prev);
            last.pattern = pat.pattern;
            last.signal = pat.signal;

            // Roll new candle - anchor open strictly to previous candle close to eliminate false gap opens
            const openP = (last && last.close > 0) ? last.close : newPrice;
            all.push({
              time: currentCandlePeriod,
              open: openP,
              high: Math.max(openP, newPrice),
              low: Math.min(openP, newPrice),
              close: newPrice,
              volume: 1
            });
            if (all.length > 300) all.shift();
          } else {
            // Update active candle and calculate live forming pattern
            last.close = newPrice;
            last.high = Math.max(last.high, newPrice);
            // Protect last.low from anomalous spikes
            if (last.low <= 0 || isNaN(last.low) || (last.open > 0 && last.low < last.open * 0.80)) {
              last.low = Math.min(last.open, newPrice);
            } else {
              last.low = Math.min(last.low, newPrice);
            }
            last.volume = (last.volume || 1) + 1;
            const prev = all.length >= 2 ? all[all.length - 2] : undefined;
            const pat = detectCandlePattern(last, prev);
            last.pattern = pat.pattern;
            last.signal = pat.signal;
          }
        }
      }
    });

    return () => {
      unsub();
    };
  }, [currentSymbol, timeframeSec]);

  // Main Canvas Rendering Engine
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const renderChart = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;
      const paddingRight = 78;
      const paddingBottom = 26;
      const chartWidth = width - paddingRight;
      const chartHeight = height - paddingBottom;

      // Smooth 60 FPS Micro-Lerp for fluid live candle animation (Quotex-grade fluidity)
      const currentTarget = targetPriceRef.current || livePrice;
      if (!isFinite(renderPriceRef.current) || renderPriceRef.current <= 0 || (currentTarget > 0 && Math.abs(renderPriceRef.current - currentTarget) / currentTarget > 0.05)) {
        renderPriceRef.current = currentTarget;
      } else {
        renderPriceRef.current += (currentTarget - renderPriceRef.current) * 0.22;
      }
      const activeDrawPrice = renderPriceRef.current;

      // 1. Background (Quotex Deep Slate Navy)
      const isDark = document.documentElement.classList.contains("dark");
      ctx.fillStyle = isDark ? "#0D111A" : "#FFFFFF";
      ctx.fillRect(0, 0, width, height);

      // Subtle atmospheric gradient in dark mode
      if (isDark) {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, "#0E131E");
        bgGrad.addColorStop(1, "#0A0D14");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
      }

      const allCandles = candlesRef.current;
      if (allCandles.length === 0) {
        ctx.restore();
        animId = requestAnimationFrame(renderChart);
        return;
      }

      // Timeframe Boundary Clock Synchronizer:
      // Ensures the new candle opens at the exact second interval (e.g. 5s, 15s, 1m) even before the next tick arrives
      const now = Date.now();
      const intervalMs = timeframeSec * 1000;
      const currentCandlePeriod = Math.floor(now / intervalMs) * intervalMs;
      const lastC = allCandles[allCandles.length - 1];

      if (lastC && lastC.time < currentCandlePeriod) {
        lastC.high = Math.max(lastC.open, lastC.high, lastC.close);
        lastC.low = Math.min(lastC.open, lastC.low, lastC.close);
        const prev = allCandles.length >= 2 ? allCandles[allCandles.length - 2] : undefined;
        const pat = detectCandlePattern(lastC, prev);
        lastC.pattern = pat.pattern;
        lastC.signal = pat.signal;

        const openP = lastC.close > 0 ? lastC.close : activeDrawPrice;
        allCandles.push({
          time: currentCandlePeriod,
          open: openP,
          high: openP,
          low: openP,
          close: openP,
          volume: 1
        });
        if (allCandles.length > 300) allCandles.shift();
      }

      // Viewport slice based on zoom & pan
      const totalCandles = allCandles.length;
      const count = Math.min(visibleCandlesCount, totalCandles);
      const endIndex = Math.max(count, Math.min(totalCandles, totalCandles - panOffset));
      const startIndex = Math.max(0, endIndex - count);
      const visibleCandles = allCandles.slice(startIndex, endIndex);

      if (visibleCandles.length === 0) {
        ctx.restore();
        animId = requestAnimationFrame(renderChart);
        return;
      }

      // Min & Max Price Calculation with dynamic volatility floor
      let minP = Infinity;
      let maxP = -Infinity;

      visibleCandles.forEach((c, idx) => {
        const isLast = idx === visibleCandles.length - 1 && panOffset === 0;
        const cHigh = isLast ? Math.max(c.open, c.close, c.high, activeDrawPrice) : c.high;
        const cLow = isLast ? Math.min(c.open, c.close, c.low, activeDrawPrice) : c.low;

        if (isFinite(cLow) && isFinite(cHigh) && cLow > 0 && cHigh >= cLow) {
          if (cLow < minP) minP = cLow;
          if (cHigh > maxP) maxP = cHigh;
        }
      });

      if (isFinite(activeDrawPrice) && activeDrawPrice > 0) {
        if (activeDrawPrice < minP) minP = activeDrawPrice;
        if (activeDrawPrice > maxP) maxP = activeDrawPrice;
      }

      if (!isFinite(minP) || minP <= 0 || minP === Infinity) minP = activeDrawPrice * 0.999;
      if (!isFinite(maxP) || maxP <= 0 || maxP === -Infinity) maxP = activeDrawPrice * 1.001;

      // Matching active trades
      matchingActiveTrades.forEach((t) => {
        if (isFinite(t.entryPrice) && t.entryPrice > 0 && Math.abs(t.entryPrice - activeDrawPrice) / activeDrawPrice < 0.15) {
          if (t.entryPrice < minP) minP = t.entryPrice;
          if (t.entryPrice > maxP) maxP = t.entryPrice;
        }
      });

      // Quotex Pro Dynamic Volatility Floor (prevents squishing or excessive flattening)
      const minDynamicSpan = activeDrawPrice * (activeDrawPrice > 1000 ? 0.0001 : activeDrawPrice > 50 ? 0.0003 : 0.00008);
      let pRange = maxP - minP;
      if (pRange < minDynamicSpan) {
        const mid = (maxP + minP) / 2;
        minP = mid - minDynamicSpan / 2;
        maxP = mid + minDynamicSpan / 2;
        pRange = minDynamicSpan;
      }

      const pBuffer = pRange * 0.14;
      const scaleMin = minP - pBuffer;
      const scaleMax = maxP + pBuffer;
      const scaleRange = scaleMax - scaleMin;

      const getY = (price: number) => {
        return chartHeight - ((price - scaleMin) / scaleRange) * chartHeight;
      };

      const getPriceFromY = (y: number) => {
        return scaleMin + ((chartHeight - y) / chartHeight) * scaleRange;
      };

      // Quotex Right-Headroom: leave 4 empty slots on right so active candle isn't pressed against the axis
      const rightEmptySlots = panOffset === 0 ? 4 : 0;
      const totalSlotCount = visibleCandles.length + rightEmptySlots;
      const candleWidth = chartWidth / totalSlotCount;
      const barWidth = Math.max(3.5, Math.min(24, candleWidth * 0.74));

      // Coordinate transform for drawing engine
      const firstCandleTime = visibleCandles[0].time;
      const lastCandleTime = visibleCandles[visibleCandles.length - 1].time;
      const timeSpan = Math.max(1, lastCandleTime - firstCandleTime);

      const timeToX = (time: number) => {
        const idx = visibleCandles.findIndex((c) => Math.abs(c.time - time) < (timeframeSec * 1000) / 2);
        if (idx >= 0) {
          return idx * candleWidth + candleWidth / 2;
        }
        const ratio = (time - firstCandleTime) / timeSpan;
        return ratio * (visibleCandles.length * candleWidth - candleWidth) + candleWidth / 2;
      };

      const xToTime = (x: number) => {
        const idx = Math.max(0, Math.min(visibleCandles.length - 1, Math.floor(x / candleWidth)));
        return visibleCandles[idx]?.time || Date.now();
      };

      transformRef.current = {
        timeToX,
        xToTime,
        priceToY: getY,
        yToPrice: getPriceFromY,
        candleWidth,
        width: chartWidth,
        height: chartHeight
      };

      // 2. Background Grid (Quotex Clean Precision Grid)
      if (showGrid) {
        ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.05)";
        ctx.lineWidth = 1;

        const gridSteps = 6;
        for (let i = 0; i <= gridSteps; i++) {
          const gPrice = scaleMin + (scaleRange / gridSteps) * i;
          const gY = getY(gPrice);
          ctx.beginPath();
          ctx.moveTo(0, gY);
          ctx.lineTo(chartWidth, gY);
          ctx.stroke();

          ctx.fillStyle = isDark ? "rgba(148, 163, 184, 0.55)" : "rgba(71, 85, 105, 0.85)";
          ctx.font = "10px JetBrains Mono, monospace";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(formatAssetPrice(gPrice, currentSymbol, decimals), chartWidth + 8, gY);
        }

        const timeStep = Math.max(1, Math.floor(visibleCandles.length / 5));
        for (let i = 0; i < visibleCandles.length; i += timeStep) {
          const x = i * candleWidth + candleWidth / 2;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, chartHeight);
          ctx.stroke();

          const c = visibleCandles[i];
          const timeStr = new Date(c.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          ctx.fillStyle = isDark ? "rgba(148, 163, 184, 0.5)" : "rgba(71, 85, 105, 0.75)";
          ctx.font = "9px JetBrains Mono, monospace";
          ctx.textAlign = "center";
          ctx.fillText(timeStr, x, height - 8);
        }
      }

      // 3. Technical Overlay Indicators (EMA, SMA, VWAP, Supertrend, Bollinger Bands)
      overlayIndicatorsResults.forEach(({ config, result }) => {
        if (!result.values) return;

        if (config.type === "BollingerBands") {
          const upper = result.values.upper;
          const middle = result.values.middle;
          const lower = result.values.lower;

          if (upper && lower) {
            ctx.fillStyle = "rgba(56, 189, 248, 0.06)";
            ctx.beginPath();
            visibleCandles.forEach((_, i) => {
              const gIdx = startIndex + i;
              const u = upper[gIdx];
              if (u !== null && u !== undefined) {
                const x = i * candleWidth + candleWidth / 2;
                const y = getY(u);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
            });
            for (let i = visibleCandles.length - 1; i >= 0; i--) {
              const gIdx = startIndex + i;
              const l = lower[gIdx];
              if (l !== null && l !== undefined) {
                const x = i * candleWidth + candleWidth / 2;
                ctx.lineTo(x, getY(l));
              }
            }
            ctx.closePath();
            ctx.fill();
          }

          [
            { arr: middle, style: config.styles.middle || { color: "#38bdf8", lineWidth: 1.5 } },
            { arr: upper, style: config.styles.upper || { color: "#38bdf8", lineWidth: 1, lineStyle: "dashed" } },
            { arr: lower, style: config.styles.lower || { color: "#38bdf8", lineWidth: 1, lineStyle: "dashed" } }
          ].forEach(({ arr, style }) => {
            if (!arr) return;
            ctx.strokeStyle = style.color || "#38bdf8";
            ctx.lineWidth = style.lineWidth || 1;
            if (style.lineStyle === "dashed") ctx.setLineDash([4, 4]);
            else ctx.setLineDash([]);

            ctx.beginPath();
            let started = false;
            visibleCandles.forEach((_, i) => {
              const gIdx = startIndex + i;
              const val = arr[gIdx];
              if (val !== null && val !== undefined) {
                const x = i * candleWidth + candleWidth / 2;
                const y = getY(val);
                if (!started) {
                  ctx.moveTo(x, y);
                  started = true;
                } else {
                  ctx.lineTo(x, y);
                }
              }
            });
            ctx.stroke();
            ctx.setLineDash([]);
          });
        } else if (config.type === "Supertrend") {
          const st = result.values.supertrend;
          const dir = result.values.direction;
          if (st && dir) {
            ctx.lineWidth = config.styles.supertrend?.lineWidth || 2;
            let prevD = 0;

            for (let i = 0; i < visibleCandles.length; i++) {
              const gIdx = startIndex + i;
              const val = st[gIdx];
              const d = dir[gIdx] || 1;
              if (val === null || val === undefined) continue;

              const x = i * candleWidth + candleWidth / 2;
              const y = getY(val);

              ctx.strokeStyle = d === 1 ? "#10b981" : "#ef4444";
              if (i === 0 || d !== prevD) {
                ctx.beginPath();
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x, y);
              }
              prevD = d;
            }
          }
        } else {
          // Standard Single Line Overlays (EMA, SMA, VWAP)
          const key = Object.keys(result.values)[0];
          const arr = result.values[key];
          if (arr) {
            const style = config.styles[key] || { color: "#38bdf8", lineWidth: 2 };
            ctx.strokeStyle = style.color || "#38bdf8";
            ctx.lineWidth = style.lineWidth || 2;
            ctx.beginPath();
            let started = false;
            visibleCandles.forEach((_, i) => {
              const gIdx = startIndex + i;
              const val = arr[gIdx];
              if (val !== null && val !== undefined) {
                const x = i * candleWidth + candleWidth / 2;
                const y = getY(val);
                if (!started) {
                  ctx.moveTo(x, y);
                  started = true;
                } else {
                  ctx.lineTo(x, y);
                }
              }
            });
            ctx.stroke();
          }
        }
      });

      // 4. Area / Candlesticks Chart (Quotex Precision Engine)
      const quotexGreen = "#00B875";
      const quotexRed = "#FF3355";

      if (chartType === "area") {
        const areaGrad = ctx.createLinearGradient(0, 0, 0, chartHeight);
        areaGrad.addColorStop(0, "rgba(0, 184, 117, 0.30)");
        areaGrad.addColorStop(1, "rgba(0, 184, 117, 0.0)");

        ctx.fillStyle = areaGrad;
        ctx.beginPath();
        visibleCandles.forEach((c, i) => {
          const x = i * candleWidth + candleWidth / 2;
          const isLast = i === visibleCandles.length - 1 && panOffset === 0;
          const yVal = isLast && isFinite(activeDrawPrice) ? activeDrawPrice : c.close;
          const y = getY(yVal);
          if (i === 0) ctx.moveTo(x, chartHeight);
          ctx.lineTo(x, y);
        });
        const lastCandleX = (visibleCandles.length - 1) * candleWidth + candleWidth / 2;
        ctx.lineTo(lastCandleX, chartHeight);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "#00B875";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        visibleCandles.forEach((c, i) => {
          const x = i * candleWidth + candleWidth / 2;
          const isLast = i === visibleCandles.length - 1 && panOffset === 0;
          const yVal = isLast && isFinite(activeDrawPrice) ? activeDrawPrice : c.close;
          const y = getY(yVal);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      } else {
        visibleCandles.forEach((c, i) => {
          const isLast = i === visibleCandles.length - 1 && panOffset === 0;
          const candleClose = isLast && isFinite(activeDrawPrice) && activeDrawPrice > 0 ? activeDrawPrice : c.close;
          const candleHigh = isLast ? Math.max(c.open, c.close, c.high, candleClose) : c.high;
          const candleLow = isLast ? Math.min(c.open, c.close, c.low, candleClose) : c.low;
          const candleOpen = c.open;

          const isBullish = candleClose >= candleOpen;
          const x = i * candleWidth + candleWidth / 2;

          const openY = getY(candleOpen);
          const closeY = getY(candleClose);
          const highY = getY(candleHigh);
          const lowY = getY(candleLow);

          const candleTop = Math.min(openY, closeY);
          const candleHeight = Math.max(2.5, Math.abs(closeY - openY));
          const color = isBullish ? quotexGreen : quotexRed;

          // Upper and lower wicks (clean single-line wick)
          const wickTopY = Math.min(highY, candleTop);
          const wickBottomY = Math.max(lowY, candleTop + candleHeight);

          ctx.strokeStyle = color;
          ctx.lineWidth = Math.max(1, Math.min(2, barWidth * 0.18));
          ctx.beginPath();
          ctx.moveTo(x, wickTopY);
          ctx.lineTo(x, wickBottomY);
          ctx.stroke();

          // Quotex Soft-Corner Candlestick Body
          ctx.fillStyle = color;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x - barWidth / 2, candleTop, barWidth, candleHeight, Math.min(2, barWidth / 4));
          } else {
            ctx.rect(x - barWidth / 2, candleTop, barWidth, candleHeight);
          }
          ctx.fill();

          if (isLast) {
            ctx.strokeStyle = isBullish ? "rgba(0, 184, 117, 0.9)" : "rgba(255, 51, 85, 0.9)";
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }

          // Signals & Candlestick Pattern Name Overlays
          if (showSignals && showPatternLabels && c.pattern) {
            const isCallSig = c.signal === "CALL";
            const sigY = isCallSig ? lowY + 14 : highY - 14;

            ctx.fillStyle = isCallSig ? quotexGreen : quotexRed;
            ctx.beginPath();
            ctx.arc(x, sigY, 3.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.font = "bold 9px Inter, sans-serif";
            ctx.fillStyle = isCallSig ? "#34D399" : "#FB7185";
            ctx.textAlign = "center";
            ctx.fillText(c.pattern, x, isCallSig ? sigY + 12 : sigY - 6);
          }
        });
      }

      // 5. Render Drawing Objects
      drawings.forEach((drawing) => {
        const isSelected = drawing.id === selectedDrawingId;
        renderDrawing(ctx, drawing, transformRef.current, isSelected);
      });

      // Render drawing in progress
      if (drawingInProgressRef.current) {
        renderDrawing(ctx, drawingInProgressRef.current, transformRef.current, true);
      }

      // 6. Active Trades Overlay
      if (showActiveTrades && matchingActiveTrades.length > 0) {
        matchingActiveTrades.forEach((trade) => {
          const entryY = getY(trade.entryPrice);
          const isWin =
            (trade.tradeType === "CALL" && livePrice > trade.entryPrice) ||
            (trade.tradeType === "PUT" && livePrice < trade.entryPrice);

          ctx.strokeStyle = trade.tradeType === "CALL" ? quotexGreen : quotexRed;
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(0, entryY);
          ctx.lineTo(chartWidth, entryY);
          ctx.stroke();
          ctx.setLineDash([]);

          const tagBg = trade.tradeType === "CALL" ? "#064E3B" : "#881337";
          const tagBorder = trade.tradeType === "CALL" ? quotexGreen : quotexRed;
          ctx.fillStyle = tagBg;
          ctx.strokeStyle = tagBorder;
          ctx.lineWidth = 1;
          ctx.fillRect(chartWidth - 110, entryY - 10, 105, 20);
          ctx.strokeRect(chartWidth - 110, entryY - 10, 105, 20);

          ctx.fillStyle = "#FFFFFF";
          ctx.font = "bold 9px JetBrains Mono, monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const tradeDir = trade.tradeType === "CALL" ? "▲ CALL" : "▼ PUT";
          ctx.fillText(`${tradeDir} ₹${trade.stake} (${isWin ? "+ITM" : "-OTM"})`, chartWidth - 58, entryY);
        });
      }

      // 7. Quotex Pulsating Price Beacon & Laser Price Ray
      const liveY = getY(activeDrawPrice);
      const isUp = activeDrawPrice >= prevPrice;
      const liveThemeColor = isUp ? quotexGreen : quotexRed;

      // Horizontal dashed laser ray across chart
      ctx.strokeStyle = liveThemeColor;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, liveY);
      ctx.lineTo(chartWidth, liveY);
      ctx.stroke();
      ctx.setLineDash([]);

      const lastX = (visibleCandles.length - 1) * candleWidth + candleWidth / 2;

      // Animated Outer Pulsing Halo Ring
      const pulsePhase = (Date.now() % 1200) / 1200; // 0 -> 1
      const pulseRadius = 5 + pulsePhase * 8;
      const pulseAlpha = Math.max(0, 0.45 * (1 - pulsePhase));

      ctx.fillStyle = isUp ? `rgba(0, 184, 117, ${pulseAlpha})` : `rgba(255, 51, 85, ${pulseAlpha})`;
      ctx.beginPath();
      ctx.arc(lastX, liveY, pulseRadius, 0, Math.PI * 2);
      ctx.fill();

      // Solid Core Dot
      ctx.fillStyle = liveThemeColor;
      ctx.beginPath();
      ctx.arc(lastX, liveY, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Right-Axis Price Pill (Quotex Style)
      const pillWidth = 74;
      const pillHeight = 22;
      const pillX = chartWidth + 3;
      const pillY = Math.max(12, Math.min(height - paddingBottom - 12, liveY));

      ctx.fillStyle = liveThemeColor;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(pillX, pillY - pillHeight / 2, pillWidth, pillHeight, 5);
      } else {
        ctx.rect(pillX, pillY - pillHeight / 2, pillWidth, pillHeight);
      }
      ctx.fill();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 10.5px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(formatAssetPrice(activeDrawPrice, currentSymbol, decimals), pillX + pillWidth / 2, pillY);

      // 7b. Quotex Candle Countdown Timer Badge (Amber / Dark Pill Underneath Price)
      const timerPillWidth = 58;
      const timerPillHeight = 16;
      const timerPillX = chartWidth + 3 + (pillWidth - timerPillWidth) / 2;
      const timerPillY = pillY + pillHeight / 2 + 11;

      if (timerPillY + timerPillHeight / 2 < chartHeight + 20) {
        ctx.fillStyle = isDark ? "#121824" : "#F1F5F9";
        ctx.strokeStyle = isDark ? "rgba(245, 158, 11, 0.7)" : "rgba(217, 119, 6, 0.7)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(timerPillX, timerPillY - timerPillHeight / 2, timerPillWidth, timerPillHeight, 4);
        } else {
          ctx.rect(timerPillX, timerPillY - timerPillHeight / 2, timerPillWidth, timerPillHeight);
        }
        ctx.fill();
        ctx.stroke();

        // Exact 60 FPS Clock-synchronized live countdown string (0 lag)
        const nowStamp = Date.now();
        const nowSec = Math.floor(nowStamp / 1000);
        const elapsed = nowSec % timeframeSec;
        const remaining = Math.max(1, timeframeSec - elapsed);
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        const liveTimerString = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
        candleCountdownRef.current = liveTimerString;

        ctx.fillStyle = isDark ? "#FBBF24" : "#B45309";
        ctx.font = "bold 9.5px JetBrains Mono, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(liveTimerString, timerPillX + timerPillWidth / 2, timerPillY);
      }

      // 8. Crosshair on Hover / Touch (Zero-Lag 60 FPS Direct Ref Access)
      const currentHover = hoverDataRef.current;
      if (currentHover && currentHover.y !== undefined) {
        ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.35)";
        ctx.setLineDash([2, 2]);
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(currentHover.x, 0);
        ctx.lineTo(currentHover.x, chartHeight);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, currentHover.y);
        ctx.lineTo(chartWidth, currentHover.y);
        ctx.stroke();
        ctx.setLineDash([]);

        const crosshairPrice = getPriceFromY(currentHover.y);
        ctx.fillStyle = isDark ? "#334155" : "#cbd5e1";
        ctx.beginPath();
        ctx.roundRect(chartWidth + 3, currentHover.y - 9, pillWidth, 18, 4);
        ctx.fill();

        ctx.fillStyle = isDark ? "#E2E8F0" : "#0f172a";
        ctx.font = "9px JetBrains Mono, monospace";
        ctx.fillText(formatAssetPrice(crosshairPrice, currentSymbol, decimals), chartWidth + 3 + pillWidth / 2, currentHover.y);
      }

      ctx.restore();
      animId = requestAnimationFrame(renderChart);
    };

    animId = requestAnimationFrame(renderChart);
    return () => cancelAnimationFrame(animId);
  }, [
    livePrice,
    prevPrice,
    visibleCandlesCount,
    panOffset,
    showGrid,
    showSignals,
    showPatternLabels,
    showActiveTrades,
    chartType,
    matchingActiveTrades,
    overlayIndicatorsResults,
    drawings,
    selectedDrawingId,
    currentSymbol,
    decimals,
    timeframeSec
  ]);

  // Pointer Handlers for Pan, Zoom and Drawings
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Double-tap or double-click to edit drawing style
    const now = Date.now();
    if (now - lastTapTimeRef.current < 300) {
      if (selectedDrawingId) {
        setIsDrawingSettingsOpen(true);
      }
    }
    lastTapTimeRef.current = now;

    // Active Drawing Tool Mode
    if (activeDrawingTool !== "cursor") {
      const snapped = snapPointToCandles(x, y, candlesRef.current, transformRef.current);
      const newDrawing: DrawingObject = {
        id: `draw_${Date.now()}`,
        type: activeDrawingTool,
        points: [snapped, snapped],
        style: {
          color: "#38bdf8",
          lineWidth: 2,
          lineStyle: "solid",
          opacity: 1,
          fillColor: "rgba(56, 189, 248, 0.15)",
          text: activeDrawingTool === "text" ? "Note" : undefined,
          fontSize: 12
        },
        symbol: currentSymbol,
        timeframeSec,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      drawingInProgressRef.current = newDrawing;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (_) {}
      return;
    }

    // Cursor Mode: Check for hit on existing drawings or handles
    let hitFound = false;
    for (let i = drawings.length - 1; i >= 0; i--) {
      const d = drawings[i];
      const hitRes = hitTestDrawing(x, y, d, transformRef.current);
      if (hitRes.hit) {
        hitFound = true;
        setSelectedDrawingId(d.id);

        if (hitRes.handleIndex !== undefined) {
          draggingHandleIndexRef.current = hitRes.handleIndex;
        } else {
          isDraggingDrawingBodyRef.current = true;
          dragDrawingAnchorRef.current = snapPointToCandles(x, y, candlesRef.current, transformRef.current);
        }

        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch (_) {}
        break;
      }
    }

    if (!hitFound) {
      setSelectedDrawingId(null);
      // Initiate Pan / Zoom
      if (pointersRef.current.size === 1) {
        dragStartXRef.current = e.clientX;
        dragStartYRef.current = e.clientY;
        dragStartOffsetRef.current = panOffset;
        isHorizontalPanRef.current = false;
        isDraggingRef.current = false;

        if (e.pointerType === "mouse") {
          isDraggingRef.current = true;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch (_) {}
        }
      } else if (pointersRef.current.size === 2) {
        isDraggingRef.current = false;
        const pts = Array.from(pointersRef.current.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        pinchStartDistRef.current = dist;
        pinchStartZoomRef.current = visibleCandlesCount;
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const chartWidth = rect.width - 75;

    // Drawing in progress update
    if (drawingInProgressRef.current) {
      const snapped = snapPointToCandles(x, y, candlesRef.current, transformRef.current);
      const inProg = drawingInProgressRef.current;
      if (inProg.type === "parallel_channel" && inProg.points.length === 3) {
        inProg.points[2] = snapped;
      } else {
        inProg.points[1] = snapped;
      }
      return;
    }

    // Dragging drawing vertex handle
    if (selectedDrawingId && draggingHandleIndexRef.current !== null) {
      const snapped = snapPointToCandles(x, y, candlesRef.current, transformRef.current);
      const idx = draggingHandleIndexRef.current;
      setDrawings((prev) =>
        prev.map((d) => {
          if (d.id === selectedDrawingId) {
            const nextPts = [...d.points];
            nextPts[idx] = snapped;
            return { ...d, points: nextPts, updatedAt: Date.now() };
          }
          return d;
        })
      );
      return;
    }

    // Dragging drawing body
    if (selectedDrawingId && isDraggingDrawingBodyRef.current && dragDrawingAnchorRef.current) {
      const currentPoint = snapPointToCandles(x, y, candlesRef.current, transformRef.current);
      const dTime = currentPoint.time - dragDrawingAnchorRef.current.time;
      const dPrice = currentPoint.price - dragDrawingAnchorRef.current.price;

      if (dTime !== 0 || dPrice !== 0) {
        setDrawings((prev) =>
          prev.map((d) => {
            if (d.id === selectedDrawingId) {
              const movedPts = d.points.map((p) => ({
                time: p.time + dTime,
                price: p.price + dPrice
              }));
              return { ...d, points: movedPts, updatedAt: Date.now() };
            }
            return d;
          })
        );
        dragDrawingAnchorRef.current = currentPoint;
      }
      return;
    }

    // Pinch Zoom
    if (pointersRef.current.size === 2 && pinchStartDistRef.current) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (dist > 5) {
        const ratio = pinchStartDistRef.current / dist;
        const newZoom = Math.round(pinchStartZoomRef.current * ratio);
        setVisibleCandlesCount(Math.max(15, Math.min(120, newZoom)));
      }
      return;
    }

    // Chart Pan
    if (e.pointerType === "touch" && pointersRef.current.size === 1) {
      const deltaX = e.clientX - dragStartXRef.current;
      const deltaY = e.clientY - dragStartYRef.current;

      if (!isHorizontalPanRef.current) {
        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 5) {
          isDraggingRef.current = false;
          return;
        }
        if (Math.abs(deltaX) > Math.abs(deltaY) + 4 && Math.abs(deltaX) > 10) {
          isHorizontalPanRef.current = true;
          isDraggingRef.current = true;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch (_) {}
        }
      }
    }

    if (isDraggingRef.current) {
      const deltaX = e.clientX - dragStartXRef.current;
      const candleWidth = chartWidth / visibleCandlesCount;
      const offsetDiff = Math.round(deltaX / candleWidth);
      const maxOffset = Math.max(0, candlesRef.current.length - visibleCandlesCount);
      const newOffset = Math.max(0, Math.min(maxOffset, dragStartOffsetRef.current + offsetDiff));
      setPanOffset(newOffset);
    } else {
      const allCandles = candlesRef.current;
      const total = allCandles.length;
      const count = Math.min(visibleCandlesCount, total);
      const endIndex = Math.max(count, Math.min(total, total - panOffset));
      const startIndex = Math.max(0, endIndex - count);
      const visible = allCandles.slice(startIndex, endIndex);

      const candleWidth = chartWidth / (visible.length || 1);
      const index = Math.floor(x / candleWidth);

      if (index >= 0 && index < visible.length && x <= chartWidth && y <= rect.height - 26) {
        const c = visible[index];
        hoverDataRef.current = { candle: c, x, y, price: c.close };
      } else {
        hoverDataRef.current = null;
      }
    }
  };

  const handlePointerLeave = () => {
    hoverDataRef.current = null;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
    pointersRef.current.delete(e.pointerId);

    // Finalize drawing in progress
    if (drawingInProgressRef.current) {
      const finished = drawingInProgressRef.current;
      drawingInProgressRef.current = null;
      pushUndoState([...drawings, finished]);
      setSelectedDrawingId(finished.id);
      setActiveDrawingTool("cursor");
    }

    // Finalize handle drag or body move
    if (draggingHandleIndexRef.current !== null || isDraggingDrawingBodyRef.current) {
      draggingHandleIndexRef.current = null;
      isDraggingDrawingBodyRef.current = false;
      dragDrawingAnchorRef.current = null;
      pushUndoState(drawings);
    }

    if (pointersRef.current.size === 0) {
      isDraggingRef.current = false;
      isHorizontalPanRef.current = false;
      pinchStartDistRef.current = null;
    } else if (pointersRef.current.size === 1) {
      const remaining = Array.from(pointersRef.current.values())[0];
      dragStartXRef.current = remaining.x;
      dragStartYRef.current = remaining.y;
      dragStartOffsetRef.current = panOffset;
      isHorizontalPanRef.current = false;
      pinchStartDistRef.current = null;
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setVisibleCandlesCount((prev) => Math.max(15, prev - 4));
    } else {
      setVisibleCandlesCount((prev) => Math.min(100, prev + 4));
    }
  };

  const handleResetZoom = () => {
    setVisibleCandlesCount(45);
    setPanOffset(0);
  };

  const handleStepPan = (direction: "left" | "right") => {
    const maxOffset = Math.max(0, candlesRef.current.length - visibleCandlesCount);
    if (direction === "left") {
      setPanOffset((prev) => Math.min(maxOffset, prev + 15));
    } else {
      setPanOffset((prev) => Math.max(0, prev - 15));
    }
  };

  const selectedDrawing = drawings.find((d) => d.id === selectedDrawingId) || null;

  const cleanSymbol = encodeURIComponent(currentSymbol);
  const tradingViewUrl = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=${cleanSymbol}&interval=${timeframeSec >= 60 ? Math.floor(timeframeSec / 60) : "1"}&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=1e222d&studies=[]&theme=dark&style=1&timezone=Etc%2FUTC&locale=en`;

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col transition-all duration-300 ${className}`}>
      
      {/* 1. TOP HEADER & TELEMETRY TOOLBAR (Clean Single-Row Horizontal Scrollable Strip) */}
      <div className="p-2 sm:p-2.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 overflow-x-auto whitespace-nowrap scrollbar-none flex-nowrap">
        {/* Left: Asset + Live Latency Status */}
        <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs font-black text-slate-900 dark:text-white font-mono truncate max-w-[120px] sm:max-w-none">
              {currentPairName}
            </span>
            <span className="hidden md:inline px-1.5 py-0.5 text-[9px] font-bold rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono shrink-0">
              {currentSymbol}
            </span>
          </div>

          {/* Compact Online Latency Pill */}
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-600 dark:text-emerald-400 font-mono text-[10px] shrink-0" title={`Live Latency: ${latencyMs}ms`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <span className="font-bold">{latencyMs}ms</span>
          </div>
        </div>

        {/* Right: Timeframe Interval, Indicator Toggles & Chart Actions (Single Line Horizontal Strip) */}
        <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
          {/* Technical Indicators Button */}
          {viewMode === "quotex" && (
            <button
              type="button"
              onClick={() => setIsIndicatorsModalOpen(true)}
              className="px-2.5 py-1 bg-sky-500/15 dark:bg-sky-500/20 hover:bg-sky-500/25 dark:hover:bg-sky-500/30 border border-sky-500/30 dark:border-sky-500/40 text-sky-700 dark:text-sky-300 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs shrink-0"
              title="Add Technical Indicators (EMA, RSI, MACD, Bollinger...)"
            >
              <Activity className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />
              <span>Indicators ({indicators.filter((i) => i.visible).length})</span>
            </button>
          )}

          {/* Pattern Names ON/OFF Toggle */}
          {viewMode === "quotex" && (
            <button
              type="button"
              onClick={() => {
                const nextVal = !showPatternLabels;
                setShowPatternLabels(nextVal);
                try {
                  localStorage.setItem("chart_show_pattern_labels", String(nextVal));
                } catch (_) {}
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all border shrink-0 ${
                showPatternLabels
                  ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 dark:text-amber-300 border-amber-500/40 shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800"
              }`}
              title={showPatternLabels ? "Candle Pattern Names: ON (Click to Hide)" : "Candle Pattern Names: OFF (Click to Show on Candles)"}
            >
              <Sparkles className={`h-3.5 w-3.5 ${showPatternLabels ? "text-amber-500 animate-pulse" : "text-slate-400"}`} />
              <span>Patterns: {showPatternLabels ? "ON" : "OFF"}</span>
            </button>
          )}

          {/* Timeframe Interval Buttons */}
          {viewMode === "quotex" && (
            <div className="flex items-center gap-0.5 bg-slate-200/70 dark:bg-slate-900 p-0.5 border border-slate-300 dark:border-slate-800 rounded-xl shrink-0">
              {[
                { label: "5s", sec: 5 },
                { label: "15s", sec: 15 },
                { label: "30s", sec: 30 },
                { label: "1m", sec: 60 },
                { label: "5m", sec: 300 },
                { label: "15m", sec: 900 },
                { label: "1h", sec: 3600 }
              ].map((tf) => (
                <button
                  key={tf.sec}
                  type="button"
                  onClick={() => setTimeframeSec(tf.sec)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    timeframeSec === tf.sec ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          )}

          {/* Chart Style Toggle */}
          {viewMode === "quotex" && (
            <button
              type="button"
              onClick={() => setChartType(chartType === "candles" ? "area" : "candles")}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-xl text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all shrink-0"
              title={chartType === "candles" ? "Switch to Area" : "Switch to Candlesticks"}
            >
              <Layers className="h-3 w-3 text-indigo-500 dark:text-indigo-400 shrink-0" />
              <span className="hidden sm:inline">{chartType === "candles" ? "Candles" : "Area"}</span>
            </button>
          )}

          {/* Expand / Full-Height */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl cursor-pointer shrink-0"
            title={isExpanded ? "Standard Size" : "Tall Full-Height Chart"}
          >
            {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE WITH DESKTOP DRAWING TOOLBAR + CANVAS */}
      <div className="flex flex-row w-full relative">
        {/* Desktop Left Vertical Toolbar */}
        <div className="hidden sm:block">
          <DrawingToolbar
            activeTool={activeDrawingTool}
            onSelectTool={setActiveDrawingTool}
            onDeleteAll={handleDeleteAllDrawings}
            drawingsCount={drawings.length}
            isMobile={false}
          />
        </div>

        {/* Canvas & Indicator Panels Container */}
        <div className="flex-1 flex flex-col min-w-0">
          <div
            ref={containerRef}
            className={`w-full relative bg-white dark:bg-[#0B0E14] overflow-hidden select-none transition-all duration-300 ${
              isExpanded ? "h-[500px] sm:h-[580px] lg:h-[650px]" : "h-[360px] sm:h-[420px]"
            }`}
          >
            {viewMode === "quotex" ? (
              <>
                {/* Mobile Floating Compact Drawing Tools (Only occupies needed area) */}
                <div className="sm:hidden absolute top-2 left-2 z-20">
                  <DrawingToolbar
                    activeTool={activeDrawingTool}
                    onSelectTool={setActiveDrawingTool}
                    onDeleteAll={handleDeleteAllDrawings}
                    drawingsCount={drawings.length}
                    isMobile={true}
                  />
                </div>

                <canvas
                  ref={canvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onPointerLeave={handlePointerLeave}
                  onWheel={handleWheel}
                  style={{ touchAction: "pan-y" }}
                  className="w-full h-full cursor-crosshair block select-none"
                />

                {/* Professional Quotex-grade Loading State Overlay */}
                {isLoadingCandles && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/70 dark:bg-[#0B0E14]/80 backdrop-blur-sm transition-opacity duration-300 pointer-events-none">
                    <div className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-2xl">
                      <div className="relative flex items-center justify-center w-12 h-12">
                        <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                          <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5 justify-center">
                          <span>Loading {currentPairName}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                          Connecting real-time market stream...
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Floating Selected Drawing Action Toolbar */}
                {selectedDrawing && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1.5 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in">
                    <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 capitalize">
                      {selectedDrawing.type.replace("_", " ")}
                    </span>
                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
                    <button
                      type="button"
                      onClick={() => setIsDrawingSettingsOpen(true)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-white transition-colors cursor-pointer"
                    >
                      <Settings className="w-3 h-3" />
                      Style
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteSelectedDrawing}
                      className="p-1 rounded-lg bg-rose-500/20 text-rose-500 dark:text-rose-400 hover:bg-rose-500/30 transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2Icon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Floating Navigation & Zoom Controls on Bottom Left */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md p-1 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-10">
                  <button
                    type="button"
                    onClick={() => handleStepPan("left")}
                    className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                    title="Scroll Past History (◄)"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStepPan("right")}
                    disabled={panOffset <= 0}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      panOffset > 0 ? "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800" : "text-slate-300 dark:text-slate-700 cursor-not-allowed"
                    }`}
                    title="Scroll Forward to Live (►)"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <div className="w-[1px] h-3.5 bg-slate-200 dark:bg-slate-800 my-auto" />
                  <button
                    type="button"
                    onClick={() => setVisibleCandlesCount((prev) => Math.max(15, prev - 5))}
                    className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                    title="Zoom In (+)"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibleCandlesCount((prev) => Math.min(100, prev + 5))}
                    className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                    title="Zoom Out (-)"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                    title="Reset View"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Jump to Live Floating Button */}
                {panOffset > 0 && (
                  <button
                    type="button"
                    onClick={() => setPanOffset(0)}
                    className="absolute bottom-3 right-20 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-xl shadow-indigo-600/40 border border-indigo-400/40 text-xs font-mono font-bold cursor-pointer transition-all active:scale-95 z-10"
                    title="Return to Live Price"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Jump to Live (▶)</span>
                  </button>
                )}
              </>
            ) : (
              <iframe
                title={`TradingView Solo - ${currentPairName}`}
                src={tradingViewUrl}
                className="w-full h-full border-none"
                allowFullScreen
              />
            )}
          </div>

          {/* Sub-Panel Indicators (Oscillators: RSI, MACD, Stochastic, CCI, ADX, ATR, Volume, OBV) */}
          {viewMode === "quotex" &&
            subPanelIndicators.map((ind) => (
              <IndicatorPanel
                key={ind.id}
                config={ind}
                candles={candlesRef.current}
                livePrice={livePrice}
                visibleCandlesCount={visibleCandlesCount}
                panOffset={panOffset}
                width={canvasWidth}
                isDarkMode={isDarkMode}
                onRemove={handleRemoveIndicator}
                onToggleVisibility={handleToggleIndicatorVisibility}
                onConfigure={() => setIsIndicatorsModalOpen(true)}
                onResizeHeight={handleResizeIndicatorPanel}
              />
            ))}
        </div>
      </div>

      {/* Drawing Settings Modal */}
      <DrawingSettingsModal
        drawing={selectedDrawing}
        isOpen={isDrawingSettingsOpen}
        onClose={() => setIsDrawingSettingsOpen(false)}
        onUpdateStyle={(newStyle) => {
          if (!selectedDrawingId) return;
          const updated = drawings.map((d) => (d.id === selectedDrawingId ? { ...d, style: { ...d.style, ...newStyle } } : d));
          pushUndoState(updated);
        }}
        onDelete={handleDeleteSelectedDrawing}
      />

      {/* Indicators Library & Configuration Modal */}
      <IndicatorsModal
        isOpen={isIndicatorsModalOpen}
        onClose={() => setIsIndicatorsModalOpen(false)}
        indicators={indicators}
        onAddIndicator={handleAddIndicator}
        onUpdateIndicator={handleUpdateIndicator}
        onRemoveIndicator={handleRemoveIndicator}
        onToggleVisibility={handleToggleIndicatorVisibility}
        onResetIndicator={handleResetIndicator}
      />
    </div>
  );
};

function Trash2Icon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}
