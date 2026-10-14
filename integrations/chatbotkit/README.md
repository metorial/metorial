# Chatbotkit

Build and manage ChatBotKit bots, conversations, datasets, skillsets, contacts, memories and spaces. Send messages and obtain AI responses, search knowledge records and memories, and inspect conversation history. Discover available models and inspect background task status. Manage deployment channels with their channel-specific configuration and use cursor pagination to browse resources.

Use `list_models` to find model IDs and token limits. Use `list_resources` with `resourceType: "tasks"`, then `get_task`, to inspect background work. For deployment-channel operations, supply `type` to `manage_integration` or `integrationType` when listing integrations, such as `widget`, `slack`, `discord`, `sitemap` or `notion`. The contact `ensure` action requires a stable `fingerprint`.

This integration uses a ChatBotKit API secret key. Optional `runAsUserId` selects a child user for accounts authorized to use impersonation.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
