# Slates Specification for Griptape

## Overview

Griptape Cloud is a managed platform for building, deploying, and operating AI-powered applications. It provides managed services for your AI app stack, allowing you to deploy and scale end-to-end solutions, from LLM-powered data prep and retrieval to AI Agents, Pipelines, and Workflows. It offers features like Threads, Messages, Rules, Rulesets, Assistants, Knowledge Bases, and more, all accessible through a REST API with a Griptape Cloud API Key.

## Authentication

Griptape Cloud uses API key-based authentication via Bearer tokens.

- **API Key**: All features can be called via API with a Griptape Cloud API Key. API keys are generated and managed at `https://cloud.griptape.ai/configuration/api-keys`.
- **Base URL**: The base URL defaults to `https://cloud.griptape.ai`.
- **Authorization Header**: Requests are authenticated using a Bearer token in the `Authorization` header: `Authorization: Bearer <your API key>`.

Example:

```
curl -X POST \
  -H "Authorization: Bearer ${GT_CLOUD_API_KEY}" \
  --json '{"my_key": "my_value"}' \
  https://cloud.griptape.ai/api/tools/{tool_id}/activities/{activity_name}
```

The environment variable commonly used is `GT_CLOUD_API_KEY`. No OAuth2 or other authentication methods are documented.

## Features

### Assistants

Assistants are the quickest way to build chat applications connected to your data, with no need to provide credentials for your own LLM provider. They can be extended with a library of powerful tools, allowing them to interact with capabilities external to the LLM. Assistants can be configured with knowledge bases, rulesets, tools, and structures. Runs can be created against an assistant, optionally with a thread for conversation continuity and streaming support.

### Structures

Structures allow you to deploy and run your own customized components built using Griptape Structures or other Python code, from linear pipelines and flexible workflows to complete systems of autonomous agents. You can host your Python code using Structures whether it uses the Griptape Framework or not. Structure runs support streaming output via server-sent events (SSE).

### Knowledge Bases

Knowledge Bases are collections of Data Sources that your LLM-powered applications can retrieve information from. They provide a mechanism to control which Data Sources can be accessed by which applications, allowing for fine-grained access control. Hybrid Knowledge Bases combine structured and unstructured data, improving performance and accuracy when working with tabular data alongside free-text content. Knowledge Bases support scheduled refresh for automated updates.

### Data Sources

Data Sources let you bring your own data to Griptape Cloud, with support for scheduled updates. Supported types include web pages, Amazon S3 buckets, objects and prefixes, Google Drive, Atlassian Confluence, and Griptape Cloud Data Lake. You can also create custom Data Sources by implementing them as Griptape Structures.

### Data Lakes

Data Lakes provide cloud storage integrated directly into Griptape Cloud, accessible from Griptape Structures with a File Manager Driver and usable as a Data Source. They are ideal for staging and integrating external data such as PDF or text files with your applications.

### Retrievers

Retrievers provide RAG capabilities and support queries across multiple Knowledge Bases, applying reranking across results returned from multiple Knowledge Bases.

### Tools

Tools let you run Griptape Framework Tools on Griptape Cloud, supplementing LLM capabilities to interact with third-party services including API endpoints, search services, helpers such as DateTime and Calculator, as well as RAG and Prompt Summary tools. Tools can also be used to augment other applications like OpenAI's GPTs via OpenAI Actions. Each tool exposes activities as HTTP POST endpoints.

### Rules and Rulesets

Rules and Rulesets enable rapid and collaborative iteration for managing LLM behavior. They can be associated with Assistants and Structures to steer AI output.

### Threads and Conversation Memory

Conversation Memory maintains state and provides context for chat applications built with Assistants and Structures. You can access Conversation Memory to save or delete it via the Threads API. Threads support aliases for easy reference.

### Observability

The platform provides observability capabilities for sending trace and event data, allowing you to monitor performance, reliability, and spending across your organization.

## Events

The provider does not support webhooks or event subscriptions. Griptape Cloud offers server-sent events (SSE) for streaming structure run output in real time, but this is a response streaming mechanism rather than a webhook or event subscription system. The framework itself has an internal event bus for forwarding framework events to external services via Event Listener Drivers, but this is a client-side SDK feature, not a cloud-based webhook/event subscription API.
