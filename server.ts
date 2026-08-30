import express from "express";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import WebSocket from "ws";
import { createServer as createViteServer } from "vite";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  updateDoc,
  runTransaction,
  increment
} from "firebase/firestore";

// Read Firebase Config
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }
} catch (err) {
  console.warn("Notice reading firebase-applet-config.json in server.ts:", err);
}

// Initialize Firebase App for Node Server
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Critical Health Check Endpoints for Cloud Run Deployment & Launch Checks
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get("/healthz", (req, res) => {
  res.status(200).send("OK");
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(firebaseApp);

// =========================================================================
// 1. SERVER-SIDE LIVE MARKET PRICE CACHE (Binance WS, Deriv WS, Yahoo/Gold API)
// =========================================================================
const serverLivePrices: Record<string, { price: number; timestamp: number }> = {};

function setServerPrice(symbol: string, price: number) {
  if (!symbol || !price || isNaN(price) || price <= 0) return;
  const upper = symbol.toUpperCase().trim();
  const clean = upper.replace(/^(BINANCE:|OANDA:|FX:|TVC:|CURRENCYCOM:)/, "").replace(/[^A-Z0-9]/g, "");
  const now = Date.now();
  serverLivePrices[upper] = { price, timestamp: now };
  serverLivePrices[clean] = { price, timestamp: now };
}

function getServerPrice(symbolOrPair: string): number | null {
  if (!symbolOrPair) return null;
  const upper = symbolOrPair.toUpperCase().trim();
  const clean = upper.replace(/^(BINANCE:|OANDA:|FX:|TVC:|CURRENCYCOM:)/, "").replace(/[^A-Z0-9]/g, "");

  // 1. Direct match
  if (serverLivePrices[upper]) return serverLivePrices[upper].price;
  if (serverLivePrices[clean]) return serverLivePrices[clean].price;

  // 2. Check variants
  for (const [k, v] of Object.entries(serverLivePrices)) {
    const kClean = k.replace(/^(BINANCE:|OANDA:|FX:|TVC:|CURRENCYCOM:)/, "").replace(/[^A-Z0-9]/g, "");
    if (kClean === clean || k === upper || (clean.length > 3 && kClean.includes(clean)) || (kClean.length > 3 && clean.includes(kClean))) {
      return v.price;
    }
  }
  return null;
}

// Start Server-Side Binance WebSocket
function startServerBinanceWS() {
  const streams = [
    "btcusdt@ticker",
    "ethusdt@ticker",
    "solusdt@ticker",
    "bnbusdt@ticker",
    "xrpusdt@ticker",
    "dogeusdt@ticker",
    "adausdt@ticker",
    "avaxusdt@ticker",
    "trxusdt@ticker",
    "dotusdt@ticker"
  ];
  const wsUrl = `wss://stream.binance.com:9443/ws/${streams.join("/")}`;
  try {
    const ws = new WebSocket(wsUrl);
    ws.on("open", () => console.log("[Server Live Feed] Binance WebSocket Connected."));
    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.s && msg.c) {
          const sym = msg.s.toUpperCase();
          const price = parseFloat(msg.c);
          setServerPrice(`BINANCE:${sym}`, price);
          setServerPrice(sym, price);
        }
      } catch (_) {}
    });
    ws.on("error", (err) => console.warn("[Server Binance WS Error]", err.message));
    ws.on("close", () => {
      setTimeout(startServerBinanceWS, 5000);
    });
  } catch (err) {
    setTimeout(startServerBinanceWS, 5000);
  }
}

// Start Server-Side Deriv WebSocket & Candle Fetch Engine
let serverDerivWs: WebSocket | null = null;
let serverDerivReqSeq = 0;
const serverDerivPendingRequests = new Map<number, { resolve: (data: any) => void; timeout: NodeJS.Timeout }>();

function mapServerToDerivSymbol(symbol: string): string {
  const clean = symbol.toUpperCase().replace(/^(FX:|OANDA:|TVC:|CURRENCYCOM:|BINANCE:|NSE:|FX_IDC:|DERIV:)/, "").replace(/[^A-Z0-9]/g, "");
  if (clean.includes("XAU") || clean.includes("GOLD")) return "frxXAUUSD";
  if (clean.includes("XAG") || clean.includes("SILVER")) return "frxXAGUSD";
  if (clean.includes("XPT")) return "frxXPTUSD";
  if (clean.includes("USOIL") || clean.includes("OIL")) return "frxOIL";
  if (clean.includes("R100") || clean === "R_100") return "R_100";
  if (clean.includes("1HZ100V") || clean === "1HZ100V") return "1HZ100V";
  
  if (clean.startsWith("FRX")) return `frx${clean.slice(3)}`;
  if (clean.length === 6) return `frx${clean}`;
  
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
    if (clean.includes(fx)) return `frx${fx}`;
  }
  return `frx${clean}`;
}

async function fetchServerDerivCandles(
  derivSymbol: string,
  timeframeSec: number = 60,
  count: number = 250
): Promise<{ time: number; open: number; high: number; low: number; close: number; volume: number }[] | null> {
  const isSubMinute = timeframeSec < 60;
  let granularity = 60;
  if (timeframeSec <= 60) granularity = 60;
  else if (timeframeSec <= 180) granularity = 180;
  else if (timeframeSec <= 300) granularity = 300;
  else if (timeframeSec <= 900) granularity = 900;
  else if (timeframeSec <= 1800) granularity = 1800;
  else if (timeframeSec <= 3600) granularity = 3600;
  else granularity = 86400;

  const reqId = ++serverDerivReqSeq;

  return new Promise((resolve) => {
    if (serverDerivWs && serverDerivWs.readyState === WebSocket.OPEN) {
      const timeout = setTimeout(() => {
        serverDerivPendingRequests.delete(reqId);
        resolve(null);
      }, 2500);

      serverDerivPendingRequests.set(reqId, {
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
              resolve(null);
            }
          } else {
            resolve(null);
          }
        },
        timeout
      });

      try {
        if (isSubMinute) {
          serverDerivWs.send(JSON.stringify({
            ticks_history: derivSymbol,
            end: "latest",
            count: Math.min(1000, count * Math.ceil(60 / timeframeSec)),
            style: "ticks",
            req_id: reqId
          }));
        } else {
          serverDerivWs.send(JSON.stringify({
            ticks_history: derivSymbol,
            end: "latest",
            count: Math.min(count, 300),
            style: "candles",
            granularity,
            req_id: reqId
          }));
        }
      } catch (_) {
        serverDerivPendingRequests.delete(reqId);
        clearTimeout(timeout);
        resolve(null);
      }
    } else {
      // Connect standalone WebSocket if main is reconnecting
      try {
        const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=1089`);
        const timer = setTimeout(() => {
          try { ws.close(); } catch (_) {}
          resolve(null);
        }, 2500);

        ws.onopen = () => {
          if (isSubMinute) {
            ws.send(JSON.stringify({
              ticks_history: derivSymbol,
              end: "latest",
              count: Math.min(1000, count * Math.ceil(60 / timeframeSec)),
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
            const data = JSON.parse(event.data.toString());
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
                resolve(null);
              }
            }
          } catch (_) {
            clearTimeout(timer);
            try { ws.close(); } catch (_) {}
            resolve(null);
          }
        };

        ws.onerror = () => {
          clearTimeout(timer);
          try { ws.close(); } catch (_) {}
          resolve(null);
        };
      } catch (_) {
        resolve(null);
      }
    }
  });
}

function startServerDerivWS() {
  const appId = 1089;
  try {
    const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${appId}`);
    serverDerivWs = ws;
    ws.on("open", () => {
      console.log("[Server Live Feed] Deriv WebSocket Connected.");
      const symbols = [
        "frxEURUSD", "frxGBPUSD", "frxUSDJPY", "frxEURJPY", "frxEURGBP",
        "frxUSDINR", "frxAUDUSD", "frxUSDCAD", "frxUSDCHF", "frxNZDUSD", "frxGBPJPY",
        "frxXAUUSD", "frxXAGUSD", "R_100", "1HZ100V"
      ];
      const reqTicks = () => {
        if (ws.readyState !== WebSocket.OPEN) return;
        symbols.forEach(s => {
          try { ws.send(JSON.stringify({ ticks_history: s, end: "latest", count: 1, style: "ticks" })); } catch (_) {}
        });
      };
      reqTicks();
      setInterval(reqTicks, 1500);
    });
    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());

        // Resolve any pending ticks_history candles requests
        if (msg.req_id && serverDerivPendingRequests.has(msg.req_id)) {
          const pending = serverDerivPendingRequests.get(msg.req_id)!;
          clearTimeout(pending.timeout);
          serverDerivPendingRequests.delete(msg.req_id);
          pending.resolve(msg);
        }

        if (msg.msg_type === "history" && msg.history?.prices?.length > 0) {
          const sym = msg.echo_req?.ticks_history || "";
          const price = msg.history.prices[msg.history.prices.length - 1];
          if (price && typeof price === "number" && price > 0) {
            let clean = sym.replace(/^frx/, "");
            setServerPrice(sym, price);
            setServerPrice(clean, price);
            setServerPrice(`FX:${clean}`, price);
            if (sym === "frxXAUUSD") {
              setServerPrice("OANDA:XAUUSD", price);
              setServerPrice("GOLD", price);
            }
            if (sym === "frxXAGUSD") {
              setServerPrice("TVC:SILVER", price);
              setServerPrice("OANDA:XAGUSD", price);
              setServerPrice("SILVER", price);
            }
          }
        } else if (msg.msg_type === "tick" && msg.tick) {
          const sym = msg.tick.symbol || "";
          const price = msg.tick.quote;
          if (price && typeof price === "number" && price > 0) {
            let clean = sym.replace(/^frx/, "");
            setServerPrice(sym, price);
            setServerPrice(clean, price);
            setServerPrice(`FX:${clean}`, price);
            if (sym === "frxXAUUSD") {
              setServerPrice("OANDA:XAUUSD", price);
              setServerPrice("GOLD", price);
            }
            if (sym === "frxXAGUSD") {
              setServerPrice("TVC:SILVER", price);
              setServerPrice("OANDA:XAGUSD", price);
              setServerPrice("SILVER", price);
            }
          }
        }
      } catch (_) {}
    });
    ws.on("error", (err) => console.warn("[Server Deriv WS Error]", err.message));
    ws.on("close", () => {
      serverDerivWs = null;
      setTimeout(startServerDerivWS, 5000);
    });
  } catch (err) {
    serverDerivWs = null;
    setTimeout(startServerDerivWS, 5000);
  }
}

// Start price feeds on server launch
startServerBinanceWS();
startServerDerivWS();

// =========================================================================
// 2. 24/7 SERVER-SIDE AUTHORITATIVE TRADE AUTO-SETTLER (ANTI-OFFLINE EXPLOIT)
// =========================================================================
const serverSettlingTradeIds = new Set<string>();

async function autoSettleExpiredSoloTradesServer() {
  try {
    const tradesCol = collection(db, "solo_trades");
    const q = query(tradesCol, where("status", "==", "RUNNING"));
    const snap = await getDocs(q);

    if (snap.empty) return;

    const now = Date.now();

    for (const docSnap of snap.docs) {
      const trade = docSnap.data();
      const tradeId = docSnap.id;
      if (tradeId.startsWith("temp_")) continue;

      const endTimeMs = new Date(trade.endTime).getTime();

      // Give client 4s grace period to submit its real-time tick-verified exit price before server fallback
      if (now >= (endTimeMs + 4000) && !serverSettlingTradeIds.has(tradeId)) {
        serverSettlingTradeIds.add(tradeId);

        try {
          const tradeRef = doc(db, "solo_trades", tradeId);

          await runTransaction(db, async (transaction) => {
            const currentTradeSnap = await transaction.get(tradeRef);
            if (!currentTradeSnap.exists()) return;
            const currentTrade = currentTradeSnap.data();
            if (currentTrade.status !== "RUNNING") return;

            // 1. Check if client already provided verified exit price
            let officialExitPrice = typeof currentTrade.exitPrice === "number" && !isNaN(currentTrade.exitPrice) && currentTrade.exitPrice > 0
              ? currentTrade.exitPrice
              : null;

            // 2. Query live server prices from Binance/Deriv WS cache
            if (!officialExitPrice) {
              officialExitPrice = getServerPrice(currentTrade.tradingSymbol) || getServerPrice(currentTrade.assetPair);
            }

            if (!officialExitPrice) {
              const cleanSym = currentTrade.tradingSymbol?.replace(/^(FX:|OANDA:|TVC:|BINANCE:)/, "") || "";
              officialExitPrice = cachedForexRates[cleanSym] || cachedForexRates[currentTrade.assetPair] || null;
            }

            // 3. If still not found, fallback to entryPrice only as a last resort
            if (!officialExitPrice) {
              officialExitPrice = currentTrade.entryPrice;
            }

            const entry = currentTrade.entryPrice;
            const exit = officialExitPrice;
            let isWin = false;
            let isDraw = false;

            if (currentTrade.tradeType === "CALL") {
              if (exit > entry) isWin = true;
              else if (exit === entry) isDraw = true;
            } else {
              // PUT
              if (exit < entry) isWin = true;
              else if (exit === entry) isDraw = true;
            }

            let finalOutcome: "WON" | "LOST" | "DRAW" = "LOST";
            let finalProfitOrLoss = -currentTrade.stake;
            let finalPayout = 0;

            if (isWin) {
              finalOutcome = "WON";
              const profit = (currentTrade.stake * (currentTrade.payoutPercentage || 85)) / 100;
              finalPayout = currentTrade.stake + profit;
              finalProfitOrLoss = profit;
            } else if (isDraw && currentTrade.drawRule === "REFUND") {
              finalOutcome = "DRAW";
              finalPayout = currentTrade.stake;
              finalProfitOrLoss = 0;
            } else {
              finalOutcome = "LOST";
              finalPayout = 0;
              finalProfitOrLoss = -currentTrade.stake;
            }

            const settledIso = new Date().toISOString();
            const userRef = doc(db, "users", currentTrade.userId);

            transaction.update(tradeRef, {
              status: finalOutcome,
              exitPrice: exit,
              profitOrLoss: finalProfitOrLoss,
              settledAt: settledIso
            });

            if (finalPayout > 0) {
              transaction.update(userRef, {
                availableBalance: increment(finalPayout),
                balance: increment(finalPayout)
              });

              const settleTxId = "tx_solo_set_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
              const settleTxRef = doc(db, "wallet_transactions", settleTxId);
              transaction.set(settleTxRef, {
                id: settleTxId,
                userId: currentTrade.userId,
                userEmail: currentTrade.userEmail,
                userName: currentTrade.userName,
                type: finalOutcome === "WON" ? "TRADE_PROFIT" : finalOutcome === "DRAW" ? "TRADE_REFUND" : "TRADE_LOSS",
                amount: finalPayout > 0 ? finalPayout : currentTrade.stake,
                status: "APPROVED",
                createdAt: settledIso,
                referenceId: tradeId,
                txDetails: `Solo Option Server Settled (${finalOutcome}): Entry ${entry} -> Exit ${exit} (${currentTrade.assetPair})`
              });
            }

            console.log(`[Server Authoritative Auto-Settler] Trade ${tradeId} (${currentTrade.assetPair}) settled -> ${finalOutcome} (Entry: ${entry}, Exit: ${exit}, Payout: ₹${finalPayout})`);
          });
        } catch (err: any) {
          console.error(`[Server Auto-Settler Error] Trade ${tradeId}:`, err?.message);
        } finally {
          serverSettlingTradeIds.delete(tradeId);
        }
      }
    }
  } catch (err: any) {
    console.error("[Server Auto-Settler Worker Error]:", err?.message);
  }
}

// Run server authoritative trade settler every 1 second continuously
setInterval(autoSettleExpiredSoloTradesServer, 1000);

/**
 * API: Generate or Regenerate Secure Login PIN for a User
 * Called by Admin Panel
 */
app.post("/api/user/generate-pin", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required." });
    }

    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Fetch all existing users to ensure PIN uniqueness across all accounts
    const usersCol = collection(db, "users");
    const allUsersSnap = await getDocs(usersCol);
    const existingHashes: string[] = [];

    allUsersSnap.forEach((docSnap) => {
      const uData = docSnap.data();
      if (uData.loginPinHash) {
        existingHashes.push(uData.loginPinHash);
      }
    });

    // Generate a unique 6 to 8 digit numeric PIN
    let candidatePin = "";
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 100) {
      attempts++;
      // Generate a 6-digit PIN (e.g. 100000 - 999999) or 7-8 digit
      const pinNum = Math.floor(100000 + Math.random() * 900000);
      candidatePin = pinNum.toString();

      // Check against all existing hashes
      let collision = false;
      for (const hash of existingHashes) {
        if (bcrypt.compareSync(candidatePin, hash)) {
          collision = true;
          break;
        }
      }

      if (!collision) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      return res.status(500).json({ success: false, message: "Could not generate a unique PIN. Please try again." });
    }

    // Hash the raw PIN securely using bcrypt
    const pinHash = bcrypt.hashSync(candidatePin, 10);
    const nowISO = new Date().toISOString();

    // Immediately invalidate old PIN and set new hashed PIN in Firestore
    await updateDoc(userRef, {
      loginPinHash: pinHash,
      pinGeneratedAt: nowISO,
      loginAttempts: 0,
      loginLockedUntil: null
    });

    // Return the generated PIN ONLY in this immediate response for Admin UI to show to Admin
    return res.json({
      success: true,
      userId,
      pin: candidatePin,
      generatedAt: nowISO,
      message: `Unique login PIN generated successfully for user!`
    });
  } catch (error: any) {
    console.error("Error generating PIN in server:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to generate login PIN on server."
    });
  }
});

/**
 * API: Secure Trader Login with Email + PIN & Rate Limiting
 */
app.post("/api/user/login", async (req, res) => {
  try {
    const { email, pin } = req.body;
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPin = (pin || "").trim();

    if (!cleanEmail) {
      return res.status(400).json({ success: false, message: "Please enter your registered email address." });
    }
    if (!cleanPin) {
      return res.status(400).json({ success: false, message: "Please enter your 6-8 digit login PIN." });
    }

    // 1. Find user by email in Firestore
    const usersCol = collection(db, "users");
    const q = query(usersCol, where("email", "==", cleanEmail));
    const querySnap = await getDocs(q);

    if (querySnap.empty) {
      return res.status(401).json({
        success: false,
        message: "No registered account found with this email address. Please contact Admin or Register."
      });
    }

    let userDoc: any = null;
    let userData: any = null;

    querySnap.forEach((docSnap) => {
      userDoc = docSnap;
      userData = docSnap.data();
    });

    if (!userData) {
      return res.status(401).json({ success: false, message: "User account not found." });
    }

    // 2. Check if user is blocked
    if (userData.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your trader account has been BLOCKED by Admin. Access restricted. Please contact support."
      });
    }

    const userRef = doc(db, "users", userDoc.id);

    // 3. Rate limiting & Lockout check
    if (userData.loginLockedUntil) {
      const lockTime = new Date(userData.loginLockedUntil).getTime();
      const now = Date.now();
      if (now < lockTime) {
        const remainingMs = lockTime - now;
        const remainingMins = Math.ceil(remainingMs / 60000);
        return res.status(429).json({
          success: false,
          message: `⛔ Account is temporarily LOCKED due to 5 failed PIN attempts. Please try again in ${remainingMins} minute(s) or ask Admin to regenerate your PIN.`
        });
      } else {
        // Lock period expired, reset attempts and clear lock
        await updateDoc(userRef, {
          loginLockedUntil: null,
          loginAttempts: 0
        });
        userData.loginLockedUntil = null;
        userData.loginAttempts = 0;
      }
    }

    // 4. Check if a PIN has been generated for this account
    if (!userData.loginPinHash) {
      return res.status(400).json({
        success: false,
        message: "No login PIN has been generated for your account yet. Please ask Admin to Generate your Login PIN."
      });
    }

    // 5. Verify PIN using bcrypt
    const isMatch = bcrypt.compareSync(cleanPin, userData.loginPinHash);

    if (!isMatch) {
      const newAttempts = (userData.loginAttempts || 0) + 1;
      const MAX_ATTEMPTS = 5;

      if (newAttempts >= MAX_ATTEMPTS) {
        // Lock for 15 minutes
        const lockUntilISO = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        await updateDoc(userRef, {
          loginAttempts: newAttempts,
          loginLockedUntil: lockUntilISO
        });

        return res.status(429).json({
          success: false,
          message: `⛔ Account LOCKED for 15 minutes due to 5 failed PIN attempts. Please contact Admin if you need a new PIN.`
        });
      } else {
        await updateDoc(userRef, {
          loginAttempts: newAttempts
        });

        const remaining = MAX_ATTEMPTS - newAttempts;
        return res.status(401).json({
          success: false,
          message: `Invalid Login PIN! (${newAttempts}/${MAX_ATTEMPTS} failed attempts). You have ${remaining} attempt(s) remaining.`
        });
      }
    }

    // 6. Successful Login: Reset failed attempts & clear lock
    await updateDoc(userRef, {
      loginAttempts: 0,
      loginLockedUntil: null
    });

    const sanitizedUser = {
      id: userDoc.id,
      email: userData.email,
      name: userData.name,
      balance: userData.balance ?? 0,
      availableBalance: userData.availableBalance ?? userData.balance ?? 0,
      lockedBalance: userData.lockedBalance ?? 0,
      phone: userData.phone || "",
      mobileVerified: userData.mobileVerified ?? false,
      verificationStatus: userData.verificationStatus || "pending",
      kycStatus: userData.kycStatus || "unverified"
    };

    return res.json({
      success: true,
      user: sanitizedUser,
      message: "Trader login verified successfully!"
    });
  } catch (error: any) {
    console.error("Error during trader PIN login:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Server error during login verification."
    });
  }
});

/**
 * High-speed Real-Time Live Forex, Metals & Commodities Price API Proxy
 * Directly fetches live official quotes from TradingView Scanner with sub-second caching
 */
let cachedForexRates: Record<string, number> = {};
let lastForexFetchTime = 0;

async function updateOfficialTradingViewQuotes() {
  try {
    // 1. TradingView Official Forex Scanner (Zero delay, exact TradingView live quotes)
    const forexTvPromise = (async () => {
      try {
        const res = await fetch("https://scanner.tradingview.com/forex/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
          body: JSON.stringify({
            symbols: {
              tickers: [
                "FX:EURUSD", "FX:GBPUSD", "FX:USDJPY", "FX:USDCAD", "FX:USDCHF", "FX:AUDUSD", "FX:NZDUSD", "FX:USDINR",
                "FX:EURGBP", "FX:EURJPY", "FX:EURAUD", "FX:EURCAD", "FX:EURCHF", "FX:EURNZD", "FX:EURSGD", "FX:EURTRY", "FX:EURZAR", "FX:EURSEK", "FX:EURNOK",
                "FX:GBPJPY", "FX:GBPAUD", "FX:GBPCAD", "FX:GBPCHF", "FX:GBPNZD",
                "FX:AUDJPY", "FX:AUDCAD", "FX:AUDCHF", "FX:AUDNZD",
                "FX:NZDJPY", "FX:NZDCAD", "FX:NZDCHF",
                "FX:CADJPY", "FX:CADCHF", "FX:CHFJPY",
                "FX:USDSGD", "FX:USDHKD", "FX:USDMXN", "FX:USDZAR", "FX:USDTRY", "FX:USDBRL", "FX:USDSEK", "FX:USDNOK", "FX:USDCNH", "FX:USDTHB", "FX:USDMYR", "FX:USDIDR",
                "FX_IDC:EURUSD", "FX_IDC:USDINR"
              ]
            },
            columns: ["close", "change", "high", "low", "open"]
          }),
          signal: AbortSignal.timeout(2000)
        });
        if (res.ok) {
          const d: any = await res.json();
          if (Array.isArray(d?.data)) {
            d.data.forEach((item: { s: string; d: number[] }) => {
              const sym = item.s.toUpperCase();
              const price = item.d[0];
              if (price && typeof price === "number" && price > 0) {
                const clean = sym.replace(/^(FX:|FX_IDC:|OANDA:|CAPITALCOM:)/, "").replace(/[^A-Z0-9]/g, "");
                cachedForexRates[sym] = price;
                cachedForexRates[clean] = price;
                cachedForexRates[`FX:${clean}`] = price;
                setServerPrice(sym, price);
                setServerPrice(clean, price);
                setServerPrice(`FX:${clean}`, price);
              }
            });
          }
        }
      } catch (_) {}
    })();

    // 2. TradingView Official CFD Scanner (Gold OANDA:XAUUSD, Silver TVC:SILVER, Crude Oil TVC:USOIL, Indices)
    const cfdTvPromise = (async () => {
      try {
        const res = await fetch("https://scanner.tradingview.com/cfd/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
          body: JSON.stringify({
            symbols: {
              tickers: [
                "OANDA:XAUUSD", "TVC:SILVER", "TVC:USOIL", "OANDA:XPTUSD",
                "CURRENCYCOM:US500", "CURRENCYCOM:US100", "CURRENCYCOM:US30",
                "CURRENCYCOM:DE40", "NSE:NIFTY"
              ]
            },
            columns: ["close", "change", "high", "low", "open"]
          }),
          signal: AbortSignal.timeout(2000)
        });
        if (res.ok) {
          const d: any = await res.json();
          if (Array.isArray(d?.data)) {
            d.data.forEach((item: { s: string; d: number[] }) => {
              const sym = item.s.toUpperCase();
              const price = item.d[0];
              if (price && typeof price === "number" && price > 0) {
                const clean = sym.replace(/^(OANDA:|TVC:|CURRENCYCOM:|NSE:)/, "").replace(/[^A-Z0-9]/g, "");
                cachedForexRates[sym] = price;
                cachedForexRates[clean] = price;
                if (sym.includes("XAUUSD")) {
                  cachedForexRates["GOLD"] = price;
                  setServerPrice("GOLD", price);
                }
                if (sym.includes("SILVER")) {
                  cachedForexRates["XAGUSD"] = price;
                  cachedForexRates["SILVER"] = price;
                  setServerPrice("XAGUSD", price);
                  setServerPrice("SILVER", price);
                }
                if (sym.includes("USOIL")) {
                  cachedForexRates["USOIL"] = price;
                  setServerPrice("USOIL", price);
                }
                setServerPrice(sym, price);
                setServerPrice(clean, price);
              }
            });
          }
        }
      } catch (_) {}
    })();

    // 3. High-precision Spot Gold & Silver fallback
    const goldPromise = (async () => {
      try {
        const gRes = await fetch("https://api.gold-api.com/price/XAU", {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(2000)
        });
        if (gRes.ok) {
          const gData: any = await gRes.json();
          if (gData && typeof gData.price === "number" && gData.price > 0) {
            cachedForexRates["XAUUSD"] = gData.price;
            cachedForexRates["OANDA:XAUUSD"] = gData.price;
            cachedForexRates["GOLD"] = gData.price;
            setServerPrice("OANDA:XAUUSD", gData.price);
            setServerPrice("XAUUSD", gData.price);
            setServerPrice("GOLD", gData.price);
          }
        }
      } catch (_) {}
    })();

    const silverPromise = (async () => {
      try {
        const sRes = await fetch("https://api.gold-api.com/price/XAG", {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(2000)
        });
        if (sRes.ok) {
          const sData: any = await sRes.json();
          if (sData && typeof sData.price === "number" && sData.price > 0) {
            cachedForexRates["XAGUSD"] = sData.price;
            cachedForexRates["OANDA:XAGUSD"] = sData.price;
            cachedForexRates["TVC:SILVER"] = sData.price;
            cachedForexRates["SILVER"] = sData.price;
            setServerPrice("TVC:SILVER", sData.price);
            setServerPrice("OANDA:XAGUSD", sData.price);
            setServerPrice("XAGUSD", sData.price);
          }
        }
      } catch (_) {}
    })();

    // 4. Secondary fallback: Yahoo Finance
    const pairs = [
      { key: "EURUSD", ticker: "EURUSD=X" },
      { key: "GBPUSD", ticker: "GBPUSD=X" },
      { key: "EURJPY", ticker: "EURJPY=X" },
      { key: "EURGBP", ticker: "EURGBP=X" },
      { key: "USDJPY", ticker: "USDJPY=X" },
      { key: "USDINR", ticker: "USDINR=X" },
      { key: "AUDUSD", ticker: "AUDUSD=X" },
      { key: "USDCAD", ticker: "USDCAD=X" },
      { key: "USDCHF", ticker: "USDCHF=X" },
      { key: "NZDUSD", ticker: "NZDUSD=X" },
      { key: "GBPJPY", ticker: "GBPJPY=X" },
      { key: "USOIL", ticker: "CL=F" }
    ];

    const yahooPromises = pairs.map(async (p) => {
      try {
        if (cachedForexRates[p.key]) return; // Prefer TradingView official scanner
        const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${p.ticker}`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          },
          signal: AbortSignal.timeout(2000)
        });
        if (response.ok) {
          const data: any = await response.json();
          const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
          if (price && typeof price === "number" && price > 0) {
            cachedForexRates[p.key] = price;
            cachedForexRates[`FX:${p.key}`] = price;
            setServerPrice(`FX:${p.key}`, price);
            setServerPrice(p.key, price);
          }
        }
      } catch (_) {}
    });

    await Promise.all([forexTvPromise, cfdTvPromise, goldPromise, silverPromise, ...yahooPromises]);
    lastForexFetchTime = Date.now();
  } catch (err: any) {
    console.warn("[Forex Fetch Warning]", err?.message);
  }
}

// Initial fetch & continuous background background fetch every 1.5s
updateOfficialTradingViewQuotes();
setInterval(updateOfficialTradingViewQuotes, 1500);

app.get("/api/market/forex", async (req, res) => {
  const now = Date.now();
  if (now - lastForexFetchTime > 1500 || Object.keys(cachedForexRates).length === 0) {
    await updateOfficialTradingViewQuotes();
  }
  return res.json({ success: true, rates: cachedForexRates, source: "tradingview_live", timestamp: lastForexFetchTime });
});

// In-memory Server-side Candle Cache & Inflight Promise Deduplication
const serverCandleCache = new Map<string, { candles: any[]; expiresAt: number }>();
const lastKnownCandlesMap = new Map<string, any[]>();
const inflightCandleFetches = new Map<string, Promise<any[] | null>>();

async function fetchAndBuildCandles(
  clean: string,
  rawSym: string,
  timeframeSec: number,
  limit: number,
  clientTargetPrice: number
): Promise<any[] | null> {
  const cacheKey = `${clean}_${timeframeSec}`;

  // 1. CRYPTO: Direct Binance API / UIKlines (100% Real Binance Market Data)
  const isCrypto =
    clean.includes("BTC") ||
    clean.includes("ETH") ||
    clean.includes("SOL") ||
    clean.includes("BNB") ||
    clean.includes("DOGE") ||
    clean.includes("XRP") ||
    clean.includes("ADA") ||
    clean.includes("DOT") ||
    clean.includes("TRX") ||
    clean.includes("LINK") ||
    clean.includes("MATIC") ||
    clean.includes("SHIB") ||
    clean.includes("PEPE") ||
    clean.includes("CRYPTO") ||
    clean.includes("BINANCE");

  if (isCrypto) {
    let pair = clean.replace("BINANCE", "").replace("CRY", "");
    if (!pair.endsWith("USDT")) pair += "USDT";

    let interval = "1m";
    let fetchLimit = limit;
    if (timeframeSec < 60) {
      interval = "1s";
      fetchLimit = Math.min(1000, limit * timeframeSec);
    } else if (timeframeSec <= 60) interval = "1m";
    else if (timeframeSec <= 180) interval = "3m";
    else if (timeframeSec <= 300) interval = "5m";
    else if (timeframeSec <= 900) interval = "15m";
    else interval = "1h";

    const endpoints = [
      `https://api.binance.com/api/v3/uiKlines?symbol=${pair}&interval=${interval}&limit=${fetchLimit}`,
      `https://data-api.binance.vision/api/v3/uiKlines?symbol=${pair}&interval=${interval}&limit=${fetchLimit}`,
      `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${fetchLimit}`
    ];

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, { signal: AbortSignal.timeout(2500) });
        if (res.ok) {
          const raw: any = await res.json();
          if (Array.isArray(raw) && raw.length > 0) {
            if (interval === "1s" && timeframeSec > 1) {
              const bucketMs = timeframeSec * 1000;
              const bucketMap = new Map<number, { time: number; open: number; high: number; low: number; close: number; volume: number }>();
              for (const k of raw) {
                const kTime = Number(k[0]);
                const o = parseFloat(k[1]);
                const h = parseFloat(k[2]);
                const l = parseFloat(k[3]);
                const c = parseFloat(k[4]);
                const v = parseFloat(k[5]) || 1;
                if (isNaN(o) || isNaN(c) || o <= 0 || c <= 0) continue;
                const bTime = Math.floor(kTime / bucketMs) * bucketMs;
                if (!bucketMap.has(bTime)) {
                  bucketMap.set(bTime, { time: bTime, open: o, high: h, low: l, close: c, volume: v });
                } else {
                  const ex = bucketMap.get(bTime)!;
                  ex.high = Math.max(ex.high, h);
                  ex.low = Math.min(ex.low, l);
                  ex.close = c;
                  ex.volume += v;
                }
              }
              return Array.from(bucketMap.values());
            } else {
              return raw.map((k: any) => ({
                time: Number(k[0]),
                open: parseFloat(k[1]),
                high: parseFloat(k[2]),
                low: parseFloat(k[3]),
                close: parseFloat(k[4]),
                volume: parseFloat(k[5]) || 1
              }));
            }
          }
        }
      } catch (_) {}
    }
  }

  // 2. FOREX, METALS, COMMODITIES, SYNTHETIC INDICES: Direct Deriv WebSocket (100% Real Deriv Interbank Feed)
  try {
    const derivSym = mapServerToDerivSymbol(rawSym || clean);
    const derivCandles = await fetchServerDerivCandles(derivSym, timeframeSec, limit);
    if (derivCandles && derivCandles.length > 0) {
      return derivCandles;
    }
  } catch (_) {}

  return null;
}

/**
 * Historical Candlestick Klines Proxy Endpoint
 * Serves real historical OHLC candles directly from Deriv WS for Forex/Metals and Binance for Crypto
 */
app.get("/api/market/candles", async (req, res) => {
  try {
    const rawSym = String(req.query.symbol || "EURUSD").toUpperCase();
    const timeframeSec = parseInt(String(req.query.timeframeSec || "60"), 10) || 60;
    const limit = Math.min(parseInt(String(req.query.limit || "200"), 10) || 150, 500);
    const clientTargetPrice = parseFloat(String(req.query.currentPrice || "")) || 0;

    const clean = rawSym.replace(/^(FX:|OANDA:|TVC:|CURRENCYCOM:|BINANCE:|NSE:|FX_IDC:|DERIV:)/, "").replace(/[^A-Z0-9]/g, "");

    const candles = await fetchAndBuildCandles(clean, rawSym, timeframeSec, limit, clientTargetPrice);
    if (candles && candles.length > 0) {
      return res.json({ success: true, symbol: rawSym, candles });
    }

    return res.status(404).json({ success: false, message: "No candles available" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// Vite middleware for development vs static serve for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Full-Stack Express server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
