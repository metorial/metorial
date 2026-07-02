# <img src="https://provider-logos.metorial-cdn.com/jira.svg" height="20"> Jira

Create, read, update, and delete issues across projects. Search issues using JQL queries. Manage projects, boards, sprints, and epics for agile workflows. Log work time, add comments and attachments, and transition issues through workflow statuses. Create and manage project versions/releases, issue links, filters, and dashboards. Query users, groups, and permissions. Receive webhooks for issue, comment, sprint, project, board, user, and configuration change events.

## Tools

### Create Issue

Create a new Jira issue in a specified project. Supports setting all standard fields including summary, description, assignee, priority, labels, components, and custom fields. Use the **issueTypeName** field for common types like "Task", "Bug", "Story", "Epic", or "Sub-task".

### Delete Issue

Permanently delete a Jira issue. Optionally delete all sub-tasks along with the parent issue. This action cannot be undone.

### Delete Comment

Delete a comment from a Jira issue.

### Delete Filter

Delete a saved Jira JQL filter owned by the authenticated user.

### Delete Issue Link

Delete an existing link between two Jira issues by issue link ID. Use Get Issue with fields=["issuelinks"] to find link IDs.

### Delete Version

Delete a Jira project version. Optionally move affected or fixed issues to replacement versions.

### Delete Worklog

Delete a worklog from a Jira issue.

### Get Filter

Retrieve a saved Jira JQL filter by ID.

### Get Issue

Retrieve detailed information about a Jira issue by its key or ID. Returns the full issue data including all fields, status, assignee, reporter, comments, and changelog. Optionally expand additional information like transitions, rendered fields, or changelog.

### Get Transitions

Get the available workflow transitions for an issue. Returns the transition IDs and names needed to move an issue to a new status via the Update Issue tool.

### Link Issues

Create a link between two Jira issues. Common link types include "Blocks", "Cloners", "Duplicate", and "Relates". The outward issue is the source and the inward issue is the target. For example, with "Blocks": outward issue **blocks** inward issue.

### List Boards

List Jira boards (Scrum or Kanban). Optionally filter by board type or project.

### List Projects

List Jira projects accessible to the authenticated user. Supports pagination for large project lists.

### List Worklogs

List worklogs for a Jira issue with pagination support.

### Log Work

Log time spent on a Jira issue. Provide time as a human-readable string (e.g., "2h 30m") or in seconds. Optionally include a start timestamp and comment.

### Add Comment

Add a comment to a Jira issue. Supports plain text or Atlassian Document Format (ADF) for rich text comments.

### Create Filter

Create a saved JQL filter in Jira. Filters can be used to quickly access frequently used search queries.

### List Sprints

List sprints for a given board. Optionally filter by sprint state (active, future, or closed).

### List Versions

List versions (releases) for a Jira project. Returns version details including release status and dates.

### Search Issues

Search for Jira issues using JQL (Jira Query Language). Returns matching issues with their key fields. Supports pagination and field selection.

### Search Users

Search for Jira users by name, username, or email. Useful for finding account IDs needed when assigning issues or other operations.

### Update Issue

Update an existing Jira issue's fields, transition it to a new status, or reassign it. Combines field updates, workflow transitions, and assignment into a single flexible tool. Only provided fields will be updated.

### Update Comment

Update an existing comment on a Jira issue. Supports plain text or Atlassian Document Format (ADF) bodies.

### Update Filter

Update a saved Jira JQL filter's name, description, query, or favourite state.

### Update Worklog

Update time spent, start time, or comment for an existing Jira issue worklog.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
