import { useState, useEffect } from "react";
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
import {
  LayoutDashboard, Wallet, FileText, History, Plus, Search, Eye, Edit, Trash2,
  Send, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Printer, Download, Save, X,
} from "lucide-react";
import { User } from "../types";
import { toast } from "sonner";

interface Props { user: User; onLogout: () => void }

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "beneficiary", label: "Beneficiary Payroll", icon: <Wallet className="h-4 w-4" /> },
  { id: "records", label: "Payroll Records", icon: <History className="h-4 w-4" /> },
];

export function PayrollPersonnelDashboard({ user, onLogout }: Props) {
  const [active, setActive] = useState("dashboard");

  return (
    <DarbcoLayout user={user} onLogout={onLogout} navItems={NAV} active={active} onChange={setActive}>
      {active === "dashboard" && <Dashboard onNavigate={setActive} />}
      {active === "beneficiary" && <BeneficiaryPayroll user={user} />}
      {active === "records" && <PayrollRecords />}
    </DarbcoLayout>
  );
}

function Dashboard({ onNavigate }: { onNavigate: (id: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
        <div className={`text-3xl font-bold ${textColor}`}>{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{subtext}</div>
      </CardContent>
    </Card>
  );
}

type PayrollRecord = {
  id: number;
  slipNo: string;
  period: string;
  beneficiary: string;
  harvestDate: string;
  totalBoxes: number;
  grossIncome: number;
  totalDeductions: number;
  netIncome: number;
  validationStatus: string;
  approvalStatus: string;
};

function BeneficiaryPayroll({ user }: { user: User }) {
  const [openPrepare, setOpenPrepare] = useState(false);
  const [viewSlip, setViewSlip] = useState<PayrollRecord | null>(null);
  const [editRecord, setEditRecord] = useState<PayrollRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<PayrollRecord | null>(null);
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all-period");
  const [validationFilter, setValidationFilter] = useState("all-validation");
  const [approvalFilter, setApprovalFilter] = useState("all-approval");

  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([
    {
      id: 1,
      slipNo: "BP-2026-001",
      period: "May 16-31, 2026",
      beneficiary: "SALUDEZ LISA",
      harvestDate: "May 30, 2026",
      totalBoxes: 87,
      grossIncome: 34800.00,
      totalDeductions: 4500.00,
      netIncome: 30300.00,
      validationStatus: "Validated",
      approvalStatus: "Approved"
    },
    {
      id: 2,
      slipNo: "BP-2026-002",
      period: "May 16-31, 2026",
      beneficiary: "GARCIA MARIA",
      harvestDate: "May 28, 2026",
      totalBoxes: 95,
      grossIncome: 38000.00,
      totalDeductions: 2800.00,
      netIncome: 35200.00,
      validationStatus: "Validated",
      approvalStatus: "Approved"
    },
    {
      id: 3,
      slipNo: "BP-2026-003",
      period: "May 16-31, 2026",
      beneficiary: "REYES JUAN",
      harvestDate: "May 29, 2026",
      totalBoxes: 78,
      grossIncome: 31200.00,
      totalDeductions: 5200.00,
      netIncome: 26000.00,
      validationStatus: "Validated",
      approvalStatus: "Approved"
    },
    {
      id: 4,
      slipNo: "BP-2026-004",
      period: "May 16-31, 2026",
      beneficiary: "SANTOS PEDRO",
      harvestDate: "May 31, 2026",
      totalBoxes: 102,
      grossIncome: 40800.00,
      totalDeductions: 3600.00,
      netIncome: 37200.00,
      validationStatus: "Submitted for Validation",
      approvalStatus: "Pending Approval"
    },
    {
      id: 5,
      slipNo: "BP-2026-005",
      period: "June 1-15, 2026",
      beneficiary: "CRUZ ANNA",
      harvestDate: "June 2, 2026",
      totalBoxes: 68,
      grossIncome: 27200.00,
      totalDeductions: 1800.00,
      netIncome: 25400.00,
      validationStatus: "Draft",
      approvalStatus: "Pending Approval"
    },
    {
      id: 6,
      slipNo: "BP-2026-006",
      period: "June 1-15, 2026",
      beneficiary: "MENDOZA CARLO",
      harvestDate: "June 1, 2026",
      totalBoxes: 84,
      grossIncome: 33600.00,
      totalDeductions: 4100.00,
      netIncome: 29500.00,
      validationStatus: "Draft",
      approvalStatus: "Pending Approval"
    }
  ]);

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

    // Period filter
    if (periodFilter === "may-2026" && record.period !== "May 16-31, 2026") return false;
    if (periodFilter === "june-2026" && record.period !== "June 1-15, 2026") return false;

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

  const handleSavePayroll = (record: PayrollRecord) => {
    setPayrollRecords((current) => {
      const exists = current.some((item) => item.id === record.id);
      return exists
        ? current.map((item) => item.id === record.id ? record : item)
        : [record, ...current];
    });
    setOpenPrepare(false);
    setEditRecord(null);
    toast.success(record.validationStatus === "Submitted for Validation" ? "Payroll submitted for validation" : "Payroll draft saved");
  };

  const handleSubmitForValidation = (record: PayrollRecord) => {
    if (record.validationStatus === "Submitted for Validation") {
      toast.message(`${record.slipNo} is already submitted for validation.`);
      return;
    }
    if (record.validationStatus === "Validated" || record.approvalStatus === "Approved") {
      toast.message(`${record.slipNo} has already passed validation.`);
      return;
    }
    setPayrollRecords((current) => current.map((item) => item.id === record.id
      ? { ...item, validationStatus: "Submitted for Validation", approvalStatus: "Pending Approval" }
      : item
    ));
    toast.success(`${record.slipNo} submitted for validation`);
  };

  const handleConfirmDelete = () => {
    if (!deleteRecord) return;
    setPayrollRecords((current) => current.filter((record) => record.id !== deleteRecord.id));
    toast.success(`${deleteRecord.slipNo} deleted`);
    setDeleteRecord(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-emerald-700" />Beneficiary Payroll
          </h1>
          <p className="text-muted-foreground text-sm">Prepare payroll records for beneficiaries</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setOpenPrepare(true)}>
          <Plus className="h-4 w-4 mr-1" />Prepare Beneficiary Payroll
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input placeholder="Search beneficiary payroll..." className="pl-8 h-9" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all-period">All Periods</SelectItem>
                <SelectItem value="may-2026">May 16-31, 2026</SelectItem>
                <SelectItem value="june-2026">June 1-15, 2026</SelectItem>
              </SelectContent>
            </Select>
            <Select value={validationFilter} onValueChange={setValidationFilter}>
              <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all-validation">All Validation Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="validated">Validated</SelectItem>
                <SelectItem value="returned">Returned for Correction</SelectItem>
              </SelectContent>
            </Select>
            <Select value={approvalFilter} onValueChange={setApprovalFilter}>
              <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
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
                          title="Submit for Validation"
                          aria-label={`Submit ${record.slipNo} for validation`}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between pt-2">
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
        nextSlipNo={`BP-2026-${String(payrollRecords.length + 1).padStart(3, "0")}`}
        onSave={handleSavePayroll}
      />
      {viewSlip && (
        <ViewPayrollSlipDialog
          slip={viewSlip}
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
            <Button variant="outline" onClick={() => setDeleteRecord(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirmDelete}>Delete Payroll</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PreparePayrollDialog({ open, onOpenChange, user, editRecord, nextSlipNo, onSave }: { open: boolean; onOpenChange: (o: boolean) => void; user: User; editRecord?: PayrollRecord | null; nextSlipNo: string; onSave: (record: PayrollRecord) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [showProductionDetails, setShowProductionDetails] = useState(false);
  const [otherDeductions, setOtherDeductions] = useState<any[]>([]);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState("");
  const [payrollPeriod, setPayrollPeriod] = useState("June 1-15, 2026");

  const beneficiaries = [
    { id: "BEN-001", name: "SALUDEZ LISA" },
    { id: "BEN-002", name: "GARCIA MARIA" },
    { id: "BEN-003", name: "REYES JUAN" },
    { id: "BEN-004", name: "SANTOS PEDRO" },
    { id: "BEN-005", name: "CRUZ ANNA" },
    { id: "BEN-006", name: "MENDOZA CARLO" }
  ];

  // Populate form with edit data when editRecord is provided
  useEffect(() => {
    if (editRecord && open) {
      // Map beneficiary name to ID
      const beneficiary = beneficiaries.find(b => b.name === editRecord.beneficiary);
      setSelectedBeneficiary(beneficiary?.id || "");
      setPayrollPeriod(editRecord.period);
      setOtherDeductions([]);
      setShowProductionDetails(false);
    } else if (!open) {
      // Reset form when closing
      setSelectedBeneficiary("");
      setPayrollPeriod("June 1-15, 2026");
      setOtherDeductions([]);
      setShowProductionDetails(false);
    }
  }, [editRecord, open]);

  const productionRecords = selectedBeneficiary ? [
    {
      refNo: "PR-2026-0245",
      harvestDate: "June 2, 2026",
      classA: 52,
      classB: 28,
      special: 8,
      total: 88,
      classA_big: 30,
      classA_small: 15,
      classA_cp: 7,
      classB_big: 16,
      classB_small: 8,
      classB_cp: 4
    }
  ] : [];

  const creditMaterials = selectedBeneficiary ? [
    {
      refNo: "CR-2026-0089",
      dateIssued: "May 25, 2026",
      materialName: "Fertilizer - Urea",
      quantity: 2,
      unit: "sacks",
      amountCharged: 1800.00,
      status: "Pending",
      remaining: 1800.00
    },
    {
      refNo: "CR-2026-0102",
      dateIssued: "May 28, 2026",
      materialName: "Fungicide Spray",
      quantity: 3,
      unit: "liters",
      amountCharged: 1200.00,
      status: "Pending",
      remaining: 1200.00
    }
  ] : [];

  const classABoxes = productionRecords.reduce((sum, r) => sum + r.classA, 0);
  const classBBoxes = productionRecords.reduce((sum, r) => sum + r.classB, 0);
  const specialBoxes = productionRecords.reduce((sum, r) => sum + r.special, 0);
  const totalBoxes = productionRecords.reduce((sum, r) => sum + r.total, 0);

  const priceClassA = 400.00;
  const priceClassB = 350.00;
  const priceSpecial = 300.00;

  const subtotalA = classABoxes * priceClassA;
  const subtotalB = classBBoxes * priceClassB;
  const subtotalSpecial = specialBoxes * priceSpecial;
  const grossIncome = subtotalA + subtotalB + subtotalSpecial;

  const totalCreditDeductions = creditMaterials.reduce((sum, c) => sum + c.amountCharged, 0);
  const previousBalance = 0;
  const otherDeductionsTotal = otherDeductions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  const totalDeductions = totalCreditDeductions + previousBalance + otherDeductionsTotal;
  const netIncome = grossIncome - totalDeductions;

  const handleClose = () => {
    setSelectedBeneficiary("");
    setPayrollPeriod("June 1-15, 2026");
    setOtherDeductions([]);
    setShowProductionDetails(false);
    onOpenChange(false);
  };

  const handleSave = (validationStatus: "Draft" | "Submitted for Validation") => {
    const beneficiary = beneficiaries.find((item) => item.id === selectedBeneficiary);

    if (!beneficiary || !payrollPeriod.trim()) {
      toast.error("Please select a beneficiary and payroll period.");
      return;
    }

    onSave({
      id: editRecord?.id ?? Date.now(),
      slipNo: editRecord?.slipNo ?? nextSlipNo,
      period: payrollPeriod,
      beneficiary: beneficiary.name,
      harvestDate: productionRecords[0]?.harvestDate ?? today,
      totalBoxes,
      grossIncome,
      totalDeductions,
      netIncome,
      validationStatus,
      approvalStatus: validationStatus === "Submitted for Validation" ? "Pending Approval" : editRecord?.approvalStatus ?? "Pending Approval",
    });

    setSelectedBeneficiary("");
    setPayrollPeriod("June 1-15, 2026");
    setOtherDeductions([]);
    setShowProductionDetails(false);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="!max-w-[1500px] w-[90vw] max-h-[90vh] overflow-y-auto p-0 overflow-x-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b-2 border-emerald-200 shadow-sm px-8 py-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 text-xl">
              {editRecord ? (
                <>
                  <Edit className="h-6 w-6" />Edit Beneficiary Payroll - {editRecord.slipNo}
                </>
              ) : (
                <>
                  <Plus className="h-6 w-6" />Prepare Beneficiary Payroll
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-base">
              {editRecord
                ? "Update the payroll slip details for the selected beneficiary"
                : "Create a new payroll slip for beneficiary earnings and deductions"
              }
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Section A: Beneficiary Information */}
          <Card className="border-emerald-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Beneficiary Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
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
                      <Input type="date" defaultValue={today} />
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
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-emerald-700">Production Records from Production Clerk</CardTitle>
                <p className="text-xs text-muted-foreground">Read-only</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
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
                  {productionRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                        No verified production records found for the selected beneficiary and payroll period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    productionRecords.map((record) => (
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
                  {productionRecords.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center">No production details available</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-semibold mb-2 text-emerald-700">Class A Boxes</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between"><span>Big Hands:</span><span>{productionRecords[0].classA_big}</span></div>
                          <div className="flex justify-between"><span>Small Hands:</span><span>{productionRecords[0].classA_small}</span></div>
                          <div className="flex justify-between"><span>CPs:</span><span>{productionRecords[0].classA_cp}</span></div>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold mb-2 text-amber-700">Class B Boxes</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between"><span>Big Hands:</span><span>{productionRecords[0].classB_big}</span></div>
                          <div className="flex justify-between"><span>Small Hands:</span><span>{productionRecords[0].classB_small}</span></div>
                          <div className="flex justify-between"><span>CPs:</span><span>{productionRecords[0].classB_cp}</span></div>
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
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-emerald-700">Earnings Computation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
                    <TableCell>Class A</TableCell>
                    <TableCell className="text-right">{classABoxes || "—"}</TableCell>
                    <TableCell className="text-right">₱{priceClassA.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">₱{subtotalA.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Class B</TableCell>
                    <TableCell className="text-right">{classBBoxes || "—"}</TableCell>
                    <TableCell className="text-right">₱{priceClassB.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">₱{subtotalB.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Special Product</TableCell>
                    <TableCell className="text-right">{specialBoxes || "—"}</TableCell>
                    <TableCell className="text-right">₱{priceSpecial.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">₱{subtotalSpecial.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-md">
                <span className="font-semibold text-emerald-700">Gross Income</span>
                <span className="text-2xl font-bold text-emerald-700">₱{grossIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </CardContent>
          </Card>

          {/* Section D: Material Credit Deductions */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-amber-700">Credit Materials from Inventory Bookkeeper</CardTitle>
                <p className="text-xs text-muted-foreground">Read-only</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Credit Ref. No.</TableHead>
                      <TableHead>Date Issued</TableHead>
                      <TableHead>Material Name</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Amount Charged</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {creditMaterials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
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

          {/* Section E: Other Authorized Deductions */}
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <CardTitle className="text-base">Other Authorized Deductions</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOtherDeductions([...otherDeductions, { type: "", description: "", amount: "0", reference: "" }])}
              >
                <Plus className="h-4 w-4 mr-1" />Add Authorized Deduction
              </Button>
            </CardHeader>
            <CardContent>
              {otherDeductions.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 border rounded-md bg-slate-50">
                  No authorized deductions added.
                </div>
              ) : (
                <div className="space-y-3">
                  {otherDeductions.map((deduction, i) => (
                    <div key={i} className="border rounded-md p-3 bg-slate-50 grid grid-cols-4 gap-3 items-start">
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

          {/* Section F: Final Payroll Summary */}
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-emerald-700">Final Payroll Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
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
                <span>Other Authorized Deductions</span>
                <span className="font-semibold">−₱{otherDeductionsTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-sm">
                <span className="font-semibold">Total Deductions</span>
                <span className="font-semibold text-red-600">₱{totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t-2 border-emerald-300 pt-3 flex justify-between items-center">
                <span className="text-lg font-bold text-emerald-700">Net Income</span>
                <span className="text-3xl font-bold text-emerald-700">₱{netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </CardContent>
          </Card>

          {/* Section G: Payroll Tracking */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payroll Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
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
        <div className="sticky bottom-0 bg-white border-t-2 border-slate-200 px-8 py-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            {editRecord ? (
              <>
                <Button variant="outline" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50" onClick={() => handleSave("Draft")}>
                  <Save className="h-4 w-4 mr-1" />Update Draft
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleSave("Submitted for Validation")}>
                  <Send className="h-4 w-4 mr-1" />Update & Submit for Validation
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50" onClick={() => handleSave("Draft")}>
                  <Save className="h-4 w-4 mr-1" />Save as Draft
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleSave("Submitted for Validation")}>
                  <Send className="h-4 w-4 mr-1" />Submit for Validation
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ViewPayrollSlipDialog({ slip, onClose, onEdit, onSubmit }: { slip: PayrollRecord; onClose: () => void; onEdit?: (record: PayrollRecord) => void; onSubmit?: (record: PayrollRecord) => void }) {
  if (!slip) return null;

  const [showBoxBreakdown, setShowBoxBreakdown] = useState(false);
  const [materialCategory, setMaterialCategory] = useState("all");

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

  // Production data from production clerk
  const productionData = {
    refNo: "PR-2026-0245",
    harvestDate: slip.harvestDate,
    classA: { total: 52, bigHands: 30, smallHands: 15, cps: 7 },
    classB: { total: 28, bigHands: 16, smallHands: 8, cps: 4 },
    special: 8
  };

  // Pricing
  const priceClassA = 400.00;
  const priceClassB = 350.00;
  const priceSpecial = 300.00;

  // Computed earnings
  const subtotalClassA = productionData.classA.total * priceClassA;
  const subtotalClassB = productionData.classB.total * priceClassB;
  const subtotalSpecial = productionData.special * priceSpecial;
  const grossIncome = subtotalClassA + subtotalClassB + subtotalSpecial;

  // Sample detailed material deductions with categories
  const materialDeductions = [
    {
      refNo: "CR-2026-0089",
      dateIssued: "May 25, 2026",
      category: "Fertilizers",
      materialName: "Fertilizer - Urea",
      quantity: 2,
      unit: "sacks",
      unitPrice: 450.00,
      totalCredit: 900.00,
      deductionApplied: 900.00,
      remainingBalance: 0
    },
    {
      refNo: "CR-2026-0102",
      dateIssued: "May 28, 2026",
      category: "Pesticides",
      materialName: "Fungicide Spray",
      quantity: 2,
      unit: "liters",
      unitPrice: 300.00,
      totalCredit: 600.00,
      deductionApplied: 600.00,
      remainingBalance: 0
    },
    {
      refNo: "CR-2026-0098",
      dateIssued: "May 26, 2026",
      category: "Tools",
      materialName: "Pruning Shears",
      quantity: 1,
      unit: "piece",
      unitPrice: 400.00,
      totalCredit: 400.00,
      deductionApplied: 400.00,
      remainingBalance: 0
    },
    {
      refNo: "CR-2026-0095",
      dateIssued: "May 24, 2026",
      category: "Packaging",
      materialName: "Plastic Bags - Large",
      quantity: 2,
      unit: "bundles",
      unitPrice: 150.00,
      totalCredit: 300.00,
      deductionApplied: 300.00,
      remainingBalance: 0
    }
  ];

  const filteredMaterials = materialCategory === "all"
    ? materialDeductions
    : materialDeductions.filter(m => m.category === materialCategory);

  // Total material deductions (all materials, not filtered)
  const totalMaterialDeductions = materialDeductions.reduce((sum, m) => sum + m.deductionApplied, 0);
  const previousUnpaid = 500.00;
  const otherDeductions = 0.00;
  const totalDeductions = totalMaterialDeductions + previousUnpaid + otherDeductions;
  const netIncome = grossIncome - totalDeductions;

  // Validation checks
  const totalBoxesProduction = productionData.classA.total + productionData.classB.total + productionData.special;
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

  const approvalHistory = [
    {
      date: "May 31, 2026 10:45 AM",
      action: "Submitted for Validation",
      by: "Maria Santos (Payroll Personnel)",
      notes: "Payroll slip prepared and submitted for validation"
    },
    {
      date: "May 31, 2026 2:30 PM",
      action: "Validated",
      by: "Jose Reyes (Finance Officer)",
      notes: "All production records and deductions verified. Approved for final review."
    },
    {
      date: "June 1, 2026 9:15 AM",
      action: "Approved",
      by: "Admin Manager",
      notes: "Payroll approved for release"
    }
  ];

  return (
    <Dialog open={!!slip} onOpenChange={onClose}>
      <DialogContent className="!max-w-[1500px] w-[90vw] max-h-[90vh] overflow-y-auto p-0 overflow-x-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b-2 border-emerald-200 shadow-md">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-emerald-700" />
                  <div>
                    <p className="text-xs text-muted-foreground">Payroll Slip</p>
                    <DialogTitle className="text-2xl font-bold text-emerald-700">{slip.slipNo}</DialogTitle>
                    <DialogDescription className="sr-only">
                      Detailed view of payroll slip for {slip.beneficiary} covering period {slip.period}
                    </DialogDescription>
                  </div>
                </div>
                <div className="h-12 w-px bg-slate-300"></div>
                <div className="grid grid-cols-4 gap-6">
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
                    <p className="font-semibold">Maria Santos</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
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

        <div className="px-8 py-6 space-y-6">
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
                  <div className="grid grid-cols-3 gap-x-8 gap-y-4">
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
                  <div className="flex items-center justify-between">
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
                      <div className="grid grid-cols-2 gap-8">
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
                  <div className="flex items-center justify-between">
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
            <CardHeader className="pb-5 pt-5 px-8 bg-gradient-to-r from-emerald-100 to-blue-100 border-b-2 border-emerald-300">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold text-emerald-700">Computation Summary</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Complete breakdown and final payroll computation</p>
                </div>
                <div className="text-sm text-muted-foreground bg-white px-4 py-2 rounded-lg border">
                  <p className="font-semibold">Formula: <span className="text-emerald-700">Net Income = Gross Income − Total Deductions</span></p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 px-8 pb-6">
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
                    <TableCell className="py-4 pl-8">Other Adjustments</TableCell>
                    <TableCell className="text-right py-4 font-semibold text-red-600 whitespace-nowrap">₱{otherDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow className="border-t-2 border-red-300 bg-red-50">
                    <TableCell className="py-4 font-bold">Total Deductions</TableCell>
                    <TableCell className="text-right py-4 font-bold text-red-600 text-lg whitespace-nowrap">₱{totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow className="border-t-4 border-emerald-400 bg-gradient-to-r from-emerald-100 to-emerald-50">
                    <TableCell className="py-6 font-bold text-emerald-700 text-lg">NET INCOME <span className="text-muted-foreground font-normal text-sm ml-2">(Amount to be released)</span></TableCell>
                    <TableCell className="text-right py-6 font-bold text-emerald-700 text-3xl whitespace-nowrap">₱{netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
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

          {/* Approval History Timeline */}
          {slip.approvalStatus === "Approved" && (
            <Card className="border-blue-200 shadow-sm">
              <CardHeader className="pb-4 pt-4 px-8 bg-gradient-to-r from-blue-50 to-white border-b border-blue-200">
                <CardTitle className="text-base font-bold text-blue-700">Approval History Timeline</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 px-8 pb-6">
                <div className="relative">
                  {/* Timeline Line */}
                  <div className="absolute top-10 left-0 right-0 h-1 bg-gradient-to-r from-amber-300 via-violet-300 to-emerald-300"></div>

                  {/* Timeline Steps */}
                  <div className="relative grid grid-cols-3 gap-8">
                    {approvalHistory.map((history, idx) => (
                      <div key={idx} className="relative">
                        {/* Circle Marker */}
                        <div className="flex justify-center mb-4">
                          <div className={`h-20 w-20 rounded-full flex items-center justify-center border-4 shadow-lg z-10 ${
                            idx === 0 ? 'bg-amber-100 border-amber-400' :
                            idx === 1 ? 'bg-violet-100 border-violet-400' :
                            'bg-emerald-100 border-emerald-400'
                          }`}>
                            <span className={`text-3xl font-bold ${
                              idx === 0 ? 'text-amber-700' :
                              idx === 1 ? 'text-violet-700' :
                              'text-emerald-700'
                            }`}>{idx + 1}</span>
                          </div>
                        </div>

                        {/* Content Card */}
                        <div className={`p-4 rounded-lg border-2 shadow-sm ${
                          idx === 0 ? 'bg-amber-50 border-amber-200' :
                          idx === 1 ? 'bg-violet-50 border-violet-200' :
                          'bg-emerald-50 border-emerald-200'
                        }`}>
                          <Badge className={`mb-2 ${
                            idx === 0 ? 'bg-amber-600' :
                            idx === 1 ? 'bg-violet-600' :
                            'bg-emerald-600'
                          }`}>{history.action}</Badge>
                          <p className="text-xs text-muted-foreground font-semibold mb-2">{history.date}</p>
                          <p className="font-bold text-sm mb-2">{history.by}</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">{history.notes}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
                    disabled={!isValid}
                    onClick={() => {
                      onSubmit?.(slip);
                      onClose();
                    }}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Submit for Validation
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


function PayrollRecords() {
  const [viewSlip, setViewSlip] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState("all-status");

  const allRecords = [
    {
      id: 1,
      slipNo: "BP-2026-001",
      period: "May 16-31, 2026",
      beneficiary: "SALUDEZ LISA",
      harvestDate: "May 30, 2026",
      totalBoxes: 88,
      grossIncome: 33000.00,
      totalDeductions: 2700.00,
      netIncome: 30300.00,
      validationStatus: "Validated",
      approvalStatus: "Approved",
      type: "Beneficiary"
    },
    {
      id: 2,
      slipNo: "BP-2026-002",
      period: "May 16-31, 2026",
      beneficiary: "GARCIA MARIA",
      harvestDate: "May 28, 2026",
      totalBoxes: 95,
      grossIncome: 38000.00,
      totalDeductions: 2800.00,
      netIncome: 35200.00,
      validationStatus: "Validated",
      approvalStatus: "Approved",
      type: "Beneficiary"
    },
    {
      id: 3,
      slipNo: "BP-2026-003",
      period: "May 16-31, 2026",
      beneficiary: "REYES JUAN",
      harvestDate: "May 29, 2026",
      totalBoxes: 78,
      grossIncome: 31200.00,
      totalDeductions: 5200.00,
      netIncome: 26000.00,
      validationStatus: "Validated",
      approvalStatus: "Approved",
      type: "Beneficiary"
    },
    {
      id: 4,
      slipNo: "BP-2026-004",
      period: "May 16-31, 2026",
      beneficiary: "SANTOS PEDRO",
      harvestDate: "May 31, 2026",
      totalBoxes: 102,
      grossIncome: 40800.00,
      totalDeductions: 3600.00,
      netIncome: 37200.00,
      validationStatus: "Submitted for Validation",
      approvalStatus: "Pending Approval",
      type: "Beneficiary"
    },
    {
      id: 5,
      slipNo: "BP-2026-005",
      period: "June 1-15, 2026",
      beneficiary: "CRUZ ANNA",
      harvestDate: "June 2, 2026",
      totalBoxes: 68,
      grossIncome: 27200.00,
      totalDeductions: 1800.00,
      netIncome: 25400.00,
      validationStatus: "Draft",
      approvalStatus: "Pending Approval",
      type: "Beneficiary"
    },
    {
      id: 6,
      slipNo: "BP-2026-006",
      period: "June 1-15, 2026",
      beneficiary: "MENDOZA CARLO",
      harvestDate: "June 1, 2026",
      totalBoxes: 84,
      grossIncome: 33600.00,
      totalDeductions: 4100.00,
      netIncome: 29500.00,
      validationStatus: "Draft",
      approvalStatus: "Pending Approval",
      type: "Beneficiary"
    }
  ];

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

    // Approval status filter
    if (statusFilter === "approved" && record.approvalStatus !== "Approved") return false;
    if (statusFilter === "pending" && record.approvalStatus !== "Pending Approval") return false;
    if (statusFilter === "rejected" && record.approvalStatus !== "Rejected") return false;

    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <History className="h-6 w-6 text-emerald-700" />Payroll Records
          </h1>
          <p className="text-muted-foreground text-sm">View all payroll history</p>
        </div>
      </div>
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input placeholder="Search beneficiary payroll records..." className="pl-8 h-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
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

          <div className="flex items-center justify-between pt-2">
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

      {viewSlip && <ViewPayrollSlipDialog slip={viewSlip} onClose={() => setViewSlip(null)} />}
    </div>
  );
}
