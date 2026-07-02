Now let me get more details on specific features like the Google Search API, Amazon Scraper API, and proxy mode:Now I have enough information to write the specification.

# Slates Specification for Scrape Do

## Overview

Scrape.do is a web scraping API and rotating proxy service that provides unblocked access to public web data. It handles anti-bot bypass, CAPTCHA solving, and proxy rotation across 110M+ IPs in 150 countries, and offers specialized plugins for structured data extraction from Amazon and Google Search.

## Authentication

Scrape.do uses **API token authentication**. A token is automatically generated when you sign up and is available on the dashboard at `dashboard.scrape.do`.

**Default API (API Mode):**
The token is passed as a query parameter named `token` on all requests to `https://api.scrape.do/`:

```
https://api.scrape.do/?token=YOUR_TOKEN&url=https://example.com
```

**Async API:**
The token is passed as an `X-Token` HTTP header on all requests to `https://q.scrape.do/`:

```
X-Token: YOUR_TOKEN
```

**Proxy Mode:**
The token is used as the username in HTTP proxy authentication (with any value as the password) when connecting through `proxy.scrape.do:8080`.

There are no OAuth flows, scopes, or additional credentials required. A single token covers all API features.

## Features

### Web Page Scraping

Scrape any public web page by providing its URL. Returns raw HTML, JSON, or any content type the target website serves. Supports both GET and POST requests to target URLs. Output can be returned in raw or markdown format.

- **Geo-targeting**: Route requests through specific countries (`geoCode`) or continents (`regionalGeoCode`) using datacenter, residential, or mobile proxies.
- **Super Proxy**: Enable residential and mobile IP pools for harder-to-scrape targets via the `super` parameter.
- **Session persistence**: Maintain the same IP across multiple requests using `sessionId`.
- **Device emulation**: Specify desktop, mobile, or tablet device types.

### Headless Browser Rendering

Render JavaScript-heavy pages using a managed headless Chromium browser by setting `render=true`.

- **Wait controls**: Configure when the page is considered loaded (`waitUntil`), add custom wait times (`customWait`), or wait for specific CSS selectors (`waitSelector`).
- **Viewport configuration**: Set custom browser width and height.
- **Resource blocking**: Optionally block CSS, images, and fonts to speed up rendering.
- **Browser interactions**: Simulate user actions like clicks, scrolls, typing, and arbitrary JavaScript execution via the `playWithBrowser` parameter.
- **Network capture**: Return all network requests as JSON (`returnJSON`), including iframe content and WebSocket requests.

### Screenshots

Capture visual screenshots of target web pages. Supports normal viewport screenshots, full-page screenshots, and partial screenshots targeting a specific CSS selector.

### Headers and Cookies Management

Full control over HTTP headers and cookies sent to the target website.

- **Custom headers**: Replace all default headers with your own.
- **Extra headers**: Add or override specific headers on top of Scrape.do's defaults.
- **Forward headers**: Pass through headers from your original request to the target.
- **Set cookies**: Send specific cookies to the target website.
- **Pure cookies**: Retrieve original `Set-Cookie` headers from the target response.

### Amazon Scraper API

A specialized plugin returning structured JSON data from Amazon across 21 international marketplaces.

- **Product pages (PDP)**: Extract product details, pricing, images, ratings, and specifications by ASIN.
- **Offer listings**: Get all seller offers with prices and shipping information.
- **Search results**: Retrieve search result listings and product rankings.
- **Raw HTML**: Fetch raw Amazon HTML with geo-targeting support.
- **ZIP code geo-targeting**: Access location-specific pricing and availability by specifying postal codes.
- **Language selection**: Request pages in marketplace-supported languages.

### Google Search API

A specialized plugin that scrapes Google SERPs and returns structured JSON with 15+ result types (organic results, ads, knowledge graphs, local packs, video results, etc.).

- **84 Google domains** supported for regional targeting.
- **Localization**: Control host language, geo location, and precise location via UULE encoding.
- **Device emulation**: Get desktop or mobile SERP layouts.
- **Filtering**: SafeSearch, time-based filters, language restrictions, and spell correction control.

### Asynchronous API

Process large-scale scraping jobs asynchronously. Submit a batch of target URLs as a job, receive a job ID, and retrieve results when ready.

- Jobs run in a separate thread pool independent from the main API concurrency.
- Supports webhook delivery of results via `WebhookURL` configuration.
- All standard scraping parameters (geo-targeting, super proxy, render, etc.) are available.

### Proxy Mode

Use Scrape.do as a standard HTTP/HTTPS proxy server (`proxy.scrape.do:8080`) compatible with any HTTP client, scraping library (Scrapy, Selenium, Puppeteer, Playwright), or tool that supports proxy configuration. Parameters are passed via the proxy username field.

### Statistics API

Access detailed usage data and account statistics programmatically through the Statistics API or the dashboard.

## Events

The provider supports **webhooks** for asynchronous result delivery in two forms:

### Callback Webhooks (Default API)

When making a standard scraping request, provide a `callback` URL parameter. Instead of waiting for the response synchronously, Scrape.do will send the scraping result to the specified callback URL when it completes.

### Async Job Webhooks

When creating asynchronous jobs via the Async API, configure a `WebhookURL` in the job payload. Scrape.do will POST the job results to this URL upon completion, eliminating the need to poll for status.
