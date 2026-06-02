## Prompt: Create a Stock History / Audit Trail UI for the Inventory Bookkeeper

Create a clean, modern, and professional **Stock History / Audit Trail** page for the **Inventory Bookkeeper** module of the **DARBCO Banana Production Management System**.

The purpose of this page is to display a complete and traceable history of all inventory movements. It must serve as a **read-only audit trail**, meaning the Inventory Bookkeeper can review and filter records but should not directly edit or delete transaction history entries from this page.

For now, create the **frontend UI design only**. Do not connect the page to a database yet. Do not include sample material names, quantities, dates, beneficiaries, suppliers, reference numbers, or fake records.

---

# 1. Overall Design Style

Follow the same visual style as the other DARBCO modules.

Use:

* Fixed dark green sidebar
* Light gray page background
* White rounded content card
* Soft gray borders
* Minimal shadows
* Bright green active navigation item
* Clean table layout
* Modern sans-serif typography
* Spacious and organized design
* Desktop-first responsive layout

---

# 2. Sidebar Navigation

Place a fixed vertical sidebar on the left side of the screen.

At the top, display:

**DARBCO**
*Banana Production Management System*

Add a small leaf icon beside the system name.

Include the following Inventory Bookkeeper navigation items:

* Dashboard
* Inventory Items
* Released Materials
* Credit Transactions
* **Stock History** — active and highlighted in bright green
* Restock Requests

At the bottom of the sidebar, add a user profile card containing:

* Circular initials avatar
* Inventory Bookkeeper account name
* Role label: **Inventory Bookkeeper**
* Logout icon

---

# 3. Page Header

At the top of the main content area, display:

**Stock History / Audit Trail**

Add a small history, clock, or audit icon beside the title.

Below the title, show the description:

**Complete read-only audit trail of all inventory transactions.**

Do not add an edit, delete, or add-record button on this page because the audit trail should only display transactions generated from other inventory actions.

---

# 4. Filter Section

Inside a large white rounded content card, place a filter row above the table.

Include:

* Start date picker
* End date picker
* Transaction type dropdown
* Material dropdown or search field

Optional filters:

* Bookkeeper account filter
* Reference number search field
* Category filter

Use clear placeholders:

* **Start Date**
* **End Date**
* **All Transaction Types**
* **All Materials**
* **Search reference number...**

Keep the filters aligned horizontally on desktop screens.

---

# 5. Stock History Table

Create a clean table with the following columns:

| Date & Time | Material | Transaction Type | Qty (+/−) | Reason / Details | Bookkeeper Account | Reference No. |
| ----------- | -------- | ---------------- | --------- | ---------------- | ------------------ | ------------- |

Do not include fake rows or sample data.

When there are no records yet, display:

**No stock history records available yet.**

Below the table, show:

**Showing 0 to 0 of 0 records**

Place disabled pagination controls on the lower-right side.

---

# 6. Transaction Type Badges

Use clear colored badges for each inventory transaction type.

Support the following transaction types:

### Stock In

Used when new materials are added to the warehouse.

Badge style:

* Green or mint background
* Dark green text

### Direct Release

Used when a material is released without being charged as credit.

Badge style:

* Blue background
* Dark blue text

### Credit Issued

Used when a material is released to a beneficiary and the amount should later appear as a payroll deduction.

Badge style:

* Yellow or orange background
* Dark orange text

### Borrowed Material

Used when a material is temporarily issued and expected to be returned.

Badge style:

* Purple or neutral background
* Dark text

### Adjustment

Used when the stock quantity is corrected after checking the actual inventory count or resolving an encoding error.

Badge style:

* Light gray or light blue background
* Dark blue text

### Stock Out — Expired

Used when an expired item is removed from usable inventory.

Badge style:

* Light red background
* Red text

### Returned Material

Used when a previously borrowed or released item is returned to the warehouse.

Badge style:

* Teal or green background
* Dark text

---

# 7. Quantity Display

In the **Qty (+/−)** column:

* Use a **plus sign (+)** for quantities added to inventory
* Use a **minus sign (−)** for quantities removed from inventory

Visual style:

* Positive quantity: green text
* Negative quantity: red text

Example formatting only:

* `+ quantity unit`
* `− quantity unit`

Do not display actual sample numbers in the initial UI.

---

# 8. Reason / Details Column

The **Reason / Details** column should clearly explain why a transaction occurred.

Possible categories of explanations include:

* Received from supplier
* Released directly
* Issued as credit to beneficiary
* Borrowed by beneficiary
* Returned material
* Correction after stock count
* Encoding correction
* Damaged item disposal
* Expired product disposal

Do not populate the table with sample content. These are only possible future transaction descriptions.

---

# 9. Reference Number

Every stock history entry should have a unique reference number generated from the original transaction.

Examples of source records that may generate stock history entries:

* Stock-in receipt
* Release slip
* Credit transaction record
* Adjustment record
* Expired stock disposal record
* Returned material record

The reference number should allow users to trace the original transaction.

---

# 10. Adjustment Record Modal

When a stock adjustment is created from the **Inventory Items** page, use a separate form or modal titled:

**Adjust Stock Quantity**

Include:

* Material Name
* Current Recorded Quantity
* Actual Physical Quantity
* Adjustment Type
* Quantity Difference
* Reason for Adjustment
* Notes
* Date and Time
* Bookkeeper Account
* Optional supporting document or image

Adjustment type options:

* Increase Quantity
* Decrease Quantity

Possible reasons:

* Physical count correction
* Previous encoding error
* Damaged materials
* Missing materials
* Unrecorded stock movement
* Other authorized reason

Add buttons:

* **Save Adjustment**
* **Cancel**

After saving, the adjustment must automatically appear in the **Stock History / Audit Trail** page.

---

# 11. Read-Only Audit Trail Rule

The Stock History / Audit Trail page must be read-only.

Users should not directly edit or delete transaction entries from the audit trail.

If a mistake is found:

1. The user should create a new authorized adjustment record.
2. The original transaction should remain visible.
3. The new adjustment entry should explain the correction.
4. Both records should remain traceable.

This preserves the reliability of the inventory history.

---

# 12. Empty-State Requirement

Do not include:

* Fake transactions
* Sample material names
* Sample suppliers
* Sample beneficiaries
* Sample quantities
* Sample dates
* Sample reference numbers
* Sample bookkeeper names

Keep the table headers, filters, pagination controls, and empty-state message visible.

Use:

**No stock history records available yet.**

---

# Final Instruction

Create only the **Stock History / Audit Trail frontend UI design**.

Maintain a clean and professional layout consistent with the DARBCO Inventory Bookkeeper module.

The page should function as a read-only transaction history interface that can later display all stock-in, release, credit, borrowed, returned, expired, and adjustment records automatically generated by inventory activities.
