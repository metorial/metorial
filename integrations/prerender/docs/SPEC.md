# Prerender Integration Specification

## Overview

Prerender.io is a dynamic rendering service that serves pre-rendered HTML snapshots of JavaScript-heavy web pages to search engine crawlers and social media bots for improved SEO. Prerender.io serves pre-rendered HTML snapshots to crawlers, enhancing SEO for JavaScript-heavy sites. The API supports recaching individual or multiple URLs, searching cached URLs, adding sitemaps, clearing cache selectively, and adjusting recache speeds.

## Authentication

Prerender.io uses a **Prerender Token** (API key) for authentication. The Prerender token can be found under the Security and Access menu under Prerender Token in your Prerender.io dashboard.

The token is passed in one of two ways depending on the API being used:

1. **REST API (cache management):** Include the token as a JSON body parameter called `prerenderToken` in POST requests to `https://api.prerender.io/`. Example:

   ```json
   {
     "prerenderToken": "YOUR_TOKEN",
     "url": "http://www.example.com/"
   }
   ```

2. **Rendering service:** Forward qualifying requests to `https://service.prerender.io/` with your unique token header. Prerender handles rendering and caching transparently. Be sure your middleware includes the `X-Prerender-Token` header or requests will be denied (403 error).

There is no OAuth2 flow. Authentication is solely token-based.

**Note:** The documented REST API is available on every plan. Cache clearing requires a current plan; legacy plans require provider support for that operation. Existing V3 management operations are retained for compatible connections.

## Features

### Cache Management (Recache)

Trigger caching or recaching of URLs programmatically to ensure search engines see up-to-date content. The API allows programmatic control over when and how content is refreshed in the cache. Instead of waiting for cache expiration, you can trigger recaching immediately for high-priority pages, ensuring search engines always see current content.

- Supports single or multiple URLs per request (up to 1,000 URLs per request). Empty or oversized requests are rejected before submission.
- Can target desktop or mobile rendering via the `adaptiveType` parameter (`"desktop"` or `"mobile"`).

### Cache Search

The search API lets you search for cached URLs within your account and see their cache status.

- The `query` parameter performs a "contains" query. `exactMatch` returns results where the URL is fully identical. If both are present, only `exactMatch` will be used.
- Can filter by `adaptiveType` (mobile or desktop).

### Cache Clearing

Clear cached URLs totally or partially using wildcard patterns. The query is inserted into an SQL-like condition where `%` and `?` act as wildcards. Adding `%` after a URL will delete everything that begins with the string before `%`.

- The call schedules a clear job. The job usually runs quickly but depends on cache size. `get_clear_cache_status` polls it without scheduling another job. HTTP 403 from the status endpoint means `in_progress`; HTTP 200 means `not_queued`. There can only be one scheduled job per user.

### Sitemap Management

Submit XML sitemaps so Prerender can crawl and cache all listed URLs. URLs from the sitemap are added to the rendering queue and cached. Sitemaps are checked and updated every 7 days, daily, or hourly depending on the configured interval. New URLs are added automatically. Multiple sitemaps are supported. Supports XML sitemaps per sitemaps.org standard.

- Recrawl interval is configurable per sitemap.
- `submit_sitemap` uses the documented `/sitemap` endpoint to import new URLs. Existing cached URLs are not recached; use `recache_urls` for refreshes.
- `manage_sitemaps` retains the existing V3 registration, listing, update, deletion, and crawl operations.

### Recache Speed Control

The recacheMetrics object provides statistics on how many pages will be cached in various time periods. 36000 is the fastest recache speed, while 18000 is slower. Setting to 0 reverts to the default automatic delay.

### Domain Management

The Domain Manager provides a central view of all connected domains. It shows how many URLs are cached per domain and helps track domains. This tool helps monitor cache activity at the domain level, verify integrations, and add or remove domains.

- Cache expiration can be configured dynamically based on patterns or domains. Custom expiration rules can be set instead of relying on a single global setting.

### Page Rendering Service

Render an HTTP or HTTPS URL through Prerender's headless browser to get the fully rendered HTML and a downloadable HTML snapshot. The existing `renderedHtml` output is preserved for compatibility. This is accessed via the service endpoint (`https://service.prerender.io/{url}`) using the `X-Prerender-Token` header. This is the core rendering functionality used by middleware integrations.

## Events

The provider does not support events. Prerender.io does not offer webhooks or purpose-built event subscription mechanisms through its API.

## Official API references

- [REST API](https://docs.prerender.io/docs/6-api)
- [Rendering request flow](https://docs.prerender.io/docs/how-does-prerender-work)
- [V3 API documentation entry point](https://api.prerender.io/v3/api)
