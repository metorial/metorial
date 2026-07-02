Now let me get the complete list of webhook events from the ClickUp API reference:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for ClickUp

## Overview

ClickUp is a project management and productivity platform that provides tasks, docs, goals, time tracking, chat, and customizable workflows within a hierarchical structure of Workspaces, Spaces, Folders, and Lists. Its REST API allows programmatic access to create, read, update, and delete resources across the platform.

## Authentication

ClickUp supports two authentication methods:

### 1. Personal API Token

For individual or internal use. Any ClickUp user can generate a personal token from their account settings (Settings > Apps > Generate API Token). The token grants the same access level as the user's browser session across all Workspaces they belong to. Include it in the `Authorization` header of every request:

```
Authorization: pk_12345678_ABCDEFGHIJKLMNOP
```

Personal tokens do not expire.

### 2. OAuth 2.0 (Authorization Code Grant)

Required for apps or integrations used by multiple users. A Workspace owner or admin must create an OAuth app in ClickUp (Settings > ClickUp API > Create an App) to obtain a `client_id` and `client_secret`.

**Flow:**

1. Redirect users to the authorization URL:
   ```
   https://app.clickup.com/api?client_id={client_id}&redirect_uri={redirect_uri}
   ```
   An optional `state` parameter can be included.
2. The user authorizes one or more Workspaces and is redirected back with an authorization `code`.
3. Exchange the `code` for an access token via the Get Access Token endpoint, providing `client_id`, `client_secret`, and `code`.
4. Use the access token in the `Authorization` header:
   ```
   Authorization: Bearer {access_token}
   ```

OAuth access tokens currently do not expire. Each user gets an individualized token scoped to the Workspaces they authorized. ClickUp's OAuth does not use granular scopes — the token inherits the permissions of the authorizing user's account.

## Features

### Workspace & Hierarchy Management

Manage the organizational hierarchy: Workspaces (teams), Spaces, Folders, and Lists. Create, update, delete, and retrieve these structural elements to organize work. Users can query which Workspaces are authorized for their token.

### Task Management

Create, update, delete, and retrieve tasks within Lists. Tasks support names, descriptions, assignees, statuses, priorities, due dates, start dates, time estimates, tags, and subtasks. Tasks can be moved between Lists and linked via dependencies or plain relationships.

### Custom Fields

Define and manage custom fields on Lists to extend ClickUp's data model. Set and update custom field values on individual tasks. Supported field types include text, numbers, dropdowns, checkboxes, dates, and more.

### Comments & Communication

Add, update, and retrieve comments on tasks. Comments support rich text formatting. The API also provides access to ClickUp's Chat feature for channel-based messaging.

### Docs

Access and manage ClickUp Docs. Note: the Docs API has known limitations around import/export capabilities.

### Views

Create and manage views (List, Board, Calendar, Gantt, etc.) within Spaces, Folders, and Lists. Views can be filtered and configured programmatically.

### Goals & Targets

Create and manage Goals (objectives) and Targets (key results) to track progress. Goals can be grouped into folders (e.g., for OKRs or sprint cycles) and linked to tasks for automatic progress tracking.

### Time Tracking

Track time on tasks by creating, updating, and deleting time entries. Start and stop timers, retrieve running time entries, query entries within date ranges, and manage time entry labels. Requires the Time Tracking ClickApp to be enabled by a Workspace admin.

### Attachments

Upload and manage file attachments on tasks.

### Tags

Create, update, and delete tags at the Space level and apply or remove them from tasks.

### Members & Teams

Retrieve workspace members and manage team-level information. Access user details for the authenticated user.

### Task Filtering & Search

Query and filter tasks by various criteria including status, assignee, priority, due dates, tags, and custom field values. Supports advanced filtering with range operators on custom fields.

## Events

ClickUp supports webhooks via its API. Webhooks are registered per Workspace and can be scoped to a specific location in the hierarchy (Space, Folder, List, or Task). Each webhook can subscribe to specific event types or use a wildcard (`*`) for all events. Webhook payloads are signed with a shared secret for verification.

### Task Events

Covers the full lifecycle and updates to tasks:

- Task created, updated, deleted
- Priority, status, assignee, due date, and tag changes
- Task moved to a new List
- Comment posted or updated on a task
- Time estimate updated
- Time tracked added, updated, or deleted

### List Events

Covers creation, update, and deletion of Lists.

### Folder Events

Covers creation, update, and deletion of Folders.

### Space Events

Covers creation, update, and deletion of Spaces.

### Goal & Target Events

Covers creation, update, and deletion of Goals and Targets (key results).

### Configuration Options

- **Location filtering:** Scope a webhook to a specific Space, Folder, List, or Task. Only the most specific level applies when multiple are provided.
- **Event filtering:** Subscribe to one or more specific event types, or use `*` for all events.
- **Webhook health:** Webhooks that consistently fail (100 consecutive failures) are automatically suspended and must be reactivated via the API.
