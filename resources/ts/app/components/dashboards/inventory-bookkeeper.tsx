import { useState } from "react";
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
  Trash2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { User } from "../types";
import { toast } from "sonner";

interface Props { user: User; onLogout: () => void }

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "items", label: "Inventory Items", icon: <Boxes className="h-4 w-4" /> },
  { id: "release", label: "Released Materials", icon: <ArrowUpCircle className="h-4 w-4" /> },
  { id: "credit", label: "Credit Transactions", icon: <CreditCard className="h-4 w-4" /> },
  { id: "history", label: "Stock History", icon: <History className="h-4 w-4" /> },
  { id: "restock", label: "Restock Requests", icon: <FileBarChart2 className="h-4 w-4" /> },
];

export function InventoryBookkeeperDashboard({ user, onLogout }: Props) {
  const [active, setActive] = useState("dashboard");

  return (
    <DarbcoLayout user={user} onLogout={onLogout} navItems={NAV} active={active} onChange={setActive}>
      {active === "dashboard" && <Dashboard goTo={setActive} user={user} />}
      {active === "items" && <InventoryItems user={user} />}
      {active === "release" && <ReleaseMaterials user={user} />}
      {active === "credit" && <CreditTransactions user={user} />}
      {active === "history" && <StockHistory user={user} />}
      {active === "restock" && <RestockRequests user={user} />}
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

function Dashboard({ goTo, user }: { goTo: (page: string) => void; user: User }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2"><LayoutDashboard className="h-6 w-6 text-emerald-700" />Dashboard</h1>
        <div className="text-muted-foreground">May 20, 2025</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard color="emerald" icon={<Package />} label="Total Inventory Items" value="98" sub="Active materials" onClick={() => goTo("items")} />
        <KpiCard color="amber" icon={<AlertTriangle />} label="Low Stock Items" value="8" sub="Reorder needed" onClick={() => goTo("items")} />
        <KpiCard color="red" icon={<AlertTriangle />} label="Out of Stock" value="2" sub="Critical items" onClick={() => goTo("items")} />
        <KpiCard color="violet" icon={<FileBarChart2 />} label="Pending Restock Requests" value="3" sub="Awaiting approval" onClick={() => goTo("restock")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex !flex-row items-center justify-between gap-3 pb-2">
            <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" />Low Stock Alerts</CardTitle>
            <Button variant="link" className="ml-auto h-auto shrink-0 px-0 py-0 text-emerald-700" onClick={() => goTo("items")}>View all →</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStockItems.map((i) => (
              <div key={i.name} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-md">
                <div>
                  <div>{i.name}</div>
                  <div className="text-xs text-muted-foreground">Min stock: {i.min} {i.unit}</div>
                </div>
                <Badge className="bg-amber-100 text-amber-800">{i.current} {i.unit}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex !flex-row items-center justify-between gap-3 pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Boxes className="h-4 w-4 text-emerald-700" />Inventory by Category</CardTitle>
            <Button variant="link" className="ml-auto h-auto shrink-0 px-0 py-0 text-emerald-700" onClick={() => goTo("items")}>View report →</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {inventoryByCategory.map((c) => (
              <div key={c.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{c.name}</span>
                  <span className="text-muted-foreground">{c.value} ({c.value}.0%)</span>
                </div>
                <div className="h-2 rounded bg-slate-100 overflow-hidden">
                  <div className={`h-full ${c.color}`} style={{ width: `${c.value}%` }} />
                </div>
              </div>
            ))}
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
              {recentActivity.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>
                    <Badge className={
                      r.activity === "Release" ? "bg-sky-100 text-sky-800"
                      : r.activity === "Stock In" ? "bg-emerald-100 text-emerald-800"
                      : r.activity === "Credit Issued" ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-700"
                    }>{r.activity}</Badge>
                  </TableCell>
                  <TableCell>{r.material}</TableCell>
                  <TableCell>{r.reference}</TableCell>
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

interface InventoryItem {
  id: string; name: string; category: string; unit: string;
  onHand: number; stockDate: string; cost: number; expiry: string;
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
  if (i.onHand <= 20) return "Low Stock";
  return "OK";
}

const CATEGORIES = [
  "Fertilizers and Soil Inputs",
  "Chemicals and Crop Protection Materials",
  "Farm Materials",
  "Packaging Materials",
  "Other Supplies",
];

function InventoryItems() {
  const [showAdd, setShowAdd] = useState(false);
  const [data, setData] = useState<InventoryItem[]>(seedItems);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState<InventoryItem | null>(null);

  if (showAdd) return <AddInventoryItem onBack={() => setShowAdd(false)} />;

  const filtered = data.filter((i) => {
    if (i.active === false) return false;
    const q = search.trim().toLowerCase();
    if (q && !i.name.toLowerCase().includes(q) && !i.id.toLowerCase().includes(q) && !i.category.toLowerCase().includes(q)) return false;
    if (category !== "all" && i.category !== category) return false;
    if (status !== "all" && deriveStatus(i) !== status) return false;
    return true;
  });

  const handleSaveEdit = (updated: InventoryItem) => {
    setData((cur) => cur.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)));
    setEditing(null);
    toast.success("Inventory item updated");
  };

  const handleConfirmDelete = () => {
    if (!deleting) return;
    if (deleting.hasTransactions) {
      setData((cur) => cur.map((i) => (i.id === deleting.id ? { ...i, active: false } : i)));
      toast.message("Item marked Inactive (has transaction history).");
    } else {
      setData((cur) => cur.filter((i) => i.id !== deleting.id));
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
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" />Add Item</Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material ID</TableHead><TableHead>Item Name</TableHead><TableHead>Category</TableHead>
                <TableHead>Unit</TableHead><TableHead>On Hand</TableHead>
                <TableHead>Unit Cost</TableHead><TableHead>Expiry Date</TableHead><TableHead>Stock Date</TableHead>
                <TableHead>Status</TableHead><TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">No matching inventory items. Items that are out of stock or no longer needed can be removed using the delete action.</TableCell></TableRow>
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
                    <TableCell>₱{i.cost.toFixed(2)}</TableCell>
                    <TableCell>{i.expiry}</TableCell>
                    <TableCell>{i.stockDate}</TableCell>
                    <TableCell><Badge className={badge}>{s}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
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
              <Input type="date" value={form.stockDate} onChange={(e) => setForm({ ...form, stockDate: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Unit Cost (₱)</Label>
              <Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Expiration Date</Label>
              <Input value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} placeholder="MM/YYYY or —" />
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
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => form && onSave(form)}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface StockInRow { name: string; category: string; qty: string; unit: string; cost: string; expiry: string; notes: string }

const CATEGORY_PREFIX: Record<string, string> = {
  "Fertilizers and Soil Inputs": "FERT",
  "Chemicals and Crop Protection Materials": "CHEM",
  "Farm Materials": "FARM",
  "Packaging Materials": "PACK",
  "Other Supplies": "MISC",
};

function generateMaterialId(category: string, rowIndex: number, rows: StockInRow[]): string {
  const prefix = CATEGORY_PREFIX[category];
  if (!prefix) return "";
  const existingCount = seedItems.filter((s) => CATEGORY_PREFIX[s.category] === prefix).length;
  const offsetInForm = rows.slice(0, rowIndex).filter((r) => CATEGORY_PREFIX[r.category] === prefix).length;
  const next = existingCount + offsetInForm + 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

function AddInventoryItem({ onBack }: { onBack: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<StockInRow[]>([
    { name: "", category: "", qty: "", unit: "kg", cost: "", expiry: "", notes: "" },
  ]);

  const update = (i: number, k: keyof StockInRow, v: string) =>
    setRows(rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));

  const handleSave = () => {
    if (rows.some((r) => !r.category)) { toast.error("Category is required for each item"); return; }
    if (rows.some((r) => !r.name.trim() || !r.qty.trim() || !r.cost.trim())) {
      toast.error("Item Name, Quantity, and Unit Cost are required");
      return;
    }
    toast.success("Item Added!");
    onBack();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2"><Plus className="h-6 w-6 text-emerald-700" />Add Inventory Item</h1>
          <p className="text-muted-foreground">Register newly received materials into the inventory.</p>
        </div>
        <Button variant="outline" onClick={onBack}><ChevronLeft className="h-4 w-4 mr-1" />Back to Inventory Items</Button>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Date Received <span className="text-red-500">*</span></Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Material ID is generated automatically based on the selected Category (FERT / CHEM / FARM / PACK).</p>

          <div className="space-y-2">
            {rows.map((r, i) => {
              const match = seedItems.find((s) => s.active !== false && s.name.toLowerCase() === r.name.trim().toLowerCase());
              const expiryConflict = !!(match && r.expiry.trim() && match.expiry !== "—" && match.expiry !== r.expiry.trim());
              return (
              <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 border rounded-md">
                <div className="md:col-span-3 space-y-1">
                  <Label>Item Name</Label>
                  <Input
                    list={`existing-items-${i}`}
                    value={r.name}
                    onChange={(e) => update(i, "name", e.target.value)}
                    placeholder={r.category ? "Type to search or enter new" : "Select a category first"}
                  />
                  <datalist id={`existing-items-${i}`}>
                    {seedItems
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
                <div className="md:col-span-2 space-y-1">
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
                    <p className="text-xs text-emerald-700">Material ID: {generateMaterialId(r.category, i, rows)}</p>
                  )}
                </div>
                <div className="md:col-span-1 space-y-1">
                  <Label>Qty</Label>
                  <Input value={r.qty} onChange={(e) => update(i, "qty", e.target.value)} placeholder="" />
                </div>
                <div className="md:col-span-1 space-y-1">
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
                <div className="md:col-span-2 space-y-1">
                  <Label>Unit Cost (₱)</Label>
                  <Input value={r.cost} onChange={(e) => update(i, "cost", e.target.value)} placeholder="" />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Label>Expiration Date</Label>
                  <Input type="date" value={r.expiry} onChange={(e) => update(i, "expiry", e.target.value)} />
                </div>
                <div className="md:col-span-1 flex items-end">
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
            <Button variant="outline" onClick={() => setRows([...rows, { name: "", category: "", qty: "", unit: "kg", cost: "", expiry: "", notes: "" }])}>
              <Plus className="h-4 w-4 mr-1" />Add Item Row
            </Button>
          </div>

          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivered in good condition." />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onBack}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave}>Save Item</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReleaseMaterials() {
  const today = new Date().toISOString().slice(0, 10);
  const [type, setType] = useState("credit");
  const slipNo = "RS-2025-0007";

  const banner = {
    credit: { title: "Credit", text: "Material taken now, payment will be recorded as outstanding balance.", bg: "bg-amber-50 border-amber-200 text-amber-800" },
    cash: { title: "Cash Purchase", text: "The material has been fully paid and no outstanding balance will be recorded.", bg: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  }[type] || { title: "", text: "", bg: "" };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2"><ArrowUpCircle className="h-6 w-6 text-emerald-700" />Release Materials</h1>
        <p className="text-muted-foreground">Material released to beneficiaries or for farm use.</p>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Release Slip No. <span className="text-red-500">*</span></Label>
              <Input defaultValue={slipNo} />
            </div>
            <div className="space-y-1">
              <Label>Date Released <span className="text-red-500">*</span></Label>
              <Input type="date" defaultValue={today} />
            </div>
            <div className="space-y-1">
              <Label>Beneficiary / Recipient <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g. Juan Dela Cruz" />
            </div>
            <div className="space-y-1">
              <Label>Material <span className="text-red-500">*</span></Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select an inventory item" /></SelectTrigger>
                <SelectContent>
                  {seedItems
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
              <Input type="number" defaultValue="300" />
            </div>
            <div className="space-y-1">
              <Label>Unit <span className="text-red-500">*</span></Label>
              <Select defaultValue="pcs">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["pcs", "kg", "L", "roll", "pair", "bag"].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Transaction Type <span className="text-red-500">*</span></Label>
            <RadioGroup value={type} onValueChange={setType} className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { v: "credit", t: "Credit", d: "Outstanding balance recorded." },
                { v: "cash", t: "Cash Purchase", d: "Bought and paid by beneficiary." },
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

          <div className="space-y-1">
            <Label>Purpose / Use</Label>
            <Input placeholder="e.g. Covering banana bunches for pest and sun protection." />
          </div>

          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea placeholder="Release for Block 12 — Weekly operations." />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline">Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => toast.success("Release saved")}>Save Release</Button>
          </div>

          <div className={`p-3 border rounded-md ${banner.bg}`}>
            This is a <strong>{banner.title}</strong>. {banner.text}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface CreditRow {
  receipt: string; date: string; beneficiary: string; material: string;
  qty: number; unit: string; unitCost: number;
  amount: number; status: string; remaining: number; slip: string;
}

const credits: CreditRow[] = [
  { receipt: "CR-2025-0007", date: "May 18, 2025", beneficiary: "Juan Dela Cruz", material: "Complete Fertilizer", qty: 40, unit: "kg", unitCost: 50.0, amount: 2000, status: "Partially Deducted", remaining: 1200, slip: "PB-2025-05" },
  { receipt: "CR-2025-0008", date: "May 19, 2025", beneficiary: "Maria Santos", material: "Urea Fertilizer", qty: 28, unit: "kg", unitCost: 46.43, amount: 1300, status: "Pending", remaining: 1300, slip: "—" },
  { receipt: "CR-2025-0009", date: "May 19, 2025", beneficiary: "Pedro Garcia", material: "Insecticide (Chlorpyrifos)", qty: 2, unit: "L", unitCost: 650.0, amount: 1300, status: "Deducted", remaining: 0, slip: "PB-2025-05" },
  { receipt: "CR-2025-0010", date: "May 20, 2025", beneficiary: "Rosa Mendoza", material: "Banana Bags (Blue)", qty: 60, unit: "pcs", unitCost: 12.5, amount: 750, status: "Partially Deducted", remaining: 300, slip: "PB-2025-05" },
  { receipt: "CR-2025-0011", date: "May 20, 2025", beneficiary: "Jose Reyes", material: "Cardboard Boxes", qty: 50, unit: "pcs", unitCost: 32.0, amount: 1600, status: "Pending", remaining: 1600, slip: "—" },
];

function CreditTransactions() {
  const total = credits.reduce((s, c) => s + c.remaining, 0);
  const [view, setView] = useState<CreditRow | null>(null);

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
              {credits.map((c, i) => (
                <TableRow key={i}>
                  <TableCell>{c.beneficiary}</TableCell>
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
                    <button
                      title="View Receipt"
                      className="p-1.5 rounded bg-sky-100 text-sky-700 hover:bg-sky-200"
                      onClick={() => setView(c)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
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
            <Button variant="link" className="text-emerald-700">View full credit ledger →</Button>
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}

const stockHistory = [
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

const TXN_TYPES = ["Stock In", "Direct Release", "Credit Issued", "Borrowed Material", "Adjustment", "Stock Out — Expired", "Returned Material"];

function StockHistory() {
  const [from, setFrom] = useState("2025-05-01");
  const [to, setTo] = useState("2025-05-20");
  const [type, setType] = useState("all");
  const [material, setMaterial] = useState("all");

  const materialOptions = Array.from(new Set(stockHistory.map((r) => r.material))).sort();

  const filtered = stockHistory.filter((r) => {
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
                <TableHead>Date & Time</TableHead><TableHead>Material</TableHead>
                <TableHead>Transaction Type</TableHead><TableHead>Qty (+/-)</TableHead>
                <TableHead>Reason / Details</TableHead><TableHead>Bookkeeper Account</TableHead>
                <TableHead>Reference No.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                    No inventory transactions found for the selected filters.
                  </TableCell>
                </TableRow>
              ) : filtered.map((r, i) => (
                <TableRow key={i}>
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
                  <TableCell className={r.qty > 0 ? "text-emerald-700" : "text-red-600"}>
                    {r.qty > 0 ? `+${r.qty}` : r.qty} {r.unit}
                  </TableCell>
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

function RestockRequests({ user }: { user: User }) {
  const [openCreate, setOpenCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewing, setViewing] = useState<RestockRequest | null>(null);
  const [cancelling, setCancelling] = useState<RestockRequest | null>(null);
  const [requests, setRequests] = useState<RestockRequest[]>([
    { id: "RR-2025-001", dateRequested: "May 20, 2025", material: "Urea Fertilizer", category: "Fertilizers and Soil Inputs", current: 40, requested: 100, reason: "Below minimum stock level", requestedBy: user.name, status: "Pending", priority: "Normal", notes: "" },
    { id: "RR-2025-002", dateRequested: "May 19, 2025", material: "Banana Bags (Blue)", category: "Packaging Materials", current: 80, requested: 150, reason: "High demand this month", requestedBy: user.name, status: "Approved", priority: "Normal", notes: "" },
  ]);

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
