export const INVENTORY_UNITS = [
  { value: "kg", label: "kg" },
  { value: "liter", label: "liter" },
  { value: "pcs", label: "pcs" },
  { value: "pairs", label: "pairs" },
  { value: "roll", label: "roll" },
  { value: "bag", label: "bag" },
] as const;

const INVENTORY_UNIT_ALIASES: Record<string, string> = {
  l: "liter",
  liters: "liter",
  pair: "pairs",
  rolls: "roll",
  bags: "bag",
};

export function normalizeInventoryUnit(unit: unknown): string {
  const normalized = String(unit ?? "").trim().toLowerCase();
  return INVENTORY_UNIT_ALIASES[normalized] ?? normalized;
}
