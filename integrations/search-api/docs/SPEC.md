# Slates Specification for Search api

## Overview

SearchApi (searchapi.io) is a real-time SERP (Search Engine Results Page) scraping service that returns structured JSON data from multiple search engines including Google, Bing, Baidu, Yahoo, Yandex, DuckDuckGo, and others. The platform delivers structured JSON from Google, Bing, Baidu, Yahoo, and other major engines. It handles proxy management, CAPTCHA solving, and JavaScript rendering behind the scenes.

## Authentication

SearchApi uses **API key** authentication. Use it as a query parameter (`https://www.searchapi.io/api/v1/search?api_key=YOUR_API_KEY`) or in the Authorization header (`Bearer YOUR_API_KEY`).

- The API key is obtained by signing up at searchapi.io.
- No OAuth or other authentication methods are supported.
- The API key is used across all endpoints (search, locations, search history, account).

## Features

### Multi-Engine Web Search

Perform real-time searches across many search engines by specifying the `engine` parameter. The Google Search API provides data including organic search results, paid search results, knowledge graph entries, local map listings, featured snippets, and related search queries. Supported engines include Google (standard and light), Bing, Baidu, Yahoo, Yandex, DuckDuckGo, and Naver. Results are returned as structured JSON with organic results, ads, knowledge graphs, "People Also Ask" sections, and more.

- **Localization**: Searches can be localized by geographic location, language (`hl`), country (`gl`), and search domain. You can track keywords for specific locations, devices, and languages.
- **Device targeting**: Results can be requested for desktop or mobile.
- **SafeSearch**: Configurable content filtering (active, blur, off).

### Google Vertical Search Engines

SearchApi supports specialized Google verticals including:

- **Google Images, Videos, Shorts** — media search results
- **Google News** — real-time news scraping with historical article search using time range filters, access to top stories and headlines.
- **Google Shopping** — product listings, offers, reviews, and product details
- **Google Maps / Local** — local business search results with location data
- **Google Scholar** — academic paper results
- **Google Trends** — trending topics and interest-over-time data
- **Google Flights / Hotels** — travel search results and fare calendars
- **Google Jobs, Events, Finance, Patents** — specialized result types
- **Google Autocomplete** — search suggestion completions
- **Google Lens** — visual/image-based search
- **Google AI Overview / AI Mode** — Google's AI-generated summaries directly from search results.
- **Google Ads Transparency** — track ads, see where they appear, and learn more about advertisers.

### Non-Google Search Engines and Platforms

SearchApi also supports scraping results from platforms beyond traditional search engines:

- **YouTube Search** — video search results
- **Amazon, Walmart, Shein, eBay Search** — e-commerce product listings
- **Apple App Store, Google Play** — app store search results
- **Airbnb, Tripadvisor** — travel/accommodation listings
- **Ad libraries**: Meta Ad Library, LinkedIn Ad Library, Reddit Ad Library, TikTok Ads Library
- **Social profiles**: TikTok Profile, Instagram Profile, Facebook Business Page

### Google Rank Tracking

A dedicated engine for SEO rank tracking, supporting up to 100 results per query for monitoring keyword positions over time.

### Geo-Targeting with Locations API

Retrieves the top 10 largest locations matching a given term, returning canonical names that can be used as the `location` parameter in search queries. Returns metadata including coordinates, country codes, and population reach.

### Search History

Retrieves past searches from your account history, with pagination via `next_page_token`. Each entry includes the engine used, parameters, status, and links to the cached HTML/JSON responses.

### Account Information

Provides general account usage data including total searches performed this month, maximum allowable searches per month, and remaining search credits.

### Zero Retention Mode

Setting `zero_retention` to true disables all logging and persistent storage. No request parameters, HTML, or JSON responses are stored or logged, suitable for high-compliance use cases. This is an Enterprise-only feature.

## Events

The provider does not support events. SearchApi is a request-response API for real-time search data retrieval and does not offer webhooks, event subscriptions, or any push-based notification mechanism.
