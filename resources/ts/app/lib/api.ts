import { User } from "../components/types";

export interface AppData {
  beneficiaries: any[];
  productionRecords: any[];
  dailyBoxes: any[];
  inventoryItems: any[];
  stockTransactions: any[];
  restockRequests: any[];
  payrollSlips: any[];
  auditLogs: any[];
  users: any[];
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
