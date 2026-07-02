Let me get more details on the authentication and webhook specifics.Now let me get details on the webhook and deep research features:Now I have enough information to write the specification.

# Slates Specification for Jigsawstack

## Overview

JigsawStack is a unified AI API platform that provides purpose-built small models for tasks such as web scraping, OCR, translation, sentiment analysis, speech-to-text, image generation, and content validation. It offers 40+ AI-powered APIs accessible through a single API key and base URL (`https://api.jigsawstack.com`), with support for 160+ languages.

## Authentication

JigsawStack uses API key authentication. Attach the header parameter `x-api-key` with the API key obtained from your dashboard.

- **Obtaining a key**: Navigate to the Keys tab in the JigsawStack Dashboard. Click on the "+ Create new key" button to create a new API key. Copy the API key and securely store it in your environment variables. When creating a key, it will only be revealed once.

- **Key types**: The JigsawStack API has two types of API keys: secret and public. Secret API keys are great for backend services. A secret key can access all APIs without any restrictions. Your secret API key should never be public, shared or exposed in a github repository. Public API keys are ideal for frontend applications, allowing direct API calls from the client side. However, it's important to set public key restrictions for added security.

- **Public key restrictions**: API access — limits public key access to the specified APIs. Whitelist domains(routes) — restrict public key access to the specified domains. Domain whitelisting is recommended when creating public API keys.

- **Passing the key**: Include the API key as an `x-api-key` header on every request. You can also add `x-api-key` as a query parameter, but this only works for public API keys.

- **Base URL**: `https://api.jigsawstack.com`

Example header:

```
x-api-key: <your-api-key>
```

## Features

### AI Web Scraping

Intelligently scrape any website using natural language prompts to extract structured data. You provide a URL and element prompts describing what data you want, and the API returns structured results consistently across different sites.

- **Parameters**: URL to scrape, element prompts (natural language descriptions of desired data).

### Web Search & Deep Research

AI-powered web search that returns structured results with AI-generated overviews. Deep research provides more comprehensive investigation of a topic.

### Text Analysis

Analyze and process text content including:

- **Sentiment Analysis**: Determine positive, negative, or neutral sentiment of text with a confidence score.
- **Summarization**: Generate concise summaries from longer text.
- **Translation**: Translate text between 160+ languages with context awareness. Supports batch translation of multiple strings.
- **Spell Check**: Detect and correct spelling errors in text.

### Text to SQL

Convert natural language queries into SQL statements. Requires providing a SQL schema for context.

### Time Series Prediction

Forecast future values based on historical data points.

### Computer Vision

- **vOCR (Vision OCR)**: Extract structured data from images using prompts that specify what fields to extract (e.g., "total_price", "tax" from a receipt image). Accepts image URLs or uploaded file keys.
- **Object Detection**: Identify and locate objects within images.

### Audio Processing

- **Speech to Text**: Transcribe audio/video files to text. Supports speaker diarization (separating text by speaker), language detection, translation of recognized text, and chunked timestamps. Accepts URLs to audio/video files or uploaded file keys.
- This is a long-running operation that supports webhook callbacks for asynchronous result delivery.

### Image Generation

Generate images from text prompts. Supports multiple model backends (Flux, Stable Diffusion, SDXL-Fast, and others).

### HTML to Any

Convert HTML content to various output formats (e.g., PDF, images).

### Content Validation

- **NSFW Detection**: Detect not-safe-for-work content in images.
- **Profanity Detection**: Filter and identify inappropriate language in text.
- **Spam Detection**: Identify spam content in text.

### Classification

Classify text into custom categories that you define.

### File Management

Upload, retrieve, and delete files in JigsawStack's built-in cloud file storage. Uploaded files can be referenced by their file key in other API calls (e.g., for vOCR or speech-to-text processing).

### Geo Search

Search for addresses, places, and points of interest. Includes geocoding capabilities.

### Search Suggestions

Get autocomplete/suggestion results for search queries.

### Embedding

Generate text embeddings for use in semantic search, clustering, and other vector-based operations.

## Events

Webhooks are used to push real-time data to you about changes (updates) to certain API requests. All webhooks use HTTPS and deliver a JSON payload that can be used by your application.

JigsawStack has built-in webhook support for long-running tasks. Webhooks are not event subscriptions in the traditional sense — instead, you provide a `webhook_url` parameter when making an API request for a long-running operation, and JigsawStack will POST the result to that URL when processing completes.

### Long-Running Task Completion

When invoking APIs that involve long-running processing (e.g., speech-to-text transcription), you can include a `webhook_url` in the request body. JigsawStack will send the completed result as a JSON payload to that URL via HTTP POST once the task finishes.

- **Parameters**: `webhook_url` — the HTTPS endpoint where results should be delivered.
- Webhooks are not secured by default. You can secure them by generating an HMAC key, attaching it as a query parameter in the webhook URL, and verifying it on your server.

### Log Webhooks

Webhook notifications can also be configured at the dashboard level for API log events. To enable webhooks for logs, go to the Settings tab in your dashboard and select Webhook.
