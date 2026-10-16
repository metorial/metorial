# Doppler

Manage projects, environments, configs, and secrets in Doppler. Read and update secrets, list names without retrieving values, maintain project-wide secret notes, export secrets as downloadable files, inspect change history and activity logs, roll back changes, and configure webhooks and trusted IPs. Use Doppler Share to create expiring links for individual values.

Connect with a Doppler Personal, Service, or Service Account token. Available operations depend on its permissions: config-scoped Service Tokens cannot administer projects or workplace settings. `get_current_token` returns the actual token identity. Discover project and config identifiers through `manage_projects` and `manage_configs`.

Use `export_secrets` for JSON, ENV, YAML, Docker, or .NET JSON downloads. Including dynamic secrets creates leases once for that export. The deprecated `download_secrets` retains its original key-value output for existing callers. Locking a config prevents renaming and deletion; it does not prevent secret updates.

See [the API reference](https://docs.doppler.com/reference/api) and [tool details](docs/SPEC.md).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
