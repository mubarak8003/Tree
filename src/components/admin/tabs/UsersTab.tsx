import React, { useState, useMemo } from "react";
import { 
  UserProfile, WalletTransaction, TradePool, SoloTrade, SavedBankDetails 
} from "../../../types";
import { 
  Users, Search, DollarSign, Ban, Trash2, AlertTriangle, Phone, ShieldCheck, 
  CreditCard, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, Check, 
  ArrowUpRight, ArrowDownRight, RefreshCw, Edit2, Shield, Eye, Key, Copy, Smartphone
} from "lucide-react";
import { 
  adjustUserBalance, toggleBlockUser, deleteUserProfile,
  adminUpdateUserKycAndBank, updateUserProfileDetails,
  regenerateUserLoginPin
} from "../../../firebaseService";

interface UsersTabProps {
  allUsers: UserProfile[];
  walletTransactions?: WalletTransaction[];
  allPools?: TradePool[];
  allSoloTrades?: SoloTrade[];
  onTriggerNotification?: (message: string, type: "success" | "info" | "error") => void;
  adminEmail: string;
}

export const UsersTab: React.FC<UsersTabProps> = ({
  allUsers,
  walletTransactions = [],
  allPools = [],
  allSoloTrades = [],
  onTriggerNotification,
  adminEmail
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Balance adjustment modal state
  const [balanceUser, setBalanceUser] = useState<UserProfile | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string | number>("");
  const [adjustType, setAdjustType] = useState<"BONUS" | "ADJUSTMENT">("BONUS");
  const [adjustReason, setAdjustReason] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);

  // KYC & Bank Details Modal state
  const [kycUser, setKycUser] = useState<UserProfile | null>(null);
  const [kycForm, setKycForm] = useState<{
    panNumber: string;
    aadhaarNumber: string;
    kycHolderName: string;
    kycStatus: "unverified" | "pending" | "verified" | "rejected";
    bankName: string;
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    isBankVerified: boolean;
  }>({
    panNumber: "",
    aadhaarNumber: "",
    kycHolderName: "",
    kycStatus: "unverified",
    bankName: "",
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    isBankVerified: false
  });
  const [isSavingKyc, setIsSavingKyc] = useState(false);

  // User delete confirmation
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // PIN Regeneration state
  const [isRegeneratingPin, setIsRegeneratingPin] = useState<string | null>(null);
  const [regeneratedPinModal, setRegeneratedPinModal] = useState<{
    pin: string;
    userId: string;
    userEmail: string;
    userName: string;
    phone?: string;
  } | null>(null);
  const [copiedPin, setCopiedPin] = useState(false);

  // Edit User Profile Modal state
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    email: string;
    phone: string;
    mobileVerified: boolean;
  }>({
    name: "",
    email: "",
    phone: "",
    mobileVerified: false
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Settlement History Filter
  const [settlementFilter, setSettlementFilter] = useState<"ALL" | "WINS" | "REFUNDS">("ALL");
  const [expandedSettlementIds, setExpandedSettlementIds] = useState<Record<string, boolean>>({});

  // 1. Calculate Per-User Aggregates (Deposits, Withdrawals, Trades, Win Rate, PnL)
  const userStatsMap = useMemo(() => {
    const map: Record<string, {
      approvedDeposit: number;
      approvedWithdrawal: number;
      totalTrades: number;
      wins: number;
      losses: number;
      draws: number;
      netPnL: number;
    }> = {};

    allUsers.forEach((u) => {
      map[u.id] = {
        approvedDeposit: 0,
        approvedWithdrawal: 0,
        totalTrades: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        netPnL: 0
      };
    });

    // Process Wallet Transactions for Deposits & Withdrawals
    walletTransactions.forEach((tx) => {
      const uStat = map[tx.userId];
      if (!uStat) return;
      if (tx.status === "APPROVED") {
        if (tx.type === "DEPOSIT") {
          uStat.approvedDeposit += Number(tx.amount || 0);
        } else if (tx.type === "WITHDRAWAL") {
          uStat.approvedWithdrawal += Number(tx.amount || 0);
        }
      }
    });

    // Process Solo Trades
    allSoloTrades.forEach((tr) => {
      const uStat = map[tr.userId];
      if (!uStat) return;
      if (tr.status === "WON") {
        uStat.totalTrades += 1;
        uStat.wins += 1;
        const profit = tr.profitOrLoss ?? ((tr.expectedPayout || 0) - tr.stake);
        uStat.netPnL += profit;
      } else if (tr.status === "LOST") {
        uStat.totalTrades += 1;
        uStat.losses += 1;
        uStat.netPnL -= tr.stake;
      } else if (tr.status === "DRAW") {
        uStat.totalTrades += 1;
        uStat.draws += 1;
      }
    });

    // Process Trade Pools
    allPools.forEach((pool) => {
      if (pool.status === "COMPLETED" || pool.status === "REFUNDED") {
        const pEntries = Object.entries(pool.participants || {});
        pEntries.forEach(([uid, p]) => {
          const uStat = map[uid];
          if (!uStat) return;

          if (pool.status === "REFUNDED") {
            uStat.totalTrades += 1;
            uStat.draws += 1;
          } else if (pool.status === "COMPLETED" && pool.outcome) {
            uStat.totalTrades += 1;
            if (pool.outcome.isProfit) {
              uStat.wins += 1;
              const userPayout = pool.outcome.payouts?.[uid] ?? p.amount;
              const profit = userPayout - p.amount;
              uStat.netPnL += profit;
            } else {
              uStat.losses += 1;
              const userPayout = pool.outcome.payouts?.[uid] ?? 0;
              const loss = p.amount - userPayout;
              uStat.netPnL -= loss;
            }
          }
        });
      }
    });

    return map;
  }, [allUsers, walletTransactions, allSoloTrades, allPools]);

  // 2. Calculate Top 4 KPI Summary Cards
  const topKpis = useMemo(() => {
    let totalNetWorth = 0;
    let totalLocked = 0;
    let totalDeposits = 0;
    let totalWithdrawals = 0;

    allUsers.forEach((u) => {
      const avail = u.availableBalance ?? u.balance ?? 0;
      const locked = u.lockedBalance ?? 0;
      totalNetWorth += (avail + locked);
      totalLocked += locked;

      const stat = userStatsMap[u.id];
      if (stat) {
        totalDeposits += stat.approvedDeposit;
        totalWithdrawals += stat.approvedWithdrawal;
      }
    });

    return {
      totalNetWorth,
      totalLocked,
      totalDeposits,
      totalWithdrawals
    };
  }, [allUsers, userStatsMap]);

  // 3. Filtered Users List
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return allUsers;
    const q = searchQuery.toLowerCase().trim();
    return allUsers.filter((u) => {
      return (
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.mobileNumber || u.phone || "").toLowerCase().includes(q) ||
        (u.id || "").toLowerCase().includes(q) ||
        (u.savedBankDetails?.bankName || "").toLowerCase().includes(q) ||
        (u.savedBankDetails?.accountNumber || "").toLowerCase().includes(q)
      );
    });
  }, [allUsers, searchQuery]);

  // 4. Settled Trade Pools & History
  const settledPoolsList = useMemo(() => {
    const list = allPools.filter((p) => p.status === "COMPLETED" || p.status === "REFUNDED");
    
    // Sort descending by date
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    if (settlementFilter === "WINS") {
      return list.filter((p) => p.status === "COMPLETED" && p.outcome?.isProfit);
    }
    if (settlementFilter === "REFUNDS") {
      return list.filter((p) => p.status === "REFUNDED" || (p.status === "COMPLETED" && !p.outcome?.isProfit && poolTotalLossIsZero(p)));
    }
    return list;
  }, [allPools, settlementFilter]);

  function poolTotalLossIsZero(p: TradePool) {
    if (p.isFreePool) return true;
    return false;
  }

  const toggleExpandSettlement = (id: string) => {
    setExpandedSettlementIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isUserAdminAccount = (u: UserProfile) => {
    if (u.isAdmin) return true;
    if (u.role && ["admin", "ADMIN", "OWNER", "SUPER_ADMIN", "STAFF", "super_admin", "staff"].includes(u.role)) return true;
    if (u.id === "admin" || u.id === "user_a" || u.id === "acc_owner_1" || u.id === "acc_super_1") return true;
    if (u.email && adminEmail && u.email.trim().toLowerCase() === adminEmail.trim().toLowerCase()) return true;
    if (u.email && (
      u.email.toLowerCase() === "amaizy1@gmail.com" ||
      u.email.toLowerCase() === "superadmin@trading.com" ||
      u.email.toLowerCase() === "payments@trading.com" ||
      u.email.toLowerCase().includes("admin@") ||
      u.email.toLowerCase().startsWith("admin")
    )) return true;
    return false;
  };

  const handleToggleBlock = async (user: UserProfile) => {
    if (isUserAdminAccount(user)) {
      onTriggerNotification?.("Admin accounts cannot be blocked! (एडमिन अकाउंट ब्लॉक नहीं किया जा सकता)", "error");
      return;
    }
    try {
      const willBlock = !user.isBlocked;
      await toggleBlockUser(user.id, willBlock);
      onTriggerNotification?.(`User ${user.name || user.id} has been ${willBlock ? "blocked" : "unblocked"}`, "info");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to update user status", "error");
    }
  };

  const handleToggleMobileVerify = async (user: UserProfile) => {
    try {
      const nextVerifyState = !user.mobileVerified;
      await updateUserProfileDetails(
        user.id,
        user.name || "Trader",
        user.email || "",
        user.phone || user.mobileNumber || "",
        nextVerifyState
      );
      onTriggerNotification?.(`Mobile verification set to ${nextVerifyState ? "VERIFIED" : "UNVERIFIED"} for ${user.name || user.email}`, "success");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to update mobile verification", "error");
    }
  };

  const handleOpenKycModal = (user: UserProfile) => {
    setKycUser(user);
    setKycForm({
      panNumber: user.panNumber || "",
      aadhaarNumber: user.aadhaarNumber || "",
      kycHolderName: user.kycHolderName || user.name || "",
      kycStatus: user.kycStatus || (user.savedBankDetails?.isVerified ? "verified" : "unverified"),
      bankName: user.savedBankDetails?.bankName || "",
      accountHolderName: user.savedBankDetails?.accountHolderName || user.name || "",
      accountNumber: user.savedBankDetails?.accountNumber || "",
      ifscCode: user.savedBankDetails?.ifscCode || "",
      isBankVerified: !!(user.savedBankDetails?.isVerified || user.kycStatus === "verified")
    });
  };

  const handleSaveKycAndBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycUser) return;
    try {
      setIsSavingKyc(true);
      await adminUpdateUserKycAndBank(kycUser.id, {
        panNumber: kycForm.panNumber,
        aadhaarNumber: kycForm.aadhaarNumber,
        kycHolderName: kycForm.kycHolderName,
        kycStatus: kycForm.kycStatus,
        savedBankDetails: kycForm.bankName ? {
          bankName: kycForm.bankName,
          accountHolderName: kycForm.accountHolderName,
          accountNumber: kycForm.accountNumber,
          ifscCode: kycForm.ifscCode,
          isVerified: kycForm.isBankVerified || kycForm.kycStatus === "verified"
        } : undefined
      });
      onTriggerNotification?.(`KYC & Bank details updated for ${kycUser.name || kycUser.email}`, "success");
      setKycUser(null);
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to update KYC details", "error");
    } finally {
      setIsSavingKyc(false);
    }
  };

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balanceUser || adjustAmount <= 0) return;
    try {
      setIsAdjusting(true);
      await adjustUserBalance(balanceUser.id, adjustAmount, adjustType, adjustReason || "Admin balance adjustment");
      onTriggerNotification?.(`Successfully adjusted balance by ₹${adjustAmount} (${adjustType})`, "success");
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
    if (isUserAdminAccount(userToDelete)) {
      onTriggerNotification?.("Admin account cannot be deleted! (एडमिन अकाउंट डिलीट नहीं किया जा सकता)", "error");
      setUserToDelete(null);
      return;
    }
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

  const handleRegeneratePin = async (user: UserProfile) => {
    try {
      setIsRegeneratingPin(user.id);
      const result = await regenerateUserLoginPin(user.id);
      setRegeneratedPinModal(result);
      onTriggerNotification?.(`Login PIN successfully regenerated for ${user.name || user.email}!`, "success");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to regenerate PIN", "error");
    } finally {
      setIsRegeneratingPin(null);
    }
  };

  const handleOpenEditModal = (user: UserProfile) => {
    setEditUser(user);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || user.mobileNumber || "",
      mobileVerified: !!user.mobileVerified
    });
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    try {
      setIsSavingEdit(true);
      await updateUserProfileDetails(
        editUser.id,
        editForm.name,
        editForm.email,
        editForm.phone,
        editForm.mobileVerified
      );
      onTriggerNotification?.(`User profile updated for ${editForm.name}`, "success");
      setEditUser(null);
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to update profile", "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " at " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Title, Count Pill, and Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400">
              SIMULATED LEDGER USER PROFILES
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60">
              {allUsers.length} Users Total
            </span>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 shadow-xs"
          />
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* TOTAL NET WORTH */}
        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 rounded-2xl p-4 shadow-xs">
          <div className="text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
            TOTAL NET WORTH
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
            ₹{topKpis.totalNetWorth.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* TOTAL LOCKED STAKE */}
        <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl p-4 shadow-xs">
          <div className="text-[10px] font-extrabold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
            TOTAL LOCKED STAKE
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
            ₹{topKpis.totalLocked.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* TOTAL APPROVED DEPOSITS */}
        <div className="bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-900/40 rounded-2xl p-4 shadow-xs">
          <div className="text-[10px] font-extrabold text-teal-800 dark:text-teal-300 uppercase tracking-wider">
            TOTAL APPROVED DEPOSITS
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            ₹{topKpis.totalDeposits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* TOTAL APPROVED WITHDRAWALS */}
        <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 rounded-2xl p-4 shadow-xs">
          <div className="text-[10px] font-extrabold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
            TOTAL APPROVED WITHDRAWALS
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
            ₹{topKpis.totalWithdrawals.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Main Users Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">TRADER NAME</th>
                <th className="py-3.5 px-3 whitespace-nowrap">MOBILE VERIFICATION</th>
                <th className="py-3.5 px-3 whitespace-nowrap">PAN/AADHAAR & BANK</th>
                <th className="py-3.5 px-3 whitespace-nowrap text-emerald-600 dark:text-emerald-400">TOTAL DEPOSIT (जमा)</th>
                <th className="py-3.5 px-3 whitespace-nowrap text-rose-600 dark:text-rose-400">TOTAL WITHDRAWAL (निकासी)</th>
                <th className="py-3.5 px-3 whitespace-nowrap text-indigo-600 dark:text-indigo-400">TRADING PERF (ट्रेडिंग)</th>
                <th className="py-3.5 px-3 whitespace-nowrap">AVAILABLE</th>
                <th className="py-3.5 px-3 whitespace-nowrap">LOCKED</th>
                <th className="py-3.5 px-3 whitespace-nowrap">TOTAL BALANCE</th>
                <th className="py-3.5 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredUsers.map((u) => {
                const stat = userStatsMap[u.id] || {
                  approvedDeposit: 0,
                  approvedWithdrawal: 0,
                  totalTrades: 0,
                  wins: 0,
                  losses: 0,
                  draws: 0,
                  netPnL: 0
                };

                const avail = Number(u.availableBalance ?? u.balance ?? 0);
                const locked = Number(u.lockedBalance ?? 0);
                const total = avail + locked;
                const winRate = stat.totalTrades > 0 ? Math.round((stat.wins / stat.totalTrades) * 100) : 0;
                const phone = u.mobileNumber || u.phone || "";
                const isBankVerified = !!(u.savedBankDetails?.isVerified || u.kycStatus === "verified");
                const isAdminUser = isUserAdminAccount(u);

                return (
                  <tr 
                    key={u.id} 
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* TRADER NAME */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                            {u.name || "Trader"}
                          </span>
                          {isAdminUser && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-0.5">
                              <ShieldCheck className="h-2.5 w-2.5 text-amber-600" />
                              ADMIN
                            </span>
                          )}
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            ID: {u.id}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {u.email}
                        </div>
                        {phone && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 flex items-center gap-1">
                              <Phone className="h-2.5 w-2.5" />
                              {phone}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* MOBILE VERIFICATION */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleMobileVerify(u)}
                        title="Click to toggle mobile verification"
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-all ${
                          u.mobileVerified
                            ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-200"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {u.mobileVerified ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span>VERIFIED</span>
                          </>
                        ) : (
                          <span>UNVERIFIED</span>
                        )}
                      </button>
                    </td>

                    {/* PAN/AADHAAR & BANK */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {u.savedBankDetails?.bankName ? (
                        <div 
                          onClick={() => handleOpenKycModal(u)}
                          className="cursor-pointer group flex flex-col gap-0.5"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                              isBankVerified
                                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                            }`}>
                              {isBankVerified ? "✓ VERIFIED" : "PENDING"}
                            </span>
                            <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">
                              {u.savedBankDetails.bankName.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            A/c: ...{u.savedBankDetails.accountNumber.slice(-4) || u.savedBankDetails.accountNumber}
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenKycModal(u)}
                          className="text-[11px] text-slate-400 hover:text-indigo-600 font-semibold cursor-pointer underline decoration-dotted"
                        >
                          Not Added
                        </button>
                      )}
                    </td>

                    {/* TOTAL DEPOSIT (जमा) */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
                        ₹{stat.approvedDeposit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* TOTAL WITHDRAWAL (निकासी) */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="font-extrabold text-rose-600 dark:text-rose-400 text-xs">
                        ₹{stat.approvedWithdrawal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* TRADING PERF (ट्रेडिंग) */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {stat.totalTrades > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-black text-xs ${
                              stat.netPnL >= 0 
                                ? "text-emerald-600 dark:text-emerald-400" 
                                : "text-rose-600 dark:text-rose-400"
                            }`}>
                              {stat.netPnL >= 0 ? "+" : ""}₹{stat.netPnL.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="px-1.5 py-0.2 rounded-md text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50">
                              {winRate}% Win
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                            <span>{stat.totalTrades} Trades:</span>
                            <span className="text-emerald-600">{stat.wins}W</span>
                            <span className="text-rose-600">{stat.losses}L</span>
                            {stat.draws > 0 && <span className="text-amber-600">{stat.draws}D</span>}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No Trades</span>
                      )}
                    </td>

                    {/* AVAILABLE */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                        ₹{avail.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* LOCKED */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="font-bold text-amber-600 dark:text-amber-400 text-xs">
                        ₹{locked.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* TOTAL BALANCE */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="font-black text-slate-900 dark:text-slate-100 text-xs">
                        ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Regenerate PIN Button */}
                        <button
                          type="button"
                          onClick={() => handleRegeneratePin(u)}
                          disabled={isRegeneratingPin === u.id}
                          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-lg text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 transition-all shadow-2xs disabled:opacity-50"
                          title="Regenerate 6-Digit Secret Login PIN"
                        >
                          <Key className="h-3 w-3 text-amber-500" />
                          <span>{isRegeneratingPin === u.id ? "Generating..." : "Regenerate PIN"}</span>
                        </button>

                        {/* Edit Profile Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(u)}
                          className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 transition-all shadow-2xs"
                          title="Edit User Profile (Name, Email, Phone)"
                        >
                          <Edit2 className="h-3 w-3 text-blue-400" />
                          <span>Edit</span>
                        </button>

                        {/* Adjust Balance Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setBalanceUser(u);
                            setAdjustAmount(0);
                          }}
                          className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 transition-all shadow-2xs"
                          title="Adjust Balance"
                        >
                          <span>Balance</span>
                        </button>

                        {/* KYC & Bank Details Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenKycModal(u)}
                          className="p-1 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-800 cursor-pointer transition-all border border-slate-700/50"
                          title="View / Edit KYC & Bank Details"
                        >
                          <Shield className="h-3.5 w-3.5" />
                        </button>

                        {/* Block & Delete Protected for Admins */}
                        {isAdminUser ? (
                          <span 
                            className="px-2 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 rounded-lg text-[10px] font-black flex items-center gap-1 cursor-default select-none"
                            title="Admin account cannot be blocked or deleted"
                          >
                            <ShieldCheck className="h-3 w-3 text-amber-600" />
                            <span>Protected</span>
                          </span>
                        ) : (
                          <>
                            {/* Block / Unblock Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleBlock(u)}
                              className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                                u.isBlocked 
                                  ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950" 
                                  : "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                              }`}
                              title={u.isBlocked ? "Unblock User" : "Block User"}
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </button>

                            {/* Delete User Button */}
                            <button
                              type="button"
                              onClick={() => {
                                if (isUserAdminAccount(u)) {
                                  onTriggerNotification?.("Admin account cannot be deleted! (एडमिन अकाउंट डिलीट नहीं किया जा सकता)", "error");
                                  return;
                                }
                                setUserToDelete(u);
                              }}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg cursor-pointer transition-all"
                              title="Delete User"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trade Settlement History Section (Matching Screenshot) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Trade Settlement History
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {allPools.filter((p) => p.status === "COMPLETED" || p.status === "REFUNDED").length} Settled
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Complete ledger of resolved trade pools, outcomes, and payout distributions.
              </p>
            </div>
          </div>

          {/* Filter Pills: All, Wins, Refunds */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setSettlementFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                settlementFilter === "ALL"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              All ({allPools.filter((p) => p.status === "COMPLETED" || p.status === "REFUNDED").length})
            </button>
            <button
              type="button"
              onClick={() => setSettlementFilter("WINS")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                settlementFilter === "WINS"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Wins
            </button>
            <button
              type="button"
              onClick={() => setSettlementFilter("REFUNDS")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                settlementFilter === "REFUNDS"
                  ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Refunds
            </button>
          </div>
        </div>

        {/* Settled Pools List */}
        <div className="space-y-3">
          {settledPoolsList.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs font-medium">
              No settled trade pools found for this filter.
            </div>
          ) : (
            settledPoolsList.map((pool) => {
              const isExpanded = !!expandedSettlementIds[pool.id];
              const isRefund = pool.status === "REFUNDED";
              const isWin = pool.status === "COMPLETED" && pool.outcome?.isProfit;
              const participants = Object.values(pool.participants || {});

              return (
                <div 
                  key={pool.id}
                  className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Pool Type, Trade direction, ID, and Date */}
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${
                        isWin 
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                          : isRefund
                          ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400"
                          : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
                      }`}>
                        <Clock className="h-4 w-4" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                            {pool.isFreePool ? `FREE Pool (₹${pool.freeRewardAmount || 10})` : `₹${pool.targetAmount || 100} Pool`}
                          </span>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-0.5 ${
                            pool.tradeType === "CALL"
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                              : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                          }`}>
                            {pool.tradeType === "CALL" ? "↗ CALL" : "↘ PUT"}
                          </span>

                          {pool.isFreePool && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                              FREE
                            </span>
                          )}

                          {pool.assetPair && (
                            <span className="text-[10px] font-semibold text-slate-500">
                              · {pool.assetPair}
                            </span>
                          )}
                        </div>

                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          #{pool.id.replace("pool_", "")} · {formatDateTime(pool.outcome?.completedAt || pool.createdAt)}
                        </div>
                      </div>
                    </div>

                    {/* Right: Outcome badge & Expand Button */}
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        {isRefund ? (
                          <div>
                            <div className="text-xs font-black text-amber-600 dark:text-amber-400">
                              Refunded
                            </div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                              TIMER EXPIRED
                            </div>
                          </div>
                        ) : isWin ? (
                          <div>
                            <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                              {pool.isFreePool ? `+₹${pool.freeRewardAmount || 1}` : `+${pool.outcome?.percentageChange || pool.expectedReturn || 15}%`}
                            </div>
                            <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                              {pool.isFreePool ? "BONUS PAID" : "PROFIT DISTRIBUTED"}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-xs font-black text-rose-600 dark:text-rose-400">
                              Loss
                            </div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                              SETTLED AS LOSS
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleExpandSettlement(pool.id)}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                      >
                        <span>Details</span>
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Breakdown */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/80 space-y-2">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        PARTICIPANTS & PAYOUTS ({participants.length})
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {participants.map((p) => {
                          const payout = pool.outcome?.payouts?.[p.userId] ?? (isRefund ? p.amount : 0);
                          return (
                            <div 
                              key={p.userId} 
                              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="font-bold text-slate-900 dark:text-slate-100">
                                  {p.userName || p.email?.split("@")[0] || "Trader"}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  Stake: ₹{p.amount}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-extrabold text-emerald-600 dark:text-emerald-400">
                                  ₹{payout.toFixed(2)}
                                </div>
                                <div className="text-[9px] text-slate-400">
                                  Payout
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Balance Adjustment Modal */}
      {balanceUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
              Adjust Balance: {balanceUser.name || balanceUser.id}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Current Available: ₹{(balanceUser.availableBalance ?? balanceUser.balance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>

            <form onSubmit={handleAdjustBalance} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Action Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType("BONUS")}
                    className={`py-2 text-xs font-bold rounded-xl cursor-pointer transition-all ${
                      adjustType === "BONUS" ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    + Add Bonus / Credit
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("ADJUSTMENT")}
                    className={`py-2 text-xs font-bold rounded-xl cursor-pointer transition-all ${
                      adjustType === "ADJUSTMENT" ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Adjust / Correction
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 font-bold"
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

      {/* KYC & Bank Details Modal */}
      {kycUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    KYC & Bank Account Details
                  </h3>
                  <p className="text-xs text-slate-500">{kycUser.name} ({kycUser.email})</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setKycUser(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveKycAndBank} className="space-y-4">
              {/* KYC Status & Identification */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-3">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  KYC & Identity Verification
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">PAN Card Number</label>
                    <input
                      type="text"
                      placeholder="ABCDE1234F"
                      value={kycForm.panNumber}
                      onChange={(e) => setKycForm({ ...kycForm, panNumber: e.target.value.toUpperCase() })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Aadhaar Number</label>
                    <input
                      type="text"
                      placeholder="12-digit number"
                      value={kycForm.aadhaarNumber}
                      onChange={(e) => setKycForm({ ...kycForm, aadhaarNumber: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">KYC Full Name</label>
                  <input
                    type="text"
                    value={kycForm.kycHolderName}
                    onChange={(e) => setKycForm({ ...kycForm, kycHolderName: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Verification Status</label>
                  <select
                    value={kycForm.kycStatus}
                    onChange={(e) => setKycForm({ ...kycForm, kycStatus: e.target.value as any })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    <option value="unverified">Unverified</option>
                    <option value="pending">Pending Review</option>
                    <option value="verified">Verified (Approved)</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Bank Account Details */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-3">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Bank Account Details
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank, SBI"
                      value={kycForm.bankName}
                      onChange={(e) => setKycForm({ ...kycForm, bankName: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      value={kycForm.accountHolderName}
                      onChange={(e) => setKycForm({ ...kycForm, accountHolderName: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={kycForm.accountNumber}
                      onChange={(e) => setKycForm({ ...kycForm, accountNumber: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC0001234"
                      value={kycForm.ifscCode}
                      onChange={(e) => setKycForm({ ...kycForm, ifscCode: e.target.value.toUpperCase() })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setKycUser(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingKyc}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSavingKyc ? "Saving..." : "Save KYC & Bank Details"}
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

      {/* Regenerated Secret Login PIN Modal */}
      {regeneratedPinModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-center space-y-4">
            <div className="w-14 h-14 bg-amber-500/10 text-amber-500 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Key className="h-7 w-7" />
            </div>

            <div>
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[11px] font-black uppercase tracking-wider">
                ✓ PIN Regenerated
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">
                New Login PIN Generated
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Trader profile for <strong className="text-slate-800 dark:text-slate-200">{regeneratedPinModal.userName}</strong> ({regeneratedPinModal.userEmail})
              </p>
            </div>

            {/* Generated PIN Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/90 border border-amber-500/30 rounded-2xl space-y-2">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                New 6-Digit Secret Login PIN
              </span>
              <div className="text-3xl font-mono font-black tracking-widest text-emerald-600 dark:text-emerald-400 py-1 select-all">
                {regeneratedPinModal.pin}
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                🔑 Failed login attempts & lockout have been reset. Trader can now log in using this PIN.
              </p>
            </div>

            {/* Actions: Copy & Share */}
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(regeneratedPinModal.pin);
                  setCopiedPin(true);
                  onTriggerNotification?.("Login PIN copied to clipboard!", "success");
                  setTimeout(() => setCopiedPin(false), 2000);
                }}
                className="flex-1 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                {copiedPin ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy PIN</span>
                  </>
                )}
              </button>

              {regeneratedPinModal.phone && (
                <a
                  href={`https://wa.me/${regeneratedPinModal.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Hi ${regeneratedPinModal.userName}, your Login PIN has been reset by Admin. Your new 6-digit Secret Login PIN is: ${regeneratedPinModal.pin}. Login Email: ${regeneratedPinModal.userEmail}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Smartphone className="h-4 w-4" />
                  <span>Send WhatsApp</span>
                </a>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setRegeneratedPinModal(null)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
            >
              Done / Close
            </button>
          </div>
        </div>
      )}

      {/* Edit User Profile Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-2xl">
                  <Edit2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Edit User Profile
                  </h3>
                  <p className="text-xs text-slate-500">ID: {editUser.id}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Mobile / Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. +91 9876543210"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Mobile Verification Status
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Allow direct trading without phone OTP
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={editForm.mobileVerified}
                  onChange={(e) => setEditForm({ ...editForm, mobileVerified: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSavingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
