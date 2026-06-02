import React, { useState } from "react";
import { DarbcoLayout } from "../darbco-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import {
  LayoutDashboard, Package, Boxes, Users, TrendingUp, Plus, Search,
  CheckCircle2, Edit, Trash2, ChevronLeft, ChevronRight, FileText,
  Save, FileBarChart2, ClipboardList, ArrowRight, Calendar,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { User } from "../types";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area,
  PieChart, Pie, Cell, CartesianGrid,
} from "recharts";

interface Props { user: User; onLogout: () => void }

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "production", label: "Production", icon: <Package className="h-4 w-4" /> },
];

const dailyProduction = [
  { d: "Sep 1", v: 18 }, { d: "Sep 5", v: 22 }, { d: "Sep 10", v: 35 },
  { d: "Sep 15", v: 42 }, { d: "Sep 20", v: 58 }, { d: "Sep 25", v: 73 }, { d: "Sep 30", v: 86 },
];
const monthlyOverview = [
  { m: "Jan", v: 1100 }, { m: "Feb", v: 1320 }, { m: "Mar", v: 980 },
  { m: "Apr", v: 1610 }, { m: "May", v: 1820 }, { m: "Jun", v: 2050 },
  { m: "Jul", v: 2240 }, { m: "Aug", v: 1990 }, { m: "Sep", v: 2410 },
];
const breakdown = [
  { name: "Class A", value: 612, color: "#10b981" },
  { name: "Class B", value: 384, color: "#f59e0b" },
  { name: "Special Product", value: 252, color: "#6366f1" },
];
const harvestBuligs = [
  { age: "11 weeks", v: 1840, pct: 32 },
  { age: "12 weeks", v: 2210, pct: 39 },
  { age: "13 weeks", v: 1180, pct: 21 },
  { age: "14 weeks", v: 460, pct: 8 },
];
const beneficiariesToday = [
  { name: "SALUDEZ LISA", boxes: 86 },
  { name: "Daniel Cruz", boxes: 64 },
  { name: "Marco Castillo", boxes: 58 },
  { name: "Jeanito Reyes", boxes: 47 },
  { name: "Vivian Farms", boxes: 39 },
];
const quality = [
  { age: "11 weeks", defects: 4, rejects: 2 },
  { age: "12 weeks", defects: 6, rejects: 5 },
  { age: "13 weeks", defects: 9, rejects: 7 },
  { age: "14 weeks", defects: 12, rejects: 10 },
];

const harvestRecords = [
  { id: 1, date: "May 30, 2026", beneficiary: "SALUDEZ LISA", harvester: "Daniel Cruz", w11: 4, w12: 6, w13: 5, w14: 1, total: 16 },
  { id: 2, date: "May 30, 2026", beneficiary: "Marco Castillo", harvester: "Jeanito Reyes", w11: 2, w12: 4, w13: 3, w14: 0, total: 9 },
  { id: 3, date: "May 30, 2026", beneficiary: "Manny Dela Cruz", harvester: "Vivian Farms", w11: 1, w12: 3, w13: 4, w14: 0, total: 8 },
];

const productionRecords = [
  { id: 1, date: "May 30, 2026", beneficiary: "SALUDEZ LISA", classA_big: 45, classA_small: 30, classA_cp: 12, classB_big: 20, classB_small: 15, classB_cp: 8, special: 5, defects_11: 2, defects_12: 3, defects_13: 1, defects_14: 0, rejects_11: 1, rejects_12: 2, rejects_13: 1, rejects_14: 1 },
];

type HarvestRecord = typeof harvestRecords[number];
type ProductionRecord = typeof productionRecords[number];

export function ProductionClerkDashboard({ user, onLogout }: Props) {
  const [active, setActive] = useState("dashboard");
  const [prodTab, setProdTab] = useState("harvest");

  const goToTab = (tab: string) => {
    setProdTab(tab);
    setActive("production");
  };

  return (
    <DarbcoLayout user={user} onLogout={onLogout} navItems={NAV} active={active} onChange={setActive}>
      {active === "dashboard" && <Dashboard goToTab={goToTab} />}
      {active === "production" && <ProductionRecords tab={prodTab} setTab={setProdTab} />}
    </DarbcoLayout>
  );
}

function Dashboard({ goToTab }: { goToTab: (tab: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2"><LayoutDashboard className="h-6 w-6 text-emerald-700" />Production Clerk Dashboard</h1>
        </div>
        <div className="text-muted-foreground">May 30, 2026</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard icon={<Package />} color="emerald" label="Boxes Today" value="1,248" delta="+8.2% vs yesterday" onClick={() => goToTab("production")} />
        <KpiCard icon={<Users />} color="sky" label="Total Beneficiaries" value="42" delta="active today" onClick={() => goToTab("harvest")} />
        <KpiCard icon={<Boxes />} color="amber" label="Total Boxes This Month" value="25,624" delta="+12.4% vs last month" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-base">Daily Production (Boxes)</CardTitle>
            <Select defaultValue="7d"><SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="7d">Last 7 days</SelectItem><SelectItem value="30d">Last 30 days</SelectItem></SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer><AreaChart data={dailyProduction}>
              <defs><linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="d" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip />
              <Area type="monotone" dataKey="v" stroke="#059669" fill="url(#g1)" strokeWidth={2} />
            </AreaChart></ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Monthly Overview (Sep 2026)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer><LineChart data={monthlyOverview}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="m" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip />
              <Line type="monotone" dataKey="v" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart></ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Boxes by Classification</CardTitle></CardHeader>
          <CardContent className="h-56 flex items-center">
            <div className="w-full">
              <ResponsiveContainer width="100%" height={160}><PieChart>
                <Pie data={breakdown} dataKey="value" cx="50%" cy="50%" outerRadius={60} label={(e) => `${e.name}: ${e.value}`}>
                  {breakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
              </PieChart></ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Harvest by Age (Buligs)</CardTitle></CardHeader>
          <CardContent className="space-y-2 pt-2">
            {harvestBuligs.map((b, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{b.age}</span>
                  <span className="font-medium">{b.v.toLocaleString()} <span className="text-emerald-600 text-xs">({b.pct}%)</span></span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${b.pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Quality Analysis (by Age)</CardTitle></CardHeader>
          <CardContent className="space-y-2 pt-2">
            {quality.map((q, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{q.age}</span>
                <div className="flex gap-3">
                  <span className="text-amber-600 font-medium">Defects: {q.defects}</span>
                  <span className="text-red-600 font-medium">Rejects: {q.rejects}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-emerald-700" />Top Beneficiaries Today</CardTitle>
          <Button variant="link" className="text-emerald-700" onClick={() => goToTab("harvest")}>View All →</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead><TableHead>Beneficiary</TableHead><TableHead className="text-right">Boxes Produced</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {beneficiariesToday.map((b, i) => (
                <TableRow key={i}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="text-right"><strong className="text-emerald-700">{b.boxes}</strong></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ icon, color, label, value, delta, onClick }: any) {
  const bgColor = color === "emerald" ? "bg-emerald-100" : color === "sky" ? "bg-sky-100" : "bg-amber-100";
  const textColor = color === "emerald" ? "text-emerald-700" : color === "sky" ? "text-sky-700" : "text-amber-700";
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-5 flex items-center gap-3">
        <div className={`h-12 w-12 rounded-full ${bgColor} ${textColor} flex items-center justify-center`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="text-muted-foreground text-xs">{label}</div>
          <div className="text-2xl font-semibold">{value}</div>
          <div className="text-xs text-muted-foreground">{delta}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProductionRecords({ tab, setTab }: { tab: string; setTab: (t: string) => void }) {
  const [openHarvest, setOpenHarvest] = useState(false);
  const [openProduction, setOpenProduction] = useState(false);
  const [harvestData, setHarvestData] = useState<HarvestRecord[]>(harvestRecords);
  const [productionData, setProductionData] = useState<ProductionRecord[]>(productionRecords);
  const [editingHarvest, setEditingHarvest] = useState<HarvestRecord | null>(null);
  const [editingProduction, setEditingProduction] = useState<ProductionRecord | null>(null);

  const buttonLabel = tab === "harvest" ? "New Harvest Record" : "New Production Record";

  const onNew = () => {
    if (tab === "harvest") setOpenHarvest(true);
    else if (tab === "production") setOpenProduction(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2"><Package className="h-6 w-6 text-emerald-700" />Production Records</h1>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={onNew}>
          <Plus className="h-4 w-4 mr-1" />{buttonLabel}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-white border w-full justify-start h-auto flex-wrap p-1">
          <TabsTrigger value="harvest" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <CheckCircle2 className="h-4 w-4 mr-1" />Harvest Records
          </TabsTrigger>
          <TabsTrigger value="production" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Boxes className="h-4 w-4 mr-1" />Production Boxes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="harvest">
          <HarvestRecordsPanel
            records={harvestData}
            onEdit={setEditingHarvest}
            onDelete={(record) => {
              setHarvestData((current) => current.filter((item) => item.id !== record.id));
              toast.success("Harvest record deleted");
            }}
          />
        </TabsContent>
        <TabsContent value="production">
          <ProductionBoxesPanel
            records={productionData}
            onEdit={setEditingProduction}
            onDelete={(record) => {
              setProductionData((current) => current.filter((item) => item.id !== record.id));
              toast.success("Production record deleted");
            }}
          />
        </TabsContent>
      </Tabs>

      <HarvestDialog
        open={openHarvest}
        onOpenChange={setOpenHarvest}
        onSave={(record) => {
          setHarvestData((current) => [{ ...record, id: nextId(current) }, ...current]);
          toast.success("Harvest record saved");
        }}
      />
      <HarvestDialog
        open={!!editingHarvest}
        record={editingHarvest}
        onOpenChange={(open) => !open && setEditingHarvest(null)}
        onSave={(record) => {
          setHarvestData((current) => current.map((item) => item.id === record.id ? record : item));
          setEditingHarvest(null);
          toast.success("Harvest record updated");
        }}
      />
      <ProductionBoxesDialog
        open={openProduction}
        onOpenChange={setOpenProduction}
        beneficiaryOptions={harvestData.map((record) => record.beneficiary)}
        onSave={(record) => {
          setProductionData((current) => [{ ...record, id: nextId(current) }, ...current]);
          toast.success("Production record saved");
        }}
      />
      <ProductionBoxesDialog
        open={!!editingProduction}
        record={editingProduction}
        beneficiaryOptions={harvestData.map((record) => record.beneficiary)}
        onOpenChange={(open) => !open && setEditingProduction(null)}
        onSave={(record) => {
          setProductionData((current) => current.map((item) => item.id === record.id ? record : item));
          setEditingProduction(null);
          toast.success("Production record updated");
        }}
      />
    </div>
  );
}

function HarvestRecordsPanel({ records, onEdit, onDelete }: {
  records: HarvestRecord[];
  onEdit: (record: HarvestRecord) => void;
  onDelete: (record: HarvestRecord) => void;
}) {
  return (
    <Card className="mt-3">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
          <FileText className="h-4 w-4" />Harvest Records
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TableToolbar />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Harvest Date</TableHead>
              <TableHead>Beneficiary</TableHead>
              <TableHead>Harvester</TableHead>
              <TableHead className="text-center">11 weeks</TableHead>
              <TableHead className="text-center">12 weeks</TableHead>
              <TableHead className="text-center">13 weeks</TableHead>
              <TableHead className="text-center">14 weeks</TableHead>
              <TableHead className="text-center">Total Buligs</TableHead>
              <TableHead className="w-[88px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.date}</TableCell>
                <TableCell className="font-medium">{r.beneficiary}</TableCell>
                <TableCell>{r.harvester}</TableCell>
                <TableCell className="text-center">{r.w11}</TableCell>
                <TableCell className="text-center">{r.w12}</TableCell>
                <TableCell className="text-center">{r.w13}</TableCell>
                <TableCell className="text-center">{r.w14}</TableCell>
                <TableCell className="text-center"><strong>{r.total}</strong></TableCell>
                <TableCell className="w-[88px]">
                  <ActionCell onEdit={() => onEdit(r)} onDelete={() => onDelete(r)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pager />
      </CardContent>
    </Card>
  );
}

function ProductionBoxesPanel({ records, onEdit, onDelete }: {
  records: ProductionRecord[];
  onEdit: (record: ProductionRecord) => void;
  onDelete: (record: ProductionRecord) => void;
}) {
  return (
    <Card className="mt-3">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
          <Boxes className="h-4 w-4" />Production Boxes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TableToolbar />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead rowSpan={2}>Date</TableHead>
                <TableHead rowSpan={2}>Beneficiary Name</TableHead>
                <TableHead colSpan={3} className="text-center border-r">Class A Boxes</TableHead>
                <TableHead colSpan={3} className="text-center border-r">Class B Boxes</TableHead>
                <TableHead rowSpan={2} className="text-center border-r">Special Product</TableHead>
                <TableHead colSpan={4} className="text-center border-r">Defects (by age)</TableHead>
                <TableHead colSpan={4} className="text-center border-r">Rejects (by age)</TableHead>
                <TableHead rowSpan={2} className="w-[88px] text-center">Actions</TableHead>
              </TableRow>
              <TableRow className="text-xs text-muted-foreground">
                <TableHead className="text-center">Big Hands</TableHead>
                <TableHead className="text-center">Small Hands</TableHead>
                <TableHead className="text-center border-r">CPs</TableHead>
                <TableHead className="text-center">Big Hands</TableHead>
                <TableHead className="text-center">Small Hands</TableHead>
                <TableHead className="text-center border-r">CPs</TableHead>
                <TableHead className="text-center">11w</TableHead>
                <TableHead className="text-center">12w</TableHead>
                <TableHead className="text-center">13w</TableHead>
                <TableHead className="text-center border-r">14w</TableHead>
                <TableHead className="text-center">11w</TableHead>
                <TableHead className="text-center">12w</TableHead>
                <TableHead className="text-center">13w</TableHead>
                <TableHead className="text-center border-r">14w</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.date}</TableCell>
                  <TableCell className="font-medium">{r.beneficiary}</TableCell>
                  <TableCell className="text-center">{r.classA_big}</TableCell>
                  <TableCell className="text-center">{r.classA_small}</TableCell>
                  <TableCell className="text-center border-r">{r.classA_cp}</TableCell>
                  <TableCell className="text-center">{r.classB_big}</TableCell>
                  <TableCell className="text-center">{r.classB_small}</TableCell>
                  <TableCell className="text-center border-r">{r.classB_cp}</TableCell>
                  <TableCell className="text-center border-r"><strong>{r.special}</strong></TableCell>
                  <TableCell className="text-center text-amber-600">{r.defects_11}</TableCell>
                  <TableCell className="text-center text-amber-600">{r.defects_12}</TableCell>
                  <TableCell className="text-center text-amber-600">{r.defects_13}</TableCell>
                  <TableCell className="text-center text-amber-600 border-r">{r.defects_14}</TableCell>
                  <TableCell className="text-center text-red-600">{r.rejects_11}</TableCell>
                  <TableCell className="text-center text-red-600">{r.rejects_12}</TableCell>
                  <TableCell className="text-center text-red-600">{r.rejects_13}</TableCell>
                  <TableCell className="text-center text-red-600 border-r">{r.rejects_14}</TableCell>
                  <TableCell className="w-[88px]">
                    <ActionCell onEdit={() => onEdit(r)} onDelete={() => onDelete(r)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Pager />
      </CardContent>
    </Card>
  );
}

function TableToolbar() {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2 text-sm">
        Show
        <Select defaultValue="10"><SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
          <SelectContent>{["10", "25", "50"].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
        </Select>
        entries
      </div>
      <div className="relative">
        <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
        <Input placeholder="Search records..." className="pl-8 w-64 h-9" />
      </div>
    </div>
  );
}

function Pager() {
  return (
    <div className="flex items-center justify-between mt-3">
      <span className="text-muted-foreground text-sm">Showing 1 to 5 of 5 entries</span>
      <div className="flex gap-1">
        <Button variant="outline" size="sm" className="h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></Button>
        <Button size="sm" className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700">1</Button>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0"><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function ActionCell({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-center gap-1 whitespace-nowrap">
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded bg-amber-100 text-amber-700 hover:bg-amber-200"
        title="Edit"
        aria-label="Edit record"
      >
        <Edit className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded bg-red-100 text-red-700 hover:bg-red-200"
        title="Delete"
        aria-label="Delete record"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function nextId<T extends { id: number }>(records: T[]) {
  return records.length ? Math.max(...records.map((record) => record.id)) + 1 : 1;
}

function formatDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function parseDateInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function HarvestDialog({ open, onOpenChange, record, onSave }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: HarvestRecord | null;
  onSave: (record: HarvestRecord) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<HarvestRecord>({
    id: record?.id ?? 0,
    date: record?.date ?? formatDateLabel(today),
    beneficiary: record?.beneficiary ?? "",
    harvester: record?.harvester ?? "",
    w11: record?.w11 ?? 0,
    w12: record?.w12 ?? 0,
    w13: record?.w13 ?? 0,
    w14: record?.w14 ?? 0,
    total: record?.total ?? 0,
  });

  React.useEffect(() => {
    if (!open) return;
    setForm({
      id: record?.id ?? 0,
      date: record?.date ?? formatDateLabel(today),
      beneficiary: record?.beneficiary ?? "",
      harvester: record?.harvester ?? "",
      w11: record?.w11 ?? 0,
      w12: record?.w12 ?? 0,
      w13: record?.w13 ?? 0,
      w14: record?.w14 ?? 0,
      total: record?.total ?? 0,
    });
  }, [open, record]);

  const updateCount = (key: "w11" | "w12" | "w13" | "w14", value: string) => {
    const next = { ...form, [key]: Math.max(0, Number(value) || 0) };
    next.total = next.w11 + next.w12 + next.w13 + next.w14;
    setForm(next);
  };

  const submit = () => {
    if (!form.beneficiary.trim() || !form.harvester.trim()) {
      toast.error("Beneficiary and harvester are required");
      return;
    }
    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700">
            <Plus className="h-5 w-5" />{record ? "Edit Harvest Record" : "New Harvest Record"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Harvest Date <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input
                  type="date"
                  value={parseDateInput(form.date)}
                  onChange={(e) => setForm({ ...form, date: formatDateLabel(e.target.value) })}
                  className="h-9 w-full cursor-pointer bg-muted/50 px-3 pr-10 [color-scheme:light] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
                />
                <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-700" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Beneficiary Name <span className="text-red-500">*</span></Label>
              <Input value={form.beneficiary} onChange={(e) => setForm({ ...form, beneficiary: e.target.value })} placeholder="e.g. Juan Dela Cruz" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Harvester Name <span className="text-red-500">*</span></Label>
              <Input value={form.harvester} onChange={(e) => setForm({ ...form, harvester: e.target.value })} placeholder="e.g. Daniel Cruz" />
            </div>
          </div>

          <div className="border rounded-md p-4 space-y-3 bg-slate-50">
            <Label className="text-base">Number of Buligs by Age</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">11 weeks</Label>
                <Input type="number" value={form.w11} onChange={(e) => updateCount("w11", e.target.value)} placeholder="0" className="bg-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">12 weeks</Label>
                <Input type="number" value={form.w12} onChange={(e) => updateCount("w12", e.target.value)} placeholder="0" className="bg-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">13 weeks</Label>
                <Input type="number" value={form.w13} onChange={(e) => updateCount("w13", e.target.value)} placeholder="0" className="bg-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">14 weeks</Label>
                <Input type="number" value={form.w14} onChange={(e) => updateCount("w14", e.target.value)} placeholder="0" className="bg-white" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={submit}>
              <Save className="h-4 w-4 mr-1" />Save Record
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProductionBoxesDialog({ open, onOpenChange, record, beneficiaryOptions, onSave }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: ProductionRecord | null;
  beneficiaryOptions: string[];
  onSave: (record: ProductionRecord) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const uniqueBeneficiaries = Array.from(new Set(beneficiaryOptions.filter(Boolean)));
  const blank = (): ProductionRecord => ({
    id: record?.id ?? 0,
    date: record?.date ?? formatDateLabel(today),
    beneficiary: record?.beneficiary ?? uniqueBeneficiaries[0] ?? "",
    classA_big: record?.classA_big ?? 0,
    classA_small: record?.classA_small ?? 0,
    classA_cp: record?.classA_cp ?? 0,
    classB_big: record?.classB_big ?? 0,
    classB_small: record?.classB_small ?? 0,
    classB_cp: record?.classB_cp ?? 0,
    special: record?.special ?? 0,
    defects_11: record?.defects_11 ?? 0,
    defects_12: record?.defects_12 ?? 0,
    defects_13: record?.defects_13 ?? 0,
    defects_14: record?.defects_14 ?? 0,
    rejects_11: record?.rejects_11 ?? 0,
    rejects_12: record?.rejects_12 ?? 0,
    rejects_13: record?.rejects_13 ?? 0,
    rejects_14: record?.rejects_14 ?? 0,
  });
  const [form, setForm] = useState<ProductionRecord>(blank);

  React.useEffect(() => {
    if (open) setForm(blank());
  }, [open, record]);

  const setNumber = (key: keyof ProductionRecord, value: string) => {
    setForm({ ...form, [key]: Math.max(0, Number(value) || 0) });
  };

  const submit = () => {
    if (!form.beneficiary.trim()) {
      toast.error("Beneficiary name is required");
      return;
    }

    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700">
            <Plus className="h-5 w-5" />{record ? "Edit Production Boxes Record" : "New Production Boxes Record"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Harvest Beneficiary <span className="text-red-500">*</span></Label>
              <Select value={form.beneficiary} onValueChange={(value) => setForm({ ...form, beneficiary: value })}>
                <SelectTrigger className="h-9 w-full bg-muted/50 px-3">
                  <SelectValue placeholder="Select beneficiary from harvest records" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueBeneficiaries.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Production Date <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input
                  type="date"
                  value={parseDateInput(form.date)}
                  onChange={(e) => setForm({ ...form, date: formatDateLabel(e.target.value) })}
                  className="h-9 w-full cursor-pointer bg-muted/50 px-3 pr-10 [color-scheme:light] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
                />
                <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-700" />
              </div>
            </div>
          </div>

          <div className="border rounded-md p-4 space-y-3 bg-emerald-50">
            <Label className="text-base text-emerald-700">Class A Boxes</Label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Big Hands</Label>
                <Input type="number" value={form.classA_big} onChange={(e) => setNumber("classA_big", e.target.value)} placeholder="0" className="bg-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Small Hands</Label>
                <Input type="number" value={form.classA_small} onChange={(e) => setNumber("classA_small", e.target.value)} placeholder="0" className="bg-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">CPs</Label>
                <Input type="number" value={form.classA_cp} onChange={(e) => setNumber("classA_cp", e.target.value)} placeholder="0" className="bg-white" />
              </div>
            </div>
          </div>

          <div className="border rounded-md p-4 space-y-3 bg-amber-50">
            <Label className="text-base text-amber-700">Class B Boxes</Label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Big Hands</Label>
                <Input type="number" value={form.classB_big} onChange={(e) => setNumber("classB_big", e.target.value)} placeholder="0" className="bg-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Small Hands</Label>
                <Input type="number" value={form.classB_small} onChange={(e) => setNumber("classB_small", e.target.value)} placeholder="0" className="bg-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">CPs</Label>
                <Input type="number" value={form.classB_cp} onChange={(e) => setNumber("classB_cp", e.target.value)} placeholder="0" className="bg-white" />
              </div>
            </div>
          </div>

          <div className="border rounded-md p-4 space-y-3 bg-violet-50">
            <Label className="text-base text-violet-700">Special Product</Label>
            <div className="space-y-1">
              <Label className="text-sm">Total Boxes / Quantity</Label>
              <Input type="number" value={form.special} onChange={(e) => setNumber("special", e.target.value)} placeholder="0" className="bg-white" />
            </div>
          </div>

          <div className="border rounded-md p-4 space-y-3 bg-orange-50">
            <Label className="text-base text-orange-700">Defects (by age)</Label>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">11 weeks</Label>
                <Input type="number" value={form.defects_11} onChange={(e) => setNumber("defects_11", e.target.value)} placeholder="0" className="bg-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">12 weeks</Label>
                <Input type="number" value={form.defects_12} onChange={(e) => setNumber("defects_12", e.target.value)} placeholder="0" className="bg-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">13 weeks</Label>
                <Input type="number" value={form.defects_13} onChange={(e) => setNumber("defects_13", e.target.value)} placeholder="0" className="bg-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">14 weeks</Label>
                <Input type="number" value={form.defects_14} onChange={(e) => setNumber("defects_14", e.target.value)} placeholder="0" className="bg-white" />
              </div>
            </div>
          </div>

          <div className="border rounded-md p-4 space-y-3 bg-red-50">
            <Label className="text-base text-red-700">Rejects (by age)</Label>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">11 weeks</Label>
                <Input type="number" value={form.rejects_11} onChange={(e) => setNumber("rejects_11", e.target.value)} placeholder="0" className="bg-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">12 weeks</Label>
                <Input type="number" value={form.rejects_12} onChange={(e) => setNumber("rejects_12", e.target.value)} placeholder="0" className="bg-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">13 weeks</Label>
                <Input type="number" value={form.rejects_13} onChange={(e) => setNumber("rejects_13", e.target.value)} placeholder="0" className="bg-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">14 weeks</Label>
                <Input type="number" value={form.rejects_14} onChange={(e) => setNumber("rejects_14", e.target.value)} placeholder="0" className="bg-white" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={submit}>
              <Save className="h-4 w-4 mr-1" />Save Record
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
