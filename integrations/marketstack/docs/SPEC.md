# Slates Specification for Marketstack

## Overview

Marketstack is a REST API providing real-time, intraday, and historical stock market data. It covers 30,000+ stock tickers from 50+ countries across 70+ stock exchanges, along with commodity prices, government bonds, ETF holdings, market indices, and SEC EDGAR filings data.

## Authentication

Marketstack uses **API key authentication**. Every request must include an `access_key` query parameter with your API key.

- **Obtaining a key:** Sign up at marketstack.com and retrieve your API access key from the account dashboard.
- **Usage:** Append `access_key=YOUR_ACCESS_KEY` as a query parameter on every API request.
- **Example:** `https://api.marketstack.com/v2/eod?access_key=YOUR_ACCESS_KEY&symbols=AAPL`
- **HTTPS:** Available on the free plan and all paid plans. Always use the `https://` protocol.
- **Key rotation:** If compromised, the access key can be reset from the account dashboard.

No OAuth, tokens, or additional credentials are required. There are no scopes or tenant-specific inputs.

## Features

### End-of-Day Stock Data

Retrieve daily closing prices (open, high, low, close, volume) for stocks, including adjusted prices that account for splits and dividends. Supports 500,000+ tickers from major exchanges (NASDAQ, NYSE, etc.). Data can be filtered by symbol(s), exchange, and date range. Up to 15 years of historical data is available.

### Intraday Stock Data

Access intraday price data for US stock tickers on the IEX exchange with intervals from 1 minute to 24 hours. Includes derived real-time reference prices calculated by Marketstack. After-hours trading data can optionally be included. Available on Basic plan and higher; sub-15-minute intervals require Professional plan.

### Real-Time Stock Prices

Get live stock prices across major global exchanges (NYSE, NASDAQ, LON, WSE, NSE, and more). Returns the last known price, currency, and timestamp per exchange for a given ticker. Available on Professional plan and higher.

### Commodity Prices

Retrieve current and historical prices for 70+ commodities across energy, metals, industrial, agricultural, and livestock categories. Historical data supports daily or monthly frequency and goes back up to 15 years. Available on Professional plan and higher.

### Stock Splits & Dividends

Look up historical stock split factors and dividend payment information for tickers. Includes payment dates, record dates, declaration dates, and distribution frequency for dividends.

### Company Analyst Ratings

Access current and historical analyst buy/sell/hold ratings for stocks, including consensus data, price targets, and individual analyst recommendations with 15+ years of history. Available on Business plan and higher.

### Ticker & Company Information

Look up detailed company information for a ticker, including sector, industry, key executives, incorporation details, contact information, SIC codes, and the exchanges on which it trades. Search and list all supported tickers with filtering by name, symbol, or exchange.

### Stock Market Indices

List and retrieve data for 86+ global stock market indices/benchmarks, including current price, daily/weekly/monthly/yearly percentage changes. Available on Basic plan and higher.

### Government Bonds

Access 10-year government bond yield data for 53+ countries, including yield, daily price change, and weekly/monthly/yearly percentage changes. Available on Basic plan and higher.

### ETF Holdings

Retrieve complete ETF holdings data by ticker, including fund metadata, individual security holdings with balances, values, asset categories, and ISINs. Supports date range filtering. Available on Basic plan and higher.

### SEC EDGAR Filings

Access SEC EDGAR data including:

- **CIK lookup:** Find CIK codes by company name or find company details by CIK code.
- **Company submissions:** Retrieve full submission/filing history for a company (8-K, 10-K, 10-Q, Form 4, etc.), filterable by filing date, report date, or accession number.
- **Company facts & concepts:** Get XBRL financial data (e.g., US-GAAP accounts payable) across all filings for a company.
- **Frames:** Aggregate XBRL facts across all reporting entities for a given calendar period and concept.

Available on Business plan only.

### Reference Data

Look up metadata for 2,700+ stock exchanges (name, MIC, country, status), supported currencies, and timezones.

## Events

The provider does not support events. Marketstack is a data query API and does not offer webhooks, event subscriptions, or any push-based notification mechanism.
