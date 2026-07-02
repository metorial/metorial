Now let me get more details from the BugHerd API documentation page:# Slates Specification for Bugherd

## Overview

BugHerd is a visual feedback and bug tracking tool for websites. It allows users (including clients) to pin feedback directly on web pages, which is then organized into a Kanban-style task board for project teams to manage and resolve.

## Authentication

BugHerd uses basic HTTP authentication with the API key as user and 'x' as password. All requests must use HTTPS.

To use the BugHerd API, generate an API key for your organization from within the application, under **Settings > General Settings**.

The API key is organization-scoped. When making requests, pass the API key as the username and the literal string `x` as the password in the HTTP Basic Auth header. For example:

```
curl -u YOUR_API_KEY:x https://www.bugherd.com/api_v2/organization.json
```

There is no OAuth support or token-based authentication. Only API key authentication via HTTP Basic Auth is available.

## Features

### Organization Management

Retrieve details about your BugHerd account/organization, including account-level information.

### User Management

- List all users (members and clients/guests) in your organization.
- View tasks assigned to or created by a specific user.
- View projects a specific user has access to.
- Filter user tasks by date, priority, tag, or assignee.

### Project Management

- Create, update, and delete projects. Projects are associated with a website URL.
- List all projects or only active ones.
- Add members (team users) and guests/clients to projects.
- Configure project settings such as public feedback, guest visibility, and active status.
- **Consideration:** Deleting a project permanently removes all associated data and cannot be undone.

### Task Management

- Create, update, and list tasks (bugs/feedback) within projects.
- Tasks support properties including description, priority (critical, important, normal, minor), status, tags, assignee, requester, and an external ID for cross-system tracking.
- List tasks by category: all tasks, feedback-only, archived, or taskboard view.
- Filter tasks by status, priority, tag, assignee, external ID, and date ranges.
- Move tasks between projects in bulk.
- **Consideration:** Projects with custom columns extend the default status values (backlog, todo, doing, done, closed) with custom column names. Integrations must handle dynamic status values.

### Custom Columns (Kanban Board)

- Create, update, list, and view custom columns on a project's task board.
- Allows customizing the workflow beyond the default columns.

### Comments

- List and create comments on tasks.
- Comments can be posted on behalf of a specific user (by user ID or email).
- Comments can be marked as private (members only) or visible to everyone.

### Attachments

- List, view, create, upload, and delete file attachments on tasks.
- Attachments can be added via URL or direct file upload.
- **Consideration:** Direct uploads must be reasonably small (roughly within a 30-second request window). For larger files, host externally and attach via URL.

## Events

BugHerd supports webhooks for real-time event notifications. When installing a webhook, specify an event you wish to hook into. Choose from: "project_create", "task_create", "task_update", "comment" or "task_destroy".

### Project Created

Fires when a new project is created in BugHerd.

### Task Created

Fires when a new task (bug/feedback item) is created within a project.

### Task Updated

Fires when an existing task is modified (e.g., status change, reassignment, priority change).

### Task Destroyed

Fires when a task is deleted.

### Comment Created

Fires when a new comment is added to a task.

**Configuration options:**

- **project_id** (optional): Scope the webhook to a specific project. If omitted, the webhook fires for activity across all projects in the organization.
- **target_url** (required): The URL that BugHerd will POST event data to.
- Each webhook subscription covers a single event type. To listen to multiple events, create a separate webhook for each.
- When a webhook is returned a 410 (Gone) HTTP error code, it is interpreted as an explicit instruction that the webhook is pointing to an incorrect target and will result in the webhook being removed automatically.
