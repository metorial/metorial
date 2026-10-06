# Bubble

Read and manage exposed Bubble data records, search with native filters, invoke configured API workflows, discover API schemas, and download bounded JSON record exports.

Use the exact HTTPS API URL from Settings → API, including `/api/1.1` and the branch when applicable. New token and public connections bind this URL in authentication. Existing connections retain a validated stored configuration fallback; the integration does not silently change or pin that configuration. Custom domains are supported. Redirects, credentials in URLs, local/IP addresses and arbitrary paths are refused.

Admin API tokens bypass privacy rules and remain valid until revoked. Externally obtained user tokens obey privacy rules and expire according to the app’s login/2FA settings; inactivity can also expire them. Public mode has only anonymous access. This integration does not log users in, refresh user tokens, infer token privileges, or invent a current-user identity. Obtain or rotate credentials through Bubble or the app’s own controlled authentication flow.

Enable the Data API and expose each required data type. `get_api_spec` discovers configured data types, fields and workflows when Swagger access is enabled. Data type paths use lowercase names without spaces. IDs stay opaque strings. Field names must match the exposed API representation; hidden fields and permission failures are controlled by Bubble.

Search returns one native page: `cursor` is its starting offset, `count` is the current page’s size, and `remaining` counts records after it. Continue with `nextCursor` and the same filters/sorting. Requests are capped at 100 records. Bubble also imposes plan-specific search offsets (generally 50,000; Enterprise can allow 10,000,000), and concurrent changes can shift offset results. Exports generate a JSON file of at most 5000 visible records and 16 MiB; `complete` reports native exhaustion from the requested offset and is not a database snapshot or unrestricted-table completeness promise.

Create and bulk-create return native record IDs. Bulk creation sends 1–1000 newline-delimited JSON objects and preserves per-row failures. Accepted rows remain after partial failure; incomplete receipts or transport failures can leave records. Reconcile reported IDs before repeating. PATCH changes selected fields; PUT replaces all editable fields and clears/defaults omitted values. Provider-managed IDs and dates cannot be written. Deletion is irreversible and does not undo database-trigger workflows, external changes or historical activity.

`trigger_workflow` invokes an already configured exposed endpoint with its documented POST or GET method. Both methods can change data or send messages. Workflow authentication, conditions and response type belong to the app; a successful HTTP response cannot prove downstream effects completed. Redirect responses are refused. Credential fields are withheld from returned data; do not use this tool to distribute generated login tokens.

## Sources

- [Data API reference](https://manual.bubble.io/core-resources/api/the-bubble-api/the-data-api/data-api-requests)
- [Endpoints and app branches](https://manual.bubble.io/core-resources/api/the-bubble-api/the-data-api/data-api-endpoints)
- [Admin authentication](https://manual.bubble.io/help-guides/integrations/api/the-bubble-api/authentication/as-an-admin)
- [User authentication](https://manual.bubble.io/help-guides/integrations/api/the-bubble-api/authentication/as-a-user)
- [Workflow API](https://manual.bubble.io/core-resources/api/the-bubble-api/the-workflow-api)
- [Swagger discovery](https://manual.bubble.io/help-guides/integrations/api/the-bubble-api)

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
