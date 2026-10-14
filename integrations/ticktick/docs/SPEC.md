# TickTick API specification

TickTick provides an OAuth 2.0 Open API at `https://api.ticktick.com/open/v1`.
The [official API reference](https://developer.ticktick.com/docs/index.html#/openapi)
was checked on 2026-10-13 in the public developer documentation.

## Authentication

OAuth authorization uses `https://ticktick.com/oauth/authorize`, with the
`tasks:read` and `tasks:write` scopes. Token exchange uses
`https://ticktick.com/oauth/token`: form-encoded authorization code, redirect URI,
grant type, and scopes, with the client ID and secret in HTTP Basic auth.
API requests use `Authorization: Bearer <token>`.

The official reference documents the `authorization_code` grant. Existing
refresh tokens remain supported for compatibility, but that legacy refresh flow
is not currently documented. A connection without a refresh token must be
reauthorized if its access token expires. Existing OAuth profile retrieval and the `get_user` tool keep the legacy
`/user` endpoint for compatibility, although it is not described in the current
official reference. Its availability remains unverified.

## Supported tools

- Task create, get, update, complete, and delete use the documented task endpoints.
- Project list, get, create, update, and delete use the documented project endpoints.
- `get_project` can include tasks and kanban columns through project data.
- `batch_tasks` sends create/update arrays to `POST /task/batch`, up to 50 entries
  each. Returned task IDs and per-task errors determine success. Requested
  removals use individual task DELETE requests after creates and updates succeed.
  Earlier operations can remain applied if a later request fails.
- `search_tasks` uses `POST /task/search`, with optional text, project IDs, tags,
  status codes, and due-date filters.
- `list_completed_tasks` uses `POST /task/completed`, with optional project IDs
  and inclusive completion-time boundaries. The provider returns at most 200
  tasks; no pagination is documented.
- `move_tasks` sends an array of source-project, destination-project, and task IDs
  to `POST /task/move`, exposing the IDs and etags confirmed by TickTick.

Use `list_projects` to discover project IDs before acting on tasks or lists.
Task update title is optional; omitted titles are not replaced with an empty
string. Checklist items support existing item IDs and completion timestamps.
Date-time fields follow the provider's `yyyy-MM-dd'T'HH:mm:ssZ` format.

The current create-task documentation requires a project ID. The existing
optional public project input remains for compatibility; callers should provide
an ID from `list_projects`. Creation in the inbox by omitting this ID is not
verified. Empty create responses produce a clear error advising discovery before
retrying; empty update responses are followed by a read of the updated resource.

## Verification limits

Local builds and static checks do not establish live-provider acceptance.
No live E2E, evals, or production OAuth round trips were performed for this refresh.
