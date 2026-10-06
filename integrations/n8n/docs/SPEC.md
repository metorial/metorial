# n8n Public API contract

Retains 23 existing public keys and input field types; adds only `discover_api` (GET `/discover`). Shared `X-N8N-API-KEY` client uses the credential-bound explicit `/api/v1` root, no redirects, 30-second timeout and 8 MiB request/response bounds. Native failures expose safe status/remediation without retaining raw transport parents. Successful response credentials, including encoded representations, are refused. This does not certify shared internal tracing.

| Capability | Native routes and limits |
| --- | --- |
| Workflow list/get/create/update/delete | `/workflows`, `/workflows/{id}`; cursor pagination; current native record validation; complete replacement hydration; local optional version guard with no atomic CAS. |
| Historical definition | `/workflows/{id}/versions/{versionId}`; documented deprecated `/workflows/{id}/{versionId}` read fallback only on 404. History availability and permissions apply. No fabricated active state. |
| Publication | Existing `/workflows/{id}/activate` and `/deactivate`; documented current compatibility routes. Activation/version selection can put automation live. |
| Workflow tags | GET/PUT `/workflows/{id}/tags`; complete replacement payload is an array of `{id}` records. |
| Executions | `/executions`, `/executions/{id}`, `/retry`, `/stop`; positive integer IDs preserved as strings; nullable native timestamps omitted rather than invented. Retry starts a different execution; stopping reports native status. |
| Credentials | `/credentials`, exact metadata `/credentials/{id}`, create/delete, `/credentials/schema/{type}`, transfer; metadata only, never credential data. Native schemas depend on installed node types. |
| Users | `/users` or exact `/users/{id}`; native permission/scopes and nullable fields. No current-user inference. |
| Tags / variables / projects | Native documented resource routes, cursor lists and project-member routes. Variable creation 201 and variable/project updates 204 may have empty bodies; accepted receipts do not invent IDs, values or timestamps. |
| Transfers | PUT workflow/credential `/transfer`; native 204 acceptance, project permissions and feature availability apply. |
| Source control / audit | POST `/source-control/pull` with verified force/autoPublish contract; per-resource/partial effects. Legacy variable override field is retained but explicitly refused before pulling. POST `/audit` with native categories and integer threshold. |
| Capability discovery | Native scoped data from `/discover`, optional `include=schemas`/resource/operation. Not version, license, identity or complete authorization proof. |

All list tools preserve native cursors and reject invalid page limits. Missing native envelopes never become successful empty lists. Dynamic workflow fields outside the verified replacement contract require direct deployment-specific API handling. Optional workflow JSON delivery uses bounded retrieved content, without an invented file URL or renewal endpoint. No legacy triggers existed and none were added.

Primary references: [authentication](https://docs.n8n.io/connect/n8n-api/authentication), [pagination](https://docs.n8n.io/connect/n8n-api/pagination), [workflows](https://docs.n8n.io/connect/n8n-api/workflow), [executions](https://docs.n8n.io/connect/n8n-api/executions), [credentials](https://docs.n8n.io/connect/n8n-api/credential), [projects](https://docs.n8n.io/connect/n8n-api/projects), [users](https://docs.n8n.io/connect/n8n-api/user), [tags](https://docs.n8n.io/connect/n8n-api/tags), [variables](https://docs.n8n.io/connect/n8n-api/variables), [source control](https://docs.n8n.io/connect/n8n-api/source-control), [audit](https://docs.n8n.io/connect/n8n-api/audit), [discovery](https://docs.n8n.io/connect/n8n-api/discover).

## Review safeguards

Requests and native responses are screened before dispatch/projection for bounded raw, percent, Unicode and nested Base64 credential reflection, including hidden descriptor data and byte values. Lists reject results larger than an explicit limit and empty/nonadvancing cursors. Explicit historical publication requires the returned native published-version ID to match the requested version; incomplete receipts retain write uncertainty. These local checks do not imply universal trace privacy. Controlled private cleanup binds the original run/profile/credentials/fixtures and refuses incomplete native inventories or unbound published definitions. Credential destructive scenarios stay gated because visible workflow lists and metadata cannot prove complete credential associations; supported public create/delete routes remain available.
