import { IndicatorConfig, IndicatorResult, Candle } from "../../types/chart";

function getSourceValue(candle: Candle, source: string = "close"): number {
  switch (source) {
    case "open":
      return candle.open;
    case "high":
      return candle.high;
    case "low":
      return candle.low;
    case "hl2":
      return (candle.high + candle.low) / 2;
    case "hlc3":
      return (candle.high + candle.low + candle.close) / 3;
    case "ohlc4":
      return (candle.open + candle.high + candle.low + candle.close) / 4;
    case "close":
    default:
      return candle.close;
  }
}

export function calculateIndicator(config: IndicatorConfig, candles: Candle[]): IndicatorResult {
  const n = candles.length;
  const times = candles.map((c) => c.time);

  if (n === 0) {
    return { times: [], values: {} };
  }

  switch (config.type) {
    case "EMA": {
      const period = Math.max(1, Number(config.params.period) || 20);
      const source = config.params.source || "close";
      const values: (number | null)[] = new Array(n).fill(null);

      if (n >= period) {
        const k = 2 / (period + 1);
        let sum = 0;
        for (let i = 0; i < period; i++) {
          sum += getSourceValue(candles[i], source);
        }
        let ema = sum / period;
        values[period - 1] = ema;

        for (let i = period; i < n; i++) {
          const val = getSourceValue(candles[i], source);
          ema = val * k + ema * (1 - k);
          values[i] = ema;
        }
      }

      return {
        times,
        values: { ema: values },
        subPlots: [
          {
            type: "line",
            key: "ema",
            color: config.styles.ema?.color || "#3b82f6"
          }
        ]
      };
    }

    case "SMA": {
      const period = Math.max(1, Number(config.params.period) || 20);
      const source = config.params.source || "close";
      const values: (number | null)[] = new Array(n).fill(null);

      let windowSum = 0;
      for (let i = 0; i < n; i++) {
        const val = getSourceValue(candles[i], source);
        windowSum += val;
        if (i >= period) {
          windowSum -= getSourceValue(candles[i - period], source);
        }
        if (i >= period - 1) {
          values[i] = windowSum / period;
        }
      }

      return {
        times,
        values: { sma: values },
        subPlots: [
          {
            type: "line",
            key: "sma",
            color: config.styles.sma?.color || "#eab308"
          }
        ]
      };
    }

    case "VWAP": {
      const values: (number | null)[] = new Array(n).fill(null);
      let cumVol = 0;
      let cumVolPrice = 0;

      for (let i = 0; i < n; i++) {
        const c = candles[i];
        const tp = (c.high + c.low + c.close) / 3;
        const vol = Math.max(1, c.volume || 1);
        cumVol += vol;
        cumVolPrice += tp * vol;
        values[i] = cumVolPrice / cumVol;
      }

      return {
        times,
        values: { vwap: values },
        subPlots: [
          {
            type: "line",
            key: "vwap",
            color: config.styles.vwap?.color || "#a855f7"
          }
        ]
      };
    }

    case "BollingerBands": {
      const period = Math.max(2, Number(config.params.period) || 20);
      const stdDevMult = Number(config.params.stdDev) || 2.0;
      const source = config.params.source || "close";

      const upper: (number | null)[] = new Array(n).fill(null);
      const middle: (number | null)[] = new Array(n).fill(null);
      const lower: (number | null)[] = new Array(n).fill(null);

      for (let i = period - 1; i < n; i++) {
        let sum = 0;
        for (let j = i - period + 1; j <= i; j++) {
          sum += getSourceValue(candles[j], source);
        }
        const mean = sum / period;
        middle[i] = mean;

        let varianceSum = 0;
        for (let j = i - period + 1; j <= i; j++) {
          const diff = getSourceValue(candles[j], source) - mean;
          varianceSum += diff * diff;
        }
        const stdDev = Math.sqrt(varianceSum / period);
        upper[i] = mean + stdDevMult * stdDev;
        lower[i] = mean - stdDevMult * stdDev;
      }

      return {
        times,
        values: { upper, middle, lower },
        subPlots: [
          {
            type: "band",
            key: "middle",
            upperKey: "upper",
            lowerKey: "lower",
            color: config.styles.middle?.color || "#38bdf8",
            fillColor: "rgba(56, 189, 248, 0.08)"
          }
        ]
      };
    }

    case "Supertrend": {
      const period = Math.max(1, Number(config.params.atrPeriod) || 10);
      const multiplier = Number(config.params.multiplier) || 3.0;

      const upperBand: (number | null)[] = new Array(n).fill(null);
      const lowerBand: (number | null)[] = new Array(n).fill(null);
      const supertrend: (number | null)[] = new Array(n).fill(null);
      const direction: (number | null)[] = new Array(n).fill(null); // 1 = Bullish, -1 = Bearish

      // True range calculation
      const tr: number[] = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        if (i === 0) {
          tr[i] = candles[i].high - candles[i].low;
        } else {
          const h = candles[i].high;
          const l = candles[i].low;
          const prevClose = candles[i - 1].close;
          tr[i] = Math.max(h - l, Math.abs(h - prevClose), Math.abs(l - prevClose));
        }
      }

      // Wilder's ATR
      const atr: number[] = new Array(n).fill(0);
      let atrSum = 0;
      for (let i = 0; i < period && i < n; i++) {
        atrSum += tr[i];
      }
      if (period <= n) {
        atr[period - 1] = atrSum / period;
        for (let i = period; i < n; i++) {
          atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
        }
      }

      let prevDir = 1;
      let prevUpper = 0;
      let prevLower = 0;

      for (let i = period - 1; i < n; i++) {
        const hl2 = (candles[i].high + candles[i].low) / 2;
        let basicUpper = hl2 + multiplier * atr[i];
        let basicLower = hl2 - multiplier * atr[i];

        let finalUpper = basicUpper;
        let finalLower = basicLower;

        if (i > period - 1) {
          finalUpper = basicUpper < prevUpper || candles[i - 1].close > prevUpper ? basicUpper : prevUpper;
          finalLower = basicLower > prevLower || candles[i - 1].close < prevLower ? basicLower : prevLower;
        }

        let currDir = prevDir;
        if (prevDir === 1 && candles[i].close < finalLower) {
          currDir = -1;
        } else if (prevDir === -1 && candles[i].close > finalUpper) {
          currDir = 1;
        }

        direction[i] = currDir;
        supertrend[i] = currDir === 1 ? finalLower : finalUpper;
        upperBand[i] = finalUpper;
        lowerBand[i] = finalLower;

        prevDir = currDir;
        prevUpper = finalUpper;
        prevLower = finalLower;
      }

      return {
        times,
        values: { supertrend, direction },
        subPlots: [
          {
            type: "line",
            key: "supertrend",
            color: config.styles.supertrend?.color || "#10b981"
          }
        ]
      };
    }

    case "RSI": {
      const period = Math.max(1, Number(config.params.period) || 14);
      const source = config.params.source || "close";
      const values: (number | null)[] = new Array(n).fill(null);

      if (n > period) {
        let avgGain = 0;
        let avgLoss = 0;

        for (let i = 1; i <= period; i++) {
          const diff = getSourceValue(candles[i], source) - getSourceValue(candles[i - 1], source);
          if (diff > 0) avgGain += diff;
          else avgLoss += Math.abs(diff);
        }

        avgGain /= period;
        avgLoss /= period;

        let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        values[period] = 100 - 100 / (1 + rs);

        for (let i = period + 1; i < n; i++) {
          const diff = getSourceValue(candles[i], source) - getSourceValue(candles[i - 1], source);
          const gain = diff > 0 ? diff : 0;
          const loss = diff < 0 ? Math.abs(diff) : 0;

          avgGain = (avgGain * (period - 1) + gain) / period;
          avgLoss = (avgLoss * (period - 1) + loss) / period;

          rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
          values[i] = 100 - 100 / (1 + rs);
        }
      }

      return {
        times,
        values: { rsi: values },
        subPlots: [
          {
            type: "line",
            key: "rsi",
            color: config.styles.rsi?.color || "#8b5cf6"
          }
        ]
      };
    }

    case "MACD": {
      const fastPeriod = Math.max(1, Number(config.params.fastPeriod) || 12);
      const slowPeriod = Math.max(2, Number(config.params.slowPeriod) || 26);
      const signalPeriod = Math.max(1, Number(config.params.signalPeriod) || 9);
      const source = config.params.source || "close";

      const macdLine: (number | null)[] = new Array(n).fill(null);
      const signalLine: (number | null)[] = new Array(n).fill(null);
      const histogram: (number | null)[] = new Array(n).fill(null);

      // Fast EMA & Slow EMA
      const kFast = 2 / (fastPeriod + 1);
      const kSlow = 2 / (slowPeriod + 1);

      let emaFast = getSourceValue(candles[0], source);
      let emaSlow = getSourceValue(candles[0], source);

      for (let i = 0; i < n; i++) {
        const val = getSourceValue(candles[i], source);
        emaFast = val * kFast + emaFast * (1 - kFast);
        emaSlow = val * kSlow + emaSlow * (1 - kSlow);

        if (i >= slowPeriod - 1) {
          macdLine[i] = emaFast - emaSlow;
        }
      }

      // Signal line EMA of macdLine
      const kSignal = 2 / (signalPeriod + 1);
      let firstSignalIdx = slowPeriod - 1 + signalPeriod - 1;
      if (n > firstSignalIdx) {
        let sum = 0;
        for (let i = slowPeriod - 1; i <= firstSignalIdx; i++) {
          sum += macdLine[i]!;
        }
        let emaSignal = sum / signalPeriod;
        signalLine[firstSignalIdx] = emaSignal;
        histogram[firstSignalIdx] = macdLine[firstSignalIdx]! - emaSignal;

        for (let i = firstSignalIdx + 1; i < n; i++) {
          const val = macdLine[i]!;
          emaSignal = val * kSignal + emaSignal * (1 - kSignal);
          signalLine[i] = emaSignal;
          histogram[i] = val - emaSignal;
        }
      }

      return {
        times,
        values: { macd: macdLine, signal: signalLine, hist: histogram },
        subPlots: [
          {
            type: "line",
            key: "macd",
            color: config.styles.macd?.color || "#f43f5e"
          },
          {
            type: "line",
            key: "signal",
            color: config.styles.signal?.color || "#f59e0b"
          },
          {
            type: "histogram",
            key: "hist",
            color: "#22c55e",
            baseline: 0
          }
        ]
      };
    }

    case "Stochastic": {
      const kPeriod = Math.max(1, Number(config.params.kPeriod) || 14);
      const dPeriod = Math.max(1, Number(config.params.dPeriod) || 3);
      const slowing = Math.max(1, Number(config.params.slowing) || 3);

      const kValues: (number | null)[] = new Array(n).fill(null);
      const dValues: (number | null)[] = new Array(n).fill(null);

      // Fast %K
      const rawK: number[] = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        if (i >= kPeriod - 1) {
          let highest = -Infinity;
          let lowest = Infinity;
          for (let j = i - kPeriod + 1; j <= i; j++) {
            highest = Math.max(highest, candles[j].high);
            lowest = Math.min(lowest, candles[j].low);
          }
          const range = highest - lowest;
          rawK[i] = range === 0 ? 50 : ((candles[i].close - lowest) / range) * 100;
        }
      }

      // Smoothed %K
      for (let i = kPeriod - 1 + slowing - 1; i < n; i++) {
        let sum = 0;
        for (let j = i - slowing + 1; j <= i; j++) {
          sum += rawK[j];
        }
        kValues[i] = sum / slowing;
      }

      // %D (SMA of smoothed %K)
      for (let i = kPeriod - 1 + slowing - 1 + dPeriod - 1; i < n; i++) {
        let sum = 0;
        for (let j = i - dPeriod + 1; j <= i; j++) {
          sum += kValues[j]!;
        }
        dValues[i] = sum / dPeriod;
      }

      return {
        times,
        values: { k: kValues, d: dValues },
        subPlots: [
          {
            type: "line",
            key: "k",
            color: config.styles.k?.color || "#38bdf8"
          },
          {
            type: "line",
            key: "d",
            color: config.styles.d?.color || "#f43f5e"
          }
        ]
      };
    }

    case "CCI": {
      const period = Math.max(1, Number(config.params.period) || 20);
      const values: (number | null)[] = new Array(n).fill(null);

      const tp: number[] = candles.map((c) => (c.high + c.low + c.close) / 3);

      for (let i = period - 1; i < n; i++) {
        let sum = 0;
        for (let j = i - period + 1; j <= i; j++) {
          sum += tp[j];
        }
        const mean = sum / period;

        let meanDevSum = 0;
        for (let j = i - period + 1; j <= i; j++) {
          meanDevSum += Math.abs(tp[j] - mean);
        }
        const meanDev = meanDevSum / period;

        values[i] = meanDev === 0 ? 0 : (tp[i] - mean) / (0.015 * meanDev);
      }

      return {
        times,
        values: { cci: values },
        subPlots: [
          {
            type: "line",
            key: "cci",
            color: config.styles.cci?.color || "#06b6d4"
          }
        ]
      };
    }

    case "ADX": {
      const period = Math.max(1, Number(config.params.period) || 14);
      const adx: (number | null)[] = new Array(n).fill(null);
      const plusDI: (number | null)[] = new Array(n).fill(null);
      const minusDI: (number | null)[] = new Array(n).fill(null);

      if (n > period * 2) {
        const tr: number[] = new Array(n).fill(0);
        const plusDM: number[] = new Array(n).fill(0);
        const minusDM: number[] = new Array(n).fill(0);

        for (let i = 1; i < n; i++) {
          const upMove = candles[i].high - candles[i - 1].high;
          const downMove = candles[i - 1].low - candles[i].low;

          plusDM[i] = upMove > downMove && upMove > 0 ? upMove : 0;
          minusDM[i] = downMove > upMove && downMove > 0 ? downMove : 0;

          const h = candles[i].high;
          const l = candles[i].low;
          const prevC = candles[i - 1].close;
          tr[i] = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
        }

        // Smoothed sums
        let smoothTR = 0;
        let smoothPlusDM = 0;
        let smoothMinusDM = 0;

        for (let i = 1; i <= period; i++) {
          smoothTR += tr[i];
          smoothPlusDM += plusDM[i];
          smoothMinusDM += minusDM[i];
        }

        const dx: number[] = new Array(n).fill(0);

        for (let i = period; i < n; i++) {
          if (i > period) {
            smoothTR = smoothTR - smoothTR / period + tr[i];
            smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM[i];
            smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM[i];
          }

          const pDI = smoothTR === 0 ? 0 : (smoothPlusDM / smoothTR) * 100;
          const mDI = smoothTR === 0 ? 0 : (smoothMinusDM / smoothTR) * 100;
          plusDI[i] = pDI;
          minusDI[i] = mDI;

          const diSum = pDI + mDI;
          dx[i] = diSum === 0 ? 0 : (Math.abs(pDI - mDI) / diSum) * 100;
        }

        // ADX is smoothed DX
        let adxSum = 0;
        for (let i = period; i < period * 2; i++) {
          adxSum += dx[i];
        }
        adx[period * 2 - 1] = adxSum / period;

        for (let i = period * 2; i < n; i++) {
          adx[i] = (adx[i - 1]! * (period - 1) + dx[i]) / period;
        }
      }

      return {
        times,
        values: { adx, plusDI, minusDI },
        subPlots: [
          {
            type: "line",
            key: "adx",
            color: config.styles.adx?.color || "#f59e0b"
          },
          {
            type: "line",
            key: "plusDI",
            color: config.styles.plusDI?.color || "#10b981"
          },
          {
            type: "line",
            key: "minusDI",
            color: config.styles.minusDI?.color || "#ef4444"
          }
        ]
      };
    }

    case "ATR": {
      const period = Math.max(1, Number(config.params.period) || 14);
      const values: (number | null)[] = new Array(n).fill(null);

      const tr: number[] = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        if (i === 0) {
          tr[i] = candles[i].high - candles[i].low;
        } else {
          const h = candles[i].high;
          const l = candles[i].low;
          const prevC = candles[i - 1].close;
          tr[i] = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
        }
      }

      let sum = 0;
      for (let i = 0; i < period && i < n; i++) {
        sum += tr[i];
      }
      if (period <= n) {
        values[period - 1] = sum / period;
        for (let i = period; i < n; i++) {
          values[i] = (values[i - 1]! * (period - 1) + tr[i]) / period;
        }
      }

      return {
        times,
        values: { atr: values },
        subPlots: [
          {
            type: "line",
            key: "atr",
            color: config.styles.atr?.color || "#ec4899"
          }
        ]
      };
    }

    case "Volume": {
      const values: (number | null)[] = candles.map((c) => Math.max(1, c.volume || 1));
      const colors: (string | null)[] = candles.map((c) => (c.close >= c.open ? "#10b981" : "#ef4444"));

      return {
        times,
        values: { volume: values },
        subPlots: [
          {
            type: "histogram",
            key: "volume",
            color: "#10b981",
            baseline: 0
          }
        ]
      };
    }

    case "OBV": {
      const values: (number | null)[] = new Array(n).fill(null);
      let obv = 0;
      values[0] = 0;

      for (let i = 1; i < n; i++) {
        const vol = Math.max(1, candles[i].volume || 1);
        if (candles[i].close > candles[i - 1].close) {
          obv += vol;
        } else if (candles[i].close < candles[i - 1].close) {
          obv -= vol;
        }
        values[i] = obv;
      }

      return {
        times,
        values: { obv: values },
        subPlots: [
          {
            type: "line",
            key: "obv",
            color: config.styles.obv?.color || "#14b8a6"
          }
        ]
      };
    }

    default:
      return { times, values: {} };
  }
}

export const DEFAULT_INDICATOR_CONFIGS: Record<string, Omit<IndicatorConfig, "id">> = {
  EMA: {
    type: "EMA",
    name: "EMA",
    visible: true,
    isOverlay: true,
    params: { period: 20, source: "close" },
    styles: { ema: { color: "#3b82f6", lineWidth: 2, lineStyle: "solid" } }
  },
  SMA: {
    type: "SMA",
    name: "SMA",
    visible: true,
    isOverlay: true,
    params: { period: 50, source: "close" },
    styles: { sma: { color: "#eab308", lineWidth: 2, lineStyle: "solid" } }
  },
  VWAP: {
    type: "VWAP",
    name: "VWAP",
    visible: true,
    isOverlay: true,
    params: {},
    styles: { vwap: { color: "#a855f7", lineWidth: 2, lineStyle: "solid" } }
  },
  Supertrend: {
    type: "Supertrend",
    name: "Supertrend",
    visible: true,
    isOverlay: true,
    params: { atrPeriod: 10, multiplier: 3.0 },
    styles: { supertrend: { color: "#10b981", lineWidth: 2, lineStyle: "solid" } }
  },
  BollingerBands: {
    type: "BollingerBands",
    name: "Bollinger Bands",
    visible: true,
    isOverlay: true,
    params: { period: 20, stdDev: 2.0, source: "close" },
    styles: {
      middle: { color: "#38bdf8", lineWidth: 1.5, lineStyle: "solid" },
      upper: { color: "#38bdf8", lineWidth: 1, lineStyle: "dashed" },
      lower: { color: "#38bdf8", lineWidth: 1, lineStyle: "dashed" }
    }
  },
  RSI: {
    type: "RSI",
    name: "RSI",
    visible: true,
    isOverlay: false,
    panelHeight: 120,
    params: { period: 14, overbought: 70, oversold: 30, source: "close" },
    styles: { rsi: { color: "#8b5cf6", lineWidth: 2, lineStyle: "solid" } }
  },
  MACD: {
    type: "MACD",
    name: "MACD",
    visible: true,
    isOverlay: false,
    panelHeight: 130,
    params: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, source: "close" },
    styles: {
      macd: { color: "#f43f5e", lineWidth: 2, lineStyle: "solid" },
      signal: { color: "#f59e0b", lineWidth: 2, lineStyle: "solid" }
    }
  },
  Stochastic: {
    type: "Stochastic",
    name: "Stochastic",
    visible: true,
    isOverlay: false,
    panelHeight: 120,
    params: { kPeriod: 14, dPeriod: 3, slowing: 3, overbought: 80, oversold: 20 },
    styles: {
      k: { color: "#38bdf8", lineWidth: 2, lineStyle: "solid" },
      d: { color: "#f43f5e", lineWidth: 1.5, lineStyle: "solid" }
    }
  },
  CCI: {
    type: "CCI",
    name: "CCI",
    visible: true,
    isOverlay: false,
    panelHeight: 120,
    params: { period: 20, overbought: 100, oversold: -100 },
    styles: { cci: { color: "#06b6d4", lineWidth: 2, lineStyle: "solid" } }
  },
  ADX: {
    type: "ADX",
    name: "ADX",
    visible: true,
    isOverlay: false,
    panelHeight: 130,
    params: { period: 14, threshold: 25 },
    styles: {
      adx: { color: "#f59e0b", lineWidth: 2, lineStyle: "solid" },
      plusDI: { color: "#10b981", lineWidth: 1.5, lineStyle: "dashed" },
      minusDI: { color: "#ef4444", lineWidth: 1.5, lineStyle: "dashed" }
    }
  },
  ATR: {
    type: "ATR",
    name: "ATR",
    visible: true,
    isOverlay: false,
    panelHeight: 110,
    params: { period: 14 },
    styles: { atr: { color: "#ec4899", lineWidth: 2, lineStyle: "solid" } }
  },
  Volume: {
    type: "Volume",
    name: "Volume",
    visible: true,
    isOverlay: false,
    panelHeight: 100,
    params: {},
    styles: { volume: { color: "#10b981", lineWidth: 1, lineStyle: "solid" } }
  },
  OBV: {
    type: "OBV",
    name: "OBV",
    visible: true,
    isOverlay: false,
    panelHeight: 110,
    params: {},
    styles: { obv: { color: "#14b8a6", lineWidth: 2, lineStyle: "solid" } }
  }
};
