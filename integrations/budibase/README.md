# Budibase

Manage applications or workspaces, tables, rows, users and configured queries through the Budibase Public API. Existing tool keys remain available. Native IDs come from discovery or the dashboard workspace URL; `app_metadata` is a metadata document, not an application/workspace ID.

New connections store the exact instance URL ending in `/api/public/v1` with their personal API key. Current instances use `/workspaces`; an explicit legacy route option supports deployed instances requiring the still-documented `/applications` endpoints. Existing unmarked connections continue using their saved instance configuration and legacy application routes. API keys inherit user RBAC; the public API does not provide a current-user identity endpoint.

The twelve tools cover application CRUD/discovery/publication, table CRUD/discovery, row CRUD/search, user CRUD/search, configured query discovery/execution, and licensed application export. Table creation requires a name and schema (`{}` is an empty schema). Partial table and row updates preserve current native fields before applying supplied changes; coordinate concurrent edits because these operations are not atomic. Roles and global privileges require a business or enterprise edition. Omitted passwords are not reset.

Row search defaults to a page of 100 with native bookmarks; numeric zero and empty strings are preserved. The conservative per-page maximum is 1000. Configured REST queries can expose their own native continuation fields; execution may affect connected systems. Application, table, user and query discovery returns the documented complete search response within a bounded 5000-item validation limit, without inventing cursor parameters.

Publication reports the native deployment SUCCESS or FAILURE receipt. Unpublish uses the documented empty HTTP 204 response. Publication history and downstream effects remain retained. Deleting a workspace, table or row removes associated data.

Export creates an unencrypted downloadable native gzip archive through the POST export API; it excludes rows by default. Current workspace export requires enterprise privileges; legacy application export requires business or enterprise privileges. The local limit is 8 MiB compressed and 16 MiB expanded validation, including tar framing and checksums without extracting files. Use the dashboard for larger or password-encrypted exports. No expiry or renewal endpoint is invented.

Official references: [Public API](https://docs.budibase.com/docs/public-api), [current OpenAPI](https://raw.githubusercontent.com/Budibase/budibase/master/packages/server/specs/openapi.yaml), and [public workspace routes](https://github.com/Budibase/budibase/blob/master/packages/server/src/api/routes/public/workspaces.ts).
