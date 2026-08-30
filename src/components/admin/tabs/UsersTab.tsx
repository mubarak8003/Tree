import React, { useState } from "react";
import { UserProfile } from "../../../types";
import { 
  Users, Search, DollarSign, Ban, Trash2, AlertTriangle
} from "lucide-react";
import { 
  adjustUserBalance, toggleBlockUser, deleteUserProfile 
} from "../../../firebaseService";

interface UsersTabProps {
  allUsers: UserProfile[];
  onTriggerNotification?: (message: string, type: "success" | "info" | "error") => void;
  adminEmail: string;
}

export const UsersTab: React.FC<UsersTabProps> = ({
  allUsers,
  onTriggerNotification,
  adminEmail
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Balance adjustment state
  const [balanceUser, setBalanceUser] = useState<UserProfile | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<"BONUS" | "ADJUSTMENT">("BONUS");
  const [adjustReason, setAdjustReason] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);

  // User delete confirmation
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const filteredUsers = allUsers.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.mobileNumber || u.phone || "").toLowerCase().includes(q) ||
      (u.id || "").toLowerCase().includes(q)
    );
  });

  const handleToggleBlock = async (user: UserProfile) => {
    try {
      const willBlock = !user.isBlocked;
      await toggleBlockUser(user.id, willBlock);
      onTriggerNotification?.(`User ${user.name || user.id} has been ${willBlock ? "blocked" : "unblocked"}`, "info");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to update user status", "error");
    }
  };

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balanceUser || adjustAmount <= 0) return;
    try {
      setIsAdjusting(true);
      await adjustUserBalance(balanceUser.id, adjustAmount, adjustType, adjustReason || "Admin balance adjustment");
      onTriggerNotification?.(`Successfully adjusted balance by $${adjustAmount} (${adjustType})`, "success");
      setBalanceUser(null);
      setAdjustAmount(0);
      setAdjustReason("");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to adjust balance", "error");
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      setIsDeletingUser(true);
      await deleteUserProfile(userToDelete.id);
      onTriggerNotification?.(`User ${userToDelete.name || userToDelete.id} deleted permanently`, "success");
      setUserToDelete(null);
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to delete user", "error");
    } finally {
      setIsDeletingUser(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-2xl">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">User Management</h3>
              <p className="text-xs text-slate-500">View and manage registered trader accounts ({allUsers.length} total)</p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search user name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 w-64"
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Wallet Balance</th>
                <th className="p-3">Mobile & Verification</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-3">
                    <div className="font-bold text-slate-900 dark:text-slate-100">{u.name || "Trader"}</div>
                    <div className="text-[10px] text-slate-500">{u.email}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      ${((u.availableBalance ?? u.balance) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </td>
                  <td className="p-3">
                    <div>{u.mobileNumber || u.phone || "No phone"}</div>
                    <span className={`inline-block mt-0.5 px-1.5 py-0.2 text-[9px] font-bold rounded ${
                      u.mobileVerified ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" :
                      "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}>
                      {u.mobileVerified ? "PHONE VERIFIED" : "UNVERIFIED"}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full font-semibold uppercase text-[10px] ${
                      u.isBlocked ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400" :
                      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                    }`}>
                      {u.isBlocked ? "Blocked" : "Active"}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setBalanceUser(u);
                        setAdjustAmount(0);
                      }}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-lg text-[11px] font-bold cursor-pointer inline-flex items-center gap-1"
                      title="Adjust Balance"
                    >
                      <DollarSign className="h-3.5 w-3.5" /> Balance
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleBlock(u)}
                      className={`p-1.5 rounded-lg cursor-pointer inline-flex items-center ${
                        u.isBlocked ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950" : "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                      }`}
                      title={u.isBlocked ? "Unblock User" : "Block User"}
                    >
                      <Ban className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserToDelete(u)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg cursor-pointer inline-flex items-center"
                      title="Delete User"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Balance Adjustment Modal */}
      {balanceUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
              Adjust Balance: {balanceUser.name || balanceUser.id}
            </h3>
            <p className="text-xs text-slate-500 mb-4">Current Available: ${balanceUser.availableBalance ?? balanceUser.balance ?? 0}</p>

            <form onSubmit={handleAdjustBalance} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Action Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType("BONUS")}
                    className={`py-2 text-xs font-bold rounded-xl cursor-pointer ${
                      adjustType === "BONUS" ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    + Add Bonus / Credit
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("ADJUSTMENT")}
                    className={`py-2 text-xs font-bold rounded-xl cursor-pointer ${
                      adjustType === "ADJUSTMENT" ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Adjust / Correction
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Reason / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Deposit Compensation, Promotion bonus"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setBalanceUser(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdjusting || adjustAmount <= 0}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isAdjusting ? "Processing..." : "Confirm Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 rounded-2xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Confirm User Deletion
                </h3>
                <p className="text-xs text-slate-500">
                  Delete user account permanently
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 rounded-2xl text-xs text-rose-800 dark:text-rose-300">
              Are you sure you want to permanently delete <strong>{userToDelete.name || userToDelete.id}</strong> ({userToDelete.email})? This action cannot be undone.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeletingUser}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={isDeletingUser}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-2"
              >
                {isDeletingUser ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
