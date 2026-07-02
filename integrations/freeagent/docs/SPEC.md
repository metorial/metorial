Let me get more details on the API resources available.Now I have a comprehensive view of FreeAgent's API. Let me confirm the webhook situation with one more check.

Based on the forum posts, FreeAgent does not natively support webhooks — users have been requesting this feature since at least 2015, and as recently as 2025 people were still asking for it. The Apideck listing also shows "Supported webhook events · -" (empty). Now I can write the specification.

# Slates Specification for Freeagent

## Overview

FreeAgent is online accounting software primarily aimed at UK-based freelancers and small businesses. It provides invoicing, expense tracking, bank reconciliation, payroll, tax returns (including Self Assessment and VAT), and financial reporting. It also offers a Practice Dashboard for accountants and bookkeepers to manage multiple client accounts.

## Authentication

FreeAgent uses OAuth 2.0 as its sole authentication method. There are no API keys or other alternatives.

**Setup:**

1. Register a new app at the FreeAgent Developer Dashboard (dev.freeagent.com) to obtain an OAuth Client ID and Secret.
2. Configure one or more redirect URIs in the Developer Dashboard.

**OAuth 2.0 Authorization Code Flow:**

- **Authorization Endpoint:** `https://api.freeagent.com/v2/approve_app`
  - Required parameters: `client_id`, `redirect_uri` (must match one registered in the Developer Dashboard), `response_type=code`. An optional `state` parameter can be supplied to maintain application state.
- The user is prompted to log into FreeAgent and will be shown a screen allowing them to allow or deny access.
- Upon approval, FreeAgent redirects back with an authorization code.
- **Token Endpoint:** `https://api.freeagent.com/v2/token_endpoint`
  - The app makes an HTTP Basic Auth request to the token endpoint using the Client ID as the username and Client Secret as the password, with `grant_type=authorization_code` and the authorization code in the POST body.
  - In return the app will receive an Access Token and a Refresh Token.
- An access token is currently valid for one hour. Refresh tokens may be used to retrieve a new access token via a POST to the same token endpoint with `grant_type=refresh_token`.

**Sandbox Environment:** To use the sandbox API, change the server to `https://api.sandbox.freeagent.com`.

**No Scopes:** FreeAgent's OAuth implementation does not use scopes. Access to resources is controlled by the authenticated user's permission level within FreeAgent, ranging from level 0 (No Access) to level 8 (Full).

**Accountancy Practice API:** FreeAgent offers a separate API mode for accountants and bookkeepers with a Practice Dashboard. This requires a different API app registration.

## Features

### Invoicing & Billing

Create, manage, and track invoices and credit notes. Supports recurring invoices for automated billing. Invoices can be filtered by status (e.g., open, overdue, paid). Estimates can also be created and managed. Price list items can be maintained for use across invoices.

### Expense Management

Record and categorize business expenses. Supports file attachments (e.g., receipts) on expenses.

### Banking

Manage bank accounts, import bank transactions, and create bank transaction explanations (reconciliations). Supports bank feeds for automatic transaction imports. Credit note reconciliations can be tracked.

### Contacts

Manage contacts (customers, suppliers, etc.) with full CRUD operations. Contacts can include company and individual details, addresses, and invoice preferences.

### Projects & Time Tracking

Create and manage projects linked to contacts. Track time using timeslips, and define tasks that can be associated with projects. Timeslips can be billed to invoices.

### Financial Reporting

Access key financial reports including Profit & Loss, Balance Sheet, Trial Balance, and Cashflow statements. These can be retrieved for specific date ranges.

### Tax & Compliance

Access and manage UK-specific tax data including VAT Returns, Sales Tax Periods, Self Assessment Returns, Corporation Tax Returns, Income Tax Returns, and CIS Bands. Final accounts reports are also available.

### Payroll

Manage payroll runs and payroll profiles for employees.

### Capital Assets

Track capital assets and their types, including depreciation profiles for asset depreciation calculations.

### Company Management

Access and update company-level settings and information. Manage users and their permission levels within the account.

### Categories & Accounting

Access the chart of accounts (categories) used for classifying transactions. Create journal sets for manual accounting entries.

### Stock Items

Manage stock/inventory items that can be used on invoices and bills.

### Properties

Manage property records, relevant for landlord accounting scenarios.

### Hire Purchases

Track hire purchase agreements as a financing mechanism for assets.

### Notes

Attach notes to various resources for record-keeping.

## Events

The provider does not support events. FreeAgent's API does not offer webhook or event subscription support; tracking changes requires polling the API. This has been a long-standing community feature request that remains unimplemented.
