Now let me check the Everhour API documentation more closely and look for webhook details:Now I have comprehensive data from the official API documentation. Let me compile the specification.

# Slates Specification for Everhour

## Overview

Everhour is a time tracking software that provides project time tracking, budgeting, resource planning, expense tracking, invoicing, and reporting. It integrates natively with project management tools like Asana, Jira, ClickUp, Monday, and Trello, and also works as a standalone solution. API access requires a paid plan.

## Authentication

The Everhour API requires API Key authentication via the `X-Api-Key` header.

- **Method:** API Key (token-based authentication)
- **Base URL:** `https://api.everhour.com`
- **Header:** All requests must include the `X-Api-Key` header with a valid API key.
- **Obtaining the key:** Sign in to Everhour, click Settings in the left menu, click My Profile, and copy your API Token under the "Application Access" section.
- **Example header:** `X-Api-Key: abcd-efgh-1234567-7890ab-cdefgh12`
- **API Versioning:** Optionally, you can specify the API version via the `X-Accept-Version` header (e.g., `X-Accept-Version: 1.2`). If omitted, the most recent version is used.

There is no OAuth2 support — only personal API key authentication is available.

## Features

### Client Management

Manage clients associated with your account. Create, update, retrieve, and delete clients. Assign projects to clients, set business details, and configure client-level budgets (by money or time, with recurring or one-time periods).

### Project Management

Create and manage both internal projects (native to Everhour) and external projects (synced from integrations like Asana, Jira, etc.). Projects can be configured as board or list type. You can archive/unarchive projects, assign users, and manage project sections (columns). Projects can be filtered by integration platform.

### Project Billing & Budgets

Configure project billing as non-billable, hourly, or fixed-fee. Set budgets in money or time with optional recurring periods (monthly, weekly, daily). Supports project-level flat rates, per-user rates, or user cost rates with overrides. Budget thresholds and overbudget prevention can be configured.

### Task Management

Create, update, delete, and search tasks within projects. Tasks belong to sections and support labels, descriptions, due dates, positions, and open/closed status. Task estimates can be set as overall or per-user.

### Custom Fields

Define custom fields on projects for tasks. Supported field types include number, text, select (dropdown with up to 10 options), and date. Fields can have formatting options like currency, percentage, or labels. Fields can be reordered within a project.

### Time Tracking

Log time records against tasks manually or retrieve existing records. Time records can be queried for the whole team, per user, per task, or per project, with date range filtering. Each record includes time in seconds, user, date, task, and optional comments. Records have locked and invoiced status indicators.

- Billing data (rates and amounts) can optionally be included via a query parameter; only accessible to admins with billing permissions.

### Timers

Start, stop, and monitor real-time timers for tasks. You can get the currently running timer for the authenticated user, or view all active timers across the team.

### Timecards (Clock In/Out)

Manage attendance tracking via timecards. Clock in/out users, view timecards by user or date range, and update clock-in/out times and break durations. Timecards include edit history tracking.

### Timesheets & Approvals

Retrieve weekly timesheets for individual users or the entire team. Timesheets bundle tasks, daily time totals, time records, timecards, and time-off assignments for a given week. Supports an approval workflow: users can submit timesheets for approval, reviewers can approve or reject them (including per-day granularity), and users can discard their own requests.

### Expenses

Track project-related expenses with categories. Expenses support amount, quantity, billable/non-billable flags, dates, and file attachments (JPG, PNG, PDF via Base64). Expense categories can be unit-based (e.g., mileage with per-unit pricing).

### Invoicing

Create invoices for clients from tracked time and expenses. Invoices support date ranges, project filtering, tax and discount configuration, and custom line items. Invoices can be marked as draft, sent, or paid. Invoices can be exported to Xero, QuickBooks, or FreshBooks. Line items can be refreshed to recalculate from current time data.

### Schedule & Resource Planning

Manage team assignments for resource planning. Create, update, and delete project assignments with start/end dates and scheduled time. Filter assignments by type (project or time-off), project, task, client, or date range.

### Time Off Management

Create and manage time-off requests with configurable types (e.g., sick leave, vacation). Supports full-day, half-day, and quarter-day periods. Time-off requests go through a pending/approved workflow. Manage time-off allocations per user with accrual frequencies and carryover balances.

### Users

Retrieve the current authenticated user's profile or list all team members. User data includes name, role (admin, supervisor, member), status, headline, and avatar.

### Reports / Dashboards

Generate aggregated reports by projects, clients, or users. Reports include metrics such as total time, billable/non-billable time, billable amounts, costs, profit, uninvoiced amounts, and expenses. All reports support date range and filter parameters (project, client, member).

## Events

Everhour supports webhooks to notify external systems when changes occur. Webhooks are managed via the API (`/hooks` endpoints) and require a target URL and a list of event types.

**Verification:** When creating or updating a webhook, Everhour sends a POST request with an `X-Hook-Secret` header and empty body. The target URL must respond with the same `X-Hook-Secret` header to complete verification.

**Scoping:** Webhooks can optionally be scoped to a specific project to receive events only for that project.

### Project Events

- `api:project:created` — A new project is created.
- `api:project:updated` — A project is updated.
- `api:project:removed` — A project is deleted.

### Task Events

- `api:task:created` — A new task is created.
- `api:task:updated` — A task is updated.
- `api:task:removed` — A task is deleted.

### Time Events

- `api:time:updated` — A time record is added, edited, or removed on a task.

### Timer Events

- `api:timer:started` — A timer is started.
- `api:timer:stopped` — A running timer is stopped.

### Section Events

- `api:section:created` — A new section is created in a project.
- `api:section:updated` — A section is updated.
- `api:section:removed` — A section is deleted.

### Client Events

- `api:client:created` — A new client is created.
- `api:client:updated` — A client is updated.

### Estimate Events

- `api:estimate:updated` — A task estimate is updated.
