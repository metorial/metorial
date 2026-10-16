# <img src="logo.svg" height="20"> Polygon

Read financial market data from Massive (formerly Polygon.io) across stocks,
options, forex, crypto, and indices. Existing Polygon.io API keys remain valid.

The 23 read-only tools cover historical OHLCV bars, market snapshots, stock trades
and quotes, options contracts and chains, technical indicators, ticker discovery
and details, news, market status and holidays, current financial statements and
ratios, corporate actions, exchange and condition-code reference data, and daily
US stock market bars. Data availability and delay depend on your subscription.

Use `search_tickers` to find instruments, then pass their symbols to data tools.
Use `get_reference_data` to discover exchange, ticker-type, and trade/quote
condition codes. Paginated tools return `nextCursor`; pass it back to the same
tool with the same selection to continue. Current tools expose the complete
provider response alongside summaries so plan-dependent fields and per-ticker
errors remain available.

Use `get_financial_statements` and `get_corporate_actions` for current provider
APIs. The deprecated `get_stock_financials` and `get_splits_dividends` tools retain
their original contracts for compatibility; the experimental financials endpoint
has been sunset by the provider.

These tools use REST requests. WebSocket streaming, trading, and flat-file
exports are not implemented.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
