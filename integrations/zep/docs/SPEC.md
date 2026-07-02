Now let me get more details on the Graph API and search features.Now I have enough information to write the specification.

# Slates Specification for Zep

## Overview

Zep is a context engineering platform that provides persistent memory and knowledge graph capabilities for AI agents. It assembles comprehensive, relationship-aware context from multiple data sources—chat history, business data, documents, and app events—enabling AI agents to perform accurately in production. Its core component is Graphiti, a temporally-aware knowledge graph engine that dynamically synthesizes both unstructured conversational data and structured business data while maintaining historical relationships.

## Authentication

Zep uses API key authentication. In Zep Cloud, you generate a Project API Key from the Project Settings in the Zep Dashboard by selecting "Add Key" in the Project Keys section.

The API key is sent via the `Authorization` header. For Zep Cloud, keys start with `z_` and are sent as `Authorization: Api-Key {api_key}`. For self-hosted instances, keys are sent as `Authorization: Bearer {api_key}`.

- **Zep Cloud**: The API URL is `https://api.getzep.com`. Cloud API keys start with `z_`, and no custom URL is required.
- **Self-hosted / BYOC**: Keys that do not start with `z_` require specifying the URL of your Zep instance.

SDKs are available for Python, TypeScript, and Go.

## Features

### User Management

Users can be created in Zep to represent application users, with at least a first name and ideally a last name and email for proper identification. It is recommended to set the Zep user ID equal to your internal user ID. Users can be updated after creation if information is not available initially.

### Thread (Session) Management

Threads represent conversations between a user and your agent. Chat messages are added to threads, which are stored in thread history and used to build the user's knowledge graph. Messages include role type (AI, human, tool), content, optional speaker name, and timestamps.

### Knowledge Graph (Graph RAG)

Zep combines agent memory, Graph RAG, and context assembly capabilities to deliver personalized context. It uses a temporal knowledge graph that understands how context evolves over time.

- **Adding data**: Beyond chat messages, business data such as user interactions, transactions, support tickets, emails, and transcripts can be sent to knowledge graphs via the `graph.add` method. Data can be in the form of text or JSON.
- **Temporal awareness**: Zep uses a bi-temporal knowledge graph where each fact tracks changes over time. Edges can be invalidated as new information arrives, creating a graph that evolves with truth.
- **Custom entity types**: Domain-specific graph entities can be defined to improve precision and relevance of agent memory.

### Group Graphs

Group graphs are non-user-specific graphs that can be used for shared context across multiple users. For example, a group graph could store company product information that doesn't need to be duplicated in every user's graph.

### Context Retrieval (Memory)

- **Memory API**: The `memory.get()` method retrieves relevant context from the user's knowledge graph using the latest messages of a given session to determine relevance. It can return memory derived from any session of that user, not just the current one.
- **Context Block**: Zep's default Context Block is an automatically assembled string combining semantic search, full-text search, and breadth-first search, optimized for relevance to the current conversation.
- **Custom context templates**: Custom context templates allow designing your own context block type for retrieval.

### Graph Search

Zep provides hybrid search capabilities that combine semantic similarity with BM25 full-text search across the knowledge graph.

- **Search scopes**: Nodes (entities like people, places, concepts), Edges (relationships and facts between entities), and Episodes (individual messages or data chunks).
- **Reranking**: Supports Reciprocal Rank Fusion (RRF) and Maximal Marginal Relevance (MMR) rerankers, as well as graph-based episode-mentions and node-distance rerankers.
- **Filtering**: Search results can be filtered by specific entity types or edge types, and exclusion filters are also supported.
- **Breadth-first search**: Can optionally be enabled to bias results toward information connected to specific starting points in the graph.

### User Summary Instructions

Custom instructions can be provided for how Zep generates summaries of user data in their knowledge graph, allowing tailoring to emphasize information most relevant to an application.

### Bring Your Own LLM (BYOM)

Zep supports configuring your own LLM provider credentials for the underlying model inference used in graph construction and processing.

## Events

Zep supports webhooks for real-time event notifications. Webhooks allow your application to receive real-time notifications when specific events occur in Zep, such as when an episode finishes processing or a batch ingestion completes. Webhooks are configured per project in the Zep Dashboard and use Svix for delivery and signature verification.

### Graph Events

- **`episode.processed`**: Fired when an episode finishes processing and is added to the graph. Includes graph/user identifier and graph type.
- **`ingest.batch.completed`**: Fired when a batch ingestion operation completes. Includes the list of episode UUIDs from the batch.

### BYOM Events

These events are specific to Bring Your Own LLM (BYOM) configurations. They notify you when requests using your own model credentials encounter rate limits or failures. BYOM events are aggregated over a 60-second window and delivered as a single webhook summarizing all occurrences.

- **`byom.rate_limited`**: Fired when BYOM requests are rejected due to rate limiting from your LLM provider.
- **`byom.request_failed`**: Fired when BYOM requests fail due to credential or provider issues (invalid credentials, expired credentials, provider unavailable, unsupported model).
