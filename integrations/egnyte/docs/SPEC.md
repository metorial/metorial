# Egnyte API coverage

## Connection

OAuth authorization code and refresh use the tenant's `/puboauth/token` form endpoint. The domain name is owned by authentication and persisted with access/refresh tokens and expiry; configuration is empty. A missing refresh token fails before HTTP. The current-user endpoint is `/pubapi/v1/userinfo`.

Requested scopes are `Egnyte.filesystem`, `Egnyte.link`, `Egnyte.user`, `Egnyte.group`, `Egnyte.permission`, and `Egnyte.audit`. Bookmark and project-folder scopes are not requested. Tokens expire after 30 days according to the provider; actual response expiry is validated and persisted.

## Forty public tools

| Area | Coverage and behavior |
| --- | --- |
| Files | Folder listing and file/folder reads by path or persistent ID; create/copy/move/delete; lock/unlock; bounded text/base64 upload; exact ID/version download. Paths encode individual segments without changing spelling or whitespace. Copy/move receipts must identify one resource at the exact destination; downloads pin the observed or requested version. |
| Sharing | Create, list and delete links; exact link readback. Listing uses v2 full link objects; v1 creation can return multiple links. Email notification flags remain explicit. |
| Access | Get/set folder permissions with native boolean inheritance fields. Existing SCIM user/group CRUD is preserved; member replacement uses GET plus PUT, rename uses PATCH. |
| Content | Search with native 1–20 page sizes and lower-bound total indicator; comments; custom metadata writes and definition/value readback. |
| Trash | v2 ID discovery and exact restoration using `RESTORE` plus `ids`; mixed 207 results fail. Legacy global purge and folder-scoped list requests fail before mutation. |
| Workflows | Create review/approval steps using `name`, `type`, nested `stepOptions`, numeric assignees and required approval signature setting; legacy usernames resolve to exact SCIM IDs. Get/tasks/cancel and workflow discovery. Task count maps to `limit`, max 50; workflow pages max 25. |
| Audit | Five existing report types; valid dates/type-specific filters and required login events. Native job status precedes completed results; redirects never forward credentials. CSV uses authenticated file delivery, JSON returns one page. |
| Identity/discovery | Minimal current user; bounded `get_resource` selectors (group/link/namespace/metadata values) and `list_resources` selectors (namespaces/workflows). |

All 35 original tool keys and field types remain. Five additions are `get_current_user`, `upload_file`, `download_file`, `get_resource`, and `list_resources`. Runtime validation refuses documented unsupported combinations without inventing endpoints. No triggers are registered, and obsolete event/webhook-only client helpers are removed.

## Limits and verification

An active private suite verifies resource identities, native pages and authenticated downloads. Controlled file mutations require explicit isolated synthetic sandbox authorization, independently verified administrator visibility, no concurrent changes/external automation, and acceptance of retained trash/audit history. Cleanup requires complete owned metadata, version/lock state, folder permissions and bounded exact related links/comments/workflows. Missing evidence or state drift preserves the resource. Synthetic group creation/rename additionally requires acceptance of retained test groups; automatic group deletion is gated because documented reads do not establish all reverse permission associations. Personnel provisioning/deletion, workflow assignment/cancellation and report generation have explicit scenario prerequisites; baseline resources are never mutated or cleaned. Missing credentials alone do not skip the suite. No live provider operation was performed during this refresh.

The connection validates tenant hosts and OAuth refresh, and reports sanitized provider failures. File delivery and provider acceptance remain unverified against a live domain.

## Official references

- [Authentication](https://developers.egnyte.com/integration/cfs/api-docs/authentication)
- [Filesystem](https://developers.egnyte.com/integration/cfs/api-docs/file-system-management)
- [Users](https://developers.egnyte.com/integration/cfs/api-docs/user-management-api) and [groups](https://developers.egnyte.com/integration/cfs/api-docs/group-management)
- [Links](https://developers.egnyte.com/integration/cfs/api-docs/links-api), [permissions](https://developers.egnyte.com/integration/cfs/api-docs/permissions-api), [comments](https://developers.egnyte.com/integration/cfs/api-docs/comments-api)
- [Search](https://developers.egnyte.com/integration/cfs/api-docs/search-api), [metadata](https://developers.egnyte.com/integration/cfs/api-docs/metadata-api), [trash](https://developers.egnyte.com/integration/cfs/api-docs/trash-api)
- [Workflows](https://developers.egnyte.com/integration/cfs/api-docs/workflow-api) and [audit v1](https://developers.egnyte.com/integration/cfs/api-docs/audit-reporting-api/v1)
