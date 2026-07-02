Now let me get more details on the API endpoints/features:Now let me check the actual API reference for more details on authentication and available features:I now have enough information to write the specification. Let me compile it.

# Slates Specification for Helpwise

## Overview

Helpwise is a shared inbox and customer service platform that centralizes team communication across email, SMS, WhatsApp, live chat, and social media (Facebook, Instagram, Twitter) into a single dashboard. It helps manage all customer communication from a single place, enabling team collaboration through shared inboxes, conversation assignment, internal notes, automation rules, and reporting.

## Authentication

Helpwise uses **API Key + API Secret** authentication.

You must use a valid API Key and API Secret to send requests to the API endpoints. You can get your API key from Helpwise's Settings Page (API Key Section) at the integrations dashboard (`https://app.helpwise.io/settings/api`).

Alternatively, to obtain credentials, log in to your Helpwise account, click **Automation > API > Generate Credentials**, and copy the API Key and API Secret to a safe place.

**How to authenticate requests:**

The API Key and API Secret are passed together in the `Authorization` header, formatted as `{API_KEY}:{API_SECRET}`. For example: `Authorization: your_api_key:your_api_secret`.

The API base URL is `https://app.helpwise.io/dev-apis/`.

## Features

### Mailbox Management

Create, list, retrieve, update, and delete mailboxes. You can list mailboxes, get details of a specific mailbox, and create new mailboxes. Mailboxes represent the shared inboxes (e.g., support@, sales@) that your team collaborates on.

### Conversation Management

List, retrieve, and monitor conversations (threads) within your mailboxes. You can retrieve details of a specific conversation or get a list of conversations. Conversations can also be deleted.

### Email / Messaging

List emails and send new emails from your Helpwise mailboxes. You can also update existing messages or delete individual messages within conversations.

### Contact Management

Create, list, retrieve, search, update, and delete contacts. Contacts are automatically created when customers interact via any channel but can also be managed programmatically. Search allows querying across all contacts.

### Notes

Add notes to conversations for internal team collaboration. You can also retrieve notes for a conversation and delete them.

### Attachments

Upload files as attachments to conversations and retrieve attachment metadata.

### Tags

Retrieve, update, and delete tags used to categorize and organize conversations.

### Teams

Retrieve details of specific teams or list all teams in your Helpwise account.

### Users

Retrieve the list of Helpwise users in your account.

### Email Templates

Retrieve and update email templates (canned responses). Templates can also be deleted.

### Email Signatures

Delete email signatures via the API. Signature management allows maintaining consistent branding.

### Webhook Management

Create, retrieve, list, and delete webhooks programmatically via the API.

## Events

The Webhook Integration allows you to listen to Helpwise events in real-time without the need of continuously polling the API. To listen to events you need to set up your callback URL where you want to receive the event.

Helpwise provides 9 webhook event types.

### Conversation Lifecycle Events

- **Conversation Created** — Triggered when an agent replies to a customer or a customer sends a message to a Helpwise mailbox.
- **Conversation Closed** — Triggered when an agent or admin closes a conversation.
- **Conversation Reopened** — Triggered when an agent or admin reopens a conversation.
- **Conversation Deleted** — Triggered when an agent or admin deletes a conversation.

### Conversation Activity Events

- **Conversation Assigned** — Triggered when an agent or admin is assigned to a conversation.
- **Note Added** — Triggered when an agent or admin adds a note to a conversation.
- **Tag Applied** — Triggered when an agent or admin applies a tag to a conversation.

### Message Events

- **Agent Reply** — Triggered when an agent or admin replies to a customer.
- **Customer Reply** — Triggered when a customer replies to an email.
