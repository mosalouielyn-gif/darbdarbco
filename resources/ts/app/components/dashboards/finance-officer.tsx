import { useMemo, useState } from "react";
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
import {
  LayoutDashboard, ClipboardCheck, ClipboardList, Undo2, History, FileBarChart2,
  Search, CheckCircle2, AlertCircle, Eye, Printer, ChevronLeft, ChevronRight, ShieldCheck,
} from "lucide-react";
import { User } from "../types";
import { toast } from "sonner";

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
  materialCredits: MaterialCredit[];
  laborDescription: string; laborAmount: number; laborRemarks: string; laborEncodedBy: string; laborDateEncoded: string;
  prevBalance: number;
  otherDeductions: OtherDeduction[];
  // Source-of-truth from Production Clerk (for verification)
  productionSource: ProductionSource;
  returnReason?: { category: string; reason: string; remarks?: string; returnedBy: string; dateReturned: string };
}

const SEED: FoSlip[] = [
  {
    slipNo: "PB-2026-0002",
    productionRecordId: "PR-2026-0531-01",
    beneficiaryId: "B-001",
    beneficiaryName: "Roberto Cruz",
    payrollPeriod: "May 16 – May 31, 2026",
    harvestDate: "2026-05-28",
    preparedBy: "Ana Dela Cruz",
    dateSubmitted: "2026-05-31 14:20",
    status: "Submitted to Finance",
    classA: 60, classB: 20, special: 6,
    materialCredits: [
      { date: "2026-05-15", material: "Complete Fertilizer", qty: 2, unit: "sacks", unitPrice: 1000, status: "Unpaid" },
      { date: "2026-05-18", material: "Fungicide (Mancozeb)", qty: 1, unit: "bottle", unitPrice: 500, status: "Unpaid" },
    ],
    laborDescription: "Harvesting and production labor",
    laborAmount: 3500,
    laborRemarks: "Crew A — three-day harvest cycle",
    laborEncodedBy: "Ana Dela Cruz",
    laborDateEncoded: "2026-05-31 13:55",
    prevBalance: 0,
    otherDeductions: [],
    productionSource: { classA: 60, classB: 20, special: 6 },
  },
  {
    slipNo: "PB-2026-0003",
    productionRecordId: "PR-2026-0531-03",
    beneficiaryId: "B-002",
    beneficiaryName: "Liza Mariano",
    payrollPeriod: "May 16 – May 31, 2026",
    harvestDate: "2026-05-27",
    preparedBy: "Ana Dela Cruz",
    dateSubmitted: "2026-05-31 14:42",
    status: "Submitted to Finance",
    classA: 48, classB: 12, special: 8,
    materialCredits: [
      { date: "2026-05-12", material: "Insecticide (Cypermethrin)", qty: 1, unit: "L", unitPrice: 720, status: "Unpaid" },
    ],
    laborDescription: "Harvesting and packing labor",
    laborAmount: 2800,
    laborRemarks: "",
    laborEncodedBy: "Ana Dela Cruz",
    laborDateEncoded: "2026-05-31 14:30",
    prevBalance: 0,
    otherDeductions: [],
    productionSource: { classA: 48, classB: 14, special: 8 }, // mismatch on Class B for demo
  },
  {
    slipNo: "PB-2026-0001",
    productionRecordId: "PR-2026-0531-02",
    beneficiaryId: "B-004",
    beneficiaryName: "Helena Pascual",
    payrollPeriod: "May 16 – May 31, 2026",
    harvestDate: "2026-05-29",
    preparedBy: "Ana Dela Cruz",
    dateSubmitted: "2026-05-30 16:10",
    status: "Approved",
    classA: 84, classB: 36, special: 4,
    materialCredits: [
      { date: "2026-05-10", material: "Banana Bags (Blue)", qty: 200, unit: "pcs", unitPrice: 12.5, status: "Partially Paid" },
    ],
    laborDescription: "Harvesting and packing labor",
    laborAmount: 3500,
    laborRemarks: "",
    laborEncodedBy: "Ana Dela Cruz",
    laborDateEncoded: "2026-05-30 15:45",
    prevBalance: 1200,
    otherDeductions: [{ type: "Other Authorized", description: "Tool replacement", amount: 200, ref: "ADJ-2026-0009" }],
    productionSource: { classA: 84, classB: 36, special: 4 },
  },
];

function compute(s: FoSlip) {
  const subA = s.classA * PRICES.A;
  const subB = s.classB * PRICES.B;
  const subSpecial = s.special * PRICES.special;
  const gross = subA + subB + subSpecial;
  const matTotal = s.materialCredits.reduce((sum, d) => sum + d.qty * d.unitPrice, 0);
  const otherTotal = s.otherDeductions.reduce((sum, d) => sum + d.amount, 0);
  const totalDed = matTotal + s.laborAmount + s.prevBalance + otherTotal;
  const net = gross - totalDed;
  return { subA, subB, subSpecial, gross, matTotal, otherTotal, totalDed, net };
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

export function FinanceOfficerDashboard({ user, onLogout }: Props) {
  const [active, setActive] = useState("dashboard");
  const [slips, setSlips] = useState<FoSlip[]>(SEED);
  const [reviewSlip, setReviewSlip] = useState<FoSlip | null>(null);

  const openReview = (slip: FoSlip) => setReviewSlip(slip);
  const closeReview = () => setReviewSlip(null);

  const validate = (slipNo: string) => {
    setSlips((cur) => cur.map((s) => s.slipNo === slipNo ? { ...s, status: "Pending Manager Approval" } : s));
    toast.success(`${slipNo} validated and forwarded to Manager`);
    closeReview();
  };

  const returnSlip = (slipNo: string, payload: { category: string; reason: string; remarks?: string }) => {
    setSlips((cur) => cur.map((s) => s.slipNo === slipNo ? {
      ...s, status: "Returned for Correction",
      returnReason: { ...payload, returnedBy: user.name, dateReturned: new Date().toISOString().slice(0, 16).replace("T", " ") },
    } : s));
    toast.success(`${slipNo} returned to Payroll Personnel`);
    closeReview();
  };

  return (
    <DarbcoLayout user={user} onLogout={onLogout} navItems={NAV} active={active} onChange={setActive}>
      {active === "dashboard" && <Dashboard slips={slips} goTo={setActive} onReview={openReview} />}
      {active === "pending" && <SlipList title="Pending Validation" slips={slips} filter={(s) => s.status === "Submitted to Finance"} onReview={openReview} />}
      {active === "validated" && <SlipList title="Validated Payrolls" slips={slips} filter={(s) => s.status === "Validated by Finance" || s.status === "Pending Manager Approval"} onReview={openReview} />}
      {active === "returned" && <SlipList title="Returned Payrolls" slips={slips} filter={(s) => s.status === "Returned for Correction"} onReview={openReview} />}
      {active === "history" && <SlipList title="Payroll History" slips={slips} filter={() => true} onReview={openReview} />}
      {active === "reports" && <Reports />}

      <ValidationDetailsDialog
        slip={reviewSlip}
        onClose={closeReview}
        onValidate={validate}
        onReturn={returnSlip}
      />
    </DarbcoLayout>
  );
}

function Dashboard({ slips, goTo, onReview }: { slips: FoSlip[]; goTo: (id: string) => void; onReview: (s: FoSlip) => void }) {
  const pending = slips.filter((s) => s.status === "Submitted to Finance");
  const validated = slips.filter((s) => s.status === "Validated by Finance" || s.status === "Pending Manager Approval");
  const returned = slips.filter((s) => s.status === "Returned for Correction");
  const pendingMgr = slips.filter((s) => s.status === "Pending Manager Approval");
  const approved = slips.filter((s) => s.status === "Approved");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-emerald-700" />Finance Officer Dashboard</h1>
        <div className="text-muted-foreground">May 31, 2026 • Period: May 16 – May 31, 2026</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi color="violet" label="Pending Validation" value={String(pending.length)} sub="Awaiting review" onClick={() => goTo("pending")} />
        <Kpi color="amber" label="Validated Payrolls" value={String(validated.length)} sub="Forwarded to Manager" onClick={() => goTo("validated")} />
        <Kpi color="red" label="Returned for Correction" value={String(returned.length)} sub="Sent back to Payroll" onClick={() => goTo("returned")} />
        <Kpi color="sky" label="Pending Manager Approval" value={String(pendingMgr.length)} sub="With Manager" onClick={() => goTo("validated")} />
        <Kpi color="emerald" label="Approved Payrolls" value={String(approved.length)} sub="Final approval done" onClick={() => goTo("history")} />
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
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input placeholder="Search beneficiary name..." className="pl-8 h-9" value={searchName} onChange={(e) => setSearchName(e.target.value)} />
            </div>
            <Input placeholder="Payroll slip number" className="w-48 h-9" value={slipNo} onChange={(e) => setSlipNo(e.target.value)} />
            <Input type="date" className="w-44 h-9" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} />
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-56 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payroll Periods</SelectItem>
                <SelectItem value="May 16 – May 31, 2026">May 16 – May 31, 2026</SelectItem>
                <SelectItem value="May 1 – May 15, 2026">May 1 – May 15, 2026</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-52 h-9"><SelectValue /></SelectTrigger>
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
  onValidate: (slipNo: string) => void;
  onReturn: (slipNo: string, payload: { category: string; reason: string; remarks?: string }) => void;
}) {
  const [showReturn, setShowReturn] = useState(false);
  const [retCategory, setRetCategory] = useState("");
  const [retReason, setRetReason] = useState("");
  const [retRemarks, setRetRemarks] = useState("");

  const c = useMemo(() => slip ? compute(slip) : null, [slip]);

  const checklist = useMemo(() => {
    if (!slip || !c) return [];
    const src = slip.productionSource;
    const boxesMatch = src.classA === slip.classA && src.classB === slip.classB && src.special === slip.special;
    return [
      { area: "Beneficiary Information", detail: "Beneficiary name and ID are correct", ok: !!slip.beneficiaryName && !!slip.beneficiaryId },
      { area: "Production Record", detail: "Harvest date and production record are correct", ok: !!slip.harvestDate && !!slip.productionRecordId },
      { area: "Product Classification", detail: "Class A, Class B, and Special Product quantities match", ok: boxesMatch },
      { area: "Price Computation", detail: "Correct price is applied per classification", ok: PRICES.A > 0 && PRICES.B > 0 && PRICES.special > 0 },
      { area: "Gross Income", detail: "Earnings computation is accurate", ok: c.gross === slip.classA * PRICES.A + slip.classB * PRICES.B + slip.special * PRICES.special },
      { area: "Material Credit Deductions", detail: "Credit transactions match the Inventory Bookkeeper's records", ok: slip.materialCredits.every((m) => m.status === "Unpaid" || m.status === "Partially Paid") },
      { area: "Labor Cost", detail: "Labor cost is complete and properly recorded", ok: slip.laborAmount > 0 && slip.laborDescription.trim().length > 0 },
      { area: "Other Deductions", detail: "Additional deductions contain valid details", ok: slip.otherDeductions.every((d) => d.description.trim().length > 0 && d.amount > 0) },
      { area: "Total Deductions", detail: "All applicable deductions are included", ok: c.totalDed === c.matTotal + slip.laborAmount + slip.prevBalance + c.otherTotal },
      { area: "Net Income", detail: "Final amount is correct", ok: c.net === c.gross - c.totalDed },
    ];
  }, [slip, c]);

  const allOk = checklist.length > 0 && checklist.every((x) => x.ok);

  if (!slip || !c) return null;

  const closeAndReset = () => {
    setShowReturn(false); setRetCategory(""); setRetReason(""); setRetRemarks("");
    onClose();
  };

  const submitReturn = () => {
    if (!retCategory) { toast.error("Error category is required"); return; }
    if (!retReason.trim()) { toast.error("Reason for return is required"); return; }
    onReturn(slip.slipNo, { category: retCategory, reason: retReason, remarks: retRemarks });
    setShowReturn(false); setRetCategory(""); setRetReason(""); setRetRemarks("");
  };

  return (
    <Dialog open={!!slip} onOpenChange={(o) => !o && closeAndReset()}>
      <DialogContent className="!max-w-[95vw] w-[95vw] sm:!max-w-[1200px] sm:w-[1200px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payroll Validation Details — {slip.slipNo}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Section A */}
          <SectionCard title="Section A — Beneficiary and Payroll Information" tone="emerald">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                <TableRow><TableCell>Class A</TableCell><TableCell className="text-right">{slip.classA}</TableCell><TableCell className="text-right">₱{PRICES.A.toLocaleString()}</TableCell><TableCell className="text-right">₱{c.subA.toLocaleString()}</TableCell><TableCell><Badge className="bg-emerald-100 text-emerald-800">Correct</Badge></TableCell></TableRow>
                <TableRow><TableCell>Class B</TableCell><TableCell className="text-right">{slip.classB}</TableCell><TableCell className="text-right">₱{PRICES.B.toLocaleString()}</TableCell><TableCell className="text-right">₱{c.subB.toLocaleString()}</TableCell><TableCell><Badge className="bg-emerald-100 text-emerald-800">Correct</Badge></TableCell></TableRow>
                <TableRow><TableCell>Special Product</TableCell><TableCell className="text-right">{slip.special}</TableCell><TableCell className="text-right">₱{PRICES.special.toLocaleString()}</TableCell><TableCell className="text-right">₱{c.subSpecial.toLocaleString()}</TableCell><TableCell><Badge className="bg-emerald-100 text-emerald-800">Correct</Badge></TableCell></TableRow>
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Labor Cost Description" value={slip.laborDescription} />
              <Field label="Labor Cost Amount" value={`₱${slip.laborAmount.toLocaleString()}`} />
              <Field label="Remarks" value={slip.laborRemarks || "—"} />
              <Field label="Encoded By" value={slip.laborEncodedBy} />
              <Field label="Date Encoded" value={slip.laborDateEncoded} />
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Validation Result</div>
                {slip.laborAmount > 0 && slip.laborDescription.trim().length > 0
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
              disabled={slip.status !== "Submitted to Finance"}
              onClick={() => setShowReturn(true)}>
              <Undo2 className="h-4 w-4 mr-1" />Return for Correction
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
              disabled={!allOk || slip.status !== "Submitted to Finance"}
              onClick={() => onValidate(slip.slipNo)}>
              <CheckCircle2 className="h-4 w-4 mr-1" />Validate Payroll
            </Button>
            <Button variant="outline" onClick={closeAndReset}>Cancel</Button>
          </div>
        </div>

        {/* Return for Correction Modal */}
        <Dialog open={showReturn} onOpenChange={(o) => !o && setShowReturn(false)}>
          <DialogContent className="!max-w-[95vw] w-[95vw] sm:!max-w-[640px] sm:w-[640px]">
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
                <Field label="Date Returned" value={new Date().toISOString().slice(0, 16).replace("T", " ")} />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setShowReturn(false)}>Cancel</Button>
                <Button className="bg-red-600 hover:bg-red-700" onClick={submitReturn}>
                  <Undo2 className="h-4 w-4 mr-1" />Confirm Return
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

function Reports() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2"><FileBarChart2 className="h-6 w-6 text-emerald-700" />Validation Reports</h1>
        <p className="text-muted-foreground">Generate payroll validation reports for the selected period or date range.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { name: "Validated Payroll Register", desc: "All payroll slips validated by Finance." },
          { name: "Returned Payroll Register", desc: "Slips returned for correction with categories." },
          { name: "Validation Turnaround", desc: "Average time from submission to validation." },
          { name: "Material Credit Audit", desc: "Material credits charged in validated payrolls." },
          { name: "Labor Cost Audit", desc: "Labor cost amounts across validated payrolls." },
          { name: "Approval Pipeline Status", desc: "Slips awaiting Manager approval." },
        ].map((r) => (
          <Card key={r.name} className="hover:border-emerald-400 transition cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center"><FileBarChart2 className="h-4 w-4" /></div>
                <div>{r.name}</div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{r.desc}</p>
              <Button variant="outline" size="sm">Generate</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
