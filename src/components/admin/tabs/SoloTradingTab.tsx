import React, { useState, useEffect, useMemo } from "react";
import { 
  SoloTradingConfig, MarketAsset, SoloTrade 
} from "../../../types";
import { 
  Zap, Save, RefreshCw, RotateCw, Power, RotateCcw, Plus, Trash2, Edit2, 
  Search, Check, X, Shield, Clock, Sliders, DollarSign, Filter, TrendingUp, 
  TrendingDown, AlertCircle, FileText, ChevronLeft, ChevronRight, User, History, ArrowUpRight, ArrowDownRight, Layers,
  Lock, Sparkles, Eye, EyeOff
} from "lucide-react";
import { 
  DEFAULT_SOLO_CATEGORIES, 
  DEFAULT_SOLO_TRADING_CONFIG,
  subscribeSoloTradingConfig,
  saveSoloTradingConfig,
  subscribeAllSoloTrades
} from "../../../firebaseService";
import { SUPPORTED_SOLO_ASSETS } from "../../../services/livePriceService";

interface SoloTradingTabProps {
  soloConfig?: SoloTradingConfig;
  allSoloTrades?: SoloTrade[];
  onTriggerNotification?: (message: string, type: "success" | "info" | "error") => void;
  adminEmail: string;
}

export const SoloTradingTab: React.FC<SoloTradingTabProps> = ({
  soloConfig: propSoloConfig,
  allSoloTrades: propAllSoloTrades,
  onTriggerNotification,
  adminEmail
}) => {
  // Live Config from Firestore
  const [config, setConfig] = useState<SoloTradingConfig>(
    propSoloConfig || DEFAULT_SOLO_TRADING_CONFIG
  );
  const [allSoloTrades, setAllSoloTrades] = useState<SoloTrade[]>(
    propAllSoloTrades || []
  );
  const [isSavingRules, setIsSavingRules] = useState(false);

  // Form State for Solo Rules
  const [protectedPayout, setProtectedPayout] = useState<number | string>(config.protectedPayoutPercentage ?? 75);
  const [standardPayout, setStandardPayout] = useState<number | string>(config.standardPayoutPercentage ?? 82);
  const [minStake, setMinStake] = useState<number | string>(config.minStake ?? 5);
  const [maxStake, setMaxStake] = useState<number | string>(config.maxStake ?? 20);
  const [drawRule, setDrawRule] = useState<"REFUND" | "LOSS">(config.drawRule ?? "LOSS");

  // Durations State
  const [durationModeTab, setDurationModeTab] = useState<"global" | "protected" | "standard">("global");
  const [newDurationInput, setNewDurationInput] = useState("");
  const [editingDurationIndex, setEditingDurationIndex] = useState<{ mode: "global" | "protected" | "standard"; index: number; val: number } | null>(null);

  // Categories & Assets State
  const [categories, setCategories] = useState<string[]>(
    config.categories && config.categories.length > 0 ? config.categories : DEFAULT_SOLO_CATEGORIES
  );
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [editingCategory, setEditingCategory] = useState<{ oldName: string; newName: string } | null>(null);

  const [assets, setAssets] = useState<MarketAsset[]>(
    config.customAssets && config.customAssets.length > 0 ? config.customAssets : SUPPORTED_SOLO_ASSETS
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");

  // Modals & Inline Edit States
  const [fixingPriceAsset, setFixingPriceAsset] = useState<MarketAsset | null>(null);
  const [fixedPriceValue, setFixedPriceValue] = useState<string>("");

  const [editingExpiriesAsset, setEditingExpiriesAsset] = useState<MarketAsset | null>(null);
  const [customPairDurations, setCustomPairDurations] = useState<string>("");

  const [isAddingNewPairModal, setIsAddingNewPairModal] = useState(false);
  const [newPairForm, setNewPairForm] = useState<{
    pair: string;
    symbol: string;
    category: string;
    basePrice: string | number;
    decimals: number;
    protectedPayoutPercentage: number;
    standardPayoutPercentage: number;
  }>({
    pair: "",
    symbol: "",
    category: "Crypto",
    basePrice: "",
    decimals: 2,
    protectedPayoutPercentage: 80,
    standardPayoutPercentage: 85
  });

  // Active Pair for Editing (shown in the Edit Pair card)
  const [editingPair, setEditingPair] = useState<MarketAsset | null>(null);
  const [inlineEditingSymbol, setInlineEditingSymbol] = useState<string | null>(null);
  const [quickDetectingSymbol, setQuickDetectingSymbol] = useState<string | null>(null);
  const [editPairForm, setEditPairForm] = useState<{
    pair: string;
    symbol: string;
    category: string;
    price: string | number;
    decimals: number;
    protectedPayout: number;
    standardPayout: number;
  }>({
    pair: "GER 40 (DAX Index)",
    symbol: "CURRENCYCOM:DE40",
    category: "Indices",
    price: 19400,
    decimals: 2,
    protectedPayout: 75,
    standardPayout: 82
  });

  const [isDetectingPriceForEdit, setIsDetectingPriceForEdit] = useState(false);
  const [isDetectingPriceForNew, setIsDetectingPriceForNew] = useState(false);

  // Initialize editingPair when assets are available
  useEffect(() => {
    if (assets.length > 0) {
      // Find GER 40 or first asset
      const defaultAsset = assets.find((a) => a.symbol.includes("DE40") || a.pair.includes("GER 40")) || assets[0];
      if (!editingPair && defaultAsset) {
        setEditingPair(defaultAsset);
        setEditPairForm({
          pair: defaultAsset.pair,
          symbol: defaultAsset.symbol,
          category: defaultAsset.category,
          price: defaultAsset.basePrice,
          decimals: defaultAsset.decimals ?? 2,
          protectedPayout: defaultAsset.protectedPayoutPercentage ?? Number(protectedPayout),
          standardPayout: defaultAsset.standardPayoutPercentage ?? defaultAsset.payoutPercentage ?? Number(standardPayout)
        });
      }
    }
  }, [assets]);

  // Subscribe to real-time config and trades
  useEffect(() => {
    const unsubConfig = subscribeSoloTradingConfig((freshConfig) => {
      setConfig(freshConfig);
      setProtectedPayout(freshConfig.protectedPayoutPercentage ?? 75);
      setStandardPayout(freshConfig.standardPayoutPercentage ?? 82);
      setMinStake(freshConfig.minStake ?? 5);
      setMaxStake(freshConfig.maxStake ?? 20);
      setDrawRule(freshConfig.drawRule ?? "LOSS");
      if (freshConfig.categories && freshConfig.categories.length > 0) {
        setCategories(freshConfig.categories);
      }
      if (freshConfig.customAssets && freshConfig.customAssets.length > 0) {
        setAssets(freshConfig.customAssets);
      }
    });

    const unsubTrades = subscribeAllSoloTrades((trades) => {
      setAllSoloTrades(trades);
    });

    return () => {
      if (typeof unsubConfig === "function") unsubConfig();
      if (typeof unsubTrades === "function") unsubTrades();
    };
  }, []);

  // Financial Stats Calculation
  const financialSummary = useMemo(() => {
    const totalTrades = allSoloTrades.length;
    let totalStake = 0;
    let totalPayout = 0;

    allSoloTrades.forEach((tr) => {
      const stake = Number(tr.stake || (tr as any).stakeAmount || 0);
      totalStake += stake;
      if (tr.status === "WON") {
        totalPayout += Number(tr.expectedPayout || (stake + (tr.profitOrLoss || 0)));
      } else if (tr.status === "DRAW") {
        totalPayout += stake; // refunded on draw
      }
    });

    const netMargin = totalStake - totalPayout;
    return {
      totalTrades,
      totalStake,
      totalPayout,
      netMargin
    };
  }, [allSoloTrades]);

  // Master Switch Handler
  const handleToggleMasterSwitch = async () => {
    const nextState = !config.isEnabled;
    try {
      await saveSoloTradingConfig({ isEnabled: nextState });
      onTriggerNotification?.(
        nextState 
          ? "Solo Binary Options Engine is now ACTIVE for users." 
          : "Solo Binary Options Engine is now DEACTIVATED.",
        nextState ? "success" : "info"
      );
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to toggle Solo Engine", "error");
    }
  };

  // Pattern Radar Toggle Handler (Hide / Show for Traders)
  const handleTogglePatternRadar = async () => {
    const isCurrentlyVisible = config.showPatternRadar !== false;
    const nextState = !isCurrentlyVisible;
    try {
      await saveSoloTradingConfig({ showPatternRadar: nextState });
      setConfig((prev) => ({ ...prev, showPatternRadar: nextState }));
      onTriggerNotification?.(
        nextState 
          ? "⚡ Pattern Radar button is now VISIBLE to traders." 
          : "⚡ Pattern Radar button is now HIDDEN from traders.",
        nextState ? "success" : "info"
      );
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to toggle Pattern Radar visibility", "error");
    }
  };

  // Save Rules
  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    const numMinStake = Number(minStake);
    const numMaxStake = Number(maxStake);
    const numProtected = Number(protectedPayout);
    const numStandard = Number(standardPayout);

    if (isNaN(numMinStake) || numMinStake <= 0) {
      onTriggerNotification?.("Please enter a valid Min trade stake.", "error");
      return;
    }
    if (isNaN(numMaxStake) || numMaxStake < numMinStake) {
      onTriggerNotification?.("Max stake must be greater than or equal to Min stake.", "error");
      return;
    }
    try {
      setIsSavingRules(true);
      await saveSoloTradingConfig({
        protectedPayoutPercentage: isNaN(numProtected) ? 75 : numProtected,
        standardPayoutPercentage: isNaN(numStandard) ? 82 : numStandard,
        defaultPayoutPercentage: isNaN(numStandard) ? 82 : numStandard,
        minStake: numMinStake,
        maxStake: numMaxStake,
        drawRule: drawRule
      });
      onTriggerNotification?.("Solo Engine Rules & Payout Rates saved successfully!", "success");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to save Solo Rules", "error");
    } finally {
      setIsSavingRules(false);
    }
  };

  // Helper for durations
  const formatDurationLabel = (sec: number) => {
    if (sec < 60) return `${sec}s (${sec}s)`;
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return remainder > 0 ? `${mins}m ${remainder}s (${sec}s)` : `${mins}m (${sec}s)`;
  };

  const getActiveDurations = (mode: "global" | "protected" | "standard"): number[] => {
    if (mode === "global") return config.allowedDurations || [15, 30, 60, 180, 300];
    if (mode === "protected") return config.protectedAllowedDurations || config.allowedDurations || [15, 30, 60, 180];
    return config.standardAllowedDurations || config.allowedDurations || [15, 30, 60, 180];
  };

  const handleAddDuration = async (secVal: number) => {
    if (!secVal || isNaN(secVal) || secVal < 5) {
      onTriggerNotification?.("Please provide a valid duration in seconds (min 5s)", "error");
      return;
    }
    const currentList = getActiveDurations(durationModeTab);
    if (currentList.includes(secVal)) {
      onTriggerNotification?.(`Duration ${secVal}s already exists.`, "info");
      return;
    }
    const updated = [...currentList, secVal].sort((a, b) => a - b);
    try {
      if (durationModeTab === "global") {
        await saveSoloTradingConfig({ allowedDurations: updated });
      } else if (durationModeTab === "protected") {
        await saveSoloTradingConfig({ protectedAllowedDurations: updated });
      } else {
        await saveSoloTradingConfig({ standardAllowedDurations: updated });
      }
      setNewDurationInput("");
      onTriggerNotification?.(`Added ${secVal}s to ${durationModeTab.toUpperCase()} durations!`, "success");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to update duration", "error");
    }
  };

  const handleDeleteDuration = async (secVal: number) => {
    const currentList = getActiveDurations(durationModeTab);
    const updated = currentList.filter((s) => s !== secVal);
    if (updated.length === 0) {
      onTriggerNotification?.("Must keep at least 1 active duration.", "error");
      return;
    }
    try {
      if (durationModeTab === "global") {
        await saveSoloTradingConfig({ allowedDurations: updated });
      } else if (durationModeTab === "protected") {
        await saveSoloTradingConfig({ protectedAllowedDurations: updated });
      } else {
        await saveSoloTradingConfig({ standardAllowedDurations: updated });
      }
      onTriggerNotification?.(`Removed ${secVal}s from ${durationModeTab.toUpperCase()}`, "info");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to delete duration", "error");
    }
  };

  const handleResetDefaultDurations = async () => {
    if (!window.confirm("Reset all durations to default (15s, 30s, 60s, 180s, 300s)?")) return;
    try {
      await saveSoloTradingConfig({
        allowedDurations: [15, 30, 60, 180, 300],
        protectedAllowedDurations: [15, 30, 60, 180],
        standardAllowedDurations: [15, 30, 60, 180, 300]
      });
      onTriggerNotification?.("Durations reset to platform defaults!", "success");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to reset durations", "error");
    }
  };

  // Categories Handlers
  const handleAddCategory = async () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      onTriggerNotification?.("Category already exists.", "info");
      return;
    }
    const updated = [...categories, trimmed];
    try {
      await saveSoloTradingConfig({ categories: updated });
      setCategories(updated);
      setNewCategoryInput("");
      onTriggerNotification?.(`Category #${trimmed} added!`, "success");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to add category", "error");
    }
  };

  const handleDeleteCategory = async (catName: string) => {
    if (categories.length <= 1) {
      onTriggerNotification?.("At least one category must remain.", "error");
      return;
    }
    if (!window.confirm(`Delete category #${catName}? Existing assets in this category will be preserved.`)) return;
    const updated = categories.filter((c) => c !== catName);
    try {
      await saveSoloTradingConfig({ categories: updated });
      setCategories(updated);
      onTriggerNotification?.(`Category #${catName} deleted`, "info");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to delete category", "error");
    }
  };

  const handleUpdateCategoryName = async () => {
    if (!editingCategory) return;
    const { oldName, newName } = editingCategory;
    if (!newName.trim() || oldName === newName.trim()) {
      setEditingCategory(null);
      return;
    }
    const trimmed = newName.trim();
    const updatedCategories = categories.map((c) => c === oldName ? trimmed : c);
    const updatedAssets = assets.map((a) => a.category === oldName ? { ...a, category: trimmed } : a);
    try {
      await saveSoloTradingConfig({ categories: updatedCategories, customAssets: updatedAssets });
      setCategories(updatedCategories);
      setAssets(updatedAssets);
      setEditingCategory(null);
      onTriggerNotification?.(`Renamed category to #${trimmed}`, "success");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to rename category", "error");
    }
  };

  // Asset Pair Handlers
  const handleToggleAssetDisabled = async (symbol: string) => {
    const updated = assets.map((a) => {
      if (a.symbol === symbol) {
        return { ...a, disabled: !a.disabled };
      }
      return a;
    });
    try {
      await saveSoloTradingConfig({ customAssets: updated });
      setAssets(updated);
      const target = updated.find((a) => a.symbol === symbol);
      onTriggerNotification?.(
        `${target?.pair || symbol} is now ${target?.disabled ? "DISABLED" : "ACTIVE"}`,
        target?.disabled ? "info" : "success"
      );
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to toggle asset status", "error");
    }
  };

  const handleDeleteAsset = async (symbol: string) => {
    if (!window.confirm(`Delete trading pair ${symbol}?`)) return;
    const updated = assets.filter((a) => a.symbol !== symbol);
    try {
      await saveSoloTradingConfig({ customAssets: updated });
      setAssets(updated);
      onTriggerNotification?.(`Deleted pair ${symbol}`, "info");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to delete asset", "error");
    }
  };

  const handleResetDefaultPairs = async () => {
    if (!window.confirm("Reset all trading pairs to system defaults?")) return;
    try {
      await saveSoloTradingConfig({ 
        customAssets: SUPPORTED_SOLO_ASSETS,
        categories: DEFAULT_SOLO_CATEGORIES
      });
      setAssets(SUPPORTED_SOLO_ASSETS);
      setCategories(DEFAULT_SOLO_CATEGORIES);
      onTriggerNotification?.("All Solo Trading pairs reset to platform defaults!", "success");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to reset pairs", "error");
    }
  };

  const handleSaveFixedPrice = async () => {
    if (!fixingPriceAsset) return;
    const numPrice = Number(fixedPriceValue);
    if (isNaN(numPrice) || numPrice <= 0) {
      onTriggerNotification?.("Please enter a valid positive price.", "error");
      return;
    }
    const updated = assets.map((a) => {
      if (a.symbol === fixingPriceAsset.symbol) {
        return { ...a, basePrice: numPrice };
      }
      return a;
    });
    try {
      await saveSoloTradingConfig({ customAssets: updated });
      setAssets(updated);
      onTriggerNotification?.(`Price calibrated for ${fixingPriceAsset.pair} to ${numPrice}`, "success");
      setFixingPriceAsset(null);
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to fix price", "error");
    }
  };

  const handleSavePairExpiries = async () => {
    if (!editingExpiriesAsset) return;
    try {
      const parsedDurations = customPairDurations
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n) && n > 0)
        .sort((a, b) => a - b);

      const updated = assets.map((a) => {
        if (a.symbol === editingExpiriesAsset.symbol) {
          return { 
            ...a, 
            allowedDurations: parsedDurations.length > 0 ? parsedDurations : undefined 
          };
        }
        return a;
      });

      await saveSoloTradingConfig({ customAssets: updated });
      setAssets(updated);
      onTriggerNotification?.(`Expiries updated for ${editingExpiriesAsset.pair}`, "success");
      setEditingExpiriesAsset(null);
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to update pair expiries", "error");
    }
  };

  // Smart Live Price Detection for Crypto (Binance), Metals, Forex & Indices
  const detectLivePrice = async (symbolInput: string): Promise<number | null> => {
    if (!symbolInput || !symbolInput.trim()) return null;
    const clean = symbolInput.trim().toUpperCase();

    // 1. Binance / Crypto Check
    const binanceClean = clean.replace(/^BINANCE:/, "").replace(/[^A-Z0-9]/g, "");
    if (binanceClean) {
      const targetSymbol = binanceClean.endsWith("USDT") || binanceClean.endsWith("BTC") || binanceClean.endsWith("BUSD") ? binanceClean : `${binanceClean}USDT`;
      try {
        const res = await fetch(`https://data-api.binance.vision/api/v3/ticker/price?symbol=${targetSymbol}`);
        if (res.ok) {
          const data = await res.json();
          if (data.price) {
            const p = parseFloat(data.price);
            if (!isNaN(p) && p > 0) return p;
          }
        }
      } catch (_) {}

      try {
        const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${targetSymbol}`);
        if (res.ok) {
          const data = await res.json();
          if (data.price) {
            const p = parseFloat(data.price);
            if (!isNaN(p) && p > 0) return p;
          }
        }
      } catch (_) {}
    }

    // 2. Gold / Silver Spot
    if (clean.includes("XAU") || clean.includes("GOLD")) {
      try {
        const res = await fetch("https://api.gold-api.com/price/XAU");
        if (res.ok) {
          const data = await res.json();
          if (data.price && typeof data.price === "number") return data.price;
        }
      } catch (_) {}
    }
    if (clean.includes("XAG") || clean.includes("SILVER")) {
      try {
        const res = await fetch("https://api.gold-api.com/price/XAG");
        if (res.ok) {
          const data = await res.json();
          if (data.price && typeof data.price === "number") return data.price;
        }
      } catch (_) {}
    }

    // 3. Forex Rates
    try {
      const fxRes = await fetch("https://open.er-api.com/v6/latest/USD").catch(() => fetch("/api/market/forex"));
      if (fxRes && fxRes.ok) {
        const data = await fxRes.json();
        if (data.rates) {
          const rawFx = clean.replace(/^(BINANCE:|OANDA:|FX:|TVC:|CURRENCYCOM:|CAPITALCOM:)/, "").replace(/[^A-Z0-9]/g, "");
          if (data.rates[rawFx] && typeof data.rates[rawFx] === "number") return data.rates[rawFx];
        }
      }
    } catch (_) {}

    // 4. Match in predefined assets
    const match = SUPPORTED_SOLO_ASSETS.find(
      (a) => a.symbol.toUpperCase() === clean || a.pair.toUpperCase().includes(clean) || clean.includes(a.symbol.toUpperCase())
    );
    if (match) {
      return match.basePrice;
    }

    return null;
  };

  const handleDetectPriceForEdit = async () => {
    if (!editPairForm.symbol) {
      onTriggerNotification?.("Please enter a TradingView Symbol first.", "info");
      return;
    }
    try {
      setIsDetectingPriceForEdit(true);
      const detected = await detectLivePrice(editPairForm.symbol);
      if (detected !== null && detected > 0) {
        setEditPairForm((prev) => ({ ...prev, price: detected }));
        onTriggerNotification?.(`Live price detected for ${editPairForm.symbol}: ₹${detected}`, "success");
      } else {
        onTriggerNotification?.(`Could not detect live price for ${editPairForm.symbol}. Please enter manually.`, "info");
      }
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to detect price", "error");
    } finally {
      setIsDetectingPriceForEdit(false);
    }
  };

  const handleDetectPriceForNew = async () => {
    if (!newPairForm.symbol) {
      onTriggerNotification?.("Please enter a TradingView Symbol first.", "info");
      return;
    }
    try {
      setIsDetectingPriceForNew(true);
      const detected = await detectLivePrice(newPairForm.symbol);
      if (detected !== null && detected > 0) {
        setNewPairForm((prev) => ({ ...prev, basePrice: detected }));
        onTriggerNotification?.(`Live price detected for ${newPairForm.symbol}: ₹${detected}`, "success");
      } else {
        onTriggerNotification?.(`Could not auto-detect for ${newPairForm.symbol}. You can enter price or leave blank for live feed.`, "info");
      }
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to detect price", "error");
    } finally {
      setIsDetectingPriceForNew(false);
    }
  };

  const handleSelectPairForEditing = (asset: MarketAsset) => {
    setEditingPair(asset);
    setInlineEditingSymbol((prev) => (prev === asset.symbol ? null : asset.symbol));
    setEditPairForm({
      pair: asset.pair,
      symbol: asset.symbol,
      category: asset.category,
      price: asset.basePrice,
      decimals: asset.decimals ?? 2,
      protectedPayout: asset.protectedPayoutPercentage ?? Number(protectedPayout),
      standardPayout: asset.standardPayoutPercentage ?? asset.payoutPercentage ?? Number(standardPayout)
    });
  };

  const handleToggleInlineEdit = (asset: MarketAsset) => {
    if (inlineEditingSymbol === asset.symbol) {
      setInlineEditingSymbol(null);
    } else {
      setEditingPair(asset);
      setInlineEditingSymbol(asset.symbol);
      setEditPairForm({
        pair: asset.pair,
        symbol: asset.symbol,
        category: asset.category,
        price: asset.basePrice,
        decimals: asset.decimals ?? 2,
        protectedPayout: asset.protectedPayoutPercentage ?? Number(protectedPayout),
        standardPayout: asset.standardPayoutPercentage ?? asset.payoutPercentage ?? Number(standardPayout)
      });
    }
  };

  const handleQuickDetectPrice = async (asset: MarketAsset) => {
    try {
      setQuickDetectingSymbol(asset.symbol);
      const detected = await detectLivePrice(asset.symbol);
      if (detected !== null && detected > 0) {
        const updated = assets.map((a) => (a.symbol === asset.symbol ? { ...a, basePrice: detected } : a));
        await saveSoloTradingConfig({ customAssets: updated });
        setAssets(updated);
        onTriggerNotification?.(`Live price updated for ${asset.pair}: ₹${detected}`, "success");
      } else {
        onTriggerNotification?.(`Could not auto-detect live price for ${asset.symbol}. Click Edit to enter manually.`, "info");
      }
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to detect price", "error");
    } finally {
      setQuickDetectingSymbol(null);
    }
  };

  const handleSaveEditPair = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editPairForm.pair.trim() || !editPairForm.symbol.trim()) {
      onTriggerNotification?.("Pair display name and TradingView symbol are required.", "error");
      return;
    }
    const numPrice = Number(editPairForm.price);
    if (isNaN(numPrice) || numPrice <= 0) {
      onTriggerNotification?.("Please enter a valid positive price.", "error");
      return;
    }

    const targetSymbol = editingPair ? editingPair.symbol : editPairForm.symbol.trim().toUpperCase();
    const exists = assets.find((a) => a.symbol === targetSymbol);

    let updatedAssets: MarketAsset[];
    if (exists) {
      updatedAssets = assets.map((a) => {
        if (a.symbol === targetSymbol) {
          return {
            ...a,
            pair: editPairForm.pair.trim(),
            symbol: editPairForm.symbol.trim().toUpperCase(),
            category: editPairForm.category || a.category,
            basePrice: numPrice,
            decimals: Number(editPairForm.decimals ?? a.decimals ?? 2),
            protectedPayoutPercentage: Number(editPairForm.protectedPayout ?? protectedPayout),
            standardPayoutPercentage: Number(editPairForm.standardPayout ?? standardPayout),
            payoutPercentage: Number(editPairForm.standardPayout ?? standardPayout)
          };
        }
        return a;
      });
    } else {
      const newAsset: MarketAsset = {
        pair: editPairForm.pair.trim(),
        symbol: editPairForm.symbol.trim().toUpperCase(),
        category: editPairForm.category || "Indices",
        basePrice: numPrice,
        decimals: Number(editPairForm.decimals ?? 2),
        protectedPayoutPercentage: Number(editPairForm.protectedPayout ?? protectedPayout),
        standardPayoutPercentage: Number(editPairForm.standardPayout ?? standardPayout),
        payoutPercentage: Number(editPairForm.standardPayout ?? standardPayout),
        disabled: false
      };
      updatedAssets = [newAsset, ...assets];
    }

    try {
      await saveSoloTradingConfig({ customAssets: updatedAssets });
      setAssets(updatedAssets);
      setInlineEditingSymbol(null);
      onTriggerNotification?.(`Saved changes for ${editPairForm.pair}!`, "success");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to save trading pair", "error");
    }
  };

  const handleLockEditPrice = async () => {
    const numPrice = Number(editPairForm.price);
    if (isNaN(numPrice) || numPrice <= 0) {
      onTriggerNotification?.("Please enter a valid price to lock.", "error");
      return;
    }
    const targetSymbol = editingPair ? editingPair.symbol : editPairForm.symbol.trim().toUpperCase();
    const updatedAssets = assets.map((a) => {
      if (a.symbol === targetSymbol || a.pair === editPairForm.pair) {
        return {
          ...a,
          basePrice: numPrice
        };
      }
      return a;
    });
    try {
      await saveSoloTradingConfig({ customAssets: updatedAssets });
      setAssets(updatedAssets);
      setInlineEditingSymbol(null);
      onTriggerNotification?.(`🔒 Price locked for ${editPairForm.pair} at ₹${numPrice}`, "success");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to lock price", "error");
    }
  };

  const handleAddNewPair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPairForm.pair || !newPairForm.symbol) {
      onTriggerNotification?.("Pair name and TradingView symbol are required.", "error");
      return;
    }
    if (assets.some((a) => a.symbol.toUpperCase() === newPairForm.symbol.trim().toUpperCase())) {
      onTriggerNotification?.("An asset with this symbol already exists.", "error");
      return;
    }

    const numBasePrice = newPairForm.basePrice !== "" && !isNaN(Number(newPairForm.basePrice))
      ? Number(newPairForm.basePrice)
      : 100;

    const newAsset: MarketAsset = {
      pair: newPairForm.pair.trim(),
      symbol: newPairForm.symbol.trim().toUpperCase(),
      category: newPairForm.category || "Crypto",
      basePrice: numBasePrice,
      decimals: Number(newPairForm.decimals ?? 2),
      payoutPercentage: Number(newPairForm.standardPayoutPercentage || standardPayout),
      protectedPayoutPercentage: Number(newPairForm.protectedPayoutPercentage || protectedPayout),
      standardPayoutPercentage: Number(newPairForm.standardPayoutPercentage || standardPayout),
      disabled: false
    };

    const updated = [newAsset, ...assets];
    try {
      await saveSoloTradingConfig({ customAssets: updated });
      setAssets(updated);
      setIsAddingNewPairModal(false);
      setNewPairForm({
        pair: "",
        symbol: "",
        category: "Crypto",
        basePrice: "",
        decimals: 2,
        protectedPayoutPercentage: 80,
        standardPayoutPercentage: 85
      });
      onTriggerNotification?.(`Added new pair ${newAsset.pair}!`, "success");
    } catch (err: any) {
      onTriggerNotification?.(err.message || "Failed to add asset pair", "error");
    }
  };

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (selectedCategoryFilter !== "ALL" && asset.category !== selectedCategoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchPair = asset.pair.toLowerCase().includes(q);
        const matchSymbol = asset.symbol.toLowerCase().includes(q);
        const matchCategory = asset.category.toLowerCase().includes(q);
        if (!matchPair && !matchSymbol && !matchCategory) return false;
      }
      return true;
    });
  }, [assets, selectedCategoryFilter, searchQuery]);

  // Solo Trades Audit Log State
  const [auditSearchQuery, setAuditSearchQuery] = useState("");
  const [auditStatusFilter, setAuditStatusFilter] = useState<string>("ALL");
  const [auditModeFilter, setAuditModeFilter] = useState<string>("ALL");
  const [auditDirectionFilter, setAuditDirectionFilter] = useState<string>("ALL");
  const [auditPage, setAuditPage] = useState(1);
  const [auditRowsPerPage, setAuditRowsPerPage] = useState(25);

  const formatTradeTime = (isoString?: string | null) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return String(isoString);
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
    } catch {
      return String(isoString);
    }
  };

  const formatTradeDate = (isoString?: string | null) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return "";
    }
  };

  const filteredAuditTrades = useMemo(() => {
    return allSoloTrades.filter((trade) => {
      // Status filter
      if (auditStatusFilter !== "ALL") {
        if (auditStatusFilter === "RUNNING") {
          if (trade.status !== "RUNNING" && (trade.status as string) !== "ACTIVE") return false;
        } else if (trade.status !== auditStatusFilter) {
          return false;
        }
      }
      // Mode filter
      if (auditModeFilter !== "ALL") {
        const isProtected = trade.drawRule === "REFUND";
        if (auditModeFilter === "PROTECTED" && !isProtected) return false;
        if (auditModeFilter === "STANDARD" && isProtected) return false;
      }
      // Direction filter
      if (auditDirectionFilter !== "ALL") {
        if (trade.tradeType !== auditDirectionFilter) return false;
      }
      // Search query
      if (auditSearchQuery.trim()) {
        const q = auditSearchQuery.toLowerCase().trim();
        const matchUser = (trade.userName || "").toLowerCase().includes(q) ||
                          (trade.userEmail || "").toLowerCase().includes(q) ||
                          (trade.userId || "").toLowerCase().includes(q);
        const matchPair = (trade.assetPair || "").toLowerCase().includes(q) ||
                          (trade.tradingSymbol || "").toLowerCase().includes(q);
        const matchId = (trade.id || "").toLowerCase().includes(q) ||
                        (trade.txId || "").toLowerCase().includes(q);
        if (!matchUser && !matchPair && !matchId) return false;
      }
      return true;
    });
  }, [allSoloTrades, auditStatusFilter, auditModeFilter, auditDirectionFilter, auditSearchQuery]);

  const totalAuditPages = auditRowsPerPage === -1 
    ? 1 
    : Math.max(1, Math.ceil(filteredAuditTrades.length / auditRowsPerPage));

  const paginatedAuditTrades = useMemo(() => {
    if (auditRowsPerPage === -1) return filteredAuditTrades;
    const start = (auditPage - 1) * auditRowsPerPage;
    return filteredAuditTrades.slice(start, start + auditRowsPerPage);
  }, [filteredAuditTrades, auditPage, auditRowsPerPage]);

  return (
    <div className="space-y-6">
      {/* 1. Solo Binary Options Engine Master Switch Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className={`p-3 rounded-2xl ${
            config.isEnabled 
              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400" 
              : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
          }`}>
            <Power className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Solo Binary Options Engine Master Switch
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold tracking-wide uppercase ${
                config.isEnabled 
                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" 
                  : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
              }`}>
                {config.isEnabled ? "ACTIVE / AVAILABLE" : "INACTIVE / DEACTIVATED"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Ye admin jab active kare tabhi user ke liye available ho. When deactivated, users cannot place any solo trades.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleMasterSwitch}
          className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold tracking-wide uppercase transition-all shadow-md flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            config.isEnabled
              ? "bg-rose-600 hover:bg-rose-700 text-white"
              : "bg-emerald-600 hover:bg-emerald-700 text-white"
          }`}
        >
          <Power className="h-4 w-4" />
          {config.isEnabled ? "DEACTIVATE SOLO ENGINE" : "ACTIVATE SOLO ENGINE"}
        </button>
      </div>

      {/* 2. Feature Visibility & Pattern Radar Toggle */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className={`p-3 rounded-2xl ${
            config.showPatternRadar !== false 
              ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400" 
              : "bg-slate-100 dark:bg-slate-800 text-slate-400"
          }`}>
            <Sparkles className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Pattern Radar Visibility
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold tracking-wide uppercase ${
                config.showPatternRadar !== false 
                  ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800" 
                  : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
              }`}>
                {config.showPatternRadar !== false ? "VISIBLE TO USERS" : "HIDDEN FROM USERS"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Admin controls whether the <strong>"⚡ Pattern Radar"</strong> button is shown to traders on their trading desk.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTogglePatternRadar}
          className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold tracking-wide uppercase transition-all shadow-md flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            config.showPatternRadar !== false
              ? "bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white"
              : "bg-amber-600 hover:bg-amber-700 text-white"
          }`}
        >
          {config.showPatternRadar !== false ? (
            <>
              <EyeOff className="h-4 w-4" />
              HIDE PATTERN RADAR
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              SHOW PATTERN RADAR
            </>
          )}
        </button>
      </div>

      {/* 3. Solo Engine Rules & Payout Rates */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <Sliders className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Solo Engine Rules & Payout Rates</h3>
            <p className="text-xs text-slate-500">Configure global payout multipliers, stake boundaries & default settlement mode</p>
          </div>
        </div>

        <form onSubmit={handleSaveRules} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Protected Mode */}
            <div className="bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl p-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Protected Mode Payout Rate (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={protectedPayout}
                  onChange={(e) => setProtectedPayout(e.target.value === "" ? "" : Number(e.target.value))}
                  min="1"
                  max="100"
                  placeholder="75"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 font-bold"
                  required
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">%</span>
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
                1. Protected Mode — REFUND STAKE WHEN DRAW TRADE (Return 100% of Stake to User)
              </p>
            </div>

            {/* Standard Mode */}
            <div className="bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl p-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Standard Mode Payout Rate (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={standardPayout}
                  onChange={(e) => setStandardPayout(e.target.value === "" ? "" : Number(e.target.value))}
                  min="1"
                  max="100"
                  placeholder="82"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 font-bold"
                  required
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">%</span>
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 font-medium">
                2. Standard Mode — TREAT AS LOSS (Stake Forfeited)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Min Trade Stake (₹)
              </label>
              <input
                type="number"
                value={minStake}
                onChange={(e) => setMinStake(e.target.value === "" ? "" : Number(e.target.value))}
                min="1"
                placeholder="5"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Max Trade Stake (₹)
              </label>
              <input
                type="number"
                value={maxStake}
                onChange={(e) => setMaxStake(e.target.value === "" ? "" : Number(e.target.value))}
                min="1"
                placeholder="20"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 font-bold"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Default Settlement Rule (Platform Fallback)
            </label>
            <select
              value={drawRule === "REFUND" ? "REFUND" : "LOSS"}
              onChange={(e) => setDrawRule(e.target.value as "REFUND" | "LOSS")}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 font-semibold"
            >
              <option value="LOSS">2. Standard Mode — TREAT AS LOSS (Stake Forfeited)</option>
              <option value="REFUND">1. Protected Mode — REFUND STAKE WHEN DRAW TRADE (Return 100% of Stake to User)</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSavingRules}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold tracking-wide uppercase rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSavingRules ? "Saving Rules..." : "Save Solo Engine Rules"}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Platform Solo Options Financial Summary (Real-time) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Platform Solo Options Financial Summary
            </h4>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Real-time
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              TOTAL SOLO TRADES PLACED
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {financialSummary.totalTrades.toLocaleString()}
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              TOTAL STAKE VOLUME (₹)
            </div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              ₹{financialSummary.totalStake.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              TOTAL USER PAYOUTS PAID (₹)
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              ₹{financialSummary.totalPayout.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              ADMIN NET MARGIN (₹)
            </div>
            <div className={`text-2xl font-black mt-1 ${
              financialSummary.netMargin >= 0 
                ? "text-emerald-600 dark:text-emerald-400" 
                : "text-rose-600 dark:text-rose-400"
            }`}>
              {financialSummary.netMargin >= 0 ? "+" : ""}
              ₹{financialSummary.netMargin.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Manage Solo Option Expiry Durations (Global & Mode-Wise) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Manage Solo Option Expiry Durations (Global & Mode-Wise)
              </h3>
              <p className="text-xs text-slate-500">
                Configure available trade expiration times globally or specifically for Protected / Standard trade modes
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetDefaultDurations}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset All Default Durations
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <button
            type="button"
            onClick={() => setDurationModeTab("global")}
            className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-2 ${
              durationModeTab === "global"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <span>Global Fallback</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {getActiveDurations("global").length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDurationModeTab("protected")}
            className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-2 ${
              durationModeTab === "protected"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Protected Mode</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              {config.protectedAllowedDurations ? `Custom (${config.protectedAllowedDurations.length})` : "Inherited"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDurationModeTab("standard")}
            className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-2 ${
              durationModeTab === "standard"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Standard Mode</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
              {config.standardAllowedDurations ? `Custom (${config.standardAllowedDurations.length})` : "Inherited"}
            </span>
          </button>
        </div>

        {/* Active Durations Display */}
        <div className="mb-4">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            ACTIVE DURATIONS FOR {durationModeTab.toUpperCase()} ({getActiveDurations(durationModeTab).length})
          </div>
          <div className="flex flex-wrap gap-2.5">
            {getActiveDurations(durationModeTab).map((sec, idx) => (
              <div
                key={sec}
                className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-2xl"
              >
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                  {formatDurationLabel(sec)}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingDurationIndex({ mode: durationModeTab, index: idx, val: sec })}
                  className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg cursor-pointer"
                  title="Edit duration"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteDuration(sec)}
                  className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg cursor-pointer"
                  title="Delete duration"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Add Duration Input & Quick Chips */}
        <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
              Add Duration to {durationModeTab.toUpperCase()}:
            </span>
            <input
              type="number"
              placeholder="e.g. 120 or 600"
              value={newDurationInput}
              onChange={(e) => setNewDurationInput(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 w-32"
            />
            <button
              type="button"
              onClick={() => handleAddDuration(Number(newDurationInput))}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              + Add
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">Quick:</span>
            {[
              { label: "10s", sec: 10 },
              { label: "15s", sec: 15 },
              { label: "30s", sec: 30 },
              { label: "45s", sec: 45 },
              { label: "1m", sec: 60 },
              { label: "2m", sec: 120 },
              { label: "3m", sec: 180 },
              { label: "5m", sec: 300 },
              { label: "10m", sec: 600 },
            ].map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => handleAddDuration(q.sec)}
                className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-500 rounded-lg text-[11px] font-bold cursor-pointer transition-all"
              >
                +{q.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Manage Solo Trading Pairs & Live Sync */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Manage Solo Trading Pairs & Live Sync
              </h3>
              <p className="text-xs text-slate-500">
                Add custom pairs with TradingView symbol & sub-second Binance WebSocket live feed matching
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaultPairs}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset Default Pairs
            </button>
            <button
              type="button"
              onClick={() => setIsAddingNewPairModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" /> + Add New Pair
            </button>
          </div>
        </div>

        {/* ASSET CATEGORIES (N) */}
        <div className="mb-6 p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                ASSET CATEGORIES ({categories.length})
              </h4>
              <p className="text-[11px] text-slate-500">
                Add, edit, or delete trading categories. Updating or deleting reassigns asset pairs seamlessly.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="New Category Name (e.g. Stocks, Futures...)"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 w-64"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                + Add Category
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {categories.map((cat) => {
              const pairCount = assets.filter((a) => a.category === cat).length;
              return (
                <div
                  key={cat}
                  className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3.5 py-1.5 rounded-2xl shadow-xs"
                >
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    #{cat}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {pairCount} {pairCount === 1 ? "pair" : "pairs"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingCategory({ oldName: cat, newName: cat })}
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg cursor-pointer"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2-Column / Stacked Layout for EDIT PAIR and ADD NEW CUSTOM TRADING PAIR */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* A. EDIT PAIR CARD */}
          <div id="admin-edit-pair-section" className="bg-slate-900 dark:bg-slate-900/95 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl relative">
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-indigo-400" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                  EDIT TRADING PAIR {editingPair ? `(${editingPair.pair})` : ""}
                </h4>
              </div>

              {/* Quick Pair Selector */}
              <select
                value={editingPair?.symbol || editPairForm.symbol}
                onChange={(e) => {
                  const found = assets.find((a) => a.symbol === e.target.value);
                  if (found) handleSelectPairForEditing(found);
                }}
                className="bg-slate-950 border border-slate-700 text-slate-300 rounded-xl px-2.5 py-1 text-[11px] font-semibold max-w-[180px] truncate"
              >
                {assets.map((a) => (
                  <option key={a.symbol} value={a.symbol}>
                    {a.pair}
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handleSaveEditPair} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">
                  Pair Display Name
                </label>
                <input
                  type="text"
                  value={editPairForm.pair}
                  onChange={(e) => setEditPairForm({ ...editPairForm, pair: e.target.value })}
                  placeholder="e.g. GER 40 (DAX Index)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs md:text-sm font-bold text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-400">
                    TradingView Symbol
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectPriceForEdit}
                    disabled={isDetectingPriceForEdit}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isDetectingPriceForEdit ? "animate-spin" : ""}`} />
                    {isDetectingPriceForEdit ? "Detecting..." : "Detect Price"}
                  </button>
                </div>
                <input
                  type="text"
                  value={editPairForm.symbol}
                  onChange={(e) => setEditPairForm({ ...editPairForm, symbol: e.target.value.toUpperCase() })}
                  placeholder="e.g. CURRENCYCOM:DE40"
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs md:text-sm font-bold text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 uppercase"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">
                    Category
                  </label>
                  <select
                    value={editPairForm.category}
                    onChange={(e) => setEditPairForm({ ...editPairForm, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs md:text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editPairForm.price}
                    onChange={(e) => setEditPairForm({ ...editPairForm, price: e.target.value })}
                    placeholder="19400"
                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs md:text-sm font-bold text-emerald-400 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">
                    Protected Payout %
                  </label>
                  <input
                    type="number"
                    value={editPairForm.protectedPayout}
                    onChange={(e) => setEditPairForm({ ...editPairForm, protectedPayout: Number(e.target.value) })}
                    placeholder="75"
                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs md:text-sm font-bold text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">
                    Standard Payout %
                  </label>
                  <input
                    type="number"
                    value={editPairForm.standardPayout}
                    onChange={(e) => setEditPairForm({ ...editPairForm, standardPayout: Number(e.target.value) })}
                    placeholder="82"
                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs md:text-sm font-bold text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-2xl text-xs md:text-sm font-black flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all"
                >
                  <Check className="h-4 w-4" /> Save
                </button>
                <button
                  type="button"
                  onClick={handleLockEditPrice}
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white rounded-2xl text-xs md:text-sm font-black flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all"
                >
                  <Lock className="h-4 w-4" /> Lock Price
                </button>
              </div>
            </form>
          </div>

          {/* B. ADD NEW CUSTOM TRADING PAIR CARD */}
          <div className="bg-slate-900 dark:bg-slate-900/95 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl relative">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
              <Plus className="h-4 w-4 text-emerald-400" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                ADD NEW CUSTOM TRADING PAIR
              </h4>
            </div>

            <form onSubmit={handleAddNewPair} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">
                  Pair Name
                </label>
                <input
                  type="text"
                  value={newPairForm.pair}
                  onChange={(e) => setNewPairForm({ ...newPairForm, pair: e.target.value })}
                  placeholder="e.g. DOGE / USDT (Dogecoin)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs md:text-sm font-bold text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-400">
                    TradingView Symbol
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectPriceForNew}
                    disabled={isDetectingPriceForNew}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Zap className={`h-3.5 w-3.5 ${isDetectingPriceForNew ? "animate-spin" : ""}`} />
                    {isDetectingPriceForNew ? "Detecting..." : "Detect Live Price"}
                  </button>
                </div>
                <input
                  type="text"
                  value={newPairForm.symbol}
                  onChange={(e) => setNewPairForm({ ...newPairForm, symbol: e.target.value.toUpperCase() })}
                  placeholder="e.g. BINANCE:DOGEUSDT"
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs md:text-sm font-bold text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">
                  Category
                </label>
                <select
                  value={newPairForm.category}
                  onChange={(e) => setNewPairForm({ ...newPairForm, category: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs md:text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">
                  Initial Base Price (Optional)
                </label>
                <input
                  type="text"
                  value={newPairForm.basePrice}
                  onChange={(e) => setNewPairForm({ ...newPairForm, basePrice: e.target.value })}
                  placeholder="Auto TradingView Live Feed"
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs md:text-sm font-bold text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">
                    Protected Payout (%)
                  </label>
                  <input
                    type="number"
                    value={newPairForm.protectedPayoutPercentage}
                    onChange={(e) => setNewPairForm({ ...newPairForm, protectedPayoutPercentage: Number(e.target.value) })}
                    placeholder="80"
                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs md:text-sm font-bold text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">
                    Standard Payout (%)
                  </label>
                  <input
                    type="number"
                    value={newPairForm.standardPayoutPercentage}
                    onChange={(e) => setNewPairForm({ ...newPairForm, standardPayoutPercentage: Number(e.target.value) })}
                    placeholder="85"
                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs md:text-sm font-bold text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-2xl text-xs md:text-sm font-black flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all"
                >
                  <Plus className="h-4 w-4" /> Add Pair
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ACTIVE TRADING PAIRS (N) Search and Filter */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              ACTIVE TRADING PAIRS ({filteredAssets.length})
            </h4>
            <p className="text-[11px] text-slate-500">
              Click <span className="font-semibold text-indigo-600 dark:text-indigo-400">Fix Price</span> to manually align any mismatched market price
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search symbol or pair..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 w-48 sm:w-60"
              />
            </div>

            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-semibold"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Asset Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => {
            const isPairDisabled = !!asset.disabled;
            const protPayout = asset.protectedPayoutPercentage ?? protectedPayout;
            const stdPayout = asset.standardPayoutPercentage ?? asset.payoutPercentage ?? standardPayout;

            return (
              <div
                key={asset.symbol}
                className={`p-4 rounded-3xl border transition-all flex flex-col justify-between ${
                  isPairDisabled
                    ? "bg-slate-100/60 dark:bg-slate-900/40 border-slate-300 dark:border-slate-800 opacity-60"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="font-black text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>{asset.pair}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50">
                          {asset.category}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          isPairDisabled
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                        }`}>
                          {isPairDisabled ? "DISABLED" : "ACTIVE"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleAssetDisabled(asset.symbol)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1 ${
                          isPairDisabled
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                            : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                        }`}
                      >
                        {isPairDisabled ? "Enable" : "Disable"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickDetectPrice(asset)}
                        disabled={quickDetectingSymbol === asset.symbol}
                        className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg cursor-pointer disabled:opacity-50"
                        title="Quick sync / detect live market price"
                      >
                        <RotateCw className={`h-3.5 w-3.5 ${quickDetectingSymbol === asset.symbol ? "animate-spin text-indigo-500" : ""}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAsset(asset.symbol)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                        title="Delete pair"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] font-bold mt-2">
                    <span className="text-emerald-600 dark:text-emerald-400">🛡️ Prot: {protPayout}%</span>
                    <span className="text-amber-600 dark:text-amber-400">⚡ Std: {stdPayout}%</span>
                  </div>

                  {/* INLINE EDIT FORM OR LIVE MARKET PRICE SUMMARY */}
                  {inlineEditingSymbol === asset.symbol ? (
                    <div className="mt-3 p-3.5 sm:p-4 bg-slate-950/95 dark:bg-slate-950 border border-slate-800 rounded-2xl space-y-3 text-left shadow-lg">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-1.5 text-indigo-400">
                          <Edit2 className="h-3.5 w-3.5" />
                          <span className="text-[11px] font-black tracking-wider uppercase">
                            EDIT PAIR DETAILS
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setInlineEditingSymbol(null)}
                          className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                          title="Close inline editor"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          Pair Display Name
                        </label>
                        <input
                          type="text"
                          value={editPairForm.pair}
                          onChange={(e) => setEditPairForm({ ...editPairForm, pair: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-slate-400">
                            TradingView Symbol
                          </label>
                          <button
                            type="button"
                            onClick={handleDetectPriceForEdit}
                            disabled={isDetectingPriceForEdit}
                            className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className={`h-3 w-3 ${isDetectingPriceForEdit ? "animate-spin" : ""}`} />
                            {isDetectingPriceForEdit ? "Detecting..." : "Detect Price"}
                          </button>
                        </div>
                        <input
                          type="text"
                          value={editPairForm.symbol}
                          onChange={(e) => setEditPairForm({ ...editPairForm, symbol: e.target.value.toUpperCase() })}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-bold text-white uppercase focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 mb-1">
                            Category
                          </label>
                          <select
                            value={editPairForm.category}
                            onChange={(e) => setEditPairForm({ ...editPairForm, category: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                          >
                            {categories.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 mb-1">
                            Price (₹)
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={editPairForm.price}
                            onChange={(e) => setEditPairForm({ ...editPairForm, price: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-2 text-xs font-bold text-emerald-400 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 mb-1">
                            Protected Payout %
                          </label>
                          <input
                            type="number"
                            value={editPairForm.protectedPayout}
                            onChange={(e) => setEditPairForm({ ...editPairForm, protectedPayout: Number(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 mb-1">
                            Standard Payout %
                          </label>
                          <input
                            type="number"
                            value={editPairForm.standardPayout}
                            onChange={(e) => setEditPairForm({ ...editPairForm, standardPayout: Number(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleSaveEditPair}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all"
                        >
                          <Check className="h-3.5 w-3.5" /> Save
                        </button>
                        <button
                          type="button"
                          onClick={handleLockEditPrice}
                          className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all"
                        >
                          <Lock className="h-3.5 w-3.5" /> Lock Price
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-[9px] text-slate-400 uppercase font-semibold">LIVE MARKET PRICE</div>
                        <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                          {asset.basePrice.toLocaleString(undefined, { minimumFractionDigits: asset.decimals, maximumFractionDigits: asset.decimals })}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <button
                          type="button"
                          onClick={() => handleToggleInlineEdit(asset)}
                          className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-[10px] font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/80 flex items-center gap-1 cursor-pointer"
                          title="Edit pair settings & live price right here"
                        >
                          <Edit2 className="h-3 w-3" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingExpiriesAsset(asset);
                            setCustomPairDurations((asset.allowedDurations || []).join(", "));
                          }}
                          className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-lg text-[10px] font-bold hover:bg-amber-100 flex items-center gap-1 cursor-pointer"
                        >
                          <Clock className="h-3 w-3" /> Expiries
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFixingPriceAsset(asset);
                            setFixedPriceValue(String(asset.basePrice));
                          }}
                          className="px-2.5 py-1 bg-slate-800 text-white rounded-lg text-[10px] font-bold hover:bg-slate-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Zap className="h-3 w-3" /> Fix Price
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. All Solo Options Trades Audit Log */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <History className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  All Solo Options Trades Audit Log ({allSoloTrades.length})
                </h3>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Every individual call/put option created across all users
              </p>
            </div>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="space-y-3 mb-5">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search user, pair, trade ID..."
              value={auditSearchQuery}
              onChange={(e) => {
                setAuditSearchQuery(e.target.value);
                setAuditPage(1);
              }}
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-slate-100 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {auditSearchQuery && (
              <button
                type="button"
                onClick={() => {
                  setAuditSearchQuery("");
                  setAuditPage(1);
                }}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2.5">
            {/* Status Filter Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { label: "All", value: "ALL", count: allSoloTrades.length },
                { label: "Active", value: "RUNNING", count: allSoloTrades.filter((t) => t.status === "RUNNING" || (t.status as string) === "ACTIVE").length },
                { label: "Won", value: "WON", count: allSoloTrades.filter((t) => t.status === "WON").length },
                { label: "Lost", value: "LOST", count: allSoloTrades.filter((t) => t.status === "LOST").length },
                { label: "Draw", value: "DRAW", count: allSoloTrades.filter((t) => t.status === "DRAW").length }
              ].map((tab) => {
                const isActive = auditStatusFilter === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => {
                      setAuditStatusFilter(tab.value);
                      setAuditPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Mode, Direction & Rows per page */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={auditModeFilter}
                onChange={(e) => {
                  setAuditModeFilter(e.target.value);
                  setAuditPage(1);
                }}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <option value="ALL">All Modes</option>
                <option value="PROTECTED">🛡️ Protected Mode</option>
                <option value="STANDARD">⚡ Standard Mode</option>
              </select>

              <select
                value={auditDirectionFilter}
                onChange={(e) => {
                  setAuditDirectionFilter(e.target.value);
                  setAuditPage(1);
                }}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <option value="ALL">All Directions</option>
                <option value="CALL">▲ CALL Only</option>
                <option value="PUT">▼ PUT Only</option>
              </select>

              <select
                value={auditRowsPerPage}
                onChange={(e) => {
                  setAuditRowsPerPage(Number(e.target.value));
                  setAuditPage(1);
                }}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
                <option value={-1}>All Trades</option>
              </select>
            </div>
          </div>
        </div>

        {/* Audit Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">Trader</th>
                <th className="p-3.5">Pair / Expiry</th>
                <th className="p-3.5">Direction</th>
                <th className="p-3.5">Mode</th>
                <th className="p-3.5">Stake</th>
                <th className="p-3.5">Entry Price</th>
                <th className="p-3.5 text-slate-900 dark:text-slate-100">Exit Price</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">P/L</th>
                <th className="p-3.5 text-emerald-600 dark:text-emerald-400">
                  Entry Time <span className="text-[9px] font-normal">(प्रवेश)</span>
                </th>
                <th className="p-3.5 text-amber-600 dark:text-amber-400">
                  Exit Time <span className="text-[9px] font-normal">(समाप्ति)</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedAuditTrades.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400 font-medium">
                    No solo trades match the current filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedAuditTrades.map((trade) => {
                  const stake = Number(trade.stake || 0);
                  const isWon = trade.status === "WON";
                  const isLost = trade.status === "LOST";
                  const isDraw = trade.status === "DRAW";
                  const isRunning = trade.status === "RUNNING" || (trade.status as string) === "ACTIVE";
                  const isCall = trade.tradeType === "CALL";
                  const isProtected = trade.drawRule === "REFUND";

                  let plText = "—";
                  let plClass = "text-slate-500";
                  if (isWon) {
                    const profitVal = Number(trade.profitOrLoss ?? (stake * (trade.payoutPercentage || 82) / 100));
                    plText = `+₹${profitVal.toFixed(2)}`;
                    plClass = "text-emerald-600 dark:text-emerald-400 font-black";
                  } else if (isLost) {
                    plText = `-₹${stake.toFixed(2)}`;
                    plClass = "text-rose-600 dark:text-rose-400 font-black";
                  } else if (isDraw) {
                    plText = "₹0.00";
                    plClass = "text-slate-500 dark:text-slate-400 font-bold";
                  } else if (isRunning) {
                    plText = "Pending";
                    plClass = "text-amber-500 font-bold animate-pulse";
                  }

                  return (
                    <tr
                      key={trade.id || `${trade.userId}_${trade.startTime}`}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Trader */}
                      <td className="p-3.5">
                        <div className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                          {trade.userName || "Trader"}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]" title={trade.userId || trade.userEmail}>
                          {trade.userEmail || trade.userId}
                        </div>
                      </td>

                      {/* Pair / Expiry */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                          {trade.assetPair || trade.tradingSymbol || "ASSET"}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {trade.durationSeconds ? `${trade.durationSeconds}s` : "Option"}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            {trade.payoutPercentage || 82}% Payout
                          </span>
                        </div>
                      </td>

                      {/* Direction */}
                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isCall 
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                        }`}>
                          {isCall ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {trade.tradeType}
                        </span>
                      </td>

                      {/* Mode */}
                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          isProtected 
                            ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50"
                        }`}>
                          {isProtected ? <Shield className="h-2.5 w-2.5" /> : <Zap className="h-2.5 w-2.5" />}
                          {isProtected ? "Protected" : "Standard"}
                        </span>
                      </td>

                      {/* Stake */}
                      <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100">
                        ₹{stake.toFixed(2)}
                      </td>

                      {/* Entry Price */}
                      <td className="p-3.5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {trade.entryPrice !== undefined && trade.entryPrice !== null ? trade.entryPrice : "—"}
                      </td>

                      {/* Exit Price */}
                      <td className="p-3.5 font-mono text-xs font-black text-slate-900 dark:text-slate-100">
                        {trade.exitPrice !== undefined && trade.exitPrice !== null ? trade.exitPrice : "—"}
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                          isWon ? "bg-emerald-500 text-white shadow-xs" :
                          isLost ? "bg-rose-500 text-white shadow-xs" :
                          isDraw ? "bg-slate-500 text-white" :
                          "bg-amber-500 text-white animate-pulse"
                        }`}>
                          {trade.status}
                        </span>
                      </td>

                      {/* P/L */}
                      <td className={`p-3.5 text-xs ${plClass}`}>
                        {plText}
                      </td>

                      {/* Entry Time (प्रवेश) */}
                      <td className="p-3.5">
                        <div className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {formatTradeTime(trade.startTime)}
                        </div>
                        <div className="text-[9px] text-slate-400">
                          {formatTradeDate(trade.startTime)}
                        </div>
                      </td>

                      {/* Exit Time (समाप्ति) */}
                      <td className="p-3.5">
                        <div className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                          {formatTradeTime(trade.endTime || trade.settledAt)}
                        </div>
                        <div className="text-[9px] text-slate-400">
                          {formatTradeDate(trade.endTime || trade.settledAt)}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Count Summary */}
        <div className="flex items-center justify-between flex-wrap gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-900 dark:text-slate-100">{paginatedAuditTrades.length > 0 ? (auditPage - 1) * (auditRowsPerPage === -1 ? paginatedAuditTrades.length : auditRowsPerPage) + 1 : 0}</span> to <span className="font-bold text-slate-900 dark:text-slate-100">{auditRowsPerPage === -1 ? filteredAuditTrades.length : Math.min(auditPage * auditRowsPerPage, filteredAuditTrades.length)}</span> of <span className="font-bold text-slate-900 dark:text-slate-100">{filteredAuditTrades.length}</span> trades
            {filteredAuditTrades.length !== allSoloTrades.length && ` (filtered from ${allSoloTrades.length} total)`}
          </div>

          {auditRowsPerPage !== -1 && totalAuditPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={auditPage <= 1}
                onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold disabled:opacity-40 cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>

              <span className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                Page {auditPage} of {totalAuditPages}
              </span>

              <button
                type="button"
                disabled={auditPage >= totalAuditPages}
                onClick={() => setAuditPage((p) => Math.min(totalAuditPages, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold disabled:opacity-40 cursor-pointer flex items-center gap-1"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Fix Price */}
      {fixingPriceAsset && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 rounded-xl">
                  <Zap className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Calibrate Live Price
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setFixingPriceAsset(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Set calibrated base price for <span className="font-bold text-slate-900 dark:text-slate-100">{fixingPriceAsset.pair}</span> ({fixingPriceAsset.symbol}):
            </p>

            <div className="space-y-4">
              <input
                type="number"
                step="any"
                value={fixedPriceValue}
                onChange={(e) => setFixedPriceValue(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 font-bold"
                placeholder="e.g. 78500.00"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFixingPriceAsset(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveFixedPrice}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Save Fixed Price
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Pair Expiries */}
      {editingExpiriesAsset && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 dark:bg-amber-950 text-amber-600 rounded-xl">
                  <Clock className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Custom Expiries for {editingExpiriesAsset.pair}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingExpiriesAsset(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Comma-separated list of durations in seconds (leave empty to inherit global default durations):
            </p>

            <div className="space-y-4">
              <input
                type="text"
                value={customPairDurations}
                onChange={(e) => setCustomPairDurations(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 font-bold"
                placeholder="e.g. 15, 30, 60, 180"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingExpiriesAsset(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePairExpiries}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Save Pair Expiries
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add New Pair */}
      {isAddingNewPairModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 rounded-xl">
                  <Plus className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Add Custom Trading Pair
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingNewPairModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewPair} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Pair Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. ADA / USDT (Cardano)"
                  value={newPairForm.pair}
                  onChange={(e) => setNewPairForm({ ...newPairForm, pair: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">TradingView / Binance Symbol</label>
                <input
                  type="text"
                  placeholder="e.g. BINANCE:ADAUSDT or FX:GBPUSD"
                  value={newPairForm.symbol}
                  onChange={(e) => setNewPairForm({ ...newPairForm, symbol: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={newPairForm.category}
                    onChange={(e) => setNewPairForm({ ...newPairForm, category: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Base / Initial Price</label>
                  <input
                    type="number"
                    step="any"
                    value={newPairForm.basePrice}
                    onChange={(e) => setNewPairForm({ ...newPairForm, basePrice: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Decimals</label>
                  <input
                    type="number"
                    value={newPairForm.decimals}
                    onChange={(e) => setNewPairForm({ ...newPairForm, decimals: Number(e.target.value) })}
                    min="0"
                    max="8"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Prot Payout (%)</label>
                  <input
                    type="number"
                    value={newPairForm.protectedPayoutPercentage}
                    onChange={(e) => setNewPairForm({ ...newPairForm, protectedPayoutPercentage: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Std Payout (%)</label>
                  <input
                    type="number"
                    value={newPairForm.standardPayoutPercentage}
                    onChange={(e) => setNewPairForm({ ...newPairForm, standardPayoutPercentage: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddingNewPairModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md"
                >
                  Create Pair
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Category Name */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl relative">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
              Rename Category #{editingCategory.oldName}
            </h4>
            <input
              type="text"
              value={editingCategory.newName}
              onChange={(e) => setEditingCategory({ ...editingCategory, newName: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-bold mb-3"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateCategoryName}
                className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Update Name
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Edit Duration Seconds */}
      {editingDurationIndex && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl relative">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
              Edit Duration Seconds
            </h4>
            <input
              type="number"
              value={editingDurationIndex.val}
              onChange={(e) => setEditingDurationIndex({ ...editingDurationIndex, val: Number(e.target.value) })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-bold mb-3"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingDurationIndex(null)}
                className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const current = getActiveDurations(editingDurationIndex.mode);
                  const updated = [...current];
                  updated[editingDurationIndex.index] = Number(editingDurationIndex.val);
                  const sorted = Array.from(new Set(updated)).sort((a, b) => a - b);
                  try {
                    if (editingDurationIndex.mode === "global") {
                      await saveSoloTradingConfig({ allowedDurations: sorted });
                    } else if (editingDurationIndex.mode === "protected") {
                      await saveSoloTradingConfig({ protectedAllowedDurations: sorted });
                    } else {
                      await saveSoloTradingConfig({ standardAllowedDurations: sorted });
                    }
                    onTriggerNotification?.("Duration updated!", "success");
                    setEditingDurationIndex(null);
                  } catch (err: any) {
                    onTriggerNotification?.(err.message || "Failed to update", "error");
                  }
                }}
                className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
