# Gmail Integration Specification

## Overview

Gmail API is a RESTful API that can be used to access Gmail mailboxes and send mail. It provides programmatic access to email messages, threads, labels, drafts, and mailbox settings. It is suitable for various applications including mail clients, mail sync tools, automated email processing, and email sending workflows.

## Authentication

Gmail API uses **OAuth 2.0** exclusively for authentication and authorization.

### Setup Requirements

1. A Google Cloud Platform project with the Gmail API enabled.
2. OAuth 2.0 credentials (Client ID and Client Secret) created in the Google Cloud Console.
3. An OAuth consent screen configured with the required scopes.
4. The People API enabled if optional Google Contacts lookup tools are used.

### OAuth 2.0 Endpoints

- Authorization endpoint: `https://accounts.google.com/o/oauth2/v2/auth`
- Token endpoint: `https://oauth2.googleapis.com/token`

### Authentication Method

**User OAuth 2.0 (Authorization Code Flow):** Used for accessing a user's own Gmail account. The user is redirected to Google's consent screen, grants permission, and the app receives an authorization code to exchange for access and refresh tokens.

### Scopes

Gmail API offers granular scopes to limit access:

| Scope                                                     | Description                                                                                                                                    |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `https://www.googleapis.com/auth/gmail.readonly`          | Read all resources and their metadata (restricted)                                                                                             |
| `https://www.googleapis.com/auth/gmail.send`              | Send messages only, no read or modify (sensitive)                                                                                              |
| `https://www.googleapis.com/auth/gmail.compose`           | Create, read, update, and delete drafts; send messages and drafts (restricted)                                                                 |
| `https://www.googleapis.com/auth/gmail.modify`            | All read/write operations except permanent deletion bypassing Trash (restricted)                                                               |
| `https://www.googleapis.com/auth/gmail.labels`            | Create, read, update, and delete labels only (non-sensitive)                                                                                   |
| `https://www.googleapis.com/auth/gmail.insert`            | Insert and import messages only (restricted)                                                                                                   |
| `https://www.googleapis.com/auth/gmail.settings.basic`    | Manage basic mail settings (restricted)                                                                                                        |
| `https://www.googleapis.com/auth/contacts.readonly`       | Optional read-only access to Google Contacts through the People API                                                                            |
| `https://www.googleapis.com/auth/contacts.other.readonly` | Optional read-only access to contact info automatically saved in "Other contacts"                                                              |
| `https://mail.google.com/`                                | Full access including permanent deletion of threads and messages (restricted)                                                                  |

Restricted scopes provide wide access to Google User Data and require a restricted scope verification process, and if you store restricted scope data on servers, you need to go through a security assessment.

## Features

### Sending and Composing Email

Create and send email messages with support for recipients (to, cc, bcc), subject, body (plain text and HTML), and file attachments. Messages can be sent directly or saved as drafts first and sent later. Drafts can be created, updated, listed, and deleted.

Existing messages can be forwarded with `forward_message`. The tool fetches the source in Gmail's raw RFC 2822 format, rewrites the recipient and `Fwd:` subject headers, and sends a new message while preserving the complete original MIME body and attachments. It omits the source thread ID and reply headers so the forward starts a distinct Gmail thread. It requires both a body-readable Gmail scope and a send-capable Gmail scope; `gmail.modify` and `mail.google.com` can each satisfy both requirements on their own. If the original subject already carries a `Fwd:` prefix, the tool keeps it instead of producing `Fwd: Fwd:`. Note the payload ceiling: the rebuilt raw MIME is submitted base64-encoded inside a JSON `messages.send` request, so forwards whose original attachments total more than roughly 5 MB fail with a Gmail 4xx error.

### Reading and Searching Messages

Read individual email messages including headers, body, and attachments. Search for messages using Gmail's query syntax (the same operators available in the Gmail search bar, e.g., `from:`, `to:`, `subject:`, `has:attachment`, `after:`, `before:`). List messages in a mailbox, optionally filtered by label or query.

`get_profile` returns the authenticated mailbox email address, total message and thread counts, and the current history ID for incremental synchronization.

### Google Contacts Lookup

When the optional `https://www.googleapis.com/auth/contacts.readonly` scope is granted, Gmail can read Google Contacts through the People API. The OAuth surface also exposes `https://www.googleapis.com/auth/contacts.other.readonly` for deployments that need the matching Google People API Other Contacts consent scope. The contact tools list contacts, search contacts, and retrieve a contact by People API resource name. These tools are read-only and do not create, update, or delete contacts. Existing Gmail profiles must reauthorize with the optional contacts scope before these tools can access contacts.

### Thread Management

Messages are grouped into threads forming conversations. A thread is formed when one or more recipients respond to a message with their own message. Threads can be listed, retrieved, trashed, untrashed, and permanently deleted.

### Label Management

Labels are a mechanism for organizing messages and threads. For example, the label "taxes" might be created and applied to all messages and threads having to do with a user's taxes. Labels can be created, read, updated, and deleted. Messages can have labels added or removed. Gmail includes system labels (INBOX, SENT, TRASH, SPAM, STARRED, etc.) alongside user-created labels.

### Mail Settings Management

Manage various mailbox settings programmatically:

- **Aliases and Signatures:** List send-as aliases and update the primary address's display name, reply-to address, and signature. Gmail only allows domain-wide delegated service accounts to update send-as addresses other than the primary one, so with user OAuth `update_send_as` works on the primary address only (see [users.settings.sendAs.update](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs/update)).
- **Forwarding:** View forwarding addresses and auto-forwarding status.
- **Filters:** Create and manage mail filters that automatically label, archive, or forward incoming mail.
- **Vacation Responder:** Enable, configure, and disable auto-reply/vacation messages.
- **POP and IMAP settings:** `manage_settings` can read and update POP/IMAP access, IMAP expunge behavior and folder-size limits, and the post-fetch POP disposition. Updates first read the current settings and preserve fields omitted by the caller. Fields whose current value is a Google `*Unspecified` enum placeholder (`expungeBehaviorUnspecified`, `accessWindowUnspecified`, `dispositionUnspecified`) are omitted from the update request instead of being echoed back, since Gmail can reject them with a 400.
- **Language settings:** `manage_settings` can read or set the Gmail display language using an RFC 3066 language tag.

### S/MIME Certificates

Manage S/MIME certificates for send-as aliases, enabling encrypted email communication. Certificates can be inserted, listed, retrieved, and deleted.

### Message Import and Insert

Import messages into the mailbox (similar to receiving via SMTP) or insert messages directly (placing them in the mailbox without sending). This is useful for migration scenarios.

`import_message` applies Gmail's standard scanning and classification (spam, categories, filters); `insert_message` stores the message as given with only the requested labels. Both accept either a complete RFC 822 message in `raw` (`rawEncoding` `text`, the default, or `base64` in the standard or URL-safe alphabet, padding optional) or structured `from`, `to`, `cc`, `subject`, `body`, `isHtml`, `date`, `inReplyTo`, and `references` fields, never both. A raw message must start with its first header line and contain a blank line between headers and body. Non-ASCII subjects are RFC 2047 encoded, and non-ASCII bodies are sent as base64-encoded UTF-8.

To add a message to an existing thread, Gmail requires the `threadId`, `References` and `In-Reply-To` headers that follow RFC 2822, and a matching `Subject` (see the [Message resource](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages#Message)). In raw mode those headers must be part of the raw message.

## Events

### New Message

Enable the **New Message** event for a connected mailbox. Polling runs every 15 minutes and searches the previous hour with Gmail's `after:` query, including Spam and Trash. Each result is checked against Gmail's `internalDate` so its mailbox creation time falls within the window. The immutable message ID is the event ID and deduplication key. The event type is `message.added`.

The output contains `messageId`, `threadId`, `labelIds`, `internalDate` (epoch milliseconds), and available `from`, `to`, `subject`, `snippet`, and `date` fields. For example: `{ "messageId": "18abc123", "threadId": "18abc100", "labelIds": ["INBOX"], "internalDate": "1727000000000", "subject": "Invoice" }`.

The one-hour overlap tolerates ordinary polling delays. Messages deleted before a poll, added during a delay longer than an hour, or imported with a historical internal date can be missed. Deletions and label changes are not emitted. See [Gmail search and filtering](https://developers.google.com/workspace/gmail/api/guides/filtering), [list messages](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list), and the [Message resource](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages).
