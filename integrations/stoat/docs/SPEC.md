Let me get more details from the official API reference and websocket events.# Slates Specification for Revolt

## Overview

Revolt (now rebranding to Stoat) is an open source user-first chat platform. The Revolt API allows developers to create applications that interact with the Revolt chat platform, enabling access to and manipulation of user data, messaging capabilities, groups, and more. It is self-hostable and provides a REST API alongside a WebSocket-based real-time event system.

## Authentication

Revolt supports two primary authentication methods:

### Bot Token Authentication

To authenticate with the API, you must first acquire a bot token or user token. Bots are created from user settings in the client. The bot token is provided in the `X-Bot-Token` HTTP header on API requests. Bot tokens are generated when a bot is created via the `/bots/create` endpoint or from the Revolt client UI.

Example header:

```
X-Bot-Token: <your-bot-token>
```

### Session Token Authentication (User Accounts)

The `x-session-token` header contains the session token for user-based authentication. User sessions are created by authenticating via the API with email/password credentials, optionally with MFA (TOTP, recovery code, or password-based MFA challenge). Session login returns a session token and session ID.

Example header:

```
X-Session-Token: <your-session-token>
```

### Webhook Token Authentication

Webhooks provide an alternative automation mechanism that allows external systems to send messages to channels without requiring a full bot implementation. Webhooks can be executed with tokens, allowing external systems to send messages without session authentication. The webhook token is included directly in the URL path: `/webhooks/{webhook_id}/{token}`.

**Base API URL:** `https://api.revolt.chat`

## Features

### Messaging

Send, edit, delete, search, and fetch messages in channels. Messages support text content, embeds, file attachments, replies, reactions, and masquerade (overriding displayed username/avatar). Messages can include embeds, reply references, and masquerade options that overwrite the username and avatar shown. Messages can also be pinned and bulk-deleted.

### Server Management

Create, edit, and delete servers. Manage server settings including name, description, icon, banner, categories, and system message channels. Servers support role-based permissions with configurable role hierarchy, colors, and hoisting.

### Channel Management

Create and manage various channel types including text channels, voice channels, group DMs, and saved messages. Channels can be edited for name, description, and icon. Permissions can be configured per role per channel.

### User & Member Management

Fetch user profiles, manage friend relationships (add, remove, block), and manage server members. Server members can have nicknames, custom avatars, and role assignments. Supports banning and kicking members.

### Bot Management

Create and manage bot accounts that can be invited to servers or group chats. Bots can be configured as public (discoverable and invitable by anyone) or private. Bot properties include analytics settings, interactions URL, terms of service, and privacy policy URLs.

### Webhooks

Webhooks allow external systems to send messages to channels without requiring a full bot implementation. Webhooks are created per channel and can be managed (created, edited, deleted). They are executed via a simple HTTP POST with the webhook token in the URL.

### Custom Emoji

Create, fetch, and delete custom emoji associated with servers. Emoji can be used in messages and reactions across the server.

### Invites

Create and manage invite links for servers and channels. Invites can be fetched, listed, and deleted.

### File Uploads

Upload files for use as attachments, avatars, backgrounds, icons, banners, and emojis through the Autumn file service. Files are uploaded separately and then referenced by ID.

### Voice Chat

Join voice channels for real-time audio communication. Voice is powered by a separate WebRTC-based service (Voso/LiveKit).

## Events

Revolt provides a real-time event system via a **WebSocket gateway** (called "Bonfire"). Bonfire is Revolt's websocket server; it handles incoming messages, updates, new data and more. After authenticating over the WebSocket connection, clients receive events for all resources they have access to.

### Message Events

- Events for new messages being sent, messages being edited, messages being deleted, and bulk message deletions.
- Reaction add/remove events on messages.

### Channel Events

- Channel creation, updates, and deletion.
- Typing start/stop indicators for channels.
- Channel group membership changes (user join/leave for group DMs).

### Server Events

- Server updates and deletion.
- Member join, update (nickname/role changes), and leave events.
- Role creation, updates, and deletion.

### User Events

- User profile and status updates.
- Relationship changes (friend requests, blocks).
- User platform flags changes.

### Emoji Events

- Custom emoji creation and deletion.

### Webhook Events

- Webhook creation, update, and deletion notifications.

### Connection Lifecycle Events

- Ready event (initial state with user, servers, channels, members, emojis).
- Authentication acknowledgment and error events.
- Ping/pong keepalive mechanism.
