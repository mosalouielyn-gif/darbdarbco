type RestockMaterialRow = {
  material_name?: unknown;
  inventory_item_name?: unknown;
};

export function resolveRestockMaterialName(row: RestockMaterialRow): string {
  const savedName = row.material_name;
  if (typeof savedName === "string" && savedName.trim() !== "") {
    return savedName;
  }

  const linkedItemName = row.inventory_item_name;
  if (typeof linkedItemName === "string" && linkedItemName.trim() !== "") {
    return linkedItemName;
  }

  return "";
}
