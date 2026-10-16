# BTCPay Server integration

This integration uses the Greenfield v1 API on a user-supplied BTCPay Server instance. The instance URL stays in connection configuration; the API key stays in authentication. Requests send `Authorization: token <API_KEY>`. API keys are static credentials, so no OAuth refresh or expiry is invented.

## Available operations

- `manage_stores`: list, retrieve, create, update, and delete stores. List stores to discover IDs for other tools.
- `get_store_payment_methods`: discover actual payment method IDs and configuration metadata.
- `create_invoice` and `get_invoices`: create top-up or fixed invoices, retrieve one invoice with its payment methods, or list with status, order, search, date, and offset filters.
- `manage_invoice`: update metadata, archive, unarchive, or mark an invoice Invalid or Settled subject to the provider's lifecycle rules.
- `refund_invoice`: create a refundable pull payment and return its actual claim link.
- `manage_wallet`: balances, transaction history, receive address reservation, transaction creation, transaction lookup, fee estimates, and unspent outputs. Sending requires an appropriately configured wallet and signing/broadcast permissions. A receive address may be the existing reserved unused address.
- `manage_lightning`: node balance and information, channels, invoice creation and lookup, payment submission and lookup, and invoice/payment history. Inspect status after paying; an accepted request can still be pending.
- `manage_payment_requests`: create, list, get, update, and archive payment requests.
- `manage_pull_payments`: create, list, and archive pull payments. Current servers use `payoutMethods`; `paymentMethods` and `period` remain legacy inputs and may be ignored by current servers.
- `manage_payout_claims`: list, get, create, approve with the actual revision, cancel, or mark payouts paid. The original `manage_payouts` remains deprecated for compatibility with its original request and output contract.
- `get_notifications`: list, mark read, and delete user notifications.
- `get_current_user`: retrieve the authenticated user's profile independently.
- `get_server_info`: server information plus current-user details, preserving the existing combined operation.

These are resource groups in one Greenfield API, so no separate product categories are declared. No webhook triggers or file exports are registered.

## Permissions and data

Choose API key permissions for the operations used; the integration does not request unrestricted access or add profile reads during authentication or mutations. Profile lookup requires `btcpay.user.canviewprofile`. Server information has no additional named permission, but the combined `get_server_info` also reads the profile. View/create invoices use `btcpay.store.canviewinvoices` and `btcpay.store.cancreateinvoice`; invoice modification uses `btcpay.store.canmodifyinvoices`, and manual status changes use `btcpay.store.canmanageinvoicestatus`. Payout reads use `btcpay.store.canviewpayouts`, while approval, cancellation, and marking paid use `btcpay.store.canmanagepayouts`; creating unapproved payouts uses `btcpay.store.cancreatenonapprovedpullpayments`, with `btcpay.store.cancreatepullpayments` additionally needed for automatic approval. Consult each operation in the target instance's `/docs` for wallet, Lightning, notification, and payment-request permissions.

Amounts returned by the API are decimal strings. Existing numeric invoice and payment-request outputs remain numbers; `amountExact` and `raw` retain the original decimal and all provider metadata. JavaScript numeric aliases can round decimals; use the exact fields for financial reconciliation. Zero is preserved, and absent data is not replaced with zero. Nullable dates remain null where the public schema allows it. A pull payment may have no name; its optional name alias omits null while `raw.name` preserves it.

ISO date inputs are converted to the provider's Unix seconds. Existing empty or invalid values retain their original omission/forwarding behavior. Pagination uses provider offsets without automatic extra requests, and array filters use repeated query parameters. Current controllers retain the store-scoped item routes used here even though the hosted OpenAPI reference emphasizes resource-level routes; store selection is preserved.

## Official references

- [Greenfield reference](https://docs.btcpayserver.org/API/Greenfield/v1/) and [OpenAPI document](https://docs.btcpayserver.org/API/Greenfield/v1/swagger.json)
- [API authentication and authorization](https://docs.btcpayserver.org/Developers/api/authentication/)
- [Invoice controller and store-scoped aliases](https://github.com/btcpayserver/btcpayserver/blob/master/BTCPayServer/Controllers/GreenField/GreenfieldInvoiceController.cs)
- [Payment request controller](https://github.com/btcpayserver/btcpayserver/blob/master/BTCPayServer/Controllers/GreenField/GreenfieldPaymentRequestsController.cs)
- [Pull payment and payout controller, including revision validation](https://github.com/btcpayserver/btcpayserver/blob/master/BTCPayServer/Controllers/GreenField/GreenfieldPullPaymentController.cs)
- [On-chain wallet controller](https://github.com/btcpayserver/btcpayserver/blob/master/BTCPayServer/Plugins/Wallets/Controllers/GreenfieldStoreOnChainWalletsController.cs)
