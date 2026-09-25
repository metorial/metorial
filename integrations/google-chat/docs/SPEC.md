# Slates Specification for Google Chat

## Overview

Google Chat is Google Workspace's team messaging service. This integration exposes 25 tools for messages, spaces, memberships, reactions, direct messages, attachments, space events, the signed-in user's read state, space notification settings, sidebar sections, custom emoji, and organization-wide admin space search. It has no triggers.

## Tool surface

| Tool | Authentication | API behavior |
|---|---|---|
| `send_message` | User OAuth or Chat app | `spaces.messages.create`, including thread replies and uploaded attachment tokens |
| `list_messages` | User OAuth | `spaces.messages.list` with thread/time filtering, `createTime ASC`/`DESC` ordering, and pagination |
| `search_messages` | User OAuth | `POST /v1/spaces/-/messages:search`, with a `spaces.messages.list` keyword fallback when the search API is unavailable for the account or project |
| `search_conversations` | User OAuth or Chat app | `spaces.list`, followed by client-side name matching on each returned page |
| `manage_space` | User OAuth | Create, setup, get, update, and delete space workflows |
| `manage_message` | User OAuth or Chat app | Get, patch, and delete messages; apps can mutate only app-authored messages |
| `manage_reaction` | User OAuth | Create, list, and delete reactions |
| `find_direct_message` | User OAuth or Chat app | `spaces.findDirectMessage` |
| `get_attachment` | Chat app only | `spaces.messages.attachments.get` metadata |
| `download_attachment` | User OAuth or Chat app | `media.download`; returns a downloadable file |
| `upload_attachment` | User OAuth or Chat app | Multipart `media.upload`; returns an upload token, not a posted message |
| `list_space_events` | User OAuth | List events or get one event by ID |
| `get_space_read_state` | User OAuth | `users.spaces.getSpaceReadState` for `users/me` |
| `get_thread_read_state` | User OAuth | `users.spaces.threads.getThreadReadState` for `users/me` |
| `update_space_read_state` | User OAuth | `users.spaces.updateSpaceReadState`; `markAsRead=true` sends a future `lastReadTime` that Google coerces to the latest message, or an explicit RFC 3339 `lastReadTime` marks later messages unread |
| `get_space_notification_setting` | User OAuth | `users.spaces.spaceNotificationSetting.get` |
| `update_space_notification_setting` | User OAuth | `users.spaces.spaceNotificationSetting.patch` for notification and mute settings |
| `list_sections` | User OAuth | `users.sections.list` for the signed-in user's sidebar |
| `list_section_items` | User OAuth | `users.sections.items.list`, including the `-` section wildcard with a space filter |
| `manage_section` | User OAuth | Create, update (rename), reposition, and delete custom sections |
| `move_section_item` | User OAuth | `users.sections.items.move` into another section |
| `list_custom_emojis` | User OAuth | `customEmojis.list`, optionally filtered by creator |
| `get_custom_emoji` | User OAuth | `customEmojis.get` by resource name or `:shortcode:` |
| `manage_custom_emoji` | User OAuth | `customEmojis.create` from base64 image bytes, or `customEmojis.delete` |
| `search_spaces_admin` | User OAuth (Workspace admin) | `spaces.search` with `useAdminAccess=true` and a caller-supplied admin query |

The four official-named core tools are `send_message`, `list_messages`, `search_messages`, and `search_conversations`. Read state, notification settings, sidebar sections, and custom emoji tools always act on the signed-in user (`users/me`) and change only that user's own view; custom emoji tools additionally require an organization where custom emoji are enabled. `search_spaces_admin` requires a Workspace administrator with the Manage Chat and spaces conversations privilege; its `query` must include `customer = "customers/my_customer" AND spaceType = "SPACE"`, and its instructions list the documented filter fields and operators. Import-mode completion is intentionally outside the selected surface.

## Authentication

### User OAuth

The OAuth authorization-code flow requests offline access and incremental authorization. Callback and refresh handling persist the access token, expiry, and refresh token, preserving the existing refresh token when Google does not rotate it. Profile lookup uses Google Account identity scopes when either identity scope is granted.

The consent surface contains:

- `chat.messages`, `chat.messages.readonly`, and `chat.messages.create`
- `chat.spaces`, `chat.spaces.readonly`, and the separate `chat.delete` scope
- `chat.memberships` and `chat.memberships.readonly`
- `chat.messages.reactions`
- `chat.users.readstate`, `chat.users.spacesettings`, `chat.users.sections`, and `chat.customemojis`
- `chat.admin.spaces.readonly`
- `userinfo.email` and `userinfo.profile`

Connections request every scope declared on the OAuth method. Consolidated tools use relaxed `anyOf` static gates and document the per-action scope Google actually enforces in their instructions: `manage_space` accepts `chat.spaces`, `chat.spaces.readonly`, or `chat.delete` (get works read-only; create/setup/update need `chat.spaces`; delete needs `chat.delete`, and without it the tool reports that the connection must be reauthorized). `manage_message` accepts a message read scope so `action=get` works with read-only grants, while update/delete need `chat.messages`. `list_space_events` accepts any one message, reaction, membership, or space read scope because Google enforces the scope per requested `eventTypes` family. Read-only tools for read state, sections, and custom emoji also accept the matching `.readonly` scope; their write tools require the full scope. `search_spaces_admin` accepts `chat.admin.spaces.readonly` or `chat.admin.spaces`.

### Chat app service account

App authentication accepts the JSON key for the service account configured as the Google Chat app, exchanges a signed JWT for an access token, and refreshes by signing a new assertion. It requests only the app-only `chat.bot` scope; `chat.bot` is not presented on the user OAuth consent screen.

The Google Cloud project must have a configured Chat app, and that app must be installed in each space it accesses. App authentication does not substitute for user authentication on user-only endpoints. Attachment metadata (`get_attachment`) is app-only, and attachment upload (`upload_attachment`) supports app authentication in addition to user OAuth, matching `media.upload`. Mixed-auth tools still follow Google restrictions; in particular, a Chat app can update or delete only its own messages.

## Search behavior

`search_messages` first calls the generally available endpoint exactly: `POST https://chat.googleapis.com/v1/spaces/-/messages:search`. That primary path depends on Workspace tenant eligibility and OAuth user access. Provider search exclusions still apply, including omitted private, blocked-user, app-authored, app-DM, and muted-space results described by Google.

When the search endpoint fails with HTTP 403/`PERMISSION_DENIED` or 404 (the search API is unavailable for the tenant or project), the tool falls back to `spaces.messages.list` plus client-side case-insensitive keyword matching. The fallback requires `conversationId` to scope the list; without it the tool throws a `ServiceError` that explains the search API is unavailable and advises passing `conversationId`. Fallback semantics are weaker: it scans a single conversation (up to 5 pages of 50 messages, newest first), matches keywords and quoted phrases against message text, and applies only the `createTime` filters that `spaces.messages.list` supports — other structured search filters and relevance ordering are dropped. The output `searchMethod` field and the human-readable message state which path served each request.

`search_conversations` does not use the non-admin `spaces.search` method, which only searches named spaces (`spaceType = "SPACE"`) and returns an empty response without a `displayName` clause. It calls `spaces.list` with an optional `spaceType` filter and then performs a case-insensitive substring match against `displayName` and the resource name on the current page. The output preserves `nextPageToken`; an empty result page does not prove that later pages contain no match.

## Attachment workflow

`upload_attachment` sends multipart bytes to the upload endpoint and returns `attachmentUploadToken` and, when available, the attachment data resource name. To post the file, call `send_message` for the same space and pass the opaque upload token—not the resource name—in `attachmentUploadTokens`. The upload alone does not create a visible Chat message, and the message target must be the same space used for the upload.

`get_attachment` reads metadata with app authentication. `download_attachment`
returns Google Chat-hosted bytes as a downloadable file and only file metadata
in structured output. Attachments whose source is `DRIVE_FILE` belong to the
Google Drive download flow.

## Configuration and resource names

`defaultSpace` is optional and accepts either an ID or `spaces/{space}`. Explicit tool inputs take precedence. Canonical validation covers spaces, users, groups, messages, memberships, reactions, attachments, and space events; bare child IDs require enough parent context to construct their canonical name.

## Live verification boundary

The private E2E suite defines scenarios for all 25 tools. A real run requires both a fully consented user OAuth profile and a Chat app service-account profile, a Workspace tenant where the app can be installed, a disposable member fixture, existing OAuth/app direct-message fixtures, and stable user/app attachment fixtures. Where the search API is available the suite exercises the primary `messages.search` path; otherwise `search_messages` exercises its `spaces.messages.list` fallback instead. The read state, notification setting, section, and custom emoji scenarios need their user scopes, and `search_spaces_admin` runs only for a Workspace administrator profile. Scenarios whose profile, scope, or fixture is missing skip individually rather than claiming live provider coverage.
