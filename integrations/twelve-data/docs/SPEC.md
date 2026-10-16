# Twelve Data integration

## Connection

Use a Twelve Data API key. The connection stores it as `token` and sends `apikey` on REST requests to `https://api.twelvedata.com`. There is no required resource configuration, OAuth flow, refresh token, or requested OAuth scope.

## Available workflows

- Market data: `get_time_series`, `get_quote`, `get_price`, and `get_end_of_day_price`.
- Currencies: `get_exchange_rate` and `convert_currency`.
- Fundamentals: `get_company_profile`, `get_financial_statements`, `get_dividends_and_splits`, `get_earnings_history`, and `get_earnings_calendar`.
- Analysis: `get_analyst_data`, `get_technical_indicator`, and `list_technical_indicators`.
- Funds: `get_fund_data` selects the global ETF or mutual-fund endpoint and retains its nested summary, composition, performance, and risk data.
- Discovery and operational context: `search_symbols`, `list_exchanges`, `get_market_state`, and `get_api_usage`.

`get_api_usage` describes the connected key's credit usage and limits; it does not return account identity. REST tools do not provide WebSocket subscriptions or triggers.

## Financial data interpretation

Coverage, subscription entitlements, exchange licensing, and market sessions determine available data and freshness. A quote's `timestamp` is the interval's opening Unix timestamp in seconds. When returned, `lastQuoteAt` is the provider's last-minute candle Unix timestamp in seconds. `get_price` has no returned timestamp; its per-price `symbol` associates the requested ticker with the response, rather than claiming an independently returned symbol.

Time-series date/time values are provider bar-opening times. Intraday requests accept `Exchange`, `UTC`, or a case-sensitive IANA timezone. For `1day`, `1week`, and `1month`, Twelve Data ignores the timezone parameter and uses exchange local time. Pre/post market OHLC data requires Pro (individual) or Venture (business) or higher, applies to US equities at 1min, 5min, 15min, or 30min, and does not include volume.

Exchange rates and converted currency amounts are provider numbers serialized to the existing string output fields. In `convert_currency`, `amount` is explicitly the original request amount; `convertedAmount` uses the provider's `amount` field. No local exchange-rate multiplication substitutes for a missing provider amount. Missing required response fields fail with a service error. Optional scalar summaries omit incompatible unavailable values, while additive `raw` responses preserve the original nulls and nested data.

## Legacy selections

The keys, schemas, and invocation handlers for `get_earnings`, `get_etf_details`, and `get_mutual_fund_details` remain preserved. Use `get_earnings_history` instead of the legacy earnings tool: the current earnings endpoint supports `latest` and `next`, while the legacy schema offers `annual` and `quarterly`. Use `get_fund_data` for the documented `/etfs/world` or `/mutual_funds/world` nested dataset rather than treating those responses as legacy profile/holdings pairs. The legacy fund handlers still contain their original partial-failure behavior; new workflows propagate failures.

## Official references

- [API documentation](https://twelvedata.com/docs)
- [Official REST endpoint index](https://github.com/twelvedata/twelvedata-node/blob/master/api_reference.md)
- [Market data](https://github.com/twelvedata/twelvedata-node/blob/master/docs/MarketDataApi.md)
- [Fundamentals](https://github.com/twelvedata/twelvedata-node/blob/master/docs/FundamentalsApi.md)
- [Currencies](https://github.com/twelvedata/twelvedata-node/blob/master/docs/CurrenciesApi.md)
- [ETFs](https://github.com/twelvedata/twelvedata-node/blob/master/docs/EtfsApi.md) and [mutual funds](https://github.com/twelvedata/twelvedata-node/blob/master/docs/MutualFundsApi.md)
