# Search API Specification

SearchApi.io returns structured search results. Connect using an API key, which is sent in the documented Bearer authorization header. No additional connection settings or OAuth scopes are required.

## Tools

- `web_search`: Google, Google Light, Bing, Baidu, Yahoo, Yandex, DuckDuckGo, and Naver search. Localization, content filtering, date filtering, and pagination follow each engine's supported parameters. Bing and DuckDuckGo expose continuation tokens. Google currently returns 10 results per page regardless of `num`.
- `news_search`: Google News with location, recency, date-range, sorting, and page controls.
- `image_search`: Google Images with size, color, type, rights, and recency filters. Legacy size names map to current provider names; `10mp` retains its original forwarded value because the current documentation does not establish a compatible replacement; its current provider behavior is unverified.
- `video_search`: Google Videos with duration, quality, source, recency, and captions. Dailymotion, Twitch, and Vimeo use the documented `site:` query operator.
- `shopping_search`: Google Shopping with prices, condition, sale, delivery, and sorting controls.
- `scholar_search`: Google Scholar query, citation, or cluster lookup. Year filters cannot be combined with date sorting; at most 20 results are requested per page.
- `maps_search`: Google Maps businesses and places with coordinates and page controls.
- `trends_search`: Interest over time, regional interest, related queries, and related topics. Regional comparisons expose separate values for each term.
- `jobs_search`: Google Jobs with application links, highlights, and continuation tokens.
- `youtube_search`: YouTube videos with filtering and continuation tokens. A continuation token replaces the initial filter parameter when requesting the next page.
- `autocomplete`: Google suggestion text and type codes, represented as strings for compatibility.
- `lookup_locations`: Canonical location names and coordinates; accepts an optional limit of 1 to 100.
- `get_account`: Current account usage, remaining credits, hourly limits, and subscription period from `/api/v1/me`.
- `list_search_history`: Saved searches from the past 90 days with parameters, status, timing, and provider result links. Requires an active subscription; accepts date, engine, and continuation filters.

All tools preserve the complete JSON provider response in `raw`. Search-result media URLs and saved-result links remain provider links. These tools do not download media or promise permanent file availability.

## Errors and identity

Validation and provider failures return structured service errors. Provider error bodies and HTTP status are retained by the API error adapter. Invalid account or saved-search response structures fail explicitly rather than reporting invented usage or identifiers.

The account endpoint exposes usage rather than an email or provider user ID. Connection profiles use a hash of the API key as a local connection identifier and a generic account label; the API key itself is never used as a public profile identifier.

## Events

No webhook or polling triggers are registered. The integration is a read-only request-response search interface; search operations can consume provider credits.
