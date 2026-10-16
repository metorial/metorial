# Coinranking Specification

## Authentication and configuration

Coinranking uses an API key sent in the `x-access-token` header over HTTPS to `https://api.coinranking.com/v2`. Obtain a key from the [developer dashboard](https://account.coinranking.com/dashboard). Empty API keys fail with a user-facing validation error. There is no OAuth refresh flow or documented account/profile endpoint in the public market-data API.

`referenceCurrencyUuid` is optional configuration. Per-tool currency input overrides it; the provider defaults to USD when neither is set. Discover currency UUIDs with `list_reference_currencies`. No setup field requires an opaque account or workspace ID.

## Implemented tools

| Tool | API endpoint | Notes |
| --- | --- | --- |
| `search` | `GET /search-suggestions` | Coin, exchange, and market summaries; optional suggestion-type filters. Original response data also preserves fiat, categories, commodities, indices, stocks, and additional identifiers. |
| `list_coins` | `GET /coins` | Search, tiers, tags, sorting, symbols, UUIDs, contracts, and blockchains. Offset is preserved; cursor pagination supports later pages. |
| `get_coin_details` | `GET /coin/:uuid` | Coin metadata, financial data, supply, links, and tags. |
| `get_coin_price` | `GET /coin/:uuid/price` | Current or nearest historical price; timestamp is epoch seconds. |
| `get_coin_price_history` | `GET /coin/:uuid/price-history` | Price points, change, and time ranges including `all` when the plan allows it. |
| `get_trending_coins` | `GET /coins/trending` | User-engagement ranking, tier filters, offset pagination. A total is only returned when the provider supplies it. |
| `get_global_stats` | `GET /stats` | Counts, market cap, volume, BTC dominance, and best/newest coin highlights. |
| `list_reference_currencies` | `GET /reference-currencies` | Search, type filters, offset and cursor pagination. Legacy `asset` selects commodities, indices, and stocks. |
| `list_tags` | `GET /tags` | Discover category/ecosystem slugs and aggregate market statistics, with offset and cursor pagination. |

Existing structured field types are retained. Every tool also exposes optional original provider data so extra metadata and explicit nulls remain available. Required identifiers, collections, and numeric metrics are validated; malformed responses fail instead of inventing IDs, totals, or timestamps. Optional tag summaries omit unavailable values.

## Limits and provider errors

The free plan generally limits list requests to 100 results and historical time ranges to one year. The provider allows higher list limits up to 5000 on eligible plans. Coin-list offset is capped at 5000; use the returned cursor to continue. Offset and cursor are alternatives. Historical `all` is available only for eligible paid plans.

Requests use a 30-second timeout. HTTP errors and failure envelopes produce user-facing errors that preserve provider status, error type/code, and validation detail. API key validation is local; successful authentication is established by subsequent provider operations.

## Scope

This is a read-only, single-product cryptocurrency data integration. Paid-only exchanges, DEXs, markets, blockchains, bulk downloads, indicators, and historical metric endpoints are not implemented. The provider offers WebSockets for streaming data; no webhooks or triggers are registered.

## Official API references

- [Getting started and authentication](https://coinranking.com/api/documentation)
- [Coin list](https://coinranking.com/api/documentation/coins/coins)
- [Coin details](https://coinranking.com/api/documentation/coins/coin-details)
- [Coin price](https://coinranking.com/api/documentation/coins/coin-price)
- [Price history](https://coinranking.com/api/documentation/coins/coin-price-history)
- [Trending coins](https://coinranking.com/api/documentation/coins/trending-coins)
- [Global statistics](https://coinranking.com/api/documentation/stats/stats)
- [Reference currencies](https://coinranking.com/api/documentation/reference-currencies)
- [Search suggestions](https://coinranking.com/api/documentation/search-suggestions)
- [Tags](https://coinranking.com/api/documentation/tags/tags)
