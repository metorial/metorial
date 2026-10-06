# Nango

Discover authorized integrations, connections, providers and deployed functions, inspect synced records and native sync state, and manage exact integration workflows.

Connect with a Nango **Environment API key**, not an Account API key. Prefer custom permissions without credential-read scopes. Configure the exact HTTPS instance origin during connection setup; Nango Cloud defaults to https://api.nango.dev. New connections bind this origin to their credentials. Existing stored baseUrl configuration remains a fallback until reconnection; legacy loopback HTTP development instances remain supported. The profile describes the configured key and instance, without inventing a verified user or organization identity.

Call list_integrations, list_connections, list_providers and list_functions to discover exact IDs, native provider names, deployed action/sync names and data models before using them. Connection lists return one native page without a documented continuation receipt. Function lists return native page/limit/total receipts. Record cursors stay opaque; even a short page can have more records, and only native next_cursor:null finishes a scan.

All ten existing tool keys and their input fields remain. Integration/connection outputs contain credential-free metadata. The legacy connection credentials field is always empty. Nonempty sensitive include values and includeRefreshToken:true are refused. create_connect_session retains its inputs but refuses before minting a token: use Connect UI through a trusted backend to authorize end users. This integration cannot safely deliver provider secrets or session authorization tokens.

Proxying requires an exact connection/integration pair and a relative endpoint. Arbitrary origin overrides, authentication/routing headers, credential endpoints and automatic write retries are unavailable. JSON/text responses have a local 10 MiB limit; binary downloads are unsupported. Recognized secret fields and configured/imported credential reflections are redacted, while nonsecret metadata remains available.

Actions return native synchronous JSON results. Sync trigger/start receipts confirm acceptance rather than completion; start enables scheduling and executes immediately. Empty write sync lists or omitted connection IDs broaden native scope. Pause does not prove active-run cancellation. Reset clears checkpoints, and emptyCache removes cached records. Importing a connection can replace authorization and trigger hooks. After an uncertain write, inspect the exact native resource before retrying. Deletion does not guarantee upstream credential revocation, provider effect reversal or history erasure.

[API authentication](https://nango.dev/docs/reference/backend/http-api/authentication), [API key scopes](https://nango.dev/docs/reference/backend/http-api/api-keys), and [native endpoint reference](https://nango.dev/docs/reference/backend/http-api/integration/list).

Licensed under [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
