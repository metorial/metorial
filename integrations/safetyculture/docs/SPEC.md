# SafetyCulture Integration Specification

SafetyCulture, now Mitti, provides workplace inspection and operations APIs. This integration keeps the SafetyCulture name and the supported `https://api.safetyculture.io` API host for existing connections.

## Authentication

Use a user API token or a service user API token with Bearer authentication. API access requires a Premium or Enterprise plan. Permissions, group/site membership, and sharing rules determine the records and operations available to a token. Token creation and inactivity expiry are managed in the provider web app; there is no OAuth token refresh flow.

The connection accepts an API token. Provider access is checked when a tool runs. `get_connections` retrieves the authenticated token's group and organization connections when its owner has the `Platform management: Groups` permission.

## Supported tools

| Area | Tools |
| --- | --- |
| Connections and assignments | `get_connections`, `list_users_and_groups`, `list_sites` |
| Inspections | `search_inspections`, `get_inspection`, `manage_inspection` |
| Templates | `list_templates`, `get_template` |
| Corrective actions | `list_actions`, `create_action`, `update_action`, `delete_actions` |
| Issues | `list_issues`, `get_issue`, `create_issue`, `update_issue`, `add_issue_comment` |
| Assets | `list_asset_types`, `manage_assets` |
| Inspection schedules | `manage_schedules` |

`manage_inspection` starts, completes, archives, deletes, or assigns an inspection's owner/site and exports PDF or Word reports. If an export is processing, repeat the same request until it returns a downloadable file. Inspection and template search endpoints return their documented identifier and modification fields; retrieve an individual record for full details.

Action and issue status/priority inputs accept provider IDs or the built-in names documented in their field help. Assignment inputs contain user IDs discovered through `list_users_and_groups`. Creating an issue applies its supported priority, assignees, and due date through follow-up updates after the provider creates it.

`list_sites` returns leaf entries from the organization directory's site domain. `list_asset_types` discovers type IDs and can include the organization field catalog. Use asset field IDs as keys in `manage_assets.fields`; values can be text or provider value objects such as `{ "timestamp_value": "2026-10-13T08:00:00Z" }`. Field associations vary by asset type.

`manage_schedules` uses the provider's supported legacy schedule-item API. `frequency` accepts an RRULE string, such as `FREQ=WEEKLY;BYDAY=MO;INTERVAL=1`, or a simple cadence such as `daily`. `startTime` is an ISO date/time for when the schedule begins. Optional `startHour` and `startMinute` specify the occurrence start clock time, and `duration`/`toDate` define its completion window and end date. The provider uses the authenticated user's profile timezone. Listing can filter the current returned page by template and returns the provider pagination token for subsequent pages.

## Official references

- [API introduction, requirements, host compatibility, and permissions](https://developer.mitti.com/reference/introduction)
- [Authentication](https://developer.mitti.com/reference/authentication)
- [Connections](https://developer.mitti.com/reference/thepubservice_getusergroups)
- [Inspections](https://developer.mitti.com/reference/inspections)
- [Action creation](https://developer.mitti.com/reference/actionsservice_createaction)
- [Issues](https://developer.mitti.com/reference/incidentsservice_submitincident)
- [Asset types](https://developer.mitti.com/reference/typesservice_listtypes)
- [Legacy inspection schedules](https://developer.mitti.com/reference/schedulesservice_createscheduleitem)
