Now I have enough information to write the specification. Let me also check for OAuth scopes.# Slates Specification for Quaderno

## Overview

Quaderno is a tax compliance platform that automates sales tax, VAT, and GST calculations, invoicing, and reporting for businesses selling online. Its API provides accurate tax calculation on every sale worldwide, billing with automatic invoices and credit notes, alerts for new tax obligations and registrations, and tax reports by country or state.

## Authentication

Quaderno supports two authentication methods:

### 1. API Key (HTTP Basic Auth)

Quaderno uses an API key to authorize all requests, allowing access to the API in combination with the account name in the endpoint URL. You can find your API keys at `quadernoapp.com/users/api-keys`. The API key is included via HTTP Basic Auth in all API requests.

- The API key is sent as the username in HTTP Basic Auth, with `x` as the password placeholder (the password is ignored).
- Example: `curl https://ACCOUNT_NAME.quadernoapp.com/api/invoices.json -u <YOUR_API_KEY>:x`
- To learn the `ACCOUNT_NAME` for your target account, you can get it with the `/authorization` API call.
- The base URL is `https://ACCOUNT_NAME.quadernoapp.com/api/`.

### 2. OAuth 2.0 (Authorization Code Flow)

Used for Quaderno Connect (multi-account platforms). This process is based on OAuth, allowing you to securely obtain an access token for a Quaderno account without having to have your user's password or do any manual setup.

- **Authorization URL:** `https://quadernoapp.com/oauth/authorize`
- **Token URL:** `https://quadernoapp.com/oauth/token`
- **Revoke URL:** `https://quadernoapp.com/oauth/revoke`
- **Required parameters:** `client_id`, `redirect_uri`, `response_type=code`
- **Scopes:** `read_only` (default), `read_write`
- You'll be issued with a client ID and secret, which you'll use to identify yourself when sending users to the OAuth flow and swapping codes for access tokens.
- Access tokens expire every 25 days. Refresh tokens do not expire.
- API calls use `Authorization: Bearer {{access_token}}` header.

## Features

### Tax Calculation

Calculate the correct tax rate at checkout based on customer location, product type, and tax jurisdiction. Supports parameters like destination country, postal code, and tax code (e.g., `eservice`, `saas`, `ebook`, `standard`). Covers 12,000+ jurisdictions worldwide. Tax calculations depend on which jurisdictions the account is registered in.

### Transaction Recording

Send sales data directly from your backend to Quaderno with the Transactions API. Quaderno uses the data for invoices, reports, and tax alerts. Transactions can be of type `sale` or `refund`, and can include customer details, line items with tax information, payment details, and location evidence.

### Invoicing & Credit Notes

Billing with automatic invoices and credit notes. Create, retrieve, update, and deliver invoices and credit notes. Send tax-compliant invoices to customers automatically in HTML or PDF format. Invoices cannot be deleted (for tax compliance); instead, credit notes should be used. Invoices support partial refunds.

### Contact Management

Create contacts representing customers or vendors who appear on invoices, credit notes, and expenses. Contacts can be listed, retrieved, updated, and deleted. Contacts with associated documents cannot be deleted.

### Product Management

Create products which can be used as line items on invoices, credit notes, and expenses.

### Expense Tracking

Create and manage business expenses (purchases). Expenses can include payment records and be associated with contacts.

### Estimates / Proformas

Create and manage estimates (quotes/proformas) that can be sent to clients. Estimates can later be converted to invoices.

### Recurring Documents

Recurring documents automatically create an invoice, expense, or estimate each month, week, or any other time interval. Configurable start date, frequency, and action on scheduled date.

### Tax ID Validation

Tax ID validation allows verifying VAT numbers and other tax identifiers against official registries (e.g., EU VIES).

### Tax Jurisdiction Management

Manage the jurisdictions where a business is registered for tax collection. Track tax registration thresholds and permanent establishments.

### Tax Reporting

Download reports that simplify your tax filing process. The Reporting API works asynchronously — you create a Request object, and then get the report when it's ready. Reports include tax summaries by country or state.

### Checkout Sessions

A Checkout Session represents your customer's session as they pay for one-time purchases or subscriptions through Quaderno Checkout. Sessions can be created and managed programmatically. Abandoned checkout sessions are automatically removed after seven days of inactivity.

### E-Invoicing

E-invoicing compliance with multiple countries, just with one API call. Supports delivery to external systems like TicketBAI and Verifactu (Spain).

### Quaderno Connect

Build platforms or marketplaces where you manage tax compliance on behalf of connected accounts. Supports both Standard (OAuth-based) and Custom account types.

## Events

Quaderno supports webhooks for real-time event notifications. Quaderno uses HTTPS to send real-time notifications to your app as a JSON payload. You can use these notifications to execute actions in your backend systems. Webhooks are created via the API or dashboard, and require an HTTPS endpoint that responds with `200 OK`. Quaderno signs all webhook events with an `X-Quaderno-Signature` header using HMAC-SHA1 for verification.

### Account Events

- `account.updated` – Account status or property changes.
- `account.application.deauthorized` – A user deauthorizes an application.

### Checkout Events

- `checkout.succeeded` – Checkout session completed successfully.
- `checkout.failed` – Checkout session fails.
- `checkout.abandoned` – Checkout session abandoned by customer.

### Contact Events

- `contact.created` – New contact created.
- `contact.updated` – Contact property changes.
- `contact.deleted` – Contact deleted.

### Invoice Events

- `invoice.created` – New invoice created (sent before payments are recorded).
- `invoice.updated` – Invoice changes.

### Receipt Events

- `receipt.created` – New receipt created (sent before payments are recorded).
- `receipt.updated` – Receipt changes.

### Credit Note Events

- `credit.created` – New credit note created.
- `credit.updated` – Credit note changes.

### Expense Events

- `expense.created` – New expense created.
- `expense.updated` – Expense changes.
- `expense.deleted` – Expense deleted.

### Payment Events

- `payment.created` – New payment recorded.
- `payment.deleted` – Payment deleted.

### Delivery Events

- `delivery.succeeded` – Document successfully delivered (e.g., e-invoice).
- `delivery.failed` – Document delivery fails.
- `delivery.rejected` – Document delivery rejected.

### Reporting Events

- `reporting.request.succeeded` – Requested report completed successfully.
- `reporting.request.failed` – Requested report failed.

### Tax Threshold Events

- `threshold.warning` – A tax threshold is about to be reached in a jurisdiction.
- `threshold.exceeded` – A tax threshold has been reached.
- `threshold.eu.100k` – EU digital services sales reach €100,000 (EU-based sellers only).
