# Slates Specification for V0

## Overview

V0 is Vercel's AI-powered web application builder that turns natural language prompts into production-ready code. It offers two APIs: a Platform API for programmatic project management, chat-based code generation, and deployment; and a Model API (deprecated) providing OpenAI-compatible chat completions optimized for web development.

## Authentication

V0 uses API key authentication for all requests.

**Obtaining an API Key:**

- Get your API key from [v0.dev/chat/settings/keys](https://v0.dev/chat/settings/keys).
- The API requires a Premium or Team plan with usage-based billing enabled.

**Using the API Key:**

- All requests require API key authentication.
- For REST API calls, pass the key as a Bearer token in the `Authorization` header: `Authorization: Bearer $V0_API_KEY`
- The base URL for all requests is `https://api.v0.dev`

**SDK Authentication:**

- The SDK provides two ways to authenticate. The simplest approach uses the default `v0` client, which automatically reads from the `V0_API_KEY` environment variable.
- Alternatively, use `createClient()` to provide a custom API key, use multiple keys, or configure a custom base URL (e.g., for enterprise).

## Features

### AI-Powered Code Generation via Chat

Create conversational sessions with v0's AI agent to generate, refine, and iterate on web application code using natural language. You can build custom chat interfaces, trigger code generation automatically, integrate v0 into IDEs or CI/CD pipelines, and build autonomous AI agents that generate and deploy code.

- Chats can be initialized from scratch (`create`) or from existing files/repos (`init`).
- Supports multi-turn conversations for iterative development.
- Messages can contain text, code blocks, and component previews.

### Project Management

The Platform API gives you programmatic access to project management and deployment features. Projects are containers for code and can be created from scratch, imported from GitHub repositories, initialized with uploaded files, or built from templates.

- CRUD operations on projects (list, create, get, update, delete).
- File management within projects (up to 1,000 files per project, 3MB max per file).

### GitHub Integration

Import existing codebases from GitHub repositories into v0 projects. You can initialize chats directly from a repository URL, enabling AI-assisted development on existing code.

### Deployment & Hosting

Deploy projects to v0's hosting platform programmatically. Deployments are created by specifying a project, chat, and version.

- Supports custom domains and SSL.
- Environment management (staging, production).

### Model API (Chat Completions)

The v0 Model API has been deprecated. Please use the Platform API instead for all new projects and integrations. When available, it provided an OpenAI-compatible chat completions endpoint (`POST /v1/chat/completions`) with models like `v0-1.5-md` and `v0-1.5-lg`.

- Supports text and image inputs (multimodal), is compatible with OpenAI's Chat Completions format, and supports function/tool calls.
- Supports streaming (SSE) and non-streaming responses.

### AI Agent Tools Integration

The `@v0-sdk/ai-tools` package provides pre-built tools that can be used with Vercel's AI SDK, enabling autonomous agents (powered by any LLM) to create projects, generate code, and deploy applications through v0.

## Events

The provider does not support events. There are no webhook or event subscription mechanisms available in the V0 API. Polling-based triggers (e.g., checking for new chats or projects) exist in third-party integrations like Zapier but are not a native API feature.
