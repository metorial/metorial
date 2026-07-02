Now let me check the API reference for the full list of endpoints and the balance/models endpoints:I now have enough information to write the specification.

# Slates Specification for DeepSeek

## Overview

DeepSeek is an AI company that provides cloud-based API access to its large language models for chat, reasoning, and code completion tasks. The DeepSeek API uses an API format compatible with OpenAI, making it straightforward to integrate using existing OpenAI-compatible SDKs and tooling. The two primary model identifiers are `deepseek-chat` (non-thinking mode) and `deepseek-reasoner` (thinking mode), both corresponding to DeepSeek-V3.2 with a 128K context limit.

## Authentication

The primary and sole method for authenticating with the DeepSeek API is through an API key. There is no support for OAuth 2.0 or other complex authentication protocols.

- **Obtaining an API key**: Log in to your DeepSeek account (or create one) at `platform.deepseek.com`, open the API keys page, and select "Create new secret key". Once created, copy and store the key securely. For security reasons, you will not be able to view it again through the platform. If you lose it, you must create a new one.
- **Using the API key**: Pass it as a Bearer token in the `Authorization` header: `Authorization: Bearer YOUR_API_KEY`
- **Base URL**: `https://api.deepseek.com` (or `https://api.deepseek.com/v1` for OpenAI compatibility — the `v1` does not indicate model version)
- **Compatibility**: Because DeepSeek's API is compatible with OpenAI's, you can use OpenAI's SDKs by changing the `base_url` and providing your DeepSeek API key.

## Features

### Chat Completion

Generate conversational responses using DeepSeek's language models. Send a list of messages with roles (`system`, `user`, `assistant`) and receive a model-generated response. Supports both streaming and non-streaming modes.

- **Models**: `deepseek-chat` for general-purpose chat; `deepseek-reasoner` for chain-of-thought reasoning.
- **Key parameters**: `temperature`, `top_p`, `max_tokens`, `frequency_penalty`, `presence_penalty`, `stop` sequences.
- Supports JSON output mode for structured, machine-readable responses, configured via `response_format`.

### Thinking Mode (Chain-of-Thought Reasoning)

`deepseek-reasoner` is the thinking mode of DeepSeek-V3.2, where the model outputs step-by-step reasoning (`reasoning_content`) before the final answer (`content`). Can also be enabled via the `thinking` parameter on `deepseek-chat`.

- The reasoning content is returned as a separate field and is not concatenated into multi-turn context by default.
- Supports tool calls within the thinking process, allowing multi-step reasoning combined with external tool invocations.
- Does not support `temperature`, `top_p`, `presence_penalty`, `frequency_penalty`, or `logprobs` parameters.

### Tool Calls (Function Calling)

DeepSeek API supports Function Calling, compatible with OpenAI API, allowing the model to interact with the physical world via external tools. Function Calling supports multiple functions in one call (up to 128) and supports parallel function calls.

- Define tools with JSON Schema descriptions and the model will produce structured calls when appropriate.
- Works in both standard chat mode and thinking mode.

### FIM Completion (Beta)

In FIM (Fill In the Middle) completion, users can provide a prefix and a suffix (optional), and the model will complete the content in between. FIM is commonly used for content completion and code completion.

- Requires setting `base_url` to `https://api.deepseek.com/beta` to enable this Beta feature.
- Not available in thinking mode.

### Chat Prefix Completion (Beta)

Chat Prefix Completion follows the API format of Chat Completion, allowing users to specify the prefix of the last assistant message for the model to complete. This feature can also be used to concatenate messages that were truncated due to reaching the `max_tokens` limit.

- Also requires the Beta base URL.

### Context Caching

When you send a request, DeepSeek stores the input on its servers. If you send a similar request later, the system retrieves the stored response instead of recalculating everything. This makes the process faster and cheaper.

- Most effective when reused text is placed at the beginning of inputs.
- Useful for multi-turn conversations, repeated queries, few-shot learning prompts, and code analysis with shared context.

### Model Listing

List all currently available models along with basic metadata such as model ID and ownership.

### Account Balance

Retrieve the current account balance and usage information programmatically.

## Events

The provider does not support events. DeepSeek does not offer webhooks, event subscriptions, or purpose-built polling mechanisms through its API.
