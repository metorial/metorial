# ServerAvatar

Deploy and manage cloud servers and web applications in ServerAvatar. Discover organizations, connected cloud provider accounts, server sizes, and supported timezones. Provision servers, create applications, inspect resource usage and logs, control services, and manage domains, SSL certificates, databases, firewall rules, cron jobs, system users, and backup listings.

Use `list_organizations` to discover an organization ID, then pass it to an organization-scoped tool or configure it as the default. `get_organization` retrieves a selected organization's details. `list_timezones` supplies valid identifiers for server general settings and application creation.

Application creation accepts framework-specific options in `frameworkSettings`. Explicit application, domain, and system-user inputs take precedence. For a new system user, supply a username and password; for an existing one, supply its ID. Cron creation accepts a predefined schedule or a five-field `customScheduling` expression.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
