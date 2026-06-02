## Inventory Bookkeeper — Inventory Items Functionality

The **Inventory Items** page allows the Inventory Bookkeeper to manage, search, filter, add, update, and remove materials stored in the organization’s inventory. This page should display the current stock information for each material in a clear table format.

Each inventory record should include the following details:

| Field         | Description                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Material ID   | Unique code assigned to each inventory material                                                                          |
| Item Name     | Name of the material or supply                                                                                           |
| Category      | Classification of the item, such as fertilizers, chemicals, packaging materials, farm materials, or protective equipment |
| Unit          | Measurement used for the item, such as kilograms, liters, pieces, rolls, or pairs                                        |
| On Hand       | Current available quantity in the inventory                                                                              |
| Reorder Level | Minimum quantity allowed before the item is considered low in stock                                                      |
| Unit Cost     | Cost of one unit of the material                                                                                         |
| Expiry Date   | Expiration date of the material, when applicable                                                                         |
| Status        | Current stock condition of the item                                                                                      |
| Actions       | Buttons for editing or removing an inventory record                                                                      |

---

## Search and Filter Functions

At the top of the **Inventory Items** page, the system should provide a search bar and two dropdown filters.

### Search Bar

The **Search Items** field allows the Inventory Bookkeeper to quickly locate a specific material. As the user types an item name, material ID, or related keyword, the table should automatically display only the matching inventory records.

For example, entering **“Fertilizer”** should display inventory items such as **Urea Fertilizer** and **Complete Fertilizer**.

### Category Filter

When the user clicks the **All Categories** dropdown, the system should display a list of available inventory categories:

* Fertilizers and Soil Inputs
* Chemicals and Crop Protection
* Farm Materials
* Packaging Materials
* Protective Equipment

After selecting a category, the table should show only the items that belong to that category. Selecting **All Categories** should restore the complete inventory list.

### Status Filter

When the user clicks the **All Status** dropdown, the system should display the available stock-status options:

* **OK** — the available quantity is still above the reorder level
* **Low Stock** — the available quantity is equal to or below the reorder level
* **Out of Stock** — the available quantity has reached zero

After selecting a status, the table should display only the inventory records that match the selected condition. Selecting **All Status** should show all items again.

The search bar and filters should also work together. For example, the user may search for **“bags”** while selecting **Packaging Materials** and **Low Stock** to narrow down the results.

---

## Adding Inventory Stock

When the Inventory Bookkeeper clicks the **+ Add Item** button, the system should open the **Add Inventory Item** page.

This page is used to record newly received materials and update the available stock quantity. The user should provide the following transaction details:

| Field           | Description                                                           |
| --------------- | --------------------------------------------------------------------- |
| Supplier Name   | Name of the supplier that delivered the materials                     |
| Receipt Number  | Official receipt, delivery receipt, or reference number               |
| Date Received   | Date when the materials were received                                 |
| Material        | Inventory item being added                                            |
| Quantity Added  | Number of units received                                              |
| Unit Cost       | Cost per unit of the material                                         |
| Expiration Date | Expiration date, if applicable                                        |
| Notes           | Optional remarks regarding the delivery or condition of the materials |

The **Add Item Row** button allows the user to record multiple materials under one receipt. For example, one delivery may include fertilizer, gloves, and packaging materials. Each material should appear in a separate row, but all rows should remain connected to the same supplier, receipt number, and date received.

The red delete icon beside each row should only remove that material row from the form before the transaction is saved.

After the user clicks **Save Item**, the system should:

1. Validate the required fields.
2. Save the stock-in transaction.
3. Add the received quantity to the item’s current **On Hand** balance.
4. Recalculate the stock status automatically.
5. Update the inventory table.
6. Display the saved transaction under **Recent Stock-In Transactions**.

For example, if the current quantity of **Urea Fertilizer** is `40 kg` and the Inventory Bookkeeper records an additional `100 kg`, the updated **On Hand** balance should become `140 kg`.

---

## Recent Stock-In Transactions

The **Recent Stock-In Transactions** panel should display the latest saved inventory additions. This gives the Inventory Bookkeeper a quick view of recently received supplies without leaving the page.

Each transaction should show:

| Field          | Description                                            |
| -------------- | ------------------------------------------------------ |
| Date           | Date when the materials were received                  |
| Receipt Number | Reference number used for the delivery                 |
| Supplier       | Name of the supplier                                   |
| Items          | Number of materials included in the transaction        |
| Total Cost     | Combined cost of all materials included in the receipt |

The **View All Stock-In Records** link should redirect the user to the complete **Stock History** page, where all previous inventory additions can be reviewed.

---

## Edit and Delete Actions

Each row in the **Inventory Items** table should include two action buttons:

### Edit Item

The blue edit icon allows the Inventory Bookkeeper to update the material’s basic information, such as:

* Item name
* Category
* Unit
* Reorder level
* Unit cost
* Expiration date

The **On Hand** quantity should not normally be edited manually from this button. Stock quantities should be updated through recorded stock-in or material-release transactions to maintain an accurate transaction history.

### Delete Item

The red delete icon allows the Inventory Bookkeeper to remove an inventory item record. However, the system should display a confirmation message before deletion, such as:

> Are you sure you want to delete this inventory item? This action cannot be undone.

To prevent missing or inconsistent records, an item should not be permanently deleted if it already has previous stock-in, release, or credit transactions. Instead, the system may mark the item as **Inactive** or hide it from the active inventory list while preserving its transaction history.

---

## Important Clarification for the System Developer

The **Recent Stock-In Transactions** section should only update after the Inventory Bookkeeper successfully saves newly received materials. Editing an item’s name or removing an inventory item from the master list should not create a new stock-in transaction.

For a clearer interface, the button may also be renamed from **+ Add Item** to **+ Record Stock-In** or **+ Add Received Items**, since the form records newly delivered materials and updates existing stock quantities.
