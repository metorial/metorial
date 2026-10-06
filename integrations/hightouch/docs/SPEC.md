# Hightouch API contract

Version 0.3.1 exposes 22 tools: 20 preserved keys and two lifecycle additions, delete_model and delete_sync. No event triggers are registered. Personalization, Events SDK, warehouse row exports and sequence configuration are separate capabilities and are not exposed here.

## Official evidence

Checked 2026-10-05 against the [current API overview](https://hightouch.com/docs/developer-tools/api-guide) and [API reference](https://hightouch.com/docs/api-reference). The reference page directly loads [Hightouch's official OpenAPI JSON](https://api.hightouch.io/api/swagger.json), whose server is https://api.hightouch.com/api/v1. The retrieved document has 36 paths, API version 1.0.0 and SHA-256 f5525483cd8ddf4830097f3b0977d0b0676b5ccd99f44128bf86d315a817d72a.

## Contracts

- API keys belong to one workspace and inherit selected group permissions; they do not necessarily grant administrator access. Group/creator access changes can revoke permission. No suitable identity or workspace discovery route exists in the current management specification.
- Sources and destinations support GET collections/details, POST creation and PATCH updates. They have no documented DELETE route. Returned provider id maps to the preserved sourceId/destinationId fields.
- Models support GET, POST, PATCH and DELETE. Provider id maps to modelId. Existing dbt/visual string reference IDs convert to numeric upstream IDs; visual.filter is a JSON object encoded in the legacy string field, and label maps to primaryLabel. Model creation optionally uses the documented skipColumnQuery query parameter; it is not sent in the request body. Only the selected query definition is accepted. Model/sync deletion reports success only for documented HTTP 200/204 responses after rejecting API-error envelopes.
- Syncs support GET, POST, PATCH and DELETE. Provider id maps to syncId. Creation always sends the required schedule attribute, with null for manual scheduling when omitted. Disabled defaults remain compatible. clearSchedule provides an additive way to remove a schedule without changing the legacy schedule field type. The documented match_booster schedule has no inner payload, so its optional schedule payload is omitted.
- Lists validate integer pagination and IDs. Sources/destinations/models specifications omit hasMore from their required schema but include it in examples: returned booleans are respected; when absent, a separate one-row lookahead after the actual returned rows determines whether another page exists. Optional nextOffset identifies the next page, including a provider-capped page. No invented default false is used.
- Triggering requires exactly one sync ID or slug. Both documented trigger routes retain their correct identifiers, fullResync and resetCDC spellings. Sequence path IDs are encoded. Trigger results report submission, not completion. Disabled syncs can still run through manual/API/sequence triggers; disabling is not an execution lock. Runs map id to the preserved runId number, and trigger IDs remain strings. Sequence results are selected typed fields rather than arbitrary response metadata.
- All source/destination/sync configuration values are omitted from outputs to prevent disclosure of opaque credentials. Safe resource metadata, identifiers, model definitions and run counts remain. Run error text is replaced with a debugger reference because upstream diagnostics may include secrets or row data.
- HTTP requests use shared authenticated HTTP/error helpers, 30-second timeouts and no automatic redirects. Validation and provider failures are ServiceError values with sanitized status/remediation and no raw request/response parent. Documented API errors returned with HTTP 200 are rejected as errors.

## Operational references

[Sync creation](https://hightouch.com/docs/syncs/create-your-first-sync), [sync scheduling](https://hightouch.com/docs/syncs/schedule-sync-ui), [resync/reset CDC](https://hightouch.com/docs/syncs/resync-reset-clear), [sync sequences](https://hightouch.com/docs/syncs/schedule-sync-with-sequences) and [warehouse compute](https://hightouch.com/docs/sources/warehouse-compute) describe external changes, query costs and execution prerequisites. Deleting configuration does not reverse destination data writes.
