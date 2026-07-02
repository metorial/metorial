# Slates Specification for Landbot

## Overview

Landbot is a no-code chatbot platform for building conversational experiences across web, WhatsApp, Facebook Messenger, and custom API channels. It provides a visual builder for creating chatbot flows, an inbox for managing conversations with human takeover, and APIs for programmatic control of bots, customers, channels, and messaging.

## Authentication

Landbot uses **API key (token) authentication**. All API requests must include the token in the `Authorization` header.

**Header format:**

```
Authorization: Token YOUR_API_TOKEN
```

**How to obtain the API token:**

1. Log in to your Landbot dashboard at `https://app.landbot.io/`.
2. Click your avatar at the bottom-left corner and select **Account**.
3. Locate the **API token** section and copy your unique token.

**Important considerations:**

- You need a Professional Account to use Landbot's APIs.
- The token is unique per teammate, and will behave according to the permissions granted to that teammate.
- Landbot exposes two distinct APIs, each with their own base URL:
  - **Platform API** (`https://api.landbot.io/v1/`): For managing account resources like customers, channels, bots, agents, and tickets.
  - **Chat API** (`https://chat.landbot.io/v1/`): For sending messages to customers within chat channels. The Chat API uses a channel-specific auth token generated when setting up the Hook URL in a channel's configuration.

## Features

### Customer Management

Retrieve and manage customer (end-user) data. You can look up customers, update their profile fields, assign them to specific bots or agents, unassign conversations, and manage WhatsApp opt-ins (contacts/subscribers). This includes retrieving customer details, assigning a customer to a specified bot, and adding fields to a customer's profile.

### Messaging

Send messages to customers programmatically across channels. Supports sending chat text messages, images, and location links to customers. For WhatsApp, you can send pre-approved message templates with dynamic parameters (header, body, buttons) and manage template retrieval.

### Channel Management

Retrieve details of specified channels. Channels represent the deployment targets for bots (web, WhatsApp, Messenger, APIChat). You can list channels, retrieve WhatsApp templates, and configure channel-specific settings.

### Ticket Management

Create tickets, update existing tickets, retrieve ticket details, and list all tickets in your account. Tickets are used for tracking customer support interactions.

### Bot Assignment and Flow Control

Assign customers to specific bots and direct them to particular blocks (steps) within a bot flow. You can also unassign conversations from agents to return them to automated handling. This enables resuming a bot flow based on external processes.

### Agent Management

Retrieve and manage agent (teammate) information within your Landbot account. Agents handle human takeover conversations in the inbox.

### WhatsApp Campaigns

Send WhatsApp message templates to contacts via the API, enabling outbound messaging campaigns. Templates must be pre-approved by Meta. You can specify template parameters, language, and control post-send behavior (e.g., assigning to a bot flow after delivery).

- Requires an official WhatsApp channel (not testing channels).
- Contacts must have opted in before receiving proactive messages.

## Events

Landbot supports webhooks through a feature called **MessageHooks**. MessageHooks allows you to be "notified" to all the messages and events going on in your bot. Other platforms call them "webhooks" as they trigger an HTTP POST Request to a designated endpoint, every time a message or specific event is triggered in the bot.

MessageHooks are available for all channel types (Web, WhatsApp, Messenger, APIChat).

The webhook functionality is available only for Professional or Business plans.

### Message Events

Receive notifications when messages are exchanged in a bot conversation. Messages are categorized by type:

- **Button**: Triggered when a user clicks a button.
- **Text**: Triggered when a text message is sent.
- **Dialog**: Triggered when a bot displays selectable options.
- **Image**: Triggered when a media block is displayed.
- **Iframe**: Triggered when embedded media (e.g., YouTube) is displayed.

Each message payload includes sender information (customer, bot, or agent), customer details, channel info, and the message content.

### Bot Events

Receive notifications for bot lifecycle and conversation management events:

- **Assign**: When a conversation is assigned to an agent (e.g., human takeover).
- **Unassign**: When a conversation is unassigned from an agent (due to inactivity, closure, etc.).

### Configuration

When creating a MessageHook, you configure:

- **URL**: The endpoint to receive POST requests.
- **Channel**: The specific bot/channel to monitor (one per MessageHook).
- **Token** (optional): An additional security token included in webhook payloads.
- **Name**: A label for identifying the MessageHook.
