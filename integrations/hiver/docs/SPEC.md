The webhook search didn't return Hiver-specific results. Let me search more specifically for Hiver's webhook and API details.Let me try to access the actual API documentation to get details on endpoints and webhooks.Now I have enough information to compile the specification. Let me synthesize what I've found.

# Slates Specification for Hiver

## Overview

Hiver is an AI-powered customer service platform that integrates with Gmail and Outlook, enabling teams to manage shared inboxes, assign and track email conversations, and collaborate on customer support. It is a collaborative customer support solution that seamlessly integrates with Gmail, enabling teams to manage shared inboxes, assign emails, track conversations, and collaborate on responses. It provides REST APIs to access Hiver data programmatically and build custom integrations.

## Authentication

Hiver supports two authentication methods:

### API Key

Developers or admins must generate an API key from the developer section in Hiver's admin panel. The API key is passed in the request header with each API call. To obtain a key, log in to Hiver as an admin, navigate to the Developer section in the Admin Panel, and generate a new API key.

### OAuth 2.0

You can also authenticate using OAuth 2.0. This enables delegated access for third-party applications to interact with Hiver data on behalf of users. Specific OAuth endpoints and scopes are not publicly documented in detail beyond the developer portal.

**Base URL:** `https://api.hiverhq.com` (accessed via the developer documentation at `developer.hiverhq.com`)

## Features

### Inbox Management

Retrieve and browse shared inboxes configured in your Hiver account. You can list all inboxes, get a specific inbox by ID, get all users in an inbox, search users in an inbox, get tags in an inbox, and search tags in an inbox. This is useful for understanding which shared mailboxes exist and who has access to them.

### Conversation Management

Access and manage email conversations within shared inboxes. You can get conversations in an inbox, get a specific conversation in an inbox, and update a conversation in an inbox. Updates to conversations allow modifying properties such as status, assignee, and tags — the core attributes used for workflow management.

- Conversations can be filtered and retrieved by inbox.
- The API currently focuses on reading and updating existing conversations rather than creating new ones.

### User and Tag Discovery

Search and retrieve users and tags associated with specific inboxes. This enables integrations to look up team members for assignment purposes and discover available tags for categorization.

- Users can be searched within a specific inbox context.
- Tags can be listed and searched per inbox.

### Limitations

- The public API surface is relatively narrow, focused primarily on inbox and conversation read/update operations.
- The API does not appear to expose features like analytics, automation rules, notes, templates, or knowledge base content.

## Events

Hiver provides webhooks as a mechanism for sending real-time notifications to external applications, ensuring that developers can stay up-to-date with changes in Hiver data. Based on available integration trigger data, the following event categories are supported:

### Conversation Updates

Triggers when a conversation's status, assignee, contact, or tags are modified. This covers any change to the core properties of an existing conversation within a shared inbox.

### New Email Activity

Triggers when an email is sent from or received into a shared mailbox. This covers both inbound and outbound email activity on shared inboxes.

### New Inbound Conversation

Triggers when a new conversation is received into a shared mailbox. This specifically fires for new incoming conversations, distinct from ongoing email threads.

### New Outbound Conversation

Triggers when a new conversation is sent from a shared mailbox. This fires when a new outbound email thread originates from a shared inbox.

### New Note

Triggers when a new note is created in a shared conversation. This covers internal team notes added to conversations.

### CSAT Rating Received

Triggers when a CSAT rating is received for a conversation. This fires when a customer submits a satisfaction rating for a resolved conversation.
