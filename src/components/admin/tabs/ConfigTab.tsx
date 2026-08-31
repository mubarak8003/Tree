import React, { useState, useEffect } from "react";
import { AdminConfig, PaymentDetails, PaymentGateway } from "../../../types";
import { 
  Sliders, Save, Clock, Key, Lock, Eye, EyeOff, ShieldCheck, 
  ShieldAlert, CheckCircle2, RefreshCw, KeyRound, Sparkles,
  Type, Globe, FileText, RotateCcw, Check, LayoutTemplate
} from "lucide-react";
import { 
  saveProcessingTimes, 
  updateAdminPin, 
  updateAdminPasswordAndPin,
  subscribeBrandingSettings,
  updateBrandingSettings,
  subscribeFooterText,
  updateFooterText,
  DEFAULT_BRANDING_SETTINGS,
  DEFAULT_FOOTER_TEXT,
  BrandingSettings
} from "../../../firebaseService";

interface ConfigTabProps {
  config: AdminConfig;
  onConfigChange: (config: AdminConfig) => void;
  paymentDetails: PaymentDetails;
  paymentGateways: PaymentGateway[];
  paymentNote?: string;
  depositProcessingTime?: string;
  withdrawalProcessingTime?: string;
  onTriggerNotification?: (message: string, type: "success" | "info" | "error") => void;
  adminEmail: string;
}

export const ConfigTab: React.FC<ConfigTabProps> = ({
  config,
  onConfigChange,
  paymentDetails,
  paymentGateways,
  paymentNote = "",
  depositProcessingTime = "10-30 minutes",
  withdrawalProcessingTime = "1-2 hours",
  onTriggerNotification,
  adminEmail
}) => {
  // Config form state
  const [targetAmount, setTargetAmount] = useState(config.targetAmount || 5000);
  const [minContribution, setMinContribution] = useState(config.minContribution || 50);
  const [maxParticipants, setMaxParticipants] = useState(config.maxParticipants || 50);
  const [timeoutSeconds, setTimeoutSeconds] = useState(config.timeoutSeconds || 86400);
  const [expectedReturn, setExpectedReturn] = useState(config.expectedReturn || 15);

  // Processing times
  const [depTime, setDepTime] = useState(depositProcessingTime);
  const [withTime, setWithTime] = useState(withdrawalProcessingTime);

  // Security Credentials Management State
  const [securityTab, setSecurityTab] = useState<"password" | "pin" | "both">("password");

  // Platform Branding State (App Title & Taglines)
  const [appTitle, setAppTitle] = useState(DEFAULT_BRANDING_SETTINGS.appTitle);
  const [appTagline, setAppTagline] = useState(DEFAULT_BRANDING_SETTINGS.appTagline);
  const [loginTagline, setLoginTagline] = useState(DEFAULT_BRANDING_SETTINGS.loginTagline || "");
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  // Platform Footer Text State
  const [footerText, setFooterText] = useState(DEFAULT_FOOTER_TEXT);
  const [isSavingFooter, setIsSavingFooter] = useState(false);

  // Subscribe to live branding and footer on mount
  useEffect(() => {
    const unsubBranding = subscribeBrandingSettings((b) => {
      if (b) {
        setAppTitle(b.appTitle || DEFAULT_BRANDING_SETTINGS.appTitle);
        setAppTagline(b.appTagline || DEFAULT_BRANDING_SETTINGS.appTagline);
        setLoginTagline(b.loginTagline || DEFAULT_BRANDING_SETTINGS.loginTagline || "");
      }
    });

    const unsubFooter = subscribeFooterText((fText) => {
      if (fText) {
        setFooterText(fText);
      }
    });

    return () => {
      unsubBranding();
      unsubFooter();
    };
  }, []);
  
  // Password change state
  const [currentPasswordForPwd, setCurrentPasswordForPwd] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // PIN change state
  const [currentPinForPin, setCurrentPinForPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  // Both change state
  const [currentAuthForBoth, setCurrentAuthForBoth] = useState("");
  const [newPassForBoth, setNewPassForBoth] = useState("");
  const [newPinForBoth, setNewPinForBoth] = useState("");
  const [isUpdatingBoth, setIsUpdatingBoth] = useState(false);

  const handleSaveSystemConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AdminConfig = {
      ...config,
      targetAmount: Number(targetAmount),
      minContribution: Number(minContribution),
      maxParticipants: Number(maxParticipants),
      timeoutSeconds: Number(timeoutSeconds),
      expectedReturn: Number(expectedReturn)
    };
    onConfigChange(updated);
    onTriggerNotification?.("System default configuration saved!", "success");
  };

  const handleSaveProcessingTimes = async () => {
    try {
      await saveProcessingTimes(depTime, withTime);
      onTriggerNotification?.("Processing times saved successfully!", "success");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to save processing times", "error");
    }
  };

  // Handle Platform Branding Update (App Title, Tagline, Login Subtitle)
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appTitle.trim()) {
      onTriggerNotification?.("Platform Title cannot be empty.", "error");
      return;
    }
    try {
      setIsSavingBranding(true);
      await updateBrandingSettings({
        appTitle: appTitle.trim(),
        appTagline: appTagline.trim(),
        loginTagline: loginTagline.trim()
      });
      onTriggerNotification?.(`Platform Branding updated to "${appTitle.trim()}"!`, "success");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to update branding settings", "error");
    } finally {
      setIsSavingBranding(false);
    }
  };

  const handleResetBranding = () => {
    setAppTitle(DEFAULT_BRANDING_SETTINGS.appTitle);
    setAppTagline(DEFAULT_BRANDING_SETTINGS.appTagline);
    setLoginTagline(DEFAULT_BRANDING_SETTINGS.loginTagline || "");
  };

  // Handle Platform Footer Text Update
  const handleSaveFooterText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!footerText.trim()) {
      onTriggerNotification?.("Footer text cannot be empty.", "error");
      return;
    }
    try {
      setIsSavingFooter(true);
      await updateFooterText(footerText.trim());
      onTriggerNotification?.("Platform Footer Text updated successfully!", "success");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to update footer text", "error");
    } finally {
      setIsSavingFooter(false);
    }
  };

  const handleResetFooterText = () => {
    setFooterText(DEFAULT_FOOTER_TEXT);
  };

  // Handle Admin Password Change
  const handleChangePasswordOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPasswordForPwd.trim()) {
      onTriggerNotification?.("Please enter your current Password or 6-digit PIN.", "error");
      return;
    }
    if (newPassword.length < 6) {
      onTriggerNotification?.("New Password must be at least 6 characters.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      onTriggerNotification?.("New Password and Confirm Password do not match.", "error");
      return;
    }
    if (newPassword === currentPasswordForPwd) {
      onTriggerNotification?.("New Password cannot be the same as current password.", "error");
      return;
    }

    try {
      setIsUpdatingPassword(true);
      await updateAdminPasswordAndPin(
        currentPasswordForPwd.trim(),
        newPassword.trim(),
        undefined
      );
      onTriggerNotification?.("✅ Master Admin Password changed successfully!", "success");
      setCurrentPasswordForPwd("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to update Password", "error");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Handle Admin 6-Digit PIN Change
  const handleChangePinOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPinForPin.trim()) {
      onTriggerNotification?.("Please enter your current 6-digit PIN or Password.", "error");
      return;
    }
    const cleanNewPin = newPin.trim();
    if (cleanNewPin.length < 6 || cleanNewPin.length > 8 || !/^\d+$/.test(cleanNewPin)) {
      onTriggerNotification?.("PIN must be 6 to 8 numeric digits.", "error");
      return;
    }
    if (cleanNewPin !== confirmPin.trim()) {
      onTriggerNotification?.("New PIN and Confirm PIN do not match.", "error");
      return;
    }
    if (cleanNewPin === currentPinForPin.trim()) {
      onTriggerNotification?.("New PIN cannot be identical to current PIN.", "error");
      return;
    }

    try {
      setIsUpdatingPin(true);
      await updateAdminPasswordAndPin(
        currentPinForPin.trim(),
        undefined,
        cleanNewPin
      );
      onTriggerNotification?.("✅ Master 6-Digit Security PIN changed successfully!", "success");
      setCurrentPinForPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to update PIN", "error");
    } finally {
      setIsUpdatingPin(false);
    }
  };

  // Handle Change Both
  const handleChangeBoth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAuthForBoth.trim()) {
      onTriggerNotification?.("Please enter your current Password or 6-digit PIN.", "error");
      return;
    }
    if (!newPassForBoth.trim() && !newPinForBoth.trim()) {
      onTriggerNotification?.("Please enter a New Password or New 6-Digit PIN.", "error");
      return;
    }
    if (newPassForBoth.trim() && newPassForBoth.trim().length < 6) {
      onTriggerNotification?.("New Password must be at least 6 characters.", "error");
      return;
    }
    if (newPinForBoth.trim()) {
      const p = newPinForBoth.trim();
      if (p.length < 6 || p.length > 8 || !/^\d+$/.test(p)) {
        onTriggerNotification?.("New PIN must be 6 to 8 numeric digits.", "error");
        return;
      }
    }

    try {
      setIsUpdatingBoth(true);
      await updateAdminPasswordAndPin(
        currentAuthForBoth.trim(),
        newPassForBoth.trim() || undefined,
        newPinForBoth.trim() || undefined
      );
      onTriggerNotification?.("✅ Admin Password & 6-Digit PIN updated successfully!", "success");
      setCurrentAuthForBoth("");
      setNewPassForBoth("");
      setNewPinForBoth("");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to update security credentials", "error");
    } finally {
      setIsUpdatingBoth(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. ADMIN SECURITY CREDENTIALS (PASSWORD & 6-DIGIT PIN) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Admin Security Credentials
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px] font-black uppercase">
                  Bcrypt Encrypted
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Change your Admin Login Password & 6-Digit Master Security PIN
              </p>
            </div>
          </div>

          {/* Quick Account Info */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Account: <strong className="text-slate-800 dark:text-slate-200">{adminEmail}</strong></span>
          </div>
        </div>

        {/* Security Tabs Switcher */}
        <div className="flex items-center gap-2 mb-6 p-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-2xl max-w-md">
          <button
            type="button"
            onClick={() => setSecurityTab("password")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              securityTab === "password"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            Change Password
          </button>
          <button
            type="button"
            onClick={() => setSecurityTab("pin")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              securityTab === "pin"
                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Key className="h-3.5 w-3.5" />
            Change 6-Digit PIN
          </button>
          <button
            type="button"
            onClick={() => setSecurityTab("both")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              securityTab === "both"
                ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            Change Both
          </button>
        </div>

        {/* TAB 1: CHANGE PASSWORD */}
        {securityTab === "password" && (
          <form onSubmit={handleChangePasswordOnly} className="max-w-xl space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Current Password or 6-Digit PIN *
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPasswordForPwd}
                  onChange={(e) => setCurrentPasswordForPwd(e.target.value)}
                  placeholder="Enter current password or PIN"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs md:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  New Admin Password *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs md:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs md:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isUpdatingPassword || !currentPasswordForPwd || !newPassword || !confirmPassword}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-md transition-all disabled:opacity-50"
              >
                <Lock className="h-4 w-4" />
                {isUpdatingPassword ? "Updating Password..." : "Update Admin Password"}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: CHANGE 6-DIGIT PIN */}
        {securityTab === "pin" && (
          <form onSubmit={handleChangePinOnly} className="max-w-xl space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Current 6-Digit PIN or Password *
              </label>
              <div className="relative">
                <input
                  type={showCurrentPin ? "text" : "password"}
                  value={currentPinForPin}
                  onChange={(e) => setCurrentPinForPin(e.target.value)}
                  placeholder="Enter current 6-digit PIN or Password"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs md:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPin(!showCurrentPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showCurrentPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  New 6-Digit Security PIN *
                </label>
                <div className="relative">
                  <input
                    type={showNewPin ? "text" : "password"}
                    maxLength={8}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="e.g. 654321"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs md:text-sm font-mono tracking-widest text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showNewPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm New 6-Digit PIN *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPin ? "text" : "password"}
                    maxLength={8}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="Re-type 6-digit PIN"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs md:text-sm font-mono tracking-widest text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPin(!showConfirmPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showConfirmPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isUpdatingPin || !currentPinForPin || newPin.length < 6 || confirmPin.length < 6}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-md transition-all disabled:opacity-50"
              >
                <Key className="h-4 w-4" />
                {isUpdatingPin ? "Updating Security PIN..." : "Update Security PIN"}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: CHANGE BOTH */}
        {securityTab === "both" && (
          <form onSubmit={handleChangeBoth} className="max-w-xl space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Current Password or 6-Digit PIN *
              </label>
              <input
                type="password"
                value={currentAuthForBoth}
                onChange={(e) => setCurrentAuthForBoth(e.target.value)}
                placeholder="Enter current password or PIN"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs md:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  New Password (Optional if PIN only)
                </label>
                <input
                  type="password"
                  value={newPassForBoth}
                  onChange={(e) => setNewPassForBoth(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs md:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  New 6-Digit PIN (Optional if Password only)
                </label>
                <input
                  type="password"
                  maxLength={8}
                  value={newPinForBoth}
                  onChange={(e) => setNewPinForBoth(e.target.value.replace(/\D/g, ""))}
                  placeholder="6-digit numeric PIN"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs md:text-sm font-mono tracking-widest text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isUpdatingBoth || !currentAuthForBoth || (!newPassForBoth && !newPinForBoth)}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-md transition-all disabled:opacity-50"
              >
                <KeyRound className="h-4 w-4" />
                {isUpdatingBoth ? "Updating Credentials..." : "Update Both Credentials"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 2. PLATFORM BRANDING & APP TITLE SETTINGS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <Type className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Platform Branding & App Titles
                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-full text-[10px] font-black uppercase">
                  Live Sync
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Customize the platform title, header subtitle, and login portal branding across the entire app
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetBranding}
            className="text-xs font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all cursor-pointer w-fit"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Defaults
          </button>
        </div>

        <form onSubmit={handleSaveBranding} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* App Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-indigo-500" />
                Platform / App Title *
              </label>
              <input
                type="text"
                value={appTitle}
                onChange={(e) => setAppTitle(e.target.value)}
                placeholder="e.g. Shared Trade Pool"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs md:text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Updates top navigation bar, browser tab title, and branding logos
              </p>
            </div>

            {/* App Tagline (Header) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Header Subtitle / Tagline
              </label>
              <input
                type="text"
                value={appTagline}
                onChange={(e) => setAppTagline(e.target.value)}
                placeholder="e.g. Fractional Trade Platform"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs md:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Displayed directly beneath the platform title in the top navigation
              </p>
            </div>

            {/* Login Tagline */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <LayoutTemplate className="h-3.5 w-3.5 text-emerald-500" />
                Login Screen Tagline
              </label>
              <input
                type="text"
                value={loginTagline}
                onChange={(e) => setLoginTagline(e.target.value)}
                placeholder="e.g. Sandbox Trading Terminal"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs md:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Displayed under the logo badge on the user & admin sign-in portal
              </p>
            </div>
          </div>

          {/* Real-Time Live Preview Cards */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-3">
              👀 Live Branding Preview
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Header Preview */}
              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                <div className="text-[10px] text-slate-400 font-semibold mb-2 flex items-center gap-1">
                  <span>Navigation Header Preview</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
                    <Sliders className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                      {appTitle || "Shared Trade Pool"}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {appTagline || "Fractional Trade Platform"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Login Badge Preview */}
              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                <div className="text-[10px] text-slate-400 font-semibold mb-2 flex items-center gap-1">
                  <span>Sign-In Portal Badge Preview</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                      {appTitle || "Shared Trade Pool"}
                    </h4>
                    <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                      {loginTagline || appTagline || "Sandbox Trading Terminal"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSavingBranding}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs md:text-sm font-bold rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSavingBranding ? "Saving Branding..." : "Save Platform Branding"}
            </button>
          </div>
        </form>
      </div>

      {/* 3. PLATFORM FOOTER TEXT & DISCLAIMER SETTINGS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Platform Footer Text & Disclaimers
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px] font-black uppercase">
                  Global
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Edit the global footer notice, copyright text, or risk disclaimer displayed across all pages
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetFooterText}
            className="text-xs font-bold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all cursor-pointer w-fit"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to Default
          </button>
        </div>

        <form onSubmit={handleSaveFooterText} className="space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Custom Footer Text / Disclaimer *
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {footerText.length} characters
              </span>
            </div>
            <textarea
              rows={3}
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="Enter custom platform footer text..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs md:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 leading-relaxed resize-y"
              required
            />
          </div>

          {/* Quick Preset Templates */}
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-2">
              ⚡ Quick Template Presets:
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                {
                  label: "Standard Sandbox Ledger",
                  text: DEFAULT_FOOTER_TEXT
                },
                {
                  label: "Fintech Copyright & Disclaimers",
                  text: `© 2026 ${appTitle || "Shared Trade Pool"} — Multi-User Sandbox Simulation Engine. Real-Time Distributed Ledger. Past performance does not guarantee future results.`
                },
                {
                  label: "Minimalist Encrypted",
                  text: `© 2026 ${appTitle || "Shared Trade Pool"}. All rights reserved. Secured with 256-bit encryption.`
                },
                {
                  label: "Educational & Transparency Notice",
                  text: `Disclaimer: All trades and pool allocations are executed in real-time sandboxed environment for simulation and educational purposes only.`
                }
              ].map((template) => (
                <button
                  key={template.label}
                  type="button"
                  onClick={() => setFooterText(template.text)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:bg-slate-800 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 transition-all cursor-pointer"
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Footer Preview */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              👀 Live Footer Output Preview
            </span>
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs text-slate-500 dark:text-slate-400 shadow-xs">
              <p className="leading-relaxed">{footerText || "No footer text set"}</p>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSavingFooter}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs md:text-sm font-bold rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSavingFooter ? "Saving Footer Text..." : "Save Footer Text"}
            </button>
          </div>
        </form>
      </div>

      {/* 4. GENERAL POOL DEFAULTS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <Sliders className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Global Pool Defaults</h3>
            <p className="text-xs text-slate-500">Configure default parameters for newly created pools</p>
          </div>
        </div>

        <form onSubmit={handleSaveSystemConfig} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Target Amount ($)</label>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Min Contribution ($)</label>
            <input
              type="number"
              value={minContribution}
              onChange={(e) => setMinContribution(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Max Participants</label>
            <input
              type="number"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Timeout (Seconds)</label>
            <input
              type="number"
              value={timeoutSeconds}
              onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Default Expected Return (%)</label>
            <input
              type="number"
              value={expectedReturn}
              onChange={(e) => setExpectedReturn(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Save className="h-4 w-4" /> Save Default Settings
            </button>
          </div>
        </form>
      </div>

      {/* 3. PROCESSING TIMES */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Estimated Processing Times</h3>
            <p className="text-xs text-slate-500">Displayed on user deposit & withdrawal pages</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Deposit Processing Time</label>
            <input
              type="text"
              value={depTime}
              onChange={(e) => setDepTime(e.target.value)}
              placeholder="e.g. 5-15 minutes"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Withdrawal Processing Time</label>
            <input
              type="text"
              value={withTime}
              onChange={(e) => setWithTime(e.target.value)}
              placeholder="e.g. 30-60 minutes"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSaveProcessingTimes}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="h-4 w-4" /> Save Processing Times
          </button>
        </div>
      </div>
    </div>
  );
};

