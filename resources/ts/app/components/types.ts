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


