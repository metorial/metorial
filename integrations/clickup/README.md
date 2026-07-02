# <img src="https://provider-logos.metorial-cdn.com/clickup.png" height="20"> Clickup

Create, update, delete, and search tasks across a hierarchical workspace structure of Spaces, Folders, and Lists. Manage task details including assignees, statuses, priorities, due dates, tags, comments, checklists, and custom fields. Track time on tasks with timers and time entries. Create and manage Goals for progress tracking. Organize workspaces by creating and managing Spaces, Folders, Lists, and Space tags. Retrieve workspace members and team information.

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

Retrieve all goals from the workspace. Optionally include completed goals.

### Create Goal

Create a ClickUp goal in the configured workspace.

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

Retrieve all spaces in the configured ClickUp workspace, including their names, IDs, and statuses.

### Create Space

Create a ClickUp space in the configured workspace.

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

Search and filter tasks across the entire ClickUp workspace. Filter by status, assignee, tags, due dates, creation dates, and more. Returns paginated results. Use the **listId** parameter to scope to a specific list, or omit it to search across the workspace.

### Get Time Entries

Retrieve time tracking entries from the workspace. Filter by date range, assignee, or specific task/list/space. Requires the Time Tracking ClickApp to be enabled.

### Create Time Entry

Log a completed time entry in ClickUp.

### Update Time Entry

Update a ClickUp time entry's task, description, start/end time, duration, assignee, tags, or billable flag.

### Delete Time Entry

Delete a ClickUp time entry from the configured workspace.

### Get Running Timer

Retrieve the currently running ClickUp timer.

### Start Timer

Start a running timer in ClickUp.

### Stop Timer

Stop the currently running ClickUp timer.

### Update Task

Update an existing ClickUp task. Modify its name, description, status, priority, assignees, dates, time estimate, and more. Also supports adding/removing tags and setting custom field values in a single call.

### Get Workspace Members

Retrieve members for the configured workspace.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
