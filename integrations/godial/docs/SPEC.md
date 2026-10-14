# GoDial Specification

GoDial Enterprise organizes outbound calling around teams, member accounts, calling lists, and contacts. This integration exposes seven tools for discovering those resources and adding contacts or members.

## Authentication

Obtain an API access token from **Dashboard → Integration → External API** using a manager account. The integration sends `access_token` as a query parameter with every request to `https://enterprise.godial.cc/meta/api/externals`.

The [official API guide](https://godial.cc/blog/integrating-your-website-or-crm-with-godial-using-api/) and the [developer documentation introduction](https://godial.stoplight.io/) specify query-parameter authentication. The [newer data-entry guide](https://godial.cc/blog/how-to-add-data-through-apis/) mentions an authorization header but does not give its format. Query authentication is retained according to the explicit API examples.

## Tools

| Tool | Request | Output |
| --- | --- | --- |
| `list_lists` | `GET /lists/list` | Calling list records in `lists` |
| `list_contacts` | `GET /contact/list/{listId}` | Contact records in `contacts` |
| `add_contact` | `POST /contact/add` | Provider response in `contact` |
| `list_teams` | `GET /team/list` | Team records in `teams` |
| `add_member` | `POST /accounts/add` | Provider response in `member` |
| `list_accounts` | `GET /accounts/list` | Account records in `accounts` |
| `remove_account` | `POST /accounts/remove`, body `{ "id": accountId }` | Provider response in `result` |

Call `list_lists`, `list_teams`, or `list_accounts` to discover the resource IDs required by subsequent tools. `remove_account` is destructive.

The official API guide explicitly documents `/lists/list` and `/contact/add`. Contact creation sends the existing `listId`, `phone`, `name`, `email`, `secondPhone`, `companyName`, `note`, `remarks`, `extra`, and `assignmentMode` JSON fields. Optional fields are omitted when absent; `assignmentMode` remains an unrestricted optional string, with `default` shown in the guide.

Member creation retains the existing `teamsId`, `name`, `username`, `password`, `role`, and optional `email` fields. The existing `role` values are `SubManager` and `Agent`. Non-empty required values and at least one team ID are validated before requests. List IDs used in a URL path are encoded as a single path segment.

## Response and documentation limits

List tools retain their array outputs and all record properties. Creation and removal tools retain the complete provider response under their existing output fields. HTTP and transport failures are reported as service errors; list responses that are not arrays are rejected instead of being reported as empty collections.

On 2026-10-14, the developer introduction remained reachable, but its linked detailed reference at `https://godial.stoplight.io/docs/godial/` returned HTTP 404. The available official guides do not document response schemas, pagination, the contact-list endpoint, or detailed member, account-removal, and team payloads. These existing contracts are retained without assuming the endpoints were removed. Additional tools and a current-account identity tool are deferred until official endpoint contracts are available.
