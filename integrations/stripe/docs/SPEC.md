# Slates Specification for Stripe

## Overview

Stripe is a payment processing and financial infrastructure platform that provides APIs for accepting payments, managing subscriptions and billing, sending payouts, handling invoices, and building financial workflows. Stripe provides a unified set of REST APIs for accepting payments, managing billing and subscriptions, sending payouts, and building financial workflows.

## Authentication

Stripe supports two primary authentication methods:

### 1. API Keys

The Stripe API uses API keys to authenticate requests. API keys are passed via HTTP Basic Auth as the username (with an empty password) or as a Bearer token in the `Authorization` header.

After you create a Stripe account, we generate two pairs of API keys—a publishable client-side key and a secret server-side key—for both testing in a sandbox and in live modes.

There are three types of API keys:

- **Secret keys** (prefix `sk_live_` or `sk_test_`): Full access to the API. Used server-side only. All API requests must be made over HTTPS.
- **Publishable keys** (prefix `pk_live_` or `pk_test_`): Used in client-side code (e.g., Stripe.js) for tokenizing payment information. Limited to specific safe operations.
- **Restricted keys** (prefix `rk_live_` or `rk_test_`): For each resource you want the new key to access, select the appropriate permission: None, Read, or Write. Created in the Dashboard with granular, per-resource permissions. Instead of using secret API keys with broad access, you can create restricted API keys to assign specific privileges to people and systems. For example, you can give your invoicing system the ability to manage invoices and nothing else.

The API key you use to authenticate the request determines whether the request is live mode or test mode.

Example:

```
curl https://api.stripe.com/v1/charges \
  -u sk_test_YOUR_SECRET_KEY:
```

### 2. OAuth 2.0 (Stripe Connect)

Used for platforms that need to act on behalf of connected Stripe accounts. On Stripe's website, the user provides the necessary information for connecting to your platform. The user is redirected to your site, along with an authorization code. Your site then makes a request to Stripe's OAuth token endpoint to complete the connection and fetch the user's account ID.

- **Authorization URL**: `https://connect.stripe.com/oauth/authorize`
- **Token URL**: `https://connect.stripe.com/oauth/token`
- **Scopes**: `read_write` (full access) or `read_only` (read-only access). The scope parameter dictates what your platform can do on behalf of the connected account, with read_only being the default.
- Required parameters: `response_type=code`, `client_id` (your platform's Connect Client ID), `scope`, and `redirect_uri`.
- To prevent CSRF attacks, add the state parameter, passing along a unique token as the value. We'll include the state you gave us when we redirect the user back to your site. Your site should confirm the state parameter hasn't been modified.
- After authorization, exchange the authorization code for the connected account's `stripe_user_id`, which is then used via the `Stripe-Account` header on API calls.

### 3. OAuth 2.0 (Stripe Apps)

For Stripe Apps distributed via the App Marketplace. Your callback URL receives an OAuth authorization code parameter that your backend needs to exchange for an API access token and the refresh token. This authorization code is one-time use only and valid only for 5 minutes, in which your backend needs to exchange the code for the access token.

- Token endpoint: `POST https://api.stripe.com/v1/oauth/token`
- Access tokens expire in 1 hour and must be refreshed using the refresh token.
- Scope is `stripe_apps` and permissions are defined in the app manifest.

## Features

### Payment Processing

Create and manage one-time charges and payments. Supports card payments, bank transfers, digital wallets, and dozens of regional payment methods across multiple currencies. Use PaymentIntents to orchestrate the full payment lifecycle including authorization, capture, and confirmation. Save payment methods for future use via SetupIntents.

### Subscriptions & Recurring Billing

Create and manage subscription plans with flexible billing cycles. Handle upgrades, downgrades, trials, pausing, and cancellations. Supports metered/usage-based billing. Automatically generates invoices for subscription cycles and handles failed payment retries.

### Invoicing

Create, send, and manage invoices programmatically. Supports draft, finalized, paid, void, and uncollectible states. Invoices can be sent directly to customers with hosted payment pages or used for manual/offline billing.

### Customer Management

Create and manage customer records including contact information, payment methods, and billing settings. Attach multiple payment methods to a customer. Track customer balance and credit.

### Products & Prices

Define a product catalog with associated prices. Supports one-time and recurring pricing models, tiered pricing, and multiple currencies per product.

### Connect (Platform & Marketplace)

Build platforms and marketplaces where your users can accept payments. Manage connected accounts (Standard, Express, or Custom), handle onboarding, and control fund flows. Split payments between platform and connected accounts. Manage payouts to connected accounts.

### Payouts

Transfer funds from your Stripe balance to external bank accounts or debit cards. Configure automatic or manual payout schedules.

### Refunds & Disputes

Issue full or partial refunds on payments. Manage charge disputes (chargebacks) including submitting evidence.

### Checkout & Payment Links

Create hosted checkout sessions or shareable payment links for accepting one-time or recurring payments without building a custom payment form.

### Coupons & Promotions

Create discount coupons and promotion codes that can be applied to invoices, subscriptions, or checkout sessions. Supports percentage-based and fixed-amount discounts with configurable duration and redemption limits.

### Reporting & Balance

Access your Stripe balance information, view balance transactions, and generate financial reports. Track funds across available, pending, and reserved states.

### Fraud Prevention (Radar)

Built-in machine-learning fraud detection. Create custom rules to block, allow, or review payments based on risk signals.

### Tax

Automatically calculate and collect taxes on transactions. Supports tax rates, tax IDs, and tax reporting.

### Billing Portal

Provide customers with a self-service portal to manage their subscriptions, payment methods, and billing history.

### File Uploads

Upload files (e.g., dispute evidence, identity documents) to Stripe for use with various API resources.

### Issuing

Create and manage virtual and physical payment cards programmatically. Control spending with real-time authorization rules.

### Treasury

Provide financial accounts (store-of-value) with features like fund management, money movement, and account details for building embedded banking experiences.

## Events

Stripe webhooks are HTTP callbacks that deliver real-time notifications about events in your Stripe account. When a customer completes a payment, disputes a charge, or a subscription trial ends, Stripe sends an HTTP POST request to your configured endpoint with detailed event data.

Set up event destinations to receive events from Stripe that you can direct to a webhook endpoint or other listening service, such as Amazon EventBridge. Stripe generates over 200 different webhook event types. Events follow the naming pattern `resource.action` (e.g., `charge.succeeded`). You can register and create one endpoint to handle several different event types at the same time, or set up individual endpoints for specific events.

Webhook endpoints are configured via the Stripe Dashboard or the API. Each endpoint receives a signing secret used to verify event authenticity. Events can be received as snapshot events (containing the full object state) or thin events (containing only the object ID).

### Event Categories

- **Account Events**: Account status changes, capability updates, and external account modifications.
- **Balance Events**: Occurs whenever your Stripe balance has been updated (e.g., when a charge is available to be paid out).
- **Charge Events**: Charge creation, capture, success, failure, refund, and dispute lifecycle events.
- **Checkout Events**: Checkout session completion and expiration.
- **Customer Events**: Customer creation, update, deletion, and changes to sources, subscriptions, and payment methods.
- **Dispute Events**: Dispute creation, updates, closure, and fund management.
- **Invoice Events**: Invoice creation, finalization, payment success/failure, voiding, and becoming overdue.
- **Payment Intent Events**: PaymentIntent creation, success, failure, cancellation, and events requiring further action.
- **Payment Method Events**: Attachment, detachment, and update of payment methods.
- **Payout Events**: Payout creation, success, failure, and cancellation.
- **Price & Product Events**: Price and product creation, updates, and deletions.
- **Subscription Events**: Occurs whenever a customer is signed up for a new plan. Occurs whenever a customer's subscription ends. Occurs whenever a customer's subscription is paused. Also includes trial expiration, pending updates, and resumption.
- **Setup Intent Events**: Setup intent success, failure, and cancellation.
- **Transfer Events**: Transfer creation, update, and reversal.
- **Radar / Fraud Events**: Early fraud warnings created and updated.
- **Billing Meter Events**: Meter creation, update, deactivation, and reactivation.
- **Issuing Events**: Card creation, authorization, and transaction events.
- **Tax Events**: Tax settings and registration changes.
- **Identity Events**: Verification session events.
- **Application Events**: Authorization and deauthorization of connected applications.
