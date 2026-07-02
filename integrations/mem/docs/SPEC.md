Now let me get more details on the specific API endpoints.Now let me check if Mem supports webhooks or events.Now I have enough information to write the specification. Note that the webhook results are for Mem0 (a different product), not Mem.ai. The Mem.ai API does not appear to support webhooks.

# Slates Specification for Mem

## Overview

Mem is an AI-powered note-taking and personal knowledge management application. It provides a REST API (v2) for programmatically creating, reading, searching, and organizing notes and collections, as well as an AI-powered "Mem It" feature for processing and saving raw content.

## Authentication

The Mem API uses API keys for authentication. To obtain a key, visit the API section in your Mem settings.

To generate an API key:

1. Log in to your Mem account, in the left sidebar, click on Flows, click on the API option, then the "+ Create API Key" button.
2. Enter a label for the API key and click "Create API Key".
3. Copy the API key value and store it securely — you will not be able to view it again.

API keys are provided via HTTP Bearer authentication in the `Authorization` header:

```
Authorization: Bearer <YOUR_MEM_API_KEY>
```

The base URL for all API requests is `https://api.mem.ai/v2`.

## Features

### Note Management

Create, read, list, and delete notes in your Mem knowledge base. Notes accept markdown-formatted content (up to ~200k characters), where the first line is automatically interpreted as the title. When creating a note, you can optionally:

- Assign it to one or more collections by ID or by title (case-insensitive exact match).
- Provide a custom UUID for the note.
- Set custom `created_at` and `updated_at` timestamps.

Mem automatically processes note content — for example, it may extract action items and key points from meeting notes.

### Note Search

Search across your notes using a text query. Results can be filtered by:

- Collection IDs — only return notes belonging to specific collections.
- Whether notes contain open tasks, any tasks, images, or file attachments.

Search results include a snippet and relevance-ranked results.

### Collection Management

Collections are used to organize notes into groups. You can create, read, list, search, and delete collections. When creating a collection, you can provide:

- A title (required, up to ~1k characters) and an optional description (up to ~10k characters).
- A custom UUID, and custom `created_at`/`updated_at` timestamps.

Collections can also be searched by text query.

### Mem It (AI Content Processing)

An AI-powered feature that accepts any raw content — web pages, emails, transcripts, articles, or simple text (up to ~1M characters) — and intelligently processes it into your knowledge base. You can provide:

- **Instructions**: guidance on how the information should be processed (e.g., "Extract the key findings and save as a research note").
- **Context**: background information to help Mem understand how the input relates to existing knowledge (e.g., "This is related to my Project Alpha research").
- **Timestamp**: when the information was originally encountered.

This is an asynchronous operation that returns a request ID.

### MCP (Model Context Protocol)

Mem supports the Model Context Protocol for connecting AI tools to Mem. Works with Claude, ChatGPT, Claude Code CLI, and Codex CLI.

## Events

The provider does not support events. The Mem API does not offer webhooks or any built-in event subscription mechanism.
