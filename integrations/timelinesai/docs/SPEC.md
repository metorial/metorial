Let me get more details on the API swagger documentation and file upload capabilities.# Slates Specification for TimelinesAI

## Overview

TimelinesAI is a teamwork, integration and business automation platform for WhatsApp. It helps teams communicate smarter on WhatsApp by consolidating messages across multiple accounts and enabling real-time collaboration. TimelinesAI supports both personal and business WhatsApp accounts without relying on the WhatsApp Business API.

## Authentication

TimelinesAI uses **API Key (Bearer Token)** authentication for its Public API.

To obtain your API key:

1. Navigate to Settings > API Access in your TimelinesAI workspace. Click "Generate New API Key." Copy your API key and workspace ID. Store securely—these credentials authenticate all API requests.

The API key is available from the Integrations section at `https://app.timelines.ai/integrations/api/`.

The API key is passed as a Bearer token in the Authorization header: `Authorization: Bearer XXX`, where `XXX` is your TimelinesAI API token.

An active TimelinesAI subscription is required to use the API. You must have an active account and an API key for subscription.

## Features

### Messaging

Send WhatsApp text messages to new or existing chats programmatically. Message management allows sending tailored messages by incorporating CRM field data. Messages can be sent to individual contacts by specifying the recipient's phone number and the sender WhatsApp account. You can send all kinds of attachments from WhatsApp (images, videos, voice records, and files). You can share files via Public API, by first uploading them to TimelinesAI.

### Chat Management

Retrieve, filter, and manage WhatsApp chat conversations. The Get Chats endpoint supports extensive filters including assignee_id, label_id, is_unread, is_archived, and search terms. You can retrieve full message history for a given chat by chat ID.

### WhatsApp Account Management

TimelinesAI supports multiple connected WhatsApp accounts per workspace. You can list all connected numbers via the Get WhatsApp Accounts endpoint and send messages from whichever number you specify. The agent checks account status via the Get WhatsApp Accounts endpoint before sending.

### WhatsApp Group Management

The API enables five core capabilities: create new groups, add or remove members, send messages to groups, read group messages and member information, and manage group settings like name, description, and admin permissions.

- TimelinesAI's WhatsApp Group API provides endpoints to programmatically manage WhatsApp groups using your existing WhatsApp account. Unlike solutions that require WhatsApp Business API setup, TimelinesAI connects to your personal WhatsApp or WhatsApp Business account via QR code scan.

### File Management

Files can be uploaded to TimelinesAI and then attached to messages sent via the API. Upload a file to TimelinesAI via the Integrations section or API, then reference it when sending messages.

### Webhook Management

You can create, update, and monitor webhooks via the API. New message events can trigger downstream workflows automatically. You can create up to 10 webhooks per workspace at a single point in time. But if you need more webhooks, you can buy an add-on.

## Events

TimelinesAI supports outbound webhooks that notify external systems about workspace events in real time.

### Message and Chat Events

TimelinesAI currently supports Message and Chat Events, which include all messages sent and received across all WhatsApp accounts linked to your workspace. This applies to messages from any device, whether a mobile app, WhatsApp Web, or TimelinesAI itself. The event tracks messages as a whole, not by individual device or session.

Based on integration platform listings, the following specific event types are available:

- **New Message** (`message:new` / `message.created`): Triggers when a new WhatsApp message is sent or received.
- **New Chat** (`chat.created`): Triggers when a new incoming chat is created.
- **Chat Renamed**: Triggers when a chat is renamed.
- **New WhatsApp Account**: Triggers when new whatsapp_accounts is created.

Configuration options:

- Each webhook endpoint is assigned a specific event type and URL.
- Webhooks can be activated or deactivated individually.
- You can download webhook logs to track all changes made to webhook endpoints, including details like the webhook ID, Webhook URL, Event type, and Timestamp.
- The legacy v1 webhook system supported message aggregation (bundling messages over 1, 6, 12, or 24 hour intervals), but the current v2 system delivers events in real time.
