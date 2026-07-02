Now let me get more details on the API features like assistants, predictions, variables, vector upsert, leads, and feedback:Now I have enough information to write the specification.

# Slates Specification for Flowiseai

## Overview

Flowise is an open-source generative AI development platform for building AI agents and LLM workflows visually using a drag-and-drop interface. It is built on LangChain and provides three main visual builders: Assistants, Chatflows, and Agentflows. It exposes a REST API to programmatically manage and interact with all of these resources.

## Authentication

Flowise supports two layers of authentication:

### 1. Application-Level Authentication (JWT-based)

From v3.0.1 onwards, Flowise uses a Passport.js-based authentication system with JWT tokens stored in secure HTTP-only cookies. Users log in with email and password, and the system issues a short-lived access token and a long-lived refresh token. This is primarily used for accessing the Flowise dashboard UI and management APIs.

For API access, the Bearer token obtained from this authentication is sent via the `Authorization` header:

```
Authorization: Bearer YOUR_SECRET_TOKEN
```

Legacy instances may use simpler username/password authentication configured via `FLOWISE_USERNAME` and `FLOWISE_PASSWORD` environment variables.

### 2. Chatflow-Level API Keys

Individual chatflows can be protected with API keys. Keys are created and managed in the Flowise dashboard under the **API Keys** section (a `DefaultKey` is created automatically). When a chatflow has an API key assigned, clients must include it as a Bearer token in the `Authorization` header to call the prediction endpoint for that flow:

```
Authorization: Bearer <API_KEY>
```

**Important notes:**

- Management endpoints (chatflows, assistants, tools, document stores, etc.) require the application-level Bearer token.
- Prediction endpoints may be open or require a chatflow-level API key, depending on the flow's configuration.
- The base URL depends on where the Flowise instance is hosted (self-hosted or Flowise Cloud).

## Features

### Predictions (Chat Interaction)

Send messages to any deployed chatflow, assistant, or agentflow and receive AI-generated responses. This is the primary runtime endpoint for interacting with flows.

- Supports streaming responses for real-time output.
- Accepts file uploads (images, audio, documents) alongside messages.
- Allows passing conversation history for context continuity.
- Supports `overrideConfig` to dynamically adjust parameters like `sessionId`, `temperature`, `maxTokens`, and runtime variables.
- Supports human-in-the-loop feedback to approve/reject and resume paused agent checkpoints.
- Supports form-based input as an alternative to free-text questions (for Agentflow V2).

### Chatflow Management

Create, retrieve, update, and delete chatflows programmatically. Chatflows define the visual workflow (nodes and connections) that power AI interactions.

- Each chatflow has properties like name, flow data, deployment status, public visibility, API key assignment, chatbot configuration, and analytics settings.
- Chatflows can be filtered by type: `CHATFLOW`, `ASSISTANT`, or `AGENTFLOW`.

### Assistant Management

Create, retrieve, update, and delete AI assistants. Assistants are a beginner-friendly way to create agents that follow instructions, use tools, and retrieve from knowledge bases.

- Configurable model, instructions, temperature, and tool assignments (function calling, code interpreter, file search).
- Linked to credentials for LLM provider access.

### Document Store Management

Manage document stores used for retrieval-augmented generation (RAG). Document stores hold ingested and chunked documents for vector search.

- Retrieve document store details and contents.
- Upsert documents into a store with configurable loader, text splitter, embedding model, vector store, and record manager.
- Refresh existing document stores to re-process documents.
- Delete vector store data associated with a document store.

### Vector Upsert

Upsert data directly into vector stores associated with chatflows, enabling dynamic knowledge base updates outside the document store workflow.

### Chat Message Management

Retrieve and manage chat messages (conversation history) stored by Flowise. Useful for auditing, exporting, or displaying past conversations.

### Feedback Collection

Create and retrieve user feedback on AI responses. Allows capturing thumbs-up/thumbs-down ratings and comments tied to specific chat messages.

### Lead Capture

Create and retrieve lead information collected during chatbot interactions. Useful when chatbots are configured to gather contact details from users.

### Tools Management

Create, retrieve, update, and delete custom tools that can be assigned to agents and chatflows. Tools define external capabilities (API calls, calculations, etc.) that agents can invoke.

### Variables Management

Create, retrieve, update, and delete runtime variables. Variables can be passed into flows at execution time via `overrideConfig` and used throughout the workflow.

### Attachments

Upload file attachments for use with assistants that support file-based tools like code interpreter or file search.

### Upsert History

Retrieve the history of vector upsert operations to track when and what data was ingested into vector stores.

### Health Check

A simple ping endpoint to verify the Flowise instance is running and accessible.

## Events

The provider does not support events. Flowise does not offer native webhooks or event subscription mechanisms to notify external systems of changes. External orchestration tools (e.g., Zapier, n8n, Pipedream) can be used to trigger Flowise flows via its REST API, but Flowise itself does not push events outward.
