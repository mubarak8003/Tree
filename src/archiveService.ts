import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  getDoc,
  setDoc
} from "firebase/firestore";
import { db } from "./firebase";
import {
  WalletTransaction,
  SoloTrade,
  ArchivedWalletTransaction,
  ArchivedSoloTrade,
  DatabaseArchiveHealthStats
} from "./types";

const ARCHIVE_METADATA_DOC = "archive_metadata";
const ACTIVE_RETENTION_MONTHS = 12; // 12 Months retention in active DB
const ARCHIVE_CLEANUP_MONTHS = 24; // 24 Months permanent deletion from archive DB

/**
 * Helper to compute cutoff ISO date string N months ago
 */
function getCutoffDate(monthsAgo: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return d;
}

/**
 * Runs the database lifecycle management:
 * 1. Moves completed transactions & trades older than 12 months to Archive collections.
 * 2. Permanently deletes archive records older than 24 months.
 * 3. Never touches open trades, pending deposits/withdrawals, or user balances.
 */
export async function runDatabaseArchivingAndCleanup(forceRun = false): Promise<{
  txArchived: number;
  tradesArchived: number;
  txDeleted: number;
  tradesDeleted: number;
}> {
  try {
    // Throttling check: Only run once per hour unless forceRun is true
    const metaRef = doc(db, "app_settings", ARCHIVE_METADATA_DOC);
    const metaSnap = await getDoc(metaRef);
    const now = Date.now();

    if (!forceRun && metaSnap.exists()) {
      const lastRun = metaSnap.data()?.lastRunTimestamp || 0;
      if (now - lastRun < 60 * 60 * 1000) {
        // Ran less than 1 hour ago
        return { txArchived: 0, tradesArchived: 0, txDeleted: 0, tradesDeleted: 0 };
      }
    }

    const twelveMonthsCutoff = getCutoffDate(ACTIVE_RETENTION_MONTHS).toISOString();
    const twentyFourMonthsCutoff = getCutoffDate(ARCHIVE_CLEANUP_MONTHS).toISOString();

    let txArchivedCount = 0;
    let tradesArchivedCount = 0;
    let txDeletedCount = 0;
    let tradesDeletedCount = 0;

    // -------------------------------------------------------------
    // TASK A: Archive Completed Wallet Transactions older than 12 Months
    // -------------------------------------------------------------
    const activeTxCol = collection(db, "wallet_transactions");
    const oldTxQuery = query(
      activeTxCol,
      where("createdAt", "<=", twelveMonthsCutoff),
      limit(200)
    );
    const oldTxSnap = await getDocs(oldTxQuery);

    if (!oldTxSnap.empty) {
      let batch = writeBatch(db);
      let batchOpCount = 0;

      for (const txDoc of oldTxSnap.docs) {
        const txData = txDoc.data() as WalletTransaction;
        // CRITICAL DATA INTEGRITY CHECK: Never archive PENDING transactions!
        if (txData.status === "PENDING") {
          continue;
        }

        const archiveRef = doc(db, "archived_wallet_transactions", txDoc.id);
        const archivedRecord: ArchivedWalletTransaction = {
          ...txData,
          archivedAt: new Date().toISOString()
        };

        // Atomic write to archive + delete from active
        batch.set(archiveRef, archivedRecord);
        batch.delete(txDoc.ref);
        batchOpCount += 2;
        txArchivedCount++;

        // Commit batch every 400 operations (Firestore batch limit is 500)
        if (batchOpCount >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          batchOpCount = 0;
        }
      }

      if (batchOpCount > 0) {
        await batch.commit();
      }
    }

    // -------------------------------------------------------------
    // TASK B: Archive Completed Solo Trades older than 12 Months
    // -------------------------------------------------------------
    const activeTradesCol = collection(db, "solo_trades");
    const oldTradesQuery = query(
      activeTradesCol,
      where("startTime", "<=", twelveMonthsCutoff),
      limit(200)
    );
    const oldTradesSnap = await getDocs(oldTradesQuery);

    if (!oldTradesSnap.empty) {
      let batch = writeBatch(db);
      let batchOpCount = 0;

      for (const tradeDoc of oldTradesSnap.docs) {
        const tradeData = tradeDoc.data() as SoloTrade;
        // CRITICAL DATA INTEGRITY CHECK: Never archive RUNNING trades!
        if (tradeData.status === "RUNNING") {
          continue;
        }

        const archiveRef = doc(db, "archived_solo_trades", tradeDoc.id);
        const archivedRecord: ArchivedSoloTrade = {
          ...tradeData,
          archivedAt: new Date().toISOString()
        };

        // Atomic write to archive + delete from active
        batch.set(archiveRef, archivedRecord);
        batch.delete(tradeDoc.ref);
        batchOpCount += 2;
        tradesArchivedCount++;

        if (batchOpCount >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          batchOpCount = 0;
        }
      }

      if (batchOpCount > 0) {
        await batch.commit();
      }
    }

    // -------------------------------------------------------------
    // TASK C: Permanently Delete Archived Records older than 24 Months
    // -------------------------------------------------------------
    // C1: Archived Wallet Transactions > 24 Months
    const archivedTxCol = collection(db, "archived_wallet_transactions");
    const expireTxQuery = query(
      archivedTxCol,
      where("createdAt", "<=", twentyFourMonthsCutoff),
      limit(200)
    );
    const expireTxSnap = await getDocs(expireTxQuery);

    if (!expireTxSnap.empty) {
      let batch = writeBatch(db);
      let batchOpCount = 0;

      for (const d of expireTxSnap.docs) {
        batch.delete(d.ref);
        batchOpCount++;
        txDeletedCount++;

        if (batchOpCount >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          batchOpCount = 0;
        }
      }

      if (batchOpCount > 0) {
        await batch.commit();
      }
    }

    // C2: Archived Solo Trades > 24 Months
    const archivedTradesCol = collection(db, "archived_solo_trades");
    const expireTradesQuery = query(
      archivedTradesCol,
      where("startTime", "<=", twentyFourMonthsCutoff),
      limit(200)
    );
    const expireTradesSnap = await getDocs(expireTradesQuery);

    if (!expireTradesSnap.empty) {
      let batch = writeBatch(db);
      let batchOpCount = 0;

      for (const d of expireTradesSnap.docs) {
        batch.delete(d.ref);
        batchOpCount++;
        tradesDeletedCount++;

        if (batchOpCount >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          batchOpCount = 0;
        }
      }

      if (batchOpCount > 0) {
        await batch.commit();
      }
    }

    // Update metadata execution log
    const lastRunResult = {
      txArchived: txArchivedCount,
      tradesArchived: tradesArchivedCount,
      txDeleted: txDeletedCount,
      tradesDeleted: tradesDeletedCount
    };

    await setDoc(
      metaRef,
      {
        lastRunTimestamp: now,
        lastRunAt: new Date().toISOString(),
        lastRunResult
      },
      { merge: true }
    );

    return lastRunResult;
  } catch (err: any) {
    if (err?.code === 'unavailable' || err?.message?.includes('offline') || err?.message?.includes('Failed to get document')) {
      console.warn("Database Archive & Lifecycle skipped (offline or network unavailable):", err?.message || err);
    } else {
      console.warn("Database Archive & Lifecycle warning:", err?.message || err);
    }
    return { txArchived: 0, tradesArchived: 0, txDeleted: 0, tradesDeleted: 0 };
  }
}

/**
 * Fetch Database Lifecycle Health Metrics
 */
export async function getDatabaseArchiveHealthStats(): Promise<DatabaseArchiveHealthStats> {
  try {
    const [
      activeTxSnap,
      activeTradesSnap,
      archivedTxSnap,
      archivedTradesSnap,
      hrEmpSnap,
      hrPayslipSnap,
      hrAuditSnap,
      metaSnap
    ] = await Promise.all([
      getDocs(query(collection(db, "wallet_transactions"), limit(1000))),
      getDocs(query(collection(db, "solo_trades"), limit(1000))),
      getDocs(query(collection(db, "archived_wallet_transactions"), limit(1000))),
      getDocs(query(collection(db, "archived_solo_trades"), limit(1000))),
      getDocs(query(collection(db, "hr_employees"), limit(1000))),
      getDocs(query(collection(db, "hr_payslips"), limit(1000))),
      getDocs(query(collection(db, "hr_audit_logs"), limit(1000))),
      getDoc(doc(db, "app_settings", ARCHIVE_METADATA_DOC))
    ]);

    const metaData = metaSnap.exists() ? metaSnap.data() : {};

    return {
      activeTxCount: activeTxSnap.size,
      activeSoloTradesCount: activeTradesSnap.size,
      archivedTxCount: archivedTxSnap.size,
      archivedSoloTradesCount: archivedTradesSnap.size,
      hrEmployeesCount: hrEmpSnap.size,
      hrPayslipsCount: hrPayslipSnap.size,
      hrAuditLogsCount: hrAuditSnap.size,
      lastArchivedRunAt: metaData.lastRunAt || null,
      lastRunResult: metaData.lastRunResult || null
    };
  } catch (err) {
    console.error("Failed to fetch archive health stats:", err);
    return {
      activeTxCount: 0,
      activeSoloTradesCount: 0,
      archivedTxCount: 0,
      archivedSoloTradesCount: 0,
      hrEmployeesCount: 0,
      hrPayslipsCount: 0,
      hrAuditLogsCount: 0,
      lastArchivedRunAt: null,
      lastRunResult: null
    };
  }
}

export interface ArchivedTxFilterOptions {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  typeFilter?: string;
  statusFilter?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Fetch Archived Wallet Transactions with 50-item Pagination and Filtering
 */
export async function getArchivedTransactionsPaginated(options: ArchivedTxFilterOptions = {}): Promise<{
  records: ArchivedWalletTransaction[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}> {
  const page = Math.max(1, options.page || 1);
  const pageSize = options.pageSize || 50;

  const colRef = collection(db, "archived_wallet_transactions");
  const q = query(colRef, orderBy("createdAt", "desc"), limit(1000));
  const snap = await getDocs(q);

  let list: ArchivedWalletTransaction[] = [];
  snap.forEach((d) => list.push(d.data() as ArchivedWalletTransaction));

  // Apply Search Query Filter (User ID, User Email, User Name, Tx ID, Ref)
  if (options.searchQuery && options.searchQuery.trim()) {
    const term = options.searchQuery.trim().toLowerCase();
    list = list.filter(
      (item) =>
        (item.userId && item.userId.toLowerCase().includes(term)) ||
        (item.userEmail && item.userEmail.toLowerCase().includes(term)) ||
        (item.userName && item.userName.toLowerCase().includes(term)) ||
        (item.id && item.id.toLowerCase().includes(term)) ||
        (item.txDetails && item.txDetails.toLowerCase().includes(term))
    );
  }

  // Filter by Transaction Type
  if (options.typeFilter && options.typeFilter !== "ALL") {
    list = list.filter((item) => item.type === options.typeFilter);
  }

  // Filter by Status
  if (options.statusFilter && options.statusFilter !== "ALL") {
    list = list.filter((item) => item.status === options.statusFilter);
  }

  // Filter by Date Range
  if (options.startDate) {
    const startMs = new Date(options.startDate).getTime();
    list = list.filter((item) => new Date(item.createdAt).getTime() >= startMs);
  }

  if (options.endDate) {
    const endMs = new Date(options.endDate).getTime() + 24 * 60 * 60 * 1000 - 1;
    list = list.filter((item) => new Date(item.createdAt).getTime() <= endMs);
  }

  const totalCount = list.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startIndex = (page - 1) * pageSize;
  const paginatedRecords = list.slice(startIndex, startIndex + pageSize);

  return {
    records: paginatedRecords,
    totalCount,
    totalPages,
    currentPage: page
  };
}

export interface ArchivedTradesFilterOptions {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  tradeTypeFilter?: string;
  statusFilter?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Fetch Archived Solo Trades with 50-item Pagination and Filtering
 */
export async function getArchivedSoloTradesPaginated(options: ArchivedTradesFilterOptions = {}): Promise<{
  records: ArchivedSoloTrade[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}> {
  const page = Math.max(1, options.page || 1);
  const pageSize = options.pageSize || 50;

  const colRef = collection(db, "archived_solo_trades");
  const q = query(colRef, orderBy("startTime", "desc"), limit(1000));
  const snap = await getDocs(q);

  let list: ArchivedSoloTrade[] = [];
  snap.forEach((d) => list.push(d.data() as ArchivedSoloTrade));

  // Apply Search Query Filter (User ID, Email, Name, AssetPair, Trade ID)
  if (options.searchQuery && options.searchQuery.trim()) {
    const term = options.searchQuery.trim().toLowerCase();
    list = list.filter(
      (item) =>
        (item.userId && item.userId.toLowerCase().includes(term)) ||
        (item.userEmail && item.userEmail.toLowerCase().includes(term)) ||
        (item.userName && item.userName.toLowerCase().includes(term)) ||
        (item.assetPair && item.assetPair.toLowerCase().includes(term)) ||
        (item.id && item.id.toLowerCase().includes(term))
    );
  }

  // Filter by Trade Type (CALL/PUT)
  if (options.tradeTypeFilter && options.tradeTypeFilter !== "ALL") {
    list = list.filter((item) => item.tradeType === options.tradeTypeFilter);
  }

  // Filter by Outcome Status (WON/LOST/DRAW/CANCELED)
  if (options.statusFilter && options.statusFilter !== "ALL") {
    list = list.filter((item) => item.status === options.statusFilter);
  }

  // Filter by Date Range
  if (options.startDate) {
    const startMs = new Date(options.startDate).getTime();
    list = list.filter((item) => new Date(item.startTime).getTime() >= startMs);
  }

  if (options.endDate) {
    const endMs = new Date(options.endDate).getTime() + 24 * 60 * 60 * 1000 - 1;
    list = list.filter((item) => new Date(item.startTime).getTime() <= endMs);
  }

  const totalCount = list.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startIndex = (page - 1) * pageSize;
  const paginatedRecords = list.slice(startIndex, startIndex + pageSize);

  return {
    records: paginatedRecords,
    totalCount,
    totalPages,
    currentPage: page
  };
}
