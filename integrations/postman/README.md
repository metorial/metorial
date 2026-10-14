# Postman

Manage Postman collections, environments, workspaces, mock servers, and monitors. Import an OpenAPI JSON definition into a workspace as new collections, retrieve complete collection definitions, fork and merge collections, and manage pull requests, comments, and tags. Run monitors synchronously or start a job and inspect its latest run results. Create incoming webhooks that trigger collection runs. Retrieve the authenticated user and API usage limits.

Use `list_workspaces` to discover a destination workspace before importing a definition. Collection updates replace the definition, so retrieve it with `get_collection` and retain scripts, variables, and requests that must survive the update.

The `manage_api` tool retains compatibility with Postman's deprecated API Builder endpoints. Availability depends on the account and provider API support. This integration uses the global Postman API; EU Enterprise API routing is not currently configurable.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
