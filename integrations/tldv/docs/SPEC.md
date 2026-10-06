# tl;dv API capabilities

Verified against the [official API reference](https://doc.tldv.io/index.html) and
[API access guide](https://intercom.help/tldv/en/articles/11583137-api).

## Authentication

Requests use HTTPS, base URL `https://pasta.tldv.io/v1alpha1` and the `x-api-key`
header. Generate the key in Personal Settings → API Keys. Eligible Pro, Business
and Enterprise plans provide access; API export permission also depends on the
meeting organizer's plan. The API has no documented current-user endpoint or
sandbox. API keys do not use OAuth token refresh.

## Tools

| Tool | Provider operation | Behavior |
| --- | --- | --- |
| `list_meetings` | `GET /meetings` | Keyword, date, participation and internal/external filters. Dates map to `from` and `to`; participation maps to `onlyParticipated`. Pagination starts at 1, accepts up to 100 results per page and is limited to 10,000 total results. The legacy tool input `page: 0` also requests page 1. |
| `get_meeting` | `GET /meetings/{meetingId}` | Metadata, organizer, invitees, template, conference ID, optional phone number and custom correlation metadata. |
| `get_transcript` | `GET /meetings/{meetingId}/transcript` | Completed transcript with speaker, text and start/end timestamps. |
| `get_notes` | `GET /meetings/{meetingId}/notes` | Structured segments, ordered topics and Markdown notes. |
| `get_highlights` | `GET /meetings/{meetingId}/highlights` | Deprecated provider endpoint preserved for existing callers. Prefer `get_notes`. |
| `download_recording` | `GET /meetings/{meetingId}/download` | Downloadable recording. The API returns a 302 redirect to a signed URL valid for six hours. |
| `import_meeting` | `POST /meetings/import` | Public recording URL and name, with optional date, participants, phone number and flat correlation metadata. Returns acceptance, job ID and provider status text. `dryRun: true` validates without saving or processing a recording. |

Imports support mp3, mp4, wav, m4a, mkv, mov, avi, wma, flac. The `name`
input is optional for compatibility and defaults to `Imported recording`.
Import results do not contain a completed meeting ID or meeting permalink;
the legacy `meetingId` and `url` output fields are optional. Use the returned
`jobId` as a processing identifier and discover the completed meeting with
`list_meetings`. The provider has no documented job-status endpoint.

Metadata accepts at most 20 keys. Each key is 1–64 letters, digits, underscores
or hyphens. Values are strings up to 256 characters, numbers or booleans.
Unpopulated phone numbers and metadata are omitted from meeting results. Import
timestamps are converted to UTC with fractional seconds before submission.

## Provider limitations

The API has no documented meeting update/delete, participant management or
identity endpoint. Recording uploads are an opt-in beta requiring provider
operation enablement and are outside this tool set. The authenticated health
endpoint does not provide user identity. Webhook subscriptions are not exposed
here.
