I see there are multiple companies called "Ramp" - the user likely means Ramp (ramp.com), the corporate card and spend management platform. Let me get more details from their actual API docs.Now let me try to get the webhook details from the OpenAPI spec:I now have enough information to compile the specification. Let me write it up based on my research.

# Slates Specification for Ramp

## Overview

Ramp is a corporate spend management platform that provides corporate cards, bill payments, reimbursements, and accounting automation. The API provides programmatic access to Ramp's corporate card and spend management platform, enabling businesses to automate transaction tracking, enforce spending policies, and generate real-time reports. It provides secure, scoped access to objects like transactions, cards, users, and more.

## Authentication

Ramp uses OAuth 2.0 for secure API access, providing granular permission control through scopes and supporting multiple authorization flows for different use cases.

**Supported Flows:**

1. **Client Credentials Grant** — Best for server-to-server integrations where no user interaction is required.
2. **Authorization Code Grant** — Required for third-party applications and public integrations. Use this flow if you're building a public integration or need users to explicitly grant access to their Ramp accounts.

**Authorization Code Flow Steps:**

1. Direct the user to the authorization endpoint: `https://app.ramp.com/v1/authorize` with query parameters `response_type=code`, `client_id`, `redirect_uri`, `scope` (space-separated), and `state`.
2. Only users with Admin or Business Owner roles can authorize third-party applications. If a user with insufficient permissions attempts to authorize your app, they will receive a "Business not authorized to use this application" error.
3. Upon approval, Ramp redirects to your `redirect_uri` with a temporary `code` and the original `state`.
4. Exchange the code for an access token by POSTing to `https://api.ramp.com/developer/v1/token` with `grant_type=authorization_code`, `code`, and `redirect_uri`. Authenticate with your Client ID and Client Secret.

**Token Lifetime:**

- Access tokens generated using the authorization code grant and refresh token grant expire after one hour, whereas access tokens generated using the client credentials grant expire after 10 days.
- A refresh token, in combination with a client ID and client secret, is used to generate new access tokens.

**Scopes:**

Each scope follows the pattern `resource:permission` where resource is the API resource (e.g., transactions, bills, users). Permissions are `read` or `write`. Available scopes include: `transactions:read`, `cards:read`, `cards:write`, `spend_programs:read`, `spend_programs:write`, `users:read`, `users:write`, `locations:read`, `locations:write`, `limits:read`, `limits:write`, `departments:read`, `departments:write`, `business:read`, `receipts:read`, `receipts:write`, `transfers:read`, `vendors:read`, `merchants:read`, `accounting:read`, among others.

**Environments:**

- Production: `https://api.ramp.com/developer/v1/`
- Sandbox: `https://demo-api.ramp.com/developer/v1/`

Each environment requires separate app configurations. Create one app in sandbox for testing and another in production for live usage.

**API Requests:**

All authenticated API requests use Bearer token authentication via the `Authorization: Bearer <access_token>` header.

## Features

### Transaction Management

Retrieve and manage card transactions including details such as amount, currency, merchant, category, and accounting fields. You can query by date range, merchant, or status. Transactions can be filtered by sync status, spend limit, entity, and more.

### Card Management

The Limits API allows you to create, edit, and view virtual cards with additional functionality such as linking virtual card limits to physical cards and spend programs. Issue both virtual and physical cards with configurable spending restrictions including amount limits, merchant category restrictions, and spend intervals. Cards can be updated, suspended, and terminated.

### Spend Programs and Limits (Funds)

Spend Programs group funds, users, and cards under shared policies. They can enforce consistent spending rules across multiple funds and enable automated fund provisioning based on employee attributes. Limits represent individual spending budgets that can be associated with cards and reimbursements.

### Bill Pay (Accounts Payable)

Bills represent an obligation to pay a vendor for goods or services. They serve as a foundational element for accounts payable processes, ensuring accurate tracking of payments, due dates, and vendor relationships. Create, list, update, and archive bills. Upload invoice attachments. Bills created via API are automatically approved and skip the draft phase. For bills that require manual review, see Draft Bills which represent the intermediate state before approval.

### Reimbursements

Manage employee reimbursements for out-of-pocket expenses and mileage. Reimbursements support accounting field coding, receipt attachment, line items, and mileage tracking. They can be filtered by state, approval status, entity, trip, and sync status.

### User Management

Save hours on manual setup by programmatically inviting users and managing permissions. Users connect to departments, entities, cards, and transactions. Users can be created, updated, deactivated, and reactivated. Roles include Admin, Cardholder, and Bookkeeper.

### Accounting Integration

Build ERP integrations with the accounting API. Capabilities include:

- Fetch ready-to-sync transactions from Ramp, import to your ERP, and mark as synced.
- Fetch bills and bill payments from Ramp, import to your ERP, and mark as synced.
- Fetch reimbursements from Ramp, import to your ERP, and mark as synced.
- Sync statements and cashbacks.
- Manage GL accounts (chart of accounts), custom accounting fields, and accounting connections.
- Report sync failures back to users in Ramp.

### Organizational Structure

Manage departments, locations, and entities (for multi-entity businesses). These are used to organize users, cards, and transactions for reporting and policy enforcement.

### Vendor Management

Retrieve and manage vendor information including contacts, bank accounts, and categorization. Vendors are linked to bills and transactions.

### Merchants

Access merchant data associated with card transactions including merchant names, categories, and identifiers.

### Receipts

Upload and manage receipts attached to transactions and reimbursements. Supports OCR processing for automatic data extraction.

### Transfers and Statements

View bank transfers and card statement data including statement payments and cashback redemptions.

### Purchase Orders

Manage purchase orders as part of procurement workflows.

### Business Information

Retrieve information about the connected Ramp business account.

### Custom Records

Configure and manage custom tables and native table extensions for tracking additional data alongside bills, transactions, and reimbursements.

## Events

Ramp supports webhooks for real-time event notifications. You can use webhooks to receive real-time notifications when objects become ready to sync. This eliminates the need for frequent polling and provides immediate notifications. Webhooks are configured via the API and deliver HTTP POST requests to your specified endpoint URL.

### Transaction Events

Real-time notifications for transaction lifecycle changes, such as when transactions are created or their status changes. Set up webhooks for real-time transaction notifications.

### Bill Events

Get real-time notifications for bill lifecycle events. Covers bill creation, approval, payment, and sync-readiness.

### Reimbursement Events

Get real-time notifications for reimbursement events. Covers reimbursement creation, approval, payment, and sync-readiness.

### Accounting Sync Events

Notifications when objects (transactions, bills, reimbursements, statements, cashbacks) become ready to sync to external accounting systems, enabling event-driven ERP integrations rather than polling.
