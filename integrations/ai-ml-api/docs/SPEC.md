# Slates Specification for AI/ML API

## Overview

AI/ML API is a unified gateway to Chat, Reasoning, Image, Video, Audio, Voice, Search, and 3D models under one bill. As of early 2026, the platform provides access to more than 400 models from providers like OpenAI, Google, Anthropic, Meta, DeepSeek, and others. The API is fully backward-compatible with OpenAI's API, allowing drop-in replacement by changing the base URL and API key.

## Authentication

AI/ML API uses **API key authentication** via Bearer tokens.

To use the AI/ML API, an API key is required. This key is essential for authenticating requests to the API. API keys can be easily generated and managed through the account dashboard.

- **Method**: Bearer token in the `Authorization` header.
- **Header format**: `Authorization: Bearer <YOUR_AIMLAPI_KEY>`
- **Base URL**: `https://api.aimlapi.com/v1` (also supports `https://api.aimlapi.com/v2`)
- **Key management**: You can find your AIML API key on the account page. An AIML API key is a credential that grants you access to the API from your code. It is a sensitive string that is shown only at creation time and should be kept confidential. Do not share this key with anyone. If you lose it, generate a new key from your dashboard.
- API keys from third-party organizations (e.g., OpenAI keys) cannot be used with this API — you need an AIML API Key.

No OAuth2 or other authentication methods are supported. There are no scopes or tenant IDs required.

## Features

### Text Generation (LLMs)

Supports completion and chat completion, streaming mode, code generation, thinking/reasoning, function calling, vision in text models (image-to-text), and web search. Models include GPT, Claude, Gemini, DeepSeek, Qwen, Llama, and many others. You specify the model by its ID (e.g., `gpt-4o`, `deepseek/deepseek-r1`). Supports system/developer/user/assistant message roles, temperature, max tokens, stop sequences, structured output (JSON mode), and seed for reproducibility. Not all models support all capabilities — every chat model includes a features list that clearly shows what the model can do.

### Image Generation

Generate images from text prompts or edit existing images. Image models are available from multiple developers. Supports models like Flux, Stable Diffusion, DALL-E, and others. Output options include various resolutions and aspect ratios depending on the model.

### Video Generation

Dedicated Text-to-Video and Image-to-Video APIs offer flexible entry points for both concept-driven storytelling and visual iteration. Supports models from providers like Kling AI, MiniMax, and others. Video generation is typically asynchronous — you submit a request and retrieve results later.

### Music Generation

Generate music from text prompts. Supports multimodal inputs, diverse genres, and neural audio synthesis for media, gaming, and entertainment applications. Includes models from MiniMax, Google (Lyria 2), and others.

### Voice and Speech

- **Speech-to-Text**: Speech-to-text models convert spoken language into written text, enabling voice-based interactions. Supports models from OpenAI (Whisper), Deepgram (Nova-2), and Assembly AI. Generated audio transcriptions are stored on the server for 1 hour from the time of creation.
- **Text-to-Speech**: Convert text to spoken audio using models from Deepgram (Aura), ElevenLabs, and Microsoft. Supports 120+ languages and low-latency inference.

### Content Moderation

Use content moderation models to classify input content as safe or unsafe instantly. Supports text analysis, image analysis, both image URLs and base64 encoded images, and analyzing multiple images in a single request. Uses Meta's Llama Guard models.

### 3D Model Generation

3D-generating models create three-dimensional objects, environments, and textures based on input data such as text prompts, reference images, or existing 3D models. Supports text-to-3D generation, image-to-3D conversion, and mesh and texture generation. Currently limited to a small number of models (e.g., TripoSR by Stability AI).

### Vision and OCR

Analyze images using vision-capable models. Includes optical character recognition (OCR) via Google OCR and Mistral OCR, as well as optical feature recognition (OFR) for structured data extraction from images.

### Embeddings

Generate text embeddings for semantic search, similarity analysis, and other downstream tasks. Supports embedding models from Anthropic (Voyage), and others.

### AI Search Engine

AI Web Search Engine is designed to retrieve real-time information from the internet. This solution processes user queries and returns relevant data from various online sources. Uses specialized API endpoints, each designed to search for only one specific type of information. These endpoints return structured responses, making them more suitable for integration into specialized services. Also available as a general chat completion with web search capability.

### OpenAI Assistants

Create tailored AI Assistants capable of handling customer support, data analysis, content generation, and more. Compatible with the OpenAI Assistants API format.

### Realtime API

The Realtime API works through a combination of client-sent events and server-sent events. Clients can send events to update session configuration or send text and audio inputs. Server events confirm when audio responses have completed, or when a text response from the model has been received. Used for real-time voice and text interaction via WebSocket.

## Events

AI/ML API supports **webhooks** for asynchronous operations, following the same pattern as OpenAI's webhook system.

### Response Events

Triggered when background (asynchronous) responses complete or fail. The SDK supports unwrapping webhook payloads and verifying that the webhook was sent from AI/ML API. Event types include:

- `response.completed` — A background response has been completed.
- `response.failed` — A background response has failed.

Webhook endpoints are configured with a URL and a signing secret for signature verification. The webhook payload includes the event type, event ID, timestamp, and associated resource ID.
