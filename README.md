<img src="./assets/repo-header.webp" alt="Metorial" width="100%" />

<br />

<h1 align="center">Metorial (YC F25)</h1>

<p align="center">
The integration platform for agentic AI. <br />
Connect any AI model to thousands of APIs, data sources, and tools with a single function call.
</p>

> [!TIP]
> *Skip the setup and go hosted:* The fasted, simplest and most reliable way to use [Metorial](https://metorial.com) is to sign up to [our hosted platform](https://app.metorial.com/).
> 
> ➡️ **[Get Started (for free)](https://metorial.com)**

## Introduction

Metorial enables AI agent developers to easily connect their models to a wide range of APIs, data sources, and tools using the Model Context Protocol (MCP).
Metorial abstracts away the complexities of MCP and offers a simple, unified interface for developers, including powerful SDKs, detailed monitoring, and a highly customizable platform.

## Features

* **✨ One-liner SDKs**: Connect your AI model to any API, data source, or tool with a single function call.
* **🛠️ Powered by MCP**: Metorial is built on the Model Context Protocol, a standard for connecting AI models to external data and tools.
* **🚀 Get started in minutes**: Metorial is designed to be easy to use, with a simple setup process and a unified interface for all your AI integrations.
* **🕊️ Self-hosting**: Metorial's source code is hosted on GitHub and you can self-host it.
* **👩‍💻 Built for developers**: Metorial isn't built for end users, but for developers who need high quality tooling, monitoring, and customization options to build agentic AI applications.

## SDKs

Metorial currently provides SDKs for the following languages:

* <img src="assets/typescript.png" width="12px" height="12px" /> [**JavaScript/TypeScript**](https://github.com/metorial/metorial-node)
* <img src="assets/python.svg" width="12px" height="12px" /> [**Python**](https://github.com/metorial/metorial-python)

If you want to build a custom integration, check out our [API documentation](https://metorial.com/api) for details on how to use the Metorial API directly.

## Quick Start

The simplest way to get started is with the `.run()` method, which handles session management and conversation loops automatically:

```typescript
import { Metorial } from 'metorial';
import OpenAI from 'openai';

let metorial = new Metorial({ apiKey: 'your-metorial-api-key' });
let openai = new OpenAI({ apiKey: 'your-openai-api-key' });

let result = await metorial.run({
  message: 'Scan my slack messages for meetings and put them on my google calendar.',
  serverDeployments: ['google-calendar-server', 'slack-server'], 
  model: 'gpt-4o',
  client: openai,
  maxSteps: 10 // Optional: limit conversation steps
});

console.log(`Response (completed in ${result.steps} steps):`);
console.log(result.text);
```

```python
import asyncio
from metorial import Metorial
from openai import AsyncOpenAI

async def main():
  metorial = Metorial(api_key="your-metorial-api-key")
  openai = AsyncOpenAI(api_key="your-openai-api-key")
  
  response = await metorial.run(
    message="Search Hackernews for the latest AI discussions.",
    server_deployments=["hacker-news-server-deployment"],
    client=openai,
    model="gpt-4o",
    max_steps=25    # optional
  )
  
  print("Response:", response.text)

asyncio.run(main())
```

## OAuth Integration

When working with services that require user authentication (like Google Calendar, Slack, etc.), Metorial provides OAuth session management to handle the authentication flow:

```typescript
import { Metorial } from 'metorial';
import Anthropic from '@anthropic-ai/sdk';

let metorial = new Metorial({ apiKey: 'your-metorial-api-key' });
let anthropic = new Anthropic({ apiKey: 'your-anthropic-api-key' });

// Create OAuth sessions for services that require user authentication
let [googleCalOAuthSession, slackOAuthSession] = await Promise.all([
  metorial.oauth.sessions.create({ 
    serverDeploymentId: 'your-google-calendar-server-deployment-id' 
  }),
  metorial.oauth.sessions.create({ 
    serverDeploymentId: 'your-slack-server-deployment-id' 
  })
]);

// Give user OAuth URLs for authentication
console.log('OAuth URLs for user authentication:');
console.log(`   Google Calendar: ${googleCalOAuthSession.url}`);
console.log(`   Slack: ${slackOAuthSession.url}`);

// Wait for user to complete OAuth flow
await metorial.oauth.waitForCompletion([googleCalOAuthSession, slackOAuthSession]);

console.log('OAuth sessions completed!');

// Now use the authenticated sessions in your run
let result = await metorial.run({
  message: `Look in Slack for mentions of potential partners. Use Exa to research their background, 
  company, and email. Schedule a 30-minute intro call with them for an open slot on Dec 13th, 2025 
  SF time and send me the calendar link. Proceed without asking for any confirmations.`,

  serverDeployments: [
    { 
      serverDeploymentId: 'your-google-calendar-server-deployment-id', 
      oauthSessionId: googleCalOAuthSession.id 
    },
    { 
      serverDeploymentId: 'your-slack-server-deployment-id', 
      oauthSessionId: slackOAuthSession.id 
    },
    { 
      serverDeploymentId: 'your-exa-server-deployment-id' // No OAuth needed for Exa
    }
  ],
  client: anthropic,
  model: 'claude-3-5-sonnet-20241022'
});

console.log(result.text);
```

```python
import asyncio
import os
from metorial import Metorial
from anthropic import AsyncAnthropic

async def main():
  metorial = Metorial(api_key=os.getenv("METORIAL_API_KEY"))
  anthropic = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

  # Create OAuth session for authenticated services
  google_cal_deployment_id = os.getenv("GOOGLE_CALENDAR_DEPLOYMENT_ID")
  
  print("🔗 Creating OAuth session...")
  oauth_session = metorial.oauth.sessions.create(
    server_deployment_id=google_cal_deployment_id
  )

  print("OAuth URLs for user authentication:")
  print(f"   Google Calendar: {oauth_session.url}")

  print("\n⏳ Waiting for OAuth completion...")
  await metorial.oauth.wait_for_completion([oauth_session])
  print("✅ OAuth session completed!")

  # Use multiple server deployments with mixed auth
  hackernews_deployment_id = os.getenv("HACKERNEWS_DEPLOYMENT_ID")
  
  result = await metorial.run(
    message="""Search Hackernews for the latest AI discussions using the available tools. 
    Then create a calendar event using Google Calendar tools with my@email.address for tomorrow at 2pm to discuss AI trends.""",
    server_deployments=[
      { "serverDeploymentId": google_cal_deployment_id, "oauthSessionId": oauth_session.id },
      { "serverDeploymentId": hackernews_deployment_id },
    ],
    client=anthropic,
    model="claude-sonnet-4-20250514",
    max_tokens=4096,
    max_steps=25,
  )
  print(result.text)

asyncio.run(main())
```

### OAuth Flow Explained

1. **Create OAuth Sessions**: Call `metorial.oauth.sessions.create()` for each service requiring user authentication
2. **Send URLs**: Show the OAuth URLs to users so they can authenticate in their browser
3. **Wait for Completion**: Use `metorial.oauth.waitForCompletion()` to wait for users to complete the OAuth flow
4. **Use Authenticated Sessions**: Pass the `oauthSessionId` when configuring `serverDeployments`

## Examples

Check out the `examples/` directory for more comprehensive examples:

- [`https://github.com/metorial/metorial-node/tree/main/examples/typescript-openai-run/`](examples/typescript-openai-run/) - **Simple `.run()` method example**
- [`https://github.com/metorial/metorial-node/tree/main/examples/typescript-openai/`](examples/typescript-openai/) - Manual OpenAI integration
- [`https://github.com/metorial/metorial-node/tree/main/examples/typescript-anthropic/`](examples/typescript-anthropic/) - Anthropic integration
- [`https://github.com/metorial/metorial-node/tree/main/examples/typescript-ai-sdk/`](examples/typescript-ai-sdk/) - AI SDK integration


## Multi-Provider Support

Use the same tools across different AI providers

| Provider   | Model Examples                    | Client Required     |
|------------|-----------------------------------|---------------------|
| OpenAI     | `gpt-4o`, `gpt-4`, `gpt-3.5-turbo` | `openaiClient`     |
| Anthropic  | `claude-3-5-sonnet-20241022`, `claude-3-haiku-20240307` | `anthropicClient` |
| Google     | `gemini-pro`, `gemini-1.5-pro`, `gemini-flash` | `googleClient` |
| DeepSeek   | `deepseek-chat`, `deepseek-coder` | `deepseekClient` |
| Mistral    | `mistral-large-latest`, `mistral-small-latest` | `mistralClient` |
| XAI        | `grok-beta`, `grok-vision-beta`   | `xaiClient`        |
| TogetherAI | `meta-llama/Llama-2-70b-chat-hf`, `NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO` | `togetheraiClient` |


## Motivation

MCP is a powerful standard for connecting AI models to external data and tools, but it focuses on enabling AI clients (like Claude Desktop or Cursor) to connect to tools and data sources. 
Metorial builds on MCP but makes it a one-liner for developers to connect their AI apps to any API, data source, or tool.
Thereby we enable developers to create agentic AI applications that can interact with other systems in a reliable, simple, and secure way.

## Tech Stack

* [**Model Context Protocol (MCP)**](https://modelcontextprotocol.io) - Metorial is powered by the Model Context Protocol, a standard for connecting AI models to external data and tools.
* [**Docker**](https://www.docker.com) - Metorial uses Docker to run MCP servers in a containerized environment, making it easy to deploy and manage.
* [**MCP Containers**](https://github.com/metorial/mcp-containers) - Metorial provides a collection of pre-built MCP servers in Docker containers.
* [**Typescript**](https://www.typescriptlang.org) - Most of Metorial is written in TypeScript.
* [**Bun**](https://bun.sh) - The core of Metorial runs on Bun, a fast JavaScript runtime that is compatible with Node.js.
* [**Go**](https://go.dev) - The MCP engine is written in Go, providing a high-performance backend for Metorial.
* [**PostgreSQL**](https://www.postgresql.org) - Metorial uses PostgreSQL for data storage.
* [**Redis**](https://redis.io) - Metorial uses Redis for caching and real-time data processing.
* [**MongoDB**](https://www.mongodb.com) - Metorial uses MongoDB for storing usage data and logs.
* [**React**](https://reactjs.org) - The Metorial Dashboard is built with React.

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

* **Customizable**: Metorial is highly customizable, allowing you to configure your integrations to fit your needs.
* **Open source**: Metorial is open source, so you can run it on your own infrastructure or use our hosted platform.
* **Multi-instance support**: Create multiple instances of your Metorial Projects to test different configurations, environments or versions of your integrations.
* **Powerful SDKs**: Metorial provides powerful SDKs for JavaScript/TypeScript and Python, making it easy to integrate with your AI applications.
* **Detailed documentation**: Metorial provides [detailed documentation](https://metorial.com/docs) for all its features, including examples and tutorials to help you get started quickly.
* **Full API access**: Every feature of Metorial is accessible via the API, allowing you to build custom integrations and automate your workflows. Theoretically, you could build your own dashboard using the API.
* **Advanced dashboard**: The Metorial Dashboard provides a powerful interface for managing your integrations, monitoring your usage, and debugging your MCP servers.

## License

Metorial is licensed under the [FSL-1.1](LICENSE) license.

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>