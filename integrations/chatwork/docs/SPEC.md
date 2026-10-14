# Chatwork API specification

## Overview

Chatwork is a business communication platform popular in Japan that provides team messaging, task management, and file sharing within chat rooms. It offers a REST API (v2) for programmatic access to its messaging and collaboration features, enabling integration with external applications and services.

## Authentication

Chatwork supports two authentication methods:

### 1. API Token

A simple token-based authentication method. Users generate an API token from their Chatwork account settings at `https://www.chatwork.com/service/packages/chatwork/subpackages/api/token.php`. The token is passed in the `X-ChatWorkToken` HTTP header with every request. API tokens do not expire.

**Base URL:** `https://api.chatwork.com/v2`

### 2. OAuth 2.0 (Authorization Code Grant)

The integration supports the **Authorization Code Grant** with confidential OAuth clients and Basic client authentication. Access tokens are refreshed through the documented refresh-token grant. Chatwork also supports public PKCE clients, which this integration does not expose.

- **Authorization URL:** `https://www.chatwork.com/packages/oauth2/login.php`
- **Token URL:** `https://oauth.chatwork.com/token`
- **Response type:** Only `code` is supported.

**Client types:**

- **Confidential clients:** Server-side applications that can securely store credentials. Use Basic Authentication (client ID and client secret) when requesting tokens.
- **Public clients:** Frontend/mobile applications. Must use PKCE (`code_challenge_method=S256`). Pass `client_id` as a query parameter instead of Basic Auth.

**Token lifetimes:**

- Access token: 30 minutes
- Refresh token: 14 days (or indefinite with the `offline_access` scope)

**Scopes (space-separated):**

| Scope                     | Description                                                           |
| ------------------------- | --------------------------------------------------------------------- |
| `users.all:read`          | Aggregate: profile, status, and tasks for the authenticated user      |
| `users.profile.me:read`   | Read own profile                                                      |
| `users.status.me:read`    | Read own unread/mention counts                                        |
| `users.tasks.me:read`     | Read own task list                                                    |
| `rooms.all:read_write`    | Aggregate: full read and write access to rooms                        |
| `rooms.all:read`          | Aggregate: read room info, members, messages, tasks, and files        |
| `rooms.all:write`         | Aggregate: write room info, members, messages, tasks, and files       |
| `rooms:write`             | Create and delete chat rooms                                          |
| `rooms.info:read`         | List and get room details                                             |
| `rooms.info:write`        | Update room info                                                      |
| `rooms.members:read`      | Get room members                                                      |
| `rooms.members:write`     | Add/remove/change room members                                        |
| `rooms.messages:read`     | Read messages in rooms                                                |
| `rooms.messages:write`    | Post, edit, delete messages; mark as read/unread                      |
| `rooms.tasks:read`        | Read tasks in rooms                                                   |
| `rooms.tasks:write`       | Create tasks in rooms                                                 |
| `rooms.files:read`        | Read file info in rooms                                               |
| `rooms.files:write`       | Upload files to rooms                                                 |
| `contacts.all:read_write` | Aggregate: read and manage contacts and contact requests              |
| `contacts.all:read`       | Read contacts and incoming contact requests                           |
| `contacts.all:write`      | Approve or reject incoming contact requests                           |
| `offline_access`          | Enables indefinite refresh token lifetime (confidential clients only) |

**Note:** Users on Business or Enterprise plans require admin permission to use the API.

## Features

### User Profile & Status

Retrieve the authenticated user's profile information (name, email, organization, avatar, etc.) and account status including unread message counts, mention counts, and pending task counts.

### Contacts Management

Retrieve the authenticated user's contact list. View, approve, or reject incoming contact requests from other Chatwork users.

### Chat Room Management

Create, update, and delete group chat rooms. Each room has a name, description, icon preset (e.g., `group`, `meeting`, `project`, `business`), and type (my chat, direct, or group). Room members can be assigned roles: admin, member, or read-only. You can list all rooms the user participates in and retrieve detailed room information.

### Room Membership Management

View, add, and remove members from chat rooms. Change member roles (admin, member, read-only) within a room.

### Messaging

Send, retrieve, edit, and delete messages within chat rooms. Messages support a special markup syntax including mentions (`[To:account_id]`), quotes, reply references, info blocks, code blocks, horizontal rules, and titles. Messages can be marked as read or unread.

### Task Management

Create and retrieve tasks within chat rooms. Tasks can be assigned to one or more room members with an optional due date. Tasks have a completion status (open or done). The user can also retrieve a global list of all tasks assigned to them across all rooms.

### File Sharing

List file metadata with an optional uploader filter, or request a specific file for download. Specific-file output preserves the provider download URL. The URL expires after 30 seconds and downloads renew through the stable room and file IDs with a 10-second margin. Upload is available in the provider API but is not exposed by this integration.

## Events

Chatwork supports webhooks for real-time event notifications. Webhook URLs are configured through the Chatwork webhook management UI. Each account can register up to 5 webhooks. Webhook payloads are delivered via HTTPS POST and include an HMAC-SHA256 signature (in the `X-ChatWorkWebhookSignature` header) for verification.

### Message Created (`message_created`)

Triggered when a new message is posted in any chat room the user participates in. The payload includes the message ID, room ID, sender account ID, message body, and timestamp.

### Message Updated (`message_updated`)

Triggered when a message is edited in any chat room the user participates in. The payload structure is the same as the message created event, with an updated timestamp.

### Mention to Me (`mention_to_me`)

Triggered when the authenticated user is mentioned in a message. The payload includes the sender's account ID, the recipient's account ID, room ID, message ID, message body, and timestamp.

## Direct resource lookup

- `get_message`: GET `/rooms/{room_id}/messages/{message_id}` returns a known message with sender, body, and timestamps.
- `get_task`: GET `/rooms/{room_id}/tasks/{task_id}` returns a known task with its originating message, assignee, assigner, status, and deadline.

The `get_tasks` room branch sends the status and optional assignee filter to Chatwork before its 100-item limit. Its existing assigner filter retains its personal-task-only meaning. Task-status updates send the provider form field `body` and return the confirmed input status; the upstream response contains only a string task ID. The existing public task ID remains numeric.

## Official documentation

- [API endpoint guide](https://developer.chatwork.com/docs/endpoints)
- [OAuth](https://developer.chatwork.com/docs/oauth)
- [Endpoint reference](https://developer.chatwork.com/reference)
- [Current OpenAPI endpoint definitions](https://developer.chatwork.com/llms.txt)
