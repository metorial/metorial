# Bonsai API coverage

Bonsai publishes a [REST API reference](https://docs.hellobonsai.com/api) and an
[OpenAPI document](https://docs.hellobonsai.com/api/openapi.json). API requests use
a bearer access token from Settings → Integrations → API. Keys inherit the
member's permissions, can expire, and can be revoked. The existing API-key
authentication method remains available; OAuth connection setup is not included.

## Task operations

`create_task`, `list_tasks`, and `get_task` use `/public-api/v1/tasks`.
`list_team_members` and `list_task_statuses` discover the assignment and board
column values used by task creation. Lists follow `meta.pagination.has_more`
with `page[number]` and `page[size]`.

Task IDs are UUIDs. Project IDs are numeric identifiers represented as strings
in tool input and output. `timeEstimate` remains measured in hours; requests
convert it to the positive whole minutes required by the API, and responses
convert back to hours. `assigneeEmail` resolves an existing team member's email
to `assignee_member_id`. `status` resolves a board column name to
`task_status_id`, accepting equivalent underscore spellings. Tag names resolve
existing task tags to `tag_ids`. `billingType` accepts `billable` and
`non_billable` and maps to the API's boolean `billable` field; Bonsai may ignore
this setting if the plan or token lacks billing write permission.

Task lists request scope `all`, so completed and archived tasks are included.
The provider omits descriptions in lists; `get_task` returns the description.
Task lists expose member IDs because the public task response does not include
assignee email addresses. Billing fields can be absent without the appropriate
permission.

## Legacy connector compatibility

The following tools keep their existing `/api/v1` connector routes and payloads:

- `create_client` and `list_clients`
- `create_project` and `list_projects`
- `create_deal` and `list_deals`
- `create_tasks_from_template` and `list_task_templates`

The official [Zapier guide](https://help.hellobonsai.com/en/articles/476830-zapier)
still documents client, project, deal, task, and task-template creation actions,
but it does not publish their HTTP paths or payloads. The public REST API uses
different contracts: contacts require both name and email; projects require
company and billing configuration; deals require a company. Public templates
currently represent documents, not task templates. Switching these tools to
those endpoints would change existing input meanings or requirements, so the
existing connector behavior is retained. Their endpoint availability, accepted
payloads, pagination, and legacy-key compatibility require provider runtime
verification. Omission from the public reference is not proof that a legacy
endpoint has been removed.

All tools now accept a successful `data` response envelope while preserving
legacy resource wrappers and direct arrays. Numeric identifiers are returned as
strings, and provider decimal-string deal values are returned as numbers to
preserve the existing tool schemas. Malformed lists and missing identifiers
produce clear errors rather than empty success results.

The published OpenAPI endpoint inventory has no account/profile/self resource.
Descriptions mention a permissions endpoint, but its response schema is not
published there; an identity tool has not been invented from that mention.

No file download, export, or generation tools are exposed. Current behavior was
checked against official documentation and local builds; provider execution and
credential compatibility have not been verified.
