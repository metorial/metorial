# Slates Specification for GroqCloud

## Overview

GroqCloud is a cloud-based AI inference platform powered by Groq's custom Language Processing Units (LPUs), providing OpenAI-compatible API endpoints for running open-source language models with ultra-low latency. It is an AI infrastructure company that delivers ultra-low-latency inference through a novel hardware-software architecture built specifically for large-scale language model deployment, using a custom Language Processing Unit (LPU) designed from the ground up to optimize for deterministic, high-throughput AI inference. The platform currently supports a broad range of open-source language models—including LLaMA, DeepSeek, Qwen, and Mistral—as well as speech-to-text and text-to-speech capabilities.

## Authentication

GroqCloud uses **API key** authentication. Requests are authenticated by passing the API key in the `Authorization: Bearer` header to the base URL `https://api.groq.com/openai/v1`.

To obtain an API key:

1. Navigate to the Groq Cloud Console. If you don't have an account, sign up and complete the registration process.
2. In the API Keys section, click "Create API Key", provide a descriptive name, and click "Submit" to generate the key.
3. Copy the key immediately and store it securely — for security reasons, you won't be able to view the full API key again after leaving the page.

Only team owners or users with the developer role may create or manage API keys. Groq binds API keys to the organization, not the user.

There is no OAuth2 flow or additional scopes. Authentication is solely via the API key.

## Features

### Text Generation (Chat Completions & Responses)

Generating text with Groq's Chat Completions API enables natural, conversational interactions with large language models. It processes a series of messages and generates responses for applications including conversational agents, content generation, task automation, and generating structured data outputs like JSON. Groq also offers a Responses API (beta) as an alternative interface. Key configuration options include model selection, temperature, top_p, max tokens, stop sequences, system messages, and streaming via server-sent events. Groq Compound is an AI system that intelligently uses built-in tools like web search and code execution to answer user queries.

### Structured Outputs

Structured Outputs ensures model responses conform to a provided JSON Schema. With `strict: true`, the model uses constrained decoding to guarantee output always matches the schema exactly, with 100% schema adherence. A simpler JSON Object mode is also available for models that don't support strict schema enforcement.

### Tool Use / Function Calling

Tool use (or function calling) transforms a language model from a conversational interface into an autonomous agent capable of taking action, accessing real-time information, and solving complex multi-step problems. Three patterns are supported:

- **Built-in tools**: Groq maintains pre-built tools like web search, code execution, and browser automation that execute entirely on Groq's infrastructure, requiring minimal configuration and no tool orchestration.
- **Remote tools (MCP)**: Groq supports MCP tool discovery and execution server-side. You provide an MCP server configuration, and Groq's servers connect, discover available tools, pass them to the model, and execute tool calls — all in a single API call.
- **Local tool calling**: For maximum control, you define functions and tool definitions locally. The model returns structured tool call requests specifying which function to call and what arguments to use, and you execute them in your own environment.

### Speech-to-Text (Transcription & Translation)

Groq API provides a fast speech-to-text solution with OpenAI-compatible endpoints for near-instant transcriptions and translations. Uses Whisper models (whisper-large-v3 and whisper-large-v3-turbo). Supported audio formats include flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, and webm. Configuration options include language hint (ISO-639-1), prompt for context, response format (json, text, verbose_json), and temperature.

### Text-to-Speech

The speech endpoint provides fast text-to-speech (TTS), converting text to spoken audio. With support for English and Arabic voices, you can create life-like audio content for customer support agents, game characters, narration, and more. Configurable parameters include model, voice, and response format (e.g., wav). Some models support vocal direction tags (e.g., `[cheerful]`) embedded in the input text.

### Vision / Image Understanding

Multimodal models are available that can process both text and image inputs, supporting multilingual, multi-turn conversations, tool use, and JSON mode. Images can be provided as base64-encoded data or URLs within chat completion messages.

### Reasoning

Models that support reasoning (e.g., DeepSeek R1 distilled models, GPT-OSS models, Qwen3) can include chain-of-thought reasoning in responses. Reasoning effort can be configured per model — for example, Qwen3 supports 'none' and 'default', while GPT-OSS models support 'low', 'medium', or 'high'. Reasoning output can be included or excluded from responses.

### Content Moderation

User prompts can include harmful or policy-violating content, and safeguard models can be used for content moderation — detecting and filtering harmful or unwanted content in user prompts and model responses. Multiple models are available, including GPT-OSS-Safeguard 20B, a policy-following model that interprets and enforces your own written standards, enabling bring-your-own-policy Trust & Safety AI.

### Batch Processing

The Batch API allows processing large-scale workloads asynchronously by submitting thousands of API requests as a batch, with 50% lower cost, no impact to standard rate limits, and a 24-hour to 7-day processing window. Supports chat completions, audio transcriptions, and audio translations. Input is provided as a JSONL file.

### Model Listing

Hosted models are accessible through the Models API endpoint, and you can retrieve a JSON list of all active models. Models are categorized as production, preview, or deprecated.

## Events

The provider does not support webhooks or event subscriptions. Batch processing completion can be checked via polling-based status updates, but there is no dedicated webhook or event subscription system available through the API.
