Now let me get the Greenfield API swagger to understand the full feature set:Let me fetch the Greenfield API swagger to get the complete list of features and webhook events:That didn't return much. Let me try fetching the swagger directly:Now I have enough information to write the specification. Let me compile everything:

# Slates Specification for BTCPay Server

## Overview

BTCPay Server is a free, open-source, self-hosted cryptocurrency payment processor that allows merchants to accept Bitcoin and other cryptocurrencies directly without fees or third-party intermediaries. It is a non-custodial invoicing system where payments go directly to the merchant's wallet. It provides a Greenfield REST API (v1) for headless operation, covering store management, invoicing, wallets, payment requests, pull payments, and more.

## Authentication

BTCPay Server is self-hosted, so the base URL varies per instance (e.g., `https://btcpay.example.com`). The Greenfield API supports two authentication methods:

### API Keys (Recommended)

BTCPay Server's Greenfield API allows users to generate API keys with specific permissions. If you are integrating BTCPay Server into your third-party application, this is the recommended way.

- Users can create a new API key in the BTCPay Server UI under Account → Manage account → API keys.
- The API key is passed via the `Authorization` header: `Authorization: token YOUR_API_KEY`
- If you do not pass any permission then the API key will have unrestricted access.
- API keys support granular, permission-based scoping. Permissions can be scoped to specific stores. Common permissions include:
  - `btcpay.store.cancreateinvoice` — Create invoices
  - `btcpay.store.canviewinvoices` — View invoices
  - `btcpay.store.canmodifystoresettings` — Modify store settings
  - `btcpay.store.canmodifyserversettings` — Server administration
- Permissions can be scoped to a specific store by appending the store ID, e.g., `btcpay.store.cancreateinvoice:STORE_ID`.

**Authorize User UI (OAuth-like flow):**

This allows external applications to request the user to generate an API key with a specific set of permissions by simply generating a URL to BTCPay Server and redirecting the user to it.

The authorize URL is: `https://{instance}/api-keys/authorize` with query parameters:

- `applicationName` — Name of the requesting application
- `permissions` — Array of requested permissions
- `redirect` — URL to receive the API key via POST after authorization
- `applicationIdentifier` — Identifier for matching existing keys
- `selectiveStores` — If `true`, allows the user to select specific stores
- `strict` — If `false`, allows user to modify the requested permissions

If redirect is specified, once the API key is created, BTCPay Server redirects the user via a POST submission to the specified redirect URL, with a JSON body containing the API key, user id, and permissions granted.

### Basic Auth

The Greenfield API allows Basic Auth using traditional user/password credentials. This is however a security risk if the application is a third party as they receive credentials in plain text. Basic Auth should only be used for initial setup tasks like creating API keys programmatically.

## Features

### Store Management

Create, configure, and manage multiple stores on a BTCPay Server instance. Each store in BTCPay Server operates as an independent tenant with its own settings, payment methods, wallets, and user access controls. Stores can have different payment methods (on-chain Bitcoin, Lightning Network, altcoins), checkout appearance settings, and rate providers configured independently.

### Invoice Management

Create and manage payment invoices. Invoices can be configured with amount, currency, order ID, buyer email, custom metadata, expiration time, and payment method restrictions. You can issue a full or partial refund of an invoice. This will return a link where the customer can claim the refund. Invoice statuses include New, Processing, Expired, Invalid, and Settled.

### On-Chain Wallet

Manage the store's on-chain Bitcoin wallet, including viewing balances, generating new receive addresses, viewing transactions, and creating transactions. The wallet is non-custodial — private keys are never stored on the server.

### Lightning Network

Manage Lightning Network payments for a store, including connecting to Lightning nodes (internal or external), creating and paying Lightning invoices, checking balances and channel information. Supports LNURL-Pay and Lightning Addresses.

### Payment Requests

Create shareable payment request pages with customizable content. Payment requests support optional expiry and automatically update exchange rates when the customer pays. Useful for freelancers, bill pay, or requesting money.

### Pull Payments and Payouts

Create pull payments — long-lived payment offers from which recipients can pull funds at their convenience. The merchant can specify the total amount and approve a partial or full request for payment. Manage payouts including approval, processing, and cancellation for both on-chain and Lightning payments.

### User and API Key Management

Server administrators can create and manage users, including setting passwords and admin status. Create API keys on behalf of users with specific permission sets. Useful for hosting providers managing BTCPay instances for multiple merchants.

### Apps (Point of Sale and Crowdfunding)

Create and manage built-in applications like Point of Sale (POS) terminals and Crowdfunding campaigns. POS apps support item catalogs, tips, and static LNURL QR codes for each product.

### Server Management

Server administrators can manage instance-wide settings, view server info, manage maintenance tasks, and configure server-level policies (e.g., registration, SMTP).

### Notifications

View and manage in-app notifications for the authenticated user, covering events like invoice status changes, payouts, and version updates.

### Reporting

Access reporting data for stores, including transaction history and accounting exports.

### Forms

Create and manage custom checkout forms that can collect additional data from customers during the payment process.

## Events

BTCPay Server supports webhooks that can be registered per store. You can toggle between every event or specify the events for your needs. Webhooks are created via the API at `/api/v1/stores/{storeId}/webhooks` or through the UI under Store Settings → Webhooks.

When you receive a webhook event you should validate the signature to make sure the event is actually coming from your BTCPay Server instance. The signature is a HMAC-SHA256 hash of the event payload and your webhook secret. The secret is returned when you register a webhook on the store. The signature is provided in the `BTCPay-Sig` HTTP header.

BTCPay Server supports automatic redelivery. It will try to redeliver any failed delivery after 10 seconds, 1 minute, and up to 6 times after 10 minutes.

### Invoice Events

Supported event types include `InvoiceCreated`, `InvoiceExpired`, `InvoiceInvalid`, `InvoicePaymentSettled`, `InvoiceProcessing`, `InvoiceReceivedPayment`, and `InvoiceSettled`.

- **InvoiceCreated** — Fired when a new invoice is created.
- **InvoiceReceivedPayment** — Fired when a payment is detected for the invoice (may include payments after expiration).
- **InvoiceProcessing** — Fired as soon as the payment is seen in the mempool and the invoice is paid fully.
- **InvoiceExpired** — Fired when an invoice expires before being fully paid.
- **InvoiceSettled** — Fired when an invoice is fully paid and has the required number of blockchain confirmations.
- **InvoiceInvalid** — Fired when an invoice is marked as invalid.
- **InvoicePaymentSettled** — Fired when an individual payment within an invoice has settled.

Each invoice webhook payload includes the `invoiceId`, `storeId`, `type`, `timestamp`, and relevant metadata. Payment-related events additionally include payment method and payment details.

### Payout Events

Webhook events are also available for payout-related status changes, covering approval, completion, and other state transitions of payouts.
