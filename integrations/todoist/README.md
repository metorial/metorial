# <img src="https://provider-logos.metorial-cdn.com/todoist.svg" height="20"> Todoist

Create, read, update, delete, complete, and reopen tasks with due dates, priorities, labels, recurring schedules, and natural language parsing. Organize tasks into projects and sections, manage sub-tasks, and assign tasks to collaborators. Create and manage projects with nesting, archiving, sharing, and multiple view styles. Add comments with file attachments and emoji reactions to tasks and projects. Create saved filters using query language, set reminders (relative, absolute, or location-based), and manage personal and shared labels. Collaborate via shared projects and workspaces with granular role-based access. Track productivity stats, karma scores, and streaks. View activity logs of all changes. Upload files, retrieve backups, and generate email-to-task addresses. Receive real-time webhook notifications for changes to tasks, projects, sections, comments, labels, filters, and reminders.

## Tools

### Complete Task

Mark a task as complete (close) or reopen a previously completed task. For recurring tasks, completing advances to the next occurrence.

### Create Task

Create a new task in Todoist. Supports setting content, description, project, section, parent task, labels, priority, due dates (natural language or specific dates), deadlines, duration, and assignee. Use **dueString** for natural language like "tomorrow at 10am" or "every Monday".

### Delete Task

Permanently delete a task from Todoist. This action cannot be undone.

### Get Collaborators

List all collaborators in a shared project. Returns their names, emails, and IDs for use when assigning tasks.

### Get Productivity Stats

Retrieve the user's productivity statistics including completed task counts, karma score, and daily/weekly goal streaks.

### Get Projects

List all projects or retrieve a specific project by ID. Includes project metadata, collaborator info, and hierarchy details.

### Get Tasks

Retrieve tasks from Todoist. Filter by project, section, label, or use Todoist's filter query syntax (e.g. "today", "priority 1 & overdue"). Can also fetch a single task by ID.

### Get Comments

Retrieve comments on a task or project. Provide either a taskId or projectId.

### Get Filters

List all saved filter views. Filters use Todoist's query language to define task views (e.g. "priority 1 & today").

### Get Labels

List all personal labels. Labels are used to categorize and tag tasks across projects.

### Create Project

Create a new project in Todoist. Supports nesting under a parent project, color customization, and view style configuration.

### Get Sections

List sections within a project or retrieve a specific section by ID.

### Move Task

Move a task to a different project, section, or make it a sub-task of another task. Provide exactly one destination.

### Quick Add Task

Create a task using Todoist's natural language parsing. Automatically extracts project, labels, priority, and due dates from the text. For example: "Buy milk tomorrow at 10am #Shopping @errands p1".

### Update Task

Update an existing task's properties including content, description, labels, priority, due date, deadline, duration, and assignee.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
