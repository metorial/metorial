# OneDesk integration

Create, retrieve, update, and search work items; create and search projects; post messages to existing conversations; create internal users; retrieve organization settings and type labels; discover users and teams; and retrieve a project by external ID.

## Authentication

The recommended connection uses a Public API key sent in the `OD-Public-API-Key` header to `https://app.onedesk.com/rest/public/`. OneDesk's [developer reference](https://onedesk.com/dev/) and [OpenAPI definition](https://onedesk.com/public-api/onedesk-public-api.json) document this API.

The email/password connection remains available for existing legacy workflows. It exchanges credentials for a token and sends the token in request bodies to the existing v2.0 endpoints. Current official legacy documentation was not established during this refresh; these routes are retained for compatibility. New project lookup and user/team discovery, and work-item operations by external ID, require an API key connection.

## Identifiers and types

Organization type endpoints return human-readable `label` values. Use these labels as item, project, and user type names. Teams use external IDs discoverable with `search_teams`. `create_user` creates internal users, rather than customers.

Create operations return external IDs with API key connections. Pass a created work item's ID to `get_item.externalId` or `update_item.externalId`; `itemId` refers to OneDesk's numeric internal ID. Pass a project external ID to `get_project`.

## Search

Detailed filter requests use a whole-number `limit` from 1 to 50 and a non-negative whole-number `offset`. The existing `filters.value` remains a string; an optional `typedValue` supports boolean, number, string-array, or null values. `isCustomField` routes conditions to the custom-field filter list. Unsupported filters reported by OneDesk cause a clear failure instead of returning misleading results. Item searches discover type labels when `itemTypes` is omitted.

## Messages

Messages are posted to an existing conversation external ID. Their visibility follows the conversation; this tool does not create or change conversation visibility.

## Verification scope

This refresh checks requests and result handling against the published API definition and verifies the local build. It does not establish live account acceptance or legacy token lifetime behavior.
