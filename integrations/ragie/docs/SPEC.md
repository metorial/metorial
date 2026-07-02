# Slates Specification for Ragie

## Overview

Ragie is a fully managed RAG-as-a-Service (Retrieval Augmented Generation) platform that provides APIs for document ingestion, processing, and semantic retrieval. It handles multimodal content including text, PDFs, images, audio, video, and tables, and provides out-of-box connectors to simplify ingesting documents from commonly used services like Google Drive, Notion, Confluence, and more.

## Authentication

Ragie uses Bearer Authentication for authenticating requests. The API uses API_KEY auth mode with `Authorization: Bearer '{API_KEY}'` in the request header to access different endpoints.

To obtain an API key:

1. Create an account or log in to Ragie.
2. Navigate to the API Keys section in the Ragie dashboard at `https://secure.ragie.ai/api-keys`.

The base API URL is `https://api.ragie.ai`.

Example request header:

```
Authorization: Bearer YOUR_RAGIE_API_KEY
```

There is no OAuth flow for API access itself. However, Ragie Connect (for creating data source connections on behalf of end users) uses an OAuth redirect flow where you request a redirect URL from Ragie's API and guide your user through the third-party authentication.

## Features

### Document Ingestion

Upload and manage documents for indexing and retrieval. Ragie can handle many different types of structured and unstructured files. Documents can be created by uploading files, ingesting from a publicly accessible URL, or ingesting raw text/JSON.

- Metadata can be attached to documents to support flexible filtering at retrieval and generation time.
- The file associated with a document may be updated, replacing the previous version in future retrieval results.
- Metadata may be updated without re-processing the document's file.
- When import mode is set to `hi_res`, images and tables are extracted. The `fast` mode only extracts text and can be up to 20 times faster.
- Documents go through processing states (pending → ready) and can be queried for status.

### Retrieval

Once documents are added, you can semantically search them using the retrievals endpoint. A natural language query that can optionally include a metadata filter returns a list of chunks suitable to provide as context to an LLM.

- **Reranking**: Filters results to determine if they are actually relevant for the query rather than just being semantically similar.
- **top_k**: Determines how many chunks to return. When rerank is on, this is a ceiling.
- **max_chunks_per_document**: Ensures no more than N chunks are returned from a single document, useful when diversity of documents in results is desired.
- **Metadata filters**: A metadata filter acts as a pre-filter on the retrieval.

### Summary Index

In a regular RAG system, it's possible that the top_k chunks come from a single document. For use cases where retrieved chunks should span multiple documents, the Summary Index feature can be used. In addition to the document chunk index, Ragie creates a second document summary index. This works in conjunction with `max_chunks_per_document` to diversify retrieval results across documents.

### Entity Extraction

RAG falls short for tasks like "extract all emails" or "extract all contacts" which require extracting precise semi-structured information from unstructured data. The entity extraction feature enables you to create an instruction — a natural language prompt that guides Ragie on what action to take on a document. Once created, it is automatically applied to every created or updated document.

- Instructions include a natural language prompt, an optional JSON schema for structured output, a scope (chunk-level or document-level), and an optional metadata filter.
- Entity extraction is supported on all document types including images.
- Extracted entities can be retrieved per document or per instruction.

### Data Source Connections (Ragie Connect)

Ragie provides connectors for commonly used services like Google Drive, Notion, Confluence, and more. A connection will synchronize changes made in the connected service to Ragie automatically.

- Built-in connectors include Confluence, Google Drive, Notion, Salesforce, OneDrive, and others.
- Connectors can be embedded directly in your application with Ragie Connect, letting your users securely connect their own data.
- Connections support configurable partition strategies and metadata.
- Connections can be enabled/disabled, updated, and deleted. Statistics on document counts are available per connection.

### Partitions

Documents may be logically separated into partitions. Retrievals can provide an optional partition parameter to scope retrieval. Partitions can be used for segregating user data in multi-tenant SaaS applications or defining distinct knowledge bases.

- Multi-tenant applications can use a USER_ID or ORG_ID as their partition key. Isolating data is as simple as providing the desired partition key when managing documents and doing retrievals.
- Partitions improve the quality of keyword search by separating keyword indexes by domain.
- Partitions may be deleted, which irreversibly deletes all associated data including documents, connections, instructions, and entities.

### Document Content Access

You can get the content of a document. The media_type parameter can be used to request the content in a different format. When requesting as application/json, additional metadata is included. Using mime types such as audio/mpeg or video/mp4 will stream the file in a playable format.

## Events

Ragie supports webhooks for event-driven notifications. Ragie can call HTTP endpoints hosted on your servers as events occur. You can configure one or more endpoints that will be called.

### Document Status Events

This event is dispatched when a document enters indexed, keyword_indexed, ready, or failed state. When a document enters indexed it is retrievable via semantic search. When it enters keyword_indexed, hybrid search is enabled. When it enters ready, all retrieval features are functional.

### Document Deletion Events

This event is dispatched when a document is deleted.

### Connection Sync Events

Ragie can notify your application of connection events through webhooks, such as: connection_sync_started, connection_sync_progress, and connection_sync_finished. Payloads include details like connection ID, sync progress, and document counts.

- If a Ragie Connect connection has a page limit defined and that limit is exceeded, a `connection_limit_exceeded` event will be dispatched.

### Webhook Configuration

- All events include a nonce that can be used to enforce idempotency and protect against replay attacks.
- Webhook endpoints may be configured to only receive calls related to specific partitions, which is helpful when multiple apps interact with Ragie or when handling multiple environments.
