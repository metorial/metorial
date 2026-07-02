Now let me get the full list of webhook events:Now let me get more details on the API reference to understand all the features:Now I have comprehensive information to write the specification. Let me compile it.

# Slates Specification for Proabono

## Overview

ProAbono is a subscription management and recurring billing platform designed for SaaS businesses. It automates subscription lifecycle management including online enrollment, invoicing, payment collection, and customer portal hosting. The platform provides two REST APIs (Live and BackOffice) for integration with external applications.

## Authentication

ProAbono uses HTTP Basic Access authentication, secured via HTTPS. All API requests must be made over HTTPS, server-to-server only.

**Credentials required:**

- **Agent Key** — corresponds to the Basic Access "Username" field.
- **API Key** — corresponds to the Basic Access "Password" field.
- **API Endpoint** — the base URL for API calls (e.g., `https://api-{id}.proabono.com` for the Live API, or `https://via.proabono.com` for the BackOffice API).

The keys are only available from the BackOffice interface under "My Profile" > Integration > API.

**Building the Authorization header:**

Concatenate the Agent Key and API Key separated by `:`, then Base64-encode the result string. Include it in the request header as `Authorization: Basic {encoded_string}`.

When using the BackOffice API, the endpoint may include an `idBusiness` query parameter (e.g., `https://via.proabono.com?idBusiness=1234`), which must be provided separately.

The keys are not directly linked to a user account but represent the equivalent of a service account.

## Features

### Customer Management

Create, retrieve, update, and list customers in ProAbono. Customers are identified by a unique `ReferenceCustomer` that maps to your application's user identifier. You can store metadata (up to 5 key/value pairs), set customer language, and track affiliations. Customers can be suspended (blocking all portal access and billing), anonymized (for GDPR compliance), or have their encrypted portal links revoked.

- Billing address and payment settings can be managed per customer.
- Payment types include card, direct debit, bank transfer, check, and cash.
- Creating a customer automatically returns encrypted links for the hosted customer portal.

### Subscription Management

Create, start, suspend, upgrade, terminate, and list subscriptions tied to customers and offers. Subscriptions are copies of offers at the time of subscription and support extensive customization at creation time.

- Override trial periods, upfront fees, recurring amounts, billing frequency, features, and discounts when creating a subscription.
- Schedule subscriptions to start in the future or backdate them for migration purposes.
- Upgrade subscriptions to a different offer, either immediately or at the next renewal.
- Terminate subscriptions immediately or at the end of the current billing period.
- Supports minimum commitment periods (engagement), termination fees, and limited renewal counts.
- A migration mode allows importing existing subscriptions without billing the first period.

### Feature & Usage Tracking

Define features within offers (modules, user limits, consumption quotas) and track usage per customer per subscription. Features come in three types: OnOff (toggle), Limitation (counted, not reset at renewal), and Consumption (counted, reset at renewal).

- Retrieve all usages for a customer to determine what they can access.
- Update usage by increment, by setting an absolute quantity, or by toggling on/off.
- Supports bulk usage updates (up to 50 per request).
- List all customers using a specific feature with their current usage data.

### Offer Management

Retrieve and display offers (pricing plans) configured in ProAbono. Offers include pricing details, recurring amounts, trial periods, upfront fees, and nested feature definitions with localized labels and pricing text.

- Retrieve offers for a specific customer (localized to their language with personalized links).
- Retrieve upgrade-eligible offers for a customer with existing subscriptions.
- Filter by pricing table reference or offer reference prefix.
- Supports multi-language and multi-currency via segments.

### Quoting & Pricing

Compute exact pricing (including taxes) before performing actions like creating a subscription, upgrading, starting, or updating usage. This ensures customers see the correct charge before confirming.

- Quote subscription creation, overrides, starts, and upgrades.
- Quote usage changes with optional next-term cost preview.
- Quote one-time balance line charges.

### Balance & One-Time Charges

Add custom debit or credit lines to a customer's balance for charges outside of standard subscription billing (e.g., consulting hours, one-time fees). Balance lines appear on the next invoice.

- List balance lines filtered by customer, subscription, feature, or segment.
- Retrieve aggregated balance totals.

### Invoice Management

Retrieve and list invoices for customers or subscriptions. Invoices include status tracking (Draft, Due, Paid, Problem, Void, Uncollectible), payment type, and encrypted links to PDF downloads.

- Trigger on-demand billing of a customer's balance to generate an invoice.
- Filter invoices by date range and force offline payment mode.
- Add custom notes to invoices.
- Access encrypted links for invoice PDFs and payment pages.

### Hosted Pages & Customer Portal

ProAbono provides hosted pages for subscription workflows, pricing tables, and a customer self-service portal. The API returns encrypted, expiring links for embedding these pages in your application.

- Customer portal allows subscribers to view subscriptions, upgrade, manage payment info, and download invoices.
- Subscription workflows guide customers through plan selection and payment.
- Links are unique per customer and should not be stored (request fresh links via API each time).

## Events

ProAbono supports webhooks, a notification system that transmits data from ProAbono to another application in real-time without the need for a request. You provide a callback URL endpoint and select the events you want to be notified about. ProAbono requires a validation step to confirm webhook activation, verifying that the destination URL is controlled by you. Webhooks can be secured using a SHA-256 signature verification with a shared secret key.

### Customer Events

Notifications related to customer lifecycle and billing activities:

- **Customer added** — A new customer is created.
- **Billing address updated** — A customer's billing address changes.
- **Payment settings updated** — A customer's payment method changes.
- **Billing succeeded/failed** — A customer's billing succeeds or fails.
- **Charging succeeded/pending/failed** — Payment charge status changes.
- **Auto charging failures** — Auto charge fails due to no valid payment method or exhausted retries.
- **Customer suspended/enabled** — Customer account is suspended or re-enabled (agent/API only).
- **Added to gray list** — Suspicious behavior detected on payment forms.

### Subscription Events

Notifications related to subscription lifecycle changes:

- **Subscription started** — A subscription begins.
- **Subscription renewed** — Automatic renewal occurs.
- **Subscription suspended** — Suspended by customer, due to missing payment info, or due to unpaid invoices.
- **Subscription restarted** — A suspended subscription is restarted.
- **Subscription terminated at renewal / terminated** — Termination requested or finalized.
- **Subscription ended** — A time-limited subscription reaches its renewal limit.
- **Subscription deleted** — A subscription is deleted (agent/API only).
- **Subscription updated** — General subscription updates (excluding feature and term date changes).
- **Features updated** — A subscription's feature is modified.
- **Subscription upgraded / terminated for upgrade** — A new subscription starts as an upgrade, and the old one is terminated.
- **Date term updated** — The term date of a subscription changes (agent/API only).

### Invoice Events

Notifications related to invoice lifecycle:

- **Invoice issued** — An invoice is created, either with auto payment scheduled or offline payment expected.
- **Invoice paid** — An invoice is paid.
- **Invoice refunded / cancelled** — An invoice is refunded or cancelled (credit note issued).
- **Auto payment failed** — All automatic payment attempts have failed.
- **Auto payment rejected (authentication required)** — Payment requires customer authentication.
- **Invoice overdue** — An unpaid invoice is 60+ days old.
- **Invoice disputed** — A payment is disputed (automatically or manually).
- **Invoice uncollectible** — An invoice is marked as uncollectible.
- **Credit note issued** — A credit note is generated from a cancellation or refund.

### Payment Method Events

Notifications related to customer payment method status:

- **Expiration approaching** — A payment method is about to expire (up to 30 days before).
- **Payment method expired** — A payment method has expired.
- **Defective payment method** — A payment method is no longer usable (stolen card, invalid mandate, etc.).
- **Insufficient funds** — A charge fails due to insufficient funds; ProAbono will retry.
- **Payment issues** — Multiple payment failures detected; the payment method may be disabled on next failure.
