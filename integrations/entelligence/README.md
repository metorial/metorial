# Entelligence

Ask questions about a repository indexed for the Entelligence chat widget, check whether owner submissions are enabled, and submit a question to repository owners through their Slack integration.

Configure the organization and repository names exactly as used by your chat widget. Supply an Entelligence API key that supports that widget. API keys are managed under Settings → API in [the Entelligence application](https://app.entelligence.ai); keys for the current CLI or MCP server are not assumed to support the widget's older HTTP service.

| Tool | Result |
| --- | --- |
| `chat_query` | A generated codebase answer and source URLs included by the provider. |
| `check_query_permission` | Whether the widget allows owner submissions for the configured repository. The retained `repositoryUrl` is a configured address, not a provider-verified navigation link. |
| `bot_query` | Submits a question and conversation context to repository owners through Slack. This sends an external message. `submitted` confirms API acceptance; it does not prove delivery or a reply. The retained `answer` field contains the provider's submission response text, which may be empty. |

Use `chat_query` when you want an AI response. Use `bot_query` only when you want to contact the repository owners. Provide `userEmail` so owners have a contact address.

This integration preserves the three HTTP workflows published in [Entelligence's chat widget](https://www.npmjs.com/package/@entelligence-ai/chat-widget) and [official source repository](https://github.com/Entelligence-AI/chat-popup). The current [documentation](https://docs.entelligence.ai) focuses on the product, CLI, and deployment-specific MCP configuration; it does not publish a general REST API. Code reviews, indexing, analytics, administration, and document publishing are not exposed by these tools. No webhook triggers are available.
