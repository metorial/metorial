Now let me check the webhooks documentation:Let me get the Public API authentication details:Now I have enough information to write the specification. Let me also check the Web Scraping API authentication details more closely:Now I have comprehensive information to write the specification.

# Slates Specification for Smartproxy

## Overview

Smartproxy (now rebranded as Decodo) is a proxy and web data extraction provider offering residential, mobile, ISP, and datacenter proxies, a Site Unblocker, and a Web Scraping API with 100+ pre-built templates for scraping eCommerce, search engine, and social media platforms. The company formerly operated as smartproxy.com and is now decodo.com.

## Authentication

Smartproxy uses different authentication methods depending on the API being accessed:

### Web Scraping API

- **HTTP Basic Authentication**: Requests are authenticated by entering your username and password in the Web Scraping API Authentication tab on the dashboard. Credentials are sent via standard HTTP Basic Auth (base64-encoded `username:password`).
- The dashboard also provides a **Basic Authentication Token**, which is a pre-encoded Base64 combination of username and password.
- Endpoint (real-time): `https://scraper-api.decodo.com/v2/scrape`
- Endpoint (async): `https://scraper-api.decodo.com/v2/task`

### Proxy Public API (Account Management)

- An API key obtained from the dashboard is used to authenticate to the Public API.
- The legacy v1 API at `https://api.smartproxy.com/v1/auth` (now `https://api.decodo.com/v1/auth`) used Basic Authentication (username:password) to obtain a token, which was then passed alongside a `user_id` for subsequent requests.

### Proxy Connection Authentication

- Proxy user authentication allows you to connect using your username and password credentials along with the selected port. This method is commonly referred to as user:pass authentication.
- Alternatively, if you choose IP whitelisting, no username or password is required – traffic from whitelisted IPs is automatically authenticated. You can whitelist your IP in the dashboard.

## Features

### Web Scraping API

Fully managed web data extraction that handles proxies, browser rendering, CAPTCHAs, and anti-bot mechanisms. Users choose a website or data source from templates or use the universal Web target, then provide a URL. Supports both real-time (synchronous) and asynchronous request modes, including batch requests for processing multiple URLs at once.

- **Target Templates**: Pre-built scraping configurations for Amazon (product, search, pricing, bestsellers, sellers), Google (search, ads, hotels, lens, AI overview, AI mode), Bing, Walmart, Reddit, TikTok (posts, shop), YouTube (metadata, search, transcripts, channels), ChatGPT, Perplexity, and Target.com.
- **Universal Scraper**: Scrape any website by providing a URL without a specific template.
- **Parameters**: Configurable geo-location, locale/language, JavaScript rendering, device type, session management, custom headers, cookies, custom status codes, and parsing options (JSON, HTML, Markdown, screenshots, XHR capture).
- **Scheduling**: Saved scraping templates can be scheduled (hourly, daily, weekly, monthly, or custom cron) with delivery via email, webhook, or Google Drive.
- **Asynchronous requests** support a `callback_url` parameter for receiving results via webhook when scraping is complete.

### Proxy Services

Multiple proxy types for routing traffic through various IP pools with geo-targeting capabilities across 195+ locations.

- **Residential Proxies**: Real household device IPs with country, state, city, and ASN-level targeting. Supports rotating and sticky sessions (up to 24 hours).
- **Mobile Proxies**: IPs from real mobile carrier devices.
- **ISP (Static Residential) Proxies**: Available in Pay/GB, Pay/IP, and Dedicated tiers. Blend residential authenticity with datacenter stability.
- **Datacenter Proxies**: Available in Pay/GB, Pay/IP, and Dedicated tiers.
- **Session Types**: Rotating (new IP per request) or sticky (same IP for a configurable duration).
- **Protocols**: HTTP, HTTPS, and SOCKS5 supported depending on proxy type.

### Site Unblocker

An advanced proxy solution that automatically handles CAPTCHAs, IP bans, JavaScript rendering, and anti-bot protections. Configured similarly to proxies but with automatic unblocking logic. Supports geo-location, session control, locale settings, Markdown output, custom status codes, and POST requests.

### Account and Proxy User Management (Public API)

The Public API allows creating, updating, deleting, and setting traffic limits for proxy users; pulling traffic usage reports; creating and deleting whitelisted IPs; filtering and listing all endpoints with ports; generating custom endpoints including backconnect; and checking subscription status.

### Usage Statistics

Track traffic usage, request success rates, average response times, and spend across all products. Data can be filtered by target, time period, and grouped by hour/day/week/month. Exportable in CSV, TXT, or JSON formats.

## Events

Smartproxy supports webhooks for account and billing notifications. Webhooks are configured in the dashboard under Account Settings > Webhooks by specifying a destination URL and selecting which event types to receive.

### Payment Events

- **Failed payments**: Triggered when a recurring subscription charge fails (includes past due alerts).
- **Pre-billing alert**: Notification sent 3 days before a recurring subscription charge.
- **Auto top-up failed**: Triggered when an automated GB top-up charge fails.

### Traffic Usage Events

- **Usage threshold alerts**: Triggered when total traffic usage reaches 80% or 100% on pay-per-GB plans. Includes the usage percentage and associated username.

### Scraping API Subscription Events

- **Trial started**: Triggered when a Scraping API trial is activated.
- **Trial expiring**: Notification sent 1 day before a Scraping API trial expires.
- **Subscription expired**: Triggered when a Scraping API subscription has expired.

### Pay As You Go Events

- **Auto-charge success**: Triggered when 90% of current PayG traffic is used and another GB is automatically charged.
- **Auto-charge failed**: Triggered when a PayG auto-charge fails.
- **Cancellation success**: Triggered when PayG automatic payments are successfully turned off.

### Account Events

- **Account blocked**: Triggered when an account is suspended.

Note: Webhooks are global across all proxy types — you cannot configure separate webhook destinations per proxy product. Additionally, the Web Scraping API's asynchronous mode supports a `callback_url` parameter for receiving per-request scraping result notifications, which is separate from the account-level webhooks.
