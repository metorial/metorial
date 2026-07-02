Now let me get the full list of API modules and scopes from the official docs.Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Zoho Books

## Overview

Zoho Books is a cloud-based accounting software for small and medium businesses. It provides invoicing, expense tracking, inventory management, project accounting, banking, and financial reporting capabilities. The API (v3) is RESTful and mirrors the full functionality of the Zoho Books web client.

## Authentication

Zoho Books uses the OAuth 2.0 protocol for authentication, enabling third-party applications to gain delegated access to protected resources via the API.

**OAuth 2.0 Authorization Code Flow:**

1. **Register your application** at the [Zoho Developer Console](https://api-console.zoho.com/). You need to register your application with Zoho Books by going to the Zoho Developer Console and choosing a client type. Client types include: Server-based Applications, Client-based Applications, Mobile-based Applications, Non-browser Applications, and Self Client. After registration, you will receive a Client ID and Client Secret.

2. **Authorization request:** Direct users to `{Accounts_URL}/oauth/v2/auth` with parameters:
   - `client_id` — Your registered Client ID
   - `response_type=code`
   - `scope` — Comma-separated list of scopes (see below)
   - `redirect_uri` — Must match the registered redirect URI
   - `access_type` — `offline` (to receive a refresh token) or `online`
   - `prompt=consent` (optional, to force re-consent)

3. **Exchange code for tokens:** POST to `{Accounts_URL}/oauth/v2/token` with `grant_type=authorization_code`, `client_id`, `client_secret`, `redirect_uri`, and the authorization `code`.

4. **Refresh tokens:** POST to `{Accounts_URL}/oauth/v2/token` with `grant_type=refresh_token`, `refresh_token`, `client_id`, and `client_secret`.

5. **Using the token:** Pass the access token in the Authorization header: `Authorization: Zoho-oauthtoken {access_token}`.

**Self Client flow:** For backend applications without a redirect URL, generate a grant token directly via the Zoho Developer Console by selecting the "Self Client" type, specifying scopes, and exchanging the code for tokens.

**Token Validity:**

- Each access token is only valid for one hour and can be used only for the operations defined in the scope.
- A refresh token does not expire. Maximum of 20 refresh tokens per user.

**Organization ID:** Every request requires an `organization_id`, obtainable via `GET /organizations` (scope: `ZohoBooks.settings.READ`) or from the Zoho Books admin console.

**Multi-Region Support:** There are 8 different domains for Zoho Books' APIs, and you must use the one applicable to your account. Domains include `.com`, `.eu`, `.in`, `.com.au`, `.jp`, `.ca`, `.com.cn`, and `.sa`. The Accounts URL and API base URL must match the user's region (e.g., `https://accounts.zoho.eu` and `https://www.zohoapis.eu` for EU).

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
