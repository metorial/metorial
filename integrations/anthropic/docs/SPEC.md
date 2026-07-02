# Slates Specification for Anthropic

## Overview

Anthropic is an AI research company that provides access to the Claude family of large language models via a REST API. The Claude API is a RESTful API at `https://api.anthropic.com` that provides programmatic access to Claude models. The API supports text and image inputs, tool use, code execution, web search, file management, and organization administration.

## Authentication

Anthropic uses **API key authentication**. There are two types of API keys:

### Standard API Key

- In the Anthropic Console, open Settings > API Keys to create a key.
- Copy your key and store it in a safe location. You won't be able to re-access the key in the future.
- The API key is passed via the `x-api-key` header on every request.
- An `anthropic-version` header (e.g., `2023-06-01`) is also required on all requests.

Example:

```
curl https://api.anthropic.com/v1/messages \
  --header "x-api-key: $ANTHROPIC_API_KEY" \
  --header "anthropic-version: 2023-06-01" \
  --header "content-type: application/json" \
  --data '{ ... }'
```

### Admin API Key

- The Admin API requires a special Admin API key (starting with `sk-ant-admin...`) that differs from standard API keys. Only organization members with the admin role can provision Admin API keys through the Claude Console.
- Used exclusively for organization administration tasks (managing members, workspaces, API keys).
- Passed via the same `x-api-key` header.

There is no OAuth2 or token-based authentication. All authentication is key-based.

## Features

### Message Generation (Conversations)

The primary API is the Messages API for conversational interactions. Send a sequence of user and assistant messages to Claude and receive a model-generated response. Configurable parameters include model selection, maximum output tokens, system prompt, temperature, top-k, top-p, and stop sequences. All current Claude models support text and image input, text output, multilingual capabilities, and vision. Responses can be streamed via server-sent events (SSE) for real-time token delivery.

### Extended Thinking

Extended thinking is a feature that allows Claude to generate internal reasoning content blocks before producing its final response. It improves output quality for complex tasks by making the model's step-by-step thinking process explicit. You set a thinking token budget (minimum 1,024 tokens) when enabling this feature via the API.

### Tool Use (Function Calling)

Define tools with a name, description, and JSON Schema for inputs. Claude can decide to invoke tools during a conversation, returning structured tool-use requests. You execute the tool and return results to Claude to continue the conversation. Supports forcing specific tools, disabling tool use, and advanced patterns like programmatic tool calling where Claude orchestrates multiple tools through code.

### Web Search

Claude can generate targeted search queries when up-to-date information is needed. Claude analyzes the results, extracts relevant information, and provides a comprehensive response with citations to source materials. Enabled by including the web search tool in your API request.

### Code Execution

Anthropic offers a code execution tool on the API, giving Claude the ability to run Python code in a sandboxed environment to produce computational results and data visualizations. This transforms Claude from a code-writing assistant into a data analyst that can iterate on visualizations, clean datasets, and derive insights directly within API calls.

### Computer Use

Rather than building specialized tools for individual tasks, Anthropic is teaching Claude general computer skills—enabling it to use the same interfaces, applications, and workflows that humans use every day. Released in public beta, Computer Use made Claude the first frontier AI model to offer autonomous desktop control. Claude can view screenshots, move the mouse, click, type, and scroll to interact with desktop environments.

### MCP Connector

The Claude API supports an `mcp_servers` parameter that lets Claude connect directly to remote MCP servers. Use `mcp_servers` when you have remote servers accessible via URL and only need tool support. This allows Claude to interact with external systems through the Model Context Protocol.

### Vision (Image Understanding)

Claude can process and analyze images sent as part of messages. Images can be provided as base64-encoded data or URLs. All current Claude models support vision capabilities.

### File Management

Developers can upload a dataset through the Files API once, then have Claude analyze it across multiple sessions without re-uploading. Files can be uploaded, listed, and retrieved for use with messages and code execution.

### Agent Skills

Anthropic launched Agent Skills, a new way to extend Claude's capabilities. Skills are organized folders of instructions, scripts, and resources that Claude loads dynamically to perform specialized tasks. The initial release includes Anthropic-managed Skills for working with PowerPoint, Excel, Word, and PDF files, as well as Custom Skills you can upload via the Skills API.

### Prompt Caching

Prompt caching is available as a feature in the Claude API. Cache and re-use prompts to reduce latency by up to 80% and costs by up to 90%. Developers can now choose between a standard 5-minute TTL for prompt caching or opt for an extended 1-hour TTL at an additional cost.

### Citations

Anthropic launched citations capability in the API, allowing Claude to provide source attribution for information. When enabled, Claude returns references to specific parts of the provided source documents.

### Token Counting

Count tokens in a message before sending it, useful for managing costs and staying within context window limits.

### Message Batches

Process large volumes of message requests asynchronously at a reduced cost. Submit multiple independent requests as a batch and retrieve results when processing is complete.

### Model Discovery

List available Claude models and retrieve their details (context window size, capabilities, etc.) via the Models API.

### Organization Administration

The Admin API allows you to programmatically manage your organization's resources, including organization members, workspaces, and API keys. Specific capabilities include:

- **Member management**: List, update roles, and remove organization members.
- **Invites**: Create, list, and delete invitations to join the organization.
- **Workspaces**: Create, list, update, and archive workspaces. Workspaces support data residency configuration.
- **Workspace members**: Add, update roles, and remove members from specific workspaces.
- **API key management**: List and update (activate/deactivate/rename) API keys.
- **Usage and Cost reporting**: Retrieve usage and cost data for the organization.

There are five organization-level roles. Workspace-level roles include workspace_user, workspace_developer, workspace_admin, and workspace_billing.

## Events

The provider does not support events. Anthropic does not offer webhooks or purpose-built polling mechanisms for subscribing to changes or notifications. Streaming (SSE) is available for real-time token delivery during message generation, but this is a response-streaming mechanism, not an event subscription system.
