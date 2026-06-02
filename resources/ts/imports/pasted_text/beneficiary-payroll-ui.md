Yes ghorl, since **beneficiary payroll lang talaga ang focus**, tanggalin na natin ang separate **Worker Payroll** page. Mas simple at mas accurate sa flow ninyo kung ang labor cost ay part na mismo ng beneficiary payroll computation.

Ito ang revised explanation:

---

# Payroll Personnel — Detailed UI Explanation

The **Payroll Personnel** is responsible for preparing the beneficiary payroll record using the production data encoded by the **Production Clerk** and the credited material transactions recorded by the **Inventory Bookkeeper**.

The system should automatically retrieve the beneficiary’s production details and material credit records to reduce manual encoding errors. The Payroll Personnel will review the records, enter the applicable labor cost, and check whether the computation is complete before submitting the payroll slip to the Finance Officer for validation.

The payroll computation must show how much the beneficiary earned from the banana boxes produced, how much should be deducted for credited materials and labor expenses, and how much the beneficiary will receive as the final net income.

---

# Suggested Sidebar Menu for Payroll Personnel

| Menu                    | Purpose                                                                      |
| ----------------------- | ---------------------------------------------------------------------------- |
| **Dashboard**           | Shows payroll summaries, pending records, and recent payroll activities      |
| **Beneficiary Payroll** | Used to create and review beneficiary payroll slips                          |
| **Payroll History**     | Displays submitted, returned, validated, and approved payroll slips          |
| **Reports**             | Generates payroll reports based on the selected payroll period or date range |

Since the system only focuses on beneficiary payroll, a separate **Worker Payroll** menu is no longer needed.

---

# 1. Payroll Dashboard

The Payroll Dashboard provides an overview of the payroll records that still need to be prepared, reviewed, or corrected.

### Dashboard Summary Cards

| Summary Card                 | Description                                                   |
| ---------------------------- | ------------------------------------------------------------- |
| **Pending Payroll Records**  | Production records that are ready for payroll preparation     |
| **Draft Payroll Slips**      | Payroll records that are still being completed                |
| **Submitted for Validation** | Payroll slips already forwarded to the Finance Officer        |
| **Returned for Correction**  | Payroll slips returned due to incomplete or incorrect details |
| **Approved Payrolls**        | Payroll slips already approved by the Manager                 |

The dashboard may also include a **Recent Payroll Activities** table.

### Recent Payroll Activities Table

| Column           | Description                                        |
| ---------------- | -------------------------------------------------- |
| Payroll Slip No. | Unique reference number of the payroll slip        |
| Beneficiary Name | Name of the beneficiary                            |
| Payroll Period   | Covered payroll date or period                     |
| Gross Income     | Total earnings before deductions                   |
| Net Income       | Final amount to be received                        |
| Status           | Draft, Submitted, Returned, Validated, or Approved |
| Action           | View Details or Continue Editing                   |

---

# 2. Beneficiary Payroll Page

The **Beneficiary Payroll** page is where the Payroll Personnel prepares the payroll slip of each beneficiary.

At the top of the page, there may be a button:

> **+ Create Beneficiary Payroll**

When clicked, the system should open a landscape-style form or modal with several sections.

---

## Section A: Select Production Record

The Payroll Personnel will select a completed production record encoded by the Production Clerk.

| Field                | Description                                                 |
| -------------------- | ----------------------------------------------------------- |
| Production Record ID | Unique production record reference number                   |
| Beneficiary Name     | Automatically retrieved from the selected production record |
| Beneficiary ID       | Automatically displayed                                     |
| Harvest Date         | Date when the bananas were harvested                        |
| Harvester’s Name     | Name of the assigned harvester                              |
| Payroll Period       | Covered payroll period                                      |

The system should only display production records that are complete and have not yet been used in an approved payroll slip.

---

## Section B: Production Basis and Earnings

After selecting a production record, the system will automatically display the number of boxes produced.

Each product classification must be computed separately because the price per box may be different.

### Suggested Earnings Table

| Product Classification | Number of Boxes |                            Price per Box |                Subtotal |
| ---------------------- | --------------: | ---------------------------------------: | ----------------------: |
| Class A                |     Auto-filled | Entered or retrieved from the price list |           Auto-computed |
| Class B                |     Auto-filled | Entered or retrieved from the price list |           Auto-computed |
| Special Product        |     Auto-filled | Entered or retrieved from the price list |           Auto-computed |
| **Gross Income**       |                 |                                          | **Auto-computed total** |

### Computation

**Subtotal per classification = Number of boxes × Price per box**

**Gross Income = Class A subtotal + Class B subtotal + Special Product subtotal**

The Payroll Personnel should only review the box quantities. These values should not be directly editable from the payroll page because they came from the Production Clerk’s record.

If the number of boxes is incorrect, the record should be returned for correction instead of being edited inside the payroll module.

---

## Section C: Material Credit Deductions

The system should automatically retrieve unpaid material credit transactions recorded by the Inventory Bookkeeper.

These are materials released to the beneficiary under the **Credit** transaction type.

Examples may include fertilizers, chemicals, medicines, or other farming supplies.

### Suggested Material Credit Table

| Date Released | Material Name | Quantity | Unit Price | Total Amount | Status |
| ------------- | ------------- | -------: | ---------: | -----------: | ------ |
| May 15, 2026  | Fertilizer    |  2 sacks |     ₱1,000 |       ₱2,000 | Unpaid |
| May 18, 2026  | Fungicide     | 1 bottle |       ₱500 |         ₱500 | Unpaid |

### Computation

**Material Credit Deduction = Quantity × Unit Price**

Only unpaid or partially paid credit transactions should appear as deductions.

Cash purchases should not be deducted from the payroll because they were already paid during the material transaction.

---

## Section D: Labor Cost

The **Labor Cost** section is where the Payroll Personnel will manually enter the total labor expense related to the beneficiary’s harvest and banana production.

This may include the cost of harvesting, processing, sorting, packing, or other applicable labor charges based on DARBCO’s actual process.

### Suggested Labor Cost Fields

| Field                  | Description                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------- |
| Labor Cost Description | Example: harvesting labor, processing labor, packing labor, or total labor expense |
| Labor Cost Amount      | Total amount to be deducted from the beneficiary’s earnings                        |
| Remarks                | Optional explanation or supporting details                                         |
| Encoded By             | Payroll Personnel account that entered the labor cost                              |
| Date Encoded           | Date and time when the labor cost was recorded                                     |

The labor cost should be manually entered by the Payroll Personnel because it may depend on the actual labor expenses for the selected production record.

The system should include validation to prevent blank, negative, or invalid amounts.

Example:

| Labor Cost Description          | Amount |
| ------------------------------- | -----: |
| Harvesting and production labor | ₱3,500 |

---

## Section E: Other Authorized Deductions

When applicable, the Payroll Personnel may also add other authorized deductions.

| Field                | Description                                                  |
| -------------------- | ------------------------------------------------------------ |
| Deduction Type       | Example: previous unpaid balance or other approved deduction |
| Description          | Short explanation of the deduction                           |
| Amount               | Amount to be deducted                                        |
| Supporting Reference | Optional receipt number, transaction number, or remarks      |

The system should require a reason before an additional deduction can be added.

---

## Section F: Payroll Summary

At the bottom of the page, the system should display the complete payroll computation.

### Suggested Payroll Summary

| Payroll Summary             |                                      Amount |
| --------------------------- | ------------------------------------------: |
| Gross Income                |                               Auto-computed |
| Material Credit Deductions  |                               Auto-computed |
| Labor Cost                  |       Manually entered by Payroll Personnel |
| Previous Unpaid Balance     | Retrieved or manually added when applicable |
| Other Authorized Deductions |              Manually added when applicable |
| **Total Deductions**        |                           **Auto-computed** |
| **Net Income**              |                           **Auto-computed** |

### Final Computation

**Total Deductions = Material Credit Deductions + Labor Cost + Previous Unpaid Balance + Other Authorized Deductions**

**Net Income = Gross Income − Total Deductions**

Example:

| Payroll Summary             |      Amount |
| --------------------------- | ----------: |
| Gross Income                |     ₱20,500 |
| Material Credit Deductions  |      ₱2,500 |
| Labor Cost                  |      ₱3,500 |
| Other Authorized Deductions |          ₱0 |
| **Total Deductions**        |  **₱6,000** |
| **Net Income**              | **₱14,500** |

---

# 3. Record Matching Checklist

Before submitting the payroll slip, the system should show a checklist to help the Payroll Personnel verify whether the records are aligned.

| Record Check                                             | Data Source          | Status                  |
| -------------------------------------------------------- | -------------------- | ----------------------- |
| Beneficiary name matches the production record           | Production Clerk     | Matched or Needs Review |
| Harvest date is correct                                  | Production Clerk     | Matched or Needs Review |
| Class A, Class B, and Special Product boxes are complete | Production Clerk     | Complete or Incomplete  |
| Price per box classification is available                | Payroll Price List   | Available or Missing    |
| Credited materials belong to the selected beneficiary    | Inventory Bookkeeper | Matched or Needs Review |
| Unpaid material credits are included as deductions       | Inventory Bookkeeper | Complete or Incomplete  |
| Labor cost has been entered                              | Payroll Personnel    | Complete or Missing     |
| Gross income is computed correctly                       | System-generated     | Complete                |
| Total deductions are computed correctly                  | System-generated     | Complete                |
| Net income is calculated                                 | System-generated     | Complete                |

The **Submit for Validation** button should only become active when all required information is complete.

---

# 4. Payroll Status Workflow

| Status                       | Meaning                                               |
| ---------------------------- | ----------------------------------------------------- |
| **Draft**                    | Payroll slip is still being prepared                  |
| **Ready for Submission**     | Required data is complete                             |
| **Submitted for Validation** | Sent to the Finance Officer                           |
| **Returned for Correction**  | Sent back because of missing or incorrect information |
| **Validated**                | Checked and confirmed by the Finance Officer          |
| **Approved**                 | Final approval completed by the Manager               |

When the payroll slip is returned, the Payroll Personnel should be able to view the reason for correction.

Examples:

* Incorrect product price
* Missing material credit transaction
* Labor cost not entered
* Invalid labor cost amount
* Incorrect beneficiary details
* Incomplete deductions
* Computation mismatch

---

# 5. Difference Between Payroll Personnel and Finance Officer

| Role                  | Main Responsibility                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Payroll Personnel** | Prepares the beneficiary payroll slip, enters the labor cost, reviews the connected records, and submits the completed payroll   |
| **Finance Officer**   | Performs the official validation and checks whether the production records, deductions, labor cost, and computation are accurate |
| **Manager**           | Reviews and gives the final approval                                                                                             |

In simple terms:

> The Payroll Personnel prepares the computation and enters the labor cost. The Finance Officer verifies whether the payroll is correct. The Manager provides the final approval.

---

# Final Explanation for Documentation

> The Payroll Personnel is responsible for preparing beneficiary payroll records using the production data encoded by the Production Clerk and the material credit transactions recorded by the Inventory Bookkeeper. The system automatically retrieves the number of Class A, Class B, and Special Product boxes produced from the beneficiary’s harvest. Each product classification is computed separately based on its corresponding price to determine the beneficiary’s gross income. The system also retrieves unpaid credited materials, such as fertilizers, chemicals, medicines, and other farming supplies, which are included as deductions. In addition, the Payroll Personnel manually enters the applicable labor cost for the beneficiary’s harvest and production activities. The system then calculates the total deductions and net income. Before submitting the payroll slip, the Payroll Personnel reviews whether the production data, material credit records, labor cost, and final computation are complete and aligned. The completed payroll slip is forwarded to the Finance Officer for validation and then submitted to the Manager for final approval.
