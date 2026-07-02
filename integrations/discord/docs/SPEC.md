Now let me get the full list of webhook event types and the OAuth2 scopes from the official docs:Now let me get the OAuth2 scopes list from the official docs:Now I have comprehensive information. Let me compose the specification.

# Slates Specification for Discord

## Overview

Discord is a communication platform offering text, voice, and video channels organized into servers (guilds). Its API allows developers to build bots, integrate applications, manage servers/channels/messages, and interact with users programmatically. Discord provides both a REST API for CRUD operations and a Gateway WebSocket API for real-time events.

## Authentication

Discord supports two primary authentication methods:

### 1. Bot Token Authentication

Bot users are a separate type of user dedicated to automation, and are authenticated using the bot token found in your app's settings. Unlike the normal OAuth2 flow, bot users have full access to most API routes without using bearer tokens, and can connect to the Real Time Gateway.

- Obtain the bot token from the **Bot** page in the [Discord Developer Portal](https://discord.com/developers/applications).
- Authentication is performed with the `Authorization` HTTP header in the format `Authorization: Bot TOKEN`.
- Bot tokens do not expire but can be regenerated.

### 2. OAuth2 (User Authorization)

Within Discord, there are multiple types of OAuth2 authentication. Discord supports the authorization code grant, the implicit grant, client credentials, and some modified special-for-Discord flows for Bots and Webhooks. Discord also supports the Proof Key for Code Exchange (PKCE) extension to the OAuth2 authorization code flow, which allows users to authenticate without sharing your client secret.

**Credentials required:**

- `client_id` and `client_secret` obtained from the OAuth2 page in the Discord Developer Portal.
- A registered `redirect_uri`.

**Key endpoints:**

- Authorization URL: `https://discord.com/oauth2/authorize`
- Token URL: `https://discord.com/api/oauth2/token`
- Token Revocation URL: `https://discord.com/api/oauth2/token/revoke`

**Grant types:**

- **Authorization Code Grant** — Standard flow: redirect users to authorize, receive a `code`, exchange it for an `access_token` and `refresh_token`. Access tokens expire (default ~604800 seconds) and can be refreshed.
- **Implicit Grant** — Returns an access token directly in the URI fragment. No refresh token is provided.
- **Client Credentials Grant** — For server-to-server use; provides a bearer token for the bot owner. Limited scopes (especially for team-owned apps: `identify` and `applications.commands.update` only).

**Common OAuth2 scopes:**

- `identify` — Access basic user info (no email).
- `email` — Access user's email address.
- `guilds` — List the user's guilds.
- `guilds.join` — Add users to a guild (bot must already be a member).
- `guilds.members.read` — Read a user's guild member info.
- `connections` — Access user's linked third-party accounts.
- `bot` — Install a bot to a guild.
- `applications.commands` — Register application commands in a guild.
- `webhook.incoming` — Generate an incoming webhook via OAuth2 flow.
- `role_connections.write` — Update a user's role connection metadata.
- `dm_channels.read` — See user's DM and group DM info (requires Discord approval).
- `voice` — Connect to voice on user's behalf (requires Discord approval).

Some scopes (e.g., `rpc.*`, `dm_channels.read`, `voice`) require explicit approval from Discord before use.

## Features

### Guild (Server) Management

Create, read, update, and delete guilds. Manage guild settings including verification levels, notification defaults, system channels, and features. Retrieve guild previews, bans, and prune counts.

### Channel Management

Create and manage text, voice, announcement, stage, and forum channels within guilds. Manage channel permissions (overwrites), positions, and settings. Supports threads (creation, archiving, joining, member management).

### Messaging

Send, edit, delete, and fetch messages in channels. Supports rich content including embeds, attachments, file uploads, components (buttons, select menus), and polls. Pin and unpin messages. Bulk delete messages. Crosspost messages in announcement channels.

### Application Commands & Interactions

Register and manage slash commands, user commands, and message commands at global or guild scope. Receive and respond to interactions including commands, autocomplete, button clicks, select menu selections, and modal submissions. Interactions can be received via the Gateway or via an HTTP endpoint (Interaction Endpoint URL).

### Webhooks (Incoming)

Webhooks are a low-effort way to post messages to channels in Discord. They do not require a bot user or authentication to use. Create, manage, and execute webhooks to post messages (with embeds, files, and components) into channels. Each webhook has a unique URL with an embedded token. Supports thread targeting for forum channels. Native compatibility with GitHub and Slack payload formats.

### User & Member Management

Fetch user profiles, modify guild members (nickname, roles, mute, deafen), kick or ban members, and manage member roles. Add users to guilds via OAuth2 (`guilds.join` scope). Fetch user connections to third-party services.

### Role Management

Create, edit, delete, and reorder roles within a guild. Assign and remove roles from members. Configure role permissions.

### Emoji & Sticker Management

Create, modify, and delete custom emojis and stickers in a guild. Fetch available sticker packs.

### Scheduled Events

Create and manage guild scheduled events for voice, stage, or external locations. Manage event status (scheduled, active, completed, canceled) and retrieve interested users.

### Auto Moderation

Create and manage auto moderation rules to automatically flag or take action on content based on keyword filters, spam detection, or mention thresholds. Actions include blocking messages, sending alerts, and timeouts.

### Audit Log

Retrieve audit log entries for a guild to track administrative actions such as role changes, channel modifications, bans, and more.

### Voice

Retrieve voice regions and current voice states. Modify a user's voice state (e.g., suppress in stage channels).

### Invites

Create, retrieve, and delete invites for channels or guilds. View invite metadata such as usage counts.

### Rich Presence

Update a bot's or user's activity/presence status to display what they are currently doing (e.g., playing a game, streaming).

### Monetization

Manage SKUs, entitlements, and subscriptions for app monetization. Create test entitlements, list user entitlements, and handle in-app purchases.

### Soundboard

Fetch and manage soundboard sounds for guilds. Access default soundboard sounds.

### Lobbies

Create and manage multiplayer game lobbies through the API. Send messages within lobbies for in-game communication.

### Application Role Connections

Define and update metadata for role connections, allowing linked roles to be assigned to users based on external application data.

## Events

Discord supports two mechanisms for receiving events:

### Gateway (WebSocket)

Discord's Gateway API is used for maintaining persistent, stateful websocket connections between your client and our servers. These connections are used for sending and receiving real-time events your client can use to track and update local state.

The Gateway delivers real-time events across the following categories. You control which events you receive via **Intents** (a bitmask specified at connection time). Some intents are privileged (Guild Members, Guild Presences, Message Content) and require approval for bots in 75+ guilds.

- **Guild Events** — Guild create/update/delete, guild member add/update/remove, guild ban add/remove, guild role create/update/delete, guild integrations update.
- **Channel Events** — Channel create/update/delete, thread create/update/delete, thread member update, thread list sync.
- **Message Events** — Message create/update/delete, message delete bulk, message reaction add/remove/remove all, message poll vote add/remove.
- **Voice Events** — Voice state update (user joins/leaves/moves voice channels), voice server update.
- **Presence Events** — Presence update (user status and activity changes).
- **Interaction Events** — Interaction create (slash commands, buttons, selects, modals, autocomplete).
- **Invite Events** — Invite create/delete.
- **Scheduled Event Events** — Scheduled event create/update/delete, user add/remove.
- **Stage Instance Events** — Stage instance create/update/delete.
- **Auto Moderation Events** — Auto moderation rule create/update/delete, action execution.
- **Entitlement Events** — Entitlement create/update/delete (for monetization).
- **Integration Events** — Integration create/update/delete.
- **Webhook Events** — Webhooks update (when a channel's webhooks change).
- **Typing Events** — Typing start.
- **Soundboard Events** — Soundboard sounds update.

### Webhook Events (HTTP Outgoing Webhooks)

Webhook events are one-way events sent to your app over HTTP to notify you when an event occurred. Unlike events that are sent over Gateway connections, events sent over webhooks are not realtime or guaranteed to be in order.

You configure a Webhook Events URL in the Developer Portal and select which events to receive. Your endpoint must validate Ed25519 signatures via `X-Signature-Ed25519` and `X-Signature-Timestamp` headers, and respond with `204` within 3 seconds.

Available webhook event types:

- **Application Authorized** (`APPLICATION_AUTHORIZED`) — Sent when a user adds the app to a server or their account. Includes user, scopes, and optionally the guild.
- **Application Deauthorized** (`APPLICATION_DEAUTHORIZED`) — Sent when a user removes the app.
- **Entitlement Create/Update/Delete** (`ENTITLEMENT_CREATE`, `ENTITLEMENT_UPDATE`, `ENTITLEMENT_DELETE`) — Sent when an entitlement (monetization purchase/subscription) is created, updated, or deleted.
- **Quest User Enrollment** (`QUEST_USER_ENROLLMENT`) — Sent when a user is added to a Quest (currently unavailable).
- **Lobby Message Create/Update/Delete** (`LOBBY_MESSAGE_CREATE`, `LOBBY_MESSAGE_UPDATE`, `LOBBY_MESSAGE_DELETE`) — Sent when messages are created, updated, or deleted in a lobby (Social SDK).
- **Game Direct Message Create/Update/Delete** (`GAME_DIRECT_MESSAGE_CREATE`, `GAME_DIRECT_MESSAGE_UPDATE`, `GAME_DIRECT_MESSAGE_DELETE`) — Sent when direct messages are created, updated, or deleted during an active Social SDK session.
