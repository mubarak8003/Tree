import React, { useState } from "react";
import { 
  AdminUserAccount, 
  AdminRole, 
  DepartmentType, 
  StaffPermission, 
  AdminAuditLog 
} from "../types";
import { 
  ALL_STAFF_PERMISSIONS, 
  DEFAULT_DEPARTMENT_PERMISSIONS,
  createAdminAccount,
  updateAdminAccountPermissions,
  setAdminAccountStatus,
  forceLogoutAdminAccount,
  deleteAdminAccount,
  verifyRbacSecurityPin,
  hasStaffPermission
} from "../services/adminRbacService";
import { 
  ShieldCheck, 
  Shield, 
  User, 
  Users, 
  Crown, 
  Lock, 
  Unlock, 
  Trash2, 
  Plus, 
  Search, 
  Filter, 
  Key, 
  Clock, 
  Activity, 
  Power, 
  CheckCircle2, 
  X, 
  Check, 
  Info, 
  AlertTriangle, 
  Copy, 
  RefreshCw, 
  FileText,
  Building2,
  ChevronRight,
  Eye,
  EyeOff
} from "lucide-react";

interface RbacStaffManagerProps {
  currentAdminAccount: AdminUserAccount | null;
  adminAccounts: AdminUserAccount[];
  auditLogs: AdminAuditLog[];
  onTriggerNotification?: (message: string, type: "success" | "info" | "error") => void;
}

export const RbacStaffManager: React.FC<RbacStaffManagerProps> = ({
  currentAdminAccount,
  adminAccounts,
  auditLogs,
  onTriggerNotification,
}) => {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [subView, setSubView] = useState<"accounts" | "audit_logs" | "security">("accounts");

  // Create Account Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("");
  const [newEmail, setNewEmail] = useState<string>("");
  const [newRole, setNewRole] = useState<AdminRole>("STAFF");
  const [newDepartment, setNewDepartment] = useState<DepartmentType>("Payment Staff");
  const [newPermissions, setNewPermissions] = useState<StaffPermission[]>(DEFAULT_DEPARTMENT_PERMISSIONS["Payment Staff"]);
  const [newPassword, setNewPassword] = useState<string>("");
  const [newPin, setNewPin] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);

  // Edit Permissions Modal state
  const [editingAccount, setEditingAccount] = useState<AdminUserAccount | null>(null);
  const [editDepartment, setEditDepartment] = useState<DepartmentType>("Payment Staff");
  const [editPermissions, setEditPermissions] = useState<StaffPermission[]>([]);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);

  // Security PIN Verification Modal state
  const [pinPromptAction, setPinPromptAction] = useState<{
    type: "DELETE" | "SUSPEND" | "FORCE_LOGOUT" | "EDIT";
    targetAccount: AdminUserAccount;
    extraData?: any;
  } | null>(null);
  const [pinInput, setPinInput] = useState<string>("");
  const [isVerifyingPin, setIsVerifyingPin] = useState<boolean>(false);

  // Audit Logs Filter State
  const [logSearchQuery, setLogSearchQuery] = useState<string>("");
  const [logStatusFilter, setLogStatusFilter] = useState<string>("ALL");

  const notify = (msg: string, type: "success" | "info" | "error" = "success") => {
    if (onTriggerNotification) onTriggerNotification(msg, type);
  };

  // Permission Check Helpers for Current Admin
  const isOwner = currentAdminAccount?.role === "OWNER";
  const isSuperAdmin = currentAdminAccount?.role === "SUPER_ADMIN";
  const canManageAccounts = isOwner || isSuperAdmin;

  // Department Selection Handler in Create Modal -> auto pre-selects default permissions
  const handleDepartmentChange = (dept: DepartmentType) => {
    setNewDepartment(dept);
    setNewPermissions(DEFAULT_DEPARTMENT_PERMISSIONS[dept] || []);
  };

  // Toggle permission checkbox in Create Modal
  const toggleNewPermission = (permKey: StaffPermission) => {
    if (newPermissions.includes(permKey)) {
      setNewPermissions(newPermissions.filter((p) => p !== permKey));
    } else {
      setNewPermissions([...newPermissions, permKey]);
    }
  };

  // Toggle permission checkbox in Edit Modal
  const toggleEditPermission = (permKey: StaffPermission) => {
    if (editPermissions.includes(permKey)) {
      setEditPermissions(editPermissions.filter((p) => p !== permKey));
    } else {
      setEditPermissions([...editPermissions, permKey]);
    }
  };

  // Submit Create Account
  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAdminAccount) return;

    try {
      setIsSubmittingCreate(true);
      await createAdminAccount(currentAdminAccount, {
        name: newName,
        email: newEmail,
        role: newRole,
        department: newDepartment,
        permissions: newPermissions,
        passwordInput: newPassword,
        pinInput: newPin
      });

      notify(`✅ Account created successfully for ${newName} [${newRole}]!`, "success");
      setIsCreateModalOpen(false);
      // Reset form
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewPin("");
      setNewRole("STAFF");
      setNewDepartment("Payment Staff");
      setNewPermissions(DEFAULT_DEPARTMENT_PERMISSIONS["Payment Staff"]);
    } catch (err: any) {
      notify(err.message || "Failed to create account.", "error");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Submit Edit Permissions
  const handleSaveEditedPermissions = async () => {
    if (!currentAdminAccount || !editingAccount) return;

    try {
      setIsSubmittingEdit(true);
      await updateAdminAccountPermissions(
        currentAdminAccount,
        editingAccount,
        editDepartment,
        editPermissions
      );

      notify(`✅ Updated permissions and department for ${editingAccount.name}.`, "success");
      setEditingAccount(null);
    } catch (err: any) {
      notify(err.message || "Failed to update permissions.", "error");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle PIN Protected Action Execution
  const handleConfirmPinAction = async () => {
    if (!currentAdminAccount || !pinPromptAction) return;

    try {
      setIsVerifyingPin(true);
      const isPinValid = await verifyRbacSecurityPin(pinInput, currentAdminAccount);
      if (!isPinValid) {
        notify("❌ Incorrect 6-digit Security PIN!", "error");
        return;
      }

      const { type, targetAccount } = pinPromptAction;

      if (type === "DELETE") {
        await deleteAdminAccount(currentAdminAccount, targetAccount);
        notify(`🗑️ Account ${targetAccount.name} (${targetAccount.email}) deleted permanently.`, "success");
      } else if (type === "SUSPEND") {
        const nextStatus = targetAccount.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
        await setAdminAccountStatus(currentAdminAccount, targetAccount, nextStatus);
        notify(`⚡ Account ${targetAccount.name} is now ${nextStatus}. Active sessions updated.`, "success");
      } else if (type === "FORCE_LOGOUT") {
        await forceLogoutAdminAccount(currentAdminAccount, targetAccount);
        notify(`🔒 Force logged out session for ${targetAccount.name}. Token revoked.`, "success");
      }

      setPinPromptAction(null);
      setPinInput("");
    } catch (err: any) {
      notify(err.message || "Operation failed.", "error");
    } finally {
      setIsVerifyingPin(false);
    }
  };

  // Filter accounts
  const filteredAccounts = adminAccounts.filter((acc) => {
    const matchesSearch = 
      (acc.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (acc.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (acc.department || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = departmentFilter === "ALL" || acc.department === departmentFilter;
    const matchesRole = roleFilter === "ALL" || acc.role === roleFilter;

    return matchesSearch && matchesDept && matchesRole;
  });

  // Filter audit logs
  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch = 
      log.adminEmail.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      (log.adminName && log.adminName.toLowerCase().includes(logSearchQuery.toLowerCase())) ||
      log.actionType.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(logSearchQuery.toLowerCase());

    const matchesStatus = logStatusFilter === "ALL" || log.status === logStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Group permissions by category for the permissions matrix checkbox list
  const categories = Array.from(new Set(ALL_STAFF_PERMISSIONS.map(p => p.category)));

  return (
    <div className="flex flex-col gap-5">
      {/* Active Admin Identity Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-5 text-white shadow-xl border border-indigo-900/50">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <ShieldCheck className="h-48 w-48 text-indigo-400" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-indigo-600/30 rounded-2xl border border-indigo-500/40 backdrop-blur-md">
              {currentAdminAccount?.role === "OWNER" ? (
                <Crown className="h-7 w-7 text-amber-400 animate-pulse" />
              ) : currentAdminAccount?.role === "SUPER_ADMIN" ? (
                <Shield className="h-7 w-7 text-indigo-400" />
              ) : (
                <User className="h-7 w-7 text-emerald-400" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">
                  {currentAdminAccount?.name || "Active Session Admin"}
                </h2>
                {currentAdminAccount?.role === "OWNER" && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Crown className="h-3 w-3" /> System Owner
                  </span>
                )}
                {currentAdminAccount?.role === "SUPER_ADMIN" && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Shield className="h-3 w-3" /> Super Admin
                  </span>
                )}
                {currentAdminAccount?.role === "STAFF" && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <User className="h-3 w-3" /> Staff Member
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-200/80 font-medium">
                {currentAdminAccount?.email} • Department: <span className="text-white font-bold">{currentAdminAccount?.department || "General Management"}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-300 flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-emerald-400" />
              <span>6-Digit Security PIN: <strong className="text-emerald-400">ACTIVE</strong></span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-300 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-indigo-400" />
              <span>Session Protection: <strong className="text-indigo-400">SINGLE ACTIVE</strong></span>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-indigo-900/60 text-xs">
          <div className="bg-slate-900/50 p-2.5 rounded-xl border border-indigo-900/40">
            <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Total Accounts</p>
            <p className="text-lg font-black text-white">{adminAccounts.length}</p>
          </div>
          <div className="bg-slate-900/50 p-2.5 rounded-xl border border-indigo-900/40">
            <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Active Staff</p>
            <p className="text-lg font-black text-emerald-400">{adminAccounts.filter(a => a.status === "ACTIVE").length}</p>
          </div>
          <div className="bg-slate-900/50 p-2.5 rounded-xl border border-indigo-900/40">
            <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Suspended</p>
            <p className="text-lg font-black text-rose-400">{adminAccounts.filter(a => a.status === "SUSPENDED").length}</p>
          </div>
          <div className="bg-slate-900/50 p-2.5 rounded-xl border border-indigo-900/40">
            <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Departments</p>
            <p className="text-lg font-black text-indigo-300">{Array.from(new Set(adminAccounts.map(a => a.department))).length}</p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubView("accounts")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subView === "accounts"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Staff & Admin Accounts</span>
            <span className="px-1.5 py-0.2 bg-white/20 text-white rounded-full text-[9px] font-extrabold">
              {adminAccounts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubView("audit_logs")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subView === "audit_logs"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Audit Logs</span>
            <span className="px-1.5 py-0.2 bg-white/20 text-white rounded-full text-[9px] font-extrabold">
              {auditLogs.length}
            </span>
          </button>
        </div>

        {canManageAccounts && subView === "accounts" && (
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create New Account</span>
          </button>
        )}
      </div>

      {/* SUBVIEW 1: ACCOUNTS LIST */}
      {subView === "accounts" && (
        <div className="flex flex-col gap-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff by name, email, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full py-1.5 px-2 text-xs rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="ALL">All Departments ({adminAccounts.length})</option>
                <option value="Payment Staff">Payment Staff</option>
                <option value="Customer Support">Customer Support</option>
                <option value="KYC Staff">KYC Staff</option>
                <option value="Finance Staff">Finance Staff</option>
                <option value="Trading Operations">Trading Operations</option>
                <option value="Risk Team">Risk Team</option>
                <option value="General Management">General Management</option>
              </select>
            </div>

            {/* Role Filter */}
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full py-1.5 px-2 text-xs rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="ALL">All Roles</option>
                <option value="OWNER">Owner (Highest Authority)</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="STAFF">Staff Members</option>
              </select>
            </div>
          </div>

          {/* Accounts Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Account / Identity</th>
                  <th className="px-4 py-3">Role & Department</th>
                  <th className="px-4 py-3">Granted Permissions</th>
                  <th className="px-4 py-3">Status & Session</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-medium">
                      No matching staff or admin accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((account) => {
                    const isAccountOwner = account.role === "OWNER" || account.isOwnerImmutable;
                    const isAccountSuperAdmin = account.role === "SUPER_ADMIN";

                    return (
                      <tr 
                        key={account.id} 
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors ${
                          isAccountOwner ? "bg-amber-50/20 dark:bg-amber-950/10" : ""
                        }`}
                      >
                        {/* 1. Identity */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-2 rounded-xl text-white font-bold shrink-0 ${
                              isAccountOwner 
                                ? "bg-amber-500 shadow-xs" 
                                : isAccountSuperAdmin 
                                ? "bg-indigo-600 shadow-xs" 
                                : "bg-slate-700 dark:bg-slate-800"
                            }`}>
                              {isAccountOwner ? (
                                <Crown className="h-4 w-4" />
                              ) : isAccountSuperAdmin ? (
                                <Shield className="h-4 w-4" />
                              ) : (
                                <User className="h-4 w-4" />
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-slate-900 dark:text-slate-100">
                                  {account.name}
                                </span>
                                {isAccountOwner && (
                                  <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded text-[9px] font-black uppercase">
                                    Owner
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {account.email}
                              </p>
                              {account.createdBy && (
                                <p className="text-[9px] text-slate-400">
                                  Created by: {account.createdBy}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. Role & Department */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide w-max uppercase ${
                              isAccountOwner
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                : isAccountSuperAdmin
                                ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30"
                                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                            }`}>
                              {isAccountOwner && <Crown className="h-2.5 w-2.5" />}
                              {isAccountSuperAdmin && <Shield className="h-2.5 w-2.5" />}
                              {account.role}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-slate-400" />
                              {account.department}
                            </span>
                          </div>
                        </td>

                        {/* 3. Granted Permissions */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px]">
                                {isAccountOwner || isAccountSuperAdmin ? "ALL PERMISSIONS (15/15)" : `${account.permissions.length}/15 Granted`}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {isAccountOwner || isAccountSuperAdmin ? (
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                  ⚡ Full Unrestricted Administrative Authority
                                </span>
                              ) : account.permissions.length === 0 ? (
                                <span className="text-[10px] text-slate-400 italic">No permissions assigned</span>
                              ) : (
                                account.permissions.slice(0, 4).map((p) => (
                                  <span key={p} className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-medium">
                                    {p.replace(/_/g, " ")}
                                  </span>
                                ))
                              )}
                              {account.permissions.length > 4 && !isAccountOwner && !isAccountSuperAdmin && (
                                <span className="text-[9px] text-indigo-500 font-bold self-center">
                                  +{account.permissions.length - 4} more
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 4. Status & Active Session */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider w-max ${
                              account.status === "ACTIVE"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${account.status === "ACTIVE" ? "bg-emerald-500" : "bg-rose-500"}`} />
                              {account.status}
                            </span>

                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              {account.activeSessionToken ? (
                                <span className="text-emerald-500 font-bold flex items-center gap-1">
                                  <Activity className="h-3 w-3" /> Session Active
                                </span>
                              ) : (
                                <span className="text-slate-400">Session Idle</span>
                              )}
                            </p>
                          </div>
                        </td>

                        {/* 5. Actions */}
                        <td className="px-4 py-3 text-right">
                          {isAccountOwner ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider">
                              <Crown className="h-3 w-3 text-amber-500" /> Permanent Owner
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit Permissions button */}
                              {canManageAccounts && (isOwner || !isAccountSuperAdmin) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingAccount(account);
                                    setEditDepartment(account.department);
                                    setEditPermissions(account.permissions || []);
                                  }}
                                  title="Edit Permissions & Department"
                                  className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-all cursor-pointer"
                                >
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                </button>
                              )}

                              {/* Force Logout button */}
                              {canManageAccounts && account.activeSessionToken && (isOwner || !isAccountSuperAdmin) && (
                                <button
                                  type="button"
                                  onClick={() => setPinPromptAction({ type: "FORCE_LOGOUT", targetAccount: account })}
                                  title="Force Logout / Revoke Session"
                                  className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition-all cursor-pointer"
                                >
                                  <Power className="h-3.5 w-3.5" />
                                </button>
                              )}

                              {/* Suspend / Unsuspend button */}
                              {canManageAccounts && (isOwner || !isAccountSuperAdmin) && (
                                <button
                                  type="button"
                                  onClick={() => setPinPromptAction({ type: "SUSPEND", targetAccount: account })}
                                  title={account.status === "ACTIVE" ? "Suspend Account" : "Unsuspend Account"}
                                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                    account.status === "ACTIVE"
                                      ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100"
                                      : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100"
                                  }`}
                                >
                                  {account.status === "ACTIVE" ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                                </button>
                              )}

                              {/* Delete Account button */}
                              {canManageAccounts && (isOwner || !isAccountSuperAdmin) && (
                                <button
                                  type="button"
                                  onClick={() => setPinPromptAction({ type: "DELETE", targetAccount: account })}
                                  title="Delete Account Permanently"
                                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-rose-600 hover:text-white transition-all cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBVIEW 2: AUDIT LOGS */}
      {subView === "audit_logs" && (
        <div className="flex flex-col gap-4">
          {/* Note Banner */}
          <div className="bg-indigo-50 dark:bg-indigo-950/40 p-3 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 flex items-center gap-3 text-xs text-indigo-900 dark:text-indigo-200">
            <Lock className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div>
              <p className="font-extrabold">Immutable Security & System Audit Logs</p>
              <p className="text-[11px] opacity-80">
                Every administrative action, staff creation, permission modification, and financial approval is recorded with device, IP, and timestamp telemetry. Audit logs cannot be modified or erased by Super Admin or Staff.
              </p>
            </div>
          </div>

          {/* Audit Logs Filter Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search logs by action, admin email, details..."
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <select
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value)}
                className="w-full py-1.5 px-2 text-xs rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="ALL">All Statuses (SUCCESS, FAILED, BLOCKED)</option>
                <option value="SUCCESS">SUCCESS Only</option>
                <option value="FAILED">FAILED Only</option>
                <option value="BLOCKED">BLOCKED / Security Alerts Only</option>
              </select>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="overflow-x-auto overflow-y-auto max-h-[500px] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase text-[10px] tracking-wider shadow-xs">
                <tr>
                  <th className="px-4 py-3">Timestamp & Status</th>
                  <th className="px-4 py-3">Admin Email & Role</th>
                  <th className="px-4 py-3">Action Type</th>
                  <th className="px-4 py-3">Details / Telemetry</th>
                  <th className="px-4 py-3">Before / After Values</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-medium">
                      No audit logs recorded for this criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                      {/* Timestamp & Status */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase w-max ${
                            log.status === "SUCCESS"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : log.status === "BLOCKED"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          }`}>
                            {log.status}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            {new Date(log.timestamp).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </td>

                      {/* Admin Email & Role */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-900 dark:text-slate-100">
                            {log.adminEmail}
                          </span>
                          {log.role && (
                            <span className="text-[10px] text-indigo-500 font-bold uppercase">
                              [{log.role}]
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action Type */}
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                          {log.actionType}
                        </span>
                      </td>

                      {/* Details & Device Info */}
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-slate-800 dark:text-slate-200 font-medium text-[11px] leading-snug">
                          {log.details}
                        </p>
                        <p className="text-[9px] text-slate-400 mt-0.5 truncate">
                          {log.deviceInfo}
                        </p>
                      </td>

                      {/* Before / After */}
                      <td className="px-4 py-3 max-w-xs text-[10px]">
                        {log.beforeValue || log.afterValue ? (
                          <div className="flex flex-col gap-1 font-mono text-[9px]">
                            {log.beforeValue && (
                              <div className="p-1 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 truncate">
                                <strong>BEFORE:</strong> {log.beforeValue}
                              </div>
                            )}
                            {log.afterValue && (
                              <div className="p-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 truncate">
                                <strong>AFTER:</strong> {log.afterValue}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE ACCOUNT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-600 text-white">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Create New Staff / Admin Account</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Configure role, department, credentials, and granular permission access.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsCreateModalOpen(false)} 
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccountSubmit} className="flex flex-col gap-4 text-xs">
              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Full Name */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Kumar"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. rajesh@trading.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 mb-1">Role Hierarchy *</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as AdminRole)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  >
                    <option value="STAFF">Staff Member</option>
                    {isOwner && <option value="SUPER_ADMIN">Super Admin (Appointed by Owner)</option>}
                  </select>
                </div>

                {/* Department Selection */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 mb-1">Department *</label>
                  <select
                    value={newDepartment}
                    onChange={(e) => handleDepartmentChange(e.target.value as DepartmentType)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  >
                    <option value="Payment Staff">Payment Staff</option>
                    <option value="Customer Support">Customer Support</option>
                    <option value="KYC Staff">KYC Staff</option>
                    <option value="Finance Staff">Finance Staff</option>
                    <option value="Trading Operations">Trading Operations</option>
                    <option value="Risk Team">Risk Team</option>
                    <option value="General Management">General Management</option>
                  </select>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 mb-1">Login Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Strong Password (e.g. Staff@1234)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-8 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* 6-Digit Security PIN */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 mb-1">6-Digit Security PIN *</label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    placeholder="6 Numeric Digits (e.g. 123456)"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Permissions Matrix */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Granular Staff Permissions ({newPermissions.length}/15 Selected)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewPermissions(ALL_STAFF_PERMISSIONS.map(p => p.key))}
                      className="text-[10px] font-bold text-indigo-500 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPermissions([])}
                      className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                  {categories.map((cat) => (
                    <div key={cat} className="flex flex-col gap-1.5 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">{cat}</p>
                      {ALL_STAFF_PERMISSIONS.filter(p => p.category === cat).map((perm) => {
                        const isChecked = newPermissions.includes(perm.key);
                        return (
                          <label key={perm.key} className="flex items-start gap-2 cursor-pointer hover:opacity-80">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleNewPermission(perm.key)}
                              className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">{perm.label}</p>
                              <p className="text-[9px] text-slate-400">{perm.description}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingCreate ? "Creating Account..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT PERMISSIONS MODAL */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-600 text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Edit Staff Permissions & Department</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Account: <strong className="text-indigo-500">{editingAccount.name}</strong> ({editingAccount.email})</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setEditingAccount(null)} 
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 mb-1">Department</label>
                <select
                  value={editDepartment}
                  onChange={(e) => {
                    const dept = e.target.value as DepartmentType;
                    setEditDepartment(dept);
                    setEditPermissions(DEFAULT_DEPARTMENT_PERMISSIONS[dept] || []);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-bold"
                >
                  <option value="Payment Staff">Payment Staff</option>
                  <option value="Customer Support">Customer Support</option>
                  <option value="KYC Staff">KYC Staff</option>
                  <option value="Finance Staff">Finance Staff</option>
                  <option value="Trading Operations">Trading Operations</option>
                  <option value="Risk Team">Risk Team</option>
                  <option value="General Management">General Management</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase text-slate-900 dark:text-white">
                    Assigned Permissions ({editPermissions.length}/15)
                  </label>
                  <div className="flex gap-2 text-[10px] font-bold">
                    <button type="button" onClick={() => setEditPermissions(ALL_STAFF_PERMISSIONS.map(p => p.key))} className="text-indigo-500 hover:underline cursor-pointer">Select All</button>
                    <button type="button" onClick={() => setEditPermissions([])} className="text-rose-500 hover:underline cursor-pointer">Clear All</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                  {categories.map((cat) => (
                    <div key={cat} className="flex flex-col gap-1 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">{cat}</p>
                      {ALL_STAFF_PERMISSIONS.filter(p => p.category === cat).map((perm) => (
                        <label key={perm.key} className="flex items-start gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editPermissions.includes(perm.key)}
                            onChange={() => toggleEditPermission(perm.key)}
                            className="mt-0.5 rounded text-indigo-600"
                          />
                          <span className="font-semibold text-[11px] text-slate-800 dark:text-slate-200">{perm.label}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingEdit}
                  onClick={handleSaveEditedPermissions}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingEdit ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: SECURITY PIN CONFIRMATION MODAL */}
      {pinPromptAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <Key className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Security PIN Verification</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Enter your 6-digit Security PIN to authorize action.</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
              <p className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wide">
                Target Action: {pinPromptAction.type}
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                Account: <strong>{pinPromptAction.targetAccount.name}</strong> ({pinPromptAction.targetAccount.email})
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Your 6-Digit Security PIN *
              </label>
              <input
                type="password"
                maxLength={6}
                autoFocus
                placeholder="Enter 6 numeric digits"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                className="w-full px-3 py-2 text-center text-lg font-mono tracking-widest rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-black"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPinPromptAction(null);
                  setPinInput("");
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pinInput.length !== 6 || isVerifyingPin}
                onClick={handleConfirmPinAction}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isVerifyingPin ? "Verifying..." : "Authorize Action"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
