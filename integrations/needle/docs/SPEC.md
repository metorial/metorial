Now let me check the search collection and workflow-related docs for more detail on features:Now I have a comprehensive understanding of Needle (needle.app). Let me compile the specification.

# Slates Specification for Needle

## Overview

Needle is a knowledge management and RAG (Retrieval-Augmented Generation) platform that allows users to index documents into searchable collections and perform AI-powered semantic search across them. It supports 20+ data source connectors (Google Drive, SharePoint, Notion, Slack, etc.), handles multiple file types (PDF, Word, Excel, CSV, Markdown, etc.), and provides a RAG API for building AI-powered applications and workflow automations.

## Authentication

Needle uses API key authentication. An API key can be obtained from the [Settings](https://needle.app/dashboard/settings) page in the Needle dashboard.

- **Method:** API Key
- **Header:** `x-api-key`
- **How to obtain:** Navigate to Developer Settings in the Needle dashboard to generate an API key.
- **Key management:** If compromised, the key can be revoked and regenerated from the settings page.

Example header:

```
x-api-key: your-api-key-here
```

## Features

### Collection Management

Create, list, update, and delete collections, which are the primary organizational unit in Needle (equivalent to document stores). Collections hold indexed files that can be searched semantically. You can retrieve collection details and statistics such as file counts.

- Collections can be owned, edited, or viewed depending on user permissions.

### File Management

Add files to collections by providing URLs (public or private). For private/local files, Needle provides a signed upload URL mechanism — you first request an upload URL, upload the file to it, then reference that URL when adding the file to a collection. Files can also be downloaded via signed download URLs.

- Supported file types include Plain Text, Markdown, CSV, HTML, Video Transcripts, Excel Spreadsheets, PowerPoint Presentations, Word Documents, PDFs, and more.
- OCR is supported for extracting text from images and scanned documents.
- Charts and tables in Excel, PowerPoint, and PDF files can be processed.
- Files managed by connectors (e.g., Google Drive sync) cannot be manually deleted.

### Semantic Search

Perform AI-powered semantic search across documents in a collection. Needle handles chunking, embedding, and reranking automatically to return the most relevant results for a given query.

- Search is scoped to a specific collection.

### Connectors

Needle provides 25+ native connectors to external data sources such as Gmail, GitHub, Slack, Salesforce, Google Drive, SharePoint, and Notion. Connectors automatically sync and reindex content from these sources into collections.

- Connector-managed files are automatically kept up to date.

### Workflow Automation

Needle offers a visual workflow builder for creating AI-powered automations. Workflows can include AI agent nodes that reason over data, use tools (collection search, internet search, web browsing), and interact with external services like Google Sheets, Airtable, and more.

- Workflows support loop, wait, and conditional logic nodes.
- An AI Agent node can call up to 40 tool-call steps per run.
- Workflows run server-side.

## Events

The provider does not support events. The Needle API does not offer webhooks or event subscription mechanisms for external consumers.
