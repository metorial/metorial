# Slates Specification for CoinMarketCap

## Overview

CoinMarketCap is a cryptocurrency data platform, founded in 2013 and acquired by Binance in 2020, that provides real-time and historical market data for thousands of cryptocurrencies and exchanges. The API is a suite of high-performance RESTful JSON endpoints that allow application developers, data scientists, and enterprise business platforms to tap into the latest raw and derived cryptocurrency and exchange market data as well as years of historical data. It is a read-only data API — it does not support trading or purchasing cryptocurrency.

## Authentication

CoinMarketCap uses **API key authentication**. To use the CoinMarketCap API, developers need to sign up for an API key, which they can obtain by creating an account on the CoinMarketCap developer portal at `https://pro.coinmarketcap.com/signup/`.

The API key can be supplied in two ways:

1. **Request header (recommended):** Include the key in the `X-CMC_PRO_API_KEY` header.
2. **Query string parameter:** Pass the key as the `CMC_PRO_API_KEY` query parameter.

Via headers (`X-CMC_PRO_API_KEY`) or as a parameter in the query string (`CMC_PRO_API_KEY`). The recommended method is via headers.

**Base URLs:**

- Production: `https://pro-api.coinmarketcap.com`
- Sandbox: `sandbox-api.coinmarketcap.com` for test API calls. Test market data is not live data in this testing sandbox. `/latest` data endpoints will always return data from 2018-12-22.

**Example request:**

```
GET https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest
Headers:
  X-CMC_PRO_API_KEY: your-api-key-here
  Accept: application/json
```

**Plans:** Free Plan: 9 market data endpoints with 10,000 API calls monthly. Startup Plan: $79/month for 14 endpoints including historical data. Standard and Professional Plans: Access to all 22 endpoints with higher limits. An Enterprise plan is also available for custom needs.

## Features

### Cryptocurrency Market Data

Retrieve real-time market data for thousands of cryptocurrencies, including price, market capitalization, trading volume, circulating supply, and percentage changes. The API supports displaying market pricing data in 93 different fiat currencies as well as 4 precious metals. Cryptocurrencies can be queried by CoinMarketCap ID, symbol, or slug. Results can be sorted by market cap, price, volume, and other metrics.

### Cryptocurrency Metadata

The metadata endpoint returns all the static data that is available for the specified cryptocurrency. The information obtained contains the following: logo, description, website URL, various social links and other. The metadata endpoints include hosted logo assets in PNG format. 64px is the default size returned but you may replace "64x64" in the image path with alternative sizes: 16, 32, 64, 128, 200.

### Cryptocurrency ID Mapping

List all active and inactive cryptocurrencies with their CoinMarketCap IDs, symbols, slugs, and platform details. You can list all active and inactive cryptocurrencies using the cryptocurrency map endpoint. Each entry includes a `first_historical_data` timestamp indicating how far back historical records are available. Useful for building local mappings between CMC IDs and symbols.

### Historical Market Data

Access historical price, market cap, volume, and OHLCV (Open, High, Low, Close, Volume) data for cryptocurrencies and exchanges. Historical cryptocurrency data goes back to 2013. Historical data endpoints require a paid plan (Startup or above). You can specify time ranges and intervals for the returned data.

### Exchange Data

Retrieve data about cryptocurrency exchanges, including exchange listings, metadata, market pairs, and volume. Exchange Endpoints provide data on cryptocurrency exchanges and performance. Includes both latest and historical exchange metrics. Exchange data is available on Standard and Professional plans and above.

### Market Pairs

Returns a list of the latest market pairs for a specific cryptocurrency, including their current price, volume, and liquidity. Allows exploring which trading pairs are available across different exchanges for a given cryptocurrency.

### Global Market Metrics

Returns the latest global cryptocurrency market metrics, including total market capitalization, trading volume, and Bitcoin dominance. Both latest and historical global metrics are available (historical requires a paid plan).

### Price Conversion

Convert amounts between any supported cryptocurrency and fiat currency using real-time exchange rates. Supports conversion by CoinMarketCap ID or symbol, and allows specifying the target currency.

### DEX Data

The DEX API provides real-time transaction data and historical insights for decentralized exchange trading. Covers major DEXs with endpoints for spot pairs, OHLCV data, trade feeds, and listing information.

### Fiat Currency Mapping

List all supported fiat currencies and precious metals, with their names, symbols, and signs. Useful for determining valid conversion targets for market data queries.

## Events

The provider does not support events. CoinMarketCap's API is a read-only data retrieval service and does not offer webhooks, event subscriptions, or any built-in push/polling notification mechanism.
