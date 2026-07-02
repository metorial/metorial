Let me get more details on the specific webhook entities and API features.Now let me get the full list of webhook-supported entities and the API entity categories.# Slates Specification for QuickBooks

## Overview

QuickBooks Online is an accounting software by Intuit that helps businesses manage finances including invoicing, expense tracking, bill payments, payroll, and financial reporting. The QuickBooks Online Accounting API uses the REST framework to provide apps with access to the customer-facing features in the software, broken down into several entities covering different parts of the app. Intuit also offers a separate QuickBooks Payments API for processing credit card and bank account transactions.

## Authentication

QuickBooks Online uses **OAuth 2.0** exclusively for authentication. There is no API key or service account mechanism.

**Credentials Required:**

- **Client ID** and **Client Secret**: Obtained from the Intuit Developer portal (https://developer.intuit.com) under the app's Keys tab.
- **Redirect URI**: Must exactly match one of the URIs configured in the app settings.
- **Company ID (Realm ID)**: A unique identifier for the QuickBooks company being accessed, returned during the authorization flow and required for all API calls. The integration captures this from the OAuth callback when available; it can also be supplied explicitly in config.

**OAuth 2.0 Endpoints:**

- **Authorization URL**: `https://appcenter.intuit.com/connect/oauth2`
- **Access Token URL**: `https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer`

**Scopes:**

- `com.intuit.quickbooks.accounting` — Access to accounting data (invoices, customers, vendors, etc.)
- `openid`, `profile`, `email` — OpenID Connect scopes for user identity information.

The integration records accounting `Payment` entities through the Accounting API. It does not request `com.intuit.quickbooks.payment` unless a future tool calls the separate QuickBooks Payments API for payment processing.

**Token Lifecycle:**

- Access tokens are valid for 1 hour.
- Refresh tokens are valid for 101 days but may change on each refresh call — always store the latest refresh token returned.
- The authentication endpoints are the same for sandbox and production; only the API data endpoints differ.

**API Base URLs:**

- Sandbox: `https://sandbox-quickbooks.api.intuit.com`
- Production: `https://quickbooks.api.intuit.com`

## Features

### Accounts & General Ledger

Manage chart of accounts used to track income, expenses, assets, and liabilities (often referred to as "ledgers"). Create, read, update, and query accounts with attributes like account number, type, and sub-account hierarchy.

### Invoicing

Create, send, and track invoices. Supports line items, discounts, taxes, custom fields, and linking to customers. Invoices can be emailed directly through the API.

### Bills & Accounts Payable

Manage bills representing requests for payment from third parties (vendors) for goods or services. Supports creating bill payments to record payments against outstanding bills via check or credit card.

### Customers & Vendors

Manage customer records including parent and sub-customer hierarchies. Similarly manage vendor records for suppliers. Includes contact details, billing/shipping addresses, and tax information.

### Payments

Track monetary transactions made toward invoices or outstanding balances. Payments can be linked to multiple invoices or credit memos, or recorded without linking to any specific document.

### Estimates & Sales Receipts

Create and manage estimates (quotes) for customers. Convert estimates to invoices. Manage sales receipts for immediate payment transactions.

### Expense Tracking

Import expense data from corporate cards or receipt capture apps. Record purchases and expenses with categorization against the chart of accounts.

### Items & Inventory

Sync inventory levels between QuickBooks and external systems. Manage products and services (items) with pricing, descriptions, and inventory tracking.

### Journal Entries

Create manual journal entries for adjustments and non-standard transactions. Supports debit and credit lines across multiple accounts.

### Reporting

Generate reports and visualizations based on QuickBooks data, including profit and loss, balance sheet, cash flow, and other standard financial reports.

### Payroll (GraphQL API)

Intuit offers a separate GraphQL API for Payroll, allowing clients to request exactly the data they need. Access employee compensation, tax deductions, and pay history. This API is separate from the main REST Accounting API.

### Payments Processing (Payments API)

A separate API (`com.intuit.quickbooks.payment` scope) for processing credit card charges, bank account debits (ACH), and managing payment methods. This is distinct from recording payment receipts in the accounting system.

### Querying & Change Data Capture

Use a SQL-like query language to send queries to retrieve filtered and sorted data. A ChangeDataCapture (CDC) endpoint allows retrieving all entities that changed since a given timestamp, useful for incremental data synchronization.

## Events

QuickBooks Online supports webhooks for real-time change notifications.

### Entity Change Notifications

Apps can subscribe to create, update, delete, merge, and void event notifications on entities. Supported entities include Account, Bill, Customer, Invoice, Item, Payment, Vendor, and more.

- **Configuration**: Webhooks are configured in the Intuit Developer portal by specifying an endpoint URL and selecting which entities and operations to subscribe to.
- Webhook payloads specify a "name" (entity type) and "operation" (e.g., Create, Update, Delete) rather than distinct event types. The payload contains minimal data (entity ID, operation, and timestamp); you must then call the API to fetch full entity details.
- Security is enforced via HMAC-SHA256 signature verification using a verifier token provided during webhook setup.
- Events are aggregated and sent in periodic notifications rather than being delivered instantly per change.
- Not all entity types are supported for webhooks; consult the official documentation for the current entity support matrix.
- To handle potentially missed webhook events, it is recommended to also use the ChangeDataCapture API periodically as a fallback.
