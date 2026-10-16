# <img src="logo.png" height="20"> BTCPay Server

Accept cryptocurrency payments through your own BTCPay Server instance. Create and retrieve invoices, update invoice metadata and status, prepare refunds, discover stores and payment methods, manage payment requests and pull payments, inspect on-chain wallets, and use a connected Lightning node. Payout operations include creation, approval with the actual payout revision, cancellation, and manual payment confirmation.

Connect using your instance URL and an API key generated under **Account → Manage account → API keys**. Grant only the permissions needed for the operations you intend to use. Store permissions can be restricted to individual stores. `manage_stores` with `action: list` discovers accessible store IDs; `get_current_user` requires the separate `btcpay.user.canviewprofile` permission.

Use `manage_payout_claims` for current payout operations. The older `manage_payouts` tool remains available for compatibility; its legacy approval request does not supply the revision required by current servers. `list` or `get` in the replacement returns the revision to pass to `approve`. Marking a payout as paid records an external payment; it does not send funds.

Invoice and payment request outputs keep their numeric `amount` fields and expose the exact provider decimal as `amountExact`, plus the complete response in `raw`. Use exact decimal inputs for invoices and payout claims when precision matters. Wallet amounts use the cryptocurrency unit; Lightning invoice amounts and the local Lightning balance use millisatoshis. A Lightning payment may remain pending after the request returns; inspect its returned status or retrieve the payment again.

See the [Greenfield API reference](https://docs.btcpayserver.org/API/Greenfield/v1/), [authentication guide](https://docs.btcpayserver.org/Developers/api/authentication/), and [integration notes](docs/SPEC.md).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
