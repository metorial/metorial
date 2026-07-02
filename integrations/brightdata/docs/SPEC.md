# Slates Specification for Bright Data

## Overview

Bright Data is a web data infrastructure platform providing proxy networks (150M+ IPs across 195 countries), web scraping APIs, SERP data extraction, and pre-collected datasets. It provides APIs for scraping, proxy infrastructure, managed browsers, and pre-built datasets, plus serverless functions. Founded in 2014 (formerly Luminati Networks), the platform is engineered for large-scale data acquisition, targeting businesses that need to gather publicly available information across domains.

## Authentication

Bright Data supports two primary authentication methods:

### 1. API Key (Bearer Token) — Recommended for REST API access

Bright Data provides API Access — authenticate and interact with the Bright Data platform using an API key/token. Clients must send a BRIGHT_DATA_API_KEY as a bearer token in the Authorization header when calling the API.

- **How to obtain:** Sign in to Bright Data's control panel, go to Account settings, and click the "Add API key" button. Only admins can generate API keys.
- **Usage:** Include the key in the `Authorization` header: `Authorization: Bearer <API_KEY>`
- **Base URL:** `https://api.brightdata.com`
- **Expiration:** When creating an API key, you can set up its expiration date. Requests authenticating with this key past the expiration date will be denied. You can set the expiration date as unlimited, though an expiration date is strongly recommended.
- **Permission levels:** There are 5 types: Admin (full access), Finance (billing only), Ops (zone/product configurations), Limit (zone passwords and IP allowlists), and User (API usage on zone level only).

### 2. Native Proxy Access — For proxy-based routing

Native Access — authenticate and interact with the Bright Data platform using proxy protocol username and password. This method is used when routing requests through Bright Data's super proxy (`brd.superproxy.io:33335`).

- **Credentials required:**
  - **Account ID** (Customer ID): A unique identifier automatically generated when your account is created, used for authentication and account-related operations. Always a text string that begins with `hl_`.
  - **Zone name:** A Bright Data collection of configuration for a specific service. The zone name is set once when the zone is created and cannot be changed later.
  - **Zone password:** Each zone is assigned a unique password that is required for authenticating both API and Native Access requests.
- **Format:** `--proxy-user brd-customer-[ACCOUNT_ID]-zone-[ZONE_NAME]:[ZONE_PASSWORD]`

## Features

### Web Unlocker API

Access blocked content and bypass CAPTCHAs. Submit any URL and receive the page content with automatic handling of anti-bot measures, proxy rotation, and CAPTCHA solving. Supports output in JSON, HTML, or Markdown formats. Configurable options include target country, device type, and data format.

### SERP API

Lets you tailor requests for multiple search engines—including Google, Bing, Yandex, and DuckDuckGo—using query parameters for localization, pagination, device emulation, and more. Supports various Google services, including Search, Maps, Trends, Reviews, Lens, Hotels, and Flights. Results are delivered in JSON or HTML. Supports both synchronous (real-time) and asynchronous (batch) modes.

### Web Scraper API (Pre-built Scrapers)

Start with 120+ ready-made scrapers for popular platforms. Trigger data collection jobs for specific websites (e.g., Amazon, LinkedIn, Airbnb) by providing URLs or search keywords. Data is returned as structured records in JSON, NDJSON, or CSV. Supports discovery modes to find new entities via keywords, categories, or locations. Configurable parameters include result limits, output format, and delivery method (webhook or API download).

### Crawl API

The Crawl API lets you index and extract data across millions of pages at once, working like a search engine crawler where you control what gets crawled and how.

### Scraping Browser

Headless browser automation with built-in proxy rotation, CAPTCHA solving, and anti-detection features. Compatible with Puppeteer, Playwright, and Selenium for interacting with JavaScript-heavy websites.

### Dataset Marketplace

Provides access to pre-collected, structured datasets from over 100 domains, including LinkedIn, Zillow, eCommerce platforms, social media, and more. These datasets are ready to be integrated into business intelligence and market research tools.

### Scraping Functions

Run scrapers as serverless functions, automating web data collection tasks without the need for continuous manual intervention.

### Account Management

Programmatically manage your Bright Data account, including:

- Creating, configuring, and removing zones
- Managing IP allowlists/denylists and static IPs
- Querying account balance, account status, and zone statistics
- Viewing zone info, permissions, and passwords
- Toggling zones on/off and managing domain restrictions

### Proxy Network Access

Bright Data's Proxy API allows you to interact with and control your proxies programmatically, including automating tasks such as creating, updating, or deleting proxy ports. Proxy types include residential, datacenter, ISP, and mobile. Supports geo-targeting by country, city, carrier, and ASN, with rotating or sticky sessions.

## Events

Bright Data supports webhook-based notifications for asynchronous job completion across its scraping products:

### Scraping Job Completion (Notify URL)

A URL where a notification will be sent once the collection is finished. The notification will contain `snapshot_id` and `status`. This is a lightweight callback used to inform you that a job has completed, after which you retrieve the results separately. Configured per-request via the `notify` parameter when triggering a data collection.

### Scraping Job Data Delivery (Webhook URL)

A webhook URL where data will be delivered. Unlike the notify URL, this delivers the actual scraped data payload directly to your endpoint. Configurable options include the data format for delivery and an authorization header to be used when sending to the webhook. By default, data is sent compressed. Configured per-request via the `endpoint` parameter.

### Async SERP/Unlocker Request Completion

If you've set up a webhook, you'll receive a notification immediately when the requests are ready with the following parameters: `status`, `response_id`, `request_url` and `hook_data` (optional). Used with asynchronous mode for the SERP API and Web Unlocker API. Configured per-request via a webhook URL parameter.
