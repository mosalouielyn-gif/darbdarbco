import { useEffect, useMemo, useState } from "react";
import { DarbcoLayout } from "../darbco-layout";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { DateInput } from "../ui/date-input";
import {
  LayoutDashboard, ClipboardCheck, PackagePlus, Activity, FileBarChart2, History, Users, Settings,
  TrendingUp, AlertTriangle, Wallet, CheckCircle2, Eye, Undo2, Plus, ArrowRight, Edit, Power, Loader2, UserPlus,
  Database, Trash2, LockKeyhole,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Role, ROLE_LABELS, User } from "../types";
import { toast } from "sonner";
import { useAppData } from "../../lib/app-data-context";
import {
  approvePayrollSlipByManager,
  approveRestockRequest,
  createBeneficiary,
  createUserAccount,
  deleteAllMaintenanceTables,
  fetchMaintenanceTables,
  MaintenanceTable,
  returnPayrollSlipByManager,
  returnRestockRequest,
  updateBeneficiary,
  updateBeneficiaryStatus,
  updateRolePermissions,
  updateUserAccount,
  updateUserAccountStatus,
  verifyAdminPassword,
} from "../../lib/api";
import { currentSystemDateTime, databaseDateKey, formatDatabaseDateTime, formatSystemDate, parseDatabaseTimestamp, SYSTEM_TIME_ZONE, todaySystemDate } from "../../lib/date-time";
import { usePersistentState } from "../../lib/use-persistent-state";

interface Props { user: User; onLogout: () => void }

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "payroll", label: "Payroll Approvals", icon: <ClipboardCheck className="h-4 w-4" /> },
  { id: "payroll-history", label: "Payroll History", icon: <History className="h-4 w-4" /> },
  { id: "restock", label: "Restock Requests", icon: <PackagePlus className="h-4 w-4" /> },
  { id: "reports", label: "Reports", icon: <FileBarChart2 className="h-4 w-4" /> },
  { id: "audit", label: "Audit History", icon: <History className="h-4 w-4" /> },
  { id: "users", label: "User Management", icon: <Users className="h-4 w-4" /> },
  { id: "beneficiary-harvester", label: "Beneficiary / Harvester", icon: <UserPlus className="h-4 w-4" /> },
  { id: "database-cleanup", label: "Database Cleanup", icon: <Database className="h-4 w-4" /> },
  { id: "settings", label: "Settings / Role Access", icon: <Settings className="h-4 w-4" /> },
];

interface PayrollRow {
  dbId?: number;
  id: string; name: string; date: string; period: string; gross: number; deductions: number; net: number;
  validatedBy: string; status: "Draft" | "Submitted" | "Validated" | "Approved" | "Returned";
  returnReason?: string;
}
interface RestockRow {
  dbId?: number;
  id: string; item: string; category: string; currentStock: number; reorder: number;
  qty: number; requestedBy: string; date: string; status: "Pending Review" | "Approved" | "Returned";
  returnReason?: string;
}
interface AuditRow {
  id?: string; ts: string; user: string; role?: string; action: "Validated" | "Submitted" | "Approved" | "Returned" | "Created" | "Updated" | "Activated" | "Deactivated" | "Deleted"; module: string; affectedRecord?: string; description: string; remarks?: string; status: "Completed" | "Returned";
}
interface Account {
  id: string; name: string; email: string; username: string; role: Role; active: boolean; lastLogin: string;
  createdAt?: string; contact?: string; remarks?: string;
}
interface MasterBeneficiary {
  id: string;
  name: string;
  code: string;
  contact: string;
  address: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}
interface RolePermission {
  role: Role;
  permission: string;
  allowed: boolean;
}
interface ProductionSummaryRow {
  date: string;
  first: string;
  last: string;
  classA: number;
  classB: number;
  special: number;
  total: number;
}

const PAYROLL_SEED: PayrollRow[] = [];

const RESTOCK_SEED: RestockRow[] = [];

const AUDIT_SEED: AuditRow[] = [];

const USERS_SEED: Account[] = [];

const MONTHLY_PRODUCTION: { day: string; boxes: number }[] = [];

const HARVEST_7: { day: string; boxes: number }[] = [];

const TOP_WORKERS: { rank: number; name: string; output: number }[] = [];

const MANILA_TIME_ZONE = SYSTEM_TIME_ZONE;

export function ManagerAdminDashboard({ user, onLogout }: Props) {
  const { data } = useAppData();
  const [active, setActive] = usePersistentState("darbco.managerAdmin.active", "dashboard");
  const [payroll, setPayroll] = useState(PAYROLL_SEED);
  const [restock, setRestock] = useState(RESTOCK_SEED);
  const [audit, setAudit] = useState(AUDIT_SEED);
  const [users, setUsers] = useState(USERS_SEED);
  const [beneficiaries, setBeneficiaries] = useState<MasterBeneficiary[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);

  useEffect(() => {
    setPayroll((data?.payrollSlips ?? []).map(mapPayrollRow).filter(Boolean) as PayrollRow[]);
  }, [data?.payrollSlips]);

  useEffect(() => {
    setRolePermissions((data?.rolePermissions ?? []).map(mapRolePermission));
  }, [data?.rolePermissions]);

  useEffect(() => {
    if (data?.restockRequests?.length) {
      setRestock(data.restockRequests.map(mapRestockRow));
    }
  }, [data?.restockRequests]);

  useEffect(() => {
    if (data?.users?.length) {
      setUsers(data.users.map(mapAccount));
    }
  }, [data?.users]);

  useEffect(() => {
    setBeneficiaries((data?.beneficiaries ?? []).map(mapBeneficiary));
  }, [data?.beneficiaries]);

  useEffect(() => {
    if (data?.auditLogs?.length) {
      setAudit(data.auditLogs.map((log: any) => ({
        ts: log.created_at || "",
        user: log.user_name || "System",
        role: log.role ? normalizeRole(log.role) : "",
        action: normalizeAuditAction(log.action),
        module: log.module || "System",
        affectedRecord: log.affected_record || "",
        description: log.details || `${log.action || "Updated"} ${log.module || "record"}`,
        remarks: log.remarks || "",
        status: log.action === "Returned" ? "Returned" : "Completed",
      })));
    }
  }, [data?.auditLogs]);

  const approvePayroll = async (id: string) => {
    const row = payroll.find((item) => item.id === id);
    try {
      const saved = await approvePayrollSlipByManager(row?.dbId ?? id, {
        user_id: Number(user.id) || undefined,
        user_name: user.name,
        remarks: `Manager approved payroll ${id}.`,
      });
      const mapped = mapPayrollRow(saved);
      if (mapped) {
        setPayroll((cur) => cur.map((r) => r.id === id ? mapped : r));
      }
      setAudit((cur) => [{ ts: now(), user: user.name, role: user.role, action: "Approved", module: "Payroll", description: `Approved payroll ${id}`, status: "Completed" }, ...cur]);
      toast.success(`${id} approved`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to approve payroll.");
      throw error;
    }
  };
  const returnPayroll = async (id: string, reason: string) => {
    const row = payroll.find((item) => item.id === id);
    try {
      await returnPayrollSlipByManager(row?.dbId ?? id, {
        reason,
        user_id: Number(user.id) || undefined,
        user_name: user.name,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to return payroll.");
      throw error;
    }
    setPayroll((cur) => cur.map((r) => r.id === id ? { ...r, status: "Returned", returnReason: reason } : r));
    setAudit((cur) => [{ ts: now(), user: user.name, role: user.role, action: "Returned", module: "Payroll", description: `Returned payroll ${id} - ${reason}`, status: "Returned" }, ...cur]);
    toast.success(`${id} returned for correction`);
  };
  const approveRestock = async (id: string) => {
    const row = restock.find((request) => request.id === id);
    try {
      const saved = await approveRestockRequest(row?.dbId ?? id, {
        user_id: Number(user.id) || undefined,
        user_name: user.name,
      });
      setRestock((cur) => cur.map((r) => r.id === id ? mapRestockRow(saved) : r));
      setAudit((cur) => [{ ts: now(), user: user.name, role: user.role, action: "Approved", module: "Inventory", description: `Approved restock ${id}`, status: "Completed" }, ...cur]);
      toast.success(`${id} approved`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to approve restock request.");
    }
  };
  const returnRestock = async (id: string, reason: string) => {
    const row = restock.find((request) => request.id === id);
    try {
      const saved = await returnRestockRequest(row?.dbId ?? id, {
        reason,
        user_id: Number(user.id) || undefined,
        user_name: user.name,
      });
      setRestock((cur) => cur.map((r) => r.id === id ? mapRestockRow(saved) : r));
      setAudit((cur) => [{ ts: now(), user: user.name, role: user.role, action: "Returned", module: "Inventory", description: `Returned restock ${id} - ${reason}`, status: "Returned" }, ...cur]);
      toast.success(`${id} returned`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to return restock request.");
    }
  };

  return (
    <DarbcoLayout user={user} onLogout={onLogout} navItems={NAV} active={active} onChange={setActive}>
      {active === "dashboard" && <Dashboard goTo={setActive} payroll={payroll} restock={restock} audit={audit} inventoryItems={data?.inventoryItems || []} productionRecords={data?.productionRecords || []} userName={user.name} onApprovePayroll={approvePayroll} onReturnPayroll={returnPayroll} onApproveRestock={approveRestock} onReturnRestock={returnRestock} />}
      {active === "payroll" && <PayrollApprovals payroll={payroll} onApprove={approvePayroll} onReturn={returnPayroll} />}
      {active === "payroll-history" && <PayrollHistory payroll={payroll} />}
      {active === "restock" && <RestockRequests restock={restock} onApprove={approveRestock} onReturn={returnRestock} />}
      {active === "reports" && <Reports payroll={payroll} restock={restock} users={users} audit={audit} inventoryItems={data?.inventoryItems || []} productionRecords={data?.productionRecords || []} />}
      {active === "audit" && <AuditHistory audit={audit} />}
      {active === "users" && <UserManagement users={users} setUsers={setUsers} setAudit={setAudit} adminId={user.id} adminName={user.name} />}
      {active === "beneficiary-harvester" && <BeneficiaryHarvesterManagement beneficiaries={beneficiaries} setBeneficiaries={setBeneficiaries} users={users} setUsers={setUsers} setAudit={setAudit} adminId={user.id} adminName={user.name} />}
      {active === "database-cleanup" && <DatabaseCleanup adminId={user.id} adminName={user.name} adminEmail={user.email} setAudit={setAudit} />}
      {active === "settings" && <SettingsRoleAccess permissions={rolePermissions} setPermissions={setRolePermissions} adminId={user.id} adminName={user.name} />}
    </DarbcoLayout>
  );
}

function now() { return new Date().toISOString(); }

function formatDateLabel(value: string) {
  return formatSystemDate(value);
}

function parseAuditTimestamp(value: string) {
  if (!value) return null;
  const date = parseDatabaseTimestamp(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function auditDateParts(value: string) {
  const date = parseAuditTimestamp(value);
  if (!date) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function auditDateKey(value: string) {
  const parts = auditDateParts(value);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : value.slice(0, 10);
}

function formatAuditTimestamp(value: string) {
  const parts = auditDateParts(value);
  if (!parts) return value;
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute} ${parts.dayPeriod}`;
}

function normalizeRole(role: string): Role {
  return Object.prototype.hasOwnProperty.call(ROLE_LABELS, role) ? role as Role : "production_clerk";
}

function roleLabel(role?: string) {
  if (!role) return "";
  return ROLE_LABELS[normalizeRole(role)];
}

function normalizeAuditAction(action: string): AuditRow["action"] {
  if (action === "Validated" || action === "Submitted" || action === "Approved" || action === "Returned" || action === "Created" || action === "Updated" || action === "Activated" || action === "Deactivated" || action === "Deleted") return action;
  return "Submitted";
}

function mapAccount(row: any): Account {
  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    username: row.username || "",
    role: normalizeRole(row.role),
    active: row.active === true || row.active === 1 || row.active === "1",
    lastLogin: row.last_login_at ? formatDatabaseDateTime(row.last_login_at) : "-",
    createdAt: row.created_at ? formatDatabaseDateTime(row.created_at) : "-",
    contact: row.contact_information || row.contact || "",
    remarks: row.remarks || "",
  };
}

function mapBeneficiary(row: any): MasterBeneficiary {
  return {
    id: String(row.id),
    name: String(row.name ?? row.full_name ?? row.beneficiary_name ?? ""),
    code: String(row.code ?? row.beneficiary_code ?? ""),
    contact: String(row.contact_number ?? row.contact ?? ""),
    address: String(row.address ?? ""),
    active: row.active === undefined || row.active === true || row.active === 1 || row.active === "1",
    createdAt: row.created_at ? formatDatabaseDateTime(row.created_at) : "-",
    updatedAt: row.updated_at ? formatDatabaseDateTime(row.updated_at) : "-",
  };
}

function mapRolePermission(row: any): RolePermission {
  return {
    role: normalizeRole(row.role),
    permission: String(row.permission ?? ""),
    allowed: row.allowed === true || row.allowed === 1 || row.allowed === "1",
  };
}

function managerPayrollStatus(row: any): PayrollRow["status"] {
  if (row.approval_status === "Approved") return "Approved";
  if (row.validation_status === "Returned for Correction") return "Returned";
  if (row.validation_status === "Validated" || row.approval_status === "Pending Manager Approval") return "Validated";
  if (row.validation_status === "Submitted for Validation") return "Submitted";
  return "Draft";
}

function productionClassA(row: any) {
  return Number(row.class_a_big_hands ?? 0) + Number(row.class_a_small_hands ?? 0) + Number(row.class_a_cps ?? 0);
}

function productionClassB(row: any) {
  return Number(row.class_b_big_hands ?? 0) + Number(row.class_b_small_hands ?? 0) + Number(row.class_b_cps ?? 0);
}

function productionSpecial(row: any) {
  return Number(row.special_total ?? row.special_product ?? 0);
}

function productionDate(row: any) {
  return String(row.harvest_date ?? row.production_date ?? row.packing_date ?? "").slice(0, 10);
}

function productionSummaries(records: any[]): ProductionSummaryRow[] {
  const grouped = new Map<string, ProductionSummaryRow>();

  records.forEach((record) => {
    const date = productionDate(record);
    if (!date) return;
    const classA = productionClassA(record);
    const classB = productionClassB(record);
    const special = productionSpecial(record);
    const existing = grouped.get(date) ?? { date, first: record.record_no ?? "-", last: record.record_no ?? "-", classA: 0, classB: 0, special: 0, total: 0 };
    existing.last = record.record_no ?? existing.last;
    existing.classA += classA;
    existing.classB += classB;
    existing.special += special;
    existing.total += classA + classB + special;
    grouped.set(date, existing);
  });

  return Array.from(grouped.values()).sort((a, b) => b.date.localeCompare(a.date));
}

function mapPayrollRow(row: any): PayrollRow {
  const status = managerPayrollStatus(row);

  return {
    dbId: Number(row.id) || undefined,
    id: String(row.slip_no ?? row.id),
    name: row.beneficiary_name ?? "",
    date: formatDateLabel(databaseDateKey(row.approved_at ?? row.validated_at ?? row.submitted_at ?? row.created_at)),
    period: row.payroll_period ?? "",
    gross: Number(row.gross_amount ?? row.gross_income ?? 0),
    deductions: Number(row.total_deductions ?? 0),
    net: Number(row.net_amount ?? row.net_income ?? 0),
    validatedBy: row.validated_by_name ?? String(row.validated_by ?? "Finance Officer"),
    status,
    returnReason: row.return_reason ?? row.remarks ?? "",
  };
}

function mapRestockRow(row: any): RestockRow {
  return {
    dbId: Number(row.id) || undefined,
    id: String(row.request_no ?? row.id),
    item: row.material_name ?? "",
    category: row.category ?? "Not specified",
    currentStock: Number(row.current_quantity ?? 0),
    reorder: Number(row.minimum_stock ?? 0),
    qty: Number(row.requested_quantity ?? row.quantity ?? 0),
    requestedBy: row.requested_by_name ?? "Inventory Bookkeeper",
    date: formatDateLabel(databaseDateKey(row.requested_at ?? row.created_at ?? todaySystemDate())),
    status: row.status === "Pending" ? "Pending Review" : row.status === "Rejected" ? "Returned" : row.status === "Returned" ? "Returned" : row.status === "Cancelled" ? "Returned" : "Approved",
    returnReason: row.review_notes ?? "",
  };
}

function numericValue(record: any, keys: string[]) {
  for (const key of keys) {
    const value = Number(record?.[key]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function inventoryStatusCounts(inventoryItems: any[], restock: RestockRow[]) {
  if (inventoryItems.length > 0) {
    return inventoryItems.reduce((counts, item) => {
      const stock = String(item.status || item.stock_status || "").toLowerCase();
      const quantity = numericValue(item, ["onHand", "on_hand", "current_quantity", "quantity", "qty"]);
      const minimum = numericValue(item, ["minimumStock", "minimum_stock", "reorder", "reorder_point"]);

      if (stock.includes("out") || quantity <= 0) {
        counts.outOfStock += 1;
      } else if (stock.includes("low") || (minimum > 0 && quantity <= minimum)) {
        counts.lowStock += 1;
      }
      return counts;
    }, { lowStock: 0, outOfStock: 0 });
  }

  return restock.reduce((counts, item) => {
    if (item.currentStock <= 0) counts.outOfStock += 1;
    else if (item.currentStock <= item.reorder) counts.lowStock += 1;
    return counts;
  }, { lowStock: 0, outOfStock: 0 });
}

function Dashboard({ goTo, payroll, restock, audit, inventoryItems, productionRecords, userName, onApprovePayroll, onReturnPayroll, onApproveRestock, onReturnRestock }: {
  goTo: (id: string) => void;
  payroll: PayrollRow[]; restock: RestockRow[]; audit: AuditRow[]; inventoryItems: any[]; productionRecords: any[]; userName: string;
  onApprovePayroll: (id: string) => void; onReturnPayroll: (id: string, reason: string) => void;
  onApproveRestock: (id: string) => void; onReturnRestock: (id: string, reason: string) => void;
}) {
  const pendingPay = payroll.filter((r) => r.status === "Validated");
  const pendingPayAmount = pendingPay.reduce((s, r) => s + r.net, 0);
  const pendingRestock = restock.filter((r) => r.status === "Pending Review");
  const pendingRestockAmount = pendingRestock.reduce((sum, r) => sum + r.qty, 0);
  const approvedThisWeek = payroll.filter((r) => r.status === "Approved").length + restock.filter((r) => r.status === "Approved").length;
  const inventoryCounts = inventoryStatusCounts(inventoryItems, restock);
  const productionRows = productionSummaries(productionRecords);
  const productionToday = productionRows[0]?.total ?? 0;
  const monthlyProduction = productionRows.slice(0, 31).reverse().map((row) => ({ day: row.date.slice(5), boxes: row.total }));
  const monthlyTotal = monthlyProduction.reduce((sum, row) => sum + row.boxes, 0);

  const donutData = [
    { name: "Approved", value: payroll.filter((r) => r.status === "Approved").length, color: "#10b981" },
    { name: "Pending", value: pendingPay.length, color: "#f59e0b" },
    { name: "Returned", value: payroll.filter((r) => r.status === "Returned").length, color: "#ef4444" },
  ];
  const donutTotal = donutData.reduce((s, d) => s + d.value, 0);
  const recentAccountChanges = audit.filter((a) => a.module === "Users").slice(0, 4);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2"><LayoutDashboard className="h-6 w-6 text-emerald-700" />Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {userName} — overview of farm operations and approval queue.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
        <Kpi color="amber" icon={<AlertTriangle className="h-4 w-4" />} value={String(inventoryCounts.lowStock)} label="Low-Stock Items" sub="Manager monitoring" onClick={() => goTo("reports")} />
        <Kpi color="red" icon={<AlertTriangle className="h-4 w-4" />} value={String(inventoryCounts.outOfStock)} label="Out-of-Stock Items" sub="Critical inventory" onClick={() => goTo("reports")} />
        <Kpi color="amber" icon={<Wallet className="h-4 w-4" />} value={String(pendingPay.length)} label="Pending Payroll Approvals" sub={`₱${pendingPayAmount.toLocaleString()}.00`} onClick={() => goTo("payroll")} />
        <Kpi color="amber" icon={<AlertTriangle className="h-4 w-4" />} value={String(pendingRestock.length)} label="Pending Restock Requests" sub={`${pendingRestockAmount.toLocaleString()} units`} onClick={() => goTo("restock")} />
        <Kpi color="emerald" icon={<TrendingUp className="h-4 w-4" />} value={String(productionToday)} label="Production Today" sub="Boxes from production records" onClick={() => goTo("reports")} />
        <Kpi color="emerald" icon={<CheckCircle2 className="h-4 w-4" />} value={String(approvedThisWeek)} label="Approved This Week" sub="Transactions from database" onClick={() => goTo("audit")} />
      </div>

      <ProductionSummary records={productionRows} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-700" />Monthly Production (Boxes)</CardTitle>
            <Badge className="bg-emerald-100 text-emerald-800">{monthlyTotal.toLocaleString()} boxes</Badge>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <LineChart data={monthlyProduction}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" /><YAxis /><Tooltip />
                <Line type="monotone" dataKey="boxes" stroke="#047857" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Payroll Approvals (This Month)</CardTitle></CardHeader>
          <CardContent className="h-64 relative">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                  {donutData.map((d) => <Cell key={`cell-${d.name}`} fill={d.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-2xl">{donutTotal}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="flex justify-center gap-4 text-xs">
              {donutData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                  <span>{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4 text-emerald-700" />Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {audit.slice(0, 6).map((a, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <div className="flex-1">
                  <div>{a.description}</div>
                  <div className="text-xs text-muted-foreground">{a.ts} • {a.user} • {a.module}</div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto">
            <Button variant="link" className="text-emerald-700" onClick={() => goTo("audit")}>View full audit history →</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-emerald-700" />Recent Account Changes</CardTitle>
          <CardAction>
            <Button variant="link" className="h-auto p-0 text-emerald-700" onClick={() => goTo("audit")}>View audit logs</Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {recentAccountChanges.length === 0 ? (
            <div className="rounded-md border bg-slate-50 p-3 text-sm text-muted-foreground">No recent account changes recorded.</div>
          ) : (
            <ul className="space-y-3">
              {recentAccountChanges.map((a) => (
                <li key={`${a.ts}-${a.affectedRecord || a.description}`} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-sky-500 shrink-0" />
                  <div className="flex-1">
                    <div>{a.description}</div>
                    <div className="text-xs text-muted-foreground">{a.ts} - {a.user} - {a.action}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* hidden: silence unused */}
      <div className="hidden">{onReturnPayroll && onApproveRestock && onReturnRestock ? "" : ""}</div>
    </div>
  );
}

function ProductionSummary({ records }: { records: ProductionSummaryRow[] }) {
  const [viewDay, setViewDay] = useState<ProductionSummaryRow | null>(null);
  const today = records[0] ?? { date: "", first: "", last: "", classA: 0, classB: 0, special: 0, total: 0 };
  const totalToday = today.total;
  const pct = (n: number) => totalToday ? `${Math.round((n / totalToday) * 100)}%` : "0%";
  const dateLabel = today.date ? formatSystemDate(today.date, { month: "short", day: "2-digit", year: "numeric" }) : "No production records";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <SummaryCard color="emerald" icon={<TrendingUp className="h-4 w-4" />} label="Total Boxes Today" value={String(totalToday)} sub="100%" />
        <SummaryCard color="emerald" icon={<CheckCircle2 className="h-4 w-4" />} label="Class A Boxes" value={String(today.classA)} sub={pct(today.classA)} />
        <SummaryCard color="amber" icon={<CheckCircle2 className="h-4 w-4" />} label="Class B Boxes" value={String(today.classB)} sub={pct(today.classB)} />
        <SummaryCard color="violet" icon={<CheckCircle2 className="h-4 w-4" />} label="Special Product Boxes" value={String(today.special)} sub={pct(today.special)} />
        <SummaryCard color="sky" icon={<History className="h-4 w-4" />} label="Date" value={dateLabel} sub="Today" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-700" />Daily Boxes Records</CardTitle>
          <p className="text-xs text-muted-foreground">View-only summary. The Manager / Admin cannot edit production records.</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>First Box Out</TableHead><TableHead>Last Box Out</TableHead>
                <TableHead className="text-right">Total Class A</TableHead>
                <TableHead className="text-right">Total Class B</TableHead>
                <TableHead className="text-right">Total Special Product</TableHead>
                <TableHead className="text-right">Total Boxes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.date}>
                  <TableCell>{r.date}</TableCell>
                  <TableCell className="text-xs">{r.first}</TableCell>
                  <TableCell className="text-xs">{r.last}</TableCell>
                  <TableCell className="text-right">{r.classA}</TableCell>
                  <TableCell className="text-right">{r.classB}</TableCell>
                  <TableCell className="text-right">{r.special}</TableCell>
                  <TableCell className="text-right"><strong>{r.total}</strong></TableCell>
                  <TableCell>
                    <button className="p-1.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200" title="View" onClick={() => setViewDay(r)}>
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!viewDay} onOpenChange={(open) => !open && setViewDay(null)}>
        <DialogContent className="!max-w-[calc(100vw-1rem)] w-[calc(100vw-1rem)] sm:!max-w-[560px]">
          {viewDay && (
            <>
              <DialogHeader><DialogTitle>Daily Boxes Record — {viewDay.date}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-md">
                <Field label="Date" value={viewDay.date} />
                <Field label="First Box Out" value={viewDay.first} />
                <Field label="Last Box Out" value={viewDay.last} />
                <Field label="Class A Boxes" value={String(viewDay.classA)} />
                <Field label="Class B Boxes" value={String(viewDay.classB)} />
                <Field label="Special Product Boxes" value={String(viewDay.special)} />
                <Field label="Total Boxes" value={String(viewDay.total)} />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto"><Button variant="outline" onClick={() => setViewDay(null)}>Close</Button></div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ color, icon, label, value, sub }: { color: "emerald" | "amber" | "violet" | "sky"; icon: React.ReactNode; label: string; value: string; sub: string }) {
  const map = {
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    violet: "bg-violet-100 text-violet-700",
    sky: "bg-sky-100 text-sky-700",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`inline-flex h-9 w-9 rounded-full items-center justify-center ${map[color]}`}>{icon}</div>
        <div className="mt-2 text-xl">{value}</div>
        <div className="text-muted-foreground text-xs">{label}</div>
        <div className="text-xs text-emerald-700">{sub}</div>
      </CardContent>
    </Card>
  );
}

function Kpi({ color, icon, value, label, sub, onClick }: { color: "emerald" | "amber" | "red" | "sky" | "violet"; icon: React.ReactNode; value: string; label: string; sub: string; onClick?: () => void }) {
  const map = {
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    sky: "bg-sky-100 text-sky-700",
    violet: "bg-violet-100 text-violet-700",
  };
  return (
    <Card onClick={onClick} className={onClick ? "cursor-pointer hover:border-emerald-400 hover:shadow transition" : ""}>
      <CardContent className="p-4">
        <div className={`inline-flex h-9 w-9 rounded-full items-center justify-center ${map[color]}`}>{icon}</div>
        <div className="mt-2 text-xl">{value}</div>
        <div className="text-muted-foreground text-xs">{label}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

function RestockBadge({ s }: { s: RestockRow["status"] }) {
  const map = {
    "Pending Review": "bg-amber-100 text-amber-800",
    "Approved": "bg-emerald-100 text-emerald-800",
    "Returned": "bg-red-100 text-red-800",
  };
  return <Badge className={map[s]}>{s}</Badge>;
}

function PayrollApprovals({ payroll, onApprove, onReturn }: { payroll: PayrollRow[]; onApprove: (id: string) => void | Promise<void>; onReturn: (id: string, reason: string) => void | Promise<void> }) {
  const [view, setView] = useState<PayrollRow | null>(null);
  const [returning, setReturning] = useState<PayrollRow | null>(null);
  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);

  const filteredPayroll = payroll
    .filter((row) => row.status === "Validated")
    .filter((row) => {
      const query = search.toLowerCase();
      if (query && !`${row.id} ${row.name} ${row.period} ${row.validatedBy}`.toLowerCase().includes(query)) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      return true;
    })
    .slice()
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "net-desc") return b.net - a.net;
      if (sortBy === "status") return a.status.localeCompare(b.status);
      return b.date.localeCompare(a.date);
    });

  const handleApprove = async (row: PayrollRow) => {
    if (row.status !== "Validated") {
      toast.message(row.status === "Returned" ? `${row.id} must be corrected and validated by Finance again before Manager approval.` : `${row.id} is already ${row.status.toLowerCase()}.`);
      return;
    }
    setApprovingId(row.id);
    try {
      await onApprove(row.id);
    } finally {
      setApprovingId(null);
    }
  };

  const handleReturn = (row: PayrollRow) => {
    if (row.status !== "Validated") {
      toast.message(row.status === "Returned" ? `${row.id} is waiting for Finance revalidation after correction.` : `${row.id} is already ${row.status.toLowerCase()}.`);
      return;
    }
    setReturning(row);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2"><ClipboardCheck className="h-6 w-6 text-emerald-700" />Payroll Approvals</h1>
        <p className="text-muted-foreground">Validated by Finance Officer. Awaiting Manager approval.</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <div className="relative min-w-0 flex-1 sm:min-w-[220px]">
              <Input placeholder="Search payroll slip, beneficiary, period..." className="h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-full sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Validated">Validated</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Returned">Returned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-9 w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest Date</SelectItem>
                <SelectItem value="name">Beneficiary A-Z</SelectItem>
                <SelectItem value="net-desc">Highest Net Pay</SelectItem>
                <SelectItem value="status">Status A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Beneficiary</TableHead><TableHead>Date</TableHead>
                <TableHead>Week / Period</TableHead><TableHead className="text-right">Gross Pay</TableHead>
                <TableHead className="text-right">Deductions</TableHead><TableHead className="text-right">Net Pay</TableHead>
                <TableHead>Validation</TableHead><TableHead>Manager Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayroll.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">No payroll approvals match the selected filters.</TableCell>
                </TableRow>
              ) : (
                filteredPayroll.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.date}</TableCell>
                    <TableCell className="text-xs">{r.period}</TableCell>
                    <TableCell className="text-right">₱{r.gross.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-red-600">−₱{r.deductions.toLocaleString()}</TableCell>
                    <TableCell className="text-right"><strong>₱{r.net.toLocaleString()}</strong></TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge className={r.status === "Approved" ? "bg-emerald-100 text-emerald-800" : r.status === "Returned" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}>
                          {r.status === "Returned" ? "Awaiting Finance Revalidation" : r.status}
                        </Badge>
                        {r.status === "Returned" && <div className="text-xs text-muted-foreground">Correction must pass Finance again.</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-8" disabled={r.status !== "Validated" || approvingId === r.id || returningId === r.id} onClick={() => handleApprove(r)}>
                          {approvingId === r.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}Approve
                        </Button>
                        <Button size="sm" variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-50 h-8" disabled={r.status !== "Validated" || approvingId === r.id || returningId === r.id} onClick={() => handleReturn(r)}>
                          {returningId === r.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Undo2 className="h-3.5 w-3.5 mr-1" />}Return
                        </Button>
                        <Button size="sm" variant="outline" className="h-8" onClick={() => setView(r)}>
                          <Eye className="h-3.5 w-3.5 mr-1" />View Slip
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto">
            <Button variant="link" className="text-emerald-700">View All Payrolls →</Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="!max-w-[calc(100vw-1rem)] w-[calc(100vw-1rem)] sm:!max-w-[700px]">
          {view && (
            <>
              <DialogHeader><DialogTitle>Payroll Slip — {view.id}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-md">
                  <Field label="Beneficiary" value={view.name} />
                  <Field label="Date" value={view.date} />
                  <Field label="Period" value={view.period} />
                  <Field label="Validated By" value={view.validatedBy} />
                </div>
                <Table>
                  <TableBody>
                    <TableRow><TableCell>Gross Pay</TableCell><TableCell className="text-right">₱{view.gross.toLocaleString()}</TableCell></TableRow>
                    <TableRow><TableCell>Total Deductions</TableCell><TableCell className="text-right text-red-600">−₱{view.deductions.toLocaleString()}</TableCell></TableRow>
                    <TableRow className="bg-emerald-50"><TableCell><strong>Net Pay</strong></TableCell><TableCell className="text-right"><strong className="text-emerald-800">₱{view.net.toLocaleString()}</strong></TableCell></TableRow>
                  </TableBody>
                </Table>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto">
                  <Button variant="outline" onClick={() => setView(null)}>Close</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!returning} onOpenChange={(o) => { if (!o) { setReturning(null); setReason(""); } }}>
        <DialogContent className="!max-w-[calc(100vw-1rem)] w-[calc(100vw-1rem)] sm:!max-w-[560px]">
          {returning && (
            <>
              <DialogHeader><DialogTitle>Return Payroll — {returning.id}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Reason for Return <span className="text-red-500">*</span></Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why this payroll is being returned for correction." />
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto">
                  <Button variant="outline" disabled={!!returningId} onClick={() => { setReturning(null); setReason(""); }}>Cancel</Button>
                  <Button className="bg-red-600 hover:bg-red-700" disabled={!!returningId} onClick={async () => {
                    if (!reason.trim()) { toast.error("Reason is required"); return; }
                    setReturningId(returning.id);
                    try {
                      await onReturn(returning.id, reason);
                      setReturning(null);
                      setReason("");
                    } finally {
                      setReturningId(null);
                    }
                  }}>{returningId ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Confirm Return</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PayrollHistory({ payroll }: { payroll: PayrollRow[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [view, setView] = useState<PayrollRow | null>(null);

  const filteredPayroll = payroll
    .filter((row) => {
      const query = search.toLowerCase();
      if (query && !`${row.id} ${row.name} ${row.period} ${row.validatedBy} ${row.status}`.toLowerCase().includes(query)) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      return true;
    })
    .slice()
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "net-desc") return b.net - a.net;
      if (sortBy === "status") return a.status.localeCompare(b.status);
      return b.date.localeCompare(a.date);
    });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2"><History className="h-6 w-6 text-emerald-700" />Payroll History</h1>
        <p className="text-muted-foreground">View all beneficiary payroll records and their current status.</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Input placeholder="Search payroll slip, beneficiary, period..." className="h-9 min-w-0 flex-1 sm:min-w-[220px]" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Submitted">Submitted</SelectItem>
                <SelectItem value="Validated">Validated</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Returned">Returned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-9 w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest Date</SelectItem>
                <SelectItem value="name">Beneficiary A-Z</SelectItem>
                <SelectItem value="net-desc">Highest Net Pay</SelectItem>
                <SelectItem value="status">Status A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payroll Slip No.</TableHead>
                <TableHead>Payroll Period</TableHead>
                <TableHead>Beneficiary</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Gross Pay</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net Pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayroll.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">No payroll records match the selected filters.</TableCell>
                </TableRow>
              ) : (
                filteredPayroll.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell className="text-xs">{row.period}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.date}</TableCell>
                    <TableCell className="text-right">₱{row.gross.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-red-600">−₱{row.deductions.toLocaleString()}</TableCell>
                    <TableCell className="text-right"><strong>₱{row.net.toLocaleString()}</strong></TableCell>
                    <TableCell><PayrollHistoryBadge status={row.status} /></TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" className="h-8" onClick={() => setView(row)}>
                        <Eye className="h-3.5 w-3.5 mr-1" />View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!view} onOpenChange={(open) => !open && setView(null)}>
        <DialogContent className="!max-w-[calc(100vw-1rem)] w-[calc(100vw-1rem)] sm:!max-w-[700px]">
          {view && (
            <>
              <DialogHeader><DialogTitle>Payroll Record - {view.id}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 rounded-md bg-slate-50 p-3 sm:grid-cols-2">
                  <Field label="Beneficiary" value={view.name} />
                  <Field label="Payroll Period" value={view.period} />
                  <Field label="Date" value={view.date} />
                  <div className="space-y-0.5">
                    <div className="text-xs text-muted-foreground">Status</div>
                    <PayrollHistoryBadge status={view.status} />
                  </div>
                  <Field label="Validated By" value={view.validatedBy} />
                  <Field label="Return Reason" value={view.returnReason || "-"} />
                </div>
                <Table>
                  <TableBody>
                    <TableRow><TableCell>Gross Pay</TableCell><TableCell className="text-right">₱{view.gross.toLocaleString()}</TableCell></TableRow>
                    <TableRow><TableCell>Total Deductions</TableCell><TableCell className="text-right text-red-600">−₱{view.deductions.toLocaleString()}</TableCell></TableRow>
                    <TableRow className="bg-emerald-50"><TableCell><strong>Net Pay</strong></TableCell><TableCell className="text-right"><strong className="text-emerald-800">₱{view.net.toLocaleString()}</strong></TableCell></TableRow>
                  </TableBody>
                </Table>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto">
                  <Button variant="outline" onClick={() => setView(null)}>Close</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PayrollHistoryBadge({ status }: { status: PayrollRow["status"] }) {
  const map = {
    Draft: "bg-slate-100 text-slate-700",
    Submitted: "bg-violet-100 text-violet-800",
    Validated: "bg-sky-100 text-sky-800",
    Approved: "bg-emerald-100 text-emerald-800",
    Returned: "bg-red-100 text-red-800",
  };
  return <Badge className={map[status]}>{status}</Badge>;
}

function RestockRequests({ restock, onApprove, onReturn }: { restock: RestockRow[]; onApprove: (id: string) => void | Promise<void>; onReturn: (id: string, reason: string) => void | Promise<void> }) {
  const [view, setView] = useState<RestockRow | null>(null);
  const [returning, setReturning] = useState<RestockRow | null>(null);
  const [reason, setReason] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);

  const handleApprove = async (row: RestockRow) => {
    if (row.status !== "Pending Review") {
      toast.message(`${row.id} is already ${row.status.toLowerCase()}.`);
      return;
    }
    setApprovingId(row.id);
    try {
      await onApprove(row.id);
    } finally {
      setApprovingId(null);
    }
  };

  const handleReturn = (row: RestockRow) => {
    if (row.status !== "Pending Review") {
      toast.message(`${row.id} is already ${row.status.toLowerCase()}.`);
      return;
    }
    setReturning(row);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2"><PackagePlus className="h-6 w-6 text-emerald-700" />Restock Requests</h1>
        <p className="text-muted-foreground">Review inventory replenishment requests submitted by the Bookkeeper.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead><TableHead>Category</TableHead>
                <TableHead className="text-right">Current Stock</TableHead><TableHead className="text-right">Reorder Point</TableHead>
                <TableHead className="text-right">Requested Qty</TableHead><TableHead>Requested By</TableHead>
                <TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {restock.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.item}</TableCell>
                  <TableCell className="text-xs">{r.category}</TableCell>
                  <TableCell className="text-right">{r.currentStock}</TableCell>
                  <TableCell className="text-right">{r.reorder}</TableCell>
                  <TableCell className="text-right">{r.qty.toLocaleString()}</TableCell>
                  <TableCell>{r.requestedBy}</TableCell>
                  <TableCell>{r.date}</TableCell>
                  <TableCell><RestockBadge s={r.status} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <button title="Approve" className="p-1.5 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-60 disabled:cursor-not-allowed" disabled={r.status !== "Pending Review" || approvingId === r.id || returningId === r.id} onClick={() => handleApprove(r)}>
                        {approvingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      </button>
                      <button title="Return" className="p-1.5 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-60 disabled:cursor-not-allowed" disabled={r.status !== "Pending Review" || approvingId === r.id || returningId === r.id} onClick={() => handleReturn(r)}>
                        {returningId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
                      </button>
                      <button title="View" className="p-1.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200" onClick={() => setView(r)}>
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="!max-w-[calc(100vw-1rem)] w-[calc(100vw-1rem)] sm:!max-w-[640px]">
          {view && (
            <>
              <DialogHeader><DialogTitle>Restock Request — {view.id}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-md">
                <Field label="Item" value={view.item} />
                <Field label="Category" value={view.category} />
                <Field label="Current Stock" value={String(view.currentStock)} />
                <Field label="Reorder Point" value={String(view.reorder)} />
                <Field label="Requested Qty" value={view.qty.toLocaleString()} />
                <Field label="Requested By" value={view.requestedBy} />
                <Field label="Date" value={view.date} />
                <div className="space-y-1"><div className="text-xs text-muted-foreground">Status</div><RestockBadge s={view.status} /></div>
              </div>
              {view.returnReason && (
                <div className="p-3 border border-red-200 bg-red-50 rounded-md text-red-800 text-sm">
                  <strong>Return Reason:</strong> {view.returnReason}
                </div>
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto"><Button variant="outline" onClick={() => setView(null)}>Close</Button></div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!returning} onOpenChange={(o) => { if (!o) { setReturning(null); setReason(""); } }}>
        <DialogContent className="!max-w-[calc(100vw-1rem)] w-[calc(100vw-1rem)] sm:!max-w-[560px]">
          {returning && (
            <>
              <DialogHeader><DialogTitle>Return Restock Request — {returning.id}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Reason for Return <span className="text-red-500">*</span></Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why this request is being returned." />
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto">
                  <Button variant="outline" disabled={!!returningId} onClick={() => { setReturning(null); setReason(""); }}>Cancel</Button>
                  <Button className="bg-red-600 hover:bg-red-700" disabled={!!returningId} onClick={async () => {
                    if (!reason.trim()) { toast.error("Reason is required"); return; }
                    setReturningId(returning.id);
                    try {
                      await onReturn(returning.id, reason);
                      setReturning(null);
                      setReason("");
                    } finally {
                      setReturningId(null);
                    }
                  }}>{returningId ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Confirm Return</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OperationsMonitor() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2"><Activity className="h-6 w-6 text-emerald-700" />Operations Monitor</h1>
        <p className="text-muted-foreground">Quick summary of production, inventory, and payroll operations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="inline-flex h-10 w-10 rounded-full items-center justify-center bg-emerald-100 text-emerald-700"><TrendingUp className="h-5 w-5" /></div>
            <div className="mt-2 text-2xl">14</div>
            <div className="text-muted-foreground">Boxes Reported</div>
            <div className="text-xs text-emerald-700">↑ 18% vs yesterday</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="inline-flex h-10 w-10 rounded-full items-center justify-center bg-amber-100 text-amber-700"><AlertTriangle className="h-5 w-5" /></div>
            <div className="mt-2 text-2xl">5</div>
            <div className="text-muted-foreground">Low Stock Items</div>
            <div className="text-xs text-amber-700">Needs restock</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="inline-flex h-10 w-10 rounded-full items-center justify-center bg-emerald-100 text-emerald-700"><Wallet className="h-5 w-5" /></div>
            <div className="mt-2 text-2xl">12</div>
            <div className="text-muted-foreground">Pending Approvals</div>
            <div className="text-xs text-emerald-700">₱48,560.00</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Daily Harvest Trend (Last 7 Days)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <BarChart data={HARVEST_7}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" /><YAxis /><Tooltip />
                <Bar dataKey="boxes" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Top Workers (This Month)</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Rank</TableHead><TableHead>Worker</TableHead><TableHead className="text-right">Output</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {TOP_WORKERS.map((w) => (
                  <TableRow key={w.rank}>
                    <TableCell>{w.rank}</TableCell>
                    <TableCell>{w.name}</TableCell>
                    <TableCell className="text-right">{w.output} boxes</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto">
              <Button variant="link" className="text-emerald-700">View Full Monitor →</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Reports({ payroll, restock, users, audit, inventoryItems, productionRecords }: { payroll: PayrollRow[]; restock: RestockRow[]; users: Account[]; audit: AuditRow[]; inventoryItems: any[]; productionRecords: any[] }) {
  const [selected, setSelected] = useState<{ title: string; desc: string } | null>(null);
  const [dateFrom, setDateFrom] = useState("2026-05-01");
  const [dateTo, setDateTo] = useState("2026-06-30");
  const [beneficiaryFilter, setBeneficiaryFilter] = useState("all");
  const [classificationFilter, setClassificationFilter] = useState("all");
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState("all");
  const [payrollStatusFilter, setPayrollStatusFilter] = useState("all");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("all");
  const approvedPayroll = payroll.filter((row) => row.status === "Approved");
  const approvedPayrollTotal = approvedPayroll.reduce((sum, row) => sum + row.net, 0);
  const activeUsers = users.filter((user) => user.active).length;
  const inactiveUsers = users.length - activeUsers;
  const inventoryCounts = inventoryStatusCounts(inventoryItems, restock);
  const beneficiaries = Array.from(new Set(payroll.map((row) => row.name)));
  const validationRecords = audit.filter((row) => row.module === "Payroll" && row.action === "Validated");
  const approvalRecords = audit.filter((row) => row.action === "Approved");
  const materialCreditRecords: { id: string; type: string; beneficiary: string; date: string; amount: number; status: string }[] = [];
  const selectedReport = selected ? buildManagerReport(selected.title, selected.desc, { payroll, restock, users, audit, inventoryItems, productionRecords, materialCreditRecords }) : null;
  const generatedDocuments: { title: string; type: string; records: number; date: string; status: string; coverage: string }[] = [];
  const filteredDocuments = generatedDocuments.filter((doc) => {
    if (dateFrom && doc.date < dateFrom) return false;
    if (dateTo && doc.date > dateTo) return false;
    if (transactionTypeFilter !== "all" && doc.type !== transactionTypeFilter) return false;
    if (beneficiaryFilter !== "all" && !["Production", "Payroll", "Credits", "Validation", "Approval"].includes(doc.type)) return false;
    if (classificationFilter !== "all" && doc.type !== "Production") return false;
    if (inventoryStatusFilter !== "all") {
      if (doc.type !== "Inventory") return false;
      if (doc.status !== inventoryStatusFilter) return false;
    }
    if (payrollStatusFilter !== "all") {
      const payrollReportTypes = payrollStatusFilter === "Approved" ? ["Payroll", "Approval"] : payrollStatusFilter === "Validated" ? ["Payroll", "Validation"] : ["Payroll"];
      if (!payrollReportTypes.includes(doc.type)) return false;
      if (doc.type === "Payroll" && !payroll.some((row) => row.status === payrollStatusFilter)) return false;
      if (doc.type === "Validation" && validationRecords.length === 0) return false;
      if (doc.type === "Approval" && approvalRecords.length === 0) return false;
    }
    return true;
  });
  const cards = [
    { title: "Production Report", desc: "Harvest totals, box counts, and production classifications." },
    { title: "Inventory Report", desc: "Stock levels, movements, low-stock, and out-of-stock items." },
    { title: "Payroll Report", desc: "Payroll totals, deductions, net pay, and approval trends." },
    { title: "Credits / Restock Report", desc: "Material credits, restock requests, and replenishment status." },
    { title: "Validation / Approval Report", desc: "Finance validation records and manager approval activity." },
    { title: "Financial Summary", desc: "Income, expenses, deductions, and operational totals." },
    { title: "Administrative Report", desc: "Users, roles, account status, login activity, and audit records." },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2"><FileBarChart2 className="h-6 w-6 text-emerald-700" />Reports</h1>
        <p className="text-muted-foreground">Select a report category to view its details and relevant filters.</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Report Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1">
            <Label>Date From</Label>
            <DateInput value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Date To</Label>
            <DateInput value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Beneficiary</Label>
            <Select value={beneficiaryFilter} onValueChange={setBeneficiaryFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Beneficiaries</SelectItem>
                {beneficiaries.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Product Classification</Label>
            <Select value={classificationFilter} onValueChange={setClassificationFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classifications</SelectItem>
                <SelectItem value="Class A">Class A</SelectItem>
                <SelectItem value="Class B">Class B</SelectItem>
                <SelectItem value="Special Product">Special Product</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Inventory Status</Label>
            <Select value={inventoryStatusFilter} onValueChange={setInventoryStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Inventory Statuses</SelectItem>
                <SelectItem value="Ready">Ready</SelectItem>
                <SelectItem value="Needs Attention">Needs Attention</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Payroll Status</Label>
            <Select value={payrollStatusFilter} onValueChange={setPayrollStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payroll Statuses</SelectItem>
                <SelectItem value="Validated">Validated</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Returned">Returned</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Transaction Type</Label>
            <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transaction Types</SelectItem>
                <SelectItem value="Production">Production</SelectItem>
                <SelectItem value="Inventory">Inventory</SelectItem>
                <SelectItem value="Payroll">Payroll</SelectItem>
                <SelectItem value="Credits">Credits</SelectItem>
                <SelectItem value="Restock">Restock</SelectItem>
                <SelectItem value="Validation">Validation</SelectItem>
                <SelectItem value="Approval">Approval</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" className="w-full" onClick={() => {
              setDateFrom("2026-05-01");
              setDateTo("2026-06-30");
              setBeneficiaryFilter("all");
              setClassificationFilter("all");
              setInventoryStatusFilter("all");
              setPayrollStatusFilter("all");
              setTransactionTypeFilter("all");
            }}>Reset Filters</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
        {cards.map((r) => (
          <Card key={r.title} className="group cursor-pointer transition hover:border-emerald-400 hover:shadow-sm" onClick={() => setSelected(r)}>
            <CardContent className="flex min-h-[138px] flex-col p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                  <FileBarChart2 className="h-4 w-4" />
                </div>
                <div className="font-medium leading-tight text-slate-950">{r.title}</div>
              </div>
              <p className="mt-3 min-h-[34px] text-xs leading-5 text-muted-foreground">{r.desc}</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-auto h-8 justify-end self-end px-0 text-emerald-700 hover:bg-transparent hover:text-emerald-800"
                onClick={(event) => { event.stopPropagation(); setSelected(r); }}
              >
                View Report <ArrowRight className="ml-1 h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Generated Reports And Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Coverage</TableHead>
                <TableHead className="text-right">Records</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">No reports match the selected filters.</TableCell>
                </TableRow>
              ) : (
                filteredDocuments.map((doc) => (
                  <TableRow key={`${doc.title}-${doc.type}`}>
                    <TableCell>{doc.title}</TableCell>
                    <TableCell><Badge variant="outline">{doc.type}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{doc.coverage}</TableCell>
                    <TableCell className="text-right">{doc.records}</TableCell>
                    <TableCell>
                      <Badge className={doc.status === "Needs Attention" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>{doc.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => setSelected(cards.find((card) => card.title === doc.title) ?? { title: doc.title, desc: doc.coverage })}>
                        Generate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[88dvh] w-[calc(100vw-1rem)] max-w-5xl overflow-hidden p-0">
          {selected && selectedReport && (
            <>
              <DialogHeader className="border-b px-4 py-3 sm:px-6 sm:py-4">
                <DialogTitle className="flex items-center gap-2">
                  <FileBarChart2 className="h-5 w-5 text-emerald-700" />{selectedReport.title}
                </DialogTitle>
              </DialogHeader>
              <div className="max-h-[calc(88dvh-76px)] overflow-y-auto px-4 py-4 sm:px-6">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">{selectedReport.desc}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <ReportMetric label="Generated At" value={currentSystemDateTime()} />
                    <ReportMetric label="Records" value={String(selectedReport.rows.length)} />
                    <ReportMetric label={selectedReport.metricLabel} value={selectedReport.metricValue} />
                  </div>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {selectedReport.columns.map((column) => <TableHead key={column}>{column}</TableHead>)}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedReport.rows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={selectedReport.columns.length} className="py-8 text-center text-muted-foreground">No records are available for this report.</TableCell>
                          </TableRow>
                        ) : (
                          selectedReport.rows.map((row, rowIndex) => (
                            <TableRow key={`${selectedReport.title}-${rowIndex}`}>
                              {row.map((cell, cellIndex) => <TableCell key={`${rowIndex}-${cellIndex}`}>{cell}</TableCell>)}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t bg-white px-4 py-3 sm:-mx-6 sm:flex-row sm:justify-end sm:px-6 [&>button]:w-full sm:[&>button]:w-auto">
                    <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
                    <Button variant="outline" onClick={() => printManagerReport(selectedReport)}>Print</Button>
                    <Button variant="outline" onClick={() => exportReportCsv(selectedReport)}>Export CSV</Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => exportReportPdf(selectedReport)}>Export PDF</Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-slate-50 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold text-slate-900">{value}</div>
    </div>
  );
}

interface ManagerReport {
  title: string;
  desc: string;
  metricLabel: string;
  metricValue: string;
  columns: string[];
  rows: string[][];
}

function buildManagerReport(
  title: string,
  desc: string,
  data: { payroll: PayrollRow[]; restock: RestockRow[]; users: Account[]; audit: AuditRow[]; inventoryItems: any[]; productionRecords: any[]; materialCreditRecords: { id: string; type: string; beneficiary: string; date: string; amount: number; status: string }[] },
): ManagerReport {
  if (title === "Production Report") {
    const rows = data.productionRecords.map((record: any) => [
      String(record.record_no ?? record.id ?? "-"),
      String(record.beneficiary_name ?? record.beneficiary ?? "-"),
      String(record.packing_date ?? record.production_date ?? record.harvest_date ?? "-").slice(0, 10),
      String(Number(record.class_a_big_hands ?? 0) + Number(record.class_a_small_hands ?? 0) + Number(record.class_a_cps ?? 0)),
      String(Number(record.class_b_big_hands ?? 0) + Number(record.class_b_small_hands ?? 0) + Number(record.class_b_cps ?? 0)),
      String(Number(record.special_total ?? record.special_product ?? 0)),
    ]);
    return { title, desc, metricLabel: "Production Records", metricValue: String(rows.length), columns: ["Record No.", "Beneficiary", "Date", "Class A", "Class B", "Special"], rows };
  }

  if (title === "Inventory Report") {
    const rows = data.inventoryItems.map((item: any) => [
      String(item.code ?? item.material_id ?? item.item_code ?? item.id ?? "-"),
      String(item.name ?? item.item_name ?? "-"),
      String(item.category ?? "Not specified"),
      `${Number(item.on_hand ?? 0).toLocaleString()} ${item.unit ?? ""}`.trim(),
      String(item.active === false || item.active === 0 ? "Inactive" : Number(item.on_hand ?? 0) <= 0 ? "Out of Stock" : "Available"),
    ]);
    return { title, desc, metricLabel: "Inventory Items", metricValue: String(rows.length), columns: ["Item Code", "Item", "Category", "On Hand", "Status"], rows };
  }

  if (title === "Payroll Report") {
    const rows = data.payroll.map((row) => [row.id, row.name, row.period, managerMoney(row.gross), managerMoney(row.deductions), managerMoney(row.net), row.status]);
    return { title, desc, metricLabel: "Net Pay Total", metricValue: managerMoney(data.payroll.reduce((sum, row) => sum + row.net, 0)), columns: ["Slip No.", "Beneficiary", "Period", "Gross", "Deductions", "Net", "Status"], rows };
  }

  if (title === "Credits / Restock Report") {
    const rows = data.restock.map((row) => [row.id, row.item, row.category, String(row.currentStock), String(row.reorder), String(row.qty), row.status]);
    return { title, desc, metricLabel: "Restock Requests", metricValue: String(rows.length), columns: ["Request ID", "Item", "Category", "Current Stock", "Reorder Point", "Requested Qty", "Status"], rows };
  }

  if (title === "Validation / Approval Report") {
    const rows = data.audit
      .filter((row) => row.module === "Payroll" || row.action === "Approved" || row.action === "Returned")
      .map((row) => [formatAuditTimestamp(row.ts), row.user, roleLabel(row.role), row.action, row.module, row.description]);
    return { title, desc, metricLabel: "Activities", metricValue: String(rows.length), columns: ["Timestamp", "User", "Role", "Action", "Module", "Details"], rows };
  }

  if (title === "Financial Summary") {
    const gross = data.payroll.reduce((sum, row) => sum + row.gross, 0);
    const deductions = data.payroll.reduce((sum, row) => sum + row.deductions, 0);
    const net = data.payroll.reduce((sum, row) => sum + row.net, 0);
    return {
      title,
      desc,
      metricLabel: "Net Total",
      metricValue: managerMoney(net),
      columns: ["Section", "Amount", "Notes"],
      rows: [["Gross Payroll", managerMoney(gross), "Total gross income"], ["Deductions", managerMoney(deductions), "Credits and authorized deductions"], ["Net Payroll", managerMoney(net), "Amount after deductions"]],
    };
  }

  const rows = [
    ["User Accounts", "Names, roles, contacts, account status, and remarks", String(data.users.length), "Available"],
    ["Role Distribution", Object.values(ROLE_LABELS).join(", "), String(Object.keys(ROLE_LABELS).length), "Synced"],
    ["Login History", "Most recent login timestamp per account", String(data.users.filter((user) => user.lastLogin && user.lastLogin !== "-" && user.lastLogin !== "—").length), "Available"],
    ["Audit Records", "Admin account changes and operational activities", String(data.audit.length), "Available"],
  ];
  return { title, desc, metricLabel: "Active / Inactive", metricValue: `${data.users.filter((user) => user.active).length} / ${data.users.filter((user) => !user.active).length}`, columns: ["Report Section", "Coverage", "Records", "Status"], rows };
}

function exportReportCsv(report: ManagerReport) {
  const csvRows = [
    [report.title],
    [report.desc],
    ["Generated At", currentSystemDateTime()],
    [report.metricLabel, report.metricValue],
    [],
    report.columns,
    ...report.rows,
  ];
  const csv = csvRows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${report.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportReportPdf(report: ManagerReport) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 36;
  const generatedAt = currentSystemDateTime();

  doc.setTextColor(4, 120, 87);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(report.title, margin, 42);

  doc.setDrawColor(5, 150, 105);
  doc.setLineWidth(1.5);
  doc.line(margin, 56, pageWidth - margin, 56);

  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const descLines = doc.splitTextToSize(report.desc, pageWidth - (margin * 2));
  doc.text(descLines, margin, 76);

  const metaTop = 98;
  const boxGap = 10;
  const boxWidth = (pageWidth - (margin * 2) - (boxGap * 2)) / 3;
  drawPdfMetaBox(doc, margin, metaTop, boxWidth, "Generated At", generatedAt);
  drawPdfMetaBox(doc, margin + boxWidth + boxGap, metaTop, boxWidth, report.metricLabel, report.metricValue);
  drawPdfMetaBox(doc, margin + (boxWidth + boxGap) * 2, metaTop, boxWidth, "Records", String(report.rows.length));

  autoTable(doc, {
    startY: metaTop + 58,
    head: [report.columns],
    body: report.rows.length ? report.rows : [["No records are available for this report.", ...Array(Math.max(0, report.columns.length - 1)).fill("")]],
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 6,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.4,
      valign: "top",
    },
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      lineColor: [226, 232, 240],
    },
    alternateRowStyles: {
      fillColor: [252, 253, 255],
    },
    margin: { left: margin, right: margin },
    didDrawPage: () => {
      const pageNumber = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`DARBCO Agri Workflow - ${report.title}`, margin, doc.internal.pageSize.getHeight() - 18);
      doc.text(`Page ${pageNumber}`, pageWidth - margin - 32, doc.internal.pageSize.getHeight() - 18);
    },
  });

  doc.save(`${reportFileName(report)}.pdf`);
}

function printManagerReport(report: ManagerReport) {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;
  const headers = report.columns.map((column) => `<th>${htmlCell(column)}</th>`).join("");
  const rows = report.rows.length
    ? report.rows.map((row) => `<tr>${row.map((cell) => `<td>${htmlCell(cell)}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${report.columns.length}" class="empty">No records are available for this report.</td></tr>`;

  printWindow.document.write(`<!doctype html><html><head><title>${htmlCell(report.title)}</title><style>
    body{font-family:Arial,sans-serif;color:#0f172a;margin:28px}
    h1{color:#047857;font-size:22px;margin:0 0 6px}
    .header{border-bottom:2px solid #059669;margin-bottom:18px;padding-bottom:12px}
    .desc{color:#475569;margin:0}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 0}
    .box{border:1px solid #dbe4ee;border-radius:6px;padding:10px}.label{color:#64748b;font-size:11px;text-transform:uppercase}
    table{width:100%;border-collapse:collapse;font-size:12px}th,td{border-bottom:1px solid #e2e8f0;padding:8px;text-align:left;vertical-align:top}
    th{background:#f8fafc}.empty{text-align:center;color:#64748b;padding:24px}@page{margin:18mm}
  </style></head><body><div class="header"><h1>${htmlCell(report.title)}</h1><p class="desc">${htmlCell(report.desc)}</p></div>
  <div class="meta"><div class="box"><div class="label">Generated At</div><div>${htmlCell(currentSystemDateTime())}</div></div><div class="box"><div class="label">${htmlCell(report.metricLabel)}</div><div>${htmlCell(report.metricValue)}</div></div><div class="box"><div class="label">Records</div><div>${report.rows.length}</div></div></div>
  <table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
}

function managerMoney(value: number) {
  return `PHP ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function drawPdfMetaBox(doc: jsPDF, x: number, y: number, width: number, label: string, value: string) {
  doc.setDrawColor(219, 228, 238);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, width, 42, 5, 5, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(label.toUpperCase(), x + 10, y + 15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(doc.splitTextToSize(value, width - 20), x + 10, y + 30);
}

function csvCell(value: string) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function htmlCell(value: string) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function reportFileName(report: ManagerReport) {
  return report.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function AuditHistory({ audit }: { audit: AuditRow[] }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [viewing, setViewing] = useState<{ row: AuditRow; activityId: string } | null>(null);

  const filtered = useMemo(() => audit.filter((a) => {
    const query = search.toLowerCase();
    if (query && !`${a.user} ${roleLabel(a.role)} ${a.affectedRecord || ""} ${a.description} ${a.remarks || ""}`.toLowerCase().includes(query)) return false;
    if (roleFilter !== "all" && (a.role || "") !== roleFilter) return false;
    if (moduleFilter !== "all" && a.module !== moduleFilter) return false;
    if (actionFilter !== "all" && a.action !== actionFilter) return false;
    const date = auditDateKey(a.ts);
    if (fromDate && date < fromDate) return false;
    if (toDate && date > toDate) return false;
    return true;
  }), [audit, search, roleFilter, moduleFilter, actionFilter, fromDate, toDate]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2"><History className="h-6 w-6 text-emerald-700" />Audit History</h1>
          <p className="text-muted-foreground">Important user actions across the system.</p>
        </div>
        <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:grid-cols-none lg:flex lg:flex-wrap">
          <Input placeholder="Search audit records..." className="h-9 w-full lg:w-56" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-9 w-full lg:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {Object.entries(ROLE_LABELS).map(([role, label]) => (
                <SelectItem key={role} value={role}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="h-9 w-full lg:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              <SelectItem value="Payroll">Payroll</SelectItem>
              <SelectItem value="Inventory">Inventory</SelectItem>
              <SelectItem value="Production">Production</SelectItem>
              <SelectItem value="Users">Users</SelectItem>
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="h-9 w-full lg:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="Submitted">Submitted</SelectItem>
              <SelectItem value="Validated">Validated</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Returned">Returned</SelectItem>
              <SelectItem value="Created">Created</SelectItem>
              <SelectItem value="Updated">Updated</SelectItem>
              <SelectItem value="Activated">Activated</SelectItem>
              <SelectItem value="Deactivated">Deactivated</SelectItem>
              <SelectItem value="Deleted">Deleted</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative w-full lg:w-40">
            <Label className="absolute -top-5 left-0 text-xs text-muted-foreground">From Date</Label>
            <DateInput className="w-full" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="relative w-full lg:w-40">
            <Label className="absolute -top-5 left-0 text-xs text-muted-foreground">To Date</Label>
            <DateInput className="w-full" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <Table className="!min-w-0 table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[82px]">Activity ID</TableHead><TableHead className="w-[126px]">Timestamp</TableHead><TableHead className="w-[112px]">User</TableHead>
                <TableHead className="w-[120px]">Role</TableHead><TableHead className="w-[92px]">Action</TableHead><TableHead className="w-[90px]">Module</TableHead>
                <TableHead className="w-[190px]">Affected Record</TableHead><TableHead>Remarks</TableHead><TableHead className="w-[96px]">Status</TableHead><TableHead className="w-[76px] text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a, i) => (
                <TableRow key={i}>
                  <TableCell className="overflow-hidden text-xs">{a.id || `AUD-${i + 1}`}</TableCell>
                  <TableCell className="overflow-hidden text-xs">{formatAuditTimestamp(a.ts)}</TableCell>
                  <TableCell className="overflow-hidden">
                    <div className="truncate" title={a.user}>{a.user}</div>
                  </TableCell>
                  <TableCell className="overflow-hidden text-xs">
                    <div className="truncate" title={roleLabel(a.role) || "-"}>{roleLabel(a.role) || "-"}</div>
                  </TableCell>
                  <TableCell className="overflow-hidden"><Badge variant="outline">{a.action}</Badge></TableCell>
                  <TableCell className="overflow-hidden">
                    <div className="truncate" title={a.module}>{a.module}</div>
                  </TableCell>
                  <TableCell className="overflow-hidden text-xs">
                    <div className="truncate" title={a.affectedRecord || a.description}>{a.affectedRecord || a.description}</div>
                  </TableCell>
                  <TableCell className="overflow-hidden">
                    <div className="truncate" title={a.remarks || a.description}>{a.remarks || a.description}</div>
                  </TableCell>
                  <TableCell className="overflow-hidden"><Badge className={a.status === "Completed" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}>{a.status}</Badge></TableCell>
                  <TableCell className="overflow-hidden text-center">
                    <Button variant="outline" size="icon" className="h-8 w-8" title="View full details" aria-label="View full details" onClick={() => setViewing({ row: a, activityId: a.id || `AUD-${i + 1}` })}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:!max-w-[820px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <Eye className="h-5 w-5" />Full Audit Details
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <AuditDetail label="Activity ID" value={viewing.activityId} />
                <AuditDetail label="Timestamp" value={formatAuditTimestamp(viewing.row.ts)} />
                <AuditDetail label="User" value={viewing.row.user || "-"} />
                <AuditDetail label="Role" value={roleLabel(viewing.row.role) || "-"} />
                <AuditDetail label="Action" value={viewing.row.action} />
                <AuditDetail label="Module" value={viewing.row.module} />
                <AuditDetail label="Status" value={viewing.row.status} />
              </div>
              <div className="rounded-md border bg-slate-50 p-3">
                <div className="mb-1 text-xs font-medium text-muted-foreground">Affected Record</div>
                <AuditLongDetail value={viewing.row.affectedRecord || viewing.row.description || "-"} />
              </div>
              <div className="rounded-md border bg-white p-3">
                <div className="mb-1 text-xs font-medium text-muted-foreground">Remarks</div>
                <AuditLongDetail value={viewing.row.remarks || viewing.row.description || "-"} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AuditDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-white px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-words font-medium">{value}</div>
    </div>
  );
}

function AuditLongDetail({ value }: { value: string }) {
  const inventoryAudit = parseInventoryItemAudit(value);
  const productionAudit = parseProductionAudit(value);

  if (inventoryAudit) {
    return (
      <div className="space-y-3">
        <p className="font-medium text-slate-900">Updated inventory item {inventoryAudit.itemName}.</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <AuditFieldGroup title="Previous Item Details" values={inventoryAudit.previous} />
          <AuditFieldGroup title="Updated Item Details" values={inventoryAudit.updated} />
        </div>
        <AuditReason value={inventoryAudit.reason} />
      </div>
    );
  }

  if (productionAudit) {
    return (
      <div className="space-y-3">
        <AuditDetail label="Production Record ID" value={productionAudit.recordId} />
        {productionAudit.changes.length > 0 ? (
          <div className="rounded-md border bg-white p-3">
            <div className="mb-2 font-medium text-emerald-700">Changed Production Fields</div>
            <div className="overflow-hidden rounded-md border">
              <div className="grid grid-cols-[1.4fr_1fr_1fr] bg-slate-50 text-xs font-medium text-muted-foreground">
                <div className="px-3 py-2">Field Changed</div>
                <div className="px-3 py-2">Previous Value</div>
                <div className="px-3 py-2">Updated Value</div>
              </div>
              {productionAudit.changes.map((change, index) => (
                <div key={`${change.field}-${index}`} className="grid grid-cols-[1.4fr_1fr_1fr] border-t text-sm">
                  <div className="break-words px-3 py-2 font-medium">{change.field}</div>
                  <div className="break-words px-3 py-2">{change.previous}</div>
                  <div className="break-words px-3 py-2">{change.updated}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <AuditDetail label="Changed Production Fields" value="No field value changed" />
        )}
        <AuditReason value={productionAudit.reason} />
      </div>
    );
  }

  return <p className="whitespace-pre-wrap break-words leading-relaxed">{value}</p>;
}

function AuditReason({ value }: { value: string }) {
  return (
    <div className="rounded-md border bg-white px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">Reason for Editing</div>
      <div className="mt-1 break-words">{value || "-"}</div>
    </div>
  );
}

function AuditFieldGroup({ title, values }: { title: string; values: Record<string, unknown> }) {
  const fields = [
    ["material_id", "Material ID"],
    ["name", "Item Name"],
    ["category", "Category"],
    ["unit", "Unit"],
    ["on_hand", "On-Hand Stock"],
    ["minimum_stock", "Minimum Stock"],
    ["unit_cost", "Unit Cost"],
    ["supplier", "Supplier"],
    ["stock_date", "Stock Date"],
    ["expiry_date", "Expiration Date"],
  ];

  return (
    <div className="rounded-md border bg-white p-3">
      <div className="mb-2 font-medium text-emerald-700">{title}</div>
      <div className="space-y-2">
        {fields.map(([key, label]) => (
          <div key={key} className="grid grid-cols-[128px_1fr] gap-2 border-b pb-2 last:border-b-0 last:pb-0">
            <div className="text-xs font-medium text-muted-foreground">{label}</div>
            <div className="break-words text-sm">{formatAuditFieldValue(values[key])}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function parseInventoryItemAudit(value: string): { itemName: string; previous: Record<string, unknown>; updated: Record<string, unknown>; reason: string } | null {
  const match = value.match(/^Updated inventory item (.*?)\. Previous item details: (\{.*?\})\. Updated item details: (\{.*?\})\. Reason for editing: (.*)$/s);
  if (!match) return null;

  try {
    return {
      itemName: match[1] || "-",
      previous: JSON.parse(match[2]),
      updated: JSON.parse(match[3]),
      reason: match[4] || "-",
    };
  } catch {
    return null;
  }
}

function parseProductionAudit(value: string): { recordId: string; changes: Array<{ field: string; previous: string; updated: string }>; reason: string } | null {
  const match = value.match(/^Production record #([^;]+); (.*?); Reason for editing: (.*)$/s);
  if (!match) return null;

  const details = match[2] || "";
  const changes = details === "No field value changed"
    ? []
    : details.split(" | ").map((entry) => {
      const change = entry.match(/^Field changed: (.*?); Previous value: (.*?); Updated value: (.*)$/s);
      return change ? { field: change[1] || "-", previous: change[2] || "-", updated: change[3] || "-" } : null;
    }).filter((entry): entry is { field: string; previous: string; updated: string } => Boolean(entry));

  return {
    recordId: `#${match[1]}`,
    changes,
    reason: match[3] || "-",
  };
}

function formatAuditFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function UserManagement({ users, setUsers, setAudit, adminId, adminName }: {
  users: Account[];
  setUsers: React.Dispatch<React.SetStateAction<Account[]>>;
  setAudit: React.Dispatch<React.SetStateAction<AuditRow[]>>;
  adminId: string;
  adminName: string;
}) {
  const emptyForm = { name: "", email: "", username: "", password: "", role: "production_clerk" as Role, contact: "", remarks: "", active: true };
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);

  const filteredUsers = users.filter((account) => {
    const query = search.toLowerCase();
    if (query && !`${account.name} ${account.email} ${account.username} ${roleLabel(account.role)} ${account.contact || ""}`.toLowerCase().includes(query)) return false;
    if (roleFilter !== "all" && account.role !== roleFilter) return false;
    if (statusFilter !== "all" && String(account.active) !== statusFilter) return false;
    return true;
  });

  const recordUserAudit = (action: AuditRow["action"], account: Account, remarks: string) => {
    setAudit((current) => [{
      id: `AUD-${Date.now()}`,
      ts: now(),
      user: adminName,
      role: "manager_admin",
      action,
      module: "Users",
      affectedRecord: account.id,
      description: `${action} user account ${account.name}`,
      remarks,
      status: "Completed",
    }, ...current]);
  };

  const submitNewUser = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.username.trim() || !form.password.trim()) {
      toast.error("Name, email, username, and temporary password are required.");
      return;
    }
    if (saving) return;
    setSaving(true);

    try {
      const saved = mapAccount(await createUserAccount({
        name: form.name.trim(),
        email: form.email.trim(),
        username: form.username.trim(),
        password: form.password,
        role: form.role,
        active: form.active,
        contact: form.contact.trim(),
        remarks: form.remarks.trim(),
        admin_id: Number(adminId) || undefined,
        admin_name: adminName,
      }));
      setUsers((current) => [saved, ...current]);
      recordUserAudit("Created", saved, form.remarks || "New account created.");
      setForm(emptyForm);
      toast.success("User account created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create user account.");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editing?.name.trim() || !editing.email.trim() || !editing.username.trim()) {
      toast.error("Name, email, and username are required.");
      return;
    }
    if (saving || !editing) return;
    setSaving(true);

    try {
      const saved = mapAccount(await updateUserAccount(editing.id, {
        name: editing.name.trim(),
        email: editing.email.trim(),
        username: editing.username.trim(),
        role: editing.role,
        active: editing.active,
        contact: editing.contact?.trim() || "",
        remarks: editing.remarks?.trim() || "Account details updated.",
        admin_id: Number(adminId) || undefined,
        admin_name: adminName,
      }));
      setUsers((current) => current.map((account) => account.id === saved.id ? saved : account));
      recordUserAudit("Updated", saved, editing.remarks || "Account details updated.");
      setEditing(null);
      toast.success("User account updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update user account.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (account: Account) => {
    if (saving) return;
    const next = !account.active;
    setSaving(true);

    try {
      const saved = mapAccount(await updateUserAccountStatus(account.id, {
        active: next,
        admin_id: Number(adminId) || undefined,
        admin_name: adminName,
        remarks: next ? "Account activated." : "Account deactivated.",
      }));
      setUsers((current) => current.map((item) => item.id === saved.id ? saved : item));
      recordUserAudit(next ? "Activated" : "Deactivated", saved, next ? "Account activated." : "Account deactivated.");
      toast.success(`Account ${next ? "activated" : "deactivated"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update account status.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2"><Users className="h-6 w-6 text-emerald-700" />User Management</h1>
        <p className="text-muted-foreground">Create and maintain system user accounts.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Plus className="h-4 w-4 text-emerald-700" />Add User Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1"><Label>Full Name</Label><Input autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Email Address</Label><Input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1"><Label>Username</Label><Input autoComplete="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
            <div className="space-y-1"><Label>Temporary Password</Label><Input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: normalizeRole(value) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([role, label]) => <SelectItem key={role} value={role}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Contact Number</Label><Input autoComplete="tel" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.active ? "active" : "inactive"} onValueChange={(value) => setForm({ ...form, active: value === "active" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Remarks</Label><Input autoComplete="off" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></div>
            <div className="md:col-span-2 xl:col-span-4 flex justify-end">
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={submitNewUser} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Save User
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_180px_150px]">
            <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {Object.entries(ROLE_LABELS).map(([role, label]) => <SelectItem key={role} value={role}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="true">Active</SelectItem><SelectItem value="false">Inactive</SelectItem></SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead><TableHead>Username</TableHead><TableHead>Role</TableHead>
                <TableHead>Contact</TableHead><TableHead>Status</TableHead><TableHead>Last Login</TableHead><TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((account) => (
                <TableRow key={account.id}>
                  <TableCell><div className="font-medium">{account.name}</div><div className="text-xs text-muted-foreground">{account.email}</div></TableCell>
                  <TableCell>{account.username || "-"}</TableCell>
                  <TableCell>{roleLabel(account.role)}</TableCell>
                  <TableCell>{account.contact || "-"}</TableCell>
                  <TableCell><Badge className={account.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}>{account.active ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell className="text-xs">{account.lastLogin || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setEditing(account)} title="Edit"><Edit className="h-3.5 w-3.5" /></Button>
                      <Button variant="outline" size="icon" className={`h-8 w-8 ${account.active ? "border-red-200 text-red-700 hover:bg-red-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`} onClick={() => toggleStatus(account)} title={account.active ? "Deactivate" : "Activate"}>
                        <Power className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredUsers.length === 0 && <div className="rounded-md border bg-slate-50 p-4 text-center text-sm text-muted-foreground">No user accounts found.</div>}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:!max-w-[640px]">
          {editing && (
            <div className="space-y-4">
              <DialogHeader><DialogTitle className="flex items-center gap-2 text-emerald-700"><Edit className="h-5 w-5" />Edit User Account</DialogTitle></DialogHeader>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1"><Label>Full Name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
                <div className="space-y-1"><Label>Email Address</Label><Input type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
                <div className="space-y-1"><Label>Username</Label><Input value={editing.username} onChange={(e) => setEditing({ ...editing, username: e.target.value })} /></div>
                <div className="space-y-1">
                  <Label>Role</Label>
                  <Select value={editing.role} onValueChange={(value) => setEditing({ ...editing, role: normalizeRole(value) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(ROLE_LABELS).map(([role, label]) => <SelectItem key={role} value={role}>{label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Contact Number</Label><Input value={editing.contact || ""} onChange={(e) => setEditing({ ...editing, contact: e.target.value })} /></div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={editing.active ? "active" : "inactive"} onValueChange={(value) => setEditing({ ...editing, active: value === "active" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 md:col-span-2"><Label>Remarks</Label><Textarea value={editing.remarks || ""} onChange={(e) => setEditing({ ...editing, remarks: e.target.value })} /></div>
              </div>
              <div className="flex flex-col-reverse gap-2 border-t pt-3 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={saveEdit} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BeneficiaryHarvesterManagement({ beneficiaries, setBeneficiaries, users, setUsers, setAudit, adminId, adminName }: {
  beneficiaries: MasterBeneficiary[];
  setBeneficiaries: React.Dispatch<React.SetStateAction<MasterBeneficiary[]>>;
  users: Account[];
  setUsers: (u: Account[]) => void;
  setAudit: React.Dispatch<React.SetStateAction<AuditRow[]>>;
  adminId: string;
  adminName: string;
}) {
  const [tab, setTab] = useState<"beneficiaries" | "harvesters">("beneficiaries");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<MasterBeneficiary | null>(null);
  const [statusTarget, setStatusTarget] = useState<MasterBeneficiary | null>(null);
  const [beneficiaryForm, setBeneficiaryForm] = useState({ code: "", name: "", contact: "", address: "", active: true, remarks: "" });
  const [harvesterForm, setHarvesterForm] = useState({ name: "", email: "", username: "", password: "", passwordConfirm: "", contact: "", active: true, remarks: "" });
  const harvesters = users.filter((user) => user.role === "harvester");

  const recordManagementAudit = (action: AuditRow["action"], module: string, affectedRecord: string, description: string, remarks?: string) => {
    setAudit((current) => [{
      id: `AUD-${Date.now()}`,
      ts: now(),
      user: adminName,
      role: "manager_admin",
      action,
      module,
      affectedRecord,
      description,
      remarks,
      status: "Completed",
    }, ...current]);
  };

  const filteredBeneficiaries = beneficiaries.filter((beneficiary) => {
    const query = search.toLowerCase();
    return !query || `${beneficiary.code} ${beneficiary.name} ${beneficiary.contact} ${beneficiary.address}`.toLowerCase().includes(query);
  });

  const filteredHarvesters = harvesters.filter((harvester) => {
    const query = search.toLowerCase();
    return !query || `${harvester.name} ${harvester.email} ${harvester.username}`.toLowerCase().includes(query);
  });

  const submitBeneficiary = async () => {
    if (!beneficiaryForm.name.trim()) {
      toast.error("Beneficiary name is required");
      return;
    }
    if (saving) return;
    setSaving(true);

    try {
      const saved = mapBeneficiary(await createBeneficiary({
        code: beneficiaryForm.code.trim(),
        name: beneficiaryForm.name.trim(),
        contact_number: beneficiaryForm.contact.trim(),
        address: beneficiaryForm.address.trim(),
        active: beneficiaryForm.active,
        remarks: beneficiaryForm.remarks.trim(),
        admin_id: Number(adminId) || undefined,
        admin_name: adminName,
      }));
      setBeneficiaries((current) => [saved, ...current]);
      recordManagementAudit("Created", "Beneficiaries", saved.id, `Created beneficiary ${saved.name}`, beneficiaryForm.remarks || "New beneficiary added.");
      setBeneficiaryForm({ code: "", name: "", contact: "", address: "", active: true, remarks: "" });
      toast.success("Beneficiary added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create beneficiary.");
    } finally {
      setSaving(false);
    }
  };

  const saveBeneficiaryEdit = async () => {
    if (!editingBeneficiary?.name.trim()) {
      toast.error("Beneficiary name is required");
      return;
    }
    if (saving || !editingBeneficiary) return;
    setSaving(true);

    try {
      const saved = mapBeneficiary(await updateBeneficiary(editingBeneficiary.id, {
        code: editingBeneficiary.code.trim(),
        name: editingBeneficiary.name.trim(),
        contact_number: editingBeneficiary.contact.trim(),
        address: editingBeneficiary.address.trim(),
        active: editingBeneficiary.active,
        remarks: "Beneficiary master record updated.",
        admin_id: Number(adminId) || undefined,
        admin_name: adminName,
      }));
      setBeneficiaries((current) => current.map((beneficiary) => beneficiary.id === saved.id ? saved : beneficiary));
      recordManagementAudit("Updated", "Beneficiaries", saved.id, `Updated beneficiary ${saved.name}`, "Beneficiary master record updated.");
      setEditingBeneficiary(null);
      toast.success("Beneficiary updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update beneficiary.");
    } finally {
      setSaving(false);
    }
  };

  const confirmBeneficiaryStatus = async () => {
    if (!statusTarget || saving) return;
    const next = !statusTarget.active;
    setSaving(true);

    try {
      const saved = mapBeneficiary(await updateBeneficiaryStatus(statusTarget.id, {
        active: next,
        admin_id: Number(adminId) || undefined,
        admin_name: adminName,
        remarks: next ? "Beneficiary restored for selection." : "Beneficiary hidden from new transaction selection.",
      }));
      setBeneficiaries((current) => current.map((beneficiary) => beneficiary.id === saved.id ? saved : beneficiary));
      recordManagementAudit(next ? "Activated" : "Deactivated", "Beneficiaries", saved.id, `${next ? "Activated" : "Deactivated"} beneficiary ${saved.name}`);
      setStatusTarget(null);
      toast.success(`Beneficiary ${next ? "activated" : "deactivated"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update beneficiary status.");
    } finally {
      setSaving(false);
    }
  };

  const submitHarvester = async () => {
    if (!harvesterForm.name.trim() || !harvesterForm.email.trim() || !harvesterForm.username.trim() || !harvesterForm.password || !harvesterForm.passwordConfirm) {
      toast.error("Harvester name, email, username, and temporary password are required");
      return;
    }
    if (harvesterForm.password !== harvesterForm.passwordConfirm) {
      toast.error("Temporary password and confirmation must match");
      return;
    }
    if (saving) return;
    setSaving(true);

    try {
      const harvester = mapAccount(await createUserAccount({
        name: harvesterForm.name.trim(),
        email: harvesterForm.email.trim(),
        username: harvesterForm.username.trim(),
        password: harvesterForm.password,
        role: "harvester",
        active: harvesterForm.active,
        contact: harvesterForm.contact.trim(),
        remarks: harvesterForm.remarks.trim(),
        admin_id: Number(adminId) || undefined,
        admin_name: adminName,
      }));
      setUsers([harvester, ...users]);
      recordManagementAudit("Created", "Harvesters", harvester.id, `Created harvester ${harvester.name}`, harvesterForm.remarks || "New harvester added.");
      setHarvesterForm({ name: "", email: "", username: "", password: "", passwordConfirm: "", contact: "", active: true, remarks: "" });
      toast.success("Harvester added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create harvester.");
    } finally {
      setSaving(false);
    }
  };

  const updateHarvesterStatus = async (harvester: Account) => {
    if (saving) return;
    const next = !harvester.active;
    setSaving(true);

    try {
      const updated = mapAccount(await updateUserAccountStatus(harvester.id, {
        active: next,
        admin_id: Number(adminId) || undefined,
        admin_name: adminName,
        remarks: next ? "Harvester restored for production selection." : "Harvester disabled from new production selection.",
      }));
      setUsers(users.map((user) => user.id === updated.id ? updated : user));
      recordManagementAudit(next ? "Activated" : "Deactivated", "Harvesters", updated.id, `${next ? "Activated" : "Deactivated"} harvester ${updated.name}`);
      toast.success(`Harvester ${next ? "activated" : "deactivated"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update harvester status.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2"><UserPlus className="h-6 w-6 text-emerald-700" />Beneficiary / Harvester Management</h1>
          <p className="text-muted-foreground">Maintain selectable beneficiary and harvester master records.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button variant={tab === "beneficiaries" ? "default" : "outline"} className={tab === "beneficiaries" ? "bg-emerald-600 hover:bg-emerald-700" : ""} onClick={() => setTab("beneficiaries")}>Beneficiaries</Button>
          <Button variant={tab === "harvesters" ? "default" : "outline"} className={tab === "harvesters" ? "bg-emerald-600 hover:bg-emerald-700" : ""} onClick={() => setTab("harvesters")}>Harvesters</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4 text-emerald-700" />Add {tab === "beneficiaries" ? "Beneficiary" : "Harvester"}</CardTitle>
        </CardHeader>
        <CardContent>
          {tab === "beneficiaries" ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1"><Label>Beneficiary Code</Label><Input name="beneficiary_code" autoComplete="off" value={beneficiaryForm.code} onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, code: e.target.value })} placeholder="Auto-generated if blank" /></div>
              <div className="space-y-1"><Label>Complete Name</Label><Input name="beneficiary_full_name" autoComplete="name" value={beneficiaryForm.name} onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, name: e.target.value })} /></div>
              <div className="space-y-1"><Label>Contact Number</Label><Input name="beneficiary_contact_number" autoComplete="tel" inputMode="tel" value={beneficiaryForm.contact} onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, contact: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={beneficiaryForm.active ? "active" : "inactive"} onValueChange={(value) => setBeneficiaryForm({ ...beneficiaryForm, active: value === "active" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1 md:col-span-2"><Label>Address</Label><Input name="beneficiary_address" autoComplete="street-address" value={beneficiaryForm.address} onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, address: e.target.value })} /></div>
              <div className="space-y-1 md:col-span-2"><Label>Remarks</Label><Input name="beneficiary_notes" autoComplete="off" data-lpignore="true" data-1p-ignore="true" value={beneficiaryForm.remarks} onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, remarks: e.target.value })} /></div>
              <div className="md:col-span-2 xl:col-span-4 flex justify-end"><Button className="bg-emerald-600 hover:bg-emerald-700" onClick={submitBeneficiary} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}Save Beneficiary</Button></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1"><Label>Harvester Name</Label><Input value={harvesterForm.name} onChange={(e) => setHarvesterForm({ ...harvesterForm, name: e.target.value })} /></div>
              <div className="space-y-1"><Label>Email Address</Label><Input type="email" value={harvesterForm.email} onChange={(e) => setHarvesterForm({ ...harvesterForm, email: e.target.value })} /></div>
              <div className="space-y-1"><Label>Username</Label><Input value={harvesterForm.username} onChange={(e) => setHarvesterForm({ ...harvesterForm, username: e.target.value })} /></div>
              <div className="space-y-1"><Label>Contact Information</Label><Input value={harvesterForm.contact} onChange={(e) => setHarvesterForm({ ...harvesterForm, contact: e.target.value })} /></div>
              <div className="space-y-1"><Label>Temporary Password</Label><Input type="password" value={harvesterForm.password} onChange={(e) => setHarvesterForm({ ...harvesterForm, password: e.target.value })} /></div>
              <div className="space-y-1"><Label>Confirm Password</Label><Input type="password" value={harvesterForm.passwordConfirm} onChange={(e) => setHarvesterForm({ ...harvesterForm, passwordConfirm: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={harvesterForm.active ? "active" : "inactive"} onValueChange={(value) => setHarvesterForm({ ...harvesterForm, active: value === "active" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Remarks</Label><Input value={harvesterForm.remarks} onChange={(e) => setHarvesterForm({ ...harvesterForm, remarks: e.target.value })} /></div>
              <div className="md:col-span-2 xl:col-span-4 flex justify-end"><Button className="bg-emerald-600 hover:bg-emerald-700" onClick={submitHarvester} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}Save Harvester</Button></div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="text-base">{tab === "beneficiaries" ? "Beneficiary Master List" : "Harvester Master List"}</CardTitle>
          <Input className="w-full lg:w-80" placeholder={`Search ${tab === "beneficiaries" ? "beneficiaries" : "harvesters"}...`} value={search} onChange={(e) => setSearch(e.target.value)} />
        </CardHeader>
        <CardContent>
          {tab === "beneficiaries" ? (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Status</TableHead><TableHead>Updated</TableHead><TableHead>Action</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {filteredBeneficiaries.map((beneficiary) => (
                  <TableRow key={beneficiary.id}>
                    <TableCell className="text-xs">{beneficiary.code || "-"}</TableCell>
                    <TableCell><div>{beneficiary.name}</div><div className="text-xs text-muted-foreground">{beneficiary.address || "-"}</div></TableCell>
                    <TableCell>{beneficiary.contact || "-"}</TableCell>
                    <TableCell><Badge className={beneficiary.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}>{beneficiary.active ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell className="text-xs">{beneficiary.updatedAt || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <button className="p-1.5 rounded bg-sky-100 text-sky-700 hover:bg-sky-200" onClick={() => setEditingBeneficiary(beneficiary)} title="Edit"><Edit className="h-3.5 w-3.5" /></button>
                        <button className={`p-1.5 rounded ${beneficiary.active ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"}`} onClick={() => setStatusTarget(beneficiary)} title={beneficiary.active ? "Deactivate" : "Activate"}><Power className="h-3.5 w-3.5" /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Harvester</TableHead><TableHead>Username</TableHead><TableHead>Contact</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead>Action</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {filteredHarvesters.map((harvester) => (
                  <TableRow key={harvester.id}>
                    <TableCell><div>{harvester.name}</div><div className="text-xs text-muted-foreground">{harvester.email}</div></TableCell>
                    <TableCell>{harvester.username}</TableCell>
                    <TableCell>{harvester.contact || "-"}</TableCell>
                    <TableCell><Badge className={harvester.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}>{harvester.active ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell className="text-xs">{harvester.createdAt || "-"}</TableCell>
                    <TableCell>
                      <button className={`p-1.5 rounded ${harvester.active ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"}`} onClick={() => updateHarvesterStatus(harvester)} title={harvester.active ? "Deactivate" : "Activate"}>
                        <Power className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingBeneficiary} onOpenChange={(open) => !open && setEditingBeneficiary(null)}>
        <DialogContent className="!max-w-[calc(100vw-1rem)] w-[calc(100vw-1rem)] sm:!max-w-[640px]">
          {editingBeneficiary && (
            <>
              <DialogHeader><DialogTitle className="flex items-center gap-2 text-emerald-700"><Edit className="h-5 w-5" />Edit Beneficiary</DialogTitle></DialogHeader>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1"><Label>Beneficiary Code</Label><Input name="edit_beneficiary_code" autoComplete="off" value={editingBeneficiary.code} onChange={(e) => setEditingBeneficiary({ ...editingBeneficiary, code: e.target.value })} /></div>
                <div className="space-y-1"><Label>Complete Name</Label><Input name="edit_beneficiary_full_name" autoComplete="name" value={editingBeneficiary.name} onChange={(e) => setEditingBeneficiary({ ...editingBeneficiary, name: e.target.value })} /></div>
                <div className="space-y-1"><Label>Contact Number</Label><Input name="edit_beneficiary_contact_number" autoComplete="tel" inputMode="tel" value={editingBeneficiary.contact} onChange={(e) => setEditingBeneficiary({ ...editingBeneficiary, contact: e.target.value })} /></div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={editingBeneficiary.active ? "active" : "inactive"} onValueChange={(value) => setEditingBeneficiary({ ...editingBeneficiary, active: value === "active" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 md:col-span-2"><Label>Address</Label><Textarea name="edit_beneficiary_address" autoComplete="street-address" value={editingBeneficiary.address} onChange={(e) => setEditingBeneficiary({ ...editingBeneficiary, address: e.target.value })} /></div>
              </div>
              <div className="flex flex-col-reverse gap-2 pt-2 border-t sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto">
                <Button variant="outline" onClick={() => setEditingBeneficiary(null)} disabled={saving}>Cancel</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={saveBeneficiaryEdit} disabled={saving}>Save Changes</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!statusTarget} onOpenChange={(open) => !open && !saving && setStatusTarget(null)}>
        <DialogContent className="!max-w-[calc(100vw-1rem)] w-[calc(100vw-1rem)] sm:!max-w-[480px]">
          {statusTarget && (
            <>
              <DialogHeader><DialogTitle>{statusTarget.active ? "Deactivate" : "Activate"} Beneficiary</DialogTitle></DialogHeader>
              <p className="text-sm">Are you sure you want to <strong>{statusTarget.active ? "deactivate" : "activate"}</strong> <strong>{statusTarget.name}</strong>?</p>
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto">
                <Button variant="outline" onClick={() => setStatusTarget(null)} disabled={saving}>Cancel</Button>
                <Button className={statusTarget.active ? "bg-red-600 hover:bg-red-700 text-white" : "bg-emerald-600 hover:bg-emerald-700"} onClick={confirmBeneficiaryStatus} disabled={saving}>
                  {statusTarget.active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DatabaseCleanup({ adminId, adminName, adminEmail, setAudit }: {
  adminId: string;
  adminName: string;
  adminEmail: string;
  setAudit: React.Dispatch<React.SetStateAction<AuditRow[]>>;
}) {
  const [tables, setTables] = useState<MaintenanceTable[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);

  const loadTables = async () => {
    setLoadingTables(true);
    try {
      const payload = await fetchMaintenanceTables();
      setTables(payload.tables);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load database tables.");
    } finally {
      setLoadingTables(false);
    }
  };

  const unlockModule = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password.trim() || unlocking) return;

    setUnlocking(true);
    try {
      await verifyAdminPassword(adminId, adminEmail, password);
      setUnlocked(true);
      setPassword("");
      toast.success("Database Cleanup unlocked");
      void loadTables();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Admin password verification failed.");
    } finally {
      setUnlocking(false);
    }
  };

  const deleteAll = async () => {
    const required = "DELETE ALL DATABASE DATA";
    if (deleting) return;
    if (confirmation !== required) {
      toast.error("Type the exact confirmation text before deleting.");
      return;
    }

    setDeleting(true);
    try {
      const result = await deleteAllMaintenanceTables({
        confirmation,
        user_id: Number(adminId) || undefined,
        user_name: adminName,
      });
      setTables(result.tables);
      setAudit((current) => [{
        ts: now(),
        user: adminName,
        role: "manager_admin",
        action: "Deleted",
        module: "Database Maintenance",
        affectedRecord: "All cleanup tables",
        description: `Deleted all database cleanup data. Estimated deleted records: ${result.deleted}`,
        remarks: "Core system accounts were preserved.",
        status: "Completed",
      }, ...current]);
      toast.success(`Deleted database data across all cleanup tables`);
      setBulkOpen(false);
      setConfirmation("");
      await loadTables();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete all database records.");
    } finally {
      setDeleting(false);
    }
  };

  const availableDeletes = tables.reduce((sum, table) => sum + table.deletable_records, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <div>
          <h1 className="flex items-center gap-2"><Database className="h-6 w-6 text-emerald-700" />Database Cleanup</h1>
          <p className="text-muted-foreground">Clear system data while keeping the five core accounts active.</p>
        </div>
      </div>

      <div className="relative min-h-[280px]">
        <div className={unlocked ? "space-y-4" : "pointer-events-none select-none space-y-4 blur-sm"}>
          <Card>
            <CardContent className="p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div>
                  <h2 className="text-lg font-semibold">Delete All Database Data</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {loadingTables ? "Loading cleanup details..." : "This removes all eligible records in one operation."}
                  </p>
                </div>
                  <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Permanent action. The five core accounts and role access are preserved.</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                  <Button className="h-11 bg-red-600 px-5 text-white hover:bg-red-700" onClick={() => { setBulkOpen(true); setConfirmation(""); }}>
                    <Trash2 className="mr-2 h-4 w-4" />Delete All Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Dialog open={bulkOpen} onOpenChange={(open) => { if (!open && !deleting) { setBulkOpen(false); setConfirmation(""); } }}>
            <DialogContent className="w-[calc(100vw-1rem)] sm:!max-w-[600px]">
              <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-red-700"><Trash2 className="h-5 w-5" />Delete All Database Data</DialogTitle>
                </DialogHeader>
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                  This permanently deletes all eligible data. Core accounts and role access remain protected.
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <AuditDetail label="Tables Included" value={String(tables.filter((table) => table.name !== "users").length)} />
                  <AuditDetail label="Deletable Records" value={availableDeletes.toLocaleString()} />
                  <AuditDetail label="Protected Users" value="5 accounts" />
                </div>
                <div className="space-y-2">
                  <Label>Type this confirmation text</Label>
                  <code className="block rounded bg-slate-100 px-3 py-2 text-sm">DELETE ALL DATABASE DATA</code>
                  <Input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="DELETE ALL DATABASE DATA" />
                </div>
                <div className="flex flex-col-reverse gap-2 border-t pt-3 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={() => { setBulkOpen(false); setConfirmation(""); }} disabled={deleting}>Cancel</Button>
                  <Button className="bg-red-600 text-white hover:bg-red-700" onClick={deleteAll} disabled={deleting || confirmation !== "DELETE ALL DATABASE DATA"}>
                    {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}Delete All Data
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {!unlocked && (
          <div className="absolute inset-0 z-10 flex items-start justify-center pt-4 sm:pt-8">
            <Card className="w-full max-w-md border-emerald-200 bg-white/95 shadow-lg backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-emerald-800">
                  <LockKeyhole className="h-5 w-5" />Admin Password Required
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={unlockModule}>
                  <div className="space-y-1.5">
                    <Label htmlFor="database-cleanup-password">Password</Label>
                    <Input
                      id="database-cleanup-password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      placeholder="Enter admin password"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={unlocking || !password.trim()}>
                    {unlocking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LockKeyhole className="mr-2 h-4 w-4" />}
                    Unlock Module
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

const ROLE_DESCRIPTIONS: Record<Role, { description: string; permissions: string[] }> = {
  manager_admin: {
    description: "Full oversight and approval access across all entities.",
    permissions: [
      "Review and approve payroll", "Approve or return restock requests",
      "View all reports and monitoring dashboards", "Manage users and role access",
      "View audit logs and system activity",
    ],
  },
  finance_officer: {
    description: "Validates beneficiary payroll slips and audits financial records.",
    permissions: ["Validate payroll", "Return payroll for correction", "View payroll history", "Generate validation reports"],
  },
  payroll_personnel: {
    description: "Prepares beneficiary payroll using production and inventory data.",
    permissions: ["Create beneficiary payroll", "Enter labor cost", "Submit payroll for validation", "View payroll history"],
  },
  inventory_bookkeeper: {
    description: "Maintains inventory items, releases, and credit transactions.",
    permissions: ["Add inventory items", "Record stock-in", "Release materials", "Submit restock requests"],
  },
  production_clerk: {
    description: "Encodes daily production data from harvested boxes.",
    permissions: ["Encode harvest logs", "Encode boxes per group", "Encode harvest parameters", "View production records"],
  },
  harvester: {
    description: "Listed harvester account used for accurate production encoding.",
    permissions: ["Available for harvest record selection"],
  },
};

const PERMISSION_MATRIX = [
  "Dashboard (View)", "Payroll (Approve)", "Restock (Approve)", "Production (View)",
  "Inventory (View)", "Reports (View)", "Audit Logs (View)", "User Management",
  "Role Access", "System Settings",
];

function SettingsRoleAccess({ permissions, setPermissions, adminId, adminName }: {
  permissions: RolePermission[];
  setPermissions: (permissions: RolePermission[]) => void;
  adminId: string;
  adminName: string;
}) {
  const [role, setRole] = useState<Role>("manager_admin");
  const [saving, setSaving] = useState(false);
  const desc = ROLE_DESCRIPTIONS[role];
  const rolePermissions = PERMISSION_MATRIX.map((permission) => {
    const found = permissions.find((item) => item.role === role && item.permission === permission);
    return { role, permission, allowed: found?.allowed ?? (desc.permissions.includes(permission) || role === "manager_admin") };
  });

  const togglePermission = (permission: string) => {
    setPermissions([
      ...permissions.filter((item) => !(item.role === role && item.permission === permission)),
      {
        role,
        permission,
        allowed: !rolePermissions.find((item) => item.permission === permission)?.allowed,
      },
    ]);
  };

  const savePermissions = async () => {
    try {
      setSaving(true);
      const saved = await updateRolePermissions({
        role,
        permissions: rolePermissions.map(({ permission, allowed }) => ({ permission, allowed })),
        user_id: Number(adminId) || undefined,
        user_name: adminName,
      });
      setPermissions(saved.map(mapRolePermission));
      toast.success("Role access saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save role access.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2"><Settings className="h-6 w-6 text-emerald-700" />Settings / Role Access</h1>
        <p className="text-muted-foreground">Review and update system permissions for each role.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Role</CardTitle></CardHeader>
          <CardContent>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([r, l]) => <SelectItem key={r} value={r}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Role Description</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div>{desc.description}</div>
            <ul className="space-y-1.5">
              {desc.permissions.map((p) => (
                <li key={p} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span>{p}</span></li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Permission Matrix</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {rolePermissions.map((p) => (
              <div key={p.permission} className={`p-3 border rounded-md ${p.allowed ? "bg-emerald-50/50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                <div className="text-sm">{p.permission}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    type="checkbox"
                    checked={p.allowed}
                    onChange={() => togglePermission(p.permission)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span className={`text-xs ${p.allowed ? "text-emerald-700" : "text-muted-foreground"}`}>{p.allowed ? "Allowed" : "Disabled"}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto">
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={savePermissions} disabled={saving}>
              {saving ? "Saving..." : "Save Role Access"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-base">Operational Roles Overview</CardTitle>
          <p className="text-xs text-muted-foreground">Operational roles encode and validate data. Manager / Admin reviews and approves.</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { name: "Production Clerk", role: "Encode Production", icon: <ClipboardCheck className="h-4 w-4" /> },
              { name: "Payroll Personnel", role: "Encode Payroll", icon: <Wallet className="h-4 w-4" /> },
              { name: "Finance Officer", role: "Validate Payroll", icon: <CheckCircle2 className="h-4 w-4" /> },
              { name: "Bookkeeper", role: "Financial Records", icon: <FileBarChart2 className="h-4 w-4" /> },
            ].map((r) => (
              <Card key={r.name} className="border-emerald-200">
                <CardContent className="p-4">
                  <div className="inline-flex h-9 w-9 rounded-full items-center justify-center bg-emerald-100 text-emerald-700">{r.icon}</div>
                  <div className="mt-2">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.role}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div>{value}</div>
    </div>
  );
}




