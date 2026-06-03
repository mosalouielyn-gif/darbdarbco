import { User } from "../components/types";

export interface AppData {
  beneficiaries: any[];
  harvestRecords: any[];
  productionRecords: any[];
  dailyBoxes: any[];
  inventoryItems: any[];
  stockTransactions: any[];
  restockRequests: any[];
  payrollSlips: any[];
  auditLogs: any[];
  users: any[];
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

export async function fetchAppData(): Promise<AppData> {
  const response = await fetch("/api/app-data", {
    headers: { "Accept": "application/json" },
  });

  if (!response.ok) {
    throw new Error("Unable to load database records.");
  }

  return response.json();
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
