import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Sliders,
  RotateCcw,
  Activity,
  TrendingUp,
  BarChart2,
  Zap,
  Layers,
  Check,
  ChevronRight
} from "lucide-react";
import { IndicatorConfig, IndicatorType } from "../../types/chart";
import { DEFAULT_INDICATOR_CONFIGS } from "./calculator";

interface IndicatorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  indicators: IndicatorConfig[];
  onAddIndicator: (type: IndicatorType, presetParams?: Record<string, any>) => void;
  onUpdateIndicator: (config: IndicatorConfig) => void;
  onRemoveIndicator: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onResetIndicator: (id: string) => void;
}

type TabType = "explore" | "active";

const CATEGORIES = [
  {
    name: "Trend",
    icon: TrendingUp,
    color: "text-blue-400",
    items: [
      {
        type: "EMA" as IndicatorType,
        name: "EMA (Exponential Moving Average)",
        desc: "Fast responsive moving average weighting recent prices",
        presets: [
          { label: "EMA 9", params: { period: 9 } },
          { label: "EMA 20", params: { period: 20 } },
          { label: "EMA 50", params: { period: 50 } },
          { label: "EMA 100", params: { period: 100 } },
          { label: "EMA 200", params: { period: 200 } }
        ]
      },
      {
        type: "SMA" as IndicatorType,
        name: "SMA (Simple Moving Average)",
        desc: "Arithmetic average of price over given period",
        presets: [
          { label: "SMA 9", params: { period: 9 } },
          { label: "SMA 20", params: { period: 20 } },
          { label: "SMA 50", params: { period: 50 } },
          { label: "SMA 100", params: { period: 100 } },
          { label: "SMA 200", params: { period: 200 } }
        ]
      },
      {
        type: "VWAP" as IndicatorType,
        name: "VWAP (Volume Weighted Average Price)",
        desc: "Benchmark giving average price security traded at throughout day"
      },
      {
        type: "Supertrend" as IndicatorType,
        name: "Supertrend Indicator",
        desc: "ATR-based trend-following overlay with dynamic stop bands"
      }
    ]
  },
  {
    name: "Momentum",
    icon: Zap,
    color: "text-amber-400",
    items: [
      {
        type: "RSI" as IndicatorType,
        name: "RSI (Relative Strength Index)",
        desc: "Measures speed and change of price movements (0-100)"
      },
      {
        type: "MACD" as IndicatorType,
        name: "MACD (Moving Average Convergence Divergence)",
        desc: "Trend-following momentum indicator showing relationship between two EMAs"
      },
      {
        type: "Stochastic" as IndicatorType,
        name: "Stochastic Oscillator",
        desc: "Compares a particular closing price to a range of its prices over time"
      },
      {
        type: "CCI" as IndicatorType,
        name: "CCI (Commodity Channel Index)",
        desc: "Identifies cyclical turns in price movements"
      },
      {
        type: "ADX" as IndicatorType,
        name: "ADX (Average Directional Index)",
        desc: "Determines market trend strength irrespective of direction"
      }
    ]
  },
  {
    name: "Volatility",
    icon: Activity,
    color: "text-emerald-400",
    items: [
      {
        type: "BollingerBands" as IndicatorType,
        name: "Bollinger Bands",
        desc: "Volatility bands placed above and below a moving average"
      },
      {
        type: "ATR" as IndicatorType,
        name: "ATR (Average True Range)",
        desc: "Measures market volatility over a specified number of periods"
      }
    ]
  },
  {
    name: "Volume",
    icon: BarChart2,
    color: "text-purple-400",
    items: [
      {
        type: "Volume" as IndicatorType,
        name: "Volume Histogram",
        desc: "Number of units traded in a specified timeframe"
      },
      {
        type: "OBV" as IndicatorType,
        name: "OBV (On-Balance Volume)",
        desc: "Uses volume flow to predict changes in stock price"
      }
    ]
  }
];

interface ParamInputFieldProps {
  val: number | string;
  paramKey: string;
  onChange: (val: number) => void;
}

const ParamInputField: React.FC<ParamInputFieldProps> = ({ val, paramKey, onChange }) => {
  const [localStr, setLocalStr] = useState<string>(String(val ?? ""));

  useEffect(() => {
    setLocalStr(String(val ?? ""));
  }, [val]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalStr(raw);

    // Allow user to empty the input or type negative sign without forcing 0
    if (raw.trim() === "" || raw === "-") {
      return;
    }

    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    const trimmed = localStr.trim();
    if (trimmed === "" || trimmed === "-" || isNaN(parseFloat(trimmed))) {
      let fallback = typeof val === "number" && val !== 0 ? val : 14;
      if (paramKey.toLowerCase().includes("overbought")) fallback = 100;
      if (paramKey.toLowerCase().includes("oversold")) fallback = -100;
      if (paramKey.toLowerCase().includes("stddev")) fallback = 2;
      setLocalStr(String(fallback));
      onChange(fallback);
    } else {
      const parsed = parseFloat(trimmed);
      onChange(parsed);
      setLocalStr(String(parsed));
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={localStr}
      onFocus={(e) => e.target.select()}
      onChange={handleChange}
      onBlur={handleBlur}
      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 font-mono transition-colors"
      placeholder="Enter value"
    />
  );
};

export const IndicatorsModal: React.FC<IndicatorsModalProps> = ({
  isOpen,
  onClose,
  indicators,
  onAddIndicator,
  onUpdateIndicator,
  onRemoveIndicator,
  onToggleVisibility,
  onResetIndicator
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("explore");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  if (!isOpen) return null;

  const editingIndicator = indicators.find((ind) => ind.id === editingId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-slate-800 dark:text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Indicators & Strategies</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono font-bold border border-emerald-500/30">
                  Global Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Applied automatically across all assets & timeframes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-5 border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-950/40 text-xs font-semibold">
          <button
            onClick={() => {
              setActiveTab("explore");
              setEditingId(null);
            }}
            className={`py-3 px-4 border-b-2 transition-colors ${
              activeTab === "explore" && !editingId
                ? "border-sky-500 text-sky-600 dark:text-sky-400 font-bold"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Explore Library
          </button>
          <button
            onClick={() => setActiveTab("active")}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "active" || editingId
                ? "border-sky-500 text-sky-600 dark:text-sky-400 font-bold"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <span>Active Indicators</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] text-sky-600 dark:text-sky-300 font-bold">
              {indicators.length}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
          {editingIndicator ? (
            /* Editing Sub-View */
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{editingIndicator.name} Settings</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-700 dark:text-sky-300 font-mono font-bold">
                      {editingIndicator.isOverlay ? "OVERLAY" : "PANEL"}
                    </span>
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onResetIndicator(editingIndicator.id)}
                    className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset Defaults
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 px-3 py-1 rounded bg-sky-500/10 border border-sky-500/30 font-semibold"
                  >
                    Back to List
                  </button>
                </div>
              </div>

              {/* Dynamic Parameter Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(editingIndicator.params).map(([key, val]) => (
                  <div key={key} className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 capitalize">
                      {key.replace(/([A-Z])/g, " $1")}
                    </label>
                    {key === "source" ? (
                      <select
                        value={val}
                        onChange={(e) =>
                          onUpdateIndicator({
                            ...editingIndicator,
                            params: { ...editingIndicator.params, [key]: e.target.value }
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                      >
                        <option value="close">Close</option>
                        <option value="open">Open</option>
                        <option value="high">High</option>
                        <option value="low">Low</option>
                        <option value="hl2">(High + Low) / 2</option>
                        <option value="hlc3">(High + Low + Close) / 3</option>
                        <option value="ohlc4">(Open + High + Low + Close) / 4</option>
                      </select>
                    ) : (
                      <ParamInputField
                        val={val}
                        paramKey={key}
                        onChange={(newVal) =>
                          onUpdateIndicator({
                            ...editingIndicator,
                            params: { ...editingIndicator.params, [key]: newVal }
                          })
                        }
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Color and Styles */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Style & Visuals</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(editingIndicator.styles).map(([plotKey, style]) => (
                    <div key={plotKey} className="p-3 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-800 dark:text-slate-300 font-medium capitalize">
                        <span>{plotKey} Line</span>
                        <input
                          type="color"
                          value={style.color || "#38bdf8"}
                          onChange={(e) =>
                            onUpdateIndicator({
                              ...editingIndicator,
                              styles: {
                                ...editingIndicator.styles,
                                [plotKey]: { ...style, color: e.target.value }
                              }
                            })
                          }
                          className="w-7 h-7 rounded border border-slate-300 dark:border-slate-600 bg-transparent cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Thickness</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((width) => (
                            <button
                              key={width}
                              type="button"
                              onClick={() =>
                                onUpdateIndicator({
                                  ...editingIndicator,
                                  styles: {
                                    ...editingIndicator.styles,
                                    [plotKey]: { ...style, lineWidth: width }
                                  }
                                })
                              }
                              className={`w-6 h-6 rounded text-xs flex items-center justify-center font-bold ${
                                (style.lineWidth || 2) === width
                                  ? "bg-sky-500 text-white"
                                  : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
                              }`}
                            >
                              {width}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTab === "active" ? (
            /* Active Indicators View */
            <div className="space-y-3">
              {indicators.length === 0 ? (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                  <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No indicators added yet.</p>
                  <button
                    onClick={() => setActiveTab("explore")}
                    className="mt-3 px-4 py-1.5 rounded-lg bg-sky-500 text-white text-xs font-semibold hover:bg-sky-600 transition-colors cursor-pointer"
                  >
                    Explore Library
                  </button>
                </div>
              ) : (
                indicators.map((ind) => (
                  <div
                    key={ind.id}
                    className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onToggleVisibility(ind.id)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          ind.visible ? "text-sky-600 dark:text-sky-400 bg-sky-500/10" : "text-slate-400 bg-slate-200 dark:bg-slate-800"
                        }`}
                      >
                        {ind.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white">{ind.name}</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          {Object.entries(ind.params)
                            .map(([k, v]) => `${k}:${v}`)
                            .join(", ")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingId(ind.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                        title="Configure"
                      >
                        <Sliders className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveIndicator(ind.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Explore Library View */
            <div className="space-y-6">
              {/* Search */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search indicator by name (EMA, RSI, MACD, Bollinger...)"
                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />

              {CATEGORIES.map((cat) => {
                const filteredItems = cat.items.filter((item) =>
                  item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  cat.name.toLowerCase().includes(searchQuery.toLowerCase())
                );

                if (filteredItems.length === 0) return null;

                const CatIcon = cat.icon;

                return (
                  <div key={cat.name} className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <CatIcon className={`w-3.5 h-3.5 ${cat.color}`} />
                      <span>{cat.name}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {filteredItems.map((item) => (
                        <div
                          key={item.name}
                          className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl flex flex-col justify-between gap-2.5 transition-all"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white">{item.name}</h4>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                              {item.desc}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800/60">
                            {item.presets ? (
                              <div className="flex gap-1 flex-wrap">
                                {item.presets.map((p) => (
                                  <button
                                    key={p.label}
                                    type="button"
                                    onClick={() => {
                                      onAddIndicator(item.type, p.params);
                                      setActiveTab("active");
                                    }}
                                    className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 hover:bg-sky-500/20 hover:text-sky-600 dark:hover:text-sky-300 text-[10px] font-mono border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                                  >
                                    {p.label}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Default Settings</span>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                onAddIndicator(item.type);
                                setActiveTab("active");
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/15 dark:bg-sky-500/20 border border-sky-500/30 text-sky-700 dark:text-sky-300 hover:bg-sky-500 hover:text-white text-xs font-semibold transition-all ml-auto cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              Add
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-sky-500 text-white hover:bg-sky-600 text-xs font-semibold transition-colors shadow-lg shadow-sky-500/20 cursor-pointer"
          >
            Apply to Chart
          </button>
        </div>
      </div>
    </div>
  );
};
