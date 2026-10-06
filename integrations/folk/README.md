# <img src="logo.png" height="20"> Folk

Manage people, companies, group-scoped deals, private or public notes, and tasks in Folk. Discover accessible groups and custom fields, filter contact and deal lists, and explicitly complete or reopen tasks.

Use an API key from workspace **Settings > API**. Access follows the associated user's permissions; `get_current_user` identifies that user, and `list_groups` discovers accessible group IDs. No workspace ID is required. Requests use API version `2025-06-09`.

The 24 existing tool keys and their input/output fields remain available. Three current tools add authenticated identity, task listing, and task lifecycle management, for 27 tools in total. `manage_task` supports `get`, `create`, `update`, `delete`, `mark_done`, and `mark_to_do`; creation requires an entity ID, title, and `YYYY-MM-DD` due date. Tasks are public by default, so choose `isPublic: false` for private work. Changing a due date does not complete a task.

Reminder tools remain available for existing reminder IDs and are marked deprecated. Folk's changelog gives a February 13, 2027 sunset, while its migration guide gives February 11, 2027. Use tasks for new workflows and confirm the provider's final date before relying on reminders after February 10. Reminder IDs cannot be passed to task actions.

Contact creation can merge a duplicate person in the background. Supplied arrays replace existing values, and removing a group removes its custom field values. Notes containing user mentions can send notifications. Deletion is permanent; use controlled records when testing these operations. See [API behavior and tool coverage](docs/SPEC.md).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
