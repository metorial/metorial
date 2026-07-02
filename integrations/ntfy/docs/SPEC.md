# Slates Specification for Ntfy

## Overview

Ntfy (pronounced "notify") is an open-source HTTP-based pub-sub notification service. It is a simple HTTP-based pub-sub notification service that allows you to send notifications to your phone or desktop via scripts from any computer, using a REST API. It can be used via the public ntfy.sh server or self-hosted. Ntfy is open source, and dual-licensed under the Apache 2.0 and GPLv2 license.

## Authentication

By default, the ntfy server is open for everyone, meaning everyone can read and write to any topic (this is how ntfy.sh is configured). However, when access control is enabled on a server, authentication is required to publish or subscribe to protected topics.

Ntfy supports the following authentication methods:

### 1. Username + Password (Basic Auth)

Basic authentication uses username and password transmitted via the `Authorization: Basic <base64>` header. Passwords are hashed using bcrypt before storage.

The header is constructed as: `Authorization: Basic base64(username:password)`

Example: `Authorization: Basic dGVzdHVzZXI6ZmFrZXBhc3N3b3Jk`

### 2. Access Tokens (Bearer Auth)

Access tokens provide an alternative to password authentication. Tokens are 32-character strings prefixed with `tk_` and have configurable expiry times.

Use the header: `Authorization: Bearer tk_AgQdq7mVBoFD37zQVN29RhuMzNIz2`

Alternatively, tokens can be sent via Basic Auth with an empty username: `Authorization: Basic base64(:token)`

### 3. Query Parameter Auth

For situations where setting headers is difficult, authentication can also be passed via the `?auth=` query parameter, which is a raw base64 encoding of the full `Authorization` header value.

### Server URL

- Public server: `https://ntfy.sh`
- Self-hosted: any custom domain where an ntfy server instance is running

When using a self-hosted instance, the base URL must be configured to point to that server instead of `ntfy.sh`.

### Access Control

Ntfy's auth implements two roles (user and admin) and per-topic read and write permissions using an access control list (ACL). Permissions include: `read-write`, `read-only`, `write-only`, and `deny`.

## Features

### Publishing Messages

Send notifications to any topic via simple HTTP PUT/POST requests. Topics don't have to explicitly be created, so just pick a name and use it later when you publish a message. Messages can be sent as plain text in the request body, or as a JSON payload posted to the server root URL.

- **Title**: Custom notification title via the `Title` header.
- **Priority**: Five levels from `min` (1) to `max`/`urgent` (5), controlling vibration and sound behavior.
- **Tags & Emojis**: Tag messages with emoji short codes (auto-converted to emojis) or arbitrary labels.
- **Markdown**: Messages can be formatted using Markdown by setting the `Markdown` header to `yes`.
- **Click Action**: Define a URL to open when the notification is tapped (supports `http://`, `mailto:`, `geo:`, and custom app URIs).
- **Icons**: Specify a URL for a custom notification icon (JPEG/PNG only).

### Attachments

Send files along with notifications in two ways:

- **Local file upload**: Send a file as the PUT request body. Max attachment size defaults to 15 MB.
- **External URL**: Reference a remotely hosted file via the `Attach` header. No size or expiry limits apply for external URLs.

Attachments from local uploads expire after 3 hours by default.

### Action Buttons

Add up to three interactive action buttons to notifications:

- **View**: Opens a URL (website, app deep link, etc.).
- **HTTP**: Sends an HTTP request (e.g., to trigger a REST API) with configurable method, headers, and body.
- **Broadcast**: Sends an Android broadcast intent for integration with automation apps (Tasker, MacroDroid).
- **Copy**: Copies a specified value to the clipboard.

### Scheduled Delivery

Delay message delivery by specifying a future time via the `Delay` header. Supports Unix timestamps, durations (e.g., `30m`, `2 days`), or natural language (e.g., `tomorrow, 10am`). Minimum delay is 10 seconds, maximum is 3 days. Scheduled messages can be updated or canceled before delivery.

### Updating and Deleting Notifications

Update previously delivered notifications by publishing with the same sequence ID. Supports:

- **Update**: Replace the content of an existing notification.
- **Clear**: Mark as read and dismiss from notification drawer.
- **Delete**: Remove entirely from clients.

Useful for progress updates, replacing outdated alerts, or implementing dead man's switch patterns.

### Message Templating

Format incoming JSON webhook payloads into human-readable notifications using Go templates. Supports:

- **Pre-defined templates**: Built-in templates for GitHub, Grafana, and Alertmanager webhooks.
- **Custom templates**: YAML template files placed on the server.
- **Inline templating**: Go template expressions directly in message/title/priority fields.

Includes Sprig template functions for string manipulation, math, date handling, and more.

### E-mail Forwarding

Forward notifications to an e-mail address by setting the `Email` header. Also supports inbound e-mail publishing by sending an e-mail to `ntfy-<topic>@ntfy.sh`.

### Phone Calls

Trigger voice calls that read the notification message aloud using text-to-speech. Requires a verified phone number and an authenticated user account. Only available on ntfy Pro plans for the public server.

### Account and Token Management

- Create, list, and delete access tokens via the API.
- Manage user accounts (change password, delete account).
- Admin users can manage other users and their ACLs.

## Events

Ntfy supports real-time message subscriptions on topics through multiple streaming mechanisms:

### Topic Message Subscription

Subscribe to one or more topics and receive messages in real time as they are published. You can consume the subscription API as either a simple HTTP stream (JSON, SSE or raw), or via WebSockets.

- **JSON stream** (`<topic>/json`): Returns one JSON object per line as messages arrive.
- **SSE stream** (`<topic>/sse`): Returns messages as Server-Sent Events, compatible with the browser `EventSource` API.
- **Raw stream** (`<topic>/raw`): Returns only the message body text, one per line.
- **WebSocket** (`<topic>/ws`): Full WebSocket connection for bidirectional communication.

**Parameters:**

- Subscribe to multiple topics at once using comma-separated topic names (e.g., `topic1,topic2/json`).
- **`since`**: Fetch cached/missed messages since a given timestamp, duration, message ID, or `all`.
- **`poll=1`**: Return cached messages immediately and close the connection (no streaming).
- **`scheduled=1`**: Also return messages scheduled for future delivery.
- **Filters**: Filter returned messages by `id`, `message`, `title`, `priority` (logical OR), and `tags` (logical AND).

**Event types** received on the stream include:

- `open`: Connection established.
- `message`: A new message was published.
- `message_clear`: A notification was marked as read/dismissed.
- `message_delete`: A notification was deleted.
- `keepalive`: Periodic keepalive signal.
