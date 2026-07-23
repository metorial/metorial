# ScrapeUnblocker

## Overview

ScrapeUnblocker is a web scraping API. Requests are rendered in a real browser on
ScrapeUnblocker's infrastructure, which lets it return content from sites that
reject ordinary HTTP clients: Cloudflare, DataDome, PerimeterX and Akamai
protected pages, and JavaScript-heavy applications that serve an empty shell to a
plain fetch.

Base URL: `https://api.scrapeunblocker.com`

## Authentication

API key, sent as the `X-ScrapeUnblocker-Key` request header. Keys are issued from
the ScrapeUnblocker dashboard.

## Features

### Page source (`POST /getPageSource`)

Fetches a single URL and returns the rendered result.

| Parameter | Type | Description |
| --- | --- | --- |
| `url` | string, required | Full URL to fetch, including the scheme |
| `parsed_data` | boolean | Return AI-parsed structured JSON instead of raw HTML |
| `proxy_country` | string | Two-letter country code for the exit IP |
| `time_sleep` | integer | Seconds to wait after load before capturing |

Returns the page body. With `parsed_data` unset this is HTML; with it set the
body is JSON.

### Search results (`POST /serpApi`)

Scrapes a Google search results page.

| Parameter | Type | Description |
| --- | --- | --- |
| `keyword` | string, required | The search query |
| `pages_to_check` | integer | How many result pages to scrape, default 1 |
| `proxy_country` | string | Two-letter country code for localized results |

Returns an object containing `organic` (each entry with `title`, `url`,
`description`, `position`), `topAds`, `bottomAds`, and result counts.

## Events

ScrapeUnblocker does not publish events, webhooks, or event subscriptions. The
integration ships only the generic inbound webhook trigger.
