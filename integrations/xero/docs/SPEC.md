# Slates Specification for Xero

## Overview

Xero is a cloud-based accounting software platform for small and medium-sized businesses. It offers financial management tools including invoicing, bank reconciliation, expense tracking, and financial reporting. Xero offers different APIs for accounting, assets, bank feeds, payroll, files, projects, and other use cases — in total over 11 distinct APIs with over 100 endpoints.

## Authentication

The Xero API does not support basic API key authentication. It uses OAuth 2.0, which requires registering an app in the Xero Developer Portal to obtain a client ID and client secret.

**Authorization Code Flow (standard)**

The primary authentication method. Xero also supports the PKCE extension to the authorization code flow, allowing native apps to connect without storing a client secret.

- **Authorization URL:** `https://login.xero.com/identity/connect/authorize`
- **Token URL:** `https://identity.xero.com/connect/token`
- Access tokens expire after 30 minutes. Unused refresh tokens expire after 60 days; if you don't refresh within that window, the user must reauthorize.

**Tenant ID (xero-tenant-id):** After obtaining tokens, you must call the connections endpoint (`GET https://api.xero.com/connections`) to determine which Xero organisations (tenants) you are authorized to access. The `xero-tenant-id` header must be included in every API request.

**Custom Connections (Client Credentials grant)**

Custom Connections use the `client_credentials` grant type, enabling background processes without user authentication. This is a premium option that only requires a client ID and client secret to request new access tokens. Custom Connections are only valid for a single organisation, so you don't need to pass the xero-tenant-id.

**Scopes**

Scopes are required and additive. Available scope categories include: OpenID Connect (`openid`, `profile`, `email`), offline access (`offline_access`), and organisation-level scopes for the Accounting API, Payroll APIs (AU, UK, NZ), Files API, Assets API, Projects API, Bank Feeds API, Finance API, Practice Manager API, and eInvoicing API.

Common broad scopes include:

- `accounting.transactions` / `accounting.transactions.read` — access to invoices, bank transactions, credit notes, payments, etc.
- `accounting.contacts` / `accounting.contacts.read` — access to contacts and contact groups
- `accounting.settings` / `accounting.settings.read` — access to chart of accounts, tax rates, currencies, etc.
- `accounting.reports.read` — access to financial reports
- `accounting.journals.read` — access to journal entries
- `accounting.attachments` / `accounting.attachments.read` — access to file attachments
- `payroll.<region>` — payroll access for AU, UK, or NZ
- `files` / `files.read` — access to Xero Files
- `assets` / `assets.read` — access to fixed assets
- `projects` / `projects.read` — access to projects
- `bankfeeds` — access to bank feeds

Apps created before March 2, 2026 use broad scopes, while apps created after that date will use new granular scopes by default.

## Features

### Accounting & Invoicing

The core Accounting API allows managing the full accounting lifecycle: creating and managing invoices (sales and purchases), credit notes, bank transactions, payments, batch payments, purchase orders, quotes, and manual journals. Invoices can be emailed directly from the API and have configurable status workflows (draft → submitted → authorised → paid/voided).

### Contacts Management

Create, read, and update contacts (customers and suppliers). Contacts can be organized into contact groups, and you can manage their address details, tax information, and payment terms. Attachments can be linked to contacts.

### Chart of Accounts & Settings

Manage the organisation's chart of accounts, tax rates, currencies, branding themes, tracking categories, and payment services. Organisation settings and details can be read.

### Financial Reporting

Generate financial reports including Balance Sheet, Profit and Loss, Trial Balance, Budget Summary, Executive Summary, Bank Summary, Aged Payables/Receivables, and tax reports (BAS, GST, 1099).

### Bank Feeds

Push bank statement data into Xero by creating feed connections between external bank accounts and Xero bank accounts, and submitting bank statement lines. Requires App Partner certification.

### Fixed Assets

Manage fixed asset records, including asset types, depreciation settings, and asset status transitions (draft, registered, disposed). Track asset values over their lifecycle.

### Projects & Time Tracking

Create and manage projects, assign tasks, log time entries, and track project costs. Useful for service-based businesses that need to track billable hours against client projects.

### Payroll

Region-specific payroll APIs (Australia, UK, New Zealand) for managing employees, pay runs, pay items, leave, timesheets, superannuation/pension, and tax declarations. Requires a Payroll plan.

### Files

Upload, manage, and organize files and documents within Xero. Files can be associated with various accounting objects (invoices, contacts, etc.) via associations.

### Finance

Access additional financial data and insights including cashflow, account usage, bank statement analysis, and financial statement reporting in structured formats.

## Events

Xero offers webhooks as part of their API, allowing developers to subscribe to events and receive real-time notifications when certain actions occur in a Xero organization.

Webhook payloads do not contain the full record details — they notify your app that an event occurred and provide the resource ID so you can fetch the record via the API. Webhooks are batched at the app level, meaning a single payload could contain events for multiple tenants, multiple event categories, and multiple event types.

Webhooks are configured in the Xero Developer Portal under your app settings. Your endpoint must validate HMAC-SHA256 signatures and respond within 5 seconds. You must complete an "Intent to Receive" verification process to activate webhook delivery.

### Contacts

Receive notifications when contacts are created or updated in a connected Xero organisation.

### Invoices

Receive notifications when invoices are created or updated (including status changes such as authorised, paid, or voided).

### Credit Notes

Credit note webhooks notify when credit notes are created or updated in Xero. This event type is currently in closed beta.

### Subscriptions

Receive notifications about Xero App Store subscription events (purchases, upgrades, downgrades, cancellations) for apps listed on the Xero App Store.
