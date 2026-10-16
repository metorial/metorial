# Polygon API capabilities

Polygon.io is now Massive. This read-only integration uses
`https://api.massive.com` and bearer API-key authentication. Existing Polygon.io
keys continue to work. There is no connection-level resource ID or OAuth token
refresh. The public REST APIs do not provide a suitable current-account identity
endpoint.

## Tools

| Tool | API coverage |
| --- | --- |
| `get_aggregate_bars` | `/v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}`; configurable intervals, adjustment, sorting, pagination |
| `get_previous_close` | `/v2/aggs/ticker/{ticker}/prev` |
| `get_grouped_daily_bars` | `/v2/aggs/grouped/locale/us/market/stocks/{date}`; market-wide daily bars, including ticker symbols |
| `get_stock_snapshot` | Single or multiple stock snapshots |
| `get_stock_trades_quotes` | Stock trade/quote history and last trade/NBBO; correct bid/ask mapping |
| `get_market_movers` | Stock, forex, or crypto gainers and losers |
| `get_options_chain` | Contract reference search or chain snapshots; expiry and strike filters, sort and pagination |
| `get_forex_data` | Currency conversion, last quote, or single forex snapshot |
| `get_forex_snapshots` | Multiple or all forex pair snapshots |
| `get_crypto_data` | Single, multiple, or all crypto ticker snapshots |
| `get_indices_snapshot` | Current index values, session metrics, timestamps, and per-index errors |
| `get_technical_indicators` | SMA, EMA, RSI, MACD; windows, price series, date filters, and pagination |
| `search_tickers` | Instrument discovery by name/symbol, market, exchange, type, and activity |
| `get_ticker_details` | Company metadata and optional point-in-time lookup |
| `get_reference_data` | Exchanges, ticker types, and trade/quote condition codes |
| `get_market_news` | Ticker/date-filtered articles and sentiment, with pagination |
| `get_market_status` | Current market/exchange status and optional upcoming holidays |
| `get_unified_snapshot` | Cross-market snapshots with pagination and per-ticker error information |
| `get_financial_statements` | Current `/stocks/financials/v1/` income statements, balance sheets, and cash flow statements |
| `get_financial_ratios` | Latest daily `/stocks/financials/v1/ratios` records |
| `get_corporate_actions` | Current `/stocks/v1/splits` and `/stocks/v1/dividends`, including adjustment factors |
| `get_stock_financials` | Deprecated legacy `/vX/reference/financials`; original schemas and parsing retained |
| `get_splits_dividends` | Deprecated legacy `/v3/reference/splits` and `/v3/reference/dividends`; original schemas and parsing retained |

The experimental financials endpoint was sunset on June 22, 2026. Its replacement
uses different response records and timeframe values. Use
`get_financial_statements` rather than relying on the legacy endpoint. Balance
sheets support annual or quarterly periods; income and cash flow statements also
support trailing twelve months. Financial statements and ratios require the
appropriate plan or add-on. Ratios contain the latest snapshot, not historical
series.

## Responses and pagination

Existing summary fields retain their types and requiredness. Current tools also
return `rawResponse`, preserving complete upstream data and null values. Optional
summary values are omitted when unavailable. Tools returning complete records
preserve the records directly, including null fields. Unified and index snapshots
retain individual ticker errors instead of presenting failed tickers as successful
market data.

Where supported, `nextCursor` is extracted from the provider's `next_url`. Pass
`cursor` to the same tool with the same ticker, data type, and filters to continue.
Only the cursor is reused; requests stay on the configured provider base URL.

## Product areas and limits

Tools are grouped into Stocks, Options, Forex, Crypto, and Indices categories.
Cross-market tools can belong to multiple categories. Market status and news
remain shared utilities.

Entitlements determine coverage, history, and real-time versus delayed data.
Options chain snapshots allow at most 250 results; contract reference searches
allow 1000. Stock trade/quote history and aggregate base-bar queries allow 50000;
indicator history allows 5000. The aggregate limit counts base bars used to
construct the response, not necessarily returned bars.

REST access does not implement WebSocket subscriptions, placing trades, or
flat-file downloads. The provider's streaming APIs are separate capabilities.

## Official references

- [REST quickstart and authentication](https://massive.com/docs/rest/quickstart)
- [Brand and API-domain migration](https://www.massive.com/blog/polygon-is-now-massive)
- [Stocks API](https://massive.com/docs/rest/stocks/overview)
- [Financial statements](https://massive.com/docs/rest/stocks/fundamentals/income-statements)
- [Financial ratios](https://massive.com/docs/rest/stocks/fundamentals/ratios)
- [Splits](https://massive.com/docs/rest/stocks/corporate-actions/splits)
- [Dividends](https://massive.com/docs/rest/stocks/corporate-actions/dividends)
- [Provider changelog and financials sunset](https://massive.com/changelog)
