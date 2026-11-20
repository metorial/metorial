# Slates Specification for Google Calendar

## Overview

Google Calendar is Google's time-management and scheduling service. The Google Calendar API is a RESTful API that exposes most of the features available in the Google Calendar Web interface, enabling programmatic management of calendars, events, access control, and scheduling.

## Authentication

Google Calendar API exclusively uses **OAuth 2.0** for authentication. The application must use the OAuth 2.0 to authorize requests – other authorization protocols are not supported.

**Setup Requirements:**

1. Create a project in the Google Cloud Console and enable the Google Calendar API.
2. Configure an OAuth consent screen (choose Internal for organization-only access, or External for public access).
3. Create OAuth 2.0 client credentials (Client ID and Client Secret).
4. For server-to-server access (e.g., Google Workspace domain-wide delegation), a **service account** can be used with domain-wide delegation enabled by a Workspace admin.

**OAuth 2.0 Endpoints:**

- Authorization: `https://accounts.google.com/o/oauth2/v2/auth`
- Token: `https://oauth2.googleapis.com/token`

**Available Scopes:**

| Scope                                                             | Description                                                                     |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `https://www.googleapis.com/auth/calendar`                        | Full access: see, edit, share, and permanently delete all accessible calendars. |
| `https://www.googleapis.com/auth/calendar.readonly`               | Read-only access to all accessible calendars.                                   |
| `https://www.googleapis.com/auth/calendar.events`                 | View and edit events on all calendars.                                          |
| `https://www.googleapis.com/auth/calendar.events.readonly`        | View events on all calendars.                                                   |
| `https://www.googleapis.com/auth/calendar.events.owned`           | Manage events only on calendars the user owns.                                  |
| `https://www.googleapis.com/auth/calendar.events.owned.readonly`  | View events only on calendars the user owns.                                    |
| `https://www.googleapis.com/auth/calendar.events.freebusy`        | View availability on accessible calendars.                                      |
| `https://www.googleapis.com/auth/calendar.events.public.readonly` | View events on public calendars.                                                |
| `https://www.googleapis.com/auth/calendar.freebusy`               | View free/busy availability only.                                               |
| `https://www.googleapis.com/auth/calendar.settings.readonly`      | View Calendar settings.                                                         |
| `https://www.googleapis.com/auth/calendar.calendars`              | See/change calendar properties and create secondary calendars.                  |
| `https://www.googleapis.com/auth/calendar.calendars.readonly`     | View calendar properties (title, description, timezone, etc.).                  |
| `https://www.googleapis.com/auth/calendar.calendarlist`           | See, add, and remove subscribed calendars.                                      |
| `https://www.googleapis.com/auth/calendar.calendarlist.readonly`  | View the list of subscribed calendars.                                          |
| `https://www.googleapis.com/auth/calendar.acls`                   | View and change sharing permissions on owned calendars.                         |
| `https://www.googleapis.com/auth/calendar.acls.readonly`          | View sharing permissions on owned calendars.                                    |
| `https://www.googleapis.com/auth/calendar.app.created`            | Manage secondary calendars and their events (app-created only).                 |

**Service Accounts & Domain-Wide Delegation:**
Internal apps (e.g., automation apps) can use service accounts with domain-wide delegation to access user data, for example adding events to users' calendars without individual user consent. This requires a Google Workspace super admin to authorize the service account's client ID with specific scopes.

## Features

### Event Management

Create, read, update, and delete events on any accessible calendar. Events contain information such as title, start and end times, and attendees, and can be either single events or recurring events. Events support rich properties including location, description, attachments, conference data (Google Meet links), reminders, visibility settings, and custom color.

- **Recurring events**: Define events with recurrence rules (RRULE). Individual instances of recurring events can be modified or cancelled independently.
- **Attendee management**: Invite attendees by email and control whether notification emails are sent on creation or update.
- **Invitation responses**: `respond_to_event` accepts, declines, or tentatively accepts an invitation. It reads the event to select the attendee marked `self`, or an explicitly supplied attendee email, then sends an `attendeesOmitted` patch containing only that attendee so the rest of the attendee list is preserved. Attendee entries without an email address are skipped during selection. The recorded response and comment in the tool output are read back from the patched event returned by Google, falling back to the input values when absent. For recurring events, responding with the series master event ID applies the response to every instance; use a specific instance ID to respond to one occurrence. Optional response comments and `sendUpdates` are supported.
- **Quick add**: Create events from a simple text string (natural language parsing).
- Events can be moved between calendars.
- **Batch modification**: `batch_modify_events` accepts one to 50 create, update, or delete operations. The tool intentionally issues sequential per-item Calendar API calls instead of a multipart `/batch/calendar/v3` request, which keeps validation and partial-failure reporting explicit. Each item returns its own success or user-facing error result, and one failed item does not stop later operations.

### Calendar Management

Calendars are collections of events, each with associated metadata such as description or default time zone. You can create secondary calendars, update calendar properties, and delete calendars.

`get_calendar` retrieves a calendar's properties by ID (including `primary`) through [Calendars: get](https://developers.google.com/workspace/calendar/api/v3/reference/calendars/get). It returns the title, description, location, time zone, owner when present, and supported conferencing types. The method accepts the full Calendar scope, Calendar read-only scope, app-created calendar scope, or either calendar-properties scope.

### Calendar List Management

The calendar list represents all calendars on a user's calendar list in the Calendar UI. You can add (subscribe to) or remove calendars from a user's list, and customize per-user display properties like color and visibility. The `manage_calendar` tool's additive `update_subscription` action patches `colorId`, `hidden`, `selected`, and `summaryOverride` for an already-subscribed calendar.

### Access Control (Sharing)

Manage sharing permissions (ACLs) on calendars. You can grant or revoke access for specific users or groups, with roles such as reader, writer, or owner. This controls who can view or edit a calendar.

`list_calendar_sharing` reads the [Acl: list](https://developers.google.com/workspace/calendar/api/v3/reference/acl/list) endpoint using the full Calendar scope or either ACL scope. It accepts `maxResults` (1–250), `pageToken`, and `showDeleted`, and returns a page of rules plus `nextPageToken`. `manage_sharing` retains its existing list, grant, update, and revoke actions.

### Free/Busy Queries

Returns free/busy information for a set of calendars. This allows checking availability for one or more users over a given time range without exposing event details. Useful for scheduling and finding open meeting times.

- Requires specifying a time range and list of calendar IDs or group IDs.

### Event Types (Focus Time, Out of Office, Working Location)

The API supports special event types beyond standard events, including focus time, out of office, and working location events. These allow managing a user's calendar status programmatically.

### Settings

View user-level Calendar settings such as timezone, date format, default event length, and notification preferences (read-only via API). `get_settings` lists explicitly stored settings with pagination and incremental `syncToken` support, or retrieves one setting by `settingId`. Google can omit settings that currently use their default value.

`get_settings` accepts the full Calendar scope, the Calendar read-only scope, or the dedicated `calendar.settings.readonly` scope. Event responses use the same write-scope clause as `update_event`; batch event modifications accept the supported Calendar event-write scopes.

### Colors

Retrieve the set of available calendar and event color definitions used in the Google Calendar UI.

### Incremental Synchronization

The API supports efficient sync of calendar data using sync tokens. After an initial full fetch, subsequent requests return only changed items. This is useful for keeping a local copy of calendar data up to date.

## Error Contract

New tool validation and upstream Google Calendar API failures use the shared `ServiceError` contract. Batch event failures are converted into the corresponding item's `error` field so callers receive all ordered results; validation and upstream failures outside a batch remain user-facing `ServiceError` failures.

## Events

The `calendar_events` automatic notification group exposes `event_changed` and
`event_cancelled`. Enabling callbacks discovers readable entries in the user's
CalendarList, including hidden calendars, with real calendar IDs. Free/busy-only
and deleted entries are excluded. Each target belongs to the connected Google
user; subscriptions are never shared across users.

Trigger eligibility requires all three permission groups: event reading,
CalendarList reading, and account identity. Event permissions accept `calendar`,
`calendar.readonly`, `calendar.events`, `calendar.events.readonly`,
`calendar.events.owned`, or `calendar.events.owned.readonly`. CalendarList
permissions accept `calendar`, `calendar.readonly`, `calendar.calendarlist`, or
`calendar.calendarlist.readonly`. Account identity requires `userinfo.profile`
or `userinfo.email` for OAuth2 `userinfo.get`. These names use Google's
`https://www.googleapis.com/auth/` prefix. Event-only grants cannot enable these
triggers because they cannot discover calendars. Existing tool scope contracts
remain independent. See [CalendarList authorization](https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/list#authorization)
and [OAuth2 method scopes](https://www.googleapis.com/discovery/v1/apis/oauth2/v2/rest).

Registration verifies both the account and calendar identities, reads a
silent full `events.list` baseline, then opens an `events.watch` channel with a
random verification token. The watch response must return the requested channel,
token, resource URI, resource ID, and a future expiration. No historical event
is emitted by the baseline. All sync pages retain `showDeleted=true`,
`singleEvents=false`, and `maxResults=2500` without time or search filters.

Push notifications have no body. Validation compares the channel token in
constant time and verifies the saved channel and resource IDs. `sync` messages
are acknowledged without events, including the normal early-sync race. A wakeup
can expand into zero or many event changes. Message numbers remain strings and
are not used to reject out-of-order notifications. No HMAC or signed timestamp
is claimed for Google's channel-token protocol.

Expansion uses the per-calendar durable sync token, with the registration's
initial token only as bootstrap. Failure leaves the previous cursor intact, and
reconciliation uses the same drain even when no notification arrives.

An incremental drain is bounded per run. It stops at the first page boundary
after 2,500 changes (so a batch stays under 5,000), after 100 pages, or after 45
seconds, and returns the events read so far. Google issues the next sync token
only on the last page, so the saved cursor then keeps the sync token the drain
started from together with the next page token, and the next notification or
reconciliation continues with the same query from that page. The replacement
sync token is saved only when the last page has been read. If Google rejects the
saved page token (400 or 410), a warning is recorded and the pending changes are
read again from that sync token in one run. Changes already delivered keep the
same revision identity, so repeats inside the delivery deduplication window are
dropped; a repeat is possible only if the rejection comes after that window. If
that re-read does not finish within 100 pages or 45 seconds, it is abandoned:
the baseline is rebuilt once without announcing existing events, and a warning
records that the pending changes were not delivered.

A 410 on the sync token itself rebuilds the full baseline without announcing
existing events and records a warning: changes made between the expired token
and the resynchronization are not delivered. The initial baseline and that
rebuild read at most 100 pages or 45 seconds per run. A calendar that needs more
saves the next page token without a sync token (at registration, in the saved
registration), records a warning, and continues from that page on the next
notification or reconciliation. No events are delivered for the calendar until
the last page returns its sync token; Google documents that entries changed
while a full sync is being paged are not missed. If Google rejects the saved
page token (400 or 410), a warning is recorded and the baseline starts again.

`event_changed` combines creation and updates because the feed does not prove
which happened. `event_cancelled` describes the watched calendar only. Outputs
contain `kind`, `calendarId`, `eventId`, `revisionId`, and `event`. The event
retains available ETag, status, title, description, location, links, created and
updated times, start/end values, attendees, organizer, recurrence,
`recurringEventId`, and `originalStartTime`, plus additional provider fields.
All-day dates retain their exclusive end date; timed values retain offset and
timezone. Cancelled recurring exceptions and deleted events may be sparse.

Revision identity hashes calendar ID, event ID, and ETag, falling back to update
time and then the input sync transition for sparse tombstones. Retries reuse
identities. Recurring instances sharing `iCalUID` remain distinct. This delivers
observed changes, not an exhaustive intermediate edit history.

Renewal creates a replacement channel using a stable operation ID and secret,
retaining unexpired prior channel identities for overlap. A completed renewal
replayed with its saved operation ID does not create another channel. If Google's
response was lost, a channel-ID conflict remains a failure because Google exposes
no channel get/list API; no successful readback is fabricated. Cleanup verifies
the creating account, attempts every retained channel, and accepts known natural
expiration or a successful stop response. An unconfirmed 404 stays retryable.
Google also requires the original OAuth client for user-owned channel cleanup.

Example output is in the README's Event notifications section. Contract tests
cover channel-token verification, identity, paging, failures, token expiry and
its warning, batched drains and their resumption, rejected page tokens and the
abandoned re-read, recurrence, sparse cancellation, version keys and renewal overlap. The private
live lifecycle uses a suite-owned secondary calendar and a reserved `.invalid`
receiver. Google cannot provide independent channel readback or confirmed repeat
stop; successful watch/renew/stop responses are the available lifecycle evidence.
Real delivery and recovery still require a callback environment with durable
state, atomic event/cursor persistence, reconciliation, and renewal enabled.

Provider references:

- [Push notifications and channel lifecycle](https://developers.google.com/workspace/calendar/api/guides/push)
- [Incremental synchronization](https://developers.google.com/workspace/calendar/api/guides/sync)
- [Event list](https://developers.google.com/workspace/calendar/api/v3/reference/events/list)
- [Event resource and cancellation semantics](https://developers.google.com/workspace/calendar/api/v3/reference/events)
- [Calendar discovery](https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/list)
- [Channel stop](https://developers.google.com/workspace/calendar/api/v3/reference/channels/stop)
