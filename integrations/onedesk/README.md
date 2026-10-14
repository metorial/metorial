# <img src="logo.svg" height="20"> Onedesk

Create, update, retrieve, and search OneDesk tickets, tasks, and projects. Post messages to existing conversations, create internal users, discover teams and users, and retrieve organization settings and type names.

Connect with a OneDesk Public API key for the documented REST API. The existing email/password connection is retained for legacy workflows; new project lookup and user/team discovery require an API key.

Use `get_organization` to discover type labels, `search_projects` to find project external IDs, and `search_teams` for the team external IDs accepted by `create_user`. Create tools return external IDs with API key connections. Pass the work item ID to `get_item.externalId` or `update_item.externalId`.

Detailed searches accept whole-number limits from 1 to 50 and non-negative offsets. Item searches automatically discover all available types when `itemTypes` is omitted.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
