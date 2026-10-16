# <img src="logo.png" height="20"> Coin Market Cal

Search the CoinMarketCal V2 cryptocurrency event catalog by coin, date range,
category, keyword, or impact. Retrieve event details, discover canonical coin
and category identifiers, reconcile cancelled events, and inspect API usage.

Create a V2 API key in the [developer dashboard](https://coinmarketcal.com/developer/dashboard/keys).
API V1 was retired on July 14, 2026; V1 keys must be replaced. The deprecated
`search_events`, `list_coins`, and `list_categories` tools retain their original
contracts. Use `list_events`, `search_coins`, and `list_event_categories` for
current data. See the [capability and migration guide](docs/SPEC.md).

V2 results use cursor pagination and string identifiers. Display `displayedDate`
for events, especially for estimated dates. Features and available date ranges
depend on the authenticated plan.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
