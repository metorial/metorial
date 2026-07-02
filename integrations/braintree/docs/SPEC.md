Let me get the full webhook notification kinds list from the Braintree docs.# Slates Specification for Braintree

## Overview

Braintree is a PayPal-owned payment platform that enables merchants to accept and process credit/debit cards, PayPal, Venmo, Apple Pay, Google Pay, and ACH Direct Debit payments. It provides server-side APIs (both GraphQL and REST-based) for transaction processing, customer and payment method management, recurring billing, dispute handling, and reporting.

## Authentication

Braintree supports two authentication methods for server-side API access:

### API Key Authentication (Primary)

A merchant logs into the Braintree Control Panel to generate API Keys (public and private keys), copies and securely stores them, and makes API calls with them. Three credentials are required:

- **Merchant ID**: Your unique merchant identifier
- **Public Key**: Used as the username
- **Private Key**: Used as the password

After you generate an API Key, you must Base64-encode it for GraphQL requests. The format is `Base64(publicKey:privateKey)`, sent as a `Basic` authorization header. For the server-side SDKs (Java, .NET, Node.js, PHP, Python, Ruby), you initialize the gateway with merchant ID, public key, and private key directly.

**Environments:**

- Sandbox: `https://payments.sandbox.braintree-api.com/graphql` (for testing)
- Production: `https://payments.braintree-api.com/graphql`

### OAuth (Beta)

OAuth enables separate Braintree accounts to securely connect with each other and share information. OAuth is in closed beta in production, and open beta in sandbox. This is primarily used for platform/marketplace integrations where a third-party application needs to act on behalf of a connected merchant. It requires:

- **OAuth Client ID** and **OAuth Client Secret** (obtained from the OAuth Apps page in the Control Panel)
- A **redirect URI** for the authorization callback
- Standard OAuth 2.0 authorization code flow: generate a connect URL, redirect the merchant to Braintree for authorization, exchange the authorization code for an access token

### Client-Side Authorization

A tokenization key is a lightweight reusable value that authorizes payment method tokenization. A client token is a short-lived value that authorizes payment method tokenization, payment method retrieval, and client-side vaulting. These are only relevant for client-side (browser/mobile) integrations and have restricted permissions.

## Features

### Transaction Processing

Create, find, search, void, and refund payment transactions. Supports sale (charge) and authorization flows, submit for settlement, partial settlement, adjust authorization, clone transactions, and escrow management (hold/release). Transactions can be made with credit/debit cards, PayPal, Venmo, Apple Pay, Google Pay, ACH, and other local payment methods.

### Customer Management

Customers are an optional component of the API that provide a way to store personal information about anyone who holds a vaulted payment method or initiates a transaction. Customers can be used to group payment methods and transactions, and have a one-to-many relationship with both. Supports create, update, find, search, and delete operations.

### Vault (Payment Method Storage)

Your Vault is where Braintree securely stores your customers' payment data long-term, allowing you to charge repeat customers without making them re-enter their payment information. Payment methods can be created, updated, found, deleted, granted to other merchants, and revoked. Supports credit cards, PayPal accounts, Venmo accounts, US bank accounts, and wallet-based methods.

### Recurring Billing (Subscriptions)

Manage subscription plans and customer subscriptions. Plans are configured in the Control Panel (read-only via API) with add-ons and discounts. Subscriptions can be created, updated, found, searched, canceled, and retried for failed charges.

### Dispute Management

Dispute webhooks include kinds such as DisputeAccepted, DisputeAutoAccepted, DisputeDisputed, and DisputeExpired. Disputes can be found, searched, accepted, and evidence (text or file) can be added or removed. Disputes can also be finalized for submission.

### Merchant Account Management

For marketplace/platform scenarios, create and manage sub-merchant accounts. Supports create, find, update, and list operations.

### Address Management

Create, update, find, and delete addresses associated with customers. Maximum of 50 addresses per customer.

### Reporting

Generate settlement batch summaries and transaction-level fee reports. Summaries can be grouped by custom field values.

### Credit Card Verification

Run standalone verifications on credit cards to confirm they are valid before vaulting or charging.

### Forward API

Securely send payment data from your Braintree Vault to PCI-compliant third parties. Subject to eligibility.

### Fraud Protection

Tools for detecting and preventing fraudulent transactions, including 3D Secure authentication, AVS/CVV checks, and premium fraud management tools.

### Account Updater

Braintree surfaces card updates via a daily report webhook, not ad-hoc per-card events. Automatically keeps stored card information current when cards are replaced or renewed.

## Events

Braintree supports webhooks for real-time event notifications. Webhooks are a system of automated notifications indicating that an event has occurred in your gateway. Rather than requiring you to pull information via the API, webhooks push information to your destination when important events occur. Webhooks are configured in the Braintree Control Panel by specifying a destination HTTPS URL and selecting notification types.

Each webhook notification includes a `kind`, a `timestamp`, and the relevant Braintree object. Every incoming request passes through Braintree's bt_signature / bt_payload verification using your API credentials.

### Subscription Events

Notifications for subscription lifecycle changes including: charged successfully, charged unsuccessfully, billing skipped, went past due, expired, canceled, trial ended, and went active.

### Transaction Events

Transaction webhooks include kinds such as TransactionSettlementDecline and TransactionSettled.

### Disbursement Events

Know immediately when funds are disbursed to your account. Includes notifications for successful disbursements and disbursement exceptions.

### Dispute Events

Notifications for dispute lifecycle changes including: opened, won, lost, accepted, auto-accepted, disputed, and expired.

### Sub-merchant Account Events

You can create webhooks for sub-merchant account status changes in Braintree Marketplace scenarios, such as account approval or decline.

### Account Updater Events

Daily report notifications when stored card information has been updated (e.g., new expiration dates or replacement card numbers).

### Grant API Events

Notifications related to payment method grants, including when a granted payment instrument is revoked.

### OAuth Events

The WebhookNotification kind for OAuth webhooks includes OAuthAccessRevoked. Triggered when a connected merchant revokes access.

### Payment Method Events

Notifications when a payment method associated with a customer is updated (e.g., via network token updates).

### Local Payment Method Events

Notifications related to local payment method completions or reversals.

### Fraud Protection Events

Notifications from Braintree's fraud protection tools regarding transaction review status changes.

### Braintree Auth Events

Notifications for partner merchant connection lifecycle events (connected, disconnected, declined).
