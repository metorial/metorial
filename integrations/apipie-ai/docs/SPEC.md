Now I have enough information. Let me compile the specification.

# Slates Specification for APIpie AI

## Overview

APIpie AI is an AI super aggregator that provides a unified, OpenAI-compatible API to access hundreds of AI models from multiple providers (OpenAI, Anthropic, Google, Meta, etc.) across language, image, voice, vision, embedding, and moderation categories. It offers intelligent routing, load balancing, and value-added features like search grounding, RAG, and model pooling on a pay-as-you-go basis.

## Authentication

APIpie API requires API keys to authenticate users. You can obtain or create new API keys from your API Keys page at `https://apipie.ai/dashboard/profile/api-keys`.

Authentication is done using either an `Authorization` header with a Bearer token or an `x-api-key` header:

- `Authorization: Bearer <YOUR_API_KEY>`
- `x-api-key: <YOUR_API_KEY>`

The base URL for all API requests is `https://apipie.ai/v1/`. The API follows OpenAI's API structure, so existing OpenAI-compatible clients can be pointed at APIpie by changing the base URL and API key.

No OAuth, scopes, or additional credentials are required. Authentication is solely via the API key.

## Features

### Chat Completions

Send conversational prompts to hundreds of language models from providers like OpenAI, Anthropic, Google, Meta, Mistral, xAI, DeepSeek, and more through a single OpenAI-compatible endpoint. You can specify a model and optionally a provider. Supports streaming responses, function calling/tools, and structured output.

- Key parameters: `model`, `provider`, `messages`, `max_tokens`, `stream`.
- Tools/function calling can be configured to use OpenAI or Anthropic models to handle tool calls inline with requests to any model.

### Image Generation

Create and manipulate images using AI models from various providers through a unified interface. Supports generating original images, editing existing ones, and creating variations.

### Voice Synthesis

Convert text into natural-sounding speech using text-to-speech models from leading providers. Access thousands of voice options across multiple voice model providers.

### Multimodal Vision

Process and analyze images alongside text using vision-capable models. Supports sending images (via URL or base64) within chat completion requests for tasks like visual analysis, chart interpretation, and document processing.

### Embeddings

Generate vector embeddings from text using embedding models from multiple providers, useful for semantic search, clustering, and similarity tasks.

### Search Grounding

Augment any model's responses with real-time web search results. The system performs live searches, scrapes and cleans top results, and injects them into the prompt context automatically. Configurable via `web_search_options` or advanced parameters like number of searches, results to pull, scrape length, language, and geolocation. Also available as standalone search (`/v1/search`) and scrape (`/v1/scrape`) endpoints.

### RAG Tuning

Upload documents to collections and reference them when querying any model. The platform handles vectorization and retrieval, augmenting model responses with your own data without needing to fine-tune or train models.

### Pinecone Integration

For users needing more control over the vectorization process, the platform offers full Pinecone vector database integration, allowing custom embeddings and vector storage/retrieval for AI workflows.

### Integrity (Hallucination Reduction)

Queries models multiple times and uses an election process to select the most accurate response, reducing hallucinations. Useful for applications requiring high accuracy.

### Model Pooling

Aggregate similar models into pools for redundancy, failover, and higher effective throughput. Pools can contain multiple renditions of the same model or several models with similar capabilities.

### Preferred Routing

Choose between performance-optimized or cost-optimized routing for requests. The platform routes queries across multiple providers based on your preference.

### State Management

Manage configuration, memory, model selection, and routing preferences at the application or per-user level. State can be set via the dashboard GUI, the `/v1/state` API endpoint, or inline CLI commands within prompts. Supports features like persistent memory, model pinning, and search configuration.

### Integrated Model Memory (IMM)

Enable persistent conversational memory across requests. The platform can store and recall conversation context, allowing stateful interactions without client-side conversation management.

### Inline CLI

Control model behavior and features directly within prompts using special commands (e.g., `:setmodel:`, `:search`, `:deepsearch`). Allows dynamic configuration without changing API parameters.

### Models Discovery

Retrieve and filter available AI models based on type, provider, capabilities, pricing, and performance metrics. Provides detailed information including availability, latency, cost, and context window sizes to help select the right model.

### Usage Tracking

Track and analyze API usage with detailed insights including token counts, response times, costs, and source IPs. Historic usage data is accessible via API for auditing and optimization.

## Events

The provider does not support events. APIpie AI does not offer webhooks or event subscription mechanisms.
