# Slates Specification for Customgpt

## Overview

CustomGPT.ai is a Retrieval-Augmented Generation (RAG) platform that allows businesses to create custom AI chatbot agents from their own content. It ingests data from various sources, such as websites, documents, and multimedia, to create a custom chatbot powered by advanced LLMs. The API can process various data formats including HTML, PDF, Word Documents, audio files, and video files, supporting 1400+ formats.

## Authentication

Authentication to the API is performed via HTTP Basic Auth. To authenticate with CustomGPT API endpoints, you must provide the API Key in the header.

The API key is passed as a Bearer token in the `Authorization` header:

```
Authorization: Bearer Your_API_KEY
```

**Obtaining an API Key:**

To use the CustomGPT website and API, you'll need to sign up for an account. From the app, click on the Developers tab at the bottom of the left sidebar of the project dashboard. Select the API tab and press the Create API Key button to generate a new API key. Make sure to take note of this key when it is created, as you will not get a chance to see it again without deleting it and creating a new key.

**Base URL:** `https://app.customgpt.ai/api/v1/`

No OAuth or other authentication methods are supported. API key (Bearer token) is the only authentication method.

## Features

### Agent (Project) Management

Create, list, update, delete, and clone AI agents. In the API, "projects" in endpoints, request bodies, query parameters, or responses corresponds to "agents" in the current system. Each agent is built around a specific knowledge base and can be configured with its own persona, settings, and data sources. Agent statistics can also be retrieved.

### Data Source Management

Add and manage the content sources that power an agent's knowledge base. Sources include websites, helpdesks, webpages, documents, videos, podcasts, audio, and more. The API supports thousands of file formats for data upload, and can ingest entire websites and web data via sitemaps. Sources can be synced on demand and individual documents (pages) can be deleted or reindexed. Auto-sync keeps your application in sync with source data.

### Document (Page) Management

List, delete, and reindex individual documents within an agent. Documents can be labeled for organizational purposes, and document metadata can be retrieved and updated. Citation sources can be previewed.

### Conversations and Messaging

A conversation object represents a forum for communication between a user and the Agent. Conversations can be created every time a new message is sent, or messages can be sent to an existing conversation via the sessionID. Conversations can be listed, updated, deleted, and exported. The API also supports an OpenAI-compatible chat completions endpoint for sending messages.

### Message Analysis

Individual messages can be inspected for detailed information including:

- **Feedback**: Submit feedback (e.g., thumbs up/down) on message responses.
- **Claims**: Retrieve claims made within a response.
- **Trust Score**: Get a trust/accuracy score for a response.
- **Verification**: Verify the accuracy of a message response.

### Citations

Every response includes citations linking back to source material. Citation metadata can be retrieved per agent, providing traceability to the original data source.

### Agent Settings and Personas

Persona allows you to customize your chatbot's behavior by adjusting its personality, role and the rules and instructions it follows. Agent settings can be retrieved and updated via the API. Persona versions are tracked, and previous versions can be listed, retrieved, and restored.

### Labels and Access Control

Create and manage labels to organize documents and control user access. Labels can be assigned to documents and users, enabling content-based access restrictions within an agent.

### Agent Licenses

Create, list, update, and delete licenses for agents, providing a mechanism to control and distribute access to specific agents.

### Reports and Analytics

Access analytics and intelligence data for agents, including:

- **Customer Intelligence**: Insights into user behavior and needs.
- **Traffic Analytics**: Usage and traffic data.
- **Query Analytics**: Information about what users are asking.
- **Conversation Analytics**: Conversation-level metrics.
- **Chart Data**: Aggregated analytics for visualization.
- **Leads Export**: Export collected lead information.

### User Management

Retrieve and update the current user's profile. Search for team members by email or user ID.

### Account Limits

Retrieve current account usage and limits information.

## Events

In CustomGPT, webhooks can be set up either through in-chat Custom Actions that fire when a user asks for something, or through automation triggers that fire when an event occurs, such as a new conversation.

In-chat actions run only when a user explicitly requests an action during the conversation. Automation triggers fire automatically when predefined events occur, such as conversation creation or completion. CustomGPT supports both so teams can choose between user-driven control and event-driven automation.

However, these webhook/event capabilities are primarily surfaced through third-party automation platforms (e.g., Zapier, Make.com) rather than a dedicated first-party webhook registration API. Automation triggers use CustomGPT as the trigger (e.g., "New Conversation") and tools like Webhooks by Zapier as the action to POST into your tool or middleware.

The CustomGPT API itself lists "Webhook support for events" as a capability, but does not currently expose dedicated webhook management endpoints in its API reference. Event-driven integrations should be configured through supported automation platforms.
