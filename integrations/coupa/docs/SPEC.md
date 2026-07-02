# Slates Specification for Coupa

## Overview

Coupa is a cloud-based Business Spend Management (BSM) platform that provides procurement, invoicing, expense management, payments, supply chain, and sourcing capabilities. It provides rich, robust access to read, edit, or integrate data via a REST API. All data is stored as a business object or Resource, and each resource has a Resource URL in the form /api/{resource_name}.

## Authentication

Coupa supports two authentication methods, though API keys are deprecated:

### OAuth 2.0 (Client Credentials) — Recommended

The Coupa API uses OpenID Connect (OIDC) to authenticate requests using OAuth 2.0.

1. Log in to Coupa as an integrations-enabled administrator to create an OAuth2/OIDC Client with a grant type of Client Credentials.
2. Navigate to Setup > Oauth2/OpenID Connect Clients.
3. For Grant Type select Client Credentials, and specify a Name, Login, Contact info, and Contact Email.
4. Select the scopes you would like to include — scopes are a set of permissions set on the API key.
5. Saving the client gives you values of the client Identifier and Secret which are needed to gain access to the API scopes you have defined for it.

**Token endpoint:** `POST https://{your_instance_address}/oauth2/token` with `Content-Type: application/x-www-form-urlencoded`, providing `grant_type=client_credentials`, `client_id`, `client_secret`, and `scope` parameters.

The POST response returns an access_token that authorizes API calls within the defined scope for the next 24 hours (expires_in 86399 seconds). Coupa recommends renewing the token every 20 hours.

**Instance URL format:** Coupa instance addresses take the form of `https://{organization_name}.coupahost.com` (for customer instances) or `https://{organization_name}.coupacloud.com` (for partner and demo instances).

**Scopes:** Coupa scopes take the form of `service.object.right`, for example `core.accounting.read` or `core.accounting.write`. Available scopes can be reviewed at `https://{your_instance_address}/oauth2/scopes`.

### API Key (Deprecated)

Coupa is deprecating API key authentication. New API keys can no longer be issued since September 2022. All API requests must pass an X-COUPA-API-KEY header with an API key. The key is a 40-character long case-sensitive alphanumeric code.

## Features

### Procurement & Requisitions

Create, update, and query purchase requisitions within Coupa. Transactional data is generated from activities within Coupa, like requisitions, purchase orders, invoices, and expenses. Supports managing requisition lines, approvals, and associated accounting.

### Purchase Orders

Create, update, and display order line data on purchase orders. Manage order headers, order lines, change orders, receipts, and order confirmations. Supports querying by supplier, creation date, export status, and other attributes.

### Invoicing

Create, update, or query invoices associated with a purchase order. Supports PO-backed and non-PO invoices, credit notes, invoice charges, compliant invoicing for multiple countries, and inbound cXML invoices. Includes flexible fields for custom data.

### Expense Management

Manage expense reports and expense lines. Supports querying and exporting expense data, pre-approval workflows, and integration with accounting systems.

### Supplier Management

Create, update, and query the suppliers in Coupa. Manage supplier contacts, addresses, payment methods, and custom fields. When updating the primary address, you can update every attribute on the address object but cannot associate a different address ID.

### Contract Management

Manage contracts including contract headers, details, clauses, parties, disputes, and classifications. Supports contract lifecycle events like expiration tracking.

### Approvals

Query and manage approvals across the platform for requisitions, purchase orders, invoices, and expenses.

### Accounts & Budgets

Create and manage accounts to mimic your business' financial structure. Create and update budget lines associated with your accounts. Manage chart of accounts, account types, account validation rules, and budget periods.

### User Management

Create, update, or query users, ranging from basic demographics to managing passwords, groups, and approval permissions.

### Advance Ship Notices

Manage ASN (Advance Ship Notice) records and their line items for tracking pending deliveries from suppliers.

### Payments

Manage payment records and Coupa Pay transactions, including dynamic discounting settings and payment details.

### Inventory & Receipts

Track inventory transactions and receipts, including partial voiding of receipts.

### Sourcing

Manage sourcing events including RFx events, reverse auctions, and supplier bids through the CSO (Coupa Sourcing Optimization) API.

### Risk Assessment

Access evaluations, suppliers, relationships, and risk scores through the Risk Assess REST API.

### GraphQL

GraphQL is available as a query language that allows you to request exactly the data you need and reduce the number of API calls by fetching all resources in a single or few calls.

### API Response Filters

Admins can create and manage API response filters to get expenses, requisitions, invoices, purchase orders, and user resources. Filters can also be used with Remote Approver call outs and Tax Engine call outs.

## Events

Coupa supports outbound event notifications through its **Process Automator** and **Call Out** mechanism. A Call Out is an object configured to send messages externally used for remote approval, tax engine assessment, process actions, or to send event notifications (a webhook).

### Document Event Notifications

Triggers begin when a document status changes. You can use Process Automator with Call Outs to send data to third-party systems in real time. Supported document types include:

- **Invoices** — Triggered on status changes such as approval, payment, or dispute. For example, an invoice that gets approved can trigger a process that sends an API Call Out.
- **Purchase Orders** — Triggered on creation, approval, or changes to purchase orders.
- **Requisitions** — Triggered on submission, approval, or other status changes.
- **Expense Reports** — Triggered on submission or approval of expense reports.
- **Contracts** — Triggered on contract lifecycle events. You can set time-based actions to execute at a configured interval, or at a defined day, week, or month before or after a defined event.
- **Receipts** — Triggered when goods are received.
- **Suppliers** — Triggered on supplier record changes.

Each process can have conditions to filter which events actually trigger the call out, and Data Mappings transform the API call out payload from Coupa's standard format to the format expected by the target system. API response filters can be applied to control the payload sent in webhooks.

### UI Button Click Events

An automated process begins when a user clicks a configured process launch button. This allows manually triggered outbound notifications from within the Coupa UI.
