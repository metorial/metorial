# Benzinga API Specification

The integration provides read-only access to Benzinga news, calendar events, market data, company fundamentals, corporate logos, and ticker trends. Access depends on the datasets licensed to the connected API key.

## Authentication

Use a Benzinga API key from the developer portal or licensing team. Requests send the key in the `token` query parameter over HTTPS. News channel discovery additionally sends the key in the endpoint's required `Key` header. No OAuth scopes or refresh tokens are involved. The documented APIs do not expose a suitable current-user or account identity endpoint.

## Available tools

| API family | Tools |
| --- | --- |
| Newsfeed | `search_news`, `get_news_article`, `get_news_channels`, `get_wiims` |
| Calendar and Signals | `get_calendar_events`, `get_consensus_ratings`, `get_options_activity`, `get_government_trades`, `get_insider_transactions` |
| Market Data | `get_delayed_quotes`, `get_historical_bars`, `get_market_movers`, `get_short_interest` |
| Company Fundamentals | `get_company_fundamentals` |
| Corporate Logos | `get_corporate_logos` |
| Ticker Trends | `get_trending_tickers` |

These categories follow the API families documented by Benzinga. News, Calendar, Corporate Logos, and Ticker Trends have separate official API specifications. Benzinga also documents Company Fundamentals and Market Data as separate reference families within its data API.

## Request and response behavior

- News supports ticker, channel, content, date, region, and publication/update timestamp filtering. `get_news_channels` returns the provider's channel catalog. `get_news_article` accepts an article ID from search results and returns an empty article list when the provider cannot return that article.
- WIIM explanations come from the News API with the `WIIM` channel. Each associated ticker receives an explanation with the actual headline, article body, and URL. Articles without an associated ticker remain available without a fabricated symbol. The `country` input uses the News API's region filter; no country metadata is inferred from it.
- Calendar events use the documented v2.1 routes and their exact response wrappers. The IPO `date` filter uses `ipo_date`. Economic country filtering uses `country`. Update filters use Unix timestamps in seconds.
- Insider filings use `/api/v1/sec/insider_transactions/filings`; government ticker searches explicitly use the `ticker` search-key type. Numeric provider timestamps remain represented as strings in the existing normalized timestamp outputs.
- Historical bars require `from` at invocation. Existing interval choices translate to the provider's case-sensitive values, including `1MONTH` to `1M`. The optional session filter supports all sessions or a specific trading session.
- Delayed quotes handle the provider's symbol-keyed response and its `lastTradePrice`, `previousClosePrice`, and `closeDate` fields. Provider numeric strings in bars, movers, options, and short interest are converted only when they contain finite numeric values, preserving actual zero values.
- Logo results retain the provider's original CDN URLs and request brand colors along with light/dark and vector variants.
- Existing normalized result fields retain their original scalar types and requiredness. The optional `raw` output retains complete original responses, including provider metadata, URLs, and fields without normalized counterparts. Calendar events and fundamentals already retain their original record data.
- Pagination and documented integer limits are checked at invocation without changing the existing number input schemas. Provider errors retain the documented `text` or structured `errors[].value` details.

## Official sources

- [Benzinga API reference and API family index](https://docs.benzinga.com/llms.txt)
- [News channel discovery authentication](https://docs.benzinga.com/api-reference/news-api/channels/get-available-news-channels)
- [News API specification](https://github.com/Benzinga/benzinga-docs/blob/main/openapi/news-api.spec.yml)
- [WIIM endpoint and response example](https://docs.benzinga.com/api-reference/news-api/wiims/get-wiims)
- [Calendar API specification](https://github.com/Benzinga/benzinga-docs/blob/main/openapi/calendar-api.spec.yml)
- [Insider filing response example](https://docs.benzinga.com/api-reference/calendar-api/insider-transaction/get-insider-transaction-filing)
- [Government trade response example](https://docs.benzinga.com/api-reference/calendar-api/government-trades/get-government-trades)
- [Data API specification](https://github.com/Benzinga/benzinga-docs/blob/main/openapi/data-api-proxy.spec.yml)
- [Delayed quote response example](https://docs.benzinga.com/api-reference/quotedelayed/get-delayed-quotes)
- [Market movers response example](https://docs.benzinga.com/api-reference/market-data/get-market-movers)
- [Short interest response example](https://docs.benzinga.com/api-reference/market-data/get-short-interest-data)
- [Corporate Logo API specification](https://github.com/Benzinga/benzinga-docs/blob/main/openapi/logo-api.spec.yml)
- [Ticker Trends API specification](https://github.com/Benzinga/benzinga-docs/blob/main/openapi/ticker-trends-api.spec.yml)
