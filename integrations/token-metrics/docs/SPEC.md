# Slates Specification for Token Metrics

## Overview

Token Metrics is an AI-powered cryptocurrency analytics platform that provides market data, proprietary trading and investment grades, trading signals, sentiment analysis, and AI-generated research reports for thousands of digital assets. It is a RESTful service that delivers real-time and historical crypto data, AI-generated Trader & Investor Grades, market sentiment, smart indices, deep-dive AI reports, and more.

## Authentication

The Token Metrics API uses API key authentication via headers.

To authenticate:

1. Create a free account at app.tokenmetrics.com → API, click Generate Key, and keep the key private.
2. Include the API key in the `x-api-key` HTTP header with every request.

Example request header:

```
x-api-key: YOUR_API_KEY
```

The base URL for all API requests is `https://api.tokenmetrics.com/v2/`.

If the API key is inactive or your current plan does not have access to the requested endpoint, you will receive a 403 Forbidden error. Access to certain endpoints depends on the subscription tier (Basic, Advanced, Premium, VIP).

## Features

### Token Discovery & Market Data

Get the list of coins and their associated TOKEN_ID supported by Token Metrics, along with key market data such as contract address, current price, market cap, trading volume, supply metrics, and 24-hour price change. Tokens can be looked up by ID, symbol, or name.

### Price Data (OHLCV)

Retrieve historical OHLCV (Open, High, Low, Close, Volume) data for tokens on both daily and hourly granularity. Can be filtered by token ID, date range, and symbol. Token Metrics pricing data starts on 2019-01-01 for most tokens.

### AI-Powered Grading

- **Trader Grades:** The Trader Grade empowers traders to make informed buy and sell decisions by calculating grades for a specific crypto asset using a combination of Technical Analysis, Quantitative-Driven Performance Metrics, and On-chain Metrics. This is a short-term oriented grade.
- **Investor Grades:** The Investor Grade provides long-term assessments of cryptocurrency assets using Token Metrics' proprietary research methodology, which considers an asset's Technology, Fundamentals, and Valuation Grades.
- **Fundamental Grades:** Includes grade class, community score, exchange score, VC score, tokenomics score, and DeFi scanner score.

### Trading Signals

AI-generated trading signals for long and short positions for all tokens. Filterable by date range, token ID, symbol, category, exchange, market cap, volume, FDV, and signal type. Available on both daily and hourly intervals. The Market Indicator provides "Bullish" and "Bearish" signals on the entire crypto market based on market conditions and trend analysis.

### AI Indices (Model Portfolios)

The Indices feature provides access to Token Metrics' AI-based model portfolios, allowing you to follow the trades made by their AI across a range of indices, with detailed information on each portfolio's rebalancing dates, exchange, risk options, and token weights. You can also retrieve historical performance data and current holdings/weights for indices.

### Sentiment Analysis

The Sentiment feature collects data from 3 social platforms—Twitter, Reddit, and Telegram—and analyzes the discussions surrounding a particular crypto asset to determine the sentiment or attitude expressed towards it. Hourly sentiment scores are available along with news summaries.

### Technical Analysis

Support and resistance levels, correlation analysis are available. The resistance and support feature returns historical price levels for a given token. Correlation data shows the top 10 and bottom 10 correlations of tokens with the top 100 market cap tokens.

### Quantitative Metrics

Get the latest quantitative metrics for tokens. Advanced quantitative analysis and grading systems for deeper analytical use cases.

### Scenario Analysis & Price Predictions

Get price predictions based on different crypto market scenarios. Provides forecasting and scenario-based analysis for tokens.

### AI Reports

AI-generated reports providing comprehensive analyses of cryptocurrency tokens, including deep dives, investment analyses, and code reviews.

### Crypto Investors

Get the latest list of crypto investors and their scores. Provides information about notable crypto investors and their activity.

### Conversational AI Agent

Ask questions in plain English and receive token facts or instant dashboards on demand. An AI chatbot endpoint for market insights.

### Top Tokens by Market Cap

Retrieve a ranked list of top tokens by market capitalization for quick market overview.

## Events

The provider does not support events. Token Metrics is a data-retrieval API without webhooks or event subscription mechanisms.
