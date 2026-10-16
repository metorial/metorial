# <img src="logo.jpeg" height="20"> Nasdaq

Query Nasdaq Data Link tables and historical time-series datasets, search the data catalog, inspect database metadata, and prepare downloadable ZIP exports. Separately, retrieve equity quotes, trades, snapshots, OHLCV bars, option chains and Greeks, index values, and supported instrument metadata through the Nasdaq Cloud REST API.

Connect with a Data Link API key for historical tables, datasets, and bulk downloads. Use Nasdaq-provided OAuth2 client credentials, token endpoint, and API base URL for Cloud REST market data. Access depends on the account's product subscriptions and entitlements. Cloud REST tokens are renewed automatically.

The two API families are available as separate tool categories. A connection's authentication method determines which family it can use. Bulk table exports can take time to generate; retry until the provider reports `fresh`. Database exports use the provider's authenticated bulk-download endpoint. The integration does not provide a continuous streaming connection.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
