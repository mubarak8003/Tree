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

export type DrawingToolType =
  | "cursor"
  | "trend_line"
  | "horizontal_line"
  | "vertical_line"
  | "ray"
  | "extended_line"
  | "arrow"
  | "parallel_channel"
  | "rectangle"
  | "circle"
  | "fib_retracement"
  | "fib_extension"
  | "price_range"
  | "measure"
  | "text";

export interface DrawingPoint {
  time: number; // timestamp ms
  price: number;
}

export interface DrawingStyle {
  color: string;
  lineWidth: number;
  lineStyle: "solid" | "dashed" | "dotted";
  opacity: number;
  showPriceLabel?: boolean;
  showDateLabel?: boolean;
  fillColor?: string;
  fillOpacity?: number;
  extendLeft?: boolean;
  extendRight?: boolean;
  fontSize?: number;
  textColor?: string;
  text?: string;
  channelWidth?: number; // for parallel channel
}

export interface DrawingObject {
  id: string;
  type: DrawingToolType;
  points: DrawingPoint[];
  style: DrawingStyle;
  symbol: string;
  timeframeSec: number;
  createdAt: number;
  updatedAt: number;
}

// Indicator Types
export type OverlayIndicatorType = "EMA" | "SMA" | "VWAP" | "Supertrend" | "BollingerBands";
export type SubPanelIndicatorType = "RSI" | "MACD" | "Stochastic" | "CCI" | "ADX" | "ATR" | "Volume" | "OBV";
export type IndicatorType = OverlayIndicatorType | SubPanelIndicatorType;

export interface IndicatorConfig {
  id: string;
  type: IndicatorType;
  name: string;
  visible: boolean;
  isOverlay: boolean;
  panelHeight?: number; // for sub-panel
  params: Record<string, any>;
  styles: Record<string, { color: string; lineWidth?: number; lineStyle?: "solid" | "dashed" | "dotted" }>;
}

export interface IndicatorResult {
  times: number[];
  values: Record<string, (number | null)[]>;
  subPlots?: {
    type: "line" | "histogram" | "band" | "level";
    color: string;
    key: string;
    baseline?: number;
    upperKey?: string;
    lowerKey?: string;
    fillColor?: string;
  }[];
}

export interface ChartState {
  drawings: DrawingObject[];
  indicators: IndicatorConfig[];
  timeframeSec: number;
  chartType: "candles" | "area";
}
