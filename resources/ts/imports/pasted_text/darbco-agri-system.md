Act as a Principal Full-Stack Architect and Senior UI/UX Engineer. Your task is to generate the complete code, database migrations, and responsive Tailwind CSS user interfaces for a web-based agricultural workflow management and financial processing system tailored for the DARBCO banana cooperative in Panabo City, Davao del Norte.

### Global Architectural Specs
1. Stack Requirement: Modern single-page application dashboard layout with a collapsible sidebar navigation, role switcher switcher (for development), and multi-tenant authorization guards.
2. Styling & Theme: Clean typography, high scannability, dense tabular data matrices, and stateful semantic badge color schemes (Green for Validated/Approved, Amber for Pending/Low Stock, Red for Defects/Rejects/Returned).
3. Security Constraints: Read/Write rules must be strictly separated across 5 roles. Financial elements are read-only for operational personnel, and operational entry fields are read-only for management.

---

## ROLE 1: PRODUCTION CLERK DASHBOARD UI & ENGINE
Purpose: High-speed, manual-error-reducing entry engine for tracking weekly harvest deliveries and packaging line outputs.

### UI Component Sections
1. Metrics Row (KPI Cards):
   - Total Bunches (Buligs) Encoded Today
   - Total Box Output (Today vs Weekly Goal)
   - Rejection Rate Index (%)
2. Module A: Harvest Inflow Logging Form
   - Input Fields: Unique Production Record ID (automatic tracking), Harvest Date picker, Beneficiary Selection Dropdown (representing the 156 cooperative members), and Harvester Name input.
   - Age/Maturity Matrix Fields: Parallel numerical counter inputs to break down harvested buligs by age: [11 Weeks], [12 Weeks], [13 Weeks], and [14 Weeks] old.
3. Module B: Post-Processing Packout Form
   - Class A Box Layout: Quantities for Big Hands, Small Hands, and Cluster Packs (CPs).
   - Class B Box Layout: Quantities for Big Hands, Small Hands, and Cluster Packs (CPs).
   - Special Product Box Layout: Quantitative tally field for non-standard export orders.
4. Module C: Quality Control Tracking Widget
   - Interactive data counters for [Defects] (processing line damages) and [Rejects] (failing export quality standards).
   - Constraint: Every recorded defect or reject must be explicitly mapped via dropdown to its source harvest maturity age (11W, 12W, 13W, or 14W) to run statistical quality monitoring.
5. Recent Logs Data Table: Shows Time Encoded, Clerk User ID, Beneficiary Name, Total Box Output, and Record Status (Draft / Submitted).

---

## ROLE 2: INVENTORY BOOKKEEPER DASHBOARD UI & ENGINE
Purpose: Real-time warehouse ledger control, asset tracking, and material credit transaction routing linked directly to the payroll pipeline.

### UI Component Sections
1. Inventory Alerts Header:
   - Sticky real-time notification alerts highlighting items categorized as "Low-Stock" or "Out-of-Stock" against pre-defined reorder levels.
   - Expiration Monitoring Countdown Trackers for volatile bio-chemical items.
2. Tabbed Inventory Grid Framework: Filterable sub-grids split across specialized tabs:
   - [Fertilizers and Soil Inputs][cite: 1]
   - [Chemicals and Crop Protection Materials][cite: 1]
   - [Farm Materials (Field tools/supplies)][cite: 1]
   - [Packaging Materials (Bags, labels, box sets)][cite: 1]
   - [Protective Equipment (PPE)][cite: 1]
   - [Other Supplies][cite: 1]
3. Stock Columns Layout: Material ID, Item Name, Category, Brand/Description, Quantity on Hand, Unit of Measurement, Reorder Level, and Unit Cost[cite: 1].
4. Interactive Material Issuance Ledger Form:
   - Input Fields: Beneficiary Selection Dropdown, Material Selector, Quantity Issued, Date Released, Release Slip / Receipt Number, and Supplier Data[cite: 1].
   - Transaction Type Radio Group: [Direct Release], [Borrowed], or [Credit][cite: 1].
   - Logic Condition: Selecting "Credit" must compute the total monetary charge ($ Quantity \times Unit Cost $) and automatically bind this amount to the Beneficiary's unique account ID as an unresolved payroll deduction trigger[cite: 1].

---

## ROLE 3: PAYROLL PERSONNEL DASHBOARD UI & ENGINE
Purpose: Dual-track processing pipeline separating independent Beneficiary box-earnings from hourly/daily Worker service compensation[cite: 1].

### UI Component Sections
1. Primary Workspace Dual-Tab Switch: [Beneficiary Payroll Pipeline] | [Worker Payroll Pipeline][cite: 1].
2. Pipeline A: Beneficiary Payroll Workstation
   - Target Queue: Pulls verified, un-computed production outputs from the database[cite: 1].
   - Earnings Formula Engine Layout: Calculates Subtotals dynamically: $\text{Class A Box count} \times \text{Price A}$, $\text{Class B Box count} \times \text{Price B}$, and $\text{Special Product count} \times \text{Price Special}$ to produce Gross Income[cite: 1].
   - Live Deductions Drawer: Fetches active credit records from the Inventory Bookkeeper, shows previous unpaid balances, applies other authorized deductions, and displays final Net Income[cite: 1].
   - Action Trigger: "Submit for Financial Validation" status button[cite: 1].
3. Pipeline B: Worker Payroll Workstation
   - Input Interface: Worker ID, Name, Role Dropdown (Harvester, Packer, Sorter), Target Production Batch/Beneficiary Handled, Date of Work, Number of Workdays/Boxes processed, and Labor Rate[cite: 1].
   - Automatic calculations for Worker Gross Pay, applicable deductions, and Worker Net Pay[cite: 1].
4. Status & Tracking Columns: Payroll Slip Number, Creation Date, Verification Status, and Approval Status badges[cite: 1].

---

## ROLE 4: FINANCE OFFICER DASHBOARD UI & ENGINE
Purpose: Interactive audit and multi-point cross-referencing ledger engine to clear payroll data packages for management release[cite: 1].

### UI Component Sections
1. Pending Review Validation Queue: List view highlighting incoming payroll records submitted by Payroll Personnel[cite: 1].
2. Side-by-Side Split Audit Sandbox Interface:
   - Left Sidebar Panel: Full detailed digital invoice slip showing Gross Earnings, itemized Deductions, and calculated Net Income[cite: 1].
   - Right Main Panel (Interactive Checklist Framework):
     - [ ] Production Records Check: Live-query the matching Production Clerk records (box totals, harvest dates)[cite: 1].
     - [ ] Product Classification Check: Verify box tier breakdowns[cite: 1].
     - [ ] Price Computation Check: Verify math constraints and current contract prices[cite: 1].
     - [ ] Material Deductions Check: Cross-reference physical release slips from the Inventory Bookkeeper's ledger[cite: 1].
     - [ ] Labor Costs Check: Confirm worker/harvester payout allocations are accurately processed[cite: 1].
3. Action Interface Panel:
   - Action Button A (Green): "Mark as Validated & Forward to Manager"[cite: 1].
   - Action Button B (Red): "Return for Correction". Triggering this action must show a mandatory input text field labeled "Reason for Discrepancy / Return Log History" before updating the record status[cite: 1].

---

## ROLE 5: MANAGER & ADMIN COMBINED SYSTEM WORKSPACE
Purpose: High-level executive transaction execution, system configuration control, role assignment, and immutable compliance audit tracing[cite: 1].

### UI Component Sections
1. Primary Profile Toggles: Switch seamlessly between [Manager Operational View] and [Admin System Control View][cite: 1].
2. Manager Operational View Components:
   - Executive Dashboard Overview: Real-time visual metrics showing production volume trends, payroll outlays, inventory levels, and outstanding credit balances[cite: 1].
   - Pending Approvals Queue 1: Financial-validated payroll files awaiting single-click "Approve and Release Payment" commands[cite: 1].
   - Pending Approvals Queue 2: Inventory replenishment requests compiled by the Bookkeeper for low-stock items[cite: 1].
   - Security Override Rule: All operational entry inputs and numbers are strictly READ-ONLY within this dashboard view to ensure data integrity[cite: 1].
3. Admin System Control View Components:
   - Account Management Panel: User Account Creation Wizard, Role Allocation Dropdowns (Clerk, Bookkeeper, Payroll, Finance, Manager), and User Deactivation Toggles[cite: 1].
   - Central Cryptographic Audit Trail Ledger: A dense, filterable table charting every action executed inside the system[cite: 1].
   - Audit Grid Structure: Timestamp, User Account ID, Assigned Role, Action Category (Created, Updated, Submitted, Validated, Returned, Approved), Affected Record Target ID, and Change Snippet Delta log[cite: 1].
   - Administrative Constraint: Direct data erasure commands are disabled to safeguard historical transaction visibility[cite: 1].

---

Implement this complete role-restricted ecosystem using modular frontend layouts, reactive state handlers, and robust validation structures mapping to the transaction flow sequence[cite: 1].