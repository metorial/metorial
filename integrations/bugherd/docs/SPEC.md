# BugHerd integration specification

## Authentication

Uses BugHerd API v2 at `https://www.bugherd.com/api_v2` with HTTP Basic authentication: the API key is the username and `x` is the password. Find the organization API key in **Settings > General**. `get_organization` reads the authenticated organization's ID and name; connection profiles use the same endpoint.

## Projects and users

- `list_projects` lists projects, optionally restricting them to active projects or a user discovered with `list_users`. `page` starts at 1 and returns up to 100 projects. `createdSince` is available with `userId`.
- `get_project` returns settings, members, and guests. `create_project`, `update_project`, and `delete_project` manage projects. Deleting a project permanently removes its associated data.
- `update_project.permission` retains `guests_see_guests` and `guests_see_self` and maps them to BugHerd's boolean `guests_see_guests`. Existing member and guest additions remain available.
- `list_users` lists all users, members, or guests/clients. `page` starts at 1 and returns up to 100 users. `updatedSince` is supported only with role `all`. User timestamps are returned when the API supplies them.

## Tasks

- `list_tasks` lists project tasks by category (`all`, `feedback`, `archived`, or `taskboard`). It supports existing status, priority, tag, assignee, external ID, date, and page fields. Task pages contain up to 100 records. Where returned, `totalCount` uses the provider's count across pages.
- `list_user_tasks` lists tasks assigned to a user across projects, with documented priority, tag, assignee, date, and page filters.
- `get_task` looks up a global task ID, optionally scoped to a project. `get_task_by_local_id` resolves the project-scoped task number (`#number` in the UI) to its global task ID.
- `create_task` and `update_task` retain priority values `not set`, `critical`, `important`, `normal`, and `minor`. Status remains a string so custom column names are supported.
- `update_task.assignedToId: null` unassigns all users. `unassignUserId` removes one assignee. An update must contain at least one changed field.
- `move_tasks` sends project-scoped `localTaskId` values as `task_ids` to `/projects/{project_id}/move_tasks.json`, with `targetProjectId` mapped to `destination_project_id`. The endpoint may be unavailable for some accounts; contact BugHerd support on 404.

## Comments, attachments, and columns

- `list_comments` and `create_comment` retain task IDs from the request when a comment response omits `task_id`. Comments can be attributed by user ID or email and marked private.
- `list_attachments`, `add_attachment`, and `delete_attachment` manage task file metadata. `add_attachment` asks BugHerd to fetch a file from its publicly accessible URL. Direct file upload and downloading are not exposed.
- `list_columns` includes built-in and custom columns. `create_column` and `update_column` manage custom column names. A legacy `sortorder` field is returned when present, otherwise null.

## API behavior and limits

Provider failures are normalized to service errors. Requests use a 30-second timeout. BugHerd documents a sustained limit of 60 requests per minute plus a burst allowance of 10. List endpoints use pages starting at 1; an empty page signals the end.

The ID and page schemas updated in this refresh accept JSON numbers and require positive safe whole numbers at runtime. All original tool keys and enum values are retained. No webhook or trigger changes are included.

## Sources

- [BugHerd API reference](https://docs.bugherd.com/api)
- [Official OpenAPI specification](https://docs.bugherd.com/api/openapi.yaml)

The OpenAPI overview and individual operations disagree about task, column, and comment deletion. No new deletion tools were added without resolving that discrepancy.
