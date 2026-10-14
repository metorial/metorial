# TimeCamp API integration

## Authentication

Get an API token from [Profile Settings](https://app.timecamp.com/app#/settings/users/me).
Requests use `Authorization: Bearer <token>` and the documented production base
URL `https://app.timecamp.com/third_party/api`. The token inherits the user's
permissions. Request limits depend on the account subscription and exceeding
those limits returns HTTP 429.

`get_current_user` returns the user's ID, profile, root group ID, and permissions.
`list_users` and `list_groups` provide account resource discovery.

## Time tracking

Time entries use the current v3 list, create, update, and delete routes. The
provider documents November 1, 2026 as the end of support for the corresponding
v1 routes. Existing public tool fields remain available, including
comma-separated task/user filters and the `me` user filter.

Create an entry with a duration or a start/end datetime pair. Datetime pairs
must be on the same date; split entries spanning midnight. If `date` is
omitted, the start datetime's date is used, or the current UTC date for a
duration-only entry. A missing entry deletion returns `deleted: false`.

`manage_timer` uses v3 status, start, and stop routes and returns the associated
time entry ID when available. Nullable task and timer metadata are omitted.

## Projects and tags

Projects are top-level tasks. `list_tasks` supports active, archived, and all
status filters. Creation handles the provider's dictionary response keyed by
task ID. Existing legacy task tag and billing fields remain supported by the
public task tools; the provider marks some of them deprecated in its reference.
The existing task deletion route is also deprecated, while its recommended
replacement queues asynchronous deletion.

Call `list_tag_lists` to discover tag list IDs. `manage_tag` requires a
`tagListId` when creating a tag, and an existing `tagId` when renaming one.
`list_tags` can query a specific list or collect tags across visible tag lists.

## Attendance

`get_attendance` accepts `date` for a single day, or `from` and `to` for a date
range. These map to the documented `from`, `to`, and `users` query parameters.
Attendance and other account features remain subject to provider permissions
and subscription availability.

## Existing client and invoice routes

The pre-existing client and invoice tool keys and routes are retained. The
current official OpenAPI reference does not describe `/clients` or `/invoices`;
their provider payloads and availability could not be confirmed in this refresh.
Their HTTP failures use the same structured API error handling as documented
routes, and creation does not claim success without a returned resource ID.

## Sources

- [Official API reference](https://developer.timecamp.com/)
- [Official OpenAPI specification](https://developer.timecamp.com/reference/dist/api-prod.yaml)
- [API token and request limits](https://help.timecamp.com/help/api)
