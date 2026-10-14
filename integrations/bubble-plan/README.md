# <img src="logo.png" height="20"> Project Bubble

Manage projects, tasks, and subtasks for team collaboration. Create and update projects, organize task lists, track time and budgets, manage calendar events, and handle file sharing. Supports client management, comments on tasks, and user/team organization.

This connector uses the Project Bubble API, documented by ProProfs Project. Bubble Plan at [bubbleplan.net](https://bubbleplan.net/) is a separate product; its API is not implemented here.

Connect with your API key from My Account and your account domain, such as `example.projectbubble.com`. Both values are required for authentication. Existing connections retain their previously configured domain as a fallback.

Use `who_am_i` to check the connected user, `create_client` to create clients for projects, and `delete_time_entry` to remove time entries discovered with `list_time_entries`.

API reference: [ProProfs Project API overview](https://help.proprofsproject.com/api-for-developers).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
