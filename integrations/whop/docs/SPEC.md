Now I have enough information to write the specification. Let me compile everything.

# Slates Specification for Whop

## Overview

Whop is a platform for selling digital products, memberships, and subscriptions. It provides APIs for accepting payments, managing payouts, building apps, and embedding real-time chat. The API covers the full commerce lifecycle including checkout, memberships, invoicing, refunds, disputes, and content delivery (courses, forums).

## Authentication

Whop supports two authentication methods:

### API Keys

There are two types of API keys: a Company API key for accessing company data, and an App API key for accessing data across all the companies that use your Whop apps. API keys are created in the Whop developer dashboard. To make authenticated requests you need to include your API key in the Authorization header using the Bearer scheme, e.g.:

```
Authorization: Bearer YOUR_API_KEY
```

The base API URL is `https://api.whop.com/api/v1`.

Accepted credential types include: a company API key, company-scoped JWT, app API key, or user OAuth token.

### OAuth 2.1 + PKCE

Use OAuth tokens when you want users to sign in with their Whop account and grant your app permission to act on their behalf. Unlike API keys which use your app's permissions, OAuth tokens are scoped to what each individual user can access. OAuth tokens are obtained through the OAuth 2.1 + PKCE flow.

The OAuth flow works as follows:

1. Send users to the Whop OAuth portal at `https://whop.com/oauth` with your `client_id` and `redirect_uri` parameters. The user will be prompted to sign in or create a Whop account.
2. When the user returns, exchange the authorization code for an access token by making a request to `https://data.whop.com/oauth/token` with your Client ID, Client Secret, the authorization code, redirect URI, and `grant_type` of `authorization_code`.
3. Use the access token to make API requests on behalf of the user, for example to retrieve profile information via `/me` or check membership status.

Obtain your Client ID and Client Secret from the Whop developer settings dashboard.

## Features

### Products and Plans Management

Create, update, list, and delete products that represent what customers purchase access to. Plans represent pricing and release method configurations for a product. Multiple plans can be created for different billing periods, discounts, or release strategies.

### Payments and Checkout

The API can be used to programmatically accept payments, issue refunds, handle disputes, create invoices, and send payouts. There are two main ways to accept payments: checkout links (shareable URLs) and embedded checkouts (checkout boxes integrated into your website). You can also save payment methods and charge customers off-session for recurring billing.

- Create and configure checkout sessions with metadata, redirect URLs, and mode (payment or setup).
- Manage payment methods, setup intents, and invoices.

### Memberships

Experiences represent what the customer receives or unlocks when they purchase a Membership. Memberships can be listed, retrieved, updated, canceled, uncanceled, paused, and resumed. Memberships include software license keys if the product includes a Whop Software Licensing experience. Custom metadata can be attached to memberships.

### Members and Users

Manage company members and retrieve user information. Members represent the relationship between a user and a company. The API allows listing and retrieving member data including associated memberships.

### Promo Codes

A promo code applies a discount to a plan during checkout. Promo codes can be percentage-based or fixed-amount, and can have usage limits and expiration dates. They can be scoped to specific products or plans, restricted to new users only, existing memberships only, or churned users only.

### Payouts and Financial Operations

Automate payouts via API — send funds to users by Whop username, ID, or wallet, straight from your ledger account. The API supports ledger accounts, transfers, withdrawals, payout methods, verifications, payout accounts, and top-ups.

### Disputes and Refunds

Manage payment disputes, dispute alerts, and resolution center cases. Issue refunds for processed payments.

### Chat and Messaging

Manage chat channels, support channels, messages, reactions, DM channels, DM members, and notifications. Forums and forum posts are also available for community management.

### Courses

Create and manage courses, chapters, and lessons. Track course students and lesson interactions.

### Leads, Entries, and Waitlists

Manage leads, waitlist entries, and shipments related to your products.

### Reviews

Access and manage customer reviews for products.

### Apps

Build and distribute Whop apps. Manage app builds, files, and app installations across companies. Access tokens and account links are available for app-level integrations.

## Events

Whop supports webhooks to receive payment, membership, and other events programmatically. Whop follows the Standard Webhooks spec to send webhooks. There are two webhook modes:

- **Company webhooks**: Receive events only for your own company. No special permissions required.
- **App webhooks**: Allow your app to receive webhooks for events that happen on companies that have your app installed. Use this mode if you are processing payments on behalf of other companies.

Webhooks are configured in the Whop dashboard by providing a URL and selecting which event types to subscribe to. Each webhook provides a secret key for signature validation.

### Payment Events

- **payment.succeeded** — Fires when a payment is successful, for both new and existing memberships.
- **payment.failed** — Fires whenever a payment attempt fails, usually due to insufficient funds or crypto payment issues.

### Membership Events

- **membership.activated** — Fires when a membership becomes valid, typically when a membership is created or a user checks out.
- **membership.deactivated** — Fires when a membership becomes invalid, typically when a subscription is canceled or the membership expires.
- **membership.cancel_at_period_end_changed** — Fires when the cancel-at-period-end setting on a membership changes.

### Entry Events

- **entry.created** — Fires when someone joins a waitlist.

### Setup Intent Events

- **setup_intent.succeeded** — Fires when a customer saves their payment method via a setup intent.
