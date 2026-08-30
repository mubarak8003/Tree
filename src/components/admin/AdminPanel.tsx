// Admin Panel Component - Fixed & Cleaned for Vercel Build
import React, { useState, useEffect, useMemo } from "react";
import { AdminConfig, TradePool, WalletTransaction, UserProfile, SupportMessage, POPULAR_TRADING_PAIRS, PaymentDetails, PaymentGateway, CustomPaymentField, CustomBankField, WithdrawalField, RiskLevel, AdminAuditLog, AdminAuthState, SoloTrade, SoloTradingConfig, MarketAsset, ArchivedWalletTransaction, ArchivedSoloTrade, DatabaseArchiveHealthStats, AdminUserAccount, WalletLimits, getActiveDurationsForPairAndMode } from "../../types";
import { SUPPORTED_SOLO_ASSETS, livePriceService, MarketTelemetryData, PriceDifferenceMetrics, formatAssetPrice } from "../../services/livePriceService";
import { MarketDebugPanel } from "../MarketDebugPanel";
import { RbacStaffManager } from "../RbacStaffManager";
import { AdminLimitsManagement } from "../AdminLimitsManagement";
import { AdminTradingBalanceReport } from "../AdminTradingBalanceReport";
import { LiveCandlePatternController } from "../LiveCandlePatternController";
import { subscribeAdminAccounts, hasStaffPermission, canAccessAdminTab } from "../../services/adminRbacService";
import {
  runDatabaseArchivingAndCleanup,
  getDatabaseArchiveHealthStats,
  getArchivedTransactionsPaginated,
  getArchivedSoloTradesPaginated
} from "../../archiveService";
import { 
  Activity,
  Wifi,
  Settings, 
  Plus, 
  TrendingUp, 
  ShieldAlert, 
  Sparkles, 
  AlertTriangle,
  ClipboardList,
  Check,
  X,
  Sliders,
  DollarSign,
  Ban,
  Users,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  Edit3,
  User,
  MessageSquare,
  Send,
  Trash2,
  RefreshCw,
  MessageCircle,
  Clock,
  CornerDownRight,
  Lock,
  QrCode,
  Building2,
  Image as ImageIcon,
  PlusCircle,
  FileText,
  Info,
  Eye,
  EyeOff,
  Power,
  ShieldCheck,
  Shield,
  Zap,
  Smartphone,
  Key,
  Copy,
  CheckCircle2,
  Wrench,
  Unlock,
  Archive,
  Database,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  HardDrive,
  Globe,
  BarChart2,
  Layers,
  History,
  Scale
} from "lucide-react";
import { 
  createNewTradePool, 
  completeActiveTrade, 
  approveWalletRequest, 
  rejectWalletRequest,
  updateWalletRequestStatus,
  refundTradePool,
  deleteTradePoolPermanently,
  updatePoolExpectedReturn,
  updateTradePoolDetails,
  adjustUserBalance,
  updateUserProfileDetails,
  toggleBlockUser,
  deleteUserProfile,
  replyToSupportMessage,
  sendAdminDirectMessage,
  updateAdminPin,
  subscribeAdminAuditLogs,
  verifyAdminSecurityPin,
  updateAdminPasswordAndPin,
  logAdminAction,
  validatePasswordStrength,
  validateSecurityPinFormat,
  updatePaymentDetails,
  addPaymentGateway,
  deletePaymentGateway,
  savePaymentGateways,
  savePaymentNote,
  saveProcessingTimes,
  subscribeWithdrawalFields,
  saveWithdrawalFields,
  DEFAULT_WITHDRAWAL_FIELDS,
  generateMobileVerificationPin,
  updateUserPinExpiry,
  adminApproveMobileVerificationDirectly,
  adminUpdateUserKycAndBank,
  isUserMobileVerified,
  DEFAULT_PAYMENT_DETAILS,
  DEFAULT_PAYMENT_GATEWAYS,
  DEFAULT_PAYMENT_NOTE,
  DEFAULT_DEPOSIT_PROCESSING_TIME,
  DEFAULT_WITHDRAWAL_PROCESSING_TIME,
  DEFAULT_SOLO_CATEGORIES,
  DEFAULT_SOLO_TRADING_CONFIG,
  subscribeSoloTradingConfig,
  saveSoloTradingConfig,
  subscribeAllSoloTrades,
  subscribeFooterText,
  updateFooterText,
  DEFAULT_FOOTER_TEXT,
  subscribeBrandingSettings,
  updateBrandingSettings,
  DEFAULT_BRANDING_SETTINGS,
  BrandingSettings
} from "../../firebaseService";
import { db } from "../../firebase";
import { doc, updateDoc } from "firebase/firestore";

export interface AdminPanelProps {
  currentPool: TradePool | null;
  config: AdminConfig;
  onConfigChange: (config: AdminConfig) => void;
  walletTransactions: WalletTransaction[];
  allPools: TradePool[];
  allUsers: UserProfile[];
  supportMessages?: SupportMessage[];
  onTriggerNotification?: (message: string, type: "success" | "info" | "error") => void;
  paymentDetails?: PaymentDetails;
  paymentGateways?: PaymentGateway[];
  paymentNote?: string;
  depositProcessingTime?: string;
  withdrawalProcessingTime?: string;
  soloConfig?: SoloTradingConfig;
  currentUserId?: string;
  walletLimits?: WalletLimits;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentPool,
  config,
  onConfigChange,
  walletTransactions,
  allPools,
  allUsers,
  supportMessages = [],
  onTriggerNotification,
  paymentDetails = DEFAULT_PAYMENT_DETAILS,
  paymentGateways = [],
  paymentNote = DEFAULT_PAYMENT_NOTE,
  depositProcessingTime = DEFAULT_DEPOSIT_PROCESSING_TIME,
  withdrawalProcessingTime = DEFAULT_WITHDRAWAL_PROCESSING_TIME,
  currentUserId,
  walletLimits,
}) => {
  const [activeTab, setActiveTab] = useState<"settlement" | "approvals" | "users" | "support" | "config" | "logs" | "solo_trading" | "archive" | "market_monitor" | "rbac_staff" | "limits" | "balance_report">("settlement");

  // Real-time RBAC Staff Accounts & Active Admin Profile State
  const [adminAccounts, setAdminAccounts] = useState<AdminUserAccount[]>([]);
  const [currentAdminAccount, setCurrentAdminAccount] = useState<AdminUserAccount | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeAdminAccounts((accounts) => {
      setAdminAccounts(accounts);
      if (accounts.length > 0) {
        if (currentUserId && currentUserId !== "admin") {
          const match = accounts.find(
            a => a.id === currentUserId || a.email.toLowerCase() === currentUserId.toLowerCase()
          );
          if (match) {
            setCurrentAdminAccount(match);
            return;
          }
        }
        const owner = accounts.find(a => a.role === "OWNER") || accounts[0];
        setCurrentAdminAccount(owner);
      }
    });
    return () => unsubscribe();
  }, [currentUserId]);

  const isOwner = currentAdminAccount?.role === "OWNER";

  // Filter users for Admin Panel user list: Owner ID and account are available exclusively for the Owner
  const traderUsers = useMemo(() => {
    return allUsers.filter((u) => {
      const isOwnerAccount =
        u.id === "admin" ||
        (u.email && u.email.toLowerCase() === "amaizy1@gmail.com") ||
        adminAccounts.some((a) => a.role === "OWNER" && a.email.toLowerCase() === u.email?.toLowerCase());

      if (isOwnerAccount) {
        // Owner ID/account in the user list is available ONLY to the Owner
        return isOwner;
      }

      const isUserAdminAcc =
        u.isAdmin === true ||
        (u.email && (
          u.email.toLowerCase().includes("admin") ||
          adminAccounts.some((a) => a.email.toLowerCase() === u.email?.toLowerCase())
        ));
      return !isUserAdminAcc;
    });
  }, [allUsers, adminAccounts, isOwner]);

  // Privacy masking helpers for staff view
  const isOwnerOrSuper = currentAdminAccount?.role === "OWNER" || currentAdminAccount?.role === "SUPER_ADMIN";
  const canSeeUnmaskedContact = isOwnerOrSuper || hasStaffPermission(currentAdminAccount, "verify_kyc");

  const maskEmailAddress = (emailStr: string) => {
    if (!emailStr || !emailStr.includes("@")) return emailStr;
    const [local, domain] = emailStr.split("@");
    if (local.length <= 3) return `${local[0]}***@${domain}`;
    return `${local.slice(0, 3)}***@${domain}`;
  };

  const maskPhoneNumber = (phoneStr?: string) => {
    if (!phoneStr) return "";
    const clean = phoneStr.replace(/\D/g, "");
    if (clean.length < 10) return "****";
    return `${clean.slice(0, 3)}****${clean.slice(-2)}`;
  };

  // Auto-switch active tab if current staff account lacks access to currently selected tab
  useEffect(() => {
    if (currentAdminAccount && !canAccessAdminTab(activeTab, currentAdminAccount)) {
      const allTabs = [
        "settlement",
        "approvals",
        "users",
        "support",
        "config",
        "solo_trading",
        "logs",
        "archive",
        "market_monitor",
        "rbac_staff"
      ];
      const allowedTab = allTabs.find((t) => canAccessAdminTab(t, currentAdminAccount));
      if (allowedTab) {
        setActiveTab(allowedTab as any);
      }
    }
  }, [currentAdminAccount, activeTab]);

  // Market Data Monitor State
  const [telemetryData, setTelemetryData] = useState<MarketTelemetryData | null>(null);
  const [monitoredSymbol, setMonitoredSymbol] = useState<string>("FX:EURUSD");
  const [allowedDiffLimitPct, setAllowedDiffLimitPct] = useState<number>(0.10);
  const [monitorSearchQuery, setMonitorSearchQuery] = useState<string>("");
  const [monitorCategoryFilter, setMonitorCategoryFilter] = useState<string>("ALL");
  const [diffMetrics, setDiffMetrics] = useState<PriceDifferenceMetrics | null>(null);

  useEffect(() => {
    const unsubscribe = livePriceService.subscribeTelemetry((data) => {
      setTelemetryData(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const updateMetrics = () => {
      const metrics = livePriceService.getPriceDifferenceMetrics(monitoredSymbol, allowedDiffLimitPct);
      setDiffMetrics(metrics);
    };
    updateMetrics();
    const interval = setInterval(updateMetrics, 500);
    return () => clearInterval(interval);
  }, [monitoredSymbol, allowedDiffLimitPct]);

  // Deriv WebSocket Token Management State
  const [derivTokenInput, setDerivTokenInput] = useState<string>(() => livePriceService.getDerivConfig().token);
  const [derivAppIdInput, setDerivAppIdInput] = useState<string>(() => livePriceService.getDerivConfig().appId);
  const [isDerivSaved, setIsDerivSaved] = useState<boolean>(false);
  const [isDerivShowToken, setIsDerivShowToken] = useState<boolean>(false);

  const handleSaveDerivConfig = () => {
    livePriceService.updateDerivConfig(derivTokenInput, derivAppIdInput);
    setIsDerivSaved(true);
    setTimeout(() => setIsDerivSaved(false), 3500);
  };

  // Archive & Database Retention State
  const [archiveSubTab, setArchiveSubTab] = useState<"transactions" | "trades">("transactions");
  const [archiveHealthStats, setArchiveHealthStats] = useState<DatabaseArchiveHealthStats | null>(null);
  const [isArchiveRunning, setIsArchiveRunning] = useState<boolean>(false);
  const [archiveRunPin, setArchiveRunPin] = useState<string>("");
  const [isRunArchiveModalOpen, setIsRunArchiveModalOpen] = useState<boolean>(false);
  const [archiveNotice, setArchiveNotice] = useState<string | null>(null);

  // Archived Transactions state (50 per page)
  const [archivedTxs, setArchivedTxs] = useState<ArchivedWalletTransaction[]>([]);
  const [archivedTxPage, setArchivedTxPage] = useState<number>(1);
  const [archivedTxTotalPages, setArchivedTxTotalPages] = useState<number>(1);
  const [archivedTxTotalCount, setArchivedTxTotalCount] = useState<number>(0);
  const [archivedTxSearch, setArchivedTxSearch] = useState<string>("");
  const [archivedTxType, setArchivedTxType] = useState<string>("ALL");
  const [archivedTxStatus, setArchivedTxStatus] = useState<string>("ALL");
  const [archivedTxStartDate, setArchivedTxStartDate] = useState<string>("");
  const [archivedTxEndDate, setArchivedTxEndDate] = useState<string>("");
  const [isArchivedTxLoading, setIsArchivedTxLoading] = useState<boolean>(false);

  // Archived Trades state (50 per page)
  const [archivedTrades, setArchivedTrades] = useState<ArchivedSoloTrade[]>([]);
  const [archivedTradesPage, setArchivedTradesPage] = useState<number>(1);
  const [archivedTradesTotalPages, setArchivedTradesTotalPages] = useState<number>(1);
  const [archivedTradesTotalCount, setArchivedTradesTotalCount] = useState<number>(0);
  const [archivedTradesSearch, setArchivedTradesSearch] = useState<string>("");
  const [archivedTradesType, setArchivedTradesType] = useState<string>("ALL");
  const [archivedTradesStatus, setArchivedTradesStatus] = useState<string>("ALL");
  const [archivedTradesStartDate, setArchivedTradesStartDate] = useState<string>("");
  const [archivedTradesEndDate, setArchivedTradesEndDate] = useState<string>("");
  const [isArchivedTradesLoading, setIsArchivedTradesLoading] = useState<boolean>(false);
  
  // Real-time Admin Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  // Solo Trading Engine Admin State
  const [soloConfigState, setSoloConfigState] = useState<SoloTradingConfig>(DEFAULT_SOLO_TRADING_CONFIG);
  const [allSoloTrades, setAllSoloTrades] = useState<SoloTrade[]>([]);
  const [soloSearchQuery, setSoloSearchQuery] = useState<string>("");

  // Form state for updating solo config in Admin Panel
  const [editSoloProtectedPayoutPct, setEditSoloProtectedPayoutPct] = useState<string>("80");
  const [editSoloStandardPayoutPct, setEditSoloStandardPayoutPct] = useState<string>("85");
  const [editSoloMinStake, setEditSoloMinStake] = useState<string>("10");
  const [editSoloMaxStake, setEditSoloMaxStake] = useState<string>("50000");
  const [editSoloDrawRule, setEditSoloDrawRule] = useState<"REFUND" | "LOSS">("REFUND");
  const [editSoloShowPatternRadar, setEditSoloShowPatternRadar] = useState<boolean>(true);

  // Custom Asset Pair Form State in Admin Panel
  const [newPairName, setNewPairName] = useState<string>("");
  const [newPairSymbol, setNewPairSymbol] = useState<string>("");
  const [newPairCategory, setNewPairCategory] = useState<string>("Crypto");
  const [newPairBasePrice, setNewPairBasePrice] = useState<string>("");
  const [newPairDecimals, setNewPairDecimals] = useState<string>("2");
  const [newPairProtectedPayout, setNewPairProtectedPayout] = useState<string>("80");
  const [newPairStandardPayout, setNewPairStandardPayout] = useState<string>("85");
  const [isDetectingPrice, setIsDetectingPrice] = useState<boolean>(false);

  // Category Management Form State
  const [newCategoryName, setNewCategoryName] = useState<string>("");
  const [editingCategoryOldName, setEditingCategoryOldName] = useState<string | null>(null);
  const [editingCategoryNewName, setEditingCategoryNewName] = useState<string>("");
  const [deletingCategoryConfirmName, setDeletingCategoryConfirmName] = useState<string | null>(null);
  const [isSavingCategory, setIsSavingCategory] = useState<boolean>(false);

  // Quick Pair Edit / Lock state
  const [editingPairSymbol, setEditingPairSymbol] = useState<string | null>(null);
  const [editingPairName, setEditingPairName] = useState<string>("");
  const [editingPairTvSymbol, setEditingPairTvSymbol] = useState<string>("");
  const [editingPairCategory, setEditingPairCategory] = useState<string>("Crypto");
  const [editingPairPrice, setEditingPairPrice] = useState<string>("");
  const [editingPairProtectedPayout, setEditingPairProtectedPayout] = useState<string>("80");
  const [editingPairStandardPayout, setEditingPairStandardPayout] = useState<string>("85");
  const [isFixingPrice, setIsFixingPrice] = useState<boolean>(false);

  // Global Duration Mode Tab state
  const [globalDurationModeTab, setGlobalDurationModeTab] = useState<"GLOBAL" | "PROTECTED" | "STANDARD">("GLOBAL");

  // Pair Expiry Durations Modal & Editor state
  const [editingPairDurationsModal, setEditingPairDurationsModal] = useState<MarketAsset | null>(null);
  const [pairWorkingAsset, setPairWorkingAsset] = useState<MarketAsset | null>(null);
  const [pairDurationTab, setPairDurationTab] = useState<"GENERAL" | "PROTECTED" | "STANDARD">("GENERAL");
  const [pairNewDurationInput, setPairNewDurationInput] = useState<string>("");

  // Category Management Handlers
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const catName = newCategoryName.trim();
    if (!catName) {
      if (onTriggerNotification) onTriggerNotification("Please enter a valid category name", "error");
      return;
    }

    const currentCategories = soloConfigState.categories && soloConfigState.categories.length > 0
      ? soloConfigState.categories
      : DEFAULT_SOLO_CATEGORIES;

    if (currentCategories.some((c) => c.toLowerCase() === catName.toLowerCase())) {
      if (onTriggerNotification) onTriggerNotification(`Category "${catName}" already exists!`, "error");
      return;
    }

    setIsSavingCategory(true);
    const updatedCategories = [...currentCategories, catName];
    try {
      await saveSoloTradingConfig({ categories: updatedCategories });
      setNewCategoryName("");
      if (onTriggerNotification) {
        onTriggerNotification(`‚úÖ Category "${catName}" added successfully!`, "success");
      }
    } catch (err: any) {
      if (onTriggerNotification) onTriggerNotification(`Failed to add category: ${err?.message}`, "error");
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleStartEditCategory = (cat: string) => {
    setEditingCategoryOldName(cat);
    setEditingCategoryNewName(cat);
  };

  const handleSaveEditCategory = async (oldCat: string) => {
    const updatedName = editingCategoryNewName.trim();
    if (!updatedName) {
      if (onTriggerNotification) onTriggerNotification("Category name cannot be empty", "error");
      return;
    }

    const currentCategories = soloConfigState.categories && soloConfigState.categories.length > 0
      ? soloConfigState.categories
      : DEFAULT_SOLO_CATEGORIES;

    if (
      updatedName.toLowerCase() !== oldCat.toLowerCase() &&
      currentCategories.some((c) => c.toLowerCase() === updatedName.toLowerCase())
    ) {
      if (onTriggerNotification) onTriggerNotification(`Category "${updatedName}" already exists!`, "error");
      return;
    }

    setIsSavingCategory(true);
    const updatedCategories = currentCategories.map((c) => (c === oldCat ? updatedName : c));

    const currentAssets = (soloConfigState.customAssets && soloConfigState.customAssets.length > 0)
      ? soloConfigState.customAssets
      : SUPPORTED_SOLO_ASSETS;

    const updatedAssets = currentAssets.map((asset) => {
      if (asset.category === oldCat) {
        return { ...asset, category: updatedName };
      }
      return asset;
    });

    try {
      livePriceService.setAssets(updatedAssets);
      await saveSoloTradingConfig({
        categories: updatedCategories,
        customAssets: updatedAssets
      });
      setEditingCategoryOldName(null);
      setEditingCategoryNewName("");
      if (onTriggerNotification) {
        onTriggerNotification(`‚úÖ Category renamed from "${oldCat}" to "${updatedName}"!`, "success");
      }
    } catch (err: any) {
      if (onTriggerNotification) onTriggerNotification(`Failed to update category: ${err?.message}`, "error");
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (catToDelete: string) => {
    const currentCategories = soloConfigState.categories && soloConfigState.categories.length > 0
      ? soloConfigState.categories
      : DEFAULT_SOLO_CATEGORIES;

    if (currentCategories.length <= 1) {
      if (onTriggerNotification) onTriggerNotification("At least one category must remain!", "error");
      setDeletingCategoryConfirmName(null);
      return;
    }

    setIsSavingCategory(true);
    const updatedCategories = currentCategories.filter((c) => c !== catToDelete);
    const fallbackCategory = updatedCategories[0] || "Crypto";

    const currentAssets = (soloConfigState.customAssets && soloConfigState.customAssets.length > 0)
      ? soloConfigState.customAssets
      : SUPPORTED_SOLO_ASSETS;

    let reassignedCount = 0;
    const updatedAssets = currentAssets.map((asset) => {
      if (asset.category === catToDelete) {
        reassignedCount++;
        return { ...asset, category: fallbackCategory };
      }
      return asset;
    });

    try {
      livePriceService.setAssets(updatedAssets);
      await saveSoloTradingConfig({
        categories: updatedCategories,
        customAssets: updatedAssets
      });
      setDeletingCategoryConfirmName(null);
      if (onTriggerNotification) {
        const extraNote = reassignedCount > 0 ? ` (${reassignedCount} pairs moved to "${fallbackCategory}")` : "";
        onTriggerNotification(`‚úÖ Category "${catToDelete}" deleted successfully!${extraNote}`, "success");
      }
    } catch (err: any) {
      if (onTriggerNotification) onTriggerNotification(`Failed to delete category: ${err?.message}`, "error");
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDetectLivePrice = async () => {
    if (!newPairSymbol.trim()) {
      if (onTriggerNotification) onTriggerNotification("Please enter a TradingView Symbol (e.g. BINANCE:DOGEUSDT or FX:USDJPY)", "error");
      return;
    }
    setIsDetectingPrice(true);
    const sym = newPairSymbol.trim().toUpperCase();
    try {
      const detectedPrice = await livePriceService.fetchLivePriceForSymbol(sym);
      if (detectedPrice && detectedPrice > 0) {
        setNewPairBasePrice(detectedPrice.toString());

        let category: string = newPairCategory;
        let decimals = 2;

        if (sym.includes("XAU") || sym.includes("XAG") || sym.includes("SILVER") || sym.includes("GOLD") || sym.includes("XPT") || sym.includes("XPD")) {
          category = "Metals";
          decimals = (sym.includes("XAG") || sym.includes("SILVER")) ? 4 : 3;
        } else if (sym.includes("SPX") || sym.includes("NAS") || sym.includes("US30") || sym.includes("NIFTY") || sym.includes("GER40") || sym.includes("NSE:") || sym.includes("INDEX") || sym.includes("GLOBALPRIME")) {
          category = "Indices";
          decimals = 2;
        } else if (sym.includes("FX:") || (sym.replace(/[^A-Z0-9]/g, "").length === 6 && !sym.includes("BINANCE"))) {
          category = "Forex";
          decimals = detectedPrice < 5 ? 5 : 3;
        } else if (sym.includes("BINANCE") || sym.includes("USDT") || sym.includes("BTC")) {
          category = "Crypto";
          if (detectedPrice < 0.001) decimals = 8;
          else if (detectedPrice < 1) decimals = 5;
          else if (detectedPrice < 10) decimals = 3;
          else decimals = 2;
        } else if (sym.includes("OIL") || sym.includes("OANDA") || sym.includes("TVC")) {
          category = "Commodities";
          decimals = 2;
        }

        setNewPairCategory(category);
        setNewPairDecimals(decimals.toString());

        if (onTriggerNotification) {
          onTriggerNotification(`‚ö° Live Price Detected: ${detectedPrice} (${category})`, "success");
        }
      } else {
        if (onTriggerNotification) {
          onTriggerNotification("Could not auto-fetch live price for this symbol. Please set price manually.", "error");
        }
      }
    } catch (err: any) {
      if (onTriggerNotification) onTriggerNotification(`Error detecting price: ${err?.message}`, "error");
    } finally {
      setIsDetectingPrice(false);
    }
  };

  // Allowed Durations Management State in Admin Panel
  const [newDurationSec, setNewDurationSec] = useState<string>("");
  const [editingDurationIndex, setEditingDurationIndex] = useState<number | null>(null);
  const [editingDurationVal, setEditingDurationVal] = useState<string>("");

  const formatDurationLabel = (sec: number) => {
    if (sec >= 3600) {
      const h = sec / 3600;
      return Number.isInteger(h) ? `${h}h` : `${sec}s`;
    }
    if (sec >= 60) {
      const m = sec / 60;
      return Number.isInteger(m) ? `${m}m` : `${sec}s`;
    }
    return `${sec}s`;
  };

  const handleAddCustomPair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPairName.trim() || !newPairSymbol.trim()) {
      if (onTriggerNotification) onTriggerNotification("Please fill pair name and symbol.", "error");
      return;
    }
    const formattedSymbol = newPairSymbol.trim().toUpperCase();
    let baseP = parseFloat(newPairBasePrice);

    // Auto-detect live market price if not manually provided or generic
    if (isNaN(baseP) || baseP <= 0 || newPairBasePrice === "100.00") {
      const detectedP = await livePriceService.fetchLivePriceForSymbol(formattedSymbol);
      if (detectedP && detectedP > 0) {
        baseP = detectedP;
      } else {
        const currentLive = livePriceService.getPrice(formattedSymbol);
        if (currentLive && currentLive > 0 && currentLive !== 100.0) {
          baseP = currentLive;
        } else if (formattedSymbol.includes("XAU") || newPairName.toLowerCase().includes("gold")) {
          baseP = 2742.60;
        } else if (formattedSymbol.includes("BTC")) {
          baseP = 96450.0;
        } else if (newPairCategory === "Forex") {
          baseP = 1.0845;
        } else {
          baseP = 100.0;
        }
      }
    }

    let decs = parseInt(newPairDecimals, 10);
    if (isNaN(decs)) {
      if (baseP < 0.001) decs = 8;
      else if (baseP < 1) decs = 5;
      else if (baseP < 10) decs = 3;
      else decs = 2;
    }

    const protPayout = parseFloat(newPairProtectedPayout) || 80;
    const stdPayout = parseFloat(newPairStandardPayout) || 85;

    if (isNaN(protPayout) || isNaN(stdPayout) || protPayout <= 0 || stdPayout <= 0) {
      if (onTriggerNotification) onTriggerNotification("Invalid payout percentage.", "error");
      return;
    }

    const newAsset: MarketAsset = {
      pair: newPairName.trim(),
      symbol: formattedSymbol,
      category: newPairCategory,
      basePrice: baseP,
      decimals: decs,
      protectedPayoutPercentage: protPayout,
      standardPayoutPercentage: stdPayout,
      payoutPercentage: stdPayout
    };

    const currentAssets = (soloConfigState.customAssets && soloConfigState.customAssets.length > 0)
      ? soloConfigState.customAssets
      : SUPPORTED_SOLO_ASSETS;

    if (currentAssets.some(a => a.symbol === formattedSymbol)) {
      if (onTriggerNotification) onTriggerNotification("This pair symbol already exists!", "error");
      return;
    }

    const updated = [...currentAssets, newAsset];
    try {
      livePriceService.setAssets(updated);
      await saveSoloTradingConfig({ customAssets: updated });
      setNewPairName("");
      setNewPairSymbol("");
      setNewPairBasePrice("100.00");
      if (onTriggerNotification) {
        onTriggerNotification(`‚úÖ Pair ${newAsset.pair} (${formattedSymbol}) added and synchronized with WebSocket live feed!`, "success");
      }
    } catch (err: any) {
      if (onTriggerNotification) onTriggerNotification(`Failed to add pair: ${err?.message}`, "error");
    }
  };

  // Archive & Database Retention Data Loaders
  const loadArchiveHealth = async () => {
    try {
      const stats = await getDatabaseArchiveHealthStats();
      setArchiveHealthStats(stats);
    } catch (e) {
      console.error("Failed to load archive health:", e);
    }
  };

  const loadArchivedTxData = async () => {
    setIsArchivedTxLoading(true);
    try {
      const res = await getArchivedTransactionsPaginated({
        page: archivedTxPage,
        pageSize: 50,
        searchQuery: archivedTxSearch,
        typeFilter: archivedTxType,
        statusFilter: archivedTxStatus,
        startDate: archivedTxStartDate,
        endDate: archivedTxEndDate,
      });
      setArchivedTxs(res.records);
      setArchivedTxTotalPages(res.totalPages);
      setArchivedTxTotalCount(res.totalCount);
    } catch (err) {
      console.error("Error loading archived transactions:", err);
    } finally {
      setIsArchivedTxLoading(false);
    }
  };

  const loadArchivedTradesData = async () => {
    setIsArchivedTradesLoading(true);
    try {
      const res = await getArchivedSoloTradesPaginated({
        page: archivedTradesPage,
        pageSize: 50,
        searchQuery: archivedTradesSearch,
        tradeTypeFilter: archivedTradesType,
        statusFilter: archivedTradesStatus,
        startDate: archivedTradesStartDate,
        endDate: archivedTradesEndDate,
      });
      setArchivedTrades(res.records);
      setArchivedTradesTotalPages(res.totalPages);
      setArchivedTradesTotalCount(res.totalCount);
    } catch (err) {
      console.error("Error loading archived trades:", err);
    } finally {
      setIsArchivedTradesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "archive") {
      loadArchiveHealth();
      if (archiveSubTab === "transactions") {
        loadArchivedTxData();
      } else {
        loadArchivedTradesData();
      }
    }
  }, [
    activeTab,
    archiveSubTab,
    archivedTxPage,
    archivedTxSearch,
    archivedTxType,
    archivedTxStatus,
    archivedTxStartDate,
    archivedTxEndDate,
    archivedTradesPage,
    archivedTradesSearch,
    archivedTradesType,
    archivedTradesStatus,
    archivedTradesStartDate,
    archivedTradesEndDate,
  ]);

  const handleManualArchiveExecution = async () => {
    const isValidPin = await verifyAdminSecurityPin(archiveRunPin);
    if (!isValidPin) {
      if (onTriggerNotification) onTriggerNotification("‚ùå Incorrect Admin Security PIN.", "error");
      return;
    }
    setIsArchiveRunning(true);
    setArchiveNotice(null);
    try {
      const res = await runDatabaseArchivingAndCleanup(true);
      const msg = `‚úÖ Database Lifecycle Run Complete! ${res.txArchived} Txs archived (>12mo), ${res.tradesArchived} Trades archived (>12mo), ${res.txDeleted} Txs purged (>24mo), ${res.tradesDeleted} Trades purged (>24mo).`;
      setArchiveNotice(msg);
      if (onTriggerNotification) onTriggerNotification(msg, "success");
      setIsRunArchiveModalOpen(false);
      setArchiveRunPin("");
      await loadArchiveHealth();
      if (archiveSubTab === "transactions") {
        await loadArchivedTxData();
      } else {
        await loadArchivedTradesData();
      }
    } catch (err: any) {
      console.error("Manual archive execution error:", err);
      const errMsg = `‚ùå Archive execution failed: ${err?.message || "Unknown error"}`;
      setArchiveNotice(errMsg);
      if (onTriggerNotification) onTriggerNotification(errMsg, "error");
    } finally {
      setIsArchiveRunning(false);
    }
  };

  const handleDeleteCustomPair = async (symbolToDelete: string) => {
    const currentAssets = (soloConfigState.customAssets && soloConfigState.customAssets.length > 0)
      ? soloConfigState.customAssets
      : SUPPORTED_SOLO_ASSETS;

    if (currentAssets.length <= 1) {
      if (onTriggerNotification) onTriggerNotification("At least 1 trading pair must remain active.", "error");
      return;
    }

    const updated = currentAssets.filter(a => a.symbol !== symbolToDelete);
    try {
      livePriceService.setAssets(updated);
      await saveSoloTradingConfig({ customAssets: updated });
      if (onTriggerNotification) {
        onTriggerNotification(`‚úÖ Removed trading pair ${symbolToDelete}`, "info");
      }
    } catch (err: any) {
      if (onTriggerNotification) onTriggerNotification(`Failed to delete pair: ${err?.message}`, "error");
    }
  };

  const handleToggleCustomPairDisabled = async (symbolToToggle: string) => {
    const currentAssets = (soloConfigState.customAssets && soloConfigState.customAssets.length > 0)
      ? soloConfigState.customAssets
      : SUPPORTED_SOLO_ASSETS;

    const targetAsset = currentAssets.find(a => a.symbol === symbolToToggle);
    if (!targetAsset) return;

    const newDisabledState = !targetAsset.disabled;
    const updated = currentAssets.map(a => {
      if (a.symbol === symbolToToggle) {
        return { ...a, disabled: newDisabledState };
      }
      return a;
    });

    try {
      livePriceService.setAssets(updated);
      await saveSoloTradingConfig({ customAssets: updated });
      if (onTriggerNotification) {
        onTriggerNotification(
          `Trading pair ${targetAsset.pair} is now ${newDisabledState ? "DISABLED üõë" : "ENABLED ‚úÖ"}`,
          newDisabledState ? "info" : "success"
        );
      }
    } catch (err: any) {
      if (onTriggerNotification) onTriggerNotification(`Failed to update pair status: ${err?.message}`, "error");
    }
  };

  const handleResetDefaultPairs = async () => {
    try {
      livePriceService.setAssets(SUPPORTED_SOLO_ASSETS);
      await saveSoloTradingConfig({ customAssets: SUPPORTED_SOLO_ASSETS });
      if (onTriggerNotification) {
        onTriggerNotification("‚úÖ Reset trading pairs to default standard list.", "success");
      }
    } catch (err: any) {
      if (onTriggerNotification) onTriggerNotification(`Failed to reset pairs: ${err?.message}`, "error");
    }
  };

  const handleStartEditPair = (asset: MarketAsset) => {
    const curPrice = livePriceService.getPrice(asset.symbol) || asset.basePrice;
    setEditingPairSymbol(asset.symbol);
    setEditingPairName(asset.pair);
    setEditingPairTvSymbol(asset.symbol);
    setEditingPairCategory(asset.category);
    setEditingPairPrice(curPrice.toString());
    const protP = asset.protectedPayoutPercentage ?? soloConfigState.protectedPayoutPercentage ?? 80;
    const stdP = asset.standardPayoutPercentage ?? asset.payoutPercentage ?? soloConfigState.standardPayoutPercentage ?? soloConfigState.defaultPayoutPercentage ?? 85;
    setEditingPairProtectedPayout(protP.toString());
    setEditingPairStandardPayout(stdP.toString());
  };

  const handleSavePairPriceFix = async (symbolToEdit: string, lockOverride: boolean = false) => {
    const newPriceVal = parseFloat(editingPairPrice);
    const newProtVal = parseInt(editingPairProtectedPayout, 10);
    const newStdVal = parseInt(editingPairStandardPayout, 10);
    const newTvSymbol = editingPairTvSymbol.trim().toUpperCase();
    const newPairName = editingPairName.trim() || newTvSymbol;

    if (!newTvSymbol) {
      if (onTriggerNotification) onTriggerNotification("Please enter a valid TradingView symbol.", "error");
      return;
    }

    if (isNaN(newPriceVal) || newPriceVal <= 0) {
      if (onTriggerNotification) onTriggerNotification("Please enter a valid positive price.", "error");
      return;
    }

    const currentAssets = (soloConfigState.customAssets && soloConfigState.customAssets.length > 0)
      ? soloConfigState.customAssets
      : SUPPORTED_SOLO_ASSETS;

    const updated = currentAssets.map(a => {
      if (a.symbol === symbolToEdit) {
        return {
          ...a,
          pair: newPairName,
          symbol: newTvSymbol,
          category: editingPairCategory,
          basePrice: newPriceVal,
          protectedPayoutPercentage: !isNaN(newProtVal) && newProtVal > 0 ? newProtVal : a.protectedPayoutPercentage,
          standardPayoutPercentage: !isNaN(newStdVal) && newStdVal > 0 ? newStdVal : a.standardPayoutPercentage,
          payoutPercentage: !isNaN(newStdVal) && newStdVal > 0 ? newStdVal : a.payoutPercentage
        };
      }
      return a;
    });

    try {
      setIsFixingPrice(true);
      livePriceService.setPrice(newTvSymbol, newPriceVal, true);
      if (symbolToEdit !== newTvSymbol) {
        livePriceService.setManualPriceOverride(symbolToEdit, null);
      }
      if (lockOverride) {
        livePriceService.setManualPriceOverride(newTvSymbol, newPriceVal);
      } else {
        livePriceService.setManualPriceOverride(newTvSymbol, null);
      }
      livePriceService.setAssets(updated);
      await saveSoloTradingConfig({ customAssets: updated });
      setEditingPairSymbol(null);
      if (onTriggerNotification) {
        onTriggerNotification(`‚úÖ Saved changes for ${newPairName} (${newTvSymbol}) @ ‚Çπ${newPriceVal} ${lockOverride ? "(Locked)" : ""}`, "success");
      }
    } catch (err: any) {
      if (onTriggerNotification) onTriggerNotification(`Failed to save pair changes: ${err?.message}`, "error");
    } finally {
      setIsFixingPrice(false);
    }
  };

  const handleAutoSyncPairPrice = async (symbolToSync: string) => {
    try {
      setIsFixingPrice(true);
      if (onTriggerNotification) onTriggerNotification(`Fetching live market quote for ${symbolToSync}...`, "info");
      const detectedPrice = await livePriceService.fetchLivePriceForSymbol(symbolToSync);
      if (detectedPrice && detectedPrice > 0) {
        const currentAssets = (soloConfigState.customAssets && soloConfigState.customAssets.length > 0)
          ? soloConfigState.customAssets
          : SUPPORTED_SOLO_ASSETS;

        const updated = currentAssets.map(a => {
          if (a.symbol === symbolToSync) {
            return { ...a, basePrice: detectedPrice };
          }
          return a;
        });

        livePriceService.setManualPriceOverride(symbolToSync, null); // Unlock override to use live quote
        livePriceService.setPrice(symbolToSync, detectedPrice, true);
        livePriceService.setAssets(updated);
        await saveSoloTradingConfig({ customAssets: updated });

        if (editingPairSymbol === symbolToSync) {
          setEditingPairPrice(detectedPrice.toString());
        }

        if (onTriggerNotification) {
          onTriggerNotification(`‚ö° Auto-synced ${symbolToSync} live price to ‚Çπ${detectedPrice}!`, "success");
        }
      } else {
        if (onTriggerNotification) onTriggerNotification(`Could not auto-fetch quote for ${symbolToSync}. Please enter price manually.`, "info");
      }
    } catch (err: any) {
      if (onTriggerNotification) onTriggerNotification(`Auto sync error: ${err?.message}`, "error");
    } finally {
      setIsFixingPrice(false);
    }
  };

  const getGlobalTabDurations = (): number[] => {
    if (globalDurationModeTab === "PROTECTED") {
      return soloConfigState.protectedAllowedDurations && soloConfigState.protectedAllowedDurations.length > 0
        ? soloConfigState.protectedAllowedDurations
        : (soloConfigState.allowedDurations && soloConfigState.allowedDurations.length > 0 ? soloConfigState.allowedDurations : [15, 30, 60, 180, 300]);
    }
    if (globalDurationModeTab === "STANDARD") {
      return soloConfigState.standardAllowedDurations && soloConfigState.standardAllowedDurations.length > 0
        ? soloConfigState.standardAllowedDurations
        : (soloConfigState.allowedDurations && soloConfigState.allowedDurations.length > 0 ? soloConfigState.allowedDurations : [15, 30, 60, 180, 300]);
    }
    return soloConfigState.allowedDurations && soloConfigState.allowedDurations.length > 0
      ? soloConfigState.allowedDurations
      : [15, 30, 60, 180, 300];
  };

  const handleAddDuration = async (e: React.FormEvent) => {
    e.preventDefault();
    const sec = parseInt(newDurationSec.trim(), 10);
    if (isNaN(sec) || sec <= 0) {
      if (onTriggerNotification) onTriggerNotification("Please enter a valid positive duration in seconds.", "error");
      return;
    }
    const currentList = getGlobalTabDurations();

    if (currentList.includes(sec)) {
      if (onTriggerNotification) onTriggerNotification(`Duration ${sec}s already exists in the active list.`, "error");
      return;
    }

    const updated = [...currentList, sec].sort((a, b) => a - b);
    try {
      if (globalDurationModeTab === "PROTECTED") {
        await saveSoloTradingConfig({ protectedAllowedDurations: updated });
      } else if (globalDurationModeTab === "STANDARD") {
        await saveSoloTradingConfig({ standardAllowedDurations: updated });
      } else {
        await saveSoloTradingConfig({ allowedDurations: updated });
      }
      setNewDurationSec("");
      if (onTriggerNotification) {
        onTriggerNotification(`‚úÖ Expiry duration ${formatDurationLabel(sec)} (${sec}s) added to ${globalDurationModeTab} list!`, "success");
      }
    } catch (err: any) {
      if (onTriggerNotification) {
        onTriggerNotification(`Failed to add duration: ${err?.message}`, "error");
      }
    }
  };

  const handleDeleteDuration = async (secToDelete: number) => {
    const currentList = getGlobalTabDurations();

    if (currentList.length <= 1) {
      if (onTriggerNotification) onTriggerNotification("At least 1 expiry duration must remain active.", "error");
      return;
    }

    const updated = currentList.filter(d => d !== secToDelete);
    try {
      if (globalDurationModeTab === "PROTECTED") {
        await saveSoloTradingConfig({ protectedAllowedDurations: updated });
      } else if (globalDurationModeTab === "STANDARD") {
        await saveSoloTradingConfig({ standardAllowedDurations: updated });
      } else {
        await saveSoloTradingConfig({ allowedDurations: updated });
      }
      if (onTriggerNotification) {
        onTriggerNotification(`üóëÔ∏è Duration ${formatDurationLabel(secToDelete)} deleted successfully.`, "info");
      }
    } catch (err: any) {
      if (onTriggerNotification) {
        onTriggerNotification(`Failed to delete duration: ${err?.message}`, "error");
      }
    }
  };

  const handleSaveEditDuration = async (oldSec: number) => {
    const newSec = parseInt(editingDurationVal.trim(), 10);
    if (isNaN(newSec) || newSec <= 0) {
      if (onTriggerNotification) onTriggerNotification("Please enter a valid positive duration in seconds.", "error");
      return;
    }

    const currentList = getGlobalTabDurations();

    if (newSec !== oldSec && currentList.includes(newSec)) {
      if (onTriggerNotification) onTriggerNotification(`Duration ${newSec}s already exists in the list.`, "error");
      return;
    }

    const updated = currentList.map(d => d === oldSec ? newSec : d).sort((a, b) => a - b);
    try {
      if (globalDurationModeTab === "PROTECTED") {
        await saveSoloTradingConfig({ protectedAllowedDurations: updated });
      } else if (globalDurationModeTab === "STANDARD") {
        await saveSoloTradingConfig({ standardAllowedDurations: updated });
      } else {
        await saveSoloTradingConfig({ allowedDurations: updated });
      }
      setEditingDurationIndex(null);
      setEditingDurationVal("");
      if (onTriggerNotification) {
        onTriggerNotification(`‚úÖ Duration updated from ${formatDurationLabel(oldSec)} to ${formatDurationLabel(newSec)}!`, "success");
      }
    } catch (err: any) {
      if (onTriggerNotification) {
        onTriggerNotification(`Failed to update duration: ${err?.message}`, "error");
      }
    }
  };

  const handleClearGlobalModeDurationOverride = async () => {
    try {
      if (globalDurationModeTab === "PROTECTED") {
        await saveSoloTradingConfig({ protectedAllowedDurations: [] });
        if (onTriggerNotification) onTriggerNotification("‚úÖ Cleared Protected Mode duration override (inheriting global default).", "info");
      } else if (globalDurationModeTab === "STANDARD") {
        await saveSoloTradingConfig({ standardAllowedDurations: [] });
        if (onTriggerNotification) onTriggerNotification("‚úÖ Cleared Standard Mode duration override (inheriting global default).", "info");
      }
    } catch (err: any) {
      if (onTriggerNotification) onTriggerNotification(`Failed to clear override: ${err?.message}`, "error");
    }
  };

  const handleResetDefaultDurations = async () => {
    const defaultList = [15, 30, 60, 180, 300];
    try {
      await saveSoloTradingConfig({
        allowedDurations: defaultList,
        protectedAllowedDurations: [],
        standardAllowedDurations: []
      });
      if (onTriggerNotification) {
        onTriggerNotification("‚úÖ Reset all global expiry durations to default (15s, 30s, 1m, 3m, 5m).", "success");
      }
    } catch (err: any) {
      if (onTriggerNotification) {
        onTriggerNotification(`Failed to reset durations: ${err?.message}`, "error");
      }
    }
  };

  // Pair Expiry Durations Modal Handlers
  const handleOpenPairDurationsModal = (asset: MarketAsset) => {
    setEditingPairDurationsModal(asset);
    setPairWorkingAsset({ ...asset });
    setPairDurationTab("GENERAL");
    setPairNewDurationInput("");
  };

  const getPairTabDurations = (asset: MarketAsset | null, tab: "GENERAL" | "PROTECTED" | "STANDARD"): number[] => {
    if (!asset) return [];
    if (tab === "PROTECTED") {
      if (asset.protectedAllowedDurations && asset.protectedAllowedDurations.length > 0) {
        return asset.protectedAllowedDurations;
      }
      return getActiveDurationsForPairAndMode(asset, "PROTECTED", soloConfigState);
    }
    if (tab === "STANDARD") {
      if (asset.standardAllowedDurations && asset.standardAllowedDurations.length > 0) {
        return asset.standardAllowedDurations;
      }
      return getActiveDurationsForPairAndMode(asset, "STANDARD", soloConfigState);
    }
    if (asset.allowedDurations && asset.allowedDurations.length > 0) {
      return asset.allowedDurations;
    }
    return soloConfigState.allowedDurations || [15, 30, 60, 180, 300];
  };

  const handleAddPairDuration = () => {
    if (!pairWorkingAsset) return;
    const sec = parseInt(pairNewDurationInput.trim(), 10);
    if (isNaN(sec) || sec <= 0) {
      if (onTriggerNotification) onTriggerNotification("Please enter a valid positive duration in seconds.", "error");
      return;
    }
    const currentList = getPairTabDurations(pairWorkingAsset, pairDurationTab);
    if (currentList.includes(sec)) {
      if (onTriggerNotification) onTriggerNotification(`Duration ${sec}s already exists in list.`, "error");
      return;
    }
    const updated = [...currentList, sec].sort((a, b) => a - b);
    if (pairDurationTab === "PROTECTED") {
      setPairWorkingAsset({ ...pairWorkingAsset, protectedAllowedDurations: updated });
    } else if (pairDurationTab === "STANDARD") {
      setPairWorkingAsset({ ...pairWorkingAsset, standardAllowedDurations: updated });
    } else {
      setPairWorkingAsset({ ...pairWorkingAsset, allowedDurations: updated });
    }
    setPairNewDurationInput("");
  };

  const handleDeletePairDuration = (secToDelete: number) => {
    if (!pairWorkingAsset) return;
    const currentList = getPairTabDurations(pairWorkingAsset, pairDurationTab);
    const updated = currentList.filter(d => d !== secToDelete);
    if (pairDurationTab === "PROTECTED") {
      setPairWorkingAsset({ ...pairWorkingAsset, protectedAllowedDurations: updated });
    } else if (pairDurationTab === "STANDARD") {
      setPairWorkingAsset({ ...pairWorkingAsset, standardAllowedDurations: updated });
    } else {
      setPairWorkingAsset({ ...pairWorkingAsset, allowedDurations: updated });
    }
  };

  const handleClearPairTabDurations = () => {
    if (!pairWorkingAsset) return;
    if (pairDurationTab === "PROTECTED") {
      setPairWorkingAsset({ ...pairWorkingAsset, protectedAllowedDurations: undefined });
    } else if (pairDurationTab === "STANDARD") {
      setPairWorkingAsset({ ...pairWorkingAsset, standardAllowedDurations: undefined });
    } else {
      setPairWorkingAsset({ ...pairWorkingAsset, allowedDurations: undefined });
    }
    if (onTriggerNotification) onTriggerNotification(`Cleared custom ${pairDurationTab} durations for ${pairWorkingAsset.pair}.`, "info");
  };

  const handleSavePairDurations = async () => {
    if (!pairWorkingAsset) return;
    const currentAssets = (soloConfigState.customAssets && soloConfigState.customAssets.length > 0)
      ? soloConfigState.customAssets
      : SUPPORTED_SOLO_ASSETS;

    const updatedAssets = currentAssets.map(a => a.symbol === pairWorkingAsset.symbol ? pairWorkingAsset : a);

    try {
      setIsFixingPrice(true);
      livePriceService.setAssets(updatedAssets);
      await saveSoloTradingConfig({ customAssets: updatedAssets });
      setEditingPairDurationsModal(null);
      setPairWorkingAsset(null);
      if (onTriggerNotification) {
        onTriggerNotification(`‚úÖ Saved expiry duration settings for ${pairWorkingAsset.pair}!`, "success");
      }
    } catch (err: any) {
      if (onTriggerNotification) onTriggerNotification(`Failed to save pair durations: ${err?.message}`, "error");
    } finally {
      setIsFixingPrice(false);
    }
  };

  // 6-Digit Admin Security PIN Challenge Modal State
  interface PendingPinAction {
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
  }
  const [pendingPinAction, setPendingPinAction] = useState<PendingPinAction | null>(null);
  const [pinChallengeInput, setPinChallengeInput] = useState<string>("");
  const [pinChallengeError, setPinChallengeError] = useState<string>("");
  const [isVerifyingPin, setIsVerifyingPin] = useState<boolean>(false);

  // Security Credentials Update Form State
  const [secCurrentPassword, setSecCurrentPassword] = useState<string>("");
  const [secCurrentPin, setSecCurrentPin] = useState<string>("");
  const [secNewPassword, setSecNewPassword] = useState<string>("");
  const [secNewPin, setSecNewPin] = useState<string>("");
  const [isUpdatingSecCredentials, setIsUpdatingSecCredentials] = useState<boolean>(false);

  // Footer text configuration state
  const [adminFooterInput, setAdminFooterInput] = useState<string>("");
  const [isSavingFooter, setIsSavingFooter] = useState<boolean>(false);

  // Platform Title & Tagline Branding configuration state
  const [adminBrandingInput, setAdminBrandingInput] = useState<BrandingSettings>(DEFAULT_BRANDING_SETTINGS);
  const [isSavingBranding, setIsSavingBranding] = useState<boolean>(false);

  useEffect(() => {
    const unsub = subscribeAdminAuditLogs((logs) => {
      setAuditLogs(logs);
    });
    const unsubConfig = subscribeSoloTradingConfig((cfg) => {
      setSoloConfigState(cfg);
      if (cfg && cfg.customAssets && cfg.customAssets.length > 0) {
        livePriceService.setAssets(cfg.customAssets);
      }
      setEditSoloProtectedPayoutPct(cfg.protectedPayoutPercentage?.toString() || "80");
      setEditSoloStandardPayoutPct(cfg.standardPayoutPercentage?.toString() || cfg.defaultPayoutPercentage?.toString() || "85");
      setEditSoloMinStake(cfg.minStake?.toString() || "10");
      setEditSoloMaxStake(cfg.maxStake?.toString() || "50000");
      setEditSoloDrawRule(cfg.drawRule || "REFUND");
      setEditSoloShowPatternRadar(cfg.showPatternRadar !== false);
    });
    const unsubTrades = subscribeAllSoloTrades((trades) => {
      setAllSoloTrades(trades);
    });
    const unsubFooter = subscribeFooterText((text) => {
      setAdminFooterInput(text);
    });
    const unsubBranding = subscribeBrandingSettings((branding) => {
      setAdminBrandingInput(branding);
    });
    return () => {
      unsub();
      unsubConfig();
      unsubTrades();
      unsubFooter();
      unsubBranding();
    };
  }, []);

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminBrandingInput.appTitle?.trim()) {
      if (onTriggerNotification) onTriggerNotification("‚ö†Ô∏è Platform Main Title cannot be empty.", "error");
      return;
    }
    setIsSavingBranding(true);
    try {
      await updateBrandingSettings(adminBrandingInput);
      if (onTriggerNotification) onTriggerNotification("‚úÖ Platform Title & Taglines updated live across all screens!", "success");
    } catch (err: any) {
      console.error("Error updating branding:", err);
      if (onTriggerNotification) onTriggerNotification(`‚ùå Failed to update branding: ${err?.message || err}`, "error");
    } finally {
      setIsSavingBranding(false);
    }
  };

  const handleResetBranding = async () => {
    setAdminBrandingInput(DEFAULT_BRANDING_SETTINGS);
    setIsSavingBranding(true);
    try {
      await updateBrandingSettings(DEFAULT_BRANDING_SETTINGS);
      if (onTriggerNotification) onTriggerNotification("‚úÖ Platform Title & Tagline reset to default!", "success");
    } catch (err: any) {
      if (onTriggerNotification) onTriggerNotification(`‚ùå Failed to reset branding: ${err?.message || err}`, "error");
    } finally {
      setIsSavingBranding(false);
    }
  };

  const handleSaveFooterText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminFooterInput.trim()) {
      if (onTriggerNotification) onTriggerNotification("‚ö†Ô∏è Footer text cannot be empty.", "error");
      return;
    }
    setIsSavingFooter(true);
    try {
      await updateFooterText(adminFooterInput.trim());
      if (onTriggerNotification) onTriggerNotification("‚úÖ Platform Footer Text updated successfully!", "success");
    } catch (err: any) {
      console.error("Error updating footer text:", err);
      if (onTriggerNotification) onTriggerNotification(`‚ùå Failed to update footer text: ${err?.message || err}`, "error");
    } finally {
      setIsSavingFooter(false);
    }
  };

  const handleResetFooterText = async () => {
    setAdminFooterInput(DEFAULT_FOOTER_TEXT);
    setIsSavingFooter(true);
    try {
      await updateFooterText(DEFAULT_FOOTER_TEXT);
      if (onTriggerNotification) onTriggerNotification("‚úÖ Footer text reset to default standard branding!", "success");
    } catch (err: any) {
      if (onTriggerNotification) onTriggerNotification(`‚ùå Failed to reset footer text: ${err?.message || err}`, "error");
    } finally {
      setIsSavingFooter(false);
    }
  };

  const handleToggleSoloEngine = async () => {
    const nextState = !soloConfigState.isEnabled;
    requestPinAuthorization(
      nextState ? "Activate Solo Trading Engine" : "Deactivate Solo Trading Engine",
      `Are you sure you want to ${nextState ? "ENABLE" : "DISABLE"} the Solo Options Trading Engine for all users?`,
      async () => {
        await saveSoloTradingConfig({ isEnabled: nextState });
        if (onTriggerNotification) {
          onTriggerNotification(
            `‚úÖ Solo Trading Engine has been ${nextState ? "ACTIVATED (ONLINE)" : "DEACTIVATED (LOCKED)"} for all users.`,
            nextState ? "success" : "info"
          );
        }
      }
    );
  };

  const handleTogglePatternRadar = async () => {
    const nextVal = soloConfigState.showPatternRadar === false ? true : false;
    try {
      await saveSoloTradingConfig({ showPatternRadar: nextVal });
      if (onTriggerNotification) {
        onTriggerNotification(
          nextVal
            ? "‚úÖ '‚ö° Pattern Radar' button is now VISIBLE to users in Solo Trading!"
            : "üîí '‚ö° Pattern Radar' button is now HIDDEN from users in Solo Trading!",
          nextVal ? "success" : "info"
        );
      }
    } catch (err: any) {
      if (onTriggerNotification) {
        onTriggerNotification(`Failed to toggle Pattern Radar visibility: ${err?.message}`, "error");
      }
    }
  };

  const handleSaveSoloConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const protectedPayout = parseFloat(editSoloProtectedPayoutPct);
    const standardPayout = parseFloat(editSoloStandardPayoutPct);
    const minSt = parseFloat(editSoloMinStake);
    const maxSt = parseFloat(editSoloMaxStake);

    if (isNaN(protectedPayout) || protectedPayout <= 0 || protectedPayout > 100) {
      if (onTriggerNotification) onTriggerNotification("Invalid Protected Mode payout percentage (1-100%).", "error");
      return;
    }
    if (isNaN(standardPayout) || standardPayout <= 0 || standardPayout > 100) {
      if (onTriggerNotification) onTriggerNotification("Invalid Standard Mode payout percentage (1-100%).", "error");
      return;
    }
    if (isNaN(minSt) || minSt <= 0) {
      if (onTriggerNotification) onTriggerNotification("Invalid minimum stake.", "error");
      return;
    }
    if (isNaN(maxSt) || maxSt < minSt) {
      if (onTriggerNotification) onTriggerNotification("Max stake must be greater than min stake.", "error");
      return;
    }

    try {
      const currentAssets = (soloConfigState.customAssets && soloConfigState.customAssets.length > 0)
        ? soloConfigState.customAssets
        : SUPPORTED_SOLO_ASSETS;

      const updatedAssets = currentAssets.map(a => ({
        ...a,
        payoutPercentage: standardPayout
      }));

      await saveSoloTradingConfig({
        defaultPayoutPercentage: standardPayout,
        protectedPayoutPercentage: protectedPayout,
        standardPayoutPercentage: standardPayout,
        minStake: minSt,
        maxStake: maxSt,
        drawRule: editSoloDrawRule,
        showPatternRadar: editSoloShowPatternRadar,
        customAssets: updatedAssets
      });
      livePriceService.setAssets(updatedAssets);
      if (onTriggerNotification) {
        onTriggerNotification(`‚úÖ Solo Engine config saved! Protected Mode Payout: ${protectedPayout}%, Standard Mode Payout: ${standardPayout}%.`, "success");
      }
    } catch (err: any) {
      if (onTriggerNotification) {
        onTriggerNotification(`Failed to save Solo config: ${err?.message}`, "error");
      }
    }
  };

  const requestPinAuthorization = (
    title: string,
    description: string,
    onConfirm: () => Promise<void>
  ) => {
    setPinChallengeInput("");
    setPinChallengeError("");
    setPendingPinAction({ title, description, onConfirm });
  };

  const handlePinChallengeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pinVal = pinChallengeInput.trim();
    if (!pinVal || !/^\d{6}$/.test(pinVal)) {
      setPinChallengeError("Please enter your valid 6-digit Admin Security PIN (e.g. 123456).");
      return;
    }

    setIsVerifyingPin(true);
    setPinChallengeError("");

    try {
      const isValid = await verifyAdminSecurityPin(pinVal);
      if (isValid && pendingPinAction) {
        const actionToRun = pendingPinAction.onConfirm;
        setPendingPinAction(null);
        setPinChallengeInput("");
        await actionToRun();
      } else {
        setPinChallengeError("‚ùå Invalid 6-digit Security PIN! Action blocked.");
      }
    } catch (err: any) {
      setPinChallengeError(err.message || "PIN verification failed.");
    } finally {
      setIsVerifyingPin(false);
    }
  };
  
  // Payment Details Form State & Field Label Customizations
  const [loadedGwId, setLoadedGwId] = useState<string | null>(null);
  const [payUpiId, setPayUpiId] = useState<string>(paymentDetails.upiId || DEFAULT_PAYMENT_DETAILS.upiId);
  const [payAccountName, setPayAccountName] = useState<string>(paymentDetails.accountName || DEFAULT_PAYMENT_DETAILS.accountName);
  const [payBankName, setPayBankName] = useState<string>(paymentDetails.bankName || DEFAULT_PAYMENT_DETAILS.bankName);
  const [payAccountNumber, setPayAccountNumber] = useState<string>(paymentDetails.accountNumber || DEFAULT_PAYMENT_DETAILS.accountNumber);
  const [payIfscCode, setPayIfscCode] = useState<string>(paymentDetails.ifscCode || DEFAULT_PAYMENT_DETAILS.ifscCode);
  const [payBranchAndType, setPayBranchAndType] = useState<string>(paymentDetails.branchAndType || DEFAULT_PAYMENT_DETAILS.branchAndType);
  const [payQrCodeUrl, setPayQrCodeUrl] = useState<string>(paymentDetails.qrCodeUrl || "");
  const [isSavingPaymentDetails, setIsSavingPaymentDetails] = useState<boolean>(false);

  // Editable Labels for Standard Fields
  const [payFieldLabels, setPayFieldLabels] = useState<{ [key: string]: string }>({
    upiId: "UPI ID",
    accountName: "Account Holder Name",
    bankName: "Bank Name",
    accountNumber: "Account Number",
    ifscCode: "IFSC Code",
    branchAndType: "Branch & Account Type"
  });

  // Dynamic Custom Fields list
  const [payCustomFields, setPayCustomFields] = useState<CustomPaymentField[]>([]);

  // Helper functions to manage custom fields in Primary Editor
  const handleAddPayCustomField = () => {
    setPayCustomFields((prev) => [
      ...prev,
      { id: "cf_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5), label: "Custom Field Name", value: "" }
    ]);
  };

  const handleRemovePayCustomField = (fieldId: string) => {
    setPayCustomFields((prev) => prev.filter((f) => f.id !== fieldId));
  };

  const handleUpdatePayCustomField = (fieldId: string, key: "label" | "value", val: string) => {
    setPayCustomFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, [key]: val } : f)));
  };

  const handleUpdatePayFieldLabel = (key: string, labelVal: string) => {
    setPayFieldLabels((prev) => ({ ...prev, [key]: labelVal }));
  };

  // Admin Payment Note & Instructions State
  const [adminNoteText, setAdminNoteText] = useState<string>(paymentNote || DEFAULT_PAYMENT_NOTE);
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);

  // Deposit & Withdrawal Processing Times State
  const [adminDepositTime, setAdminDepositTime] = useState<string>(depositProcessingTime || DEFAULT_DEPOSIT_PROCESSING_TIME);
  const [adminWithdrawalTime, setAdminWithdrawalTime] = useState<string>(withdrawalProcessingTime || DEFAULT_WITHDRAWAL_PROCESSING_TIME);
  const [isSavingProcessingTimes, setIsSavingProcessingTimes] = useState<boolean>(false);

  useEffect(() => {
    if (paymentNote) {
      setAdminNoteText(paymentNote);
    }
  }, [paymentNote]);

  useEffect(() => {
    if (depositProcessingTime) setAdminDepositTime(depositProcessingTime);
    if (withdrawalProcessingTime) setAdminWithdrawalTime(withdrawalProcessingTime);
  }, [depositProcessingTime, withdrawalProcessingTime]);

  // User Withdrawal Custom Input Fields State
  const [adminWithdrawalFields, setAdminWithdrawalFields] = useState<WithdrawalField[]>(DEFAULT_WITHDRAWAL_FIELDS);
  const [isSavingWithdrawalFields, setIsSavingWithdrawalFields] = useState<boolean>(false);

  useEffect(() => {
    const unsub = subscribeWithdrawalFields((fields) => {
      setAdminWithdrawalFields(fields);
    });
    return () => unsub();
  }, []);

  const handleAddWithdrawalField = () => {
    const newField: WithdrawalField = {
      id: "w_field_" + Date.now(),
      label: "",
      placeholder: "",
      required: false,
      type: "text",
    };
    setAdminWithdrawalFields((prev) => [...prev, newField]);
  };

  const handleUpdateWithdrawalField = (id: string, key: keyof WithdrawalField, value: any) => {
    setAdminWithdrawalFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [key]: value } : f))
    );
  };

  const handleRemoveWithdrawalField = (id: string) => {
    setAdminWithdrawalFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSaveWithdrawalFields = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWithdrawalFields(true);
    try {
      const validFields = adminWithdrawalFields.filter((f) => f.label.trim().length > 0);
      await saveWithdrawalFields(validFields);
      await logAdminAction(
        "UPDATE_WITHDRAWAL_FIELDS",
        `Updated ${validFields.length} custom withdrawal input fields for users.`
      );
      alert("‚úÖ User Withdrawal Input Fields saved successfully!");
    } catch (err: any) {
      alert("Error saving withdrawal fields: " + err.message);
    } finally {
      setIsSavingWithdrawalFields(false);
    }
  };

  const handleResetWithdrawalFields = async () => {
    if (window.confirm("Are you sure you want to reset withdrawal fields to default template?")) {
      setAdminWithdrawalFields(DEFAULT_WITHDRAWAL_FIELDS);
      await saveWithdrawalFields(DEFAULT_WITHDRAWAL_FIELDS);
      alert("Reset to default withdrawal fields!");
    }
  };

  // Multiple Payment Gateways Management State
  const activeGatewaysList = (paymentGateways && paymentGateways.length > 0)
    ? paymentGateways
    : DEFAULT_PAYMENT_GATEWAYS;

  // New Payment Gateway Modal/Form state
  const [isAddGatewayModalOpen, setIsAddGatewayModalOpen] = useState<boolean>(false);
  const [newGwTitle, setNewGwTitle] = useState<string>("");
  const [newGwUpiId, setNewGwUpiId] = useState<string>("");
  const [newGwAccountName, setNewGwAccountName] = useState<string>("");
  const [newGwBankName, setNewGwBankName] = useState<string>("");
  const [newGwAccountNumber, setNewGwAccountNumber] = useState<string>("");
  const [newGwIfscCode, setNewGwIfscCode] = useState<string>("");
  const [newGwBranchAndType, setNewGwBranchAndType] = useState<string>("MIHINPURWA ‚Ä¢ SAVING");
  const [newGwQrCodeUrl, setNewGwQrCodeUrl] = useState<string>("");
  const [newGwIsActive, setNewGwIsActive] = useState<boolean>(true);
  const [isCreatingGateway, setIsCreatingGateway] = useState<boolean>(false);

  // Delete Payment Gateway state
  const [gatewayToDelete, setGatewayToDelete] = useState<PaymentGateway | null>(null);
  const [isDeletingGateway, setIsDeletingGateway] = useState<boolean>(false);

  const handleToggleGatewayStatus = async (targetGw: PaymentGateway, index: number) => {
    const nextStatus = targetGw.isActive === false ? true : false;
    const updated = activeGatewaysList.map((g, idx) => {
      const match = g.id ? g.id === targetGw.id : idx === index;
      return match ? { ...g, isActive: nextStatus } : g;
    });

    try {
      await savePaymentGateways(updated);
      if (onTriggerNotification) {
        onTriggerNotification(
          `Payment Gateway "${targetGw.title || targetGw.bankName}" is now ${nextStatus ? "Active & Visible to users" : "Hidden from users (Disabled)"}.`,
          nextStatus ? "success" : "info"
        );
      }
    } catch (err: any) {
      if (onTriggerNotification) {
        onTriggerNotification(err?.message || "Failed to update gateway status.", "error");
      }
    }
  };

  const handleToggleAllGateways = async () => {
    const hasActive = activeGatewaysList.some((g) => g.isActive !== false);
    const newStatus = !hasActive;
    const updated = activeGatewaysList.map((g) => ({ ...g, isActive: newStatus }));

    try {
      await savePaymentGateways(updated);
      if (onTriggerNotification) {
        onTriggerNotification(
          newStatus
            ? "All payment gateways enabled! Users can make deposits now."
            : "All payment options hidden! Deposits are now disabled for users.",
          newStatus ? "success" : "info"
        );
      }
    } catch (err: any) {
      if (onTriggerNotification) {
        onTriggerNotification(err?.message || "Failed to update gateways.", "error");
      }
    }
  };

  const handleCreatePaymentGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGwUpiId.trim() || !newGwAccountName.trim() || !newGwBankName.trim()) {
      if (onTriggerNotification) onTriggerNotification("Please fill in required fields (UPI ID, Account Name, Bank Name).", "error");
      return;
    }
    setIsCreatingGateway(true);
    try {
      const titleToUse = newGwTitle.trim() || `${newGwBankName.trim()} Gateway`;
      await addPaymentGateway(
        {
          title: titleToUse,
          upiId: newGwUpiId.trim(),
          accountName: newGwAccountName.trim(),
          bankName: newGwBankName.trim(),
          accountNumber: newGwAccountNumber.trim(),
          ifscCode: newGwIfscCode.trim(),
          branchAndType: newGwBranchAndType.trim(),
          qrCodeUrl: newGwQrCodeUrl.trim(),
          isActive: newGwIsActive,
        },
        activeGatewaysList
      );
      if (onTriggerNotification) {
        onTriggerNotification(`Payment Gateway "${titleToUse}" created successfully!`, "success");
      }
      setIsAddGatewayModalOpen(false);
      setNewGwTitle("");
      setNewGwUpiId("");
      setNewGwAccountName("");
      setNewGwBankName("");
      setNewGwAccountNumber("");
      setNewGwIfscCode("");
      setNewGwBranchAndType("MIHINPURWA ‚Ä¢ SAVING");
      setNewGwQrCodeUrl("");
      setNewGwIsActive(true);
    } catch (err: any) {
      if (onTriggerNotification) {
        onTriggerNotification(err?.message || "Failed to create payment gateway.", "error");
      }
    } finally {
      setIsCreatingGateway(false);
    }
  };

  const handleConfirmDeleteGateway = async () => {
    if (!gatewayToDelete) return;
    setIsDeletingGateway(true);
    try {
      await deletePaymentGateway(gatewayToDelete.id, activeGatewaysList);
      if (onTriggerNotification) {
        onTriggerNotification(`Payment Gateway "${gatewayToDelete.title || gatewayToDelete.bankName}" deleted successfully!`, "info");
      }
      setGatewayToDelete(null);
    } catch (err: any) {
      if (onTriggerNotification) {
        onTriggerNotification(err?.message || "Failed to delete payment gateway.", "error");
      }
    } finally {
      setIsDeletingGateway(false);
    }
  };

  const handleLoadGatewayToEditor = (gw: PaymentGateway) => {
    setLoadedGwId(gw.id);
    setPayUpiId(gw.upiId || "");
    setPayAccountName(gw.accountName || "");
    setPayBankName(gw.bankName || "");
    setPayAccountNumber(gw.accountNumber || "");
    setPayIfscCode(gw.ifscCode || "");
    setPayBranchAndType(gw.branchAndType || "");
    setPayQrCodeUrl(gw.qrCodeUrl || "");
    setPayFieldLabels({
      upiId: gw.fieldLabels?.upiId || "UPI ID",
      accountName: gw.fieldLabels?.accountName || "Account Holder Name",
      bankName: gw.fieldLabels?.bankName || "Bank Name",
      accountNumber: gw.fieldLabels?.accountNumber || "Account Number",
      ifscCode: gw.fieldLabels?.ifscCode || "IFSC Code",
      branchAndType: gw.fieldLabels?.branchAndType || "Branch & Account Type"
    });
    setPayCustomFields(gw.customFields ? [...gw.customFields] : []);
    if (onTriggerNotification) {
      onTriggerNotification(`Loaded details & input fields for "${gw.title || gw.bankName}" into Editor below.`, "info");
    }
  };

  useEffect(() => {
    if (paymentDetails) {
      setPayUpiId(paymentDetails.upiId || DEFAULT_PAYMENT_DETAILS.upiId);
      setPayAccountName(paymentDetails.accountName || DEFAULT_PAYMENT_DETAILS.accountName);
      setPayBankName(paymentDetails.bankName || DEFAULT_PAYMENT_DETAILS.bankName);
      setPayAccountNumber(paymentDetails.accountNumber || DEFAULT_PAYMENT_DETAILS.accountNumber);
      setPayIfscCode(paymentDetails.ifscCode || DEFAULT_PAYMENT_DETAILS.ifscCode);
      setPayBranchAndType(paymentDetails.branchAndType || DEFAULT_PAYMENT_DETAILS.branchAndType);
      setPayQrCodeUrl(paymentDetails.qrCodeUrl || "");
      if (paymentDetails.fieldLabels) {
        setPayFieldLabels({
          upiId: paymentDetails.fieldLabels.upiId || "UPI ID",
          accountName: paymentDetails.fieldLabels.accountName || "Account Holder Name",
          bankName: paymentDetails.fieldLabels.bankName || "Bank Name",
          accountNumber: paymentDetails.fieldLabels.accountNumber || "Account Number",
          ifscCode: paymentDetails.fieldLabels.ifscCode || "IFSC Code",
          branchAndType: paymentDetails.fieldLabels.branchAndType || "Branch & Account Type"
        });
      }
      if (paymentDetails.customFields) {
        setPayCustomFields([...paymentDetails.customFields]);
      }
      if (paymentDetails.id) {
        setLoadedGwId(paymentDetails.id);
      }
    }
  }, [paymentDetails]);

  const handleSavePaymentDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPaymentDetails(true);
    try {
      const validCustomFields = payCustomFields.filter((f) => f.label.trim().length > 0 || f.value.trim().length > 0);

      const updatedGatewaysList = activeGatewaysList.map((g, idx) => {
        const isMatch = loadedGwId ? g.id === loadedGwId : idx === 0;
        if (!isMatch) return g;
        return {
          ...g,
          upiId: payUpiId.trim(),
          accountName: payAccountName.trim(),
          bankName: payBankName.trim(),
          accountNumber: payAccountNumber.trim(),
          ifscCode: payIfscCode.trim(),
          branchAndType: payBranchAndType.trim(),
          qrCodeUrl: payQrCodeUrl.trim(),
          fieldLabels: { ...payFieldLabels },
          customFields: validCustomFields
        };
      });

      await savePaymentGateways(updatedGatewaysList);

      await updatePaymentDetails({
        id: loadedGwId || activeGatewaysList[0]?.id || "gw_primary",
        upiId: payUpiId.trim(),
        accountName: payAccountName.trim(),
        bankName: payBankName.trim(),
        accountNumber: payAccountNumber.trim(),
        ifscCode: payIfscCode.trim(),
        branchAndType: payBranchAndType.trim(),
        qrCodeUrl: payQrCodeUrl.trim(),
        fieldLabels: { ...payFieldLabels },
        customFields: validCustomFields
      });

      if (onTriggerNotification) {
        onTriggerNotification("Payment Gateway details, customized field names & dynamic inputs saved successfully!", "success");
      }
    } catch (err: any) {
      if (onTriggerNotification) {
        onTriggerNotification(err?.message || "Failed to update payment details.", "error");
      }
    } finally {
      setIsSavingPaymentDetails(false);
    }
  };

  const handleSavePaymentNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingNote(true);
    try {
      await savePaymentNote(adminNoteText.trim());
      if (onTriggerNotification) {
        onTriggerNotification("Payment information & alternative options note updated successfully!", "success");
      }
    } catch (err: any) {
      if (onTriggerNotification) {
        onTriggerNotification(err?.message || "Failed to update payment note.", "error");
      }
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleSaveProcessingTimes = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProcessingTimes(true);
    try {
      await saveProcessingTimes(adminDepositTime.trim(), adminWithdrawalTime.trim());
      if (onTriggerNotification) {
        onTriggerNotification("Deposit & Withdrawal processing times updated successfully!", "success");
      }
    } catch (err: any) {
      if (onTriggerNotification) {
        onTriggerNotification(err?.message || "Failed to update processing times.", "error");
      }
    } finally {
      setIsSavingProcessingTimes(false);
    }
  };

  const handleUpdateAdminSecurityCredentials = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!secCurrentPin.trim()) {
      if (onTriggerNotification) {
        onTriggerNotification("Please enter your current 6-digit Admin Security PIN.", "error");
      }
      return;
    }

    if (!secNewPassword.trim() && !secNewPin.trim()) {
      if (onTriggerNotification) {
        onTriggerNotification("Please enter a new Password or a new 6-digit Security PIN to update.", "error");
      }
      return;
    }

    if (secNewPassword.trim()) {
      if (!secCurrentPassword.trim()) {
        if (onTriggerNotification) {
          onTriggerNotification("Please enter your current Admin Password to update your Password.", "error");
        }
        return;
      }
      if (secNewPassword.trim() === secCurrentPassword.trim()) {
        if (onTriggerNotification) {
          onTriggerNotification("New Password cannot be the same as your Current Password.", "error");
        }
        return;
      }
      const pwdVal = validatePasswordStrength(secNewPassword.trim());
      if (!pwdVal.isValid) {
        if (onTriggerNotification) {
          onTriggerNotification(pwdVal.message || "Invalid password strength.", "error");
        }
        return;
      }
    }

    if (secNewPin.trim()) {
      if (secNewPin.trim() === secCurrentPin.trim()) {
        if (onTriggerNotification) {
          onTriggerNotification("New 6-digit Security PIN cannot be the same as your Current Security PIN.", "error");
        }
        return;
      }
      const pinVal = validateSecurityPinFormat(secNewPin.trim());
      if (!pinVal.isValid) {
        if (onTriggerNotification) {
          onTriggerNotification(pinVal.message || "Invalid PIN format.", "error");
        }
        return;
      }
    }

    setIsUpdatingSecCredentials(true);
    try {
      await updateAdminPasswordAndPin(
        secCurrentPin.trim(),
        secCurrentPassword.trim(),
        secNewPassword.trim() || undefined,
        secNewPin.trim() || undefined
      );
      if (onTriggerNotification) {
        onTriggerNotification("‚úÖ Admin Security Credentials updated successfully! (Stored as Argon2/bcrypt hashes)", "success");
      }
      setSecCurrentPassword("");
      setSecCurrentPin("");
      setSecNewPassword("");
      setSecNewPin("");
    } catch (err: any) {
      if (onTriggerNotification) {
        onTriggerNotification(err?.message || "Failed to update security credentials.", "error");
      }
    } finally {
      setIsUpdatingSecCredentials(false);
    }
  };
  
  // Local state for selecting which active/waiting pool to manage
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);

  const manageablePools = allPools.filter(p => p.status === "WAITING" || p.status === "ACTIVE");
  const adminCurrentPool = manageablePools.find(p => p.id === selectedPoolId) || manageablePools[0] || null;

  // Support messages admin state
  const [selectedSupportMsg, setSelectedSupportMsg] = useState<SupportMessage | null>(null);
  const [adminReplyInput, setAdminReplyInput] = useState<string>("");
  const [isSubmittingReply, setIsSubmittingReply] = useState<boolean>(false);
  const [supportFilter, setSupportFilter] = useState<"ALL" | "OPEN" | "RESOLVED">("OPEN");

  // Direct Message from Admin state
  const [isDirectMsgModalOpen, setIsDirectMsgModalOpen] = useState<boolean>(false);
  const [directMsgUserId, setDirectMsgUserId] = useState<string>("");
  const [directMsgSubject, setDirectMsgSubject] = useState<string>("Important Notice from Admin");
  const [directMsgText, setDirectMsgText] = useState<string>("");
  const [isSendingDirectMsg, setIsSendingDirectMsg] = useState<boolean>(false);

  // Change Admin PIN state
  const [newAdminPin, setNewAdminPin] = useState<string>("");
  const [confirmAdminPin, setConfirmAdminPin] = useState<string>("");
  const [isUpdatingPin, setIsUpdatingPin] = useState<boolean>(false);

  // Pool Deletion & Refund Modal State (Replaces native browser window.confirm which can be blocked in iframe)
  const [poolToDeleteModal, setPoolToDeleteModal] = useState<TradePool | null>(null);
  const [poolToRefundModal, setPoolToRefundModal] = useState<TradePool | null>(null);
  const [isProcessingPoolAction, setIsProcessingPoolAction] = useState<boolean>(false);

  const handleUpdateAdminPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminPin.trim()) {
      if (onTriggerNotification) {
        onTriggerNotification("Please enter a new PIN/Passcode.", "error");
      }
      return;
    }
    if (newAdminPin.trim() !== confirmAdminPin.trim()) {
      if (onTriggerNotification) {
        onTriggerNotification("PIN passcodes do not match!", "error");
      }
      return;
    }
    setIsUpdatingPin(true);
    try {
      await updateAdminPin(newAdminPin.trim());
      if (onTriggerNotification) {
        onTriggerNotification("Admin PIN/Passcode updated successfully! Use this new passcode for future logins.", "success");
      }
      setNewAdminPin("");
      setConfirmAdminPin("");
    } catch (err: any) {
      if (onTriggerNotification) {
        onTriggerNotification(err?.message || "Failed to update Admin PIN.", "error");
      }
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const handleSendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directMsgUserId) {
      if (onTriggerNotification) {
        onTriggerNotification("Please select a recipient user.", "error");
      }
      return;
    }
    const targetUser = allUsers.find(u => u.id === directMsgUserId);
    if (!targetUser) {
      if (onTriggerNotification) {
        onTriggerNotification("Selected user not found.", "error");
      }
      return;
    }

    const cleanText = directMsgText.trim();
    if (!cleanText) {
      if (onTriggerNotification) {
        onTriggerNotification("Please enter a message.", "error");
      }
      return;
    }

    setIsSendingDirectMsg(true);
    try {
      await sendAdminDirectMessage(
        targetUser.id,
        targetUser.email,
        targetUser.name,
        directMsgSubject,
        cleanText
      );
      if (onTriggerNotification) {
        onTriggerNotification(`Message sent to ${targetUser.name} successfully!`, "success");
      }
      setDirectMsgText("");
      setIsDirectMsgModalOpen(false);
    } catch (err: any) {
      if (onTriggerNotification) {
        onTriggerNotification(err?.message || "Failed to send direct message.", "error");
      }
    } finally {
      setIsSendingDirectMsg(false);
    }
  };

  const openSupportCount = supportMessages.filter(m => m.status === "OPEN").length;

  const handleSendAdminReply = async (msgId: string, markResolved: boolean = true) => {
    const isOwnerOrSuper = currentAdminAccount?.role === "OWNER" || currentAdminAccount?.role === "SUPER_ADMIN";
    const canReply = hasStaffPermission(currentAdminAccount, "reply_support") || hasStaffPermission(currentAdminAccount, "live_chat");

    if (!isOwnerOrSuper && !canReply) {
      if (onTriggerNotification) {
        onTriggerNotification("Permission Denied: You do not have permission to reply to support tickets.", "error");
      }
      return;
    }

    const cleanReply = adminReplyInput.trim();
    if (!cleanReply) {
      if (onTriggerNotification) {
        onTriggerNotification("Please type a reply message before sending.", "error");
      }
      return;
    }

    setIsSubmittingReply(true);
    try {
      await replyToSupportMessage(msgId, cleanReply, markResolved);
      if (onTriggerNotification) {
        onTriggerNotification("Reply sent & support ticket updated successfully!", "success");
      }
      setSelectedSupportMsg(null);
      setAdminReplyInput("");
    } catch (err: any) {
      if (onTriggerNotification) {
        onTriggerNotification(err?.message || "Failed to send reply.", "error");
      }
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Params
  const [targetAmount, setTargetAmount] = useState<string>(config.targetAmount.toString());
  const [minContribution, setMinContribution] = useState<string>(config.minContribution.toString());
  const [maxParticipants, setMaxParticipants] = useState<string>(config.maxParticipants.toString());
  const [timeoutSeconds, setTimeoutSeconds] = useState<string>(config.timeoutSeconds.toString());
  const [selectedTradeType, setSelectedTradeType] = useState<"CALL" | "PUT">("CALL");
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<RiskLevel>("HIGH");
  const [expectedReturn, setExpectedReturn] = useState<string>((config.expectedReturn ?? 15).toString());
  const [isFreePool, setIsFreePool] = useState<boolean>(false);
  const [freeRewardAmount, setFreeRewardAmount] = useState<string>("10");
  const [selectedAssetPair, setSelectedAssetPair] = useState<string>("BTC / USDT (Bitcoin)");
  const [selectedTradingSymbol, setSelectedTradingSymbol] = useState<string>("BINANCE:BTCUSDT");
  const [scheduledTimeInput, setScheduledTimeInput] = useState<string>("");
  const [isCustomAssetMode, setIsCustomAssetMode] = useState<boolean>(false);
  const [customAssetPairInput, setCustomAssetPairInput] = useState<string>("");
  const [customTradingSymbolInput, setCustomTradingSymbolInput] = useState<string>("");

  // Settlement
  const [settlementPercentInput, setSettlementPercentInput] = useState<string>("15");
  const [settlementAmount, setSettlementAmount] = useState<string>("15");
  const [isSettling, setIsSettling] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);

  // Real-time editable return percentage for current pool
  const [currentPoolReturn, setCurrentPoolReturn] = useState<string>("");

  // Pool Edit Modal state
  const [editingPool, setEditingPool] = useState<TradePool | null>(null);
  const [editAssetPair, setEditAssetPair] = useState<string>("");
  const [editTradingSymbol, setEditTradingSymbol] = useState<string>("");
  const [editTargetAmount, setEditTargetAmount] = useState<string>("");
  const [editMinContribution, setEditMinContribution] = useState<string>("");
  const [editExpectedReturn, setEditExpectedReturn] = useState<string>("");
  const [editTradeType, setEditTradeType] = useState<"CALL" | "PUT">("CALL");
  const [editRiskLevel, setEditRiskLevel] = useState<RiskLevel>("HIGH");
  const [editScheduledTime, setEditScheduledTime] = useState<string>("");
  const [editFreeRewardAmount, setEditFreeRewardAmount] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [isUpdatingReturn, setIsUpdatingReturn] = useState(false);

  // User Management State
  const [userSearch, setUserSearch] = useState<string>("");
  const [adjustingUser, setAdjustingUser] = useState<UserProfile | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState<string>("100");
  const [adjustmentType, setAdjustmentType] = useState<"BONUS" | "ADJUSTMENT">("BONUS");
  const [adjustmentReason, setAdjustmentReason] = useState<string>("");
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState<boolean>(false);

  // Admin User Profile Edit State
  const [editingUserProfile, setEditingUserProfile] = useState<UserProfile | null>(null);
  const [editNameInput, setEditNameInput] = useState<string>("");
  const [editEmailInput, setEditEmailInput] = useState<string>("");
  const [editPhoneInput, setEditPhoneInput] = useState<string>("");
  const [editMobileVerified, setEditMobileVerified] = useState<boolean>(false);

  // Admin User KYC & Saved Bank Details State
  const [editPanNumber, setEditPanNumber] = useState<string>("");
  const [editAadhaarNumber, setEditAadhaarNumber] = useState<string>("");
  const [editKycDocType, setEditKycDocType] = useState<"PAN" | "AADHAAR" | "BOTH">("PAN");
  const [editKycHolderName, setEditKycHolderName] = useState<string>("");
  const [editKycStatus, setEditKycStatus] = useState<"unverified" | "pending" | "verified" | "rejected">("pending");
  const [editKycRejectReason, setEditKycRejectReason] = useState<string>("");
  const [editBankHolderName, setEditBankHolderName] = useState<string>("");
  const [editBankName, setEditBankName] = useState<string>("");
  const [editBankAccountNumber, setEditBankAccountNumber] = useState<string>("");
  const [editBankIfscCode, setEditBankIfscCode] = useState<string>("");
  const [editCustomBankFields, setEditCustomBankFields] = useState<CustomBankField[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");

  const handleAddCustomBankColumn = () => {
    const newField: CustomBankField = {
      id: `bank_col_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: "Custom Field / Column (e.g. UPI ID)",
      value: ""
    };
    setEditCustomBankFields(prev => [...prev, newField]);
  };

  const handleDeleteCustomBankColumn = (id: string) => {
    setEditCustomBankFields(prev => prev.filter(f => f.id !== id));
  };

  const handleUpdateCustomBankColumn = (id: string, key: "label" | "value", val: string) => {
    setEditCustomBankFields(prev => prev.map(f => f.id === id ? { ...f, [key]: val } : f));
  };

  const [isSubmittingProfileEdit, setIsSubmittingProfileEdit] = useState<boolean>(false);

  const handleAdminUpdateUserProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserProfile) return;

    const isOwnerOrSuper = currentAdminAccount?.role === "OWNER" || currentAdminAccount?.role === "SUPER_ADMIN";
    const canVerifyKyc = hasStaffPermission(currentAdminAccount, "verify_kyc");

    if (!isOwnerOrSuper && !canVerifyKyc) {
      if (onTriggerNotification) {
        onTriggerNotification("Permission Denied: You do not have permission to edit user profiles or KYC.", "error");
      }
      return;
    }

    const cleanName = editNameInput.trim();
    const cleanEmail = editEmailInput.trim().toLowerCase();
    const cleanPhone = editPhoneInput.trim();

    if (!cleanName || !cleanEmail) {
      if (onTriggerNotification) {
        onTriggerNotification("Name and Email address cannot be empty.", "error");
      }
      return;
    }

    setIsSubmittingProfileEdit(true);
    try {
      await updateUserProfileDetails(
        editingUserProfile.id,
        cleanName,
        cleanEmail,
        cleanPhone,
        editMobileVerified
      );

      await adminUpdateUserKycAndBank(editingUserProfile.id, {
        panNumber: editPanNumber.trim().toUpperCase(),
        aadhaarNumber: editAadhaarNumber.trim(),
        kycDocType: editKycDocType,
        kycHolderName: editKycHolderName.trim(),
        kycStatus: editKycStatus,
        kycRejectReason: editKycRejectReason.trim(),
        savedBankDetails: {
          accountHolderName: editBankHolderName.trim(),
          bankName: editBankName.trim(),
          accountNumber: editBankAccountNumber.trim(),
          ifscCode: editBankIfscCode.trim().toUpperCase(),
          isVerified: editKycStatus === "verified",
          customFields: editCustomBankFields
        }
      });

      if (onTriggerNotification) {
        onTriggerNotification(`Successfully updated profile, PAN/Aadhaar & Bank Account for ${cleanName}!`, "success");
      }
      setEditingUserProfile(null);
    } catch (err: any) {
      if (onTriggerNotification) {
        onTriggerNotification(err?.message || "Failed to update user profile.", "error");
      }
    } finally {
      setIsSubmittingProfileEdit(false);
    }
  };

  // Mobile PIN Verification Modal State
  const [generatedPinModal, setGeneratedPinModal] = useState<{
    user: UserProfile;
    pin: string;
    expiresAt: string;
  } | null>(null);
  const [isGeneratingPin, setIsGeneratingPin] = useState<string | null>(null);
  const [copiedPin, setCopiedPin] = useState(false);

  const [customPinMinsInput, setCustomPinMinsInput] = useState<string>("30");
  const [isUpdatingPinExpiry, setIsUpdatingPinExpiry] = useState<boolean>(false);

  const handleGeneratePinForUser = async (u: UserProfile) => {
    setIsGeneratingPin(u.id);
    try {
      const response = await fetch("/api/user/generate-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: u.id }),
      });
      const data = await response.json();

      if (data.success && data.pin) {
        setGeneratedPinModal({
          user: u,
          pin: data.pin,
          expiresAt: data.generatedAt || new Date().toISOString()
        });
        await logAdminAction(
          "USER_PIN_GENERATED",
          `Generated unique login PIN for trader ${u.name} (${u.email})`,
          "SUCCESS",
          u.id
        );
        if (onTriggerNotification) {
          onTriggerNotification(`Unique Login PIN generated for ${u.name}!`, "success");
        }
      } else {
        throw new Error(data.message || "Failed to generate login PIN.");
      }
    } catch (err: any) {
      if (onTriggerNotification) {
        onTriggerNotification(err?.message || "Failed to generate PIN.", "error");
      }
    } finally {
      setIsGeneratingPin(null);
    }
  };

  const handleSetCustomPinDuration = async (minutesFromNow: number) => {
    if (!generatedPinModal) return;
    setIsUpdatingPinExpiry(true);
    try {
      const validMins = Math.max(1, minutesFromNow);
      const newExpiryDate = new Date(Date.now() + validMins * 60 * 1000);
      const newExpiresAtISO = newExpiryDate.toISOString();

      await updateUserPinExpiry(generatedPinModal.user.id, newExpiresAtISO);

      setGeneratedPinModal({
        ...generatedPinModal,
        expiresAt: newExpiresAtISO
      });

      if (onTriggerNotification) {
        onTriggerNotification(`Updated PIN validity duration to ${validMins} minutes! Expires: ${newExpiryDate.toLocaleTimeString()}`, "success");
      }
    } catch (err: any) {
      if (onTriggerNotification) {
        onTriggerNotification("Failed to update PIN validity duration.", "error");
      }
    } finally {
      setIsUpdatingPinExpiry(false);
    }
  };

  const handleExtendPinDuration = async (extraMinutes: number) => {
    if (!generatedPinModal) return;
    setIsUpdatingPinExpiry(true);
    try {
      const currentExpiryMs = new Date(generatedPinModal.expiresAt).getTime();
      const baseMs = Math.max(Date.now(), currentExpiryMs);
      const newExpiryDate = new Date(baseMs + extraMinutes * 60 * 1000);
      const newExpiresAtISO = newExpiryDate.toISOString();

      await updateUserPinExpiry(generatedPinModal.user.id, newExpiresAtISO);

      setGeneratedPinModal({
        ...generatedPinModal,
        expiresAt: newExpiresAtISO
      });

      if (onTriggerNotification) {
        onTriggerNotification(`Extended PIN validity by +${extraMinutes} minutes! Expires: ${newExpiryDate.toLocaleTimeString()}`, "success");
      }
    } catch (err: any) {
      if (onTriggerNotification) {
        onTriggerNotification("Failed to extend PIN validity duration.", "error");
      }
    } finally {
      setIsUpdatingPinExpiry(false);
    }
  };

  const handleDirectApproveUserMobile = (u: UserProfile) => {
    requestPinAuthorization(
      `Approve Mobile Number for ${u.name}`,
      `Directly verifying and approving mobile number (${u.phone || 'N/A'}) for trader "${u.name}" (${u.email}). Enter your 6-digit Security PIN:`,
      async () => {
        try {
          await adminApproveMobileVerificationDirectly(u.id);
          await logAdminAction(
            "USER_MOBILE_DIRECTLY_APPROVED",
            `Directly approved mobile number (${u.phone || 'N/A'}) for user ${u.name} (${u.email})`,
            "SUCCESS",
            u.id
          );
          if (onTriggerNotification) {
            onTriggerNotification(`Mobile number for "${u.name}" has been directly approved!`, "success");
          }
        } catch (err: any) {
          await logAdminAction(
            "USER_MOBILE_APPROVAL_FAILED",
            `Failed to approve mobile for ${u.name}: ${err.message}`,
            "FAILED",
            u.id
          );
          if (onTriggerNotification) {
            onTriggerNotification(err?.message || "Failed to approve mobile verification.", "error");
          }
        }
      }
    );
  };

  const handleDirectApproveUserKyc = (u: UserProfile) => {
    requestPinAuthorization(
      `Approve KYC & Bank for ${u.name}`,
      `Directly approving PAN/Aadhaar & Bank KYC verification for trader "${u.name}" (${u.email}). Enter your 6-digit Security PIN:`,
      async () => {
        try {
          await adminUpdateUserKycAndBank(u.id, {
            kycStatus: "verified",
            savedBankDetails: u.savedBankDetails ? {
              ...u.savedBankDetails,
              isVerified: true
            } : undefined
          });
          await logAdminAction(
            "USER_KYC_DIRECTLY_APPROVED",
            `Directly approved KYC & Bank details for user ${u.name} (${u.email})`,
            "SUCCESS",
            u.id
          );
          if (onTriggerNotification) {
            onTriggerNotification(`KYC & Bank details for "${u.name}" have been directly approved!`, "success");
          }
        } catch (err: any) {
          await logAdminAction(
            "USER_KYC_APPROVAL_FAILED",
            `Failed to approve KYC for ${u.name}: ${err.message}`,
            "FAILED",
            u.id
          );
          if (onTriggerNotification) {
            onTriggerNotification(err?.message || "Failed to approve KYC verification.", "error");
          }
        }
      }
    );
  };

  const handleResetUserMobileToPending = (u: UserProfile) => {
    requestPinAuthorization(
      `Reset Mobile Verification for ${u.name}`,
      `Resetting mobile verification status back to PENDING for trader "${u.name}" (${u.email}). Enter your 6-digit Security PIN:`,
      async () => {
        try {
          await updateUserProfileDetails(u.id, u.name, u.email, u.phone, false);
          await logAdminAction(
            "USER_MOBILE_RESET_PENDING",
            `Reset mobile verification status back to PENDING for user ${u.name} (${u.email})`,
            "SUCCESS",
            u.id
          );
          if (onTriggerNotification) {
            onTriggerNotification(`Mobile verification status for "${u.name}" reset back to PENDING!`, "info");
          }
        } catch (err: any) {
          if (onTriggerNotification) {
            onTriggerNotification(err?.message || "Failed to reset mobile status.", "error");
          }
        }
      }
    );
  };

  const handleResetUserKycToPending = (u: UserProfile) => {
    requestPinAuthorization(
      `Reset KYC Status for ${u.name}`,
      `Resetting PAN/Aadhaar & Bank KYC status back to PENDING for trader "${u.name}" (${u.email}). Enter your 6-digit Security PIN:`,
      async () => {
        try {
          await adminUpdateUserKycAndBank(u.id, { kycStatus: "pending" });
          await logAdminAction(
            "USER_KYC_RESET_PENDING",
            `Reset KYC status back to PENDING for user ${u.name} (${u.email})`,
            "SUCCESS",
            u.id
          );
          if (onTriggerNotification) {
            onTriggerNotification(`KYC verification status for "${u.name}" reset back to PENDING!`, "info");
          }
        } catch (err: any) {
          if (onTriggerNotification) {
            onTriggerNotification(err?.message || "Failed to reset KYC status.", "error");
          }
        }
      }
    );
  };

  // Delete & Block User State
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState<boolean>(false);

  const handleToggleBlockUser = async (userToBlock: UserProfile) => {
    const isTargetAdmin =
      userToBlock.isAdmin === true ||
      userToBlock.id === "admin" ||
      userToBlock.id === "user_a" ||
      (userToBlock.email && (userToBlock.email.toLowerCase() === "amaizy1@gmail.com" || userToBlock.email.toLowerCase().includes("admin")));

    if (isTargetAdmin) {
      if (onTriggerNotification) {
        onTriggerNotification("Admin account cannot be blocked! (‡§è‡§°‡§Æ‡§ø‡§® ‡§Ö‡§ï‡§æ‡§â‡§Ç‡§ü ‡§¨‡•ç‡§≤‡•â‡§ï ‡§®‡§π‡•Ä‡§Ç ‡§ï‡§ø‡§Ø‡§æ ‡§ú‡§æ ‡§∏‡§ï‡§§‡§æ)", "error");
      }
      return;
    }

    const nextBlockedState = !userToBlock.isBlocked;
    try {
      await toggleBlockUser(userToBlock.id, nextBlockedState);
      if (onTriggerNotification) {
        onTriggerNotification(
          `User "${userToBlock.name}" is now ${nextBlockedState ? "BLOCKED üö´" : "UNBLOCKED ‚úÖ"}.`,
          nextBlockedState ? "error" : "success"
        );
      }
    } catch (err: any) {
      if (onTriggerNotification) {
        onTriggerNotification(err?.message || "Failed to update block status.", "error");
      }
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;

    const isTargetAdmin =
      userToDelete.isAdmin === true ||
      userToDelete.id === "admin" ||
      userToDelete.id === "user_a" ||
      (userToDelete.email && (userToDelete.email.toLowerCase() === "amaizy1@gmail.com" || userToDelete.email.toLowerCase().includes("admin")));

    if (isTargetAdmin) {
      if (onTriggerNotification) {
        onTriggerNotification("Admin account cannot be deleted! (‡§è‡§°‡§Æ‡§ø‡§® ‡§Ö‡§ï‡§æ‡§â‡§Ç‡§ü ‡§°‡§ø‡§≤‡•Ä‡§ü ‡§®‡§π‡•Ä‡§Ç ‡§ï‡§ø‡§Ø‡§æ ‡§ú‡§æ ‡§∏‡§ï‡§§‡§æ)", "error");
      }
      setUserToDelete(null);
      return;
    }

    setIsDeletingUser(true);
    try {
      await deleteUserProfile(userToDelete.id);
      if (onTriggerNotification) {
        onTriggerNotification(`User profile "${userToDelete.name}" (${userToDelete.email}) permanently deleted.`, "info");
      }
      setUserToDelete(null);
    } catch (err: any) {
      if (onTriggerNotification) {
        onTriggerNotification(err?.message || "Failed to delete user profile.", "error");
      }
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Sync state with selected pool
  React.useEffect(() => {
    if (adminCurrentPool) {
      const expRet = adminCurrentPool.expectedReturn ?? 15;
      setCurrentPoolReturn(expRet.toString());
      setSettlementPercentInput(expRet.toString());
      if (adminCurrentPool.isFreePool) {
        setSettlementAmount((adminCurrentPool.freeRewardAmount ?? 10).toString());
      } else {
        const totalBase = adminCurrentPool.totalCollected > 0 ? adminCurrentPool.totalCollected : adminCurrentPool.targetAmount;
        const initialAmt = (expRet / 100) * totalBase;
        setSettlementAmount(initialAmt.toFixed(2));
      }
    }
  }, [adminCurrentPool?.id, adminCurrentPool?.expectedReturn, adminCurrentPool?.totalCollected, adminCurrentPool?.targetAmount, adminCurrentPool?.isFreePool, adminCurrentPool?.freeRewardAmount]);

  const handlePercentChange = (val: string) => {
    setSettlementPercentInput(val);
    if (!adminCurrentPool) return;
    const pct = parseFloat(val);
    if (!isNaN(pct)) {
      if (adminCurrentPool.isFreePool) {
        setSettlementAmount((adminCurrentPool.freeRewardAmount ?? 10).toString());
      } else {
        const totalBase = adminCurrentPool.totalCollected > 0 ? adminCurrentPool.totalCollected : adminCurrentPool.targetAmount;
        const amt = (pct / 100) * totalBase;
        setSettlementAmount(amt.toFixed(2));
      }
    } else {
      setSettlementAmount("");
    }
  };

  const handleAmountChange = (val: string) => {
    setSettlementAmount(val);
    if (!adminCurrentPool) return;
    const amt = parseFloat(val);
    if (!isNaN(amt)) {
      const totalBase = adminCurrentPool.totalCollected > 0 ? adminCurrentPool.totalCollected : adminCurrentPool.targetAmount;
      if (adminCurrentPool.isFreePool) {
        setSettlementPercentInput("100");
      } else if (totalBase > 0) {
        const pct = (amt / totalBase) * 100;
        setSettlementPercentInput(pct.toFixed(1));
      }
    } else {
      setSettlementPercentInput("");
    }
  };

  const handleUpdateLiveReturn = async () => {
    if (!adminCurrentPool) return;
    setIsUpdatingReturn(true);
    try {
      const parsedVal = parseFloat(currentPoolReturn);
      if (isNaN(parsedVal)) {
        throw new Error("Please enter a valid percentage number.");
      }
      await updatePoolExpectedReturn(adminCurrentPool.id, parsedVal);
      if (onTriggerNotification) {
        onTriggerNotification(`Successfully changed Pool Expected ROI to +${parsedVal}%!`, "success");
      }
    } catch (err: any) {
      if (onTriggerNotification) {
        onTriggerNotification(err.message || "Failed to update return percentage.", "error");
      } else {
        alert(err.message || "Failed to update return percentage.");
      }
    } finally {
      setIsUpdatingReturn(false);
    }
  };

  // Filter requests
  const pendingRequests = walletTransactions.filter(tx => tx.status === "PENDING");

  const handleUpdateConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedTarget = parseInt(targetAmount) || 10;
    const parsedMin = parseInt(minContribution) || 1;
    const parsedMax = parseInt(maxParticipants) || 2;
    const parsedTimeout = parseInt(timeoutSeconds) || 10;
    const parsedExpected = parseFloat(expectedReturn) || 0;

    if (parsedMin > parsedTarget) {
      if (onTriggerNotification) {
        onTriggerNotification("Minimum contribution cannot exceed target amount!", "error");
      } else {
        alert("Minimum contribution cannot exceed target amount!");
      }
      return;
    }
    onConfigChange({
      targetAmount: parsedTarget,
      minContribution: parsedMin,
      maxParticipants: parsedMax,
      timeoutSeconds: parsedTimeout,
      expectedReturn: parsedExpected,
    });
    if (onTriggerNotification) {
      onTriggerNotification("Default parameters updated for new pools!", "success");
    }
  };

  const handleCreatePool = async () => {
    const parsedTarget = isFreePool ? 0 : (parseInt(targetAmount) || 0);
    const parsedMin = isFreePool ? 0 : (parseInt(minContribution) || 0);
    const parsedMax = parseInt(maxParticipants) || 0;
    const parsedTimeout = parseInt(timeoutSeconds) || 0;
    const parsedExpected = parseFloat(expectedReturn) || 0;
    const parsedFreeReward = parseFloat(freeRewardAmount) || 10;

    // Handle Manual Asset Pair vs Preset Asset Pair
    const finalAssetPair = isCustomAssetMode && customAssetPairInput.trim() 
      ? customAssetPairInput.trim() 
      : selectedAssetPair;

    let finalTradingSymbol = isCustomAssetMode && customTradingSymbolInput.trim() 
      ? customTradingSymbolInput.trim() 
      : selectedTradingSymbol;

    if (isCustomAssetMode && !customTradingSymbolInput.trim() && customAssetPairInput.trim()) {
      const cleanSym = customAssetPairInput.toUpperCase().replace(/[^A-Z0-9]/g, "");
      finalTradingSymbol = `BINANCE:${cleanSym}USDT`;
    }

    const formattedSchedule = scheduledTimeInput.trim() || ("Today at " + new Date(Date.now() + Math.max(300, parsedTimeout) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " (5-Min Candle)");

    try {
      if (!isFreePool && parsedMin > parsedTarget) {
        if (onTriggerNotification) {
          onTriggerNotification("Minimum contribution cannot exceed target price!", "error");
        } else {
          alert("Minimum contribution cannot exceed target price!");
        }
        return;
      }
      const poolId = await createNewTradePool(
        parsedTarget,
        parsedMin,
        parsedMax,
        parsedTimeout,
        selectedTradeType,
        parsedExpected,
        isFreePool,
        parsedFreeReward,
        finalAssetPair,
        finalTradingSymbol,
        formattedSchedule,
        "5M",
        selectedRiskLevel
      );
      if (onTriggerNotification) {
        onTriggerNotification(
          isFreePool 
            ? `Custom FREE ${finalAssetPair} Pool launched successfully!` 
            : `Custom ‚Çπ${parsedTarget} ${finalAssetPair} Pool launched successfully!`, 
          "success"
        );
      }
    } catch (err: any) {
      console.error("Error spawning pool:", err);
      if (onTriggerNotification) {
        onTriggerNotification(err.message || "Failed to launch pool.", "error");
      } else {
        alert(err.message || "Failed to launch pool.");
      }
    }
  };

  const handleDeletePool = (poolIdToDelete: string) => {
    const target = allPools.find(p => p.id === poolIdToDelete);
    if (target) {
      setPoolToDeleteModal(target);
    }
  };

  const handleConfirmDeletePool = async () => {
    if (!poolToDeleteModal) return;
    setIsProcessingPoolAction(true);
    try {
      await deleteTradePoolPermanently(poolToDeleteModal.id);
      if (selectedPoolId === poolToDeleteModal.id) {
        setSelectedPoolId(null);
      }
      if (onTriggerNotification) {
        onTriggerNotification("Trade pool deleted permanently!", "success");
      }
      setPoolToDeleteModal(null);
    } catch (err: any) {
      if (onTriggerNotification) {
        onTriggerNotification(err.message || "Failed to delete trade pool", "error");
      }
    } finally {
      setIsProcessingPoolAction(false);
    }
  };

  const handleOpenEditPoolModal = (poolToEdit: TradePool) => {
    setEditingPool(poolToEdit);
    setEditAssetPair(poolToEdit.assetPair || "BTC / USDT (Bitcoin)");
    setEditTradingSymbol(poolToEdit.tradingSymbol || "BINANCE:BTCUSDT");
    setEditTargetAmount((poolToEdit.targetAmount || 0).toString());
    setEditMinContribution((poolToEdit.minContribution || 0).toString());
    setEditExpectedReturn((poolToEdit.expectedReturn ?? 15).toString());
    setEditTradeType(poolToEdit.tradeType || "CALL");
    setEditRiskLevel(poolToEdit.riskLevel || (poolToEdit.isFreePool ? "NO_RISK" : "HIGH"));
    setEditScheduledTime(poolToEdit.scheduledExecutionTime || "");
    setEditFreeRewardAmount((poolToEdit.freeRewardAmount || 10).toString());
  };

  const handleSavePoolEdit = async () => {
    if (!editingPool) return;
    setIsSavingEdit(true);
    try {
      const targetAmountNum = parseFloat(editTargetAmount) || 0;
      const minContribNum = parseFloat(editMinContribution) || 0;
      const expectedReturnNum = parseFloat(editExpectedReturn) || 0;
      const freeRewardNum = parseFloat(editFreeRewardAmount) || 10;

      await updateTradePoolDetails(editingPool.id, {
        assetPair: editAssetPair.trim() || "BTC / USDT (Bitcoin)",
        tradingSymbol: editTradingSymbol.trim() || "BINANCE:BTCUSDT",
        targetAmount: editingPool.isFreePool ? 0 : targetAmountNum,
        minContribution: editingPool.isFreePool ? 0 : minContribNum,
        expectedReturn: expectedReturnNum,
        tradeType: editTradeType,
        riskLevel: editRiskLevel,
        scheduledExecutionTime: editScheduledTime.trim() || undefined,
        freeRewardAmount: editingPool.isFreePool ? freeRewardNum : 0,
      });

      if (onTriggerNotification) {
        onTriggerNotification(`Pool "${editAssetPair}" updated successfully!`, "success");
      }
      setEditingPool(null);
    } catch (err: any) {
      console.error("Error updating pool:", err);
      if (onTriggerNotification) {
        onTriggerNotification(err.message || "Failed to update pool.", "error");
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSettleTrade = async (isProfit: boolean) => {
    if (!adminCurrentPool) return;
    setIsSettling(true);
    setSettleError(null);

    try {
      const parsedAmount = parseFloat(settlementAmount);
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        throw new Error("Please enter a valid positive number for profit/loss.");
      }

      const finalProfitLoss = isProfit ? parsedAmount : -parsedAmount;
      await completeActiveTrade(adminCurrentPool.id, finalProfitLoss);
      if (onTriggerNotification) {
        onTriggerNotification(
          `Successfully settled pool with ‚Çπ${parsedAmount} ${isProfit ? "PROFIT" : "LOSS"}! Payouts distributed proportionally.`,
          "success"
        );
      }
    } catch (err: any) {
      setSettleError(err.message || "Failed to settle trade.");
      if (onTriggerNotification) {
        onTriggerNotification(err.message || "Failed to settle trade.", "error");
      }
    } finally {
      setIsSettling(false);
    }
  };

  const handleCancelAndRefund = () => {
    if (!adminCurrentPool) return;
    setPoolToRefundModal(adminCurrentPool);
  };

  const handleForceActivatePool = async () => {
    if (!adminCurrentPool) return;
    setIsSettling(true);
    try {
      const poolRef = doc(db, "trade_pools", adminCurrentPool.id);
      await updateDoc(poolRef, { status: "ACTIVE" });
      if (onTriggerNotification) {
        onTriggerNotification(`Pool #${adminCurrentPool.id} status manually updated to ACTIVE!`, "success");
      }
    } catch (err: any) {
      if (onTriggerNotification) {
        onTriggerNotification(err.message || "Failed to update pool status", "error");
      }
    } finally {
      setIsSettling(false);
    }
  };

  const handleConfirmCancelAndRefund = async () => {
    if (!poolToRefundModal) return;
    setIsProcessingPoolAction(true);
    try {
      await refundTradePool(poolToRefundModal.id, true);
      if (onTriggerNotification) {
        onTriggerNotification("Trade pool cancelled and all participants fully refunded!", "info");
      }
      setPoolToRefundModal(null);
    } catch (err: any) {
      if (onTriggerNotification) {
        onTriggerNotification(err.message || "Failed to cancel and refund.", "error");
      }
    } finally {
      setIsProcessingPoolAction(false);
    }
  };

  const handleApproveTx = (txId: string) => {
    const req = walletTransactions.find(t => t.id === txId);
    if (!req) return;

    const isOwnerOrSuper = currentAdminAccount?.role === "OWNER" || currentAdminAccount?.role === "SUPER_ADMIN";
    const canApproveDep = hasStaffPermission(currentAdminAccount, "approve_deposits");
    const canApproveWith = hasStaffPermission(currentAdminAccount, "approve_withdrawals");

    if (!isOwnerOrSuper) {
      if (req.type === "DEPOSIT" && !canApproveDep) {
        if (onTriggerNotification) onTriggerNotification("Permission Denied: You do not have permission to approve deposits.", "error");
        return;
      }
      if (req.type === "WITHDRAWAL" && !canApproveWith) {
        if (onTriggerNotification) onTriggerNotification("Permission Denied: You do not have permission to approve withdrawals.", "error");
        return;
      }
    }

    const txTypeStr = req.type;
    const userStr = req.userName || req.userId;
    const amountVal = req.amount;

    if (req.type === "WITHDRAWAL") {
      const targetUser = allUsers.find((u) => u.id === req.userId);
      const userAvail = targetUser ? (targetUser.availableBalance ?? targetUser.balance ?? 0) : 0;
      if (userAvail < amountVal) {
        if (onTriggerNotification) {
          onTriggerNotification(
            `‚ùå Approval Denied: Trader ${userStr}'s available balance (‚Çπ${userAvail.toFixed(2)}) is insufficient for ‚Çπ${amountVal.toFixed(2)} withdrawal request.`,
            "error"
          );
        }
        return;
      }
    }

    requestPinAuthorization(
      `Approve ${txTypeStr}`,
      `Approving ‚Çπ${amountVal} ${txTypeStr.toLowerCase()} for trader ${userStr}. Enter your 6-digit Admin Security PIN:`,
      async () => {
        try {
          await approveWalletRequest(txId);
          await logAdminAction(
            `${txTypeStr}_APPROVED`,
            `Approved ‚Çπ${amountVal} ${txTypeStr.toLowerCase()} request for ${userStr}`,
            "SUCCESS",
            req?.userId,
            amountVal
          );
          if (onTriggerNotification) {
            onTriggerNotification(
              `Successfully APPROVED ‚Çπ${amountVal} ${txTypeStr.toLowerCase()} request for ${userStr}!`,
              "success"
            );
          }
        } catch (err: any) {
          await logAdminAction(
            `${txTypeStr}_APPROVAL_FAILED`,
            `Failed to approve ‚Çπ${amountVal} ${txTypeStr.toLowerCase()} for ${userStr}: ${err.message}`,
            "FAILED",
            req?.userId,
            amountVal
          );
          if (onTriggerNotification) {
            onTriggerNotification(err.message || "Approval failed.", "error");
          }
        }
      }
    );
  };

  const handleRejectTx = (txId: string) => {
    const req = walletTransactions.find(t => t.id === txId);
    if (!req) return;

    const isOwnerOrSuper = currentAdminAccount?.role === "OWNER" || currentAdminAccount?.role === "SUPER_ADMIN";
    const canRejectDep = hasStaffPermission(currentAdminAccount, "reject_deposits");
    const canRejectWith = hasStaffPermission(currentAdminAccount, "reject_withdrawals");

    if (!isOwnerOrSuper) {
      if (req.type === "DEPOSIT" && !canRejectDep) {
        if (onTriggerNotification) onTriggerNotification("Permission Denied: You do not have permission to reject deposits.", "error");
        return;
      }
      if (req.type === "WITHDRAWAL" && !canRejectWith) {
        if (onTriggerNotification) onTriggerNotification("Permission Denied: You do not have permission to reject withdrawals.", "error");
        return;
      }
    }

    const txTypeStr = req.type;
    const userStr = req.userName || req.userId;
    const amountVal = req.amount;

    requestPinAuthorization(
      `Reject ${txTypeStr}`,
      `Rejecting ‚Çπ${amountVal} ${txTypeStr.toLowerCase()} request for ${userStr}. Enter your 6-digit Admin Security PIN:`,
      async () => {
        try {
          await rejectWalletRequest(txId);
          await logAdminAction(
            `${txTypeStr}_REJECTED`,
            `Rejected ‚Çπ${amountVal} ${txTypeStr.toLowerCase()} request for ${userStr}`,
            "SUCCESS",
            req?.userId,
            amountVal
          );
          if (onTriggerNotification) {
            onTriggerNotification(
              `REJECTED ‚Çπ${amountVal} ${txTypeStr.toLowerCase()} request for ${userStr}.`,
              "info"
            );
          }
        } catch (err: any) {
          if (onTriggerNotification) {
            onTriggerNotification(err.message || "Rejection failed.", "error");
          }
        }
      }
    );
  };

  const handleCorrectTxStatus = (txId: string, targetStatus: "APPROVED" | "REJECTED" | "PENDING") => {
    const req = walletTransactions.find(t => t.id === txId);
    if (!req) return;

    const isOwnerOrSuper = currentAdminAccount?.role === "OWNER" || currentAdminAccount?.role === "SUPER_ADMIN";
    if (!isOwnerOrSuper) {
      if (onTriggerNotification) onTriggerNotification("Permission Denied: Only Owner or Super Admin can correct transaction status.", "error");
      return;
    }

    const txTypeStr = req.type;
    const userStr = req.userName || req.userId;
    const amountVal = req.amount;
    const currentStatus = req.status;

    requestPinAuthorization(
      `Correct Status to ${targetStatus}`,
      `Correcting transaction status for ‚Çπ${amountVal} ${txTypeStr} (${userStr}) from ${currentStatus} -> ${targetStatus}. Enter your 6-digit Admin Security PIN:`,
      async () => {
        try {
          await updateWalletRequestStatus(txId, targetStatus);
          await logAdminAction(
            `TX_STATUS_CORRECTED`,
            `Corrected transaction status of ‚Çπ${amountVal} ${txTypeStr} (${txId}) from ${currentStatus} to ${targetStatus} for ${userStr}`,
            "SUCCESS",
            req?.userId,
            amountVal
          );
          if (onTriggerNotification) {
            onTriggerNotification(
              `‚úÖ Corrected status for ${userStr}'s ‚Çπ${amountVal} transaction to ${targetStatus}!`,
              "success"
            );
          }
        } catch (err: any) {
          if (onTriggerNotification) {
            onTriggerNotification(err.message || "Failed to update transaction status.", "error");
          }
        }
      }
    );
  };

  const handleUserBalanceAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingUser) return;

    const isOwnerOrSuper = currentAdminAccount?.role === "OWNER" || currentAdminAccount?.role === "SUPER_ADMIN";
    const canAdjust = hasStaffPermission(currentAdminAccount, "approve_deposits") || hasStaffPermission(currentAdminAccount, "approve_withdrawals");

    if (!isOwnerOrSuper && !canAdjust) {
      if (onTriggerNotification) {
        onTriggerNotification("Permission Denied: You do not have permission to adjust wallet balances.", "error");
      }
      return;
    }

    const amountVal = parseFloat(adjustmentAmount);
    if (isNaN(amountVal) || amountVal === 0) {
      if (onTriggerNotification) {
        onTriggerNotification("Please enter a valid, non-zero numeric amount.", "error");
      }
      return;
    }

    const userName = adjustingUser.name;
    const userId = adjustingUser.id;

    requestPinAuthorization(
      `Adjust Wallet Balance for ${userName}`,
      `Adjusting wallet balance for "${userName}" by ‚Çπ${amountVal} (${adjustmentType}: ${adjustmentReason || "Admin Manual Adjustment"}). Enter your 6-digit Security PIN:`,
      async () => {
        setIsSubmittingAdjustment(true);
        try {
          await adjustUserBalance(userId, amountVal, adjustmentType, adjustmentReason);
          await logAdminAction(
            "USER_BALANCE_ADJUSTED",
            `Adjusted wallet balance for ${userName} by ‚Çπ${amountVal} (${adjustmentType}). Reason: ${adjustmentReason || "N/A"}`,
            "SUCCESS",
            userId,
            amountVal
          );
          if (onTriggerNotification) {
            onTriggerNotification(
              `Successfully adjusted balance for ${userName}: ‚Çπ${amountVal > 0 ? "+" : ""}${amountVal} as ${adjustmentType}!`,
              "success"
            );
          }
          setAdjustingUser(null);
          setAdjustmentAmount("100");
          setAdjustmentReason("");
        } catch (err: any) {
          await logAdminAction(
            "USER_BALANCE_ADJUSTMENT_FAILED",
            `Failed adjusting balance for ${userName}: ${err.message}`,
            "FAILED",
            userId,
            amountVal
          );
          if (onTriggerNotification) {
            onTriggerNotification(err?.message || "Failed to adjust user balance.", "error");
          }
        } finally {
          setIsSubmittingAdjustment(false);
        }
      }
    );
  };

  const hasActivePool = currentPool && (currentPool.status === "WAITING" || currentPool.status === "ACTIVE");

  return (
    <div id="admin-panel" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 py-5 px-1 shadow-xs flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-150 font-display flex items-center gap-2">
            <Settings className="h-5 w-5 text-indigo-500" />
            Admin Command Deck
          </h2>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            System parameter overrides, manual settling, and withdrawal approvals.
          </p>
        </div>
        {pendingRequests.length > 0 && (
          <span className="bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono animate-bounce">
            {pendingRequests.length} pending
          </span>
        )}
      </div>

      {/* Mobile-optimized scrollable pill tabs with icons */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 border-b border-slate-200/80 dark:border-slate-800 text-xs scrollbar-none">
        {canAccessAdminTab("settlement", currentAdminAccount) && (
          <button
            type="button"
            onClick={() => setActiveTab("settlement")}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === "settlement"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Settlement</span>
          </button>
        )}

        {canAccessAdminTab("approvals", currentAdminAccount) && (
          <button
            type="button"
            onClick={() => setActiveTab("approvals")}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer relative ${
              activeTab === "approvals"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            <span>Approvals</span>
            {pendingRequests.length > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px] font-extrabold animate-pulse">
                {pendingRequests.length}
              </span>
            )}
          </button>
        )}

        {canAccessAdminTab("users", currentAdminAccount) && (
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === "users"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Users List</span>
          </button>
        )}

        {canAccessAdminTab("support", currentAdminAccount) && (
          <button
            type="button"
            onClick={() => setActiveTab("support")}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer relative ${
              activeTab === "support"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Support</span>
            {openSupportCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[9px] font-extrabold animate-pulse">
                {openSupportCount}
              </span>
            )}
          </button>
        )}

        {canAccessAdminTab("config", currentAdminAccount) && (
          <button
            type="button"
            onClick={() => setActiveTab("config")}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === "config"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Parameters</span>
          </button>
        )}

        {canAccessAdminTab("solo_trading", currentAdminAccount) && (
          <button
            type="button"
            onClick={() => setActiveTab("solo_trading")}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === "solo_trading"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>Solo Engine</span>
            <span className={`inline-flex items-center justify-center h-4 px-1.5 text-[9px] font-extrabold rounded-full leading-none shrink-0 self-center ${
              soloConfigState.isEnabled ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
            }`}>
              {soloConfigState.isEnabled ? "ON" : "OFF"}
            </span>
          </button>
        )}

        {canAccessAdminTab("logs", currentAdminAccount) && (
          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === "logs"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Tx Logs</span>
          </button>
        )}

        {canAccessAdminTab("archive", currentAdminAccount) && (
          <button
            type="button"
            onClick={() => setActiveTab("archive")}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === "archive"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <Archive className="h-3.5 w-3.5 text-indigo-400" />
            <span>DB Archive</span>
          </button>
        )}

        {canAccessAdminTab("market_monitor", currentAdminAccount) && (
          <button
            type="button"
            onClick={() => setActiveTab("market_monitor")}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === "market_monitor"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <Activity className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            <span>Market Data Monitor</span>
            <span className="inline-flex items-center justify-center h-4 px-1.5 text-[9px] font-extrabold rounded-full leading-none shrink-0 self-center bg-emerald-500 text-white">
              LIVE
            </span>
          </button>
        )}

        {canAccessAdminTab("rbac_staff", currentAdminAccount) && (
          <button
            type="button"
            onClick={() => setActiveTab("rbac_staff")}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer relative ${
              activeTab === "rbac_staff"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
            <span>RBAC & Staff</span>
            <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded-full text-[9px] font-black">
              {adminAccounts.length}
            </span>
          </button>
        )}

        {canAccessAdminTab("limits", currentAdminAccount) && (
          <button
            type="button"
            onClick={() => setActiveTab("limits")}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer relative ${
              activeTab === "limits"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <Sliders className="h-3.5 w-3.5 text-indigo-400" />
            <span>Limits Mgmt</span>
          </button>
        )}

        {canAccessAdminTab("balance_report", currentAdminAccount) && (
          <button
            type="button"
            onClick={() => setActiveTab("balance_report")}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer relative ${
              activeTab === "balance_report"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <Scale className="h-3.5 w-3.5 text-emerald-400" />
            <span>Balance Report</span>
          </button>
        )}
      </div>

      {/* Settlement tab */}
      {activeTab === "settlement" && (
        <div className="flex flex-col gap-4">
          {manageablePools.length > 0 && (
            <div className="flex flex-col gap-1.5 bg-slate-50/50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
              <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                Select Active Pool to Settle / Manage
              </label>
              <select
                value={adminCurrentPool?.id || ""}
                onChange={(e) => setSelectedPoolId(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-indigo-500 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                {manageablePools.map((pool) => (
                  <option key={pool.id} value={pool.id}>
                    [{pool.status}] {pool.tradeType} @ Target ‚Çπ{pool.targetAmount} (ROI: +{pool.expectedReturn ?? 15}%) ‚Äî {pool.id.substring(5)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {adminCurrentPool ? (
            <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-3 animate-fade-in">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Target: ‚Çπ{adminCurrentPool.targetAmount} ‚Ä¢ Type: {adminCurrentPool.tradeType}
                </span>
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                  {adminCurrentPool.status}
                </span>
              </div>

              {/* Real-time editable return percentage for waiting/active pool */}
              <div className="bg-indigo-50/10 dark:bg-indigo-950/10 border border-indigo-100/30 dark:border-indigo-900/20 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Pool Expected Return:</span>
                  <span className="font-extrabold font-mono text-indigo-600 dark:text-indigo-400">+{adminCurrentPool.expectedReturn ?? 15}% ROI</span>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                      Set ROI % (Change in Real-time)
                    </label>
                    <input
                      type="number"
                      value={currentPoolReturn}
                      onChange={(e) => setCurrentPoolReturn(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="w-full mt-1 px-2.5 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                      placeholder="e.g. 20"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isUpdatingReturn}
                    onClick={handleUpdateLiveReturn}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg cursor-pointer disabled:opacity-50 shrink-0 transition-all"
                  >
                    {isUpdatingReturn ? "Saving..." : "Change ROI"}
                  </button>
                </div>
              </div>

              {(adminCurrentPool.status === "ACTIVE" || adminCurrentPool.status === "WAITING") ? (
                <div className="flex flex-col gap-3">
                  {adminCurrentPool.status === "WAITING" && (
                    <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl text-xs text-amber-700 dark:text-amber-300 font-medium flex items-center justify-between gap-2">
                      <span>
                        ‚ö° <strong>Funding Open ({adminCurrentPool.participantsCount}/{adminCurrentPool.maxParticipants} slots ‚Ä¢ Raised ‚Çπ{adminCurrentPool.totalCollected}/‚Çπ{adminCurrentPool.targetAmount}):</strong> You can close and settle this pool early with profit/loss.
                      </span>
                      <button
                        type="button"
                        disabled={isSettling}
                        onClick={handleForceActivatePool}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10.5px] font-bold shrink-0 cursor-pointer shadow-2xs transition-all"
                      >
                        Force Activate
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                        ROI return percentage (%)
                      </label>
                      <div className="relative mt-1">
                        <span className="absolute right-3 top-2 text-slate-400 font-mono text-xs">%</span>
                        <input
                          id="settlement-percent-input"
                          type="number"
                          value={settlementPercentInput}
                          onChange={(e) => handlePercentChange(e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="w-full pl-3 pr-7 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                          placeholder="e.g. 15"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                        Profit / Loss Amount (‚Çπ)
                      </label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-2 text-slate-400 font-mono text-xs">‚Çπ</span>
                        <input
                          id="settlement-amount-input"
                          type="number"
                          value={settlementAmount}
                          onChange={(e) => handleAmountChange(e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                          placeholder="e.g. 15"
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 dark:text-slate-500 italic font-medium">
                    Calculated payout return is <strong className="font-mono text-slate-600 dark:text-slate-350">‚Çπ{settlementAmount}</strong> based on {settlementPercentInput}% ROI on {adminCurrentPool.totalCollected > 0 ? `‚Çπ${adminCurrentPool.totalCollected} total collected funds` : `‚Çπ${adminCurrentPool.targetAmount} pool target`}.
                  </p>

                  {settleError && (
                    <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      {settleError}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      id="settle-profit-btn"
                      disabled={isSettling}
                      onClick={() => handleSettleTrade(true)}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-[0.98] text-white text-xs font-semibold rounded-lg transition-all duration-75 cursor-pointer text-center disabled:opacity-50"
                    >
                      Win (+‚Çπ{settlementAmount} / +{settlementPercentInput}%)
                    </button>
                    <button
                      id="settle-loss-btn"
                      disabled={isSettling}
                      onClick={() => handleSettleTrade(false)}
                      className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 active:scale-[0.98] text-white text-xs font-semibold rounded-lg transition-all duration-75 cursor-pointer text-center disabled:opacity-50"
                    >
                      Loss (-‚Çπ{settlementAmount} / -{settlementPercentInput}%)
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                  Trade is settled or closed ({adminCurrentPool.status}).
                </p>
              )}

              {/* Edit, Force Cancel / Refund & Permanent Delete options */}
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <button
                  type="button"
                  disabled={isSettling}
                  onClick={() => handleOpenEditPoolModal(adminCurrentPool)}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-bold rounded-lg transition-all duration-75 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit Pool
                </button>

                <button
                  id="cancel-refund-btn"
                  disabled={isSettling}
                  onClick={handleCancelAndRefund}
                  className="flex-1 py-2 border border-dashed border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/20 active:scale-[0.98] text-amber-600 dark:text-amber-400 text-xs font-semibold rounded-lg transition-all duration-75 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Ban className="h-3.5 w-3.5" />
                  Cancel & Refund
                </button>

                <button
                  id="delete-pool-btn"
                  disabled={isSettling}
                  onClick={() => handleDeletePool(adminCurrentPool.id)}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs font-bold rounded-lg transition-all duration-75 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Pool
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <span className="text-xs text-slate-400 italic">No pool is currently active or waiting.</span>
            </div>
          )}

          {/* List of All Pools with Edit & Delete Options */}
          {allPools.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-950/30 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 flex flex-col gap-2">
              <h4 className="text-[11px] font-extrabold uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center justify-between">
                <span>All Active & Historical Pools ({allPools.length})</span>
                <span className="text-[9.5px] text-slate-400 font-normal">Admin Edit / Delete / Manage</span>
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {allPools.map((p) => (
                  <div key={p.id} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg flex items-center justify-between gap-2 text-xs">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                          {p.assetPair || "BTC/USDT"}
                        </span>
                        <span className={`px-1.5 py-0.2 text-[9px] font-extrabold rounded font-mono uppercase ${
                          p.status === "ACTIVE" ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" :
                          p.status === "WAITING" ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" :
                          p.status === "COMPLETED" ? "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400" :
                          "bg-slate-500/20 text-slate-500"
                        }`}>
                          {p.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Target: ‚Çπ{p.targetAmount} ‚Ä¢ Type: {p.tradeType} ‚Ä¢ Return: {p.expectedReturn ?? 15}%
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditPoolModal(p)}
                        className="p-1.5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-md transition-all cursor-pointer"
                        title="Edit Pool Details"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeletePool(p.id)}
                        className="p-1.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white rounded-md transition-all cursor-pointer"
                        title="Delete this Pool"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Always-visible custom pool creation section */}
          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-2 flex flex-col gap-3">
            <div>
              <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="h-4 w-4 text-emerald-500" />
                Launch New Custom Trade Pool
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                Create a customizable CALL or PUT contract pool with custom asset names, price targets & payout ratios.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Sponsor Free Pool checkbox */}
              <div className="col-span-2 bg-indigo-50/40 dark:bg-indigo-950/20 p-2.5 rounded-xl border border-indigo-100/40 dark:border-indigo-900/30 flex items-start gap-2.5">
                <input
                  id="admin-isfreepool-checkbox"
                  type="checkbox"
                  checked={isFreePool}
                  onChange={(e) => setIsFreePool(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-indigo-600 border-slate-300 dark:border-slate-700 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <div className="flex flex-col gap-0.5 select-none cursor-pointer">
                  <label htmlFor="admin-isfreepool-checkbox" className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200">
                    Sponsor FREE Pool Mode (‡§´‡•ç‡§∞‡•Ä ‡§™‡•Ç‡§≤ ‡§¨‡§®‡§æ‡§è‡§Å)
                  </label>
                  <p className="text-[9.5px] text-slate-500 dark:text-slate-400">
                    Users can participate for free (‚Çπ0 investment) and earn real cash rewards if outlook succeeds!
                  </p>
                </div>
              </div>

              {/* Trading Asset Pair Selection: Preset vs Manual Input */}
              <div className="col-span-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider">
                    ü™ô Trading Asset Pair (‡§Æ‡•à‡§®‡•ç‡§Ø‡•Å‡§Ö‡§≤ ‡§Ø‡§æ ‡§≤‡§ø‡§∏‡•ç‡§ü ‡§∏‡•á ‡§ö‡•Å‡§®‡•á‡§Ç)
                  </label>
                  <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setIsCustomAssetMode(false)}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        !isCustomAssetMode ? "bg-indigo-600 text-white shadow-2xs" : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      Preset List
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCustomAssetMode(true)}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        isCustomAssetMode ? "bg-indigo-600 text-white shadow-2xs" : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      ‚úçÔ∏è Type Custom Asset (‡§Æ‡•à‡§®‡•ç‡§Ø‡•Å‡§Ö‡§≤)
                    </button>
                  </div>
                </div>

                {!isCustomAssetMode ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <select
                        value={selectedTradingSymbol}
                        onChange={(e) => {
                          const selected = POPULAR_TRADING_PAIRS.find(p => p.symbol === e.target.value);
                          if (selected) {
                            setSelectedTradingSymbol(selected.symbol);
                            setSelectedAssetPair(selected.pair);
                          }
                        }}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                      >
                        {POPULAR_TRADING_PAIRS.map(p => (
                          <option key={p.symbol} value={p.symbol}>
                            {p.pair} [{p.category}]
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={scheduledTimeInput}
                        onChange={(e) => setScheduledTimeInput(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                        placeholder="Schedule: e.g. Today at 02:30 PM (or blank)"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-1">
                      <label className="block text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-0.5">
                        Custom Asset Pair Name
                      </label>
                      <input
                        type="text"
                        value={customAssetPairInput}
                        onChange={(e) => setCustomAssetPairInput(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                        placeholder="e.g. BANKNIFTY, USD/INR, GOLD"
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-0.5">
                        TradingView Symbol (Optional)
                      </label>
                      <input
                        type="text"
                        value={customTradingSymbolInput}
                        onChange={(e) => setCustomTradingSymbolInput(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                        placeholder="e.g. NSE:BANKNIFTY, FX_IDC:USDINR"
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-0.5">
                        Scheduled Execution Time
                      </label>
                      <input
                        type="text"
                        value={scheduledTimeInput}
                        onChange={(e) => setScheduledTimeInput(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                        placeholder="e.g. Today at 03:00 PM"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-1">
                  Select Market Outlook Type
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTradeType("CALL")}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      selectedTradeType === "CALL"
                        ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-extrabold"
                        : "border-slate-200 dark:border-slate-800 text-slate-400"
                    }`}
                  >
                    CALL (Buy)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTradeType("PUT")}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      selectedTradeType === "PUT"
                        ? "bg-rose-50 dark:bg-rose-950/20 border-rose-500 text-rose-700 dark:text-rose-400 font-extrabold"
                        : "border-slate-200 dark:border-slate-800 text-slate-400"
                    }`}
                  >
                    PUT (Sell)
                  </button>
                </div>
              </div>

              {/* Risk Level Selector */}
              <div className="col-span-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 flex flex-col gap-1.5">
                <label className="block text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-300 tracking-wider">
                  ‚ö†Ô∏è Select Pool Risk Level (‡§ú‡•ã‡§ñ‡§ø‡§Æ ‡§∏‡•ç‡§§‡§∞)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedRiskLevel("NO_RISK")}
                    className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      selectedRiskLevel === "NO_RISK"
                        ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-black shadow-2xs"
                        : "border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    <span>No Risk (0%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRiskLevel("LOW")}
                    className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      selectedRiskLevel === "LOW"
                        ? "bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-700 dark:text-sky-300 font-black shadow-2xs"
                        : "border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                    }`}
                  >
                    <Shield className="h-3.5 w-3.5 text-sky-500" />
                    <span>Low Risk</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRiskLevel("MEDIUM")}
                    className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      selectedRiskLevel === "MEDIUM"
                        ? "bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-700 dark:text-amber-300 font-black shadow-2xs"
                        : "border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                    }`}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    <span>Medium Risk</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRiskLevel("HIGH")}
                    className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      selectedRiskLevel === "HIGH"
                        ? "bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-300 font-black shadow-2xs"
                        : "border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                    }`}
                  >
                    <Zap className="h-3.5 w-3.5 text-rose-500" />
                    <span>High Risk</span>
                  </button>
                </div>
              </div>

              {isFreePool ? (
                <>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                      Free Win Reward Amount (‚Çπ)
                    </label>
                    <input
                      type="number"
                      value={freeRewardAmount}
                      onChange={(e) => setFreeRewardAmount(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="mt-1 w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                      placeholder="e.g. 10"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                      Timeout (Seconds)
                    </label>
                    <input
                      type="number"
                      value={timeoutSeconds}
                      onChange={(e) => setTimeoutSeconds(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="mt-1 w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                      placeholder="e.g. 120"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                      Max Participants
                    </label>
                    <input
                      type="number"
                      value={maxParticipants}
                      onChange={(e) => setMaxParticipants(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="mt-1 w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                      placeholder="e.g. 5"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                      Target Price / Pool Amount (‚Çπ)
                    </label>
                    <input
                      type="number"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="mt-1 w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                      placeholder="e.g. 100"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                      Set Expected Return ROI (%)
                    </label>
                    <div className="relative mt-1">
                      <span className="absolute right-3 top-2 text-slate-400 font-mono text-xs">%</span>
                      <input
                        id="admin-expected-return-input"
                        type="number"
                        value={expectedReturn}
                        onChange={(e) => setExpectedReturn(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                        placeholder="e.g. 15"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                      Min Contribution (‚Çπ)
                    </label>
                    <input
                      type="number"
                      value={minContribution}
                      onChange={(e) => setMinContribution(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="mt-1 w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                      placeholder="e.g. 10"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                      Timeout (Seconds)
                    </label>
                    <input
                      type="number"
                      value={timeoutSeconds}
                      onChange={(e) => setTimeoutSeconds(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="mt-1 w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                      placeholder="e.g. 120"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                      Max Participants
                    </label>
                    <input
                      type="number"
                      value={maxParticipants}
                      onChange={(e) => setMaxParticipants(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="mt-1 w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                      placeholder="e.g. 5"
                    />
                  </div>
                </>
              )}
            </div>

            <button
              id="spawn-pool-btn"
              onClick={handleCreatePool}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-850 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all duration-75 flex items-center justify-center gap-1.5 cursor-pointer mt-1"
            >
              <Plus className="h-4 w-4" />
              {isFreePool 
                ? `Launch New FREE Pool (${selectedTradeType} @ ‚Çπ${freeRewardAmount} Reward)`
                : `Launch New ‚Çπ${targetAmount} Pool (${selectedTradeType} @ +${expectedReturn}% ROI)`}
            </button>
          </div>
        </div>
      )}

      {/* Approvals tab */}
      {activeTab === "approvals" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <h3 className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              Deposit & Withdrawal Approvals Management
            </h3>

            {/* Approval Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setApprovalFilter("PENDING")}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  approvalFilter === "PENDING"
                    ? "bg-amber-500 text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Pending ({pendingRequests.length})
              </button>
              <button
                type="button"
                onClick={() => setApprovalFilter("APPROVED")}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  approvalFilter === "APPROVED"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Approved
              </button>
              <button
                type="button"
                onClick={() => setApprovalFilter("REJECTED")}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  approvalFilter === "REJECTED"
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Rejected
              </button>
              <button
                type="button"
                onClick={() => setApprovalFilter("ALL")}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  approvalFilter === "ALL"
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                All ({walletTransactions.filter(t => t.type === "DEPOSIT" || t.type === "WITHDRAWAL").length})
              </button>
            </div>
          </div>

          {(() => {
            const displayRequests = walletTransactions.filter(tx => {
              if (tx.type !== "DEPOSIT" && tx.type !== "WITHDRAWAL") return false;
              if (approvalFilter === "PENDING") return tx.status === "PENDING";
              if (approvalFilter === "APPROVED") return tx.status === "APPROVED";
              if (approvalFilter === "REJECTED") return tx.status === "REJECTED";
              return true;
            });

            if (displayRequests.length === 0) {
              return (
                <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">No {approvalFilter.toLowerCase()} requests found.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Users can submit requests via their wallet panel.</p>
                </div>
              );
            }

            return (
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                {displayRequests.map((req) => {
                  const reqUser = allUsers.find((u) => u.id === req.userId);
                  const reqUserAvail = reqUser ? (reqUser.availableBalance ?? reqUser.balance ?? 0) : null;
                  const isInsufficientForWith = req.type === "WITHDRAWAL" && req.status === "PENDING" && reqUserAvail !== null && reqUserAvail < req.amount;

                  return (
                  <div
                    key={req.id}
                    className="p-3 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded font-mono ${
                          req.type === "DEPOSIT"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-400"
                        }`}>
                          {req.type}
                        </span>
                        <strong className="text-slate-800 dark:text-slate-300 font-mono">‚Çπ{req.amount}</strong>

                        {/* Status Badge */}
                        {req.status === "APPROVED" ? (
                          <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded text-[8.5px] font-bold inline-flex items-center gap-0.5">
                            <Check className="h-2.5 w-2.5" /> APPROVED
                          </span>
                        ) : req.status === "REJECTED" ? (
                          <span className="bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 px-1.5 py-0.2 rounded text-[8.5px] font-bold inline-flex items-center gap-0.5">
                            <X className="h-2.5 w-2.5" /> REJECTED
                          </span>
                        ) : (
                          <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-1.5 py-0.2 rounded text-[8.5px] font-bold inline-flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" /> PENDING
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 font-semibold">
                        {req.userName} ({req.userEmail})
                      </span>

                      {/* Request Timestamp: Date and Time */}
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1">
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                          <Calendar className="h-3 w-3 text-indigo-500 shrink-0" />
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {req.createdAt ? new Date(req.createdAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                          <Clock className="h-3 w-3 text-indigo-500 shrink-0" />
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {req.createdAt ? new Date(req.createdAt).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : "N/A"}
                          </span>
                        </div>
                        {req.updatedAt && req.status !== "PENDING" && (
                          <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono bg-slate-100/80 dark:bg-slate-900/60 px-1.5 py-0.5 rounded">
                            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                            <span>Actioned: {new Date(req.updatedAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })} {new Date(req.updatedAt).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                          </div>
                        )}
                      </div>
                      {isInsufficientForWith && (
                        <div className="mt-1 px-2 py-0.5 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800/80 rounded text-[9.5px] text-rose-700 dark:text-rose-300 font-bold flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-rose-500 shrink-0" />
                          <span>Insufficient Trader Balance: ‚Çπ{reqUserAvail?.toFixed(2)} available</span>
                        </div>
                      )}
                      {req.rejectionReason && (
                        <div className="mt-1 text-[9.5px] bg-rose-50/70 dark:bg-rose-950/50 border border-rose-200/50 dark:border-rose-900/50 px-2 py-1 rounded text-rose-700 dark:text-rose-300 font-semibold">
                          Reason: {req.rejectionReason}
                        </div>
                      )}
                      {req.withdrawalData && Object.keys(req.withdrawalData).length > 0 ? (
                        <div className="mt-1.5 p-2 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 rounded-lg text-[10px] flex flex-col gap-1">
                          <span className="font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 text-[9px]">
                            Withdrawal Payout Details:
                          </span>
                          <div className="grid grid-cols-1 gap-1 text-slate-800 dark:text-slate-200 font-sans">
                            {Object.entries(req.withdrawalData).map(([k, v]) => {
                              if (!v) return null;
                              const fieldDef = adminWithdrawalFields.find(f => f.id === k);
                              const label = fieldDef ? fieldDef.label : k;
                              return (
                                <div key={k} className="bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 rounded border border-emerald-200/50 dark:border-emerald-800/50 flex items-center justify-between gap-2">
                                  <span className="font-bold text-slate-500 dark:text-slate-400">{label}:</span>
                                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{v}</span>
                                </div>
                              );
                            })}
                          </div>
                          {req.txDetails && req.txDetails.includes("Notes:") && (
                            <div className="mt-0.5 text-[9.5px] text-slate-600 dark:text-slate-400 italic">
                              {req.txDetails.split("Notes:")[1]}
                            </div>
                          )}
                        </div>
                      ) : req.txDetails ? (
                        <div className="mt-1.5 text-[10px] bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100/20 dark:border-indigo-900/20 px-2 py-1.5 rounded-lg text-indigo-700 dark:text-indigo-400 font-semibold max-w-[280px] break-all">
                          Details: <span className="text-slate-700 dark:text-slate-300 font-normal">{req.txDetails}</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1">
                      {req.status === "PENDING" && (
                        <>
                          {((req.type === "DEPOSIT" && hasStaffPermission(currentAdminAccount, "approve_deposits")) ||
                            (req.type === "WITHDRAWAL" && hasStaffPermission(currentAdminAccount, "approve_withdrawals"))) && (
                            <button
                              onClick={() => handleApproveTx(req.id)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-0.5 shadow-2xs"
                              title="Approve request"
                            >
                              <Check className="h-3 w-3" /> Approve
                            </button>
                          )}
                          {((req.type === "DEPOSIT" && hasStaffPermission(currentAdminAccount, "reject_deposits")) ||
                            (req.type === "WITHDRAWAL" && hasStaffPermission(currentAdminAccount, "reject_withdrawals"))) && (
                            <button
                              onClick={() => handleRejectTx(req.id)}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-0.5 shadow-2xs"
                              title="Reject request"
                            >
                              <X className="h-3 w-3" /> Reject
                            </button>
                          )}
                        </>
                      )}

                      {req.status === "APPROVED" && (
                        <>
                          <button
                            onClick={() => handleCorrectTxStatus(req.id, "PENDING")}
                            className="px-2 py-1 bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60 rounded-lg text-[9.5px] font-extrabold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                            title="Reset status back to Pending"
                          >
                            <RefreshCw className="h-2.5 w-2.5" /> Reset Pending
                          </button>
                          <button
                            onClick={() => handleCorrectTxStatus(req.id, "REJECTED")}
                            className="px-2 py-1 bg-rose-100 dark:bg-rose-950/80 hover:bg-rose-200 text-rose-800 dark:text-rose-300 border border-rose-300/60 dark:border-rose-800/60 rounded-lg text-[9.5px] font-extrabold transition-all cursor-pointer flex items-center gap-1"
                            title="Change status to Rejected"
                          >
                            <X className="h-2.5 w-2.5" /> Reject
                          </button>
                        </>
                      )}

                      {req.status === "REJECTED" && (
                        <>
                          <button
                            onClick={() => handleCorrectTxStatus(req.id, "PENDING")}
                            className="px-2 py-1 bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60 rounded-lg text-[9.5px] font-extrabold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                            title="Reset status back to Pending"
                          >
                            <RefreshCw className="h-2.5 w-2.5" /> Reset Pending
                          </button>
                          <button
                            onClick={() => handleCorrectTxStatus(req.id, "APPROVED")}
                            className="px-2 py-1 bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800/60 rounded-lg text-[9.5px] font-extrabold transition-all cursor-pointer flex items-center gap-1"
                            title="Change status to Approved"
                          >
                            <Check className="h-2.5 w-2.5" /> Approve
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Parameters tab */}
      {activeTab === "config" && (
        <div className="flex flex-col gap-6">
          <form onSubmit={handleUpdateConfig} className="flex flex-col gap-3">
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Default Trade Pool Parameters
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  Target (‚Çπ Min Pool)
                </label>
                <input
                  id="admin-target-amount"
                  type="number"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="mt-1 w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  Min Contribution
                </label>
                <input
                  id="admin-min-contribution"
                  type="number"
                  value={minContribution}
                  onChange={(e) => setMinContribution(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="mt-1 w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  Max Participants
                </label>
                <input
                  id="admin-max-participants"
                  type="number"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="mt-1 w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  Timeout (seconds)
                </label>
                <input
                  id="admin-timeout-seconds"
                  type="number"
                  value={timeoutSeconds}
                  onChange={(e) => setTimeoutSeconds(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="mt-1 w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  Default Expected Return ROI (%)
                </label>
                <input
                  id="admin-expected-return"
                  type="number"
                  value={expectedReturn}
                  onChange={(e) => setExpectedReturn(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="mt-1 w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                />
              </div>
            </div>

            <button
              id="save-config-btn"
              type="submit"
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Apply Configurations
            </button>
          </form>

          {/* Platform Main Title & Taglines Branding Management */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <span>Platform Title & Taglines (Custom Branding)</span>
                    <span className="text-[9px] px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-mono font-extrabold rounded-full border border-indigo-200/50">
                      Live Sync
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Customize the App Title, Header Tagline, and Login Screen Tagline shown across all user devices.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetBranding}
                disabled={isSavingBranding}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                Reset Defaults
              </button>
            </div>

            <form onSubmit={handleSaveBranding} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Platform Main Title
                  </label>
                  <input
                    type="text"
                    id="admin-branding-title-input"
                    value={adminBrandingInput.appTitle}
                    onChange={(e) => setAdminBrandingInput(prev => ({ ...prev, appTitle: e.target.value }))}
                    placeholder="e.g. FTP Trade or Shared Trade Pool"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Shown in header, browser tab & login screen</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Header Sub-Tagline
                  </label>
                  <input
                    type="text"
                    id="admin-branding-tagline-input"
                    value={adminBrandingInput.appTagline}
                    onChange={(e) => setAdminBrandingInput(prev => ({ ...prev, appTagline: e.target.value }))}
                    placeholder="e.g. Fractional Trade Platform"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Small uppercase badge in top header</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Login Screen Tagline
                  </label>
                  <input
                    type="text"
                    id="admin-branding-login-tagline-input"
                    value={adminBrandingInput.loginTagline || ""}
                    onChange={(e) => setAdminBrandingInput(prev => ({ ...prev, loginTagline: e.target.value }))}
                    placeholder="e.g. Sandbox Trading Terminal"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Subtitle on Login & Register screen</span>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Live Preview:</div>
                  <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                    <div className="bg-indigo-600 p-1.5 rounded-md text-white">
                      <TrendingUp className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100 leading-tight">
                        {adminBrandingInput.appTitle || "Shared Trade Pool"}
                      </span>
                      <span className="text-[8px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">
                        {adminBrandingInput.appTagline || "Fractional Trade Platform"}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingBranding}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer shrink-0 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{isSavingBranding ? "Saving..." : "Save Title & Taglines"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Platform Footer Text & Branding Management */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <span>Platform Footer & Branding Text</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Customize the copyright, platform slogan, and engine metadata displayed at the bottom of all user screens in real time.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetFooterText}
                disabled={isSavingFooter}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                Reset Default
              </button>
            </div>

            <form onSubmit={handleSaveFooterText} className="flex flex-col gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  Footer Branding Text
                </label>
                <textarea
                  id="admin-footer-text-input"
                  value={adminFooterInput}
                  onChange={(e) => setAdminFooterInput(e.target.value)}
                  rows={2}
                  placeholder="2026 Shared Trade Pool Manager ‚Äî Powered by Multi-User Sandboxed Simulation Engine & Secure Real-Time Firebase Ledger."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 dark:text-slate-200 resize-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">
                  Preview: {adminFooterInput || DEFAULT_FOOTER_TEXT}
                </span>
                <button
                  type="submit"
                  disabled={isSavingFooter}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {isSavingFooter ? "Saving..." : "Save Footer Text"}
                </button>
              </div>
            </form>
          </div>

          {/* Admin Deposit Payment Gateways Management */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-4 border-t">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <QrCode className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <span>Manage Payment Gateways</span>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-mono font-extrabold rounded-full border border-emerald-200/50">
                      {activeGatewaysList.filter(g => g.isActive !== false).length} / {activeGatewaysList.length} Active
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Hide options if you don't want to accept deposits from users or toggle gateways active/hidden.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleAllGateways}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0 border ${
                    activeGatewaysList.some((g) => g.isActive !== false)
                      ? "bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200/50"
                      : "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200/50"
                  }`}
                  title={activeGatewaysList.some((g) => g.isActive !== false) ? "Hide all payment options to block user deposits" : "Enable all payment options"}
                >
                  <Power className="h-3.5 w-3.5" />
                  <span>{activeGatewaysList.some((g) => g.isActive !== false) ? "Disable All (Stop Deposits)" : "Enable All Options"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddGatewayModalOpen(true)}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Create Gateway</span>
                </button>
              </div>
            </div>

            {/* List of Configured Payment Gateways */}
            <div className="flex flex-col gap-3">
              {activeGatewaysList.map((gw, idx) => {
                const gwUpiPayString = `upi://pay?pa=${gw.upiId}&pn=${encodeURIComponent(gw.accountName)}&cu=INR`;
                const gwQrUrl = gw.qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(gwUpiPayString)}`;
                const isGwActive = gw.isActive !== false;

                return (
                  <div
                    key={gw.id || idx}
                    className={`p-3.5 border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs transition-all ${
                      isGwActive
                        ? "bg-slate-50 dark:bg-slate-950/80 border-slate-200/80 dark:border-slate-800"
                        : "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40 opacity-85"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="bg-white p-1.5 rounded-xl border border-slate-200 shrink-0 shadow-2xs relative">
                        <img
                          src={gwQrUrl}
                          alt="Gateway QR"
                          className={`w-14 h-14 object-contain rounded ${!isGwActive ? "grayscale opacity-50" : ""}`}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(gwUpiPayString)}`;
                          }}
                        />
                      </div>

                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 font-display">
                            {gw.title || `${gw.bankName} Gateway`}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-mono font-bold rounded">
                            {gw.bankName}
                          </span>
                          <span
                            className={`text-[9px] px-2 py-0.2 font-mono font-extrabold rounded-full flex items-center gap-1 ${
                              isGwActive
                                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50"
                                : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300/50"
                            }`}
                          >
                            {isGwActive ? (
                              <>
                                <Eye className="h-2.5 w-2.5" /> VISIBLE TO USERS
                              </>
                            ) : (
                              <>
                                <EyeOff className="h-2.5 w-2.5" /> HIDDEN FROM USERS
                              </>
                            )}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-[10.5px]">
                          <div>
                            <span className="text-slate-400">UPI ID: </span>
                            <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400">{gw.upiId}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Holder: </span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{gw.accountName}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">A/C No: </span>
                            <span className="font-mono text-slate-800 dark:text-slate-200">{gw.accountNumber || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">IFSC: </span>
                            <span className="font-mono text-slate-800 dark:text-slate-200">{gw.ifscCode || "N/A"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleGatewayStatus(gw, idx)}
                        className={`px-2.5 py-1.5 text-[10.5px] font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 border ${
                          isGwActive
                            ? "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/60"
                            : "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60"
                        }`}
                        title={isGwActive ? "Hide this payment option from user deposit tab" : "Make this payment option visible to users"}
                      >
                        {isGwActive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        <span>{isGwActive ? "Hide Option" : "Show Option"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLoadGatewayToEditor(gw)}
                        className="px-2.5 py-1.5 bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10.5px] font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>Load Editor</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setGatewayToDelete(gw)}
                        disabled={activeGatewaysList.length <= 1}
                        title={activeGatewaysList.length <= 1 ? "At least one gateway must remain in list" : "Delete Gateway"}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-600 dark:text-rose-400 rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border border-rose-200/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Payment Gateway Details & Dynamic Field Editor */}
            <div className="mt-2 pt-3 border-t border-slate-200/80 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <span className="text-[10px] uppercase font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider block">
                    Payment Gateway Details & Input Fields Editor
                  </span>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                    Change input field names/labels, edit payment values, add custom fields (e.g. SWIFT Code, Wallet Address), or delete fields.
                  </p>
                </div>
                {loadedGwId && (
                  <span className="self-start sm:self-auto text-[9.5px] font-bold font-mono px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 border border-indigo-200/50 rounded-lg">
                    Editing ID: {loadedGwId}
                  </span>
                )}
              </div>

              <form onSubmit={handleSavePaymentDetails} className="flex flex-col gap-4 text-xs">
                {/* Standard Payment Gateway Fields with Editable Field Names */}
                <div className="bg-slate-50/60 dark:bg-slate-950/40 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col gap-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Core Gateway Input Fields (Editable Field Names & Values)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* UPI ID Field */}
                    <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl flex flex-col gap-1.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-1">
                        <label className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                          Field Name / Label
                        </label>
                        <span className="text-[9px] font-mono font-bold text-indigo-600 dark:text-indigo-400">UPI Field</span>
                      </div>
                      <input
                        type="text"
                        value={payFieldLabels.upiId || "UPI ID"}
                        onChange={(e) => handleUpdatePayFieldLabel("upiId", e.target.value)}
                        className="px-2 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                        placeholder="Field Label (e.g. UPI ID or GPay VPA)"
                      />
                      <label className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">
                        Field Value
                      </label>
                      <input
                        type="text"
                        value={payUpiId}
                        onChange={(e) => setPayUpiId(e.target.value)}
                        className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                        placeholder="e.g. 7458038680@hdfc"
                      />
                    </div>

                    {/* Account Holder Name Field */}
                    <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl flex flex-col gap-1.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-1">
                        <label className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                          Field Name / Label
                        </label>
                        <span className="text-[9px] font-mono font-bold text-indigo-600 dark:text-indigo-400">Name Field</span>
                      </div>
                      <input
                        type="text"
                        value={payFieldLabels.accountName || "Account Holder Name"}
                        onChange={(e) => handleUpdatePayFieldLabel("accountName", e.target.value)}
                        className="px-2 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                        placeholder="Field Label (e.g. Account Holder Name)"
                      />
                      <label className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">
                        Field Value
                      </label>
                      <input
                        type="text"
                        value={payAccountName}
                        onChange={(e) => setPayAccountName(e.target.value)}
                        className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                        placeholder="e.g. MUBARAK ABDUL AZIZ"
                      />
                    </div>

                    {/* Bank Name Field */}
                    <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl flex flex-col gap-1.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-1">
                        <label className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                          Field Name / Label
                        </label>
                        <span className="text-[9px] font-mono font-bold text-indigo-600 dark:text-indigo-400">Bank Field</span>
                      </div>
                      <input
                        type="text"
                        value={payFieldLabels.bankName || "Bank Name"}
                        onChange={(e) => handleUpdatePayFieldLabel("bankName", e.target.value)}
                        className="px-2 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                        placeholder="Field Label (e.g. Bank Name)"
                      />
                      <label className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">
                        Field Value
                      </label>
                      <input
                        type="text"
                        value={payBankName}
                        onChange={(e) => setPayBankName(e.target.value)}
                        className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                        placeholder="e.g. HDFC BANK"
                      />
                    </div>

                    {/* Account Number Field */}
                    <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl flex flex-col gap-1.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-1">
                        <label className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                          Field Name / Label
                        </label>
                        <span className="text-[9px] font-mono font-bold text-indigo-600 dark:text-indigo-400">A/C Number Field</span>
                      </div>
                      <input
                        type="text"
                        value={payFieldLabels.accountNumber || "Account Number"}
                        onChange={(e) => handleUpdatePayFieldLabel("accountNumber", e.target.value)}
                        className="px-2 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                        placeholder="Field Label (e.g. Account Number)"
                      />
                      <label className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">
                        Field Value
                      </label>
                      <input
                        type="text"
                        value={payAccountNumber}
                        onChange={(e) => setPayAccountNumber(e.target.value)}
                        className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                        placeholder="e.g. 50100305958655"
                      />
                    </div>

                    {/* IFSC Code Field */}
                    <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl flex flex-col gap-1.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-1">
                        <label className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                          Field Name / Label
                        </label>
                        <span className="text-[9px] font-mono font-bold text-indigo-600 dark:text-indigo-400">IFSC / Code Field</span>
                      </div>
                      <input
                        type="text"
                        value={payFieldLabels.ifscCode || "IFSC Code"}
                        onChange={(e) => handleUpdatePayFieldLabel("ifscCode", e.target.value)}
                        className="px-2 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                        placeholder="Field Label (e.g. IFSC Code or SWIFT)"
                      />
                      <label className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">
                        Field Value
                      </label>
                      <input
                        type="text"
                        value={payIfscCode}
                        onChange={(e) => setPayIfscCode(e.target.value)}
                        className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                        placeholder="e.g. HDFC0005494"
                      />
                    </div>

                    {/* Branch & Account Type Field */}
                    <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl flex flex-col gap-1.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-1">
                        <label className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                          Field Name / Label
                        </label>
                        <span className="text-[9px] font-mono font-bold text-indigo-600 dark:text-indigo-400">Branch/Type Field</span>
                      </div>
                      <input
                        type="text"
                        value={payFieldLabels.branchAndType || "Branch & Account Type"}
                        onChange={(e) => handleUpdatePayFieldLabel("branchAndType", e.target.value)}
                        className="px-2 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                        placeholder="Field Label (e.g. Branch & Account Type)"
                      />
                      <label className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">
                        Field Value
                      </label>
                      <input
                        type="text"
                        value={payBranchAndType}
                        onChange={(e) => setPayBranchAndType(e.target.value)}
                        className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                        placeholder="e.g. MIHINPURWA ‚Ä¢ SAVING"
                      />
                    </div>

                    {/* QR Code Image URL */}
                    <div className="sm:col-span-2 p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl flex flex-col gap-1.5 shadow-2xs">
                      <label className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                        Custom QR Code Image URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={payQrCodeUrl}
                        onChange={(e) => setPayQrCodeUrl(e.target.value)}
                        className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                        placeholder="https://example.com/my-upi-qr.jpg (Optional)"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Custom Dynamic Input Fields Section */}
                <div className="bg-indigo-50/40 dark:bg-indigo-950/20 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-[10.5px] font-extrabold uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                        Additional Dynamic Custom Input Fields ({payCustomFields.length})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPayCustomField}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Input Field</span>
                    </button>
                  </div>

                  {payCustomFields.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic bg-white/60 dark:bg-slate-900/60 p-3 rounded-xl border border-dashed border-indigo-200/60 dark:border-indigo-900/40 text-center">
                      No dynamic custom fields added yet. Click &quot;+ Add Input Field&quot; above to add fields like SWIFT Code, USDT Address, GSTIN, etc.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {payCustomFields.map((field, index) => (
                        <div
                          key={field.id}
                          className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shadow-2xs animate-fade-in"
                        >
                          <span className="text-[9.5px] font-bold font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-1 rounded shrink-0 self-start sm:self-auto">
                            #{index + 1}
                          </span>

                          <div className="flex-1 flex flex-col sm:flex-row gap-2">
                            <div className="sm:w-5/12 flex flex-col gap-0.5">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Field Name / Label</span>
                              <input
                                type="text"
                                required
                                value={field.label}
                                onChange={(e) => handleUpdatePayCustomField(field.id, "label", e.target.value)}
                                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                                placeholder="e.g. SWIFT Code or Wallet Address"
                              />
                            </div>

                            <div className="flex-1 flex flex-col gap-0.5">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Field Value</span>
                              <input
                                type="text"
                                required
                                value={field.value}
                                onChange={(e) => handleUpdatePayCustomField(field.id, "value", e.target.value)}
                                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                                placeholder="Enter value here..."
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemovePayCustomField(field.id)}
                            className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl transition-colors cursor-pointer shrink-0 border border-rose-200/50 self-end sm:self-center"
                            title="Delete this input field"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSavingPaymentDetails}
                  className="mt-1 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  <span>{isSavingPaymentDetails ? "Saving Gateway Details..." : "Save Gateway Details & Dynamic Input Fields"}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Admin Payment Note & Alternative Options Editor */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-4 border-t">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <span>Payment Information Note & Alternative Options</span>
                  <span className="text-[9px] px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-mono font-bold rounded-full border border-amber-200/50">
                    PUBLIC DEPOSIT NOTICE
                  </span>
                </h4>
                <p className="text-[10px] text-slate-400">
                  Provide custom instructions, alternative payment channels (IMPS / Crypto / Support Desk), or bank limits warning for users on the Deposit tab.
                </p>
              </div>
            </div>

            <form onSubmit={handleSavePaymentNote} className="flex flex-col gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                    Deposit Notice Text (Supports Multiline & Bullet Points)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAdminNoteText(DEFAULT_PAYMENT_NOTE)}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Reset Default Note
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">‚Ä¢</span>
                    <button
                      type="button"
                      onClick={() => setAdminNoteText("")}
                      className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                    >
                      Clear Note
                    </button>
                  </div>
                </div>

                <textarea
                  rows={5}
                  value={adminNoteText}
                  onChange={(e) => setAdminNoteText(e.target.value)}
                  placeholder="Enter custom payment instructions or alternative options note for traders..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono leading-relaxed focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                />
              </div>

              {/* Note Live Preview */}
              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-xl flex flex-col gap-1.5">
                <div className="flex items-center gap-1 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold uppercase tracking-wider">
                  <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Live Trader View Preview</span>
                </div>
                <div className="text-xs text-amber-900/90 dark:text-amber-200/90 whitespace-pre-line leading-relaxed font-medium pl-4 border-l-2 border-amber-400 dark:border-amber-600">
                  {adminNoteText.trim() ? adminNoteText : "(Note is currently blank - no notice will be displayed to users)"}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingNote}
                className="py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSavingNote ? "Saving Notice..." : "Save Payment Information Note"}
              </button>
            </form>
          </div>

          {/* Deposit & Withdrawal Processing Time Configuration Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 font-display uppercase tracking-wider">
                  Deposit & Withdrawal Processing Times (‡§ú‡§Æ‡§æ/‡§®‡§ø‡§ï‡§æ‡§∏‡•Ä ‡§∏‡§Æ‡§Ø)
                </h3>
                <p className="text-[10px] text-slate-400">
                  Set expected time durations for deposits and withdrawals. Users see this live timing notice on their Wallet panel.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveProcessingTimes} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Deposit Processing Time Input */}
                <div className="flex flex-col gap-2">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Deposit Processing Time (‡§ú‡§Æ‡§æ ‡§π‡•ã‡§®‡•á ‡§ï‡§æ ‡§∏‡§Æ‡§Ø)
                  </label>
                  <input
                    type="text"
                    required
                    value={adminDepositTime}
                    onChange={(e) => setAdminDepositTime(e.target.value)}
                    placeholder="e.g. 5 - 15 Minutes"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  {/* Presets */}
                  <div className="flex flex-wrap gap-1">
                    {["5 - 15 Minutes", "15 - 30 Minutes", "30 - 60 Minutes", "Instant (5 Mins)", "1 - 2 Hours"].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAdminDepositTime(preset)}
                        className={`px-2 py-1 text-[9.5px] font-bold rounded-lg border cursor-pointer transition-all ${
                          adminDepositTime === preset
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-indigo-400"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Withdrawal Processing Time Input */}
                <div className="flex flex-col gap-2">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Withdrawal Processing Time (‡§®‡§ø‡§ï‡§æ‡§∏‡•Ä ‡§π‡•ã‡§®‡•á ‡§ï‡§æ ‡§∏‡§Æ‡§Ø)
                  </label>
                  <input
                    type="text"
                    required
                    value={adminWithdrawalTime}
                    onChange={(e) => setAdminWithdrawalTime(e.target.value)}
                    placeholder="e.g. 30 - 60 Minutes"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  {/* Presets */}
                  <div className="flex flex-wrap gap-1">
                    {["15 - 30 Minutes", "30 - 60 Minutes", "1 - 2 Hours", "2 - 4 Hours", "Same Day (12 Hrs)"].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAdminWithdrawalTime(preset)}
                        className={`px-2 py-1 text-[9.5px] font-bold rounded-lg border cursor-pointer transition-all ${
                          adminWithdrawalTime === preset
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-indigo-400"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview Box */}
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Trader View Banner Preview:
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono font-extrabold">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Deposit: {adminDepositTime}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">‚Ä¢</span>
                  <span className="text-amber-600 dark:text-amber-400">
                    Withdrawal: {adminWithdrawalTime}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingProcessingTimes}
                className="py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSavingProcessingTimes ? "Saving Times..." : "Save Processing Time Configuration"}
              </button>
            </form>
          </div>

          {/* Custom User Withdrawal Input Fields Configuration Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 font-display uppercase tracking-wider flex items-center gap-2">
                    <span>User Withdrawal Input Fields (‡§®‡§ø‡§ï‡§æ‡§∏‡•Ä ‡§´‡•â‡§∞‡•ç‡§Æ ‡§´‡§º‡•Ä‡§≤‡•ç‡§°‡•ç‡§∏)</span>
                    <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-full text-[10px] font-mono font-extrabold">
                      {adminWithdrawalFields.length} Active Fields
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Create custom input fields that users will fill out when submitting withdrawal requests (e.g., UPI ID, Account Holder Name, Bank Account Number, IFSC Code, Mobile Number, USDT Wallet Address).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleResetWithdrawalFields}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-slate-200/80 dark:border-slate-700"
                  title="Reset to default fields template"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Reset Defaults</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddWithdrawalField}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-xs active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Input Field</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveWithdrawalFields} className="flex flex-col gap-3">
              {adminWithdrawalFields.length === 0 ? (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                  <p className="text-xs text-slate-400 italic">No withdrawal fields configured yet. Click &quot;+ Add Input Field&quot; above to create required inputs for users.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 max-h-[450px] overflow-y-auto pr-1">
                  {adminWithdrawalFields.map((field, idx) => (
                    <div
                      key={field.id}
                      className="p-3 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col md:flex-row items-start md:items-center gap-3 shadow-2xs hover:border-emerald-500/30 transition-all"
                    >
                      <span className="text-[10px] font-mono font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-1 rounded-lg border border-emerald-200/50 shrink-0">
                        #{idx + 1}
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 w-full">
                        {/* Field Label */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            Field Label (‡§®‡§æ‡§Æ) *
                          </label>
                          <input
                            type="text"
                            required
                            value={field.label}
                            onChange={(e) => handleUpdateWithdrawalField(field.id, "label", e.target.value)}
                            placeholder="e.g. UPI ID / PhonePe Number"
                            className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        {/* Placeholder */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            Placeholder text (‡§â‡§¶‡§æ‡§π‡§∞‡§£)
                          </label>
                          <input
                            type="text"
                            value={field.placeholder || ""}
                            onChange={(e) => handleUpdateWithdrawalField(field.id, "placeholder", e.target.value)}
                            placeholder="e.g. user@upi or 9876543210"
                            className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500 font-sans"
                          />
                        </div>

                        {/* Required Toggle & Type */}
                        <div className="flex items-center gap-3 self-end py-1">
                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={!!field.required}
                              onChange={(e) => handleUpdateWithdrawalField(field.id, "required", e.target.checked)}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Mandatory (Required *)
                            </span>
                          </label>

                          <select
                            value={field.type || "text"}
                            onChange={(e) => handleUpdateWithdrawalField(field.id, "type", e.target.value)}
                            className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                          >
                            <option value="text">Text Input</option>
                            <option value="number">Number Input</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveWithdrawalField(field.id)}
                        className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl transition-colors cursor-pointer shrink-0 border border-rose-200/50 self-end md:self-center"
                        title="Delete withdrawal field"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] text-slate-400 italic">
                  üí° Saved fields will instantly appear in the user&apos;s withdrawal panel form.
                </span>
                <button
                  type="submit"
                  disabled={isSavingWithdrawalFields}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  <span>{isSavingWithdrawalFields ? "Saving Withdrawal Fields..." : "Save Withdrawal Input Fields"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Admin Security Credentials Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 font-display uppercase tracking-wider">
                  Admin Security & Credentials (Argon2 / Bcrypt Hash Protection)
                </h3>
                <p className="text-[10px] text-slate-400">
                  Update Admin Password and 6-digit Security PIN for sensitive approvals. Passwords and PINs are stored securely as salted bcrypt hashes.
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateAdminSecurityCredentials} className="flex flex-col gap-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Active Security Engine:</span>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold rounded-lg border border-emerald-200 dark:border-emerald-800">
                  üîí Bcrypt Salted Hash ‚Ä¢ Single Session Enforced
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Current Admin Password (Required if changing Password)
                  </label>
                  <input
                    type="password"
                    value={secCurrentPassword}
                    onChange={(e) => setSecCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Current 6-Digit Security PIN (Required)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={secCurrentPin}
                    onChange={(e) => setSecCurrentPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter current 6-digit PIN"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 tracking-wider"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    New Strong Admin Password (Optional)
                  </label>
                  <input
                    type="password"
                    value={secNewPassword}
                    onChange={(e) => setSecNewPassword(e.target.value)}
                    placeholder="Min 8 chars, A-Z, a-z, 0-9, special char"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[9.5px] text-slate-400 mt-1">
                    Must contain at least 8 characters, 1 uppercase, 1 lowercase, 1 digit, and 1 special symbol.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    New 6-Digit Admin Security PIN (Optional)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={secNewPin}
                    onChange={(e) => setSecNewPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter new 6-digit numeric PIN"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 tracking-wider"
                  />
                  <p className="text-[9.5px] text-slate-400 mt-1">
                    Used to authorize sensitive deposit, withdrawal, and verification actions.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={isUpdatingSecCredentials}
                className="py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isUpdatingSecCredentials ? "Updating Credentials..." : "Update Security Credentials"}
              </button>
            </form>
          </div>

          {/* Modal for Creating New Payment Gateway */}
          {isAddGatewayModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative flex flex-col gap-4">
                <button
                  type="button"
                  onClick={() => setIsAddGatewayModalOpen(false)}
                  className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-display">
                      Create New Payment Gateway
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Add a new bank account or UPI payment channel for deposit requests
                    </p>
                  </div>
                </div>

                <form onSubmit={handleCreatePaymentGateway} className="flex flex-col gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                      Gateway Label / Title
                    </label>
                    <input
                      type="text"
                      required
                      value={newGwTitle}
                      onChange={(e) => setNewGwTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                      placeholder="e.g. HDFC Merchant Gateway or PhonePe UPI"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                        UPI ID (Required)
                      </label>
                      <input
                        type="text"
                        required
                        value={newGwUpiId}
                        onChange={(e) => setNewGwUpiId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                        placeholder="e.g. 9876543210@upi"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                        Account Holder Name
                      </label>
                      <input
                        type="text"
                        required
                        value={newGwAccountName}
                        onChange={(e) => setNewGwAccountName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                        placeholder="e.g. MUBARAK ABDUL AZIZ"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        required
                        value={newGwBankName}
                        onChange={(e) => setNewGwBankName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                        placeholder="e.g. ICICI BANK"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                        Account Number
                      </label>
                      <input
                        type="text"
                        required
                        value={newGwAccountNumber}
                        onChange={(e) => setNewGwAccountNumber(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                        placeholder="e.g. 50100305958655"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        required
                        value={newGwIfscCode}
                        onChange={(e) => setNewGwIfscCode(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                        placeholder="e.g. ICIC0001234"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                        Branch & Account Type
                      </label>
                      <input
                        type="text"
                        required
                        value={newGwBranchAndType}
                        onChange={(e) => setNewGwBranchAndType(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                        placeholder="e.g. MUMBAI ‚Ä¢ CURRENT"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                      Custom QR Code Image URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={newGwQrCodeUrl}
                      onChange={(e) => setNewGwQrCodeUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                      placeholder="https://example.com/qr.png"
                    />
                  </div>

                  <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 rounded-xl">
                    <input
                      type="checkbox"
                      id="new-gw-active-checkbox"
                      checked={newGwIsActive}
                      onChange={(e) => setNewGwIsActive(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="new-gw-active-checkbox" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1.5">
                      <span>Make Active & Visible to Traders Immediately</span>
                      {!newGwIsActive && (
                        <span className="text-[9px] px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono font-bold rounded">
                          HIDDEN
                        </span>
                      )}
                    </label>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsAddGatewayModalOpen(false)}
                      className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingGateway}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {isCreatingGateway ? "Creating..." : "Save New Gateway"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal for Deleting Payment Gateway */}
          {gatewayToDelete && (
            <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-3xl max-w-md w-full p-6 shadow-2xl relative flex flex-col gap-4 text-center items-center">
                <div className="p-3 bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 rounded-full">
                  <Trash2 className="h-6 w-6" />
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-display">
                    Delete Payment Gateway?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    Are you sure you want to permanently remove <strong className="text-slate-800 dark:text-slate-200">{gatewayToDelete.title || gatewayToDelete.bankName}</strong> ({gatewayToDelete.upiId})? Traders will no longer see this payment gateway when making deposits.
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full mt-2">
                  <button
                    type="button"
                    onClick={() => setGatewayToDelete(null)}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteGateway}
                    disabled={isDeletingGateway}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isDeletingGateway ? "Deleting..." : "Delete Permanently"}
                  </button>
                </div>
              </div>
            </div>
          )}


        </div>
      )}

      {/* Users Management tab */}
      {activeTab === "users" && (
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              Simulated Ledger User Profiles
            </h3>
            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold">
              {traderUsers.length} Users Total
            </span>
          </div>

          {/* User Search & Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
            <div className="sm:col-span-2 md:col-span-1 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:border-indigo-500 dark:text-slate-200"
              />
            </div>
            
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/60 dark:border-emerald-900/40 p-2 rounded-lg text-center">
              <span className="text-[8px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Total Net Worth</span>
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                ‚Çπ{allUsers.reduce((acc, u) => acc + (u.balance || 0), 0).toFixed(2)}
              </span>
            </div>

            <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/60 dark:border-amber-900/40 p-2 rounded-lg text-center">
              <span className="text-[8px] uppercase font-bold text-amber-600 dark:text-amber-400 block">Total Locked Stake</span>
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                ‚Çπ{allUsers.reduce((acc, u) => acc + (u.lockedBalance || 0), 0).toFixed(2)}
              </span>
            </div>

            <div className="bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100/60 dark:border-teal-900/40 p-2 rounded-lg text-center">
              <span className="text-[8px] uppercase font-bold text-teal-600 dark:text-teal-400 block">Total Approved Deposits</span>
              <span className="font-mono text-xs font-extrabold text-teal-700 dark:text-teal-300">
                ‚Çπ{walletTransactions.filter(t => t.type === "DEPOSIT" && t.status === "APPROVED").reduce((acc, t) => acc + (t.amount || 0), 0).toFixed(2)}
              </span>
            </div>

            <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100/60 dark:border-rose-900/40 p-2 rounded-lg text-center">
              <span className="text-[8px] uppercase font-bold text-rose-600 dark:text-rose-400 block">Total Approved Withdrawals</span>
              <span className="font-mono text-xs font-extrabold text-rose-700 dark:text-rose-300">
                ‚Çπ{walletTransactions.filter(t => t.type === "WITHDRAWAL" && t.status === "APPROVED").reduce((acc, t) => acc + (t.amount || 0), 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Profile Details Edit Form */}
          {editingUserProfile && (
            <form onSubmit={handleAdminUpdateUserProfile} className="bg-slate-50 dark:bg-slate-950 border border-indigo-200 dark:border-indigo-900/60 p-4 rounded-xl flex flex-col gap-3.5 animate-fade-in shadow-2xs">
              <div className="flex justify-between items-center border-b border-slate-200/60 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-1.5 flex-wrap">
                    <span>Edit User Profile: <span className="text-indigo-600 dark:text-indigo-400">{editingUserProfile.name}</span></span>
                    {isOwner && (
                      <span className="font-mono text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 font-bold">
                        ID: {editingUserProfile.id}
                      </span>
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingUserProfile(null)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Trader Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editNameInput}
                    onChange={(e) => setEditNameInput(e.target.value)}
                    placeholder="Full Name"
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-500 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Login Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmailInput}
                    onChange={(e) => setEditEmailInput(e.target.value)}
                    placeholder="trader@example.com"
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold font-mono focus:outline-none focus:border-indigo-500 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Mobile / Phone Number
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={editPhoneInput}
                      onChange={(e) => setEditPhoneInput(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold font-mono focus:outline-none focus:border-indigo-500 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Deposit & Withdrawal Financial Summary Card for Edited User */}
              {(() => {
                const edUserTxs = walletTransactions.filter(
                  (tx) => tx.userId === editingUserProfile.id || (tx.userEmail && tx.userEmail.toLowerCase() === editingUserProfile.email?.toLowerCase())
                );
                const edAppDep = edUserTxs.filter((tx) => tx.type === "DEPOSIT" && tx.status === "APPROVED").reduce((acc, tx) => acc + (tx.amount || 0), 0);
                const edPendDep = edUserTxs.filter((tx) => tx.type === "DEPOSIT" && tx.status === "PENDING").reduce((acc, tx) => acc + (tx.amount || 0), 0);
                const edAppWith = edUserTxs.filter((tx) => tx.type === "WITHDRAWAL" && tx.status === "APPROVED").reduce((acc, tx) => acc + (tx.amount || 0), 0);
                const edPendWith = edUserTxs.filter((tx) => tx.type === "WITHDRAWAL" && tx.status === "PENDING").reduce((acc, tx) => acc + (tx.amount || 0), 0);

                return (
                  <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 rounded-xl flex flex-col gap-2">
                    <span className="text-[10px] font-extrabold uppercase text-indigo-700 dark:text-indigo-300 tracking-wider flex items-center gap-1.5">
                      <Coins className="h-3.5 w-3.5 text-indigo-500" />
                      User Financial Summary (‡§ú‡§Æ‡§æ ‡§µ ‡§®‡§ø‡§ï‡§æ‡§∏‡•Ä ‡§¨‡•ç‡§Ø‡•ã‡§∞‡§æ)
                    </span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-emerald-200/80 dark:border-emerald-900/60">
                        <span className="text-[8.5px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Total Approved Deposits</span>
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                          ‚Çπ{edAppDep.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {edPendDep > 0 && (
                          <span className="text-[8.5px] text-amber-600 dark:text-amber-400 font-bold block">‚è≥ ‚Çπ{edPendDep.toLocaleString("en-IN")} Pending</span>
                        )}
                      </div>

                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-rose-200/80 dark:border-rose-900/60">
                        <span className="text-[8.5px] uppercase font-bold text-rose-600 dark:text-rose-400 block">Total Approved Withdrawals</span>
                        <span className="font-mono font-black text-rose-600 dark:text-rose-400">
                          ‚Çπ{edAppWith.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {edPendWith > 0 && (
                          <span className="text-[8.5px] text-amber-600 dark:text-amber-400 font-bold block">‚è≥ ‚Çπ{edPendWith.toLocaleString("en-IN")} Pending</span>
                        )}
                      </div>

                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                        <span className="text-[8.5px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Net Deposit - Withdrawal</span>
                        <span className={`font-mono font-black ${edAppDep - edAppWith >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          ‚Çπ{(edAppDep - edAppWith).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                        <span className="text-[8.5px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Current Total Balance</span>
                        <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">
                          ‚Çπ{(editingUserProfile.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Trading Performance Card for Edited User */}
              {(() => {
                const userSolo = allSoloTrades.filter(
                  (t) => t.userId === editingUserProfile.id || (t.userEmail && t.userEmail.toLowerCase() === editingUserProfile.email?.toLowerCase())
                );
                const totalCount = userSolo.length;
                const wonCount = userSolo.filter((t) => t.status === "WON").length;
                const lostCount = userSolo.filter((t) => t.status === "LOST").length;
                const drawCount = userSolo.filter((t) => t.status === "DRAW").length;
                const runningCount = userSolo.filter((t) => t.status === "RUNNING").length;
                const totalStake = userSolo.reduce((sum, t) => sum + (t.stake || 0), 0);
                const netPnl = userSolo.reduce((sum, t) => sum + (t.profitOrLoss || 0), 0);
                const winRate = totalCount > 0 ? ((wonCount / totalCount) * 100).toFixed(1) : "0.0";
                const recentTrades = userSolo.slice(0, 5);

                return (
                  <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/60 rounded-xl flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase text-purple-700 dark:text-purple-300 tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-purple-500" />
                        Trading Performance (‡§ü‡•ç‡§∞‡•á‡§°‡§ø‡§Ç‡§ó ‡§™‡§∞‡§´‡•â‡§∞‡§Æ‡•á‡§Ç‡§∏)
                      </span>
                      <span className="text-[9.5px] font-mono font-bold bg-purple-100 dark:bg-purple-900/80 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                        Win Rate: {winRate}%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs font-mono">
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-purple-100 dark:border-purple-900/50">
                        <span className="text-[8.5px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Total Trades</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{totalCount} Trades</span>
                        {runningCount > 0 && (
                          <span className="text-[8.5px] text-amber-500 font-bold block">‚ö° {runningCount} Active</span>
                        )}
                      </div>

                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-purple-100 dark:border-purple-900/50">
                        <span className="text-[8.5px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Total Volume / Stake</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          ‚Çπ{totalStake.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-emerald-200/80 dark:border-emerald-900/60">
                        <span className="text-[8.5px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Wins (Won)</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{wonCount} Won</span>
                      </div>

                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-rose-200/80 dark:border-rose-900/60">
                        <span className="text-[8.5px] uppercase font-bold text-rose-600 dark:text-rose-400 block">Losses (Lost)</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">{lostCount} Lost</span>
                      </div>

                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-purple-100 dark:border-purple-900/50">
                        <span className="text-[8.5px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Net Trading P&L</span>
                        <span className={`font-black ${netPnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {netPnl >= 0 ? "+" : ""}‚Çπ{netPnl.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Recent 5 Trades Quick List */}
                    {recentTrades.length > 0 && (
                      <div className="mt-1 border-t border-purple-100/60 dark:border-purple-900/40 pt-2">
                        <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase block mb-1">Recent Trades</span>
                        <div className="space-y-1">
                          {recentTrades.map((tr) => (
                            <div key={tr.id} className="flex items-center justify-between text-[10px] bg-white/80 dark:bg-slate-900/80 p-1.5 rounded border border-purple-100/40 dark:border-purple-900/30">
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className={`px-1 py-0.2 rounded text-[8px] font-black ${tr.tradeType === "CALL" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"}`}>
                                  {tr.tradeType}
                                </span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">{tr.assetPair}</span>
                                <span className="text-slate-400">‚Çπ{tr.stake}</span>
                              </div>

                              <div className="flex items-center gap-2 font-mono">
                                <span className="text-[9px] text-slate-400">
                                  Entry {formatAssetPrice(tr.entryPrice, tr.assetPair || tr.tradingSymbol)} ‚Üí Exit {formatAssetPrice(tr.exitPrice ?? tr.entryPrice, tr.assetPair || tr.tradingSymbol)}
                                </span>
                                <span className={`font-bold ${tr.status === "WON" ? "text-emerald-600" : tr.status === "LOST" ? "text-rose-600" : "text-amber-600"}`}>
                                  {tr.status} ({(tr.profitOrLoss || 0) >= 0 ? "+" : ""}‚Çπ{(tr.profitOrLoss || 0).toFixed(2)})
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Mobile Verification Status
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Mark whether trader's phone number is verified & approved
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditMobileVerified(!editMobileVerified)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      editMobileVerified
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {editMobileVerified ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span>VERIFIED (APPROVED)</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                        <span>UNVERIFIED (PENDING)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* PAN / Aadhaar Card Verification Section */}
              <div className="p-3 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col gap-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span className="text-[10px] font-extrabold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    PAN / Aadhaar Verification Details (‡§™‡§π‡§ö‡§æ‡§® ‡§™‡§§‡•ç‡§∞)
                  </span>
                  <select
                    value={editKycStatus}
                    onChange={(e) => setEditKycStatus(e.target.value as any)}
                    className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="verified">‚úÖ VERIFIED (APPROVED)</option>
                    <option value="pending">‚è≥ PENDING</option>
                    <option value="rejected">‚ùå REJECTED</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                      PAN Card Number
                    </label>
                    <input
                      type="text"
                      value={editPanNumber}
                      onChange={(e) => setEditPanNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. ABCDE1234F"
                      className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold uppercase focus:outline-none focus:border-indigo-500 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Aadhaar Card Number
                    </label>
                    <input
                      type="text"
                      value={editAadhaarNumber}
                      onChange={(e) => setEditAadhaarNumber(e.target.value)}
                      placeholder="e.g. 1234 5678 9012"
                      className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-indigo-500 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Document Full Holder Name
                    </label>
                    <input
                      type="text"
                      value={editKycHolderName}
                      onChange={(e) => setEditKycHolderName(e.target.value)}
                      placeholder="Name on PAN / Aadhaar"
                      className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-500 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Saved Bank Account Section with Column Add & Delete */}
              <div className="p-3.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col gap-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-[10.5px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" />
                    Saved Bank Account Details (‡§¨‡•à‡§Ç‡§ï ‡§ñ‡§æ‡§§‡§æ)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddCustomBankColumn}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1 shadow-2xs"
                    title="Add a new custom bank detail field / column"
                  >
                    <Plus className="h-3 w-3" />
                    Add Column / Field (‡§ï‡•â‡§≤‡§Æ ‡§ú‡•ã‡§°‡§º‡•á‡§Ç)
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={editBankHolderName}
                      onChange={(e) => setEditBankHolderName(e.target.value)}
                      placeholder="Bank Account Holder"
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-500 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={editBankName}
                      onChange={(e) => setEditBankName(e.target.value)}
                      placeholder="e.g. SBI, HDFC, ICICI"
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-500 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={editBankAccountNumber}
                      onChange={(e) => setEditBankAccountNumber(e.target.value)}
                      placeholder="Account Number"
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-indigo-500 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      value={editBankIfscCode}
                      onChange={(e) => setEditBankIfscCode(e.target.value.toUpperCase())}
                      placeholder="SBIN0001234"
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold uppercase focus:outline-none focus:border-indigo-500 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Custom Added Columns / Fields with Delete Buttons */}
                {editCustomBankFields.length > 0 && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Additional Bank Columns & Fields ({editCustomBankFields.length})
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {editCustomBankFields.map((field, fIdx) => (
                        <div
                          key={field.id || fIdx}
                          className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col gap-1.5 relative group"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) => handleUpdateCustomBankColumn(field.id, "label", e.target.value)}
                              placeholder="Field / Column Name"
                              className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-[10px] font-extrabold uppercase text-indigo-600 dark:text-indigo-400 focus:outline-none focus:border-indigo-500 w-full"
                            />
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomBankColumn(field.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/80 rounded transition-all cursor-pointer shrink-0"
                              title="Delete this column / field"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <input
                            type="text"
                            value={field.value}
                            onChange={(e) => handleUpdateCustomBankColumn(field.id, "value", e.target.value)}
                            placeholder={`Enter ${field.label || 'value'}`}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={handleAddCustomBankColumn}
                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer pt-1"
                  >
                    <Plus className="h-3 w-3" /> + Add Another Custom Column / Field (e.g. UPI ID, Branch, Account Type)
                  </button>
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-1">
                <button
                  type="button"
                  onClick={() => setEditingUserProfile(null)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProfileEdit}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingProfileEdit ? (
                    "Updating Profile..."
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Save Profile Updates
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Balance Adjustment Form */}
          {adjustingUser && (
            <form onSubmit={handleUserBalanceAdjustment} className="bg-slate-50 dark:bg-slate-950 border border-indigo-100 dark:border-indigo-900/50 p-3.5 rounded-xl flex flex-col gap-3 animate-fade-in">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-250">
                    Adjust Balance: <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{adjustingUser.name}</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAdjustingUser(null)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                    Adjustment Type
                  </label>
                  <select
                    value={adjustmentType}
                    onChange={(e) => setAdjustmentType(e.target.value as "BONUS" | "ADJUSTMENT")}
                    className="mt-1 w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                  >
                    <option value="BONUS">Bonus (Add)</option>
                    <option value="ADJUSTMENT">Manual Adjustment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                    Amount (‚Çπ, positive/negative)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder="e.g. 500 or -200"
                    className="mt-1 w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                  />
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                    Reason / Details
                  </label>
                  <input
                    type="text"
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    placeholder="e.g. Promo Bonus"
                    className="mt-1 w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-1">
                <button
                  type="button"
                  onClick={() => setAdjustingUser(null)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjustment}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {isSubmittingAdjustment ? "Applying..." : "Save Adjustment"}
                </button>
              </div>
            </form>
          )}

          {/* Users List Table */}
          <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[350px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-950/40 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2.5 px-3">Trader Name</th>
                    <th className="py-2.5 px-3">Mobile Verification</th>
                    <th className="py-2.5 px-3">PAN/Aadhaar & Bank</th>
                    <th className="py-2.5 px-3 font-mono text-emerald-600 dark:text-emerald-400">Total Deposit (‡§ú‡§Æ‡§æ)</th>
                    <th className="py-2.5 px-3 font-mono text-rose-600 dark:text-rose-400">Total Withdrawal (‡§®‡§ø‡§ï‡§æ‡§∏‡•Ä)</th>
                    <th className="py-2.5 px-3 font-mono text-purple-600 dark:text-purple-400">Trading Perf (‡§ü‡•ç‡§∞‡•á‡§°‡§ø‡§Ç‡§ó)</th>
                    <th className="py-2.5 px-3 font-mono">Available</th>
                    <th className="py-2.5 px-3 font-mono">Locked</th>
                    <th className="py-2.5 px-3 font-mono">Total Balance</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-[11px]">
                  {traderUsers
                    .filter(u => 
                      (u.name || "").toLowerCase().includes(userSearch.toLowerCase()) || 
                      (u.email || "").toLowerCase().includes(userSearch.toLowerCase())
                    )
                    .map((u) => {
                      const isCurrentUserAdjusting = adjustingUser?.id === u.id;
                      const isVerified = isUserMobileVerified(u);
                      const displayEmail = canSeeUnmaskedContact ? u.email : maskEmailAddress(u.email);
                      const displayPhone = canSeeUnmaskedContact ? u.phone : maskPhoneNumber(u.phone);

                      // Calculate per-user total deposit and total withdrawal amounts
                      const userTxs = walletTransactions.filter(
                        (tx) => tx.userId === u.id || (tx.userEmail && tx.userEmail.toLowerCase() === u.email?.toLowerCase())
                      );
                      const userApprovedDep = userTxs
                        .filter((tx) => tx.type === "DEPOSIT" && tx.status === "APPROVED")
                        .reduce((acc, tx) => acc + (tx.amount || 0), 0);
                      const userPendingDep = userTxs
                        .filter((tx) => tx.type === "DEPOSIT" && tx.status === "PENDING")
                        .reduce((acc, tx) => acc + (tx.amount || 0), 0);

                      const userApprovedWith = userTxs
                        .filter((tx) => tx.type === "WITHDRAWAL" && tx.status === "APPROVED")
                        .reduce((acc, tx) => acc + (tx.amount || 0), 0);
                      const userPendingWith = userTxs
                        .filter((tx) => tx.type === "WITHDRAWAL" && tx.status === "PENDING")
                        .reduce((acc, tx) => acc + (tx.amount || 0), 0);

                      // Calculate per-user solo trading stats
                      const uSolo = allSoloTrades.filter(
                        (t) => t.userId === u.id || (t.userEmail && t.userEmail.toLowerCase() === u.email?.toLowerCase())
                      );
                      const uTotalTrades = uSolo.length;
                      const uWonTrades = uSolo.filter((t) => t.status === "WON").length;
                      const uLostTrades = uSolo.filter((t) => t.status === "LOST").length;
                      const uDrawTrades = uSolo.filter((t) => t.status === "DRAW").length;
                      const uNetPnl = uSolo.reduce((sum, t) => sum + (t.profitOrLoss || 0), 0);
                      const uWinRate = uTotalTrades > 0 ? ((uWonTrades / uTotalTrades) * 100).toFixed(0) : "0";

                      return (
                        <tr 
                          key={u.id}
                          className={`hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition-colors ${
                            isCurrentUserAdjusting ? "bg-indigo-50/20 dark:bg-indigo-950/10" : ""
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
                                <span>{u.name}</span>
                                {isOwner && (
                                  <span className="text-[8.5px] font-mono px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 font-semibold" title={`User ID: ${u.id}`}>
                                    ID: {u.id}
                                  </span>
                                )}
                                {u.isBlocked && (
                                  <span className="bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900 px-1.5 py-0.2 rounded text-[8px] font-extrabold font-sans flex items-center gap-0.5">
                                    <Ban className="h-2.5 w-2.5" /> BLOCKED
                                  </span>
                                )}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-[130px]">
                                  {displayEmail}
                                </span>
                                {displayPhone ? (
                                  <span className="text-[9.5px] font-mono font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded">
                                    <Smartphone className="h-2.5 w-2.5 shrink-0" />
                                    {displayPhone}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-mono italic text-amber-600 dark:text-amber-400">
                                    No Mobile Number
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            {isVerified ? (
                              <span className="bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full text-[9px] font-bold inline-flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" /> VERIFIED
                              </span>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className="bg-amber-100/80 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full text-[9px] font-bold inline-flex items-center gap-1">
                                  <ShieldAlert className="h-3 w-3 text-amber-500" /> PENDING
                                </span>
                                <button
                                  onClick={() => handleDirectApproveUserMobile(u)}
                                  className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[8.5px] font-extrabold rounded shadow-2xs transition-all cursor-pointer flex items-center gap-0.5"
                                  title="Directly approve and verify this user's mobile number"
                                >
                                  <Check className="h-2.5 w-2.5" /> Approve
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {u.savedBankDetails || u.panNumber || u.aadhaarNumber ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1 flex-wrap">
                                  {u.kycStatus === "verified" ? (
                                    <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded-full text-[8.5px] font-bold inline-flex items-center gap-0.5">
                                      <Check className="h-2.5 w-2.5" /> VERIFIED
                                    </span>
                                  ) : u.kycStatus === "rejected" ? (
                                    <span className="bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 px-1.5 py-0.2 rounded-full text-[8.5px] font-bold inline-flex items-center gap-0.5">
                                      <X className="h-2.5 w-2.5" /> REJECTED
                                    </span>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-1.5 py-0.2 rounded-full text-[8.5px] font-bold inline-flex items-center gap-0.5">
                                        <Clock className="h-2.5 w-2.5" /> PENDING
                                      </span>
                                      <button
                                        onClick={() => handleDirectApproveUserKyc(u)}
                                        className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[8.5px] font-extrabold rounded shadow-2xs transition-all cursor-pointer flex items-center gap-0.5"
                                        title="Directly approve and verify this user's KYC & Bank account"
                                      >
                                        <Check className="h-2.5 w-2.5" /> Approve KYC
                                      </button>
                                    </div>
                                  )}
                                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                    {u.savedBankDetails?.bankName || "Bank"}
                                  </span>
                                </div>
                                <div className="text-[9.5px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                                  {u.savedBankDetails?.accountNumber ? `A/c: ...${u.savedBankDetails.accountNumber.slice(-4)}` : u.panNumber ? `PAN: ${u.panNumber}` : "Submitted"}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Not Added</span>
                            )}
                          </td>
                          {/* Deposit Column */}
                          <td className="py-2.5 px-3 font-mono">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                ‚Çπ{userApprovedDep.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              {userPendingDep > 0 && (
                                <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5">
                                  ‚è≥ ‚Çπ{userPendingDep.toLocaleString("en-IN")} Pending
                                </span>
                              )}
                            </div>
                          </td>
                          {/* Withdrawal Column */}
                          <td className="py-2.5 px-3 font-mono">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-rose-600 dark:text-rose-400">
                                ‚Çπ{userApprovedWith.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              {userPendingWith > 0 && (
                                <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5">
                                  ‚è≥ ‚Çπ{userPendingWith.toLocaleString("en-IN")} Pending
                                </span>
                              )}
                            </div>
                          </td>
                          {/* Trading Performance Column */}
                          <td className="py-2.5 px-3 font-mono">
                            {uTotalTrades > 0 ? (
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className={`font-bold ${uNetPnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                    {uNetPnl >= 0 ? "+" : ""}‚Çπ{uNetPnl.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                  <span className="text-[9px] px-1 py-0.2 bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-bold rounded">
                                    {uWinRate}% Win
                                  </span>
                                </div>
                                <div className="text-[9px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-sans">
                                  <span>{uTotalTrades} Trades:</span>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{uWonTrades}W</span>
                                  <span className="text-rose-600 dark:text-rose-400 font-bold">{uLostTrades}L</span>
                                  {uDrawTrades > 0 && <span className="text-amber-600 dark:text-amber-400 font-bold">{uDrawTrades}D</span>}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">No Trades</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-350">
                            ‚Çπ{(u.availableBalance ?? u.balance ?? 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-amber-600 dark:text-amber-400">
                            ‚Çπ{(u.lockedBalance ?? 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-150">
                            ‚Çπ{(u.balance ?? 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {(currentAdminAccount?.role === "OWNER" || currentAdminAccount?.role === "SUPER_ADMIN" || hasStaffPermission(currentAdminAccount, "verify_kyc") || hasStaffPermission(currentAdminAccount, "freeze_unfreeze_users")) && (
                                <button
                                  onClick={() => handleGeneratePinForUser(u)}
                                  disabled={isGeneratingPin === u.id}
                                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-950 border border-amber-200/60 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[10px] font-bold rounded-md transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                                  title="Generate or Regenerate secure login PIN for trader"
                                >
                                  <Key className="h-3 w-3 text-amber-500" />
                                  {isGeneratingPin === u.id
                                    ? "Generating..."
                                    : (u.loginPinHash || u.pinGeneratedAt)
                                      ? "Regenerate PIN"
                                      : "Generate PIN"}
                                </button>
                              )}
                              {(currentAdminAccount?.role === "OWNER" || currentAdminAccount?.role === "SUPER_ADMIN" || hasStaffPermission(currentAdminAccount, "verify_kyc")) && (
                                <button
                                  onClick={() => {
                                    setEditingUserProfile(u);
                                    setEditNameInput(u.name || "");
                                    setEditEmailInput(u.email || "");
                                    setEditPhoneInput(u.phone || "");
                                    setEditMobileVerified(isVerified);
                                    setEditPanNumber(u.panNumber || "");
                                    setEditAadhaarNumber(u.aadhaarNumber || "");
                                    setEditKycDocType(u.kycDocType || "PAN");
                                    setEditKycHolderName(u.kycHolderName || u.name || "");
                                    setEditKycStatus(u.kycStatus || "pending");
                                    setEditKycRejectReason(u.kycRejectReason || "");
                                    setEditBankHolderName(u.savedBankDetails?.accountHolderName || u.name || "");
                                    setEditBankName(u.savedBankDetails?.bankName || "");
                                    setEditBankAccountNumber(u.savedBankDetails?.accountNumber || "");
                                    setEditBankIfscCode(u.savedBankDetails?.ifscCode || "");
                                    setEditCustomBankFields(u.savedBankDetails?.customFields || []);
                                  }}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold rounded-md transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                                  title="Edit user's profile, KYC documents and bank details"
                                >
                                  <Edit3 className="h-3 w-3 text-indigo-500" />
                                  Edit
                                </button>
                              )}
                              {(currentAdminAccount?.role === "OWNER" || currentAdminAccount?.role === "SUPER_ADMIN" || hasStaffPermission(currentAdminAccount, "approve_deposits") || hasStaffPermission(currentAdminAccount, "approve_withdrawals")) && (
                                <button
                                  onClick={() => {
                                    setAdjustingUser(u);
                                    setAdjustmentAmount("100");
                                    setAdjustmentType("BONUS");
                                    setAdjustmentReason("");
                                  }}
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-950 border border-indigo-100/40 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-md transition-all active:scale-95 cursor-pointer"
                                  title="Directly adjust this user's balance"
                                >
                                  Balance
                                </button>
                              )}
                              {(currentAdminAccount?.role === "OWNER" || currentAdminAccount?.role === "SUPER_ADMIN" || hasStaffPermission(currentAdminAccount, "reply_support") || hasStaffPermission(currentAdminAccount, "live_chat")) && (
                                <button
                                  onClick={() => {
                                    setDirectMsgUserId(u.id);
                                    setDirectMsgSubject("Important Notice from Admin");
                                    setDirectMsgText("");
                                    setIsDirectMsgModalOpen(true);
                                  }}
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-950 border border-emerald-100/40 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-md transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                                  title="Send a direct message to this user"
                                >
                                  <MessageSquare className="h-3 w-3 text-emerald-500" />
                                  Message
                                </button>
                              )}
                              {hasStaffPermission(currentAdminAccount, "freeze_unfreeze_users") && !(u.id === "admin" || u.id === "user_a" || u.isAdmin === true || u.email?.toLowerCase() === "amaizy1@gmail.com" || u.email?.toLowerCase().includes("admin")) && (
                                <button
                                  onClick={() => handleToggleBlockUser(u)}
                                  className={`px-2 py-1 ${
                                    u.isBlocked
                                      ? "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800"
                                      : "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800"
                                  } text-[10px] font-bold rounded-md transition-all active:scale-95 cursor-pointer flex items-center gap-1`}
                                  title={u.isBlocked ? "Unblock user account" : "Block user from logging in"}
                                >
                                  <Ban className="h-3 w-3" />
                                  {u.isBlocked ? "Unblock" : "Block"}
                                </button>
                              )}
                              {(currentAdminAccount?.role === "OWNER" || currentAdminAccount?.role === "SUPER_ADMIN") && !(u.id === "admin" || u.id === "user_a" || u.isAdmin === true || u.email?.toLowerCase() === "amaizy1@gmail.com" || u.email?.toLowerCase().includes("admin")) && (
                                <button
                                  onClick={() => setUserToDelete(u)}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 hover:dark:bg-rose-950 border border-rose-200/60 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-[10px] font-bold rounded-md transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                                  title="Permanently delete user account"
                                >
                                  <Trash2 className="h-3 w-3 text-rose-500" />
                                  Delete
                                </button>
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
        </div>
      )}

      {/* Support Messages tab */}
      {activeTab === "support" && (
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 font-display flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-500" />
                User Help & Problem Tickets
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Reply to users to solve their deposit, trade, or account queries in real-time.
              </p>
            </div>

            {/* Filter & New Message Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  if (allUsers.length > 0 && !directMsgUserId) {
                    setDirectMsgUserId(allUsers[0].id);
                  }
                  setIsDirectMsgModalOpen(true);
                }}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Direct Message User</span>
              </button>

              <div className="flex gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSupportFilter("OPEN")}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    supportFilter === "OPEN"
                      ? "bg-amber-500 text-white shadow-2xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Pending ({openSupportCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSupportFilter("RESOLVED")}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    supportFilter === "RESOLVED"
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Resolved
                </button>
                <button
                  type="button"
                  onClick={() => setSupportFilter("ALL")}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    supportFilter === "ALL"
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  All ({supportMessages.length})
                </button>
              </div>
            </div>
          </div>

          {/* Messages List */}
          {supportMessages
            .filter((m) => {
              if (supportFilter === "OPEN") return m.status === "OPEN";
              if (supportFilter === "RESOLVED") return m.status === "RESOLVED";
              return true;
            })
            .length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 dark:text-slate-500 italic bg-slate-50/50 dark:bg-slate-950/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              No support tickets found for this filter.
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-[450px] overflow-y-auto">
              {supportMessages
                .filter((m) => {
                  if (supportFilter === "OPEN") return m.status === "OPEN";
                  if (supportFilter === "RESOLVED") return m.status === "RESOLVED";
                  return true;
                })
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((msg) => {
                  const isReplyingThis = selectedSupportMsg?.id === msg.id;

                  return (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-xl border transition-all ${
                        msg.status === "OPEN"
                          ? "bg-amber-50/30 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/40"
                          : "bg-slate-50/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      {/* Ticket Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-200/60 dark:border-slate-800/80 pb-2.5 mb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <User className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {msg.userName}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block">
                              {msg.userEmail}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[9.5px] font-bold rounded-md">
                            {msg.subject}
                          </span>

                          {msg.status === "RESOLVED" ? (
                            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[9.5px] font-extrabold rounded-md flex items-center gap-1">
                              <Check className="h-3 w-3" /> Resolved
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-500 text-white text-[9.5px] font-extrabold rounded-md flex items-center gap-1 animate-pulse">
                              <Clock className="h-3 w-3" /> Action Needed
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Conversation History / Thread */}
                      {msg.thread && msg.thread.length > 0 ? (
                        <div className="space-y-2">
                          {msg.thread.map((th) => (
                            <div
                              key={th.id}
                              className={`p-2.5 rounded-lg text-xs leading-relaxed ${
                                th.sender === "USER"
                                  ? "bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-200 ml-0 mr-4"
                                  : "bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-900/60 text-indigo-950 dark:text-indigo-100 ml-4 mr-0"
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                                <span className={th.sender === "USER" ? "text-slate-500" : "text-indigo-600 dark:text-indigo-400"}>
                                  {th.sender === "USER" ? `User (${th.senderName || msg.userName})` : "Admin Reply"}
                                </span>
                                <span className="text-slate-400 font-normal font-mono">
                                  {new Date(th.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                                </span>
                              </div>
                              <p className="font-medium">{th.text}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          {/* User's Message */}
                          <div className="text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800 font-medium leading-relaxed">
                            <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block mb-1">
                              Problem Description ({new Date(msg.createdAt).toLocaleString()}):
                            </span>
                            {msg.message}
                          </div>

                          {/* Admin Reply Section */}
                          {msg.adminReply && !isReplyingThis && (
                            <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-900/60 rounded-lg flex flex-col gap-1 text-xs">
                              <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-300 font-bold text-[11px]">
                                <span className="flex items-center gap-1">
                                  <CornerDownRight className="h-3.5 w-3.5 text-indigo-500" />
                                  Admin Reply Sent:
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSupportMsg(msg);
                                    setAdminReplyInput(msg.adminReply || "");
                                  }}
                                  className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-extrabold cursor-pointer"
                                >
                                  Edit Reply
                                </button>
                              </div>
                              <p className="text-slate-800 dark:text-slate-200 font-medium pl-4 text-xs">
                                {msg.adminReply}
                              </p>
                            </div>
                          )}
                        </>
                      )}

                      {/* Reply Form */}
                      {(isReplyingThis || (!msg.adminReply && msg.status === "OPEN")) && (
                        <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex flex-col gap-2">
                          <label className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                            Type Admin Solution / Reply
                          </label>
                          <textarea
                            rows={2}
                            value={isReplyingThis ? adminReplyInput : (selectedSupportMsg?.id === msg.id ? adminReplyInput : "")}
                            onChange={(e) => {
                              setSelectedSupportMsg(msg);
                              setAdminReplyInput(e.target.value);
                            }}
                            placeholder="Type solution for user... (e.g., Deposit of ‚Çπ500 verified & added to your wallet balance!)"
                            className="w-full p-2.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/80 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={isSubmittingReply}
                              onClick={() => handleSendAdminReply(msg.id, true)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Send Reply & Resolve Issue
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Logs tab */}
      {activeTab === "logs" && (
        <div className="flex flex-col gap-6">
          {/* Admin Security Audit Trail */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold uppercase font-display text-slate-800 dark:text-slate-100 tracking-wider">
                    Admin Security & Action Audit Trail ({auditLogs.length})
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Timestamped logs of logins, PIN verifications, approvals, adjustments & security lockouts
                  </p>
                </div>
              </div>
            </div>

            {auditLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 italic bg-slate-50/50 dark:bg-slate-950/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                No security audit logs recorded yet. All future admin activities will appear here automatically.
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                        log.status === "SUCCESS"
                          ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400"
                          : log.status === "BLOCKED" || log.status === "FAILED"
                          ? "bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400"
                          : "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400"
                      }`}>
                        <ShieldCheck className="h-4 w-4" />
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono font-bold text-[10.5px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-md">
                            {log.action}
                          </span>
                          <span className={`px-1.5 py-0.5 text-[9.5px] font-extrabold rounded-md uppercase font-mono ${
                            log.status === "SUCCESS"
                              ? "bg-emerald-500 text-white"
                              : log.status === "BLOCKED"
                              ? "bg-amber-500 text-white"
                              : "bg-rose-500 text-white"
                          }`}>
                            {log.status}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            By: {log.adminEmail || "Admin"}
                          </span>
                        </div>

                        <p className="text-slate-700 dark:text-slate-300 font-medium text-[11px] mt-0.5">
                          {log.details}
                        </p>

                        <div className="flex items-center gap-3 text-[9.5px] text-slate-400 font-mono mt-1">
                          <span>IP/Device: {log.ipAddress || log.userAgent || "Local Web Client"}</span>
                          {log.targetUserId && <span>Target User: {log.targetUserId}</span>}
                          {log.amount !== undefined && <span className="font-bold text-indigo-500">Amount: ‚Çπ{log.amount}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono text-slate-400 block">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </span>
                      <span className="text-[10.5px] font-mono font-bold text-slate-600 dark:text-slate-300 block">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Real-Time Wallet Transactions Audit */}
          <div className="flex flex-col gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase font-display text-slate-800 dark:text-slate-100 tracking-wider flex items-center gap-2">
                <span>Trader Wallet Transactions Audit</span>
                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 rounded-full text-[10px] font-mono font-bold">
                  {Array.from(new Map(walletTransactions.map((tx: WalletTransaction) => [tx.id, tx])).values()).length} Total Logs
                </span>
              </h3>
            </div>

            {walletTransactions.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-4">No transactions logged yet.</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto overflow-x-auto pr-1.5 p-1 scrollbar-thin border border-slate-200/60 dark:border-slate-800/60 rounded-xl bg-slate-50/30 dark:bg-slate-950/30">
                {Array.from(new Map(walletTransactions.map((tx: WalletTransaction) => [tx.id, tx])).values()).map((tx: WalletTransaction) => (
                  <div
                    key={tx.id}
                    className="p-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs flex justify-between items-start shadow-2xs hover:border-indigo-500/30 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{tx.userName}</span>
                        <span className="text-slate-400 font-mono text-[10px] truncate max-w-[120px]">({tx.id})</span>
                      </div>
                      <span className="text-slate-500 dark:text-slate-400 block mt-0.5">
                        {tx.type} ‚Ä¢ Status: <strong className={`uppercase font-mono text-[10px] ${
                          tx.status === "PENDING" ? "text-amber-500 font-bold" : tx.status === "APPROVED" ? "text-emerald-500 font-bold" : "text-slate-400"
                        }`}>{tx.status}</strong>
                      </span>
                      {tx.txDetails && (
                        <span className="text-indigo-500 dark:text-indigo-400 block mt-0.5 italic text-[11px]">
                          Ref: {tx.txDetails}
                        </span>
                      )}
                      
                      {/* Transaction Status Management / Correction Action Buttons */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {tx.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleApproveTx(tx.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs"
                              title="Approve transaction"
                            >
                              <Check className="h-3 w-3" /> Approve
                            </button>
                            <button
                              onClick={() => handleRejectTx(tx.id)}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs"
                              title="Reject transaction"
                            >
                              <X className="h-3 w-3" /> Reject
                            </button>
                          </>
                        )}

                        {tx.status === "APPROVED" && (
                          <>
                            <button
                              onClick={() => handleCorrectTxStatus(tx.id, "REJECTED")}
                              className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300/60 dark:border-rose-800/60 hover:bg-rose-200 rounded text-[9.5px] font-extrabold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                              title="Correct mistake: change to Rejected and reverse balance"
                            >
                              <Edit3 className="h-2.5 w-2.5" /> Correct to Rejected
                            </button>
                            <button
                              onClick={() => handleCorrectTxStatus(tx.id, "PENDING")}
                              className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60 hover:bg-amber-200 rounded text-[9.5px] font-extrabold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                              title="Reset status back to Pending"
                            >
                              <RefreshCw className="h-2.5 w-2.5" /> Reset Pending
                            </button>
                          </>
                        )}

                        {tx.status === "REJECTED" && (
                          <>
                            <button
                              onClick={() => handleCorrectTxStatus(tx.id, "APPROVED")}
                              className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800/60 hover:bg-emerald-200 rounded text-[9.5px] font-extrabold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                              title="Correct mistake: change to Approved and apply balance"
                            >
                              <Check className="h-2.5 w-2.5" /> Correct to Approved
                            </button>
                            <button
                              onClick={() => handleCorrectTxStatus(tx.id, "PENDING")}
                              className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60 hover:bg-amber-200 rounded text-[9.5px] font-extrabold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                              title="Reset status back to Pending"
                            >
                              <RefreshCw className="h-2.5 w-2.5" /> Reset Pending
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end">
                      <span className={`font-bold font-mono text-sm ${
                        tx.type === "DEPOSIT" || tx.type === "TRADE_REFUND" || tx.type === "TRADE_PROFIT" || tx.type === "BONUS"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}>
                        ‚Çπ{tx.amount}
                      </span>
                      <div className="flex items-center gap-1 text-[9.5px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                        <Calendar className="h-2.5 w-2.5 text-indigo-500 shrink-0" />
                        <span>{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[9.5px] font-mono font-bold text-slate-700 dark:text-slate-300">
                        <Clock className="h-2.5 w-2.5 text-indigo-500 shrink-0" />
                        <span>{tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }) : "N/A"}</span>
                      </div>
                      {tx.updatedAt && (
                        <span className="text-[8.5px] text-slate-400 font-mono mt-0.5">
                          Updated: {new Date(tx.updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Solo Trading Engine Admin Control Tab */}
      {activeTab === "solo_trading" && (
        <div className="flex flex-col gap-6">
          
          {/* Master Engine Status (Admin Activation Switch) */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-3 rounded-2xl shrink-0 ${
                soloConfigState.isEnabled 
                  ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800"
                  : "bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800"
              }`}>
                <Power className="h-6 w-6" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Solo Binary Options Engine Master Switch
                  </h3>
                  <span className={`px-2.5 py-0.5 text-xs font-mono font-extrabold rounded-full ${
                    soloConfigState.isEnabled
                      ? "bg-emerald-500 text-white animate-pulse"
                      : "bg-amber-500 text-white"
                  }`}>
                    {soloConfigState.isEnabled ? "ACTIVE / AVAILABLE" : "INACTIVE / LOCKED"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Ye admin jab active kare tabhi user ke liye available ho. When deactivated, users cannot place any solo trades.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleSoloEngine}
              className={`px-5 py-3 rounded-xl font-extrabold text-xs shadow-lg transition-all cursor-pointer shrink-0 flex items-center justify-center gap-2 ${
                soloConfigState.isEnabled
                  ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-950/20"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-950/20"
              }`}
            >
              <Power className="h-4 w-4" />
              <span>{soloConfigState.isEnabled ? "DEACTIVATE SOLO ENGINE" : "ACTIVATE SOLO ENGINE FOR USERS"}</span>
            </button>
          </div>

          {/* Pattern Radar Button User Visibility Master Toggle */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-3 rounded-2xl shrink-0 ${
                soloConfigState.showPatternRadar !== false
                  ? "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-800"
                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700"
              }`}>
                <Sparkles className="h-6 w-6 text-amber-500" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    ‚ö° Pattern Radar Button (User Screen Visibility)
                  </h3>
                  <span className={`px-2.5 py-0.5 text-xs font-mono font-extrabold rounded-full ${
                    soloConfigState.showPatternRadar !== false
                      ? "bg-emerald-500 text-white"
                      : "bg-rose-500 text-white"
                  }`}>
                    {soloConfigState.showPatternRadar !== false ? "VISIBLE TO USERS" : "HIDDEN / DISABLED FOR USERS"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Admin yahan se user screen par "‚ö° Pattern Radar" button ko hide ya show kar sakta hai.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTogglePatternRadar}
              className={`px-5 py-3 rounded-xl font-extrabold text-xs shadow-lg transition-all cursor-pointer shrink-0 flex items-center justify-center gap-2 ${
                soloConfigState.showPatternRadar !== false
                  ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-950/20"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-950/20"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>
                {soloConfigState.showPatternRadar !== false
                  ? "HIDE PATTERN RADAR FOR USERS"
                  : "SHOW PATTERN RADAR FOR USERS"}
              </span>
            </button>
          </div>

          {/* Configuration Form & Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Solo Config Parameters Form (5 cols) */}
            <div className="lg:col-span-5 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Sliders className="h-5 w-5 text-indigo-500" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Solo Engine Rules & Payout Rates
                </h3>
              </div>

              <form onSubmit={handleSaveSoloConfig} className="space-y-4 text-xs">
                {/* Protected Mode Payout Rate */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Protected Mode Payout Rate (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="100"
                      value={editSoloProtectedPayoutPct}
                      onChange={(e) => setEditSoloProtectedPayoutPct(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold focus:outline-none focus:border-indigo-500 dark:text-white"
                      placeholder="e.g. 80"
                    />
                    <span className="absolute right-3 top-2 text-slate-400 font-mono font-bold">%</span>
                  </div>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                    1. Protected Mode ‚Äî REFUND STAKE WHEN DRAW TRADE (Return 100% of Stake to User)
                  </p>
                </div>

                {/* Standard Mode Payout Rate */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Standard Mode Payout Rate (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="100"
                      value={editSoloStandardPayoutPct}
                      onChange={(e) => setEditSoloStandardPayoutPct(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold focus:outline-none focus:border-indigo-500 dark:text-white"
                      placeholder="e.g. 85"
                    />
                    <span className="absolute right-3 top-2 text-slate-400 font-mono font-bold">%</span>
                  </div>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-1">
                    2. Standard Mode ‚Äî TREAT AS LOSS (Stake Forfeited)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Min Trade Stake (‚Çπ)
                    </label>
                    <input
                      type="number"
                      value={editSoloMinStake}
                      onChange={(e) => setEditSoloMinStake(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold focus:outline-none focus:border-indigo-500 dark:text-white"
                      placeholder="10"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Max Trade Stake (‚Çπ)
                    </label>
                    <input
                      type="number"
                      value={editSoloMaxStake}
                      onChange={(e) => setEditSoloMaxStake(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold focus:outline-none focus:border-indigo-500 dark:text-white"
                      placeholder="50000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Default Settlement Rule (Platform Fallback)
                  </label>
                  <select
                    value={editSoloDrawRule}
                    onChange={(e) => setEditSoloDrawRule(e.target.value as "REFUND" | "LOSS")}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold focus:outline-none focus:border-indigo-500 dark:text-white"
                  >
                    <option value="REFUND">1. Protected Mode ‚Äî REFUND STAKE WHEN DRAW TRADE (Return 100% of Stake to User)</option>
                    <option value="LOSS">2. Standard Mode ‚Äî TREAT AS LOSS (Stake Forfeited)</option>
                  </select>
                </div>

                {/* Pattern Radar Visibility Toggle in Form */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300 block">
                      ‚ö° Pattern Radar Button for Users
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Allow users to see and open the real-time candle pattern radar scanner
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditSoloShowPatternRadar(!editSoloShowPatternRadar)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      editSoloShowPatternRadar
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {editSoloShowPatternRadar ? "SHOW (ON)" : "HIDE (OFF)"}
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  <span>Save Solo Engine Rules</span>
                </button>
              </form>
            </div>

            {/* Platform Solo Engine Analytics (7 cols) */}
            <div className="lg:col-span-7 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Platform Solo Options Financial Summary
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400">Real-time</span>
              </div>

              {(() => {
                const totalSoloCount = allSoloTrades.length;
                const totalSoloVolume = allSoloTrades.reduce((sum, t) => sum + (t.stake || 0), 0);
                const totalPayoutsPaid = allSoloTrades
                  .filter((t) => t.status === "WON" || t.status === "DRAW")
                  .reduce((sum, t) => {
                    if (t.status === "WON") return sum + (t.expectedPayout || t.stake * 1.85);
                    return sum + t.stake;
                  }, 0);
                const platformNetProfit = totalSoloVolume - totalPayoutsPaid;

                return (
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block mb-1">
                        Total Solo Trades Placed
                      </span>
                      <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                        {totalSoloCount}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block mb-1">
                        Total Stake Volume (‚Çπ)
                      </span>
                      <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
                        ‚Çπ{totalSoloVolume.toFixed(2)}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block mb-1">
                        Total User Payouts Paid (‚Çπ)
                      </span>
                      <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
                        ‚Çπ{totalPayoutsPaid.toFixed(2)}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block mb-1">
                        Admin Net Margin (‚Çπ)
                      </span>
                      <span className={`text-xl font-extrabold ${platformNetProfit >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        {platformNetProfit >= 0 ? "+" : ""}‚Çπ{platformNetProfit.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

          </div>

          {/* Admin Expiry Durations Management Section */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 text-amber-500 rounded-xl border border-amber-500/30">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Manage Solo Option Expiry Durations (Global & Mode-Wise)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configure available trade expiration times globally or specifically for Protected / Standard trade modes
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetDefaultDurations}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reset All Default Durations</span>
              </button>
            </div>

            {/* Mode Tabs for Expiry Durations */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex-wrap">
              <button
                type="button"
                onClick={() => setGlobalDurationModeTab("GLOBAL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  globalDurationModeTab === "GLOBAL"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>üåê Global Fallback</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-900/40 text-slate-200">
                  {(soloConfigState.allowedDurations || [15, 30, 60, 180, 300]).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setGlobalDurationModeTab("PROTECTED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  globalDurationModeTab === "PROTECTED"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>üõ°Ô∏è Protected Mode</span>
                {soloConfigState.protectedAllowedDurations && soloConfigState.protectedAllowedDurations.length > 0 ? (
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                    Custom ({soloConfigState.protectedAllowedDurations.length})
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-400">
                    Inherited
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setGlobalDurationModeTab("STANDARD")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  globalDurationModeTab === "STANDARD"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>‚ö° Standard Mode</span>
                {soloConfigState.standardAllowedDurations && soloConfigState.standardAllowedDurations.length > 0 ? (
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-950/80 text-amber-300 border border-amber-500/30">
                    Custom ({soloConfigState.standardAllowedDurations.length})
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-400">
                    Inherited
                  </span>
                )}
              </button>
            </div>

            {/* Active Durations Chips List */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Active Durations for {globalDurationModeTab === "GLOBAL" ? "Global Platform Default" : globalDurationModeTab === "PROTECTED" ? "Protected Mode" : "Standard Mode"} ({getGlobalTabDurations().length})
                </label>

                {globalDurationModeTab !== "GLOBAL" && (
                  ((globalDurationModeTab === "PROTECTED" && soloConfigState.protectedAllowedDurations && soloConfigState.protectedAllowedDurations.length > 0) ||
                   (globalDurationModeTab === "STANDARD" && soloConfigState.standardAllowedDurations && soloConfigState.standardAllowedDurations.length > 0)) ? (
                    <button
                      type="button"
                      onClick={handleClearGlobalModeDurationOverride}
                      className="text-xs text-rose-400 hover:underline font-bold cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Clear {globalDurationModeTab} Mode Override (Use Global Default)</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-emerald-400 font-mono font-bold">
                      ‚úì Inheriting Global Default List
                    </span>
                  )
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 max-h-52 overflow-y-auto overflow-x-auto p-2.5 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800/80 rounded-xl scrollbar-thin">
                {getGlobalTabDurations().map((durSec, idx) => {
                  const isEditing = editingDurationIndex === idx;
                  const formattedLabel = formatDurationLabel(durSec);

                  if (isEditing) {
                    return (
                      <div key={idx} className="flex items-center gap-1 bg-indigo-950/80 border border-indigo-500 p-1 rounded-xl">
                        <input
                          type="number"
                          value={editingDurationVal}
                          onChange={(e) => setEditingDurationVal(e.target.value)}
                          placeholder="Sec"
                          className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white focus:outline-none"
                          autoFocus
                        />
                        <span className="text-[10px] text-slate-400 font-mono">s</span>
                        <button
                          type="button"
                          onClick={() => handleSaveEditDuration(durSec)}
                          className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer"
                          title="Save Duration"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingDurationIndex(null)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                          title="Cancel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs font-mono"
                    >
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-amber-400" />
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                          {formattedLabel}
                        </span>
                        <span className="text-[10px] text-slate-400">({durSec}s)</span>
                      </div>

                      <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDurationIndex(idx);
                            setEditingDurationVal(durSec.toString());
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-400 rounded cursor-pointer transition-colors"
                          title="Edit Duration"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDuration(durSec)}
                          className="p-1 text-slate-400 hover:text-rose-400 rounded cursor-pointer transition-colors"
                          title="Delete Duration"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add New Expiry Form */}
            <form onSubmit={handleAddDuration} className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Add Duration to {globalDurationModeTab}:</span>
                <input
                  type="number"
                  min="1"
                  max="86400"
                  value={newDurationSec}
                  onChange={(e) => setNewDurationSec(e.target.value)}
                  placeholder="e.g. 120 or 600"
                  className="w-32 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs font-bold focus:outline-none focus:border-indigo-500 dark:text-white"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>

              {/* Quick Presets Buttons */}
              <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 shrink-0 scrollbar-none ml-auto">
                <span className="text-[10px] text-slate-400 font-mono shrink-0">Quick:</span>
                {[10, 15, 30, 45, 60, 120, 180, 300, 600].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setNewDurationSec(preset.toString())}
                    className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-[10px] font-mono font-bold dark:text-slate-200 cursor-pointer shrink-0"
                  >
                    {formatDurationLabel(preset)}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-1 ml-auto"
              >
                <Plus className="h-4 w-4" />
                <span>Add Duration</span>
              </button>
            </form>
          </div>

          {/* Admin Trading Pair Management & Real-Time Sync Section */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/20 text-indigo-500 rounded-xl border border-indigo-500/30">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Manage Solo Trading Pairs & Live Sync
                  </h3>
                  <p className="text-xs text-slate-400">
                    Add custom pairs with TradingView symbol & sub-second Binance WebSocket live feed matching
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetDefaultPairs}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reset Default Pairs</span>
              </button>
            </div>

            {/* Category Management Section */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
                    <Sliders className="h-4 w-4 text-indigo-500" />
                    Asset Categories ({((soloConfigState.categories && soloConfigState.categories.length > 0) ? soloConfigState.categories : DEFAULT_SOLO_CATEGORIES).length})
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Add, edit, or delete trading categories. Updating or deleting reassigns asset pairs seamlessly.
                  </p>
                </div>

                {/* Form to Add New Category */}
                <form onSubmit={handleAddCategory} className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="New Category Name (e.g. Stocks, Futures)..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 dark:text-white w-full sm:w-60"
                  />
                  <button
                    type="submit"
                    disabled={isSavingCategory}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1 text-xs shrink-0 disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Category</span>
                  </button>
                </form>
              </div>

              {/* Active Categories List */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {((soloConfigState.categories && soloConfigState.categories.length > 0) ? soloConfigState.categories : DEFAULT_SOLO_CATEGORIES).map((cat) => {
                  const isEditing = editingCategoryOldName === cat;
                  const currentAssets = (soloConfigState.customAssets && soloConfigState.customAssets.length > 0) ? soloConfigState.customAssets : SUPPORTED_SOLO_ASSETS;
                  const pairCount = currentAssets.filter((a) => a.category === cat).length;

                  if (isEditing) {
                    return (
                      <div key={cat} className="flex items-center gap-1.5 p-1.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-500/50 rounded-xl text-xs">
                        <input
                          type="text"
                          value={editingCategoryNewName}
                          onChange={(e) => setEditingCategoryNewName(e.target.value)}
                          className="px-2 py-1 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditCategory(cat)}
                          disabled={isSavingCategory}
                          className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all cursor-pointer"
                          title="Save Category Name"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCategoryOldName(null)}
                          className="p-1 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-all cursor-pointer"
                          title="Cancel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  }

                  if (deletingCategoryConfirmName === cat) {
                    return (
                      <div key={cat} className="flex items-center gap-1.5 p-1.5 bg-rose-50 dark:bg-rose-950/80 border border-rose-500/50 rounded-xl text-xs font-bold animate-fadeIn">
                        <span className="text-rose-600 dark:text-rose-300 text-[11px] font-semibold pl-1">Delete #{cat}?</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          disabled={isSavingCategory}
                          className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-all cursor-pointer text-[10px] font-extrabold"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCategoryConfirmName(null)}
                          className="p-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={cat}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs group"
                    >
                      <span className="font-mono text-indigo-500 dark:text-indigo-400">#{cat}</span>
                      <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.2 rounded-md">
                        {pairCount} {pairCount === 1 ? "pair" : "pairs"}
                      </span>

                      <div className="flex items-center gap-1 ml-1 border-l border-slate-200 dark:border-slate-800 pl-1.5">
                        <button
                          type="button"
                          onClick={() => handleStartEditCategory(cat)}
                          className="p-0.5 text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer"
                          title={`Edit "${cat}" category`}
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCategoryConfirmName(cat)}
                          className="p-0.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title={`Delete "${cat}" category`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Currently Active Trading Pairs Grid with Price Fix Controls */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Active Trading Pairs ({((soloConfigState.customAssets && soloConfigState.customAssets.length > 0) ? soloConfigState.customAssets : SUPPORTED_SOLO_ASSETS).length})
                </label>
                <span className="text-[11px] text-slate-400 font-medium">
                  Click <strong className="text-indigo-400 font-bold">Fix Price</strong> to manually align any mismatched market price
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {((soloConfigState.customAssets && soloConfigState.customAssets.length > 0) ? soloConfigState.customAssets : SUPPORTED_SOLO_ASSETS).map((asset) => {
                  const curLivePrice = livePriceService.getPrice(asset.symbol) || asset.basePrice;
                  const isOverride = livePriceService.getManualOverride(asset.symbol) !== null;
                  const isEditing = editingPairSymbol === asset.symbol;

                  return (
                    <div key={asset.symbol} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between gap-2.5 shadow-2xs">
                      {/* Pair Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-xs text-slate-900 dark:text-white font-mono">{asset.pair}</span>
                            <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase">{asset.category}</span>
                            {asset.disabled ? (
                              <span className="bg-rose-500/15 text-rose-500 border border-rose-500/30 px-1.5 py-0.2 rounded text-[9px] font-black uppercase flex items-center gap-0.5">
                                <EyeOff className="h-2.5 w-2.5" /> Disabled
                              </span>
                            ) : (
                              <span className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 px-1.5 py-0.2 rounded text-[9px] font-black uppercase flex items-center gap-0.5">
                                <Check className="h-2.5 w-2.5" /> Active
                              </span>
                            )}
                            {isOverride && (
                              <span className="bg-amber-500/15 text-amber-500 border border-amber-500/30 px-1 py-0.2 rounded text-[9px] font-black uppercase flex items-center gap-0.5">
                                <Lock className="h-2.5 w-2.5" /> Fixed
                              </span>
                            )}
                            {(asset.allowedDurations?.length || asset.protectedAllowedDurations?.length || asset.standardAllowedDurations?.length) ? (
                              <span className="bg-amber-500/15 text-amber-500 border border-amber-500/30 px-1.5 py-0.2 rounded text-[9px] font-bold flex items-center gap-0.5" title="Has custom pair or mode expiry durations">
                                <Clock className="h-2.5 w-2.5" /> Custom Expiries
                              </span>
                            ) : null}
                          </div>
                          <div className="text-[10px] font-mono mt-1 flex items-center justify-between gap-1 flex-wrap">
                            <span className="text-emerald-500 font-bold">üõ°Ô∏è Prot: {asset.protectedPayoutPercentage ?? soloConfigState.protectedPayoutPercentage ?? 80}%</span>
                            <span className="text-indigo-400 font-bold">‚ö° Std: {asset.standardPayoutPercentage ?? asset.payoutPercentage ?? 85}%</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleCustomPairDisabled(asset.symbol)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              asset.disabled
                                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
                                : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30"
                            }`}
                            title={asset.disabled ? "Enable Trading for this Pair" : "Disable Trading for this Pair"}
                          >
                            {asset.disabled ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Enable</span>
                              </>
                            ) : (
                              <>
                                <Power className="h-3 w-3" />
                                <span>Disable</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAutoSyncPairPrice(asset.symbol)}
                            disabled={isFixingPrice}
                            className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-all cursor-pointer"
                            title="Auto-Fetch Live Market Quote"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${isFixingPrice ? "animate-spin text-indigo-500" : ""}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomPair(asset.symbol)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                            title="Remove Trading Pair"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Current Price Display & Fix Trigger */}
                      {!isEditing ? (
                        <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Live Market Price</span>
                            <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
                              {formatAssetPrice(curLivePrice, asset.pair, asset.decimals)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenPairDurationsModal(asset)}
                              className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-lg text-[10px] font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                              title="Set pair-wise and mode-wise expiry durations"
                            >
                              <Clock className="h-3 w-3" />
                              <span>Expiries</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStartEditPair(asset)}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <Wrench className="h-3 w-3" />
                              <span>Fix Price</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Quick Edit Input Form */
                        <div className="pt-2 border-t border-indigo-500/30 space-y-2 bg-indigo-50/50 dark:bg-indigo-950/30 p-2.5 rounded-xl text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 font-mono">Edit Pair Details</span>
                            <button
                              type="button"
                              onClick={() => setEditingPairSymbol(null)}
                              className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer p-0.5"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="space-y-1.5">
                            <div>
                              <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">Pair Display Name</label>
                              <input
                                type="text"
                                value={editingPairName}
                                onChange={(e) => setEditingPairName(e.target.value)}
                                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-500 dark:text-white"
                                placeholder="e.g. US 100 (Nasdaq 100)"
                              />
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400">TradingView Symbol</label>
                                <button
                                  type="button"
                                  onClick={() => handleAutoSyncPairPrice(editingPairTvSymbol.trim())}
                                  className="text-[9px] text-indigo-500 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                                  title="Detect live price for TV Symbol"
                                >
                                  <RefreshCw className="h-2.5 w-2.5" /> Detect Price
                                </button>
                              </div>
                              <input
                                type="text"
                                value={editingPairTvSymbol}
                                onChange={(e) => setEditingPairTvSymbol(e.target.value)}
                                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-indigo-500 dark:text-white uppercase"
                                placeholder="e.g. CURRENCYCOM:US100"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-1.5">
                              <div>
                                <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">Category</label>
                                <select
                                  value={editingPairCategory}
                                  onChange={(e) => setEditingPairCategory(e.target.value)}
                                  className="w-full px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-[10px] font-bold focus:outline-none focus:border-indigo-500 dark:text-white"
                                >
                                  {((soloConfigState.categories && soloConfigState.categories.length > 0) ? soloConfigState.categories : DEFAULT_SOLO_CATEGORIES).map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">Price (‚Çπ)</label>
                                <input
                                  type="number"
                                  step="any"
                                  value={editingPairPrice}
                                  onChange={(e) => setEditingPairPrice(e.target.value)}
                                  className="w-full px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-[11px] font-mono font-bold focus:outline-none focus:border-indigo-500 dark:text-white"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5">
                              <div>
                                <label className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">Protected Payout %</label>
                                <input
                                  type="number"
                                  value={editingPairProtectedPayout}
                                  onChange={(e) => setEditingPairProtectedPayout(e.target.value)}
                                  className="w-full px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-[11px] font-mono font-bold focus:outline-none focus:border-indigo-500 text-emerald-600 dark:text-emerald-400"
                                />
                              </div>

                              <div>
                                <label className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 block mb-0.5">Standard Payout %</label>
                                <input
                                  type="number"
                                  value={editingPairStandardPayout}
                                  onChange={(e) => setEditingPairStandardPayout(e.target.value)}
                                  className="w-full px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-[11px] font-mono font-bold focus:outline-none focus:border-indigo-500 text-indigo-600 dark:text-indigo-400"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => handleSavePairPriceFix(asset.symbol, false)}
                              disabled={isFixingPrice}
                              className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1"
                              title="Save pair details & base price"
                            >
                              <Check className="h-3 w-3" /> Save
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSavePairPriceFix(asset.symbol, true)}
                              disabled={isFixingPrice}
                              className="flex-1 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1"
                              title="Lock price override so ticker won't alter it"
                            >
                              <Lock className="h-3 w-3" /> Lock Price
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form to Add New Custom Trading Pair */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
                <Plus className="h-4 w-4 text-emerald-500" />
                Add New Custom Trading Pair
              </h4>

              <form onSubmit={handleAddCustomPair} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Pair Name
                  </label>
                  <input
                    type="text"
                    placeholder="DOGE / USDT (Dogecoin)"
                    value={newPairName}
                    onChange={(e) => setNewPairName(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold focus:outline-none focus:border-indigo-500 dark:text-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-600 dark:text-slate-400">
                      TradingView Symbol
                    </label>
                    <button
                      type="button"
                      onClick={handleDetectLivePrice}
                      disabled={isDetectingPrice}
                      className="text-[10px] text-amber-500 hover:text-amber-400 font-extrabold flex items-center gap-1 cursor-pointer bg-amber-500/10 hover:bg-amber-500/20 px-1.5 py-0.5 rounded transition-all disabled:opacity-50"
                      title="Fetch live market price directly from TradingView/Binance/Forex feed"
                    >
                      {isDetectingPrice ? <RefreshCw className="h-3 w-3 animate-spin text-amber-400" /> : <Zap className="h-3 w-3 text-amber-400" />}
                      <span>{isDetectingPrice ? "Detecting..." : "Detect Live Price"}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="BINANCE:DOGEUSDT"
                    value={newPairSymbol}
                    onChange={(e) => setNewPairSymbol(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold focus:outline-none focus:border-indigo-500 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={newPairCategory}
                    onChange={(e) => setNewPairCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold focus:outline-none focus:border-indigo-500 dark:text-white"
                  >
                    {((soloConfigState.categories && soloConfigState.categories.length > 0) ? soloConfigState.categories : DEFAULT_SOLO_CATEGORIES).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Initial Base Price (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Auto TradingView Live Feed"
                    value={newPairBasePrice}
                    onChange={(e) => setNewPairBasePrice(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold focus:outline-none focus:border-indigo-500 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                    Protected Payout (%)
                  </label>
                  <input
                    type="number"
                    placeholder="80"
                    value={newPairProtectedPayout}
                    onChange={(e) => setNewPairProtectedPayout(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold focus:outline-none focus:border-indigo-500 text-emerald-600 dark:text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                    Standard Payout (%)
                  </label>
                  <input
                    type="number"
                    placeholder="85"
                    value={newPairStandardPayout}
                    onChange={(e) => setNewPairStandardPayout(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold focus:outline-none focus:border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Pair</span>
                  </button>
                </div>
              </form>

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-400">Quick Presets:</span>
                {[
                  { name: "DOGE / USDT (Dogecoin)", symbol: "BINANCE:DOGEUSDT", category: "Crypto", payout: "85" },
                  { name: "XRP / USDT (Ripple)", symbol: "BINANCE:XRPUSDT", category: "Crypto", payout: "85" },
                  { name: "EUR / GBP (Euro/Pound)", symbol: "FX:EURGBP", category: "Forex", payout: "82" },
                  { name: "XAG / USD (Silver)", symbol: "TVC:SILVER", category: "Metals", payout: "85" },
                  { name: "US 500 (S&P 500)", symbol: "GLOBALPRIME:SPX500", category: "Indices", payout: "85" },
                  { name: "US 100 (Nasdaq)", symbol: "GLOBALPRIME:NAS100", category: "Indices", payout: "85" },
                  { name: "INDIA 50 (Nifty)", symbol: "NSE:NIFTY", category: "Indices", payout: "85" }
                ].map((preset) => (
                  <button
                    key={preset.symbol}
                    type="button"
                    onClick={() => {
                      setNewPairName(preset.name);
                      setNewPairSymbol(preset.symbol);
                      setNewPairCategory(preset.category as any);
                      setNewPairProtectedPayout("80");
                      setNewPairStandardPayout(preset.payout);
                      livePriceService.fetchLivePriceForSymbol(preset.symbol).then((p) => {
                        if (p && p > 0) setNewPairBasePrice(p.toString());
                      });
                    }}
                    className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-500/20 text-slate-600 dark:text-slate-300 hover:text-indigo-400 border border-slate-200 dark:border-slate-700 rounded-lg transition-all cursor-pointer"
                  >
                    + {preset.name.split(" ")[0]}
                  </button>
                ))}
              </div>

              <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[11px] text-indigo-300 font-mono leading-tight flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                <span>
                  <strong>‚ö° Live Price & Chart Match:</strong> Admin supports adding ANY TradingView symbol (e.g. <code>BINANCE:DOGEUSDT</code>, <code>FX:EURUSD</code>, <code>OANDA:XAUUSD</code>, <code>NASDAQ:AAPL</code>). Charts and live price feeds sync automatically!
                </span>
              </div>
            </div>
          </div>

          {/* Live Candlestick Pattern Engine Controller (Hammer, Doji, Shooting Star, etc. in Real-Time) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <div>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                  User Pattern Radar Status
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  User Screen State: <strong className={soloConfigState.showPatternRadar !== false ? "text-emerald-500" : "text-rose-500"}>{soloConfigState.showPatternRadar !== false ? "VISIBLE TO USERS" : "HIDDEN FROM USERS"}</strong>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTogglePatternRadar}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                soloConfigState.showPatternRadar !== false
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{soloConfigState.showPatternRadar !== false ? "Hide From Users" : "Show To Users"}</span>
            </button>
          </div>

          <LiveCandlePatternController />

          {/* All Solo Trades Audit Table */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  All Solo Options Trades Audit Log ({allSoloTrades.length})
                </h3>
                <p className="text-xs text-slate-400">Every individual call/put option created across all users</p>
              </div>

              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search user, pair, trade ID..."
                  value={soloSearchQuery}
                  onChange={(e) => setSoloSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono focus:outline-none focus:border-indigo-500 dark:text-white"
                />
              </div>
            </div>

            {allSoloTrades.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                No solo trades executed yet.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[450px] overflow-y-auto scrollbar-thin border border-slate-100 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-slate-500 shadow-xs">
                      <th className="p-2.5">User</th>
                      <th className="p-2.5">Asset</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Stake</th>
                      <th className="p-2.5">Entry Price</th>
                      <th className="p-2.5">Exit Price</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">P/L</th>
                      <th className="p-2.5 text-emerald-600 dark:text-emerald-400">Entry Time (‡§™‡•ç‡§∞‡§µ‡•á‡§∂)</th>
                      <th className="p-2.5 text-amber-600 dark:text-amber-400">Exit Time (‡§∏‡§Æ‡§æ‡§™‡•ç‡§§‡§ø)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {allSoloTrades
                      .filter((t) => {
                        if (!soloSearchQuery) return true;
                        const q = soloSearchQuery.toLowerCase();
                        return (
                          t.userEmail?.toLowerCase().includes(q) ||
                          t.userName?.toLowerCase().includes(q) ||
                          t.assetPair?.toLowerCase().includes(q) ||
                          t.id?.toLowerCase().includes(q)
                        );
                      })
                      .map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100">
                            {t.userName || t.userEmail}
                          </td>
                          <td className="p-2.5 font-extrabold text-indigo-600 dark:text-indigo-400">
                            {t.assetPair}
                          </td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded uppercase ${
                              t.tradeType === "CALL"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                            }`}>
                              {t.tradeType}
                            </span>
                          </td>
                          <td className="p-2.5 font-bold">‚Çπ{t.stake}</td>
                          <td className="p-2.5">{formatAssetPrice(t.entryPrice, t.assetPair || t.tradingSymbol)}</td>
                          <td className="p-2.5">{t.exitPrice !== null && t.exitPrice !== undefined ? formatAssetPrice(t.exitPrice, t.assetPair || t.tradingSymbol) : "RUNNING..."}</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded uppercase ${
                              t.status === "WON"
                                ? "bg-emerald-500 text-white"
                                : t.status === "RUNNING"
                                ? "bg-amber-500 text-white animate-pulse"
                                : t.status === "DRAW"
                                ? "bg-slate-600 text-white"
                                : "bg-rose-500 text-white"
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className={`p-2.5 font-extrabold ${
                            (t.profitOrLoss || 0) > 0
                              ? "text-emerald-500"
                              : (t.profitOrLoss || 0) < 0
                              ? "text-rose-500"
                              : "text-slate-400"
                          }`}>
                            {(t.profitOrLoss || 0) >= 0 ? "+" : ""}‚Çπ{(t.profitOrLoss || 0).toFixed(2)}
                          </td>
                          <td className="p-2.5 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {new Date(t.startTime).toLocaleTimeString()}
                          </td>
                          <td className="p-2.5 text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
                            {t.endTime ? new Date(t.endTime || t.settledAt).toLocaleTimeString() : "RUNNING..."}
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

      {/* Edit Pool Modal */}
      {editingPool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl max-w-lg w-full flex flex-col gap-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Edit Trade Pool Parameters
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    ID: {editingPool.id} ‚Ä¢ Status: {editingPool.status}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingPool(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                  Asset Pair Name
                </label>
                <input
                  type="text"
                  value={editAssetPair}
                  onChange={(e) => setEditAssetPair(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                  placeholder="e.g. BTC / USDT (Bitcoin) or BANKNIFTY"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                  TradingView Symbol (Chart Embed)
                </label>
                <input
                  type="text"
                  value={editTradingSymbol}
                  onChange={(e) => setEditTradingSymbol(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-xs focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                  placeholder="e.g. BINANCE:BTCUSDT, FX:EURUSD"
                />
              </div>

              {!editingPool.isFreePool && (
                <>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                      Target Amount (‚Çπ)
                    </label>
                    <input
                      type="number"
                      value={editTargetAmount}
                      onChange={(e) => setEditTargetAmount(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                      Min Contribution (‚Çπ)
                    </label>
                    <input
                      type="number"
                      value={editMinContribution}
                      onChange={(e) => setEditMinContribution(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                    />
                  </div>
                </>
              )}

              {editingPool.isFreePool && (
                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                    Free Win Reward Amount (‚Çπ)
                  </label>
                  <input
                    type="number"
                    value={editFreeRewardAmount}
                    onChange={(e) => setEditFreeRewardAmount(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                  Expected ROI / Return (%)
                </label>
                <input
                  type="number"
                  value={editExpectedReturn}
                  onChange={(e) => setEditExpectedReturn(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                  Position Outlook Type
                </label>
                <select
                  value={editTradeType}
                  onChange={(e) => setEditTradeType(e.target.value as "CALL" | "PUT")}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                >
                  <option value="CALL">üü¢ CALL (Bullish)</option>
                  <option value="PUT">üî¥ PUT (Bearish)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                  Risk Level (‡§ú‡•ã‡§ñ‡§ø‡§Æ ‡§∏‡•ç‡§§‡§∞)
                </label>
                <select
                  value={editRiskLevel}
                  onChange={(e) => setEditRiskLevel(e.target.value as RiskLevel)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                >
                  <option value="NO_RISK">üõ°Ô∏è No Risk (0% Loss)</option>
                  <option value="LOW">üü¶ Low Risk</option>
                  <option value="MEDIUM">üü® Medium Risk</option>
                  <option value="HIGH">‚ö° High Risk</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                  Scheduled Execution Time Info
                </label>
                <input
                  type="text"
                  value={editScheduledTime}
                  onChange={(e) => setEditScheduledTime(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-medium focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                  placeholder="e.g. Today at 03:30 PM (5-Min Candle)"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingPool(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={handleSavePoolEdit}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingEdit ? (
                  <span>Saving Updates...</span>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Save Pool Updates</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Direct Message to User Modal */}
      {isDirectMsgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl max-w-md w-full flex flex-col gap-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Send Direct Message to User
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Deliver official notice or response directly to the user's inbox
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDirectMsgModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSendDirectMessage} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                  Select Recipient User
                </label>
                <select
                  value={directMsgUserId}
                  onChange={(e) => setDirectMsgUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                >
                  <option value="">-- Select User --</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email}) - Bal: ‚Çπ{(u.balance ?? 0).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                  Message Subject / Title
                </label>
                <input
                  type="text"
                  value={directMsgSubject}
                  onChange={(e) => setDirectMsgSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:outline-none focus:border-indigo-500 dark:text-slate-200"
                  placeholder="e.g. Account Notice / Deposit Update"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                  Message Content for User
                </label>
                <textarea
                  required
                  rows={4}
                  value={directMsgText}
                  onChange={(e) => setDirectMsgText(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium focus:outline-none focus:border-indigo-500 dark:text-slate-200 resize-none"
                  placeholder="Type your official message or announcement for this user..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDirectMsgModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSendingDirectMsg}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSendingDirectMsg ? (
                    <span>Sending Message...</span>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Send Message to User</span>
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Database Lifecycle & Archiving Control Tab */}
      {activeTab === "archive" && (
        <div className="flex flex-col gap-6">
          {/* Section Header & Strategy Overview */}
          <div className="p-5 bg-slate-900 dark:bg-slate-950 text-white rounded-2xl shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 rounded-2xl shrink-0">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-white font-display">
                    Database Scalability & Auto-Archiving Engine
                  </h3>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold rounded-full">
                    ACTIVE 12M / ARCHIVE 24M
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Keeps active trading lightweight by keeping the latest <strong>12 months</strong> of completed trade & transaction history in active collections. Completed records older than 12 months are automatically isolated into high-performance read-only archive collections, and archived records older than <strong>24 months</strong> are permanently purged.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsRunArchiveModalOpen(true)}
              disabled={isArchiveRunning}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
            >
              {isArchiveRunning ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Running Sync...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>Run Lifecycle Sync Now</span>
                </>
              )}
            </button>
          </div>

          {archiveNotice && (
            <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>{archiveNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setArchiveNotice(null)}
                className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Database Health Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Metric Card 1: Active Collections */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="h-4 w-4 text-emerald-500" />
                  Active Database (0-12 Mo)
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px] font-mono font-bold">
                  Fast
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                    {archiveHealthStats ? archiveHealthStats.activeTxCount : "..."}
                  </div>
                  <div className="text-[11px] text-slate-500">Active Wallet Transactions</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                    {archiveHealthStats ? archiveHealthStats.activeSoloTradesCount : "..."}
                  </div>
                  <div className="text-[11px] text-slate-500">Active Solo Trades</div>
                </div>
              </div>
            </div>

            {/* Metric Card 2: Archive Collections */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Archive className="h-4 w-4 text-indigo-500" />
                  Archive Store (12-24 Mo)
                </span>
                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-full text-[10px] font-mono font-bold">
                  Read-Only
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <div>
                  <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                    {archiveHealthStats ? archiveHealthStats.archivedTxCount : "..."}
                  </div>
                  <div className="text-[11px] text-slate-500">Archived Transactions</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                    {archiveHealthStats ? archiveHealthStats.archivedSoloTradesCount : "..."}
                  </div>
                  <div className="text-[11px] text-slate-500">Archived Solo Trades</div>
                </div>
              </div>
            </div>

            {/* Metric Card 3: HR & Payroll System Store */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-purple-500" />
                  HR & Payroll Vault (Permanent)
                </span>
                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded-full text-[10px] font-mono font-bold">
                  Compliant
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <div>
                  <div className="text-lg font-extrabold text-purple-600 dark:text-purple-400 font-mono">
                    {archiveHealthStats?.hrEmployeesCount ?? "..."}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">Staff Records</div>
                </div>
                <div>
                  <div className="text-lg font-extrabold text-purple-600 dark:text-purple-400 font-mono">
                    {archiveHealthStats?.hrPayslipsCount ?? "..."}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">Payslips Saved</div>
                </div>
                <div>
                  <div className="text-lg font-extrabold text-purple-600 dark:text-purple-400 font-mono">
                    {archiveHealthStats?.hrAuditLogsCount ?? "..."}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">Audit Trail</div>
                </div>
              </div>
            </div>

            {/* Metric Card 4: Auto Cleanup Policy */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-amber-500" />
                  Safety & Retention Guarantee
                </span>
                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded-full text-[10px] font-mono font-bold">
                  Protected
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                üîí <strong>Zero Loss:</strong> HR profiles, payroll runs, payslips, and tax audit logs are stored in protected compliance collections with permanent retention.
              </p>
              <div className="text-[10px] text-slate-400 font-mono">
                Last Auto Check: {archiveHealthStats?.lastRunAt ? new Date(archiveHealthStats.lastRunAt).toLocaleString() : "Recently"}
              </div>
            </div>
          </div>

          {/* Sub-Tabs for Archive Navigation */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setArchiveSubTab("transactions");
                  setArchivedTxPage(1);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  archiveSubTab === "transactions"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Archived Transactions ({archivedTxTotalCount})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setArchiveSubTab("trades");
                  setArchivedTradesPage(1);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  archiveSubTab === "trades"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span>Archived Solo Trades ({archivedTradesTotalCount})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                loadArchiveHealth();
                if (archiveSubTab === "transactions") loadArchivedTxData();
                else loadArchivedTradesData();
              }}
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl transition-all cursor-pointer"
              title="Refresh archive records"
            >
              <RefreshCw className={`h-4 w-4 ${isArchivedTxLoading || isArchivedTradesLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Sub-Tab 1: Archived Transactions View */}
          {archiveSubTab === "transactions" && (
            <div className="flex flex-col gap-4">
              {/* Filter Controls Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <div className="relative">
                  <input
                    type="text"
                    value={archivedTxSearch}
                    onChange={(e) => {
                      setArchivedTxSearch(e.target.value);
                      setArchivedTxPage(1);
                    }}
                    placeholder="Search User / Tx ID / Ref..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                  />
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                </div>

                <select
                  value={archivedTxType}
                  onChange={(e) => {
                    setArchivedTxType(e.target.value);
                    setArchivedTxPage(1);
                  }}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Types</option>
                  <option value="DEPOSIT">DEPOSIT</option>
                  <option value="WITHDRAWAL">WITHDRAWAL</option>
                  <option value="BONUS">BONUS</option>
                  <option value="TRADE_PROFIT">TRADE_PROFIT</option>
                  <option value="TRADE_LOSS">TRADE_LOSS</option>
                  <option value="TRADE_REFUND">TRADE_REFUND</option>
                  <option value="ADJUSTMENT">ADJUSTMENT</option>
                </select>

                <select
                  value={archivedTxStatus}
                  onChange={(e) => {
                    setArchivedTxStatus(e.target.value);
                    setArchivedTxPage(1);
                  }}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>

                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 w-full focus-within:border-indigo-500">
                  <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 shrink-0">From</span>
                  <input
                    type="date"
                    value={archivedTxStartDate}
                    onChange={(e) => {
                      setArchivedTxStartDate(e.target.value);
                      setArchivedTxPage(1);
                    }}
                    title="Start Date"
                    className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none font-medium min-w-0"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 w-full focus-within:border-indigo-500">
                  <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 shrink-0">To</span>
                  <input
                    type="date"
                    value={archivedTxEndDate}
                    onChange={(e) => {
                      setArchivedTxEndDate(e.target.value);
                      setArchivedTxPage(1);
                    }}
                    title="End Date"
                    className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none font-medium min-w-0"
                  />
                </div>
              </div>

              {/* Records Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                {isArchivedTxLoading ? (
                  <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                    <span className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    Loading archived transaction page...
                  </div>
                ) : archivedTxs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                    <Archive className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                    <span>No archived transactions found matching criteria.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 uppercase font-mono text-[10px] border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Tx ID / Ref</th>
                          <th className="px-4 py-3">User Email</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Created Date</th>
                          <th className="px-4 py-3">Archived On</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                        {archivedTxs.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-3 font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">
                              <div>{tx.id.substring(0, 16)}...</div>
                              {tx.txDetails && (
                                <div className="text-[10px] text-slate-400 font-normal truncate max-w-[180px]">
                                  {tx.txDetails}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                              {tx.userEmail || tx.userId}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {tx.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono font-bold">
                              <span className={tx.type === "DEPOSIT" || tx.type === "TRADE_PROFIT" || tx.type === "BONUS" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                                ‚Çπ{tx.amount.toFixed(2)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                tx.status === "APPROVED" 
                                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                                  : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
                              }`}>
                                {tx.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                              {new Date(tx.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-slate-400 font-mono text-[10px]">
                              {tx.archivedAt ? new Date(tx.archivedAt).toLocaleDateString() : "Auto"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination Controls (50 per page) */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                  <div className="text-slate-500 font-mono text-[11px]">
                    Page <strong>{archivedTxPage}</strong> of <strong>{archivedTxTotalPages}</strong> ({archivedTxTotalCount} archived transactions)
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={archivedTxPage <= 1}
                      onClick={() => setArchivedTxPage((prev) => Math.max(1, prev - 1))}
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl disabled:opacity-40 cursor-pointer flex items-center gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Prev
                    </button>

                    <button
                      type="button"
                      disabled={archivedTxPage >= archivedTxTotalPages}
                      onClick={() => setArchivedTxPage((prev) => Math.min(archivedTxTotalPages, prev + 1))}
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl disabled:opacity-40 cursor-pointer flex items-center gap-1"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: Archived Solo Trades View */}
          {archiveSubTab === "trades" && (
            <div className="flex flex-col gap-4">
              {/* Filter Controls Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <div className="relative">
                  <input
                    type="text"
                    value={archivedTradesSearch}
                    onChange={(e) => {
                      setArchivedTradesSearch(e.target.value);
                      setArchivedTradesPage(1);
                    }}
                    placeholder="Search User / Pair / Trade ID..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                  />
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                </div>

                <select
                  value={archivedTradesType}
                  onChange={(e) => {
                    setArchivedTradesType(e.target.value);
                    setArchivedTradesPage(1);
                  }}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Trade Types</option>
                  <option value="CALL">CALL (UP)</option>
                  <option value="PUT">PUT (DOWN)</option>
                </select>

                <select
                  value={archivedTradesStatus}
                  onChange={(e) => {
                    setArchivedTradesStatus(e.target.value);
                    setArchivedTradesPage(1);
                  }}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Outcomes</option>
                  <option value="WON">WON</option>
                  <option value="LOST">LOST</option>
                  <option value="DRAW">DRAW</option>
                  <option value="CANCELED">CANCELED</option>
                </select>

                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 w-full focus-within:border-indigo-500">
                  <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 shrink-0">From</span>
                  <input
                    type="date"
                    value={archivedTradesStartDate}
                    onChange={(e) => {
                      setArchivedTradesStartDate(e.target.value);
                      setArchivedTradesPage(1);
                    }}
                    title="Start Date"
                    className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none font-medium min-w-0"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 w-full focus-within:border-indigo-500">
                  <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 shrink-0">To</span>
                  <input
                    type="date"
                    value={archivedTradesEndDate}
                    onChange={(e) => {
                      setArchivedTradesEndDate(e.target.value);
                      setArchivedTradesPage(1);
                    }}
                    title="End Date"
                    className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none font-medium min-w-0"
                  />
                </div>
              </div>

              {/* Records Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                {isArchivedTradesLoading ? (
                  <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                    <span className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    Loading archived solo trades page...
                  </div>
                ) : archivedTrades.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                    <Zap className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                    <span>No archived solo trades found matching criteria.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 uppercase font-mono text-[10px] border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Trade ID / User</th>
                          <th className="px-4 py-3">Asset Pair</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Stake / Payout</th>
                          <th className="px-4 py-3">Entry -&gt; Exit Price Details</th>
                          <th className="px-4 py-3">Outcome</th>
                          <th className="px-4 py-3">Settled Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                        {archivedTrades.map((tr) => (
                          <tr key={tr.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-3 font-mono text-[11px]">
                              <div className="font-bold text-slate-800 dark:text-slate-200">{tr.id.substring(0, 12)}...</div>
                              <div className="text-[10px] text-slate-400">{tr.userEmail || tr.userId}</div>
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                              {tr.assetPair || "BTC/USDT"}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold ${
                                tr.tradeType === "CALL"
                                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                                  : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
                              }`}>
                                {tr.tradeType}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono">
                              <div className="font-bold text-slate-800 dark:text-slate-200">‚Çπ{tr.stakeAmount.toFixed(2)}</div>
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                Expected: ‚Çπ{tr.expectedPayout.toFixed(2)} ({tr.payoutPercentage}%)
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                              <div className="font-semibold">
                                Entry {formatAssetPrice(tr.entryPrice, tr.assetPair || "BTC/USDT")} -&gt; Exit {formatAssetPrice(tr.exitPrice ?? tr.entryPrice, tr.assetPair || "BTC/USDT")}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                ({tr.assetPair || "BTC/USDT"})
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                tr.status === "WON"
                                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                                  : tr.status === "LOST"
                                  ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
                                  : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400"
                              }`}>
                                {tr.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                              {tr.settledAt ? new Date(tr.settledAt).toLocaleDateString() : new Date(tr.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination Controls (50 per page) */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                  <div className="text-slate-500 font-mono text-[11px]">
                    Page <strong>{archivedTradesPage}</strong> of <strong>{archivedTradesTotalPages}</strong> ({archivedTradesTotalCount} archived trades)
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={archivedTradesPage <= 1}
                      onClick={() => setArchivedTradesPage((prev) => Math.max(1, prev - 1))}
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl disabled:opacity-40 cursor-pointer flex items-center gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Prev
                    </button>

                    <button
                      type="button"
                      disabled={archivedTradesPage >= archivedTradesTotalPages}
                      onClick={() => setArchivedTradesPage((prev) => Math.min(archivedTradesTotalPages, prev + 1))}
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl disabled:opacity-40 cursor-pointer flex items-center gap-1"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Market Data Monitor Section */}
      {activeTab === "market_monitor" && (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Header Banner */}
          <div className="p-5 bg-slate-900 dark:bg-slate-950 text-white rounded-2xl shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-2xl shrink-0">
                <Activity className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-white font-display">
                    Market Data Monitor
                  </h3>
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-extrabold rounded-full flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    LIVE PRICE FEED SYNCED
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Real-time health telemetry for public market data providers, WebSocket feeds, API latencies, and price discrepancy checks between TradingView feeds and internal App prices.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  livePriceService.setAssets(SUPPORTED_SOLO_ASSETS);
                  onTriggerNotification?.("Market data feeds refreshed and re-synced successfully!", "success");
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Re-Sync All Feeds</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                <span>Active Providers</span>
                <Globe className="h-4 w-4 text-indigo-500" />
              </div>
              <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100 font-mono mt-1">
                {telemetryData?.providers.filter(p => p.status !== "Disconnected").length || 3} Active Sources
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Deriv WS, Binance WS, OANDA, TradingView
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                <span>API Latency</span>
                <Zap className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100 font-mono mt-1">
                API Response: {
                  telemetryData ? Math.round(
                    telemetryData.providers.reduce((acc, p) => acc + p.latencyMs, 0) / Math.max(1, telemetryData.providers.length)
                  ) : 120
                } ms
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                ‚ö° Sub-150ms Optimal Rate
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                <span>Last Price Update</span>
                <Clock className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100 font-mono mt-1">
                {telemetryData?.lastPriceUpdateTime 
                  ? new Date(telemetryData.lastPriceUpdateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                  : "Just Now"}
              </div>
              <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Real-time refresh active
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                <span>Current Monitored Pair</span>
                <Sliders className="h-4 w-4 text-purple-500" />
              </div>
              <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100 font-mono mt-1">
                {diffMetrics?.pairName || monitoredSymbol}
              </div>
              <div className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                {diffMetrics?.category || "Forex"} Market Symbol
              </div>
            </div>
          </div>

          {/* 1. Market Data Providers Status Grid */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-indigo-500" />
                  Market Data Providers & API Health
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Live connection status, response latency, and error reporting for active market feeds.
                </p>
              </div>

              <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700">
                üîí API Keys Hidden & Secured Server-Side
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {telemetryData?.providers.map((prov) => {
                const isOnline = prov.status === "Connected" || prov.status === "Active";
                const isSlow = prov.status === "Slow";
                const isDegraded = prov.status === "Degraded";
                const isCritical = prov.status === "Critical";
                const isReconnecting = prov.status === "Reconnecting";

                // Latency Color Coding: Green <200ms, Yellow 200-1000ms, Orange 1000-5000ms, Red >5000ms
                const lat = prov.latencyMs || 0;
                let latBadgeBg = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
                let latDotColor = "bg-emerald-500";

                if (lat >= 5000) {
                  latBadgeBg = "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30";
                  latDotColor = "bg-rose-500";
                } else if (lat >= 1000) {
                  latBadgeBg = "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30";
                  latDotColor = "bg-orange-500";
                } else if (lat >= 200) {
                  latBadgeBg = "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30";
                  latDotColor = "bg-yellow-500";
                }

                // Status Badge Color
                let statusBadgeBg = "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900";
                let statusDotColor = "bg-emerald-500 animate-ping";

                if (isCritical || prov.status === "Disconnected" || prov.status === "Error") {
                  statusBadgeBg = "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900";
                  statusDotColor = "bg-rose-500";
                } else if (isDegraded || isSlow) {
                  statusBadgeBg = "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900";
                  statusDotColor = "bg-amber-500 animate-pulse";
                } else if (isReconnecting) {
                  statusBadgeBg = "bg-yellow-100 dark:bg-yellow-950/60 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900";
                  statusDotColor = "bg-yellow-500 animate-spin";
                }

                const successRate = prov.totalRequests > 0 
                  ? ((prov.successCount / prov.totalRequests) * 100).toFixed(1)
                  : "100.0";

                return (
                  <div 
                    key={prov.id}
                    className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-extrabold font-mono uppercase text-slate-400 tracking-wider">
                          {prov.category}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 border ${statusBadgeBg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusDotColor}`} />
                          {prov.status}
                        </span>
                      </div>

                      <h5 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-1 flex items-center justify-between">
                        <span>{prov.name}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-mono font-bold border ${latBadgeBg} flex items-center gap-1`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${latDotColor}`} />
                          {prov.latencyMs} ms
                        </span>
                      </h5>

                      <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10.5px] font-mono bg-white dark:bg-slate-900/80 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Avg Latency:</span>
                          <span className="font-extrabold text-slate-800 dark:text-slate-200">{prov.avgLatencyMs || prov.latencyMs} ms</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Success Rate:</span>
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{successRate}%</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Last Success:</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {prov.lastSuccessTimestamp ? new Date(prov.lastSuccessTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "Pending"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Last Fail:</span>
                          <span className={prov.lastFailedTimestamp ? "font-bold text-rose-600 dark:text-rose-400" : "font-bold text-slate-400"}>
                            {prov.lastFailedTimestamp ? new Date(prov.lastFailedTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "None"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-col gap-1 text-[11px]">
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Error Count:</span>
                        <span className={`font-mono font-bold ${prov.errorCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-500"}`}>{prov.errorCount}</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Auto Refresh:</span>
                        <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">{prov.autoRefreshStatus || prov.updateFrequency}</span>
                      </div>

                      {prov.lastError ? (
                        <div className="mt-1 p-1.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-lg text-[10px] font-sans font-bold text-rose-600 dark:text-rose-400">
                          Error: {prov.lastError}
                        </div>
                      ) : (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-medium flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="h-3 w-3" />
                          No Active Errors
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 1.5 Deriv WebSocket & Live Token Management */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-rose-500" />
                  Deriv WebSocket & API Token Configuration
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Update your Deriv Personal Access Token (PAT) or App ID anytime. The engine auto-reconnects with zero downtime.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Fail-Safe Active
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
              {/* Token Input */}
              <div className="lg:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Deriv Personal Access Token (PAT)</span>
                  <button
                    type="button"
                    onClick={() => setIsDerivShowToken(!isDerivShowToken)}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {isDerivShowToken ? "Hide Token" : "Show Full Token"}
                  </button>
                </label>
                <div className="relative">
                  <input
                    type={isDerivShowToken ? "text" : "password"}
                    value={derivTokenInput}
                    onChange={(e) => setDerivTokenInput(e.target.value)}
                    placeholder="pat_40f6d973623..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* App ID & Save Button */}
              <div className="flex items-center gap-3">
                <div className="w-28 flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    App ID
                  </label>
                  <input
                    type="text"
                    value={derivAppIdInput}
                    onChange={(e) => setDerivAppIdInput(e.target.value)}
                    placeholder="1089"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono text-center font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveDerivConfig}
                  className="flex-1 mt-auto py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Save & Reconnect
                </button>
              </div>
            </div>

            {isDerivSaved && (
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                Deriv Token & App ID updated successfully! Live WebSocket reconnected.
              </div>
            )}
          </div>

          {/* 2. Price Difference Monitor Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col gap-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-indigo-500" />
                  Price Difference Monitor (TradingView vs App Price)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Compares raw TradingView feed prices against App execution prices and flags divergence exceeding allowed limits.
                </p>
              </div>

              {/* Controls: Symbol Picker & Allowed Limit */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl">
                  <label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
                    Symbol:
                  </label>
                  <select
                    value={monitoredSymbol}
                    onChange={(e) => setMonitoredSymbol(e.target.value)}
                    className="bg-transparent text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <optgroup label="Popular Forex">
                      <option value="FX:EURUSD">EUR_USD (EUR/USD)</option>
                      <option value="FX:GBPUSD">GBP_USD (GBP/USD)</option>
                      <option value="FX:USDJPY">USD_JPY (USD/JPY)</option>
                      <option value="FX:AUDUSD">AUD_USD (AUD/USD)</option>
                      <option value="FX:USDCAD">USD_CAD (USD/CAD)</option>
                    </optgroup>
                    <optgroup label="Crypto">
                      <option value="BINANCE:BTCUSDT">BTC_USDT (Bitcoin)</option>
                      <option value="BINANCE:ETHUSDT">ETH_USDT (Ethereum)</option>
                      <option value="BINANCE:SOLUSDT">SOL_USDT (Solana)</option>
                      <option value="BINANCE:XRPUSDT">XRP_USDT (Ripple)</option>
                    </optgroup>
                    <optgroup label="Commodities & Indices">
                      <option value="OANDA:XAUUSD">XAU_USD (Gold Spot)</option>
                      <option value="TVC:USOIL">US OIL (Crude Oil)</option>
                      <option value="CURRENCYCOM:US500">US 500 (S&P 500)</option>
                    </optgroup>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl">
                  <label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
                    Allowed Limit:
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.01"
                    max="5.0"
                    value={allowedDiffLimitPct}
                    onChange={(e) => setAllowedDiffLimitPct(parseFloat(e.target.value) || 0.10)}
                    className="w-14 bg-transparent text-xs font-mono font-bold text-slate-800 dark:text-slate-200 text-center focus:outline-none"
                  />
                  <span className="text-xs font-bold text-slate-500">%</span>
                </div>
              </div>
            </div>

            {/* Quick Pair Selector Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">Quick Select:</span>
              {[
                { label: "EUR_USD", sym: "FX:EURUSD" },
                { label: "GBP_USD", sym: "FX:GBPUSD" },
                { label: "USD_JPY", sym: "FX:USDJPY" },
                { label: "BTC_USDT", sym: "BINANCE:BTCUSDT" },
                { label: "XAU_USD", sym: "OANDA:XAUUSD" },
                { label: "US OIL", sym: "TVC:USOIL" }
              ].map(p => (
                <button
                  key={p.sym}
                  type="button"
                  onClick={() => setMonitoredSymbol(p.sym)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    monitoredSymbol === p.sym
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Detailed Price Comparison Display Cards */}
            {diffMetrics && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* 1. TradingView Feed Price */}
                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    <span>TradingView Price</span>
                    <Globe className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div className="text-2xl font-black text-indigo-950 dark:text-indigo-100 font-mono">
                    {diffMetrics.tradingViewPrice >= 100 
                      ? diffMetrics.tradingViewPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : diffMetrics.tradingViewPrice.toFixed(5)}
                  </div>
                  <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                    Direct Public Feed Raw Sync
                  </span>
                </div>

                {/* 2. App Internal Price */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>App Trading Price</span>
                    <Activity className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
                    {diffMetrics.appPrice >= 100 
                      ? diffMetrics.appPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : diffMetrics.appPrice.toFixed(5)}
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    Live Engine Active
                  </span>
                </div>

                {/* 3. Difference Value */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Difference Value</span>
                    <Sliders className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
                    {diffMetrics.differenceValue < 0.01 
                      ? diffMetrics.differenceValue.toFixed(5)
                      : diffMetrics.differenceValue.toFixed(2)}
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    Absolute Variance |Œî|
                  </span>
                </div>

                {/* 4. Difference Percentage & Status Badge */}
                <div className={`p-4 rounded-2xl border flex flex-col justify-between gap-2 ${
                  diffMetrics.isExceedingLimit
                    ? "bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100 animate-pulse"
                    : "bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-100"
                }`}>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>Difference %</span>
                    {diffMetrics.isExceedingLimit ? (
                      <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 animate-bounce" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>

                  <div className="text-2xl font-black font-mono">
                    {diffMetrics.differencePercentage.toFixed(3)}%
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      diffMetrics.isExceedingLimit
                        ? "bg-rose-600 text-white"
                        : "bg-emerald-600 text-white"
                    }`}>
                      {diffMetrics.isExceedingLimit ? "‚ö†Ô∏è EXCEEDS LIMIT" : "IN SYNC"}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        livePriceService.setManualPriceOverride(monitoredSymbol, null);
                        onTriggerNotification?.(`App price for ${monitoredSymbol} manually re-aligned with TradingView feed!`, "success");
                      }}
                      className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[10px] font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer text-slate-800 dark:text-slate-200"
                    >
                      Sync Now
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Warning Callout when limit exceeded */}
            {diffMetrics?.isExceedingLimit && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-center justify-between gap-3 text-rose-800 dark:text-rose-200">
                <div className="flex items-center gap-3 text-xs">
                  <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 animate-bounce" />
                  <div>
                    <span className="font-extrabold">Price Discrepancy Alert:</span> The App price for <strong>{diffMetrics.pairName}</strong> differs from the live TradingView feed by <strong>{diffMetrics.differencePercentage.toFixed(3)}%</strong>, which exceeds your allowed threshold limit of <strong>{diffMetrics.allowedLimitPct}%</strong>.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    livePriceService.setManualPriceOverride(monitoredSymbol, null);
                    onTriggerNotification?.(`Price override cleared for ${monitoredSymbol}. App price now synced with TradingView live feed.`, "success");
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 shadow-xs"
                >
                  Force Sync App Price
                </button>
              </div>
            )}
          </div>

          {/* Real-time 11-Field Market Debug Panel */}
          <MarketDebugPanel symbol={monitoredSymbol} className="shadow-xs" isAdmin={true} />

          {/* 3. All Monitored Market Pairs Variance Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  All Active Assets Price Feed Telemetry
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Live variance audit for all supported assets in the trading platform.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={monitorSearchQuery}
                    onChange={(e) => setMonitorSearchQuery(e.target.value)}
                    placeholder="Filter pair (e.g. EUR, BTC)..."
                    className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 w-44"
                  />
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                </div>

                <select
                  value={monitorCategoryFilter}
                  onChange={(e) => setMonitorCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  <option value="Forex">Forex</option>
                  <option value="Crypto">Crypto</option>
                  <option value="Metals">Metals</option>
                  <option value="Indices">Indices</option>
                  <option value="Commodities">Commodities</option>
                </select>
              </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 shadow-2xs">
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="px-4 py-3">Symbol / Pair</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">TradingView Feed</th>
                    <th className="px-4 py-3 text-right">App Executed Price</th>
                    <th className="px-4 py-3 text-right">Variance (%)</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                  {SUPPORTED_SOLO_ASSETS
                    .filter(asset => {
                      const matchesCategory = monitorCategoryFilter === "ALL" || asset.category === monitorCategoryFilter;
                      const matchesSearch = !monitorSearchQuery || 
                        asset.pair.toLowerCase().includes(monitorSearchQuery.toLowerCase()) || 
                        asset.symbol.toLowerCase().includes(monitorSearchQuery.toLowerCase());
                      return matchesCategory && matchesSearch;
                    })
                    .map(asset => {
                      const m = livePriceService.getPriceDifferenceMetrics(asset.symbol, allowedDiffLimitPct);
                      const isSelected = monitoredSymbol === asset.symbol;

                      return (
                        <tr 
                          key={asset.symbol}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                            isSelected ? "bg-indigo-50/40 dark:bg-indigo-950/30" : ""
                          }`}
                        >
                          <td className="px-4 py-3 font-sans font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span>{asset.pair}</span>
                            <span className="text-[10px] text-slate-400 font-mono font-normal">({asset.symbol})</span>
                          </td>

                          <td className="px-4 py-3 font-sans">
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-md">
                              {asset.category}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right text-indigo-600 dark:text-indigo-400 font-bold">
                            {m.tradingViewPrice >= 100 
                              ? m.tradingViewPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : m.tradingViewPrice.toFixed(asset.decimals || 2)}
                          </td>

                          <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100 font-bold">
                            {m.appPrice >= 100 
                              ? m.appPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : m.appPrice.toFixed(asset.decimals || 2)}
                          </td>

                          <td className={`px-4 py-3 text-right font-extrabold ${
                            m.isExceedingLimit ? "text-rose-600 dark:text-rose-400 animate-pulse" : "text-emerald-600 dark:text-emerald-400"
                          }`}>
                            {m.differencePercentage.toFixed(3)}%
                          </td>

                          <td className="px-4 py-3 text-center font-sans">
                            {m.isExceedingLimit ? (
                              <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 text-[10px] font-extrabold rounded-full inline-flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Discrepancy
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-extrabold rounded-full inline-flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Synced
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setMonitoredSymbol(asset.symbol);
                              }}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 font-extrabold text-[10px] rounded-lg transition-all cursor-pointer"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RBAC & Staff Management System Tab */}
      {activeTab === "rbac_staff" && (
        <RbacStaffManager
          currentAdminAccount={currentAdminAccount}
          adminAccounts={adminAccounts}
          auditLogs={auditLogs}
          onTriggerNotification={onTriggerNotification}
        />
      )}

      {/* Admin Limits Management Tab */}
      {activeTab === "limits" && (
        <AdminLimitsManagement
          allUsers={allUsers}
          walletTransactions={walletTransactions}
          walletLimits={walletLimits}
          adminAccount={currentAdminAccount}
          onTriggerNotification={onTriggerNotification}
        />
      )}

      {/* Admin Trading Balance Report Tab */}
      {activeTab === "balance_report" && (
        <AdminTradingBalanceReport
          allUsers={allUsers}
          allSoloTrades={allSoloTrades}
          walletTransactions={walletTransactions}
          currentAdminAccount={currentAdminAccount}
          onTriggerNotification={onTriggerNotification}
        />
      )}

      {/* Manual Lifecycle Sync Authorization Modal */}
      {isRunArchiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setIsRunArchiveModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl shrink-0">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-display">
                  Run Database Archiving & Cleanup
                </h3>
                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                  üîí Admin Security Authorization
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex flex-col gap-1.5">
              <p>
                <strong>This automated run will perform:</strong>
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li>Move completed transactions & solo trades older than <strong>12 months</strong> into read-only archive collections.</li>
                <li>Permanently purge archived records older than <strong>24 months</strong> to minimize cloud database storage.</li>
                <li>User balances, active open trades, and profiles will remain <strong>100% untouched</strong>.</li>
              </ul>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleManualArchiveExecution();
              }}
              className="flex flex-col gap-3"
            >
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  6-Digit Admin Security PIN
                </label>
                <div className="relative">
                  <input
                    type="password"
                    maxLength={6}
                    autoFocus
                    required
                    value={archiveRunPin}
                    onChange={(e) => setArchiveRunPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 6-digit PIN"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-100 font-mono tracking-widest focus:outline-none focus:border-indigo-500"
                  />
                  <Key className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRunArchiveModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isArchiveRunning || archiveRunPin.length < 6}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {isArchiveRunning ? "Executing..." : "Authorize & Run Now"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative flex flex-colxú¨ïÕí‚ «Ô>EWNz@]ø∆u‘©)˜º'ÁH@√J d‘≤|˜%!:1∞≥µ9ò–4t˜è#Ïqé&—∫çgIÿ;$k˝gtÌ8=34”(°¬PÂ™qkïøŒ˙@ºGJjäæá@∞:,nÜØ”·`>CO∆f7è”ƒöî,°çN‹hCær™ÃV1,ˆú6ÉßhG4ã`‡•9∞yÜrlüéõ{VôÈvRsú\˛öcc+z(¿ŸlŸÅ¨6RÏò ‡M[öﬂ(ßÜI·á§„@Rπó”I7ô˛"háBQ∆ƒIb¡»© ∞∞ß œÅ˘∞´Mü*»*°?Ωkaê¬d±TƒfÊ^nf4¨D‚ºvãz0{–<p®úÊæ†∆2Øä¬Y†ã˙„à-#õhÄ8tKmî˚ı•d∏ïh_ÿØÀA=›«Yöa∆ØΩÿ¶L[ÓÂICÇÖêb{ÇHA˚ç‘o Ö6lwFTê™AGê˚Ss3∑èª0∞:Î<¿g∆ƒiŒπM√MFﬁ¨Œí√Í“Ì¡jöö∑îÆ(8Ô]ΩUÑisJV¶]Wà}πŒ˜läÎÑ&êü—»I¨]ﬂ˛£∂fì<∫u|s±:r=.9π´Ãä,)îñ
Âíïƒ€U˚=∑¡"°‹Î!Ì?ÉN± ú÷ã√F˜Øêß»˜;ïÔT›;πÇZoøê9Nò9óÌ^A=¶VÆüÛ5
Õ Aò∑qÉN1ëGîˇ#ç~ ≠í·¢€∏ﬂÔG∞®«¥∫ô£6í—yóbÀ0¨U∑ıû;◊ÁŒO   ˇˇ ªûã