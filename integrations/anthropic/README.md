# <img src="https://provider-logos.metorial-cdn.com/anthropic.png" height="20"> Anthropic

Generate text and analyze images using Claude language models. Send conversational messages with configurable parameters (model, temperature, system prompt) and receive AI-generated responses, with optional streaming. Execute Python code in a sandboxed environment for data analysis and visualizations. Perform web searches for up-to-date information with cited sources. Use tool calling (function calling) to let Claude invoke structured tools during conversations. Enable extended thinking for complex reasoning tasks. Process and analyze images via vision capabilities. Upload and manage files for multi-session analysis. Connect to remote MCP servers for external system integration. Use agent skills for working with PowerPoint, Excel, Word, and PDF files. Count tokens, cache prompts for reduced latency and cost, create message batches for async processing, and enable citations for source attribution. Administer organizations by managing members, workspaces, invites, API keys, and retrieving usage and cost reports.

## Tools

### Count Tokens

Count the number of tokens in a message without sending it. Useful for estimating costs, managing context window limits, and planning prompt strategies before making actual API calls.

### Get Organization

Retrieve information about the organization associated with the current Admin API key. Useful for determining which organization a key belongs to and getting organization details. Requires an Admin API key (sk-ant-admin...).

### List Models

List available Claude models and their details. Retrieve information about context window size, capabilities, and model identifiers. Optionally fetch details for a specific model by providing its ID.

### Get Usage Report

Retrieve Anthropic Admin API usage and cost reports for an organization. Use message usage reports for token and server-tool usage, and cost reports for USD spend attribution. Requires an Admin API key (sk-ant-admin...).

### Manage API Keys

List, retrieve, and update organization API keys via the Admin API. View active, inactive, or archived keys filtered by workspace. Update keys to activate, deactivate, or rename them. Requires an Admin API key (sk-ant-admin...).

### Manage Files

Upload, list, retrieve metadata for, download, or delete Anthropic Files API files. Uploaded files can be referenced from Messages requests by file ID; generated downloadable files can be retrieved as base64 content.

### Manage Message Batch

Create, retrieve, list, or cancel message batches for asynchronous processing. Batches allow processing large volumes of messages at reduced cost (up to 24 hours). Use **action** to specify the operation: "create", "get", "list", or "cancel".

### Manage Organization Members

Manage organization members and invites via the Admin API. List members, update roles, remove members, or manage invitations. Use **action** to specify the operation. Requires an Admin API key (sk-ant-admin...).

### Manage Workspaces

Manage organization workspaces and their members via the Admin API. Create, list, update, archive workspaces, and manage workspace membership. Use **action** to specify the operation. Requires an Admin API key (sk-ant-admin...).

### Send Message

Send a message to Claude and receive a generated response. Supports multi-turn conversations, system prompts, tool use (function calling), extended thinking, and vision (images). Provide a conversation history as messages and configure model parameters to control the response.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
