# Slates Specification for Pushbullet

## Overview

Pushbullet is a service that connects devices (phones, browsers, computers) to enable sending notifications, sharing links/files, mirroring phone notifications, sending SMS/MMS messages, and syncing clipboard content across devices. It provides a REST API at `https://api.pushbullet.com` and a realtime WebSocket stream for receiving events.

## Authentication

Pushbullet supports two authentication methods:

### 1. Access Token (API Key)

To authenticate for the API, use your access token in a header like `Access-Token: <your_access_token_here>`. Your access token can be found on the Account Settings page.

Alternatively, the API uses HTTP Basic Auth for authentication. To authenticate, use your access token as the username in the HTTP Basic Auth header, along with an empty password.

Access tokens can be generated at: `https://www.pushbullet.com/#settings/account`

### 2. OAuth2

OAuth lets you access a user's Pushbullet account or have them authenticate with their Pushbullet account using a browser.

**Setup:**

1. Register your app (OAuth client) at `https://www.pushbullet.com/create-client`, which generates a `client_id` and `client_secret`.
2. Redirect the user to the authorization URL: `https://www.pushbullet.com/authorize` with parameters:
   - `client_id` — Your OAuth client ID
   - `redirect_uri` — Where to redirect after authorization (path must match the registered redirect URI)
   - `response_type` — Either `code` (server-side flow) or `token` (client-side flow)

**Server-side flow (`response_type=code`):**

- After user authorization, your redirect URI receives a `code` parameter.
- Exchange the code for an access token by POSTing to `https://api.pushbullet.com/oauth2/token` with `grant_type=authorization_code`, `client_id`, `client_secret`, and `code`.

**Client-side flow (`response_type=token`):**

- After authorization, the access token is returned as a URL fragment (`#access_token=<token>`) on the redirect URI.
- For embedded browsers, `https://www.pushbullet.com/login-success` can be used as the redirect URI.

Access tokens do not have a set expiration time but may be expired in the future. No scopes are used; tokens have full account access.

## Features

### Pushes

Send and receive pushes across devices and to other users. Three push types are supported: **note** (title + body text), **link** (title + body + URL), and **file** (body + uploaded file). Pushes can be targeted to a specific device, an email address, a channel (by tag), or an OAuth client's users. If no target is specified, the push is broadcast to all of the user's devices. Pushes can be listed, dismissed, and deleted.

### Device Management

Register, list, update, and delete devices associated with a Pushbullet account. Devices represent phones, browsers, computers, or custom integrations. Each device has properties like nickname, manufacturer, model, icon, and whether it has SMS capability.

### SMS/MMS Messaging (Texts)

Send text messages (SMS) or group messages (MMS) through an Android device connected to the account. Supports sending text and picture messages. Messages are queued and sent as soon as the phone device syncs. In order to prevent stale messages from being sent, queued messages are deleted after 1 hour even if they have not been sent. Pushbullet Pro is required to send more than 100 messages per month through Pushbullet.

### Channels and Subscriptions

Create channels identified by unique tags that other users can subscribe to. Pushing to a channel sends the push to all subscribers. Channels can optionally be linked to an RSS feed with configurable filters to auto-create posts. Users can list, create, mute, and delete their channel subscriptions. Channel info (including subscriber count and recent pushes) can be queried publicly.

### Chats

Manage conversations with other Pushbullet users or email contacts. Chats are automatically created when messaging someone. Chats can be listed, created, muted, and deleted.

### Ephemerals

Send arbitrary JSON messages that are delivered directly to all devices on the account in real time. Ephemerals are short-lived and not persisted long-term. They power features like notification mirroring, universal copy/paste, and SMS sending.

### Notification Mirroring

Mirror Android phone notifications to other devices via ephemerals. Mirrored notifications include the app name, title, body, icon, and package info. Notifications can also be dismissed across devices.

### Universal Copy/Paste

Sync clipboard content across all devices on the account using ephemeral messages. When a user copies text on one device, it can be pushed to all other devices.

### File Upload

Upload files to Pushbullet's storage for use in file pushes or MMS messages. The process involves requesting an upload URL, uploading the file via multipart/form-data, and then referencing the resulting file URL in a push or text.

### End-to-End Encryption

Supports optional client-side encryption for ephemerals (notification mirroring, copy/paste, SMS) using AES-256-GCM with keys derived via PBKDF2 from a user-supplied password. No keys are sent to the server.

## Events

Pushbullet provides a **Realtime Event Stream** via a WebSocket connection at `wss://stream.pushbullet.com/websocket/<access_token>`.

### Tickle Events

Indicates that a resource has changed on the server. The `subtype` field specifies what changed:

- **push** — A change to pushes (new, updated, or deleted).
- **device** — A change to devices.

Upon receiving a tickle, clients should fetch updated resources using the `modified_after` parameter to stay in sync.

### Ephemeral Push Events

Delivered directly on the stream when an ephemeral is sent. These include:

- **Mirrored notifications** (`type=mirror`) — Android notifications forwarded to other devices, including app name, title, body, and icon.
- **Notification dismissals** (`type=dismissal`) — Signals that a notification should be dismissed.
- **Clipboard updates** (`type=clip`) — Universal copy/paste content shared across devices.
- **SMS messages** — SMS-related ephemeral messages.

### Connection Keepalive

The stream sends `nop` (no-operation) messages every 30 seconds to confirm the connection is active.
