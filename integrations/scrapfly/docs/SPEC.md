# Slates Specification for Scrapfly

## Overview

Scrapfly is a web data collection platform offering APIs for web scraping, screenshot capture, data extraction, and website crawling. It provides built-in anti-bot bypass, proxy rotation across 120+ countries, headless browser rendering, and AI-powered data extraction from web content.

## Authentication

Scrapfly uses API key authentication. The `key` parameter is required for all API requests and is passed as a URL query parameter.

- **API Key**: Find your key on the Scrapfly dashboard. Keys follow the format `scp-live-xxx...`
- **How to pass**: Append `?key=YOUR_API_KEY` to any API endpoint URL as a query parameter.
- **Base URL**: `https://api.scrapfly.io`
- Each project has two dedicated API keys for LIVE and TEST environments, available on the Scrapfly dashboard.

Example:

```
GET https://api.scrapfly.io/scrape?key=scp-live-xxx&url=https://example.com
```

No OAuth2 or other authentication methods are supported for the main API. The API key is the sole authentication mechanism.

## Features

### Web Scraping

Scrape any web page by providing a target URL. Scrapfly pre-configures user-agent and other request headers automatically.

- **Anti-Scraping Protection (ASP)**: Bypasses all anti-scraping systems including CAPTCHAs, Cloudflare, and fingerprint challenges. Enabled via the `asp` parameter.
- **Proxy Management**: Automatically rotates proxies from datacenter or residential pools of 130M+ proxies from 120+ countries. Configurable via `proxy_pool` and `country` parameters.
- **JavaScript Rendering**: Use cloud browsers to render JavaScript-powered pages and control them to click buttons, input forms, and perform automation tasks. Enabled via `render_js` parameter.
- **JavaScript Scenarios**: Define step-by-step browser automation instructions (fill forms, click buttons, wait for navigation) as JSON templates to interact with pages before extracting content.
- **Output Formats**: Supports output formats including raw, clean_html, json, markdown, and text.
- **Sessions**: Sessions can persist cookies and other details between scrapes, and can be transferred between render_js and non-render_js scrapes.
- **Caching**: Server-side caching of scrape results with configurable TTL to reduce costs on repeated requests.
- **Custom Headers and Cookies**: Pass custom HTTP headers and cookies with scrape requests.
- **Request Methods**: Supports GET, POST, PUT, PATCH, and HEAD requests.

### Screenshot Capture

A service that captures a screenshot of any web page or part of the web page.

- **Capture Modes**: Choose between full-page captures or select specific areas of the webpage using CSS selectors for precise control.
- **Page Cleanup**: Block ads, pop-ups, modals, and banners with `options=block_banners`. Auto-scroll to the bottom of the page to load all content with `auto_scroll`.
- **Custom JavaScript**: Execute JavaScript code on the page before taking the screenshot.
- **Viewport & Resolution**: Configurable viewport size and resolution, including mobile device emulation.
- **Accessibility Testing**: Simulate how web pages appear to users with various vision deficiencies for compliance testing with WCAG, ADA, and Section 508 standards.
- **Dark Mode**: Support for capturing pages in dark mode.
- Anti-bot bypass and proxy rotation apply to screenshots as well.

### Data Extraction

A data extraction API that can extract structured data from any web page using AI, LLMs, and predefined JSON instructions. Three extraction methods are available:

- **AI Auto-Extraction (`extraction_model`)**: Automatic extraction using predefined AI models for common data types (products, articles, reviews, etc.). No additional configuration needed beyond selecting the model.
- **LLM Prompt Extraction (`extraction_prompt`)**: Uses AI language models to understand natural language instructions and extract data accordingly. Provide a prompt describing what data you want, and the AI returns structured results.
- **Template Extraction (`extraction_template`)**: Define custom extraction JSON rules for parsing data from HTML, XML, and JSON documents to generate structured JSON output. Uses CSS selectors, XPath, or JMESPath.
- These extraction methods are directly accessible in Web Scraping API requests, meaning you can scrape and extract data with a single API call.
- Supports HTML, XML, JSON, CSV, RSS, Markdown, and plain text documents.
- Can also be used as a standalone API by POSTing document content directly to the extraction endpoint.

### Website Crawling

The Crawler API enables recursive website crawling at scale.

- The Crawler API automatically discovers URLs by following links from a starting point. It can crawl entire websites or sections based on URL filtering rules.
- **Configurable Limits**: Set page limits, maximum crawl duration, crawl depth, and request delays.
- **Content Formats**: Multiple formats can be extracted simultaneously from each page. Markdown format is ideal for LLM processing.
- **Result Artifacts**: Results are delivered as industry-standard artifacts like WARC, Parquet, and HAR formats.
- Supports anti-bot bypass, JavaScript rendering, proxy configuration, and extraction rules — same as the Web Scraping API.
- The Crawler API is currently in early access. Features and API may evolve based on user feedback.

### Account & Project Management

Projects provide a way to control multiple web scraping projects with their own budgets, quotas, and configurations. Each project has separate LIVE and TEST API keys.

## Events

Scrapfly supports webhooks across all its major APIs. Webhooks must first be created via the Scrapfly dashboard, then referenced by name in API requests using the `webhook_name` parameter.

### Scrape Completion Webhooks

Ideal for managing long-running scrape tasks asynchronously. When a webhook is specified, Scrapfly will call your HTTP endpoint with the scrape response as soon as the scrape is done.

- Triggered per scrape request by including `webhook_name` in the request.
- The payload is the same as a regular scrape API response.
- Identified by the header `X-Scrapfly-Webhook-Resource-Type: scrape`.
- Webhooks are scoped per Scrapfly projects and environments.

### Screenshot Completion Webhooks

Ideal for managing screenshot tasks asynchronously. When a webhook is specified, Scrapfly will call your HTTP endpoint with the screenshot response.

- Triggered per screenshot request by including `webhook_name`.
- Identified by the header `X-Scrapfly-Webhook-Resource-Type: screenshot`.

### Extraction Completion Webhooks

Ideal for managing long-running extraction tasks asynchronously. When a webhook is specified, Scrapfly will call your HTTP endpoint with the extraction response.

- Triggered per extraction request by including `webhook_name`.
- Identified by the header `X-Scrapfly-Webhook-Resource-Type: extraction`.

### Crawler Event Webhooks

Receive instant HTTP callbacks as crawler events occur. Best for real-time data ingestion, streaming pipelines, and event-driven architectures.

- Configurable via `webhook_name` and `webhook_events` parameters when creating a crawl.
- Events include `crawler_url_visited` (fired for each page crawled with URL, status code, depth, and state) and `crawler_finished` (fired when the crawl job completes).
- Event type is identified via the `X-Scrapfly-Crawl-Event-Name` header.

**General webhook notes:**

- Webhook payloads are signed using HMAC-SHA256, included in the `X-Scrapfly-Webhook-Signature` header, allowing payload verification.
- Failed deliveries are automatically retried per a retry policy.
