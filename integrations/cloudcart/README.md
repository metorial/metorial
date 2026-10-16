# <img src="logo.svg" height="20"> CloudCart

Manage CloudCart products, orders, customers, categories, and variant inventory. Discover vendor and customer-group IDs, list every product variant, inspect full API responses, update order statuses, and change category parent relationships.

Connect with an API key from **Settings > API keys** and the store subdomain (the part before `.cloudcart.net`). The integration uses CloudCart API v2 with JSON:API requests. List tools return one page at a time, with page numbers, page counts, and total counts. Prices for variants use integer minor currency units: `5500` means `55.00`.

See the [API guide](docs/SPEC.md) for tool coverage and provider references.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
