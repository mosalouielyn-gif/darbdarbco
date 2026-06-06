# DARBCO Code-Scanned Functionality Checklist

Source document: `D:\Downloads\DARBCO detailed functionality.pdf`

Code scan date: 2026-06-06

Legend:

- `[x]` Implemented with backend/API/database coverage or confirmed application shell behavior.
- `[ ]` Still needed, or currently only mocked/in-memory in React.
- `UI present` means the screen/workflow exists but does not yet persist through a dedicated backend endpoint.

## Scan Summary

- [x] Laravel + React/Vite app shell exists.
- [x] Login API exists at `POST /api/login`.
- [x] Role dashboard routing exists for Production Clerk, Inventory Bookkeeper, Payroll Personnel, Finance Officer, and Manager/Admin.
- [x] App-wide read API exists at `GET /api/app-data`.
- [x] Production harvest CRUD API exists.
- [x] Production box CRUD API exists.
- [x] Production create/update/delete audit logging exists.
- [x] Inventory item, stock-in, release, adjustment, borrowed-material return, credit deduction, payroll, finance validation, manager approval, restock review, user management, and role-permission write APIs exist.
- [x] Major non-production dashboard actions are wired to backend APIs instead of only seeded/component state.
- [ ] Backend authorization is not enforced on API routes yet.
- [ ] Manager and Admin are combined into one `manager_admin` role; the PDF describes separate Manager and Admin responsibilities.
- [ ] Some reporting/export behavior and table filtering remain frontend-only.

## 1. Environment And Project Health

- [x] Confirm project requires PHP `^8.3` in `composer.json`.
- [x] Confirm frontend build script exists: `npm run build`.
- [x] Confirm Laravel test script exists: `composer test`.
- [x] Confirm feature API tests exist for login, app-data, harvest CRUD, production box CRUD, and audit creation.
- [x] Frontend production build passes with `npm.cmd run build`.
- [x] Laravel feature tests pass when run with PHP 8.3 (`D:\LARAGON\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe artisan test`).
- [ ] Default shell PHP points to XAMPP PHP 8.2.12, but Composer dependencies require PHP >= 8.3.
- [ ] Add end-to-end smoke test for login and role dashboard routing.
- [ ] Add browser test for each role dashboard landing screen.
- [ ] Add test coverage for API authorization by role.
- [ ] Add test coverage for numeric computations across production, inventory, payroll, deductions, validation, and approval.

## 2. Authentication And Access Control

- [x] Validate login email and password.
- [x] Reject invalid credentials.
- [x] Reject inactive users.
- [x] Store successful `last_login_at`.
- [x] Route logged-in users to role-specific dashboards.
- [x] Role-permission read/update API and `role_permissions` table exist.
- [ ] Add logout API/audit event.
- [ ] Add successful login audit event.
- [ ] Add failed login audit event.
- [ ] Add session/token based authentication instead of only client-side persisted user state.
- [ ] Protect API endpoints from unauthenticated access.
- [ ] Enforce role permissions on every API write action.
- [ ] Use saved role permissions for backend authorization decisions.
- [ ] Split Manager and Admin into separate roles if the final scope requires both.

## 3. Production Clerk - Harvest Records

- [x] UI tab exists for Harvest Records.
- [x] Add harvest record form exists.
- [x] Capture harvest date.
- [x] Capture beneficiary name.
- [x] Capture harvester/carrero name.
- [x] Capture 11, 12, 13, and 14 week buligs.
- [x] Auto-compute total buligs in UI.
- [x] Auto-compute total buligs in backend.
- [x] Save harvest record to database.
- [x] Fetch harvest records from API.
- [x] Edit harvest record through API.
- [x] Delete harvest record through API.
- [x] Show delete confirmation.
- [x] Search harvest records in UI.
- [x] Show entries selector in UI.
- [x] Pagination controls present in UI.
- [x] Audit create/update/delete actions.
- [ ] Link harvest records to beneficiary IDs, not only beneficiary names.
- [ ] Add backend search, filtering, and pagination instead of client-side/table-only behavior.
- [ ] Add validation for impossible dates or all-zero harvest entries if required by business rules.

## 4. Production Clerk - Production Boxes

- [x] UI tab exists for Production Boxes.
- [x] Add production record form exists.
- [x] Capture production date.
- [x] Capture beneficiary name.
- [x] Beneficiary dropdown can be populated from existing harvest record names.
- [x] Capture Class A Big Hands, Small Hands, and CPs.
- [x] Capture Class B Big Hands, Small Hands, and CPs.
- [x] Capture Special Product.
- [x] Capture defects for 11, 12, 13, and 14 weeks.
- [x] Capture rejects for 11, 12, 13, and 14 weeks.
- [x] Save production box record to database.
- [x] Fetch production box records from API.
- [x] Edit production box record through API.
- [x] Delete production box record through API.
- [x] Show delete confirmation.
- [x] Search production records in UI.
- [x] Show entries selector in UI.
- [x] Pagination controls present in UI.
- [x] Audit create/update/delete actions.
- [ ] Persist beneficiary linkage to harvest/beneficiary ID.
- [ ] Add backend search, filtering, and pagination.
- [ ] Add backend checks to prevent production output from being linked to the wrong harvest entry.

## 5. Inventory Bookkeeper - Inventory Dashboard

- [x] Persist inventory dashboard actions through backend APIs.
- [x] Load inventory items from database into the Inventory Bookkeeper dashboard.
- [x] Display total inventory items from persisted data.
- [x] Display low-stock item count from persisted data.
- [x] Display out-of-stock item count from persisted data.
- [x] Display recent stock-in transactions from persisted data.
- [x] Display recent material releases from persisted data.
- [x] Display pending credit transactions from persisted data.
- [x] Display restock requests from persisted data.
- [x] Auto-update dashboard after persisted stock-in.
- [x] Auto-update dashboard after persisted release/stock-out.
- [x] Auto-update dashboard after persisted credit transaction.
- [x] Auto-update dashboard after persisted borrowed material return.
- [x] Auto-update dashboard after persisted stock adjustment.

## 6. Inventory Items

- [x] Add inventory item API.
- [x] Update inventory item API.
- [x] View inventory item through app-data/read mapping after writes.
- [x] Deactivate/activate inventory item API.
- [x] Persist material ID/code.
- [x] Persist material name.
- [x] Persist category.
- [x] Persist unit of measurement.
- [x] Persist current quantity.
- [x] Persist minimum stock level.
- [x] Persist unit price.
- [x] Persist supplier.
- [x] Persist expiration date.
- [x] Persist active status and derive stock status in UI from quantity/minimum stock.
- [x] Persist date created and last updated.
- [x] Record initial quantity as a stock-in transaction.
- [ ] Add backend search/filter/sort for inventory item list.
- [x] Add backend audit records for inventory item create/update/deactivate.

## 7. Stock-In Transactions

- [x] Add stock-in API.
- [x] Select inventory item from persisted item list.
- [x] Capture quantity added.
- [x] Capture unit price.
- [x] Capture supplier.
- [x] Capture receipt/delivery/reference number.
- [x] Capture date received.
- [x] Capture expiration date.
- [x] Capture remarks.
- [ ] Support supporting document upload/storage.
- [x] Store supporting document name in transaction notes when provided.
- [x] Add quantity to inventory balance transactionally.
- [x] Record stock-in in stock history.
- [x] Add audit record for stock-in.
- [ ] Persist computed total amount as a dedicated backend field if required.
- [ ] Add tests for stock-in balance updates.

## 8. Material Release And Stock-Out

- [x] Add material release API.
- [x] Support Direct Release.
- [x] Support Beneficiary Credit.
- [x] Support Borrowed Material.
- [x] Support Internal Use.
- [x] Support Stock Adjustment release type.
- [ ] Require beneficiary for Beneficiary Credit.
- [x] Capture quantity released.
- [x] Capture unit price.
- [x] Capture date released.
- [x] Capture release slip number.
- [x] Capture remarks/reason.
- [x] Prevent release quantity greater than available stock.
- [x] Deduct quantity from inventory balance transactionally.
- [x] Record release in stock history.
- [x] Add audit record for release.
- [ ] Persist computed total amount as a dedicated backend field for all release types if required.
- [ ] Add tests for stock-out balance updates and over-release prevention.

## 9. Beneficiary Material Credits

- [x] Add material credit transaction table/schema.
- [x] Add credit deduction API.
- [x] Create credit automatically when release type is Beneficiary Credit.
- [x] Link credit to beneficiary account.
- [x] Track credit transaction ID.
- [x] Track material, quantity, unit price, total amount, release slip, and release date.
- [x] Track amount deducted through payroll.
- [x] Compute remaining balance.
- [x] Support Pending, Partially Deducted, and Fully Deducted statuses.
- [x] Expose unpaid credits to Payroll Personnel workflow.
- [x] Update credit balance/status after payroll deduction.
- [x] Preserve credit deduction history.
- [ ] Link credits to a persisted beneficiary ID instead of name/account text only.
- [ ] Add a standalone create/update API for credit records if direct manual credit entry is required.
- [ ] Add tests for deduction and remaining balance behavior.

## 10. Borrowed Materials

- [x] Add borrowed material table/schema.
- [x] Create borrowed material automatically when release type is Borrowed Material.
- [x] Add borrowed material return API.
- [x] Track borrower/beneficiary.
- [x] Track material.
- [x] Track quantity borrowed.
- [x] Track date borrowed.
- [x] Track expected return date.
- [x] Track actual return date.
- [x] Track quantity returned and remaining quantity.
- [x] Support Borrowed, Partially Returned, and Returned statuses.
- [x] Add returned quantity back to available stock.
- [x] Record return transaction in stock history.
- [x] Add audit record for borrowed material returns.
- [ ] Add automatic Overdue status handling.
- [ ] Add standalone create/update API for borrowed records if direct manual entry is required.
- [ ] Add tests for partial/full returns.

## 11. Stock History And Adjustments

- [x] Expose stock history through `GET /api/app-data`.
- [ ] Prevent stock history editing/deletion at backend level.
- [x] Track transaction ID.
- [x] Track material name/ID.
- [x] Track transaction type.
- [x] Track quantity added and deducted.
- [x] Track date/time.
- [x] Track Inventory Bookkeeper account where transaction schema supports `created_by`/`recorded_by`.
- [x] Track reference number.
- [x] Track remarks/reason.
- [x] Add stock adjustment API.
- [x] Capture system quantity and corrected quantity.
- [x] Compute adjustment difference.
- [x] Support increase/decrease adjustment details in adjustment reason.
- [x] Require adjustment reason.
- [x] Record adjustment in stock history and audit logs.
- [ ] Persist previous and updated balances consistently across all transaction table variants.

## 12. Restock Requests

- [x] Add restock request create/update API.
- [x] Add restock request review API for Manager approval/rejection.
- [x] Track request ID.
- [x] Track material name and quantity snapshot.
- [x] Track current quantity.
- [x] Track minimum stock level.
- [x] Track requested quantity.
- [x] Track reason.
- [x] Track requested by account.
- [x] Track requested date when schema includes `requested_at`; otherwise uses `created_at`.
- [x] Support Pending, Approved, and Rejected statuses.
- [x] Allow Inventory Bookkeeper edit while Pending.
- [x] Lock request after Manager action.
- [x] Ensure approval does not increase stock automatically.
- [x] Add audit/history records for request, approval, rejection/cancel/return.
- [ ] Persist and read the restock inventory item ID consistently (`inventory_item_id` schema vs `item_id` controller/app-data mapping).
- [ ] Support Completed status after approved restock is actually fulfilled.

## 13. Payroll Personnel - Preparation

- [x] Add payroll slip create/update/delete/submit APIs.
- [x] Retrieve beneficiary production data from persisted production records.
- [x] Retrieve unpaid beneficiary material credits from persisted credit records.
- [x] Select beneficiary and payroll period.
- [x] Display beneficiary name and ID.
- [x] Display harvest date and production record ID.
- [x] Display readonly production box quantities.
- [x] Capture price per box for all product types.
- [x] Compute product subtotals.
- [x] Compute gross income.
- [x] Display material credit deductions.
- [x] Capture authorized/current deduction amount.
- [x] Compute total deductions.
- [x] Compute net income.
- [x] Save payroll as Draft.
- [x] Submit payroll as Submitted for Validation.
- [x] Lock submitted payroll from editing.
- [x] Allow edit after Returned for Correction.
- [x] Generate payroll slip number in backend.
- [x] Add payroll audit records for create, edit, submit, delete, validate, return, and approve actions.
- [ ] Move payroll computation validation fully into backend to prevent client-side tampering.
- [ ] Add tests for payroll computation and status transitions.

## 14. Finance Officer - Validation

- [x] Load validation queue from persisted payroll data through `GET /api/app-data`.
- [x] Add validate payroll API.
- [x] Add return-for-correction API.
- [x] Load payroll slips from persisted payroll data instead of `SEED`.
- [x] Show payroll slip number, beneficiary, period, harvest date, gross income, deductions, net income, prepared by, submitted date, status, and actions.
- [x] Show complete payroll slip detail.
- [x] Show production earnings breakdown.
- [x] Show material credit deductions with previous deduction, current deduction, and remaining balance.
- [x] Show final computation summary.
- [ ] Add validation checklist persistence if required.
- [x] Require remarks/reason when returning payroll.
- [x] Change status to Validated on validation.
- [x] Record Finance Officer account and timestamp.
- [x] Forward validated payroll to Manager approval queue.
- [ ] Preserve validation remarks and history.
- [x] Prevent Finance Officer from editing production, credit, prices, gross income, deductions, or net income directly in current UI/API flow.
- [ ] Add tests for validation/return transitions.

## 15. Manager - Payroll Approval And Restock Review

- [ ] Split Manager workflow from Admin workflow if required.
- [x] Load Manager payroll approval queue from persisted payroll slips through `GET /api/app-data`.
- [x] Add approve payroll API.
- [x] Add return payroll API.
- [x] Load approval queue from persisted validated payroll slips.
- [x] Record Manager account and approval/return timestamp.
- [x] Permanently lock approved payroll from editing.
- [x] Save approval action in audit history.
- [x] Include approved payroll in report data source.
- [x] Require returned payroll to pass Finance validation again.
- [x] Add Manager restock review API.
- [x] Approve restock request and record Manager account/timestamp.
- [x] Reject/return restock request with required reason.
- [x] Preserve restock request audit history.
- [x] Prevent Manager from editing production records, inventory transactions, payroll computations, validation details, or audit records in current UI/API flow.
- [ ] Add tests for approval/return/reject transitions.

## 16. Admin - User Management And Audit

- [ ] Split Admin workflow from Manager workflow if required.
- [x] Add user create API.
- [x] Add user update API.
- [x] Add activate/deactivate API.
- [x] Store password securely using Laravel hashing.
- [ ] Validate password confirmation.
- [x] Preserve users after deactivation.
- [x] Prevent permanent user deletion by exposing status toggle only.
- [x] Record Admin account, affected user, date/time, and remarks/audit description.
- [x] Expose audit trail through `GET /api/app-data`.
- [x] Add role-permission read/update API.
- [ ] Prevent audit editing/deletion at backend level.
- [ ] Add administrative reports for users, roles, login history, account status, and audit records.
- [ ] Track exact changed fields for user edits.
- [ ] Add backend audit search/filter/sort API.
- [ ] Prevent Admin from editing operational records through backend authorization.
- [ ] Add tests for inactive login, user activation/deactivation, and user-management audit logs.

## 17. Reports And Documents

- [ ] Add production summary report using persisted production data.
- [ ] Add payroll slip document/report using persisted payroll data.
- [ ] Add inventory report using persisted inventory data.
- [ ] Add material credit transaction report.
- [ ] Add restock request report.
- [ ] Add validation record report.
- [ ] Add approval record report.
- [ ] Add date range filters.
- [ ] Add filters by beneficiary, product classification, inventory status, payroll status, and transaction type.
- [ ] Add graphical summaries sourced from backend data.
- [ ] Add export/print behavior that produces real documents, not only toast messages.

## 18. Database And API Backlog

- [x] `beneficiaries` schema exists.
- [x] `harvest_records` schema exists.
- [x] `production_box_records` schema exists.
- [x] `inventory_items` schema exists.
- [x] `inventory_transactions` schema exists.
- [x] `restock_requests` schema exists.
- [x] `payroll_slips` schema exists.
- [x] `payroll_deductions` schema exists.
- [x] `approval_actions` schema exists.
- [x] `audit_logs` schema exists.
- [x] `credit_transactions` schema exists.
- [x] `credit_deductions` schema exists.
- [x] `borrowed_materials` schema exists.
- [x] Stock adjustments are recorded as inventory/stock transaction subtypes.
- [x] Add API endpoints for inventory item, stock-in, release, adjustment, borrowed return, credit deduction, payroll, restock, users, and role permissions.
- [ ] Add/confirm schema for validation history records.
- [ ] Align restock request item-link field naming between schema, controller, app-data, and frontend.
- [ ] Add indexes for high-use filters: dates, statuses, beneficiary IDs, material IDs, role/status.
- [ ] Replace direct `DB::table` logic with models/services where workflow complexity grows.
- [x] Add transaction handling for stock-in, release, adjustment, borrowed return, and credit deduction multi-table writes.
- [ ] Add transaction handling where needed for payroll/user/restock multi-table writes.
- [ ] Add dedicated backend list/search/filter APIs where app-data bulk reads are not enough.
- [ ] Add Laravel policies/middleware for role restrictions.

## 19. Priority Build Order

- [ ] 1. Lock down authentication, sessions/tokens, API auth middleware, and role authorization.
- [ ] 2. Normalize roles: decide whether Manager and Admin stay combined or split.
- [x] 3. Finish baseline persisted inventory item, stock-in, stock-out, stock history, and restock APIs.
- [x] 4. Finish baseline persisted material credit and borrowed material workflows.
- [x] 5. Finish baseline persisted payroll slip preparation workflow.
- [x] 6. Finish baseline Finance validation workflow.
- [x] 7. Finish baseline Manager approval and restock review workflow.
- [x] 8. Finish baseline Admin user-management APIs and audit monitoring.
- [x] 9. Replace major seeded/in-memory dashboard data with API-backed data.
- [ ] 10. Strengthen backend business-rule validation and add workflow transition tests.
- [ ] 11. Add reports/documents and exports.
- [ ] 12. Add end-to-end and browser tests.

## 20. Full System Test Flow

Use this flow for adviser/user acceptance testing after major revisions. Run it with fresh test data when possible, then repeat with existing records to confirm search/dropdown behavior and audit history.

### 20.1 Sign-In And Role Routing

- [ ] Open the sign-in page.
- [ ] Confirm the form only shows Email Address, Password, show/hide password button, and Sign In button.
- [ ] Enter an invalid account and confirm login is rejected.
- [ ] Enter a valid account and confirm the user lands on the correct role dashboard.
- [ ] Confirm inactive users cannot sign in.

### 20.2 Admin Setup

- [ ] Sign in as Manager/Admin.
- [ ] Open User Management.
- [ ] Add or confirm active accounts for Production Clerk, Inventory Bookkeeper, Payroll Personnel, Finance Officer, Manager/Admin, and Harvester.
- [ ] Edit a harvester account and confirm the harvester list updates for Production Clerk use.
- [ ] Deactivate a harvester and confirm inactive harvesters are no longer selectable where applicable.
- [ ] Open Audit Trail and confirm user-management actions are recorded.

### 20.3 Production Clerk Flow

- [ ] Sign in as Production Clerk.
- [ ] Open Harvest Records.
- [ ] Create a harvest record using searchable dropdowns for Beneficiary Name and Harvester Name.
- [ ] Confirm Beneficiary Name displays in `Last Name, First Name, Middle Initial` format.
- [ ] Save the harvest record and confirm totals are computed correctly.
- [ ] Open Production Records.
- [ ] Create a production record for the same beneficiary.
- [ ] Confirm the Production Records table Actions column only shows View and Edit.
- [ ] Click View and verify complete production record details.
- [ ] Click Edit, change a field, enter an edit reason, and save.
- [ ] Confirm the edit audit trail records changed field, previous value, updated value, reason, date/time, and editor.

### 20.4 Inventory Item Setup

- [ ] Sign in as Inventory Bookkeeper.
- [ ] Open Inventory Items.
- [ ] Click Add Item.
- [ ] Add one item with `This item has an expiration date` checked and select an expiration date.
- [ ] Add one item with the checkbox unchecked and confirm the Expiration Date field is disabled/gray.
- [ ] Save both items and confirm the no-expiration item displays as No Expiration Date or Not Applicable.
- [ ] Add a new inventory category beside the category dropdown and confirm it can be used immediately.
- [ ] Edit an item, change stock/item details, enter a required edit reason, and save.
- [ ] Confirm the Inventory Items table only exposes Edit under row actions.
- [ ] Confirm inventory edit audit details include previous details, updated details, reason, date/time, and user.

### 20.5 Sales / POS And Cash Transaction Flow

- [ ] Open Sales / POS.
- [ ] Search/select an available inventory item.
- [ ] Add it to the cart and enter quantity.
- [ ] Select a beneficiary or enter a walk-in customer.
- [ ] Select Payment Method: Cash.
- [ ] Confirm Transaction.
- [ ] Confirm available stock automatically decreases.
- [ ] Open Released Materials and confirm the cash sale appears with transaction number, date/time, customer, item, category, quantity, unit price, total amount, payment method, and processed by.
- [ ] Open Cash Transactions and confirm the cash sale appears as Completed.
- [ ] Open Stock History and confirm the transaction appears with the correct date/time and deducted quantity.

### 20.6 Release Materials Cash Flow

- [ ] Open Inventory Items > Release.
- [ ] Confirm the Release Materials form is wide and organized by Transaction Information, Beneficiary or Customer Information, Material Information, and Transaction Summary.
- [ ] Confirm labels use Transaction Number, Transaction Date, and Payment Method.
- [ ] Confirm Payment Method only includes Cash and Beneficiary Credit.
- [ ] Confirm Purpose / Use and Notes fields are not shown.
- [ ] Select Payment Method: Cash.
- [ ] Select a beneficiary or enter a customer, select item, enter quantity, and confirm transaction.
- [ ] Confirm stock decreases, Released Materials updates, Cash Transactions updates, and Stock History updates.

### 20.7 Beneficiary Credit Flow

- [ ] Open Sales / POS or Release Materials.
- [ ] Select Payment Method: Beneficiary Credit.
- [ ] Select a beneficiary account, item, and quantity.
- [ ] Confirm Transaction.
- [ ] Confirm stock decreases.
- [ ] Open Released Materials and confirm the transaction appears with Payment Method: Beneficiary Credit.
- [ ] Open Credit Transactions and confirm the credit appears immediately.
- [ ] Confirm the credit is linked to the correct beneficiary account ID.
- [ ] Confirm remaining balance equals the unpaid amount.
- [ ] Confirm the credit transaction time reflects the actual purchase time, not a default time such as 8:00 AM.
- [ ] Open Stock History and confirm the credit release appears for monitoring/audit.

### 20.8 Credit Deduction And Payroll Flow

- [ ] Sign in as Payroll Personnel.
- [ ] Open Beneficiary Payroll and click Prepare Beneficiary Payroll.
- [ ] Select the beneficiary used in the Beneficiary Credit transaction.
- [ ] Confirm Credit Materials from Inventory Bookkeeper shows the credit material and does not show a Status column.
- [ ] Confirm the credit remaining balance is included in payroll deductions.
- [ ] Add Other Authorized Deductions with only Type and Amount fields.
- [ ] Confirm Description and Reference fields are not shown.
- [ ] Confirm Final Payroll Summary lists each other deduction by type and amount, for example `Cash Advance - PHP 500.00`.
- [ ] Save as Draft and confirm it appears in the payroll list.
- [ ] Reopen/edit if Draft, then Submit for Validation.
- [ ] Confirm submitted payroll is locked from normal editing.

### 20.9 Finance Validation Flow

- [ ] Sign in as Finance Officer.
- [ ] Open payroll validation queue.
- [ ] Confirm the submitted payroll appears.
- [ ] Open details and verify production earnings, material credit deductions, other deductions, total deductions, and net income.
- [ ] Return for correction with remarks and confirm Payroll Personnel can edit/resubmit.
- [ ] Validate a corrected payroll and confirm it moves to Manager approval queue.

### 20.10 Manager Approval And Restock Flow

- [ ] Sign in as Manager/Admin.
- [ ] Open payroll approval queue.
- [ ] Confirm validated payroll appears.
- [ ] Approve payroll and confirm it is permanently locked from editing.
- [ ] Return another payroll and confirm it must pass Finance validation again.
- [ ] As Inventory Bookkeeper, create a Restock Request for a low-stock item.
- [ ] As Manager/Admin, approve and reject/return restock requests with required remarks.
- [ ] Confirm restock review actions are audited.

### 20.11 Cross-Module Consistency Checks

- [ ] Confirm every Sales/POS or Release Materials confirmation decreases available stock.
- [ ] Confirm all released/sold items appear in Released Materials.
- [ ] Confirm cash payments appear in Cash Transactions as completed.
- [ ] Confirm beneficiary credit payments appear in Credit Transactions.
- [ ] Confirm beneficiary credit balances are available for payroll deductions.
- [ ] Confirm all inventory stock movements appear in Stock History with actual date/time.
- [ ] Confirm audit logs capture create, edit, release, credit, payroll, validation, approval, restock, and user-management events.
- [ ] Refresh the browser and confirm persisted data still appears consistently across modules.
- [ ] Run `npm.cmd run build` and confirm the frontend production build passes.
- [ ] Run `D:\LARAGON\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe artisan test` and confirm the Laravel test suite passes.
