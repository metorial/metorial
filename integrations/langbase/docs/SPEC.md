Now let me check for the Parser and Images APIs, and also confirm whether Langbase has any webhook/event support:I now have enough information to write the specification. The search results about webhooks were all for Langflow and Langfuse (different products), not Langbase. Langbase does not appear to support webhooks or event subscriptions.

# Slates Specification for Langbase

## Overview

Langbase is a serverless AI developer platform that provides a unified API for building and running AI agents. It offers robust APIs for pipes and memory to build composable LLM AI agents. It uses a unified LLM API to provide a consistent interface for interacting with 100+ LLMs across all the top LLM providers.

## Authentication

The Langbase API uses API keys for authentication. You can create API keys at a user or org account level.

All API requests should include your API key in an `Authorization` HTTP header as follows:

```
Authorization: Bearer LANGBASE_API_KEY
```

**Obtaining API Keys:**

- API keys can be generated from the Langbase Studio by switching to your user or org account.
- In the API Keys section, click on the Generate API Key button. From there you can create a new API key or manage existing ones.
- Make sure to copy your API key immediately after generation. You will not be able to view it another time.

**Pipe-specific API Keys:**

Some API endpoints like when running a pipe allow you to specify a pipe-specific API key as well.

**LLM Provider API Keys:**

If you have set up LLM API keys in your profile, the Pipe will automatically use them. If not, navigate to the LLM API keys page and add keys for different providers like OpenAI, TogetherAI, Anthropic, etc. When using the Agent runtime directly, the LLM provider API key must be passed per request.

## Features

### Pipes (AI Agents)

Pipes are the core building blocks of Langbase, and they can be used to create various AI agents for different use cases. Pipes can be used to generate text, chat with users, and more. The Pipe API allows you to create, update, and delete pipes. The API also provides endpoints to run the AI Pipe for chat and generation.

- Pipes can be run with streaming or non-streaming responses.
- Memory (RAG) can be attached to pipes for knowledge-grounded responses.
- Supports system prompts, variables, few-shot examples, and tool calling.

### Memory (RAG)

Memory is a managed search engine as an API for developers. It is an all-in-one serverless RAG (Retrieval-Augmented Generation) with vector store, file storage, attribution data, parsing + chunking, and semantic similarity search engine.

- The Memory API allows you to create, list, and update memories. The API also provides endpoints to upload documents, list them, and retry generating embeddings for documents.
- Supports retrieval testing to debug chunking parameters.
- Documents can be enabled/disabled individually within a memory.

### Agent (Runtime LLM)

Agent works as a runtime LLM agent. You can specify all parameters at runtime and get the response from the agent. All cutting-edge LLM features are supported, including streaming, JSON mode, tool calling, structured outputs, vision, and more.

- Requires both a Langbase API key and an LLM provider API key per request.
- Model is specified at runtime in `provider:model` format (e.g., `openai:gpt-4.1`).

### Threads (Conversation Management)

Threads allows you to manage conversation history and context. They are essential for building conversational applications that require context management and organization of conversation threads.

- Threads help you organize and maintain conversation history across multiple interactions. The Threads API supports creating new threads with optional initial messages.
- Supports creating, updating, getting, deleting threads, and appending messages.

### Workflow (Multi-Step Orchestration)

Workflow helps you build multi-step agentic applications by breaking them into simple steps with built-in durable features like timeouts and retries.

- Supports sequential and parallel execution patterns, conditional execution paths based on previous step results, configurable retry strategies, and time boundaries to prevent operations from running indefinitely.

### Parser (Document Extraction)

Parser allows you to extract text content from various document formats. This is particularly useful when you need to process documents before using them in your AI applications. Parser can handle a variety of formats, including PDFs, CSVs, and more.

- Documents must be under 10 MB in size.

### Chunker (Text Splitting)

Chunker allows you to split text into smaller, manageable pieces. This is especially useful for RAG pipelines or when you need to work with only specific sections of a document.

- Configurable chunk max length (1024–30,000 characters) and chunk overlap (minimum 256 characters).

### Embed (Vector Embeddings)

The Embed API allows you to generate vector embeddings for text chunks. This is particularly useful for semantic search, text similarity comparisons, and other NLP tasks.

- Maximum of 100 chunks per request and 8,192 characters per chunk.
- Supports embedding models from OpenAI and Cohere.

### Images (AI Image Generation)

Generate AI images with multiple providers using the Langbase Images API. Supports OpenAI DALL-E, Together AI Flux, Google Imagen, and more.

- Configurable size, model, and number of images per request.
- Requires passing the LLM provider key via a separate header (`LB-LLM-Key`).

### Tools (Web Search & Crawling)

Tools allows you to extend the capabilities of your AI applications. They enable you to integrate functionality such as web search, crawling, and other specialized tasks into your AI workflows.

- Web search supports services like Exa (requires external API key).
- Web crawling supports services like Spider Cloud (requires external API key).
- Configurable result limits and domain filtering for web search.

## Events

The provider does not support events. Langbase does not offer webhooks, event subscriptions, or any built-in polling mechanism for change notifications.
