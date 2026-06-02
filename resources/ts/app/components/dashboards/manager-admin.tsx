import { useEffect, useMemo, useState } from "react";
import { DarbcoLayout } from "../darbco-layout";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import {
  LayoutDashboard, ClipboardCheck, PackagePlus, Activity, FileBarChart2, History, Users, Settings,
  TrendingUp, AlertTriangle, Wallet, CheckCircle2, Eye, Undo2, Plus, ArrowRight, Edit, Power,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import { Role, ROLE_LABELS, User } from "../types";
import { toast } from "sonner";
import { useAppData } from "../../lib/app-data-context";

interface Props { user: User; onLogout: () => void }

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "payroll", label: "Payroll Approvals", icon: <ClipboardCheck className="h-4 w-4" /> },
  { id: "restock", label: "Restock Requests", icon: <PackagePlus className="h-4 w-4" /> },
  { id: "reports", label: "Reports", icon: <FileBarChart2 className="h-4 w-4" /> },
  { id: "audit", label: "Audit History", icon: <History className="h-4 w-4" /> },
  { id: "users", label: "User Management", icon: <Users className="h-4 w-4" /> },
  { id: "settings", label: "Settings / Role Access", icon: <Settings className="h-4 w-4" /> },
];

interface PayrollRow {
  id: string; name: string; date: string; period: string; gross: number; deductions: number; net: number;
  validatedBy: string; status: "Validated" | "Approved" | "Returned";
  returnReason?: string;
}
interface RestockRow {
  id: string; item: string; category: string; currentStock: number; reorder: number;
  qty: number; requestedBy: string; date: string; status: "Pending Review" | "Approved" | "Returned";
  returnReason?: string;
}
interface AuditRow {
  ts: string; user: string; action: "Validated" | "Submitted" | "Approved" | "Returned"; module: string; description: string; status: "Completed" | "Returned";
}
interface Account {
  id: string; name: string; email: string; username: string; role: Role; active: boolean; lastLogin: string;
}

const PAYROLL_SEED: PayrollRow[] = [
  { id: "PB-2026-0010", name: "Roberto Cruz (B-001)", date: "2026-05-31", period: "May 16 – May 31, 2026", gross: 22080, deductions: 6500, net: 15580, validatedBy: "Pedro Mendoza", status: "Validated" },
  { id: "PB-2026-0011", name: "Helena Pascual (B-004)", date: "2026-05-31", period: "May 16 – May 31, 2026", gross: 38400, deductions: 7400, net: 31000, validatedBy: "Pedro Mendoza", status: "Validated" },
  { id: "PB-2026-0012", name: "Liza Mariano (B-002)", date: "2026-05-31", period: "May 16 – May 31, 2026", gross: 22080, deductions: 4520, net: 17560, validatedBy: "Pedro Mendoza", status: "Validated" },
  { id: "PB-2026-0009", name: "Ferdinand Lopez (B-005)", date: "2026-05-30", period: "May 16 – May 31, 2026", gross: 28800, deductions: 5200, net: 23600, validatedBy: "Pedro Mendoza", status: "Approved" },
];

const RESTOCK_SEED: RestockRow[] = [
  { id: "REQ-014", item: "Complete 14-14-14 Fertilizer", category: "Fertilizers & Soil Inputs", currentStock: 8, reorder: 50, qty: 60, requestedBy: "Bookkeeper", date: "2026-05-30", status: "Pending Review" },
  { id: "REQ-015", item: "Cluster Pack Bag", category: "Packaging Materials", currentStock: 120, reorder: 500, qty: 1000, requestedBy: "Bookkeeper", date: "2026-05-30", status: "Pending Review" },
  { id: "REQ-016", item: "Pesticide (Cypermethrin)", category: "Chemicals & Crop Protection", currentStock: 2, reorder: 10, qty: 12, requestedBy: "Bookkeeper", date: "2026-05-29", status: "Pending Review" },
  { id: "REQ-013", item: "Twine / Rope", category: "Farm Materials", currentStock: 5, reorder: 15, qty: 20, requestedBy: "Bookkeeper", date: "2026-05-28", status: "Approved" },
];

const AUDIT_SEED: AuditRow[] = [
  { ts: "2026-05-31 14:42", user: "Pedro Mendoza", action: "Validated", module: "Payroll", description: "Validated payroll PB-2026-0012 for Liza Mariano", status: "Completed" },
  { ts: "2026-05-31 14:30", user: "Ana Dela Cruz", action: "Submitted", module: "Payroll", description: "Submitted PB-2026-0012 for validation", status: "Completed" },
  { ts: "2026-05-31 13:10", user: "Cecilia Aquino", action: "Approved", module: "Payroll", description: "Approved payroll PB-2026-0009 for Ferdinand Lopez", status: "Completed" },
  { ts: "2026-05-31 12:05", user: "Jose Reyes", action: "Submitted", module: "Inventory", description: "Submitted restock request REQ-016 for Pesticide", status: "Completed" },
  { ts: "2026-05-30 16:48", user: "Cecilia Aquino", action: "Returned", module: "Payroll", description: "Returned PB-2026-0008 — labor cost amount mismatch", status: "Returned" },
  { ts: "2026-05-30 09:15", user: "Cecilia Aquino", action: "Approved", module: "Inventory", description: "Approved restock request REQ-013 for Twine / Rope", status: "Completed" },
];

const USERS_SEED: Account[] = [
  { id: "u-005", name: "Cecilia Aquino", email: "admin@darbco.coop", username: "cecilia.aquino", role: "manager_admin", active: true, lastLogin: "2026-05-31 13:08" },
  { id: "u-004", name: "Pedro Mendoza", email: "finance@darbco.coop", username: "pedro.mendoza", role: "finance_officer", active: true, lastLogin: "2026-05-31 14:50" },
  { id: "u-003", name: "Ana Dela Cruz", email: "payroll@darbco.coop", username: "ana.delacruz", role: "payroll_personnel", active: true, lastLogin: "2026-05-31 14:35" },
  { id: "u-002", name: "Jose Reyes", email: "inventory@darbco.coop", username: "jose.reyes", role: "inventory_bookkeeper", active: true, lastLogin: "2026-05-31 09:20" },
  { id: "u-001", name: "Maria Santos", email: "clerk@darbco.coop", username: "maria.santos", role: "production_clerk", active: true, lastLogin: "2026-05-31 08:42" },
];

const MONTHLY_PRODUCTION = [
  { day: "May 01", boxes: 280 }, { day: "May 04", boxes: 320 }, { day: "May 07", boxes: 410 },
  { day: "May 10", boxes: 380 }, { day: "May 13", boxes: 460 }, { day: "May 16", boxes: 510 },
  { day: "May 19", boxes: 490 }, { day: "May 22", boxes: 520 }, { day: "May 25", boxes: 480 },
  { day: "May 28", boxes: 540 }, { day: "May 31", boxes: 570 },
];

const HARVEST_7 = [
  { day: "May 25", boxes: 12 }, { day: "May 26", boxes: 14 }, { day: "May 27", boxes: 11 },
  { day: "May 28", boxes: 16 }, { day: "May 29", boxes: 13 }, { day: "May 30", boxes: 12 },
  { day: "May 31", boxes: 14 },
];

const TOP_WORKERS = [
  { rank: 1, name: "SALUDEZ LOUI", output: 42 },
  { rank: 2, name: "Yatal", output: 28 },
  { rank: 3, name: "Mona", output: 16 },
  { rank: 4, name: "Pedro Alvarez", output: 14 },
  { rank: 5, name: "Mario Lopez", output: 11 },
];

export function ManagerAdminDashboard({ user, onLogout }: Props) {
  const { data } = useAppData();
  const [active, setActive] = useState("dashboard");
  const [payroll, setPayroll] = useState(PAYROLL_SEED);
  const [restock, setRestock] = useState(RESTOCK_SEED);
  const [audit, setAudit] = useState(AUDIT_SEED);
  const [users, setUsers] = useState(USERS_SEED);

  useEffect(() => {
    if (data?.users?.length) {
      setUsers(data.users.map((u: any) => ({
        id: String(u.id),
        name: u.name,
        email: u.email,
        username: u.username || "",
        role: normalizeRole(u.role),
        active: Boolean(u.active),
        lastLogin: u.last_login_at || "-",
      })));
    }
  }, [data?.users]);

  useEffect(() => {
    if (data?.auditLogs?.length) {
      setAudit(data.auditLogs.map((log: any) => ({
        ts: log.created_at || "",
        user: log.user_name || "System",
        action: normalizeAuditAction(log.action),
        module: log.module || "System",
        description: log.details || `${log.action || "Updated"} ${log.module || "record"}`,
        status: log.action === "Returned" ? "Returned" : "Completed",
      })));
    }
  }, [data?.auditLogs]);

  const approvePayroll = (id: string) => {
    setPayroll((cur) => cur.map((r) => r.id === id ? { ...r, status: "Approved" } : r));
    setAudit((cur) => [{ ts: now(), user: user.name, action: "Approved", module: "Payroll", description: `Approved payroll ${id}`, status: "Completed" }, ...cur]);
    toast.success(`${id} approved`);
  };
  const returnPayroll = (id: string, reason: string) => {
    setPayroll((cur) => cur.map((r) => r.id === id ? { ...r, status: "Returned", returnReason: reason } : r));
    setAudit((cur) => [{ ts: now(), user: user.name, action: "Returned", module: "Payroll", description: `Returned payroll ${id} — ${reason}`, status: "Returned" }, ...cur]);
    toast.success(`${id} returned for correction`);
  };
  const approveRestock = (id: string) => {
    setRestock((cur) => cur.map((r) => r.id === id ? { ...r, status: "Approved" } : r));
    setAudit((cur) => [{ ts: now(), user: user.name, action: "Approved", module: "Inventory", description: `Approved restock ${id}`, status: "Completed" }, ...cur]);
    toast.success(`${id} approved`);
  };
  const returnRestock = (id: string, reason: string) => {
    setRestock((cur) => cur.map((r) => r.id === id ? { ...r, status: "Returned", returnReason: reason } : r));
    setAudit((cur) => [{ ts: now(), user: user.name, action: "Returned", module: "Inventory", description: `Returned restock ${id} — ${reason}`, status: "Returned" }, ...cur]);
    toast.success(`${id} returned`);
  };

  return (
    <DarbcoLayout user={user} onLogout={onLogout} navItems={NAV} active={active} onChange={setActive}>
      {active === "dashboard" && <Dashboard goTo={setActive} payroll={payroll} restock={restock} audit={audit} userName={user.name} onApprovePayroll={approvePayroll} onReturnPayroll={returnPayroll} onApproveRestock={approveRestock} onReturnRestock={returnRestock} />}
      {active === "payroll" && <PayrollApprovals payroll={payroll} onApprove={approvePayroll} onReturn={returnPayroll} />}
      {active === "restock" && <RestockRequests restock={restock} onApprove={approveRestock} onReturn={returnRestock} />}
      {active === "reports" && <Reports />}
      {active === "audit" && <AuditHistory audit={audit} />}
      {active === "users" && <UserManagement users={users} setUsers={setUsers} />}
      {active === "settings" && <SettingsRoleAccess />}
    </DarbcoLayout>
  );
}

function now() { return new Date().toISOString().slice(0, 16).replace("T", " "); }

function normalizeRole(role: string): Role {
  return Object.prototype.hasOwnProperty.call(ROLE_LABELS, role) ? role as Role : "production_clerk";
}

function normalizeAuditAction(action: string): AuditRow["action"] {
  if (action === "Validated" || action === "Submitted" || action === "Approved" || action === "Returned") return action;
  return "Submitted";
}

function Dashboard({ goTo, payroll, restock, audit, userName, onApprovePayroll, onReturnPayroll, onApproveRestock, onReturnRestock }: {
  goTo: (id: string) => void;
  payroll: PayrollRow[]; restock: RestockRow[]; audit: AuditRow[]; userName: string;
  onApprovePayroll: (id: string) => void; onReturnPayroll: (id: string, reason: string) => void;
  onApproveRestock: (id: string) => void; onReturnRestock: (id: string, reason: string) => void;
}) {
  const pendingPay = payroll.filter((r) => r.status === "Validated");
  const pendingPayAmount = pendingPay.reduce((s, r) => s + r.net, 0);
  const pendingRestock = restock.filter((r) => r.status === "Pending Review");
  const pendingRestockAmount = 12340;
  const approvedThisWeek = payroll.filter((r) => r.status === "Approved").length + restock.filter((r) => r.status === "Approved").length + 21;

  const donutData = [
    { name: "Approved", value: payroll.filter((r) => r.status === "Approved").length + 25, color: "#10b981" },
    { name: "Pending", value: pendingPay.length, color: "#f59e0b" },
    { name: "Returned", value: payroll.filter((r) => r.status === "Returned").length + 3, color: "#ef4444" },
  ];
  const donutTotal = donutData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2"><LayoutDashboard className="h-6 w-6 text-emerald-700" />Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {userName} — overview of farm operations and approval queue.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi color="amber" icon={<Wallet className="h-4 w-4" />} value="12" label="Pending Payroll Approvals" sub={`₱${pendingPayAmount.toLocaleString()}.00`} onClick={() => goTo("payroll")} />
        <Kpi color="amber" icon={<AlertTriangle className="h-4 w-4" />} value={String(pendingRestock.length)} label="Pending Restock Requests" sub={`₱${pendingRestockAmount.toLocaleString()}.00`} onClick={() => goTo("restock")} />
        <Kpi color="emerald" icon={<TrendingUp className="h-4 w-4" />} value="14" label="Production Today" sub="Boxes • ↑ 10% vs yesterday" onClick={() => goTo("ops")} />
        <Kpi color="emerald" icon={<CheckCircle2 className="h-4 w-4" />} value={String(approvedThisWeek)} label="Approved This Week" sub="Transactions • All modules" onClick={() => goTo("audit")} />
      </div>

      <ProductionSummary />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-700" />Monthly Production (Boxes)</CardTitle>
            <Badge className="bg-emerald-100 text-emerald-800">570 boxes</Badge>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <LineChart data={MONTHLY_PRODUCTION}>
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
          <div className="mt-3 flex justify-end">
            <Button variant="link" className="text-emerald-700" onClick={() => goTo("audit")}>View full audit history →</Button>
          </div>
        </CardContent>
      </Card>

      {/* hidden: silence unused */}
      <div className="hidden">{onReturnPayroll && onApproveRestock && onReturnRestock ? "" : ""}</div>
    </div>
  );
}

const DAILY_BOXES_RECORDS = [
  { date: "2026-05-31", first: "06:42 AM", last: "02:18 PM", classA: 320, classB: 180, special: 70, total: 570 },
  { date: "2026-05-30", first: "06:30 AM", last: "02:05 PM", classA: 305, classB: 160, special: 75, total: 540 },
  { date: "2026-05-29", first: "06:55 AM", last: "01:48 PM", classA: 280, classB: 140, special: 60, total: 480 },
  { date: "2026-05-28", first: "06:48 AM", last: "02:10 PM", classA: 300, classB: 170, special: 70, total: 540 },
  { date: "2026-05-27", first: "06:50 AM", last: "01:55 PM", classA: 270, classB: 155, special: 65, total: 490 },
];

function ProductionSummary() {
  const today = DAILY_BOXES_RECORDS[0];
  const totalToday = today.total;
  const pct = (n: number) => totalToday ? `${Math.round((n / totalToday) * 100)}%` : "0%";
  const dateLabel = new Date(today.date).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
              {DAILY_BOXES_RECORDS.map((r) => (
                <TableRow key={r.date}>
                  <TableCell>{r.date}</TableCell>
                  <TableCell className="text-xs">{r.first}</TableCell>
                  <TableCell className="text-xs">{r.last}</TableCell>
                  <TableCell className="text-right">{r.classA}</TableCell>
                  <TableCell className="text-right">{r.classB}</TableCell>
                  <TableCell className="text-right">{r.special}</TableCell>
                  <TableCell className="text-right"><strong>{r.total}</strong></TableCell>
                  <TableCell>
                    <button className="p-1.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200" title="View">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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

function PayrollApprovals({ payroll, onApprove, onReturn }: { payroll: PayrollRow[]; onApprove: (id: string) => void; onReturn: (id: string, reason: string) => void }) {
  const [view, setView] = useState<PayrollRow | null>(null);
  const [returning, setReturning] = useState<PayrollRow | null>(null);
  const [reason, setReason] = useState("");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2"><ClipboardCheck className="h-6 w-6 text-emerald-700" />Payroll Approvals</h1>
        <p className="text-muted-foreground">Validated by Finance Officer. Awaiting Manager approval.</p>
      </div>

      <Card>
        <CardContent className="p-4">
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
              {payroll.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.date}</TableCell>
                  <TableCell className="text-xs">{r.period}</TableCell>
                  <TableCell className="text-right">₱{r.gross.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-red-600">−₱{r.deductions.toLocaleString()}</TableCell>
                  <TableCell className="text-right"><strong>₱{r.net.toLocaleString()}</strong></TableCell>
                  <TableCell><Badge className={r.status === "Approved" ? "bg-emerald-100 text-emerald-800" : r.status === "Returned" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}>{r.status === "Returned" ? "Returned" : "Validated"}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-8 disabled:opacity-50" disabled={r.status !== "Validated"} onClick={() => onApprove(r.id)}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-50 h-8 disabled:opacity-50" disabled={r.status !== "Validated"} onClick={() => setReturning(r)}>
                        <Undo2 className="h-3.5 w-3.5 mr-1" />Return
                      </Button>
                      <Button size="sm" variant="outline" className="h-8" onClick={() => setView(r)}>
                        <Eye className="h-3.5 w-3.5 mr-1" />View Slip
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-3 flex justify-end">
            <Button variant="link" className="text-emerald-700">View All Payrolls →</Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="!max-w-[95vw] w-[95vw] sm:!max-w-[700px] sm:w-[700px]">
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
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setView(null)}>Close</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!returning} onOpenChange={(o) => { if (!o) { setReturning(null); setReason(""); } }}>
        <DialogContent className="!max-w-[95vw] w-[95vw] sm:!max-w-[560px] sm:w-[560px]">
          {returning && (
            <>
              <DialogHeader><DialogTitle>Return Payroll — {returning.id}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Reason for Return <span className="text-red-500">*</span></Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why this payroll is being returned for correction." />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setReturning(null); setReason(""); }}>Cancel</Button>
                  <Button className="bg-red-600 hover:bg-red-700" onClick={() => {
                    if (!reason.trim()) { toast.error("Reason is required"); return; }
                    onReturn(returning.id, reason); setReturning(null); setReason("");
                  }}>Confirm Return</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RestockRequests({ restock, onApprove, onReturn }: { restock: RestockRow[]; onApprove: (id: string) => void; onReturn: (id: string, reason: string) => void }) {
  const [view, setView] = useState<RestockRow | null>(null);
  const [returning, setReturning] = useState<RestockRow | null>(null);
  const [reason, setReason] = useState("");

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
                      <button title="Approve" className="p-1.5 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-40" disabled={r.status !== "Pending Review"} onClick={() => onApprove(r.id)}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                      <button title="Return" className="p-1.5 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-40" disabled={r.status !== "Pending Review"} onClick={() => setReturning(r)}>
                        <Undo2 className="h-3.5 w-3.5" />
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
        <DialogContent className="!max-w-[95vw] w-[95vw] sm:!max-w-[640px] sm:w-[640px]">
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
              <div className="flex justify-end"><Button variant="outline" onClick={() => setView(null)}>Close</Button></div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!returning} onOpenChange={(o) => { if (!o) { setReturning(null); setReason(""); } }}>
        <DialogContent className="!max-w-[95vw] w-[95vw] sm:!max-w-[560px] sm:w-[560px]">
          {returning && (
            <>
              <DialogHeader><DialogTitle>Return Restock Request — {returning.id}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Reason for Return <span className="text-red-500">*</span></Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why this request is being returned." />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setReturning(null); setReason(""); }}>Cancel</Button>
                  <Button className="bg-red-600 hover:bg-red-700" onClick={() => {
                    if (!reason.trim()) { toast.error("Reason is required"); return; }
                    onReturn(returning.id, reason); setReturning(null); setReason("");
                  }}>Confirm Return</Button>
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
            <div className="mt-3 flex justify-end">
              <Button variant="link" className="text-emerald-700">View Full Monitor →</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Reports() {
  const cards = [
    { title: "Production Report", desc: "Summary of harvest and boxes" },
    { title: "Inventory Report", desc: "Stock levels and movements" },
    { title: "Payroll Report", desc: "Payroll summaries and trends" },
    { title: "Financial Summary", desc: "Income, expenses, overview" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2"><FileBarChart2 className="h-6 w-6 text-emerald-700" />Reports</h1>
        <p className="text-muted-foreground">Select a report category to view its details and relevant filters.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((r) => (
          <Card key={r.title} className="hover:border-emerald-400 transition cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center"><FileBarChart2 className="h-5 w-5" /></div>
                <div>{r.title}</div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{r.desc}</p>
              <Button variant="link" className="text-emerald-700 p-0 h-auto">View Report <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AuditHistory({ audit }: { audit: AuditRow[] }) {
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  const filtered = useMemo(() => audit.filter((a) => {
    if (moduleFilter !== "all" && a.module !== moduleFilter) return false;
    if (actionFilter !== "all" && a.action !== actionFilter) return false;
    return true;
  }), [audit, moduleFilter, actionFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2"><History className="h-6 w-6 text-emerald-700" />Audit History</h1>
          <p className="text-muted-foreground">Important user actions across the system.</p>
        </div>
        <div className="flex gap-2">
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              <SelectItem value="Payroll">Payroll</SelectItem>
              <SelectItem value="Inventory">Inventory</SelectItem>
              <SelectItem value="Production">Production</SelectItem>
              <SelectItem value="Users">Users</SelectItem>
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="Submitted">Submitted</SelectItem>
              <SelectItem value="Validated">Validated</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Returned">Returned</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead><TableHead>User</TableHead>
                <TableHead>Action</TableHead><TableHead>Module</TableHead>
                <TableHead>Description</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs">{a.ts}</TableCell>
                  <TableCell>{a.user}</TableCell>
                  <TableCell><Badge variant="outline">{a.action}</Badge></TableCell>
                  <TableCell>{a.module}</TableCell>
                  <TableCell>{a.description}</TableCell>
                  <TableCell><Badge className={a.status === "Completed" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}>{a.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function UserManagement({ users, setUsers }: { users: Account[]; setUsers: (u: Account[]) => void }) {
  const [openAdd, setOpenAdd] = useState(false);
  const [view, setView] = useState<Account | null>(null);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deactivating, setDeactivating] = useState<Account | null>(null);
  const [form, setForm] = useState<{ name: string; email: string; username: string; password: string; role: Role; active: boolean }>({
    name: "", email: "", username: "", password: "", role: "production_clerk", active: true,
  });

  const saveEdit = (acct: Account) => {
    setUsers(users.map((u) => u.id === acct.id ? acct : u));
    setEditing(null);
    toast.success("User updated");
  };
  const confirmDeactivate = () => {
    if (!deactivating) return;
    const next = !deactivating.active;
    setUsers(users.map((u) => u.id === deactivating.id ? { ...u, active: next } : u));
    toast.success(`User ${next ? "activated" : "deactivated"}`);
    setDeactivating(null);
  };

  const submit = () => {
    if (!form.name || !form.email || !form.username || !form.password) { toast.error("All fields are required"); return; }
    const acct: Account = {
      id: `u-${String(users.length + 1).padStart(3, "0")}`,
      ...form, lastLogin: "—",
    };
    setUsers([acct, ...users]);
    toast.success("User created");
    setOpenAdd(false);
    setForm({ name: "", email: "", username: "", password: "", role: "production_clerk", active: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2"><Users className="h-6 w-6 text-emerald-700" />User Management</h1>
          <p className="text-muted-foreground">Manage system user accounts and access.</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setOpenAdd(true)}>
          <Plus className="h-4 w-4 mr-1" />Add User
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead><TableHead>Role</TableHead>
                <TableHead>Status</TableHead><TableHead>Last Login</TableHead><TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div>{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell>{ROLE_LABELS[u.role]}</TableCell>
                  <TableCell><Badge className={u.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}>{u.active ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell className="text-xs">{u.lastLogin}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <button className="p-1.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200" onClick={() => setView(u)} title="View">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button className="p-1.5 rounded bg-sky-100 text-sky-700 hover:bg-sky-200" onClick={() => setEditing(u)} title="Edit">
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className={`p-1.5 rounded ${u.active ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"}`}
                        onClick={() => setDeactivating(u)}
                        title={u.active ? "Deactivate" : "Activate"}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent className="!max-w-[95vw] w-[95vw] sm:!max-w-[640px] sm:w-[640px]">
          <DialogHeader><DialogTitle>Add User</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Full Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Email Address</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1"><Label>Username</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
            <div className="space-y-1"><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div className="space-y-1">
              <Label>Assigned Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([r, l]) => <SelectItem key={r} value={r}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Account Status</Label>
              <Select value={form.active ? "active" : "inactive"} onValueChange={(v) => setForm({ ...form, active: v === "active" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setOpenAdd(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={submit}>Create User</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="!max-w-[95vw] w-[95vw] sm:!max-w-[560px] sm:w-[560px]">
          {view && (
            <>
              <DialogHeader><DialogTitle>User Profile — {view.name}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-md">
                <Field label="Name" value={view.name} />
                <Field label="Email" value={view.email} />
                <Field label="Username" value={view.username} />
                <Field label="Role" value={ROLE_LABELS[view.role]} />
                <div className="space-y-1"><div className="text-xs text-muted-foreground">Status</div><Badge className={view.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}>{view.active ? "Active" : "Inactive"}</Badge></div>
                <Field label="Last Login" value={view.lastLogin} />
              </div>
              <div className="flex justify-end"><Button variant="outline" onClick={() => setView(null)}>Close</Button></div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <EditUserDialog account={editing} onClose={() => setEditing(null)} onSave={saveEdit} />

      <Dialog open={!!deactivating} onOpenChange={(o) => !o && setDeactivating(null)}>
        <DialogContent className="!max-w-[95vw] w-[95vw] sm:!max-w-[480px] sm:w-[480px]">
          {deactivating && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-700">
                  <Power className="h-5 w-5" />{deactivating.active ? "Deactivate" : "Activate"} User
                </DialogTitle>
              </DialogHeader>
              <div className="text-sm space-y-2">
                <p>
                  Are you sure you want to <strong>{deactivating.active ? "deactivate" : "activate"}</strong> <strong>{deactivating.name}</strong>?
                </p>
                {deactivating.active && (
                  <p className="text-muted-foreground">The account will be disabled but their previous activity logs will be preserved for audit purposes.</p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDeactivating(null)}>Cancel</Button>
                <Button className={deactivating.active ? "bg-red-600 hover:bg-red-700 text-white" : "bg-emerald-600 hover:bg-emerald-700"} onClick={confirmDeactivate}>
                  {deactivating.active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditUserDialog({ account, onClose, onSave }: { account: Account | null; onClose: () => void; onSave: (a: Account) => void }) {
  const [form, setForm] = useState<Account | null>(account);
  if (account && form?.id !== account.id) setForm(account);

  return (
    <Dialog open={!!account} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="!max-w-[95vw] w-[95vw] sm:!max-w-[640px] sm:w-[640px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700">
            <Edit className="h-5 w-5" />Edit User
          </DialogTitle>
        </DialogHeader>
        {form && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Full Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Email Address</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1"><Label>Username</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
            <div className="space-y-1">
              <Label>Assigned Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([r, l]) => <SelectItem key={r} value={r}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => form && onSave(form)}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
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
};

const PERMISSION_MATRIX = [
  "Dashboard (View)", "Payroll (Approve)", "Restock (Approve)", "Production (View)",
  "Inventory (View)", "Reports (View)", "Audit Logs (View)", "User Management",
  "Role Access", "System Settings",
];

function SettingsRoleAccess() {
  const [role, setRole] = useState<Role>("manager_admin");
  const desc = ROLE_DESCRIPTIONS[role];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2"><Settings className="h-6 w-6 text-emerald-700" />Settings / Role Access</h1>
        <p className="text-muted-foreground">Review system permissions for each role.</p>
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {PERMISSION_MATRIX.map((p) => (
              <div key={p} className="p-3 border rounded-md bg-emerald-50/50 border-emerald-200">
                <div className="text-sm">{p}</div>
                <div className="flex items-center gap-1.5 mt-1.5 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /><span className="text-xs">Allowed</span>
                </div>
              </div>
            ))}
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
