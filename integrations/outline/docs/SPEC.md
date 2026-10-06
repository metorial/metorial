# Outline API scope

The integration covers documents, collections, collection memberships, users, comments and groups through the [official RPC API](https://www.getoutline.com/developers) and [official OpenAPI specification](https://github.com/outline/openapi).

API tokens authenticate with Bearer authorization against the configured HTTPS instance. The instance setting belongs to authentication because profile discovery uses `auth.info`. A legacy stored instance setting is retained as a validated fallback for existing tool connections. No user or workspace identity is inferred from a token.

All fifteen tools preserve the original thirteen public keys. Added tools are `get_current_user` and `export_document`. Existing management tools provide exact native collection/comment/group/membership reads. Document update supports native revision and edit-mode guards; existing append/done fields are preserved according to the current server schema. Lifecycle receipts distinguish trash, archive, restore, move and irreversible permanent deletion. Move receipts may identify several affected documents and collections.

Responses retain native nulls and current identifiers. Legacy template flags are returned only when supplied by the server. Pagination is explicit; no automatic page following or mutation retry occurs. Invalid action/field combinations fail before requests. Current unsupported template creation fails with remediation rather than silently creating an ordinary document.

Exports use the native POST Markdown response. They exclude descendant exports, asynchronous jobs and bundled files. Content is limited to 8 MiB, and embedded link expiration is not treated as export-file expiration. No expiry time or renewal endpoint is invented.

Stars, pins, import, upload, shares, webhook registration, polling and broader user administration are outside this bounded implementation. No legacy trigger registrations remain.

Request and complete native response content are checked for reflected authentication values, including supported encoded forms, before transport or successful output respectively. A refused response may follow a write that already took effect; inspect the exact resource before retrying.
