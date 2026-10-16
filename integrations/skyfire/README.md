# <img src="logo.png" height="20"> Skyfire

Create identity and payment tokens, inspect token validity and charge windows, and collect payments as a seller. Browse seller services with their endpoint URLs and identity requirements. Register, update, activate, or deactivate seller services, inspect the authenticated agent's wallet, configure source IPs, and retrieve paginated token charges for reconciliation.

Use a Buyer Agent API key to create tokens and a Seller Agent API key to charge tokens or manage seller services. Keys are scoped to one agent. Organization admin keys are for organization administration and do not replace agent keys for these operations.

Token creation accepts `kya`, `pay`, and `kya-pay`. The legacy `kya+pay` input remains supported and is sent as the provider's current `kya-pay` spelling. External seller URLs support only `kya` tokens and require an organization buyer key.

For charges, omitting `chargeAmount` uses the configured price only for a `PAY_PER_USE` service. Other pricing models require an explicit amount. Charges may be partial and settle asynchronously. Do not automatically retry a payment whose outcome is uncertain.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
