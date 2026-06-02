## Prompt: Create the Inventory Bookkeeper Module UI Design

Create a clean, modern, and professional **Inventory Bookkeeper Module** for the **DARBCO Banana Production Management System**.

The Inventory Bookkeeper is responsible for managing and monitoring farming materials and production supplies stored in the organization’s inventory or warehouse. The module should make it easy to check available stocks, identify low-stock and out-of-stock materials, record stock movements, release materials to beneficiaries, and monitor materials issued as credit.

For now, create the **frontend UI design only**. Do not connect the interface to a database yet. Do not add actual inventory records, sample material names, sample beneficiaries, sample suppliers, dates, quantities, or prices. Use empty tables and empty-state messages.

---

# 1. Overall Design Style

Follow the same visual style as the Production Clerk module to maintain consistency throughout the system.

Use:

* A fixed dark green sidebar
* A light gray page background
* White cards and content panels
* Soft gray borders
* Rounded corners
* Minimal shadows
* Bright green active navigation items
* Clean and readable typography
* Simple icons
* Spacious and organized layout
* Desktop-first responsive design

The design must look professional, simple, and easy to use for warehouse and inventory monitoring.

---

# 2. Inventory Bookkeeper Sidebar

Place a fixed vertical sidebar on the left side of the screen.

At the top, display:

**DARBCO**
*Banana Production Management System*

Add a small leaf icon beside the system name.

Include only the modules accessible to the Inventory Bookkeeper:

* **Dashboard**
* **Inventory Items**
* **Released Materials**
* **Credit Transactions**
* **Stock History**
* **Restock Requests**

At the bottom of the sidebar, place a user profile card containing:

* Circular initials avatar
* Bookkeeper account name
* Role label: **Inventory Bookkeeper**
* Logout icon

Do not include Production Clerk, Payroll, Finance Officer, or Admin functions inside this account.

---

# 3. Inventory Bookkeeper Dashboard

Create a dashboard page titled:

**Inventory Bookkeeper Dashboard**

Add a small inventory or warehouse icon beside the title.

Below the title, display summary cards. Since no data is available yet, use a dash or zero value with an empty-state label.

Include the following cards:

### Card 1: Total Inventory Items

Display the total number of registered materials.

### Card 2: Low Stock Items

Display the number of materials that have reached or fallen below their minimum stock level.

### Card 3: Out of Stock Items

Display the number of materials with no available quantity.

### Card 4: Pending Restock Requests

Display the number of restock requests waiting for review or approval.

Below the summary cards, add empty dashboard sections for:

* **Recent Stock Transactions**
* **Stock Status Overview**
* **Materials by Category**
* **Recent Credit Transactions**

Do not display sample charts or fake transactions. Use appropriate empty-state messages such as:

**No inventory data available yet.**

---

# 4. Inventory Items Page

Create a page titled:

**Inventory Items**

This page should allow the Inventory Bookkeeper to view and manage all materials stored in the warehouse.

At the upper-right side, add a green button:

**+ Add New Item**

Below the title, add filtering and search controls:

* Search bar with placeholder: **Search inventory items...**
* Category dropdown: **All Categories**
* Stock status dropdown: **All Status**
* Optional expiration filter: **Expiration Status**

Create an empty table with the following columns:

| Material ID | Material Name | Category | Unit | Current Quantity | Minimum Stock Level | Stock Status | Expiration Date | Actions |
| ----------- | ------------- | -------- | ---- | ---------------- | ------------------- | ------------ | --------------- | ------- |

The **Stock Status** column should support visual labels:

* **Available** — green
* **Low Stock** — orange
* **Out of Stock** — red

The **Actions** column should include small rounded icon buttons:

* **View**
* **Edit**
* **Delete**

When there are no items yet, display:

**No inventory items available yet.**

Below the table, show:

**Showing 0 to 0 of 0 entries**

Keep the pagination controls visible but disabled.

---

# 5. Add New Inventory Item Form

When the Inventory Bookkeeper clicks **+ Add New Item**, open a modal or separate form page titled:

**Add New Inventory Item**

Include the following fields:

### Basic Material Information

* Material ID
* Material Name
* Category dropdown
* Unit of Measurement
* Optional description

### Stock Monitoring Information

* Initial Quantity
* Minimum Stock Level
* Optional expiration date
* Optional batch or lot number

### Supporting Information

* Supplier
* Receipt Number
* Optional uploaded receipt, document, or image
* Notes

Use a green primary button:

**Save Item**

Add a secondary button:

**Cancel**

The category dropdown should contain:

* Fertilizers and Soil Inputs
* Chemicals and Crop Protection Materials
* Farm Materials
* Packaging Materials
* Other Supplies

Only add materials that DARBCO actually uses in the final implementation.

---

# 6. Released Materials Page

Create a page titled:

**Released Materials**

This page should display materials released from the warehouse.

At the upper-right side, add a green button:

**+ Release Material**

Add filtering and search controls:

* Search bar: **Search released materials...**
* Transaction type dropdown: **All Transaction Types**
* Date range filter
* Beneficiary filter

Create an empty table with the following columns:

| Release Slip No. | Date Released | Beneficiary | Material Name | Quantity Released | Unit | Transaction Type | Released By | Actions |
| ---------------- | ------------- | ----------- | ------------- | ----------------- | ---- | ---------------- | ----------- | ------- |

The **Transaction Type** column should support:

* **Direct Release**
* **Borrowed**
* **Issued as Credit**

The **Actions** column should include:

* View
* Edit
* Delete

When there are no release records, display:

**No released material records available yet.**

---

# 7. Release Material Form

When the Inventory Bookkeeper clicks **+ Release Material**, open a modal or separate form titled:

**Release Material**

Include the following fields:

* Release Slip Number
* Date Released
* Beneficiary Name
* Material Name
* Available Quantity
* Quantity to Release
* Unit of Measurement
* Transaction Type dropdown
* Amount Charged, if issued as credit
* Reason or purpose
* Notes
* Optional uploaded release slip document or image

Transaction type options:

* Direct Release
* Borrowed
* Issued as Credit

If **Issued as Credit** is selected, display additional fields:

* Amount Charged
* Deduction Status
* Remaining Balance

The credit transaction must be linked to the selected beneficiary so it can later appear as a payroll deduction.

Add buttons:

* **Save Release Record**
* **Cancel**

---

# 8. Credit Transactions Page

Create a page titled:

**Credit Transactions**

This page should monitor materials issued as credit to beneficiaries.

Add filtering and search controls:

* Search bar: **Search credit transactions...**
* Beneficiary filter
* Payment or deduction status filter
* Date range filter

Create an empty table with the following columns:

| Credit Transaction ID | Date Issued | Beneficiary | Material Name | Quantity | Amount Charged | Deduction Status | Remaining Balance | Actions |
| --------------------- | ----------- | ----------- | ------------- | -------- | -------------- | ---------------- | ----------------- | ------- |

The **Deduction Status** column should support:

* **Pending**
* **Partially Deducted**
* **Fully Deducted**

Use clear status badges:

* Pending — orange
* Partially Deducted — yellow
* Fully Deducted — green

The **Actions** column should include:

* View
* Edit
* Delete

When there are no credit transactions, display:

**No credit transactions available yet.**

---

# 9. Stock History Page

Create a page titled:

**Stock History**

This page should display a traceable history of all inventory movements.

Add filtering and search controls:

* Search bar: **Search stock history...**
* Transaction type filter
* Material category filter
* Date range filter
* Bookkeeper account filter

Create an empty table with the following columns:

| Transaction Date and Time | Material ID | Material Name | Transaction Type | Quantity Added | Quantity Deducted | Remaining Quantity | Reason | Bookkeeper Account | Actions |
| ------------------------- | ----------- | ------------- | ---------------- | -------------- | ----------------- | ------------------ | ------ | ------------------ | ------- |

The **Transaction Type** column should support:

* Stock-In
* Stock-Out
* Direct Release
* Borrowed
* Issued as Credit
* Adjustment
* Returned Material

Use distinct status badges for each transaction type.

When there are no stock history records, display:

**No stock history records available yet.**

---

# 10. Stock-In Form

Add a **+ Stock-In Material** button on the Inventory Items page or Stock History page.

When clicked, open a modal or separate form titled:

**Stock-In Material**

Include:

* Material Name
* Date and Time
* Quantity Added
* Unit of Measurement
* Supplier
* Receipt Number
* Batch or Lot Number
* Expiration Date, when applicable
* Reason or notes
* Optional uploaded receipt, document, or image

Add buttons:

* **Save Stock-In Record**
* **Cancel**

---

# 11. Restock Requests Page

Create a page titled:

**Restock Requests**

This page should allow the Inventory Bookkeeper to prepare restock requests for materials that are low in stock or already out of stock.

At the upper-right side, add a green button:

**+ Create Restock Request**

Add search and filter controls:

* Search bar: **Search restock requests...**
* Request status filter
* Category filter
* Date range filter

Create an empty table with the following columns:

| Request ID | Date Requested | Material Name | Category | Current Quantity | Requested Quantity | Reason | Requested By | Status | Actions |
| ---------- | -------------- | ------------- | -------- | ---------------- | ------------------ | ------ | ------------ | ------ | ------- |

The **Requested By** field should automatically reflect the Inventory Bookkeeper account.

The **Status** column should support:

* Pending
* Approved
* Rejected
* Completed

The Bookkeeper can prepare and submit a request, but the **Manager/Admin** is responsible for approving or rejecting it.

When there are no restock requests, display:

**No restock requests available yet.**

---

# 12. Restock Request Form

When the user clicks **+ Create Restock Request**, open a modal or separate form titled:

**Create Restock Request**

Include:

* Material Name
* Category
* Current Quantity
* Minimum Stock Level
* Requested Quantity
* Reason for Restock
* Priority Level
* Date Requested
* Notes
* Optional supporting document or image

Priority options:

* Normal
* Urgent

Add buttons:

* **Submit Restock Request**
* **Cancel**

---

# 13. View Details Modal

For every table, clicking the **View** icon should open a clean details modal.

The modal should display the complete details of the selected item or transaction in a structured and readable layout.

Use labeled sections such as:

* Basic Information
* Stock Details
* Transaction Details
* Beneficiary Details
* Credit Details
* Supporting Records
* Activity History

Add a close button in the upper-right corner.

---

# 14. Empty-State Requirement

Do not include any fake records, sample names, quantities, dates, transaction IDs, or prices.

All tables must start empty.

Use empty-state messages such as:

* **No inventory items available yet.**
* **No released material records available yet.**
* **No credit transactions available yet.**
* **No stock history records available yet.**
* **No restock requests available yet.**

The tables, filters, search bars, pagination controls, and buttons should remain visible to show the intended layout.

---

# 15. Important Functional Rules for Future Integration

Design the UI so that it will later support the following system behavior:

1. When a material is stocked in, the available quantity should increase.
2. When a material is released, borrowed, or issued as credit, the available quantity should decrease.
3. The system should flag an item as **Low Stock** when its available quantity reaches the minimum stock level.
4. The system should flag an item as **Out of Stock** when its available quantity reaches zero.
5. Materials issued as credit must be linked to the correct beneficiary account.
6. Credit amounts must be available for future payroll deduction processing.
7. Every stock movement must appear in the Stock History page.
8. Applicable materials should support expiration-date monitoring.
9. Supporting documents, such as receipts and release slips, should be optionally uploadable.
10. Restock requests submitted by the Inventory Bookkeeper should be forwarded to the Manager/Admin for approval.

---

# Final Instruction

Create only the **Inventory Bookkeeper frontend UI design** first. Do not connect it to a database. Do not add backend logic. Do not use fake records.

Keep the design consistent with the DARBCO Production Clerk interface: dark green sidebar, bright green active items, white rounded panels, organized tables, clear icons, search bars, filters, action buttons, empty states, and pagination controls.
