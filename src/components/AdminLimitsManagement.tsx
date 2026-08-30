import React, { useState, useEffect } from "react";
import { 
  UserProfile, 
  WalletLimits, 
  WalletTransaction, 
  UserCustomLimits,
  AdminUserAccount,
  DEFAULT_LIMITS_POLICY_NOTE,
  WalletTransferConfig,
  WalletTransferRecord,
  TransferAuditLog
} from "../types";
import { 
  saveWalletLimits, 
  saveUserCustomLimits, 
  DEFAULT_WALLET_LIMITS, 
  getEffectiveLimits, 
  calculateUserTransactionUsage,
  DEFAULT_TRANSFER_CONFIG,
  subscribeTransferConfig,
  saveTransferConfig,
  toggleUserTransferStatus,
  subscribeWalletTransfers,
  subscribeTransferAuditLogs
} from "../firebaseService";
import { canEditLimits } from "../services/adminRbacService";
import { 
  Sliders, 
  Crown, 
  RotateCcw, 
  Save, 
  Search, 
  ShieldAlert, 
  Info, 
  Lock, 
  CheckCircle, 
  TrendingUp, 
  User, 
  Eye,
  ArrowUpCircle, 
  ArrowDownCircle,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  AlertTriangle,
  Send,
  ArrowRightLeft,
  Ban,
  Clock,
  Layers,
  FileText
} from "lucide-react";

interface AdminLimitsManagementProps {
  allUsers: UserProfile[];
  walletTransactions: WalletTransaction[];
  walletLimits?: WalletLimits;
  adminAccount: AdminUserAccount | null;
  onTriggerNotification?: (type: "SUCCESS" | "ERROR" | "WARNING", message: string) => void;
}

export const AdminLimitsManagement: React.FC<AdminLimitsManagementProps> = ({
  allUsers,
  walletTransactions,
  walletLimits = DEFAULT_WALLET_LIMITS,
  adminAccount,
  onTriggerNotification,
}) => {
  const isEditable = canEditLimits(adminAccount);

  // Active view: "GLOBAL" | "USERS" | "USAGE" | "TRANSFERS"
  const [activeSubTab, setActiveSubTab] = useState<"GLOBAL" | "USERS" | "USAGE" | "TRANSFERS">("GLOBAL");

  // P2P Wallet Transfer State
  const [transferConfig, setTransferConfig] = useState<WalletTransferConfig>(DEFAULT_TRANSFER_CONFIG);
  const [transferConfigForm, setTransferConfigForm] = useState<{
    isEnabled: boolean;
    minTransferAmount: number | "";
    maxTransferAmount: number | "";
    dailyTransferLimit: number | "";
    adminNote: string;
  }>({
    isEnabled: DEFAULT_TRANSFER_CONFIG.isEnabled,
    minTransferAmount: DEFAULT_TRANSFER_CONFIG.minTransferAmount,
    maxTransferAmount: DEFAULT_TRANSFER_CONFIG.maxTransferAmount,
    dailyTransferLimit: DEFAULT_TRANSFER_CONFIG.dailyTransferLimit,
    adminNote: DEFAULT_TRANSFER_CONFIG.adminNote || "",
  });
  const [isSavingTransferConfig, setIsSavingTransferConfig] = useState(false);
  const [transferRecords, setTransferRecords] = useState<WalletTransferRecord[]>([]);
  const [transferAuditLogs, setTransferAuditLogs] = useState<TransferAuditLog[]>([]);
  const [transferUserSearch, setTransferUserSearch] = useState("");

  useEffect(() => {
    const unsubConfig = subscribeTransferConfig((cfg) => {
      setTransferConfig(cfg);
      setTransferConfigForm({
        isEnabled: cfg.isEnabled,
        minTransferAmount: cfg.minTransferAmount,
        maxTransferAmount: cfg.maxTransferAmount,
        dailyTransferLimit: cfg.dailyTransferLimit,
        adminNote: cfg.adminNote || "",
      });
    });
    const unsubTransfers = subscribeWalletTransfers(setTransferRecords);
    const unsubAudit = subscribeTransferAuditLogs(setTransferAuditLogs);

    return () => {
      unsubConfig();
      unsubTransfers();
      unsubAudit();
    };
  }, []);

  const handleSaveTransferConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditable) {
      if (onTriggerNotification) onTriggerNotification("WARNING", "Access Denied: Read-only mode.");
      return;
    }

    setIsSavingTransferConfig(true);
    try {
      await saveTransferConfig(
        {
          isEnabled: transferConfigForm.isEnabled,
          minTransferAmount: Number(transferConfigForm.minTransferAmount) || 1,
          maxTransferAmount: Number(transferConfigForm.maxTransferAmount) || 50000,
          dailyTransferLimit: Number(transferConfigForm.dailyTransferLimit) || 200000,
          adminNote: transferConfigForm.adminNote,
          updatedAt: Date.now(),
          updatedBy: adminAccount ? `${adminAccount.name} (${adminAccount.email})` : "Admin",
        },
        adminAccount ? { name: adminAccount.name, email: adminAccount.email } : undefined
      );

      if (onTriggerNotification) {
        onTriggerNotification(
          "SUCCESS",
          `P2P Transfer settings updated. Global Status: ${transferConfigForm.isEnabled ? "ACTIVE" : "DEACTIVATED"}`
        );
      }
    } catch (err: any) {
      console.error("Failed to save transfer config:", err);
      if (onTriggerNotification) onTriggerNotification("ERROR", err.message || "Failed to update transfer config");
    } finally {
      setIsSavingTransferConfig(false);
    }
  };

  const handleToggleUserTransfer = async (user: UserProfile) => {
    if (!isEditable) {
      if (onTriggerNotification) onTriggerNotification("WARNING", "Access Denied: Read-only mode.");
      return;
    }

    const nextStatus = !user.isTransferDisabled;
    try {
      await toggleUserTransferStatus(
        user.id,
        nextStatus,
        adminAccount ? { name: adminAccount.name, email: adminAccount.email } : undefined
      );

      if (onTriggerNotification) {
        onTriggerNotification(
          nextStatus ? "WARNING" : "SUCCESS",
          `P2P Wallet Transfers ${nextStatus ? "DISABLED (Restricted)" : "ENABLED"} for ${user.name} (${user.id})`
        );
      }
    } catch (err: any) {
      console.error("Failed to toggle user transfer status:", err);
      if (onTriggerNotification) onTriggerNotification("ERROR", err.message || "Failed to update user transfer status");
    }
  };

  // Global limits form state (supports number or empty string for clean typing & backspacing)
  const [globalForm, setGlobalForm] = useState<{
    minDeposit: number | "";
    maxDeposit: number | "";
    maxDepositPerDay: number | "";
    maxDepositPerMonth: number | "";
    depositsEnabled: boolean;
    minWithdrawal: number | "";
    maxWithdrawal: number | "";
    maxWithdrawalPerDay: number | "";
    maxWithdrawalPerMonth: number | "";
    withdrawalsEnabled: boolean;
    limitsPolicyNote: string;
    showLimitsPolicyToUsers: boolean;
  }>({
    minDeposit: walletLimits.minDeposit ?? DEFAULT_WALLET_LIMITS.minDeposit,
    maxDeposit: walletLimits.maxDeposit ?? DEFAULT_WALLET_LIMITS.maxDeposit,
    maxDepositPerDay: walletLimits.maxDepositPerDay ?? DEFAULT_WALLET_LIMITS.maxDepositPerDay,
    maxDepositPerMonth: walletLimits.maxDepositPerMonth ?? DEFAULT_WALLET_LIMITS.maxDepositPerMonth,
    depositsEnabled: walletLimits.depositsEnabled ?? DEFAULT_WALLET_LIMITS.depositsEnabled,

    minWithdrawal: walletLimits.minWithdrawal ?? DEFAULT_WALLET_LIMITS.minWithdrawal,
    maxWithdrawal: walletLimits.maxWithdrawal ?? DEFAULT_WALLET_LIMITS.maxWithdrawal,
    maxWithdrawalPerDay: walletLimits.maxWithdrawalPerDay ?? DEFAULT_WALLET_LIMITS.maxWithdrawalPerDay,
    maxWithdrawalPerMonth: walletLimits.maxWithdrawalPerMonth ?? DEFAULT_WALLET_LIMITS.maxWithdrawalPerMonth,
    withdrawalsEnabled: walletLimits.withdrawalsEnabled ?? DEFAULT_WALLET_LIMITS.withdrawalsEnabled,

    limitsPolicyNote: walletLimits.limitsPolicyNote ?? DEFAULT_LIMITS_POLICY_NOTE,
    showLimitsPolicyToUsers: walletLimits.showLimitsPolicyToUsers ?? true,
  });

  const [isSavingGlobal, setIsSavingGlobal] = useState(false);
  const [globalSuccessMsg, setGlobalSuccessMsg] = useState<string | null>(null);

  // User-specific management state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userCustomForm, setUserCustomForm] = useState<{
    depositsEnabled?: boolean;
    withdrawalsEnabled?: boolean;
    minDeposit?: number | "";
    maxDeposit?: number | "";
    maxDepositPerDay?: number | "";
    maxDepositPerMonth?: number | "";
    minWithdrawal?: number | "";
    maxWithdrawal?: number | "";
    maxWithdrawalPerDay?: number | "";
    maxWithdrawalPerMonth?: number | "";
  }>({});
  const [isVipChecked, setIsVipChecked] = useState(false);
  const [hasCustomChecked, setHasCustomChecked] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Update globalForm if walletLimits prop updates
  React.useEffect(() => {
    setGlobalForm({
      minDeposit: walletLimits.minDeposit ?? DEFAULT_WALLET_LIMITS.minDeposit,
      maxDeposit: walletLimits.maxDeposit ?? DEFAULT_WALLET_LIMITS.maxDeposit,
      maxDepositPerDay: walletLimits.maxDepositPerDay ?? DEFAULT_WALLET_LIMITS.maxDepositPerDay,
      maxDepositPerMonth: walletLimits.maxDepositPerMonth ?? DEFAULT_WALLET_LIMITS.maxDepositPerMonth,
      depositsEnabled: walletLimits.depositsEnabled ?? DEFAULT_WALLET_LIMITS.depositsEnabled,

      minWithdrawal: walletLimits.minWithdrawal ?? DEFAULT_WALLET_LIMITS.minWithdrawal,
      maxWithdrawal: walletLimits.maxWithdrawal ?? DEFAULT_WALLET_LIMITS.maxWithdrawal,
      maxWithdrawalPerDay: walletLimits.maxWithdrawalPerDay ?? DEFAULT_WALLET_LIMITS.maxWithdrawalPerDay,
      maxWithdrawalPerMonth: walletLimits.maxWithdrawalPerMonth ?? DEFAULT_WALLET_LIMITS.maxWithdrawalPerMonth,
      withdrawalsEnabled: walletLimits.withdrawalsEnabled ?? DEFAULT_WALLET_LIMITS.withdrawalsEnabled,

      limitsPolicyNote: walletLimits.limitsPolicyNote ?? DEFAULT_LIMITS_POLICY_NOTE,
      showLimitsPolicyToUsers: walletLimits.showLimitsPolicyToUsers ?? true,
    });
  }, [walletLimits]);

  // When a user is selected for custom limit editing
  const handleSelectUser = (user: UserProfile) => {
    setSelectedUser(user);
    const cl = user.customLimits || {};
    setHasCustomChecked(!!cl.hasCustomLimits);
    setIsVipChecked(!!cl.isVip);
    setUserCustomForm({
      depositsEnabled: cl.depositsEnabled ?? walletLimits.depositsEnabled,
      withdrawalsEnabled: cl.withdrawalsEnabled ?? walletLimits.withdrawalsEnabled,
      minDeposit: cl.minDeposit ?? walletLimits.minDeposit,
      maxDeposit: cl.maxDeposit ?? walletLimits.maxDeposit,
      maxDepositPerDay: cl.maxDepositPerDay ?? walletLimits.maxDepositPerDay,
      maxDepositPerMonth: cl.maxDepositPerMonth ?? walletLimits.maxDepositPerMonth,
      minWithdrawal: cl.minWithdrawal ?? walletLimits.minWithdrawal,
      maxWithdrawal: cl.maxWithdrawal ?? walletLimits.maxWithdrawal,
      maxWithdrawalPerDay: cl.maxWithdrawalPerDay ?? walletLimits.maxWithdrawalPerDay,
      maxWithdrawalPerMonth: cl.maxWithdrawalPerMonth ?? walletLimits.maxWithdrawalPerMonth,
    });
  };

  const handleSaveGlobalLimits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditable) {
      if (onTriggerNotification) onTriggerNotification("WARNING", "Access Denied: HR and Staff are restricted to view-only mode.");
      return;
    }
    setIsSavingGlobal(true);
    setGlobalSuccessMsg(null);
    try {
      const limitsToSave: WalletLimits = {
        minDeposit: globalForm.minDeposit === "" ? 0 : Number(globalForm.minDeposit),
        maxDeposit: globalForm.maxDeposit === "" ? 0 : Number(globalForm.maxDeposit),
        maxDepositPerDay: globalForm.maxDepositPerDay === "" ? 0 : Number(globalForm.maxDepositPerDay),
        maxDepositPerMonth: globalForm.maxDepositPerMonth === "" ? 0 : Number(globalForm.maxDepositPerMonth),
        depositsEnabled: globalForm.depositsEnabled,

        minWithdrawal: globalForm.minWithdrawal === "" ? 0 : Number(globalForm.minWithdrawal),
        maxWithdrawal: globalForm.maxWithdrawal === "" ? 0 : Number(globalForm.maxWithdrawal),
        maxWithdrawalPerDay: globalForm.maxWithdrawalPerDay === "" ? 0 : Number(globalForm.maxWithdrawalPerDay),
        maxWithdrawalPerMonth: globalForm.maxWithdrawalPerMonth === "" ? 0 : Number(globalForm.maxWithdrawalPerMonth),
        withdrawalsEnabled: globalForm.withdrawalsEnabled,

        limitsPolicyNote: globalForm.limitsPolicyNote,
        showLimitsPolicyToUsers: globalForm.showLimitsPolicyToUsers,
      };

      await saveWalletLimits(
        limitsToSave,
        adminAccount ? { name: adminAccount.name, email: adminAccount.email, role: adminAccount.role } : undefined,
        walletLimits
      );
      setGlobalSuccessMsg("Global deposit & withdrawal limits updated successfully!");
      if (onTriggerNotification) onTriggerNotification("SUCCESS", "Global payment limits updated and logged in Audit Vault.");
      setTimeout(() => setGlobalSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("Failed to save global limits:", err);
      if (onTriggerNotification) onTriggerNotification("ERROR", err.message || "Failed to update global limits");
    } finally {
      setIsSavingGlobal(false);
    }
  };

  const handleSaveUserLimits = async () => {
    if (!selectedUser) return;
    if (!isEditable) {
      if (onTriggerNotification) onTriggerNotification("WARNING", "Access Denied: HR and Staff are restricted to view-only mode.");
      return;
    }
    setIsSavingUser(true);
    try {
      const customLimitsToSave: UserCustomLimits = {
        hasCustomLimits: hasCustomChecked,
        isVip: isVipChecked,
        depositsEnabled: userCustomForm.depositsEnabled,
        withdrawalsEnabled: userCustomForm.withdrawalsEnabled,
        minDeposit: userCustomForm.minDeposit === "" || userCustomForm.minDeposit === undefined ? 0 : Number(userCustomForm.minDeposit),
        maxDeposit: userCustomForm.maxDeposit === "" || userCustomForm.maxDeposit === undefined ? 0 : Number(userCustomForm.maxDeposit),
        maxDepositPerDay: userCustomForm.maxDepositPerDay === "" || userCustomForm.maxDepositPerDay === undefined ? 0 : Number(userCustomForm.maxDepositPerDay),
        maxDepositPerMonth: userCustomForm.maxDepositPerMonth === "" || userCustomForm.maxDepositPerMonth === undefined ? 0 : Number(userCustomForm.maxDepositPerMonth),
        minWithdrawal: userCustomForm.minWithdrawal === "" || userCustomForm.minWithdrawal === undefined ? 0 : Number(userCustomForm.minWithdrawal),
        maxWithdrawal: userCustomForm.maxWithdrawal === "" || userCustomForm.maxWithdrawal === undefined ? 0 : Number(userCustomForm.maxWithdrawal),
        maxWithdrawalPerDay: userCustomForm.maxWithdrawalPerDay === "" || userCustomForm.maxWithdrawalPerDay === undefined ? 0 : Number(userCustomForm.maxWithdrawalPerDay),
        maxWithdrawalPerMonth: userCustomForm.maxWithdrawalPerMonth === "" || userCustomForm.maxWithdrawalPerMonth === undefined ? 0 : Number(userCustomForm.maxWithdrawalPerMonth),
      };

      await saveUserCustomLimits(
        selectedUser.id,
        customLimitsToSave,
        adminAccount ? { name: adminAccount.name, email: adminAccount.email, role: adminAccount.role } : undefined,
        selectedUser.name,
        selectedUser.customLimits
      );

      if (onTriggerNotification) {
        onTriggerNotification(
          "SUCCESS",
          isVipChecked 
            ? `VIP status & custom limits assigned to ${selectedUser.name}.` 
            : `Custom limit configuration saved for ${selectedUser.name}.`
        );
      }
      setSelectedUser(null);
    } catch (err: any) {
      console.error("Failed to save user custom limits:", err);
      if (onTriggerNotification) onTriggerNotification("ERROR", err.message || "Failed to save user limits");
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleResetUserLimits = async () => {
    if (!selectedUser) return;
    if (!isEditable) {
      if (onTriggerNotification) onTriggerNotification("WARNING", "Access Denied: HR and Staff are restricted to view-only mode.");
      return;
    }
    setIsSavingUser(true);
    try {
      await saveUserCustomLimits(
        selectedUser.id,
        null,
        adminAccount ? { name: adminAccount.name, email: adminAccount.email, role: adminAccount.role } : undefined,
        selectedUser.name,
        selectedUser.customLimits
      );
      if (onTriggerNotification) onTriggerNotification("SUCCESS", `Reset limits back to global defaults for ${selectedUser.name}`);
      setSelectedUser(null);
    } catch (err: any) {
      console.error("Failed to reset user limits:", err);
      if (onTriggerNotification) onTriggerNotification("ERROR", err.message || "Failed to reset limits");
    } finally {
      setIsSavingUser(false);
    }
  };

  // Filter users for user limits tab
  const filteredUsers = allUsers.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
            <Sliders className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-display">
                Deposit & Withdrawal Limits Management
              </h2>
              {!isEditable && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                  <Lock className="h-3 w-3" /> View Only (Staff)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configure global defaults, user-specific overrides, VIP quotas, and real-time daily/monthly transaction limits.
            </p>
          </div>
        </div>

        {/* Sub-tab Switcher with Horizontal Scroll */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl w-full sm:w-auto overflow-x-auto max-w-full shrink-0 border border-slate-200/60 dark:border-slate-800/80 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveSubTab("GLOBAL")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeSubTab === "GLOBAL"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Sliders className="h-3.5 w-3.5 shrink-0" />
            <span>Global System Limits</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("USERS")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeSubTab === "USERS"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <User className="h-3.5 w-3.5 shrink-0" />
            <span>User-Specific & VIP</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("USAGE")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeSubTab === "USAGE"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 shrink-0" />
            <span>Usage & Analytics</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("TRANSFERS")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap relative ${
              activeSubTab === "TRANSFERS"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Send className="h-3.5 w-3.5 text-indigo-300 shrink-0" />
            <span>P2P Transfer Control</span>
            {!transferConfig.isEnabled && (
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="Deactivated" />
            )}
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: GLOBAL SYSTEM LIMITS */}
      {activeSubTab === "GLOBAL" && (
        <form onSubmit={handleSaveGlobalLimits} className="flex flex-col gap-6">
          {!isEditable && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-500 shrink-0" />
              <span>You are logged in as Staff/HR. System limits are in Read-Only view. Only Super Admin can modify global parameters.</span>
            </div>
          )}

          {globalSuccessMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2 font-medium">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>{globalSuccessMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* DEPOSIT SYSTEM LIMITS CARD */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <ArrowUpCircle className="h-5 w-5" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-150 uppercase tracking-wider font-display">
                    Global Deposit Limits
                  </h3>
                </div>

                {/* Enable / Disable Deposits Toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {globalForm.depositsEnabled ? "Enabled" : "Disabled"}
                  </span>
                  <button
                    type="button"
                    disabled={!isEditable}
                    onClick={() => setGlobalForm(prev => ({ ...prev, depositsEnabled: !prev.depositsEnabled }))}
                    className={`p-1 rounded-full transition-colors ${
                      globalForm.depositsEnabled 
                        ? "text-emerald-500 hover:text-emerald-600" 
                        : "text-slate-400 dark:text-slate-600"
                    }`}
                  >
                    {globalForm.depositsEnabled ? <ToggleRight className="h-7 w-7" /> : <ToggleLeft className="h-7 w-7" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Minimum Deposit Amount (Per Transaction)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono font-bold">₹</span>
                    <input
                      type="number"
                      disabled={!isEditable}
                      value={globalForm.minDeposit}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGlobalForm(prev => ({ ...prev, minDeposit: val === "" ? "" : Number(val) }));
                      }}
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Maximum Deposit Amount (Per Single Transaction)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono font-bold">₹</span>
                    <input
                      type="number"
                      disabled={!isEditable}
                      value={globalForm.maxDeposit}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGlobalForm(prev => ({ ...prev, maxDeposit: val === "" ? "" : Number(val) }));
                      }}
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Maximum Total Deposit Per Day (24 Hours)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono font-bold">₹</span>
                    <input
                      type="number"
                      disabled={!isEditable}
                      value={globalForm.maxDepositPerDay}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGlobalForm(prev => ({ ...prev, maxDepositPerDay: val === "" ? "" : Number(val) }));
                      }}
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Maximum Total Deposit Per Month (Calendar Month)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono font-bold">₹</span>
                    <input
                      type="number"
                      disabled={!isEditable}
                      value={globalForm.maxDepositPerMonth}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGlobalForm(prev => ({ ...prev, maxDepositPerMonth: val === "" ? "" : Number(val) }));
                      }}
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* WITHDRAWAL SYSTEM LIMITS CARD */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <ArrowDownCircle className="h-5 w-5" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-150 uppercase tracking-wider font-display">
                    Global Withdrawal Limits
                  </h3>
                </div>

                {/* Enable / Disable Withdrawals Toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {globalForm.withdrawalsEnabled ? "Enabled" : "Disabled"}
                  </span>
                  <button
                    type="button"
                    disabled={!isEditable}
                    onClick={() => setGlobalForm(prev => ({ ...prev, withdrawalsEnabled: !prev.withdrawalsEnabled }))}
                    className={`p-1 rounded-full transition-colors ${
                      globalForm.withdrawalsEnabled 
                        ? "text-rose-500 hover:text-rose-600" 
                        : "text-slate-400 dark:text-slate-600"
                    }`}
                  >
                    {globalForm.withdrawalsEnabled ? <ToggleRight className="h-7 w-7" /> : <ToggleLeft className="h-7 w-7" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Minimum Withdrawal Amount (Per Transaction)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono font-bold">₹</span>
                    <input
                      type="number"
                      disabled={!isEditable}
                      value={globalForm.minWithdrawal}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGlobalForm(prev => ({ ...prev, minWithdrawal: val === "" ? "" : Number(val) }));
                      }}
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Maximum Withdrawal Amount (Per Single Transaction)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono font-bold">₹</span>
                    <input
                      type="number"
                      disabled={!isEditable}
                      value={globalForm.maxWithdrawal}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGlobalForm(prev => ({ ...prev, maxWithdrawal: val === "" ? "" : Number(val) }));
                      }}
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Maximum Total Withdrawal Per Day (24 Hours)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono font-bold">₹</span>
                    <input
                      type="number"
                      disabled={!isEditable}
                      value={globalForm.maxWithdrawalPerDay}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGlobalForm(prev => ({ ...prev, maxWithdrawalPerDay: val === "" ? "" : Number(val) }));
                      }}
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Maximum Total Withdrawal Per Month (Calendar Month)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono font-bold">₹</span>
                    <input
                      type="number"
                      disabled={!isEditable}
                      value={globalForm.maxWithdrawalPerMonth}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGlobalForm(prev => ({ ...prev, maxWithdrawalPerMonth: val === "" ? "" : Number(val) }));
                      }}
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DEPOSIT & WITHDRAWAL LIMITS POLICY NOTE CARD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <ShieldCheck className="h-5 w-5" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-150 uppercase tracking-wider font-display">
                    Deposit & Withdrawal Limits Policy Note (Displayed to Users)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Custom rule instructions & policy notice shown inside the user's Deposit & Withdrawal Limits modal.
                  </p>
                </div>
              </div>

              {isEditable && (
                <button
                  type="button"
                  onClick={() => setGlobalForm(prev => ({ ...prev, limitsPolicyNote: DEFAULT_LIMITS_POLICY_NOTE }))}
                  className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl transition-all cursor-pointer font-medium"
                  title="Reset policy note to system default"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset to Default Note</span>
                </button>
              )}
            </div>

            {/* User Visibility Toggle */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Eye className={`h-4 w-4 ${globalForm.showLimitsPolicyToUsers ? "text-emerald-500" : "text-slate-400"}`} />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Show Policy Guide to Users in Wallet
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {globalForm.showLimitsPolicyToUsers 
                      ? "Visible: Users can view the Deposit & Withdrawal Rules guide in their wallet."
                      : "Hidden: The Deposit & Withdrawal Rules guide will be hidden from users in their wallet."}
                  </span>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isEditable}
                  checked={globalForm.showLimitsPolicyToUsers}
                  onChange={(e) => setGlobalForm(prev => ({ ...prev, showLimitsPolicyToUsers: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:border-slate-600 peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
                Policy Note Content (Supports multiple bullet points & line breaks)
              </label>
              <textarea
                rows={6}
                disabled={!isEditable}
                value={globalForm.limitsPolicyNote}
                onChange={(e) => setGlobalForm(prev => ({ ...prev, limitsPolicyNote: e.target.value }))}
                placeholder="Enter deposit and withdrawal rules to inform users..."
                className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-60 leading-relaxed resize-y"
              />
            </div>
          </div>

          {/* Save Button Bar */}
          {isEditable && (
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingGlobal}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{isSavingGlobal ? "Saving Limits & Logging Audit..." : "Save Global System Limits"}</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* SUB-TAB 2: USER-SPECIFIC & VIP CUSTOM LIMITS */}
      {activeSubTab === "USERS" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search user by Name or Email..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Showing {filteredUsers.length} of {allUsers.length} total users
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Users Directory Table */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-xs overflow-hidden">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 px-1">
                Select User to Configure Custom Limits / VIP Status
              </h3>
              <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-6 text-center">No matching users found.</p>
                ) : (
                  filteredUsers.map((u) => {
                    const cl = u.customLimits;
                    const isSelected = selectedUser?.id === u.id;
                    const effective = getEffectiveLimits(walletLimits, u);

                    return (
                      <div
                        key={u.id}
                        onClick={() => handleSelectUser(u)}
                        className={`p-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 border ${
                          isSelected
                            ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 shadow-2xs"
                            : "hover:bg-slate-50 dark:hover:bg-slate-950 border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl font-bold text-xs uppercase ${
                            cl?.isVip
                              ? "bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-300/40"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          }`}>
                            {cl?.isVip ? <Crown className="h-4 w-4 text-amber-500" /> : <User className="h-4 w-4" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{u.name}</span>
                              {cl?.isVip && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 text-[9px] font-extrabold uppercase tracking-wider">
                                  VIP
                                </span>
                              )}
                              {cl?.hasCustomLimits && !cl?.isVip && (
                                <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[9px] font-extrabold uppercase">
                                  Custom
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono block">{u.email}</span>
                          </div>
                        </div>

                        <div className="text-right text-[11px] font-mono">
                          <div className="text-slate-600 dark:text-slate-400">
                            Dep Max: <strong className="text-slate-900 dark:text-slate-100">₹{effective.maxDeposit.toLocaleString('en-IN')}</strong>
                          </div>
                          <div className="text-slate-600 dark:text-slate-400">
                            Wth Max: <strong className="text-slate-900 dark:text-slate-100">₹{effective.maxWithdrawal.toLocaleString('en-IN')}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Custom Limit Editor Form Panel */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              {selectedUser ? (
                <div className="flex flex-col gap-4">
                  <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                        Configuring Limits For
                      </span>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                        {selectedUser.name}
                      </h4>
                      <span className="text-[11px] font-mono text-slate-400">{selectedUser.email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedUser(null)}
                      className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline cursor-pointer"
                    >
                      Close
                    </button>
                  </div>

                  {/* Toggles: VIP & Custom */}
                  <div className="flex flex-col gap-2.5 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Crown className="h-4 w-4 text-amber-500" /> VIP User Status (5x Limits)
                      </span>
                      <input
                        type="checkbox"
                        disabled={!isEditable}
                        checked={isVipChecked}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsVipChecked(checked);
                          if (checked) {
                            setHasCustomChecked(true);
                            setUserCustomForm(prev => ({
                              ...prev,
                              maxDeposit: walletLimits.maxDeposit * 5,
                              maxDepositPerDay: walletLimits.maxDepositPerDay * 5,
                              maxDepositPerMonth: walletLimits.maxDepositPerMonth * 5,
                              maxWithdrawal: walletLimits.maxWithdrawal * 5,
                              maxWithdrawalPerDay: walletLimits.maxWithdrawalPerDay * 5,
                              maxWithdrawalPerMonth: walletLimits.maxWithdrawalPerMonth * 5,
                            }));
                          }
                        }}
                        className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Sliders className="h-4 w-4 text-indigo-500" /> Enable User Custom Override
                      </span>
                      <input
                        type="checkbox"
                        disabled={!isEditable}
                        checked={hasCustomChecked}
                        onChange={(e) => setHasCustomChecked(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                    </label>
                  </div>

                  {/* Custom Limits Inputs */}
                  <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400">Min Deposit</label>
                        <input
                          type="number"
                          disabled={!isEditable}
                          value={userCustomForm.minDeposit ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setUserCustomForm(prev => ({ ...prev, minDeposit: v === "" ? "" : Number(v) }));
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400">Max Deposit / Tx</label>
                        <input
                          type="number"
                          disabled={!isEditable}
                          value={userCustomForm.maxDeposit ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setUserCustomForm(prev => ({ ...prev, maxDeposit: v === "" ? "" : Number(v) }));
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400">Max Deposit/Day</label>
                        <input
                          type="number"
                          disabled={!isEditable}
                          value={userCustomForm.maxDepositPerDay ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setUserCustomForm(prev => ({ ...prev, maxDepositPerDay: v === "" ? "" : Number(v) }));
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400">Max Deposit/Month</label>
                        <input
                          type="number"
                          disabled={!isEditable}
                          value={userCustomForm.maxDepositPerMonth ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setUserCustomForm(prev => ({ ...prev, maxDepositPerMonth: v === "" ? "" : Number(v) }));
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400">Min Withdrawal</label>
                        <input
                          type="number"
                          disabled={!isEditable}
                          value={userCustomForm.minWithdrawal ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setUserCustomForm(prev => ({ ...prev, minWithdrawal: v === "" ? "" : Number(v) }));
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400">Max Withdrawal / Tx</label>
                        <input
                          type="number"
                          disabled={!isEditable}
                          value={userCustomForm.maxWithdrawal ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setUserCustomForm(prev => ({ ...prev, maxWithdrawal: v === "" ? "" : Number(v) }));
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400">Max Withdrawal/Day</label>
                        <input
                          type="number"
                          disabled={!isEditable}
                          value={userCustomForm.maxWithdrawalPerDay ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setUserCustomForm(prev => ({ ...prev, maxWithdrawalPerDay: v === "" ? "" : Number(v) }));
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400">Max Withdrawal/Month</label>
                        <input
                          type="number"
                          disabled={!isEditable}
                          value={userCustomForm.maxWithdrawalPerMonth ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setUserCustomForm(prev => ({ ...prev, maxWithdrawalPerMonth: v === "" ? "" : Number(v) }));
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  {isEditable && (
                    <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        disabled={isSavingUser}
                        onClick={handleSaveUserLimits}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Save className="h-4 w-4" /> Save User Custom Limits
                      </button>
                      <button
                        type="button"
                        disabled={isSavingUser}
                        onClick={handleResetUserLimits}
                        className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RotateCcw className="h-4 w-4 text-amber-500" /> Reset to Global System Defaults
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <User className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-xs font-medium">Select a user from the directory on the left to edit custom limits or toggle VIP status.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: USAGE & ANALYTICS MONITOR */}
      {activeSubTab === "USAGE" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-150 uppercase tracking-wider font-display">
                Real-Time User Transaction Usage vs Configured Limits
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Monitors today & current calendar month total deposits and withdrawals for all users.
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-900">
              {allUsers.length} Active Accounts
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">User</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Today's Deposit</th>
                  <th className="p-3">Month's Deposit</th>
                  <th className="p-3">Today's Withdrawal</th>
                  <th className="p-3 rounded-r-xl">Month's Withdrawal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allUsers.map((u) => {
                  const usage = calculateUserTransactionUsage(u.id, walletTransactions);
                  const effective = getEffectiveLimits(walletLimits, u);

                  const depTodayPct = Math.min(100, Math.round((usage.todayDepositTotal / effective.maxDepositPerDay) * 100));
                  const depMonthPct = Math.min(100, Math.round((usage.monthDepositTotal / effective.maxDepositPerMonth) * 100));
                  const wthTodayPct = Math.min(100, Math.round((usage.todayWithdrawalTotal / effective.maxWithdrawalPerDay) * 100));
                  const wthMonthPct = Math.min(100, Math.round((usage.monthWithdrawalTotal / effective.maxWithdrawalPerMonth) * 100));

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/40 font-mono">
                      <td className="p-3 font-sans">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">{u.name}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">{u.email}</span>
                      </td>
                      <td className="p-3">
                        {u.customLimits?.isVip ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 text-[9px] font-extrabold font-sans">
                            👑 VIP
                          </span>
                        ) : u.customLimits?.hasCustomLimits ? (
                          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[9px] font-extrabold font-sans">
                            Custom
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-bold font-sans">
                            Default
                          </span>
                        )}
                      </td>

                      {/* Today Deposit */}
                      <td className="p-3">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          ₹{usage.todayDepositTotal.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          / ₹{effective.maxDepositPerDay.toLocaleString('en-IN')}
                        </span>
                        <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
                          <div 
                            className={`h-full ${depTodayPct >= 90 ? "bg-rose-500" : depTodayPct >= 70 ? "bg-amber-500" : "bg-emerald-500"}`} 
                            style={{ width: `${depTodayPct}%` }}
                          />
                        </div>
                      </td>

                      {/* Month Deposit */}
                      <td className="p-3">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          ₹{usage.monthDepositTotal.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          / ₹{effective.maxDepositPerMonth.toLocaleString('en-IN')}
                        </span>
                        <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
                          <div 
                            className={`h-full ${depMonthPct >= 90 ? "bg-rose-500" : depMonthPct >= 70 ? "bg-amber-500" : "bg-emerald-500"}`} 
                            style={{ width: `${depMonthPct}%` }}
                          />
                        </div>
                      </td>

                      {/* Today Withdrawal */}
                      <td className="p-3">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          ₹{usage.todayWithdrawalTotal.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          / ₹{effective.maxWithdrawalPerDay.toLocaleString('en-IN')}
                        </span>
                        <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
                          <div 
                            className={`h-full ${wthTodayPct >= 90 ? "bg-rose-500" : wthTodayPct >= 70 ? "bg-amber-500" : "bg-rose-400"}`} 
                            style={{ width: `${wthTodayPct}%` }}
                          />
                        </div>
                      </td>

                      {/* Month Withdrawal */}
                      <td className="p-3">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          ₹{usage.monthWithdrawalTotal.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          / ₹{effective.maxWithdrawalPerMonth.toLocaleString('en-IN')}
                        </span>
                        <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
                          <div 
                            className={`h-full ${wthMonthPct >= 90 ? "bg-rose-500" : wthMonthPct >= 70 ? "bg-amber-500" : "bg-rose-400"}`} 
                            style={{ width: `${wthMonthPct}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: P2P WALLET TRANSFER CONTROL */}
      {activeSubTab === "TRANSFERS" && (
        <div className="flex flex-col gap-6 animate-fade-in">
          {!isEditable && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-500 shrink-0" />
              <span>You are logged in as Staff/HR. P2P Transfer settings are in Read-Only view. Only Super Admin can modify system parameters.</span>
            </div>
          )}

          {/* Section 1: Global Transfer Master Toggle & Limits */}
          <form onSubmit={handleSaveTransferConfigSubmit} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-xs flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-display uppercase tracking-wider">
                    Global P2P Wallet Transfer Control
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Activate or deactivate peer-to-peer balance transfers application-wide and enforce strict transaction limits.
                  </p>
                </div>
              </div>

              {/* Master Switch Toggle */}
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 self-start sm:self-auto">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Feature Status:
                </span>
                <button
                  type="button"
                  disabled={!isEditable}
                  onClick={() => setTransferConfigForm(prev => ({ ...prev, isEnabled: !prev.isEnabled }))}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    transferConfigForm.isEnabled
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-rose-600 text-white shadow-xs"
                  }`}
                >
                  {transferConfigForm.isEnabled ? (
                    <>
                      <ToggleRight className="h-4 w-4" /> ACTIVE (ENABLED)
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="h-4 w-4" /> DEACTIVATED (OFF)
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Min Transfer Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  disabled={!isEditable}
                  value={transferConfigForm.minTransferAmount}
                  onChange={(e) => setTransferConfigForm(prev => ({ ...prev, minTransferAmount: e.target.value === "" ? "" : Number(e.target.value) }))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Max Per Transfer Limit (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  disabled={!isEditable}
                  value={transferConfigForm.maxTransferAmount}
                  onChange={(e) => setTransferConfigForm(prev => ({ ...prev, maxTransferAmount: e.target.value === "" ? "" : Number(e.target.value) }))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Max Daily Cumulative Limit (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  disabled={!isEditable}
                  value={transferConfigForm.dailyTransferLimit}
                  onChange={(e) => setTransferConfigForm(prev => ({ ...prev, dailyTransferLimit: e.target.value === "" ? "" : Number(e.target.value) }))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Admin Notice / System Note for P2P Transfers
              </label>
              <input
                type="text"
                disabled={!isEditable}
                value={transferConfigForm.adminNote}
                onChange={(e) => setTransferConfigForm(prev => ({ ...prev, adminNote: e.target.value }))}
                placeholder="Notice displayed on user wallet transfer section e.g. Transfers are monitored for security..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {isEditable && (
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingTransferConfig}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSavingTransferConfig ? "Saving Configuration..." : "Save P2P Transfer Settings"}</span>
                </button>
              </div>
            )}
          </form>

          {/* Section 2: User Access Control / Freeze Transfer Controls */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-xs flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
                  <Ban className="h-4 w-4 text-amber-500" />
                  User-Specific P2P Transfer Access & Restrictions
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Freeze or unfreeze wallet-to-wallet transfer capabilities for individual trader accounts.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={transferUserSearch}
                  onChange={(e) => setTransferUserSearch(e.target.value)}
                  placeholder="Filter users..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="border border-slate-100 dark:border-slate-800 rounded-xl max-h-[300px] overflow-y-auto overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">User Details</th>
                    <th className="px-4 py-3">User ID</th>
                    <th className="px-4 py-3 text-right">Available Balance</th>
                    <th className="px-4 py-3 text-center">Transfer Access</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {allUsers
                    .filter(u => 
                      u.name?.toLowerCase().includes(transferUserSearch.toLowerCase()) ||
                      u.email?.toLowerCase().includes(transferUserSearch.toLowerCase()) ||
                      u.id?.toLowerCase().includes(transferUserSearch.toLowerCase())
                    )
                    .map((user) => {
                      const isFrozen = user.isTransferDisabled;
                      return (
                        <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/30">
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">{user.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{user.email || user.mobileNumber || "No contact"}</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{user.id}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            ₹{(user.availableBalance ?? user.balance ?? 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center font-sans">
                            {isFrozen ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9.5px] font-extrabold uppercase rounded bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/60">
                                <Ban className="h-3 w-3" /> Restricted
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9.5px] font-extrabold uppercase rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60">
                                <CheckCircle className="h-3 w-3" /> Allowed
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              disabled={!isEditable}
                              onClick={() => handleToggleUserTransfer(user)}
                              className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50 ${
                                isFrozen
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : "bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                              }`}
                            >
                              {isFrozen ? "Enable Transfers" : "Restrict Transfers"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Real-time Transfer History & Audit Logs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-500" />
                  Real-time P2P Transfer Audit Vault
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Complete immutable ledger of all wallet-to-wallet transfer transactions.
                </p>
              </div>
              <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg">
                Total Logs: {transferRecords.length}
              </span>
            </div>

            {transferRecords.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">No P2P Wallet Transfers logged yet.</p>
            ) : (
              <div className="border border-slate-100 dark:border-slate-800 rounded-xl max-h-[350px] overflow-y-auto overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Tx ID / Date</th>
                      <th className="px-4 py-3">Sender</th>
                      <th className="px-4 py-3">Recipient</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3">Note</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono text-[11px]">
                    {transferRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/30">
                        <td className="px-4 py-3 font-sans">
                          <span className="font-mono text-slate-400 block truncate max-w-[120px]">{record.id}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(record.timestamp).toLocaleDateString()} at {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-sans">
                          <strong className="text-slate-800 dark:text-slate-200 block">{record.senderName}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">{record.senderId}</span>
                        </td>
                        <td className="px-4 py-3 font-sans">
                          <strong className="text-emerald-700 dark:text-emerald-400 block">{record.recipientName}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">{record.recipientId}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-indigo-600 dark:text-indigo-400 text-[12px]">
                          ₹{record.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 font-sans text-slate-500 dark:text-slate-400 max-w-[150px] truncate">
                          {record.note || "—"}
                        </td>
                        <td className="px-4 py-3 text-center font-sans">
                          <span className="inline-block px-2 py-0.5 text-[9px] font-extrabold uppercase rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {record.status}
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
      )}
    </div>
  );
};
