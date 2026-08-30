export type AdminRole = "OWNER" | "SUPER_ADMIN" | "STAFF";

export type DepartmentType =
  | "Payment Staff"
  | "Customer Support"
  | "KYC Staff"
  | "Finance Staff"
  | "Trading Operations"
  | "Risk Team"
  | "General Management"
  | "HR & Payroll";

export type StaffPermission =
  | "view_users"
  | "freeze_unfreeze_users"
  | "view_transactions"
  | "approve_deposits"
  | "reject_deposits"
  | "approve_withdrawals"
  | "reject_withdrawals"
  | "verify_kyc"
  | "reply_support"
  | "live_chat"
  | "export_reports"
  | "view_trade_history"
  | "manage_solo_config"
  | "manage_payment_gateways"
  | "view_audit_logs";

export interface AdminUserAccount {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  department: DepartmentType;
  permissions: StaffPermission[];
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
  lastLoginAt: string | null;
  lastLoginIp?: string;
  lastLoginDevice?: string;
  failedAttempts: number;
  lockedUntil: string | null;
  is2FAEnabled?: boolean;
  twoFactorSecret?: string;
  pinHash?: string;
  passwordHash?: string;
  createdBy?: string;
  activeSessionToken?: string | null;
  activeSessionDevice?: string | null;
  isOwnerImmutable?: boolean; // Flag to enforce Owner account immutability
}

export interface AdminAuthState {
  passwordHash?: string;
  pinHash?: string; // bcrypt hash of 6-digit Security PIN
  failedAttempts: number;
  lockedUntil: string | null; // ISO timestamp
  activeSessionToken: string | null;
  activeSessionDevice: string | null;
  lastLoginAt: string | null;
  lastActivityAt: string | null;
  currentAccountId?: string;
}

export interface AdminAuditLog {
  id: string;
  actionType: string;
  action?: string;
  adminEmail: string;
  adminName?: string;
  role?: AdminRole;
  details: string;
  beforeValue?: string;
  afterValue?: string;
  targetUserOrId?: string;
  targetUserId?: string;
  amount?: number;
  status: "SUCCESS" | "FAILED" | "BLOCKED";
  timestamp: string;
  deviceInfo: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface CustomBankField {
  id: string;
  label: string;
  value: string;
}

export interface SavedBankDetails {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  isVerified?: boolean;
  addedAt?: string;
  nameMatched?: boolean;
  customFields?: CustomBankField[];
}

export interface UserCustomLimits {
  hasCustomLimits?: boolean;
  isVip?: boolean;
  depositsEnabled?: boolean;
  withdrawalsEnabled?: boolean;
  minDeposit?: number;
  maxDeposit?: number;
  maxDepositPerDay?: number;
  maxDepositPerMonth?: number;
  minWithdrawal?: number;
  maxWithdrawal?: number;
  maxWithdrawalPerDay?: number;
  maxWithdrawalPerMonth?: number;
  updatedAt?: string;
  updatedBy?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  balance: number; // Total balance (available + locked)
  availableBalance: number;
  lockedBalance: number;
  isAdmin?: boolean;
  isBlocked?: boolean;
  phone?: string;
  mobileNumber?: string;
  role?: string;
  mobileVerified?: boolean;
  verificationStatus?: "pending" | "approved" | "rejected";
  verificationPin?: string | null;
  pinExpiresAt?: string | null;
  pinAttempts?: number;
  pinGeneratedAt?: string | null;
  loginPinHash?: string | null;
  loginAttempts?: number;
  loginLockedUntil?: string | null;

  // PAN / Aadhaar Verification & Saved Bank Account details
  panNumber?: string;
  aadhaarNumber?: string;
  kycDocType?: "PAN" | "AADHAAR" | "BOTH";
  kycHolderName?: string;
  kycStatus?: "unverified" | "pending" | "verified" | "rejected";
  kycRejectReason?: string;
  savedBankDetails?: SavedBankDetails;

  // Custom User Limits & VIP configuration
  customLimits?: UserCustomLimits;
  
  // Wallet-to-Wallet Transfer user freeze status
  isTransferDisabled?: boolean;
}

export type TradeType = "CALL" | "PUT";
export type TradeStatus = "WAITING" | "ACTIVE" | "COMPLETED" | "REFUNDED";
export type RiskLevel = "NO_RISK" | "LOW" | "MEDIUM" | "HIGH";

export interface Participant {
  userId: string;
  email: string;
  userName?: string;
  amount: number;
  sharePercentage: number;
  joinedAt: string;
}

export interface TradeOutcome {
  profitOrLoss: number;
  isProfit: boolean;
  percentageChange: number;
  payouts: Record<string, number>; // Maps userId -> payout (principal + profit/loss share)
  completedAt: string;
}

export interface TradePool {
  id: string;
  status: TradeStatus;
  tradeType: TradeType;
  targetAmount: number;
  minContribution: number;
  maxParticipants: number;
  timeoutSeconds: number;
  createdAt: string;
  expiresAt: string;
  totalCollected: number;
  participantsCount: number;
  participants: Record<string, Participant>;
  outcome: TradeOutcome | null;
  canceledByAdmin?: boolean;
  expectedReturn?: number; // Expected ROI/Return percentage set by Admin
  isFreePool?: boolean; // If true, entry is free (₹0) and users can win freeRewardAmount on Win
  freeRewardAmount?: number; // Fixed reward amount (e.g. ₹10) given to each user on Win
  
  // Trading Asset Pair & Execution Schedule fields
  assetPair?: string; // e.g. "BTC/USDT", "EUR/USD", "XAU/USD (Gold)"
  tradingSymbol?: string; // e.g. "BINANCE:BTCUSDT", "FX:EURUSD", "OANDA:XAUUSD"
  symbol?: string;
  scheduledExecutionTime?: string; // e.g. "Today at 02:30 PM IST"
  timeframe?: string; // e.g. "5M", "15M"
  riskLevel?: RiskLevel; // "NO_RISK" | "LOW" | "MEDIUM" | "HIGH"
}

export const POPULAR_TRADING_PAIRS = [
  { pair: "BTC / USDT (Bitcoin)", symbol: "BINANCE:BTCUSDT", category: "Crypto" },
  { pair: "EUR / USD (Euro / Dollar)", symbol: "FX:EURUSD", category: "Forex" },
  { pair: "XAU / USD (Gold)", symbol: "OANDA:XAUUSD", category: "Metals" },
  { pair: "XAG / USD (Silver)", symbol: "TVC:SILVER", category: "Metals" },
  { pair: "US 500 (S&P 500)", symbol: "CURRENCYCOM:US500", category: "Indices" },
  { pair: "US 100 (Nasdaq 100)", symbol: "CURRENCYCOM:US100", category: "Indices" },
  { pair: "INDIA 50 (Nifty 50)", symbol: "NSE:NIFTY", category: "Indices" },
  { pair: "ETH / USDT (Ethereum)", symbol: "BINANCE:ETHUSDT", category: "Crypto" },
  { pair: "GBP / USD (Pound / Dollar)", symbol: "FX:GBPUSD", category: "Forex" },
  { pair: "USD / INR (Dollar / Rupee)", symbol: "FX_IDC:USDINR", category: "Forex" },
  { pair: "SOL / USDT (Solana)", symbol: "BINANCE:SOLUSDT", category: "Crypto" },
  { pair: "US OIL (Crude Oil)", symbol: "TVC:USOIL", category: "Commodities" }
];

export const getParticipantDisplayName = (
  p: Participant,
  currentUser?: UserProfile | null,
  allUsers?: UserProfile[]
): string => {
  // 1. If this is the current logged-in user, use their profile name
  if (currentUser && p.userId === currentUser.id && currentUser.name && currentUser.name.trim()) {
    return currentUser.name.trim();
  }

  // 2. If allUsers list is provided, match by userId or email
  if (allUsers && allUsers.length > 0) {
    const matched = allUsers.find(
      (u) => (u.id && u.id === p.userId) || (u.email && p.email && u.email.toLowerCase() === p.email.toLowerCase())
    );
    if (matched && matched.name && matched.name.trim()) {
      return matched.name.trim();
    }
  }

  // 3. Check stored participant userName
  if (p.userName && p.userName.trim()) {
    return p.userName.trim();
  }

  // 4. Derive clean name from email prefix (e.g. rahul from rahul@gmail.com -> Rahul)
  if (p.email) {
    const parts = p.email.split("@");
    if (parts[0] && parts[0].trim()) {
      const rawName = parts[0].trim();
      return rawName.charAt(0).toUpperCase() + rawName.slice(1);
    }
  }

  return "Trader";
};

export const maskEmail = (email: string | undefined | null): string => {
  if (!email) return "Trader";
  const clean = email.trim();
  const parts = clean.split("@");
  if (parts.length < 2) return clean;
  const name = parts[0];
  const domain = parts[1];
  
  let maskedName = name;
  if (name.length > 2) {
    maskedName = `${name.slice(0, 2)}${"*".repeat(Math.min(name.length - 2, 5))}`;
  } else if (name.length > 0) {
    maskedName = `${name.slice(0, 1)}*`;
  }
  
  const domainParts = domain.split(".");
  let maskedDomain = domain;
  if (domainParts.length >= 2) {
    const dName = domainParts[0];
    const ext = domainParts.slice(1).join(".");
    const mD = dName.length > 2 ? `${dName.slice(0, 1)}${"*".repeat(3)}` : "*";
    maskedDomain = `${mD}.${ext}`;
  }

  return `${maskedName}@${maskedDomain}`;
};

export interface CustomPaymentField {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  isCustom?: boolean;
}

export interface WithdrawalField {
  id: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "number";
}

export interface PaymentGateway {
  id: string;
  title: string;
  upiId: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchAndType: string;
  qrCodeUrl?: string; // Optional custom QR code image URL uploaded or provided by admin
  isActive?: boolean;
  paymentNote?: string; // Optional admin payment note & alternative options
  customFields?: CustomPaymentField[]; // Custom added input fields
  fieldLabels?: Record<string, string>; // Customized field names / labels
}

export type PaymentDetails = PaymentGateway;

export interface AdminConfig {
  targetAmount: number;
  minContribution: number;
  maxParticipants: number;
  timeoutSeconds: number;
  expectedReturn: number; // Default expected return percentage
}

export type WalletTxType = 
  | "DEPOSIT" 
  | "WITHDRAWAL" 
  | "TRADE_INVEST" 
  | "TRADE_REFUND" 
  | "TRADE_PROFIT" 
  | "TRADE_LOSS" 
  | "BONUS" 
  | "ADJUSTMENT"
  | "TRANSFER_SENT"
  | "TRANSFER_RECEIVED";

export type WalletTxStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface WalletTransaction {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  type: WalletTxType;
  amount: number;
  status: WalletTxStatus;
  createdAt: string;
  updatedAt?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  referenceId?: string; // poolId, transferId, etc.
  txDetails?: string;
  withdrawalData?: Record<string, string>;
  counterpartyUserId?: string;
  counterpartyName?: string;
  counterpartyEmail?: string;
  transferNote?: string;
  rejectionReason?: string;
}

export interface WalletTransferConfig {
  isEnabled: boolean; // Global feature toggle (Admin can enable/disable)
  minTransferAmount: number; // Minimum transfer amount e.g. ₹10
  maxTransferAmount: number; // Maximum transfer amount e.g. ₹50000
  dailyTransferLimit: number; // Maximum total transfer per day
  transferFeePercentage: number; // e.g. 0
  allowSelfTransfer: boolean; // false
  adminNote?: string;
  updatedAt?: string | number;
  updatedBy?: string;
}

export interface WalletTransferRecord {
  id: string; // Transfer ID e.g. w2w_1785689100_123
  senderId: string;
  senderEmail: string;
  senderName: string;
  recipientId: string;
  recipientEmail: string;
  recipientName: string;
  amount: number;
  status: "SUCCESS" | "FAILED" | "REJECTED";
  createdAt: string;
  timestamp?: string;
  transferNote?: string;
  note?: string;
  txDetails?: string;
  failureReason?: string;
}

export interface TransferAuditLog {
  id: string;
  transferId?: string;
  senderId: string;
  senderEmail?: string;
  recipientId?: string;
  recipientEmail?: string;
  amount: number;
  status: "SUCCESS" | "FAILED" | "BLOCKED";
  timestamp: string;
  failureReason?: string;
  notes?: string;
  ipAddress?: string;
  deviceInfo?: string;
}

export interface TradeHistoryItem {
  id: string; // matches poolId + userId
  poolId: string;
  userId: string;
  userEmail: string;
  createdAt: string;
  tradeType: TradeType;
  investmentAmount: number;
  sharePercentage: number;
  result: "WIN" | "LOSS" | "REFUNDED" | "WAITING" | "ACTIVE";
  profitOrLoss: number;
  finalReceived: number;
  status: TradeStatus;
  transactionId: string; // matches wallet tx id or random tx
}

export interface SupportThreadMessage {
  id: string;
  sender: "USER" | "ADMIN";
  senderName: string;
  text: string;
  timestamp: string;
}

export interface SupportMessage {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  subject: string;
  message: string;
  adminReply?: string;
  repliedAt?: string;
  status: "OPEN" | "RESOLVED";
  createdAt: string;
  updatedAt?: string;
  thread?: SupportThreadMessage[];
}

export const DEFAULT_LIMITS_POLICY_NOTE = 
  "Deposit & Withdrawal Limits Policy\n" +
  "To ensure account security and smooth financial operations, deposit and withdrawal limits apply to all accounts:\n" +
  "• Minimum and maximum deposit amounts are set by the platform.\n" +
  "• Minimum and maximum withdrawal amounts are set by the platform.\n" +
  "• Daily and monthly transaction limits may apply.\n" +
  "• If you reach a limit, you can continue after the limit period resets or contact support if needed.\n" +
  "• Limits may vary depending on account type or verification status.\n" +
  "• These limits help protect user accounts and maintain secure platform operations.";

export interface WalletLimits {
  // Deposit Limits
  minDeposit: number;
  maxDeposit: number; // Maximum per transaction
  maxDepositPerDay: number; // Maximum total deposit per day
  maxDepositPerMonth: number; // Maximum total deposit per month
  depositsEnabled: boolean; // Global deposits enable/disable toggle

  // Withdrawal Limits
  minWithdrawal: number;
  maxWithdrawal: number; // Maximum per transaction
  maxWithdrawalPerDay: number; // Maximum total withdrawal per day
  maxWithdrawalPerMonth: number; // Maximum total withdrawal per month
  withdrawalsEnabled: boolean; // Global withdrawals enable/disable toggle

  // Custom Admin Limits Policy Note & Visibility displayed to users
  limitsPolicyNote?: string;
  showLimitsPolicyToUsers?: boolean; // Admin toggle to show/hide the limits guide from users
}

export type SoloTradeType = "CALL" | "PUT";
export type SoloTradeStatus = "RUNNING" | "WON" | "LOST" | "DRAW" | "CANCELED";

export interface SoloTrade {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  tradeType: SoloTradeType;
  stake: number; // trade amount in ₹
  entryPrice: number;
  exitPrice: number | null;
  payoutPercentage: number; // e.g. 85
  expectedPayout: number; // stake + (stake * payoutPercentage / 100)
  profitOrLoss: number | null; // e.g. +85 or -100
  startTime: string; // ISO timestamp
  endTime: string; // ISO timestamp
  durationSeconds: number; // e.g. 15, 30, 60, 180, 300
  status: SoloTradeStatus;
  assetPair: string; // e.g. "BTC / USDT"
  tradingSymbol: string; // e.g. "BINANCE:BTCUSDT"
  drawRule: "REFUND" | "LOSS";
  settledAt?: string | null;
  txId?: string;
}

export interface MarketAsset {
  pair: string;
  symbol: string; // e.g. BINANCE:BTCUSDT or FX:EURUSD
  category: string;
  basePrice: number;
  decimals: number;
  payoutPercentage: number;
  protectedPayoutPercentage?: number; // Custom Protected Mode payout % for this pair
  standardPayoutPercentage?: number; // Custom Standard Mode payout % for this pair
  allowedDurations?: number[]; // Custom pair-specific general expiry durations
  protectedAllowedDurations?: number[]; // Custom pair-specific Protected Mode durations
  standardAllowedDurations?: number[]; // Custom pair-specific Standard Mode durations
  disabled?: boolean; // Admin can toggle enable/disable for trading pair
}

export interface SoloTradingConfig {
  isEnabled: boolean; // Admin toggle: if false, user cannot place solo trades
  showPatternRadar?: boolean; // Admin toggle: if false, the "⚡ Pattern Radar" button is hidden from users
  defaultPayoutPercentage: number; // e.g. 85
  protectedPayoutPercentage?: number; // e.g. 80 (payout % for Protected Mode)
  standardPayoutPercentage?: number; // e.g. 85 (payout % for Standard Mode)
  minStake: number; // e.g. 10
  maxStake: number; // e.g. 50000
  allowedDurations: number[]; // [15, 30, 60, 180, 300]
  protectedAllowedDurations?: number[]; // Custom global Protected Mode durations
  standardAllowedDurations?: number[]; // Custom global Standard Mode durations
  drawRule: "REFUND" | "LOSS";
  customAssets?: MarketAsset[];
  categories?: string[];
}

export function getActiveDurationsForPairAndMode(
  asset: MarketAsset | undefined | null,
  mode: "PROTECTED" | "STANDARD",
  config: SoloTradingConfig
): number[] {
  // 1. Pair + Mode specific override
  if (asset) {
    if (mode === "PROTECTED" && asset.protectedAllowedDurations && asset.protectedAllowedDurations.length > 0) {
      return asset.protectedAllowedDurations;
    }
    if (mode === "STANDARD" && asset.standardAllowedDurations && asset.standardAllowedDurations.length > 0) {
      return asset.standardAllowedDurations;
    }
    // 2. Pair general override
    if (asset.allowedDurations && asset.allowedDurations.length > 0) {
      return asset.allowedDurations;
    }
  }

  // 3. Global Mode specific override
  if (mode === "PROTECTED" && config.protectedAllowedDurations && config.protectedAllowedDurations.length > 0) {
    return config.protectedAllowedDurations;
  }
  if (mode === "STANDARD" && config.standardAllowedDurations && config.standardAllowedDurations.length > 0) {
    return config.standardAllowedDurations;
  }

  // 4. Global default durations
  return config.allowedDurations && config.allowedDurations.length > 0 ? config.allowedDurations : [15, 30, 60, 180, 300];
}

export interface ArchivedWalletTransaction extends WalletTransaction {
  archivedAt: string;
}

export interface ArchivedSoloTrade extends SoloTrade {
  archivedAt: string;
  stakeAmount?: number;
  createdAt?: string;
}

export interface DatabaseArchiveHealthStats {
  activeTxCount: number;
  activeSoloTradesCount: number;
  archivedTxCount: number;
  archivedSoloTradesCount: number;
  hrEmployeesCount?: number;
  hrPayslipsCount?: number;
  hrAuditLogsCount?: number;
  lastArchivedRunAt: string | null;
  lastRunAt?: string | null;
  lastRunResult?: {
    txArchived: number;
    tradesArchived: number;
    txDeleted: number;
    tradesDeleted: number;
  } | null;
}

// ==========================================
// HR & PAYROLL MANAGEMENT SYSTEM TYPES
// ==========================================

export type HrStaffPermission =
  | "manage_employee_profiles"
  | "view_salary_info"
  | "manage_salary_records"
  | "create_payroll_run"
  | "approve_payroll_run"
  | "disburse_payroll"
  | "generate_payslips"
  | "manage_bonuses"
  | "view_hr_reports"
  | "manage_hr_managers"
  | "view_hr_audit_logs";

export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN";
export type EmployeeStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface EmployeeProfile {
  id: string;
  employeeCode: string; // e.g. EMP-1001
  fullName: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  dateOfJoining: string; // YYYY-MM-DD
  employmentType: EmploymentType;
  status: EmployeeStatus;
  bankName: string;
  accountNumber: string;
  ifscOrRoutingCode: string;
  taxIdPan: string;
  avatarUrl?: string;
  notes?: string;
  allowSelfPayslipView: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeSalaryRecord {
  employeeId: string;
  baseSalary: number;
  hraAllowance: number;
  specialAllowance: number;
  medicalAllowance: number;
  pfDeduction: number;
  tdsDeduction: number;
  otherDeductions: number;
  netMonthlyPay: number; // Computed: (Base + Allowances) - Deductions
  currency: string; // e.g. "INR" or "USD"
  effectiveFrom: string;
  updatedBy: string;
  updatedAt: string;
}

export type BonusType = "PERFORMANCE" | "FESTIVAL" | "QUARTERLY" | "REFERRAL" | "COMMISSION" | "RETENTION";
export type BonusStatus = "PENDING" | "APPROVED" | "PAID" | "REJECTED";

export interface BonusIncentiveRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  bonusType: BonusType;
  title: string;
  monthYear: string; // YYYY-MM
  status: BonusStatus;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
}

export type PayrollStatus = "DRAFT" | "SUBMITTED_FOR_APPROVAL" | "APPROVED_BY_OWNER" | "DISBURSED" | "CANCELLED";

export interface MonthlyPayrollRun {
  id: string;
  monthYear: string; // e.g. "2026-07"
  totalEmployeesCount: number;
  totalBaseSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  totalBonuses: number;
  totalNetPayout: number;
  status: PayrollStatus;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  disbursedBy?: string;
  disbursedByName?: string;
  disbursedAt?: string;
  notes?: string;
}

export interface PayslipRecord {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  employeeEmail: string;
  designation: string;
  department: string;
  monthYear: string; // e.g. "2026-07"
  workingDays: number;
  leavesTaken: number;
  baseSalary: number;
  hraAllowance: number;
  specialAllowance: number;
  medicalAllowance: number;
  bonusAmount: number;
  totalEarnings: number;
  pfDeduction: number;
  tdsDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  status: "GENERATED" | "PAID" | "WITHHELD";
  paidAt?: string;
  paymentMethod: string;
  transactionReference: string;
  generatedAt: string;
}

export interface HrManagerAccount {
  id: string;
  email: string;
  name: string;
  role: "OWNER" | "HR_PAYROLL_MANAGER";
  permissions: HrStaffPermission[];
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
  createdBy: string;
  lastLoginAt: string | null;
  pinHash?: string;
  passwordHash?: string;
  isOwnerImmutable?: boolean;
}

export interface HrAuditLog {
  id: string;
  timestamp: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetEmployeeId?: string;
  targetEmployeeName?: string;
  fieldName?: string;
  previousValue?: string;
  newValue?: string;
  ipAddress?: string;
  device?: string;
  notes?: string;
}


