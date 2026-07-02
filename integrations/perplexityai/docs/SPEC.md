Now let me get more details on the Agent API and specific features:Now I have enough information to compile the specification.

# Slates Specification for Perplexity AI

## Overview

Perplexity AI is an AI-powered answer engine that provides real-time, web-grounded responses with citations. It offers a suite of APIs including search, chat completions, agentic workflows, and embeddings, enabling developers to integrate web-connected AI search and reasoning capabilities into their applications.

## Authentication

Perplexity AI uses **API key-based authentication** (Bearer token).

1. Create a Perplexity account at [perplexity.ai](https://perplexity.ai).
2. Navigate to **Settings → API** (or visit `perplexity.ai/account/api`).
3. Create an **API Group** (required before generating keys) to organize keys by project or environment.
4. Generate an API key within the group. Keys are prefixed with `pplx-`.
5. Add credits or a payment method, as API usage is billed separately from any Perplexity Pro subscription.

All API requests must include the key in the `Authorization` header as a Bearer token:

```
Authorization: Bearer pplx-your-api-key-here
```

The base URL for all API calls is `https://api.perplexity.ai`.

API keys can also be programmatically generated, listed, and revoked via management endpoints using an existing key. There are no OAuth flows or scopes; a single API key grants access to all available API features within its usage tier.

## Features

### Agent API (Multi-Provider LLM Access)

A unified interface that provides access to models from multiple providers (OpenAI, Anthropic, Google, xAI, and Perplexity's own Sonar models) through a single API key. It supports built-in tools like web search and URL fetching, configurable reasoning controls and token budgets, and pre-configured **presets** (e.g., "pro-search", "deep-research") optimized for specific use cases. It also supports **model fallback**, allowing specification of multiple models for automatic failover. The API is compatible with the OpenAI Chat Completions format.

- **Tools**: Web search, URL fetching, and custom function calling can be attached to requests.
- **Presets**: Pre-configured combinations of models, system instructions, tools, and token limits for common workflows.
- **Structured outputs**: Supports JSON schema-based output formatting.
- **Streaming**: Responses can be streamed for lower latency.

### Sonar API (AI Search Chat Completions)

Perplexity's native search-augmented chat completion models that combine LLM generation with real-time web search. Responses include inline citations to web sources. Available model tiers:

- **Sonar**: Lightweight, cost-effective search model for quick factual queries and summaries.
- **Sonar Pro**: Advanced model supporting multi-step queries, larger context window (~200K tokens), and roughly double the citations.
- **Sonar Reasoning Pro**: Chain-of-thought reasoning model for complex multi-step analysis.
- **Sonar Deep Research**: Expert-level research model that conducts exhaustive searches and generates comprehensive reports.

Key parameters include `search_recency_filter` (limit results by time), `search_domain_filter` (restrict to specific domains), `return_images`, `return_related_questions`, `temperature`, `top_p`, `presence_penalty`, and `frequency_penalty`. Some features (images, domain filters, structured output) are gated by usage tier.

### Search API (Raw Web Search Results)

Provides raw, ranked web search results from Perplexity's index (covering hundreds of billions of webpages) without LLM-synthesized answers. Results include pre-ranked, fine-grained snippets rather than full documents, making them ready for use in RAG pipelines or custom synthesis workflows.

- Supports domain filtering, multi-query search in a single request, and content extraction.
- Configurable parameters include `max_results` and `max_tokens_per_page` to control result volume and snippet length.

### Embeddings API

Generates vector representations of text for use in semantic search, retrieval-augmented generation, and recommendation systems.

- **Standard Embeddings**: General-purpose text embeddings.
- **Contextualized Embeddings**: Embeddings that incorporate additional context for improved relevance in specific retrieval scenarios.

### API Key Management

API keys can be programmatically created, tested, and revoked. API Groups allow organizing keys by environment (dev/staging/prod) with separate usage tracking and billing.

## Events

The provider does not support events. Perplexity AI does not offer webhooks, event subscriptions, or any purpose-built polling mechanism.
