# Slates Specification for AssemblyAI

## Overview

AssemblyAI is a Speech AI platform that provides APIs for speech-to-text transcription (both async and real-time streaming), audio intelligence models (summarization, sentiment analysis, entity detection, etc.), and an LLM Gateway for applying large language models to transcribed speech data. It offers models for converting audio files, video files, and live speech into text, an LLM Gateway framework for applying LLMs to spoken data, and models for interpreting audio for business and personal workflows.

## Authentication

AssemblyAI uses **API key authentication**. To make authorized calls to the REST API, your app must provide an authorization header with an API key, which can be found in the AssemblyAI dashboard.

The API key is passed via the `Authorization` HTTP header:

```
Authorization: YOUR_API_KEY
```

Keep your API key secure and do not share it publicly. If you need to refresh your API key, you can do so from the dashboard. Your API key is required to authenticate all requests.

For **streaming (WebSocket) use in client-side applications**, AssemblyAI supports temporary authentication tokens to avoid exposing the main API key. You can generate a temporary authentication token for use with streaming services, with a configurable expiration time in seconds (1–600).

**Base URLs:**

- REST API: `https://api.assemblyai.com`
- For EU servers, replace `api.assemblyai.com` with `api.eu.assemblyai.com`. The EU endpoint for Streaming STT is `streaming.eu.assemblyai.com`.
- LLM Gateway: `https://llm-gateway.assemblyai.com`

No OAuth or other authentication methods are supported. Only API key authentication is used.

## Features

### Async Speech-to-Text Transcription

Transcribe pre-recorded audio and video files by submitting a URL or uploading the file directly. Core features include automatic language detection across 40+ languages, custom vocabulary support, and real-time/batch audio processing. Transcription is asynchronous — you submit a job and poll for completion or use a webhook.

- **Language options**: Specify a language code or enable automatic language detection. Supports 99+ languages. Code switching (multiple languages in one file) is supported.
- **Speaker diarization**: Identifies and labels different speakers within audio.
- **Advanced Speaker Identification**: Maps speaker clusters to real names or roles via the Speech Understanding API, using audio context and optional known values you provide.
- **Multichannel transcription**: Transcribe each audio channel separately.
- **Custom vocabulary / word boost**: Provide a list of specific words or terms to improve recognition accuracy.
- **Speech model selection**: Choose between different models (e.g., Universal, Slam-1) depending on accuracy and language needs.
- **Subtitle/caption generation**: Get transcripts formatted as SRT or VTT subtitles.
- **Paragraph and sentence segmentation**: Retrieve transcripts split into semantically meaningful paragraphs or sentences.

### Real-Time Streaming Speech-to-Text

Transcribe live audio streams in real-time via WebSocket connections. Provides partial (interim) and final transcripts as speech is detected.

- **Configurable sample rate** and audio encoding settings.
- **End-of-turn detection**: Configurable confidence thresholds and silence duration for detecting when a speaker finishes.
- **Temporary auth tokens**: Generate short-lived tokens for secure client-side streaming.
- Supports multilingual streaming with specific model selection.

### Audio Intelligence

A suite of models that run alongside transcription to extract insights, including: summarization, content moderation, sentiment analysis, entity detection, topic detection, auto chapters, key phrases, and PII redaction.

- **Summarization**: Choose summary types (bullets, bullets_verbose, gist, headline, paragraph) and models (informative, conversational, catchy).
- **Sentiment Analysis**: Detects positive, negative, and neutral sentiments in speech segments.
- **Entity Detection**: Supports 44 entity types to automatically identify and categorize key information in transcripts with timestamps.
- **Topic Detection**: Predicts topics spoken in audio using the standardized IAB Taxonomy.
- **Content Moderation**: Detects sensitive content with confidence and severity scores.
- **Auto Chapters**: Automatically segments transcripts into chapters with summaries.
- **Key Phrases**: Extracts key phrases from the transcript.
- **PII Redaction**: Automatically identifies and removes personally identifiable information from transcripts. Supports text redaction (hash or entity name substitution) and audio redaction (beeping out sensitive data). Configurable PII policies (names, credit cards, SSNs, etc.). Available in multiple languages.

### LLM Gateway

A unified interface that allows you to connect with multiple LLM providers including Claude, GPT, and Gemini to build sophisticated AI applications through a single API.

- Provides access to 15+ models with support for basic chat completions, multi-turn conversations, tool/function calling, and agentic workflows.
- Can be used standalone or combined with transcripts to apply LLMs to spoken data (summarization, Q&A, custom analysis).
- Unified billing and usage tracking across all providers.
- LLM Gateway is not currently supported in the EU.

### Speech Understanding

Pre-built, LLM-powered features that transform raw transcripts into structured, actionable data. Includes translation (99+ languages), advanced speaker identification, text normalization (dates, phone numbers, emails), and customizable summarization.

### File Upload

Upload local audio/video files to AssemblyAI's servers for transcription. You receive a URL that can only be used to transcribe using your API key, and once transcribed, the file is removed from AssemblyAI's servers.

### Transcript Management

List, retrieve, and delete transcripts. Deleting a transcript removes the data from the resource and marks it as deleted, but does not delete the resource itself.

## Events

AssemblyAI supports webhooks for asynchronous transcription notifications.

### Transcription Completed/Failed

When a transcript is ready, AssemblyAI sends a POST HTTP request to a URL you specify. AssemblyAI sends all webhook deliveries from fixed IP addresses. Two types of webhook requests are sent: one when a transcript is completed or failed, and one when redacted audio is ready (if PII audio redaction is enabled).

- **Webhook URL**: Specified per transcription request (via `webhook_url` parameter).
- **Authentication**: You can authenticate webhook deliveries by including a custom HTTP header name and value.
- **Custom metadata**: You can add your own query parameters to the webhook URL to associate metadata for a specific transcription request.
- **Retries**: If a webhook delivery fails, AssemblyAI will attempt to redeliver it up to 10 times, waiting 10 seconds between each attempt. If all attempts fail, the delivery is considered permanently failed.
