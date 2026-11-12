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

### Email received

`mailbox_events` is an automatic, renewable Google Pub/Sub source exposing the single `email_received` trigger. Discovery resolves the connected Google user ID and Gmail profile; the configured mailbox must be that account's own primary address. The watched mailbox is identified by the stable Google user ID, independent of the connection. A renamed primary address requires reconnecting.

Notifications arrive through Google Pub/Sub. Delivery is set up once per Google OAuth application: one topic and one authenticated push subscription in the application's Cloud project, shared by every watched mailbox. Whoever owns the OAuth application creates them by following the guided setup, the service operator for the built-in application and a customer for their own: create the topic, allow `gmail-api-push@system.gserviceaccount.com` to publish to it, create a service account for push authentication, and create a push subscription that uses the shown delivery URL as its endpoint and audience. They then save the OAuth client ID, topic name, subscription name, and push service account email. Nothing is created in Google Cloud automatically, and the delivery URL rejects pushes until the setup is saved. Enabling the event fails with a setup error when that delivery setup is missing or invalid; a user's OAuth credentials are never used to set it up and are not kept for verifying notifications. Each notification is delivered only to the connections watching the mailbox named in its `emailAddress` (compared in lower case), and only after Google's OIDC signature, issuer, expiry, audience, verified push service-account identity, subscription name, and mailbox identity have been checked. If the saved delivery setup changes, renewal fails instead of moving the watch silently. Google's push tokens can remain valid for up to an hour, so a notification is not rejected for being more than five minutes old. [Push setup and delivery](https://developers.google.com/workspace/gmail/api/guides/push), [Pub/Sub authentication](https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions).

Gmail has one application watch per mailbox, and every connection watching that mailbox shares it. Each connection calls `users.watch` with the same topic, which updates the existing watch, and each keeps its own baseline, cursor and de-duplication state. `users.stop` is called only when the last connection watching the mailbox stops. The same OAuth application must not also manage a watch for the mailbox anywhere else: `users.watch` replaces a watch that points at another topic, and there is no get/list endpoint that can detect one, so an external watch cannot be proven absent. No aggregate or Gmail facade trigger is composed independently while this singleton boundary would be duplicated. [Watch API](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users/watch).

Enabling the event captures a history checkpoint immediately before creating the watch. The initial notification emits no fabricated email. Watches renew daily, before the returned expiry, and retain their original baseline; retries use the same topic. Gmail provides no watch readback endpoint: the returned history ID/expiry are validated, and a successful `users.stop` is the available cleanup evidence. A failed or ambiguous attempt to enable the event remains retryable; it is not followed by a mailbox-wide stop that could remove a newer watch. Stop errors, including 404, are not accepted as proof of removal. A known expired watch needs no stop request. [Stop API](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users/stop).

Each verified notification is a wake-up. The connection then reads `users.history.list` from the saved cursor with its own credentials, selects only `messagesAdded`, and retrieves the messages. Adding an INBOX label to an old message is not a receipt. Message IDs are deduplicated by the stable Google account ID, rather than thread IDs or Pub/Sub delivery IDs. History IDs remain decimal strings; an out-of-order notification cannot move the cursor backwards. Events and the new cursor are saved together, so the cursor never moves past mail that was not delivered. A scheduled check every 15 minutes covers dropped wake-ups. [History API](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list).

Volume never fails a synchronization. One call retrieves at most 200 messages and returns the events read so far with a cursor that resumes after them; the next notification or scheduled check continues, so a bulk import or the backlog of a long interruption is delivered in consecutive batches. History is returned in increasing ID order and `startHistoryId` returns the records after it, so the cursor moves to the ID of the last history record whose messages were all handled, and to the mailbox's current history ID once the last page is read. A record that was only partly handled is read again; the messages already handled in it are skipped from the identity cache. If Gmail fails while reading a later history page or retrieving a later message, the events already read are kept and the cursor stays before the unfinished record. A failure before anything was read fails the call and leaves the saved state unchanged, as do a repeated page token and history that is not in increasing order. A message that no longer exists when it is retrieved is skipped. One call also reads at most 100 history pages. When those pages finish no record, which happens after a very large number of changes that added no message, the call saves its place in the same listing as a page token and the next call continues from that page. Gmail documents no lifetime for a history page token: if the saved page is rejected, history is read again from the cursor, and if that again ends at the page limit without finishing a record, the call fails rather than repeating itself. A 404 always means the cursor expired and starts recovery.

The identity cache remembers the 10,000 most recently handled message IDs, for at most 24 hours and five minutes; older entries are evicted rather than failing the call. History needs only the entries of the record it has not finished, which are the newest ones; this assumes a single history record adds far fewer than 10,000 messages. A recovery search can list a message again after its entry was evicted; that message is emitted with the same event ID `<Google account ID>:<message ID>`, which identifies the event, so the repeat is dropped as a duplicate. The last time the mailbox was fully caught up is tracked separately and only advances when no backlog remains, so a later recovery still starts from the right point.

Eligibility uses labels at observation time. DRAFT, SPAM, TRASH and CHAT messages are excluded. A SENT message is incoming when it also carries INBOX: mail sent to yourself, to a list you are on, or to one of your send-as aliases arrives in the inbox whatever its recipient headers say. A SENT message without INBOX is incoming only when To, Cc, Bcc or Delivered-To names the connected mailbox, which covers self-addressed mail archived by a rule; an alias address alone does not establish that. Every other SENT message is ordinary outbound mail and is excluded. INBOX is not required for mail that is not SENT, so rule-archived mail is included. A message removed before retrieval is unavailable. Imports and inserts qualify when added to history; `messageTime` is Gmail's `internalDate`, which may be imported from a Date header and is not guaranteed to be the arrival time. The event exposes IDs, sender/recipient headers, labels, snippet, attachment metadata, `observedAt`, and `source: history | recovery`; message bodies and attachment bytes are fetched through existing tools. [Message resource](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages).

If a history cursor returns 404, recovery captures a fresh cursor **before** searching, works through a recent-message query, and then reads history from that fresh cursor to cover arrivals during search. The lower bound is the latest of activation, the last time the mailbox was fully caught up minus five minutes, and 24 hours ago. The identity cache prevents replay of already observed messages during overlap. Recovery follows the same 200-message limit: a call that cannot finish saves the fresh cursor and its position in the search, and later calls first read history from the fresh cursor and then continue the search where it stopped. A failure after some messages were recovered keeps them and resumes on the same search page; a failure before anything was recovered does not advance the checkpoint. Gmail documents no lifetime for a search page token. If a saved position is rejected, the search starts again from its first page and skips the messages it already handled. That is only possible while the identity cache still remembers all of them, so once more than 10,000 messages were handled since the recovery began, or it began more than 24 hours ago, the remainder is given up instead and the recovery is recorded as `incomplete`. Recovery does not imply complete history: deleted messages, older outage periods and backdated imports can be missed. State records the recovery interval, whether the outage exceeded 24 hours, and whether the search is still pending or was left incomplete; recovered messages carry `source: recovery`. [Synchronization guide](https://developers.google.com/workspace/gmail/api/guides/sync), [message search](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list).

### Verification

Automated tests cover the watch lifecycle, verification against the saved delivery setup, delivery to the connections watching the named mailbox, a changed delivery configuration at renewal, malformed/forged delivery, mailbox identity, empty initial notifications, pagination, replies, archived/self-addressed/sent-and-inbox/outbound mail, persistent deduplication, bounded batches and their resumption, kept progress after a mid-batch failure, identity-cache eviction, cursor expiry, and bounded, resumed and abandoned recovery. Shared Pub/Sub tests cover cryptographic token claims and signatures. The live lifecycle scenario requires a dedicated suite mailbox with an explicitly exclusive application watch and a suite-owned preprovisioned topic/subscription pointing at a reserved `.invalid` receiver. It creates the watch, renews it, stops it, inserts a disposable message without sending email, and checks that the message is read from history. This is not end-to-end delivery proof. The live scenario and real event delivery have not been verified for this change.
