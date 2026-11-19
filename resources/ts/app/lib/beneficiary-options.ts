export interface BeneficiaryOption {
  id: string;
  dbId: number;
  code: string;
  name: string;
}

export function buildActiveBeneficiaryOptions(rows: Array<Record<string, unknown>>): BeneficiaryOption[] {
  const activeRows = rows
    .filter((row) => isActive(row.active))
    .map((row) => ({
      id: String(row.id ?? ""),
      dbId: Number(row.id),
      code: String(row.code ?? row.beneficiary_code ?? row.id ?? ""),
      name: String(row.name ?? row.full_name ?? "").trim(),
    }))
    .filter((row) => Number.isInteger(row.dbId) && row.dbId > 0 && row.name.length > 0 && row.code.length > 0)
    .sort((a, b) => a.dbId - b.dbId);

  const optionsByIdentity = new Map<string, BeneficiaryOption>();
  const seenDatabaseIds = new Set<number>();

  for (const row of activeRows) {
    if (seenDatabaseIds.has(row.dbId)) {
      continue;
    }

    seenDatabaseIds.add(row.dbId);
    const identity = beneficiaryIdentityKey(row.name);
    if (identity && !optionsByIdentity.has(identity)) {
      optionsByIdentity.set(identity, row);
    }
  }

  return Array.from(optionsByIdentity.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function isActive(active: unknown): boolean {
  return active === true || active === 1 || (typeof active === "string" && ["1", "true"].includes(active.toLowerCase()));
}

function beneficiaryIdentityKey(name: string): string {
  const normalizedName = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s*,\s*/, ",")
    .replace(/\s+/g, " ")
    .trim();
  const commaIndex = normalizedName.indexOf(",");
  const canonicalName = commaIndex >= 0
    ? `${normalizedName.slice(commaIndex + 1)} ${normalizedName.slice(0, commaIndex)}`
    : normalizedName;

  return canonicalName.replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}
