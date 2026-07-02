# Slates Specification for Zenserp

## Overview

Zenserp is a SERP (Search Engine Results Page) scraping API that extracts structured search results from Google, Bing, Yandex, and DuckDuckGo in real time. It enables developers to retrieve structured search engine data in a variety of formats, including JSON, CSV, and HTML. It scrapes areas such as Google Images, Google Videos, Google Maps, and Google Trends.

## Authentication

Zenserp uses API key-based authentication. To access the Zenserp API, you need to sign up for an account and obtain an API key.

The API key is passed as a header in every request:

```
apikey: YOUR_API_KEY
```

The base URL for API requests is `https://app.zenserp.com/api/v2/search` (for search) and `https://app.zenserp.com/api/v1/` for other endpoints like trends and shopping details.

Authentication is done by including the API key in the header, and both GET and POST requests are supported.

A `/status` endpoint is available to check the number of remaining requests on your subscription.

## Features

### Web Search (Google, Bing, Yandex, DuckDuckGo)

Scrape organic and paid search results from multiple search engines. The SERP API returns more than organic and paid results — it covers all snippet types and consistently adds new ones as they are added by search engines. Results include organic rankings, ads, "People also ask" boxes, answer boxes, knowledge panels, and more.

- **Parameters:** Query (`q`), search engine (`search_engine`), location, language (`hl`), country (`gl`), number of results (`num`).
- You can geotarget your search by adding a location, or by adding coordinates (`lat`/`lng`) to your request.

### Image Search

Search Google Images with support for filtering by size, color, type, and other standard Google image filters. You can retrieve up to 300 image results per search query, as pagination is supported for the image search endpoint.

- **Parameters:** Set `tbm=isch` to enable image search. Supports `tbs` filter parameters for image type, size, and color.

### Reverse Image Search

Track where and how your images appear online using reverse image search. Useful for brand monitoring, copyright compliance, and content tracking.

- An image search requires the image to be publicly available through a URL.
- Supports pagination.

### News Search

Retrieve Google News results for any query, including inline news thumbnails, descriptions, and target URLs.

- **Parameters:** Set `tbm=nws` for news results. Supports geotargeting and language filtering.

### Shopping Search

Retrieve a shopping SERP for a query of your choice. All returned product IDs can be used to scrape individual product details in a second step.

- **Parameters:** Set `tbm=shop` for shopping results. Supports location and language filtering.
- Product detail lookups are done via a separate `/shopping` endpoint using `product_id`.

### Maps / Local Search

Geotargeted searches enable you to check a business's ranking at a certain location. Scrape every single business for a given search query by iterating over coordinate sets.

- **Parameters:** Set `tbm=lcl` for local results. Supports location names or precise lat/lng coordinates.
- The response always contains the `place_id` for every returned local business.

### YouTube Search

Get video ranking information, including channel and ad results.

- **Parameters:** Set the search engine and type parameters to target YouTube results.

### Google Trends

Scrape the search popularity of keywords and search phrases in real time. Features include:

- Search popularity of a phrase over a specified time period (with averages), geographic popularity breakdown, related search phrases, and related topics.
- **Parameters:** `keyword[]`, `timeframe`, `cat` (category), `type`. Supports boolean operators for combining keywords.

### Keyword Search Volume & CPC

Available on higher-tier plans. Retrieve keyword search volume and cost-per-click data alongside SERP results.

### Account Status

Check the number of remaining requests per your subscription limits via the `/status` endpoint.

## Events

The provider does not support events. Zenserp is a request-response API for scraping search engine results and does not offer webhooks, event subscriptions, or built-in polling mechanisms.
