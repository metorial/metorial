Now let me check the features like plugins, guardrails, and the analytics/credits APIs:# Slates Specification for Openrouter

## Overview

OpenRouter is a unified API platform that gives you access to over 400 AI models from dozens of providers through a single endpoint. The platform works as an intelligent router, sending your requests to the right provider while taking care of authentication, billing, and error handling. OpenRouter's request and response schemas are very similar to the OpenAI Chat API, with a few small differences — at a high level, it normalizes the schema across models and providers so you only need to learn one.

## Authentication

OpenRouter supports two authentication methods:

### 1. API Key (Bearer Token)

You can cover model costs with OpenRouter API keys. The API authenticates requests using Bearer tokens, which allows you to use curl or the OpenAI SDK directly with OpenRouter.

To use an API key:

1. Create an account at openrouter.ai.
2. Navigate to the API Keys section and create a new secret key (keys are prefixed with `sk-or-`).
3. Include the key in the `Authorization` header as: `Authorization: Bearer sk-or-...`

The base URL for API requests is `https://openrouter.ai/api/v1`.

Optional headers for app attribution:

- `HTTP-Referer`: Your site URL (for rankings on openrouter.ai)
- `X-OpenRouter-Title`: Your app's title

### 2. OAuth PKCE (for end-user authentication)

OpenRouter supports OAuth PKCE to let third-party applications authenticate end-users and obtain user-controlled API keys on their behalf.

**Flow:**

1. Redirect the user to `https://openrouter.ai/auth?callback_url=<YOUR_CALLBACK_URL>` with optional PKCE `code_challenge` and `code_challenge_method` (S256 recommended).
2. The user will be prompted to log in to OpenRouter and authorize your app. After authorization, they will be redirected back to your site with a `code` parameter in the URL.
3. Exchange the authorization code for an API key by POSTing to `https://openrouter.ai/api/v1/auth/keys` with the `code`, optional `code_verifier`, and `code_challenge_method`.
4. Store the API key securely within the user's browser or in your own database, and use it to make OpenRouter requests.

The callback_url is required and must be a URI. Only HTTPS URLs on ports 443 and 3000 are allowed.

### 3. Bring Your Own Key (BYOK)

If you choose to use your own provider API keys (Bring Your Own Key - BYOK), the first 1M BYOK requests per month are free, and for all subsequent usage there is a fee of 5% of what the same model and provider would normally cost on OpenRouter. BYOK supports providers like OpenAI, Anthropic, Google Vertex AI, Amazon Bedrock, and Azure AI Services, configured through account settings.

## Features

### Chat Completions

Send chat messages to any of the 400+ supported AI models using an OpenAI-compatible interface. The API supports text, images, and PDFs. Images can be passed as URLs or base64 encoded images. PDFs can also be sent as URLs or base64 encoded data, and work with any model on OpenRouter. Configurable parameters include temperature, max tokens, top_p, top_k, and more. The API allows streaming responses from any model, which is useful for building chat interfaces or other applications where the UI should update as the model generates the response.

### Model Routing and Fallbacks

OpenRouter will select the least expensive and best GPUs available to serve the request, and fall back to other providers or GPUs if it receives a 5xx response code or if you are rate-limited. Model variants modify routing behavior:

- `:nitro` — Providers will be sorted by throughput rather than the default sort, optimizing for faster response times.
- `:floor` — Providers will be sorted by price rather than the default sort, prioritizing the most cost-effective options.
- `:free` — The model is always provided for free and has low rate limits.
- `:exacto` — Providers will be sorted using quality-first signals tuned for tool-calling reliability.

### Structured Outputs

The response_format parameter allows you to enforce structured JSON responses from the model. OpenRouter supports two modes: basic JSON mode (the model will return valid JSON) and strict schema mode (the model will return JSON matching your exact schema).

### Tool Calling

The Responses API supports comprehensive tool calling capabilities, allowing models to call functions, execute tools in parallel, and handle complex multi-step workflows. Tool choice can be configured to auto, force a specific tool, or disable tool calling entirely.

### Embeddings

Embeddings are numerical representations of text that capture semantic meaning. They convert text into vectors (arrays of numbers) that can be used for various machine learning tasks. OpenRouter provides a unified API to access embedding models from multiple providers. Multiple texts can be sent in a single batch request.

### Image Generation

OpenRouter supports image generation through select models like Google Gemini image generation models. Configurable parameters include aspect ratio, image size/quality, and number of images.

### Plugins

OpenRouter plugins extend model capabilities with features like web search, PDF processing, and response healing. Enable plugins by adding a plugins array to your request. The `:online` model variant can also be used to automatically attach web search results to prompts.

### Guardrails

Guardrails let organizations control how their members and API keys can use OpenRouter. You can set spending limits, restrict which models and providers are available, and enforce data privacy policies. Guardrails can be created and managed programmatically via the API. Budget limits can reset daily, weekly, or monthly.

### API Key Management

API keys can be created, listed, and deleted programmatically. Enterprise deployments typically require programmatic API key management for automated provisioning, rotation, and lifecycle management. Create a Management API key to manage API keys programmatically, enabling automated key creation, programmatic key rotation, and usage monitoring with automatic limit enforcement.

### Model Discovery

The Models API makes information about all LLMs freely available. It returns a standardized JSON response format that provides comprehensive metadata for each available model, including pricing, context window, and supported parameters. Models can be filtered by supported features like tool calling.

### Usage Analytics and Generation Stats

You can use the returned generation id to query for the generation stats (including token counts and cost) after the request is complete. This is useful for auditing historical usage or when you need to fetch stats asynchronously. Every API response includes detailed usage information: token counts (prompt, completion, reasoning, cached), cost in credits, and timing data, enabling real-time cost tracking without additional API calls.

### Credits Management

Credits can be queried via the API to check remaining balance. Credits are deposits on OpenRouter that you use for LLM inference. When you use the API or chat interface, the request cost is deducted from your credits.

### Broadcast (Observability)

Broadcast allows you to automatically send traces from your OpenRouter requests to external observability and analytics platforms. This feature enables you to monitor, debug, and analyze your LLM usage across your preferred tools without any additional instrumentation in your application code. Supported destinations include custom webhooks and various observability platforms. Traces can be filtered by API key and sampled at a configurable rate.

### Zero Data Retention (ZDR)

Zero Data Retention ensures providers do not store your prompts or responses. ZDR can be enabled globally in privacy settings or per-request using the zdr parameter.

## Events

OpenRouter supports outbound webhooks as part of its **Broadcast** feature for observability purposes.

### Broadcast Webhook Traces

Webhook allows you to send traces to any HTTP endpoint that can receive JSON payloads. This is useful for integrating with custom observability systems, internal tools, or any service that accepts HTTP requests.

- Traces are sent in OTLP JSON format. Each request contains a resourceSpans array with span data including trace and span IDs, timestamps, model and provider information, token usage and cost, and request/response content.
- Traces are automatically sent for every API request made through OpenRouter once configured.
- Each destination can be configured to only receive traces from specific API keys, which is useful when you want to route traces from different parts of your application to different observability platforms.
- Each destination can be configured with a sampling rate to control what percentage of traces are sent. This is useful for high-volume applications where you want to reduce costs or data volume.
- Configuration is done through the OpenRouter dashboard under Settings > Observability.

OpenRouter does not provide general-purpose webhooks for account events (e.g., credit changes, key modifications). The webhook/event system is focused exclusively on LLM request tracing and observability.
