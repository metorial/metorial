# Granola Integration Specification

## Scope

Package version `0.3.0` provides four read-only tools over Granola's public REST API. It covers folder discovery, meeting-note listing, batched meeting detail retrieval, and paginated transcript retrieval.

The implementation follows these official Granola sources:

- [Granola API overview](https://docs.granola.ai/introduction)
- [List Notes](https://docs.granola.ai/api-reference/list-notes)
- [Get Note](https://docs.granola.ai/api-reference/get-note)
- [Get Transcript](https://docs.granola.ai/api-reference/get-transcript)
- [List Folders](https://docs.granola.ai/api-reference/list-folders)
- [OpenAPI document](https://docs.granola.ai/api-reference/openapi.json)
- [Granola MCP documentation](https://docs.granola.ai/help-center/sharing/integrations/mcp)

## Authentication and access boundary

The connection accepts a personal or workspace API key created in the Granola desktop app under **Settings > Connectors > API keys**. It trims and validates the input as non-empty, persists only `{ token }`, and authenticates requests with `Authorization: Bearer <token>`.

The API base URL is `https://public-api.granola.ai`. This package does not call an identity endpoint because the public API does not document a suitable API-key profile endpoint. It does not hash or transform the key and never exposes it through tool output or error messages.

API-key availability and data access are plan- and policy-dependent. Granola documents member-created API keys for Business workspaces, administrator controls for member access scopes on Enterprise workspaces, and administrator-created workspace API keys for Business and Enterprise workspaces. A key can see only the personal, public, Team-space, or explicitly granted space content allowed by its type and selected scopes. The tools do not bypass those provider access controls.

Granola's hosted MCP service is a separate OAuth-authenticated product at `https://mcp.granola.ai/mcp`. This package uses API-key authentication against the public REST API and is not a remote MCP proxy.

## Tool and endpoint matrix

All requests use `GET`.

| Tool | Endpoint | Behavior |
| --- | --- | --- |
| `list_meeting_folders` | `/v1/folders` | Lists accessible folders with cursor pagination and hierarchy. |
| `list_meetings` | `/v1/notes` | Lists meeting-note summaries with optional date and folder filters. |
| `get_meetings` | `/v1/notes/{note_id}` | Sequentially retrieves 1-10 detailed notes without requesting an inline transcript. |
| `get_meeting_transcript` | `/v1/notes/{note_id}/transcript` | Retrieves one cursor-paginated transcript page. |

Every production tool ID is shorter than 60 characters.

## Input and request behavior

All tool inputs serialize as top-level JSON Schema objects.

- Folder IDs match `^fol_[A-Za-z0-9]{14}$`; note IDs match `^not_[A-Za-z0-9]{14}$`.
- `list_meeting_folders` and `list_meetings` use page sizes from 1 to 30 and default to 10.
- `get_meeting_transcript` uses page sizes from 1 to 100 and defaults to 50.
- Cursors are opaque non-empty strings and are sent unchanged.
- Meeting date filters accept either an ISO calendar date (`YYYY-MM-DD`) or an RFC3339 timestamp with a timezone. A string refinement keeps the top-level tool schema as an object without a top-level union.
- `list_meetings` maps `createdBefore`, `createdAfter`, `updatedAfter`, `folderId`, and `pageSize` to `created_before`, `created_after`, `updated_after`, `folder_id`, and `page_size`.
- `get_meetings` fetches note IDs sequentially, preserves the caller's input order, and fails the whole invocation if any note request or response validation fails. The affected ID is included in upstream note errors.
- `get_meetings` never sends `include=transcript`. Transcript content is retrieved only through the dedicated paginated endpoint.

## Response validation and normalization

Provider envelopes and every field required by the public outputs are runtime-validated before mapping. Unexpected or incomplete provider responses produce a typed service error instead of allowing undefined required fields to reach output.

Granola's `hasMore` and `cursor` envelope fields retain their documented names. Other provider snake-case fields are normalized to camel case:

- `parent_folder_id` becomes `parentFolderId`.
- `created_at`, `updated_at`, and `web_url` become `createdAt`, `updatedAt`, and `webUrl`.
- Calendar fields become `eventTitle`, `calendarEventId`, `scheduledStartTime`, and `scheduledEndTime`.
- `folder_membership`, summary fields, and private-note fields become `folderMembership`, `summaryText`, `summaryMarkdown`, `privateNotesText`, and `privateNotesMarkdown`.
- Transcript `diarization_label`, `start_time`, and `end_time` become `diarizationLabel`, `startTime`, and `endTime`.

List results do not fabricate folder descriptions, note counts, attendees, or content. Agents should select meeting IDs from `list_meetings` and batch them through `get_meetings` rather than issuing an N+1 detail request for every list item.

Detailed meeting output contains the note ID, nullable title, owner, timestamps, web URL, nullable calendar event, attendees, folder membership, summaries, and nullable private notes. It deliberately contains no transcript field. Transcript pages preserve the documented `microphone` or `speaker` source plus optional `me` or `them` attribution, diarization label, and resolved name.

## Errors, availability, and rate limits

All validation, response-shape, and provider failures use typed service errors. Shared authenticated HTTP and error helpers retain upstream status, retryability, and `Retry-After` handling without exposing the bearer token.

- `401` explains that the API key may be invalid or revoked and points back to **Settings > Connectors > API keys**.
- A note-specific `404` identifies the affected note ID and explains that it may be inaccessible, unsummarized, or still processing.
- `429` tells callers to honor `Retry-After` before retrying.

Granola documents a burst capacity of 25 requests per five-second window and a sustained rate of 5 requests per second (300 per minute), applied according to the key's user or workspace scope.

The public API only returns notes that have generated AI summaries and transcripts. Notes still being processed or never summarized are excluded from list responses and return `404` from the detail endpoint.

## Intentional divergences and omissions

- Public tool naming uses "meetings" for user workflows while requests target Granola's documented note resources.
- `get_meetings` is a local convenience batch over the single-note REST endpoint; Granola does not document a bulk detail endpoint. Sequential execution protects input order and avoids a request burst.
- Transcript retrieval always uses the dedicated paginated endpoint instead of the Get Note `include=transcript` option, avoiding oversized inline transcript responses.
- The package does not expose `query_granola_meetings`, `get_account_info`, remote MCP transport, webhook tools, triggers, audit-log access, note mutation, or workspace administration.
- Although Granola documents webhook endpoints and a hosted MCP service, neither is proxied or registered by this read-only API-key package.
