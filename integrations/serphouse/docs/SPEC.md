Let me get more details on the API documentation to understand the full feature set and authentication details.Now I have enough information to write the specification.

# Slates Specification for Serphouse

## Overview

SERPHouse is a SERP (Search Engine Results Page) API provider that allows programmatic extraction of search results from Google, Bing, and Yahoo. It is a high-volume SERP API designed for SEO professionals and data scientists, handling captcha resolution and proxy management to deliver structured JSON data. It supports multiple search types including web, images, news, videos, jobs, and shopping results.

## Authentication

SERPHouse uses Bearer Authentication. An API key is used as the bearer token in request headers.

- You can obtain an API key by registering at `https://app.serphouse.com/register`.
- The API key is included in the `Authorization` header as: `Authorization: Bearer {your_api_key}`
- The base URL for all API requests is `https://api.serphouse.com`
- No OAuth flows or scopes are involved; the single API key grants access to all endpoints available on your plan.

## Features

### Real-Time SERP Search

Perform live search queries and receive parsed SERP results immediately. Currently supports three major search engines: Google, Bing, and Yahoo.

- **Parameters**: Query keyword (`q`), search engine domain (`domain`), language (`lang`), device type (`desktop`, `mobile`, `tablet`), SERP type (`web`, `image`, `news`), location (`loc` or `loc_id`), verbatim mode, page number, and number of results.
- Google SERP results include parsed snippets for AI Overview, Top Stories, Inline Images, Inline Videos, People Also Ask, Knowledge Graph, Ad Results, Organic Results, Related Searches, Inline Products, Map Pack, Carousel, and Tweets.
- Response can be returned as structured JSON or raw HTML.

### Scheduled/Batch SERP Search

Submit large batches of search queries for asynchronous processing. You can send up to 100 keywords in a single request.

- The Scheduled SERP API returns a list of unique IDs assigned to each task, which you can then use to retrieve results.
- Supports the same parameters as the live search (keyword, domain, language, device, location, etc.).
- Optional `postback_url` and `pingback_url` parameters for webhook notifications when tasks complete.

### Google Specialized Search APIs

Access specialized Google search verticals beyond standard web results.

- **Google Jobs API**: Retrieve job listing results from Google.
- **Google Videos API**: Extract video search results.
- **Google Short Videos API**: Get short-form video results.

### Google Trends

Query Google Trends data for keyword interest over time, both in real-time and via scheduled requests.

- **Parameters**: Keywords (comma-separated for comparison), time range (`time`), time zone offset, geographic targeting (`geo`), category, property (e.g., `youtube`, web search), and language.
- Returns time-series interest data and geographic breakdown (geo map data).
- Supports scheduled trend searches with webhook callbacks.

### Location and Language Discovery

Look up supported locations and languages for targeting SERP queries.

- Search available locations by query string, filtered by search engine type (Google, Bing, Yahoo).
- Retrieve supported languages per search engine.
- Retrieve supported search engine domains.

### Account Management

Retrieve account information including active plan details and credit usage (available and total credits for both scheduled and live API calls).

## Events

SERPHouse supports webhooks for scheduled/batch search task completion through two mechanisms:

### Postback (Webhook POST)

Postback is commonly known as a webhook. While using the Batch API (Delayed SERP API), the postback URL helps reduce backend work. Once the backend completes keyword processing, you receive an HTTP POST request on your provided `postback_url` with the full result data as a JSON body.

- Configured per-task by including a `postback_url` parameter in scheduled SERP or scheduled Trends requests.
- SERPHouse uses a webhook secret key to create an HMAC SHA256 hash signature passed via the `x-serphouse-signature` header for validation.
- Retries on failure: second attempt after 100 seconds, third after 1000 seconds, and fourth after 1800 seconds.
- Global webhook URL can also be configured from the account dashboard.

### Pingback (Callback GET)

Pingback alerts you when a scheduled search is completed via an HTTP GET request to your `pingback_url`. Once received, you retrieve the data separately using the Get SERP Result API with the task's unique ID.

- Configured per-task by including a `pingback_url` parameter in scheduled requests.
- Useful when you prefer to fetch results on your own rather than receiving them in the webhook payload.
