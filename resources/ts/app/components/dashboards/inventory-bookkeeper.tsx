import React, { useState } from "react";
import { DarbcoLayout } from "../darbco-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import {
  LayoutDashboard, Boxes, ArrowDownCircle, ArrowUpCircle, CreditCard, History,
  FileBarChart2, AlertTriangle, Package, TrendingUp, Plus, Search, Edit, Eye,
  Trash2, ChevronLeft, ChevronRight, Calendar, Upload,
} from "lucide-react";
import { User } from "../types";
import { toast } from "sonner";

interface Props { user: User; onLogout: () => void }

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "items", label: "Inventory Items", icon: <Boxes className="h-4 w-4" /> },
  { id: "credit", label: "Credit Transactions", icon: <CreditCard className="h-4 w-4" /> },
  { id: "history", label: "Stock History", icon: <History className="h-4 w-4" /> },
  { id: "restock", label: "Restock Requests", icon: <FileBarChart2 className="h-4 w-4" /> },
];

export function InventoryBookkeeperDashboard({ user, onLogout }: Props) {
  const [active, setActive] = useState("dashboard");
  const [items, setItems] = useState<InventoryItem[]>(seedItems);
  const [creditRows, setCreditRows] = useState<CreditRow[]>(credits);
  const [borrowedRows, setBorrowedRows] = useState<BorrowedMaterialRow[]>(borrowedMaterials);
  const [historyRows, setHistoryRows] = useState<StockHistoryRow[]>(stockHistory);
  const [restockRows, setRestockRows] = useState<RestockRequest[]>(initialRestockRequests(user.name));

  return (
    <DarbcoLayout user={user} onLogout={onLogout} navItems={NAV} active={active} onChange={setActive}>
      {active === "dashboard" && (
        <Dashboard
          goTo={setActive}
          items={items}
          credits={creditRows}
          history={historyRows}
          restockRequests={restockRows}
        />
      )}
      {active === "items" && (
        <InventoryItems
          items={items}
          setItems={setItems}
          setCredits={setCreditRows}
          borrowedRows={borrowedRows}
          setBorrowedRows={setBorrowedRows}
          setHistory={setHistoryRows}
          user={user}
        />
      )}
      {active === "credit" && <CreditTransactions credits={creditRows} setCredits={setCreditRows} />}
      {active === "history" && <StockHistory history={historyRows} />}
      {active === "restock" && <RestockRequests user={user} requests={restockRows} setRequests={setRestockRows} />}
    </DarbcoLayout>
  );
}

const inventoryByCategory = [
  { name: "Fertilizers and Soil Inputs", value: 26, total: 100, color: "bg-emerald-500" },
  { name: "Chemicals and Crop Protection Materials", value: 19, total: 100, color: "bg-emerald-500" },
  { name: "Farm Materials", value: 14, total: 100, color: "bg-emerald-500" },
  { name: "Packaging Materials", value: 22, total: 100, color: "bg-emerald-500" },
  { name: "Other Supplies", value: 19, total: 100, color: "bg-emerald-500" },
];

const lowStockItems = [
  { name: "Urea Fertilizer", current: 40, min: 100, unit: "kg" },
  { name: "Fungicide (Mancozeb)", current: 15, min: 30, unit: "kg" },
  { name: "Banana Bags (Blue)", current: 80, min: 200, unit: "pcs" },
  { name: "Twine / Rope", current: 5, min: 15, unit: "rolls" },
];

const recentActivity = [
  { date: "May 20, 2025 09:15 AM", activity: "Release", material: "Banana Bags (Blue)", reference: "RC-2025-0042", account: "Bookkeeper" },
  { date: "May 19, 2025 02:30 PM", activity: "Stock In", material: "Urea Fertilizer", reference: "RC-2025-0041", account: "Bookkeeper" },
  { date: "May 18, 2025 10:00 AM", activity: "Credit Issued", material: "Complete Fertilizer", reference: "CR-2025-0007", account: "Bookkeeper" },
  { date: "May 17, 2025 04:45 PM", activity: "Adjustment", material: "Twine / Rope", reference: "ADJ-2025-0002", account: "Bookkeeper" },
  { date: "May 17, 2025 08:51 AM", activity: "Release", material: "Insecticide", reference: "RS-2025-0006", account: "Bookkeeper" },
];

function Dashboard({ goTo, items, credits, history, restockRequests }: {
  goTo: (page: string) => void;
  items: InventoryItem[];
  credits: CreditRow[];
  history: StockHistoryRow[];
  restockRequests: RestockRequest[];
}) {
  const activeItems = items.filter((item) => item.active !== false);
  const dashboardLowStockItems = activeItems.filter((item) => deriveStatus(item) === "Low Stock");
  const outOfStockItems = activeItems.filter((item) => deriveStatus(item) === "Out of Stock");
  const pendingCredits = credits.filter((credit) => credit.status === "Pending" || credit.remaining > 0);
  const pendingRestockRequests = restockRequests.filter((request) => request.status === "Pending");
  const categorySummary = CATEGORIES.map((category) => {
    const count = activeItems.filter((item) => item.category === category).length;
    return {
      name: category,
      value: count,
      pct: activeItems.length ? Math.round((count / activeItems.length) * 100) : 0,
      color: category === "Fertilizers and Soil Inputs" ? "bg-emerald-500"
        : category === "Chemicals and Crop Protection Materials" ? "bg-sky-500"
        : category === "Farm Materials" ? "bg-amber-500"
        : category === "Packaging Materials" ? "bg-violet-500"
        : "bg-slate-500",
    };
  }).filter((category) => category.value > 0);
  const recentStockIn = history.filter((row) => row.type === "Stock In").slice(0, 3);
  const recentReleases = history.filter((row) => row.type === "Direct Release" || row.type === "Credit Issued").slice(0, 3);
  const recentDashboardActivity = history.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2"><LayoutDashboard className="h-6 w-6 text-emerald-700" />Dashboard</h1>
        <div className="text-muted-foreground">{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard color="emerald" icon={<Package />} label="Total Inventory Items" value={String(activeItems.length)} sub="Active materials" onClick={() => goTo("items")} />
        <KpiCard color="amber" icon={<AlertTriangle />} label="Low Stock Items" value={String(dashboardLowStockItems.length)} sub="Reorder needed" onClick={() => goTo("items")} />
        <KpiCard color="red" icon={<AlertTriangle />} label="Out of Stock" value={String(outOfStockItems.length)} sub="Critical items" onClick={() => goTo("items")} />
        <KpiCard color="violet" icon={<FileBarChart2 />} label="Pending Restock Requests" value={String(pendingRestockRequests.length)} sub="Awaiting approval" onClick={() => goTo("restock")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex !flex-row items-center justify-between gap-3 pb-2">
            <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" />Low Stock Alerts</CardTitle>
            <Button variant="link" className="ml-auto h-auto shrink-0 px-0 py-0 text-emerald-700" onClick={() => goTo("items")}>View all →</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboardLowStockItems.slice(0, 4).map((i) => (
              <div key={i.name} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-md">
                <div>
                  <div>{i.name}</div>
                  <div className="text-xs text-muted-foreground">Status: {deriveStatus(i)}</div>
                </div>
                <Badge className="bg-amber-100 text-amber-800">{i.onHand} {i.unit}</Badge>
              </div>
            ))}
            {dashboardLowStockItems.length === 0 && (
              <div className="rounded-md border bg-slate-50 p-4 text-sm text-muted-foreground">No low-stock items right now.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex !flex-row items-center justify-between gap-3 pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Boxes className="h-4 w-4 text-emerald-700" />Inventory by Category</CardTitle>
            <Button variant="link" className="ml-auto h-auto shrink-0 px-0 py-0 text-emerald-700" onClick={() => goTo("items")}>View report →</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {categorySummary.map((c) => (
              <div key={c.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{c.name}</span>
                  <span className="text-muted-foreground">{c.value} ({c.pct}%)</span>
                </div>
                <div className="h-2 rounded bg-slate-100 overflow-hidden">
                  <div className={`h-full ${c.color}`} style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DashboardMiniTable title="Recent Stock-In" icon={<ArrowDownCircle className="h-4 w-4 text-emerald-700" />} rows={recentStockIn} empty="No stock-in transactions yet." />
        <DashboardMiniTable title="Recent Releases" icon={<ArrowUpCircle className="h-4 w-4 text-sky-700" />} rows={recentReleases} empty="No material releases yet." />
        <Card>
          <CardHeader className="flex !flex-row items-center justify-between gap-3 pb-2">
            <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4 text-amber-700" />Pending Credits</CardTitle>
            <Button variant="link" className="ml-auto h-auto shrink-0 px-0 py-0 text-emerald-700" onClick={() => goTo("credit")}>View ledger</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingCredits.slice(0, 3).map((credit) => (
              <div key={credit.receipt} className="rounded-md border bg-amber-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{credit.beneficiary}</span>
                  <Badge className="bg-amber-100 text-amber-800">₱{credit.remaining.toLocaleString()}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{credit.material} • {credit.receipt}</div>
              </div>
            ))}
            {pendingCredits.length === 0 && (
              <div className="rounded-md border bg-slate-50 p-4 text-sm text-muted-foreground">No pending credit transactions.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4 text-emerald-700" />Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead><TableHead>Activity</TableHead>
                <TableHead>Material</TableHead><TableHead>Reference</TableHead><TableHead>Account</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentDashboardActivity.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>
                    <Badge className={
                      r.type === "Direct Release" ? "bg-sky-100 text-sky-800"
                      : r.type === "Stock In" ? "bg-emerald-100 text-emerald-800"
                      : r.type === "Credit Issued" ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-700"
                    }>{r.type}</Badge>
                  </TableCell>
                  <TableCell>{r.material}</TableCell>
                  <TableCell>{r.ref}</TableCell>
                  <TableCell>{r.account}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}

function KpiCard({ icon, color, label, value, sub, onClick }: { icon: React.ReactNode; color: string; label: string; value: string; sub: string; onClick?: () => void }) {
  const bg: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    sky: "bg-sky-100 text-sky-700",
    violet: "bg-violet-100 text-violet-700",
  };
  return (
    <Card onClick={onClick} className={onClick ? "cursor-pointer hover:border-emerald-400 hover:shadow transition" : ""}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${bg[color]}`}>{icon}</div>
        <div className="flex-1">
          <div className="text-muted-foreground text-xs">{label}</div>
          <div className="text-xl">{value}</div>
          <div className="text-xs text-muted-foreground">{sub}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardMiniTable({ title, icon, rows, empty }: { title: string; icon: React.ReactNode; rows: StockHistoryRow[]; empty: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((row) => (
          <div key={`${row.ref}-${row.material}`} className="rounded-md border bg-slate-50 p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{row.material}</span>
              <Badge className={row.qty > 0 ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"}>
                {row.qty > 0 ? `+${row.qty}` : row.qty} {row.unit}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">{row.date} • {row.ref}</div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="rounded-md border bg-slate-50 p-4 text-sm text-muted-foreground">{empty}</div>
        )}
      </CardContent>
    </Card>
  );
}

interface InventoryItem {
  id: string; name: string; category: string; unit: string;
  onHand: number; stockDate: string; cost: number; expiry: string;
  minimumStock?: number; supplier?: string; createdAt?: string; updatedAt?: string;
  hasTransactions?: boolean; active?: boolean;
}

const seedItems: InventoryItem[] = [
  { id: "FERT-001", name: "Urea Fertilizer", category: "Fertilizers and Soil Inputs", unit: "kg", onHand: 40, stockDate: "2026-05-15", cost: 45.0, expiry: "—", hasTransactions: true, active: true },
  { id: "FERT-002", name: "Complete Fertilizer", category: "Fertilizers and Soil Inputs", unit: "kg", onHand: 220, stockDate: "2026-05-18", cost: 48.0, expiry: "—", hasTransactions: true, active: true },
  { id: "CHEM-001", name: "Fungicide (Mancozeb)", category: "Chemicals and Crop Protection Materials", unit: "kg", onHand: 15, stockDate: "2026-04-22", cost: 320.0, expiry: "05/2026", hasTransactions: true, active: true },
  { id: "CHEM-002", name: "Insecticide (Cypermethrin)", category: "Chemicals and Crop Protection Materials", unit: "L", onHand: 28, stockDate: "2026-05-02", cost: 720.0, expiry: "11/2026", active: true },
  { id: "CHEM-003", name: "Herbicide (Glyphosate)", category: "Chemicals and Crop Protection Materials", unit: "L", onHand: 0, stockDate: "2026-03-12", cost: 540.0, expiry: "08/2026", active: true },
  { id: "PACK-001", name: "Banana Bags (Blue)", category: "Packaging Materials", unit: "pcs", onHand: 80, stockDate: "2026-05-19", cost: 12.5, expiry: "—", hasTransactions: true, active: true },
  { id: "PACK-002", name: "Corrugated Boxes", category: "Packaging Materials", unit: "pcs", onHand: 1200, stockDate: "2026-05-10", cost: 28.0, expiry: "—", active: true },
  { id: "FARM-001", name: "Twine / Rope", category: "Farm Materials", unit: "roll", onHand: 5, stockDate: "2026-04-30", cost: 95.0, expiry: "—", hasTransactions: true, active: true },
];

function deriveStatus(i: InventoryItem): "OK" | "Low Stock" | "Out of Stock" {
  if (i.onHand <= 0) return "Out of Stock";
  if (i.onHand <= getMinimumStock(i)) return "Low Stock";
  return "OK";
}

function getMinimumStock(item: InventoryItem) {
  return item.minimumStock ?? 20;
}

function getSupplier(item: InventoryItem) {
  return item.supplier?.trim() || "Not specified";
}

function getCreatedAt(item: InventoryItem) {
  return item.createdAt || item.stockDate;
}

function getUpdatedAt(item: InventoryItem) {
  return item.updatedAt || item.stockDate;
}

function transactionId(row: Pick<StockHistoryRow, "ref">) {
  return row.ref;
}

function quantityAdded(row: Pick<StockHistoryRow, "qty">) {
  return row.qty > 0 ? row.qty : 0;
}

function quantityDeducted(row: Pick<StockHistoryRow, "qty">) {
  return row.qty < 0 ? Math.abs(row.qty) : 0;
}

function todayInputDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysInputDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return todayInputDate();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function InventoryDateInput({ value, onChange, className = "" }: { value: string; onChange: (value: string) => void; className?: string }) {
  const dateValue = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
  return (
    <div className={`relative ${className}`}>
      <Input
        type="date"
        value={dateValue}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full cursor-pointer bg-muted/50 px-3 pr-10 [color-scheme:light] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
      />
      <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-700" />
    </div>
  );
}

const CATEGORIES = [
  "Fertilizers and Soil Inputs",
  "Chemicals and Crop Protection Materials",
  "Farm Materials",
  "Packaging Materials",
  "Other Supplies",
];

function InventoryItems({ items, setItems, setCredits, borrowedRows, setBorrowedRows, setHistory, user }: {
  items: InventoryItem[];
  setItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  setCredits: React.Dispatch<React.SetStateAction<CreditRow[]>>;
  borrowedRows: BorrowedMaterialRow[];
  setBorrowedRows: React.Dispatch<React.SetStateAction<BorrowedMaterialRow[]>>;
  setHistory: React.Dispatch<React.SetStateAction<StockHistoryRow[]>>;
  user: User;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [showStockIn, setShowStockIn] = useState(false);
  const [showRelease, setShowRelease] = useState(false);
  const [showBorrowed, setShowBorrowed] = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [viewing, setViewing] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState<InventoryItem | null>(null);

  const filtered = items.filter((i) => {
    if (i.active === false) return false;
    const q = search.trim().toLowerCase();
    if (q && !i.name.toLowerCase().includes(q) && !i.id.toLowerCase().includes(q) && !i.category.toLowerCase().includes(q)) return false;
    if (category !== "all" && i.category !== category) return false;
    if (status !== "all" && deriveStatus(i) !== status) return false;
    return true;
  }).slice().sort((a, b) => {
    switch (sortBy) {
      case "quantity-asc": return a.onHand - b.onHand;
      case "quantity-desc": return b.onHand - a.onHand;
      case "category": return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
      case "updated-desc": return getUpdatedAt(b).localeCompare(getUpdatedAt(a));
      case "updated-asc": return getUpdatedAt(a).localeCompare(getUpdatedAt(b));
      case "name":
      default: return a.name.localeCompare(b.name);
    }
  });

  const handleSaveEdit = (updated: InventoryItem) => {
    setItems((cur) => cur.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)));
    setEditing(null);
    toast.success("Inventory item updated");
  };

  const handleConfirmDelete = () => {
    if (!deleting) return;
    if (deleting.hasTransactions) {
      setItems((cur) => cur.map((i) => (i.id === deleting.id ? { ...i, active: false } : i)));
      toast.message("Item marked Inactive (has transaction history).");
    } else {
      setItems((cur) => cur.filter((i) => i.id !== deleting.id));
      toast.success("Inventory item deleted");
    }
    setDeleting(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2"><Boxes className="h-6 w-6 text-emerald-700" />Inventory Items</h1>
        <p className="text-muted-foreground">Manage all inventory materials and stock levels.</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                className="pl-8 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-56 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="OK">OK</SelectItem>
                <SelectItem value="Low Stock">Low Stock</SelectItem>
                <SelectItem value="Out of Stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="quantity-asc">Quantity Low-High</SelectItem>
                <SelectItem value="quantity-desc">Quantity High-Low</SelectItem>
                <SelectItem value="updated-desc">Recently Updated</SelectItem>
                <SelectItem value="updated-asc">Oldest Updated</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setShowStockIn(true)}><ArrowDownCircle className="h-4 w-4 mr-1" />Stock-In</Button>
            <Button variant="outline" onClick={() => setShowRelease(true)}><ArrowUpCircle className="h-4 w-4 mr-1" />Release</Button>
            <Button variant="outline" onClick={() => setShowBorrowed(true)}><History className="h-4 w-4 mr-1" />Borrowed</Button>
            <Button variant="outline" onClick={() => setShowAdjustment(true)}><Edit className="h-4 w-4 mr-1" />Adjust</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" />Add Item</Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material ID</TableHead><TableHead>Item Name</TableHead><TableHead>Category</TableHead>
                <TableHead>Unit</TableHead><TableHead>On Hand</TableHead>
                <TableHead>Min Stock</TableHead><TableHead>Supplier</TableHead><TableHead>Unit Cost</TableHead><TableHead>Updated</TableHead>
                <TableHead>Status</TableHead><TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-6">No matching inventory items. Items that are out of stock or no longer needed can be removed using the delete action.</TableCell></TableRow>
              ) : filtered.map((i) => {
                const s = deriveStatus(i);
                const badge = s === "Out of Stock" ? "bg-red-100 text-red-800"
                  : s === "Low Stock" ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-800";
                return (
                  <TableRow key={i.id}>
                    <TableCell>{i.id}</TableCell>
                    <TableCell>{i.name}</TableCell>
                    <TableCell>{i.category}</TableCell>
                    <TableCell>{i.unit}</TableCell>
                    <TableCell>{i.onHand}</TableCell>
                    <TableCell>{getMinimumStock(i)} {i.unit}</TableCell>
                    <TableCell>{getSupplier(i)}</TableCell>
                    <TableCell>₱{i.cost.toFixed(2)}</TableCell>
                    <TableCell>{getUpdatedAt(i)}</TableCell>
                    <TableCell><Badge className={badge}>{s}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <button className="p-1.5 rounded bg-sky-100 text-sky-700 hover:bg-sky-200" onClick={() => setViewing(i)} aria-label="View"><Eye className="h-3.5 w-3.5" /></button>
                        <button className="p-1.5 rounded bg-sky-100 text-sky-700 hover:bg-sky-200" onClick={() => setEditing(i)} aria-label="Edit"><Edit className="h-3.5 w-3.5" /></button>
                        <button className="p-1.5 rounded bg-red-100 text-red-700 hover:bg-red-200" onClick={() => setDeleting(i)} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-muted-foreground">Showing 1 to {filtered.length} of {filtered.length} items</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></Button>
              <Button size="sm" className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700">1</Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AddInventoryItem
        open={showAdd}
        onOpenChange={setShowAdd}
        items={items}
        setItems={setItems}
        setHistory={setHistory}
        user={user}
      />
      <StockIn
        open={showStockIn}
        onOpenChange={setShowStockIn}
        items={items}
        setItems={setItems}
        setHistory={setHistory}
        user={user}
      />
      <ReleaseMaterials
        open={showRelease}
        onOpenChange={setShowRelease}
        items={items}
        setItems={setItems}
        setCredits={setCredits}
        setBorrowedRows={setBorrowedRows}
        setHistory={setHistory}
        user={user}
      />
      <BorrowedMaterialsDialog
        open={showBorrowed}
        onOpenChange={setShowBorrowed}
        items={items}
        rows={borrowedRows}
        setRows={setBorrowedRows}
        setItems={setItems}
        setHistory={setHistory}
        user={user}
      />
      <StockAdjustmentDialog
        open={showAdjustment}
        onOpenChange={setShowAdjustment}
        items={items}
        setItems={setItems}
        setHistory={setHistory}
        user={user}
      />
      <ItemDetailDialog item={viewing} onClose={() => setViewing(null)} />
      <EditItemDialog item={editing} onClose={() => setEditing(null)} onSave={handleSaveEdit} />

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />Delete Inventory Item
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleting?.name}</strong>? This action cannot be undone.
              {deleting?.hasTransactions && (
                <span className="block mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-800">
                  This item has previous stock-in, release, or credit transactions. It will be marked <strong>Inactive</strong> and hidden from the active inventory list while preserving its transaction history.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirmDelete}>
              {deleting?.hasTransactions ? "Mark Inactive" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ItemDetailDialog({ item, onClose }: { item: InventoryItem | null; onClose: () => void }) {
  if (!item) return null;
  const status = deriveStatus(item);
  const badge = status === "Out of Stock" ? "bg-red-100 text-red-800"
    : status === "Low Stock" ? "bg-amber-100 text-amber-800"
    : "bg-emerald-100 text-emerald-800";

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:!max-w-[720px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700">
            <Eye className="h-5 w-5" />Inventory Item Details
          </DialogTitle>
          <DialogDescription>Complete profile and stock metadata for this material.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Detail label="Material ID" value={item.id} />
          <Detail label="Status" value={status} />
          <Detail className="sm:col-span-2" label="Material Name" value={item.name} />
          <Detail className="sm:col-span-2" label="Category" value={item.category} />
          <Detail label="Unit" value={item.unit} />
          <Detail label="Current Quantity" value={`${item.onHand} ${item.unit}`} />
          <Detail label="Minimum Stock" value={`${getMinimumStock(item)} ${item.unit}`} />
          <Detail label="Unit Price" value={`₱${item.cost.toFixed(2)}`} />
          <Detail className="sm:col-span-2" label="Supplier" value={getSupplier(item)} />
          <Detail label="Expiration Date" value={item.expiry} />
          <Detail label="Last Stock Date" value={item.stockDate} />
          <Detail label="Date Created" value={getCreatedAt(item)} />
          <Detail label="Last Updated" value={getUpdatedAt(item)} />
        </div>
        <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm">
          <div className="text-xs text-muted-foreground">Generated Stock Status</div>
          <Badge className={badge}>{status}</Badge>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditItemDialog({ item, onClose, onSave }: { item: InventoryItem | null; onClose: () => void; onSave: (i: InventoryItem) => void }) {
  const [form, setForm] = useState<InventoryItem | null>(item);
  if (item && form?.id !== item.id) setForm(item);

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:!max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700">
            <Edit className="h-5 w-5" />Edit Inventory Item
          </DialogTitle>
          <DialogDescription>
            Update the material's basic information. On Hand quantity must be changed through stock-in or material-release transactions.
          </DialogDescription>
        </DialogHeader>
        {form && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1 md:col-span-2">
              <Label>Item Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Unit</Label>
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["kg", "L", "pcs", "roll", "pair", "bag"].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Stock Date</Label>
              <InventoryDateInput value={form.stockDate} onChange={(value) => setForm({ ...form, stockDate: value })} />
            </div>
            <div className="space-y-1">
              <Label>Unit Cost (₱)</Label>
              <Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>Minimum Stock</Label>
              <Input type="number" value={getMinimumStock(form)} onChange={(e) => setForm({ ...form, minimumStock: Number(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
              <Label>Supplier</Label>
              <Input value={form.supplier ?? ""} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Supplier name" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Expiration Date</Label>
              <InventoryDateInput value={form.expiry} onChange={(value) => setForm({ ...form, expiry: value })} />
              <div className="hidden">
              <Input value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} placeholder="MM/YYYY or —" />
            </div>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Date Created</Label>
              <Input value={getCreatedAt(form)} disabled />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Last Updated</Label>
              <Input value={getUpdatedAt(form)} disabled />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-muted-foreground">On Hand (read-only)</Label>
              <Input value={`${form.onHand} ${form.unit}`} disabled />
              <p className="text-xs text-muted-foreground">Update quantities via stock-in or release transactions to maintain history.</p>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => form && onSave({ ...form, updatedAt: new Date().toISOString().slice(0, 10) })}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface StockInRow { name: string; category: string; qty: string; unit: string; cost: string; expiry: string; minimumStock: string; supplier: string; notes: string }

const CATEGORY_PREFIX: Record<string, string> = {
  "Fertilizers and Soil Inputs": "FERT",
  "Chemicals and Crop Protection Materials": "CHEM",
  "Farm Materials": "FARM",
  "Packaging Materials": "PACK",
  "Other Supplies": "MISC",
};

function generateMaterialId(category: string, rowIndex: number, rows: StockInRow[], items: InventoryItem[]): string {
  const prefix = CATEGORY_PREFIX[category];
  if (!prefix) return "";
  const existingCount = items.filter((s) => CATEGORY_PREFIX[s.category] === prefix).length;
  const offsetInForm = rows.slice(0, rowIndex).filter((r) => CATEGORY_PREFIX[r.category] === prefix).length;
  const next = existingCount + offsetInForm + 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

function AddInventoryItem({ open, onOpenChange, items, setItems, setHistory, user }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
  setItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  setHistory: React.Dispatch<React.SetStateAction<StockHistoryRow[]>>;
  user: User;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<StockInRow[]>([
    { name: "", category: "", qty: "", unit: "kg", cost: "", expiry: "", minimumStock: "", supplier: "", notes: "" },
  ]);

  React.useEffect(() => {
    if (!open) return;
    setDate(today);
    setNotes("");
    setRows([{ name: "", category: "", qty: "", unit: "kg", cost: "", expiry: "", minimumStock: "", supplier: "", notes: "" }]);
  }, [open, today]);

  const update = (i: number, k: keyof StockInRow, v: string) =>
    setRows(rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));

  const handleSave = () => {
    if (rows.some((r) => !r.category)) { toast.error("Category is required for each item"); return; }
    if (rows.some((r) => !r.name.trim() || !r.qty.trim() || !r.cost.trim())) {
      toast.error("Item Name, Quantity, and Unit Cost are required");
      return;
    }
    const validRows = rows.map((row, index) => ({
      ...row,
      id: generateMaterialId(row.category, index, rows, items),
      qtyValue: Number(row.qty) || 0,
      costValue: Number(row.cost) || 0,
      minimumStockValue: Number(row.minimumStock) || 0,
      supplierValue: row.supplier.trim() || "Not specified",
      expiryValue: row.expiry || "—",
    }));

    setItems((current) => {
      let next = [...current];
      validRows.forEach((row) => {
        const existingIndex = next.findIndex((item) =>
          item.active !== false &&
          item.name.toLowerCase() === row.name.trim().toLowerCase() &&
          item.category === row.category &&
          item.expiry === row.expiryValue
        );

        if (existingIndex >= 0) {
          const existing = next[existingIndex];
          next[existingIndex] = {
            ...existing,
            onHand: existing.onHand + row.qtyValue,
            stockDate: date,
            cost: row.costValue,
            minimumStock: row.minimumStockValue || getMinimumStock(existing),
            supplier: row.supplierValue,
            updatedAt: date,
            hasTransactions: true,
          };
        } else {
          next = [
            {
              id: row.id,
              name: row.name.trim(),
              category: row.category,
              unit: row.unit,
              onHand: row.qtyValue,
              stockDate: date,
              cost: row.costValue,
              minimumStock: row.minimumStockValue,
              supplier: row.supplierValue,
              createdAt: date,
              updatedAt: date,
              expiry: row.expiryValue,
              hasTransactions: true,
              active: true,
            },
            ...next,
          ];
        }
      });
      return next;
    });

    setHistory((current) => [
      ...validRows.map((row, index) => ({
        date: formatDateTime(date),
        material: row.name.trim(),
        type: "Stock In",
        qty: row.qtyValue,
        unit: row.unit,
        reason: notes.trim() || "Received materials into inventory",
        account: user.name,
        ref: `RC-${date.slice(0, 4)}-${String(current.length + index + 1).padStart(4, "0")}`,
        previousBalance: items.find((item) => item.name.toLowerCase() === row.name.trim().toLowerCase() && item.category === row.category && item.expiry === row.expiryValue)?.onHand ?? 0,
        updatedBalance: (items.find((item) => item.name.toLowerCase() === row.name.trim().toLowerCase() && item.category === row.category && item.expiry === row.expiryValue)?.onHand ?? 0) + row.qtyValue,
      })),
      ...current,
    ]);

    toast.success("Stock-in saved and dashboard updated");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[920px] w-[92vw] max-h-[86vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700">
            <Plus className="h-5 w-5" />Add Inventory Item
          </DialogTitle>
          <DialogDescription>Register newly received materials into the inventory.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Date Received <span className="text-red-500">*</span></Label>
              <InventoryDateInput value={date} onChange={setDate} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Material ID is generated automatically based on the selected Category (FERT / CHEM / FARM / PACK).</p>

          <div className="space-y-2">
            {rows.map((r, i) => {
              const match = items.find((s) => s.active !== false && s.name.toLowerCase() === r.name.trim().toLowerCase());
              const expiryConflict = !!(match && r.expiry.trim() && match.expiry !== "—" && match.expiry !== r.expiry.trim());
              return (
              <div key={i} className="grid grid-cols-1 gap-3 rounded-md border p-3 md:grid-cols-12">
                <div className="space-y-1 md:col-span-4">
                  <Label>Item Name</Label>
                  <Input
                    list={`existing-items-${i}`}
                    value={r.name}
                    onChange={(e) => update(i, "name", e.target.value)}
                    placeholder={r.category ? "Type to search or enter new" : "Select a category first"}
                  />
                  <datalist id={`existing-items-${i}`}>
                    {items
                      .filter((s) => s.active !== false && (!r.category || s.category === r.category))
                      .map((s) => (
                        <option key={s.id} value={s.name} />
                      ))}
                  </datalist>
                  {match && (
                    <p className="text-xs text-emerald-700">Matches existing item: {match.id} • On Hand {match.onHand} {match.unit} • Expiry {match.expiry}</p>
                  )}
                  {expiryConflict && (
                    <p className="text-xs text-amber-700">Expiry differs from saved record ({match!.expiry}). This batch will be saved as a separate inventory entry.</p>
                  )}
                </div>
                <div className="space-y-1 md:col-span-4">
                  <Label>Category</Label>
                  <Select value={r.category} onValueChange={(v) => update(i, "category", v)}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {r.category && (
                    <p className="text-xs text-emerald-700">Material ID: {generateMaterialId(r.category, i, rows, items)}</p>
                  )}
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Qty</Label>
                  <Input value={r.qty} onChange={(e) => update(i, "qty", e.target.value)} placeholder="" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Unit</Label>
                  <Select value={r.unit} onValueChange={(v) => update(i, "unit", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="pcs">pcs</SelectItem>
                      <SelectItem value="liter">liter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 md:col-span-3">
                  <Label>Unit Cost (₱)</Label>
                  <Input value={r.cost} onChange={(e) => update(i, "cost", e.target.value)} placeholder="" />
                </div>
                <div className="space-y-1 md:col-span-3">
                  <Label>Minimum Stock</Label>
                  <Input value={r.minimumStock} onChange={(e) => update(i, "minimumStock", e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1 md:col-span-3">
                  <Label>Supplier</Label>
                  <Input value={r.supplier} onChange={(e) => update(i, "supplier", e.target.value)} placeholder="Supplier name" />
                </div>
                <div className="space-y-1 md:col-span-3">
                  <Label>Expiration Date</Label>
                  <InventoryDateInput value={r.expiry} onChange={(value) => update(i, "expiry", value)} />
                </div>
                <div className="flex items-end md:col-span-12 md:justify-end">
                  <button
                    className="p-2 rounded border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-40"
                    disabled={rows.length === 1}
                    onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              );
            })}
            <Button variant="outline" onClick={() => setRows([...rows, { name: "", category: "", qty: "", unit: "kg", cost: "", expiry: "", minimumStock: "", supplier: "", notes: "" }])}>
              <Plus className="h-4 w-4 mr-1" />Add Item Row
            </Button>
          </div>

          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivered in good condition." />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave}>Save Item</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StockIn({ open, onOpenChange, items, setItems, setHistory, user }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
  setItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  setHistory: React.Dispatch<React.SetStateAction<StockHistoryRow[]>>;
  user: User;
}) {
  const activeItems = items.filter((item) => item.active !== false).slice().sort((a, b) => a.name.localeCompare(b.name));
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [supplier, setSupplier] = useState("");
  const [reference, setReference] = useState("");
  const [dateReceived, setDateReceived] = useState(todayInputDate());
  const [expirationDate, setExpirationDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [documentName, setDocumentName] = useState("");
  const selectedItem = activeItems.find((item) => item.id === itemId);
  const quantityValue = Number(quantity) || 0;
  const unitPriceValue = Number(unitPrice) || 0;
  const totalAmount = quantityValue * unitPriceValue;

  const handleItemChange = (value: string) => {
    const item = activeItems.find((inventoryItem) => inventoryItem.id === value);
    setItemId(value);
    if (item) {
      setUnitPrice(String(item.cost || ""));
      setSupplier(item.supplier ?? "");
      setExpirationDate(item.expiry && item.expiry !== "—" && item.expiry !== "â€”" ? item.expiry : "");
    }
  };

  const resetForm = () => {
    setItemId("");
    setQuantity("");
    setUnitPrice("");
    setSupplier("");
    setReference("");
    setDateReceived(todayInputDate());
    setExpirationDate("");
    setRemarks("");
    setDocumentName("");
  };

  const handleSave = () => {
    if (!selectedItem) {
      toast.error("Please select an inventory item");
      return;
    }
    if (quantityValue <= 0) {
      toast.error("Quantity added must be greater than zero");
      return;
    }
    if (unitPriceValue <= 0) {
      toast.error("Unit price must be greater than zero");
      return;
    }
    if (!reference.trim()) {
      toast.error("Receipt or delivery reference number is required");
      return;
    }
    if (!supplier.trim()) {
      toast.error("Supplier is required");
      return;
    }

    setItems((current) => current.map((item) => item.id === selectedItem.id
      ? {
        ...item,
        onHand: item.onHand + quantityValue,
        cost: unitPriceValue,
        supplier: supplier.trim(),
        stockDate: dateReceived,
        updatedAt: dateReceived,
        expiry: expirationDate || item.expiry,
        hasTransactions: true,
      }
      : item
    ));

    const documentText = documentName ? ` Supporting document: ${documentName}.` : "";
    const remarksText = remarks.trim() ? ` Remarks: ${remarks.trim()}` : "";
    setHistory((current) => [
      {
        date: formatDateTime(dateReceived),
        material: selectedItem.name,
        type: "Stock In",
        qty: quantityValue,
        unit: selectedItem.unit,
        reason: `Received from ${supplier.trim()}. Total amount: ₱${totalAmount.toLocaleString()}. Audit: stock-in recorded by ${user.name}.${remarksText}${documentText}`,
        account: user.name,
        ref: reference.trim(),
        previousBalance: selectedItem.onHand,
        updatedBalance: selectedItem.onHand + quantityValue,
      },
      ...current,
    ]);

    toast.success("Stock-in saved, inventory balance updated, and audit trail recorded");
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[860px] w-[92vw] max-h-[86vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700">
            <ArrowDownCircle className="h-5 w-5" />Stock-In
          </DialogTitle>
          <DialogDescription>Record received materials and update inventory balances.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1 md:col-span-2">
              <Label>Inventory Item <span className="text-red-500">*</span></Label>
              <Select value={itemId} onValueChange={handleItemChange}>
                <SelectTrigger><SelectValue placeholder="Select inventory item" /></SelectTrigger>
                <SelectContent>
                  {activeItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name} • {item.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Date Received <span className="text-red-500">*</span></Label>
              <InventoryDateInput value={dateReceived} onChange={setDateReceived} />
            </div>

            <div className="space-y-1">
              <Label>Quantity Added <span className="text-red-500">*</span></Label>
              <Input type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label>Unit</Label>
              <Input value={selectedItem?.unit ?? ""} placeholder="Auto-filled" disabled />
            </div>
            <div className="space-y-1">
              <Label>Unit Price (₱) <span className="text-red-500">*</span></Label>
              <Input type="number" step="0.01" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} placeholder="0.00" />
            </div>

            <div className="space-y-1">
              <Label>Total Amount</Label>
              <Input value={`₱${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} disabled />
            </div>
            <div className="space-y-1">
              <Label>Supplier <span className="text-red-500">*</span></Label>
              <Input value={supplier} onChange={(event) => setSupplier(event.target.value)} placeholder="Supplier name" />
            </div>
            <div className="space-y-1">
              <Label>Receipt / Delivery Ref. <span className="text-red-500">*</span></Label>
              <Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="e.g. DR-2026-0012" />
            </div>

            <div className="space-y-1">
              <Label>Expiration Date</Label>
              <InventoryDateInput value={expirationDate} onChange={setExpirationDate} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Supporting Document</Label>
              <input
                id="stock-in-document"
                className="sr-only"
                type="file"
                onChange={(event) => setDocumentName(event.target.files?.[0]?.name ?? "")}
              />
              <label
                htmlFor="stock-in-document"
                className="flex h-9 cursor-pointer items-center justify-between gap-3 rounded-md bg-muted/50 px-3 text-sm transition-colors hover:bg-muted"
              >
                <span className={documentName ? "truncate text-slate-900" : "truncate text-muted-foreground"}>
                  {documentName || "Select supporting document"}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded border bg-white px-2 py-1 text-xs font-medium text-slate-700">
                  <Upload className="h-3.5 w-3.5" />Browse
                </span>
              </label>
            </div>
          </div>

          {selectedItem && (
            <div className="rounded-md border bg-slate-50 p-3 text-sm">
              <div className="font-medium">{selectedItem.name}</div>
              <div className="text-muted-foreground">
                Current balance: {selectedItem.onHand} {selectedItem.unit} • New balance after stock-in: {selectedItem.onHand + quantityValue} {selectedItem.unit} • Status: {deriveStatus({ ...selectedItem, onHand: selectedItem.onHand + quantityValue })}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label>Remarks</Label>
            <Textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Optional receiving notes, condition, or delivery remarks." />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancel</Button>
            <Button variant="outline" onClick={resetForm}>Clear</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave}>
              <ArrowDownCircle className="h-4 w-4 mr-1" />Save Stock-In
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReleaseMaterials({ open, onOpenChange, items, setItems, setCredits, setBorrowedRows, setHistory, user }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
  setItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  setCredits: React.Dispatch<React.SetStateAction<CreditRow[]>>;
  setBorrowedRows: React.Dispatch<React.SetStateAction<BorrowedMaterialRow[]>>;
  setHistory: React.Dispatch<React.SetStateAction<StockHistoryRow[]>>;
  user: User;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [type, setType] = useState("direct");
  const [slipNo, setSlipNo] = useState("RS-2026-0007");
  const [date, setDate] = useState(today);
  const [beneficiary, setBeneficiary] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [unitPrice, setUnitPrice] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState(addDaysInputDate(today, 7));
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const selectedItem = items.find((item) => item.id === materialId);
  const qtyValue = Number(qty) || 0;
  const unitPriceValue = Number(unitPrice) || 0;
  const totalAmount = qtyValue * unitPriceValue;

  const banner = {
    direct: { title: "Direct Release", text: "Material is released and deducted from stock without creating beneficiary credit.", bg: "bg-sky-50 border-sky-200 text-sky-800" },
    credit: { title: "Beneficiary Credit", text: "Material taken now, payment will be recorded as outstanding balance.", bg: "bg-amber-50 border-amber-200 text-amber-800" },
    borrowed: { title: "Borrowed Material", text: "Material is temporarily issued and should be returned or settled later.", bg: "bg-violet-50 border-violet-200 text-violet-800" },
    internal: { title: "Internal Use", text: "Material is consumed by internal farm or office operations.", bg: "bg-emerald-50 border-emerald-200 text-emerald-800" },
    adjustment: { title: "Stock Adjustment", text: "Material is deducted to correct count, damage, expiry, or other stock discrepancies.", bg: "bg-slate-50 border-slate-200 text-slate-800" },
  }[type] || { title: "", text: "", bg: "" };

  const resetReleaseForm = () => {
    setBeneficiary("");
    setMaterialId("");
    setQty("");
    setUnitPrice("");
    setExpectedReturnDate(addDaysInputDate(todayInputDate(), 7));
    setPurpose("");
    setNotes("");
  };

  const releaseHistoryType = () => {
    if (type === "credit") return "Credit Issued";
    if (type === "borrowed") return "Borrowed Material";
    if (type === "internal") return "Internal Use";
    if (type === "adjustment") return "Adjustment";
    return "Direct Release";
  };

  const handleSaveRelease = () => {
    if (!slipNo.trim() || !selectedItem || qtyValue <= 0) {
      toast.error("Slip number, material, and quantity are required");
      return;
    }
    if (type === "credit" && !beneficiary.trim()) {
      toast.error("Beneficiary is required for beneficiary credit releases");
      return;
    }
    if (type === "borrowed" && !beneficiary.trim()) {
      toast.error("Borrower or beneficiary is required for borrowed materials");
      return;
    }
    if (type === "borrowed" && !expectedReturnDate) {
      toast.error("Expected return date is required for borrowed materials");
      return;
    }
    if (unitPriceValue <= 0) {
      toast.error("Unit price must be greater than zero");
      return;
    }
    if (qtyValue > selectedItem.onHand) {
      toast.error(`Only ${selectedItem.onHand} ${selectedItem.unit} available for ${selectedItem.name}`);
      return;
    }

    setItems((current) => current.map((item) =>
      item.id === selectedItem.id
        ? { ...item, onHand: item.onHand - qtyValue, updatedAt: date, hasTransactions: true }
        : item
    ));

    if (type === "credit") {
      setCredits((current) => [
        {
          receipt: `CR-${date.slice(0, 4)}-${String(current.length + 1).padStart(4, "0")}`,
          date: formatDateLabel(date),
          beneficiary: beneficiary.trim(),
          beneficiaryId: beneficiaryAccountId(beneficiary),
          material: selectedItem.name,
          qty: qtyValue,
          unit: selectedItem.unit,
          unitCost: unitPriceValue,
          amount: totalAmount,
          status: "Pending",
          remaining: totalAmount,
          slip: "—",
        },
        ...current,
      ]);
    }

    if (type === "borrowed") {
      setBorrowedRows((current) => [
        {
          id: `BOR-${date.slice(0, 4)}-${String(current.length + 1).padStart(4, "0")}`,
          slipNo: slipNo.trim(),
          borrower: beneficiary.trim(),
          materialId: selectedItem.id,
          material: selectedItem.name,
          qtyBorrowed: qtyValue,
          qtyReturned: 0,
          dateBorrowed: date,
          expectedReturnDate,
          actualReturnDate: "",
          unit: selectedItem.unit,
          status: "Borrowed",
          notes: notes.trim(),
        },
        ...current,
      ]);
    }

    setHistory((current) => [
      {
        date: formatDateTime(date),
        material: selectedItem.name,
        type: releaseHistoryType(),
        qty: -qtyValue,
        unit: selectedItem.unit,
        reason: `${purpose.trim() || `Released${beneficiary.trim() ? ` to ${beneficiary.trim()}` : ""}`}. Total amount: ₱${totalAmount.toLocaleString()}. Audit: material release recorded by ${user.name}.${notes.trim() ? ` Notes: ${notes.trim()}` : ""}`,
        account: user.name,
        ref: slipNo.trim(),
        previousBalance: selectedItem.onHand,
        updatedBalance: selectedItem.onHand - qtyValue,
      },
      ...current,
    ]);

    toast.success(type === "credit" ? "Credit release saved and dashboard updated" : "Release saved and dashboard updated");
    resetReleaseForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[860px] w-[92vw] max-h-[86vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700">
            <ArrowUpCircle className="h-5 w-5" />Release Materials
          </DialogTitle>
          <DialogDescription>Material released to beneficiaries or for farm use.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Release Slip No. <span className="text-red-500">*</span></Label>
              <Input value={slipNo} onChange={(event) => setSlipNo(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Date Released <span className="text-red-500">*</span></Label>
              <InventoryDateInput value={date} onChange={(value) => {
                setDate(value);
                if (type === "borrowed") setExpectedReturnDate(addDaysInputDate(value, 7));
              }} />
            </div>
            <div className="space-y-1">
              <Label>Beneficiary / Recipient {(type === "credit" || type === "borrowed") && <span className="text-red-500">*</span>}</Label>
              <Input value={beneficiary} onChange={(event) => setBeneficiary(event.target.value)} placeholder="e.g. Juan Dela Cruz" />
            </div>
            <div className="space-y-1">
              <Label>Material <span className="text-red-500">*</span></Label>
              <Select value={materialId} onValueChange={(value) => {
                setMaterialId(value);
                const item = items.find((inventoryItem) => inventoryItem.id === value);
                if (item) {
                  setUnit(item.unit);
                  setUnitPrice(String(item.cost || ""));
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Select an inventory item" /></SelectTrigger>
                <SelectContent>
                  {items
                    .filter((i) => i.active !== false)
                    .slice()
                    .sort((a, b) => {
                      const av = a.expiry === "—" ? "9999-12" : a.expiry;
                      const bv = b.expiry === "—" ? "9999-12" : b.expiry;
                      return av.localeCompare(bv);
                    })
                    .map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.name} — Expiry: {i.expiry}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Sorted by nearest expiry — release earliest-expiring items first.</p>
            </div>
            <div className="space-y-1">
              <Label>Quantity Released <span className="text-red-500">*</span></Label>
              <Input type="number" value={qty} onChange={(event) => setQty(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Unit <span className="text-red-500">*</span></Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["pcs", "kg", "L", "roll", "pair", "bag"].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Unit Price (₱) <span className="text-red-500">*</span></Label>
              <Input type="number" step="0.01" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} placeholder="0.00" />
            </div>
            {type === "borrowed" && (
              <div className="space-y-1">
                <Label>Expected Return Date <span className="text-red-500">*</span></Label>
                <InventoryDateInput value={expectedReturnDate} onChange={setExpectedReturnDate} />
              </div>
            )}
            <div className="space-y-1">
              <Label>Total Amount</Label>
              <Input value={`₱${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} disabled />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Transaction Type <span className="text-red-500">*</span></Label>
            <RadioGroup value={type} onValueChange={(value) => {
              setType(value);
              if (value === "borrowed") setExpectedReturnDate(addDaysInputDate(date, 7));
            }} className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { v: "direct", t: "Direct Release", d: "Deduct stock without credit." },
                { v: "credit", t: "Beneficiary Credit", d: "Outstanding balance recorded." },
                { v: "borrowed", t: "Borrowed Material", d: "Temporary issue to be returned." },
                { v: "internal", t: "Internal Use", d: "Used for operations." },
                { v: "adjustment", t: "Stock Adjustment", d: "Correct count or remove damaged/expired stock." },
              ].map((o) => (
                <label
                  key={o.v}
                  className={`p-3 border rounded-md cursor-pointer ${type === o.v ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value={o.v} id={o.v} />
                    <span>{o.t}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{o.d}</div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {selectedItem && (
            <div className="rounded-md border bg-slate-50 p-3 text-sm">
              <div className="font-medium">{selectedItem.name}</div>
              <div className="text-muted-foreground">
                Current balance: {selectedItem.onHand} {selectedItem.unit} • New balance after release: {Math.max(0, selectedItem.onHand - qtyValue)} {selectedItem.unit} • Status: {deriveStatus({ ...selectedItem, onHand: selectedItem.onHand - qtyValue })}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label>Purpose / Use</Label>
            <Input value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="e.g. Covering banana bunches for pest and sun protection." />
          </div>

          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Release for Block 12 — Weekly operations." />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { resetReleaseForm(); onOpenChange(false); }}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveRelease}>Save Release</Button>
          </div>

          <div className={`p-3 border rounded-md ${banner.bg}`}>
            This is a <strong>{banner.title}</strong>. {banner.text}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface CreditRow {
  receipt: string; date: string; beneficiary: string; material: string;
  qty: number; unit: string; unitCost: number;
  amount: number; status: string; remaining: number; slip: string;
  beneficiaryId?: string;
  deductionHistory?: CreditDeduction[];
}

interface BorrowedMaterialRow {
  id: string;
  slipNo: string;
  borrower: string;
  materialId: string;
  material: string;
  qtyBorrowed: number;
  qtyReturned: number;
  dateBorrowed: string;
  expectedReturnDate: string;
  actualReturnDate: string;
  unit: string;
  status: "Borrowed" | "Partially Returned" | "Returned" | "Overdue";
  notes?: string;
}

interface CreditDeduction {
  payrollBatch: string;
  date: string;
  amount: number;
  recordedBy: string;
}

const credits: CreditRow[] = [
  { receipt: "CR-2025-0007", date: "May 18, 2025", beneficiary: "Juan Dela Cruz", material: "Complete Fertilizer", qty: 40, unit: "kg", unitCost: 50.0, amount: 2000, status: "Partially Deducted", remaining: 1200, slip: "PB-2025-05" },
  { receipt: "CR-2025-0008", date: "May 19, 2025", beneficiary: "Maria Santos", material: "Urea Fertilizer", qty: 28, unit: "kg", unitCost: 46.43, amount: 1300, status: "Pending", remaining: 1300, slip: "—" },
  { receipt: "CR-2025-0009", date: "May 19, 2025", beneficiary: "Pedro Garcia", material: "Insecticide (Chlorpyrifos)", qty: 2, unit: "L", unitCost: 650.0, amount: 1300, status: "Fully Deducted", remaining: 0, slip: "PB-2025-05" },
  { receipt: "CR-2025-0010", date: "May 20, 2025", beneficiary: "Rosa Mendoza", material: "Banana Bags (Blue)", qty: 60, unit: "pcs", unitCost: 12.5, amount: 750, status: "Partially Deducted", remaining: 300, slip: "PB-2025-05" },
  { receipt: "CR-2025-0011", date: "May 20, 2025", beneficiary: "Jose Reyes", material: "Cardboard Boxes", qty: 50, unit: "pcs", unitCost: 32.0, amount: 1600, status: "Pending", remaining: 1600, slip: "—" },
];

function beneficiaryAccountId(name: string) {
  const normalized = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  return normalized ? `BEN-${normalized}` : "";
}

const borrowedMaterials: BorrowedMaterialRow[] = [
  {
    id: "BOR-2025-0012",
    slipNo: "BOR-2025-0012",
    borrower: "Ana Reyes",
    materialId: "FARM-001",
    material: "Twine / Rope",
    qtyBorrowed: 2,
    qtyReturned: 0,
    dateBorrowed: "2025-05-15",
    expectedReturnDate: "2025-05-22",
    actualReturnDate: "",
    unit: "roll",
    status: "Overdue",
    notes: "Borrowed for field work",
  },
];

function borrowedRemaining(row: BorrowedMaterialRow) {
  return Math.max(0, row.qtyBorrowed - row.qtyReturned);
}

function borrowedStatus(row: BorrowedMaterialRow): BorrowedMaterialRow["status"] {
  const remaining = borrowedRemaining(row);
  if (remaining <= 0) return "Returned";
  if (new Date(`${row.expectedReturnDate}T23:59:59`) < new Date()) return "Overdue";
  if (row.qtyReturned > 0) return "Partially Returned";
  return "Borrowed";
}

function borrowedStatusBadge(status: BorrowedMaterialRow["status"]) {
  if (status === "Returned") return "bg-emerald-100 text-emerald-800";
  if (status === "Partially Returned") return "bg-sky-100 text-sky-800";
  if (status === "Overdue") return "bg-red-100 text-red-800";
  return "bg-violet-100 text-violet-800";
}

function creditStatus(amount: number, remaining: number) {
  if (remaining <= 0) return "Fully Deducted";
  if (remaining < amount) return "Partially Deducted";
  return "Pending";
}

function StockAdjustmentDialog({ open, onOpenChange, items, setItems, setHistory, user }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
  setItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  setHistory: React.Dispatch<React.SetStateAction<StockHistoryRow[]>>;
  user: User;
}) {
  const activeItems = items.filter((item) => item.active !== false).slice().sort((a, b) => a.name.localeCompare(b.name));
  const [itemId, setItemId] = useState("");
  const [correctedQty, setCorrectedQty] = useState("");
  const [date, setDate] = useState(todayInputDate());
  const [reason, setReason] = useState("");
  const selectedItem = activeItems.find((item) => item.id === itemId);
  const correctedValue = Number(correctedQty);
  const systemQty = selectedItem?.onHand ?? 0;
  const difference = selectedItem && Number.isFinite(correctedValue) ? correctedValue - systemQty : 0;
  const adjustmentType = difference > 0 ? "Increase" : difference < 0 ? "Decrease" : "No Change";

  const resetForm = () => {
    setItemId("");
    setCorrectedQty("");
    setDate(todayInputDate());
    setReason("");
  };

  const saveAdjustment = () => {
    if (!selectedItem) {
      toast.error("Please select an inventory item");
      return;
    }
    if (!Number.isFinite(correctedValue) || correctedValue < 0) {
      toast.error("Corrected quantity must be zero or greater");
      return;
    }
    if (difference === 0) {
      toast.error("Corrected quantity must differ from the system quantity");
      return;
    }
    if (!reason.trim()) {
      toast.error("Reason for adjustment is required");
      return;
    }

    setItems((current) => current.map((item) =>
      item.id === selectedItem.id
        ? { ...item, onHand: correctedValue, updatedAt: date, hasTransactions: true }
        : item
    ));

    setHistory((current) => [
      {
        date: formatDateTime(date),
        material: selectedItem.name,
        type: "Adjustment",
        qty: difference,
        unit: selectedItem.unit,
        reason: `${adjustmentType} adjustment. System quantity: ${systemQty} ${selectedItem.unit}. Corrected quantity: ${correctedValue} ${selectedItem.unit}. Reason: ${reason.trim()}. Audit: stock adjustment recorded by ${user.name}.`,
        account: user.name,
        ref: `ADJ-${date.slice(0, 4)}-${String(current.length + 1).padStart(4, "0")}`,
        previousBalance: systemQty,
        updatedBalance: correctedValue,
      },
      ...current,
    ]);

    toast.success("Stock adjustment saved and audit trail recorded");
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) resetForm();
      onOpenChange(nextOpen);
    }}>
      <DialogContent className="!max-w-[95vw] w-[95vw] sm:!max-w-[560px] sm:w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700">
            <Edit className="h-5 w-5" />Stock Adjustment
          </DialogTitle>
          <DialogDescription>Correct inventory balances and record the adjustment in the stock history audit trail.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Inventory Item <span className="text-red-500">*</span></Label>
            <Select value={itemId} onValueChange={(value) => {
              setItemId(value);
              const item = activeItems.find((inventoryItem) => inventoryItem.id === value);
              setCorrectedQty(item ? String(item.onHand) : "");
            }}>
              <SelectTrigger><SelectValue placeholder="Select inventory item" /></SelectTrigger>
              <SelectContent>
                {activeItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.name} - {item.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Adjustment Date <span className="text-red-500">*</span></Label>
              <InventoryDateInput value={date} onChange={setDate} />
            </div>
            <div className="space-y-1">
              <Label>Adjustment Type</Label>
              <Input value={adjustmentType} disabled className={
                difference > 0 ? "bg-emerald-50 text-emerald-800"
                : difference < 0 ? "bg-red-50 text-red-800"
                : "bg-slate-50"
              } />
            </div>
            <div className="space-y-1">
              <Label>System Quantity</Label>
              <Input value={selectedItem ? `${systemQty} ${selectedItem.unit}` : ""} disabled />
            </div>
            <div className="space-y-1">
              <Label>Corrected Quantity <span className="text-red-500">*</span></Label>
              <Input type="number" min="0" step="0.01" value={correctedQty} onChange={(event) => setCorrectedQty(event.target.value)} />
            </div>
          </div>
          <div className="rounded-md border bg-slate-50 p-3 text-sm">
            <div className="font-medium">Quantity Difference</div>
            <div className={difference > 0 ? "text-emerald-700" : difference < 0 ? "text-red-700" : "text-muted-foreground"}>
              {selectedItem ? `${difference > 0 ? "+" : ""}${difference} ${selectedItem.unit}` : "Select an item to compute difference."}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Reason <span className="text-red-500">*</span></Label>
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain the count correction, damage, expiry, or reconciliation reason." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={saveAdjustment}>Save Adjustment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BorrowedMaterialsDialog({ open, onOpenChange, items, rows, setRows, setItems, setHistory, user }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
  rows: BorrowedMaterialRow[];
  setRows: React.Dispatch<React.SetStateAction<BorrowedMaterialRow[]>>;
  setItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  setHistory: React.Dispatch<React.SetStateAction<StockHistoryRow[]>>;
  user: User;
}) {
  const [returning, setReturning] = useState<BorrowedMaterialRow | null>(null);
  const [returnQty, setReturnQty] = useState("");
  const [returnDate, setReturnDate] = useState(todayInputDate());

  const displayRows = rows.map((row) => ({ ...row, status: borrowedStatus(row) }));

  const openReturn = (row: BorrowedMaterialRow) => {
    setReturning(row);
    setReturnQty(String(borrowedRemaining(row)));
    setReturnDate(todayInputDate());
  };

  const saveReturn = () => {
    if (!returning) return;
    const qty = Number(returnQty) || 0;
    const remaining = borrowedRemaining(returning);
    if (qty <= 0) {
      toast.error("Returned quantity must be greater than zero");
      return;
    }
    if (qty > remaining) {
      toast.error(`Only ${remaining} ${returning.unit} is still borrowed`);
      return;
    }
    const itemBeforeReturn = items.find((item) => item.id === returning.materialId);

    setRows((current) => current.map((row) => {
      if (row.id !== returning.id) return row;
      const qtyReturned = row.qtyReturned + qty;
      const updated = {
        ...row,
        qtyReturned,
        actualReturnDate: qtyReturned >= row.qtyBorrowed ? returnDate : row.actualReturnDate,
      };
      return { ...updated, status: borrowedStatus(updated) };
    }));

    setItems((current) => current.map((item) =>
      item.id === returning.materialId
        ? { ...item, onHand: item.onHand + qty, updatedAt: returnDate, hasTransactions: true }
        : item
    ));

    setHistory((current) => [
      {
        date: formatDateTime(returnDate),
        material: returning.material,
        type: "Returned Material",
        qty,
        unit: returning.unit,
        reason: `Returned by ${returning.borrower}. Borrow record: ${returning.id}. Audit: borrowed material return recorded by ${user.name}.`,
        account: user.name,
        ref: `RET-${returnDate.slice(0, 4)}-${String(current.length + 1).padStart(4, "0")}`,
        previousBalance: itemBeforeReturn?.onHand ?? 0,
        updatedBalance: (itemBeforeReturn?.onHand ?? 0) + qty,
      },
      ...current,
    ]);

    toast.success("Borrowed material return recorded and stock updated");
    setReturning(null);
    setReturnQty("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[95vw] w-[95vw] max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700">
            <History className="h-5 w-5" />Borrowed Materials
          </DialogTitle>
          <DialogDescription>Track borrowed materials, expected returns, actual returns, and remaining quantities.</DialogDescription>
        </DialogHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Borrow ID</TableHead>
              <TableHead>Borrower</TableHead>
              <TableHead>Material</TableHead>
              <TableHead className="text-right">Borrowed</TableHead>
              <TableHead className="text-right">Returned</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead>Date Borrowed</TableHead>
              <TableHead>Expected Return</TableHead>
              <TableHead>Actual Return</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground py-6">No borrowed material records yet.</TableCell>
              </TableRow>
            ) : displayRows.map((row) => {
              const remaining = borrowedRemaining(row);
              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.id}</TableCell>
                  <TableCell>{row.borrower}</TableCell>
                  <TableCell>{row.material}</TableCell>
                  <TableCell className="text-right">{row.qtyBorrowed} {row.unit}</TableCell>
                  <TableCell className="text-right">{row.qtyReturned} {row.unit}</TableCell>
                  <TableCell className="text-right">{remaining} {row.unit}</TableCell>
                  <TableCell>{formatDateLabel(row.dateBorrowed)}</TableCell>
                  <TableCell>{formatDateLabel(row.expectedReturnDate)}</TableCell>
                  <TableCell>{row.actualReturnDate ? formatDateLabel(row.actualReturnDate) : "-"}</TableCell>
                  <TableCell><Badge className={borrowedStatusBadge(row.status)}>{row.status}</Badge></TableCell>
                  <TableCell>
                    {remaining > 0 ? (
                      <Button size="sm" variant="outline" onClick={() => openReturn(row)}>
                        <ArrowDownCircle className="h-4 w-4 mr-1" />Return
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Complete</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>

      <Dialog open={!!returning} onOpenChange={(nextOpen) => !nextOpen && setReturning(null)}>
        <DialogContent className="!max-w-[95vw] w-[95vw] sm:!max-w-[460px] sm:w-[460px]">
          {returning && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-emerald-700">
                  <ArrowDownCircle className="h-5 w-5" />Record Borrowed Material Return
                </DialogTitle>
                <DialogDescription>Add returned quantity back to available inventory stock.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-md border bg-slate-50 p-3 text-sm">
                  <div className="font-medium">{returning.material}</div>
                  <div className="text-muted-foreground">Borrower: {returning.borrower}</div>
                  <div className="mt-2 flex justify-between">
                    <span>Remaining to return</span>
                    <span className="font-semibold">{borrowedRemaining(returning)} {returning.unit}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Actual Return Date <span className="text-red-500">*</span></Label>
                  <InventoryDateInput value={returnDate} onChange={setReturnDate} />
                </div>
                <div className="space-y-1">
                  <Label>Quantity Returned <span className="text-red-500">*</span></Label>
                  <Input type="number" min="0" step="0.01" value={returnQty} onChange={(event) => setReturnQty(event.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReturning(null)}>Cancel</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={saveReturn}>Save Return</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

function CreditTransactions({ credits, setCredits }: { credits: CreditRow[]; setCredits: React.Dispatch<React.SetStateAction<CreditRow[]>> }) {
  const displayCredits = credits.map((credit) => ({
    ...credit,
    beneficiaryId: credit.beneficiaryId || beneficiaryAccountId(credit.beneficiary),
    status: credit.status === "Deducted" ? "Fully Deducted" : credit.status,
    deductionHistory: credit.deductionHistory ?? [],
  }));
  const total = displayCredits.reduce((s, c) => s + c.remaining, 0);
  const [view, setView] = useState<CreditRow | null>(null);
  const [deducting, setDeducting] = useState<CreditRow | null>(null);
  const [deductionAmount, setDeductionAmount] = useState("");
  const [payrollBatch, setPayrollBatch] = useState("PB-2026-06");
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerStatus, setLedgerStatus] = useState("all");
  const ledgerRows = displayCredits.filter((credit) => {
    const q = ledgerSearch.trim().toLowerCase();
    const matchesSearch = !q
      || credit.receipt.toLowerCase().includes(q)
      || credit.beneficiary.toLowerCase().includes(q)
      || (credit.beneficiaryId ?? "").toLowerCase().includes(q)
      || credit.material.toLowerCase().includes(q)
      || credit.slip.toLowerCase().includes(q);
    const matchesStatus = ledgerStatus === "all" || credit.status === ledgerStatus;
    return matchesSearch && matchesStatus;
  });
  const ledgerCharged = ledgerRows.reduce((sum, credit) => sum + credit.amount, 0);
  const ledgerRemaining = ledgerRows.reduce((sum, credit) => sum + credit.remaining, 0);
  const ledgerDeducted = ledgerRows.reduce((sum, credit) => sum + (credit.amount - credit.remaining), 0);

  const openDeduction = (credit: CreditRow) => {
    setDeducting(credit);
    setDeductionAmount(String(credit.remaining || ""));
    setPayrollBatch(credit.slip && credit.slip !== "—" && credit.slip !== "â€”" ? credit.slip : "PB-2026-06");
  };

  const saveDeduction = () => {
    if (!deducting) return;
    const amount = Number(deductionAmount) || 0;
    if (amount <= 0) {
      toast.error("Deduction amount must be greater than zero");
      return;
    }
    if (amount > deducting.remaining) {
      toast.error("Deduction cannot exceed the remaining balance");
      return;
    }
    if (!payrollBatch.trim()) {
      toast.error("Payroll batch is required");
      return;
    }

    setCredits((current) => current.map((credit) => {
      if (credit.receipt !== deducting.receipt) return credit;
      const remaining = Math.max(0, credit.remaining - amount);
      return {
        ...credit,
        remaining,
        status: creditStatus(credit.amount, remaining),
        slip: payrollBatch.trim(),
        beneficiaryId: credit.beneficiaryId || beneficiaryAccountId(credit.beneficiary),
        deductionHistory: [
          ...(credit.deductionHistory ?? []),
          {
            payrollBatch: payrollBatch.trim(),
            date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
            amount,
            recordedBy: "Payroll Personnel",
          },
        ],
      };
    }));
    toast.success("Payroll deduction recorded and credit balance updated");
    setDeducting(null);
    setDeductionAmount("");
  };

  const printReceipt = () => {
    const node = document.getElementById("credit-receipt-print");
    if (!node) return;
    const win = window.open("", "_blank", "width=720,height=900");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>Receipt ${view?.receipt}</title>
      <style>
        body{font-family:ui-sans-serif,system-ui,sans-serif;padding:24px;color:#0f172a}
        h1{margin:0 0 4px;font-size:18px}
        .muted{color:#64748b;font-size:12px}
        table{width:100%;border-collapse:collapse;margin-top:12px}
        th,td{border:1px solid #e2e8f0;padding:8px;font-size:13px;text-align:left}
        .right{text-align:right}
        .totals{margin-top:12px;display:flex;justify-content:space-between;font-weight:600}
        .sig{margin-top:48px;display:flex;justify-content:space-between;font-size:12px}
        .sig div{border-top:1px solid #94a3b8;padding-top:6px;width:45%;text-align:center}
      </style></head><body>${node.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  const printLedger = () => {
    const node = document.getElementById("credit-ledger-print");
    if (!node) return;
    const win = window.open("", "_blank", "width=1100,height=800");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>Credit Ledger</title>
      <style>
        body{font-family:ui-sans-serif,system-ui,sans-serif;padding:24px;color:#0f172a}
        h1{margin:0 0 4px;font-size:20px}
        .muted{color:#64748b;font-size:12px}
        table{width:100%;border-collapse:collapse;margin-top:12px}
        th,td{border:1px solid #e2e8f0;padding:8px;font-size:12px;text-align:left}
        th{background:#f8fafc}
        .right{text-align:right}
      </style></head><body>${node.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  const exportLedgerCsv = () => {
    const headers = ["Receipt No.", "Date", "Beneficiary", "Beneficiary ID", "Material", "Qty", "Unit", "Unit Cost", "Amount Charged", "Deducted", "Remaining", "Status", "Payroll Batch"];
    const lines = ledgerRows.map((credit) => [
      credit.receipt,
      credit.date,
      credit.beneficiary,
      credit.beneficiaryId ?? "",
      credit.material,
      String(credit.qty),
      credit.unit,
      credit.unitCost.toFixed(2),
      credit.amount.toFixed(2),
      (credit.amount - credit.remaining).toFixed(2),
      credit.remaining.toFixed(2),
      credit.status,
      credit.slip,
    ]);
    const csv = [headers, ...lines]
      .map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "credit-ledger.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2"><CreditCard className="h-6 w-6 text-emerald-700" />Credit Transactions</h1>
        <p className="text-muted-foreground">Manage credit releases and deductions for beneficiaries.</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Credit Transactions</CardTitle>
          <CardDescription>Credit transactions to be deducted during payroll preparation.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Beneficiary Name</TableHead><TableHead>Material Released</TableHead>
                <TableHead>Amount Charged (₱)</TableHead><TableHead>Deduction Status</TableHead>
                <TableHead>Remaining Balance (₱)</TableHead><TableHead>Payroll Batch</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayCredits.map((c, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="font-medium">{c.beneficiary}</div>
                    <div className="text-xs text-muted-foreground">{c.beneficiaryId}</div>
                  </TableCell>
                  <TableCell>{c.material}</TableCell>
                  <TableCell>{c.amount.toLocaleString()}.00</TableCell>
                  <TableCell>
                    <Badge className={
                      c.status === "Partially Deducted" ? "bg-amber-100 text-amber-800"
                      : c.status === "Pending" ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                    }>{c.status}</Badge>
                  </TableCell>
                  <TableCell>{c.remaining.toLocaleString()}.00</TableCell>
                  <TableCell>{c.slip}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                    <button
                      title="View Receipt"
                      className="p-1.5 rounded bg-sky-100 text-sky-700 hover:bg-sky-200"
                      onClick={() => setView(c)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    {c.remaining > 0 && (
                      <button
                        title="Record Payroll Deduction"
                        className="p-1.5 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        onClick={() => openDeduction(c)}
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                      </button>
                    )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <strong>Total Outstanding Balance</strong>
            <strong className="text-emerald-700">₱ {total.toLocaleString()}.00</strong>
          </div>
          <div className="flex justify-end mt-2">
            <Button variant="link" className="text-emerald-700" onClick={() => setLedgerOpen(true)}>View full credit ledger →</Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={ledgerOpen} onOpenChange={setLedgerOpen}>
        <DialogContent className="!max-w-[95vw] w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <CreditCard className="h-5 w-5" />Full Credit Ledger
            </DialogTitle>
            <DialogDescription>
              Complete ledger of beneficiary credit releases, payroll deductions, and remaining balances.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4" id="credit-ledger-print">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-md border bg-slate-50 p-3">
                <div className="text-xs text-muted-foreground">Total Charged</div>
                <div className="text-lg font-semibold">₱{ledgerCharged.toLocaleString()}.00</div>
              </div>
              <div className="rounded-md border bg-emerald-50 p-3">
                <div className="text-xs text-muted-foreground">Total Deducted</div>
                <div className="text-lg font-semibold text-emerald-700">₱{ledgerDeducted.toLocaleString()}.00</div>
              </div>
              <div className="rounded-md border bg-amber-50 p-3">
                <div className="text-xs text-muted-foreground">Remaining Balance</div>
                <div className="text-lg font-semibold text-amber-700">₱{ledgerRemaining.toLocaleString()}.00</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-[240px] flex-1">
                <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  value={ledgerSearch}
                  onChange={(event) => setLedgerSearch(event.target.value)}
                  placeholder="Search receipt, beneficiary, material..."
                  className="h-9 pl-8"
                />
              </div>
              <Select value={ledgerStatus} onValueChange={setLedgerStatus}>
                <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Partially Deducted">Partially Deducted</SelectItem>
                  <SelectItem value="Fully Deducted">Fully Deducted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Beneficiary</TableHead>
                  <TableHead>Beneficiary ID</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Charged</TableHead>
                  <TableHead className="text-right">Deducted</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payroll Batch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-muted-foreground py-6">No credit ledger records match the selected filters.</TableCell>
                  </TableRow>
                ) : ledgerRows.map((credit) => (
                  <TableRow key={credit.receipt}>
                    <TableCell className="font-medium">{credit.receipt}</TableCell>
                    <TableCell>{credit.date}</TableCell>
                    <TableCell>{credit.beneficiary}</TableCell>
                    <TableCell>{credit.beneficiaryId}</TableCell>
                    <TableCell>{credit.material}</TableCell>
                    <TableCell className="text-right">{credit.qty} {credit.unit}</TableCell>
                    <TableCell className="text-right">₱{credit.unitCost.toFixed(2)}</TableCell>
                    <TableCell className="text-right">₱{credit.amount.toLocaleString()}.00</TableCell>
                    <TableCell className="text-right">₱{(credit.amount - credit.remaining).toLocaleString()}.00</TableCell>
                    <TableCell className="text-right">₱{credit.remaining.toLocaleString()}.00</TableCell>
                    <TableCell>
                      <Badge className={
                        credit.status === "Fully Deducted" ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                      }>{credit.status}</Badge>
                    </TableCell>
                    <TableCell>{credit.slip}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLedgerOpen(false)}>Close</Button>
            <Button variant="outline" onClick={exportLedgerCsv}>Export CSV</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={printLedger}>Print Ledger</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="!max-w-[95vw] w-[95vw] sm:!max-w-[640px] sm:w-[640px]">
          {view && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-emerald-700">
                  <CreditCard className="h-5 w-5" />Credit Receipt
                </DialogTitle>
              </DialogHeader>
              <div id="credit-receipt-print" className="space-y-4 text-sm">
                <div className="text-center space-y-1 pb-3 border-b">
                  <h1 className="text-emerald-700">DARBCO — Davao Abaca Banana Cooperative</h1>
                  <div className="text-xs text-muted-foreground">Panabo City, Davao del Norte</div>
                  <div className="text-xs text-muted-foreground">Credit Release Receipt</div>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 bg-slate-50 rounded-md">
                  <div><div className="text-xs text-muted-foreground mb-0.5">Receipt No.</div><div>{view.receipt}</div></div>
                  <div><div className="text-xs text-muted-foreground mb-0.5">Date</div><div>{view.date}</div></div>
                  <div><div className="text-xs text-muted-foreground mb-0.5">Beneficiary</div><div>{view.beneficiary}</div></div>
                  <div><div className="text-xs text-muted-foreground mb-0.5">Beneficiary ID</div><div>{view.beneficiaryId}</div></div>
                  <div><div className="text-xs text-muted-foreground mb-0.5">Payroll Batch</div><div>{view.slip}</div></div>
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left p-2">Item</th>
                      <th className="text-right p-2">Qty</th>
                      <th className="text-left p-2">Unit</th>
                      <th className="text-right p-2">Unit Cost</th>
                      <th className="text-right p-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2">{view.material}</td>
                      <td className="text-right p-2">{view.qty}</td>
                      <td className="p-2">{view.unit}</td>
                      <td className="text-right p-2">₱{view.unitCost.toFixed(2)}</td>
                      <td className="text-right p-2">₱{view.amount.toLocaleString()}.00</td>
                    </tr>
                  </tbody>
                </table>
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Charged</span><span>₱{view.amount.toLocaleString()}.00</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Remaining Balance</span><span>₱{view.remaining.toLocaleString()}.00</span></div>
                  <div className="flex justify-between border-t pt-2"><span className="text-muted-foreground">Status</span><span className="text-emerald-700">{view.status}</span></div>
                </div>
                <div className="space-y-2">
                  <div className="font-medium">Deduction History</div>
                  {(view.deductionHistory ?? []).length === 0 ? (
                    <div className="rounded-md border bg-slate-50 p-3 text-muted-foreground">No payroll deductions have been recorded yet.</div>
                  ) : (
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Payroll Batch</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Recorded By</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(view.deductionHistory ?? []).map((entry, index) => (
                            <TableRow key={`${entry.payrollBatch}-${index}`}>
                              <TableCell>{entry.payrollBatch}</TableCell>
                              <TableCell>{entry.date}</TableCell>
                              <TableCell>{entry.recordedBy}</TableCell>
                              <TableCell className="text-right">â‚±{entry.amount.toLocaleString()}.00</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-8 pt-8">
                  <div className="text-center">
                    <div className="border-t pt-2 text-xs text-muted-foreground">Released By (Bookkeeper)</div>
                  </div>
                  <div className="text-center">
                    <div className="border-t pt-2 text-xs text-muted-foreground">Received By (Beneficiary)</div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setView(null)}>Close</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={printReceipt}>Print Receipt</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deducting} onOpenChange={(open) => !open && setDeducting(null)}>
        <DialogContent className="!max-w-[95vw] w-[95vw] sm:!max-w-[460px] sm:w-[460px]">
          {deducting && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-emerald-700">
                  <CreditCard className="h-5 w-5" />Record Payroll Deduction
                </DialogTitle>
                <DialogDescription>
                  Apply a payroll deduction to this beneficiary credit and update the remaining balance.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-md border bg-slate-50 p-3 text-sm">
                  <div className="font-medium">{deducting.beneficiary}</div>
                  <div className="text-muted-foreground">{deducting.receipt} - {deducting.material}</div>
                  <div className="mt-2 flex justify-between">
                    <span>Remaining Balance</span>
                    <span className="font-semibold">â‚±{deducting.remaining.toLocaleString()}.00</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Payroll Batch <span className="text-red-500">*</span></Label>
                  <Input value={payrollBatch} onChange={(event) => setPayrollBatch(event.target.value)} placeholder="e.g. PB-2026-06" />
                </div>
                <div className="space-y-1">
                  <Label>Deduction Amount <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={deductionAmount}
                    onChange={(event) => setDeductionAmount(event.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeducting(null)}>Cancel</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={saveDeduction}>Save Deduction</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface StockHistoryRow {
  date: string;
  material: string;
  type: string;
  qty: number;
  unit: string;
  reason: string;
  account: string;
  ref: string;
  previousBalance?: number;
  updatedBalance?: number;
}

const stockHistory: StockHistoryRow[] = [
  { date: "May 21, 2025 03:15 PM", material: "Pruning Shears", type: "Returned Material", qty: +2, unit: "pcs", reason: "Returned by Ana Reyes after use", account: "Bookkeeper", ref: "RET-2025-0005" },
  { date: "May 20, 2025 09:30 AM", material: "Banana Bags (Blue)", type: "Direct Release", qty: -300, unit: "pcs", reason: "Released to Maria Santos", account: "Bookkeeper", ref: "RS-2025-0050" },
  { date: "May 19, 2025 02:30 PM", material: "Urea Fertilizer", type: "Stock In", qty: +200, unit: "kg", reason: "Received from AgriSupply Co.", account: "Bookkeeper", ref: "RC-2025-0042" },
  { date: "May 18, 2025 10:00 AM", material: "Complete Fertilizer", type: "Credit Issued", qty: -100, unit: "kg", reason: "Credit to Juan Dela Cruz", account: "Bookkeeper", ref: "CR-2025-0007" },
  { date: "May 17, 2025 04:45 PM", material: "Twine / Rope", type: "Adjustment", qty: -5, unit: "roll", reason: "Correction of counting", account: "Bookkeeper", ref: "ADJ-2025-0003" },
  { date: "May 17, 2025 08:51 AM", material: "Gloves", type: "Direct Release", qty: -10, unit: "pair", reason: "Released to Pedro Garcia", account: "Bookkeeper", ref: "RS-2025-0049" },
  { date: "May 16, 2025 11:22 AM", material: "Mancozeb Fungicide", type: "Stock Out — Expired", qty: -2, unit: "kg", reason: "Expired product disposal", account: "Bookkeeper", ref: "EXP-2025-0001" },
  { date: "May 16, 2025 09:00 AM", material: "Cardboard Boxes", type: "Stock In", qty: +300, unit: "pcs", reason: "Received from Farm Plus Inc.", account: "Bookkeeper", ref: "RC-2025-0041" },
  { date: "May 15, 2025 01:20 PM", material: "Pruning Shears", type: "Borrowed Material", qty: -2, unit: "pcs", reason: "Borrowed by Ana Reyes for field work", account: "Bookkeeper", ref: "BOR-2025-0012" },
];

function parseHistoryDate(s: string): Date {
  // e.g. "May 20, 2025 09:30 AM"
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

function formatDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatDateTime(value: string) {
  const date = new Date(`${value}T${new Date().toTimeString().slice(0, 8)}`);
  return Number.isNaN(date.getTime())
    ? new Date().toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
    : date.toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

const TXN_TYPES = ["Stock In", "Direct Release", "Credit Issued", "Borrowed Material", "Internal Use", "Adjustment", "Stock Out — Expired", "Returned Material"];

function StockHistory({ history }: { history: StockHistoryRow[] }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState("all");
  const [material, setMaterial] = useState("all");

  const materialOptions = Array.from(new Set(history.map((r) => r.material))).sort();

  const filtered = history.filter((r) => {
    const d = parseHistoryDate(r.date);
    if (from && d < new Date(from + "T00:00:00")) return false;
    if (to && d > new Date(to + "T23:59:59")) return false;
    if (type !== "all" && r.type !== type) return false;
    if (material !== "all" && r.material !== material) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2"><History className="h-6 w-6 text-emerald-700" />Stock History / Audit Trail</h1>
        <p className="text-muted-foreground">Complete read-only audit trail of all inventory transactions.</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44 h-9" />
            <span className="self-center text-muted-foreground">—</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44 h-9" />
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-52 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transaction Types</SelectItem>
                {TXN_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={material} onValueChange={setMaterial}>
              <SelectTrigger className="w-56 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Materials</SelectItem>
                {materialOptions.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead><TableHead>Date & Time</TableHead><TableHead>Material</TableHead>
                <TableHead>Transaction Type</TableHead><TableHead className="text-right">Qty Added</TableHead>
                <TableHead className="text-right">Qty Deducted</TableHead>
                <TableHead className="text-right">Previous Balance</TableHead>
                <TableHead className="text-right">Updated Balance</TableHead>
                <TableHead>Reason / Details</TableHead><TableHead>Bookkeeper Account</TableHead>
                <TableHead>Reference No.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-6">
                    No inventory transactions found for the selected filters.
                  </TableCell>
                </TableRow>
              ) : filtered.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{transactionId(r)}</TableCell>
                  <TableCell className="text-xs">{r.date}</TableCell>
                  <TableCell>{r.material}</TableCell>
                  <TableCell>
                    <Badge className={
                      r.type === "Stock In" ? "bg-emerald-100 text-emerald-800"
                      : r.type === "Direct Release" ? "bg-blue-100 text-blue-800"
                      : r.type === "Credit Issued" ? "bg-amber-100 text-amber-800"
                      : r.type === "Borrowed Material" ? "bg-purple-100 text-purple-800"
                      : r.type === "Adjustment" ? "bg-slate-100 text-slate-700"
                      : r.type === "Stock Out — Expired" ? "bg-red-100 text-red-800"
                      : r.type === "Returned Material" ? "bg-teal-100 text-teal-800"
                      : "bg-slate-100 text-slate-800"
                    }>{r.type}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-emerald-700">{quantityAdded(r) ? `${quantityAdded(r)} ${r.unit}` : "-"}</TableCell>
                  <TableCell className="text-right text-red-600">{quantityDeducted(r) ? `${quantityDeducted(r)} ${r.unit}` : "-"}</TableCell>
                  <TableCell className="text-right">{typeof r.previousBalance === "number" ? `${r.previousBalance} ${r.unit}` : "-"}</TableCell>
                  <TableCell className="text-right">{typeof r.updatedBalance === "number" ? `${r.updatedBalance} ${r.unit}` : "-"}</TableCell>
                  <TableCell>{r.reason}</TableCell>
                  <TableCell>{r.account}</TableCell>
                  <TableCell>{r.ref}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-muted-foreground">Showing 1 to {filtered.length} of {filtered.length} records</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></Button>
              <Button size="sm" className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700">1</Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RestockRequests({ user, requests, setRequests }: {
  user: User;
  requests: RestockRequest[];
  setRequests: React.Dispatch<React.SetStateAction<RestockRequest[]>>;
}) {
  const [openCreate, setOpenCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewing, setViewing] = useState<RestockRequest | null>(null);
  const [cancelling, setCancelling] = useState<RestockRequest | null>(null);

  const filtered = requests.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.id.toLowerCase().includes(q) || r.material.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || r.status.toLowerCase() === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusClass = (status: string) => {
    switch (status) {
      case "Pending": return "bg-amber-100 text-amber-800";
      case "Approved": return "bg-emerald-100 text-emerald-800";
      case "Rejected": return "bg-red-100 text-red-800";
      case "Completed": return "bg-sky-100 text-sky-800";
      default: return "bg-slate-100 text-slate-800";
    }
  };

  const handleCreate = (request: Omit<RestockRequest, "id" | "dateRequested" | "requestedBy" | "status">) => {
    const nextNumber = requests.length > 0
      ? Math.max(...requests.map((r) => Number(r.id.split("-").at(-1)) || 0)) + 1
      : 1;

    setRequests((current) => [
      {
        ...request,
        id: `RR-2025-${String(nextNumber).padStart(3, "0")}`,
        dateRequested: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        requestedBy: user.name,
        status: "Pending",
      },
      ...current,
    ]);
    toast.success("Restock request submitted for approval");
  };

  const handleConfirmCancel = () => {
    if (!cancelling) return;
    setRequests((current) => current.filter((r) => r.id !== cancelling.id));
    toast.success("Restock request cancelled");
    setCancelling(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2"><FileBarChart2 className="h-6 w-6 text-emerald-700" />Restock Requests</h1>
          <p className="text-muted-foreground">Request materials that need restocking</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setOpenCreate(true)}>
          <Plus className="h-4 w-4 mr-1" />Create Restock Request
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input placeholder="Search restock requests..." className="pl-8 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request ID</TableHead>
                <TableHead>Date Requested</TableHead>
                <TableHead>Material Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Current Qty</TableHead>
                <TableHead className="text-right">Requested Qty</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[88px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    No restock requests available yet.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.id}</TableCell>
                    <TableCell>{r.dateRequested}</TableCell>
                    <TableCell>{r.material}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.category}</TableCell>
                    <TableCell className="text-right">{r.current}</TableCell>
                    <TableCell className="text-right font-medium">{r.requested}</TableCell>
                    <TableCell className="text-sm">{r.reason}</TableCell>
                    <TableCell>{r.requestedBy}</TableCell>
                    <TableCell><Badge className={getStatusClass(r.status)}>{r.status}</Badge></TableCell>
                    <TableCell className="w-[88px]">
                      <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                        <button className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded bg-sky-100 text-sky-700 hover:bg-sky-200" title="View" aria-label={`View ${r.id}`} onClick={() => setViewing(r)}>
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {r.status === "Pending" && (
                          <button className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded bg-red-100 text-red-700 hover:bg-red-200" title="Cancel" aria-label={`Cancel ${r.id}`} onClick={() => setCancelling(r)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-muted-foreground">Showing 1 to {filtered.length} of {filtered.length} requests</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></Button>
              <Button size="sm" className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700">1</Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <CreateRestockRequestDialog open={openCreate} onOpenChange={setOpenCreate} onCreate={handleCreate} />

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <Eye className="h-5 w-5" />Restock Request Details
            </DialogTitle>
            <DialogDescription>
              Review the material request information before manager approval.
            </DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <Detail label="Request ID" value={viewing.id} />
              <Detail label="Status" value={viewing.status} />
              <Detail label="Date Requested" value={viewing.dateRequested} />
              <Detail label="Requested By" value={viewing.requestedBy} />
              <Detail label="Material" value={viewing.material} />
              <Detail label="Category" value={viewing.category || "Not specified"} />
              <Detail label="Current Quantity" value={String(viewing.current)} />
              <Detail label="Requested Quantity" value={String(viewing.requested)} />
              <Detail label="Priority" value={viewing.priority || "Normal"} />
              <Detail className="sm:col-span-2" label="Reason" value={viewing.reason} />
              {viewing.notes && <Detail className="sm:col-span-2" label="Notes" value={viewing.notes} />}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelling} onOpenChange={(o) => !o && setCancelling(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />Cancel Restock Request
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel <strong>{cancelling?.id}</strong> for <strong>{cancelling?.material}</strong>? This will remove the pending request from the list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelling(null)}>Keep Request</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirmCancel}>Cancel Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type RestockRequest = {
  id: string;
  dateRequested: string;
  material: string;
  category: string;
  current: number;
  requested: number;
  reason: string;
  requestedBy: string;
  status: "Pending" | "Approved" | "Rejected" | "Completed";
  priority?: string;
  notes?: string;
};

function initialRestockRequests(userName: string): RestockRequest[] {
  return [
    { id: "RR-2025-001", dateRequested: "May 20, 2025", material: "Urea Fertilizer", category: "Fertilizers and Soil Inputs", current: 40, requested: 100, reason: "Below minimum stock level", requestedBy: userName, status: "Pending", priority: "Normal", notes: "" },
    { id: "RR-2025-002", dateRequested: "May 19, 2025", material: "Banana Bags (Blue)", category: "Packaging Materials", current: 80, requested: 150, reason: "High demand this month", requestedBy: userName, status: "Approved", priority: "Normal", notes: "" },
  ];
}

function Detail({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-md border bg-slate-50 px-3 py-2 ${className}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium text-slate-900">{value}</div>
    </div>
  );
}

function CreateRestockRequestDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (o: boolean) => void; onCreate: (request: Omit<RestockRequest, "id" | "dateRequested" | "requestedBy" | "status">) => void }) {
  const [material, setMaterial] = useState("");
  const [category, setCategory] = useState("");
  const [currentQty, setCurrentQty] = useState("");
  const [minStock, setMinStock] = useState("");
  const [requestedQty, setRequestedQty] = useState("");
  const [reason, setReason] = useState("");
  const [priority, setPriority] = useState("normal");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!material || !requestedQty || !reason) {
      toast.error("Please fill in all required fields");
      return;
    }
    onCreate({
      material,
      category: CATEGORIES.find((c) => c.toLowerCase().startsWith(category)) || category || "Not specified",
      current: Number(currentQty) || 0,
      requested: Number(requestedQty) || 0,
      reason,
      priority: priority === "urgent" ? "Urgent" : "Normal",
      notes,
    });
    onOpenChange(false);
    // Reset form
    setMaterial("");
    setCategory("");
    setCurrentQty("");
    setMinStock("");
    setRequestedQty("");
    setReason("");
    setPriority("normal");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700">
            <Plus className="h-5 w-5" />Create Restock Request
          </DialogTitle>
          <DialogDescription>
            Submit a request to restock materials that are low or out of stock
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Material Name <span className="text-red-500">*</span></Label>
              <Input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="Select or search material" />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fertilizers">Fertilizers and Soil Inputs</SelectItem>
                  <SelectItem value="chemicals">Chemicals and Crop Protection Materials</SelectItem>
                  <SelectItem value="farm">Farm Materials</SelectItem>
                  <SelectItem value="packaging">Packaging Materials</SelectItem>
                  <SelectItem value="other">Other Supplies</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Current Quantity</Label>
              <Input type="number" value={currentQty} onChange={(e) => setCurrentQty(e.target.value)} placeholder="0" readOnly className="bg-slate-50" />
            </div>
            <div className="space-y-1">
              <Label>Minimum Stock Level</Label>
              <Input type="number" value={minStock} onChange={(e) => setMinStock(e.target.value)} placeholder="0" readOnly className="bg-slate-50" />
            </div>
            <div className="space-y-1">
              <Label>Requested Quantity <span className="text-red-500">*</span></Label>
              <Input type="number" value={requestedQty} onChange={(e) => setRequestedQty(e.target.value)} placeholder="Enter quantity to request" />
            </div>
            <div className="space-y-1">
              <Label>Priority Level</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Reason for Restock <span className="text-red-500">*</span></Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Below minimum stock level, high demand expected" rows={2} />
          </div>

          <div className="space-y-1">
            <Label>Additional Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional additional information" rows={2} />
          </div>

          <div className="text-xs text-muted-foreground bg-sky-50 border border-sky-200 rounded-md p-3">
            <strong>Note:</strong> This request will be sent to the Manager/Admin for review and approval.
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSubmit}>
              <FileBarChart2 className="h-4 w-4 mr-1" />Submit Request
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

void TrendingUp;
void ArrowDownCircle;
