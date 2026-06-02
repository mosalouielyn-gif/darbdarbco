# Manager / Admin Interface UI Design Specification

## DARBCO Integrated Farm System

The **Manager / Admin interface** should be designed as a clean, modern, and professional dashboard for reviewing operations, approving transactions, monitoring records, viewing reports, and managing system access.

The design should closely follow the provided reference images. Use a **white content area**, a **dark green sidebar**, rounded cards, light gray borders, soft shadows, and green accent colors for important actions.

The layout must be simple, organized, and easy to navigate because the Manager / Admin will mainly review and approve records submitted by other users.

---

# 1. Overall Page Layout

The interface should use a **two-column dashboard layout**:

### Left Side

A fixed vertical sidebar for navigation.

### Right Side

A large content area where the selected page or module will appear.

The content area should have a very light gray or off-white background. Each section should be placed inside a white card with rounded corners and subtle borders.

Use enough spacing between cards so the interface does not look crowded.

---

# 2. Left Sidebar Navigation

The sidebar should appear on the left side of the screen and remain visible while the user navigates through the system.

Use a dark green background.

At the top of the sidebar, display the organization name:

**DARBCO**

Below the organization name, display a role selector or role label:

**Manager / Admin**

Add a small dropdown arrow beside the role label.

The sidebar should contain the following navigation items:

1. **Dashboard**
2. **Payroll Approvals**
3. **Restock Requests**
4. **Operations Monitor**
5. **Reports**
6. **Audit History**
7. **User Management**
8. **Settings / Role Access**

Each menu item should include a small icon on the left side.

The currently selected menu item should have:

* A lighter green background
* White text
* Rounded corners
* A clear active-state appearance

At the bottom of the sidebar, display the logged-in user information:

* User avatar or initials
* **Manager Admin**
* User email address
* A small dropdown arrow

---

# 3. Dashboard Page

The Dashboard page should serve as the Manager / Admin’s overview page.

At the top of the page, show:

**Dashboard**

Below the title, include a short greeting and description:

**Welcome back, Manager Admin**
**Overview of farm operations and approval queue**

---

## 3.1 Summary Cards

Display five summary cards in one row.

Each card should include:

* A small icon inside a colored circular or rounded-square background
* A large number
* A short label
* A small supporting note below the number

### Card 1: Pending Payroll Approvals

Display:

**12**
**Pending Payroll Approvals**
**₱48,560.00**

Use an orange or warm accent color.

This card should be clickable and redirect the user to the **Payroll Approvals** page.

---

### Card 2: Pending Restock Requests

Display:

**8**
**Pending Restock Requests**
**₱12,340.00**

Use an orange warning icon.

This card should be clickable and redirect the user to the **Restock Requests** page.

---

### Card 3: Production Today

Display:

**14**
**Production Today**
**Boxes**
**↑ 10% vs yesterday**

Use a green accent color.

This card is for quick production monitoring.

---

### Card 4: Low Stock Alerts

Display:

**5**
**Low Stock Alerts**
**Needs attention**

Use an orange warning icon.

This card may redirect the user to the inventory or restock monitoring page.

---

### Card 5: Approved This Week

Display:

**26**
**Approved This Week**
**Transactions**
**All modules**

Use a green accent color.

---

## 3.2 Payroll Approval Queue

Below the summary cards, display a white card titled:

**Payroll Approval Queue**

Place a **View All** button at the upper-right corner of the card.

The table should contain the following columns:

| Column               | Description                       |
| -------------------- | --------------------------------- |
| Beneficiary / Worker | Name of the beneficiary or worker |
| Period               | Payroll week or date period       |
| Gross Pay            | Total earnings before deductions  |
| Deductions           | Total deductions                  |
| Net Pay              | Final payroll amount              |
| Validated By         | User who validated the payroll    |
| Action               | Review button                     |

Each row should contain a green **Review** button under the Action column.

The Manager should be able to click **Review** to open the complete payroll details.

At the bottom of the card, add a note:

**Note: Payroll records are validated by the Finance Officer before Manager approval.**

---

## 3.3 Restock Request Queue

Beside the Payroll Approval Queue, display another white card titled:

**Restock Request Queue**

Place a **View All** button at the upper-right corner.

The table should contain:

| Column        | Description                    |
| ------------- | ------------------------------ |
| Item          | Material or supply name        |
| Requested Qty | Quantity requested             |
| Requested By  | User who submitted the request |
| Status        | Request status                 |

Use status badges such as:

* **Pending Review** – orange badge
* **Approved** – green badge
* **Returned** – red badge

---

## 3.4 Monthly Production Chart

Below the approval queues, display a chart card titled:

**Monthly Production (Boxes)**

Use a line chart showing the number of boxes produced throughout the month.

The chart should have:

* Date labels on the horizontal axis
* Box count on the vertical axis
* Green line
* Small data points
* A compact summary badge showing the current value

---

## 3.5 Payroll Approvals Chart

Beside the production chart, display a card titled:

**Payroll Approvals (This Month)**

Use a donut chart showing the number of:

* Approved payrolls
* Pending payrolls
* Returned payrolls

Display the total count at the center of the donut chart.

Example:

**40**
**Total**

Use separate colors for each status:

* Green for Approved
* Orange for Pending
* Red for Returned

---

## 3.6 Recent Activity

Display a card titled:

**Recent Activity**

The card should show a vertical timeline of recent system activities.

Each timeline item should include:

* A small green dot
* Description of the activity
* Date and time

Example activities:

* Payroll for SALUDEZ LOUI validated by Finance Officer
* Restock request for Pesticide submitted
* Payroll approved by Manager Admin

At the lower-right corner of the card, include:

**View full audit history →**

This should redirect the user to the Audit History page.

---

# 4. Payroll Approvals Page

The page title should be:

**Payroll Approvals**

Below the title, display a short explanation:

**Validated by Finance Officer. Awaiting Manager approval.**

The table should contain:

| Column               | Description                       |
| -------------------- | --------------------------------- |
| Beneficiary / Worker | Name of the beneficiary or worker |
| Date                 | Payroll record date               |
| Week / Period        | Payroll week or payroll period    |
| Gross Pay            | Total earnings before deductions  |
| Deductions           | Total deduction amount            |
| Net Pay              | Final payroll amount              |
| Validation           | Validation status                 |
| Manager Action       | Available Manager actions         |

Use a green **Validated** badge under the Validation column.

Under the Manager Action column, include three buttons:

### Approve

* Green button
* Finalizes the payroll record
* Changes the status to Approved

### Return

* Orange or outlined button
* Returns the payroll record for correction
* Opens a small modal where the Manager can enter the reason for returning the record

### View Slip

* Gray outlined button
* Opens the detailed payroll slip
* Allows the Manager to review all computations before approving or returning the record

At the bottom of the table, add:

**View All Payrolls →**

---

# 5. Restock Requests Page

The page title should be:

**Restock Requests**

The table should display:

| Column        | Description                                     |
| ------------- | ----------------------------------------------- |
| Item          | Material or supply name                         |
| Category      | Inventory category                              |
| Current Stock | Current available quantity                      |
| Reorder Point | Minimum stock level before restocking is needed |
| Requested Qty | Quantity requested for replenishment            |
| Requested By  | User who submitted the request                  |
| Date          | Request submission date                         |
| Status        | Current request status                          |
| Action        | Manager action buttons                          |

Use status badges:

* **Pending Review** – orange
* **Approved** – green
* **Returned** – red

Under the Action column, include:

### Approve Icon

A green check button.

### Return Icon

An orange return-arrow button.

### View Icon

A gray eye icon.

Clicking the eye icon should open the complete request details.

Clicking the return icon should open a small modal where the Manager can enter the reason for returning the request.

---

# 6. Operations Monitor Page

The page title should be:

**Operations Monitor**

This page should show a quick summary of production, inventory, and payroll operations.

---

## 6.1 Monitoring Cards

Display three cards in one row.

### Production Today

Display:

**14**
**Boxes Reported**
**↑ 18% vs yesterday**

Use a green icon.

### Inventory Alerts

Display:

**5**
**Low Stock Items**
**Needs restock**

Use an orange warning icon.

### Payroll Status

Display:

**12**
**Pending Approvals**
**₱48,560.00**

Use a green payroll icon.

---

## 6.2 Daily Harvest Trend

Below the summary cards, display a bar chart titled:

**Daily Harvest Trend (Last 7 Days)**

Use vertical green bars showing the production output for the past seven days.

Display date labels at the bottom of the chart.

---

## 6.3 Top Workers

Beside the chart, display a card titled:

**Top Workers (This Month)**

Show the ranked list of workers and their recorded output.

Example format:

| Rank | Worker       | Output   |
| ---- | ------------ | -------- |
| 1    | SALUDEZ LOUI | 42 boxes |
| 2    | Yatal        | 28 boxes |
| 3    | Mona         | 16 boxes |

At the bottom of the card, add:

**View Full Monitor →**

---

# 7. Reports Page

The page title should be:

**Reports**

At the top of the page, include two dropdown filters:

### Date Range Filter

Example default value:

**This Month**

### Module Filter

Example default value:

**All Modules**

Below the filters, display four report cards.

Each card should include:

* Icon
* Report title
* Short description
* **View Report →** link

---

## 7.1 Production Report

Title:

**Production Report**

Description:

**Summary of harvest and boxes**

Clicking **View Report** should open production summaries and detailed production records.

---

## 7.2 Inventory Report

Title:

**Inventory Report**

Description:

**Stock levels and movements**

Clicking **View Report** should open inventory availability, stock history, released materials, and restock records.

---

## 7.3 Payroll Report

Title:

**Payroll Report**

Description:

**Payroll summaries and trends**

Clicking **View Report** should open payroll summaries, approval statuses, and payroll trends.

---

## 7.4 Financial Summary

Title:

**Financial Summary**

Description:

**Income, expenses, overview**

Clicking **View Report** should open financial summaries related to payroll, materials, and other recorded expenses.

---

# 8. Audit History Page

The page title should be:

**Audit History**

This page should record important user actions across the system.

At the upper-right area, add the following filters:

* **All Modules**
* **All Actions**
* **Filter** button

The table should contain:

| Column      | Description                   |
| ----------- | ----------------------------- |
| Timestamp   | Date and time of the activity |
| User        | User who performed the action |
| Action      | Type of activity              |
| Module      | System module involved        |
| Description | Detailed activity description |
| Status      | Activity status               |

Example actions:

* Validated
* Submitted
* Approved
* Returned

Use status badges:

* **Completed** – green badge
* **Returned** – red badge

The Audit History should record activities such as:

* Payroll validation
* Payroll approval
* Returned payroll records
* Restock request submission
* Restock request approval
* Returned restock requests
* User account updates
* Role permission changes

---

# 9. User Management Page

The page title should be:

**User Management**

At the upper-right corner, include a green button:

**+ Add User**

The table should contain:

| Column     | Description                     |
| ---------- | ------------------------------- |
| User       | User name                       |
| Role       | Assigned system role            |
| Status     | User account status             |
| Last Login | Most recent login date and time |
| Action     | View account details            |

The default users may include:

* Manager Admin
* Finance Officer
* Payroll Personnel
* Bookkeeper
* Production Clerk

Use a green **Active** badge under the Status column.

Under the Action column, include an eye icon.

Clicking the eye icon should open the selected user’s profile and account details.

The **+ Add User** button should open a form where the Manager can enter:

* Full name
* Email address
* Username
* Password
* Assigned role
* Account status

---

# 10. Settings / Role Access Page

The page title should be:

**Settings / Role Access**

This page should allow the Manager / Admin to review system permissions for each role.

At the left side of the page, include a Role dropdown.

Example:

**Manager / Admin**

Beside the Role dropdown, display a **Role Description** card.

For the Manager / Admin role, display:

**Full oversight and approval access across all entities.**

Include a checklist of permissions:

* Review and approve payroll
* Approve or return restock requests
* View all reports and monitoring dashboards
* Manage users and role access
* View audit logs and system activity

---

## 10.1 Permission Matrix

Display a horizontal permission matrix.

Each permission should appear inside a separate card with:

* Permission label
* Green check icon
* **Allowed** status

For the Manager / Admin role, include:

| Permission        | Status  |
| ----------------- | ------- |
| Dashboard (View)  | Allowed |
| Payroll (Approve) | Allowed |
| Restock (Approve) | Allowed |
| Production (View) | Allowed |
| Inventory (View)  | Allowed |
| Reports (View)    | Allowed |
| Audit Logs (View) | Allowed |
| User Management   | Allowed |
| Role Access       | Allowed |
| System Settings   | Allowed |

Use green check icons and green **Allowed** text.

---

# 11. Operational Roles Overview

At the bottom of the Settings / Role Access page, include a section titled:

**Operational Roles Overview**

Below the title, display:

**Operational roles encode and validate data. Manager/Admin reviews and approves.**

Show four role cards:

### Production Clerk

**Encode Production**

### Payroll Personnel

**Encode Payroll**

### Finance Officer

**Validate Payroll**

### Bookkeeper

**Financial Records**

Each card should include:

* Small icon
* Role name
* Short role description

---

# 12. Interaction Rules

The system should follow a clear approval workflow.

### Payroll Workflow

1. Payroll Personnel prepares the payroll record.
2. Finance Officer reviews and validates the payroll record.
3. Manager / Admin reviews the validated payroll slip.
4. Manager / Admin either approves or returns the payroll record.
5. Returned records must include a reason for correction.
6. Every action must be recorded in Audit History.

### Restock Workflow

1. A restock request is submitted when an inventory item is low in stock.
2. Manager / Admin reviews the request.
3. Manager / Admin either approves or returns the request.
4. Returned requests must include a reason.
5. Every action must be recorded in Audit History.

---

# 13. Visual Style Guide

Use the following visual design style:

### Colors

* Dark green for the sidebar
* Medium green for buttons and approved statuses
* Light green for cards and active indicators
* Orange for pending statuses and warning alerts
* Red for returned records and errors
* Light gray for borders
* White for the main content cards
* Off-white or very light gray for the page background

### Cards

* White background
* Rounded corners
* Thin light-gray border
* Soft shadow
* Consistent internal padding

### Buttons

* Green filled buttons for positive actions such as Approve, Save, and Add User
* Orange outlined buttons for Return actions
* Gray outlined buttons for View actions
* Rounded corners
* Clear hover effect

### Tables

* White background
* Light gray table headers
* Thin dividers between rows
* Proper spacing
* Status badges with rounded edges
* Action buttons aligned horizontally

### Typography

Use a simple and readable font.

Suggested font styles:

* Bold titles for page headings
* Medium-weight labels for table headers
* Regular text for descriptions
* Smaller muted-gray text for secondary information

---

# 14. Responsive Behavior

For desktop screens, display the full sidebar and arrange dashboard cards horizontally.

For smaller screens:

* Convert the sidebar into a collapsible menu
* Stack summary cards vertically or in two-column rows
* Allow tables to scroll horizontally
* Keep action buttons visible and easy to tap
* Maintain readable spacing between fields

The final design should remain clean, professional, and easy to use on different screen sizes.

---

# Final Design Goal

The Manager / Admin interface should provide a clear overview of DARBCO operations without allowing unnecessary record editing.

The Manager / Admin should mainly:

* Monitor production
* Review validated payroll slips
* Approve or return payroll records
* Approve or return restock requests
* View reports
* Review audit history
* Manage user accounts
* Review role permissions

The final interface should closely follow the structure, visual hierarchy, and card-based layout shown in the reference images.
