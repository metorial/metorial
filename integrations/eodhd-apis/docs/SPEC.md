# EODHD APIs integration specification

Authentication uses an API token in the `api_token` query parameter. Configuration is empty. Connection profile lookup and Get Current User use `GET /api/user`. All tools request JSON from `https://eodhd.com/api` and are read-only.

| Tools | Provider endpoints |
| --- | --- |
| Get Historical Prices, Get Intraday Prices, Get Live Prices | `/eod/{ticker}`, `/intraday/{ticker}`, `/real-time/{ticker}` |
| Get Fundamentals, Search Instruments | `/fundamentals/{ticker}`, `/search/{query}` |
| Get Financial News, Get Sentiment | `/news`, `/sentiments` |
| Screen Stocks, Get Technical Indicators | `/screener`, `/technical/{ticker}` |
| Get Financial Calendar | `/calendar/earnings`, `/calendar/ipos`, `/calendar/splits` |
| Get Dividends & Splits, Get Insider Transactions | `/div/{ticker}`, `/splits/{ticker}`, `/insider-transactions` |
| Get Options Chain | Legacy `/options/{ticker}` |
| Get Macro Indicators, Get Economic Events | `/macro-indicator/{country}`, `/economic-events` |
| Get Exchange Info, Get Exchange Details | `/exchanges-list/`, `/exchange-symbol-list/{exchangeCode}`, `/v2/exchange-details`, `/v2/exchange-details/{exchangeCode}` |
| Get Bulk EOD Data | `/eod-bulk-last-day/{exchangeCode}` |
| Get Current User | `/user` |

Use Get Exchange Info or Search Instruments to discover symbols and exchanges. Omit exchangeCode in Get Exchange Details to discover the codes supported by its v2 trading schedule endpoint. Most symbols use `SYMBOL.EXCHANGE`. Macro indicators accept ISO alpha-3 country codes; economic events accept ISO alpha-2 codes. Intraday timestamps are Unix seconds and omitted intervals are sent as `5m` to match the tool's existing reported default.

Financial news permits ticker and topic filters; omitting both returns the latest general feed. Earnings and split symbols narrow the date window. Provide dates alongside symbols to search beyond the default next seven days. IPO calendars use date filters. Calendar split share counts are serialized as strings to preserve the existing output contract. Screener pagination supports limits up to 500 and offsets up to 999.

All pre-existing tool keys and input/output types remain available. Get Options Chain retains its legacy route and parameters because the current marketplace options API has a different request and response contract. Dataset access and request costs depend on the account plan. No WebSocket streaming, OAuth, webhooks, or triggers are implemented.

Provider errors are translated with HTTP status and response-body details when available. Unexpected collection envelopes produce an error instead of a successful empty collection. Scalar fundamentals filters remain unchanged. No downloadable file tools are exposed; bulk EOD returns structured records.

Official references: [API documentation](https://eodhd.com/financial-apis/), [provider OpenAPI](https://github.com/EodHistoricalData/EODHD-openapi), [User API](https://eodhd.com/financial-apis/user-api), [News and sentiment](https://eodhd.com/financial-apis/stock-market-financial-news-api), [Stock screener](https://eodhd.com/financial-apis/stock-market-screener-api), [current Options Marketplace](https://eodhd.com/marketplace/unicornbay/options).
