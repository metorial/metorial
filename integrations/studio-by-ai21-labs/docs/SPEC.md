# Slates Specification for Studio By Ai21 Labs

## Overview

AI21 Studio is a platform by AI21 Labs that provides API access to their Jamba family of large language models and the Maestro AI orchestration system. The product suite includes Jamba foundation models for long-context Q&A, RAG, and summarization; Maestro for agent orchestration and automating enterprise tasks; and task-specific APIs for specialized language processing. Task-specific APIs cover capabilities such as paraphrasing, summarization, text segmentation, grammatical error corrections, text improvements, and contextual answers.

## Authentication

Studio by AI21 Labs uses API keys for authentication.

To obtain an API key:

1. Go to https://studio.ai21.com/sign-up to create an account.
2. In your AI21 Labs account, navigate to the API Keys section. Locate your API key. If you don't have one or need to regenerate it, you can do so in this section.

The API key is passed as a Bearer token in the `Authorization` header:

```
Authorization: Bearer <YOUR_API_KEY>
```

The API base URL is `https://api.ai21.com/studio/v1/`.

Only one active API key is allowed per account.

## Features

### Chat Completions (Jamba Models)

The Jamba API provides access to a set of instruction-following chat models for conversational interactions. Available models include `jamba-large` and `jamba-mini` in various versioned variants. They feature the longest context window (256K tokens) among open models.

- Supports system, user, and assistant message roles for multi-turn conversations.
- JSON mode can be activated by setting the response format to `{ "type": "json_object" }`, ensuring the output adheres to valid JSON structure.
- Models support function calling and tool use, structured document objects, and citation mode.
- Configurable parameters include temperature, top_p, max_tokens, frequency_penalty, and presence_penalty.
- Streaming is supported for the Chat Completions API.

### Maestro (AI Agent Orchestration)

AI21 Maestro is an AI system for rapidly creating and deploying RAG agents that automate data-intensive business tasks. At its core is a new type of agent intelligence, optimized to find the smartest way to search, reason, validate, and adapt in real time.

- Maestro is model-agnostic and can orchestrate tasks using AI21's first-party models or third-party models (OpenAI, Anthropic, Google). You can specify which model to use or let Maestro automatically select the most suitable one.
- Supports bring-your-own-key (BYOK) for accessing external models securely.
- You can save agents and reuse them in future API calls without redefining their configuration. A saved agent stores its name, instructions, tools, and configuration.
- A compute-budget slider lets you control how much reasoning power to invest in each task.
- Every result includes an execution trace and a structured validation report showing how the system performed against stated requirements.

### Conversational RAG

Allows building conversational experiences that interact with organizational documents. Supports uploading documents in PDF, TXT, DOCX, or markdown formats, and AI21 automatically indexes them.

- Supports multi-turn conversations with context maintained across messages.
- Documents can be filtered by labels when querying.
- Uses planning to assess each incoming query, determining whether it can answer from the LLM's intrinsic knowledge or whether it should turn to the RAG Engine.

### Document Library (File Management)

Allows uploading and managing files that can be used with Conversational RAG and other features.

- Files can be uploaded with a file path, labels, and an optional public URL.
- Files can be retrieved, listed, and managed through the library API.
- Labels allow organizing and filtering documents for targeted retrieval.

### Task-Specific APIs (Jurassic-2 Models)

Specialized APIs for common language processing tasks, powered by the Jurassic-2 model family:

- **Summarization**: Takes a piece of text or fetches text from a given URL and generates grounded summaries that remain faithful to the original document.
- **Summary by Segment**: Takes text or a URL and breaks it into logical segments, returning summarized content for each segment rather than one overall summary.
- **Paraphrase**: Generate alternative phrasings of input text in various styles (e.g., general, formal, casual).
- **Text Improvements**: Analyzes text and suggests improvements for fluency, vocabulary, and specificity. Configurable improvement types.
- **Text Segmentation**: Breaks down long pieces of text into paragraphs segmented by distinct topic.
- **Grammatical Error Corrections**: Detects and suggests fixes for grammar issues.
- **Contextual Answers**: Answers questions based on a provided context/document.

### Text Completions (Jurassic-2 Models)

All Jurassic-2 models (j2-light, j2-mid, j2-ultra) can be used for text completion tasks. These are general-purpose text generation models that accept a prompt and return completions.

- Configurable parameters include temperature, top_p, max_tokens, number of results, and stop sequences.

## Events

The provider does not support events. AI21 Studio's API is request-response based and does not offer webhooks or event subscription mechanisms.
