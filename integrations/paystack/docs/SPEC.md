Now I have sufficient information to compile the specification.

# Slates Specification for Paystack

## Overview

Paystack is a payment processing platform for African businesses, enabling merchants to accept payments online and in-person via cards, bank transfers, USSD, mobile money, and other channels. The Paystack API lets you programmatically collect payments, manage transactions, and perform other operations. It operates primarily in Nigeria, Ghana, South Africa, Kenya, and Côte d'Ivoire.

## Authentication

The Paystack API uses API keys to authenticate requests. Every request must include your secret key in the Authorization header, using the Bearer scheme.

The header format is: `Authorization: Bearer YOUR_SECRET_KEY`

Each environment has its own set of public and secret keys. Test keys are prefixed with `pk_test_` and `sk_test_`, while live keys are prefixed with `pk_live_` and `sk_live_`.

- **Secret Key**: Used for all server-side API calls. Obtained from the Paystack Dashboard under Settings > API Keys & Webhooks.
- **Public Key**: Used on the client side (e.g., Popup JS or mobile SDKs) to initialize payment UI components. Not used for direct API authentication.

Paystack provides two separate environments: Test mode for development (no real money) and Live mode for production (real transactions and settlements).

All API requests must be made over HTTPS. IP whitelisting is an optional security feature that allows only specific IP addresses to make API requests using your secret keys.

There is no OAuth2 flow; authentication is solely via API keys.

## Features

### Transaction Management

The Transactions API allows you to create and manage payments on your integration. You can initialize transactions, verify payment status, list transaction history, and export transaction data. Available payment channels include card, bank, Apple Pay, USSD, QR, mobile money, bank transfer, EFT, Capitec Pay, and PayAttitude. Transactions can be filtered by status, date range, customer, and currency.

### Charge API

The Charge API allows you to configure payment channel of your choice when initiating a payment. This gives direct control over the payment flow, useful for serving non-smartphone users or building custom checkout experiences. It supports multi-step authentication flows (OTP, PIN, 3DSecure).

### Customer Management

The Customers API allows you to create and manage customers on your integration. You can create, update, list, and fetch customer records. Customers can be validated using bank account details, and can be whitelisted or blacklisted. Dedicated Virtual Account features are currently only available to Nigeria-based registered businesses.

### Subscriptions and Plans

The Subscriptions API lets developers embed recurring billing functionality in their applications, without having to manage the billing cycle themselves. Merchants can easily create plans and charge customers automatically, on a recurring basis. Plans define the amount, currency, and billing interval (e.g., daily, weekly, monthly, annually). You can set an `invoice_limit` to control how many times a customer is charged, or leave it open-ended. Card and Direct Debit (Nigeria) are the only supported payment methods for subscriptions.

### Dedicated Virtual Accounts

Dedicated Virtual Accounts (DVAs) let you create bank accounts for your customers. These accounts allow your customers to carry out different transactions. When you create a DVA for a customer, all bank transfers to that account will automatically be recorded as transactions from that customer. By default, you can generate up to 1,000 dedicated bank accounts, with the limit increasable upon request.

### Transfers

You can automatically transfer money to customers' bank accounts with one API call. Transfers can be initiated individually or in bulk. Each transfer requires a recipient (bank account or mobile money number) to be created first. Transfers support multiple currencies depending on the operating country.

### Transaction Splits and Subaccounts

The Transaction Splits API enables merchants to split the settlement for a transaction across their payout account and one or more subaccounts. Subaccounts can be used to split payment between two accounts (your main account and a sub account). You can configure flat or percentage-based splits.

### Refunds

The Refunds API allows you to create and manage transaction refunds. Refunds go through multiple statuses: pending, processing, processed, and success/failed.

### Disputes

The Disputes API allows you to manage transaction disputes on your integration.

### Invoices and Payment Requests

The Invoices API allows you to issue out and manage payment requests.

### Payment Pages

The Payment Pages API provides a quick and secure way to collect payment for products. These are hosted pages that can be shared via link.

### Products and Storefronts

The Products API allows you to create and manage inventories on your integration. Use the Storefront API to create and manage digital shops to display and sell your products. Use the Order API to create and manage orders.

### Verification

You can verify phone numbers, bank accounts, or card details. Customer identity validation is also supported using bank account information.

### Settlements

The Settlements API allows you to gain insights into payouts made by Paystack to your bank account.

### Bulk Charges

The Bulk Charges API allows you to create and manage multiple recurring payments from your customers. Charges are queued for processing.

## Events

Paystack supports webhooks for real-time event notifications. Webhooks allow you to set up a notification system that can be used to receive updates on certain requests made to the Paystack API. The webhook URL is configured in the Paystack Dashboard under Settings > API Keys & Webhooks.

Events sent from Paystack carry the `x-paystack-signature` header. The value of this header is a HMAC SHA512 signature of the event payload signed using your secret key.

The following event types are supported:

### Transaction Events

- **Transaction Successful** (`charge.success`): Fired when a payment is successfully completed, including one-time charges, subscription renewals, and bulk charges.

### Transfer Events

- **Transfer Successful** (`transfer.success`): Fired when an outbound transfer to a bank account or mobile money number succeeds.
- **Transfer Failed** (`transfer.failed`): Fired when a transfer fails.
- **Transfer Reversed** (`transfer.reversed`): Fired when a transfer is reversed.

### Subscription Events

- **Subscription Created** (`subscription.create`): Fired when a new subscription is created.
- **Subscription Disabled** (`subscription.disable`): Fired when a subscription is cancelled or completed.
- **Subscription Not Renewing** (`subscription.not_renewing`): Fired when a subscription is set to not renew at the next billing cycle.
- **Subscriptions with Expiring Cards** (`subscription.expiring_cards`): Sent at the beginning of each month, containing information about all subscriptions with cards that expire that month, useful for proactively reaching out to customers.

### Invoice Events

- **Invoice Created** (`invoice.create`): Fired when a new invoice is generated.
- **Invoice Updated** (`invoice.update`): Fired when an invoice is updated.
- **Invoice Failed** (`invoice.payment_failed`): Fired when invoice payment fails.

### Payment Request Events

- **Payment Request Pending**: Fired when a payment request is pending.
- **Payment Request Successful**: Fired when a payment request is completed.

### Refund Events

- **Refund Failed** / **Refund Pending** / **Refund Processed** / **Refund Processing**: Events tracking the lifecycle of a refund through its various states.

### Dispute Events

- **Dispute Created** / **Dispute Reminder** / **Dispute Resolved**: Events tracking the lifecycle of transaction disputes.

### Customer Identification Events

- **Customer Identification Failed** / **Customer Identification Successful**: Fired when customer identity verification completes or fails.

### Dedicated Virtual Account Events

- **DVA Assignment Failed** / **DVA Assignment Successful**: Fired when a dedicated virtual account assignment completes or fails.

### Bank Transfer Events

- **Bank Transfer Rejected** (`bank.transfer.rejected`): Sent when a customer sends an incorrect amount during a bank transfer. You should notify the customer to retry with the correct amount.
