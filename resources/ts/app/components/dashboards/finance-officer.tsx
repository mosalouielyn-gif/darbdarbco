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
  Search, CheckCircle2, AlertCircle, Eye, Printer, ChevronLeft, ChevronRight, ShieldCheck, Loader2, Plus,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
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
interface OtherDeduction { type: string; amount: number }

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
  const savedOtherDeductions = (Array.isArray(row.deductions) ? row.deductions : [])
    .map((deduction: any) => ({
      type: String(deduction.deduction_type ?? deduction.type ?? "Other Authorized Deduction"),
      amount: Number(deduction.amount ?? 0),
    }))
    .filter((deduction) => deduction.amount > 0);

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
    otherDeductions: savedOtherDeductions.length > 0
      ? savedOtherDeductions
      : otherDeductionAmount > 0
        ? [{ type: "Other Approved Deductions", amount: otherDeductionAmount }]
        : [],
    productionSource: { classA, classB, special },
    returnReason: row.return_reason ? {
      category: row.return_category ?? "Correction",
      reason: row.return_reason,
      remarks: row.return_remarks ?? "",
      returnedBy: row.returned_by_name ?? row.validated_by_name ?? "Finance Officer",
      dateReturned: formatDatabaseDateTime(row.returned_at ?? row.validated_at ?? row.updated_at),
    } : undefined,
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
  return status === "Submitted to Finance";
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

const MANUAL_ASSESSMENT_ITEMS = [
  { id: "beneficiary", area: "Beneficiary Information", detail: "Beneficiary name and ID" },
  { id: "production", area: "Production Record", detail: "Harvest date and production record" },
  { id: "classification", area: "Product Classification", detail: "Class A, Class B, and Special Product quantities" },
  { id: "prices", area: "Price Computation", detail: "Price applied per classification" },
  { id: "gross", area: "Gross Income", detail: "Earnings computation" },
  { id: "credits", area: "Material Credit Deductions", detail: "Inventory credit deductions" },
  { id: "labor", area: "Labor Cost", detail: "Labor cost entry" },
  { id: "other", area: "Other Deductions", detail: "Other authorized deductions" },
  { id: "deductions", area: "Total Deductions", detail: "Deduction total" },
  { id: "net", area: "Net Income", detail: "Final net income" },
];

type ManualAssessmentValue = "Matched" | "Not Matched";

export function FinanceOfficerDashboard({ user, onLogout }: Props) {
  const { data } = useAppData();
  const [active, setActive] = usePersistentState("darbco.financeOfficer.active", "dashboard");
  const [slips, setSlips] = useState<FoSlip[]>((data?.payrollSlips ?? []).map(mapPayrollSlip));
  const [reviewSlip, setReviewSlip] = useState<FoSlip | null>(null);
  const [reviewReadOnly, setReviewReadOnly] = useState(false);
  const [validationActivities, setValidationActivities] = useState<ValidationActivity[]>((data?.auditLogs ?? []).map(mapValidationActivity).filter(Boolean) as ValidationActivity[]);

  useEffect(() => {
    setSlips((data?.payrollSlips ?? []).map(mapPayrollSlip));
    setValidationActivities((data?.auditLogs ?? []).map(mapValidationActivity).filter(Boolean) as ValidationActivity[]);
  }, [data?.payrollSlips, data?.auditLogs]);

  const openReview = (slip: FoSlip, readOnly = false) => {
    setReviewReadOnly(readOnly);
    setReviewSlip(slip);
  };
  const closeReview = () => {
    setReviewSlip(null);
    setReviewReadOnly(false);
  };

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
      {active === "dashboard" && <Dashboard slips={slips} activities={validationActivities} goTo={setActive} onReview={(slip) => openReview(slip)} />}
      {active === "pending" && <SlipList title="Pending Validation" slips={slips} filter={(s) => s.status === "Submitted to Finance"} onReview={(slip) => openReview(slip)} />}
      {active === "validated" && <SlipList title="Validated Payrolls" slips={slips} filter={(s) => s.status === "Validated by Finance" || s.status === "Pending Manager Approval"} onReview={(slip) => openReview(slip, true)} actionLabel="View Payroll" description="Validated payrolls forwarded for manager action." />}
      {active === "returned" && <SlipList title="Returned Payrolls" slips={slips} filter={(s) => s.status === "Returned for Correction"} onReview={(slip) => openReview(slip, true)} actionLabel="View Payroll" description="Payroll slips returned to Payroll Personnel for correction and resubmission." />}
      {active === "history" && <SlipList title="Payroll History" slips={slips} filter={() => true} onReview={(slip) => openReview(slip, true)} actionLabel="View Payroll" description="View payroll records for history and reference." />}
      {active === "reports" && <Reports user={user} slips={slips} activities={validationActivities} />}

      <ValidationDetailsDialog
        slip={reviewSlip}
        readOnly={reviewReadOnly}
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
            <div className="break-words text-2xl font-bold text-emerald-700 sm:text-3xl">PHP {validatedAmount.toLocaleString()}</div>
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

function SlipList({ title, slips, filter, onReview, actionLabel = "Review Payroll", description = "Review beneficiary payroll slips submitted by the Payroll Personnel." }: {
  title: string;
  slips: FoSlip[];
  filter: (s: FoSlip) => boolean;
  onReview: (s: FoSlip) => void;
  actionLabel?: string;
  description?: string;
}) {
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
        <p className="text-muted-foreground">{description}</p>
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

          <SlipTable slips={filtered} onReview={onReview} actionLabel={actionLabel} />

          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
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

function SlipTable({ slips, onReview, actionLabel = "Review Payroll" }: { slips: FoSlip[]; onReview: (s: FoSlip) => void; actionLabel?: string }) {
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
                  <Eye className="h-3.5 w-3.5 mr-1" />{actionLabel}
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function ValidationDetailsDialog({ slip, readOnly = false, onClose, onValidate, onReturn }: {
  slip: FoSlip | null;
  readOnly?: boolean;
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
  const [assessments, setAssessments] = useState<Record<string, ManualAssessmentValue | "">>({});
  const [errorCategories, setErrorCategories] = useState(ERROR_CATEGORIES);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  const c = useMemo(() => slip ? compute(slip) : null, [slip]);


  const allManuallyMatched = MANUAL_ASSESSMENT_ITEMS.every((item) => assessments[item.id] === "Matched");
  const hasIncompleteAssessment = MANUAL_ASSESSMENT_ITEMS.some((item) => !assessments[item.id]);
  const hasMismatchAssessment = MANUAL_ASSESSMENT_ITEMS.some((item) => assessments[item.id] === "Not Matched");

  useEffect(() => {
    setAssessments({});
    setShowReturn(false);
    setRetCategory("");
    setRetReason("");
    setRetRemarks("");
  }, [slip?.slipNo]);

  if (!slip || !c) return null;
  const financeCanAct = !readOnly && canFinanceAct(slip.status);

  const closeAndReset = () => {
    if (returning || validating) return;
    setShowReturn(false); setRetCategory(""); setRetReason(""); setRetRemarks("");
    onClose();
  };

  const submitValidation = async () => {
    if (!slip || validating || returning) return;
    if (hasIncompleteAssessment) {
      toast.error("Complete the manual assessment before validating payroll.");
      return;
    }
    if (!allManuallyMatched) {
      toast.error("Only payrolls manually assessed as matched can be validated.");
      return;
    }
    setValidating(true);
    try {
      await onValidate(slip.slipNo);
    } finally {
      setValidating(false);
    }
  };

  const submitReturn = async () => {
    if (!hasMismatchAssessment) {
      toast.error("Mark at least one manual assessment item as Not Matched before returning payroll.");
      return;
    }
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

  const addErrorCategory = () => {
    const cleaned = newCategory.trim();
    if (!cleaned) {
      toast.error("Category name is required");
      return;
    }
    if (errorCategories.some((category) => category.toLowerCase() === cleaned.toLowerCase())) {
      toast.error("Category already exists");
      return;
    }
    setErrorCategories((current) => [...current, cleaned]);
    setRetCategory(cleaned);
    setNewCategory("");
    setShowAddCategory(false);
    toast.success("Category added");
  };

  return (
    <Dialog open={!!slip} onOpenChange={(o) => !o && closeAndReset()}>
      <DialogContent className="!max-w-[calc(100vw-1rem)] w-[calc(100vw-1rem)] sm:!max-w-[1200px] max-h-[92dvh] overflow-y-auto">
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
                  <TableHead>Assessment Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(["classA", "classB", "special"] as const).map((k) => {
                  const label = k === "classA" ? "Class A" : k === "classB" ? "Class B" : "Special Product";
                  const src = slip.productionSource[k];
                  const pay = slip[k];
                  return (
                    <TableRow key={k}>
                      <TableCell>{label}</TableCell>
                      <TableCell className="text-right">{src}</TableCell>
                      <TableCell className="text-right">{pay}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">Manual review</TableCell>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow><TableCell>Class A</TableCell><TableCell className="text-right">{slip.classA}</TableCell><TableCell className="text-right">₱{c.priceA.toLocaleString()}</TableCell><TableCell className="text-right">₱{c.subA.toLocaleString()}</TableCell></TableRow>
                <TableRow><TableCell>Class B</TableCell><TableCell className="text-right">{slip.classB}</TableCell><TableCell className="text-right">₱{c.priceB.toLocaleString()}</TableCell><TableCell className="text-right">₱{c.subB.toLocaleString()}</TableCell></TableRow>
                <TableRow><TableCell>Special Product</TableCell><TableCell className="text-right">{slip.special}</TableCell><TableCell className="text-right">₱{c.priceSpecial.toLocaleString()}</TableCell><TableCell className="text-right">₱{c.subSpecial.toLocaleString()}</TableCell></TableRow>
                <TableRow className="border-t-2">
                  <TableCell colSpan={3}><strong>Gross Income</strong></TableCell>
                  <TableCell className="text-right"><strong className="text-emerald-700">₱{c.gross.toLocaleString()}</strong></TableCell>
                  
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
                  <TableHead className="text-right">Total</TableHead><TableHead>Credit Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slip.materialCredits.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-muted-foreground text-center">No material credit deductions.</TableCell></TableRow>
                )}
                {slip.materialCredits.map((m, i) => (
                  <TableRow key={i}>
                    <TableCell>{m.date}</TableCell>
                    <TableCell>{m.material}</TableCell>
                    <TableCell className="text-right">{m.qty} {m.unit}</TableCell>
                    <TableCell className="text-right">₱{m.unitPrice.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-red-600">−₱{(m.qty * m.unitPrice).toLocaleString()}</TableCell>
                    <TableCell><Badge className="bg-amber-100 text-amber-800">{m.status}</Badge></TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2">
                  <TableCell colSpan={4}><strong>Material Credit Subtotal</strong></TableCell>
                  <TableCell className="text-right"><strong className="text-red-600">−₱{c.matTotal.toLocaleString()}</strong></TableCell>
                  <TableCell />
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
            </div>
          </SectionCard>

          {/* Section F */}
          <SectionCard title="Section F — Other Authorized Deductions" tone="slate">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deduction Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slip.otherDeductions.length === 0 && (
                  <TableRow><TableCell colSpan={2} className="text-muted-foreground text-center">No other authorized deductions.</TableCell></TableRow>
                )}
                {slip.otherDeductions.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell>{d.type}</TableCell>
                    <TableCell className="text-right text-red-600">−₱{d.amount.toLocaleString()}</TableCell>
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
                {slip.otherDeductions.map((d, i) => (
                  <TableRow key={`${d.type}-${i}`} className="text-sm">
                    <TableCell className="pl-8 text-muted-foreground">{d.type}</TableCell>
                    <TableCell className="text-right text-red-600">−₱{d.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2"><TableCell><strong>Total Deductions</strong></TableCell><TableCell className="text-right"><strong className="text-red-600">−₱{c.totalDed.toLocaleString()}</strong></TableCell></TableRow>
                <TableRow className="bg-emerald-50"><TableCell><strong>Net Income</strong></TableCell><TableCell className="text-right"><strong className="text-emerald-800">₱{c.net.toLocaleString()}</strong></TableCell></TableRow>
              </TableBody>
            </Table>
          </SectionCard>

          {!readOnly && (
            <SectionCard title="Manual Assessment" tone="violet">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assessment Area</TableHead><TableHead>Details Reviewed</TableHead><TableHead>Finance Assessment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MANUAL_ASSESSMENT_ITEMS.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.area}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.detail}</TableCell>
                    <TableCell>
                      <Select
                        value={assessments[item.id] ?? ""}
                        onValueChange={(value: ManualAssessmentValue) => setAssessments((current) => ({ ...current, [item.id]: value }))}
                        disabled={!financeCanAct || returning || validating}
                      >
                        <SelectTrigger className="w-full sm:w-[180px]">
                          <SelectValue placeholder="Select result" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Matched">Matched</SelectItem>
                          <SelectItem value="Not Matched">Not Matched</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {hasIncompleteAssessment && <div className="text-xs text-amber-700">Complete every manual assessment item before validating payroll.</div>}
            {!hasIncompleteAssessment && !allManuallyMatched && <div className="text-xs text-red-700">A Not Matched result blocks validation and manager approval. Return the payroll for correction before it can be resubmitted.</div>}
            {!hasMismatchAssessment && !allManuallyMatched && <div className="text-xs text-muted-foreground">Select Not Matched on the mismatched item to enable Return for Correction.</div>}
            </SectionCard>
          )}

          {slip.status === "Returned for Correction" && slip.returnReason && (
            <div className="p-3 border border-red-200 bg-red-50 rounded-md text-red-800 text-sm">
              <div><strong>Returned for Correction</strong> — {slip.returnReason.category}</div>
              <div className="text-xs">{slip.returnReason.reason}</div>
              {slip.returnReason.remarks && <div className="text-xs mt-1">Remarks: {slip.returnReason.remarks}</div>}
              <div className="text-xs text-muted-foreground mt-1">Returned by {slip.returnReason.returnedBy} on {slip.returnReason.dateReturned}</div>
            </div>
          )}

          {/* Actions */}
          {readOnly ? (
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={closeAndReset}>Close</Button>
            </div>
          ) : (
            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => toast.success("Slip sent to printer")}><Printer className="h-4 w-4 mr-1" />Print</Button>
              <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50"
                disabled={!financeCanAct || !hasMismatchAssessment || returning || validating}
                onClick={() => setShowReturn(true)}>
                {returning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Undo2 className="h-4 w-4 mr-1" />}Return for Correction
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                disabled={!allManuallyMatched || !financeCanAct || validating || returning}
                onClick={submitValidation}>
                {validating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}Validate Payroll
              </Button>
              <Button variant="outline" disabled={returning || validating} onClick={closeAndReset}>Cancel</Button>
            </div>
          )}
        </div>

        {/* Return for Correction Modal */}
        {!readOnly && <Dialog open={showReturn} onOpenChange={(o) => !o && !returning && setShowReturn(false)}>
          <DialogContent className="!max-w-[calc(100vw-1rem)] w-[calc(100vw-1rem)] sm:!max-w-[640px]">
            <DialogHeader><DialogTitle>Return for Correction — {slip.slipNo}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Error Category <span className="text-red-500">*</span></Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select value={retCategory} onValueChange={setRetCategory}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Select an error category" /></SelectTrigger>
                    <SelectContent>
                      {errorCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" onClick={() => setShowAddCategory(true)}>
                    <Plus className="h-4 w-4 mr-1" />Add Category
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Reason for Return <span className="text-red-500">*</span></Label>
                <Textarea value={retReason} onChange={(e) => setRetReason(e.target.value)} placeholder="Explain the issue clearly so the Payroll Personnel can correct it." />
              </div>
              <div className="space-y-1">
                <Label>Remarks</Label>
                <Textarea value={retRemarks} onChange={(e) => setRetRemarks(e.target.value)} placeholder="Optional additional instructions." />
              </div>
              <div className="flex flex-col-reverse gap-2 pt-2 border-t sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto">
                <Button variant="outline" disabled={returning} onClick={() => setShowReturn(false)}>Cancel</Button>
                <Button className="bg-red-600 hover:bg-red-700" disabled={returning} onClick={submitReturn}>
                  {returning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Undo2 className="h-4 w-4 mr-1" />}Confirm Return
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>}

        {!readOnly && <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
          <DialogContent className="!max-w-[calc(100vw-1rem)] w-[calc(100vw-1rem)] sm:!max-w-[420px]">
            <DialogHeader><DialogTitle>Add Finance Category</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Category Name</Label>
                <Input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Enter category name" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => { setShowAddCategory(false); setNewCategory(""); }}>Cancel</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={addErrorCategory}>Save Category</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>}
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

function canGenerateReports(role: User["role"]) {
  return role === "manager_admin" || role === "finance_officer";
}

function Reports({ user, slips, activities }: { user: User; slips: FoSlip[]; activities: ValidationActivity[] }) {
  const [generatedReport, setGeneratedReport] = useState<ReportDefinition | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reportTypeFilter, setReportTypeFilter] = useState("all");
  const [reportSort, setReportSort] = useState("newest");
  const allowReportGeneration = canGenerateReports(user.role);
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
      type: "Validated Payroll",
      date: latestFinanceDate(slips.filter((slip) => isFinanceValidated(slip.status)), ["dateSubmitted", "harvestDate"]),
      desc: `${validatedCount} payroll slips validated by Finance.`,
      metric: `PHP ${validatedAmount.toLocaleString()}`,
      columns: ["Slip No.", "Beneficiary", "Period", "Net Income", "Status"],
      rows: slips.filter((slip) => isFinanceValidated(slip.status)).map((slip) => [slip.slipNo, slip.beneficiaryName, slip.payrollPeriod, money(compute(slip).net), slip.status]),
    },
    {
      name: "Returned Payroll Register",
      type: "Returned Payroll",
      date: latestFinanceDate(slips.filter((slip) => slip.status === "Returned for Correction"), ["dateSubmitted", "harvestDate"]),
      desc: `${returnedCount} slips currently returned for correction.`,
      metric: `${returnedActivities} return actions`,
      columns: ["Slip No.", "Beneficiary", "Category", "Reason", "Date Returned"],
      rows: slips.filter((slip) => slip.status === "Returned for Correction").map((slip) => [slip.slipNo, slip.beneficiaryName, slip.returnReason?.category ?? "Correction", slip.returnReason?.reason ?? "Returned for correction", slip.returnReason?.dateReturned ?? "-"]),
    },
    {
      name: "Validation Turnaround",
      type: "Validation Activity",
      date: latestFinanceDate(activities, ["timestamp"]),
      desc: "Average time from submission to validation.",
      metric: `${activities.length} activities`,
      columns: ["Slip No.", "Action", "Account", "Timestamp", "Remarks"],
      rows: activities.map((activity) => [activity.slipNo, activity.action, activity.account, activity.timestamp, activity.remarks]),
    },
    {
      name: "Material Credit Audit",
      type: "Material Credit",
      date: latestFinanceDate(slips, ["dateSubmitted", "harvestDate"]),
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
      type: "Labor Cost",
      date: latestFinanceDate(slips.filter((slip) => slip.laborAmount > 0), ["laborDateEncoded", "dateSubmitted", "harvestDate"]),
      desc: "Labor cost amounts across validated payrolls.",
      metric: `PHP ${laborCostTotal.toLocaleString()}`,
      columns: ["Slip No.", "Beneficiary", "Description", "Amount", "Encoded By"],
      rows: slips.filter((slip) => slip.laborAmount > 0).map((slip) => [slip.slipNo, slip.beneficiaryName, slip.laborDescription, money(slip.laborAmount), slip.laborEncodedBy || "-"]),
    },
    {
      name: "Approval Pipeline Status",
      type: "Approval Pipeline",
      date: latestFinanceDate(slips.filter((slip) => slip.status === "Pending Manager Approval"), ["dateSubmitted", "harvestDate"]),
      desc: "Slips awaiting Manager approval.",
      metric: `${pendingManagerCount} pending`,
      columns: ["Slip No.", "Beneficiary", "Period", "Net Income", "Status"],
      rows: slips.filter((slip) => slip.status === "Pending Manager Approval").map((slip) => [slip.slipNo, slip.beneficiaryName, slip.payrollPeriod, money(compute(slip).net), slip.status]),
    },
  ];
  const reportTypes = Array.from(new Set(reports.map((report) => report.type)));
  const filteredReports = reports
    .filter((report) => reportTypeFilter === "all" || report.type === reportTypeFilter)
    .filter((report) => !dateFrom || !report.date || report.date >= dateFrom)
    .filter((report) => !dateTo || !report.date || report.date <= dateTo)
    .sort((a, b) => sortFinanceReports(a, b, reportSort));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2"><FileBarChart2 className="h-6 w-6 text-emerald-700" />Validation Reports</h1>
        <p className="text-muted-foreground">Filter reports by type and date range before previewing or downloading.</p>
      </div>
      {!allowReportGeneration && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-start gap-3 p-4 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>Only Manager/Admin and Finance Officer accounts can generate reports.</div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Report Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-1">
            <Label>Date From</Label>
            <DateInput value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Date To</Label>
            <DateInput value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Report Type</Label>
            <Select value={reportTypeFilter} onValueChange={setReportTypeFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Report Types</SelectItem>
                {reportTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Sort By</Label>
            <Select value={reportSort} onValueChange={setReportSort}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest Date</SelectItem>
                <SelectItem value="oldest">Oldest Date</SelectItem>
                <SelectItem value="name">Report Name</SelectItem>
                <SelectItem value="type">Report Type</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" className="w-full" onClick={() => {
              setDateFrom("");
              setDateTo("");
              setReportTypeFilter("all");
              setReportSort("newest");
            }}>Reset Filters</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Available Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Report Date</TableHead>
                <TableHead className="text-right">Records</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">No reports match the selected filters.</TableCell>
                </TableRow>
              ) : filteredReports.map((report) => (
                <TableRow key={report.name}>
                  <TableCell>
                    <div className="font-medium">{report.name}</div>
                    <div className="text-xs text-muted-foreground">{report.desc}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{report.type}</Badge></TableCell>
                  <TableCell>{formatFinanceReportDate(report.date)}</TableCell>
                  <TableCell className="text-right">{report.rows.length}</TableCell>
                  <TableCell className="font-medium text-emerald-700">{report.metric}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" disabled={!allowReportGeneration} onClick={() => allowReportGeneration && setGeneratedReport(report)}>
                      View Report
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <GeneratedReportDialog report={generatedReport} canGenerate={allowReportGeneration} onClose={() => setGeneratedReport(null)} />
    </div>
  );
}

interface ReportDefinition {
  name: string;
  type: string;
  date: string;
  desc: string;
  metric: string;
  columns: string[];
  rows: string[][];
}

function latestFinanceDate(records: any[], keys: string[]) {
  const dates = records
    .flatMap((record) => keys.map((key) => financeDateKey(record?.[key])))
    .filter(Boolean)
    .sort();
  return dates.at(-1) ?? "";
}

function financeDateKey(value: unknown) {
  const raw = String(value ?? "");
  const iso = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return "";
  return new Date(parsed).toISOString().slice(0, 10);
}

function sortFinanceReports<T extends { name: string; type: string; date: string }>(a: T, b: T, sort: string) {
  if (sort === "oldest") return (a.date || "9999-12-31").localeCompare(b.date || "9999-12-31");
  if (sort === "name") return a.name.localeCompare(b.name);
  if (sort === "type") return a.type.localeCompare(b.type) || a.name.localeCompare(b.name);
  return (b.date || "0000-00-00").localeCompare(a.date || "0000-00-00");
}

function formatFinanceReportDate(date: string) {
  return date ? formatSystemDate(date) : "-";
}

function GeneratedReportDialog({ report, canGenerate, onClose }: { report: ReportDefinition | null; canGenerate: boolean; onClose: () => void }) {
  return (
    <Dialog open={!!report} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!h-[100dvh] !max-h-[100dvh] !w-screen !max-w-none overflow-hidden rounded-none p-0 sm:!max-w-none">
        {report && (
          <>
            <DialogHeader className="border-b px-4 py-3 sm:px-6 sm:py-4">
              <DialogTitle className="flex items-center gap-2 text-emerald-700">
                <FileBarChart2 className="h-5 w-5" />{report.name}
              </DialogTitle>
            </DialogHeader>
            <div className="flex h-[calc(100dvh-73px)] flex-col overflow-hidden px-4 py-4 sm:px-6">
            <div className="flex min-h-0 flex-1 flex-col space-y-4">
              <div className="grid gap-3 rounded-md border bg-slate-50 p-3 text-sm md:grid-cols-3">
                <Field label="Generated At" value={currentSystemDateTime()} />
                <Field label="Summary" value={report.metric} />
                <Field label="Record Count" value={String(report.rows.length)} />
              </div>
              <p className="text-sm text-muted-foreground">{report.desc}</p>
              <FinanceReportPdfPreview report={report} />
              <div className="-mx-4 flex flex-col-reverse gap-2 border-t bg-white px-4 py-3 sm:-mx-6 sm:flex-row sm:justify-end sm:px-6 [&>button]:w-full sm:[&>button]:w-auto">
                <Button variant="outline" className="sm:min-w-24" disabled={!canGenerate} onClick={() => canGenerate && printReport(report)}>
                  <Printer className="mr-1.5 h-4 w-4" />Print
                </Button>
                <Button variant="outline" className="sm:min-w-28" disabled={!canGenerate} onClick={() => canGenerate && downloadReportPdf(report)}>
                  Download PDF
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 sm:min-w-24" onClick={onClose}>Close</Button>
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

function FinanceReportPdfPreview({ report }: { report: ReportDefinition }) {
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    const doc = buildFinanceReportPdf(report);
    const url = URL.createObjectURL(doc.output("blob"));
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [report]);

  return (
    <div className="min-h-0 flex-1 overflow-hidden rounded-md border bg-slate-100">
      {previewUrl ? (
        <iframe
          title={`${report.name} PDF Preview`}
          src={`${previewUrl}#toolbar=1&navpanes=0&zoom=page-width`}
          className="h-full w-full bg-white"
        />
      ) : (
        <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">Preparing PDF preview...</div>
      )}
    </div>
  );
}

function buildFinanceReportPdf(report: ReportDefinition) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 36;
  const generatedAt = currentSystemDateTime();

  doc.setTextColor(4, 120, 87);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(report.name, margin, 42);

  doc.setDrawColor(5, 150, 105);
  doc.setLineWidth(1.5);
  doc.line(margin, 56, pageWidth - margin, 56);

  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(doc.splitTextToSize(report.desc, pageWidth - (margin * 2)), margin, 76);

  const metaTop = 98;
  const gap = 10;
  const boxWidth = (pageWidth - (margin * 2) - (gap * 2)) / 3;
  drawFinancePdfMetaBox(doc, margin, metaTop, boxWidth, "Generated At", generatedAt);
  drawFinancePdfMetaBox(doc, margin + boxWidth + gap, metaTop, boxWidth, "Summary", report.metric);
  drawFinancePdfMetaBox(doc, margin + (boxWidth + gap) * 2, metaTop, boxWidth, "Records", String(report.rows.length));

  autoTable(doc, {
    startY: metaTop + 58,
    head: [report.columns],
    body: report.rows.length ? report.rows : [["No records available for this report.", ...Array(Math.max(0, report.columns.length - 1)).fill("")]],
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
      doc.text(`DARBCO Agri Workflow - ${report.name}`, margin, doc.internal.pageSize.getHeight() - 18);
      doc.text(`Page ${pageNumber}`, pageWidth - margin - 32, doc.internal.pageSize.getHeight() - 18);
    },
  });

  return doc;
}

function drawFinancePdfMetaBox(doc: jsPDF, x: number, y: number, width: number, label: string, value: string) {
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

function downloadReportPdf(report: ReportDefinition) {
  buildFinanceReportPdf(report).save(`${financeReportFileName(report)}.pdf`);
}

function financeReportFileName(report: ReportDefinition) {
  return report.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
