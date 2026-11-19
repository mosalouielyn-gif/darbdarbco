import assert from "node:assert/strict";
import test from "node:test";
import { buildActiveBeneficiaryOptions } from "../../resources/ts/app/lib/beneficiary-options.ts";

test("uses active master beneficiaries, preserves their ids and codes, and suppresses name-order duplicates", () => {
  const options = buildActiveBeneficiaryOptions([
    { id: 4, code: "BEN-261119012623", name: "Mendoza, Rowena C.", active: 1 },
    { id: 2, code: "BEN-002", name: "Junrey P. Salazar", active: 1 },
    { id: 3, code: "BEN-003", name: "Rowena C. Mendoza", active: 1 },
    { id: 1, code: "BEN-001", name: "Maricel D. Villanueva", active: true },
    { id: 5, code: "BEN-005", name: "Inactive Beneficiary", active: 0 },
    { id: 1, code: "BEN-001", name: "Maricel D. Villanueva", active: 1 },
  ]);

  assert.deepEqual(options.map(({ dbId, code, name }) => ({ dbId, code, name })), [
    { dbId: 2, code: "BEN-002", name: "Junrey P. Salazar" },
    { dbId: 1, code: "BEN-001", name: "Maricel D. Villanueva" },
    { dbId: 3, code: "BEN-003", name: "Rowena C. Mendoza" },
  ]);
  assert.deepEqual(options.map(({ id }) => id), ["2", "1", "3"]);
});
