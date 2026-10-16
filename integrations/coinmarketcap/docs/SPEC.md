# CoinMarketCap Integration

## Authentication and environments

Create an API key in the [CoinMarketCap Developer Portal](https://pro.coinmarketcap.com/signup/). Requests send the key in the recommended `X-CMC_PRO_API_KEY` header and accept JSON responses. The key is owned by the authentication configuration. The separate environment setting selects `https://pro-api.coinmarketcap.com` or `https://sandbox-api.coinmarketcap.com`.

## Supported workflows

- List ranked cryptocurrencies with price, market capitalization, supply, volume, sorting, and pagination filters.
- Find cryptocurrency IDs, symbols, slugs, listing status, platform data, and historical data availability.
- Read latest quotes and static metadata for selected cryptocurrencies. Symbols can match several assets; use stable CoinMarketCap IDs for precise lookups.
- Convert an amount between supported cryptocurrencies, fiat currencies, and precious metals. Historical conversions depend on the API plan. Ambiguous source symbols require a stable currency ID.
- List cryptocurrency trading pairs with exchange identity, price, volume, and available liquidity data.
- Read aggregate market metrics, cryptocurrency/exchange counts, and dominance. Additional sector metrics are returned when available.
- List exchanges by trading volume, discover exchange IDs and listing states, and read exchange metadata.
- Discover supported fiat currency IDs, symbols, and signs, optionally including precious metals.
- Read the connected API key's plan limits and current minute, daily, and monthly usage without spending API credits; the request still counts toward the minute limit.

All twelve tools are read-only. API access and historical conversion availability depend on the API plan. Responses retain the original provider envelope alongside the structured results. Missing market-pair or exchange liquidity data remains unknown, and an unavailable description is omitted.

## API compatibility

The existing cryptocurrency listings and quotes workflows retain their V1/V2 endpoints and established currency-keyed quote objects. CoinMarketCap documents V3 quote arrays and richer tag objects as potentially incompatible. Exchange metadata uses the documented `/v1/exchange/info` endpoint.

## Reference

- [Official API reference](https://coinmarketcap.com/api/documentation/pro-api-reference)
- [Authentication](https://coinmarketcap.com/api/documentation/guides/authentication)
- [Response conventions](https://coinmarketcap.com/api/documentation/guides/standards-and-conventions)
- [Errors and limits](https://coinmarketcap.com/api/documentation/guides/errors-and-rate-limits)
