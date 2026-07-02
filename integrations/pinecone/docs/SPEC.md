Now let me check if Pinecone has OAuth support since the API spec references an `oauth_2025-04.oas.yaml` file:Now I have enough information to create the specification. Let me compile everything.

# Slates Specification for Pinecone

## Overview

Pinecone is a fully managed, cloud-native vector database for storing, querying, and managing high-dimensional vector embeddings. It provides long-term memory for high-performance AI applications, with a simple API and no infrastructure hassles, serving fresh, filtered query results with low latency at the scale of billions of vectors. It also offers an Assistant service for RAG-based document Q&A and an Inference API for generating embeddings and reranking results.

## Authentication

Pinecone supports two authentication methods:

### 1. API Key Authentication (Primary)

All requests to Pinecone APIs must contain a valid API key for the target project. API keys are created in the Pinecone console.

- The API key is passed via the `Api-Key` HTTP header on every request.
- Example: `Api-Key: YOUR_API_KEY`
- Client initialization only requires an `api_key` parameter.
- The base URL for control plane operations is `https://api.pinecone.io`. Each index has its own unique host URL for data plane operations.
- API keys support six RBAC roles — three for the control plane (managing indexes, API keys) and three for the data plane (reading and writing records). Roles include `ProjectOwner`, `ProjectEditor`, `ProjectViewer`, `IndexReader`, `IndexWriter`, and `IndexReadWriter`.

### 2. OAuth 2.0 Client Credentials (Admin API)

You can obtain an access token for a service account using the OAuth2 client credentials flow. An access token is needed to authorize requests to the Pinecone Admin API.

- **Token endpoint:** `https://login.pinecone.io/oauth/token`
- **Grant type:** `client_credentials`
- **Required parameters:** `client_id`, `client_secret`, `audience` (set to `https://api.pinecone.io/`)
- The returned Bearer token is used in the `Authorization` header for Admin API calls (e.g., managing API keys, projects, and service accounts).
- Tokens expire after 86400 seconds (24 hours).

## Features

### Index Management

Create, configure, and manage vector indexes. Dense indexes and vectors enable semantic search, while sparse indexes and vectors enable lexical search. Indexes can be serverless (auto-scaling) or pod-based (dedicated resources). Configuration options include dimension, distance metric (cosine, euclidean, dot product), cloud provider (AWS, GCP, Azure), and region.

- You can create an index that is integrated with one of Pinecone's hosted embedding models, allowing automatic vector generation from text.
- Deletion protection can be enabled to prevent accidental deletion.

### Vector Operations

Store, retrieve, update, and delete vector records within indexes. Each record contains a unique ID and an array of floats representing a dense vector embedding. Indexes may also contain a sparse vector embedding for hybrid search and metadata key-value pairs for filtered queries.

- **Upsert:** Insert or update vectors with optional metadata and sparse values.
- **Query:** Search for the most similar vectors by providing a query vector or vector ID, with configurable `top_k` results.
- **Fetch:** Retrieve specific vectors by ID.
- **Update:** Modify metadata or values of existing vectors.
- **Delete:** Remove vectors by ID, by metadata filter, or delete all vectors in a namespace.

### Namespaces

Use namespaces to partition data for faster queries and multitenant isolation between customers. Namespaces exist within an index and allow logical separation of records without needing multiple indexes.

### Metadata Filtering

Filter by metadata to limit the scope of your search, rerank results to increase search accuracy, or add lexical search to capture both semantic understanding and precise keyword matches. Metadata filters support operators like `$eq`, `$ne`, `$gt`, `$lt`, `$in`, and `$nin`.

### Integrated Inference

Use the Inference API to generate vector embeddings and rerank results using embedding models and reranking models hosted on Pinecone's infrastructure.

- Can be used as a standalone service (Rerank and Generate vectors endpoints), or as an integrated part of database operations (upsert text and search with text).
- With integrated embedding, you can upsert and search with raw text without generating vectors yourself.

### Pinecone Assistant

Pinecone Assistant is a service that leverages retrieval-augmented generation (RAG) to enable users to upload documents, ask questions, receive context-aware responses and power agentic workflows.

- **Document management:** Supports PDF, .txt, .md, .docx, and JSON files. Files can have metadata attached for filtering.
- **Chat:** Ask questions and receive grounded answers with inline citations referencing specific documents and pages. Supports streaming and batch modes.
- **Context API:** Retrieves structured context from documents without the generation step, for use with your own LLM.
- **Evaluation API:** Allows submitting a question, an answer, and a ground truth answer for evaluation, returning metrics like correctness, completeness, and alignment.
- **LLM selection:** Supports GPT-4o and Claude 3.5 Sonnet, selectable at query time.
- **Region control:** Assistants can be deployed in the US or EU.

### Backups and Collections

Creating a backup or collection is useful for protecting an index from failures, temporarily shutting down an index, copying data between indexes, making backups, and experimenting with different configurations.

- Backups are for serverless indexes; collections are for pod-based indexes.
- You can restore an index from a backup or collection with the same or different configuration.
- There is a quota of 50 serverless backups per project.

### Bulk Import

Import large datasets from cloud object storage (e.g., Amazon S3) directly into a Pinecone index, rather than upserting records individually via the API.

### Admin API

Manage organizational resources programmatically, including projects, API keys, and service accounts. Requires OAuth 2.0 authentication via service accounts. The Admin API is in public preview.

## Events

The provider does not support events. Pinecone does not offer webhooks or purpose-built event subscription mechanisms through its API.
