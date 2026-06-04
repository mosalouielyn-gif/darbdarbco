import React, { useState } from "react";
import { DarbcoLayout } from "../darbco-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { DateInput } from "../ui/date-input";
import {
  LayoutDashboard, Package, Boxes, Users, TrendingUp, Plus, Search,
  CheckCircle2, Edit, Trash2, ChevronLeft, ChevronRight, FileText,
  Save, FileBarChart2, ClipboardList, ArrowRight, Loader2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { User } from "../types";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area,
  PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import {
  createProductionBoxRecord,
  createHarvestRecord,
  deleteHarvestRecord,
  deleteProductionBoxRecord,
  fetchProductionBoxRecords,
  fetchHarvestRecords,
  HarvestRecordInput,
  ProductionBoxRecordInput,
  updateProductionBoxRecord,
  updateHarvestRecord,
} from "../../lib/api";
import { useAppData } from "../../lib/app-data-context";
import { addDaysSystemDate, formatSystemDate, todaySystemDate } from "../../lib/date-time";
import { usePersistentState } from "../../lib/use-persistent-state";

interface Props { user: User; onLogout: () => void }

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "production", label: "Production", icon: <Package className="h-4 w-4" /> },
];

const dailyProduction: { d: string; v: number }[] = [];
const monthlyOverview: { m: string; v: number }[] = [];
const breakdown: { name: string; value: number; color: string }[] = [];
const harvestBuligs: { age: string; v: number; pct: number }[] = [];
const beneficiariesToday: { name: string; boxes: number }[] = [];
const quality: { age: string; defects: number; rejects: number }[] = [];

const harvestRecords: HarvestRecord[] = [];

const productionRecords: ProductionRecord[] = [];

interface HarvestRecord {
  id: number;
  date: string;
  beneficiary: string;
  harvester: string;
  w11: number;
  w12: number;
  w13: number;
  w14: number;
  total: number;
}
type ProductionRecord = typeof productionRecords[number];

export function ProductionClerkDashboard({ user, onLogout }: Props) {
  const { data } = useAppData();
  const [active, setActive] = usePersistentState("darbco.productionClerk.active", "dashboard");
  const [prodTab, setProdTab] = usePersistentState("darbco.productionClerk.productionTab", "harvest");
  const harvestData = (data?.harvestRecords ?? []).map(mapHarvestRecord);
  const productionData = (data?.productionRecords ?? []).map(mapProductionRecord);
  const beneficiariesCount = data?.beneficiaries?.length ?? 0;

  const goToTab = (tab: string) => {
    setProdTab(tab);
    setActive("production");
  };

  return (
    <DarbcoLayout user={user} onLogout={onLogout} navItems={NAV} active={active} onChange={setActive}>
      {active === "dashboard" && <Dashboard goToTab={goToTab} productionData={productionData} harvestData={harvestData} beneficiariesCount={beneficiariesCount} />}
      {active === "production" && <ProductionRecords tab={prodTab} setTab={setProdTab} user={user} />}
    </DarbcoLayout>
  );
}

function Dashboard({ goToTab, productionData, harvestData, beneficiariesCount }: {
  goToTab: (tab: string) => void;
  productionData: ProductionRecord[];
  harvestData: HarvestRecord[];
  beneficiariesCount: number;
}) {
  const metrics = getDashboardMetrics(productionData, harvestData, beneficiariesCount);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2"><LayoutDashboard className="h-6 w-6 text-emerald-700" />Production Clerk Dashboard</h1>
        </div>
        <div className="text-muted-foreground">{formatSystemDate()}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard icon={<Package />} color="emerald" label="Boxes Today" value={metrics.boxesToday.toLocaleString()} delta={metrics.boxesTodayDelta} onClick={() => goToTab("production")} />
        <KpiCard icon={<Users />} color="sky" label="Total Beneficiaries" value={metrics.totalBeneficiaries.toLocaleString()} delta={`${metrics.activeToday.toLocaleString()} active today`} onClick={() => goToTab("harvest")} />
        <KpiCard icon={<Boxes />} color="amber" label="Total Boxes This Month" value={metrics.boxesThisMonth.toLocaleString()} delta={metrics.monthDelta} />
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
        <CardHeader className="pb-2">
          <div className="flex w-full items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-emerald-700" />Top Beneficiaries Today</CardTitle>
            <Button variant="link" className="shrink-0 px-0 text-emerald-700" onClick={() => goToTab("harvest")}>View All →</Button>
          </div>
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

function getDashboardMetrics(productionData: ProductionRecord[], harvestData: HarvestRecord[], beneficiariesCount: number) {
  const today = todaySystemDate();
  const yesterday = addDaysSystemDate(today, -1);
  const currentMonth = today.slice(0, 7);
  const lastMonth = previousMonthKey(currentMonth);

  const boxesToday = sumProductionBoxes(productionData.filter((record) => record.date === today));
  const boxesYesterday = sumProductionBoxes(productionData.filter((record) => record.date === yesterday));
  const boxesThisMonth = sumProductionBoxes(productionData.filter((record) => record.date.slice(0, 7) === currentMonth));
  const boxesLastMonth = sumProductionBoxes(productionData.filter((record) => record.date.slice(0, 7) === lastMonth));
  const activeToday = new Set([
    ...productionData.filter((record) => record.date === today).map((record) => record.beneficiary).filter(Boolean),
    ...harvestData.filter((record) => record.date === today).map((record) => record.beneficiary).filter(Boolean),
  ]).size;

  return {
    boxesToday,
    boxesTodayDelta: comparisonLabel(boxesToday, boxesYesterday, "vs yesterday"),
    totalBeneficiaries: beneficiariesCount || new Set(harvestData.map((record) => record.beneficiary).filter(Boolean)).size,
    activeToday,
    boxesThisMonth,
    monthDelta: comparisonLabel(boxesThisMonth, boxesLastMonth, "vs last month"),
  };
}

function sumProductionBoxes(records: ProductionRecord[]) {
  return records.reduce((sum, record) => sum + totalProductionBoxes(record), 0);
}

function totalProductionBoxes(record: ProductionRecord) {
  return record.classA_big + record.classA_small + record.classA_cp + record.classB_big + record.classB_small + record.classB_cp + record.special;
}

function comparisonLabel(current: number, previous: number, label: string) {
  if (previous <= 0) return current > 0 ? `New ${label}` : `0 ${label}`;
  const percent = ((current - previous) / previous) * 100;
  const sign = percent > 0 ? "+" : "";
  return `${sign}${percent.toFixed(1)}% ${label}`;
}

function previousMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const previous = new Date(year, month - 2, 1);
  return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, "0")}`;
}

function ProductionRecords({ tab, setTab, user }: { tab: string; setTab: (t: string) => void; user: User }) {
  const [openHarvest, setOpenHarvest] = useState(false);
  const [openProduction, setOpenProduction] = useState(false);
  const [harvestData, setHarvestData] = useState<HarvestRecord[]>(harvestRecords);
  const [productionData, setProductionData] = useState<ProductionRecord[]>(productionRecords);
  const [editingHarvest, setEditingHarvest] = useState<HarvestRecord | null>(null);
  const [editingProduction, setEditingProduction] = useState<ProductionRecord | null>(null);
  const [deletingHarvest, setDeletingHarvest] = useState<HarvestRecord | null>(null);
  const [deletingProduction, setDeletingProduction] = useState<ProductionRecord | null>(null);
  const [loadingHarvest, setLoadingHarvest] = useState(false);
  const [loadingProduction, setLoadingProduction] = useState(false);
  const [deletingHarvestBusy, setDeletingHarvestBusy] = useState(false);
  const [deletingProductionBusy, setDeletingProductionBusy] = useState(false);

  const buttonLabel = tab === "harvest" ? "New Harvest Record" : "New Production Record";

  React.useEffect(() => {
    let active = true;
    setLoadingHarvest(true);
    setLoadingProduction(true);

    Promise.allSettled([fetchHarvestRecords(), fetchProductionBoxRecords()])
      .then(([harvestResult, productionResult]) => {
        if (!active) return;

        if (harvestResult.status === "fulfilled") {
          setHarvestData(harvestResult.value.map(mapHarvestRecord));
        } else {
          toast.error(harvestResult.reason instanceof Error ? harvestResult.reason.message : "Unable to load harvest records.");
        }

        if (productionResult.status === "fulfilled") {
          setProductionData(productionResult.value.map(mapProductionRecord));
        } else {
          toast.error(productionResult.reason instanceof Error ? productionResult.reason.message : "Unable to load production box records.");
        }
      })
      .finally(() => {
        if (active) {
          setLoadingHarvest(false);
          setLoadingProduction(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const onNew = () => {
    if (tab === "harvest") setOpenHarvest(true);
    else if (tab === "production") setOpenProduction(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-2"><Package className="h-6 w-6 text-emerald-700" />Production Records</h1>
        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 sm:w-auto" onClick={onNew}>
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
            loading={loadingHarvest}
            onEdit={setEditingHarvest}
            onDelete={setDeletingHarvest}
          />
        </TabsContent>
        <TabsContent value="production">
          <ProductionBoxesPanel
            records={productionData}
            loading={loadingProduction}
            onEdit={setEditingProduction}
            onDelete={setDeletingProduction}
          />
        </TabsContent>
      </Tabs>

      <HarvestDialog
        open={openHarvest}
        onOpenChange={setOpenHarvest}
        onSave={async (record) => {
          const saved = await createHarvestRecord(toHarvestPayload(record, user));
          setHarvestData((current) => [mapHarvestRecord(saved), ...current]);
          toast.success("Harvest record saved");
        }}
      />
      <HarvestDialog
        open={!!editingHarvest}
        record={editingHarvest}
        onOpenChange={(open) => !open && setEditingHarvest(null)}
        onSave={async (record) => {
          const saved = await updateHarvestRecord(record.id, toHarvestPayload(record, user));
          setHarvestData((current) => current.map((item) => item.id === record.id ? mapHarvestRecord(saved) : item));
          setEditingHarvest(null);
          toast.success("Harvest record updated");
        }}
      />
      <ProductionBoxesDialog
        open={openProduction}
        onOpenChange={setOpenProduction}
        beneficiaryOptions={harvestData.map((record) => record.beneficiary)}
        onSave={async (record) => {
          const saved = await createProductionBoxRecord(toProductionPayload(record, user));
          setProductionData((current) => [mapProductionRecord(saved), ...current]);
          toast.success("Production record saved");
        }}
      />
      <ProductionBoxesDialog
        open={!!editingProduction}
        record={editingProduction}
        beneficiaryOptions={harvestData.map((record) => record.beneficiary)}
        onOpenChange={(open) => !open && setEditingProduction(null)}
        onSave={async (record) => {
          const saved = await updateProductionBoxRecord(record.id, toProductionPayload(record, user));
          setProductionData((current) => current.map((item) => item.id === record.id ? mapProductionRecord(saved) : item));
          setEditingProduction(null);
          toast.success("Production record updated");
        }}
      />
      <Dialog open={!!deletingHarvest} onOpenChange={(open) => !open && !deletingHarvestBusy && setDeletingHarvest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Trash2 className="h-5 w-5" />Delete Harvest Record
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this harvest record? This action cannot be undone.
            </p>
            {deletingHarvest && (
              <div className="rounded-md border bg-slate-50 p-3 text-sm">
                <div className="font-medium">{deletingHarvest.beneficiary}</div>
                <div className="text-muted-foreground">{deletingHarvest.date} • {deletingHarvest.harvester}</div>
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto">
              <Button variant="outline" onClick={() => setDeletingHarvest(null)} disabled={deletingHarvestBusy}>Cancel</Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                disabled={deletingHarvestBusy}
                onClick={async () => {
                  if (!deletingHarvest) return;
                  setDeletingHarvestBusy(true);
                  try {
                    await deleteHarvestRecord(deletingHarvest.id, userAuditPayload(user));
                    setHarvestData((current) => current.filter((item) => item.id !== deletingHarvest.id));
                    setDeletingHarvest(null);
                    toast.success("Harvest record deleted");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Unable to delete harvest record.");
                  } finally {
                    setDeletingHarvestBusy(false);
                  }
                }}
              >
                {deletingHarvestBusy ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Deleting...</>
                ) : (
                  "Delete Record"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deletingProduction} onOpenChange={(open) => !open && !deletingProductionBusy && setDeletingProduction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Trash2 className="h-5 w-5" />Delete Production Record
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this production record? This action cannot be undone.
            </p>
            {deletingProduction && (
              <div className="rounded-md border bg-slate-50 p-3 text-sm">
                <div className="font-medium">{deletingProduction.beneficiary}</div>
                <div className="text-muted-foreground">{deletingProduction.date}</div>
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto">
              <Button variant="outline" onClick={() => setDeletingProduction(null)} disabled={deletingProductionBusy}>Cancel</Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                disabled={deletingProductionBusy}
                onClick={async () => {
                  if (!deletingProduction) return;
                  setDeletingProductionBusy(true);
                  try {
                    await deleteProductionBoxRecord(deletingProduction.id, userAuditPayload(user));
                    setProductionData((current) => current.filter((item) => item.id !== deletingProduction.id));
                    setDeletingProduction(null);
                    toast.success("Production record deleted");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Unable to delete production record.");
                  } finally {
                    setDeletingProductionBusy(false);
                  }
                }}
              >
                {deletingProductionBusy ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Deleting...</>
                ) : (
                  "Delete Record"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HarvestRecordsPanel({ records, loading, onEdit, onDelete }: {
  records: HarvestRecord[];
  loading: boolean;
  onEdit: (record: HarvestRecord) => void;
  onDelete: (record: HarvestRecord) => void;
}) {
  const [search, setSearch] = useState("");
  const filteredRecords = records.filter((record) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return record.beneficiary.toLowerCase().includes(q)
      || record.harvester.toLowerCase().includes(q)
      || record.date.toLowerCase().includes(q);
  });

  return (
    <Card className="mt-3">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
          <FileText className="h-4 w-4" />Harvest Records
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TableToolbar search={search} onSearch={setSearch} />
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
            {loading && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-6">Loading harvest records...</TableCell>
              </TableRow>
            )}
            {!loading && filteredRecords.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-6">No harvest records found.</TableCell>
              </TableRow>
            )}
            {!loading && filteredRecords.map((r) => (
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
        <Pager count={filteredRecords.length} total={records.length} />
      </CardContent>
    </Card>
  );
}

function ProductionBoxesPanel({ records, loading, onEdit, onDelete }: {
  records: ProductionRecord[];
  loading: boolean;
  onEdit: (record: ProductionRecord) => void;
  onDelete: (record: ProductionRecord) => void;
}) {
  const [search, setSearch] = useState("");
  const filteredRecords = records.filter((record) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return record.beneficiary.toLowerCase().includes(q)
      || record.date.toLowerCase().includes(q)
      || String(record.id).includes(q);
  });

  return (
    <Card className="mt-3">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
          <Boxes className="h-4 w-4" />Production Boxes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TableToolbar search={search} onSearch={setSearch} />
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
              {loading && (
                <TableRow>
                  <TableCell colSpan={19} className="text-center text-muted-foreground py-6">Loading production records...</TableCell>
                </TableRow>
              )}
              {!loading && filteredRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={19} className="text-center text-muted-foreground py-6">No production records found.</TableCell>
                </TableRow>
              )}
              {!loading && filteredRecords.map((r) => (
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
        <Pager count={filteredRecords.length} total={records.length} />
      </CardContent>
    </Card>
  );
}

function TableToolbar({ search, onSearch }: { search?: string; onSearch?: (value: string) => void }) {
  return (
    <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm">
        Show
        <Select defaultValue="10"><SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
          <SelectContent>{["10", "25", "50"].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
        </Select>
        entries
      </div>
      <div className="relative w-full sm:w-auto">
        <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
        <Input
          placeholder="Search records..."
          className="pl-8 w-full h-9 sm:w-64"
          {...(onSearch ? { value: search ?? "", onChange: (event: React.ChangeEvent<HTMLInputElement>) => onSearch(event.target.value) } : {})}
        />
      </div>
    </div>
  );
}

function Pager({ count = 5, total = 5 }: { count?: number; total?: number }) {
  return (
    <div className="flex flex-col gap-2 mt-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-muted-foreground text-sm">Showing {count ? 1 : 0} to {count} of {total} entries</span>
      <div className="flex gap-1">
        <Button variant="outline" size="sm" className="h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></Button>
        <Button size="sm" className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700">1</Button>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0"><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function mapHarvestRecord(record: any): HarvestRecord {
  const date = record.harvest_date || record.date || todayLocalDate();
  return {
    id: Number(record.id),
    date,
    beneficiary: record.beneficiary_name || record.beneficiary || "",
    harvester: record.harvester_name || record.harvester || "",
    w11: Number(record.buligs_11_weeks ?? record.w11 ?? 0),
    w12: Number(record.buligs_12_weeks ?? record.w12 ?? 0),
    w13: Number(record.buligs_13_weeks ?? record.w13 ?? 0),
    w14: Number(record.buligs_14_weeks ?? record.w14 ?? 0),
    total: Number(record.total_buligs ?? record.total ?? 0),
  };
}

function mapProductionRecord(record: any): ProductionRecord {
  const date = record.production_date || record.packing_date || record.harvest_date || record.date || todayLocalDate();
  return {
    id: Number(record.id),
    date,
    beneficiary: record.beneficiary_name || record.beneficiary || "",
    classA_big: Number(record.class_a_big_hands ?? record.classA_big ?? 0),
    classA_small: Number(record.class_a_small_hands ?? record.classA_small ?? 0),
    classA_cp: Number(record.class_a_cps ?? record.classA_cp ?? 0),
    classB_big: Number(record.class_b_big_hands ?? record.classB_big ?? 0),
    classB_small: Number(record.class_b_small_hands ?? record.classB_small ?? 0),
    classB_cp: Number(record.class_b_cps ?? record.classB_cp ?? 0),
    special: Number(record.special_product ?? record.special_total ?? record.special ?? 0),
    defects_11: Number(record.defects_11_weeks ?? record.defects_11 ?? 0),
    defects_12: Number(record.defects_12_weeks ?? record.defects_12 ?? 0),
    defects_13: Number(record.defects_13_weeks ?? record.defects_13 ?? 0),
    defects_14: Number(record.defects_14_weeks ?? record.defects_14 ?? 0),
    rejects_11: Number(record.rejects_11_weeks ?? record.rejects_11 ?? 0),
    rejects_12: Number(record.rejects_12_weeks ?? record.rejects_12 ?? 0),
    rejects_13: Number(record.rejects_13_weeks ?? record.rejects_13 ?? 0),
    rejects_14: Number(record.rejects_14_weeks ?? record.rejects_14 ?? 0),
  };
}

function userAuditPayload(user: User) {
  const id = Number(user.id);
  return {
    ...(Number.isFinite(id) ? { user_id: id } : {}),
    user_name: user.name,
  };
}

function toHarvestPayload(record: HarvestRecord, user: User): HarvestRecordInput {
  return {
    harvest_date: parseDateInput(record.date),
    beneficiary_name: record.beneficiary.trim(),
    harvester_name: record.harvester.trim(),
    buligs_11_weeks: record.w11,
    buligs_12_weeks: record.w12,
    buligs_13_weeks: record.w13,
    buligs_14_weeks: record.w14,
    ...userAuditPayload(user),
  };
}

function toProductionPayload(record: ProductionRecord, user: User): ProductionBoxRecordInput {
  return {
    production_date: parseDateInput(record.date),
    beneficiary_name: record.beneficiary.trim(),
    class_a_big_hands: record.classA_big,
    class_a_small_hands: record.classA_small,
    class_a_cps: record.classA_cp,
    class_b_big_hands: record.classB_big,
    class_b_small_hands: record.classB_small,
    class_b_cps: record.classB_cp,
    special_product: record.special,
    defects_11_weeks: record.defects_11,
    defects_12_weeks: record.defects_12,
    defects_13_weeks: record.defects_13,
    defects_14_weeks: record.defects_14,
    rejects_11_weeks: record.rejects_11,
    rejects_12_weeks: record.rejects_12,
    rejects_13_weeks: record.rejects_13,
    rejects_14_weeks: record.rejects_14,
    ...userAuditPayload(user),
  };
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
  return formatSystemDate(value);
}

function parseDateInput(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return todayLocalDate();
  return formatLocalDate(date);
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayLocalDate() {
  return todaySystemDate();
}

function HarvestDialog({ open, onOpenChange, record, onSave }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: HarvestRecord | null;
  onSave: (record: HarvestRecord) => void | Promise<void>;
}) {
  const today = todayLocalDate();
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
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (!open) return;
    setIsSaving(false);
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

  const submit = async () => {
    if (isSaving) return;
    if (!form.beneficiary.trim() || !form.harvester.trim()) {
      toast.error("Beneficiary and harvester are required");
      return;
    }
    try {
      setIsSaving(true);
      await onSave(form);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save harvest record.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSaving && onOpenChange(nextOpen)}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700">
            <Plus className="h-5 w-5" />{record ? "Edit Harvest Record" : "New Harvest Record"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Harvest Date <span className="text-red-500">*</span></Label>
              <DateInput value={parseDateInput(form.date)} onChange={(e) => setForm({ ...form, date: formatDateLabel(e.target.value) })} />
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

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={submit} disabled={isSaving}>
              {isSaving ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Saving...</>
              ) : (
                <><Save className="h-4 w-4 mr-1" />Save Record</>
              )}
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
  onSave: (record: ProductionRecord) => void | Promise<void>;
}) {
  const today = todayLocalDate();
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
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (open) {
      setIsSaving(false);
      setForm(blank());
    }
  }, [open, record]);

  const setNumber = (key: keyof ProductionRecord, value: string) => {
    setForm({ ...form, [key]: Math.max(0, Number(value) || 0) });
  };

  const submit = async () => {
    if (isSaving) return;
    if (!form.beneficiary.trim()) {
      toast.error("Beneficiary name is required");
      return;
    }

    try {
      setIsSaving(true);
      await onSave(form);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save production record.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSaving && onOpenChange(nextOpen)}>
      <DialogContent className="w-[calc(100vw-1rem)] max-h-[90dvh] overflow-y-auto sm:max-w-4xl">
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
              <DateInput value={parseDateInput(form.date)} onChange={(e) => setForm({ ...form, date: formatDateLabel(e.target.value) })} />
            </div>
          </div>

          <div className="border rounded-md p-4 space-y-3 bg-emerald-50">
            <Label className="text-base text-emerald-700">Class A Boxes</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={submit} disabled={isSaving}>
              {isSaving ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Saving...</>
              ) : (
                <><Save className="h-4 w-4 mr-1" />Save Record</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
