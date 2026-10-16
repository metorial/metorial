# Timelink API integration

Timelink tracks work for clients, projects, services, and users. The current API
uses `https://api.timelink.io/api/v1` and API tokens created under **My Account >
API Tokens**. Requests use `Authorization: Bearer <token>`. No OAuth refresh or
additional connection settings are required.

Official references:

- [API setup and token management](https://docs.timelink.io/api)
- [Interactive API documentation](https://api.timelink.io/documentation)
- [Published OpenAPI schema](https://api.timelink.io/docs?api-docs.json)

## Current tools

- `list_records`: discover clients, projects, services, users, or time entries.
  Accepts documented search, sort, ID, and resource-specific filters. Returns
  one page, its original pagination metadata when supplied, and the number of
  records on that page. The published API schema does not specify a page or
  cursor request parameter; the tool does not claim to traverse all pages.
- `get_record`: retrieve any of those records by string ID, including services
  and users.
- `manage_client_record`, `manage_project_record`, `manage_service_record`:
  create, update, or permanently delete records. Create requires a name;
  update and delete require a string ID from `list_records`. Updates use PATCH
  and send only supplied fields. Nullable fields accept null to clear a value.
- `manage_time_entry_record`: create, update, or permanently delete time entries.
  Create requires a user string ID and start time. The end time may be omitted
  or null for a running entry. Supports client/project/service assignment,
  billable status, billing timestamp, interruption status, external ID, and
  temporary ID. Billing time does not represent payment status.
- `list_active_time_entries`: retrieve a page of running entries.
- `get_time_entry_fields`: inspect company-specific required entry fields.
- `get_current_token`: inspect the connected token's identity, abilities, and
  timestamps. This identifies the credential, rather than a user.
- `get_company`: identify the company and retrieve its provider-reported contact,
  subscription, integration, and settings details.

Current resource IDs are strings. Returned records retain provider field names
and original values, including nullable fields. Mutations require a provider
success confirmation. Downloads, exports, administrative user changes, image
uploads, and webhook subscriptions are outside this tool set.

## Compatibility

The 17 earlier numeric-ID tools remain registered and deprecated with their
original input/output schemas, invocation handlers, and client behavior. Their
descriptions point to the current replacements. The published current API uses
string resource IDs, `data` response envelopes, `/timeEntries`, `started_at`,
`ended_at`, and `ext_tool_id`; these differ from the legacy assumptions.

| Earlier tools | Current replacement |
| --- | --- |
| `list_users`, `list_clients`, `list_projects`, `list_services`, `search_time_entries` | `list_records` with the corresponding resource |
| `get_client`, `get_project`, `get_time_entry` | `get_record` with the corresponding resource |
| `create_client`, `update_client` | `manage_client_record` with create or update |
| `create_project`, `update_project` | `manage_project_record` with create or update |
| `create_service`, `update_service` | `manage_service_record` with create or update |
| `create_time_entry`, `update_time_entry`, `delete_time_entry` | `manage_time_entry_record` with the corresponding action |

Legacy numeric IDs must not be converted into current ULIDs. Discover current
IDs with `list_records`. There is no documented current `paid` field; use
`billedAt` only when recording billing time. The continued availability of legacy
routes has not been verified.
