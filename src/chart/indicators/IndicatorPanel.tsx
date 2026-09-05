import React, { useRef, useEffect, useState, useCallback } from "react";
import { X, Sliders, Eye, EyeOff } from "lucide-react";
import { IndicatorConfig, IndicatorResult, Candle } from "../../types/chart";
import { calculateIndicator } from "./calculator";

interface IndicatorPanelProps {
  config: IndicatorConfig;
  candles: Candle[];
  livePrice?: number;
  visibleCandlesCount: number;
  panOffset: number;
  width: number;
  isDarkMode?: boolean;
  rightScaleWidth?: number;
  onRemove: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onConfigure: (id: string) => void;
  onResizeHeight: (id: string, height: number) => void;
}

export const IndicatorPanel: React.FC<IndicatorPanelProps> = ({
  config,
  candles,
  livePrice,
  visibleCandlesCount,
  panOffset,
  width,
  isDarkMode,
  rightScaleWidth: rightScaleWidthProp,
  onRemove,
  onToggleVisibility,
  onConfigure,
  onResizeHeight
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number>(config.panelHeight || 125);
  const isResizingRef = useRef<boolean>(false);
  const startYRef = useRef<number>(0);
  const startHRef = useRef<number>(height);

  // Real-time theme sync state
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof isDarkMode === "boolean") return isDarkMode;
    return typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : true;
  });

  useEffect(() => {
    if (typeof isDarkMode === "boolean") {
      setIsDark(isDarkMode);
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    updateTheme();

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.attributeName === "class") {
          updateTheme();
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Resize handler
  const handleMouseDownResize = (e: React.MouseEvent) => {
    isResizingRef.current = true;
    startYRef.current = e.clientY;
    startHRef.current = height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const deltaY = moveEvent.clientY - startYRef.current;
      const newHeight = Math.max(70, Math.min(320, startHRef.current + deltaY));
      setHeight(newHeight);
      onResizeHeight(config.id, newHeight);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Live-synced candle series that recalculates dynamically on every micro-tick
  const dynamicCandles = React.useMemo(() => {
    if (!candles || candles.length === 0) return [];
    if (typeof livePrice !== "number" || isNaN(livePrice) || livePrice <= 0) return candles;

    const clone = [...candles];
    const last = clone[clone.length - 1];
    if (last) {
      clone[clone.length - 1] = {
        ...last,
        close: livePrice,
        high: Math.max(last.high, livePrice),
        low: Math.min(last.low, livePrice)
      };
    }
    return clone;
  }, [candles, livePrice, candles?.length]);

  // Calculate indicator data with live candle reactivity
  const result: IndicatorResult = React.useMemo(() => {
    if (!config.visible || dynamicCandles.length === 0) {
      return { times: [], values: {} };
    }
    return calculateIndicator(config, dynamicCandles);
  }, [config, dynamicCandles]);

  // Clean indicator title matching TradingView convention (e.g. MACD(12,26,9) or RSI-SMA(14))
  const indicatorTitle = React.useMemo(() => {
    const p = config.params || {};
    switch (config.type) {
      case "MACD":
        return `MACD(${p.fastPeriod || 12},${p.slowPeriod || 26},${p.signalPeriod || 9})`;
      case "RSI":
        return `RSI-SMA(${p.period || 14})`;
      case "Stochastic":
        return `STOCH(${p.kPeriod || 14},${p.dPeriod || 3},${p.slowing || 3})`;
      case "CCI":
        return `CCI(${p.period || 20})`;
      case "ADX":
        return `ADX(${p.period || 14})`;
      case "ATR":
        return `ATR(${p.period || 14})`;
      case "Volume":
        return `Volume`;
      case "OBV":
        return `OBV`;
      default:
        return config.name;
    }
  }, [config.type, config.params, config.name]);

  // Formatted live values array for color-coded header display
  const liveDisplayTokens = React.useMemo(() => {
    if (!result || !result.values) return [];
    const tokens: { label?: string; value: string; color?: string }[] = [];

    const formatVal = (v: number | null | undefined) => {
      if (v === null || v === undefined || isNaN(v)) return null;
      const abs = Math.abs(v);
      if (abs === 0) return "0.00";
      if (abs < 0.0001) return v.toFixed(6);
      if (abs < 0.01) return v.toFixed(5);
      if (abs < 1) return v.toFixed(4);
      return v.toFixed(2);
    };

    if (config.type === "MACD") {
      const histArr = result.values.hist || [];
      const macdArr = result.values.macd || [];
      const sigArr = result.values.signal || [];

      const lastHist = histArr[histArr.length - 1];
      const prevHist = histArr.length > 1 ? histArr[histArr.length - 2] : 0;
      const lastMacd = macdArr[macdArr.length - 1];
      const lastSig = sigArr[sigArr.length - 1];

      if (lastMacd !== undefined && lastMacd !== null) {
        tokens.push({
          value: formatVal(lastMacd) || "0.00",
          color: config.styles.macd?.color || "#f43f5e"
        });
      }
      if (lastSig !== undefined && lastSig !== null) {
        tokens.push({
          value: formatVal(lastSig) || "0.00",
          color: config.styles.signal?.color || "#f59e0b"
        });
      }
      if (lastHist !== undefined && lastHist !== null) {
        const isBull = lastHist >= 0;
        const isGrowing = isBull ? lastHist >= (prevHist ?? 0) : lastHist <= (prevHist ?? 0);
        const histColor = isBull
          ? isGrowing ? "#26a69a" : "#81c784"
          : isGrowing ? "#ef5350" : "#e57373";

        tokens.push({
          value: formatVal(lastHist) || "0.00",
          color: histColor
        });
      }
    } else {
      const keys = Object.keys(result.values);
      for (const k of keys) {
        if (k === "direction") continue;
        const arr = result.values[k];
        const val = arr && arr.length > 0 ? arr[arr.length - 1] : null;
        const f = formatVal(val);
        if (f !== null) {
          let c = "#38bdf8";
          if (config.styles[k]?.color) c = config.styles[k].color;
          else if (config.type === "RSI") c = "#8b5cf6";
          else if (config.type === "CCI") c = "#06b6d4";
          tokens.push({ value: f, color: c });
        }
      }
    }

    return tokens;
  }, [result, config.type, config.styles]);

  // Render on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0 || !config.visible) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = isDark ? "#0B0E14" : "#ffffff";
    ctx.fillRect(0, 0, width, height);

    const n = dynamicCandles.length;
    if (n === 0) return;

    const rightScaleWidth = rightScaleWidthProp ?? 48;
    const chartWidth = Math.max(10, width - rightScaleWidth);

    const totalCandles = n;
    const count = Math.min(visibleCandlesCount, totalCandles);
    const endIdx = Math.max(count, Math.min(totalCandles, totalCandles - panOffset));
    const startIdx = Math.max(0, endIdx - count);
    const visibleCount = endIdx - startIdx;
    if (visibleCount <= 0) return;

    // Match exact QuotexProChart right empty slots so candles and indicators align 1:1 vertically
    const rightEmptySlots = panOffset === 0 ? 1.5 : 0;
    const totalSlotCount = visibleCount + rightEmptySlots;
    const candleWidth = chartWidth / totalSlotCount;

    // Collect min & max values in visible window
    let minVal = Infinity;
    let maxVal = -Infinity;

    if (result.subPlots) {
      for (const plot of result.subPlots) {
        const arr = result.values[plot.key];
        if (!arr) continue;
        for (let i = startIdx; i < endIdx; i++) {
          const v = arr[i];
          if (v !== null && !isNaN(v) && isFinite(v)) {
            minVal = Math.min(minVal, v);
            maxVal = Math.max(maxVal, v);
          }
        }
      }
    }

    // Specific bounds for oscillators
    if (config.type === "RSI" || config.type === "Stochastic") {
      minVal = Math.min(0, minVal);
      maxVal = Math.max(100, maxVal);
    } else if (config.type === "CCI") {
      const ob = Number(config.params.overbought) || 100;
      const os = Number(config.params.oversold) || -100;
      minVal = Math.min(os - 40, minVal);
      maxVal = Math.max(ob + 40, maxVal);
    } else if (config.type === "Volume" || config.type === "ATR") {
      minVal = 0;
      maxVal = maxVal * 1.15;
    } else if (config.type === "MACD") {
      // Symmetrical or padded range including zero
      const maxAbs = Math.max(Math.abs(minVal), Math.abs(maxVal), 0.0001);
      const pad = maxAbs * 0.25;
      minVal = -(maxAbs + pad);
      maxVal = maxAbs + pad;
    } else {
      const pad = (maxVal - minVal) * 0.12 || 1;
      minVal -= pad;
      maxVal += pad;
    }

    if (minVal === Infinity || maxVal === -Infinity || minVal === maxVal) {
      minVal = -1;
      maxVal = 1;
    }

    const valToY = (v: number) => {
      const ratio = (v - minVal) / (maxVal - minVal);
      return height - 12 - ratio * (height - 24);
    };

    // Draw vertical dotted grid lines aligned with candles
    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.05)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);

    const gridStep = Math.max(5, Math.floor(count / 8));
    for (let i = startIdx; i < endIdx; i += gridStep) {
      const gx = (i - startIdx) * candleWidth + candleWidth * 0.5;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, height);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw reference levels (e.g. Overbought / Oversold / Zero Line)
    let zeroYCoord: number | null = null;
    let overboughtYCoord: number | null = null;
    let oversoldYCoord: number | null = null;
    let overboughtVal: number | null = null;
    let oversoldVal: number | null = null;

    if (config.type === "RSI" || config.type === "Stochastic") {
      const ob = Number(config.params.overbought) || (config.type === "RSI" ? 70 : 80);
      const os = Number(config.params.oversold) || (config.type === "RSI" ? 30 : 20);
      overboughtVal = ob;
      oversoldVal = os;

      const obY = valToY(ob);
      const osY = valToY(os);
      overboughtYCoord = obY;
      oversoldYCoord = osY;

      // Band Fill
      ctx.fillStyle = isDark ? "rgba(139, 92, 246, 0.04)" : "rgba(139, 92, 246, 0.06)";
      ctx.fillRect(0, Math.min(obY, osY), chartWidth, Math.abs(osY - obY));

      // Overbought line
      ctx.strokeStyle = isDark ? "rgba(239, 68, 68, 0.45)" : "rgba(220, 38, 38, 0.45)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, obY);
      ctx.lineTo(chartWidth, obY);
      ctx.stroke();

      // Middle line (50)
      const midY = valToY(50);
      ctx.strokeStyle = isDark ? "rgba(148, 163, 184, 0.2)" : "rgba(100, 116, 139, 0.25)";
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(chartWidth, midY);
      ctx.stroke();

      // Oversold line
      ctx.strokeStyle = isDark ? "rgba(16, 185, 129, 0.45)" : "rgba(5, 150, 105, 0.45)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, osY);
      ctx.lineTo(chartWidth, osY);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (config.type === "CCI") {
      const ob = Number(config.params.overbought) || 100;
      const os = Number(config.params.oversold) || -100;
      overboughtVal = ob;
      oversoldVal = os;

      const obY = valToY(ob);
      const osY = valToY(os);
      const zeroY = valToY(0);

      overboughtYCoord = obY;
      oversoldYCoord = osY;
      zeroYCoord = zeroY;

      // Channel Band Fill between +100 (Overbought) and -100 (Oversold)
      ctx.fillStyle = isDark ? "rgba(6, 182, 212, 0.05)" : "rgba(6, 182, 212, 0.07)";
      ctx.fillRect(0, Math.min(obY, osY), chartWidth, Math.abs(osY - obY));

      // Overbought Line (+100)
      ctx.strokeStyle = isDark ? "rgba(239, 68, 68, 0.6)" : "rgba(220, 38, 38, 0.6)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(0, obY);
      ctx.lineTo(chartWidth, obY);
      ctx.stroke();

      // Zero Centerline (0)
      ctx.strokeStyle = isDark ? "rgba(148, 163, 184, 0.35)" : "rgba(100, 116, 139, 0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(0, zeroY);
      ctx.lineTo(chartWidth, zeroY);
      ctx.stroke();

      // Oversold Line (-100)
      ctx.strokeStyle = isDark ? "rgba(16, 185, 129, 0.6)" : "rgba(5, 150, 105, 0.6)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(0, osY);
      ctx.lineTo(chartWidth, osY);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (config.type === "MACD") {
      const zeroY = valToY(0);
      zeroYCoord = zeroY;

      // Clean dotted horizontal zero line
      ctx.strokeStyle = isDark ? "rgba(148, 163, 184, 0.4)" : "rgba(100, 116, 139, 0.45)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, zeroY);
      ctx.lineTo(chartWidth, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Helper to safely draw rounded rectangles
    const drawRoundedBar = (
      x: number,
      y: number,
      w: number,
      h: number,
      radius: number,
      fillStyle: string
    ) => {
      ctx.fillStyle = fillStyle;
      const r = Math.min(radius, w / 2, h / 2);
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, w, h, Math.max(1, r));
      } else {
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      }
      ctx.fill();
    };

    // Render SubPlots (Lines and Histograms)
    if (result.subPlots) {
      for (const plot of result.subPlots) {
        const arr = result.values[plot.key];
        if (!arr) continue;

        if (plot.type === "histogram") {
          const baseBaseline = plot.baseline !== undefined ? plot.baseline : 0;
          const baseY = valToY(baseBaseline);

          for (let i = startIdx; i < endIdx; i++) {
            const v = arr[i];
            if (v === null || isNaN(v)) continue;

            const prevV = i > 0 ? arr[i - 1] : 0;
            const barW = Math.max(2.5, Math.min(18, candleWidth * 0.65));
            const x = (i - startIdx) * candleWidth + (candleWidth - barW) / 2;
            const y = valToY(v);

            let barColor = plot.color;
            if (config.type === "MACD") {
              const isBull = v >= 0;
              const isGrowing = isBull ? v >= (prevV ?? 0) : v <= (prevV ?? 0);
              if (isBull) {
                barColor = isGrowing ? "#26a69a" : "#81c784";
              } else {
                barColor = isGrowing ? "#ef5350" : "#e57373";
              }
            } else if (config.type === "Volume") {
              const isGreen = dynamicCandles[i].close >= dynamicCandles[i].open;
              barColor = isGreen
                ? isDark ? "rgba(38, 166, 154, 0.7)" : "rgba(38, 166, 154, 0.85)"
                : isDark ? "rgba(239, 83, 80, 0.7)" : "rgba(239, 83, 80, 0.85)";
            }

            const barTop = Math.min(baseY, y);
            const barHeight = Math.max(1.5, Math.abs(baseY - y));

            drawRoundedBar(x, barTop, barW, barHeight, 2, barColor);
          }
        } else {
          // Line plot with smooth curves
          ctx.beginPath();
          ctx.strokeStyle = plot.color;
          ctx.lineWidth = plot.key === "macd" || plot.key === "signal" ? 2.0 : 1.75;
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          let hasMoved = false;

          for (let i = startIdx; i < endIdx; i++) {
            const v = arr[i];
            if (v === null || isNaN(v)) continue;
            const x = (i - startIdx) * candleWidth + candleWidth * 0.5;
            const y = valToY(v);

            if (!hasMoved) {
              ctx.moveTo(x, y);
              hasMoved = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
        }
      }
    }

    // Right Axis Price/Value Scale
    ctx.fillStyle = isDark ? "#0c1017" : "#f8fafc";
    ctx.fillRect(chartWidth, 0, rightScaleWidth, height);

    // Subtle divider
    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartWidth, 0);
    ctx.lineTo(chartWidth, height);
    ctx.stroke();

    ctx.fillStyle = isDark ? "#94a3b8" : "#64748b";
    ctx.font = "10px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace";
    ctx.textAlign = "left";

    // Draw Level Labels & Badges on Axis
    if (config.type === "CCI" || config.type === "RSI" || config.type === "Stochastic") {
      // Overbought Label - 1px margin from right edge
      if (overboughtYCoord !== null && overboughtVal !== null && overboughtYCoord >= 8 && overboughtYCoord <= height - 8) {
        ctx.fillStyle = isDark ? "rgba(244, 63, 94, 0.85)" : "rgba(225, 29, 72, 0.9)";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "right";
        ctx.fillText(overboughtVal > 0 && config.type === "CCI" ? `+${overboughtVal}` : `${overboughtVal}`, width - 1, overboughtYCoord + 3);
      }

      // Oversold Label - 1px margin from right edge
      if (oversoldYCoord !== null && oversoldVal !== null && oversoldYCoord >= 8 && oversoldYCoord <= height - 8) {
        ctx.fillStyle = isDark ? "rgba(34, 197, 94, 0.85)" : "rgba(22, 163, 74, 0.9)";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "right";
        ctx.fillText(`${oversoldVal}`, width - 1, oversoldYCoord + 3);
      }

      // Zero Badge for CCI
      if (config.type === "CCI" && zeroYCoord !== null && zeroYCoord >= 8 && zeroYCoord <= height - 8) {
        const badgeW = 26;
        const badgeH = 16;
        const badgeX = width - badgeW - 1;
        const badgeY = zeroYCoord - badgeH / 2;

        ctx.fillStyle = isDark ? "#1e293b" : "#e2e8f0";
        ctx.beginPath();
        ctx.moveTo(badgeX, zeroYCoord);
        ctx.lineTo(badgeX + 4, badgeY);
        ctx.lineTo(badgeX + badgeW, badgeY);
        ctx.lineTo(badgeX + badgeW, badgeY + badgeH);
        ctx.lineTo(badgeX + 4, badgeY + badgeH);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = isDark ? "#334155" : "#cbd5e1";
        ctx.lineWidth = 0.75;
        ctx.stroke();

        ctx.fillStyle = isDark ? "#f1f5f9" : "#334155";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText("0", badgeX + badgeW / 2 + 1, zeroYCoord + 3);
      }
    } else if (config.type === "MACD") {
      // Draw Zero Badge on Axis for MACD
      if (zeroYCoord !== null && zeroYCoord >= 8 && zeroYCoord <= height - 8) {
        const badgeW = 26;
        const badgeH = 16;
        const badgeX = width - badgeW - 1;
        const badgeY = zeroYCoord - badgeH / 2;

        // Pointer badge shape
        ctx.fillStyle = isDark ? "#1e293b" : "#e2e8f0";
        ctx.beginPath();
        ctx.moveTo(badgeX, zeroYCoord);
        ctx.lineTo(badgeX + 4, badgeY);
        ctx.lineTo(badgeX + badgeW, badgeY);
        ctx.lineTo(badgeX + badgeW, badgeY + badgeH);
        ctx.lineTo(badgeX + 4, badgeY + badgeH);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = isDark ? "#334155" : "#cbd5e1";
        ctx.lineWidth = 0.75;
        ctx.stroke();

        ctx.fillStyle = isDark ? "#f1f5f9" : "#334155";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText("0", badgeX + badgeW / 2 + 1, zeroYCoord + 3);
      }
    }

    // Secondary axis labels
    const stepCount = 3;
    for (let i = 0; i <= stepCount; i++) {
      const val = minVal + ((maxVal - minVal) * i) / stepCount;
      const y = valToY(val);
      if (zeroYCoord !== null && Math.abs(y - zeroYCoord) < 14) continue;
      if (overboughtYCoord !== null && Math.abs(y - overboughtYCoord) < 14) continue;
      if (oversoldYCoord !== null && Math.abs(y - oversoldYCoord) < 14) continue;

      let formatted = val.toFixed(2);
      if (Math.abs(val) < 0.001) formatted = val.toFixed(4);

      ctx.fillStyle = isDark ? "#64748b" : "#94a3b8";
      ctx.font = "8.5px monospace";
      ctx.textAlign = "right";
      ctx.fillText(formatted, width - 1, y + 3);
    }
  }, [config, dynamicCandles, visibleCandlesCount, panOffset, width, height, result, isDark]);

  if (!config.visible) return null;

  return (
    <div
      ref={containerRef}
      className="relative w-full border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0B0E14] select-none flex flex-col shrink-0"
      style={{ height }}
    >
      {/* Top Resize Divider Drag Handle */}
      <div
        onMouseDown={handleMouseDownResize}
        className="absolute top-0 left-0 right-0 h-1.5 cursor-row-resize flex items-center justify-center hover:bg-sky-500/40 z-30 group"
      >
        <div className="w-8 h-1 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-sky-400 transition-colors" />
      </div>

      {/* Header Info Overlay (Clean TradingView / Quotex Typography) */}
      <div className="absolute top-1.5 left-2.5 z-20 flex items-center gap-2 text-xs select-none">
        <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">
          {indicatorTitle}
        </span>

        {liveDisplayTokens.length > 0 && (
          <div className="flex items-center gap-2 font-mono text-[11px] font-semibold">
            {liveDisplayTokens.map((tok, idx) => (
              <span
                key={idx}
                style={{ color: tok.color || (isDark ? "#94a3b8" : "#64748b") }}
              >
                {tok.value}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-0.5 opacity-60 hover:opacity-100 transition-opacity ml-1.5">
          <button
            onClick={() => onConfigure(config.id)}
            className="p-1 rounded text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Settings"
          >
            <Sliders className="w-3 h-3" />
          </button>
          <button
            onClick={() => onToggleVisibility(config.id)}
            className="p-1 rounded text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Hide"
          >
            <Eye className="w-3 h-3" />
          </button>
          <button
            onClick={() => onRemove(config.id)}
            className="p-1 rounded text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-500/20"
            title="Remove"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%" }}
        className="block"
      />
    </div>
  );
};
