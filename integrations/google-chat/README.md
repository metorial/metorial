# <img src="https://provider-logos.metorial-cdn.com/google-chat.svg" height="20"> Google Chat

Connect Google Chat for spaces, memberships, messages, reactions, attachments, direct messages, message search, space events, read state, notification settings, sidebar sections, custom emoji, and organization-wide admin space search.

## Tools

The integration exposes 26 tools:

- Official Chat MCP-style core: `send_message`, `list_messages`, `search_messages`, and `search_conversations`.
- Consolidated resource workflows: `manage_space`, `manage_member`, `manage_message`, and `manage_reaction`.
- Direct messages, attachments, and events: `find_direct_message`, `get_attachment`, `download_attachment`, `upload_attachment`, and `list_space_events`.
- Read state: `get_space_read_state` and `get_thread_read_state` report the signed-in user's last-read time; `update_space_read_state` marks a space read (`markAsRead=true`) or moves its last-read time back to mark later messages unread.
- Notification settings: `get_space_notification_setting` and `update_space_notification_setting` read and change the signed-in user's notification and mute settings for one space.
- Sidebar sections: `list_sections`, `list_section_items`, `manage_section` (create, rename, reposition, delete custom sections), and `move_section_item` organize the signed-in user's own sidebar.
- Custom emoji: `list_custom_emojis`, `get_custom_emoji`, and `manage_custom_emoji` (create from a PNG/JPG/GIF image, or delete) work in organizations where custom emoji are enabled.
- Admin search: `search_spaces_admin` searches every named space in the organization with Workspace administrator privileges, using the Chat admin search query syntax (`customer = "customers/my_customer" AND spaceType = "SPACE"` plus optional filters).

`search_messages` first calls the generally available `POST /v1/spaces/-/messages:search` endpoint. When that endpoint is unavailable for the account or project (HTTP 403/`PERMISSION_DENIED` or 404), the tool falls back to `spaces.messages.list` on the conversation given by `conversationId`, with case-insensitive keyword matching and only the `createTime` filters that the list API supports. Without `conversationId` the fallback cannot run and the tool explains that instead. The output states which path served the request. `search_conversations` calls `spaces.list` rather than the non-admin `spaces.search` method, then applies the requested case-insensitive display-name/resource-name substring to that single API page, so it can also match group chats and direct messages. Follow `nextPageToken` because a page can have no client-side matches while later pages still do.

## Authentication

Google OAuth is user authentication. It supports offline access, refresh-token rotation/preservation, and optional consent for message, space, membership, reaction, deletion, read state, space notification settings, sidebar sections, custom emoji, admin space search, and Google Account identity scopes. User-only tools are `list_messages`, `search_messages`, `manage_space`, `manage_member`, `manage_reaction`, `list_space_events`, and all read state, notification setting, section, custom emoji, and admin search tools.

Consolidated tools carry relaxed `anyOf` scope gates and document per-action requirements in their instructions: `manage_space` works with any of `chat.spaces`, `chat.spaces.readonly`, or `chat.delete` (get works with either spaces scope; create/setup/update need `chat.spaces`; delete needs `chat.delete`, otherwise Google returns 403). `manage_message` `action=get` works with `chat.messages.readonly`, while update/delete need `chat.messages`. `manage_member` uses `chat.memberships` for user and group memberships and `chat.memberships.app` for adding or removing the calling Chat app itself. `list_space_events` accepts any message, reaction, membership, or space read scope because Google enforces the scope per filtered `eventTypes` family. Read state reads accept `chat.users.readstate` or its read-only variant, while `update_space_read_state` needs `chat.users.readstate`; notification settings need `chat.users.spacesettings`; section and custom emoji reads accept the full or read-only scope, and their writes need `chat.users.sections` or `chat.customemojis`. `search_spaces_admin` needs `chat.admin.spaces.readonly` or `chat.admin.spaces`, and the signed-in user must hold the Manage Chat and spaces conversations administrator privilege.

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
