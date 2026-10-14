# TIDY API capabilities

Manage property addresses, cleaning jobs, service professionals, guest reservations,
and property issues with TIDY.

## Authentication

Generate an API key under Developers > API Keys in the TIDY website or mobile app.
Requests use HTTPS and `Authorization: Bearer <api_key>`.
See [TIDY authentication](https://www.tidy.com/docs/developers/authentication).

## Structured operations

The [v1 API reference](https://tidy.readme.io/reference/get-addresses) documents
the existing structured operations under `https://api.tidy.com/api/v1`:

| Resource | Operations |
| --- | --- |
| Addresses | List, retrieve, create, update name/access/parking details, delete |
| Jobs | List/filter, retrieve, create, update, cancel, reschedule |
| Booking availability | List available start times, service types, prices, and currencies |
| Pros | Add a professional to the priority list for all account addresses |
| To-do lists | List active lists, optionally filtered by address |
| Guest reservations | List, retrieve, create, delete |
| Issues | List/filter, retrieve, create, resolve, delete |

Use `list_addresses` to find property IDs and `list_todo_lists` to find checklist
IDs before scheduling. Public IDs remain strings even though TIDY represents
them as numbers. Job date and time fields remain strings; use ISO 8601 local date
and time at the property, on a 30-minute interval. The date and time portion is
sent to TIDY without converting an offset to UTC. Returned job timestamps use
`YYYY-MM-DDTHH:MM:00` for TIDY's property-local `{date,time}` values.

The documented cleaning service keys are `regular_cleaning.one_hour`,
`regular_cleaning.two_and_a_half_hours`, and `regular_cleaning.four_hours`.
Availability end times are calculated from those service durations when TIDY
only supplies a start time. Prices use the smallest currency unit, such as cents
for USD. Pro service types use a comma-separated string in the public tool and
an array in the TIDY request.

Cancellation first confirms the provider's success result, then retrieves job
details to retain the normal job output. Deleting a guest reservation does not
cancel a scheduled job; cancel the job separately. An address with actively
scheduled jobs cannot be deleted. Minor job time adjustments must remain within
three days of the current scheduled or preferred date; use rescheduling for major
changes.

## Natural-language requests

`message_tidy` sends a property management request to
`POST https://api.tidy.com/api/v2/message-tidy`, as documented in the current
[TIDY REST API overview](https://www.tidy.com/developers/api). Requests may schedule
services or change account state. The full response preserves the returned status,
response text, action details, and any additional provider fields.

The v1 reference exposes no current-account/profile endpoint. The existing API-key
method needs no OAuth refresh callback. No file download or export operation is
exposed by these tools.
