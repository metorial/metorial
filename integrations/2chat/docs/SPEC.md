# Slates Specification for 2chat

## Overview

2Chat is a programmable communication platform that provides API access to WhatsApp (Messenger, Business, and Business API) and phone call functionality. It is an AI-native phone system with WhatsApp and SMS integrations, built for modern businesses. The API allows sending and receiving messages, managing contacts, handling WhatsApp groups, and managing voice calls through virtual numbers.

## Authentication

2Chat uses API key-based authentication via an HTTP header.

- **Method:** API Key
- **Header Name:** `X-User-API-Key`
- **Header Value:** Your API key
- **Base URL:** `https://api.p.2chat.io/open/`

To obtain an API key, you need to create a 2Chat account, connect a supported channel (e.g., a WhatsApp number), and then generate an API key from the developers section of the dashboard.

You can generate or renew API keys at `https://app.2chat.io/developers?tab=api-access`.

To verify your API key is working, make a GET request to `https://api.p.2chat.io/open/info` with the `X-User-API-Key` header.

**Note:** The API enforces same-origin policy. Calls from a browser will result in CORS errors. Requests must be made server-side.

## Features

### WhatsApp Messaging

Send and receive text and multimedia messages (images, audio, video, PDFs) to individual WhatsApp users or groups. You can send text and multimedia messages, including audio, video, PDFs, images, etc., both to a single person or to a WhatsApp group. Messages require specifying a `from_number` (your connected number) and a `to_number`. Media attachments must be publicly accessible URLs.

### WhatsApp Number Management

List, retrieve, and manage WhatsApp numbers connected to your 2Chat account. You can set the WhatsApp status text and profile picture of your connected numbers.

### WhatsApp Number Verification

Verify if phone numbers are active on WhatsApp before sending messages. The verification API helps check number validity and maintain clean contact lists.

### WhatsApp Group Management

Automate WhatsApp groups at scale. Create groups, send messages, manage members, and monitor activity. You can send messages to groups, list groups, and track group membership changes.

### WhatsApp QR Code Connection

You can use the API to generate the QR code that you can display on your app and let your customer scan it to connect their WhatsApp number to your software using 2Chat as an invisible intermediary. This enables white-label integrations where end-users connect their own WhatsApp numbers via the Linked Devices feature.

### WhatsApp Catalog Management

Manage WhatsApp product catalog data through the API, including import and export of store data.

### WhatsApp Business API (WABA)

In addition to WhatsApp Web-based connections, 2Chat also supports the official WhatsApp Business API (WABA) as a separate channel type.

### Contact Management

Create and manage contacts in your directory. Each contact must have at least a first name and some contact details like a phone number or an email address. Each person can have many associated details, like a phone number or a physical address. You can also search contacts.

### Phone Calls

Manage virtual phone numbers and caller IDs for voice calls. A cloud-based phone system to manage multiple numbers from a single dashboard. Local numbers in 90+ countries are available.

### File Management

Send and receive high-quality documents and media files through the API. Manage file uploads and track delivery status.

## Events

2Chat supports webhooks for real-time event notifications across WhatsApp and Phone Call channels. Webhooks are subscribed per event type and per connected number/channel. SMS webhooks are listed as coming soon.

### WhatsApp Message Events

- **Message Received** (`whatsapp.message.received`): Triggers when a new WhatsApp message is received.
- **Message Sent** (`whatsapp.message.sent`): Triggers when a new WhatsApp message is sent.
- **New Message** (`whatsapp.message.new`): Triggers when a message is either sent or received.
- **Message Edited** (`whatsapp.message.edited`): Triggers when a message is edited, including group messages.
- **Message Reaction** (`whatsapp.message.reaction`): Triggers when someone reacts to a message.
- **Audio Transcribed** (`whatsapp.audio.transcribed`): Triggers when a WhatsApp audio message is transcribed to text.

### WhatsApp Message Receipt Events

- **Receipt Sent** (`whatsapp.message.receipt.sent`): Triggers when a sent message is in the process of being delivered.
- **Receipt Received** (`whatsapp.message.receipt.received`): Triggers when a sent message is received on the recipient's device.
- **Receipt Read** (`whatsapp.message.receipt.read`): Triggers when the receiver reads your message (if read receipts are enabled).

### WhatsApp Conversation Events

- **New Conversation** (`whatsapp.conversation.new`): Triggers when a new conversation is started. Configurable `time_period` parameter (`all-time`, `hour`, `day`, `week`, `month`, `year`) defines the inactivity window after which a conversation is considered new.

### WhatsApp Call Events

- **Call Received** (`whatsapp.call.received`): Triggers when a WhatsApp call is received or missed.
- **Call Made** (`whatsapp.call.made`): Triggers when a WhatsApp call is made from the connected number.

### WhatsApp Order Events

- **Order Received** (`whatsapp.order.received`): Triggers when a new WhatsApp order is received.

### WhatsApp Group Events

- **Group Message Received** (`whatsapp.group.message.received`): Triggers when a message is received in a WhatsApp group. Can be filtered to a specific group via `to_group_uuid`.
- **Group Message Reaction** (`whatsapp.group.message.reaction`): Triggers when a group participant reacts to a message. Can be filtered by group.
- **Group Join** (`whatsapp.group.join`): Triggers when someone joins a group.
- **Group Leave** (`whatsapp.group.leave`): Triggers when someone leaves a group.
- **Group Remove** (`whatsapp.group.remove`): Triggers when someone is removed from a group.

### WhatsApp Number Status Events

- **Number Status** (`whatsapp.number.status`): Triggers when a connected WhatsApp number changes status (e.g., `ready`, `disconnected`, `qr-received`, `loading`, `initializing`). Includes disconnection reasons such as QR scan timeout, user-requested logout, account lock, or sync failure.

### Phone Call Events

- **Call Status Update** (`call.status.update`): Triggers on every call status change during the call lifecycle (ringing, answered, ended) for both inbound and outbound calls.
- **Incoming Call Completed** (`call.incoming.completed`): Triggers when an incoming phone call ends, whether answered or missed.
- **Outbound Call Completed** (`call.outbound.completed`): Triggers when an outbound phone call ends, whether answered or failed.
