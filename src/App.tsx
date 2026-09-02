import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import bcrypt from "bcryptjs";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  where,
  getDocs,
  limit
} from "firebase/firestore";
import { db } from "./firebase";
import { UserProfile, TradePool, AdminConfig, WalletTransaction, SupportMessage, PaymentDetails, PaymentGateway, WalletLimits, SoloTradingConfig, AdminUserAccount } from "./types";
import { 
  initializeDatabase, 
  resetAllUsers,
  refundTradePool,
  subscribeAdminPin,
  subscribeAdminAuthState,
  logoutAdminSession,
  subscribeAppPaymentSettings,
  fetchAllUsersOnce,
  normalizeUserProfile,
  fetchWalletTransactionsOnce,
  fetchSupportMessagesOnce,
  fetchTradePoolsOnce,
  normalizePhoneDigits,
  DEFAULT_PAYMENT_DETAILS,
  DEFAULT_PAYMENT_GATEWAYS,
  DEFAULT_PAYMENT_NOTE,
  DEFAULT_DEPOSIT_PROCESSING_TIME,
  DEFAULT_WITHDRAWAL_PROCESSING_TIME,
  DEFAULT_WALLET_LIMITS,
  DEFAULT_SOLO_TRADING_CONFIG,
  subscribeSoloTradingConfig,
  subscribeFooterText,
  DEFAULT_FOOTER_TEXT,
  subscribeBrandingSettings,
  DEFAULT_BRANDING_SETTINGS,
  BrandingSettings
} from "./firebaseService";
import { subscribeAdminAccounts } from "./services/adminRbacService";
import { runDatabaseArchivingAndCleanup } from "./archiveService";
import { UserProfileSelector } from "./components/UserProfileSelector";
import { PoolCard } from "./components/PoolCard";
import { AdminPanel } from "./components/AdminPanel";
import { HrPayrollManager } from "./components/HrPayrollManager";
import { PoolHistory } from "./components/PoolHistory";
import { WalletPanel } from "./components/WalletPanel";
import { WalletHistory } from "./components/WalletHistory";
import { UserTradeHistory } from "./components/UserTradeHistory";
import { LoginPortal } from "./components/LoginPortal";
import { ProfileSettings } from "./components/ProfileSettings";
import { UserSupportModal } from "./components/UserSupportModal";
import { UserSupportPage } from "./components/UserSupportPage";
import { InstallAppModal } from "./components/InstallAppModal";
import { livePriceService } from "./services/livePriceService";
import { SoloTradingEngine } from "./components/SoloTradingEngine";
import { 
  TrendingUp, 
  Coins, 
  HelpCircle, 
  RefreshCw, 
  Sparkles,
  AlertTriangle,
  X,
  Info,
  Sun,
  Moon,
  Compass,
  Wallet,
  Settings,
  Layers,
  History,
  LogOut,
  ShieldCheck,
  User,
  Zap,
  MessageSquare,
  Download,
  KeyRound,
  Copy,
  Check,
  Smartphone,
  ArrowRight,
  UserPlus
} from "lucide-react";

interface LoginSession {
  role: "admin" | "user";
  userId?: string;
}

export default function App() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [pools, setPools] = useState<TradePool[]>(() => {
    try {
      const saved = localStorage.getItem("cached_pools");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  
  // Login Session State
  const [loginSession, setLoginSession] = useState<LoginSession | null>(() => {
    try {
      const saved = localStorage.getItem("loginSession");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("loginSession");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.role === "user" && parsed.userId) {
          return parsed.userId;
        }
      }
    } catch {}
    return "user_a";
  });

  const [activeTab, setActiveTab] = useState<"dashboard" | "solo" | "portfolio" | "wallet" | "support" | "admin" | "hr_payroll">(() => {
    try {
      const saved = localStorage.getItem("loginSession");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.role === "admin") {
          return "admin";
        }
      }
    } catch {}
    return "dashboard";
  });

  const [soloConfig, setSoloConfig] = useState<SoloTradingConfig>(DEFAULT_SOLO_TRADING_CONFIG);

  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [riskFilter, setRiskFilter] = useState<string>("ALL");

  // Newly Created Trader Account PIN Display Modal State
  const [newlyCreatedPinModal, setNewlyCreatedPinModal] = useState<{
    user: UserProfile;
    pin: string;
  } | null>(null);
  const [copiedNewPin, setCopiedNewPin] = useState(false);
  
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved !== null) {
        return saved === "dark";
      }
    } catch {}
    return true; // Default to dark mode
  });

  const [adminConfig, setAdminConfig] = useState<AdminConfig>({
    targetAmount: 100,
    minContribution: 10,
    maxParticipants: 5,
    timeoutSeconds: 120, // 2 minutes default for fast testing
    expectedReturn: 15,  // default expected return of 15%
  });

  const [currentAdminPin, setCurrentAdminPin] = useState<string>("1234");
  const [adminSessionToken, setAdminSessionToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem("adminSessionToken");
    } catch {
      return null;
    }
  });
  const [paymentGateways, setPaymentGateways] = useState<PaymentGateway[]>(DEFAULT_PAYMENT_GATEWAYS);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>(DEFAULT_PAYMENT_DETAILS);
  const [paymentNote, setPaymentNote] = useState<string>(DEFAULT_PAYMENT_NOTE);
  const [depositProcessingTime, setDepositProcessingTime] = useState<string>(DEFAULT_DEPOSIT_PROCESSING_TIME);
  const [withdrawalProcessingTime, setWithdrawalProcessingTime] = useState<string>(DEFAULT_WITHDRAWAL_PROCESSING_TIME);
  const [walletLimits, setWalletLimits] = useState<WalletLimits>(DEFAULT_WALLET_LIMITS);
  const [footerText, setFooterText] = useState<string>(DEFAULT_FOOTER_TEXT);
  const [brandingSettings, setBrandingSettings] = useState<BrandingSettings>(DEFAULT_BRANDING_SETTINGS);
  const [adminAccounts, setAdminAccounts] = useState<AdminUserAccount[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeAdminAccounts((accs) => {
      setAdminAccounts(accs);
    });
    return () => unsubscribe();
  }, []);

  const loggedAdminEmail = loginSession?.role === "admin"
    ? (loginSession.userId || "amaizy1@gmail.com")
    : "";

  const currentAdminAccount = useMemo(() => {
    if (!loggedAdminEmail) return null;
    return adminAccounts.find(
      a => a.id === loggedAdminEmail || a.email.toLowerCase() === loggedAdminEmail.toLowerCase()
    ) || null;
  }, [adminAccounts, loggedAdminEmail]);

  const hasHrAccess = useMemo(() => {
    if (loginSession?.role !== "admin") return false;
    if (!currentAdminAccount) {
      // Default owner / master admin
      return true;
    }
    return (
      currentAdminAccount.role === "OWNER" ||
      currentAdminAccount.role === "SUPER_ADMIN" ||
      currentAdminAccount.department === "HR & Payroll"
    );
  }, [loginSession, currentAdminAccount]);

  useEffect(() => {
    if (activeTab === "hr_payroll" && !hasHrAccess) {
      setActiveTab("admin");
    }
  }, [activeTab, hasHrAccess]);

  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "info" | "error";
  } | null>(null);

  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Set up auto-dismiss notification helper
  const triggerNotification = useCallback((message: string, type: "success" | "info" | "error" = "success") => {
    // Suppress raw database quota / internal technical errors from appearing as user toast notifications
    if (
      message.includes("Quota limit exceeded") ||
      message.includes("quota") ||
      message.includes("firestore.googleapis.com") ||
      message.includes("resource-exhausted") ||
      message.includes("Free daily read units") ||
      message.includes("project_number") ||
      message.includes("589671797496") ||
      message.includes("FirebaseError")
    ) {
      console.warn("Suppressed technical database error toast notification:", message);
      return;
    }
    setNotification({ message, type });
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    notificationTimeoutRef.current = setTimeout(() => {
      setNotification(null);
    }, 3500);
  }, []);

  const [isAppOnline, setIsAppOnline] = useState<boolean>(() => 
    livePriceService.isOnline()
  );

  useEffect(() => {
    const unsub = livePriceService.subscribeNetworkStatus((online) => {
      setIsAppOnline(online);
    });

    const handleOnline = () => {
      setIsAppOnline(true);
      triggerNotification("🟢 Internet Reconnected: App functions and live data synced.", "success");
    };
    const handleOffline = () => {
      setIsAppOnline(false);
      triggerNotification("⚠️ Internet Disconnected! Trading and transactions paused until reconnected.", "error");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      unsub();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [triggerNotification]);

  // Initialize DB on first load
  useEffect(() => {
    initializeDatabase();
  }, []);

  // Theme apply to document element & set color scheme
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  // Smooth synchronized theme toggle
  const toggleTheme = () => {
    document.documentElement.classList.add("theme-changing");
    setIsDarkMode((prev) => !prev);
    setTimeout(() => {
      document.documentElement.classList.remove("theme-changing");
    }, 200);
  };

  // Optimized Firestore listeners: Drastically reduces reads by 80-95%
  useEffect(() => {
    let unsubscribeUserDoc: () => void = () => {};
    let unsubscribePools: () => void = () => {};
    let unsubscribeTxs: () => void = () => {};
    let unsubscribeSupport: () => void = () => {};
    let unsubscribeAdminAuth: () => void = () => {};

    const isAdminActive = loginSession?.role === "admin" || activeTab === "admin" || activeTab === "hr_payroll";

    // 1. User profile listener & caching: Listen ONLY to the active logged-in user doc (1 read per change)
    if (selectedUserId && !isAdminActive) {
      const userDocRef = doc(db, "users", selectedUserId);
      unsubscribeUserDoc = onSnapshot(userDocRef, (snap) => {
        if (snap.exists()) {
          const updatedUser = normalizeUserProfile(snap.data());
          setUsers((prev) => {
            const index = prev.findIndex((u) => u.id === updatedUser.id);
            if (index >= 0) {
              const copy = [...prev];
              copy[index] = updatedUser;
              return copy;
            }
            return [updatedUser, ...prev];
          });
          try {
            localStorage.setItem("cached_user_" + updatedUser.id, JSON.stringify(updatedUser));
          } catch {}
        }
      }, (err) => {
        console.warn("User doc listener notice:", err);
      });
    }

    // 1b. If Admin tab is active or loginSession is present, subscribe to real-time users collection updates
    let unsubscribeAllUsers: () => void = () => {};
    if (isAdminActive || loginSession?.role === "admin") {
      const usersQuery = query(collection(db, "users"), limit(300));
      unsubscribeAllUsers = onSnapshot(usersQuery, (snapshot) => {
        const usersList: UserProfile[] = [];
        snapshot.forEach((docSnap) => {
          usersList.push(normalizeUserProfile(docSnap.data()));
        });
        setUsers(usersList);
        try {
          localStorage.setItem("cached_users", JSON.stringify(usersList));
        } catch {}
      }, (err) => {
        console.warn("All users listener notice:", err);
      });
    } else if (!loginSession) {
      fetchAllUsersOnce().then((allUsersList) => {
        if (allUsersList.length > 0) {
          setUsers(allUsersList);
          try {
            localStorage.setItem("cached_users", JSON.stringify(allUsersList));
          } catch {}
        }
      }).catch(console.warn);
    }

    // 2. Trade pools: Real-time listener for both Admin and Users (instant UI updates on create/delete/edit)
    const poolsQuery = isAdminActive
      ? query(collection(db, "trade_pools"), limit(100))
      : query(collection(db, "trade_pools"), where("status", "in", ["WAITING", "ACTIVE"]), limit(50));

    unsubscribePools = onSnapshot(poolsQuery, (snapshot) => {
      const poolsList: TradePool[] = [];
      const now = Date.now();
      snapshot.forEach((docSnap) => {
        const poolData = docSnap.data() as TradePool;
        poolsList.push(poolData);

        // Auto-refund expired WAITING pools
        if (
          poolData.status === "WAITING" &&
          poolData.expiresAt &&
          new Date(poolData.expiresAt).getTime() <= now
        ) {
          refundTradePool(poolData.id).catch((err) => {
            console.error(`Auto-refund error for pool ${poolData.id}:`, err);
          });
        }
      });
      setPools(poolsList);
      try {
        localStorage.setItem("cached_pools", JSON.stringify(poolsList));
      } catch {}
    }, (err) => {
      console.warn("Trade pools listener notice:", err);
    });

    // 2b. Local interval check for auto-refunding expired WAITING pools (0 Firestore reads)
    const expiredCheckInterval = setInterval(() => {
      const now = Date.now();
      setPools((currentPools) => {
        currentPools.forEach((poolData) => {
          if (
            poolData.status === "WAITING" &&
            poolData.expiresAt &&
            new Date(poolData.expiresAt).getTime() <= now
          ) {
            refundTradePool(poolData.id).catch((err) => {
              console.error(`Interval auto-refund error for pool ${poolData.id}:`, err);
            });
          }
        });
        return currentPools;
      });
    }, 4000);

    // 3. Wallet Transactions: Filter by userId for regular users, or limit(50) for Admin
    if (selectedUserId && !isAdminActive) {
      const txQuery = query(
        collection(db, "wallet_transactions"),
        where("userId", "==", selectedUserId),
        limit(100)
      );
      unsubscribeTxs = onSnapshot(txQuery, (snapshot) => {
        const txsList: WalletTransaction[] = [];
        snapshot.forEach((docSnap) => {
          txsList.push(docSnap.data() as WalletTransaction);
        });
        txsList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setWalletTransactions(txsList);
      }, (err) => {
        console.warn("Transactions listener notice:", err);
      });
    } else if (isAdminActive) {
      const adminTxQuery = query(
        collection(db, "wallet_transactions"),
        limit(150)
      );
      unsubscribeTxs = onSnapshot(adminTxQuery, (snapshot) => {
        const txsList: WalletTransaction[] = [];
        snapshot.forEach((docSnap) => {
          txsList.push(docSnap.data() as WalletTransaction);
        });
        txsList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setWalletTransactions(txsList);
      }, (err) => {
        console.warn("Admin transactions listener notice:", err);
      });
    }

    // 4. Support Messages: Filter by userId for regular users, or limit(50) for Admin
    if (selectedUserId && !isAdminActive) {
      const supportQuery = query(
        collection(db, "support_messages"),
        where("userId", "==", selectedUserId),
        limit(50)
      );
      unsubscribeSupport = onSnapshot(supportQuery, (snapshot) => {
        const msgsList: SupportMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as SupportMessage & { deleted?: boolean };
          if (!data.deleted) {
            msgsList.push(data);
          }
        });
        msgsList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setSupportMessages(msgsList);
      }, (err) => {
        console.warn("Support messages listener notice:", err);
      });
    } else if (isAdminActive) {
      const adminSupportQuery = query(
        collection(db, "support_messages"),
        limit(100)
      );
      unsubscribeSupport = onSnapshot(adminSupportQuery, (snapshot) => {
        const msgsList: SupportMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as SupportMessage & { deleted?: boolean };
          if (!data.deleted) {
            msgsList.push(data);
          }
        });
        msgsList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setSupportMessages(msgsList);
      }, (err) => {
        console.warn("Admin support listener notice:", err);
      });
    }

    // 5. App Settings: Consolidated single-document listener for payment details, gateways, limits & notes
    const unsubscribeAppSettings = subscribeAppPaymentSettings((settings) => {
      setPaymentGateways(settings.gateways);
      setPaymentDetails(settings.paymentDetails);
      setPaymentNote(settings.paymentNote);
      setDepositProcessingTime(settings.depositProcessingTime);
      setWithdrawalProcessingTime(settings.withdrawalProcessingTime);
      setWalletLimits(settings.walletLimits);
    });

    // 6. Admin PIN
    const unsubscribeAdminPin = subscribeAdminPin((pin) => {
      setCurrentAdminPin(pin);
    });

    // 7. Solo Trading Engine Config
    const unsubscribeSoloConfig = subscribeSoloTradingConfig((cfg) => {
      setSoloConfig(cfg);
      if (cfg && cfg.customAssets && cfg.customAssets.length > 0) {
        livePriceService.setAssets(cfg.customAssets);
      }
    });

    // 8. Footer Text Config
    const unsubscribeFooter = subscribeFooterText((text) => {
      setFooterText(text);
    });

    // 8b. Platform Branding Settings (Title & Tagline)
    const unsubscribeBranding = subscribeBrandingSettings((branding) => {
      setBrandingSettings(branding);
      if (branding?.appTitle) {
        document.title = `${branding.appTitle} - ${branding.appTagline || "Fractional Trade Platform"}`;
      }
    });

    // 9. Admin Auth State (Enforce single active session, only subscribed when admin is logged in)
    if (loginSession?.role === "admin") {
      unsubscribeAdminAuth = subscribeAdminAuthState((authState) => {
        if (adminSessionToken) {
          if (authState.activeSessionToken && authState.activeSessionToken !== adminSessionToken) {
            setLoginSession(null);
            setAdminSessionToken(null);
            localStorage.removeItem("loginSession");
            localStorage.removeItem("adminSessionToken");
            triggerNotification("🔒 Admin Session Terminated: Another Admin logged in from a different location/device.", "error");
          }
        }
      });
    }

    // 10. Background database archiving & cleanup check
    runDatabaseArchivingAndCleanup().catch((e) => {
      console.warn("Background database archiving check notice:", e);
    });

    // 11. Network reconnect listener to force instant balance re-sync
    const handleWindowOnline = () => {
      if (selectedUserId) {
        getDoc(doc(db, "users", selectedUserId)).then((snap) => {
          if (snap.exists()) {
            const updatedUser = normalizeUserProfile(snap.data());
            setUsers((prev) => {
              const index = prev.findIndex((u) => u.id === updatedUser.id);
              if (index >= 0) {
                const copy = [...prev];
                copy[index] = updatedUser;
                return copy;
              }
              return [updatedUser, ...prev];
            });
          }
        }).catch((e) => console.warn("Balance re-sync on online failed:", e));
      }
    };
    window.addEventListener("online", handleWindowOnline);

    return () => {
      window.removeEventListener("online", handleWindowOnline);
      clearInterval(expiredCheckInterval);
      unsubscribeUserDoc();
      unsubscribeAllUsers();
      unsubscribePools();
      unsubscribeTxs();
      unsubscribeSupport();
      unsubscribeAppSettings();
      unsubscribeAdminPin();
      unsubscribeSoloConfig();
      unsubscribeFooter();
      unsubscribeBranding();
      unsubscribeAdminAuth();
    };
  }, [loginSession, adminSessionToken, selectedUserId, activeTab]);

  // 15-Minute Inactivity Auto-Logout for Admin
  useEffect(() => {
    if (loginSession?.role !== "admin") return;

    let lastActivityTime = Date.now();

    const handleActivity = () => {
      lastActivityTime = Date.now();
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("touchstart", handleActivity);
    window.addEventListener("scroll", handleActivity);

    const checkInactivityInterval = setInterval(() => {
      const inactiveMs = Date.now() - lastActivityTime;
      if (inactiveMs >= 15 * 60 * 1000) { // 15 minutes
        logoutAdminSession(adminSessionToken || undefined);
        setAdminSessionToken(null);
        localStorage.removeItem("adminSessionToken");
        setLoginSession(null);
        localStorage.removeItem("loginSession");
        triggerNotification("⏱️ Admin session expired due to 15 minutes of inactivity.", "info");
      }
    }, 10000); // Check every 10 seconds

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      clearInterval(checkInactivityInterval);
    };
  }, [loginSession, adminSessionToken]);

  const handleResetSimulation = async () => {
    try {
      await resetAllUsers();
      triggerNotification("Simulator profiles and balances reset successfully!", "success");
    } catch (err) {
      triggerNotification("Failed to reset simulator profiles.", "error");
    }
  };

  const handleLogin = (role: "admin" | "user", userId?: string, sessionToken?: string) => {
    const session = { role, userId };
    setLoginSession(session);
    localStorage.setItem("loginSession", JSON.stringify(session));
    if (role === "admin") {
      if (sessionToken) {
        setAdminSessionToken(sessionToken);
        localStorage.setItem("adminSessionToken", sessionToken);
      }
      setActiveTab("admin");
      triggerNotification("🔐 Admin Terminal Access Granted! Single Session & PIN Verification Active.", "success");
    } else if (role === "user" && userId) {
      setSelectedUserId(userId);
      setActiveTab("dashboard");
      const userObj = users.find(u => u.id === userId);
      triggerNotification(`Welcome back, ${userObj ? userObj.name : "Trader"}!`, "success");
    }
  };

  const handleLogout = async () => {
    if (loginSession?.role === "admin") {
      await logoutAdminSession(adminSessionToken || undefined);
      setAdminSessionToken(null);
      localStorage.removeItem("adminSessionToken");
    }
    setLoginSession(null);
    localStorage.removeItem("loginSession");
    triggerNotification("Logged out successfully.", "info");
  };

  const handleCreateNewUser = async (name: string, email: string, phone?: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) {
        throw new Error("Please enter a valid email address.");
      }

      // Gather all local known users combining current state and localStorage cached users
      let allLocalUsers = [...users];
      try {
        const cached = localStorage.getItem("cached_users");
        if (cached) {
          const parsed: UserProfile[] = JSON.parse(cached);
          parsed.forEach((cu) => {
            if (!allLocalUsers.some((u) => u.id === cu.id)) {
              allLocalUsers.push(cu);
            }
          });
        }
      } catch {}

      // Check local users list for existing email
      const existingInList = allLocalUsers.find(
        (u) => u.email && u.email.trim().toLowerCase() === cleanEmail
      );
      if (existingInList) {
        throw new Error(
          `An account with email "${cleanEmail}" already exists! One email can only have one account. (एक ई-मेल से केवल एक ही अकाउंट हो सकता है)`
        );
      }

      // Check Firestore directly for duplicate email (degraded gracefully if quota limit reached)
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", cleanEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          throw new Error(
            `An account with email "${cleanEmail}" already exists! One email can only have one account. (एक ई-मेल से केवल एक ही अकाउंट हो सकता है)`
          );
        }
      } catch (err: any) {
        if (err?.message?.includes("already exists")) throw err;
        console.warn("Firestore duplicate email lookup notice (quota limit fallback):", err);
      }

      // Check for duplicate Mobile Number
      const cleanPhone = phone ? phone.trim() : "";
      const normPhone = normalizePhoneDigits(cleanPhone);

      if (cleanPhone && normPhone) {
        // Check local users list for existing mobile number
        const existingPhoneInList = allLocalUsers.find(
          (u) => u.phone && normalizePhoneDigits(u.phone) === normPhone
        );
        if (existingPhoneInList) {
          throw new Error(
            `Mobile number "${cleanPhone}" is already registered to another account (${existingPhoneInList.name})! One mobile number can only be used for one account. (एक मोबाइल नंबर से केवल एक ही अकाउंट हो सकता है)`
          );
        }

        // Check Firestore directly for duplicate mobile number
        try {
          const usersRef = collection(db, "users");
          const allUsersSnap = await getDocs(usersRef);
          allUsersSnap.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.phone && normalizePhoneDigits(data.phone) === normPhone) {
              throw new Error(
                `Mobile number "${cleanPhone}" is already registered to another account (${data.name || data.email})! One mobile number can only be used for one account. (एक मोबाइल नंबर से केवल एक ही अकाउंट हो सकता है)`
              );
            }
          });
        } catch (err: any) {
          if (err?.message?.includes("already registered")) throw err;
          console.warn("Firestore duplicate phone lookup notice (quota limit fallback):", err);
        }
      }

      const id = "user_" + Date.now();

      // Generate unique random 6-digit login PIN
      const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();
      const pinHash = bcrypt.hashSync(generatedPin, 10);
      const nowISO = new Date().toISOString();

      const newUserObj: UserProfile = {
        id,
        name: name.trim(),
        email: cleanEmail,
        phone: phone ? phone.trim() : "",
        balance: 0,
        availableBalance: 0,
        lockedBalance: 0,
        mobileVerified: false,
        verificationStatus: "pending",
        loginPinHash: pinHash,
        pinGeneratedAt: nowISO,
        loginAttempts: 0,
        loginLockedUntil: null
      };

      try {
        const userRef = doc(db, "users", id);
        await setDoc(userRef, newUserObj);
      } catch (writeErr) {
        console.warn("Firestore user write notice (offline / quota fallback):", writeErr);
      }

      setUsers((prev) => {
        const updated = [newUserObj, ...prev.filter(u => u.email !== cleanEmail)];
        try {
          localStorage.setItem("cached_users", JSON.stringify(updated));
        } catch {}
        return updated;
      });

      // Set newlyCreatedPinModal so user sees their unique 6-digit login PIN on display!
      setNewlyCreatedPinModal({
        user: newUserObj,
        pin: generatedPin
      });

      triggerNotification(`New account for ${name} created successfully with Unique Login PIN!`, "success");
      return { user: newUserObj, pin: generatedPin };
    } catch (err: any) {
      const msg = err?.message || "";
      if (
        msg.includes("Quota limit exceeded") ||
        msg.includes("quota") ||
        msg.includes("firestore.googleapis.com") ||
        msg.includes("Free daily read units")
      ) {
        console.warn("Quota limit encountered during registration:", msg);
      } else {
        triggerNotification(msg || "Failed to create user.", "error");
        throw err;
      }
    }
  };

  const handleAdminConfigChange = (newConfig: AdminConfig) => {
    setAdminConfig(newConfig);
    triggerNotification(`Default parameters updated for new pools!`, "success");
  };

  const currentUserProfile = users.find((u) => u.id === selectedUserId) || null;

  useEffect(() => {
    if (loginSession?.role === "user" && users.length > 0) {
      if (!currentUserProfile) {
        setLoginSession(null);
        localStorage.removeItem("loginSession");
        triggerNotification("Your trader account has been deleted by Admin.", "error");
      } else if (currentUserProfile.isBlocked) {
        setLoginSession(null);
        localStorage.removeItem("loginSession");
        triggerNotification("Your trader account has been BLOCKED by Admin. Access restricted.", "error");
      }
    }
  }, [currentUserProfile, loginSession, users.length]);
  const currentPool = pools.find(
    (p) => p.status === "WAITING" || p.status === "ACTIVE"
  ) || null;
  const manageablePools = pools.filter(
    (p) => p.status === "WAITING" || p.status === "ACTIVE"
  );
  const filteredPools = manageablePools.filter((p) => {
    if (riskFilter === "ALL") return true;
    const pRisk = p.riskLevel || (p.isFreePool ? "NO_RISK" : "HIGH");
    return pRisk === riskFilter;
  });

  if (!loginSession) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans antialiased flex flex-col selection:bg-indigo-500 selection:text-white transition-colors duration-200 relative">
        <div className="absolute top-4 right-4 z-40">
          <button
            type="button"
            onClick={toggleTheme}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl active:scale-95 transition-all duration-75 shadow-sm cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Toggle Light or Dark Theme"
          >
            {isDarkMode ? (
              <>
                <Sun className="h-4 w-4 text-amber-500" />
                <span>Light Theme</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-indigo-600" />
                <span>Dark Theme</span>
              </>
            )}
          </button>
        </div>

        {notification && (
          <div 
            id="toast-notification"
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4.5 py-3 rounded-xl border shadow-lg transition-all duration-300 animate-slide-in ${
              notification.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-400"
                : notification.type === "error"
                ? "bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-400"
                : "bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-900 text-indigo-800 dark:text-indigo-400"
            }`}
          >
            <div className="rounded-full p-1 bg-white/80 dark:bg-slate-900">
              <Sparkles className={`h-4 w-4 ${
                notification.type === "success" 
                  ? "text-emerald-600" 
                  : notification.type === "error" 
                  ? "text-rose-600" 
                  : "text-indigo-600"
              }`} />
            </div>
            <span className="text-xs font-semibold">{notification.message}</span>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="ml-2 p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Close notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <LoginPortal 
          users={users} 
          onCreateNewUser={handleCreateNewUser} 
          onLogin={handleLogin} 
          currentAdminPin={currentAdminPin}
          brandingSettings={brandingSettings}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased flex flex-col selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      
      {/* Toast Notification */}
      {notification && (
        <div 
          id="toast-notification"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4.5 py-3 rounded-xl border shadow-lg transition-all duration-300 animate-slide-in ${
            notification.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-400"
              : notification.type === "error"
              ? "bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-400"
              : "bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-900 text-indigo-800 dark:text-indigo-400"
          }`}
        >
          <div className="rounded-full p-1 bg-white/80 dark:bg-slate-900">
            <Sparkles className={`h-4 w-4 ${
              notification.type === "success" 
                ? "text-emerald-600" 
                : notification.type === "error" 
                ? "text-rose-600" 
                : "text-indigo-600"
            }`} />
          </div>
          <span className="text-xs font-semibold">{notification.message}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="ml-2 p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Close notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Global Internet Offline Banner */}
      {!isAppOnline && (
        <div className="bg-rose-600 text-white px-4 py-2.5 text-xs font-bold text-center flex items-center justify-center gap-2 sticky top-0 z-50 shadow-md animate-pulse">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>⚠️ Internet Connection Offline! No trading or account actions can be performed until internet is restored.</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 backdrop-blur-md bg-white/95 dark:bg-slate-900/95 transition-colors shadow-2xs">
        <div className="w-full px-1 h-16 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0 shrink">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-sm shadow-indigo-600/20 shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 tracking-tight font-display leading-tight whitespace-nowrap">
                {brandingSettings.appTitle || "Shared Trade Pool"}
              </h1>
              <span className="text-[9px] sm:text-[10px] text-indigo-600 dark:text-indigo-400 font-bold tracking-wider uppercase block leading-none whitespace-nowrap">
                {brandingSettings.appTagline || "Fractional Trade Platform"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Session indicator */}
            {loginSession.role === "admin" ? (
              <span className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-[10px] sm:text-[11px] font-bold rounded-xl border border-indigo-200/80 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                <span>Admin Panel</span>
              </span>
            ) : (
              currentUserProfile && (
                <button
                  type="button"
                  onClick={() => setIsProfileSettingsOpen(true)}
                  className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/60 dark:hover:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs group whitespace-nowrap"
                  title="Click to update Profile Name & Login Email"
                >
                  <User className="h-3.5 w-3.5 text-indigo-500 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-slate-800 dark:text-slate-200">{currentUserProfile.name}</span>
                  <span className="text-slate-400 font-mono font-normal">(₹{(currentUserProfile.availableBalance ?? currentUserProfile.balance ?? 0).toFixed(0)})</span>
                  <span className="p-0.5 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 rounded text-[9px] font-bold uppercase ml-0.5">
                    Edit
                  </span>
                </button>
              )
            )}

            {/* Install App Button */}
            <button
              onClick={() => setIsInstallModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#5200FF] hover:bg-[#4300D6] text-white text-[10px] sm:text-[11px] font-black rounded-xl shadow-md shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer shrink-0 whitespace-nowrap"
              title="Install FTP Mobile App on your phone"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Install App</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 text-slate-700 dark:text-slate-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl active:scale-90 transition-all duration-75 cursor-pointer shrink-0 border border-slate-200 dark:border-slate-700"
              title="Toggle color theme"
            >
              {isDarkMode ? <Sun className="h-4.5 w-4.5 text-amber-500" /> : <Moon className="h-4.5 w-4.5 text-indigo-600" />}
            </button>

            <span className="hidden md:flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-mono font-bold whitespace-nowrap">
              <Coins className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              Active Pools: {manageablePools.length}
            </span>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="p-2 text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 border border-rose-200 dark:border-rose-900/60 rounded-xl active:scale-95 transition-all duration-75 cursor-pointer shrink-0 shadow-2xs flex items-center justify-center"
              title="Log out of session"
            >
              <LogOut className="h-4 w-4 shrink-0 stroke-[2.25]" />
            </button>
          </div>
        </div>
      </header>

      {/* Secondary Sub-Header Navigation */}
      <nav className="bg-white/95 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 sticky top-16 z-30 transition-colors backdrop-blur-md shadow-2xs">
        <div className="w-full px-1 flex items-center justify-between gap-1.5 overflow-x-auto py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {loginSession.role === "user" ? (
            <>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === "dashboard"
                      ? "bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/20"
                      : "text-slate-700 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <Compass className="h-4 w-4" />
                  <span>Pool Trading</span>
                </button>
                <button
                  onClick={() => setActiveTab("solo")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 relative ${
                    activeTab === "solo"
                      ? "bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/20"
                      : "text-slate-700 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <Zap className="h-4 w-4 text-amber-500 animate-pulse" />
                  <span>Solo Options Trading</span>
                  {soloConfig.isEnabled && (
                    <span className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 bg-emerald-500 text-white text-[9px] font-extrabold rounded-full uppercase tracking-wider self-center">
                      LIVE
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("portfolio")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === "portfolio"
                      ? "bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/20"
                      : "text-slate-700 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <History className="h-4 w-4" />
                  <span>My Portfolio</span>
                </button>
                <button
                  onClick={() => setActiveTab("wallet")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === "wallet"
                      ? "bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/20"
                      : "text-slate-700 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <Wallet className="h-4 w-4" />
                  <span>Trading Wallet</span>
                </button>
                <button
                  onClick={() => setActiveTab("support")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 relative ${
                    activeTab === "support"
                      ? "bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/20"
                      : "text-slate-700 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <MessageSquare className="h-4 w-4 text-indigo-500" />
                  <span>Live Chat Support</span>
                  {supportMessages.some(m => m.userId === currentUserProfile?.id && m.status === "RESOLVED" && m.adminReply) && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
                <button
                  onClick={() => setIsProfileSettingsOpen(true)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-all cursor-pointer whitespace-nowrap shrink-0"
                  title="Edit Profile Name & Registered Login Email"
                >
                  <User className="h-4 w-4 text-indigo-500" />
                  <span>Profile Settings</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab("admin")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === "admin"
                    ? "bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/20"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
                }`}
              >
                <Settings className="h-4 w-4" />
                <span>Admin Operations</span>
              </button>

              {hasHrAccess && (
                <button
                  onClick={() => setActiveTab("hr_payroll")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === "hr_payroll"
                      ? "bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/20"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <ShieldCheck className="h-4 w-4 text-amber-500" />
                  <span>HR & Payroll System</span>
                </button>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Main Canvas */}
      <main className="flex-1 w-full px-0 py-0 flex flex-col gap-0">
        
        {/* Tab Layout Renderings */}
        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 animate-fade-in">
            {/* Left section: Pool Card + Explainer math */}
            <div className="lg:col-span-2 flex flex-col gap-0 divide-y divide-slate-200 dark:divide-slate-800">
              
              {manageablePools.length > 0 ? (
                <div className="flex flex-col gap-0 divide-y divide-slate-200 dark:divide-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-none">
                    <h3 className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-400 tracking-wider flex items-center gap-1.5 px-0.5">
                      <span>🔥 Available Trade Pools</span>
                      <span className="bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {filteredPools.length}
                      </span>
                    </h3>

                    {/* Risk Filter Bar */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setRiskFilter("ALL")}
                        className={`px-2.5 py-1 text-[10.5px] font-extrabold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                          riskFilter === "ALL"
                            ? "bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-xs font-black"
                            : "text-slate-700 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100"
                        }`}
                      >
                        All Pools ({manageablePools.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setRiskFilter("NO_RISK")}
                        className={`px-2.5 py-1 text-[10.5px] font-extrabold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                          riskFilter === "NO_RISK"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                        }`}
                      >
                        🛡️ No Risk
                      </button>
                      <button
                        type="button"
                        onClick={() => setRiskFilter("LOW")}
                        className={`px-2.5 py-1 text-[10.5px] font-extrabold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                          riskFilter === "LOW"
                            ? "bg-sky-600 text-white shadow-xs"
                            : "text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/40"
                        }`}
                      >
                        🟦 Low Risk
                      </button>
                      <button
                        type="button"
                        onClick={() => setRiskFilter("MEDIUM")}
                        className={`px-2.5 py-1 text-[10.5px] font-extrabold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                          riskFilter === "MEDIUM"
                            ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                            : "text-amber-800 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40"
                        }`}
                      >
                        🟨 Med Risk
                      </button>
                      <button
                        type="button"
                        onClick={() => setRiskFilter("HIGH")}
                        className={`px-2.5 py-1 text-[10.5px] font-extrabold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                          riskFilter === "HIGH"
                            ? "bg-rose-600 text-white shadow-xs"
                            : "text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                        }`}
                      >
                        ⚡ High Risk
                      </button>
                    </div>
                  </div>

                  {filteredPools.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
                      {filteredPools.map((pool) => (
                        <PoolCard
                          key={pool.id}
                          pool={pool}
                          currentUser={currentUserProfile}
                          allUsers={users}
                          onJoinSuccess={() => triggerNotification(`Successfully joined ${pool.tradeType} pool!`, "success")}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6 text-center py-8">
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                        No pools found matching the selected risk level ({riskFilter}).
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-8 text-center flex flex-col items-center gap-4 py-12">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-full text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-100/30">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 font-display">
                      No Active Trade Pool Running
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mt-1 mx-auto leading-relaxed">
                      All trade pools have been resolved. Access the **Admin Command Deck** tab to adjust parameters and launch a new custom trade pool.
                    </p>
                  </div>
                </div>
              )}

              {/* Proportional Math guide */}
              <div id="payout-math-card" className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-5 px-4 shadow-none">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 font-display flex items-center gap-1.5 mb-3">
                  <HelpCircle className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                  Proportional Payout Distribution Math
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  When trades settle, total profit/loss is distributed proportionally based on each contributor's pool investment ratio:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 block">Step 1: Share Ratio</span>
                    <div className="font-mono text-xs font-bold text-slate-900 dark:text-slate-200 mt-1">
                      Ratio = User Invest / Target
                    </div>
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 block leading-normal">
                      User contributes ₹20 into ₹100 target pool (20% share).
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 block">Step 2: Proportional Profit</span>
                    <div className="font-mono text-xs font-bold text-slate-900 dark:text-slate-200 mt-1">
                      Gain = Ratio * Total Profit
                    </div>
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 block leading-normal">
                      If total profit is ₹80, user's share is 20% * ₹80 = +₹16 gain.
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 block">Step 3: Account Payout</span>
                    <div className="font-mono text-xs font-bold text-slate-900 dark:text-slate-200 mt-1">
                      Payout = Stake + Gain
                    </div>
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 block leading-normal">
                      User receives ₹20 (principal) + ₹16 (gain) = ₹36 credited back.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right section: Pool History */}
            <div className="flex flex-col gap-0">
              <PoolHistory pools={pools} currentUser={currentUserProfile} allUsers={users} />
            </div>
          </div>
        )}

        {activeTab === "solo" && (
          <div className="animate-fade-in">
            <SoloTradingEngine
              currentUser={currentUserProfile}
              soloConfig={soloConfig}
              isDarkMode={isDarkMode}
              onToggleTheme={toggleTheme}
              onTriggerNotification={triggerNotification}
              onUpdateProfile={(updatedUser) => {
                setUsers((prev) => prev.map((u) => u.id === updatedUser.id ? updatedUser : u));
                try {
                  localStorage.setItem("cached_user_" + updatedUser.id, JSON.stringify(updatedUser));
                } catch {}
              }}
            />
          </div>
        )}

        {activeTab === "portfolio" && (
          <div className="flex flex-col gap-2 animate-fade-in">
            <UserTradeHistory currentUser={currentUserProfile} pools={pools} />
          </div>
        )}

        {activeTab === "wallet" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 animate-fade-in">
            <div className="lg:col-span-2">
              <WalletPanel 
                currentUser={currentUserProfile} 
                walletTransactions={walletTransactions} 
                paymentDetails={paymentDetails}
                paymentGateways={paymentGateways}
                paymentNote={paymentNote}
                depositProcessingTime={depositProcessingTime}
                withdrawalProcessingTime={withdrawalProcessingTime}
                walletLimits={walletLimits}
              />
            </div>
            <div>
              <WalletHistory currentUser={currentUserProfile} walletTransactions={walletTransactions} />
            </div>
          </div>
        )}

        {activeTab === "support" && (
          <div className="animate-fade-in w-full">
            <UserSupportPage
              currentUser={currentUserProfile}
              supportMessages={supportMessages}
              onTriggerNotification={triggerNotification}
              onBackToDashboard={() => setActiveTab("dashboard")}
            />
          </div>
        )}

        {activeTab === "admin" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 animate-fade-in">
            <div className="lg:col-span-2">
              <AdminPanel
                currentUserId={loginSession?.userId}
                currentPool={currentPool}
                config={adminConfig}
                onConfigChange={handleAdminConfigChange}
                walletTransactions={walletTransactions}
                allPools={pools}
                allUsers={users}
                supportMessages={supportMessages}
                onTriggerNotification={triggerNotification}
                paymentDetails={paymentDetails}
                paymentGateways={paymentGateways}
                paymentNote={paymentNote}
                depositProcessingTime={depositProcessingTime}
                withdrawalProcessingTime={withdrawalProcessingTime}
                walletLimits={walletLimits}
                soloConfig={soloConfig}
              />
            </div>
            <div>
              <PoolHistory pools={pools} />
            </div>
          </div>
        )}

        {activeTab === "hr_payroll" && hasHrAccess && (
          <div className="animate-fade-in space-y-6 max-w-7xl mx-auto w-full">
            <HrPayrollManager
              currentAdminEmail={currentAdminAccount?.email || "amaizy1@gmail.com"}
              onTriggerNotification={triggerNotification}
            />
          </div>
        )}
      </main>

      {/* Profile Settings Modal */}
      <ProfileSettings
        currentUser={currentUserProfile}
        isOpen={isProfileSettingsOpen}
        onClose={() => setIsProfileSettingsOpen(false)}
        onProfileUpdated={() => triggerNotification("Profile name & login email updated!", "success")}
        onTriggerNotification={triggerNotification}
      />

      {/* User Support / Help Desk Modal */}
      <UserSupportModal
        currentUser={currentUserProfile}
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        supportMessages={supportMessages}
        onTriggerNotification={triggerNotification}
      />

      {/* Install PWA Mobile App Modal */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {/* Newly Created Trader Account - Unique Login PIN Display Modal */}
      {newlyCreatedPinModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-emerald-500/30 dark:border-emerald-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 text-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />

            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
              <KeyRound className="h-7 w-7" />
            </div>

            <div>
              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
                🎉 Account Created
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">
                Your Unique Login PIN
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Trader profile for <strong className="text-slate-800 dark:text-slate-200">{newlyCreatedPinModal.user.name}</strong> ({newlyCreatedPinModal.user.email})
              </p>
            </div>

            {/* Generated PIN Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                Your 6-Digit Secret Login PIN
              </span>
              <div className="text-3xl font-mono font-black tracking-widest text-emerald-600 dark:text-emerald-400 py-1">
                {newlyCreatedPinModal.pin}
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                🔑 Please save/note down this PIN! You will use your Email and this PIN to log into your account.
              </p>
            </div>

            {/* Actions: Copy & Share */}
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(newlyCreatedPinModal.pin);
                  setCopiedNewPin(true);
                  triggerNotification("Login PIN copied to clipboard!", "success");
                  setTimeout(() => setCopiedNewPin(false), 2000);
                }}
                className="flex-1 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedNewPin ? (
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

              {newlyCreatedPinModal.user.phone && (
                <a
                  href={`https://wa.me/${newlyCreatedPinModal.user.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Hi ${newlyCreatedPinModal.user.name}, your Trader Account created successfully! Your 6-digit Login PIN is: ${newlyCreatedPinModal.pin}. Login Email: ${newlyCreatedPinModal.user.email}.`
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

            {/* Proceed to Login Button */}
            <button
              type="button"
              onClick={() => {
                const userId = newlyCreatedPinModal.user.id;
                setNewlyCreatedPinModal(null);
                setSelectedUserId(userId);
                handleLogin("user", userId);
              }}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span>Continue to Trading Terminal</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 py-6 mt-12 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="w-full px-1 max-w-7xl mx-auto">
          <p>{footerText}</p>
        </div>
      </footer>
    </div>
  );
}
