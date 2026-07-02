Now I have enough information to write the specification.

# Slates Specification for Nasdaq

## Overview

Nasdaq Data Link (formerly Quandl) is a financial data platform that provides access to a large catalog of free and premium datasets covering equities, options, futures, economics, FX, and alternative data. Data is delivered through three API channels: a Streaming API for real-time market data, a REST API for real-time/delayed quotes, and a Tables REST API for historical and reference datasets.

## Authentication

Nasdaq Data Link uses two different authentication methods depending on which API is being accessed:

### 1. API Key (Tables API)

To use the Tables API, you must have an API key for Nasdaq Data Link. To get an API key, sign up for a free Nasdaq Data Link account. You can then find your API key on your account settings page.

Include your API key in every request using the `api_key` query parameter.

Example: `https://data.nasdaq.com/api/v3/datatables/ZACKS/FC?ticker=AAPL&api_key=YOUR_API_KEY`

### 2. OAuth 2.0 (Streaming API and Real-Time/Delayed REST API)

Access to the API is granted by providing your `client_id` and `client_secret` using OAuth 2.0 authentication.

For the **Streaming API**, credentials are provided by the Nasdaq sales team upon subscription and include: `client_id`, `client_secret`, `token_endpoint`, and `bootstrap_servers` (for Kafka-based streaming).

For the **Real-Time/Delayed REST API**, credentials include: `client_id`, `client_secret`, and `base_URL`. These are also provisioned by the Nasdaq sales team upon subscription.

Both OAuth-based APIs require you to exchange your `client_id` and `client_secret` for an access token, which is then used to authenticate subsequent requests.

## Features

### Tables Data (Historical and Reference Data)

Nasdaq Data Link provides data in two primary formats: Time-Series and Tables (formerly called "Datatables"). The Tables API gives access to a broad catalog of datasets including:

- **Equity Prices**: End-of-day US stock prices, Chinese stock prices, and other equity pricing data.
- **Equity Fundamentals**: Company financial statements, balance sheets, and fundamental metrics from providers like Sharadar, Zacks, and Mergent.
- **Earnings, Estimates, and Analyst Ratings**: Earnings announcements, earnings estimates, and analyst target prices.
- **Options and Futures**: Options implied volatility, options settlement prices, futures options data, and CFTC Commitment of Traders data.
- **Economics, FX, and Rates**: Foreign exchange rates, FX volumes, and macroeconomic data.

Data can be filtered by date range, column selection, and row-level criteria. Files are available in CSV, JSON, and XML formats. Most datasets are premium and can only be accessed with a subscription. Subscriptions are à la carte: you can subscribe to the individual premium datasets you need and nothing more.

### Real-Time and Delayed Market Data (REST API)

The latest transaction that is last sale eligible based on market rules. Last Sale provides real-time or delayed pricing information on different stock exchanges for one or multiple securities.

Available products include:

- **Nasdaq Basic / Last Sale+**: Best bid/offer and last sale data for US exchange-listed stocks.
- **BX/PSX BBO and Last Sale**: Quote and trade data from Nasdaq's BX and PSX exchanges.
- **Global Index Data Service**: Real-time index values.
- **Nasdaq Smart Options**: Options trade and volume data.

The Bars endpoint provides the ability to create real-time, delayed and historical charts for all US-listed and OTCBB securities, with 10+ years of history and OHLCV data based on different date ranges and intervals.

### Real-Time Streaming Data

The Streaming API (Kafka-based) provides continuous real-time feeds for:

- Nasdaq Basic and Last Sale+
- Nasdaq TotalView (full order book depth)
- Consolidated Quotes and Trades
- BX/PSX BBO and Last Sale
- Nasdaq Canada Basic
- Global Index Data Service
- Nasdaq Smart Options
- Benzinga Market Newswires

### Data Search and Metadata

The API can also be used to search and provide metadata or to programmatically retrieve data. You can browse available datasets, retrieve dataset metadata (descriptions, column definitions, update frequencies), and discover new data products.

### Bulk Downloads

Large datasets can be exported as bulk zip downloads for offline analysis, available for both Tables and Time-Series data products.

## Events

The provider does not support webhooks or event subscriptions. The Streaming API provides real-time market data via a Kafka-based stream, but this is a continuous data feed rather than an event/webhook subscription mechanism.
