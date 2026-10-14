# Zenserp Integration Specification

## Overview

Zenserp retrieves structured search results from Google, Bing, Yandex, DuckDuckGo, and YouTube. This integration returns JSON search data, shopping product details, current Google trends, and request quota.

## Authentication

Zenserp uses API key-based authentication. To access the Zenserp API, you need to sign up for an account and obtain an API key.

The API key is passed as a header in every request:

```
apikey: YOUR_API_KEY
```

Search and account status use `/api/v2/search` and `/api/v2/status` on `https://app.zenserp.com`. Trends and shopping product details use `/api/v1/trends` and `/api/v1/shopping`.

Authentication is done by including the API key in the header, and both GET and POST requests are supported.

A `/api/v2/status` endpoint is available to check the number of remaining requests on your subscription. The integration authenticates via the `apikey` header and reports validation and provider failures as actionable errors.

## Features

### Web Search (Google, Bing, Yandex, DuckDuckGo)

Scrape organic and paid search results from multiple search engines. The SERP API returns more than organic and paid results — it covers all snippet types and consistently adds new ones as they are added by search engines. Results include organic rankings, ads, "People also ask" boxes, answer boxes, knowledge panels, and more.

- Engine choices map to provider domains such as `bing.com` and `yandex.com`.
- Google uses `num` and `start`; Bing uses `count` (1–50) and `first`, with country `cc` and paired `lat`/`lon` coordinates. Yandex maps result count and language to `numdoc` and `lang` and does not accept the integration's result-offset pagination.
- Use a location name for Google, Yandex, and DuckDuckGo web searches. Provider filter support varies by engine.

### Image Search

Search Google Images with support for filtering by size, color, type, and other standard Google image filters. You can retrieve up to 300 image results per search query, as pagination is supported for the image search endpoint.

- **Parameters:** Set `tbm=isch` to enable image search. Supports `tbs` filter parameters for image type, size, and color.
- Use the optional `page` input (`ijn`) for pagination, with page 2 requesting images 101–200. The result-offset `start` is retained for compatibility but is currently unsupported; omit it or use 0.

### Reverse Image Search

Track where and how your images appear online using reverse image search. Useful for brand monitoring, copyright compliance, and content tracking.

- An image search requires the image to be publicly available through a URL.
- Results come from `reverse_image_results.organic`, with the raw provider response preserved. The current developer documentation says result-offset `start` is unsupported; omit it or use 0.

### News Search

Retrieve Google News results for any query, including inline news thumbnails, descriptions, and target URLs.

- **Parameters:** Set `tbm=nws` for news results. Supports geotargeting and language filtering.

### Shopping Search

Retrieve a shopping SERP for a query of your choice. All returned product IDs can be used to scrape individual product details in a second step.

- **Parameters:** Set `tbm=shop` for shopping results. Supports location and language filtering.
- Product detail lookups are done via a separate `/shopping` endpoint using `product_id`.
- The optional `productClusterId` passes `gpc_id`; obtain both IDs from the same result row. Shopping result-offset pagination is currently unsupported.

### Maps / Local Search

Geotargeted searches enable you to check a business's ranking at a certain location. Scrape every single business for a given search query by iterating over coordinate sets.

- Location names use `tbm=lcl`. Paired coordinates use `tbm=map` and the required `ll=@latitude,longitude,15z` parameter. Google Place IDs and other provider fields remain available in the response.
- Maps result-offset pagination is currently unsupported.

### YouTube Search

Get video ranking information, including channel and ad results.

- `youtube_search` sets `search_engine=youtube.com`, accepts `hl` and `gl`, and uses the provider's `sp` token for pagination and filters.

### Google Trends

The current developer documentation states that `/api/v1/trends` now returns **Trending now**, rather than historical keyword interest reports. Responses preserve the provider's trend details and notices.

- `google_trends` retains its legacy fields and enum values. Keywords filter current trend queries and related queries, repeated as `keyword[]`; country is sent as `geo`. Historical timeframes and legacy `trendsType` reports return an actionable error rather than pretending to return historical popularity.
- Supported recent windows are `now 1-H`, `now 4-H`, `now 1-d`, and `now 7-d`.
- `trending_searches` calls `/api/v1/trends/trending` without keyword filtering and accepts optional country, language, and category.

### Account Status

Check the number of remaining requests via `/api/v2/status`. This endpoint does not expose a user identity, so no separate identity tool is available.

## Provider Documentation

- [Developer documentation](https://app.zenserp.com/documentation)
- [Official API collection](https://www.postman.com/apilayer/apilayer/documentation/10131015-a3d63243-081e-4961-a2f0-39c7a9394b8d)
- [YouTube search](https://zenserp.com/youtube-search-api/)
- [Image search](https://zenserp.com/google-image-search-api/)

Some older marketing examples describe historical Trends reports and reverse-image offset pagination. This integration follows the current developer documentation; those API behaviors have not been verified with live credentials.

## Events

This integration exposes request-response tools and no events.
