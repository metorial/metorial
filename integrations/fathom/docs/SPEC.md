# Fathom integration specification

Fathom records and processes meetings from Zoom, Google Meet, and Microsoft Teams. This integration reads accessible meeting metadata, speaker-labeled transcripts, AI summaries, action items, highlights, and CRM matches.

## Authentication

- Personal API keys come from User Settings → API Access and are sent with `X-Api-Key`.
- OAuth uses the `public_api` scope. Authorization retains the Fathom website endpoint; token exchange and refresh use `https://api.fathom.ai/external/v1/oauth2/token` with form-encoded parameters. API requests use `Authorization: Bearer` for OAuth connections.
- OAuth access tokens expire. Refresh tokens rotate and can be consumed once. Returned replacements are persisted; an omitted replacement retains the saved token. Missing refresh credentials produce an actionable error.
- New connections record their authentication method. Older connections with a saved refresh token are recognized as OAuth; older API-key connections continue to use the key header.
- No separate instance, team, or account configuration is required.

## Tools

| Tool | Provider endpoint | Behavior |
| --- | --- | --- |
| `list_meetings` | `GET /meetings` | Returns one page and `nextCursor`. Filters by creation time, recorder emails, team names, company domains, domain type, and meeting type. Optional action items, CRM matches, and highlights are returned when provided by Fathom. |
| `get_transcript` | `GET /recordings/{recording_id}/transcript` | Returns the synchronous speaker-labeled transcript. Does not supply a callback URL. |
| `get_summary` | `GET /recordings/{recording_id}/summary` | Returns the default summary's template name and Markdown text. Does not supply a callback URL. |
| `get_meeting_details` | Dedicated transcript/summary endpoints plus `GET /meetings` | Fetches selected content. Searches up to five meeting-list pages for action items; returns search progress and the next unsearched cursor when the recording was not found. Requested endpoint failures are errors. |
| `list_teams` | `GET /teams`, optionally `GET /team_members?team=...` | Retrieves all pages of teams and, when requested, all pages of each team's members. Rejects repeated cursors. |
| `list_meeting_types` | `GET /meeting_types` | Returns a page of active and inactive meeting types. Names are usable as the `meetingType` meeting filter. |
| `list_team_members` | `GET /team_members` | Returns a page of members with optional team filtering, allowing recorder email discovery without loading every team's members. |

The `recordingId` input remains a number. It must be a positive safe integer from the meeting-list response; the number in a Fathom call URL is a different identifier.

Fathom's default meeting page size is ten and there is no page-size parameter. Attendee-email filtering is not supported by the provider API. The existing `calendarInvitees` input is retained as an exact email filter applied locally within each provider page. An empty filtered page may still have a next cursor and does not prove there are no later matches. Domain filters are sent upstream using repeated `calendar_invitees_domains[]` parameters; recorder and team arrays use their documented repeated parameter names.

OAuth applications cannot inline summaries or transcripts in a meeting listing. Dedicated transcript and summary tools work with both authentication methods. There is a global limit of 60 API calls per minute; heavy summary/transcript requests have a separate limit, normally 30 per minute and sometimes reduced to five. Rate-limit responses are errors; callers should follow the provider's retry guidance.

## Response fidelity

- Recorder and invitee names map from documented `name` fields; historical `display_name` responses remain accepted.
- Invitee names and emails can be null. Their existing string fields are omitted when the source is null, and the exact source values remain in the original invitee and meeting data. No empty display names or email addresses are invented.
- Transcript speaker emails are optional and nullable in the provider schema. Omission stays omitted and explicit null stays null; original entries are retained.
- All previously nullable meeting metadata, summaries, action-item assignees, and moment links keep their nullable output contracts. Original nulls are preserved.
- Action-item moment links map from `recording_playback_url`, with the historical `url` field retained as a fallback. Description, completion state, assignee fields, optional user-generated flag, and timestamp are exposed alongside original action data.
- Optional CRM matches and highlights retain provider structures and nulls, including a CRM error when no CRM is connected.
- Missing or malformed required response objects, arrays, IDs, names, state, and content fields produce a service error. Missing transcript or invitee arrays are not converted to empty lists.

## Capability boundaries

The official API has no current-user, self, or profile endpoint. Its `/users` endpoint lists organization permissions and is admin-only; it is not an identity endpoint and is not exposed by this read-oriented integration.

Webhook registration and recording downloads are documented provider capabilities. They are not exposed as tools or triggers here. Webhook delivery requires its own verified registration and callback lifecycle. Recording downloads are asynchronous and return expiring signed URLs; generation, polling, and URL renewal require a complete file workflow. Existing internal webhook client methods retain documented request behavior, including validation that at least one content flag is enabled.

## Official references

Verified against public documentation on 2026-10-15:

- [OpenAPI specification](https://developers.fathom.ai/api-reference/openapi.yaml)
- [Meeting listing](https://developers.fathom.ai/api-reference/meetings/list-meetings)
- [Meeting types](https://developers.fathom.ai/api-reference/meetings/list-meeting-types)
- [Transcript retrieval](https://developers.fathom.ai/api-reference/recordings/get-transcript)
- [Summary retrieval](https://developers.fathom.ai/api-reference/recordings/get-summary)
- [Teams](https://developers.fathom.ai/api-reference/teams/list-teams) and [team members](https://developers.fathom.ai/api-reference/team-members/list-team-members)
- [OAuth](https://developers.fathom.ai/sdks/oauth), [FAQ](https://developers.fathom.ai/faq), and [rate limits](https://developers.fathom.ai/api-overview#global-rate-limits)
