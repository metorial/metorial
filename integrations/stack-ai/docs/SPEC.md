# Slates Specification for Stack Ai

## Overview

Stack AI is an enterprise platform for building and deploying AI agents and workflows using a no-code drag-and-drop interface. StackAI is an enterprise platform for building and deploying AI agents, with a strong focus on governance and security. It provides a visual workflow builder, knowledge base management (RAG), integrations with enterprise systems (SharePoint, Salesforce, Slack, etc.), and multiple deployment options including API, chatbot, and third-party messaging channels.

## Authentication

Stack AI uses **Bearer token authentication** for its API. There are two contexts for authentication:

### API Key (Public Key) — For running deployed flows

Before making API calls, you'll need to obtain your API Keys. Navigate to Settings → API Keys to generate your credentials. Once you have your credentials (a public API Key) and understand the required parameters, you can do your first call.

The API key is passed as a Bearer token in the `Authorization` header:

```
Authorization: Bearer YOUR_PUBLIC_KEY
```

When running a deployed flow, you also need:

- **org_id**: Your organization ID (part of the URL path)
- **flow_id**: The flow/project ID (part of the URL path)
- **user_id**: Your user ID, optionally combined with a conversation handle (`user_id-conversation_id`)

The flow execution endpoint is: `POST https://api.stack-ai.com/inference/v0/run/{org_id}/{flow_id}`

### OAuth2 Bearer Token — For management API

The management API uses OAuth2PasswordBearer authentication with a Token URL: token. All management endpoints (documents, connections, tools, analytics, etc.) use this pattern:

```
Authorization: Bearer YOUR_OAUTH2_TOKEN
```

## Features

### Flow Execution

Run published AI workflows programmatically by sending inputs and receiving outputs as JSON. Integrate your interface as an API. Once your flow is ready for production, you can deploy it as an API. Supports text inputs, audio (base64), URLs, and file uploads. You can specify a flow version and control verbosity of the response.

### Document Management

Upload, list, download, and delete files in user-specific document buckets associated with a flow and node. Upload data to your Knowledge Base programmatically. Requires org_id, flow_id, node_id, and user_id to scope file operations.

### Knowledge Bases

A knowledge base is a centralized repository of information, documents, or data that can be searched and referenced. StackAI enables users to leverage a powerful and flexible RAG system through a simple drag-and-drop interface. By connecting directly to their knowledge base, users can effortlessly incorporate contextual search capabilities. Knowledge bases support configurable search parameters including output format (chunks, pages, docs), query strategy (semantic, keyword, hybrid), and metadata filtering.

### Connections

Manage integrations with external services. Connections can be created via credentials or OAuth flows. Create a new connection from an OAuth callback. This endpoint is used to create a new connection for providers that use the OAuth protocol. The OAuth flow is initialized by the stack frontend, where the user is redirected to the provider's authorization page. Once the user authorizes the application, they are redirected back to the stack frontend with a code parameter. This code is then sent to this endpoint, which uses it to create a new connection. Connections support role-based access control (RBAC) at the organization, user, and group levels. You can check connection health and browse connection resources.

### Tools (Actions)

An Action node allows your workflow to interact with external systems. You can use it to send data to other apps, update databases, trigger web searches, or automate other tasks across services. The API allows listing native tool providers, running actions, retrieving input/output schemas, and managing custom tool providers defined via OpenAPI schemas.

### Conversations and Messages

Manage conversation histories for deployed chat-based flows. Retrieve user conversations and messages associated with a project.

### Analytics

Project analytics. List with the flow run logs matching the given filters. Query run logs with filters for date range. Retrieve per-project summaries including total runs, errors, tokens, and users. Also provides storage usage analytics across knowledge bases.

### Folders

Organize projects into folders within the platform.

### Notifications

Manage platform notifications.

### Manager

Access conversation management features for projects, including listing user conversations with filtering and pagination.

## Events

Stack AI supports event-driven workflow triggers through its **Trigger Node** system. A Trigger Node will start your workflow when a certain event occurs, such as an email being received in your Gmail account, or a pull request created on Github.

The API exposes a **Triggers** section that allows managing trigger configurations for workflows. Triggers are associated with tool providers and include input/output parameter schemas.

### Email Triggers

Trigger outputs include Sender (string), Thread ID (string), and Attachments (files). Workflows can be activated when emails are received, with access to sender, subject, body, thread ID, and attachments.

### Form Submission Triggers

The Typeform Form Submission Trigger node monitors your Typeform forms and activates your workflow automatically whenever a new form response is submitted. Captures form data in real-time.

### Third-Party Service Triggers

Triggers are available for various integrated providers (e.g., GitHub pull requests, Slack events). The specific triggers available depend on the connected provider and are discoverable via the tools API, which lists available triggers per provider with their input/output parameters.
