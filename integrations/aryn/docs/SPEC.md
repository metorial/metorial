# Slates Specification for Aryn

## Overview

Aryn is an enterprise AI platform for document parsing, data extraction, analytics, and search at scale on complex documents. Its core product, DocParse, segments and labels documents, extracts tables, and images, and does OCR – turning 30+ document types into structured JSON. It can be used to prepare complex, unstructured data for retrieval-augmented generation (RAG) applications, document processing workflows, extracting content from documents (like tables), and semantic search systems.

## Authentication

Aryn uses API key-based authentication. Users can retrieve their API key from the Keys tab in the Aryn UI, and can reissue a new API key or invalidate the current one.

The API key is passed as a Bearer token in the `Authorization` header:

```
Authorization: Bearer YOUR_ARYN_API_KEY
```

The API base URL is `https://api.aryn.cloud`. The SDK looks for Aryn API keys first in the environment variable `ARYN_API_KEY`, and then in `~/.aryn/config.yaml`.

No OAuth, scopes, or tenant IDs are required. A single API key provides access to all features available on the user's pricing plan.

## Features

### Document Parsing (Partitioning)

Upload a document to have it segmented and labeled into structured output (JSON, Markdown, or HTML). DocParse segments and labels documents, runs OCR, and extracts tables and images. It can return structured output in JSON or Markdown and provides labeled bounding boxes for titles, tables, table rows and columns, images, and regular text.

- **Supported formats**: Over 30+ file formats including PDF and Microsoft Office. Specifically PDF, DOCX, DOC, PPTX, PPT, and many more.
- **Output formats**: JSON (default) yields an array of partitioned elements; Markdown returns the document as a Markdown string; HTML returns the document as an HTML string.
- **Text extraction modes**: Configurable via `text_mode` with options: `auto`, `inline_fallback_to_ocr`, `ocr_standard`, and `ocr_vision`.
- **Table extraction**: Configurable table structure extraction mode to extract cell-level content from tables.
- **Image summarization**: When enabled, generates a summary of images in the document. Only available for Pay-As-You-Go users.
- **Property extraction at parse time**: Supports extracting key-value pairs from documents such as invoices, purchase orders, and contracts. Users can provide a schema describing properties to extract, or ask DocParse to suggest a schema.
- **Chunking**: Configurable chunking strategies with options for tokenizer, max tokens, merge-across-pages behavior, and strategy (e.g., `context_rich`).
- **Bounding box threshold**: Configurable confidence threshold for detecting bounding boxes, or set to `auto`.
- **Asynchronous processing**: Asynchronous APIs are available for parsing, useful for processing large document collections.
- **OCR language support**: Supports multiple OCR languages, with English as the default.

### Document Storage (DocSets)

Documents are automatically stored in DocSets after parsing. A DocSet is like a folder for processed documents, optimized to store and index the elements and metadata from each document. By default, documents go to a DocSet named `docparse_storage`.

- Users can create custom DocSets and specify which DocSet a document should be stored in during parsing.
- Pay-As-You-Go customers can opt out of storing documents.
- Parsed documents can be retrieved, including the original binary file.
- Documents can be listed, filtered, and inspected within DocSets.

### Metadata (Property) Extraction

Users can extract metadata (called properties) from documents in DocSets using GenAI. Properties are stored as key-value pairs and extracted using an LLM from all documents in a DocSet.

- Up to 15 properties can be extracted at once from the UI, or up to 100 at once using the API.
- Default values can be specified for cases where the LLM cannot find the requested information.
- This feature is available only for accounts on the Pay As You Go plan.

### Search

Users can search over their documents and associated metadata using Aryn's search API.

- Supports GenAI-powered metadata extraction for document enrichment, and vector and keyword search on documents and related metadata.
- Search can return results at the element (chunk) level or the document level.
- Supports property-based filtering in search queries.

### Deep Analytics Workspaces

Users can analyze document collections using a Deep Analytics Workspace. It supports multi-step queries that use a mix of database and LLM query operators, and provides a notebook-style experience to query, extract, summarize, and navigate document datasets.

- Features an agentic query engine with natural language queries.
- Users can inspect all aspects of query planning, each step in execution, citations, and edit and rerun queries as needed.

## Events

The provider does not support events. Aryn's API is request-response based for document processing, storage, and search. There are no webhooks or event subscription mechanisms available.
