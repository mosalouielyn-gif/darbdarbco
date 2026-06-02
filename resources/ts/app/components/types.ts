export type Role =
  | "production_clerk"
  | "inventory_bookkeeper"
  | "payroll_personnel"
  | "finance_officer"
  | "manager_admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export const ROLE_LABELS: Record<Role, string> = {
  production_clerk: "Production Clerk",
  inventory_bookkeeper: "Inventory Bookkeeper",
  payroll_personnel: "Payroll Personnel",
  finance_officer: "Finance Officer",
  manager_admin: "Manager / Admin",
};

export const DEMO_ACCOUNTS: Record<string, { password: string; user: User }> = {
  "clerk@darbco.coop": {
    password: "clerk123",
    user: { id: "u-001", name: "Maria Santos", email: "clerk@darbco.coop", role: "production_clerk" },
  },
  "inventory@darbco.coop": {
    password: "inv123",
    user: { id: "u-002", name: "Jose Reyes", email: "inventory@darbco.coop", role: "inventory_bookkeeper" },
  },
  "payroll@darbco.coop": {
    password: "pay123",
    user: { id: "u-003", name: "Ana Dela Cruz", email: "payroll@darbco.coop", role: "payroll_personnel" },
  },
  "finance@darbco.coop": {
    password: "fin123",
    user: { id: "u-004", name: "Pedro Mendoza", email: "finance@darbco.coop", role: "finance_officer" },
  },
  "admin@darbco.coop": {
    password: "admin123",
    user: { id: "u-005", name: "Cecilia Aquino", email: "admin@darbco.coop", role: "manager_admin" },
  },
};

export const BENEFICIARIES = [
  "B-001 — Roberto Cruz",
  "B-002 — Liza Mariano",
  "B-003 — Antonio Villanueva",
  "B-004 — Helena Pascual",
  "B-005 — Ferdinand Lopez",
  "B-006 — Gloria Santos",
  "B-007 — Manuel Tan",
  "B-008 — Beatrice Ong",
];
