# <img src="logo.svg" height="20"> Leiga

Manage issues, subtasks, issue relations, sprints, epics, organization releases, comments, and tags. Discover accessible projects, issue types and schemas, and organization and project members.

Authenticate with the Client ID and Secret Key from Leiga OpenAPI settings. The enabled API modules and your account permissions determine available operations. Call `list_projects` and `list_issue_types`, then `get_issue_schema` to discover valid field codes and option IDs before creating or updating issues.

`list_epics`, `list_comments`, and `list_versions` return one page plus a total count. Leiga versions are organization-wide; creating or updating a version requires `ownerId`, discoverable through `list_org_members` or the existing version's `ownerId` in `list_versions`. Deleting a subtask requires its parent `issueId`; `list_subtasks` supplies subtask IDs and completion state.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
