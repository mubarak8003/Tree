import React from "react";
import { X, Trash2, Check, Palette, Eye, Type } from "lucide-react";
import { DrawingObject, DrawingStyle } from "../../types/chart";

interface DrawingSettingsModalProps {
  drawing: DrawingObject | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStyle: (style: Partial<DrawingStyle>) => void;
  onDelete: (id: string) => void;
}

const PRESET_COLORS = [
  "#38bdf8", // Sky blue
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#eab308", // Yellow
  "#f97316", // Orange
  "#ef4444", // Red
  "#ec4899", // Pink
  "#a855f7", // Purple
  "#ffffff", // White
  "#64748b"  // Slate
];

export const DrawingSettingsModal: React.FC<DrawingSettingsModalProps> = ({
  drawing,
  isOpen,
  onClose,
  onUpdateStyle,
  onDelete
}) => {
  if (!isOpen || !drawing) return null;

  const style = drawing.style;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-800 dark:text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-sky-500 dark:text-sky-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white capitalize">
              {drawing.type.replace("_", " ")} Style
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Settings */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar text-xs">
          {/* Color Presets */}
          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1.5">Line Color</label>
            <div className="grid grid-cols-5 gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onUpdateStyle({ color: c })}
                  style={{ backgroundColor: c }}
                  className={`h-7 rounded-md border flex items-center justify-center transition-transform hover:scale-105 ${
                    style.color === c ? "border-sky-500 ring-2 ring-sky-500/50 scale-105" : "border-slate-300 dark:border-slate-700"
                  }`}
                >
                  {style.color === c && (
                    <Check className={`w-3.5 h-3.5 ${c === "#ffffff" ? "text-slate-900" : "text-white"}`} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Line Width */}
          <div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium mb-1.5">
              <span>Line Thickness</span>
              <span className="text-sky-600 dark:text-sky-400 font-bold">{style.lineWidth || 2}px</span>
            </div>
            <input
              type="range"
              min="1"
              max="6"
              step="1"
              value={style.lineWidth || 2}
              onChange={(e) => onUpdateStyle({ lineWidth: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>

          {/* Line Style */}
          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1.5">Line Style</label>
            <div className="grid grid-cols-3 gap-2">
              {(["solid", "dashed", "dotted"] as const).map((pattern) => (
                <button
                  key={pattern}
                  type="button"
                  onClick={() => onUpdateStyle({ lineStyle: pattern })}
                  className={`py-1.5 px-3 rounded-lg border text-center capitalize font-medium transition-all ${
                    style.lineStyle === pattern
                      ? "bg-sky-500/15 border-sky-500 text-sky-700 dark:text-sky-300 font-bold"
                      : "bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {pattern}
                </button>
              ))}
            </div>
          </div>

          {/* Opacity */}
          <div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium mb-1.5">
              <span>Opacity</span>
              <span className="text-sky-600 dark:text-sky-400 font-bold">{Math.round((style.opacity ?? 1) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={style.opacity ?? 1}
              onChange={(e) => onUpdateStyle({ opacity: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>

          {/* Extension for trend lines */}
          {(drawing.type === "trend_line" || drawing.type === "ray") && (
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!style.extendLeft}
                  onChange={(e) => onUpdateStyle({ extendLeft: e.target.checked })}
                  className="rounded border-slate-300 dark:border-slate-700 text-sky-500 focus:ring-sky-500/30"
                />
                <span className="text-slate-700 dark:text-slate-300">Extend Line Left</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!style.extendRight}
                  onChange={(e) => onUpdateStyle({ extendRight: e.target.checked })}
                  className="rounded border-slate-300 dark:border-slate-700 text-sky-500 focus:ring-sky-500/30"
                />
                <span className="text-slate-700 dark:text-slate-300">Extend Line Right</span>
              </label>
            </div>
          )}

          {/* Toggle for Horizontal Line Price Tag */}
          {drawing.type === "horizontal_line" && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!style.showPriceLabel}
                  onChange={(e) => onUpdateStyle({ showPriceLabel: e.target.checked })}
                  className="rounded border-slate-300 dark:border-slate-700 text-sky-500 focus:ring-sky-500/30"
                />
                <span className="text-slate-700 dark:text-slate-300">Show Price Badge on Axis</span>
              </label>
            </div>
          )}

          {/* Text Input for text drawings */}
          {drawing.type === "text" && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <label className="block text-slate-600 dark:text-slate-400 font-medium">Text Content</label>
              <input
                type="text"
                value={style.text || ""}
                onChange={(e) => onUpdateStyle({ text: e.target.value })}
                placeholder="Enter note or label..."
                className="w-full px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
              />

              <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium pt-1">
                <span>Font Size</span>
                <span className="text-sky-600 dark:text-sky-400 font-bold">{style.fontSize || 12}px</span>
              </div>
              <input
                type="range"
                min="10"
                max="24"
                step="1"
                value={style.fontSize || 12}
                onChange={(e) => onUpdateStyle({ fontSize: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={() => {
              onDelete(drawing.id);
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 hover:text-rose-500 text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-sky-500 text-white hover:bg-sky-600 text-xs font-semibold transition-colors shadow-lg shadow-sky-500/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
