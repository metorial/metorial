# CoinMarketCal

Search cryptocurrency events, inspect event details, discover coins and category
IDs, track event cancellations, and read API usage through the current V2 API.

## Authentication and migration

Create a V2 API key in the [developer dashboard](https://coinmarketcal.com/developer/dashboard/keys).
Requests send it as `x-api-key` to `https://api.coinmarketcal.com/v2`.
Keys do not expire; revoke or rotate them in the dashboard. No OAuth refresh is needed.

[API V1 was retired on July 14, 2026](https://coinmarketcal.com/developer/docs/migration-v1).
Existing V1 keys must be replaced with V2 keys. The saved `api_key` authentication
method and `token` value remain compatible with existing connections, but a V1
credential does not become a V2 credential automatically.

The legacy `search_events`, `list_coins`, and `list_categories` tools remain
registered as deprecated with their original V1 routes and contracts. Use
`list_events`, `search_coins`, and `list_event_categories` for current data.
V2 returns string event/category IDs, plain string titles/descriptions, and
cursor pagination. It has no direct replacement for V1 votes, views, translations,
or the `showOnly` filter; these values are not invented in V2 results.

## Tools

| Tool | Endpoint | Purpose |
| --- | --- | --- |
| `list_events` | `GET /events` | Filter one page by coin/category/date/keyword/impact |
| `get_event` | `GET /events/{id}` | Retrieve an event from its string ID |
| `search_coins` | `GET /coins` | Search name/symbol and discover canonical slugs |
| `get_coin` | `GET /coins/{slug}` | Retrieve a coin and coverage metadata |
| `list_event_categories` | `GET /categories` | Discover category slugs and upcoming counts |
| `get_usage` | `GET /usage` | Read the authenticated plan and monthly quota |
| `list_event_cancellations` | `GET /events/cancellations` | Reconcile removed events in a saved calendar |

## Pagination and dates

Event and cancellation pages allow 1–100 records; coin pages allow 1–200.
Defaults are provider-owned: 20 events, 50 coins, or 100 cancellations.
Pass `meta.cursor` into the next request with the same filters. A null cursor
marks the last page. Categories are not paginated.

Display an event's `displayedDate`. When `isEstimated` is true, its machine
`date` is a deadline or window boundary rather than an exact scheduled time.
The date range and available history are restricted by the active plan.

## Plan-dependent access

Category discovery/filtering requires Standard or higher. Event descriptions
are null on Free, and categories are omitted on Free. Impact is null on
Free/Standard, a band on Pro, and numeric on Elite or higher. Source proof
and impact commentary require Pro or higher; precise impact filters and
sorting require Elite or higher. Coin rank and plan-gated impact metrics may
be null. Quota/remaining values may be null for unlimited Enterprise contracts.

V2 responses preserve these distinctions. Provider errors are surfaced with
their HTTP status and message rather than reported as empty results.
An event lookup can return 410 for a recent permanent removal, or 404 for
unknown, unpublished, or out-of-window events. Cancellation records cover
the recent 90-day window; reconcile at least once in that period.

## Scope

This integration provides read-only tools. It does not create or change the
editorial catalog. Elite-only exports and dashboard-managed webhooks are
outside this tool set. The API documents no current-user/profile endpoint;
`get_usage` exposes the authenticated plan and quota without inventing identity.

## References

- [API reference](https://coinmarketcal.com/developer/docs)
- [Authentication](https://coinmarketcal.com/developer/docs/authentication)
- [Events](https://coinmarketcal.com/developer/docs/events)
- [Coins](https://coinmarketcal.com/developer/docs/coins)
- [Categories](https://coinmarketcal.com/developer/docs/categories)
- [Usage](https://coinmarketcal.com/developer/docs/usage)
- [Errors](https://coinmarketcal.com/developer/docs/errors)
- [OpenAPI contract](https://coinmarketcal.com/developer/docs/openapi.json)
