# Slack integration specification

## Product surface

This integration exposes Slack messaging and collaboration through bot OAuth, user OAuth, bot tokens, and user tokens. It supports classic messaging and conversation workflows together with focused identity, thread, file, search, Canvas, Slack List, profile, DND, presence, and read-cursor tools.

The release is additive. These 21 established tool keys remain registered with their existing contracts:

- `send_message`, `update_message`, `schedule_message`, `manage_scheduled_messages`
- `get_conversation_history`, `get_conversation_info`, `open_conversation`, `list_conversations`
- `manage_channel`, `manage_channel_members`
- `get_user_info`, `manage_user_status`
- `manage_reactions`, `manage_pins`, `manage_files`
- `search_messages`, `search_files`
- `manage_reminders`, `manage_user_groups`, `manage_bookmarks`, `get_team_info`

The existing `new_message`, message-webhook, channel-activity, reaction, file, and user-change triggers are unchanged.

## Added tools

### Identity and message retrieval

- `who_am_i` identifies the connected actor and workspace without requiring an extra scope.
- `read_thread` reads a parent message and replies with pagination and a permalink.
- `get_message_permalink` resolves a Slack navigation URL for a known message.
- `get_message` retrieves one exact message and can include bounded context or replies.
- `mark_conversation_read` advances the connected user's read cursor to an explicit timestamp.

### Files and exports

- `read_file` downloads a known Slack file and returns metadata plus a Slack permalink when available.
- `upload_file` uploads validated base64-encoded binary content up to 6 MiB decoded through Slack's external upload flow.

Downloaded file bytes are never returned in structured output. `read_file` and `download_slack_list` return metadata alongside downloadable files capped at 10 MiB per call. Downloaded content must be treated as untrusted user data. The existing `manage_files(get)` remains the metadata-oriented operation, and `manage_files(upload)` remains a text-snippet convenience.

### Search and discovery

- `search_public` uses Slack Real-time Search for accessible public content.
- `search_public_and_private` searches accessible public channels, private channels, DMs, and group DMs.
- `search_channels` resolves partial channel names, topics, and purposes.
- `search_users` resolves people by profile fields.
- `search_emojis` finds custom emoji names and aliases.

`search_public_and_private` is consent-sensitive. An agent must obtain explicit user consent before invoking it because results may include private-channel and direct-message content. Search never expands access beyond content the connected Slack user can already read. All four Real-time Search tools (`search_public`, `search_public_and_private`, `search_channels`, `search_users`) are user-auth-only, as are `update_user_profile`, `mark_conversation_read`, `manage_dnd`, and the pre-existing `manage_reminders`, `manage_user_status`, `search_messages`, and `search_files`. Legacy `search_messages` and `search_files` remain registered for compatibility and classic search behavior.

### Canvases

- `create_canvas` creates a Slack Canvas from Canvas-flavored Markdown.
- `edit_canvas` inserts, replaces, deletes, or renames Canvas content.
- `lookup_canvas_sections` finds section IDs for safe focused edits.
- `manage_canvas_access` sets or removes user or channel access.
- `delete_canvas` permanently deletes an explicitly selected Canvas.

Canvas availability and channel requirements depend on the workspace plan. Whole-document replacement and deletion are destructive and require explicit targets and intent. `lookup_canvas_sections` is not a general Canvas content reader. `read_canvas` is intentionally not implemented because no confirmed public Web API route returns complete Canvas content with section mapping.

### Slack Lists

- `create_slack_list` creates a List with structured columns.
- `list_slack_list_items` reads and paginates rows.
- `create_slack_list_item` adds a row.
- `update_slack_list_items` updates typed cells on existing rows.
- `delete_slack_list_items` removes explicitly selected rows.
- `manage_slack_list_access` sets or removes user or channel access.
- `download_slack_list` starts and polls a bounded export and returns the completed file for download.

Slack Lists require a supported paid Slack plan. List row deletion and access removal are destructive or permission-sensitive. The tools expose stable List, row, and column IDs needed for follow-up operations.

### Connected-user productivity

- `update_user_profile` updates supported profile fields for the connected user.
- `manage_dnd` reads or changes the connected user's Do Not Disturb and snooze state.
- `manage_presence` reads presence or sets the connected actor to automatic or away.

Custom status remains the responsibility of `manage_user_status`. Attached Slack message drafts are intentionally not implemented because Slack has no supported public Web API for creating them.

## Authentication

The auth-method keys remain stable:

- `oauth`: Slack bot OAuth
- `user_oauth`: Slack user OAuth
- `bot_token`: pasted bot token
- `user_token`: pasted user token

The bot OAuth method includes the existing collaboration scopes plus `canvases:read`, `canvases:write`, `lists:read`, `lists:write`, and `emoji:read`. Unused `commands`, `incoming-webhook`, and `users.profile:read` scopes are not requested; the profile tools are user-auth-only, so profile scopes live only on the user method.

The user OAuth method retains legacy `search:read` for the established search tools and adds the granular search scopes `search:read.public`, `search:read.private`, `search:read.im`, `search:read.mpim`, `search:read.files`, and `search:read.users`. It also includes Canvas, Lists, custom emoji, `dnd:read`, `dnd:write`, and `users:write` scopes for the added user-productivity tools.

Existing OAuth connections keep their previously granted scopes and continue to pass established tool gates. New tools remain unavailable until the customer reconnects the same auth method and approves its expanded scope manifest. This is expected upgrade behavior. Pasted tokens have no OAuth reconnection step; each new tool becomes available only when the pasted token already carries its required scopes.

## API and behavior constraints

- Tool input schemas serialize to top-level JSON Schema objects.
- Slack API and validation failures are exposed as `ServiceError` instances.
- File content and Slack List exports are returned as downloadable files rather than inline base64 output.
- Real-time private search requires explicit consent and is limited to the connected user's visibility.
- Canvas and Slack Lists can fail on unsupported plans or when workspace policy disables them.
- `read_canvas`, attached Slack drafts, Stars/Later, Enterprise administration, custom emoji administration, Calls, RTM, raw API passthrough, and deprecated action aliases are outside this integration surface.
