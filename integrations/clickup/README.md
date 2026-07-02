# <img src="https://provider-logos.metorial-cdn.com/clickup.png" height="20"> Clickup

Create, update, delete, and search tasks across a hierarchical workspace structure of Spaces, Folders, and Lists. Manage task details including assignees, statuses, priorities, due dates, tags, dependencies, and custom fields. Track time on tasks with timers and time entries. Add comments and attachments to tasks. Create and manage Docs, Views (List, Board, Calendar, Gantt), Goals, and Targets for progress tracking. Organize workspaces by creating and managing Spaces, Folders, and Lists. Retrieve workspace members and team information. Subscribe to webhooks for real-time notifications on task, list, folder, space, and goal events.

## Tools

### Create Task

Create a new task in a ClickUp list. Supports setting the name, description, status, priority, assignees, dates, time estimates, tags, custom fields, and parent task (for subtasks).

### Delete Task

Permanently delete a ClickUp task by its ID. This action cannot be undone.

### Get Task

Retrieve a single ClickUp task by its ID, including all details such as status, assignees, custom fields, description, dates, tags, and subtasks.

### Get Workspaces

Retrieve all ClickUp workspaces (teams) accessible to the authenticated user. Useful for discovering workspace IDs and understanding account structure.

### Get Task Comments

Retrieve all comments on a ClickUp task. Returns the comment text, author, date, and resolution status.

### Get Custom Fields

Retrieve all custom fields accessible on a ClickUp list. Returns field definitions including their IDs, names, types, and options.

### Get Folders

Retrieve all folders in a ClickUp space.

### Get Goals

Retrieve all goals from the workspace. Optionally include completed goals.

### Get Lists

Retrieve ClickUp lists from a folder or space. When a **folderId** is provided, returns lists in that folder. When a **spaceId** is provided, returns folderless lists in the space.

### Get Spaces

Retrieve all spaces in the configured ClickUp workspace, including their names, IDs, and statuses.

### Get Space Tags

Retrieve all tags defined in a ClickUp space.

### Search Tasks

Search and filter tasks across the entire ClickUp workspace. Filter by status, assignee, tags, due dates, creation dates, and more. Returns paginated results. Use the **listId** parameter to scope to a specific list, or omit it to search across the workspace.

### Get Time Entries

Retrieve time tracking entries from the workspace. Filter by date range, assignee, or specific task/list/space. Requires the Time Tracking ClickApp to be enabled.

### Update Task

Update an existing ClickUp task. Modify its name, description, status, priority, assignees, dates, time estimate, and more. Also supports adding/removing tags and setting custom field values in a single call.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
