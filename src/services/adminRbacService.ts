import { 
  doc, 
  getDoc, 
  getDocs,
  where,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit 
} from "firebase/firestore";
import bcrypt from "bcryptjs";
import { db } from "../firebase";
import { 
  AdminUserAccount, 
  AdminRole, 
  DepartmentType, 
  StaffPermission, 
  AdminAuditLog 
} from "../types";

export const ALL_STAFF_PERMISSIONS: { key: StaffPermission; label: string; description: string; category: string }[] = [
  { key: "view_users", label: "View User Profiles", description: "Access user list, profile details, and account balances.", category: "User Management" },
  { key: "freeze_unfreeze_users", label: "Freeze / Unfreeze Accounts", description: "Lock or unlock user trading and wallet operations.", category: "User Management" },
  { key: "view_transactions", label: "View Wallet Transactions", description: "Access deposit, withdrawal, and adjustment logs.", category: "Financial Operations" },
  { key: "approve_deposits", label: "Approve Deposits", description: "Authorize incoming deposit requests and credit user balance.", category: "Financial Operations" },
  { key: "reject_deposits", label: "Reject Deposits", description: "Decline deposit requests with reason notes.", category: "Financial Operations" },
  { key: "approve_withdrawals", label: "Approve Withdrawals", description: "Authorize payout processing for user withdrawals.", category: "Financial Operations" },
  { key: "reject_withdrawals", label: "Reject Withdrawals", description: "Decline withdrawal requests and restore locked funds.", category: "Financial Operations" },
  { key: "verify_kyc", label: "Verify KYC Documents", description: "Approve or reject user identity verification (PAN/Aadhaar).", category: "Compliance & KYC" },
  { key: "reply_support", label: "Reply to Support Tickets", description: "Answer customer support inquiries and resolve tickets.", category: "Customer Support" },
  { key: "live_chat", label: "Live Chat Support", description: "Engage in real-time chat with trading clients.", category: "Customer Support" },
  { key: "export_reports", label: "Export Financial Reports", description: "Download CSV/PDF audit and transaction reports.", category: "Reporting & Analytics" },
  { key: "view_trade_history", label: "View Trade History & Telemetry", description: "Inspect group pools, solo trades, and price feed monitor.", category: "Trading Operations" },
  { key: "manage_solo_config", label: "Manage Solo Trading Config", description: "Configure payout percentages, stake limits, and durations.", category: "Trading Operations" },
  { key: "manage_payment_gateways", label: "Manage Payment Gateways", description: "Update UPI IDs, bank details, and deposit QR codes.", category: "System Settings" },
  { key: "view_audit_logs", label: "View System Audit Logs", description: "Inspect system security and administrative action logs.", category: "Security & Audit" }
];

export const DEFAULT_DEPARTMENT_PERMISSIONS: Record<DepartmentType, StaffPermission[]> = {
  "Payment Staff": ["view_transactions", "approve_deposits", "reject_deposits", "approve_withdrawals", "reject_withdrawals", "manage_payment_gateways"],
  "Customer Support": ["view_users", "reply_support", "live_chat"],
  "KYC Staff": ["view_users", "verify_kyc"],
  "Finance Staff": ["view_users", "view_transactions", "approve_deposits", "approve_withdrawals", "export_reports", "view_audit_logs"],
  "Trading Operations": ["view_users", "view_trade_history", "manage_solo_config"],
  "Risk Team": ["view_users", "freeze_unfreeze_users", "view_transactions", "view_trade_history", "view_audit_logs"],
  "General Management": ALL_STAFF_PERMISSIONS.map(p => p.key),
  "HR & Payroll": ["view_users", "export_reports", "view_audit_logs"]
};

// Initial Seed Accounts
const DEFAULT_OWNER_ACCOUNT: AdminUserAccount = {
  id: "acc_owner_1",
  email: "amaizy1@gmail.com",
  name: "Master Platform Owner",
  role: "OWNER",
  department: "General Management",
  permissions: ALL_STAFF_PERMISSIONS.map(p => p.key),
  status: "ACTIVE",
  createdAt: new Date().toISOString(),
  lastLoginAt: null,
  failedAttempts: 0,
  lockedUntil: null,
  is2FAEnabled: true,
  isOwnerImmutable: true,
  passwordHash: bcrypt.hashSync("Admin@1234", 10),
  pinHash: bcrypt.hashSync("123456", 10)
};

const DEFAULT_SUPER_ADMIN_ACCOUNT: AdminUserAccount = {
  id: "acc_super_1",
  email: "superadmin@trading.com",
  name: "Senior Super Admin",
  role: "SUPER_ADMIN",
  department: "General Management",
  permissions: ALL_STAFF_PERMISSIONS.map(p => p.key),
  status: "ACTIVE",
  createdAt: new Date().toISOString(),
  lastLoginAt: null,
  failedAttempts: 0,
  lockedUntil: null,
  is2FAEnabled: false,
  passwordHash: bcrypt.hashSync("Super@1234", 10),
  pinHash: bcrypt.hashSync("123456", 10)
};

const DEFAULT_STAFF_ACCOUNTS: AdminUserAccount[] = [
  {
    id: "acc_staff_pay",
    email: "payments@trading.com",
    name: "Rahul Sharma (Payments)",
    role: "STAFF",
    department: "Payment Staff",
    permissions: DEFAULT_DEPARTMENT_PERMISSIONS["Payment Staff"],
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
    failedAttempts: 0,
    lockedUntil: null,
    passwordHash: bcrypt.hashSync("Staff@1234", 10),
    pinHash: bcrypt.hashSync("123456", 10)
  },
  {
    id: "acc_staff_kyc",
    email: "kyc@trading.com",
    name: "Priya Patel (KYC & Audit)",
    role: "STAFF",
    department: "KYC Staff",
    permissions: DEFAULT_DEPARTMENT_PERMISSIONS["KYC Staff"],
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
    failedAttempts: 0,
    lockedUntil: null,
    passwordHash: bcrypt.hashSync("Staff@1234", 10),
    pinHash: bcrypt.hashSync("123456", 10)
  },
  {
    id: "acc_staff_support",
    email: "support@trading.com",
    name: "Amit Verma (Support Lead)",
    role: "STAFF",
    department: "Customer Support",
    permissions: DEFAULT_DEPARTMENT_PERMISSIONS["Customer Support"],
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
    failedAttempts: 0,
    lockedUntil: null,
    passwordHash: bcrypt.hashSync("Staff@1234", 10),
    pinHash: bcrypt.hashSync("123456", 10)
  }
];

/**
 * Enhanced Audit Logging Helper with Before & After Values
 */
export async function logRbacAuditAction(
  admin: { email: string; name?: string; role?: AdminRole },
  actionType: string,
  details: string,
  status: "SUCCESS" | "FAILED" | "BLOCKED" = "SUCCESS",
  beforeValue?: string,
  afterValue?: string,
  targetUserOrId?: string,
  amount?: number
): Promise<void> {
  try {
    const logsRef = collection(db, "admin_audit_logs");
    const logId = "log_rbac_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "Server Terminal";
    const screenRes = typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "Desktop";
    const deviceInfo = `${userAgent} [${screenRes}]`;

    const logData: AdminAuditLog = {
      id: logId,
      actionType,
      adminEmail: admin.email,
      adminName: admin.name || "System Admin",
      role: admin.role || "STAFF",
      details,
      beforeValue: beforeValue || "",
      afterValue: afterValue || "",
      targetUserOrId: targetUserOrId || "",
      amount: amount || 0,
      status,
      timestamp: new Date().toISOString(),
      deviceInfo,
      ipAddress: "127.0.0.1 (Secure GCP Proxy)"
    };

    await setDoc(doc(logsRef, logId), logData);
  } catch (err) {
    console.warn("Notice recording RBAC audit log:", err);
  }
}

/**
 * Subscribe to all Admin & Staff accounts in real-time
 */
export function subscribeAdminAccounts(callback: (accounts: AdminUserAccount[]) => void) {
  const accountsRef = collection(db, "admin_accounts");
  const q = query(accountsRef, orderBy("createdAt", "asc"));

  return onSnapshot(q, async (snapshot) => {
    if (snapshot.empty) {
      // Seed default Owner, Super Admin, and Staff accounts
      try {
        await setDoc(doc(accountsRef, DEFAULT_OWNER_ACCOUNT.id), DEFAULT_OWNER_ACCOUNT);
        await setDoc(doc(accountsRef, DEFAULT_SUPER_ADMIN_ACCOUNT.id), DEFAULT_SUPER_ADMIN_ACCOUNT);
        for (const staff of DEFAULT_STAFF_ACCOUNTS) {
          await setDoc(doc(accountsRef, staff.id), staff);
        }
        callback([DEFAULT_OWNER_ACCOUNT, DEFAULT_SUPER_ADMIN_ACCOUNT, ...DEFAULT_STAFF_ACCOUNTS]);
      } catch (err) {
        console.warn("Notice seeding default RBAC accounts:", err);
        callback([DEFAULT_OWNER_ACCOUNT, DEFAULT_SUPER_ADMIN_ACCOUNT, ...DEFAULT_STAFF_ACCOUNTS]);
      }
    } else {
      const accounts: AdminUserAccount[] = [];
      snapshot.forEach((docSnap) => {
        accounts.push(docSnap.data() as AdminUserAccount);
      });

      // Ensure Owner account is always present and marked immutable
      const hasOwner = accounts.some(a => a.role === "OWNER" || a.email.toLowerCase() === DEFAULT_OWNER_ACCOUNT.email.toLowerCase());
      if (!hasOwner) {
        await setDoc(doc(accountsRef, DEFAULT_OWNER_ACCOUNT.id), DEFAULT_OWNER_ACCOUNT).catch(() => {});
        accounts.unshift(DEFAULT_OWNER_ACCOUNT);
      }

      callback(accounts);
    }
  }, (err) => {
    console.warn("Notice subscribing to admin_accounts:", err);
    callback([DEFAULT_OWNER_ACCOUNT, DEFAULT_SUPER_ADMIN_ACCOUNT, ...DEFAULT_STAFF_ACCOUNTS]);
  });
}

/**
 * Authenticate Admin/Staff login with password, account lockout, and active session tracking
 */
export async function loginAdminAccount(
  emailInput: string,
  passwordInput: string
): Promise<{ success: boolean; account: AdminUserAccount; sessionToken: string }> {
  const cleanEmail = emailInput.trim().toLowerCase();
  const cleanPassword = passwordInput.trim();

  if (!cleanEmail || !cleanPassword) {
    throw new Error("Please enter both email and password.");
  }

  // 1. Fetch account by matching email or default owner
  const accountsRef = collection(db, "admin_accounts");
  let targetAccount: AdminUserAccount | null = null;

  try {
    if (cleanEmail === DEFAULT_OWNER_ACCOUNT.email.toLowerCase()) {
      const qSnap = await getDoc(doc(accountsRef, "acc_owner_1"));
      if (qSnap.exists()) {
        targetAccount = qSnap.data() as AdminUserAccount;
      } else {
        targetAccount = DEFAULT_OWNER_ACCOUNT;
        await setDoc(doc(accountsRef, "acc_owner_1"), DEFAULT_OWNER_ACCOUNT);
      }
    }
  } catch (e) {
    console.warn("Firestore lookup fallback for owner:", e);
  }

  if (!targetAccount) {
    try {
      const qSnap = await getDocs(query(accountsRef, where("email", "==", cleanEmail)));
      if (!qSnap.empty) {
        targetAccount = qSnap.docs[0].data() as AdminUserAccount;
      } else {
        const allSnap = await getDocs(accountsRef);
        allSnap.forEach((d) => {
          const acc = d.data() as AdminUserAccount;
          if (acc.email && acc.email.trim().toLowerCase() === cleanEmail) {
            targetAccount = acc;
          }
        });
      }
    } catch (e) {
      console.warn("Firestore query error for admin_account by email:", e);
    }
  }

  if (!targetAccount) {
    try {
      // Search by sanitized email doc ID fallback
      const docRef = doc(db, "admin_accounts", cleanEmail.replace(/[@.]/g, "_"));
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        targetAccount = docSnap.data() as AdminUserAccount;
      }
    } catch (e) {
      console.warn("Firestore doc lookup fallback notice:", e);
    }
  }

  // Fallback: search default static list if DB lookup missed
  if (!targetAccount) {
    if (cleanEmail === DEFAULT_OWNER_ACCOUNT.email.toLowerCase()) targetAccount = DEFAULT_OWNER_ACCOUNT;
    else if (cleanEmail === DEFAULT_SUPER_ADMIN_ACCOUNT.email.toLowerCase()) targetAccount = DEFAULT_SUPER_ADMIN_ACCOUNT;
    else {
      const matched = DEFAULT_STAFF_ACCOUNTS.find(s => s.email.toLowerCase() === cleanEmail);
      if (matched) targetAccount = matched;
    }
  }

  if (!targetAccount) {
    await logRbacAuditAction(
      { email: cleanEmail, name: "Unknown User", role: "STAFF" },
      "ADMIN_LOGIN_FAILED",
      `Invalid account email attempt: ${cleanEmail}`,
      "FAILED"
    );
    throw new Error("❌ Invalid Admin or Staff credentials!");
  }

  // 2. Check if Account is Suspended
  if (targetAccount.status === "SUSPENDED") {
    await logRbacAuditAction(
      targetAccount,
      "ADMIN_LOGIN_BLOCKED",
      `Suspended account attempted login: ${cleanEmail}`,
      "BLOCKED"
    );
    throw new Error("⛔ Your account has been SUSPENDED by the Owner or Super Admin. Please contact system support.");
  }

  // 3. Check Account Lockout (5 failed attempts -> 30 mins lock)
  if (targetAccount.lockedUntil) {
    const lockTime = new Date(targetAccount.lockedUntil).getTime();
    const now = Date.now();
    if (now < lockTime) {
      const remainingMins = Math.ceil((lockTime - now) / 60000);
      await logRbacAuditAction(
        targetAccount,
        "ADMIN_LOGIN_BLOCKED",
        `Login attempt during 30-min lockout. Remaining: ${remainingMins} min(s).`,
        "BLOCKED"
      );
      throw new Error(`⛔ Account is LOCKED due to 5 failed login attempts. Try again in ${remainingMins} minute(s).`);
    }
  }

  // 4. Verify Password or PIN with bcrypt
  let isMatch = false;

  // Check targetAccount hashes first
  if (targetAccount.passwordHash && bcrypt.compareSync(cleanPassword, targetAccount.passwordHash)) {
    isMatch = true;
  } else if (targetAccount.pinHash && bcrypt.compareSync(cleanPassword, targetAccount.pinHash)) {
    isMatch = true;
  }

  // Cross-check master admin_auth_state in Firestore if targetAccount has no match
  if (!isMatch) {
    try {
      const authSnap = await getDoc(doc(db, "app_settings", "admin_auth_state"));
      if (authSnap.exists()) {
        const authData = authSnap.data();
        if (authData.passwordHash && bcrypt.compareSync(cleanPassword, authData.passwordHash)) {
          isMatch = true;
          // Sync updated passwordHash into targetAccount doc
          targetAccount.passwordHash = authData.passwordHash;
          const docId = targetAccount.id || cleanEmail.replace(/[@.]/g, "_");
          await updateDoc(doc(db, "admin_accounts", docId), { passwordHash: authData.passwordHash }).catch(() => {});
        } else if (authData.pinHash && bcrypt.compareSync(cleanPassword, authData.pinHash)) {
          isMatch = true;
          // Sync updated pinHash into targetAccount doc
          targetAccount.pinHash = authData.pinHash;
          const docId = targetAccount.id || cleanEmail.replace(/[@.]/g, "_");
          await updateDoc(doc(db, "admin_accounts", docId), { pinHash: authData.pinHash }).catch(() => {});
        }
      }
    } catch (err) {
      console.warn("Notice reading admin_auth_state during RBAC login check:", err);
    }
  }

  // Fallback for initial default passwords ONLY IF passwordHash is not initialized in targetAccount or admin_auth_state
  if (!isMatch && !targetAccount.passwordHash) {
    if (
      (targetAccount.role === "OWNER" && cleanPassword === "Admin@1234") ||
      (targetAccount.role === "SUPER_ADMIN" && cleanPassword === "Super@1234") ||
      (targetAccount.role === "STAFF" && cleanPassword === "Staff@1234")
    ) {
      isMatch = true;
      targetAccount.passwordHash = bcrypt.hashSync(cleanPassword, 10);
    }
  }

  if (!isMatch) {
    const failed = (targetAccount.failedAttempts || 0) + 1;
    const docId = targetAccount.id || cleanEmail.replace(/[@.]/g, "_");
    const accountDocRef = doc(db, "admin_accounts", docId);

    if (failed >= 5) {
      const lockUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      await updateDoc(accountDocRef, {
        failedAttempts: 0,
        lockedUntil: lockUntil
      }).catch(console.error);

      await logRbacAuditAction(
        targetAccount,
        "ADMIN_ACCOUNT_LOCKED",
        "5 failed login attempts. Account locked for 30 minutes.",
        "BLOCKED"
      );
      throw new Error("⛔ 5 failed login attempts reached! Account locked for 30 minutes.");
    } else {
      await updateDoc(accountDocRef, {
        failedAttempts: failed
      }).catch(console.error);

      await logRbacAuditAction(
        targetAccount,
        "ADMIN_LOGIN_FAILED",
        `Invalid password attempt (${failed}/5).`,
        "FAILED"
      );
      throw new Error(`❌ Invalid Password! ${5 - failed} attempt(s) remaining before 30-minute account lockout.`);
    }
  }

  // 5. Successful Authentication -> Generate single active session token & log device
  const sessionToken = `sess_${targetAccount.role.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "Browser Terminal";
  const nowISO = new Date().toISOString();

  const docId = targetAccount.id || cleanEmail.replace(/[@.]/g, "_");
  const accountDocRef = doc(db, "admin_accounts", docId);

  const updatedAccountState: Partial<AdminUserAccount> = {
    failedAttempts: 0,
    lockedUntil: null,
    lastLoginAt: nowISO,
    lastLoginDevice: userAgent,
    activeSessionToken: sessionToken,
    activeSessionDevice: userAgent,
    passwordHash: targetAccount.passwordHash
  };

  await setDoc(accountDocRef, updatedAccountState, { merge: true }).catch(console.error);

  targetAccount.activeSessionToken = sessionToken;
  targetAccount.lastLoginAt = nowISO;
  targetAccount.failedAttempts = 0;

  await logRbacAuditAction(
    targetAccount,
    "ADMIN_LOGIN_SUCCESS",
    `Authenticated successfully as [${targetAccount.role}] in department [${targetAccount.department}]. Active session issued.`,
    "SUCCESS"
  );

  return {
    success: true,
    account: targetAccount,
    sessionToken
  };
}

/**
 * Verify 6-digit Security PIN for sensitive actions
 */
export async function verifyRbacSecurityPin(
  pinInput: string,
  account: AdminUserAccount
): Promise<boolean> {
  const cleanPin = pinInput.trim();
  if (!cleanPin || !/^\d{6}$/.test(cleanPin)) {
    throw new Error("A valid 6-digit Security PIN is required.");
  }

  let pinHash = account.pinHash;
  let isMatch = pinHash ? bcrypt.compareSync(cleanPin, pinHash) : false;

  if (!isMatch) {
    try {
      const authSnap = await getDoc(doc(db, "app_settings", "admin_auth_state"));
      if (authSnap.exists() && authSnap.data().pinHash) {
        if (bcrypt.compareSync(cleanPin, authSnap.data().pinHash)) {
          isMatch = true;
          // Sync pinHash to account doc
          const docId = account.id || account.email.replace(/[@.]/g, "_");
          await updateDoc(doc(db, "admin_accounts", docId), { pinHash: authSnap.data().pinHash }).catch(() => {});
        }
      }
    } catch (e) {
      console.warn("Notice reading admin_auth_state in verifyRbacSecurityPin:", e);
    }
  }

  if (!isMatch) {
    await logRbacAuditAction(
      account,
      "SECURITY_PIN_FAILED",
      "Invalid 6-digit Security PIN entered for sensitive operation.",
      "FAILED"
    );
    return false;
  }

  return true;
}

/**
 * Create a new Admin / Staff Account (Owner can create Super Admin & Staff; Super Admin can create Staff ONLY)
 */
export async function createAdminAccount(
  creator: AdminUserAccount,
  newAccData: {
    name: string;
    email: string;
    role: AdminRole;
    department: DepartmentType;
    permissions: StaffPermission[];
    passwordInput: string;
    pinInput: string;
  }
): Promise<AdminUserAccount> {
  // Authority Rules Guard:
  if (creator.role === "STAFF") {
    throw new Error("⛔ Unauthorized: Staff members cannot create other accounts.");
  }

  if (creator.role === "SUPER_ADMIN" && newAccData.role === "SUPER_ADMIN") {
    throw new Error("⛔ Unauthorized: Super Admins cannot create another Super Admin. Only the Owner can create Super Admins.");
  }

  if (newAccData.role === "OWNER") {
    throw new Error("⛔ Unauthorized: Only one Owner account exists and cannot be created.");
  }

  const cleanEmail = newAccData.email.trim().toLowerCase();
  const cleanName = newAccData.name.trim();

  if (!cleanEmail || !cleanName || !newAccData.passwordInput || !newAccData.pinInput) {
    throw new Error("Please complete all required fields (Name, Email, Password, Security PIN).");
  }

  if (!/^\d{6}$/.test(newAccData.pinInput.trim())) {
    throw new Error("Security PIN must be exactly 6 numeric digits.");
  }

  const docId = "acc_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
  const accountDocRef = doc(db, "admin_accounts", docId);

  const newAccount: AdminUserAccount = {
    id: docId,
    email: cleanEmail,
    name: cleanName,
    role: newAccData.role,
    department: newAccData.department,
    permissions: newAccData.permissions,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
    failedAttempts: 0,
    lockedUntil: null,
    createdBy: creator.email,
    passwordHash: bcrypt.hashSync(newAccData.passwordInput.trim(), 10),
    pinHash: bcrypt.hashSync(newAccData.pinInput.trim(), 10)
  };

  await setDoc(accountDocRef, newAccount);

  await logRbacAuditAction(
    creator,
    "ACCOUNT_CREATED",
    `Created new [${newAccData.role}] account for ${cleanName} (${cleanEmail}) in department [${newAccData.department}].`,
    "SUCCESS",
    "None",
    JSON.stringify({ role: newAccData.role, dept: newAccData.department, permsCount: newAccData.permissions.length }),
    cleanEmail
  );

  return newAccount;
}

/**
 * Update Permissions & Department of a Staff Account
 */
export async function updateAdminAccountPermissions(
  modifier: AdminUserAccount,
  targetAccount: AdminUserAccount,
  newDepartment: DepartmentType,
  newPermissions: StaffPermission[]
): Promise<void> {
  // Owner Protection Guard:
  if (targetAccount.role === "OWNER" || targetAccount.isOwnerImmutable) {
    throw new Error("⛔ Unauthorized: The Owner account is immutable. Permissions and authority cannot be modified.");
  }

  if (modifier.role === "STAFF") {
    throw new Error("⛔ Unauthorized: Staff accounts cannot modify account permissions.");
  }

  if (modifier.role === "SUPER_ADMIN" && targetAccount.role === "SUPER_ADMIN") {
    throw new Error("⛔ Unauthorized: Super Admins cannot modify another Super Admin account. Only the Owner can modify Super Admins.");
  }

  const accountDocRef = doc(db, "admin_accounts", targetAccount.id);

  const beforeVal = JSON.stringify({ dept: targetAccount.department, perms: targetAccount.permissions });
  const afterVal = JSON.stringify({ dept: newDepartment, perms: newPermissions });

  await updateDoc(accountDocRef, {
    department: newDepartment,
    permissions: newPermissions,
    updatedAt: new Date().toISOString(),
    updatedBy: modifier.email
  });

  await logRbacAuditAction(
    modifier,
    "PERMISSIONS_UPDATED",
    `Updated permissions and department for account ${targetAccount.name} (${targetAccount.email}).`,
    "SUCCESS",
    beforeVal,
    afterVal,
    targetAccount.email
  );
}

/**
 * Suspend or Re-activate an Account
 */
export async function setAdminAccountStatus(
  modifier: AdminUserAccount,
  targetAccount: AdminUserAccount,
  newStatus: "ACTIVE" | "SUSPENDED"
): Promise<void> {
  // Owner Protection Guard:
  if (targetAccount.role === "OWNER" || targetAccount.isOwnerImmutable) {
    throw new Error("⛔ Unauthorized: The Owner account can NEVER be suspended or restricted.");
  }

  if (modifier.role === "STAFF") {
    throw new Error("⛔ Unauthorized: Staff accounts cannot change account statuses.");
  }

  if (modifier.role === "SUPER_ADMIN" && targetAccount.role === "SUPER_ADMIN") {
    throw new Error("⛔ Unauthorized: Super Admins cannot suspend another Super Admin. Only the Owner has authority over Super Admins.");
  }

  const accountDocRef = doc(db, "admin_accounts", targetAccount.id);

  const updates: Partial<AdminUserAccount> = {
    status: newStatus,
  };

  // If suspending, instantly terminate active session
  if (newStatus === "SUSPENDED") {
    updates.activeSessionToken = null;
  }

  await updateDoc(accountDocRef, updates);

  await logRbacAuditAction(
    modifier,
    newStatus === "SUSPENDED" ? "ACCOUNT_SUSPENDED" : "ACCOUNT_UNSUSPENDED",
    `${newStatus === "SUSPENDED" ? "Suspended" : "Re-activated"} account ${targetAccount.name} (${targetAccount.email}). Active sessions revoked.`,
    "SUCCESS",
    `Status: ${targetAccount.status}`,
    `Status: ${newStatus}`,
    targetAccount.email
  );
}

/**
 * Force Logout / Terminate Session of an Account
 */
export async function forceLogoutAdminAccount(
  modifier: AdminUserAccount,
  targetAccount: AdminUserAccount
): Promise<void> {
  // Owner Protection Guard: Super Admin cannot force logout Owner
  if (targetAccount.role === "OWNER" && modifier.role !== "OWNER") {
    throw new Error("⛔ Unauthorized: Only the Owner can manage Owner sessions.");
  }

  if (modifier.role === "STAFF") {
    throw new Error("⛔ Unauthorized: Staff accounts cannot force logout other sessions.");
  }

  const accountDocRef = doc(db, "admin_accounts", targetAccount.id);

  await updateDoc(accountDocRef, {
    activeSessionToken: null,
    forcedLogoutAt: new Date().toISOString(),
    forcedLogoutBy: modifier.email
  });

  await logRbacAuditAction(
    modifier,
    "FORCE_LOGOUT",
    `Force logged out active session for ${targetAccount.name} (${targetAccount.email}). Access revoked instantly.`,
    "SUCCESS",
    `Active Session: ${targetAccount.activeSessionToken || "None"}`,
    "Active Session: Revoked",
    targetAccount.email
  );
}

/**
 * Delete an Account (Owner can delete Super Admin/Staff; Super Admin can delete Staff)
 */
export async function deleteAdminAccount(
  modifier: AdminUserAccount,
  targetAccount: AdminUserAccount
): Promise<void> {
  // Owner Protection Guard:
  if (targetAccount.role === "OWNER" || targetAccount.isOwnerImmutable) {
    throw new Error("⛔ CRITICAL SECURITY RULE: The Owner account can NEVER be deleted.");
  }

  if (modifier.role === "STAFF") {
    throw new Error("⛔ Unauthorized: Staff accounts cannot delete other accounts.");
  }

  if (modifier.role === "SUPER_ADMIN" && targetAccount.role === "SUPER_ADMIN") {
    throw new Error("⛔ Unauthorized: Super Admins cannot delete another Super Admin. Only the Owner can delete Super Admins.");
  }

  const accountDocRef = doc(db, "admin_accounts", targetAccount.id);
  await deleteDoc(accountDocRef);

  await logRbacAuditAction(
    modifier,
    "ACCOUNT_DELETED",
    `Permanently deleted account ${targetAccount.name} (${targetAccount.email}) [Role: ${targetAccount.role}].`,
    "SUCCESS",
    `Account ID: ${targetAccount.id}, Email: ${targetAccount.email}`,
    "DELETED",
    targetAccount.email
  );
}

/**
 * Check whether an admin account has permission for a specific action
 */
export function hasStaffPermission(
  account: AdminUserAccount | null,
  permission: StaffPermission
): boolean {
  if (!account) return false;
  // Owner and Super Admin have full permission across all modules
  if (account.role === "OWNER" || account.role === "SUPER_ADMIN") return true;
  // Staff check:
  return Array.isArray(account.permissions) && account.permissions.includes(permission);
}

/**
 * Check whether a staff/admin account can view a specific tab in the Admin Panel
 */
export function canAccessAdminTab(
  tab: string,
  account: AdminUserAccount | null
): boolean {
  if (!account) return true; // Loading or master fallback state
  if (account.role === "OWNER" || account.role === "SUPER_ADMIN") return true;

  const perms = account.permissions || [];
  const dept = account.department;

  switch (tab) {
    case "settlement":
      return (
        perms.includes("view_trade_history") ||
        perms.includes("export_reports") ||
        dept === "Trading Operations" ||
        dept === "Finance Staff" ||
        dept === "General Management"
      );

    case "approvals":
      return (
        perms.includes("approve_deposits") ||
        perms.includes("reject_deposits") ||
        perms.includes("approve_withdrawals") ||
        perms.includes("reject_withdrawals") ||
        dept === "Payment Staff" ||
        dept === "Finance Staff"
      );

    case "users":
      return (
        perms.includes("view_users") ||
        perms.includes("freeze_unfreeze_users") ||
        perms.includes("verify_kyc") ||
        dept === "Customer Support" ||
        dept === "KYC Staff" ||
        dept === "Risk Team"
      );

    case "support":
      return (
        perms.includes("reply_support") ||
        perms.includes("live_chat") ||
        dept === "Customer Support"
      );

    case "config":
      return (
        perms.includes("manage_payment_gateways") ||
        perms.includes("export_reports") ||
        dept === "Finance Staff" ||
        dept === "General Management"
      );

    case "solo_trading":
      return (
        perms.includes("manage_solo_config") ||
        perms.includes("view_trade_history") ||
        dept === "Trading Operations" ||
        dept === "Risk Team"
      );

    case "logs":
      return (
        perms.includes("view_transactions") ||
        perms.includes("export_reports") ||
        dept === "Finance Staff" ||
        dept === "Payment Staff"
      );

    case "archive":
      return (
        perms.includes("export_reports") ||
        perms.includes("view_audit_logs") ||
        dept === "Finance Staff" ||
        dept === "General Management"
      );

    case "market_monitor":
      return (
        perms.includes("view_trade_history") ||
        dept === "Trading Operations" ||
        dept === "Risk Team"
      );

    case "limits":
      return (
        perms.includes("manage_payment_gateways") ||
        perms.includes("view_transactions") ||
        perms.includes("view_users") ||
        dept === "Finance Staff" ||
        dept === "Payment Staff" ||
        dept === "Risk Team" ||
        dept === "General Management"
      );

    case "balance_report":
      return (
        perms.includes("export_reports") ||
        perms.includes("view_users") ||
        perms.includes("view_transactions") ||
        perms.includes("view_trade_history") ||
        dept === "Finance Staff" ||
        dept === "Trading Operations" ||
        dept === "Risk Team" ||
        dept === "General Management"
      );

    case "rbac_staff":
      return false;

    default:
      return false;
  }
}

/**
 * Checks whether an admin account has permission to edit deposit/withdrawal limits.
 * Owner and Super Admin can edit limits. HR and standard Staff can only view limits in read-only mode.
 */
export function canEditLimits(account: AdminUserAccount | null): boolean {
  if (!account) return true; // Master fallback
  if (account.role === "OWNER" || account.role === "SUPER_ADMIN") return true;
  return false;
}
