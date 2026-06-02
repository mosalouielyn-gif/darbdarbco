Stock History / Audit Trail — Filter Functionality

The Stock History / Audit Trail page should display a complete and traceable record of all inventory movements. This page allows the Inventory Bookkeeper to review when materials were added, released, adjusted, or removed from the inventory.

Each row represents one inventory transaction and should include:

Field	Description
Date & Time	Exact date and time when the transaction was recorded
Material	Name of the inventory item involved
Transaction Type	Type of inventory movement
Quantity (+/-)	Quantity added to or deducted from the stock balance
Reason / Details	Brief explanation of the transaction
Bookkeeper Account	Account that recorded the transaction
Reference No.	Unique transaction reference number

A positive quantity, such as +200 kg, means that the item was added to the inventory. A negative quantity, such as -100 kg, means that the item was deducted from the available stock.

Transaction-Type Filter

The Transaction Type dropdown allows the Inventory Bookkeeper to display only the records that belong to a selected type of inventory movement.

When the user clicks the dropdown, the following options should appear:

Option	Purpose
All Transaction Types	Displays the complete stock history
Stock In	Displays materials received from suppliers or added to the inventory
Cash Purchase	Displays materials released to beneficiaries and paid immediately
Credit Issued	Displays materials released to beneficiaries on credit
Adjustment	Displays corrections made because of counting errors or inventory reconciliation
Stock Out (Expired)	Displays expired materials removed from the inventory

After the user selects an option, the table should automatically refresh and show only the matching records.

Example: Selecting “Credit Issued”

When the user selects Credit Issued, the table should display only materials that were released to beneficiaries on credit.

For example:

Date & Time	Material	Transaction Type	Qty (+/-)	Reason / Details	Bookkeeper Account	Reference No.
May 18, 2025, 10:00 AM	Complete Fertilizer	Credit Issued	-100 kg	Credit to Juan Dela Cruz	Bookkeeper	CR-2025-0007

Other records, such as Stock In, Cash Purchase, Adjustment, and Stock Out (Expired), should temporarily disappear from the table because they do not match the selected filter.

The system should not delete or permanently remove the hidden records. They should simply remain hidden until the user selects All Transaction Types again.

Material Filter

The All Materials dropdown allows the Inventory Bookkeeper to review the transaction history of a specific inventory item.

When the user clicks the dropdown, the system should display the list of available materials, such as:

Urea Fertilizer
Complete Fertilizer
Banana Bags
Cardboard Boxes
Gloves
Twine or Rope
Fungicide

When a material is selected, only transactions involving that item should appear in the table.

For example, selecting Urea Fertilizer should display all stock-in, cash-purchase, credit-release, adjustment, or expired-stock records related to Urea Fertilizer.

Date-Range Filter

The two date fields at the top of the page allow the user to specify the period covered by the displayed records.

The first field should represent the starting date, while the second field should represent the ending date.

For example:

05/01/2025 — 05/20/2025

This means that the table should only display transactions recorded from May 1, 2025 to May 20, 2025.

When either date is changed, the table should automatically refresh based on the selected period.

Combined Filtering

The filters should work together to make the audit trail easier to review.

For example, the Inventory Bookkeeper may select:

Date Range: 05/01/2025 — 05/20/2025
Transaction Type: Credit Issued
Material: Complete Fertilizer

The table should then display only credit transactions involving Complete Fertilizer recorded within the selected date range.

If there are no matching records, the system should display a message such as:

No inventory transactions found for the selected filters.

Important System Behavior

The Stock History / Audit Trail page should be read-only. Its purpose is to preserve an accurate record of inventory movements for monitoring and accountability.

The Inventory Bookkeeper should not be able to directly edit or delete audit-trail records from this page. Any corrections should be recorded as a separate Adjustment transaction. This prevents previous records from being erased and ensures that the complete history remains traceable.

For example, when the recorded quantity is incorrect, the user should create a new adjustment entry with a reason such as:

Correction of counting error.

The original transaction should remain visible in the audit trail together with the adjustment record.

Ready-to-Send Explanation for the UI Designer

The Stock History / Audit Trail page should display the complete record of all inventory movements. At the top of the page, include a date-range selector, a Transaction Type dropdown, and an All Materials dropdown. These controls should dynamically filter the table without requiring the user to open another page.

When the Inventory Bookkeeper selects Credit Issued from the Transaction Type dropdown, the table should only display materials released to beneficiaries on credit. Records categorized as Stock In, Cash Purchase, Adjustment, or Stock Out (Expired) should be temporarily hidden. Selecting All Transaction Types should restore the complete list.

The filters should also work together. For example, the user may select a specific date range, choose Credit Issued, and select Complete Fertilizer to display only credit transactions involving that material during the selected period. The audit-trail records should remain read-only to protect the accuracy and traceability of the inventory history.