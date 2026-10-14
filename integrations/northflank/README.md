# Northflank

Manage Northflank projects, deployment services, jobs, database addons, secret groups, and webhook notification integrations. Deploy external container images or internal builds, pause, resume, or restart services, run jobs and infrastructure templates, retrieve addon credentials, and trigger database backups. List projects, services, jobs, addons, pipelines, domains, templates, log sinks, tags, and invoices.

Use `get_auth_info` to inspect the connected token's identity and scope. Organization-scoped tokens can call `list_teams` and pass a returned `teamId` to resource tools. Team-scoped tokens can omit `teamId`. Existing connections retain their saved team scope as a fallback.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
