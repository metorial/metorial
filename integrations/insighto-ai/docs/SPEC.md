Now let me look at the full API reference to understand all API categories:I now have a comprehensive picture of Insighto.ai's API. Let me compile the specification.

# Slates Specification for Insighto.ai

## Overview

Insighto.ai is a no-code conversational AI platform that enables businesses to build, customize, and deploy AI-powered chat and voice agents across multiple channels. It enables businesses to create and deploy conversational AI chatbots and voice agents for enhanced customer engagement across multiple channels. The platform allows administrators to automate workflows, such as appointment bookings, recommendations, lead generation, and reservations.

## Authentication

Insighto.ai uses **API key** authentication. You must create an account on Insighto.ai to obtain an API key, which is required to connect with the Insighto.ai services.

- **Generating an API key**: Navigate to the API section in your dashboard and generate a new API key.
- **Format**: The API key starts with the prefix `in-`.
- **Usage**: The API key can be passed either as a query parameter (`api_key`) or via an HTTP Bearer token in the `Authorization` header.
- **Base URL**: `https://api.insighto.ai`

Example using query parameter:

```
GET https://api.insighto.ai/api/v1/user?api_key=in-your_api_key_here
```

Example using Bearer token:

```
Authorization: Bearer in-your_api_key_here
```

## Features

### Outbound Calling

Initiate AI-powered outbound phone calls to specified phone numbers via configured voice widgets. Calls are placed through telephony providers (Twilio, Plivo, or Telnyx) connected to a widget. Supports dynamic prompt variables to personalize conversations (e.g., customer name, appointment details). Phone numbers must be in E.164 format. Also supports bulk calling to a list of contacts for campaign-style outreach.

### Call Management

Disconnect active calls programmatically. Useful for managing ongoing AI voice conversations or implementing custom call flow logic.

### Messaging

Send messages through chat-based AI assistants across configured channels (SMS, WhatsApp, web chat, etc.).

### Conversation Management

Access and manage conversations between AI agents and end users. Conversations are created when interactions occur across any channel (voice or chat).

### Contact Management

Create and manage contacts in the system. Contacts represent end users who interact with AI agents and can be organized for campaigns or bulk operations. Creates a Contact in the system.

### Assistant Management

Create, configure, and manage AI assistants. Assistants define the behavior, personality, and capabilities of the AI agents that handle conversations. Configuration includes prompts, connected tools, advanced settings like webhooks, and channel assignments.

### Widget Management

Manage widgets that serve as deployment endpoints for AI agents. Widgets can be embedded on websites, connected to telephony providers for voice, or linked to messaging channels.

### Data Source Management

Create and manage knowledge bases that AI agents use to answer queries. Adds a text blob into an existing Data Source. Data sources can be populated with text content, documents, and other structured information that agents reference during conversations.

### Campaign Management

Run outbound campaigns to reach multiple contacts via voice calls or chat messages. Campaigns queue up interactions and process them sequentially.

### Form Management

Create and manage forms that AI agents can use to collect structured data from users during conversations. Forms can be connected to webhooks to push captured data to external systems.

### Intent Management

Define and manage intents that help AI agents categorize and route user queries appropriately.

### Prompt Management

Create and manage prompt templates that control AI agent behavior and response patterns.

### Voice Configuration

Configure voice settings for AI voice agents, including voice selection and related parameters.

### Tool Management

Manage built-in and custom tools that AI agents can invoke during conversations (e.g., Google Calendar, HubSpot, Freshdesk, PayPal, Zoho Calendar, GoHighLevel, PostgreSQL database, etc.). Custom tools allow connecting to any external API.

### Custom Fields

Define custom fields to extend the data model for contacts and other entities.

### Channel Management

Configure and manage communication channels through which AI agents interact with users (web chat, WhatsApp, Messenger, Instagram, Telegram, SMS, etc.).

### Outbound Webhook Management

Create, update, and manage outbound webhook configurations via the API. Webhooks allow pushing real-time data from Insighto to external platforms.

### Conversation Flow

Manage conversation flow configurations that define how AI agents navigate through multi-step interactions.

### Analytics

Access analytics and performance data about AI agent interactions, conversations, and usage metrics.

### Tags

Create and manage tags for organizing and categorizing contacts, conversations, or other entities.

### Agency & White-Label (Agency plans)

Manage sub-accounts, branding, custom domains, and rebilling for agency/reseller use cases. Includes Bring Your Own Key (BYOK) support for custom AI model integration.

### Logs

Access logs of API activity, webhook deliveries, and agent interactions for debugging and auditing.

## Events

Insighto.ai supports outbound webhooks that push data to external platforms in real-time.

### Form Submissions

Any form submissions will trigger the webhook automatically. When an AI agent captures form data from a user, the completed form data is sent to the configured webhook endpoint.

### Assistant Conversation Events

Within the assistant's settings, go to the Advanced tab, scroll down to find the Webhook field, then select the webhook you want to connect from the dropdown menu. Webhooks can be connected to assistants to receive data about conversations handled by that assistant.

### New Conversation Created

Triggers when a new conversation is created. Fires when a new conversation is initiated with an AI agent.

### New Contact Created

Triggers when a new contact is created. Fires when a new contact record is created in the system.

### New Captured Form

Triggers when a new form is captured. Fires when a form is completed and captured during an AI agent interaction.

**Configuration**: Webhooks are created in the Settings section of the Insighto dashboard. Each webhook requires a Name and an Endpoint URL from the platform you're creating a workflow with (e.g., Zapier, Make, or any other system). Each webhook must be uniquely assigned to a single form or assistant to avoid conflicts.
