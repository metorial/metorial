Now let me get the full list of supported engines from their search engines page:# Slates Specification for SerpApi

## Overview

SerpApi is a real-time search engine results page (SERP) scraping API that extracts structured JSON data from 100+ search engines and platforms, including Google, Bing, DuckDuckGo, Yahoo, Yandex, Baidu, Amazon, YouTube, and more. It handles proxies, CAPTCHA solving, and HTML parsing, returning clean, structured search result data.

## Authentication

SerpApi uses **API key** authentication. Each account is assigned a private API key, accessible from the account dashboard under **Your Account > API key**.

The API key is passed as a query parameter (`api_key`) on each GET request:

```
https://serpapi.com/search?engine=google&q=coffee&api_key=YOUR_API_KEY
```

There are no OAuth flows, scopes, or additional credentials required. A single API key is sufficient for accessing all SerpApi endpoints.

## Features

### Web Search

Query search engines (Google, Bing, DuckDuckGo, Yahoo, Yandex, Baidu, Naver) and receive structured results including organic results, answer boxes, knowledge graphs, featured snippets, related questions, and related searches.

- **Parameters**: query (`q`), search engine (`engine`), location, language (`hl`), country (`gl`), device type (desktop/tablet/mobile), Google domain.
- Results include rich structured data such as links, addresses, ratings, reviews, thumbnails, prices, and rich snippets.

### Image Search

Search for images across Google Images, Bing Images, Yahoo Images, and Yandex Images. Returns image titles, thumbnails, source URLs, and related content.

- Supports Google Lens and Google Reverse Image search for visual lookups.

### News Search

Retrieve news results from Google News, Bing News, DuckDuckGo News, Baidu News, and Naver News.

### Video Search

Search for videos via Google Videos, YouTube Search, Bing Videos, DuckDuckGo, and Yahoo Videos. YouTube-specific features include channel results, playlist results, shorts, and video transcript retrieval.

### Shopping and E-commerce

Search product listings across Google Shopping, Amazon, Walmart, eBay, and The Home Depot. Returns product details, pricing, ratings, reviews, and seller information. Supports individual product detail and product review lookups for Amazon, Walmart, eBay, and Home Depot.

### Maps and Local

Query Google Maps for local business data, place details, directions, photos, posts, and reviews. Also supports Google Local results, Google Local Services, and Yelp search (including place details and reviews).

### Travel

Search Google Flights for flight options, booking details, and price insights. Search Google Hotels for property listings, details, reviews, and photos. Access Google Travel Explore for destination and flight discovery. Retrieve Tripadvisor search results and place details. Access OpenTable restaurant reviews.

### Scholarly and Patent Research

Query Google Scholar for academic papers, citations, author profiles, and citation data. Search Google Patents for patent filings and details.

### AI and Generative Search

Access Google AI Mode and Google AI Overview results for AI-generated search answers. Query Bing Copilot and Naver AI Overview for AI-assisted search results.

### Trends, Finance, and Autocomplete

Retrieve Google Trends data including interest over time, interest by region, related queries, and trending topics. Access Google Finance for stock and market data. Use Google Autocomplete for search query suggestions.

### Jobs and Events

Search Google Jobs for job listings and individual job details. Query Google Events for events, concerts, and performances.

### App Stores

Search Google Play Store (apps, games, books, movies) and Apple App Store for app listings, product details, and reviews.

### Social and Profile Data

Retrieve Facebook profile data via the Facebook Profile API.

### Google Ads Transparency

Access the Google Ads Transparency Center to view advertiser ad creatives and details.

### Account Management

Check account information including current plan, monthly usage, remaining searches, and hourly throughput via the Account API. This is free and does not count toward search quota.

### Search Archive

Retrieve previously executed search results from the SerpApi search archive using the search ID, without consuming additional search credits.

### Locations API

Query a list of supported Google locations for use with the `location` parameter to simulate geographically targeted searches.

### Output Customization

- Results can be returned as structured JSON or raw HTML.
- The **JSON Restrictor** feature allows limiting response fields for smaller, faster payloads.
- Device emulation supports desktop, tablet, and mobile results.
- A `no_cache` parameter forces fresh results instead of serving cached ones.

## Events

The provider does not support events. SerpApi is a synchronous, request-response API with no webhooks, callbacks, or event subscription mechanisms.
