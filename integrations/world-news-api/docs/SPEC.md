# World News API

The integration connects to `https://api.worldnewsapi.com` using the documented `x-api-key` header. The API key belongs to authentication; connection configuration is empty. No OAuth refresh, account profile, webhook, or account usage endpoint is documented in the endpoint catalog.

| Tool | API and behavior |
| --- | --- |
| `search_news` | `GET /search-news`; documented search filters, offset and result count. Requires a filter. |
| `top_news` | `GET /top-news`; country, language, optional date and headlines-only mode. The article limit per cluster is applied after retrieval. |
| `retrieve_articles` | `GET /retrieve-news`; comma-separated article IDs. |
| `extract_news` | `GET /extract-news`; URL and optional analysis. Image titles map to captions when a caption is absent. |
| `extract_news_links` | `GET /extract-news-links`; URL. Optional prefix and subdomain exclusion are applied to returned links. |
| `search_news_sources` | `GET /search-news-sources`; full or partial source name. |
| `newspaper_front_page` | `GET /retrieve-front-page`; optional country, publication identifier and date. Returns the original image URL and prepares an image download. |
| `geo_coordinates` | `GET /geo-coordinates`; location name. |
| `website_to_rss` | Prepares an authenticated `GET /feed.rss` download, with URL and optional `extract-news`. Downloading requests current data and consumes API quota. |

Article content stays in structured output. Missing required data produces a service error rather than fabricated empty values. The Top News and extraction tools include the original provider response with credentials removed so omitted fields remain distinguishable from actual null values. Existing nullable fields preserve null. Full article text, summaries, media URLs, and author arrays are not truncated or coerced. A provider null that cannot fit an established required scalar or array element produces a service error.

Responses expose optional quota metadata from `X-API-Quota-Request`, `X-API-Quota-Used`, and `X-API-Quota-Left`. Missing headers do not imply zero. Daily usage resets at midnight UTC. RSS preparation does not fetch the feed or claim generation or download completion. Front page preparation retrieves metadata and registers the image download; delivery is verified only when the file is downloaded.

The provider documents no expiration for the front page images or stable RSS endpoint. No expiration time or renewal operation is inferred. Account credentials are excluded from public results and messages; unrelated provider-issued scoped download signatures retain their original meaning.

Official references: [endpoint catalog](https://worldnewsapi.com/docs/), [authentication](https://worldnewsapi.com/docs/authentication/), [quota headers](https://worldnewsapi.com/docs/quotas-and-rate-limiting/), [OpenAPI](https://raw.githubusercontent.com/ddsky/world-news-api-clients/main/world-news-api-openapi-3.json), [RSS feeds](https://worldnewsapi.com/docs/website-to-rss-feed/), [front pages](https://worldnewsapi.com/docs/newspaper-front-pages/).
