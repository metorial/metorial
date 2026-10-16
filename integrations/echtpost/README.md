# <img src="logo.svg" height="20"> Echtpost

Send physical postcards using templates saved in EchtPost. Manage recipient contacts and groups, find templates, schedule mailings, inspect postcard status, and queue cancellation before printing. Check the connected account, prepaid balance, and current prices.

Create an API key under **Account → API keys** in EchtPost. Sandbox keys keep contacts, groups, and cards separate from live data and do not bill or print postcards. Live mailings require sufficient prepaid balance.

List tools return one page with pagination metadata. Inline recipients need a last name, street, postal code, city, and two-letter country code. The scheduled date controls printing, so allow additional postal transit time. Templates supply the postcard text and design; this integration does not create custom artwork or custom-content cards.

See the [API reference](https://api.echtpost.de/v2/docs) and [integration specification](docs/SPEC.md).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
