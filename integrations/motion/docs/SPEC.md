# Motion API Specification

## Overview

Motion (usemotion.com) is an AI-powered productivity platform that automates task scheduling, calendar management, and project planning. The API allows programmatic management of tasks, projects, workspaces, recurring tasks, comments, custom fields, schedules, and users.

## Authentication

Motion uses API key authentication.

1. Log into Motion and under the Settings tab, create an API key. Be sure to copy the key, as it will only be shown once for security reasons.
2. Pass in your API key as a `X-API-Key` header.

Task, project, workspace, user, schedule, and comment requests use `https://api.usemotion.com/v1`. Custom-field requests use `https://api.usemotion.com/beta`.

**Example:**

```
GET https://api.usemotion.com/v1/workspaces
X-API-Key: your-api-key-here
```

No OAuth2 or other authentication methods are supported. There are no scopes or additional credentials required beyond the API key.

## Features

### Task Management

Create, retrieve, update, delete, and list tasks within workspaces. Tasks support due dates with deadline types (HARD, SOFT, or NONE), priority levels (ASAP, HIGH, MEDIUM, or LOW), duration, descriptions (HTML), labels, status, assignees, and project association. Tasks include a start date field indicating when a task should begin. The API returns whether Motion was unable to schedule a task, allowing you to detect scheduling conflicts. Tasks can be moved between workspaces, though when moving tasks from one workspace to another, the task's project, status, label(s), and assignee will all be reset. Tasks can also be unassigned. Tasks include scheduling chunks with IDs, durations in minutes, and scheduled start/end times, reflecting Motion's auto-scheduling capabilities.

### Project Management

Create, retrieve, and list projects within workspaces. Projects belong to a workspace and have a name, description, status, and custom field values.

### Recurring Tasks

Create recurring tasks and manage them, including listing and deleting. Recurring tasks support documented recurrence strings (for example `daily_every_day`, `weekly_any_day`, or `monthly_15`), duration (integer in minutes or "REMINDER"), and start date in ISO 8601 format. You can optionally specify an ideal time for scheduling (HH:mm format). Tasks can be assigned a schedule they must adhere to, defaulting to "Work Hours".

### Comments

Retrieve and create comments on tasks, enabling collaboration and discussion around work items.

### Custom Fields

Create and manage custom fields that can be attached to both tasks and projects. Supported field types include: text, number, URL, date, select, multi-select, person, multi-person, email, phone, checkbox, and related task. Custom fields can be added to or removed from individual tasks and projects.

### Schedules

Retrieve schedules configured for the authenticated user. Schedules define time blocks (e.g., "Work Hours") that control when Motion's auto-scheduling can place tasks.

### Workspace Management

List all workspaces the authenticated user has access to. Workspaces can be team or individual type and contain their own labels and statuses.

### Statuses

Retrieve the available statuses for a workspace. Statuses indicate whether they are default or resolved (terminated) for the workspace.

### User Management

List users in your workspace and retrieve the authenticated user's profile information directly with `get_current_user`. The existing `list_users` tool also retains its optional `includeMe` profile output.

## Events

The provider does not support events. Motion's API does not offer webhooks or any built-in event subscription mechanism. Third-party platforms (e.g., Pipedream, Zapier) implement polling-based workarounds to detect changes, but these are not native to the Motion API.

## API Contract Notes

- Call `list_workspaces` to discover workspace IDs before creating or filtering workspace resources.
- Task listing accepts either `status` or `includeAllStatuses`, never both.
- Task updates reject unassigning and assigning in the same operation before any mutation. `moveAssigneeId` requires `moveToWorkspaceId`.
- `create_recurring_task` accepts `frequencyPattern` for documented recurrence strings. Its legacy object-valued `frequency` field remains available; provide exactly one of the two fields.
- Custom-field setting and removal inputs are mutually exclusive.
- Status listing handles the documented array of status wrappers while retaining support for flat status entries.

## Sources

- [Motion API reference](https://docs.usemotion.com/api-reference/tasks/list/)
- [Recurring frequency cookbook](https://docs.usemotion.com/cookbooks/frequency/)
- [Current API-key owner](https://docs.usemotion.com/api-reference/users/me/)
