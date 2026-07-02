# Superhuman Microsoft 365 — Slates specification

Workflow-oriented Microsoft 365 mail integration built on **Microsoft Graph**. Tools are **conversation-centric** (thread `conversationId`) for inbox triage, context loading, reply drafts, and send/reply—without calendar, contacts, tasks, or generic admin surfaces.

## Authentication

- **OAuth 2.0** (Microsoft identity platform), same pattern as the Outlook provider in this repo.
- **Tenant**: optional `tenantId` on connect; defaults to `common`.
- **Scopes** (mail-focused): `Mail.Read`, `Mail.ReadWrite`, `Mail.Send`, `User.Read`, `offline_access`, `openid`, `profile`, `email`.
- **Tokens**: access token, optional refresh token, optional `expiresAt`, optional `tenantId` echoed in stored output.

## Tools

### Search Conversations (`search_conversations`)

Lists messages via Graph (`/me/messages` or folder-scoped), optionally with `$search` or `$filter`, then **groups by `conversationId`** and returns one row per thread (latest snippet, unread count within the scanned sample, attachment hint). **Not a full-mailbox enumeration**: coverage is limited by `scanLimit` (capped at 200 messages). Uses `ConsistencyLevel: eventual` when `$search` is used (Graph requirement).

### Get Conversation Context (`get_conversation_context`)

Loads **all messages** for a `conversationId` using `$filter=conversationId eq '…'` and follows `@odata.nextLink` until exhausted. Optional `includeFullBody` adds full `body` to the projection; default uses previews and metadata only.

### Triage Conversation (`triage_conversation`)

Applies one **action** to **every message** in the thread:

| Action                      | Behavior                                                |
| --------------------------- | ------------------------------------------------------- |
| `archive`                   | `move` each message to well-known folder `archive`      |
| `move`                      | `move` to `destinationFolderId` (id or well-known name) |
| `mark_read` / `mark_unread` | Patch `isRead`                                          |
| `flag` / `unflag`           | Patch `flag.flagStatus`                                 |
| `categorize`                | Replace `categories` array on each message              |
| `delete`                    | Delete each message                                     |

Large threads imply **many sequential Graph calls** (no batching in this package).

### Manage Reply Draft (`manage_reply_draft`)

- `create_reply_draft` / `create_reply_all_draft`: Graph `createReply` / `createReplyAll` → draft `message` in Drafts.
- `update_draft`: `PATCH` draft (subject, body, recipients, importance).
- `delete_draft`: `DELETE` draft message.

### Send Reply (`send_reply`)

- `send_draft`: `POST /me/messages/{id}/send` for an existing draft.
- `instant_reply`: `reply` or `replyAll` with a **comment** body (immediate send; best for short replies).

## Triggers

### Conversation Changes (`conversation_changes`)

Webhook subscription on **`me/messages`** (`created`, `updated`, `deleted`). Validates Microsoft Graph `validationToken`. Filters notifications by `clientState`. Emits `conversation.message_created` | `conversation.message_updated` | `conversation.message_deleted` with **message** fields and **`conversationId`** when the message can still be fetched (deleted events only include `messageId`).

Subscriptions follow Graph limits (renewal within max lifetime, typically a few days for mail).

## Explicit non-goals

No **custom backend** features: read receipts, team comments, shared links, persistent snooze, or other state that Graph does not own. No calendar, contacts, or To Do tools in this package.
