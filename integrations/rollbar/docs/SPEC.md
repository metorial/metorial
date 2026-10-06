# Rollbar API coverage

The integration uses the current Rollbar REST API at `https://api.rollbar.com/api/1` with the `X-Rollbar-Access-Token` header. Project tokens authorize one project; account tokens select projects using the optional `projectId` input. Read tools need `read`, management writes need `write`, and occurrence/deploy reporting needs a separate project `post_server_item` token. Account/project credentials do not have a documented current-user identity endpoint.

Supported workflows:

- List/search items; get by ID, project counter or ingestion UUID; update status, title, severity and assignment.
- Report message occurrences, list/read occurrences, and request asynchronous permanent deletion.
- Report, list and retrieve deploys.
- List/create/get/delete projects and teams; manage team users, invitations and project associations; list account users.
- Create encrypted project tokens, list public identifiers, update rate limits and delete selected tokens.
- Start RQL queries, list project jobs, inspect job states, retrieve results and cancel pending jobs.
- Retrieve top-active, occurrence-count and daily activated-count reports; list environments and inspect versions/items.
- Create/list/read/update/delete notification rules and service links.

All previous tool keys, input number types and optional fields are retained. The archived item status remains accepted for compatibility, while the current item-update reference guarantees only active/resolved/muted. Notification creation sends arrays; individual operations use singular `rule` routes. Service-link partial updates read the existing link and send a full PUT replacement. Encrypted token secrets may be absent from list/update responses; their public identifiers cannot authenticate API calls.

Version details require an environment name from `list_environments`. Version item lists also require an explicit event: `new`, `repeated`, `reactivated` or `resolved`. These inputs remain optional in the schema for compatibility and are validated when needed. RQL job listing makes jobId/status optional in that tool's output; get/results/cancel retain their existing values.

Ingestion acceptance is asynchronous; numeric occurrence IDs become available after indexing. Permanent occurrence deletion can take minutes and does not update item counts or refund quota. Deploy history has no documented per-deploy deletion endpoint. RQL requires Analyze entitlement; completed queries/results are retained for seven days, while historical job records remain. Symbol upload, session replay, person-data deletion and automatic event subscriptions are outside the implemented surface.

Authoritative sources: [REST overview](https://docs.rollbar.com/reference/getting-started-1), [endpoint index](https://docs.rollbar.com/llms.txt), [RQL](https://docs.rollbar.com/docs/rql), and [project token configuration](https://docs.rollbar.com/docs/project-configurations).
