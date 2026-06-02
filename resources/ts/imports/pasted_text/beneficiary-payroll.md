## Prompt: Create the Beneficiary Payroll Module for Payroll Personnel

Create a clean, modern, and professional **Beneficiary Payroll** page for the **Payroll Personnel** account of the **DARBCO Banana Production Management System**.

The Payroll Personnel is responsible for preparing payroll records for beneficiaries. The payroll computation must be based on the verified records encoded by the **Production Clerk** and the credit transactions recorded by the **Inventory Bookkeeper**.

The system must avoid repeated manual encoding. The Payroll Personnel should not manually re-enter production quantities or inventory credit transactions that already exist in the system.

---

# 1. Main Purpose of the Beneficiary Payroll Module

The Beneficiary Payroll page must calculate the beneficiary’s earnings based on the banana boxes produced from the beneficiary’s harvest.

The system must calculate each product classification separately because each classification may have a different price.

The beneficiary’s outstanding credit transactions must also appear as payroll deductions.

The final payroll slip must clearly show:

* Beneficiary information
* Production records used as the basis of the payroll
* Earnings per box classification
* Gross income
* Credited or borrowed materials
* Previous unpaid balance, when applicable
* Total deductions
* Net income
* Validation and approval status

---

# 2. Required Data Flow Between Modules

The Beneficiary Payroll module must use data from the following existing modules:

## A. Data from the Production Clerk

The Payroll Personnel must select an existing beneficiary and payroll period.

After selection, the system must automatically retrieve the beneficiary’s verified production records encoded by the **Production Clerk**.

The retrieved production data should include:

* Beneficiary name
* Beneficiary ID
* Harvest date
* Production record reference number
* Total Class A boxes
* Total Class B boxes
* Total Special Product boxes
* Breakdown of Class A boxes:

  * Big Hands
  * Small Hands
  * CPs
* Breakdown of Class B boxes:

  * Big Hands
  * Small Hands
  * CPs

The system must calculate the total number of boxes using the saved production records.

The Payroll Personnel must not manually type the number of boxes again.

## B. Data from the Inventory Bookkeeper

The system must also automatically retrieve the selected beneficiary’s credit transactions recorded by the **Inventory Bookkeeper**.

The retrieved deduction data should include:

* Credit transaction reference number
* Date issued
* Material name
* Quantity released
* Unit of measurement
* Amount charged
* Previous unpaid balance, when applicable
* Deduction status
* Remaining balance

Only materials issued as **credit** or authorized for payroll deduction should appear under the beneficiary’s deductions.

Direct releases that do not require payment must not be deducted from the beneficiary’s payroll.

Borrowed materials should only be included as deductions when DARBCO confirms that the transaction requires payment or an authorized payroll deduction.

---

# 3. Important Computation Rule

The system must automatically compute the beneficiary payroll based on the retrieved records.

Use this process:

### Step 1: Calculate Earnings per Classification

For each product classification:

**Subtotal = Total Boxes × Price per Box**

Calculate separately for:

* Class A Boxes
* Class B Boxes
* Special Product Boxes

### Step 2: Calculate Gross Income

**Gross Income = Class A Subtotal + Class B Subtotal + Special Product Subtotal**

### Step 3: Calculate Total Deductions

**Total Deductions = Credit Material Deductions + Previous Unpaid Balance + Other Authorized Deductions**

### Step 4: Calculate Net Income

**Net Income = Gross Income − Total Deductions**

The Payroll Personnel may review the computation, but the production quantities and inventory credit deductions must come from the linked system records.

---

# 4. Payroll Personnel Sidebar

Create a fixed dark green sidebar consistent with the other DARBCO modules.

At the top, display:

**DARBCO**
*Banana Production Management System*

Include a small leaf icon beside the system name.

Show only the modules accessible to Payroll Personnel:

* **Dashboard**
* **Beneficiary Payroll**
* **Worker Payroll**
* **Payroll Records**

At the bottom of the sidebar, add a profile card containing:

* Circular initials avatar
* Payroll Personnel account name
* Role label: **Payroll Personnel**
* Logout icon

Do not show inventory management, production encoding, finance validation, or admin functions inside this account.

---

# 5. Beneficiary Payroll Records Page

Create a page titled:

**Beneficiary Payroll**

At the upper-right side, add a green button:

**+ Prepare Beneficiary Payroll**

Below the page title, add search and filter controls:

* Search bar: **Search beneficiary payroll...**
* Payroll period filter
* Validation status filter
* Approval status filter
* Date range filter

Create an empty table with these columns:

| Payroll Slip No. | Payroll Period | Beneficiary | Harvest Date | Total Boxes | Gross Income | Total Deductions | Net Income | Validation Status | Approval Status | Actions |
| ---------------- | -------------- | ----------- | ------------ | ----------- | ------------ | ---------------- | ---------- | ----------------- | --------------- | ------- |

The **Actions** column should include:

* View
* Edit
* Delete
* Submit for Validation

Use small rounded icon buttons with consistent colors.

When no payroll records exist, display:

**No beneficiary payroll records available yet.**

Do not add sample records, fake names, dates, prices, or amounts.

---

# 6. Prepare Beneficiary Payroll Form

When the Payroll Personnel clicks **+ Prepare Beneficiary Payroll**, open a form page or modal titled:

**Prepare Beneficiary Payroll**

The form should be divided into clear sections.

---

## Section A: Beneficiary Information

Include:

* Beneficiary dropdown
* Beneficiary ID
* Payroll period
* Harvest date or production period filter
* Date created
* Prepared by

The Payroll Personnel should only select the beneficiary and applicable payroll period.

The system should automatically retrieve the linked production and inventory credit records.

---

## Section B: Production Records from Production Clerk

Add a clearly labeled read-only section:

**Production Records from Production Clerk**

Display the retrieved records in a table:

| Production Record Ref. | Harvest Date | Class A Boxes | Class B Boxes | Special Product | Total Boxes |
| ---------------------- | ------------ | ------------- | ------------- | --------------- | ----------- |

Add expandable details for the box classification breakdown:

### Class A Boxes

* Big Hands
* Small Hands
* CPs

### Class B Boxes

* Big Hands
* Small Hands
* CPs

The box quantities must be read-only.

The Payroll Personnel must not manually edit these values inside the payroll form.

If the production data is incorrect, the record should be returned to the **Production Clerk** for correction.

---

## Section C: Earnings Computation

Create an earnings table:

| Product Classification | Total Boxes | Price per Box | Subtotal |
| ---------------------- | ----------- | ------------- | -------- |

Include rows for:

* Class A
* Class B
* Special Product

The **Total Boxes** values must come automatically from the Production Clerk’s records.

The **Price per Box** should come from an authorized price setting or approved price list.

The system must calculate each subtotal automatically.

Below the table, display:

**Gross Income**

Make the gross income visually prominent.

---

## Section D: Material Credit Deductions from Inventory Bookkeeper

Add a clearly labeled read-only section:

**Credit Materials from Inventory Bookkeeper**

Display the beneficiary’s applicable credit transactions in a table:

| Credit Ref. No. | Date Issued | Material Name | Quantity | Unit | Amount Charged | Deduction Status | Remaining Balance |
| --------------- | ----------- | ------------- | -------- | ---- | -------------- | ---------------- | ----------------- |

The credit transaction records must come automatically from the Inventory Bookkeeper module.

Do not allow the Payroll Personnel to manually rewrite, delete, or change the original inventory credit records inside the payroll form.

If a credit transaction is incorrect, the record must be returned to the **Inventory Bookkeeper** for correction.

Below the table, display:

**Total Material Credit Deductions**

---

## Section E: Other Authorized Deductions

Add a separate section titled:

**Other Authorized Deductions**

Include an optional table:

| Deduction Type | Description | Amount | Supporting Reference |
| -------------- | ----------- | ------ | -------------------- |

Add a button:

**+ Add Authorized Deduction**

This section should only be used for valid deductions allowed by DARBCO.

---

## Section F: Final Payroll Summary

Display a clean summary card containing:

* Gross Income
* Material Credit Deductions
* Previous Unpaid Balance
* Other Authorized Deductions
* Total Deductions
* Net Income

Make the **Net Income** value visually prominent using a bold font and green styling.

---

## Section G: Payroll Tracking

Include:

* Payroll Slip Number
* Date Created
* Prepared By
* Validation Status
* Approval Status
* Notes

Use status badges such as:

### Validation Status

* Draft
* Submitted for Validation
* Validated
* Returned for Correction

### Approval Status

* Pending Approval
* Approved
* Rejected

---

# 7. Buttons and Workflow

At the bottom of the form, add:

* **Save as Draft**
* **Submit for Validation**
* **Cancel**

The correct workflow should be:

1. The **Production Clerk** records the verified production boxes.
2. The **Inventory Bookkeeper** records materials issued as credit to the beneficiary.
3. The **Payroll Personnel** selects the beneficiary and payroll period.
4. The system automatically retrieves the linked production data and credit deductions.
5. The system calculates the beneficiary’s gross income, total deductions, and net income.
6. The Payroll Personnel reviews the generated payroll slip.
7. The Payroll Personnel submits the payroll slip to the **Finance Officer** for validation.
8. If validated, the payroll slip is forwarded to the **Manager/Admin** for final approval.
9. If there is an error, the payroll slip is returned for correction.

---

# 8. View Payroll Slip Page

When the user clicks **View**, open a detailed payroll slip page or modal.

The payroll slip should clearly show:

### Beneficiary Information

* Beneficiary name
* Beneficiary ID
* Payroll period
* Harvest date or production period

### Production Basis

* Production record references
* Total Class A boxes
* Total Class B boxes
* Total Special Product boxes
* Total boxes

### Earnings

* Price per classification
* Subtotal per classification
* Gross income

### Deductions

* Credited materials
* Previous unpaid balance
* Other authorized deductions
* Total deductions

### Final Amount

* Net income

### Payroll Tracking

* Payroll slip number
* Date created
* Prepared by
* Validation status
* Approval status

Add buttons for:

* Print Payroll Slip
* Download Payroll Slip
* Close

---

# 9. Error and Missing-Data Handling

The system must display clear messages when required linked records are missing.

Examples:

* **No verified production records found for the selected beneficiary and payroll period.**
* **No credit material deductions found for this beneficiary.**
* **Payroll cannot be submitted because the production record is incomplete.**
* **Please review the linked records before submitting the payroll slip.**

Do not silently compute a payroll slip when essential production records are missing.

---

# 10. Empty-State Requirement

Do not include fake records, sample names, sample amounts, sample box values, or sample payroll slips.

All tables must start empty.

Use empty-state messages such as:

* **No beneficiary payroll records available yet.**
* **No verified production records found.**
* **No credit material deductions found.**
* **No authorized deductions added.**

Keep the buttons, filters, search bars, table headers, pagination controls, and empty-state placeholders visible.

---

# 11. Important Integration Rules

For future backend integration, follow these rules:

1. Production box quantities must come from the **Production Clerk** module.
2. The Payroll Personnel must not manually re-enter or edit the saved production box quantities.
3. Credit material deductions must come from the **Inventory Bookkeeper** module.
4. Only applicable credit or authorized deduction transactions should reduce the beneficiary’s income.
5. Each retrieved production record and credit transaction must retain its reference number for traceability.
6. The Payroll Personnel should review computations but must not alter the source records.
7. Incorrect production records must be corrected by the Production Clerk.
8. Incorrect credit transactions must be corrected by the Inventory Bookkeeper.
9. Gross income, total deductions, and net income must be computed automatically.
10. Submitted payroll slips must be forwarded to the Finance Officer for validation before final Manager/Admin approval.

---

# Final Instruction

Create the **Beneficiary Payroll frontend UI design** and structure it for future module integration.

Do not use fake data. Do not manually encode production quantities or material credit deductions inside the payroll form.

The production basis must come from the **Production Clerk’s saved production records**, while the material credit deductions must come from the **Inventory Bookkeeper’s saved credit transactions**.
