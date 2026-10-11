# Gumroad Integration Specification

## Overview

Gumroad is an e-commerce platform that enables creators to sell digital products (e-books, music, videos, software), physical goods, and subscriptions directly to their audience. It handles payment processing, file delivery, and customer management. The API (v2) provides programmatic access to products, sales, subscribers, licenses, payouts, audience emails, and webhook subscriptions.

## Authentication

Gumroad supports **OAuth 2.0** for authentication.

### Personal Access Token (Single Account)

For accessing only your own Gumroad account, you can generate an access token directly:

1. Sign in to your Gumroad account and go to Advanced Settings, where you'll see a form to create a new application.
2. Provide an application icon, application name, and redirect URI (use `http://127.0.0.1` for personal use).
3. Use the "Generate access token" button to get your access token.
4. Your access token is used in the request header of every request to the API and should be kept secret.

The token is passed as a Bearer token in the `Authorization` header.

### OAuth 2.0 Flow (Multi-Account)

For integrations that access any Gumroad account:

1. Create an application through the advanced settings page.
2. You will be provided with an Application ID (client_id) and Application Secret (client_secret).

**Endpoints:**

- Authorization URL: `https://gumroad.com/oauth/authorize`
- Token URL: `https://gumroad.com/oauth/token`
- Base API URL: `https://api.gumroad.com/v2/`

Scopes are space-separated in the `scope` parameter. Gumroad fixes the scopes an
application may request when the application is created, so a custom OAuth
application created before Gumroad added a scope (for example `edit_emails`,
added in June 2026) fails authorization with `invalid_scope`; create a new
application in that case. A personal access token inherits its application's
scopes, so the same applies to tokens generated from older applications.

**Scopes** ([reference](https://gumroad.com/api#api-scopes)):

The integration requests exactly these scopes:

- `view_profile` – Read public profile information (including the display name) and products
- `edit_products` – Create and manage products, variants, offer codes, custom fields, and license keys
- `view_sales` – Read sales, subscribers, and product sales counts
- `edit_sales` – Refund sales, revoke or restore buyer access, and resend receipts
- `mark_sales_as_shipped` – Mark sales as shipped
- `view_payouts` – Read payouts
- `view_tax_data` – Read the annual earnings summary
- `edit_emails` – Draft, preview, schedule, send, and delete audience emails

Not requested: `account` (broad legacy scope; some endpoints, such as revoking
buyer access, refuse it), `edit_profile` (no profile-editing tools), and the
undocumented legacy `refund_sales` (superseded by `edit_sales`).

Tool gating: read tools for products, categories, reviews, and the user profile
accept any read scope; product, offer code, variant, custom field, and license
key management need `edit_products`; sales and subscribers need `view_sales`;
sale actions need `mark_sales_as_shipped` or `edit_sales`; payouts need
`view_payouts`; earnings need `view_tax_data`; audience emails need
`edit_emails`.

**Token Behavior:**
While Gumroad provides a refresh_token when authenticating a user, the access_token does not expire until it is revoked manually.

## Features

### Product Management

Create, update, publish (enable), unpublish (disable), and delete products, and add, edit, and delete offer codes, variants, and custom fields. New products are saved as drafts unless publishing is requested. Product categories can be listed for categorization, and the public reviews shown on a product page can be read.

### Variant Categories and Variants

Manage variant categories and individual variants on products. You can create, update, and delete variant categories and their options to offer different product configurations (e.g., different tiers or formats).

### Offer Codes

Create, update, and delete discount offer codes for products. Offer codes can be configured as fixed-amount ("cents") or percentage-based discounts, and you can set a maximum number of uses.

### Sales Data

List and filter sales or inspect individual sale records for reporting or reconciliation. Sales can be filtered by date range (after/before parameters). Includes customer details, product information, and transaction amounts.

### Sale Actions

Mark sales as shipped, issue full or partial refunds, revoke or restore a buyer's access without refunding, and resend purchase receipts.

### Audience Emails

List, read, draft, preview, schedule, unschedule, send, and delete audience emails (posts) for all customers and followers, customers only, followers only, or buyers of one product. Drafts are created first; sending publishes immediately to the audience.

### Payouts and Earnings

List historical and upcoming payouts, inspect a payout's sales and transactions, and read the annual earnings summary used for tax reporting.

### Subscriber Management

Manage subscribers and subscription lifecycle events for recurring products. Retrieve a list of subscribers for a specific product or look up individual subscriber details by ID.

### License Verification

Verify, enable, disable, decrement, or rotate license keys for purchase validation in apps. Requires the product ID and license key. Useful for gating access to software or premium content.

### User Profile

See user public information for the authenticated account, including profile details and account metadata.

### Custom Fields

Manage custom fields on products to collect additional information from buyers at checkout.

## Events

Gumroad supports two webhook mechanisms: **Gumroad Ping** and **Resource Subscriptions**.

### Gumroad Ping

Gumroad Ping is a simple alert that notifies you in real time whenever one of your products is purchased. The ping comes in the form of an HTTP POST request to the URL that you specify in your account settings. This is configured in Settings > Advanced by entering a URL in the "Ping endpoint" field. It is a global, account-level webhook that fires on every sale. If the endpoint does not return a 200 HTTP status code, the POST is retried once.

### Resource Subscriptions (API-managed Webhooks)

Resource subscriptions allow you to programmatically subscribe to specific event types via the API. The `resource_name` parameter is required and must be one of: `sale`, `refund`, `dispute`, `dispute_won`, `cancellation`, `subscription_updated`, `subscription_ended`, `subscription_restarted`.

- **Sale** – Triggered when a new purchase is completed.
- **Refund** – Triggered when a sale is refunded.
- **Dispute** – Triggered when a customer opens a payment dispute/chargeback.
- **Dispute Won** – Triggered when a dispute is resolved in the seller's favor.
- **Cancellation** – Triggered when a subscription or order is cancelled.
- **Subscription Updated** – Triggered when a subscription is modified (e.g., tier change, billing update).
- **Subscription Ended** – Triggered when a subscription reaches its end.
- **Subscription Restarted** – Triggered when a previously ended or cancelled subscription is restarted.

Resource subscriptions can be created, listed, and deleted via the API, and each subscription is configured with a `post_url` where events are delivered.
