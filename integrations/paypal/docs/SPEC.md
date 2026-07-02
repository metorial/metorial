Now let me get the full list of webhook event categories from PayPal's documentation:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for PayPal

## Overview

PayPal is an online payments platform that enables businesses and individuals to send and receive money, process payments, manage subscriptions, send invoices, and handle payouts. It provides REST APIs for integrating payment processing, order management, invoicing, dispute resolution, and related financial services into applications.

## Authentication

PayPal uses **OAuth 2.0 Client Credentials** for authentication.

### Credentials

PayPal integrations use a **client ID** and **client secret** to authenticate API calls. A client ID identifies an app, and a client secret authenticates that client ID. To call PayPal APIs, you exchange your client ID and client secret for an access token.

### Obtaining Credentials

Log in to the PayPal Developer Portal (https://developer.paypal.com), enter the name of your REST API app, select Merchant or Platform as the type of application, and click Create App. Your credentials (client ID and secret) are displayed on the app details page.

### Token Exchange

Send a POST request to the token endpoint with your client ID and secret using HTTP Basic Auth:

- **Sandbox**: `https://api-m.sandbox.paypal.com/v1/oauth2/token`
- **Production**: `https://api-m.paypal.com/v1/oauth2/token`

The request body must include `grant_type=client_credentials` with content type `application/x-www-form-urlencoded`.

PayPal returns an access token and the number of seconds the access token is valid. Include the access token in the Authorization header: `Authorization: Bearer ACCESS-TOKEN`. When your access token expires, call `/v1/oauth2/token` again to request a new access token.

### Multi-Party / Platform Use

For platform integrations acting on behalf of merchants, a `PayPal-Auth-Assertion` header containing a JWT can be used. To use this header, you must get consent to act on behalf of a merchant. This avoids generating and managing multiple access tokens when acting on behalf of multiple merchants.

### Requirements

You'll need a PayPal Business account to go live with integrations.

## Features

### Orders & Checkout

Create, manage, and capture checkout orders. Supports both immediate capture and authorization-then-capture flows. Orders can be created with one or more purchase units, each with its own amount, items, and shipping details. The intent can be set to `CAPTURE` (immediate) or `AUTHORIZE` (deferred capture).

### Payments (Authorizations, Captures, Refunds)

Accept immediate payments or authorize payments and capture them later. Show details for completed payments, refunds, and authorizations. Make full or partial refunds. Void or re-authorize authorizations.

### Subscriptions & Billing Plans

Create and manage recurring billing through catalog products, billing plans, and subscriptions. Define pricing tiers, trial periods, billing cycles, and frequency. Subscriptions can be activated, suspended, cancelled, and reactivated. Supports tracking failed payments and outstanding balances.

### Invoicing

Create, send, and manage invoices. Invoices can be drafted, scheduled, sent to recipients, and tracked for payment status. Supports recording payments and refunds against invoices, as well as cancellation.

### Payouts

Send payments to multiple recipients simultaneously via batch payouts. Each payout item can target a PayPal email, phone number, or PayPal ID. Supports multiple currencies. Individual payout items can be tracked for status (blocked, held, unclaimed, etc.).

### Disputes

View and manage customer disputes (chargebacks, claims, and inquiries). Provide evidence, accept claims, escalate disputes, and settle or resolve them. Disputes are initiated by buyers and can be managed through the API.

### Payment Method Tokens (Vault)

The Payment Method Tokens API saves payment methods to a digital vault so payers don't have to enter details for future transactions. Supports storing cards and PayPal accounts for returning customers.

### Transaction Search

Search and retrieve transaction history for a PayPal account. Filter by date range, transaction status, amount, and other criteria. Useful for reconciliation and reporting.

### Catalog Products

Create and manage a catalog of products that can be referenced in billing plans and subscriptions. Each product has a name, description, type (physical, digital, service), and category.

### Shipment Tracking

Add and update tracking information for captured payments. Associate carrier and tracking numbers with transactions to provide shipping status to buyers.

### Identity (Log in with PayPal)

Retrieve user profile information (name, email, address, etc.) when users authenticate via PayPal. Requires user consent through an OAuth flow.

### Partner Referrals & Merchant Onboarding

For platforms and marketplaces: onboard sellers/merchants, generate referral links, and track onboarding status. Manage merchant capabilities and account limitations.

### Currency Exchange

Look up exchange rates between PayPal-supported currencies.

## Events

PayPal supports webhooks — HTTPS POST callbacks from PayPal to your server whenever corresponding event types occur. Up to 10 webhook URLs may be subscribed per app. Specific webhook event types may be subscribed for each URL, or alternatively use `*` to subscribe to all event types.

Webhook authenticity can be verified via CRC32 signature verification or by posting back to PayPal's verify-signature endpoint.

### Payment Events

Notifications for payment authorizations, captures, and refunds. Includes events for authorization created/voided, capture completed/pending/declined/refunded/reversed.

### Order & Checkout Events

Events for checkout order lifecycle: order approved by buyer, order completed, and payment approval reversed.

### Subscription & Billing Events

Events covering the full subscription lifecycle: product created/updated, plan created/updated/activated/deactivated, plan pricing changes, subscription created/activated/updated/expired/cancelled/suspended, and subscription payment failures.

### Payout Events

Batch-level events (processing, success, denied) and item-level events (succeeded, failed, blocked, canceled, held, refunded, returned, unclaimed).

### Invoice Events

Events for invoice lifecycle: created, updated, scheduled, paid, refunded, and cancelled.

### Dispute Events

Events for when disputes are created, updated, or resolved.

### Merchant Onboarding Events

Events for merchant/seller onboarding status: onboarding completed, partner consent revoked, managed account created/updated/status changed, account limitations added/lifted/updated/escalated, and negative balance notifications.

### Payment Method Token (Vault) Events

Events for when payment tokens are created, deleted, or deletion is initiated.

### Identity Events

Event for when a user's Log in with PayPal authorization consent is revoked.

### Sales Events

Events for sale lifecycle (legacy Payments V1): sale completed, denied, pending, refunded, or reversed.

### Referenced Payout Events

Events for referenced payout items completed or failed.
