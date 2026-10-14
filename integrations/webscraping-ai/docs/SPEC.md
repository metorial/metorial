# WebScraping.AI Integration Specification

## Overview

WebScraping.AI is a web scraping API that fetches and extracts data from any website, handling proxies, headless browser rendering, CAPTCHAs, and retries automatically. It provides raw HTML/text retrieval as well as AI-powered data extraction, returning clean HTML, plain text, or structured JSON. The API base URL is `https://api.webscraping.ai`.

## Authentication

WebScraping.AI uses **API key authentication**. All requests require an `api_key` query parameter.

- **Obtaining an API key:** Sign up at [webscraping.ai](https://webscraping.ai/auth/sign_up) to receive an API key. A free trial provides 2,000 API credits.
- **Usage:** Pass the API key as a query parameter on every request:
  ```
  GET https://api.webscraping.ai/html?url=https://example.com&api_key=YOUR_API_KEY
  ```
- **Proxy mode authentication:** When using WebScraping.AI as a proxy server (`proxy.webscraping.ai:8888`), the API key is passed as the proxy username, and optional parameters (e.g., `js=true&proxy=residential`) are passed as the proxy password.

No OAuth, tokens, or additional credentials are required.

## Features

### AI-Powered Question Answering

Ask natural language questions about any webpage and receive AI-generated answers as plain text. Requires a target URL and a question string. Useful for extracting specific insights from page content without parsing HTML.

### AI-Powered Structured Field Extraction

Extract specific data fields from any webpage as structured JSON. You define field names and natural language descriptions of what to extract (e.g., `"price": "Current sale price with currency"`). The AI interprets the page and returns a JSON object with the requested fields. Works well for product details, articles, profiles, and similar structured content.

### HTML Retrieval

Fetch the full rendered HTML of any webpage. Supports both GET and POST requests (POST enables form submissions or API interactions with the target page). JavaScript rendering via headless Chromium is enabled by default and can be disabled for static sites.

### Text Extraction

Extract only the visible text content from a webpage, stripped of HTML. Output can be returned as Markdown, JSON (with title, description, and text fields), or XML. Optionally includes links found on the page. Ideal for feeding content into LLMs or text analysis pipelines.

### CSS Selector-Based Extraction

Extract HTML from specific page elements using CSS selectors (e.g., `h1`, `.price`, `#main`). Supports extracting multiple selectors in a single request. Useful when only a specific portion of the page is needed.

### JavaScript Execution

Execute custom JavaScript on the target page after it loads. Supports clicking buttons, scrolling, filling forms, dismissing cookie banners, or extracting data from JavaScript variables. Can optionally return the script's return value instead of the page HTML.

### Proxy and Geo-Targeting

Requests are routed through rotating proxies automatically. Proxy options include datacenter (default), residential, stealth, and auto escalation. Geo-targeting is supported with proxy locations in many countries (US, UK, Germany, France, Japan, etc.). Users can also supply their own custom proxy URL.

### Device Emulation

Requests can emulate desktop (1920×1080), mobile (iPhone X, 375×812), or tablet (iPad, 768×1024) viewports, affecting user agent and viewport size.

### Custom Headers and Cookies

Custom HTTP headers can be sent with requests, including cookies for session authentication, authorization tokens, and referrer URLs.

### Proxy Mode

WebScraping.AI can be used as an HTTP proxy server (`proxy.webscraping.ai:8888`), allowing integration with existing tools and code without API changes. Configuration parameters are passed via the proxy password field.

### Account Information

Retrieve current account status including remaining API credits, monthly and pay-as-you-go balances when available, credit reset time, and concurrency limits. Numeric reset timestamps are normalized to ISO strings.

### Google Search

The `search_google` tool calls GET `/serp` with the query in `q`, plus optional country (`gl`), language (`hl`), and page. It preserves organic results, search metadata, related searches, and pagination. Only Google is supported; page must be a whole number from 1 to 100.

### Structured Page Data

The `get_structured_data` tool calls GET `/data` for supported public site URLs, with optional country and YouTube transcript options. It preserves `request_parameters`, `parse_status`, and nullable or partial `data`. A `parse_failed` or `not_found` response is still a successful billed request.

### Compatibility

Existing HTML and text output strings remain available. Multiple-selector results preserve one HTML string per selector by joining all matching fragments with newlines. Existing numeric timeout inputs remain JSON Schema numbers and validate whole-number values at runtime. POST requests send the body unchanged with the requested content type; form bodies use a raw text API request with the target content type in forwarded headers.

## API Sources

- [Official API documentation](https://webscraping.ai/docs)
- [Official JavaScript SDK response-shape notes](https://github.com/webscraping-ai/webscraping-ai-js)

## Events

The provider does not support events.
