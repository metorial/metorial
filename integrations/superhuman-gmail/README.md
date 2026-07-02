# Superhuman Gmail

Search and triage Gmail by **conversation (thread)**, not isolated messages. List threads with the same operators you use in Gmail’s search bar, open full thread context with parsed bodies and **reply hints** (`In-Reply-To`, `References`, suggested recipients and subject), then archive, mark read/unread, star, apply or remove labels, move to trash, restore, or permanently delete—always at **thread** scope for fast inbox workflows. Compose and update **reply drafts** that stay on the correct thread with proper RFC threading headers, send replies in one step, and subscribe to **conversation-oriented** change events via Gmail **history** polling (new messages, deletes, label adds/removes) without running your own sync backend.

## Tools

### Search Conversations

Lists **threads** matching a Gmail query and optional label filters. Use for inbox triage and prioritization (`is:unread`, `newer_than:`, `from:`, `label:`, etc.). Returns thread IDs, snippets, and history IDs for follow-up calls.

### Get Conversation Context

Fetches a full thread with **parsed messages** (headers, plain/HTML bodies, attachment metadata) and a **replyHints** block targeting either the latest message or a specific **replyToMessageId**. Use this before drafting or sending so threading headers stay correct.

### Triage Conversation

Applies one triage action to the **whole thread**: archive or return to inbox, mark read/unread, star or unstar, add/remove explicit label IDs, trash, restore from trash, or permanently delete. Maps cleanly to Gmail system labels (`INBOX`, `UNREAD`, `STARRED`) and custom labels.

### Manage Reply Draft

Creates, updates, lists, retrieves, sends, or deletes **drafts** intended as replies. **create** resolves recipients, subject (`Re: …`), and threading headers from the thread and target message; **update** refreshes MIME content while keeping the draft on the same thread when possible.

### Send Reply

Sends a message **in an existing thread** with **In-Reply-To** and **References** set from the parent message (unless you override them). Recipients and subject default from the message you reply to.

## Triggers

### Conversation Changes

Polls Gmail **history** for **message_added**, **message_deleted**, **labels_added**, and **labels_removed** events. Each firing includes **threadId** for conversation-centric automation. For new messages, the handler enriches output with From, To, Subject, and snippet when the message is still available.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
