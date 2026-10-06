# EmailOctopus integration

This integration exposes 18 tools for the current EmailOctopus API v2 at `https://api.emailoctopus.com`. It manages lists, contacts, tags and text/number/date fields; reads campaigns and reports; and starts an existing dashboard-configured automation. The API does not create or send campaigns, manage automation definitions, cancel queued execution, or expose an account identity endpoint. Lists provide discovery of authorized list IDs.

## Authentication and limits

Use a current API key as a Bearer token. A key labelled legacy, created before API v2, must be replaced with a current key. Current keys also work with the legacy API; the legacy API remains available but is no longer maintained. Authentication is verified with a small read-only list request. No OAuth scopes, token refresh or account ID configuration is required. Re-enter a replacement key after rotation.

The provider documents 10 requests per second and a burst bucket of 100. Rate-limit failures preserve the HTTP status and a bounded provider retry delay when available. Requests are not automatically retried, especially after an ambiguous write or automation submission.

## Tools and compatibility

- `list_lists`, `get_list`, `create_list`, `update_list`, `delete_list` discover and manage lists. `counts` exposes actual provider counts, including the documented array envelope. Deletion permanently removes the list and its contacts, fields and tags.
- `list_contacts`, `get_contact`, `create_contact`, `update_contact`, `upsert_contact`, `delete_contact`, `batch_update_contacts` manage contacts. Original uppercase subscription inputs remain accepted and are sent as lowercase API values. Explicit subscription or double opt-in can cause email and automation effects; only use authorized recipients.
- Existing `fields` accepts string values. Optional `fieldValues` also supports numbers and null for field clearing. Do not give conflicting values for the same tag. Output `fields` preserves its text format: numbers become text and null becomes an empty string. Optional output `fieldValues` retains the provider's typed values.
- Existing upsert `tags` adds the listed tags through the provider's boolean map; optional `tagUpdates` adds or removes individual tags. An omitted tag is preserved. Adding and removing the same tag in one upsert is rejected.
- Contacts can be retrieved by ID or MD5 of the lowercase email address. Hash lookups verify the returned email. Updates that change email first resolve a hash to the stable contact ID. Batch requests send 1–100 `contacts` and map provider `success`/`errors` into the existing `succeeded`/`failed` outputs. Each receipt must match one requested contact. Partial failures retain successful updates: read contacts before retrying.
- `manage_tags` creates, renames, deletes and lists tags. List results are one page, with an optional next cursor.
- `manage_fields` retains TEXT, NUMBER and DATE inputs and normalizes their casing. Updates forward a supplied type, otherwise preserve the existing type, and read existing metadata before sending the provider's required tag, type and label. A response must confirm the requested type; check affected contact values before changing it. Omitted fallback preserves the existing value; optional `clearFallback` clears it without changing the existing string `fallback` input. Choice-specific field settings are not exposed by this tool. Output `fallback` is display text; optional `fallbackValue` preserves an actual nullable fallback.
- `list_campaigns`, `get_campaign`, `get_campaign_report` read existing campaigns and aggregate, link or contact reports. Nested campaign target arrays are flattened into the existing list-ID output. HTML is returned as campaign content; missing provider plain text remains an empty string for compatibility. Status is the provider's string, without a restrictive enum.
- Current contact report rows supply a contact ID, available email address and event time. The existing contact wrapper remains, while unavailable full-contact fields are optional and omitted. Missing email or event metadata is not invented. Link reports are unpaged; their existing `startingAfter` input is accepted but ignored.
- `trigger_automation` submits `{contact_id}` to an existing automation configured with Started via API. A 204 response confirms acceptance only. Execution may send emails or modify fields/tags and retains history. Repetition requires the dashboard's Allow contacts to repeat setting. No cancellation or history-deletion capability is claimed.

Paged tools accept optional `limit` (1–100) and the exact `pagingNext` cursor from a previous response. Provider `paging.next.starting_after` is extracted without decoding or following its URL. Contact date filters are inclusive ISO 8601 bounds mapped to `created_at.gte/lte` and `last_updated_at.gte/lte`.

Legacy event handlers are removed. No replacement trigger or webhook registration is exposed.

## Official references

- [Current API v2 documentation, displayed version 2.1.0](https://emailoctopus.com/api-documentation/v2)
- [API versions and legacy availability](https://help.emailoctopus.com/article/94-api-documentation)
- [API limits and campaign sending restriction](https://help.emailoctopus.com/article/91-api-limits)

The public v2 documentation was read on October 5, 2026. Runtime provider acceptance requires a connected account; local schema and build verification alone does not establish that acceptance.
