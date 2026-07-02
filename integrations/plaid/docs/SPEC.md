# Slates Specification for Plaid

## Overview

Plaid is a financial technology API that connects applications to users' bank accounts at thousands of financial institutions. It provides access to financial data including account details, transactions, balances, identity information, and investment holdings, and also enables money movement and income/employment verification.

## Authentication

Almost all Plaid API endpoints require a `client_id` and `secret`. These may be sent either in the request body or in the headers `PLAID-CLIENT-ID` and `PLAID-SECRET`.

To gain access to the Plaid API, create an account on the Plaid Dashboard. Once you've completed the signup process and acknowledged the terms, Plaid will provide a live `client_id` and `secret` via the Dashboard.

**API Key Authentication:**

- **`client_id`**: Your unique client identifier, obtained from the Plaid Dashboard.
- **`secret`**: Your API secret key. You'll have two different API keys (one for each environment), and there are different Plaid environments.

**Environments:**

- Sandbox: `https://sandbox.plaid.com`, Production: `https://production.plaid.com`. Each environment has its own secret key.

**Item Access Token Flow (for end-user bank connections):**

In addition to the `client_id`/`secret` for server authentication, accessing a user's financial data requires an `access_token` tied to a specific bank connection ("Item"). The flow works as follows:

1. Call `/link/token/create` to create a `link_token` and pass the temporary token to your app's client.
2. Use the `link_token` to open Plaid Link for your user. In the `onSuccess` callback, Link will provide a temporary `public_token`.
3. Call `/item/public_token/exchange` to exchange the `public_token` for a permanent `access_token` and `item_id` for the new Item.
4. Store the `access_token` and use it to make product requests for your user's Item.

The `access_token` will remain valid unless you actively expire it via rotation or remove it by calling `/item/remove`. The `public_token` is a one-time use token with a lifetime of 30 minutes.

## Features

### Account Information

Retrieve details about a user's financial accounts, including account names, types (depository, credit, investment, loan), masks, and balances. Retrieve real-time balance information to prevent ACH returns. Supports checking, savings, credit cards, investment, and loan account types.

### Transactions

Retrieve transaction data for budgeting tools, expense management, and more. Transactions include merchant information, categories, amounts, dates, and location data. Plaid provides both a historical pull (up to 24 months) and ongoing updates. Transactions can be synced incrementally using a cursor-based approach. Customers using Recurring Transactions should request at least 180 days of history for optimal results.

### Auth (Account & Routing Numbers)

Retrieve bank account information for ACH, wire, and other bank-to-bank transfers. Returns account numbers and routing numbers (US), institution/branch numbers (Canada), and sort codes (UK) for enabling payment initiation. Supports multiple verification methods including Instant Auth, Instant Match, and micro-deposits.

### Identity Verification

Verify users' financial account ownership and reduce fraud. Returns the account holder's name, address, phone number, and email as reported by the financial institution. Also offers Identity Match to compare user-provided identity data against bank-held data.

### Investments

View holdings and transactions from investment accounts. Returns security details, quantities, cost basis, and current values for positions held in brokerage and retirement accounts.

### Liabilities

Access loan data, like balances and interest rates, for student loans, mortgages, and credit cards. Returns outstanding balances, payment schedules, and repayment plan details.

### Transfer (Money Movement)

Make one-time payments, recurring payments, or payouts within your app. Supports ACH debits and credits with built-in risk assessment. Includes ledger management and sweep operations.

### Signal (ACH Risk Assessment)

Reduce fraud and provide instant funds access by assessing the return risk of an ACH debit transaction. Returns a risk score to help decide whether to proceed with a transaction.

### Assets (Reports)

Generate verifiable asset reports that summarize a user's financial history across multiple accounts. Useful for loan underwriting and financial verification. Reports can be generated as JSON or PDF.

### Income & Employment Verification

Verify income and employment, for lending use cases and more. Supports payroll-connected verification and document-based (bank statement, paystub) verification.

### Statements

Get PDF statements directly from the user's bank, for underwriting verification and compliance.

### Transaction Enrichment (Enrich)

Add detailed information and insights to your existing transactions data. Can enrich non-Plaid transaction data with merchant names, categories, logos, and other metadata.

### Plaid Check (Consumer Reports)

Make smarter credit and lending decisions with insights powered by Plaid Check. Provides consumer report data including base reports, income insights, and cashflow analysis for underwriting.

### Institution Search

Search and retrieve metadata about supported financial institutions, including their names, supported products, logos, and health status. Filter institutions based on which products they support; will only return institutions that support all listed products.

## Events

Plaid sends webhooks to programmatically inform you about changes to Plaid Items or the status of asynchronous processes. For example, Plaid will send a webhook when an Item is in an error state or has additional data available, or when a non-blocking process is complete.

Webhooks are typically configured via the `webhook` parameter of `/link/token/create`. Some webhook types (e.g., Identity Verification) are configured via the Plaid Dashboard instead.

### Item Webhooks

Notifications about changes to Item status, such as when an Item enters an error state, when the user's credentials need to be updated, or when a new account is detected on an existing Item.

### Transactions Webhooks

Webhooks that notify you when Plaid has new or updated transaction information. Includes notifications for initial data readiness, historical data completion, sync updates available, and removed transactions. Fires whenever any change has happened to the Item's transactions.

### Auth Webhooks

Notifications about changes to auth data, such as when automatically verified micro-deposits complete or when auth data has been updated.

### Identity Webhooks

Notifications when identity data associated with an Item changes.

### Investments Webhooks

Notifications when investment holdings or transaction data is updated or ready for retrieval.

### Liabilities Webhooks

Notifications when liabilities data is updated for an Item.

### Transfer Webhooks

Fired when new transfer events are available. Receiving this webhook indicates you should fetch the new events from `/transfer/event/sync`.

### Identity Verification Webhooks

You can select which events you want to subscribe to. For Identity Verification, there are three events: step updated, status updated, and retried. These are configured via the Dashboard rather than via `/link/token/create`.

### Income Webhooks

Notifications when income or employment verification data is ready or has been updated.

### Assets Webhooks

Notifications about asset report generation status, including when a report is ready or has encountered an error.

### Beacon (Monitor) Webhooks

Notifications related to fraud monitoring, such as when a user matches a watchlist or when screening results are updated.
