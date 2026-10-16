# <img src="logo.png" height="20"> Teamcamp

Manage Teamcamp projects, tasks, and collaboration with an API key. Identify the connected workspace, discover users and customers, manage projects, create or update tasks, and post task comments.

Use `list_projects` to find project IDs, `list_project_groups` to find task groups, and `get_project_details` to inspect custom status IDs, labels, members, and project settings. Task creation and updates accept assignees, priorities, dates, estimates, milestones, custom statuses, and existing file references.

The integration provides 15 tools for Teamcamp's documented beta API. Provider responses remain available in `raw`; optional summaries are omitted when the returned value does not match their type. A write followed by an incomplete provider response may have completed; inspect the resource before retrying.

See the [API guide](docs/SPEC.md) and [official documentation](https://api.teamcamp.app/api-reference/introduction).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
