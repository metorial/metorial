# Humanitix API integration

Humanitix provides event, order, ticket, and tag information, together with ticket check-in and check-out operations.

## Authentication

Use the public API key from **Account > Advanced > Public API Key**, sent in the `x-api-key` header. The API base URL is `https://api.humanitix.com/v1`. Generating a new API key invalidates the previous one. The documented rate limit is 200 requests per minute.

Sources: [official API key guide](https://help.humanitix.com/en/articles/8888275-public-api-documentation), [official OpenAPI specification](https://api.humanitix.com/v1/documentation/json).

## Tools

| Tool | Provider operation | Behavior |
| --- | --- | --- |
| `list_events` | `GET /events` | Lists owned/shared events; optional future-only, since, and location filters. |
| `get_event` | `GET /events/{eventId}` | Retrieves event details, public URL, and event date entries. |
| `list_orders` | `GET /events/{eventId}/orders` | Lists orders; optional event date, since, and location filters. |
| `get_order` | `GET /events/{eventId}/orders/{orderId}` | Retrieves an internal order and buyer/payment details. |
| `list_tickets` | `GET /events/{eventId}/tickets` | Lists tickets; optional event date, complete/cancelled status, since, and location filters. |
| `get_ticket` | `GET /events/{eventId}/tickets/{ticketId}` | Retrieves ticket details, associated order, seating, and check-in state. |
| `list_tags` | `GET /tags` | Lists account tags. |
| `get_tag` | `GET /tags/{tagId}` | Retrieves a tag by ID. |
| `manage_ticket_check_in` | `POST /events/{eventId}/tickets/{ticketId}/check-in` or `/check-out` | Checks a ticket in/out and returns the provider's scanning messages. No request body is sent. |

All endpoint paths are relative to the `/v1` base URL. The location override is an ISO 3166-1 alpha-2 country code. `since` accepts an ISO 8601 date-time.

## Pagination and discovery

List tools retrieve one page per invocation. The provider requires `page`, so omitting the optional tool input sends page 1. Pages start at 1, and page size is a whole number from 1 through 100. Existing number input schemas remain unchanged; invalid fractional values are rejected at invocation time. Provider `total` is returned as the existing `totalResults` field.

Call `list_events` to discover event IDs and its `dates` entries, then use an event date `_id` for optional `eventDateId` filters. Call `list_orders`, `list_tickets`, and `list_tags` to discover their IDs. Buyer-facing order references differ from internal IDs.

## Compatibility

Existing tool keys and field types are preserved. The legacy `get_order.businessPurpose` string remains a string: a documented provider boolean becomes `"true"` or `"false"`, while an existing provider string remains unchanged. The optional `isBusinessPurpose` field returns the documented boolean without changing the legacy field's type. Existing `orderName`, `qrCodeData`, and `totalsV2` mappings remain available when returned by the provider.

The ticket read tools expose current `checkIn`, check-in history, event date, associated order reference, currency, seating, question answers, and timestamps. Scanning messages may contain HTML and are returned as provided by Humanitix.

## Limits

Tags may require activation by Humanitix support; see the [official tag guide](https://help.humanitix.com/en/articles/9997955-how-to-create-tags-for-your-event). Global event discovery requires special Humanitix permission and is not exposed here. The beta check-in-count endpoint is not exposed. The public OpenAPI specification has no current-account/profile endpoint.

This integration does not expose event creation, event updates, or file exports. Consult the [current official API reference](https://api.humanitix.com/v1/documentation/) for supported provider capabilities.
