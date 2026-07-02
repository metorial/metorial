Let me get more details on the webhook types and the full list of API features.# Slates Specification for Missive

## Overview

Missive is a collaborative team communication platform that unifies email, SMS, WhatsApp, live chat, Facebook Messenger, Instagram, and custom channels into a shared inbox. It provides team-based conversation management with features like assignments, labels, tasks, and analytics.

## Authentication

Missive uses **API token (Personal Access Token)** authentication.

To start using the API, you first need to get your API token. Get it from your Missive preferences, click the API tab, then the "Create a new token" link.

You need to be part of an organization subscribed to the Productive plan in order to generate API tokens.

You must transmit your user token as a Bearer token in the Authorization HTTP header.

**Base URL:** `https://public.missiveapp.com/v1/`

**Header format:**

```
Authorization: Bearer <API_TOKEN>
```

Token format example: `missive_pat-26pApm_QTmyhLLbA...FwoFGmJ6x-6fikpQ`

No OAuth2 flow is available. There are no scopes — the token has access to everything the generating user has access to. Resource IDs (for teams, labels, organizations, etc.) can be found under Settings > API > Resource IDs within the Missive app.

## Features

### Conversation Management

Browse and retrieve conversations across different mailboxes (Inbox, Closed, Snoozed, Starred, Trash, Spam, Drafts). Conversations can be filtered by team, shared label, organization, contact email, domain, or contact organization. Conversation state (close, reopen, move to inbox, assign, label) is managed through the Posts, Messages, or Drafts endpoints rather than a direct update endpoint. Conversations can also be merged together.

### Drafts & Sending Messages

Create and send messages across email, SMS, WhatsApp, Messenger, Instagram, Live Chat, and custom channels. Drafts can be sent immediately, scheduled for later, or left as drafts for manual review. Supports attachments (up to 25 files, 10 MB total payload), CC/BCC fields, and WhatsApp templates. Auto-follow-up sequences can be triggered via outgoing message rules.

### Custom Channel Messages

Ingest incoming messages from external systems through custom channels. This allows integration of message providers not natively built into Missive by creating incoming messages programmatically.

### Posts (Rich Conversation Entries)

Inject rich content into conversations from external systems (e.g., GitHub commits, Stripe transactions). Posts support Markdown, structured attachments with fields, colors, and images. Posts are the recommended way to manage conversation state from integrations because they leave a visible trace of what triggered the action.

### Contact Management

Create, update, list, and search contacts stored in contact books (private or shared). Contacts support rich data including emails, phone numbers, social accounts, physical addresses, custom fields, and organization memberships. Contacts can be synced incrementally using the `modified_since` parameter.

### Contact Books & Groups

List contact books the user has access to. List and manage contact groups and organizations that contacts can belong to.

### Shared Labels

Create, update, and list shared labels for organizing conversations. Labels support hierarchical nesting (parent labels), color coding, and visibility controls (organization-wide or delegate-only). Labels can be shared with specific teams or users.

### Teams

List, create, and update teams within organizations. Team configuration includes active members, observers, business hours, inactivity periods, mention behavior, reply behavior, and sidebar display settings.

### Tasks

Create, update, list, and retrieve tasks. Tasks can be standalone or subtasks within conversations. They support states (todo, in_progress, closed), due dates, assignees, and team associations. Tasks can be filtered by organization, team, assignee, state, type, and due date range.

### Responses (Templates)

Create, update, delete, and list canned response templates. Responses can be scoped to an organization or a personal user, shared with specific teams, and associated with shared labels. Supports inline images and file attachments. External IDs can be used to sync templates with other systems.

### Analytics

Generate reports for a specified time period with optional filters by team, users, labels, accounts, and account types (email, SMS, WhatsApp, Instagram, Messenger, Live Chat, custom). Report generation is asynchronous — a report is created first, then fetched after a short delay.

- Analytics requires a Productive or Business plan; filtering capabilities require a Business plan.

### Organizations & Users

List organizations the authenticated user belongs to. List users within those organizations.

- User status (availability, away, out of office) is not available via the API.

## Events

Missive supports webhooks for real-time event notifications. Missive allows applications to be notified of certain actions (incoming emails, outgoing emails, label changes, etc.) in the form of an HTTP POST payload sent to a URL.

Webhooks can be set up either through the Missive Rules UI or programmatically via the Hooks API endpoint. You need to be the admin or owner of an organization subscribed to the Productive plan in order to create rules. Webhook payloads can be verified using an HMAC SHA-256 signature via the `X-Hook-Signature` header.

### Incoming Email

Triggered when a new email is received. Can be filtered by sender address (`from_eq`), subject content (`subject_contains`), and body content filters (`content_contains`, `content_starts_with`, `content_ends_with`).

### Incoming SMS Message

Triggered when a new SMS message is received. Can be filtered by content.

### Incoming WhatsApp Message

Triggered when a new WhatsApp message is received. Can be filtered by content.

### Incoming Facebook Messenger Message

Triggered when a new Facebook Messenger message is received. Can be filtered by content.

### Incoming Twilio Chat Message

Triggered when a new Twilio chat message is received. Can be filtered by content.

### New Comment

Triggered when a new comment is added to a conversation. Can be filtered by:

- `is_task`: Only trigger for task-related comments.
- `author`: Only trigger for comments by a specific user.
- `mention`: Only trigger when a specific user is mentioned.
- Content filters (`content_contains`, `content_starts_with`, `content_ends_with`).

### Rule-Based Webhooks (via UI)

Additional event types such as outgoing emails and label changes can be configured through the Missive Rules settings UI, which offers more trigger types than the programmatic Hooks API. Rules configured in the UI support webhook actions with the same payload structure.
