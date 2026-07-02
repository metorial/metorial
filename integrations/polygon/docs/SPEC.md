# Slates Specification for Polygon

## Overview

Polygon.io (now rebranded as Massive) is a financial market data provider offering REST and WebSocket APIs for real-time and historical data across stocks, options, forex, crypto, and indices. Polygon.io provides comprehensive financial market data APIs for stocks, crypto, forex, options, and indices. The API is read-only and focused on market data retrieval, reference data, and technical analysis — it does not support placing trades.

## Authentication

Polygon uses API key authentication. The Polygon Getting started documentation references that any API call to their platform requires you to send your API key in the headers or as a query parameter.

**API Key:**

- Obtain your API key by creating a Polygon.io account and navigating to the API Keys section of your dashboard. Go to polygon.io and create an account. Open your Dashboard and select API Keys to view your key.
- The API key can be passed in two ways:
  1. **Query parameter:** Append `apiKey=YOUR_KEY` as a query parameter to any request.
  2. **Authorization header:** Send an `Authorization: Bearer <your_api_key>` header with each request.
- The base URL is `https://api.polygon.io`.
- For WebSocket connections, the default base URL for real-time data is `wss://socket.polygon.io`, with alternative endpoints such as `wss://delayed.polygon.io` for 15-minute delayed data and `wss://business.polygon.io` for Business tier features. When a connection opens, it immediately sends an authentication message with the provided API key.

No OAuth or additional scopes are required. A single API key grants access based on the subscription plan tier.

## Features

### Stock Market Data

Access real-time and historical data for US equities. This includes trades, quotes (NBBO), and OHLCV aggregate bars at configurable time intervals (second, minute, hour, day, week, month, quarter, year). Access real-time and historical stock market data including trades, quotes, and market information. Snapshots provide a current overview of a ticker's market status including last trade, last quote, and daily performance. Results can be adjusted for stock splits.

### Options Data

Access options market data including contracts, trades, and chain information. Query option contracts by underlying ticker, expiration date, strike price, and contract type. Snapshots include Greeks, implied volatility, and break-even price. Fair market value is only available on Business plans. It's a proprietary algorithm to generate a real-time, accurate, fair market value of a tradable security.

### Forex Data

Access foreign exchange market data including quotes and currency conversion. Retrieve historical and real-time quotes, aggregate bars, and snapshots for currency pairs.

### Crypto Data

Access cryptocurrency market data including trades, quotes, and real-time information. Includes trades, quotes, aggregate bars, and snapshots. This client enables subscription to live trades, quotes, aggregates, and specialized data streams like Level 2 order book data for cryptocurrencies.

### Indices Data

Access market indices data including snapshots and technical indicators. Retrieve aggregate bars and snapshots for market indices such as the S&P 500 and others.

### Technical Indicators

Retrieve pre-computed technical indicators for stocks and indices. Technical Indicators (SMA, EMA, RSI, MACD) are available. Configurable parameters include window size, timespan (e.g., day, hour, minute), and the price series to use (open, close, high, low).

### Reference Data

Access reference and metadata including ticker details with company information, ticker symbols, exchanges, and historical events like stock splits and dividends, amongst other things. Also includes market holidays, market status (open/closed), trade conditions, and ticker types. Financial data from SEC filings is available for stocks.

### Market News

Retrieve ticker-related news articles with sentiment analysis. Articles can be filtered by ticker, publication date, and other parameters.

### Unified Snapshots

Retrieve unified snapshots of market data for multiple asset classes including stocks, options, forex, and cryptocurrencies in a single request. This endpoint consolidates key metrics such as last trade, last quote, open, high, low, close, and volume for a comprehensive view of current market conditions. By aggregating data from various sources into one response, users can efficiently monitor, compare, and act on information spanning multiple markets and asset types.

## Events

Polygon provides real-time data streaming via WebSocket connections rather than traditional webhook-based events. Polygon.io allows one simultaneous connection to one cluster at a time (clusters: stocks, options, forex, crypto). You can have up to 4 concurrent streams connected to 4 different clusters.

### Stock Streams

Aggregates (Per Minute): Stream real-time minute aggregates. Aggregates (Per Second): Stream real-time second aggregates. Trades: Stream real-time trades. Quotes: Stream real-time quotes. Subscribe to individual tickers or all tickers across the market.

### Options Streams

Trades: Stream every executed option trade in real-time, including price, size, and exchange details. This granular feed supports tick-level analyses, order flow modeling, and ultra-responsive trading algorithms. Quotes: Access NBBO quotes as they update across all U.S. options exchanges. Monitor evolving price landscapes, identify liquidity conditions, and make rapid, informed decisions. Aggregate bars (per minute and per second) are also available. Fair Market Value (FMV) is available exclusively to Business plan users. A limit of 1,000 simultaneous option contract subscriptions per connection applies.

### Forex Streams

Stream real-time trades, quotes, and aggregate bars for currency pairs. Subscribe by individual currency pair or across the entire forex market.

### Crypto Streams

Stream real-time trades, quotes, aggregate bars, and Level 2 order book data for cryptocurrencies. Subscribe by individual pair or across all crypto pairs.

### Indices Streams

Stream real-time aggregate bar values for market indices at second and minute intervals.
