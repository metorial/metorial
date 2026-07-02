The pages require JavaScript. Let me search for more specific details.Now let me search for more details on the API's message types and conversation features.# Slates Specification for Respond.io

## Overview

Respond.io is a business messaging platform that unifies customer communication across channels such as WhatsApp, Facebook Messenger, Telegram, Viber, email, and web chat into a single workspace. It connects contacts from Email, WhatsApp, Social Media, and Website widget in one place. Its Developer API allows users to automate messages, sync CRMs, and trigger Workflows.

## Authentication

Respond.io uses **Bearer Token (API Access Token)** authentication.

To obtain an access token:

1. From the Settings Module, navigate to the menu item **Integrations**. From the list, search for **Developer API** and press Edit. Press **Add Access Token** to add a new access token. This token is needed to access the API endpoints.

The token is passed as a Bearer token in the `Authorization` header:

```
Authorization: Bearer <your_access_token>
```

The API base URL is `https://api.respond.io/v1` (v2 endpoints are also available at `https://api.respond.io/v2`).

**Plan requirements:** Developer API is only available for Growth Plan and above. Webhooks are only available for Advanced plan and above.

## Features

### Contact Management

The Contact API allows you to access, create, update, or remove contacts, in addition to merging and listing all available contacts. You can use filters in the request body to limit the results to only records with matching contact field values.

- Contacts support standard fields (name, email, phone, language, etc.) and custom fields.
- You can add tags for a specific contact, which are used for grouping and filtering contacts.

### Messaging

The Messaging API allows you to retrieve messages sent as well as send messages to contacts through channels connected in your workspace.

- You can send a message to a specific contact through a specific channel. If channelId is not specified, the message will be sent through last interacted channel.
- Supports text messages, media/attachments, and template messages (e.g., WhatsApp templates).
- Custom payload message types are only supported for Telegram, Facebook, Viber, and LINE.
- You can list message templates of connected channels in the workspace.

### Conversation Management

The Conversation API allows you to open and close conversations for contacts, as well as assign and unassign users to them.

- You can update the assignee of a specific contact or unassign the contact by leaving the assignee value empty.

### Custom Fields

You can get information about custom fields by providing the unique custom field ID. Custom fields support various types and are used to store additional contact data for personalization and workflow automation.

### Custom Channels

Custom Channel integration allows your team to chat with customers over any messaging channel via a custom implementation. This enables connecting messaging providers not natively supported by respond.io through a webhook-based integration server.

## Events

Respond.io supports outbound webhooks that send real-time notifications to a specified endpoint URL when events occur in the workspace. You can specify which events you'd like to receive notifications for and provide the URL (endpoint) where you'd like to receive these notifications.

### Message Events

- **New incoming or outgoing message** — Triggered when a new message is received from or sent to a contact on any connected channel.

### Conversation Events

- **Conversation opened** — Triggered when a conversation with a contact is opened.
- **Conversation closed** — Triggered when a conversation with a contact is closed.

### Contact Events

- **New Contact is added** — Triggered when a new contact is created in the workspace.
- **Existing Contact is updated** — Triggered when a contact's information is modified.
- **Contact tag is updated** — Triggered when tags on a contact are added or removed.
- **Contact assignee is updated** — Triggered when the assigned user for a contact changes.

### Comment Events

- **New Comment** — Triggered every time a new comment is added, enabling automatic notification of team members and syncing comments across systems.

Webhook configuration is done via **Settings > Integrations > Webhooks** in the workspace. Each webhook requires an endpoint URL and selection of which event(s) to subscribe to. The endpoint must return a 200 OK response within 5 seconds, or it counts toward an error limit that can lead to automatic deactivation.
