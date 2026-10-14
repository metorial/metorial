# Postman API capabilities

Authenticate with a Postman API key in the `X-API-Key` header. Requests use
`https://api.postman.com`; keys inherit the user's permissions.

Supported tools cover workspaces, collections, collection forks, pull requests,
environments, mock servers, monitors, incoming collection-run webhooks, comments,
tags, and authenticated user details. `import_openapi` sends a parsed OpenAPI JSON
object to `/import/openapi` and returns created collection IDs and UIDs. Collection
definitions retain collection scripts and protocol behavior during create/update.

The `manage_api` tool uses the deprecated API Builder endpoints with the required
`application/vnd.api.v10+json` Accept header. List and create operations require a
workspace discovered with `list_workspaces`; list returns the next-page cursor.

Monitor runs may return before completion. Use `manage_monitor` with action `get`
to inspect `lastRun`, including the latest job ID, status, and statistics. Incoming
webhooks start collection runs; they are not subscriptions to account events.

Some endpoints depend on the user's plan, role, or region. EU Enterprise API
routing, Spec Hub tools, team administration, secret scanner, billing, and audit
logs are outside this integration's current tool surface.

Official references:

- [API overview and authentication](https://learning.postman.com/api-docs/api-reference)
- [OpenAPI import](https://learning.postman.com/api-docs/api-reference/import/open-api-definition)
- [Create a collection](https://learning.postman.com/api-docs/api-reference/collections/create-collection)
- [Get a collection](https://learning.postman.com/api-docs/api-reference/collections/get-collection)
- [Pull request creation](https://learning.postman.com/api-docs/api-reference/collections/create-collection-pull-request)
- [Monitor runs](https://learning.postman.com/api-docs/api-reference/monitors/run-monitor)
- [Legacy API Builder list](https://learning.postman.com/api-docs/api-reference/ap-is/get-apis)
