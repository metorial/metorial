# Slates Specification for Zyte Api

## Overview

Zyte API is a web scraping API that handles anti-bot bypassing, browser rendering, and AI-powered data extraction from any website. It avoids bans, enables browser automation, enables automatic extraction, and more. It provides both a direct HTTP API and a proxy mode for fetching and extracting web content.

## Authentication

All requests require HTTP Basic Authentication. Use your Zyte API key as the username, and leave the password empty.

For example, if your Zyte API key is `foo`, base64-encode `foo:` as `Zm9vOg==` and send the `Authorization` header with value `Basic Zm9vOg==`.

The API key can be obtained by signing up for a Zyte API account through the Zyte dashboard.

**Base URL:** `https://api.zyte.com/v1/`

**Proxy mode:** When using Zyte API as a proxy, use the `api.zyte.com:8011` endpoint, with your Zyte API key as the proxy username and an empty password.

**Stats API:** Zyte API also offers an HTTP API to query your Zyte API requests. All requests to the stats API require basic authentication with your Zyte dashboard API key (not your Zyte API key) as username, and no password.

## Features

### HTTP Requests

Fetch raw HTTP responses from any URL with anti-bot protection handling. Send low-level HTTP requests, with custom method, headers and body, opt-out redirection following, device emulation, and more. HTTP responses do not reflect HTML content rendered by a web browser that executes JavaScript code.

### Browser Rendering

Use browser automation through Zyte API to get browser-rendered HTML, screenshots, or both. This handles JavaScript-rendered pages. Supports actions, network capture, request headers, redirection, and toggling JavaScript. Available browser actions include scrolling, clicking, typing, waiting, and evaluating custom JavaScript (including shadow DOM access).

- Unlike HTTP requests, browser requests do not support an HTTP request method, body, or header other than Referer.

### Automatic Extraction (AI-Powered)

Automatic extraction uses AI-powered extraction for the following structured data types: product, productList, productNavigation, article, articleList, articleNavigation, forumThread, jobPosting, jobPostingNavigation, pageContent.

- AI-powered extraction also supports LLM-based extraction of custom attributes. Custom attributes allow you to use natural language to describe what data you want extracted from a page.
- Extraction can use either a browser request or an HTTP request as the source, configurable via `extractFrom` options.
- The AI models are retrained regularly, usually a few times per year. While new model versions aim to improve overall accuracy, they may become less accurate for specific fields of specific websites. For certain data types, an option to pin a specific model version is provided.

### Geolocation

The geographical point of origin of a request can influence response content. Some websites adjust language or currency based on country of origin. Some websites only allow traffic from specific countries.

- By default, Zyte API uses the most fitting geolocation based on the target website. You can override the country of origin with the `geolocation` request field.
- Two sets of geolocations are available: standard and extended. Using an extended geolocation explicitly affects request cost.

### IP Type Selection

Setting `ipType` explicitly to residential, instead of letting Zyte API choose the right IP type, requires completing a KYC procedure and affects request cost. Options include datacenter and residential IPs.

### Sessions and Cookies

Get and set cookies to reproduce requests and maintain sessions. Use the same IP address, cookie jar, network stack, etc. on multiple requests.

### Proxy Mode

Use Zyte API as a proxy. This allows integrating Zyte API with existing tools and libraries that support HTTP proxies, using special headers to configure features like browser rendering and geolocation.

### Stats API

Zyte API offers an HTTP API to query your Zyte API requests, enabling monitoring and analytics of your usage via tools like Grafana or Google Looker Studio.

## Events

The provider does not support events. Zyte API is a request-response service for web scraping and does not offer webhooks or event subscription mechanisms.
