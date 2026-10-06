# Nango integration contract

Twelve public tools preserve ten existing keys and add deployed-function and provider discovery. There are no trigger registrations. No deployment, source download, environment administration, invented identity endpoint or asynchronous action-job API is supplied.

| Tool | Native contract |
| --- | --- |
| list_integrations | GET /integrations; data array, complete native collection; local 2,000-item refusal bound. |
| list_providers | GET /providers; native catalog names and auth modes; local 2,000-item bound. |
| list_functions | GET /integrations/{uniqueKey}/functions; zero-based page, limit 1–100, native total/page/limit. |
| manage_integration | Native POST/PATCH/GET/DELETE; exact create/update/get IDs and provider receipts; native deletion success is preserved. Sensitive includes are unavailable. |
| list_connections | GET /connections; connectionId/search/limit/page/tags; one native page, with no inferred complete-inventory guarantee. |
| manage_connection | Native credential import, metadata read and deletion for an exact pair. Outputs never deliver credentials; includeRefreshToken:true is refused. |
| manage_connection_metadata | POST replaces all metadata; PATCH overwrites supplied properties; every native receipt must match the exact target ID set. |
| manage_sync | Trigger/start/pause accept native names or name/variant objects. Status uses comma-separated selectors and name::variant; native camelCase dates and checkpoint JSON are retained. |
| get_records | GET /records with native connection/provider headers, model, cursor, modified_after, ids and optional variant. Native null continuation ends the scan. |
| trigger_action | POST /action/trigger with action_name/input; the native synchronous body is returned without inventing a job/status envelope. |
| proxy_request | Native proxy headers and relative path; safe condition/content headers use the nango-proxy- prefix. JSON/text only; no arbitrary baseUrlOverride, credential endpoints or automatic write retries. |
| create_connect_session | Retained schema and local refusal. No native request or token minting; secure Connect UI authorization belongs in a trusted backend. |

Auth setup preserves the secret_key method and secretKey input. Auth-scoped baseUrl takes precedence over legacy stored config; config does not expose a duplicate setup property. Only HTTPS origins, plus legacy local loopback HTTP, are supported. Keys and instance origins receive preflight validation. Reads can refresh credentials when a key has credential permissions; prefer permissions without read_credentials/list_credentials. No native token introspection is documented, so a static profile does not claim verified identity.

Legacy inputs and action enums remain. Metadata fields become optional where current native list/read receipts omit them; no timestamps are invented. Connection credentials remain an empty object for security. Sync checkpoints accept native JSON (including legacy string/null values) and empty latestResult objects without rounding counts. General data fields cannot carry recognized credential keys. Other local bounds are 1 MiB request JSON, 10 MiB JSON/text responses, 1,000 records/connections per requested page, 100 record IDs, 2,000 sync statuses and 2,048-character identifiers/cursors. These are local safety limits, not claims about native provider caps.

Write receipts are not cleanup or completion proof. Import is an upsert and can run hooks. Deletion can remove cached connections/sync data but does not prove upstream revocation or retained-history erasure. Reset/cache deletion, scheduling, actions and proxy requests can retain downstream effects; after uncertainty, inspect exact native state before retrying.

Primary references: [integrations](https://nango.dev/docs/reference/backend/http-api/integration/list), [connection import](https://nango.dev/docs/reference/backend/http-api/connections/post), [metadata replacement](https://nango.dev/docs/reference/backend/http-api/connections/set-metadata), [metadata patch](https://nango.dev/docs/reference/backend/http-api/connections/update-metadata), [sync status](https://nango.dev/docs/reference/backend/http-api/sync/status), [records](https://nango.dev/docs/reference/backend/http-api/sync/records-list), [actions](https://nango.dev/docs/reference/backend/http-api/action/trigger), [proxy](https://nango.dev/docs/reference/backend/http-api/proxy/get), [Connect sessions](https://nango.dev/docs/reference/backend/http-api/connect/sessions/create), [functions](https://nango.dev/docs/reference/backend/http-api/functions/list), [providers](https://nango.dev/docs/reference/backend/http-api/providers/list).
