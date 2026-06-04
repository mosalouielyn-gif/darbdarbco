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
  LayoutDashboard, Wallet, FileText, History, Plus, Search, Eye, Edit, Trash2,
  Send, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Printer, Download, Save, X, Loader2,
} from "lucide-react";
import { User } from "../types";
import { toast } from "sonner";
import { useAppData } from "../../lib/app-data-context";
import { createPayrollSlip, deletePayrollSlip, submitPayrollSlip, updatePayrollSlip } from "../../lib/api";
import { currentPayrollPeriodLabel, databaseDateKey, formatSystemDateTime, todaySystemDate } from "../../lib/date-time";
import { usePersistentState } from "../../lib/use-persistent-state";

interface Props { user: User; onLogout: () => void }

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "beneficiary", label: "Beneficiary Payroll", icon: <Wallet className="h-4 w-4" /> },
  { id: "records", label: "Payroll Records", icon: <History className="h-4 w-4" /> },
];

export function PayrollPersonnelDashboard({ user, onLogout }: Props) {
  const { data } = useAppData();
  const [active, setActive] = usePersistentState("darbco.payrollPersonnel.active", "dashboard");
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const beneficiaries = (data?.beneficiaries ?? []).map(mapBeneficiary);
  const productionRecords = (data?.productionRecords ?? []).map(mapProductionRecord);

  useEffect(() => {
    setPayrollRecords((data?.payrollSlips ?? []).map(mapPayrollSlip));
  }, [data?.payrollSlips]);

  return (
    <DarbcoLayout user={user} onLogout={onLogout} navItems={NAV} active={active} onChange={setActive}>
      {active === "dashboard" && <Dashboard onNavigate={setActive} />}
      {active === "beneficiary" && <BeneficiaryPayroll user={user} beneficiaries={beneficiaries} productionRecords={productionRecords} payrollRecords={payrollRecords} setPayrollRecords={setPayrollRecords} />}
      {active === "records" && <PayrollRecords records={payrollRecords} />}
    </DarbcoLayout>
  );
}

function Dashboard({ onNavigate }: { onNavigate: (id: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-emerald-700" />Payroll Dashboard
        </h1>
        <div className="text-muted-foreground">June 2, 2026</div>
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
          onClick={() => onNavigate("records")}
        />
        <KpiCard
          label="Approved Payroll"
          value="3"
          subtext="Ready for release"
          color="emerald"
          onClick={() => onNavigate("records")}
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
              onClick={() => onNavigate("beneficiary")}
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
              onClick={() => onNavigate("records")}
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <History className="h-6 w-6 text-emerald-700" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-emerald-700">View Payroll Records</div>
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
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₱</span>
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
};

type BeneficiaryOption = { id: string; dbId: number; code: string; name: string };
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

function mapBeneficiary(row: any): BeneficiaryOption {
  return {
    id: String(row.id),
    dbId: Number(row.id),
    code: String(row.code ?? row.beneficiary_code ?? row.id),
    name: row.name ?? row.full_name ?? "",
  };
}

function mapPayrollSlip(row: any): PayrollRecord {
  const classABoxes = Number(row.class_a_boxes ?? 0);
  const classBBoxes = Number(row.class_b_boxes ?? 0);
  const specialBoxes = Number(row.special_boxes ?? row.special_product_boxes ?? 0);

  return {
    id: Number(row.id),
    slipNo: String(row.slip_no ?? row.slipNo ?? row.id),
    period: row.payroll_period ?? row.period ?? "",
    beneficiary: row.beneficiary_name ?? row.beneficiary ?? "",
    beneficiaryId: Number(row.beneficiary_id) || undefined,
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

function BeneficiaryPayroll({ user, beneficiaries, productionRecords, payrollRecords, setPayrollRecords }: {
  user: User;
  beneficiaries: BeneficiaryOption[];
  productionRecords: PayrollProductionRecord[];
  payrollRecords: PayrollRecord[];
  setPayrollRecords: Dispatch<SetStateAction<PayrollRecord[]>>;
}) {
  const [openPrepare, setOpenPrepare] = useState(false);
  const [viewSlip, setViewSlip] = useState<PayrollRecord | null>(null);
  const [editRecord, setEditRecord] = useState<PayrollRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<PayrollRecord | null>(null);
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all-period");
  const [validationFilter, setValidationFilter] = useState("all-validation");
  const [approvalFilter, setApprovalFilter] = useState("all-approval");
  const [submittingRecordId, setSubmittingRecordId] = useState<number | null>(null);
  const [isDeletingPayroll, setIsDeletingPayroll] = useState(false);
  const [auditRecords, setAuditRecords] = useState<PayrollAuditRecord[]>([]);
  const currentPeriod = currentPayrollPeriodLabel();
  const periodOptions = Array.from(new Set([currentPeriod, ...payrollRecords.map((record) => record.period).filter(Boolean)]));

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

  // Filter payroll records
  const filteredRecords = payrollRecords.filter((record) => {
    const q = search.trim().toLowerCase();
    if (q && !record.slipNo.toLowerCase().includes(q) && !record.beneficiary.toLowerCase().includes(q)) return false;

    if (periodFilter !== "all-period" && record.period !== periodFilter) return false;

    // Validation status filter
    if (validationFilter === "draft" && record.validationStatus !== "Draft") return false;
    if (validationFilter === "submitted" && record.validationStatus !== "Submitted for Validation") return false;
    if (validationFilter === "validated" && record.validationStatus !== "Validated") return false;
    if (validationFilter === "returned" && record.validationStatus !== "Returned for Correction") return false;

    // Approval status filter
    if (approvalFilter === "pending" && record.approvalStatus !== "Pending Approval") return false;
    if (approvalFilter === "approved" && record.approvalStatus !== "Approved") return false;
    if (approvalFilter === "rejected" && record.approvalStatus !== "Rejected") return false;

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
      setSubmittingRecordId(record.id);
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
    } finally {
      setSubmittingRecordId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteRecord) return;
    try {
      setIsDeletingPayroll(true);
      await deletePayrollSlip(deleteRecord.id, {
        user_id: currentUserId(user),
        user_name: user.name,
      });
      setPayrollRecords((current) => current.filter((record) => record.id !== deleteRecord.id));
      toast.success(`${deleteRecord.slipNo} deleted`);
      setDeleteRecord(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete payroll slip.");
    } finally {
      setIsDeletingPayroll(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-emerald-700" />Beneficiary Payroll
          </h1>
          <p className="text-muted-foreground text-sm">Prepare payroll records for beneficiaries</p>
        </div>
        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 sm:w-auto" onClick={() => setOpenPrepare(true)}>
          <Plus className="h-4 w-4 mr-1" />Prepare Beneficiary Payroll
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <div className="relative min-w-0 flex-1 sm:min-w-[220px]">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input placeholder="Search beneficiary payroll..." className="pl-8 h-9" value={search} onChange={(event) => setSearch(event.target.value)} />
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
            <Select value={validationFilter} onValueChange={setValidationFilter}>
              <SelectTrigger className="h-9 w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all-validation">All Validation Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="validated">Validated</SelectItem>
                <SelectItem value="returned">Returned for Correction</SelectItem>
              </SelectContent>
            </Select>
            <Select value={approvalFilter} onValueChange={setApprovalFilter}>
              <SelectTrigger className="h-9 w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all-approval">All Approval Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
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
                <TableHead>Validation Status</TableHead>
                <TableHead>Approval Status</TableHead>
                <TableHead className="w-[150px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground h-24">
                    No beneficiary payroll records match the selected filters.
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
                    <TableCell className="text-right">₱{record.grossIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">₱{record.totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-700">₱{record.netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{getValidationBadge(record.validationStatus)}</TableCell>
                    <TableCell>{getApprovalBadge(record.approvalStatus)}</TableCell>
                    <TableCell className="w-[150px]">
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
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 shrink-0 p-0 text-red-600 hover:text-red-700"
                          onClick={() => setDeleteRecord(record)}
                          title="Delete"
                          aria-label={`Delete ${record.slipNo}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 shrink-0 p-0 text-violet-600 hover:text-violet-700"
                          onClick={() => handleSubmitForValidation(record)}
                          disabled={submittingRecordId === record.id}
                          title="Submit for Validation"
                          aria-label={`Submit ${record.slipNo} for validation`}
                        >
                          {submittingRecordId === record.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground">Showing {filteredRecords.length} of {payrollRecords.length} records</span>
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
        nextSlipNo={`BP-2026-${String(payrollRecords.length + 1).padStart(3, "0")}`}
        onSave={handleSavePayroll}
      />
      {viewSlip && (
        <ViewPayrollSlipDialog
          slip={viewSlip}
          auditEntries={auditRecords.filter((entry) => entry.slipNo === viewSlip.slipNo)}
          onClose={() => setViewSlip(null)}
          onEdit={(record) => {
            setViewSlip(null);
            setEditRecord(record);
            setOpenPrepare(true);
          }}
          onSubmit={handleSubmitForValidation}
        />
      )}

      <Dialog open={!!deleteRecord} onOpenChange={(open) => !open && setDeleteRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Trash2 className="h-5 w-5" />Delete Beneficiary Payroll
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteRecord?.slipNo}</strong> for <strong>{deleteRecord?.beneficiary}</strong>? This will remove it from the Beneficiary Payroll list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRecord(null)} disabled={isDeletingPayroll}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirmDelete} disabled={isDeletingPayroll}>
              {isDeletingPayroll ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
              {isDeletingPayroll ? "Deleting..." : "Delete Payroll"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PreparePayrollDialog({ open, onOpenChange, user, editRecord, beneficiaries, productionRecords, nextSlipNo, onSave }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  user: User;
  editRecord?: PayrollRecord | null;
  beneficiaries: BeneficiaryOption[];
  productionRecords: PayrollProductionRecord[];
  nextSlipNo: string;
  onSave: (record: PayrollRecord) => Promise<void> | void;
}) {
  const today = todaySystemDate();
  const [showProductionDetails, setShowProductionDetails] = useState(false);
  const [otherDeductions, setOtherDeductions] = useState<any[]>([]);
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
    if (!selectedBeneficiaryId) return false;
    if (record.beneficiaryId && record.beneficiaryId !== selectedBeneficiaryId) return false;
    if (!record.beneficiaryId && selectedBeneficiaryOption && record.beneficiaryName !== selectedBeneficiaryOption.name) return false;
    if (!periodRange || !record.harvestDate) return true;
    const harvestDate = new Date(`${record.harvestDate}T00:00:00`);
    if (Number.isNaN(harvestDate.getTime())) return true;
    return harvestDate >= periodRange.start && harvestDate <= periodRange.end;
  });

  const creditMaterials: { refNo: string; dateIssued: string; materialName: string; quantity: number; unit: string; amountCharged: number; status: string; remaining: number }[] = [];

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

  const totalCreditDeductions = creditMaterials.reduce((sum, c) => sum + c.remaining, 0);
  const previousBalance = 0;
  const laborCostAmount = Math.max(0, parseFloat(laborCost) || 0);
  const otherDeductionsTotal = otherDeductions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  const totalDeductions = totalCreditDeductions + previousBalance + laborCostAmount + otherDeductionsTotal;
  const netIncome = grossIncome - totalDeductions;

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

    setSavingAction(validationStatus === "Submitted for Validation" ? "submit" : "draft");

    try {
      await onSave({
        id: editRecord?.id ?? Date.now(),
        slipNo: editRecord?.slipNo ?? nextSlipNo,
        period: payrollPeriod,
        beneficiary: beneficiary.name,
        beneficiaryId: beneficiary.dbId,
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
                        value={selectedBeneficiary || ""}
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
                    <TableCell className="text-right">{classABigBoxes || "—"}</TableCell>
                    <TableCell className="text-right">
                      <CurrencyInput value={priceClassABig} onChange={setPriceClassABig} label="Class A Big Hands price" />
                    </TableCell>
                    <TableCell className="text-right">₱{subtotalClassABig.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Class A - Small Hands</TableCell>
                    <TableCell className="text-right">{classASmallBoxes || "—"}</TableCell>
                    <TableCell className="text-right">
                      <CurrencyInput value={priceClassASmall} onChange={setPriceClassASmall} label="Class A Small Hands price" />
                    </TableCell>
                    <TableCell className="text-right">₱{subtotalClassASmall.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Class A - CPs</TableCell>
                    <TableCell className="text-right">{classACpBoxes || "—"}</TableCell>
                    <TableCell className="text-right">
                      <CurrencyInput value={priceClassACp} onChange={setPriceClassACp} label="Class A CPs price" />
                    </TableCell>
                    <TableCell className="text-right">₱{subtotalClassACp.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Class B - Big Hands</TableCell>
                    <TableCell className="text-right">{classBBigBoxes || "—"}</TableCell>
                    <TableCell className="text-right">
                      <CurrencyInput value={priceClassBBig} onChange={setPriceClassBBig} label="Class B Big Hands price" />
                    </TableCell>
                    <TableCell className="text-right">₱{subtotalClassBBig.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Class B - Small Hands</TableCell>
                    <TableCell className="text-right">{classBSmallBoxes || "—"}</TableCell>
                    <TableCell className="text-right">
                      <CurrencyInput value={priceClassBSmall} onChange={setPriceClassBSmall} label="Class B Small Hands price" />
                    </TableCell>
                    <TableCell className="text-right">₱{subtotalClassBSmall.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Class B - CPs</TableCell>
                    <TableCell className="text-right">{classBCpBoxes || "—"}</TableCell>
                    <TableCell className="text-right">
                      <CurrencyInput value={priceClassBCp} onChange={setPriceClassBCp} label="Class B CPs price" />
                    </TableCell>
                    <TableCell className="text-right">₱{subtotalClassBCp.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Special Product</TableCell>
                    <TableCell className="text-right">{specialBoxes || "—"}</TableCell>
                    <TableCell className="text-right">
                      <CurrencyInput value={priceSpecial} onChange={setPriceSpecial} label="Special Product price" />
                    </TableCell>
                    <TableCell className="text-right">₱{subtotalSpecial.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow className="bg-emerald-50/50">
                    <TableCell className="font-semibold">Class A Total</TableCell>
                    <TableCell className="text-right font-semibold">{classABoxes || "—"}</TableCell>
                    <TableCell />
                    <TableCell className="text-right font-semibold">₱{subtotalA.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow className="bg-amber-50/50">
                    <TableCell className="font-semibold">Class B Total</TableCell>
                    <TableCell className="text-right font-semibold">{classBBoxes || "—"}</TableCell>
                    <TableCell />
                    <TableCell className="text-right font-semibold">₱{subtotalB.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-md">
                <span className="font-semibold text-emerald-700">Gross Income</span>
                <span className="text-xl font-bold text-emerald-700">₱{grossIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
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
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Remaining Balance</TableHead>
                      <TableHead className="text-right">Amount Charged</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {creditMaterials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground h-16">
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
                        <TableCell>
                          <Badge className={
                            credit.status === "Pending" ? "bg-amber-100 text-amber-800"
                            : credit.status === "Partially Deducted" ? "bg-orange-100 text-orange-800"
                            : "bg-emerald-100 text-emerald-800"
                          }>{credit.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">â‚±{credit.remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right">₱{credit.amountCharged.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center p-3 bg-amber-50 rounded-md">
                <span className="font-semibold text-amber-700">Total Material Credit Deductions</span>
                <span className="text-xl font-bold text-amber-700">₱{totalCreditDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
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
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₱</span>
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
                  Leave this as ₱0.00 when no labor charge applies to this payroll.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section F: Other Authorized Deductions */}
          <Card>
            <CardHeader className="p-4 pb-2 flex-row items-center justify-between">
              <CardTitle className="text-base">Other Authorized Deductions</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOtherDeductions([...otherDeductions, { type: "", description: "", amount: "0", reference: "" }])}
              >
                <Plus className="h-4 w-4 mr-1" />Add Authorized Deduction
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {otherDeductions.length === 0 ? (
                <div className="text-center text-muted-foreground py-5 border rounded-md bg-slate-50">
                  No authorized deductions added.
                </div>
              ) : (
                <div className="space-y-3">
                  {otherDeductions.map((deduction, i) => (
                    <div key={i} className="border rounded-md p-3 bg-slate-50 grid grid-cols-1 lg:grid-cols-4 gap-3 items-start">
                      <Input
                        placeholder="Deduction type"
                        className="h-9"
                        value={deduction.type}
                        onChange={(e) => {
                          const updated = [...otherDeductions];
                          updated[i].type = e.target.value;
                          setOtherDeductions(updated);
                        }}
                      />
                      <Input
                        placeholder="Description"
                        className="h-9"
                        value={deduction.description}
                        onChange={(e) => {
                          const updated = [...otherDeductions];
                          updated[i].description = e.target.value;
                          setOtherDeductions(updated);
                        }}
                      />
                      <Input
                        type="number"
                        placeholder="Amount"
                        className="h-9"
                        value={deduction.amount}
                        onChange={(e) => {
                          const updated = [...otherDeductions];
                          updated[i].amount = e.target.value;
                          setOtherDeductions(updated);
                        }}
                      />
                      <div className="flex gap-2">
                        <Input
                          placeholder="Reference"
                          className="h-9 flex-1"
                          value={deduction.reference}
                          onChange={(e) => {
                            const updated = [...otherDeductions];
                            updated[i].reference = e.target.value;
                            setOtherDeductions(updated);
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 text-red-600 hover:text-red-700"
                          onClick={() => setOtherDeductions(otherDeductions.filter((_, idx) => idx !== i))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section G: Final Payroll Summary */}
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base text-emerald-700">Final Payroll Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Gross Income</span>
                <span className="font-semibold">₱{grossIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm text-amber-700">
                <span>Material Credit Deductions</span>
                <span className="font-semibold">−₱{totalCreditDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm text-red-600">
                <span>Previous Unpaid Balance</span>
                <span className="font-semibold">−₱{previousBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm text-red-600">
                <span>Labor Cost</span>
                <span className="font-semibold">−₱{laborCostAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm text-red-600">
                <span>Other Authorized Deductions</span>
                <span className="font-semibold">−₱{otherDeductionsTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-sm">
                <span className="font-semibold">Total Deductions</span>
                <span className="font-semibold text-red-600">₱{totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t-2 border-emerald-300 pt-3 flex justify-between items-center">
                <span className="text-lg font-bold text-emerald-700">Net Income</span>
                <span className="text-2xl font-bold text-emerald-700">₱{netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
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

function ViewPayrollSlipDialog({ slip, auditEntries = [], onClose, onEdit, onSubmit }: {
  slip: PayrollRecord;
  auditEntries?: PayrollAuditRecord[];
  onClose: () => void;
  onEdit?: (record: PayrollRecord) => void;
  onSubmit?: (record: PayrollRecord) => Promise<void> | void;
}) {
  if (!slip) return null;

  const [showBoxBreakdown, setShowBoxBreakdown] = useState(false);
  const [materialCategory, setMaterialCategory] = useState("all");
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

  const productionData = {
    refNo: slip.productionRecordId ? String(slip.productionRecordId) : "-",
    harvestDate: slip.harvestDate,
    classA: { total: classABoxes, bigHands: classABoxes, smallHands: 0, cps: 0 },
    classB: { total: classBBoxes, bigHands: classBBoxes, smallHands: 0, cps: 0 },
    special: specialBoxes
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

  const materialDeductions: { refNo: string; dateIssued: string; category: string; materialName: string; quantity: number; unit: string; unitPrice: number; totalCredit: number; deductionApplied: number; remainingBalance: number }[] = [];

  const filteredMaterials = materialCategory === "all"
    ? materialDeductions
    : materialDeductions.filter(m => m.category === materialCategory);

  // Total material deductions (all materials, not filtered)
  const totalMaterialDeductions = slip.creditDeduction ?? materialDeductions.reduce((sum, m) => sum + m.deductionApplied, 0);
  const previousUnpaid = slip.previousBalance ?? 0;
  const laborCostAmount = slip.laborCost ?? 0;
  const otherDeductions = slip.otherDeductions ?? 0;
  const computedTotalDeductions = totalMaterialDeductions + previousUnpaid + laborCostAmount + otherDeductions;
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
                    <p className="font-semibold">-</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-row flex-wrap gap-2 lg:flex-col">
                {getValidationBadge(slip.validationStatus)}
                {getApprovalBadge(slip.approvalStatus)}
                {isValid ? (
                  <Badge className="bg-emerald-100 text-emerald-700">✓ Validated</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-700">⚠ Has Errors</Badge>
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
                          <span className="text-red-600 mt-1">•</span>
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
                      <p className="font-semibold">BEN-{String(slip.id).padStart(3, '0')}</p>
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
                    <p className="text-sm text-muted-foreground">Formula: Subtotal = Number of Boxes × Price per Box</p>
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
                          <TableCell className="text-right py-3">₱{priceClassA.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-700 py-3">₱{subtotalClassA.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-emerald-50/50">
                          <TableCell className="font-semibold py-3">Class B</TableCell>
                          <TableCell className="text-right py-3">{productionData.classB.total}</TableCell>
                          <TableCell className="text-right py-3">₱{priceClassB.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-700 py-3">₱{subtotalClassB.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-emerald-50/50">
                          <TableCell className="font-semibold py-3">Special Product</TableCell>
                          <TableCell className="text-right py-3">{productionData.special}</TableCell>
                          <TableCell className="text-right py-3">₱{priceSpecial.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-700 py-3">₱{subtotalSpecial.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                        <TableRow className="border-t-2 border-emerald-400 bg-emerald-50">
                          <TableCell colSpan={3} className="font-bold text-emerald-700 py-4">GROSS INCOME <span className="text-muted-foreground font-normal text-sm ml-2">({totalBoxesProduction} Boxes Total)</span></TableCell>
                          <TableCell className="text-right font-bold text-emerald-700 text-xl py-4">₱{grossIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
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
                    <p className="text-sm text-muted-foreground">Total Credit = Qty × Unit Price</p>
                  </div>
                </CardHeader>
                <CardContent className="pt-5 px-6 pb-5 space-y-4">
                  {/* Category Filters */}
                  <div className="flex gap-2 flex-wrap p-3 bg-slate-50 rounded-lg border">
                    <Button
                      variant={materialCategory === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMaterialCategory("all")}
                      className={materialCategory === "all" ? "bg-amber-600 hover:bg-amber-700" : ""}
                    >
                      All ({materialDeductions.length})
                    </Button>
                    <Button
                      variant={materialCategory === "Fertilizers" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMaterialCategory("Fertilizers")}
                      className={materialCategory === "Fertilizers" ? "bg-amber-600 hover:bg-amber-700" : ""}
                    >
                      Fertilizers
                    </Button>
                    <Button
                      variant={materialCategory === "Pesticides" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMaterialCategory("Pesticides")}
                      className={materialCategory === "Pesticides" ? "bg-amber-600 hover:bg-amber-700" : ""}
                    >
                      Pesticides
                    </Button>
                    <Button
                      variant={materialCategory === "Tools" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMaterialCategory("Tools")}
                      className={materialCategory === "Tools" ? "bg-amber-600 hover:bg-amber-700" : ""}
                    >
                      Tools
                    </Button>
                    <Button
                      variant={materialCategory === "Packaging" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMaterialCategory("Packaging")}
                      className={materialCategory === "Packaging" ? "bg-amber-600 hover:bg-amber-700" : ""}
                    >
                      Packaging
                    </Button>
                  </div>

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
                            <TableHead className="font-bold py-3">Category</TableHead>
                            <TableHead className="text-right font-bold py-3">Quantity</TableHead>
                            <TableHead className="text-right font-bold py-3">Unit Price</TableHead>
                            <TableHead className="text-right font-bold py-3">Total Amount</TableHead>
                            <TableHead className="text-right font-bold py-3">Deduction Applied</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredMaterials.map((material) => {
                            const hasError = material.remainingBalance < 0 || material.deductionApplied > material.totalCredit;
                            return (
                              <TableRow key={material.refNo} className={hasError ? "bg-red-50 hover:bg-red-100" : "hover:bg-amber-50/50"}>
                                <TableCell className="font-semibold py-3">{material.refNo}</TableCell>
                                <TableCell className="py-3">{material.dateIssued}</TableCell>
                                <TableCell className="py-3">{material.materialName}</TableCell>
                                <TableCell className="py-3"><Badge variant="outline" className="text-xs">{material.category}</Badge></TableCell>
                                <TableCell className="text-right py-3">{material.quantity} {material.unit}</TableCell>
                                <TableCell className="text-right py-3">₱{material.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                <TableCell className="text-right font-bold py-3">₱{material.totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                <TableCell className={`text-right font-bold py-3 ${material.deductionApplied > material.totalCredit ? 'text-red-600' : 'text-amber-700'}`}>
                                  ₱{material.deductionApplied.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  {material.deductionApplied > material.totalCredit && <span className="ml-1">⚠</span>}
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
                      Showing <span className="font-semibold">{filteredMaterials.length}</span> of <span className="font-semibold">{materialDeductions.length}</span> materials
                    </p>
                    {materialCategory !== "all" && (
                      <p className="text-muted-foreground text-xs italic">
                        Filtered by {materialCategory}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border-2 border-amber-300">
                    <span className="font-bold text-amber-700">Total Material Deductions (All Categories)</span>
                    <span className="font-bold text-amber-700 text-2xl">₱{totalMaterialDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
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
                  <p className="font-semibold">Formula: <span className="text-emerald-700">Net Income = Gross Income − Total Deductions</span></p>
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
                    <TableCell className="text-right py-4 font-bold text-emerald-700 text-lg whitespace-nowrap">₱{grossIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-amber-50/30">
                    <TableCell className="py-4 pl-8">Material Credit Deductions</TableCell>
                    <TableCell className="text-right py-4 font-semibold text-amber-700 whitespace-nowrap">₱{totalMaterialDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-red-50/30">
                    <TableCell className="py-4 pl-8">Previous Unpaid Balance</TableCell>
                    <TableCell className="text-right py-4 font-semibold text-red-600 whitespace-nowrap">₱{previousUnpaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-red-50/30">
                    <TableCell className="py-4 pl-8">Labor Cost</TableCell>
                    <TableCell className="text-right py-4 font-semibold text-red-600 whitespace-nowrap">₱{laborCostAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-red-50/30">
                    <TableCell className="py-4 pl-8">Other Adjustments</TableCell>
                    <TableCell className="text-right py-4 font-semibold text-red-600 whitespace-nowrap">₱{otherDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow className="border-t-2 border-red-300 bg-red-50">
                    <TableCell className="py-4 font-bold">Total Deductions</TableCell>
                    <TableCell className="text-right py-4 font-bold text-red-600 text-lg whitespace-nowrap">₱{totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow className="border-t-4 border-emerald-400 bg-gradient-to-r from-emerald-100 to-emerald-50">
                    <TableCell className="py-6 font-bold text-emerald-700 text-lg">NET INCOME <span className="text-muted-foreground font-normal text-sm ml-2">(Amount to be released)</span></TableCell>
                    <TableCell className="text-right py-6 font-bold text-emerald-700 text-2xl whitespace-nowrap sm:text-3xl">₱{netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  {Math.abs(netIncome - slip.netIncome) > 0.01 && (
                    <TableRow className="bg-red-50 border-2 border-red-400">
                      <TableCell colSpan={2} className="py-3 text-center">
                        <span className="text-red-600 font-bold">⚠ WARNING: Net income mismatch detected. Expected: ₱{slip.netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
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
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => toast.success(`${slip.slipNo} PDF download prepared`)}>
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


function PayrollRecords({ records }: { records: PayrollRecord[] }) {
  const [viewSlip, setViewSlip] = useState<PayrollRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState("all-status");
  const [search, setSearch] = useState("");

  const auditRecords: PayrollAuditRecord[] = [];

  const allRecords: (PayrollRecord & { type: string })[] = records.map((record) => ({ ...record, type: "Beneficiary" }));

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

  // Filter records (only showing Beneficiary records)
  const filteredRecords = allRecords.filter((record) => {
    // Only show beneficiary records
    if (record.type !== "Beneficiary") return false;
    const q = search.trim().toLowerCase();
    if (q && !record.slipNo.toLowerCase().includes(q) && !record.beneficiary.toLowerCase().includes(q)) return false;

    // Approval status filter
    if (statusFilter === "approved" && record.approvalStatus !== "Approved") return false;
    if (statusFilter === "pending" && record.approvalStatus !== "Pending Approval") return false;
    if (statusFilter === "rejected" && record.approvalStatus !== "Rejected") return false;

    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <History className="h-6 w-6 text-emerald-700" />Payroll Records
          </h1>
          <p className="text-muted-foreground text-sm">View all payroll history</p>
        </div>
      </div>
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input placeholder="Search beneficiary payroll records..." className="pl-8 h-9" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all-status">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payroll Slip No.</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Payroll Period</TableHead>
                <TableHead>Beneficiary/Worker</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Net Income</TableHead>
                <TableHead>Validation Status</TableHead>
                <TableHead>Approval Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground h-24">
                    No payroll records match the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.slipNo}</TableCell>
                    <TableCell><Badge variant="outline">{record.type}</Badge></TableCell>
                    <TableCell>{record.period}</TableCell>
                    <TableCell>{record.beneficiary}</TableCell>
                    <TableCell>{record.harvestDate}</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-700">
                      ₱{record.netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{getValidationBadge(record.validationStatus)}</TableCell>
                    <TableCell>{getApprovalBadge(record.approvalStatus)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                        onClick={() => setViewSlip(record)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground">Showing {filteredRecords.length} of {allRecords.length} records</span>
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

      {viewSlip && (
        <ViewPayrollSlipDialog
          slip={viewSlip}
          auditEntries={auditRecords.filter((entry) => entry.slipNo === viewSlip.slipNo)}
          onClose={() => setViewSlip(null)}
        />
      )}
    </div>
  );
}


