# Slates Specification for DeepSeek

## Overview

DeepSeek provides OpenAI-compatible API access to DeepSeek V4 language models for
chat, thinking-mode reasoning, tool calling, structured JSON output, and beta code
completion workflows.

## Authentication

DeepSeek uses API-key authentication. The API key is sent as a bearer token in the
`Authorization` header.

## Base URLs

- OpenAI-format stable API: `https://api.deepseek.com`
- OpenAI-format beta API: `https://api.deepseek.com/beta`

The integration exposes the stable base URL as package config. Beta-only tools and
features route to the beta base URL internally.

## Supported Models

- `deepseek-v4-flash`
- `deepseek-v4-pro`

The older `deepseek-chat` and `deepseek-reasoner` aliases are deprecated by
DeepSeek and should not be used for new tool calls.

## Tools

### `chat_completion`

Creates a non-streaming chat completion with optional thinking mode, reasoning
effort, JSON output, function/tool definitions, beta strict tool-call mode,
logprob output, and `user_id` isolation.

### `chat_prefix_completion`

Uses the beta chat prefix completion feature. The tool builds a final assistant
message with `prefix=true` and sends the request to the beta API.

### `fim_completion`

Uses the beta FIM completion endpoint. The current DeepSeek API accepts
`deepseek-v4-pro` for FIM and limits generation to 4096 tokens.

### `list_models`

Lists available DeepSeek models and their owner metadata.

### `get_balance`

Retrieves the current account balance and account availability status.

## Triggers

DeepSeek does not provide provider-native webhooks or polling event APIs.
