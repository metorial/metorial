# Slates Specification for Serpdog

## Overview

Serpdog is a SERP (Search Engine Results Page) scraping and web data extraction API. It provides a scalable data extraction API that allows scraping search engine results and collecting data in bulk from platforms like LinkedIn. All REST API calls return JSON or HTML results.

## Authentication

Serpdog uses API key authentication. The `api_key` parameter is required on every request. The API key is passed as a query parameter in GET requests.

Example:

```
GET https://api.serpdog.io/search?api_key=YOUR_API_KEY&q=coffee&gl=us
```

There is no OAuth flow, no bearer token, and no header-based authentication. The API key is obtained by signing up on Serpdog's website. All API endpoints use the same `api_key` query parameter for authentication.

## Features

### Google Search Scraping

Scrape Google Search results from any country in both JSON and HTML format. All featured snippets are supported. Includes knowledge graphs, People Also Ask, and answer boxes. Configurable by country (`gl`), language (`hl`), number of results (`num`), and location. A "lite" search variant is also available for lighter-weight results.

### Google Maps Data Extraction

Extract location-based data from Google Maps including geocoding and mapping functionalities. Supports searching by query and geographic coordinates (`ll` parameter). Also includes dedicated sub-APIs for Google Maps posts, photos, and reviews.

### Google News Scraping

Access real-time Google News data from over a thousand sources. Configurable by query, country, and language.

### Google Shopping and Product Data

Extract Google Shopping results for research and price tracking. A separate Google Product API extracts detailed product information including online sellers and product reviews using a product ID. Supports time-based filtering (`d/w/m/y`).

### Google Scholar

Extract JSON data of Google Scholar results consisting of title, link, snippets, and more. Supports filtering by year range, cited-by lookups, and abstract-only results. A separate Google Scholar Author Profile API extracts author details, articles, and co-authors.

### Google Images and Videos

Scrape Google Images and Google Videos search results, configurable by query, country, and language.

### Google Finance

Extract financial data from Google Finance search results.

### Google Autocomplete

Retrieve Google Autocomplete suggestions for a given query.

### Google Jobs

Scrape job postings from Google Search results. Supports filtering by location, radius, and query chips (filters found at the top of job search pages).

### YouTube Search

Extract data from YouTube in real-time. Configurable by query and country.

### Bing Search

Scrape Bing search results in real-time with country and language configuration.

### Amazon Data Extraction

Extract data from Amazon in real time. Supports Amazon search results and product pages. A premium proxy option is available for improved success on difficult pages. Sponsored results can optionally be excluded.

### Walmart Scraping

Extract product data from Walmart search results and product pages.

### Yelp Search

Scrape Yelp Search Results in real-time. Requires a location parameter (`find_loc`) and supports a search query (`find_desc`).

### LinkedIn Jobs

Extract LinkedIn job listing data.

### Web Scraping (Generic)

Scrape any website with a general-purpose web scraping API that handles blockages and CAPTCHAs internally. Key options include:

- **JavaScript rendering**: Optionally render pages using a headless browser (`render_js`).
- **Wait parameter**: Wait for heavy pages to fully load (up to 35,000ms).
- **Premium proxies**: Use premium proxies from specific countries for difficult-to-scrape websites.
- Supports country codes in ISO 3166-1 format for geo-targeted proxies.

### Account Information

Retrieve account information including email address, plan name, quota, and number of requests remaining.

## Events

The provider does not support events. Serpdog is a request-response API for data extraction and does not offer webhooks, event subscriptions, or any purpose-built polling mechanism.
