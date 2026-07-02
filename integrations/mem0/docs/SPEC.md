Now let me get the specific webhook event types:Now let me check the memory export and organization features:I now have enough information to write the specification.

# Slates Specification for Mem0

## Overview

Mem0 is a memory layer for AI applications that enables persistent storage, retrieval, and management of contextual memories across users, agents, and sessions. It provides a REST API for integrating memory capabilities, allowing creation, search, update, and management of memories across users, agents, and custom entities. Mem0 is available as both a managed cloud platform and a self-hosted open-source solution.

## Authentication

All API requests require Token-based authentication. All requests must include an Authorization header with the format `Token <api-key>`.

Get your API key from the Mem0 Dashboard at app.mem0.ai and include it in the Authorization header.

Example header:

```
Authorization: Token m0-your_api_key_here
```

The authentication process validates the API key and returns user context including `org_id`, `project_id`, and `user_email`.

When working with multi-tenant setups, you can also specify `org_id` and `project_id` when initializing the client to scope operations to a specific organization and project.

No OAuth or other authentication methods are supported — only API key-based token authentication.

## Features

### Memory Management

The core API provides CRUD operations for memory storage and retrieval. You can add memories from conversations (in OpenAI chat message format), retrieve them by ID, update existing memories, and delete them individually or in bulk.

- Memories can be scoped to a `user_id`, `agent_id`, `app_id`, or `run_id` to isolate context per entity or session.
- The add operation supports two modes: an inference mode (default) that uses an LLM to extract facts and decide what to store, and a direct mode that stores messages as-is without extraction.
- Procedural memories (how-to/step-by-step knowledge) can be stored by setting `memory_type="procedural_memory"`, but only when an `agent_id` is provided.
- Memories are timestamped and versioned, and their full change history can be retrieved.

### Semantic Memory Search

Memories can be searched using natural language queries with semantic similarity matching.

- Supports advanced filtering with AND, OR, IN, gte, lte, gt, lt, ne, and icontains operators.
- Criteria-based retrieval allows defining custom weighted criteria (e.g., sentiment, emotion) at the project level; supported only in search v2.
- If a reranker is configured, search results are reranked for relevance.

### Graph Memory

Graph Memory extends Mem0 by persisting nodes and edges alongside embeddings, extracting entities and relationships from every memory write and storing them in a graph backend.

- Enables relationship traversal, entity disambiguation, multi-hop reasoning, and temporal tracking of changing relationships.
- Can be toggled on or off per request via an `enable_graph` flag.
- Supports isolation through `user_id`, `agent_id`, and `run_id` filters for multi-tenant deployments.

### Custom Instructions and Categories

Custom instructions are natural language guidelines that define what Mem0 should include or exclude when creating memories, giving precise control over information extraction.

- Configured at the project level.
- Custom categories can be defined to organize memories; by default, Mem0 uses generic categories like food, travel, and hobbies.

### Multimodal Memory

Mem0 supports storing and retrieving memories that include various content types beyond text, including images, PDFs, and markdown files.

### Entity Management

The Entities API manages users, agents, apps, and runs (sessions) within the platform. Supported entity types are: user, agent, app, and run.

- You can list all users/entities and delete entities and their associated memories.

### Memory Export

The Exports API enables structured data export with custom schemas for analytics and data processing.

### Organizations and Projects

The platform offers organizations, projects, and team management features for multi-tenant isolation and access control.

- Organizations can have multiple projects, each with their own memory space and configuration.
- Members can be added to organizations and projects.

### Feedback

The API supports submitting feedback on memory operations, enabling the memory system to improve over time.

## Events

Mem0 supports webhooks for real-time notifications about memory events. Webhooks are configured at the project level, meaning each webhook is tied to a specific project and receives events solely from that project.

### Memory Events

Mem0 supports three webhook event types:

- **`memory_add`**: Triggered when a new memory is created.
- **`memory_update`**: Triggered when an existing memory is modified.
- **`memory_delete`**: Triggered when a memory is removed.

When creating a webhook, you specify a destination URL, a name, the `project_id`, and which `event_types` to subscribe to. When a memory event occurs, Mem0 sends an HTTP POST request to the webhook URL with a payload containing the event details, including the memory ID, data, and event type.
