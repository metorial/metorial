# Superhuman Gmail

Conversation workflows backed by the official Gmail API: discover the mailbox, search conversations, read context, triage messages, manage reply drafts, send replies and download files. Google OAuth connects directly to Gmail.

This package is independent of the [Superhuman Mail MCP service](https://help.superhuman.com/hc/en-us/articles/46005696690317-Superhuman-Mail-MCP-Server). It does not expose native Superhuman reminders, AI drafting, read tracking or calendars. Superhuman currently documents that Gmail-created drafts do not appear in Superhuman Mail, and native Superhuman drafts do not appear in Gmail.

## Tools

| Tool | Behavior |
| --- | --- |
| `get_profile` | Identify the selected Gmail mailbox and read mailbox counters. |
| `search_conversations` | Search one page of conversation stubs; follow `nextPageToken`. The estimated total is distinct from the number returned. |
| `get_conversation_context` | Read full, metadata or minimal context. Reply hints are returned only when parent headers are available; minimal format has no headers or bodies. |
| `triage_conversation` | Apply labels, archive, read/unread, star, trash, restore or permanently delete a whole conversation. |
| `manage_reply_draft` | Create, update, get, list, send or delete Gmail reply drafts. Omitted fields stay unchanged on update; an omitted body preserves the original MIME body, including HTML and files. |
| `send_reply` | Immediately send a reply to all To, Cc and Bcc recipients. The subject must match the parent conversation after the reply prefix. |
| `download_attachment` | Download a message file by attachment ID or MIME part ID from conversation context. |

## Setup and permissions

Enable the Gmail API in a Google Cloud project, configure the OAuth consent screen, and register the application's redirect URI on a Google OAuth client. Gmail permissions may require Google's restricted-scope verification.

The existing `google_oauth` connection method requests `gmail.modify`, covering reading, drafting, sending and reversible mailbox changes. Separate read-only and full-access connection methods request `gmail.readonly` and `https://mail.google.com/` respectively. Permanent conversation deletion requires full access and cannot be undone. Existing connections with broader grants remain supported; reconnecting through the default method no longer grants permanent deletion.

`userId` defaults to `me`. Another mailbox email only selects a mailbox the connection already has permission to access; it does not grant delegation.

Explicit body replacement retains existing files and inline content IDs, but cannot safely convert every complex MIME structure. Unsupported parts produce a validation error before replacement; omit `body` to preserve them or edit the draft in Gmail. Header-only updates detect a changed draft message between reads. Concurrent edits during the final write remain subject to Gmail's replacement semantics.

Sending mail can notify real recipients and cannot be undone. A timeout or response-validation failure can occur after Gmail accepts a send or creates a draft. Inspect Gmail and the conversation before retrying. Permanent deletion removes the selected mailbox's messages; it does not promise erasure of recipient copies or provider/Vault history.

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
