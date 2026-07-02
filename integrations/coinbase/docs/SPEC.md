# Slates Specification for Coinbase

## Overview

Coinbase is a cryptocurrency exchange platform that allows users to buy, sell, store, and manage digital assets. It provides APIs for trading, account management, market data access, payment processing (via Coinbase Commerce), and onchain data. The platform serves individual traders, developers, and institutions across multiple API products including Coinbase App, Advanced Trade, Exchange, and Commerce.

## Authentication

Coinbase supports two primary authentication methods:

### 1. CDP API Key Authentication (JWT-based)

CDP API keys are used to generate a JSON Web Token (JWT), which is then set as an Authorization Bearer header to make authenticated requests.

- **Setup:** Log into the Coinbase Developer Platform (CDP), navigate to Access → API keys, and configure: API key nickname, portfolio (e.g., Default), and permission level (View, Trade, Transfer).
- The key automatically downloads as a JSON file containing the API Key Name (in the format `organizations/{org_id}/apiKeys/{key_id}`) and a Private Key (EC private key).
- **Signature Algorithm:** When using Coinbase App SDKs, Ed25519 (EdDSA) keys are NOT supported. You must use ES256 key format (ECDSA with P-256 curve).
- **IP Allowlisting:** For enhanced API Key security, Coinbase recommends whitelisting IP addresses permitted to make requests with a particular API Key.
- API Key authentication should only be used to access your own account.

### 2. OAuth2 ("Sign in with Coinbase")

The Sign In With Coinbase API supports the OAuth2 protocol so that developers can let Coinbase users grant a 3rd party application full or partial access to their account, without sharing the account's API key or login credentials.

- **Authorization URL:** `https://login.coinbase.com/oauth2/auth`
- **Token URL:** `https://api.coinbase.com/oauth/token`
- **Grant Type:** Authorization Code
- **Scopes:** Permissions are specified via a `scope` parameter. For example, an app may only need to view accounts and transaction history. Multiple permissions are separated with commas (e.g., `&scope=wallet:accounts:read,wallet:transactions:read`). Common scopes include:
  - `wallet:user:read`, `wallet:user:email` — Read user profile and email
  - `wallet:accounts:read`, `wallet:accounts:create`, `wallet:accounts:update`, `wallet:accounts:delete` — Account management
  - `wallet:transactions:read`, `wallet:transactions:send` — View and send transactions
  - `wallet:buys:read`, `wallet:buys:create` — Buy crypto
  - `wallet:sells:read`, `wallet:sells:create` — Sell crypto
  - `wallet:deposits:read`, `wallet:deposits:create` — Deposits
  - `wallet:withdrawals:read`, `wallet:withdrawals:create` — Withdrawals
  - `wallet:addresses:read`, `wallet:addresses:create` — Wallet addresses
- **Token Refresh:** When first authenticating, the app receives an access token and a refresh token. The access token expires after about two hours. The refresh token allows obtaining a new access/refresh token pair but can only be used once.

## Features

### Account Management

View and manage cryptocurrency wallets and accounts on Coinbase. List all accounts, check balances per currency, and create or update wallets. Each account represents a different currency wallet.

### Trading (Advanced Trade)

Automate market, limit, and stop-limit orders by building with the REST API. Supports trading in over 550 markets, including 237 USDC pairs. Manage orders (create, cancel, list), view order history, and access portfolio details. Permission levels can be set to View, Trade, or Transfer.

### Transactions

Send and receive cryptocurrency. Create transactions to send crypto to external addresses or other Coinbase users. View transaction history including buys, sells, sends, receives, deposits, and withdrawals. Transactions involving sends may require two-factor authentication.

### Buy, Sell, Deposit, and Withdraw

Programmatically buy and sell cryptocurrency using linked payment methods. Deposit fiat currency from bank accounts and withdraw fiat to bank accounts. Supports multiple fiat currencies.

### Market Data

Market Data APIs are public and do not require authentication. Access real-time and historical prices, exchange rates, order books, and product/trading pair information. Retrieve spot prices, buy/sell prices, and currency information.

### Coinbase Commerce (Payments)

Accept cryptocurrency payments from customers. Create charges and checkouts for goods and services. Supports fixed-price and donation-style payments. Track payment status through charge lifecycle states (NEW, PENDING, COMPLETED, EXPIRED, etc.).

### Onchain Data

Access onchain data like balances, balance history and transaction history directly in your app. Query blockchain data across supported networks.

### Real-Time Market Data (WebSocket)

Coinbase provides a WebSocket feed that enables developers to stream live market data in real-time. Subscribe to channels for ticker updates, order book snapshots, trade executions, and user-level order/fill updates. Filter by product IDs (trading pairs).

### User Profile

Retrieve the authenticated user's profile information including name, email, time zone, native currency, and avatar. Access current user's payment methods.

## Events

Coinbase supports webhooks across multiple products:

### Coinbase App Notifications (Account Webhooks)

Notifications are sent as HTTP POST requests (webhooks) to a notification endpoint which you can set in your OAuth application or API key settings. Once configured, you receive notifications instantly as events are created for your account.

- Covers account-level events such as new transactions (sends, receives, buys, sells), wallet creation, and address-related events.
- These notifications affect only your own account and you need to set up necessary read permissions to receive notifications.
- Coinbase expects a 200 response code. If not received, it retries hourly for up to three days.
- Webhook payloads are signed with an RSA key; verify using the `CB-SIGNATURE` header.

### Coinbase Commerce Webhooks (Payment Events)

Webhooks for crypto payment processing, notifying you of charge lifecycle events like creation, confirmation, and failure.

- Event types include: `charge:created`, `charge:confirmed`, `charge:failed`, `charge:pending`, `charge:delayed`, `charge:resolved`.
- Webhook payloads are signed, and you should verify the signature to ensure the webhook is genuine. Verification uses the `X-CC-Webhook-Signature` header with HMAC-SHA256.

### CDP Onchain Webhooks

Real-time notifications for onchain activity such as ERC-20 transfers, NFT movements, and smart contract events on Base and other supported networks.

- Primary event type: `onchain.activity.detected`.
- Can be filtered by contract address and event name (e.g., `Transfer`).
- Currently focused on Base with limited coverage of other networks. The event types require developers to understand contract ABIs and event signatures for filtering.
- Subscriptions are managed programmatically via the CDP API.
