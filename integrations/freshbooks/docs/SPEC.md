Now let me get the full list of webhook events and scopes:Let me fetch the webhooks page and scopes page for more details:# Slates Specification for FreshBooks

## Overview

FreshBooks is a cloud-based accounting software designed for small businesses and freelancers. It provides APIs for invoicing, accounting, expenses, and time tracking. The API is a JSON-based REST interface for accessing and managing FreshBooks data.

## Authentication

FreshBooks APIs use the OAuth 2.0 protocol for authentication and authorization. Only the **Authorization Code** grant type is supported; client_credentials grant type is not supported.

### Setup

1. Create a FreshBooks account and navigate to the Developer Portal.
2. Register a new application with a unique name and a redirect URI. The redirect URI is the endpoint that will receive the authorization code and exchange it for tokens.
3. After saving, you receive a **Client ID** and **Client Secret**.

### OAuth2 Flow

1. A user visits your authorization link, is sent to a FreshBooks-hosted authorization page, logs in, reviews the scopes, clicks 'Authorize', and is redirected back to your redirect URI with a `code` parameter.

   Authorization URL format:

   ```
   https://auth.freshbooks.com/oauth/authorize/?response_type=code&redirect_uri=<REDIRECT_URL>&client_id=<CLIENT_ID>
   ```

2. Your app must exchange the authorization code (valid for 5 minutes) for tokens by POSTing to the token endpoint with your client_id, client_secret, code, and redirect_uri.

   Token endpoint: `POST https://api.freshbooks.com/auth/oauth/token`

3. Bearer tokens (access tokens) are not long-lived — they last for 12 hours.

4. Refresh tokens live forever but are one-time-use. A new refresh token is issued every time a bearer token is generated, invalidating all previous refresh tokens.

### Scopes

Scope is a mechanism in OAuth 2.0 that limits an application's access to a user's account. An application can request one or more scopes, which are presented to the user in the consent screen.

FreshBooks uses scopes in the format `entity:object:action` (e.g., `user:clients:read`, `user:invoices:write`).

Available scope objects: `bill_payments`, `bill_vendors`, `billable_items`, `bills`, `business`, `clients`, `credit_notes`, `estimates`, `expenses`, `invoices`, `journal_entries`, `notifications`, `online_payments`, `other_income`, `payments`, `profile`, `projects`, `reports`, `retainers`, `taxes`, `teams`, `time_entries`.

Actions are either `read` or `write`.

The scope `user:profile:read` is added to all new apps by default as it's needed for all basic calls.

### API Requests

All authenticated requests must include:

- `Authorization: Bearer <access_token>` header
- `Api-Version` header

API calls are scoped to either an `account_id` (accounting resources) or a `business_id` (projects/time tracking resources).

## Features

### Client Management

Create, read, update, and delete client records. Clients include contact details, organization info, billing address, currency preference, and language settings. Secondary contacts can be associated with a client profile.

### Invoicing

Create and manage invoices including line items, discounts, taxes, and due dates. Invoices are created in a "Draft" status and must be marked as sent or sent by email before they are recognized by accounting reports. Invoices can be sent via email directly through the API. Invoice profiles and presentation/attachment customization are also supported.

### Payments

Record and manage payments against invoices. Supports online payment gateway configuration on invoices (e.g., credit card, ACH). Other income not tied to invoices can also be tracked.

### Estimates

Create, update, delete, and send estimates to clients. Estimates can be sent via email through the API.

### Expenses and Bills

Track expenses with categories, attachments (receipt images), and vendor associations. Manage bills from vendors and record bill payments. Expense categories can be customized.

### Time Tracking

Log time entries against projects and clients. Time entries can be marked as billed or unbilled and filtered by date ranges.

### Projects and Services

Create and manage projects associated with clients. Services represent things your business offers to clients, are added to projects, and allow tracking of time entries by type of work with hourly rates.

### Team Management

Manage team members and staff within the FreshBooks account, including roles and permissions.

### Taxes

Create and manage tax configurations that can be applied to invoices and line items.

### Accounting

Manage the chart of accounts and create journal entries for double-entry bookkeeping.

### Credit Notes

Create, update, and manage credit notes for client refunds or adjustments.

### Reports

Generate financial reports including:

- General Ledger
- Expense Details
- Chart of Accounts
- Cash Flow
- Balance Sheet
- Account Aging
- Profit & Loss, Tax Summary, and other reports

### Items (Billable Items)

Manage reusable billable items (products/services) with names, descriptions, and rates that can be added to invoices.

### Settings

Configure payment gateways and system-level settings for the account.

## Events

FreshBooks supports webhooks — a mechanism for sending notifications via HTTP POST callbacks when certain events occur. Webhooks require a verification step: upon registration, FreshBooks sends a verification code to your URI, which must be confirmed via a PUT request before events are delivered.

Events are identified by a combination of a noun and a verb (e.g., `invoice.create`). You can also subscribe to all events for a noun by using only the noun part (e.g., `invoice`).

The following event categories are supported:

### Invoice Events

Triggered on `create`, `update`, `delete`, and `sendByEmail` actions on invoices. Requires `user:invoices:read` scope.

### Estimate Events

Triggered on `create`, `update`, `delete`, and `sendByEmail` actions on estimates. Requires `user:estimates:read` scope.

### Client Events

Triggered on `create`, `update`, and `delete` actions on clients. Requires `user:clients:read` scope.

### Expense Events

Triggered on `create`, `update`, and `delete` actions on expenses. Requires `user:expenses:read` scope.

### Payment Events

Triggered on `create`, `update`, and `delete` actions on payments. Requires `user:payments:read` scope.

### Project Events

Triggered on `create`, `update`, and `delete` actions on projects. Requires `user:projects:read` scope.

### Time Entry Events

Triggered on `create`, `update`, and `delete` actions on time entries. Requires `user:time_entries:read` scope.

### Bill Events

Triggered on `create`, `update`, and `delete` actions on bills. Requires `user:bills:read` scope.

### Bill Vendor Events

Triggered on `create`, `update`, and `delete` actions on bill vendors. Requires `user:bill_vendors:read` scope.

### Credit Note Events

Triggered on `create`, `update`, and `delete` actions on credit notes. Requires `user:credit_notes:read` scope.

### Recurring Invoice Events

Triggered on `create`, `update`, and `delete` actions on recurring invoice profiles. Requires `user:invoices:read` scope.

### Item Events

Triggered on `create`, `update`, and `delete` actions on billable items. Requires `user:billable_items:read` scope.

### Service Events

Triggered on `create`, `update`, and `delete` actions on services. Requires `user:billable_items:read` scope.

### Tax Events

Triggered on `create`, `update`, and `delete` actions on taxes. Requires `user:taxes:read` scope.

### Expense Category Events

Triggered on `create`, `update`, and `delete` actions on expense categories. Requires `user:expenses:read` scope.
