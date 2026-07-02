Now let me get more details on the Zulip REST API authentication and the real-time events system:Now let me fetch the HTTP headers documentation page for more auth details:Now I have enough information to write the specification. Let me compile it.

# Slates Specification for Zulip

## Overview

Zulip is an open-source team chat application that organizes conversations into channels (streams) with threaded topics. It offers both a hosted cloud service (Zulip Cloud) and a self-hosted option. The Zulip REST API powers the Zulip web and mobile apps, so anything you can do in Zulip, you can do with Zulip's REST API.

## Authentication

Zulip uses **API key authentication** via HTTP Basic authentication. There is no OAuth2 flow for API access.

**Credentials required:**

- **Email address** (used as the "username")
- **API key** (used as the "password")
- **Server URL** (the base URL of the Zulip server, e.g., `https://your-org.zulipchat.com` for Zulip Cloud or a custom domain for self-hosted)

If you're making your own HTTP requests, you'll want to send the appropriate HTTP basic authentication headers. Specifically, requests are authenticated using HTTP `Basic` auth where the email address is the username and the API key is the password, sent via the `Authorization` header. In `curl`, this is represented as `-u EMAIL_ADDRESS:API_KEY`.

**Obtaining an API key:**

- An API key is how a bot identifies itself to Zulip. For the official clients, such as the Python bindings, we recommend downloading a zuliprc file. This file contains an API key and other necessary configuration values for using the Zulip API with a specific account on a Zulip server.
- For human users: Navigate to Personal settings → Account & privacy → API Key in the Zulip web/desktop app.
- For bots: You will likely want to create a bot, unless you're using the API to interact with your own account. Bot API keys are available through the bot management UI.
- Programmatically: POST `https://your-org.zulipchat.com/api/v1/fetch_api_key`. This API endpoint is used by clients such as the Zulip mobile and terminal apps to implement password-based authentication. Given the user's Zulip login credentials, it returns a Zulip API key that the client can use to make requests as the user.

**Important considerations:**

- Since Zulip can be self-hosted, the server URL is a required custom input. For Zulip Cloud, the URL is `https://{organization}.zulipchat.com`.
- There are no scopes — the API key grants full access to everything the authenticated user/bot has permission to do based on their role in the organization.
- Zulip has a role-based permissions system (Owner, Administrator, Moderator, Member, Guest) that determines what actions an API key holder can perform.

## Features

### Messaging

Send, retrieve, edit, and delete messages in channels (streams) or as direct messages (1:1 and group). Messages support Zulip-flavored Markdown formatting, emoji reactions, file attachments, and read receipts. Messages can be searched and filtered using Zulip's "narrow" query system. Message flags (e.g., read, starred) can be managed per-user.

- Messages are organized into channels and topics.
- Supports scheduled messages for future delivery.
- Supports message reminders.
- File uploads are supported for attachments.

### Channels (Streams) Management

Create, update, archive, and list channels. Manage channel subscriptions for users, including subscribing and unsubscribing. Retrieve topics within a channel, manage default channels, and organize channels into folders.

- Channels can be public or private.
- Per-user subscription settings (e.g., notification preferences, pin, mute) can be configured.
- Topic-level preferences (e.g., muting, visibility) are supported.

### User Management

Retrieve, create, update, deactivate, and reactivate users. Manage user statuses, presence information, and typing indicators. Supports user groups with membership and subgroup management.

- User profiles include custom profile fields.
- Alert words can be configured per user.
- Users can be muted/unmuted.

### Organization & Server Configuration

Retrieve and update organization-level settings, including custom emoji, linkifiers, code playgrounds, and custom profile fields. Manage data exports and realm-level defaults for user settings.

- Custom emoji can be uploaded and managed.
- Linkifiers allow automatic URL pattern matching in messages.

### Invitations

Send email invitations or create reusable invitation links to invite new users to an organization. Existing invitations can be managed (resend, revoke).

### Drafts & Saved Snippets

Create, retrieve, edit, and delete message drafts and saved snippets for reuse.

### Outgoing Webhooks

Outgoing webhooks allow you to build or set up Zulip integrations which are notified when certain types of messages are sent in Zulip. When one of those events is triggered, we'll send an HTTP POST payload to the webhook's configured URL.

- Triggered when the bot is mentioned or receives a direct message.
- Zulip supports outgoing webhooks both in a clean native Zulip format, as well as a format that's compatible with Slack's outgoing webhook API.

## Events

Zulip provides a **real-time events API** based on long-polling, rather than traditional outgoing webhooks to external URLs. This powerful endpoint can be used to register a Zulip "event queue" (subscribed to certain types of "events", or updates to the messages and other Zulip data the current user has access to), as well as to fetch the current state of that data.

The mechanism works as follows: a client registers an event queue via `POST /api/v1/register`, specifying which `event_types` to subscribe to, and then polls for new events via `GET /api/v1/events` using long-polling. The server will queue events for up to 10 minutes of inactivity. After 10 minutes, your event queue will be garbage-collected. The server will send heartbeat events every minute, which makes it easy to implement a robust client that does not miss events unless the client loses network connectivity with the Zulip server for 10 minutes or longer.

### Message Events

New messages sent to channels or direct messages the user has access to. Includes message edits, deletions, and topic/channel moves. Can be filtered by narrow (e.g., specific channel, DMs only).

### Reaction Events

Emoji reactions added to or removed from messages.

### Presence Events

Updates to user online/offline/idle presence status.

### Typing Events

Typing start/stop indicators from other users in conversations.

### Channel Events

Channel creation, updates (name, description, permissions), and archival. Subscription changes (users joining/leaving channels).

### User Events

User profile changes (name, avatar, role, timezone, custom profile fields), user creation, and deactivation.

### Organization/Realm Events

Changes to organization-level settings, custom emoji, linkifiers, code playgrounds, custom profile fields, and user groups.

### Message Flag Events

Changes to personal message flags (e.g., read, starred) for the authenticated user.

### Subscription Events

Changes to the authenticated user's channel subscriptions and per-subscription settings (e.g., notification preferences).
