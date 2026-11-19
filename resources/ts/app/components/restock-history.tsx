import { useMemo, useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Eye, History, Search } from "lucide-react";

export type RestockHistoryStatus = "Completed" | "Returned";

export interface RestockHistoryRecord {
  id: string;
  materialName: string;
  category: string;
  requestedQuantity: number;
  actualQuantityReceived?: number | null;
  requestedBy: string;
  approvedOrReturnedBy: string;
  dateRequested: string;
  dateFinalized: string;
  finalStatus: RestockHistoryStatus;
  reason: string;
  notes: string;
  approvalOrReturnReason: string;
  deliveryReference: string;
  deliveryNotes: string;
}

export function RestockHistory({ records }: { records: RestockHistoryRecord[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewing, setViewing] = useState<RestockHistoryRecord | null>(null);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredRecords = useMemo(() => records.filter((record) => {
    const matchesStatus = statusFilter === "all" || record.finalStatus.toLowerCase() === statusFilter;
    const matchesSearch = !normalizedSearch || [
      record.id,
      record.materialName,
      record.category,
      record.requestedBy,
      record.approvedOrReturnedBy,
    ].some((value) => value.toLowerCase().includes(normalizedSearch));

    return matchesStatus && matchesSearch;
  }), [normalizedSearch, records, statusFilter]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2"><History className="h-6 w-6 text-emerald-700" />Restock History</h1>
        <p className="text-muted-foreground">Read-only records of completed and returned restock requests.</p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <div className="relative min-w-0 flex-1 sm:min-w-[220px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input aria-label="Search restock history" placeholder="Search by request, item, or person..." className="h-9 pl-8" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Final Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table className="min-w-[1120px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Request ID</TableHead>
                  <TableHead>Material Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Requested Qty</TableHead>
                  <TableHead className="text-right">Actual Qty Received</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Approved/Returned By</TableHead>
                  <TableHead>Date Requested</TableHead>
                  <TableHead>Date Completed/Returned</TableHead>
                  <TableHead>Final Status</TableHead>
                  <TableHead className="w-20 text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">No restock history records match the selected filters.</TableCell>
                  </TableRow>
                ) : filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.id}</TableCell>
                    <TableCell>{record.materialName}</TableCell>
                    <TableCell>{record.category}</TableCell>
                    <TableCell className="text-right">{record.requestedQuantity.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{record.finalStatus === "Completed" ? displayQuantity(record.actualQuantityReceived) : "N/A"}</TableCell>
                    <TableCell>{record.requestedBy}</TableCell>
                    <TableCell>{record.approvedOrReturnedBy}</TableCell>
                    <TableCell>{record.dateRequested}</TableCell>
                    <TableCell>{record.dateFinalized}</TableCell>
                    <TableCell><RestockHistoryBadge status={record.finalStatus} /></TableCell>
                    <TableCell className="text-center">
                      <Button type="button" variant="outline" size="icon" className="h-8 w-8" title="View request details" aria-label={`View ${record.id}`} onClick={() => setViewing(record)}>
                        <Eye className="h-4 w-4 text-emerald-700" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="text-sm text-muted-foreground">Showing {filteredRecords.length} of {records.length} history records</div>
        </CardContent>
      </Card>

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:!max-w-[720px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-800"><History className="h-5 w-5" />Restock History Details</DialogTitle>
            <DialogDescription>Read-only details for {viewing?.id ?? "this request"}.</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
              <section className="rounded-md border border-emerald-200 bg-emerald-50/70 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-emerald-700">Request ID</div>
                    <div className="text-lg font-semibold">{viewing.id}</div>
                  </div>
                  <RestockHistoryBadge status={viewing.finalStatus} />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <HistoryField label="Material Name" value={viewing.materialName} />
                  <HistoryField label="Category" value={viewing.category} />
                  <HistoryField label="Requested Quantity" value={String(viewing.requestedQuantity)} />
                  <HistoryField label="Actual Quantity Received" value={viewing.finalStatus === "Completed" ? displayQuantity(viewing.actualQuantityReceived) : "N/A"} />
                  <HistoryField label="Requested By" value={viewing.requestedBy} />
                  <HistoryField label="Approved/Returned By" value={viewing.approvedOrReturnedBy} />
                  <HistoryField label="Date Requested" value={viewing.dateRequested} />
                  <HistoryField label="Date Completed/Returned" value={viewing.dateFinalized} />
                </div>
              </section>

              <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <HistoryField label="Reason for Restock" value={viewing.reason} multiline />
                <HistoryField label="Additional Notes" value={viewing.notes} multiline />
                <HistoryField label="Approval or Return Reason" value={viewing.approvalOrReturnReason} multiline />
                <HistoryField label="Delivery Reference" value={viewing.deliveryReference} />
                <HistoryField label="Delivery Notes" value={viewing.deliveryNotes} multiline />
              </section>
            </div>
          )}
          <DialogFooter><Button type="button" variant="outline" onClick={() => setViewing(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RestockHistoryBadge({ status }: { status: RestockHistoryStatus }) {
  return <Badge className={status === "Completed" ? "bg-sky-100 text-sky-800" : "bg-red-100 text-red-800"}>{status}</Badge>;
}

function HistoryField({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="min-w-0 rounded-md border bg-slate-50 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={multiline ? "whitespace-pre-wrap break-words text-sm text-slate-800" : "break-words text-sm font-medium text-slate-900"}>{value || "N/A"}</div>
    </div>
  );
}

function displayQuantity(quantity?: number | null) {
  return quantity === undefined || quantity === null || !Number.isFinite(quantity) ? "N/A" : quantity.toLocaleString();
}
