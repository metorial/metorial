# <img src="https://provider-logos.metorial-cdn.com/google-tasks.png" height="20"> Google Tasks

Create, read, update, and delete task lists and individual tasks. Manage task properties including titles, notes, due dates, and completion status. Organize tasks with subtask hierarchies and reorder tasks within or across lists. Clear completed tasks in bulk and filter tasks by completion status or modification time for incremental sync.

## Tools

### Clear Completed Tasks

Remove all completed tasks from a task list in a single operation. Cleared tasks become hidden and will no longer appear in default task listings.

### Create Task List

Create a new task list with the specified title. Returns the newly created list with its assigned ID.

### Create Task

Create a new task in a specified task list. Supports setting a title, notes, due date, and completion status. Optionally position the task under a parent (as a subtask) or after a specific sibling task.

### Delete Task List

Permanently delete a task list and all tasks within it. This action cannot be undone.

### Delete Task

Permanently delete a task from a task list. This action cannot be undone.

### Get Task

Retrieve a single task by its ID from a specified task list. Returns the full task details including title, notes, status, due date, and hierarchy information.

### List Task Lists

Retrieve all task lists for the authenticated user. Returns the complete set of task lists including their IDs, titles, and last-updated timestamps. Use this to discover available lists before operating on tasks within them.

### List Tasks

Retrieve tasks from a task list with optional filtering. Supports filtering by completion status, due date range, completion date range, and last modification time. Returns all matching tasks with pagination handled automatically.

### Move Task

Move a task to a different position, parent, or task list. Can reorder a task among its siblings, nest it under a parent task as a subtask, or transfer it to an entirely different task list.

### Update Task List

Update the title of an existing task list. Provide the task list ID and the new title.

### Update Task

Update properties of an existing task. Supports modifying the title, notes, due date, and completion status. Only the provided fields will be updated; omitted fields remain unchanged.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
