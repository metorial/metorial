# Slates Specification for Polygon.io

## Overview

Polygon.io provides financial market data APIs, offering real-time, delayed and historical data across stocks, forex, and cryptocurrencies. It covers asset classes including Stocks, Crypto, Forex, Options, Indices, and Economy. It supports RESTful API for historical queries and WebSocket API for real-time streaming.

## Authentication

Polygon.io uses **API key** authentication. All API requests require authentication using your Polygon.io API key. All endpoints require authentication via API key.

The API key can be provided in two ways:

1. **Authorization Header (recommended):** Pass the API key as a Bearer token in the `Authorization` header:

   ```
   Authorization: Bearer YOUR_API_KEY
   ```

2. **Query Parameter:** Pass the API key as the `apiKey` query parameter:
   ```
   https://api.polygon.io/v3/reference/tickers?apiKey=YOUR_API_KEY
   ```

In order to use Polygon APIs, you first need to create an account on Polygon.io. Go to polygon.io and create an account. Open your Dashboard and select API Keys to view your key.

There are no OAuth flows or scopes. The API key is tied to your subscription plan, which determines what data and features you can access (e.g., real-time vs. delayed data, available asset classes).

For WebSocket connections, the default endpoint is `wss://socket.polygon.io`. When a connection opens, it immediately sends an authentication message with the provided API key.

## Features

### Stock Market Data

Access real-time and historical data for US stocks from all exchanges. This includes trades, quotes (NBBO), daily open/close prices, previous close, and aggregate bars (OHLCV). Results can be adjusted for splits, and by default they are adjusted. Aggregates are available at configurable timespans (second, minute, hour, day, week, month, quarter, year).

### Options Data

Retrieve options contract data including trades, quotes, snapshots, and aggregate bars. Available data includes Options Contracts and Ticker Events. You can look up option contracts by underlying ticker, expiration date, strike price, and contract type (call/put).

### Forex Data

Access foreign exchange market data including real-time and historical currency pair quotes, trades, and aggregates. Supports major, minor, and exotic currency pairs.

### Cryptocurrency Data

The API provides real-time streaming access to market data including trades, quotes, aggregates, and specialized data streams like Level 2 order book data for cryptocurrencies.

### Indices Data

Polygon.io provides market data for over 10,000+ indices from multiple index families, including S&P, Nasdaq, Dow Jones, and more, offering real-time prices, historical data, and reference information. Polygon.io sources Indices data from CME Group, CBOE, and Nasdaq.

### Technical Indicators

Polygon supports Simple Moving Average (SMA), Exponential Moving Average (EMA), Moving Average Convergence/Divergence (MACD), and Relative Strength Index (RSI). The API uses underlying aggregates to construct technical indicators, with flexibility to specify date ranges, timespan of aggregates, split adjustment, and sort order. Configurable parameters include window size, series type (open, high, low, close), and timespan.

### Snapshots

Retrieve unified snapshots of market data for multiple asset classes including stocks, options, forex, and cryptocurrencies in a single request. This endpoint consolidates key metrics such as last trade, last quote, open, high, low, close, and volume. By aggregating data from various sources into one response, users can efficiently monitor and compare information spanning multiple markets.

### Reference Data

Access market metadata and reference information including:

- **Tickers:** Query all ticker symbols which are supported by Polygon.io, currently including Stocks/Equities, Crypto, and Forex.
- **Ticker Details:** Get detailed information about a ticker and the company behind it.
- Stock Financials: 10K and 10Q financial reports for all US-based companies, sourced from the SEC Edgar database.
- Stock Splits: Data for all splits through the Stock Splits v3 endpoint.
- **Dividends:** Historical cash dividend data filterable by ticker, dates, frequency, and dividend type.
- Market Status: The current trading status of the exchanges and overall financial markets, including whether exchanges are in pre-market, normal trading hours, or after-hours.
- **Market Holidays, Exchanges, Conditions, and Ticker Types.**

### Ticker News

Access financial news articles related to specific tickers with sentiment analysis. Benzinga's detailed analyst ratings, corporate guidance, earnings reports, and structured financial news are available through the REST APIs.

## Events

Polygon.io provides real-time data streaming via **WebSocket connections**, not traditional webhook callbacks.

### Stock Streams

Data that can be streamed in real-time for both individual stock tickers and across the entire market includes: Aggregates (Per Minute), Aggregates (Per Second), Trades, and Quotes. Subscribe to specific ticker symbols or use wildcard (`*`) to receive data for all tickers.

### Options Streams

Real-time streaming of options trades, quotes, and per-minute/per-second aggregates. Subscribable per individual option contract symbol or across all contracts.

### Forex Streams

Real-time streaming of forex quotes and per-minute/per-second aggregates for currency pairs.

### Crypto Streams

Real-time streaming of cryptocurrency trades, quotes, aggregates, and Level 2 order book data.

### Indices Streams

Real-time streaming of index values and per-minute/per-second aggregates.

**WebSocket Configuration:**

- Polygon.io allows one simultaneous connection to one cluster at a time (clusters: stocks, options, forex, crypto), which means 4 total concurrent streams.
- Alternative endpoints include `wss://delayed.polygon.io` for 15-minute delayed stock data and `wss://business.polygon.io` for Business tier features like Fair Market Value.
- Available data tiers (real-time vs. delayed) depend on your subscription plan.
