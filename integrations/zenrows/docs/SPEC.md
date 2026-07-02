Now let me check the specific API features documentation more thoroughly:# Slates Specification for ZenRows

## Overview

ZenRows is a web scraping toolkit that provides APIs for extracting data from public websites. It offers three core products: the Universal Scraper API (single API for all web scraping needs), Scraping Browser (cloud infrastructure for Puppeteer and Playwright with built-in anti-bot bypassing), and Residential Proxies (55M+ premium IPs with geotargeting that integrate with your existing scraping tools). It also provides industry-specific Scraper APIs for structured data extraction from platforms like Amazon, Walmart, Zillow, and Idealista.

## Authentication

ZenRows uses API key authentication. The API key is your unique key to authenticate requests. Your API Key functions as both an authentication tool and an identifier for all your requests. Without it, you won't be able to access ZenRows' features or receive any scraped data. You can easily create your API Key by signing up for an account.

The API key is passed as a query parameter named `apikey` in every request:

```
GET https://api.zenrows.com/v1/?apikey=YOUR_ZENROWS_API_KEY&url=https://example.com
```

ZenRows accommodates three connection methods: API Mode (pass your API key and URL as query parameters), Proxy Mode (use ZenRows as a proxy within your existing scraping setup, integrating residential, datacenter, and rotating proxies), and SDK (dedicated SDKs for Python and Node.js).

For Proxy Mode, authentication is done via standard HTTP proxy authentication using the API key as credentials.

For the industry-specific Scraper APIs, the same API key is used but requests are sent to a different base URL (e.g., `https://ecommerce.api.zenrows.com/v1/`).

## Features

### Universal Web Scraping

The Universal Scraper API is a tool designed to simplify and enhance the process of extracting data from websites. Whether you're dealing with static or dynamic content, the API provides a range of features to meet scraping needs efficiently. You provide a target URL and receive the page content in return.

- **JavaScript Rendering**: Render JavaScript on web pages using a headless browser to scrape dynamic content that traditional methods might miss. Enabled via the `js_render` parameter.
- **Premium Proxies**: Some websites implement strict anti-scraping measures that block standard datacenter IPs. Premium Proxies use residential IPs sourced directly from ISPs, which are harder for sites to detect and block. Enabled via the `premium_proxy` parameter.
- **Geolocation Targeting**: Content can be region-restricted. Geolocation allows you to choose the country from which the request is made. ZenRows supports over 190+ countries. Enabled via the `proxy_country` parameter along with `premium_proxy=true`.
- **Anti-Bot Bypass**: The API is designed to overcome Cloudflare protection and other anti-bot systems like DataDome and PerimeterX automatically.
- **Session Management**: Send a session ID number to use the same IP for each API request for up to 10 minutes.
- **Device Emulation**: Use either desktop or mobile user agents in the headers. Default is "desktop".
- **CSS Extraction**: Define CSS selectors to extract specific data from pages (e.g., `{"links": "a @href"}`).
- **Auto-parsing**: Automatically extract structured content from any website without manual selector configuration.
- **Output Formats**: Responses can be returned as Markdown, plain text, or PDF. JSON output is also available.
- **Screenshots**: Capture page screenshots in PNG or JPEG format.
- **Wait Conditions**: Wait for a given CSS selector to load in the DOM before returning content, or specify a fixed wait time.
- **Custom Headers**: Allows the addition of custom HTTP headers to mimic specific browser behaviors or set cookies.
- **CAPTCHA Solving**: Built-in CAPTCHA bypass for seamless data extraction.
- **JavaScript Instructions**: You can interact with the page using JavaScript instructions, designed for simple interactions such as clicking buttons, filling forms, and basic navigation. Not suited for complex or heavy interactions.
- Supports GET, POST, and PUT HTTP methods to the target URL.

### Scraping Browser

The Scraping Browser integrates seamlessly with Puppeteer and Playwright, making it the ideal solution for users already working with those tools. It leverages ZenRows' residential proxy network and browser simulation to scrape dynamic websites, handle user interactions, and avoid IP blocks.

- Effectively scrapes JavaScript-heavy websites, including single-page applications, by simulating real user sessions. Simulates user actions like clicking, scrolling, or waiting for elements to load.
- Drop-in replacement for existing Puppeteer/Playwright setups.
- Best suited for complex interactions that the Universal Scraper API cannot handle.

### Residential Proxies

ZenRows' Residential Proxies provide access to a global network of over 55 million IPs across 190+ countries. With features like IP auto-rotation and geo-targeting, they are perfect for scraping geo-restricted content and maintaining high performance while staying undetected.

- Can be used as standalone proxies with your own scraping infrastructure.
- Supports geo-targeting by country.

### Industry-Specific Scraper APIs

ZenRows offers Scraper APIs, a specialized tool for seamless data extraction from major e-commerce platforms and real estate websites. Designed for precision and performance, this API provides direct access to structured data.

- **E-Commerce**: Extract data from popular e-commerce sites like Amazon and Walmart. Supports product information, product reviews, and search/discovery queries.
- **Real Estate**: Extract structured data from Zillow and Idealista, including property listings.
- **SERP**: Google search result scraping.
- Geolocation support via the `country` parameter to access localized data for specific regions.
- Output available in JSON and CSV formats.

## Events

The provider does not support events. ZenRows is a request-response API for web scraping and does not offer webhooks or event subscription mechanisms.
