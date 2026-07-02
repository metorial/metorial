Now I have enough information to write the specification.

# Slates Specification for Ollama

## Overview

Ollama is an open-source platform for running large language models locally or via its cloud service at ollama.com. It provides a REST API for text generation, chat completions, embeddings, and model management. It also offers OpenAI-compatible and Anthropic-compatible API endpoints.

## Authentication

Ollama supports two deployment modes with different authentication approaches:

### Local Server (Self-Hosted)

After installation, Ollama's API is served by default at `http://localhost:11434/api`. By default, the local Ollama server requires no API key. The local API is open and unauthenticated out of the box. Users who wish to secure their local instance must use an external reverse proxy.

### Ollama Cloud (ollama.com)

For direct access to ollama.com's API served at `https://ollama.com/api`, authentication via API keys is required.

First, create an API key, then set the `OLLAMA_API_KEY` environment variable. The API key is passed as a Bearer token in the `Authorization` header:

```
Authorization: Bearer <OLLAMA_API_KEY>
```

API keys don't currently expire, however you can revoke them at any time in your API keys settings.

Users can also sign in from their local installation using `ollama signin`, and Ollama will automatically take care of authenticating requests to ollama.com when running commands.

## Features

### Text Generation

Generate text completions from a prompt using a specified model. Supports configurable parameters such as temperature, system prompt, and prompt template overrides. Responses can be streamed as JSON objects or returned as a single response by setting `stream: false`. Supports multimodal inputs (images) for vision-capable models.

### Chat Conversations

Maintain conversational interactions by providing a history of messages with user, assistant, system, and tool roles. Supports the same model parameters and streaming options as text generation. Multimodal content (text and images) can be included in messages.

### Tool Calling (Function Calling)

Ollama supports tool calling (also known as function calling) which allows a model to invoke tools and incorporate their results into its replies. Tools are defined using JSON Schema format. Supports single-shot and parallel tool calls. Tool calling support depends on the model being used; not all models support it. Streaming of tool calls is also supported.

### Structured Outputs

Structured outputs are supported by providing a JSON schema in the `format` parameter. The model will generate a response that matches the schema. This works with both the generate and chat endpoints. Can also be used with vision models for structured image analysis.

### Embeddings

Generate vector embeddings from text using a specified model. Useful for semantic search, clustering, and retrieval-augmented generation (RAG) applications.

### Model Management

Manage models programmatically through the API:

- **List models**: Retrieve all locally available models and currently running/loaded models.
- **Pull models**: Download models from the Ollama library.
- **Push models**: Upload custom models to the Ollama model library (requires an ollama.com account).
- **Create models**: Create new models from a Modelfile, including quantization of existing models and customization of system prompts, parameters, and templates.
- **Copy models**: Duplicate a model under a new name.
- **Delete models**: Remove models from local storage.
- **Show model details**: Retrieve model metadata including details, modelfile, template, and license information.

### OpenAI-Compatible API

Ollama provides compatibility with parts of the OpenAI API to help connect existing applications to Ollama. Available at `/v1/` prefix, it supports chat completions, text completions, embeddings, and the Responses API. This enables drop-in compatibility with applications and libraries built for OpenAI's API. Tool calling is also supported through this compatibility layer.

### Image Generation

This endpoint is experimental and may change or be removed in future versions. Generate images using image generation models via the OpenAI-compatible `/v1/images/generations` endpoint.

## Events

The provider does not support events. Ollama does not offer webhooks or purpose-built polling mechanisms for subscribing to changes or notifications.
