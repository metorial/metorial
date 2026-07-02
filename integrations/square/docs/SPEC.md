Now let me get the full list of webhook event types and the OAuth scopes:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Square

## Overview

Square is a financial services and commerce platform that provides APIs for payment processing, order management, customer relationship management, inventory tracking, team management, and more. It serves sellers of all sizes, enabling them to accept payments online, in-app, and in-person, and manage various aspects of their business operations through a unified platform.

## Authentication

Square supports two authentication methods:

### 1. Personal Access Token

A personal access token provides unrestricted Square API access to resources in a Square account. It can be used in Square API calls to perform any activity on any resource in your own Square account. For custom integrations that only access your own Square account, personal access tokens are suitable for production use.

- Personal access tokens are obtained from the Developer Console under the **Credentials** page.
- Access tokens are sent as bearer tokens in the `Authorization` header of Square API requests.
- Base URL (Production): `https://connect.squareup.com/v2`
- Base URL (Sandbox): `https://connect.squareupsandbox.com/v2`

### 2. OAuth 2.0

The Square OAuth API uses the OAuth 2 protocol to obtain permission from Square sellers to access specific types of resources in their account. In production environments, multi-tenant applications that serve multiple sellers should use OAuth access tokens.

**Endpoints:**

- Authorization URL: `https://connect.squareup.com/oauth2/authorize`
- Token URL: `https://connect.squareup.com/oauth2/token`
- Revoke URL: `https://connect.squareup.com/oauth2/revoke`

**Credentials Required:**

- `client_id` — The ID associated with an application, called the Application ID in the Developer Console on the OAuth page.
- `client_secret` — The secret associated with an application, used to redeem refresh tokens. Called the Application secret in the Developer Console on the OAuth page.

**Flows:**

- **Code Flow:** Requires a confidential client to pass in `client_id` and `client_secret` when redeeming an authorization code.
- **PKCE Flow:** For public clients, replaces `client_secret` with a `code_verifier`. Must be used by mobile, single-page, and native desktop applications.

**Token Lifecycle:**

- Access tokens expire after 30 days. Short-lived tokens can be configured to expire in 24 hours.
- Refresh tokens obtained using the code flow don't expire.
- Refresh tokens obtained using the PKCE flow are single-use tokens and expire after 90 days.

**Scopes:**
Scopes are passed as a space-separated list in the `scope` parameter of the authorization URL. Key scope categories include:

- `MERCHANT_PROFILE_READ` — Read merchant profile
- `PAYMENTS_READ`, `PAYMENTS_WRITE` — Read/manage payments
- `ORDERS_READ`, `ORDERS_WRITE` — Read/manage orders
- `CUSTOMERS_READ`, `CUSTOMERS_WRITE` — Read/manage customers
- `ITEMS_READ`, `ITEMS_WRITE` — Read/manage catalog items
- `INVENTORY_READ`, `INVENTORY_WRITE` — Read/manage inventory
- `INVOICES_READ`, `INVOICES_WRITE` — Read/manage invoices
- `APPOINTMENTS_READ`, `APPOINTMENTS_WRITE` — Read/manage bookings
- `EMPLOYEES_READ`, `EMPLOYEES_WRITE` — Read/manage team members
- `TIMECARDS_READ`, `TIMECARDS_WRITE` — Read/manage timecards
- `BANK_ACCOUNTS_READ` — Read bank accounts
- `LOYALTY_READ`, `LOYALTY_WRITE` — Read/manage loyalty programs
- `GIFTCARDS_READ`, `GIFTCARDS_WRITE` — Read/manage gift cards
- `SUBSCRIPTIONS_READ`, `SUBSCRIPTIONS_WRITE` — Read/manage subscriptions
- `DISPUTES_READ`, `DISPUTES_WRITE` — Read/manage disputes
- `DEVICE_CREDENTIAL_MANAGEMENT` — Manage device credentials
- `PAYOUTS_READ` — Read payouts
- `ONLINE_STORE_SITE_READ`, `ONLINE_STORE_SNIPPETS_READ`, `ONLINE_STORE_SNIPPETS_WRITE` — Manage Square Online

See the [OAuth Permissions Reference](https://developer.squareup.com/docs/oauth-api/square-permissions) for a full list.

## Features

### Payment Processing

Process online, in-app, and in-person payments. Manage disputes and subscriptions and perform other payment-related tasks. Supports credit/debit cards, Google Pay, Apple Pay, Afterpay, Cash App, and ACH bank transfers. Includes delayed capture (authorize then complete/cancel) and payment tracking.

### Checkout

A simple API call allows an application to get a URL to a Square-hosted checkout page for a buyer to pay for goods and services. Supports quick-pay links (name + price) and full order-based checkouts with tipping, subscriptions, and multiple payment methods.

### Orders Management

Allows sellers to process orders, manage catalogs, track inventory, and book reservations. Orders can include line items, taxes, discounts, fulfillments (pickup, shipment, delivery), and tips. Orders are the central object connecting payments, invoices, and catalog items.

### Catalog & Inventory

Manage a seller's item library including items, variations, categories, taxes, discounts, modifiers, and images. Track inventory counts across locations with adjustments and transfers. Catalog changes from any source (API, Dashboard, POS) are tracked.

### Customer Management

Securely manage customer data and integrate engagement features. Create and manage customer profiles and sync CRM systems with Square. Supports customer groups, segments, and custom attributes.

### Invoices

Create, configure, and publish invoices for orders created using the Orders API. Invoices support scheduled payments, reminders, and multiple payment methods.

### Subscriptions

Create and manage subscriptions. Define subscription plans in the catalog and charge buyers on a recurring cadence using cards on file.

### Bookings / Appointments

Create and manage bookings for Square sellers. Supports service appointments with custom attributes.

### Gift Cards & Loyalty

Manage gift card creation, activation, loading, and redemption. Create and manage loyalty programs, accounts, promotions, and accrual/redemption events.

### Team Management

Enable team management with scheduling, timecards, and payroll support. Manage team members, job assignments, wage settings, scheduled shifts, and timecards (clock-in/clock-out).

### Refunds

Manage and issue refunds for payments made to Square sellers. Supports partial and full refunds for various payment types.

### Disputes

Use the Disputes API to manage disputes (chargebacks). View dispute details, submit evidence, and accept disputes.

### Cards on File

Save a credit or debit card on file. Cards on file can be used for future payments, subscriptions, and invoices.

### Bank Accounts & Payouts

Get a list of a seller's bank accounts. Get a list of deposits and withdrawals from a seller's bank accounts.

### Locations & Merchants

Retrieve information about an organization that sells with Square. Create and manage the locations of a seller's business. Supports custom attributes for both merchants and locations.

### Devices & Terminal

Create device codes used to connect Square Terminal with a 3rd-party point of sale system, and get details about all connected Terminals. Request checkouts and refunds on paired Square Terminal devices.

### Vendors

Manages a seller's suppliers. Create, update, and retrieve vendor/supplier information for inventory management.

### Square Online

Get details about Square Online sites. Manage snippets for Square Online sites.

### Custom Attributes

Extend Square objects (bookings, customers, orders, locations, merchants) with custom attribute definitions and values. Custom attributes support visibility controls (owner-only, read-only, read-write).

## Events

Square supports webhooks — a subscription that registers a notification URL and a list of event types to be notified about. When an event occurs, Square collects data about the event, creates an event notification, and sends it to the notification URL for all webhook subscriptions that are subscribed to that event. Webhooks can be managed via the Developer Console or the Webhook Subscriptions API.

Events can originate from the Square Dashboard, a Point of Sale (POS) application, other Square products, and third-party applications calling Square APIs.

### Payment Events

Notifications when payments are created or updated (completed, authorized, canceled, voided). Includes status changes for ACH and card payments.

### Refund Events

Notifications when refunds are created or updated (typically status changes upon completion).

### Order Events

Notifications when orders are created or updated, and when order fulfillments are created or updated.

### Customer Events

Notifications when customer profiles are created, updated, or deleted.

### Catalog Events

A single `catalog.version.updated` event fires whenever any catalog object is created, updated, or deleted.

### Inventory Events

Notifications when inventory counts are updated for catalog item variations.

### Invoice Events

Notifications for invoice lifecycle events: created, published, updated, canceled, deleted, payment made, refunded, and scheduled charge failed.

### Booking Events

Notifications when bookings are created or updated/cancelled.

### Subscription Events

Notifications when subscriptions are created or updated (status changes like active, canceled).

### Loyalty Events

Notifications for loyalty account changes (created, updated, deleted), loyalty events, and loyalty program/promotion changes.

### Gift Card Events

Notifications for gift card creation, updates, customer linking/unlinking, and gift card activity creation/updates.

### Card Events

Notifications for cards on file: created, updated, disabled, automatically updated (PAN/expiration), and forgotten (GDPR).

### Dispute Events

Notifications when disputes are created, evidence is added or removed, and dispute state changes (including resolution).

### Team Events

Notifications when team members are created or updated, jobs are created or updated, and wage settings are updated.

### Labor Events

Notifications for timecard lifecycle (created, updated, deleted) and scheduled shift events (created, updated, deleted, published).

### Terminal Events

Notifications for terminal actions, checkouts, and refunds being created or updated.

### Payout Events

Notifications when payouts are sent, paid (completed), or failed.

### Bank Account Events

Notifications when bank accounts are created, verified, or disabled.

### Location Events

Notifications when locations are created or updated.

### Vendor Events

Notifications when vendors (suppliers) are created or updated.

### OAuth Events

Notification when a seller revokes all access tokens and refresh tokens granted to an application (`oauth.authorization.revoked`).

### Checkout Settings Events

Notifications when online checkout location or merchant settings are updated.

### Custom Attribute Events

Notifications for custom attribute and custom attribute definition changes across bookings, customers, orders, locations, and merchants. Supports scoping by ownership (owned by your app) or visibility (visible to your app).

### Transfer Order Events

Notifications when transfer orders are created, updated, or deleted.
