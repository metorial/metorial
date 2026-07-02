Let me fetch the official TickTick developer documentation to get more details on the API features.Now let me try to fetch the actual TickTick developer docs to see details about the API endpoints and features.Now I have enough information to write the specification. Let me compile everything.

# Slates Specification for Ticktick

## Overview

TickTick is a simple and effective to-do list and task manager app with seamless cloud synchronization across all your devices. It provides a comprehensive REST API for managing tasks and projects. The API base URL is `https://api.ticktick.com/open/v1`.

## Authentication

TickTick uses **OAuth 2.0** for API authentication.

### Setup

1. Navigate to the TickTick Developer Portal (`https://developer.ticktick.com`) and sign in with your existing TickTick credentials or create a new account.
2. Register a new app by clicking the "+App Name" button. Name is the only required parameter. Once created, you should see the app and be able to edit it. There should now be a generated Client ID and Client Secret parameters.
3. For OAuth Redirect URL, enter any URL you would like to be redirected to upon giving permissions to your account.

### OAuth 2.0 Flow

Based on the configuration from the Arcade integration, the OAuth 2.0 endpoints are:

- **Authorization endpoint:** `https://ticktick.com/oauth/authorize`
  - Parameters: `response_type=code`, `client_id`, `redirect_uri`, `scope`, `state`
- **Token endpoint:** `https://ticktick.com/oauth/token`
  - Parameters: `grant_type=authorization_code`, `client_id`, `client_secret`, `code`, `redirect_uri`
  - Auth method: `client_secret_post` (credentials in the request body, not as Basic auth header)
- **Refresh endpoint:** `https://ticktick.com/oauth/token`
  - Parameters: `grant_type=refresh_token`, `client_id`, `client_secret`, `refresh_token`

### Scopes

TickTick supports the following OAuth scopes: `tasks:read` — Read access to tasks, projects, and related data. `tasks:write` — Full access to create, update, and delete tasks and projects.

### Using the Token

All API requests must include the OAuth access token in the Authorization header: `Authorization: Bearer {access_token}`

## Features

### Task Management

The TickTick API allows for various operations such as creating tasks, retrieving task details, updating task status, and more. The task schema includes title, content, projectId, dueDate (ISO), priority (0/1/3/5), and tags. Tasks support subtasks (called "items"), reminders (using iCalendar TRIGGER format), recurrence rules (RRULE format), due dates, start dates, time zones, and completion status.

- Tasks can be created, updated, completed, and deleted.
- Tasks belong to a project (list). If no project is specified, tasks go to the inbox.
- Maximum 500 tasks per project.

### Project (List) Management

Projects represent task lists in TickTick. The API allows listing all projects and retrieving a specific project along with its associated tasks.

- Available endpoints include listing all projects and getting a project with its tasks.

### Task Completion

Tasks can be marked as complete through a dedicated completion endpoint, separate from the general update endpoint.

### Batch Operations

TickTick supports a batch endpoint for bulk operations that can add, update, and delete multiple tasks in a single API call.

### User Information

The API provides an endpoint to retrieve the authenticated user's profile information.

### Limitations

- Some advanced features (focus time, habits) are not supported by the API.
- The API scope is limited to tasks and projects; features like calendar views, Eisenhower Matrix, and Pomodoro timers available in the app are not exposed through the API.

## Events

The official TickTick API does not appear to have native webhook support. None of the search results explicitly mention webhooks as a feature of the TickTick API.

The provider does not support events.
