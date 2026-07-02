# Slates Specification for Twelve Data

## Overview

Twelve Data is a financial market data provider offering real-time and historical data for stocks, forex, cryptocurrencies, ETFs, indices, mutual funds, and commodities. It provides access to financial markets across over 50 global countries, covering more than 1 million public instruments. Beyond price data, it also provides fundamentals (corporate actions, financials, logos), analysis (revenue estimates, price targets), and ETF/mutual fund details (holdings, profiles, risk assessments).

## Authentication

Twelve Data uses **API key** authentication. To get started, you need to sign up for an API key, and then use it to make requests.

The API key can be provided in one of two ways:

1. **Query parameter**: Append `apikey=your_api_key` to the request URL.
   - Example: `GET https://api.twelvedata.com/price?symbol=AAPL&apikey=your_api_key`

2. **Authorization header**: Include the key in the `Authorization` header.
   - Example: `Authorization: apikey your_api_key`

The same API key is used to authenticate both REST API and WebSocket requests. The WebSocket connection URL also takes the API key as a query parameter: `wss://ws.twelvedata.com/v1/quotes/price?apikey=your_api_key`.

The base URL for the REST API is `https://api.twelvedata.com/`.

No OAuth or other authentication methods are supported. There are no scopes or additional credentials required beyond the API key.

## Features

### Market Price Data

Retrieve historical OHLCV (Open, High, Low, Close, Volume) time series data for any supported financial instrument. Supports multiple intervals (1min, 5min, 15min, 30min, 45min, 1h, 2h, 4h, 8h, 1day, 1week, 1month). Also includes real-time price quotes, end-of-day prices, and exchange rates.

- Configurable parameters: symbol, interval, output size, timezone, date range, exchange.
- Pre/post market data available for US equities from 1min to 30min intervals.

### Currency Exchange & Conversion

Retrieve real-time exchange rates for forex and cryptocurrency pairs, and perform currency conversion with a specified amount.

### Fundamental Data

Access current financial performance along with historical data from the 1980s–90s, sourced from Income Statements, Balance Sheets, Cash Flow Statements, Operating Metrics, and more. Includes company profiles, dividends, stock splits, earnings calendars, and logos.

- Analysis data includes revenue estimates, price targets, and analyst expectations.

### ETF & Mutual Fund Data

Detailed holdings, profiles, and risk assessments for ETFs and mutual funds.

### Technical Indicators

Over 100+ technical indicators are available, including MACD, Bollinger Bands, RSI, EMA, SMA, Stochastic, and many more. Indicators can be applied to any time series data.

- Configurable parameters per indicator (e.g., time period, series type, moving average type).

### Reference Data

Search and look up symbols across all supported exchanges and asset types. Retrieve lists of available exchanges, instrument types, and supported symbols. Supported instrument types include Common Stock, ETF, Bond, Mutual Fund, Index, Digital Currency, Physical Currency, Precious Metal, and many others.

### Real-Time Data Streaming (WebSocket)

Price events return real-time tick prices for subscribed symbols, including brief meta information, UNIX timestamp, and the price itself, with daily volume where available.

- You may simultaneously subscribe to different markets, exchanges, or asset types.
- Full access to the WebSocket server is available only with the Pro plan.

## Events

Twelve Data does not support traditional webhooks or server-to-client event push notifications. However, it provides a **WebSocket-based real-time streaming** mechanism.

### Real-Time Price Stream

Real-time low-latency stream of financial quotes. You can subscribe to stocks, forex, and crypto. After connecting via WebSocket at `wss://ws.twelvedata.com/v1/quotes/price`, you send subscribe/unsubscribe actions specifying symbol tickers.

- There are two general return event types: subscribe-status and price.
- **subscribe-status**: Confirms which symbols were successfully subscribed or failed.
- **price**: Delivers real-time tick-by-tick price updates for subscribed symbols, including timestamp, price, symbol, currency, and volume (where available).
- Configurable parameters: list of symbols to subscribe to (comma-separated). Supports subscribe, unsubscribe, reset, and heartbeat actions.
