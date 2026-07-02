Now let me check the YouTube and Walmart API details briefly:Now I have enough information to write the specification.

# Slates Specification for Scrapingbee

## Overview

ScrapingBee is a web scraping API that handles headless browsers, proxy rotation, CAPTCHA solving, and AI-powered data extraction. The API handles headless browsers, rotates proxies, and offers AI-powered data extraction. It provides dedicated APIs for scraping general web pages, as well as specialized APIs for Google (search, news, maps, images, lens, shopping, AI mode), Amazon (product search and product lookup), YouTube (search, trainability, metadata, and transcripts), and Walmart.

## Authentication

All requests are authenticated using a private API key. To get access to an API key, create an account at ScrapingBee and confirm your email address.

The API key is passed as a query string parameter named `api_key` on every request. For example:

```
https://app.scrapingbee.com/api/v1?api_key=YOUR-API-KEY&url=YOUR-URL
```

There are no OAuth flows, scopes, or additional credentials. The single API endpoint is `https://app.scrapingbee.com/api/v1/` and the API key is included as the `api_key` parameter. Specialized APIs use sub-paths (e.g., `/api/v1/store/google`, `/api/v1/amazon/search`, `/api/v1/walmart/search`, `/api/v1/youtube/search`).

## Features

### General Web Scraping (HTML API)

Scrape any web page and retrieve its HTML content. With JavaScript rendering, a simple parameter enables you to scrape any web page, even single-page applications using React, AngularJS, Vue.js, or any other libraries.

- **JavaScript rendering**: Enable or disable rendering via the `render_js` parameter.
- **Proxy options**: Use rotating proxies by default, or enable premium proxies with `premium_proxy=true` for difficult-to-scrape websites. You can specify a geolocation for the proxy using the `country_code` parameter.
- **Custom headers and cookies**: Send custom headers and cookies with scraping requests.
- **Ad and resource blocking**: Block ads (`block_ads`) and images/CSS (`block_resources`) to speed up scraping.
- **Device emulation**: Control whether the request appears to come from a desktop or mobile device via the `device` parameter.
- **Own proxy support**: Use ScrapingBee's infrastructure with your own proxy via the `own_proxy` parameter.
- Scraping under login credentials is strictly prohibited and may result in account suspension.

### Data Extraction

Extract data from pages without parsing HTML on your side by adding extraction rules to API calls.

- **CSS/XPath extraction rules**: Define rules using CSS selectors or XPath to extract specific text, attributes, HTML, or lists of elements, returned as structured JSON.
- **Output formats**: Extract text, HTML, markdown, or attribute values from matched elements.
- **Table extraction**: Automatically extract tables as arrays or JSON objects.

### AI-Powered Data Extraction

Extract the right content by just expressing what you need in plain English without using CSS selectors.

- **`ai_query`**: Provide a plain-English question to extract specific information from a page.
- **`ai_extract_rules`**: Define key-value pairs describing what data to extract using natural language descriptions.
- **`ai_selector`**: Optionally focus AI extraction on a specific part of the page using a CSS selector.

### JavaScript Scenarios

Click, scroll, wait for elements to appear, or run custom JavaScript code on the target page.

- **Instructions**: Define a sequence of actions such as `click`, `scroll_x`, `scroll_y`, `wait`, `wait_for`, and `evaluate` (for custom JS).
- Useful for interacting with dynamic pages that require user interaction before data is available.

### Screenshots

Capture screenshots of websites instead of HTML. Full-page and partial screenshots are supported.

- **`screenshot`**: Enable screenshot capture.
- **`screenshot_full_page`**: Capture the entire page height.
- **`window_width`**: Specify viewport width for responsive screenshots.

### Google Search API

Get structured JSON for search, news, maps, ads, and more in a single API call.

- Supports Google search, news, maps, images, lens, shopping, and AI mode.
- Add any extra Google parameters to customize your search (e.g., `gl`, `hl`, `num`, `start`, etc.).
- Light request mode available for faster, cheaper results without JS rendering.

### Amazon API

Supports Amazon product search and specific product lookup.

- **Search**: Search Amazon products by query with options for sorting, domain, language, country, device, and price filters.
- **Product**: Look up specific products by ASIN with variant selection support.
- Light request mode available to reduce cost when JS rendering is not needed.

### Walmart API

Scrape Walmart search results and product details with structured JSON output.

- **Search**: Search Walmart products with options for sorting, price filters, fulfillment type/speed, and domain.
- **Product**: Look up specific products by product ID with delivery ZIP and store ID options.

### YouTube API

The YouTube API allows you to scrape YouTube search results, video metadata, transcripts, and trainability information in real time.

- **Search**: Search YouTube videos with filters for upload date.
- **Metadata**: Retrieve video metadata for specific videos.
- **Transcripts**: Extract video transcripts/subtitles.
- **Trainability**: Check trainability information for videos.

### ChatGPT API

Collect structured responses from a ChatGPT scraper by sending a prompt with valid API credentials. Enable live search, inject HTML context, and automate intelligent scraper workflows.

### Usage API

Check account usage and remaining API credits programmatically.

## Events

The provider does not support events. ScrapingBee does not support webhooks for event notifications. It is a request-response API where each call returns data synchronously.
