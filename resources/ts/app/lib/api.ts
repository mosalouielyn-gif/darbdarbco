import { User } from "../components/types";

export interface AppData {
  beneficiaries: any[];
  harvestRecords: any[];
  productionRecords: any[];
  dailyBoxes: any[];
  inventoryItems: any[];
  stockTransactions: any[];
  borrowedMaterials: any[];
  creditTransactions: any[];
  restockRequests: any[];
  payrollSlips: any[];
  auditLogs: any[];
  users: any[];
  harvesters: any[];
  rolePermissions: any[];
}

export interface MaintenanceTable {
  name: string;
  label: string;
  records: number;
  deletable_records: number;
  protected: boolean;
  confirmation: string;
  note: string;
}

export interface HarvestRecordInput {
  harvest_date: string;
  beneficiary_name: string;
  harvester_name: string;
  buligs_11_weeks: number;
  buligs_12_weeks: number;
  buligs_13_weeks: number;
  buligs_14_weeks: number;
  user_id?: number;
  user_name?: string;
  edit_reason?: string;
}

export interface ProductionBoxRecordInput {
  production_date: string;
  beneficiary_name: string;
  class_a_big_hands: number;
  class_a_small_hands: number;
  class_a_cps: number;
  class_b_big_hands: number;
  class_b_small_hands: number;
  class_b_cps: number;
  special_product: number;
  defects_11_weeks: number;
  defects_12_weeks: number;
  defects_13_weeks: number;
  defects_14_weeks: number;
  rejects_11_weeks: number;
  rejects_12_weeks: number;
  rejects_13_weeks: number;
  rejects_14_weeks: number;
  user_id?: number;
  user_name?: string;
  edit_reason?: string;
}

export interface UserAccountInput {
  name: string;
  email: string;
  username: string;
  role: string;
  active: boolean;
  contact?: string;
  remarks?: string;
  password?: string;
  admin_id?: number;
  admin_name?: string;
}

export interface BeneficiaryInput {
  code?: string;
  name: string;
  contact_number?: string;
  address?: string;
  active: boolean;
  admin_id?: number;
  admin_name?: string;
  remarks?: string;
}

export interface InventoryItemInput {
  item_code: string;
  name: string;
  category: string;
  unit: string;
  on_hand: number;
  minimum_stock?: number;
  unit_cost: number;
  stock_date: string;
  expiry_date?: string | null;
  supplier?: string;
  notes?: string;
  user_id?: number;
  user_name?: string;
  edit_reason?: string;
}

const jsonHeaders = {
  "Accept": "application/json",
  "Content-Type": "application/json",
};

export async function login(email: string, password: string): Promise<User> {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ email, password }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.message || payload?.errors?.email?.[0] || "Invalid credentials.";
    throw new Error(message);
  }

  return payload.user;
}

export async function verifyAdminPassword(userId: string | number, email: string, password: string): Promise<void> {
  const response = await fetch("/api/admin/verify-password", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ user_id: Number(userId), email, password }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.message || payload?.errors?.password?.[0] || "Admin password verification failed.";
    throw new Error(message);
  }
}

export async function fetchAppData(role?: string): Promise<AppData> {
  const query = new URLSearchParams();
  if (role) query.set("role", role);
  query.set("_", String(Date.now()));
  const url = `/api/app-data?${query.toString()}`;
  const response = await fetch(url, {
    headers: { "Accept": "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load database records.");
  }

  return response.json();
}

export async function fetchMaintenanceTables(): Promise<{ tables: MaintenanceTable[]; protected_users: number[] }> {
  const response = await fetch(`/api/database-maintenance/tables?_=${Date.now()}`, {
    headers: { "Accept": "application/json" },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({ tables: [], protected_users: [] }));
  if (!response.ok) {
    throw new Error(payload?.message || "Unable to load database tables.");
  }
  return payload;
}

export async function deleteMaintenanceTable(
  table: string,
  payload: { confirmation: string; user_id?: number; user_name?: string },
): Promise<{ table: string; deleted: number; remaining: number }> {
  const response = await fetch(`/api/database-maintenance/tables/${encodeURIComponent(table)}`, {
    method: "DELETE",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || "Unable to delete table records.");
  }
  return data;
}

export async function deleteAllMaintenanceTables(
  payload: { confirmation: string; user_id?: number; user_name?: string },
): Promise<{ deleted: number; tables: MaintenanceTable[] }> {
  const response = await fetch("/api/database-maintenance/tables", {
    method: "DELETE",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || "Unable to delete all database records.");
  }
  return data;
}

export async function fetchHarvestRecords(): Promise<any[]> {
  const response = await fetch("/api/harvest-records", {
    headers: { "Accept": "application/json" },
  });

  if (!response.ok) {
    throw new Error("Unable to load harvest records.");
  }

  return response.json();
}

export async function createHarvestRecord(record: HarvestRecordInput): Promise<any> {
  const response = await fetch("/api/harvest-records", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(record),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || "Unable to save harvest record.");
  }

  return payload;
}

export async function updateHarvestRecord(id: number, record: HarvestRecordInput): Promise<any> {
  const response = await fetch(`/api/harvest-records/${id}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(record),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || "Unable to update harvest record.");
  }

  return payload;
}

export async function deleteHarvestRecord(id: number, user: { user_id?: number; user_name?: string }): Promise<void> {
  const response = await fetch(`/api/harvest-records/${id}`, {
    method: "DELETE",
    headers: jsonHeaders,
    body: JSON.stringify(user),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.message || "Unable to delete harvest record.");
  }
}

export async function fetchProductionBoxRecords(): Promise<any[]> {
  const response = await fetch("/api/production-box-records", {
    headers: { "Accept": "application/json" },
  });

  if (!response.ok) {
    throw new Error("Unable to load production box records.");
  }

  return response.json();
}

export async function createProductionBoxRecord(record: ProductionBoxRecordInput): Promise<any> {
  const response = await fetch("/api/production-box-records", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(record),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || "Unable to save production box record.");
  }

  return payload;
}

export async function updateProductionBoxRecord(id: number, record: ProductionBoxRecordInput): Promise<any> {
  const response = await fetch(`/api/production-box-records/${id}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(record),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || "Unable to update production box record.");
  }

  return payload;
}

export async function deleteProductionBoxRecord(id: number, user: { user_id?: number; user_name?: string }): Promise<void> {
  const response = await fetch(`/api/production-box-records/${id}`, {
    method: "DELETE",
    headers: jsonHeaders,
    body: JSON.stringify(user),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.message || "Unable to delete production box record.");
  }
}

export async function createUserAccount(account: UserAccountInput): Promise<any> {
  const response = await fetch("/api/users", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(account),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || "Unable to create user account.");
  }

  return payload;
}

export async function updateUserAccount(id: string | number, account: UserAccountInput): Promise<any> {
  const response = await fetch(`/api/users/${id}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(account),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || "Unable to update user account.");
  }

  return payload;
}

export async function updateUserAccountStatus(
  id: string | number,
  payload: { active: boolean; admin_id?: number; admin_name?: string; remarks?: string },
): Promise<any> {
  const response = await fetch(`/api/users/${id}/status`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || "Unable to update user account status.");
  }

  return data;
}

export async function createBeneficiary(beneficiary: BeneficiaryInput): Promise<any> {
  const response = await fetch("/api/beneficiaries", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(beneficiary),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || "Unable to create beneficiary.");
  }

  return payload;
}

export async function updateBeneficiary(id: string | number, beneficiary: BeneficiaryInput): Promise<any> {
  const response = await fetch(`/api/beneficiaries/${id}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(beneficiary),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || "Unable to update beneficiary.");
  }

  return payload;
}

export async function updateBeneficiaryStatus(
  id: string | number,
  payload: { active: boolean; admin_id?: number; admin_name?: string; remarks?: string },
): Promise<any> {
  const response = await fetch(`/api/beneficiaries/${id}/status`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || "Unable to update beneficiary status.");
  }

  return data;
}

export async function createInventoryItem(item: InventoryItemInput): Promise<any> {
  const response = await fetch("/api/inventory-items", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(item),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || "Unable to save inventory item.");
  }

  return payload;
}

export async function updateInventoryItem(id: string | number, item: InventoryItemInput): Promise<any> {
  const response = await fetch(`/api/inventory-items/${id}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(item),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || "Unable to update inventory item.");
  }

  return payload;
}

export async function updateInventoryItemStatus(
  id: string | number,
  payload: { active: boolean; user_id?: number; user_name?: string; remarks?: string },
): Promise<any> {
  const response = await fetch(`/api/inventory-items/${id}/status`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || "Unable to update inventory item status.");
  }

  return data;
}

export async function stockInInventoryItem(
  id: string | number,
  payload: {
    quantity: number;
    unit_cost: number;
    supplier: string;
    reference_no: string;
    stock_date: string;
    expiry_date?: string | null;
    notes?: string;
    document_name?: string;
    user_id?: number;
    user_name?: string;
  },
): Promise<any> {
  const response = await fetch(`/api/inventory-items/${id}/stock-in`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || "Unable to save stock-in transaction.");
  }

  return data;
}

export async function releaseInventoryItem(
  id: string | number,
  payload: {
    quantity: number;
    unit_cost: number;
    reference_no: string;
    stock_date: string;
    release_type: string;
    beneficiary_id?: number;
    beneficiary_account_id?: string;
    beneficiary?: string;
    purpose?: string;
    payment_method?: string;
    notes?: string;
    expected_return_date?: string;
    user_id?: number;
    user_name?: string;
  },
): Promise<any> {
  const response = await fetch(`/api/inventory-items/${id}/release`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || "Unable to save material release.");
  }

  return data;
}

export async function adjustInventoryItem(
  id: string | number,
  payload: {
    corrected_quantity: number;
    reference_no: string;
    stock_date: string;
    reason: string;
    user_id?: number;
    user_name?: string;
  },
): Promise<any> {
  const response = await fetch(`/api/inventory-items/${id}/adjust`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || "Unable to save stock adjustment.");
  }

  return data;
}

export async function returnBorrowedMaterial(
  id: string | number,
  payload: {
    quantity: number;
    return_date: string;
    user_id?: number;
    user_name?: string;
  },
): Promise<any> {
  const response = await fetch(`/api/borrowed-materials/${id}/return`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || "Unable to save borrowed material return.");
  }

  return data;
}

export async function deductCreditTransaction(
  id: string | number,
  payload: {
    amount: number;
    payroll_batch: string;
    deduction_date?: string;
    user_id?: number;
    user_name?: string;
  },
): Promise<any> {
  const response = await fetch(`/api/credit-transactions/${id}/deduct`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || "Unable to save credit deduction.");
  }

  return data;
}

export interface PayrollSlipInput {
  slip_no?: string;
  beneficiary_id: number;
  production_record_id?: number;
  payroll_period: string;
  harvest_date?: string | null;
  class_a_boxes?: number;
  class_b_boxes?: number;
  special_boxes?: number;
  class_a_price?: number;
  class_b_price?: number;
  special_price?: number;
  material_deduction?: number;
  previous_balance?: number;
  labor_cost?: number;
  other_deductions?: number;
  gross_amount: number;
  credit_deduction?: number;
  total_deductions: number;
  net_amount: number;
  validation_status: string;
  approval_status?: string;
  user_id?: number;
  user_name?: string;
}

export async function createPayrollSlip(payload: PayrollSlipInput): Promise<any> {
  const response = await fetch("/api/payroll-slips", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Unable to save payroll slip.");
  return data;
}

export async function updatePayrollSlip(id: string | number, payload: PayrollSlipInput): Promise<any> {
  const response = await fetch(`/api/payroll-slips/${id}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Unable to update payroll slip.");
  return data;
}

export async function submitPayrollSlip(id: string | number, payload: { user_id?: number; user_name?: string }): Promise<any> {
  const response = await fetch(`/api/payroll-slips/${id}/submit`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Unable to submit payroll slip.");
  return data;
}

export async function deletePayrollSlip(id: string | number, payload: { user_id?: number; user_name?: string }): Promise<any> {
  const response = await fetch(`/api/payroll-slips/${id}`, {
    method: "DELETE",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Unable to delete payroll slip.");
  return data;
}

export async function validatePayrollSlip(id: string | number, payload: { user_id?: number; user_name?: string; remarks?: string }): Promise<any> {
  const response = await fetch(`/api/payroll-slips/${id}/validate`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Unable to validate payroll slip.");
  return data;
}

export async function returnPayrollSlipForCorrection(
  id: string | number,
  payload: { category: string; reason: string; remarks?: string; user_id?: number; user_name?: string },
): Promise<any> {
  const response = await fetch(`/api/payroll-slips/${id}/return`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Unable to return payroll slip.");
  return data;
}

export async function approvePayrollSlipByManager(
  id: string | number,
  payload: { user_id?: number; user_name?: string; remarks?: string },
): Promise<any> {
  const response = await fetch(`/api/payroll-slips/${id}/manager-approve`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Unable to approve payroll slip.");
  return data;
}

export async function returnPayrollSlipByManager(
  id: string | number,
  payload: { reason: string; remarks?: string; user_id?: number; user_name?: string },
): Promise<any> {
  const response = await fetch(`/api/payroll-slips/${id}/manager-return`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Unable to return payroll slip.");
  return data;
}

export async function updateRolePermissions(payload: {
  role: string;
  permissions: { permission: string; allowed: boolean }[];
  user_id?: number;
  user_name?: string;
}): Promise<any[]> {
  const response = await fetch("/api/role-permissions", {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => []);
  if (!response.ok) throw new Error((data as any)?.message || "Unable to save role permissions.");
  return data;
}

export interface RestockRequestInput {
  item_id?: number;
  material_name?: string;
  category?: string;
  current_quantity?: number;
  minimum_stock?: number;
  requested_quantity: number;
  priority?: string;
  reason: string;
  notes?: string;
  user_id?: number;
  user_name?: string;
}

export async function createRestockRequest(payload: RestockRequestInput): Promise<any> {
  const response = await fetch("/api/restock-requests", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Unable to create restock request.");
  return data;
}

export async function updateRestockRequest(id: string | number, payload: RestockRequestInput): Promise<any> {
  const response = await fetch(`/api/restock-requests/${id}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Unable to update restock request.");
  return data;
}

export async function cancelRestockRequest(id: string | number, payload: { user_id?: number; user_name?: string }): Promise<any> {
  const response = await fetch(`/api/restock-requests/${id}/cancel`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Unable to cancel restock request.");
  return data;
}

export async function approveRestockRequest(id: string | number, payload: { user_id?: number; user_name?: string; review_notes?: string }): Promise<any> {
  const response = await fetch(`/api/restock-requests/${id}/approve`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Unable to approve restock request.");
  return data;
}

export async function returnRestockRequest(id: string | number, payload: { reason: string; user_id?: number; user_name?: string }): Promise<any> {
  const response = await fetch(`/api/restock-requests/${id}/return`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Unable to return restock request.");
  return data;
}
