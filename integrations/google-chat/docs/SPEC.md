# Slates Specification for Google Chat

## Overview

Google Chat is Google Workspace's team messaging service. This integration exposes 13 tools for messages, spaces, memberships, reactions, direct messages, attachments, and space events. It has no triggers.

## Tool surface

| Tool | Authentication | API behavior |
|---|---|---|
| `send_message` | User OAuth or Chat app | `spaces.messages.create`, including thread replies and uploaded attachment tokens |
| `list_messages` | User OAuth | `spaces.messages.list` with thread/time filtering, `createTime ASC`/`DESC` ordering, and pagination |
| `search_messages` | User OAuth | Developer Preview `POST /v1/spaces/-/messages:search`, with a `spaces.messages.list` keyword fallback when preview access is unavailable |
| `search_conversations` | User OAuth or Chat app | `spaces.list`, followed by client-side name matching on each returned page |
| `manage_space` | User OAuth | Create, setup, get, update, and delete space workflows |
| `manage_member` | User OAuth | Add, get, list, update, and remove memberships |
| `manage_message` | User OAuth or Chat app | Get, patch, and delete messages; apps can mutate only app-authored messages |
| `manage_reaction` | User OAuth | Create, list, and delete reactions |
| `find_direct_message` | User OAuth or Chat app | `spaces.findDirectMessage` |
| `get_attachment` | Chat app only | `spaces.messages.attachments.get` metadata |
| `download_attachment` | User OAuth or Chat app | `media.download`; bytes are returned only as a Slate attachment |
| `upload_attachment` | User OAuth or Chat app | Multipart `media.upload`; returns an upload token, not a posted message |
| `list_space_events` | User OAuth | List events or get one event by ID |

The four official-named core tools are `send_message`, `list_messages`, `search_messages`, and `search_conversations`. Custom emoji, sidebar sections, read state, notification settings, and import-mode completion are intentionally outside the selected surface.

## Authentication

### User OAuth

The OAuth authorization-code flow requests offline access and incremental authorization. Callback and refresh handling persist the access token, expiry, and refresh token, preserving the existing refresh token when Google does not rotate it. Profile lookup uses Google Account identity scopes when either identity scope is granted.

The consent surface contains:

- `chat.messages`, `chat.messages.readonly`, and `chat.messages.create`
- `chat.spaces`, `chat.spaces.readonly`, and the separate `chat.delete` scope
- `chat.memberships`, `chat.memberships.readonly`, and `chat.memberships.app`
- `chat.messages.reactions`
- `userinfo.email` and `userinfo.profile`

The default consent selects `chat.messages`, `userinfo.email`, and `userinfo.profile`. Other scopes are explicit opt-ins. Consolidated tools use relaxed `anyOf` static gates and document the per-action scope Google actually enforces in their instructions: `manage_space` accepts `chat.spaces` or `chat.spaces.readonly` (get works read-only; create/setup/update need `chat.spaces`; delete additionally needs `chat.delete` or Google returns 403). `manage_message` accepts a message read scope so `action=get` works with read-only grants, while update/delete need `chat.messages`. `manage_member` accepts `chat.memberships` or `chat.memberships.app`; the app scope is required only for adding or removing the calling Chat app itself. `list_space_events` accepts any one message, reaction, membership, or space read scope because Google enforces the scope per requested `eventTypes` family.

### Chat app service account

App authentication accepts the JSON key for the service account configured as the Google Chat app, exchanges a signed JWT for an access token, and refreshes by signing a new assertion. It requests only the app-only `chat.bot` scope; `chat.bot` is not presented on the user OAuth consent screen.

The Google Cloud project must have a configured Chat app, and that app must be installed in each space it accesses. App authentication does not substitute for user authentication on user-only endpoints. Attachment metadata (`get_attachment`) is app-only, and attachment upload (`upload_attachment`) supports app authentication in addition to user OAuth, matching `media.upload`. Mixed-auth tools still follow Google restrictions; in particular, a Chat app can update or delete only its own messages.

## Search behavior

`search_messages` first calls the Google Workspace Developer Preview endpoint exactly: `POST https://chat.googleapis.com/v1/spaces/-/messages:search`. That primary path depends on Workspace tenant eligibility, OAuth user access, and the Chat API Developer Preview being enabled for the project/account. Provider search exclusions still apply, including omitted private, blocked-user, app-authored, app-DM, and muted-space results described by Google.

When the search endpoint fails with HTTP 403/`PERMISSION_DENIED` or 404 (tenant or project not enrolled in the Developer Preview), the tool falls back to `spaces.messages.list` plus client-side case-insensitive keyword matching. The fallback requires `conversationId` to scope the list; without it the tool throws a `ServiceError` that explains the Developer Preview requirement and advises passing `conversationId`. Fallback semantics are weaker: it scans a single conversation (up to 5 pages of 50 messages, newest first), matches keywords and quoted phrases against message text, and applies only the `createTime` filters that `spaces.messages.list` supports — other structured search filters and relevance ordering are dropped. The output `searchMethod` field and the human-readable message state which path served each request.

`search_conversations` does not use the newer Developer Preview `spaces.search` API, which now supports non-admin searches with user authentication. It calls stable `spaces.list` with an optional `spaceType` filter and then performs a case-insensitive substring match against `displayName` and the resource name on the current page. The output preserves `nextPageToken`; an empty result page does not prove that later pages contain no match.

## Attachment workflow

`upload_attachment` sends multipart bytes to the upload endpoint and returns `attachmentUploadToken` and, when available, the attachment data resource name. To post the file, call `send_message` for the same space and pass the opaque upload token—not the resource name—in `attachmentUploadTokens`. The upload alone does not create a visible Chat message, and the message target must be the same space used for the upload.

`get_attachment` reads metadata with app authentication. `download_attachment` returns Google Chat-hosted bytes through a Slate attachment and only metadata in structured output. Attachments whose source is `DRIVE_FILE` belong to the Google Drive download flow.

## Configuration and resource names

`defaultSpace` is optional and accepts either an ID or `spaces/{space}`. Explicit tool inputs take precedence. Canonical validation covers spaces, users, groups, messages, memberships, reactions, attachments, and space events; bare child IDs require enough parent context to construct their canonical name.

## Live verification boundary

The private E2E scaffold defines manual scenarios for all 13 tools. A real run requires both a fully consented user OAuth profile and a Chat app service-account profile, a Workspace tenant where the app can be installed, a disposable member fixture, existing OAuth/app direct-message fixtures, and stable user/app attachment fixtures. Developer Preview access exercises the primary `messages.search` path; without it, `search_messages` exercises its `spaces.messages.list` fallback instead. Until those profiles and fixtures are provisioned, the suite remains explicitly skipped rather than claiming live provider coverage.
