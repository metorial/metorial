# Slates Specification for Google Tasks

## Overview

Google Tasks is a task management service by Google that allows users to create and manage to-do lists. It lets users capture and manage to-dos anywhere in Google Workspace, and integrates directly with Google Calendar. The API is based on two core resources: Task Lists (each user has at least one default list) and Tasks within those lists.

## Authentication

Google Tasks API uses **OAuth 2.0** exclusively for authentication, as it accesses user-specific data.

**Setup Requirements:**

- You need to create one or more OAuth 2.0 Client IDs in the Google Cloud Console. A client ID is used to identify a single app to Google's OAuth servers. If your app runs on multiple platforms, you must create a separate client ID for each platform.
- Enable the Google Tasks API in your Google Cloud project.
- Configure an OAuth consent screen.

**OAuth 2.0 Endpoints:**

- Authorization endpoint: `https://accounts.google.com/o/oauth2/v2/auth`
- Token endpoint: `https://oauth2.googleapis.com/token`

**Required Credentials:**

- Client ID
- Client Secret
- Redirect URI

**Scopes:**

| Scope                                            | Description                                        |
| ------------------------------------------------ | -------------------------------------------------- |
| `https://www.googleapis.com/auth/tasks`          | Create, edit, organize, and delete all your tasks. |
| `https://www.googleapis.com/auth/tasks.readonly` | View your tasks.                                   |

Use `access_type=offline` when generating the authorization URL to receive a refresh token for long-lived access.

## Features

### Task List Management

Create, read, update, and delete task lists for the authenticated user. Each user has at least one default task list. Task lists serve as containers that organize tasks into groups.

### Task Management

Create, read, update, and delete individual tasks within a task list. Tasks support the following properties:

- Title and notes (description)
- Due date (date only, time portion is discarded)
- Completion status and completion date
- Deleted status

**Limitations:**

- A user can have up to 20,000 non-hidden tasks per list and up to 100,000 tasks in total.
- Tasks assigned from Docs or Chat Spaces cannot be inserted from the Tasks API; they can only be created by assigning them from Docs or Chat Spaces.
- Tasks created or assigned from Google Docs are not available via the API. This is a known limitation.

### Task Ordering and Hierarchy

Move tasks to different positions within a task list or between task lists. Tasks can be moved within their current list or to a destination list, including putting a task as a child task under a new parent and/or moving it to a different position among its sibling tasks.

- A user can have up to 2,000 subtasks per task.

### Clearing Completed Tasks

Clear all completed tasks from a specified task list in a single operation.

### Filtering and Syncing

When listing tasks, you can filter by completion status and use the `updatedMin` parameter to retrieve only tasks modified after a certain time, enabling efficient incremental sync.

## Events

The provider does not support events. Google Tasks API does not offer webhooks, push notifications, or any built-in mechanism for subscribing to changes. Detecting changes requires polling the API using the task listing endpoints with appropriate filters (e.g., `updatedMin`).
