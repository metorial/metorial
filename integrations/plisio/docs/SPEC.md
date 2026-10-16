# Plisio Integration Specification

## Overview

Plisio is a cryptocurrency payment gateway. This integration exposes twelve tools for invoices, payouts, balances, fees, currencies, transaction history, current shop identity, and permanent deposit addresses.

## Authentication

Plisio uses API key authentication. Before using the API, you must register and set up site settings under the account/API page to get a personal "SECRET_KEY". This secret key is used with all API calls.

The API key is passed as a query parameter `api_key` on every request. For example:

```
https://api.plisio.net/api/v1/operations?api_key=SECRET_KEY
```

Optionally, you can enter your site IP in the "Request IP" field in API settings. The Plisio API will then be available for that IP address only. This is optional but recommended for security.

The API uses HTTP GET method only and returns JSON format only.

## Features

### Invoice Creation

Create cryptocurrency payment invoices for customers using an order name and unique order number. Cryptocurrency is optional; Plisio selects an active currency when omitted. You can specify an amount in cryptocurrency directly, or provide a fiat source currency and source amount for automatic conversion. The two pricing methods are mutually exclusive.

- Configurable expiration interval in minutes.
- Ability to restrict allowed cryptocurrencies for a given invoice.
- Supports white-label mode, which returns extended invoice data (wallet address, QR code, exchange rate) for custom-built payment UIs.
- Retrieve existing invoices, their active invoice IDs after currency selection, merchant details, and allowed payment currencies.
- Valid provider PNG QR images are also made available for download; the original QR field is retained for compatibility.

### Withdrawals and Mass Withdrawals

Send cryptocurrency from your Plisio balance to external wallet addresses. Supports single and mass (bulk) withdrawals to multiple addresses in a single request.

- Configurable normal or priority fee plans.
- Specify cryptocurrency, destination address(es), and amount(s).

### Transaction Management

View and query your transaction history including invoices, withdrawals, and internal transfers. Retrieve details for individual transactions by ID.

### Balance Management

View your balance for each supported cryptocurrency.

### Exchange Rate Lookup

Retrieve current exchange rates for supported cryptocurrencies against fiat currencies. If no fiat currency is selected, USD is used by default. Supports 167 fiat currencies.

### Fee Estimation

Estimate network transaction fees and Plisio's commission before making withdrawals. Pass cryptocurrency, destination addresses, matching decimal-string amounts, and an optional normal or priority fee plan. The commission estimate uses the corresponding single or mass withdrawal type.

### Fee Plans

Retrieve provider fee plans for a cryptocurrency, preserving the original gas, confirmation-target, and value representations.

### Deposit Address Creation

Create a permanent deposit address for receiving cryptocurrency payments, as an alternative to invoice-based one-time payment flows.

White-label processing is required. List existing addresses with optional UID/currency filters and page/limit pagination; the list endpoint does not document total counts or continuation tokens.

### Current Shop

Identify the shop associated with the API key through the read-only `/shops` endpoint, including its name, website, and white-label settings. The documented shop model does not provide a stable shop ID; no ID is fabricated.

### Response Contracts

All tools include the original provider response with credentials removed. Financial strings retain their precision and units. Existing normalized optional fields omit a provider null while the exact null remains in `raw`; required malformed fields fail explicitly. Multiple block-explorer links are available through `transactionUrls` while the existing scalar `txUrl` is used only for a scalar provider URL. Timestamp values remain unchanged because Plisio's documentation does not guarantee a single seconds/milliseconds representation.

### Supported Cryptocurrencies

Retrieve the list of currently supported cryptocurrencies and their details.

## Events

Plisio supports webhook-style callbacks for invoice status updates. Callbacks target the merchant's own endpoint; this integration has no registered event triggers.

### Invoice Status Callbacks

When creating an invoice, you can specify a `callback_url` — a merchant URL to get invoice updates via POST request. If this parameter isn't set, a callback will be sent to the URL configured under profile in API settings, in the 'Status URL' field.

Additionally, you can configure separate `success_callback_url` and `fail_callback_url` for completed and failed invoices respectively.

Callback payloads include the transaction ID, payment status, amount received, currency, order details, confirmations count, exchange rate, commission, and a `verify_hash` for HMAC-SHA1 signature verification using your secret key.

Invoice statuses reported via callbacks:

- **new** — initial invoice status
- **pending** — partial amount received, waiting for confirmations
- **pending internal** — moving funds to user wallet initiated
- **expired** — invoice expired (partial payment may have been received)
- **completed** — paid in full
- **error** — an error occurred
- **cancelled** — no payment received within the timeout window

Append `?json=true` to the callback URL to receive data in JSON format (required for non-PHP implementations).
