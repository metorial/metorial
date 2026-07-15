# <img src="https://provider-logos.metorial-cdn.com/google-chat.svg" height="20"> Google Chat

Connect Google Chat for spaces, memberships, messages, reactions, attachments, direct messages, message search, and space events.

## Tools

The integration exposes 13 tools:

- Official Chat MCP-style core: `send_message`, `list_messages`, `search_messages`, and `search_conversations`.
- Consolidated resource workflows: `manage_space`, `manage_member`, `manage_message`, and `manage_reaction`.
- Direct messages, attachments, and events: `find_direct_message`, `get_attachment`, `download_attachment`, `upload_attachment`, and `list_space_events`.

`search_messages` first calls the Google Workspace Developer Preview endpoint `POST /v1/spaces/-/messages:search`. When that endpoint is unavailable (HTTP 403/`PERMISSION_DENIED` or 404 because the tenant or project is not enrolled in the preview), the tool falls back to `spaces.messages.list` on the conversation given by `conversationId`, with case-insensitive keyword matching and only the `createTime` filters that the list API supports. Without `conversationId` the fallback cannot run and the tool reports the Developer Preview requirement instead. The output states which path served the request. `search_conversations` deliberately does not call the newer Developer Preview `spaces.search` endpoint: it calls stable `spaces.list`, then applies the requested case-insensitive display-name/resource-name substring to that single API page. Follow `nextPageToken` because a page can have no client-side matches while later pages still do.

## Authentication

Google OAuth is user authentication. It supports offline access, refresh-token rotation/preservation, and optional consent for message, space, membership, reaction, deletion, and Google Account identity scopes. User-only tools are `list_messages`, `search_messages`, `manage_space`, `manage_member`, `manage_reaction`, and `list_space_events`.

Consolidated tools carry relaxed `anyOf` scope gates and document per-action requirements in their instructions: `manage_space` works with `chat.spaces` or `chat.spaces.readonly` (get is read-only; create/setup/update need `chat.spaces`; delete additionally needs `chat.delete`, otherwise Google returns 403). `manage_message` `action=get` works with `chat.messages.readonly`, while update/delete need `chat.messages`. `manage_member` uses `chat.memberships` for user and group memberships and `chat.memberships.app` for adding or removing the calling Chat app itself. `list_space_events` accepts any message, reaction, membership, or space read scope because Google enforces the scope per filtered `eventTypes` family.

Google Chat app authentication uses the JSON key for the service account configured as the Chat app and requests only `chat.bot`. The Chat app must be configured in Google Cloud and added to every space it accesses. `get_attachment` is app-only because Google requires Chat app authentication for that metadata endpoint. `send_message`, `search_conversations`, `manage_message`, `find_direct_message`, `download_attachment`, and `upload_attachment` support either user OAuth or Chat app authentication; with app authentication, message updates and deletes are limited to messages created by that app.

## Configuration

`defaultSpace` is optional. It accepts either a space ID or a canonical resource name such as `spaces/AAAA1234`. Space-scoped tools use it when their explicit space or conversation input is omitted.

## Attachment workflow

`upload_attachment` accepts base64 file bytes under user OAuth or Chat app authentication and returns an opaque `attachmentUploadToken`. Pass that token—not an attachment data resource name—to `send_message.attachmentUploadTokens` for the same target space. The upload alone does not post a message. Use `get_attachment` with Chat app authentication for attachment metadata and `download_attachment` for Google Chat-hosted bytes; Google Drive attachments must be downloaded through the Google Drive integration.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
