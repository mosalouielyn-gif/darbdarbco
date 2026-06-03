# DARBCO Functionality Checklist

Source: `D:\Downloads\DARBCO detailed functionality.pdf`

Use this as the working implementation and verification checklist. Items can be marked as done once the UI, backend/API behavior, database persistence, role rules, and tests are all covered.

Checked items below are features currently present in the codebase. Many checked dashboard/workflow items are implemented as React UI with local demo state, not yet persisted through backend endpoints unless the database/API section also says so.

## 1. Project Health And Environment

- [x] Ensure project runs with PHP 8.3 or newer.
- [ ] Fix local PATH so Laravel commands use Laragon PHP 8.3 instead of XAMPP PHP 8.2.
- [ ] Keep `npm.cmd` or PowerShell execution policy workaround documented for frontend commands.
- [x] Confirm `npm.cmd run build` passes after each frontend milestone.
- [x] Confirm Laravel feature tests pass with PHP 8.3 after each backend milestone.
- [ ] Add end-to-end smoke test for login and role dashboard routing.

## 2. Authentication And Role-Based Access

- [x] Support login using authorized personnel accounts.
- [x] Reject invalid credentials with a clear error message.
- [x] Prevent inactive users from logging in.
- [x] Record successful login timestamp.
- [ ] Add audit record for successful login.
- [ ] Add audit record for failed login attempt.
- [ ] Add logout action and audit record.
- [x] Restrict Production Clerk to production records and production monitoring.
- [x] Restrict Inventory Bookkeeper to inventory items, releases, credit transactions, stock history, and restock requests.
- [x] Restrict Payroll Personnel to beneficiary payroll preparation and payroll records.
- [x] Restrict Finance Officer to payroll review, validation, and validation history.
- [x] Restrict Manager to payroll approval, restock approval, reports, and monitoring.
- [x] Restrict Admin to user management, account access, and audit trail.

## 3. Production Clerk - Harvest Records

- [x] Add Harvest Records tab.
- [x] Add Production Boxes tab.
- [x] Allow switching between Harvest Records and Production Boxes without leaving the module.
- [x] Add New Harvest Record form.
- [x] Capture harvest date.
- [x] Capture beneficiary name.
- [x] Capture harvester or carrero name.
- [x] Capture 11-week buligs.
- [x] Capture 12-week buligs.
- [x] Capture 13-week buligs.
- [x] Capture 14-week buligs.
- [x] Automatically compute total buligs from all maturity levels.
- [x] Save harvest records to the database.
- [x] Display harvest records in a table.
- [x] Show harvest date, beneficiary, harvester, maturity-level counts, and total buligs.
- [x] Edit existing harvest records.
- [x] Recalculate total buligs immediately after edit.
- [x] Delete incorrect or duplicate harvest records.
- [x] Show delete confirmation before removing harvest records.
- [x] Search harvest records by beneficiary, harvester, or harvest date.
- [x] Add show-entries selector for 10, 25, and 50 rows.
- [x] Add pagination for harvest records.
- [x] Add audit records for create, update, and delete.

## 4. Production Clerk - Production Boxes

- [x] Add New Production Record form.
- [x] Capture production date.
- [x] Link or select beneficiary from existing harvest records when possible.
- [x] Capture Class A Big Hands quantity.
- [x] Capture Class A Small Hands quantity.
- [x] Capture Class A CPs quantity.
- [x] Capture Class B Big Hands quantity.
- [x] Capture Class B Small Hands quantity.
- [x] Capture Class B CPs quantity.
- [x] Capture Special Product quantity.
- [x] Capture defects for 11, 12, 13, and 14 weeks.
- [x] Capture rejects for 11, 12, 13, and 14 weeks.
- [x] Save production box records to the database.
- [x] Display saved production records in a table.
- [x] Show product classification, defects, rejects, and actions in the table.
- [x] Edit existing production records.
- [x] Delete incorrect or duplicate production records with confirmation.
- [x] Search production records by beneficiary or production entry.
- [x] Add show-entries selector for 10, 25, and 50 rows.
- [x] Add pagination for production records.
- [x] Add audit records for create, update, and delete.

## 5. Inventory Bookkeeper - Dashboard

- [x] Display total inventory items.
- [x] Display low-stock item count.
- [x] Display out-of-stock item count.
- [x] Display recent stock-in transactions.
- [x] Display recent material releases.
- [x] Display pending credit transactions.
- [x] Display restock requests.
- [x] Auto-update dashboard after stock-in.
- [x] Auto-update dashboard after stock-out or material release.
- [x] Auto-update dashboard after beneficiary credit transaction.
- [x] Auto-update dashboard after borrowed material return.
- [x] Auto-update dashboard after stock adjustment.

## 6. Inventory Bookkeeper - Inventory Items

- [x] Add Inventory Items page.
- [x] Add new inventory item.
- [x] View complete item details.
- [x] Edit item basic information.
- [x] Search by material name or material ID.
- [x] Filter by category.
- [x] Filter by stock status.
- [x] Sort by quantity, category, material name, and date updated.
- [x] Track material ID.
- [x] Track material name.
- [x] Track category.
- [x] Track unit of measurement.
- [x] Track current quantity.
- [x] Track minimum stock level.
- [x] Track unit price.
- [x] Track supplier.
- [x] Track expiration date where applicable.
- [x] Generate stock status automatically.
- [x] Track date created and last updated.
- [x] Support categories for fertilizers and soil inputs.
- [x] Support categories for chemicals and crop protection materials.
- [x] Support categories for farm materials.
- [x] Support categories for packaging materials.
- [x] Support categories for other supplies.
- [x] Record initial quantity as a Stock-In transaction after item creation.

## 7. Inventory Bookkeeper - Stock-In

- [x] Add Stock-In form.
- [x] Select inventory item.
- [x] Capture quantity added.
- [x] Capture unit price.
- [x] Automatically compute total amount.
- [x] Capture supplier.
- [x] Capture receipt or delivery reference number.
- [x] Capture date received.
- [x] Capture expiration date where applicable.
- [x] Capture remarks.
- [x] Support optional supporting document upload.
- [x] Add quantity to current inventory balance.
- [x] Update stock status after stock-in.
- [x] Record stock-in in Stock History.
- [x] Show transaction under Recent Stock-In Transactions.
- [x] Add audit record for stock-in.

## 8. Inventory Bookkeeper - Material Release And Stock-Out

- [x] Add Release Material form.
- [x] Select inventory item.
- [x] Capture quantity released.
- [x] Support Direct Release transaction type.
- [x] Support Beneficiary Credit transaction type.
- [x] Support Borrowed Material transaction type.
- [x] Support Internal Use transaction type.
- [x] Support Stock Adjustment transaction type.
- [x] Require beneficiary when transaction type is Beneficiary Credit.
- [x] Capture unit price.
- [x] Automatically compute total amount.
- [x] Capture date released.
- [x] Capture release slip number.
- [x] Capture remarks or reason.
- [x] Prevent release when requested quantity exceeds available stock.
- [x] Deduct released quantity from available stock.
- [x] Update stock status after release.
- [x] Record release in Stock History.
- [x] Add audit record for material release.

## 9. Inventory Bookkeeper - Beneficiary Credit Transactions

- [x] Automatically create credit record when release type is Beneficiary Credit.
- [x] Link credit transaction to beneficiary account.
- [x] Track credit transaction ID.
- [x] Track beneficiary name and ID.
- [x] Track material name.
- [x] Track quantity.
- [x] Track unit price.
- [x] Automatically compute total credit amount.
- [x] Track date released.
- [x] Track release slip number.
- [x] Track amount deducted through payroll.
- [x] Automatically compute remaining balance.
- [x] Set credit status to Pending when no deduction has been applied.
- [x] Set credit status to Partially Deducted when partial deduction has been applied.
- [x] Set credit status to Fully Deducted when remaining balance is zero.
- [x] Show applicable unpaid credits in Payroll Personnel module.
- [x] Update balance and status after payroll deduction.
- [x] Preserve credit transaction history.

## 10. Inventory Bookkeeper - Borrowed Materials

- [x] Add borrowed material record.
- [x] Track borrower or beneficiary name.
- [x] Track material name.
- [x] Track quantity borrowed.
- [x] Track date borrowed.
- [x] Track expected return date.
- [x] Track actual return date.
- [x] Track quantity returned.
- [x] Track remaining quantity to return.
- [x] Support Borrowed status.
- [x] Support Partially Returned status.
- [x] Support Returned status.
- [x] Support Overdue status.
- [x] Add returned quantity back to available stock.
- [x] Record return transaction in Stock History.

## 11. Inventory Bookkeeper - Stock Status, History, And Adjustment

- [x] Set status to In Stock when current quantity is above minimum stock level.
- [x] Set status to Low Stock when current quantity is equal to or below minimum but above zero.
- [x] Set status to Out of Stock when current quantity is zero.
- [x] Clearly display low-stock and out-of-stock items.
- [x] Add Stock History page.
- [x] Track transaction ID.
- [x] Track material name.
- [x] Track transaction type.
- [x] Track quantity added.
- [x] Track quantity deducted.
- [x] Track previous balance.
- [x] Track updated balance.
- [x] Track date and time.
- [x] Track Inventory Bookkeeper account.
- [x] Track reference number.
- [x] Track remarks.
- [x] Prevent deleting stock history records.
- [x] Add Stock Adjustment form.
- [x] Capture system quantity and corrected quantity.
- [x] Compute quantity difference.
- [x] Support Increase and Decrease adjustment types.
- [x] Require reason for adjustment.
- [x] Record adjustment in Stock History.

## 12. Inventory Bookkeeper - Restock Requests

- [x] Create restock request for low-stock or out-of-stock materials.
- [x] Track request ID.
- [x] Track material name.
- [x] Track current quantity.
- [x] Track minimum stock level.
- [x] Track requested quantity.
- [x] Track reason.
- [x] Track date requested.
- [x] Track requested by account.
- [x] Track request status: Pending, Approved, Rejected, or Completed.
- [ ] Allow Inventory Bookkeeper to edit request while Pending.
- [ ] Lock restock request after Manager action.
- [x] Add search, filter, and sort for restock requests.

## 13. Payroll Personnel - Preparation And Computation

- [x] Add beneficiary selection for payroll period.
- [x] Retrieve beneficiary production data automatically.
- [x] Display beneficiary name and ID.
- [x] Display harvest date.
- [x] Display payroll period.
- [x] Display production record ID.
- [x] Display recorded box quantities for each product type.
- [x] Prevent Payroll Personnel from editing production box quantities.
- [ ] Allow price per box entry for Class A Big Hands.
- [ ] Allow price per box entry for Class A Small Hands.
- [ ] Allow price per box entry for Class A CPs.
- [ ] Allow price per box entry for Class B Big Hands.
- [ ] Allow price per box entry for Class B Small Hands.
- [ ] Allow price per box entry for Class B CPs.
- [x] Allow price per box entry for Special Product.
- [x] Automatically compute subtotal per product type.
- [x] Automatically compute gross income.
- [x] Retrieve unpaid or applicable beneficiary credit deductions.
- [x] Display material name, quantity, unit price, total amount, date released, reference number, deduction status, and amount to deduct.
- [x] Automatically compute total deductions.
- [x] Automatically compute net income.
- [x] Recalculate subtotals, gross income, deductions, and net income when prices or deductions change.

## 14. Payroll Personnel - Slip Status And Tracking

- [x] Save payroll slip as Draft.
- [x] Allow editing while Draft.
- [x] Submit payroll slip as Ready for Validation.
- [x] Lock editing while Ready for Validation.
- [x] Allow editing again when Returned for Correction.
- [x] Lock editing when Validated.
- [x] Permanently lock editing when Approved.
- [x] Generate payroll slip number.
- [x] Show payroll slip details: beneficiary, production earnings, deductions, final summary, and tracking.
- [x] Track prepared by account.
- [x] Track date and time created.
- [x] Track date and time last updated.
- [x] Track validation status.
- [x] Track approval status.
- [x] Track remarks or correction reason.
- [ ] Add audit records for create, edit, submit, and resubmit.

## 15. Finance Officer - Validation

- [x] Add Finance Officer dashboard.
- [x] Display payrolls for validation.
- [x] Display validated payrolls.
- [x] Display returned payrolls.
- [ ] Display total validated payroll amount for selected period.
- [ ] Display recent validation activities.
- [x] Add Payroll Validation list.
- [x] Show payroll slip number, beneficiary, period, harvest date, gross income, deductions, net income, prepared by, date submitted, validation status, and actions.
- [x] Search, filter, and sort validation records.
- [x] Add View Details layout for complete payroll slip.
- [x] Show production earnings breakdown by product type.
- [x] Show material credit deductions with previous deduction, current deduction, and remaining balance.
- [x] Show final computation summary.
- [x] Add validation checklist for beneficiary information.
- [x] Add validation checklist for production records.
- [x] Add validation checklist for product classifications.
- [x] Add validation checklist for prices.
- [x] Add validation checklist for earnings computation.
- [x] Add validation checklist for material credit records.
- [x] Add validation checklist for deduction amounts.
- [x] Add validation checklist for net income.
- [x] Validate payroll action changes status to Validated.
- [x] Record Finance Officer account and validation timestamp.
- [x] Lock payroll computation fields after validation.
- [x] Forward validated payroll to Manager approval queue.
- [x] Return payroll for correction with required remarks.
- [x] Preserve validation remarks and transaction history.
- [x] Add Validation History page.
- [x] Prevent Finance Officer from editing production records, credit transactions, prices, gross income, deductions, or net income directly.

## 16. Manager - Approval And Monitoring

- [x] Add Manager dashboard.
- [x] Display payrolls for approval.
- [x] Display approved payrolls.
- [x] Display returned payrolls.
- [x] Display pending restock requests.
- [ ] Display low-stock and out-of-stock item counts.
- [x] Display total production boxes for selected period.
- [x] Display recent approval activities.
- [x] Add Payroll Approval page.
- [x] Show payroll slip number, beneficiary, period, gross income, deductions, net income, prepared by, validated by, date validated, approval status, and actions.
- [x] Search, filter, and sort payroll approval records.
- [x] Add View Details layout for complete payroll slip.
- [x] Approve payroll action changes status to Approved.
- [x] Record Manager account and approval timestamp.
- [x] Permanently lock approved payroll from editing.
- [x] Save approval action in transaction history.
- [ ] Include approved payroll in reports.
- [x] Return payroll for correction with required remarks.
- [x] Preserve Finance Officer validation record and previous transaction history.
- [ ] Require corrected payroll to pass Finance validation again before Manager approval.
- [x] Add Restock Request Review page.
- [x] Approve restock request and record Manager account and timestamp.
- [x] Reject restock request with required remarks.
- [x] Ensure approved restock request does not automatically increase stock quantity.
- [x] Prevent Manager from directly editing production records, inventory transactions, payroll prices, computations, or validation details.

## 17. Admin - User Management And Audit

- [x] Add Admin dashboard.
- [x] Display total user accounts.
- [x] Display active users.
- [x] Display inactive users.
- [x] Display users by role.
- [x] Display recent user activities.
- [ ] Display recent account changes.
- [x] Add User Management page.
- [ ] Search, filter, and sort users by full name, role, status, and date created.
- [x] Add new user account.
- [x] Capture full name.
- [x] Capture username or email.
- [x] Capture assigned role.
- [ ] Capture temporary password and confirmation.
- [x] Capture account status.
- [ ] Capture contact information where applicable.
- [ ] Capture remarks where applicable.
- [ ] Edit user full name, username/email, role, contact information, status, and remarks.
- [x] Activate user account.
- [x] Deactivate user account.
- [x] Prevent login for inactive accounts.
- [x] Preserve user records after deactivation.
- [x] Prevent permanent user deletion.
- [ ] Record Admin account, affected user, changed information, date/time, and remarks for account changes.
- [x] Add Audit Trail page.
- [ ] Track activity ID, user account, role, action, module, affected record, date/time, and remarks.
- [ ] Search, filter, and sort audit records by account, role, module, action type, and date range.
- [x] Prevent editing or deleting audit records.
- [ ] Add administrative reports for users, roles, login history, account status, and audit records.
- [x] Prevent Admin from editing operational records, inventory transactions, payroll computations, validation records, approval records, or audit records.

## 18. Reports And Documents

- [ ] Generate production summaries.
- [x] Generate payroll slips.
- [ ] Generate inventory reports.
- [ ] Generate material credit transaction records.
- [ ] Generate restock request records.
- [ ] Generate validation records.
- [ ] Generate approval records.
- [x] Add production performance report with date range filter.
- [x] Add payroll transaction report with date range filter.
- [x] Add inventory status report.
- [x] Add material credits report.
- [x] Add restock requests report.
- [x] Add graphical summaries for production, payroll, inventory, credits, and restock requests.
- [ ] Allow Manager reports to filter by date range, beneficiary, product classification, inventory status, payroll status, and transaction type.

## 19. Database And API Coverage

- [x] Persist harvest records.
- [x] Persist production box records.
- [x] Persist inventory items.
- [x] Persist stock transactions.
- [ ] Persist beneficiary credit transactions.
- [ ] Persist borrowed material records.
- [ ] Persist stock adjustments.
- [x] Persist restock requests.
- [x] Persist payroll slips.
- [x] Persist payroll deductions.
- [ ] Persist validation records.
- [x] Persist approval records.
- [x] Persist audit logs.
- [ ] Add API endpoints for create, update, delete, submit, validate, return, approve, reject, activate, and deactivate actions.
- [ ] Add backend validation for required fields and numeric constraints.
- [ ] Add backend authorization checks for every restricted action.
- [ ] Add tests for critical computations.
- [ ] Add tests for workflow status transitions.
- [ ] Add tests for role restrictions.
- [ ] Add tests for audit trail creation.
