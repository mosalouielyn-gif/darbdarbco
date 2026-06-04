# DARBCO Code-Scanned Functionality Checklist

Source document: `D:\Downloads\DARBCO detailed functionality.pdf`

Code scan date: 2026-06-03

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
- [ ] Inventory, payroll, finance validation, manager approval, restock review, and user management workflows need write APIs and persistence.
- [ ] Backend authorization is not enforced on API routes yet.
- [ ] Manager and Admin are combined into one `manager_admin` role; the PDF describes separate Manager and Admin responsibilities.
- [ ] Most non-production dashboard actions use seeded or component state only.

## 1. Environment And Project Health

- [x] Confirm project requires PHP `^8.3` in `composer.json`.
- [x] Confirm frontend build script exists: `npm run build`.
- [x] Confirm Laravel test script exists: `composer test`.
- [x] Confirm feature API tests exist for login, app-data, harvest CRUD, production box CRUD, and audit creation.
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
- [ ] Add logout API/audit event.
- [ ] Add successful login audit event.
- [ ] Add failed login audit event.
- [ ] Add session/token based authentication instead of only client-side persisted user state.
- [ ] Protect API endpoints from unauthenticated access.
- [ ] Enforce role permissions on every API write action.
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

- [ ] Persist inventory dashboard actions through backend APIs. UI present.
- [ ] Load inventory items from database into the Inventory Bookkeeper dashboard.
- [ ] Display total inventory items from persisted data.
- [ ] Display low-stock item count from persisted data.
- [ ] Display out-of-stock item count from persisted data.
- [ ] Display recent stock-in transactions from persisted data.
- [ ] Display recent material releases from persisted data.
- [ ] Display pending credit transactions from persisted data.
- [ ] Display restock requests from persisted data.
- [ ] Auto-update dashboard after persisted stock-in.
- [ ] Auto-update dashboard after persisted release/stock-out.
- [ ] Auto-update dashboard after persisted credit transaction.
- [ ] Auto-update dashboard after persisted borrowed material return.
- [ ] Auto-update dashboard after persisted stock adjustment.

## 6. Inventory Items

- [ ] Add inventory item API.
- [ ] Update inventory item API.
- [ ] View inventory item detail API or reliable read mapping.
- [ ] Deactivate/delete inventory item API.
- [ ] Persist material ID.
- [ ] Persist material name.
- [ ] Persist category.
- [ ] Persist unit of measurement.
- [ ] Persist current quantity.
- [ ] Persist minimum stock level.
- [ ] Persist unit price.
- [ ] Persist supplier.
- [ ] Persist expiration date.
- [ ] Persist stock status or derive it consistently in backend.
- [ ] Persist date created and last updated.
- [ ] Record initial quantity as a stock-in transaction.
- [ ] Add backend search/filter/sort for inventory item list.
- [ ] Add backend audit records for inventory item create/update/deactivate.

## 7. Stock-In Transactions

- [ ] Add stock-in API.
- [ ] Select inventory item from persisted item list.
- [ ] Capture quantity added.
- [ ] Capture unit price.
- [ ] Compute total amount in backend.
- [ ] Capture supplier.
- [ ] Capture receipt/delivery/reference number.
- [ ] Capture date received.
- [ ] Capture expiration date.
- [ ] Capture remarks.
- [ ] Support supporting document upload/storage.
- [ ] Add quantity to inventory balance transactionally.
- [ ] Record stock-in in stock history.
- [ ] Add audit record for stock-in.
- [ ] Add tests for stock-in balance updates.

## 8. Material Release And Stock-Out

- [ ] Add material release API.
- [ ] Support Direct Release.
- [ ] Support Beneficiary Credit.
- [ ] Support Borrowed Material.
- [ ] Support Internal Use.
- [ ] Support Stock Adjustment.
- [ ] Require beneficiary for Beneficiary Credit.
- [ ] Capture quantity released.
- [ ] Capture unit price.
- [ ] Compute total amount in backend.
- [ ] Capture date released.
- [ ] Capture release slip number.
- [ ] Capture remarks/reason.
- [ ] Prevent release quantity greater than available stock.
- [ ] Deduct quantity from inventory balance transactionally.
- [ ] Record release in stock history.
- [ ] Add audit record for release.
- [ ] Add tests for stock-out balance updates and over-release prevention.

## 9. Beneficiary Material Credits

- [ ] Add material credit transaction table/model or confirm final schema.
- [ ] Add credit transaction API.
- [ ] Create credit automatically when release type is Beneficiary Credit.
- [ ] Link credit to beneficiary account.
- [ ] Track credit transaction ID.
- [ ] Track material, quantity, unit price, total amount, release slip, and release date.
- [ ] Track amount deducted through payroll.
- [ ] Compute remaining balance.
- [ ] Support Pending, Partially Deducted, and Fully Deducted statuses.
- [ ] Expose unpaid credits to Payroll Personnel workflow.
- [ ] Update credit balance/status after payroll deduction.
- [ ] Preserve credit history.
- [ ] Add tests for deduction and remaining balance behavior.

## 10. Borrowed Materials

- [ ] Add borrowed material table/model or confirm final schema.
- [ ] Add borrowed material API.
- [ ] Track borrower/beneficiary.
- [ ] Track material.
- [ ] Track quantity borrowed.
- [ ] Track date borrowed.
- [ ] Track expected return date.
- [ ] Track actual return date.
- [ ] Track quantity returned and remaining quantity.
- [ ] Support Borrowed, Partially Returned, Returned, and Overdue statuses.
- [ ] Add returned quantity back to available stock.
- [ ] Record return transaction in stock history.
- [ ] Add tests for partial/full returns.

## 11. Stock History And Adjustments

- [ ] Add stock history API.
- [ ] Prevent stock history editing/deletion at backend level.
- [ ] Track transaction ID.
- [ ] Track material name/ID.
- [ ] Track transaction type.
- [ ] Track quantity added and deducted.
- [ ] Track previous and updated balances.
- [ ] Track date/time.
- [ ] Track Inventory Bookkeeper account.
- [ ] Track reference number.
- [ ] Track remarks.
- [ ] Add stock adjustment API.
- [ ] Capture system quantity and corrected quantity.
- [ ] Compute adjustment difference.
- [ ] Support increase/decrease adjustment types.
- [ ] Require adjustment reason.
- [ ] Record adjustment in stock history and audit logs.

## 12. Restock Requests

- [ ] Add restock request create/update API.
- [ ] Add restock request review API for Manager approval/rejection.
- [ ] Track request ID.
- [ ] Track material name/ID.
- [ ] Track current quantity.
- [ ] Track minimum stock level.
- [ ] Track requested quantity.
- [ ] Track reason.
- [ ] Track requested by account.
- [ ] Track requested date.
- [ ] Support Pending, Approved, Rejected, and Completed statuses.
- [ ] Allow Inventory Bookkeeper edit while Pending.
- [ ] Lock request after Manager action.
- [ ] Ensure approval does not increase stock automatically.
- [ ] Add audit/history records for request, approval, rejection, and completion.

## 13. Payroll Personnel - Preparation

- [ ] Add payroll slip create/update/delete/submit APIs.
- [ ] Retrieve beneficiary production data from persisted production records.
- [ ] Retrieve unpaid beneficiary material credits from persisted credit records.
- [ ] Select beneficiary and payroll period.
- [ ] Display beneficiary name and ID.
- [ ] Display harvest date and production record ID.
- [ ] Display readonly production box quantities.
- [ ] Capture price per box for all product types.
- [ ] Compute product subtotals.
- [ ] Compute gross income.
- [ ] Display material credit deductions.
- [ ] Capture authorized/current deduction amount.
- [ ] Compute total deductions.
- [ ] Compute net income.
- [ ] Save payroll as Draft.
- [ ] Submit payroll as Ready/Submitted for Validation.
- [ ] Lock submitted payroll from editing.
- [ ] Allow edit after Returned for Correction.
- [ ] Generate payroll slip number in backend.
- [ ] Add payroll audit records for create, edit, submit, and resubmit.
- [ ] Add tests for payroll computation and status transitions.

## 14. Finance Officer - Validation

- [ ] Add validation queue API.
- [ ] Add validate payroll API.
- [ ] Add return-for-correction API.
- [ ] Load payroll slips from persisted payroll data instead of `SEED`.
- [ ] Show payroll slip number, beneficiary, period, harvest date, gross income, deductions, net income, prepared by, submitted date, status, and actions.
- [ ] Show complete payroll slip detail.
- [ ] Show production earnings breakdown.
- [ ] Show material credit deductions with previous deduction, current deduction, and remaining balance.
- [ ] Show final computation summary.
- [ ] Add validation checklist persistence if required.
- [ ] Require remarks/reason when returning payroll.
- [ ] Change status to Validated on validation.
- [ ] Record Finance Officer account and timestamp.
- [ ] Forward validated payroll to Manager approval queue.
- [ ] Preserve validation remarks and history.
- [ ] Prevent Finance Officer from editing production, credit, prices, gross income, deductions, or net income directly.
- [ ] Add tests for validation/return transitions.

## 15. Manager - Payroll Approval And Restock Review

- [ ] Split Manager workflow from Admin workflow if required.
- [ ] Add Manager payroll approval queue API.
- [ ] Add approve payroll API.
- [ ] Add return payroll API.
- [ ] Load approval queue from persisted validated payroll slips.
- [ ] Record Manager account and approval/return timestamp.
- [ ] Permanently lock approved payroll from editing.
- [ ] Save approval action in transaction history.
- [ ] Include approved payroll in reports.
- [ ] Require returned payroll to pass Finance validation again.
- [ ] Add Manager restock review API.
- [ ] Approve restock request and record Manager account/timestamp.
- [ ] Reject restock request with required remarks.
- [ ] Preserve restock request history.
- [ ] Prevent Manager from editing production records, inventory transactions, payroll computations, validation details, or audit records.
- [ ] Add tests for approval/return/reject transitions.

## 16. Admin - User Management And Audit

- [ ] Split Admin workflow from Manager workflow if required.
- [ ] Add user create API.
- [ ] Add user update API.
- [ ] Add activate/deactivate API.
- [ ] Store temporary password securely.
- [ ] Validate password confirmation.
- [ ] Preserve users after deactivation.
- [ ] Prevent permanent user deletion.
- [ ] Record Admin account, affected user, changed fields, date/time, and remarks.
- [ ] Add audit trail API with backend search/filter/sort.
- [ ] Prevent audit editing/deletion at backend level.
- [ ] Add administrative reports for users, roles, login history, account status, and audit records.
- [ ] Prevent Admin from editing operational records.
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
- [ ] Add/confirm schema for material credit transactions.
- [ ] Add/confirm schema for borrowed material records.
- [ ] Add/confirm schema for stock adjustments as first-class records or stock transaction subtype.
- [ ] Add/confirm schema for validation history records.
- [ ] Add indexes for high-use filters: dates, statuses, beneficiary IDs, material IDs, role/status.
- [ ] Replace direct `DB::table` logic with models/services where workflow complexity grows.
- [ ] Add transaction handling for multi-table writes.
- [ ] Add API endpoints for all non-production workflows.
- [ ] Add Laravel policies/middleware for role restrictions.

## 19. Priority Build Order

- [ ] 1. Lock down authentication, sessions/tokens, API auth middleware, and role authorization.
- [ ] 2. Normalize roles: decide whether Manager and Admin stay combined or split.
- [ ] 3. Finish persisted inventory item, stock-in, stock-out, stock history, and restock APIs.
- [ ] 4. Finish persisted material credit and borrowed material workflows.
- [ ] 5. Finish persisted payroll slip preparation and deduction computation.
- [ ] 6. Finish Finance validation workflow with history.
- [ ] 7. Finish Manager approval and restock review workflow.
- [ ] 8. Finish Admin user-management APIs and audit monitoring.
- [ ] 9. Replace remaining seeded/in-memory dashboard data with API-backed data.
- [ ] 10. Add reports/documents and exports.
- [ ] 11. Add end-to-end and workflow transition tests.
