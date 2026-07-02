# Slates Specification for Coinbase

## Overview

Coinbase is a cryptocurrency exchange platform that allows users to buy, sell, store, and manage digital assets. This integration focuses on Coinbase App wallet APIs, Advanced Trade trading and market data APIs, and Coinbase Commerce charge management.

## Authentication

This integration supports Coinbase App OAuth2 for Coinbase App and Advanced Trade
tools, plus Coinbase Commerce API key authentication for Commerce charge tools.
Coinbase also supports CDP API key JWT authentication for own-account server
automation, but this integration's App and Advanced Trade tools are OAuth-based.

### 1. OAuth2 ("Sign in with Coinbase")

The Sign In With Coinbase API supports the OAuth2 protocol so that developers can let Coinbase users grant a 3rd party application full or partial access to their account, without sharing the account's API key or login credentials.

- **Authorization URL:** `https://login.coinbase.com/oauth2/auth`
- **Token URL:** `https://login.coinbase.com/oauth2/token`
- **Grant Type:** Authorization Code
- **Scopes:** Permissions are specified via a `scope` parameter. Multiple permissions are separated with commas (e.g., `&scope=wallet:accounts:read,wallet:transactions:read`). Common scopes used by this integration include:
  - `wallet:user:read`, `wallet:user:email` — Read user profile and email
  - `wallet:accounts:read`, `wallet:accounts:create`, `wallet:accounts:update`, `wallet:accounts:delete` — Account management
  - `wallet:transactions:read`, `wallet:transactions:send` — View and send transactions
  - `wallet:buys:read`, `wallet:buys:create` — Buy crypto
  - `wallet:sells:read`, `wallet:sells:create` — Sell crypto
  - `wallet:deposits:read`, `wallet:deposits:create` — Deposits
  - `wallet:withdrawals:read`, `wallet:withdrawals:create` — Withdrawals
  - `wallet:addresses:read`, `wallet:addresses:create` — Wallet addresses
  - `wallet:payment-methods:read` — Payment methods
  - `wallet:trades:read`, `wallet:trades:create` — Advanced Trade reads, previews, and order creation
  - `offline_access` — Return a refresh token for token renewal
- **Token Refresh:** When first authenticating with `offline_access`, the app receives an access token and a refresh token. The access token expires in one hour. Refresh tokens can be exchanged once for a new access/refresh token pair and must be preserved after each rotation.

### 2. Coinbase Commerce API Key

Coinbase Commerce charges use `X-CC-Api-Key` and `X-CC-Version` headers against `https://api.commerce.coinbase.com`. Commerce tools are scoped to the `commerce_api_key` auth method and are not available under Coinbase App OAuth.

## Features

### Account Management

View and manage cryptocurrency wallets and accounts on Coinbase. List all accounts, check balances per currency, and create or update wallets. Each account represents a different currency wallet.

### Trading (Advanced Trade)

Preview and automate market, limit, and stop-limit orders through the Advanced Trade REST API. Manage orders (preview, create, cancel, list, get), view fills, inspect transaction summary/fee tier data, list payment methods, and access portfolio breakdowns.

### Transactions

Send and receive cryptocurrency. Create transactions to send crypto to external addresses or other Coinbase users. View transaction history including buys, sells, sends, receives, deposits, and withdrawals. Transactions involving sends may require two-factor authentication.

### Buy, Sell, Deposit, and Withdraw

Programmatically buy and sell cryptocurrency using linked payment methods. Deposit fiat currency from bank accounts and withdraw fiat to bank accounts. Supports multiple fiat currencies.

### Market Data

Access real-time and historical prices, exchange rates, order books, market trades, candles, and product/trading pair information. Retrieve spot prices, buy/sell prices, and currency information.

### Coinbase Commerce (Payments)

Accept cryptocurrency payments from customers with Commerce charges. Create, list, get, cancel, and resolve fixed-price or no-price charges. Track payment status through charge lifecycle states (NEW, PENDING, COMPLETED, EXPIRED, etc.).

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
