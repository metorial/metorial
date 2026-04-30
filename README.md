<img src="./assets/repo-header.webp" alt="Metorial" width="100%" />

<br />

<h1 align="center">Metorial (YC F25)</h1>

<p align="center">
Open-source identity and access layer for AI agents. <br />
Connect agents to real systems with consistent auth, permissions, and observability.
</p>

> [!TIP]
> _Skip the setup and go hosted:_ The fastest, simplest and most reliable way to use [Metorial](https://metorial.com) is to sign up to [our hosted platform](https://platform.metorial.com/).
>
> ➡️ **[Get Started (for free)](https://metorial.com)**

## Introduction

Agents are being connected to production systems, but without a consistent identity and access layer around them: limited access control, no auditing, and no standard access restrictions. Metorial solves that.

Metorial is a control plane for agent access to external systems. It sits between agents and integrations, handling auth, permissions, and observability in a consistent way. Instead of wiring integrations ad hoc, teams get a shared layer that standardizes how agents interact with systems.

## Core Capabilities

- **1200+ integrations** across SaaS tools, enterprise systems, data sources, and custom MCP servers.
- **Auth and token lifecycle management** for OAuth, API keys, service accounts, and other credential flows.
- **RBAC, SAML SSO, and IAM built in** so agent access follows your existing security model.
- **Scoped permissions** per agent, workflow, team, or environment.
- **Audit logs and traceability** for agent actions, including which agent acted with whose credentials.
- **Shared access patterns** across teams and projects instead of one-off integration code.

## Metorial for Developers

Metorial gives developers a single interface for connecting agents to real systems.

- Use integrations across tools like Claude Code, Codex, and Cursor without breaking security policies.
- Expose integrations as tools to any agent framework.
- Unify OAuth, API keys, and other auth flows into one magic URL.
- Reuse connections across projects, environments, and people.
- Avoid re-implementing integration and auth logic for every app.

You write against one API, or use one connection URL, and Metorial handles the rest.

## Metorial for Security

Metorial provides structure and visibility into how agents access systems.

- Centralized access control with RBAC, SAML SSO, IAM, and scoped credentials.
- Clear permission boundaries per agent.
- Audit logs for all actions, including which agent performed them using whose credentials.
- Controlled sharing of integrations.
- Consistent and secure credential handling.

This makes agent activity enforceable and inspectable without relying on manual processes. Makes your Head of AI happy, lets your CISO sleep at night.

## Ecosystem

- [**Metorial**](https://github.com/metorial/metorial): Integration catalog covering SaaS tools and enterprise systems.
- [**Metorial Platform**](https://github.com/metorial/metorial-platform): Core engine, open source and self-hostable.
- [**Metorial CLI**](https://github.com/metorial/cli): Agent-first CLI for interacting with integrations.
- [**Lowerdeck**](https://github.com/metorial/lowerdeck): Shared libraries across the stack.
- [**Starbase**](https://github.com/metorial/starbase): MCP debugging and testing utility.

## SDKs

The SDKs expose the Metorial API and integrate with agent frameworks.

They handle auth, access control, and tool exposure in a consistent way.

- <img src="https://raw.githubusercontent.com/metorial/metorial-platform/refs/heads/dev/assets/typescript.png" width="12px" height="12px" /> [**JavaScript / TypeScript**](https://github.com/metorial/metorial-node)
- <img src="https://raw.githubusercontent.com/metorial/metorial-platform/refs/heads/dev/assets/python.svg" width="12px" height="12px" /> [**Python**](https://github.com/metorial/metorial-python)

If you want to build a custom integration, check out our [API documentation](https://metorial.com/api) for details on how to use the Metorial API directly.

## Self-Hosting

The [Metorial Platform](https://github.com/metorial/metorial-platform) is the code that powers the engine behind Metorial. It is open source and can be self-hosted. You can use it to run your own Metorial instance, powered by the MCP servers in this repo.

## Quick Start

The simplest way to get started is with **Metorial Search**, a built-in web search provider that requires no auth configuration.

### JavaScript / TypeScript

```typescript
import { Metorial } from 'metorial';
import { metorialAiSdk } from '@metorial/ai-sdk';
import { anthropic } from '@ai-sdk/anthropic';
import { stepCountIs, streamText } from 'ai';

let metorial = new Metorial({ apiKey: process.env.METORIAL_API_KEY! });

let deployment = await metorial.providerDeployments.create({
  name: 'Metorial Search',
  providerId: 'metorial-search'
});

let session = await metorial.connect({
  adapter: metorialAiSdk(),
  providers: [{ providerDeploymentId: deployment.id }]
});

let result = streamText({
  model: anthropic('claude-sonnet-4-20250514'),
  prompt:
    'Search the web for the latest news about AI agents and summarize the top 3 stories.',
  stopWhen: stepCountIs(10),
  tools: session.tools()
});

for await (let part of result.textStream) {
  process.stdout.write(part);
}
```

Install it with:

```bash
npm install metorial @metorial/ai-sdk @ai-sdk/anthropic ai
```

### Python

```python
import asyncio
import os

from metorial import Metorial
from metorial import metorial_pydantic_ai
from pydantic_ai import Agent

async def main():
  metorial = Metorial(api_key=os.environ["METORIAL_API_KEY"])

  deployment = metorial.provider_deployments.create(
    name="Metorial Search",
    provider_id="metorial-search",
  )

  session = await metorial.connect(
    adapter=metorial_pydantic_ai(),
    providers=[{"provider_deployment_id": deployment.id}],
  )

  agent = Agent(
    "anthropic:claude-sonnet-4-20250514",
    system_prompt="You are a helpful research assistant.",
    tools=session.tools(),
  )

  result = await agent.run(
    "Search the web for the latest news about AI agents and summarize the top 3 stories."
  )
  print(result.output)

asyncio.run(main())
```

Install it with:

```bash
pip install metorial pydantic-ai python-dotenv
```

## OAuth Integration

When working with services that require user authentication, such as Slack, GitHub, Google Calendar, or SAP, Metorial provides setup sessions to handle the OAuth flow and then reuse the resulting auth config.

### JavaScript / TypeScript

```typescript
import { Metorial } from 'metorial';
import { metorialAiSdk } from '@metorial/ai-sdk';

let metorial = new Metorial({ apiKey: process.env.METORIAL_API_KEY! });

let setupSession = await metorial.providerDeployments.setupSessions.create({
  providerId: 'your-slack-provider-id',
  providerAuthMethodId: 'your-slack-auth-method-id'
});

console.log(`Authenticate here: ${setupSession.url}`);

let completed = await metorial.providerDeployments.setupSessions.waitForCompletion([
  setupSession
]);

let session = await metorial.connect({
  adapter: metorialAiSdk(),
  providers: [
    {
      providerDeploymentId: 'your-slack-deployment-id',
      providerAuthConfigId: completed[0]!.authConfig!.id
    }
  ]
});

// Pass session.tools() to your model SDK.
```

### Python

```python
import os

from metorial import Metorial
from metorial import metorial_pydantic_ai

metorial = Metorial(api_key=os.environ["METORIAL_API_KEY"])

setup_session = metorial.provider_deployments.setup_sessions.create(
  provider_id="your-slack-provider-id",
  provider_auth_method_id="oauth",
  redirect_url="https://yourapp.com/oauth/callback",
)

print(f"Authenticate here: {setup_session.url}")

completed = await metorial.wait_for_setup_session([setup_session])

session = await metorial.connect(
  adapter=metorial_pydantic_ai(),
  providers=[
    {
      "provider_deployment_id": "your-slack-deployment-id",
      "provider_auth_config_id": completed[0].auth_config.id,
    }
  ],
)
tools = session.tools()
```

### OAuth Flow Explained

1. **Create a setup session**: Call `providerDeployments.setupSessions.create()` in TypeScript or `provider_deployments.setup_sessions.create()` in Python.
2. **Send the URL**: Show the setup session URL to users so they can authenticate in their browser.
3. **Wait for completion**: Wait for the setup session to finish and return an auth config.
4. **Use the auth config**: Pass the auth config ID when configuring `providers`.

### Provider Configuration Examples

Use the same `providers` list to combine dashboard-managed deployments, pre-created auth configs, inline credentials, and reusable session templates:

```typescript
let session = await metorial.connect({
  adapter: metorialAiSdk(),
  providers: [
    { providerDeploymentId: 'your-search-deployment-id' },
    {
      providerDeploymentId: 'your-slack-deployment-id',
      providerAuthConfigId: 'slack-auth-config-id'
    },
    {
      providerDeploymentId: 'your-github-deployment-id',
      providerAuthConfig: {
        providerAuthMethodId: 'github-auth-method-id',
        credentials: { access_token: 'ghp_...' }
      }
    },
    { sessionTemplateId: 'your-template-id' }
  ]
});
```

```python
session = await metorial.connect(
  adapter=metorial_pydantic_ai(),
  providers=[
    {"provider_deployment_id": "your-search-deployment-id"},
    {
      "provider_deployment_id": "your-slack-deployment-id",
      "provider_auth_config_id": "slack-auth-config-id",
    },
    {
      "provider_deployment_id": "your-github-deployment-id",
      "provider_auth_config": {
        "provider_auth_method_id": "github-auth-method-id",
        "credentials": {"access_token": "ghp_..."},
      },
    },
    {"session_template_id": "your-template-id"},
  ],
)
```

## Examples

Check out the SDK example directories for complete working examples:

### TypeScript

- [`typescript-quick-start`](https://github.com/metorial/metorial-node/tree/main/examples/typescript-quick-start) - Quick start with Metorial Search
- [`typescript-ai-sdk`](https://github.com/metorial/metorial-node/tree/main/examples/typescript-ai-sdk) - Vercel AI SDK + Anthropic
- [`typescript-openai`](https://github.com/metorial/metorial-node/tree/main/examples/typescript-openai) - OpenAI function calling
- [`typescript-anthropic`](https://github.com/metorial/metorial-node/tree/main/examples/typescript-anthropic) - Anthropic Claude tool use
- [`typescript-google`](https://github.com/metorial/metorial-node/tree/main/examples/typescript-google) - Google Gemini function declarations
- [`typescript-openai-compatible`](https://github.com/metorial/metorial-node/tree/main/examples/typescript-openai-compatible) - Any OpenAI-compatible API
- [`typescript-langchain`](https://github.com/metorial/metorial-node/tree/main/examples/typescript-langchain) - LangChain and LangGraph
- [`typescript-provider-config`](https://github.com/metorial/metorial-node/tree/main/examples/typescript-provider-config) - Provider auth and session template patterns

### Python

- [`pydantic-ai`](https://github.com/metorial/metorial-python/tree/main/examples/pydantic-ai) - PydanticAI + Anthropic
- [`langchain`](https://github.com/metorial/metorial-python/tree/main/examples/langchain) - LangChain agent tools
- [`langgraph`](https://github.com/metorial/metorial-python/tree/main/examples/langgraph) - LangGraph streaming agent
- [`openai-agents`](https://github.com/metorial/metorial-python/tree/main/examples/openai-agents) - OpenAI Agents SDK
- [`llamaindex`](https://github.com/metorial/metorial-python/tree/main/examples/llamaindex) - LlamaIndex function agent
- [`autogen`](https://github.com/metorial/metorial-python/tree/main/examples/autogen) - AutoGen assistant with tool calls
- [`crewai`](https://github.com/metorial/metorial-python/tree/main/examples/crewai) - CrewAI agent tools
- [`google-adk`](https://github.com/metorial/metorial-python/tree/main/examples/google-adk) - Google ADK with Gemini
- [`haystack`](https://github.com/metorial/metorial-python/tree/main/examples/haystack) - Haystack pipeline with tools

## Multi-Provider Support

Use the same Metorial providers across different AI clients and frameworks.

| Provider      | TypeScript adapter     | Python adapter                 | Model examples                             |
| ------------- | ---------------------- | ------------------------------ | ------------------------------------------ |
| AI SDK        | `@metorial/ai-sdk`     | -                              | Any model via Vercel AI SDK                |
| OpenAI        | `@metorial/openai`     | `metorial_openai()`            | `gpt-4.1`, `gpt-4o`, `o1`, `o3`            |
| Anthropic     | `@metorial/anthropic`  | `metorial_anthropic()`         | `claude-sonnet-4-5`, `claude-opus-4`       |
| Google Gemini | `@metorial/google`     | `metorial_google()`            | `gemini-2.5-pro`, `gemini-2.5-flash`       |
| Mistral       | `@metorial/mistral`    | `metorial_mistral()`           | `mistral-large-latest`, `codestral-latest` |
| DeepSeek      | `@metorial/deepseek`   | `metorial_openai_compatible()` | `deepseek-chat`, `deepseek-reasoner`       |
| TogetherAI    | `@metorial/togetherai` | `metorial_openai_compatible()` | `Llama-4`, `Qwen-3`                        |
| XAI           | `@metorial/xai`        | `metorial_openai_compatible()` | `grok-3`, `grok-3-mini`                    |
| LangChain     | `@metorial/langchain`  | `metorial_langchain()`         | Any model via LangChain                    |
| PydanticAI    | -                      | `metorial_pydantic_ai()`       | Any model via PydanticAI                   |

## Motivation

MCP is a powerful standard for connecting AI models to external data and tools, but it focuses on enabling AI clients (like Claude Desktop or Cursor) to connect to tools and data sources.
Metorial builds on MCP but makes it a one-liner for developers to connect their AI apps to any API, data source, or tool.
Thereby we enable developers to create agentic AI applications that can interact with other systems in a reliable, simple, and secure way.

## Tech Stack

- [**Model Context Protocol (MCP)**](https://modelcontextprotocol.io) - Metorial is powered by the Model Context Protocol, a standard for connecting AI models to external data and tools.
- [**Docker**](https://www.docker.com) - Metorial uses Docker to run MCP servers in a containerized environment, making it easy to deploy and manage.
- [**MCP Containers**](https://github.com/metorial/mcp-containers) - Metorial provides a collection of pre-built MCP servers in Docker containers.
- [**Typescript**](https://www.typescriptlang.org) - Most of Metorial is written in TypeScript.
- [**Bun**](https://bun.sh) - The core of Metorial runs on Bun, a fast JavaScript runtime that is compatible with Node.js.
- [**Go**](https://go.dev) - The MCP engine is written in Go, providing a high-performance backend for Metorial.
- [**PostgreSQL**](https://www.postgresql.org) - Metorial uses PostgreSQL for data storage.
- [**Redis**](https://redis.io) - Metorial uses Redis for caching and real-time data processing.
- [**MongoDB**](https://www.mongodb.com) - Metorial uses MongoDB for storing usage data and logs.
- [**React**](https://reactjs.org) - The Metorial Dashboard is built with React.

## Features

Metorial is built to make it super easy for developers to connect their AI apps to external data and tools. Powered by the Model Context Protocol (MCP), Metorial is built on standards.

### Large Server Catalog

The [Metorial server index](https://github.com/metorial/mcp-index) already contains more than 5000 MCP servers. It's a super easy to find and use MCP servers for your AI applications. Everything is searchable and neatly organized, so you can find the right server for your use case.

https://github.com/user-attachments/assets/a171030e-0159-4ce2-9e92-f4fb3f7bfdc6

### Embedded MCP Explorer

Test and explore MCP servers directly in the Metorial Dashboard. The embedded MCP Explorer allows you to use any MCP server without leaving the dashboard. This makes it easy to test and debug your integrations before writing any code.

https://github.com/user-attachments/assets/eeb73085-e1d6-4745-988a-385694d26500

### Monitoring and Debugging

Every MCP session is recorded and can be reviewed in the Metorial Dashboard. This allows you to monitor and find issues in your integrations. And even better, if an error occurs, Metorial detects it and provides a detailed error report so you can quickly fix the issue.

https://github.com/user-attachments/assets/c676411e-25b6-442a-af22-c8d99e2be25b

### Built for Developers

Metorial is built from the ground up for developers. Here are some of the key features that make Metorial a great choice for developers:

- **Customizable**: Metorial is highly customizable, allowing you to configure your integrations to fit your needs.
- **Open source**: Metorial is open source, so you can run it on your own infrastructure or use our hosted platform.
- **Multi-instance support**: Create multiple instances of your Metorial Projects to test different configurations, environments or versions of your integrations.
- **Powerful SDKs**: Metorial provides powerful SDKs for JavaScript/TypeScript and Python, making it easy to integrate with your AI applications.
- **Detailed documentation**: Metorial provides [detailed documentation](https://metorial.com/docs) for all its features, including examples and tutorials to help you get started quickly.
- **Full API access**: Every feature of Metorial is accessible via the API, allowing you to build custom integrations and automate your workflows. Theoretically, you could build your own dashboard using the API.
- **Advanced dashboard**: The Metorial Dashboard provides a powerful interface for managing your integrations, monitoring your usage, and debugging your MCP servers.

## License

The Metorial Catalog is licensed under the [Apache License 2.0](LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
