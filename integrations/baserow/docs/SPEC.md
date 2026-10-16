# Baserow integration

This integration uses the [official REST API](https://api.baserow.io/api/redoc/) and its [OpenAPI schema](https://api.baserow.io/api/schema.json).

## Authentication

- `database_token`: a workspace/table-scoped token, sent as `Authorization: Token …`.
- `jwt`: account email and password exchanged at `/api/user/token-auth/`, sent as `Authorization: JWT …`. Access and refresh tokens are persisted and refreshed through `/api/user/token-refresh/`. Two-factor challenges require a different supported connection; they are never treated as access tokens.
- Both methods accept an optional instance `baseUrl`, defaulting to `https://api.baserow.io`. Existing stored configuration URLs remain a fallback for older connections.

## Tools

| Tool | Behavior | Authentication |
| --- | --- | --- |
| `list_rows` | Page rows with search, ordering, field selection, view scope, parameter filters, or a nested filter tree | Both |
| `get_row` | Read one row with its actual field values | Both |
| `create_rows` | Create one row or use batch creation for multiple rows | Both |
| `update_rows` | Update one row or a batch, rejecting mixed modes | Both |
| `delete_rows` | Delete one row or a batch | Both |
| `move_row` | Move a row before another row or to the end | Both |
| `list_fields` | Read field IDs, types, and configuration | Both |
| `upload_file` | Import a public URL into Baserow and return the stored file object for assignment to row fields | Both |
| `list_token_tables` | Discover all tables accessible to a Database Token | Database Token |
| `list_databases` | Discover workspaces, then databases within one workspace | JWT |
| `list_tables` | List tables in a database | JWT |
| `list_views` | List views with optional type, extra configuration, and limit | JWT |
| `manage_field` | Create, update, or delete a field | JWT |
| `manage_table` | Get, create, rename, or delete a table | JWT |
| `manage_view` | Get, create, update, or delete a view | JWT |
| `get_current_user` | Verify the refresh token and return the account username/name | JWT with refresh token |

## Behavior and limits

Row lists retain Baserow's total `count`, nullable `next`/`previous` URLs, and current-page row array. Page size is at most 200. Numeric IDs remain number inputs and are checked as positive integers at runtime. Dynamic row values and provider metadata are preserved. Invalid required provider responses produce an error instead of empty success data.

View types, field options, batch limits, and structural permissions can vary by instance version and plan. The generic settings records accept provider-documented options; the server validates type-specific settings. File upload returns the provider file reference, including the stored `name` needed for subsequent row updates. It does not export or download file contents. Self-hosted file URL access and expiry depend on the instance's secure file serving or storage configuration.

Webhook registration, event subscriptions, workspaces/database creation, application builders, administration, paid-only expansion, and file download/export are not exposed as tools.
