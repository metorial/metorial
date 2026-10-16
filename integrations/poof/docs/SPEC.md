# Poof Integration

## Authentication

Use a Poof API key as the raw `Authorization` header value, with JSON request bodies. Obtain the key from the developer dashboard and link the payment methods you intend to use. The optional username saved during connection setup is informational; `create_checkout` requires its own explicit merchant username.

## Tools

- `create_checkout`: hosted checkout, optional customer fields, product quantities, redirects, notification URL, defaults, and metadata.
- `create_crypto_invoice`: legacy cryptocurrency invoice with an amount, cryptocurrency, local currency, and redirect.
- `create_payment_link`: v2 payment link with optional metadata.
- `create_deposit_address`: monitored deposit address and returned charge information. `cryptoAmount` represents the provider's `charge` value; the provider's `amount` represents the USD amount.
- `manage_wallet`: create a wallet or read the legacy v1 wallet balance. The documented v1 route remains supported independently of the current v2 balance route.
- `send_payout`: send cryptocurrency to an external address. Requires sufficient funds and a supported Poof wallet; external wallets cannot use payouts. Returned amounts and addresses come from the provider response.
- `create_fiat_payment`: create invoices or charges through linked PayPal, Cash App, Skrill, or Coinbase accounts. Provider QR-code URLs are available for download; existing response fields remain available.
- `get_transactions`: retrieve by transaction ID, query using a filter/search pair, or list transactions. A transaction ID takes precedence over query inputs.
- `get_crypto_rates`: exchange rates, token prices, and gas prices. The existing exchange-rate base defaults to USD; price and gas-price requests require a cryptocurrency.
- `get_product`: fetch product details.
- `get_smart_contracts`: fetch the supported ERC-20 contracts.

There are 11 tools and no triggers. Banking/ACH, webhook registration, and MPC signing are not exposed by this integration. No account/profile endpoint is documented in the reviewed public API, so there is no identity tool.

## Compatibility and errors

Existing tool keys, field types, enums, requiredness, raw responses, and legacy routes are preserved. Failed HTTP responses and explicit provider error bodies become structured service errors. Missing payment URLs and missing wallet balances produce errors instead of JSON text presented as a URL or a fabricated zero balance.

## Provider references

- [Authentication and current API](https://docs.poof.io/reference/poof-api)
- [Legacy API, including v1 invoice and balance responses](https://www.poof.io/api)
- [Current API reference index](https://docs.poof.io/reference/erc-20-tokens)

Current reference pages often omit response examples. The integration does not infer unsupported response structures or replace legacy routes solely because a newer reference page exists.
