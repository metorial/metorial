# <img src="https://provider-logos.metorial-cdn.com/discord.svg" height="20"> Discord

Send, edit, and delete messages in channels. Manage servers (guilds), channels, roles, members, invites, webhooks, threads, scheduled events, auto moderation rules, audit logs, application commands, and custom guild emojis.

## Tools

### Get Audit Log

Fetch audit log entries for a Discord guild. Supports filtering by user, action type, and pagination via snowflake IDs.

### Manage Auto Moderation

Manage auto moderation rules in a Discord guild. Supports listing all rules, getting a specific rule, creating new rules, updating existing rules, and deleting rules.

### Manage Application Commands

List, get, create, update, or delete Discord application commands at global or guild scope.

### Manage Channels

List, get, create, update, or delete channels in a Discord guild. Supports text, voice, category, announcement, stage, and forum channel types.

### Manage Emojis

List, get, create, update, or delete custom guild emojis.

### Manage Guild

Get information about a Discord guild (server), list the current user's guilds, or update guild settings such as name, description, verification level, and notification preferences.

### Manage Invites

List, create, or delete Discord invites. Invites allow users to join a guild via a shareable link. You can list invites for a specific channel or an entire guild, create new invites for a channel, or delete existing invites by code.

### Manage Members

List, get, search, update, kick, ban, or unban members in a Discord guild. Supports modifying nicknames, roles, mute, and deafen states.

### Manage Messages

Manage messages in a Discord channel. Supports listing messages, getting a specific message, editing, deleting, pinning/unpinning, listing pinned messages, and bulk deleting messages.

### Manage Reactions

Add or remove emoji reactions on a Discord message. Supports adding a reaction, removing your own reaction, or removing all reactions from a message.

### Manage Roles

List, create, update, or delete roles in a Discord guild. Also supports assigning or removing roles from guild members.

### Manage Scheduled Events

Manage guild scheduled events in Discord. Supports listing, creating, updating, and deleting scheduled events for a guild.

### Manage Threads

Manage Discord threads: create a thread from an existing message, create a standalone thread in a channel, or list all active threads in a guild.

### Manage Webhooks

List, create, update, delete, or execute webhooks in a Discord channel or guild. Webhooks allow external services to send messages to Discord channels without a bot user.

### Send Message

Send a message to a Discord channel. Supports plain text content, rich embeds, replying to an existing message, and text-to-speech (TTS).

## Chat adapter

The **Bot Token** connection also implements the normalized chat adapter
(`metorial_chat$…` actions) with realtime events over the Discord Gateway. The
user **OAuth2** connection is not chat-eligible: a user token cannot act as the
bot or open the bot gateway.

### Setup

1. In the [Developer Portal](https://discord.com/developers/applications), create
   the application and copy the bot token from **Bot**.
2. Enable the privileged **Message Content Intent** on the **Bot** page. Without
   it message text is empty (except DMs and messages that mention the bot) and
   the gateway rejects the connection with close code 4014. Bots in 100 or more
   servers need Discord's approval for this intent.
3. Leave **Interactions Endpoint URL** empty so slash commands arrive over the
   gateway (the two delivery modes are mutually exclusive).
4. Invite the bot with the `bot` and `applications.commands` scopes and the view
   channel, read history, send messages (and in threads), embed links, attach
   files, and add reactions permissions. `metorial_chat$setup.get` generates the
   install URL and a slash-command registration body.

### Supported matrix

| Action / event | Support | Discord API |
| --- | --- | --- |
| Workspaces | Native: one workspace per server (guild) | `GET /users/@me/guilds`, `GET /guilds/{id}` |
| `message.send` / `edit` / `delete` | Native | Create/Edit/Delete Message |
| `message.get` / `list` | Native; pages oldest-first with `before`/`after` id cursors | Get Channel Message(s) |
| Replies | Native (`message_reference`) | Create Message |
| Threads | Threads are channels: `threadId` targets the thread channel | Create Message |
| `reaction.add` / `remove` / `list` | Native (bot's own reaction; Unicode and `name:id` custom emoji) | Reactions |
| `channel.list` / `get` | Native; `channel.list` needs `workspaceId` when the bot is in several servers | Get Guild Channels, Get Channel |
| `dm.openSingle` | Native | Create DM |
| `user.get` / `user.getAuthenticated` | Native (no workspace on the bot user; use `workspace.list`) | Get User |
| `typing.start` | Native (about 10 seconds) | Trigger Typing Indicator |
| `file.upload` | Upload happens with the message: returns a pending attachment, no API call | — |
| Attachments on `message.send` / `edit` | Native multipart upload (25 MiB per request); edits keep listed files | Create/Edit Message |
| `file.download` | Native; fresh signed CDN URL from the owning message, renewed before expiry | Get Channel Message |
| `command.list` | Native (global, or server commands with `workspaceId`) | Get Application Commands |
| `command.respond` | Native; edits the deferred (public) response. Ephemeral replies are rejected because Discord keeps the visibility chosen at deferral | Edit Original Interaction Response |
| `setup.get` | Public instructions, no connection needed | — |
| `message.received` / `mention.received` | Gateway `MESSAGE_CREATE` | Gateway |
| `message.updated` | Gateway `MESSAGE_UPDATE` with `edited_timestamp` (embed-only updates are ignored) | Gateway |
| `message.deleted` | Gateway `MESSAGE_DELETE` and each id of `MESSAGE_DELETE_BULK` | Gateway |
| `reaction.added` / `reaction.removed` | Gateway `MESSAGE_REACTION_ADD` / `REMOVE` | Gateway |
| `command.invoked` | Gateway `INTERACTION_CREATE` (application commands), acknowledged automatically | Gateway |

Content renders to Discord markdown (2,000 characters); cards and standalone
images become embeds (10 per message, Discord embed limits apply); tables and
charts render as code blocks. Over-limit content is rejected, never truncated.
Messages never ping `@everyone`/`@here`.

### Gateway behavior

One persistent connection per bot connection, owned by the platform:

- **Connect**: `GET /gateway/bot` for a new session, or the saved
  `resume_gateway_url` when a session can be resumed (`v=10&encoding=json`).
- **HELLO** → IDENTIFY (intents: guilds, guild messages, guild message
  reactions, direct messages, direct message reactions, message content) or
  RESUME with the saved session id and sequence. Heartbeats carry the latest
  sequence; a heartbeat request (op 1) is answered immediately.
- **READY** saves the session id, resume URL, bot user id, and application id.
  **RECONNECT** (op 7) and recoverable closes resume; **INVALID_SESSION** (op 9)
  resumes when Discord allows it, otherwise identifies again. Close codes 4007
  and 4009 start a new session; 4004 and 4010–4014 stop the connection with an
  error (4014: enable the Message Content intent).
- Events use `<session id>:<sequence>` as the delivery idempotency key, so a
  resume replay is deduplicated. Chat event ids are derived from Discord ids
  (for example `MESSAGE_CREATE:<message id>`).
- **Slash commands**: on `INTERACTION_CREATE` the connection sends a deferred
  response within Discord's 3-second window, then emits `command.invoked`. The
  `responseToken` holds the interaction id and token (valid 15 minutes) and
  never the bot token; the interaction token is removed from public raw data.

### Exclusions and limitations

- Not implemented: `message.search` and `message.markRead` (no bot API),
  `message.sendEphemeral` (Discord ephemeral messages exist only as interaction
  responses), `channel.members`, `thread.list` / `thread.get`, `dm.openGroup`
  (bots cannot create group DMs), `user.search`, `member.joined` / `member.left`
  (Discord membership is server-level, not channel-level).
- DMs have no server, so DM events carry no `workspaceId`. With several servers
  connected, a consumer that routes by workspace cannot attribute DM events to
  one of them.
- `MESSAGE_REACTION_REMOVE` carries only the user id, so the actor has no name.
  Reaction "remove all" / "remove emoji" events are not mapped (no actor).
- Self-authored messages are delivered with `author.isMe = true`; consumers
  filter them to avoid feedback loops.
- Without the Message Content intent (or before Discord approves it), message
  bodies from other users may be empty.
- One gateway connection per bot without sharding; very large bots that Discord
  requires to shard (close code 4011) are not supported.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
