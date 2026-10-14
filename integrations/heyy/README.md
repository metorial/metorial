# Heyy

Manage Heyy contacts, chats, WhatsApp messages, broadcasts, and automation workflows. Inspect your current workspace and retrieve detailed contacts and chats through API v3.

The existing messaging, contact management, list, broadcast, and workflow tools use API v2. Heyy has announced that API v2 will stop working on **November 1, 2026**. The new `get_workspace`, `get_contact`, and `get_chat` tools use API v3; the remaining tools and connection profile verification still need a v3 migration before that date. See [Heyy's versioning notice](https://docs.heyy.io/api-reference/v3/versioning).

Create an API key in your Heyy workspace under **Settings → API Keys**. Media messages require a file ID from a file already uploaded to Heyy; this integration does not expose a file upload tool.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
