# Slates Specification for Poof

## Overview

Poof is a payments infrastructure platform that enables accepting cryptocurrency payments, credit card payments, ACH bank transfers, and Cash App payments. It provides APIs for creating blockchain wallets, processing payments, sending payouts, and managing transactions across multiple cryptocurrencies and fiat currencies.

## Authentication

Poof uses **API key** authentication.

- Sign in to Poof to retrieve your API key and add the key to the Authorization header when making a request.
- Pass the headers field in your POST/GET requests. Call the website `https://www.poof.io` followed by the endpoint URL for making POST/GET requests.
- The API key is passed as the `Authorization` header value (e.g., `"Authorization": "Your_API_Key"`).
- The `Content-Type` header should be set to `application/json`.

**Note:** No authentication is required when calling the Instant Checkout endpoint. Instant Checkouts do not require an API key and can be done through adding a username in your POST request.

## Features

### Checkout & Payment Collection

Create checkout sessions for users and collect payments. Supports hosted checkout pages, embeddable payment buttons, and payment links. Optional form fields can be displayed (e.g., Email, Name), and redirect URLs can be configured for success and cancellation. Products can be attached to checkouts with quantity support.

### Cryptocurrency Invoicing

Create cryptocurrency invoices that can be redirected to at checkout or hosted in an iFrame on your website. Invoices support specifying amounts in local currency (e.g., USD, EUR, CNY) while charging in a chosen cryptocurrency (e.g., BTC, LTC, DOGE, ETH).

### Blockchain Wallet Management

Poof provides tools for creating blockchain wallets. You can create wallets, generate deposit addresses, and check balances across supported cryptocurrencies. Multi-chain support includes Tron, Cardano, Cosmos, Polkadot, Bitcoin Cash, and 200+ tokens.

- The payouts endpoint is disabled for users with external wallets.

### Cryptocurrency Payouts

Create payouts in the respective cryptocurrency you provide to Poof. Send transactions to external addresses from your Poof wallet balance.

### Fiat Payments

Create fiat invoices and charges. Poof allows businesses and developers to pull payments from a linked bank account through the API. ACH debit transactions are commonly used for recurring payments, such as monthly bills, and can also be used for one-time payments.

- Banking related APIs are currently a restricted and private endpoint. Contact support@poof.io with your business use case to gain access.

### ACH Transfers

Create ACH debit transfers and check transfer statuses for bank-to-bank money movement.

### Transaction Management

Fetch individual transactions, list all transactions, and query transactions. Transaction data includes payment ID, amount, currency, customer name, and email.

### ERC-20 Token Support

Fetch smart contract details, token prices, and gas prices for Ethereum-based tokens.

### Products

Fetch product details to attach to checkout flows and payment buttons.

### Multiparty Computation (MPC) Cryptography

Generate ECDSA digital signatures and private key shares using Shamir's Secret Sharing (SSS) via sMPC-CMP infrastructure for enhanced wallet security.

## Events

Poof supports **webhooks** for receiving automated payment notifications.

### Payment Notifications

Subscribe to webhook notifications by adding an endpoint to the Webhook subscriptions section on the developers page within Poof. Click "add an endpoint" to add the URL (HTTPS only) where you'd like to receive webhooks. Webhooks can also be created programmatically via the API.

- Webhook payloads include: payment ID, local currency (e.g., USD), customer name, customer email, and items.
- You can subscribe to recurring payment notifications through Poof webhooks.
- Payment updates to deposit addresses can be automatically sent via webhooks.
