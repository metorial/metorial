# Similarweb Digital Rank API

This read-only integration uses Similarweb's documented REST ranking endpoints. Availability, countries, and historical date ranges depend on the account subscription.

## Authentication

An active API key is supplied as the `api_key` query parameter. Account admins generate API keys under Settings > Account > API > Standard API / Batch API. Empty keys are rejected before making requests. There is no OAuth flow or additional connection configuration.

## Tools and API contracts

| Tool | API request | Result |
| --- | --- | --- |
| `get_website_rank` with `rankType: global` | `GET /v1/website/{domain}/global-rank/global-rank` | Monthly `global_rank` entries, or the aggregated last 28 days when both dates are omitted. |
| `get_website_rank` with `rankType: country` | `GET /v1/website/{domain}/country-rank/country-rank` | `country_rank` entries for the required country; worldwide is unsupported. |
| `get_website_rank` with `rankType: category` | `GET /v1/website/{domain}/category-rank/category-rank` | Previous month's industry category and worldwide industry rank. The existing category field names remain unchanged. |
| `get_top_websites` | `GET /v1/similar-rank/top-sites/` | `top_sites` containing domain and rank; limit defaults to 10 and accepts whole numbers from 1 to 5,000. |
| `get_remaining_credits` | `GET /capabilities` | Account-level `remaining_hits`, exposed as the existing `remainingHits` output. |
| `get_capabilities` | `GET /capabilities` | Account-level credits plus the provider's dataset-specific countries and snapshot intervals. |

Domains are normalized to lowercase and must omit protocols, paths, and `www.`. Global and country date filters use `YYYY-MM` with a valid month, and start dates must not follow end dates. Dates and the main-domain flag apply only to global and country rankings, preserving the existing category branch behavior. Country values are normalized to lowercase and must contain two letters; subscription availability is checked by Similarweb.

HTTP failures and unsuccessful provider status responses become user-facing service errors. Unexpected response structures are rejected rather than converted to empty rankings or zero credits. Returned identifiers and ranking fields retain their existing names and types. Ranking requests use JSON responses.

Global/country rankings and top sites cost 1 hit per request or 1 data credit per result; industry rank costs 1 hit per request or 2 data credits per result. Capabilities requests do not consume credits. The `/user-capabilities` endpoint returns allocated user allowance and `user_remaining`; it is distinct from account credits and is not used by this integration's account-level tools.

## Official documentation

- [API-key authentication](https://developers.similarweb.com/docs/authentication)
- [Global rank](https://developers.similarweb.com/reference/global-rank)
- [Country rank](https://developers.similarweb.com/reference/country-rank)
- [Industry rank](https://developers.similarweb.com/reference/industry-rank)
- [Top SimilarRank sites](https://developers.similarweb.com/reference/top-similarrank-sites-all-traffic)
- [Account capabilities](https://developers.similarweb.com/docs/check-capabilities)
- [Allocated user usage](https://developers.similarweb.com/docs/check-user-usage)
- [REST errors](https://developers.similarweb.com/docs/error-codes-rest)

These ranking and capabilities endpoints remain listed in Similarweb's current documentation. Similarweb also documents V5; this package retains the existing ranking contracts rather than switching to different metrics or account requirements. No suitable current-user/profile endpoint is documented for this ranking surface. No events or file exports are exposed.
