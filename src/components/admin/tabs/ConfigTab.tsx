import React, { useState } from "react";
import { AdminConfig, PaymentDetails, PaymentGateway } from "../../../types";
import { Sliders, Save, Clock, Key } from "lucide-react";
import { saveProcessingTimes, updateAdminPin } from "../../../firebaseService";

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

  // Admin Security Pin change
  const [newPin, setNewPin] = useState("");
  const [isChangingPin, setIsChangingPin] = useState(false);

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

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length < 6) {
      onTriggerNotification?.("PIN must be at least 6 digits", "error");
      return;
    }
    try {
      setIsChangingPin(true);
      await updateAdminPin(newPin);
      onTriggerNotification?.("Master Security PIN updated successfully!", "success");
      setNewPin("");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to update PIN", "error");
    } finally {
      setIsChangingPin(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* General Settings */}
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

      {/* Processing Times */}
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

      {/* Admin Master PIN */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <Key className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Master Admin Security PIN</h3>
            <p className="text-xs text-slate-500">Used for authorizing sensitive actions & database archiving</p>
          </div>
        </div>

        <form onSubmit={handleChangePin} className="max-w-md space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">New 6-Digit PIN</label>
            <input
              type="password"
              maxLength={8}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="Enter new 6+ digit PIN"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isChangingPin || newPin.length < 6}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Key className="h-4 w-4" />
            {isChangingPin ? "Updating..." : "Update Security PIN"}
          </button>
        </form>
      </div>
    </div>
  );
};
