# Kontent.ai

Manage structured content and localized variants using the Kontent.ai Management API. List and inspect content items and content types, create and delete items, update variant content, and publish or schedule content. List workflows, languages, collections, and taxonomy groups; inspect, update, and delete assets.

Use a Management API key or personal API key with the permissions needed for each operation. Supply `environmentId` from Kontent.ai project settings when calling a tool, and use `get_environment` to verify the environment name and access. Existing connections can keep their saved environment ID as a default. Environment discovery across subscriptions requires a separate Subscription API credential and is outside this integration.

`get_language_variant` retrieves the latest version of a specific localization. `delete_language_variant` removes one localization; deleting the last remaining variant also deletes its parent item. Use `list_languages` to discover language codenames and continuation tokens to fetch additional pages. For workflow changes, use `list_workflows` to discover workflow and step IDs.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
