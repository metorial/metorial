Now let me look at the Runtime API and Admin API for more details on features and events:Now I have enough information to write the specification.

# Slates Specification for Botpress

## Overview

Botpress is a platform for building, deploying, and managing AI-powered chatbots and agents. It provides a visual studio for designing conversation flows, knowledge bases, structured data tables, and integrations with messaging channels like WhatsApp, Slack, and Telegram. The platform exposes multiple APIs (Chat, Admin, Runtime, Files, Tables) for programmatic control over bots, conversations, and workspace management.

## Authentication

Botpress uses token-based authentication via Bearer tokens. A Personal Access Token (PAT) can be generated in the Profile Settings section of your Botpress account and used to authenticate API requests.

There are three types of tokens:

1. **Personal Access Token (PAT):** Generated from your Botpress account's Profile Settings. This token has the same access level as your account and can be used across all APIs (Admin, Chat, Runtime, Files, Tables).

2. **Bot Access Key (BAK):** Provided when a bot is deployed. This token limits API access to only the actions that the bot can perform — only the Runtime API, Tables API, and Files API are available with this token.

3. **Integration Access Key (IAK):** Provided when an integration is deployed. This token limits API access to only the actions that the integration can perform — only the Runtime API and Files API are available with this token.

**How to authenticate:**

All requests go to `https://api.botpress.cloud` (except Chat API which uses `https://chat.botpress.cloud`). Pass the `Authorization` header with the token as a Bearer token:

```
Authorization: Bearer {TOKEN}
```

For Chat/Runtime API requests, you must also include `x-bot-id` as a header to specify which bot the request targets. If acting as an integration, include `x-integration-id` as well.

## Features

### Bot Management

The Admin API allows managing your workspace including bot creation, deployment, versioning, monitoring, and analytics. It also supports managing workspace collaborators and roles. You can create, update, delete, and deploy bots, as well as generate webchat embed code.

### Conversation and Messaging

Conversations represent exchanges of messages between one or more users, always linked to an integration's channel (e.g., a Slack channel represents a conversation). Through the Chat and Runtime APIs you can:

- Create and list conversations
- Send and receive messages (text, image, audio, video, file, location, carousel, card, dropdown, choice)
- Manage conversation participants
- Tag conversations and messages with metadata

### User Management

Users represent people interacting with a bot within a specific integration. The same person interacting with a bot on Slack and Messenger will be represented as two different users. Users can be created, retrieved, listed, and tagged.

### Tables (Structured Data)

The Tables API allows managing tables that store structured data. You can use tables to store user data, automatically label data, and extract information from content. Tables support creating, updating, querying, and deleting rows programmatically.

### File Management

The Files API allows managing files uploaded to Botpress — including files for knowledge bases, media files (images, videos, documents), and files used by bots or integrations. Files can be indexed and searched for use in knowledge base retrieval.

### Integration Management

Integrations connect bots to external services and messaging channels. Through the Admin API, you can manage both public (pre-built for services like Slack, WhatsApp) and private (custom-built) integrations within a workspace.

### Events and Actions

Events are units of work that can be sent to bots for asynchronous processing. Bots and integrations can define custom event types with schemas. Actions are callable functions defined by bots or integrations that execute dynamic logic during conversations.

### State Management

State provides persistent key-value storage scoped to a conversation, user, bot, or workflow. States allow bots to maintain context across interactions.

### Analytics, Logs, and Issues

The Admin API provides access to bot performance analytics, detailed activity logs, and issue tracking for diagnosing and resolving bot problems.

### Workspace and Account Administration

Manage accounts, workspaces, workspace members and roles, billing, and usage quotas through the Admin API.

## Events

Botpress supports a Webhook integration that generates a personalized webhook URL allowing bots to receive external updates via HTTP POST requests. This is the primary mechanism for external systems to push data into Botpress.

### Inbound Webhooks

The Webhook integration provides configuration options including an optional secret (sent as the `x-bp-secret` header for request validation) and allowed origins for CORS control. External systems can POST JSON payloads to the webhook URL, which are delivered to the bot as events containing the request body, query parameters, headers, and path.

- **Configuration:** Secret for authentication, allowed origins for CORS.
- The webhook payload is overwritten when a new message is sent, so data should be stored in variables if needed later.

Botpress does not provide a built-in outbound webhook subscription system for listening to platform-side events (e.g., "notify me when a new conversation is created"). External event listening relies on the inbound webhook integration or building custom integrations using the SDK.
