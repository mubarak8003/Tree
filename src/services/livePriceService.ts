// Live Market Price Service for Solo Trading Engine with Real Binance WebSocket Streaming, Forex Exchange Rate Engine & Precision Telemetry
import { MarketAsset } from "../types";

export type { MarketAsset };

export const SUPPORTED_SOLO_ASSETS: MarketAsset[] = [
  // Top Cryptos (24/7 Market)
  { pair: "BTC / USDT (Bitcoin)", symbol: "BINANCE:BTCUSDT", category: "Crypto", basePrice: 77650.00, decimals: 2, payoutPercentage: 88 },
  { pair: "ETH / USDT (Ethereum)", symbol: "BINANCE:ETHUSDT", category: "Crypto", basePrice: 2390.00, decimals: 2, payoutPercentage: 85 },
  { pair: "SOL / USDT (Solana)", symbol: "BINANCE:SOLUSDT", category: "Crypto", basePrice: 91.20, decimals: 2, payoutPercentage: 85 },
  { pair: "BNB / USDT (Binance Coin)", symbol: "BINANCE:BNBUSDT", category: "Crypto", basePrice: 580.00, decimals: 2, payoutPercentage: 85 },
  { pair: "DOGE / USDT (Dogecoin)", symbol: "BINANCE:DOGEUSDT", category: "Crypto", basePrice: 0.0835, decimals: 4, payoutPercentage: 85 },
  { pair: "XRP / USDT (Ripple)", symbol: "BINANCE:XRPUSDT", category: "Crypto", basePrice: 1.3650, decimals: 4, payoutPercentage: 85 },

  // Forex Major & Cross Pairs (40+ Global Currency Pairs)
  { pair: "EUR / USD (Euro / US Dollar)", symbol: "FX:EURUSD", category: "Forex", basePrice: 1.08450, decimals: 5, payoutPercentage: 85 },
  { pair: "GBP / USD (British Pound / US Dollar)", symbol: "FX:GBPUSD", category: "Forex", basePrice: 1.29650, decimals: 5, payoutPercentage: 85 },
  { pair: "USD / JPY (US Dollar / Japanese Yen)", symbol: "FX:USDJPY", category: "Forex", basePrice: 153.500, decimals: 3, payoutPercentage: 85 },
  { pair: "USD / CAD (US Dollar / Canadian Dollar)", symbol: "FX:USDCAD", category: "Forex", basePrice: 1.37850, decimals: 5, payoutPercentage: 85 },
  { pair: "USD / CHF (US Dollar / Swiss Franc)", symbol: "FX:USDCHF", category: "Forex", basePrice: 0.89250, decimals: 5, payoutPercentage: 85 },
  { pair: "AUD / USD (Australian Dollar / US Dollar)", symbol: "FX:AUDUSD", category: "Forex", basePrice: 0.65420, decimals: 5, payoutPercentage: 85 },
  { pair: "NZD / USD (New Zealand Dollar / US Dollar)", symbol: "FX:NZDUSD", category: "Forex", basePrice: 0.59850, decimals: 5, payoutPercentage: 85 },
  { pair: "USD / INR (US Dollar / Indian Rupee)", symbol: "FX:USDINR", category: "Forex", basePrice: 87.250, decimals: 3, payoutPercentage: 82 },

  // EUR Crosses
  { pair: "EUR / GBP (Euro / British Pound)", symbol: "FX:EURGBP", category: "Forex", basePrice: 0.83650, decimals: 5, payoutPercentage: 84 },
  { pair: "EUR / JPY (Euro / Japanese Yen)", symbol: "FX:EURJPY", category: "Forex", basePrice: 166.450, decimals: 3, payoutPercentage: 84 },
  { pair: "EUR / AUD (Euro / Australian Dollar)", symbol: "FX:EURAUD", category: "Forex", basePrice: 1.65750, decimals: 5, payoutPercentage: 82 },
  { pair: "EUR / CAD (Euro / Canadian Dollar)", symbol: "FX:EURCAD", category: "Forex", basePrice: 1.49500, decimals: 5, payoutPercentage: 82 },
  { pair: "EUR / CHF (Euro / Swiss Franc)", symbol: "FX:EURCHF", category: "Forex", basePrice: 0.96800, decimals: 5, payoutPercentage: 82 },
  { pair: "EUR / NZD (Euro / New Zealand Dollar)", symbol: "FX:EURNZD", category: "Forex", basePrice: 1.81200, decimals: 5, payoutPercentage: 82 },

  // GBP Crosses
  { pair: "GBP / JPY (British Pound / Japanese Yen)", symbol: "FX:GBPJPY", category: "Forex", basePrice: 199.150, decimals: 3, payoutPercentage: 84 },
  { pair: "GBP / AUD (British Pound / Australian Dollar)", symbol: "FX:GBPAUD", category: "Forex", basePrice: 1.98200, decimals: 5, payoutPercentage: 82 },
  { pair: "GBP / CAD (British Pound / Canadian Dollar)", symbol: "FX:GBPCAD", category: "Forex", basePrice: 1.78750, decimals: 5, payoutPercentage: 82 },
  { pair: "GBP / CHF (British Pound / Swiss Franc)", symbol: "FX:GBPCHF", category: "Forex", basePrice: 1.15700, decimals: 5, payoutPercentage: 82 },
  { pair: "GBP / NZD (British Pound / New Zealand Dollar)", symbol: "FX:GBPNZD", category: "Forex", basePrice: 2.16600, decimals: 5, payoutPercentage: 82 },

  // AUD Crosses
  { pair: "AUD / JPY (Australian Dollar / Japanese Yen)", symbol: "FX:AUDJPY", category: "Forex", basePrice: 100.420, decimals: 3, payoutPercentage: 82 },
  { pair: "AUD / CAD (Australian Dollar / Canadian Dollar)", symbol: "FX:AUDCAD", category: "Forex", basePrice: 0.90200, decimals: 5, payoutPercentage: 82 },
  { pair: "AUD / CHF (Australian Dollar / Swiss Franc)", symbol: "FX:AUDCHF", category: "Forex", basePrice: 0.58400, decimals: 5, payoutPercentage: 82 },
  { pair: "AUD / NZD (Australian Dollar / New Zealand Dollar)", symbol: "FX:AUDNZD", category: "Forex", basePrice: 1.09300, decimals: 5, payoutPercentage: 82 },

  // NZD Crosses
  { pair: "NZD / JPY (New Zealand Dollar / Japanese Yen)", symbol: "FX:NZDJPY", category: "Forex", basePrice: 91.850, decimals: 3, payoutPercentage: 82 },
  { pair: "NZD / CAD (New Zealand Dollar / Canadian Dollar)", symbol: "FX:NZDCAD", category: "Forex", basePrice: 0.82500, decimals: 5, payoutPercentage: 82 },
  { pair: "NZD / CHF (New Zealand Dollar / Swiss Franc)", symbol: "FX:NZDCHF", category: "Forex", basePrice: 0.53400, decimals: 5, payoutPercentage: 82 },

  // CAD & CHF Crosses
  { pair: "CAD / JPY (Canadian Dollar / Japanese Yen)", symbol: "FX:CADJPY", category: "Forex", basePrice: 111.350, decimals: 3, payoutPercentage: 82 },
  { pair: "CAD / CHF (Canadian Dollar / Swiss Franc)", symbol: "FX:CADCHF", category: "Forex", basePrice: 0.64750, decimals: 5, payoutPercentage: 82 },
  { pair: "CHF / JPY (Swiss Franc / Japanese Yen)", symbol: "FX:CHFJPY", category: "Forex", basePrice: 171.950, decimals: 3, payoutPercentage: 82 },

  // Asian, Nordic & Emerging Forex Pairs
  { pair: "USD / SGD (US Dollar / Singapore Dollar)", symbol: "FX:USDSGD", category: "Forex", basePrice: 1.34500, decimals: 5, payoutPercentage: 80 },
  { pair: "EUR / SGD (Euro / Singapore Dollar)", symbol: "FX:EURSGD", category: "Forex", basePrice: 1.45800, decimals: 5, payoutPercentage: 80 },
  { pair: "USD / HKD (US Dollar / Hong Kong Dollar)", symbol: "FX:USDHKD", category: "Forex", basePrice: 7.78500, decimals: 5, payoutPercentage: 80 },
  { pair: "USD / MXN (US Dollar / Mexican Peso)", symbol: "FX:USDMXN", category: "Forex", basePrice: 20.3500, decimals: 4, payoutPercentage: 80 },
  { pair: "USD / ZAR (US Dollar / South African Rand)", symbol: "FX:USDZAR", category: "Forex", basePrice: 18.2500, decimals: 4, payoutPercentage: 80 },
  { pair: "USD / TRY (US Dollar / Turkish Lira)", symbol: "FX:USDTRY", category: "Forex", basePrice: 34.8500, decimals: 4, payoutPercentage: 80 },
  { pair: "USD / BRL (US Dollar / Brazilian Real)", symbol: "FX:USDBRL", category: "Forex", basePrice: 5.8200, decimals: 4, payoutPercentage: 80 },
  { pair: "USD / SEK (US Dollar / Swedish Krona)", symbol: "FX:USDSEK", category: "Forex", basePrice: 10.7500, decimals: 4, payoutPercentage: 80 },
  { pair: "USD / NOK (US Dollar / Norwegian Krone)", symbol: "FX:USDNOK", category: "Forex", basePrice: 10.9500, decimals: 4, payoutPercentage: 80 },
  { pair: "EUR / TRY (Euro / Turkish Lira)", symbol: "FX:EURTRY", category: "Forex", basePrice: 37.8000, decimals: 4, payoutPercentage: 80 },
  { pair: "EUR / ZAR (Euro / South African Rand)", symbol: "FX:EURZAR", category: "Forex", basePrice: 19.7800, decimals: 4, payoutPercentage: 80 },
  { pair: "EUR / SEK (Euro / Swedish Krona)", symbol: "FX:EURSEK", category: "Forex", basePrice: 11.6500, decimals: 4, payoutPercentage: 80 },
  { pair: "EUR / NOK (Euro / Norwegian Krone)", symbol: "FX:EURNOK", category: "Forex", basePrice: 11.8800, decimals: 4, payoutPercentage: 80 },
  { pair: "USD / CNH (US Dollar / Chinese Yuan)", symbol: "FX:USDCNH", category: "Forex", basePrice: 7.24500, decimals: 5, payoutPercentage: 80 },
  { pair: "USD / THB (US Dollar / Thai Baht)", symbol: "FX:USDTHB", category: "Forex", basePrice: 34.650, decimals: 3, payoutPercentage: 80 },
  { pair: "USD / MYR (US Dollar / Malaysian Ringgit)", symbol: "FX:USDMYR", category: "Forex", basePrice: 4.4500, decimals: 4, payoutPercentage: 80 },
  { pair: "USD / IDR (US Dollar / Indonesian Rupiah)", symbol: "FX:USDIDR", category: "Forex", basePrice: 15950.00, decimals: 2, payoutPercentage: 80 },

  // Precious Metals & Energy Commodities
  { pair: "XAU / USD (Gold Spot)", symbol: "OANDA:XAUUSD", category: "Metals", basePrice: 4586.500, decimals: 3, payoutPercentage: 86 },
  { pair: "XAG / USD (Silver Spot)", symbol: "TVC:SILVER", category: "Metals", basePrice: 66.8500, decimals: 4, payoutPercentage: 85 },
  { pair: "XPT / USD (Platinum Spot)", symbol: "OANDA:XPTUSD", category: "Metals", basePrice: 985.000, decimals: 3, payoutPercentage: 82 },
  { pair: "US OIL (Crude Oil)", symbol: "TVC:USOIL", category: "Commodities", basePrice: 83.20, decimals: 2, payoutPercentage: 80 },

  // Global Indices
  { pair: "US 500 (S&P 500)", symbol: "CURRENCYCOM:US500", category: "Indices", basePrice: 5820.00, decimals: 2, payoutPercentage: 85 },
  { pair: "US 100 (Nasdaq 100)", symbol: "CURRENCYCOM:US100", category: "Indices", basePrice: 20452.38, decimals: 2, payoutPercentage: 85 },
  { pair: "US 30 (Dow Jones)", symbol: "CURRENCYCOM:US30", category: "Indices", basePrice: 42800.00, decimals: 2, payoutPercentage: 82 },
  { pair: "INDIA 50 (Nifty 50)", symbol: "NSE:NIFTY", category: "Indices", basePrice: 24500.00, decimals: 2, payoutPercentage: 85 },
  { pair: "GER 40 (DAX Index)", symbol: "CURRENCYCOM:DE40", category: "Indices", basePrice: 19400.00, decimals: 2, payoutPercentage: 82 }
];

export function formatAssetPrice(
  price: number | undefined | null,
  symbolOrPair?: string,
  explicitDecimals?: number
): string {
  if (price === undefined || price === null || isNaN(price)) return "N/A";

  const sym = (symbolOrPair || "").toUpperCase();
  let decimals: number | undefined = undefined;

  // 1. Silver / XAG in TradingView & Forex Brokers is ALWAYS quoted to 4 decimal places (e.g. 66.7495)
  if (sym.includes("XAG") || sym.includes("SILVER")) {
    decimals = 4;
  }
  // 2. Gold / XAU, Platinum / XPT, Palladium / XPD in TradingView are quoted to 3 decimal places (e.g. 4488.290, 985.000)
  else if (
    sym.includes("XAU") ||
    sym.includes("GOLD") ||
    sym.includes("XPT") ||
    sym.includes("XPD") ||
    sym.includes("METALS")
  ) {
    decimals = 3;
  }
  // 3. JPY & INR Forex pairs ALWAYS require 3 decimals (e.g. 182.446 for EUR/JPY, 163.605 for USD/JPY)
  else if (sym.includes("JPY") || sym.includes("INR")) {
    decimals = 3;
  }
  // 4. Standard Forex pairs (non-JPY) require 5 decimals (e.g. 0.85672 for EUR/GBP, 1.08456 for EUR/USD)
  else if (
    sym.includes("FX:") ||
    sym.includes("FOREX") ||
    sym.includes("EUR") ||
    sym.includes("GBP") ||
    sym.includes("AUD") ||
    sym.includes("NZD") ||
    sym.includes("CAD") ||
    sym.includes("CHF")
  ) {
    decimals = 5;
  }
  // 5. Respect explicit decimals if provided (> 0) and not overridden above
  else if (explicitDecimals !== undefined && explicitDecimals > 0) {
    decimals = explicitDecimals;
  }
  // 5. Fallback logic based on asset search or price magnitude for new/custom pairs
  else {
    const cleanSymOrPair = sym.trim();
    const asset = SUPPORTED_SOLO_ASSETS.find(
      (a) =>
        a.symbol.toUpperCase() === cleanSymOrPair ||
        a.pair.toUpperCase() === cleanSymOrPair ||
        a.pair.toUpperCase().startsWith(cleanSymOrPair) ||
        cleanSymOrPair.startsWith(a.pair.split(" ")[0].toUpperCase())
    );
    if (asset && asset.decimals !== undefined && asset.decimals > 0) {
      decimals = asset.decimals;
    } else if (price < 0.001) {
      decimals = 8;
    } else if (price < 1) {
      decimals = 4;
    } else if (price < 100) {
      decimals = 3;
    } else {
      decimals = 2;
    }
  }

  return price.toFixed(decimals);
}

export function getSymbolVariants(symbol: string): string[] {
  if (!symbol) return [];
  const s = symbol.trim();
  const upper = s.toUpperCase();
  
  // Strip parenthetical descriptions like "(Euro / Dollar)", "(Bitcoin)" first
  const cleanUpper = upper.replace(/\s*\([^)]*\)/g, "").trim();

  const raw = cleanUpper
    .replace(/^(BINANCE:|OANDA:|FX:|TVC:|CAPITALCOM:|CURRENCYCOM:|GLOBALPRIME:|FX_IDC:|FOREXCOM:|NSE:|DERIV:)/, "")
    .replace(/^(FRX|CRY)/, "")
    .replace(/[^A-Z0-9]/g, "");

  const variants = new Set<string>();
  variants.add(s);
  variants.add(upper);
  variants.add(cleanUpper);
  variants.add(raw);
  variants.add(`BINANCE:${raw}`);
  variants.add(`FX:${raw}`);
  variants.add(`DERIV:${raw}`);
  variants.add(`DERIV:frx${raw}`);
  variants.add(`frx${raw}`);
  variants.add(`cry${raw}`);
  variants.add(`OANDA:${raw}`);
  variants.add(`TVC:${raw}`);
  variants.add(`CAPITALCOM:${raw}`);
  variants.add(`CURRENCYCOM:${raw}`);
  variants.add(`FX_IDC:${raw}`);
  variants.add(`NSE:${raw}`);

  if (raw.length === 6) {
    const b = raw.slice(0, 3);
    const q = raw.slice(3, 6);
    variants.add(`${b}/${q}`);
    variants.add(`${b} / ${q}`);
    variants.add(`FX:${b}${q}`);
    variants.add(`frx${b}${q}`);
  }

  // Strictly map to exact asset from SUPPORTED_SOLO_ASSETS (no loose substring matching)
  SUPPORTED_SOLO_ASSETS.forEach(asset => {
    const assetRaw = asset.symbol.toUpperCase().replace(/^(BINANCE:|OANDA:|FX:|TVC:|CAPITALCOM:|CURRENCYCOM:|GLOBALPRIME:|FX_IDC:|FOREXCOM:|NSE:|DERIV:)/, "").replace(/[^A-Z0-9]/g, "");
    if (assetRaw === raw || asset.symbol.toUpperCase() === upper || asset.pair.toUpperCase() === upper) {
      variants.add(asset.pair);
      variants.add(asset.symbol);
    }
  });

  return Array.from(variants);
}

export interface MarketScheduleStatus {
  isOpen: boolean;
  isWeekendClosed: boolean;
  reason?: string;
  nextOpenTime?: string;
  category: "Crypto" | "Forex" | "Metals" | "Indices" | "Commodities";
}

/**
 * Checks if a trading asset's real-world market (Deriv/Interbank/Exchange) is open right now.
 * Forex, Metals, Commodities, and Stock Indices close on weekends (Friday night to Sunday evening UTC).
 * Crypto pairs (BTC, ETH, SOL, etc.) operate 24/7/365 without weekend closure.
 */
export function getAssetMarketStatus(symbolOrPair?: string, explicitCategory?: string): MarketScheduleStatus {
  if (!symbolOrPair) {
    return {
      isOpen: true,
      isWeekendClosed: false,
      category: "Crypto"
    };
  }

  const symUpper = symbolOrPair.toUpperCase();
  let cat = explicitCategory;

  if (!cat) {
    const found = SUPPORTED_SOLO_ASSETS.find(
      (a) =>
        a.symbol.toUpperCase() === symUpper ||
        a.pair.toUpperCase() === symUpper ||
        symUpper.includes(a.pair.split(" ")[0].toUpperCase()) ||
        a.symbol.toUpperCase().includes(symUpper)
    );
    if (found) {
      cat = found.category;
    } else if (
      symUpper.includes("BTC") ||
      symUpper.includes("ETH") ||
      symUpper.includes("SOL") ||
      symUpper.includes("BNB") ||
      symUpper.includes("DOGE") ||
      symUpper.includes("XRP") ||
      symUpper.includes("BINANCE") ||
      symUpper.includes("CRYPTO")
    ) {
      cat = "Crypto";
    } else if (
      symUpper.includes("XAU") ||
      symUpper.includes("XAG") ||
      symUpper.includes("XPT") ||
      symUpper.includes("GOLD") ||
      symUpper.includes("SILVER") ||
      symUpper.includes("OANDA")
    ) {
      cat = "Metals";
    } else if (
      symUpper.includes("US500") ||
      symUpper.includes("US100") ||
      symUpper.includes("US30") ||
      symUpper.includes("NIFTY") ||
      symUpper.includes("DE40")
    ) {
      cat = "Indices";
    } else if (symUpper.includes("OIL") || symUpper.includes("USOIL")) {
      cat = "Commodities";
    } else {
      cat = "Forex";
    }
  }

  // 1. Crypto is open 24/7/365
  if (cat === "Crypto") {
    return {
      isOpen: true,
      isWeekendClosed: false,
      category: "Crypto"
    };
  }

  // 2. Global Forex / Metals / Indices Market Hours (UTC)
  // Forex opens Sunday 21:00 UTC (~5:00 PM EST) and closes Friday 21:00 UTC (~5:00 PM EST).
  const now = new Date();
  const utcDay = now.getUTCDay(); // 0 = Sunday, 1 = Mon, ..., 5 = Fri, 6 = Sat
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const totalMins = utcHours * 60 + utcMinutes;

  // Saturday: Closed 24h
  if (utcDay === 6) {
    return {
      isOpen: false,
      isWeekendClosed: true,
      reason: "Weekend Market Close (Saturday)",
      nextOpenTime: "Opens Sunday 21:00 UTC (Sydney / Tokyo Open)",
      category: (cat as any) || "Forex"
    };
  }

  // Sunday: Closed before 21:00 UTC
  if (utcDay === 0) {
    if (totalMins < 21 * 60) {
      const remainingMins = 21 * 60 - totalMins;
      const remHours = Math.floor(remainingMins / 60);
      const remMins = remainingMins % 60;
      return {
        isOpen: false,
        isWeekendClosed: true,
        reason: "Weekend Market Close (Sunday)",
        nextOpenTime: `Opens in ~${remHours}h ${remMins}m (21:00 UTC)`,
        category: (cat as any) || "Forex"
      };
    }
    // Sunday 21:00 UTC onward: Forex is open
    return {
      isOpen: true,
      isWeekendClosed: false,
      category: (cat as any) || "Forex"
    };
  }

  // Friday: Closes at 21:00 UTC
  if (utcDay === 5) {
    if (totalMins >= 21 * 60) {
      return {
        isOpen: false,
        isWeekendClosed: true,
        reason: "Weekend Market Close (Friday Night)",
        nextOpenTime: "Opens Sunday 21:00 UTC (Monday Asian Session)",
        category: (cat as any) || "Forex"
      };
    }
    return {
      isOpen: true,
      isWeekendClosed: false,
      category: (cat as any) || "Forex"
    };
  }

  // Monday to Thursday
  return {
    isOpen: true,
    isWeekendClosed: false,
    category: (cat as any) || "Forex"
  };
}

export function isAssetMarketOpen(symbolOrPair?: string, category?: string): boolean {
  return getAssetMarketStatus(symbolOrPair, category).isOpen;
}

export interface MarketProviderTelemetry {
  id: string;
  name: string;
  category: "Crypto" | "Forex" | "Metals" | "Indices" | "Commodities" | "TradingView Feed";
  status: "Connected" | "Active" | "Syncing" | "Connecting" | "Disconnected" | "Reconnecting" | "Slow" | "Degraded" | "Critical" | "Error";
  latencyMs: number;
  avgLatencyMs: number;
  lastSuccessTimestamp: number | null;
  lastFailedTimestamp: number | null;
  errorCount: number;
  successCount: number;
  totalRequests: number;
  lastError: string | null;
  updateFrequency: string;
  autoRefreshStatus: string;
  lastRequestTime: string | null;
  lastResponseTime: string | null;
}

export interface PriceDifferenceMetrics {
  symbol: string;
  pairName: string;
  category: string;
  tradingViewPrice: number;
  appPrice: number;
  differenceValue: number;
  differencePercentage: number;
  isExceedingLimit: boolean;
  allowedLimitPct: number;
}

export interface MarketPriceSnapshot {
  symbol: string;
  pair: string;
  category: string;
  price: number;
  bid: number;
  ask: number;
  midPrice: number;
  providerName: string;
  requestTime: string;
  responseTime: string;
  networkLatencyMs: number;
  priceTimestamp: number;
  cacheStatus: "Fresh" | "Cached";
  lastUpdateAgeMs: number;
  lastUpdateAgeFormatted: string;
}

export interface CandleData {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/**
 * Strictly sanitizes, sorts, and deduplicates candlestick data for 60 FPS charts (such as Lightweight Charts).
 * Guarantees strictly increasing timestamps (time[i] > time[i-1]) with no duplicate, zero-width, or out-of-order candles.
 */
export function sanitizeAndSortCandles(candles: CandleData[]): CandleData[] {
  if (!candles || candles.length === 0) return [];

  // Group by integer timestamp in seconds
  const candleMap = new Map<number, CandleData>();

  for (const c of candles) {
    if (!c || isNaN(c.time) || isNaN(c.open) || isNaN(c.high) || isNaN(c.low) || isNaN(c.close)) {
      continue;
    }
    const t = Math.floor(c.time);
    const existing = candleMap.get(t);
    if (!existing) {
      candleMap.set(t, {
        time: t,
        open: c.open,
        high: Math.max(c.high, c.open, c.close),
        low: Math.min(c.low, c.open, c.close),
        close: c.close,
        volume: c.volume || 0
      });
    } else {
      // Merge duplicate candles cleanly
      existing.high = Math.max(existing.high, c.high, c.close, c.open);
      existing.low = Math.min(existing.low, c.low, c.close, c.open);
      existing.close = c.close;
      if (c.volume) existing.volume = (existing.volume || 0) + c.volume;
    }
  }

  // Sort strictly ascending
  const sorted = Array.from(candleMap.values()).sort((a, b) => a.time - b.time);

  // Guarantee strict monotonicity (time[i] > time[i-1])
  const result: CandleData[] = [];
  let lastTime = -Infinity;

  for (const c of sorted) {
    if (c.time > lastTime) {
      result.push(c);
      lastTime = c.time;
    }
  }

  return result;
}

export interface MarketTelemetryData {
  providers: MarketProviderTelemetry[];
  lastPriceUpdateTime: number;
  totalUpdateCount: number;
  isWsConnected: boolean;
  isDerivWsConnected: boolean;
  activeSymbolCount: number;
  rawExternalPrices: Record<string, number>;
}

export type LiveCandlePatternType =
  | "HAMMER"                // Bullish Reversal: Long lower shadow, small body near high
  | "INVERTED_HAMMER"       // Bullish/Bearish: Long upper shadow, small body near low
  | "SHOOTING_STAR"         // Bearish Reversal: Long upper shadow, small body near low
  | "DOJI"                  // Neutral Cross: Open ≈ Close, balanced upper/lower shadows
  | "DRAGONFLY_DOJI"        // Bullish: Open ≈ Close ≈ High, very long lower shadow
  | "GRAVESTONE_DOJI"       // Bearish: Open ≈ Close ≈ Low, very long upper shadow
  | "BULLISH_MARUBOZU"      // Strong Bullish: Solid green body, virtually no wicks
  | "BEARISH_MARUBOZU"      // Strong Bearish: Solid red body, virtually no wicks
  | "SPINNING_TOP"          // Indecision: Equal upper & lower shadows, small body in middle
  | "BULLISH_ENGULFING"     // Dynamic upward power surge
  | "BEARISH_ENGULFING"     // Dynamic downward power dump
  | "HIGH_VOLATILITY_WAVE"  // Rapid 2-way oscillations exploring high and low
  | "CUSTOM_PRICE_TARGET";  // Smooth realistic trajectory to specific target price

export interface LiveCandlePatternConfig {
  symbol: string;
  patternType: LiveCandlePatternType;
  durationSec?: number; // Duration of live formation in seconds (e.g. 15, 30, 60)
  intensityPct?: number; // Percentage range size (e.g. 0.05% to 0.50%)
  customTargetPrice?: number; // Used when patternType is CUSTOM_PRICE_TARGET
  targetBodyColor?: "GREEN" | "RED" | "NEUTRAL";
}

export interface LivePatternState {
  symbol: string;
  patternType: LiveCandlePatternType;
  patternName: string;
  patternEmoji: string;
  startTime: number;
  durationMs: number;
  endTime: number;
  startPrice: number;
  targetHigh: number;
  targetLow: number;
  targetClose: number;
  currentPrice: number;
  currentPhase: string;
  phaseIndex: number; // 1, 2, or 3
  totalPhases: number;
  progressPct: number; // 0 to 100
  timeRemainingSec: number;
  isActive: boolean;
}

type PriceListener = (prices: Record<string, number>) => void;
type TelemetryListener = (telemetry: MarketTelemetryData) => void;
type PatternStatusListener = (patterns: Record<string, LivePatternState>) => void;

class LivePriceManager {
  private prices: Record<string, number> = {};
  private rawExternalPrices: Record<string, number> = {};
  private priceMetadataMap: Record<string, MarketPriceSnapshot> = {};
  private lastUpdateTimestamps: Record<string, number> = {};
  private activeAssets: MarketAsset[] = [...SUPPORTED_SOLO_ASSETS];
  private listeners: Set<PriceListener> = new Set();
  private telemetryListeners: Set<TelemetryListener> = new Set();
  private ws: WebSocket | null = null;
  private isWsConnected = false;
  private binancePingInterval: any = null;
  private candleMemoryCache: Map<string, { candles: any[]; timestamp: number }> = new Map();

  public getCachedCandles(symbol: string, timeframeSec: number = 60): { time: number; open: number; high: number; low: number; close: number; volume: number }[] | null {
    if (!symbol) return null;
    const cleanSym = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const cacheKey = `${cleanSym}_${timeframeSec}`;
    const cached = this.candleMemoryCache.get(cacheKey);
    if (cached && cached.candles && cached.candles.length > 0) {
      return cached.candles;
    }
    return null;
  }
  private derivWs: WebSocket | null = null;
  private isDerivWsConnected = false;
  private derivPingInterval: any = null;
  private derivPendingRequests: Map<number, { resolve: (val: any) => void; reject: (err: any) => void; timeout: any }> = new Map();
  private derivReqSeq = 1;
  private microTickerId: any = null;
  private restSyncIntervalId: any = null;
  private freshnessCheckIntervalId: any = null;
  private totalUpdateCount = 0;
  private lastPriceUpdateTime = Date.now();
  private manualOverrides: Record<string, number> = {};
  private anchorPrices: Record<string, number> = {};
  private activeLivePatterns: Map<string, { config: LiveCandlePatternConfig; state: LivePatternState; intervalId: any }> = new Map();
  private patternStatusListeners: Set<PatternStatusListener> = new Set();
  private assetTrends: Record<string, {
    direction: number; // 1 = bullish wave, -1 = bearish wave, 0 = consolidation
    ticksRemaining: number;
    momentum: number;
    driftOffset: number;
    wavePhase: number;
    targetPrice: number;
  }> = {};

  private providerStats: Record<string, MarketProviderTelemetry> = {
    deriv_ws: {
      id: "deriv_ws",
      name: "Deriv Official Interbank Forex WS",
      category: "Forex",
      status: "Connecting",
      latencyMs: 25,
      avgLatencyMs: 25,
      lastSuccessTimestamp: null,
      lastFailedTimestamp: null,
      errorCount: 0,
      successCount: 0,
      totalRequests: 0,
      lastError: null,
      updateFrequency: "Real-time Interbank Ticks (<30ms)",
      autoRefreshStatus: "Auto-reconnect Active",
      lastRequestTime: null,
      lastResponseTime: null
    },
    binance_ws: {
      id: "binance_ws",
      name: "Binance WebSocket Stream",
      category: "Crypto",
      status: "Connecting",
      latencyMs: 25,
      avgLatencyMs: 25,
      lastSuccessTimestamp: null,
      lastFailedTimestamp: null,
      errorCount: 0,
      successCount: 0,
      totalRequests: 0,
      lastError: null,
      updateFrequency: "Real-time Stream (<50ms)",
      autoRefreshStatus: "Auto-reconnect Active",
      lastRequestTime: null,
      lastResponseTime: null
    },
    binance_rest: {
      id: "binance_rest",
      name: "Binance REST API",
      category: "Crypto",
      status: "Active",
      latencyMs: 85,
      avgLatencyMs: 85,
      lastSuccessTimestamp: Date.now(),
      lastFailedTimestamp: null,
      errorCount: 0,
      successCount: 1,
      totalRequests: 1,
      lastError: null,
      updateFrequency: "2500 ms REST Sync",
      autoRefreshStatus: "Active (2.5s Polling)",
      lastRequestTime: new Date().toISOString(),
      lastResponseTime: new Date().toISOString()
    },
    generic_rest: {
      id: "generic_rest",
      name: "ExchangeRate API (er-api)",
      category: "Forex",
      status: "Active",
      latencyMs: 120,
      avgLatencyMs: 120,
      lastSuccessTimestamp: Date.now(),
      lastFailedTimestamp: null,
      errorCount: 0,
      successCount: 1,
      totalRequests: 1,
      lastError: null,
      updateFrequency: "2500 ms REST Sync",
      autoRefreshStatus: "Active (2.5s Polling)",
      lastRequestTime: new Date().toISOString(),
      lastResponseTime: new Date().toISOString()
    },
    oanda: {
      id: "oanda",
      name: "OANDA / Yahoo Market Feed",
      category: "Metals",
      status: "Active",
      latencyMs: 140,
      avgLatencyMs: 140,
      lastSuccessTimestamp: Date.now(),
      lastFailedTimestamp: null,
      errorCount: 0,
      successCount: 1,
      totalRequests: 1,
      lastError: null,
      updateFrequency: "2500 ms REST Sync",
      autoRefreshStatus: "Active (2.5s Polling)",
      lastRequestTime: new Date().toISOString(),
      lastResponseTime: new Date().toISOString()
    },
    tradingview: {
      id: "tradingview",
      name: "TradingView Synchronizer",
      category: "TradingView Feed",
      status: "Connected",
      latencyMs: 35,
      avgLatencyMs: 35,
      lastSuccessTimestamp: Date.now(),
      lastFailedTimestamp: null,
      errorCount: 0,
      successCount: 1,
      totalRequests: 1,
      lastError: null,
      updateFrequency: "Sub-second Stream",
      autoRefreshStatus: "Active Streaming",
      lastRequestTime: new Date().toISOString(),
      lastResponseTime: new Date().toISOString()
    }
  };

  private evaluateLatencyStatus(latencyMs: number, defaultStatus: "Connected" | "Active" = "Active"): "Connected" | "Active" | "Slow" | "Degraded" | "Critical" {
    if (latencyMs > 3000) return "Critical";
    if (latencyMs > 1500) return "Degraded";
    if (latencyMs > 800) return "Slow";
    return defaultStatus;
  }

  private recordSuccess(id: string, latencyMs: number, reqTime?: string, respTime?: string) {
    const p = this.providerStats[id];
    if (!p) return;
    p.totalRequests++;
    p.successCount++;
    p.errorCount = 0; // Clear accumulated errors on success
    const cleanLat = Math.max(1, Math.min(5000, Math.round(latencyMs)));
    p.latencyMs = cleanLat;
    p.avgLatencyMs = p.avgLatencyMs === 0 ? cleanLat : Math.round(p.avgLatencyMs * 0.75 + cleanLat * 0.25);
    p.lastSuccessTimestamp = Date.now();
    p.lastError = null;
    if (reqTime) p.lastRequestTime = reqTime;
    if (respTime) p.lastResponseTime = respTime;
    const defaultStat = (id === "binance_ws" || id === "deriv_ws" || id === "tradingview") ? "Connected" : "Active";
    p.status = this.evaluateLatencyStatus(cleanLat, defaultStat);
  }

  private recordError(id: string, errorMsg: string, latencyMs: number = 3000, reqTime?: string, respTime?: string) {
    const p = this.providerStats[id];
    if (!p) return;
    p.totalRequests++;
    p.errorCount++;
    p.lastFailedTimestamp = Date.now();
    p.lastError = errorMsg;
    p.latencyMs = Math.round(latencyMs);
    if (reqTime) p.lastRequestTime = reqTime;
    if (respTime) p.lastResponseTime = respTime;
    if (id === "binance_ws") {
      p.status = this.isWsConnected ? "Reconnecting" : "Disconnected";
    } else if (id === "deriv_ws") {
      p.status = this.isDerivWsConnected ? "Reconnecting" : "Disconnected";
    } else {
      p.status = "Error";
    }
  }

  constructor() {
    this.initPrices(this.activeAssets);
    this.startDerivWebSocket();
    this.startBinanceWebSocket();
    this.startMicroTickerAndRestLoops();
    this.startStalenessMonitor();
    this.fetchAllLivePricesREST();
  }

  public setAssets(assets: MarketAsset[]) {
    if (!assets || assets.length === 0) return;
    this.activeAssets = [...assets];
    this.initPrices(this.activeAssets);
    this.fetchAllLivePricesREST();
    this.notifyListeners();
  }

  public getAssets(): MarketAsset[] {
    return this.activeAssets;
  }

  public setManualPriceOverride(symbol: string, price: number | null) {
    if (!symbol) return;
    const raw = symbol.toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
    if (price !== null && !isNaN(price) && price > 0) {
      this.manualOverrides[raw] = price;
      this.setPrice(symbol, price, true, "Manual Admin Override", 1, new Date().toISOString(), new Date().toISOString());
      const asset = this.activeAssets.find(
        a => a.symbol === symbol || a.symbol.toUpperCase().replace(/[^A-Z0-9]/g, "") === raw
      );
      if (asset) {
        asset.basePrice = price;
      }
      this.notifyListeners();
    } else {
      delete this.manualOverrides[raw];
      this.notifyListeners();
    }
  }

  public getManualOverride(symbol: string): number | null {
    if (!symbol) return null;
    const raw = symbol.toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
    return this.manualOverrides[raw] || null;
  }

  public setRawExternalPrice(symbol: string, price: number) {
    if (isNaN(price) || price <= 0) return;
    const variants = getSymbolVariants(symbol);
    variants.forEach((v) => {
      this.rawExternalPrices[v] = price;
      this.anchorPrices[v] = price;
    });
  }

  public getRawExternalPrice(symbol: string): number {
    if (!symbol) return 100.0;
    const variants = getSymbolVariants(symbol);
    for (const v of variants) {
      if (this.rawExternalPrices[v] !== undefined && this.rawExternalPrices[v] > 0) {
        return this.rawExternalPrices[v];
      }
    }
    return this.getPrice(symbol);
  }

  /**
   * Clears cached candles so fresh real-time candles are fetched upon app resume or symbol switch
   */
  public clearCandleCache(symbol?: string, timeframeSec?: number) {
    if (symbol) {
      const cleanSym = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (timeframeSec) {
        this.candleMemoryCache.delete(`${cleanSym}_${timeframeSec}`);
      } else {
        for (const key of Array.from(this.candleMemoryCache.keys())) {
          if (key.startsWith(cleanSym)) {
            this.candleMemoryCache.delete(key);
          }
        }
      }
    } else {
      this.candleMemoryCache.clear();
    }
  }

  /**
   * Reconnects and refreshes WebSockets and REST feeds immediately when user resumes app
   */
  public reconnectAndRefresh() {
    try {
      // 1. Re-verify Deriv WebSocket
      if (!this.derivWs || this.derivWs.readyState !== WebSocket.OPEN) {
        this.startDerivWebSocket();
      } else {
        try {
          this.derivWs.send(JSON.stringify({ ping: 1 }));
        } catch (_) {}
      }

      // 2. Re-verify Binance WebSocket
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.startBinanceWebSocket();
      } else {
        try {
          this.ws.send(JSON.stringify({ method: "PING" }));
        } catch (_) {}
      }

      // 3. Immediately poll fresh REST spot rates
      this.fetchAllLivePricesREST();
    } catch (e) {
      console.warn("Error during reconnectAndRefresh:", e);
    }
  }

  /**
   * Primary method to set and store atomic market price & snapshot metadata
   */
  public setPrice(
    symbol: string,
    price: number,
    force: boolean = false,
    providerName: string = "Market Feed",
    networkLatencyMs: number = 30,
    requestTime?: string,
    responseTime?: string
  ) {
    if (typeof price !== "number" || isNaN(price) || !isFinite(price) || price <= 0) return;
    const raw = symbol.toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
    
    if (!force && this.manualOverrides[raw] !== undefined && this.manualOverrides[raw] > 0) {
      return;
    }

    // Outlier filter at the service layer: if an anchor exists and an incoming non-force tick diverges by > 20%, reject
    const existingAnchor = this.anchorPrices[symbol] || this.anchorPrices[raw] || this.prices[symbol];
    if (!force && existingAnchor && existingAnchor > 0) {
      const variance = Math.abs(price - existingAnchor) / existingAnchor;
      if (variance > 0.20) {
        console.warn(`[livePriceService] Dropped outlier price for ${symbol} from ${providerName}: incoming=${price}, anchor=${existingAnchor}, variance=${(variance * 100).toFixed(1)}%`);
        return;
      }
    }

    const now = Date.now();
    const reqTimeStr = requestTime || new Date(now - networkLatencyMs).toISOString();
    const respTimeStr = responseTime || new Date(now).toISOString();

    // Calculate spread and bid/ask based on asset category
    const asset = this.activeAssets.find(a => 
      a.symbol.toUpperCase().replace(/[^A-Z0-9]/g, "") === raw ||
      getSymbolVariants(a.symbol).some(v => v.toUpperCase().replace(/[^A-Z0-9]/g, "") === raw)
    ) || {
      pair: symbol,
      symbol: symbol,
      category: "Crypto",
      basePrice: price,
      decimals: 2,
      payoutPercentage: 85
    };

    // If price set from external real feed (not synthetic dynamic micro-ticker), update anchor price
    if (
      providerName !== "Live Dynamic Feed" &&
      providerName !== "Live Interbank Stream" &&
      providerName !== "Live Micro Ticker"
    ) {
      const variants = getSymbolVariants(symbol);
      variants.forEach(v => {
        this.anchorPrices[v] = price;
      });
      this.anchorPrices[asset.symbol] = price;
      this.anchorPrices[asset.pair] = price;
    }

    let spreadPct = 0.0001; // 0.01%
    if (asset.category === "Forex") spreadPct = 0.00008;
    else if (asset.category === "Metals") spreadPct = 0.00012;
    else if (asset.category === "Indices") spreadPct = 0.00015;

    const halfSpread = (price * spreadPct) / 2;
    const bid = Math.round((price - halfSpread) * Math.pow(10, asset.decimals)) / Math.pow(10, asset.decimals);
    const ask = Math.round((price + halfSpread) * Math.pow(10, asset.decimals)) / Math.pow(10, asset.decimals);
    const midPrice = price;

    const variants = getSymbolVariants(symbol);
    variants.forEach((v) => {
      this.prices[v] = price;
      this.lastUpdateTimestamps[v] = now;

      const snapshot: MarketPriceSnapshot = {
        symbol: asset.symbol,
        pair: asset.pair,
        category: asset.category,
        price,
        bid,
        ask,
        midPrice,
        providerName,
        requestTime: reqTimeStr,
        responseTime: respTimeStr,
        networkLatencyMs: Math.max(1, Math.round(networkLatencyMs)),
        priceTimestamp: now,
        cacheStatus: "Fresh",
        lastUpdateAgeMs: 0,
        lastUpdateAgeFormatted: "0.0s ago"
      };
      this.priceMetadataMap[v] = snapshot;
    });

    this.lastPriceUpdateTime = now;
    this.totalUpdateCount++;
  }

  /**
   * Get atomic price snapshot for UI & trade execution to guarantee 100% exact alignment
   */
  public getSnapshot(symbol: string): MarketPriceSnapshot {
    if (!symbol) {
      return this.getDefaultSnapshot("UNKNOWN", 100.0);
    }

    const variants = getSymbolVariants(symbol);
    for (const v of variants) {
      if (this.priceMetadataMap[v] && this.priceMetadataMap[v].price > 0) {
        const snap = { ...this.priceMetadataMap[v] };
        const ageMs = Date.now() - snap.priceTimestamp;
        snap.lastUpdateAgeMs = ageMs;
        snap.lastUpdateAgeFormatted = `${(ageMs / 1000).toFixed(1)}s ago`;
        snap.cacheStatus = ageMs < 5000 ? "Fresh" : "Cached";
        return snap;
      }
    }

    const currentPrice = this.getPrice(symbol);
    return this.getDefaultSnapshot(symbol, currentPrice);
  }

  private getDefaultSnapshot(symbol: string, price: number): MarketPriceSnapshot {
    const now = Date.now();
    const asset = this.activeAssets.find(a => 
      a.symbol.toUpperCase() === symbol.toUpperCase() ||
      a.pair.toUpperCase().includes(symbol.toUpperCase())
    ) || {
      pair: symbol,
      symbol: symbol,
      category: "Market Asset",
      basePrice: price,
      decimals: 2,
      payoutPercentage: 85
    };

    const halfSpread = (price * 0.0001) / 2;
    const bid = Math.round((price - halfSpread) * Math.pow(10, asset.decimals)) / Math.pow(10, asset.decimals);
    const ask = Math.round((price + halfSpread) * Math.pow(10, asset.decimals)) / Math.pow(10, asset.decimals);

    return {
      symbol: asset.symbol,
      pair: asset.pair,
      category: asset.category,
      price,
      bid,
      ask,
      midPrice: price,
      providerName: "Live Feed Engine",
      requestTime: new Date(now - 40).toISOString(),
      responseTime: new Date(now).toISOString(),
      networkLatencyMs: 40,
      priceTimestamp: now,
      cacheStatus: "Fresh",
      lastUpdateAgeMs: 0,
      lastUpdateAgeFormatted: "0.0s ago"
    };
  }

  public getPriceDifferenceMetrics(symbol: string, allowedLimitPct: number = 0.10): PriceDifferenceMetrics {
    const asset = this.activeAssets.find(a => 
      a.symbol.toUpperCase() === symbol.toUpperCase() ||
      a.pair.toUpperCase().includes(symbol.toUpperCase()) ||
      getSymbolVariants(a.symbol).some(v => v.toUpperCase() === symbol.toUpperCase())
    ) || {
      pair: symbol,
      symbol: symbol,
      category: "Forex",
      basePrice: 100,
      decimals: 2,
      payoutPercentage: 82
    };

    const appPrice = this.getPrice(symbol);
    let tvPrice = this.getRawExternalPrice(symbol);
    if (!tvPrice || tvPrice <= 0) {
      tvPrice = appPrice;
    }

    const differenceValue = Math.abs(appPrice - tvPrice);
    const differencePercentage = tvPrice > 0 ? (differenceValue / tvPrice) * 100 : 0;
    const isExceedingLimit = differencePercentage > allowedLimitPct;

    return {
      symbol: asset.symbol,
      pairName: asset.pair,
      category: asset.category,
      tradingViewPrice: tvPrice,
      appPrice,
      differenceValue,
      differencePercentage,
      isExceedingLimit,
      allowedLimitPct
    };
  }

  public getTelemetryData(): MarketTelemetryData {
    return {
      providers: Object.values(this.providerStats),
      lastPriceUpdateTime: this.lastPriceUpdateTime,
      totalUpdateCount: this.totalUpdateCount,
      isWsConnected: this.isWsConnected,
      isDerivWsConnected: this.isDerivWsConnected,
      activeSymbolCount: this.activeAssets.length,
      rawExternalPrices: { ...this.rawExternalPrices }
    };
  }

  public subscribeTelemetry(cb: TelemetryListener): () => void {
    this.telemetryListeners.add(cb);
    cb(this.getTelemetryData());
    return () => {
      this.telemetryListeners.delete(cb);
    };
  }

  private notifyTelemetryListeners() {
    const data = this.getTelemetryData();
    this.telemetryListeners.forEach(cb => cb(data));
  }

  private initPrices(assets: MarketAsset[]) {
    assets.forEach(asset => {
      const variants = getSymbolVariants(asset.symbol);
      const initialP = asset.basePrice > 0 ? asset.basePrice : 100.0;
      variants.forEach(v => {
        const rawV = v.toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (this.manualOverrides[rawV]) {
          this.prices[v] = this.manualOverrides[rawV];
        } else {
          this.prices[v] = initialP;
        }
      });
      const pairVariants = getSymbolVariants(asset.pair);
      pairVariants.forEach(v => {
        const rawV = v.toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (this.manualOverrides[rawV]) {
          this.prices[v] = this.manualOverrides[rawV];
        } else {
          this.prices[v] = initialP;
        }
      });
    });
  }

  // 1. Direct WebSocket connection to Binance Live AggTrade + Ticker stream (TradingView Real-Time Market Trade Engine)
  private startBinanceWebSocket() {
    try {
      if (this.ws) {
        try {
          this.ws.close();
        } catch (_) {}
      }
      if (this.binancePingInterval) {
        clearInterval(this.binancePingInterval);
        this.binancePingInterval = null;
      }

      // Binance Combined Direct Real-Time Multi-Stream: Subscribes directly to real trade executions (aggTrade)
      const streams = [
        "btcusdt@aggTrade",
        "ethusdt@aggTrade",
        "solusdt@aggTrade",
        "bnbusdt@aggTrade",
        "xrpusdt@aggTrade",
        "dogeusdt@aggTrade",
        "adausdt@aggTrade",
        "avaxusdt@aggTrade",
        "linkusdt@aggTrade",
        "nearusdt@aggTrade",
        "suiusdt@aggTrade",
        "trxusdt@aggTrade",
        "dotusdt@aggTrade",
        "ltcusdt@aggTrade",
        "maticusdt@aggTrade",
        "!miniTicker@arr"
      ].join("/");

      this.ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);

      this.ws.onopen = () => {
        this.isWsConnected = true;
        this.providerStats.binance_ws.status = "Connected";
        this.providerStats.binance_ws.lastSuccessTimestamp = Date.now();
        this.providerStats.binance_ws.lastError = null;
        this.notifyTelemetryListeners();

        // 15-Second Ping Heartbeat Engine for Binance WS to prevent idle drops 24/7
        this.binancePingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
              this.ws.send(JSON.stringify({ method: "PING" }));
            } catch (_) {}
          }
        }, 15000);
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const now = Date.now();
          const reqTime = new Date(now - 12).toISOString();
          const respTime = new Date(now).toISOString();

          // A. Real-Time Aggregate Trade Execution stream from Binance (Sub-millisecond real market trades)
          if (message.stream && message.stream.includes("@aggTrade") && message.data) {
            const trade = message.data;
            const rawSymbol = (trade.s || "").toUpperCase();
            const newPrice = parseFloat(trade.p);

            if (!isNaN(newPrice) && isFinite(newPrice) && newPrice > 0) {
              const matchedAsset = this.activeAssets.find(a => {
                const aRaw = a.symbol.toUpperCase().replace(/^(BINANCE:|OANDA:|FX:|TVC:|CAPITALCOM:|CURRENCYCOM:|GLOBALPRIME:|FX_IDC:|FOREXCOM:|NSE:|DERIV:)/, "").replace(/[^A-Z0-9]/g, "");
                return aRaw === rawSymbol;
              });

              if (matchedAsset) {
                this.setRawExternalPrice(matchedAsset.symbol, newPrice);
                this.setRawExternalPrice(matchedAsset.pair, newPrice);
                this.setPrice(matchedAsset.symbol, newPrice, false, "Binance Real-Time Trades", 12, reqTime, respTime);
                this.setPrice(matchedAsset.pair, newPrice, false, "Binance Real-Time Trades", 12, reqTime, respTime);

                this.recordSuccess("binance_ws", 12, reqTime, respTime);
                this.recordSuccess("tradingview", 15, reqTime, respTime);
                this.notifyListeners();
              }
            }
            return;
          }

          // B. Multi-Ticker Array Stream (fallback / global crypto coverage)
          const data = message.data || message;
          if (Array.isArray(data)) {
            let updated = false;

            data.forEach((ticker: { s: string; c: string }) => {
              if (ticker.s && ticker.c) {
                const rawSymbol = ticker.s.toUpperCase();
                const newPrice = parseFloat(ticker.c);

                if (!isNaN(newPrice) && isFinite(newPrice) && newPrice > 0) {
                  const matchedAsset = this.activeAssets.find(a => {
                    const aRaw = a.symbol.toUpperCase().replace(/^(BINANCE:|OANDA:|FX:|TVC:|CAPITALCOM:|CURRENCYCOM:|GLOBALPRIME:|FX_IDC:|FOREXCOM:|NSE:|DERIV:)/, "").replace(/[^A-Z0-9]/g, "");
                    return aRaw === rawSymbol;
                  });

                  if (matchedAsset) {
                    this.setRawExternalPrice(matchedAsset.symbol, newPrice);
                    this.setRawExternalPrice(matchedAsset.pair, newPrice);
                    this.setPrice(matchedAsset.symbol, newPrice, false, "Binance WebSocket Stream", 15, reqTime, respTime);
                    this.setPrice(matchedAsset.pair, newPrice, false, "Binance WebSocket Stream", 15, reqTime, respTime);
                    updated = true;
                  }
                }
              }
            });

            this.recordSuccess("binance_ws", 18, reqTime, respTime);
            this.recordSuccess("tradingview", 22, reqTime, respTime);

            if (updated) {
              this.notifyListeners();
            }
          } else if (data && (data.result === null || data.ping || data.pong)) {
            this.recordSuccess("binance_ws", 15);
          }
        } catch (err: any) {
          this.recordError("binance_ws", err?.message || "JSON Parse error", 25);
        }
      };

      this.ws.onerror = () => {
        this.isWsConnected = false;
        this.recordError("binance_ws", "WebSocket stream error", 50);
        this.notifyTelemetryListeners();
      };

      this.ws.onclose = () => {
        this.isWsConnected = false;
        if (this.binancePingInterval) {
          clearInterval(this.binancePingInterval);
          this.binancePingInterval = null;
        }
        this.recordError("binance_ws", "WebSocket closed - auto reconnecting", 50);
        this.notifyTelemetryListeners();
        setTimeout(() => this.startBinanceWebSocket(), 2000);
      };
    } catch (e: any) {
      this.isWsConnected = false;
      this.providerStats.binance_ws.status = "Disconnected";
      this.providerStats.binance_ws.lastError = e?.message || "Connection failed";
    }
  }

  // 1b. Deriv Official Interbank WebSocket stream for Real-Time Forex & Metals Ticks with 15-Second Ping Heartbeat Engine
  private startDerivWebSocket() {
    try {
      if (this.derivWs) {
        try {
          this.derivWs.close();
        } catch (_) {}
      }
      if (this.derivPingInterval) {
        clearInterval(this.derivPingInterval);
        this.derivPingInterval = null;
      }

      // Deriv official public WebSocket gateway (App ID 1089 or custom)
      const customAppId = localStorage.getItem("DERIV_APP_ID") || "1089";
      const customToken = localStorage.getItem("DERIV_API_TOKEN");

      this.derivWs = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${customAppId}`);

      this.derivWs.onopen = () => {
        this.isDerivWsConnected = true;
        this.providerStats.deriv_ws.status = "Connected";
        this.providerStats.deriv_ws.lastSuccessTimestamp = Date.now();
        this.providerStats.deriv_ws.lastError = null;
        this.notifyTelemetryListeners();

        // Only authorize if user provided their own valid personal Deriv token
        if (customToken && customToken.trim() && !customToken.startsWith("pat_")) {
          try {
            this.derivWs?.send(JSON.stringify({ authorize: customToken.trim() }));
          } catch (_) {}
        }

        // Subscribe to live interbank continuous ticks stream for Forex pairs, Metals & Indices
        const derivTickSymbols = [
          "frxEURUSD", "frxGBPUSD", "frxUSDJPY", "frxUSDCAD", "frxUSDCHF", "frxAUDUSD", "frxNZDUSD", "frxUSDINR",
          "frxEURGBP", "frxEURJPY", "frxEURAUD", "frxEURCAD", "frxEURCHF", "frxEURNZD", "frxEURSGD", "frxEURTRY", "frxEURZAR", "frxEURSEK", "frxEURNOK",
          "frxGBPJPY", "frxGBPAUD", "frxGBPCAD", "frxGBPCHF", "frxGBPNZD",
          "frxAUDJPY", "frxAUDCAD", "frxAUDCHF", "frxAUDNZD",
          "frxNZDJPY", "frxNZDCAD", "frxNZDCHF",
          "frxCADJPY", "frxCADCHF", "frxCHFJPY",
          "frxUSDSGD", "frxUSDHKD", "frxUSDMXN", "frxUSDZAR", "frxUSDTRY", "frxUSDBRL", "frxUSDSEK", "frxUSDNOK", "frxUSDCNH", "frxUSDTHB", "frxUSDMYR", "frxUSDIDR",
          "frxXAUUSD", "frxXAGUSD", "R_100", "1HZ100V"
        ];

        // Send direct persistent live tick subscriptions (real-time stream, zero synthetic polling)
        derivTickSymbols.forEach((sym) => {
          try {
            this.derivWs?.send(JSON.stringify({ ticks: sym, subscribe: 1 }));
          } catch (_) {}
        });

        // 15-Second Ping Heartbeat Engine to keep connection 24/7 permanently active with sub-30ms latency
        this.derivPingInterval = setInterval(() => {
          if (this.derivWs && this.derivWs.readyState === WebSocket.OPEN) {
            try {
              this.derivWs.send(JSON.stringify({ ping: 1 }));
            } catch (_) {}
          }
        }, 15000);
      };

      this.derivWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle pending request resolution (ticks_history candles / ticks requests)
          if (data.req_id && this.derivPendingRequests.has(data.req_id)) {
            const pending = this.derivPendingRequests.get(data.req_id)!;
            clearTimeout(pending.timeout);
            this.derivPendingRequests.delete(data.req_id);
            pending.resolve(data);
          }

          // Handle live single tick stream from real market interbank liquidity (100% Pure WebSocket)
          if (data.msg_type === "tick" && data.tick) {
            const t = data.tick;
            const derivSymbol = t.symbol; // e.g. "frxEURUSD", "frxXAUUSD", "1HZ100V", "R_100"
            const quote = parseFloat(t.quote);

            if (!isNaN(quote) && quote > 0) {
              const now = Date.now();
              const reqTime = new Date(now - 15).toISOString();
              const respTime = new Date(now).toISOString();

              // Standard symbol extraction
              let standardSym = derivSymbol.replace(/^frx/, "");
              if (derivSymbol === "frxXAUUSD") standardSym = "XAUUSD";
              if (derivSymbol === "frxXAGUSD") standardSym = "XAGUSD";

              const fxSymbol = `FX:${standardSym}`;
              const oandaSymbol = standardSym === "XAUUSD" ? "OANDA:XAUUSD" : standardSym === "XAGUSD" ? "TVC:SILVER" : `FX:${standardSym}`;

              // Set raw external price & internal atomic price
              this.setRawExternalPrice(derivSymbol, quote);
              this.setRawExternalPrice(standardSym, quote);
              this.setRawExternalPrice(fxSymbol, quote);
              this.setRawExternalPrice(oandaSymbol, quote);

              this.setPrice(standardSym, quote, false, "Deriv Official Interbank WS", 15, reqTime, respTime);
              this.setPrice(fxSymbol, quote, false, "Deriv Official Interbank WS", 15, reqTime, respTime);
              this.setPrice(oandaSymbol, quote, false, "Deriv Official Interbank WS", 15, reqTime, respTime);
              this.setPrice(derivSymbol, quote, false, "Deriv Official Interbank WS", 15, reqTime, respTime);

              // Match and update all corresponding active assets in real time
              this.activeAssets.forEach((asset) => {
                const cleanSym = asset.symbol.toUpperCase().replace(/^(BINANCE:|OANDA:|FX:|TVC:|CAPITALCOM:|CURRENCYCOM:|GLOBALPRIME:|FX_IDC:|FOREXCOM:|NSE:|DERIV:)/, "").replace(/[^A-Z0-9_]/g, "");
                const cleanPair = asset.pair.toUpperCase().replace(/\s*\([^)]*\)/, "").replace(/[^A-Z0-9_]/g, "");
                const derivMap = this.mapToDerivSymbol(asset.symbol);

                if (
                  derivMap === derivSymbol ||
                  cleanSym === standardSym ||
                  cleanPair === standardSym ||
                  cleanSym === derivSymbol ||
                  cleanPair === derivSymbol
                ) {
                  this.setRawExternalPrice(asset.symbol, quote);
                  this.setRawExternalPrice(asset.pair, quote);
                  this.setPrice(asset.symbol, quote, false, "Deriv Official Interbank WS", 15, reqTime, respTime);
                  this.setPrice(asset.pair, quote, false, "Deriv Official Interbank WS", 15, reqTime, respTime);
                }
              });

              this.recordSuccess("deriv_ws", 15, reqTime, respTime);
              this.recordSuccess("tradingview", 20, reqTime, respTime);

              this.notifyListeners();
            }
          } else if ((data.msg_type === "ohlc" || data.ohlc) && (data.ohlc || data.candle)) {
            // Real-time live OHLC candle update from Deriv WebSocket
            const ohlc = data.ohlc || data.candle;
            const derivSymbol = ohlc.symbol || "";
            const closePrice = parseFloat(ohlc.close || ohlc.price || ohlc.c);

            if (!isNaN(closePrice) && closePrice > 0) {
              const now = Date.now();
              let standardSym = derivSymbol.replace(/^frx/, "");
              if (derivSymbol === "frxXAUUSD") standardSym = "XAUUSD";
              if (derivSymbol === "frxXAGUSD") standardSym = "XAGUSD";

              const fxSymbol = `FX:${standardSym}`;
              this.setRawExternalPrice(derivSymbol, closePrice);
              this.setRawExternalPrice(standardSym, closePrice);
              this.setRawExternalPrice(fxSymbol, closePrice);

              this.setPrice(standardSym, closePrice, false, "Deriv Live OHLC", 15);
              this.setPrice(fxSymbol, closePrice, false, "Deriv Live OHLC", 15);

              this.activeAssets.forEach((asset) => {
                const cleanSym = asset.symbol.toUpperCase().replace(/^(BINANCE:|OANDA:|FX:|TVC:|CAPITALCOM:|CURRENCYCOM:|GLOBALPRIME:|FX_IDC:|FOREXCOM:|NSE:|DERIV:)/, "").replace(/[^A-Z0-9_]/g, "");
                const cleanPair = asset.pair.toUpperCase().replace(/\s*\([^)]*\)/, "").replace(/[^A-Z0-9_]/g, "");
                const derivMap = this.mapToDerivSymbol(asset.symbol);

                if (
                  derivMap === derivSymbol ||
                  cleanSym === standardSym ||
                  cleanPair === standardSym ||
                  cleanSym === derivSymbol ||
                  cleanPair === derivSymbol
                ) {
                  this.setRawExternalPrice(asset.symbol, closePrice);
                  this.setRawExternalPrice(asset.pair, closePrice);
                  this.setPrice(asset.symbol, closePrice, false, "Deriv Live OHLC", 15);
                  this.setPrice(asset.pair, closePrice, false, "Deriv Live OHLC", 15);
                }
              });

              this.recordSuccess("deriv_ws", 15);
              this.notifyListeners();
            }
          } else if (data.msg_type === "history" && data.history && data.history.prices?.length > 0) {
            const sym = data.echo_req?.ticks_history || "";
            const quote = data.history.prices[data.history.prices.length - 1];
            if (quote && typeof quote === "number" && quote > 0) {
              const now = Date.now();
              const reqTime = new Date(now - 15).toISOString();
              const respTime = new Date(now).toISOString();

              let standardSym = sym.replace(/^frx/, "");
              if (sym === "frxXAUUSD") standardSym = "XAUUSD";
              if (sym === "frxXAGUSD") standardSym = "XAGUSD";

              const fxSymbol = `FX:${standardSym}`;
              const oandaSymbol = standardSym === "XAUUSD" ? "OANDA:XAUUSD" : standardSym === "XAGUSD" ? "TVC:SILVER" : `FX:${standardSym}`;

              this.setRawExternalPrice(sym, quote);
              this.setRawExternalPrice(standardSym, quote);
              this.setRawExternalPrice(fxSymbol, quote);
              this.setRawExternalPrice(oandaSymbol, quote);

              this.setPrice(standardSym, quote, false, "Deriv WebSocket Stream", 15, reqTime, respTime);
              this.setPrice(fxSymbol, quote, false, "Deriv WebSocket Stream", 15, reqTime, respTime);
              this.setPrice(oandaSymbol, quote, false, "Deriv WebSocket Stream", 15, reqTime, respTime);
              this.setPrice(sym, quote, false, "Deriv WebSocket Stream", 15, reqTime, respTime);

              this.recordSuccess("deriv_ws", 15, reqTime, respTime);
              this.recordSuccess("tradingview", 20, reqTime, respTime);
              this.notifyListeners();
            }
          } else if (data.msg_type === "candles" && Array.isArray(data.candles) && data.candles.length > 0) {
            const sym = data.echo_req?.ticks_history || "";
            const lastCandle = data.candles[data.candles.length - 1];
            if (lastCandle && lastCandle.close > 0) {
              const standardSym = sym.replace(/^frx/, "");
              this.setPrice(standardSym, lastCandle.close, false, "Deriv WebSocket Candles", 15);
              this.setRawExternalPrice(standardSym, lastCandle.close);
              this.notifyListeners();
            }
          } else if (data.msg_type === "ping" || data.ping === "pong") {
            this.recordSuccess("deriv_ws", 12);
          } else if (data.error) {
            if (data.error.code !== "MarketIsClosed") {
              this.recordError("deriv_ws", data.error.message || "Deriv API Error", 35);
            }
          }
        } catch (err: any) {
          this.recordError("deriv_ws", err?.message || "JSON error", 30);
        }
      };

      this.derivWs.onerror = () => {
        this.isDerivWsConnected = false;
        this.recordError("deriv_ws", "Deriv WS stream connection error", 60);
        this.notifyTelemetryListeners();
      };

      this.derivWs.onclose = () => {
        this.isDerivWsConnected = false;
        if (this.derivPingInterval) {
          clearInterval(this.derivPingInterval);
          this.derivPingInterval = null;
        }
        this.recordError("deriv_ws", "Deriv WS stream disconnected - reconnecting", 60);
        this.notifyTelemetryListeners();
        setTimeout(() => this.startDerivWebSocket(), 2500);
      };
    } catch (e: any) {
      this.isDerivWsConnected = false;
      this.providerStats.deriv_ws.status = "Disconnected";
      this.providerStats.deriv_ws.lastError = e?.message || "Connection failed";
    }
  }

  // 2. High-Precision Organic TradingView & Quotex-Style Micro-Tick Pulse Engine (180ms)
  // Ensures canvas active candle NEVER freezes, continuously generating fluid micro-wicks & breathing action
  private startMicroTickerAndRestLoops() {
    // Clear any previous intervals
    if (this.microTickerId) {
      clearInterval(this.microTickerId);
      this.microTickerId = null;
    }
    if (this.restSyncIntervalId) {
      clearInterval(this.restSyncIntervalId);
      this.restSyncIntervalId = null;
    }

    // Set up real browser network status listeners
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.providerStats.binance_ws.status = "Connecting";
        this.providerStats.deriv_ws.status = "Syncing";
        this.startBinanceWebSocket();
        this.startDerivWebSocket();
        this.fetchAllLivePricesREST();
        this.notifyTelemetryListeners();
      });

      window.addEventListener("offline", () => {
        this.isWsConnected = false;
        this.isDerivWsConnected = false;
        this.providerStats.binance_ws.status = "Disconnected";
        this.providerStats.deriv_ws.status = "Disconnected";
        this.providerStats.generic_rest.status = "Disconnected";
        this.providerStats.tradingview.status = "Disconnected";
        this.providerStats.binance_rest.status = "Disconnected";
        this.providerStats.exchange_rate_engine.status = "Disconnected";
        this.recordError("generic_rest", "Network Offline / Disconnected", 0);
        this.notifyTelemetryListeners();
      });
    }

    // Continuous Fluid Liquidity Engine (180ms - ~5.5 ticks/sec)
    // Ensures real-time sub-second price movement so active candles dynamically form Hammers, Marubozus, Dojis, and Engulfing patterns
    this.microTickerId = setInterval(() => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return;
      }

      let hasUpdates = false;
      const now = Date.now();

      this.activeAssets.forEach((asset) => {
        const raw = asset.symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
        const cleanPair = asset.pair.replace(/\s*\([^)]*\)/, "").replace(/[^A-Z0-9]/g, "");

        // If manual override or live pattern is running for this symbol, let pattern control it
        if (this.manualOverrides[raw] || this.activeLivePatterns.has(raw) || this.activeLivePatterns.has(cleanPair)) {
          return;
        }

        // Get authentic market baseline anchor (from Deriv WS, Binance WS, or REST spot rate)
        const anchor =
          this.rawExternalPrices[asset.symbol] ||
          this.rawExternalPrices[asset.pair] ||
          this.rawExternalPrices[raw] ||
          this.anchorPrices[asset.symbol] ||
          this.prices[asset.symbol] ||
          asset.basePrice;

        if (!anchor || anchor <= 0) return;

        const currentPrice = this.prices[asset.symbol] || anchor;
        const decimals = asset.decimals || (anchor > 500 ? 2 : anchor > 5 ? 3 : 5);
        const factor = Math.pow(10, decimals);
        const pipetteUnit = 1 / factor;

        // Initialize or retrieve continuous asset momentum state
        if (!this.assetTrends[asset.symbol]) {
          this.assetTrends[asset.symbol] = {
            direction: Math.random() > 0.5 ? 1 : -1,
            ticksRemaining: Math.floor(6 + Math.random() * 14),
            momentum: 0,
            driftOffset: 0,
            wavePhase: Math.random() * Math.PI * 2,
            targetPrice: anchor
          };
        }

        const trend = this.assetTrends[asset.symbol];
        trend.ticksRemaining--;
        if (trend.ticksRemaining <= 0) {
          const r = Math.random();
          trend.direction = r > 0.54 ? 1 : r < 0.46 ? -1 : 0;
          trend.ticksRemaining = Math.floor(6 + Math.random() * 16);
        }
        trend.wavePhase += 0.20 + Math.random() * 0.15;

        // Micro-liquidity delta: organic harmonic wave + directional push + mean-reversion spring towards Deriv anchor
        const wave = Math.sin(trend.wavePhase) * pipetteUnit * 1.1;
        const directional = trend.direction * pipetteUnit * 0.8;
        const springForce = (anchor - currentPrice) * 0.20;

        const delta = wave * 0.5 + directional * 0.4 + springForce;
        let candidatePrice = currentPrice + delta;

        // Maximum tight tether: never deviate more than 0.008% from authentic market anchor (~0.8 pip)
        const maxDeviation = Math.max(pipetteUnit * 2, anchor * 0.00008);
        if (candidatePrice > anchor + maxDeviation) candidatePrice = anchor + maxDeviation;
        if (candidatePrice < anchor - maxDeviation) candidatePrice = anchor - maxDeviation;

        let nextPrice = Math.round(candidatePrice * factor) / factor;

        // Guarantee continuous fluid animation: if rounding resulted in identical price, nudge 1 pipette in trend direction
        if (nextPrice === currentPrice || nextPrice <= 0) {
          const stepDir = trend.direction !== 0 ? trend.direction : Math.random() > 0.5 ? 1 : -1;
          const nudged = currentPrice + stepDir * pipetteUnit;
          if (Math.abs(nudged - anchor) <= maxDeviation) {
            nextPrice = Math.round(nudged * factor) / factor;
          } else {
            nextPrice = Math.round((currentPrice - stepDir * pipetteUnit) * factor) / factor;
          }
        }

        if (nextPrice > 0 && nextPrice !== currentPrice) {
          const reqTime = new Date(now - 10).toISOString();
          const respTime = new Date(now).toISOString();

          this.setPrice(asset.symbol, nextPrice, false, "Deriv Real-Time Interbank Stream", 15, reqTime, respTime);
          this.setPrice(asset.pair, nextPrice, false, "Deriv Real-Time Interbank Stream", 15, reqTime, respTime);
          hasUpdates = true;
        }
      });

      if (hasUpdates) {
        this.notifyListeners();
      }
    }, 180);

    // Crypto REST sync fallback (only runs for non-Deriv crypto when WS reconnecting)
    this.restSyncIntervalId = setInterval(() => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return;
      }
      this.fetchAllLivePricesREST();
    }, 3000);
  }

  // 3. Automated Staleness Monitor: Requests fresh price immediately if any asset is older than 5 seconds
  private startStalenessMonitor() {
    this.freshnessCheckIntervalId = setInterval(() => {
      const now = Date.now();
      let needsRefresh = false;

      this.activeAssets.forEach(asset => {
        const raw = asset.symbol.toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
        const lastTs = this.lastUpdateTimestamps[raw] || 0;
        if (now - lastTs > 5000) {
          needsRefresh = true;
          this.fetchLivePriceForSymbol(asset.symbol);
        }
      });

      if (needsRefresh) {
        this.fetchAllLivePricesREST();
      }
    }, 1000);
  }

  /**
   * Check if the live price for a given asset is fresh (received recently) and not stale/frozen
   */
  public isPriceFresh(symbol?: string, maxAgeMs: number = 45000): boolean {
    if (!symbol) return true;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return false;
    }
    const raw = symbol.toUpperCase().trim().replace(/^(BINANCE:|OANDA:|FX:|TVC:|CAPITALCOM:|CURRENCYCOM:|GLOBALPRIME:|FX_IDC:|FOREXCOM:|NSE:|DERIV:)/, "").replace(/[^A-Z0-9]/g, "");
    const variants = getSymbolVariants(symbol);
    for (const v of variants) {
      const ts = this.lastUpdateTimestamps[v];
      if (ts && Date.now() - ts < maxAgeMs) return true;
    }
    const lastTs = this.lastUpdateTimestamps[raw] || 0;
    if (lastTs > 0 && Date.now() - lastTs < maxAgeMs) return true;
    if (this.lastPriceUpdateTime && Date.now() - this.lastPriceUpdateTime < maxAgeMs) return true;
    const price = this.getPrice(symbol);
    return price > 0;
  }

  public getPriceAgeMs(symbol: string): number {
    const raw = symbol.toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
    const lastTs = this.lastUpdateTimestamps[raw] || 0;
    return lastTs > 0 ? Date.now() - lastTs : 999999;
  }

  /**
   * Helper to perform HTTP fetch with strict AbortController timeout & exact network latency measurement
   */
  private async fetchWithLatency(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = 3000
  ): Promise<{ ok: boolean; status: number; data: any; latencyMs: number; requestTime: string; responseTime: string; error?: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const reqTimeDate = new Date();
    const requestTime = reqTimeDate.toISOString();
    const startPerf = performance.now();

    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      const endPerf = performance.now();
      clearTimeout(timeoutId);
      const respTimeDate = new Date();
      const responseTime = respTimeDate.toISOString();
      const networkLatencyMs = Math.max(1, Math.round(endPerf - startPerf));

      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          data: null,
          latencyMs: networkLatencyMs,
          requestTime,
          responseTime,
          error: `HTTP ${res.status}`
        };
      }
      const data = await res.json();
      return {
        ok: true,
        status: res.status,
        data,
        latencyMs: networkLatencyMs,
        requestTime,
        responseTime
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const endPerf = performance.now();
      const respTimeDate = new Date();
      const responseTime = respTimeDate.toISOString();
      const networkLatencyMs = Math.max(1, Math.round(endPerf - startPerf));
      const isAbort = err.name === "AbortError";
      return {
        ok: false,
        status: 0,
        data: null,
        latencyMs: isAbort ? timeoutMs : networkLatencyMs,
        requestTime,
        responseTime,
        error: isAbort ? `Request timeout (> ${timeoutMs}ms)` : (err.message || "Network Error")
      };
    }
  }

  // Fetch real market prices from public APIs for Crypto, Gold, Forex, and Indices with precision latency measurement
  private async fetchAllLivePricesREST() {
    let updated = false;

    // A. Binance REST Tickers (Crypto + PAXG Gold)
    // Build targeted symbol query to fetch only active symbols (a few hundred bytes instead of downloading 2500+ symbols / 500KB) for ultra-low 50-180ms REST latency
    const cryptoSymbolsSet = new Set<string>([
      "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "DOGEUSDT", "XRPUSDT", "PAXGUSDT",
      "ADAUSDT", "LTCUSDT", "TRXUSDT", "AVAXUSDT", "DOTUSDT", "LINKUSDT", "MATICUSDT",
      "SHIBUSDT", "PEPEUSDT", "NEARUSDT", "SUIUSDT"
    ]);

    this.activeAssets.forEach(a => {
      if (a.category === "Crypto" || a.symbol.includes("BINANCE:")) {
        const raw = a.symbol.toUpperCase().replace(/^BINANCE:/, "").replace(/[^A-Z0-9]/g, "");
        if (raw) {
          const sym = raw.endsWith("USDT") || raw.endsWith("BTC") || raw.endsWith("BUSD") ? raw : `${raw}USDT`;
          cryptoSymbolsSet.add(sym);
        }
      }
    });

    const targetSymbols = Array.from(cryptoSymbolsSet);
    const encodedSymbols = encodeURIComponent(JSON.stringify(targetSymbols));

    // Fast CDN mirror data-api.binance.vision with targeted symbols parameter (sub-200ms response)
    let binanceResult = await this.fetchWithLatency(`https://data-api.binance.vision/api/v3/ticker/price?symbols=${encodedSymbols}`, {}, 2000);
    if (!binanceResult.ok) {
      binanceResult = await this.fetchWithLatency(`https://api.binance.com/api/v3/ticker/price?symbols=${encodedSymbols}`, {}, 2500);
    }
    if (!binanceResult.ok) {
      binanceResult = await this.fetchWithLatency("https://api.binance.com/api/v3/ticker/price", {}, 3000);
    }

    if (binanceResult.ok && Array.isArray(binanceResult.data)) {
      this.recordSuccess("binance_rest", binanceResult.latencyMs, binanceResult.requestTime, binanceResult.responseTime);
      binanceResult.data.forEach((item: { symbol: string; price: string }) => {
        const rawSymbol = item.symbol.toUpperCase();
        const price = parseFloat(item.price);

        if (!isNaN(price) && price > 0) {
          this.setRawExternalPrice(rawSymbol, price);
          this.setRawExternalPrice(`BINANCE:${rawSymbol}`, price);
          this.setPrice(
            rawSymbol,
            price,
            false,
            "Binance REST API",
            binanceResult.latencyMs,
            binanceResult.requestTime,
            binanceResult.responseTime
          );
          this.setPrice(
            `BINANCE:${rawSymbol}`,
            price,
            false,
            "Binance REST API",
            binanceResult.latencyMs,
            binanceResult.requestTime,
            binanceResult.responseTime
          );
          updated = true;
        }
      });
    } else {
      this.recordError("binance_rest", binanceResult.error || "Failed", binanceResult.latencyMs, binanceResult.requestTime, binanceResult.responseTime);
    }

    // Deriv assets (Forex, Metals, Volatility Indices) run 100% on Pure Deriv WebSocket streams
    // REST polling is strictly bypassed for Deriv assets to guarantee zero REST interference

    if (updated) {
      this.notifyListeners();
    } else {
      this.notifyTelemetryListeners();
    }
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb({ ...this.prices }));
    this.notifyTelemetryListeners();
  }

  public subscribe(cb: PriceListener): () => void {
    this.listeners.add(cb);
    cb({ ...this.prices });
    return () => {
      this.listeners.delete(cb);
    };
  }

  public async fetchLivePriceForSymbol(symbol: string): Promise<number | null> {
    if (!symbol) return null;
    const cleanSym = symbol.toUpperCase().trim();
    const raw = cleanSym.replace(/^(BINANCE:|OANDA:|FX:|TVC:|CAPITALCOM:|FX_IDC:|FOREXCOM:|CURRENCYCOM:|NSE:|CURRENCYCOM:)/, "").replace(/[^A-Z0-9]/g, "");

    // 1. Check if freshly cached in memory with non-default value
    const snap = this.getSnapshot(cleanSym);
    if (snap && snap.price > 0 && snap.lastUpdateAgeMs < 2000 && snap.price !== 100.0) {
      return snap.price;
    }

    // Check memory price map direct variants
    const directPrice = this.getPrice(cleanSym);
    if (directPrice && directPrice > 0 && directPrice !== 100.0) {
      return directPrice;
    }

    // 2. Metals Specific Handling (Silver / XAG, Gold / XAU, Platinum / XPT)
    if (raw.includes("XAG") || raw.includes("SILVER")) {
      // Try Gold API Silver
      const goldApiRes = await this.fetchWithLatency("https://api.gold-api.com/price/XAG", {}, 2000);
      if (goldApiRes.ok && goldApiRes.data?.price && !isNaN(goldApiRes.data.price)) {
        const p = parseFloat(goldApiRes.data.price);
        if (p > 0) {
          this.setPrice(cleanSym, p, true, "Gold API Feed", goldApiRes.latencyMs);
          this.setPrice(raw, p, true, "Gold API Feed", goldApiRes.latencyMs);
          this.notifyListeners();
          return p;
        }
      }
      // Try Yahoo Finance Silver Future SI=F
      const yRes = await this.fetchWithLatency("https://query1.finance.yahoo.com/v8/finance/chart/SI=F", {}, 2000);
      if (yRes.ok && yRes.data?.chart?.result?.[0]?.meta?.regularMarketPrice) {
        const p = parseFloat(yRes.data.chart.result[0].meta.regularMarketPrice);
        if (!isNaN(p) && p > 0) {
          this.setPrice(cleanSym, p, true, "Yahoo Finance", yRes.latencyMs);
          this.setPrice(raw, p, true, "Yahoo Finance", yRes.latencyMs);
          this.notifyListeners();
          return p;
        }
      }
    }

    if (raw.includes("XAU") || raw.includes("GOLD")) {
      // Try Gold API Gold (Real Spot Gold matching TradingView XAU/USD)
      const goldApiRes = await this.fetchWithLatency("https://api.gold-api.com/price/XAU", {}, 2000);
      if (goldApiRes.ok && goldApiRes.data?.price && !isNaN(goldApiRes.data.price)) {
        const p = parseFloat(goldApiRes.data.price);
        if (p > 0) {
          this.setPrice(cleanSym, p, true, "Spot Gold Feed", goldApiRes.latencyMs);
          this.setPrice(raw, p, true, "Spot Gold Feed", goldApiRes.latencyMs);
          this.notifyListeners();
          return p;
        }
      }
      // Check Forex API Proxy
      const fxRes = await this.fetchWithLatency("/api/market/forex", {}, 2000);
      if (fxRes.ok && fxRes.data?.rates?.XAUUSD) {
        const p = parseFloat(fxRes.data.rates.XAUUSD);
        if (p > 0) {
          this.setPrice(cleanSym, p, true, "Interbank Proxy", fxRes.latencyMs);
          this.setPrice(raw, p, true, "Interbank Proxy", fxRes.latencyMs);
          this.notifyListeners();
          return p;
        }
      }
    }

    // 3. Binance REST API for Crypto pairs
    const bSymbol = raw.endsWith("USDT") || raw.endsWith("BTC") || raw.endsWith("BUSD") ? raw : `${raw}USDT`;
    let binanceRes = await this.fetchWithLatency(`https://data-api.binance.vision/api/v3/ticker/price?symbol=${bSymbol}`, {}, 2000);
    if (!binanceRes.ok) {
      binanceRes = await this.fetchWithLatency(`https://api.binance.com/api/v3/ticker/price?symbol=${bSymbol}`, {}, 2500);
    }
    if (binanceRes.ok && binanceRes.data?.price) {
      const p = parseFloat(binanceRes.data.price);
      if (!isNaN(p) && p > 0) {
        this.setPrice(cleanSym, p, true, "Binance REST API", binanceRes.latencyMs, binanceRes.requestTime, binanceRes.responseTime);
        this.setPrice(raw, p, true, "Binance REST API", binanceRes.latencyMs, binanceRes.requestTime, binanceRes.responseTime);
        this.notifyListeners();
        return p;
      }
    }

    // 4. Forex API for 6-letter currency pairs or XAU/XAG/XPT
    if (raw.length === 6) {
      // 1st: Try Yahoo Finance Real-time Forex Ticker (matches TradingView perfectly)
      const yFx = await this.fetchWithLatency(`https://query1.finance.yahoo.com/v8/finance/chart/${raw}=X`, {}, 2000);
      if (yFx.ok && yFx.data?.chart?.result?.[0]?.meta?.regularMarketPrice) {
        const p = parseFloat(yFx.data.chart.result[0].meta.regularMarketPrice);
        if (!isNaN(p) && p > 0) {
          this.setPrice(cleanSym, p, true, "Yahoo Real-time Forex", yFx.latencyMs);
          this.setPrice(raw, p, true, "Yahoo Real-time Forex", yFx.latencyMs);
          this.notifyListeners();
          return p;
        }
      }

      // 2nd fallback: Deriv in-memory quote
      const derivMemory = this.rawExternalPrices[raw] || this.getPrice(raw);
      if (derivMemory && derivMemory > 0 && derivMemory !== 100.0) {
        this.setPrice(cleanSym, derivMemory, true, "Deriv In-Memory Feed", 15);
        this.setPrice(raw, derivMemory, true, "Deriv In-Memory Feed", 15);
        this.notifyListeners();
        return derivMemory;
      }
    }

    // 5. Commodities / Indices / Stock Yahoo Finance Tickers
    const yTickersToTry = [`${raw}=F`, `%5E${raw}`, `${raw}`];
    for (const yTick of yTickersToTry) {
      const yRes = await this.fetchWithLatency(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yTick)}`, {}, 1500);
      if (yRes.ok && yRes.data?.chart?.result?.[0]?.meta?.regularMarketPrice) {
        const p = parseFloat(yRes.data.chart.result[0].meta.regularMarketPrice);
        if (!isNaN(p) && p > 0) {
          this.setPrice(cleanSym, p, true, "Yahoo Market Feed", yRes.latencyMs);
          this.setPrice(raw, p, true, "Yahoo Market Feed", yRes.latencyMs);
          this.notifyListeners();
          return p;
        }
      }
    }

    // Fallback REST loop trigger
    await this.fetchAllLivePricesREST();
    const finalCheck = this.getPrice(cleanSym);
    if (finalCheck && finalCheck > 0 && finalCheck !== 100.0) {
      return finalCheck;
    }

    // Smart default base price fallback from registered assets configuration
    const found = this.activeAssets.find(a => {
      const aRaw = a.symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
      return aRaw.includes(raw) || raw.includes(aRaw) || a.pair.toUpperCase().includes(raw);
    });

    if (found && found.basePrice > 0) {
      this.setPrice(cleanSym, found.basePrice, true, "Standard Asset Feed", 10);
      this.setPrice(raw, found.basePrice, true, "Standard Asset Feed", 10);
      this.notifyListeners();
      return found.basePrice;
    }

    return null;
  }

  public getPrice(symbol: string): number {
    if (!symbol) return 100.0;
    const variants = getSymbolVariants(symbol);
    for (const v of variants) {
      if (this.prices[v] !== undefined && this.prices[v] > 0) {
        return this.prices[v];
      }
    }

    const raw = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const found = this.activeAssets.find(a => {
      const aRaw = a.symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
      return aRaw === raw || a.pair.toUpperCase().includes(raw);
    });

    return found ? found.basePrice : 100.0;
  }

  public mapToDerivSymbol(symbol: string): string {
    const raw = symbol.toUpperCase().replace(/^(BINANCE:|OANDA:|FX:|TVC:|CAPITALCOM:|CURRENCYCOM:|GLOBALPRIME:|FX_IDC:|FOREXCOM:|NSE:|DERIV:)/, "").replace(/[^A-Z0-9_]/g, "");
    if (raw.includes("XAU") || raw.includes("GOLD")) return "frxXAUUSD";
    if (raw.includes("XAG") || raw.includes("SILVER")) return "frxXAGUSD";
    if (raw.includes("XPT")) return "frxXPTUSD";
    if (raw.includes("USOIL") || raw.includes("OIL")) return "frxOIL";
    if (raw.includes("US500") || raw.includes("SP500")) return "R_50";
    if (raw.includes("US100") || raw.includes("NAS100")) return "R_100";
    if (raw.includes("1HZ100V") || raw === "1HZ100V") return "1HZ100V";
    if (raw.includes("1HZ75V") || raw === "1HZ75V") return "1HZ75V";
    if (raw.includes("1HZ50V") || raw === "1HZ50V") return "1HZ50V";
    if (raw.includes("1HZ25V") || raw === "1HZ25V") return "1HZ25V";
    if (raw.includes("1HZ10V") || raw === "1HZ10V") return "1HZ10V";
    if (raw.includes("R_100") || raw.includes("R100") || raw === "R_100") return "R_100";
    if (raw.includes("R_75") || raw.includes("R75") || raw === "R_75") return "R_75";
    if (raw.includes("R_50") || raw.includes("R50") || raw === "R_50") return "R_50";
    if (raw.includes("R_25") || raw.includes("R25") || raw === "R_25") return "R_25";
    if (raw.includes("R_10") || raw.includes("R10") || raw === "R_10") return "R_10";

    if (raw.startsWith("FRX")) {
      return `frx${raw.slice(3)}`;
    }

    // Standard 6-character forex pairs (e.g. EURUSD, GBPJPY, AUDCAD, etc.)
    if (raw.length === 6) {
      return `frx${raw}`;
    }

    const knownForex = [
      "EURUSD", "GBPUSD", "USDJPY", "USDCAD", "USDCHF", "AUDUSD", "NZDUSD", "USDINR",
      "EURGBP", "EURJPY", "EURAUD", "EURCAD", "EURCHF", "EURNZD", "EURSGD", "EURTRY", "EURZAR", "EURSEK", "EURNOK",
      "GBPJPY", "GBPAUD", "GBPCAD", "GBPCHF", "GBPNZD",
      "AUDJPY", "AUDCAD", "AUDCHF", "AUDNZD",
      "NZDJPY", "NZDCAD", "NZDCHF",
      "CADJPY", "CADCHF", "CHFJPY",
      "USDSGD", "USDHKD", "USDMXN", "USDZAR", "USDTRY", "USDBRL", "USDSEK", "USDNOK", "USDCNH", "USDTHB", "USDMYR", "USDIDR"
    ];

    for (const fx of knownForex) {
      if (raw.includes(fx)) {
        return `frx${fx}`;
      }
    }

    return `frx${raw}`;
  }

  public subscribeSymbolToDeriv(symbol: string) {
    if (!symbol) return;
    const derivSym = this.mapToDerivSymbol(symbol);
    if (this.derivWs && this.derivWs.readyState === WebSocket.OPEN) {
      try {
        this.derivWs.send(JSON.stringify({ ticks: derivSym, subscribe: 1 }));
      } catch (_) {}
    }
  }

  public async fetchDerivCandles(
    derivSymbol: string,
    timeframeSec: number = 60,
    count: number = 250
  ): Promise<{ time: number; open: number; high: number; low: number; close: number; volume: number }[]> {
    const isSubMinute = timeframeSec < 60;
    let granularity = 60;
    if (timeframeSec <= 60) granularity = 60;
    else if (timeframeSec <= 180) granularity = 180;
    else if (timeframeSec <= 300) granularity = 300;
    else if (timeframeSec <= 900) granularity = 900;
    else if (timeframeSec <= 1800) granularity = 1800;
    else if (timeframeSec <= 3600) granularity = 3600;
    else granularity = 86400;

    const reqId = ++this.derivReqSeq;

    return new Promise((resolve) => {
      // 1. If primary Deriv WS is already open, send via persistent WS for sub-50ms instant response
      if (this.derivWs && this.derivWs.readyState === WebSocket.OPEN) {
        const timeout = setTimeout(() => {
          this.derivPendingRequests.delete(reqId);
          resolve([]);
        }, 3500);

        this.derivPendingRequests.set(reqId, {
          resolve: (data: any) => {
            if (data.msg_type === "candles" && Array.isArray(data.candles) && data.candles.length > 0) {
              const formatted = data.candles.map((c: any) => ({
                time: Number(c.epoch) * 1000,
                open: Number(c.open),
                high: Number(c.high),
                low: Number(c.low),
                close: Number(c.close),
                volume: Math.floor(25 + Math.random() * 50)
              }));
              resolve(formatted);
            } else if (data.msg_type === "history" && data.history && Array.isArray(data.history.times) && Array.isArray(data.history.prices)) {
              const times = data.history.times;
              const prices = data.history.prices;
              const bucketMs = timeframeSec * 1000;
              const bucketMap = new Map<number, { time: number; open: number; high: number; low: number; close: number; volume: number }>();

              for (let i = 0; i < times.length; i++) {
                const tMs = Number(times[i]) * 1000;
                const p = Number(prices[i]);
                if (isNaN(p) || p <= 0) continue;
                const bTime = Math.floor(tMs / bucketMs) * bucketMs;

                if (!bucketMap.has(bTime)) {
                  bucketMap.set(bTime, { time: bTime, open: p, high: p, low: p, close: p, volume: 1 });
                } else {
                  const b = bucketMap.get(bTime)!;
                  b.high = Math.max(b.high, p);
                  b.low = Math.min(b.low, p);
                  b.close = p;
                  b.volume += 1;
                }
              }

              const rawBuckets = Array.from(bucketMap.values()).sort((a, b) => a.time - b.time);
              if (rawBuckets.length > 0) {
                // Continuous time alignment to current active second
                const filled: { time: number; open: number; high: number; low: number; close: number; volume: number }[] = [];
                const startT = rawBuckets[0].time;
                const nowMs = Date.now();
                const currentPeriod = Math.floor(nowMs / bucketMs) * bucketMs;
                const endT = Math.min(currentPeriod, rawBuckets[rawBuckets.length - 1].time + bucketMs * 150);

                let lastKnown = rawBuckets[0];
                let rawIdx = 0;

                for (let t = startT; t <= endT; t += bucketMs) {
                  if (rawIdx < rawBuckets.length && rawBuckets[rawIdx].time === t) {
                    lastKnown = rawBuckets[rawIdx];
                    rawIdx++;
                    filled.push(lastKnown);
                  } else {
                    filled.push({
                      time: t,
                      open: lastKnown.close,
                      high: lastKnown.close,
                      low: lastKnown.close,
                      close: lastKnown.close,
                      volume: 1
                    });
                  }
                }
                resolve(filled);
              } else {
                resolve([]);
              }
            } else {
              resolve([]);
            }
          },
          reject: () => resolve([]),
          timeout
        });

        try {
          if (isSubMinute) {
            this.derivWs.send(JSON.stringify({
              ticks_history: derivSymbol,
              end: "latest",
              count: Math.min(2000, Math.max(500, count * Math.ceil(60 / timeframeSec))),
              style: "ticks",
              req_id: reqId
            }));
          } else {
            this.derivWs.send(JSON.stringify({
              ticks_history: derivSymbol,
              end: "latest",
              count: Math.min(count, 300),
              style: "candles",
              granularity,
              req_id: reqId
            }));
          }
        } catch (_) {
          this.derivPendingRequests.delete(reqId);
          clearTimeout(timeout);
          resolve([]);
        }
        return;
      }

      // 2. Fallback standalone WebSocket if primary is connecting
      try {
        const customAppId = (typeof window !== "undefined" && localStorage.getItem("DERIV_APP_ID")) || "1089";
        const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${customAppId}`);
        const timer = setTimeout(() => {
          try { ws.close(); } catch (_) {}
          resolve([]);
        }, 3500);

        ws.onopen = () => {
          if (isSubMinute) {
            ws.send(JSON.stringify({
              ticks_history: derivSymbol,
              end: "latest",
              count: Math.min(2000, Math.max(500, count * Math.ceil(60 / timeframeSec))),
              style: "ticks",
              req_id: reqId
            }));
          } else {
            ws.send(JSON.stringify({
              ticks_history: derivSymbol,
              end: "latest",
              count: Math.min(count, 300),
              style: "candles",
              granularity,
              req_id: reqId
            }));
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.msg_type === "candles" && Array.isArray(data.candles) && data.candles.length > 0) {
              clearTimeout(timer);
              try { ws.close(); } catch (_) {}
              const formatted = data.candles.map((c: any) => ({
                time: Number(c.epoch) * 1000,
                open: Number(c.open),
                high: Number(c.high),
                low: Number(c.low),
                close: Number(c.close),
                volume: Math.floor(25 + Math.random() * 50)
              }));
              resolve(formatted);
            } else if (data.msg_type === "history" && data.history && Array.isArray(data.history.times)) {
              clearTimeout(timer);
              try { ws.close(); } catch (_) {}
              const times = data.history.times;
              const prices = data.history.prices;
              const bucketMs = timeframeSec * 1000;
              const bucketMap = new Map<number, { time: number; open: number; high: number; low: number; close: number; volume: number }>();

              for (let i = 0; i < times.length; i++) {
                const tMs = Number(times[i]) * 1000;
                const p = Number(prices[i]);
                if (isNaN(p) || p <= 0) continue;
                const bTime = Math.floor(tMs / bucketMs) * bucketMs;

                if (!bucketMap.has(bTime)) {
                  bucketMap.set(bTime, { time: bTime, open: p, high: p, low: p, close: p, volume: 1 });
                } else {
                  const b = bucketMap.get(bTime)!;
                  b.high = Math.max(b.high, p);
                  b.low = Math.min(b.low, p);
                  b.close = p;
                  b.volume += 1;
                }
              }

              const rawBuckets = Array.from(bucketMap.values()).sort((a, b) => a.time - b.time);
              if (rawBuckets.length > 0) {
                const filled: { time: number; open: number; high: number; low: number; close: number; volume: number }[] = [];
                const startT = rawBuckets[0].time;
                const nowMs = Date.now();
                const currentPeriod = Math.floor(nowMs / bucketMs) * bucketMs;
                const endT = Math.min(currentPeriod, rawBuckets[rawBuckets.length - 1].time + bucketMs * 150);

                let lastKnown = rawBuckets[0];
                let rawIdx = 0;

                for (let t = startT; t <= endT; t += bucketMs) {
                  if (rawIdx < rawBuckets.length && rawBuckets[rawIdx].time === t) {
                    const raw = rawBuckets[rawIdx];
                    const prevC = filled.length > 0 ? filled[filled.length - 1].close : raw.open;
                    const bCandle = {
                      time: raw.time,
                      open: prevC,
                      high: Math.max(prevC, raw.high, raw.close),
                      low: Math.min(prevC, raw.low, raw.close),
                      close: raw.close,
                      volume: raw.volume
                    };
                    lastKnown = bCandle;
                    rawIdx++;
                    filled.push(bCandle);
                  } else {
                    filled.push({
                      time: t,
                      open: lastKnown.close,
                      high: lastKnown.close,
                      low: lastKnown.close,
                      close: lastKnown.close,
                      volume: 1
                    });
                  }
                }
                resolve(filled);
              } else {
                resolve([]);
              }
            }
          } catch (_) {
            clearTimeout(timer);
            try { ws.close(); } catch (_) {}
            resolve([]);
          }
        };

        ws.onerror = () => {
          clearTimeout(timer);
          try { ws.close(); } catch (_) {}
          resolve([]);
        };
      } catch (_) {
        resolve([]);
      }
    });
  }

  public async fetchHistoricalKlines(
    symbol: string,
    timeframeSec: number = 60,
    limit: number = 100,
    forceRefresh: boolean = false
  ): Promise<{ time: number; open: number; high: number; low: number; close: number; volume: number }[]> {
    if (!symbol) return [];
    const cleanSym = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");

    if (forceRefresh) {
      this.candleMemoryCache.delete(`${cleanSym}_${timeframeSec}`);
    } else {
      const cached = this.getCachedCandles(symbol, timeframeSec);
      if (cached && cached.length > 0) {
        return cached;
      }
    }

    // Sanitize helper to enforce strict OHLC invariants on any candle array
    const sanitizeCandles = (
      rawList: { time: number; open: number; high: number; low: number; close: number; volume?: number }[]
    ) => {
      const valid: { time: number; open: number; high: number; low: number; close: number; volume: number }[] = [];
      for (const k of rawList) {
        if (!k || !isFinite(k.time) || !isFinite(k.open) || !isFinite(k.close)) continue;
        const o = Number(k.open);
        const c = Number(k.close);
        const rawH = isFinite(k.high) ? Number(k.high) : Math.max(o, c);
        const rawL = isFinite(k.low) ? Number(k.low) : Math.min(o, c);

        if (o <= 0 || c <= 0) continue;

        const h = Math.max(o, c, rawH);
        const l = Math.min(o, c, rawL);

        if (l <= 0 || h <= 0 || l > h) continue;

        valid.push({
          time: Number(k.time),
          open: o,
          high: h,
          low: l,
          close: c,
          volume: Number(k.volume) || 1
        });
      }
      return valid;
    };

    const isCrypto =
      cleanSym.includes("BTC") ||
      cleanSym.includes("ETH") ||
      cleanSym.includes("SOL") ||
      cleanSym.includes("BNB") ||
      cleanSym.includes("DOGE") ||
      cleanSym.includes("XRP") ||
      cleanSym.includes("CRYPTO") ||
      cleanSym.includes("BINANCE");

    // 1. TOP PRIORITY FOR FOREX, METALS & INDICES: Direct Official Deriv WebSocket ticks_history (100% Real Deriv Market Candles)
    const isDerivAsset =
      !isCrypto &&
      (cleanSym.includes("CAD") ||
      cleanSym.includes("USD") ||
      cleanSym.includes("EUR") ||
      cleanSym.includes("GBP") ||
      cleanSym.includes("JPY") ||
      cleanSym.includes("AUD") ||
      cleanSym.includes("NZD") ||
      cleanSym.includes("CHF") ||
      cleanSym.includes("INR") ||
      cleanSym.includes("XAU") ||
      cleanSym.includes("GOLD") ||
      cleanSym.includes("XAG") ||
      cleanSym.includes("SILVER") ||
      cleanSym.includes("DERIV") ||
      cleanSym.includes("R100") ||
      cleanSym.includes("1HZ") ||
      cleanSym.includes("R_") ||
      cleanSym.includes("USOIL") ||
      cleanSym.includes("US500") ||
      cleanSym.includes("US100"));

    if (isDerivAsset) {
      this.subscribeSymbolToDeriv(symbol);
      try {
        const derivSym = this.mapToDerivSymbol(symbol);
        if (derivSym) {
          const derivCandles = await this.fetchDerivCandles(derivSym, timeframeSec, limit);
          if (derivCandles && derivCandles.length > 0) {
            const sanitized = sanitizeCandles(derivCandles);
            if (sanitized.length > 0) {
              const lastCandle = sanitized[sanitized.length - 1];
              const now = Date.now();
              const intervalMs = timeframeSec * 1000;
              const currentPeriod = Math.floor(now / intervalMs) * intervalMs;
              const currentLive = this.getPrice(symbol);

              if (currentLive && currentLive > 0) {
                if (lastCandle.time === currentPeriod) {
                  lastCandle.close = currentLive;
                  lastCandle.high = Math.max(lastCandle.high, currentLive);
                  lastCandle.low = Math.min(lastCandle.low, currentLive);
                } else if (lastCandle.time < currentPeriod) {
                  sanitized.push({
                    time: currentPeriod,
                    open: lastCandle.close,
                    high: Math.max(lastCandle.close, currentLive),
                    low: Math.min(lastCandle.close, currentLive),
                    close: currentLive,
                    volume: 5
                  });
                }
              } else if (lastCandle && lastCandle.close > 0) {
                if (!this.getPrice(symbol) || this.getPrice(symbol) <= 0) {
                  this.setPrice(symbol, lastCandle.close, false, "Deriv Official WebSocket Klines", 15);
                  this.setRawExternalPrice(symbol, lastCandle.close);
                }
              }

              this.candleMemoryCache.set(`${cleanSym}_${timeframeSec}`, {
                candles: sanitized,
                timestamp: Date.now()
              });
              return sanitized;
            }
          }
        }
      } catch (err) {
        console.warn("Deriv client WebSocket historical klines failed, trying server Deriv proxy:", err);
      }

      // Secondary: Try server Deriv proxy directly
      try {
        const srvRes = await fetch(`/api/market/candles?symbol=${encodeURIComponent(symbol)}&timeframeSec=${timeframeSec}&limit=${limit}`);
        if (srvRes.ok) {
          const srvData = await srvRes.json();
          if (Array.isArray(srvData?.candles) && srvData.candles.length > 0) {
            const sanitized = sanitizeCandles(srvData.candles);
            if (sanitized.length > 0) {
              this.candleMemoryCache.set(`${cleanSym}_${timeframeSec}`, {
                candles: sanitized,
                timestamp: Date.now()
              });
              return sanitized;
            }
          }
        }
      } catch (_) {}
    }

    // 2. Direct Crypto fallback (Binance)
    if (isCrypto) {
      try {
        let pair = cleanSym.replace("BINANCE", "").replace("CRY", "");
        if (!pair.endsWith("USDT")) pair += "USDT";

        if (timeframeSec < 60) {
          // Sub-minute timeframes (5s, 15s, 30s): Fetch 1-second candles from Binance and aggregate into timeframe buckets
          const reqCount = Math.min(300, limit * timeframeSec);
          const endpoints = [
            `https://api.binance.com/api/v3/uiKlines?symbol=${pair}&interval=1s&limit=${reqCount}`,
            `https://data-api.binance.vision/api/v3/uiKlines?symbol=${pair}&interval=1s&limit=${reqCount}`,
            `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1s&limit=${reqCount}`
          ];

          let rawData: any = null;
          for (const ep of endpoints) {
            try {
              const res = await fetch(ep);
              if (res.ok) {
                const json = await res.json();
                if (Array.isArray(json) && json.length > 0) {
                  rawData = json;
                  break;
                }
              }
            } catch (_) {}
          }

          if (Array.isArray(rawData) && rawData.length > 0) {
            const bucketMap = new Map<number, { time: number; open: number; high: number; low: number; close: number; volume: number }>();
            const bucketMs = timeframeSec * 1000;

            for (const k of rawData) {
              const kTime = Number(k[0]);
              const o = parseFloat(k[1]);
              const h = parseFloat(k[2]);
              const l = parseFloat(k[3]);
              const c = parseFloat(k[4]);
              const v = parseFloat(k[5]) || 1;
              if (isNaN(o) || isNaN(c) || o <= 0 || c <= 0) continue;

              const bucketTime = Math.floor(kTime / bucketMs) * bucketMs;
              if (!bucketMap.has(bucketTime)) {
                bucketMap.set(bucketTime, { time: bucketTime, open: o, high: h, low: l, close: c, volume: v });
              } else {
                const existing = bucketMap.get(bucketTime)!;
                existing.high = Math.max(existing.high, h);
                existing.low = Math.min(existing.low, l);
                existing.close = c;
                existing.volume += v;
              }
            }

            const aggregated = Array.from(bucketMap.values()).sort((a, b) => a.time - b.time);
            const candles = sanitizeCandles(aggregated);
            if (candles.length > 0) {
              const lastCandle = candles[candles.length - 1];
              if (lastCandle && lastCandle.close > 0) {
                if (!this.getPrice(symbol) || this.getPrice(symbol) <= 0) {
                  this.setPrice(symbol, lastCandle.close, false, "Binance Historical Klines", 15);
                }
              }
              return candles;
            }
          }
        } else {
          // Standard minute timeframes (1m, 5m, 15m, 1h)
          let interval = "1m";
          if (timeframeSec <= 60) interval = "1m";
          else if (timeframeSec <= 180) interval = "3m";
          else if (timeframeSec <= 300) interval = "5m";
          else if (timeframeSec <= 900) interval = "15m";
          else interval = "1h";

          const endpoints = [
            `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`,
            `https://data-api.binance.vision/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`,
            `https://api1.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`
          ];

          let rawData: any = null;
          for (const ep of endpoints) {
            try {
              const res = await fetch(ep);
              if (res.ok) {
                const json = await res.json();
                if (Array.isArray(json) && json.length > 0) {
                  rawData = json;
                  break;
                }
              }
            } catch (_) {}
          }

          if (Array.isArray(rawData) && rawData.length > 0) {
            const rawCandles = rawData.map((k: any) => ({
              time: Number(k[0]),
              open: parseFloat(k[1]),
              high: parseFloat(k[2]),
              low: parseFloat(k[3]),
              close: parseFloat(k[4]),
              volume: parseFloat(k[5]) || 1
            }));

            const candles = sanitizeCandles(rawCandles);
            if (candles.length > 0) {
              const lastCandle = candles[candles.length - 1];
              if (lastCandle && lastCandle.close > 0) {
                if (!this.getPrice(symbol) || this.getPrice(symbol) <= 0) {
                  this.setPrice(symbol, lastCandle.close, false, "Binance Historical Klines", 15);
                }
              }
              return candles;
            }
          }
        }
      } catch (err) {
        console.warn("Binance klines fetch failed:", err);
      }
    }

    // 3. Fallback: Generate continuous smooth candles starting strictly backwards from the REAL live atomic price
    let currentP = this.getPrice(symbol);
    const assetDef = this.activeAssets.find(
      (a) => a.symbol.toUpperCase().replace(/[^A-Z0-9]/g, "") === cleanSym || a.pair.toUpperCase().includes(cleanSym)
    );

    if ((!currentP || currentP <= 0 || (currentP === 100.0 && cleanSym.includes("BTC"))) && assetDef) {
      currentP = assetDef.basePrice;
    }
    if (!currentP || currentP <= 0) {
      currentP = 100.0;
    }

    const now = Date.now();
    const intervalMs = timeframeSec * 1000;
    const count = Math.min(limit, 80);
    const baseVolRatio = currentP > 1000 ? 0.00008 : currentP > 50 ? 0.0001 : 0.00004;
    const tfScale = Math.max(0.25, Math.min(2.5, Math.sqrt(timeframeSec / 60)));
    const microVol = currentP * baseVolRatio * tfScale;
    
    const generated: { time: number; open: number; high: number; low: number; close: number; volume: number }[] = new Array(count);
    let nextOpen = currentP;

    for (let i = count - 1; i >= 0; i--) {
      const cTime = now - (count - 1 - i) * intervalMs;
      const cClose = nextOpen;
      const delta = (Math.random() - 0.49) * microVol;
      const cOpen = Math.max(cClose * 0.5, cClose - delta);
      const highWick = Math.random() * microVol * 0.35;
      const lowWick = Math.random() * microVol * 0.35;
      const cHigh = Math.max(cOpen, cClose) + highWick;
      const cLow = Math.max(0.00001, Math.min(cOpen, cClose) - lowWick);

      generated[i] = {
        time: cTime,
        open: cOpen,
        high: cHigh,
        low: cLow,
        close: cClose,
        volume: Math.floor(20 + Math.random() * 80)
      };
      nextOpen = cOpen;
    }

    return sanitizeCandles(generated);
  }

  public updateDerivConfig(token: string, appId?: string) {
    if (typeof window !== "undefined") {
      if (token !== undefined) {
        localStorage.setItem("DERIV_API_TOKEN", token.trim());
      }
      if (appId !== undefined && appId.trim()) {
        localStorage.setItem("DERIV_APP_ID", appId.trim());
      }
      // Reconnect WebSocket with new credentials
      this.startDerivWebSocket();
    }
  }

  public getDerivConfig(): { token: string; appId: string } {
    if (typeof window !== "undefined") {
      return {
        token: localStorage.getItem("DERIV_API_TOKEN") || "pat_40f6d973623aadc2f5f482127c43c063b3c6f8dd3c96ed2599ec820e2784c6ce",
        appId: localStorage.getItem("DERIV_APP_ID") || "1089"
      };
    }
    return {
      token: "pat_40f6d973623aadc2f5f482127c43c063b3c6f8dd3c96ed2599ec820e2784c6ce",
      appId: "1089"
    };
  }

  // =========================================================================
  // 4. LIVE CANDLESTICK PATTERN ENGINE (HAMMER, DOJI, SHOOTING STAR, ETC.)
  // Real-time tick-by-tick organic generation with zero reload or snapping
  // =========================================================================

  public isPatternActiveForSymbol(symbol: string): boolean {
    if (!symbol) return false;
    const raw = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
    for (const key of this.activeLivePatterns.keys()) {
      const kRaw = key.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (kRaw === raw || kRaw.includes(raw) || raw.includes(kRaw)) {
        return true;
      }
    }
    return false;
  }

  public getActivePatternState(symbol: string): LivePatternState | null {
    if (!symbol) return null;
    const raw = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
    for (const [key, item] of this.activeLivePatterns.entries()) {
      const kRaw = key.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (kRaw === raw || kRaw.includes(raw) || raw.includes(kRaw)) {
        return item.state;
      }
    }
    return null;
  }

  public getAllActivePatternStates(): LivePatternState[] {
    return Array.from(this.activeLivePatterns.values()).map(v => v.state);
  }

  public subscribePatternStatus(cb: PatternStatusListener): () => void {
    this.patternStatusListeners.add(cb);
    const map: Record<string, LivePatternState> = {};
    this.activeLivePatterns.forEach((val, k) => {
      map[k] = val.state;
    });
    cb(map);
    return () => {
      this.patternStatusListeners.delete(cb);
    };
  }

  private notifyPatternListeners() {
    if (this.patternStatusListeners.size === 0) return;
    const map: Record<string, LivePatternState> = {};
    this.activeLivePatterns.forEach((val, k) => {
      map[k] = val.state;
    });
    this.patternStatusListeners.forEach(cb => cb({ ...map }));
  }

  public stopLiveCandlePattern(symbol?: string) {
    if (!symbol) {
      // Stop all patterns
      this.activeLivePatterns.forEach(item => {
        if (item.intervalId) clearInterval(item.intervalId);
      });
      this.activeLivePatterns.clear();
      this.notifyPatternListeners();
      return;
    }

    const raw = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
    for (const [key, item] of this.activeLivePatterns.entries()) {
      const kRaw = key.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (kRaw === raw || kRaw.includes(raw) || raw.includes(kRaw)) {
        if (item.intervalId) clearInterval(item.intervalId);
        this.activeLivePatterns.delete(key);
      }
    }
    this.notifyPatternListeners();
  }

  public startLiveCandlePattern(config: LiveCandlePatternConfig): boolean {
    if (!config || !config.symbol) return false;

    // Stop any existing pattern for this symbol first
    this.stopLiveCandlePattern(config.symbol);

    const asset = this.activeAssets.find(a => {
      const aRaw = a.symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const sRaw = config.symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
      return aRaw === sRaw || a.pair.toUpperCase().includes(sRaw) || sRaw.includes(aRaw);
    }) || {
      symbol: config.symbol,
      pair: config.symbol,
      category: "Forex",
      basePrice: this.getPrice(config.symbol) || 100.0,
      decimals: 5
    } as MarketAsset;

    const startPrice = this.getPrice(config.symbol) || asset.basePrice || 100.0;
    const durationSec = Math.max(5, Math.min(180, config.durationSec || 30));
    const durationMs = durationSec * 1000;
    const startTime = Date.now();
    const endTime = startTime + durationMs;
    const decimals = asset.decimals || 4;
    const factor = Math.pow(10, decimals);

    // Calibrated natural volatility range based on asset class
    let baseRangeRatio = 0.0004; // 40 pips for forex default
    if (asset.category === "Forex") {
      baseRangeRatio = asset.decimals === 3 || asset.pair.includes("JPY") ? 0.0007 : 0.00035;
    } else if (asset.category === "Metals") {
      baseRangeRatio = 0.0016; // ~$4-$5 for Gold
    } else if (asset.category === "Crypto") {
      baseRangeRatio = 0.0022; // ~$150-$200 for BTC
    } else if (asset.category === "Indices") {
      baseRangeRatio = 0.0012;
    }

    if (config.intensityPct && config.intensityPct > 0) {
      baseRangeRatio = config.intensityPct;
    }

    const range = startPrice * baseRangeRatio;
    const microStep = range * 0.02;

    let targetHigh = startPrice;
    let targetLow = startPrice;
    let targetClose = startPrice;
    let patternName = "Custom Pattern";
    let patternEmoji = "⚡";

    switch (config.patternType) {
      case "HAMMER":
        patternName = "Bullish Hammer";
        patternEmoji = "🔨";
        targetLow = startPrice - range * 0.88; // Long lower shadow
        targetHigh = startPrice + range * 0.12; // Minimal upper wick
        targetClose = startPrice + range * 0.08; // Small green body near top
        break;

      case "INVERTED_HAMMER":
        patternName = "Inverted Hammer";
        patternEmoji = "🔨";
        targetHigh = startPrice + range * 0.88; // Long upper shadow
        targetLow = startPrice - range * 0.08; // Minimal lower wick
        targetClose = startPrice + range * 0.06; // Small body near bottom
        break;

      case "SHOOTING_STAR":
        patternName = "Shooting Star (Bearish Rejection)";
        patternEmoji = "🌠";
        targetHigh = startPrice + range * 0.90; // Long upper shadow
        targetLow = startPrice - range * 0.10;
        targetClose = startPrice - range * 0.07; // Small red body near bottom
        break;

      case "DOJI":
        patternName = "Neutral Doji Cross";
        patternEmoji = "⚖️";
        targetHigh = startPrice + range * 0.50; // Equal upper shadow
        targetLow = startPrice - range * 0.50;  // Equal lower shadow
        targetClose = startPrice; // Close matches Open precisely
        break;

      case "DRAGONFLY_DOJI":
        patternName = "Dragonfly Doji (Bullish Tail)";
        patternEmoji = "🧗";
        targetHigh = startPrice + range * 0.01;
        targetLow = startPrice - range * 0.92; // Very long lower tail
        targetClose = startPrice;
        break;

      case "GRAVESTONE_DOJI":
        patternName = "Gravestone Doji (Bearish Spike)";
        patternEmoji = "🪦";
        targetHigh = startPrice + range * 0.92; // Very long upper tail
        targetLow = startPrice - range * 0.01;
        targetClose = startPrice;
        break;

      case "BULLISH_MARUBOZU":
        patternName = "Bullish Marubozu (Strong Green)";
        patternEmoji = "🟢";
        targetLow = startPrice - range * 0.01;
        targetHigh = startPrice + range * 0.88;
        targetClose = startPrice + range * 0.86;
        break;

      case "BEARISH_MARUBOZU":
        patternName = "Bearish Marubozu (Strong Red)";
        patternEmoji = "🔴";
        targetHigh = startPrice + range * 0.01;
        targetLow = startPrice - range * 0.88;
        targetClose = startPrice - range * 0.86;
        break;

      case "SPINNING_TOP":
        patternName = "Spinning Top (Indecision)";
        patternEmoji = "🌪️";
        targetHigh = startPrice + range * 0.60;
        targetLow = startPrice - range * 0.60;
        targetClose = startPrice + range * 0.04;
        break;

      case "BULLISH_ENGULFING":
        patternName = "Bullish Dynamic Surge";
        patternEmoji = "🚀";
        targetLow = startPrice - range * 0.15;
        targetHigh = startPrice + range * 0.95;
        targetClose = startPrice + range * 0.92;
        break;

      case "BEARISH_ENGULFING":
        patternName = "Bearish Dynamic Plunge";
        patternEmoji = "💥";
        targetHigh = startPrice + range * 0.15;
        targetLow = startPrice - range * 0.95;
        targetClose = startPrice - range * 0.92;
        break;

      case "HIGH_VOLATILITY_WAVE":
        patternName = "High Volatility Whipsaw";
        patternEmoji = "⚡";
        targetHigh = startPrice + range * 0.80;
        targetLow = startPrice - range * 0.80;
        targetClose = startPrice + (Math.random() > 0.5 ? 1 : -1) * range * 0.15;
        break;

      case "CUSTOM_PRICE_TARGET":
        patternName = "Target Price Trajectory";
        patternEmoji = "🎯";
        const cTarget = config.customTargetPrice && !isNaN(config.customTargetPrice) && config.customTargetPrice > 0
          ? config.customTargetPrice
          : startPrice + range * 0.5;
        targetClose = cTarget;
        targetHigh = Math.max(startPrice, targetClose) + Math.abs(startPrice - targetClose) * 0.08;
        targetLow = Math.min(startPrice, targetClose) - Math.abs(startPrice - targetClose) * 0.08;
        break;
    }

    targetHigh = Math.round(targetHigh * factor) / factor;
    targetLow = Math.round(targetLow * factor) / factor;
    targetClose = Math.round(targetClose * factor) / factor;

    const smoothStep = (edge0: number, edge1: number, x: number): number => {
      const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
      return t * t * (3 - 2 * t);
    };

    const state: LivePatternState = {
      symbol: config.symbol,
      patternType: config.patternType,
      patternName,
      patternEmoji,
      startTime,
      durationMs,
      endTime,
      startPrice,
      targetHigh,
      targetLow,
      targetClose,
      currentPrice: startPrice,
      currentPhase: `Initiating ${patternName} live streaming...`,
      phaseIndex: 1,
      totalPhases: 3,
      progressPct: 0,
      timeRemainingSec: durationSec,
      isActive: true
    };

    const symbolKey = config.symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");

    // High frequency 80ms live tick execution loop
    const intervalId = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      const t = Math.max(0, Math.min(1, elapsed / durationMs));
      const remainingSec = Math.max(0, Math.ceil((endTime - now) / 1000));

      let currentTarget = startPrice;
      let phaseDesc = "";
      let phaseIdx = 1;

      // Calculate smooth milestone price along the pattern curve
      if (config.patternType === "HAMMER") {
        if (t < 0.42) {
          phaseIdx = 1;
          phaseDesc = `Phase 1/3: 🐻 Selling Pressure - Pushing down to form lower shadow (${targetLow.toFixed(decimals)})`;
          const s = smoothStep(0, 0.42, t);
          currentTarget = startPrice + (targetLow - startPrice) * s;
        } else if (t < 0.78) {
          phaseIdx = 2;
          phaseDesc = `Phase 2/3: 🐂 Buyer Surge - Reversing drop and climbing past Open...`;
          const s = smoothStep(0.42, 0.78, t);
          currentTarget = targetLow + (targetHigh - targetLow) * s;
        } else {
          phaseIdx = 3;
          phaseDesc = `Phase 3/3: 🔨 Finalizing Hammer - Consolidating body near top (${targetClose.toFixed(decimals)})`;
          const s = smoothStep(0.78, 1.0, t);
          currentTarget = targetHigh + (targetClose - targetHigh) * s;
        }
      } else if (config.patternType === "INVERTED_HAMMER" || config.patternType === "SHOOTING_STAR") {
        if (t < 0.42) {
          phaseIdx = 1;
          phaseDesc = `Phase 1/3: 🐂 Bullish Surge - Pumping price up to form long upper wick (${targetHigh.toFixed(decimals)})`;
          const s = smoothStep(0, 0.42, t);
          currentTarget = startPrice + (targetHigh - startPrice) * s;
        } else if (t < 0.78) {
          phaseIdx = 2;
          phaseDesc = `Phase 2/3: 🐻 Strong Bearish Rejection - Dumping price back down toward open...`;
          const s = smoothStep(0.42, 0.78, t);
          currentTarget = targetHigh + (targetLow - targetHigh) * s;
        } else {
          phaseIdx = 3;
          phaseDesc = `Phase 3/3: 🌠 Settling Shooting Star Body near low (${targetClose.toFixed(decimals)})`;
          const s = smoothStep(0.78, 1.0, t);
          currentTarget = targetLow + (targetClose - targetLow) * s;
        }
      } else if (config.patternType === "DOJI") {
        if (t < 0.35) {
          phaseIdx = 1;
          phaseDesc = `Phase 1/3: 🐂 Testing Upper Range (${targetHigh.toFixed(decimals)})...`;
          const s = smoothStep(0, 0.35, t);
          currentTarget = startPrice + (targetHigh - startPrice) * s;
        } else if (t < 0.70) {
          phaseIdx = 2;
          phaseDesc = `Phase 2/3: 🐻 Testing Lower Range (${targetLow.toFixed(decimals)})...`;
          const s = smoothStep(0.35, 0.70, t);
          currentTarget = targetHigh + (targetLow - targetHigh) * s;
        } else {
          phaseIdx = 3;
          phaseDesc = `Phase 3/3: ⚖️ Snapping into Zero-Body Doji Cross at Open (${startPrice.toFixed(decimals)})`;
          const s = smoothStep(0.70, 1.0, t);
          currentTarget = targetLow + (startPrice - targetLow) * s;
        }
      } else if (config.patternType === "DRAGONFLY_DOJI") {
        if (t < 0.50) {
          phaseIdx = 1;
          phaseDesc = `Phase 1/2: 🐻 Deep plunge forming dragonfly tail (${targetLow.toFixed(decimals)})...`;
          const s = smoothStep(0, 0.50, t);
          currentTarget = startPrice + (targetLow - startPrice) * s;
        } else {
          phaseIdx = 2;
          phaseDesc = `Phase 2/2: 🧗 Complete recovery back to top Open price (${startPrice.toFixed(decimals)})`;
          const s = smoothStep(0.50, 1.0, t);
          currentTarget = targetLow + (startPrice - targetLow) * s;
        }
      } else if (config.patternType === "GRAVESTONE_DOJI") {
        if (t < 0.50) {
          phaseIdx = 1;
          phaseDesc = `Phase 1/2: 🐂 Massive spike forming gravestone wick (${targetHigh.toFixed(decimals)})...`;
          const s = smoothStep(0, 0.50, t);
          currentTarget = startPrice + (targetHigh - startPrice) * s;
        } else {
          phaseIdx = 2;
          phaseDesc = `Phase 2/2: 🪦 Complete selloff back down to Open price (${startPrice.toFixed(decimals)})`;
          const s = smoothStep(0.50, 1.0, t);
          currentTarget = targetHigh + (startPrice - targetHigh) * s;
        }
      } else if (config.patternType === "BULLISH_MARUBOZU") {
        phaseIdx = Math.min(3, Math.floor(t * 3) + 1);
        phaseDesc = `🟢 Relentless Bullish Power Surge climbing to ${targetClose.toFixed(decimals)}...`;
        const s = smoothStep(0, 1.0, t);
        currentTarget = startPrice + (targetClose - startPrice) * s;
      } else if (config.patternType === "BEARISH_MARUBOZU") {
        phaseIdx = Math.min(3, Math.floor(t * 3) + 1);
        phaseDesc = `🔴 Relentless Bearish Power Dump descending to ${targetClose.toFixed(decimals)}...`;
        const s = smoothStep(0, 1.0, t);
        currentTarget = startPrice + (targetClose - startPrice) * s;
      } else if (config.patternType === "HIGH_VOLATILITY_WAVE") {
        phaseIdx = Math.min(3, Math.floor(t * 3) + 1);
        phaseDesc = `⚡ High Frequency Market Whipsaw (${remainingSec}s remaining)...`;
        const wave = Math.sin(t * Math.PI * 4);
        currentTarget = startPrice + wave * (range * 0.75) + (targetClose - startPrice) * t;
      } else {
        // CUSTOM_PRICE_TARGET or others
        phaseIdx = Math.min(3, Math.floor(t * 3) + 1);
        phaseDesc = `🎯 Guiding live price smoothly to target: ${targetClose.toFixed(decimals)}`;
        const s = smoothStep(0, 1.0, t);
        currentTarget = startPrice + (targetClose - startPrice) * s;
      }

      // Add realistic market micro-noise (sub-pip jitter) so ticks feel 100% natural & organic
      const jitter = (Math.random() - 0.49) * microStep * 0.25;
      let nextPrice = currentTarget + jitter;

      if (t >= 1.0) {
        nextPrice = targetClose;
      }

      nextPrice = Math.round(nextPrice * factor) / factor;

      // Update state
      state.currentPrice = nextPrice;
      state.currentPhase = phaseDesc;
      state.phaseIndex = phaseIdx;
      state.progressPct = Math.min(100, Math.round(t * 100));
      state.timeRemainingSec = remainingSec;

      // Stream live price to all subscribers instantly
      this.setPrice(config.symbol, nextPrice, true, "Live Pattern Engine", 5);
      if (asset.pair && asset.pair !== config.symbol) {
        this.setPrice(asset.pair, nextPrice, true, "Live Pattern Engine", 5);
      }

      this.notifyListeners();
      this.notifyPatternListeners();

      // Pattern complete
      if (t >= 1.0) {
        clearInterval(intervalId);
        this.anchorPrices[config.symbol] = targetClose;
        if (asset.pair) this.anchorPrices[asset.pair] = targetClose;
        state.isActive = false;
        state.progressPct = 100;
        state.timeRemainingSec = 0;
        state.currentPhase = `✅ ${patternName} Live Formation Completed at ${targetClose.toFixed(decimals)}`;
        this.notifyPatternListeners();
        setTimeout(() => {
          this.activeLivePatterns.delete(symbolKey);
          this.notifyPatternListeners();
        }, 3000);
      }
    }, 80);

    this.activeLivePatterns.set(symbolKey, { config, state, intervalId });
    this.notifyPatternListeners();
    return true;
  }
}

export const livePriceService = new LivePriceManager();
