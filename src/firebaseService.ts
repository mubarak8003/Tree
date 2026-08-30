import { 
  doc, 
  runTransaction, 
  setDoc, 
  getDoc, 
  updateDoc,
  deleteDoc,
  collection, 
  getDocs, 
  query, 
  where,
  orderBy,
  limit,
  onSnapshot,
  increment
} from "firebase/firestore";
import { db } from "./firebase";
import bcrypt from "bcryptjs";
import { 
  UserProfile, 
  TradePool, 
  Participant, 
  TradeOutcome, 
  TradeStatus, 
  WalletTransaction,
  TradeType,
  WalletTxType,
  WalletTxStatus,
  SupportMessage,
  SupportThreadMessage,
  PaymentDetails,
  PaymentGateway,
  WithdrawalField,
  WalletLimits,
  DEFAULT_LIMITS_POLICY_NOTE,
  UserCustomLimits,
  AdminRole,
  RiskLevel,
  AdminAuthState,
  AdminAuditLog,
  SoloTrade,
  SoloTradeType,
  SoloTradeStatus,
  SoloTradingConfig,
  WalletTransferConfig,
  WalletTransferRecord,
  TransferAuditLog
} from "./types";

// Default demo users to initialize in Firestore if they don't exist
export const DEFAULT_USERS: UserProfile[] = [
  { id: "user_a", email: "amaizy1@gmail.com", name: "User A (Amaizy)", balance: 500, availableBalance: 500, lockedBalance: 0, mobileVerified: true, verificationStatus: "approved", phone: "9876543210" },
  { id: "user_b", email: "riya_sharma@example.com", name: "User B (Riya)", balance: 300, availableBalance: 300, lockedBalance: 0, mobileVerified: false, verificationStatus: "pending", phone: "9876543211" },
  { id: "user_c", email: "arjun_patel@example.com", name: "User C (Arjun)", balance: 400, availableBalance: 400, lockedBalance: 0, mobileVerified: false, verificationStatus: "pending", phone: "9876543212" },
  { id: "user_d", email: "deepa_nair@example.com", name: "User D (Deepa)", balance: 600, availableBalance: 600, lockedBalance: 0, mobileVerified: false, verificationStatus: "pending", phone: "9876543213" },
  { id: "user_e", email: "vikram_rao@example.com", name: "User E (Vikram)", balance: 200, availableBalance: 200, lockedBalance: 0, mobileVerified: false, verificationStatus: "pending", phone: "9876543214" }
];

/**
 * Helper to check if a user is mobile verified and approved
 */
export function isUserMobileVerified(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  return user.mobileVerified === true && user.verificationStatus === "approved";
}

/**
 * Helper to normalize phone numbers to last 10 digits for duplicate detection
 */
export function normalizePhoneDigits(phone?: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Initialize Firestore database with default users and default first trade pools
 */
export async function initializeDatabase() {
  try {
    const initRef = doc(db, "app_settings", "init");
    let initSnap;
    try {
      initSnap = await getDoc(initRef);
    } catch (netErr: any) {
      console.warn("Firestore offline or network slow during database init check:", netErr?.message || netErr);
      return;
    }

    if (!initSnap.exists()) {
      for (const defaultUser of DEFAULT_USERS) {
        try {
          const userRef = doc(db, "users", defaultUser.id);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, defaultUser);
          }
        } catch (uErr) {
          console.warn(`Skipped setting default user ${defaultUser.id} due to offline/network state:`, uErr);
        }
      }

      // Initialize default active pool once on initial setup if empty
      try {
        const poolsCol = collection(db, "trade_pools");
        const poolsSnap = await getDocs(poolsCol);
        if (poolsSnap.empty) {
          await createNewTradePool(
            100, 
            10, 
            5, 
            300, 
            "CALL", 
            15, 
            false, 
            0, 
            "BTC / USDT (Bitcoin)", 
            "BINANCE:BTCUSDT", 
            "Today at " + new Date(Date.now() + 15 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " (5-Min Candle)",
            "5M"
          );
        }
      } catch (pErr) {
        console.warn("Skipped setting default pool due to offline/network state:", pErr);
      }

      try {
        await setDoc(initRef, { initializedAt: new Date().toISOString() });
      } catch (iErr) {
        console.warn("Skipped writing init flag due to offline/network state:", iErr);
      }
    }
  } catch (error) {
    console.warn("Notice: Database initialization skipped due to offline mode or network delay:", error);
  }
}

/**
 * Creates a new Trade Pool in Firestore
 */
export async function createNewTradePool(
  targetAmount: number,
  minContribution: number,
  maxParticipants: number,
  timeoutSeconds: number,
  tradeType?: TradeType,
  expectedReturn?: number,
  isFreePool?: boolean,
  freeRewardAmount?: number,
  assetPair?: string,
  tradingSymbol?: string,
  scheduledExecutionTime?: string,
  timeframe?: string,
  riskLevel?: RiskLevel
): Promise<string> {
  const poolId = "pool_" + Date.now();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + timeoutSeconds * 1000).toISOString();
  
  // Randomly select CALL or PUT if not specified
  const finalTradeType = tradeType || (Math.random() > 0.5 ? "CALL" : "PUT");
  const finalExpectedReturn = expectedReturn !== undefined ? expectedReturn : 15; // default 15%
  const finalRiskLevel: RiskLevel = riskLevel || (isFreePool ? "NO_RISK" : "HIGH");

  const defaultPairs = [
    { pair: "BTC / USDT (Bitcoin)", symbol: "BINANCE:BTCUSDT" },
    { pair: "EUR / USD (Euro / Dollar)", symbol: "FX:EURUSD" },
    { pair: "XAU / USD (Gold)", symbol: "OANDA:XAUUSD" },
    { pair: "ETH / USDT (Ethereum)", symbol: "BINANCE:ETHUSDT" },
  ];
  const randomPair = defaultPairs[Math.floor(Math.random() * defaultPairs.length)];

  const finalAssetPair = assetPair || randomPair.pair;
  const finalTradingSymbol = tradingSymbol || randomPair.symbol;
  const finalSchedule = scheduledExecutionTime || ("Today at " + new Date(Date.now() + Math.max(300, timeoutSeconds) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " (5-Min Candle)");
  const finalTimeframe = timeframe || "5M";

  const newPool: TradePool = {
    id: poolId,
    status: "WAITING",
    tradeType: finalTradeType,
    targetAmount: isFreePool ? 0 : targetAmount,
    minContribution: isFreePool ? 0 : minContribution,
    maxParticipants,
    timeoutSeconds,
    createdAt,
    expiresAt,
    totalCollected: 0,
    participantsCount: 0,
    participants: {},
    outcome: null,
    expectedReturn: finalExpectedReturn,
    isFreePool: !!isFreePool,
    freeRewardAmount: isFreePool ? (freeRewardAmount ?? 10) : 0,
    assetPair: finalAssetPair,
    tradingSymbol: finalTradingSymbol,
    scheduledExecutionTime: finalSchedule,
    timeframe: finalTimeframe,
    riskLevel: finalRiskLevel
  };

  const poolRef = doc(db, "trade_pools", poolId);
  await setDoc(poolRef, newPool);
  return poolId;
}

/**
 * Update expected return percentage on an active or waiting pool
 */
export async function updatePoolExpectedReturn(
  poolId: string,
  expectedReturn: number
): Promise<void> {
  const poolRef = doc(db, "trade_pools", poolId);
  await setDoc(poolRef, { expectedReturn }, { merge: true });
}

/**
 * Update trade pool parameters (Asset Pair, Target Amount, Trade Type, Schedule, ROI, etc.)
 */
export async function updateTradePoolDetails(
  poolId: string,
  updates: Partial<TradePool>
): Promise<void> {
  const poolRef = doc(db, "trade_pools", poolId);
  await setDoc(poolRef, updates, { merge: true });
}

/**
 * Join trade pool using secure Firestore transaction.
 * Ensures:
 * - Moves amount from availableBalance to lockedBalance
 * - Keeps totalBalance unchanged (since total = available + locked)
 * - Verifies boundaries, timeout, duplicate entry
 * - Creates a transaction history item and wallet transaction history log
 */
export async function joinTradePool(
  poolId: string,
  userId: string,
  amount: number
): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("⚠️ Internet Disconnected: Cannot join trade pool while offline. Please check your internet connection.");
  }
  const poolRef = doc(db, "trade_pools", poolId);
  const userRef = doc(db, "users", userId);
  const walletTxId = "tx_invest_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

  await runTransaction(db, async (transaction) => {
    // 1. Fetch Pool & User
    const poolSnap = await transaction.get(poolRef);
    if (!poolSnap.exists()) {
      throw new Error("Trade pool not found");
    }
    const pool = poolSnap.data() as TradePool;

    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) {
      throw new Error("User profile not found");
    }
    const user = userSnap.data() as UserProfile;

    if (!isUserMobileVerified(user)) {
      throw new Error("Mobile Verification Required! Trading is locked until your mobile number is verified. Please enter your 6-digit PIN in Profile Settings.");
    }

    // 2. State & Time checks
    if (pool.status !== "WAITING") {
      throw new Error(`Cannot join trade pool. Status is already ${pool.status}`);
    }

    const now = new Date();
    const expiry = new Date(pool.expiresAt);
    if (now >= expiry) {
      throw new Error("Cannot join trade pool. The timer has expired!");
    }

    // 3. Allow top-up or new participation in the same pool
    const existingParticipant = pool.participants?.[userId];
    if (existingParticipant && pool.isFreePool) {
      throw new Error("You have already registered for this Free Promo Pool.");
    }

    // 4. Max participants boundary (only enforced for new participants)
    if (!existingParticipant && pool.participantsCount >= pool.maxParticipants) {
      throw new Error(`Maximum participant limit (${pool.maxParticipants}) reached.`);
    }

    // 5. Check contribution constraints
    let actualAmount = amount;
    if (pool.isFreePool) {
      actualAmount = 0;
    } else {
      if (amount <= 0) {
        throw new Error("Please enter a valid investment amount greater than ₹0.");
      }
      if (!existingParticipant && amount < pool.minContribution) {
        throw new Error(`Minimum initial contribution is ₹${pool.minContribution}.`);
      }

      const remainingNeeded = pool.targetAmount - pool.totalCollected;
      if (amount > remainingNeeded) {
        throw new Error(`Contribution of ₹${amount} exceeds remaining needed target ₹${remainingNeeded}.`);
      }

      // 6. Check wallet Available Balance
      const availBal = user.availableBalance ?? user.balance ?? 0;
      if (availBal < amount) {
        throw new Error(`Insufficient Available Balance! You have ₹${availBal.toFixed(2)}, but tried to invest ₹${amount}.`);
      }
    }

    // --- EXECUTE TRANSACTION TRANSITIONS ---

    // Deduct from available, lock in locked balance
    const nextAvailable = user.availableBalance - actualAmount;
    const nextLocked = user.lockedBalance + actualAmount;
    const nextTotal = nextAvailable + nextLocked;

    const previousAmount = existingParticipant ? existingParticipant.amount : 0;
    const newUserTotalAmount = previousAmount + actualAmount;

    const sharePercentage = pool.isFreePool ? 0 : (newUserTotalAmount / pool.targetAmount) * 100;
    const participant: Participant = {
      userId,
      email: user.email,
      userName: user.name || user.email.split("@")[0],
      amount: newUserTotalAmount,
      sharePercentage,
      joinedAt: existingParticipant ? existingParticipant.joinedAt : new Date().toISOString()
    };

    const nextCollected = pool.isFreePool ? 0 : pool.totalCollected + actualAmount;
    const nextParticipants = { ...pool.participants, [userId]: participant };
    const nextParticipantsCount = existingParticipant
      ? pool.participantsCount
      : pool.participantsCount + 1;

    let nextStatus: TradeStatus = "WAITING";
    if (pool.isFreePool) {
      if (nextParticipantsCount >= pool.maxParticipants) {
        nextStatus = "ACTIVE";
      }
    } else {
      if (nextCollected >= pool.targetAmount) {
        nextStatus = "ACTIVE";
      }
    }

    // Write wallet transactions
    if (actualAmount > 0) {
      const walletTxRef = doc(db, "wallet_transactions", walletTxId);
      const walletTx: WalletTransaction = {
        id: walletTxId,
        userId,
        userEmail: user.email || "user@example.com",
        userName: user.name || user.email?.split("@")[0] || "Trader",
        type: "TRADE_INVEST",
        amount: actualAmount,
        status: "APPROVED",
        createdAt: new Date().toISOString(),
        balanceBefore: user.availableBalance,
        balanceAfter: nextAvailable,
        referenceId: poolId,
        txDetails: existingParticipant
          ? `Top Up Investment (+₹${actualAmount}) in Pool #${poolId}`
          : `Joined Trade Pool #${poolId}`
      };
      transaction.set(walletTxRef, walletTx);
    }

    // Update Firestore records
    transaction.update(userRef, {
      availableBalance: nextAvailable,
      lockedBalance: nextLocked,
      balance: nextTotal
    });

    transaction.update(poolRef, {
      totalCollected: nextCollected,
      participants: nextParticipants,
      participantsCount: nextParticipantsCount,
      status: nextStatus
    });
  });
}

/**
 * Refund a trade pool (called on timeout or cancel) using Firestore transaction
 * Ensures:
 * - Releases locked balance back to available balance
 * - Updates total balance
 * - Creates a wallet transaction log with type TRADE_REFUND
 */
export async function refundTradePool(poolId: string, isCanceledByAdmin: boolean = false): Promise<void> {
  const poolRef = doc(db, "trade_pools", poolId);

  await runTransaction(db, async (transaction) => {
    const poolSnap = await transaction.get(poolRef);
    if (!poolSnap.exists()) {
      throw new Error("Trade pool not found");
    }
    const pool = poolSnap.data() as TradePool;

    // Check if it is allowed to refund (status can be WAITING or ACTIVE if canceled by Admin)
    if (pool.status === "REFUNDED" || pool.status === "COMPLETED") {
      // Already refunded or completed, return gracefully
      return;
    }

    if (pool.status !== "WAITING" && !(isCanceledByAdmin && pool.status === "ACTIVE")) {
      return;
    }

    const participantIds = Object.keys(pool.participants || {});

    // Step 1: Execute ALL reads first
    const participantEntries = [];
    for (const userId of participantIds) {
      const p = pool.participants?.[userId];
      if (!p) continue;
      const userRef = doc(db, "users", userId);
      const userSnap = await transaction.get(userRef);
      participantEntries.push({ userId, p, userRef, userSnap });
    }

    // Step 2: Execute ALL writes after reads
    for (const { userId, p, userRef, userSnap } of participantEntries) {
      if (userSnap.exists()) {
        const user = userSnap.data() as UserProfile;
        
        // Safeguard to make sure we don't deduct more locked balance than user has
        const userLocked = user.lockedBalance || 0;
        const userAvail = user.availableBalance || 0;
        const pAmount = p.amount || 0;

        const deductLocked = Math.min(userLocked, pAmount);
        const nextAvailable = userAvail + pAmount;
        const nextLocked = Math.max(0, userLocked - deductLocked);
        const nextTotal = nextAvailable + nextLocked;

        const walletTxId = "tx_refund_" + Date.now() + "_" + Math.floor(Math.random() * 1000) + "_" + userId;
        const walletTxRef = doc(db, "wallet_transactions", walletTxId);
        const walletTx: WalletTransaction = {
          id: walletTxId,
          userId,
          userEmail: user.email || "user@example.com",
          userName: user.name || user.email?.split("@")[0] || "Trader",
          type: "TRADE_REFUND",
          amount: pAmount,
          status: "APPROVED",
          createdAt: new Date().toISOString(),
          balanceBefore: userAvail,
          balanceAfter: nextAvailable,
          referenceId: poolId
        };

        transaction.set(walletTxRef, walletTx);
        transaction.update(userRef, {
          availableBalance: nextAvailable,
          lockedBalance: nextLocked,
          balance: nextTotal
        });
      }
    }

    transaction.update(poolRef, {
      status: "REFUNDED",
      canceledByAdmin: isCanceledByAdmin
    });
  });
}

/**
 * Permanently delete a launch trade pool from Admin Panel.
 * If the pool has active participants, automatically refunds them first before deleting the pool document.
 */
export async function deleteTradePoolPermanently(poolId: string): Promise<void> {
  const poolRef = doc(db, "trade_pools", poolId);
  const poolSnap = await getDoc(poolRef);
  if (!poolSnap.exists()) {
    return; // Already deleted or doesn't exist
  }
  const pool = poolSnap.data() as TradePool;

  // Refund participants if pool is WAITING or ACTIVE and has participants
  if ((pool.status === "WAITING" || pool.status === "ACTIVE") && Object.keys(pool.participants || {}).length > 0) {
    try {
      await refundTradePool(poolId, true);
    } catch (refundErr) {
      console.warn("Notice: refund failed during pool deletion, proceeding with forced deletion:", refundErr);
    }
  }

  // Delete the document from Firestore permanently
  await deleteDoc(poolRef);
}

/**
 * Settles an ACTIVE trade pool.
 * Distributes proportional profit or loss.
 * Deducts lockedBalance and returns payout (principal + profit/loss share) to availableBalance.
 * Handles double credit avoidance securely.
 */
export async function completeActiveTrade(
  poolId: string,
  profitOrLoss: number
): Promise<void> {
  const poolRef = doc(db, "trade_pools", poolId);

  await runTransaction(db, async (transaction) => {
    const poolSnap = await transaction.get(poolRef);
    if (!poolSnap.exists()) {
      throw new Error("Trade pool not found");
    }
    const pool = poolSnap.data() as TradePool;

    if (pool.status !== "ACTIVE" && pool.status !== "WAITING") {
      throw new Error(`Only ACTIVE or WAITING trades can be completed. Pool state is ${pool.status}`);
    }

    const participantIds = Object.keys(pool.participants || {});

    // Step 1: Execute ALL reads first
    const participantEntries = [];
    for (const userId of participantIds) {
      const p = pool.participants?.[userId];
      if (!p) continue;
      const userRef = doc(db, "users", userId);
      const userSnap = await transaction.get(userRef);
      participantEntries.push({ userId, p, userRef, userSnap });
    }

    const payouts: Record<string, number> = {};

    // Determine total base amount for proportional split
    const totalBase = pool.totalCollected > 0 ? pool.totalCollected : (pool.targetAmount || 1);

    // Step 2: Execute ALL writes after reads
    for (const { userId, p, userRef, userSnap } of participantEntries) {
      if (userSnap.exists()) {
        const user = userSnap.data() as UserProfile;

        // Proportional split calculation
        let userProfitLoss = 0;
        let totalPayout = 0;

        if (pool.isFreePool) {
          if (profitOrLoss >= 0) {
            userProfitLoss = pool.freeRewardAmount || 10;
            totalPayout = userProfitLoss;
          } else {
            userProfitLoss = 0;
            totalPayout = 0;
          }
        } else {
          const shareFraction = p.amount / totalBase;
          userProfitLoss = shareFraction * profitOrLoss;
          totalPayout = p.amount + userProfitLoss; // Return original principal + share
        }

        payouts[userId] = totalPayout;

        // Deduct principal from locked, credit total payout to available
        const userLocked = user.lockedBalance || 0;
        const userAvail = user.availableBalance || 0;
        const deductLocked = pool.isFreePool ? 0 : Math.min(userLocked, p.amount);
        const nextAvailable = userAvail + totalPayout;
        const nextLocked = Math.max(0, userLocked - deductLocked);
        const nextTotal = nextAvailable + nextLocked;

        const walletTxId = "tx_settle_" + Date.now() + "_" + Math.floor(Math.random() * 1000) + "_" + userId;
        const walletTxRef = doc(db, "wallet_transactions", walletTxId);
        
        const isWinning = profitOrLoss >= 0;
        const walletTx: WalletTransaction = {
          id: walletTxId,
          userId,
          userEmail: user.email || "user@example.com",
          userName: user.name || user.email?.split("@")[0] || "Trader",
          type: pool.isFreePool 
            ? (isWinning ? "BONUS" : "TRADE_LOSS")
            : (isWinning ? "TRADE_PROFIT" : "TRADE_LOSS"),
          amount: pool.isFreePool 
            ? (isWinning ? (pool.freeRewardAmount || 10) : 0)
            : Math.abs(userProfitLoss),
          status: "APPROVED",
          createdAt: new Date().toISOString(),
          balanceBefore: userAvail,
          balanceAfter: nextAvailable,
          referenceId: poolId,
          txDetails: pool.isFreePool 
            ? (isWinning ? `Free Pool Win Bonus (+₹${pool.freeRewardAmount || 10})` : "Free Pool Expired (Loss - ₹0)")
            : ""
        };

        transaction.set(walletTxRef, walletTx);
        transaction.update(userRef, {
          availableBalance: nextAvailable,
          lockedBalance: nextLocked,
          balance: nextTotal
        });
      }
    }

    const outcome: TradeOutcome = {
      profitOrLoss,
      isProfit: profitOrLoss >= 0,
      percentageChange: pool.isFreePool 
        ? (profitOrLoss >= 0 ? 100 : -100)
        : ((profitOrLoss / totalBase) * 100),
      payouts,
      completedAt: new Date().toISOString()
    };

    transaction.update(poolRef, {
      status: "COMPLETED",
      outcome
    });
  });
}

/**
 * Create a Deposit or Withdrawal Request (pending Admin approval)
 */
export async function createWalletRequest(
  userId: string,
  type: "DEPOSIT" | "WITHDRAWAL",
  amount: number,
  txDetails?: string,
  withdrawalData?: Record<string, string>
): Promise<string> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("⚠️ Internet Disconnected: Cannot submit transaction request while offline. Please check your internet connection.");
  }
  const txId = "tx_req_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
  const txRef = doc(db, "wallet_transactions", txId);

  await runTransaction(db, async (transaction) => {
    const userRef = doc(db, "users", userId);
    const userSnap = await transaction.get(userRef);

    if (!userSnap.exists()) {
      throw new Error("User profile not found");
    }
    const user = userSnap.data() as UserProfile;

    if (!isUserMobileVerified(user)) {
      throw new Error(`Mobile Verification Required! ${type} requests are locked until your mobile number is verified with a 6-digit PIN. Please verify in Profile Settings.`);
    }

    // Fetch active global limits
    const paymentRef = doc(db, "app_settings", "payment_details");
    const paymentSnap = await transaction.get(paymentRef);
    let globalLimits = DEFAULT_WALLET_LIMITS;
    if (paymentSnap.exists()) {
      const data = paymentSnap.data();
      globalLimits = {
        minDeposit: typeof data.minDeposit === "number" ? data.minDeposit : DEFAULT_WALLET_LIMITS.minDeposit,
        maxDeposit: typeof data.maxDeposit === "number" ? data.maxDeposit : DEFAULT_WALLET_LIMITS.maxDeposit,
        maxDepositPerDay: typeof data.maxDepositPerDay === "number" ? data.maxDepositPerDay : DEFAULT_WALLET_LIMITS.maxDepositPerDay,
        maxDepositPerMonth: typeof data.maxDepositPerMonth === "number" ? data.maxDepositPerMonth : DEFAULT_WALLET_LIMITS.maxDepositPerMonth,
        depositsEnabled: typeof data.depositsEnabled === "boolean" ? data.depositsEnabled : DEFAULT_WALLET_LIMITS.depositsEnabled,

        minWithdrawal: typeof data.minWithdrawal === "number" ? data.minWithdrawal : DEFAULT_WALLET_LIMITS.minWithdrawal,
        maxWithdrawal: typeof data.maxWithdrawal === "number" ? data.maxWithdrawal : DEFAULT_WALLET_LIMITS.maxWithdrawal,
        maxWithdrawalPerDay: typeof data.maxWithdrawalPerDay === "number" ? data.maxWithdrawalPerDay : DEFAULT_WALLET_LIMITS.maxWithdrawalPerDay,
        maxWithdrawalPerMonth: typeof data.maxWithdrawalPerMonth === "number" ? data.maxWithdrawalPerMonth : DEFAULT_WALLET_LIMITS.maxWithdrawalPerMonth,
        withdrawalsEnabled: typeof data.withdrawalsEnabled === "boolean" ? data.withdrawalsEnabled : DEFAULT_WALLET_LIMITS.withdrawalsEnabled,
      };
    }

    // Fetch user's existing transactions to validate daily and monthly caps
    const txsRef = collection(db, "wallet_transactions");
    const q = query(txsRef, where("userId", "==", userId));
    const txsSnap = await getDocs(q);
    const userTransactions: WalletTransaction[] = [];
    txsSnap.forEach((docSnap) => {
      userTransactions.push(docSnap.data() as WalletTransaction);
    });

    // Validate atomic limits
    const limitValidation = validateTransactionLimits(userId, type, amount, user, globalLimits, userTransactions);
    if (!limitValidation.valid) {
      throw new Error(limitValidation.error || `Transaction rejected due to limit rules.`);
    }

    const userAvail = user.availableBalance ?? user.balance ?? 0;
    if (type === "WITHDRAWAL" && userAvail < amount) {
      throw new Error(`Insufficient Available Balance! You can only withdraw up to ₹${userAvail.toFixed(2)}.`);
    }

    const newTx: WalletTransaction = {
      id: txId,
      userId,
      userEmail: user.email || "user@example.com",
      userName: user.name || user.email?.split("@")[0] || "Trader",
      type,
      amount,
      status: "PENDING",
      createdAt: new Date().toISOString(),
      balanceBefore: user.availableBalance,
      balanceAfter: user.availableBalance, // stays same until approved
      txDetails: txDetails || "",
      ...(withdrawalData ? { withdrawalData } : {})
    };

    transaction.set(txRef, newTx);
  });

  return txId;
}

/**
 * Update/Correct a Wallet Transaction's Status (Supports correcting mistaken approvals/rejections)
 */
export async function updateWalletRequestStatus(
  txId: string,
  newStatus: "APPROVED" | "REJECTED" | "PENDING"
): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("⚠️ Internet Disconnected: Cannot update transaction status while offline.");
  }
  const txRef = doc(db, "wallet_transactions", txId);

  await runTransaction(db, async (transaction) => {
    const txSnap = await transaction.get(txRef);
    if (!txSnap.exists()) {
      throw new Error("Transaction request not found.");
    }
    const tx = txSnap.data() as WalletTransaction;
    const oldStatus = tx.status;

    if (oldStatus === newStatus) {
      return; // Already in target status
    }

    const userRef = doc(db, "users", tx.userId);
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) {
      throw new Error("User profile not found.");
    }
    const user = userSnap.data() as UserProfile;

    let balanceDelta = 0;

    // 1. Undo balance impact if old status was APPROVED
    if (oldStatus === "APPROVED") {
      if (tx.type === "DEPOSIT" || tx.type === "BONUS" || tx.type === "TRADE_PROFIT" || tx.type === "TRADE_REFUND") {
        balanceDelta -= tx.amount;
      } else if (tx.type === "WITHDRAWAL" || tx.type === "TRADE_INVEST" || tx.type === "TRADE_LOSS") {
        balanceDelta += tx.amount;
      } else if (tx.type === "ADJUSTMENT") {
        balanceDelta -= tx.amount;
      }
    }

    // 2. Apply balance impact if new status is APPROVED
    if (newStatus === "APPROVED") {
      if (tx.type === "DEPOSIT" || tx.type === "BONUS" || tx.type === "TRADE_PROFIT" || tx.type === "TRADE_REFUND") {
        balanceDelta += tx.amount;
      } else if (tx.type === "WITHDRAWAL" || tx.type === "TRADE_INVEST" || tx.type === "TRADE_LOSS") {
        const currAvail = user.availableBalance ?? user.balance ?? 0;
        if ((currAvail + balanceDelta) < tx.amount) {
          throw new Error(`Insufficient available balance (₹${currAvail.toFixed(2)}) to approve this withdrawal request of ₹${tx.amount.toFixed(2)}.`);
        }
        balanceDelta -= tx.amount;
      } else if (tx.type === "ADJUSTMENT") {
        balanceDelta += tx.amount;
      }
    }

    const nextAvailable = Math.max(0, user.availableBalance + balanceDelta);

    transaction.update(txRef, {
      status: newStatus,
      balanceBefore: user.availableBalance,
      balanceAfter: nextAvailable,
      updatedAt: new Date().toISOString()
    });

    transaction.update(userRef, {
      availableBalance: nextAvailable,
      balance: nextAvailable
    });
  });
}

/**
 * Approve a Wallet Request (Deposit or Withdrawal)
 */
export async function approveWalletRequest(txId: string): Promise<void> {
  return updateWalletRequestStatus(txId, "APPROVED");
}

/**
 * Reject a Wallet Request
 */
export async function rejectWalletRequest(txId: string): Promise<void> {
  return updateWalletRequestStatus(txId, "REJECTED");
}

/**
 * Automatically checks and rejects any PENDING withdrawal requests for a user
 * if their current available balance drops below the requested withdrawal amount (e.g. after placing trades).
 */
export async function autoRejectInsufficientWithdrawals(
  userId: string,
  currentAvailableBalance: number
): Promise<{ autoRejectedCount: number; rejectedAmounts: number[] }> {
  const rejectedAmounts: number[] = [];
  try {
    const txsRef = collection(db, "wallet_transactions");
    const q = query(
      txsRef,
      where("userId", "==", userId),
      where("type", "==", "WITHDRAWAL"),
      where("status", "==", "PENDING")
    );
    const snap = await getDocs(q);

    for (const docSnap of snap.docs) {
      const tx = docSnap.data() as WalletTransaction;
      if (currentAvailableBalance < tx.amount) {
        await updateDoc(doc(db, "wallet_transactions", tx.id), {
          status: "REJECTED",
          rejectionReason: `Auto-rejected: Insufficient available balance after trading (Current balance: ₹${currentAvailableBalance.toFixed(2)}, Requested: ₹${tx.amount.toFixed(2)})`,
          txDetails: `[Auto-Rejected] Balance dropped below withdrawal amount due to active trading (Available: ₹${currentAvailableBalance.toFixed(2)} < Requested: ₹${tx.amount.toFixed(2)})`
        });
        rejectedAmounts.push(tx.amount);
        console.log(`[Auto-Reject Withdrawal] Request ${tx.id} for user ${userId} auto-rejected. Current balance ₹${currentAvailableBalance.toFixed(2)} < Requested ₹${tx.amount.toFixed(2)}`);
      }
    }
  } catch (err) {
    console.warn("[Auto-Reject Withdrawal Warning]:", err);
  }
  return { autoRejectedCount: rejectedAmounts.length, rejectedAmounts };
}

/**
 * Reset balances helper
 */
export async function resetAllUsers(): Promise<void> {
  for (const defaultUser of DEFAULT_USERS) {
    const userRef = doc(db, "users", defaultUser.id);
    await setDoc(userRef, defaultUser);
  }
}

/**
 * Admin utility to adjust a user's balance directly (adding a BONUS or ADJUSTMENT)
 */
export async function adjustUserBalance(
  userId: string,
  amount: number,
  type: "BONUS" | "ADJUSTMENT",
  reason: string = ""
): Promise<void> {
  const userRef = doc(db, "users", userId);
  const txId = "tx_adj_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
  const txRef = doc(db, "wallet_transactions", txId);

  await runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) {
      throw new Error("User profile not found.");
    }
    const user = userSnap.data() as UserProfile;

    const nextAvailable = user.availableBalance + amount;
    if (nextAvailable < 0) {
      throw new Error("Cannot deduct more than the user's current available balance!");
    }
    const nextTotal = nextAvailable + user.lockedBalance;

    const walletTx: WalletTransaction = {
      id: txId,
      userId,
      userEmail: user.email || "user@example.com",
      userName: user.name || user.email?.split("@")[0] || "Trader",
      type,
      amount: Math.abs(amount),
      status: "APPROVED",
      createdAt: new Date().toISOString(),
      balanceBefore: user.availableBalance,
      balanceAfter: nextAvailable,
      txDetails: reason || (amount >= 0 ? `Admin balance increase` : `Admin balance reduction`)
    };

    transaction.set(txRef, walletTx);
    transaction.update(userRef, {
      availableBalance: nextAvailable,
      balance: nextAvailable
    });
  });
}

/**
 * Update User Name, Email, and Phone Profile Details
 */
export async function updateUserProfileDetails(
  userId: string,
  name: string,
  email: string,
  phone?: string,
  mobileVerified?: boolean
): Promise<void> {
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = phone ? phone.trim() : "";

  if (!cleanName || !cleanEmail) {
    throw new Error("Name and Email address cannot be empty.");
  }

  // Check if another account with this email address exists
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", cleanEmail));
  const snap = await getDocs(q);

  let duplicateFound = false;
  snap.forEach((docSnap) => {
    if (docSnap.id !== userId) {
      duplicateFound = true;
    }
  });

  if (duplicateFound) {
    throw new Error(`Email "${cleanEmail}" is already registered to another account. One email can only have one account. (एक ई-मेल से केवल एक ही अकाउंट हो सकता है)`);
  }

  // Check if another account with this mobile number exists
  if (cleanPhone) {
    const normPhone = normalizePhoneDigits(cleanPhone);
    if (normPhone) {
      const allUsersSnap = await getDocs(usersRef);
      let duplicatePhoneUser = "";

      allUsersSnap.forEach((docSnap) => {
        if (docSnap.id !== userId) {
          const data = docSnap.data();
          if (data.phone && normalizePhoneDigits(data.phone) === normPhone) {
            duplicatePhoneUser = data.name || data.email;
          }
        }
      });

      if (duplicatePhoneUser) {
        throw new Error(`Mobile number "${cleanPhone}" is already registered to another account (${duplicatePhoneUser}). One mobile number can only be used for one account. (एक मोबाइल नंबर से केवल एक ही अकाउंट हो सकता है)`);
      }
    }
  }

  const userRef = doc(db, "users", userId);
  const updateData: any = {
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone
  };

  if (typeof mobileVerified === "boolean") {
    updateData.mobileVerified = mobileVerified;
    updateData.verificationStatus = mobileVerified ? "approved" : "pending";
    if (mobileVerified) {
      updateData.verificationPin = null;
      updateData.pinExpiresAt = null;
      updateData.pinAttempts = 0;
    }
  }

  await setDoc(userRef, updateData, { merge: true });
}

/**
 * Helper to test fuzzy / exact name matching between PAN/Aadhaar name and Bank Holder Name
 */
export function checkNameMatch(name1?: string, name2?: string): boolean {
  if (!name1 || !name2) return false;
  const n1 = name1.trim().toLowerCase().replace(/[^a-z0-9]/g, " ");
  const n2 = name2.trim().toLowerCase().replace(/[^a-z0-9]/g, " ");
  if (n1 === n2) return true;

  const tokens1 = n1.split(/\s+/).filter((t) => t.length > 0);
  const tokens2 = n2.split(/\s+/).filter((t) => t.length > 0);
  if (tokens1.length === 0 || tokens2.length === 0) return false;

  // Count shared tokens
  const shared = tokens1.filter((t) => tokens2.includes(t));
  const minLength = Math.min(tokens1.length, tokens2.length);
  return shared.length >= Math.max(1, minLength);
}

/**
 * Submit or update user PAN / Aadhaar Card KYC & Bank Account details
 */
export async function submitUserKycAndBankDetails(
  userId: string,
  userProfileName: string,
  data: {
    panNumber?: string;
    aadhaarNumber?: string;
    kycDocType: "PAN" | "AADHAAR" | "BOTH";
    kycHolderName: string;
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    customFields?: { id: string; label: string; value: string }[];
  }
): Promise<{ nameMatched: boolean; isVerified: boolean }> {
  const cleanPan = data.panNumber ? data.panNumber.trim().toUpperCase() : "";
  const cleanAadhaar = data.aadhaarNumber ? data.aadhaarNumber.replace(/\D/g, "") : "";
  const cleanDocType = data.kycDocType || "PAN";
  const cleanKycHolder = data.kycHolderName.trim();
  const cleanBankHolder = data.accountHolderName.trim();
  const cleanBankName = data.bankName.trim();
  const cleanAccountNum = data.accountNumber.trim();
  const cleanIfsc = data.ifscCode.trim().toUpperCase();

  if (cleanDocType === "PAN" && (!cleanPan || cleanPan.length !== 10)) {
    throw new Error("Please enter a valid 10-character PAN Card number (e.g., ABCDE1234F).");
  }
  if (cleanDocType === "AADHAAR" && (!cleanAadhaar || cleanAadhaar.length !== 12)) {
    throw new Error("Please enter a valid 12-digit Aadhaar Card number.");
  }
  if (cleanDocType === "BOTH") {
    if (!cleanPan || cleanPan.length !== 10) {
      throw new Error("Please enter a valid 10-character PAN Card number.");
    }
    if (!cleanAadhaar || cleanAadhaar.length !== 12) {
      throw new Error("Please enter a valid 12-digit Aadhaar Card number.");
    }
  }

  if (!cleanKycHolder) {
    throw new Error("Please enter the Full Name as printed on your PAN / Aadhaar Card.");
  }
  if (!cleanBankHolder || !cleanBankName || !cleanAccountNum || !cleanIfsc) {
    throw new Error("Please fill out all bank account details (Holder Name, Bank Name, Account Number, IFSC Code).");
  }

  // Name match logic: check if Bank Account Holder Name matches PAN/Aadhaar Holder Name OR User Profile Name
  const matchedWithKyc = checkNameMatch(cleanBankHolder, cleanKycHolder);
  const matchedWithProfile = checkNameMatch(cleanBankHolder, userProfileName);
  const nameMatched = matchedWithKyc || matchedWithProfile;

  const userRef = doc(db, "users", userId);
  const updatePayload: any = {
    panNumber: cleanPan,
    aadhaarNumber: cleanAadhaar,
    kycDocType: cleanDocType,
    kycHolderName: cleanKycHolder,
    kycStatus: nameMatched ? "verified" : "pending",
    savedBankDetails: {
      accountHolderName: cleanBankHolder,
      bankName: cleanBankName,
      accountNumber: cleanAccountNum,
      ifscCode: cleanIfsc,
      isVerified: nameMatched,
      addedAt: new Date().toISOString(),
      nameMatched,
      customFields: data.customFields || []
    }
  };

  await setDoc(userRef, updatePayload, { merge: true });

  return { nameMatched, isVerified: nameMatched };
}

/**
 * Admin function to update/approve user KYC & Saved Bank Account details
 */
export async function adminUpdateUserKycAndBank(
  userId: string,
  data: {
    panNumber?: string;
    aadhaarNumber?: string;
    kycDocType?: "PAN" | "AADHAAR" | "BOTH";
    kycHolderName?: string;
    kycStatus?: "unverified" | "pending" | "verified" | "rejected";
    kycRejectReason?: string;
    savedBankDetails?: {
      accountHolderName: string;
      bankName: string;
      accountNumber: string;
      ifscCode: string;
      isVerified?: boolean;
      customFields?: { id: string; label: string; value: string }[];
    };
  }
): Promise<void> {
  const userRef = doc(db, "users", userId);
  const updateData: any = {};

  if (data.panNumber !== undefined) updateData.panNumber = data.panNumber.trim().toUpperCase();
  if (data.aadhaarNumber !== undefined) updateData.aadhaarNumber = data.aadhaarNumber.replace(/\D/g, "");
  if (data.kycDocType !== undefined) updateData.kycDocType = data.kycDocType;
  if (data.kycHolderName !== undefined) updateData.kycHolderName = data.kycHolderName.trim();
  if (data.kycStatus !== undefined) updateData.kycStatus = data.kycStatus;
  if (data.kycRejectReason !== undefined) updateData.kycRejectReason = data.kycRejectReason;

  if (data.savedBankDetails) {
    const isVer = data.savedBankDetails.isVerified ?? (data.kycStatus === "verified");
    updateData.savedBankDetails = {
      accountHolderName: data.savedBankDetails.accountHolderName.trim(),
      bankName: data.savedBankDetails.bankName.trim(),
      accountNumber: data.savedBankDetails.accountNumber.trim(),
      ifscCode: data.savedBankDetails.ifscCode.trim().toUpperCase(),
      isVerified: isVer,
      addedAt: new Date().toISOString(),
      nameMatched: true,
      customFields: data.savedBankDetails.customFields || []
    };
  } else if (data.kycStatus === "verified") {
    // If Admin approves KYC, also mark existing bank details as verified
    const snap = await getDoc(userRef);
    if (snap.exists() && snap.data().savedBankDetails) {
      updateData["savedBankDetails.isVerified"] = true;
      updateData["savedBankDetails.nameMatched"] = true;
    }
  } else if (data.kycStatus === "pending" || data.kycStatus === "rejected") {
    // If Admin resets KYC to pending or rejected, also mark existing bank details as unverified
    const snap = await getDoc(userRef);
    if (snap.exists() && snap.data().savedBankDetails) {
      updateData["savedBankDetails.isVerified"] = false;
    }
  }

  await setDoc(userRef, updateData, { merge: true });
}

/**
 * Send a new Support / Help Message to Admin
 */
export async function createSupportMessage(
  userId: string,
  userEmail: string,
  userName: string,
  subject: string,
  message: string
): Promise<string> {
  const cleanMsg = message.trim();
  const cleanSub = subject.trim() || "General Query";

  if (!cleanMsg) {
    throw new Error("Message text cannot be empty.");
  }

  const now = new Date().toISOString();
  const msgId = "msg_" + Date.now();
  const msgRef = doc(db, "support_messages", msgId);

  const initialThreadItem: SupportThreadMessage = {
    id: "th_u_" + Date.now(),
    sender: "USER",
    senderName: userName || userEmail?.split("@")[0] || "User",
    text: cleanMsg,
    timestamp: now
  };

  const newMsg: SupportMessage = {
    id: msgId,
    userId,
    userEmail: userEmail || "user@example.com",
    userName: userName || userEmail?.split("@")[0] || "User",
    subject: cleanSub,
    message: cleanMsg,
    status: "OPEN",
    createdAt: now,
    updatedAt: now,
    thread: [initialThreadItem]
  };

  await setDoc(msgRef, newMsg);
  return msgId;
}

/**
 * User sends a follow-up reply in an existing support ticket thread
 */
export async function sendUserSupportReply(
  messageId: string,
  replyText: string,
  userName: string
): Promise<void> {
  const cleanReply = replyText.trim();
  if (!cleanReply) {
    throw new Error("Reply text cannot be empty.");
  }

  const msgRef = doc(db, "support_messages", messageId);
  const snap = await getDoc(msgRef);
  const now = new Date().toISOString();

  let existingThread: SupportThreadMessage[] = [];
  if (snap.exists()) {
    const data = snap.data() as SupportMessage;
    existingThread = data.thread ? [...data.thread] : [];
    if (existingThread.length === 0) {
      existingThread.push({
        id: "th_u_init_" + Date.now(),
        sender: "USER",
        senderName: data.userName || "User",
        text: data.message,
        timestamp: data.createdAt
      });
      if (data.adminReply) {
        existingThread.push({
          id: "th_a_init_" + Date.now(),
          sender: "ADMIN",
          senderName: "Support Admin",
          text: data.adminReply,
          timestamp: data.repliedAt || data.createdAt
        });
      }
    }
  }

  existingThread.push({
    id: "th_u_" + Date.now(),
    sender: "USER",
    senderName: userName || "User",
    text: cleanReply,
    timestamp: now
  });

  await setDoc(
    msgRef,
    {
      thread: existingThread,
      status: "OPEN", // Re-open ticket so Admin is notified
      updatedAt: now
    },
    { merge: true }
  );
}

/**
 * Admin Reply to a Support Message
 */
export async function replyToSupportMessage(
  messageId: string,
  adminReply: string,
  markResolved: boolean = true
): Promise<void> {
  const cleanReply = adminReply.trim();
  if (!cleanReply) {
    throw new Error("Reply message cannot be empty.");
  }

  const now = new Date().toISOString();
  const msgRef = doc(db, "support_messages", messageId);
  const snap = await getDoc(msgRef);

  let existingThread: SupportThreadMessage[] = [];
  if (snap.exists()) {
    const data = snap.data() as SupportMessage;
    existingThread = data.thread ? [...data.thread] : [];
    if (existingThread.length === 0) {
      existingThread.push({
        id: "th_u_init_" + Date.now(),
        sender: "USER",
        senderName: data.userName || "User",
        text: data.message,
        timestamp: data.createdAt
      });
    }
  }

  existingThread.push({
    id: "th_a_" + Date.now(),
    sender: "ADMIN",
    senderName: "Support Admin",
    text: cleanReply,
    timestamp: now
  });

  await setDoc(
    msgRef,
    {
      adminReply: cleanReply,
      repliedAt: now,
      updatedAt: now,
      status: markResolved ? "RESOLVED" : "OPEN",
      thread: existingThread
    },
    { merge: true }
  );
}

/**
 * Send a Direct Message from Admin to a specific User
 */
export async function sendAdminDirectMessage(
  userId: string,
  userEmail: string,
  userName: string,
  subject: string,
  message: string
): Promise<string> {
  const cleanMsg = message.trim();
  const cleanSub = subject.trim() || "Message from Admin";

  if (!cleanMsg) {
    throw new Error("Message content cannot be empty.");
  }

  const msgId = "admin_msg_" + Date.now();
  const msgRef = doc(db, "support_messages", msgId);

  const newMsg: SupportMessage = {
    id: msgId,
    userId,
    userEmail: userEmail || "user@example.com",
    userName: userName || userEmail?.split("@")[0] || "User",
    subject: "📩 " + cleanSub,
    message: "Admin Announcement / Notice",
    adminReply: cleanMsg,
    repliedAt: new Date().toISOString(),
    status: "RESOLVED",
    createdAt: new Date().toISOString()
  };

  await setDoc(msgRef, newMsg);
  return msgId;
}

/**
 * Delete a Support Message (Admin cleanup)
 */
export async function deleteSupportMessage(messageId: string): Promise<void> {
  const msgRef = doc(db, "support_messages", messageId);
  await setDoc(msgRef, { status: "RESOLVED", deleted: true }, { merge: true });
}

/**
 * Password Strength Validation for Admin Login
 */
export function validatePasswordStrength(password: string): { isValid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { isValid: false, message: "Password must be at least 8 characters long." };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one uppercase letter (A-Z)." };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one lowercase letter (a-z)." };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one number (0-9)." };
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one special character (!@#$%^&*)." };
  }
  return { isValid: true };
}

/**
 * 6-Digit Admin Security PIN Format Validation
 */
export function validateSecurityPinFormat(pin: string): { isValid: boolean; message?: string } {
  if (!pin || !/^\d{6}$/.test(pin.trim())) {
    return { isValid: false, message: "Admin Security PIN must be exactly 6 numeric digits (e.g. 123456)." };
  }
  return { isValid: true };
}

/**
 * Write a record to the Admin Audit Log
 */
export async function logAdminAction(
  actionType: string,
  details: string,
  status: "SUCCESS" | "FAILED" | "BLOCKED" = "SUCCESS",
  targetUserOrId?: string,
  amount?: number
): Promise<void> {
  try {
    const logsRef = collection(db, "admin_audit_logs");
    const logId = "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "Browser Terminal";
    const screenRes = typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "";
    const deviceInfo = `${userAgent} [Screen: ${screenRes}]`;

    const logData: AdminAuditLog = {
      id: logId,
      actionType,
      adminEmail: "amaizy1@gmail.com",
      details,
      targetUserOrId: targetUserOrId || "",
      amount: amount || 0,
      status,
      timestamp: new Date().toISOString(),
      deviceInfo,
      ipAddress: "127.0.0.1 (Cloud Sandbox)"
    };

    await setDoc(doc(logsRef, logId), logData);
  } catch (err) {
    console.warn("Failed to log admin action notice:", err);
  }
}

/**
 * Subscribe to Admin Audit Logs in Firestore
 */
export function subscribeAdminAuditLogs(callback: (logs: AdminAuditLog[]) => void) {
  const logsRef = collection(db, "admin_audit_logs");
  const q = query(logsRef, orderBy("timestamp", "desc"), limit(100));
  return onSnapshot(q, (snapshot) => {
    const logs: AdminAuditLog[] = [];
    snapshot.forEach((docSnap) => {
      logs.push(docSnap.data() as AdminAuditLog);
    });
    callback(logs);
  }, (err) => {
    console.warn("Notice subscribing to admin audit logs:", err);
    callback([]);
  });
}

/**
 * Subscribe to Admin Auth State (for single active session and lockout tracking)
 */
export function subscribeAdminAuthState(callback: (state: AdminAuthState) => void) {
  const authRef = doc(db, "app_settings", "admin_auth_state");
  const defaultPassHash = bcrypt.hashSync("Admin@1234", 10);
  const defaultPinHash = bcrypt.hashSync("123456", 10);
  const fallbackState: AdminAuthState = {
    passwordHash: defaultPassHash,
    pinHash: defaultPinHash,
    failedAttempts: 0,
    lockedUntil: null,
    activeSessionToken: null,
    activeSessionDevice: null,
    lastLoginAt: null,
    lastActivityAt: null
  };

  return onSnapshot(authRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as AdminAuthState);
    } else {
      setDoc(authRef, fallbackState, { merge: true }).catch(() => {});
      callback(fallbackState);
    }
  }, (err) => {
    console.warn("Notice subscribing to admin auth state:", err);
    callback(fallbackState);
  });
}

/**
 * Secure Admin Login with bcrypt password verification, 5-failed attempt tracking, and 30-min lockout
 */
export async function loginAdminWithPassword(passwordInput: string): Promise<{
  success: boolean;
  sessionToken: string;
  message?: string;
}> {
  const cleanInput = passwordInput.trim();
  if (!cleanInput) {
    throw new Error("Please enter your Admin Password.");
  }

  const authRef = doc(db, "app_settings", "admin_auth_state");
  const defaultPassHash = bcrypt.hashSync("Admin@1234", 10);
  const defaultPinHash = bcrypt.hashSync("123456", 10);

  let state: AdminAuthState;
  try {
    const authSnap = await getDoc(authRef);
    if (!authSnap.exists()) {
      state = {
        passwordHash: defaultPassHash,
        pinHash: defaultPinHash,
        failedAttempts: 0,
        lockedUntil: null,
        activeSessionToken: null,
        activeSessionDevice: null,
        lastLoginAt: null,
        lastActivityAt: null
      };
      await setDoc(authRef, state).catch(() => {});
    } else {
      state = authSnap.data() as AdminAuthState;
      if (!state.passwordHash) state.passwordHash = defaultPassHash;
      if (!state.pinHash) state.pinHash = defaultPinHash;
    }
  } catch (err) {
    console.warn("Firestore auth state read notice (quota limit fallback):", err);
    state = {
      passwordHash: defaultPassHash,
      pinHash: defaultPinHash,
      failedAttempts: 0,
      lockedUntil: null,
      activeSessionToken: null,
      activeSessionDevice: null,
      lastLoginAt: null,
      lastActivityAt: null
    };
  }

  // 1. Check account lockout (30 minutes lockout after 5 failed attempts)
  if (state.lockedUntil) {
    const lockTime = new Date(state.lockedUntil).getTime();
    const now = Date.now();
    if (now < lockTime) {
      const remainingMs = lockTime - now;
      const remainingMins = Math.ceil(remainingMs / 60000);
      
      await logAdminAction(
        "ADMIN_LOGIN_BLOCKED",
        `Attempted login during 30-min account lockout. Time remaining: ${remainingMins} min(s).`,
        "BLOCKED"
      );

      throw new Error(`⛔ Admin account is LOCKED due to 5 failed login attempts. Please try again in ${remainingMins} minute(s).`);
    } else {
      // Lock period expired, clear lockout
      state.lockedUntil = null;
      state.failedAttempts = 0;
    }
  }

  // 2. Verify password with bcrypt
  let isMatch = false;
  if (state.passwordHash) {
    isMatch = bcrypt.compareSync(cleanInput, state.passwordHash);
  }

  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "Browser Device";

  if (!isMatch) {
    const newFailedCount = (state.failedAttempts || 0) + 1;

    if (newFailedCount >= 5) {
      const lockUntilISO = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      await setDoc(authRef, {
        failedAttempts: 0,
        lockedUntil: lockUntilISO
      }, { merge: true });

      await logAdminAction(
        "ADMIN_ACCOUNT_LOCKED",
        "5 failed login attempts reached. Admin account locked for 30 minutes.",
        "BLOCKED"
      );

      throw new Error("⛔ 5 failed login attempts reached! Admin account is locked for 30 minutes.");
    } else {
      const remaining = 5 - newFailedCount;
      await setDoc(authRef, {
        failedAttempts: newFailedCount
      }, { merge: true });

      await logAdminAction(
        "ADMIN_LOGIN_FAILED",
        `Invalid password attempt (${newFailedCount}/5).`,
        "FAILED"
      );

      throw new Error(`❌ Invalid Admin Password! ${remaining} attempt(s) remaining before 30-minute account lockout.`);
    }
  }

  // 3. Login success -> reset failed attempts and generate single active session token
  const newSessionToken = "sess_admin_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
  const nowISO = new Date().toISOString();

  await setDoc(authRef, {
    passwordHash: state.passwordHash,
    pinHash: state.pinHash,
    failedAttempts: 0,
    lockedUntil: null,
    activeSessionToken: newSessionToken,
    activeSessionDevice: userAgent,
    lastLoginAt: nowISO,
    lastActivityAt: nowISO
  }, { merge: true });

  await logAdminAction(
    "ADMIN_LOGIN_SUCCESS",
    `Admin authenticated successfully. Active Session Token generated.`,
    "SUCCESS"
  );

  return {
    success: true,
    sessionToken: newSessionToken
  };
}

/**
 * Verify 6-digit Admin Security PIN for sensitive operations (deposit/withdrawal approval, user verification, pool creation, etc.)
 */
export async function verifyAdminSecurityPin(pinInput: string): Promise<boolean> {
  const cleanPin = pinInput.trim();
  if (!cleanPin) {
    throw new Error("Admin 6-digit Security PIN is required.");
  }

  const authRef = doc(db, "app_settings", "admin_auth_state");
  const authSnap = await getDoc(authRef);

  let pinHash = "";
  if (authSnap.exists() && authSnap.data().pinHash) {
    pinHash = authSnap.data().pinHash;
  } else {
    pinHash = bcrypt.hashSync("123456", 10);
    await setDoc(authRef, { pinHash }, { merge: true });
  }

  let isMatch = bcrypt.compareSync(cleanPin, pinHash);

  if (!isMatch) {
    await logAdminAction(
      "SECURITY_PIN_FAILED",
      "Invalid 6-digit Security PIN entered for sensitive action.",
      "FAILED"
    );
    return false;
  }

  return true;
}

/**
 * Update Admin Password & 6-Digit Security PIN (stored as bcrypt hashes)
 */
export async function updateAdminPasswordAndPin(
  currentPin: string,
  currentPassword?: string,
  newPassword?: string,
  newPin?: string
): Promise<void> {
  // 1. Verify 6-digit PIN
  const pinValid = await verifyAdminSecurityPin(currentPin);
  if (!pinValid) {
    throw new Error("Current 6-digit Admin Security PIN is incorrect.");
  }

  // 2. Verify current password if changing password or if currentPassword is supplied
  if (newPassword && newPassword.trim()) {
    if (!currentPassword || !currentPassword.trim()) {
      throw new Error("Current Admin Password is required when updating your Password.");
    }
    const authRef = doc(db, "app_settings", "admin_auth_state");
    const authSnap = await getDoc(authRef);
    let passHash = authSnap.exists() && authSnap.data().passwordHash
      ? authSnap.data().passwordHash
      : bcrypt.hashSync("Admin@1234", 10);

    let isPassValid = bcrypt.compareSync(currentPassword.trim(), passHash);
    if (!isPassValid) {
      throw new Error("Current Admin Password is incorrect.");
    }
  } else if (currentPassword && currentPassword.trim()) {
    const authRef = doc(db, "app_settings", "admin_auth_state");
    const authSnap = await getDoc(authRef);
    let passHash = authSnap.exists() && authSnap.data().passwordHash
      ? authSnap.data().passwordHash
      : bcrypt.hashSync("Admin@1234", 10);

    let isPassValid = bcrypt.compareSync(currentPassword.trim(), passHash);
    if (!isPassValid) {
      throw new Error("Current Admin Password is incorrect.");
    }
  }

  // 3. Ensure new PIN is not identical to current PIN
  if (newPin && newPin.trim()) {
    if (newPin.trim() === currentPin.trim()) {
      throw new Error("New 6-digit Security PIN cannot be the same as the Current Security PIN.");
    }
    const pinVal = validateSecurityPinFormat(newPin.trim());
    if (!pinVal.isValid) {
      throw new Error(pinVal.message);
    }
  }

  // 4. Ensure new password is not identical to current password
  if (newPassword && newPassword.trim()) {
    if (currentPassword && newPassword.trim() === currentPassword.trim()) {
      throw new Error("New Password cannot be the same as the Current Password.");
    }
    const pwdVal = validatePasswordStrength(newPassword.trim());
    if (!pwdVal.isValid) {
      throw new Error(pwdVal.message);
    }
  }

  const updates: Partial<AdminAuthState> = {};

  if (newPassword && newPassword.trim()) {
    updates.passwordHash = bcrypt.hashSync(newPassword.trim(), 10);
  }

  if (newPin && newPin.trim()) {
    updates.pinHash = bcrypt.hashSync(newPin.trim(), 10);
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("Provide a new Password or new 6-digit Security PIN to update.");
  }

  const authRef = doc(db, "app_settings", "admin_auth_state");
  await setDoc(authRef, updates, { merge: true });

  // Sync updated passwordHash / pinHash into admin_accounts collection in Firestore as well
  try {
    const adminAccsCol = collection(db, "admin_accounts");
    const accsSnap = await getDocs(adminAccsCol);
    if (!accsSnap.empty) {
      const rbacUpdates: any = {};
      if (updates.passwordHash) rbacUpdates.passwordHash = updates.passwordHash;
      if (updates.pinHash) rbacUpdates.pinHash = updates.pinHash;

      const promises = accsSnap.docs.map((docSnap) =>
        updateDoc(docSnap.ref, rbacUpdates).catch((err) =>
          console.warn("Notice updating rbac admin account doc:", err)
        )
      );
      await Promise.all(promises);
    }
  } catch (err) {
    console.warn("Notice syncing admin_accounts in updateAdminPasswordAndPin:", err);
  }

  if (typeof localStorage !== "undefined") {
    if (updates.passwordHash) localStorage.setItem("admin_password_hash", updates.passwordHash);
    if (updates.pinHash) localStorage.setItem("admin_pin_hash", updates.pinHash);
  }

  await logAdminAction(
    "SECURITY_CREDENTIALS_UPDATED",
    `Admin security credentials updated successfully (${newPassword ? "Password " : ""}${newPin ? "6-digit PIN" : ""}).`,
    "SUCCESS"
  );
}

/**
 * Log out active admin session
 */
export async function logoutAdminSession(sessionToken?: string): Promise<void> {
  try {
    const authRef = doc(db, "app_settings", "admin_auth_state");
    await setDoc(authRef, {
      activeSessionToken: null
    }, { merge: true });

    await logAdminAction(
      "ADMIN_LOGOUT",
      `Admin session logged out.`,
      "SUCCESS"
    );
  } catch (err) {
    console.error("Error logging out admin session:", err);
  }
}

/**
 * Legacy subscribeAdminPin wrapper for backward compatibility
 */
export function subscribeAdminPin(callback: (pin: string) => void) {
  callback("123456");
  return () => {};
}

/**
 * Legacy updateAdminPin wrapper for backward compatibility
 */
export async function updateAdminPin(newPin: string): Promise<void> {
  const cleanPin = newPin.trim();
  const val = validateSecurityPinFormat(cleanPin);
  if (!val.isValid) {
    throw new Error(val.message);
  }
  const authRef = doc(db, "app_settings", "admin_auth_state");
  await setDoc(authRef, { pinHash: bcrypt.hashSync(cleanPin, 10), updatedAt: new Date().toISOString() }, { merge: true });
}

export const DEFAULT_PAYMENT_GATEWAYS: PaymentGateway[] = [
  {
    id: "gw_primary_1",
    title: "HDFC Official UPI & Bank Gateway",
    upiId: "7458038680@hdfc",
    accountName: "MUBARAK ABDUL AZIZ",
    bankName: "HDFC BANK",
    accountNumber: "50100305958655",
    ifscCode: "HDFC0005494",
    branchAndType: "MIHINPURWA • SAVING",
    qrCodeUrl: "",
    isActive: true
  }
];

export const DEFAULT_PAYMENT_DETAILS: PaymentGateway = DEFAULT_PAYMENT_GATEWAYS[0];

export const DEFAULT_DEPOSIT_PROCESSING_TIME: string = "5 - 15 Minutes";
export const DEFAULT_WITHDRAWAL_PROCESSING_TIME: string = "30 - 60 Minutes";

export const DEFAULT_WALLET_LIMITS: WalletLimits = {
  minDeposit: 100,
  maxDeposit: 100000,
  maxDepositPerDay: 200000,
  maxDepositPerMonth: 2000000,
  depositsEnabled: true,

  minWithdrawal: 100,
  maxWithdrawal: 50000,
  maxWithdrawalPerDay: 100000,
  maxWithdrawalPerMonth: 1000000,
  withdrawalsEnabled: true,

  limitsPolicyNote: DEFAULT_LIMITS_POLICY_NOTE,
  showLimitsPolicyToUsers: true,
};

/**
 * Calculates effective limits for a user by merging global defaults with user-specific custom/VIP limits.
 */
export function getEffectiveLimits(globalLimits: WalletLimits, user?: UserProfile | null): WalletLimits {
  const g = globalLimits || DEFAULT_WALLET_LIMITS;
  if (!user || !user.customLimits) {
    return g;
  }
  const cl = user.customLimits;
  
  // If user has custom limits explicitly disabled and is not VIP, use global defaults
  if (cl.hasCustomLimits === false && !cl.isVip) {
    return g;
  }

  // VIP Default Multiplier (5x higher limits for VIPs unless explicitly overridden)
  const vipMultiplier = cl.isVip ? 5 : 1;

  return {
    minDeposit: cl.minDeposit ?? g.minDeposit,
    maxDeposit: cl.maxDeposit ?? (g.maxDeposit * vipMultiplier),
    maxDepositPerDay: cl.maxDepositPerDay ?? (g.maxDepositPerDay * vipMultiplier),
    maxDepositPerMonth: cl.maxDepositPerMonth ?? (g.maxDepositPerMonth * vipMultiplier),
    depositsEnabled: cl.depositsEnabled ?? g.depositsEnabled,

    minWithdrawal: cl.minWithdrawal ?? g.minWithdrawal,
    maxWithdrawal: cl.maxWithdrawal ?? (g.maxWithdrawal * vipMultiplier),
    maxWithdrawalPerDay: cl.maxWithdrawalPerDay ?? (g.maxWithdrawalPerDay * vipMultiplier),
    maxWithdrawalPerMonth: cl.maxWithdrawalPerMonth ?? (g.maxWithdrawalPerMonth * vipMultiplier),
    withdrawalsEnabled: cl.withdrawalsEnabled ?? g.withdrawalsEnabled,

    limitsPolicyNote: g.limitsPolicyNote || DEFAULT_LIMITS_POLICY_NOTE,
    showLimitsPolicyToUsers: g.showLimitsPolicyToUsers ?? true,
  };
}

/**
 * Calculate total deposit and withdrawal amounts for today and current calendar month for a user.
 */
export function calculateUserTransactionUsage(
  userId: string,
  userTransactions: WalletTransaction[]
): {
  todayDepositTotal: number;
  monthDepositTotal: number;
  todayWithdrawalTotal: number;
  monthWithdrawalTotal: number;
} {
  const now = new Date();
  
  // Start of today (00:00:00.000 local time)
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  // Start of current calendar month (1st of month 00:00:00.000)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let todayDepositTotal = 0;
  let monthDepositTotal = 0;
  let todayWithdrawalTotal = 0;
  let monthWithdrawalTotal = 0;

  for (const tx of userTransactions) {
    if (tx.userId !== userId) continue;
    if (tx.status === "REJECTED") continue; // Count PENDING and APPROVED requests

    const txTime = new Date(tx.createdAt).getTime();
    if (isNaN(txTime)) continue;

    if (tx.type === "DEPOSIT") {
      if (txTime >= startOfDay) {
        todayDepositTotal += tx.amount;
      }
      if (txTime >= startOfMonth) {
        monthDepositTotal += tx.amount;
      }
    } else if (tx.type === "WITHDRAWAL") {
      if (txTime >= startOfDay) {
        todayWithdrawalTotal += tx.amount;
      }
      if (txTime >= startOfMonth) {
        monthWithdrawalTotal += tx.amount;
      }
    }
  }

  return {
    todayDepositTotal,
    monthDepositTotal,
    todayWithdrawalTotal,
    monthWithdrawalTotal,
  };
}

/**
 * Validates a transaction request against enabled status, min/max per tx, daily limit, and monthly limit.
 */
export function validateTransactionLimits(
  userId: string,
  type: "DEPOSIT" | "WITHDRAWAL",
  amount: number,
  user: UserProfile,
  globalLimits: WalletLimits,
  userTransactions: WalletTransaction[]
): { valid: boolean; error?: string; usage?: { todayTotal: number; monthTotal: number; maxPerDay: number; maxPerMonth: number } } {
  const eff = getEffectiveLimits(globalLimits, user);
  const usage = calculateUserTransactionUsage(userId, userTransactions);

  if (type === "DEPOSIT") {
    if (!eff.depositsEnabled) {
      return {
        valid: false,
        error: "Deposits are currently disabled globally or for your account by Admin. Please try again later or contact support."
      };
    }
    if (amount < eff.minDeposit) {
      return {
        valid: false,
        error: `Minimum deposit amount per transaction is ₹${eff.minDeposit.toLocaleString('en-IN')}. Requested amount: ₹${amount.toLocaleString('en-IN')}.`
      };
    }
    if (amount > eff.maxDeposit) {
      return {
        valid: false,
        error: `Maximum deposit amount per transaction is ₹${eff.maxDeposit.toLocaleString('en-IN')}. Requested amount: ₹${amount.toLocaleString('en-IN')}.`
      };
    }
    if ((usage.todayDepositTotal + amount) > eff.maxDepositPerDay) {
      const remaining = Math.max(0, eff.maxDepositPerDay - usage.todayDepositTotal);
      return {
        valid: false,
        error: `Daily deposit limit of ₹${eff.maxDepositPerDay.toLocaleString('en-IN')} reached! You have already deposited ₹${usage.todayDepositTotal.toLocaleString('en-IN')} today. Remaining daily limit: ₹${remaining.toLocaleString('en-IN')}.`,
        usage: { todayTotal: usage.todayDepositTotal, monthTotal: usage.monthDepositTotal, maxPerDay: eff.maxDepositPerDay, maxPerMonth: eff.maxDepositPerMonth }
      };
    }
    if ((usage.monthDepositTotal + amount) > eff.maxDepositPerMonth) {
      const remaining = Math.max(0, eff.maxDepositPerMonth - usage.monthDepositTotal);
      return {
        valid: false,
        error: `Monthly deposit limit of ₹${eff.maxDepositPerMonth.toLocaleString('en-IN')} reached! You have deposited ₹${usage.monthDepositTotal.toLocaleString('en-IN')} this month. Remaining monthly limit: ₹${remaining.toLocaleString('en-IN')}.`,
        usage: { todayTotal: usage.todayDepositTotal, monthTotal: usage.monthDepositTotal, maxPerDay: eff.maxDepositPerDay, maxPerMonth: eff.maxDepositPerMonth }
      };
    }
  } else if (type === "WITHDRAWAL") {
    if (!eff.withdrawalsEnabled) {
      return {
        valid: false,
        error: "Withdrawals are currently disabled globally or for your account by Admin. Please try again later or contact support."
      };
    }
    if (amount < eff.minWithdrawal) {
      return {
        valid: false,
        error: `Minimum withdrawal amount per transaction is ₹${eff.minWithdrawal.toLocaleString('en-IN')}. Requested amount: ₹${amount.toLocaleString('en-IN')}.`
      };
    }
    if (amount > eff.maxWithdrawal) {
      return {
        valid: false,
        error: `Maximum withdrawal amount per transaction is ₹${eff.maxWithdrawal.toLocaleString('en-IN')}. Requested amount: ₹${amount.toLocaleString('en-IN')}.`
      };
    }
    if ((usage.todayWithdrawalTotal + amount) > eff.maxWithdrawalPerDay) {
      const remaining = Math.max(0, eff.maxWithdrawalPerDay - usage.todayWithdrawalTotal);
      return {
        valid: false,
        error: `Daily withdrawal limit of ₹${eff.maxWithdrawalPerDay.toLocaleString('en-IN')} reached! You have already withdrawn ₹${usage.todayWithdrawalTotal.toLocaleString('en-IN')} today. Remaining daily limit: ₹${remaining.toLocaleString('en-IN')}.`,
        usage: { todayTotal: usage.todayWithdrawalTotal, monthTotal: usage.monthWithdrawalTotal, maxPerDay: eff.maxWithdrawalPerDay, maxPerMonth: eff.maxWithdrawalPerMonth }
      };
    }
    if ((usage.monthWithdrawalTotal + amount) > eff.maxWithdrawalPerMonth) {
      const remaining = Math.max(0, eff.maxWithdrawalPerMonth - usage.monthWithdrawalTotal);
      return {
        valid: false,
        error: `Monthly withdrawal limit of ₹${eff.maxWithdrawalPerMonth.toLocaleString('en-IN')} reached! You have withdrawn ₹${usage.monthWithdrawalTotal.toLocaleString('en-IN')} this month. Remaining monthly limit: ₹${remaining.toLocaleString('en-IN')}.`,
        usage: { todayTotal: usage.todayWithdrawalTotal, monthTotal: usage.monthWithdrawalTotal, maxPerDay: eff.maxWithdrawalPerDay, maxPerMonth: eff.maxWithdrawalPerMonth }
      };
    }
  }

  return { valid: true };
}

export const DEFAULT_PAYMENT_NOTE: string = 
  "📌 IMPORTANT PAYMENT INSTRUCTIONS & ALTERNATIVE OPTIONS:\n" +
  "1. UPI Auto-Scan: Scan the QR code or copy the UPI ID above using GPay, PhonePe, or Paytm.\n" +
  "2. Alternative Bank Transfer (IMPS / NEFT): If UPI auto-pay fails or faces server limit errors, please perform a direct IMPS/NEFT bank transfer to the Account Number & IFSC details listed.\n" +
  "3. Instant Manual Deposit Verification: After making payment, paste your 12-digit UPI/Bank Transaction Ref Number (UTR) below for instant approval.\n" +
  "4. Custom Deposit Options: Need assistance or custom payment modes? Reach out to Admin Live Support in the Help Desk modal.";

/**
 * Subscribe to real-time Deposit & Withdrawal Processing Times in Firestore
 */
export function subscribeProcessingTimes(
  callback: (times: { depositTime: string; withdrawalTime: string }) => void
) {
  const paymentRef = doc(db, "app_settings", "payment_details");
  let active = true;
  getDoc(paymentRef).then((snapshot) => {
    if (!active) return;
    if (snapshot.exists()) {
      const data = snapshot.data();
      callback({
        depositTime: typeof data.depositProcessingTime === "string" && data.depositProcessingTime.trim()
          ? data.depositProcessingTime
          : DEFAULT_DEPOSIT_PROCESSING_TIME,
        withdrawalTime: typeof data.withdrawalProcessingTime === "string" && data.withdrawalProcessingTime.trim()
          ? data.withdrawalProcessingTime
          : DEFAULT_WITHDRAWAL_PROCESSING_TIME,
      });
    } else {
      callback({
        depositTime: DEFAULT_DEPOSIT_PROCESSING_TIME,
        withdrawalTime: DEFAULT_WITHDRAWAL_PROCESSING_TIME,
      });
    }
  }).catch((err) => {
    console.warn("Notice fetching processing times:", err);
    callback({
      depositTime: DEFAULT_DEPOSIT_PROCESSING_TIME,
      withdrawalTime: DEFAULT_WITHDRAWAL_PROCESSING_TIME,
    });
  });
  return () => { active = false; };
}

/**
 * Save Deposit & Withdrawal Processing Times in Firestore
 */
export async function saveProcessingTimes(depositTime: string, withdrawalTime: string): Promise<void> {
  const paymentRef = doc(db, "app_settings", "payment_details");
  await setDoc(paymentRef, {
    depositProcessingTime: depositTime,
    withdrawalProcessingTime: withdrawalTime,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

/**
 * Subscribe to real-time Deposit & Withdrawal Limits in Firestore
 */
export function subscribeWalletLimits(callback: (limits: WalletLimits) => void) {
  const paymentRef = doc(db, "app_settings", "payment_details");
  let active = true;
  getDoc(paymentRef).then((snapshot) => {
    if (!active) return;
    if (snapshot.exists()) {
      const data = snapshot.data();
      callback({
        minDeposit: typeof data.minDeposit === "number" && !isNaN(data.minDeposit) ? data.minDeposit : DEFAULT_WALLET_LIMITS.minDeposit,
        maxDeposit: typeof data.maxDeposit === "number" && !isNaN(data.maxDeposit) ? data.maxDeposit : DEFAULT_WALLET_LIMITS.maxDeposit,
        maxDepositPerDay: typeof data.maxDepositPerDay === "number" && !isNaN(data.maxDepositPerDay) ? data.maxDepositPerDay : DEFAULT_WALLET_LIMITS.maxDepositPerDay,
        maxDepositPerMonth: typeof data.maxDepositPerMonth === "number" && !isNaN(data.maxDepositPerMonth) ? data.maxDepositPerMonth : DEFAULT_WALLET_LIMITS.maxDepositPerMonth,
        depositsEnabled: typeof data.depositsEnabled === "boolean" ? data.depositsEnabled : DEFAULT_WALLET_LIMITS.depositsEnabled,

        minWithdrawal: typeof data.minWithdrawal === "number" && !isNaN(data.minWithdrawal) ? data.minWithdrawal : DEFAULT_WALLET_LIMITS.minWithdrawal,
        maxWithdrawal: typeof data.maxWithdrawal === "number" && !isNaN(data.maxWithdrawal) ? data.maxWithdrawal : DEFAULT_WALLET_LIMITS.maxWithdrawal,
        maxWithdrawalPerDay: typeof data.maxWithdrawalPerDay === "number" && !isNaN(data.maxWithdrawalPerDay) ? data.maxWithdrawalPerDay : DEFAULT_WALLET_LIMITS.maxWithdrawalPerDay,
        maxWithdrawalPerMonth: typeof data.maxWithdrawalPerMonth === "number" && !isNaN(data.maxWithdrawalPerMonth) ? data.maxWithdrawalPerMonth : DEFAULT_WALLET_LIMITS.maxWithdrawalPerMonth,
        withdrawalsEnabled: typeof data.withdrawalsEnabled === "boolean" ? data.withdrawalsEnabled : DEFAULT_WALLET_LIMITS.withdrawalsEnabled,

        limitsPolicyNote: typeof data.limitsPolicyNote === "string" && data.limitsPolicyNote.trim() ? data.limitsPolicyNote : DEFAULT_WALLET_LIMITS.limitsPolicyNote,
        showLimitsPolicyToUsers: typeof data.showLimitsPolicyToUsers === "boolean" ? data.showLimitsPolicyToUsers : true,
      });
    } else {
      callback(DEFAULT_WALLET_LIMITS);
    }
  }).catch((err) => {
    console.warn("Notice fetching wallet limits:", err);
    callback(DEFAULT_WALLET_LIMITS);
  });
  return () => { active = false; };
}

/**
 * Save Deposit & Withdrawal Limits in Firestore with Audit Logging
 */
export async function saveWalletLimits(
  limits: Partial<WalletLimits>,
  adminInfo?: { name: string; email: string; role?: AdminRole },
  previousLimits?: WalletLimits
): Promise<void> {
  const paymentRef = doc(db, "app_settings", "payment_details");
  const newLimitsData = {
    minDeposit: limits.minDeposit ?? DEFAULT_WALLET_LIMITS.minDeposit,
    maxDeposit: limits.maxDeposit ?? DEFAULT_WALLET_LIMITS.maxDeposit,
    maxDepositPerDay: limits.maxDepositPerDay ?? DEFAULT_WALLET_LIMITS.maxDepositPerDay,
    maxDepositPerMonth: limits.maxDepositPerMonth ?? DEFAULT_WALLET_LIMITS.maxDepositPerMonth,
    depositsEnabled: limits.depositsEnabled ?? DEFAULT_WALLET_LIMITS.depositsEnabled,

    minWithdrawal: limits.minWithdrawal ?? DEFAULT_WALLET_LIMITS.minWithdrawal,
    maxWithdrawal: limits.maxWithdrawal ?? DEFAULT_WALLET_LIMITS.maxWithdrawal,
    maxWithdrawalPerDay: limits.maxWithdrawalPerDay ?? DEFAULT_WALLET_LIMITS.maxWithdrawalPerDay,
    maxWithdrawalPerMonth: limits.maxWithdrawalPerMonth ?? DEFAULT_WALLET_LIMITS.maxWithdrawalPerMonth,
    withdrawalsEnabled: limits.withdrawalsEnabled ?? DEFAULT_WALLET_LIMITS.withdrawalsEnabled,

    limitsPolicyNote: limits.limitsPolicyNote ?? DEFAULT_WALLET_LIMITS.limitsPolicyNote,
    showLimitsPolicyToUsers: limits.showLimitsPolicyToUsers ?? true,

    updatedAt: new Date().toISOString()
  };

  await setDoc(paymentRef, newLimitsData, { merge: true });

  if (adminInfo) {
    const beforeStr = previousLimits ? JSON.stringify(previousLimits) : "Default Limits";
    const afterStr = JSON.stringify(newLimitsData);
    await logAdminAction(
      "UPDATE_GLOBAL_LIMITS",
      `Global Deposit & Withdrawal limits updated by ${adminInfo.name || adminInfo.email}`,
      "SUCCESS",
      "Global Configuration",
      0
    );
  }
}

/**
 * Save or Reset custom limits for an individual user in Firestore with Audit Logging
 */
export async function saveUserCustomLimits(
  targetUserId: string,
  customLimits: UserCustomLimits | null,
  adminInfo?: { name: string; email: string; role?: AdminRole },
  targetUserName?: string,
  previousCustomLimits?: UserCustomLimits | null
): Promise<void> {
  const userRef = doc(db, "users", targetUserId);
  if (customLimits === null) {
    // Reset to defaults
    await setDoc(userRef, { customLimits: null }, { merge: true });
  } else {
    await setDoc(userRef, {
      customLimits: {
        ...customLimits,
        updatedAt: new Date().toISOString(),
        updatedBy: adminInfo?.email || "Admin"
      }
    }, { merge: true });
  }

  if (adminInfo) {
    const actionDesc = customLimits === null 
      ? `Reset user limits back to global defaults for ${targetUserName || targetUserId}`
      : (customLimits.isVip 
        ? `Configured VIP higher limits for ${targetUserName || targetUserId}` 
        : `Updated custom limits for ${targetUserName || targetUserId}`);

    await logAdminAction(
      "UPDATE_USER_CUSTOM_LIMITS",
      actionDesc,
      "SUCCESS",
      targetUserId,
      0
    );
  }
}

export const DEFAULT_WITHDRAWAL_FIELDS: WithdrawalField[] = [
  {
    id: "upi_id",
    label: "UPI ID / VPA Address",
    placeholder: "e.g. user@upi, 9876543210@paytm",
    required: true,
    type: "text",
  },
  {
    id: "account_name",
    label: "Account Holder Name",
    placeholder: "e.g. Rahul Sharma",
    required: true,
    type: "text",
  },
  {
    id: "bank_account",
    label: "Bank Account Number",
    placeholder: "e.g. 50100234567890",
    required: false,
    type: "text",
  },
  {
    id: "ifsc_code",
    label: "Bank Name & IFSC Code",
    placeholder: "e.g. HDFC Bank, HDFC0001234",
    required: false,
    type: "text",
  },
  {
    id: "phone_number",
    label: "Google Pay / PhonePe Mobile",
    placeholder: "e.g. 9876543210",
    required: false,
    type: "text",
  }
];

/**
 * Subscribe to real-time User Withdrawal Fields in Firestore
 */
export function subscribeWithdrawalFields(callback: (fields: WithdrawalField[]) => void) {
  const paymentRef = doc(db, "app_settings", "payment_details");
  let active = true;
  getDoc(paymentRef).then((snapshot) => {
    if (!active) return;
    if (snapshot.exists()) {
      const data = snapshot.data();
      if (Array.isArray(data.withdrawalFields) && data.withdrawalFields.length > 0) {
        callback(data.withdrawalFields);
        return;
      }
    }
    callback(DEFAULT_WITHDRAWAL_FIELDS);
  }).catch((err) => {
    console.warn("Notice fetching withdrawal fields:", err);
    callback(DEFAULT_WITHDRAWAL_FIELDS);
  });
  return () => { active = false; };
}

/**
 * Save User Withdrawal Fields in Firestore
 */
export async function saveWithdrawalFields(fields: WithdrawalField[]): Promise<void> {
  const paymentRef = doc(db, "app_settings", "payment_details");
  await setDoc(paymentRef, {
    withdrawalFields: fields,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

/**
 * Subscribe to real-time Payment Instructions Note in Firestore
 */
export function subscribePaymentNote(callback: (note: string) => void) {
  const paymentRef = doc(db, "app_settings", "payment_details");
  let active = true;
  getDoc(paymentRef).then((snapshot) => {
    if (!active) return;
    if (snapshot.exists()) {
      const data = snapshot.data();
      if (typeof data.paymentNote === "string" && data.paymentNote.trim().length > 0) {
        callback(data.paymentNote);
      } else {
        callback(DEFAULT_PAYMENT_NOTE);
      }
    } else {
      callback(DEFAULT_PAYMENT_NOTE);
    }
  }).catch((err) => {
    console.warn("Notice fetching payment note:", err);
    callback(DEFAULT_PAYMENT_NOTE);
  });
  return () => { active = false; };
}

/**
 * Save Payment Instructions Note in Firestore
 */
export async function savePaymentNote(note: string): Promise<void> {
  const paymentRef = doc(db, "app_settings", "payment_details");
  await setDoc(paymentRef, {
    paymentNote: note,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

/**
 * Subscribe to real-time Deposit Payment Gateways list in Firestore
 */
export function subscribePaymentGateways(callback: (gateways: PaymentGateway[]) => void) {
  const paymentRef = doc(db, "app_settings", "payment_details");
  let active = true;
  getDoc(paymentRef).then((snapshot) => {
    if (!active) return;
    if (snapshot.exists()) {
      const data = snapshot.data();
      if (Array.isArray(data.gateways) && data.gateways.length > 0) {
        callback(data.gateways);
      } else if (data.upiId) {
        const legacyGw: PaymentGateway = {
          id: data.id || "gw_legacy_1",
          title: data.title || "Primary UPI & Bank Transfer",
          upiId: data.upiId || DEFAULT_PAYMENT_DETAILS.upiId,
          accountName: data.accountName || DEFAULT_PAYMENT_DETAILS.accountName,
          bankName: data.bankName || DEFAULT_PAYMENT_DETAILS.bankName,
          accountNumber: data.accountNumber || DEFAULT_PAYMENT_DETAILS.accountNumber,
          ifscCode: data.ifscCode || DEFAULT_PAYMENT_DETAILS.ifscCode,
          branchAndType: data.branchAndType || DEFAULT_PAYMENT_DETAILS.branchAndType,
          qrCodeUrl: data.qrCodeUrl || "",
          isActive: true
        };
        callback([legacyGw]);
      } else {
        callback(DEFAULT_PAYMENT_GATEWAYS);
      }
    } else {
      callback(DEFAULT_PAYMENT_GATEWAYS);
    }
  }).catch((err) => {
    console.warn("Notice fetching payment gateways:", err);
    callback(DEFAULT_PAYMENT_GATEWAYS);
  });
  return () => { active = false; };
}

/**
 * Combined Application Payment Settings Interface
 */
export interface CombinedPaymentSettings {
  gateways: PaymentGateway[];
  paymentDetails: PaymentDetails;
  paymentNote: string;
  depositProcessingTime: string;
  withdrawalProcessingTime: string;
  walletLimits: WalletLimits;
}

/**
 * Consolidated single-document fetch for app payment settings.
 * Replaces 5 separate snapshot listeners to app_settings/payment_details with 1 getDoc call.
 */
export function subscribeAppPaymentSettings(callback: (settings: CombinedPaymentSettings) => void) {
  const paymentRef = doc(db, "app_settings", "payment_details");
  let active = true;
  getDoc(paymentRef).then((snapshot) => {
    if (!active) return;
    if (snapshot.exists()) {
      const data = snapshot.data();
      const gateways: PaymentGateway[] = (Array.isArray(data.gateways) && data.gateways.length > 0)
        ? data.gateways
        : DEFAULT_PAYMENT_GATEWAYS;
      const primaryDetails: PaymentDetails = gateways.find((g) => g.isActive !== false) || gateways[0] || DEFAULT_PAYMENT_DETAILS;
      const note: string = (typeof data.paymentNote === "string" && data.paymentNote.trim().length > 0)
        ? data.paymentNote
        : DEFAULT_PAYMENT_NOTE;
      const depositTime: string = data.depositProcessingTime || DEFAULT_DEPOSIT_PROCESSING_TIME;
      const withdrawalTime: string = data.withdrawalProcessingTime || DEFAULT_WITHDRAWAL_PROCESSING_TIME;
      const limits: WalletLimits = {
        minDeposit: data.minDeposit ?? DEFAULT_WALLET_LIMITS.minDeposit,
        maxDeposit: data.maxDeposit ?? DEFAULT_WALLET_LIMITS.maxDeposit,
        maxDepositPerDay: data.maxDepositPerDay ?? DEFAULT_WALLET_LIMITS.maxDepositPerDay,
        maxDepositPerMonth: data.maxDepositPerMonth ?? DEFAULT_WALLET_LIMITS.maxDepositPerMonth,
        depositsEnabled: data.depositsEnabled ?? DEFAULT_WALLET_LIMITS.depositsEnabled,
        minWithdrawal: data.minWithdrawal ?? DEFAULT_WALLET_LIMITS.minWithdrawal,
        maxWithdrawal: data.maxWithdrawal ?? DEFAULT_WALLET_LIMITS.maxWithdrawal,
        maxWithdrawalPerDay: data.maxWithdrawalPerDay ?? DEFAULT_WALLET_LIMITS.maxWithdrawalPerDay,
        maxWithdrawalPerMonth: data.maxWithdrawalPerMonth ?? DEFAULT_WALLET_LIMITS.maxWithdrawalPerMonth,
        withdrawalsEnabled: data.withdrawalsEnabled ?? DEFAULT_WALLET_LIMITS.withdrawalsEnabled,
        limitsPolicyNote: data.limitsPolicyNote || DEFAULT_LIMITS_POLICY_NOTE,
        showLimitsPolicyToUsers: data.showLimitsPolicyToUsers ?? true
      };

      callback({
        gateways,
        paymentDetails: primaryDetails,
        paymentNote: note,
        depositProcessingTime: depositTime,
        withdrawalProcessingTime: withdrawalTime,
        walletLimits: limits
      });
    } else {
      callback({
        gateways: DEFAULT_PAYMENT_GATEWAYS,
        paymentDetails: DEFAULT_PAYMENT_DETAILS,
        paymentNote: DEFAULT_PAYMENT_NOTE,
        depositProcessingTime: DEFAULT_DEPOSIT_PROCESSING_TIME,
        withdrawalProcessingTime: DEFAULT_WITHDRAWAL_PROCESSING_TIME,
        walletLimits: DEFAULT_WALLET_LIMITS
      });
    }
  }).catch((err) => {
    console.warn("Payment settings fetch warning:", err);
    callback({
      gateways: DEFAULT_PAYMENT_GATEWAYS,
      paymentDetails: DEFAULT_PAYMENT_DETAILS,
      paymentNote: DEFAULT_PAYMENT_NOTE,
      depositProcessingTime: DEFAULT_DEPOSIT_PROCESSING_TIME,
      withdrawalProcessingTime: DEFAULT_WITHDRAWAL_PROCESSING_TIME,
      walletLimits: DEFAULT_WALLET_LIMITS
    });
  });
  return () => { active = false; };
}

export function normalizeUserProfile(data: any): UserProfile {
  if (!data) return data;
  const unifiedBal = typeof data.availableBalance === "number"
    ? data.availableBalance
    : (typeof data.balance === "number" ? data.balance : 0);
  const locked = typeof data.lockedBalance === "number" ? data.lockedBalance : 0;
  return {
    ...data,
    name: data.name || "Trader",
    email: data.email || "",
    balance: unifiedBal,
    availableBalance: unifiedBal,
    lockedBalance: locked,
  };
}

/**
 * One-time fetch for all users (Admin only)
 */
export async function fetchAllUsersOnce(): Promise<UserProfile[]> {
  try {
    const qSnap = await getDocs(collection(db, "users"));
    const list: UserProfile[] = [];
    qSnap.forEach((docSnap) => {
      list.push(normalizeUserProfile(docSnap.data()));
    });
    list.sort((a, b) => a.id.localeCompare(b.id));
    if (list.length === 0) {
      return DEFAULT_USERS;
    }
    return list;
  } catch (err) {
    console.warn("Notice fetching users once:", err);
    return DEFAULT_USERS;
  }
}

/**
 * Query Firestore to find a user profile by email address or mobile number (case-insensitive)
 */
export async function findUserByEmailInFirestore(emailOrPhoneInput: string): Promise<UserProfile | null> {
  const cleanInput = emailOrPhoneInput.trim().toLowerCase();
  if (!cleanInput) return null;

  try {
    const usersRef = collection(db, "users");
    
    // 1. Try exact email query
    const qEmail = query(usersRef, where("email", "==", cleanInput));
    const snapEmail = await getDocs(qEmail);

    if (!snapEmail.empty) {
      return normalizeUserProfile(snapEmail.docs[0].data());
    }

    // 1b. Direct doc ID lookup fallback (e.g. if user ID was derived from email)
    const docIdSanitized = cleanInput.replace(/[@.]/g, "_");
    try {
      const directDocRef = doc(db, "users", docIdSanitized);
      const directSnap = await getDoc(directDocRef);
      if (directSnap.exists()) {
        return normalizeUserProfile(directSnap.data());
      }
    } catch {
      // ignore
    }

    // 2. Query all users as fallback for case-insensitive or phone lookup
    const allSnap = await getDocs(usersRef);
    let matched: UserProfile | null = null;
    const normalizedDigits = normalizePhoneDigits(cleanInput);

    allSnap.forEach((docSnap) => {
      if (matched) return;
      const u = normalizeUserProfile(docSnap.data());
      if (u.email && u.email.trim().toLowerCase() === cleanInput) {
        matched = u;
      } else if (normalizedDigits && u.phone && normalizePhoneDigits(u.phone) === normalizedDigits) {
        matched = u;
      }
    });

    if (matched) return matched;

    // 3. Check localStorage cached users fallback
    try {
      const localCached = localStorage.getItem("cached_users");
      if (localCached) {
        const parsed: UserProfile[] = JSON.parse(localCached);
        const found = parsed.find(
          (u) =>
            (u.email && u.email.trim().toLowerCase() === cleanInput) ||
            (normalizedDigits && u.phone && normalizePhoneDigits(u.phone) === normalizedDigits)
        );
        if (found) return normalizeUserProfile(found);
      }
    } catch {
      // ignore
    }

    return null;
  } catch (err) {
    console.warn("Notice finding user in Firestore:", err);
    return null;
  }
}

/**
 * One-time fetch for wallet transactions with query limit
 */
export async function fetchWalletTransactionsOnce(userId?: string, limitCount = 50): Promise<WalletTransaction[]> {
  try {
    let q;
    if (userId) {
      q = query(
        collection(db, "wallet_transactions"),
        where("userId", "==", userId),
        limit(limitCount)
      );
    } else {
      q = query(
        collection(db, "wallet_transactions"),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );
    }
    const qSnap = await getDocs(q);
    const list: WalletTransaction[] = [];
    qSnap.forEach((docSnap) => {
      list.push(docSnap.data() as WalletTransaction);
    });
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return list;
  } catch (err) {
    console.warn("Notice fetching transactions once:", err);
    return [];
  }
}

/**
 * One-time fetch for support messages with query limit
 */
export async function fetchSupportMessagesOnce(userId?: string, limitCount = 50): Promise<SupportMessage[]> {
  try {
    let q;
    if (userId) {
      q = query(
        collection(db, "support_messages"),
        where("userId", "==", userId),
        limit(limitCount)
      );
    } else {
      q = query(
        collection(db, "support_messages"),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );
    }
    const qSnap = await getDocs(q);
    const list: SupportMessage[] = [];
    qSnap.forEach((docSnap) => {
      const data = docSnap.data() as SupportMessage & { deleted?: boolean };
      if (!data.deleted) list.push(data);
    });
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return list;
  } catch (err) {
    console.warn("Notice fetching support messages once:", err);
    return [];
  }
}

/**
 * One-time fetch for trade pools with query limit
 */
export async function fetchTradePoolsOnce(limitCount = 50): Promise<TradePool[]> {
  try {
    const q = query(
      collection(db, "trade_pools"),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    const qSnap = await getDocs(q);
    const list: TradePool[] = [];
    qSnap.forEach((docSnap) => {
      list.push(docSnap.data() as TradePool);
    });
    return list;
  } catch (err) {
    console.warn("Notice fetching trade pools once:", err);
    return [];
  }
}

/**
 * Subscribe to primary Payment Details (for backward compatibility)
 */
export function subscribePaymentDetails(callback: (details: PaymentDetails) => void) {
  return subscribePaymentGateways((gateways) => {
    const activeGw = gateways.find((g) => g.isActive !== false) || gateways[0] || DEFAULT_PAYMENT_DETAILS;
    callback(activeGw);
  });
}

/**
 * Save all Payment Gateways in Firestore
 */
export async function savePaymentGateways(gateways: PaymentGateway[]): Promise<void> {
  const paymentRef = doc(db, "app_settings", "payment_details");
  const primary = gateways[0] || DEFAULT_PAYMENT_DETAILS;
  await setDoc(paymentRef, {
    gateways,
    upiId: primary.upiId,
    accountName: primary.accountName,
    bankName: primary.bankName,
    accountNumber: primary.accountNumber,
    ifscCode: primary.ifscCode,
    branchAndType: primary.branchAndType,
    qrCodeUrl: primary.qrCodeUrl || "",
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

/**
 * Add a new Payment Gateway
 */
export async function addPaymentGateway(newGatewayData: Omit<PaymentGateway, "id">, currentGateways: PaymentGateway[]): Promise<void> {
  const newGw: PaymentGateway = {
    ...newGatewayData,
    id: "gw_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    isActive: newGatewayData.isActive !== undefined ? newGatewayData.isActive : true
  };
  const updatedList = [...currentGateways, newGw];
  await savePaymentGateways(updatedList);
}

/**
 * Delete a Payment Gateway by ID
 */
export async function deletePaymentGateway(gatewayId: string, currentGateways: PaymentGateway[]): Promise<void> {
  const updatedList = currentGateways.filter((g) => g.id !== gatewayId);
  await savePaymentGateways(updatedList.length > 0 ? updatedList : DEFAULT_PAYMENT_GATEWAYS);
}

/**
 * Update Deposit Payment Details in Firestore (legacy helper)
 */
export async function updatePaymentDetails(details: Partial<PaymentDetails>): Promise<void> {
  const paymentRef = doc(db, "app_settings", "payment_details");
  await setDoc(paymentRef, {
    ...details,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

/**
 * Toggle Block/Unblock Status for a User Profile
 */
export async function toggleBlockUser(userId: string, isBlocked: boolean): Promise<void> {
  const userRef = doc(db, "users", userId);
  if (isBlocked) {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      const isTargetAdmin =
        data.isAdmin === true ||
        data.id === "admin" ||
        data.id === "user_a" ||
        (data.email && (data.email.toLowerCase() === "amaizy1@gmail.com" || data.email.toLowerCase().includes("admin")));
      if (isTargetAdmin) {
        throw new Error("Admin account cannot be blocked! (एडमिन अकाउंट ब्लॉक नहीं किया जा सकता)");
      }
    }
  }
  await setDoc(userRef, { isBlocked }, { merge: true });
}

/**
 * Permanently Delete User Profile Document (Guarded against Admin accounts)
 */
export async function deleteUserProfile(userId: string): Promise<void> {
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    const data = snap.data();
    const isTargetAdmin =
      data.isAdmin === true ||
      data.id === "admin" ||
      data.id === "user_a" ||
      (data.email && (data.email.toLowerCase() === "amaizy1@gmail.com" || data.email.toLowerCase().includes("admin")));
    if (isTargetAdmin) {
      throw new Error("Admin account cannot be deleted! (एडमिन अकाउंट को डिलीट नहीं किया जा सकता)");
    }
  }
  await deleteDoc(userRef);
}

/**
 * Generate a unique 6-digit Mobile Verification PIN for a user (configurable validity, default 15 minutes)
 * Admin triggers this from Admin Panel.
 */
export async function generateMobileVerificationPin(
  userId: string,
  durationMinutes: number = 15
): Promise<{ pin: string; expiresAt: string; durationMinutes: number }> {
  const userRef = doc(db, "users", userId);
  
  // Generate random 6-digit PIN
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  const now = new Date();
  const validMins = Math.max(1, durationMinutes);
  const expiresAt = new Date(now.getTime() + validMins * 60 * 1000).toISOString();

  await setDoc(
    userRef,
    {
      verificationPin: pin,
      pinExpiresAt: expiresAt,
      pinAttempts: 0,
      pinGeneratedAt: now.toISOString(),
      verificationStatus: "pending",
      mobileVerified: false
    },
    { merge: true }
  );

  return { pin, expiresAt, durationMinutes: validMins };
}

/**
 * Admin utility to update or extend PIN expiry time for a user
 */
export async function updateUserPinExpiry(
  userId: string,
  newExpiresAtISO: string
): Promise<void> {
  const userRef = doc(db, "users", userId);
  await setDoc(
    userRef,
    {
      pinExpiresAt: newExpiresAtISO
    },
    { merge: true }
  );
}

/**
 * Verify Mobile PIN entered by the user (using secure database transaction)
 * Invalidates PIN upon success, handles brute-force limits (max 5 attempts) & 15-min expiration.
 */
export async function verifyMobilePin(
  userId: string,
  inputPin: string
): Promise<{ success: boolean; message: string }> {
  const cleanPin = inputPin ? inputPin.trim() : "";
  if (!cleanPin || cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
    throw new Error("Please enter a valid 6-digit numeric PIN.");
  }

  const userRef = doc(db, "users", userId);

  return await runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) {
      throw new Error("User profile not found.");
    }

    const user = userSnap.data() as UserProfile;

    // Check 1: Already verified
    if (user.mobileVerified === true && user.verificationStatus === "approved") {
      throw new Error("Your mobile number is already verified and approved!");
    }

    // Check 2: PIN exists
    if (!user.verificationPin) {
      throw new Error(
        "No active verification PIN found for your account. Please request Admin to generate a 6-digit PIN."
      );
    }

    // Check 3: Brute-force limit (Max 5 attempts)
    const currentAttempts = user.pinAttempts || 0;
    if (currentAttempts >= 5) {
      throw new Error(
        "Too many failed attempts (5/5)! Your PIN has been locked for security. Please request Admin to generate a new PIN."
      );
    }

    // Check 4: Expiration (15 minutes)
    if (user.pinExpiresAt) {
      const expiryDate = new Date(user.pinExpiresAt);
      if (new Date() > expiryDate) {
        // Invalidate expired PIN
        transaction.update(userRef, {
          verificationPin: null,
          pinExpiresAt: null
        });
        throw new Error(
          "Verification PIN has expired (valid for 15 minutes). Please request Admin to generate a new PIN."
        );
      }
    }

    // Check 5: Match check
    if (cleanPin !== user.verificationPin) {
      const nextAttempts = currentAttempts + 1;
      if (nextAttempts >= 5) {
        // Lock out & invalidate PIN immediately
        transaction.update(userRef, {
          pinAttempts: nextAttempts,
          verificationPin: null
        });
        throw new Error(
          "Incorrect PIN! Maximum failed attempts (5/5) reached. PIN has been locked. Please request Admin to generate a new PIN."
        );
      } else {
        transaction.update(userRef, {
          pinAttempts: nextAttempts
        });
        throw new Error(
          `Incorrect PIN! Please check and try again. (${nextAttempts}/5 failed attempts)`
        );
      }
    }

    // Check 6: Correct PIN -> Approve & Invalidate PIN immediately
    transaction.update(userRef, {
      mobileVerified: true,
      verificationStatus: "approved",
      verificationPin: null,
      pinExpiresAt: null,
      pinAttempts: 0
    });

    return {
      success: true,
      message: "Mobile verification successful! Your account is now fully approved and unlocked."
    };
  });
}

/**
 * Direct Admin Approval for Mobile Verification (Without typing PIN)
 */
export async function adminApproveMobileVerificationDirectly(userId: string): Promise<void> {
  const userRef = doc(db, "users", userId);
  await setDoc(
    userRef,
    {
      mobileVerified: true,
      verificationStatus: "approved",
      verificationPin: null,
      pinExpiresAt: null,
      pinAttempts: 0
    },
    { merge: true }
  );
}

// --- SOLO TRADING ENGINE FIREBASE SERVICES ---

import { SUPPORTED_SOLO_ASSETS, livePriceService, formatAssetPrice } from "./services/livePriceService";

export const DEFAULT_SOLO_CATEGORIES = ["Crypto", "Forex", "Commodities", "Metals", "Indices"];

export const DEFAULT_SOLO_TRADING_CONFIG: SoloTradingConfig = {
  isEnabled: true,
  showPatternRadar: true,
  defaultPayoutPercentage: 85,
  protectedPayoutPercentage: 80,
  standardPayoutPercentage: 85,
  minStake: 10,
  maxStake: 50000,
  allowedDurations: [15, 30, 60, 180, 300],
  drawRule: "REFUND",
  customAssets: SUPPORTED_SOLO_ASSETS,
  categories: DEFAULT_SOLO_CATEGORIES
};

/**
 * Subscribe to Solo Trading Engine configuration in real-time
 */
export function subscribeSoloTradingConfig(callback: (config: SoloTradingConfig) => void) {
  const configRef = doc(db, "app_settings", "solo_trading_config");
  return onSnapshot(
    configRef,
    (snap) => {
      if (snap.exists()) {
        callback({ ...DEFAULT_SOLO_TRADING_CONFIG, ...snap.data() } as SoloTradingConfig);
      } else {
        callback(DEFAULT_SOLO_TRADING_CONFIG);
      }
    },
    (err) => {
      console.warn("Solo config listener error:", err);
      callback(DEFAULT_SOLO_TRADING_CONFIG);
    }
  );
}

/**
 * Update Solo Trading Engine configuration (Admin only)
 */
export async function saveSoloTradingConfig(config: Partial<SoloTradingConfig>): Promise<void> {
  const configRef = doc(db, "app_settings", "solo_trading_config");
  await setDoc(configRef, config, { merge: true });
}

/**
 * Utility to sanitize technical GCP / Firestore / Quota database error messages
 * into clean, user-friendly notices so raw system strings (like project_number) are never shown to users.
 */
export function sanitizeErrorMessage(
  errOrMsg: any,
  fallbackMsg: string = "System is temporarily busy. Please try again in a moment."
): string {
  if (!errOrMsg) return fallbackMsg;
  const rawMsg = typeof errOrMsg === "string" ? errOrMsg : errOrMsg?.message || String(errOrMsg || "");

  if (!rawMsg) return fallbackMsg;

  const lower = rawMsg.toLowerCase();

  // Filter out raw Firestore / GCP / Quota / Transaction technical error strings
  if (
    lower.includes("stored version") ||
    lower.includes("base version") ||
    lower.includes("required base") ||
    lower.includes("does not match") ||
    lower.includes("quota limit exceeded") ||
    lower.includes("quota") ||
    lower.includes("firestore.googleapis.com") ||
    lower.includes("project_number") ||
    lower.includes("resource-exhausted") ||
    lower.includes("resource_exhausted") ||
    lower.includes("free daily read units") ||
    lower.includes("firebaseerror") ||
    lower.includes("589671797496") ||
    lower.includes("deadline_exceeded") ||
    lower.includes("unavailable") ||
    lower.includes("aborted") ||
    lower.includes("failed-precondition") ||
    lower.includes("failed precondition") ||
    lower.includes("contention")
  ) {
    return "⚡ System is temporarily busy due to heavy network traffic. Please try again in a moment.";
  }

  return rawMsg;
}

/**
 * Atomically place a Solo Trade:
 * 1. Validates Admin enablement state
 * 2. Validates mobile verification & balance
 * 3. Locks live entry price
 * 4. Deducts stake from availableBalance and balance
 * 5. Saves running trade in 'solo_trades' collection
 * 6. Logs wallet transaction 'TRADE_INVEST'
 */
export async function placeSoloTrade(
  userId: string,
  tradeType: SoloTradeType,
  stake: number,
  entryPrice: number,
  durationSeconds: number,
  assetPair: string,
  tradingSymbol: string,
  customPayoutPercentage?: number,
  clientStartTimeISO?: string,
  clientEndTimeISO?: string,
  drawRuleParam?: "REFUND" | "LOSS"
): Promise<string> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("⚠️ Internet Disconnected: Cannot place trade while offline. Please check your internet connection.");
  }
  const tradeId = "solo_tx_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
  const userRef = doc(db, "users", userId);
  const tradeRef = doc(db, "solo_trades", tradeId);
  const walletTxId = "tx_solo_inv_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
  const walletTxRef = doc(db, "wallet_transactions", walletTxId);
  let activeDrawRule = drawRuleParam;
  if (!activeDrawRule) {
    try {
      const configSnap = await getDoc(doc(db, "app_settings", "solo_trading_config"));
      if (configSnap.exists()) {
        activeDrawRule = configSnap.data()?.drawRule || "REFUND";
      }
    } catch {
      activeDrawRule = "REFUND";
    }
  }
  if (!activeDrawRule) activeDrawRule = "REFUND";

  console.log(`[Firestore Write / Trade Placement] Creating ${tradeType} trade for ${userId} on ${assetPair} (${tradingSymbol}), stake=₹${stake}, duration=${durationSeconds}s, entryPrice=${entryPrice}`);

  try {
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      throw new Error("User profile not found");
    }
    const user = userSnap.data() as UserProfile;

    if (!isUserMobileVerified(user)) {
      throw new Error("Mobile Verification Required! Trading is locked until your mobile number is verified. Please verify in Profile Settings.");
    }

    const currAvail = user.availableBalance ?? user.balance ?? 0;
    if (currAvail < stake) {
      throw new Error(`Insufficient Available Balance! You have ₹${currAvail.toFixed(2)}, but tried to stake ₹${stake}.`);
    }

    const now = new Date();
    const startTimeISO = clientStartTimeISO || now.toISOString();
    const endTimeISO = clientEndTimeISO || new Date(now.getTime() + durationSeconds * 1000).toISOString();

    let payoutPct = customPayoutPercentage && customPayoutPercentage > 0 ? customPayoutPercentage : 85;
    const expectedPayout = stake + (stake * payoutPct) / 100;

    const newSoloTrade: SoloTrade = {
      id: tradeId,
      userId: user.id,
      userEmail: user.email,
      userName: user.name || user.email.split("@")[0],
      tradeType,
      stake,
      entryPrice,
      exitPrice: null,
      payoutPercentage: payoutPct,
      expectedPayout,
      profitOrLoss: null,
      startTime: startTimeISO,
      endTime: endTimeISO,
      durationSeconds,
      status: "RUNNING",
      assetPair,
      tradingSymbol,
      drawRule: activeDrawRule,
      txId: walletTxId
    };

    const walletTx: WalletTransaction = {
      id: walletTxId,
      userId: user.id,
      userEmail: user.email,
      userName: user.name || user.email.split("@")[0],
      type: "TRADE_INVEST",
      amount: stake,
      status: "APPROVED",
      createdAt: startTimeISO,
      balanceBefore: currAvail,
      balanceAfter: Math.max(0, currAvail - stake),
      referenceId: tradeId,
      txDetails: `Solo Option (${tradeType}): ${assetPair} @ ${formatAssetPrice(entryPrice, assetPair)}`
    };

    // Atomic non-blocking writes via increment to avoid transaction contention
    await Promise.all([
      setDoc(tradeRef, newSoloTrade),
      setDoc(walletTxRef, walletTx),
      updateDoc(userRef, {
        availableBalance: increment(-stake),
        balance: increment(-stake)
      })
    ]);

    const newAvail = Math.max(0, currAvail - stake);
    autoRejectInsufficientWithdrawals(user.id, newAvail).catch((e) => {
      console.warn("Auto reject check error:", e);
    });

    console.log(`[Trade Transition] CREATED -> RUNNING: Trade ID ${tradeId} created.`);
    return tradeId;
  } catch (err: any) {
    console.error(`[Firestore Write Error / Trade Placement Failed] Trade ${tradeId}:`, err);
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error("⚠️ Internet Disconnected: Cannot place trade while offline. Please reconnect to the internet.");
    }
    const errMsg = (err?.message || "").toLowerCase();
    if (
      errMsg.includes("quota limit exceeded") ||
      errMsg.includes("quota") ||
      errMsg.includes("firestore.googleapis.com") ||
      errMsg.includes("resource-exhausted") ||
      errMsg.includes("589671797496") ||
      errMsg.includes("stored version") ||
      errMsg.includes("base version") ||
      errMsg.includes("required base") ||
      errMsg.includes("does not match") ||
      errMsg.includes("aborted") ||
      errMsg.includes("failed-precondition") ||
      errMsg.includes("contention")
    ) {
      console.warn("Firestore contention or quota limit hit during placeSoloTrade. Executing trade in local fallback mode...", err);

      let localUser: UserProfile | null = null;
      try {
        const cachedUsers = localStorage.getItem("cached_users");
        if (cachedUsers) {
          const list: UserProfile[] = JSON.parse(cachedUsers);
          localUser = list.find(u => u.id === userId) || null;
        }
      } catch {}

      const avail = localUser ? (localUser.availableBalance ?? localUser.balance ?? 0) : 999999;
      if (avail < stake) {
        throw new Error(`Insufficient Available Balance! You have ₹${avail.toFixed(2)}, but tried to stake ₹${stake}.`);
      }

      let payoutPct = customPayoutPercentage && customPayoutPercentage > 0 ? customPayoutPercentage : 85;
      const expectedPayout = stake + (stake * payoutPct) / 100;
      const now = new Date();
      const startTimeISO = now.toISOString();
      const endTimeISO = new Date(now.getTime() + durationSeconds * 1000).toISOString();

      const fallbackSoloTrade: SoloTrade = {
        id: tradeId,
        userId: userId,
        userEmail: localUser?.email || "trader@example.com",
        userName: localUser?.name || "Trader",
        tradeType,
        stake,
        entryPrice,
        exitPrice: null,
        payoutPercentage: payoutPct,
        expectedPayout,
        profitOrLoss: null,
        startTime: startTimeISO,
        endTime: endTimeISO,
        durationSeconds,
        status: "RUNNING",
        assetPair,
        tradingSymbol,
        drawRule: activeDrawRule,
        txId: walletTxId
      };

      try {
        const existingSolo = localStorage.getItem(`solo_trades_${userId}`);
        const parsed: SoloTrade[] = existingSolo ? JSON.parse(existingSolo) : [];
        const updated = [fallbackSoloTrade, ...parsed];
        localStorage.setItem(`solo_trades_${userId}`, JSON.stringify(updated));
      } catch {}

      if (localUser) {
        localUser.availableBalance = Math.max(0, (localUser.availableBalance ?? localUser.balance ?? 0) - stake);
        localUser.balance = Math.max(0, (localUser.balance ?? 0) - stake);
        try {
          const cachedUsers = localStorage.getItem("cached_users");
          if (cachedUsers) {
            const list: UserProfile[] = JSON.parse(cachedUsers);
            const idx = list.findIndex(u => u.id === userId);
            if (idx !== -1) {
              list[idx] = localUser;
              localStorage.setItem("cached_users", JSON.stringify(list));
            }
          }
        } catch {}
      }

      console.log(`[Trade Transition Local Fallback] Trade ${tradeId} created locally.`);
      return tradeId;
    }

    if (errMsg.includes("project_number") || errMsg.includes("firestore")) {
      throw new Error("⚡ System is temporarily busy. Please try again shortly.");
    }

    throw err;
  }
}

// Local persistent cache for exit prices locked at exact expiration time
export function saveLockedExitPrice(tradeId: string, exitPrice: number) {
  if (!tradeId || typeof exitPrice !== "number" || isNaN(exitPrice)) return;
  try {
    const raw = localStorage.getItem("locked_trade_exit_prices");
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    map[tradeId] = exitPrice;
    localStorage.setItem("locked_trade_exit_prices", JSON.stringify(map));
  } catch {}
}

export function getLockedExitPrice(tradeId: string): number | null {
  if (!tradeId) return null;
  try {
    const raw = localStorage.getItem("locked_trade_exit_prices");
    if (raw) {
      const map: Record<string, number> = JSON.parse(raw);
      if (typeof map[tradeId] === "number" && !isNaN(map[tradeId])) {
        return map[tradeId];
      }
    }
  } catch {}
  return null;
}

export function clearLockedExitPrice(tradeId: string) {
  if (!tradeId) return;
  try {
    const raw = localStorage.getItem("locked_trade_exit_prices");
    if (raw) {
      const map: Record<string, number> = JSON.parse(raw);
      delete map[tradeId];
      localStorage.setItem("locked_trade_exit_prices", JSON.stringify(map));
    }
  } catch {}
}

const settledTradeIdsSet = new Set<string>();

/**
 * Atomically Settle a Solo Trade on timer expiry:
 * Calculates outcome (WON/LOST/DRAW),
 * credits total return if won or draw, logs wallet tx, updates trade status.
 */
export async function settleSoloTrade(
  tradeId: string,
  providedExitPrice?: number
): Promise<{ result: "WON" | "LOST" | "DRAW" | "ALREADY_SETTLED"; profitOrLoss: number; payout: number }> {
  if (settledTradeIdsSet.has(tradeId)) {
    return { result: "ALREADY_SETTLED", profitOrLoss: 0, payout: 0 };
  }

  const lockedPrice = getLockedExitPrice(tradeId);
  const preferredExitPrice = lockedPrice ?? providedExitPrice;

  settledTradeIdsSet.add(tradeId);

  const tradeRef = doc(db, "solo_trades", tradeId);

  console.log(`[Firestore Write / Trade Settlement] Initiating settlement for tradeId=${tradeId} (Locked: ${lockedPrice}, Provided: ${providedExitPrice})`);

  try {
    let outcomeResult: { result: "WON" | "LOST" | "DRAW" | "ALREADY_SETTLED"; profitOrLoss: number; payout: number } = {
      result: "ALREADY_SETTLED",
      profitOrLoss: 0,
      payout: 0
    };

    await runTransaction(db, async (transaction) => {
      const tradeSnap = await transaction.get(tradeRef);
      if (!tradeSnap.exists()) {
        return;
      }
      const trade = tradeSnap.data() as SoloTrade;

      if (trade.status !== "RUNNING") {
        outcomeResult = {
          result: "ALREADY_SETTLED",
          profitOrLoss: trade.profitOrLoss || 0,
          payout: trade.expectedPayout || 0
        };
        return;
      }

      const entry = trade.entryPrice;
      const validPreferred = typeof preferredExitPrice === "number" && !isNaN(preferredExitPrice) && preferredExitPrice > 0 ? preferredExitPrice : null;
      const validDocExit = typeof trade.exitPrice === "number" && !isNaN(trade.exitPrice) && trade.exitPrice > 0 ? trade.exitPrice : null;
      const liveCurrent = livePriceService.getPrice(trade.tradingSymbol);
      const validLive = typeof liveCurrent === "number" && !isNaN(liveCurrent) && liveCurrent > 0 ? liveCurrent : null;

      const exit = validPreferred ?? validDocExit ?? validLive ?? entry;
      let isWin = false;
      let isDraw = false;

      if (trade.tradeType === "CALL") {
        if (exit > entry) {
          isWin = true;
        } else if (exit === entry) {
          isDraw = true;
        }
      } else {
        // PUT
        if (exit < entry) {
          isWin = true;
        } else if (exit === entry) {
          isDraw = true;
        }
      }

      let finalOutcome: "WON" | "LOST" | "DRAW" = "LOST";
      let finalProfitOrLoss = -trade.stake;
      let finalPayout = 0;

      if (isWin) {
        finalOutcome = "WON";
        const profit = (trade.stake * trade.payoutPercentage) / 100;
        finalPayout = trade.stake + profit;
        finalProfitOrLoss = profit;
      } else if (isDraw && trade.drawRule === "REFUND") {
        finalOutcome = "DRAW";
        finalPayout = trade.stake;
        finalProfitOrLoss = 0;
      } else {
        finalOutcome = "LOST";
        finalPayout = 0;
        finalProfitOrLoss = -trade.stake;
      }

      const settledIso = new Date().toISOString();
      const userRef = doc(db, "users", trade.userId);

      // 1. Atomically update trade status inside transaction
      transaction.update(tradeRef, {
        status: finalOutcome,
        exitPrice: exit,
        profitOrLoss: finalProfitOrLoss,
        settledAt: settledIso
      });

      // 2. Atomically update user balance ONLY IF finalPayout > 0
      if (finalPayout > 0) {
        transaction.update(userRef, {
          availableBalance: increment(finalPayout),
          balance: increment(finalPayout)
        });

        const settleTxId = "tx_solo_set_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
        const settleTxRef = doc(db, "wallet_transactions", settleTxId);

        const walletTx: WalletTransaction = {
          id: settleTxId,
          userId: trade.userId,
          userEmail: trade.userEmail,
          userName: trade.userName,
          type: finalOutcome === "WON" ? "TRADE_PROFIT" : finalOutcome === "DRAW" ? "TRADE_REFUND" : "TRADE_LOSS",
          amount: finalPayout > 0 ? finalPayout : trade.stake,
          status: "APPROVED",
          createdAt: settledIso,
          referenceId: tradeId,
          txDetails: `Solo Option Settled (${finalOutcome}): Entry ${entry.toFixed(2)} -> Exit ${exit.toFixed(2)} (${trade.assetPair})`
        };
        transaction.set(settleTxRef, walletTx);
      }

      outcomeResult = { result: finalOutcome, profitOrLoss: finalProfitOrLoss, payout: finalPayout };
    });

    console.log(`[Trade Transition] RUNNING -> ${outcomeResult.result}: Trade ${tradeId} settled. Payout: ₹${outcomeResult.payout.toFixed(2)}`);
    return outcomeResult;
  } catch (err) {
    settledTradeIdsSet.delete(tradeId);
    console.error(`[Firestore Write Error / Trade Settlement Failed] Trade ${tradeId}:`, err);
    throw err;
  }
}

const autoSettlingTradeIds = new Set<string>();

export function autoSettleExpiredTrades(trades: SoloTrade[]) {
  const now = Date.now();
  trades.forEach((t) => {
    if (t.status === "RUNNING" && !t.id.startsWith("temp_") && !t.id.startsWith("tx_solo_inv_")) {
      const endTime = new Date(t.endTime).getTime();
      if (now >= endTime && !autoSettlingTradeIds.has(t.id) && !settledTradeIdsSet.has(t.id)) {
        autoSettlingTradeIds.add(t.id);
        const lockedPrice = getLockedExitPrice(t.id);
        const exitPrice = lockedPrice ?? t.exitPrice ?? livePriceService.getPrice(t.tradingSymbol);
        console.log(`[Background Auto-Settling] Trade ${t.id} expired at ${t.endTime}. Auto-settling with exit price ${exitPrice} (Locked: ${lockedPrice})...`);
        settleSoloTrade(t.id, exitPrice)
          .then(() => {
            clearLockedExitPrice(t.id);
          })
          .catch((err) => {
            console.warn(`[Background Auto-Settling Error] Trade ${t.id}:`, err);
            autoSettlingTradeIds.delete(t.id);
          });
      }
    }
  });
}

/**
 * Deduplicate local fallback trades against remote Firestore trades
 */
function deduplicateSoloTrades(remoteList: SoloTrade[], localList: SoloTrade[]): SoloTrade[] {
  const result: SoloTrade[] = [...remoteList];
  const remoteIds = new Set(remoteList.map((r) => r.id));

  localList.forEach((local) => {
    if (remoteIds.has(local.id)) return;

    // Check if a matching remote trade exists (same user, symbol, type, stake, within 15s)
    const existsByFuzzy = remoteList.some((remote) => {
      const isSameUser = remote.userId === local.userId;
      const isSameSymbol = (remote.tradingSymbol || remote.assetPair) === (local.tradingSymbol || local.assetPair);
      const isSameType = remote.tradeType === local.tradeType;
      const isSameStake = Math.abs(remote.stake - local.stake) < 0.01;
      const timeDiff = Math.abs(new Date(remote.startTime).getTime() - new Date(local.startTime).getTime());
      return isSameUser && isSameSymbol && isSameType && isSameStake && timeDiff < 15000;
    });

    if (!existsByFuzzy) {
      result.push(local);
    }
  });

  return result.sort((a, b) => new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime());
}

/**
 * Subscribe to current user's solo trades
 */
export function subscribeUserSoloTrades(userId: string, callback: (trades: SoloTrade[]) => void) {
  console.log(`[Firestore Read / Listener] Subscribing to solo_trades for userId=${userId}`);

  const q = query(
    collection(db, "solo_trades"),
    where("userId", "==", userId)
  );

  const getCombined = (remoteList: SoloTrade[]): SoloTrade[] => {
    let localList: SoloTrade[] = [];
    try {
      const stored = localStorage.getItem(`solo_trades_${userId}`);
      if (stored) {
        localList = JSON.parse(stored);
      }
    } catch {}

    return deduplicateSoloTrades(remoteList, localList);
  };

  return onSnapshot(
    q,
    (snapshot) => {
      const list: SoloTrade[] = [];
      snapshot.forEach((d) => list.push(d.data() as SoloTrade));
      const combined = getCombined(list);
      console.log(`[Firestore Read] Received ${snapshot.size} remote solo_trades for userId=${userId}. Combined total: ${combined.length}`);
      autoSettleExpiredTrades(combined);
      callback(combined);
    },
    (err) => {
      console.warn(`[Firestore Read Warning] User solo trades listener for ${userId}:`, err);
      const combined = getCombined([]);
      autoSettleExpiredTrades(combined);
      callback(combined);
    }
  );
}

/**
 * Subscribe to all solo trades (for Admin)
 */
export function subscribeAllSoloTrades(callback: (trades: SoloTrade[]) => void) {
  console.log(`[Firestore Read / Listener] Subscribing to all solo_trades (Admin view)`);
  const q = query(
    collection(db, "solo_trades"),
    orderBy("startTime", "desc"),
    limit(500)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list: SoloTrade[] = [];
      snapshot.forEach((d) => list.push(d.data() as SoloTrade));

      const localList: SoloTrade[] = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("solo_trades_")) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed: SoloTrade[] = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                localList.push(...parsed);
              }
            }
          }
        }
      } catch (err) {
        console.warn("Local solo trades read notice:", err);
      }

      const combined = deduplicateSoloTrades(list, localList);
      console.log(`[Firestore Read] Admin view received ${list.length} remote, total combined ${combined.length} solo_trades`);
      autoSettleExpiredTrades(combined);
      callback(combined);
    },
    (err) => {
      console.warn("[Firestore Read Warning] All solo trades listener error:", err);
      const localList: SoloTrade[] = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("solo_trades_")) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed: SoloTrade[] = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                localList.push(...parsed);
              }
            }
          }
        }
      } catch {}
      localList.sort((a, b) => new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime());
      callback(localList);
    }
  );
}

/**
 * Default Footer Text
 */
export const DEFAULT_FOOTER_TEXT = "2026 Shared Trade Pool Manager — Powered by Multi-User Sandboxed Simulation Engine & Secure Real-Time Firebase Ledger.";

/**
 * Platform Title & Tagline Branding Settings
 */
export interface BrandingSettings {
  appTitle: string;
  appTagline: string;
  loginTagline?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_BRANDING_SETTINGS: BrandingSettings = {
  appTitle: "Shared Trade Pool",
  appTagline: "Fractional Trade Platform",
  loginTagline: "Sandbox Trading Terminal",
};

/**
 * Subscribe to Branding Settings (Title, Tagline) in real-time
 */
export function subscribeBrandingSettings(callback: (branding: BrandingSettings) => void) {
  const brandingRef = doc(db, "app_settings", "branding_settings");
  return onSnapshot(
    brandingRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        callback({
          appTitle: data?.appTitle || DEFAULT_BRANDING_SETTINGS.appTitle,
          appTagline: data?.appTagline || DEFAULT_BRANDING_SETTINGS.appTagline,
          loginTagline: data?.loginTagline || DEFAULT_BRANDING_SETTINGS.loginTagline,
          updatedAt: data?.updatedAt,
          updatedBy: data?.updatedBy,
        });
      } else {
        callback(DEFAULT_BRANDING_SETTINGS);
      }
    },
    (err) => {
      console.warn("Branding settings listener error:", err);
      callback(DEFAULT_BRANDING_SETTINGS);
    }
  );
}

/**
 * Update Platform Title & Tagline (Admin only)
 */
export async function updateBrandingSettings(newBranding: Partial<BrandingSettings>): Promise<void> {
  const brandingRef = doc(db, "app_settings", "branding_settings");
  const payload: BrandingSettings = {
    appTitle: newBranding.appTitle?.trim() || DEFAULT_BRANDING_SETTINGS.appTitle,
    appTagline: newBranding.appTagline?.trim() || DEFAULT_BRANDING_SETTINGS.appTagline,
    loginTagline: newBranding.loginTagline?.trim() || DEFAULT_BRANDING_SETTINGS.loginTagline,
    updatedAt: new Date().toISOString(),
    updatedBy: "amaizy1@gmail.com",
  };

  await setDoc(brandingRef, payload, { merge: true });

  await logAdminAction(
    "UPDATE_BRANDING_SETTINGS",
    `Updated platform branding: Title="${payload.appTitle}", Tagline="${payload.appTagline}", Login Tagline="${payload.loginTagline}"`
  );
}

/**
 * Subscribe to Footer Text configuration in real-time
 */
export function subscribeFooterText(callback: (footerText: string) => void) {
  const footerRef = doc(db, "app_settings", "footer_settings");
  return onSnapshot(
    footerRef,
    (snap) => {
      if (snap.exists() && snap.data()?.footerText) {
        callback(snap.data().footerText);
      } else {
        callback(DEFAULT_FOOTER_TEXT);
      }
    },
    (err) => {
      console.warn("Footer settings listener error:", err);
      callback(DEFAULT_FOOTER_TEXT);
    }
  );
}

/**
 * Update Footer Text (Admin only)
 */
export async function updateFooterText(newFooterText: string): Promise<void> {
  const footerRef = doc(db, "app_settings", "footer_settings");
  await setDoc(footerRef, {
    footerText: newFooterText,
    updatedAt: new Date().toISOString(),
    updatedBy: "amaizy1@gmail.com"
  }, { merge: true });

  await logAdminAction(
    "UPDATE_FOOTER_TEXT",
    `Updated platform footer text to: "${newFooterText}"`
  );
}

// ========================================================
// WALLET-TO-WALLET BALANCE TRANSFER SERVICE & ATOMIC LOGIC
// ========================================================

export const DEFAULT_TRANSFER_CONFIG: WalletTransferConfig = {
  isEnabled: true,
  minTransferAmount: 10,
  maxTransferAmount: 50000,
  dailyTransferLimit: 100000,
  transferFeePercentage: 0,
  allowSelfTransfer: false
};

/**
  * Subscribe to global Wallet Transfer Configuration in real-time
  */
export function subscribeTransferConfig(callback: (config: WalletTransferConfig) => void) {
  const configRef = doc(db, "app_settings", "transfer_config");
  return onSnapshot(
    configRef,
    (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        callback({
          isEnabled: typeof d.isEnabled === "boolean" ? d.isEnabled : DEFAULT_TRANSFER_CONFIG.isEnabled,
          minTransferAmount: typeof d.minTransferAmount === "number" && !isNaN(d.minTransferAmount) ? d.minTransferAmount : DEFAULT_TRANSFER_CONFIG.minTransferAmount,
          maxTransferAmount: typeof d.maxTransferAmount === "number" && !isNaN(d.maxTransferAmount) ? d.maxTransferAmount : DEFAULT_TRANSFER_CONFIG.maxTransferAmount,
          dailyTransferLimit: typeof d.dailyTransferLimit === "number" && !isNaN(d.dailyTransferLimit) ? d.dailyTransferLimit : DEFAULT_TRANSFER_CONFIG.dailyTransferLimit,
          transferFeePercentage: typeof d.transferFeePercentage === "number" && !isNaN(d.transferFeePercentage) ? d.transferFeePercentage : DEFAULT_TRANSFER_CONFIG.transferFeePercentage,
          allowSelfTransfer: typeof d.allowSelfTransfer === "boolean" ? d.allowSelfTransfer : DEFAULT_TRANSFER_CONFIG.allowSelfTransfer,
          updatedAt: d.updatedAt,
          updatedBy: d.updatedBy
        });
      } else {
        callback(DEFAULT_TRANSFER_CONFIG);
      }
    },
    (err) => {
      console.warn("Transfer config subscription error:", err);
      callback(DEFAULT_TRANSFER_CONFIG);
    }
  );
}

/**
 * Save Global Wallet-to-Wallet Transfer Settings
 */
export async function saveTransferConfig(
  config: Partial<WalletTransferConfig>,
  adminInfo?: { name: string; email: string }
): Promise<void> {
  const configRef = doc(db, "app_settings", "transfer_config");
  const dataToSave: WalletTransferConfig = {
    isEnabled: config.isEnabled ?? DEFAULT_TRANSFER_CONFIG.isEnabled,
    minTransferAmount: config.minTransferAmount ?? DEFAULT_TRANSFER_CONFIG.minTransferAmount,
    maxTransferAmount: config.maxTransferAmount ?? DEFAULT_TRANSFER_CONFIG.maxTransferAmount,
    dailyTransferLimit: config.dailyTransferLimit ?? DEFAULT_TRANSFER_CONFIG.dailyTransferLimit,
    transferFeePercentage: config.transferFeePercentage ?? DEFAULT_TRANSFER_CONFIG.transferFeePercentage,
    allowSelfTransfer: config.allowSelfTransfer ?? DEFAULT_TRANSFER_CONFIG.allowSelfTransfer,
    updatedAt: new Date().toISOString(),
    updatedBy: adminInfo?.email || "Admin"
  };

  await setDoc(configRef, dataToSave, { merge: true });

  if (adminInfo) {
    await logAdminAction(
      "UPDATE_TRANSFER_CONFIG",
      `Wallet Transfer Config updated: ${dataToSave.isEnabled ? 'ENABLED' : 'DISABLED'} (Min: ₹${dataToSave.minTransferAmount}, Max: ₹${dataToSave.maxTransferAmount})`,
      "SUCCESS",
      "P2P Transfer Settings",
      0
    );
  }
}

/**
 * Freeze or Enable Wallet Transfer permission for a specific user
 */
export async function toggleUserTransferStatus(
  userId: string,
  isTransferDisabled: boolean,
  adminInfo?: { name: string; email: string }
): Promise<void> {
  const userRef = doc(db, "users", userId);
  await setDoc(userRef, { isTransferDisabled }, { merge: true });

  if (adminInfo) {
    await logAdminAction(
      isTransferDisabled ? "FREEZE_USER_TRANSFERS" : "UNFREEZE_USER_TRANSFERS",
      `Wallet transfers ${isTransferDisabled ? 'DISABLED' : 'ENABLED'} for user ${userId}`,
      "SUCCESS",
      `User ${userId}`,
      0
    );
  }
}

/**
 * Search recipient by User ID, email, mobile number, or username
 */
export async function searchRecipientForTransfer(queryInput: string): Promise<UserProfile | null> {
  const clean = queryInput.trim();
  if (!clean) return null;

  try {
    // 1. Direct doc ID lookup
    const userRef = doc(db, "users", clean);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return normalizeUserProfile(snap.data());
    }

    // 2. Query exact email
    const usersRef = collection(db, "users");
    const qEmail = query(usersRef, where("email", "==", clean.toLowerCase()));
    const snapEmail = await getDocs(qEmail);
    if (!snapEmail.empty) {
      return normalizeUserProfile(snapEmail.docs[0].data());
    }

    // 3. Scan all users for phone or username match
    const allSnap = await getDocs(usersRef);
    const normDigits = normalizePhoneDigits(clean);
    let matched: UserProfile | null = null;

    allSnap.forEach((docSnap) => {
      if (matched) return;
      const u = normalizeUserProfile(docSnap.data());
      if (u.id === clean) {
        matched = u;
      } else if (u.email && u.email.toLowerCase() === clean.toLowerCase()) {
        matched = u;
      } else if (normDigits && u.phone && normalizePhoneDigits(u.phone) === normDigits) {
        matched = u;
      } else if (u.name && u.name.trim().toLowerCase() === clean.toLowerCase()) {
        matched = u;
      }
    });

    if (matched) return matched;

    // 4. Fallback search inside default users
    const defaultMatched = DEFAULT_USERS.find(
      u => u.id === clean || 
           u.email.toLowerCase() === clean.toLowerCase() || 
           (normDigits && u.phone && normalizePhoneDigits(u.phone) === normDigits) ||
           u.name.toLowerCase() === clean.toLowerCase()
    );

    return defaultMatched ? normalizeUserProfile(defaultMatched) : null;
  } catch (err) {
    console.warn("Recipient search error:", err);
    return null;
  }
}

/**
 * Log a transfer audit attempt (successful or failed)
 */
async function logTransferAuditAttempt(data: {
  transferId?: string;
  senderId: string;
  senderEmail?: string;
  recipientId?: string;
  recipientEmail?: string;
  amount: number;
  status: "SUCCESS" | "FAILED" | "BLOCKED";
  failureReason?: string;
  notes?: string;
}) {
  try {
    const auditRef = doc(collection(db, "transfer_audit_logs"));
    await setDoc(auditRef, {
      id: auditRef.id,
      ...data,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Failed to write transfer audit log:", err);
  }
}

/**
 * Execute an Atomic Wallet-to-Wallet Balance Transfer
 */
export async function executeWalletTransfer(
  senderId: string,
  recipientQueryOrId: string,
  amount: number,
  transferNote?: string
): Promise<{ success: boolean; message: string; transactionId?: string }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { success: false, message: "⚠️ Internet Disconnected: Cannot execute wallet transfer while offline. Please check your internet connection." };
  }
  // Client pre-validations
  const parsedAmount = Number(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return { success: false, message: "Invalid transfer amount! Amount must be greater than zero." };
  }

  const cleanNote = (transferNote || "").trim();

  // Find recipient first to get recipient ID
  const recipient = await searchRecipientForTransfer(recipientQueryOrId);
  if (!recipient) {
    await logTransferAuditAttempt({
      senderId,
      amount: parsedAmount,
      status: "FAILED",
      failureReason: `Recipient '${recipientQueryOrId}' not found`,
      notes: "Recipient user search failed"
    });
    return { success: false, message: `Recipient user '${recipientQueryOrId}' not found in the platform.` };
  }

  if (senderId === recipient.id) {
    await logTransferAuditAttempt({
      senderId,
      recipientId: recipient.id,
      amount: parsedAmount,
      status: "FAILED",
      failureReason: "Self-transfer attempted",
      notes: "Cannot transfer balance to own account"
    });
    return { success: false, message: "Cannot transfer wallet balance to your own account." };
  }

  try {
    const transferId = "w2w_" + Date.now() + "_" + Math.floor(100000 + Math.random() * 900000);
    const nowISO = new Date().toISOString();

    // Perform atomic transaction in Firestore
    await runTransaction(db, async (transaction) => {
      // 1. Fetch Global Transfer Config
      const configRef = doc(db, "app_settings", "transfer_config");
      const configSnap = await transaction.get(configRef);
      const config: WalletTransferConfig = configSnap.exists()
        ? (configSnap.data() as WalletTransferConfig)
        : DEFAULT_TRANSFER_CONFIG;

      if (config.isEnabled === false) {
        throw new Error("Wallet-to-Wallet balance transfer feature is currently deactivated by Admin.");
      }

      if (parsedAmount < config.minTransferAmount) {
        throw new Error(`Transfer amount is below minimum limit of ₹${config.minTransferAmount}.`);
      }

      if (parsedAmount > config.maxTransferAmount) {
        throw new Error(`Transfer amount exceeds maximum limit of ₹${config.maxTransferAmount} per transfer.`);
      }

      // 2. Fetch Sender Profile inside transaction
      const senderRef = doc(db, "users", senderId);
      const senderSnap = await transaction.get(senderRef);
      
      let senderData: UserProfile;
      if (!senderSnap.exists()) {
        const defUser = DEFAULT_USERS.find(u => u.id === senderId);
        if (!defUser) throw new Error("Sender account not found in database.");
        senderData = defUser;
        // Initialize default user doc if missing
        transaction.set(senderRef, defUser);
      } else {
        senderData = normalizeUserProfile(senderSnap.data());
      }

      if (senderData.isBlocked) {
        throw new Error("Your account is currently suspended/blocked.");
      }

      if (senderData.isTransferDisabled) {
        throw new Error("Wallet transfers are disabled for your account by Admin.");
      }

      const senderAvail = senderData.availableBalance ?? senderData.balance ?? 0;
      if (senderAvail < parsedAmount) {
        throw new Error(`Insufficient wallet balance! Available: ₹${senderAvail.toFixed(2)}.`);
      }

      // 3. Fetch Recipient Profile inside transaction
      const recipientRef = doc(db, "users", recipient.id);
      const recipientSnap = await transaction.get(recipientRef);

      let recipientData: UserProfile;
      if (!recipientSnap.exists()) {
        recipientData = recipient;
        transaction.set(recipientRef, recipient);
      } else {
        recipientData = normalizeUserProfile(recipientSnap.data());
      }

      if (recipientData.isBlocked) {
        throw new Error("Recipient account is blocked and cannot receive transfers.");
      }

      if (recipientData.isTransferDisabled) {
        throw new Error("Recipient account is currently disabled for P2P transfers.");
      }

      // 4. Compute exact updated balances
      const senderNewAvail = senderAvail - parsedAmount;
      const senderNewBalance = (senderData.balance ?? 0) - parsedAmount;

      const recipientAvail = recipientData.availableBalance ?? recipientData.balance ?? 0;
      const recipientNewAvail = recipientAvail + parsedAmount;
      const recipientNewBalance = (recipientData.balance ?? 0) + parsedAmount;

      // 5. Update balances atomically
      transaction.update(senderRef, {
        availableBalance: senderNewAvail,
        balance: senderNewBalance
      });

      transaction.update(recipientRef, {
        availableBalance: recipientNewAvail,
        balance: recipientNewBalance
      });

      // 6. Create Sender & Recipient Wallet Transaction Records
      const senderTxId = `tx_send_${transferId}`;
      const recipientTxId = `tx_recv_${transferId}`;

      const senderTxDoc: WalletTransaction = {
        id: senderTxId,
        userId: senderData.id,
        userEmail: senderData.email || "sender@example.com",
        userName: senderData.name || senderData.email?.split("@")[0] || "Trader",
        type: "TRANSFER_SENT",
        amount: parsedAmount,
        status: "APPROVED",
        createdAt: nowISO,
        balanceBefore: senderData.balance ?? 0,
        balanceAfter: senderNewBalance,
        referenceId: transferId,
        counterpartyUserId: recipientData.id,
        counterpartyName: recipientData.name || recipientData.email?.split("@")[0] || "Recipient",
        counterpartyEmail: recipientData.email,
        transferNote: cleanNote,
        txDetails: `Transferred ₹${parsedAmount.toFixed(2)} to ${recipientData.name || recipientData.email} (${recipientData.id})${cleanNote ? ` • Note: ${cleanNote}` : ""}`
      };

      const recipientTxDoc: WalletTransaction = {
        id: recipientTxId,
        userId: recipientData.id,
        userEmail: recipientData.email || "recipient@example.com",
        userName: recipientData.name || recipientData.email?.split("@")[0] || "Trader",
        type: "TRANSFER_RECEIVED",
        amount: parsedAmount,
        status: "APPROVED",
        createdAt: nowISO,
        balanceBefore: recipientData.balance ?? 0,
        balanceAfter: recipientNewBalance,
        referenceId: transferId,
        counterpartyUserId: senderData.id,
        counterpartyName: senderData.name || senderData.email?.split("@")[0] || "Sender",
        counterpartyEmail: senderData.email,
        transferNote: cleanNote,
        txDetails: `Received ₹${parsedAmount.toFixed(2)} from ${senderData.name || senderData.email} (${senderData.id})${cleanNote ? ` • Note: ${cleanNote}` : ""}`
      };

      transaction.set(doc(db, "wallet_transactions", senderTxId), senderTxDoc);
      transaction.set(doc(db, "wallet_transactions", recipientTxId), recipientTxDoc);

      // 7. Save master Wallet Transfer Record
      const transferRecord: WalletTransferRecord = {
        id: transferId,
        senderId: senderData.id,
        senderEmail: senderData.email,
        senderName: senderData.name || senderData.email?.split("@")[0] || "Sender",
        recipientId: recipientData.id,
        recipientEmail: recipientData.email,
        recipientName: recipientData.name || recipientData.email?.split("@")[0] || "Recipient",
        amount: parsedAmount,
        status: "SUCCESS",
        createdAt: nowISO,
        transferNote: cleanNote,
        txDetails: `Transferred ₹${parsedAmount.toFixed(2)} from ${senderData.name || senderData.email} to ${recipientData.name || recipientData.email}`
      };

      transaction.set(doc(db, "wallet_transfers", transferId), transferRecord);

      // 8. Log Success in Transfer Audit Logs
      const auditDocRef = doc(collection(db, "transfer_audit_logs"));
      transaction.set(auditDocRef, {
        id: auditDocRef.id,
        transferId,
        senderId: senderData.id,
        senderEmail: senderData.email,
        recipientId: recipientData.id,
        recipientEmail: recipientData.email,
        amount: parsedAmount,
        status: "SUCCESS",
        timestamp: nowISO,
        notes: `Transfer ₹${parsedAmount.toFixed(2)} completed successfully`
      });

      // 9. Send Real-time system notifications to both users
      const msgRecipientRef = doc(collection(db, "support_messages"));
      transaction.set(msgRecipientRef, {
        id: `msg_recv_${transferId}`,
        userId: recipientData.id,
        userEmail: recipientData.email,
        userName: recipientData.name || recipientData.email?.split("@")[0] || "Trader",
        subject: "💸 Received Wallet Balance Transfer",
        message: `You have received ₹${parsedAmount.toFixed(2)} in your wallet from ${senderData.name || senderData.email}.${cleanNote ? ` Note: "${cleanNote}"` : ""} TxID: ${transferId}`,
        status: "RESOLVED",
        createdAt: nowISO
      });

      const msgSenderRef = doc(collection(db, "support_messages"));
      transaction.set(msgSenderRef, {
        id: `msg_send_${transferId}`,
        userId: senderData.id,
        userEmail: senderData.email,
        userName: senderData.name || senderData.email?.split("@")[0] || "Trader",
        subject: "📤 Wallet Transfer Sent",
        message: `Successfully transferred ₹${parsedAmount.toFixed(2)} to ${recipientData.name || recipientData.email} (${recipientData.id}). TxID: ${transferId}`,
        status: "RESOLVED",
        createdAt: nowISO
      });
    });

    return {
      success: true,
      message: `Successfully transferred ₹${parsedAmount.toFixed(2)} to ${recipient.name || recipient.email}!`,
      transactionId: `w2w_${transferId}`
    };
  } catch (err: any) {
    console.error("Wallet Transfer Transaction failed:", err);
    const failureMsg = err.message || "Wallet transfer failed due to transaction conflict or network issue.";
    
    await logTransferAuditAttempt({
      senderId,
      recipientId: recipient.id,
      amount: parsedAmount,
      status: "FAILED",
      failureReason: failureMsg,
      notes: "Atomic transaction error"
    });

    return { success: false, message: failureMsg };
  }
}

/**
 * Subscribe to all Wallet Transfers (Admin View)
 */
export function subscribeWalletTransfers(callback: (transfers: WalletTransferRecord[]) => void) {
  try {
    const q = query(collection(db, "wallet_transfers"), orderBy("createdAt", "desc"), limit(200));
    return onSnapshot(
      q,
      (snap) => {
        const list: WalletTransferRecord[] = [];
        snap.forEach((d) => list.push(d.data() as WalletTransferRecord));
        callback(list);
      },
      (err) => {
        console.warn("Wallet transfers listener fallback:", err);
        callback([]);
      }
    );
  } catch {
    callback([]);
    return () => {};
  }
}

/**
 * Subscribe to Transfer Audit Logs (Admin Audit)
 */
export function subscribeTransferAuditLogs(callback: (logs: TransferAuditLog[]) => void) {
  try {
    const q = query(collection(db, "transfer_audit_logs"), orderBy("timestamp", "desc"), limit(200));
    return onSnapshot(
      q,
      (snap) => {
        const list: TransferAuditLog[] = [];
        snap.forEach((d) => list.push(d.data() as TransferAuditLog));
        callback(list);
      },
      (err) => {
        console.warn("Transfer audit logs listener fallback:", err);
        callback([]);
      }
    );
  } catch {
    callback([]);
    return () => {};
  }
}




