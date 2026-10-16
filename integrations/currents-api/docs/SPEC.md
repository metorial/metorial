# Currents API Specification

## Authentication

Connect with the API key from the Currents dashboard. The integration sends the
stored key in the `Authorization` header; Currents accepts either the bare key or
`Bearer <key>`. API keys have no documented OAuth refresh or invented expiry.
`check_api_key` calls the documented `/v1/auth` token-check endpoint and returns its
original response. This is a key-validity check, not an account identity endpoint.
No suitable user/profile/self endpoint is documented.

## Tool coverage

| Tool | Provider operation | Behavior |
| --- | --- | --- |
| `list_latest_news` | `GET /v1/latest-news` | Latest feed; language, country, legacy category, type, domain, excluded domain, author, and pagination filters |
| `search_news` | `GET /v1/search` | Existing keyword/date/type/domain/page filters plus boolean query, author, image/description presence, result limit, and complete raw response |
| `search_news_v2` | `GET /v2/search` | Canonical V2 taxonomy, cursor and offset pagination, search/date/publisher/metadata filters; original article and response fields |
| `get_available_filters` | `GET /v1/available/*` or `/v2/available/*` | Language and region name-to-code maps and categories; optional version defaults to V1 |
| `check_api_key` | `GET /v1/auth` | Original token-check response; no guessed account or quota fields |
| `get_latest_news` | `GET /v1/latest-news` | Deprecated legacy handler retained with its original schema and request, including the keyword input |
| `get_news_sources` | `GET /v1/sources` | Unchanged legacy source-directory handler; current official docs/spec do not list the route |
| `get_source_news` | `GET /v1/source` | Unchanged legacy source-ID handler; current official docs/spec do not list the route |

The absence of the two legacy source routes from current documentation does not
establish their retirement. Their availability remains unverified. Supported
source-domain filtering is available in `list_latest_news` and the search tools.

## Compatibility and pagination

V1 remains supported and uses its legacy category names. Use
`get_available_filters` with `apiVersion: "v2"` before V2 searches, because the V2
canonical categories differ. Both versions are one news API product, so tools do
not need separate product categories.

Latest News explicitly rejects `keywords`, `query`, date ranges, `limit`, image and
description presence flags, and cursors. This positive incompatibility is why
`list_latest_news` replaces the old latest tool while its exact old handler and
input/output schemas remain registered. Topic searches use Search.

Page numbers range from 1 to 180 and page sizes have a hard maximum of 300;
account plans may apply smaller caps. Search offset requests where
`(page_number - 1) * page_size > 5000` are rejected. V2 search supports the opaque
`next_cursor` continuation token; pass it back unchanged with the same filters.
Date filters require RFC 3339 timestamps and plan-specific spans/history.
`keywords` takes precedence over `query` when both are provided.
Image and description filters are presence flags at the provider, so the
integration sends them only when the corresponding input is true.

Existing inputs retain their original types and legacy falsy omission behavior.
Legacy article summaries retain their historical empty-string/array/page defaults;
`search_news.raw` and both new news tools preserve the actual provider fields,
including nulls, source-category metadata, and timestamps. The new news tools do
not manufacture missing values. No existing output-requiredness exceptions apply.
Publisher and image URLs remain original provider data; the API does not provide
file-generation or download operations needing a different output mechanism.

Errors use the shared service-error adapter, preserving HTTP status, provider
codes, and `msg`/nested detail messages, including responses normalized by the HTTP
client. The integration also rejects provider error envelopes returned with a
successful HTTP status. No live provider requests were used for this refresh.

No current official API operation supports the previously advertised trend or
sentiment analysis; those capability claims have been removed. No webhook or
event-subscription operations are documented.

## Official references

- [Quick start and V1/V2 compatibility](https://currentsapi.services/en/docs/)
- [V1 OpenAPI specification](https://currentsapi.services/json/swagger.json)
- [Authentication and token check](https://currentsapi.services/en/docs/authentication)
- [Latest News filters and rejected search-only parameters](https://currentsapi.services/en/docs/latest_news)
- [Search, canonical taxonomy, and cursor pagination](https://currentsapi.services/en/docs/search)
- [Error responses](https://currentsapi.services/en/docs/errors)

Verified against the public references on 2026-10-15. Local schema/build checks
do not prove live acceptance, source-route availability, account-plan limits, or
production response shapes.
