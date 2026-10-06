# Convex

Invoke deployed queries, mutations and actions, inspect deployment identity, read document snapshots and changes, manage environment variables, and work with storage upload URLs and downloadable files.

Configure the deployment origin, usually `https://your-deployment.convex.cloud`. HTTPS self-hosted origins and loopback HTTP are supported where their deployment APIs are available. The hosted Management API at `api.convex.dev` and HTTP action URLs ending in `.convex.site` are separate APIs.

Use a deployment deploy key or a Convex OAuth application token. Project OAuth limits access to one authorized project; Team OAuth grants broader team access. The legacy OAuth method retains its existing team/project selector for saved connections. Convex selects the authorization tier through distinct authorization URLs, rather than OAuth scope names. Register the exact callback URL in the Convex application. Current Convex OAuth documentation does not describe expiring tokens or a refresh grant; reconnect when authorization is revoked.

All deployment API requests use the `Convex` authorization prefix for these administrative credentials. They are not user JWTs. `get_deployment_info` identifies the configured cloud deployment and its team/project, or reports a self-hosted deployment without inventing cloud identifiers.

| Tool | Outcome |
| --- | --- |
| `run_query` | Read the result of a deployed query. |
| `run_mutation` | Execute a deployed transactional write function. |
| `run_action` | Execute a deployed action, potentially including external effects. |
| `list_documents` | Read one consistent snapshot page, optionally restricted to a table. |
| `get_document_deltas` | Read changes after a completed snapshot or previous change cursor. |
| `manage_environment_variables` | List values, set values, or delete a named variable. |
| `generate_upload_url` | Invoke a deployed upload mutation and obtain a temporary POST URL. |
| `get_deployment_info` | Identify the current deployment and its type. |
| `download_file` | Obtain a downloadable storage file through an authorized deployed query. |

Function paths use `module:functionName`, including nested modules. Arguments must match the deployed function. Failed function execution returns an error; null, false, zero and empty-string successful values are preserved. Mutations and actions can affect application data, external services or costs. HTTP writes are not automatically retried.

Snapshot and change tools require Streaming Export availability on the account's existing plan. Complete the snapshot before passing its `snapshotId` to `get_document_deltas`. Keep timestamp strings intact; they are 64-bit values and must not be converted to JavaScript numbers. Continue snapshots with both their opaque `cursor` and original `snapshotId`. An empty snapshot cursor means no cursor remains. Continue changes while `hasMore` is true, retaining the returned cursor.

To set an environment variable, provide `{ "name": "EXAMPLE", "value": "text" }` in `changes`. To delete it, omit `value`; `value: ""` stores an empty string. Listing returns the current values, including secrets, so share results only with authorized recipients.

For uploads, pass `functionPath` for a deployed mutation that returns `ctx.storage.generateUploadUrl()` and any required arguments. Convex does not expose a public REST route that directly generates upload URLs. POST the file bytes to the returned URL within its one-hour validity, then save the returned `storageId` through an application mutation if needed.

For downloads, pass a query that returns `ctx.storage.getUrl(storageId)` as a URL string, with its expected arguments. The query controls authorization. The returned URL must target storage on the configured deployment; no deploy key is sent to the file URL. Convex storage URLs grant access to anyone holding them until the file is deleted. Applications requiring authorization on every download should serve files through their own authenticated HTTP actions instead.

This integration targets an existing deployment. It does not provision projects/deployments, deploy code, change billing, issue credentials, or manage scheduled functions. No event triggers are registered.

Official documentation: [HTTP functions](https://docs.convex.dev/http-api/), [deployment credentials](https://docs.convex.dev/deployment-platform-api), [OAuth applications](https://docs.convex.dev/platform-apis/oauth-applications), [uploading files](https://docs.convex.dev/file-storage/upload-files), [serving files](https://docs.convex.dev/file-storage/serve-files).
