# Slates Specification for Weaviate

## Overview

Weaviate is an open-source AI vector database designed to store and index both data objects and their vector embeddings, enabling advanced semantic search capabilities by comparing meaning encoded in vectors rather than relying solely on keyword matching. It exposes REST API, gRPC API, and GraphQL API to communicate with the database server.

## Authentication

Weaviate supports three authentication methods:

### 1. API Key Authentication

API key authentication is the simplest form of authentication and is commonly used with Weaviate Cloud Services. The format is: `Authorization: Bearer WEAVIATE_API_KEY`, where you replace `WEAVIATE_API_KEY` with the API key for your Weaviate instance.

When connecting to a Weaviate Cloud cluster, you need an API key and the REST endpoint URL for authentication. If you don't have an existing API key, you'll need to create one. You can choose the role for the API key, selecting an existing role like admin or viewer, or creating a new role with specific permissions.

Required credentials:

- **API Key**: Obtained from the Weaviate Cloud console or configured on a self-hosted instance.
- **Instance URL**: The REST endpoint URL of the Weaviate cluster.

### 2. OpenID Connect (OIDC) Authentication

OIDC authentication requires Weaviate to validate tokens issued by an identity provider. The identity provider authenticates the user and issues tokens, which are then validated by Weaviate. Any OpenID Connect-compatible token issuer that implements OpenID Connect Discovery is compatible with Weaviate.

Supported OIDC flows:

- **Client Credentials Flow**: For machine-to-machine authorization (authorizes an app, not a user). Validated with Okta and Azure as identity providers.
- **Resource Owner Password Flow**: Uses username and password to obtain tokens.
- **Bearer Token**: Allows using a pre-existing access token. If a refresh token is provided, the client will automatically refresh the access token when it expires. If no refresh token is provided, authentication will expire once the access token expires.

### 3. Anonymous Access

Anonymous access can be enabled on self-hosted instances. For Weaviate Cloud instances, authorization is pre-configured with Admin list access, and you can authenticate with WCD credentials using OIDC, or with admin or read-only API keys.

## Features

### Collection Management

Each Weaviate instance consists of multiple collections, each of which is a set of objects that share a common structure. For example, you might have a movie database with Movie and Actor collections, or a news database with Article, Author and Publication collections. Each collection is isolated from the others.

- Create, read, update, and delete collections.
- Each collection can be configured with a vectorizer and a generative module. The vectorizer generates vectors for each object and for un-vectorized queries, and the generative module performs retrieval augmented generation (RAG) queries.
- Collections can have multiple named vectors, each with its own index, compression algorithm, and vectorizer, enabling different vectorization models and distance metrics on the same object.
- You cannot change the vectorizer or generative module after collection creation.

### Object Management (CRUD)

Store, retrieve, update, and delete data objects within collections. Each object contains data properties and includes vector embeddings representing its meaning.

- Import objects individually or in batches, with or without pre-computed vectors.
- Seamlessly vectorize data at import time with integrated vectorizers from OpenAI, Cohere, HuggingFace, Google, and more, or import your own vector embeddings.
- Cross-references can link objects across collections.
- Object Time-to-Live (TTL) enables automatic deletion of objects after a specified time period for lifecycle management.

### Search and Querying

Weaviate supports multiple search paradigms:

- **Vector (Semantic) Search**: Find objects based on vector similarity using raw vectors (`nearVector`), object references (`nearObject`), or text queries (`nearText`).
- **Hybrid Search**: Combine semantic search with traditional keyword (BM25) search and advanced filtering in a single query.
- **Keyword Search**: BM25-based full-text search.
- If the appropriate vectorizer module is enabled, a text query, an image, or another media input may be used as the query.
- Results can be filtered using scalar conditions (e.g., date ranges, property values).

### Retrieval Augmented Generation (RAG)

RAG works by prompting a large language model (LLM) with a combination of a user query and data retrieved from the database. Configure generative models (e.g., OpenAI, Cohere, Anthropic) at the collection level to perform generative search over retrieved objects.

### Aggregations

Perform aggregations over collections to compute metrics like counts, sums, averages, and other statistical measures across object properties.

### Multi-Tenancy

Multi-tenancy provides data isolation. Each tenant is stored on a separate shard. Data stored in one tenant is not visible to another tenant. If your application serves many different users, multi-tenancy keeps their data private and makes database operations more efficient.

- Tenants have an activity status that reflects their availability and storage location. A tenant can be ACTIVE, INACTIVE, OFFLOADED, OFFLOADING, or ONLOADING.
- Tenants can be managed independently, and their data can be offloaded to cold storage to reduce memory and disk usage.

### Backups

You can start a backup on any running instance with a single request. You can choose to include or exclude specific collections in the backup. If you do not specify any collections, all collections are included by default.

- Besides disaster recovery, backups can be used for duplicating environments or migrating between clusters.
- Supports backup to S3, GCS, Azure Blob Storage, and the local filesystem.
- Backups will only include active tenants. Inactive or offloaded tenants in multi-tenant collections will not be included.

### Model Integrations

Integrate Weaviate with various model providers like OpenAI, Hugging Face, Cohere, and others for:

- **Vectorizers**: Automatic embedding generation at import and query time.
- **Generative models**: For RAG capabilities.
- **Reranker models**: Refine search relevance by re-ordering the initial results from a search query.

### User and Role Management

RBAC allows you to define roles and assign permissions to those roles. Users can then be assigned to roles, and inherit the permissions associated with those roles.

### Cluster Status and Health

Check cluster liveness and readiness, inspect node statuses, and view instance metadata.

## Events

The provider does not support events. Weaviate does not offer webhooks, event subscriptions, or a purpose-built polling mechanism for change detection.
