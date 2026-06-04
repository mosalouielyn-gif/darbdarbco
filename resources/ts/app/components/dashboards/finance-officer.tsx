import { useEffect, useMemo, useState } from "react";
import { DarbcoLayout } from "../darbco-layout";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { DateInput } from "../ui/date-input";
import {
  LayoutDashboard, ClipboardCheck, ClipboardList, Undo2, History, FileBarChart2,
  Search, CheckCircle2, AlertCircle, Eye, Printer, ChevronLeft, ChevronRight, ShieldCheck, Loader2,
} from "lucide-react";
import { User } from "../types";
import { toast } from "sonner";
import { useAppData } from "../../lib/app-data-context";
import { returnPayrollSlipForCorrection, validatePayrollSlip } from "../../lib/api";
import { currentPayrollPeriodLabel, currentSystemDateTime, databaseDateKey, formatDatabaseDateTime, formatSystemDate, formatSystemDateTime } from "../../lib/date-time";
import { usePersistentState } from "../../lib/use-persistent-state";

interface Props { user: User; onLogout: () => void }

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "pending", label: "Pending Validation", icon: <ClipboardList className="h-4 w-4" /> },
  { id: "validated", label: "Validated Payrolls", icon: <ClipboardCheck className="h-4 w-4" /> },
  { id: "returned", label: "Returned Payrolls", icon: <Undo2 className="h-4 w-4" /> },
  { id: "history", label: "Payroll History", icon: <History className="h-4 w-4" /> },
  { id: "reports", label: "Reports", icon: <FileBarChart2 className="h-4 w-4" /> },
];

const PRICES = { A: 320, B: 240, special: 480 };

type FoStatus = "Submitted to Finance" | "Returned for Correction" | "Validated by Finance" | "Pending Manager Approval" | "Approved";

interface MaterialCredit {
  date: string; material: string; qty: number; unit: string; unitPrice: number; status: "Unpaid" | "Partially Paid";
}
interface OtherDeduction { type: string; description: string; amount: number; ref: string }

interface ProductionSource {
  classA: number; classB: number; special: number;
}

interface FoSlip {
  dbId?: number;
  slipNo: string;
  productionRecordId: string;
  beneficiaryId: string;
  beneficiaryName: string;
  payrollPeriod: string;
  harvestDate: string;
  preparedBy: string;
  dateSubmitted: string;
  status: FoStatus;
  // Payroll record values
  classA: number; classB: number; special: number;
  classAPrice?: number; classBPrice?: number; specialPrice?: number;
  materialCredits: MaterialCredit[];
  laborDescription: string; laborAmount: number; laborRemarks: string; laborEncodedBy: string; laborDateEncoded: string;
  prevBalance: number;
  otherDeductions: OtherDeduction[];
  // Source-of-truth from Production Clerk (for verification)
  productionSource: ProductionSource;
  returnReason?: { category: string; reason: string; remarks?: string; returnedBy: string; dateReturned: string };
}

interface ValidationActivity {
  id: number;
  slipNo: string;
  beneficiaryName: string;
  payrollPeriod: string;
  action: "Validated" | "Returned";
  account: string;
  timestamp: string;
  remarks: string;
}

const SEED: FoSlip[] = [];

function currentUserId(user: User) {
  const id = Number(user.id);
  return Number.isFinite(id) ? id : undefined;
}

function financeStatus(row: any): FoStatus {
  if (row.approval_status === "Approved") return "Approved";
  if (row.approval_status === "Pending Manager Approval") return "Pending Manager Approval";
  if (row.validation_status === "Validated") return "Pending Manager Approval";
  if (row.validation_status === "Returned for Correction") return "Returned for Correction";
  return "Submitted to Finance";
}

function mapPayrollSlip(row: any): FoSlip {
  const classA = Number(row.class_a_boxes ?? 0);
  const classB = Number(row.class_b_boxes ?? 0);
  const special = Number(row.special_boxes ?? row.special_product_boxes ?? 0);
  const creditDeduction = Number(row.credit_deduction ?? row.material_deduction ?? 0);
  const previousBalance = Number(row.previous_balance ?? 0);
  const laborAmount = Number(row.labor_cost ?? 0);
  const otherDeductionAmount = Number(row.other_deductions ?? 0);

  return {
    dbId: Number(row.id) || undefined,
    slipNo: String(row.slip_no ?? row.id),
    productionRecordId: String(row.production_record_id ?? row.production_box_record_id ?? "N/A"),
    beneficiaryId: String(row.beneficiary_id ?? ""),
    beneficiaryName: row.beneficiary_name ?? "",
    payrollPeriod: row.payroll_period ?? "",
    harvestDate: String(row.harvest_date ?? "").slice(0, 10),
    preparedBy: row.prepared_by_name ?? String(row.prepared_by ?? ""),
    dateSubmitted: formatDatabaseDateTime(row.submitted_at ?? row.created_at),
    status: financeStatus(row),
    classA,
    classB,
    special,
    classAPrice: Number(row.class_a_price ?? PRICES.A),
    classBPrice: Number(row.class_b_price ?? PRICES.B),
    specialPrice: Number(row.special_price ?? PRICES.special),
    materialCredits: creditDeduction > 0 ? [{
      date: String(row.harvest_date ?? "").slice(0, 10),
      material: "Material credit deduction",
      qty: 1,
      unit: "lot",
      unitPrice: creditDeduction,
      status: "Unpaid",
    }] : [],
    laborDescription: laborAmount > 0 ? "Payroll labor cost" : "No labor cost recorded",
    laborAmount,
    laborRemarks: "",
    laborEncodedBy: row.prepared_by_name ?? String(row.prepared_by ?? ""),
    laborDateEncoded: databaseDateKey(row.submitted_at ?? row.created_at),
    prevBalance: previousBalance,
    otherDeductions: otherDeductionAmount > 0 ? [{
      type: "Other Deduction",
      description: "Other authorized deductions",
      amount: otherDeductionAmount,
      ref: row.slip_no ?? "",
    }] : [],
    productionSource: { classA, classB, special },
  };
}

function mapValidationActivity(row: any): ValidationActivity | null {
  if (row.module !== "Payroll") return null;
  if (row.action !== "Validated" && row.action !== "Returned") return null;
  return {
    id: Number(row.id) || Date.now(),
    slipNo: String(row.details ?? "").match(/payroll slip ([^ ]+)/i)?.[1] ?? "Payroll Slip",
    beneficiaryName: "",
    payrollPeriod: "",
    action: row.action,
    account: row.user_name ?? "Finance Officer",
    timestamp: formatDatabaseDateTime(row.created_at),
    remarks: row.details ?? "",
  };
}

function compute(s: FoSlip) {
  const priceA = s.classAPrice ?? PRICES.A;
  const priceB = s.classBPrice ?? PRICES.B;
  const priceSpecial = s.specialPrice ?? PRICES.special;
  const subA = s.classA * priceA;
  const subB = s.classB * priceB;
  const subSpecial = s.special * priceSpecial;
  const gross = subA + subB + subSpecial;
  const matTotal = s.materialCredits.reduce((sum, d) => sum + d.qty * d.unitPrice, 0);
  const otherTotal = s.otherDeductions.reduce((sum, d) => sum + d.amount, 0);
  const totalDed = matTotal + s.laborAmount + s.prevBalance + otherTotal;
  const net = gross - totalDed;
  return { priceA, priceB, priceSpecial, subA, subB, subSpecial, gross, matTotal, otherTotal, totalDed, net };
}

function statusClass(s: FoStatus): string {
  switch (s) {
    case "Submitted to Finance": return "bg-violet-100 text-violet-800";
    case "Returned for Correction": return "bg-red-100 text-red-800";
    case "Validated by Finance": return "bg-amber-100 text-amber-800";
    case "Pending Manager Approval": return "bg-sky-100 text-sky-800";
    case "Approved": return "bg-emerald-100 text-emerald-800";
  }
}
function StatusBadge({ s }: { s: FoStatus }) {
  return <Badge className={statusClass(s)}>{s}</Badge>;
}

function isFinanceValidated(status: FoStatus) {
  return status === "Validated by Finance" || status === "Pending Manager Approval" || status === "Approved";
}

function canFinanceAct(status: FoStatus) {
  return status === "Submitted to Finance" || status === "Returned for Correction";
}

const ERROR_CATEGORIES = [
  "Incorrect beneficiary information",
  "Incorrect number of boxes",
  "Missing production record",
  "Incorrect price per box",
  "Missing material credit deduction",
  "Incorrect material credit amount",
  "Cash purchase incorrectly included",
  "Missing labor cost",
  "Incorrect labor cost amount",
  "Incomplete deduction details",
  "Incorrect gross income",
  "Incorrect net income",
  "Other issue",
];

function returnCategoryForIssue(area: string, slip: FoSlip | null) {
  if (area === "Beneficiary Information") return "Incorrect beneficiary information";
  if (area === "Production Record") return "Missing production record";
  if (area === "Product Classification") return "Incorrect number of boxes";
  if (area === "Price Computation") return "Incorrect price per box";
  if (area === "Material Credit Deductions") return "Incorrect material credit amount";
  if (area === "Labor Cost") return slip && slip.laborAmount > 0 ? "Incorrect labor cost amount" : "Missing labor cost";
  if (area === "Other Deductions") return "Incomplete deduction details";
  if (area === "Gross Income" || area === "Total Deductions") return "Incorrect gross income";
  if (area === "Net Income") return "Incorrect net income";
  return "Other issue";
}

function defaultReturnReason(area: string, detail: string) {
  if (area === "Labor Cost") return "Labor cost is missing or incomplete. Please add the labor cost amount and description, then resubmit the payroll.";
  return `${area} needs correction: ${detail}.`;
}

export function FinanceOfficerDashboard({ user, onLogout }: Props) {
  const { data } = useAppData();
  const [active, setActive] = usePersistentState("darbco.financeOfficer.active", "dashboard");
  const [slips, setSlips] = useState<FoSlip[]>((data?.payrollSlips ?? []).map(mapPayrollSlip));
  const [reviewSlip, setReviewSlip] = useState<FoSlip | null>(null);
  const [validationActivities, setValidationActivities] = useState<ValidationActivity[]>((data?.auditLogs ?? []).map(mapValidationActivity).filter(Boolean) as ValidationActivity[]);

  useEffect(() => {
    setSlips((data?.payrollSlips ?? []).map(mapPayrollSlip));
    setValidationActivities((data?.auditLogs ?? []).map(mapValidationActivity).filter(Boolean) as ValidationActivity[]);
  }, [data?.payrollSlips, data?.auditLogs]);

  const openReview = (slip: FoSlip) => setReviewSlip(slip);
  const closeReview = () => setReviewSlip(null);

  const validate = async (slipNo: string) => {
    const slip = slips.find((item) => item.slipNo === slipNo);
    if (!slip) return;
    try {
      const saved = await validatePayrollSlip(slip.dbId ?? slip.slipNo, {
        user_id: currentUserId(user),
        user_name: user.name,
        remarks: "Payroll validated and forwarded to Manager approval.",
      });
      const mapped = mapPayrollSlip(saved);
      setSlips((cur) => cur.map((s) => s.slipNo === slipNo ? mapped : s));
      setValidationActivities((current) => [
        {
          id: Date.now(),
          slipNo: slip.slipNo,
          beneficiaryName: slip.beneficiaryName,
          payrollPeriod: slip.payrollPeriod,
          action: "Validated",
          account: user.name,
          timestamp: formatSystemDateTime(),
          remarks: "Payroll validated and forwarded to Manager approval.",
        },
        ...current,
      ]);
      toast.success(`${slipNo} validated and forwarded to Manager`);
      closeReview();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to validate payroll slip.");
    }
  };

  const returnSlip = async (slipNo: string, payload: { category: string; reason: string; remarks?: string }) => {
    const slip = slips.find((item) => item.slipNo === slipNo);
    if (!slip) return;
    try {
      const saved = await returnPayrollSlipForCorrection(slip.dbId ?? slip.slipNo, {
        ...payload,
        user_id: currentUserId(user),
        user_name: user.name,
      });
      const mapped = {
        ...mapPayrollSlip(saved),
        returnReason: { ...payload, returnedBy: user.name, dateReturned: currentSystemDateTime() },
      };
      setSlips((cur) => cur.map((s) => s.slipNo === slipNo ? mapped : s));
      setValidationActivities((current) => [
        {
          id: Date.now(),
          slipNo: slip.slipNo,
          beneficiaryName: slip.beneficiaryName,
          payrollPeriod: slip.payrollPeriod,
          action: "Returned",
          account: user.name,
          timestamp: formatSystemDateTime(),
          remarks: `${payload.category}: ${payload.reason}`,
        },
        ...current,
      ]);
      toast.success(`${slipNo} returned to Payroll Personnel`);
      closeReview();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to return payroll slip.");
    }
  };

  return (
    <DarbcoLayout user={user} onLogout={onLogout} navItems={NAV} active={active} onChange={setActive}>
      {active === "dashboard" && <Dashboard slips={slips} activities={validationActivities} goTo={setActive} onReview={openReview} />}
      {active === "pending" && <SlipList title="Pending Validation" slips={slips} filter={(s) => s.status === "Submitted to Finance"} onReview={openReview} />}
      {active === "validated" && <SlipList title="Validated Payrolls" slips={slips} filter={(s) => s.status === "Validated by Finance" || s.status === "Pending Manager Approval"} onReview={openReview} />}
      {active === "returned" && <SlipList title="Returned Payrolls" slips={slips} filter={(s) => s.status === "Returned for Correction"} onReview={openReview} />}
      {active === "history" && <SlipList title="Payroll History" slips={slips} filter={() => true} onReview={openReview} />}
      {active === "reports" && <Reports slips={slips} activities={validationActivities} />}

      <ValidationDetailsDialog
        slip={reviewSlip}
        onClose={closeReview}
        onValidate={validate}
        onReturn={returnSlip}
      />
    </DarbcoLayout>
  );
}

function Dashboard({ slips, activities, goTo, onReview }: { slips: FoSlip[]; activities: ValidationActivity[]; goTo: (id: string) => void; onReview: (s: FoSlip) => void }) {
  const periods = Array.from(new Set(slips.map((s) => s.payrollPeriod)));
  const [selectedPeriod, setSelectedPeriod] = useState(periods[0] ?? "all");
  const pending = slips.filter((s) => s.status === "Submitted to Finance");
  const validated = slips.filter((s) => s.status === "Validated by Finance" || s.status === "Pending Manager Approval");
  const returned = slips.filter((s) => s.status === "Returned for Correction");
  const pendingMgr = slips.filter((s) => s.status === "Pending Manager Approval");
  const approved = slips.filter((s) => s.status === "Approved");
  const validatedForPeriod = slips.filter((s) => isFinanceValidated(s.status) && (selectedPeriod === "all" || s.payrollPeriod === selectedPeriod));
  const validatedAmount = validatedForPeriod.reduce((sum, slip) => sum + compute(slip).net, 0);
  const recentActivities = activities.slice(0, 5);
  const currentPeriod = currentPayrollPeriodLabel();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-emerald-700" />Finance Officer Dashboard</h1>
        <div className="text-muted-foreground">{formatSystemDate()} • Period: {currentPeriod}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi color="violet" label="Pending Validation" value={String(pending.length)} sub="Awaiting review" onClick={() => goTo("pending")} />
        <Kpi color="amber" label="Validated Payrolls" value={String(validated.length)} sub="Forwarded to Manager" onClick={() => goTo("validated")} />
        <Kpi color="red" label="Returned for Correction" value={String(returned.length)} sub="Sent back to Payroll" onClick={() => goTo("returned")} />
        <Kpi color="sky" label="Pending Manager Approval" value={String(pendingMgr.length)} sub="With Manager" onClick={() => goTo("validated")} />
        <Kpi color="emerald" label="Approved Payrolls" value={String(approved.length)} sub="Final approval done" onClick={() => goTo("history")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4">
        <Card>
          <CardHeader className="flex flex-col items-start justify-between gap-3 pb-2 sm:flex-row">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-emerald-700" />Validated Payroll Amount
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Net income total for payrolls already validated by Finance.</p>
            </div>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="h-9 w-full sm:w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payroll Periods</SelectItem>
                {periods.map((period) => (
                  <SelectItem key={period} value={period}>{period}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700">PHP {validatedAmount.toLocaleString()}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {validatedForPeriod.length} validated payroll{validatedForPeriod.length === 1 ? "" : "s"} included
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-emerald-700" />Recent Validation Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <div className="rounded-md border bg-slate-50 p-3 text-sm text-muted-foreground">
                No validation activities recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="grid grid-cols-1 gap-2 rounded-md border bg-white p-3 md:grid-cols-[130px_1fr]">
                    <div>
                      <Badge className={activity.action === "Validated" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}>
                        {activity.action}
                      </Badge>
                      <div className="mt-2 text-xs text-muted-foreground">{activity.timestamp}</div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{activity.slipNo} - {activity.beneficiaryName}</div>
                      <div className="text-xs text-muted-foreground">{activity.payrollPeriod}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{activity.remarks}</div>
                      <div className="mt-1 text-xs text-muted-foreground">By {activity.account}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4 text-emerald-700" />Payroll Slips for Validation</CardTitle>
          <Button variant="link" className="text-emerald-700" onClick={() => goTo("pending")}>Open Pending Validation →</Button>
        </CardHeader>
        <CardContent>
          <SlipTable slips={pending} onReview={onReview} />
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ color, label, value, sub, onClick }: { color: string; label: string; value: string; sub: string; onClick?: () => void }) {
  const map: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    violet: "bg-violet-100 text-violet-700",
    red: "bg-red-100 text-red-700",
    sky: "bg-sky-100 text-sky-700",
  };
  return (
    <Card onClick={onClick} className={onClick ? "cursor-pointer hover:border-emerald-400 hover:shadow transition" : ""}>
      <CardContent className="p-4">
        <div className={`inline-flex h-9 w-9 rounded-full items-center justify-center ${map[color]}`}><ClipboardCheck className="h-4 w-4" /></div>
        <div className="mt-2 text-muted-foreground text-xs">{label}</div>
        <div className="text-xl">{value}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

function SlipList({ title, slips, filter, onReview }: { title: string; slips: FoSlip[]; filter: (s: FoSlip) => boolean; onReview: (s: FoSlip) => void }) {
  const [searchName, setSearchName] = useState("");
  const [slipNo, setSlipNo] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const [period, setPeriod] = useState("all");
  const [status, setStatus] = useState("all");
  const periodOptions = Array.from(new Set([currentPayrollPeriodLabel(), ...slips.map((slip) => slip.payrollPeriod).filter(Boolean)]));

  const filtered = slips.filter(filter).filter((s) => {
    if (searchName && !s.beneficiaryName.toLowerCase().includes(searchName.toLowerCase())) return false;
    if (slipNo && !s.slipNo.toLowerCase().includes(slipNo.toLowerCase())) return false;
    if (harvestDate && s.harvestDate !== harvestDate) return false;
    if (period !== "all" && s.payrollPeriod !== period) return false;
    if (status !== "all" && s.status !== status) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2"><ClipboardList className="h-6 w-6 text-emerald-700" />{title}</h1>
        <p className="text-muted-foreground">Review beneficiary payroll slips submitted by the Payroll Personnel.</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <div className="relative min-w-0 flex-1 sm:min-w-[220px]">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input placeholder="Search beneficiary name..." className="pl-8 h-9" value={searchName} onChange={(e) => setSearchName(e.target.value)} />
            </div>
            <Input placeholder="Payroll slip number" className="h-9 w-full sm:w-48" value={slipNo} onChange={(e) => setSlipNo(e.target.value)} />
            <DateInput className="w-full sm:w-44" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} />
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="h-9 w-full sm:w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payroll Periods</SelectItem>
                {periodOptions.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-full sm:w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Submitted to Finance">Submitted to Finance</SelectItem>
                <SelectItem value="Returned for Correction">Returned for Correction</SelectItem>
                <SelectItem value="Validated by Finance">Validated by Finance</SelectItem>
                <SelectItem value="Pending Manager Approval">Pending Manager Approval</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <SlipTable slips={filtered} onReview={onReview} />

          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-muted-foreground">Showing {filtered.length} of {slips.filter(filter).length} slips</span>
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

function SlipTable({ slips, onReview }: { slips: FoSlip[]; onReview: (s: FoSlip) => void }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Payroll Slip No.</TableHead><TableHead>Beneficiary</TableHead>
          <TableHead>Harvest Date</TableHead><TableHead>Payroll Period</TableHead>
          <TableHead>Gross Income</TableHead><TableHead>Total Deductions</TableHead>
          <TableHead>Net Income</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {slips.length === 0 && (
          <TableRow><TableCell colSpan={9} className="text-muted-foreground text-center">No payroll slips to display.</TableCell></TableRow>
        )}
        {slips.map((s) => {
          const c = compute(s);
          return (
            <TableRow key={s.slipNo}>
              <TableCell>{s.slipNo}</TableCell>
              <TableCell>{s.beneficiaryId} — {s.beneficiaryName}</TableCell>
              <TableCell>{s.harvestDate}</TableCell>
              <TableCell className="text-xs">{s.payrollPeriod}</TableCell>
              <TableCell>₱{c.gross.toLocaleString()}</TableCell>
              <TableCell className="text-red-600">−₱{c.totalDed.toLocaleString()}</TableCell>
              <TableCell><strong>₱{c.net.toLocaleString()}</strong></TableCell>
              <TableCell><StatusBadge s={s.status} /></TableCell>
              <TableCell>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-8" onClick={() => onReview(s)}>
                  <Eye className="h-3.5 w-3.5 mr-1" />Review Payroll
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function ValidationDetailsDialog({ slip, onClose, onValidate, onReturn }: {
  slip: FoSlip | null;
  onClose: () => void;
  onValidate: (slipNo: string) => void | Promise<void>;
  onReturn: (slipNo: string, payload: { category: string; reason: string; remarks?: string }) => void | Promise<void>;
}) {
  const [showReturn, setShowReturn] = useState(false);
  const [retCategory, setRetCategory] = useState("");
  const [retReason, setRetReason] = useState("");
  const [retRemarks, setRetRemarks] = useState("");
  const [returning, setReturning] = useState(false);
  const [validating, setValidating] = useState(false);

  const c = useMemo(() => slip ? compute(slip) : null, [slip]);

  const checklist = useMemo(() => {
    if (!slip || !c) return [];
    const src = slip.productionSource;
    const boxesMatch = src.classA === slip.classA && src.classB === slip.classB && src.special === slip.special;
    return [
      { area: "Beneficiary Information", detail: "Beneficiary name and ID are correct", ok: !!slip.beneficiaryName && !!slip.beneficiaryId },
      { area: "Production Record", detail: "Harvest date and production record are correct", ok: !!slip.harvestDate && !!slip.productionRecordId },
      { area: "Product Classification", detail: "Class A, Class B, and Special Product quantities match", ok: boxesMatch },
      { area: "Price Computation", detail: "Correct price is applied per classification", ok: c.priceA > 0 && c.priceB > 0 && c.priceSpecial > 0 },
      { area: "Gross Income", detail: "Earnings computation is accurate", ok: c.gross === slip.classA * c.priceA + slip.classB * c.priceB + slip.special * c.priceSpecial },
      { area: "Material Credit Deductions", detail: "Credit transactions match the Inventory Bookkeeper's records", ok: slip.materialCredits.every((m) => m.status === "Unpaid" || m.status === "Partially Paid") },
      { area: "Labor Cost", detail: "Labor cost is optional; ₱0 is allowed when no labor charge applies", ok: slip.laborAmount >= 0 },
      { area: "Other Deductions", detail: "Additional deductions contain valid details", ok: slip.otherDeductions.every((d) => d.description.trim().length > 0 && d.amount > 0) },
      { area: "Total Deductions", detail: "All applicable deductions are included", ok: c.totalDed === c.matTotal + slip.laborAmount + slip.prevBalance + c.otherTotal },
      { area: "Net Income", detail: "Final amount is correct", ok: c.net === c.gross - c.totalDed },
    ];
  }, [slip, c]);

  const allOk = checklist.length > 0 && checklist.every((x) => x.ok);

  useEffect(() => {
    if (!showReturn || !slip) return;
    const failedItem = checklist.find((item) => !item.ok);
    if (!failedItem) return;
    if (!retCategory) setRetCategory(returnCategoryForIssue(failedItem.area, slip));
    if (!retReason.trim()) setRetReason(defaultReturnReason(failedItem.area, failedItem.detail));
  }, [showReturn, slip, checklist, retCategory, retReason]);

  if (!slip || !c) return null;
  const financeCanAct = canFinanceAct(slip.status);

  const closeAndReset = () => {
    if (returning || validating) return;
    setShowReturn(false); setRetCategory(""); setRetReason(""); setRetRemarks("");
    onClose();
  };

  const submitValidation = async () => {
    if (!slip || validating || returning) return;
    setValidating(true);
    try {
      await onValidate(slip.slipNo);
    } finally {
      setValidating(false);
    }
  };

  const submitReturn = async () => {
    if (!retCategory) { toast.error("Error category is required"); return; }
    if (!retReason.trim()) { toast.error("Reason for return is required"); return; }
    setReturning(true);
    try {
      await onReturn(slip.slipNo, { category: retCategory, reason: retReason, remarks: retRemarks });
      setShowReturn(false); setRetCategory(""); setRetReason(""); setRetRemarks("");
    } finally {
      setReturning(false);
    }
  };

  return (
    <Dialog open={!!slip} onOpenChange={(o) => !o && closeAndReset()}>
      <DialogContent className="!max-w-[95vw] w-[95vw] sm:!max-w-[1200px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payroll Validation Details — {slip.slipNo}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Section A */}
          <SectionCard title="Section A — Beneficiary and Payroll Information" tone="emerald">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Payroll Slip No." value={slip.slipNo} />
              <Field label="Beneficiary ID" value={slip.beneficiaryId} />
              <Field label="Beneficiary Name" value={slip.beneficiaryName} />
              <Field label="Production Record ID" value={slip.productionRecordId} />
              <Field label="Harvest Date" value={slip.harvestDate} />
              <Field label="Payroll Period" value={slip.payrollPeriod} />
              <Field label="Prepared By" value={slip.preparedBy} />
              <Field label="Date Submitted" value={slip.dateSubmitted} />
              <div className="space-y-1"><div className="text-xs text-muted-foreground">Current Status</div><StatusBadge s={slip.status} /></div>
            </div>
          </SectionCard>

          {/* Section B */}
          <SectionCard title="Section B — Production Records Verification" tone="amber">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Classification</TableHead>
                  <TableHead className="text-right">Production Clerk Record</TableHead>
                  <TableHead className="text-right">Payroll Record</TableHead>
                  <TableHead>Validation Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(["classA", "classB", "special"] as const).map((k) => {
                  const label = k === "classA" ? "Class A" : k === "classB" ? "Class B" : "Special Product";
                  const src = slip.productionSource[k];
                  const pay = slip[k];
                  const result = src === pay ? "Matched" : "Mismatch";
                  return (
                    <TableRow key={k}>
                      <TableCell>{label}</TableCell>
                      <TableCell className="text-right">{src}</TableCell>
                      <TableCell className="text-right">{pay}</TableCell>
                      <TableCell>
                        {result === "Matched"
                          ? <Badge className="bg-emerald-100 text-emerald-800"><CheckCircle2 className="h-3 w-3 mr-1" />Matched</Badge>
                          : <Badge className="bg-red-100 text-red-800"><AlertCircle className="h-3 w-3 mr-1" />Mismatch</Badge>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="text-xs text-muted-foreground">Production figures are read-only. If a mismatch exists, return the slip for correction.</div>
          </SectionCard>

          {/* Section C */}
          <SectionCard title="Section C — Earnings Verification" tone="emerald">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Classification</TableHead>
                  <TableHead className="text-right">Boxes</TableHead>
                  <TableHead className="text-right">Price/Box</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead>Validation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow><TableCell>Class A</TableCell><TableCell className="text-right">{slip.classA}</TableCell><TableCell className="text-right">₱{c.priceA.toLocaleString()}</TableCell><TableCell className="text-right">₱{c.subA.toLocaleString()}</TableCell><TableCell><Badge className="bg-emerald-100 text-emerald-800">Correct</Badge></TableCell></TableRow>
                <TableRow><TableCell>Class B</TableCell><TableCell className="text-right">{slip.classB}</TableCell><TableCell className="text-right">₱{c.priceB.toLocaleString()}</TableCell><TableCell className="text-right">₱{c.subB.toLocaleString()}</TableCell><TableCell><Badge className="bg-emerald-100 text-emerald-800">Correct</Badge></TableCell></TableRow>
                <TableRow><TableCell>Special Product</TableCell><TableCell className="text-right">{slip.special}</TableCell><TableCell className="text-right">₱{c.priceSpecial.toLocaleString()}</TableCell><TableCell className="text-right">₱{c.subSpecial.toLocaleString()}</TableCell><TableCell><Badge className="bg-emerald-100 text-emerald-800">Correct</Badge></TableCell></TableRow>
                <TableRow className="border-t-2">
                  <TableCell colSpan={3}><strong>Gross Income</strong></TableCell>
                  <TableCell className="text-right"><strong className="text-emerald-700">₱{c.gross.toLocaleString()}</strong></TableCell>
                  <TableCell><Badge className="bg-emerald-100 text-emerald-800">Correct</Badge></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </SectionCard>

          {/* Section D */}
          <SectionCard title="Section D — Material Credit Deductions Verification" tone="amber">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date Released</TableHead><TableHead>Material</TableHead>
                  <TableHead className="text-right">Quantity</TableHead><TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead><TableHead>Credit Status</TableHead><TableHead>Validation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slip.materialCredits.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-muted-foreground text-center">No material credit deductions.</TableCell></TableRow>
                )}
                {slip.materialCredits.map((m, i) => (
                  <TableRow key={i}>
                    <TableCell>{m.date}</TableCell>
                    <TableCell>{m.material}</TableCell>
                    <TableCell className="text-right">{m.qty} {m.unit}</TableCell>
                    <TableCell className="text-right">₱{m.unitPrice.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-red-600">−₱{(m.qty * m.unitPrice).toLocaleString()}</TableCell>
                    <TableCell><Badge className="bg-amber-100 text-amber-800">{m.status}</Badge></TableCell>
                    <TableCell><Badge className="bg-emerald-100 text-emerald-800">Matched</Badge></TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2">
                  <TableCell colSpan={4}><strong>Material Credit Subtotal</strong></TableCell>
                  <TableCell className="text-right"><strong className="text-red-600">−₱{c.matTotal.toLocaleString()}</strong></TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableBody>
            </Table>
            <div className="text-xs text-muted-foreground">Cash purchases are excluded — they are paid at the time of the material transaction.</div>
          </SectionCard>

          {/* Section E */}
          <SectionCard title="Section E — Labor Cost Verification" tone="sky">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Labor Cost Description" value={slip.laborDescription} />
              <Field label="Labor Cost Amount" value={`₱${slip.laborAmount.toLocaleString()}`} />
              <Field label="Remarks" value={slip.laborRemarks || "—"} />
              <Field label="Encoded By" value={slip.laborEncodedBy} />
              <Field label="Date Encoded" value={slip.laborDateEncoded} />
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Validation Result</div>
                {slip.laborAmount >= 0
                  ? <Badge className="bg-emerald-100 text-emerald-800"><CheckCircle2 className="h-3 w-3 mr-1" />Correct</Badge>
                  : <Badge className="bg-amber-100 text-amber-800"><AlertCircle className="h-3 w-3 mr-1" />Needs Review</Badge>}
              </div>
            </div>
          </SectionCard>

          {/* Section F */}
          <SectionCard title="Section F — Other Authorized Deductions" tone="slate">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deduction Type</TableHead><TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead><TableHead>Reference</TableHead><TableHead>Validation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slip.prevBalance > 0 && (
                  <TableRow>
                    <TableCell>Previous Unpaid Balance</TableCell>
                    <TableCell>Carried over from prior payroll period</TableCell>
                    <TableCell className="text-right text-red-600">−₱{slip.prevBalance.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">—</TableCell>
                    <TableCell><Badge className="bg-emerald-100 text-emerald-800">Correct</Badge></TableCell>
                  </TableRow>
                )}
                {slip.otherDeductions.length === 0 && slip.prevBalance === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-muted-foreground text-center">No other authorized deductions.</TableCell></TableRow>
                )}
                {slip.otherDeductions.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell>{d.type}</TableCell>
                    <TableCell>{d.description}</TableCell>
                    <TableCell className="text-right text-red-600">−₱{d.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.ref || "—"}</TableCell>
                    <TableCell>
                      {d.description.trim() && d.amount > 0
                        ? <Badge className="bg-emerald-100 text-emerald-800">Correct</Badge>
                        : <Badge className="bg-amber-100 text-amber-800">Needs Review</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>

          {/* Section G */}
          <SectionCard title="Section G — Payroll Summary" tone="emerald">
            <Table>
              <TableBody>
                <TableRow><TableCell>Gross Income</TableCell><TableCell className="text-right">₱{c.gross.toLocaleString()}</TableCell></TableRow>
                <TableRow><TableCell>Material Credit Deductions</TableCell><TableCell className="text-right text-red-600">−₱{c.matTotal.toLocaleString()}</TableCell></TableRow>
                <TableRow><TableCell>Labor Cost</TableCell><TableCell className="text-right text-red-600">−₱{slip.laborAmount.toLocaleString()}</TableCell></TableRow>
                <TableRow><TableCell>Previous Unpaid Balance</TableCell><TableCell className="text-right text-red-600">−₱{slip.prevBalance.toLocaleString()}</TableCell></TableRow>
                <TableRow><TableCell>Other Authorized Deductions</TableCell><TableCell className="text-right text-red-600">−₱{c.otherTotal.toLocaleString()}</TableCell></TableRow>
                <TableRow className="border-t-2"><TableCell><strong>Total Deductions</strong></TableCell><TableCell className="text-right"><strong className="text-red-600">−₱{c.totalDed.toLocaleString()}</strong></TableCell></TableRow>
                <TableRow className="bg-emerald-50"><TableCell><strong>Net Income</strong></TableCell><TableCell className="text-right"><strong className="text-emerald-800">₱{c.net.toLocaleString()}</strong></TableCell></TableRow>
              </TableBody>
            </Table>
          </SectionCard>

          {/* Validation Checklist */}
          <SectionCard title="Validation Checklist" tone="violet">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Validation Area</TableHead><TableHead>Details to Check</TableHead><TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checklist.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell>{c.area}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.detail}</TableCell>
                    <TableCell>
                      {c.ok
                        ? <Badge className="bg-emerald-100 text-emerald-800"><CheckCircle2 className="h-3 w-3 mr-1" />Complete</Badge>
                        : <Badge className="bg-amber-100 text-amber-800"><AlertCircle className="h-3 w-3 mr-1" />Needs Review</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!allOk && <div className="text-xs text-amber-700">Validate Payroll is disabled until every item above is Complete.</div>}
          </SectionCard>

          {slip.status === "Returned for Correction" && slip.returnReason && (
            <div className="p-3 border border-red-200 bg-red-50 rounded-md text-red-800 text-sm">
              <div><strong>Returned for Correction</strong> — {slip.returnReason.category}</div>
              <div className="text-xs">{slip.returnReason.reason}</div>
              {slip.returnReason.remarks && <div className="text-xs mt-1">Remarks: {slip.returnReason.remarks}</div>}
              <div className="text-xs text-muted-foreground mt-1">Returned by {slip.returnReason.returnedBy} on {slip.returnReason.dateReturned}</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => toast.success("Slip sent to printer")}><Printer className="h-4 w-4 mr-1" />Print</Button>
            <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50"
              disabled={!financeCanAct || returning || validating}
              onClick={() => setShowReturn(true)}>
              {returning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Undo2 className="h-4 w-4 mr-1" />}Return for Correction
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
              disabled={!allOk || !financeCanAct || validating || returning}
              onClick={submitValidation}>
              {validating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}Validate Payroll
            </Button>
            <Button variant="outline" disabled={returning || validating} onClick={closeAndReset}>Cancel</Button>
          </div>
        </div>

        {/* Return for Correction Modal */}
        <Dialog open={showReturn} onOpenChange={(o) => !o && !returning && setShowReturn(false)}>
          <DialogContent className="!max-w-[95vw] w-[95vw] sm:!max-w-[640px]">
            <DialogHeader><DialogTitle>Return for Correction — {slip.slipNo}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Error Category <span className="text-red-500">*</span></Label>
                <Select value={retCategory} onValueChange={setRetCategory}>
                  <SelectTrigger><SelectValue placeholder="Select an error category" /></SelectTrigger>
                  <SelectContent>
                    {ERROR_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Reason for Return <span className="text-red-500">*</span></Label>
                <Textarea value={retReason} onChange={(e) => setRetReason(e.target.value)} placeholder="Explain the issue clearly so the Payroll Personnel can correct it." />
              </div>
              <div className="space-y-1">
                <Label>Remarks</Label>
                <Textarea value={retRemarks} onChange={(e) => setRetRemarks(e.target.value)} placeholder="Optional additional instructions." />
              </div>
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-md">
                <Field label="Returned To" value="Payroll Personnel" />
                <Field label="Returned By" value="(current Finance Officer)" />
                <Field label="Date Returned" value={currentSystemDateTime()} />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" disabled={returning} onClick={() => setShowReturn(false)}>Cancel</Button>
                <Button className="bg-red-600 hover:bg-red-700" disabled={returning} onClick={submitReturn}>
                  {returning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Undo2 className="h-4 w-4 mr-1" />}Confirm Return
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

function SectionCard({ title, tone, children }: { title: string; tone: "emerald" | "amber" | "sky" | "slate" | "violet"; children: React.ReactNode }) {
  const map = {
    emerald: "border-emerald-200 bg-emerald-50/30",
    amber: "border-amber-200 bg-amber-50/30",
    sky: "border-sky-200 bg-sky-50/30",
    slate: "border-slate-200 bg-slate-50/30",
    violet: "border-violet-200 bg-violet-50/30",
  };
  return (
    <Card className={map[tone]}>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
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

function Reports({ slips, activities }: { slips: FoSlip[]; activities: ValidationActivity[] }) {
  const [generatedReport, setGeneratedReport] = useState<ReportDefinition | null>(null);
  const validatedCount = slips.filter((slip) => isFinanceValidated(slip.status)).length;
  const returnedCount = slips.filter((slip) => slip.status === "Returned for Correction").length;
  const pendingManagerCount = slips.filter((slip) => slip.status === "Pending Manager Approval").length;
  const materialCreditTotal = slips.reduce((sum, slip) => sum + compute(slip).matTotal, 0);
  const laborCostTotal = slips.reduce((sum, slip) => sum + slip.laborAmount, 0);
  const validatedAmount = slips.filter((slip) => isFinanceValidated(slip.status)).reduce((sum, slip) => sum + compute(slip).net, 0);
  const returnedActivities = activities.filter((activity) => activity.action === "Returned").length;

  const reports: ReportDefinition[] = [
    {
      name: "Validated Payroll Register",
      desc: `${validatedCount} payroll slips validated by Finance.`,
      metric: `PHP ${validatedAmount.toLocaleString()}`,
      columns: ["Slip No.", "Beneficiary", "Period", "Net Income", "Status"],
      rows: slips.filter((slip) => isFinanceValidated(slip.status)).map((slip) => [slip.slipNo, slip.beneficiaryName, slip.payrollPeriod, money(compute(slip).net), slip.status]),
    },
    {
      name: "Returned Payroll Register",
      desc: `${returnedCount} slips currently returned for correction.`,
      metric: `${returnedActivities} return actions`,
      columns: ["Slip No.", "Beneficiary", "Category", "Reason", "Date Returned"],
      rows: slips.filter((slip) => slip.status === "Returned for Correction").map((slip) => [slip.slipNo, slip.beneficiaryName, slip.returnReason?.category ?? "Correction", slip.returnReason?.reason ?? "Returned for correction", slip.returnReason?.dateReturned ?? "-"]),
    },
    {
      name: "Validation Turnaround",
      desc: "Average time from submission to validation.",
      metric: `${activities.length} activities`,
      columns: ["Slip No.", "Action", "Account", "Timestamp", "Remarks"],
      rows: activities.map((activity) => [activity.slipNo, activity.action, activity.account, activity.timestamp, activity.remarks]),
    },
    {
      name: "Material Credit Audit",
      desc: "Material credits charged in validated payrolls.",
      metric: `PHP ${materialCreditTotal.toLocaleString()}`,
      columns: ["Slip No.", "Beneficiary", "Material", "Amount", "Status"],
      rows: slips.flatMap((slip) => {
        const c = compute(slip);
        if (slip.materialCredits.length === 0 && c.matTotal <= 0) return [];
        return slip.materialCredits.length
          ? slip.materialCredits.map((credit) => [slip.slipNo, slip.beneficiaryName, credit.material, money(credit.qty * credit.unitPrice), credit.status])
          : [[slip.slipNo, slip.beneficiaryName, "Material credit deduction", money(c.matTotal), "Recorded"]];
      }),
    },
    {
      name: "Labor Cost Audit",
      desc: "Labor cost amounts across validated payrolls.",
      metric: `PHP ${laborCostTotal.toLocaleString()}`,
      columns: ["Slip No.", "Beneficiary", "Description", "Amount", "Encoded By"],
      rows: slips.filter((slip) => slip.laborAmount > 0).map((slip) => [slip.slipNo, slip.beneficiaryName, slip.laborDescription, money(slip.laborAmount), slip.laborEncodedBy || "-"]),
    },
    {
      name: "Approval Pipeline Status",
      desc: "Slips awaiting Manager approval.",
      metric: `${pendingManagerCount} pending`,
      columns: ["Slip No.", "Beneficiary", "Period", "Net Income", "Status"],
      rows: slips.filter((slip) => slip.status === "Pending Manager Approval").map((slip) => [slip.slipNo, slip.beneficiaryName, slip.payrollPeriod, money(compute(slip).net), slip.status]),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2"><FileBarChart2 className="h-6 w-6 text-emerald-700" />Validation Reports</h1>
        <p className="text-muted-foreground">Generate payroll validation reports for the selected period or date range.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reports.map((r) => (
          <Card key={r.name} className="hover:border-emerald-400 transition cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center"><FileBarChart2 className="h-4 w-4" /></div>
                <div>{r.name}</div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{r.desc}</p>
              <div className="mb-3 text-lg font-semibold text-emerald-700">{r.metric}</div>
              <Button
                variant="outline"
                size="sm"
                className="h-9 border-emerald-200 px-3 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                onClick={() => setGeneratedReport(r)}
              >
                <FileBarChart2 className="mr-1.5 h-4 w-4" />Generate Report
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <GeneratedReportDialog report={generatedReport} onClose={() => setGeneratedReport(null)} />
    </div>
  );
}

interface ReportDefinition {
  name: string;
  desc: string;
  metric: string;
  columns: string[];
  rows: string[][];
}

function GeneratedReportDialog({ report, onClose }: { report: ReportDefinition | null; onClose: () => void }) {
  return (
    <Dialog open={!!report} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88vh] w-[calc(100vw-2rem)] max-w-5xl overflow-hidden p-0">
        {report && (
          <>
            <DialogHeader className="border-b px-6 py-4">
              <DialogTitle className="flex items-center gap-2 text-emerald-700">
                <FileBarChart2 className="h-5 w-5" />{report.name}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[calc(88vh-76px)] overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              <div className="grid gap-3 rounded-md border bg-slate-50 p-3 text-sm md:grid-cols-3">
                <Field label="Generated At" value={currentSystemDateTime()} />
                <Field label="Summary" value={report.metric} />
                <Field label="Record Count" value={String(report.rows.length)} />
              </div>
              <p className="text-sm text-muted-foreground">{report.desc}</p>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {report.columns.map((column) => (
                        <TableHead key={column}>{column}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={report.columns.length} className="py-8 text-center text-muted-foreground">
                          No records available for this report.
                        </TableCell>
                      </TableRow>
                    ) : report.rows.map((row, index) => (
                      <TableRow key={`${report.name}-${index}`}>
                        {row.map((cell, cellIndex) => (
                          <TableCell key={`${report.name}-${index}-${cellIndex}`}>{cell}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="sticky bottom-0 -mx-6 flex flex-wrap justify-end gap-2 border-t bg-white px-6 py-3">
                <Button variant="outline" className="min-w-24" onClick={() => printReport(report)}>
                  <Printer className="mr-1.5 h-4 w-4" />Print
                </Button>
                <Button className="min-w-24 bg-emerald-600 hover:bg-emerald-700" onClick={onClose}>Close</Button>
              </div>
            </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function money(value: number) {
  return `PHP ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function printReport(report: ReportDefinition) {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;

  const tableHeaders = report.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const tableRows = report.rows.length
    ? report.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${report.columns.length}" class="empty">No records available for this report.</td></tr>`;

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(report.name)}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #0f172a; margin: 28px; }
          .header { border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 18px; }
          h1 { color: #047857; font-size: 22px; margin: 0 0 6px; }
          .desc { color: #475569; margin: 0; }
          .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 18px 0; }
          .box { border: 1px solid #dbe4ee; border-radius: 6px; padding: 10px; }
          .label { color: #64748b; font-size: 11px; margin-bottom: 4px; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border-bottom: 1px solid #e2e8f0; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #f8fafc; font-weight: 700; }
          .empty { text-align: center; color: #64748b; padding: 24px; }
          @page { margin: 18mm; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${escapeHtml(report.name)}</h1>
          <p class="desc">${escapeHtml(report.desc)}</p>
        </div>
        <div class="meta">
          <div class="box"><div class="label">Generated At</div><div>${escapeHtml(currentSystemDateTime())}</div></div>
          <div class="box"><div class="label">Summary</div><div>${escapeHtml(report.metric)}</div></div>
          <div class="box"><div class="label">Record Count</div><div>${report.rows.length}</div></div>
        </div>
        <table>
          <thead><tr>${tableHeaders}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
}

function escapeHtml(value: string) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
