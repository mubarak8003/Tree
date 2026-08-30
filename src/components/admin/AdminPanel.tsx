// Admin Panel Master Component - 100% Modular & Production Ready
import React, { useState, useEffect } from "react";
import { 
  AdminConfig, TradePool, WalletTransaction, UserProfile, SupportMessage, 
  PaymentDetails, PaymentGateway, SoloTradingConfig, AdminUserAccount, WalletLimits,
  AdminAuditLog, SoloTrade 
} from "../../types";
import { MarketDebugPanel } from "../MarketDebugPanel";
import { RbacStaffManager } from "../RbacStaffManager";
import { AdminLimitsManagement } from "../AdminLimitsManagement";
import { AdminTradingBalanceReport } from "../AdminTradingBalanceReport";
import { LiveCandlePatternController } from "../LiveCandlePatternController";
import { subscribeAdminAccounts } from "../../services/adminRbacService";
import { subscribeAdminAuditLogs, subscribeAllSoloTrades } from "../../firebaseService";

// Sub Tabs
import { SettlementTab } from "./tabs/SettlementTab";
import { ApprovalsTab } from "./tabs/ApprovalsTab";
import { ConfigTab } from "./tabs/ConfigTab";
import { UsersTab } from "./tabs/UsersTab";
import { SupportTab } from "./tabs/SupportTab";
import { LogsTab } from "./tabs/LogsTab";
import { SoloTradingTab } from "./tabs/SoloTradingTab";
import { ArchiveTab } from "./tabs/ArchiveTab";

import { 
  Activity, ClipboardList, Settings, Users, MessageSquare, ShieldCheck, 
  Zap, Archive, BarChart2, Shield, Scale, Sliders
} from "lucide-react";
import { 
  DEFAULT_PAYMENT_DETAILS, DEFAULT_PAYMENT_NOTE, 
  DEFAULT_DEPOSIT_PROCESSING_TIME, DEFAULT_WITHDRAWAL_PROCESSING_TIME 
} from "../../firebaseService";

export interface AdminPanelProps {
  currentPool: TradePool | null;
  config: AdminConfig;
  onConfigChange: (config: AdminConfig) => void;
  walletTransactions: WalletTransaction[];
  allPools: TradePool[];
  allUsers: UserProfile[];
  supportMessages?: SupportMessage[];
  onTriggerNotification?: (message: string, type: "success" | "info" | "error") => void;
  paymentDetails?: PaymentDetails;
  paymentGateways?: PaymentGateway[];
  paymentNote?: string;
  depositProcessingTime?: string;
  withdrawalProcessingTime?: string;
  soloConfig?: SoloTradingConfig;
  currentUserId?: string;
  walletLimits?: WalletLimits;
}

export type AdminTabType = 
  | "settlement" 
  | "approvals" 
  | "users" 
  | "support" 
  | "config" 
  | "logs" 
  | "solo_trading" 
  | "archive" 
  | "market_monitor" 
  | "rbac_staff" 
  | "limits" 
  | "balance_report";

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentPool,
  config,
  onConfigChange,
  walletTransactions,
  allPools,
  allUsers,
  supportMessages = [],
  onTriggerNotification,
  paymentDetails = DEFAULT_PAYMENT_DETAILS,
  paymentGateways = [],
  paymentNote = DEFAULT_PAYMENT_NOTE,
  depositProcessingTime = DEFAULT_DEPOSIT_PROCESSING_TIME,
  withdrawalProcessingTime = DEFAULT_WITHDRAWAL_PROCESSING_TIME,
  currentUserId,
  walletLimits,
  soloConfig
}) => {
  const [activeTab, setActiveTab] = useState<AdminTabType>("settlement");
  const [adminAccounts, setAdminAccounts] = useState<AdminUserAccount[]>([]);
  const [currentAdminAccount, setCurrentAdminAccount] = useState<AdminUserAccount | null>(null);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [allSoloTrades, setAllSoloTrades] = useState<SoloTrade[]>([]);

  useEffect(() => {
    const unsubAccounts = subscribeAdminAccounts((accounts) => {
      setAdminAccounts(accounts);
      if (currentUserId) {
        const found = accounts.find((a) => a.id === currentUserId || a.email === currentUserId);
        if (found) setCurrentAdminAccount(found);
      }
    });

    const unsubLogs = subscribeAdminAuditLogs((logs) => {
      setAuditLogs(logs);
    });

    const unsubTrades = subscribeAllSoloTrades((trades) => {
      setAllSoloTrades(trades);
    });

    return () => {
      if (typeof unsubAccounts === "function") unsubAccounts();
      if (typeof unsubLogs === "function") unsubLogs();
      if (typeof unsubTrades === "function") unsubTrades();
    };
  }, [currentUserId]);

  const adminEmail = currentAdminAccount?.email || "admin@system.local";

  const tabs: { id: AdminTabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "settlement", label: "Pool Settlements", icon: Activity },
    { id: "approvals", label: "Wallet Approvals", icon: ClipboardList },
    { id: "users", label: "Users & Wallets", icon: Users },
    { id: "solo_trading", label: "Solo Trading Engine", icon: Zap },
    { id: "limits", label: "Transaction Limits", icon: Sliders },
    { id: "balance_report", label: "Balance & PnL Report", icon: Scale },
    { id: "market_monitor", label: "Market Monitor", icon: BarChart2 },
    { id: "support", label: "Help Desk", icon: MessageSquare },
    { id: "config", label: "System Config", icon: Settings },
    { id: "rbac_staff", label: "Staff & RBAC", icon: Shield },
    { id: "logs", label: "Audit Logs", icon: ShieldCheck },
    { id: "archive", label: "DB Archiving", icon: Archive },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Navigation Tabs Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Views */}
      <div className="animate-fade-in">
        {activeTab === "settlement" && (
          <SettlementTab
            currentPool={currentPool}
            allPools={allPools}
            onTriggerNotification={onTriggerNotification}
            adminEmail={adminEmail}
          />
        )}

        {activeTab === "approvals" && (
          <ApprovalsTab
            walletTransactions={walletTransactions}
            onTriggerNotification={onTriggerNotification}
            adminEmail={adminEmail}
          />
        )}

        {activeTab === "users" && (
          <UsersTab
            allUsers={allUsers}
            onTriggerNotification={onTriggerNotification}
            adminEmail={adminEmail}
          />
        )}

        {activeTab === "solo_trading" && (
          <SoloTradingTab
            soloConfig={soloConfig}
            onTriggerNotification={onTriggerNotification}
            adminEmail={adminEmail}
          />
        )}

        {activeTab === "limits" && (
          <AdminLimitsManagement
            allUsers={allUsers}
            walletTransactions={walletTransactions}
            walletLimits={walletLimits}
            adminAccount={currentAdminAccount}
            onTriggerNotification={(type, msg) => {
              const mappedType = type === "SUCCESS" ? "success" : type === "ERROR" ? "error" : "info";
              onTriggerNotification?.(msg, mappedType);
            }}
          />
        )}

        {activeTab === "balance_report" && (
          <AdminTradingBalanceReport
            allUsers={allUsers}
            allSoloTrades={allSoloTrades}
            walletTransactions={walletTransactions}
            currentAdminAccount={currentAdminAccount}
            onTriggerNotification={onTriggerNotification}
          />
        )}

        {activeTab === "market_monitor" && (
          <div className="space-y-6">
            <MarketDebugPanel symbol="BINANCE:BTCUSDT" />
            <LiveCandlePatternController currentSymbol="BINANCE:BTCUSDT" />
          </div>
        )}

        {activeTab === "support" && (
          <SupportTab
            supportMessages={supportMessages}
            onTriggerNotification={onTriggerNotification}
            adminEmail={adminEmail}
          />
        )}

        {activeTab === "config" && (
          <ConfigTab
            config={config}
            onConfigChange={onConfigChange}
            paymentDetails={paymentDetails}
            paymentGateways={paymentGateways}
            paymentNote={paymentNote}
            depositProcessingTime={depositProcessingTime}
            withdrawalProcessingTime={withdrawalProcessingTime}
            onTriggerNotification={onTriggerNotification}
            adminEmail={adminEmail}
          />
        )}

        {activeTab === "rbac_staff" && (
          <RbacStaffManager
            currentAdminAccount={currentAdminAccount}
            adminAccounts={adminAccounts}
            auditLogs={auditLogs}
            onTriggerNotification={onTriggerNotification}
          />
        )}

        {activeTab === "logs" && (
          <LogsTab onTriggerNotification={onTriggerNotification} />
        )}

        {activeTab === "archive" && (
          <ArchiveTab
            onTriggerNotification={onTriggerNotification}
            adminEmail={adminEmail}
          />
        )}
      </div>
    </div>
  );
};
