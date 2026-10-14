# SwaggerHub

Search APIs and reusable domains, inspect or download definitions, save and delete versions, and manage API publishing, visibility, and default versions in SwaggerHub. Clone an existing API or domain version to start a new draft. Retrieve comments, integration configurations, and standardization results; organize definitions into projects.

Connect with a SwaggerHub API key from [API Keys](https://app.swaggerhub.com/settings/apiKey). The Registry API uses the key directly in the `Authorization` header. The default service URL is `https://api.swaggerhub.com`; on-premise installations typically use `https://your-host/v1` and may support a different Registry API version. An optional default owner can be overridden by each resource tool.

Projects and standardization depend on organization plan and permissions. Use `manage_projects` with `action: list` to discover project names. API and domain names and versions can be found with search and the definition tools. `download_definition` prepares a YAML or JSON file; definition inspection tools retain their structured outputs.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
