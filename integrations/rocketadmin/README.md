# Rocketadmin

Manage database connections, inspect tables and schemas, read and modify rows, and download CSV exports. The 17 tools also cover current-user and company discovery, groups and company users, dashboards, saved queries, table settings, action rules, and audit logs.

Authenticate with an API key for connection discovery and table data operations. Use Email & Password for the full tool set, supplying a current two-factor code when needed. Set the API base URL during authentication; cloud accounts default to `https://app.rocketadmin.com/api`. For self-hosted deployments, include the API prefix (often `/api`) or use the direct backend URL. Custom base paths are preserved. Session expiration requires reconnecting. Hosted company invitations also require a current `turnstileToken` obtained from Rocketadmin's interactive invitation challenge; self-hosted deployments may omit it.

Start with `list_connections`, then `list_tables`. Use `get_my_company` to discover the company ID before managing company users. Encrypted connections accept a master password on the relevant tools. When updating or testing saved SSH connections, supply `sshUsername` and `privateSSHKey` again because the saved connection response omits them. Paginated row queries require `page` and `perPage` together; filters use column-to-operator objects, such as `{"id":{"eq":1}}`.

Bulk mutations return the provider's success result; Rocketadmin does not report how many rows were affected. CSV exports provide a downloadable file and retain the existing CSV text output for compatibility.

See the [API reference](https://docs.rocketadmin.com/api-reference/rocketadmin) and [official source](https://github.com/rocket-admin/rocketadmin) for provider behavior and permissions. This integration does not include CSV import, AI querying, secret management, dashboard-widget editing, or audit-log export.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
