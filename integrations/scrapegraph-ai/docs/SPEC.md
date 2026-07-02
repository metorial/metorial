Now let me check a few more services to get details on SearchScraper, Markdownify, SmartCrawler, and Sitemap:Now I have enough information to write the specification. Let me compile everything.

# Slates Specification for Scrapegraph Ai

## Overview

ScrapeGraphAI is an AI-powered web scraping API that uses large language models to extract structured data from websites and HTML content using natural language prompts. It provides services for single-page scraping, multi-source web search, website crawling, HTML-to-markdown conversion, agentic browser automation, and sitemap discovery.

## Authentication

ScrapeGraphAI uses API key authentication. All API requests must include the API key in a custom header:

```
SGAI-APIKEY: your-api-key-here
```

API keys are obtained from the ScrapeGraphAI dashboard at `https://dashboard.scrapegraphai.com`. There are no OAuth flows, scopes, or additional credentials required. The base URL for all API requests is `https://api.scrapegraphai.com/v1`.

## Features

### Smart Scraping (SmartScraper)

Extracts structured data from a single webpage using a natural language prompt. Users provide a URL (or raw HTML/Markdown content) and describe what data they want; the AI returns structured JSON.

- Supports custom output schemas (Pydantic/Zod) for consistent data structure.
- Can accept `website_url`, `website_html`, or `website_markdown` as input (mutually exclusive).
- Supports infinite scroll handling via a configurable number of scrolls.
- Stealth mode available for anti-detection on protected sites.
- Configurable page load wait time and proxy routing by country code.
- Supports returning results as plain text instead of JSON.

### Web Search (SearchScraper)

Performs AI-powered web searches from a natural language prompt and aggregates structured results from multiple web sources, with source attribution via reference URLs.

- Two modes: AI Extraction (structured data) and Markdown Mode (raw content, lower cost).
- Configurable number of websites to search (3–20).
- Supports geo-targeted search by country code.
- Supports time range filtering (past hour, 24 hours, week, month, year).
- Custom output schemas for structured responses.

### Website Crawling (SmartCrawler)

Crawls multiple pages of a website starting from a given URL, following links with configurable depth and breadth.

- Two modes: AI-powered extraction with structured output, and markdown conversion mode (no AI, lower cost).
- Configurable crawl depth, breadth per level, and maximum pages.
- Crawl rules allow include/exclude path patterns (with wildcards) and same-domain restriction.
- Supports sitemap-based discovery.
- Supports custom output schemas.
- Supports webhook notifications on job completion (signed with `X-Webhook-Signature`).

### Markdown Conversion (Markdownify)

Converts a single webpage into clean, well-formatted Markdown, stripping ads, navigation, and irrelevant elements while preserving content structure, images, and links.

- Stealth mode and proxy routing available.
- Configurable page load wait time.

### Raw HTML Scraping (Scrape)

Fetches and returns the HTML of a webpage with optional JavaScript rendering and custom headers. Useful when you need the raw page content rather than AI-processed output.

### Sitemap Discovery

Extracts and returns the sitemap structure of a website, useful for understanding site organization before crawling.

### Agentic Browser Automation (Agentic Scraper)

Automates browser interactions using a sequence of natural language steps (clicking, typing, scrolling, form filling, logging in) before extracting data. Enables scraping of login-protected or interaction-heavy pages.

- Steps are described in plain language (e.g., "Type email in input box", "click on login").
- Supports session persistence for multi-step workflows.
- Optional AI extraction with schema support; without AI, returns raw markdown.

### Credits Management

Allows checking remaining API credit balance and usage.

### Request History

Retrieve results of previous requests by service type, with pagination support.

## Events

ScrapeGraphAI supports webhooks for the SmartCrawler service. When a crawl job completes, a POST request is sent to a user-specified webhook URL.

### Crawl Job Completion

Notifies when a SmartCrawler crawl job has finished processing.

- Configured by providing a `webhook_url` parameter when starting a crawl.
- Webhook requests include an `X-Webhook-Signature` header for verification. The webhook secret is configured in the ScrapeGraphAI dashboard.

No other services currently support webhook or event subscription mechanisms.
