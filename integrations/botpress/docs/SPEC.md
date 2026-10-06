# Botpress integration

Use a Personal Access Token from Botpress Profile Settings. The connection identifies the account through `GET /v1/admin/account/me`; bot and integration access keys do not have the account/admin permissions required by this authentication method.

Discover authorized workspaces with `list_workspaces`, then bots with `list_bots`. Pass the chosen workspace or bot ID to subsequent tools. Previously stored default IDs remain a compatibility fallback; new connections need no opaque setup IDs.

The integration provides:

- Account identity and workspace discovery.
- Bot create/get/update/delete, including tags, state/event definitions, and installed integration configuration.
- Conversation create/get/get-or-create/list/update/delete and participant list/add/remove.
- Message send/list/get/delete and runtime user create/get/update/delete/list.
- Table create/get/update/delete/list and row create/get/find/update/delete/upsert, with documented pagination and batch limits.
- File metadata, UTF-8 text upload, list/get/delete, indexed search, and downloadable files.
- Custom event submission, declared persistent state get/set/patch, bot analytics, logs, and issues.
- Integration discovery and retrieval by ID or name/version.

Runtime requests act as the bot by default. For integration-specific operations, provide the installed integration ID or instance alias. Channels and tag keys must be declared by that integration. Creating a conversation does not install its channel; install and configure the integration on the bot first.

Bot analytics default to the last seven days. Logs default to the last 24 hours; keep the returned start/end times when following the pagination token. Log sorting applies within each returned page. State names must be declared in the bot definition. The retained legacy `task` state value is rejected because the current Runtime API has no task state.

File upsert accepts either a byte size for a subsequent PUT upload, or UTF-8 content whose size is calculated automatically. `get` with `download: true` prepares the uploaded file for download. Existing URL output fields remain available for compatibility; temporary URLs should be used promptly. Row batches return accepted rows and any per-row errors; inspect errors before retrying. Upserts include inserted and updated rows separately as well as their combined rows. Filter-based row deletion may start an asynchronous provider job, whose ID and status are returned. Use explicit row IDs for immediate targeted deletion.

Bot source-code deployment, arbitrary action execution, account billing/member administration, and platform event subscriptions are outside this integration's tool surface.

Official API contracts: [Admin](https://botpress.com/docs/api-reference/admin-api/getting-started/), [Runtime](https://botpress.com/docs/api-reference/runtime-api/getting-started/), [Tables](https://botpress.com/docs/api-reference/tables-api/getting-started/), [Files](https://botpress.com/docs/api-reference/files-api/getting-started/), and [Authentication](https://botpress.com/docs/api-reference/authentication/).
