# Slates Specification for ChatBotKit

## Overview

ChatBotKit is a conversational AI platform that enables developers to build, manage, and deploy AI chatbots and agents. It provides APIs for managing bots, datasets, skillsets, conversations, contacts, integrations, and more, with support for multiple AI models (OpenAI, Anthropic, etc.) and deployment to channels like Slack, Discord, WhatsApp, Microsoft Teams, and web widgets.

## Authentication

ChatBotKit supports two primary authentication methods:

**1. API Secret Keys (Primary Method)**

API secret keys are the primary method for authenticating API requests. These keys provide long-lived access to your account and should be treated as sensitive credentials. Secret keys begin with the prefix `sk-` and are generated through the ChatBotKit dashboard.

To authenticate, include the key as a Bearer token in the `Authorization` header:

```
Authorization: Bearer sk-your-secret-key
```

All API endpoints are accessible at the base URL `https://api.chatbotkit.com` and require authentication using either API secret keys or JWT tokens. Both `api.cbk.ai` and `api.chatbotkit.com` point to the same API service. `cbk.ai` is the shortened domain for ChatBotKit.

**2. JWT Tokens**

JWT tokens automatically expire after a predetermined period, enhancing security for temporary access scenarios. They're particularly useful for widget integrations, temporary access grants, and client-side applications where secret keys should not be embedded.

**3. User Impersonation (Partner API)**

For parent accounts managing multiple sub-accounts or child users, the API supports user impersonation through special request headers. This allows a parent account to make requests on behalf of child accounts without requiring separate authentication credentials. To make requests on behalf of a specific child user, include the `X-RunAs-User-ID` header. Alternatively, use the `X-RunAs-Child-User-Email` header to impersonate by email.

## Features

### Bot Management

A ChatBotKit bot is a comprehensive conversational system built from multiple interconnected components: backstory (natural language instructions defining personality and behavior), model (the underlying AI model like GPT, Claude, etc.), datasets (curated knowledge bases), skillsets (custom abilities), and configuration (privacy, moderation, behavioral control). This modular architecture allows creating bots tailored to virtually any use case.

- Configure the AI model, backstory, datasets, and skillsets per bot.
- Bots can be deployed across multiple channels.

### Conversations

Conversations are interactive sessions where messages are exchanged between users and AI bots, enabling rich dialogue experiences with context awareness, memory, and intelligent responses. Conversations are the foundation of interactive AI experiences in ChatBotKit. Each conversation maintains its own context, history, and state.

- Supports both stateless and stateful conversation patterns.
- Streaming responses via Server-Sent Events (SSE).
- Runtime extensions to dynamically augment conversations with additional backstory, skillsets, or features without modifying the bot.
- Function calling support during response generation.

### Datasets

A dataset is a structured collection of data that can be used to provide additional context and information to your AI bot. It is a way for bots to access relevant data and use it to generate responses based on user input. A dataset can include information on a variety of topics.

- Import data from web pages, documents (PDF, DOCX), and Notion.
- There is only one dataset allowed per conversation.
- Supports record autocomplete using AI models.

### Skillsets and Abilities

Skillsets are collections of abilities that define what actions your AI agents can perform, from fetching web data to sending emails and generating content. Abilities are the individual actions that skillsets can perform, defined through natural language instructions and executable code blocks.

- Abilities can reference secrets for secure API authentication.
- Built-in templates for common actions like web fetching.

### Memory System

Memories are persistent data storage units that enable applications to store and retrieve information associated with bots and contacts, providing context and historical data for intelligent interactions. Memories serve as the foundational data layer for maintaining context and storing information across conversations. They enable bots and applications to recall previous information, maintain user preferences, and provide personalized experiences.

- Searching memories enables you to find relevant information using semantic similarity matching, going beyond simple keyword searches to understand the meaning and context of your query.

### Contacts

Contacts represent end-users or customers who interact with your chatbots, enabling conversation tracking, contact management, and personalized user experiences.

- Create automated actions for your contacts that your AI agents can perform on schedule or on-demand.
- Contacts can have associated secrets for per-user external service authentication (OAuth or API keys).

### Files

ChatBotKit Files is a core feature that provides centralized file management, integration with datasets, and asset storage for widgets.

### Spaces

Spaces are collaborative environments that enable teams to organize and manage conversations, contacts, and shared resources in isolated workspaces.

- File management within spaces with upload, download, and path-based organization.
- Accessible via API and through the Portals app.

### Integrations (Deployment Channels)

ChatBotKit offers a range of integrations including Widget, Slack, Discord, WhatsApp, Sitemap, Notion, Support, Extract, and Zapier. Additional integrations include Twilio for SMS, Google Chat, and Microsoft Teams via the Azure Bot Framework.

- **Trigger Integration**: Allows applications to send events and information to bots through a dedicated API endpoint, with the bot processing events in the background and executing appropriate actions. Useful for webhook-based and scheduled workflows.
- **Extract Integration**: Enables automated data extraction from conversations using custom JSON schemas, allowing you to capture structured information from user interactions. Supports webhook delivery of extracted data.

### Blueprints

Blueprints are organizational containers that group related resources like bots, datasets, skillsets, and integrations into reusable templates, enabling efficient management and sharing of complex conversational AI configurations.

### Partner API (Multi-Tenancy)

The Partner API is a tool for developing SaaS solutions. It simplifies SaaS development by providing unique sub-accounts with customizable configurations and restrictions.

- Create and manage sub-accounts with resource limits and custom branding.
- Impersonate sub-accounts via the `X-RunAs-User-ID` header.

### Content Moderation and Privacy

Advanced content moderation features ensure the safety and integrity of bot-user interactions. Content scanning, language detection, and automatic refusal protect against harmful and inappropriate content.

- Privacy features include encryption, anonymity, and entity handling.

### Feedback and Ratings

Conversation feedback allows users to provide ratings and evaluations of AI responses through upvotes and downvotes, helping improve bot performance and gather user sentiment data.

### Secrets Management

Secrets provides a secure environment for storing sensitive information such as tokens, keys, and credentials used across the ChatBotKit services. As a safeguard against exposure to external threats and to preserve data privacy, Secrets ensures that sensitive details remain protected within a secure vault.

### Audit Logs

Audit logs provide comprehensive tracking of all actions and changes made within your ChatBotKit account, enabling security monitoring, compliance auditing, and activity analysis across all resources and operations.

## Events

ChatBotKit supports webhooks, allowing customers to receive real-time notifications about events and automate workflows.

Webhooks are configured through the ChatBotKit dashboard or API. You select the events that you want to observe with your webhook. To ensure that incoming webhook requests are authentic, ChatBotKit uses a header called `X-Hub-Signature`. This header contains a hash of the request body using a secret key that you specify during webhook setup.

The platform automatically captures various types of events that can be subscribed to:

### Bot Activities

Track bot creation, updates, and operational events.

### Conversation Events

Monitor message flows and user interactions. This includes events such as when a user interacts with the bot.

### Integration Operations

Observe third-party service connections and data synchronization.
