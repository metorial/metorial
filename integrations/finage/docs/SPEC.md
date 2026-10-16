# Finage Specification

## Authentication

Use a Finage API key. REST requests target `https://api.finage.co.uk` and send the key in the `apikey` query parameter. The integration has no separate resource configuration, OAuth flow, or requested OAuth scopes. The public endpoint catalog does not expose an account/profile endpoint suitable for an identity tool.

## Available tools

| Tool | Provider capability |
| --- | --- |
| `get_stock_price` | US stock last quote, actual last trade, and previous close |
| `get_stock_aggregates` | US stock OHLCV date range |
| `get_stock_snapshot` | Latest quotes and/or trades for selected symbols or the full available market |
| `get_forex_price` | Forex last quote and previous close |
| `get_forex_aggregates` | Forex OHLCV date range |
| `convert_currency` | Forex or cryptocurrency conversion |
| `get_crypto_price` | Cryptocurrency last trade and previous close |
| `get_crypto_aggregates` | Cryptocurrency OHLCV date range |
| `get_financial_statements` | Income, balance-sheet, or cash-flow statements |
| `get_market_news` | Stock or cryptocurrency symbol news |
| `get_market_movers` | Most active stocks, top gainers, or top losers |
| `search_market` | US stock company-name/symbol search |
| `get_market_status` | Overall US market, exchange, forex, and crypto statuses |
| `get_technical_indicator` | Stock SMA, EMA, DEMA, TEMA, WMA, RSI, Williams, and ADX |
| `get_sector_performance` | US sector daily percentage performance |
| `get_economic_calendar` | Economic or earnings calendar |
| `get_stock_signals` | Daily or weekly US stock technical signals |
| `list_symbols` | Paged symbol discovery for US/Canadian/Indian/Russian stocks, forex, crypto, and indices |
| `get_stock_details` | Company profile, exchange, website, sector, management, and valuation fields |

## Request and response behavior

Historical date inputs use valid `YYYY-MM-DD` calendar dates, with the start on or before the end. Limits and multipliers must be positive whole numbers; historical result limits may not exceed 50,000. Cryptocurrency multipliers are 1, 3, 5, 15, or 30. Stock and forex timestamps are requested as numeric timestamps. No available results are invented when the provider returns malformed data or an error.

Symbol news requires a symbol for both stock and crypto, has a maximum of 30 articles, and does not document page-based pagination. The existing `page` input remains available for compatibility and accepts an omitted value or 1. Economic events require both dates. The earnings endpoint documents no date parameters, so supplied date filters apply locally to the returned calendar.

The provider currently documents only US market search. Other existing market enum values remain in the schema and produce an actionable validation error; use `list_symbols` for supported international catalogs. Technical indicators document daily and intraday intervals. Existing weekly/monthly enum values remain in the schema and produce an actionable validation error.

All existing output field names, scalar types, and requiredness remain intact. Additive `raw` fields retain complete provider responses, including nulls and numeric strings. Technical indicator and market mover numeric strings are parsed into existing numeric summaries. Stock signal indicators are read from the provider's nested `indicators` object; crossover booleans become the existing string statuses, and original booleans remain in `raw`. Confidence is converted from the documented fraction to the existing percentage summary.

API failures and invalid responses surface as service errors. Pricing tools propagate failures from requested quote/trade/previous-close operations. No file tools, webhooks, or streaming subscriptions are registered.

## Official sources

The [API documentation](https://finage.co.uk/docs/api) embeds the complete public endpoint catalog, including exact paths, query parameters, and example responses for the capabilities above. Focused references: [US stock last trade](https://finage.co.uk/docs/api/us-stocks/stock-last-trade), [stock aggregates](https://finage.co.uk/docs/api/us-stocks/stock-market-aggregates-api), [stock snapshot](https://finage.co.uk/docs/api/us-stocks/stock-snapshot-api), and [US stock signals](https://finage.co.uk/docs/api/fundamentals/us-stocks-signal-api).
