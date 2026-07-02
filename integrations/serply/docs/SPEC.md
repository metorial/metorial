Now I have enough information to write the specification.

# Slates Specification for Serply

## Overview

Serply is a SERP (Search Engine Results Page) API that provides programmatic access to search results from Google and Bing. It returns structured JSON data for web search, news, images, videos, jobs, products, scholar results, and maps. The API supports geo-targeted searches and device type emulation.

## Authentication

Serply uses API key authentication. All requests must include the API key in a custom HTTP header.

- **Method:** API Key via HTTP header
- **Header Name:** `X-Api-Key`
- **How to obtain:** Sign up at [app.serply.io](https://app.serply.io) and retrieve your API key from the dashboard.
- **Base URL:** `https://api.serply.io`

Example request:

```
curl --header 'X-Api-Key: YOUR_API_KEY' \
  'https://api.serply.io/v1/search/q=query'
```

All requests must be made over HTTPS.

## Features

### Web Search (Google & Bing)

Perform web searches and retrieve organic results as structured JSON, including titles, links, descriptions, and answer box content. Supports Google search operators (e.g., `site:`, date ranges).

- **Parameters:** Query string, number of results, start offset, language (`lr`), interface language (`hl`).
- **Geo-targeting:** Use the `X-Proxy-Location` header to specify search location (US, EU, GB, DE, FR, JP, CA, AU, BR, IN, and others).
- **Device type:** Use the `X-User-Agent` header to toggle between `desktop` and `mobile` results.

### News Search

Search across news sources and retrieve current news articles in JSON format.

- Supports the same geo-targeting and language parameters as web search.

### Image Search

Search for images and retrieve image result data.

- Supports the same location and device parameters as web search.

### Video Search

Search for video content and retrieve structured video result data.

- Supports the same location and device parameters as web search.

### Product Search

Search for products and retrieve product listings including data from major e-commerce sources.

- Useful for building price comparison tools or product research applications.

### Jobs Search

Search Google job listings and retrieve structured job posting data including position titles, employer information, salary ranges, benefits, and remote/hybrid indicators.

- Currently limited to job listings in North America (US and Canada).

### Scholar Search

Search Google Scholar's academic database and retrieve research papers, articles, citation counts, authors, and publication metadata.

- Useful for building literature review tools, citation managers, and research dashboards.

### SERP Ranking

Track domain-level SERP rankings for specific queries. Designed for SEO rank tracking and competitor monitoring use cases.

## Events

Serply supports webhooks to receive real-time notifications for account and search events.

### Search Events

Notifications related to the outcome of search requests.

- **`search.completed`** — Fired when a search request completes successfully.
- **`search.failed`** — Fired when a search request fails.

### Quota Events

Notifications related to account usage limits.

- **`quota.exceeded`** — Fired when the API quota limit has been reached.

Webhooks can be registered via the dashboard or the API by providing a target URL and a list of event types. Webhook payloads are signed with HMAC-SHA256 via the `x-serply-signature` header for verification.
