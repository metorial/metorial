# Agiled API integration

## Connections

**API Key & Brand** preserves the existing API connection: requests use
`https://my.agiled.app/api/v1`, the `api_token` query parameter, and the `Brand`
header. Its input and saved credential values are unchanged. Profile validation
lists users, while the connection profile identifies the configured brand; the
first user in a list is not treated as the authenticated user.

**Public API Key** uses the bearer token and API base URL shown in Settings → API.
Enter either the HTTPS API origin or its full `/public/v1` base URL. The base URL
and token are stored with this connection. No brand or workspace ID is required.
This connection exposes the three public API tools below; existing API tools
remain associated with API Key & Brand.

## Public API tools

| Tool | Request | Output |
| --- | --- | --- |
| `get_current_user` | `GET /public/v1/me` | Raw authenticated token context, including organization ID, token ID, and abilities where returned. |
| `get_accounts` | `GET /public/v1/accounts` | Account records and provider pagination metadata. Supports name/email filters, sorting, and includes. |
| `get_time_entries` | `GET /public/v1/time-entries` | Time-entry records and provider pagination metadata. Supports project/task/user/date filters, sorting, and includes. |

List tools send `page`, `per_page`, `sort_by`, `sort_direction`, and `include`
where supplied. The public API defaults to page 1 and 25 records, with at most
100 records per page. Records retain all provider fields, including identifiers,
timestamps, and included relationships.

## Existing API coverage

All 27 existing tool keys and their input/output fields are preserved. They
create/list/get contacts, projects, tasks, invoices, estimates, contracts,
employees, tickets, products, and deals; update contacts/projects/tasks; delete
contacts; and create expenses/time entries. Resource IDs are encoded as single
URL path segments. A task update with `markComplete: true` now also submits its
other supplied updates.

The existing API's detailed reference at
[the developer portal](https://my.agiled.app/developers) could not be read without
authentication. Current public API documentation describes a different API,
including different credential and field conventions, and does not establish
that the existing API was removed. Existing endpoint and payload conventions
therefore remain intact rather than being inferred from the newer API.

In particular, the existing completion request still uses `board_column_id: 2`;
the meaning of that legacy column ID could not be verified from current public
documentation. No write operation or actual task-completion result was verified.

## Errors and verification

Both clients translate provider failures into service errors while retaining
HTTP status, provider messages, and field validation details. Calls use a
30-second timeout. Invalid response envelopes produce clear errors instead of
unhandled property access failures.

Verification is local build, formatting, registration, and schema review.
Provider calls, live E2E, evals, and webhook behavior were not run or changed.

## Official references

- [Authentication](https://docs.agiled.app/docs/developers/authentication/)
- [Base URLs](https://docs.agiled.app/docs/developers/base-urls/)
- [Pagination and filtering](https://docs.agiled.app/docs/developers/pagination-filtering/)
- [Token context](https://docs.agiled.app/docs/api/core/getPublicApiMe/)
- [Accounts](https://docs.agiled.app/docs/api/accounts/listAccounts/)
- [Time entries](https://docs.agiled.app/docs/api/time-entries/listTimeEntries/)
