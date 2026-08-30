import React, { useState, useEffect } from "react";
import { UserProfile, WalletTransaction, PaymentDetails, PaymentGateway, WithdrawalField, WalletLimits, DEFAULT_LIMITS_POLICY_NOTE, WalletTransferConfig } from "../types";
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Wallet, 
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Info,
  Building2,
  QrCode,
  Copy,
  Check,
  ShieldCheck,
  CreditCard,
  Maximize2,
  X,
  Smartphone,
  Download,
  Ban,
  Sliders,
  Zap,
  ShieldAlert,
  Send,
  Search,
  UserCheck,
  ArrowRightLeft
} from "lucide-react";
import { 
  createWalletRequest, 
  isUserMobileVerified, 
  DEFAULT_PAYMENT_DETAILS, 
  DEFAULT_DEPOSIT_PROCESSING_TIME, 
  DEFAULT_WITHDRAWAL_PROCESSING_TIME,
  subscribeWithdrawalFields,
  DEFAULT_WITHDRAWAL_FIELDS,
  DEFAULT_WALLET_LIMITS,
  getEffectiveLimits,
  validateTransactionLimits,
  DEFAULT_TRANSFER_CONFIG,
  subscribeTransferConfig,
  searchRecipientForTransfer,
  executeWalletTransfer
} from "../firebaseService";

interface WalletPanelProps {
  currentUser: UserProfile | null;
  walletTransactions: WalletTransaction[];
  paymentDetails?: PaymentDetails;
  paymentGateways?: PaymentGateway[];
  paymentNote?: string;
  depositProcessingTime?: string;
  withdrawalProcessingTime?: string;
  walletLimits?: WalletLimits;
}

export const WalletPanel: React.FC<WalletPanelProps> = ({
  currentUser,
  walletTransactions,
  paymentDetails = DEFAULT_PAYMENT_DETAILS,
  paymentGateways = [],
  paymentNote = "",
  depositProcessingTime = DEFAULT_DEPOSIT_PROCESSING_TIME,
  withdrawalProcessingTime = DEFAULT_WITHDRAWAL_PROCESSING_TIME,
  walletLimits = DEFAULT_WALLET_LIMITS,
}) => {
  const [activeAction, setActiveAction] = useState<"DEPOSIT" | "WITHDRAWAL" | "TRANSFER">("DEPOSIT");
  const [amount, setAmount] = useState<string>("");
  const [txDetails, setTxDetails] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>("");
  const [showPolicyInfo, setShowPolicyInfo] = useState(true);

  const [withdrawalFields, setWithdrawalFields] = useState<WithdrawalField[]>(DEFAULT_WITHDRAWAL_FIELDS);
  const [withdrawalInputs, setWithdrawalInputs] = useState<Record<string, string>>({});

  // Wallet Transfer state
  const [transferConfig, setTransferConfig] = useState<WalletTransferConfig>(DEFAULT_TRANSFER_CONFIG);
  const [recipientQuery, setRecipientQuery] = useState("");
  const [isSearchingRecipient, setIsSearchingRecipient] = useState(false);
  const [foundRecipient, setFoundRecipient] = useState<UserProfile | null>(null);
  const [recipientSearchError, setRecipientSearchError] = useState<string | null>(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [isConfirmTransferOpen, setIsConfirmTransferOpen] = useState(false);
  const [lastTransferTxId, setLastTransferTxId] = useState<string | null>(null);

  useEffect(() => {
    const unsubWithdraw = subscribeWithdrawalFields((fields) => {
      setWithdrawalFields(fields);
    });
    const unsubTransfer = subscribeTransferConfig((config) => {
      setTransferConfig(config);
    });
    return () => {
      unsubWithdraw();
      unsubTransfer();
    };
  }, []);

  const activeGateways = (paymentGateways && paymentGateways.length > 0)
    ? paymentGateways.filter((g) => g.isActive !== false)
    : [paymentDetails || DEFAULT_PAYMENT_DETAILS];

  const currentGateway = activeGateways.find((g) => g.id === selectedGatewayId) || activeGateways[0] || paymentDetails || DEFAULT_PAYMENT_DETAILS;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSearchRecipient = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!recipientQuery.trim()) return;
    setIsSearchingRecipient(true);
    setRecipientSearchError(null);
    setFoundRecipient(null);

    try {
      const res = await searchRecipientForTransfer(recipientQuery.trim());
      if (!res) {
        setRecipientSearchError(`No active user found matching '${recipientQuery.trim()}'. Please verify the User ID, Email, or Mobile.`);
      } else if (res.id === currentUser?.id) {
        setRecipientSearchError("Self-transfer is not permitted. Please enter another user's details.");
      } else {
        setFoundRecipient(res);
      }
    } catch (err: any) {
      setRecipientSearchError(err.message || "Recipient search failed.");
    } finally {
      setIsSearchingRecipient(false);
    }
  };

  const handleOpenTransferConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!transferConfig.isEnabled) {
      setErrorMsg("Wallet-to-Wallet balance transfers are currently deactivated by Admin.");
      return;
    }

    if (currentUser?.isTransferDisabled) {
      setErrorMsg("Wallet transfers are currently restricted for your account by Admin.");
      return;
    }

    if (!foundRecipient) {
      setErrorMsg("Please search and verify a recipient user before proceeding.");
      return;
    }

    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg("Please enter a valid positive transfer amount.");
      return;
    }

    if (amt < transferConfig.minTransferAmount) {
      setErrorMsg(`Transfer amount is below minimum permitted limit of ₹${transferConfig.minTransferAmount}.`);
      return;
    }

    if (amt > transferConfig.maxTransferAmount) {
      setErrorMsg(`Transfer amount exceeds maximum permitted limit of ₹${transferConfig.maxTransferAmount} per transaction.`);
      return;
    }

    const avail = currentUser?.availableBalance ?? currentUser?.balance ?? 0;
    if (amt > avail) {
      setErrorMsg(`Insufficient wallet balance! Available: ₹${avail.toFixed(2)}.`);
      return;
    }

    setIsConfirmTransferOpen(true);
  };

  const handleExecuteTransferSubmit = async () => {
    if (!foundRecipient || !currentUser) return;
    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await executeWalletTransfer(
        currentUser.id,
        foundRecipient.id,
        amt,
        transferNote
      );

      if (res.success) {
        setSuccessMsg(res.message);
        setLastTransferTxId(res.transactionId || null);
        setTransferAmount("");
        setTransferNote("");
        setFoundRecipient(null);
        setRecipientQuery("");
        setIsConfirmTransferOpen(false);
      } else {
        setErrorMsg(res.message);
        setIsConfirmTransferOpen(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to complete wallet transfer.");
      setIsConfirmTransferOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 text-center text-slate-400 dark:text-slate-500 text-xs italic">
        Please select a simulator profile above to access your secure wallet.
      </div>
    );
  }

  const available = currentUser.availableBalance ?? currentUser.balance;
  const locked = currentUser.lockedBalance ?? 0;
  const total = currentUser.balance ?? 0;

  // Filter transactions for this user (Deposits, Withdrawals, P2P Transfers)
  const userRequests = walletTransactions.filter(
    (tx) => tx.userId === currentUser.id && (
      tx.type === "DEPOSIT" || 
      tx.type === "WITHDRAWAL" ||
      tx.type === "TRANSFER_SENT" ||
      tx.type === "TRANSFER_RECEIVED"
    )
  );

  const effectiveLimits = getEffectiveLimits(walletLimits, currentUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Please enter a valid positive number.");
      }

      // Check client-side limit rules
      const limitValidation = validateTransactionLimits(
        currentUser.id,
        activeAction as "DEPOSIT" | "WITHDRAWAL",
        parsedAmount,
        currentUser,
        walletLimits,
        userRequests
      );
      if (!limitValidation.valid) {
        throw new Error(limitValidation.error || "Transaction amount violates configured limits.");
      }

      if (activeAction === "WITHDRAWAL" && parsedAmount > available) {
        throw new Error(`Insufficient Available Balance! You can only withdraw up to ₹${available.toFixed(2)}.`);
      }

      if (activeAction === "DEPOSIT" && activeGateways.length === 0) {
        throw new Error("Deposits are currently disabled by Admin. Payment options are offline.");
      }

      if (activeAction === "DEPOSIT" && !txDetails.trim()) {
        throw new Error("Transaction details are required for deposit verification.");
      }

      let compiledTxDetails = txDetails.trim();
      let submissionWithdrawalData: Record<string, string> | undefined = undefined;

      if (activeAction === "WITHDRAWAL") {
        // Validate required withdrawal input fields
        for (const field of withdrawalFields) {
          if (field.required && (!withdrawalInputs[field.id] || !withdrawalInputs[field.id].trim())) {
            throw new Error(`Please fill out the required withdrawal field: "${field.label}"`);
          }
        }

        submissionWithdrawalData = { ...withdrawalInputs };

        const summaryLines = withdrawalFields
          .map((f) => {
            const val = withdrawalInputs[f.id]?.trim();
            return val ? `${f.label}: ${val}` : null;
          })
          .filter(Boolean);

        if (txDetails.trim()) {
          summaryLines.push(`Notes: ${txDetails.trim()}`);
        }

        compiledTxDetails = summaryLines.join(" | ");
      }

      await createWalletRequest(
        currentUser.id, 
        activeAction as "DEPOSIT" | "WITHDRAWAL", 
        parsedAmount, 
        compiledTxDetails, 
        submissionWithdrawalData
      );
      setSuccessMsg(`Your ${activeAction.toLowerCase()} request for ₹${parsedAmount} was submitted successfully! It is pending administrator approval.`);
      setAmount("");
      setTxDetails("");
      setWithdrawalInputs({});
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit wallet request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="wallet-panel" className="bg-white dark:bg-slate-900 rounded-none border-0 border-b border-slate-200 dark:border-slate-800 py-5 px-3.5 sm:px-5 shadow-none flex flex-col gap-5 w-full">
      {/* Wallet overview title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-150 font-display">
              My Secure Trading Wallet
            </h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Request deposit & withdrawals, view real-time balance structures.
            </p>
          </div>
        </div>
      </div>

      {!isUserMobileVerified(currentUser) && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-300">
            <Smartphone className="h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <span className="font-extrabold block">Mobile Verification Pending</span>
              <span className="text-[11px] text-slate-600 dark:text-slate-300">
                Deposits and withdrawals are locked until mobile verification is complete. Please ask Admin for your 6-digit PIN.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Balance Bento Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
            Available Balance
          </span>
          <span className="text-xl font-extrabold text-slate-950 dark:text-slate-100 font-mono mt-1.5 block">
            ₹{available.toFixed(2)}
          </span>
          <span className="text-[9px] text-slate-400 dark:text-slate-500 leading-snug mt-1 flex items-center gap-1">
            <Info className="h-3 w-3 text-indigo-400 shrink-0" /> Available for instant trade entry
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
            Locked Balance
          </span>
          <span className="text-xl font-extrabold text-slate-950 dark:text-slate-100 font-mono mt-1.5 block">
            ₹{locked.toFixed(2)}
          </span>
          <span className="text-[9px] text-slate-400 dark:text-slate-500 leading-snug mt-1 flex items-center gap-1">
            <Info className="h-3 w-3 text-amber-500 shrink-0" /> Committed to running trades
          </span>
        </div>

        <div className="bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-100/30 dark:border-indigo-900/30 p-4 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">
            Total Account Balance
          </span>
          <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300 font-mono mt-1 block">
            ₹{total.toFixed(2)}
          </span>
          <span className="text-[9px] text-slate-400 dark:text-slate-500 leading-snug mt-1">
            Sum of available & locked funds
          </span>
        </div>
      </div>

      {/* Forms for request */}
      <div className="border-t border-slate-100 dark:border-slate-800/80 pt-5">
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg max-w-md mb-4">
          <button
            type="button"
            onClick={() => { setActiveAction("DEPOSIT"); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md active:scale-[0.97] transition-all duration-75 cursor-pointer flex items-center justify-center gap-1 ${
              activeAction === "DEPOSIT"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-500" />
            Deposit
          </button>
          <button
            type="button"
            onClick={() => { setActiveAction("WITHDRAWAL"); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md active:scale-[0.97] transition-all duration-75 cursor-pointer flex items-center justify-center gap-1 ${
              activeAction === "WITHDRAWAL"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <ArrowDownCircle className="h-3.5 w-3.5 text-rose-500" />
            Withdraw
          </button>
          <button
            type="button"
            onClick={() => { setActiveAction("TRANSFER"); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md active:scale-[0.97] transition-all duration-75 cursor-pointer flex items-center justify-center gap-1 relative ${
              activeAction === "TRANSFER"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Send className="h-3.5 w-3.5 text-indigo-300" />
            <span>P2P Transfer</span>
            {!transferConfig.isEnabled && (
              <span className="w-2 h-2 rounded-full bg-rose-500 absolute -top-0.5 -right-0.5" title="Feature deactivated by admin" />
            )}
          </button>
        </div>

        {activeAction === "TRANSFER" ? (
          <div className="flex flex-col gap-5 animate-fade-in my-2">
            {/* Banner Info */}
            <div className="p-4 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Wallet-to-Wallet Balance Transfer
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Send wallet balance instantly to any registered user. Zero fee, instant atomic updates.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-lg">
                  Min: ₹{transferConfig.minTransferAmount} | Max: ₹{transferConfig.maxTransferAmount}
                </span>
              </div>
            </div>

            {/* Feature deactivated check */}
            {!transferConfig.isEnabled && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-center gap-3 text-rose-700 dark:text-rose-400 text-xs font-bold">
                <ShieldAlert className="h-5 w-5 shrink-0 text-rose-600" />
                <div>
                  <span>Wallet-to-Wallet transfer feature is currently deactivated by Admin.</span>
                  <p className="text-[11px] font-normal text-rose-600 dark:text-rose-300 mt-0.5">Transfers cannot be processed until enabled by Admin.</p>
                </div>
              </div>
            )}

            {/* User restriction check */}
            {currentUser.isTransferDisabled && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex items-center gap-3 text-amber-800 dark:text-amber-300 text-xs font-bold">
                <Ban className="h-5 w-5 shrink-0 text-amber-500" />
                <div>
                  <span>Transfers are restricted for your account.</span>
                  <p className="text-[11px] font-normal text-amber-700 dark:text-amber-400 mt-0.5">Please contact Admin support if you believe this is an error.</p>
                </div>
              </div>
            )}

            {/* Recipient Search Box */}
            <div className="bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-indigo-500" />
                1. Search Recipient (User ID, Registered Email, Username or Phone)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={recipientQuery}
                  onChange={(e) => {
                    setRecipientQuery(e.target.value);
                    setRecipientSearchError(null);
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSearchRecipient(e); }}
                  placeholder="Enter recipient User ID, Email, Username, or Mobile..."
                  className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleSearchRecipient}
                  disabled={isSearchingRecipient || !recipientQuery.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSearchingRecipient ? (
                    <Clock className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Search className="h-3.5 w-3.5" />
                  )}
                  <span>Search User</span>
                </button>
              </div>

              {recipientSearchError && (
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-3 py-2 rounded-lg border border-rose-200/50 dark:border-rose-900/40">
                  ⚠️ {recipientSearchError}
                </p>
              )}

              {/* Verified Recipient Card */}
              {foundRecipient && (
                <div className="p-3.5 bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between gap-3 animate-fade-in shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-600 text-white rounded-full font-extrabold text-xs">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                        ✓ Recipient Verified
                      </span>
                      <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                        {foundRecipient.name || "Trading User"}
                      </h4>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        ID: {foundRecipient.id} • {foundRecipient.email || foundRecipient.mobileNumber || "Active Account"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setFoundRecipient(null); setRecipientQuery(""); }}
                    className="p-1.5 hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60 rounded-full text-emerald-800 dark:text-emerald-300 transition-colors cursor-pointer"
                    title="Change recipient"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Amount & Note Form */}
            <form onSubmit={handleOpenTransferConfirm} className="flex flex-col gap-4 bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>2. Transfer Amount (₹)</span>
                  <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-extrabold">
                    Available: ₹{available.toFixed(2)}
                  </span>
                </label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-sm">₹</span>
                  <input
                    type="number"
                    min={transferConfig.minTransferAmount}
                    max={transferConfig.maxTransferAmount}
                    step="any"
                    required
                    disabled={!foundRecipient || !transferConfig.isEnabled || currentUser.isTransferDisabled}
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder={foundRecipient ? `Enter amount (Min ₹${transferConfig.minTransferAmount})` : "Search recipient user above first..."}
                    className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  />
                </div>

                {/* Quick Amount Chips */}
                {foundRecipient && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-bold mr-1">Quick Presets:</span>
                    {[100, 500, 1000, 2000, 5000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setTransferAmount(preset.toString())}
                        className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                          transferAmount === preset.toString()
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                            : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400"
                        }`}
                      >
                        ₹{preset}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setTransferAmount(Math.min(available, transferConfig.maxTransferAmount).toString())}
                      className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 cursor-pointer"
                    >
                      Max (₹{Math.min(available, transferConfig.maxTransferAmount).toFixed(0)})
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  3. Remark / Transfer Note (Optional)
                </label>
                <input
                  type="text"
                  maxLength={100}
                  disabled={!foundRecipient || !transferConfig.isEnabled || currentUser.isTransferDisabled}
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="e.g. Trading pool share, loan repayment..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200/80 dark:border-rose-900/60 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-400">
                  ⚠️ {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-900/60 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex flex-col gap-1">
                  <span>✅ {successMsg}</span>
                  {lastTransferTxId && (
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                      Transaction ID: {lastTransferTxId}
                    </span>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  !foundRecipient ||
                  !transferAmount ||
                  parseFloat(transferAmount) <= 0 ||
                  !transferConfig.isEnabled ||
                  currentUser.isTransferDisabled
                }
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
                <span>Review & Transfer ₹{transferAmount || "0"} Now</span>
              </button>
            </form>

            {/* Confirmation Modal for Wallet Transfer */}
            {isConfirmTransferOpen && foundRecipient && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative flex flex-col gap-4">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                        <Send className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-display">
                          Confirm Balance Transfer
                        </h3>
                        <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                          Review transfer details before executing
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsConfirmTransferOpen(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Recipient Details */}
                  <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col gap-2">
                    <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                      Recipient User
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-600 text-white rounded-full font-bold text-xs shrink-0">
                        <UserCheck className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                          {foundRecipient.name || "Trading User"}
                        </h4>
                        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                          ID: {foundRecipient.id} • {foundRecipient.email || foundRecipient.mobileNumber || "Active Profile"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Transfer Amount & Fee Breakdown */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-indigo-50/80 dark:bg-indigo-950/40 p-3 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 flex flex-col">
                      <span className="text-[9px] font-sans uppercase font-bold text-indigo-500 block">
                        Transfer Amount
                      </span>
                      <strong className="text-base sm:text-lg font-black text-indigo-700 dark:text-indigo-300 mt-0.5 truncate">
                        ₹{parseFloat(transferAmount || "0").toFixed(2)}
                      </strong>
                    </div>

                    <div className="bg-emerald-50/80 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 flex flex-col">
                      <span className="text-[9px] font-sans uppercase font-bold text-emerald-600 dark:text-emerald-400 block">
                        Transfer Fee
                      </span>
                      <strong className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5 truncate">
                        ₹0.00 (Free)
                      </strong>
                    </div>
                  </div>

                  {/* Balance Impact */}
                  <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs flex flex-col gap-1.5 font-mono">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Available Balance:</span>
                      <strong className="text-slate-900 dark:text-slate-100">
                        ₹{(currentUser?.availableBalance ?? currentUser?.balance ?? 0).toFixed(2)}
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-800">
                      <span>New Balance After Transfer:</span>
                      <strong className="text-indigo-600 dark:text-indigo-400 font-extrabold">
                        ₹{Math.max(0, (currentUser?.availableBalance ?? currentUser?.balance ?? 0) - (parseFloat(transferAmount) || 0)).toFixed(2)}
                      </strong>
                    </div>
                    {transferNote && (
                      <div className="mt-1 pt-1 border-t border-slate-200/50 dark:border-slate-800 text-[11px] font-sans text-slate-500 dark:text-slate-400 truncate">
                        Note: <span className="font-semibold text-slate-800 dark:text-slate-200">{transferNote}</span>
                      </div>
                    )}
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200/80 dark:border-rose-900/60 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setIsConfirmTransferOpen(false)}
                      className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleExecuteTransferSubmit}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Clock className="h-4 w-4 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          <span>Confirm & Transfer ₹{transferAmount}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
        {/* Processing Time Indicator Badge Banner */}
        <div className="mb-4 p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600 text-white rounded-lg shrink-0">
              <Clock className="h-4 w-4 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider block">
                {activeAction === "DEPOSIT" ? "Estimated Deposit Processing Time (जमा होने का समय)" : "Estimated Withdrawal Processing Time (निकासी होने का समय)"}
              </span>
              <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                ⏱️ {activeAction === "DEPOSIT" ? depositProcessingTime : withdrawalProcessingTime}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-900/60 px-2.5 py-1 rounded-md hidden sm:inline-block">
            {activeAction === "DEPOSIT" ? "Instant UTR Verification" : "Direct Bank/UPI Transfer"}
          </span>
        </div>

        {/* Deposit Bank & UPI Details Banner */}
        {activeAction === "DEPOSIT" && (() => {
          if (activeGateways.length === 0) {
            return (
              <div className="mb-6 p-5 sm:p-6 bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200/90 dark:border-rose-900/60 rounded-2xl flex flex-col items-center justify-center text-center gap-3 shadow-2xs">
                <div className="p-3 bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-full">
                  <Ban className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 font-display uppercase tracking-wider">
                    Deposits Temporarily Closed
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-md leading-relaxed font-medium">
                    Admin has temporarily hidden payment options and disabled deposit requests. Please check back later or contact Help Desk support for assistance.
                  </p>
                </div>
              </div>
            );
          }

          const parsedAmt = parseFloat(amount);
          const hasValidAmount = !isNaN(parsedAmt) && parsedAmt > 0;
          const amountQuery = hasValidAmount ? `&am=${parsedAmt}` : "";
          const upiPayString = `upi://pay?pa=${currentGateway.upiId}&pn=${encodeURIComponent(currentGateway.accountName)}&cu=INR${amountQuery}`;
          const dynamicQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiPayString)}`;
          const generatedQrUrl = (hasValidAmount || !currentGateway.qrCodeUrl) ? dynamicQrUrl : currentGateway.qrCodeUrl;

          return (
            <div className="mb-6 p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-950/60 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl flex flex-col gap-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 font-display uppercase tracking-wider">
                      Official Deposit Payment Details
                    </h3>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                      Send funds using UPI QR, UPI ID or Bank Transfer, then submit your transaction reference below.
                    </p>
                  </div>
                </div>
                <span className="self-start sm:self-auto inline-flex items-center gap-1 text-[9.5px] font-extrabold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/50">
                  <Check className="h-3 w-3" /> VERIFIED GATEWAY
                </span>
              </div>

              {/* Multiple Payment Gateways Switcher */}
              {activeGateways.length > 1 && (
                <div className="flex flex-col gap-1.5 p-2 bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-950 rounded-xl">
                  <span className="text-[9.5px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                    Select Preferred Payment Gateway ({activeGateways.length} Available):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeGateways.map((gw) => (
                      <button
                        key={gw.id}
                        type="button"
                        onClick={() => setSelectedGatewayId(gw.id)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer border flex items-center gap-1.5 ${
                          currentGateway.id === gw.id
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                            : "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400"
                        }`}
                      >
                        <Building2 className="h-3.5 w-3.5" />
                        <span>{gw.title || gw.bankName || "UPI Gateway"}</span>
                        {currentGateway.id === gw.id && <Check className="h-3 w-3 ml-0.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* UPI Option with QR Code */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider flex items-center gap-1">
                      <QrCode className="h-3.5 w-3.5" /> UPI Payment (GPay/PhonePe/Paytm)
                    </span>
                    <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded font-mono font-bold">
                      {currentGateway.bankName || "UPI"}
                    </span>
                  </div>

                  {/* UPI QR Code Display Box */}
                  <div className="bg-slate-50 dark:bg-slate-950/80 p-3 rounded-xl border border-indigo-100 dark:border-indigo-950 flex items-center gap-3">
                    <div className="relative group bg-white p-1.5 rounded-lg border border-slate-200 shadow-xs shrink-0 cursor-pointer" onClick={() => setIsQrModalOpen(true)}>
                      <img
                        src={generatedQrUrl}
                        alt="UPI QR Code"
                        className="w-16 h-16 object-contain rounded"
                      />
                      <div className="absolute inset-0 bg-indigo-900/60 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Maximize2 className="h-4 w-4 text-white" />
                      </div>
                    </div>

                    <div className="flex flex-col justify-between h-full min-w-0 flex-1">
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[9px] uppercase font-bold text-slate-400">
                            {currentGateway.fieldLabels?.upiId || "UPI ID"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsQrModalOpen(true)}
                            className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <QrCode className="h-3 w-3" /> View QR
                          </button>
                        </div>
                        <span className="text-xs font-mono font-extrabold text-slate-900 dark:text-slate-100 truncate block mt-0.5">
                          {currentGateway.upiId}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1 mt-2">
                        <button
                          type="button"
                          onClick={() => handleCopy(currentGateway.upiId, "upi")}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 rounded-lg text-[9.5px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {copiedKey === "upi" ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy {currentGateway.fieldLabels?.upiId || "UPI"}</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsQrModalOpen(true)}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9.5px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                        >
                          <Smartphone className="h-3 w-3" />
                          <span>Scan QR</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between">
                    <span>{currentGateway.fieldLabels?.accountName || "Account Name"}: <strong className="text-slate-800 dark:text-slate-200 font-bold">{currentGateway.accountName}</strong></span>
                    {hasValidAmount ? (
                      <span className="text-[9px] font-mono font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200/50">
                        ⚡ QR Amount: ₹{parsedAmt}
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200/50">
                        ✨ Open QR: Pay Any Amount
                      </span>
                    )}
                  </div>
                </div>

                {/* Bank Transfer Option */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-extrabold text-slate-700 dark:text-slate-300 tracking-wider flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-slate-500" /> Bank Transfer / Payment Details
                    </span>
                    <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold">
                      {currentGateway.bankName}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                    <div className="bg-slate-50 dark:bg-slate-950/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">
                        {currentGateway.fieldLabels?.accountName || "Account Holder"}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                        {currentGateway.accountName}
                      </span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
                      <div className="min-w-0">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">
                          {currentGateway.fieldLabels?.accountNumber || "Account No"}
                        </span>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 truncate block">
                          {currentGateway.accountNumber}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(currentGateway.accountNumber, "acc")}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 rounded transition-colors shrink-0 cursor-pointer"
                        title="Copy Account Number"
                      >
                        {copiedKey === "acc" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
                      <div className="min-w-0">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">
                          {currentGateway.fieldLabels?.ifscCode || "IFSC Code"}
                        </span>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 truncate block">
                          {currentGateway.ifscCode}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(currentGateway.ifscCode, "ifsc")}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 rounded transition-colors shrink-0 cursor-pointer"
                        title="Copy IFSC Code"
                      >
                        {copiedKey === "ifsc" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">
                        {currentGateway.fieldLabels?.branchAndType || "Branch / Type"}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                        {currentGateway.branchAndType}
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Custom Fields for User View */}
                  {currentGateway.customFields && currentGateway.customFields.length > 0 && (
                    <div className="mt-1 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1.5">
                      <span className="text-[9px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">
                        Additional Gateway Details
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {currentGateway.customFields.map((cf) => (
                          <div
                            key={cf.id}
                            className="bg-slate-50 dark:bg-slate-950/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1"
                          >
                            <div className="min-w-0">
                              <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">
                                {cf.label}
                              </span>
                              <span className="font-mono font-bold text-slate-900 dark:text-slate-100 truncate block text-[10.5px]">
                                {cf.value}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopy(cf.value, cf.id)}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 rounded transition-colors shrink-0 cursor-pointer"
                              title={`Copy ${cf.label}`}
                            >
                              {copiedKey === cf.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Payment Instructions & Alternative Options Note */}
              {paymentNote && paymentNote.trim().length > 0 && (
                <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-xl flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                    <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-bold font-display uppercase tracking-wider">
                      Payment Information & Alternative Options Note
                    </span>
                    <span className="ml-auto text-[9px] px-1.5 py-0.2 bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-extrabold rounded font-mono">
                      ADMIN NOTICE
                    </span>
                  </div>
                  <div className="text-xs text-amber-900/90 dark:text-amber-200/90 whitespace-pre-line leading-relaxed font-medium pl-5 border-l-2 border-amber-400 dark:border-amber-600">
                    {paymentNote}
                  </div>
                </div>
              )}

              {/* UPI QR Code Modal */}
              {isQrModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative flex flex-col items-center text-center gap-4">
                    <button
                      type="button"
                      onClick={() => setIsQrModalOpen(false)}
                      className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>

                    <div className="flex flex-col items-center gap-1">
                      <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                        <QrCode className="h-6 w-6" />
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-1 font-display">
                        UPI QR Code Payment
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Scan using Google Pay, PhonePe, Paytm, or BHIM UPI app
                      </p>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border-2 border-indigo-100 shadow-md">
                      <img
                        src={generatedQrUrl}
                        alt="UPI Payment QR Code"
                        className="w-56 h-56 object-contain rounded-xl"
                      />
                    </div>

                    {hasValidAmount ? (
                      <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-full text-xs font-bold font-mono text-emerald-700 dark:text-emerald-300">
                        ⚡ Amount to Pay: ₹{parsedAmt.toFixed(2)}
                      </div>
                    ) : (
                      <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-full text-xs font-bold font-mono text-indigo-700 dark:text-indigo-300">
                        ✨ Open QR Code: Pay Any Amount of Choice in UPI App
                      </div>
                    )}

                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 w-full flex items-center justify-between text-left gap-2">
                      <div className="min-w-0">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">UPI ID</span>
                        <span className="text-xs font-mono font-extrabold text-slate-900 dark:text-slate-100 truncate block">
                          {currentGateway.upiId}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(currentGateway.upiId, "upi-modal")}
                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                      >
                        {copiedKey === "upi-modal" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedKey === "upi-modal" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      Payee: <strong className="text-slate-800 dark:text-slate-200">{currentGateway.accountName}</strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsQrModalOpen(false)}
                      className="w-full py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Done / Back to Deposit
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Disabled Alert if Action Disabled */}
        {activeAction === "DEPOSIT" && !effectiveLimits.depositsEnabled && (
          <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center gap-2.5 text-xs text-rose-800 dark:text-rose-300">
            <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0" />
            <div>
              <span className="font-bold block">Deposits Disabled</span>
              <span className="text-[11px] opacity-90">Deposits are currently disabled by Admin. Please check back later.</span>
            </div>
          </div>
        )}

        {activeAction === "WITHDRAWAL" && !effectiveLimits.withdrawalsEnabled && (
          <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center gap-2.5 text-xs text-rose-800 dark:text-rose-300">
            <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0" />
            <div>
              <span className="font-bold block">Withdrawals Disabled</span>
              <span className="text-[11px] opacity-90">Withdrawals are currently disabled by Admin. Please check back later.</span>
            </div>
          </div>
        )}

        {/* Enhanced Deposit & Withdrawal Limits & Policy Information Card */}
        <div className="mb-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs transition-all">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${activeAction === "DEPOSIT" ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400" : "bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400"}`}>
                <Sliders className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  {activeAction === "DEPOSIT" ? "Deposit Limits" : "Withdrawal Limits"}
                  {currentUser?.customLimits?.isVip && (
                    <span className="bg-amber-500/20 text-amber-600 dark:text-amber-300 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border border-amber-500/30">
                      👑 VIP Limits Active
                    </span>
                  )}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Account Security & Operations Policy
                </p>
              </div>
            </div>

            {effectiveLimits.showLimitsPolicyToUsers !== false && (
              <button
                type="button"
                onClick={() => setShowPolicyInfo(!showPolicyInfo)}
                className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/40 cursor-pointer"
              >
                <Info className="h-3.5 w-3.5" />
                <span>{showPolicyInfo ? "Hide Limits Guide" : "Deposit & Withdrawal Rules"}</span>
              </button>
            )}
          </div>

          {/* Limit Values Grid */}
          <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
            <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/50 dark:border-slate-800">
              <span className="text-[9px] font-sans font-bold text-slate-400 block uppercase">Min / Single Tx</span>
              <strong className="text-slate-900 dark:text-slate-100">
                ₹{(activeAction === "DEPOSIT" ? effectiveLimits.minDeposit : effectiveLimits.minWithdrawal).toLocaleString('en-IN')}
              </strong>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/50 dark:border-slate-800">
              <span className="text-[9px] font-sans font-bold text-slate-400 block uppercase">Max / Single Tx</span>
              <strong className="text-slate-900 dark:text-slate-100">
                ₹{(activeAction === "DEPOSIT" ? effectiveLimits.maxDeposit : effectiveLimits.maxWithdrawal).toLocaleString('en-IN')}
              </strong>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/50 dark:border-slate-800">
              <span className="text-[9px] font-sans font-bold text-slate-400 block uppercase">Daily Max (24h)</span>
              <strong className="text-slate-900 dark:text-slate-100">
                ₹{(activeAction === "DEPOSIT" ? effectiveLimits.maxDepositPerDay : effectiveLimits.maxWithdrawalPerDay).toLocaleString('en-IN')}
              </strong>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/50 dark:border-slate-800">
              <span className="text-[9px] font-sans font-bold text-slate-400 block uppercase">Monthly Max</span>
              <strong className="text-slate-900 dark:text-slate-100">
                ₹{(activeAction === "DEPOSIT" ? effectiveLimits.maxDepositPerMonth : effectiveLimits.maxWithdrawalPerMonth).toLocaleString('en-IN')}
              </strong>
            </div>
          </div>

          {/* Deposit & Withdrawal Limits Policy Notice */}
          {showPolicyInfo && effectiveLimits.showLimitsPolicyToUsers !== false && (
            <div className="mt-3 p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-xs animate-fade-in text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-200 mb-1.5">
                <ShieldCheck className="h-4 w-4 text-indigo-500 shrink-0" />
                <span>Deposit & Withdrawal Limits Policy</span>
              </div>
              <div className="space-y-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                {(effectiveLimits.limitsPolicyNote || DEFAULT_LIMITS_POLICY_NOTE)
                  .split("\n")
                  .filter(line => line.trim().length > 0)
                  .map((line, idx) => {
                    const cleanLine = line.trim();
                    if (cleanLine.toLowerCase().includes("deposit & withdrawal limits policy")) {
                      return null; // Skip header if present in note content as title is rendered above
                    }
                    if (cleanLine.startsWith("•") || cleanLine.startsWith("-") || cleanLine.startsWith("*")) {
                      return (
                        <div key={idx} className="flex items-start gap-1.5 pl-1">
                          <span className="text-indigo-500 font-bold font-mono">•</span>
                          <span>{cleanLine.replace(/^[•\-\*]\s*/, '')}</span>
                        </div>
                      );
                    }
                    return (
                      <p key={idx} className="font-medium text-slate-700 dark:text-slate-200 mb-1">
                        {cleanLine}
                      </p>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 max-w-md">
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                Enter Amount (₹) / Custom Deposit
              </label>
              {activeAction === "DEPOSIT" && (
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                  {amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 ? `Dynamic QR set to ₹${amount}` : "Open QR Mode (Any Amount)"}
                </span>
              )}
            </div>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500 font-mono text-sm">₹</span>
              <input
                id="wallet-amount-input"
                type="number"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                placeholder={activeAction === "DEPOSIT" ? "Enter any amount e.g. 500, 1000 or select preset below" : "Enter amount e.g. 500"}
              />
            </div>

            {/* Quick Amount Preset Chips for Deposits */}
            {activeAction === "DEPOSIT" && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold mr-1">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => setAmount("")}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md border transition-all cursor-pointer ${
                    !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                  }`}
                >
                  ✨ Any Amount (Open QR)
                </button>
                {[100, 500, 1000, 2000, 5000, 10000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset.toString())}
                    className={`px-2 py-1 text-[10px] font-mono font-bold rounded-md border transition-all cursor-pointer ${
                      amount === preset.toString()
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                    }`}
                  >
                    ₹{preset}
                  </button>
                ))}
              </div>
            )}

            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 leading-snug">
              {activeAction === "DEPOSIT" 
                ? "💡 You can deposit any amount of your choice. Enter an amount or click a preset to update the QR code, or scan the Open QR to type your amount directly in GPay/PhonePe."
                : "Withdrawals are restricted to available balances and require admin approval."}
            </p>
          </div>

          {/* Fast Instant Withdrawal Saved Bank Account Card */}
          {activeAction === "WITHDRAWAL" && currentUser?.savedBankDetails?.accountNumber && (
            <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 rounded-xl flex flex-col gap-2.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-800 dark:text-emerald-300">
                  <Zap className="h-4 w-4 text-emerald-500 fill-emerald-500 animate-pulse" />
                  <span>⚡ Instant Fast Withdrawal to Saved Bank Account</span>
                </div>
                <span className="text-[9px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300/50">
                  {currentUser.savedBankDetails.nameMatched ? "✓ Name Matched" : "Linked"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10.5px] font-mono bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/50 shadow-2xs">
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase font-sans font-bold">Account Holder</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{currentUser.savedBankDetails.accountHolderName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase font-sans font-bold">Bank Name</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{currentUser.savedBankDetails.bankName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase font-sans font-bold">Account Number</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{currentUser.savedBankDetails.accountNumber}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase font-sans font-bold">IFSC Code</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{currentUser.savedBankDetails.ifscCode}</span>
                </div>
                {currentUser.savedBankDetails.customFields && currentUser.savedBankDetails.customFields.map((cf, cIdx) => (
                  <div key={cf.id || cIdx}>
                    <span className="text-[9px] text-slate-400 block uppercase font-sans font-bold">{cf.label}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{cf.value || "-"}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  const updated: Record<string, string> = { ...withdrawalInputs };
                  withdrawalFields.forEach(f => {
                    const l = f.label.toLowerCase().trim();

                    // 1. Bank Name & IFSC Code combined field (e.g., "BANK NAME & IFSC CODE")
                    if ((l.includes("bank") || l.includes("bank name")) && l.includes("ifsc")) {
                      updated[f.id] = `${currentUser.savedBankDetails!.bankName} (IFSC: ${currentUser.savedBankDetails!.ifscCode})`;
                    }
                    // 2. Account Holder Name (e.g., "ACCOUNT HOLDER NAME", "ACCOUNT HOLDER", "BENEFICIARY NAME")
                    else if (l.includes("holder") || l.includes("beneficiary") || l.includes("payee") || (l.includes("name") && !l.includes("bank"))) {
                      updated[f.id] = currentUser.savedBankDetails!.accountHolderName;
                    }
                    // 3. Bank Account Number (e.g., "BANK ACCOUNT NUMBER", "ACCOUNT NUMBER", "ACC NO", "A/C NUMBER")
                    else if (l.includes("account number") || l.includes("account no") || l.includes("acc no") || l.includes("acc num") || l.includes("ac no") || l.includes("a/c") || l.includes("bank account") || (l.includes("account") && !l.includes("holder") && !l.includes("name"))) {
                      updated[f.id] = currentUser.savedBankDetails!.accountNumber;
                    }
                    // 4. Bank Name (e.g., "BANK NAME", "NAME OF BANK")
                    else if (l.includes("bank name") || (l.includes("bank") && !l.includes("account"))) {
                      updated[f.id] = currentUser.savedBankDetails!.bankName;
                    }
                    // 5. IFSC Code (e.g., "IFSC CODE", "IFSC")
                    else if (l.includes("ifsc")) {
                      updated[f.id] = currentUser.savedBankDetails!.ifscCode;
                    }
                    // 6. UPI ID / VPA Address
                    else if (l.includes("upi") || l.includes("vpa")) {
                      updated[f.id] = `${currentUser.savedBankDetails!.accountNumber}@bank`;
                    }

                    if (currentUser.savedBankDetails?.customFields) {
                      currentUser.savedBankDetails.customFields.forEach(cf => {
                        if (cf.label && cf.value && (f.label.toLowerCase().includes(cf.label.toLowerCase()) || cf.label.toLowerCase().includes(f.label.toLowerCase()))) {
                          updated[f.id] = cf.value;
                        }
                      });
                    }
                  });
                  setWithdrawalInputs(updated);
                  setTxDetails(`Fast Instant Payout to Verified Saved Bank (${currentUser.savedBankDetails!.bankName}, Acc: ${currentUser.savedBankDetails!.accountNumber}, IFSC: ${currentUser.savedBankDetails!.ifscCode})`);
                }}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Zap className="h-3.5 w-3.5 fill-white" /> 1-Click Auto-Fill Saved Bank Account Details
              </button>
            </div>
          )}

          {/* Dynamic Admin-Configured Withdrawal Fields */}
          {activeAction === "WITHDRAWAL" && withdrawalFields.length > 0 && (
            <div className="flex flex-col gap-3 bg-slate-50/70 dark:bg-slate-950/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/50 dark:border-slate-800/80">
                <span className="text-[10.5px] font-extrabold uppercase text-slate-800 dark:text-slate-200 tracking-wider flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Withdrawal Payout Details (निकासी विवरण)</span>
                </span>
                <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-200/50">
                  {withdrawalFields.length} Admin Fields
                </span>
              </div>

              {withdrawalFields.map((field) => (
                <div key={field.id} className="flex flex-col gap-1">
                  <label className="block text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300 tracking-wider">
                    {field.label} {field.required && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type={field.type || "text"}
                    required={field.required}
                    value={withdrawalInputs[field.id] || ""}
                    onChange={(e) => setWithdrawalInputs(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-sans"
                    placeholder={field.placeholder || `Enter ${field.label}`}
                  />
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              {activeAction === "DEPOSIT" ? "Transaction Details *" : "Additional Notes / Comments (Optional)"}
            </label>
            <textarea
              id="wallet-details-input"
              rows={2}
              required={activeAction === "DEPOSIT"}
              value={txDetails}
              onChange={(e) => setTxDetails(e.target.value)}
              className="w-full mt-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 resize-none font-sans"
              placeholder={activeAction === "DEPOSIT" 
                ? "e.g., UPI Ref No: 1234567890, paid from GPay" 
                : "e.g., Please process payout before 5 PM or any specific instructions..."}
            />
            {activeAction === "DEPOSIT" && (
              <p className="text-[9px] text-indigo-500 dark:text-indigo-400 mt-1">
                Please enter transaction details (like UPI Reference Number or Bank Transaction ID) for the Admin to verify.
              </p>
            )}
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              {errorMsg}
            </p>
          )}

          {successMsg && (
            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/35 border border-indigo-100/60 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-400 rounded-xl text-xs flex items-start gap-2 leading-relaxed">
              <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-indigo-500" />
              <span>{successMsg}</span>
            </div>
          )}

          <button
            id="wallet-submit-btn"
            type="submit"
            disabled={
              isSubmitting ||
              (activeAction === "DEPOSIT" && (!effectiveLimits.depositsEnabled || activeGateways.length === 0)) ||
              (activeAction === "WITHDRAWAL" && !effectiveLimits.withdrawalsEnabled)
            }
            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-850 active:scale-95 text-white text-xs font-bold rounded-lg shadow-xs transition-all duration-75 cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? "Submitting..."
              : activeAction === "DEPOSIT" && !effectiveLimits.depositsEnabled
              ? "Deposits Disabled by Admin"
              : activeAction === "WITHDRAWAL" && !effectiveLimits.withdrawalsEnabled
              ? "Withdrawals Disabled by Admin"
              : activeAction === "DEPOSIT" && activeGateways.length === 0
              ? "Payment Gateways Offline"
              : `Submit ${activeAction === "DEPOSIT" ? "Deposit" : "Withdrawal"} Request`}
          </button>
        </form>
        </>
        )}
      </div>

      {/* Real-time request history logs */}
      <div className="border-t border-slate-100 dark:border-slate-800/80 pt-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3.5">
          Deposit, Withdrawal & P2P Transfer Progress
        </h4>

        {userRequests.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-4">
            No deposits, withdrawals, or P2P transfers requested on this profile yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
            {userRequests.map((req) => (
              <div
                key={req.id}
                className="p-3 border border-slate-100 dark:border-slate-800 bg-slate-5/40 dark:bg-slate-950/20 rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                      req.type === "DEPOSIT"
                        ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                        : req.type === "WITHDRAWAL"
                        ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400"
                        : req.type === "TRANSFER_SENT"
                        ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400"
                        : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                    }`}>
                      {req.type === "TRANSFER_SENT" ? "SENT (P2P)" : req.type === "TRANSFER_RECEIVED" ? "RECV (P2P)" : req.type}
                    </span>
                    <strong className="text-slate-800 dark:text-slate-300">₹{req.amount}</strong>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                    ID: {req.id} • {new Date(req.createdAt).toLocaleDateString()} at {new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {req.txDetails && (
                    <p className="mt-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/20 px-2 py-1 rounded-md border border-indigo-100/30 dark:border-indigo-900/10 break-all max-w-[280px]">
                      Ref: {req.txDetails}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[10px] font-bold">
                  {req.status === "PENDING" && (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-mono bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded border border-amber-100/50">
                      <Clock className="h-3 w-3 animate-pulse" />
                      PENDING
                    </span>
                  )}
                  {req.status === "APPROVED" && (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-100/50">
                      <CheckCircle className="h-3 w-3" />
                      APPROVED
                    </span>
                  )}
                  {req.status === "REJECTED" && (
                    <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-mono bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded border border-rose-100/50">
                      <XCircle className="h-3 w-3" />
                      REJECTED
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
