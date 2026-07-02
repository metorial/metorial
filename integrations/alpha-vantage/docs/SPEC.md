# Slates Specification for Alpha Vantage

## Overview

Alpha Vantage is a financial data API provider that delivers stock prices, fundamental data, technical indicators, forex, crypto, commodities, and economic indicators through a simple REST API. Backed by Y Combinator and officially licensed by NASDAQ as a US market data provider, it provides data in JSON and CSV formats. The platform covers 20+ global exchanges including NYSE, NASDAQ, London Stock Exchange, and major markets in Europe and Asia.

## Authentication

Alpha Vantage uses **API key** authentication. It requires a free API key, that can be requested from http://www.alphavantage.co/support/#api-key.

To authenticate, include the API key as a query parameter named `apikey` in every request. All requests go through a single base endpoint:

```
https://www.alphavantage.co/query?function=FUNCTION_NAME&symbol=SYMBOL&apikey=YOUR_API_KEY
```

There are no OAuth flows, scopes, or additional credentials. The API key is the sole authentication mechanism.

The majority of API endpoints can be accessed for free. For use cases that exceed the standard API usage limit (25 API requests per day) or require certain premium API functions, a premium plan is available.

## Features

### Core Time Series Stock Data

This suite of APIs provides global equity data in 4 different temporal resolutions: (1) daily, (2) weekly, (3) monthly, and (4) intraday, with 20+ years of historical depth. Data includes open, high, low, close, and volume (OHLCV) values. Both raw (as-traded) and split/dividend-adjusted data are available.

- **Parameters:** Stock symbol, interval (1/5/15/30/60 min for intraday), output size (compact or full).
- Realtime and 15-minute delayed US market data is regulated by the stock exchanges, FINRA, and the SEC and requires a premium subscription.

### Ticker Quote and Search

A lightweight ticker quote endpoint and several utility functions such as ticker search and market open/closure status are also included.

- Retrieve the latest price and trading information for a single symbol.
- Search for ticker symbols by keyword.

### US Options Data

Retrieve current and historical options chain data for US-listed equities.

- **Parameters:** Underlying symbol, optional expiration date.

### Fundamental Data

Company overviews, income statements, balance sheets, cash flow statements, earnings reports (actual vs estimates), dividend history, and stock splits.

- Data is available in both annual and quarterly granularity.
- Covers publicly listed US equities.

### Alpha Intelligence (AI-Powered Insights)

This API returns live and historical market news & sentiment data from a large & growing selection of premier news outlets around the world, covering stocks, cryptocurrencies, forex and more. Also includes insider transactions, and earnings call transcripts.

- **Parameters:** Filter by ticker symbols, news topics, and time ranges.
- Sentiment scores are provided per article and per mentioned ticker.

### Foreign Exchange (Forex)

Retrieve real-time and historical exchange rates for physical currency pairs.

- **Parameters:** From/to currency codes, interval for intraday data.
- Supports daily, weekly, and monthly historical data.

### Cryptocurrency

Access real-time and historical price data for digital currencies (e.g., Bitcoin, Ethereum).

- **Parameters:** Cryptocurrency symbol, market (e.g., USD, EUR).
- Supports daily, weekly, and monthly time series.

### Commodities

Retrieve price data for key commodities such as crude oil, natural gas, copper, wheat, corn, cotton, sugar, and coffee.

- Data is typically available at daily or monthly intervals.

### Economic Indicators

GDP, CPI, inflation, and treasury yields along with other macroeconomic data such as federal funds rate, unemployment rate, and consumer sentiment.

- Primarily covers US economic data.

### Technical Indicators

Alpha Vantage provides 50+ pre-computed technical indicators, from basic moving averages (SMA, EMA) to advanced oscillators (RSI, MACD, Stochastic, Bollinger Bands, and dozens more).

- **Parameters:** Symbol, interval, time period, series type (close, open, high, low).
- Designed to support equities, cryptocurrencies, and forex.

## Events

The provider does not support events. Alpha Vantage is a data-retrieval API only and does not offer webhooks, event subscriptions, or any built-in push/polling notification mechanism.
