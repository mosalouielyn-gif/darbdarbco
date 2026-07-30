import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import { DarbcoLayout } from "../darbco-layout";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { DateInput } from "../ui/date-input";
import {
  LayoutDashboard, Wallet, FileText, History, Plus, Search, Eye, Edit,
  Send, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Printer, Download, Save, X, Loader2,
} from "lucide-react";
import { User } from "../types";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { useAppData } from "../../lib/app-data-context";
import { createPayrollSlip, submitPayrollSlip, updatePayrollSlip } from "../../lib/api";
import { currentPayrollPeriodLabel, databaseDateKey, formatSystemDate, formatSystemDateTime, todaySystemDate } from "../../lib/date-time";
import { usePersistentState } from "../../lib/use-persistent-state";

interface Props { user: User; onLogout: () => void }

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "beneficiary", label: "Beneficiary Payroll History", icon: <Wallet className="h-4 w-4" /> },
];

export function PayrollPersonnelDashboard({ user, onLogout }: Props) {
  const { data } = useAppData();
  const [active, setActive] = usePersistentState("darbco.payrollPersonnel.active", "dashboard");
  const [prepareSignal, setPrepareSignal] = useState(0);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const beneficiaries = uniqueBeneficiaries((data?.beneficiaries ?? []).map(mapBeneficiary));
  const productionRecords = (data?.productionRecords ?? []).map(mapProductionRecord);
  const creditTransactions = (data?.creditTransactions ?? []).map(mapCreditTransaction);

  useEffect(() => {
    setPayrollRecords((data?.payrollSlips ?? []).map(mapPayrollSlip));
  }, [data?.payrollSlips]);

  const openPreparePayroll = () => {
    setPrepareSignal((current) => current + 1);
    setActive("work");
  };

  return (
    <DarbcoLayout user={user} onLogout={onLogout} navItems={NAV} active={active} onChange={setActive}>
      {active === "dashboard" && <Dashboard onNavigate={setActive} onPrepare={openPreparePayroll} />}
      {active === "work" && <BeneficiaryPayroll mode="work" user={user} beneficiaries={beneficiaries} productionRecords={productionRecords} creditTransactions={creditTransactions} payrollRecords={payrollRecords} setPayrollRecords={setPayrollRecords} prepareSignal={prepareSignal} />}
      {active === "beneficiary" && <BeneficiaryPayroll mode="history" user={user} beneficiaries={beneficiaries} productionRecords={productionRecords} creditTransactions={creditTransactions} payrollRecords={payrollRecords} setPayrollRecords={setPayrollRecords} prepareSignal={0} />}
    </DarbcoLayout>
  );
}

function Dashboard({ onNavigate, onPrepare }: { onNavigate: (id: string) => void; onPrepare: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-emerald-700" />Payroll Dashboard
        </h1>
        <div className="text-muted-foreground">{formatSystemDate()}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          label="Pending Payroll"
          value="2"
          subtext="Awaiting preparation"
          color="amber"
          onClick={() => onNavigate("beneficiary")}
        />
        <KpiCard
          label="For Validation"
          value="1"
          subtext="Submitted to Finance"
          color="violet"
          onClick={() => onNavigate("beneficiary")}
        />
        <KpiCard
          label="Approved Payroll"
          value="3"
          subtext="Ready for release"
          color="emerald"
          onClick={() => onNavigate("beneficiary")}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              className="h-20 bg-emerald-600 hover:bg-emerald-700 justify-start"
              onClick={onPrepare}
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Plus className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">Prepare Beneficiary Payroll</div>
                  <div className="text-xs opacity-90">Calculate earnings and deductions</div>
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-20 justify-start border-emerald-200 hover:bg-emerald-50"
              onClick={() => onNavigate("beneficiary")}
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <History className="h-6 w-6 text-emerald-700" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-emerald-700">View Beneficiary Payroll History</div>
                  <div className="text-xs text-muted-foreground">Access all payroll history</div>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, subtext, color, onClick }: any) {
  const bgColor = color === "emerald" ? "bg-emerald-100" : color === "amber" ? "bg-amber-100" : "bg-violet-100";
  const textColor = color === "emerald" ? "text-emerald-700" : color === "amber" ? "text-amber-700" : "text-violet-700";

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-5">
        <div className="text-muted-foreground text-xs mb-1">{label}</div>
        <div className={`break-words text-2xl font-bold sm:text-3xl ${textColor}`}>{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{subtext}</div>
      </CardContent>
    </Card>
  );
}

function CurrencyInput({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return (
    <div className="relative ml-auto w-32">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">&#8369;</span>
      <Input
        aria-label={label}
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 pl-7 text-right"
      />
    </div>
  );
}

type PayrollRecord = {
  id: number;
  slipNo: string;
  period: string;
  beneficiary: string;
  beneficiaryId?: number;
  beneficiaryCode?: string;
  beneficiaryContactNumber?: string;
  beneficiaryAddress?: string;
  productionRecordId?: number;
  harvestDate: string;
  totalBoxes: number;
  grossIncome: number;
  totalDeductions: number;
  netIncome: number;
  validationStatus: string;
  approvalStatus: string;
  classABoxes?: number;
  classBBoxes?: number;
  specialBoxes?: number;
  classAPrice?: number;
  classBPrice?: number;
  specialPrice?: number;
  creditDeduction?: number;
  previousBalance?: number;
  laborCost?: number;
  otherDeductions?: number;
  otherDeductionItems?: OtherAuthorizedDeductionItem[];
  preparedByName?: string;
  validatedByName?: string;
  approvedByName?: string;
};

type OtherAuthorizedDeductionItem = {
  type: string;
  amount: number;
};

type BeneficiaryOption = { id: string; dbId: number; code: string; name: string; contactNumber?: string; address?: string };
type PayrollProductionRecord = {
  dbId: number;
  sourceTable: string;
  refNo: string;
  beneficiaryId?: number;
  beneficiaryName: string;
  harvestDate: string;
  classA: number;
  classB: number;
  special: number;
  total: number;
  classA_big: number;
  classA_small: number;
  classA_cp: number;
  classB_big: number;
  classB_small: number;
  classB_cp: number;
};
type PayrollCreditMaterial = {
  refNo: string;
  dateIssued: string;
  beneficiaryName: string;
  beneficiaryAccountId: string;
  materialName: string;
  quantity: number;
  unit: string;
  amountCharged: number;
  status: string;
  remaining: number;
  deductionAmount: number;
};

const DEFAULT_DEDUCTION_TYPES = ["SSS", "Pag-IBIG", "Other Approved Deductions"];
const MIN_AUTHORIZED_DEDUCTION_AMOUNT = 1;

function mapBeneficiary(row: any): BeneficiaryOption {
  return {
    id: String(row.id),
    dbId: Number(row.id),
    code: String(row.code ?? row.beneficiary_code ?? row.id),
    name: formatBeneficiaryDisplayName(row.name ?? row.full_name ?? ""),
    contactNumber: String(row.contact_number ?? row.contact ?? "").trim(),
    address: String(row.address ?? "").trim(),
  };
}

function uniqueBeneficiaries(rows: BeneficiaryOption[]) {
  const byName = new Map<string, BeneficiaryOption>();
  rows.forEach((row) => {
    const key = row.name.trim().toLowerCase();
    if (!key) return;
    byName.set(key, row);
  });
  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function formatBeneficiaryDisplayName(name: string) {
  const cleanName = String(name ?? "").trim().replace(/\s+/g, " ");
  if (!cleanName || cleanName.includes(",")) return cleanName;

  const parts = cleanName.split(" ");
  if (parts.length < 2) return cleanName;

  const firstName = parts[0];
  const middleParts = parts.slice(1, -1);
  let lastNameParts = [parts[parts.length - 1]];
  const surnamePrefixes = ["de", "del", "dela", "de la", "van", "von", "san", "santa"];
  const possiblePrefix = middleParts[middleParts.length - 1]?.toLowerCase();

  if (possiblePrefix && surnamePrefixes.includes(possiblePrefix)) {
    lastNameParts = [middleParts.pop() as string, ...lastNameParts];
  }

  const middleInitial = middleParts.length > 0 ? `${middleParts[0].replace(".", "").charAt(0).toUpperCase()}.` : "";
  return `${lastNameParts.join(" ")}, ${[firstName, middleInitial].filter(Boolean).join(" ")}`;
}

function beneficiaryNameKey(name: string) {
  return formatBeneficiaryDisplayName(name)
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .split(/\s+/)
    .filter((part) => part && part.length > 1)
    .join(" ");
}

function sameBeneficiaryName(left: string, right: string) {
  return beneficiaryNameKey(left) === beneficiaryNameKey(right);
}

function mapPayrollSlip(row: any): PayrollRecord {
  const classABoxes = Number(row.class_a_boxes ?? 0);
  const classBBoxes = Number(row.class_b_boxes ?? 0);
  const specialBoxes = Number(row.special_boxes ?? row.special_product_boxes ?? 0);
  const otherDeductionItems = (Array.isArray(row.deductions) ? row.deductions : [])
    .map((deduction: any) => ({
      type: String(deduction.deduction_type ?? deduction.type ?? "Other Authorized Deduction"),
      amount: Number(deduction.amount ?? 0),
    }))
    .filter((deduction) => deduction.amount > 0);

  return {
    id: Number(row.id),
    slipNo: String(row.slip_no ?? row.slipNo ?? row.id),
    period: row.payroll_period ?? row.period ?? "",
    beneficiary: row.beneficiary_name ?? row.beneficiary ?? "",
    beneficiaryId: Number(row.beneficiary_id) || undefined,
    beneficiaryCode: row.beneficiary_code ?? "",
    beneficiaryContactNumber: row.beneficiary_contact_number ?? row.contact_number ?? "",
    beneficiaryAddress: row.beneficiary_address ?? row.address ?? "",
    productionRecordId: Number(row.production_record_id ?? row.production_box_record_id) || undefined,
    harvestDate: row.harvest_date ? String(row.harvest_date).slice(0, 10) : databaseDateKey(row.created_at ?? todaySystemDate()),
    totalBoxes: Number(row.total_boxes ?? classABoxes + classBBoxes + specialBoxes),
    grossIncome: Number(row.gross_amount ?? row.gross_income ?? 0),
    totalDeductions: Number(row.total_deductions ?? 0),
    netIncome: Number(row.net_amount ?? row.net_income ?? 0),
    validationStatus: row.validation_status ?? "Draft",
    approvalStatus: row.approval_status ?? "Pending Approval",
    classABoxes,
    classBBoxes,
    specialBoxes,
    classAPrice: Number(row.class_a_price ?? 0),
    classBPrice: Number(row.class_b_price ?? 0),
    specialPrice: Number(row.special_price ?? 0),
    creditDeduction: Number(row.credit_deduction ?? row.material_deduction ?? 0),
    previousBalance: Number(row.previous_balance ?? 0),
    laborCost: Number(row.labor_cost ?? 0),
    otherDeductions: Number(row.other_deductions ?? 0),
    otherDeductionItems,
    preparedByName: row.prepared_by_name ?? "",
    validatedByName: row.validated_by_name ?? "",
    approvedByName: row.approved_by_name ?? "",
  };
}

function mapProductionRecord(row: any): PayrollProductionRecord {
  const classABig = Number(row.class_a_big_hands ?? row.class_a_big ?? 0);
  const classASmall = Number(row.class_a_small_hands ?? row.class_a_small ?? 0);
  const classACp = Number(row.class_a_cps ?? row.class_a_cp ?? 0);
  const classBBig = Number(row.class_b_big_hands ?? row.class_b_big ?? 0);
  const classBSmall = Number(row.class_b_small_hands ?? row.class_b_small ?? 0);
  const classBCp = Number(row.class_b_cps ?? row.class_b_cp ?? 0);
  const classA = classABig + classASmall + classACp;
  const classB = classBBig + classBSmall + classBCp;
  const special = Number(row.special_total ?? row.special_product ?? row.special ?? 0);

  return {
    dbId: Number(row.id),
    sourceTable: String(row.source_table ?? "production_records"),
    refNo: String(row.record_no ?? row.reference_no ?? row.id),
    beneficiaryId: Number(row.beneficiary_id) || undefined,
    beneficiaryName: row.beneficiary_name ?? "",
    harvestDate: String(row.harvest_date ?? row.packing_date ?? row.production_date ?? "").slice(0, 10),
    classA,
    classB,
    special,
    total: Number(row.total_boxes ?? classA + classB + special),
    classA_big: classABig,
    classA_small: classASmall,
    classA_cp: classACp,
    classB_big: classBBig,
    classB_small: classBSmall,
    classB_cp: classBCp,
  };
}

function mapCreditTransaction(row: any): PayrollCreditMaterial {
  const deductions = Array.isArray(row.deductions) ? row.deductions : [];
  const deductionAmount = deductions.reduce((sum: number, deduction: any) => sum + Number(deduction.amount ?? 0), 0);

  return {
    refNo: String(row.credit_no ?? row.release_reference_no ?? row.id),
    dateIssued: String(row.credit_date ?? row.created_at ?? "").slice(0, 10),
    beneficiaryName: row.beneficiary_name ?? row.beneficiary ?? "",
    beneficiaryAccountId: String(row.beneficiary_account_id ?? ""),
    materialName: row.material_name ?? row.material ?? "",
    quantity: Number(row.quantity ?? 0),
    unit: row.unit ?? "",
    amountCharged: Number(row.amount ?? row.amount_charged ?? 0),
    status: row.status ?? "Pending",
    remaining: Number(row.remaining_balance ?? row.remaining ?? 0),
    deductionAmount,
  };
}

function beneficiaryAccountId(name: string) {
  const normalized = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  return normalized ? `BEN-${normalized}` : "";
}

function payrollPeriodRange(period: string): { start: Date; end: Date } | null {
  const match = period.match(/([A-Za-z]+)\s+(\d{1,2})-(\d{1,2}),\s*(\d{4})/);
  if (!match) return null;
  const start = new Date(`${match[1]} ${match[2]}, ${match[4]} 00:00:00`);
  const end = new Date(`${match[1]} ${match[3]}, ${match[4]} 23:59:59`);
  return Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) ? null : { start, end };
}

function currentUserId(user: User) {
  const id = Number(user.id);
  return Number.isFinite(id) ? id : undefined;
}

function payrollPayload(record: PayrollRecord, user: User) {
  return {
    slip_no: record.slipNo,
    beneficiary_id: record.beneficiaryId ?? 0,
    beneficiary_name: record.beneficiary,
    beneficiary_code: record.beneficiaryCode,
    beneficiary_contact_number: record.beneficiaryContactNumber,
    beneficiary_address: record.beneficiaryAddress,
    production_record_id: record.productionRecordId,
    payroll_period: record.period,
    harvest_date: record.harvestDate,
    class_a_boxes: record.classABoxes ?? 0,
    class_b_boxes: record.classBBoxes ?? 0,
    special_boxes: record.specialBoxes ?? 0,
    class_a_price: record.classAPrice ?? 0,
    class_b_price: record.classBPrice ?? 0,
    special_price: record.specialPrice ?? 0,
    material_deduction: record.creditDeduction ?? 0,
    previous_balance: record.previousBalance ?? 0,
    labor_cost: record.laborCost ?? 0,
    other_deductions: record.otherDeductions ?? 0,
    other_deduction_items: record.otherDeductionItems ?? [],
    gross_amount: record.grossIncome,
    credit_deduction: record.creditDeduction ?? 0,
    total_deductions: record.totalDeductions,
    net_amount: record.netIncome,
    validation_status: record.validationStatus,
    approval_status: record.approvalStatus,
    user_id: currentUserId(user),
    user_name: user.name,
  };
}

type PayrollAuditRecord = {
  id: number;
  slipNo: string;
  action: "Created" | "Edited" | "Submitted" | "Resubmitted";
  account: string;
  role: string;
  timestamp: string;
  remarks: string;
};

function BeneficiaryPayroll({ mode, user, beneficiaries, productionRecords, creditTransactions, payrollRecords, setPayrollRecords, prepareSignal }: {
  mode: "work" | "history";
  user: User;
  beneficiaries: BeneficiaryOption[];
  productionRecords: PayrollProductionRecord[];
  creditTransactions: PayrollCreditMaterial[];
  payrollRecords: PayrollRecord[];
  setPayrollRecords: Dispatch<SetStateAction<PayrollRecord[]>>;
  prepareSignal: number;
}) {
  const [openPrepare, setOpenPrepare] = useState(false);
  const [viewSlip, setViewSlip] = useState<PayrollRecord | null>(null);
  const [editRecord, setEditRecord] = useState<PayrollRecord | null>(null);
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all-period");
  const [auditRecords, setAuditRecords] = useState<PayrollAuditRecord[]>([]);
  const currentPeriod = currentPayrollPeriodLabel();
  const visibleRecords = payrollRecords.filter((record) => mode === "history" ? record.approvalStatus === "Approved" : record.approvalStatus !== "Approved");
  const periodOptions = Array.from(new Set([currentPeriod, ...visibleRecords.map((record) => record.period).filter(Boolean)]));

  useEffect(() => {
    if (mode === "work" && prepareSignal > 0) {
      setEditRecord(null);
      setOpenPrepare(true);
    }
  }, [mode, prepareSignal]);

  const getValidationBadge = (status: string) => {
    if (status === "Draft") return <Badge className="bg-slate-100 text-slate-700">Draft</Badge>;
    if (status === "Submitted for Validation") return <Badge className="bg-violet-100 text-violet-700">Submitted</Badge>;
    if (status === "Validated") return <Badge className="bg-emerald-100 text-emerald-700">Validated</Badge>;
    return <Badge className="bg-amber-100 text-amber-700">Returned</Badge>;
  };

  const getApprovalBadge = (status: string) => {
    if (status === "Approved") return <Badge className="bg-emerald-100 text-emerald-700">Approved</Badge>;
    if (status === "Rejected") return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
    return <Badge className="bg-slate-100 text-slate-700">Pending</Badge>;
  };

  const filteredRecords = visibleRecords.filter((record) => {
    const q = search.trim().toLowerCase();
    if (q && !record.slipNo.toLowerCase().includes(q) && !record.beneficiary.toLowerCase().includes(q)) return false;

    if (periodFilter !== "all-period" && record.period !== periodFilter) return false;

    return true;
  });

  const createAuditRecord = (slip: PayrollRecord, action: PayrollAuditRecord["action"], remarks: string) => {
    setAuditRecords((current) => [
      {
        id: Date.now() + current.length,
        slipNo: slip.slipNo,
        action,
        account: user.name,
        role: "Payroll Personnel",
        timestamp: formatSystemDateTime(),
        remarks,
      },
      ...current,
    ]);
  };

  const handleSavePayroll = async (record: PayrollRecord) => {
    const existing = payrollRecords.find((item) => item.id === record.id);
    const isSubmitted = record.validationStatus === "Submitted for Validation";

    try {
      const payload = payrollPayload(record, user);
      const saved = existing
        ? await updatePayrollSlip(existing.id, payload)
        : await createPayrollSlip(payload);
      const savedRecord = mapPayrollSlip(saved);

      setPayrollRecords((current) => {
        return existing
          ? current.map((item) => item.id === existing.id ? savedRecord : item)
          : [savedRecord, ...current];
      });

      if (!existing) {
        createAuditRecord(savedRecord, "Created", `Payroll slip ${savedRecord.slipNo} created for ${savedRecord.beneficiary}.`);
        if (isSubmitted) {
          createAuditRecord(savedRecord, "Submitted", `Payroll slip ${savedRecord.slipNo} submitted to Finance for validation.`);
        }
      } else if (isSubmitted) {
        const action = existing.validationStatus === "Returned for Correction" ? "Resubmitted" : "Submitted";
        createAuditRecord(
          savedRecord,
          action,
          action === "Resubmitted"
            ? `Corrected payroll slip ${savedRecord.slipNo} resubmitted to Finance for validation.`
            : `Payroll slip ${savedRecord.slipNo} submitted to Finance for validation.`
        );
      } else {
        createAuditRecord(savedRecord, "Edited", `Payroll slip ${savedRecord.slipNo} draft details updated.`);
      }

      setOpenPrepare(false);
      setEditRecord(null);
      toast.success(savedRecord.validationStatus === "Submitted for Validation" ? "Payroll submitted for validation" : "Payroll draft saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save payroll slip.");
      throw error;
    }
  };

  const handleSubmitForValidation = async (record: PayrollRecord) => {
    if (record.validationStatus === "Submitted for Validation") {
      toast.message(`${record.slipNo} is already submitted for validation.`);
      return;
    }
    if (record.validationStatus === "Validated" || record.approvalStatus === "Approved") {
      toast.message(`${record.slipNo} has already passed validation.`);
      return;
    }
    const action = record.validationStatus === "Returned for Correction" ? "Resubmitted" : "Submitted";

    try {
      const saved = await submitPayrollSlip(record.id, {
        user_id: currentUserId(user),
        user_name: user.name,
      });
      const updatedRecord = mapPayrollSlip(saved);
      setPayrollRecords((current) => current.map((item) => item.id === record.id ? updatedRecord : item));
      createAuditRecord(
        updatedRecord,
        action,
        action === "Resubmitted"
          ? `Corrected payroll slip ${updatedRecord.slipNo} resubmitted to Finance for validation.`
          : `Payroll slip ${updatedRecord.slipNo} submitted to Finance for validation.`
      );
      toast.success(`${updatedRecord.slipNo} submitted for validation`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to submit payroll slip.");
      throw error;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-emerald-700" />{mode === "history" ? "Beneficiary Payroll History" : "Prepare Beneficiary Payroll"}
          </h1>
          <p className="text-muted-foreground text-sm">{mode === "history" ? "Approved beneficiary payroll records." : "Create drafts, edit returned payrolls, and submit records for validation."}</p>
        </div>
        {mode === "work" && (
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700 sm:w-auto" onClick={() => { setEditRecord(null); setOpenPrepare(true); }}>
            <Plus className="h-4 w-4 mr-1" />Prepare Beneficiary Payroll
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <div className="relative min-w-0 flex-1 sm:min-w-[220px]">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input placeholder={mode === "history" ? "Search beneficiary payroll history..." : "Search payroll work queue..."} className="pl-8 h-9" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="h-9 w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all-period">All Periods</SelectItem>
                {periodOptions.map((period) => (
                  <SelectItem key={period} value={period}>{period}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payroll Slip No.</TableHead>
                <TableHead>Payroll Period</TableHead>
                <TableHead>Beneficiary</TableHead>
                <TableHead>Harvest Date</TableHead>
                <TableHead className="text-right">Total Boxes</TableHead>
                <TableHead className="text-right">Gross Income</TableHead>
                <TableHead className="text-right">Total Deductions</TableHead>
                <TableHead className="text-right">Net Income</TableHead>
                {mode === "work" && <TableHead>Validation Status</TableHead>}
                <TableHead>Approval Status</TableHead>
                <TableHead className={mode === "work" ? "w-[96px] text-center" : "w-[64px] text-center"}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={mode === "work" ? 11 : 10} className="text-center text-muted-foreground h-24">
                    {mode === "history" ? "No approved beneficiary payroll records yet." : "No draft, submitted, or returned payroll records yet."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.slipNo}</TableCell>
                    <TableCell>{record.period}</TableCell>
                    <TableCell>{record.beneficiary}</TableCell>
                    <TableCell>{record.harvestDate}</TableCell>
                    <TableCell className="text-right">{record.totalBoxes}</TableCell>
                    <TableCell className="text-right">&#8369;{record.grossIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">&#8369;{record.totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-700">&#8369;{record.netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                    {mode === "work" && <TableCell>{getValidationBadge(record.validationStatus)}</TableCell>}
                    <TableCell>{getApprovalBadge(record.approvalStatus)}</TableCell>
                    <TableCell className={mode === "work" ? "w-[96px]" : "w-[64px]"}>
                      <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 shrink-0 p-0 text-blue-600 hover:text-blue-700"
                          onClick={() => setViewSlip(record)}
                          title="View"
                          aria-label={`View ${record.slipNo}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {mode === "work" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 shrink-0 p-0 text-emerald-600 hover:text-emerald-700"
                            onClick={() => {
                              setEditRecord(record);
                              setOpenPrepare(true);
                            }}
                            title="Edit"
                            aria-label={`Edit ${record.slipNo}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground">
              {mode === "history"
                ? `Showing ${filteredRecords.length} of ${visibleRecords.length} approved records`
                : `Showing ${filteredRecords.length} of ${visibleRecords.length} payroll work records`}
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700">1</Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <PreparePayrollDialog
        open={openPrepare}
        onOpenChange={(open) => {
          setOpenPrepare(open);
          if (!open) setEditRecord(null);
        }}
        user={user}
        editRecord={editRecord}
        beneficiaries={beneficiaries}
        productionRecords={productionRecords}
        creditTransactions={creditTransactions}
        nextSlipNo={`BP-2026-${String(payrollRecords.length + 1).padStart(3, "0")}`}
        onSave={handleSavePayroll}
      />
      {viewSlip && (
        <ViewPayrollSlipDialog
          slip={viewSlip}
          beneficiaries={beneficiaries}
          productionRecords={productionRecords}
          creditTransactions={creditTransactions}
          auditEntries={auditRecords.filter((entry) => entry.slipNo === viewSlip.slipNo)}
          onClose={() => setViewSlip(null)}
          onSubmit={handleSubmitForValidation}
        />
      )}

    </div>
  );
}

function PreparePayrollDialog({ open, onOpenChange, user, editRecord, beneficiaries, productionRecords, creditTransactions, nextSlipNo, onSave }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  user: User;
  editRecord?: PayrollRecord | null;
  beneficiaries: BeneficiaryOption[];
  productionRecords: PayrollProductionRecord[];
  creditTransactions: PayrollCreditMaterial[];
  nextSlipNo: string;
  onSave: (record: PayrollRecord) => Promise<void> | void;
}) {
  const today = todaySystemDate();
  const [showProductionDetails, setShowProductionDetails] = useState(false);
  const [otherDeductions, setOtherDeductions] = useState<any[]>([]);
  const [deductionTypes, setDeductionTypes] = useState(DEFAULT_DEDUCTION_TYPES);
  const [openDeductionType, setOpenDeductionType] = useState(false);
  const [newDeductionType, setNewDeductionType] = useState("");
  const [laborCost, setLaborCost] = useState("0");
  const [selectedBeneficiary, setSelectedBeneficiary] = useState("");
  const currentPeriod = currentPayrollPeriodLabel();
  const [payrollPeriod, setPayrollPeriod] = useState(currentPeriod);
  const [priceClassABig, setPriceClassABig] = useState("400");
  const [priceClassASmall, setPriceClassASmall] = useState("400");
  const [priceClassACp, setPriceClassACp] = useState("400");
  const [priceClassBBig, setPriceClassBBig] = useState("350");
  const [priceClassBSmall, setPriceClassBSmall] = useState("350");
  const [priceClassBCp, setPriceClassBCp] = useState("350");
  const [priceSpecial, setPriceSpecial] = useState("300");
  const [savingAction, setSavingAction] = useState<"draft" | "submit" | null>(null);

  // Populate form with edit data when editRecord is provided
  useEffect(() => {
    if (editRecord && open) {
      // Map beneficiary name to ID
      const beneficiary = beneficiaries.find(b => b.dbId === editRecord.beneficiaryId || b.name === editRecord.beneficiary);
      setSelectedBeneficiary(beneficiary?.id || "");
      setPayrollPeriod(editRecord.period);
      setLaborCost(String(editRecord.laborCost ?? 0));
      setOtherDeductions([]);
      setShowProductionDetails(false);
      resetPayrollPrices();
    } else if (!open) {
      // Reset form when closing
      setSelectedBeneficiary("");
      setPayrollPeriod(currentPeriod);
      setLaborCost("0");
      setOtherDeductions([]);
      setShowProductionDetails(false);
      resetPayrollPrices();
    }
  }, [editRecord, open]);

  const selectedBeneficiaryId = Number(selectedBeneficiary);
  const selectedBeneficiaryOption = beneficiaries.find((item) => item.id === selectedBeneficiary);
  const periodRange = payrollPeriodRange(payrollPeriod);
  const matchedProductionRecords = productionRecords.filter((record) => {
    if (!selectedBeneficiaryOption) return false;
    const idMatches = !!selectedBeneficiaryId && !!record.beneficiaryId && record.beneficiaryId === selectedBeneficiaryId;
    const nameMatches = sameBeneficiaryName(record.beneficiaryName, selectedBeneficiaryOption.name);
    if (!idMatches && !nameMatches) return false;
    if (!periodRange || !record.harvestDate) return true;
    const harvestDate = new Date(`${record.harvestDate}T00:00:00`);
    if (Number.isNaN(harvestDate.getTime())) return true;
    return harvestDate >= periodRange.start && harvestDate <= periodRange.end;
  });

  const selectedBeneficiaryAccountId = selectedBeneficiaryOption ? beneficiaryAccountId(selectedBeneficiaryOption.name) : "";
  const creditMaterials = creditTransactions.filter((credit) => {
    if (!selectedBeneficiaryOption) return false;

    const creditName = formatBeneficiaryDisplayName(credit.beneficiaryName).trim().toLowerCase();
    const selectedName = selectedBeneficiaryOption.name.trim().toLowerCase();
    const creditAccount = credit.beneficiaryAccountId.trim().toUpperCase();
    const selectedCode = selectedBeneficiaryOption.code.trim().toUpperCase();

    const hasPayrollDeduction = credit.deductionAmount > 0;
    return (credit.remaining > 0 || hasPayrollDeduction) && (
      creditName === selectedName
      || creditAccount === selectedCode
      || creditAccount === selectedBeneficiaryAccountId
    );
  });

  const classABoxes = matchedProductionRecords.reduce((sum, r) => sum + r.classA, 0);
  const classBBoxes = matchedProductionRecords.reduce((sum, r) => sum + r.classB, 0);
  const specialBoxes = matchedProductionRecords.reduce((sum, r) => sum + r.special, 0);
  const classABigBoxes = matchedProductionRecords.reduce((sum, r) => sum + r.classA_big, 0);
  const classASmallBoxes = matchedProductionRecords.reduce((sum, r) => sum + r.classA_small, 0);
  const classACpBoxes = matchedProductionRecords.reduce((sum, r) => sum + r.classA_cp, 0);
  const classBBigBoxes = matchedProductionRecords.reduce((sum, r) => sum + r.classB_big, 0);
  const classBSmallBoxes = matchedProductionRecords.reduce((sum, r) => sum + r.classB_small, 0);
  const classBCpBoxes = matchedProductionRecords.reduce((sum, r) => sum + r.classB_cp, 0);
  const totalBoxes = matchedProductionRecords.reduce((sum, r) => sum + r.total, 0);

  const rateClassABig = parseFloat(priceClassABig) || 0;
  const rateClassASmall = parseFloat(priceClassASmall) || 0;
  const rateClassACp = parseFloat(priceClassACp) || 0;
  const rateClassBBig = parseFloat(priceClassBBig) || 0;
  const rateClassBSmall = parseFloat(priceClassBSmall) || 0;
  const rateClassBCp = parseFloat(priceClassBCp) || 0;
  const rateSpecial = parseFloat(priceSpecial) || 0;

  const subtotalClassABig = classABigBoxes * rateClassABig;
  const subtotalClassASmall = classASmallBoxes * rateClassASmall;
  const subtotalClassACp = classACpBoxes * rateClassACp;
  const subtotalClassBBig = classBBigBoxes * rateClassBBig;
  const subtotalClassBSmall = classBSmallBoxes * rateClassBSmall;
  const subtotalClassBCp = classBCpBoxes * rateClassBCp;
  const subtotalA = subtotalClassABig + subtotalClassASmall + subtotalClassACp;
  const subtotalB = subtotalClassBBig + subtotalClassBSmall + subtotalClassBCp;
  const subtotalSpecial = specialBoxes * rateSpecial;
  const grossIncome = subtotalA + subtotalB + subtotalSpecial;

  const resetPayrollPrices = () => {
    setPriceClassABig("400");
    setPriceClassASmall("400");
    setPriceClassACp("400");
    setPriceClassBBig("350");
    setPriceClassBSmall("350");
    setPriceClassBCp("350");
    setPriceSpecial("300");
  };

  const totalCreditDeductions = creditMaterials.reduce((sum, c) => sum + (c.deductionAmount > 0 ? c.deductionAmount : c.remaining), 0);
  const previousBalance = 0;
  const laborCostAmount = Math.max(0, parseFloat(laborCost) || 0);
  const otherDeductionsTotal = otherDeductions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  const invalidAuthorizedDeduction = otherDeductions.find((deduction) => (parseFloat(deduction.amount) || 0) < MIN_AUTHORIZED_DEDUCTION_AMOUNT);
  const totalDeductions = totalCreditDeductions + previousBalance + laborCostAmount + otherDeductionsTotal;
  const netIncome = grossIncome - totalDeductions;

  const addDeductionType = () => {
    const cleaned = newDeductionType.trim();
    if (!cleaned) {
      toast.error("Deduction type is required");
      return;
    }
    if (deductionTypes.some((type) => type.toLowerCase() === cleaned.toLowerCase())) {
      toast.error("Deduction type already exists");
      return;
    }
    setDeductionTypes((current) => [...current, cleaned]);
    setNewDeductionType("");
    setOpenDeductionType(false);
    toast.success("Deduction type added");
  };

  const handleClose = () => {
    if (savingAction) return;
    setSelectedBeneficiary("");
    setPayrollPeriod(currentPeriod);
    setLaborCost("0");
    setOtherDeductions([]);
    setShowProductionDetails(false);
    resetPayrollPrices();
    onOpenChange(false);
  };

  const handleSave = async (validationStatus: "Draft" | "Submitted for Validation") => {
    if (savingAction) return;
    const beneficiary = beneficiaries.find((item) => item.id === selectedBeneficiary);

    if (!beneficiary || !payrollPeriod.trim()) {
      toast.error("Please select a beneficiary and payroll period.");
      return;
    }

    if (matchedProductionRecords.length === 0) {
      toast.error("No production records found for this beneficiary and payroll period.");
      return;
    }

    if (invalidAuthorizedDeduction) {
      toast.error(`Each authorized deduction must be at least ₱${MIN_AUTHORIZED_DEDUCTION_AMOUNT.toLocaleString("en-US", { minimumFractionDigits: 2 })}.`);
      return;
    }

    setSavingAction(validationStatus === "Submitted for Validation" ? "submit" : "draft");

    try {
      await onSave({
        id: editRecord?.id ?? Date.now(),
        slipNo: editRecord?.slipNo ?? nextSlipNo,
        period: payrollPeriod,
        beneficiary: beneficiary.name,
        beneficiaryId: beneficiary.dbId,
        beneficiaryCode: beneficiary.code,
        beneficiaryContactNumber: beneficiary.contactNumber,
        beneficiaryAddress: beneficiary.address,
        productionRecordId: matchedProductionRecords[0]?.sourceTable === "production_records" ? matchedProductionRecords[0]?.dbId : undefined,
        harvestDate: matchedProductionRecords[0]?.harvestDate ?? today,
        totalBoxes,
        grossIncome,
        totalDeductions,
        netIncome,
        classABoxes,
        classBBoxes,
        specialBoxes,
        classAPrice: rateClassABig,
        classBPrice: rateClassBBig,
        specialPrice: rateSpecial,
        creditDeduction: totalCreditDeductions,
        previousBalance,
        laborCost: laborCostAmount,
        otherDeductions: otherDeductionsTotal,
        otherDeductionItems: otherDeductions
          .map((deduction) => ({
            type: String(deduction.type ?? "").trim() || "Other Authorized Deduction",
            amount: parseFloat(deduction.amount) || 0,
          }))
          .filter((deduction) => deduction.amount > 0),
        validationStatus,
        approvalStatus: validationStatus === "Submitted for Validation" ? "Pending Approval" : editRecord?.approvalStatus ?? "Pending Approval",
      });

      setSelectedBeneficiary("");
      setPayrollPeriod(currentPeriod);
      setLaborCost("0");
      setOtherDeductions([]);
      setShowProductionDetails(false);
      resetPayrollPrices();
    } finally {
      setSavingAction(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="!max-w-[1080px] w-[calc(100vw-1rem)] max-h-[86dvh] overflow-y-auto p-0 overflow-x-hidden">
        {/* Header */}
        <div className="bg-white border-b border-emerald-200 px-4 py-3 sm:px-5 sm:py-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 text-lg">
              {editRecord ? (
                <>
                  <Edit className="h-5 w-5" />Edit Beneficiary Payroll - {editRecord.slipNo}
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />Prepare Beneficiary Payroll
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {editRecord
                ? "Update the payroll slip details for the selected beneficiary"
                : "Create a new payroll slip for beneficiary earnings and deductions"
              }
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-4 py-4 space-y-4 sm:px-5">
          {/* Section A: Beneficiary Information */}
          <Card className="border-emerald-200">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Beneficiary Information</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>Beneficiary <span className="text-red-500">*</span></Label>
                      <Select value={selectedBeneficiary} onValueChange={setSelectedBeneficiary}>
                        <SelectTrigger><SelectValue placeholder="Select beneficiary" /></SelectTrigger>
                        <SelectContent>
                          {beneficiaries.map((b) => (
                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Beneficiary ID</Label>
                      <Input
                        value={selectedBeneficiaryOption?.code || ""}
                        placeholder="Auto-filled"
                        disabled
                        className="bg-slate-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Payroll Period <span className="text-red-500">*</span></Label>
                      <Input
                        type="text"
                        placeholder="e.g. May 16-31, 2026"
                        value={payrollPeriod}
                        onChange={(e) => setPayrollPeriod(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Harvest Date / Production Period</Label>
                      <DateInput defaultValue={today} />
                    </div>
                    <div className="space-y-1">
                      <Label>Contact Number</Label>
                      <Input value={selectedBeneficiaryOption?.contactNumber || ""} placeholder="Auto-filled" disabled className="bg-slate-50" />
                    </div>
                    <div className="space-y-1">
                      <Label>Address</Label>
                      <Input value={selectedBeneficiaryOption?.address || ""} placeholder="Auto-filled" disabled className="bg-slate-50" />
                    </div>
                    <div className="space-y-1">
                      <Label>Date Created</Label>
                      <Input value={today} disabled className="bg-slate-50" />
                    </div>
                    <div className="space-y-1">
                      <Label>Prepared By</Label>
                      <Input value={user.name} disabled className="bg-slate-50" />
                    </div>
                  </div>
                </CardContent>
          </Card>

          {/* Section B: Production Records from Production Clerk */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-emerald-700">Production Records from Production Clerk</CardTitle>
                <p className="text-xs text-muted-foreground">Read-only</p>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-3">
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Production Record Ref.</TableHead>
                      <TableHead>Harvest Date</TableHead>
                      <TableHead className="text-right">Class A Boxes</TableHead>
                      <TableHead className="text-right">Class B Boxes</TableHead>
                      <TableHead className="text-right">Special Product</TableHead>
                      <TableHead className="text-right">Total Boxes</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {matchedProductionRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground h-16">
                        No verified production records found for the selected beneficiary and payroll period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    matchedProductionRecords.map((record) => (
                      <TableRow key={record.refNo}>
                        <TableCell className="font-medium">{record.refNo}</TableCell>
                        <TableCell>{record.harvestDate}</TableCell>
                        <TableCell className="text-right">{record.classA}</TableCell>
                        <TableCell className="text-right">{record.classB}</TableCell>
                        <TableCell className="text-right">{record.special}</TableCell>
                        <TableCell className="text-right font-semibold">{record.total}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                </Table>
              </div>

              <button
                onClick={() => setShowProductionDetails(!showProductionDetails)}
                className="flex items-center gap-2 text-sm text-emerald-700 hover:underline"
              >
                {showProductionDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showProductionDetails ? "Hide" : "Show"} box classification breakdown
              </button>

              {showProductionDetails && (
                <div className="border rounded-md p-4 bg-slate-50 space-y-2">
                  {matchedProductionRecords.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center">No production details available</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-semibold mb-2 text-emerald-700">Class A Boxes</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between"><span>Big Hands:</span><span>{classABigBoxes}</span></div>
                          <div className="flex justify-between"><span>Small Hands:</span><span>{classASmallBoxes}</span></div>
                          <div className="flex justify-between"><span>CPs:</span><span>{classACpBoxes}</span></div>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold mb-2 text-amber-700">Class B Boxes</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between"><span>Big Hands:</span><span>{classBBigBoxes}</span></div>
                          <div className="flex justify-between"><span>Small Hands:</span><span>{classBSmallBoxes}</span></div>
                          <div className="flex justify-between"><span>CPs:</span><span>{classBCpBoxes}</span></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section C: Earnings Computation */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base text-emerald-700">Earnings Computation</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-3">
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Classification</TableHead>
                      <TableHead className="text-right">Total Boxes</TableHead>
                      <TableHead className="text-right">Price per Box</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Class A - Big Hands</TableCell>
                    <TableCell className="text-right">{classABigBoxes || "-"}</TableCell>
                    <TableCell className="text-right">
                      <CurrencyInput value={priceClassABig} onChange={setPriceClassABig} label="Class A Big Hands price" />
                    </TableCell>
                    <TableCell className="text-right">&#8369;{subtotalClassABig.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Class A - Small Hands</TableCell>
                    <TableCell className="text-right">{classASmallBoxes || "-"}</TableCell>
                    <TableCell className="text-right">
                      <CurrencyInput value={priceClassASmall} onChange={setPriceClassASmall} label="Class A Small Hands price" />
                    </TableCell>
                    <TableCell className="text-right">&#8369;{subtotalClassASmall.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Class A - CPs</TableCell>
                    <TableCell className="text-right">{classACpBoxes || "-"}</TableCell>
                    <TableCell className="text-right">
                      <CurrencyInput value={priceClassACp} onChange={setPriceClassACp} label="Class A CPs price" />
                    </TableCell>
                    <TableCell className="text-right">&#8369;{subtotalClassACp.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Class B - Big Hands</TableCell>
                    <TableCell className="text-right">{classBBigBoxes || "-"}</TableCell>
                    <TableCell className="text-right">
                      <CurrencyInput value={priceClassBBig} onChange={setPriceClassBBig} label="Class B Big Hands price" />
                    </TableCell>
                    <TableCell className="text-right">&#8369;{subtotalClassBBig.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Class B - Small Hands</TableCell>
                    <TableCell className="text-right">{classBSmallBoxes || "-"}</TableCell>
                    <TableCell className="text-right">
                      <CurrencyInput value={priceClassBSmall} onChange={setPriceClassBSmall} label="Class B Small Hands price" />
                    </TableCell>
                    <TableCell className="text-right">&#8369;{subtotalClassBSmall.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Class B - CPs</TableCell>
                    <TableCell className="text-right">{classBCpBoxes || "-"}</TableCell>
                    <TableCell className="text-right">
                      <CurrencyInput value={priceClassBCp} onChange={setPriceClassBCp} label="Class B CPs price" />
                    </TableCell>
                    <TableCell className="text-right">&#8369;{subtotalClassBCp.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Special Product</TableCell>
                    <TableCell className="text-right">{specialBoxes || "-"}</TableCell>
                    <TableCell className="text-right">
                      <CurrencyInput value={priceSpecial} onChange={setPriceSpecial} label="Special Product price" />
                    </TableCell>
                    <TableCell className="text-right">&#8369;{subtotalSpecial.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow className="bg-emerald-50/50">
                    <TableCell className="font-semibold">Class A Total</TableCell>
                    <TableCell className="text-right font-semibold">{classABoxes || "-"}</TableCell>
                    <TableCell />
                    <TableCell className="text-right font-semibold">&#8369;{subtotalA.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow className="bg-amber-50/50">
                    <TableCell className="font-semibold">Class B Total</TableCell>
                    <TableCell className="text-right font-semibold">{classBBoxes || "-"}</TableCell>
                    <TableCell />
                    <TableCell className="text-right font-semibold">&#8369;{subtotalB.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-md">
                <span className="font-semibold text-emerald-700">Gross Income</span>
                <span className="text-xl font-bold text-emerald-700">&#8369;{grossIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </CardContent>
          </Card>

          {/* Section D: Material Credit Deductions */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-amber-700">Credit Materials from Inventory Bookkeeper</CardTitle>
                <p className="text-xs text-muted-foreground">Read-only</p>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-3">
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Credit Ref. No.</TableHead>
                      <TableHead>Date Issued</TableHead>
                      <TableHead>Material Name</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Remaining Balance</TableHead>
                      <TableHead className="text-right">Amount Charged</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {creditMaterials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground h-16">
                        No credit material deductions found for this beneficiary.
                      </TableCell>
                    </TableRow>
                  ) : (
                    creditMaterials.map((credit) => (
                      <TableRow key={credit.refNo}>
                        <TableCell className="font-medium">{credit.refNo}</TableCell>
                        <TableCell>{credit.dateIssued}</TableCell>
                        <TableCell>{credit.materialName}</TableCell>
                        <TableCell className="text-right">{credit.quantity}</TableCell>
                        <TableCell>{credit.unit}</TableCell>
                        <TableCell className="text-right">&#8369;{credit.remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right">&#8369;{credit.amountCharged.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center p-3 bg-amber-50 rounded-md">
                <span className="font-semibold text-amber-700">Total Material Credit Deductions</span>
                <span className="text-xl font-bold text-amber-700">&#8369;{totalCreditDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </CardContent>
          </Card>

          {/* Section E: Labor Cost */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Labor Cost</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 lg:grid-cols-[260px_1fr]">
                <Label htmlFor="labor-cost-amount" className="lg:col-start-1">Labor Cost Amount</Label>
                <div className="relative lg:col-start-1 lg:row-start-2">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">&#8369;</span>
                  <Input
                    id="labor-cost-amount"
                    type="text"
                    inputMode="decimal"
                    value={laborCost}
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (/^\d*\.?\d{0,2}$/.test(value)) setLaborCost(value);
                    }}
                    className="h-9 pl-7 text-right"
                  />
                </div>
                <div className="flex h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-muted-foreground lg:col-start-2 lg:row-start-2">
                  Leave this as &#8369;0.00 when no labor charge applies to this payroll.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section F: Other Authorized Deductions */}
          <Card>
            <CardHeader className="p-4 pb-2 flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Other Authorized Deductions</CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOtherDeductions([...otherDeductions, { type: deductionTypes[0] ?? "", amount: "0" }])}
                >
                  <Plus className="h-4 w-4 mr-1" />Add Authorized Deduction
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setOpenDeductionType(true)}>
                  <Plus className="h-4 w-4 mr-1" />Add Deduction Type
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {otherDeductions.length === 0 ? (
                <div className="text-center text-muted-foreground py-5 border rounded-md bg-slate-50">
                  No authorized deductions added.
                </div>
              ) : (
                <div className="space-y-3">
                  {otherDeductions.map((deduction, i) => (
                    <div key={i} className="border rounded-md p-3 bg-slate-50 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_180px_auto] gap-3 items-start">
                      <Select
                        value={deduction.type}
                        onValueChange={(value) => {
                          const updated = [...otherDeductions];
                          updated[i].type = value;
                          setOtherDeductions(updated);
                        }}
                      >
                        <SelectTrigger className="h-9 min-w-0"><SelectValue placeholder="Select deduction type" /></SelectTrigger>
                        <SelectContent>
                          {deductionTypes.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div>
                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">&#8369;</span>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            className={`h-9 pl-7 text-right ${(parseFloat(deduction.amount) || 0) < MIN_AUTHORIZED_DEDUCTION_AMOUNT ? "border-red-300 focus-visible:ring-red-200" : ""}`}
                            value={deduction.amount}
                            onFocus={(event) => event.currentTarget.select()}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (!/^\d*\.?\d{0,2}$/.test(value)) return;
                              const updated = [...otherDeductions];
                              updated[i].amount = value;
                              setOtherDeductions(updated);
                            }}
                          />
                        </div>
                        <div className="mt-1 text-right text-[11px] text-muted-foreground">
                          Minimum: &#8369;{MIN_AUTHORIZED_DEDUCTION_AMOUNT.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 text-red-600 hover:text-red-700"
                        onClick={() => setOtherDeductions(otherDeductions.filter((_, idx) => idx !== i))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={openDeductionType} onOpenChange={setOpenDeductionType}>
            <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Deduction Type</DialogTitle>
                <DialogDescription>Create another authorized deduction type for this payroll form.</DialogDescription>
              </DialogHeader>
              <div className="space-y-1">
                <Label>Deduction Type</Label>
                <Input value={newDeductionType} onChange={(event) => setNewDeductionType(event.target.value)} placeholder="Enter deduction type" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenDeductionType(false)}>Cancel</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={addDeductionType}>Save Type</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Section G: Final Payroll Summary */}
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base text-emerald-700">Final Payroll Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Gross Income</span>
                <span className="font-semibold">&#8369;{grossIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm text-amber-700">
                <span>Material Credit Deductions</span>
                <span className="font-semibold">-&#8369;{totalCreditDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm text-red-600">
                <span>Previous Unpaid Balance</span>
                <span className="font-semibold">-&#8369;{previousBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm text-red-600">
                <span>Labor Cost</span>
                <span className="font-semibold">-&#8369;{laborCostAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm text-red-600">
                <span>Other Authorized Deductions</span>
                <span className="font-semibold">-&#8369;{otherDeductionsTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              {otherDeductions
                .filter((deduction) => (parseFloat(deduction.amount) || 0) > 0)
                .map((deduction, index) => (
                  <div key={`${deduction.type}-${index}`} className="flex justify-between pl-4 text-xs text-red-600">
                    <span>{deduction.type?.trim() || "Other Deduction"}</span>
                    <span className="font-medium">-PHP {(parseFloat(deduction.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              <div className="border-t pt-2 flex justify-between text-sm">
                <span className="font-semibold">Total Deductions</span>
                <span className="font-semibold text-red-600">&#8369;{totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t-2 border-emerald-300 pt-3 flex justify-between items-center">
                <span className="text-lg font-bold text-emerald-700">Net Income</span>
                <span className="text-2xl font-bold text-emerald-700">&#8369;{netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </CardContent>
          </Card>

          {/* Section H: Payroll Tracking */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Payroll Tracking</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-3">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Payroll Slip Number</Label>
                  <Input
                    value={editRecord?.slipNo || nextSlipNo}
                    placeholder="Auto-generated"
                    disabled
                    className="bg-slate-50"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Validation Status</Label>
                  <div>
                    {editRecord ? (
                      editRecord.validationStatus === "Draft" ? (
                        <Badge className="bg-slate-100 text-slate-700">Draft</Badge>
                      ) : editRecord.validationStatus === "Returned for Correction" ? (
                        <Badge className="bg-amber-100 text-amber-700">Returned for Correction</Badge>
                      ) : (
                        <Badge className="bg-violet-100 text-violet-700">{editRecord.validationStatus}</Badge>
                      )
                    ) : (
                      <Badge className="bg-slate-100 text-slate-700">Draft</Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Approval Status</Label>
                  <div>
                    <Badge className="bg-slate-100 text-slate-700">
                      {editRecord?.approvalStatus || "Pending Approval"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea placeholder="Optional notes or remarks..." rows={2} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sticky Footer with Buttons */}
        <div className="bg-white border-t border-slate-200 px-4 py-3 sm:px-5">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end [&>button]:w-full sm:[&>button]:w-auto">
            <Button variant="outline" onClick={handleClose} disabled={!!savingAction}>Cancel</Button>
            {editRecord ? (
              <>
                <Button
                  variant="outline"
                  className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                  onClick={() => handleSave("Draft")}
                  disabled={!!savingAction}
                >
                  {savingAction === "draft" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  {savingAction === "draft" ? "Updating..." : "Update Draft"}
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleSave("Submitted for Validation")}
                  disabled={!!savingAction}
                >
                  {savingAction === "submit" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                  {savingAction === "submit" ? "Submitting..." : "Update & Submit for Validation"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                  onClick={() => handleSave("Draft")}
                  disabled={!!savingAction}
                >
                  {savingAction === "draft" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  {savingAction === "draft" ? "Saving..." : "Save as Draft"}
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleSave("Submitted for Validation")}
                  disabled={!!savingAction}
                >
                  {savingAction === "submit" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                  {savingAction === "submit" ? "Submitting..." : "Submit for Validation"}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ViewPayrollSlipDialog({ slip, beneficiaries = [], productionRecords = [], creditTransactions = [], auditEntries = [], onClose, onEdit, onSubmit }: {
  slip: PayrollRecord;
  beneficiaries?: BeneficiaryOption[];
  productionRecords?: PayrollProductionRecord[];
  creditTransactions?: PayrollCreditMaterial[];
  auditEntries?: PayrollAuditRecord[];
  onClose: () => void;
  onEdit?: (record: PayrollRecord) => void;
  onSubmit?: (record: PayrollRecord) => Promise<void> | void;
}) {
  if (!slip) return null;

  const [showBoxBreakdown, setShowBoxBreakdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getValidationBadge = (status: string) => {
    if (status === "Draft") return <Badge className="bg-slate-100 text-slate-700">Draft</Badge>;
    if (status === "Submitted for Validation") return <Badge className="bg-violet-100 text-violet-700">Submitted</Badge>;
    if (status === "Validated") return <Badge className="bg-emerald-100 text-emerald-700">Validated</Badge>;
    return <Badge className="bg-amber-100 text-amber-700">Returned</Badge>;
  };

  const getApprovalBadge = (status: string) => {
    if (status === "Approved") return <Badge className="bg-emerald-100 text-emerald-700">Approved</Badge>;
    if (status === "Rejected") return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
    return <Badge className="bg-slate-100 text-slate-700">Pending</Badge>;
  };

  const classABoxes = slip.classABoxes ?? 0;
  const classBBoxes = slip.classBBoxes ?? 0;
  const specialBoxes = slip.specialBoxes ?? 0;
  const beneficiaryRecord =
    beneficiaries.find((beneficiary) => slip.beneficiaryId && beneficiary.dbId === slip.beneficiaryId) ??
    beneficiaries.find((beneficiary) => sameBeneficiaryName(beneficiary.name, slip.beneficiary));
  const beneficiaryCode = slip.beneficiaryCode || beneficiaryRecord?.code || "-";
  const beneficiaryContactNumber = slip.beneficiaryContactNumber || beneficiaryRecord?.contactNumber || "-";
  const beneficiaryAddress = slip.beneficiaryAddress || beneficiaryRecord?.address || "-";
  const preparedByName = slip.preparedByName?.trim() || "-";
  const sourceProductionRecord =
    productionRecords.find((record) => slip.productionRecordId && record.dbId === slip.productionRecordId) ??
    productionRecords.find((record) =>
      sameBeneficiaryName(record.beneficiaryName, slip.beneficiary) &&
      (!slip.harvestDate || record.harvestDate === slip.harvestDate)
    ) ??
    productionRecords.find((record) => sameBeneficiaryName(record.beneficiaryName, slip.beneficiary));

  const productionData = {
    refNo: sourceProductionRecord?.refNo ?? (slip.productionRecordId ? String(slip.productionRecordId) : "-"),
    harvestDate: sourceProductionRecord?.harvestDate ?? slip.harvestDate,
    classA: {
      total: sourceProductionRecord?.classA ?? classABoxes,
      bigHands: sourceProductionRecord?.classA_big ?? classABoxes,
      smallHands: sourceProductionRecord?.classA_small ?? 0,
      cps: sourceProductionRecord?.classA_cp ?? 0,
    },
    classB: {
      total: sourceProductionRecord?.classB ?? classBBoxes,
      bigHands: sourceProductionRecord?.classB_big ?? classBBoxes,
      smallHands: sourceProductionRecord?.classB_small ?? 0,
      cps: sourceProductionRecord?.classB_cp ?? 0,
    },
    special: sourceProductionRecord?.special ?? specialBoxes
  };

  // Pricing
  const priceClassA = slip.classAPrice ?? 0;
  const priceClassB = slip.classBPrice ?? 0;
  const priceSpecial = slip.specialPrice ?? 0;

  // Computed earnings
  const subtotalClassA = productionData.classA.total * priceClassA;
  const subtotalClassB = productionData.classB.total * priceClassB;
  const subtotalSpecial = productionData.special * priceSpecial;
  const computedGrossIncome = subtotalClassA + subtotalClassB + subtotalSpecial;
  const grossIncome = computedGrossIncome > 0 ? computedGrossIncome : slip.grossIncome;

  const materialDeductions = creditTransactions
    .filter((credit) => sameBeneficiaryName(credit.beneficiaryName, slip.beneficiary))
    .map((credit) => ({
      refNo: credit.refNo,
      dateIssued: credit.dateIssued,
      materialName: credit.materialName || "Material credit",
      quantity: credit.quantity,
      unit: credit.unit,
      unitPrice: credit.quantity > 0 ? credit.amountCharged / credit.quantity : credit.amountCharged,
      totalCredit: credit.amountCharged,
      deductionApplied: credit.deductionAmount > 0 ? credit.deductionAmount : credit.remaining,
      remainingBalance: credit.remaining,
    }));

  // Total material deductions (all materials, not filtered)
  const itemizedMaterialDeductionsTotal = materialDeductions.reduce((sum, m) => sum + m.deductionApplied, 0);
  const totalMaterialDeductions = (slip.creditDeduction ?? 0) > 0 ? slip.creditDeduction ?? 0 : itemizedMaterialDeductionsTotal;
  const previousUnpaid = slip.previousBalance ?? 0;
  const laborCostAmount = slip.laborCost ?? 0;
  const otherAuthorizedDeductionsTotal = slip.otherDeductions ?? 0;
  const otherAuthorizedDeductionItems = slip.otherDeductionItems ?? [];
  const displayedOtherAuthorizedDeductionItems = otherAuthorizedDeductionItems.length > 0
    ? otherAuthorizedDeductionItems
    : otherAuthorizedDeductionsTotal > 0
      ? [{ type: "Other Approved Deductions", amount: otherAuthorizedDeductionsTotal }]
      : [];
  const computedTotalDeductions = totalMaterialDeductions + previousUnpaid + laborCostAmount + otherAuthorizedDeductionsTotal;
  const totalDeductions = computedTotalDeductions > 0 ? computedTotalDeductions : slip.totalDeductions;
  const netIncome = grossIncome - totalDeductions;

  // Validation checks
  const computedTotalBoxes = productionData.classA.total + productionData.classB.total + productionData.special;
  const totalBoxesProduction = computedTotalBoxes > 0 ? computedTotalBoxes : slip.totalBoxes;
  const validationErrors = [];

  if (totalBoxesProduction !== slip.totalBoxes) {
    validationErrors.push("Total boxes mismatch with production record");
  }
  if (Math.abs(grossIncome - slip.grossIncome) > 0.01) {
    validationErrors.push("Gross income computation mismatch");
  }
  if (Math.abs(totalDeductions - slip.totalDeductions) > 0.01) {
    validationErrors.push("Total deductions mismatch");
  }
  if (Math.abs(netIncome - slip.netIncome) > 0.01) {
    validationErrors.push("Net income mismatch");
  }
  if (materialDeductions.some(m => m.remainingBalance < 0)) {
    validationErrors.push("Negative remaining balance detected");
  }
  if (materialDeductions.some(m => m.deductionApplied > m.totalCredit)) {
    validationErrors.push("Deduction exceeds total credit");
  }

  const isValid = validationErrors.length === 0;

  const downloadPdf = () => {
    const doc = new jsPDF();
    const moneyText = (value: number) => `PHP ${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
    let y = 18;

    doc.setFontSize(16);
    doc.text("DARBCO Beneficiary Payroll Slip", 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Slip No.: ${slip.slipNo}`, 14, y);
    doc.text(`Date Generated: ${formatSystemDateTime()}`, 115, y);
    y += 7;
    doc.text(`Beneficiary: ${slip.beneficiary}`, 14, y);
    y += 7;
    doc.text(`Payroll Period: ${slip.period}`, 14, y);
    y += 7;
    doc.text(`Harvest Date: ${slip.harvestDate}`, 14, y);
    y += 10;

    doc.setFontSize(12);
    doc.text("Earnings", 14, y);
    y += 7;
    doc.setFontSize(10);
    [
      ["Class A", productionData.classA.total, priceClassA, subtotalClassA],
      ["Class B", productionData.classB.total, priceClassB, subtotalClassB],
      ["Special Product", productionData.special, priceSpecial, subtotalSpecial],
    ].forEach(([label, boxes, price, subtotal]) => {
      doc.text(`${label}: ${boxes} boxes x ${moneyText(Number(price))}`, 18, y);
      doc.text(moneyText(Number(subtotal)), 150, y, { align: "right" });
      y += 6;
    });
    doc.text("Gross Income", 18, y);
    doc.text(moneyText(grossIncome), 150, y, { align: "right" });
    y += 10;

    doc.setFontSize(12);
    doc.text("Deductions", 14, y);
    y += 7;
    doc.setFontSize(10);
    [
      ["Material Credit Deductions", totalMaterialDeductions],
      ["Previous Unpaid Balance", previousUnpaid],
      ["Labor Cost", laborCostAmount],
      ["Other Authorized Deductions", otherAuthorizedDeductionsTotal],
    ].forEach(([label, amount]) => {
      doc.text(String(label), 18, y);
      doc.text(moneyText(Number(amount)), 150, y, { align: "right" });
      y += 6;
    });
    displayedOtherAuthorizedDeductionItems.forEach((deduction) => {
      doc.text(`  ${deduction.type}`, 22, y);
      doc.text(moneyText(Number(deduction.amount)), 150, y, { align: "right" });
      y += 6;
    });
    doc.text("Total Deductions", 18, y);
    doc.text(moneyText(totalDeductions), 150, y, { align: "right" });
    y += 6;
    y += 4;
    doc.setFontSize(13);
    doc.text("Net Income", 18, y);
    doc.text(moneyText(netIncome), 150, y, { align: "right" });
    y += 18;

    doc.setFontSize(10);
    doc.text("Prepared By", 32, y, { align: "center" });
    doc.text("Received By", 150, y, { align: "center" });
    doc.line(14, y - 5, 64, y - 5);
    doc.line(125, y - 5, 175, y - 5);
    doc.save(`${slip.slipNo}-payroll-slip.pdf`);
  };

  return (
    <Dialog open={!!slip} onOpenChange={onClose}>
      <DialogContent className="!max-w-[1500px] w-[calc(100vw-1rem)] max-h-[90dvh] overflow-y-auto p-0 overflow-x-hidden">
        {/* Header */}
        <div className="bg-white border-b border-emerald-200">
          <div className="px-4 py-4 sm:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-emerald-700" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Payroll Slip</p>
                    <DialogTitle className="break-words text-xl font-bold text-emerald-700 sm:text-2xl">{slip.slipNo}</DialogTitle>
                    <DialogDescription className="sr-only">
                      Detailed view of payroll slip for {slip.beneficiary} covering period {slip.period}
                    </DialogDescription>
                  </div>
                </div>
                <div className="hidden h-12 w-px bg-slate-300 lg:block"></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Beneficiary</p>
                    <p className="font-semibold">{slip.beneficiary}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Period</p>
                    <p className="font-semibold">{slip.period}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Total Boxes</p>
                    <p className="font-bold text-emerald-700">{totalBoxesProduction} Boxes</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Prepared By</p>
                    <p className="font-semibold">{preparedByName}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-row flex-wrap gap-2 lg:flex-col">
                {getValidationBadge(slip.validationStatus)}
                {getApprovalBadge(slip.approvalStatus)}
                {isValid ? (
                  <Badge className="bg-emerald-100 text-emerald-700">Validated</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-700">Has Errors</Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4 sm:px-8 sm:py-6 sm:space-y-6">
          {/* Validation Errors */}
          {!isValid && (
            <Card className="border-red-300 bg-red-50">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-red-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-red-700 font-bold text-lg">!</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-red-700 font-bold text-lg mb-3">Validation Errors Detected</h3>
                    <ul className="space-y-2">
                      {validationErrors.map((error, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-red-600 mt-1">-</span>
                          <span className="text-red-600 font-medium">{error}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Beneficiary Information */}
              <Card className="border-emerald-200 shadow-sm">
                <CardHeader className="pb-4 pt-4 px-6 bg-gradient-to-r from-emerald-50 to-white border-b border-emerald-200">
                  <CardTitle className="text-base font-bold text-emerald-700">Beneficiary Information</CardTitle>
                </CardHeader>
                <CardContent className="pt-5 px-6 pb-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-4">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">BENEFICIARY NAME</p>
                      <p className="font-semibold">{slip.beneficiary}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">BENEFICIARY ID</p>
                      <p className="font-semibold">{beneficiaryCode}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">PAYROLL PERIOD</p>
                      <p className="font-semibold">{slip.period}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">HARVEST DATE</p>
                      <p className="font-semibold">{slip.harvestDate}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">CONTACT NUMBER</p>
                      <p className="font-semibold">{beneficiaryContactNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">ADDRESS</p>
                      <p className="font-semibold">{beneficiaryAddress}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">PRODUCTION REFERENCE</p>
                      <p className="font-semibold">{productionData.refNo}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">TOTAL BOXES PRODUCED</p>
                      <p className="font-semibold">{totalBoxesProduction} boxes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Production Earnings */}
              <Card className="border-emerald-200 shadow-sm">
                <CardHeader className="pb-4 pt-4 px-6 bg-gradient-to-r from-emerald-50 to-white border-b border-emerald-200">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-base font-bold text-emerald-700">Production Earnings</CardTitle>
                    <p className="text-sm text-muted-foreground">Formula: Subtotal = Number of Boxes x Price per Box</p>
                  </div>
                </CardHeader>
                <CardContent className="pt-5 px-6 pb-5 space-y-4">
                  <div className="w-full overflow-x-auto">
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="font-bold py-3 w-[35%]">Classification</TableHead>
                          <TableHead className="text-right font-bold py-3 w-[20%]">Number of Boxes</TableHead>
                          <TableHead className="text-right font-bold py-3 w-[20%]">Price per Box</TableHead>
                          <TableHead className="text-right font-bold py-3 w-[25%]">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="hover:bg-emerald-50/50">
                          <TableCell className="font-semibold py-3">Class A</TableCell>
                          <TableCell className="text-right py-3">{productionData.classA.total}</TableCell>
                          <TableCell className="text-right py-3">&#8369;{priceClassA.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-700 py-3">&#8369;{subtotalClassA.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-emerald-50/50">
                          <TableCell className="font-semibold py-3">Class B</TableCell>
                          <TableCell className="text-right py-3">{productionData.classB.total}</TableCell>
                          <TableCell className="text-right py-3">&#8369;{priceClassB.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-700 py-3">&#8369;{subtotalClassB.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-emerald-50/50">
                          <TableCell className="font-semibold py-3">Special Product</TableCell>
                          <TableCell className="text-right py-3">{productionData.special}</TableCell>
                          <TableCell className="text-right py-3">&#8369;{priceSpecial.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-700 py-3">&#8369;{subtotalSpecial.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                        <TableRow className="border-t-2 border-emerald-400 bg-emerald-50">
                          <TableCell colSpan={3} className="font-bold text-emerald-700 py-4">GROSS INCOME <span className="text-muted-foreground font-normal text-sm ml-2">({totalBoxesProduction} Boxes Total)</span></TableCell>
                          <TableCell className="text-right font-bold text-emerald-700 text-xl py-4">&#8369;{grossIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                      </TableBody>
                      </Table>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowBoxBreakdown(!showBoxBreakdown)}
                    className="flex items-center gap-2 text-sm text-emerald-700 hover:underline font-semibold"
                  >
                    {showBoxBreakdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {showBoxBreakdown ? "Hide" : "Show"} box classification breakdown
                  </button>

                  {showBoxBreakdown && (
                    <div className="border border-emerald-200 rounded-lg p-5 bg-gradient-to-r from-emerald-50 to-slate-50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                        <div>
                          <p className="font-bold mb-3 text-emerald-700 border-b-2 border-emerald-300 pb-2">
                            Class A Boxes ({productionData.classA.total})
                          </p>
                          <div className="space-y-2">
                            <div className="flex justify-between py-1">
                              <span className="text-muted-foreground">Big Hands:</span>
                              <span className="font-bold">{productionData.classA.bigHands}</span>
                            </div>
                            <div className="flex justify-between py-1">
                              <span className="text-muted-foreground">Small Hands:</span>
                              <span className="font-bold">{productionData.classA.smallHands}</span>
                            </div>
                            <div className="flex justify-between py-1">
                              <span className="text-muted-foreground">CPs:</span>
                              <span className="font-bold">{productionData.classA.cps}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="font-bold mb-3 text-amber-700 border-b-2 border-amber-300 pb-2">
                            Class B Boxes ({productionData.classB.total})
                          </p>
                          <div className="space-y-2">
                            <div className="flex justify-between py-1">
                              <span className="text-muted-foreground">Big Hands:</span>
                              <span className="font-bold">{productionData.classB.bigHands}</span>
                            </div>
                            <div className="flex justify-between py-1">
                              <span className="text-muted-foreground">Small Hands:</span>
                              <span className="font-bold">{productionData.classB.smallHands}</span>
                            </div>
                            <div className="flex justify-between py-1">
                              <span className="text-muted-foreground">CPs:</span>
                              <span className="font-bold">{productionData.classB.cps}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

            {/* Material Credit Deductions */}
            <Card className="border-amber-200 shadow-sm">
                <CardHeader className="pb-4 pt-4 px-6 bg-gradient-to-r from-amber-50 to-white border-b border-amber-200">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-base font-bold text-amber-700">Material Credit Deductions</CardTitle>
                    <p className="text-sm text-muted-foreground">Total Credit = Qty x Unit Price</p>
                  </div>
                </CardHeader>
                <CardContent className="pt-5 px-6 pb-5 space-y-4">
                  {/* Material Deductions Table */}
                  <div className="w-full overflow-x-auto">
                    <div className="border rounded-lg overflow-hidden">
                      <div className="max-h-[400px] overflow-y-auto">
                        <Table>
                        <TableHeader className="sticky top-0 bg-slate-50 z-10">
                          <TableRow>
                            <TableHead className="font-bold py-3">Reference No.</TableHead>
                            <TableHead className="font-bold py-3">Date Issued</TableHead>
                            <TableHead className="font-bold py-3">Material Name</TableHead>
                            <TableHead className="text-right font-bold py-3">Quantity</TableHead>
                            <TableHead className="text-right font-bold py-3">Unit Price</TableHead>
                            <TableHead className="text-right font-bold py-3">Total Amount</TableHead>
                            <TableHead className="text-right font-bold py-3">Deduction Applied</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {materialDeductions.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="h-16 text-center text-muted-foreground">
                                No material credit deductions found for this payroll.
                              </TableCell>
                            </TableRow>
                          ) : materialDeductions.map((material) => {
                            const hasError = material.remainingBalance < 0 || material.deductionApplied > material.totalCredit;
                            return (
                              <TableRow key={material.refNo} className={hasError ? "bg-red-50 hover:bg-red-100" : "hover:bg-amber-50/50"}>
                                <TableCell className="font-semibold py-3">{material.refNo}</TableCell>
                                <TableCell className="py-3">{material.dateIssued}</TableCell>
                                <TableCell className="py-3">{material.materialName}</TableCell>
                                <TableCell className="text-right py-3">{material.quantity} {material.unit}</TableCell>
                                <TableCell className="text-right py-3">&#8369;{material.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                <TableCell className="text-right font-bold py-3">&#8369;{material.totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                <TableCell className={`text-right font-bold py-3 ${material.deductionApplied > material.totalCredit ? 'text-red-600' : 'text-amber-700'}`}>
                                  &#8369;{material.deductionApplied.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  {material.deductionApplied > material.totalCredit && <span className="ml-1"></span>}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm px-2">
                    <p className="text-muted-foreground">
                      Showing <span className="font-semibold">{materialDeductions.length}</span> material credit {materialDeductions.length === 1 ? "record" : "records"}
                    </p>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border-2 border-amber-300">
                    <span className="font-bold text-amber-700">Total Material Credit Deductions</span>
                    <span className="font-bold text-amber-700 text-2xl">&#8369;{totalMaterialDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </CardContent>
            </Card>

          {/* Computation Summary - Full Width */}
          <Card className="border-emerald-300 shadow-lg bg-gradient-to-br from-emerald-50 via-white to-blue-50">
            <CardHeader className="px-4 pb-4 pt-4 bg-gradient-to-r from-emerald-100 to-blue-100 border-b-2 border-emerald-300 sm:px-8 sm:pb-5 sm:pt-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-emerald-700 sm:text-xl">Computation Summary</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Complete breakdown and final payroll computation</p>
                </div>
                <div className="text-sm text-muted-foreground bg-white px-4 py-2 rounded-lg border">
                  <p className="font-semibold">Formula: <span className="text-emerald-700">Net Income = Gross Income - Total Deductions</span></p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-4 sm:px-8 sm:pb-6 sm:pt-6">
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-bold text-base py-4">Computation Summary</TableHead>
                      <TableHead className="text-right font-bold text-base py-4 min-w-[200px] whitespace-nowrap">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  <TableRow className="hover:bg-emerald-50/30">
                    <TableCell className="py-4 font-semibold">Gross Income</TableCell>
                    <TableCell className="text-right py-4 font-bold text-emerald-700 text-lg whitespace-nowrap">&#8369;{grossIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-amber-50/30">
                    <TableCell className="py-4 pl-8">Material Credit Deductions</TableCell>
                    <TableCell className="text-right py-4 font-semibold text-amber-700 whitespace-nowrap">&#8369;{totalMaterialDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-red-50/30">
                    <TableCell className="py-4 pl-8">Previous Unpaid Balance</TableCell>
                    <TableCell className="text-right py-4 font-semibold text-red-600 whitespace-nowrap">&#8369;{previousUnpaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-red-50/30">
                    <TableCell className="py-4 pl-8">Labor Cost</TableCell>
                    <TableCell className="text-right py-4 font-semibold text-red-600 whitespace-nowrap">&#8369;{laborCostAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-red-50/30">
                    <TableCell className="py-4 pl-8">Other Authorized Deductions</TableCell>
                    <TableCell className="text-right py-4 font-semibold text-red-600 whitespace-nowrap">&#8369;{otherAuthorizedDeductionsTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  {displayedOtherAuthorizedDeductionItems.map((deduction, index) => (
                      <TableRow key={`${deduction.type}-${index}`} className="hover:bg-red-50/20">
                        <TableCell className="py-2 pl-12 text-sm text-muted-foreground">{deduction.type}</TableCell>
                        <TableCell className="text-right py-2 text-sm font-medium text-red-600 whitespace-nowrap">
                          &#8369;{deduction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                  ))}
                  <TableRow className="border-t-2 border-red-300 bg-red-50">
                    <TableCell className="py-4 font-bold">Total Deductions</TableCell>
                    <TableCell className="text-right py-4 font-bold text-red-600 text-lg whitespace-nowrap">&#8369;{totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow className="border-t-4 border-emerald-400 bg-gradient-to-r from-emerald-100 to-emerald-50">
                    <TableCell className="py-6 font-bold text-emerald-700 text-lg">NET INCOME <span className="text-muted-foreground font-normal text-sm ml-2">(Amount to be released)</span></TableCell>
                    <TableCell className="text-right py-6 font-bold text-emerald-700 text-2xl whitespace-nowrap sm:text-3xl">&#8369;{netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  {Math.abs(netIncome - slip.netIncome) > 0.01 && (
                    <TableRow className="bg-red-50 border-2 border-red-400">
                      <TableCell colSpan={2} className="py-3 text-center">
                        <span className="text-red-600 font-bold">WARNING: Net income mismatch detected. Expected: &#8369;{slip.netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Payroll Audit Trail */}
          <Card className="border-blue-200 shadow-sm">
            <CardHeader className="px-4 pb-4 pt-4 bg-gradient-to-r from-blue-50 to-white border-b border-blue-200 sm:px-8">
              <CardTitle className="text-base font-bold text-blue-700">Payroll Audit Trail</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-4 sm:px-8 sm:pb-6">
              {auditEntries.length === 0 ? (
                <div className="rounded-md border bg-slate-50 p-4 text-sm text-muted-foreground">
                  No payroll personnel audit records have been captured for this slip yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {auditEntries.map((entry) => (
                    <div key={entry.id} className="grid grid-cols-1 gap-2 rounded-md border bg-white p-3 md:grid-cols-[160px_1fr]">
                      <div>
                        <Badge className={
                          entry.action === "Created" ? "bg-slate-100 text-slate-700" :
                          entry.action === "Edited" ? "bg-amber-100 text-amber-700" :
                          entry.action === "Resubmitted" ? "bg-violet-100 text-violet-700" :
                          "bg-emerald-100 text-emerald-700"
                        }>
                          {entry.action}
                        </Badge>
                        <p className="mt-2 text-xs text-muted-foreground">{entry.timestamp}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">{entry.account} <span className="font-normal text-muted-foreground">({entry.role})</span></p>
                        <p className="text-sm text-muted-foreground">{entry.remarks}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between items-center border-t pt-3 mt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-slate-300 hover:bg-slate-100"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Records
            </Button>
            <div className="flex gap-2">
              {slip.validationStatus === "Draft" && (
                <>
                  <Button
                    variant="outline"
                    className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => onEdit?.(slip)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={!isValid || isSubmitting}
                    onClick={async () => {
                      try {
                        setIsSubmitting(true);
                        await onSubmit?.(slip);
                        onClose();
                      } catch {
                        // The parent submit handler already reports the error toast.
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                    {isSubmitting ? "Submitting..." : "Submit for Validation"}
                  </Button>
                </>
              )}
              {slip.validationStatus !== "Draft" && (
                <>
                  <Button variant="outline" className="border-blue-600 text-blue-700 hover:bg-blue-50" onClick={() => window.print()}>
                    <Printer className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={downloadPdf}>
                    <Download className="h-4 w-4 mr-1" />
                    Download PDF
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


