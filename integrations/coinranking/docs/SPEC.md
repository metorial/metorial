# Slates Specification for Coinranking

## Overview

Coinranking is a cryptocurrency data provider that offers real-time and historical data on coins, exchanges, markets, and global crypto statistics. Its API serves as a read-only data source for cryptocurrency prices, market caps, trading volumes, and related market information.

## Authentication

The Coinranking API uses API keys to authenticate requests. You can only do a very limited amount of requests without authenticating.

To get an API key:

1. Create a free account at `https://account.coinranking.com/create-developer-account`.
2. Find your API key on the dashboard at `https://account.coinranking.com/dashboard`.

The API key must be passed as an HTTP header on every request:

```
x-access-token: your-api-key
```

All API requests must be made over HTTPS.

**Base URL:** `https://api.coinranking.com/v2`

## Features

### Coin Data

Browse, search, and filter a comprehensive list of cryptocurrencies. It provides the most crucial data of coins in a handy filterable list. Retrieve detailed information about specific coins including price, supply, rank, market metrics, social links, and descriptive metadata. Trending coins are available based on user engagement and popularity. Coins can be filtered by tier (quality level), tags, and sorted by various criteria like market cap or price. A bulk endpoint is available for fetching all coins at once (Pro plan).

### Price Data

Fetch a single price point for a coin, with the option to specify a timestamp for historical prices. Get a series of price points going back in time for various periods. Pro features include OHLCV (Open/High/Low/Close/Volume) data, fiat price conversions, and coin gains and losses tracking.

### Historical Metrics (Pro)

Access historical data for individual coins including market cap history, trading volume history, rank history, and supply history. Global-level historical data is also available for total market cap, trading volume, and Bitcoin dominance.

### Exchanges

Get a list of centralized exchanges for which Coinranking periodically fetches price data. Retrieve specific information about a centralized exchange, such as links to its socials. Fetch coins listed on a specific exchange, including the latest new coin listings. Exchange market listings are also available. All exchange endpoints require a Pro plan.

### Decentralized Exchanges (DEXs)

Browse decentralized exchanges (DEXs) and DEX protocols. View DEX details, coin listings, new coin listings, and market data. All DEX endpoints require a Pro plan.

### Markets (Pro)

Access trading pair/market data across exchanges, including market details such as price and volume for specific trading pairs.

### Blockchains (Pro)

Retrieve information about blockchains, including blockchain details and contract address lookups.

### Global Statistics

Access aggregated crypto market statistics such as total market cap, total 24-hour volume, number of coins, and number of exchanges. Stats can also be retrieved for a custom selection of coins.

### Reference Currencies

List available reference currencies (e.g., USD, EUR, BTC) that can be used to denominate prices across all other endpoints.

### Search & Tags

Search across coins, exchanges, and markets with a unified search suggestions endpoint. Browse and filter coins by tags (categories like DeFi, stablecoins, etc.).

### Real-Time Data via WebSockets (Pro)

Subscribe to real-time cryptocurrency rates, exchange-specific rates, and ticker data including price, volume, and market statistics via WebSocket connections at `wss://api.coinranking.com/v2/real-time/<path>`. DEX real-time data requires an additional add-on available only on the Professional plan.

## Events

The provider does not support webhooks or event subscription mechanisms. Coinranking offers WebSocket connections for real-time streaming data (rates, exchange rates, tickers), but these are continuous data streams rather than discrete event notifications. There are no webhook or callback-based event systems available.
