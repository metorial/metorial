# Toggl Track integration

Connect with a Toggl Track API token from My Profile. Requests use HTTP Basic authentication with the token as the username and `api_token` as the password. Account identity and the default workspace are discovered through `/api/v9/me`. Use `get_workspace` without an ID to discover available workspaces, and pass the chosen workspace ID to workspace operations when needed.

The integration supports time-entry creation, lookup, updates, deletion, current-timer inspection and stopping; project, client, tag and task management; workspace discovery and member listing; and summary or detailed reports. `get_project` and `get_client` retrieve individual resource details. Tasks and some billing or reporting capabilities depend on the account plan and permissions.

Detailed reports return one page plus `nextId` and `nextRowNumber` when supplied by the provider. Pass these values as `firstId` and `firstRowNumber` with the same date range and filters to continue. `rawReport` preserves the provider response; `totalSeconds` is null when a total in seconds is not supplied. Reports do not export files.

## API references

- [Authentication](https://engineering.toggl.com/docs/authentication/)
- [Account and workspace discovery](https://engineering.toggl.com/docs/track/api/me/)
- [Time entries](https://engineering.toggl.com/docs/track/api/time_entries/)
- [Projects](https://engineering.toggl.com/docs/track/api/projects/)
- [Clients](https://engineering.toggl.com/docs/track/api/clients/)
- [Tags](https://engineering.toggl.com/docs/track/api/tags/)
- [Tasks](https://engineering.toggl.com/docs/track/api/tasks/)
- [Workspaces and members](https://engineering.toggl.com/docs/track/api/workspaces/)
- [Summary reports](https://engineering.toggl.com/docs/track/reports/summary_reports/)
- [Detailed reports](https://engineering.toggl.com/docs/track/reports/detailed_reports/)
