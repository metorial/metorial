Now let me get the full list of event types from Slack's reference page:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Slack

## Overview

Slack is a workplace messaging and collaboration platform by Salesforce. Its API provides programmatic access to messaging, channels, users, files, reactions, and workspace administration. The Slack Web API is an interface for querying information from and enacting change in a Slack workspace.

## Authentication

Slack uses **OAuth 2.0** as its primary authentication mechanism. OAuth allows a user in any Slack workspace to install your app. At the end of the OAuth flow, your app gains an access token, which opens the door to Slack API methods, events, and other features.

**OAuth 2.0 Flow (V2):**

1. Redirect the user to the authorization URL: `https://slack.com/oauth/v2/authorize` with query parameters including `client_id`, `scope` (bot scopes), optionally `user_scope` (user-level scopes), `redirect_uri`, and `state`.
2. Parse the HTTP request that lands at your Redirect URL for a `code` field — that's a temporary authorization code, which expires after ten minutes.
3. Exchange the code for an access token by calling `oauth.v2.access` with your `code`, `client_id`, and `client_secret`.

**Credentials Required:**

- **Client ID** and **Client Secret**: Obtained when creating a Slack app at `api.slack.com/apps`.
- **Redirect URL**: Must be configured in the app settings under OAuth & Permissions. Must use HTTPS.

**Token Types:**

Slack uses bot tokens (`xoxb-` prefix), user tokens (`xoxp-` prefix), and app-level tokens (`xapp-` prefix).

- **Bot Token (`xoxb-`)**: The app's independent identity. Posts messages, listens to events. This is the default token for most integrations.
- **User Token (`xoxp-`)**: Acts on behalf of a specific user for user-centric actions.
- **App-Level Token (`xapp-`)**: Enables Socket Mode and cross-workspace management.

**Token Usage:**

Authenticate your Web API requests by providing a bearer token, which identifies a single user or bot user relationship. Tokens are passed in the `Authorization: Bearer <token>` header.

**Token Expiration:**

OAuth tokens do not expire. If they are no longer needed, they can be revoked. Additionally, for Slack apps using granular permissions, you can exchange your access token for a refresh token and an expiring access token with token rotation.

**Scopes:**

Slack apps use OAuth scopes to govern what they can access. These are added in the app settings when building an app. You will attach these scopes to your tokens. Slack uses scopes that refer to the object they grant access to, followed by the class of actions on that object they allow (e.g., `file:write`).

Key scope categories include:

- `channels:read`, `channels:manage`, `channels:history` — Public channel access
- `groups:read`, `groups:history` — Private channel access
- `im:read`, `im:history`, `im:write` — Direct message access
- `mpim:read`, `mpim:history`, `mpim:write` — Group DM access
- `chat:write` — Send messages
- `files:read`, `files:write` — File access
- `users:read`, `users:write` — User information
- `reactions:read`, `reactions:write` — Emoji reactions
- `pins:read`, `pins:write` — Pinned items
- `usergroups:read`, `usergroups:write` — User groups
- `team:read` — Workspace information
- `bookmarks:read`, `bookmarks:write` — Channel bookmarks
- `canvases:read`, `canvases:write` — Canvas documents
- `lists:write` — Lists management
- `search:read` — Search messages and files
- Various `admin.*` scopes for Enterprise Grid administration

## Features

### Messaging

Send, update, delete, and schedule messages in channels, group DMs, and direct messages. Messages support rich formatting via Block Kit, attachments, and threaded replies. You can also post ephemeral messages visible only to specific users.

### Conversations (Channels) Management

Create, archive, and manage conversations using conversation-specific Web APIs. This includes public channels, private channels, direct messages, and group DMs. You can invite/remove members, set topics and purposes, and retrieve conversation history.

### User Management

Retrieve user profiles, presence status, and workspace membership information. On Enterprise Grid plans, admin APIs allow provisioning users, assigning roles, and managing invite requests. SCIM API is available for user provisioning at scale.

### File Management

Upload, list, retrieve, and delete files shared within a workspace. Files can be shared to specific channels or conversations.

### Reactions

Add, remove, and list emoji reactions on messages, files, and file comments.

### Pins & Bookmarks

Pin and unpin messages in channels. Create and manage channel bookmarks (saved links).

### Search

Search for messages and files across the workspace, filtered by query terms. Requires a user token with the `search:read` scope.

### User Groups

Create, update, disable, and manage user groups (also known as handle groups). Manage group membership.

### Reminders

Create, list, complete, and delete reminders for users.

### Incoming Webhooks

Incoming webhooks allow external services to post messages directly into a specified Slack channel, providing real-time updates or notifications. These are simple URLs that accept a JSON payload and do not require a full OAuth flow.

### Canvases & Lists

Create and edit canvases (rich documents) and lists within Slack.

### Workspace & Team Administration

Access workspace information, manage preferences, and configure workspace settings. On Enterprise Grid, admin APIs provide organization-wide management of conversations, users, teams, roles, and app approvals.

### Slack Connect

Manage shared channels between different Slack organizations, including sending, accepting, approving, and declining invitations.

### Interactive Surfaces

Create and update a Home tab to give users a persistent space to interact. Empower users to invoke interaction at any time with shortcuts. Open modals to collect info and provide a space for displaying dynamic details.

- **Slash Commands**: Register custom commands that users can invoke with `/command`.
- **Shortcuts**: Global and message-level shortcuts for quick actions.
- **Modals**: Multi-step forms and interactive dialogs.
- **App Home**: A dedicated tab for your app per user.

### Audit Logs (Enterprise Grid)

Audit Logs API are tailored for building security information and event management tools. Available only for Enterprise Grid organizations.

## Events

The Events API is a streamlined way to build apps that respond to activities in Slack. When you use the Events API, Slack calls you. You have two options: you can either use Socket Mode or you can designate a public HTTP endpoint that your app listens on, choose what events to subscribe to, and Slack sends the appropriate events to you.

The Events API leverages Slack's existing object-driven OAuth scope system to control access to events. For example, if your app has access to files through the `files:read` scope, you can choose to subscribe to any or none of the file-related events such as `file_created` and `file_deleted`.

Event subscriptions are configured in the app settings and are split into **Bot Events** (received on behalf of the bot user) and **User Events** (received on behalf of users who installed the app).

### Message Events

Activity related to messages across channels, DMs, group DMs, and the App Home. Includes new messages, edits, deletions, and message metadata changes. Subtypes include `message.channels`, `message.groups`, `message.im`, `message.mpim`, and `message.app_home`.

- Requires scopes like `channels:history`, `groups:history`, `im:history`, `mpim:history`.

### Channel / Conversation Events

Lifecycle events for channels and groups: creation, deletion, archiving, unarchiving, renaming, membership changes (`member_joined_channel`, `member_left_channel`), shared channel events, and channel ID changes.

- Requires scopes like `channels:read`, `groups:read`.

### Reaction Events

When reactions (emoji) are added to or removed from messages, files, or comments (`reaction_added`, `reaction_removed`).

- Requires `reactions:read` scope.

### File Events

File lifecycle events: `file_created`, `file_change`, `file_deleted`, `file_shared`, `file_unshared`, `file_public`.

- Requires `files:read` scope.

### User & Team Events

User profile changes (`user_change`), new team members (`team_join`), user presence/status changes, huddle state changes, and Do Not Disturb updates (`dnd_updated`).

- Requires scopes like `users:read`.

### User Group Events

User group (subteam) creation, updates, and membership changes (`subteam_created`, `subteam_updated`, `subteam_members_changed`).

- Requires `usergroups:read` scope.

### Pin Events

When items are pinned or unpinned from a channel (`pin_added`, `pin_removed`).

- Requires `pins:read` scope.

### App Lifecycle Events

With app events, you can track app uninstallation, token revocation, Enterprise org migration, and more. Includes `app_uninstalled`, `app_home_opened`, `app_mention`, `app_rate_limited`, `tokens_revoked`, and `app_requested`.

### Link Shared Events

When a URL domain registered by the app is shared in a message (`link_shared`), enabling URL unfurling.

### Workspace Events

Workspace-level changes such as `team_rename`, `team_domain_change`, `emoji_changed`, `email_domain_changed`, and workspace preference changes.

### Slack Connect Events

Shared channel invite lifecycle: `shared_channel_invite_received`, `shared_channel_invite_accepted`, `shared_channel_invite_approved`, `shared_channel_invite_declined`.

### Invite Request Events

When a user requests an invitation to a workspace (`invite_requested`). Relevant for workspaces with admin-approved invitations.
