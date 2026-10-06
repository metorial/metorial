# Hex

Read and manage project metadata, run published apps, inspect run status, manage sharing/groups/collections, inspect safe data-connection metadata, and download project exports.

Authenticate with a personal (`hxtp_`) or workspace (`hxtw_`) token. Tokens inherit permitted access; workspace tokens have selected read/run/write scopes. The optional HTTPS deployment origin belongs to authentication and defaults to `https://app.hex.tech`. EU/HIPAA/single-tenant Hex origins and older stored config origins remain supported. Authentication verifies the actual workspace. Expired tokens require reconnecting with a renewed provider token.

## Tools

| Workflow | Tools |
| --- | --- |
| Identity | Get Current User |
| Projects | List Projects, Get Project, Create Project, Update Project Status, Manage Project Sharing |
| Published apps | Run Project, Get Run Status, Cancel Run, List Project Runs, Create Embedding URL |
| Download | Export Project |
| Users | List Users, Deactivate User |
| Groups | List Groups, Get Group, Manage Group, Delete Group |
| Collections | List Collections, Get Collection, Manage Collection |
| Data metadata | List Data Connections, Get Data Connection, Get Queried Tables |

Lists return one page and real continuation metadata. `returnedCount` is a page count, not a workspace total. Email-only creator/owner metadata does not gain invented IDs/names. User names can be null; some legacy descriptions/timestamps are absent. Data-connection configuration and credentials are excluded.

## Effects and limits

Project creation makes an empty draft, without publication/execution. Runs execute the latest published version and can incur SQL/Python, compute, warehouse and explicitly requested notification effects. Accepted requests are not completed runs; cancellation acknowledgement does not prove execution stopped. Inspect run status. Deprecated `updateCache` is preserved separately from current cache/result options.

Sharing categories update sequentially and can partially succeed. Inspect sharing after errors before retrying. Public web sharing can disclose an app. Group membership and user deactivation change access. The public API has no project/collection deletion, publication, or individual run-history deletion endpoint; no undocumented substitute is provided.

Embedding links are single-use access credentials. `expiresIn` remains **seconds**, exactly converted to the provider's milliseconds: greater than zero, at most 300, with millisecond precision. Legacy pdf/csv scopes and base-padding controls remain supported. Unsupported `showHeader` must be omitted; separate run-button/footer controls are available. Test mode does not execute the app or count embedding usage. Opening an ordinary link can execute it.

Export downloads a `.hex.yaml` draft/latest/specific-version file without executing the project. It can contain accessible code/configuration and must be handled according to its sensitivity. The ordinary result contains sanitized file metadata, not inline file content.

Core administration needs appropriate Team/Enterprise permissions; queried tables require Enterprise. Directory Sync can restrict user/group management. Limits vary by workspace/endpoint. Retained user CREATED_AT and collection CREATED_AT/sort-direction fields are unsupported by the current API and fail with remediation; use user NAME/EMAIL or collection NAME sorting.

Official [overview](https://learn.hex.tech/docs/api-integrations/api/overview), [reference](https://learn.hex.tech/docs/api-integrations/api/reference), and [OpenAPI](https://static.hex.site/openapi.json).

## License

Licensed under [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
