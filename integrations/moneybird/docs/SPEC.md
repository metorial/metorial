Now let me get the API reference to understand all the features/resources available:Now I have a comprehensive understanding of Moneybird's API. I can see the full list of API resources from the sidebar in the documentation. Let me compile the specification.

# Slates Specification for Moneybird

## Overview

Moneybird is a Dutch cloud-based accounting and invoicing platform primarily targeted at small businesses and freelancers. It provides tools for creating and sending invoices, managing contacts, tracking expenses, recording payments, time tracking, and financial reporting. The API is RESTful, supports JSON and XML, and is scoped per administration (i.e., company account).

## Authentication

Moneybird supports two authentication methods:

### 1. OAuth 2.0 (Authorization Code Flow)

This is the recommended method for third-party applications accessing Moneybird on behalf of users.

- **Application Registration**: Register your application at `https://moneybird.com/user/applications/new` to receive a `Client ID` and `Client Secret`.
- **Authorization Endpoint**: `https://moneybird.com/oauth/authorize`
- **Token Endpoint**: `https://moneybird.com/oauth/token`
- **Grant Type**: `authorization_code` (also supports `refresh_token`)
- **Redirect URI**: Must exactly match the one registered. Use `urn:ietf:wg:oauth:2.0:oob` for out-of-band flows.
- **Scopes**: Optional. Available scopes are:
  - `sales_invoices`
  - `documents`
  - `estimates`
  - `bank`
  - `time_entries`
  - `settings`
  - If no scope is provided, `sales_invoices` is used by default. At least one of `sales_invoices`, `documents`, `estimates`, `bank`, or `settings` is required to access contacts.
- **Token Expiry**: Access tokens currently do not expire, but a refresh token is provided and should be stored for future use.

### 2. Personal API Token

A simpler alternative for personal or internal use. Generate a token at `https://moneybird.com/user/applications/new` and select desired scopes via checkboxes.

### Using the Token

Include the token in the `Authorization` header of every API request:

```
Authorization: Bearer {ACCESS_TOKEN}
```

### Administration ID

All API requests (except listing administrations) require an `administration_id` in the URL path: `https://moneybird.com/api/v2/{administration_id}/{resource}.json`. The administration ID can be found in the URL when logged into Moneybird, or retrieved via the administrations endpoint.

## Features

### Contact Management

Create, update, delete, and search contacts (customers and suppliers). Contacts include company details, addresses, email settings, SEPA/direct debit information, and custom fields. Contacts can be looked up by their customer ID and filtered by various attributes. Contact persons can be managed separately within a contact.

### Sales Invoices

Create, send, update, and delete sales invoices. Invoices can be sent via email, postal mail, or Peppol (electronic invoicing). Supports state management (draft, open, paid, late, reminded, uncollectible), payment registration, sending reminders, and creating credit notes from existing invoices. Invoices can include line items with products, tax rates, and ledger accounts.

### Recurring Sales Invoices

Set up recurring invoices that are automatically generated at specified intervals. Supports automatic sending, configurable frequency, and a desired count of invoices after which the recurrence is deactivated.

### External Sales Invoices

Import invoices created in external systems (e-commerce platforms, marketplaces) into Moneybird for unified financial tracking. Supports attaching source documents and linking to external source URLs.

### Estimates (Quotes)

Create, send, and manage quotes/estimates. Estimates can be marked with various states (open, accepted, rejected, billed, expired). Accepted estimates can be converted into sales invoices.

### Documents (Expenses)

Manage expense-related documents including:

- **Purchase Invoices**: Invoices received from suppliers.
- **Receipts**: Expense receipts.
- **General Journal Documents**: Manual journal entries.
- **General Documents**: Miscellaneous documents (e.g., contracts).
- **Typeless Documents**: Documents received (e.g., via email) that haven't been categorized yet.

### Financial Accounts and Statements

Manage bank accounts and other financial accounts. Import bank statements with financial mutations (transactions) that can be linked to invoices, expenses, and ledger accounts for reconciliation.

### Financial Mutations

View and manage individual bank transactions. Link mutations to invoices or documents for bookkeeping. Supports automatic matching rules (booking rules).

### Payments and Payment Transactions

Register payments against invoices and documents. Manage SEPA direct debit transactions and purchase (credit transfer) transactions, including batch creation and status tracking.

### Products

Manage a product catalog with descriptions, prices, tax rates, and ledger account assignments. Products can be referenced when creating invoices and estimates.

### Ledger Accounts

Manage the chart of accounts (categories) for bookkeeping. Ledger accounts can be created, updated, activated, and deactivated.

### Tax Rates

View and manage VAT/tax rates used on invoices and documents.

### Time Entries

Track time spent on projects. Time entries can be linked to contacts and projects, and can be converted into sales invoices.

### Projects

Create and manage projects for organizing work and time entries.

### Subscriptions and Subscription Templates

Manage recurring subscriptions for customers. Subscription templates define the terms and products, and subscriptions automatically generate invoices based on these templates.

### Custom Fields

Define and manage custom fields that can be attached to contacts and other entities for storing additional metadata.

### Workflows

Configure invoice and estimate workflows that define sending behavior, payment terms, and follow-up actions.

### Document Styles

Manage invoice and estimate layout templates.

### Identities

Manage sender addresses used on outgoing invoices and estimates.

### Users

List users who have access to the administration.

### Verifications and Import Mappings

Manage verifications (for audit purposes) and import mappings for data import configuration.

### Synchronization

Each major resource (contacts, invoices, estimates, documents, etc.) supports a synchronization mechanism that returns IDs and version numbers, allowing efficient incremental syncing of data.

## Events

Webhooks are a way to subscribe to events that happen in Moneybird. When an event occurs, Moneybird will send a POST request to the URL you provided. This way, you can keep your own system in sync with Moneybird.

It is possible to subscribe to certain events by adding an array with events you would like to receive notifications from. If no specific events are specified, all events are delivered. You can register as many webhooks as required in an administration.

Webhook push requests include an `Idempotency-Key` header. This value is unique for each individual webhook push. Since Moneybird retries a push if a non-200 status code is received, you can use this value to ensure that your backend never processes the same push twice.

The following event categories are available (you can subscribe to individual events or use event group prefixes to receive all events in a category):

### Contact Events

Changes to contacts: creation, updates, deletion, archiving, activation, merging, and trust status changes. Also includes contact person and SEPA mandate events.

### Sales Invoice Events

Full lifecycle of sales invoices: creation, updates, deletion, state changes (draft, open, paid, late, reminded, uncollectible, pending payment, scheduled), sending (email, postal mail, Peppol), reminders, merging, pausing/unpausing, and dubious/uncollectible markings.

### Recurring Sales Invoice Events

Creation, updates, deletion, activation/deactivation of recurring invoices. Includes events for when a new invoice is generated from a recurrence and when automatic sending is enabled/disabled.

### External Sales Invoice Events

Creation, updates, deletion, and state changes of externally imported invoices.

### Estimate Events

Full lifecycle of quotes/estimates: creation, updates, deletion, state changes (open, accepted, rejected, billed, expired), sending, and signing.

### Document Events

General document lifecycle events: creation, saving, updates, deletion, expiration, recurrence, and receipt via email or Peppol.

### Financial Account and Statement Events

Creation, updates, deletion, and activation/deactivation of financial accounts and bank links. Creation, updates, and deletion of financial statements.

### Payment Events

Payment registration, deletion, linking to financial mutations, and email notifications. Includes direct debit transaction lifecycle events (created, pending, authorized, executing, paid, rejected).

### Purchase Transaction Events

Credit transfer batch lifecycle: creation, authorization, execution, payment status, and rejection.

### Product Events

Creation, updates, deletion, activation, and deactivation of products.

### Project Events

Creation, updates, deletion, activation, and archiving of projects.

### Ledger Account Events

Creation, updates, deletion, activation/deactivation of categories, and booking events on categories.

### Time Entry Events

Creation, updates, deletion, and invoicing of time entries.

### Subscription Events

Creation, updates, deletion, cancellation, and resumption of subscriptions. Also includes subscription template lifecycle events.

### Tax Rate Events

Creation, updates, deletion, activation, and deactivation of VAT rates.

### Administration Events

Administration lifecycle events including activation, suspension, cancellation, and settings changes.

### User and Access Events

User invitations, removals, access token creation/revocation, and multi-factor authentication events.

### Workflow and Document Style Events

Creation, updates, deletion, and deactivation of workflows and document layouts.

### Task List Events

Full lifecycle of task lists and individual tasks: creation, updates, completion, reopening, assignment, and linking.

### Company Assets Events

Asset creation, updates, disposal, depreciation plans, and value changes (linear, arbitrary, manual, divestment, full depreciation).

### VAT Return Events

Creation, receipt by tax authorities, and payment of VAT returns and supplementary VAT returns.
