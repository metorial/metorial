Now I have a clear picture. Let me note that there are actually **two distinct products** named "Wave" here:

1. **Wave Financial (WaveApps)** — the accounting/invoicing software with a GraphQL API and OAuth 2.0
2. **Wave (wave.com)** — the mobile money/payments platform (Africa-focused) with a REST API and API keys

Given the user asked about "Wave" without further specification, and given these are two very different products, let me clarify. The more commonly referenced "Wave" in integration contexts is **Wave Financial (WaveApps)** — the accounting platform. However, wave.com is a separate mobile money platform. Let me research Wave Financial's features more specifically to distinguish properly.Now I have enough information to write the specification. Important clarification: "Wave" commonly refers to **Wave Financial (WaveApps)** — the small business accounting platform. There's also **Wave (wave.com)**, a mobile money platform in Africa. Since the user simply said "Wave" and in the integration context Wave Financial is the more common one, I'll focus on **Wave Financial (WaveApps)**.

# Slates Specification for Wave

## Overview

Wave Financial (WaveApps) is a free accounting and invoicing platform for small businesses. It provides accounting, invoicing, receipt scanning, and payment processing capabilities. The API is built on GraphQL and allows programmatic access to business financial data including customers, invoices, accounts, products, and transactions.

## Authentication

Wave uses **OAuth 2.0** (Authorization Code flow) for API authentication.

### Setup

1. Register an application in the Wave Developer Portal to obtain a **Client ID** and **Client Secret**.
2. Configure one or more redirect URIs in the application settings.

### OAuth 2.0 Flow

1. **Authorization**: Redirect users to `https://api.waveapps.com/oauth2/authorize/` with the following parameters:
   - `client_id` — Your application's Client ID
   - `response_type` — Set to `code`
   - `redirect_uri` — Must match a whitelisted redirect URI
   - `scope` — Space-separated list of requested scopes

2. **Token Exchange**: POST to `https://api.waveapps.com/oauth2/token/` with the authorization code to receive an `access_token` and `refresh_token`.

3. **API Requests**: Include the access token as a Bearer token in the `Authorization` header when making requests to the GraphQL endpoint at `https://gql.waveapps.com/graphql/public`.

4. **Token Refresh**: POST to `https://api.waveapps.com/oauth2/token/` with the refresh token to obtain a new access token. The previous access token is invalidated upon refresh.

5. **Token Revocation**: POST to `https://api.waveapps.com/oauth2/token-revoke/` to revoke tokens.

### Scopes

Scopes control the level of access your application requests. Available scopes follow a `resource:permission` pattern (e.g., `account:read`, `account:write`). A full list is available in the Wave Developer Portal under OAuth Scopes.

### Important Considerations

- Users can only grant access to businesses that have an active **Pro** or **Wave Advisor** subscription.
- If a business's subscription lapses, token refresh will fail with a 403 error.
- You can send a user through the OAuth flow multiple times to access different businesses or upgrade scopes.

## Features

### Business Management

- Query businesses associated with the authenticated user, including business type, subtype, and address information.
- Each business is a separate entity with its own chart of accounts, customers, and financial data; most API operations are scoped to a specific business.

### Chart of Accounts

- Create, update, and archive accounts in a business's chart of accounts.
- Accounts are categorized by type (Asset, Liability, Equity, Income, Expense) and subtype (e.g., Cash and Bank, Accounts Receivable, Credit Card).
- Accounts cannot be deleted, only archived.

### Customer Management

- Create, update, and delete customers associated with a business.
- Customer records include contact details, address, shipping details, currency preference, and internal notes.
- Customers can be listed, sorted, and filtered.

### Vendor Management

- Query vendors associated with a business, including contact and shipping details.
- Vendor records are similar in structure to customer records.

### Invoice Management

- Create, update, clone, delete, approve, send, and mark invoices as sent.
- Invoices support line items with products, quantities, prices, taxes, and discounts.
- Invoices can be configured with custom titles, footers, memos, PO numbers, and due dates.
- Supports enabling/disabling credit card and bank payment options per invoice.
- Invoice statuses track the lifecycle (draft, sent, viewed, paid, overdue, etc.).

### Estimates

- Create and manage estimates (approximate bills) for customers that are not yet requests for payment.

### Product/Service Catalog

- Create, update, and archive products and services.
- Products can be listed, sorted, and paginated.

### Sales Tax Management

- Create, update, and archive sales tax entries.
- Sales taxes support rate changes with effective dates.
- Taxes can be applied to invoice line items.

### Money Transactions

- Create financial transactions by specifying an anchor account (bank/credit card) and categorization line items.
- Transactions use simplified DEPOSIT/WITHDRAWAL directions for the anchor and INCREASE/DECREASE for line items.
- Line item amounts must balance against the anchor account amount.
- Querying or editing existing transactions is limited; the API primarily supports creating new transactions.

### User Information

- Retrieve the authenticated user's profile information including default email.

## Events

The provider does not support webhooks or event subscriptions through the Wave Financial (WaveApps) GraphQL API. There is no built-in webhook or event notification system for accounting events such as invoice changes, customer updates, or transaction creation.

**Note**: Wave's separate mobile money product (wave.com) does support webhooks for payment events, but this is a different product and API from the Wave Financial accounting platform described here.
