Now let me check the specific endpoints for more details on features:I have enough information now. Let me compile the specification.

# Slates Specification for Openperplex

## Overview

Openperplex is an AI-powered web search and content retrieval API. It allows developers to perform web searches with LLM-generated answers, extract content from URLs, and capture website screenshots, with support for 14+ languages and 40+ geographic locations.

## Authentication

Openperplex uses API key authentication. All API requests must include the API key in the request headers:

```
X-API-Key: YOUR_API_KEY
```

To obtain an API key:

1. Sign up for an account at [api.openperplex.com](https://api.openperplex.com).
2. Generate and copy your API key from the dashboard.

There are no OAuth flows, scopes, or additional credentials required.

## Features

### Web Search

Perform AI-powered web searches that return LLM-generated answers along with sources and citations. The search crawls the web, retrieves relevant results, and synthesizes an answer using a selected AI model.

- **Query**: The search question or query string.
- **Model selection**: Choose the underlying LLM model (e.g., `gpt-4o-mini`, `gpt-4o`, `o3-mini-high`, `o3-mini-medium`, `gemini-2.0-flash`).
- **Location**: Country code (40+ supported) to get localized search results.
- **Response language**: Supports 14+ languages; `auto` detects language from the query.
- **Response format**: Output can be `text`, `markdown`, or `html`.
- **Date context**: Optional date string to provide temporal context to the search.
- **Recency filter**: Filter results by time range — `hour`, `day`, `week`, `month`, `year`, or `anytime`.
- **Return options**: Optionally include source citations and relevant images in the response.

### Custom Search

Perform web searches with custom system and user prompts, giving full control over how the LLM processes and responds to search results. This is useful for tailoring outputs to specific use cases such as summarization, analysis, or structured extraction.

- Supports the same location, language, model, and format parameters as standard search.
- Accepts a custom **system prompt** to guide the LLM's behavior.

### Streaming Search

Both standard and custom searches are available in streaming mode, delivering results incrementally in real time. Streamed responses are chunked by type (LLM text, sources, images, response time).

### URL Content Querying

Ask questions about the content of a specific URL. The API fetches the page content and uses an LLM to answer a query based on that content.

### Website Content Extraction

Extract the content of a web page as plain text or Markdown. Useful for ingesting web content into downstream AI pipelines or applications.

### Website Screenshots

Capture a live screenshot of any web page by providing its URL. Useful for visual verification, archiving, or thumbnail generation.

## Events

The provider does not support events.
