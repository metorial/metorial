Now let me get the webhook details:Now I have all the information I need. Let me compile the specification.

# Slates Specification for Superchat

## Overview

Superchat is a unified messaging platform that allows businesses to send and receive messages across multiple channels — including WhatsApp, Instagram Direct, Facebook Messenger, Telegram, Email, and SMS — from a single inbox. Founded in 2020 and based in Berlin, it is primarily aimed at small and medium-sized businesses for customer communication.

## Authentication

The Superchat API uses header tokens to authenticate requests. You'll need to include a token in the header of your requests.

All API requests require your Superchat API key for security. You can find your API key in the Superchat dashboard under Settings > Integrations > API Key. Include this key in an HTTP header (`X-API-KEY`) for each request.

You have to be logged in as an administrator to view the API token.

The token is currently scoped to have global read and write access. There are no granular permission scopes to configure. API requests have to be made over HTTPS.

The base URL for all API calls is `https://api.superchat.com/v1.0/`.

## Features

### Unified Messaging

The Superchat API abstracts message types and makes them available on all connected platforms. You can send WhatsApp, Instagram, Facebook messages, Emails and the like through one unified endpoint. Supported content types include text, email, WhatsApp templates, and generic templates. Every message sent via Superchat will create or use a contact in your workspace. If you send to a new phone number/email that isn't in your contacts yet, the API will create a contact entry automatically and return its ID in the response.

- WhatsApp enforces a 24-hour messaging window for free-form messages. Outside that window, or when messaging a customer first, you must use a pre-approved WhatsApp Template message.
- For SMS, ensure you have the recipient's mobile number. SMS messages can only contain text content or links.
- To send an email via the API, provide the recipient's email address and your connected email channel. The content usually includes a subject and a body.

### Contact Management

Contacts can be created, retrieved, updated, deleted, and searched. Contacts have handles (phone numbers, email addresses, social media identifiers) and support custom attributes. Contacts can be organized into contact lists and associated with conversations.

### Conversations

Conversations represent message threads with contacts on a specific channel. They can be listed, retrieved, updated (e.g., changing status), and deleted. Conversations can be exported for archival or analysis purposes.

### Message Templates

Templates are pre-approved message formats, primarily used for WhatsApp out-of-window messaging. Each template has a name, a language, and optionally variables/placeholders that you can fill in. Templates can be created, listed, updated, deleted, and organized into folders. Analytics for template engagement are also available.

### Channels and Inboxes

You can list and retrieve connected messaging channels (WhatsApp, Instagram, Facebook Messenger, Telegram, Email, SMS, etc.) and inboxes. Inboxes represent how conversations are routed and organized among team members.

### Labels

Labels can be listed and retrieved to categorize conversations.

### Notes

Internal notes can be created, listed, updated, and deleted within conversations, enabling team collaboration on customer inquiries.

### Files

Files can be uploaded, listed, retrieved, and deleted for use as message attachments.

### Users

You can list workspace users, retrieve individual user details, and identify the currently authenticated user.

### Message Analytics

Engagement analytics can be fetched for messages and templates to track delivery and interaction metrics.

## Events

Superchat supports webhooks that can be created, listed, updated, and deleted via the API. When subscribed, webhook payloads are sent to your configured URL on the following event types:

### Message Events

- **Inbound Messages** (`message_inbound`): Triggered when a message is received from a contact on any connected channel. Includes message content, sender contact details, channel, and conversation ID.
- **Outbound Messages** (`message_outbound`): Triggered when a message is sent from your workspace to a contact. Includes message content, recipient details, channel, and conversation ID.
- **Failed Messages**: Triggered when an outbound message fails to deliver. Includes the same message payload plus error details describing the failure reason.

### Contact Events

- **Contact Created** (`contact_created`): Triggered when a new contact is created. Includes contact details, handles, and custom attributes.
- **Contact Updated** (`contact_updated`): Triggered when a contact's information changes. Includes the full updated contact object.
- **Contact Deleted** (`contact_deleted`): Triggered when a contact is removed. Includes only the contact ID.

### Conversation Events

- **Conversation Opened** (`conversation_opened`): Triggered when a conversation is opened or reopened.
- **Conversation Snoozed** (`conversation_snoozed`): Triggered when a conversation is snoozed, includes the `snoozed_until` timestamp.
- **Conversation Done** (`conversation_done`): Triggered when a conversation is marked as done.

All conversation event payloads include conversation details such as channel, status, assigned users, labels, inbox, and linked contacts.

### Note Events

- **Note Created** (`note_created`): Triggered when a new internal note is added to a conversation. Includes note content and author details.
