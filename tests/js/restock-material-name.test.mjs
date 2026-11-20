import assert from "node:assert/strict";
import test from "node:test";
import { resolveRestockMaterialName } from "../../resources/ts/app/lib/restock-material-name.ts";

test("uses the linked inventory item name when the request has no material name snapshot", () => {
  assert.equal(
    resolveRestockMaterialName({ inventory_item_name: "Agricultural Insecticide" }),
    "Agricultural Insecticide",
  );
});

test("prefers the saved material name and does not substitute category text", () => {
  assert.equal(
    resolveRestockMaterialName({ material_name: "Saved Item", inventory_item_name: "Current Item" }),
    "Saved Item",
  );
  assert.equal(resolveRestockMaterialName({ material_name: "", inventory_item_name: "" }), "");
});
