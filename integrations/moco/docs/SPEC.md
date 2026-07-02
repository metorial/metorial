Now let me check what webhook targets are available:Now let me check for additional webhook targets beyond what's listed in the API docs, since the blog post mentioned InvoiceReminder and Purchase webhooks:I now have enough information to write the specification. Let me compile it.

# Slates Specification for Moco

## Overview

MOCO (MObile COmpany) is a cloud-based project management and ERP software designed for agencies and service businesses. It covers time tracking, billing, resource planning, sales funnel management, and CRM. The API base URL is tenant-specific: `https://{domain}.mocoapp.com/api/v1/`.

## Authentication

MOCO uses API key authentication. There are two types of API keys: **User API keys** (found under the "Integrations" tab on the user's profile page) and **Account API keys** (created in Settings > Extensions > API & Webhooks, with either read-only or full access).

Up to three account API keys can be created. Administrators can configure whether to allow personal keys only, account keys only, both, or disable API access entirely.

The API key is passed via the `Authorization` header. Two formats are accepted:

- `Authorization: Token token=YOUR_API_KEY`
- `Authorization: Bearer YOUR_API_KEY`

A user-specific API key can also be obtained programmatically by posting email and password credentials to `POST /api/v1/session`.

**Required inputs for authentication:**

- **Domain** (subdomain): Your MOCO account subdomain (e.g., `mycompany` for `mycompany.mocoapp.com`).
- **API Key**: Either a personal user API key or an account API key.

By default, all requests are scoped to the authenticated user. Personal API keys provide access to data in line with the user's personal access rights.

## Features

### Project Management

Create, update, archive, and delete projects. Projects include budgets, billing configuration, hourly rates, tags, and assignments. You can retrieve project reports with key business indicators such as budget progress, hours logged, and cost breakdowns by task. Projects can be shared and grouped. Sub-entities include project tasks, contracts (staff assignments), expenses, recurring expenses, and payment schedules.

### Time Tracking (Activities)

Log and manage time entries (activities) against project tasks. Activities are scoped to the authenticated user by default. Supports filtering by date, project, and task. Useful for tracking billable and non-billable hours.

### CRM (Companies & Contacts)

Manage companies (customers, suppliers, organizations) and their associated contact persons. Supports tagging and custom properties for flexible categorization.

### Deals / Leads (Sales Pipeline)

Track sales opportunities through a pipeline. Deals can be categorized, assigned to users, and linked to companies. Deal categories are configurable.

### Invoicing

Create and manage invoices, including line items, billing addresses, and payment terms. Track invoice payments and send invoice reminders. Export invoices for bookkeeping systems.

### Offers / Proposals

Create and manage proposals/offers for clients. Supports digital client approval workflows where approval links can be generated and sent.

### Purchases / Expenditures

Manage incoming invoices and expenditures with categories, payments, budgets, and bookkeeping exports. Supports purchase drafts and OCR-based document reading.

### Receipts

Manage receipt documents associated with expenses.

### Resource Planning

Create and manage planning entries to schedule team members across projects and time periods.

### User & Staff Management

Manage users, their employment details (working hours, start/end dates), holiday entitlements, absences/leave requests, and presences (clock-in/clock-out). Organize users into units/teams and assign permission roles.

### Schedules

Manage work schedules and assignments for users.

### Reporting

Retrieve reports with aggregated business data across projects.

### Account Configuration

Manage account-level settings including catalog services, custom properties (custom fields), expense templates, task templates, hourly rates, internal hourly rates, fixed costs, VAT codes, and tags/labels.

- Custom fields can be marked as "API-only editable" to prevent manual overwrites.
- Users with Staff permissions can impersonate other users via the `X-IMPERSONATE-USER-ID` header.

### Comments

Add and manage comments on various entities (projects, contacts, etc.).

## Events

MOCO supports webhooks. Events in MOCO can be assigned subscriptions, and whenever an event triggers, MOCO sends an HTTPS POST payload to the webhook's configured URL with an HMAC SHA256 signature.

Webhooks can be managed via the web UI or the API. Each webhook subscription is configured with a **target** (entity type) and an **event** (action type).

Available event types include: `create`, `update`, `delete`, `archive`, and more.

The following target entities are supported for webhook subscriptions:

### Activity

Triggered when a time entry is created, updated, or deleted.

### Company (Customer)

Triggered when a company record is created, updated, or deleted.

### Contact

Triggered when a contact person is created, updated, or deleted.

### Project

Triggered when a project is created, updated, deleted, or archived/unarchived.

### Invoice

Triggered when an invoice is created, updated, or deleted. Also triggers on status changes.

### InvoiceReminder

Payment reminders can be monitored via the "InvoiceReminder" webhook.

### Offer

Triggered when a proposal/offer is created, updated, or deleted. When a client digitally confirms a proposal, it triggers the "Offer/update" webhook.

### Deal

Triggered when a deal/lead is created, updated, or deleted.

### Expense

Triggered when a project expense is created, updated, or deleted.

### Purchase

Changes in expenditure items (e.g., a category is assigned) trigger the "Purchase/update" webhook.

**Configuration options:**

- Each webhook is configured with a target, event type, and destination URL.
- The signature uses HMAC with SHA256, and the key is the 32-character hexadecimal string displayed in the webhook overview.
- Webhooks are only available to subscribed MOCO customers.
- Webhooks are not guaranteed to be delivered in order; use the provided timestamp if ordering matters.
