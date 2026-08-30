import { DrawingObject, IndicatorConfig } from "../../types/chart";
import { DEFAULT_INDICATOR_CONFIGS } from "../indicators/calculator";

const PERSISTENCE_PREFIX = "tradingview_chart_state_v2_";
const GLOBAL_INDICATORS_KEY = "tradingview_global_indicators_v2";

export interface SymbolChartState {
  drawings: DrawingObject[];
  indicators: IndicatorConfig[];
}

export function getStorageKey(symbol: string, timeframeSec: number): string {
  const cleanSym = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `${PERSISTENCE_PREFIX}${cleanSym}_${timeframeSec}`;
}

export function loadGlobalIndicators(): IndicatorConfig[] {
  try {
    const data = localStorage.getItem(GLOBAL_INDICATORS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Failed to load global indicators from storage:", err);
  }
  return getDefaultIndicators();
}

export function saveGlobalIndicators(indicators: IndicatorConfig[]) {
  try {
    localStorage.setItem(GLOBAL_INDICATORS_KEY, JSON.stringify(indicators));
  } catch (err) {
    console.warn("Failed to save global indicators to storage:", err);
  }
}

export function loadSymbolDrawings(symbol: string, timeframeSec?: number): DrawingObject[] {
  try {
    const key = timeframeSec ? getStorageKey(symbol, timeframeSec) : `${PERSISTENCE_PREFIX}${symbol.toUpperCase().replace(/[^A-Z0-9]/g, "")}_drawings`;
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed.drawings)) return parsed.drawings;
    }
  } catch (err) {
    console.warn("Failed to load symbol drawings from storage:", err);
  }
  return [];
}

export function saveSymbolDrawings(symbol: string, drawings: DrawingObject[], timeframeSec?: number) {
  try {
    const key = timeframeSec ? getStorageKey(symbol, timeframeSec) : `${PERSISTENCE_PREFIX}${symbol.toUpperCase().replace(/[^A-Z0-9]/g, "")}_drawings`;
    localStorage.setItem(key, JSON.stringify({ drawings, timestamp: Date.now() }));
  } catch (err) {
    console.warn("Failed to save symbol drawings to storage:", err);
  }
}

export function loadChartState(symbol: string, timeframeSec: number): SymbolChartState {
  return {
    drawings: loadSymbolDrawings(symbol, timeframeSec),
    indicators: loadGlobalIndicators()
  };
}

export function saveChartState(symbol: string, timeframeSec: number, state: SymbolChartState) {
  saveSymbolDrawings(symbol, state.drawings, timeframeSec);
  saveGlobalIndicators(state.indicators);
}

export function getDefaultIndicators(): IndicatorConfig[] {
  return [
    {
      id: "ema_default_20",
      ...DEFAULT_INDICATOR_CONFIGS.EMA,
      params: { period: 20, source: "close" }
    }
  ];
}

