# Databox API coverage

Fifteen tools cover credential validation and identity, account/source discovery, custom source and dataset lifecycle, ingestion, ingestion history and current dataset row readback. All twelve existing tool keys and field types remain available. No triggers are registered.

## API versions

The [official migration guide](https://developers.databox.com/docs/api/migration-guide) confirms v1 remains available. Existing connections default to v1; `apiVersion: "v2"` explicitly selects current request and response envelopes. V2 resources are nested under `data`, list items under `data.items`, and pagination starts at zero. V1 ingestion pagination starts at one. Provider pagination is returned as supplied, never synthesized.

The current v2 OpenAPI declares integer dataset IDs, while the migration guide says identifiers are unchanged and shows a UUID example. V1 UUIDs are preserved; v2 IDs follow its schema, are checked for exact JavaScript integer representation and returned as decimal strings. Invalid or cross-version identifiers fail before network calls. Do not guess ID conversions.

The legacy `list_accounts` classification has no equivalent in v2 and fails locally there with remediation. `get_dataset_data` is v2-only. V2 dataset creation requires additive `columns` definitions. V1 rejects fields that only have a v2 meaning rather than ignoring them. Source creation accepts an optional account ID: explicit values retain the v1 body field or v2 account header semantics, while omission uses the API key’s default scope. Both managed and self-managed accounts follow the documented source context; their billing differences do not classify legacy account types.

## Authentication and ingestion

User-specific API keys use `x-api-key`, inherit user permissions and may be IP-restricted. Current profile discovery provides stable user identity without revealing a credential prefix. Account context headers apply only to documented v2 operations; profile, key validation and timezone discovery ignore account selection.

Databox v1 allows 100 records per ingestion request. Current v2 documentation allows 500 records or 10 MB, with optional 24-hour idempotency keys for creation, ingestion and purge. No write retries or chunking are automatic. JSON-compatible values and finite numbers are required; datetime values are caller-supplied ISO 8601 strings, not implicitly converted v0 metric timestamps. Rejected rows and processing status must be checked separately from request acceptance. Ingestion errors containing records are omitted from status output; only counts are returned.

Nonempty top-level error lists fail the request even on HTTP 2xx; provider error records are never echoed. A v1 dataset title explicitly returned as null is represented by an empty title string, retaining the existing public field type.

Deletion and purge are irreversible; dataset primary keys permit overwrites. Storage, feature access and retained history depend on the account and plan. Billing, destination provisioning, metric definitions and historic v0 metric pushes are outside this focused surface.

## Sources

- [Current API reference](https://developers.databox.com/docs/api/api.databox.com)
- [Authentication and account context](https://developers.databox.com/docs/api/authentication)
- [Version migration and compatibility](https://developers.databox.com/docs/api/migration-guide)
- [Rate limits and idempotency](https://developers.databox.com/docs/api/rate-limits)
- [Current API overview and availability](https://developers.databox.com/docs/api/overview)
