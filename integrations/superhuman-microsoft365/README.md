# Superhuman Microsoft 365

Work Microsoft 365 mail the way fast email clients do: **threads first**, not raw message CRUD. Search and group by **conversation**, pull full **thread context**, **triage** whole conversations (archive, move, read state, flags, categories, delete), build **reply drafts** with native Graph `createReply` / `createReplyAll`, **send** either from a draft or with an instant reply/reply-all. Subscribe to **conversation-oriented** change events backed by Graph mail webhooks. Built on [Slates](https://slates.dev) and the same OAuth + Graph patterns as the Outlook provider, but scoped to **mail workflows** only—no calendar, contacts, or tasks.

## Tools

### Search Conversations

Runs a mailbox or folder query (keyword **search**, OData **filter**, ordering) and returns **deduplicated conversations** with the latest subject/preview, unread count within the scanned window, and attachment hints. Tune **scanLimit** when you need more coverage; results are always derived from a finite message sample, not the entire mailbox.

### Get Conversation Context

Fetches **every message** in a thread by `conversationId`, oldest-to-newest, with optional full **body** content when you need to quote or draft accurately.

### Triage Conversation

Runs one bulk action across **all messages** in a thread: archive, move to a folder, mark read/unread, flag/unflag, set categories, or delete—so you can clear or organize a conversation in one step.

### Manage Reply Draft

Creates a **reply** or **reply-all** draft via Graph (real draft items), **updates** subject/body/recipients on that draft, or **deletes** it. Use this when you want Superhuman-style “compose in a draft, then send” rather than firing a bare `sendMail`.

### Send Reply

**Sends** either an existing **draft** message id or fires an **instant** reply/reply-all with a comment string—pick drafts for edited bodies, instant for short responses.

## Triggers

### Conversation Changes

Receives Graph notifications for message create/update/delete on `me/messages` and normalizes them into payloads that always identify the **message** and, when available, the **conversation** for triage automations.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
