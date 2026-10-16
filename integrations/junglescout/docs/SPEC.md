# Jungle Scout API specification

Jungle Scout exposes six read-only Amazon research endpoints at `https://developer.junglescout.com`. The integration covers all six without querying Seller Central or modifying Amazon listings.

## Authentication and marketplace

Connect a key name and API key from the provider's Developer settings. The `Authorization` header contains `KEY_NAME:API_KEY`. Requests also send `X-API-Type: junglescout` or `cobalt`, `Accept: application/vnd.junglescout.v1+json`, and `Content-Type: application/vnd.api+json`. Every request includes a configured, authorized marketplace: `us`, `uk`, `de`, `in`, `ca`, `fr`, `it`, `es`, `mx`, or `jp`. This API key flow has no OAuth refresh lifecycle.

## Capabilities

| Tool | Provider endpoint | Behavior |
| --- | --- | --- |
| `keywords_by_asin` | `POST /api/keywords/keywords_by_asin_query` | Up to ten ASINs; search-volume and competition filters; keyword metrics, primary-ASIN and competitor ranking data. |
| `keywords_by_keyword` | `POST /api/keywords/keywords_by_keyword_query` | Seed terms, category and volume filters; keyword relevance, promotions, and competition data. |
| `historical_search_volume` | `GET /api/keywords/historical_search_volume` | Weekly periods with start/end dates and exact search volume. |
| `search_product_database` | `POST /api/product_database_query` | Product filters including update-date bounds; prices, sales, rank, weight, fees, and listing quality. |
| `sales_estimates` | `GET /api/sales_estimates_query` | Daily sales and price data, parent/variant relationships, and product structure flags. |
| `share_of_voice` | `GET /api/share_of_voice` | Brand organic/sponsored/combined visibility, keyword bid/volume, and top-product clicks/conversions. |

The two keyword searches and product database use `page[size]` (maximum 100) and `page[cursor]`. `nextPageCursor` comes from `links.next`; retain the same query filters and body when requesting another page. The other endpoints return their time series or complete analysis directly.

Historical date ranges must use calendar dates in `YYYY-MM-DD` format, with the start before the end and a maximum span of 366 days. Sales estimate end dates must precede the current UTC date. Variant sales estimates represent the aggregate parent sales. Product update bounds also use `YYYY-MM-DD`.

All existing tool keys, input JSON types, enum members, optionalness, and normalized output fields are retained. Additions are optional. Every tool additionally returns its complete provider response as `raw`, preserving native attributes and metadata. Missing optional metrics remain null, never zero. Required resource identifiers, names, and dates are validated instead of inventing empty values. Product `asin` contains the bare ASIN; additive `id` preserves the marketplace-qualified resource identifier. Share-of-voice values are provider fractions, and bid values use marketplace currency.

## Documentation discrepancies

The official OpenAPI request schema types `search_terms` as an array of strings, while its example and the Help Center show one scalar string. The existing array input and schema-backed wire format are retained; actual provider acceptance has not been verified. The historical Help Center's generic pagination text conflicts with the endpoint schema and dedicated pagination guide; no unsupported pagination parameters are added to the historical endpoint.

Product database listing-quality response examples use values such as 64, while request filter documentation uses a 1–10 scale. Returned scores are preserved without rescaling; the filter remains provider-defined.

The published endpoint catalog exposes no suitable account/profile endpoint, write lifecycle, webhook registration, or file output. No identity or trigger tool is fabricated.

## Official references

- [API overview, auth, pagination, errors](https://developer.junglescout.com/api)
- [Version 1 OpenAPI schema](https://developer.junglescout.com/api-docs/v1/swagger.json)
- [Keywords by ASIN](https://support.junglescout.com/hc/en-us/articles/21534097722391-Use-Cases-for-Keyword-by-ASIN-Endpoint)
- [Keywords by keyword](https://support.junglescout.com/hc/en-us/articles/21534098073879-Use-Cases-for-Keyword-by-Keyword-Endpoint)
- [Product database](https://support.junglescout.com/hc/en-us/articles/21534081093783-Use-Cases-for-Product-Database-Endpoint)
- [Historical search volume](https://support.junglescout.com/hc/en-us/articles/21534072937623-Use-Cases-for-Historical-Search-Volume-Endpoint)
- [Sales estimates](https://support.junglescout.com/hc/en-us/articles/21534073571607-Use-Cases-for-Sales-Estimates-Endpoint)
- [Share of voice](https://support.junglescout.com/hc/en-us/articles/21534065411351-Use-Cases-for-Share-of-Voice-Endpoint)
