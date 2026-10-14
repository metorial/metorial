# Nozbe Teams API specification

Nozbe Teams, now branded as Nozbe, exposes task and project collaboration through
its REST API at `https://api4.nozbe.com/v1/api`.

## Authentication

Generate a token in Settings → API tokens. A space token accesses its space; a
global token accesses all authorized spaces. Requests use
`Authorization: apikey <API_TOKEN>`. Token setup checks access using `GET /teams`.
The API documents accessible users, but no current-user or self endpoint, so the
integration does not identify the token owner from an arbitrary user record.

## Supported tools

- Projects: `list_projects`, `get_project`, `create_project`, `update_project`,
  `delete_project`, and `manage_project_section`.
- Tasks: `list_tasks`, `get_task`, `create_task`, `update_task`, `delete_task`.
- Comments: `list_comments`, `create_comment`, `update_comment`, `delete_comment`.
- Tags: `list_tags`, `manage_tag`, `list_tag_assignments`, `assign_tag`.
- Space discovery: `list_teams` and `list_team_members`.

Call `list_teams` to discover a space ID before creating a project or public tag.
Call `list_tag_assignments` to discover an assignment ID before removing a tag.
`get_project` exposes the project space and archive state without scanning lists.

List tools support provider pagination using `limit` (1–10000, default 100) and
`offset` (0 or greater). `sortBy` accepts comma-separated fields with a `-` prefix
for descending order. Favorite, completion, and priority filters are sent to the
provider before pagination. Null-valued query filters are sent as the literal
`null` string, following the provider examples. Timestamps use milliseconds.

Comments support Markdown text and pinning. This integration does not currently
expose file upload/download, task recurrence, or project access management tools.

## Official references

- [REST API guide](https://nozbe.help/advancedfeatures/api/)
- [Interactive API documentation](https://api4.nozbe.com/v1/api)
- [OpenAPI specification](https://api4.nozbe.com/v1/api/openapi.yaml)
