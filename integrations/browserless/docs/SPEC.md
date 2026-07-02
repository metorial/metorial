# Slates Specification for Browserless

## Overview

Browserless is a cloud-hosted headless browser service that provides managed Chrome/Chromium instances for browser automation tasks. It offers HTTP endpoints for common browser tasks like screenshots, PDFs, content scraping, file downloads, function execution, and website unblocking. It also provides BrowserQL (BQL), a GraphQL API for browser automation with built-in stealth and CAPTCHA solving, and BaaS v2, which lets you connect Puppeteer or Playwright to managed browsers over WebSocket.

## Authentication

All Browserless APIs require an API token. Include your token as a query parameter: `https://production-sfo.browserless.io/scrape?token=YOUR_API_TOKEN_HERE`.

- **Type:** API Token (query parameter)
- **How to obtain:** Sign up for a Browserless account (free plan available) and get your API token from the account dashboard.
- **Usage:** Append `?token=YOUR_API_TOKEN` to all REST API URLs and WebSocket connection URLs.
- **Invalid tokens:** Invalid tokens result in HTTP 401/403 errors.
- **Regions:** You can select the browser type (Chromium, Chrome, or Edge) and choose your preferred region (San Francisco, London, or Amsterdam). The base URL varies by region (e.g., `production-sfo.browserless.io`).

## Features

### Content Scraping

Extract structured data from web pages using CSS selectors. You provide a URL and one or more CSS selectors, and Browserless returns matching elements with their text, HTML, attributes, and position. Browserless loads the page, runs client-side JavaScript, and then waits (up to 30 seconds by default) for your selectors before scraping.

### Full Page HTML Retrieval

Retrieve the fully rendered HTML content of a web page after JavaScript execution. Useful for getting the complete DOM of single-page applications or dynamically rendered pages.

### PDF Generation

The PDF API can render dynamically generated content, ideal for dashboard and report exports. You can supply a URL or raw HTML and configure options such as `printBackground`, page size, margins, headers/footers, and media type emulation.

### Screenshot Capture

The screenshot API navigates to a page then captures a JPEG or PNG, with options to set the HTML of the page to render dynamically generated content. Supports full-page captures, custom viewport sizes, and various image formats.

### File Download

Allows executing browser automation code that triggers file downloads and returns the downloaded files. You provide JavaScript code that navigates and interacts with a page, and Browserless captures any files downloaded during execution.

### Custom Function Execution

A JavaScript content-type API for running Puppeteer code in the browser's context. Browserless sets up a blank page, injects your code, and runs it. You can optionally load external libraries via the "import" module. This enables multi-step browser interactions within a single request, such as navigating, filling forms, and extracting data.

- Supports both raw JavaScript and JSON with context data payloads.
- REST APIs are stateless, single-action endpoints. Each request launches a browser, performs one task, and closes the session.

### Website Unblocking

The unblock API helps bypass basic bot detection mechanisms when accessing protected websites. The `/unblock` endpoint handles basic protections, but sites with advanced fingerprinting or interactive CAPTCHAs may still block requests. Use BrowserQL for advanced stealth and CAPTCHA solving.

### Performance Analysis

Run Google Lighthouse audits against web pages to analyze performance metrics. Supports parallel test execution.

### Screencast / Video Recording

Create WebM video files of your automations. The recordings have full frame rate and audio, without the limitations of Puppeteer or Playwright's built-in recorders.

### BrowserQL (Stealth Automation)

BrowserQL (BQL) is a GraphQL API for browser automation with built-in stealth capabilities. Execute declarative mutations against managed browsers to navigate, interact with pages, extract data, and bypass bot detection—all through a simple query language.

- Supports navigation, clicking, typing, scrolling, and human-like interactions.
- Built-in CAPTCHA solving (available on higher-tier plans).
- You can combine BrowserQL with Puppeteer or Playwright. Use BQL for stealth operations, then connect your existing scripts via the reconnect mutation.

### Web Search

Browserless provides a search endpoint that performs web searches and optionally scrapes each result page, returning structured, LLM-ready data. It supports multiple sources (web, news, images), geo-targeting, time-based filtering, and category filters.

- When scraping is enabled, each result URL is fetched and processed into your preferred format: clean markdown, raw HTML, extracted links, or a screenshot. You can further refine scraping output with main content extraction, tag filtering, and base64 image removal.
- Only available on Cloud plans.

### Session Management

The sessions API is for creating and managing persistent browser sessions via REST endpoints. You can create sessions with configurable TTL, stealth mode, and browser arguments, then connect to them via WebSocket for multi-step workflows.

### Residential Proxy Support

Browserless comes with a built-in mechanism to proxy to residential IPs. These IP addresses are sourced from real users. Residential proxying is especially useful for bypassing certain bot blockages. Configurable via query parameters for proxy type, country, and sticky sessions.

## Events

Browserless supports webhooks only for self-hosted Enterprise Docker deployments. These are configured via environment variables and are not available through the cloud API.

For each URL, when the associated event happens, Browserless will do a GET call on the provided URL. It doesn't listen to responses or failures.

The following webhook categories are available (Enterprise Docker only):

- **Queue Alert:** Triggered when queuing begins to happen. Configured via `QUEUE_ALERT_URL`.
- **Reject Alert:** Triggered when request rejections occur. Configured via `REJECT_ALERT_URL`.
- **Timeout Alert:** Triggered when sessions time out. Configured via `TIMEOUT_ALERT_URL`.
- **Error Alert:** Triggered when the limiter encounters errors during job execution. The error message is passed as a parameter to the webhook URL. Configured via `ERROR_ALERT_URL`.
- **Failed Health:** Triggered when the health of the instance is critical (over 99% on CPU and memory). You can use this event to potentially restart or replace the instance. Configured via `FAILED_HEALTH_URL`.

For the cloud-hosted service, Browserless does not provide webhook or event subscription capabilities.
