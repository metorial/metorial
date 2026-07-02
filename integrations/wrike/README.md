# <img src="https://provider-logos.metorial-cdn.com/wrike.png" height="20"> Wrike

Create, read, update, and delete tasks, folders, and projects in Wrike's hierarchical work management structure. Manage task properties including titles, descriptions, statuses, dates, assignees, custom fields, and dependencies. Organize work using spaces, folders, and projects with support for workflows, approvals, and blueprints. Track time with timelogs and timesheets. Upload and manage file attachments and comments on tasks and folders. Administer users, groups, invitations, access roles, and work schedules. Define custom fields, custom item types, and workflows with configurable statuses. Manage resource bookings, hourly rates, and job roles. Export data for BI analytics. Access audit logs for compliance. Receive real-time webhook notifications for changes to tasks, folders, projects, approvals, comments, attachments, and time entries.

## Tools

### Create Folder or Project

Create a new folder or project under a parent folder. To create a project, provide the project configuration with owners, status, and dates. Without project configuration, a plain folder is created.

### Create Task

Create a new task in a specified folder or project. Supports setting title, description, status, importance, dates, assignees, custom fields, and parent relationships.

### Delete Task

Delete a task from Wrike. The task is moved to the recycle bin and can be restored within 30 days.

### List Attachments

List file attachments on a task or folder/project. Returns attachment metadata including name, type, size, and creation date.

### List Contacts

List users and contacts in the Wrike account. Can retrieve specific contacts by ID, the current user, or all contacts. Useful for getting contact IDs needed when assigning tasks or sharing folders.

### List Folders & Projects

List folders and projects in Wrike. Can retrieve the full folder tree, folders within a specific parent, specific folders by ID, or filter to only projects. Projects are folders with additional properties like owners, dates, and status.

### List Spaces

List all spaces in the Wrike account. Spaces are top-level organizational containers that hold folders and projects.

### List Tasks

List and search tasks in Wrike. Can retrieve tasks from a specific folder/project, by task IDs, or all tasks in the account. Supports filtering by status, importance, assignees, date ranges, and custom statuses.

### List Comments

List comments on a task or folder/project. Returns comment text, author, and creation date.

### List Custom Fields

List custom fields defined in the Wrike account. Custom fields can be applied to tasks, folders, and projects for structured data. Useful for getting custom field IDs needed when creating or updating tasks.

### List Dependencies

List task dependencies (predecessor/successor relationships). Can list dependencies for a specific task or by dependency IDs.

### List Timelogs

List time log entries. Can filter by task, user/contact, folder, and date ranges.

### List Workflows

List all workflows in the Wrike account. Workflows define the set of statuses available for tasks and projects. Each workflow contains custom statuses with names, colors, and groups (Active, Completed, Deferred, Cancelled).

### Update Folder or Project

Update an existing folder or project's properties including title, description, sharing, custom fields, and project-specific settings like status and dates. Supports adding/removing shared users and parent folders.

### Update Task

Update an existing task's properties including title, description, status, importance, dates, assignees, custom fields, and parent folders. Supports adding/removing assignees and parent folders independently.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
