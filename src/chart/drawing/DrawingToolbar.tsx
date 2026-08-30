import React from "react";
import {
  TrendingUp,
  Minus,
  Trash2
} from "lucide-react";
import { DrawingToolType } from "../../types/chart";

interface DrawingToolbarProps {
  activeTool: DrawingToolType;
  onSelectTool: (tool: DrawingToolType) => void;
  onDeleteSelected?: () => void;
  onDeleteAll: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  hasSelectedDrawing?: boolean;
  drawingsCount?: number;
  isMobile?: boolean;
}

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  activeTool,
  onSelectTool,
  onDeleteAll,
  drawingsCount = 0,
  isMobile = false
}) => {
  return (
    <div
      className={`select-none ${
        isMobile
          ? "inline-flex items-center gap-1 p-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-800 shadow-md text-slate-700 dark:text-slate-300 w-auto"
          : "flex flex-col items-center py-2 px-1.5 bg-slate-50/95 dark:bg-slate-900/90 border-r border-slate-200 dark:border-slate-800 gap-1.5 text-slate-600 dark:text-slate-400 w-11 shrink-0 z-20 relative"
      }`}
    >
      {/* 1. Trend Line */}
      <button
        type="button"
        title={activeTool === "trend_line" ? "Trend Line (Active - Click to deselect)" : "Trend Line"}
        onClick={() => onSelectTool(activeTool === "trend_line" ? "cursor" : "trend_line")}
        className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all relative group cursor-pointer ${
          activeTool === "trend_line"
            ? "bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/50 shadow-xs"
            : "hover:bg-slate-200/80 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
        }`}
      >
        <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        {!isMobile && (
          <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white whitespace-nowrap z-50 shadow-lg font-sans">
            Trend Line
          </span>
        )}
      </button>

      {/* 2. Horizontal Line */}
      <button
        type="button"
        title={activeTool === "horizontal_line" ? "Horizontal Line (Active - Click to deselect)" : "Horizontal Line"}
        onClick={() => onSelectTool(activeTool === "horizontal_line" ? "cursor" : "horizontal_line")}
        className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all relative group cursor-pointer ${
          activeTool === "horizontal_line"
            ? "bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/50 shadow-xs"
            : "hover:bg-slate-200/80 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
        }`}
      >
        <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        {!isMobile && (
          <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white whitespace-nowrap z-50 shadow-lg font-sans">
            Horizontal Line
          </span>
        )}
      </button>

      {/* 3. Clear All Drawings */}
      <button
        type="button"
        title="Delete All Drawings"
        onClick={() => {
          onDeleteAll();
        }}
        className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 text-slate-500 dark:text-slate-400 transition-colors relative group cursor-pointer active:scale-90"
      >
        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        {!isMobile && (
          <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block px-2 py-1 bg-rose-950/90 border border-rose-800/80 rounded text-xs text-rose-200 whitespace-nowrap z-50 shadow-lg font-sans">
            Delete All Drawings
          </span>
        )}
      </button>
    </div>
  );
};

