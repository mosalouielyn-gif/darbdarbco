Finance Officer Module — UI Design Requirements
Module Purpose

The Finance Officer module is designed for reviewing and validating beneficiary payroll slips prepared and submitted by the Payroll Personnel.

The Finance Officer does not create payroll records and should not directly edit the original data. The primary function of this role is to verify whether the payroll computation is accurate and whether the information matches the source records from the Production Clerk and Inventory Bookkeeper.

Each beneficiary payroll slip should already contain the following before it reaches the Finance Officer:

Beneficiary information
Production record details
Class A, Class B, and Special Product box quantities
Price per box classification
Gross income
Material credit deductions
Labor cost manually entered by the Payroll Personnel
Other authorized deductions, when applicable
Total deductions
Final net income

The Finance Officer must be able to review the complete computation, validate the payroll slip, or return it to the Payroll Personnel for correction.

Sidebar Navigation

The Finance Officer dashboard should contain the following navigation items:

Menu Item	Purpose
Dashboard	Displays a summary of payroll validation activities
Pending Validation	Shows payroll slips submitted by the Payroll Personnel and waiting for review
Validated Payrolls	Displays payroll slips already reviewed and forwarded to the Manager
Returned Payrolls	Shows payroll slips returned to the Payroll Personnel for correction
Payroll History	Displays the complete transaction and status history
Reports	Allows the Finance Officer to generate payroll validation reports
1. Dashboard Page

The Dashboard should provide an overview of the Finance Officer’s current workload.

Summary Cards

Display the following cards at the top of the page:

Card	Description
Pending Validation	Number of submitted payroll slips waiting for review
Validated Payrolls	Number of payroll slips validated by the Finance Officer
Returned for Correction	Number of payroll slips returned due to errors or incomplete details
Pending Manager Approval	Number of validated payroll slips waiting for final approval
Approved Payrolls	Number of payroll slips already approved by the Manager

Below the summary cards, include a table titled:

Payroll Slips for Validation
Column	Description
Payroll Slip No.	Unique reference number of the payroll slip
Beneficiary Name	Name of the beneficiary
Harvest Date	Date of the recorded harvest
Payroll Period	Covered payroll period
Gross Income	Total earnings before deductions
Total Deductions	Total amount deducted
Net Income	Final amount to be received by the beneficiary
Status	Current payroll status
Action	Review Payroll button
2. Pending Validation Page

The Pending Validation page should display all payroll slips submitted by the Payroll Personnel.

Include the following search and filter controls:

Filter	Purpose
Search Beneficiary Name	Finds the payroll slip of a specific beneficiary
Payroll Slip Number	Searches using the unique reference number
Harvest Date	Filters payroll slips based on harvest date
Payroll Period	Filters payroll records based on the selected payroll period
Status	Filters payroll slips by status

Each payroll slip row should include a:

Review Payroll

button.

When clicked, the system should open the Payroll Validation Details page.

3. Payroll Validation Details Page

The Payroll Validation Details page should display the complete beneficiary payroll slip in a clear and organized layout.

The recommended layout is a landscape-style page with separate sections or cards.

Section A: Beneficiary and Payroll Information

Display the basic payroll information at the top of the page.

Field	Description
Payroll Slip No.	Unique payroll slip reference number
Beneficiary ID	Unique beneficiary identifier
Beneficiary Name	Name of the beneficiary
Production Record ID	Linked production record from the Production Clerk
Harvest Date	Date of the beneficiary’s harvest
Payroll Period	Covered payroll period
Prepared By	Payroll Personnel who created the payroll slip
Date Submitted	Date and time when the payroll slip was submitted
Current Status	Submitted to Finance, Returned for Correction, Validated, or Approved
Section B: Production Records Verification

This section should compare the source data from the Production Clerk with the values used in the payroll computation.

Product Classification	Production Clerk Record	Payroll Record	Validation Result
Class A	Auto-retrieved	Auto-retrieved	Matched, Mismatch, or Missing
Class B	Auto-retrieved	Auto-retrieved	Matched, Mismatch, or Missing
Special Product	Auto-retrieved	Auto-retrieved	Matched, Mismatch, or Missing

The Finance Officer should not be allowed to edit these values.

If there is a mismatch, the payroll slip must be returned for correction.

Section C: Earnings Verification

Display the earnings computation per product classification.

Product Classification	Number of Boxes	Price per Box	Subtotal	Validation Result
Class A	Auto-retrieved	Displayed price	Auto-computed	Correct or Needs Review
Class B	Auto-retrieved	Displayed price	Auto-computed	Correct or Needs Review
Special Product	Auto-retrieved	Displayed price	Auto-computed	Correct or Needs Review
Gross Income	
	
	Auto-computed total	Correct or Needs Review

The system should automatically compute:

Subtotal = Number of Boxes × Price per Box

Gross Income = Class A Subtotal + Class B Subtotal + Special Product Subtotal

Section D: Material Credit Deductions Verification

This section should display the beneficiary’s unpaid or partially paid material credit transactions recorded by the Inventory Bookkeeper.

Only transactions marked as Credit should appear as payroll deductions.

Cash purchases should not be included because they were already paid during the transaction.

Date Released	Material Name	Quantity	Unit Price	Total Amount	Credit Status	Validation Result
Auto-retrieved	Auto-retrieved	Auto-retrieved	Auto-retrieved	Auto-computed	Unpaid or Partially Paid	Matched or Needs Review

The Finance Officer should verify that:

The credited materials belong to the correct beneficiary.
The quantity and amount match the Inventory Bookkeeper’s records.
Only unpaid or partially paid credit transactions are included.
Cash purchases are excluded.
The total material credit deduction is correct.
Section E: Labor Cost Verification

The labor cost is manually entered by the Payroll Personnel during payroll preparation.

The Finance Officer should review the amount before validating the payroll slip.

Field	Description
Labor Cost Description	Description of the labor expense
Labor Cost Amount	Amount entered by the Payroll Personnel
Remarks	Optional supporting information
Encoded By	Payroll Personnel who entered the amount
Date Encoded	Date and time when the labor cost was recorded
Validation Result	Correct, Needs Review, or Missing

The labor cost should be included as part of the deductions.

Section F: Other Authorized Deductions

When applicable, display additional deductions entered by the Payroll Personnel.

Deduction Type	Description	Amount	Supporting Reference	Validation Result
Previous unpaid balance or other approved deduction	Short explanation	Entered amount	Receipt or reference number	Correct or Needs Review

The Finance Officer should check whether each deduction has a valid description and supporting reference.

Section G: Payroll Summary

Display the complete computation summary at the bottom of the page.

Payroll Summary	Amount
Gross Income	Auto-computed
Material Credit Deductions	Auto-computed
Labor Cost	Entered by Payroll Personnel
Previous Unpaid Balance	Displayed when applicable
Other Authorized Deductions	Displayed when applicable
Total Deductions	Auto-computed
Net Income	Auto-computed

The system should automatically compute:

Total Deductions = Material Credit Deductions + Labor Cost + Other Authorized Deductions

Net Income = Gross Income − Total Deductions

4. Validation Checklist

Before the Finance Officer can validate the payroll slip, display a checklist confirming that the required records have been reviewed.

Validation Area	Details to Check	Status
Beneficiary Information	Beneficiary name and ID are correct	Matched or Needs Review
Production Record	Harvest date and production record are correct	Matched or Needs Review
Product Classification	Class A, Class B, and Special Product quantities match	Matched or Mismatch
Price Computation	Correct price is applied per classification	Correct or Needs Review
Gross Income	Earnings computation is accurate	Correct or Incorrect
Material Credit Deductions	Credit transactions match the Inventory Bookkeeper’s records	Matched or Mismatch
Labor Cost	Labor cost is complete and properly recorded	Correct or Needs Review
Other Deductions	Additional deductions contain valid details	Correct or Needs Review
Total Deductions	All applicable deductions are included	Complete or Incomplete
Net Income	Final amount is correct	Correct or Incorrect

The Validate Payroll button should only become active when all required validation items are complete.

5. Available Actions

Place the following buttons at the bottom of the Payroll Validation Details page:

Button	Purpose
Return for Correction	Sends the payroll slip back to the Payroll Personnel when an issue is found
Validate Payroll	Confirms that the payroll slip is correct and forwards it to the Manager
Cancel	Closes the page without changing the status

The Finance Officer should not have an Edit Payroll button.

The Finance Officer must only review and validate the submitted payroll slip. Any correction should be made by the responsible user.

6. Return for Correction Modal

When the Finance Officer clicks Return for Correction, display a modal form.

Field	Description
Error Category	Required dropdown selection
Reason for Return	Required explanation
Remarks	Optional additional instructions
Returned To	Payroll Personnel
Returned By	Automatically recorded Finance Officer account
Date Returned	Automatically recorded date and time

Suggested error categories:

Incorrect beneficiary information
Incorrect number of boxes
Missing production record
Incorrect price per box
Missing material credit deduction
Incorrect material credit amount
Cash purchase incorrectly included
Missing labor cost
Incorrect labor cost amount
Incomplete deduction details
Incorrect gross income
Incorrect net income
Other issue

The return reason should be visible to the Payroll Personnel.

7. Validation Workflow

The UI flow should follow this sequence:

The Payroll Personnel prepares the beneficiary payroll slip.
The Payroll Personnel retrieves the production records and material credit transactions.
The Payroll Personnel manually enters the labor cost.
The system calculates the gross income, total deductions, and net income.
The Payroll Personnel clicks Submit to Finance Officer.
The submitted payroll slip appears in the Finance Officer’s Pending Validation page.
The Finance Officer opens the payroll slip and reviews the complete computation.
If the payroll slip is correct, the Finance Officer clicks Validate Payroll.
The validated payroll slip is forwarded to the Manager for final approval.
If an error is found, the Finance Officer clicks Return for Correction and provides the reason.
The returned payroll slip appears in the Payroll Personnel’s Returned for Correction page.
Payroll Statuses
Status	Meaning
Draft	Payroll Personnel is still preparing the payroll slip
Submitted to Finance	Payroll slip is waiting for Finance Officer review
Returned for Correction	Finance Officer found an issue that must be corrected
Validated by Finance	Finance Officer confirmed the payroll slip
Pending Manager Approval	Waiting for the Manager’s final review
Approved	Payroll slip has been approved by the Manager
Access Control Requirements

The Finance Officer should be allowed to:

View submitted beneficiary payroll slips
Review connected production records
Review material credit deductions
Review labor cost
Review final payroll computations
Validate payroll slips
Return payroll slips for correction
View payroll history
Generate validation reports

The Finance Officer should not be allowed to:

Create a beneficiary payroll slip
Edit production records
Edit inventory credit transactions
Change labor cost directly
Change payroll amounts directly
Approve the payroll as final
Delete payroll records

Final approval should remain under the Manager role.