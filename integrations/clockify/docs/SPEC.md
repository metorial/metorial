Let me get more details on the specific webhook events and the full API feature set.Now I have comprehensive information from the official API documentation. Let me compile the specification.

# Slates Specification for Clockify

## Overview

Clockify is a time tracking and timesheet application for teams, developed by CAKE.com. It allows users to track work hours on projects, manage workspaces, generate reports, handle invoicing, and manage time off. The API is available on all subscription plans, though some features are restricted to paid plans.

## Authentication

Clockify supports **API Key** authentication. There is no OAuth2 flow.

**API Key Authentication:**

- Generate an API key from your Clockify Profile Settings (Advanced tab > Manage API keys).
- Include the key in the `X-Api-Key` request header on every API call.
- Example: `X-Api-Key: your-api-key`
- If your workspace is on a subdomain (e.g., `subdomain.clockify.me`), you must generate a separate API key specifically for that workspace.
- Once generated, the key is shown only once and must be stored securely. Generating a new key deactivates the previous one.

**Addon Token Authentication (for marketplace add-ons):**

- Marketplace add-ons use the `X-Addon-Token` header instead of `X-Api-Key`.
- This is relevant only for developers building add-ons for the CAKE.com Marketplace.

**Base API URLs:**

- Global: `https://api.clockify.me/api/v1/`
- Reports: `https://reports.api.clockify.me/v1/`
- Regional prefixes vary by data region: `euc1` (EU/Germany), `use2` (USA), `euw2` (UK), `apse2` (AU). For example, EU endpoint: `https://euc1.clockify.me/api/v1/`

API actions follow the same permission model as the Clockify UI — the authenticated user can only perform actions allowed by their role and access level.

## Features

### Time Tracking

Create, update, delete, and retrieve time entries for yourself or other users. Supports starting/stopping timers, manual time entry, setting billable status, assigning entries to projects and tasks, adding tags, and attaching custom field values. Entries can be duplicated and bulk-edited. Time entries can be marked as invoiced.

- Creating time entries for other users is a paid feature.
- Entries can be of type REGULAR or BREAK.

### Project Management

Create, update, archive, and delete projects within a workspace. Projects support billable/non-billable status, client assignment, color coding, public/private visibility, team memberships with individual hourly and cost rates, and time/budget estimates with optional recurring resets. Projects can be created from templates.

- Active projects must be archived before deletion.
- Budget and time estimates can be configured as manual or auto-calculated.

### Task Management

Create, update, and delete tasks within projects. Tasks can have assignees (individual users or user groups), time and budget estimates, billable status, and custom hourly/cost rates.

### Client Management

Create, update, delete, and list clients on a workspace. Clients can have email, address, notes, and currency settings.

### Tag Management

Create, update, delete, and list tags. Tags can be archived and are used to categorize time entries.

### Workspace Management

Create workspaces, retrieve workspace info, configure workspace-level settings (time tracking mode, required fields, billing defaults, locking rules, permissions), and manage workspace members. Supports setting workspace-level cost rates and billable rates. Users can be added or deactivated.

- Adding users to a workspace requires a paid subscription.

### User Management

Retrieve and update user profiles, manage user roles (workspace admin, team manager, project manager), set custom field values on users, configure work capacity and working days. Users can be filtered by status, email, name, project access, and role.

### User Groups

Create, update, and delete user groups. Add and remove users from groups. Groups can be used for project membership and scheduling assignments.

### Invoicing

Create, update, delete, duplicate, and export invoices. Manage invoice items, import time entries and expenses into invoices, record payments, and change invoice status (unsent, sent, paid, partially paid, void, overdue). Invoice settings can be customized including labels, tax configuration, and default values.

### Expense Tracking

Create, update, delete, and retrieve expenses. Manage expense categories (with optional unit pricing). Expenses support file attachments (receipts), project/task assignment, billable status, and notes.

### Time Off & PTO

Create and manage time off policies with configurable accrual rules, approval workflows, half-day support, and negative balance settings. Submit, approve, reject, and withdraw time off requests. View and update user balances per policy.

### Holidays

Create, update, and delete holidays for a workspace. Holidays can be assigned to specific users or groups, set to recur annually, and optionally auto-create time entries.

### Scheduling

Create, update, delete, and publish scheduled assignments. Supports recurring assignments with configurable repeat intervals. View user capacity and assignment totals per project or user. Assignments can be copied between users.

### Approval Workflows

Submit, re-submit, and manage approval requests for time entries and expenses. Approvals support weekly, semi-monthly, and monthly periods. Requests can be approved, rejected, or withdrawn.

### Reports

Generate detailed, summary, weekly, attendance, and expense reports via a dedicated Reports API. Reports support extensive filtering by date range, projects, clients, users, user groups, tags, tasks, custom fields, billable status, approval state, and invoicing state. Reports can be exported as JSON, PDF, CSV, or XLSX. Shared reports can be created, updated, and shared with specific users or groups.

- Free plan report data is limited to a one-year interval.

### Custom Fields

Create, update, and delete custom fields at the workspace and project levels. Custom fields support types: text, number, single/multiple dropdown, checkbox, and link. Fields can be set as required, admin-only editable, and can have default values per workspace or project.

### Audit Log

Generate audit log reports to track actions performed on the workspace (e.g., time entry creation, project changes, client updates). Logs can be filtered by action type, author, and date range.

## Events

Clockify supports webhooks for receiving real-time notifications when events occur in a workspace. Webhooks are created per workspace and require a name, endpoint URL, trigger event type, and trigger source. Each webhook generates a verification token included in the request header for authenticity validation. Clockify retries failed webhook deliveries up to 4 times over 72 hours.

- Webhook creation is available to workspace admins (up to 10 per admin, 100 per workspace total).
- Some webhook event types may require a paid subscription.
- Each webhook subscribes to a single event type and can be scoped to specific trigger sources (by project ID, user ID, tag ID, task ID, workspace ID, assignment ID, or expense ID).

### Time Entry Events

Notifications for time entry lifecycle changes.

- Events: `NEW_TIME_ENTRY`, `NEW_TIMER_STARTED`, `TIMER_STOPPED`, `TIME_ENTRY_UPDATED`, `TIME_ENTRY_DELETED`, `TIME_ENTRY_SPLIT`, `TIME_ENTRY_RESTORED`

### Project Events

Notifications for project lifecycle changes.

- Events: `NEW_PROJECT`, `PROJECT_UPDATED`, `PROJECT_DELETED`

### Task Events

Notifications for task lifecycle changes.

- Events: `NEW_TASK`, `TASK_UPDATED`, `TASK_DELETED`

### Client Events

Notifications for client lifecycle changes.

- Events: `NEW_CLIENT`, `CLIENT_UPDATED`, `CLIENT_DELETED`

### Tag Events

Notifications for tag lifecycle changes.

- Events: `NEW_TAG`, `TAG_UPDATED`, `TAG_DELETED`

### User/Workspace Membership Events

Notifications for user-related workspace changes.

- Events: `USER_JOINED_WORKSPACE`, `USER_DELETED_FROM_WORKSPACE`, `USER_ACTIVATED_ON_WORKSPACE`, `USER_DEACTIVATED_ON_WORKSPACE`, `USER_EMAIL_CHANGED`, `USER_UPDATED`, `USERS_INVITED_TO_WORKSPACE`, `LIMITED_USERS_ADDED_TO_WORKSPACE`

### User Group Events

Notifications for user group changes.

- Events: `USER_GROUP_CREATED`, `USER_GROUP_UPDATED`, `USER_GROUP_DELETED`

### Invoice Events

Notifications for invoice changes.

- Events: `NEW_INVOICE`, `INVOICE_UPDATED`

### Approval Events

Notifications for approval workflow changes.

- Events: `NEW_APPROVAL_REQUEST`, `APPROVAL_REQUEST_STATUS_UPDATED`

### Time Off Events

Notifications for time off request changes.

- Events: `TIME_OFF_REQUESTED`, `TIME_OFF_REQUEST_UPDATED`, `TIME_OFF_REQUEST_APPROVED`, `TIME_OFF_REQUEST_REJECTED`, `TIME_OFF_REQUEST_WITHDRAWN`, `BALANCE_UPDATED`

### Expense Events

Notifications for expense changes.

- Events: `EXPENSE_CREATED`, `EXPENSE_UPDATED`, `EXPENSE_DELETED`, `EXPENSE_RESTORED`

### Scheduling Events

Notifications for assignment changes.

- Events: `ASSIGNMENT_CREATED`, `ASSIGNMENT_UPDATED`, `ASSIGNMENT_DELETED`, `ASSIGNMENT_PUBLISHED`

### Rate Events

Notifications for rate changes.

- Events: `COST_RATE_UPDATED`, `BILLABLE_RATE_UPDATED`
