# <img src="https://provider-logos.metorial-cdn.com/google-chat.svg" height="20"> Google Chat

Connect Google Chat for spaces, memberships, messages, reactions, attachments, direct messages, message search, space events, read state, notification settings, sidebar sections, custom emoji, and organization-wide admin space search.

## Tools

The integration exposes 25 tools:

- Official Chat MCP-style core: `send_message`, `list_messages`, `search_messages`, and `search_conversations`.
- Consolidated resource workflows: `manage_space`, `manage_message`, and `manage_reaction`.
- Direct messages, attachments, and events: `find_direct_message`, `get_attachment`, `download_attachment`, `upload_attachment`, and `list_space_events`.
- Read state: `get_space_read_state` and `get_thread_read_state` report the signed-in user's last-read time; `update_space_read_state` marks a space read (`markAsRead=true`) or moves its last-read time back to mark later messages unread.
- Notification settings: `get_space_notification_setting` and `update_space_notification_setting` read and change the signed-in user's notification and mute settings for one space.
- Sidebar sections: `list_sections`, `list_section_items`, `manage_section` (create, rename, reposition, delete custom sections), and `move_section_item` organize the signed-in user's own sidebar.
- Custom emoji: `list_custom_emojis`, `get_custom_emoji`, and `manage_custom_emoji` (create from a PNG/JPG/GIF image, or delete) work in organizations where custom emoji are enabled.
- Admin search: `search_spaces_admin` searches every named space in the organization with Workspace administrator privileges, using the Chat admin search query syntax (`customer = "customers/my_customer" AND spaceType = "SPACE"` plus optional filters).

`search_messages` first calls the generally available `POST /v1/spaces/-/messages:search` endpoint. When that endpoint is unavailable for the account or project (HTTP 403/`PERMISSION_DENIED` or 404), the tool falls back to `spaces.messages.list` on the conversation given by `conversationId`, with case-insensitive keyword matching and only the `createTime` filters that the list API supports. Without `conversationId` the fallback cannot run and the tool explains that instead. The output states which path served the request. `search_conversations` calls `spaces.list` rather than the non-admin `spaces.search` method, then applies the requested case-insensitive display-name/resource-name substring to that single API page, so it can also match group chats and direct messages. Follow `nextPageToken` because a page can have no client-side matches while later pages still do.

## Authentication

Google OAuth is user authentication. It supports offline access, refresh-token rotation/preservation, and optional consent for message, space, membership, reaction, deletion, read state, space notification settings, sidebar sections, custom emoji, admin space search, and Google Account identity scopes. User-only tools are `list_messages`, `search_messages`, `manage_space`, `manage_reaction`, `list_space_events`, and all read state, notification setting, section, custom emoji, and admin search tools.

Consolidated tools carry relaxed `anyOf` scope gates and document per-action requirements in their instructions: `manage_space` works with any of `chat.spaces`, `chat.spaces.readonly`, or `chat.delete` (get works with either spaces scope; create/setup/update need `chat.spaces`; delete needs `chat.delete`, otherwise Google returns 403). `manage_message` `action=get` works with `chat.messages.readonly`, while update/delete need `chat.messages`. `list_space_events` accepts any message, reaction, membership, or space read scope because Google enforces the scope per filtered `eventTypes` family. Read state reads accept `chat.users.readstate` or its read-only variant, while `update_space_read_state` needs `chat.users.readstate`; notification settings need `chat.users.spacesettings`; section and custom emoji reads accept the full or read-only scope, and their writes need `chat.users.sections` or `chat.customemojis`. `search_spaces_admin` needs `chat.admin.spaces.readonly` or `chat.admin.spaces`, and the signed-in user must hold the Manage Chat and spaces conversations administrator privilege.

Google Chat app authentication uses the JSON key for the service account configured as the Chat app and requests only `chat.bot`. Add the optional numeric `projectNumber` so Chat app events reach the connection. The Chat app must be configured in Google Cloud and added to every space it accesses. `get_attachment` is app-only because Google requires Chat app authentication for that metadata endpoint. `send_message`, `search_conversations`, `manage_message`, `find_direct_message`, `download_attachment`, and `upload_attachment` support either user OAuth or Chat app authentication; with app authentication, message updates and deletes are limited to messages created by that app.

## Chat app adapter

The normalized chat actions (`metorial_chat$…`) run as the **Google Chat app** through the `service_account` method (`chat.bot` scope). User OAuth connections act as a person, not the app, and are not eligible for these actions. All Chat app spaces belong to one workspace that represents the app, with the stable ID `projects/{projectId}` taken from the service account key.

| Action or event | Support | Google Chat API |
|---|---|---|
| `message.send` | Native | `spaces.messages.create`; thread replies use `thread.name` with `REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD`; a reply target without a thread ID is resolved to its thread |
| `message.sendEphemeral`, `message.send` with `ephemeral` | Native | `privateMessageViewer`; only the viewer and the app see the message |
| `message.edit` / `message.delete` | Native, app-authored messages only | `spaces.messages.patch` (`updateMask=text`) / `spaces.messages.delete` |
| `message.get` | Native | `spaces.messages.get` for messages the app can access |
| `channel.list` / `channel.get` | Native | `spaces.list` (page cursor; `dm` and `group_dm` filters run in Google) / `spaces.get` |
| `channel.members` | Native | `spaces.members.list`; Google omits app memberships |
| `dm.openSingle` | Native, existing DMs only | `spaces.findDirectMessage`; a missing DM is reported as not allowed |
| `workspace.list` / `workspace.get` / `user.getAuthenticated` | Synthetic | The connected Chat app and its workspace; no API call |
| `file.download` | Native | `spaces.messages.attachments.get` then `media.download` (`alt=media`) as an authenticated download; Google Drive attachments are rejected |
| `setup.get` | Public | Google Chat API configuration steps; no connection needed |
| `message.received` | Native | `MESSAGE` events: direct messages to the app and space messages that @mention it |
| `mention.received` | Native | `MESSAGE` events with a `USER_MENTION` annotation of the app; direct messages without a mention fire only `message.received` |
| `command.invoked` | Native | Slash commands (`MESSAGE` with `slashCommand`) and quick commands or message actions (`APP_COMMAND`) |

Not available, because Google requires user authentication or administrator-approved `chat.app.*` scopes for them, or has no such API: message list and search, read receipts, reactions and reaction events, file upload and file attachments on sent messages, typing indicators, group DMs and creating new DMs, user lookup and search, thread listing, command responses through an interaction handle, command listing, and message update/delete or membership events (Chat apps do not receive them as interaction events). Message text is rendered from Markdown to Google Chat's text formatting; tables, charts, and cards are sent as plain-text fallbacks. Messages over 32,000 bytes are rejected rather than truncated.

### Inbound events

Chat app interaction events arrive at the HTTP endpoint configured in the Google Chat API configuration. Event setup asks for the **Authentication Audience** selected there and the Google Cloud **project number** and **project ID**:

- **Project Number** (recommended): requests carry a JWT issued by `chat@system.gserviceaccount.com` whose audience is the project number, so they are bound to your project.
- **HTTP endpoint URL**: requests carry a Google-signed ID token whose audience is the endpoint URL and whose email is `chat@system.gserviceaccount.com`. Any Chat app configured with the same URL is accepted, so keep the URL private.

Apps built as a **Google Workspace add-on** (the "Build this Chat app as a Google Workspace add-on" option) are supported too. Their requests carry a Google-signed ID token whose audience is the endpoint URL and whose email is the add-on's own service account, so choose **HTTP endpoint URL** and also enter the **add-on service account email** shown in the Chat API configuration (`service-PROJECT_NUMBER@gcp-sa-gsuiteaddons.iam.gserviceaccount.com`). Only requests issued to that account are accepted, which binds them to your project. Select **Use common HTTP endpoint URL for all triggers** so commands reach the same endpoint. Converting an existing Chat app to an add-on cannot be undone. Add-on events (`chat.messagePayload`, `chat.appCommandPayload`, and so on) produce the same message, mention, and command events as other Chat apps; slash commands from add-on apps arrive as app commands.

Every request's signature, issuer, audience, and expiry are verified against Google's public keys before the event is accepted; failed requests receive `401`. The endpoint answers with an empty JSON object, and replies are sent through `message.send`. Events reach service account connections whose key belongs to the same project and that were created with the same project number, so set `projectNumber` on the connection. `ADDED_TO_SPACE`, `REMOVED_FROM_SPACE`, card clicks, dialogs, and app home events are acknowledged without being forwarded. Event IDs are the message resource name with a `:received`, `:mention`, or `:command` suffix, so a mention produces both a `message.received` and a `mention.received` event.

## Configuration

`defaultSpace` is optional. It accepts either a space ID or a canonical resource name such as `spaces/AAAA1234`. Space-scoped tools use it when their explicit space or conversation input is omitted.

## Attachment workflow

`upload_attachment` accepts base64 file bytes under user OAuth or Chat app authentication and returns an opaque `attachmentUploadToken`. Pass that token—not an attachment data resource name—to `send_message.attachmentUploadTokens` for the same target space. The upload alone does not post a message. Use `get_attachment` with Chat app authentication for attachment metadata and `download_attachment` for Google Chat-hosted bytes; Google Drive attachments must be downloaded through the Google Drive integration.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
