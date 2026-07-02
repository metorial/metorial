Now let me look at webhook setup and monitor API details more closely:Now I have enough information to write a comprehensive specification. Let me compile it:

# Slates Specification for Parallel

## Overview

Parallel (by Parallel Web Systems) is a web API platform built for AI agents that provides web search, content extraction, deep research, entity discovery, chat completions, and continuous web monitoring capabilities. It is a web API purpose-built for AIs, providing production-ready outputs with minimal hallucination and evidence-based results. Parallel develops critical web search infrastructure for AI, with a suite of web search and agent APIs built on a proprietary index of the global internet.

## Authentication

Parallel uses API key authentication. You can generate an API key from the [Parallel Developer Platform](https://platform.parallel.ai).

The API key is passed in request headers. Depending on the API endpoint, it uses one of two header formats:

- **Most endpoints (Search, Extract, Task, FindAll, Monitor):** Pass the key via the `x-api-key` header:

  ```
  x-api-key: YOUR_PARALLEL_API_KEY
  ```

- **Chat API (OpenAI-compatible):** Pass the key as a Bearer token in the `Authorization` header:
  ```
  Authorization: Bearer YOUR_PARALLEL_API_KEY
  ```

An active Parallel API key is required for all requests. The base URL is `https://api.parallel.ai`. There are no OAuth flows or scopes; authentication is solely API key-based.

Parallel also offers an MCP server at `https://search-mcp.parallel.ai/mcp`, which can be used programmatically by providing the API key as a Bearer token in the Authorization header.

## Features

### Web Search

Perform AI-optimized web searches with natural language objectives and optional keyword queries. Supports multiple modes: `one-shot` returns more comprehensive results, `agentic` returns concise token-efficient results for use in agentic loops, and `fast` trades some quality for lower latency. You provide an objective (natural language description of what to find) and/or keyword search queries, and receive ranked results with excerpts and source URLs.

- Configurable maximum number of results and excerpt length.
- The objective may include guidance about preferred sources or freshness. At least one of `objective` or `search_queries` must be provided.

### Content Extraction

Extract and retrieve content from specific URLs. You provide one or more URLs along with an objective describing what information to extract. Returns excerpts or full content from the target pages.

- Can be directed with an objective to extract only relevant information.
- Options for excerpts-only or full content retrieval.

### Deep Research (Task API)

Run complex, multi-step web research tasks that autonomously search, retrieve, reason, and synthesize information. Users declare what information and insights they need, and the API orchestrates querying, ranking, retrieval, reasoning, validation, and synthesis to deliver structured outputs.

- Multiple processor tiers available (`base`, `core`, `ultra`, and higher multipliers like `ultra2x`, `ultra4x`, `ultra8x`) that trade cost for thoroughness and accuracy.
- Supports structured JSON output schemas to get results in a specific format with defined fields.
- Supports authenticated page access, allowing research across both public and private sources within a single workflow.
- Task Groups allow organizing and managing multiple related task runs.

### Chat Completions

An OpenAI-compatible chat completions endpoint that provides web-grounded conversational AI. The Chat API offers two modes: the `speed` model for low-latency responses, and a research mode for deeper queries.

- Supports streaming responses.
- Supports structured output via JSON schema in `response_format`.
- Compatible with OpenAI client libraries by changing the base URL and API key.

### FindAll (Entity Discovery)

Unlike traditional search APIs that return a fixed set of results, FindAll generates candidates from web data, validates them against your criteria, and optionally enriches matches with additional structured information—all from a single natural language query.

- Accepts natural language objectives which are parsed into entity types and match conditions via an ingest step.
- Offers multiple tiers: Base is cost-effective for broad queries, Core balances cost and thoroughness, and Pro provides the most comprehensive search for highly specific queries.
- Configurable `match_limit` to control how many entities to discover.
- Includes enrichment capability that extracts additional structured fields from matched entities.
- Asynchronous processing: you start a run, poll for completion, then retrieve results.

### Web Monitoring (Monitor API)

The Monitor API lets you continuously track the web for changes relevant to a query, on a schedule you control. It flips the model from pull to push — you create queries that themselves trigger notifications when new information is published to the web.

- Supports scheduling with configurable frequency (e.g., `1h`, `1d`, `1w`) between 1 hour and 30 days.
- Supports structured output schemas so each detected event returns data in a consistent, machine-readable format.
- Currently in public alpha; endpoints and formats are subject to change.
- Designed to track new updates as they happen, not to retrieve historical data.

## Events

Parallel supports webhooks for both the Task API and the Monitor API.

### Task Run Events

Webhooks are available for all Task Runs on the Parallel Task API, including Deep Research. Get notified when tasks complete instead of continuously checking their status.

- Event type: `task_run.status` — fires when a task run completes or changes status.
- Configured per-request by including a `webhook` object with a `url` and `event_types` array.

### Monitor Events

Webhooks allow you to receive real-time notifications when a Monitor execution completes, fails, or when material events are detected.

- Event types:
  - `monitor.event.detected` — fired when new relevant information is discovered on the web.
  - `monitor.execution.completed` — fired when a scheduled monitor run finishes.
  - `monitor.execution.failed` — fired when a monitor run encounters an error.
- Configured when creating a monitor by including a `webhook` object with a `url` and `event_types` array.
- When a webhook fires with a `monitor.event.detected` event, it returns an `event_group_id` that you use to retrieve the complete set of results.

### Webhook Security

Webhooks follow standard webhook conventions. Go to Settings → Webhooks to view your account webhook secret, which is needed to verify webhook signatures. Signatures use HMAC verification and are included in the `webhook-signature` header.
