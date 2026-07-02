# Slates Specification for Flutterwave

## Overview

Flutterwave is an African payments technology company that provides APIs for businesses to accept payments, send payouts, and manage financial transactions across multiple African and global markets. It supports various payment methods including cards, bank transfers, mobile money, USSD, and digital wallets. The platform also offers virtual accounts, subscription billing, bill payments, and identity verification services.

## Authentication

Flutterwave supports two authentication methods depending on the API version:

### API v3: Secret Key Authentication

API keys are obtained from the Settings section of the Flutterwave dashboard under the Developers tab. Only Test API Keys and Live Public Keys are visible by default; the live Secret Key must be explicitly generated. When generating keys, you must select an expiration period and enter a 7-digit authentication code sent to your email. The secret key must be downloaded immediately as it will not be shown again.

Requests are authenticated by passing the Secret Key as a Bearer token in the `Authorization` header:

```
Authorization: Bearer FLWSECK_TEST-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-X
```

There are separate keys for test (sandbox) and live (production) environments.

### API v4: OAuth 2.0 Client Credentials

The v4 API uses OAuth 2.0 with client credentials. You obtain an access token by sending a POST request to `https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token` with your `client_id`, `client_secret`, and `grant_type=client_credentials`.

The response returns an `access_token` that expires in 600 seconds (10 minutes). You then use this token as a Bearer token in the `Authorization` header for subsequent API calls.

To go live with v4, you switch to live API keys from the dashboard and replace sandbox Client ID and Client Secret with production credentials.

## Features

### Payment Collection (Charges)

Accept payments from customers through multiple payment methods. Supported methods include Card, Account, Mobile Money, Bank Transfers, USSD, Barter, and NQR. Additional methods in some SDKs include Apple Pay, Google Pay, Fawry Pay, and eNaira. Each payment method has its own charge flow but follows a common pattern of initiating a charge, handling authorization (PIN, OTP, redirect), and verifying the transaction.

- Currencies and methods vary by country/region.
- A unique transaction reference (`tx_ref`) is required for each charge.

### Payouts / Transfers

Send money to bank accounts, mobile money wallets, or other Flutterwave wallets. Transfers support multiple currencies including AUD, EGP, ETB, EUR, GHS, INR, MWK, NGN, USD, and ZAR. You can specify whether the amount applies to the source or destination currency for cross-currency transfers.

- Beneficiaries can be saved and managed for recurring payouts.

### Recurring Payments (Subscriptions & Payment Plans)

Payment plans let you set up subscriptions for customers. You can customize the billing interval, amount, and duration when creating a payment plan. When you first charge a customer, they are automatically subscribed to the plan. Flutterwave then manages future billing cycles and offers options to cancel or reactivate the subscription.

- Subscriptions are tied to a customer's email address and cannot be changed afterwards.
- If a charge fails three consecutive times, the subscription is automatically cancelled.

### Virtual Accounts

Virtual accounts are generated account details (account number and bank) that allow merchants to receive payments from customers via direct bank transfer. Currently available for NGN and GHS payments.

- Two types are supported: dynamic (temporary, single-use accounts for one-time transactions) and static (permanent accounts).
- Bulk creation of static virtual accounts is supported.

### Payout Subaccounts (Wallets)

The payout subaccounts feature enables you to create wallets linked to your Flutterwave account for end users, consumers, or other entities. These wallets only support payments in NGN.

- Each wallet has a dedicated virtual account assigned to it for funding.
- Supports wallet-to-wallet transfers.

### Bill Payments

Pay bills including Airtime, Data bundles, Cable, Power, Toll, E-bills, and Remitta.

### Transaction Management

Manage transaction disputes and refunds. Access transaction reporting for collections, payouts, settlements, and refunds.

### Settlements

View and manage how collected funds are settled to your bank account, including settlement schedules and reports.

### Identity Verification

Resolve bank account details and BVN (Bank Verification Number) information for identity verification purposes.

## Events

Flutterwave supports webhooks for real-time event notifications. Webhooks allow Flutterwave to notify you about events that happen on your account, like a successful payment or a failed transaction. A webhook URL is an endpoint on your server where you receive these notifications.

Webhooks are configured through the Flutterwave dashboard under Settings > Webhooks. Webhook authenticity is verified using a secret hash you configure, sent as the `verif-hash` header (v3) or `flutterwave-signature` HMAC-SHA256 header (v4).

### Charge Events

Triggered when a payment/charge is completed, regardless of payment method (card, bank transfer, mobile money, USSD, etc.). The event type is `charge.completed`. The payload includes transaction status (successful/failed), amount, currency, payment method details, and customer information.

### Transfer Events

Triggered when a payout/transfer is completed. The event type is `transfer.completed`. The payload includes transfer status, amount, recipient details, and bank information.

### Subscription Events

Flutterwave sends webhook notifications whenever a subscription charge succeeds or fails, or when a subscription is cancelled. This covers recurring billing events tied to payment plans.

### Configuration

- Webhook URL and secret hash are set in the dashboard for both test and live environments separately.
- Failed webhook deliveries are retried up to three times with 30-minute intervals between attempts.
- Webhook payloads are JSON and include a `type` field for event identification, a `data` object with event details, and a `timestamp`.
