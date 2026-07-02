# Slates Specification for OpenAI

## Overview

OpenAI provides a cloud-based AI platform offering access to large language models, image generation models, audio models, video generation models, and embedding models through a REST API. The OpenAI API provides a simple interface to state-of-the-art AI models for text generation, natural language processing, computer vision, and more. The API base URL is `https://api.openai.com/v1/`.

## Authentication

OpenAI uses **API key authentication** exclusively. The OpenAI API uses API keys for authentication. API keys should be provided via HTTP Bearer authentication.

To authenticate, include the API key in the `Authorization` header:

```
Authorization: Bearer $OPENAI_API_KEY
```

Create, manage, and learn more about API keys in your organization settings. API keys are project-scoped. OpenAI's authentication model is built around project-scoped API keys and service accounts, marking a shift from older user-bound API keys toward a structure that provides better isolation, key rotation, and auditing.

**Optional headers for multi-organization/project access:**

If you belong to multiple organizations or access projects through a legacy user API key, pass a header to specify which organization and project to use for an API request. Use the following headers:

- `OpenAI-Organization: $ORGANIZATION_ID` — required if you belong to multiple organizations; otherwise, leave this blank.
- `OpenAI-Project: $PROJECT_ID` — to route usage to a specific project.

Organization IDs can be found on your organization settings page. Project IDs can be found on your general settings page by selecting the specific project.

## Features

### Text Generation (Responses API & Chat Completions)

The Responses API acts as the main gateway to all major model families and runtime tools. It provides a unified request format that supports text generation, tool invocation, file retrieval, and function execution within a single session context. Key options include model selection (e.g., GPT-5.2, GPT-5, GPT-5 mini), temperature, max tokens, structured output (JSON Schema), and reasoning effort for reasoning models. Supports streaming via server-sent events. Background mode enables long-running responses without holding a client connection open.

- Chat Completions is the legacy alternative to the Responses API, still widely supported.
- Function/tool calling allows models to invoke developer-defined functions or built-in tools.
- The built-in support for Web Search, File Search, and Code Interpreter transforms the API into a compositional platform.

### Image Generation

Image generation as a tool in the Responses API enabled image creation as part of multi-turn conversations, in combination with other tools. Also available as a standalone endpoint for generating images from text prompts, editing existing images, and creating variations.

### Audio (Speech & Transcription)

The API supports text-to-speech (generating spoken audio from text), speech-to-text transcription, and audio translation. Multiple voices and audio formats are available.

### Realtime API

The Realtime API extends the OpenAI platform into real-time, event-driven domains, allowing models to process and generate voice input and output with negligible latency. The Realtime API allows clients to connect directly to the API server via WebRTC or SIP. Supports speech-to-speech conversations with configurable modalities (audio, text), turn detection, and noise reduction.

### Video Generation

The Video API exposed video generation and editing via v1/videos, making video a first-class modality in the API alongside text, images, and audio.

### Embeddings

The text-embedding-3 family underpins modern approaches to search, retrieval-augmented generation (RAG), and semantic indexing. Available models include `text-embedding-3-small` and `text-embedding-3-large`. Configurable output dimensions allow trading off quality for size.

### Fine-Tuning

Allows customizing models on your own training data using supervised fine-tuning or direct preference optimization. Fine-tune GPT-4o with images and text to improve vision capabilities. Configurable hyperparameters include number of epochs, batch size, and learning rate multiplier.

### Evaluations

Create and run custom evaluations to measure model performance on specific tasks. Supports various grader types (model-based, programmatic) for automated quality assessment.

### Content Moderation

Classifies text and images against OpenAI's content policy categories. Useful for filtering harmful content in user-generated input.

### Vector Stores

Managed vector storage for uploading, chunking, and searching files. Supports file search with configurable ranking and hybrid search (semantic + keyword). Used in combination with the file search tool in the Responses API.

### File Management

Upload and manage files for use with fine-tuning, vector stores, and other features. Supports multipart uploads for large files.

### Batch Processing

Submit large collections of API requests to be processed asynchronously at lower cost. Supports chat completions, embeddings, and fine-tuned model requests.

### Conversations & State Management

Conversation state (plus the Conversations API) for durable threads and replayable state. Enables persistent multi-turn conversations without manually managing message history.

### Administration

Admin and Audit Log APIs allow customers to programmatically administer their organization and monitor changes using audit logs. Manage users, projects, service accounts, API keys, invitations, and role assignments programmatically.

## Events

OpenAI supports webhooks for receiving notifications about asynchronous operations. You configure a name for the endpoint, a public URL to a server you control, and one or more event types to subscribe to. When they occur, OpenAI will send an HTTP POST request to the URL specified. Webhooks are configured per-project. After creating a new webhook, you'll receive a signing secret to use for server-side verification of incoming webhook requests. Webhooks follow the standard-webhooks specification.

### Background Response Events

Notifications for background (async) model responses:

- `response.completed` — Sent when a background response has been completed.
- `response.failed` — Sent when a background response has failed.
- `response.cancelled` — Sent when a background response has been cancelled.

### Batch Events

Notifications for batch API job lifecycle changes:

- `batch.completed` — Sent when a batch API request has been completed.
- `batch.failed` — Sent when a batch API request has failed.
- `batch.cancelled` — Sent when a batch API request has been cancelled.
- `batch.expired` — Sent when a batch API request has expired.

### Fine-Tuning Job Events

Notifications for fine-tuning job lifecycle changes:

- `fine_tuning.job.succeeded` — Sent when a fine-tuning job has succeeded.
- `fine_tuning.job.failed` — Sent when a fine-tuning job has failed.
- `fine_tuning.job.cancelled` — Sent when a fine-tuning job has been cancelled.

### Eval Run Events

Notifications for evaluation run lifecycle changes:

- `eval.run.succeeded` — Sent when an eval run has succeeded.
- `eval.run.canceled` — Sent when an eval run has been canceled.

### Realtime Call Events

- `realtime.call.incoming` — Sent when Realtime API receives an incoming SIP call. Includes the call ID and SIP headers from the invite.
