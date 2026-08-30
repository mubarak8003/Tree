import React, { useState, useEffect } from "react";
import { 
  HrManagerAccount, 
  EmployeeProfile, 
  EmployeeSalaryRecord, 
  BonusIncentiveRecord, 
  MonthlyPayrollRun, 
  PayslipRecord, 
  HrAuditLog,
  HrStaffPermission,
  EmploymentType,
  EmployeeStatus,
  BonusType
} from "../types";
import {
  ALL_HR_PERMISSIONS,
  hasHrPermission,
  subscribeHrManagers,
  subscribeEmployees,
  subscribeSalaryRecords,
  subscribeBonuses,
  subscribePayrollRuns,
  subscribePayslips,
  subscribeHrAuditLogs,
  saveHrManagerAccount,
  toggleHrManagerStatus,
  saveEmployeeProfile,
  deleteEmployeeProfile,
  updateEmployeeSalaryWithAudit,
  createBonusRecord,
  createMonthlyPayrollRunBatch,
  approvePayrollRunBatch,
  disbursePayrollRunAndGeneratePayslips,
  computeNetSalary
} from "../services/hrPayrollService";
import {
  Users,
  DollarSign,
  FileText,
  Award,
  ShieldCheck,
  History,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  CreditCard,
  Printer,
  Download,
  Eye,
  Edit3,
  AlertTriangle,
  Key,
  ChevronRight,
  Sparkles,
  UserCheck,
  UserX,
  Lock,
  Mail,
  Phone,
  Briefcase,
  Check,
  X,
  RefreshCw,
  TrendingUp,
  FileCheck,
  Trash2
} from "lucide-react";

interface HrPayrollManagerProps {
  currentAdminEmail?: string;
  onTriggerNotification?: (message: string, type: "success" | "error" | "info") => void;
}

export const HrPayrollManager: React.FC<HrPayrollManagerProps> = ({
  currentAdminEmail = "amaizy1@gmail.com",
  onTriggerNotification = (_msg: string, _type?: "success" | "error" | "info") => {}
}) => {
  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<
    "employees" | "salaries" | "payroll" | "payslips" | "bonuses" | "hr_managers" | "audit"
  >("employees");

  // Real-time Data States
  const [hrManagers, setHrManagers] = useState<HrManagerAccount[]>([]);
  const [currentActor, setCurrentActor] = useState<HrManagerAccount | null>(null);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [salaries, setSalaries] = useState<Record<string, EmployeeSalaryRecord>>({});
  const [bonuses, setBonuses] = useState<BonusIncentiveRecord[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<MonthlyPayrollRun[]>([]);
  const [payslips, setPayslips] = useState<PayslipRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<HrAuditLog[]>([]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProfile | null>(null);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [selectedSalaryEmp, setSelectedSalaryEmp] = useState<EmployeeProfile | null>(null);
  
  const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [isHrManagerModalOpen, setIsHrManagerModalOpen] = useState(false);
  const [selectedHrManager, setSelectedHrManager] = useState<HrManagerAccount | null>(null);

  // Payslip Viewer Modal
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipRecord | null>(null);

  // Security PIN Verification Modal State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pendingActionInfo, setPendingActionInfo] = useState<{
    title: string;
    description: string;
    action: () => Promise<void>;
  } | null>(null);

  // Form States for Employee Creation/Edit
  const [empForm, setEmpForm] = useState<Partial<EmployeeProfile>>({
    fullName: "",
    email: "",
    phone: "",
    designation: "",
    department: "Engineering",
    dateOfJoining: new Date().toISOString().slice(0, 10),
    employmentType: "FULL_TIME",
    status: "ACTIVE",
    bankName: "",
    accountNumber: "",
    ifscOrRoutingCode: "",
    taxIdPan: "",
    allowSelfPayslipView: true,
    notes: ""
  });

  const [salForm, setSalForm] = useState<Partial<EmployeeSalaryRecord>>({
    baseSalary: 100000,
    hraAllowance: 25000,
    specialAllowance: 10000,
    medicalAllowance: 5000,
    pfDeduction: 10000,
    tdsDeduction: 15000,
    otherDeductions: 0,
    currency: "INR",
    effectiveFrom: new Date().toISOString().slice(0, 10)
  });

  // Form State for Bonus
  const [bonusForm, setBonusForm] = useState<Partial<BonusIncentiveRecord>>({
    employeeId: "",
    amount: 15000,
    bonusType: "PERFORMANCE",
    title: "Q3 Performance Bonus",
    monthYear: new Date().toISOString().slice(0, 7),
    notes: ""
  });

  // Form State for Payroll Run
  const [payrollRunMonth, setPayrollRunMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payrollRunNotes, setPayrollRunNotes] = useState("");

  // Form State for HR Manager Creation
  const [mgrForm, setMgrForm] = useState<Partial<HrManagerAccount>>({
    name: "",
    email: "",
    role: "HR_PAYROLL_MANAGER",
    permissions: [
      "manage_employee_profiles",
      "view_salary_info",
      "manage_salary_records",
      "create_payroll_run",
      "generate_payslips",
      "manage_bonuses",
      "view_hr_reports"
    ],
    status: "ACTIVE"
  });

  // Real-time Subscriptions setup
  useEffect(() => {
    const unsubMgrs = subscribeHrManagers((mgrs) => {
      setHrManagers(mgrs);
      // Determine active actor
      const match = mgrs.find(m => m.email.toLowerCase() === currentAdminEmail.toLowerCase());
      if (match) {
        setCurrentActor(match);
      } else if (mgrs.length > 0) {
        setCurrentActor(mgrs[0]); // Default to Owner
      }
    });

    const unsubEmps = subscribeEmployees(setEmployees);
    const unsubSal = subscribeSalaryRecords(setSalaries);
    const unsubBon = subscribeBonuses(setBonuses);
    const unsubRuns = subscribePayrollRuns(setPayrollRuns);
    const unsubSlips = subscribePayslips(setPayslips);
    const unsubLogs = subscribeHrAuditLogs(setAuditLogs);

    return () => {
      unsubMgrs();
      unsubEmps();
      unsubSal();
      unsubBon();
      unsubRuns();
      unsubSlips();
      unsubLogs();
    };
  }, [currentAdminEmail]);

  // Request Security PIN confirmation before executing sensitive actions
  const triggerPinVerification = (
    title: string,
    description: string,
    action: () => Promise<void>
  ) => {
    setPendingActionInfo({ title, description, action });
    setPinInput("");
    setIsPinModalOpen(true);
  };

  const handleConfirmPin = async () => {
    if (pinInput !== "123456" && pinInput !== "888888") {
      onTriggerNotification("Invalid Security PIN entered. Action blocked.", "error");
      return;
    }

    setIsPinModalOpen(false);
    if (pendingActionInfo) {
      await pendingActionInfo.action();
      setPendingActionInfo(null);
    }
  };

  // Handler: Open Create/Edit Employee Modal
  const handleOpenEmployeeModal = (emp?: EmployeeProfile) => {
    if (emp) {
      setSelectedEmployee(emp);
      setEmpForm(emp);
      const sal = salaries[emp.id];
      if (sal) {
        setSalForm(sal);
      }
    } else {
      setSelectedEmployee(null);
      setEmpForm({
        fullName: "",
        email: "",
        phone: "",
        designation: "",
        department: "Engineering",
        dateOfJoining: new Date().toISOString().slice(0, 10),
        employmentType: "FULL_TIME",
        status: "ACTIVE",
        bankName: "HDFC Bank",
        accountNumber: "",
        ifscOrRoutingCode: "",
        taxIdPan: "",
        allowSelfPayslipView: true,
        notes: ""
      });
      setSalForm({
        baseSalary: 100000,
        hraAllowance: 25000,
        specialAllowance: 10000,
        medicalAllowance: 5000,
        pfDeduction: 10000,
        tdsDeduction: 15000,
        otherDeductions: 0,
        currency: "INR",
        effectiveFrom: new Date().toISOString().slice(0, 10)
      });
    }
    setIsEmployeeModalOpen(true);
  };

  const handleSaveEmployee = async () => {
    if (!currentActor) return;
    const res = await saveEmployeeProfile(empForm, salForm, currentActor);
    if (res.success) {
      onTriggerNotification(res.message, "success");
      setIsEmployeeModalOpen(false);
    } else {
      onTriggerNotification(res.message, "error");
    }
  };

  const handleDeleteEmployee = (emp: EmployeeProfile) => {
    if (!currentActor) return;

    triggerPinVerification(
      `Delete Employee: ${emp.fullName}`,
      `Are you sure you want to permanently delete ${emp.fullName} (${emp.employeeCode})? This will remove their profile and salary structure from HR & Payroll. Enter Security PIN (123456) to confirm.`,
      async () => {
        const res = await deleteEmployeeProfile(emp.id, currentActor);
        if (res.success) {
          onTriggerNotification(res.message, "success");
          setIsEmployeeModalOpen(false);
        } else {
          onTriggerNotification(res.message, "error");
        }
      }
    );
  };

  // Handler: Open Edit Salary Modal
  const handleOpenSalaryModal = (emp: EmployeeProfile) => {
    setSelectedSalaryEmp(emp);
    const existingSal = salaries[emp.id] || {
      baseSalary: 100000,
      hraAllowance: 25000,
      specialAllowance: 10000,
      medicalAllowance: 5000,
      pfDeduction: 10000,
      tdsDeduction: 15000,
      otherDeductions: 0,
      currency: "INR"
    };
    setSalForm(existingSal);
    setIsSalaryModalOpen(true);
  };

  const handleSaveSalaryWithPin = () => {
    if (!selectedSalaryEmp || !currentActor) return;

    triggerPinVerification(
      "Authorize Salary Revision",
      `Are you sure you want to update the base salary & allowance structure for ${selectedSalaryEmp.fullName}? This will generate a security audit log.`,
      async () => {
        const oldSal = salaries[selectedSalaryEmp.id];
        const res = await updateEmployeeSalaryWithAudit(
          selectedSalaryEmp.id,
          selectedSalaryEmp.fullName,
          salForm,
          oldSal,
          currentActor
        );
        if (res.success) {
          onTriggerNotification(res.message, "success");
          setIsSalaryModalOpen(false);
        } else {
          onTriggerNotification(res.message, "error");
        }
      }
    );
  };

  // Handler: Create Bonus
  const handleSaveBonus = async () => {
    if (!currentActor) return;
    const emp = employees.find(e => e.id === bonusForm.employeeId);
    const bonusPayload = {
      ...bonusForm,
      employeeName: emp ? emp.fullName : "Employee"
    };

    const res = await createBonusRecord(bonusPayload, currentActor);
    if (res.success) {
      onTriggerNotification(res.message, "success");
      setIsBonusModalOpen(false);
    } else {
      onTriggerNotification(res.message, "error");
    }
  };

  // Handler: Create Monthly Payroll Run Batch
  const handleCreatePayrollRunBatch = async () => {
    if (!currentActor) return;
    const res = await createMonthlyPayrollRunBatch(
      payrollRunMonth,
      employees,
      salaries,
      bonuses,
      payrollRunNotes,
      currentActor
    );
    if (res.success) {
      onTriggerNotification(res.message, "success");
      setIsPayrollModalOpen(false);
    } else {
      onTriggerNotification(res.message, "error");
    }
  };

  // Handler: Approve Payroll Run Batch
  const handleApprovePayrollRun = (run: MonthlyPayrollRun) => {
    if (!currentActor) return;

    triggerPinVerification(
      "Authorize Owner Payroll Approval",
      `As Platform Owner, authorize approval for ${run.monthYear} payroll batch totaling ₹${run.totalNetPayout.toLocaleString()} across ${run.totalEmployeesCount} active employees.`,
      async () => {
        const res = await approvePayrollRunBatch(run.id, currentActor);
        if (res.success) {
          onTriggerNotification(res.message, "success");
        } else {
          onTriggerNotification(res.message, "error");
        }
      }
    );
  };

  // Handler: Disburse Payroll & Generate Payslips
  const handleDisbursePayroll = (run: MonthlyPayrollRun) => {
    if (!currentActor) return;

    triggerPinVerification(
      "Disburse Salary Payments & Issue Payslips",
      `Disburse salary payments for ${run.monthYear} batch (Total ₹${run.totalNetPayout.toLocaleString()}). This will generate official payslips for all active employees.`,
      async () => {
        const res = await disbursePayrollRunAndGeneratePayslips(
          run,
          employees,
          salaries,
          bonuses,
          currentActor
        );
        if (res.success) {
          onTriggerNotification(res.message, "success");
        } else {
          onTriggerNotification(res.message, "error");
        }
      }
    );
  };

  // Handler: Save HR Manager (Owner Only)
  const handleSaveHrManager = async () => {
    if (!currentActor) return;
    const res = await saveHrManagerAccount(mgrForm, currentActor, "123456");
    if (res.success) {
      onTriggerNotification(res.message, "success");
      setIsHrManagerModalOpen(false);
    } else {
      onTriggerNotification(res.message, "error");
    }
  };

  // Handler: Toggle HR Manager Status
  const handleToggleManagerStatus = (mgr: HrManagerAccount) => {
    if (!currentActor) return;
    const nextStatus = mgr.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";

    triggerPinVerification(
      `Confirm Manager Account ${nextStatus}`,
      `Are you sure you want to change account status for ${mgr.name} to ${nextStatus}?`,
      async () => {
        const res = await toggleHrManagerStatus(mgr.id, nextStatus, currentActor);
        if (res.success) {
          onTriggerNotification(res.message, "success");
        } else {
          onTriggerNotification(res.message, "error");
        }
      }
    );
  };

  // Filtering Logic for Employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.designation.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = departmentFilter === "ALL" || emp.department === departmentFilter;
    const matchesStatus = statusFilter === "ALL" || emp.status === statusFilter;

    return matchesSearch && matchesDept && matchesStatus;
  });

  // Calculate Metrics
  const totalEmployeesCount = employees.length;
  const activeEmployeesCount = employees.filter(e => e.status === "ACTIVE").length;
  const totalMonthlyPayrollCost = (Object.values(salaries) as EmployeeSalaryRecord[]).reduce((acc, curr) => acc + (curr.netMonthlyPay || 0), 0);
  const pendingPayrollApprovalsCount = payrollRuns.filter(r => r.status === "SUBMITTED_FOR_APPROVAL").length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 border border-indigo-900/40 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <Building2 className="w-64 h-64 text-indigo-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-400/30">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
              <span>Isolated HR & Payroll Module</span>
            </div>
            <h1 className="text-2xl font-black text-white font-display tracking-tight flex items-center gap-2">
              Enterprise HR & Payroll Management System
            </h1>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Separate employee profile management, salary structures, monthly payroll runs, itemized payslip distribution, bonus tracking, and security audit logs.
            </p>
          </div>

          {/* Active Profile Info & Switcher */}
          <div className="bg-slate-800/80 backdrop-blur-md p-3 rounded-xl border border-slate-700/80 shrink-0 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {currentActor?.name ? currentActor.name.charAt(0) : "A"}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                {hrManagers.length > 1 ? (
                  <select
                    value={currentActor?.id || ""}
                    onChange={(e) => {
                      const selected = hrManagers.find(m => m.id === e.target.value);
                      if (selected) setCurrentActor(selected);
                    }}
                    className="bg-slate-900 border border-slate-700 text-white text-xs font-bold rounded-lg px-2 py-0.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {hrManagers.map((mgr) => (
                      <option key={mgr.id} value={mgr.id}>
                        {mgr.name} ({mgr.role})
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <span className="text-xs font-bold text-white">{currentActor?.name || "HR Director"}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${
                      currentActor?.role === "OWNER" 
                        ? "bg-amber-500 text-slate-950" 
                        : "bg-indigo-500 text-white"
                    }`}>
                      {currentActor?.role || "HR MANAGER"}
                    </span>
                  </>
                )}
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">{currentActor?.email || currentAdminEmail}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Headcount</span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{activeEmployeesCount}</span>
            <span className="text-xs text-slate-500">/ {totalEmployeesCount} Active</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Staff across 5 departments</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Monthly Base Payroll</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">₹{totalMonthlyPayrollCost.toLocaleString()}</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Estimated net monthly liability</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending Batch Approvals</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{pendingPayrollApprovalsCount}</span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">Awaiting Owner</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Monthly payroll approval queue</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">HR Managers & Access</span>
            <div className="p-2 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{hrManagers.length}</span>
            <span className="text-xs text-purple-600 dark:text-purple-400 font-bold">RBAC Accounts</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Owner & HR Staff Managers</span>
        </div>
      </div>

      {/* Navigation Sub-Tabs Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-1.5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setActiveTab("employees")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "employees"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Employees & Profiles</span>
          <span className="px-1.5 py-0.2 bg-indigo-500/30 text-indigo-200 rounded-full text-[10px]">
            {employees.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("salaries")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "salaries"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <DollarSign className="h-4 w-4" />
          <span>Salary Structures</span>
        </button>

        <button
          onClick={() => setActiveTab("payroll")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
            activeTab === "payroll"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Monthly Payroll Runs</span>
          {pendingPayrollApprovalsCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("payslips")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "payslips"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Payslip Archive</span>
          <span className="px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-[10px]">
            {payslips.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("bonuses")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "bonuses"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Award className="h-4 w-4 text-amber-400" />
          <span>Bonuses & Incentives</span>
        </button>

        {currentActor?.role === "OWNER" && (
          <button
            onClick={() => setActiveTab("hr_managers")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "hr_managers"
                ? "bg-amber-500 text-slate-950 shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-amber-900" />
            <span>HR Managers & RBAC</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "audit"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <History className="h-4 w-4" />
          <span>HR Security Audit Trail</span>
          <span className="px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-[10px]">
            {auditLogs.length}
          </span>
        </button>
      </div>

      {/* TAB 1: EMPLOYEES & PROFILES */}
      {activeTab === "employees" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, employee code, email, designation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                <option value="ALL">All Departments</option>
                <option value="Trading Operations">Trading Operations</option>
                <option value="Customer Support">Customer Support</option>
                <option value="Risk Team">Risk Team</option>
                <option value="Engineering">Engineering</option>
                <option value="Compliance">Compliance</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>

            {hasHrPermission(currentActor, "manage_employee_profiles") && (
              <button
                onClick={() => handleOpenEmployeeModal()}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Add New Employee</span>
              </button>
            )}
          </div>

          {/* Employee Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredEmployees.map((emp) => {
              const empSalary = salaries[emp.id];
              return (
                <div 
                  key={emp.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-all hover:border-indigo-300 dark:hover:border-indigo-800"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center border border-indigo-100/50 dark:border-indigo-800/40 font-mono text-xs">
                          {emp.employeeCode}
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                            {emp.fullName}
                          </h3>
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                            {emp.designation}
                          </span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        emp.status === "ACTIVE" 
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" 
                          : emp.status === "SUSPENDED" 
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}>
                        {emp.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800/60">
                      <div>
                        <span className="text-slate-400 block">Department</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{emp.department}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Employment</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{emp.employmentType.replace("_", " ")}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Joined Date</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">{emp.dateOfJoining}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Net Monthly Salary</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {empSalary ? `₹${empSalary.netMonthlyPay.toLocaleString()}` : "Not Configured"}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 text-[11px] space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <Mail className="h-3 w-3 text-indigo-500 shrink-0" />
                        <span className="truncate">{emp.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <CreditCard className="h-3 w-3 text-emerald-500 shrink-0" />
                        <span>{emp.bankName || "Bank N/A"} • {emp.accountNumber ? `•••• ${emp.accountNumber.slice(-4)}` : "No Acc"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <FileText className="h-3 w-3 text-amber-500 shrink-0" />
                        <span>PAN/Tax ID: {emp.taxIdPan || "Not Provided"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {hasHrPermission(currentActor, "manage_salary_records") && (
                        <button
                          onClick={() => handleOpenSalaryModal(emp)}
                          className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <DollarSign className="h-3.5 w-3.5" />
                          <span>Salary & Pay</span>
                        </button>
                      )}

                      {hasHrPermission(currentActor, "manage_employee_profiles") && (
                        <button
                          onClick={() => handleOpenEmployeeModal(emp)}
                          className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit Profile</span>
                        </button>
                      )}
                    </div>

                    {hasHrPermission(currentActor, "manage_employee_profiles") && (
                      <button
                        onClick={() => handleDeleteEmployee(emp)}
                        className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 border border-rose-200/50 dark:border-rose-800/40"
                        title="Delete Employee"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: SALARY STRUCTURES */}
      {activeTab === "salaries" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                Employee Salary Structures & Breakdown
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Itemized base pay, HRA, special allowances, PF deductions, TDS tax calculations, and net monthly payable salaries.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Designation</th>
                  <th className="p-3">Base Salary</th>
                  <th className="p-3">HRA Allowance</th>
                  <th className="p-3">Special / Med</th>
                  <th className="p-3">PF Deduction</th>
                  <th className="p-3">TDS Tax</th>
                  <th className="p-3">Net Payable / Mo</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {employees.map((emp) => {
                  const sal = salaries[emp.id] || {
                    baseSalary: 0,
                    hraAllowance: 0,
                    specialAllowance: 0,
                    medicalAllowance: 0,
                    pfDeduction: 0,
                    tdsDeduction: 0,
                    otherDeductions: 0,
                    netMonthlyPay: 0
                  };

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">{emp.fullName}</div>
                        <span className="text-[10px] text-slate-400 font-mono">{emp.employeeCode}</span>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{emp.designation}</td>
                      <td className="p-3 font-mono">₹{sal.baseSalary.toLocaleString()}</td>
                      <td className="p-3 font-mono text-emerald-600">₹{sal.hraAllowance.toLocaleString()}</td>
                      <td className="p-3 font-mono text-emerald-600">₹{(sal.specialAllowance + sal.medicalAllowance).toLocaleString()}</td>
                      <td className="p-3 font-mono text-rose-600">₹{sal.pfDeduction.toLocaleString()}</td>
                      <td className="p-3 font-mono text-rose-600">₹{sal.tdsDeduction.toLocaleString()}</td>
                      <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        ₹{sal.netMonthlyPay.toLocaleString()}
                      </td>
                      <td className="p-3 text-right">
                        {hasHrPermission(currentActor, "manage_salary_records") && (
                          <button
                            onClick={() => handleOpenSalaryModal(emp)}
                            className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg font-bold hover:bg-indigo-100 cursor-pointer"
                          >
                            Update Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MONTHLY PAYROLL RUNS */}
      {activeTab === "payroll" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                Monthly Payroll Batches & Disbursements
              </h2>
              <p className="text-xs text-slate-500">
                Generate draft monthly payroll, submit for Owner approval, and process final salary disbursements.
              </p>
            </div>

            {hasHrPermission(currentActor, "create_payroll_run") && (
              <button
                onClick={() => setIsPayrollModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Initialize Monthly Batch</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {payrollRuns.map((run) => (
              <div 
                key={run.id} 
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400 font-black text-sm font-mono">
                      {run.monthYear}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                          Monthly Payroll Batch ({run.monthYear})
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          run.status === "DISBURSED" 
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : run.status === "APPROVED_BY_OWNER"
                            ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}>
                          {run.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 block mt-0.5">
                        Created by {run.createdByName} ({run.createdBy}) on {new Date(run.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions for Payroll Batch */}
                  <div className="flex items-center gap-2">
                    {run.status === "SUBMITTED_FOR_APPROVAL" && currentActor?.role === "OWNER" && (
                      <button
                        onClick={() => handleApprovePayrollRun(run)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        <span>Owner Approve Batch</span>
                      </button>
                    )}

                    {run.status === "APPROVED_BY_OWNER" && hasHrPermission(currentActor, "disburse_payroll") && (
                      <button
                        onClick={() => handleDisbursePayroll(run)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Disburse Funds & Payslips</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Active Staff</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{run.totalEmployeesCount} Employees</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Base Salaries</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">₹{run.totalBaseSalary.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Allowances</span>
                    <span className="font-mono text-emerald-600 font-semibold">+₹{run.totalAllowances.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Deductions</span>
                    <span className="font-mono text-rose-600 font-semibold">-₹{run.totalDeductions.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Net Disbursed</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-black text-sm">₹{run.totalNetPayout.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PAYSLIP ARCHIVE */}
      {activeTab === "payslips" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                Generated Monthly Payslip Repository
              </h2>
              <p className="text-xs text-slate-500">
                Itemized employee payslips available for viewing, printing, or exporting.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">Month</th>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Earnings</th>
                  <th className="p-3">Deductions</th>
                  <th className="p-3">Net Pay</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Payslip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {payslips.map((slip) => (
                  <tr key={slip.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{slip.monthYear}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{slip.employeeName}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{slip.employeeCode}</span>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{slip.department}</td>
                    <td className="p-3 font-mono text-emerald-600">₹{slip.totalEarnings.toLocaleString()}</td>
                    <td className="p-3 font-mono text-rose-600">₹{slip.totalDeductions.toLocaleString()}</td>
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">₹{slip.netSalary.toLocaleString()}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {slip.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedPayslip(slip)}
                        className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg font-bold hover:bg-indigo-100 cursor-pointer flex items-center gap-1 ml-auto"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View Payslip</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: BONUSES & INCENTIVES */}
      {activeTab === "bonuses" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                Employee Performance Bonuses & Incentives
              </h2>
              <p className="text-xs text-slate-500">
                Grant and track performance bonuses, quarterly incentives, and commission rewards.
              </p>
            </div>

            {hasHrPermission(currentActor, "manage_bonuses") && (
              <button
                onClick={() => {
                  setBonusForm({
                    employeeId: employees[0]?.id || "",
                    amount: 15000,
                    bonusType: "PERFORMANCE",
                    title: "Quarterly Performance Bonus",
                    monthYear: new Date().toISOString().slice(0, 7),
                    notes: ""
                  });
                  setIsBonusModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                <Award className="h-4 w-4" />
                <span>Grant Bonus / Incentive</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {bonuses.map((bon) => (
              <div 
                key={bon.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {bon.bonusType}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400">{bon.monthYear}</span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white font-display">
                    {bon.title}
                  </h3>
                  <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    Awarded to: <span className="font-bold">{bon.employeeName}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">{bon.notes}</p>
                </div>

                <div className="text-right shrink-0 space-y-1">
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono block">
                    +₹{bon.amount.toLocaleString()}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                    bon.status === "PAID" 
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                  }`}>
                    {bon.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: HR MANAGERS & RBAC (OWNER ONLY) */}
      {activeTab === "hr_managers" && currentActor?.role === "OWNER" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-500" />
                HR & Payroll Manager Accounts (Owner Governance)
              </h2>
              <p className="text-xs text-slate-500">
                Create, edit, suspend, or remove HR/Payroll managers. The Platform Owner account remains immutable.
              </p>
            </div>

            <button
              onClick={() => {
                setMgrForm({
                  name: "",
                  email: "",
                  role: "HR_PAYROLL_MANAGER",
                  permissions: ALL_HR_PERMISSIONS.map(p => p.key).filter(p => p !== "manage_hr_managers"),
                  status: "ACTIVE"
                });
                setIsHrManagerModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Create HR Manager</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {hrManagers.map((mgr) => (
              <div 
                key={mgr.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 font-bold flex items-center justify-center border border-amber-200/40">
                      {mgr.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white font-display">
                        {mgr.name}
                      </h3>
                      <span className="text-[11px] text-slate-400 block">{mgr.email}</span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    mgr.role === "OWNER" 
                      ? "bg-amber-500 text-slate-950" 
                      : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                  }`}>
                    {mgr.role}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 space-y-1">
                  <div>Assigned HR Permissions: <span className="font-bold text-slate-700 dark:text-slate-300">{mgr.permissions.length} active</span></div>
                  <div>Account Status: <span className="font-bold">{mgr.status}</span></div>
                </div>

                {!mgr.isOwnerImmutable && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                      onClick={() => handleToggleManagerStatus(mgr)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                        mgr.status === "ACTIVE" 
                          ? "bg-rose-100 text-rose-700 hover:bg-rose-200" 
                          : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      }`}
                    >
                      {mgr.status === "ACTIVE" ? "Suspend Account" : "Reactivate Account"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: SECURITY AUDIT TRAIL */}
      {activeTab === "audit" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
                <History className="h-4 w-4 text-indigo-500" />
                Immutable HR & Payroll Security Audit Trail
              </h2>
              <p className="text-xs text-slate-500">
                Records every salary adjustment, employee profile modification, bonus disbarment, and payroll batch approval.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Actor / Email</th>
                  <th className="p-3">Action Type</th>
                  <th className="p-3">Target Employee</th>
                  <th className="p-3">Previous Value</th>
                  <th className="p-3">New Value</th>
                  <th className="p-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="p-3 text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{log.actorEmail}</div>
                      <span className="text-[10px] text-amber-600 font-black">{log.actorRole}</span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{log.targetEmployeeName || "-"}</td>
                    <td className="p-3 text-rose-600">{log.previousValue || "-"}</td>
                    <td className="p-3 text-emerald-600 font-bold">{log.newValue || "-"}</td>
                    <td className="p-3 text-slate-500 font-sans">{log.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT EMPLOYEE */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                {selectedEmployee ? "Edit Employee Profile" : "Add New Employee Profile"}
              </h3>
              <button onClick={() => setIsEmployeeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Full Employee Name *</label>
                <input
                  type="text"
                  value={empForm.fullName || ""}
                  onChange={(e) => setEmpForm({ ...empForm, fullName: e.target.value })}
                  placeholder="e.g. Alex Morgan"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Corporate Email *</label>
                <input
                  type="email"
                  value={empForm.email || ""}
                  onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                  placeholder="alex.m@platform.com"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={empForm.phone || ""}
                  onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Designation *</label>
                <input
                  type="text"
                  value={empForm.designation || ""}
                  onChange={(e) => setEmpForm({ ...empForm, designation: e.target.value })}
                  placeholder="Senior Trading Analyst"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Department *</label>
                <select
                  value={empForm.department || "Engineering"}
                  onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <option value="Trading Operations">Trading Operations</option>
                  <option value="Customer Support">Customer Support</option>
                  <option value="Risk Team">Risk Team</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Compliance">Compliance</option>
                  <option value="General Management">General Management</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Employment Type</label>
                <select
                  value={empForm.employmentType || "FULL_TIME"}
                  onChange={(e) => setEmpForm({ ...empForm, employmentType: e.target.value as EmploymentType })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="INTERN">Intern</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Bank Name</label>
                <input
                  type="text"
                  value={empForm.bankName || ""}
                  onChange={(e) => setEmpForm({ ...empForm, bankName: e.target.value })}
                  placeholder="e.g. HDFC Bank"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Bank Account Number</label>
                <input
                  type="text"
                  value={empForm.accountNumber || ""}
                  onChange={(e) => setEmpForm({ ...empForm, accountNumber: e.target.value })}
                  placeholder="50100234891100"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">IFSC / Routing Code</label>
                <input
                  type="text"
                  value={empForm.ifscOrRoutingCode || ""}
                  onChange={(e) => setEmpForm({ ...empForm, ifscOrRoutingCode: e.target.value })}
                  placeholder="HDFC0001234"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">PAN / Tax ID</label>
                <input
                  type="text"
                  value={empForm.taxIdPan || ""}
                  onChange={(e) => setEmpForm({ ...empForm, taxIdPan: e.target.value })}
                  placeholder="ABCDE1234F"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
              <div>
                {selectedEmployee && hasHrPermission(currentActor, "manage_employee_profiles") && (
                  <button
                    type="button"
                    onClick={() => handleDeleteEmployee(selectedEmployee)}
                    className="px-3 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-rose-200/60 dark:border-rose-800/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Employee</span>
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEmployee}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Save Employee
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT SALARY STRUCTURE */}
      {isSalaryModalOpen && selectedSalaryEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-500" />
                Update Salary Structure ({selectedSalaryEmp.fullName})
              </h3>
              <button onClick={() => setIsSalaryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Base Monthly Pay (₹)</label>
                <input
                  type="number"
                  value={salForm.baseSalary || 0}
                  onChange={(e) => setSalForm({ ...salForm, baseSalary: Number(e.target.value) })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">HRA Housing Allowance (₹)</label>
                <input
                  type="number"
                  value={salForm.hraAllowance || 0}
                  onChange={(e) => setSalForm({ ...salForm, hraAllowance: Number(e.target.value) })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Special Allowance (₹)</label>
                <input
                  type="number"
                  value={salForm.specialAllowance || 0}
                  onChange={(e) => setSalForm({ ...salForm, specialAllowance: Number(e.target.value) })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Medical Allowance (₹)</label>
                <input
                  type="number"
                  value={salForm.medicalAllowance || 0}
                  onChange={(e) => setSalForm({ ...salForm, medicalAllowance: Number(e.target.value) })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">PF Deduction (₹)</label>
                <input
                  type="number"
                  value={salForm.pfDeduction || 0}
                  onChange={(e) => setSalForm({ ...salForm, pfDeduction: Number(e.target.value) })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-rose-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">TDS Tax Deduction (₹)</label>
                <input
                  type="number"
                  value={salForm.tdsDeduction || 0}
                  onChange={(e) => setSalForm({ ...salForm, tdsDeduction: Number(e.target.value) })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-rose-600"
                />
              </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/50 p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-800 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Calculated Net Monthly Pay</span>
              <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                ₹{computeNetSalary(salForm).toLocaleString()}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsSalaryModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSalaryWithPin}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
              >
                Save & Log Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PAYSLIP FORMATTED VIEW & PRINT */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-6 w-6 text-indigo-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                    Official Salary Slip ({selectedPayslip.monthYear})
                  </h3>
                  <span className="text-xs text-slate-400 block">Transaction Ref: {selectedPayslip.transactionReference}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 cursor-pointer"
                  title="Print Payslip"
                >
                  <Printer className="h-4 w-4" />
                </button>
                <button onClick={() => setSelectedPayslip(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Payslip Header Card */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 block">Employee Name</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{selectedPayslip.employeeName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Employee Code</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{selectedPayslip.employeeCode}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Designation</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedPayslip.designation}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Department</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedPayslip.department}</span>
              </div>
            </div>

            {/* Itemized Earnings & Deductions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Earnings Table */}
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 space-y-2">
                <h4 className="font-bold text-emerald-800 dark:text-emerald-300 uppercase text-[10px] tracking-wider border-b border-emerald-200/60 pb-1">
                  Earnings Breakdown
                </h4>
                <div className="flex justify-between">
                  <span>Base Monthly Salary</span>
                  <span className="font-mono font-semibold">₹{selectedPayslip.baseSalary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>HRA Allowance</span>
                  <span className="font-mono font-semibold">₹{selectedPayslip.hraAllowance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Special Allowance</span>
                  <span className="font-mono font-semibold">₹{selectedPayslip.specialAllowance.toLocaleString()}</span>
                </div>
                {selectedPayslip.bonusAmount > 0 && (
                  <div className="flex justify-between font-bold text-amber-600">
                    <span>Performance Bonus</span>
                    <span className="font-mono">+₹{selectedPayslip.bonusAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-emerald-200/60 font-black text-emerald-700 dark:text-emerald-300">
                  <span>Total Gross Earnings</span>
                  <span className="font-mono">₹{selectedPayslip.totalEarnings.toLocaleString()}</span>
                </div>
              </div>

              {/* Deductions Table */}
              <div className="bg-rose-50/50 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/40 space-y-2">
                <h4 className="font-bold text-rose-800 dark:text-rose-300 uppercase text-[10px] tracking-wider border-b border-rose-200/60 pb-1">
                  Deductions Breakdown
                </h4>
                <div className="flex justify-between">
                  <span>Provident Fund (PF)</span>
                  <span className="font-mono font-semibold text-rose-600">₹{selectedPayslip.pfDeduction.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>TDS Income Tax</span>
                  <span className="font-mono font-semibold text-rose-600">₹{selectedPayslip.tdsDeduction.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-rose-200/60 font-black text-rose-700 dark:text-rose-300">
                  <span>Total Deductions</span>
                  <span className="font-mono">₹{selectedPayslip.totalDeductions.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Net Salary Banner */}
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-md">
              <div>
                <span className="text-[10px] text-indigo-300 uppercase font-extrabold tracking-wider block">Net Take-Home Monthly Salary</span>
                <span className="text-2xl font-black font-mono text-emerald-400">₹{selectedPayslip.netSalary.toLocaleString()}</span>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 rounded-full text-xs font-black uppercase">
                  {selectedPayslip.status}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">Direct Bank Transfer Completed</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: SECURITY PIN AUTHORIZATION */}
      {isPinModalOpen && pendingActionInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-200/50">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                  {pendingActionInfo.title}
                </h3>
                <span className="text-xs text-slate-400">Authorization PIN Required</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {pendingActionInfo.description}
            </p>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 text-xs block mb-1">
                Enter 6-Digit Security PIN
              </label>
              <input
                type="password"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="••••••"
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-lg font-mono tracking-widest font-bold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsPinModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPin}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black cursor-pointer shadow-sm"
              >
                Confirm & Authorize
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: INITIALIZE MONTHLY PAYROLL RUN */}
      {isPayrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-indigo-600" />
                Initialize Monthly Payroll Batch
              </h3>
              <button onClick={() => setIsPayrollModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Select Payroll Month (YYYY-MM)</label>
                <input
                  type="month"
                  value={payrollRunMonth}
                  onChange={(e) => setPayrollRunMonth(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Batch Notes</label>
                <textarea
                  value={payrollRunNotes}
                  onChange={(e) => setPayrollRunNotes(e.target.value)}
                  placeholder="Regular monthly salary disbursement run..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl h-20"
                />
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-950/50 p-3 rounded-xl border border-indigo-200/60 dark:border-indigo-800 text-[11px] text-indigo-800 dark:text-indigo-300 space-y-1">
                <div>Active Employees to be Processed: <span className="font-bold">{activeEmployeesCount}</span></div>
                <div>Estimated Total Net Disbarment: <span className="font-bold font-mono">₹{totalMonthlyPayrollCost.toLocaleString()}</span></div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsPayrollModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePayrollRunBatch}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm"
              >
                Generate Payroll Batch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: GRANT BONUS / INCENTIVE */}
      {isBonusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                Grant Bonus or Performance Incentive
              </h3>
              <button onClick={() => setIsBonusModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Select Recipient Employee</label>
                <select
                  value={bonusForm.employeeId}
                  onChange={(e) => setBonusForm({ ...bonusForm, employeeId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeCode} - {emp.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Bonus Title / Reason</label>
                <input
                  type="text"
                  value={bonusForm.title || ""}
                  onChange={(e) => setBonusForm({ ...bonusForm, title: e.target.value })}
                  placeholder="e.g. Q3 Performance Bonus"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Bonus Amount (₹)</label>
                  <input
                    type="number"
                    value={bonusForm.amount || 0}
                    onChange={(e) => setBonusForm({ ...bonusForm, amount: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Bonus Type</label>
                  <select
                    value={bonusForm.bonusType}
                    onChange={(e) => setBonusForm({ ...bonusForm, bonusType: e.target.value as BonusType })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="PERFORMANCE">Performance</option>
                    <option value="FESTIVAL">Festival</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="COMMISSION">Commission</option>
                    <option value="REFERRAL">Referral</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsBonusModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBonus}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black cursor-pointer shadow-sm"
              >
                Award Bonus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: CREATE HR MANAGER ACCOUNT (OWNER ONLY) */}
      {isHrManagerModalOpen && currentActor?.role === "OWNER" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-500" />
                Create HR/Payroll Manager Account
              </h3>
              <button onClick={() => setIsHrManagerModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Full Name *</label>
                <input
                  type="text"
                  value={mgrForm.name || ""}
                  onChange={(e) => setMgrForm({ ...mgrForm, name: e.target.value })}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Email Address *</label>
                <input
                  type="email"
                  value={mgrForm.email || ""}
                  onChange={(e) => setMgrForm({ ...mgrForm, email: e.target.value })}
                  placeholder="hr.lead@platform.com"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsHrManagerModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveHrManager}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black cursor-pointer shadow-sm"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
