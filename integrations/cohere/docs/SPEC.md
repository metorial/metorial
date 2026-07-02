# Slates Specification for Cohere

## Overview

Cohere is an AI platform that provides access to large language models (LLMs) through an API for natural language processing tasks. Its Command, Embed, Rerank, and Aya models support applications ranging from semantic search and content generation to retrieval augmented generation (RAG) and agents. At its heart, Cohere is an AI platform that provides access to a suite of large language models through an API, focused on enterprise use cases.

## Authentication

Cohere uses **Bearer token authentication** via API keys. The content of the Authorization header should be in the shape of `Bearer [API_KEY]`.

**Obtaining an API Key:**

To generate a Cohere API key, go to the API Keys section of your Cohere dashboard at `https://dashboard.cohere.com/api-keys`.

**Key Types:**

You will see choices differentiating between key types, most notably "Trial Key" and "Production Key". For initial testing and learning, select the option to generate a Trial Key.

- **Trial Key**: Free, intended for experimentation. Has a monthly cap of 1,000 total API calls and lower per-minute rate limits. Cannot be used for production applications.
- **Production Key**: Pay-as-you-go, token-based pricing. No monthly call cap and significantly higher rate limits. For Production API, you need Owner permissions.

**Base URL:** `https://api.cohere.com`

**Example header:**

```
Authorization: Bearer {your_api_key}
```

There are no OAuth2 flows, scopes, or additional credentials required for standard API access. Authentication is solely via the API key passed as a Bearer token.

## Features

### Chat / Text Generation

The Command family of models (Command A, Command R7B, Command A Translate, Command A Reasoning, Command A Vision, Command R+, Command R) are text-generation LLMs powering tool-using agents, RAG, translation, copywriting, and similar use cases. The Chat API supports multi-turn conversations with system prompts, configurable parameters like temperature, max tokens, stop sequences, frequency penalty, and seed for reproducibility. The Chat API is capable of streaming events (such as text generation) as they come, meaning partial results from the model can be displayed within moments.

- **Retrieval Augmented Generation (RAG):** Documents can be passed directly in the request to ground model responses in provided context, with inline citations generated automatically.
- **Tool Use:** The models can integrate with external APIs, databases, and services to access real-time information and perform actions beyond text generation. This capability turns simple language models into intelligent agents. Tools are defined using JSON schema.
- **Reasoning:** Command A Reasoning is a hybrid reasoning model designed to excel at complex agentic tasks, with 111 billion parameters and a 256K context length. Thinking can be enabled/disabled, and a token budget can be set to limit reasoning tokens.
- **Vision:** Command A Vision brings enterprise-grade vision capabilities, supporting text + image processing, with up to 20 images per request and a 128K token context length.
- **Translation:** Command A Translate is Cohere's machine translation model, achieving state-of-the-art performance across 23 languages.

### Text Embeddings

The Embed endpoint returns text embeddings — lists of floating point numbers that capture semantic information about the text. Embeddings can be used to create text classifiers as well as empower semantic search.

- Supports text and image inputs.
- Input types include `search_document` (for vector DB storage), `search_query` (for search queries), `classification`, and `clustering`.
- Output embedding dimensionality can be configured (256, 512, 1024, or 1536) for embed-v4 and newer models.
- Multiple embedding formats available: float, int8, uint8, and binary.

### Batch Embedding Jobs

The Embed Jobs API is designed for users who want to leverage retrieval over large corpora. It is much better suited for encoding a large number (100K+) of documents asynchronously. The Embed Jobs API also stores the results in a hosted Dataset so there is no need to store the result of your embeddings locally.

### Reranking

The Rerank endpoint takes in a query and a list of texts and produces an ordered array with each text assigned a relevance score. It can be used to improve the quality of any existing search system by re-ordering results based on semantic relevance.

- Configurable `top_n` to limit the number of returned results.
- Rerank accepts full strings rather than tokens, and will automatically chunk documents longer than 510 tokens.

### Dataset Management

The Cohere platform allows you to upload and manage datasets that can be used in batch embedding with Embedding Jobs. Datasets can be managed in the Dashboard or programmatically using the Datasets API.

- Supports CSV and JSONL file formats.
- Metadata can be preserved via `keep_fields` or `optional_fields`.
- Datasets are automatically deleted after 30 days, but they can also be deleted manually.

### Fine-Tuning (Deprecated)

All fine-tuning options via dashboard and API for models including command-light, command, command-r, classify, and rerank are being retired. Previously fine-tuned models will no longer be accessible. The fine-tuning API allowed creating custom models trained on user-provided datasets with configurable hyperparameters and Weights & Biases integration for monitoring.

### Tokenization

The Tokenize endpoint splits input text into smaller units called tokens using byte-pair encoding (BPE). A corresponding Detokenize endpoint converts tokens back to text. Useful for cost estimation and understanding model input processing.

### Model Listing

The API provides endpoints to list available models and retrieve details about specific models, including supported features and endpoints.

### Connectors (Deprecated)

Connectors allowed registering external data sources that the Chat API could query during RAG. They supported bearer token authentication and OAuth 2.0 for accessing underlying data sources. This feature is deprecated in API v2.

## Events

The provider does not support events. Cohere's API is a stateless request-response service for AI model inference and does not offer webhooks, event subscriptions, or any push-based notification mechanism.
