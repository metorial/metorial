# <img src="https://provider-logos.metorial-cdn.com/clickup.png" height="20"> ClickUp

Connect once to work across every ClickUp Workspace authorized for the account. Create, update, delete, and search tasks across a hierarchical structure of Spaces, Folders, and Lists. Manage task details including assignees, statuses, priorities, due dates, tags, comments, checklists, and values on existing custom fields. Track time on tasks with timers and time entries. Create and manage Goals for progress tracking. Organize Workspaces by creating and managing Spaces, Folders, Lists, and Space tags. Retrieve Workspace members.

## Multi-Workspace Access

Call **Get Workspaces** to discover the Workspace IDs authorized for the connection. Tools that call Workspace-scoped ClickUp endpoints require an explicit **workspaceId**, so each request selects its target Workspace. Tools that operate on a resource ID, such as a task, list, folder, Space, or Goal ID, continue to use that resource ID directly.

## Tools

### Create Task

Create a new task in a ClickUp list. Supports setting the name, description, status, priority, assignees, dates, time estimates, tags, custom fields, and parent task (for subtasks).

### Delete Task

Permanently delete a ClickUp task by its ID. This action cannot be undone.

### Get Task

Retrieve a single ClickUp task by its ID, including all details such as status, assignees, custom fields, description, dates, tags, and subtasks.

### Get Workspaces

Retrieve all ClickUp Workspaces (teams) accessible to the authenticated user. Use this tool to discover the **workspaceId** required by Workspace-scoped tools.

### Get Task Comments

Retrieve all comments on a ClickUp task. Returns the comment text, author, date, and resolution status.

### Create Task Comment

Create a comment on a ClickUp task.

### Update Task Comment

Update a ClickUp task comment's text, assignee, or resolved state.

### Delete Task Comment

Delete a ClickUp task comment.

### Create Checklist

Create a checklist on a ClickUp task.

### Update Checklist

Rename a ClickUp task checklist or change its position on the task.

### Delete Checklist

Delete a ClickUp task checklist.

### Create Checklist Item

Create an item inside a ClickUp task checklist.

### Update Checklist Item

Update a ClickUp checklist item name, assignee, resolved state, or parent item.

### Delete Checklist Item

Delete an item from a ClickUp task checklist.

### Get Custom Fields

Retrieve all custom fields accessible on a ClickUp list. Returns field definitions including their IDs, names, types, and options.

### Set Custom Field Value

Set a custom field value on a ClickUp task.

### Remove Custom Field Value

Clear a custom field value from a ClickUp task.

### Get Folders

Retrieve all folders in a ClickUp space.

### Create Folder

Create a folder in a ClickUp space.

### Update Folder

Rename a ClickUp folder.

### Delete Folder

Delete a ClickUp folder.

### Get Goals

Retrieve all Goals from the Workspace selected by **workspaceId**. Optionally include completed Goals. Call **Get Workspaces** to discover authorized Workspace IDs.

### Create Goal

Create a ClickUp Goal in the Workspace selected by **workspaceId**. Call **Get Workspaces** to discover authorized Workspace IDs.

### Update Goal

Update a ClickUp goal.

### Delete Goal

Delete a ClickUp goal.

### Get Lists

Retrieve ClickUp lists from a folder or space. When a **folderId** is provided, returns lists in that folder. When a **spaceId** is provided, returns folderless lists in the space.

### Create List

Create a ClickUp list in a folder or directly in a space.

### Update List

Update a ClickUp list.

### Delete List

Delete a ClickUp list.

### Get Spaces

Retrieve all Spaces in the Workspace selected by **workspaceId**, including their names, IDs, and statuses. Call **Get Workspaces** to discover authorized Workspace IDs.

### Create Space

Create a ClickUp Space in the Workspace selected by **workspaceId**. Call **Get Workspaces** to discover authorized Workspace IDs.

### Update Space

Update a ClickUp space.

### Delete Space

Delete a ClickUp space.

### Get Space Tags

Retrieve all tags defined in a ClickUp space.

### Create Space Tag

Create a tag in a ClickUp space.

### Update Space Tag

Rename or recolor a ClickUp space tag.

### Delete Space Tag

Delete a tag from a ClickUp space.

### Search Tasks

Search and filter tasks in the Workspace selected by the required **workspaceId**. Filter by status, assignee, tags, due dates, creation dates, and more. Returns paginated results. Use **listId** to narrow the search to a specific List; **workspaceId** is still required when **listId** is supplied. Call **Get Workspaces** to discover authorized Workspace IDs.

### Get Time Entries

Retrieve time tracking entries from the Workspace selected by **workspaceId**. Filter by date range, assignee, or specific task, List, or Space. Call **Get Workspaces** to discover authorized Workspace IDs. Requires the Time Tracking ClickApp to be enabled.

### Create Time Entry

Log a completed time entry in the Workspace selected by **workspaceId**. Call **Get Workspaces** to discover authorized Workspace IDs.

### Update Time Entry

Update a ClickUp time entry in the Workspace selected by **workspaceId**, including its task, description, start/end time, duration, assignee, tags, or billable flag. Call **Get Workspaces** to discover authorized Workspace IDs.

### Delete Time Entry

Delete a ClickUp time entry from the Workspace selected by **workspaceId**. Call **Get Workspaces** to discover authorized Workspace IDs.

### Get Running Timer

Retrieve the currently running ClickUp timer in the Workspace selected by **workspaceId**. Call **Get Workspaces** to discover authorized Workspace IDs.

### Start Timer

Start a running timer in the Workspace selected by **workspaceId**. Call **Get Workspaces** to discover authorized Workspace IDs.

### Stop Timer

Stop the currently running ClickUp timer in the Workspace selected by **workspaceId**. Call **Get Workspaces** to discover authorized Workspace IDs.

### Update Task

Update an existing ClickUp task. Modify its name, description, status, priority, assignees, dates, time estimate, and more. Also supports adding/removing tags and setting custom field values in a single call.

### Get Workspace Members

Retrieve members for the Workspace selected by **workspaceId**. Call **Get Workspaces** to discover authorized Workspace IDs.

## Webhook Triggers

Task and Workspace event triggers subscribe across every Workspace authorized for the connection. Each emitted event identifies the Workspace that delivered it.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
