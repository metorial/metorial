# <img src="https://provider-logos.metorial-cdn.com/linear.png" height="20"> Linear

Create, read, update, and delete issues across teams with support for priorities, labels, assignees, due dates, and workflow states. Manage projects that group related issues, and organize work into time-boxed cycles (sprints). Create and manage documents, comments, and file attachments. Search issues using vector similarity or rich filters. Configure teams, workflow states, and labels. Track customers and link them to issues. Subscribe to real-time webhooks for changes to issues, projects, cycles, comments, documents, and more.

## Tools

### Create Issue

Creates a new issue in a Linear team. Supports setting title, description (Markdown), priority, assignee, labels, estimates, due dates, workflow state, parent issue, project, and cycle associations.

### Delete Issue

Permanently deletes an issue from Linear. This action cannot be undone. Use "Update Issue" to archive instead if you want to preserve the issue.

### Get Issue

Retrieves a single Linear issue by ID with full details including sub-issues and comments.

### List Issues

Lists issues from Linear with optional filtering by team, assignee, project, cycle, or workflow state. Returns paginated results.

### List Workflow States

Lists workflow states (issue statuses) across teams. Workflow states define the lifecycle of issues (e.g., Triage, Backlog, Todo, In Progress, Done, Canceled). Use this to find state IDs for creating or updating issues.

### Create Comment

Creates a new comment on a Linear issue. Supports Markdown formatting and @mentions using resource URLs.

### Create Cycle

Creates a new cycle (sprint) for a team in Linear. Cycles are time-boxed iterations that contain a set of issues.

### Create Document

Creates a new document in Linear. Documents support rich Markdown content and can be associated with projects.

### Create Label

Creates a new issue label. Labels can be scoped to a team or shared across the workspace.

### Create Project

Creates a new project in Linear. Projects group related issues across teams and support tracking progress with milestones and target dates.

### List Teams

Lists all teams in the workspace. Use this to discover team IDs needed for creating issues, cycles, and filtering.

### Get Current User

Retrieves the profile of the currently authenticated user, including their organization info.

### Search Issues

Searches Linear issues using text/vector similarity search. Returns matching issues ranked by relevance.

### Update Issue

Updates an existing Linear issue. Supports changing title, description, priority, assignee, workflow state, labels, estimates, due dates, project, cycle, and parent issue. You can also archive or unarchive issues.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
