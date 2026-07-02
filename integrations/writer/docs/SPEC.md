Let me search specifically for the Writer.com AI platform API documentation.Now let me check more details about Writer's specific API features like vision, tools, and web search:Now I have comprehensive information about Writer's API. Let me compile the specification.

# Slates Specification for Writer

## Overview

Writer is an enterprise AI platform built around its proprietary Palmyra family of large language models. It provides APIs for text generation, chat completions, knowledge management (Knowledge Graph), file handling, image analysis, and the ability to invoke no-code agents as microservices. Writer also offers AI Studio, a full-stack platform for building, deploying, and managing AI agents.

## Authentication

Writer uses token-based authentication for API requests. API keys are used as Bearer tokens, passed in the `Authorization` header of requests in the format:

```
Authorization: Bearer <WRITER_API_KEY>
```

API keys are created and managed from the AI Studio Admin Settings under the API Keys section. API keys are attached to AI Studio API agents, and permissions are set at the agent level.

To obtain an API key:

1. Navigate to Admin Settings > API Keys in AI Studio, click the API agent tile, and click "Generate a new key." Give the key a name and click Generate.
2. Immediately copy and save the key securely after generation — you cannot view the key again after navigating away.

The Writer SDK client can automatically infer the API key from the `WRITER_API_KEY` environment variable, or it can be passed explicitly when initializing the client.

There is no OAuth2 flow; all API access is via API keys.

## Features

### Text Generation and Chat Completions

Generate text from prompts using Writer's Palmyra models. Supported models include palmyra-x5, palmyra-x4, palmyra-fin, palmyra-med, palmyra-creative, and palmyra-x-003-instruct. Two modes are available:

- **Text completion**: Generate text from a single prompt string.
- **Chat completion**: Generate responses from a conversation history (array of messages). Supports system, user, and assistant roles.

Key options include temperature, max tokens, top-p, stop sequences, streaming (via SSE), and structured output via JSON Schema response format (available with palmyra-x4 and palmyra-x5).

### Tool Calling

The chat completion API supports tool calling, allowing the model to invoke external functions during a conversation. Built-in tool types include:

- **Custom functions**: Define function signatures and let the model generate arguments to call them.
- **Knowledge Graph**: Query a Knowledge Graph within a chat for RAG-based responses.
- **Vision**: Analyze images within a chat conversation.
- **Model delegation**: Use another LLM as a tool within a chat.
- **Translation**: Translate text within a chat.
- **Web search**: Perform web searches within a chat.

You can force the model to call a specific tool using a JSON object, e.g., `{"type": "function", "function": {"name": "my_function"}}`.

### Knowledge Graphs

A Knowledge Graph is a collection of files used to answer questions. Through the API you can:

- Create, list, retrieve, update, and delete Knowledge Graphs.
- Add and remove files from a Knowledge Graph.
- Query a Knowledge Graph to get AI-generated answers grounded in your uploaded data, with inline citations.
- Associate Knowledge Graphs with no-code agents.
- Connect a Knowledge Graph to Confluence, SharePoint, Google Drive, Notion, web pages, or manually uploaded files.
- Supported file types include PDF, TXT, DOC/DOCX, PPT/PPTX, EML, HTML, SRT, CSV, and XLS/XLSX.

### No-Code Agents (Applications API)

The Applications API allows you to turn deployed no-code agents into microservices, which can also be used as tools in tool calling. You can:

- Invoke text generation agents and research agents programmatically by providing defined inputs.
- Run agents asynchronously.
- The endpoint supports only agents with text generation and research capabilities. It does not support chat agents.

### File Management

Upload, retrieve, list, and delete files. Files can be used with Knowledge Graphs or passed as inputs to agents. The API also supports PDF parsing to extract structured content from PDF documents.

### Image Analysis

Analyze images by passing image URLs or uploaded image data. This can be used standalone or as a tool within chat completions to enable vision capabilities in conversations.

### Web Search

Perform web searches either as a standalone capability or as a tool integrated into chat completions, allowing the model to access real-time web information when generating responses.

### Guardrails

Configure content safety policies including toxic content detection, PII protection, and compliance enforcement across AI agents.

## Events

The provider does not support events. Writer's API does not offer webhooks, event subscriptions, or purpose-built polling mechanisms for receiving real-time notifications about changes or activities.
