# Slates Specification for Finage

## Overview

Finage is a financial market data provider offering real-time and historical data for stocks (US and 55+ global markets), forex, cryptocurrencies, decentralized exchanges (DEX), CFD indices, ETFs, commodities, bonds, and financial fundamentals. Finage APIs provide fast, reliable access to real-time and historical data across US and global stocks, Forex, cryptocurrencies, DEX data, CFD indices, ETFs, and financial fundamentals. The platform delivers data via REST APIs and WebSocket connections.

## Authentication

Finage uses API keys for authentication. The API uses API keys for authentication. Users need to include their API key in the requests to access the data.

The API key is passed as a query parameter named `apikey` on all REST API requests:

```
https://api.finage.co.uk/last/stock/AAPL?apikey=YOUR_API_KEY
```

To request your free API key, you just need to register. Upon completion, your API key will be generated and displayed on the screen. Note it down securely, as it is your unique access token to Finage's data.

For WebSocket connections, authentication uses a separate socket key passed as a `token` query parameter in the WebSocket URL:

```
wss://{your_address_key}.finage.ws:{your_server_port}/?token=YOUR_SOCKET_KEY
```

Your assigned WebSocket URL is in your dashboard under the WebSocket section. To connect, open a WebSocket connection using your assigned URL in your dashboard. WebSocket access includes a unique subdomain and port assigned per account.

No OAuth or additional scopes are involved. The base URL for the REST API is `https://api.finage.co.uk`.

## Features

### Stock Market Data

Retrieve real-time and historical data for US and international stocks across 55+ global markets. Includes last quotes (bid/ask), last trades, previous close, OHLC aggregates, and snapshots. Finage supports over 55 global markets, including the US stock market, UK stock market, German stock market, Indian stock market, Hong Kong stock market, Canadian stock market, Japanese stock market, and many more.

- Configurable by symbol, time range, and aggregate interval (minute, hour, day, etc.).
- Coverage varies by market; international stocks may have different data availability than US stocks.

### Forex Data

Access real-time and historical foreign exchange data for 2,000+ currency pairs, including majors, minors, and exotics. Includes last quotes, currency conversion, previous close, and OHLC aggregates.

- Available 24/5.
- Supports currency conversion between any two supported currencies.

### Cryptocurrency Data

Access 7000+ crypto pairs from 100+ markets via the REST API. Retrieve last prices, tick data, OHLCV, aggregates, and more. Includes last trade, last quote, converter, previous close, snapshots, and aggregates.

- Available 24/7.
- Access 8+ years of historical crypto data with Finage's APIs, including OHLCV, aggregated data.

### DEX (Decentralized Exchange) Data

Access 24/7 real-time and historical data for decentralized exchanges (DEX), covering the latest trades, order books, and market depth for a wide array of crypto assets.

- Targeted at DeFi applications and blockchain analytics.

### CFD, ETF & Commodities Data

Real-time and historical data for a wide range of financial instruments, including CFD indices, Exchange-Traded Funds (ETFs), and commodities like metals, energy, and agricultural products.

- Quotes, OHLC data, and aggregates available.

### US Bonds Data

Access the latest real-time rates and historical data for US Bonds via Finage's RESTful APIs.

### Financial Fundamentals

Access full valuation data, including income statements, balance sheets, cash flow, market cap, company news, and key metrics for deeper insights. Also includes financial ratios, institutional and mutual fund holders, SEC RSS feeds, shares float, and sector performance.

- Finage provides up to 30 years of historical fundamentals data for public companies worldwide.
- Covers US, European, and Canadian companies.

### Financial Calendars

Financial Calendars cover everything happening in the world economy with Economic & IPO calendar, Stock Splits, Dividends, Earnings. Also includes historical stock split and historical dividends calendars.

### Market News

Finage's Market News API delivers real-time, curated updates across stocks, forex, and crypto markets. Unlike generic news aggregators, they source headlines from vetted providers, enrich them with metadata, timestamps, and ticker symbols, and allow filtering by companies, sectors, asset types, or markets.

- Filter by symbol, keyword, date, or market type.
- Includes separate crypto news endpoint.

### Market Reference Data

Look up and search for symbols across stocks, forex, and crypto. Includes market status, company details, country information, delisted companies, and crypto market cap rankings.

### Technical Indicators

Access technical indicators for stocks and forex, as well as forex trading signals.

### Market Movers

Retrieve the most active US stocks, top gainers, and top losers.

### Real-Time WebSocket Streaming

To connect, open a WebSocket connection using your assigned URL in your dashboard. Once connected, you can subscribe to tickers and receive real-time prices. Separate WebSocket servers are available for US stocks, forex, crypto, CFD indices, and CFD ETFs.

- Subscribe to one or more symbols per connection.
- Each market type has its own dedicated WebSocket server.

## Events

The provider does not support traditional webhook-based event subscriptions for notifying external systems of changes.

Finage does offer **WebSocket streaming**, which provides real-time data pushed to the client for subscribed symbols across stocks, forex, crypto, CFD indices, and CFD ETFs. After the connection, you need to create a subscription. A subscribe command will create a real-time subscription. If the symbol exists, you will get the data as JSON in real-time.

### WebSocket Price Streams

- **Description:** Receive real-time price updates (quotes and trades) for subscribed symbols as they occur.
- **Parameters:** Symbols to subscribe to (one or more per connection). Separate servers for each asset class: US stocks, forex, crypto, CFD indices, and CFD ETFs.
- Note: WebSocket access requires a separate subscription and server assignment by the Finage team; it is not self-service like the REST API.
