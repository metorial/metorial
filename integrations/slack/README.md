# <img src="https://provider-logos.metorial-cdn.com/slack.svg" height="20"> Slack

Use Slack bot OAuth or user OAuth to work with messages, threads, conversations, search, files, Canvases, Lists, profiles, reactions, reminders, and personal productivity settings. The integration keeps the original tool surface while adding focused discovery, file downloads and binary uploads, Slack-native documents, structured Lists, and connected-user controls.

## Authentication and compatibility

The existing `oauth`, `user_oauth`, `bot_token`, and `user_token` connection methods remain supported. Existing OAuth connections keep their previously granted scopes and continue to work with the original tools. Reconnect the same OAuth method to approve the expanded scope manifest before using tools that need modern search, Canvas, Lists, custom emoji, DND, or presence permissions. Pasted tokens do not have a consent flow and must already carry each tool's required scopes.

Real-time private search is user-authenticated and searches only content visible to the connected user. `search_public_and_private` must be used only after the user explicitly consents to searching private channels, DMs, or group DMs. The legacy `search_messages` and `search_files` tools remain available.

File downloads and Slack List exports return downloadable files capped at 10 MiB per call, alongside structured metadata. Binary uploads accept validated base64 input up to 6 MiB decoded; use another transfer path for larger files.

Canvas and Slack List availability depends on the workspace plan and Slack permissions. Canvas section lookup is supported, but a full `read_canvas` tool is not implemented because the public API does not provide a confirmed full-content read route. Attached Slack drafts are also not implemented because Slack does not expose a supported public draft-writing API.

## Tools

### Get Conversation History

Retrieve message history from a Slack channel, DM, or group DM. Supports pagination, time range filtering, and fetching thread replies.

### Get Conversation Info

Retrieve stable metadata for a Slack conversation, including channel type, membership, topic, purpose, member count, and timestamps.

### Get Team Info

Retrieve information about the Slack workspace (team), including its name, domain, email domain, and icon.

### Get User Info

Look up a Slack user's profile and status. Search by user ID, email address, or list all workspace members.

### List Conversations

List Slack conversations (channels, private channels, DMs, and group DMs) accessible to the authenticated user or bot. Supports filtering by conversation type and pagination.

### Manage Bookmarks

Add, edit, remove, or list bookmarks (saved links) in a Slack channel. Bookmarks appear at the top of a channel for quick access.

### Manage Channel Members

Invite users to or remove users from a Slack channel. Also supports listing current channel members and joining/leaving channels.

### Manage Channel

Create, update, archive, unarchive, or configure a Slack channel. Combine multiple channel operations in a single action — create a new channel, rename it, set its topic/purpose, or manage its lifecycle.

### Manage Files

Upload, list, get info about, or delete files in Slack. Upload text content as a file snippet, retrieve file metadata, or list files shared in a channel or by a user.

### Manage Pins

Pin or unpin messages in a Slack channel, or list all pinned items. Pinned messages are highlighted and easily accessible by all channel members.

### Manage Reactions

Add, remove, or list emoji reactions on a Slack message. Use this to react to messages, remove existing reactions, or see all reactions on a message.

### Manage User Groups

Create, update, enable, disable, or list user groups (also known as @mention handle groups) in Slack. Manage group membership by setting the full member list.

### Manage User Status

Get, set, or clear the authorized Slack user's custom status.

### Manage Reminders

Create, complete, delete, or list Slack reminders. Reminders notify a user at a specified time with a custom message.

### Search Messages

Search for messages across a Slack workspace by keyword query.

### Search Files

Search for files across a Slack workspace by keyword query.

### Manage Scheduled Messages

List or delete Slack messages that are scheduled to be sent later.

### Open Conversation

Open or resume a Slack direct message or group direct message with one or more users.

### Schedule Message

Schedule a message to be sent to a Slack channel at a future time. The message will be delivered automatically at the specified time.

### Send Message

Send a message to a Slack channel, group DM, or direct message conversation. Supports plain text, rich Block Kit formatting, threaded replies, and ephemeral messages visible only to a specific user.

### Update Message

Update or delete an existing Slack message. Use this to edit message content or remove a message entirely.

### Who Am I

Identify the connected Slack actor and workspace before self-relative searches or writes.

### Read Thread

Read a thread's parent message and replies with bounded pagination, hydrated context, and a permalink.

### Get Message Permalink

Resolve a stable Slack permalink for a known conversation ID and message timestamp.

### Read File

Download the content of a known Slack file and return its metadata and Slack permalink when available.

### Upload File

Upload validated binary content to Slack and optionally share it to a conversation or thread.

### Search Public

Use Slack Real-time Search for content in public conversations accessible to the connected user.

### Search Public and Private

Search accessible public and private channels, DMs, and group DMs after the user explicitly consents to private-content search.

### Search Channels

Find accessible Slack conversations by partial name, topic, or purpose before another read or write.

### Search Users

Find Slack users by name, display name, title, department, or email when the granted scopes permit it.

### Create Canvas

Create a Slack Canvas from Canvas-flavored Markdown. Availability and channel requirements depend on the Slack workspace plan.

### Edit Canvas

Insert, replace, delete, or rename targeted Canvas content. Whole-document replacement is destructive and should be explicitly requested.

### Lookup Canvas Sections

Find Canvas section IDs for focused edits. This is section discovery, not a full Canvas content reader.

### Search Emojis

Find custom workspace emoji and aliases by name without exposing emoji-administration operations.

### Update User Profile

Update supported profile fields for the connected Slack user while leaving custom status management to `manage_user_status`.

### Create Slack List

Create a Slack List with structured columns for action registers, projects, and task tracking. Slack Lists require a supported paid plan.

### List Slack List Items

Read and paginate structured Slack List rows, including the row and column IDs needed for later updates.

### Create Slack List Item

Add a structured row to a Slack List.

### Update Slack List Items

Update typed cells on one or more existing Slack List rows.

### Delete Slack List Items

Delete explicitly selected Slack List rows. This is a destructive operation.

### Manage Canvas Access

Set or remove user or channel access to a Canvas.

### Delete Canvas

Permanently delete an explicitly selected Canvas.

### Manage Slack List Access

Set or remove user or channel access to a Slack List on a supported paid plan.

### Download Slack List

Start and poll a bounded Slack List export, then return the completed file for download.

### Get Message

Retrieve one exact Slack message by conversation ID and timestamp, including a permalink and optional surrounding context or replies.

### Mark Conversation Read

Advance the connected user's read cursor for a conversation to an explicit message timestamp.

### Manage DND

Read or change the connected user's Slack Do Not Disturb and snooze state.

### Manage Presence

Read Slack presence or set the connected actor's presence to automatic or away.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
