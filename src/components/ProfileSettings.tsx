import React, { useState, useEffect } from "react";
import { UserProfile, CustomBankField } from "../types";
import { X, User, Mail, ShieldCheck, Check, AlertCircle, Lock, Save, KeyRound, Smartphone, CheckCircle2, ShieldAlert, Key, FileText, Building2, CreditCard, Sparkles, CheckCircle, Shield, Plus, Trash2 } from "lucide-react";
import { updateUserProfileDetails, verifyMobilePin, isUserMobileVerified, submitUserKycAndBankDetails, checkNameMatch } from "../firebaseService";

interface ProfileSettingsProps {
  currentUser: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: (updatedName: string, updatedEmail: string) => void;
  onTriggerNotification?: (msg: string, type: "success" | "error" | "info") => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  currentUser,
  isOpen,
  onClose,
  onProfileUpdated,
  onTriggerNotification
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Mobile PIN Verification State
  const [inputPin, setInputPin] = useState("");
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);

  // PAN / Aadhaar Card & Saved Bank Account State
  const [kycDocType, setKycDocType] = useState<"PAN" | "AADHAAR" | "BOTH">("PAN");
  const [panNumber, setPanNumber] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [kycHolderName, setKycHolderName] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [customBankFields, setCustomBankFields] = useState<CustomBankField[]>([]);

  const handleAddUserCustomBankColumn = () => {
    const newField: CustomBankField = {
      id: `bank_col_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: "UPI ID / Branch Name / Other",
      value: ""
    };
    setCustomBankFields(prev => [...prev, newField]);
  };

  const handleDeleteUserCustomBankColumn = (id: string) => {
    setCustomBankFields(prev => prev.filter(f => f.id !== id));
  };

  const handleUpdateUserCustomBankColumn = (id: string, key: "label" | "value", val: string) => {
    setCustomBankFields(prev => prev.map(f => f.id === id ? { ...f, [key]: val } : f));
  };

  const [isSavingKyc, setIsSavingKyc] = useState(false);
  const [kycErrorMsg, setKycErrorMsg] = useState<string | null>(null);
  const [kycSuccessMsg, setKycSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || "");
      setEmail(currentUser.email || "");
      setPhone(currentUser.phone || "");
      setErrorMsg(null);
      setSuccessMsg(null);
      setInputPin("");
      setPinError(null);
      setPinSuccess(null);

      // KYC & Bank Details initialization
      setKycDocType(currentUser.kycDocType || "PAN");
      setPanNumber(currentUser.panNumber || "");
      setAadhaarNumber(currentUser.aadhaarNumber || "");
      setKycHolderName(currentUser.kycHolderName || currentUser.name || "");

      if (currentUser.savedBankDetails) {
        setBankAccountHolder(currentUser.savedBankDetails.accountHolderName || "");
        setBankName(currentUser.savedBankDetails.bankName || "");
        setAccountNumber(currentUser.savedBankDetails.accountNumber || "");
        setConfirmAccountNumber(currentUser.savedBankDetails.accountNumber || "");
        setIfscCode(currentUser.savedBankDetails.ifscCode || "");
        setCustomBankFields(currentUser.savedBankDetails.customFields || []);
      } else {
        setBankAccountHolder(currentUser.name || "");
        setBankName("");
        setAccountNumber("");
        setConfirmAccountNumber("");
        setIfscCode("");
        setCustomBankFields([]);
      }
      setKycErrorMsg(null);
      setKycSuccessMsg(null);
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  const isVerified = isUserMobileVerified(currentUser);
  const isNameMatched = (bankAccountHolder.trim() && kycHolderName.trim()) 
    ? (checkNameMatch(bankAccountHolder, kycHolderName) || checkNameMatch(bankAccountHolder, name))
    : false;

  const handleVerifyPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(null);

    const cleanPin = inputPin.trim();
    if (!cleanPin || cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
      setPinError("Please enter a valid 6-digit numeric PIN.");
      return;
    }

    setIsVerifyingPin(true);
    try {
      const result = await verifyMobilePin(currentUser.id, cleanPin);
      setPinSuccess(result.message);
      if (onTriggerNotification) {
        onTriggerNotification(result.message, "success");
      }
      setInputPin("");
    } catch (err: any) {
      const msg = err?.message || "Verification failed. Please check the PIN.";
      setPinError(msg);
      if (onTriggerNotification) {
        onTriggerNotification(msg, "error");
      }
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleSaveKycAndBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setKycErrorMsg(null);
    setKycSuccessMsg(null);

    if (accountNumber && confirmAccountNumber && accountNumber.trim() !== confirmAccountNumber.trim()) {
      setKycErrorMsg("Bank Account Number and Confirm Account Number do not match!");
      return;
    }

    setIsSavingKyc(true);
    try {
      const res = await submitUserKycAndBankDetails(currentUser.id, name, {
        panNumber,
        aadhaarNumber,
        kycDocType,
        kycHolderName,
        accountHolderName: bankAccountHolder,
        bankName,
        accountNumber,
        ifscCode,
        customFields: customBankFields
      });

      const msg = res.nameMatched
        ? "✓ Identity & Bank Account Holder Name Matched! Saved for Instant Fast Withdrawal."
        : "Bank Account details & Identity Document saved successfully! Pending Admin verification.";

      setKycSuccessMsg(msg);
      if (onTriggerNotification) {
        onTriggerNotification(msg, "success");
      }
    } catch (err: any) {
      setKycErrorMsg(err?.message || "Failed to save verification details.");
    } finally {
      setIsSavingKyc(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setErrorMsg("Please enter your full name.");
      return;
    }

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setIsSaving(true);
    try {
      await updateUserProfileDetails(currentUser.id, cleanName, cleanEmail, cleanPhone);
      setSuccessMsg("Profile details, mobile number & login email updated successfully!");
      if (onProfileUpdated) {
        onProfileUpdated(cleanName, cleanEmail);
      }
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg max-h-[92vh] my-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="shrink-0 p-4 sm:p-6 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-xs">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 font-display">
                Account & Security Settings
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                Manage your profile name and login email address
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Container with fixed footer */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col min-h-0">
          
          {/* Form Body - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
            
            {/* Mobile Verification Screen Section */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl text-white ${isVerified ? "bg-emerald-600" : "bg-amber-600"}`}>
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      Mobile Number Verification
                      {isVerified ? (
                        <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> VERIFIED
                        </span>
                      ) : (
                        <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1">
                          <ShieldAlert className="h-3 w-3" /> PENDING VERIFICATION
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isVerified
                        ? "Your mobile number is verified. All platform services are active."
                        : (currentUser.phone || phone.trim())
                          ? `Admin will send 6-digit PIN to ${currentUser.phone || phone.trim()}`
                          : "Please enter and save your mobile number below to receive PIN from Admin."}
                    </p>
                  </div>
                </div>
              </div>

              {isVerified ? (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>Full platform access unlocked: Deposits, Withdrawals, Trading Pools, and Referrals are active!</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3 pt-1 border-t border-slate-200/80 dark:border-slate-800">
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-800 dark:text-amber-300">
                    <p className="font-semibold mb-1 flex items-center gap-1">
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                      Account Verification Required:
                    </p>
                    {(!currentUser.phone && !phone.trim()) ? (
                      <p className="text-[10.5px] leading-relaxed text-amber-900 dark:text-amber-200 font-bold">
                        👉 Mobile number not set! Please enter your Mobile Number in the field below and click "Save Changes". Admin will then send you the 6-digit PIN via Call, SMS, or WhatsApp.
                      </p>
                    ) : (
                      <p className="text-[10.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                        The Admin will send a 6-digit PIN to your mobile <strong className="text-amber-900 dark:text-amber-200 font-mono">({currentUser.phone || phone.trim()})</strong> via Call, SMS, or WhatsApp. Enter the 6-digit PIN below to complete verification. {currentUser.pinExpiresAt ? `PIN expires at ${new Date(currentUser.pinExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}.` : "PIN is valid for the duration specified by Admin."}
                      </p>
                    )}
                  </div>

                  {pinError && (
                    <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{pinError}</span>
                    </div>
                  )}

                  {pinSuccess && (
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>{pinSuccess}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        maxLength={6}
                        value={inputPin}
                        onChange={(e) => setInputPin(e.target.value.replace(/\D/g, ""))}
                        placeholder="ENTER 6-DIGIT PIN"
                        className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-center font-mono font-black text-sm tracking-widest text-slate-900 dark:text-slate-100 placeholder:text-slate-400 placeholder:tracking-normal placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                      />
                      <Key className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    </div>

                    <button
                      type="button"
                      onClick={handleVerifyPinSubmit}
                      disabled={isVerifyingPin || inputPin.length !== 6}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {isVerifyingPin ? (
                        <>
                          <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Verifying...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Verify Mobile
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* PAN / Aadhaar Verification & Bank Account Linking Section */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col gap-3.5">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl text-white ${(currentUser.savedBankDetails?.isVerified || currentUser.kycStatus === "verified") ? "bg-emerald-600" : "bg-indigo-600"}`}>
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      PAN / Aadhaar & Bank Account Verification
                      {(currentUser.savedBankDetails?.isVerified || currentUser.kycStatus === "verified") ? (
                        <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> VERIFIED
                        </span>
                      ) : (
                        <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1">
                          <ShieldAlert className="h-3 w-3" /> LINK FOR FAST WITHDRAWAL
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Link PAN/Aadhaar with Bank Account for Holder Name matching and 1-Click Fast Withdrawal
                    </p>
                  </div>
                </div>
              </div>

              {kycErrorMsg && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{kycErrorMsg}</span>
                </div>
              )}

              {kycSuccessMsg && (
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{kycSuccessMsg}</span>
                </div>
              )}

              {/* Document Selection */}
              <div className="space-y-2">
                <label className="block text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300 tracking-wider">
                  Select Verification Document Type (पहचान पत्र चुनें)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setKycDocType("PAN")}
                    className={`py-1.5 px-2 text-[11px] font-bold rounded-xl border transition-all cursor-pointer text-center ${
                      kycDocType === "PAN"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400"
                    }`}
                  >
                    PAN Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setKycDocType("AADHAAR")}
                    className={`py-1.5 px-2 text-[11px] font-bold rounded-xl border transition-all cursor-pointer text-center ${
                      kycDocType === "AADHAAR"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400"
                    }`}
                  >
                    Aadhaar Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setKycDocType("BOTH")}
                    className={`py-1.5 px-2 text-[11px] font-bold rounded-xl border transition-all cursor-pointer text-center ${
                      kycDocType === "BOTH"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400"
                    }`}
                  >
                    Both (PAN + Aadhaar)
                  </button>
                </div>
              </div>

              {/* Document Number Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(kycDocType === "PAN" || kycDocType === "BOTH") && (
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider mb-1">
                      PAN Card Number (10 Characters) *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={10}
                        value={panNumber}
                        onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                        placeholder="e.g. ABCDE1234F"
                        className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold uppercase text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                      <FileText className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    </div>
                  </div>
                )}

                {(kycDocType === "AADHAAR" || kycDocType === "BOTH") && (
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider mb-1">
                      Aadhaar Card Number (12 Digits) *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={14}
                        value={aadhaarNumber}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
                          const formatted = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
                          setAadhaarNumber(formatted);
                        }}
                        placeholder="e.g. 1234 5678 9012"
                        className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                      <Shield className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    </div>
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider mb-1">
                    Full Name (As printed on PAN / Aadhaar Card) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={kycHolderName}
                      onChange={(e) => setKycHolderName(e.target.value)}
                      placeholder="e.g. Rahul Kumar Sharma"
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                    <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Bank Details Section with Add & Delete Column */}
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-extrabold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" /> Saved Bank Account for Fast Withdrawal (बैंक विवरण)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddUserCustomBankColumn}
                    className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[9.5px] font-extrabold rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <Plus className="h-3 w-3" /> Add Column (कॉलम जोड़ें)
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider mb-1 flex items-center justify-between">
                      <span>Bank Account Holder Name *</span>
                      {isNameMatched ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[9.5px] flex items-center gap-0.5">
                          <CheckCircle2 className="h-3 w-3" /> Name Matched with Identity
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-bold text-[9.5px]">
                          Must match PAN / Aadhaar name
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={bankAccountHolder}
                      onChange={(e) => setBankAccountHolder(e.target.value)}
                      placeholder="e.g. Rahul Kumar Sharma"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider mb-1">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. State Bank of India (SBI)"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider mb-1">
                      IFSC Code *
                    </label>
                    <input
                      type="text"
                      maxLength={11}
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                      placeholder="e.g. SBIN0001234"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider mb-1">
                      Bank Account Number *
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Enter Account Number"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider mb-1">
                      Confirm Account Number *
                    </label>
                    <input
                      type="text"
                      value={confirmAccountNumber}
                      onChange={(e) => setConfirmAccountNumber(e.target.value)}
                      placeholder="Re-enter Account Number"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Additional Custom Columns/Fields list */}
                {customBankFields.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="text-[9.5px] font-extrabold uppercase text-slate-400 tracking-wider">
                      Additional Bank Columns ({customBankFields.length})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {customBankFields.map((field, fIdx) => (
                        <div
                          key={field.id || fIdx}
                          className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col gap-1.5"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) => handleUpdateUserCustomBankColumn(field.id, "label", e.target.value)}
                              placeholder="Column Name"
                              className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-[10px] font-extrabold uppercase text-indigo-600 dark:text-indigo-400 focus:outline-none w-full"
                            />
                            <button
                              type="button"
                              onClick={() => handleDeleteUserCustomBankColumn(field.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/80 rounded transition-all cursor-pointer shrink-0"
                              title="Delete column"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <input
                            type="text"
                            value={field.value}
                            onChange={(e) => handleUpdateUserCustomBankColumn(field.id, "value", e.target.value)}
                            placeholder={`Enter ${field.label || 'value'}`}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={handleAddUserCustomBankColumn}
                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> + Add Another Bank Detail Column (e.g. UPI ID, Branch Name, Account Type)
                  </button>
                </div>

                {/* Name match status live alert */}
                {bankAccountHolder.trim() && kycHolderName.trim() && (
                  isNameMatched ? (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-800 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>✓ Name Matched! Bank Account Holder Name matches PAN/Aadhaar identity. Enabled for Instant 1-Click Fast Withdrawal.</span>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-800 dark:text-amber-300 text-[11px] font-medium flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>Notice: Bank Account Holder Name differs from PAN/Aadhaar name. Admin manual review may be required.</span>
                    </div>
                  )
                )}

                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveKycAndBankSubmit}
                    disabled={isSavingKyc}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {isSavingKyc ? (
                      <>
                        <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Saving Verification...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Save & Link Bank Account for Fast Withdrawal
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Security Banner */}
            <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-150/80 dark:border-indigo-900/40 rounded-2xl flex items-start gap-3">
              <div className="p-1.5 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0 mt-0.5">
                <KeyRound className="h-4 w-4" />
              </div>
              <div className="flex flex-col gap-1 text-xs">
                <span className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  Login Email Security
                  <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  Your email is used to log in to your trading profile. Updating it here will immediately change your future login credential.
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Account ID Readonly */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-1">
                Trader ID (Fixed System Reference)
              </label>
              <div className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>{currentUser.id}</span>
                <span className="text-[9.5px] uppercase tracking-wider font-sans font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                  Verified
                </span>
              </div>
            </div>

            {/* Name Field */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider mb-1">
                Trader Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                <User className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Mobile Number Field */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider mb-1 flex items-center justify-between">
                <span>Mobile Number (For Verification & SMS/WhatsApp)</span>
                {currentUser.phone ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold lowercase text-[9.5px]">
                    ✓ Saved
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 font-bold lowercase text-[9.5px]">
                    * Required for PIN
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210 or +91 9876543210"
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                <Smartphone className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                Admin uses this mobile number to contact you and send your 6-digit verification PIN.
              </p>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider mb-1">
                Registered Login Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. trader@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                <Mail className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                Use this email address to log in next time.
              </p>
            </div>
          </div>

          {/* Sticky Pinned Footer */}
          <div className="shrink-0 p-4 sm:px-6 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-indigo-500/20 transition-all duration-150 flex items-center gap-1.5 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
