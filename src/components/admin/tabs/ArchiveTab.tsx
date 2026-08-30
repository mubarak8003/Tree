import React, { useState, useEffect } from "react";
import { DatabaseArchiveHealthStats, ArchivedWalletTransaction, ArchivedSoloTrade } from "../../../types";
import { Archive, Database, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { 
  runDatabaseArchivingAndCleanup, getDatabaseArchiveHealthStats,
  getArchivedTransactionsPaginated, getArchivedSoloTradesPaginated 
} from "../../../archiveService";

interface ArchiveTabProps {
  onTriggerNotification?: (message: string, type: "success" | "info" | "error") => void;
  adminEmail: string;
}

export const ArchiveTab: React.FC<ArchiveTabProps> = ({
  onTriggerNotification,
  adminEmail
}) => {
  const [stats, setStats] = useState<DatabaseArchiveHealthStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Run archive modal state
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  // Paginated view
  const [viewType, setViewType] = useState<"tx" | "trades">("tx");
  const [archivedTx, setArchivedTx] = useState<ArchivedWalletTransaction[]>([]);
  const [archivedTrades, setArchivedTrades] = useState<ArchivedSoloTrade[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const fetchStats = async () => {
    try {
      setIsLoadingStats(true);
      const data = await getDatabaseArchiveHealthStats();
      setStats(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadData = async () => {
    try {
      if (viewType === "tx") {
        const res = await getArchivedTransactionsPaginated({ page, pageSize });
        setArchivedTx(res.records || []);
      } else {
        const res = await getArchivedSoloTradesPaginated({ page, pageSize });
        setArchivedTrades(res.records || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    loadData();
  }, [viewType, page]);

  const handleExecuteArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsExecuting(true);
      const res = await runDatabaseArchivingAndCleanup(true);
      onTriggerNotification?.(
        `Archived ${res.txArchived} transactions & ${res.tradesArchived} trades!`,
        "success"
      );
      setIsRunModalOpen(false);
      fetchStats();
      loadData();
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to execute database archiving", "error");
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview & Actions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <Archive className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Database Cold-Storage Archiving</h3>
              <p className="text-xs text-slate-500">Maintain database query speeds by archiving old completed records</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchStats}
              disabled={isLoadingStats}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingStats ? "animate-spin" : ""}`} /> Refresh Stats
            </button>

            <button
              type="button"
              onClick={() => setIsRunModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Database className="h-4 w-4" /> Run Database Cleanup
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-xs text-slate-500 font-medium">Active Transactions</div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {stats?.activeTxCount ?? "-"}
            </div>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-xs text-slate-500 font-medium">Archived Transactions</div>
            <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
              {stats?.archivedTxCount ?? "-"}
            </div>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-xs text-slate-500 font-medium">Archived Solo Trades</div>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {stats?.archivedSoloTradesCount ?? "-"}
            </div>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-xs text-slate-500 font-medium">Last Archive Date</div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-2 truncate">
              {stats?.lastArchivedRunAt ? new Date(stats.lastArchivedRunAt).toLocaleString() : "Never"}
            </div>
          </div>
        </div>
      </div>

      {/* Explorer / Paginated Records */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setViewType("tx"); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                viewType === "tx" ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              Archived Transactions
            </button>
            <button
              type="button"
              onClick={() => { setViewType("trades"); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                viewType === "trades" ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              Archived Solo Trades
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 bg-slate-100 dark:bg-slate-800 disabled:opacity-40 rounded-lg cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Page {page}</span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {viewType === "tx" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Type</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Archived At</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {archivedTx.map((tx) => (
                  <tr key={tx.id}>
                    <td className="p-3 font-bold uppercase">{tx.type}</td>
                    <td className="p-3">{tx.userName || tx.userId}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-slate-100">${tx.amount}</td>
                    <td className="p-3 text-[11px]">{new Date(tx.archivedAt).toLocaleString()}</td>
                    <td className="p-3 uppercase text-[10px]">{tx.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Asset</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Stake</th>
                  <th className="p-3">Outcome</th>
                  <th className="p-3">Archived At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {archivedTrades.map((tr) => (
                  <tr key={tr.id}>
                    <td className="p-3 font-bold">{(tr as any).symbol || (tr as any).pair || tr.id}</td>
                    <td className="p-3">{tr.userName || tr.userId}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-slate-100">${tr.stake || (tr as any).stakeAmount}</td>
                    <td className="p-3 font-bold uppercase">{tr.status}</td>
                    <td className="p-3 text-[11px]">{new Date(tr.archivedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Archive Modal */}
      {isRunModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 rounded-2xl">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Execute Database Cleanup</h3>
                <p className="text-xs text-slate-500">Archive settled records older than retention period</p>
              </div>
            </div>

            <form onSubmit={handleExecuteArchive} className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                This will safely compress completed trades and processed transactions into cold-storage archive tables to optimize database performance.
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRunModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isExecuting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isExecuting ? "Executing..." : "Start Database Cleanup"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
