import { 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  orderBy, 
  limit,
  onSnapshot 
} from "firebase/firestore";
import bcrypt from "bcryptjs";
import { db } from "../firebase";
import { 
  HrManagerAccount, 
  HrStaffPermission, 
  EmployeeProfile, 
  EmployeeSalaryRecord, 
  BonusIncentiveRecord, 
  MonthlyPayrollRun, 
  PayslipRecord, 
  HrAuditLog 
} from "../types";

export const ALL_HR_PERMISSIONS: { key: HrStaffPermission; label: string; description: string; category: string }[] = [
  { key: "manage_employee_profiles", label: "Manage Employee Profiles", description: "Add, edit, or update employee personal and bank information.", category: "Employee Management" },
  { key: "view_salary_info", label: "View Salary & Compensation", description: "View sensitive base salaries, allowances, and tax deductions.", category: "Payroll & Salary" },
  { key: "manage_salary_records", label: "Update Salary Records", description: "Modify base pay, HRA, special allowances, and deductions.", category: "Payroll & Salary" },
  { key: "create_payroll_run", label: "Create Monthly Payroll Batch", description: "Initialize draft monthly payroll runs for employee groups.", category: "Payroll & Salary" },
  { key: "approve_payroll_run", label: "Approve Monthly Payroll", description: "Authorize and approve pending payroll runs.", category: "Payroll & Salary" },
  { key: "disburse_payroll", label: "Disburse Salary Payments", description: "Finalize payment disbarment and mark payslips as paid.", category: "Payroll & Salary" },
  { key: "generate_payslips", label: "Generate & Issue Payslips", description: "Produce printable itemized PDF/HTML monthly payslips.", category: "Payslips & Reports" },
  { key: "manage_bonuses", label: "Manage Bonuses & Incentives", description: "Award, approve, or reject performance and quarterly bonuses.", category: "Incentives" },
  { key: "view_hr_reports", label: "View HR & Payroll Analytics", description: "Inspect payroll distribution, department costs, and reports.", category: "Reporting" },
  { key: "manage_hr_managers", label: "Manage HR Staff Accounts", description: "Owner-only: Create, suspend, or update HR Manager accounts.", category: "System Administration" },
  { key: "view_hr_audit_logs", label: "View HR Audit Logs", description: "Inspect comprehensive audit trail of all salary & payroll edits.", category: "Security & Compliance" }
];

// Default HR Owner & Staff Accounts
const DEFAULT_HR_OWNER: HrManagerAccount = {
  id: "hr_owner_1",
  email: "amaizy1@gmail.com",
  name: "Master Platform Owner",
  role: "OWNER",
  permissions: ALL_HR_PERMISSIONS.map(p => p.key),
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  createdBy: "SYSTEM",
  lastLoginAt: new Date().toISOString(),
  isOwnerImmutable: true
};

const DEFAULT_HR_MANAGER: HrManagerAccount = {
  id: "hr_mgr_1",
  email: "hr.lead@platform.com",
  name: "Sarah Jenkins (HR Lead)",
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
  status: "ACTIVE",
  createdAt: "2026-02-15T10:00:00.000Z",
  createdBy: "amaizy1@gmail.com",
  lastLoginAt: new Date().toISOString()
};

// Default Initial Employees Seed
const DEFAULT_EMPLOYEES: EmployeeProfile[] = [
  {
    id: "emp_1001",
    employeeCode: "EMP-1001",
    fullName: "Alex Morgan",
    email: "alex.m@platform.com",
    phone: "+1 (555) 234-5678",
    designation: "Senior Trading Analyst",
    department: "Trading Operations",
    dateOfJoining: "2024-03-15",
    employmentType: "FULL_TIME",
    status: "ACTIVE",
    bankName: "HDFC Bank",
    accountNumber: "50100234891100",
    ifscOrRoutingCode: "HDFC0001234",
    taxIdPan: "ABCDE1234F",
    allowSelfPayslipView: true,
    notes: "Top performing analyst for Solo options strategy",
    createdAt: "2024-03-15T09:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z"
  },
  {
    id: "emp_1002",
    employeeCode: "EMP-1002",
    fullName: "Priya Sharma",
    email: "priya.s@platform.com",
    phone: "+1 (555) 345-6789",
    designation: "Customer Support Lead",
    department: "Customer Support",
    dateOfJoining: "2024-06-01",
    employmentType: "FULL_TIME",
    status: "ACTIVE",
    bankName: "State Bank of India",
    accountNumber: "30987654321",
    ifscOrRoutingCode: "SBIN0004567",
    taxIdPan: "FGHIJ5678K",
    allowSelfPayslipView: true,
    notes: "Manages live chat and ticket resolution escalation",
    createdAt: "2024-06-01T09:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z"
  },
  {
    id: "emp_1003",
    employeeCode: "EMP-1003",
    fullName: "Marcus Vance",
    email: "marcus.v@platform.com",
    phone: "+1 (555) 456-7890",
    designation: "Chief Risk & Compliance Officer",
    department: "Risk Team",
    dateOfJoining: "2023-11-10",
    employmentType: "FULL_TIME",
    status: "ACTIVE",
    bankName: "ICICI Bank",
    accountNumber: "000401567890",
    ifscOrRoutingCode: "ICIC0000004",
    taxIdPan: "KLMNO9012P",
    allowSelfPayslipView: true,
    notes: "Oversees AML and suspicious trade settlement monitoring",
    createdAt: "2023-11-10T09:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z"
  },
  {
    id: "emp_1004",
    employeeCode: "EMP-1004",
    fullName: "David Chen",
    email: "david.c@platform.com",
    phone: "+1 (555) 567-8901",
    designation: "Principal Backend Architect",
    department: "Engineering",
    dateOfJoining: "2024-01-20",
    employmentType: "FULL_TIME",
    status: "ACTIVE",
    bankName: "Axis Bank",
    accountNumber: "9180200456789",
    ifscOrRoutingCode: "UTIB0000123",
    taxIdPan: "PQRST3456U",
    allowSelfPayslipView: true,
    notes: "Maintains Cloud SQL & Firestore archiving engine",
    createdAt: "2024-01-20T09:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z"
  },
  {
    id: "emp_1005",
    employeeCode: "EMP-1005",
    fullName: "Anita Roy",
    email: "anita.r@platform.com",
    phone: "+1 (555) 678-9012",
    designation: "KYC Compliance Specialist",
    department: "Compliance",
    dateOfJoining: "2025-02-01",
    employmentType: "FULL_TIME",
    status: "ACTIVE",
    bankName: "HDFC Bank",
    accountNumber: "50100987654321",
    ifscOrRoutingCode: "HDFC0001234",
    taxIdPan: "VWXYZ7890A",
    allowSelfPayslipView: true,
    notes: "Reviews high-volume deposit verification documents",
    createdAt: "2025-02-01T09:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z"
  }
];

// Default Initial Salary Structures
const DEFAULT_SALARY_RECORDS: Record<string, EmployeeSalaryRecord> = {
  emp_1001: {
    employeeId: "emp_1001",
    baseSalary: 120000,
    hraAllowance: 30000,
    specialAllowance: 15000,
    medicalAllowance: 5000,
    pfDeduction: 12000,
    tdsDeduction: 18000,
    otherDeductions: 0,
    netMonthlyPay: 140000,
    currency: "INR",
    effectiveFrom: "2026-01-01",
    updatedBy: "amaizy1@gmail.com",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  emp_1002: {
    employeeId: "emp_1002",
    baseSalary: 75000,
    hraAllowance: 18000,
    specialAllowance: 8000,
    medicalAllowance: 3000,
    pfDeduction: 7500,
    tdsDeduction: 6500,
    otherDeductions: 0,
    netMonthlyPay: 90000,
    currency: "INR",
    effectiveFrom: "2026-01-01",
    updatedBy: "amaizy1@gmail.com",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  emp_1003: {
    employeeId: "emp_1003",
    baseSalary: 150000,
    hraAllowance: 40000,
    specialAllowance: 20000,
    medicalAllowance: 5000,
    pfDeduction: 15000,
    tdsDeduction: 25000,
    otherDeductions: 0,
    netMonthlyPay: 175000,
    currency: "INR",
    effectiveFrom: "2026-01-01",
    updatedBy: "amaizy1@gmail.com",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  emp_1004: {
    employeeId: "emp_1004",
    baseSalary: 160000,
    hraAllowance: 42000,
    specialAllowance: 22000,
    medicalAllowance: 6000,
    pfDeduction: 16000,
    tdsDeduction: 28000,
    otherDeductions: 0,
    netMonthlyPay: 186000,
    currency: "INR",
    effectiveFrom: "2026-01-01",
    updatedBy: "amaizy1@gmail.com",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  emp_1005: {
    employeeId: "emp_1005",
    baseSalary: 65000,
    hraAllowance: 15000,
    specialAllowance: 6000,
    medicalAllowance: 2500,
    pfDeduction: 6500,
    tdsDeduction: 5000,
    otherDeductions: 0,
    netMonthlyPay: 77000,
    currency: "INR",
    effectiveFrom: "2026-01-01",
    updatedBy: "amaizy1@gmail.com",
    updatedAt: "2026-01-01T00:00:00.000Z"
  }
};

// Default Sample Bonuses
const DEFAULT_BONUSES: BonusIncentiveRecord[] = [
  {
    id: "bon_1",
    employeeId: "emp_1001",
    employeeName: "Alex Morgan",
    amount: 25000,
    bonusType: "PERFORMANCE",
    title: "Q2 Options Settlement Performance Bonus",
    monthYear: "2026-06",
    status: "PAID",
    approvedBy: "amaizy1@gmail.com",
    approvedAt: "2026-06-28T12:00:00.000Z",
    notes: "Exceeded pool liquidity target by 35%",
    createdAt: "2026-06-25T10:00:00.000Z"
  },
  {
    id: "bon_2",
    employeeId: "emp_1002",
    employeeName: "Priya Sharma",
    amount: 10000,
    bonusType: "COMMISSION",
    title: "Support CSAT Excellence Reward",
    monthYear: "2026-07",
    status: "APPROVED",
    approvedBy: "amaizy1@gmail.com",
    approvedAt: "2026-07-20T14:30:00.000Z",
    notes: "Maintained 99.2% customer satisfaction score",
    createdAt: "2026-07-15T11:00:00.000Z"
  }
];

// Default Sample Payroll Run for June 2026
const DEFAULT_PAYROLL_RUNS: MonthlyPayrollRun[] = [
  {
    id: "pr_2026_06",
    monthYear: "2026-06",
    totalEmployeesCount: 5,
    totalBaseSalary: 570000,
    totalAllowances: 217000,
    totalDeductions: 139000,
    totalBonuses: 25000,
    totalNetPayout: 673000,
    status: "DISBURSED",
    createdBy: "hr.lead@platform.com",
    createdByName: "Sarah Jenkins",
    createdAt: "2026-06-28T09:00:00.000Z",
    approvedBy: "amaizy1@gmail.com",
    approvedByName: "Master Platform Owner",
    approvedAt: "2026-06-29T10:00:00.000Z",
    disbursedBy: "hr.lead@platform.com",
    disbursedByName: "Sarah Jenkins",
    disbursedAt: "2026-06-30T15:00:00.000Z",
    notes: "June 2026 Regular Monthly Disbarment"
  }
];

// Helper to compute net monthly pay
export function computeNetSalary(record: Partial<EmployeeSalaryRecord>): number {
  const base = Number(record.baseSalary || 0);
  const hra = Number(record.hraAllowance || 0);
  const special = Number(record.specialAllowance || 0);
  const medical = Number(record.medicalAllowance || 0);
  const pf = Number(record.pfDeduction || 0);
  const tds = Number(record.tdsDeduction || 0);
  const other = Number(record.otherDeductions || 0);

  const totalEarnings = base + hra + special + medical;
  const totalDeductions = pf + tds + other;
  return Math.max(0, totalEarnings - totalDeductions);
}

// Check HR Permissions
export function hasHrPermission(actor: HrManagerAccount | null, permission: HrStaffPermission): boolean {
  if (!actor) return false;
  if (actor.status === "SUSPENDED") return false;
  if (actor.role === "OWNER") return true; // Owner has absolute authority
  return actor.permissions.includes(permission);
}

// Static & On-Demand Data Fetches (replaces persistent onSnapshot listeners to reduce reads)
export function subscribeHrManagers(callback: (accounts: HrManagerAccount[]) => void) {
  let active = true;
  try {
    const q = query(collection(db, "hr_managers"));
    getDocs(q).then((snapshot) => {
      if (!active) return;
      if (snapshot.empty) {
        callback([DEFAULT_HR_OWNER, DEFAULT_HR_MANAGER]);
      } else {
        const list: HrManagerAccount[] = [];
        snapshot.forEach(doc => list.push(doc.data() as HrManagerAccount));
        callback(list);
      }
    }).catch((err) => {
      console.warn("Firestore hr_managers fetch fallback:", err);
      callback([DEFAULT_HR_OWNER, DEFAULT_HR_MANAGER]);
    });
  } catch (e) {
    callback([DEFAULT_HR_OWNER, DEFAULT_HR_MANAGER]);
  }
  return () => { active = false; };
}

export function subscribeEmployees(callback: (employees: EmployeeProfile[]) => void) {
  try {
    const q = query(collection(db, "hr_employees"));
    return onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        callback(DEFAULT_EMPLOYEES);
      } else {
        const list: EmployeeProfile[] = [];
        snapshot.forEach(doc => list.push(doc.data() as EmployeeProfile));
        callback(list);
      }
    }, (err) => {
      console.warn("Firestore hr_employees fetch fallback:", err);
      callback(DEFAULT_EMPLOYEES);
    });
  } catch (e) {
    callback(DEFAULT_EMPLOYEES);
    return () => {};
  }
}

export function subscribeSalaryRecords(callback: (salaries: Record<string, EmployeeSalaryRecord>) => void) {
  try {
    const q = query(collection(db, "hr_employee_salaries"));
    return onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        callback(DEFAULT_SALARY_RECORDS);
      } else {
        const map: Record<string, EmployeeSalaryRecord> = {};
        snapshot.forEach(doc => {
          const data = doc.data() as EmployeeSalaryRecord;
          map[data.employeeId] = data;
        });
        callback(map);
      }
    }, (err) => {
      console.warn("Firestore hr_employee_salaries fetch fallback:", err);
      callback(DEFAULT_SALARY_RECORDS);
    });
  } catch (e) {
    callback(DEFAULT_SALARY_RECORDS);
    return () => {};
  }
}

export function subscribeBonuses(callback: (bonuses: BonusIncentiveRecord[]) => void) {
  let active = true;
  try {
    const q = query(collection(db, "hr_bonuses"));
    getDocs(q).then((snapshot) => {
      if (!active) return;
      if (snapshot.empty) {
        callback(DEFAULT_BONUSES);
      } else {
        const list: BonusIncentiveRecord[] = [];
        snapshot.forEach(doc => list.push(doc.data() as BonusIncentiveRecord));
        callback(list);
      }
    }).catch((err) => {
      console.warn("Firestore hr_bonuses fetch fallback:", err);
      callback(DEFAULT_BONUSES);
    });
  } catch (e) {
    callback(DEFAULT_BONUSES);
  }
  return () => { active = false; };
}

export function subscribePayrollRuns(callback: (runs: MonthlyPayrollRun[]) => void) {
  let active = true;
  try {
    const q = query(collection(db, "hr_payroll_runs"));
    getDocs(q).then((snapshot) => {
      if (!active) return;
      if (snapshot.empty) {
        callback(DEFAULT_PAYROLL_RUNS);
      } else {
        const list: MonthlyPayrollRun[] = [];
        snapshot.forEach(doc => list.push(doc.data() as MonthlyPayrollRun));
        callback(list);
      }
    }).catch((err) => {
      console.warn("Firestore hr_payroll_runs fetch fallback:", err);
      callback(DEFAULT_PAYROLL_RUNS);
    });
  } catch (e) {
    callback(DEFAULT_PAYROLL_RUNS);
  }
  return () => { active = false; };
}

export function subscribePayslips(callback: (slips: PayslipRecord[]) => void) {
  let active = true;
  try {
    const q = query(collection(db, "hr_payslips"));
    getDocs(q).then((snapshot) => {
      if (!active) return;
      const list: PayslipRecord[] = [];
      snapshot.forEach(doc => list.push(doc.data() as PayslipRecord));
      callback(list);
    }).catch((err) => {
      console.warn("Firestore hr_payslips fetch fallback:", err);
      callback([]);
    });
  } catch (e) {
    callback([]);
  }
  return () => { active = false; };
}

export function subscribeHrAuditLogs(callback: (logs: HrAuditLog[]) => void) {
  let active = true;
  try {
    const q = query(collection(db, "hr_audit_logs"), orderBy("timestamp", "desc"), limit(100));
    getDocs(q).then((snapshot) => {
      if (!active) return;
      const list: HrAuditLog[] = [];
      snapshot.forEach(doc => list.push(doc.data() as HrAuditLog));
      callback(list);
    }).catch((err) => {
      console.warn("Firestore hr_audit_logs fetch fallback:", err);
      callback([]);
    });
  } catch (e) {
    callback([]);
  }
  return () => { active = false; };
}

// Audit Logging Service
export async function logHrAuditAction(logData: {
  actorEmail: string;
  actorRole: string;
  action: string;
  targetEmployeeId?: string;
  targetEmployeeName?: string;
  fieldName?: string;
  previousValue?: string;
  newValue?: string;
  notes?: string;
}) {
  const logId = `hr_log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const log: HrAuditLog = {
    id: logId,
    timestamp: new Date().toISOString(),
    actorEmail: logData.actorEmail,
    actorRole: logData.actorRole,
    action: logData.action,
    targetEmployeeId: logData.targetEmployeeId || "",
    targetEmployeeName: logData.targetEmployeeName || "",
    fieldName: logData.fieldName || "",
    previousValue: logData.previousValue || "",
    newValue: logData.newValue || "",
    ipAddress: "127.0.0.1",
    device: navigator?.userAgent?.slice(0, 80) || "Browser Instance",
    notes: logData.notes || ""
  };

  try {
    await setDoc(doc(db, "hr_audit_logs", logId), log);
  } catch (err) {
    console.warn("Could not write HR Audit log to Firestore:", err);
  }
}

// Manager & Staff Account Operations (Owner Only)
export async function saveHrManagerAccount(
  account: Partial<HrManagerAccount>,
  actor: HrManagerAccount,
  pin: string
): Promise<{ success: boolean; message: string }> {
  if (actor.role !== "OWNER") {
    return { success: false, message: "Only the Platform Owner can manage HR/Payroll Managers." };
  }

  if (!account.email || !account.name) {
    return { success: false, message: "Email and Full Name are required." };
  }

  const isNew = !account.id;
  const id = account.id || `hr_mgr_${Date.now()}`;

  const managerData: HrManagerAccount = {
    id,
    email: account.email.trim().toLowerCase(),
    name: account.name.trim(),
    role: account.role || "HR_PAYROLL_MANAGER",
    permissions: account.permissions || ALL_HR_PERMISSIONS.map(p => p.key).filter(p => p !== "manage_hr_managers"),
    status: account.status || "ACTIVE",
    createdAt: account.createdAt || new Date().toISOString(),
    createdBy: actor.email,
    lastLoginAt: account.lastLoginAt || null,
    isOwnerImmutable: account.isOwnerImmutable || false
  };

  try {
    await setDoc(doc(db, "hr_managers", id), managerData);
    await logHrAuditAction({
      actorEmail: actor.email,
      actorRole: actor.role,
      action: isNew ? "CREATE_HR_MANAGER" : "UPDATE_HR_MANAGER",
      targetEmployeeName: managerData.name,
      notes: `Configured manager account for ${managerData.email}`
    });
    return { success: true, message: `HR Manager account ${managerData.name} saved successfully.` };
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to save HR Manager account." };
  }
}

export async function toggleHrManagerStatus(
  managerId: string,
  newStatus: "ACTIVE" | "SUSPENDED",
  actor: HrManagerAccount
): Promise<{ success: boolean; message: string }> {
  if (actor.role !== "OWNER") {
    return { success: false, message: "Only the Platform Owner can suspend/reactivate HR Managers." };
  }

  try {
    const docRef = doc(db, "hr_managers", managerId);
    const snap = await getDoc(docRef);
    if (snap.exists() && snap.data().isOwnerImmutable) {
      return { success: false, message: "Owner account cannot be suspended or modified." };
    }

    await updateDoc(docRef, { status: newStatus });
    await logHrAuditAction({
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "TOGGLE_HR_MANAGER_STATUS",
      newValue: newStatus,
      notes: `Changed status for manager ${managerId} to ${newStatus}`
    });
    return { success: true, message: `Manager account status updated to ${newStatus}.` };
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to update account status." };
  }
}

// Employee Profile & Salary Operations
export async function saveEmployeeProfile(
  employee: Partial<EmployeeProfile>,
  salary: Partial<EmployeeSalaryRecord>,
  actor: HrManagerAccount
): Promise<{ success: boolean; message: string }> {
  if (!hasHrPermission(actor, "manage_employee_profiles")) {
    return { success: false, message: "Permission denied: Requires 'manage_employee_profiles' permission." };
  }

  if (!employee.fullName || !employee.email || !employee.designation || !employee.department) {
    return { success: false, message: "Please fill in all required employee profile fields." };
  }

  const isNew = !employee.id;
  const empId = employee.id || `emp_${Date.now()}`;
  const empCode = employee.employeeCode || `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

  const profileData: EmployeeProfile = {
    id: empId,
    employeeCode: empCode,
    fullName: employee.fullName.trim(),
    email: employee.email.trim().toLowerCase(),
    phone: employee.phone || "",
    designation: employee.designation.trim(),
    department: employee.department.trim(),
    dateOfJoining: employee.dateOfJoining || new Date().toISOString().slice(0, 10),
    employmentType: employee.employmentType || "FULL_TIME",
    status: employee.status || "ACTIVE",
    bankName: employee.bankName || "",
    accountNumber: employee.accountNumber || "",
    ifscOrRoutingCode: employee.ifscOrRoutingCode || "",
    taxIdPan: employee.taxIdPan || "",
    notes: employee.notes || "",
    allowSelfPayslipView: employee.allowSelfPayslipView ?? true,
    createdAt: employee.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Salary calculation
  const computedNet = computeNetSalary(salary);
  const salaryData: EmployeeSalaryRecord = {
    employeeId: empId,
    baseSalary: Number(salary.baseSalary || 0),
    hraAllowance: Number(salary.hraAllowance || 0),
    specialAllowance: Number(salary.specialAllowance || 0),
    medicalAllowance: Number(salary.medicalAllowance || 0),
    pfDeduction: Number(salary.pfDeduction || 0),
    tdsDeduction: Number(salary.tdsDeduction || 0),
    otherDeductions: Number(salary.otherDeductions || 0),
    netMonthlyPay: computedNet,
    currency: salary.currency || "INR",
    effectiveFrom: salary.effectiveFrom || new Date().toISOString().slice(0, 10),
    updatedBy: actor.email,
    updatedAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, "hr_employees", empId), profileData);
    await setDoc(doc(db, "hr_employee_salaries", empId), salaryData);

    await logHrAuditAction({
      actorEmail: actor.email,
      actorRole: actor.role,
      action: isNew ? "CREATE_EMPLOYEE" : "UPDATE_EMPLOYEE_PROFILE",
      targetEmployeeId: empId,
      targetEmployeeName: profileData.fullName,
      newValue: `Net Salary: ₹${computedNet}`,
      notes: `Saved employee profile and salary structure`
    });

    return { success: true, message: `Employee ${profileData.fullName} saved successfully.` };
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to save employee profile." };
  }
}

// Delete Employee Profile & Salary Record
export async function deleteEmployeeProfile(
  employeeId: string,
  actor: HrManagerAccount
): Promise<{ success: boolean; message: string }> {
  if (!hasHrPermission(actor, "manage_employee_profiles")) {
    return { success: false, message: "Permission denied: Requires 'manage_employee_profiles' permission." };
  }

  try {
    // If the hr_employees collection in Firestore is empty, seed initial defaults first so deletion persists properly
    const empsCol = collection(db, "hr_employees");
    const snap = await getDocs(empsCol);
    if (snap.empty) {
      for (const emp of DEFAULT_EMPLOYEES) {
        await setDoc(doc(db, "hr_employees", emp.id), emp);
        const sal = DEFAULT_SALARY_RECORDS[emp.id];
        if (sal) {
          await setDoc(doc(db, "hr_employee_salaries", emp.id), sal);
        }
      }
    }

    // Fetch employee details before deletion for audit logging
    const empDocRef = doc(db, "hr_employees", employeeId);
    const empSnap = await getDoc(empDocRef);
    const empData = empSnap.exists() ? (empSnap.data() as EmployeeProfile) : null;
    const empName = empData?.fullName || employeeId;

    await deleteDoc(empDocRef);
    await deleteDoc(doc(db, "hr_employee_salaries", employeeId));

    await logHrAuditAction({
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "DELETE_EMPLOYEE",
      targetEmployeeId: employeeId,
      targetEmployeeName: empName,
      previousValue: empName,
      newValue: "DELETED",
      notes: `Deleted employee profile (${empName}) and salary structure`
    });

    return { success: true, message: `Employee '${empName}' deleted successfully.` };
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to delete employee profile." };
  }
}

// Update Base Salary / Deductions with Audit Trail
export async function updateEmployeeSalaryWithAudit(
  employeeId: string,
  employeeName: string,
  newSalary: Partial<EmployeeSalaryRecord>,
  oldSalary: EmployeeSalaryRecord | undefined,
  actor: HrManagerAccount
): Promise<{ success: boolean; message: string }> {
  if (!hasHrPermission(actor, "manage_salary_records")) {
    return { success: false, message: "Permission denied: Requires 'manage_salary_records' permission." };
  }

  const computedNet = computeNetSalary(newSalary);
  const salaryData: EmployeeSalaryRecord = {
    employeeId,
    baseSalary: Number(newSalary.baseSalary || 0),
    hraAllowance: Number(newSalary.hraAllowance || 0),
    specialAllowance: Number(newSalary.specialAllowance || 0),
    medicalAllowance: Number(newSalary.medicalAllowance || 0),
    pfDeduction: Number(newSalary.pfDeduction || 0),
    tdsDeduction: Number(newSalary.tdsDeduction || 0),
    otherDeductions: Number(newSalary.otherDeductions || 0),
    netMonthlyPay: computedNet,
    currency: newSalary.currency || "INR",
    effectiveFrom: newSalary.effectiveFrom || new Date().toISOString().slice(0, 10),
    updatedBy: actor.email,
    updatedAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, "hr_employee_salaries", employeeId), salaryData);

    // Audit logs for salary changes
    const prevNet = oldSalary ? oldSalary.netMonthlyPay : 0;
    const prevBase = oldSalary ? oldSalary.baseSalary : 0;

    await logHrAuditAction({
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "UPDATE_SALARY_RECORD",
      targetEmployeeId: employeeId,
      targetEmployeeName: employeeName,
      fieldName: "Base Salary / Net Pay",
      previousValue: `Base: ₹${prevBase}, Net: ₹${prevNet}`,
      newValue: `Base: ₹${salaryData.baseSalary}, Net: ₹${computedNet}`,
      notes: `Updated salary breakdown structure`
    });

    return { success: true, message: `Salary record for ${employeeName} updated successfully.` };
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to update salary." };
  }
}

// Bonus & Incentive Operations
export async function createBonusRecord(
  bonus: Partial<BonusIncentiveRecord>,
  actor: HrManagerAccount
): Promise<{ success: boolean; message: string }> {
  if (!hasHrPermission(actor, "manage_bonuses")) {
    return { success: false, message: "Permission denied: Requires 'manage_bonuses' permission." };
  }

  if (!bonus.employeeId || !bonus.amount || !bonus.title) {
    return { success: false, message: "Employee, Amount, and Bonus Title are required." };
  }

  const bonusId = `bon_${Date.now()}`;
  const record: BonusIncentiveRecord = {
    id: bonusId,
    employeeId: bonus.employeeId,
    employeeName: bonus.employeeName || "Employee",
    amount: Number(bonus.amount),
    bonusType: bonus.bonusType || "PERFORMANCE",
    title: bonus.title.trim(),
    monthYear: bonus.monthYear || new Date().toISOString().slice(0, 7),
    status: bonus.status || (actor.role === "OWNER" ? "APPROVED" : "PENDING"),
    approvedBy: actor.role === "OWNER" ? actor.email : undefined,
    approvedAt: actor.role === "OWNER" ? new Date().toISOString() : undefined,
    notes: bonus.notes || "",
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, "hr_bonuses", bonusId), record);
    await logHrAuditAction({
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "GRANT_BONUS_INCENTIVE",
      targetEmployeeId: bonus.employeeId,
      targetEmployeeName: bonus.employeeName,
      newValue: `₹${record.amount} (${record.title})`,
      notes: `Status: ${record.status}`
    });
    return { success: true, message: `Bonus request created for ${record.employeeName}.` };
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to record bonus." };
  }
}

// Monthly Payroll Batch Creation & Disbursement
export async function createMonthlyPayrollRunBatch(
  monthYear: string,
  employees: EmployeeProfile[],
  salaries: Record<string, EmployeeSalaryRecord>,
  bonuses: BonusIncentiveRecord[],
  notes: string,
  actor: HrManagerAccount
): Promise<{ success: boolean; message: string }> {
  if (!hasHrPermission(actor, "create_payroll_run")) {
    return { success: false, message: "Permission denied: Requires 'create_payroll_run' permission." };
  }

  const runId = `pr_${monthYear.replace("-", "_")}_${Date.now().toString().slice(-4)}`;

  const activeEmps = employees.filter(e => e.status === "ACTIVE");
  let totalBase = 0;
  let totalAllowances = 0;
  let totalDeductions = 0;
  let totalBonuses = 0;

  activeEmps.forEach(emp => {
    const sal = salaries[emp.id];
    if (sal) {
      totalBase += Number(sal.baseSalary || 0);
      totalAllowances += Number(sal.hraAllowance || 0) + Number(sal.specialAllowance || 0) + Number(sal.medicalAllowance || 0);
      totalDeductions += Number(sal.pfDeduction || 0) + Number(sal.tdsDeduction || 0) + Number(sal.otherDeductions || 0);
    }
  });

  // Calculate approved bonuses for this monthYear
  bonuses
    .filter(b => b.monthYear === monthYear && (b.status === "APPROVED" || b.status === "PAID"))
    .forEach(b => totalBonuses += Number(b.amount || 0));

  const totalNet = (totalBase + totalAllowances + totalBonuses) - totalDeductions;

  const run: MonthlyPayrollRun = {
    id: runId,
    monthYear,
    totalEmployeesCount: activeEmps.length,
    totalBaseSalary: totalBase,
    totalAllowances,
    totalDeductions,
    totalBonuses,
    totalNetPayout: Math.max(0, totalNet),
    status: actor.role === "OWNER" ? "APPROVED_BY_OWNER" : "SUBMITTED_FOR_APPROVAL",
    createdBy: actor.email,
    createdByName: actor.name,
    createdAt: new Date().toISOString(),
    approvedBy: actor.role === "OWNER" ? actor.email : undefined,
    approvedByName: actor.role === "OWNER" ? actor.name : undefined,
    approvedAt: actor.role === "OWNER" ? new Date().toISOString() : undefined,
    notes: notes || `Payroll batch calculation for ${monthYear}`
  };

  try {
    await setDoc(doc(db, "hr_payroll_runs", runId), run);
    await logHrAuditAction({
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "CREATE_PAYROLL_RUN_BATCH",
      newValue: `Month: ${monthYear}, Total Net: ₹${totalNet}, Employees: ${activeEmps.length}`,
      notes: `Status set to ${run.status}`
    });
    return { success: true, message: `Payroll batch for ${monthYear} created successfully.` };
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to create payroll batch." };
  }
}

// Approve Payroll Batch (Owner Approval required)
export async function approvePayrollRunBatch(
  runId: string,
  actor: HrManagerAccount
): Promise<{ success: boolean; message: string }> {
  if (actor.role !== "OWNER" && !hasHrPermission(actor, "approve_payroll_run")) {
    return { success: false, message: "Only the Platform Owner or authorized director can approve major payroll batches." };
  }

  try {
    const docRef = doc(db, "hr_payroll_runs", runId);
    await updateDoc(docRef, {
      status: "APPROVED_BY_OWNER",
      approvedBy: actor.email,
      approvedByName: actor.name,
      approvedAt: new Date().toISOString()
    });

    await logHrAuditAction({
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "APPROVE_PAYROLL_RUN_BATCH",
      newValue: `Run ID: ${runId}`,
      notes: `Approved by Owner ${actor.name}`
    });

    return { success: true, message: "Payroll run batch approved by Owner." };
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to approve payroll batch." };
  }
}

// Disburse Payroll Batch & Generate Payslips
export async function disbursePayrollRunAndGeneratePayslips(
  run: MonthlyPayrollRun,
  employees: EmployeeProfile[],
  salaries: Record<string, EmployeeSalaryRecord>,
  bonuses: BonusIncentiveRecord[],
  actor: HrManagerAccount
): Promise<{ success: boolean; message: string }> {
  if (!hasHrPermission(actor, "disburse_payroll")) {
    return { success: false, message: "Permission denied: Requires 'disburse_payroll' permission." };
  }

  try {
    const activeEmps = employees.filter(e => e.status === "ACTIVE");

    for (const emp of activeEmps) {
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

      // Sum bonuses for this employee for this month
      const empBonus = bonuses
        .filter(b => b.employeeId === emp.id && b.monthYear === run.monthYear && (b.status === "APPROVED" || b.status === "PAID"))
        .reduce((acc, curr) => acc + curr.amount, 0);

      const totalEarnings = sal.baseSalary + sal.hraAllowance + sal.specialAllowance + sal.medicalAllowance + empBonus;
      const totalDeductions = sal.pfDeduction + sal.tdsDeduction + sal.otherDeductions;
      const netSalary = Math.max(0, totalEarnings - totalDeductions);

      const payslipId = `ps_${run.id}_${emp.id}`;
      const payslip: PayslipRecord = {
        id: payslipId,
        payrollRunId: run.id,
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: emp.fullName,
        employeeEmail: emp.email,
        designation: emp.designation,
        department: emp.department,
        monthYear: run.monthYear,
        workingDays: 22,
        leavesTaken: 0,
        baseSalary: sal.baseSalary,
        hraAllowance: sal.hraAllowance,
        specialAllowance: sal.specialAllowance,
        medicalAllowance: sal.medicalAllowance,
        bonusAmount: empBonus,
        totalEarnings,
        pfDeduction: sal.pfDeduction,
        tdsDeduction: sal.tdsDeduction,
        otherDeductions: sal.otherDeductions,
        totalDeductions,
        netSalary,
        status: "PAID",
        paidAt: new Date().toISOString(),
        paymentMethod: "DIRECT_BANK_TRANSFER",
        transactionReference: `NEFT-PAY-${Date.now().toString().slice(-8)}`,
        generatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, "hr_payslips", payslipId), payslip);
    }

    // Update payroll run status to DISBURSED
    await updateDoc(doc(db, "hr_payroll_runs", run.id), {
      status: "DISBURSED",
      disbursedBy: actor.email,
      disbursedByName: actor.name,
      disbursedAt: new Date().toISOString()
    });

    await logHrAuditAction({
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "DISBURSE_PAYROLL_RUN",
      newValue: `Generated ${activeEmps.length} payslips for batch ${run.monthYear}`,
      notes: `Disbursed total ₹${run.totalNetPayout}`
    });

    return { success: true, message: `Disbursement completed! ${activeEmps.length} payslips generated.` };
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to disburse payroll." };
  }
}
