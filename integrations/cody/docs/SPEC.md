I see there are two different products called "Cody" — Sourcegraph's Cody (AI coding assistant for IDEs) and Cody AI from meetcody.ai (business AI assistant). The Sourcegraph Cody explicitly states it has no public API. The meetcody.ai Cody has an API. Let me research the meetcody.ai Cody API more thoroughly.Now let me get the details on the remaining endpoints.Now I have enough information to write the specification.

# Slates Specification for Cody

## Overview

Cody (meetcody.ai) is an AI assistant platform that allows businesses to create custom AI bots trained on their own knowledge base. Users can upload documents, organize them in folders, and interact with AI bots through conversations that generate responses based on the uploaded knowledge. The API is available at `https://getcody.ai/api/v1`.

## Authentication

Cody uses API key authentication. API keys can be generated from the API Keys page in the Cody dashboard. The key must be passed as a Bearer token in the `Authorization` header of each request:

```
Authorization: Bearer <API_KEY>
```

API keys are secret and should not be exposed in client-side code. Requests should be proxied through a backend server.

## Features

### Bot Management

Retrieve a list of all AI bots configured in your account. Bots are the AI assistants that have been set up with access to specific knowledge base folders and customized behavior.

### Knowledge Base (Documents & Folders)

Manage the knowledge base that powers your AI bots. Documents can be created in three ways:

- **From text/HTML content**: Directly provide text or HTML (up to 768 KB). Structured HTML with headings and paragraphs yields the best results.
- **From file upload**: Upload files (e.g., PDFs) via a two-step process — first obtain a signed S3 upload URL, then upload the file and reference the returned key.
- **From webpage URL**: Provide a publicly accessible URL and Cody will crawl and ingest its content.

Documents are organized into folders. Folders can be created, listed, retrieved, and updated. Documents have a sync status (`syncing`, `synced`, or `sync_failed`) indicating whether they have been processed into the knowledge base.

### Conversations

Create and manage conversations with AI bots. A conversation is tied to a specific bot and maintains message history. Conversations can be created, listed, retrieved, updated, and deleted.

- **Focus Mode**: When creating or updating a conversation, you can specify a list of document IDs (up to 1,000) to restrict the bot's knowledge to only those documents, rather than its entire knowledge base. Useful for tasks like summarization, review, or rephrasing of specific content.

### Messaging

Send messages within a conversation and receive AI-generated responses based on the bot's knowledge base.

- Message content can be up to 2,000 characters.
- **Standard messaging**: Send a message and receive the full AI response in a single response.
- **Streaming**: Send a message and receive the AI response as a Server-Sent Events (SSE) stream, enabling real-time progressive rendering. The stream can be received via redirect or as a URL in the response body.
- Message history for a conversation can be listed and individual messages can be retrieved.
- A subscription plan's 30-day message limit applies; requests return an error when the limit is reached.

## Events

The provider does not support events.
