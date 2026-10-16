# Short.io integration

This integration manages branded short links, folders, previews, and analytics through the official Short.io API.

## Authentication and discovery

Use a secret API key from **Integrations & API → API** in the Short.io dashboard. Requests send that key in the `Authorization` header. No OAuth refresh flow is needed. The optional connection defaults are a domain hostname and numeric domain ID; neither is required at setup. Call `list_domains` to discover hostnames and IDs and `list_folders` to discover folder IDs.

## Tools and API routes

| Tool | Official route and behavior |
| --- | --- |
| `create_link` | `POST /links`; create or reuse a link, with optional custom path, targeting, expiration, password, tags, campaign parameters, folder, and split testing. |
| `update_link` | `POST /links/{linkId}`; update existing settings. Legacy numeric IDs can use the optional domain ID. |
| `delete_link` | `DELETE /links/{link_id}`; permanently remove a link. |
| `get_link` | `GET /links/{linkId}`, `/links/expand`, or the legacy `/links/by-original-url`; preserves the existing single-link lookup result. |
| `list_links` | `GET /api/links`; domain-scoped pagination with up to 150 links, page tokens, date filters, and folder filtering. |
| `list_domains` | `GET /api/domains`; domain discovery with limit/offset pagination and optional hostname/team filters. |
| `get_link_statistics` | `GET https://statistics.short.io/statistics/link/{linkId}`; existing numeric summaries and breakdown maps plus the complete provider statistics. |
| `get_domain_statistics` | `GET https://statistics.short.io/statistics/domain/{domainId}`; maps provider `clicks` to the existing `totalClicks` field. |
| `generate_qr_code` | `POST /links/qr/{linkIdString}`; downloadable PNG/SVG and the existing PNG data URI or SVG output. Explicit colors or size override domain settings unless requested otherwise. |
| `archive_link` | `POST /links/archive` or `/links/unarchive`; hide/show a link in the dashboard. **Redirects remain active.** |
| `create_folder` | `POST /links/folders`; create a folder with optional QR colors, path prefix, and campaign defaults. |
| `list_folders` | `GET /links/folders/{domainId}`; discover the domain’s folders and settings. |
| `get_domain` | `GET /domains/{domainId}`; retrieve complete domain settings. |
| `find_links_by_original_url` | `GET /links/multiple-by-url`; return all matching links using the current endpoint. |
| `create_links_bulk` | `POST /links/bulk`; create 1–1,000 links on a domain. Results preserve per-item errors and successes; this operation is not transactional. |
| `get_link_preview` | `GET /links/opengraph/{domainId}/{linkId}`; retrieve complete preview properties. |
| `update_link_preview` | `PUT /links/opengraph/{domainId}/{linkId}`; send documented property/value pairs for Open Graph and Twitter previews. |

## Analytics and limits

Statistics periods remain `today`, `yesterday`, `total`, `week`, `month`, `lastmonth`, `last7`, `last30`, and `custom`. For a custom period, supply both dates as ISO dates or milliseconds since epoch, with the start before the end. Prefer the `tz` timezone name; `tzOffset` remains a legacy numeric offset in minutes. The older official all-time example uses explicit null interval bounds. Only that paired-null `total` response is represented by empty strings in the existing required string fields; `raw` preserves the nulls. Missing/malformed click counts or interval bounds otherwise raise an error rather than becoming zero or an invented timestamp.

Create-link rate limit: 50 requests/second. Update, get-by-ID/path, and delete rate limit: 20 requests/second. Bulk creation rate limit: 5 requests per 10 seconds. QR size is from 1 to 99 and color values contain 6–8 hexadecimal characters. Provider errors and unsuccessful delete/archive responses are reported as user-facing errors.

## Coverage and boundaries

The integration contains 17 tools and no triggers. It does not expose domain administration, team permissions, country/region targeting, raw clickstream, statistics deletion, or conversion tracking. No suitable current-user endpoint is documented in the official API index, so no identity endpoint is assumed.

## Official references

- [API index](https://developers.short.io/llms.txt)
- [API reference](https://docs.short.io/api-reference)
- [Create link](https://developers.short.io/reference/post_links)
- [Link statistics](https://developers.short.io/reference/getlinklinkid)
- [Domain statistics](https://developers.short.io/reference/getdomaindomainid)
- [Archive behavior](https://developers.short.io/docs/archiving-a-short-url)
- [Bulk creation](https://developers.short.io/reference/post_links-bulk)
- [QR generation](https://developers.short.io/reference/post_links-qr-linkidstring)
