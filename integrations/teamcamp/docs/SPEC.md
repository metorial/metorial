# Teamcamp API guide

Teamcamp's [documented API](https://api.teamcamp.app/api-reference/introduction) is in public beta. Requests use HTTPS and the `apiKey` header. Generate a key in [account settings](https://dash.teamcamp.app/settings/apikey); no workspace ID or separate configuration is needed. The key's [verification response](https://api.teamcamp.app/api-reference/auth/verifyApiKey) identifies the connected workspace. No OAuth refresh applies.

## Discovery

- `get_workspace_identity`: verify the key and retrieve workspace identity.
- `list_users` and `list_customers`: discover workspace users and customers.
- `list_projects`: discover project IDs before project/task operations.
- `list_project_groups`: retrieve group IDs for a selected project. `get_project` also retains its optional `includeGroups` behavior.
- `get_project_details`: retrieve extended settings, members, labels, and custom status IDs for task writes.

## Projects and tasks

`get_project`, `create_project`, `update_project`, and `delete_project` expose project management. Creation can associate a customer and use a known template ID. Project updates support dates, description, priority defaults, estimates, and milestone settings.

`list_tasks` accepts a project ID and an optional completion filter: `true` selects complete tasks, `false` selects incomplete tasks, and omission selects all tasks. `get_task`, `create_task`, and `update_task` cover task details and writes; `post_task_comment` posts comments. Priority inputs use 0=None, 1=Urgent, 2=High, 3=Medium, 4=Low. Dates use `yyyy-MM-dd`.

Most endpoints use `https://api.teamcamp.app/v1.0`. The official [task update](https://api.teamcamp.app/api-reference/task/updateTask) and [extended project detail](https://api.teamcamp.app/api-reference/project/getProjectDetails) examples instead specify `https://back.teamcamp.app/api/v1`; those operations use that host with the same documented authentication.

Task file inputs reference existing files by type, URL, name, and numeric byte size; byte size is serialized as the provider's documented string. These tools do not upload or download file bytes.

## Response fidelity and limits

Existing tool keys and schema types remain stable. Optional scalar summaries are emitted only for compatible provider values, including real empty strings, zero, and false. The complete provider JSON is preserved in `raw` for each resource/list response. For `get_project` with groups, `raw` contains both fetched responses. Task read/create documentation describes string priorities; the legacy numeric priority summary is omitted for those strings and the original value remains in `raw`. Numeric task milestone IDs retain their legacy string summary and original numeric value in `raw`.

Required response fields are validated rather than fabricated. Unexpected responses raise a service error. After a write, inspect the resource before retrying because the operation may already have completed. Project deletion reports the HTTP success acknowledgement.

The current API reference lists no task-delete, comment-list, template-discovery, time-log, invoice, webhook, or event endpoints. Their availability outside this reference is unverified; no unsupported operations or event triggers are advertised. The documented list endpoints expose no pagination controls. API acceptance and live account behavior require separate verification.
