# Databox

Create and manage custom data sources and datasets, submit structured records, and verify ingestion outcomes. Discover the authenticated user, supported timezones and accessible data sources; read stored dataset rows with API v2.

Existing connections default to API v1. Select `apiVersion: "v2"` explicitly to use the current API. V1 dataset identifiers are UUIDs; v2 identifiers follow the current API schema and are returned as decimal text. V1 ingestion pages start at 1; v2 pages start at 0. IDs are never converted between versions automatically.

V2 dataset creation requires column definitions using `datetime`, `number` or `string`. Supply finite JSON numbers and ISO 8601 datetime strings with explicit timezones. V1 supports up to 100 records per request; v2 supports up to 500 records or 10 MB. Ingestion acceptance is not a guarantee that rows were stored: check ingestion counts and, with v2, read the resulting records. A repeated v2 idempotency key returns the original result for 24 hours.

Source creation accepts an optional account ID: omit it for the account associated with the v1 API key or the authenticated v2 organization. An explicit v2 ID uses `x-account-id` when accounts are enabled on the organization; the source workflow does not depend on the account’s billing model. The legacy account roster remains v1-only because v2 no longer exposes the same account classification. The current-user tool discovers organization and account identity.

Source and dataset deletion and dataset purge are irreversible. Ingestion can overwrite matching primary keys and retain history. Use these operations only for the intended data and account.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
