# <img src="logo.svg" height="20"> Taxjar

Calculate sales tax for US orders, look up rates and product tax categories, manage order and refund records, and manage customer exemptions. Read configured nexus regions and summarized rates, or standardize supported US addresses. Order and refund tools manage reporting records; they do not charge customers or issue monetary refunds.

Connect with a TaxJar API token from Account > API Access. Select its credential environment when connecting; sandbox uses a separate token. Existing connections can retain their saved environment. An optional API version selects a documented version instead of the account default.

Calculations and rate lookups consume API usage. Sandbox calculations verify request formatting, and sandbox order/refund endpoints return stubs. Address validation requires Professional feature access and is unsupported in sandbox. International support is limited to eligible existing accounts.

See [API capability details](docs/SPEC.md) and the [official API reference](https://developers.taxjar.com/api/reference/).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
