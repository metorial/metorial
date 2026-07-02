# Slates Specification for Mistral AI

## Overview

Mistral AI is a European AI company that provides large language models (LLMs) through its developer platform (La Plateforme / AI Studio). The API provides a way for developers to integrate Mistral's models into their applications and production workflows. The platform offers models for chat completion, code generation, embeddings, document OCR, audio transcription, reasoning, content moderation, and AI agents.

## Authentication

Mistral AI uses **Bearer Token authentication** via API keys.

The Mistral AI API employs Bearer Token authentication. The API key you generate serves as this Bearer Token. To authenticate any API request, you must include it in the Authorization header: `Authorization: Bearer YOUR_API_KEY`.

**Obtaining an API Key:**

1. Create a Mistral account or sign in at https://console.mistral.ai.
2. Add your payment information and activate payments on your account under the billing section.
3. Go to the API keys page under your Workspace and create a new API key by clicking "Create new key". Make sure to copy the API key, save it securely, and do not share it with anyone.

**Base URL:** `https://api.mistral.ai/v1/`

**Plans:** Users can pick between Experiment (free experimental tier) and Scale (pay as you go) plans.

No OAuth2 or other authentication methods are supported for the API. Authentication is exclusively through API keys passed as Bearer tokens.

## Features

### Chat Completion

The Chat Completion feature allows you to interact with Mistral AI's models in a conversational manner. Supports system, user, assistant, and tool messages. Configurable parameters include temperature, top_p, max_tokens, frequency_penalty, presence_penalty, and random_seed. Supports streaming, where tokens are sent as server-sent events as they become available. Supports parallel function calling during tool use.

### Vision

Mistral offers vision-capable models that can process both text and images. Images can be provided as URLs or base64-encoded data within chat messages for multimodal understanding.

### Function Calling

An advanced API feature allowing the LLM to request invocation of external functions or tools during a conversation. You define tool schemas (function name, description, parameters), and the model can generate structured calls to those tools as part of its response.

### Structured Outputs

Models can be instructed to generate responses in a specific JSON schema, invaluable for machine-readable data extraction and system integration.

### Reasoning

Mistral's Magistral models are specialized reasoning models. These models excel at multi-step logic, transparent reasoning, and complex problem-solving across multiple languages. They provide chain-of-thought reasoning with step-by-step reasoning traces before arriving at final answers.

### Embeddings

Mistral Embed is a model that generates dense vector representations of text, useful for semantic search, retrieval-augmented generation (RAG), and content organization. Codestral Embed is a specialized embedding model for code snippets.

### Document AI / OCR

Mistral OCR is an Optical Character Recognition API. It comprehends each element of documents—media, text, tables, equations. It takes images and PDFs as input and extracts content in ordered interleaved text and images. Supports configurable table format output (markdown or HTML), and options for extracting headers, footers, and hyperlinks.

### Audio Transcription and Speech

Mistral offers audio input models fine-tuned and optimized for transcription. Supports speaker diarization for clear attribution between speakers. The API also supports speech generation from text using a saved voice or a reference audio clip; generated audio must be returned through Slate attachments rather than inline base64.

### Content Moderation

Mistral Moderation is a service that provides intelligent content safety, capable of detecting and managing harmful text across multiple languages.

### Code Generation

Mistral offers specialized models for code generation through models like Codestral and Devstral. Devstral 2 is a model optimized for code agents and software engineering tasks.

### Agents

The current API reference exposes new beta Agents and Conversations endpoints. The legacy `/v1/agents/completions` endpoint is marked deprecated by Mistral; this integration keeps the existing agent completion tool for compatibility but does not expand deprecated agent-completion behavior. Key beta capabilities include:

- Code execution connector for running Python code in a secure sandboxed environment, enabling mathematical calculations, data visualization, and scientific computing.
- Image generation connector powered by Black Forest Lab FLUX1.1.
- Document Library connector for integrated RAG functionality using user-uploaded documents.
- Web search connector for combining models with up-to-date information from the web.
- MCP (Model Context Protocol) tools for flexible integration with external systems, APIs, and databases.
- Multi-agent orchestration where agents can be added or removed from a conversation as needed, each contributing unique capabilities.
- Stateful conversation management where each conversation retains its context over time.

### Fine-Tuning

Mistral AI still exposes fine-tuning job endpoints in the API reference, but they are currently tagged deprecated. Existing tools remain available for compatibility with current workspaces; new work should prefer non-deprecated model and file workflows unless Mistral publishes a replacement fine-tuning surface.

### File Management

Files can be uploaded to Mistral's platform for use with OCR, batch inference, fine-tuning datasets, and transcription. Files can be listed, retrieved, downloaded through Slate attachments, signed with temporary URLs, and deleted.

### Model Listing

The API allows querying available models, including both Mistral-provided models and user's fine-tuned models.

### Batch Inference

Mistral supports batch inference for processing multiple requests asynchronously, which can be used with chat completions and other endpoints at reduced cost.

## Events

The provider does not support webhooks or event subscriptions through its public API. There is no mechanism for receiving push notifications about API events such as fine-tuning job completion. Job status must be checked by polling the relevant API endpoints.
