Now let me get the full list of API modules and scopes from the official docs.Now I have comprehensive information. Let me compile the specification.

# Zoho Books Integration Specification

## Overview

Zoho Books is a cloud-based accounting software for small and medium businesses. It provides invoicing, expense tracking, inventory management, project accounting, banking, and financial reporting capabilities. The API (v3) is RESTful and mirrors the full functionality of the Zoho Books web client.

## Authentication

Zoho Books uses OAuth 2.0. The integration exposes one OAuth method for a customer-owned regular regional or Multi-DC server application. `applicationType` is required. `region` is required for a regional application and optional for Multi-DC as an expected-region constraint.

**OAuth 2.0 Authorization Code Flow:**

1. Register a regular regional or Multi-DC server application at the [Zoho Developer Console](https://api-console.zoho.com/) and supply its Client ID and Client Secret when connecting.
2. Regional authorization starts at the selected regional Accounts origin. Multi-DC authorization starts at `https://accounts.zoho.com/oauth/v2/auth`.
3. The callback must contain matching `location` and `accounts-server` values. The authorization code is exchanged only at that exact validated regional Accounts origin. The inferred region must match the regional selection or an optional Multi-DC expected-region constraint.
4. Refresh requests use the persisted regional Accounts origin and preserve the existing refresh token when Zoho omits a replacement.
5. Books API requests use the allowlisted `api_domain` returned by Zoho. Access tokens are passed as `Authorization: Zoho-oauthtoken {access_token}`.

**Token Validity:**

- Each access token is only valid for one hour and can be used only for the operations defined in the scope.
- A refresh token does not expire. Maximum of 20 refresh tokens per user.

**Organization ID:** Every request requires an `organization_id`, obtainable via `GET /organizations` (scope: `ZohoBooks.settings.READ`) or from the Zoho Books admin console.

**Supported Data Centers:**

| Region | Accounts origin | Allowed Books API origin |
| --- | --- | --- |
| US | `https://accounts.zoho.com` | `https://www.zohoapis.com` |
| EU | `https://accounts.zoho.eu` | `https://www.zohoapis.eu` |
| IN | `https://accounts.zoho.in` | `https://www.zohoapis.in` |
| AU | `https://accounts.zoho.com.au` | `https://www.zohoapis.com.au` |
| JP | `https://accounts.zoho.jp` | `https://www.zohoapis.jp` |
| CA | `https://accounts.zohocloud.ca` | `https://www.zohoapis.ca` |
| SA | `https://accounts.zoho.sa` | `https://www.zohoapis.sa` |
Connections created with the previous region-specific OAuth methods must reconnect with the unified `oauth` method and select their region.

**Scopes:** Format is `ZohoBooks.{scope_name}.{operation}` where operation is `CREATE`, `READ`, `UPDATE`, `DELETE`, or `ALL`. Available scope names:

| Scope Name         | Covers                                                                |
| ------------------ | --------------------------------------------------------------------- |
| `contacts`         | Customers and Vendors                                                 |
| `settings`         | Items, Expense Categories, Users, Taxes, Currencies, Opening Balances |
| `estimates`        | Quotes/Estimates                                                      |
| `invoices`         | Invoices                                                              |
| `customerpayments` | Payments Received                                                     |
| `creditnotes`      | Credit Notes                                                          |
| `projects`         | Projects                                                              |
| `expenses`         | Expenses                                                              |
| `salesorders`      | Sales Orders                                                          |
| `purchaseorders`   | Purchase Orders                                                       |
| `bills`            | Bills                                                                 |
| `debitnotes`       | Vendor Credits                                                        |
| `vendorpayments`   | Payments Made                                                         |
| `banking`          | Banking                                                               |
| `accountants`      | Accountant module                                                     |
| `fullaccess`       | Full access to all resources (use `ZohoBooks.fullaccess.all`)         |

#### Declared Scope Contract

```ts
[
  'ZohoBooks.fullaccess.all',
  'ZohoBooks.contacts.ALL',
  'ZohoBooks.settings.ALL',
  'ZohoBooks.invoices.ALL',
  'ZohoBooks.estimates.ALL',
  'ZohoBooks.customerpayments.ALL',
  'ZohoBooks.creditnotes.ALL',
  'ZohoBooks.projects.ALL',
  'ZohoBooks.expenses.ALL',
  'ZohoBooks.salesorders.ALL',
  'ZohoBooks.purchaseorders.ALL',
  'ZohoBooks.bills.ALL',
  'ZohoBooks.vendorpayments.ALL',
  'ZohoBooks.banking.ALL',
  'ZohoBooks.accountants.ALL'
]
```

| Capability group | Requested scope |
| --- | --- |
| Contacts, invoices, estimates, sales and purchase orders, bills, expenses, customer/vendor payments, credit notes, projects/time entries, banking, settings, and accountant operations | The matching `ZohoBooks.<resource>.ALL` scope listed above |
| Product-wide resource access | `ZohoBooks.fullaccess.all` |

The [Zoho Books OAuth documentation](https://www.zoho.com/books/api/v3/oauth/) documents the product-wide full-access scope and each resource namespace with its matching ALL operation. The integration requests the scopes used by current tools and omits redundant READ variants.

## Features

### Contact Management

Manage customers and vendors including company details, contact persons, billing/shipping addresses, payment terms, and credit limits. Contacts can be classified as `customer` or `vendor` and further as `individual` or `business`. Supports enabling portal access, payment reminders, emailing statements, and 1099 tracking (US).

### Invoicing

Create, send, and manage invoices with line items, taxes, discounts, and custom fields. Supports invoice lifecycle management (draft, sent, paid, void, write-off), applying credits, recording payments, email reminders, bulk operations, approval workflows, and payment link generation. Recurring invoices can be configured with custom repeat intervals.

### Estimates and Quotes

Create and manage estimates/quotes with full lifecycle support (draft, sent, accepted, declined). Estimates can be submitted for approval and converted to invoices or sales orders.

### Sales Orders

Manage sales orders with lifecycle status tracking (draft, open, void), approval workflows, and conversion to invoices.

### Purchase Orders and Bills

Create and manage purchase orders and bills for vendor transactions. Purchase orders support approval workflows and can be converted to bills. Bills support payment recording, credit application, and approval workflows.

### Expense Tracking

Record and manage expenses with receipt attachments, employee management, and categorization. Supports recurring expenses with configurable schedules.

### Payments

Record and manage both customer payments (payments received) and vendor payments (payments made). Supports excess payment refunds and linking payments to specific invoices or bills.

### Credit Notes and Vendor Credits

Issue credit notes to customers and manage vendor credits. Credits can be applied to invoices or bills, and refunds can be issued.

### Project Accounting

Create and manage projects with user assignments, tasks, and time tracking. Supports time entry logging with start/stop timers and billing against projects.

### Banking

Manage bank accounts and credit card accounts. Import bank statements, categorize transactions, match transactions against invoices/bills/expenses, and manage bank rules for automatic categorization.

### Chart of Accounts and Journals

Manage the chart of accounts (general ledger accounts) and create manual journal entries for adjustments and complex accounting transactions.

### Fixed Assets

Track fixed assets with depreciation forecasting, lifecycle management (active, draft, written off, sold), and asset type configuration.

### Items and Inventory

Manage products and services as line items that can be used across invoices, estimates, bills, and other transaction documents. Items support custom fields and active/inactive status.

### Tax Configuration

Create and manage taxes, tax groups, tax authorities (US/CA), and tax exemptions (US). Taxes can be applied to transactions and items.

### Currency and Exchange Rates

Manage multiple currencies and exchange rates. Supports base currency adjustments for multi-currency organizations.

### Organization and Settings

Manage organization details, user accounts and roles, locations/branches, reporting tags, and opening balances.

### Custom Modules

Create and manage records in custom modules defined within Zoho Books, enabling extension of the data model beyond standard accounting entities.

### Zoho CRM Integration

Import customers, vendors, and items from Zoho CRM using CRM account, contact, vendor, or product IDs.

### Document Management

Attach files and receipts to invoices, bills, expenses, purchase orders, sales orders, and other transaction documents. Supports email delivery of documents with customizable templates.

## Events

Zoho Books supports webhooks that facilitate communication with third-party applications by sending instant web notifications every time an event occurs in Zoho Books. Webhooks are configured as HTTP/HTTPS URLs and associated with workflow rules.

Webhooks in Zoho Books are outbound — they are configured within the Zoho Books UI (Settings > Automation) and fire HTTP requests to external URLs when workflow rule conditions are met. You can automate tasks such as sending emails, updating fields, and triggering webhooks or custom functions by creating workflow rules. The workflow rule executes automatically once the conditions are met.

### Workflow-Based Webhook Events

Webhooks are tied to workflow rules, which can be configured for the following modules:

- **Contacts** — Triggered on customer/vendor creation or updates.
- **Invoices** — Triggered on invoice creation, edits, or status changes.
- **Estimates/Quotes** — Triggered on estimate creation, edits, acceptance, or decline.
- **Sales Orders** — Triggered on sales order creation or updates.
- **Expenses** — Triggered on expense creation or updates.
- **Bills** — Triggered on bill creation or updates.
- **Purchase Orders** — Triggered on purchase order creation or updates.
- **Credit Notes** — Triggered on credit note creation or updates.
- **Customer Payments** — Triggered on payment receipt.
- **Vendor Payments** — Triggered on payment made.
- **Projects** — Triggered on project creation or updates.

Each workflow rule can specify:

- **Trigger timing:** When a record is created, edited, or both; or on a date-based schedule.
- **Criteria/conditions:** Filter conditions on fields (e.g., total amount > $10,000).
- **Immediate vs. time-based actions:** Webhooks can fire immediately or be scheduled relative to a date field.
- **Payload:** Can send all module parameters as JSON, form-encoded data, or a custom raw payload with field placeholders.

You can create only 1 webhook for each workflow rule. A maximum of 500 webhooks can be triggered per day.

**Note:** Zoho Books does not provide a webhook subscription API — webhooks must be configured through the Zoho Books web UI or via Zoho's automation/workflow settings. There is no programmatic API to register or manage webhook subscriptions externally.
