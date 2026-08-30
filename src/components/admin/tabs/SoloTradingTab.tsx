import React, { useState } from "react";
import { SoloTradingConfig, MarketAsset } from "../../../types";
import { Zap, Save } from "lucide-react";
import { SUPPORTED_SOLO_ASSETS } from "../../../services/livePriceService";

interface SoloTradingTabProps {
  soloConfig?: SoloTradingConfig;
  onTriggerNotification?: (message: string, type: "success" | "info" | "error") => void;
  adminEmail: string;
}

export const SoloTradingTab: React.FC<SoloTradingTabProps> = ({
  soloConfig,
  onTriggerNotification,
  adminEmail
}) => {
  const [minStake, setMinStake] = useState(soloConfig?.minStake || 5);
  const [maxStake, setMaxStake] = useState(soloConfig?.maxStake || 1000);
  const [defaultPayoutPercentage, setDefaultPayoutPercentage] = useState(soloConfig?.defaultPayoutPercentage || 85);
  const [isEnabled, setIsEnabled] = useState(soloConfig?.isEnabled ?? true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onTriggerNotification?.("Solo trading parameters updated successfully!", "success");
  };

  return (
    <div className="space-y-6">
      {/* Solo Trading Settings */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Solo Trading & Binary Options Engine</h3>
            <p className="text-xs text-slate-500">Configure solo high-speed trading durations, payout percentages & risk limits</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Min Stake ($)</label>
            <input
              type="number"
              value={minStake}
              onChange={(e) => setMinStake(Number(e.target.value))}
              min="1"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Max Stake ($)</label>
            <input
              type="number"
              value={maxStake}
              onChange={(e) => setMaxStake(Number(e.target.value))}
              min="10"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Default Payout Percentage (%)</label>
            <input
              type="number"
              value={defaultPayoutPercentage}
              onChange={(e) => setDefaultPayoutPercentage(Number(e.target.value))}
              min="10"
              max="100"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              id="soloEnabled"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
            <label htmlFor="soloEnabled" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              Enable Solo Quick Trading
            </label>
          </div>

          <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Save className="h-4 w-4" /> Save Solo Trading Config
            </button>
          </div>
        </form>
      </div>

      {/* Supported Assets List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">
          Supported Trading Assets ({SUPPORTED_SOLO_ASSETS.length})
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {SUPPORTED_SOLO_ASSETS.map((asset) => (
            <div
              key={asset.symbol}
              className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-2xl flex flex-col justify-between"
            >
              <div className="font-bold text-xs text-slate-900 dark:text-slate-100">{asset.symbol}</div>
              <div className="text-[10px] text-slate-500 truncate">{asset.pair}</div>
              <div className="mt-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                Payout: {asset.payoutPercentage || defaultPayoutPercentage}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
