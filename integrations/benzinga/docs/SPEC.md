Let me get more details on the webhook and specific API features.Now let me check the webhook documentation more closely.# Slates Specification for Benzinga

## Overview

Benzinga is a financial data and media company that provides REST APIs for accessing financial news, market data, company fundamentals, and alternative datasets. The platform offers documentation for news, market, and company data APIs, serving brokerages, fintech companies, hedge funds, and research platforms.

## Authentication

Authentication is via API Key set as a URL query parameter `token`.

- **Method:** API Key (query parameter)
- **Parameter name:** `token`
- **How to obtain:** Sign up through the Benzinga developer portal to receive your API key. Alternatively, contact `licensing@benzinga.com`.
- **Usage example:** `https://api.benzinga.com/api/v2/calendar/ratings?token=YOUR_API_KEY`

There are no OAuth flows, scopes, or additional credentials required. The same API key is used across all API endpoints.

## Features

### News & Content

Access Benzinga's editorial and newswire content including full-length articles, real-time headlines, and press releases. Coverage includes the Wilshire 5000, the TSX, and 1000 other popular tickers. Content can be filtered by ticker, channel, content type, and date. A "Why Is It Moving" (WIIMs) dataset provides short explanations for why a stock is moving on any given day. Bull vs. Bear summaries distill analyst reports into bullish and bearish arguments for a stock. Analyst Insights provide qualitative summaries of analyst research reports.

### Financial Calendars

Calendar data covers conference calls, dividends, earnings, economics, FDA events, guidance, IPOs, offerings, analyst ratings, mergers & acquisitions, and stock splits. Data can be filtered by ticker, exchange, date range, and importance level. Fields are customizable by date, country, and event type. A delta mechanism via the `parameters[updated]` parameter allows efficient retrieval of only recently changed records.

### Company Fundamentals

Retrieve company profile data, financial statements, earning reports, valuation ratios, and key statistics. Data includes company profile, share class, earning reports, financial statements, operating earnings, valuation ratios, and alpha/beta metrics. Ticker detail provides peer comparisons and percentile rankings.

### Market Movers

Identify top gaining, losing, and most active securities across exchanges.

### Signals (Unusual Options Activity)

This API returns structured data for various signals such as unusual options activity. Data includes option type, strike price, expiration, volume, and sentiment. Filterable by ticker and date.

### Delayed Quotes & Historical Bars

Access delayed stock quotes and historical price bar data (OHLCV) for securities.

### Corporate Logos

The Benzinga Corporate Logo API is designed to be flexible with client sizing requirements. Returns logo images in light/dark variants, vector formats, and associated brand colors for publicly traded companies. Supports search by ticker or bulk sync.

### Government & Insider Trades

Access data on trades made by government officials and corporate insiders, including transaction details and filing information.

### SEC Filings

Retrieve SEC filing data for publicly traded companies.

### Short Interest

Access short interest data for securities.

### Squawk (Streaming Audio)

Squawk is a realtime broadcast which includes important headlines, price movement and rumors as stories develop. Available via dedicated streaming client libraries.

## Events

Benzinga supports webhooks for real-time event delivery.

### News Events (Webhook v1)

Webhooks offer the same realtime delivery, but the connection is not maintained between deliveries. News webhook payloads include article content such as title, body, authors, tags, associated securities, and channels.

- **Actions:** Created (new articles published).
- **Configuration:** Must accept POST requests on URL provided to Benzinga. The webhook endpoint URL is configured by Benzinga staff on your behalf. Content selections (which types of news to receive) are also managed by Benzinga.
- **Delivery details:** Payloads are sent as HTTP POST requests with a `X-BZ-Delivery` header for tracking. Re-delivery attempts will happen using exponential backoff starting from 500 ms for up to 5 minutes.
- **Testing:** A dedicated webhook test trigger endpoint is available to send sample payloads to your endpoint for verification.

### WebSocket Streaming

Benzinga also offers a WebSocket-based data streaming connection for newsfeed data, providing an always-on real-time connection as an alternative to webhooks. The Websocket offers an always-on connection that provides data real-time as soon as it becomes available in our system.
