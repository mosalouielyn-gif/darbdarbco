Create the Beneficiary Payroll module for the Payroll Personnel account of the DARBCO Banana Production Management System.

The purpose of this module is to prepare beneficiary payroll slips based on the verified production records encoded by the Production Clerk.

The beneficiary payroll must automatically calculate the earnings of each beneficiary based on the number and classification of banana boxes produced from their harvest.

The system must calculate each product classification separately because Class A, Class B, and Special Product boxes may have different prices.

The Payroll Personnel should not manually re-enter production quantities that already exist in the system.

The production data must automatically come from the Production Clerk’s saved and verified records.

The payroll slip must also include applicable deductions, such as materials purchased or received on credit from the organization. These may include farming supplies, fertilizers, chemicals, medicines, or other materials released by the Inventory Bookkeeper.

The Payroll Personnel should not manually rewrite the material-credit transactions.

The credited materials must automatically come from the Inventory Bookkeeper’s saved credit records.

Keep the existing DARBCO design style. Use the current dark green sidebar, white content area, rounded cards, and professional table layout.

Do not redesign the entire system.

Focus only on creating and improving the Beneficiary Payroll module for the Payroll Personnel account.

==================================================
BENEFICIARY PAYROLL RECORDS PAGE
==================================================

Create a page titled:

Beneficiary Payroll

Add a button at the upper-right corner:

+ Prepare Beneficiary Payroll

Below the title, add:

Search bar
Payroll-period filter
Validation-status filter
Approval-status filter
Date-range filter

Display a payroll-records table with the following columns:

Payroll Slip Number
Payroll Period
Beneficiary Name
Harvest Date
Total Boxes
Gross Income
Total Deductions
Net Income
Validation Status
Approval Status
Actions

Under Actions, add:

View
Edit
Delete
Submit for Validation

Only Draft payroll slips should be editable or deletable.

Submitted, validated, or approved payroll slips must remain recorded in the system for tracking purposes.

If there are no payroll records, display:

No beneficiary payroll records available yet.

Do not add fake names, sample records, random prices, or placeholder amounts.

==================================================
PREPARE BENEFICIARY PAYROLL FORM
==================================================

When the Payroll Personnel clicks + Prepare Beneficiary Payroll, open a large landscape-style form or modal titled:

Prepare Beneficiary Payroll

Do not use a narrow portrait-style modal.

The form should occupy approximately 90% of the browser width and 90% of the browser height.

Use only one vertical scrollbar for the entire form.

Avoid unnecessary horizontal scrolling and multiple nested scrollbars.

Arrange the sections vertically so all information can be viewed clearly.

==================================================
SECTION 1: BENEFICIARY INFORMATION
==================================================

Display:

Beneficiary Name
Beneficiary ID
Payroll Period
Harvest Date
Production Record Reference Number
Date Created
Prepared By

The Payroll Personnel should only select the beneficiary and payroll period.

The Beneficiary ID, harvest date, and related production information must automatically appear after selecting the beneficiary.

==================================================
SECTION 2: PRODUCTION BASIS
==================================================

Add a read-only section titled:

Production Records from Production Clerk

Display a table with:

Production Record Reference Number
Harvest Date
Class A Boxes
Class B Boxes
Special Product Boxes
Total Boxes

The system should automatically retrieve these values from the Production Clerk’s verified production records.

The Payroll Personnel must not manually type or edit the production quantities.

If the production data is incorrect, it must be corrected by the Production Clerk.

Add an expandable box-classification breakdown.

For Class A, show:

Big Hands
Small Hands
CPs

For Class B, show:

Big Hands
Small Hands
CPs

==================================================
SECTION 3: PRODUCTION EARNINGS
==================================================

Add a section titled:

Production Earnings

Display a table with:

Product Classification
Total Boxes
Price per Box
Subtotal

Include rows for:

Class A
Class B
Special Product

The total number of boxes must automatically come from the Production Clerk’s records.

The Price per Box should come from an authorized and approved price list.

The Payroll Personnel may review the prices but should not freely modify them inside the payroll slip unless the account has the required permission.

The system must automatically calculate:

Subtotal = Total Boxes × Price per Box

The system must automatically calculate:

Gross Income = Class A Subtotal + Class B Subtotal + Special Product Subtotal

Display the Gross Income clearly below the table.

==================================================
SECTION 4: MATERIAL CREDIT DEDUCTIONS
==================================================

Place the Material Credit Deductions section below the Production Earnings section.

Do not place it beside the computation summary because the information may become cramped or cut off.

Add a read-only section titled:

Material Credit Deductions from Inventory Bookkeeper

Do not show only the total material-credit deduction amount.

Display the specific materials purchased or received on credit by the beneficiary.

Add a table with:

Credit Reference Number
Date Issued
Material Name
Quantity
Unit
Unit Price
Original Amount Charged
Amount Deducted for the Current Payroll
Remaining Balance
Deduction Status

Only materials released as credit or authorized for payroll deduction should appear in this table.

The material-credit transactions must automatically come from the Inventory Bookkeeper’s saved records.

The Payroll Personnel must not manually edit, delete, or rewrite the original material-credit records.

If a material-credit transaction is incorrect, it must be corrected by the Inventory Bookkeeper.

Use the following deduction statuses:

Pending Deduction
Partially Deducted
Fully Deducted

If the beneficiary has no applicable material-credit transactions, display:

No material credit deductions found for this beneficiary.

==================================================
SECTION 5: PREVIOUS UNPAID BALANCE
==================================================

Add a section titled:

Previous Unpaid Balance

Display the unpaid balances carried over from previous payroll periods.

Show:

Reference Number
Previous Payroll Period
Deduction Type
Original Balance
Amount Previously Deducted
Remaining Unpaid Balance
Status

Important:

Prevent duplicate deductions.

If a remaining unpaid balance from a material-credit transaction is carried over to the next payroll period, do not add the original credit amount again.

Only deduct the applicable amount scheduled for the current payroll period.

The system must clearly distinguish:

Current-period material credits
Previous unpaid balances
Amounts already deducted
Remaining balances

==================================================
SECTION 6: OTHER AUTHORIZED DEDUCTIONS
==================================================

Add a section titled:

Other Authorized Deductions

Display:

Deduction Reference Number
Deduction Type
Description
Amount
Supporting Reference
Status

Only valid deductions authorized by DARBCO should appear in this section.

Do not include random deductions without a supporting reference.

==================================================
SECTION 7: DEDUCTION SUMMARY
==================================================

Display a summary card titled:

Deductions

Show:

Material Credit Deductions
Previous Unpaid Balance
Other Authorized Deductions
Total Deductions

The system must automatically calculate:

Total Deductions = Applicable Material Credit Deductions + Applicable Previous Unpaid Balance + Other Authorized Deductions

Do not double-count remaining balances that are already included in the current payroll deduction.

==================================================
SECTION 8: FINAL AMOUNT
==================================================

Add a clear computation-summary card.

Display:

Gross Income
Total Deductions
Net Income

The system must automatically calculate:

Net Income = Gross Income − Total Deductions

Make the Net Income amount visually prominent using bold text and green styling.

Make sure the entire computation summary is fully visible and not cut off on the right side.

==================================================
SECTION 9: PAYROLL TRACKING
==================================================

Display:

Payroll Slip Number
Date Created
Prepared By
Date Submitted
Validation Status
Approval Status
Notes or Remarks

Use the following validation statuses:

Draft
Submitted for Validation
Validated
Returned for Correction

Use the following approval statuses:

Pending Approval
Approved
Rejected

==================================================
VIEW BENEFICIARY PAYROLL SLIP
==================================================

When the Payroll Personnel clicks View, open a large landscape-style payroll-slip details page or modal.

Arrange the sections vertically in this order:

1. Payroll Slip Information
2. Beneficiary Information
3. Production Records from Production Clerk
4. Production Earnings
5. Material Credit Deductions
6. Previous Unpaid Balance
7. Other Authorized Deductions
8. Deduction Summary
9. Final Computation Summary
10. Payroll Tracking
11. Notes or Remarks

Add buttons:

Print Payroll Slip
Download Payroll Slip
Close

For Draft payroll slips, also add:

Edit Payroll Slip
Submit for Validation

==================================================
CLICKABLE DEDUCTION CATEGORIES
==================================================

Inside the View Beneficiary Payroll Slip page, make the deduction-summary categories clickable.

The clickable categories should include:

Material Credit Deductions
Previous Unpaid Balance
Other Authorized Deductions
Total Deductions

When the user clicks Material Credit Deductions, display only the detailed credited materials.

When the user clicks Previous Unpaid Balance, display only the unpaid balances carried over from previous payroll periods.

When the user clicks Other Authorized Deductions, display only the additional authorized deductions.

When the user clicks Total Deductions, display the complete breakdown of all deduction categories.

Only one deduction-details table should be visible at a time.

Keep the deduction-summary amounts visible while switching between categories.

Add a clear active state to the selected category using a highlighted border, darker background, or bold text.

==================================================
FORM BUTTONS
==================================================

At the bottom of the Prepare Beneficiary Payroll form, add:

Save as Draft
Submit for Validation
Cancel

When the Payroll Personnel clicks Submit for Validation, change the validation status to:

Submitted for Validation

The submitted payroll slip should then appear in the Finance Officer’s Payroll Validation page.

==================================================
IMPORTANT ACCESS AND COMPUTATION RULES
==================================================

1. Production quantities must automatically come from the Production Clerk’s verified records.

2. The Payroll Personnel must not manually re-enter or modify saved production quantities.

3. Material-credit deductions must automatically come from the Inventory Bookkeeper’s saved credit transactions.

4. The Payroll Personnel must not manually edit or delete original material-credit records.

5. Only applicable credit transactions or authorized deductions should reduce the beneficiary’s income.

6. Previous unpaid balances must be carried over properly without duplicate deductions.

7. The Price per Box must come from an authorized and approved price list.

8. Gross Income, Total Deductions, and Net Income must be calculated automatically.

9. Draft payroll slips may be edited or deleted.

10. Submitted, validated, or approved payroll slips must remain recorded for tracking and audit purposes.

11. Each production record and material-credit transaction must retain its reference number for traceability.

12. The completed payroll slip must be submitted to the Finance Officer for validation before it can be forwarded to the Manager/Admin for final approval.

FINAL INSTRUCTION

Create a clean and organized Beneficiary Payroll module for the Payroll Personnel account.

The main goal is to automatically calculate the beneficiary’s gross income, deductions, and net income based on verified production data and recorded credit transactions.

Use a wide landscape-style payroll form and payroll-slip view so the user can fully see the tables and computation summary without excessive horizontal scrolling.