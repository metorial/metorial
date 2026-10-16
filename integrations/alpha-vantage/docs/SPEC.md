# Alpha Vantage API Specification

Alpha Vantage provides financial market data through HTTPS GET requests to
`https://www.alphavantage.co/query`. The `function` query parameter selects the
API operation, and `apikey` supplies the API key. Obtain a key from the
[official support page](https://www.alphavantage.co/support/#api-key).
There is no OAuth flow, refresh token, or account/profile endpoint in the
[documented API](https://www.alphavantage.co/documentation/).

The integration provides 20 read-only tools:

| Workflow | Tools and behavior |
| --- | --- |
| Equity prices | `get_stock_price` retrieves intraday, daily, weekly, or monthly OHLCV. Intraday supports adjusted data, extended hours, historical months, and premium data entitlements. Daily/weekly/monthly adjusted endpoints retain raw OHLCV and expose adjusted close separately. |
| Quote and discovery | `get_quote` retrieves one ticker quote; `search_symbol` discovers supported symbols; `get_market_status` returns market hours and open/closed states. |
| Company research | `get_company_overview`, `get_financial_statements`, `get_earnings`, and `get_dividends_and_splits` expose fundamentals, quarterly/annual reports, earnings, and corporate actions. |
| Additional research | `get_etf_profile` returns ETF metrics and holdings; `get_insider_transactions` supports an optional starting date; `get_earnings_estimates` returns EPS/revenue forecasts and revisions; `get_earnings_call_transcript` returns speaker turns and provider sentiment for a quarter from 2010Q1 onward. These tools retain the complete provider response. |
| Currencies | `get_forex_rate` returns an exchange-rate snapshot or intraday/daily/weekly/monthly history. `get_crypto_price` returns daily/weekly/monthly prices in the requested market currency. |
| Commodities | `get_commodity_price` covers energy, metals, agricultural commodities, and the global commodities index. Energy supports daily/weekly/monthly data; the other supported series use monthly/quarterly/annual intervals. |
| Economics | `get_economic_indicator` covers GDP, GDP per capita, treasury yields, federal funds, CPI, inflation, retail sales, durable goods, unemployment, and payrolls. Interval support depends on the selected series; CPI includes semiannual data and treasury yields support maturity selection. |
| Technical analysis | `get_technical_indicator` supports documented moving averages, momentum/volume indicators, oscillators, volatility measures, and Hilbert transforms. It validates required period/price inputs and supports the documented MACDEXT, stochastic, ULTOSC, SAR, and MAMA parameters. |
| Market intelligence | `get_news_sentiment` filters by ticker, topic, time, order, and limit. Comma-separated filters require simultaneous matches. `get_top_movers` returns gainers, losers, and active tickers. |
| Options | `get_options_chain` returns realtime or historical contracts, with contract/expiration filtering in either mode and optional realtime Greeks. |

Availability depends on the API key and subscribed plan. Intraday stocks,
adjusted daily stocks, intraday FX, company overview, market news, options,
and selected technical indicators require premium access. Equity quotes and
top movers update at the end of the trading day by default; realtime and
15-minute delayed US data require the corresponding entitlement. Full daily
history also requires premium access. Consult the provider for current limits
and commercial licensing.

Provider decimal strings, real zeros, and supplied missing-value strings are
preserved. Unexpected missing required values produce an error. Annual
`get_earnings` records omit analyst estimates and surprise metrics when absent.
Reported dates and crypto market capitalization remain required: annual
earnings records without reportedDate, or crypto observations without the
USD market-cap value, produce a structured error. Realtime
options implied volatility may be absent when Greeks are not requested.
These three tools also return the complete provider response in `raw`.
Commodity/economic observations marked `.` by the provider are excluded from
price/value arrays rather than converted to zero.

All tools return JSON data. No webhook or event trigger is registered.
