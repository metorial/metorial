The page content was cut off. Let me get more details on the authentication.Now I have enough information to write the specification.

# Slates Specification for Wati

## Overview

Wati (WhatsApp Team Inbox) is a WhatsApp Business API platform that enables businesses to send and receive WhatsApp messages, manage contacts, run broadcast campaigns, and automate customer communication through chatbots. The WATI CRM API allows businesses to interact with WhatsApp by sending messages, managing contacts, retrieving messages, and integrating with external systems. The API is available for businesses subscribed to the WATI CRM Plan.

## Authentication

Wati uses Bearer Token authentication. Wati API uses OAuth2 as an authorization layer, and every API request must contain an Authorization HTTP header with a token. Access tokens are app and user-specific.

To authenticate:

1. Log in to your WATI account, navigate to API Docs in the top menu, and copy the API Endpoint URL and Bearer Token from the page.

Two values are required:

- **API Endpoint URL**: A tenant-specific base URL in the format `https://live-server-XXXXX.wati.io`. Each Wati account has a unique endpoint.
- **Bearer Token (Access Token)**: Passed in the `Authorization` header as `Bearer <token>`.

Example request:

```
GET https://live-server-XXXXX.wati.io/api/v1/getContacts
Authorization: Bearer <your-token>
```

Important considerations:

- Changing your Wati account password will invalidate your current Bearer Authentication Token.
- The Rotate Token API is used to refresh authentication tokens to maintain secure API access.
- Each token is unique to an account.

## Features

### Messaging

Send WhatsApp messages to customers through multiple message types. You can send a message within an active WhatsApp session or send a file attachment within an active WhatsApp session. You can also send pre-approved WhatsApp template messages, including bulk sending of multiple template messages. Interactive button messages and interactive list messages with selectable options are also supported.

- **Session messages**: Free-form text or file messages sent within a 24-hour window after a user's last interaction.
- **Template messages**: Pre-approved message templates that can be sent anytime. Support dynamic parameters. Can be sent individually, in bulk, or via CSV upload.
- **Interactive messages**: Messages with quick-reply buttons or selectable list options.
- Files can be sent either by uploading directly or via a URL.

### Contact Management

Retrieve a list of contacts stored in WATI, add new contacts, and modify details for existing contacts. Contacts can also be assigned to teams. Contact counts can be retrieved.

### Conversation Management

Manage WhatsApp conversations including retrieving message history for a given phone number. The Assign Operator API allows you to assign WhatsApp chats to a particular operator for better management. Conversation status can also be updated (e.g., open, resolved).

### Campaigns (Broadcasts)

Retrieve campaign data including campaign lists, details by ID, recipients, and campaign overviews. Campaigns allow sending template messages to targeted groups of contacts.

### Message Templates

Manage WhatsApp message templates: retrieve existing templates, create new templates, and delete templates. Templates must be approved by WhatsApp/Meta before they can be used for sending. Template messages can also be scheduled for future delivery.

### Chatbots

List existing chatbots and trigger/start a chatbot for a specific contact or conversation. Chatbot functionality is available on Pro plan and above.

### WhatsApp Account Management

Retrieve information about connected WhatsApp phone numbers, business accounts, and phone number profile details. Supports multi-number setups.

### Media

Retrieve media files associated with messages by file name or message ID.

### Sales Analytics

Access sales pipeline data and lead stage information for tracking WhatsApp-driven sales activities.

### WhatsApp Payments (Private Beta)

Send order detail messages, update order statuses, and retrieve order and payment status information through WhatsApp Pay integration.

### Webhook Management

Create and configure webhooks programmatically via the API, specifying callback URLs and which events to subscribe to.

## Events

Wati supports webhooks that can alert you of messages received, messages sent (Template & Session), and status of the messages sent (Sent/Delivered/Read). Webhooks are configured via the Wati Dashboard or API, specifying a callback URL and selecting event types.

### Inbound Message Events

- **Message Received**: Triggered whenever a user sends a message to your WATI number.
- **New Contact Message**: Triggered when a message is received from a contact that does not yet exist in your WATI contact list.

### Outbound Message Events

- **Session Message Sent**: Triggered when a session (free-form) message is successfully sent.
- **Template Message Sent**: Triggered when a template message is successfully sent.
- **Template Message Failed**: Triggered when a template message failed to be sent by WhatsApp/Meta, including the failure code and message returned by Meta.

### Message Status Events

- **Message Delivered**: Triggered when a sent message is confirmed as delivered to the recipient.
- **Message Read**: Triggered when a sent message is confirmed as read by the recipient.
- **Message Replied**: Triggered when a recipient replies to a sent message.

### Template Lifecycle Events

- **Template Status Update**: Triggered when the approval status of a message template changes.
- **Template Quality Update**: Triggered when the quality rating of a template changes.
- **Template Category Update**: Triggered when the category of a template is updated.

### Account Events

- **WABA Status Review Update**: Triggered when the WhatsApp Business Account status changes due to a review.
- **WABA Account Deleted**: Triggered when a WhatsApp Business Account is deleted.
- **WABA Account Content Updated**: Triggered when the content/profile of a WhatsApp Business Account is updated.
- **Phone Number Quality Update**: Triggered when the quality rating of a connected phone number changes.
- **Phone Number Deleted**: Triggered when a phone number is removed from the account.
