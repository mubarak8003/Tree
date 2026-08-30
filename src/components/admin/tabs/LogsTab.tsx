import React, { useState, useEffect } from "react";
import { AdminAuditLog } from "../../../types";
import { ShieldCheck, Search } from "lucide-react";
import { subscribeAdminAuditLogs } from "../../../firebaseService";

interface LogsTabProps {
  onTriggerNotification?: (message: string, type: "success" | "info" | "error") => void;
}

export const LogsTab: React.FC<LogsTabProps> = ({ onTriggerNotification }) => {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState("all");

  useEffect(() => {
    const unsub = subscribeAdminAuditLogs((fetched) => {
      setLogs(fetched);
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  const filteredLogs = logs.filter((log) => {
    const actionName = log.actionType || log.action || "";
    if (filterAction !== "all" && actionName !== filterAction) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchAdmin = (log.adminEmail || "").toLowerCase().includes(q);
      const matchDetails = (log.details || "").toLowerCase().includes(q);
      const matchAction = actionName.toLowerCase().includes(q);
      if (!matchAdmin && !matchDetails && !matchAction) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Security & Audit Logs</h3>
              <p className="text-xs text-slate-500">Immutable ledger of administrative actions and security events</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Actions</option>
              <option value="APPROVE_TRANSACTION">Approvals</option>
              <option value="REJECT_TRANSACTION">Rejections</option>
              <option value="ADJUST_BALANCE">Balance Adjustments</option>
              <option value="SETTLE_TRADE">Trade Settlement</option>
              <option value="DATABASE_ARCHIVE">Database Archive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">
          Audit Records ({filteredLogs.length})
        </h4>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-500">
            No audit logs matching current filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Admin</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Details</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-3 text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                      {log.adminEmail || "Admin"}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full font-bold uppercase text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {log.actionType || log.action || "ACTION"}
                      </span>
                    </td>
                    <td className="p-3 text-slate-800 dark:text-slate-200">
                      {log.details || log.targetUserOrId || log.targetUserId || "-"}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full font-semibold uppercase text-[10px] ${
                        log.status === "SUCCESS" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" :
                        log.status === "FAILED" ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400" :
                        "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
