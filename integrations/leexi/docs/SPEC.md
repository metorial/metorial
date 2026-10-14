# Leexi API capabilities

The integration uses the [Leexi public REST API](https://docs.public-api.leexi.ai/reference/public-api) at `https://public-api.leexi.ai/v1`.

## Authentication and access

An administrator creates an API Key ID and API Key Secret in Leexi settings. Requests authenticate with HTTP Basic authentication using the base64 encoding of `KEY_ID:KEY_SECRET`. API keys have permission scopes and a configurable call access scope. A scoped key returns only accessible calls and returns 404 for inaccessible calls; the same access boundary applies to call notes. Newly created keys have `read_calls`; an administrator must grant other permissions explicitly.

The documented API has no current-user or current-company identity endpoint. `list_users` discovers workspace user UUIDs; it does not identify a human owner of the API key.

## Calls and recordings

- [List calls](https://docs.public-api.leexi.ai/reference/list-calls): filter by dates, source, users, customers, or conversation type. Optional simple transcripts can be included.
- [Get call](https://docs.public-api.leexi.ai/reference/get-call): retrieve metadata, paragraph and word timestamps, speakers, chapters, AI topics, customers, and prompt completions. Existing legacy call topics and customer fields remain available.
- [Request a presigned URL](https://docs.public-api.leexi.ai/reference/request-a-presigned-url): request an upload URL for a recording extension. Upload with a single HTTP PUT using the returned headers, including `x-amz-tagging: temporary=true`. This is an upload destination. Unused uploaded files expire after three days.
- [Create a call](https://docs.public-api.leexi.ai/reference/create-a-call): submit the uploaded recording key, external ID, direction, performed time, and licensed owner user UUID. Processing is asynchronous. Optional `customers` and `participatingUserUuids` provide richer participant information; do not combine them with the retained legacy `emails` or `rawPhoneNumber` fields. Each customer needs at least one attribute. An existing customer UUID takes precedence over other supplied attributes; unknown UUIDs are skipped by Leexi.

Read operations require `read_calls`; recording uploads and creation require `write_calls`. Recording URLs can be null when recordings are archived or retention is disabled. AI completions may appear only after processing finishes.

## Call notes

- [List call notes](https://docs.public-api.leexi.ai/reference/list-call-notes): requires a call UUID, with optional prompt UUID and pagination.
- [Get a call note](https://docs.public-api.leexi.ai/reference/get-a-call-note): retrieves the note's call association, prompt, and translations by note UUID.
- [Update a call note](https://docs.public-api.leexi.ai/reference/update-a-call-note): updates translated text for a locale. The source note text is unchanged.

List and get require `read_calls`; update requires `write_calls`. Notes expose stable note, call, prompt, and translation UUIDs for follow-up operations.

## Meeting events

- [List meeting events](https://docs.public-api.leexi.ai/reference/list-meeting-events): date and ordering filters, plus creation origin. The `createdBy` tool field maps to the API's `origin` parameter.
- [Get a meeting event](https://docs.public-api.leexi.ai/reference/get-a-meeting-event): retrieve participants, scheduling and recording status, and bot runs.
- [Create a meeting event](https://docs.public-api.leexi.ai/reference/create-a-meeting-event): supply timing, organizer, meeting URL, user UUID, and recording preference. Optional `owned` and `internal` tool inputs default to false and are always sent as booleans.
- [Delete a meeting event](https://docs.public-api.leexi.ai/reference/delete-a-meeting-event): remove a scheduled event.
- [Launch a meeting assistant](https://docs.public-api.leexi.ai/reference/launch-a-meeting-assistant): launch the bot, or use `stopBot` to stop it.

Reads require `read_meeting_events`; writes require `write_meeting_events`. Returned organizer and attendee objects are exposed as their email addresses.

## Users, teams, and pagination

[List users](https://docs.public-api.leexi.ai/reference/list-users) requires `read_users`; [list teams](https://docs.public-api.leexi.ai/reference/list-teams) requires `read_teams`. User UUIDs are needed for call and meeting creation.

List routes use `page` and `items`; `items` ranges from 1 to 100 with a default of 10. Responses include `page`, `items`, `count`, and `pages`. Stop when the current page reaches the total pages. Existing numeric input schemas are retained; pagination is validated at runtime as whole numbers. The API limit is 50 requests per minute, with 10 per minute for call creation.
