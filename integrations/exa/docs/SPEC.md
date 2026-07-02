# Slates Specification for Exa

## Overview

Exa is an AI-native web search engine that provides a search API for programmatic web search, content extraction, similarity-based discovery, question answering, and automated research. Exa is a search engine made for AIs. It also offers a Websets API for finding, verifying, and processing web data at scale to build unique collections of web content.

## Authentication

Exa uses API key authentication. Inside your Exa account, locate the "API Keys" section at https://dashboard.exa.ai/api-keys. Click "+ CREATE NEW KEY", assign a reference name, and copy the generated key. It is essential to save this key securely.

The API key is passed via the `x-api-key` HTTP header on all requests. For example:

```
curl -X POST 'https://api.exa.ai/search' \
  -H 'x-api-key: YOUR-EXA-API-KEY' \
  -H 'Content-Type: application/json' \
  -d '{ "query": "your query" }'
```

There are no OAuth flows, scopes, or additional credentials. The base URL for the Search API is `https://api.exa.ai` and the Websets API uses `https://api.exa.ai/websets/v0/`.

## Features

### Web Search

The search endpoint lets you intelligently search the web and extract contents from the results. By default, it automatically chooses the best search method using Exa's embeddings-based model and other techniques to find the most relevant results for your query. You can also use Deep search for comprehensive results with query expansion and detailed context.

- **Search types**: `neural` uses an embeddings-based model, `auto` (default) intelligently combines neural and other search methods, `fast` uses streamlined versions of the search models, and `deep` provides comprehensive search with query expansion and detailed context.
- **Categories**: A data category can be specified to focus on. The `people` and `company` categories have improved quality for finding LinkedIn profiles and company pages. Other categories include `news`, `tweet`, and `research paper`.
- **Filters**: Results can be filtered by included/excluded domains, published date ranges, crawl date ranges, and required/excluded text strings. The `company` and `people` categories only support a limited set of filters; date, text, and domain filters are not supported for these categories.

### Content Retrieval

When using the Exa API, you can request different types of content to be returned for each search result.

- **Text**: Returns the full text content of the result, formatted as markdown. It extracts the main content while filtering out navigation elements, pop-ups, and other peripheral text.
- **Highlights**: Delivers key excerpts from the text that are most relevant to your search query. This is extractive content from the source.
- **Summary**: Provides a concise summary generated from the text, tailored to a specific query. This is abstractive content created using Gemini Flash. Structured summaries via JSON schema are also supported.
- **LiveCrawl**: Content can be fetched live from the source URL rather than from the index, with modes: `always`, `preferred`, `fallback`, or `never`.
- Can also retrieve contents directly from a list of URLs without searching first.

### Find Similar

Based on a link, find and return pages that are similar in meaning. Useful for competitor analysis, finding related content, or building recommendation systems. Supports the same filtering and content retrieval options as search.

### Answer

Get direct answers to questions using Exa's Answer API. Get an AI-generated answer to a question with citations from the web. Supports streaming responses.

### Research

Automate in-depth web research and receive structured JSON results with citations. Create an asynchronous research task that explores the web, gathers sources, synthesizes findings, and returns results with citations. Can generate structured JSON matching an `outputSchema` you provide, or a detailed markdown report when no schema is provided. The API responds immediately with a `researchId` for polling completion status.

### Websets

Websets are containers that store structured results (WebsetItems) discovered by search agents that find web pages matching specific criteria. Once items are added to a Webset, they can be further processed with enrichment agents to extract additional data. Whether you're looking for companies, people, or research papers, each result becomes a structured Item with source content, verification status, and type-specific fields. Items can be further enriched with enrichments.

- **Search**: Define a query and criteria; Exa finds matching web entities and verifies them against your criteria.
- **Enrichments**: An agent that searches the web to enhance existing WebsetItems with additional structured data. Enrichments can return text, numbers, dates, or other formats.
- **Imports**: Bring existing data (e.g., from CSV) into a Webset for enrichment.
- **Monitors**: Monitors allow you to automatically keep your Websets updated with fresh data on a schedule, creating a continuous flow of updates without manual intervention. Search behavior automatically runs new searches to find fresh content matching your criteria, with automatic deduplication. Refresh behavior updates existing items by refreshing their content or re-running enrichments. Configured with cron-based cadence.
- **Exports**: Export Webset items to CSV, JSON, or XLSX formats.
- The Websets API is async-first. Searches can take from seconds to minutes, depending on complexity.

## Events

Exa supports webhooks for the Websets API. Webhooks let you get notifications when things happen in your Websets. When you create a webhook, you choose which events you want to know about and where to send the notifications. When an event happens, Exa sends an HTTP POST request to your webhook URL. You'll get a secret key for checking webhook signatures.

The available webhook event types are:

### Webset Events

- **`webset.created`** — A new Webset has been created.
- **`webset.deleted`** — A Webset has been deleted.
- **`webset.paused`** — A Webset has been paused.
- **`webset.idle`** — A Webset has finished all running operations and is idle.

### Webset Search Events

- **`webset.search.created`** — A new search has been started on a Webset.
- **`webset.search.updated`** — A search has been updated with progress.
- **`webset.search.completed`** — A search has finished finding all items.
- **`webset.search.canceled`** — A search has been canceled.

### Webset Item Events

- **`webset.item.created`** — A new item has been added to a Webset.
- **`webset.item.enriched`** — An item has completed enrichment processing.

### Import Events

- **`import.created`** — A new data import has been started.
- **`import.completed`** — A data import has finished.

### Monitor Events

- **`monitor.created`** — A new monitor has been created.
- **`monitor.updated`** — A monitor's configuration has been updated.
- **`monitor.deleted`** — A monitor has been deleted.
- **`monitor.run.created`** — A scheduled monitor run has started.
- **`monitor.run.completed`** — A scheduled monitor run has finished.

### Export Events

- **`webset.export.created`** — A new export job has been started.
- **`webset.export.completed`** — An export job has finished and is ready for download.

Note: Webhooks are specific to the Websets API. The core Search, Contents, Find Similar, Answer, and Research endpoints do not support webhooks or event subscriptions.
