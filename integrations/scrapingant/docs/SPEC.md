# ScrapingAnt API Specification

## Overview

ScrapingAnt is a web scraping API that extracts data from websites using a cluster of headless Chrome browsers and rotating proxies. It handles anti-bot bypass (including CAPTCHA and Cloudflare), JavaScript rendering, and proxy rotation automatically. It also offers AI-powered data extraction and HTML-to-Markdown conversion for LLM/RAG use cases.

## Authentication

All requests to the ScrapingAnt API are authenticated using an API key, passed as the `x-api-key` header or query parameter. The integration sends it as a header.

The API key can be found on the dashboard page in the user's admin panel after registering at [app.scrapingant.com](https://app.scrapingant.com).

**Method:** API Key

- **Header name:** `x-api-key`
- **Passed as:** HTTP header on every request

Example:

```
GET https://api.scrapingant.com/v2/general?url=https://example.com
x-api-key: <YOUR_API_KEY>
```

ScrapingAnt also supports a Proxy Mode, which is a simple HTTP/HTTPS proxy that allows using the API via a proxy port. It can be used with any HTTP client that supports proxy configuration. In proxy mode, the username is `scrapingant` and the password is your API key.

No OAuth or token-based authentication flows are supported. There are no scopes or additional credentials required beyond the API key.

## Features

### Web Page Scraping

Scrape any web page by providing its URL and receive the rendered HTML content. ScrapingAnt renders JavaScript by default using a headless browser. Browser rendering can be disabled to reduce credit cost.

- **Key parameters:** `url` (target URL), `browser` (enable/disable headless browser rendering), `timeout` (5–60 seconds), `return_page_source` (get server-returned HTML before browser alteration).
- ScrapingAnt handles rotating proxies, CAPTCHA, Cloudflare, and headless browser rendering automatically.

### Proxy Configuration

ScrapingAnt's proxy pool supports more than 20,000 different proxies around the world. By default, a random proxy from the datacenter pool is selected.

- **Proxy types:** Datacenter (default) and residential. Mobile proxies available by request.
- **Geo-targeting:** Use `proxy_country` to route requests through a specific country.
- Each new request is performed with a new IP from the proxy pool, making requests appear as if they come from different users.

### Markdown Transformation

An endpoint that extracts data from websites and automatically converts the HTML output into Markdown format. This feature is particularly useful for leveraging results in LLMs and RAG systems.

- Available at `/v2/markdown`.
- Supports the same parameters as the general scraping endpoint (browser rendering, proxy settings, etc.).
- `download_markdown` saves the converted text as a downloadable `.md` file.
- The endpoint returns a JSON object containing `url` and `markdown`; it does not expose the target page status. Conversion can succeed for an error page.

### AI Data Extraction

The AI extractor uses free-form described parameters for JSON structure names and returns the extracted data in a JSON object with the same structure.

- Available at `/v2/extract`.
- **Key parameter:** `extract_properties` — a free-form, comma-separated description of data fields to extract (e.g., `title, content, price`).
- The AI extractor works only with markdown extracted from the page's HTML. It doesn't work with styles, JS, or HTML tags.
- Multi-language support, but works best when input parameters are described in English.

### Extended JSON Response

An extended JSON output endpoint provides additional data like cookies, headers, XHRs, etc.

- Available at `/v2/extended`.
- XHR headers are supplied as name/value arrays and normalized to a header map for callers. Missing XHR request or response bodies are exposed as empty strings.
- `status_code` is the target page status, separate from the API's outer HTTP status.

### Custom Browser Interaction

Control browser behavior during scraping:

- **JavaScript execution:** Run custom JS snippets on the page after it loads via the `js_snippet` parameter (Base64 encoded).
- **Wait for selector:** Use `wait_for_selector` to wait for a specific CSS element to appear before returning results.
- **Resource blocking:** Use `block_resource` to prevent the browser from loading specific resource types (images, stylesheets, scripts, fonts, etc.).
- **Custom cookies and headers:** Pass custom cookies and HTTP headers with scraping requests.

JavaScript execution, selector waits, resource blocking, and original page-source mode require `browser=true`. Existing timeout inputs remain numbers in the range 5–60 seconds.

### Proxy Mode (Proxy Port)

ScrapingAnt Proxy Mode is a simple HTTP/HTTPS proxy that allows using the API via proxy port. It can be used with any HTTP client that supports proxy configuration and has all the same functionality and performance as the API endpoint.

### Subscription Status

A dedicated endpoint allows checking current API credit usage and subscription status.

## API References

- [Request parameters and authentication](https://docs.scrapingant.com/request-response-format)
- [API errors and header authentication](https://docs.scrapingant.com/errors)
- [Extended response format](https://docs.scrapingant.com/json-response)
- [Markdown conversion](https://docs.scrapingant.com/llm-markdown)
- [Usage status](https://docs.scrapingant.com/api-credits-usage)
- [Custom headers](https://docs.scrapingant.com/custom-headers)

## Events

The provider does not support events. ScrapingAnt is a request-response API for web scraping and does not offer webhooks, event subscriptions, or any push-based notification mechanism.
