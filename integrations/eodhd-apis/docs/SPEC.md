Now let me get the full documentation page to see all API categories:Now I have comprehensive information to write the specification.

# Slates Specification for EODHD APIs

## Overview

EODHD (End of Day Historical Data) is a financial data provider offering 30+ years of historical end-of-day prices, real-time market data, intraday data, and fundamental data for stocks, ETFs, mutual funds, indices, bonds, forex pairs, and cryptocurrencies across 70+ global exchanges. The API covers a wide range of financial data including Historical End-of-Day (EOD) prices, Real-time prices, Intraday data, and Fundamental data for stocks, ETFs, funds, indices, bonds, forex pairs, and alternative currencies. They offer over 50 API endpoints.

## Authentication

EODHD uses **API key (token) authentication**. There is no OAuth2 or other authentication method.

- An API key looks like `15d35814de0491.03453438` (each key is unique) and is generated automatically after registration. It can be found in the user dashboard or in the email sent after signing up.
- All API requests include this token as a query parameter (`api_token`). This is how the server determines which data is available to the user based on their plan and API call quota.
- The token is passed as a URL query parameter on every request: `https://eodhd.com/api/{endpoint}?api_token={YOUR_API_TOKEN}&fmt=json`
- For WebSocket connections, the token is included in the connection URL: `wss://ws.eodhistoricaldata.com/ws/us?api_token=YOUR_API_KEY`
- A `demo` API key is available for testing with a limited set of tickers (AAPL.US, TSLA.US, VTI.US, AMZN.US, BTC-USD.CC, and EURUSD.FOREX).
- The API key should not be shared publicly. It can be regenerated from the user dashboard.

## Features

### Historical End-of-Day Market Data

Retrieve daily OHLCV (Open, High, Low, Close, Volume) price data for stocks, ETFs, mutual funds, forex, and cryptocurrencies. Data is available for more than 150,000 tickers worldwide, covering all US stocks, ETFs, and Mutual Funds from their inception.

- Configurable date ranges via `from` and `to` parameters in `YYYY-MM-DD` format.
- Supports daily, weekly, and monthly periods.
- Bulk download available for entire exchanges in a single request.

### Intraday Historical Data

Access intraday price data at various intervals for stocks and other instruments.

- Configurable intervals (1-minute, 5-minute, and 1-hour).
- Available for approximately the past year of data.

### Real-Time Streaming Data via WebSockets

Real-time finance data for the US market, 1100+ Forex pairs, and 1000+ Digital Currencies with a delay of less than 50ms via WebSockets.

- Separate WebSocket endpoints for US stock trades, US stock quotes, forex, and crypto.
- For US stocks, supports pre-market and post-market hours (4 am to 8 pm EST).
- Subscriptions provide real-time access to 50 tickers simultaneously by default, expandable via dashboard.
- Subscribe/unsubscribe to tickers dynamically via JSON commands.

### Live (Delayed) Stock Prices

Retrieve current OHLCV prices for US and global stocks, currencies, and other instruments. For global markets and all exchanges, live data is available with a 15-minute delay.

- Extended quotes for US stocks include bid/ask, day range, 52-week range, and more.
- Bulk live prices available for entire US exchanges in a single request.

### Tick Data

High-granularity tick-level trade data for US stocks, providing individual trade records.

### Fundamental Data

Comprehensive fundamental data for stocks, ETFs, mutual funds, indices, and cryptocurrencies. Covers not only US markets but also 60+ exchanges worldwide.

- Includes financial statements (income statement, balance sheet, cash flow), company profiles, valuation metrics, and more.
- For ETFs: asset allocation, sector weights, top holdings, valuation and growth rates.
- For mutual funds: expense ratios, holdings turnover, net assets.
- Crypto fundamentals include supply metrics, market capitalization, all-time levels, technical resources, and project metadata.
- Bulk fundamentals download available for entire exchanges.

### Corporate Actions: Splits and Dividends

Retrieve historical and upcoming stock splits and dividend data for any supported ticker. Bulk download available per exchange.

### Financial Calendar

A financial calendar providing upcoming data on earnings, IPOs, and splits.

- IPO data spans from January 2015 to two to three weeks ahead. Split data ranges from January 2015 to several months ahead. Earnings data extends several months ahead.
- Filterable by specific ticker symbols and date ranges.

### Financial News and Sentiment

Access aggregated financial news articles and AI-generated sentiment analysis. The system analyzes news every minute, producing daily sentiment scores for stocks, ETFs, Forex, and Cryptocurrencies based on positive and negative mentions.

- Filterable by ticker, date range, and topic tags.

### Insider Transactions

Insider trading data based on SEC Form 4 filings for all US companies, offering insights into insider buy/sell activity.

### Stock Market Screener

Screen and filter stocks based on various financial criteria such as market cap, sector, earnings, and technical indicators.

### Technical Analysis Indicators

Compute common technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands, etc.) directly from the API without needing to calculate them locally.

- Configurable periods and parameters per indicator.

### Exchange and Instrument Metadata

Access information about supported exchanges, tickers, trading hours, stock market holidays, and symbol change history.

- ID Mapping API supports CUSIP, ISIN, FIGI, LEI, and CIK to symbol mapping.
- Search API to look up stocks, ETFs, mutual funds, and indices by name or code.

### Macroeconomic Data

Retrieve macroeconomic indicators (GDP, inflation, unemployment, etc.) and country-level macro data. Economic events calendar for tracking global economic releases.

### US Stock Options

End-of-day options chain data with Greeks for US stocks, including strike prices, expiration dates, and implied volatility.

### ESG Data

Environmental, Social, and Governance scores and metrics for supported companies.

### Historical Market Capitalization

Historical market cap data for US stocks traded on NYSE/NASDAQ, available from 2019 onward.

### Stock Market Logos

Access logo images for over 40,000 publicly traded companies.

### Index Constituents

Historical and current constituent data for S&P and Dow Jones indices, including historical changes to index membership over time.

### US Treasury Interest Rates

US Treasury yield curve rates data (beta feature).

### CBOE Europe Indices

CBOE Europe index data including full constituent details (beta feature).

### User Account Information

Query account details including API usage, daily rate limits, remaining calls, and plan information.

## Events

EODHD supports real-time data streaming via **WebSockets**, which functions as an event-driven mechanism for receiving market data updates.

### US Stock Trade Events

Real-time trade data streamed for US stocks (NASDAQ, NYSE). Each event includes ticker symbol, last trade price, trade size, trade condition code, dark pool flag, and market status.

- Connect to: `wss://ws.eodhistoricaldata.com/ws/us?api_token=YOUR_API_KEY`
- Subscribe to specific ticker symbols dynamically.

### US Stock Quote Events

Real-time bid/ask quote updates for US stocks.

- Connect to: `wss://ws.eodhistoricaldata.com/ws/us-quote?api_token=YOUR_API_KEY`
- Subscribe to specific ticker symbols dynamically.

### Forex Price Events

Real-time bid/ask price updates for 1,100+ forex currency pairs with day change data.

- Connect to: `wss://ws.eodhistoricaldata.com/ws/forex?api_token=YOUR_API_KEY`
- Subscribe to specific currency pairs (e.g., EURUSD).

### Cryptocurrency Price Events

Real-time price updates for 1,000+ digital currency pairs including last price, quantity, and day change.

- Connect to: `wss://ws.eodhistoricaldata.com/ws/crypto?api_token=YOUR_API_KEY`
- Subscribe to specific crypto pairs (e.g., BTC-USD, ETH-USD).
