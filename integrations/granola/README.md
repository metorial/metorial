# <img src="https://provider-logos.metorial-cdn.com/granola.svg" height="20"> Granola

Read accessible Granola meeting folders, browse meeting-note metadata, retrieve summaries and meeting context in batches, and page through complete meeting transcripts.

## Authentication

Create a personal or workspace API key in the Granola desktop app under **Settings > Connectors > API keys**. The connection stores the trimmed key and sends it as a bearer token to Granola's public API.

API access and the notes visible to a key depend on the workspace plan, the key type, the selected note-access scopes, and workspace administrator settings. Keep API keys secret and revoke them from Granola if they are exposed.

## Tools

- `list_meeting_folders` — list accessible folders and their parent-folder relationships.
- `list_meetings` — browse meeting metadata with date, folder, and cursor filters.
- `get_meetings` — retrieve detailed summaries, attendees, calendar context, folder membership, and available private notes for up to 10 meetings in input order.
- `get_meeting_transcript` — page through a complete transcript with speaker and timing metadata.

`list_meetings` intentionally returns summary metadata only. Pass selected IDs to `get_meetings` instead of fetching every listed meeting, and call `get_meeting_transcript` only when transcript content is needed.

## Limits and availability

- Granola documents a burst capacity of 25 requests per five-second window and a sustained rate of 5 requests per second (300 per minute). Respect `Retry-After` on `429` responses.
- The public API returns only notes with generated AI summaries and transcripts. Notes that are inaccessible, unsummarized, or still processing may not appear in lists and may return `404` when requested directly.
- Private notes are returned only when Granola makes them available to the authenticated key; shared-note and workspace-scoped access can return `null`.
- This package is read-only. It does not proxy Granola's remote MCP server, create or update notes, or manage webhooks.

See the [Granola API documentation](https://docs.granola.ai/introduction) and [official OpenAPI document](https://docs.granola.ai/api-reference/openapi.json) for the provider contract.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
