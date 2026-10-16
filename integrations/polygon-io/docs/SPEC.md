# Polygon.io integration

Polygon.io is now Massive. This integration uses `https://api.massive.com`; existing Polygon API keys remain valid. It exposes read-only REST queries. Data access, history, and freshness depend on the subscription for each asset class.

## Authentication

Use an API key from the Polygon.io or Massive dashboard. Requests send `Authorization: Bearer <API_KEY>`. Empty keys fail validation. This API does not document an account/profile identity endpoint, so no identity tool is exposed. There are no OAuth scopes or token-refresh operations.

## Registered capabilities

- Search tickers and retrieve company/ticker details, including historical point-in-time details.
- Retrieve aggregate bars for stocks, options, forex, crypto, and indices. Aggregate limits count base aggregates used in calculation, so returned bars can be fewer than the limit.
- Retrieve a stock's daily open/close or previous close and daily bars for the entire US stock market.
- Retrieve stock trades and quotes, and interpret exchange and condition identifiers using `get_market_reference`. The same discovery tool lists supported ticker-type codes.
- Retrieve snapshots for stocks, options, forex, crypto, and indices. Explicit ticker lists use one request per ticker; gainers/losers and unfiltered snapshots cover stocks. Freshness depends on the plan.
- Calculate SMA, EMA, MACD, and RSI, and retrieve financial news with optional provider sentiment insights.
- Retrieve legacy company financial statements and legacy dividends/splits without changing their field semantics. `get_adjusted_corporate_actions` uses the current `/stocks/v1/dividends` and `/stocks/v1/splits` datasets and preserves event classifications and historical adjustment factors.
- Check market status and upcoming market holidays.

Stocks, Options, Forex, Crypto, and Indices categories group the distinct subscribed market APIs. Aggregate, snapshot, and indicator tools are shared across categories and continue accepting ticker symbols from other asset classes. Reference discovery and market-status utilities are uncategorized.

## Pagination and response fidelity

Paginated tools accept an optional opaque `cursor` and return `nextCursor` only when the provider supplies one. Keep filters unchanged between pages. Aggregate bars additionally return `nextFrom`; pass it as `from` with `nextCursor`, because the provider changes the date-range path for subsequent pages. Legacy dividend/split requests use independent dividend/split cursors.

Optional mapped fields omit absent or null provider values and preserve zeros and false values. Optional results arrays and their derived counts remain absent when the provider omits them, rather than fabricating empty arrays. Financial reports additionally expose `rawReports`, preserving provider source metadata and explicit nulls. Current corporate actions, grouped bars, and reference records retain original field names and values. Legacy numeric timestamp schemas remain numeric.

## Boundaries

This integration does not implement streaming/WebSocket subscriptions, triggers, account administration, or file downloads. Its source-filings URLs are provider links; financial statement tools do not fetch or deliver filing files. Current paid Financials-and-Ratios expansion endpoints are distinct from the retained legacy financial-report contract and are not added here.

## Official references

- [REST authentication and market APIs](https://massive.com/docs/rest/quickstart)
- [Polygon.io rebrand and API compatibility](https://massive.com/blog/polygon-is-now-massive)
- [Stocks endpoint overview](https://massive.com/docs/rest/stocks/overview)
- [Options endpoint overview](https://massive.com/docs/rest/options/overview)
- [Current dividends](https://massive.com/docs/rest/stocks/corporate-actions/dividends) and [splits](https://massive.com/docs/rest/stocks/corporate-actions/splits)
- [Legacy versus current financial-report shape](https://massive.com/knowledge-base/article/what-fields-can-i-expect-from-massives-financials-api)
