# <img src="https://provider-logos.metorial-cdn.com/asana.png" height="20"> Asana

Create, read, update, and delete tasks, projects, portfolios, and goals in Asana workspaces. Manage task assignments, due dates, subtasks, dependencies, tags, custom fields, attachments, and comments. Organize work with sections, project templates, and portfolios. Search tasks across workspaces, track time entries, manage team memberships, and subscribe to webhooks for real-time change notifications on resources.

## Tools

### Create Project

Create a new project in a workspace. Supports setting name, notes, layout, dates, team, color, and privacy.

### Create Task

Create a new task in a project or workspace. Supports setting name, notes, assignee, dates, project/section placement, tags, followers, parent task, and custom field values.

### Delete Project

Permanently delete a project. This action cannot be undone.

### Delete Task

Permanently delete a task. This action cannot be undone.

### Get Project

Retrieve full details for a project including members, followers, custom fields, and settings.

### Get Task

Retrieve full details for a task including assignee, dates, notes (with HTML), subtask count, projects, tags, followers, custom fields, dependencies, and dependents.

### List Goals

List goals in a workspace, optionally filtered by team or portfolio. Provides visibility into organizational objectives and their statuses.

### List Projects

List projects in a workspace, optionally filtered by team or archived status. Returns project summaries including dates, owner, and status.

### List Subtasks

List all subtasks of a given task.

### List Tasks

List tasks filtered by project, section, or assignee. At least one filter must be provided. When filtering by assignee, a workspace GID is also required.

### List Teams

List all teams in an organization workspace.

### List Users

List users in a workspace. Returns user GIDs and names for referencing in other tools.

### List Workspaces

List all workspaces accessible to the authenticated user. Use this to discover available workspace GIDs needed by other tools.

### List Comments

List stories (comments and activity) on a task. Returns the full activity feed including comments, status changes, and system updates.

### List Portfolios

List portfolios in a workspace owned by a specific user. Portfolios are collections of projects used for tracking at a higher level.

### List Sections

List all sections in a project. Sections are used to organize tasks within a project.

### List Tags

List all tags in a workspace.

### Search Tasks

Search for tasks in a workspace using various filters like text, assignee, projects, tags, completion status, and date ranges. Supports full-text search across task names and descriptions.

### Update Project

Update an existing project's name, notes, dates, color, layout, archived status, or privacy setting.

### Update Task

Update an existing task's properties. Supports updating name, notes, assignee, dates, completion status, custom fields, and managing dependencies, projects, tags, followers, and parent.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
