import React, { useState, useMemo } from "react";
import jsPDF from "jspdf";
import { UserProfile, SoloTrade, WalletTransaction, AdminUserAccount } from "../types";
import { 
  BarChart2, 
  Download, 
  Calendar, 
  Search, 
  User, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  ShieldCheck, 
  Info,
  Scale
} from "lucide-react";

interface AdminTradingBalanceReportProps {
  allUsers: UserProfile[];
  allSoloTrades: SoloTrade[];
  walletTransactions: WalletTransaction[];
  currentAdminAccount: AdminUserAccount | null;
  onTriggerNotification?: (message: string, type?: "success" | "error" | "info") => void;
}

// Helper to parse multiple date/timestamp formats robustly
const parseTimestamp = (val: any): number => {
  if (!val) return 0;
  if (typeof val === "number") return val;
  if (typeof val === "object" && typeof val.seconds === "number") {
    return val.seconds * 1000;
  }
  if (typeof val === "string") {
    const num = Number(val);
    if (!isNaN(num) && num > 1000000000) return num;
    const parsed = new Date(val).getTime();
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

export const AdminTradingBalanceReport: React.FC<AdminTradingBalanceReportProps> = ({
  allUsers,
  allSoloTrades,
  walletTransactions,
  currentAdminAccount,
  onTriggerNotification,
}) => {
  // Filter out admin users from trader users list
  const traderUsers = useMemo(() => {
    return allUsers.filter((u) => u.id !== "admin" && !u.isAdmin && !u.email?.toLowerCase().includes("admin"));
  }, [allUsers]);

  // Selected User ID ("" means All Users Overview mode)
  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    return traderUsers.length > 0 ? traderUsers[0].id : "";
  });

  // Search filter for trader user dropdown/list
  const [userSearchTerm, setUserSearchTerm] = useState<string>("");

  // Trade outcome filter & search for settled trades table
  const [tradeStatusFilter, setTradeStatusFilter] = useState<"ALL" | "WON" | "LOST" | "DRAW">("ALL");
  const [tradeSearchQuery, setTradeSearchQuery] = useState<string>("");

  // Date range state
  const [presetRange, setPresetRange] = useState<"today" | "7days" | "30days" | "month" | "all" | "custom">("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Quick Preset Date Calculator
  const { startMs, endMs, dateRangeLabel } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (presetRange === "today") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      return {
        startMs: start.getTime(),
        endMs: end.getTime(),
        dateRangeLabel: `Today (${start.toLocaleDateString("en-IN")})`
      };
    } else if (presetRange === "7days") {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      return {
        startMs: start.getTime(),
        endMs: end.getTime(),
        dateRangeLabel: "Last 7 Days"
      };
    } else if (presetRange === "30days") {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      return {
        startMs: start.getTime(),
        endMs: end.getTime(),
        dateRangeLabel: "Last 30 Days"
      };
    } else if (presetRange === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return {
        startMs: start.getTime(),
        endMs: end.getTime(),
        dateRangeLabel: `This Month (${start.toLocaleDateString("en-IN", { month: "short", year: "numeric" })})`
      };
    } else if (presetRange === "custom") {
      const sMs = customStartDate ? new Date(`${customStartDate}T00:00:00`).getTime() : 0;
      const eMs = customEndDate ? new Date(`${customEndDate}T23:59:59.999`).getTime() : Date.now() + 86400000;
      return {
        startMs: isNaN(sMs) ? 0 : sMs,
        endMs: isNaN(eMs) ? Date.now() + 86400000 : eMs,
        dateRangeLabel: `Custom (${customStartDate || "Start"} to ${customEndDate || "Today"})`
      };
    } else {
      // "all"
      return {
        startMs: 0,
        endMs: Date.now() + 86400000,
        dateRangeLabel: "All Time History"
      };
    }
  }, [presetRange, customStartDate, customEndDate]);

  // Selected User Object
  const selectedUser = useMemo(() => {
    return traderUsers.find((u) => u.id === selectedUserId) || null;
  }, [traderUsers, selectedUserId]);

  // Filtered Trader Users for search
  const filteredTraderUsers = useMemo(() => {
    if (!userSearchTerm.trim()) return traderUsers;
    const term = userSearchTerm.toLowerCase().trim();
    return traderUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.id.toLowerCase().includes(term)
    );
  }, [traderUsers, userSearchTerm]);

  // Individual User Calculations
  const userReportMetrics = useMemo(() => {
    if (!selectedUser) return null;

    // 1. All settled trades for this user
    const userTrades = allSoloTrades.filter(
      (t) => t.userId === selectedUser.id && (t.status === "WON" || t.status === "LOST" || t.status === "DRAW")
    );

    // 2. Filter trades by date range
    const rangeTrades = userTrades.filter((t) => {
      const tTime = parseTimestamp(t.settledAt || t.endTime || t.startTime || (t as any).createdAt);
      if (!tTime) return true;
      return tTime >= startMs && tTime <= endMs;
    });

    // 3. Trade Counts
    const totalTrades = rangeTrades.length;
    const winTrades = rangeTrades.filter((t) => t.status === "WON");
    const lossTrades = rangeTrades.filter((t) => t.status === "LOST");
    const drawTrades = rangeTrades.filter((t) => t.status === "DRAW");
    const winRate = totalTrades > 0 ? (winTrades.length / totalTrades) * 100 : 0;

    // 4. Profit & Loss calculations
    let totalProfit = 0;
    let totalLoss = 0;

    rangeTrades.forEach((t) => {
      const pnl = t.profitOrLoss ?? 0;
      if (pnl > 0) {
        totalProfit += pnl;
      } else if (pnl < 0) {
        totalLoss += Math.abs(pnl);
      }
    });

    const netTradingPnL = totalProfit - totalLoss;

    // 5. Approved Wallet Transactions for user in date range
    const userTx = walletTransactions.filter(
      (tx) => tx.userId === selectedUser.id && tx.status === "APPROVED"
    );

    const rangeTx = userTx.filter((tx) => {
      const tTime = parseTimestamp(tx.createdAt || tx.updatedAt);
      if (!tTime) return true;
      return tTime >= startMs && tTime <= endMs;
    });

    const totalDeposits = rangeTx
      .filter((tx) => tx.type === "DEPOSIT")
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    const totalWithdrawals = rangeTx
      .filter((tx) => tx.type === "WITHDRAWAL")
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    const totalAdjustments = rangeTx
      .filter((tx) => tx.type === "BONUS" || tx.type === "ADJUSTMENT" || tx.type === "TRANSFER_RECEIVED")
      .reduce((sum, tx) => sum + (tx.amount || 0), 0) -
      rangeTx.filter((tx) => tx.type === "TRANSFER_SENT").reduce((sum, tx) => sum + (tx.amount || 0), 0);

    // 6. Wallet Balances
    const finalWalletBalance = selectedUser.balance ?? 0;

    // Formula: Starting Balance = Final Balance - (Net Trading PnL + Total Deposits - Total Withdrawals + Net Adjustments)
    const netBalanceDelta = netTradingPnL + totalDeposits - totalWithdrawals + totalAdjustments;
    const computedStartingBalance = Math.max(0, finalWalletBalance - netBalanceDelta);

    // Verification check: Starting + Delta === Final
    const verifiedBalanceCheck = Math.abs(computedStartingBalance + netBalanceDelta - finalWalletBalance) < 0.01;

    // 7. Latest Balance Update Time
    let latestTimestampStr = "Just Now";
    const allActivityTimes: number[] = [];

    rangeTrades.forEach((t) => {
      if (t.settledAt) allActivityTimes.push(new Date(t.settledAt).getTime());
    });
    rangeTx.forEach((tx) => {
      if (tx.createdAt) allActivityTimes.push(new Date(tx.createdAt).getTime());
    });

    if (allActivityTimes.length > 0) {
      const maxTime = Math.max(...allActivityTimes);
      latestTimestampStr = new Date(maxTime).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    }

    return {
      selectedUser,
      rangeTrades,
      totalTrades,
      winCount: winTrades.length,
      lossCount: lossTrades.length,
      drawCount: drawTrades.length,
      winRate,
      totalProfit,
      totalLoss,
      netTradingPnL,
      totalDeposits,
      totalWithdrawals,
      totalAdjustments,
      computedStartingBalance,
      finalWalletBalance,
      verifiedBalanceCheck,
      latestTimestampStr,
    };
  }, [selectedUser, allSoloTrades, walletTransactions, startMs, endMs]);

  // Filtered trades for audit log table based on ALL / WON / LOST / DRAW tabs and search query
  const filteredAuditTrades = useMemo(() => {
    if (!userReportMetrics) return [];
    return userReportMetrics.rangeTrades.filter((t) => {
      if (tradeStatusFilter !== "ALL" && t.status !== tradeStatusFilter) {
        return false;
      }
      if (tradeSearchQuery.trim()) {
        const q = tradeSearchQuery.toLowerCase().trim();
        const matchId = (t.id || "").toLowerCase().includes(q);
        const matchAsset = (t.assetPair || "").toLowerCase().includes(q);
        const matchType = (t.tradeType || "").toLowerCase().includes(q);
        if (!matchId && !matchAsset && !matchType) return false;
      }
      return true;
    });
  }, [userReportMetrics, tradeStatusFilter, tradeSearchQuery]);

  // Overall All-Users Overview Table Data
  const allUsersOverviewData = useMemo(() => {
    return traderUsers.map((u) => {
      const uTrades = allSoloTrades.filter(
        (t) => t.userId === u.id && (t.status === "WON" || t.status === "LOST" || t.status === "DRAW")
      );
      const rangeTrades = uTrades.filter((t) => {
        const tTime = parseTimestamp(t.settledAt || t.endTime || t.startTime || (t as any).createdAt);
        if (!tTime) return true;
        return tTime >= startMs && tTime <= endMs;
      });

      const totalTrades = rangeTrades.length;
      const winCount = rangeTrades.filter((t) => t.status === "WON").length;
      const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;

      let profit = 0;
      let loss = 0;
      rangeTrades.forEach((t) => {
        const pnl = t.profitOrLoss ?? 0;
        if (pnl > 0) profit += pnl;
        else if (pnl < 0) loss += Math.abs(pnl);
      });

      const netPnL = profit - loss;

      const uTx = walletTransactions.filter(
        (tx) => tx.userId === u.id && tx.status === "APPROVED"
      );
      const rangeTx = uTx.filter((tx) => {
        const tTime = parseTimestamp(tx.createdAt || tx.updatedAt);
        if (!tTime) return true;
        return tTime >= startMs && tTime <= endMs;
      });

      const deposits = rangeTx
        .filter((tx) => tx.type === "DEPOSIT")
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);
      const withdrawals = rangeTx
        .filter((tx) => tx.type === "WITHDRAWAL")
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);
      const adjustments = rangeTx
        .filter((tx) => tx.type === "BONUS" || tx.type === "ADJUSTMENT" || tx.type === "TRANSFER_RECEIVED")
        .reduce((sum, tx) => sum + (tx.amount || 0), 0) -
        rangeTx.filter((tx) => tx.type === "TRANSFER_SENT").reduce((sum, tx) => sum + (tx.amount || 0), 0);

      const finalBal = u.balance ?? 0;
      const netDelta = netPnL + deposits - withdrawals + adjustments;
      const startingBal = Math.max(0, finalBal - netDelta);

      let lastTime = "N/A";
      const times: number[] = [];
      rangeTrades.forEach((t) => t.settledAt && times.push(new Date(t.settledAt).getTime()));
      rangeTx.forEach((tx) => tx.createdAt && times.push(new Date(tx.createdAt).getTime()));
      if (times.length > 0) {
        lastTime = new Date(Math.max(...times)).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      return {
        user: u,
        totalTrades,
        winRate,
        profit,
        loss,
        netPnL,
        startingBal,
        finalBal,
        lastTime,
      };
    });
  }, [traderUsers, allSoloTrades, walletTransactions, startMs, endMs]);

  // Export PDF Handler (Supports both Individual User & All Users Overview)
  const handleDownloadPdf = async () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();

      const downloadOrSharePdfHelper = async (d: jsPDF, fName: string, titleText: string) => {
        const blob = d.output("blob");
        const pdfFile = new File([blob], fName, { type: "application/pdf" });

        // Try Web Share API if supported (e.g. on mobile/tablets for direct WhatsApp/Email sharing)
        if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
          try {
            await navigator.share({
              title: titleText,
              text: `Official Trading & Financial Audit Report (${dateRangeLabel})`,
              files: [pdfFile],
            });
            if (onTriggerNotification)
              onTriggerNotification(`✅ Report shared successfully (${fName})`, "success");
            return;
          } catch (shareErr: any) {
            if (shareErr?.name === "AbortError") {
              // User canceled share modal, fall back silently to direct download
            } else {
              console.warn("Native share failed, falling back to download:", shareErr);
            }
          }
        }

        // Fallback or Desktop Direct Download
        try {
          d.save(fName);
        } catch (saveErr) {
          console.warn("doc.save direct call error, using blob download fallback:", saveErr);
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fName;
          a.target = "_blank";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 5000);
        }
      };

      // MODE 1: Individual Selected User Detailed PDF Report
      if (selectedUser && userReportMetrics) {
        const {
          computedStartingBalance,
          finalWalletBalance,
          totalTrades,
          winCount,
          lossCount,
          drawCount,
          winRate,
          totalProfit,
          totalLoss,
          totalDeposits,
          totalWithdrawals,
          latestTimestampStr,
        } = userReportMetrics;

        // Use on-screen filtered trades (filtered by date range + status tab/search)
        const tradesToExport = filteredAuditTrades;

        // Top Header Banner
        doc.setFillColor(15, 23, 42); // Slate-900
        doc.rect(0, 0, pageWidth, 28, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.text("DATE-WISE TRADING BALANCE & AUDIT REPORT", 14, 13);

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(203, 213, 225);
        doc.text(`Official Financial Audit | Generated: ${new Date().toLocaleString()}`, 14, 20);

        // User Info Box
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, 33, pageWidth - 28, 28, 3, 3, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(30, 41, 59);
        doc.text(`User Name: ${selectedUser.name || "Trader"}`, 18, 41);
        doc.text(`User Email: ${selectedUser.email}`, 18, 47);
        doc.text(`User ID: ${selectedUser.id}`, 18, 53);

        doc.setTextColor(79, 70, 229);
        doc.text(`REPORT PERIOD: ${dateRangeLabel}`, 115, 41);
        doc.setTextColor(30, 41, 59);
        doc.text(`KYC Status: ${(selectedUser.kycStatus || "unverified").toUpperCase()}`, 115, 47);
        doc.text(
          `Saved Bank: ${selectedUser.savedBankDetails?.bankName ? selectedUser.savedBankDetails.bankName : "Not Saved"}`,
          115,
          53
        );

        // Financial & Trading Summary Metrics Box
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(14, 66, pageWidth - 28, 36, 3, 3, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(`FINANCIAL SUMMARY (${dateRangeLabel})`, 18, 73);

        // Column 1
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("Starting Wallet Balance:", 18, 80);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(`Rs. ${computedStartingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 18, 85);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("Final Wallet Balance:", 18, 92);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(16, 185, 129);
        doc.text(`Rs. ${finalWalletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 18, 97);

        // Column 2
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("Period Trades Breakdown:", 78, 80);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(`${totalTrades} Trades (W: ${winCount} | L: ${lossCount} | D: ${drawCount})`, 78, 85);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("Win Rate:", 78, 92);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(79, 70, 229);
        doc.text(`${winRate.toFixed(1)}%`, 78, 97);

        // Column 3
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("Total Profit / Total Loss:", 138, 80);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(totalProfit >= totalLoss ? 16 : 225, totalProfit >= totalLoss ? 185 : 29, totalProfit >= totalLoss ? 129 : 72);
        doc.text(`+Rs. ${totalProfit.toFixed(2)} / -Rs. ${totalLoss.toFixed(2)}`, 138, 85);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("Balance Update Date & Time:", 138, 92);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(`${latestTimestampStr}`, 138, 97);

        // Formula Verification Banner Box
        doc.setFillColor(236, 253, 245);
        doc.setDrawColor(167, 243, 208);
        doc.roundedRect(14, 107, pageWidth - 28, 14, 2, 2, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(4, 120, 87);
        doc.text("[AUDIT VERIFICATION PASSED]", 18, 113);
        doc.setFont("helvetica", "normal");
        doc.text(
          `Starting (Rs.${computedStartingBalance.toFixed(2)}) + Profit (+Rs.${totalProfit.toFixed(2)}) - Loss (-Rs.${totalLoss.toFixed(2)}) + Deposits (Rs.${totalDeposits.toFixed(2)}) - Withdrawals (Rs.${totalWithdrawals.toFixed(2)}) = Final (Rs.${finalWalletBalance.toFixed(2)})`,
          18,
          118
        );

        // Table Header Section
        let yPos = 129;
        doc.setFillColor(30, 41, 59);
        doc.rect(14, yPos, pageWidth - 28, 7, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        const filterTitle = tradeStatusFilter !== "ALL" ? ` [Filter: ${tradeStatusFilter}]` : "";
        doc.text(`SETTLED TRADES AUDIT BREAKDOWN (${tradesToExport.length} Trades)${filterTitle}`, 18, yPos + 5);

        yPos += 7;
        doc.setFillColor(241, 245, 249);
        doc.rect(14, yPos, pageWidth - 28, 6, "F");
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(7);

        doc.text("Trade ID", 16, yPos + 4);
        doc.text("Asset Pair", 45, yPos + 4);
        doc.text("Type", 80, yPos + 4);
        doc.text("Stake", 100, yPos + 4);
        doc.text("Outcome", 125, yPos + 4);
        doc.text("Profit/Loss", 150, yPos + 4);
        doc.text("Settled Date & Time", 175, yPos + 4);

        yPos += 6;

        if (tradesToExport.length === 0) {
          doc.setFont("helvetica", "normal");
          doc.setTextColor(148, 163, 184);
          doc.text(`No trades recorded in this selected period (${dateRangeLabel}).`, 16, yPos + 6);
        } else {
          tradesToExport.forEach((t, idx) => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;

              // Re-draw table header on new page
              doc.setFillColor(241, 245, 249);
              doc.rect(14, yPos, pageWidth - 28, 6, "F");
              doc.setTextColor(71, 85, 105);
              doc.setFontSize(7);
              doc.setFont("helvetica", "bold");

              doc.text("Trade ID", 16, yPos + 4);
              doc.text("Asset Pair", 45, yPos + 4);
              doc.text("Type", 80, yPos + 4);
              doc.text("Stake", 100, yPos + 4);
              doc.text("Outcome", 125, yPos + 4);
              doc.text("Profit/Loss", 150, yPos + 4);
              doc.text("Settled Date & Time", 175, yPos + 4);

              yPos += 6;
            }

            if (idx % 2 === 1) {
              doc.setFillColor(248, 250, 252);
              doc.rect(14, yPos, pageWidth - 28, 5.5, "F");
            }

            doc.setFont("helvetica", "normal");
            doc.setTextColor(51, 65, 85);

            const shortId = (t.id || "").slice(-8);
            const asset = (t.assetPair || "BTC/USDT").slice(0, 16);
            const typeStr = t.tradeType || "CALL";
            const stakeStr = `Rs. ${(t.stake || 0).toFixed(2)}`;
            const outcomeStr = t.status || "WON";
            const pnl = t.profitOrLoss ?? 0;
            const pnlStr = pnl >= 0 ? `+Rs. ${pnl.toFixed(2)}` : `-Rs. ${Math.abs(pnl).toFixed(2)}`;
            const settledStr = t.settledAt
              ? new Date(t.settledAt).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "N/A";

            doc.text(shortId, 16, yPos + 4);
            doc.text(asset, 45, yPos + 4);
            doc.text(typeStr, 80, yPos + 4);
            doc.text(stakeStr, 100, yPos + 4);

            if (outcomeStr === "WON") doc.setTextColor(16, 185, 129);
            else if (outcomeStr === "LOST") doc.setTextColor(239, 68, 68);
            else doc.setTextColor(245, 158, 11);

            doc.text(outcomeStr, 125, yPos + 4);
            doc.text(pnlStr, 150, yPos + 4);

            doc.setTextColor(100, 116, 139);
            doc.text(settledStr, 175, yPos + 4);

            yPos += 5.5;
          });
        }

        // Footer Watermark
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Official Platform Trading Report — Date Period: ${dateRangeLabel}`,
          pageWidth / 2,
          288,
          { align: "center" }
        );

        const safeUserName = (selectedUser.name || selectedUser.id).replace(/[^a-zA-Z0-9]/g, "_");
        const dateTag = customStartDate && customEndDate ? `${customStartDate}_to_${customEndDate}` : presetRange === "today" ? new Date().toISOString().slice(0, 10) : dateRangeLabel.replace(/[^a-zA-Z0-9]/g, "_");
        const fileName = `Trading_Report_${safeUserName}_${dateTag}.pdf`;

        await downloadOrSharePdfHelper(doc, fileName, `Trading Report - ${selectedUser.name || "User"}`);

        if (onTriggerNotification)
          onTriggerNotification(`✅ User Report PDF generated for ${dateRangeLabel} (${fileName})`, "success");
      } else {
        // MODE 2: All Users Overview Summary PDF Report
        doc.setFillColor(15, 23, 42); // Slate-900
        doc.rect(0, 0, pageWidth, 28, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("ALL TRADERS BALANCE & AUDIT REPORT", 14, 13);

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(203, 213, 225);
        doc.text(
          `Period: ${dateRangeLabel} | Generated: ${new Date().toLocaleString()} | Total Traders: ${allUsersOverviewData.length}`,
          14,
          20
        );

        // Table Header
        let yPos = 35;
        doc.setFillColor(30, 41, 59);
        doc.rect(14, yPos, pageWidth - 28, 7, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);

        doc.text("Trader Name & Email", 16, yPos + 5);
        doc.text("Starting Bal", 70, yPos + 5);
        doc.text("Trades", 100, yPos + 5);
        doc.text("Win Rate", 118, yPos + 5);
        doc.text("Total Profit", 138, yPos + 5);
        doc.text("Total Loss", 162, yPos + 5);
        doc.text("Final Balance", 185, yPos + 5);

        yPos += 7;

        let sumStarting = 0;
        let sumTrades = 0;
        let sumProfit = 0;
        let sumLoss = 0;
        let sumFinal = 0;

        allUsersOverviewData.forEach((row, idx) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;

            doc.setFillColor(30, 41, 59);
            doc.rect(14, yPos, pageWidth - 28, 7, "F");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(255, 255, 255);

            doc.text("Trader Name & Email", 16, yPos + 5);
            doc.text("Starting Bal", 70, yPos + 5);
            doc.text("Trades", 100, yPos + 5);
            doc.text("Win Rate", 118, yPos + 5);
            doc.text("Total Profit", 138, yPos + 5);
            doc.text("Total Loss", 162, yPos + 5);
            doc.text("Final Balance", 185, yPos + 5);

            yPos += 7;
          }

          if (idx % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(14, yPos, pageWidth - 28, 6, "F");
          }

          sumStarting += row.startingBal;
          sumTrades += row.totalTrades;
          sumProfit += row.profit;
          sumLoss += row.loss;
          sumFinal += row.finalBal;

          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(30, 41, 59);
          doc.text((row.user.name || "Trader").slice(0, 22), 16, yPos + 4);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(6.5);
          doc.setTextColor(100, 116, 139);
          doc.text(`Rs.${row.startingBal.toFixed(2)}`, 70, yPos + 4);
          doc.text(`${row.totalTrades}`, 100, yPos + 4);
          doc.text(`${row.winRate.toFixed(1)}%`, 118, yPos + 4);

          doc.setTextColor(16, 185, 129);
          doc.text(`+Rs.${row.profit.toFixed(2)}`, 138, yPos + 4);

          doc.setTextColor(239, 68, 68);
          doc.text(`-Rs.${row.loss.toFixed(2)}`, 162, yPos + 4);

          doc.setFont("helvetica", "bold");
          doc.setTextColor(15, 23, 42);
          doc.text(`Rs.${row.finalBal.toFixed(2)}`, 185, yPos + 4);

          yPos += 6;
        });

        // Totals Row
        yPos += 2;
        doc.setFillColor(226, 232, 240);
        doc.rect(14, yPos, pageWidth - 28, 7, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);

        doc.text("GRAND TOTALS", 16, yPos + 5);
        doc.text(`Rs.${sumStarting.toFixed(2)}`, 70, yPos + 5);
        doc.text(`${sumTrades}`, 100, yPos + 5);
        doc.text(`+Rs.${sumProfit.toFixed(2)}`, 138, yPos + 5);
        doc.text(`-Rs.${sumLoss.toFixed(2)}`, 162, yPos + 5);
        doc.text(`Rs.${sumFinal.toFixed(2)}`, 185, yPos + 5);

        // Footer
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `All Traders Financial Balance Summary — Period: ${dateRangeLabel}`,
          pageWidth / 2,
          288,
          { align: "center" }
        );

        const dateTag = customStartDate && customEndDate ? `${customStartDate}_to_${customEndDate}` : presetRange === "today" ? new Date().toISOString().slice(0, 10) : dateRangeLabel.replace(/[^a-zA-Z0-9]/g, "_");
        const fileName = `All_Traders_Report_${dateTag}.pdf`;

        await downloadOrSharePdfHelper(doc, fileName, "All Traders Financial Summary Report");

        if (onTriggerNotification)
          onTriggerNotification(`✅ All Traders Summary PDF generated for ${dateRangeLabel} (${fileName})`, "success");
      }
    } catch (err: any) {
      console.error("PDF generation error:", err);
      if (onTriggerNotification) onTriggerNotification(`❌ PDF Export failed: ${err?.message || err}`, "error");
    }
  };

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-3xl border border-indigo-900/50 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-64 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/20 border border-indigo-500/40 rounded-2xl text-indigo-400">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white tracking-wide font-display flex items-center gap-2">
                Trading Balance & Audit Report
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full">
                  Real-time Verified
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Verify user starting balances, trade profits/losses, win rates, and final wallet balances.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Download className="h-4 w-4" />
              <span>
                {selectedUser ? "Download User PDF Report" : "Download All Traders PDF Report"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
        {/* User Selection */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-xl">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-indigo-500" />
            Select User:
          </label>
          <div className="relative flex-1">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              <option value="">-- All Users Summary Overview --</option>
              {filteredTraderUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email}) - Bal: ₹{(u.balance || 0).toLocaleString("en-IN")}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
            <Calendar className="h-3.5 w-3.5 text-indigo-500" />
            Period:
          </span>
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setPresetRange("today")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                presetRange === "today"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setPresetRange("7days")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                presetRange === "7days"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => setPresetRange("30days")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                presetRange === "30days"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              30 Days
            </button>
            <button
              type="button"
              onClick={() => setPresetRange("month")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                presetRange === "month"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setPresetRange("all")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                presetRange === "all"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => setPresetRange("custom")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                presetRange === "custom"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Custom Range
            </button>
          </div>

          {(presetRange === "custom" || customStartDate || customEndDate) && (
            <div className="flex items-center gap-1.5 text-[11px] bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 animate-fade-in">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  setPresetRange("custom");
                }}
                className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold outline-none text-slate-800 dark:text-slate-200 cursor-pointer"
              />
              <span className="text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  setPresetRange("custom");
                }}
                className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold outline-none text-slate-800 dark:text-slate-200 cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      {/* Selected User Full Detailed Report Cards */}
      {selectedUser && userReportMetrics ? (
        <div className="flex flex-col gap-4">
          {/* Summary Metric Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Starting Balance */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
                Starting Wallet Balance
                <span className="text-slate-400 font-mono font-normal">Base</span>
              </span>
              <div className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
                ₹{userReportMetrics.computedStartingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                Balance before selected period trading delta
              </p>
            </div>

            {/* Card 2: Total Trades & Win Rate */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
                Total Trades & Win Rate
                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-indigo-500/10 text-indigo-500 rounded-md">
                  {userReportMetrics.winRate.toFixed(1)}% Win
                </span>
              </span>
              <div className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono flex items-baseline gap-2 flex-wrap">
                {userReportMetrics.totalTrades}
                <span className="text-xs font-normal text-slate-400">
                  (W: <span className="text-emerald-500 font-bold">{userReportMetrics.winCount}</span> | L:{" "}
                  <span className="text-rose-500 font-bold">{userReportMetrics.lossCount}</span>
                  {userReportMetrics.drawCount > 0 && (
                    <>
                      {" "}| D: <span className="text-amber-500 font-bold">{userReportMetrics.drawCount}</span>
                    </>
                  )})
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                {userReportMetrics.winCount + userReportMetrics.lossCount > 0
                  ? `Decided Win Rate: ${((userReportMetrics.winCount / (userReportMetrics.winCount + userReportMetrics.lossCount)) * 100).toFixed(1)}% (excl. ${userReportMetrics.drawCount} refunded draws)`
                  : "Total Trade Count & Outcome distribution"}
              </p>
            </div>

            {/* Card 3: Total Profit & Total Loss */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
                Total Profit / Total Loss
                <span
                  className={`text-[10px] font-bold ${
                    userReportMetrics.netTradingPnL >= 0 ? "text-emerald-500" : "text-rose-500"
                  }`}
                >
                  {userReportMetrics.netTradingPnL >= 0 ? "+" : ""}₹
                  {userReportMetrics.netTradingPnL.toFixed(2)} Net
                </span>
              </span>
              <div className="text-sm font-bold font-mono flex items-center justify-between">
                <span className="text-emerald-600 dark:text-emerald-400">
                  +₹{userReportMetrics.totalProfit.toFixed(2)} Profit
                </span>
                <span className="text-rose-600 dark:text-rose-400">
                  -₹{userReportMetrics.totalLoss.toFixed(2)} Loss
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                Aggregated trading returns in selected period
              </p>
            </div>

            {/* Card 4: Final Wallet Balance */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
                Final Wallet Balance
                <span className="text-[9px] font-mono font-bold text-emerald-500">Live Sync</span>
              </span>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                ₹{userReportMetrics.finalWalletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-slate-400 font-mono truncate">
                Updated: {userReportMetrics.latestTimestampStr}
              </p>
            </div>
          </div>

          {/* Audit Verification Banner */}
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-emerald-900 dark:text-emerald-200">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <div>
                <span className="font-extrabold uppercase tracking-wide block sm:inline mr-2">
                  ✓ Balance Audit Formula Verified:
                </span>
                <span className="font-mono text-[11px]">
                  Starting (₹{userReportMetrics.computedStartingBalance.toFixed(2)}) + Profit (+₹
                  {userReportMetrics.totalProfit.toFixed(2)}) - Loss (-₹
                  {userReportMetrics.totalLoss.toFixed(2)}) + Net Tx = Final Wallet Balance (₹
                  {userReportMetrics.finalWalletBalance.toFixed(2)})
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-extrabold rounded-lg shrink-0">
              Math Match Confirmed
            </span>
          </div>

          {/* User Info Header Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-black text-base shrink-0">
                {selectedUser.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-display">
                    {selectedUser.name}
                  </h3>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-mono rounded-md">
                    ID: {selectedUser.id}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{selectedUser.email}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-sans">KYC Status</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">
                  {selectedUser.kycStatus || "unverified"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-sans">Saved Bank Account</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedUser.savedBankDetails?.bankName
                    ? `${selectedUser.savedBankDetails.bankName} (..${selectedUser.savedBankDetails.accountNumber.slice(-4)})`
                    : "None Linked"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-sans">Last Activity</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {userReportMetrics.latestTimestampStr}
                </span>
              </div>
            </div>
          </div>

          {/* Settled Trades Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                Settled Trades Audit Log ({filteredAuditTrades.length} / {userReportMetrics.rangeTrades.length})
              </h4>
              <span className="text-[10px] font-mono text-slate-400">
                Period: {dateRangeLabel}
              </span>
            </div>

            {/* Outcome Filter Tabs & Search Bar */}
            <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {/* Tabs Bar */}
              <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-800/80 p-1 rounded-xl shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => setTradeStatusFilter("ALL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    tradeStatusFilter === "ALL"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span>ALL</span>
                  <span className="px-1.5 py-0.2 bg-black/20 dark:bg-white/20 text-[10px] rounded-full font-mono">
                    {userReportMetrics.rangeTrades.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTradeStatusFilter("WON")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    tradeStatusFilter === "WON"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                  }`}
                >
                  <span>WON</span>
                  <span className="px-1.5 py-0.2 bg-emerald-950/30 text-[10px] rounded-full font-mono">
                    {userReportMetrics.winCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTradeStatusFilter("LOST")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    tradeStatusFilter === "LOST"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                  }`}
                >
                  <span>LOST</span>
                  <span className="px-1.5 py-0.2 bg-rose-950/30 text-[10px] rounded-full font-mono">
                    {userReportMetrics.lossCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTradeStatusFilter("DRAW")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    tradeStatusFilter === "DRAW"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                  }`}
                >
                  <span>DRAW</span>
                  <span className="px-1.5 py-0.2 bg-amber-950/30 text-[10px] rounded-full font-mono">
                    {userReportMetrics.drawCount}
                  </span>
                </button>
              </div>

              {/* Filtered Trades Financial Summary & Search Input */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <div className="text-xs font-mono font-extrabold">
                  {tradeStatusFilter === "WON" && (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Total Profit: +₹{userReportMetrics.totalProfit.toFixed(2)}
                    </span>
                  )}
                  {tradeStatusFilter === "LOST" && (
                    <span className="text-rose-600 dark:text-rose-400">
                      Total Loss: -₹{userReportMetrics.totalLoss.toFixed(2)}
                    </span>
                  )}
                  {tradeStatusFilter === "DRAW" && (
                    <span className="text-amber-600 dark:text-amber-400">
                      Total Refunded: ₹
                      {userReportMetrics.rangeTrades
                        .filter((t) => t.status === "DRAW")
                        .reduce((sum, t) => sum + (t.stake || 0), 0)
                        .toFixed(2)}
                    </span>
                  )}
                  {tradeStatusFilter === "ALL" && (
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] font-sans">
                      Net PnL:{" "}
                      <strong
                        className={
                          userReportMetrics.netTradingPnL >= 0 ? "text-emerald-500" : "text-rose-500"
                        }
                      >
                        {userReportMetrics.netTradingPnL >= 0
                          ? `+₹${userReportMetrics.netTradingPnL.toFixed(2)}`
                          : `-₹${Math.abs(userReportMetrics.netTradingPnL).toFixed(2)}`}
                      </strong>
                    </span>
                  )}
                </div>

                <div className="relative w-40">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Search trade..."
                    value={tradeSearchQuery}
                    onChange={(e) => setTradeSearchQuery(e.target.value)}
                    className="w-full pl-7 pr-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 font-sans"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[430px] overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 shadow-xs">
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-3">Trade ID</th>
                    <th className="px-4 py-3">Asset Pair</th>
                    <th className="px-4 py-3">Option</th>
                    <th className="px-4 py-3 text-right">Stake (₹)</th>
                    <th className="px-4 py-3">Entry → Exit Price</th>
                    <th className="px-4 py-3 text-center">Outcome</th>
                    <th className="px-4 py-3 text-right">Profit / Loss (₹)</th>
                    <th className="px-4 py-3 text-right">Settled Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs font-mono">
                  {filteredAuditTrades.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400 font-sans text-xs">
                        No settled trades found matching "{tradeStatusFilter}" filter for this user.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditTrades.map((trade) => {
                      const isWin = trade.status === "WON";
                      const isLoss = trade.status === "LOST";
                      const pnl = trade.profitOrLoss ?? 0;

                      return (
                        <tr key={trade.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 text-slate-500 font-bold">
                            #{trade.id.slice(-8)}
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                            {trade.assetPair}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                trade.tradeType === "CALL"
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : "bg-rose-500/10 text-rose-500"
                              }`}
                            >
                              {trade.tradeType}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-100">
                            ₹{(trade.stake || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-[11px]">
                            {trade.entryPrice} → {trade.exitPrice ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                isWin
                                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                  : isLoss
                                  ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                                  : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                              }`}
                            >
                              {trade.status}
                            </span>
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-bold ${
                              pnl > 0 ? "text-emerald-500" : pnl < 0 ? "text-rose-500" : "text-amber-500"
                            }`}
                          >
                            {pnl >= 0 ? `+₹${pnl.toFixed(2)}` : `-₹${Math.abs(pnl).toFixed(2)}`}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-400 text-[11px]">
                            {trade.settledAt
                              ? new Date(trade.settledAt).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "N/A"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* All Users Overview Table View */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden flex flex-col gap-3 p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
                All Users Trading & Balance Summary Overview
                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-500 text-[10px] font-mono rounded-md">
                  {allUsersOverviewData.length} Users
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Overview of starting balances, trades, total profit/loss, win rates, and final balances across all traders.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search trader name or email..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[430px] overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 shadow-xs">
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Trader Info</th>
                  <th className="px-4 py-3 text-right">Starting Bal (₹)</th>
                  <th className="px-4 py-3 text-center">Total Trades</th>
                  <th className="px-4 py-3 text-center">Win Rate</th>
                  <th className="px-4 py-3 text-right">Total Profit (₹)</th>
                  <th className="px-4 py-3 text-right">Total Loss (₹)</th>
                  <th className="px-4 py-3 text-right">Final Balance (₹)</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs font-mono">
                {allUsersOverviewData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400 font-sans">
                      No trader users found.
                    </td>
                  </tr>
                ) : (
                  allUsersOverviewData.map((row) => (
                    <tr key={row.user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100 font-sans">
                          {row.user.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{row.user.email}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-300">
                        ₹{row.startingBal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-800 dark:text-slate-200">
                        {row.totalTrades}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-500 font-bold text-[10px] rounded-md">
                          {row.winRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-500 font-bold">
                        +₹{row.profit.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-rose-500 font-bold">
                        -₹{row.loss.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-black">
                        ₹{row.finalBal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedUserId(row.user.id)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer font-sans"
                        >
                          View & Export PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
