# Convex API coverage

The integration operates on the deployment origin configured by the user. Its seven original tool keys and field types remain available. Deployment identity and file download are the two additional capabilities. No triggers or hosted Management API mutations are included.

| Capability | Contract |
| --- | --- |
| Queries, mutations, actions | `POST /api/query`, `/api/mutation`, `/api/action`; `{path,args,format:"json"}`. A successful envelope supplies `value`; an error envelope fails the invocation. |
| Consistent snapshot | `GET /api/list_snapshot`; `format`, optional `tableName`, opaque `cursor`, decimal `snapshot`. Returns documents, decimal `snapshotId`, a cursor string (empty at exhaustion), and `hasMore`. |
| Incremental changes | `GET /api/document_deltas`; `format`, optional `tableName`, required decimal cursor. Start with the timestamp from a completed snapshot. |
| Environment variables | `GET /api/v1/list_environment_variables` maps the `environmentVariables` dictionary to name/value rows. `POST /api/v1/update_environment_variables` sends `changes`; omitted values delete variables. |
| Deployment identity | `GET /api/v1/deployment_info`; cloud identity includes deployment/team/project IDs and deployment type; self-hosted identity reports `kind`. |
| Upload URL | Execute a deployed mutation returning `ctx.storage.generateUploadUrl()`. The original key retains an object input and gains optional `functionPath` and `args`, with runtime guidance when the required function path is absent. |
| Download | Execute a deployed query returning `ctx.storage.getUrl(storageId)` and prepare the resulting same-deployment storage URL for download. Metadata contains the filename and optional MIME type. |

Deploy keys and team/project OAuth application tokens use `Authorization: Convex <token>` on deployment APIs. OAuth authorization uses `/oauth/authorize/project` or `/oauth/authorize/team` on `dashboard.convex.dev`; token exchange on `api.convex.dev/oauth/token` is form encoded. Dedicated Project OAuth and Team OAuth methods keep the tiers distinct. The legacy OAuth selector and its default remain for compatibility. No refresh grant or expiry is invented where current provider documentation defines none.

Streaming Export pagination timestamps and each record's `_ts` metadata are returned as exact decimal strings, preserving nanosecond precision. Application document fields keep their provider JSON representation. Continuations must retain the original snapshot timestamp; repeated or regressing cursors fail clearly. These endpoints require the account's Streaming Export feature and appropriate deployment data-view permission; the integration does not activate a plan feature. Queries and writes are single requests with bounded timeouts and redirects disabled. Validation, HTTP/API failures and function error envelopes produce user-facing errors without returning credential-bearing request data or deployment log lines.

Environment values are intentionally returned under the existing list contract. Download URLs are bearer capabilities and carry no administrative credential. Their origin, storage route and supported component query are validated; upload endpoints and unexpected credential-bearing query fields are rejected as download targets. Upload URLs require the provider's signed token. No expiration or renewal is claimed for ordinary Convex file URLs. Arbitrary custom HTTP actions and cross-origin file hosts are outside this file workflow.

Official contracts: [HTTP API](https://docs.convex.dev/http-api/), [deployment authentication](https://docs.convex.dev/deployment-platform-api), [deployment identity](https://docs.convex.dev/deployment-api/get-deployment-info), [list environment variables](https://docs.convex.dev/deployment-api/list-environment-variables), [update environment variables](https://docs.convex.dev/deployment-api/update-environment-variables), [OAuth](https://docs.convex.dev/platform-apis/oauth-applications), [file upload](https://docs.convex.dev/file-storage/upload-files), [file serving](https://docs.convex.dev/file-storage/serve-files).
