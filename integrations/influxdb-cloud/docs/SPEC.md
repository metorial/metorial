# InfluxDB Cloud TSM API specification

The integration uses the [InfluxDB Cloud TSM/v2 API](https://docs.influxdata.com/influxdb/cloud/api/) and [official OpenAPI specification](https://docs.influxdata.com/openapi/influxdb-cloud-v2-api.yml). The configured base URL is retained verbatim for Cloud region endpoints and existing InfluxDB 2 instance/proxy configurations. InfluxDB 3, Serverless, SQL, and Flight APIs are separate products and are outside this integration.

## Authentication and organization scope

API-token requests use `Authorization: Token TOKEN`. Tokens are static credentials, with no OAuth refresh. The token input and saved `{ token }` output retain their existing contract. The configuration requires only the region/instance URL. `list_organizations` discovers stable organization IDs and names; Cloud returns the token-owning organization, while OSS results depend on token privileges. Organization-scoped tools accept optional `orgId`, with the saved organization from older connections as fallback. Operations requiring an organization return a clear validation error when none is available. Organization and token values have one setup owner each.

`get_current_user` uses documented API-token `GET /api/v2/me`; it does not create a session, manage passwords, or list all Cloud users.

## Data and mutation semantics

- `write_data` posts unchanged line protocol, preserving `ns`, `us`, `ms`, and `s` precision and the existing `ns` default. Do not coerce large integer timestamps through JavaScript numbers.
- `query_data` executes Flux only. It returns unchanged annotated CSV, retaining multiple tables, quoted values, RFC3339 timestamps, and nanosecond values. Optional runtime `params` and RFC3339 `now` are forwarded. Embedded documented CSV error tables produce a service failure even when HTTP remains 200.
- `delete_data` forwards RFC3339 start/stop and the optional provider delete predicate. Cloud write/delete acknowledgements indicate queued requests, not completed or immediately readable changes.
- No-content mutation tools confirm the documented HTTP 204 response. Resource mutations map the actual response object, never request parameters as returned provider state.
- Bucket retention is seconds; zero is infinite and omitted creation retention defaults to 30 days. Task schedules and offsets remain provider duration/cron strings; every and cron cannot both be supplied.

## Resource surface

All original tools remain: bucket lifecycle; task lifecycle, manual runs and run history; token authorizations; labels; dashboard lifecycle; organization discovery and members; secrets (keys only on reads); Telegraf configurations; DBRP mappings; and monitoring/notification discovery. Focused additions retrieve one bucket, one dashboard, current-user identity, and task-run logs.

Paginated lists return the current provider page. Existing limit/offset fields remain unchanged; bucket/task lists optionally accept documented seek `after`. Complete actual provider data and paging links are available in optional raw outputs. No synthetic totals, state, identifiers, or empty collections are created when required provider data is absent. Optional scalar summaries omit incompatible null/object values and retain those actual values in raw.

Telegraf reads explicitly request JSON because the endpoint otherwise defaults to TOML. Configuration text is ordinary structured tool data. Queries and configurations are not treated as generated downloadable files; this integration has no file URL expiry or renewal lifecycle.

## Limits

Permissions, quotas, retention restrictions, and feature availability depend on the configured deployment and token. Monitoring tools inspect existing resources; they do not claim to create checks, notification endpoints, or rules. DBRP mappings support existing v1-compatible clients; there is no InfluxQL query tool here. No user administration, paid-plan expansion, or product migration is implied.

See the [authentication reference](https://docs.influxdata.com/influxdb/cloud/api/authentication/), [annotated CSV error format](https://docs.influxdata.com/influxdb/cloud/reference/syntax/annotated-csv/#errors), and [Cloud limits](https://docs.influxdata.com/influxdb/cloud/account-management/limits/).
