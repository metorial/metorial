# Slates Specification for Gmail

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

### Authentication Methods

**User OAuth 2.0 (Authorization Code Flow):** Used for accessing a user's own Gmail account. The user is redirected to Google's consent screen, grants permission, and the app receives an authorization code to exchange for access and refresh tokens.

**Service Accounts with Domain-Wide Delegation:** As an administrator, you can use domain-wide delegation to allow internal and third-party apps to access your users' Google Workspace data, bypassing end user consent. Service accounts with domain-wide delegation only work with Google Workspace (formerly G Suite) accounts. A service account uses a private cryptographic key to create a signed JSON Web Token (JWT). This JWT is exchanged for an access token without any human interaction.

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
| `https://www.googleapis.com/auth/gmail.metadata`          | Read metadata including labels, history records, and email headers, but not the body or attachments (restricted)                               |
| `https://www.googleapis.com/auth/gmail.settings.basic`    | Manage basic mail settings (restricted)                                                                                                        |
| `https://www.googleapis.com/auth/gmail.settings.sharing`  | Manage sensitive mail settings including forwarding rules and aliases; restricted to service accounts with domain-wide delegation (restricted) |
| `https://www.googleapis.com/auth/contacts.readonly`       | Optional read-only access to Google Contacts through the People API                                                                            |
| `https://www.googleapis.com/auth/contacts.other.readonly` | Optional read-only access to contact info automatically saved in "Other contacts"                                                              |
| `https://mail.google.com/`                                | Full access including permanent deletion of threads and messages (restricted)                                                                  |

Restricted scopes provide wide access to Google User Data and require a restricted scope verification process, and if you store restricted scope data on servers, you need to go through a security assessment.

## Features

### Sending and Composing Email

Create and send email messages with support for recipients (to, cc, bcc), subject, body (plain text and HTML), and file attachments. Messages can be sent directly or saved as drafts first and sent later. Drafts can be created, updated, listed, and deleted.

### Reading and Searching Messages

Read individual email messages including headers, body, and attachments. Search for messages using Gmail's query syntax (the same operators available in the Gmail search bar, e.g., `from:`, `to:`, `subject:`, `has:attachment`, `after:`, `before:`). List messages in a mailbox, optionally filtered by label or query.

### Google Contacts Lookup

When the optional `https://www.googleapis.com/auth/contacts.readonly` scope is granted, Gmail can read Google Contacts through the People API. The OAuth surface also exposes `https://www.googleapis.com/auth/contacts.other.readonly` for deployments that need the matching Google People API Other Contacts consent scope. The contact tools list contacts, search contacts, and retrieve a contact by People API resource name. These tools are read-only and do not create, update, or delete contacts. Existing Gmail profiles must reauthorize with the optional contacts scope before these tools can access contacts.

### Thread Management

Messages are grouped into threads forming conversations. A thread is formed when one or more recipients respond to a message with their own message. Threads can be listed, retrieved, trashed, untrashed, and permanently deleted.

### Label Management

Labels are a mechanism for organizing messages and threads. For example, the label "taxes" might be created and applied to all messages and threads having to do with a user's taxes. Labels can be created, read, updated, and deleted. Messages can have labels added or removed. Gmail includes system labels (INBOX, SENT, TRASH, SPAM, STARRED, etc.) alongside user-created labels.

### Mail Settings Management

Manage various mailbox settings programmatically:

- **Aliases and Signatures:** Manage send-as aliases and email signatures.
- **Forwarding:** Configure email forwarding addresses and rules.
- **Filters:** Create and manage mail filters that automatically label, archive, or forward incoming mail.
- **Vacation Responder:** Enable, configure, and disable auto-reply/vacation messages.
- **POP and IMAP settings:** Enable or disable POP/IMAP access.
- **Delegates:** A Gmail user can grant mailbox access to another user in the same Google Workspace organization. Delegate management is restricted to service accounts with domain-wide delegation.
- **Language settings:** Set the display language for the Gmail interface.

### S/MIME Certificates

Manage S/MIME certificates for send-as aliases, enabling encrypted email communication. Certificates can be inserted, listed, retrieved, and deleted.

### Mailbox History and Sync

Retrieve a history of changes made to the mailbox since a given point in time (identified by a history ID). This enables efficient incremental sync of a mailbox without re-fetching all data, useful for building mail clients or sync tools.

### Message Import and Insert

Import messages into the mailbox (similar to receiving via SMTP) or insert messages directly (placing them in the mailbox without sending). This is useful for migration scenarios.

## Events

The Gmail API uses the Cloud Pub/Sub API to deliver push notifications. This allows notification using a variety of methods including webhooks and polling on a single subscription endpoint.

### Mailbox Change Notifications

Subscribe to changes on a user's mailbox by calling the `watch` endpoint with a Google Cloud Pub/Sub topic. To configure Gmail accounts to send notifications, call watch on the Gmail user mailbox and provide the topic name and any other options in your watch request, such as labels to filter on.

- **Label filtering:** Notifications can be scoped to specific labels (e.g., only INBOX or UNREAD) using `labelIds` and `labelFilterAction` (include or exclude).
- **Notification payload:** The notification payload contains the email address and the new mailbox history ID for the user. The actual change details must then be fetched via the history API.
- **Watch renewal:** Watch subscriptions expire after 7 days and must be renewed by calling `watch` again.
- Each Gmail user being watched has a maximum notification rate of 1 event per second. Any user notifications exceeding that rate will be dropped.
- **Setup requirements:** Requires creating a Cloud Pub/Sub topic in Google Cloud, granting publish permissions to `gmail-api-push@system.gserviceaccount.com`, and configuring a push or pull subscription on the topic.
