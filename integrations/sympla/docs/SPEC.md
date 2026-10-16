# Sympla API specification

## Authentication

An organizer API access token is generated in Sympla under **Minha Conta > Integrações**. Every request sends the unchanged token in the `s_token` header. No OAuth flow, refresh token, setup resource ID, or configuration field is required.

## Existing event operations

The existing tools retain `https://api.sympla.com.br/public/v3`, numeric event and ticket identifiers, page/offset pagination, and the original request parameter meanings:

- `list_events` and `get_event` read organizer event details.
- `list_orders` and `get_order` read event purchases; `includeAllStatuses` maps to `status` unchanged, including explicit false.
- `list_participants` reads participants by event or order.
- `get_participant` reads by ticket ID or ticket number.
- `checkin_participant` performs check-in through the existing `/checkIn` routes.
- `list_affiliates` reads event affiliates.

The current official reference covers versioned `v1.5.0`, `v1.5.1`, and `v1.6.0` routes rather than `/v3`. Its linked historical reference returned HTTP 404 during this audit. That does not establish retirement of existing routes. Their endpoint behavior and sparse-response contracts need live verification before any migration.

## Scheduled presentation discovery

Three additive read tools use the separately versioned `https://api.sympla.com.br/public/v1.6.0` API and the same `s_token` credential:

- `list_current_events`: `GET /events`; returns actual provider event objects, including string `id` hashes needed for the next two tools. Publication filter values are `published`, `not_published`, and `all`; default is published. Default timezone is `America/Sao_Paulo` and default sort is ascending. Continue with the exact returned `pagination.next_cursor`.
- `list_presentations`: `GET /events/{eventIdHash}/presentations`; reads scheduled sessions, presentation IDs, sectors, dates, and publication state. Supports publication, start-date, timezone, online-sector, page-size, and cursor filters. Explicit false filters are preserved. Default publication is true.
- `get_presentation`: `GET /events/{eventIdHash}/presentations/{presentationId}`; returns the direct presentation object documented for this endpoint, rather than assuming a data envelope.

The new tools retain raw provider objects and metadata, including sparse fields or null values inside records. Their `httpStatus` comes from the actual HTTP response. HTTP 204 omits the resource and metadata fields; it does not manufacture an empty list, total, or next-page state.

## Compatibility and limitations

Legacy tool keys, schemas, enum values, optionalness, and defaults remain unchanged. Version 1.6.0 uses string hash identifiers and cursor pagination; it must not silently replace legacy numeric-ID routes. No self/profile endpoint, affiliate endpoint, or webhook registration API appears in the retrieved current OpenAPI reference. Creation and editing of events are not exposed there. Current order/participant, presentation-scoped order/participant, and QR check-in routes remain unimplemented by the additive presentation tools; the existing legacy tools remain available.

## Official sources

- [Current OpenAPI contract](https://developers.sympla.com.br/api-docs)
- [Developer reference and authentication guide](https://developers.sympla.com.br/api-doc/)
- [Breaking changes and compatibility](https://developers.sympla.com.br/docs/breaking-changes.html)
- [Changelog](https://developers.sympla.com.br/docs/changelog.html)
- [Historical contract linked by the current reference](https://developers.sympla.com.br/api-docs/v2.0.68) — HTTP 404 when checked on 2026-10-15.
